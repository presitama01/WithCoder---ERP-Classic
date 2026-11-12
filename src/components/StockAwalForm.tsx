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

  const [isBrowseOpen, setIsBrowseOpen] = useState<boolean>(false);
  const [browseSearch, setBrowseSearch] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [stockList, setStockList] = useState<StockAwalData[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangCatalog, setBarangCatalog] = useState<MasterBarangLookup[]>([]);

  const browseSearchRef = useRef<HTMLInputElement>(null);

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

  const loadData = async () => {
    try {
      setIsBusy(true);
      const [rows, lokasis, barangs] = await Promise.all([
        erpList<any>('stock_awal', { orderBy: 'item_code', asc: true }),
        erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
        erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
      ]);
      const mapped = rows.map(mapRow);
      setStockList(mapped);
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
    } catch (err: any) {
      showFeedback(`Gagal memuat Stock Awal: ${err.message}`);
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
    setIsBrowseOpen(false);
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
      setIsBrowseOpen(true);
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

  const handleFind = () => {
    setIsBrowseOpen(true);
    setTimeout(() => browseSearchRef.current?.focus(), 60);
  };

  const filteredStockList = stockList.filter(
    (item) =>
      item.itemCode.toLowerCase().includes(browseSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(browseSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(browseSearch.toLowerCase()) ||
      item.merk.toLowerCase().includes(browseSearch.toLowerCase()) ||
      item.lokasi.toLowerCase().includes(browseSearch.toLowerCase())
  );

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
        onTableView={() => setIsBrowseOpen(true)}
        onExportExcel={handleExportExcel}
      />

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
                  onClick={() => setIsBrowseOpen(true)}
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

      {/* Modal Browse / List Persediaan Awal */}
      {isBrowseOpen && (
        <div
          id="stock-awal-browse-backdrop"
          className="pointer-events-auto fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-[#D4D0C8] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] shadow-2xl w-[800px] max-h-[85vh] flex flex-col font-sans text-xs">
            <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs select-none">
              <span>Daftar Persediaan Awal (Stock Awal) — Supabase</span>
              <button
                type="button"
                onClick={() => setIsBrowseOpen(false)}
                className="w-5 h-5 bg-[#C0C0C0] text-black border border-white font-bold flex items-center justify-center hover:bg-red-600 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#ECE9D8] p-2 border-b border-[#ACA899] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-black">Cari Barang :</span>
                <input
                  ref={browseSearchRef}
                  type="text"
                  placeholder="Ketik kode / nama / merk / lokasi..."
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                  className="px-2 py-0.5 bg-white border border-[#7A7A7A] w-64 text-xs outline-none"
                />
              </div>
              <div className="text-[11px] text-gray-800">
                Total Item: <b>{filteredStockList.length}</b> | Total Nilai:{' '}
                <b>{formatRupiah(totalNilaiPersediaan)}</b>
              </div>
            </div>

            <div className="p-2 overflow-auto max-h-[50vh] bg-white">
              <table className="w-full border-collapse border border-[#D4D0C8] text-[11px]">
                <thead>
                  <tr className="bg-[#ECE9D8] text-black">
                    <th className="border border-[#B5B3A8] px-2 py-1 text-center w-8">No</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-center w-20">Periode</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-left w-28">Lokasi</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-left w-24">Item Code</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-left">Description</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-left w-20">Merk</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-center w-14">Satuan</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-right w-20">HPP (Rp)</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-right w-14">Bagus</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-right w-14">Rusak</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-center w-16">Pilih</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockList.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#EAF2FC] cursor-pointer"
                      onDoubleClick={() => handleSelectItem(item)}
                    >
                      <td className="border border-[#E0DED5] px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border border-[#E0DED5] px-2 py-1 text-center">{item.periode}</td>
                      <td className="border border-[#E0DED5] px-2 py-1">{item.lokasi}</td>
                      <td className="border border-[#E0DED5] px-2 py-1 font-mono font-semibold text-blue-900">
                        {item.itemCode}
                      </td>
                      <td className="border border-[#E0DED5] px-2 py-1">{item.description}</td>
                      <td className="border border-[#E0DED5] px-2 py-1">{item.merk}</td>
                      <td className="border border-[#E0DED5] px-2 py-1 text-center">{item.satuan}</td>
                      <td className="border border-[#E0DED5] px-2 py-1 text-right font-mono">
                        {item.hpp.toLocaleString('id-ID')}
                      </td>
                      <td className="border border-[#E0DED5] px-2 py-1 text-right font-mono font-bold text-green-700">
                        {item.stockBagus}
                      </td>
                      <td className="border border-[#E0DED5] px-2 py-1 text-right font-mono text-red-600">
                        {item.stockRusak}
                      </td>
                      <td className="border border-[#E0DED5] px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          className="px-2 py-0.5 bg-[#ECE9D8] border border-[#7A7A7A] hover:bg-white text-[10px] font-bold cursor-pointer"
                        >
                          Pilih
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStockList.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-4 text-gray-500">
                        Tidak ada data item barang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-[#ECE9D8] p-2 border-t border-[#ACA899] flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1 bg-[#1E7145] text-white border border-black text-[11px] font-semibold cursor-pointer"
              >
                Export Excel
              </button>
              <button
                type="button"
                onClick={() => setIsBrowseOpen(false)}
                className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] font-semibold cursor-pointer active:shadow-inner"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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
          { label: 'Filter Pencarian', value: browseSearch || 'Semua Data' },
        ]}
        columns={printColumns}
        rows={filteredStockList}
        summaryItems={[
          { label: 'Total Item Stock Awal', value: `${filteredStockList.length} Baris` },
          { label: 'Total Nilai Persediaan', value: formatRupiah(totalNilaiPersediaan) },
        ]}
      />
    </div>
  );
};
