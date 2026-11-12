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
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

interface ItemCostStockPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ItemCostStockPrintForm: React.FC<ItemCostStockPrintFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [tglStart, setTglStart] = useState<string>('01-08-2026');
  const [tglEnd, setTglEnd] = useState<string>('31-08-2026');
  const [filterType, setFilterType] = useState<string>('merk'); // 'merk', 'batasan_kode', 'customer', 'all'
  const [merkFilter, setMerkFilter] = useState<string>('');
  const [kodeBarangStart, setKodeBarangStart] = useState<string>('');
  const [kodeBarangEnd, setKodeBarangEnd] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>(
    '01 - Item Cost & Stock'
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [merkOptions, setMerkOptions] = useState<string[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangCodes, setBarangCodes] = useState<string[]>([]);

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
        const [merks, lokasis, barangs] = await Promise.all([
          erpList<any>('master_merks', { orderBy: 'nama_merk', asc: true }).catch(() => []),
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setMerkOptions(merks.map((m) => m.nama_merk || '').filter(Boolean));
        setLokasiOptions(
          lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()).filter(Boolean)
        );
        setBarangCodes(barangs.map((b) => b.kode || '').filter(Boolean));
        const rawPreset = localStorage.getItem('withcoder_preset_item_cost_stock');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.tglStart) setTglStart(v.tglStart);
          if (v.tglEnd) setTglEnd(v.tglEnd);
          if (v.filterType) setFilterType(v.filterType);
          if (v.merkFilter !== undefined) setMerkFilter(v.merkFilter);
          if (v.lokasiStock) setLokasiStock(v.lokasiStock);
          if (v.bentukLaporan) setBentukLaporan(v.bentukLaporan);
        }
      } catch {
        // Ignore lookup error
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBaru = () => {
    setTglStart('01-08-2026');
    setTglEnd('31-08-2026');
    setFilterType('merk');
    setMerkFilter('');
    setKodeBarangStart('');
    setKodeBarangEnd('');
    setLokasiStock('ALL');
    setBentukLaporan('01 - Item Cost & Stock');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setMerkFilter('');
    setKodeBarangStart('');
    setKodeBarangEnd('');
    showFeedback('Parameter dibersihkan');
  };

  const handleSimpanPreset = async () => {
    try {
      localStorage.setItem(
        'withcoder_preset_item_cost_stock',
        JSON.stringify({ tglStart, tglEnd, filterType, merkFilter, lokasiStock, bentukLaporan })
      );
      showFeedback('Parameter Item Cost & Stock tersimpan');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const [barangs, stockAwals] = await Promise.all([
      erpList<any>('master_barangs', { orderBy: 'kode', asc: true }),
      erpList<any>('stock_awal', { orderBy: 'item_code', asc: true }).catch(() => []),
    ]);

    const awalMap = new Map<string, any>();
    for (const sa of stockAwals) {
      if (lokasiStock !== 'ALL' && sa.lokasi && sa.lokasi !== lokasiStock) continue;
      const key = (sa.item_code || '').toUpperCase();
      const prev = awalMap.get(key) || { bagus: 0, rusak: 0, hpp: Number(sa.hpp || 0), lokasi: sa.lokasi || '01 - OFFICE' };
      awalMap.set(key, {
        bagus: prev.bagus + Number(sa.stock_bagus || 0),
        rusak: prev.rusak + Number(sa.stock_rusak || 0),
        hpp: Number(sa.hpp || prev.hpp || 0),
        lokasi: sa.lokasi || prev.lokasi,
      });
    }

    const rows = barangs.map((b) => {
      const code = (b.kode || '').toUpperCase();
      const sa = awalMap.get(code);
      const stockBagus = sa ? sa.bagus : Number(b.stock || 0);
      const stockRusak = sa ? sa.rusak : 0;
      const hpp = Number(b.cost || sa?.hpp || 0);
      const hargaJual = Number(b.price || 0);
      return {
        kode_barang: b.kode || '',
        nama_barang: b.nama_barang || '',
        category: b.category || '',
        merk: b.merk || '',
        satuan: b.unit || 'PCS',
        lokasi: sa?.lokasi || '01 - OFFICE',
        hpp,
        harga_jual: hargaJual,
        stock_bagus: stockBagus,
        stock_rusak: stockRusak,
        total_cost: hpp * stockBagus,
      };
    });

    return rows.filter((r) => {
      if (filterType === 'merk' && merkFilter.trim()) {
        return r.merk.toLowerCase().includes(merkFilter.trim().toLowerCase());
      }
      if (filterType === 'batasan_kode') {
        const start = kodeBarangStart.trim().toUpperCase();
        const end = kodeBarangEnd.trim().toUpperCase();
        const code = r.kode_barang.toUpperCase();
        if (start && code < start) return false;
        if (end && code > end) return false;
      }
      return true;
    });
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
        fileName: 'Item_Cost_And_Stock',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Periode: ${tglStart} s/d ${tglEnd} | Lokasi: ${lokasiStock}`,
        companyProfile: company,
        columns: [
          { header: 'Kode Barang', accessor: 'kode_barang' },
          { header: 'Nama Barang', accessor: 'nama_barang' },
          { header: 'Merk', accessor: 'merk' },
          { header: 'Satuan', accessor: 'satuan', align: 'center' },
          { header: 'HPP (Rp)', accessor: 'hpp', align: 'right' },
          { header: 'Harga Jual', accessor: 'harga_jual', align: 'right' },
          { header: 'Stock Bagus', accessor: 'stock_bagus', align: 'right' },
          { header: 'Stock Rusak', accessor: 'stock_rusak', align: 'right' },
          { header: 'Total Cost (Rp)', accessor: 'total_cost', align: 'right' },
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

  const printColumns: PrintColumn<any>[] = [
    { header: 'Kode Brg', accessor: 'kode_barang', width: '80px' },
    { header: 'Nama Barang', accessor: 'nama_barang' },
    { header: 'Merk', accessor: 'merk', width: '75px' },
    { header: 'Sat', accessor: 'satuan', align: 'center', width: '40px' },
    { header: 'HPP (Rp)', accessor: (r) => formatMoney(r.hpp), align: 'right', width: '85px' },
    { header: 'Hrg Jual', accessor: (r) => formatMoney(r.harga_jual), align: 'right', width: '85px' },
    { header: 'Bagus', accessor: (r) => formatMoney(r.stock_bagus), align: 'right', width: '50px' },
    { header: 'Rusak', accessor: (r) => formatMoney(r.stock_rusak), align: 'right', width: '50px' },
    { header: 'Total Cost', accessor: (r) => formatMoney(r.total_cost), align: 'right', width: '95px' },
  ];

  const totalQty = previewRows.reduce((s, r) => s + Number(r.stock_bagus || 0), 0);
  const totalCost = previewRows.reduce((s, r) => s + Number(r.total_cost || 0), 0);

  return (
    <div
      id="item-cost-stock-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Item Cost & Stock"
        onClose={onClose}
        onPrint={handlePreview}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[580px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-3 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[13px] tracking-wide text-black font-sans">
              ITEM COST &amp; STOCK
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

          {/* Group 1: Periode */}
          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Periode
            </legend>
            <div className="flex items-center space-x-2 pt-0.5">
              <span className="font-semibold text-black text-[11px]">
                Tanggal ( dd-mm-yyyy ) :
              </span>

              <DatePickerInput
                value={tglStart}
                onChange={(formatted) => setTglStart(formatted)}
                format="dmy"
                inputClassName="w-[86px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />

              <span className="px-2 py-0.5 bg-[#E2F0D9] border border-[#7A7A7A] text-[11px] font-bold text-black text-center min-w-[38px]">
                s / d
              </span>

              <DatePickerInput
                value={tglEnd}
                onChange={(formatted) => setTglEnd(formatted)}
                format="dmy"
                inputClassName="w-[86px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />
            </div>
          </fieldset>

          {/* Group 2: Pilihan Laporan Berdasarkan */}
          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[150px] shrink-0">
                  <input
                    type="radio"
                    name="item_cost_stock_filter"
                    checked={filterType === 'merk'}
                    onChange={() => setFilterType('merk')}
                    className="cursor-pointer"
                  />
                  <span>Merk Barang</span>
                </label>
                {filterType === 'merk' && (
                  <>
                    <input
                      type="text"
                      list="item-cost-merk-list"
                      value={merkFilter}
                      onChange={(e) => setMerkFilter(e.target.value)}
                      placeholder="Semua merk / ketik merk..."
                      className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] outline-none"
                    />
                    <datalist id="item-cost-merk-list">
                      {merkOptions.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold w-[150px] shrink-0">
                  <input
                    type="radio"
                    name="item_cost_stock_filter"
                    checked={filterType === 'batasan_kode'}
                    onChange={() => setFilterType('batasan_kode')}
                    className="cursor-pointer"
                  />
                  <span>Batasan kode Barang</span>
                </label>
                {filterType === 'batasan_kode' && (
                  <div className="flex items-center space-x-1 flex-1">
                    <input
                      type="text"
                      list="item-cost-barang-list"
                      value={kodeBarangStart}
                      onChange={(e) => setKodeBarangStart(e.target.value.toUpperCase())}
                      placeholder="Dari kode..."
                      className="w-[105px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
                    />
                    <span className="px-1.5 text-[11px] font-bold">s/d</span>
                    <input
                      type="text"
                      list="item-cost-barang-list"
                      value={kodeBarangEnd}
                      onChange={(e) => setKodeBarangEnd(e.target.value.toUpperCase())}
                      placeholder="Sampai kode..."
                      className="w-[105px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
                    />
                    <datalist id="item-cost-barang-list">
                      {barangCodes.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="item_cost_stock_filter"
                  checked={filterType === 'customer'}
                  onChange={() => setFilterType('customer')}
                  className="cursor-pointer"
                />
                <span>Customer</span>
              </label>

              <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="item_cost_stock_filter"
                  checked={filterType === 'all'}
                  onChange={() => setFilterType('all')}
                  className="cursor-pointer"
                />
                <span>ALL</span>
              </label>
            </div>
          </fieldset>

          {/* Lower Section */}
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
                    <option value="01 - Item Cost & Stock">01 - Item Cost &amp; Stock</option>
                    <option value="02 - Rekap Item Cost & Stock">02 - Rekap Item Cost &amp; Stock</option>
                    <option value="03 - Mutasi Item Cost & Stock">03 - Mutasi Item Cost &amp; Stock</option>
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
            label: 'Filter Laporan',
            value:
              filterType === 'merk'
                ? merkFilter || 'Semua Merk'
                : filterType === 'batasan_kode'
                ? `${kodeBarangStart || '-'} s/d ${kodeBarangEnd || '-'}`
                : filterType.toUpperCase(),
          },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={printColumns}
        rows={previewRows}
        summaryItems={[
          { label: 'Total Item Barang', value: `${previewRows.length} Item` },
          { label: 'Total Stock Bagus', value: formatMoney(totalQty) },
          { label: 'Total Valuation Cost', value: formatRupiah(totalCost) },
        ]}
      />
    </div>
  );
};
