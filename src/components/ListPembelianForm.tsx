import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  erpCompositeSave,
  erpDelete,
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
  nextUniqueCode,
  parseNum,
  toDisplayDMyShort,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { getCurrentUser } from '../lib/authService';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface PembelianDetailItem {
  id: string;
  pembelianId?: string;
  noUrut: number;
  kode: string;
  namaBarang: string;
  unit: string;
  terima: number;
  qty: number;
  harga: number;
  jumlah: number;
  total: number;
}

export interface PembelianItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaSupplier: string;
  noPo: string;
  noFaktur: string;
  keterangan: string;
  nilaiPembelian: string;
  nilaiPembelianNum: number;
  jthTmp: string;
  stsLunas: string;
  tglLunas: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

export interface PurchaseOrderRef {
  id: string;
  noBukti: string;
  namaSupplier: string;
  keterangan: string;
  nilaiPo: number;
}

interface ListPembelianFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToPembelian(r: any): PembelianItem {
  const valNum = Number(r.nilai_pembelian || 0);
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaSupplier: r.nama_supplier || '',
    noPo: r.no_po || '-',
    noFaktur: r.no_faktur || '-',
    keterangan: r.keterangan || '',
    nilaiPembelian: formatMoney(valNum),
    nilaiPembelianNum: valNum,
    jthTmp: toDisplayDMyShort(r.jth_tmp) || '-',
    stsLunas: r.sts_lunas || 'Belum',
    tglLunas: toDisplayDMyShort(r.tgl_lunas) || '-',
    stsPost: r.sts_post || 'Posted',
    tglPost: toDisplayDMyShort(r.tgl_post) || '-',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

function mapDbToDetail(d: any, idx = 0): PembelianDetailItem {
  const qty = Number(d.qty || 0);
  const harga = Number(d.harga || 0);
  const jumlah = d.jumlah !== undefined && d.jumlah !== null ? Number(d.jumlah) : qty * harga;
  const total = d.total !== undefined && d.total !== null ? Number(d.total) : jumlah;
  return {
    id: d.id || `det-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    pembelianId: d.pembelian_id,
    noUrut: Number(d.no_urut ?? idx + 1),
    kode: String(d.kode || '').trim().toUpperCase(),
    namaBarang: String(d.nama_barang || '').trim(),
    unit: String(d.unit || 'PCS').trim().toUpperCase(),
    terima: Number(d.terima || 0),
    qty,
    harga,
    jumlah,
    total,
  };
}

function createBlankDetailRow(noUrut: number): PembelianDetailItem {
  return {
    id: `new-${Date.now()}-${noUrut}-${Math.random().toString(36).slice(2, 6)}`,
    noUrut,
    kode: '',
    namaBarang: '',
    unit: 'PCS',
    terima: 0,
    qty: 1,
    harga: 0,
    jumlah: 0,
    total: 0,
  };
}

export const ListPembelianForm: React.FC<ListPembelianFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [pembelianList, setPembelianList] = useState<PembelianItem[]>([]);
  const [pembelianDetailsMap, setPembelianDetailsMap] = useState<Record<string, PembelianDetailItem[]>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [poOptions, setPoOptions] = useState<PurchaseOrderRef[]>([]);
  const [poDetailsByNoPoMap, setPoDetailsByNoPoMap] = useState<Record<string, PembelianDetailItem[]>>({});

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newSupplier, setNewSupplier] = useState<string>('');
  const [newNoPo, setNewNoPo] = useState<string>('');
  const [newNoFaktur, setNewNoFaktur] = useState<string>('');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newNilai, setNewNilai] = useState<string>('0');
  const [newJthTmp, setNewJthTmp] = useState<string>('');
  const [newStsLunas, setNewStsLunas] = useState<string>('Belum');
  const [newTglLunas, setNewTglLunas] = useState<string>('');
  const [newStsPost, setNewStsPost] = useState<string>('Posted');
  const [newTglPost, setNewTglPost] = useState<string>('');
  
  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');

  const [detailRows, setDetailRows] = useState<PembelianDetailItem[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadMasterReferences = async () => {
    const [suppRes, poRes, poDetRes] = await Promise.allSettled([
      erpList<any>('master_suppliers', { orderBy: 'nama_supplier', asc: true, limit: 1000 }),
      erpList<any>('purchase_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }),
      erpList<any>('purchase_order_details', { orderBy: 'no_urut', asc: true, limit: 5000 }),
    ]);

    if (suppRes.status === 'fulfilled') {
      const supps = Array.from(
        new Set(
          suppRes.value
            .map((s: any) => String(s.nama_supplier || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setSupplierOptions(supps);
    }

    const poIdToNoBukti = new Map<string, string>();
    if (poRes.status === 'fulfilled') {
      const pos: PurchaseOrderRef[] = poRes.value
        .map((p: any) => {
          const noBukti = String(p.no_bukti || '').trim().toUpperCase();
          if (noBukti) poIdToNoBukti.set(String(p.id), noBukti);
          return {
            id: String(p.id || ''),
            noBukti,
            namaSupplier: String(p.nama_supplier || '').trim().toUpperCase(),
            keterangan: String(p.keterangan || '').trim(),
            nilaiPo: Number(p.nilai_po || 0),
          };
        })
        .filter((p: PurchaseOrderRef) => p.noBukti);
      setPoOptions(pos);
    }

    if (poDetRes.status === 'fulfilled') {
      const grouped: Record<string, PembelianDetailItem[]> = {};
      for (const raw of poDetRes.value) {
        const mapped = mapDbToDetail(raw, 0);
        const keys = Array.from(
          new Set(
            [
              String(raw.no_bukti || '').trim().toUpperCase(),
              poIdToNoBukti.get(String(raw.po_id || '')) || '',
            ].filter(Boolean)
          )
        );
        for (const k of keys) {
          if (!grouped[k]) grouped[k] = [];
          grouped[k].push({ ...mapped, noUrut: grouped[k].length + 1 });
        }
      }
      setPoDetailsByNoPoMap(grouped);
    }
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'no_bukti',
    'No.Bukti': 'no_bukti',
    'Nama Supplier': 'nama_supplier',
    'No.PO': 'no_po',
    'No.Faktur Pembelian': 'no_faktur',
    Keterangan: 'keterangan',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
    tglFilter?: string;
  }): Promise<PembelianItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const activeTgl = opts?.tglFilter ?? tanggalFilter;
      const isoFilter = activeTgl && activeTgl !== 'Semua' ? toIsoDate(activeTgl) : null;

      const queryOpts: Record<string, any> = { orderBy: 'tanggal', asc: false, limit: 1000 };
      if (isoFilter) queryOpts.eq = { tanggal: isoFilter };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'no_bukti,nama_supplier,no_po,no_faktur,keterangan';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows, detRows] = await Promise.all([
        erpList<any>('pembelian_barangs', queryOpts),
        erpList<any>('pembelian_barang_details', { orderBy: 'no_urut', asc: true }).catch(() => []),
        loadMasterReferences(),
      ]);

      const mappedDetails: Record<string, PembelianDetailItem[]> = {};
      for (const d of detRows) {
        const pId = String(d.pembelian_id || '');
        if (!mappedDetails[pId]) mappedDetails[pId] = [];
        mappedDetails[pId].push(mapDbToDetail(d, mappedDetails[pId].length));
      }
      setPembelianDetailsMap(mappedDetails);

      const mapped = rows.map(mapDbToPembelian);
      setPembelianList(mapped);
      if (mapped.length > 0 && !mapped.some((r) => r.id === selectedId)) {
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
    const selected = pembelianList.find((p) => p.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record Pembelian terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const details = pembelianDetailsMap[selected.id] || [];
      const headerPayload: Record<string, any> = {
        id: selected.id,
        no_bukti: selected.noBukti.trim().toUpperCase(),
        tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
        nama_supplier: selected.namaSupplier.trim().toUpperCase(),
        no_po: selected.noPo.trim().toUpperCase() || '-',
        no_faktur: selected.noFaktur.trim().toUpperCase(),
        keterangan: selected.keterangan.trim(),
        nilai_pembelian: selected.nilaiPembelianNum,
        jth_tmp: selected.jthTmp !== '-' ? toIsoDate(selected.jthTmp) : null,
        sts_lunas: selected.stsLunas,
        tgl_lunas: selected.tglLunas !== '-' ? toIsoDate(selected.tglLunas) : null,
        sts_post: selected.stsPost,
        tgl_post: selected.tglPost !== '-' ? toIsoDate(selected.tglPost) : null,
        dibuat_oleh: selected.dibuatOleh.trim().toUpperCase() || currentUser,
        diupdate_oleh: currentUser,
        tgl_update: todayIso(),
      };
      const detailsPayload = details.map((d, idx) => ({
        no_urut: idx + 1,
        kode: d.kode.trim().toUpperCase(),
        nama_barang: d.namaBarang.trim(),
        unit: d.unit.trim().toUpperCase() || 'PCS',
        terima: Number(d.terima || 0),
        qty: Number(d.qty || 1),
        harga: Number(d.harga || 0),
        jumlah: Number(d.jumlah || 0),
        total: Number(d.total || 0),
      }));
      const saved = await erpCompositeSave<{ header: any; details: any[] }>(
        'pembelian',
        headerPayload,
        detailsPayload
      );
      const mapped = mapDbToPembelian(saved.header);
      const mappedDet = (saved.details || []).map((d: any, idx: number) => mapDbToDetail(d, idx));
      setPembelianList((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
      setPembelianDetailsMap((prev) => ({ ...prev, [mapped.id]: mappedDet }));
      setSelectedId(mapped.id);
      showFeedback(`Pembelian [${mapped.noBukti}] tersimpan ke Supabase`);
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

  const applyPurchaseOrderAutoFill = (rawNoPo: string) => {
    const cleanNoPo = rawNoPo.trim().toUpperCase();
    setNewNoPo(cleanNoPo);
    if (!cleanNoPo) return;

    const matchedPo = poOptions.find((p) => p.noBukti === cleanNoPo);
    if (matchedPo) {
      if (matchedPo.namaSupplier) setNewSupplier(matchedPo.namaSupplier);
      if (matchedPo.keterangan && !newKeterangan.trim()) {
        setNewKeterangan(matchedPo.keterangan);
      }
      if (!newNoFaktur.trim()) {
        setNewNoFaktur(`INV-${matchedPo.noBukti}`);
      }
    }

    const poItems = (poDetailsByNoPoMap[cleanNoPo] || []).map((d, idx) => ({
      ...d,
      id: `po-fill-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      noUrut: idx + 1,
    }));

    if (poItems.length > 0) {
      setDetailRows(poItems);
      const sum = poItems.reduce((acc, item) => acc + item.total, 0);
      setNewNilai(String(sum > 0 ? sum : matchedPo?.nilaiPo || 0));
    } else {
      setDetailRows([createBlankDetailRow(1)]);
      if (matchedPo) {
        setNewNilai(String(matchedPo.nilaiPo || 0));
      }
    }
  };

  const handleAddNew = async () => {
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setNewNoBukti(nextUniqueCode(pembelianList.map((p) => p.noBukti), '2608-PB-IMP-', 3));
    setNewTanggal(todayDisp);
    setNewSupplier('');
    setNewNoPo('');
    setNewNoFaktur('');
    setNewKeterangan('');
    setNewNilai('0');
    setNewJthTmp(todayDisp);
    setNewStsLunas('Belum');
    setNewTglLunas('');
    setNewStsPost('Posted');
    setNewTglPost(todayDisp);
    setNewDibuatOleh(currentUser);
    setNewTglCreated(todayDisp);
    setNewDiupdateOleh('-');
    setNewTglUpdate('');
    setDetailRows([createBlankDetailRow(1)]);
    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleEdit = async () => {
    const item = pembelianList.find((p) => p.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(item.id);
    setModalError(null);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal);
    setNewSupplier(item.namaSupplier);
    setNewNoPo(item.noPo);
    setNewNoFaktur(item.noFaktur);
    setNewKeterangan(item.keterangan);
    setNewNilai(String(item.nilaiPembelianNum));
    setNewJthTmp(item.jthTmp === '-' ? '' : item.jthTmp);
    setNewStsLunas(item.stsLunas);
    setNewTglLunas(item.tglLunas === '-' ? '' : item.tglLunas);
    setNewStsPost(item.stsPost || 'Posted');
    setNewTglPost(item.tglPost === '-' ? '' : item.tglPost);
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser);
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);

    const existingDet = pembelianDetailsMap[item.id] || [];
    setDetailRows(
      existingDet.length > 0
        ? existingDet
        : [createBlankDetailRow(1)]
    );

    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoBukti.trim() || !newSupplier.trim() || !newNoFaktur.trim()) {
      setModalError('No.Bukti, Nama Supplier, dan No.Faktur wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglIso = toIsoDate(newTanggal) || todayIso();
      const totalDetailSum = detailRows.reduce((acc, r) => acc + r.total, 0);
      const finalNilai = totalDetailSum > 0 ? totalDetailSum : parseNum(newNilai);

      const headerPayload: Record<string, any> = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_supplier: newSupplier.trim().toUpperCase(),
        no_po: newNoPo.trim().toUpperCase() || '-',
        no_faktur: newNoFaktur.trim().toUpperCase(),
        keterangan: newKeterangan.trim(),
        nilai_pembelian: finalNilai,
        jth_tmp: toIsoDate(newJthTmp),
        sts_lunas: newStsLunas,
        tgl_lunas: toIsoDate(newTglLunas) || (newStsLunas === 'Lunas' ? todayIso() : null),
        sts_post: newStsPost,
        tgl_post: toIsoDate(newTglPost) || (newStsPost === 'Posted' ? tglIso : null),
      };

      if (editingId) {
        headerPayload.diupdate_oleh = newDiupdateOleh.trim().toUpperCase() || currentUser;
        headerPayload.tgl_update = toIsoDate(newTglUpdate) || todayIso();
        headerPayload.id = editingId;
      } else {
        headerPayload.dibuat_oleh = newDibuatOleh.trim().toUpperCase() || currentUser;
        headerPayload.tgl_created = toIsoDate(newTglCreated) || todayIso();
        headerPayload.diupdate_oleh = '-';
      }

      const detailsPayload = detailRows.map((d, idx) => ({
        no_urut: idx + 1,
        kode: d.kode.trim().toUpperCase(),
        nama_barang: d.namaBarang.trim(),
        unit: d.unit.trim().toUpperCase() || 'PCS',
        terima: Number(d.terima || 0),
        qty: Number(d.qty || 1),
        harga: Number(d.harga || 0),
        jumlah: Number(d.jumlah || 0),
        total: Number(d.total || 0),
      }));

      const saved = await erpCompositeSave<{ header: any; details: any[] }>(
        'pembelian',
        headerPayload,
        detailsPayload
      );

      const mapped = mapDbToPembelian(saved.header);
      const mappedDet = (saved.details || []).map((d: any, idx: number) => mapDbToDetail(d, idx));

      if (editingId) {
        setPembelianList(pembelianList.map((p) => (p.id === editingId ? mapped : p)));
        setPembelianDetailsMap({ ...pembelianDetailsMap, [editingId]: mappedDet });
        showFeedback('Pembelian diperbarui');
      } else {
        setPembelianList([mapped, ...pembelianList]);
        setPembelianDetailsMap({ ...pembelianDetailsMap, [mapped.id]: mappedDet });
        setSelectedId(mapped.id);
        showFeedback('Pembelian tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan data Pembelian';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('pembelian_barang_details', id, 'pembelian_id').catch(() => {});
      await erpDelete('pembelian_barangs', id);
      const updated = pembelianList.filter((item) => item.id !== id);
      setPembelianList(updated);
      setPembelianDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Data Pembelian dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = pembelianList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (searchField === 'Kode' || searchField === 'No.Bukti') return matchesMultiKeyword([item.noBukti], searchTerm);
    if (searchField === 'Nama Supplier') return matchesMultiKeyword([item.namaSupplier], searchTerm);
    if (searchField === 'No.PO') return matchesMultiKeyword([item.noPo], searchTerm);
    if (searchField === 'No.Faktur Pembelian') return matchesMultiKeyword([item.noFaktur], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
    return matchesMultiKeyword(
      [item.noBukti, item.tanggal, item.namaSupplier, item.noPo, item.noFaktur, item.keterangan, item.stsLunas],
      searchTerm
    );
  });

  const totalNilai = filteredList.reduce((acc, r) => acc + r.nilaiPembelianNum, 0);

  const selectedPembelian =
    filteredList.find((p) => p.id === selectedId) ||
    pembelianList.find((p) => p.id === selectedId) ||
    null;
  const selectedPembelianDetails = selectedPembelian
    ? pembelianDetailsMap[selectedPembelian.id] || []
    : [];

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm, tglFilter: tanggalFilter });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Pembelian Barang dari Supabase`
          : 'Data Pembelian Barang tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setTanggalFilter('Semua');
    const rows = await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
    if (rows) showFeedback(`Filter direset (${rows.length} Pembelian)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Pembelian_Barang',
      sheetTitle: 'LIST PEMBELIAN BARANG',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Supplier', accessor: 'namaSupplier' },
        { header: 'No.PO', accessor: 'noPo' },
        { header: 'No.Faktur Pembelian', accessor: 'noFaktur' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Nilai Pembelian', accessor: 'nilaiPembelianNum', align: 'right' },
        { header: 'Jth.Tmp', accessor: 'jthTmp', align: 'center' },
        { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const supplierDropdownChoices = Array.from(
    new Set([...supplierOptions, newSupplier.trim().toUpperCase()].filter(Boolean))
  );

  const poDropdownChoices = Array.from(
    new Set([...poOptions.map((p) => p.noBukti), newNoPo.trim().toUpperCase()].filter(Boolean))
  );

  return (
    <div
      id="list-pembelian-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Pembelian Barang"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={() => loadData({ field: searchField, term: searchTerm, tglFilter: tanggalFilter })}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto">
          <div className="flex items-center space-x-3">
            <FormActionButtons
              onSimpan={handleToolbarSimpan}
              onBaru={handleAddNew}
              onKoreksi={handleEdit}
              onHapus={() => (selectedId ? handleDelete(selectedId) : showFeedback('Pilih data yang akan dihapus'))}
              onPrint={() => setIsPrintOpen(true)}
              onFind={handleFind}
              isBusy={isBusy}
              feedback={feedback}
            />
            <div className="flex items-center space-x-1">
              <span className="text-gray-800 font-medium">Tanggal :</span>
              <DatePickerInput
                value={tanggalFilter === 'Semua' ? '' : tanggalFilter}
                onChange={(formatted) => setTanggalFilter(formatted || 'Semua')}
                format="dMyShort"
                placeholder="Semua"
              />
              <button
                type="button"
                onClick={() => setTanggalFilter('Semua')}
                className="px-2 py-0.5 bg-[#E1DFDD] hover:bg-[#F3F2F1] border border-[#ADABA1] text-xs rounded-xs cursor-pointer"
              >
                Semua
              </button>
            </div>
          </div>

          <div className="font-bold text-sm text-gray-900 pr-2">{formatRupiah(totalNilai)}</div>
        </div>

        <div className="flex-1 overflow-auto bg-white border border-[#999999] m-1.5 relative shadow-inner">
          <table className="w-full border-collapse text-left min-w-[1700px]">
            <thead className="sticky top-0 bg-[#F0F0F0] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10">
              <tr>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center w-12">No</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.Bukti</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tanggal</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Nama Supplier</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.PO</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.Faktur Pembelian</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Keterangan</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-right">Nilai Pembelian</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Jth.Tmp</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Sts.Lunas</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Tgl.Lunas</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Sts.Post</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Post</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Dibuat Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Created</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">DiUpdate Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Update</th>
                <th className="px-2 py-1.5 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={18} className="text-center py-8 text-gray-500 italic">
                    Tidak ada data Pembelian Barang
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handleEdit}
                      className={`cursor-pointer border-b border-[#E0E0E0] ${
                        isSelected
                          ? 'bg-[#316AC5] text-white'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-[#F5F5F5]'
                          : 'bg-[#FAFAFA] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{idx + 1}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono font-medium">{item.noBukti}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.tanggal}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-semibold">{item.namaSupplier}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono text-[11px]">{item.noPo}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono text-[11px]">{item.noFaktur}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.keterangan}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-right font-mono">{item.nilaiPembelian}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center text-[11px]">{item.jthTmp}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center font-medium">{item.stsLunas}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center text-[11px]">{item.tglLunas}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{item.stsPost}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-[11px]">{item.tglPost}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.dibuatOleh}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-[11px]">{item.tglCreated}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.diupdateOleh}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-[11px]">{item.tglUpdate}</td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                            isSelected
                              ? 'bg-red-700 text-white hover:bg-red-800'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-t border-[#C0C0C0] gap-2 overflow-x-auto">
          <ToolbarSearchControl
            compact
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onCari={handleExecuteCari}
            onReset={handleResetCari}
            inputRef={searchInputRef}
            isBusy={isBusy}
            inputWidthClass="w-56"
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode (No.Bukti)' },
              { value: 'No.Bukti', label: 'No.Bukti' },
              { value: 'Nama Supplier', label: 'Nama Supplier' },
              { value: 'No.PO', label: 'No.PO' },
              { value: 'No.Faktur Pembelian', label: 'No.Faktur Pembelian' },
              { value: 'Keterangan', label: 'Keterangan' },
            ]}
          />

          <div className="flex items-center space-x-4 shrink-0">
            <div className="w-64 h-5 bg-[#FFFF99] border border-[#C0C0C0] rounded-xs px-2 text-[10px] flex items-center text-gray-700 truncate">
              {pembelianList.find((r) => r.id === selectedId)?.namaSupplier || ''}
            </div>
            <div className="text-gray-800 font-medium">Record : {filteredList.length}</div>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] rounded shadow-2xl w-[780px] max-w-[95vw] max-h-[92vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-[#0055EA] to-[#2B579A] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs shrink-0">
                <span>{editingId ? 'Koreksi Pembelian Barang' : 'Tambah Pembelian Barang Baru'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="text-white hover:bg-red-600 px-1.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3 overflow-y-auto text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-gray-700">No.Bukti:</label>
                      <input
                        type="text"
                        value={newNoBukti}
                        onChange={(e) => setNewNoBukti(e.target.value)}
                        required
                        className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded uppercase font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-gray-700">Tanggal:</label>
                      <div className="w-64">
                        <DatePickerInput
                          value={newTanggal}
                          onChange={(formatted) => setNewTanggal(formatted)}
                          format="dMyShort"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-gray-700">Nama Supplier:</label>
                      <select
                        value={newSupplier}
                        onChange={(e) => setNewSupplier(e.target.value)}
                        required
                        className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded uppercase cursor-pointer"
                      >
                        <option value="">-- Pilih Supplier --</option>
                        {supplierDropdownChoices.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-gray-700">No.PO:</label>
                      <select
                        value={newNoPo}
                        onChange={(e) => applyPurchaseOrderAutoFill(e.target.value)}
                        className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded uppercase cursor-pointer font-mono"
                      >
                        <option value="">-- Pilih Purchase Order --</option>
                        {poDropdownChoices.map((po) => (
                          <option key={po} value={po}>
                            {po}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-gray-700">No.Faktur Pembelian:</label>
                      <input
                        type="text"
                        value={newNoFaktur}
                        onChange={(e) => setNewNoFaktur(e.target.value)}
                        required
                        className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-gray-700">Keterangan:</label>
                      <input
                        type="text"
                        value={newKeterangan}
                        onChange={(e) => setNewKeterangan(e.target.value)}
                        className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-gray-700">Nilai Pembelian:</label>
                      <input
                        type="text"
                        value={formatMoney(detailRows.reduce((acc, r) => acc + r.total, 0) || parseNum(newNilai))}
                        readOnly
                        className="w-64 px-2 py-1 bg-[#F5F5F5] border border-[#7A7A7A] rounded font-mono text-right font-bold"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-gray-700">Jth.Tmp / Sts.Lunas:</label>
                      <div className="w-64 flex items-center space-x-1.5">
                        <div className="flex-1">
                          <DatePickerInput
                            value={newJthTmp}
                            onChange={(formatted) => setNewJthTmp(formatted)}
                            format="dMyShort"
                          />
                        </div>
                        <select
                          value={newStsLunas}
                          onChange={(e) => setNewStsLunas(e.target.value)}
                          className="w-24 px-2 py-1 bg-white border border-[#7A7A7A] rounded"
                        >
                          <option value="Belum">Belum</option>
                          <option value="Lunas">Lunas</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-gray-700">Tgl.Lunas:</label>
                      <div className="w-64">
                        <DatePickerInput
                          value={newTglLunas}
                          onChange={(formatted) => setNewTglLunas(formatted)}
                          format="dMyShort"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-gray-700">Sts.Post / Tgl.Post:</label>
                      <div className="w-64 flex items-center space-x-1.5">
                        <select
                          value={newStsPost}
                          onChange={(e) => setNewStsPost(e.target.value)}
                          className="w-28 px-2 py-1 bg-white border border-[#7A7A7A] rounded"
                        >
                          <option value="Not Yet">Not Yet</option>
                          <option value="Posted">Posted</option>
                        </select>
                        <div className="flex-1">
                          <DatePickerInput
                            value={newTglPost}
                            onChange={(formatted) => setNewTglPost(formatted)}
                            format="dMyShort"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PO Detail / Pembelian Detail Datagrid */}
                <div className="border border-[#7A7A7A] bg-white rounded flex flex-col mt-2">
                  <div className="bg-[#ECE9D8] px-2 py-1 font-bold border-b border-[#7A7A7A] flex justify-between items-center text-[11px]">
                    <span>PO DETAIL BARANG YANG DI-ORDER</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDetailRows([
                          ...detailRows,
                          createBlankDetailRow(detailRows.length + 1),
                        ])
                      }
                      className="px-2 py-0.5 bg-[#E1DFDD] hover:bg-[#D4D0C8] border border-[#7A7A7A] rounded cursor-pointer"
                    >
                      + Tambah Baris
                    </button>
                  </div>
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="sticky top-0 bg-[#F0F0F0] border-b border-[#C0C0C0]">
                        <tr>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-10 text-center">No</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-28">Kode</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0]">Nama Barang</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-20">Unit</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-20 text-right">Terima</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-20 text-right">QTY</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-24 text-right">Harga</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-24 text-right">Jumlah</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-24 text-right">Total</th>
                          <th className="px-2 py-1 text-center w-12">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailRows.map((d, index) => (
                          <tr key={d.id} className="border-b border-[#E0E0E0]">
                            <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{index + 1}</td>
                            <td className="px-1 py-1 border-r border-[#E0E0E0]">
                              <input
                                type="text"
                                value={d.kode}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDetailRows(
                                    detailRows.map((r, i) => (i === index ? { ...r, kode: val } : r))
                                  );
                                }}
                                className="w-full px-1 py-0.5 border border-[#ccc] rounded font-mono uppercase"
                              />
                            </td>
                            <td className="px-1 py-1 border-r border-[#E0E0E0]">
                              <input
                                type="text"
                                value={d.namaBarang}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDetailRows(
                                    detailRows.map((r, i) => (i === index ? { ...r, namaBarang: val } : r))
                                  );
                                }}
                                className="w-full px-1 py-0.5 border border-[#ccc] rounded"
                              />
                            </td>
                            <td className="px-1 py-1 border-r border-[#E0E0E0]">
                              <input
                                type="text"
                                value={d.unit}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDetailRows(
                                    detailRows.map((r, i) => (i === index ? { ...r, unit: val } : r))
                                  );
                                }}
                                className="w-full px-1 py-0.5 border border-[#ccc] rounded uppercase text-center"
                              />
                            </td>
                            <td className="px-1 py-1 border-r border-[#E0E0E0]">
                              <input
                                type="number"
                                value={d.terima}
                                onChange={(e) => {
                                  const val = parseNum(e.target.value);
                                  setDetailRows(
                                    detailRows.map((r, i) => (i === index ? { ...r, terima: val } : r))
                                  );
                                }}
                                className="w-full px-1 py-0.5 border border-[#ccc] rounded text-right font-mono"
                              />
                            </td>
                            <td className="px-1 py-1 border-r border-[#E0E0E0]">
                              <input
                                type="number"
                                value={d.qty}
                                onChange={(e) => {
                                  const val = parseNum(e.target.value);
                                  const jumlah = val * d.harga;
                                  const total = jumlah;
                                  setDetailRows(
                                    detailRows.map((r, i) =>
                                      i === index ? { ...r, qty: val, jumlah, total } : r
                                    )
                                  );
                                }}
                                className="w-full px-1 py-0.5 border border-[#ccc] rounded text-right font-mono"
                              />
                            </td>
                            <td className="px-1 py-1 border-r border-[#E0E0E0]">
                              <input
                                type="number"
                                value={d.harga}
                                onChange={(e) => {
                                  const val = parseNum(e.target.value);
                                  const jumlah = d.qty * val;
                                  const total = jumlah;
                                  setDetailRows(
                                    detailRows.map((r, i) =>
                                      i === index ? { ...r, harga: val, jumlah, total } : r
                                    )
                                  );
                                }}
                                className="w-full px-1 py-0.5 border border-[#ccc] rounded text-right font-mono"
                              />
                            </td>
                            <td className="px-2 py-1 border-r border-[#E0E0E0] text-right font-mono">
                              {formatMoney(d.jumlah)}
                            </td>
                            <td className="px-2 py-1 border-r border-[#E0E0E0] text-right font-mono font-bold">
                              {formatMoney(d.total)}
                            </td>
                            <td className="px-1 py-1 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setDetailRows(detailRows.filter((_, i) => i !== index))
                                }
                                className="px-1 py-0.5 bg-red-100 text-red-700 hover:bg-red-200 rounded font-bold text-[10px] cursor-pointer"
                              >
                                X
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit Fields */}
                <div className="border-t border-[#D0D0D0] pt-2 grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Dibuat Oleh:</label>
                    <input
                      type="text"
                      value={newDibuatOleh}
                      onChange={(e) => setNewDibuatOleh(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded uppercase text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Tgl.Created:</label>
                    <DatePickerInput
                      value={newTglCreated}
                      onChange={(formatted) => setNewTglCreated(formatted)}
                      format="dMyShort"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Diupdate Oleh:</label>
                    <input
                      type="text"
                      value={newDiupdateOleh}
                      onChange={(e) => setNewDiupdateOleh(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded uppercase text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Tgl.Update:</label>
                    <DatePickerInput
                      value={newTglUpdate}
                      onChange={(formatted) => setNewTglUpdate(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>

                {modalError && (
                  <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                    ⚠ {modalError}
                  </div>
                )}
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#D0D0D0]">
                  <button
                    type="button"
                    onClick={() => {
                      setModalError(null);
                      setIsAddOpen(false);
                    }}
                    className="px-3 py-1 bg-[#E1DFDD] border border-[#ADABA1] rounded text-xs hover:bg-[#F3F2F1] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="px-3 py-1 bg-[#0055EA] text-white border border-blue-800 rounded text-xs hover:bg-blue-700 cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <A4PrintPreviewModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title="LAPORAN LIST PEMBELIAN BARANG"
          subtitle={`Filter Tanggal: ${tanggalFilter}`}
          orientation="landscape"
          columns={[
            { header: 'No.Bukti', accessor: 'noBukti', width: '110px' },
            { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '80px' },
            { header: 'Nama Supplier', accessor: 'namaSupplier' },
            { header: 'No.PO', accessor: 'noPo', width: '100px' },
            { header: 'No.Faktur', accessor: 'noFaktur', width: '105px' },
            { header: 'Keterangan', accessor: 'keterangan' },
            { header: 'Nilai', accessor: 'nilaiPembelian', align: 'right', width: '95px' },
            { header: 'Lunas', accessor: 'stsLunas', align: 'center', width: '60px' },
            { header: 'Dibuat Oleh', accessor: 'dibuatOleh', width: '80px' },
          ]}
          rows={filteredList}
          summaryItems={[
            { label: 'Total Record', value: `${filteredList.length} Transaksi` },
            { label: 'Total Pembelian', value: formatRupiah(totalNilai) },
          ]}
          selectedRow={selectedPembelian}
          selectedRows={selectedPembelianDetails.length > 0 ? selectedPembelianDetails : undefined}
          selectedTitle={
            selectedPembelianDetails.length > 0
              ? 'BUKTI PEMBELIAN BARANG (RECORD TERPILIH)'
              : 'PEMBELIAN BARANG (RECORD TERPILIH)'
          }
          selectedSubtitle={
            selectedPembelian
              ? `No. Bukti: ${selectedPembelian.noBukti} | Supplier: ${selectedPembelian.namaSupplier}`
              : undefined
          }
          selectedMetaLines={
            selectedPembelian
              ? [
                  { label: 'No. Bukti', value: selectedPembelian.noBukti },
                  { label: 'Tanggal', value: selectedPembelian.tanggal },
                  { label: 'Nama Supplier', value: selectedPembelian.namaSupplier },
                  { label: 'No. PO', value: selectedPembelian.noPo || '-' },
                  { label: 'No. Faktur', value: selectedPembelian.noFaktur || '-' },
                  { label: 'Sts. Lunas', value: selectedPembelian.stsLunas },
                  { label: 'Keterangan', value: selectedPembelian.keterangan || '-' },
                ]
              : undefined
          }
          selectedColumns={
            selectedPembelianDetails.length > 0
              ? [
                  { header: 'Kode', accessor: 'kode', width: '90px' },
                  { header: 'Nama Barang', accessor: 'namaBarang' },
                  { header: 'Unit', accessor: 'unit', align: 'center', width: '60px' },
                  { header: 'Terima', accessor: (r: PembelianDetailItem) => formatMoney(r.terima), align: 'right', width: '65px' },
                  { header: 'QTY', accessor: (r: PembelianDetailItem) => formatMoney(r.qty), align: 'right', width: '65px' },
                  { header: 'Harga', accessor: (r: PembelianDetailItem) => formatMoney(r.harga), align: 'right', width: '95px' },
                  { header: 'Jumlah', accessor: (r: PembelianDetailItem) => formatMoney(r.jumlah), align: 'right', width: '100px' },
                  { header: 'Total', accessor: (r: PembelianDetailItem) => formatMoney(r.total), align: 'right', width: '105px' },
                ]
              : undefined
          }
          selectedSummaryItems={
            selectedPembelian
              ? [
                  { label: 'No. Bukti', value: selectedPembelian.noBukti },
                  { label: 'Nilai Pembelian', value: formatRupiah(selectedPembelian.nilaiPembelianNum) },
                ]
              : undefined
          }
        />

        <SupabaseFindModal
          isOpen={isFindOpen}
          onClose={() => setIsFindOpen(false)}
          tableLabel="Pembelian Barang"
          rows={pembelianList}
          selectedId={selectedId}
          getRowId={(r) => r.id}
          getSearchValues={(r) => [
            r.noBukti,
            r.tanggal,
            r.namaSupplier,
            r.noPo,
            r.noFaktur,
            r.keterangan,
            r.nilaiPembelian,
            r.stsLunas,
          ]}
          initialQuery={searchTerm}
          isBusy={isBusy}
          onSearchSupabase={(q) => {
            setSearchField('Semua');
            setSearchTerm(q);
            return loadData({ field: 'Semua', term: q, tglFilter: 'Semua' });
          }}
          onRefreshSupabase={() => {
            setSearchField('Semua');
            setSearchTerm('');
            setTanggalFilter('Semua');
            return loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
          }}
          onSelectRow={(row, q) => {
            setSelectedId(row.id);
            setSearchTerm(q);
            showFeedback(`Pembelian [${row.noBukti} - ${row.namaSupplier}] dipilih`);
          }}
          columns={[
            { header: 'Kode / No.Bukti', accessor: (r) => r.noBukti, widthClass: 'w-32', mono: true, bold: true },
            { header: 'Tanggal', accessor: (r) => r.tanggal, widthClass: 'w-22', align: 'center' },
            { header: 'Nama Supplier', accessor: (r) => r.namaSupplier, bold: true },
            { header: 'No.PO', accessor: (r) => r.noPo, widthClass: 'w-28', mono: true },
            { header: 'No.Faktur', accessor: (r) => r.noFaktur, widthClass: 'w-28', mono: true },
            { header: 'Nilai Pembelian', accessor: (r) => r.nilaiPembelian, widthClass: 'w-28', align: 'right', mono: true },
          ]}
        />
      </div>
    </div>
  );
};
