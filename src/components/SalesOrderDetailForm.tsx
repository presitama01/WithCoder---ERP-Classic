import React, { useEffect, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import {
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
  parseNum,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

interface SalesOrderDetailFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SalesOrderDetailForm: React.FC<SalesOrderDetailFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [tglStart, setTglStart] = useState<string>('12-09-2026');
  const [tglEnd, setTglEnd] = useState<string>('12-09-2026');
  const [filterType, setFilterType] = useState<
    'merk' | 'batasan_kode' | 'customer' | 'all_periode'
  >('batasan_kode');
  const [kodeBarang, setKodeBarang] = useState<string>('');
  const [namaBarangDesc, setNamaBarangDesc] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Sales Order Detail');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangCatalog, setBarangCatalog] = useState<{ kode: string; nama: string }[]>([]);
  const [customerCatalog, setCustomerCatalog] = useState<string[]>([]);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      try {
        const [lokasis, barangs, customers] = await Promise.all([
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setLokasiOptions(lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()));
        setBarangCatalog(
          barangs.map((b) => ({
            kode: b.kode || '',
            nama: b.nama_barang || '',
          }))
        );
        setCustomerCatalog(customers.map((c) => c.nama_customer || '').filter(Boolean));
        const rawPreset = localStorage.getItem('withcoder_preset_so_detail');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.tglStart) setTglStart(v.tglStart);
          if (v.tglEnd) setTglEnd(v.tglEnd);
          if (v.lokasiStock) setLokasiStock(v.lokasiStock);
          if (v.bentukLaporan) setBentukLaporan(v.bentukLaporan);
        }
      } catch {
        // Ignore non-critical catalog load error
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const match = barangCatalog.find(
      (b) => b.kode.toLowerCase() === kodeBarang.trim().toLowerCase()
    );
    if (match) {
      setNamaBarangDesc(match.nama);
    }
  }, [kodeBarang, barangCatalog]);

  if (!isOpen) return null;

  const handleBaru = () => {
    setTglStart('12-09-2026');
    setTglEnd('12-09-2026');
    setFilterType('batasan_kode');
    setKodeBarang('');
    setNamaBarangDesc('');
    setCustomerFilter('');
    setLokasiStock('ALL');
    setBentukLaporan('01 - Sales Order Detail');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setKodeBarang('');
    setNamaBarangDesc('');
    setCustomerFilter('');
    showFeedback('Parameter dibersihkan');
  };

  const handleSimpanPreset = async () => {
    try {
      localStorage.setItem(
        'withcoder_preset_so_detail',
        JSON.stringify({ tglStart, tglEnd, lokasiStock, bentukLaporan })
      );
      showFeedback('Parameter Sales Order Detail tersimpan');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const startIso = toIsoDate(tglStart);
    const endIso = toIsoDate(tglEnd);
    const isDetailMode = bentukLaporan.startsWith('01');

    if (isDetailMode) {
      const [items, orders] = await Promise.all([
        erpList<any>('sales_order_items', { orderBy: 'no_so', asc: true }),
        erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false }),
      ]);
      const orderMap = new Map<string, any>(orders.map((o) => [o.no_bukti, o]));

      return items
        .map((it) => {
          const parent = orderMap.get(it.no_so);
          const tglIso = toIsoDate(parent?.tanggal) || '';
          const nilai = parseNum(it.harga) * parseNum(it.pesan);
          return {
            no_so: it.no_so || '',
            tanggal: toDisplayDMyShort(tglIso) || '-',
            tanggalIso: tglIso,
            no_po: it.no_po || parent?.po_no || '',
            customer: it.customer || parent?.nama_customer || '',
            kode_barang: it.kode_barang || '',
            nama_barang: it.nama_barang || '',
            unit: it.unit || 'PCS',
            pesan: Number(it.pesan || 0),
            kirim: Number(it.kirim || 0),
            sisa: Number(it.sisa ?? Number(it.pesan || 0) - Number(it.kirim || 0)),
            nilai,
            lokasi_stock: parent?.lokasi_stock || '01 - OFFICE',
          };
        })
        .filter((r) => {
          if (startIso && r.tanggalIso && r.tanggalIso < startIso) return false;
          if (endIso && r.tanggalIso && r.tanggalIso > endIso) return false;
          if (lokasiStock !== 'ALL' && r.lokasi_stock !== lokasiStock) return false;
          if (filterType === 'batasan_kode' && kodeBarang.trim()) {
            const k = kodeBarang.trim().toLowerCase();
            return (
              r.kode_barang.toLowerCase().includes(k) ||
              r.nama_barang.toLowerCase().includes(namaBarangDesc.toLowerCase() || k)
            );
          }
          if (filterType === 'customer' && customerFilter.trim()) {
            return r.customer.toLowerCase().includes(customerFilter.trim().toLowerCase());
          }
          return true;
        });
    }

    const orders = await erpList<any>('sales_orders', {
      gte: startIso ? { tanggal: startIso } : undefined,
      lte: endIso ? { tanggal: endIso } : undefined,
      orderBy: 'tanggal',
      asc: false,
    });
    return orders
      .filter((o) => {
        if (lokasiStock !== 'ALL' && o.lokasi_stock && o.lokasi_stock !== lokasiStock) return false;
        if (filterType === 'customer' && customerFilter.trim()) {
          return (o.nama_customer || '').toLowerCase().includes(customerFilter.trim().toLowerCase());
        }
        return true;
      })
      .map((o) => ({
        no_so: o.no_bukti || '',
        tanggal: toDisplayDMyShort(o.tanggal),
        customer: o.nama_customer || '',
        sales: o.sales || '',
        no_po: o.po_no || '',
        nilai: Number(o.nilai_so || 0),
        so_close: o.so_close || 'Not Yet',
      }));
  };

  const handlePreview = async () => {
    try {
      setIsBusy(true);
      const data = await fetchReportData();
      setPreviewRows(data);
      setIsPrintOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal memuat laporan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsBusy(true);
      const [data, company] = await Promise.all([fetchReportData(), fetchActiveCompanyProfile()]);
      const isDetail = bentukLaporan.startsWith('01');
      exportToExcel({
        fileName: 'Sales_Order_Detail',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Periode: ${tglStart} s/d ${tglEnd} | Lokasi: ${lokasiStock}`,
        companyProfile: company,
        columns: isDetail
          ? [
              { header: 'No.SO', accessor: 'no_so' },
              { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
              { header: 'Customer', accessor: 'customer' },
              { header: 'Kode Barang', accessor: 'kode_barang' },
              { header: 'Nama Barang', accessor: 'nama_barang' },
              { header: 'Unit', accessor: 'unit', align: 'center' },
              { header: 'Pesan', accessor: 'pesan', align: 'right' },
              { header: 'Kirim', accessor: 'kirim', align: 'right' },
              { header: 'Sisa', accessor: 'sisa', align: 'right' },
            ]
          : [
              { header: 'No.SO', accessor: 'no_so' },
              { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
              { header: 'Customer', accessor: 'customer' },
              { header: 'Sales', accessor: 'sales', align: 'center' },
              { header: 'PO.No', accessor: 'no_po' },
              { header: 'Nilai SO', accessor: 'nilai', align: 'right' },
              { header: 'Status', accessor: 'so_close', align: 'center' },
            ],
        rows: data,
      });
      showFeedback('Export Excel selesai');
    } catch (err: any) {
      showFeedback(`Gagal export: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const isDetailMode = bentukLaporan.startsWith('01');
  const printColumns: PrintColumn<any>[] = isDetailMode
    ? [
        { header: 'No.SO', accessor: 'no_so', width: '95px' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '75px' },
        { header: 'Customer', accessor: 'customer' },
        { header: 'Kode Brg', accessor: 'kode_barang', width: '80px' },
        { header: 'Nama Barang', accessor: 'nama_barang' },
        { header: 'Unit', accessor: 'unit', align: 'center', width: '45px' },
        { header: 'Pesan', accessor: (r) => formatMoney(r.pesan), align: 'right', width: '55px' },
        { header: 'Kirim', accessor: (r) => formatMoney(r.kirim), align: 'right', width: '55px' },
        { header: 'Sisa', accessor: (r) => formatMoney(r.sisa), align: 'right', width: '55px' },
      ]
    : [
        { header: 'No.SO', accessor: 'no_so', width: '105px' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '80px' },
        { header: 'Customer', accessor: 'customer' },
        { header: 'Sales', accessor: 'sales', align: 'center', width: '60px' },
        { header: 'No.PO', accessor: 'no_po', width: '95px' },
        { header: 'Nilai SO', accessor: (r) => formatMoney(r.nilai), align: 'right', width: '105px' },
        { header: 'Status', accessor: 'so_close', align: 'center', width: '70px' },
      ];

  const totalPesan = previewRows.reduce((a, r) => a + Number(r.pesan || 0), 0);
  const totalSisa = previewRows.reduce((a, r) => a + Number(r.sisa || 0), 0);
  const totalNilai = previewRows.reduce((a, r) => a + Number(r.nilai || 0), 0);

  return (
    <div
      id="sales-order-detail-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Sales Order Detail"
        onClose={onClose}
        onPrint={handlePreview}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[630px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[15px] tracking-wide text-black font-sans">
              SALES ORDER DETAIL
            </h1>
          </div>

          <div className="border-b border-[#999999] pb-2">
            <FormActionButtons
              compact
              onSimpan={handleSimpanPreset}
              onBaru={handleBaru}
              onKoreksi={() => showFeedback('Silakan ubah filter laporan')}
              onHapus={handleHapus}
              onPrint={handlePreview}
              isBusy={isBusy}
              feedback={feedback}
            />
          </div>

          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">Periode</legend>
            <div className="flex items-center space-x-1.5 pt-0.5">
              <label className="font-bold text-black text-[11px] whitespace-nowrap pl-2 pr-1">
                Tanggal ( dd-mm-yyyy ) :
              </label>

              <DatePickerInput
                value={tglStart}
                onChange={(formatted) => setTglStart(formatted)}
                format="dmy"
                inputClassName="w-[84px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />

              <span className="w-[62px] h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                s / d
              </span>

              <DatePickerInput
                value={tglEnd}
                onChange={(formatted) => setTglEnd(formatted)}
                format="dmy"
                inputClassName="w-[84px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />
            </div>
          </fieldset>

          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              <label className="flex items-center space-x-2 text-[11px] text-[#808080] cursor-not-allowed">
                <input
                  type="radio"
                  name="so_detail_filter"
                  disabled
                  checked={filterType === 'merk'}
                  onChange={() => setFilterType('merk')}
                  className="cursor-not-allowed"
                />
                <span>Merk Barang</span>
              </label>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[148px] shrink-0">
                  <input
                    type="radio"
                    name="so_detail_filter"
                    checked={filterType === 'batasan_kode'}
                    onChange={() => setFilterType('batasan_kode')}
                    className="cursor-pointer"
                  />
                  <span>Batasan kode Barang</span>
                </label>

                <div className="flex items-center space-x-1 flex-1">
                  <input
                    type="text"
                    list="so-detail-barang-list"
                    value={kodeBarang}
                    onChange={(e) => setKodeBarang(e.target.value.toUpperCase())}
                    disabled={filterType !== 'batasan_kode'}
                    className="w-[106px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8] shrink-0"
                  />
                  <datalist id="so-detail-barang-list">
                    {barangCatalog.map((b) => (
                      <option key={b.kode} value={b.kode}>
                        {b.nama}
                      </option>
                    ))}
                  </datalist>
                  <input
                    type="text"
                    value={namaBarangDesc}
                    onChange={(e) => setNamaBarangDesc(e.target.value)}
                    disabled={filterType !== 'batasan_kode'}
                    className="flex-1 h-[21px] bg-[#FFFFBF] border border-[#7A7A7A] px-2 text-[11px] outline-none shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[148px] shrink-0">
                  <input
                    type="radio"
                    name="so_detail_filter"
                    checked={filterType === 'customer'}
                    onChange={() => setFilterType('customer')}
                    className="cursor-pointer"
                  />
                  <span>Customer</span>
                </label>
                {filterType === 'customer' && (
                  <>
                    <input
                      type="text"
                      list="so-detail-customer-list"
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      placeholder="Pilih / ketik nama customer..."
                      className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] outline-none"
                    />
                    <datalist id="so-detail-customer-list">
                      {customerCatalog.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </>
                )}
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                <input
                  type="radio"
                  name="so_detail_filter"
                  checked={filterType === 'all_periode'}
                  onChange={() => setFilterType('all_periode')}
                  className="cursor-pointer"
                />
                <span>ALL berdasarkan periode</span>
              </label>
            </div>
          </fieldset>

          <div className="flex items-end justify-between gap-2.5 pt-0.5">
            <div className="flex-1 space-y-1.5">
              <fieldset className="border border-[#999999] px-2 py-1 rounded-none relative">
                <legend className="text-[11px] font-semibold px-1 text-black">
                  Lokasi Stock :
                </legend>
                <div className="flex items-center bg-white border border-[#7A7A7A]">
                  <select
                    value={lokasiStock}
                    onChange={(e) => setLokasiStock(e.target.value)}
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer"
                  >
                    <option value="ALL">ALL</option>
                    {lokasiOptions.length > 0 ? (
                      lokasiOptions.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="01 - OFFICE">01 - OFFICE</option>
                        <option value="02 - GUDANG JAKARTA">02 - GUDANG JAKARTA</option>
                        <option value="03 - CABANG SURABAYA">03 - CABANG SURABAYA</option>
                      </>
                    )}
                  </select>
                </div>
              </fieldset>

              <fieldset className="border border-[#999999] px-2 py-1 rounded-none relative">
                <legend className="text-[11px] font-semibold px-1 text-black">
                  Bentuk Laporan :
                </legend>
                <div className="flex items-center bg-white border border-[#7A7A7A]">
                  <select
                    value={bentukLaporan}
                    onChange={(e) => setBentukLaporan(e.target.value)}
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer"
                  >
                    <option value="01 - Sales Order Detail">01 - Sales Order Detail</option>
                    <option value="02 - Sales Order Rekap">02 - Sales Order Rekap</option>
                    <option value="03 - Sales Order by Customer">03 - Sales Order by Customer</option>
                  </select>
                </div>
              </fieldset>
            </div>

            <div className="flex items-stretch gap-1.5 h-[84px] shrink-0">
              <button
                type="button"
                disabled={isBusy}
                onClick={handlePreview}
                className="w-[82px] h-full bg-[#FFE4C4] hover:bg-[#FFECD6] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white font-extrabold text-[11px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span>
                  <span className="underline">P</span>REVIEW
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-[82px] h-full bg-[#FFE4C4] hover:bg-[#FFECD6] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white font-extrabold text-[11px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center p-1"
              >
                <span className="border border-dotted border-black/60 w-full h-full flex items-center justify-center">
                  <span className="underline">C</span>LOSE
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={bentukLaporan.toUpperCase()}
        subtitle={`Periode: ${tglStart} s/d ${tglEnd}`}
        orientation="landscape"
        metaLines={[
          { label: 'Periode Tanggal', value: `${tglStart} s/d ${tglEnd}` },
          { label: 'Lokasi Stock', value: lokasiStock },
          {
            label: 'Filter Laporan',
            value:
              filterType === 'batasan_kode'
                ? kodeBarang || 'Semua Barang'
                : filterType === 'customer'
                ? customerFilter || 'Semua Customer'
                : 'ALL Berdasarkan Periode',
          },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={printColumns}
        rows={previewRows}
        summaryItems={
          isDetailMode
            ? [
                { label: 'Total Item', value: `${previewRows.length} Baris` },
                { label: 'Total Qty Pesan', value: formatMoney(totalPesan) },
                { label: 'Total Qty Sisa', value: formatMoney(totalSisa) },
              ]
            : [
                { label: 'Total Dokumen SO', value: `${previewRows.length} SO` },
                { label: 'Total Nilai SO', value: formatRupiah(totalNilai) },
              ]
        }
      />
    </div>
  );
};
