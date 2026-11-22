import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import { ConfirmDialog } from './ConfirmDialog';
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

export interface SalesInquiryItem {
  id: string;
  noBukti: string;
  tanggalSi: string;
  tanggalSiIso: string;
  namaCustomer: string;
  namaSales: string;
  qty: number;
  keterangan: string;
  follow: string;
  tglFollow: string;
  noSq: string;
  tglSq: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

export interface SalesInquiryDetailItem {
  id: string;
  siId?: string;
  noUrut: number;
  kode: string;
  namaBarang: string;
  unit: string;
  qty: number;
  targetHarga: number;
  keterangan: string;
}

interface MasterCustomerOption {
  namaCustomer: string;
  sales: string;
}

interface MasterBarangOption {
  kode: string;
  namaBarang: string;
  unit: string;
  price: number;
}

interface ListSalesInquiryFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToInquiry(r: any): SalesInquiryItem {
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggalSi: toDisplayDMyShort(r.tanggal_si || r.tanggal_do),
    tanggalSiIso: toIsoDate(r.tanggal_si || r.tanggal_do) || '',
    namaCustomer: r.nama_customer || '',
    namaSales: r.nama_sales || '',
    qty: Number(r.qty ?? 0),
    keterangan: r.keterangan || '',
    follow: r.follow || 'Follow',
    tglFollow: toDisplayDMyShort(r.tgl_follow) || '-',
    noSq: r.no_sq || '-',
    tglSq: toDisplayDMyShort(r.tgl_sq) || '-',
    dibuatOleh: r.dibuat_oleh || getCurrentUser().username || 'ADMIN',
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

function mapDbToInquiryDetail(d: any, idx = 0): SalesInquiryDetailItem {
  return {
    id: d.id || `sid-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    siId: d.si_id,
    noUrut: Number(d.no_urut ?? idx + 1),
    kode: String(d.kode || '').trim().toUpperCase(),
    namaBarang: String(d.nama_barang || '').trim(),
    unit: String(d.unit || 'PCS').trim().toUpperCase(),
    qty: Number(d.qty || 0),
    targetHarga: Number(d.target_harga || 0),
    keterangan: String(d.keterangan || '').trim(),
  };
}

function createBlankInquiryDetailRow(noUrut: number): SalesInquiryDetailItem {
  return {
    id: `new-sid-${Date.now()}-${noUrut}-${Math.random().toString(36).slice(2, 6)}`,
    noUrut,
    kode: '',
    namaBarang: '',
    unit: 'PCS',
    qty: 1,
    targetHarga: 0,
    keterangan: '',
  };
}

export const ListSalesInquiryForm: React.FC<ListSalesInquiryFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [inquiryList, setInquiryList] = useState<SalesInquiryItem[]>([]);
  const [siDetailsMap, setSiDetailsMap] = useState<Record<string, SalesInquiryDetailItem[]>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<'list' | 'detail'>('list');
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<SalesInquiryItem | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [customerOptions, setCustomerOptions] = useState<MasterCustomerOption[]>([]);
  const [salesOptions, setSalesOptions] = useState<string[]>([]);
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);

  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggalSi, setNewTanggalSi] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('');
  const [newQty, setNewQty] = useState<string>('0');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newFollow, setNewFollow] = useState<string>('Follow');
  const [newTglFollow, setNewTglFollow] = useState<string>('');
  const [newNoSq, setNewNoSq] = useState<string>('');
  const [newTglSq, setNewTglSq] = useState<string>('');
  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');
  const [detailRows, setDetailRows] = useState<SalesInquiryDetailItem[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const loadMasterReferences = async () => {
    const [custRes, salesRes, barangRes] = await Promise.allSettled([
      erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true, limit: 1000 }),
      erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true, limit: 1000 }),
      erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 }),
    ]);

    if (custRes.status === 'fulfilled') {
      const custMap = new Map<string, MasterCustomerOption>();
      for (const c of custRes.value) {
        if (c.is_active === false) continue;
        const namaCustomer = String(c.nama_customer || '').trim().toUpperCase();
        if (!namaCustomer) continue;
        custMap.set(namaCustomer, {
          namaCustomer,
          sales: String(c.sales || '').trim().toUpperCase(),
        });
      }
      setCustomerOptions(Array.from(custMap.values()));
    }

    if (salesRes.status === 'fulfilled') {
      const loadedSales = Array.from(
        new Set(
          salesRes.value
            .filter((s: any) => s.is_active !== false)
            .map((s: any) => String(s.nama_sales || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setSalesOptions(loadedSales);
    }

    if (barangRes.status === 'fulfilled') {
      setBarangOptions(
        barangRes.value
          .filter((b: any) => b.is_active !== false)
          .map((b: any) => ({
            kode: String(b.kode || '').trim().toUpperCase(),
            namaBarang: String(b.nama_barang || '').trim(),
            unit: String(b.unit || 'PCS').trim().toUpperCase(),
            price: Number(b.price || 0),
          }))
          .filter((b: MasterBarangOption) => Boolean(b.kode))
      );
    }
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'no_bukti',
    NoBukti: 'no_bukti',
    'Nama Pelanggan': 'nama_customer',
    'Nama Sales': 'nama_sales',
    'No.SQ': 'no_sq',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
  }): Promise<SalesInquiryItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = {
        orderBy: 'tanggal_si',
        asc: false,
        limit: 1000,
      };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'no_bukti,nama_customer,nama_sales,no_sq,keterangan,follow';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows, details] = await Promise.all([
        erpList<any>('sales_inquiries', queryOpts),
        erpList<any>('sales_inquiry_details', { orderBy: 'no_urut', asc: true, limit: 5000 }).catch(
          () => []
        ),
        loadMasterReferences(),
      ]);
      const mapped = rows.map(mapDbToInquiry);
      setInquiryList(mapped);

      const grouped: Record<string, SalesInquiryDetailItem[]> = {};
      for (const d of details) {
        const key = String(d.si_id || '');
        if (!key) continue;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(mapDbToInquiryDetail(d, grouped[key].length));
      }
      setSiDetailsMap(grouped);

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
    const selected = inquiryList.find((i) => i.id === selectedId);
    if (!selected) {
      showFeedback('Pilih baris Sales Inquiry yang akan disimpan');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglSiIso = selected.tanggalSiIso || toIsoDate(selected.tanggalSi) || todayIso();
      const existingDetails = siDetailsMap[selected.id] || [];
      const qtyFromDetails = existingDetails.reduce((s, d) => s + Number(d.qty || 0), 0);

      const headerPayload: Record<string, any> = {
        id: selected.id,
        no_bukti: selected.noBukti.trim().toUpperCase(),
        tanggal_si: tglSiIso,
        tanggal_do: tglSiIso,
        nama_customer: selected.namaCustomer.trim().toUpperCase(),
        nama_sales: selected.namaSales.trim().toUpperCase(),
        qty: existingDetails.length > 0 ? qtyFromDetails : Number(selected.qty || 0),
        keterangan: selected.keterangan.trim(),
        follow: selected.follow.trim(),
        tgl_follow:
          selected.tglFollow && selected.tglFollow !== '-' ? toIsoDate(selected.tglFollow) : null,
        no_sq:
          selected.noSq && selected.noSq !== '-' ? selected.noSq.trim().toUpperCase() : '',
        tgl_sq: selected.tglSq && selected.tglSq !== '-' ? toIsoDate(selected.tglSq) : null,
        dibuat_oleh: selected.dibuatOleh.trim().toUpperCase() || currentUser,
        tgl_created: toIsoDate(selected.tglCreated) || todayIso(),
        diupdate_oleh: currentUser,
        tgl_update: todayIso(),
      };

      const detailPayloads = existingDetails.map((d, idx) => ({
        no_urut: idx + 1,
        kode: d.kode.trim().toUpperCase(),
        nama_barang: d.namaBarang.trim(),
        unit: d.unit.trim().toUpperCase() || 'PCS',
        qty: Number(d.qty || 0),
        target_harga: Number(d.targetHarga || 0),
        keterangan: d.keterangan.trim(),
      }));

      const res = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'sales-inquiry',
        headerPayload,
        detailPayloads
      );
      const mapped = mapDbToInquiry(res.header);
      const savedDets = (res.details || []).map((d, idx) => mapDbToInquiryDetail(d, idx));
      setInquiryList((prev) => prev.map((item) => (item.id === selected.id ? mapped : item)));
      setSiDetailsMap((prev) => ({ ...prev, [mapped.id]: savedDets }));
      showFeedback(
        res.detailWarning
          ? `Sales Inquiry [${mapped.noBukti}] disimpan (${res.detailWarning})`
          : `Sales Inquiry [${mapped.noBukti}] berhasil disimpan`
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

  const selectedInquiryDetails = useMemo(
    () => (selectedId ? siDetailsMap[selectedId] || [] : []),
    [siDetailsMap, selectedId]
  );

  if (!isOpen) return null;

  const updateDetailRowsWithSync = (
    updater: (prev: SalesInquiryDetailItem[]) => SalesInquiryDetailItem[]
  ) => {
    setDetailRows((prev) => {
      const next = updater(prev);
      const activeSum = next
        .filter((r) => r.kode.trim() || r.namaBarang.trim())
        .reduce((sum, r) => sum + Number(r.qty || 0), 0);
      if (next.some((r) => r.kode.trim() || r.namaBarang.trim())) {
        setNewQty(String(activeSum));
      }
      return next;
    });
  };

  const handleDetailSelectBarang = (rowId: string, selectedKode: string) => {
    const clean = selectedKode.trim().toUpperCase();
    const found = barangOptions.find((b) => b.kode === clean);
    updateDetailRowsWithSync((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              kode: clean,
              namaBarang: found ? found.namaBarang : r.namaBarang,
              unit: found ? found.unit : r.unit,
              targetHarga: found && r.targetHarga <= 0 ? found.price : r.targetHarga,
            }
          : r
      )
    );
  };

  const handleDetailFieldChange = (
    rowId: string,
    field: keyof SalesInquiryDetailItem,
    rawVal: string
  ) => {
    updateDetailRowsWithSync((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const next = { ...r };
        if (field === 'kode') next.kode = rawVal.toUpperCase();
        else if (field === 'namaBarang') next.namaBarang = rawVal;
        else if (field === 'unit') next.unit = rawVal.toUpperCase();
        else if (field === 'qty') next.qty = parseNum(rawVal);
        else if (field === 'targetHarga') next.targetHarga = parseNum(rawVal);
        else if (field === 'keterangan') next.keterangan = rawVal;
        return next;
      })
    );
  };

  const handleSelectCustomer = (customerName: string) => {
    setNewCustomer(customerName);
    const found = customerOptions.find((c) => c.namaCustomer === customerName);
    if (found?.sales && !newSales.trim()) {
      setNewSales(found.sales);
    }
  };

  const handleAddNew = async () => {
    setEditingId(null);
    setModalError(null);
    const todayDisp = toDisplayDMyShort(todayIso());
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    setNewNoBukti(nextUniqueCode(inquiryList.map((i) => i.noBukti), '2608-SI-', 3));
    setNewTanggalSi(todayDisp);
    setNewCustomer('');
    setNewSales('');
    setNewQty('1');
    setNewKeterangan('');
    setNewFollow('Follow');
    setNewTglFollow(todayDisp);
    setNewNoSq('');
    setNewTglSq('');
    setNewDibuatOleh(currentUser);
    setNewTglCreated(todayDisp);
    setNewDiupdateOleh('-');
    setNewTglUpdate('');
    setDetailRows([createBlankInquiryDetailRow(1)]);
    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleEdit = async () => {
    const item = inquiryList.find((i) => i.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    const todayDisp = toDisplayDMyShort(todayIso());
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    setEditingId(item.id);
    setModalError(null);
    setNewNoBukti(item.noBukti);
    setNewTanggalSi(item.tanggalSi);
    setNewCustomer(item.namaCustomer);
    setNewSales(item.namaSales);
    setNewQty(String(item.qty ?? 0));
    setNewKeterangan(item.keterangan);
    setNewFollow(item.follow);
    setNewTglFollow(item.tglFollow === '-' ? '' : item.tglFollow);
    setNewNoSq(item.noSq === '-' ? '' : item.noSq);
    setNewTglSq(item.tglSq === '-' ? '' : item.tglSq);
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(
      item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser
    );
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);

    const existingDetails = siDetailsMap[item.id] || [];
    setDetailRows(
      existingDetails.length > 0
        ? existingDetails.map((d, idx) => ({ ...d, noUrut: idx + 1 }))
        : [createBlankInquiryDetailRow(1)]
    );

    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoBukti.trim() || !newCustomer.trim()) {
      setModalError('No Bukti dan Nama Customer wajib diisi.');
      return;
    }

    const activeDetails = detailRows.filter((d) => d.kode.trim() || d.namaBarang.trim());
    const totalQty =
      activeDetails.length > 0
        ? activeDetails.reduce((s, d) => s + Number(d.qty || 0), 0)
        : parseNum(newQty);

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglSiIso = toIsoDate(newTanggalSi) || todayIso();
      const headerPayload: Record<string, any> = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal_si: tglSiIso,
        tanggal_do: tglSiIso,
        nama_customer: newCustomer.trim().toUpperCase(),
        nama_sales: newSales.trim().toUpperCase(),
        qty: totalQty,
        keterangan: newKeterangan.trim(),
        follow: newFollow.trim() || 'Follow',
        tgl_follow: toIsoDate(newTglFollow),
        no_sq: newNoSq.trim().toUpperCase(),
        tgl_sq: toIsoDate(newTglSq),
        dibuat_oleh: newDibuatOleh.trim().toUpperCase() || currentUser,
        tgl_created: toIsoDate(newTglCreated) || todayIso(),
      };

      if (editingId) {
        headerPayload.id = editingId;
        headerPayload.diupdate_oleh = newDiupdateOleh.trim().toUpperCase() || currentUser;
        headerPayload.tgl_update = toIsoDate(newTglUpdate) || todayIso();
      } else {
        headerPayload.diupdate_oleh = newDiupdateOleh.trim()
          ? newDiupdateOleh.trim().toUpperCase()
          : '-';
        headerPayload.tgl_update = toIsoDate(newTglUpdate);
      }

      const detailPayloads = activeDetails.map((d, idx) => ({
        no_urut: idx + 1,
        kode: d.kode.trim().toUpperCase(),
        nama_barang: d.namaBarang.trim(),
        unit: d.unit.trim().toUpperCase() || 'PCS',
        qty: Number(d.qty || 0),
        target_harga: Number(d.targetHarga || 0),
        keterangan: d.keterangan.trim(),
      }));

      const res = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'sales-inquiry',
        headerPayload,
        detailPayloads
      );
      const mapped = mapDbToInquiry(res.header);
      const savedDets = (res.details || []).map((d, idx) => mapDbToInquiryDetail(d, idx));

      if (editingId) {
        setInquiryList((prev) => prev.map((item) => (item.id === editingId ? mapped : item)));
        showFeedback(
          res.detailWarning
            ? `Sales Inquiry diperbarui (${res.detailWarning})`
            : 'Sales Inquiry & detail barang diperbarui'
        );
      } else {
        setInquiryList((prev) => [mapped, ...prev]);
        setSelectedId(mapped.id);
        showFeedback(
          res.detailWarning
            ? `Sales Inquiry tersimpan (${res.detailWarning})`
            : 'Sales Inquiry & detail barang tersimpan'
        );
      }
      setSiDetailsMap((prev) => ({ ...prev, [mapped.id]: savedDets }));
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Sales Inquiry';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteItem) return;
    try {
      setIsBusy(true);
      await erpDelete('sales_inquiries', confirmDeleteItem.id);
      const updated = inquiryList.filter((item) => item.id !== confirmDeleteItem.id);
      setInquiryList(updated);
      setSiDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[confirmDeleteItem.id];
        return copy;
      });
      if (selectedId === confirmDeleteItem.id) {
        setSelectedId(updated[0]?.id || '');
      }
      setConfirmDeleteItem(null);
      showFeedback('Sales Inquiry dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = inquiryList.filter((item) => {
    if (filterIso && item.tanggalSiIso !== filterIso) return false;
    if (searchField === 'Kode' || searchField === 'NoBukti') {
      return matchesMultiKeyword([item.noBukti], searchTerm);
    }
    if (searchField === 'Nama Pelanggan') {
      return matchesMultiKeyword([item.namaCustomer], searchTerm);
    }
    if (searchField === 'Nama Sales') {
      return matchesMultiKeyword([item.namaSales], searchTerm);
    }
    if (searchField === 'No.SQ') {
      return matchesMultiKeyword([item.noSq], searchTerm);
    }
    return matchesMultiKeyword(
      [
        item.noBukti,
        item.tanggalSi,
        item.namaCustomer,
        item.namaSales,
        item.noSq,
        item.keterangan,
        item.follow,
      ],
      searchTerm
    );
  });

  const selectedInquiry =
    filteredList.find((r) => r.id === selectedId) ||
    inquiryList.find((r) => r.id === selectedId) ||
    null;

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Sales Inquiry dari Supabase`
          : 'Data Sales Inquiry tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setTanggalFilter('Semua');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Sales Inquiry)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  const modalCustomerChoices = Array.from(
    new Set([...customerOptions.map((c) => c.namaCustomer), newCustomer.trim().toUpperCase()].filter(Boolean))
  );

  const modalSalesChoices = Array.from(
    new Set([...salesOptions, newSales.trim().toUpperCase()].filter(Boolean))
  );

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Sales_Inquiry',
      sheetTitle: 'LIST INQUIRY PENJUALAN',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'NoBukti', accessor: 'noBukti' },
        { header: 'Tanggal SI', accessor: 'tanggalSi', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'Nama Sales', accessor: 'namaSales' },
        { header: 'Qty', accessor: 'qty', align: 'right' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Follow', accessor: 'follow' },
        { header: 'No. SQ', accessor: 'noSq' },
        { header: 'Tgl. SQ', accessor: 'tglSq', align: 'center' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
        { header: 'Tgl.Created', accessor: 'tglCreated', align: 'center' },
        { header: 'Diupdate Oleh', accessor: 'diupdateOleh' },
        { header: 'Tgl.Update', accessor: 'tglUpdate', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const listPrintColumns: PrintColumn<SalesInquiryItem>[] = [
    { header: 'NoBukti', accessor: 'noBukti', width: '105px' },
    { header: 'Tanggal SI', accessor: 'tanggalSi', align: 'center', width: '80px' },
    { header: 'Nama Customer', accessor: 'namaCustomer' },
    { header: 'Sales', accessor: 'namaSales', width: '85px' },
    { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', width: '60px' },
    { header: 'Follow', accessor: 'follow', width: '65px' },
    { header: 'No. SQ', accessor: 'noSq', width: '90px' },
    { header: 'Keterangan', accessor: 'keterangan' },
  ];

  const detailPrintColumns: PrintColumn<SalesInquiryDetailItem>[] = [
    { header: 'Kode', accessor: 'kode', width: '95px' },
    { header: 'Nama Barang', accessor: 'namaBarang' },
    { header: 'Unit', accessor: 'unit', align: 'center', width: '60px' },
    { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', width: '70px' },
    {
      header: 'Target Harga',
      accessor: (r) => formatMoney(r.targetHarga),
      align: 'right',
      width: '105px',
    },
    { header: 'Keterangan', accessor: 'keterangan', width: '180px' },
  ];

  return (
    <div
      id="list-sales-inquiry-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="List Inquiry Penjualan"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => {
          setPrintMode(selectedInquiry && selectedInquiryDetails.length > 0 ? 'detail' : 'list');
          setIsPrintOpen(true);
        }}
        onTableView={() => loadData({ field: searchField, term: searchTerm })}
        onExportExcel={handleExportExcel}
      />

      <div className="bg-[#ECE9D8] border-b border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs shadow-sm overflow-x-auto">
        <div className="flex items-center space-x-2">
          <FormActionButtons
            onSimpan={handleToolbarSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={() => {
              const found = inquiryList.find((i) => i.id === selectedId);
              if (!found) {
                showFeedback('Pilih data yang akan dihapus');
                return;
              }
              setConfirmDeleteItem(found);
            }}
            onPrint={() => {
              setPrintMode(selectedInquiry && selectedInquiryDetails.length > 0 ? 'detail' : 'list');
              setIsPrintOpen(true);
            }}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className="font-semibold">Tanggal :</span>
            <DatePickerInput
              value={tanggalFilter === 'Semua' ? '' : tanggalFilter}
              onChange={(formatted) => setTanggalFilter(formatted || 'Semua')}
              format="dMyShort"
              placeholder="Semua"
            />
            <button
              type="button"
              onClick={() => setTanggalFilter('Semua')}
              className="px-2 py-0.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded text-xs hover:bg-[#D4D0C8] cursor-pointer"
            >
              Semua
            </button>
          </div>
          <div className="font-bold text-sm text-right px-3 py-0.5 bg-white border border-[#919191] min-w-[90px] shadow-inner">
            {filteredList.length} Inquiry
          </div>
        </div>
      </div>

      {/* Upper Table */}
      <div className="flex-[1.35] min-h-[160px] overflow-auto bg-white border border-[#7A7A7A] mx-2 mt-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1380px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">NoBukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal SI</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Qty</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Follow</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl. Follow</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No. SQ</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl. SQ</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Dibuat Oleh</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Created</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Diupdate Oleh</th>
              <th className="px-3 py-1.5">Tgl.Update</th>
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
                  className={`border-b border-[#E0E0E0] cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-[#000084] text-white'
                      : index % 2 === 0
                      ? 'bg-white hover:bg-[#F2F0EB]'
                      : 'bg-[#F9F8F5] hover:bg-[#F2F0EB]'
                  }`}
                >
                  <td className="border-r border-[#E0E0E0] px-2 py-1 text-center font-bold">
                    {isSelected ? '▶' : ''}
                  </td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noBukti}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tanggalSi}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-medium">
                    {item.namaCustomer}
                  </td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.namaSales}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono text-right">
                    {formatMoney(item.qty)}
                  </td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.follow}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglFollow}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noSq}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglSq}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.dibuatOleh}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.diupdateOleh}</td>
                  <td className="px-3 py-1">{item.tglUpdate}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={15} className="text-center py-6 text-gray-500">
                  Tidak ada data inquiry penjualan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lower Panel: Inquiry Detail Items */}
      <div className="flex-1 min-h-[135px] flex flex-col mx-2 mt-1.5 mb-1 border border-[#7A7A7A] bg-white overflow-hidden">
        <div className="shrink-0 bg-[#E6E3D5] border-b border-[#ACA899] px-2.5 py-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-[#003C74] whitespace-nowrap">Detail Permintaan Barang</span>
            {selectedInquiry ? (
              <span className="text-[11px] text-gray-800 truncate">
                No. SI: <b className="font-mono">{selectedInquiry.noBukti}</b> | Customer:{' '}
                <b>{selectedInquiry.namaCustomer}</b>
              </span>
            ) : (
              <span className="text-[11px] text-gray-500 italic">
                Pilih Sales Inquiry di atas untuk melihat rincian barang
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold font-mono text-gray-900">
            {selectedInquiryDetails.length} Item | Total Qty:{' '}
            {formatMoney(selectedInquiryDetails.reduce((s, d) => s + d.qty, 0))}
          </span>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-left min-w-[780px] text-[11px]">
            <thead className="sticky top-0 bg-[#F4F4F4] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10">
              <tr>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-center w-10">No</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] w-32">Kode Barang</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0]">Nama Barang</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-center w-20">Unit</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-20">Qty</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-32">Target Harga</th>
                <th className="px-2 py-1">Keterangan Item</th>
              </tr>
            </thead>
            <tbody>
              {selectedInquiryDetails.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-500 italic">
                    Belum ada detail barang pada inquiry ini. Klik Baru atau Koreksi untuk menambahkan item.
                  </td>
                </tr>
              ) : (
                selectedInquiryDetails.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={`border-b border-[#E5E5E5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                  >
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-center">{idx + 1}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] font-mono font-semibold">{d.kode}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5]">{d.namaBarang}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-center">{d.unit}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono">
                      {formatMoney(d.qty)}
                    </td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono">
                      {formatRupiah(d.targetHarga)}
                    </td>
                    <td className="px-2 py-1">{d.keterangan || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#ECE9D8] border-t border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs gap-2 overflow-x-auto">
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
            { value: 'Kode', label: 'Kode (NoBukti)' },
            { value: 'NoBukti', label: 'NoBukti' },
            { value: 'Nama Pelanggan', label: 'Nama Pelanggan' },
            { value: 'Nama Sales', label: 'Nama Sales' },
            { value: 'No.SQ', label: 'No.SQ' },
          ]}
        />
        <div className="flex items-center space-x-4 shrink-0">
          <div className="w-64 h-5 bg-[#FFFF00] border border-[#919191] shadow-inner px-2 text-[10px] flex items-center text-black truncate">
            {inquiryList.find((r) => r.id === selectedId)?.keterangan || ''}
          </div>
          <div className="font-semibold px-2 py-0.5 bg-[#ECE9D8] border border-[#919191]">
            Record {filteredList.length}
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[860px] max-w-[97vw] max-h-[93vh] flex flex-col overflow-hidden">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs shrink-0">
              <span>{editingId ? 'Koreksi Sales Inquiry' : 'Tambah Sales Inquiry Baru'}</span>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsAddOpen(false);
                }}
                className="text-white hover:text-red-300 font-bold px-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3 text-xs overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-semibold">No Bukti:</label>
                  <input
                    type="text"
                    value={newNoBukti}
                    onChange={(e) => setNewNoBukti(e.target.value.toUpperCase())}
                    className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-semibold">Tanggal SI:</label>
                  <div className="col-span-2">
                    <DatePickerInput
                      value={newTanggalSi}
                      onChange={(formatted) => setNewTanggalSi(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-semibold">Nama Customer:</label>
                  <select
                    value={newCustomer}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    required
                  >
                    <option value="">-- Pilih Customer --</option>
                    {modalCustomerChoices.map((cust) => (
                      <option key={cust} value={cust}>
                        {cust}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-semibold">Nama Sales:</label>
                  <select
                    value={newSales}
                    onChange={(e) => setNewSales(e.target.value)}
                    className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Sales --</option>
                    {modalSalesChoices.map((sales) => (
                      <option key={sales} value={sales}>
                        {sales}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-semibold">Total Qty:</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] font-mono text-right"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-semibold">Follow Status:</label>
                  <select
                    value={newFollow}
                    onChange={(e) => setNewFollow(e.target.value)}
                    className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] cursor-pointer"
                  >
                    <option value="Follow">Follow</option>
                    <option value="Quoted">Quoted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-semibold">Tgl. Follow:</label>
                  <div className="col-span-2">
                    <DatePickerInput
                      value={newTglFollow}
                      onChange={(formatted) => setNewTglFollow(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-semibold">No. SQ / Tgl:</label>
                  <div className="col-span-2 grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={newNoSq}
                      onChange={(e) => setNewNoSq(e.target.value.toUpperCase())}
                      placeholder="Auto saat SQ"
                      className="px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                    />
                    <DatePickerInput
                      value={newTglSq}
                      onChange={(formatted) => setNewTglSq(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-6 gap-2 items-center">
                  <label className="font-semibold">Keterangan:</label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    className="col-span-5 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
              </div>

              {/* Detail Barang Inquiry */}
              <div className="border border-[#999999] bg-white rounded-xs overflow-hidden">
                <div className="bg-[#E6E3D5] border-b border-[#C0C0C0] px-2.5 py-1.5 flex items-center justify-between">
                  <span className="font-bold text-xs text-[#003C74]">
                    Detail Permintaan Barang (Akan ditarik otomatis di Sales Quotation)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateDetailRowsWithSync((prev) => [
                        ...prev,
                        createBlankInquiryDetailRow(prev.length + 1),
                      ])
                    }
                    className="px-2.5 py-0.5 bg-[#000084] hover:bg-[#0000A8] text-white border border-black rounded-xs text-[11px] font-semibold cursor-pointer"
                  >
                    + Tambah Item
                  </button>
                </div>
                <div className="max-h-[190px] overflow-auto">
                  <table className="w-full border-collapse text-left min-w-[740px]">
                    <thead className="sticky top-0 bg-[#F0F0F0] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10 text-[11px]">
                      <tr>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-center w-8">No</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] w-40">Kode Barang</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0]">Nama Barang</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-center w-16">Unit</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-16">Qty</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-28">
                          Target Harga
                        </th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] w-36">Keterangan</th>
                        <th className="px-1.5 py-1 text-center w-10">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.map((d, idx) => {
                        const kodeChoices = Array.from(
                          new Set([...barangOptions.map((b) => b.kode), d.kode].filter(Boolean))
                        );
                        return (
                          <tr key={d.id} className="border-b border-[#E5E5E5] text-[11px]">
                            <td className="px-1.5 py-1 border-r border-[#E5E5E5] text-center">
                              {idx + 1}
                            </td>
                            <td className="p-0.5 border-r border-[#E5E5E5]">
                              <select
                                value={d.kode}
                                onChange={(e) => handleDetailSelectBarang(d.id, e.target.value)}
                                className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs font-mono text-[11px] uppercase cursor-pointer"
                              >
                                <option value="">-- Kode --</option>
                                {kodeChoices.map((k) => {
                                  const b = barangOptions.find((x) => x.kode === k);
                                  return (
                                    <option key={k} value={k}>
                                      {b ? `${k} - ${b.namaBarang}` : k}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td className="p-0.5 border-r border-[#E5E5E5]">
                              <input
                                type="text"
                                value={d.namaBarang}
                                onChange={(e) =>
                                  handleDetailFieldChange(d.id, 'namaBarang', e.target.value)
                                }
                                placeholder="Nama Barang"
                                className="w-full px-1.5 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-[11px]"
                              />
                            </td>
                            <td className="p-0.5 border-r border-[#E5E5E5]">
                              <input
                                type="text"
                                value={d.unit}
                                onChange={(e) => handleDetailFieldChange(d.id, 'unit', e.target.value)}
                                className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-center text-[11px] uppercase"
                              />
                            </td>
                            <td className="p-0.5 border-r border-[#E5E5E5]">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={d.qty}
                                onChange={(e) => handleDetailFieldChange(d.id, 'qty', e.target.value)}
                                className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-right font-mono text-[11px]"
                              />
                            </td>
                            <td className="p-0.5 border-r border-[#E5E5E5]">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={d.targetHarga}
                                onChange={(e) =>
                                  handleDetailFieldChange(d.id, 'targetHarga', e.target.value)
                                }
                                className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-right font-mono text-[11px]"
                              />
                            </td>
                            <td className="p-0.5 border-r border-[#E5E5E5]">
                              <input
                                type="text"
                                value={d.keterangan}
                                onChange={(e) =>
                                  handleDetailFieldChange(d.id, 'keterangan', e.target.value)
                                }
                                className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-[11px]"
                              />
                            </td>
                            <td className="p-0.5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateDetailRowsWithSync((prev) =>
                                    prev
                                      .filter((r) => r.id !== d.id)
                                      .map((r, i) => ({ ...r, noUrut: i + 1 }))
                                  )
                                }
                                className="px-1.5 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xs font-bold text-[10px] cursor-pointer"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-[#D4D0C8] pt-2 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div>
                  <label className="block font-semibold mb-1">Dibuat Oleh:</label>
                  <input
                    type="text"
                    value={newDibuatOleh}
                    onChange={(e) => setNewDibuatOleh(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tgl Created:</label>
                  <DatePickerInput
                    value={newTglCreated}
                    onChange={(formatted) => setNewTglCreated(formatted)}
                    format="dMyShort"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Diupdate Oleh:</label>
                  <input
                    type="text"
                    value={newDiupdateOleh}
                    onChange={(e) => setNewDiupdateOleh(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tgl Update:</label>
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
              <div className="flex justify-end space-x-2 pt-3 border-t border-[#D4D0C8]">
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="px-4 py-1.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded hover:bg-[#D4D0C8] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1.5 bg-[#000084] text-white border border-[#000066] rounded hover:bg-[#0000A0] cursor-pointer"
                >
                  Simpan Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteItem)}
        title="Konfirmasi Hapus Sales Inquiry"
        message={`Yakin ingin menghapus Sales Inquiry [${confirmDeleteItem?.noBukti || ''}]?`}
        detail={
          confirmDeleteItem
            ? `Customer: ${confirmDeleteItem.namaCustomer}\nStatus: ${confirmDeleteItem.follow}`
            : undefined
        }
        confirmLabel="Ya, Hapus"
        isBusy={isBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteItem(null)}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={
          printMode === 'detail'
            ? 'DOKUMEN INQUIRY PENJUALAN (DETAIL BARANG)'
            : 'LAPORAN INQUIRY PENJUALAN'
        }
        subtitle={
          printMode === 'detail' && selectedInquiry
            ? `No. Bukti: ${selectedInquiry.noBukti} | Customer: ${selectedInquiry.namaCustomer}`
            : `Filter Tanggal: ${tanggalFilter}`
        }
        metaLines={
          printMode === 'detail' && selectedInquiry
            ? [
                { label: 'No. Bukti', value: selectedInquiry.noBukti },
                { label: 'Tanggal SI', value: selectedInquiry.tanggalSi },
                { label: 'Customer', value: selectedInquiry.namaCustomer },
                { label: 'Sales', value: selectedInquiry.namaSales || '-' },
                { label: 'Follow', value: selectedInquiry.follow },
                { label: 'No. SQ', value: selectedInquiry.noSq || '-' },
              ]
            : undefined
        }
        orientation="landscape"
        columns={
          printMode === 'detail' && selectedInquiryDetails.length > 0
            ? (detailPrintColumns as PrintColumn<any>[])
            : (listPrintColumns as PrintColumn<any>[])
        }
        rows={
          printMode === 'detail'
            ? selectedInquiryDetails.length > 0
              ? selectedInquiryDetails
              : selectedInquiry
              ? [selectedInquiry]
              : []
            : filteredList
        }
        summaryItems={
          printMode === 'detail' && selectedInquiry
            ? [
                { label: 'Total Item', value: `${selectedInquiryDetails.length} Item` },
                { label: 'Total Qty', value: formatMoney(selectedInquiry.qty) },
              ]
            : [{ label: 'Total Inquiry', value: `${filteredList.length} Dokumen` }]
        }
        selectedRow={printMode === 'list' ? selectedInquiry : undefined}
        selectedTitle={printMode === 'list' ? 'DETAIL INQUIRY PENJUALAN' : undefined}
        selectedSubtitle={
          printMode === 'list' && selectedInquiry
            ? `No. Bukti: ${selectedInquiry.noBukti} | Customer: ${selectedInquiry.namaCustomer}`
            : undefined
        }
        selectedMetaLines={
          printMode === 'list' && selectedInquiry
            ? [
                { label: 'No. Bukti', value: selectedInquiry.noBukti },
                { label: 'Tanggal SI', value: selectedInquiry.tanggalSi },
                { label: 'Customer', value: selectedInquiry.namaCustomer },
                { label: 'Sales', value: selectedInquiry.namaSales || '-' },
                { label: 'Qty', value: formatMoney(selectedInquiry.qty) },
                { label: 'Follow', value: selectedInquiry.follow },
                { label: 'No. SQ', value: selectedInquiry.noSq || '-' },
              ]
            : undefined
        }
        toolbarExtra={
          <div className="flex items-center bg-[#111827] border border-gray-600 rounded-[2px] p-0.5 text-[10.5px]">
            <button
              type="button"
              onClick={() => setPrintMode('detail')}
              className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                printMode === 'detail' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Detail Barang SI
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('list')}
              className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                printMode === 'list' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              List Inquiry
            </button>
          </div>
        }
      />

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Sales Inquiry"
        rows={inquiryList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.noBukti,
          r.tanggalSi,
          r.namaCustomer,
          r.namaSales,
          r.noSq,
          r.keterangan,
          r.follow,
        ]}
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
          setTanggalFilter('Semua');
          return loadData({ field: 'Semua', term: '' });
        }}
        onSelectRow={(row, q) => {
          setSelectedId(row.id);
          setSearchTerm(q);
          showFeedback(`Sales Inquiry [${row.noBukti}] dipilih`);
        }}
        columns={[
          { header: 'Kode / NoBukti', accessor: (r) => r.noBukti, widthClass: 'w-32', mono: true, bold: true },
          { header: 'Tanggal SI', accessor: (r) => r.tanggalSi, widthClass: 'w-24', align: 'center' },
          { header: 'Nama Customer', accessor: (r) => r.namaCustomer, bold: true },
          { header: 'Nama Sales', accessor: (r) => r.namaSales || '-', widthClass: 'w-28' },
          { header: 'No. SQ', accessor: (r) => r.noSq || '-', widthClass: 'w-28', mono: true },
          { header: 'Qty', accessor: (r) => formatMoney(r.qty), widthClass: 'w-16', align: 'right', mono: true },
          { header: 'Follow', accessor: (r) => r.follow, widthClass: 'w-20' },
        ]}
      />
    </div>
  );
};
