import React, { useEffect, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

interface ReturPenjualanBerdasarkanFakturFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReturPenjualanBerdasarkanFakturForm: React.FC<
  ReturPenjualanBerdasarkanFakturFormProps
> = ({ isOpen, onClose }) => {
  const [tglStart, setTglStart] = useState<string>('12-09-2026');
  const [tglEnd, setTglEnd] = useState<string>('12-09-2026');
  const [filterType, setFilterType] = useState<string>('no_bukti');
  const [noBuktiStart, setNoBuktiStart] = useState<string>('');
  const [noBuktiEnd, setNoBuktiEnd] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Retur Penjualan Barang');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [returCatalog, setReturCatalog] = useState<string[]>([]);
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
        const [lokasis, returs, customers] = await Promise.all([
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('retur_penjualans', { orderBy: 'no_bukti', asc: true }).catch(() => []),
          erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setLokasiOptions(lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()));
        setReturCatalog(returs.map((r) => r.no_bukti || '').filter(Boolean));
        setCustomerCatalog(customers.map((c) => c.nama_customer || '').filter(Boolean));
        const rawPreset = localStorage.getItem('withcoder_preset_retur_penjualan_faktur');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.tglStart) setTglStart(v.tglStart);
          if (v.tglEnd) setTglEnd(v.tglEnd);
          if (v.lokasiStock) setLokasiStock(v.lokasiStock);
          if (v.bentukLaporan) setBentukLaporan(v.bentukLaporan);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBaru = () => {
    setTglStart('12-09-2026');
    setTglEnd('12-09-2026');
    setFilterType('no_bukti');
    setNoBuktiStart('');
    setNoBuktiEnd('');
    setCustomerFilter('');
    setLokasiStock('ALL');
    setBentukLaporan('01 - Retur Penjualan Barang');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setNoBuktiStart('');
    setNoBuktiEnd('');
    setCustomerFilter('');
    showFeedback('Parameter dibersihkan');
  };

  const handleSimpanPreset = async () => {
    try {
      localStorage.setItem(
        'withcoder_preset_retur_penjualan_faktur',
        JSON.stringify({ tglStart, tglEnd, lokasiStock, bentukLaporan })
      );
      showFeedback('Parameter Retur Penjualan tersimpan');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const startIso = toIsoDate(tglStart);
    const endIso = toIsoDate(tglEnd);
    const rows = await erpList<any>('retur_penjualans', {
      gte: startIso ? { tanggal: startIso } : undefined,
      lte: endIso ? { tanggal: endIso } : undefined,
      orderBy: 'tanggal',
      asc: false,
    });
    return rows
      .filter((r) => {
        if (lokasiStock !== 'ALL' && r.lokasi_stock && r.lokasi_stock !== lokasiStock) return false;
        if (filterType === 'no_bukti') {
          const nb = (r.no_bukti || '').toUpperCase();
          if (noBuktiStart.trim() && nb < noBuktiStart.trim().toUpperCase()) return false;
          if (noBuktiEnd.trim() && nb > noBuktiEnd.trim().toUpperCase()) return false;
        }
        if (filterType === 'customer' && customerFilter.trim()) {
          return (r.nama_customer || '').toLowerCase().includes(customerFilter.trim().toLowerCase());
        }
        return true;
      })
      .map((r) => ({
        no_bukti: r.no_bukti || '',
        tanggal: toDisplayDMyShort(r.tanggal),
        nama_customer: r.nama_customer || '',
        no_faktur: r.no_faktur || '-',
        nilai_retur: Number(r.nilai_retur || 0),
        disc: `${Number(r.disc || 0)}%`,
        ppn: `${Number(r.ppn ?? 11)}%`,
        sts_post: r.sts_post || 'Posting',
        keterangan: r.keterangan || '',
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
      exportToExcel({
        fileName: 'Retur_Penjualan_Berdasarkan_Faktur',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Periode: ${tglStart} s/d ${tglEnd} | Lokasi: ${lokasiStock}`,
        companyProfile: company,
        columns: [
          { header: 'No.Bukti', accessor: 'no_bukti' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
          { header: 'Nama Customer', accessor: 'nama_customer' },
          { header: 'No.Faktur Ref', accessor: 'no_faktur' },
          { header: 'Disc', accessor: 'disc', align: 'center' },
          { header: 'PPN', accessor: 'ppn', align: 'center' },
          { header: 'Nilai Retur', accessor: 'nilai_retur', align: 'right' },
          { header: 'Status', accessor: 'sts_post', align: 'center' },
          { header: 'Keterangan', accessor: 'keterangan' },
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

  const totalRetur = previewRows.reduce((a, r) => a + Number(r.nilai_retur || 0), 0);

  return (
    <div
      id="retur-penjualan-faktur-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Retur Penjualan Berdasarkan Faktur"
        onClose={onClose}
        onPrint={handlePreview}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[560px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-3 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[13px] tracking-wide text-black font-sans">
              RETUR PENJUALAN BERDASARKAN FAKTUR
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

          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">Periode</legend>
            <div className="flex items-center space-x-2 pt-0.5">
              <span className="font-semibold text-black text-[11px]">
                Tanggal ( dd-mm-yyyy ) :
              </span>

              <DatePickerInput
                value={tglStart}
                onChange={(formatted) => setTglStart(formatted)}
                format="dmy"
                inputClassName="w-[82px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />

              <span className="font-bold text-[11px] px-1 text-black">s / d</span>

              <DatePickerInput
                value={tglEnd}
                onChange={(formatted) => setTglEnd(formatted)}
                format="dmy"
                inputClassName="w-[82px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />
            </div>
          </fieldset>

          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              <label className="flex items-center space-x-2 text-[11px] text-gray-400 cursor-not-allowed">
                <input
                  type="radio"
                  name="retur_filter_type"
                  disabled
                  checked={filterType === 'merk'}
                  onChange={() => setFilterType('merk')}
                  className="cursor-not-allowed"
                />
                <span>Merk Barang</span>
              </label>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-semibold cursor-pointer whitespace-nowrap">
                  <input
                    type="radio"
                    name="retur_filter_type"
                    checked={filterType === 'no_bukti'}
                    onChange={() => setFilterType('no_bukti')}
                    className="cursor-pointer"
                  />
                  <span>Batasan No. Bukti</span>
                </label>

                <div className="flex items-center space-x-1 flex-1 ml-4">
                  <input
                    type="text"
                    list="retur-bukti-list"
                    value={noBuktiStart}
                    onChange={(e) => setNoBuktiStart(e.target.value.toUpperCase())}
                    disabled={filterType !== 'no_bukti'}
                    className="bg-white border border-[#7A7A7A] px-2 py-0.5 w-28 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8]"
                  />

                  <span className="px-2 py-0.5 bg-[#E2F0D9] border border-[#7A7A7A] text-[11px] font-bold text-black text-center min-w-[38px]">
                    s / d
                  </span>

                  <input
                    type="text"
                    list="retur-bukti-list"
                    value={noBuktiEnd}
                    onChange={(e) => setNoBuktiEnd(e.target.value.toUpperCase())}
                    disabled={filterType !== 'no_bukti'}
                    className="bg-white border border-[#7A7A7A] px-2 py-0.5 w-28 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8]"
                  />
                  <datalist id="retur-bukti-list">
                    {returCatalog.map((nb) => (
                      <option key={nb} value={nb} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="retur_filter_type"
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
                      list="retur-cust-list"
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      placeholder="Pilih / ketik customer..."
                      className="flex-1 bg-white border border-[#7A7A7A] px-2 py-0.5 text-[11px] outline-none"
                    />
                    <datalist id="retur-cust-list">
                      {customerCatalog.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </>
                )}
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="retur_filter_type"
                  checked={filterType === 'all_periode'}
                  onChange={() => setFilterType('all_periode')}
                  className="cursor-pointer"
                />
                <span>ALL berdasarkan periode</span>
              </label>
            </div>
          </fieldset>

          <div className="flex items-stretch justify-between gap-3 pt-0.5">
            <div className="flex-1 space-y-2">
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
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer font-bold"
                  >
                    <option value="01 - Retur Penjualan Barang">01 - Retur Penjualan Barang</option>
                    <option value="02 - Retur Penjualan per Customer">02 - Retur Penjualan per Customer</option>
                    <option value="03 - Rekap Retur Penjualan">03 - Rekap Retur Penjualan</option>
                  </select>
                </div>
              </fieldset>
            </div>

            <div className="w-[100px] border border-[#999999] p-1.5 flex items-center justify-center bg-[#E6E2D4]">
              <button
                type="button"
                disabled={isBusy}
                onClick={handlePreview}
                className="w-full h-full py-3 bg-[#EAE6D9] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F2EFE6] active:border-[#808080] active:border-r-[#FFFFFF] active:border-b-[#FFFFFF] font-extrabold text-[12px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span className="border border-dotted border-black/40 px-1 py-1 w-full block">
                  PREVIEW
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
            label: 'Batasan Filter',
            value:
              filterType === 'no_bukti'
                ? `${noBuktiStart || 'Awal'} s/d ${noBuktiEnd || 'Akhir'}`
                : filterType === 'customer'
                ? customerFilter || 'Semua Customer'
                : 'ALL Berdasarkan Periode',
          },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={[
          { header: 'No.Bukti Retur', accessor: 'no_bukti', width: '110px' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '80px' },
          { header: 'Nama Customer', accessor: 'nama_customer' },
          { header: 'No.Faktur Ref', accessor: 'no_faktur', width: '105px' },
          { header: 'Disc', accessor: 'disc', align: 'center', width: '50px' },
          { header: 'PPN', accessor: 'ppn', align: 'center', width: '50px' },
          {
            header: 'Nilai Retur',
            accessor: (r) => formatMoney(r.nilai_retur),
            align: 'right',
            width: '105px',
          },
          { header: 'Status', accessor: 'sts_post', align: 'center', width: '70px' },
          { header: 'Keterangan', accessor: 'keterangan' },
        ]}
        rows={previewRows}
        summaryItems={[
          { label: 'Total Dokumen Retur', value: `${previewRows.length} Dokumen` },
          { label: 'Total Nilai Retur', value: formatRupiah(totalRetur) },
        ]}
      />
    </div>
  );
};
