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
  nextUniqueCode,
  parseNum,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';
import { ConfirmDialog } from './ConfirmDialog';
import {
  cascadeMasterRename,
  checkMasterUsage,
  isMissingColumnError,
} from '../lib/masterValidation';

const UNIT_OPTIONS = ['PCS', 'SET', 'UNIT', 'BOX', 'KG', 'MTR', 'LTR', 'ROLL', 'PACK', 'DUS', 'LSN'];

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
  isActive: boolean;
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
    isActive: r.is_active !== false,
  };
}

export const MasterBarangListForm: React.FC<MasterBarangListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [barangList, setBarangList] = useState<BarangItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [merkOptions, setMerkOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [filterSemua, setFilterSemua] = useState<string>('SEMUA-nya');
  const [isFindOpen, setIsFindOpen] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newUnit, setNewUnit] = useState('PCS');
  const [newMerk, setNewMerk] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTipe, setNewTipe] = useState('');
  const [newStock, setNewStock] = useState('0');
  const [newCost, setNewCost] = useState('0');
  const [newPrice, setNewPrice] = useState('0');
  const [newDisc, setNewDisc] = useState('0');
  const [newQMin, setNewQMin] = useState('0');
  const [newQtyPo, setNewQtyPo] = useState('0');
  const [newQtySo, setNewQtySo] = useState('0');
  const [newNotPrint, setNewNotPrint] = useState(false);
  const [newIsActive, setNewIsActive] = useState(true);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [includeNotPrint, setIncludeNotPrint] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadMasterReferences = async () => {
    const [catRes, merkRes, typeRes] = await Promise.allSettled([
      erpList<any>('master_categories', { orderBy: 'kode', asc: true, limit: 1000 }),
      erpList<any>('master_merks', { orderBy: 'nama_merk', asc: true, limit: 1000 }),
      erpList<any>('master_types', { orderBy: 'kode', asc: true, limit: 1000 }),
    ]);

    let loadedCats: string[] = [];
    if (catRes.status === 'fulfilled') {
      loadedCats = Array.from(
        new Set(
          catRes.value
            .map((c: any) => String(c.nama_kategori || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setCategoryOptions(loadedCats);
    }

    if (merkRes.status === 'fulfilled') {
      const loadedMerks = Array.from(
        new Set(
          merkRes.value
            .map((m: any) => String(m.nama_merk || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setMerkOptions(loadedMerks);
    }

    if (typeRes.status === 'fulfilled') {
      const loadedTypes = Array.from(
        new Set(
          typeRes.value
            .map((t: any) => String(t.nama_tipe || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setTypeOptions(loadedTypes);
    }

    return loadedCats;
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'kode',
    'Nama Barang': 'nama_barang',
    Merk: 'merk',
    Category: 'category',
    Tipe: 'tipe',
    Unit: 'unit',
  };

  const loadData = async (opts?: { field?: string; term?: string }): Promise<BarangItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = { orderBy: 'kode', asc: true, limit: 2000 };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'kode,nama_barang,unit,merk,category,tipe';
          queryOpts.searchVal = activeTerm;
        }
      }
      const [rows] = await Promise.all([
        erpList<any>('master_barangs', queryOpts),
        loadMasterReferences(),
      ]);
      const mapped = rows.map(mapDbToItem);
      setBarangList(mapped);
      if (mapped.length > 0 && !mapped.some((b) => b.id === selectedId)) {
        setSelectedId(mapped[0].id);
      } else if (mapped.length === 0) {
        setSelectedId('');
      }
      return mapped;
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarSimpan = async () => {
    const selected = barangList.find((b) => b.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record yang akan disimpan terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const basePayload = {
        kode: selected.kode.trim().toUpperCase(),
        nama_barang: selected.namaBarang.trim().toUpperCase(),
        unit: selected.unit.trim().toUpperCase() || 'PCS',
        merk: selected.merk.trim().toUpperCase(),
        category: selected.category.trim().toUpperCase(),
        tipe: selected.tipe.trim().toUpperCase(),
        stock: Number(selected.stock) || 0,
        cost: Number(selected.cost) || 0,
        price: Number(selected.price) || 0,
        disc: Number(selected.disc) || 0,
        q_min: Number(selected.qMin) || 0,
        qty_po: Number(selected.qtyPo) || 0,
        qty_so: Number(selected.qtySo) || 0,
        not_print: Boolean(selected.notPrint),
      };
      let saved: any;
      let usedFallback = false;
      try {
        saved = await erpUpdate<any>('master_barangs', selected.id, {
          ...basePayload,
          is_active: selected.isActive,
        });
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          saved = await erpUpdate<any>('master_barangs', selected.id, basePayload);
        } else {
          throw err;
        }
      }
      const mapped = mapDbToItem(saved);
      setBarangList((prev) => prev.map((b) => (b.id === selected.id ? mapped : b)));
      showFeedback(
        usedFallback
          ? `Barang [${mapped.kode}] tersimpan (jalankan SQL migrasi untuk kolom is_active)`
          : `Barang [${mapped.kode} - ${mapped.namaBarang}] tersimpan ke Supabase`
      );
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNew = async () => {
    setEditingId(null);
    setModalError(null);
    const nextCode = nextUniqueCode(barangList.map((b) => b.kode), '', 8);
    setNewKode(nextCode);
    setNewNama('');
    setNewUnit('PCS');
    setNewMerk('');
    setNewCategory(categoryOptions[0] || '');
    setNewTipe('');
    setNewStock('0');
    setNewCost('0');
    setNewPrice('0');
    setNewDisc('0');
    setNewQMin('0');
    setNewQtyPo('0');
    setNewQtySo('0');
    setNewNotPrint(false);
    setNewIsActive(true);
    setIsAddOpen(true);

    const freshCats = await loadMasterReferences();
    if (freshCats.length > 0) {
      setNewCategory((prev) => prev || freshCats[0]);
    }
  };

  const handleEdit = () => {
    const item = barangList.find((b) => b.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewKode(item.kode);
    setNewNama(item.namaBarang);
    setNewUnit(item.unit || 'PCS');
    setNewMerk(item.merk);
    setNewCategory(item.category || categoryOptions[0] || '');
    setNewTipe(item.tipe);
    setNewStock(String(item.stock));
    setNewCost(String(item.cost));
    setNewPrice(String(item.price));
    setNewDisc(String(item.disc ?? 0));
    setNewQMin(String(item.qMin ?? 0));
    setNewQtyPo(String(item.qtyPo ?? 0));
    setNewQtySo(String(item.qtySo ?? 0));
    setNewNotPrint(Boolean(item.notPrint));
    setNewIsActive(item.isActive !== false);
    setIsAddOpen(true);
    loadMasterReferences();
  };

  const handleRequestDelete = async () => {
    const item = barangList.find((b) => b.id === selectedId);
    if (!item) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    try {
      setIsBusy(true);
      const usageMsg = await checkMasterUsage([
        { table: 'purchase_request_details', label: 'Purchase Request', eq: { kode: item.kode } },
        { table: 'purchase_order_details', label: 'Purchase Order', eq: { kode: item.kode } },
        { table: 'pembelian_barang_details', label: 'Pembelian Barang', eq: { kode: item.kode } },
        { table: 'sales_order_details', label: 'Sales Order', eq: { kode: item.kode } },
        { table: 'faktur_penjualan_details', label: 'Faktur Penjualan', eq: { kode: item.kode } },
        { table: 'stock_awal', label: 'Stock Awal', eq: { kode: item.kode } },
      ]);
      if (usageMsg) {
        showFeedback(usageMsg);
        return;
      }
      setConfirmDeleteOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal cek referensi: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedId) return;
    try {
      setIsBusy(true);
      await erpDelete('master_barangs', selectedId);
      const updated = barangList.filter((b) => b.id !== selectedId);
      setBarangList(updated);
      setSelectedId(updated[0]?.id || '');
      setConfirmDeleteOpen(false);
      showFeedback('Data barang dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const cleanKode = newKode.trim().toUpperCase();
    const cleanNama = newNama.trim().toUpperCase();
    if (!cleanKode || !cleanNama) {
      setModalError('Kode Barang dan Nama Barang wajib diisi.');
      return;
    }
    if (barangList.some((b) => b.kode.toUpperCase() === cleanKode && b.id !== editingId)) {
      setModalError(`Kode Barang [${cleanKode}] sudah terdaftar. Gunakan kode lain.`);
      return;
    }
    const stockVal = parseNum(newStock);
    const costVal = parseNum(newCost);
    const priceVal = parseNum(newPrice);
    const discVal = parseNum(newDisc);
    const qMinVal = parseNum(newQMin);
    if (stockVal < 0 || costVal < 0 || priceVal < 0 || qMinVal < 0) {
      setModalError('Nilai Stock, Cost, Price, dan Q.Min tidak boleh negatif.');
      return;
    }
    if (discVal < 0 || discVal > 100) {
      setModalError('Discount harus berada di antara 0% sampai 100%.');
      return;
    }

    try {
      setIsBusy(true);
      const basePayload = {
        kode: cleanKode,
        nama_barang: cleanNama,
        unit: newUnit.trim().toUpperCase() || 'PCS',
        merk: newMerk.trim().toUpperCase(),
        category: newCategory.trim().toUpperCase(),
        tipe: newTipe.trim().toUpperCase(),
        stock: stockVal,
        cost: costVal,
        price: priceVal,
        disc: discVal,
        q_min: qMinVal,
        qty_po: parseNum(newQtyPo),
        qty_so: parseNum(newQtySo),
        not_print: newNotPrint,
      };
      const fullPayload = { ...basePayload, is_active: newIsActive };

      let saved: any;
      let usedFallback = false;
      const saveFn = async (payload: Record<string, any>) =>
        editingId
          ? erpUpdate<any>('master_barangs', editingId, payload)
          : erpCreate<any>('master_barangs', payload);

      try {
        saved = await saveFn(fullPayload);
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          saved = await saveFn(basePayload);
        } else {
          throw err;
        }
      }

      const mapped = mapDbToItem(saved);
      if (editingId) {
        const prevItem = barangList.find((b) => b.id === editingId);
        setBarangList((prev) =>
          prev
            .map((b) => (b.id === editingId ? mapped : b))
            .sort((a, b) => a.kode.localeCompare(b.kode))
        );
        if (prevItem && prevItem.namaBarang !== mapped.namaBarang) {
          await Promise.all([
            cascadeMasterRename('purchase_request_details', 'kode', mapped.kode, { nama_barang: mapped.namaBarang }),
            cascadeMasterRename('purchase_order_details', 'kode', mapped.kode, { nama_barang: mapped.namaBarang }),
            cascadeMasterRename('pembelian_barang_details', 'kode', mapped.kode, { nama_barang: mapped.namaBarang }),
            cascadeMasterRename('sales_order_details', 'kode', mapped.kode, { nama_barang: mapped.namaBarang }),
            cascadeMasterRename('faktur_penjualan_details', 'kode', mapped.kode, { nama_barang: mapped.namaBarang }),
          ]);
        }
        showFeedback(
          usedFallback
            ? 'Data diperbarui (jalankan SQL migrasi untuk kolom is_active)'
            : 'Data diperbarui'
        );
      } else {
        setBarangList((prev) => [mapped, ...prev].sort((a, b) => a.kode.localeCompare(b.kode)));
        setSelectedId(mapped.id);
        showFeedback(
          usedFallback
            ? 'Data tersimpan (jalankan SQL migrasi untuk kolom is_active)'
            : 'Data tersimpan'
        );
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan data ke database';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
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
    if (searchField === 'Kode') return matchesMultiKeyword([item.kode], searchTerm);
    if (searchField === 'Nama Barang') return matchesMultiKeyword([item.namaBarang], searchTerm);
    if (searchField === 'Merk') return matchesMultiKeyword([item.merk], searchTerm);
    if (searchField === 'Category') return matchesMultiKeyword([item.category], searchTerm);
    if (searchField === 'Tipe') return matchesMultiKeyword([item.tipe], searchTerm);
    if (searchField === 'Unit') return matchesMultiKeyword([item.unit], searchTerm);
    return matchesMultiKeyword(
      [item.kode, item.namaBarang, item.unit, item.merk, item.category, item.tipe],
      searchTerm
    );
  });

  const selectedBarang =
    filteredList.find((b) => b.id === selectedId) ||
    barangList.find((b) => b.id === selectedId) ||
    null;

  const printableList = includeNotPrint
    ? filteredList
    : filteredList.filter((b) => !b.notPrint);

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Master_Barang',
      sheetTitle: 'LIST MASTER BARANG',
      subtitle: `Filter: ${filterSemua}${includeNotPrint ? ' (Termasuk Not Print)' : ''}`,
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
        { header: 'Disc (%)', accessor: 'disc', align: 'right' },
        { header: 'Q.Min', accessor: 'qMin', align: 'right' },
        { header: 'Qty.PO', accessor: 'qtyPo', align: 'right' },
        { header: 'Qty.SO', accessor: 'qtySo', align: 'right' },
        { header: 'Aktif', accessor: (r) => (r.isActive ? 'YA' : 'NON-AKTIF') },
      ],
      rows: printableList,
    });
    showFeedback('Export Excel selesai');
  };

  const handleToolbarCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows) {
      showFeedback(
        searchTerm.trim()
          ? `Ditemukan ${rows.length} barang dari Supabase`
          : `Menampilkan ${rows.length} barang dari Supabase`
      );
    }
  };

  const handleToolbarReset = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setFilterSemua('SEMUA-nya');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} barang)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  const allCategoryChoices = Array.from(
    new Set([
      ...categoryOptions,
      ...barangList.map((b) => b.category.trim().toUpperCase()).filter(Boolean),
    ])
  );
  const modalCategoryChoices = Array.from(
    new Set([
      ...categoryOptions,
      ...(newCategory.trim() ? [newCategory.trim().toUpperCase()] : []),
    ])
  );
  const modalMerkChoices = Array.from(
    new Set([
      ...merkOptions,
      ...(newMerk.trim() ? [newMerk.trim().toUpperCase()] : []),
    ])
  );
  const modalTypeChoices = Array.from(
    new Set([
      ...typeOptions,
      ...(newTipe.trim() ? [newTipe.trim().toUpperCase()] : []),
    ])
  );
  const namaBarangSuggestions = Array.from(
    new Set(barangList.map((b) => b.namaBarang.trim().toUpperCase()).filter(Boolean))
  );

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
        className="flex items-center justify-between gap-2 h-[52px] px-3 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans overflow-x-auto"
      >
        <div className="flex items-center space-x-3 shrink-0">
          <FormActionButtons
            onSimpan={handleToolbarSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleRequestDelete}
            onPrint={() => setIsPrintOpen(true)}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <ToolbarSearchControl
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onCari={handleToolbarCari}
            onReset={handleToolbarReset}
            inputRef={searchInputRef}
            isBusy={isBusy}
            inputWidthClass="w-[185px]"
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode' },
              { value: 'Nama Barang', label: 'Nama Barang' },
              { value: 'Merk', label: 'Merk' },
              { value: 'Category', label: 'Category' },
              { value: 'Tipe', label: 'Tipe' },
              { value: 'Unit', label: 'Unit' },
            ]}
          />

          <div className="relative w-[145px] shrink-0">
            <select
              value={filterSemua}
              onChange={(e) => setFilterSemua(e.target.value)}
              className="w-full h-[24px] bg-white border border-[#7F9DB9] text-[11px] px-2 pr-5 appearance-none outline-none font-sans focus:border-[#316AC5] cursor-pointer"
            >
              <option value="SEMUA-nya">SEMUA-nya</option>
              {allCategoryChoices.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="absolute right-1 top-2 pointer-events-none text-[8px] text-black">▼</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-2 overflow-hidden bg-[#ECE9D8] min-h-[200px]">
        <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-white shadow-inner min-h-0">
          <div className="h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-bold text-black">
            List
          </div>

          <div className="flex-1 overflow-auto bg-white">
            <table className="min-w-[1380px] w-full border-collapse text-[11px] font-sans select-none">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                  <th className="w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                  <th className="w-[85px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">Kode</th>
                  <th className="w-[260px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px]">Nama Barang</th>
                  <th className="w-[50px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">Unit</th>
                  <th className="w-[80px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">Merk</th>
                  <th className="w-[85px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">Category</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">Tipe</th>
                  <th className="w-[65px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Stock</th>
                  <th className="w-[75px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Cost</th>
                  <th className="w-[85px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Price</th>
                  <th className="w-[45px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Disc</th>
                  <th className="w-[50px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Q.Min</th>
                  <th className="w-[55px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Qty.PO</th>
                  <th className="w-[55px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">Qty.SO</th>
                  <th className="w-[60px] border-r border-[#ACA899] px-1 py-1 text-center font-bold text-[11px]">Not Print</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const isSelected = selectedId === item.id;
                  const isLowStock = item.qMin > 0 && item.stock <= item.qMin;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handleEdit}
                      className={`h-[21px] border-b border-[#D6D6D6] cursor-pointer ${
                        isSelected
                          ? 'bg-[#316AC5] text-white font-semibold'
                          : !item.isActive
                          ? 'bg-[#F3F3F3] text-gray-500 hover:bg-[#EAF2FC]'
                          : isLowStock
                          ? 'bg-[#FFF4E5] text-black hover:bg-[#FFE6C7]'
                          : idx % 2 === 0
                          ? 'bg-white text-black hover:bg-[#EAF2FC]'
                          : 'bg-[#F9FAFC] text-black hover:bg-[#EAF2FC]'
                      }`}
                    >
                      <td className="w-[20px] border-r border-[#ACA899] text-center p-0 bg-[#ECE9D8] text-black">
                        {isSelected ? <span className="text-[10px] font-bold leading-none inline-block">▶</span> : null}
                      </td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] font-mono whitespace-nowrap">{item.kode}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] uppercase tracking-tight whitespace-nowrap">
                        {item.namaBarang}
                        {!item.isActive && (
                          <span className={`ml-1.5 text-[9px] px-1 border ${isSelected ? 'border-white/70 text-white' : 'border-gray-400 text-gray-600'}`}>
                            NON-AKTIF
                          </span>
                        )}
                      </td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">{item.unit}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">{item.merk}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">{item.category}</td>
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">{item.tipe}</td>
                      <td
                        title={isLowStock ? `Stock <= Q.Min (${item.qMin})` : undefined}
                        className={`px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono ${
                          isLowStock && !isSelected ? 'text-[#C00000] font-bold' : ''
                        }`}
                      >
                        {isLowStock ? '⚠ ' : ''}
                        {fmtDot(item.stock)}
                      </td>
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

                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={15} className="text-center py-6 text-gray-500 italic bg-white">
                      Tidak ada data Master Barang yang cocok.
                    </td>
                  </tr>
                )}
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
          <div className="w-[480px] max-w-[95vw] max-h-[90vh] flex flex-col bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans overflow-hidden">
            <div className="flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold shrink-0">
              <span>{editingId ? 'Koreksi Data Master Barang' : 'Input Master Barang Baru'}</span>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsAddOpen(false);
                }}
                className="w-[16px] h-[15px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-2.5 text-[11px] text-black overflow-y-auto">
              <div className="flex items-center space-x-3">
                <label className="w-[100px] shrink-0 font-bold">Kode Barang :</label>
                <input
                  type="text"
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value)}
                  className="w-[140px] h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono font-bold uppercase outline-none focus:border-[#316AC5]"
                  required
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[100px] shrink-0 font-bold">Nama Barang :</label>
                <input
                  type="text"
                  list="master-barang-nama-list"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Pilih / ketik Nama Barang"
                  className="flex-1 min-w-0 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                  required
                  autoFocus
                />
                <datalist id="master-barang-nama-list">
                  {namaBarangSuggestions.map((nama) => (
                    <option key={nama} value={nama} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <label className="w-[65px] shrink-0 font-bold">Unit :</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="flex-1 min-w-0 h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none cursor-pointer"
                  >
                    {Array.from(
                      new Set([...UNIT_OPTIONS, newUnit.trim().toUpperCase()].filter(Boolean))
                    ).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2 min-w-0">
                  <label className="w-[65px] shrink-0 font-bold">Category :</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 min-w-0 h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Category --</option>
                    {modalCategoryChoices.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <label className="w-[65px] shrink-0 font-bold">Merk :</label>
                  <select
                    value={newMerk}
                    onChange={(e) => setNewMerk(e.target.value)}
                    className="flex-1 min-w-0 h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Merk --</option>
                    {modalMerkChoices.map((merk) => (
                      <option key={merk} value={merk}>
                        {merk}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2 min-w-0">
                  <label className="w-[65px] shrink-0 font-bold">Tipe :</label>
                  <select
                    value={newTipe}
                    onChange={(e) => setNewTipe(e.target.value)}
                    className="flex-1 min-w-0 h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Tipe --</option>
                    {modalTypeChoices.map((tipe) => (
                      <option key={tipe} value={tipe}>
                        {tipe}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">
                    Stock {editingId ? <span className="text-[9px] font-normal text-gray-600">(Auto transaksi)</span> : ':'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    readOnly={Boolean(editingId)}
                    title={editingId ? 'Stock dihitung otomatis dari Stock Awal & Transaksi Pembelian/Penjualan/Mutasi' : undefined}
                    className={`w-full h-[22px] border border-[#7F9DB9] px-2 font-mono text-right ${
                      editingId ? 'bg-[#ECE9D8] text-gray-600 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Cost :</label>
                  <input
                    type="number"
                    min="0"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Price :</label>
                  <input
                    type="number"
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Disc (%) :</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newDisc}
                    onChange={(e) => setNewDisc(e.target.value)}
                    className="w-full h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Q.Min :</label>
                  <input
                    type="number"
                    min="0"
                    value={newQMin}
                    onChange={(e) => setNewQMin(e.target.value)}
                    className="w-full h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Qty.PO <span className="text-[9px] font-normal text-gray-600">(Auto)</span>:</label>
                  <input
                    type="number"
                    value={newQtyPo}
                    readOnly
                    title="Otomatis disinkronkan dari outstanding Purchase Order"
                    className="w-full h-[22px] bg-[#ECE9D8] text-gray-600 cursor-not-allowed border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Qty.SO <span className="text-[9px] font-normal text-gray-600">(Auto)</span>:</label>
                  <input
                    type="number"
                    value={newQtySo}
                    readOnly
                    title="Otomatis disinkronkan dari outstanding Sales Order"
                    className="w-full h-[22px] bg-[#ECE9D8] text-gray-600 cursor-not-allowed border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-0.5">
                <label htmlFor="master-barang-not-print" className="flex items-center space-x-1.5 font-bold cursor-pointer">
                  <input
                    id="master-barang-not-print"
                    type="checkbox"
                    checked={newNotPrint}
                    onChange={(e) => setNewNotPrint(e.target.checked)}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Not Print (Sembunyikan di cetak daftar)</span>
                </label>
                <label htmlFor="master-barang-is-active" className="flex items-center space-x-1.5 font-bold cursor-pointer">
                  <input
                    id="master-barang-is-active"
                    type="checkbox"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Barang Aktif</span>
                </label>
              </div>

              {modalError && (
                <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                  ⚠ {modalError}
                </div>
              )}

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
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] hover:bg-[#F2EFE2] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Master Barang"
        rows={barangList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [r.kode, r.namaBarang, r.unit, r.merk, r.category, r.tipe]}
        initialQuery={searchTerm}
        isBusy={isBusy}
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
        onSelectRow={(row, q) => {
          setSelectedId(row.id);
          setSearchTerm(q);
          showFeedback(`Barang [${row.kode} - ${row.namaBarang}] dipilih`);
        }}
        columns={[
          { header: 'Kode', accessor: (r) => r.kode, widthClass: 'w-24', mono: true, bold: true },
          { header: 'Nama Barang', accessor: (r) => r.namaBarang, bold: true },
          { header: 'Unit', accessor: (r) => r.unit, widthClass: 'w-14', align: 'center' },
          { header: 'Merk', accessor: (r) => r.merk || '-', widthClass: 'w-24' },
          { header: 'Category', accessor: (r) => r.category || '-', widthClass: 'w-24' },
          { header: 'Tipe', accessor: (r) => r.tipe || '-', widthClass: 'w-24' },
          { header: 'Stock', accessor: (r) => formatMoney(r.stock), widthClass: 'w-16', align: 'right', mono: true },
          { header: 'Price', accessor: (r) => formatMoney(r.price), widthClass: 'w-24', align: 'right', mono: true },
        ]}
      />

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Konfirmasi Hapus Master Barang"
        message={`Yakin ingin menghapus Barang [${selectedBarang?.kode || ''} - ${selectedBarang?.namaBarang || ''}]?`}
        detail="Data yang sudah dihapus tidak dapat dikembalikan."
        isBusy={isBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN DAFTAR MASTER BARANG"
        subtitle={`Kategori: ${filterSemua} | Total: ${printableList.length} item${includeNotPrint ? ' (Termasuk Not Print)' : ''}`}
        orientation="landscape"
        toolbarExtra={
          <label className="flex items-center gap-1.5 text-[11px] bg-white/95 text-black px-2 py-0.5 rounded-[2px] cursor-pointer">
            <input
              type="checkbox"
              checked={includeNotPrint}
              onChange={(e) => setIncludeNotPrint(e.target.checked)}
              className="w-3.5 h-3.5 cursor-pointer"
            />
            <span>Sertakan Not Print</span>
          </label>
        }
        columns={[
          { header: 'Kode', accessor: 'kode', width: '78px' },
          { header: 'Nama Barang', accessor: 'namaBarang' },
          { header: 'Unit', accessor: 'unit', width: '44px', align: 'center' },
          { header: 'Merk', accessor: 'merk', width: '72px' },
          { header: 'Kategori', accessor: 'category', width: '72px' },
          { header: 'Stock', accessor: (r) => formatMoney(r.stock), align: 'right', width: '54px' },
          { header: 'Q.Min', accessor: (r) => formatMoney(r.qMin), align: 'right', width: '48px' },
          { header: 'Qty.PO', accessor: (r) => formatMoney(r.qtyPo), align: 'right', width: '52px' },
          { header: 'Qty.SO', accessor: (r) => formatMoney(r.qtySo), align: 'right', width: '52px' },
          { header: 'Cost', accessor: (r) => formatMoney(r.cost), align: 'right', width: '78px' },
          { header: 'Disc%', accessor: (r) => `${r.disc}%`, align: 'right', width: '45px' },
          { header: 'Harga Jual', accessor: (r) => formatMoney(r.price), align: 'right', width: '82px' },
        ]}
        rows={printableList}
        selectedRow={selectedBarang}
        selectedTitle="DETAIL DATA MASTER BARANG"
        selectedSubtitle={selectedBarang ? `Kode: ${selectedBarang.kode} - ${selectedBarang.namaBarang}` : undefined}
        selectedMetaLines={
          selectedBarang
            ? [
                { label: 'Kode Barang', value: selectedBarang.kode },
                { label: 'Nama Barang', value: selectedBarang.namaBarang },
                { label: 'Merk / Kategori', value: [selectedBarang.merk, selectedBarang.category].filter(Boolean).join(' / ') || '-' },
                { label: 'Tipe / Unit', value: [selectedBarang.tipe, selectedBarang.unit].filter(Boolean).join(' / ') || '-' },
                { label: 'Qty.PO / Qty.SO', value: `${formatMoney(selectedBarang.qtyPo)} / ${formatMoney(selectedBarang.qtySo)}` },
                { label: 'Disc / Q.Min', value: `${selectedBarang.disc}% / ${formatMoney(selectedBarang.qMin)}` },
              ]
            : undefined
        }
        selectedSummaryItems={
          selectedBarang
            ? [
                { label: 'Stock Tersedia', value: `${formatMoney(selectedBarang.stock)} ${selectedBarang.unit}` },
                { label: 'Harga Jual', value: formatMoney(selectedBarang.price) },
              ]
            : undefined
        }
      />
    </div>
  );
};
