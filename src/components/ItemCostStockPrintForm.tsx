import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';
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
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangCodes, setBarangCodes] = useState<string[]>([]);

  // Live Supabase table + Search state
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add / Koreksi Modal for master_barangs
  const [isCrudOpen, setIsCrudOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKode, setFormKode] = useState<string>('');
  const [formNama, setFormNama] = useState<string>('');
  const [formUnit, setFormUnit] = useState<string>('PCS');
  const [formMerk, setFormMerk] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('PRODUCT');
  const [formTipe, setFormTipe] = useState<string>('');
  const [formStock, setFormStock] = useState<string>('0');
  const [formCost, setFormCost] = useState<string>('0');
  const [formPrice, setFormPrice] = useState<string>('0');
  const [formDisc, setFormDisc] = useState<string>('0');
  const [formQMin, setFormQMin] = useState<string>('0');
  const [formQtyPo, setFormQtyPo] = useState<string>('0');
  const [formQtySo, setFormQtySo] = useState<string>('0');
  const [formNotPrint, setFormNotPrint] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<any | null>(null);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printScopeOnOpen, setPrintScopeOnOpen] = useState<'selected' | 'all'>('all');
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadLiveRows = async (opts?: {
    field?: string;
    term?: string;
    skipSearch?: boolean;
  }): Promise<any[]> => {
    const activeField = opts?.field ?? searchField;
    const activeTerm = opts?.skipSearch ? '' : (opts?.term ?? searchTerm).trim();
    const SEARCH_COL_MAP: Record<string, string> = {
      Kode: 'kode',
      'Nama Barang': 'nama_barang',
      Merk: 'merk',
      Category: 'category',
    };
    const queryOpts: Record<string, any> = { orderBy: 'kode', asc: true };
    if (activeTerm) {
      if (activeField !== 'Semua' && SEARCH_COL_MAP[activeField]) {
        queryOpts.searchCol = SEARCH_COL_MAP[activeField];
        queryOpts.searchVal = activeTerm;
      } else {
        queryOpts.orSearch = 'kode,nama_barang,merk,category,tipe,unit';
        queryOpts.searchVal = activeTerm;
      }
    }

    const [barangs, stockAwals] = await Promise.all([
      erpList<any>('master_barangs', queryOpts),
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
        tipe: b.tipe || '',
        satuan: b.unit || 'PCS',
        lokasi: sa?.lokasi || '01 - OFFICE',
        hpp,
        harga_jual: hargaJual,
        disc: Number(b.disc || 0),
        q_min: Number(b.q_min || 0),
        qty_po: Number(b.qty_po || 0),
        qty_so: Number(b.qty_so || 0),
        not_print: Boolean(b.not_print),
        stock_master: Number(b.stock || 0),
        stock_bagus: stockBagus,
        stock_rusak: stockRusak,
        total_cost: hpp * stockBagus,
      };
    });

    if (!activeTerm) {
      setBarangCodes(mapped.map((m) => m.kode_barang).filter(Boolean));
    }
    setTableRows(mapped);
    if (mapped.length > 0 && !mapped.some((m) => m.id === selectedId)) {
      setSelectedId(mapped[0].id);
    } else if (mapped.length === 0) {
      setSelectedId('');
    }
    return mapped;
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      try {
        setIsBusy(true);
        const [merks, cats, types, lokasis] = await Promise.all([
          erpList<any>('master_merks', { orderBy: 'nama_merk', asc: true }).catch(() => []),
          erpList<any>('master_categories', { orderBy: 'nama_kategori', asc: true }).catch(() => []),
          erpList<any>('master_types', { orderBy: 'nama_tipe', asc: true }).catch(() => []),
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setMerkOptions(merks.map((m) => m.nama_merk || '').filter(Boolean));
        setCategoryOptions(cats.map((c) => c.nama_kategori || '').filter(Boolean));
        setTypeOptions(types.map((t) => t.nama_tipe || '').filter(Boolean));
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
      if (searchField === 'Kode') return matchesMultiKeyword([r.kode_barang], searchTerm);
      if (searchField === 'Nama Barang') return matchesMultiKeyword([r.nama_barang], searchTerm);
      if (searchField === 'Merk') return matchesMultiKeyword([r.merk], searchTerm);
      if (searchField === 'Category') return matchesMultiKeyword([r.category], searchTerm);
      return matchesMultiKeyword(
        [r.kode_barang, r.nama_barang, r.merk, r.category, r.tipe, r.satuan, r.lokasi],
        searchTerm
      );
    }
    return true;
  });

  const selectedTableRow =
    filteredTableRows.find((r) => r.id === selectedId) ||
    tableRows.find((r) => r.id === selectedId) ||
    null;

  const handleBaru = () => {
    setEditingId(null);
    setModalError(null);
    setFormKode(nextUniqueCode(tableRows.map((r) => r.kode_barang), '', 8));
    setFormNama('');
    setFormUnit('PCS');
    setFormMerk(merkFilter || '');
    setFormCategory(categoryOptions[0] || 'PRODUCT');
    setFormTipe('');
    setFormStock('0');
    setFormCost('0');
    setFormPrice('0');
    setFormDisc('0');
    setFormQMin('0');
    setFormQtyPo('0');
    setFormQtySo('0');
    setFormNotPrint(false);
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
    setFormTipe(current.tipe || '');
    setFormStock(String(current.stock_master ?? current.stock_bagus ?? 0));
    setFormCost(String(current.hpp || 0));
    setFormPrice(String(current.harga_jual || 0));
    setFormDisc(String(current.disc ?? 0));
    setFormQMin(String(current.q_min ?? 0));
    setFormQtyPo(String(current.qty_po ?? 0));
    setFormQtySo(String(current.qty_so ?? 0));
    setFormNotPrint(Boolean(current.not_print));
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
        tipe: formTipe.trim().toUpperCase(),
        stock: parseNum(formStock),
        cost: parseNum(formCost),
        price: parseNum(formPrice),
        disc: parseNum(formDisc),
        q_min: parseNum(formQMin),
        qty_po: parseNum(formQtyPo),
        qty_so: parseNum(formQtySo),
        not_print: formNotPrint,
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
      if (confirmDeleteRow.id === selectedId) setSelectedId('');
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
    const selected = selectedTableRow;
    if (!selected) {
      showFeedback('Pilih baris item barang terlebih dahulu untuk disimpan');
      return;
    }
    try {
      setIsBusy(true);
      await erpUpdate('master_barangs', selected.id, {
        kode: selected.kode_barang,
        nama_barang: selected.nama_barang,
        unit: selected.satuan || 'PCS',
        merk: selected.merk,
        category: selected.category,
        tipe: selected.tipe,
        stock: Number(selected.stock_master ?? selected.stock_bagus ?? 0),
        cost: Number(selected.hpp || 0),
        price: Number(selected.harga_jual || 0),
        disc: Number(selected.disc || 0),
        q_min: Number(selected.q_min || 0),
        qty_po: Number(selected.qty_po || 0),
        qty_so: Number(selected.qty_so || 0),
        not_print: Boolean(selected.not_print),
      });
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
      showFeedback(`Data Item Cost & Stock [${selected.kode_barang}] tersimpan ke Supabase`);
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    try {
      setIsBusy(true);
      await loadLiveRows({ skipSearch: true });
    } catch (err: any) {
      showFeedback(`Gagal muat: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarCari = async () => {
    try {
      setIsBusy(true);
      const res = await loadLiveRows({ field: searchField, term: searchTerm });
      showFeedback(
        searchTerm.trim()
          ? `Hasil cari Supabase: ${res.length} item ditemukan`
          : `Data dimuat ulang (${res.length} item)`
      );
    } catch (err: any) {
      showFeedback(`Gagal mencari: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarReset = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    try {
      setIsBusy(true);
      await loadLiveRows({ field: 'Semua', term: '' });
      showFeedback('Filter pencarian direset');
    } catch (err: any) {
      showFeedback(`Gagal reset: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const fresh = await loadLiveRows({ skipSearch: true });
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
      setPrintScopeOnOpen('all');
      const data = await fetchReportData();
      setPreviewRows(data);
      setIsPrintOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal memuat laporan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrintSelected = async () => {
    if (!selectedTableRow) {
      showFeedback('Pilih baris item barang yang akan dicetak terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      setPrintScopeOnOpen('selected');
      const data = await fetchReportData().catch(() => filteredTableRows);
      setPreviewRows(data.length > 0 ? data : filteredTableRows);
      setIsPrintOpen(true);
    } catch {
      setPreviewRows(filteredTableRows);
      setIsPrintOpen(true);
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
        onPrint={handlePrintSelected}
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
              onPrint={handlePrintSelected}
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
            <div className="flex items-center">
              <ToolbarSearchControl
                compact
                searchField={searchField}
                onSearchFieldChange={setSearchField}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onCari={handleToolbarCari}
                onReset={handleToolbarReset}
                options={[
                  { value: 'Semua', label: 'Semua Kolom' },
                  { value: 'Kode', label: 'Kode' },
                  { value: 'Nama Barang', label: 'Nama Barang' },
                  { value: 'Merk', label: 'Merk' },
                  { value: 'Category', label: 'Category' },
                ]}
                inputRef={searchInputRef}
                isBusy={isBusy}
                placeholder="Cari Kode Barang, Nama Barang, Merk, Category..."
              />
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
                          setFormTipe(r.tipe || '');
                          setFormStock(String(r.stock_master ?? r.stock_bagus ?? 0));
                          setFormCost(String(r.hpp || 0));
                          setFormPrice(String(r.harga_jual || 0));
                          setFormDisc(String(r.disc ?? 0));
                          setFormQMin(String(r.q_min ?? 0));
                          setFormQtyPo(String(r.qty_po ?? 0));
                          setFormQtySo(String(r.qty_so ?? 0));
                          setFormNotPrint(Boolean(r.not_print));
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
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[500px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden text-xs">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 flex justify-between items-center font-bold shrink-0">
              <span>{editingId ? 'Koreksi Item Cost & Stock' : 'Tambah Item Cost & Stock Baru'}</span>
              <button
                type="button"
                onClick={() => setIsCrudOpen(false)}
                className="w-5 h-5 bg-[#C00000] text-white font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form noValidate onSubmit={handleSaveCrud} className="p-3 space-y-2 text-[11px] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Satuan (Unit)</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Category</label>
                  <input
                    type="text"
                    list="item-cost-category-list"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                  <datalist id="item-cost-category-list">
                    {categoryOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                  <label className="block font-bold mb-0.5">Tipe</label>
                  <input
                    type="text"
                    list="item-cost-type-list"
                    value={formTipe}
                    onChange={(e) => setFormTipe(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                  <datalist id="item-cost-type-list">
                    {typeOptions.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
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
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Disc (%)</label>
                  <input
                    type="number"
                    value={formDisc}
                    onChange={(e) => setFormDisc(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Q.Min</label>
                  <input
                    type="number"
                    value={formQMin}
                    onChange={(e) => setFormQMin(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Qty.PO</label>
                  <input
                    type="number"
                    value={formQtyPo}
                    onChange={(e) => setFormQtyPo(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Qty.SO</label>
                  <input
                    type="number"
                    value={formQtySo}
                    onChange={(e) => setFormQtySo(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-0.5">
                <input
                  id="item-cost-not-print"
                  type="checkbox"
                  checked={formNotPrint}
                  onChange={(e) => setFormNotPrint(e.target.checked)}
                  className="w-3.5 h-3.5 cursor-pointer"
                />
                <label htmlFor="item-cost-not-print" className="font-bold cursor-pointer">
                  Not Print (Jangan tampilkan pada cetak daftar harga)
                </label>
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

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Item Cost & Stock"
        rows={tableRows}
        columns={[
          { header: 'Kode Brg', accessor: (r) => r.kode_barang, mono: true, bold: true },
          { header: 'Nama Barang', accessor: (r) => r.nama_barang },
          { header: 'Merk', accessor: (r) => r.merk || '-' },
          { header: 'Sat', accessor: (r) => r.satuan, align: 'center' },
          { header: 'HPP (Rp)', accessor: (r) => formatMoney(r.hpp), align: 'right', mono: true },
          { header: 'Bagus', accessor: (r) => formatMoney(r.stock_bagus), align: 'right', mono: true },
          { header: 'Total Cost', accessor: (r) => formatMoney(r.total_cost), align: 'right', mono: true, bold: true },
        ]}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.kode_barang,
          r.nama_barang,
          r.merk,
          r.category,
          r.tipe,
          r.satuan,
          r.lokasi,
        ]}
        selectedId={selectedId}
        onSelectRow={(r) => {
          setSelectedId(r.id);
          showFeedback(`Item [${r.kode_barang}] dipilih`);
        }}
        onSearchSupabase={(q) => loadLiveRows({ field: 'Semua', term: q })}
        onRefreshSupabase={() => loadLiveRows({ field: 'Semua', term: '' })}
        isBusy={isBusy}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={bentukLaporan.toUpperCase()}
        subtitle={`Periode: ${tglStart} s/d ${tglEnd}`}
        orientation="landscape"
        defaultPrintScope={printScopeOnOpen}
        selectedRow={selectedTableRow}
        selectedTitle="CETAK DATA ITEM COST & STOCK"
        selectedSubtitle={
          selectedTableRow
            ? `Kode: ${selectedTableRow.kode_barang} — ${selectedTableRow.nama_barang}`
            : undefined
        }
        selectedMetaLines={
          selectedTableRow
            ? [
                { label: 'Kode Barang', value: selectedTableRow.kode_barang },
                { label: 'Nama Barang', value: selectedTableRow.nama_barang },
                { label: 'Merk / Category', value: `${selectedTableRow.merk || '-'} / ${selectedTableRow.category || '-'}` },
                { label: 'Lokasi Stock', value: selectedTableRow.lokasi || lokasiStock },
              ]
            : undefined
        }
        selectedSummaryItems={
          selectedTableRow
            ? [
                { label: 'Stock Bagus', value: formatMoney(selectedTableRow.stock_bagus) },
                { label: 'HPP (Rp)', value: formatRupiah(selectedTableRow.hpp) },
                { label: 'Total Cost', value: formatRupiah(selectedTableRow.total_cost) },
              ]
            : undefined
        }
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
