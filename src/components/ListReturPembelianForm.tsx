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

export interface ReturPembelianDetailItem {
  id: string;
  returId?: string;
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

export interface ReturPembelianItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaSupplier: string;
  noPo: string;
  noFaktur: string;
  nilaiRetur: string;
  nilaiReturNum: number;
  keterangan: string;
  mataUang: string;
  disc: string;
  ppn: string;
  stsPrint: string;
  tglPrint: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

export interface PembelianOrderRef {
  id: string;
  noBukti: string;
  namaSupplier: string;
  noFaktur: string;
  keterangan: string;
  nilaiPembelian: number;
}

interface ListReturPembelianFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToReturPembelian(r: any): ReturPembelianItem {
  const valNum = Number(r.nilai_retur || 0);
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaSupplier: r.nama_supplier || '',
    noPo: r.no_po || '-',
    noFaktur: r.no_faktur || '-',
    nilaiRetur: formatMoney(valNum),
    nilaiReturNum: valNum,
    keterangan: r.keterangan || '',
    mataUang: r.mata_uang || 'IDR',
    disc: `${Number(r.disc || 0)}%`,
    ppn: `${Number(r.ppn || 11)}%`,
    stsPrint: r.sts_print || 'Not Yet',
    tglPrint: toDisplayDMyShort(r.tgl_print) || '-',
    stsPost: r.sts_post || 'Posted',
    tglPost: toDisplayDMyShort(r.tgl_post) || '-',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

function mapDbToDetail(d: any, idx = 0): ReturPembelianDetailItem {
  const qty = Number(d.qty || 0);
  const harga = Number(d.harga || 0);
  const jumlah = d.jumlah !== undefined && d.jumlah !== null ? Number(d.jumlah) : qty * harga;
  const total = d.total !== undefined && d.total !== null ? Number(d.total) : jumlah;
  return {
    id: d.id || `det-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    returId: d.retur_id,
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

function createBlankDetailRow(noUrut: number): ReturPembelianDetailItem {
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

export const ListReturPembelianForm: React.FC<ListReturPembelianFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [returList, setReturList] = useState<ReturPembelianItem[]>([]);
  const [returDetailsMap, setReturDetailsMap] = useState<Record<string, ReturPembelianDetailItem[]>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [pembelianOptions, setPembelianOptions] = useState<PembelianOrderRef[]>([]);
  const [pembelianDetailsByNoPoMap, setPembelianDetailsByNoPoMap] = useState<Record<string, ReturPembelianDetailItem[]>>({});

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newSupplier, setNewSupplier] = useState<string>('');
  const [newNoPo, setNewNoPo] = useState<string>('');
  const [newNoFaktur, setNewNoFaktur] = useState<string>('');
  const [newNilaiRetur, setNewNilaiRetur] = useState<string>('0');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newMataUang, setNewMataUang] = useState<string>('IDR');
  const [newDisc, setNewDisc] = useState<string>('0');
  const [newPpn, setNewPpn] = useState<string>('11');
  const [newStsPrint, setNewStsPrint] = useState<string>('Not Yet');
  const [newTglPrint, setNewTglPrint] = useState<string>('');
  const [newStsPost, setNewStsPost] = useState<string>('Posted');
  const [newTglPost, setNewTglPost] = useState<string>('');

  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');

  const [detailRows, setDetailRows] = useState<ReturPembelianDetailItem[]>([]);

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
    const [suppRes, pembRes, pembDetRes] = await Promise.allSettled([
      erpList<any>('master_suppliers', { orderBy: 'nama_supplier', asc: true, limit: 1000 }),
      erpList<any>('pembelian_barangs', { orderBy: 'tanggal', asc: false, limit: 1000 }),
      erpList<any>('pembelian_barang_details', { orderBy: 'no_urut', asc: true, limit: 5000 }),
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

    const pembIdToNoBukti = new Map<string, string>();
    if (pembRes.status === 'fulfilled') {
      const pems: PembelianOrderRef[] = pembRes.value
        .map((p: any) => {
          const noBukti = String(p.no_bukti || '').trim().toUpperCase();
          if (noBukti) pembIdToNoBukti.set(String(p.id), noBukti);
          return {
            id: String(p.id || ''),
            noBukti,
            namaSupplier: String(p.nama_supplier || '').trim().toUpperCase(),
            noFaktur: String(p.no_faktur || '').trim().toUpperCase(),
            keterangan: String(p.keterangan || '').trim(),
            nilaiPembelian: Number(p.nilai_pembelian || 0),
          };
        })
        .filter((p: PembelianOrderRef) => p.noBukti);
      setPembelianOptions(pems);
    }

    if (pembDetRes.status === 'fulfilled') {
      const grouped: Record<string, ReturPembelianDetailItem[]> = {};
      for (const raw of pembDetRes.value) {
        const mapped = mapDbToDetail(raw, 0);
        const keys = Array.from(
          new Set(
            [
              String(raw.no_bukti || '').trim().toUpperCase(),
              pembIdToNoBukti.get(String(raw.pembelian_id || '')) || '',
            ].filter(Boolean)
          )
        );
        for (const k of keys) {
          if (!grouped[k]) grouped[k] = [];
          grouped[k].push({ ...mapped, noUrut: grouped[k].length + 1 });
        }
      }
      setPembelianDetailsByNoPoMap(grouped);
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
  }): Promise<ReturPembelianItem[] | null> => {
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
        erpList<any>('retur_pembelians', queryOpts),
        erpList<any>('retur_pembelian_details', { orderBy: 'no_urut', asc: true }).catch(() => []),
        loadMasterReferences(),
      ]);

      const mappedDetails: Record<string, ReturPembelianDetailItem[]> = {};
      for (const d of detRows) {
        const rId = String(d.retur_id || '');
        if (!mappedDetails[rId]) mappedDetails[rId] = [];
        mappedDetails[rId].push(mapDbToDetail(d, mappedDetails[rId].length));
      }
      setReturDetailsMap(mappedDetails);

      const mapped = rows.map(mapDbToReturPembelian);
      setReturList(mapped);
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
    const selected = returList.find((r) => r.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record Retur Pembelian terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const details = returDetailsMap[selected.id] || [];
      const headerPayload: Record<string, any> = {
        id: selected.id,
        no_bukti: selected.noBukti.trim().toUpperCase(),
        tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
        nama_supplier: selected.namaSupplier.trim().toUpperCase(),
        no_po: selected.noPo.trim().toUpperCase() || '-',
        no_faktur: selected.noFaktur.trim().toUpperCase() || '-',
        nilai_retur: selected.nilaiReturNum,
        keterangan: selected.keterangan.trim(),
        mata_uang: selected.mataUang.trim().toUpperCase() || 'IDR',
        disc: parseNum(selected.disc),
        ppn: parseNum(selected.ppn),
        sts_print: selected.stsPrint,
        tgl_print: selected.tglPrint !== '-' ? toIsoDate(selected.tglPrint) : null,
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
        'retur-pembelian',
        headerPayload,
        detailsPayload
      );
      const mapped = mapDbToReturPembelian(saved.header);
      const mappedDet = (saved.details || []).map((d: any, idx: number) => mapDbToDetail(d, idx));
      setReturList((prev) => prev.map((r) => (r.id === mapped.id ? mapped : r)));
      setReturDetailsMap((prev) => ({ ...prev, [mapped.id]: mappedDet }));
      setSelectedId(mapped.id);
      showFeedback(`Retur Pembelian [${mapped.noBukti}] tersimpan ke Supabase`);
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

  const applyPembelianAutoFill = (rawNoPo: string) => {
    const cleanNoPo = rawNoPo.trim().toUpperCase();
    setNewNoPo(cleanNoPo);
    if (!cleanNoPo) return;

    const matchedPem = pembelianOptions.find((p) => p.noBukti === cleanNoPo);
    if (matchedPem) {
      if (matchedPem.namaSupplier) setNewSupplier(matchedPem.namaSupplier);
      if (matchedPem.noFaktur) setNewNoFaktur(matchedPem.noFaktur);
      if (matchedPem.keterangan && !newKeterangan.trim()) {
        setNewKeterangan(matchedPem.keterangan);
      }
    }

    const items = (pembelianDetailsByNoPoMap[cleanNoPo] || []).map((d, idx) => ({
      ...d,
      id: `pemb-fill-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      noUrut: idx + 1,
    }));

    if (items.length > 0) {
      setDetailRows(items);
      const sum = items.reduce((acc, item) => acc + item.total, 0);
      setNewNilaiRetur(String(sum > 0 ? sum : matchedPem?.nilaiPembelian || 0));
    } else {
      setDetailRows([createBlankDetailRow(1)]);
      if (matchedPem) {
        setNewNilaiRetur(String(matchedPem.nilaiPembelian || 0));
      }
    }
  };

  const handleAddNew = async () => {
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setNewNoBukti(nextUniqueCode(returList.map((r) => r.noBukti), '2608-RP-IMP-', 3));
    setNewTanggal(todayDisp);
    setNewSupplier('');
    setNewNoPo('');
    setNewNoFaktur('');
    setNewNilaiRetur('0');
    setNewKeterangan('');
    setNewMataUang('IDR');
    setNewDisc('0');
    setNewPpn('11');
    setNewStsPrint('Not Yet');
    setNewTglPrint('');
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
    const item = returList.find((r) => r.id === selectedId);
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
    setNewNilaiRetur(String(item.nilaiReturNum));
    setNewKeterangan(item.keterangan);
    setNewMataUang(item.mataUang);
    setNewDisc(String(parseNum(item.disc)));
    setNewPpn(String(parseNum(item.ppn)));
    setNewStsPrint(item.stsPrint || 'Not Yet');
    setNewTglPrint(item.tglPrint === '-' ? '' : item.tglPrint);
    setNewStsPost(item.stsPost || 'Posted');
    setNewTglPost(item.tglPost === '-' ? '' : item.tglPost);
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser);
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);

    const existingDet = returDetailsMap[item.id] || [];
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
    if (!newNoBukti.trim() || !newSupplier.trim()) {
      setModalError('No. Bukti Retur dan Nama Supplier wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglIso = toIsoDate(newTanggal) || todayIso();
      const totalDetailSum = detailRows.reduce((acc, r) => acc + r.total, 0);
      const finalNilai = totalDetailSum > 0 ? totalDetailSum : parseNum(newNilaiRetur);

      const headerPayload: Record<string, any> = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_supplier: newSupplier.trim().toUpperCase(),
        no_po: newNoPo.trim().toUpperCase() || '-',
        no_faktur: newNoFaktur.trim().toUpperCase() || '-',
        nilai_retur: finalNilai,
        keterangan: newKeterangan.trim(),
        mata_uang: newMataUang.trim().toUpperCase(),
        disc: parseNum(newDisc),
        ppn: parseNum(newPpn),
        sts_print: newStsPrint,
        tgl_print: toIsoDate(newTglPrint) || (newStsPrint === 'Printed' ? todayIso() : null),
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
        'retur-pembelian',
        headerPayload,
        detailsPayload
      );

      const mapped = mapDbToReturPembelian(saved.header);
      const mappedDet = (saved.details || []).map((d: any, idx: number) => mapDbToDetail(d, idx));

      if (editingId) {
        setReturList(returList.map((r) => (r.id === editingId ? mapped : r)));
        setReturDetailsMap({ ...returDetailsMap, [editingId]: mappedDet });
        showFeedback('Retur Pembelian diperbarui');
      } else {
        setReturList([mapped, ...returList]);
        setReturDetailsMap({ ...returDetailsMap, [mapped.id]: mappedDet });
        setSelectedId(mapped.id);
        showFeedback('Retur Pembelian tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Retur Pembelian';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('retur_pembelian_details', id, 'retur_id').catch(() => {});
      await erpDelete('retur_pembelians', id);
      const updated = returList.filter((item) => item.id !== id);
      setReturList(updated);
      setReturDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Retur Pembelian dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = returList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (searchField === 'Kode' || searchField === 'No.Bukti') return matchesMultiKeyword([item.noBukti], searchTerm);
    if (searchField === 'Nama Supplier') return matchesMultiKeyword([item.namaSupplier], searchTerm);
    if (searchField === 'No.PO') return matchesMultiKeyword([item.noPo], searchTerm);
    if (searchField === 'No.Faktur Pembelian') return matchesMultiKeyword([item.noFaktur], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
    return matchesMultiKeyword(
      [item.noBukti, item.tanggal, item.namaSupplier, item.noPo, item.noFaktur, item.keterangan, item.mataUang],
      searchTerm
    );
  });

  const totalNilaiRetur = filteredList.reduce((acc, r) => acc + r.nilaiReturNum, 0);

  const selectedRetur =
    filteredList.find((r) => r.id === selectedId) ||
    returList.find((r) => r.id === selectedId) ||
    null;
  const selectedReturDetails = selectedRetur ? returDetailsMap[selectedRetur.id] || [] : [];

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm, tglFilter: tanggalFilter });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Retur Pembelian dari Supabase`
          : 'Data Retur Pembelian tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setTanggalFilter('Semua');
    const rows = await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
    if (rows) showFeedback(`Filter direset (${rows.length} Retur Pembelian)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Retur_Pembelian',
      sheetTitle: 'LIST RETUR PEMBELIAN BARANG',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Supplier', accessor: 'namaSupplier' },
        { header: 'No.PO', accessor: 'noPo' },
        { header: 'No.Faktur Pembelian', accessor: 'noFaktur' },
        { header: 'Nilai Retur', accessor: 'nilaiReturNum', align: 'right' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Mata Uang', accessor: 'mataUang', align: 'center' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const supplierDropdownChoices = Array.from(
    new Set([...supplierOptions, newSupplier.trim().toUpperCase()].filter(Boolean))
  );

  const pembelianDropdownChoices = Array.from(
    new Set([...pembelianOptions.map((p) => p.noBukti), newNoPo.trim().toUpperCase()].filter(Boolean))
  );

  return (
    <div
      id="list-retur-pembelian-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Retur Pembelian Barang"
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

          <div className="font-bold text-sm text-gray-900 pr-2">{formatRupiah(totalNilaiRetur)}</div>
        </div>

        <div className="flex-1 overflow-auto bg-white border border-[#7F9DB9] m-2 shadow-inner relative">
          <table className="w-full border-collapse text-xs whitespace-nowrap min-w-[1700px]">
            <thead>
              <tr className="bg-[#EBE9ED] text-black font-semibold sticky top-0 z-10 border-b border-[#919B9C] select-none">
                <th className="px-2 py-1.5 text-center border-r border-[#C0C0C0] w-[45px]">No</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[130px]">No.Bukti</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tanggal</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[190px]">Nama Supplier</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[130px]">No.PO</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[130px]">No.Faktur Pembelian</th>
                <th className="px-2.5 py-1.5 text-right border-r border-[#C0C0C0] min-w-[100px]">Nilai Retur</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[200px]">Keterangan</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[70px]">Mata Uang</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[60px]">Disc</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[60px]">PPN</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[80px]">Sts.Print</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Print</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[80px]">Sts.Post</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Post</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[100px]">Dibuat Oleh</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Created</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[110px]">DiUpdate Oleh</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Update</th>
                <th className="px-2.5 py-1.5 text-center min-w-[70px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item, index) => {
                const isSelected = selectedId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    onDoubleClick={handleEdit}
                    className={`cursor-pointer border-b border-[#E0E0E0] ${
                      isSelected
                        ? 'bg-[#316AC5] text-white'
                        : index % 2 === 0
                        ? 'bg-white hover:bg-[#F0F4F8]'
                        : 'bg-[#F9F9F8] hover:bg-[#F0F4F8]'
                    }`}
                  >
                    <td className="px-2 py-1 text-center border-r border-[#E0E0E0] font-mono">{index + 1}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-mono font-medium">{item.noBukti}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tanggal}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-medium">{item.namaSupplier}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-mono">{item.noPo}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-mono">{item.noFaktur}</td>
                    <td className="px-2.5 py-1 text-right border-r border-[#E0E0E0] font-mono">{item.nilaiRetur}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">{item.keterangan}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.mataUang}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.disc}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.ppn}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          item.stsPrint === 'Printed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.stsPrint}
                      </span>
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglPrint}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800">
                        {item.stsPost}
                      </span>
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglPost}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">{item.dibuatOleh}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglCreated}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">{item.diupdateOleh}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglUpdate}</td>
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={20} className="text-center py-8 text-gray-500 italic">
                    Tidak ada data Retur Pembelian yang ditemukan.
                  </td>
                </tr>
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

          <div className="flex items-center space-x-4 text-gray-700 shrink-0">
            <div className="w-64 h-5 bg-[#FFFF99] border border-[#C0C0C0] rounded-xs px-2 text-[10px] flex items-center text-gray-700 truncate">
              {returList.find((r) => r.id === selectedId)?.namaSupplier || ''}
            </div>
            <span>Record: {filteredList.length}</span>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-[820px] max-w-[95vw] max-h-[92vh] bg-[#ECE9D8] border-2 border-[#0055EA] rounded-[3px] shadow-[4px_4px_12px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden font-sans text-xs">
            <div className="flex items-center justify-between h-[28px] bg-gradient-to-r from-[#0055EA] to-[#1E90FF] text-white px-2 font-bold shrink-0">
              <span>{editingId ? 'Koreksi Retur Pembelian Barang' : 'Tambah Retur Pembelian Barang Baru'}</span>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsAddOpen(false);
                }}
                className="w-[20px] h-[20px] bg-[#C75050] hover:bg-red-600 text-white rounded-[2px] flex items-center justify-center text-[11px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3 bg-[#ECE9D8] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-gray-700">No. Bukti Retur:</label>
                    <input
                      type="text"
                      value={newNoBukti}
                      onChange={(e) => setNewNoBukti(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] font-mono uppercase"
                      required
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
                      className="w-64 px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] uppercase cursor-pointer"
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
                    <label className="font-semibold text-gray-700">No. PO (Pembelian):</label>
                    <select
                      value={newNoPo}
                      onChange={(e) => applyPembelianAutoFill(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] uppercase cursor-pointer font-mono"
                    >
                      <option value="">-- Pilih No. Pembelian / PO --</option>
                      {pembelianDropdownChoices.map((po) => (
                        <option key={po} value={po}>
                          {po}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-gray-700">No. Faktur Pembelian:</label>
                    <input
                      type="text"
                      value={newNoFaktur}
                      onChange={(e) => setNewNoFaktur(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] uppercase font-mono"
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
                      className="w-64 px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-gray-700">Nilai Retur:</label>
                    <input
                      type="text"
                      value={formatMoney(detailRows.reduce((acc, r) => acc + r.total, 0) || parseNum(newNilaiRetur))}
                      readOnly
                      className="w-64 px-2 py-1 bg-[#F5F5F5] border border-[#7F9DB9] rounded-[2px] font-mono text-right font-bold"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-gray-700">Mata Uang / Disc / PPN:</label>
                    <div className="w-64 flex gap-1 items-center">
                      <select
                        value={newMataUang}
                        onChange={(e) => setNewMataUang(e.target.value)}
                        className="w-20 px-1 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                      >
                        <option value="IDR">IDR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                      <input
                        type="number"
                        value={newDisc}
                        onChange={(e) => setNewDisc(e.target.value)}
                        placeholder="Disc%"
                        className="w-20 px-1 py-1 bg-white border border-[#7F9DB9] rounded-[2px] text-center"
                      />
                      <input
                        type="number"
                        value={newPpn}
                        onChange={(e) => setNewPpn(e.target.value)}
                        placeholder="PPN%"
                        className="w-20 px-1 py-1 bg-white border border-[#7F9DB9] rounded-[2px] text-center"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-gray-700">Sts.Print / Tgl.Print:</label>
                    <div className="w-64 flex gap-1.5 items-center">
                      <select
                        value={newStsPrint}
                        onChange={(e) => setNewStsPrint(e.target.value)}
                        className="w-24 px-1.5 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                      >
                        <option value="Not Yet">Not Yet</option>
                        <option value="Printed">Printed</option>
                      </select>
                      <div className="flex-1">
                        <DatePickerInput
                          value={newTglPrint}
                          onChange={(formatted) => setNewTglPrint(formatted)}
                          format="dMyShort"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-gray-700">Sts.Post / Tgl.Post:</label>
                    <div className="w-64 flex gap-1.5 items-center">
                      <select
                        value={newStsPost}
                        onChange={(e) => setNewStsPost(e.target.value)}
                        className="w-24 px-1.5 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
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

              {/* PO Detail / Retur Detail Datagrid */}
              <div className="border border-[#7F9DB9] bg-white rounded flex flex-col mt-2">
                <div className="bg-[#ECE9D8] px-2 py-1 font-bold border-b border-[#7F9DB9] flex justify-between items-center text-[11px]">
                  <span>RETUR DETAIL BARANG (KODE, NAMA BARANG, UNIT, TERIMA, QTY, HARGA, JUMLAH, TOTAL)</span>
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
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded uppercase text-xs"
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
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded uppercase text-xs"
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

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#D4D0C8]">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1.5 bg-[#E1DFDD] hover:bg-[#F3F2F1] active:bg-[#C8C6C4] border border-[#ADABA1] text-black font-semibold rounded-[2px] shadow-xs cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="px-4 py-1.5 bg-[#E1DFDD] hover:bg-[#F3F2F1] active:bg-[#C8C6C4] border border-[#ADABA1] text-black rounded-[2px] shadow-xs cursor-pointer"
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
        title="LAPORAN RETUR PEMBELIAN BARANG"
        subtitle={`Filter Tanggal: ${tanggalFilter}`}
        orientation="landscape"
        columns={[
          { header: 'No.Bukti', accessor: 'noBukti', width: '115px' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '85px' },
          { header: 'Nama Supplier', accessor: 'namaSupplier' },
          { header: 'No.PO', accessor: 'noPo', width: '100px' },
          { header: 'No.Faktur', accessor: 'noFaktur', width: '105px' },
          { header: 'Nilai Retur', accessor: 'nilaiRetur', align: 'right', width: '100px' },
          { header: 'Mata Uang', accessor: 'mataUang', align: 'center', width: '65px' },
          { header: 'Keterangan', accessor: 'keterangan' },
          { header: 'Sts.Post', accessor: 'stsPost', align: 'center', width: '70px' },
        ]}
        rows={filteredList}
        summaryItems={[
          { label: 'Total Record', value: `${filteredList.length} Transaksi` },
          { label: 'Total Nilai Retur', value: formatRupiah(totalNilaiRetur) },
        ]}
        selectedRow={selectedRetur}
        selectedRows={selectedReturDetails.length > 0 ? selectedReturDetails : undefined}
        selectedTitle={
          selectedReturDetails.length > 0
            ? 'BUKTI RETUR PEMBELIAN BARANG (RECORD TERPILIH)'
            : 'RETUR PEMBELIAN BARANG (RECORD TERPILIH)'
        }
        selectedSubtitle={
          selectedRetur
            ? `No. Bukti: ${selectedRetur.noBukti} | Supplier: ${selectedRetur.namaSupplier}`
            : undefined
        }
        selectedMetaLines={
          selectedRetur
            ? [
                { label: 'No. Bukti', value: selectedRetur.noBukti },
                { label: 'Tanggal', value: selectedRetur.tanggal },
                { label: 'Nama Supplier', value: selectedRetur.namaSupplier },
                { label: 'No. PO', value: selectedRetur.noPo || '-' },
                { label: 'No. Faktur', value: selectedRetur.noFaktur || '-' },
                { label: 'Mata Uang', value: selectedRetur.mataUang },
                { label: 'Keterangan', value: selectedRetur.keterangan || '-' },
              ]
            : undefined
        }
        selectedColumns={
          selectedReturDetails.length > 0
            ? [
                { header: 'Kode', accessor: 'kode', width: '90px' },
                { header: 'Nama Barang', accessor: 'namaBarang' },
                { header: 'Unit', accessor: 'unit', align: 'center', width: '60px' },
                { header: 'Terima', accessor: (r: ReturPembelianDetailItem) => formatMoney(r.terima), align: 'right', width: '65px' },
                { header: 'QTY', accessor: (r: ReturPembelianDetailItem) => formatMoney(r.qty), align: 'right', width: '65px' },
                { header: 'Harga', accessor: (r: ReturPembelianDetailItem) => formatMoney(r.harga), align: 'right', width: '95px' },
                { header: 'Jumlah', accessor: (r: ReturPembelianDetailItem) => formatMoney(r.jumlah), align: 'right', width: '100px' },
                { header: 'Total', accessor: (r: ReturPembelianDetailItem) => formatMoney(r.total), align: 'right', width: '105px' },
              ]
            : undefined
        }
        selectedSummaryItems={
          selectedRetur
            ? [
                { label: 'No. Bukti', value: selectedRetur.noBukti },
                { label: 'Nilai Retur', value: formatRupiah(selectedRetur.nilaiReturNum) },
              ]
            : undefined
        }
      />

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Retur Pembelian"
        rows={returList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.noBukti,
          r.tanggal,
          r.namaSupplier,
          r.noPo,
          r.noFaktur,
          r.nilaiRetur,
          r.keterangan,
          r.mataUang,
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
          showFeedback(`Retur Pembelian [${row.noBukti} - ${row.namaSupplier}] dipilih`);
        }}
        columns={[
          { header: 'Kode / No.Bukti', accessor: (r) => r.noBukti, widthClass: 'w-32', mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal, widthClass: 'w-22', align: 'center' },
          { header: 'Nama Supplier', accessor: (r) => r.namaSupplier, bold: true },
          { header: 'No.PO', accessor: (r) => r.noPo, widthClass: 'w-28', mono: true },
          { header: 'No.Faktur', accessor: (r) => r.noFaktur, widthClass: 'w-28', mono: true },
          { header: 'Nilai Retur', accessor: (r) => r.nilaiRetur, widthClass: 'w-28', align: 'right', mono: true },
        ]}
      />
    </div>
  );
};
