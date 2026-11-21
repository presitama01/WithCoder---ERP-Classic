import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import {
  erpCreate,
  erpDelete,
  erpList,
  erpUpdate,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
  parseNum,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface StockAwalData {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  merk: string;
  satuan: string;
  hpp: number;
  stockBagus: number;
  stockRusak: number;
  lokasi: string;
  periode: string;
}

interface MasterBarangLookup {
  kode_barang: string;
  nama_barang: string;
  description: string;
  category: string;
  merk: string;
  satuan: string;
  hpp: number;
}

interface StockAwalFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockAwalForm: React.FC<StockAwalFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [periode, setPeriode] = useState<string>('08 - 2026');
  const [lokasiStock, setLokasiStock] = useState<string>('01 - OFFICE');
  const [itemCode, setItemCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [merk, setMerk] = useState<string>('');
  const [satuan, setSatuan] = useState<string>('PCS');
  const [hpp, setHpp] = useState<string>('0');
  const [stockBagus, setStockBagus] = useState<string>('0');
  const [stockRusak, setStockRusak] = useState<string>('0');

  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [stockList, setStockList] = useState<StockAwalData[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangCatalog, setBarangCatalog] = useState<MasterBarangLookup[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const mapRow = (r: any): StockAwalData => ({
    id: String(r.id),
    itemCode: r.item_code || '',
    description: r.description || '',
    category: r.category || '',
    merk: r.merk || '',
    satuan: r.satuan || 'PCS',
    hpp: Number(r.hpp || 0),
    stockBagus: Number(r.stock_bagus || 0),
    stockRusak: Number(r.stock_rusak || 0),
    lokasi: r.lokasi || '01 - OFFICE',
    periode: r.periode || '08 - 2026',
  });

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'item_code',
    'Item Code': 'item_code',
    Description: 'description',
    Category: 'category',
    Merk: 'merk',
    Lokasi: 'lokasi',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
    applyFirstMatch?: boolean;
  }): Promise<StockAwalData[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = { orderBy: 'item_code', asc: true, limit: 1000 };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'item_code,description,category,merk,satuan,lokasi,periode';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows, lokasis, barangs] = await Promise.all([
        erpList<any>('stock_awal', queryOpts),
        erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
        erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
      ]);
      const mapped = rows.map(mapRow);
      setStockList(mapped);
      if (opts?.applyFirstMatch && mapped.length > 0) {
        const first = mapped[0];
        setEditingId(first.id);
        setItemCode(first.itemCode);
        setDescription(first.description);
        setCategory(first.category);
        setMerk(first.merk);
        setSatuan(first.satuan);
        setHpp(String(first.hpp));
        setStockBagus(String(first.stockBagus));
        setStockRusak(String(first.stockRusak));
        setLokasiStock(first.lokasi);
        setPeriode(first.periode);
      }
      setLokasiOptions(
        lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()).filter(Boolean)
      );
      setBarangCatalog(
        barangs.map((b) => ({
          kode_barang: b.kode || '',
          nama_barang: b.nama_barang || '',
          description: b.nama_barang || '',
          category: b.category || '',
          merk: b.merk || '',
          satuan: b.unit || 'PCS',
          hpp: Number(b.cost || 0),
        }))
      );
      return mapped;
    } catch (err: any) {
      showFeedback(`Gagal memuat Stock Awal: ${err.message}`);
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  // Auto-fill fields when Item Code matches master_barangs (only when not selecting an existing row or when user types code)
  const handleItemCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setItemCode(upper);
    const match = barangCatalog.find(
      (b) => b.kode_barang.trim().toLowerCase() === upper.trim().toLowerCase()
    );
    if (match) {
      setDescription(match.description || match.nama_barang || '');
      setCategory(match.category || '');
      setMerk(match.merk || '');
      setSatuan(match.satuan || 'PCS');
      setHpp(String(match.hpp || 0));
    }
  };

  if (!isOpen) return null;

  const handleSelectItem = (item: StockAwalData) => {
    setEditingId(item.id);
    setItemCode(item.itemCode);
    setDescription(item.description);
    setCategory(item.category);
    setMerk(item.merk);
    setSatuan(item.satuan);
    setHpp(String(item.hpp));
    setStockBagus(String(item.stockBagus));
    setStockRusak(String(item.stockRusak));
    setLokasiStock(item.lokasi);
    setPeriode(item.periode);
    setIsFindOpen(false);
    showFeedback(`Item ${item.itemCode} dipilih`);
  };

  const handleBaru = () => {
    setEditingId(null);
    setItemCode('');
    setDescription('');
    setCategory('');
    setMerk('');
    setSatuan('PCS');
    setHpp('0');
    setStockBagus('0');
    setStockRusak('0');
    showFeedback('Form Stock Awal siap diisi');
  };

  const handleSaveData = async () => {
    if (!itemCode.trim()) {
      showFeedback('Isi Item Code terlebih dahulu');
      return;
    }

    const numHpp = parseNum(hpp);
    const numBagus = parseNum(stockBagus);
    const numRusak = parseNum(stockRusak);
    const normalizedCode = itemCode.trim().toUpperCase();

    const payload = {
      periode: periode.trim() || '08 - 2026',
      lokasi: lokasiStock,
      item_code: normalizedCode,
      description: description.trim().toUpperCase(),
      category: category.trim().toUpperCase(),
      merk: merk.trim().toUpperCase(),
      satuan: satuan.trim().toUpperCase() || 'PCS',
      hpp: numHpp,
      stock_bagus: numBagus,
      stock_rusak: numRusak,
    };

    try {
      setIsBusy(true);
      const existingById = editingId ? stockList.find((s) => s.id === editingId) : null;
      const existingSameKey = stockList.find(
        (s) =>
          s.itemCode.toUpperCase() === normalizedCode &&
          s.lokasi === payload.lokasi &&
          s.periode === payload.periode
      );
      const target = existingById || existingSameKey;

      if (target) {
        const updated = await erpUpdate<any>('stock_awal', target.id, payload);
        const mapped = mapRow(updated);
        setStockList((prev) => prev.map((s) => (s.id === target.id ? mapped : s)));
        setEditingId(mapped.id);
        showFeedback(`Data [${normalizedCode}] diperbarui`);
      } else {
        const created = await erpCreate<any>('stock_awal', payload);
        const mapped = mapRow(created);
        setStockList((prev) => [mapped, ...prev]);
        setEditingId(mapped.id);
        showFeedback(`Data [${normalizedCode}] tersimpan`);
      }
    } catch (err: any) {
      showFeedback(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleKoreksi = () => {
    if (!itemCode.trim() && !editingId) {
      handleFind();
      return;
    }
    handleSaveData();
  };

  const requestDelete = () => {
    const normalizedCode = itemCode.trim().toUpperCase();
    const target = stockList.find(
      (s) => s.id === editingId || (normalizedCode && s.itemCode.toUpperCase() === normalizedCode)
    );
    if (!target) {
      handleBaru();
      showFeedback('Form dibersihkan');
      return;
    }
    setConfirmDeleteId(target.id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setIsBusy(true);
      const target = stockList.find((s) => s.id === confirmDeleteId);
      await erpDelete('stock_awal', confirmDeleteId);
      setStockList((prev) => prev.filter((s) => s.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      handleBaru();
      showFeedback(`Data [${target?.itemCode || ''}] dihapus`);
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveData();
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  const handleToolbarCari = async () => {
    const rows = await loadData({
      field: searchField,
      term: searchTerm,
      applyFirstMatch: true,
    });
    if (rows && rows.length > 0) {
      showFeedback(
        searchTerm.trim()
          ? `Ditemukan ${rows.length} Stock Awal [${rows[0].itemCode}] di Supabase`
          : `Menampilkan ${rows.length} Stock Awal dari Supabase`
      );
    } else if (rows) {
      showFeedback('Data Stock Awal tidak ditemukan di Supabase');
    }
  };

  const handleToolbarReset = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} item Stock Awal)`);
  };

  const filteredStockList = stockList.filter((item) => {
    if (!searchTerm.trim()) return true;
    if (searchField === 'Kode' || searchField === 'Item Code') {
      return matchesMultiKeyword([item.itemCode], searchTerm);
    }
    if (searchField === 'Description') return matchesMultiKeyword([item.description], searchTerm);
    if (searchField === 'Category') return matchesMultiKeyword([item.category], searchTerm);
    if (searchField === 'Merk') return matchesMultiKeyword([item.merk], searchTerm);
    if (searchField === 'Lokasi') return matchesMultiKeyword([item.lokasi], searchTerm);
    return matchesMultiKeyword(
      [item.itemCode, item.description, item.category, item.merk, item.satuan, item.lokasi, item.periode],
      searchTerm
    );
  });

  const handleExportExcel = async () => {
    try {
      setIsBusy(true);
      const company = await fetchActiveCompanyProfile();
      exportToExcel({
        fileName: 'Stock_Awal',
        sheetTitle: 'DAFTAR STOCK AWAL',
        subtitle: `Total: ${filteredStockList.length} item`,
        companyProfile: company,
        columns: [
          { header: 'Periode', accessor: 'periode', align: 'center' },
          { header: 'Lokasi', accessor: 'lokasi' },
          { header: 'Item Code', accessor: 'itemCode' },
          { header: 'Description', accessor: 'description' },
          { header: 'Category', accessor: 'category' },
          { header: 'Merk', accessor: 'merk' },
          { header: 'Satuan', accessor: 'satuan', align: 'center' },
          { header: 'HPP', accessor: 'hpp', align: 'right' },
          { header: 'Stock Bagus', accessor: 'stockBagus', align: 'right' },
          { header: 'Stock Rusak', accessor: 'stockRusak', align: 'right' },
        ],
        rows: filteredStockList,
      });
      showFeedback('Export Excel selesai');
    } catch (err: any) {
      showFeedback(`Gagal export: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const printColumns: PrintColumn<StockAwalData>[] = [
    { header: 'Periode', accessor: 'periode', align: 'center', width: '75px' },
    { header: 'Lokasi', accessor: 'lokasi', width: '95px' },
    { header: 'Item Code', accessor: 'itemCode', width: '85px' },
    { header: 'Description', accessor: 'description' },
    { header: 'Merk', accessor: 'merk', width: '70px' },
    { header: 'Sat', accessor: 'satuan', align: 'center', width: '40px' },
    { header: 'HPP (Rp)', accessor: (r) => formatMoney(r.hpp), align: 'right', width: '85px' },
    { header: 'Bagus', accessor: (r) => formatMoney(r.stockBagus), align: 'right', width: '55px' },
    { header: 'Rusak', accessor: (r) => formatMoney(r.stockRusak), align: 'right', width: '55px' },
  ];

  const existingSelectedStock = stockList.find((s) => s.id === editingId) || null;
  const selectedStockRow: StockAwalData | null = existingSelectedStock
    ? {
        ...existingSelectedStock,
        periode: periode.trim() || existingSelectedStock.periode,
        lokasi: lokasiStock || existingSelectedStock.lokasi,
        itemCode: itemCode.trim().toUpperCase() || existingSelectedStock.itemCode,
        description: description.trim().toUpperCase(),
        category: category.trim().toUpperCase(),
        merk: merk.trim().toUpperCase(),
        satuan: satuan.trim().toUpperCase() || 'PCS',
        hpp: parseNum(hpp),
        stockBagus: parseNum(stockBagus),
        stockRusak: parseNum(stockRusak),
      }
    : itemCode.trim()
    ? {
        id: editingId || 'active',
        periode: periode.trim() || '08 - 2026',
        lokasi: lokasiStock,
        itemCode: itemCode.trim().toUpperCase(),
        description: description.trim().toUpperCase(),
        category: category.trim().toUpperCase(),
        merk: merk.trim().toUpperCase(),
        satuan: satuan.trim().toUpperCase() || 'PCS',
        hpp: parseNum(hpp),
        stockBagus: parseNum(stockBagus),
        stockRusak: parseNum(stockRusak),
      }
    : null;

  const totalNilaiPersediaan = filteredStockList.reduce(
    (acc, item) => acc + item.hpp * item.stockBagus,
    0
  );

  return (
    <div
      id="stock-awal-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Stock Awal"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => setIsPrintOpen(true)}
        onTableView={handleFind}
        onExportExcel={handleExportExcel}
      />

      <div className="shrink-0 bg-[#ECE9D8] border-b border-[#ACA899] px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto">
        <span className="text-[11px] font-bold text-[#003C74] whitespace-nowrap">
          Data Stock Awal Supabase: {stockList.length} item
        </span>
        <ToolbarSearchControl
          compact
          searchField={searchField}
          onSearchFieldChange={setSearchField}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onCari={handleToolbarCari}
          onReset={handleToolbarReset}
          inputRef={searchInputRef}
          isBusy={isBusy}
          options={[
            { value: 'Semua', label: 'Semua' },
            { value: 'Kode', label: 'Kode (Item Code)' },
            { value: 'Description', label: 'Description' },
            { value: 'Category', label: 'Category' },
            { value: 'Merk', label: 'Merk' },
            { value: 'Lokasi', label: 'Lokasi' },
          ]}
        />
      </div>

      {/* Main Scrollable Container */}
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[580px] bg-[#ECE9D8] border border-[#808080] p-2 shadow-xs">
          <div className="border border-[#999999] p-3 bg-[#ECE9D8] flex flex-col">
            <form onSubmit={handleSaveOrUpdate} className="flex flex-col space-y-2">
              {/* Row 1: Periode & Lokasi Stock */}
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Periode :
                  </label>
                  <input
                    type="text"
                    value={periode}
                    onChange={(e) => setPeriode(e.target.value)}
                    placeholder="08 - 2026"
                    className="w-24 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none shadow-inner"
                  />
                </div>

                <div className="flex items-center space-x-1.5">
                  <label className="font-medium text-black">Lokasi Stock :</label>
                  <div className="flex items-center bg-white border border-[#7A7A7A]">
                    <select
                      value={lokasiStock}
                      onChange={(e) => setLokasiStock(e.target.value)}
                      className="px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer w-44"
                    >
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
                </div>
              </div>

              <div className="border-b border-[#999999] my-1" />

              {/* Middle Section */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Item Code :
                  </label>
                  <input
                    type="text"
                    list="stock-awal-barang-list"
                    value={itemCode}
                    onChange={(e) => handleItemCodeChange(e.target.value)}
                    className="w-48 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none shadow-inner"
                  />
                  <datalist id="stock-awal-barang-list">
                    {barangCatalog.map((b) => (
                      <option key={b.kode_barang} value={b.kode_barang}>
                        {b.description || b.nama_barang}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Description :
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-80 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] outline-none shadow-inner"
                  />
                </div>

                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Category :
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-32 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] outline-none shadow-inner"
                  />
                </div>

                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Merk :
                  </label>
                  <input
                    type="text"
                    value={merk}
                    onChange={(e) => setMerk(e.target.value)}
                    className="w-32 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] outline-none shadow-inner"
                  />
                </div>

                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Satuan :
                  </label>
                  <input
                    type="text"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    className="w-20 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] outline-none shadow-inner"
                  />
                </div>
              </div>

              <div className="border-b border-[#999999] my-1" />

              {/* Bottom Row: HPP, Stock Bagus, Stock Rusak */}
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    HPP (Rp) :
                  </label>
                  <input
                    type="text"
                    value={hpp}
                    onChange={(e) => setHpp(e.target.value)}
                    className="w-28 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] text-right font-mono outline-none shadow-inner"
                  />
                </div>

                <div className="flex items-center space-x-1.5">
                  <label className="font-medium text-black">Stock Bagus :</label>
                  <input
                    type="text"
                    value={stockBagus}
                    onChange={(e) => setStockBagus(e.target.value)}
                    className="w-16 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] text-right font-mono outline-none shadow-inner"
                  />
                </div>

                <div className="flex items-center space-x-1.5">
                  <label className="font-medium text-black">Stock Rusak :</label>
                  <input
                    type="text"
                    value={stockRusak}
                    onChange={(e) => setStockRusak(e.target.value)}
                    className="w-16 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] text-right font-mono outline-none shadow-inner"
                  />
                </div>
              </div>

              {/* Action Buttons: FormActionButtons & Open */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#999999]">
                <FormActionButtons
                  compact
                  onSimpan={handleSaveData}
                  onBaru={handleBaru}
                  onKoreksi={handleKoreksi}
                  onHapus={requestDelete}
                  onPrint={() => setIsPrintOpen(true)}
                  onFind={handleFind}
                  isBusy={isBusy}
                  feedback={feedback}
                />
                <button
                  type="button"
                  onClick={handleFind}
                  className="w-18 py-1 bg-[#ECE9D8] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F2EFE6] active:border-[#808080] active:border-r-[#FFFFFF] active:border-b-[#FFFFFF] text-[11px] font-bold text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
                >
                  <span className="border border-dotted border-black/50 px-2 py-0.5 w-full block">
                    Open ({stockList.length})
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Stock Awal"
        rows={stockList}
        selectedId={editingId || ''}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.itemCode,
          r.description,
          r.category,
          r.merk,
          r.satuan,
          r.lokasi,
          r.periode,
        ]}
        initialQuery={searchTerm}
        isBusy={isBusy}
        placeholder="Cari Kode (Item Code), Description, Merk, Category, Lokasi..."
        onSearchSupabase={(q) => {
          setSearchField('Semua');
          setSearchTerm(q);
          return loadData({ field: 'Semua', term: q });
        }}
        onRefreshSupabase={() => {
          setSearchField('Semua');
          setSearchTerm('');
          return loadData({ field: 'Semua', term: '' });
        }}
        onSelectRow={(item, q) => {
          setSearchTerm(q);
          handleSelectItem(item);
        }}
        columns={[
          { header: 'Periode', accessor: (r) => r.periode, widthClass: 'w-20', align: 'center' },
          { header: 'Lokasi', accessor: (r) => r.lokasi, widthClass: 'w-28' },
          { header: 'Kode / Item Code', accessor: (r) => r.itemCode, widthClass: 'w-28', mono: true, bold: true },
          { header: 'Description', accessor: (r) => r.description, bold: true },
          { header: 'Merk', accessor: (r) => r.merk || '-', widthClass: 'w-20' },
          { header: 'Satuan', accessor: (r) => r.satuan, widthClass: 'w-14', align: 'center' },
          { header: 'HPP (Rp)', accessor: (r) => r.hpp.toLocaleString('id-ID'), widthClass: 'w-24', align: 'right', mono: true },
          { header: 'Bagus', accessor: (r) => r.stockBagus, widthClass: 'w-16', align: 'right', mono: true },
          { header: 'Rusak', accessor: (r) => r.stockRusak, widthClass: 'w-16', align: 'right', mono: true },
        ]}
      />

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-xl w-[360px] overflow-hidden">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 font-bold text-xs">
              Konfirmasi Hapus Stock Awal
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>Yakin ingin menghapus data Stock Awal [{itemCode}] dari database Supabase?</p>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={confirmDelete}
                  className="px-3 py-1 bg-[#C00000] text-white border border-black text-xs font-bold cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A4 Print Preview */}
      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN STOCK AWAL PERSEDIAAN"
        subtitle={`Periode Aktif: ${periode} | Lokasi: ${lokasiStock}`}
        orientation="landscape"
        metaLines={[
          { label: 'Periode', value: periode },
          { label: 'Lokasi Aktif', value: lokasiStock },
          { label: 'Jumlah Item', value: `${filteredStockList.length} Item` },
          { label: 'Filter Pencarian', value: searchTerm || 'Semua Data' },
        ]}
        columns={printColumns}
        rows={filteredStockList}
        summaryItems={[
          { label: 'Total Item Stock Awal', value: `${filteredStockList.length} Baris` },
          { label: 'Total Nilai Persediaan', value: formatRupiah(totalNilaiPersediaan) },
        ]}
        selectedRow={selectedStockRow}
        selectedTitle="DETAIL STOCK AWAL BARANG"
        selectedSubtitle={
          selectedStockRow
            ? `Item Code: ${selectedStockRow.itemCode} | ${selectedStockRow.description}`
            : undefined
        }
        selectedMetaLines={
          selectedStockRow
            ? [
                { label: 'Periode', value: selectedStockRow.periode },
                { label: 'Lokasi', value: selectedStockRow.lokasi },
                { label: 'Item Code', value: selectedStockRow.itemCode },
                { label: 'Description', value: selectedStockRow.description },
                { label: 'Category / Merk', value: `${selectedStockRow.category || '-'} / ${selectedStockRow.merk || '-'}` },
              ]
            : undefined
        }
        selectedSummaryItems={
          selectedStockRow
            ? [
                { label: 'Stock Bagus / Rusak', value: `${selectedStockRow.stockBagus} / ${selectedStockRow.stockRusak} ${selectedStockRow.satuan}` },
                { label: 'Nilai Persediaan Item', value: formatRupiah(selectedStockRow.hpp * selectedStockRow.stockBagus) },
              ]
            : undefined
        }
      />
    </div>
  );
};
