import React, { useState, useEffect, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  erpCreate,
  erpDelete,
  erpList,
  erpUpdate,
  fetchActiveCompanyProfile,
  formatMoney,
  parseNum,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

export interface BarangItem {
  id: string;
  kode: string;
  namaBarang: string;
  unit: string;
  merk: string;
  category: string;
  tipe: string;
  stock: number;
  cost: number;
  price: number;
  disc: number;
  qMin: number;
  qtyPo: number;
  qtySo: number;
  notPrint: boolean;
}

interface MasterBarangListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function fmtDot(n: number): string {
  return n === 0 ? '.' : formatMoney(n, true);
}

function mapDbToItem(r: any): BarangItem {
  return {
    id: r.id,
    kode: r.kode || '',
    namaBarang: r.nama_barang || '',
    unit: r.unit || 'PCS',
    merk: r.merk || '',
    category: r.category || '',
    tipe: r.tipe || '',
    stock: Number(r.stock || 0),
    cost: Number(r.cost || 0),
    price: Number(r.price || 0),
    disc: Number(r.disc || 0),
    qMin: Number(r.q_min || 0),
    qtyPo: Number(r.qty_po || 0),
    qtySo: Number(r.qty_so || 0),
    notPrint: Boolean(r.not_print),
  };
}

export const MasterBarangListForm: React.FC<MasterBarangListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [barangList, setBarangList] = useState<BarangItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Description');
  const [filterSemua, setFilterSemua] = useState<string>('SEMUA-nya');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newUnit, setNewUnit] = useState('PCS');
  const [newMerk, setNewMerk] = useState('');
  const [newCategory, setNewCategory] = useState('PRODUCT');
  const [newTipe, setNewTipe] = useState('');
  const [newStock, setNewStock] = useState('0');
  const [newCost, setNewCost] = useState('0');
  const [newPrice, setNewPrice] = useState('0');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadData = async () => {
    try {
      setIsBusy(true);
      const rows = await erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 });
      const mapped = rows.map(mapDbToItem);
      setBarangList(mapped);
      if (mapped.length > 0 && !mapped.some((b) => b.id === selectedId)) {
        setSelectedId(mapped[0].id);
      }
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNew = () => {
    setEditingId(null);
    const nextCode = (barangList.length + 1).toString().padStart(8, '0');
    setNewKode(nextCode);
    setNewNama('');
    setNewUnit('PCS');
    setNewMerk('');
    setNewCategory('PRODUCT');
    setNewTipe('');
    setNewStock('0');
    setNewCost('0');
    setNewPrice('0');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = barangList.find((b) => b.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setNewKode(item.kode);
    setNewNama(item.namaBarang);
    setNewUnit(item.unit || 'PCS');
    setNewMerk(item.merk);
    setNewCategory(item.category || 'PRODUCT');
    setNewTipe(item.tipe);
    setNewStock(String(item.stock));
    setNewCost(String(item.cost));
    setNewPrice(String(item.price));
    setIsAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      setIsBusy(true);
      await erpDelete('master_barangs', selectedId);
      const updated = barangList.filter((b) => b.id !== selectedId);
      setBarangList(updated);
      setSelectedId(updated[0]?.id || '');
      showFeedback('Data dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNama.trim()) return;

    try {
      setIsBusy(true);
      const dbPayload = {
        kode: newKode.trim().toUpperCase(),
        nama_barang: newNama.trim().toUpperCase(),
        unit: newUnit.trim().toUpperCase() || 'PCS',
        merk: newMerk.trim().toUpperCase(),
        category: newCategory.trim().toUpperCase(),
        tipe: newTipe.trim().toUpperCase(),
        stock: parseNum(newStock),
        cost: parseNum(newCost),
        price: parseNum(newPrice),
      };

      if (editingId) {
        const saved = await erpUpdate<any>('master_barangs', editingId, dbPayload);
        const mapped = mapDbToItem(saved);
        setBarangList(barangList.map((b) => (b.id === editingId ? mapped : b)));
        showFeedback('Data diperbarui');
      } else {
        const saved = await erpCreate<any>('master_barangs', dbPayload);
        const mapped = mapDbToItem(saved);
        setBarangList([mapped, ...barangList]);
        setSelectedId(mapped.id);
        showFeedback('Data tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const toggleNotPrint = async (item: BarangItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !item.notPrint;
    setBarangList((prev) => prev.map((b) => (b.id === item.id ? { ...b, notPrint: nextVal } : b)));
    try {
      await erpUpdate('master_barangs', item.id, { not_print: nextVal });
      showFeedback('Status Not Print tersimpan');
    } catch (err: any) {
      showFeedback(`Gagal update: ${err.message}`);
    }
  };

  const filteredList = barangList.filter((item) => {
    if (filterSemua !== 'SEMUA-nya' && item.category.toUpperCase() !== filterSemua) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') return item.kode.toLowerCase().includes(term);
    if (searchField === 'Merk') return item.merk.toLowerCase().includes(term);
    return item.namaBarang.toLowerCase().includes(term);
  });

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Master_Barang',
      sheetTitle: 'LIST MASTER BARANG',
      subtitle: `Filter: ${filterSemua}`,
      companyProfile: company,
      columns: [
        { header: 'Kode', accessor: 'kode' },
        { header: 'Nama Barang', accessor: 'namaBarang' },
        { header: 'Unit', accessor: 'unit' },
        { header: 'Merk', accessor: 'merk' },
        { header: 'Category', accessor: 'category' },
        { header: 'Tipe', accessor: 'tipe' },
        { header: 'Stock', accessor: 'stock', align: 'right' },
        { header: 'Cost', accessor: 'cost', align: 'right' },
        { header: 'Price', accessor: 'price', align: 'right' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  return (
    <div
      id="master-barang-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden"
    >
      <FormHeaderBanner
        id="master-barang-banner"
        title="List Master Barang"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => setIsPrintOpen(true)}
        onTableView={loadData}
        onExportExcel={handleExportExcel}
      />

      <div
        id="master-barang-toolbar"
        className="flex items-center justify-between h-[52px] px-3 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans min-w-max overflow-x-auto"
      >
        <div className="flex items-center space-x-4">
          <FormActionButtons
            onSimpan={loadData}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleDelete}
            onPrint={() => setIsPrintOpen(true)}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />

          <div className="flex items-center space-x-2">
            <span className="font-bold text-[11px] text-black">Search :</span>

            <div className="relative">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="h-[24px] px-2 pr-6 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] font-sans font-medium text-black appearance-none outline-none cursor-pointer"
              >
                <option value="Description">Description</option>
                <option value="Kode">Kode</option>
                <option value="Merk">Merk</option>
              </select>
              <div className="absolute right-1 top-2 pointer-events-none text-[8px] text-black">▼</div>
            </div>

            <div className="w-[300px]">
              <input
                ref={searchInputRef}
                id="barang-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik untuk FIND..."
                className="w-full h-[24px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 text-[11px] font-sans outline-none focus:border-[#316AC5]"
              />
            </div>
          </div>
        </div>

        <div className="relative w-[170px] mr-2">
          <select
            value={filterSemua}
            onChange={(e) => setFilterSemua(e.target.value)}
            className="w-full h-[24px] bg-white border border-[#7F9DB9] text-[11px] px-2 pr-5 appearance-none outline-none font-sans focus:border-[#316AC5] cursor-pointer"
          >
            <option value="SEMUA-nya">SEMUA-nya</option>
            <option value="PRODUCT">PRODUCT</option>
            <option value="SERVICES">SERVICES</option>
          </select>
          <div className="absolute right-1 top-2 pointer-events-none text-[8px] text-black">▼</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-2 overflow-hidden bg-[#ECE9D8] min-h-[200px]">
        <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-white shadow-inner min-h-0">
          <div className="h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-bold text-black">
            List
          </div>

          <div className="flex-1 overflow-auto bg-[#F0EDE2]">
            <table className="min-w-[1350px] w-full border-collapse text-[11px] font-sans select-none">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                  <th className="w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                  <th className="w-[85px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">Kode</th>
                  <th className="w-[260px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px]">Nama Barang</th>
                  <th className="w-[50px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">Unit</th>
                  <th className="w-[80px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">Merk</th>
                  <th className="w-[85px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">Category</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">Tipe</th>
                  <th className="w-[60px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Stock</th>
                  <th className="w-[65px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Cost</th>
                  <th className="w-[85px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Price</th>
                  <th className="w-[45px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Disc</th>
                  <th className="w-[50px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Q.Min</th>
                  <th className="w-[55px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Qty.PO</th>
                  <th className="w-[55px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Qty.SO</th>
                  <th className="w-[60px] border-r border-[#ACA899] px-1 py-1 text-center font-bold text-[11px]">Not Print</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handleEdit}
                      className={`h-[20px] border-b border-[#D6D6D6] cursor-pointer text-black ${
                        isSelected ? 'bg-[#FFE600] font-semibold' : 'bg-[#FFFF00] hover:brightness-95'
                      }`}
                    >
                      <td className="w-[20px] border-r border-[#ACA899] text-center p-0 bg-[#ECE9D8]">
                        {isSelected ? <span className="text-[10px] font-bold leading-none inline-block">▶</span> : null}
                      </td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] font-mono whitespace-nowrap">{item.kode}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] uppercase tracking-tight whitespace-nowrap">{item.namaBarang}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">{item.unit}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">{item.merk}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">{item.category}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">{item.tipe}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">{fmtDot(item.stock)}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">{fmtDot(item.cost)}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">{fmtDot(item.price)}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">{fmtDot(item.disc)}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">{fmtDot(item.qMin)}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">{fmtDot(item.qtyPo)}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">{fmtDot(item.qtySo)}</td>
                      <td className="px-1 py-0.5 border-r border-[#ACA899] text-center">
                        <input
                          type="checkbox"
                          checked={item.notPrint}
                          onChange={() => {}}
                          onClick={(e) => toggleNotPrint(item, e)}
                          className="w-[12px] h-[12px] cursor-pointer align-middle"
                        />
                      </td>
                    </tr>
                  );
                })}

                {Array.from({ length: Math.max(0, 10 - filteredList.length) }).map((_, emptyIdx) => (
                  <tr key={`empty-${emptyIdx}`} className="h-[20px] bg-[#FFFF00] border-b border-[#D6D6D6]">
                    <td className="w-[20px] border-r border-[#ACA899] bg-[#ECE9D8]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                    <td className="border-r border-[#ACA899]" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 px-1 text-[11px] font-sans">
          <div className="w-[450px] h-[22px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 flex items-center text-gray-700">
            {selectedId ? `Barang Terpilih: ${barangList.find((b) => b.id === selectedId)?.namaBarang || '-'}` : ''}
          </div>

          <div className="flex items-center space-x-6 text-[12px] font-sans font-bold text-black pr-16">
            <span>Record</span>
            <span className="font-mono text-[13px]">{filteredList.length}</span>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="absolute inset-0 bg-black/25 flex items-center justify-center z-50 p-4">
          <div className="w-[460px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans">
            <div className="flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
              <span>{editingId ? 'Koreksi Data Master Barang' : 'Input Master Barang Baru'}</span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-[16px] h-[15px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="p-4 space-y-2.5 text-[11px] text-black">
              <div className="flex items-center space-x-3">
                <label className="w-[100px] font-bold">Kode Barang :</label>
                <input
                  type="text"
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value)}
                  className="w-[140px] h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono font-bold uppercase outline-none focus:border-[#316AC5]"
                  required
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[100px] font-bold">Nama Barang :</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: MITUTOYO, VERNIER CALIPER"
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <label className="w-[65px] font-bold">Unit :</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none cursor-pointer"
                  >
                    <option value="PCS">PCS</option>
                    <option value="SET">SET</option>
                    <option value="UNIT">UNIT</option>
                    <option value="BOX">BOX</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="w-[65px] font-bold">Category :</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none cursor-pointer"
                  >
                    <option value="PRODUCT">PRODUCT</option>
                    <option value="SERVICES">SERVICES</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <label className="w-[65px] font-bold">Merk :</label>
                  <input
                    type="text"
                    value={newMerk}
                    onChange={(e) => setNewMerk(e.target.value)}
                    className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="w-[65px] font-bold">Tipe :</label>
                  <input
                    type="text"
                    value={newTipe}
                    onChange={(e) => setNewTipe(e.target.value)}
                    className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Stock :</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Cost :</label>
                  <input
                    type="number"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Price :</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ACA899]">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] font-bold hover:bg-[#F2EFE2] cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] hover:bg-[#F2EFE2] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN DAFTAR MASTER BARANG"
        subtitle={`Kategori: ${filterSemua} | Total: ${filteredList.length} item`}
        orientation="landscape"
        columns={[
          { header: 'Kode', accessor: 'kode', width: '90px' },
          { header: 'Nama Barang', accessor: 'namaBarang' },
          { header: 'Unit', accessor: 'unit', width: '50px', align: 'center' },
          { header: 'Merk', accessor: 'merk', width: '90px' },
          { header: 'Kategori', accessor: 'category', width: '80px' },
          { header: 'Stock', accessor: (r) => formatMoney(r.stock), align: 'right', width: '60px' },
          { header: 'Cost', accessor: (r) => formatMoney(r.cost), align: 'right', width: '90px' },
          { header: 'Harga Jual', accessor: (r) => formatMoney(r.price), align: 'right', width: '95px' },
        ]}
        rows={filteredList}
      />
    </div>
  );
};
