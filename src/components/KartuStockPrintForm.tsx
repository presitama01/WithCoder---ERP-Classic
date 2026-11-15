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
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

interface KartuStockPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KartuStockPrintForm: React.FC<KartuStockPrintFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [bulanStart, setBulanStart] = useState<string>('08-2026');
  const [bulanEnd, setBulanEnd] = useState<string>('08-2026');
  const [tglStart, setTglStart] = useState<string>('01-08-2026');
  const [tglEnd, setTglEnd] = useState<string>('31-08-2026');
  const [filterType, setFilterType] = useState<string>('item_code');
  const [itemCode, setItemCode] = useState<string>('');
  const [itemName, setItemName] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('01 - OFFICE');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Kartu Stock');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangCatalog, setBarangCatalog] = useState<
    { kode: string; nama: string; category: string; merk: string; unit: string; cost: number }[]
  >([]);

  // Live Supabase table (stock_awal) + Search state
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add / Koreksi Modal for stock_awal
  const [isCrudOpen, setIsCrudOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formPeriode, setFormPeriode] = useState<string>('08 - 2026');
  const [formLokasi, setFormLokasi] = useState<string>('01 - OFFICE');
  const [formItemCode, setFormItemCode] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formMerk, setFormMerk] = useState<string>('');
  const [formSatuan, setFormSatuan] = useState<string>('PCS');
  const [formHpp, setFormHpp] = useState<string>('0');
  const [formStockBagus, setFormStockBagus] = useState<string>('0');
  const [formStockRusak, setFormStockRusak] = useState<string>('0');
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<any | null>(null);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadLiveRows = async (): Promise<any[]> => {
    const rows = await erpList<any>('stock_awal', { orderBy: 'item_code', asc: true });
    const mapped = rows.map((r) => ({
      ...r,
      id: String(r.id),
      periode: r.periode || '08 - 2026',
      lokasi: r.lokasi || '01 - OFFICE',
      item_code: r.item_code || '',
      description: r.description || '',
      category: r.category || '',
      merk: r.merk || '',
      satuan: r.satuan || 'PCS',
      hpp: Number(r.hpp || 0),
      stock_bagus: Number(r.stock_bagus || 0),
      stock_rusak: Number(r.stock_rusak || 0),
    }));
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
        const [lokasis, barangs] = await Promise.all([
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setLokasiOptions(
          lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()).filter(Boolean)
        );
        setBarangCatalog(
          barangs.map((b) => ({
            kode: b.kode || '',
            nama: b.nama_barang || '',
            category: b.category || '',
            merk: b.merk || '',
            unit: b.unit || 'PCS',
            cost: Number(b.cost || 0),
          }))
        );
        const rawPreset = localStorage.getItem('withcoder_preset_kartu_stock');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.bulanStart) setBulanStart(v.bulanStart);
          if (v.bulanEnd) setBulanEnd(v.bulanEnd);
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

  useEffect(() => {
    const match = barangCatalog.find(
      (b) => b.kode.toLowerCase() === itemCode.trim().toLowerCase()
    );
    if (match) {
      setItemName(match.nama);
    }
  }, [itemCode, barangCatalog]);

  if (!isOpen) return null;

  const filteredTableRows = tableRows.filter((r) => {
    if (lokasiStock !== 'ALL' && r.lokasi && r.lokasi !== lokasiStock) {
      return false;
    }
    if (filterType === 'item_code' && itemCode.trim()) {
      if (!r.item_code.toLowerCase().includes(itemCode.trim().toLowerCase())) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      if (searchField === 'Item Code') return r.item_code.toLowerCase().includes(q);
      if (searchField === 'Description') return r.description.toLowerCase().includes(q);
      if (searchField === 'Merk') return r.merk.toLowerCase().includes(q);
      if (searchField === 'Lokasi') return r.lokasi.toLowerCase().includes(q);
      if (searchField === 'Periode') return r.periode.toLowerCase().includes(q);
      return (
        r.item_code.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.merk.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.lokasi.toLowerCase().includes(q) ||
        r.periode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleModalItemCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setFormItemCode(upper);
    const match = barangCatalog.find(
      (b) => b.kode.trim().toLowerCase() === upper.trim().toLowerCase()
    );
    if (match) {
      setFormDescription(match.nama);
      setFormCategory(match.category);
      setFormMerk(match.merk);
      setFormSatuan(match.unit || 'PCS');
      setFormHpp(String(match.cost || 0));
    }
  };

  const handleBaru = () => {
    setEditingId(null);
    setModalError(null);
    setFormPeriode(bulanStart ? bulanStart.replace('-', ' - ') : '08 - 2026');
    setFormLokasi(lokasiStock !== 'ALL' ? lokasiStock : '01 - OFFICE');
    setFormItemCode(
      itemCode.trim() ||
        nextUniqueCode(tableRows.map((r) => r.item_code), 'BRG-', 4)
    );
    setFormDescription(itemName || '');
    setFormCategory('');
    setFormMerk('');
    setFormSatuan('PCS');
    setFormHpp('0');
    setFormStockBagus('0');
    setFormStockRusak('0');
    setIsCrudOpen(true);
  };

  const handleKoreksi = () => {
    const current =
      filteredTableRows.find((r) => r.id === selectedId) ||
      tableRows.find((r) => r.id === selectedId) ||
      filteredTableRows[0];
    if (!current) {
      showFeedback('Pilih baris Kartu / Stock Awal terlebih dahulu (atau klik Baru)');
      return;
    }
    setSelectedId(current.id);
    setEditingId(current.id);
    setModalError(null);
    setFormPeriode(current.periode || '08 - 2026');
    setFormLokasi(current.lokasi || '01 - OFFICE');
    setFormItemCode(current.item_code || '');
    setFormDescription(current.description || '');
    setFormCategory(current.category || '');
    setFormMerk(current.merk || '');
    setFormSatuan(current.satuan || 'PCS');
    setFormHpp(String(current.hpp || 0));
    setFormStockBagus(String(current.stock_bagus || 0));
    setFormStockRusak(String(current.stock_rusak || 0));
    setIsCrudOpen(true);
  };

  const handleSaveCrud = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formItemCode.trim()) {
      setModalError('Item Code wajib diisi.');
      return;
    }
    try {
      setIsBusy(true);
      const payload = {
        periode: formPeriode.trim() || '08 - 2026',
        lokasi: formLokasi || '01 - OFFICE',
        item_code: formItemCode.trim().toUpperCase(),
        description: formDescription.trim().toUpperCase(),
        category: formCategory.trim().toUpperCase(),
        merk: formMerk.trim().toUpperCase(),
        satuan: formSatuan.trim().toUpperCase() || 'PCS',
        hpp: parseNum(formHpp),
        stock_bagus: parseNum(formStockBagus),
        stock_rusak: parseNum(formStockRusak),
      };
      if (editingId) {
        await erpUpdate('stock_awal', editingId, payload);
        showFeedback(`Data Kartu Stock [${payload.item_code}] diperbarui di Supabase`);
      } else {
        const created = await erpCreate<any>('stock_awal', payload);
        if (created?.id) setSelectedId(String(created.id));
        showFeedback(`Data Kartu Stock [${payload.item_code}] tersimpan ke Supabase`);
      }
      setIsCrudOpen(false);
      setEditingId(null);
      await loadLiveRows();
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan data Kartu Stock';
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
      showFeedback('Pilih baris Kartu / Stock Awal yang akan dihapus');
      return;
    }
    setConfirmDeleteRow(current);
  };

  const handleConfirmHapus = async () => {
    if (!confirmDeleteRow) return;
    try {
      setIsBusy(true);
      await erpDelete('stock_awal', confirmDeleteRow.id);
      setConfirmDeleteRow(null);
      await loadLiveRows();
      showFeedback('Baris Kartu Stock dihapus dari Supabase');
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
        'withcoder_preset_kartu_stock',
        JSON.stringify({ bulanStart, bulanEnd, tglStart, tglEnd, lokasiStock, bentukLaporan })
      );
      await syncAppSettings({
        month_active: bulanStart.trim() || undefined,
        periode_start: toIsoDate(tglStart),
        periode_end: toIsoDate(tglEnd),
        lokasi_aktif: lokasiStock !== 'ALL' ? lokasiStock : undefined,
      });
      await loadLiveRows();
      showFeedback('Parameter & data Kartu Stock tersinkron ke Supabase');
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
      showFeedback('Data Kartu Stock dimuat ulang dari Supabase');
    } catch (err: any) {
      showFeedback(`Gagal muat: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const startIso = toIsoDate(tglStart);
    const endIso = toIsoDate(tglEnd);
    const filterCode = filterType === 'item_code' ? itemCode.trim().toUpperCase() : '';

    const [stockAwals, penerimaanLain, pengeluaranLain, barangs] = await Promise.all([
      erpList<any>('stock_awal', { orderBy: 'item_code', asc: true }).catch(() => []),
      erpList<any>('penerimaan_barang_lains', { orderBy: 'tanggal', asc: true }).catch(() => []),
      erpList<any>('pengeluaran_barang_lains', { orderBy: 'tanggal', asc: true }).catch(() => []),
      erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
    ]);

    const movements: {
      sortDate: string;
      tanggal: string;
      no_bukti: string;
      jenis: string;
      kode_barang: string;
      nama_barang: string;
      lokasi: string;
      masuk: number;
      keluar: number;
      keterangan: string;
    }[] = [];

    for (const sa of stockAwals) {
      const code = (sa.item_code || '').toUpperCase();
      if (filterCode && code !== filterCode) continue;
      if (lokasiStock !== 'ALL' && sa.lokasi && sa.lokasi !== lokasiStock) continue;
      movements.push({
        sortDate: '0000-00-00',
        tanggal: sa.periode || '-',
        no_bukti: 'STOCK-AWAL',
        jenis: 'Saldo Awal',
        kode_barang: code,
        nama_barang: sa.description || '',
        lokasi: sa.lokasi || '01 - OFFICE',
        masuk: Number(sa.stock_bagus || 0),
        keluar: 0,
        keterangan: `Periode ${sa.periode || '-'}`,
      });
    }

    if (movements.length === 0) {
      for (const b of barangs) {
        const code = (b.kode || '').toUpperCase();
        if (filterCode && code !== filterCode) continue;
        movements.push({
          sortDate: '0000-00-00',
          tanggal: 'Saldo Master',
          no_bukti: 'MASTER-BRG',
          jenis: 'Saldo Awal',
          kode_barang: code,
          nama_barang: b.nama_barang || '',
          lokasi: '01 - OFFICE',
          masuk: Number(b.stock || 0),
          keluar: 0,
          keterangan: 'Saldo dari Master Barang',
        });
      }
    }

    for (const p of penerimaanLain) {
      const code = (p.kode_barang || '').toUpperCase();
      if (filterCode && code !== filterCode) continue;
      if (lokasiStock !== 'ALL' && p.lokasi_stock && p.lokasi_stock !== lokasiStock) continue;
      const tglIso = toIsoDate(p.tanggal) || '';
      if (startIso && tglIso && tglIso < startIso) continue;
      if (endIso && tglIso && tglIso > endIso) continue;
      movements.push({
        sortDate: tglIso || '9999-99-99',
        tanggal: toDisplayDMyShort(p.tanggal) || '-',
        no_bukti: p.no_bukti || '',
        jenis: 'Penerimaan Lain',
        kode_barang: code,
        nama_barang: p.nama_barang || '',
        lokasi: p.lokasi_stock || '01 - OFFICE',
        masuk: Number(p.qty || 0),
        keluar: 0,
        keterangan: p.keterangan || p.customer || '',
      });
    }

    for (const k of pengeluaranLain) {
      const code = (k.kode_barang || '').toUpperCase();
      if (filterCode && code !== filterCode) continue;
      if (lokasiStock !== 'ALL' && k.lokasi_stock && k.lokasi_stock !== lokasiStock) continue;
      const tglIso = toIsoDate(k.tanggal) || '';
      if (startIso && tglIso && tglIso < startIso) continue;
      if (endIso && tglIso && tglIso > endIso) continue;
      movements.push({
        sortDate: tglIso || '9999-99-99',
        tanggal: toDisplayDMyShort(k.tanggal) || '-',
        no_bukti: k.no_bukti || '',
        jenis: 'Pengeluaran Lain',
        kode_barang: code,
        nama_barang: k.nama_barang || '',
        lokasi: k.lokasi_stock || '01 - OFFICE',
        masuk: 0,
        keluar: Number(k.qty || 0),
        keterangan: k.keterangan || k.customer || '',
      });
    }

    movements.sort((a, b) => a.sortDate.localeCompare(b.sortDate));

    const runningByItem = new Map<string, number>();
    return movements.map((m) => {
      const prevSaldo = runningByItem.get(m.kode_barang) || 0;
      const newSaldo = prevSaldo + m.masuk - m.keluar;
      runningByItem.set(m.kode_barang, newSaldo);
      return {
        ...m,
        saldo: newSaldo,
      };
    });
  };

  const handlePreview = async () => {
    try {
      setIsBusy(true);
      const data = await fetchReportData();
      setPreviewRows(data);
      setIsPrintOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal memuat Kartu Stock: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsBusy(true);
      const [data, company] = await Promise.all([fetchReportData(), fetchActiveCompanyProfile()]);
      exportToExcel({
        fileName: 'Kartu_Stock',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Item: ${itemCode || 'Semua'} | Lokasi: ${lokasiStock} | Periode: ${tglStart || '-'} s/d ${tglEnd || '-'}`,
        companyProfile: company,
        columns: [
          { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
          { header: 'No. Bukti', accessor: 'no_bukti' },
          { header: 'Jenis', accessor: 'jenis' },
          { header: 'Kode Brg', accessor: 'kode_barang' },
          { header: 'Nama Barang', accessor: 'nama_barang' },
          { header: 'Masuk', accessor: 'masuk', align: 'right' },
          { header: 'Keluar', accessor: 'keluar', align: 'right' },
          { header: 'Saldo', accessor: 'saldo', align: 'right' },
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

  const printColumns: PrintColumn<any>[] = [
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '78px' },
    { header: 'No.Bukti', accessor: 'no_bukti', width: '95px' },
    { header: 'Jenis Mutasi', accessor: 'jenis', width: '90px' },
    { header: 'Kode Brg', accessor: 'kode_barang', width: '75px' },
    { header: 'Nama Barang', accessor: 'nama_barang' },
    { header: 'Masuk', accessor: (r) => formatMoney(r.masuk), align: 'right', width: '55px' },
    { header: 'Keluar', accessor: (r) => formatMoney(r.keluar), align: 'right', width: '55px' },
    { header: 'Saldo', accessor: (r) => formatMoney(r.saldo), align: 'right', width: '60px' },
  ];

  const totalMasuk = previewRows.reduce((s, r) => s + Number(r.masuk || 0), 0);
  const totalKeluar = previewRows.reduce((s, r) => s + Number(r.keluar || 0), 0);

  return (
    <div
      id="kartu-stock-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Kartu Stock"
        onClose={onClose}
        onFind={handleFind}
        onPrint={handlePreview}
        onTableView={() => loadLiveRows()}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3 space-y-2.5">
        <div className="max-w-[600px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[14px] tracking-wide text-black font-sans">
              KARTU STOCK
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
            <div className="grid grid-cols-[140px_108px_58px_108px] items-center gap-x-1.5 gap-y-1.5 pt-0.5">
              <label className="text-right font-bold text-black text-[11px] pr-1">
                Bulan :
              </label>
              <input
                type="text"
                value={bulanStart}
                onChange={(e) => setBulanStart(e.target.value)}
                className="w-full h-[21px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none"
              />
              <span className="h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                s / d
              </span>
              <input
                type="text"
                value={bulanEnd}
                onChange={(e) => setBulanEnd(e.target.value)}
                className="w-full h-[21px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none"
              />

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
              <label className="flex items-center space-x-2 text-[11px] text-[#808080] cursor-not-allowed">
                <input
                  type="radio"
                  name="kartu_stock_filter"
                  disabled
                  checked={filterType === 'merk'}
                  onChange={() => setFilterType('merk')}
                  className="cursor-not-allowed"
                />
                <span>Merk Barang</span>
              </label>

              <label className="flex items-center space-x-2 text-[11px] text-[#808080] cursor-not-allowed">
                <input
                  type="radio"
                  name="kartu_stock_filter"
                  disabled
                  checked={filterType === 'batasan_kode'}
                  onChange={() => setFilterType('batasan_kode')}
                  className="cursor-not-allowed"
                />
                <span>Batasan kode Barang</span>
              </label>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="kartu_stock_filter"
                    checked={filterType === 'item_code'}
                    onChange={() => setFilterType('item_code')}
                    className="cursor-pointer"
                  />
                  <span>Item Code</span>
                </label>

                <div className="flex items-center space-x-1 flex-1">
                  <input
                    type="text"
                    list="kartu-stock-barang-list"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                    disabled={filterType !== 'item_code'}
                    placeholder="Semua / Pilih..."
                    className="w-[104px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8]"
                  />
                  <datalist id="kartu-stock-barang-list">
                    {barangCatalog.map((b) => (
                      <option key={b.kode} value={b.kode}>
                        {b.nama}
                      </option>
                    ))}
                  </datalist>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    disabled={filterType !== 'item_code'}
                    className="flex-1 h-[21px] bg-[#FFFFBF] border border-[#7A7A7A] px-2 text-[11px] outline-none shadow-inner"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                <input
                  type="radio"
                  name="kartu_stock_filter"
                  checked={filterType === 'all_periode'}
                  onChange={() => setFilterType('all_periode')}
                  className="cursor-pointer"
                />
                <span>ALL berdasarkan periode</span>
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
                    <option value="01 - Kartu Stock">01 - Kartu Stock</option>
                    <option value="02 - Rekap Kartu Stock">02 - Rekap Kartu Stock</option>
                    <option value="03 - Mutasi Kartu Stock">03 - Mutasi Kartu Stock</option>
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

        {/* Live Supabase Search & Saldo Kartu Stock Grid Panel */}
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
                <option value="Item Code">Item Code</option>
                <option value="Description">Description</option>
                <option value="Merk">Merk</option>
                <option value="Lokasi">Lokasi</option>
                <option value="Periode">Periode</option>
              </select>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadLiveRows();
                }}
                placeholder="Cari Item Code, Description, Merk, Lokasi..."
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
              Data Supabase (<b>stock_awal</b>): <b>{filteredTableRows.length}</b> baris
            </span>
          </div>

          <div className="max-h-[220px] overflow-auto bg-white">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080]">
                <tr>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Periode</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Lokasi</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Item Code</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Description</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Merk</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Sat</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">HPP (Rp)</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">Stock Bagus</th>
                  <th className="px-2 py-1 text-right">Stock Rusak</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                      Belum ada data Kartu / Saldo Stock. Klik "Baru" untuk menambah ke Supabase.
                    </td>
                  </tr>
                ) : (
                  filteredTableRows.map((r) => {
                    const isSel = r.id === selectedId;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => {
                          setSelectedId(r.id);
                          if (filterType === 'item_code') {
                            setItemCode(r.item_code);
                            setItemName(r.description);
                          }
                        }}
                        onDoubleClick={() => {
                          setSelectedId(r.id);
                          setEditingId(r.id);
                          setModalError(null);
                          setFormPeriode(r.periode || '08 - 2026');
                          setFormLokasi(r.lokasi || '01 - OFFICE');
                          setFormItemCode(r.item_code || '');
                          setFormDescription(r.description || '');
                          setFormCategory(r.category || '');
                          setFormMerk(r.merk || '');
                          setFormSatuan(r.satuan || 'PCS');
                          setFormHpp(String(r.hpp || 0));
                          setFormStockBagus(String(r.stock_bagus || 0));
                          setFormStockRusak(String(r.stock_rusak || 0));
                          setIsCrudOpen(true);
                        }}
                        className={`cursor-pointer border-b border-[#E0E0E0] ${
                          isSel ? 'bg-[#316AC5] text-white' : 'hover:bg-[#EAF2FC]'
                        }`}
                      >
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.periode}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.lokasi}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.item_code}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.description}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.merk}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.satuan}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">
                          {formatRupiah(r.hpp)}
                        </td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">
                          {formatMoney(r.stock_bagus)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono">
                          {formatMoney(r.stock_rusak)}
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

      {/* Add / Edit Kartu Stock (stock_awal) Modal */}
      {isCrudOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[490px] flex flex-col overflow-hidden text-xs">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 flex justify-between items-center font-bold">
              <span>{editingId ? 'Koreksi Saldo Kartu Stock' : 'Tambah Saldo Kartu Stock Baru'}</span>
              <button
                type="button"
                onClick={() => setIsCrudOpen(false)}
                className="w-5 h-5 bg-[#C00000] text-white font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form noValidate onSubmit={handleSaveCrud} className="p-3 space-y-2 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Periode</label>
                  <input
                    type="text"
                    value={formPeriode}
                    onChange={(e) => setFormPeriode(e.target.value)}
                    placeholder="08 - 2026"
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Lokasi Stock</label>
                  <select
                    value={formLokasi}
                    onChange={(e) => setFormLokasi(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A]"
                  >
                    {lokasiOptions.length > 0 ? (
                      lokasiOptions.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))
                    ) : (
                      <option value="01 - OFFICE">01 - OFFICE</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Item Code *</label>
                  <input
                    type="text"
                    list="ks-modal-barang-list"
                    value={formItemCode}
                    onChange={(e) => handleModalItemCodeChange(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
                  <datalist id="ks-modal-barang-list">
                    {barangCatalog.map((b) => (
                      <option key={b.kode} value={b.kode}>
                        {b.nama}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div className="col-span-2">
                  <label className="block font-bold mb-0.5">Description</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Merk</label>
                  <input
                    type="text"
                    value={formMerk}
                    onChange={(e) => setFormMerk(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Satuan</label>
                  <input
                    type="text"
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">HPP (Rp)</label>
                  <input
                    type="text"
                    value={formHpp}
                    onChange={(e) => setFormHpp(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Stock Bagus</label>
                  <input
                    type="text"
                    value={formStockBagus}
                    onChange={(e) => setFormStockBagus(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Stock Rusak</label>
                  <input
                    type="text"
                    value={formStockRusak}
                    onChange={(e) => setFormStockRusak(e.target.value)}
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
              Konfirmasi Hapus Kartu Stock
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>
                Yakin ingin menghapus data Kartu Stock [{confirmDeleteRow.item_code}] dari database Supabase?
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
        subtitle={`Periode: ${tglStart || bulanStart} s/d ${tglEnd || bulanEnd}`}
        orientation="landscape"
        metaLines={[
          { label: 'Periode Tanggal', value: `${tglStart || bulanStart} s/d ${tglEnd || bulanEnd}` },
          { label: 'Lokasi Stock', value: lokasiStock },
          { label: 'Item Code', value: itemCode ? `${itemCode} (${itemName})` : 'Semua Item' },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={printColumns}
        rows={previewRows}
        summaryItems={[
          { label: 'Total Mutasi Baris', value: `${previewRows.length} Baris` },
          { label: 'Total Qty Masuk', value: formatMoney(totalMasuk) },
          { label: 'Total Qty Keluar', value: formatMoney(totalKeluar) },
          { label: 'Saldo Akhir Net', value: formatMoney(totalMasuk - totalKeluar) },
        ]}
      />
    </div>
  );
};
