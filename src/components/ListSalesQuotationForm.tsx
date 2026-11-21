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
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface SalesQuotationItem {
  id: string;
  noSq: string;
  tanggal: string;
  tanggalIso: string;
  namaCustomer: string;
  sales: string;
  noInquiry: string;
  lokasiStock: string;
  keterangan: string;
  amount: string;
  amountNum: number;
  dibuatOleh: string;
  tglCreated: string;
  diUpdateOleh: string;
  tglUpdate: string;
}

export interface SalesQuotationDetailItem {
  id: string;
  sqId?: string;
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

interface MasterCustomerOption {
  namaCustomer: string;
  sales: string;
}

interface SalesInquiryOption {
  noBukti: string;
  namaCustomer: string;
  namaSales: string;
}

interface MasterBarangOption {
  kode: string;
  namaBarang: string;
  unit: string;
  price: number;
  cost: number;
}

interface ListSalesQuotationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToQuotation(r: any): SalesQuotationItem {
  const amtNum = Number(r.amount || 0);
  return {
    id: r.id,
    noSq: r.no_sq || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaCustomer: r.nama_customer || '',
    sales: r.sales || '',
    noInquiry: r.no_inquiry || '',
    lokasiStock: r.lokasi_stock || '01 - OFFICE',
    keterangan: r.keterangan || '',
    amount: formatMoney(amtNum, true),
    amountNum: amtNum,
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diUpdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

function mapDbToSqDetail(d: any, idx = 0): SalesQuotationDetailItem {
  const qty = Number(d.qty || 0);
  const harga = Number(d.harga || 0);
  const jumlah = d.jumlah !== undefined && d.jumlah !== null ? Number(d.jumlah) : qty * harga;
  const total = d.total !== undefined && d.total !== null ? Number(d.total) : jumlah;
  return {
    id: d.id || `sqd-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    sqId: d.sq_id,
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

function createBlankDetailRow(noUrut: number): SalesQuotationDetailItem {
  return {
    id: `new-sqd-${Date.now()}-${noUrut}-${Math.random().toString(36).slice(2, 6)}`,
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

export const ListSalesQuotationForm: React.FC<ListSalesQuotationFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [quotationList, setQuotationList] = useState<SalesQuotationItem[]>([]);
  const [sqDetailsMap, setSqDetailsMap] = useState<Record<string, SalesQuotationDetailItem[]>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('');
  const [yellowNote, setYellowNote] = useState<string>('');

  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<'list' | 'detail'>('list');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [customerOptions, setCustomerOptions] = useState<MasterCustomerOption[]>([]);
  const [salesOptions, setSalesOptions] = useState<string[]>([]);
  const [inquiryOptions, setInquiryOptions] = useState<SalesInquiryOption[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);

  const [newNoSq, setNewNoSq] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('');
  const [newNoInquiry, setNewNoInquiry] = useState<string>('');
  const [newLokasiStock, setNewLokasiStock] = useState<string>('01 - OFFICE');
  const [newKeterangan, setNewKeterangan] = useState<string>('1. Price are Nett,');
  const [newAmount, setNewAmount] = useState<string>('0');
  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');
  const [detailRows, setDetailRows] = useState<SalesQuotationDetailItem[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadMasterReferences = async () => {
    const [custRes, salesRes, inqRes, lokasiRes, barangRes] = await Promise.allSettled([
      erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true, limit: 1000 }),
      erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true, limit: 1000 }),
      erpList<any>('sales_inquiries', { orderBy: 'tanggal_do', asc: false, limit: 1000 }),
      erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true, limit: 1000 }),
      erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 }),
    ]);

    if (custRes.status === 'fulfilled') {
      const custMap = new Map<string, MasterCustomerOption>();
      for (const c of custRes.value) {
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
      const uniqueSales = Array.from(
        new Set(
          salesRes.value
            .map((s: any) => String(s.nama_sales || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setSalesOptions(uniqueSales);
    }

    if (inqRes.status === 'fulfilled') {
      const inqMap = new Map<string, SalesInquiryOption>();
      for (const q of inqRes.value) {
        const noBukti = String(q.no_bukti || '').trim().toUpperCase();
        if (!noBukti) continue;
        inqMap.set(noBukti, {
          noBukti,
          namaCustomer: String(q.nama_customer || '').trim().toUpperCase(),
          namaSales: String(q.nama_sales || '').trim().toUpperCase(),
        });
      }
      setInquiryOptions(Array.from(inqMap.values()));
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

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'no_sq',
    'No. SQ': 'no_sq',
    'Nama Pelanggan': 'nama_customer',
    Sales: 'sales',
    'No. Inquiry': 'no_inquiry',
    'Lokasi Stock': 'lokasi_stock',
    Keterangan: 'keterangan',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
    tglFilter?: string;
  }): Promise<SalesQuotationItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const activeTgl = opts?.tglFilter ?? tanggalFilter;
      const isoFilter = activeTgl.trim() ? toIsoDate(activeTgl) : null;

      const queryOpts: Record<string, any> = {
        orderBy: 'tanggal',
        asc: false,
        limit: 1000,
      };
      if (isoFilter) queryOpts.eq = { tanggal: isoFilter };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'no_sq,nama_customer,sales,no_inquiry,lokasi_stock,keterangan';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows, details] = await Promise.all([
        erpList<any>('sales_quotations', queryOpts),
        erpList<any>('sales_quotation_details', { orderBy: 'no_urut', asc: true, limit: 5000 }).catch(() => []),
        loadMasterReferences(),
      ]);
      const mapped = rows.map(mapDbToQuotation);
      setQuotationList(mapped);

      const grouped: Record<string, SalesQuotationDetailItem[]> = {};
      for (const raw of details) {
        const key = String(raw.sq_id || '');
        if (!key) continue;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(mapDbToSqDetail(raw, grouped[key].length));
      }
      setSqDetailsMap(grouped);

      if (mapped.length > 0 && !mapped.some((r) => r.id === selectedId)) {
        setSelectedId(mapped[0].id);
        setYellowNote(`${mapped[0].noSq} - ${mapped[0].namaCustomer}`);
      } else if (mapped.length === 0) {
        setSelectedId('');
        setYellowNote('');
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
    const selected = quotationList.find((q) => q.id === selectedId);
    if (!selected) {
      showFeedback('Pilih baris Sales Quotation yang akan disimpan');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const existingDetails = sqDetailsMap[selected.id] || [];
      const totalFromDetails = existingDetails.reduce((acc, d) => acc + d.total, 0);
      const finalAmount = existingDetails.length > 0 ? totalFromDetails : selected.amountNum;

      const headerPayload: Record<string, any> = {
        id: selected.id,
        no_sq: selected.noSq.trim().toUpperCase(),
        tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
        nama_customer: selected.namaCustomer.trim().toUpperCase(),
        sales: selected.sales.trim().toUpperCase(),
        no_inquiry: selected.noInquiry.trim().toUpperCase(),
        lokasi_stock: selected.lokasiStock.trim().toUpperCase() || '01 - OFFICE',
        keterangan: selected.keterangan.trim(),
        amount: finalAmount,
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
        terima: Number(d.terima || 0),
        qty: Number(d.qty || 0),
        harga: Number(d.harga || 0),
        jumlah: Number(d.jumlah || 0),
        total: Number(d.total || 0),
      }));

      const res = await erpCompositeSave<{ header: any; details: any[] }>(
        'sales-quotation',
        headerPayload,
        detailPayloads
      );
      const savedHeader = mapDbToQuotation(res.header);
      const savedDetails = (res.details || []).map((d, idx) => mapDbToSqDetail(d, idx));
      setQuotationList((prev) => prev.map((item) => (item.id === selected.id ? savedHeader : item)));
      setSqDetailsMap((prev) => ({ ...prev, [savedHeader.id]: savedDetails }));
      setYellowNote(`${savedHeader.noSq} - ${savedHeader.namaCustomer}`);
      showFeedback(`Sales Quotation [${savedHeader.noSq}] berhasil disimpan`);
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const selectedSq = useMemo(
    () => quotationList.find((q) => q.id === selectedId) || null,
    [quotationList, selectedId]
  );

  const selectedSqDetails = useMemo(
    () => (selectedId ? sqDetailsMap[selectedId] || [] : []),
    [sqDetailsMap, selectedId]
  );

  const selectedDetailTotal = useMemo(
    () => selectedSqDetails.reduce((acc, d) => acc + d.total, 0),
    [selectedSqDetails]
  );

  const modalDetailTotal = useMemo(
    () => detailRows.reduce((acc, d) => acc + d.total, 0),
    [detailRows]
  );

  if (!isOpen) return null;

  const updateDetailRowsWithSync = (
    updater: (prev: SalesQuotationDetailItem[]) => SalesQuotationDetailItem[]
  ) => {
    setDetailRows((prev) => {
      const next = updater(prev);
      const hasFilledRow = next.some((r) => r.kode.trim() || r.namaBarang.trim());
      if (hasFilledRow) {
        const sum = next.reduce((acc, r) => acc + r.total, 0);
        setNewAmount(String(sum));
      }
      return next;
    });
  };

  const handleAddDetailRow = () => {
    updateDetailRowsWithSync((prev) => [...prev, createBlankDetailRow(prev.length + 1)]);
  };

  const handleRemoveDetailRow = (rowId: string) => {
    updateDetailRowsWithSync((prev) =>
      prev
        .filter((r) => r.id !== rowId)
        .map((r, idx) => ({ ...r, noUrut: idx + 1 }))
    );
  };

  const handleDetailSelectBarang = (rowId: string, selectedKode: string) => {
    const cleanKode = selectedKode.trim().toUpperCase();
    const found = barangOptions.find((b) => b.kode === cleanKode);
    updateDetailRowsWithSync((prev) =>
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
    field: keyof SalesQuotationDetailItem,
    rawValue: string
  ) => {
    updateDetailRowsWithSync((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated: SalesQuotationDetailItem = { ...r };
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

  const handleSelectCustomer = (customerName: string) => {
    setNewCustomer(customerName);
    const foundCust = customerOptions.find((c) => c.namaCustomer === customerName);
    if (foundCust?.sales && !newSales.trim()) {
      setNewSales(foundCust.sales);
    }
  };

  const handleSelectInquiry = (noBukti: string) => {
    setNewNoInquiry(noBukti);
    const foundInq = inquiryOptions.find((q) => q.noBukti === noBukti);
    if (foundInq) {
      if (foundInq.namaCustomer && !newCustomer.trim()) {
        setNewCustomer(foundInq.namaCustomer);
      }
      if (foundInq.namaSales && !newSales.trim()) {
        setNewSales(foundInq.namaSales);
      }
    }
  };

  const handleAddNew = async () => {
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setNewNoSq(nextUniqueCode(quotationList.map((q) => q.noSq), '2608-SQ-', 3));
    setNewTanggal(todayDisp);
    setNewCustomer('');
    setNewSales('');
    setNewNoInquiry('');
    setNewLokasiStock(lokasiOptions[0] || '01 - OFFICE');
    setNewKeterangan('1. Price are Nett,');
    setNewAmount('0');
    setNewDibuatOleh(currentUser);
    setNewTglCreated(todayDisp);
    setNewDiupdateOleh('-');
    setNewTglUpdate('');
    setDetailRows([createBlankDetailRow(1)]);
    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleEdit = async () => {
    const item = quotationList.find((q) => q.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(item.id);
    setModalError(null);
    setNewNoSq(item.noSq);
    setNewTanggal(item.tanggal || todayDisp);
    setNewCustomer(item.namaCustomer);
    setNewSales(item.sales);
    setNewNoInquiry(item.noInquiry);
    setNewLokasiStock(item.lokasiStock || lokasiOptions[0] || '01 - OFFICE');
    setNewKeterangan(item.keterangan);
    setNewAmount(String(item.amountNum));
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(
      item.diUpdateOleh && item.diUpdateOleh !== '-' ? item.diUpdateOleh : currentUser
    );
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);

    const existingDetails = sqDetailsMap[item.id] || [];
    setDetailRows(
      existingDetails.length > 0
        ? existingDetails.map((d, idx) => ({ ...d, noUrut: idx + 1 }))
        : [createBlankDetailRow(1)]
    );

    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoSq.trim() || !newCustomer.trim()) {
      setModalError('No. SQ dan Nama Customer wajib diisi.');
      return;
    }

    const activeDetails = detailRows.filter(
      (d) => d.kode.trim() !== '' || d.namaBarang.trim() !== ''
    );
    const totalFromDetails = activeDetails.reduce((acc, d) => acc + d.total, 0);
    const finalAmount = activeDetails.length > 0 ? totalFromDetails : parseNum(newAmount);

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const baseHeader: Record<string, any> = {
        no_sq: newNoSq.trim().toUpperCase(),
        tanggal: toIsoDate(newTanggal) || todayIso(),
        nama_customer: newCustomer.trim().toUpperCase(),
        sales: newSales.trim().toUpperCase(),
        no_inquiry: newNoInquiry.trim().toUpperCase(),
        lokasi_stock: newLokasiStock.trim().toUpperCase() || '01 - OFFICE',
        keterangan: newKeterangan.trim(),
        amount: finalAmount,
        dibuat_oleh: newDibuatOleh.trim().toUpperCase() || currentUser,
        tgl_created: toIsoDate(newTglCreated) || todayIso(),
      };

      if (editingId) {
        baseHeader.id = editingId;
        baseHeader.diupdate_oleh = newDiupdateOleh.trim().toUpperCase() || currentUser;
        baseHeader.tgl_update = toIsoDate(newTglUpdate) || todayIso();
      } else {
        baseHeader.diupdate_oleh = newDiupdateOleh.trim()
          ? newDiupdateOleh.trim().toUpperCase()
          : '-';
        baseHeader.tgl_update = toIsoDate(newTglUpdate);
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

      const res = await erpCompositeSave<{ header: any; details: any[] }>(
        'sales-quotation',
        baseHeader,
        detailPayloads
      );

      const savedHeader = mapDbToQuotation(res.header);
      const savedDetails = (res.details || []).map((d, idx) => mapDbToSqDetail(d, idx));

      if (editingId) {
        setQuotationList((prev) => prev.map((item) => (item.id === editingId ? savedHeader : item)));
        showFeedback('Sales Quotation & S.O. Detail diperbarui');
      } else {
        setQuotationList((prev) => [savedHeader, ...prev]);
        setSelectedId(savedHeader.id);
        setYellowNote(`${savedHeader.noSq} - ${savedHeader.namaCustomer}`);
        showFeedback('Sales Quotation & S.O. Detail tersimpan');
      }

      setSqDetailsMap((prev) => ({
        ...prev,
        [savedHeader.id]: savedDetails,
      }));

      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Sales Quotation';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('sales_quotation_details', id, 'sq_id').catch(() => {});
      await erpDelete('sales_quotations', id);
      const updated = quotationList.filter((item) => item.id !== id);
      setQuotationList(updated);
      setSqDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
        setYellowNote(updated[0] ? `${updated[0].noSq} - ${updated[0].namaCustomer}` : '');
      }
      showFeedback('Sales Quotation dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter.trim() ? toIsoDate(tanggalFilter) : null;

  const filteredList = quotationList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (searchField === 'Kode' || searchField === 'No. SQ') {
      return matchesMultiKeyword([item.noSq], searchTerm);
    }
    if (searchField === 'Nama Pelanggan') {
      return matchesMultiKeyword([item.namaCustomer], searchTerm);
    }
    if (searchField === 'Sales') {
      return matchesMultiKeyword([item.sales], searchTerm);
    }
    if (searchField === 'No. Inquiry') {
      return matchesMultiKeyword([item.noInquiry], searchTerm);
    }
    if (searchField === 'Lokasi Stock') {
      return matchesMultiKeyword([item.lokasiStock], searchTerm);
    }
    if (searchField === 'Keterangan') {
      return matchesMultiKeyword([item.keterangan], searchTerm);
    }
    return matchesMultiKeyword(
      [item.noSq, item.tanggal, item.namaCustomer, item.sales, item.noInquiry, item.lokasiStock, item.keterangan],
      searchTerm
    );
  });

  const totalAmount = filteredList.reduce((sum, q) => sum + q.amountNum, 0);

  const handleExecuteToolbarSearch = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm, tglFilter: tanggalFilter });
    if (rows && rows.length > 0) {
      setSelectedId(rows[0].id);
      setYellowNote(`${rows[0].noSq} - ${rows[0].namaCustomer}`);
      showFeedback(`Ditemukan ${rows.length} Sales Quotation dari Supabase`);
    } else if (rows) {
      showFeedback('Data Sales Quotation tidak ditemukan di Supabase');
    }
  };

  const handleResetToolbarSearch = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setTanggalFilter('');
    const rows = await loadData({ field: 'Semua', term: '', tglFilter: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Sales Quotation)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '', tglFilter: '' });
  };

  const handleOpenPrint = (mode?: 'list' | 'detail') => {
    setPrintMode(mode ?? (selectedSq ? 'detail' : 'list'));
    setIsPrintOpen(true);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Sales_Quotation',
      sheetTitle: 'LIST SALES QUOTATION',
      subtitle: `Filter Tanggal: ${tanggalFilter || 'Semua'}`,
      companyProfile: company,
      columns: [
        { header: 'No. SQ', accessor: 'noSq' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'Sales', accessor: 'sales' },
        { header: 'No. Inquiry', accessor: 'noInquiry' },
        { header: 'Lokasi Stock', accessor: 'lokasiStock' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Amount', accessor: 'amountNum', align: 'right' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const customerDropdownChoices = Array.from(
    new Set(
      [...customerOptions.map((c) => c.namaCustomer), newCustomer.trim().toUpperCase()].filter(Boolean)
    )
  );

  const salesDropdownChoices = Array.from(
    new Set([...salesOptions, newSales.trim().toUpperCase()].filter(Boolean))
  );

  const inquiryDropdownChoices = Array.from(
    new Set([...inquiryOptions.map((q) => q.noBukti), newNoInquiry.trim().toUpperCase()].filter(Boolean))
  );

  const lokasiDropdownChoices = Array.from(
    new Set(['01 - OFFICE', ...lokasiOptions, newLokasiStock.trim().toUpperCase()].filter(Boolean))
  );

  const listPrintColumns: PrintColumn<SalesQuotationItem>[] = [
    { header: 'No. SQ', accessor: 'noSq', width: '92px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '74px' },
    { header: 'Nama Customer', accessor: 'namaCustomer', width: '165px' },
    { header: 'Sales', accessor: 'sales', width: '88px' },
    { header: 'No. Inquiry', accessor: 'noInquiry', width: '92px' },
    { header: 'Lokasi Stock', accessor: 'lokasiStock', width: '105px' },
    { header: 'Keterangan', accessor: 'keterangan' },
    { header: 'Amount', accessor: 'amount', align: 'right', width: '95px' },
  ];

  const detailPrintColumns: PrintColumn<SalesQuotationDetailItem>[] = [
    { header: 'Kode', accessor: 'kode', width: '88px' },
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
      id="list-sales-quotation-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Sales Quotation"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => handleOpenPrint()}
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
              onPrint={() => handleOpenPrint()}
              onFind={handleFind}
              isBusy={isBusy}
              feedback={feedback}
            />

            <div className="flex items-center space-x-1.5 pl-2">
              <span className="font-bold text-black text-[11px]">Tanggal :</span>
              <DatePickerInput
                value={tanggalFilter}
                onChange={(formatted) => setTanggalFilter(formatted)}
                format="dMyShort"
                placeholder="Semua"
              />
              <button
                type="button"
                onClick={() => setTanggalFilter('')}
                className="px-3 h-[22px] bg-[#EAE6D9] hover:bg-[#F4F1E8] border border-[#7A7A7A] shadow-2xs text-[11px] text-black cursor-pointer"
              >
                Semua
              </button>
            </div>
          </div>

          <div className="font-bold text-[15px] text-black pr-6">{formatRupiah(totalAmount)}</div>
        </div>

        {/* Upper Table: List Sales Quotation */}
        <div className="flex-[1.35] min-h-[160px] overflow-auto bg-[#F0F0F0] border border-[#808080] mx-1.5 mt-1.5 relative shadow-inner">
          <table className="w-full border-collapse text-left min-w-[1260px] text-[11px]">
            <thead className="sticky top-0 bg-[#ECE9D8] text-black font-normal border-b border-[#ACA899] z-10">
              <tr>
                <th className="w-[22px] px-1 py-1 border-r border-[#ACA899] text-center bg-[#ECE9D8]" />
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[95px]">No. SQ</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[82px]">Tanggal</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[195px]">Nama Customer</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[88px]">Sales</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[95px]">No. Inquiry</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[115px]">Lokasi Stock</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[145px]">Keterangan</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal text-right whitespace-nowrap w-[90px]">Amount</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">Dibuat Oleh</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[82px]">Tgl.Created</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[92px]">DiUpdate Oleh</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[82px]">Tgl.Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-gray-500 italic bg-white">
                    Tidak ada data Sales Quotation
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id);
                        setYellowNote(`${item.noSq} - ${item.namaCustomer}`);
                      }}
                      onDoubleClick={handleEdit}
                      className={`cursor-pointer border-b border-[#D4D0C8] ${
                        isSelected
                          ? 'bg-[#316AC5] text-white'
                          : 'bg-white text-black hover:bg-[#F2F6FC]'
                      }`}
                    >
                      <td className="px-1 py-0.5 border-r border-[#ACA899] bg-[#ECE9D8] text-center text-[10px] font-bold text-black">
                        {isSelected ? '▸' : ''}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap font-mono">{item.noSq}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.tanggal}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap font-medium">{item.namaCustomer}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.sales}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap font-mono">{item.noInquiry}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.lokasiStock}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.keterangan}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 text-right whitespace-nowrap font-mono">{item.amount}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.dibuatOleh}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.tglCreated}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.diUpdateOleh}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.tglUpdate}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Lower Panel: S.O. Detail for Selected Sales Quotation */}
        <div className="flex-1 min-h-[145px] flex flex-col mx-1.5 mt-1.5 mb-1 border border-[#808080] bg-white shadow-inner overflow-hidden">
          <div className="shrink-0 bg-[#E6E3D5] border-b border-[#ACA899] px-2.5 py-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-[#003C74] whitespace-nowrap">S.O. Detail</span>
              {selectedSq ? (
                <span className="text-[11px] text-gray-800 truncate">
                  No. SQ: <b className="font-mono">{selectedSq.noSq}</b> | Customer:{' '}
                  <b>{selectedSq.namaCustomer}</b> | Lokasi Stock:{' '}
                  <b className="text-[#0055EA]">{selectedSq.lokasiStock}</b>
                </span>
              ) : (
                <span className="text-[11px] text-gray-500 italic">
                  Pilih Sales Quotation di atas untuk melihat S.O. Detail
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] font-bold text-gray-900 font-mono">
                Total: {formatRupiah(selectedDetailTotal)}
              </span>
              {selectedSq && (
                <button
                  type="button"
                  onClick={() => handleOpenPrint('detail')}
                  className="px-2.5 py-0.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded-xs text-[11px] font-semibold cursor-pointer"
                >
                  Print S.O. Detail
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
                {selectedSqDetails.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                      Belum ada item S.O. Detail pada dokumen ini. Klik Koreksi atau Baru untuk menambahkan detail barang.
                    </td>
                  </tr>
                ) : (
                  selectedSqDetails.map((d, idx) => (
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
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-4 py-1.5 border-t border-[#C0C0C0] gap-3 overflow-x-auto">
          <ToolbarSearchControl
            compact
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onCari={handleExecuteToolbarSearch}
            onReset={handleResetToolbarSearch}
            inputRef={searchInputRef}
            isBusy={isBusy}
            inputWidthClass="w-56"
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode (No. SQ)' },
              { value: 'No. SQ', label: 'No. SQ' },
              { value: 'Nama Pelanggan', label: 'Nama Pelanggan' },
              { value: 'Sales', label: 'Sales' },
              { value: 'No. Inquiry', label: 'No. Inquiry' },
              { value: 'Lokasi Stock', label: 'Lokasi Stock' },
              { value: 'Keterangan', label: 'Keterangan' },
            ]}
          />

          <div className="flex items-center space-x-4 shrink-0">
            <input
              type="text"
              value={yellowNote}
              onChange={(e) => setYellowNote(e.target.value)}
              className="w-[240px] h-[22px] px-1.5 bg-[#FFFF99] border border-[#7A7A7A] text-[11px] outline-none"
            />
            <div className="text-[11px] text-black flex items-center space-x-3 pr-2">
              <span>Record</span>
              <span className="font-semibold">{filteredList.length}</span>
            </div>
          </div>
        </div>

        {/* Add / Koreksi Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="bg-[#ECE9D8] border-2 border-[#0A246A] shadow-2xl w-[920px] max-w-[97vw] max-h-[93vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs shrink-0">
                <span>{editingId ? 'Koreksi Sales Quotation' : 'Tambah Sales Quotation Baru'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="w-[16px] h-[16px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3 text-xs overflow-y-auto">
                {/* Header Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-black shrink-0">No. SQ:</label>
                    <input
                      type="text"
                      value={newNoSq}
                      onChange={(e) => setNewNoSq(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-black shrink-0">Tanggal:</label>
                    <div className="w-64">
                      <DatePickerInput
                        value={newTanggal}
                        onChange={(formatted) => setNewTanggal(formatted)}
                        format="dMyShort"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-black shrink-0">Nama Customer:</label>
                    <select
                      value={newCustomer}
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                      required
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih Pelanggan --</option>
                      {customerDropdownChoices.map((cust) => (
                        <option key={cust} value={cust}>
                          {cust}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-black shrink-0">Sales:</label>
                    <select
                      value={newSales}
                      onChange={(e) => setNewSales(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih Sales --</option>
                      {salesDropdownChoices.map((sales) => (
                        <option key={sales} value={sales}>
                          {sales}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-black shrink-0">No. Inquiry:</label>
                    <select
                      value={newNoInquiry}
                      onChange={(e) => handleSelectInquiry(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih No. Inquiry --</option>
                      {inquiryDropdownChoices.map((noInq) => {
                        const info = inquiryOptions.find((q) => q.noBukti === noInq);
                        return (
                          <option key={noInq} value={noInq}>
                            {info && info.namaCustomer ? `${noInq} - ${info.namaCustomer}` : noInq}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-black shrink-0">Lokasi Stock:</label>
                    <select
                      value={newLokasiStock}
                      onChange={(e) => setNewLokasiStock(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    >
                      {lokasiDropdownChoices.map((lok) => (
                        <option key={lok} value={lok}>
                          {lok}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-black shrink-0">Keterangan:</label>
                    <input
                      type="text"
                      value={newKeterangan}
                      onChange={(e) => setNewKeterangan(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-black shrink-0">Amount (Rp):</label>
                    <input
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] font-mono text-right"
                    />
                  </div>
                </div>

                {/* S.O. Detail Section */}
                <div className="border border-[#999999] bg-white rounded-xs overflow-hidden">
                  <div className="bg-[#E6E3D5] border-b border-[#C0C0C0] px-2.5 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#003C74]">S.O. Detail</span>
                      <span className="text-[11px] text-gray-600">
                        (Pilih Kode Barang dari Master Barang atau isi manual)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDetailRow}
                      className="px-2.5 py-0.5 bg-[#0A246A] hover:bg-[#163994] text-white border border-black rounded-xs text-[11px] font-semibold cursor-pointer"
                    >
                      + Tambah Baris
                    </button>
                  </div>
                  <div className="max-h-[210px] overflow-auto">
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
                              Belum ada detail barang. Klik "+ Tambah Baris".
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
                      Total S.O. Detail: {formatRupiah(modalDetailTotal)}
                    </span>
                  </div>
                </div>

                {/* Audit Section */}
                <div className="border-t border-[#D0D0D0] pt-2.5 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Dibuat Oleh:</label>
                    <input
                      type="text"
                      value={newDibuatOleh}
                      onChange={(e) => setNewDibuatOleh(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tgl.Created:</label>
                    <DatePickerInput
                      value={newTglCreated}
                      onChange={(formatted) => setNewTglCreated(formatted)}
                      format="dMyShort"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">DiUpdate Oleh:</label>
                    <input
                      type="text"
                      value={newDiupdateOleh}
                      onChange={(e) => setNewDiupdateOleh(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tgl.Updated:</label>
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
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                  <button
                    type="button"
                    onClick={() => {
                      setModalError(null);
                      setIsAddOpen(false);
                    }}
                    className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs hover:bg-[#F3F2F1] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="px-3 py-1 bg-[#0A246A] text-white border border-black text-xs hover:bg-[#163994] cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Find Modal: Cari & Daftar Sales Quotation */}
        <SupabaseFindModal
          isOpen={isFindOpen}
          onClose={() => setIsFindOpen(false)}
          tableLabel="Sales Quotation"
          rows={quotationList}
          selectedId={selectedId}
          getRowId={(r) => r.id}
          getSearchValues={(r) => [
            r.noSq,
            r.tanggal,
            r.namaCustomer,
            r.sales,
            r.noInquiry,
            r.lokasiStock,
            r.keterangan,
          ]}
          initialQuery={searchTerm}
          isBusy={isBusy}
          onSearchSupabase={(q) => {
            setSearchField('Semua');
            setSearchTerm(q);
            return loadData({ field: 'Semua', term: q, tglFilter: '' });
          }}
          onRefreshSupabase={() => {
            setSearchField('Semua');
            setSearchTerm('');
            setTanggalFilter('');
            return loadData({ field: 'Semua', term: '', tglFilter: '' });
          }}
          onSelectRow={(row, q) => {
            setSelectedId(row.id);
            setYellowNote(`${row.noSq} - ${row.namaCustomer}`);
            setSearchTerm(q);
            showFeedback(`Dokumen [${row.noSq} - ${row.namaCustomer}] dipilih`);
          }}
          columns={[
            { header: 'Kode / No. SQ', accessor: (r) => r.noSq, widthClass: 'w-28', mono: true, bold: true },
            { header: 'Tanggal', accessor: (r) => r.tanggal, widthClass: 'w-24', align: 'center' },
            { header: 'Nama Customer', accessor: (r) => r.namaCustomer, bold: true },
            { header: 'Sales', accessor: (r) => r.sales || '-', widthClass: 'w-24' },
            { header: 'No. Inquiry', accessor: (r) => r.noInquiry || '-', widthClass: 'w-28', mono: true },
            { header: 'Lokasi Stock', accessor: (r) => r.lokasiStock || '-', widthClass: 'w-28' },
            { header: 'Amount', accessor: (r) => r.amount, widthClass: 'w-24', align: 'right', mono: true },
          ]}
        />

        {/* Dual-mode Print Preview: List Sales Quotation & S.O. Detail */}
        <A4PrintPreviewModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title={
            printMode === 'detail'
              ? 'SALES QUOTATION (S.O. DETAIL)'
              : 'LAPORAN LIST SALES QUOTATION'
          }
          subtitle={
            printMode === 'detail'
              ? `No. SQ: ${selectedSq?.noSq || '-'} | Customer: ${selectedSq?.namaCustomer || '-'}`
              : `Filter Tanggal: ${tanggalFilter || 'Semua'}`
          }
          metaLines={
            printMode === 'detail' && selectedSq
              ? [
                  { label: 'No. SQ', value: selectedSq.noSq },
                  { label: 'Tanggal', value: selectedSq.tanggal },
                  { label: 'Nama Customer', value: selectedSq.namaCustomer },
                  { label: 'Sales', value: selectedSq.sales || '-' },
                  { label: 'No. Inquiry', value: selectedSq.noInquiry || '-' },
                  { label: 'Lokasi Stock', value: selectedSq.lokasiStock || '-' },
                  { label: 'Keterangan', value: selectedSq.keterangan || '-' },
                  { label: 'Amount', value: formatRupiah(selectedSq.amountNum) },
                  { label: 'Dibuat Oleh', value: selectedSq.dibuatOleh },
                  { label: 'Tgl. Created', value: selectedSq.tglCreated || '-' },
                  { label: 'DiUpdate Oleh', value: selectedSq.diUpdateOleh || '-' },
                  { label: 'Tgl. Update', value: selectedSq.tglUpdate || '-' },
                ]
              : []
          }
          orientation="landscape"
          columns={
            printMode === 'detail'
              ? selectedSqDetails.length > 0
                ? (detailPrintColumns as PrintColumn<any>[])
                : (listPrintColumns as PrintColumn<any>[])
              : (listPrintColumns as PrintColumn<any>[])
          }
          rows={
            printMode === 'detail'
              ? selectedSqDetails.length > 0
                ? selectedSqDetails
                : selectedSq
                ? [selectedSq]
                : []
              : filteredList
          }
          summaryItems={
            printMode === 'detail'
              ? [
                  { label: 'Total Item', value: `${selectedSqDetails.length} Item` },
                  {
                    label: 'Total QTY',
                    value: formatMoney(selectedSqDetails.reduce((acc, d) => acc + d.qty, 0)),
                  },
                  {
                    label: 'Total S.O. Detail',
                    value: formatRupiah(selectedDetailTotal > 0 ? selectedDetailTotal : selectedSq?.amountNum || 0),
                  },
                ]
              : [
                  { label: 'Total Quotation', value: `${filteredList.length} Dokumen` },
                  { label: 'Total Amount', value: formatRupiah(totalAmount) },
                ]
          }
          selectedRow={printMode === 'list' ? selectedSq : undefined}
          selectedTitle={printMode === 'list' ? 'SALES QUOTATION (RECORD TERPILIH)' : undefined}
          selectedSubtitle={
            printMode === 'list' && selectedSq
              ? `No. SQ: ${selectedSq.noSq} | Customer: ${selectedSq.namaCustomer}`
              : undefined
          }
          selectedMetaLines={
            printMode === 'list' && selectedSq
              ? [
                  { label: 'No. SQ', value: selectedSq.noSq },
                  { label: 'Tanggal', value: selectedSq.tanggal },
                  { label: 'Customer', value: selectedSq.namaCustomer },
                  { label: 'Sales', value: selectedSq.sales || '-' },
                  { label: 'Amount', value: formatRupiah(selectedSq.amountNum) },
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
                S.Q. Terpilih (Detail)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('list')}
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                  printMode === 'list' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                List Sales Quotation
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
};
