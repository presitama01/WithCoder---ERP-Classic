import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
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

export interface SalesOrderRef {
  id: string;
  noBukti: string;
  namaCustomer: string;
  sales: string;
  poNo: string;
  lokasiStock: string;
  keterangan: string;
}

export interface FakturRef {
  noBukti: string;
  noSo: string;
}

export interface MasterBarangOption {
  kode: string;
  namaBarang: string;
  unit: string;
  price: number;
  cost: number;
}

export interface SuratJalanItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaCustomer: string;
  noSo: string;
  poNo: string;
  sales: string;
  noFaktur: string;
  keterangan: string;
  lokasiStock: string;
  stsPrint: string;
  tglPrint: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

export interface SuratJalanDetailItem {
  id: string;
  suratJalanId?: string;
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

interface ListSuratJalanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrintReport?: () => void;
}

function mapDbToSj(r: any): SuratJalanItem {
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaCustomer: r.nama_customer || '',
    noSo: r.no_so || '',
    poNo: r.po_no || '',
    sales: r.sales || '',
    noFaktur: r.no_faktur || '',
    keterangan: r.keterangan || '',
    lokasiStock: r.lokasi_stock || '01 - OFFICE',
    stsPrint: r.sts_print || 'Not Yet',
    tglPrint: toDisplayDMyShort(r.tgl_print) || '',
    stsPost: r.sts_post || 'Posting',
    tglPost: toDisplayDMyShort(r.tgl_post) || '',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

function mapDbToDetail(d: any, idx = 0): SuratJalanDetailItem {
  const qty = Number(d.qty || 0);
  const harga = Number(d.harga || 0);
  const jumlah = d.jumlah !== undefined && d.jumlah !== null ? Number(d.jumlah) : qty * harga;
  const total = d.total !== undefined && d.total !== null ? Number(d.total) : jumlah;
  return {
    id: d.id || `sjdet-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    suratJalanId: d.surat_jalan_id,
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

function createBlankDetailRow(noUrut: number): SuratJalanDetailItem {
  return {
    id: `new-sjdet-${Date.now()}-${noUrut}-${Math.random().toString(36).slice(2, 6)}`,
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

const SEARCH_FIELD_TO_DB_COL: Record<string, string> = {
  'Nama Pelanggan': 'nama_customer',
  'No.Bukti': 'no_bukti',
  'No.SO': 'no_so',
  'PO.NO': 'po_no',
  Sales: 'sales',
  'No.Faktur': 'no_faktur',
  'Lokasi Stock': 'lokasi_stock',
  Keterangan: 'keterangan',
  'Sts.Post': 'sts_post',
};

export const ListSuratJalanForm: React.FC<ListSuratJalanFormProps> = ({
  isOpen,
  onClose,
  onOpenPrintReport,
}) => {
  const [sjList, setSjList] = useState<SuratJalanItem[]>([]);
  const [sjDetailsMap, setSjDetailsMap] = useState<Record<string, SuratJalanDetailItem[]>>({});
  const [soDetailsByNoSoMap, setSoDetailsByNoSoMap] = useState<Record<string, SuratJalanDetailItem[]>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const findInputRef = useRef<HTMLInputElement>(null);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<'list' | 'detail'>('list');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [soOptions, setSoOptions] = useState<SalesOrderRef[]>([]);
  const [fakturOptions, setFakturOptions] = useState<FakturRef[]>([]);
  const [salesOptions, setSalesOptions] = useState<string[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);

  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newNoSo, setNewNoSo] = useState<string>('');
  const [newPoNo, setNewPoNo] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('');
  const [newNoFaktur, setNewNoFaktur] = useState<string>('');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newLokasiStock, setNewLokasiStock] = useState<string>('01 - OFFICE');
  const [newStsPrint, setNewStsPrint] = useState<string>('Not Yet');
  const [newTglPrint, setNewTglPrint] = useState<string>('');
  const [newStsPost, setNewStsPost] = useState<string>('Posting');
  const [newTglPost, setNewTglPost] = useState<string>('');
  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');
  const [detailRows, setDetailRows] = useState<SuratJalanDetailItem[]>([]);

  const [confirmDeleteRow, setConfirmDeleteRow] = useState<SuratJalanItem | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const loadMasterReferences = async () => {
    const [custRes, soRes, soDetRes, salesRes, lokasiRes, fakturRes, barangRes] =
      await Promise.allSettled([
        erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true, limit: 1000 }),
        erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }),
        erpList<any>('sales_order_details', { orderBy: 'no_urut', asc: true, limit: 5000 }),
        erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true, limit: 1000 }),
        erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true, limit: 1000 }),
        erpList<any>('faktur_penjualans', { orderBy: 'tanggal', asc: false, limit: 1000 }).catch(() => []),
        erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 }),
      ]);

    if (custRes.status === 'fulfilled') {
      const custs = Array.from(
        new Set(
          custRes.value
            .map((c: any) => String(c.nama_customer || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setCustomerOptions(custs);
    }

    const soIdToNoBukti = new Map<string, string>();
    if (soRes.status === 'fulfilled') {
      const sos: SalesOrderRef[] = soRes.value
        .map((s: any) => {
          const noBukti = String(s.no_bukti || '').trim().toUpperCase();
          if (noBukti && s.id) soIdToNoBukti.set(String(s.id), noBukti);
          return {
            id: String(s.id || ''),
            noBukti,
            namaCustomer: String(s.nama_customer || '').trim().toUpperCase(),
            sales: String(s.sales || '').trim().toUpperCase(),
            poNo: String(s.po_no || '').trim().toUpperCase(),
            lokasiStock: String(s.lokasi_stock || '01 - OFFICE').trim().toUpperCase(),
            keterangan: String(s.keterangan || '').trim(),
          };
        })
        .filter((s: SalesOrderRef) => s.noBukti);
      setSoOptions(sos);
    }

    if (soDetRes.status === 'fulfilled') {
      const groupedByNoSo: Record<string, SuratJalanDetailItem[]> = {};
      for (const raw of soDetRes.value) {
        const mappedDet = mapDbToDetail(raw, 0);
        const keys = Array.from(
          new Set(
            [
              String(raw.no_bukti || '').trim().toUpperCase(),
              soIdToNoBukti.get(String(raw.so_id || '')) || '',
            ].filter(Boolean)
          )
        );
        for (const key of keys) {
          if (!groupedByNoSo[key]) groupedByNoSo[key] = [];
          groupedByNoSo[key].push({ ...mappedDet, noUrut: groupedByNoSo[key].length + 1 });
        }
      }
      setSoDetailsByNoSoMap(groupedByNoSo);
    }

    if (fakturRes.status === 'fulfilled') {
      const fakts: FakturRef[] = fakturRes.value
        .map((f: any) => ({
          noBukti: String(f.no_bukti || '').trim().toUpperCase(),
          noSo: String(f.no_so || '').trim().toUpperCase(),
        }))
        .filter((f: FakturRef) => f.noBukti && f.noSo);
      setFakturOptions(fakts);
    }

    if (salesRes.status === 'fulfilled') {
      const salesList = Array.from(
        new Set(
          salesRes.value
            .map((sl: any) => String(sl.nama_sales || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setSalesOptions(salesList);
    }

    if (lokasiRes.status === 'fulfilled') {
      const lokasis = Array.from(
        new Set(
          lokasiRes.value
            .map((l: any) => {
              const kode = String(l.kode || '').trim().toUpperCase();
              const nama = String(l.nama_lokasi || '').trim().toUpperCase();
              if (kode && nama) return `${kode} - ${nama}`;
              return nama || kode;
            })
            .filter(Boolean)
        )
      );
      setLokasiOptions(lokasis);
    }

    if (barangRes.status === 'fulfilled') {
      const mappedBarangs: MasterBarangOption[] = barangRes.value
        .map((b: any) => ({
          kode: String(b.kode || '').trim().toUpperCase(),
          namaBarang: String(b.nama_barang || '').trim(),
          unit: String(b.unit || 'PCS').trim().toUpperCase(),
          price: Number(b.price || 0),
          cost: Number(b.cost || 0),
        }))
        .filter((b: MasterBarangOption) => b.kode);
      setBarangOptions(mappedBarangs);
    }
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
    tglFilter?: string;
  }): Promise<SuratJalanItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const activeTgl = opts?.tglFilter ?? tanggalFilter;
      const isoDateFilter = activeTgl && activeTgl !== 'Semua' ? toIsoDate(activeTgl) : null;

      const queryOpts: Record<string, any> = {
        orderBy: 'tanggal',
        asc: false,
        limit: 1000,
      };
      if (isoDateFilter) {
        queryOpts.eq = { tanggal: isoDateFilter };
      }
      if (activeTerm) {
        const dbCol = SEARCH_FIELD_TO_DB_COL[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch =
            'no_bukti,nama_customer,no_so,po_no,sales,no_faktur,lokasi_stock,keterangan,sts_post';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows, details] = await Promise.all([
        erpList<any>('surat_jalans', queryOpts),
        erpList<any>('surat_jalan_details', { orderBy: 'no_urut', asc: true }).catch(() => []),
        loadMasterReferences(),
      ]);

      const mapped = rows.map(mapDbToSj);
      setSjList(mapped);

      const groupedDetails: Record<string, SuratJalanDetailItem[]> = {};
      for (const raw of details) {
        const key = String(raw.surat_jalan_id || '');
        if (!key) continue;
        if (!groupedDetails[key]) groupedDetails[key] = [];
        groupedDetails[key].push(mapDbToDetail(raw, groupedDetails[key].length));
      }
      setSjDetailsMap(groupedDetails);

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
    const rows = await loadData();
    if (rows !== null) showFeedback('Data tersinkronisasi dengan database Supabase');
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const selectedSj = useMemo(
    () => sjList.find((s) => s.id === selectedId) || null,
    [sjList, selectedId]
  );

  // Saved details on surat jalan, or fallback to sales_order_details matching No. SO
  const selectedSjDetails = useMemo(() => {
    if (!selectedSj) return [];
    const saved = sjDetailsMap[selectedSj.id];
    if (saved && saved.length > 0) return saved;
    const soKey = selectedSj.noSo.trim().toUpperCase();
    return soKey ? soDetailsByNoSoMap[soKey] || [] : [];
  }, [selectedSj, sjDetailsMap, soDetailsByNoSoMap]);

  const isSelectedDetailFromSoFallback = useMemo(() => {
    if (!selectedSj) return false;
    const saved = sjDetailsMap[selectedSj.id];
    if (saved && saved.length > 0) return false;
    const soKey = selectedSj.noSo.trim().toUpperCase();
    return Boolean(soKey && (soDetailsByNoSoMap[soKey] || []).length > 0);
  }, [selectedSj, sjDetailsMap, soDetailsByNoSoMap]);

  const selectedDetailTotal = useMemo(
    () => selectedSjDetails.reduce((acc, d) => acc + d.total, 0),
    [selectedSjDetails]
  );

  const selectedDetailQty = useMemo(
    () => selectedSjDetails.reduce((acc, d) => acc + d.qty, 0),
    [selectedSjDetails]
  );

  const modalDetailTotal = useMemo(
    () => detailRows.reduce((acc, d) => acc + d.total, 0),
    [detailRows]
  );

  if (!isOpen) return null;

  // Auto-fill header fields (Customer, PO.No, Sales, No.Faktur, Lokasi Stock, Keterangan) & S.J Detail from selected No. SO
  const applySalesOrderAutoFill = (rawNoSo: string) => {
    const cleanNoSo = rawNoSo.trim().toUpperCase();
    setNewNoSo(cleanNoSo);
    if (!cleanNoSo) return;

    const matchedSo = soOptions.find((s) => s.noBukti === cleanNoSo);
    if (matchedSo) {
      setNewCustomer(matchedSo.namaCustomer || '');
      setNewPoNo(matchedSo.poNo || '');
      setNewSales(matchedSo.sales || '');
      setNewLokasiStock(matchedSo.lokasiStock || lokasiOptions[0] || '01 - OFFICE');
      setNewKeterangan(matchedSo.keterangan || '');
    }

    const matchedFaktur = fakturOptions.find((f) => f.noSo === cleanNoSo);
    setNewNoFaktur(matchedFaktur ? matchedFaktur.noBukti : '');

    const soItems = (soDetailsByNoSoMap[cleanNoSo] || []).map((d, idx) => ({
      ...d,
      id: `so-fill-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      noUrut: idx + 1,
    }));

    if (soItems.length > 0) {
      setDetailRows(soItems);
    } else {
      setDetailRows([createBlankDetailRow(1)]);
    }
  };

  const handleAddDetailRow = () => {
    setDetailRows((prev) => [...prev, createBlankDetailRow(prev.length + 1)]);
  };

  const handleRemoveDetailRow = (rowId: string) => {
    setDetailRows((prev) =>
      prev
        .filter((r) => r.id !== rowId)
        .map((r, idx) => ({ ...r, noUrut: idx + 1 }))
    );
  };

  const handleDetailSelectBarang = (rowId: string, selectedKode: string) => {
    const cleanKode = selectedKode.trim().toUpperCase();
    const found = barangOptions.find((b) => b.kode === cleanKode);
    setDetailRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const defaultHarga = found ? (found.price > 0 ? found.price : found.cost) : r.harga;
        const harga = found ? (r.harga > 0 && r.kode === cleanKode ? r.harga : defaultHarga) : r.harga;
        const qty = r.qty || 1;
        const jumlah = qty * harga;
        return {
          ...r,
          kode: cleanKode,
          namaBarang: found ? found.namaBarang : r.namaBarang,
          unit: found ? found.unit : r.unit,
          harga,
          jumlah,
          total: jumlah,
        };
      })
    );
  };

  const handleDetailFieldChange = (
    rowId: string,
    field: keyof SuratJalanDetailItem,
    rawValue: string
  ) => {
    setDetailRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated: SuratJalanDetailItem = { ...r };
        if (field === 'kode') {
          updated.kode = rawValue.toUpperCase();
        } else if (field === 'namaBarang') {
          updated.namaBarang = rawValue;
        } else if (field === 'unit') {
          updated.unit = rawValue.toUpperCase();
        } else if (field === 'terima') {
          updated.terima = parseNum(rawValue);
        } else if (field === 'qty') {
          updated.qty = parseNum(rawValue);
          updated.jumlah = updated.qty * updated.harga;
          updated.total = updated.jumlah;
        } else if (field === 'harga') {
          updated.harga = parseNum(rawValue);
          updated.jumlah = updated.qty * updated.harga;
          updated.total = updated.jumlah;
        } else if (field === 'jumlah') {
          updated.jumlah = parseNum(rawValue);
          updated.total = updated.jumlah;
        } else if (field === 'total') {
          updated.total = parseNum(rawValue);
        }
        return updated;
      })
    );
  };

  const handleAddNew = async () => {
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setNewNoBukti(nextUniqueCode(sjList.map((s) => s.noBukti), '2608-DO-INV-', 3));
    setNewTanggal(todayDisp);
    setNewCustomer('');
    setNewNoSo('');
    setNewPoNo('');
    setNewSales('');
    setNewNoFaktur('');
    setNewKeterangan('');
    setNewLokasiStock(lokasiOptions[0] || '01 - OFFICE');
    setNewStsPrint('Not Yet');
    setNewTglPrint('');
    setNewStsPost('Posting');
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
    const item = sjList.find((s) => s.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(item.id);
    setModalError(null);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal || todayDisp);
    setNewCustomer(item.namaCustomer);
    setNewNoSo(item.noSo);
    setNewPoNo(item.poNo);
    setNewSales(item.sales);
    setNewNoFaktur(item.noFaktur);
    setNewKeterangan(item.keterangan);
    setNewLokasiStock(item.lokasiStock || lokasiOptions[0] || '01 - OFFICE');
    setNewStsPrint(item.stsPrint || 'Not Yet');
    setNewTglPrint(item.tglPrint === '-' ? '' : item.tglPrint);
    setNewStsPost(item.stsPost || 'Posting');
    setNewTglPost(item.tglPost === '-' ? '' : item.tglPost);
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(
      item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser
    );
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);

    const existingDetails = sjDetailsMap[item.id] || [];
    const soFallbackDetails =
      existingDetails.length === 0 && item.noSo
        ? soDetailsByNoSoMap[item.noSo.trim().toUpperCase()] || []
        : [];
    const initialDetails = existingDetails.length > 0 ? existingDetails : soFallbackDetails;

    setDetailRows(
      initialDetails.length > 0
        ? initialDetails.map((d, idx) => ({ ...d, noUrut: idx + 1 }))
        : [createBlankDetailRow(1)]
    );

    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoBukti.trim() || !newCustomer.trim()) {
      setModalError('No. Bukti dan Nama Customer wajib diisi.');
      return;
    }

    const activeDetails = detailRows.filter(
      (d) => d.kode.trim() !== '' || d.namaBarang.trim() !== ''
    );

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglIso = toIsoDate(newTanggal) || todayIso();
      const headerPayload: Record<string, any> = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_customer: newCustomer.trim().toUpperCase(),
        no_so: newNoSo.trim().toUpperCase(),
        po_no: newPoNo.trim().toUpperCase(),
        sales: newSales.trim().toUpperCase(),
        no_faktur: newNoFaktur.trim().toUpperCase(),
        keterangan: newKeterangan.trim(),
        lokasi_stock: newLokasiStock.trim().toUpperCase() || '01 - OFFICE',
        sts_print: newStsPrint,
        tgl_print: toIsoDate(newTglPrint) || (newStsPrint === 'Printed' ? todayIso() : null),
        sts_post: newStsPost,
        tgl_post: toIsoDate(newTglPost) || (newStsPost === 'Posting' ? tglIso : null),
        dibuat_oleh: newDibuatOleh.trim().toUpperCase() || currentUser,
        tgl_created: toIsoDate(newTglCreated) || todayIso(),
      };

      if (editingId) {
        headerPayload.id = editingId;
        headerPayload.diupdate_oleh = newDiupdateOleh.trim().toUpperCase() || currentUser;
        headerPayload.tgl_update = toIsoDate(newTglUpdate) || todayIso();
      } else {
        headerPayload.diupdate_oleh = newDiupdateOleh.trim() ? newDiupdateOleh.trim().toUpperCase() : '-';
        headerPayload.tgl_update = toIsoDate(newTglUpdate);
      }

      const detailPayloads = activeDetails.map((d, idx) => ({
        no_urut: idx + 1,
        kode: d.kode.trim().toUpperCase(),
        nama_barang: d.namaBarang.trim(),
        unit: d.unit.trim().toUpperCase() || 'PCS',
        terima: Number(d.terima || 0),
        qty: Number(d.qty || 0),
        harga: Number(d.harga || 0),
        jumlah: Number(d.jumlah || 0),
        total: Number(d.total || 0),
      }));

      const res = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'surat-jalan',
        headerPayload,
        detailPayloads
      );

      const savedHeader = mapDbToSj(res.header);
      const savedDetails =
        res.details && res.details.length > 0
          ? res.details.map((d, idx) => mapDbToDetail(d, idx))
          : activeDetails.map((d, idx) => ({
              ...d,
              suratJalanId: savedHeader.id,
              noUrut: idx + 1,
            }));

      if (editingId) {
        setSjList((prev) => prev.map((item) => (item.id === editingId ? savedHeader : item)));
        showFeedback(
          res.detailWarning
            ? `Surat Jalan diperbarui (${res.detailWarning})`
            : 'Surat Jalan & S.J. Detail diperbarui'
        );
      } else {
        setSjList((prev) => [savedHeader, ...prev]);
        setSelectedId(savedHeader.id);
        showFeedback(
          res.detailWarning
            ? `Surat Jalan tersimpan (${res.detailWarning})`
            : 'Surat Jalan & S.J. Detail tersimpan'
        );
      }

      setSjDetailsMap((prev) => ({
        ...prev,
        [savedHeader.id]: savedDetails,
      }));

      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Surat Jalan';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('surat_jalan_details', id, 'surat_jalan_id').catch(() => {});
      await erpDelete('surat_jalans', id);
      const updated = sjList.filter((item) => item.id !== id);
      setSjList(updated);
      setSjDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setConfirmDeleteRow(null);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Surat Jalan dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = sjList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    if (searchField === 'Nama Pelanggan') return item.namaCustomer.toLowerCase().includes(term);
    if (searchField === 'No.Bukti') return item.noBukti.toLowerCase().includes(term);
    if (searchField === 'No.SO') return item.noSo.toLowerCase().includes(term);
    if (searchField === 'PO.NO') return item.poNo.toLowerCase().includes(term);
    if (searchField === 'Sales') return item.sales.toLowerCase().includes(term);
    if (searchField === 'No.Faktur') return item.noFaktur.toLowerCase().includes(term);
    if (searchField === 'Lokasi Stock') return item.lokasiStock.toLowerCase().includes(term);
    if (searchField === 'Keterangan') return item.keterangan.toLowerCase().includes(term);
    if (searchField === 'Sts.Post') return item.stsPost.toLowerCase().includes(term);
    return (
      item.noBukti.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.noSo.toLowerCase().includes(term) ||
      item.poNo.toLowerCase().includes(term) ||
      item.sales.toLowerCase().includes(term) ||
      item.noFaktur.toLowerCase().includes(term) ||
      item.lokasiStock.toLowerCase().includes(term) ||
      item.keterangan.toLowerCase().includes(term) ||
      item.stsPost.toLowerCase().includes(term)
    );
  });

  const findModalRows = sjList.filter((item) => {
    if (!findQuery.trim()) return true;
    const tokens = findQuery.trim().toLowerCase().split(/\s+/);
    const searchable = [
      item.noBukti,
      item.tanggal,
      item.namaCustomer,
      item.noSo,
      item.poNo,
      item.sales,
      item.noFaktur,
      item.lokasiStock,
      item.keterangan,
      item.stsPost,
    ]
      .join(' ')
      .toLowerCase();
    return tokens.every((t) => searchable.includes(t));
  });

  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
    const clean = val.trim().toLowerCase();
    const matched = sjList.filter((item) => {
      if (filterIso && item.tanggalIso !== filterIso) return false;
      if (!clean) return true;
      if (searchField === 'Nama Pelanggan') return item.namaCustomer.toLowerCase().includes(clean);
      if (searchField === 'No.Bukti') return item.noBukti.toLowerCase().includes(clean);
      if (searchField === 'No.SO') return item.noSo.toLowerCase().includes(clean);
      if (searchField === 'PO.NO') return item.poNo.toLowerCase().includes(clean);
      if (searchField === 'Sales') return item.sales.toLowerCase().includes(clean);
      if (searchField === 'No.Faktur') return item.noFaktur.toLowerCase().includes(clean);
      if (searchField === 'Lokasi Stock') return item.lokasiStock.toLowerCase().includes(clean);
      if (searchField === 'Keterangan') return item.keterangan.toLowerCase().includes(clean);
      if (searchField === 'Sts.Post') return item.stsPost.toLowerCase().includes(clean);
      return (
        item.noBukti.toLowerCase().includes(clean) ||
        item.namaCustomer.toLowerCase().includes(clean) ||
        item.noSo.toLowerCase().includes(clean) ||
        item.poNo.toLowerCase().includes(clean) ||
        item.sales.toLowerCase().includes(clean) ||
        item.noFaktur.toLowerCase().includes(clean) ||
        item.lokasiStock.toLowerCase().includes(clean) ||
        item.keterangan.toLowerCase().includes(clean) ||
        item.stsPost.toLowerCase().includes(clean)
      );
    });
    if (matched.length > 0 && !matched.some((m) => m.id === selectedId)) {
      setSelectedId(matched[0].id);
    }
  };

  const handleExecuteToolbarSearch = async () => {
    const rows = await loadData({
      field: searchField,
      term: searchTerm,
      tglFilter: tanggalFilter,
    });
    if (rows && rows.length > 0) {
      setSelectedId(rows[0].id);
      showFeedback(
        searchTerm.trim()
          ? `Ditemukan ${rows.length} Surat Jalan dari Supabase`
          : `Menampilkan ${rows.length} Surat Jalan dari Supabase`
      );
    } else if (rows) {
      setSelectedId('');
      showFeedback('Data Surat Jalan tidak ditemukan di Supabase');
    }
  };

  const handleResetSearch = async () => {
    setSearchTerm('');
    setSearchField('Semua');
    const rows = await loadData({ field: 'Semua', term: '', tglFilter: tanggalFilter });
    if (rows) {
      showFeedback(`Filter direset (${rows.length} Surat Jalan)`);
    }
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    setFindQuery(searchTerm);
    await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
    setTimeout(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }, 60);
  };

  const handleOpenPrint = (mode: 'list' | 'detail' = 'list') => {
    setPrintMode(mode);
    setIsPrintOpen(true);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Surat_Jalan',
      sheetTitle: 'LIST SURAT JALAN',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'No.SO', accessor: 'noSo' },
        { header: 'PO.NO', accessor: 'poNo' },
        { header: 'Sales', accessor: 'sales' },
        { header: 'No.Faktur', accessor: 'noFaktur' },
        { header: 'Lokasi Stock', accessor: 'lokasiStock' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Sts.Post', accessor: 'stsPost', align: 'center' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
        { header: 'Tgl.Created', accessor: 'tglCreated', align: 'center' },
        { header: 'Diupdate Oleh', accessor: 'diupdateOleh' },
        { header: 'Tgl.Update', accessor: 'tglUpdate', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const customerDropdownChoices = Array.from(
    new Set([...customerOptions, newCustomer.trim().toUpperCase()].filter(Boolean))
  );

  const soDropdownChoices = Array.from(
    new Set([...soOptions.map((s) => s.noBukti), newNoSo.trim().toUpperCase()].filter(Boolean))
  );

  const salesDropdownChoices = Array.from(
    new Set([...salesOptions, newSales.trim().toUpperCase()].filter(Boolean))
  );

  const lokasiDropdownChoices = Array.from(
    new Set(['01 - OFFICE', ...lokasiOptions, newLokasiStock.trim().toUpperCase()].filter(Boolean))
  );

  const listPrintColumns: PrintColumn<SuratJalanItem>[] = [
    { header: 'No.Bukti', accessor: 'noBukti', width: '92px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '64px' },
    { header: 'Nama Customer', accessor: 'namaCustomer', width: '132px' },
    { header: 'No.SO', accessor: 'noSo', width: '88px' },
    { header: 'PO.NO', accessor: 'poNo', width: '78px' },
    { header: 'Sales', accessor: 'sales', width: '64px' },
    { header: 'No.Faktur', accessor: 'noFaktur', width: '84px' },
    { header: 'Lokasi Stock', accessor: 'lokasiStock', width: '80px' },
    { header: 'Keterangan', accessor: 'keterangan', width: '100px' },
    { header: 'Sts.Post', accessor: 'stsPost', align: 'center', width: '54px' },
    { header: 'Dibuat Oleh', accessor: 'dibuatOleh', width: '62px' },
    { header: 'Tgl.Created', accessor: 'tglCreated', align: 'center', width: '60px' },
  ];

  const detailPrintColumns: PrintColumn<SuratJalanDetailItem>[] = [
    { header: 'Kode', accessor: 'kode', width: '92px' },
    { header: 'Nama Barang', accessor: 'namaBarang' },
    { header: 'Unit', accessor: 'unit', align: 'center', width: '58px' },
    {
      header: 'Terima',
      accessor: (r) => formatMoney(r.terima),
      align: 'right',
      width: '68px',
    },
    {
      header: 'QTY',
      accessor: (r) => formatMoney(r.qty),
      align: 'right',
      width: '68px',
    },
    {
      header: 'Harga',
      accessor: (r) => formatMoney(r.harga),
      align: 'right',
      width: '96px',
    },
    {
      header: 'Jumlah',
      accessor: (r) => formatMoney(r.jumlah),
      align: 'right',
      width: '104px',
    },
    {
      header: 'Total',
      accessor: (r) => formatMoney(r.total),
      align: 'right',
      width: '104px',
    },
  ];

  return (
    <div
      id="list-surat-jalan-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="List Surat Jalan"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => handleOpenPrint('list')}
        onTableView={() =>
          loadData({ field: searchField, term: searchTerm, tglFilter: tanggalFilter })
        }
        onExportExcel={handleExportExcel}
      />

      <div className="shrink-0 bg-[#ECE9D8] border-b border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs shadow-sm overflow-x-auto">
        <div className="flex items-center space-x-2">
          <FormActionButtons
            onSimpan={handleToolbarSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={() => {
              const item = sjList.find((s) => s.id === selectedId);
              if (item) setConfirmDeleteRow(item);
              else showFeedback('Pilih data yang akan dihapus');
            }}
            onPrint={() => handleOpenPrint('list')}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />
          {onOpenPrintReport && (
            <button
              type="button"
              onClick={onOpenPrintReport}
              className="h-[28px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] active:bg-[#DCD8C8] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1 text-[11px] font-sans text-black cursor-pointer whitespace-nowrap"
              title="Buka Dialog Laporan Surat Jalan"
            >
              <span className="text-blue-700">🖶</span>
              <span>Laporan Surat Jalan</span>
            </button>
          )}
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
            {filteredList.length} DO
          </div>
        </div>
      </div>

      {/* Upper Table: List Surat Jalan */}
      <div className="flex-[1.35] min-h-[160px] overflow-auto bg-white border border-[#7A7A7A] mx-2 mt-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1520px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Bukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.SO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">PO.NO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Faktur</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Lokasi Stock</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Post</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Post</th>
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
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tanggal}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-medium">{item.namaCustomer}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noSo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.poNo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.sales}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noFaktur}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.lokasiStock}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.stsPrint}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.tglPrint || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.stsPost}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.tglPost || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.dibuatOleh}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.diupdateOleh || '-'}</td>
                  <td className="px-3 py-1">{item.tglUpdate || '-'}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={18} className="text-center py-6 text-gray-500">
                  Tidak ada data surat jalan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lower Panel: S.J. Detail for Selected Surat Jalan */}
      <div className="flex-1 min-h-[145px] flex flex-col mx-2 mt-1.5 mb-1 border border-[#7A7A7A] bg-white shadow-inner overflow-hidden">
        <div className="shrink-0 bg-[#E6E3D5] border-b border-[#ACA899] px-2.5 py-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-[#003C74] whitespace-nowrap">S.J. Detail</span>
            {selectedSj ? (
              <span className="text-[11px] text-gray-800 truncate">
                No. Bukti: <b className="font-mono">{selectedSj.noBukti}</b> | No. SO:{' '}
                <b className="font-mono text-[#000084]">{selectedSj.noSo || '-'}</b> | Customer:{' '}
                <b>{selectedSj.namaCustomer}</b> | Lokasi:{' '}
                <b className="text-[#0055EA]">{selectedSj.lokasiStock}</b>
                {isSelectedDetailFromSoFallback && (
                  <span className="ml-2 px-1.5 py-0.5 bg-[#FFF7D6] border border-[#D4B040] text-[10px] text-[#7A5900] rounded-xs">
                    Sumber: S.O. Detail
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[11px] text-gray-500 italic">
                Pilih Surat Jalan di atas untuk melihat S.J. Detail (berdasarkan No. SO)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] font-bold text-gray-900 font-mono">
              Total QTY: {formatMoney(selectedDetailQty)} | Total: {formatRupiah(selectedDetailTotal)}
            </span>
            {selectedSj && (
              <button
                type="button"
                onClick={() => handleOpenPrint('detail')}
                className="px-2.5 py-0.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded-xs text-[11px] font-semibold cursor-pointer"
              >
                Print S.J. Detail
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-left min-w-[920px] text-[11px]">
            <thead className="sticky top-0 bg-[#F4F4F4] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10">
              <tr>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-center w-10">No</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] w-28">Kode</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0]">Nama Barang</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-center w-20">Unit</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-20">Terima</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-20">QTY</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-28">Harga</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-32">Jumlah</th>
                <th className="px-2 py-1 text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedSjDetails.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                    Belum ada item S.J. Detail pada dokumen ini. Pilih No. SO saat Baru / Koreksi untuk memuat barang dari Sales Order.
                  </td>
                </tr>
              ) : (
                selectedSjDetails.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={`border-b border-[#E5E5E5] ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'
                    }`}
                  >
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-center">{idx + 1}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] font-mono font-semibold">{d.kode}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5]">{d.namaBarang}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-center">{d.unit}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono">{formatMoney(d.terima)}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono">{formatMoney(d.qty)}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono">{formatMoney(d.harga)}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono">{formatMoney(d.jumlah)}</td>
                    <td className="px-2 py-1 text-right font-mono font-semibold">{formatMoney(d.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Search Bar */}
      <div className="shrink-0 bg-[#ECE9D8] border-t border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs gap-2 overflow-x-auto">
        <div className="flex items-center space-x-2 shrink-0">
          <span className="font-semibold">Search :</span>
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="px-2 py-0.5 bg-white border border-[#7A7A7A] text-xs rounded"
          >
            <option value="Semua">Semua</option>
            <option value="Nama Pelanggan">Nama Pelanggan</option>
            <option value="No.Bukti">No.Bukti</option>
            <option value="No.SO">No.SO</option>
            <option value="PO.NO">PO.NO</option>
            <option value="Sales">Sales</option>
            <option value="No.Faktur">No.Faktur</option>
            <option value="Lokasi Stock">Lokasi Stock</option>
            <option value="Keterangan">Keterangan</option>
            <option value="Sts.Post">Sts.Post</option>
          </select>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchTermChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExecuteToolbarSearch();
            }}
            placeholder="Cari surat jalan..."
            className="px-2 py-0.5 w-52 bg-white border border-[#7A7A7A] text-xs shadow-inner"
          />
          <button
            type="button"
            disabled={isBusy}
            onClick={handleExecuteToolbarSearch}
            className="px-2.5 py-0.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] text-xs font-semibold cursor-pointer"
          >
            Cari
          </button>
          {(searchTerm || searchField !== 'Semua') && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleResetSearch}
              className="px-2 py-0.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] text-xs cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4 shrink-0">
          <div className="w-60 h-5 bg-[#FFFF00] border border-[#919191] shadow-inner px-2 text-[10px] flex items-center text-black truncate">
            {selectedSj ? `${selectedSj.noBukti} - ${selectedSj.namaCustomer}` : ''}
          </div>
          <div className="font-semibold px-2 py-0.5 bg-[#ECE9D8] border border-[#919191]">
            Record {filteredList.length}
          </div>
        </div>
      </div>

      {/* Add / Koreksi Surat Jalan Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[960px] max-w-[97vw] max-h-[94vh] flex flex-col overflow-hidden">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs shrink-0">
              <span>{editingId ? 'Koreksi Surat Jalan' : 'Tambah Surat Jalan Baru'}</span>
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
              {/* Header Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">No. Bukti:</label>
                  <input
                    type="text"
                    value={newNoBukti}
                    onChange={(e) => setNewNoBukti(e.target.value)}
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                    required
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Tanggal:</label>
                  <div className="w-64">
                    <DatePickerInput
                      value={newTanggal}
                      onChange={(formatted) => setNewTanggal(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>

                {/* No. SO Dropdown with Auto-Fill */}
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0 text-[#000084]">
                    No. SO (Auto-Fill):
                  </label>
                  <div className="w-64 flex gap-1">
                    <select
                      value={newNoSo}
                      onChange={(e) => applySalesOrderAutoFill(e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1 bg-[#FFFF99] border border-[#000084] font-mono font-semibold uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih No. SO --</option>
                      {soDropdownChoices.map((so) => {
                        const info = soOptions.find((s) => s.noBukti === so);
                        return (
                          <option key={so} value={so}>
                            {info && info.namaCustomer ? `${so} - ${info.namaCustomer}` : so}
                          </option>
                        );
                      })}
                    </select>
                    {newNoSo && (
                      <button
                        type="button"
                        onClick={() => applySalesOrderAutoFill(newNoSo)}
                        title="Muat ulang data & S.J Detail dari No. SO"
                        className="px-2 py-1 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] text-[10px] font-bold cursor-pointer shrink-0"
                      >
                        Sync
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Nama Customer:</label>
                  <select
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    required
                  >
                    <option value="">-- Pilih Customer --</option>
                    {customerDropdownChoices.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">PO.NO:</label>
                  <input
                    type="text"
                    value={newPoNo}
                    onChange={(e) => setNewPoNo(e.target.value)}
                    placeholder="Otomatis dari No. SO"
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Sales:</label>
                  <select
                    value={newSales}
                    onChange={(e) => setNewSales(e.target.value)}
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Sales --</option>
                    {salesDropdownChoices.map((sl) => (
                      <option key={sl} value={sl}>
                        {sl}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">No. Faktur:</label>
                  <input
                    type="text"
                    value={newNoFaktur}
                    onChange={(e) => setNewNoFaktur(e.target.value)}
                    placeholder="Otomatis dari Faktur / No. SO"
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Lokasi Stock:</label>
                  <select
                    value={newLokasiStock}
                    onChange={(e) => setNewLokasiStock(e.target.value)}
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                  >
                    {lokasiDropdownChoices.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Sts.Print / Tgl.Print:</label>
                  <div className="w-64 grid grid-cols-2 gap-1.5">
                    <select
                      value={newStsPrint}
                      onChange={(e) => setNewStsPrint(e.target.value)}
                      className="px-1.5 py-1 bg-white border border-[#7A7A7A]"
                    >
                      <option value="Not Yet">Not Yet</option>
                      <option value="Printed">Printed</option>
                    </select>
                    <DatePickerInput
                      value={newTglPrint}
                      onChange={(formatted) => setNewTglPrint(formatted)}
                      format="dMyShort"
                      placeholder="Tgl Print"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Sts.Post / Tgl.Post:</label>
                  <div className="w-64 grid grid-cols-2 gap-1.5">
                    <select
                      value={newStsPost}
                      onChange={(e) => setNewStsPost(e.target.value)}
                      className="px-1.5 py-1 bg-white border border-[#7A7A7A]"
                    >
                      <option value="Not Yet">Not Yet</option>
                      <option value="Posting">Posting</option>
                    </select>
                    <DatePickerInput
                      value={newTglPost}
                      onChange={(formatted) => setNewTglPost(formatted)}
                      format="dMyShort"
                      placeholder="Tgl Post"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Keterangan:</label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    placeholder="Otomatis dari No. SO atau ketik manual..."
                    className="flex-1 max-w-[730px] px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
              </div>

              {/* S.J Detail Section */}
              <div className="border border-[#999999] bg-white rounded-xs overflow-hidden">
                <div className="bg-[#E6E3D5] border-b border-[#C0C0C0] px-2.5 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#003C74]">S.J. Detail</span>
                    <span className="text-[11px] text-gray-600">
                      {newNoSo
                        ? `(Terhubung ke Sales Order: ${newNoSo})`
                        : '(Pilih No. SO di atas untuk mengisi S.J. Detail otomatis)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDetailRow}
                    className="px-2.5 py-0.5 bg-[#000084] hover:bg-[#0000A8] text-white border border-black rounded-xs text-[11px] font-semibold cursor-pointer"
                  >
                    + Tambah Baris
                  </button>
                </div>
                <div className="max-h-[200px] overflow-auto">
                  <table className="w-full border-collapse text-left min-w-[820px]">
                    <thead className="sticky top-0 bg-[#F0F0F0] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10 text-[11px]">
                      <tr>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-center w-8">No</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] w-36">Kode</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0]">Nama Barang</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-center w-16">Unit</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-16">Terima</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-16">QTY</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-24">Harga</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-24">Jumlah</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-24">Total</th>
                        <th className="px-1.5 py-1 text-center w-10">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-4 text-gray-500 italic text-[11px]">
                            Belum ada item S.J. Detail. Pilih No. SO atau klik &quot;+ Tambah Baris&quot;.
                          </td>
                        </tr>
                      ) : (
                        detailRows.map((d, idx) => {
                          const kodeChoices = Array.from(
                            new Set([...barangOptions.map((b) => b.kode), d.kode].filter(Boolean))
                          );
                          return (
                            <tr key={d.id} className="border-b border-[#E5E5E5] text-[11px]">
                              <td className="px-1.5 py-1 border-r border-[#E5E5E5] text-center">{idx + 1}</td>
                              <td className="p-0.5 border-r border-[#E5E5E5]">
                                <select
                                  value={d.kode}
                                  onChange={(e) => handleDetailSelectBarang(d.id, e.target.value)}
                                  className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs font-mono text-[11px] uppercase cursor-pointer"
                                >
                                  <option value="">-- Kode --</option>
                                  {kodeChoices.map((kode) => {
                                    const b = barangOptions.find((item) => item.kode === kode);
                                    return (
                                      <option key={kode} value={kode}>
                                        {b ? `${kode} - ${b.namaBarang}` : kode}
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
                                  onChange={(e) =>
                                    handleDetailFieldChange(d.id, 'unit', e.target.value)
                                  }
                                  className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-center text-[11px] uppercase"
                                />
                              </td>
                              <td className="p-0.5 border-r border-[#E5E5E5]">
                                <input
                                  type="number"
                                  value={d.terima}
                                  onChange={(e) =>
                                    handleDetailFieldChange(d.id, 'terima', e.target.value)
                                  }
                                  className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-right font-mono text-[11px]"
                                />
                              </td>
                              <td className="p-0.5 border-r border-[#E5E5E5]">
                                <input
                                  type="number"
                                  value={d.qty}
                                  onChange={(e) =>
                                    handleDetailFieldChange(d.id, 'qty', e.target.value)
                                  }
                                  className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-right font-mono text-[11px]"
                                />
                              </td>
                              <td className="p-0.5 border-r border-[#E5E5E5]">
                                <input
                                  type="number"
                                  value={d.harga}
                                  onChange={(e) =>
                                    handleDetailFieldChange(d.id, 'harga', e.target.value)
                                  }
                                  className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-right font-mono text-[11px]"
                                />
                              </td>
                              <td className="px-1.5 py-1 border-r border-[#E5E5E5] text-right font-mono bg-[#FAFAFA]">
                                {formatMoney(d.jumlah)}
                              </td>
                              <td className="px-1.5 py-1 border-r border-[#E5E5E5] text-right font-mono font-semibold bg-[#FAFAFA]">
                                {formatMoney(d.total)}
                              </td>
                              <td className="p-0.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDetailRow(d.id)}
                                  className="px-1.5 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xs font-bold text-[10px] cursor-pointer"
                                  title="Hapus baris"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-[#F5F4EE] border-t border-[#C0C0C0] px-2.5 py-1 flex items-center justify-between text-[11px] font-bold">
                  <span>
                    Jumlah Item: {detailRows.filter((d) => d.kode.trim() || d.namaBarang.trim()).length}
                  </span>
                  <span className="font-mono text-[#003C74]">
                    Total S.J. Detail: {formatRupiah(modalDetailTotal)}
                  </span>
                </div>
              </div>

              {/* Audit Fields */}
              <div className="border-t border-[#D0D0D0] pt-2.5 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Dibuat Oleh:</label>
                  <input
                    type="text"
                    value={newDibuatOleh}
                    onChange={(e) => setNewDibuatOleh(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tgl. Created:</label>
                  <DatePickerInput
                    value={newTglCreated}
                    onChange={(formatted) => setNewTglCreated(formatted)}
                    format="dMyShort"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Diupdate Oleh:</label>
                  <input
                    type="text"
                    value={newDiupdateOleh}
                    onChange={(e) => setNewDiupdateOleh(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tgl. Update:</label>
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
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Find Modal: Cari & Daftar Surat Jalan */}
      {isFindOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] shadow-2xl w-[940px] max-w-[96vw] max-h-[85vh] flex flex-col text-xs">
            <div className="bg-[#000080] text-white px-3 py-1.5 flex items-center justify-between font-bold shrink-0">
              <span>Cari &amp; Daftar Surat Jalan (Supabase)</span>
              <button
                type="button"
                onClick={() => setIsFindOpen(false)}
                className="px-1.5 bg-[#C00000] text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-3 space-y-2 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-bold whitespace-nowrap">Cari :</span>
                <input
                  ref={findInputRef}
                  type="text"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && findModalRows.length > 0) {
                      const first = findModalRows[0];
                      setSelectedId(first.id);
                      setSearchTerm(findQuery);
                      setIsFindOpen(false);
                      showFeedback(`Surat Jalan [${first.noBukti}] dipilih`);
                    }
                  }}
                  placeholder="Cari No.Bukti, Nama Customer, No.SO, PO.NO, Sales, No.Faktur, Lokasi Stock, Keterangan..."
                  className="flex-1 h-[24px] px-2 bg-white border border-[#7F9DB9] outline-none"
                />
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    const rows = await loadData({
                      field: 'Semua',
                      term: findQuery,
                      tglFilter: 'Semua',
                    });
                    setSearchField('Semua');
                    setSearchTerm(findQuery);
                    if (rows && rows.length > 0) {
                      setSelectedId(rows[0].id);
                      showFeedback(`Ditemukan ${rows.length} Surat Jalan dari Supabase`);
                    } else if (rows) {
                      showFeedback('Data Surat Jalan tidak ditemukan di Supabase');
                    }
                  }}
                  className="h-[24px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer"
                >
                  Cari
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    setFindQuery('');
                    setSearchTerm('');
                    setSearchField('Semua');
                    await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
                    showFeedback('Data Surat Jalan di-refresh dari Supabase');
                  }}
                  className="h-[24px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer"
                >
                  Refresh
                </button>
              </div>
              <div className="flex-1 min-h-[240px] overflow-auto bg-white border border-[#7F9DB9]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#ACA899]">
                    <tr>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-28">No.Bukti</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-22">Tanggal</th>
                      <th className="px-2 py-1 border-r border-[#ACA899]">Nama Customer</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-28">No.SO</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-24">PO.NO</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-20">Sales</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-28">No.Faktur</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-28">Lokasi Stock</th>
                      <th className="px-2 py-1 w-36">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findModalRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-6 text-gray-500 italic">
                          Tidak ada data Surat Jalan yang cocok
                        </td>
                      </tr>
                    ) : (
                      findModalRows.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => {
                            setSelectedId(s.id);
                            setSearchTerm(findQuery);
                            setIsFindOpen(false);
                            showFeedback(`Surat Jalan [${s.noBukti} - ${s.namaCustomer}] dipilih`);
                          }}
                          className={`cursor-pointer border-b border-[#E0E0E0] hover:bg-[#316AC5] hover:text-white ${
                            s.id === selectedId ? 'bg-[#FFFF99]' : ''
                          }`}
                        >
                          <td className="px-2 py-1 font-mono font-bold border-r border-[#E0E0E0]">{s.noBukti}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{s.tanggal}</td>
                          <td className="px-2 py-1 font-semibold border-r border-[#E0E0E0]">{s.namaCustomer}</td>
                          <td className="px-2 py-1 font-mono border-r border-[#E0E0E0]">{s.noSo || '-'}</td>
                          <td className="px-2 py-1 font-mono border-r border-[#E0E0E0]">{s.poNo || '-'}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{s.sales || '-'}</td>
                          <td className="px-2 py-1 font-mono border-r border-[#E0E0E0]">{s.noFaktur || '-'}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{s.lokasiStock || '-'}</td>
                          <td className="px-2 py-1 truncate max-w-[160px]">{s.keterangan || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-[#555]">
                  Menampilkan {findModalRows.length} dari {sjList.length} Surat Jalan. Klik baris untuk memilih record.
                </span>
                <button
                  type="button"
                  onClick={() => setIsFindOpen(false)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-xl w-[360px] overflow-hidden">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 font-bold text-xs">
              Konfirmasi Hapus Surat Jalan
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>
                Yakin ingin menghapus Surat Jalan [{confirmDeleteRow.noBukti}] dari database Supabase?
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
                  onClick={() => handleDelete(confirmDeleteRow.id)}
                  className="px-3 py-1 bg-[#C00000] text-white border border-black text-xs font-bold cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dual-mode Print Preview: List Surat Jalan & S.J. Detail */}
      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={
          printMode === 'detail'
            ? 'SURAT JALAN (S.J. DETAIL)'
            : 'LAPORAN LIST SURAT JALAN (DO)'
        }
        subtitle={
          printMode === 'detail'
            ? `No. Bukti: ${selectedSj?.noBukti || '-'} | Customer: ${selectedSj?.namaCustomer || '-'}`
            : `Filter Tanggal: ${tanggalFilter}`
        }
        metaLines={
          printMode === 'detail' && selectedSj
            ? [
                { label: 'No. Bukti', value: selectedSj.noBukti },
                { label: 'Tanggal', value: selectedSj.tanggal },
                { label: 'Nama Customer', value: selectedSj.namaCustomer },
                { label: 'No. SO', value: selectedSj.noSo || '-' },
                { label: 'PO.NO', value: selectedSj.poNo || '-' },
                { label: 'Sales', value: selectedSj.sales || '-' },
                { label: 'No. Faktur', value: selectedSj.noFaktur || '-' },
                { label: 'Lokasi Stock', value: selectedSj.lokasiStock || '-' },
                { label: 'Sts.Print / Post', value: `${selectedSj.stsPrint} / ${selectedSj.stsPost}` },
                { label: 'Keterangan', value: selectedSj.keterangan || '-' },
                { label: 'Dibuat Oleh', value: selectedSj.dibuatOleh },
                { label: 'Tgl. Created', value: selectedSj.tglCreated || '-' },
                { label: 'Diupdate Oleh', value: selectedSj.diupdateOleh || '-' },
                { label: 'Tgl. Update', value: selectedSj.tglUpdate || '-' },
              ]
            : []
        }
        orientation="landscape"
        toolbarExtra={
          selectedSj ? (
            <button
              type="button"
              onClick={() => setPrintMode((m) => (m === 'list' ? 'detail' : 'list'))}
              className="h-[26px] px-2.5 bg-[#374151] hover:bg-[#4B5563] border border-gray-500 text-white text-[10.5px] font-medium rounded-[2px] cursor-pointer"
            >
              Tampilan: {printMode === 'list' ? 'List Surat Jalan' : 'S.J. Detail'}
            </button>
          ) : undefined
        }
        columns={
          printMode === 'detail'
            ? (detailPrintColumns as PrintColumn<any>[])
            : (listPrintColumns as PrintColumn<any>[])
        }
        rows={printMode === 'detail' ? selectedSjDetails : filteredList}
        fileName={
          printMode === 'detail'
            ? `Surat_Jalan_Detail_${selectedSj?.noBukti || 'DO'}`
            : 'List_Surat_Jalan'
        }
        summaryItems={
          printMode === 'detail'
            ? [
                { label: 'Jumlah Item', value: `${selectedSjDetails.length} Item` },
                { label: 'Total QTY', value: formatMoney(selectedDetailQty) },
                { label: 'Total S.J. Detail', value: formatRupiah(selectedDetailTotal) },
              ]
            : [
                { label: 'Total Surat Jalan', value: `${filteredList.length} Dokumen` },
              ]
        }
      />
    </div>
  );
};
