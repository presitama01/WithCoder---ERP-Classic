import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import {
  erpCreate,
  erpDelete,
  erpList,
  erpUpdate,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
  nextUniqueCode,
  parseNum,
  syncAppSettings,
  toIsoDate,
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
  const [filterType, setFilterType] = useState<string>('all');
  const [merkFilter, setMerkFilter] = useState<string>('');
  const [kodeBarangStart, setKodeBarangStart] = useState<string>('');
  const [kodeBarangEnd, setKodeBarangEnd] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Item Cost & Stock');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [merkOptions, setMerkOptions] = useState<string[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangCodes, setBarangCodes] = useState<string[]>([]);

  // Live Supabase table + Search state
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add / Koreksi Modal for master_barangs
  const [isCrudOpen, setIsCrudOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKode, setFormKode] = useState<string>('');
  const [formNama, setFormNama] = useState<string>('');
  const [formUnit, setFormUnit] = useState<string>('PCS');
  const [formMerk, setFormMerk] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('PRODUCT');
  const [formStock, setFormStock] = useState<string>('0');
  const [formCost, setFormCost] = useState<string>('0');
  const [formPrice, setFormPrice] = useState<string>('0');
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<any | null>(null);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadLiveRows = async (): Promise<any[]> => {
    const [barangs, stockAwals] = await Promise.all([
      erpList<any>('master_barangs', { orderBy: 'kode', asc: true }),
      erpList<any>('stock_awal', { orderBy: 'item_code', asc: true }).catch(() => []),
    ]);

    const awalMap = new Map<string, any>();
    for (const sa of stockAwals) {
      if (lokasiStock !== 'ALL' && sa.lokasi && sa.lokasi !== lokasiStock) continue;
      const key = (sa.item_code || '').toUpperCase();
      const prev = awalMap.get(key) || {
        bagus: 0,
        rusak: 0,
        hpp: Number(sa.hpp || 0),
        lokasi: sa.lokasi || '01 - OFFICE',
      };
      awalMap.set(key, {
        bagus: prev.bagus + Number(sa.stock_bagus || 0),
        rusak: prev.rusak + Number(sa.stock_rusak || 0),
        hpp: Number(sa.hpp || prev.hpp || 0),
        lokasi: sa.lokasi || prev.lokasi,
      });
    }

    const mapped = barangs.map((b) => {
      const code = (b.kode || '').toUpperCase();
      const sa = awalMap.get(code);
      const stockBagus = sa ? sa.bagus : Number(b.stock || 0);
      const stockRusak = sa ? sa.rusak : 0;
      const hpp = Number(b.cost || sa?.hpp || 0);
      const hargaJual = Number(b.price || 0);
      return {
        id: String(b.id),
        kode_barang: b.kode || '',
        nama_barang: b.nama_barang || '',
        category: b.category || '',
        merk: b.merk || '',
        satuan: b.unit || 'PCS',
        lokasi: sa?.lokasi || '01 - OFFICE',
        hpp,
        harga_jual: hargaJual,
        stock_master: Number(b.stock || 0),
        stock_bagus: stockBagus,
        stock_rusak: stockRusak,
        total_cost: hpp * stockBagus,
      };
    });

    setBarangCodes(mapped.map((m) => m.kode_barang).filter(Boolean));
    setTableRows(mapped);
    if (mapped.length > 0 && !mapped.some((m) => m.id === selectedId)) {
      setSelectedId(mapped[0].id);
    }
    return mapped;
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      try {
        setIsBusy(true);
        const [merks, lokasis] = await Promise.all([
          erpList<any>('master_merks', { orderBy: 'nama_merk', asc: true }).catch(() => []),
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setMerkOptions(merks.map((m) => m.nama_merk || '').filter(Boolean));
        setLokasiOptions(
          lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()).filter(Boolean)
        );
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
        await loadLiveRows();
      } catch {
        // Ignore lookup error
      } finally {
        if (active) setIsBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTableRows = tableRows.filter((r) => {
    if (filterType === 'merk' && merkFilter.trim()) {
      if (!r.merk.toLowerCase().includes(merkFilter.trim().toLowerCase())) return false;
    }
    if (filterType === 'batasan_kode') {
      const start = kodeBarangStart.trim().toUpperCase();
      const end = kodeBarangEnd.trim().toUpperCase();
      const code = r.kode_barang.toUpperCase();
      if (start && code < start) return false;
      if (end && code > end) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      if (searchField === 'Kode') return r.kode_barang.toLowerCase().includes(q);
      if (searchField === 'Nama Barang') return r.nama_barang.toLowerCase().includes(q);
      if (searchField === 'Merk') return r.merk.toLowerCase().includes(q);
      if (searchField === 'Category') return r.category.toLowerCase().includes(q);
      return (
        r.kode_barang.toLowerCase().includes(q) ||
        r.nama_barang.toLowerCase().includes(q) ||
        r.merk.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleBaru = () => {
    setEditingId(null);
    setModalError(null);
    setFormKode(nextUniqueCode(tableRows.map((r) => r.kode_barang), '', 8));
    setFormNama('');
    setFormUnit('PCS');
    setFormMerk(merkFilter || '');
    setFormCategory('PRODUCT');
    setFormStock('0');
    setFormCost('0');
    setFormPrice('0');
    setIsCrudOpen(true);
  };

  const handleKoreksi = () => {
    const current =
      filteredTableRows.find((r) => r.id === selectedId) ||
      tableRows.find((r) => r.id === selectedId) ||
      filteredTableRows[0];
    if (!current) {
      showFeedback('Pilih baris item barang terlebih dahulu (atau klik Baru)');
      return;
    }
    setSelectedId(current.id);
    setEditingId(current.id);
    setModalError(null);
    setFormKode(current.kode_barang);
    setFormNama(current.nama_barang);
    setFormUnit(current.satuan || 'PCS');
    setFormMerk(current.merk);
    setFormCategory(current.category || 'PRODUCT');
    setFormStock(String(current.stock_master ?? current.stock_bagus ?? 0));
    setFormCost(String(current.hpp || 0));
    setFormPrice(String(current.harga_jual || 0));
    setIsCrudOpen(true);
  };

  const handleSaveCrud = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formKode.trim() || !formNama.trim()) {
      setModalError('Kode Barang dan Nama Barang wajib diisi.');
      return;
    }
    try {
      setIsBusy(true);
      const payload = {
        kode: formKode.trim().toUpperCase(),
        nama_barang: formNama.trim().toUpperCase(),
        unit: formUnit.trim().toUpperCase() || 'PCS',
        merk: formMerk.trim().toUpperCase(),
        category: formCategory.trim().toUpperCase(),
        stock: parseNum(formStock),
        cost: parseNum(formCost),
        price: parseNum(formPrice),
      };
      if (editingId) {
        await erpUpdate('master_barangs', editingId, payload);
        showFeedback('Item Cost & Stock diperbarui di Supabase');
      } else {
        const created = await erpCreate<any>('master_barangs', payload);
        if (created?.id) setSelectedId(String(created.id));
        showFeedback('Item Barang baru tersimpan ke Supabase');
      }
      setIsCrudOpen(false);
      setEditingId(null);
      await loadLiveRows();
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Item Barang';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRequestHapus = () => {
    const current =
      filteredTableRows.find((r) => r.id === selectedId) ||
      tableRows.find((r) => r.id === selectedId);
    if (!current) {
      showFeedback('Pilih baris item barang yang akan dihapus');
      return;
    }
    setConfirmDeleteRow(current);
  };

  const handleConfirmHapus = async () => {
    if (!confirmDeleteRow) return;
    try {
      setIsBusy(true);
      await erpDelete('master_barangs', confirmDeleteRow.id);
      setConfirmDeleteRow(null);
      await loadLiveRows();
      showFeedback('Item Barang dihapus dari Supabase');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSimpan = async () => {
    try {
      setIsBusy(true);
      localStorage.setItem(
        'withcoder_preset_item_cost_stock',
        JSON.stringify({ tglStart, tglEnd, filterType, merkFilter, lokasiStock, bentukLaporan })
      );
      await syncAppSettings({
        periode_start: toIsoDate(tglStart),
        periode_end: toIsoDate(tglEnd),
        lokasi_aktif: lokasiStock !== 'ALL' ? lokasiStock : undefined,
      });
      await loadLiveRows();
      showFeedback('Parameter & data Item Cost & Stock tersinkron ke Supabase');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFind = async () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
    try {
      setIsBusy(true);
      await loadLiveRows();
      showFeedback('Data Item Cost & Stock dimuat ulang dari Supabase');
    } catch (err: any) {
      showFeedback(`Gagal muat: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const fresh = await loadLiveRows();
    return fresh.filter((r) => {
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
        onFind={handleFind}
        onPrint={handlePreview}
        onTableView={() => loadLiveRows()}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3 space-y-2.5">
        <div className="max-w-[610px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-3 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[13px] tracking-wide text-black font-sans">
              ITEM COST &amp; STOCK
            </h1>
          </div>

          <div className="border-b border-[#999999] pb-2">
            <FormActionButtons
              compact
              onSimpan={handleSimpan}
              onBaru={handleBaru}
              onKoreksi={handleKoreksi}
              onHapus={handleRequestHapus}
              onPrint={handlePreview}
              onFind={handleFind}
              isBusy={isBusy}
              feedback={feedback}
            />
          </div>

          {/* Group 1: Periode */}
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

            <div className="w-[100px] border border-[#999999] p-1.5 flex flex-col items-center justify-center gap-1.5 bg-[#E6E2D4]">
              <button
                type="button"
                disabled={isBusy}
                onClick={handlePreview}
                className="w-full flex-1 py-2 bg-[#EAE6D9] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F2EFE6] active:border-[#808080] active:border-r-[#FFFFFF] active:border-b-[#FFFFFF] font-extrabold text-[12px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span className="border border-dotted border-black/40 px-1 py-0.5 w-full block">
                  PREVIEW
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full h-[24px] bg-[#ECE9D8] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F5F3E8] font-bold text-[11px] text-black cursor-pointer flex items-center justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Live Supabase Search & Data Grid Panel */}
        <div className="max-w-[980px] bg-[#ECE9D8] border border-[#808080] flex flex-col shadow-xs">
          <div className="bg-[#D4D0C8] border-b border-[#808080] px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-[11px] text-[#003C74]">Search :</span>
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="h-[22px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] outline-none"
              >
                <option value="Semua">Semua Kolom</option>
                <option value="Kode">Kode</option>
                <option value="Nama Barang">Nama Barang</option>
                <option value="Merk">Merk</option>
                <option value="Category">Category</option>
              </select>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadLiveRows();
                }}
                placeholder="Cari Kode Barang, Nama Barang, Merk, Category..."
                className="w-[230px] h-[22px] bg-white border border-[#7A7A7A] px-2 text-[11px] outline-none focus:border-[#316AC5]"
              />
              <button
                type="button"
                onClick={() => loadLiveRows()}
                className="h-[22px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] text-[11px] font-semibold cursor-pointer"
              >
                Cari / Refresh
              </button>
            </div>
            <span className="text-[11px] text-black">
              Data Supabase (<b>master_barangs</b>): <b>{filteredTableRows.length}</b> item
            </span>
          </div>

          <div className="max-h-[220px] overflow-auto bg-white">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080]">
                <tr>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Kode Brg</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Barang</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Merk</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Satuan</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">HPP (Rp)</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">Harga Jual</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">Bagus</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">Rusak</th>
                  <th className="px-2 py-1 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                      Belum ada data Item Barang. Klik "Baru" untuk menambah ke Supabase.
                    </td>
                  </tr>
                ) : (
                  filteredTableRows.map((r) => {
                    const isSel = r.id === selectedId;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        onDoubleClick={() => {
                          setSelectedId(r.id);
                          setEditingId(r.id);
                          setModalError(null);
                          setFormKode(r.kode_barang);
                          setFormNama(r.nama_barang);
                          setFormUnit(r.satuan || 'PCS');
                          setFormMerk(r.merk);
                          setFormCategory(r.category || 'PRODUCT');
                          setFormStock(String(r.stock_master ?? r.stock_bagus ?? 0));
                          setFormCost(String(r.hpp || 0));
                          setFormPrice(String(r.harga_jual || 0));
                          setIsCrudOpen(true);
                        }}
                        className={`cursor-pointer border-b border-[#E0E0E0] ${
                          isSel ? 'bg-[#316AC5] text-white' : 'hover:bg-[#EAF2FC]'
                        }`}
                      >
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.kode_barang}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_barang}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.merk || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.satuan}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.hpp)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.harga_jual)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.stock_bagus)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.stock_rusak)}</td>
                        <td className="px-2 py-1 text-right font-mono font-bold">{formatMoney(r.total_cost)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Item Barang Modal */}
      {isCrudOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[460px] flex flex-col overflow-hidden text-xs">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 flex justify-between items-center font-bold">
              <span>{editingId ? 'Koreksi Item Cost & Stock' : 'Tambah Item Cost & Stock Baru'}</span>
              <button
                type="button"
                onClick={() => setIsCrudOpen(false)}
                className="w-5 h-5 bg-[#C00000] text-white font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form noValidate onSubmit={handleSaveCrud} className="p-3 space-y-2 text-[11px]">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Kode Barang *</label>
                  <input
                    type="text"
                    value={formKode}
                    onChange={(e) => setFormKode(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold mb-0.5">Nama Barang *</label>
                  <input
                    type="text"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Satuan</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Merk</label>
                  <input
                    type="text"
                    list="item-cost-merk-list"
                    value={formMerk}
                    onChange={(e) => setFormMerk(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Stock</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">HPP / Cost (Rp)</label>
                  <input
                    type="number"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
              </div>

              {modalError && (
                <div className="p-2 bg-[#FDE8E8] border border-[#C00000] text-[#900000] font-semibold">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ACA899]">
                <button
                  type="button"
                  onClick={() => setIsCrudOpen(false)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1 bg-[#0A246A] text-white border border-black font-bold cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-xl w-[360px] overflow-hidden">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 font-bold text-xs">
              Konfirmasi Hapus Item Barang
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>
                Yakin ingin menghapus Item [{confirmDeleteRow.kode_barang} - {confirmDeleteRow.nama_barang}]
                dari database Supabase?
              </p>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteRow(null)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleConfirmHapus}
                  className="px-3 py-1 bg-[#C00000] text-white border border-black text-xs font-bold cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
