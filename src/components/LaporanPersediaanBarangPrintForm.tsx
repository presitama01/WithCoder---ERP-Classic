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

interface LaporanPersediaanBarangPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MerkOption {
  label: string;
  code: string;
  name: string;
}

export const LaporanPersediaanBarangPrintForm: React.FC<
  LaporanPersediaanBarangPrintFormProps
> = ({ isOpen, onClose }) => {
  const [bulan, setBulan] = useState<string>('08-2026');
  const [tglStart, setTglStart] = useState<string>('01-08-2026');
  const [tglEnd, setTglEnd] = useState<string>('31-08-2026');
  const [filterType, setFilterType] = useState<
    'merk' | 'batasan_kode' | 'kode_barang' | 'all'
  >('merk');
  const [selectedMerk, setSelectedMerk] = useState<string>('');
  const [merkCode, setMerkCode] = useState<string>('');
  const [merkName, setMerkName] = useState<string>('');
  const [kodeBarangInput, setKodeBarangInput] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>(
    '01 - Laporan Persediaan Barang'
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [merkOptions, setMerkOptions] = useState<MerkOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangCodes, setBarangCodes] = useState<string[]>([]);

  // Live Supabase table (master_barangs + stock_awal) & Search state
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
  const [formCategory, setFormCategory] = useState<string>('PRODUCT');
  const [formMerk, setFormMerk] = useState<string>('');
  const [formTipe, setFormTipe] = useState<string>('');
  const [formUnit, setFormUnit] = useState<string>('PCS');
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

    const saMap = new Map<
      string,
      { bagus: number; rusak: number; hpp: number; lokasi: string }
    >();
    for (const sa of stockAwals) {
      if (lokasiStock !== 'ALL' && sa.lokasi && sa.lokasi !== lokasiStock) continue;
      const k = (sa.item_code || '').toUpperCase();
      const prev = saMap.get(k) || {
        bagus: 0,
        rusak: 0,
        hpp: Number(sa.hpp || 0),
        lokasi: sa.lokasi || '01 - OFFICE',
      };
      saMap.set(k, {
        bagus: prev.bagus + Number(sa.stock_bagus || 0),
        rusak: prev.rusak + Number(sa.stock_rusak || 0),
        hpp: Number(sa.hpp || prev.hpp || 0),
        lokasi: sa.lokasi || prev.lokasi,
      });
    }

    const mapped = barangs.map((b) => {
      const code = (b.kode || '').toUpperCase();
      const sa = saMap.get(code);
      const stockBagus = sa ? sa.bagus : Number(b.stock || 0);
      const stockRusak = sa ? sa.rusak : 0;
      const hpp = Number(b.cost || sa?.hpp || 0);
      return {
        id: String(b.id),
        kode_barang: b.kode || '',
        nama_barang: b.nama_barang || '',
        category: b.category || '',
        merk: b.merk || '',
        tipe: b.tipe || '',
        satuan: b.unit || 'PCS',
        lokasi: sa?.lokasi || '01 - OFFICE',
        stock_master: Number(b.stock || 0),
        harga_jual: Number(b.price || 0),
        disc: Number(b.disc || 0),
        q_min: Number(b.q_min || 0),
        qty_po: Number(b.qty_po || 0),
        qty_so: Number(b.qty_so || 0),
        not_print: Boolean(b.not_print),
        hpp,
        stock_bagus: stockBagus,
        stock_rusak: stockRusak,
        nilai_persediaan: hpp * stockBagus,
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
        const [merks, cats, types, lokasis] = await Promise.all([
          erpList<any>('master_merks', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_categories', { orderBy: 'nama_kategori', asc: true }).catch(() => []),
          erpList<any>('master_types', { orderBy: 'nama_tipe', asc: true }).catch(() => []),
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setMerkOptions(
          merks.map((m) => ({
            label: `${m.kode} - ${m.nama_merk || ''}`,
            code: m.kode || '',
            name: m.nama_merk || '',
          }))
        );
        setCategoryOptions(cats.map((c) => c.nama_kategori || '').filter(Boolean));
        setTypeOptions(types.map((t) => t.nama_tipe || '').filter(Boolean));
        setLokasiOptions(
          lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()).filter(Boolean)
        );
        const rawPreset = localStorage.getItem('withcoder_preset_persediaan_barang');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.bulan) setBulan(v.bulan);
          if (v.tglStart) setTglStart(v.tglStart);
          if (v.tglEnd) setTglEnd(v.tglEnd);
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

  const handleMerkSelect = (val: string) => {
    setSelectedMerk(val);
    const found = merkOptions.find((m) => m.label === val);
    if (found) {
      setMerkCode(found.code);
      setMerkName(found.name);
    } else {
      setMerkCode('');
      setMerkName('');
    }
  };

  const filteredTableRows = tableRows.filter((r) => {
    if (filterType === 'merk' && (merkName.trim() || merkCode.trim())) {
      const needle = (merkName.trim() || merkCode.trim()).toLowerCase();
      if (!r.merk.toLowerCase().includes(needle)) return false;
    }
    if ((filterType === 'batasan_kode' || filterType === 'kode_barang') && kodeBarangInput.trim()) {
      if (!r.kode_barang.toLowerCase().includes(kodeBarangInput.trim().toLowerCase())) {
        return false;
      }
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
    setFormCategory(categoryOptions[0] || 'PRODUCT');
    setFormMerk(merkName || '');
    setFormTipe('');
    setFormUnit('PCS');
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
      showFeedback('Pilih baris persediaan barang terlebih dahulu (atau klik Baru)');
      return;
    }
    setSelectedId(current.id);
    setEditingId(current.id);
    setModalError(null);
    setFormKode(current.kode_barang);
    setFormNama(current.nama_barang);
    setFormCategory(current.category || 'PRODUCT');
    setFormMerk(current.merk);
    setFormTipe(current.tipe || '');
    setFormUnit(current.satuan || 'PCS');
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
        category: formCategory.trim().toUpperCase(),
        merk: formMerk.trim().toUpperCase(),
        tipe: formTipe.trim().toUpperCase(),
        unit: formUnit.trim().toUpperCase() || 'PCS',
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
        showFeedback(`Persediaan [${payload.kode}] diperbarui di Supabase`);
      } else {
        const created = await erpCreate<any>('master_barangs', payload);
        if (created?.id) setSelectedId(String(created.id));
        showFeedback(`Barang [${payload.kode}] tersimpan ke Supabase`);
      }
      setIsCrudOpen(false);
      setEditingId(null);
      await loadLiveRows();
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Persediaan Barang';
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
      showFeedback('Pilih baris barang yang akan dihapus');
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
      showFeedback('Data barang dihapus dari Supabase');
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
        'withcoder_preset_persediaan_barang',
        JSON.stringify({ bulan, tglStart, tglEnd, lokasiStock, bentukLaporan })
      );
      await syncAppSettings({
        month_active: bulan.trim() || undefined,
        periode_start: toIsoDate(tglStart),
        periode_end: toIsoDate(tglEnd),
        lokasi_aktif: lokasiStock !== 'ALL' ? lokasiStock : undefined,
      });
      await loadLiveRows();
      showFeedback('Parameter & data Persediaan Barang tersinkron ke Supabase');
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
      showFeedback('Data Persediaan Barang dimuat ulang dari Supabase');
    } catch (err: any) {
      showFeedback(`Gagal muat: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const mapped = await loadLiveRows();
    return mapped.filter((r) => {
      if (filterType === 'merk' && (merkName.trim() || merkCode.trim())) {
        const needle = (merkName.trim() || merkCode.trim()).toLowerCase();
        return r.merk.toLowerCase().includes(needle);
      }
      if ((filterType === 'batasan_kode' || filterType === 'kode_barang') && kodeBarangInput.trim()) {
        return r.kode_barang.toLowerCase().includes(kodeBarangInput.trim().toLowerCase());
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
        fileName: 'Laporan_Persediaan_Barang',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Bulan: ${bulan} | Lokasi: ${lokasiStock}`,
        companyProfile: company,
        columns: [
          { header: 'Kode Barang', accessor: 'kode_barang' },
          { header: 'Nama Barang', accessor: 'nama_barang' },
          { header: 'Category', accessor: 'category' },
          { header: 'Merk', accessor: 'merk' },
          { header: 'Satuan', accessor: 'satuan', align: 'center' },
          { header: 'Stock Bagus', accessor: 'stock_bagus', align: 'right' },
          { header: 'Stock Rusak', accessor: 'stock_rusak', align: 'right' },
          { header: 'HPP (Rp)', accessor: 'hpp', align: 'right' },
          { header: 'Nilai Persediaan (Rp)', accessor: 'nilai_persediaan', align: 'right' },
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
    { header: 'Category', accessor: 'category', width: '75px' },
    { header: 'Merk', accessor: 'merk', width: '70px' },
    { header: 'Sat', accessor: 'satuan', align: 'center', width: '40px' },
    { header: 'Bagus', accessor: (r) => formatMoney(r.stock_bagus), align: 'right', width: '52px' },
    { header: 'Rusak', accessor: (r) => formatMoney(r.stock_rusak), align: 'right', width: '50px' },
    { header: 'HPP (Rp)', accessor: (r) => formatMoney(r.hpp), align: 'right', width: '85px' },
    { header: 'Nilai (Rp)', accessor: (r) => formatMoney(r.nilai_persediaan), align: 'right', width: '95px' },
  ];

  const totalBagus = previewRows.reduce((s, r) => s + Number(r.stock_bagus || 0), 0);
  const totalNilai = previewRows.reduce((s, r) => s + Number(r.nilai_persediaan || 0), 0);

  return (
    <div
      id="laporan-persediaan-barang-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Laporan Persediaan Barang"
        onClose={onClose}
        onFind={handleFind}
        onPrint={handlePreview}
        onTableView={() => loadLiveRows()}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3 space-y-2.5">
        <div className="max-w-[640px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[15px] tracking-wide text-black font-sans">
              LAPORAN PERSEDIAAN BARANG
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
          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Periode
            </legend>
            <div className="grid grid-cols-[145px_108px_62px_108px] items-center gap-x-1.5 gap-y-1.5 pt-0.5">
              <label className="text-right font-bold text-black text-[11px] pr-1">
                Bulan :
              </label>
              <input
                type="text"
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="w-[78px] h-[21px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none"
              />
              <span />
              <span />

              <label className="text-right font-bold text-black text-[11px] pr-1 whitespace-nowrap">
                Tanggal ( dd-mm-yyyy ) :
              </label>
              <DatePickerInput
                value={tglStart}
                onChange={(formatted) => setTglStart(formatted)}
                format="dmy"
                inputClassName="w-[88px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />

              <span className="h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                s / d
              </span>

              <DatePickerInput
                value={tglEnd}
                onChange={(formatted) => setTglEnd(formatted)}
                format="dmy"
                inputClassName="w-[88px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />
            </div>
          </fieldset>

          {/* Group 2: Pilihan Laporan Berdasarkan */}
          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_persediaan_filter"
                    checked={filterType === 'merk'}
                    onChange={() => setFilterType('merk')}
                    className="cursor-pointer"
                  />
                  <span>Merk Barang</span>
                </label>

                <div className="flex items-center space-x-1 flex-1">
                  <div className="flex items-center w-[118px] h-[21px] bg-white border border-[#7A7A7A] shrink-0">
                    <select
                      value={selectedMerk}
                      onChange={(e) => handleMerkSelect(e.target.value)}
                      disabled={filterType !== 'merk'}
                      className="w-full h-full px-1 text-[11px] bg-white outline-none cursor-pointer disabled:bg-[#ECE9D8] disabled:cursor-not-allowed"
                    >
                      <option value="">-- Semua Merk --</option>
                      {merkOptions.map((opt) => (
                        <option key={opt.label} value={opt.label}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={merkCode}
                    onChange={(e) => setMerkCode(e.target.value.toUpperCase())}
                    disabled={filterType !== 'merk'}
                    className="w-[54px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8] shrink-0"
                  />
                  <input
                    type="text"
                    value={merkName}
                    onChange={(e) => setMerkName(e.target.value)}
                    disabled={filterType !== 'merk'}
                    className="flex-1 h-[21px] bg-[#FFFFBF] border border-[#7A7A7A] px-2 text-[11px] outline-none shadow-inner disabled:opacity-75"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                <input
                  type="radio"
                  name="laporan_persediaan_filter"
                  checked={filterType === 'batasan_kode'}
                  onChange={() => setFilterType('batasan_kode')}
                  className="cursor-pointer"
                />
                <span>Batasan kode Barang</span>
              </label>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_persediaan_filter"
                    checked={filterType === 'kode_barang'}
                    onChange={() => setFilterType('kode_barang')}
                    className="cursor-pointer"
                  />
                  <span>Kode Barang</span>
                </label>
                {(filterType === 'kode_barang' || filterType === 'batasan_kode') && (
                  <>
                    <input
                      type="text"
                      list="persediaan-kode-list"
                      value={kodeBarangInput}
                      onChange={(e) => setKodeBarangInput(e.target.value.toUpperCase())}
                      placeholder="Ketik kode barang..."
                      className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] font-mono outline-none"
                    />
                    <datalist id="persediaan-kode-list">
                      {barangCodes.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </>
                )}
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                <input
                  type="radio"
                  name="laporan_persediaan_filter"
                  checked={filterType === 'all'}
                  onChange={() => setFilterType('all')}
                  className="cursor-pointer"
                />
                <span>ALL</span>
              </label>
            </div>
          </fieldset>

          {/* Lower Section */}
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
                    <option value="01 - Laporan Persediaan Barang">
                      01 - Laporan Persediaan Barang
                    </option>
                    <option value="02 - Rekap Persediaan Barang">
                      02 - Rekap Persediaan Barang
                    </option>
                    <option value="03 - Laporan Stock Opname">
                      03 - Laporan Stock Opname
                    </option>
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
                <span>PREVIEW</span>
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

        {/* Live Supabase Search & Persediaan Grid Panel */}
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
                placeholder="Cari Kode, Nama Barang, Merk, Category..."
                className="w-[240px] h-[22px] bg-white border border-[#7A7A7A] px-2 text-[11px] outline-none focus:border-[#316AC5]"
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
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Category</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Merk</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Sat</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">Stock Bagus</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">Stock Rusak</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">HPP (Rp)</th>
                  <th className="px-2 py-1 text-right">Nilai Persediaan</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                      Belum ada data Persediaan Barang. Klik "Baru" untuk menambah ke Supabase.
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
                          setFormCategory(r.category || 'PRODUCT');
                          setFormMerk(r.merk);
                          setFormTipe(r.tipe || '');
                          setFormUnit(r.satuan || 'PCS');
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
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.category}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.merk}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.satuan}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">
                          {formatMoney(r.stock_bagus)}
                        </td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">
                          {formatMoney(r.stock_rusak)}
                        </td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">
                          {formatRupiah(r.hpp)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono font-bold">
                          {formatRupiah(r.nilai_persediaan)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Persediaan Barang Modal */}
      {isCrudOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[500px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden text-xs">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 flex justify-between items-center font-bold shrink-0">
              <span>{editingId ? 'Koreksi Data Persediaan Barang' : 'Tambah Barang Persediaan Baru'}</span>
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
                    list="persediaan-category-list"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                  <datalist id="persediaan-category-list">
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
                    list="persediaan-merk-list"
                    value={formMerk}
                    onChange={(e) => setFormMerk(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                  <datalist id="persediaan-merk-list">
                    {merkOptions.map((m) => (
                      <option key={m.code + m.name} value={m.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Tipe</label>
                  <input
                    type="text"
                    list="persediaan-type-list"
                    value={formTipe}
                    onChange={(e) => setFormTipe(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                  <datalist id="persediaan-type-list">
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
                    type="text"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">HPP / Cost (Rp)</label>
                  <input
                    type="text"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Harga Jual (Rp)</label>
                  <input
                    type="text"
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
                    type="text"
                    value={formDisc}
                    onChange={(e) => setFormDisc(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Q.Min</label>
                  <input
                    type="text"
                    value={formQMin}
                    onChange={(e) => setFormQMin(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Qty.PO</label>
                  <input
                    type="text"
                    value={formQtyPo}
                    onChange={(e) => setFormQtyPo(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Qty.SO</label>
                  <input
                    type="text"
                    value={formQtySo}
                    onChange={(e) => setFormQtySo(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-0.5">
                <input
                  id="persediaan-not-print"
                  type="checkbox"
                  checked={formNotPrint}
                  onChange={(e) => setFormNotPrint(e.target.checked)}
                  className="w-3.5 h-3.5 cursor-pointer"
                />
                <label htmlFor="persediaan-not-print" className="font-bold cursor-pointer">
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
              Konfirmasi Hapus Barang Persediaan
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>
                Yakin ingin menghapus barang [{confirmDeleteRow.kode_barang}] -{' '}
                {confirmDeleteRow.nama_barang} dari database Supabase?
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
        subtitle={`Bulan: ${bulan} | Periode: ${tglStart || '-'} s/d ${tglEnd || '-'}`}
        orientation="landscape"
        metaLines={[
          { label: 'Bulan / Periode', value: `${bulan} (${tglStart || '-'} s/d ${tglEnd || '-'})` },
          { label: 'Lokasi Stock', value: lokasiStock },
          {
            label: 'Filter',
            value:
              filterType === 'merk'
                ? merkName || merkCode || 'Semua Merk'
                : kodeBarangInput || 'Semua Item',
          },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={printColumns}
        rows={previewRows}
        summaryItems={[
          { label: 'Total Item Persediaan', value: `${previewRows.length} Item` },
          { label: 'Total Qty Stock Bagus', value: formatMoney(totalBagus) },
          { label: 'Total Nilai Persediaan', value: formatRupiah(totalNilai) },
        ]}
      />
    </div>
  );
};
