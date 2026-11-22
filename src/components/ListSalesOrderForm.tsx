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
  fetchDefaultPpnRate,
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

export interface SalesOrderItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  noSq: string;
  namaCustomer: string;
  sales: string;
  poNo: string;
  subtotal: number;
  discPct: number;
  nilaiDisc: number;
  dpp: number;
  nilaiSo: string;
  nilaiSoNum: number;
  deposit: string;
  tglKirim: string;
  persen: string;
  keterangan: string;
  ppn: string;
  ppnPct: number;
  nilaiPpn: string;
  nilaiPpnNum: number;
  isPpnIncluded: boolean;
  soClose: string;
  lokasiStock: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

export interface SalesOrderDetailItem {
  id: string;
  soId?: string;
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
  ppn: boolean;
  limitKredit: number;
  piutang: number;
}

interface SalesQuotationRefOption {
  id: string;
  noSq: string;
  namaCustomer: string;
  sales: string;
  lokasiStock: string;
  keterangan: string;
  discPct: number;
  ppn: number;
  stsSo: string;
}

interface MasterBarangOption {
  kode: string;
  namaBarang: string;
  unit: string;
  price: number;
  cost: number;
}

interface ListSalesOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDetail?: () => void;
}

function calcSalesOrderTotals(
  grossSubtotal: number,
  discPct: number,
  ppnPct: number,
  isPpnIncluded: boolean
): {
  subtotal: number;
  nilaiDisc: number;
  dpp: number;
  nominalPpn: number;
  grandTotal: number;
} {
  const subtotal = Math.max(0, Number(grossSubtotal || 0));
  const safeDisc = Math.max(0, Math.min(100, Number(discPct || 0)));
  const safePpn = Math.max(0, Number(ppnPct || 0));
  const nilaiDisc = Math.round((subtotal * safeDisc) / 100);
  const afterDisc = Math.max(0, subtotal - nilaiDisc);

  if (isPpnIncluded && safePpn > 0) {
    const dpp = Math.round(afterDisc / (1 + safePpn / 100));
    const nominalPpn = Math.max(0, afterDisc - dpp);
    return {
      subtotal,
      nilaiDisc,
      dpp,
      nominalPpn,
      grandTotal: afterDisc,
    };
  }

  const dpp = afterDisc;
  const nominalPpn = Math.round((dpp * safePpn) / 100);
  const grandTotal = dpp + nominalPpn;
  return { subtotal, nilaiDisc, dpp, nominalPpn, grandTotal };
}

function mapDbToSo(r: any): SalesOrderItem {
  const nilaiNum = Number(r.nilai_so || 0);
  const ppnPct = Number(r.ppn ?? 11);
  const nilaiPpnNum = Number(r.nilai_ppn || 0);
  const discPctNum = Number(r.disc_pct || 0);
  const nilaiDiscNum = Number(r.nilai_disc || 0);
  const dppNum = Number(r.dpp ?? Math.max(0, nilaiNum - nilaiPpnNum));
  const subtotalNum = Number(r.subtotal ?? dppNum + nilaiDiscNum);

  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    noSq: r.no_sq || '',
    namaCustomer: r.nama_customer || '',
    sales: r.sales || '',
    poNo: r.po_no || '',
    subtotal: subtotalNum,
    discPct: discPctNum,
    nilaiDisc: nilaiDiscNum,
    dpp: dppNum,
    nilaiSo: formatMoney(nilaiNum),
    nilaiSoNum: nilaiNum,
    deposit: Number(r.deposit || 0) > 0 ? formatMoney(r.deposit) : '-',
    tglKirim: toDisplayDMyShort(r.tgl_kirim) || '-',
    persen: `${Number(r.persen || 0)}%`,
    keterangan: r.keterangan || '',
    ppn: `${ppnPct}%`,
    ppnPct,
    nilaiPpn: formatMoney(nilaiPpnNum),
    nilaiPpnNum,
    isPpnIncluded: Boolean(r.is_ppn_included),
    soClose: r.so_close || 'Not Yet',
    lokasiStock: r.lokasi_stock || '01 - OFFICE',
    dibuatOleh: r.dibuat_oleh || getCurrentUser().username || 'ADMIN',
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

function mapDbToSoDetail(d: any, idx = 0): SalesOrderDetailItem {
  const qty = Number(d.qty || 0);
  const harga = Number(d.harga || 0);
  const jumlah = d.jumlah !== undefined && d.jumlah !== null ? Number(d.jumlah) : qty * harga;
  const total = d.total !== undefined && d.total !== null ? Number(d.total) : jumlah;
  return {
    id: d.id || `sod-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    soId: d.so_id,
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

function createBlankDetailRow(noUrut: number): SalesOrderDetailItem {
  return {
    id: `new-sod-${Date.now()}-${noUrut}-${Math.random().toString(36).slice(2, 6)}`,
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

export const ListSalesOrderForm: React.FC<ListSalesOrderFormProps> = ({
  isOpen,
  onClose,
  onOpenDetail,
}) => {
  const [soList, setSoList] = useState<SalesOrderItem[]>([]);
  const [soDetailsMap, setSoDetailsMap] = useState<Record<string, SalesOrderDetailItem[]>>({});
  const [linkedSjMap, setLinkedSjMap] = useState<Record<string, string[]>>({});
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
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<SalesOrderItem | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [customerOptions, setCustomerOptions] = useState<MasterCustomerOption[]>([]);
  const [salesOptions, setSalesOptions] = useState<string[]>([]);
  const [salesLimitMap, setSalesLimitMap] = useState<Record<string, number>>({});
  const [defaultCompanyPpn, setDefaultCompanyPpn] = useState<number>(11);
  const [overrideCreditLimit, setOverrideCreditLimit] = useState<boolean>(false);
  const [showCreditOverrideBox, setShowCreditOverrideBox] = useState<boolean>(false);
  const [sqOptions, setSqOptions] = useState<SalesQuotationRefOption[]>([]);
  const [sqDetailsByIdMap, setSqDetailsByIdMap] = useState<Record<string, any[]>>({});
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);

  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newNoSq, setNewNoSq] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('');
  const [newPoNo, setNewPoNo] = useState<string>('');
  const [newDiscPct, setNewDiscPct] = useState<string>('0');
  const [newIsPpnIncluded, setNewIsPpnIncluded] = useState<boolean>(false);
  const [newNilaiSo, setNewNilaiSo] = useState<string>('0');
  const [newDeposit, setNewDeposit] = useState<string>('0');
  const [newTglKirim, setNewTglKirim] = useState<string>('');
  const [newPersen, setNewPersen] = useState<string>('0');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newPpn, setNewPpn] = useState<string>('11');
  const [newNilaiPpn, setNewNilaiPpn] = useState<string>('0');
  const [ppnManualOverride, setPpnManualOverride] = useState<boolean>(false);
  const [newSoClose, setNewSoClose] = useState<string>('Not Yet');
  const [newLokasiStock, setNewLokasiStock] = useState<string>('01 - OFFICE');
  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');
  const [detailRows, setDetailRows] = useState<SalesOrderDetailItem[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const loadMasterReferences = async () => {
    const [custRes, salesRes, sqRes, sqDetRes, sjRes, lokasiRes, barangRes] =
      await Promise.allSettled([
        erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true, limit: 1000 }),
        erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true, limit: 1000 }),
        erpList<any>('sales_quotations', { orderBy: 'tanggal', asc: false, limit: 1000 }),
        erpList<any>('sales_quotation_details', { orderBy: 'no_urut', asc: true, limit: 5000 }),
        erpList<any>('surat_jalans', { limit: 2000 }),
        erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true, limit: 1000 }),
        erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 }),
      ]);

    if (custRes.status === 'fulfilled') {
      const custMap = new Map<string, MasterCustomerOption>();
      for (const c of custRes.value.filter((row: any) => row.is_active !== false)) {
        const namaCustomer = String(c.nama_customer || '').trim().toUpperCase();
        if (!namaCustomer) continue;
        custMap.set(namaCustomer, {
          namaCustomer,
          sales: String(c.sales || '').trim().toUpperCase(),
          ppn: c.ppn !== false,
          limitKredit: Math.max(0, Number(c.limit_kredit || 0)),
          piutang: Math.max(0, Number(c.piutang || 0)),
        });
      }
      setCustomerOptions(Array.from(custMap.values()));
    }

    if (salesRes.status === 'fulfilled') {
      const sLimit: Record<string, number> = {};
      const uniqueSales = Array.from(
        new Set(
          salesRes.value
            .filter((s: any) => s.is_active !== false)
            .map((s: any) => {
              const nm = String(s.nama_sales || '').trim().toUpperCase();
              if (nm) sLimit[nm] = Math.max(0, Number(s.limit_kredit || 0));
              return nm;
            })
            .filter(Boolean)
        )
      );
      setSalesLimitMap(sLimit);
      setSalesOptions(uniqueSales);
    }

    if (sqRes.status === 'fulfilled') {
      const sqs: SalesQuotationRefOption[] = sqRes.value
        .map((q: any) => ({
          id: String(q.id || ''),
          noSq: String(q.no_sq || '').trim().toUpperCase(),
          namaCustomer: String(q.nama_customer || '').trim().toUpperCase(),
          sales: String(q.sales || '').trim().toUpperCase(),
          lokasiStock: String(q.lokasi_stock || '01 - OFFICE').trim().toUpperCase(),
          keterangan: String(q.keterangan || '').trim(),
          discPct: Number(q.disc_pct || 0),
          ppn: Number(q.ppn ?? 11),
          stsSo: String(q.sts_so || 'Open').trim(),
        }))
        .filter((q: SalesQuotationRefOption) => Boolean(q.noSq));
      setSqOptions(sqs);
    }

    if (sqDetRes.status === 'fulfilled') {
      const grouped: Record<string, any[]> = {};
      for (const d of sqDetRes.value) {
        const keyId = String(d.sq_id || '');
        const keyNo = String(d.no_sq || '').trim().toUpperCase();
        if (keyId) {
          if (!grouped[keyId]) grouped[keyId] = [];
          grouped[keyId].push(d);
        }
        if (keyNo) {
          if (!grouped[keyNo]) grouped[keyNo] = [];
          grouped[keyNo].push(d);
        }
      }
      setSqDetailsByIdMap(grouped);
    }

    if (sjRes.status === 'fulfilled') {
      const sjBySo: Record<string, string[]> = {};
      for (const sj of sjRes.value) {
        const noSoKey = String(sj.no_so || '').trim().toUpperCase();
        const sjNo = String(sj.no_bukti || '').trim().toUpperCase();
        if (noSoKey && sjNo) {
          if (!sjBySo[noSoKey]) sjBySo[noSoKey] = [];
          sjBySo[noSoKey].push(sjNo);
        }
      }
      setLinkedSjMap(sjBySo);
    }

    if (lokasiRes.status === 'fulfilled') {
      const sortedLok = [...lokasiRes.value]
        .filter((l: any) => l.is_active !== false)
        .sort((a: any, b: any) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
      const lokasis = Array.from(
        new Set(
          sortedLok
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
        .filter((b: any) => b.is_active !== false)
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

  const SEARCH_FIELD_TO_DB_COL: Record<string, string> = {
    Kode: 'no_bukti',
    'Nama Pelanggan': 'nama_customer',
    'No.Bukti': 'no_bukti',
    'No. SQ': 'no_sq',
    Sales: 'sales',
    'PO.NO': 'po_no',
    'Lokasi Stock': 'lokasi_stock',
    Keterangan: 'keterangan',
    'SO.Close': 'so_close',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
    tglFilter?: string;
  }): Promise<SalesOrderItem[] | null> => {
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
            'no_bukti,nama_customer,sales,po_no,lokasi_stock,keterangan,so_close';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows, details] = await Promise.all([
        erpList<any>('sales_orders', queryOpts),
        erpList<any>('sales_order_details', { orderBy: 'no_urut', asc: true }).catch(() => []),
        loadMasterReferences(),
      ]);
      const mapped = rows.map(mapDbToSo);
      setSoList(mapped);

      const grouped: Record<string, SalesOrderDetailItem[]> = {};
      for (const raw of details) {
        const key = String(raw.so_id || '');
        if (!key) continue;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(mapDbToSoDetail(raw, grouped[key].length));
      }
      setSoDetailsMap(grouped);

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
    const selected = soList.find((s) => s.id === selectedId);
    if (!selected) {
      showFeedback('Pilih baris Sales Order yang akan disimpan');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const existingDetails = soDetailsMap[selected.id] || [];
      const totalFromDetails = existingDetails.reduce((acc, d) => acc + d.total, 0);
      const ppnPct = Math.max(0, Number(selected.ppnPct || 0));
      let calc = calcSalesOrderTotals(
        existingDetails.length > 0 ? totalFromDetails : selected.subtotal,
        selected.discPct,
        ppnPct,
        selected.isPpnIncluded
      );
      let finalNilaiPpn = Math.max(0, Number(selected.nilaiPpnNum || 0));
      let finalNilaiSo = Number(selected.nilaiSoNum || 0);

      if (existingDetails.length > 0) {
        if (finalNilaiPpn <= 0 && ppnPct > 0) {
          finalNilaiPpn = calc.nominalPpn;
          finalNilaiSo = calc.grandTotal;
        } else {
          finalNilaiSo = calc.dpp + finalNilaiPpn;
        }
      }

      const headerPayload: Record<string, any> = {
        id: selected.id,
        no_bukti: selected.noBukti.trim().toUpperCase(),
        tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
        no_sq: selected.noSq.trim().toUpperCase(),
        nama_customer: selected.namaCustomer.trim().toUpperCase(),
        sales: selected.sales.trim().toUpperCase(),
        po_no: selected.poNo.trim().toUpperCase(),
        subtotal: calc.subtotal,
        disc_pct: selected.discPct,
        nilai_disc: calc.nilaiDisc,
        dpp: calc.dpp,
        nilai_so: finalNilaiSo,
        deposit: selected.deposit === '-' ? 0 : parseNum(selected.deposit),
        tgl_kirim: selected.tglKirim && selected.tglKirim !== '-' ? toIsoDate(selected.tglKirim) : null,
        persen: parseNum(selected.persen),
        keterangan: selected.keterangan.trim(),
        ppn: ppnPct,
        nilai_ppn: finalNilaiPpn,
        is_ppn_included: selected.isPpnIncluded,
        so_close: selected.soClose || 'Not Yet',
        lokasi_stock: selected.lokasiStock.trim().toUpperCase() || '01 - OFFICE',
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

      const res = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'sales-order',
        headerPayload,
        detailPayloads
      );
      const savedHeader = mapDbToSo(res.header);
      const savedDetails = (res.details || []).map((d, idx) => mapDbToSoDetail(d, idx));
      setSoList((prev) => prev.map((item) => (item.id === selected.id ? savedHeader : item)));
      setSoDetailsMap((prev) => ({ ...prev, [savedHeader.id]: savedDetails }));
      showFeedback(
        res.detailWarning
          ? `SO [${savedHeader.noBukti}] disimpan (${res.detailWarning})`
          : `Sales Order [${savedHeader.noBukti}] berhasil disimpan`
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

  const selectedSo = useMemo(
    () => soList.find((s) => s.id === selectedId) || null,
    [soList, selectedId]
  );

  const selectedSoDetails = useMemo(
    () => (selectedId ? soDetailsMap[selectedId] || [] : []),
    [soDetailsMap, selectedId]
  );

  const selectedDetailTotal = useMemo(
    () => selectedSoDetails.reduce((acc, d) => acc + d.total, 0),
    [selectedSoDetails]
  );

  const modalDetailTotal = useMemo(
    () => detailRows.reduce((acc, d) => acc + d.total, 0),
    [detailRows]
  );

  const hasFilledDetailRows = useMemo(
    () => detailRows.some((r) => r.kode.trim() !== '' || r.namaBarang.trim() !== ''),
    [detailRows]
  );

  const modalTotals = useMemo(() => {
    const gross = hasFilledDetailRows ? modalDetailTotal : parseNum(newNilaiSo);
    return calcSalesOrderTotals(gross, parseNum(newDiscPct), parseNum(newPpn), newIsPpnIncluded);
  }, [hasFilledDetailRows, modalDetailTotal, newNilaiSo, newDiscPct, newPpn, newIsPpnIncluded]);

  if (!isOpen) return null;

  const recalcFromModalInputs = (
    grossSub: number,
    discPctVal: number,
    ppnPctVal: number,
    inclVal: boolean,
    manualOverride: boolean,
    manualPpnVal: number
  ) => {
    const c = calcSalesOrderTotals(grossSub, discPctVal, ppnPctVal, inclVal);
    if (manualOverride && !inclVal) {
      setNewNilaiSo(String(c.dpp + Math.max(0, manualPpnVal)));
    } else {
      setNewNilaiPpn(String(c.nominalPpn));
      setNewNilaiSo(String(c.grandTotal));
    }
  };

  const updateDetailRowsWithSync = (
    updater: (prev: SalesOrderDetailItem[]) => SalesOrderDetailItem[]
  ) => {
    setDetailRows((prev) => {
      const next = updater(prev);
      const hasFilledRow = next.some((r) => r.kode.trim() || r.namaBarang.trim());
      if (hasFilledRow) {
        const sum = next.reduce((acc, r) => acc + r.total, 0);
        recalcFromModalInputs(
          sum,
          parseNum(newDiscPct),
          parseNum(newPpn),
          newIsPpnIncluded,
          ppnManualOverride,
          parseNum(newNilaiPpn)
        );
      }
      return next;
    });
  };

  const handlePpnPercentChange = (rawVal: string) => {
    setNewPpn(rawVal);
    setPpnManualOverride(false);
    const pct = parseNum(rawVal);
    if (hasFilledDetailRows) {
      recalcFromModalInputs(modalDetailTotal, parseNum(newDiscPct), pct, newIsPpnIncluded, false, 0);
    } else {
      const currentDpp = parseNum(newNilaiSo);
      const nominalPpn = Math.round((Math.max(0, currentDpp) * Math.max(0, pct)) / 100);
      setNewNilaiPpn(String(nominalPpn));
    }
  };

  const handleDiscPctChange = (rawVal: string) => {
    setNewDiscPct(rawVal);
    if (hasFilledDetailRows) {
      recalcFromModalInputs(
        modalDetailTotal,
        parseNum(rawVal),
        parseNum(newPpn),
        newIsPpnIncluded,
        ppnManualOverride,
        parseNum(newNilaiPpn)
      );
    }
  };

  const handleTogglePpnIncluded = (checked: boolean) => {
    setNewIsPpnIncluded(checked);
    setPpnManualOverride(false);
    if (hasFilledDetailRows) {
      recalcFromModalInputs(modalDetailTotal, parseNum(newDiscPct), parseNum(newPpn), checked, false, 0);
    }
  };

  const handleManualNilaiPpnChange = (rawVal: string) => {
    setNewNilaiPpn(rawVal);
    setPpnManualOverride(true);
    if (hasFilledDetailRows) {
      const manualPpn = Math.max(0, parseNum(rawVal));
      const c = calcSalesOrderTotals(modalDetailTotal, parseNum(newDiscPct), parseNum(newPpn), false);
      setNewNilaiSo(String(c.dpp + manualPpn));
    }
  };

  const handleAddDetailRow = () => {
    updateDetailRowsWithSync((prev) => [...prev, createBlankDetailRow(prev.length + 1)]);
  };

  const handleRemoveDetailRow = (rowId: string) => {
    updateDetailRowsWithSync((prev) =>
      prev.filter((r) => r.id !== rowId).map((r, idx) => ({ ...r, noUrut: idx + 1 }))
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
    field: keyof SalesOrderDetailItem,
    rawValue: string
  ) => {
    updateDetailRowsWithSync((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated: SalesOrderDetailItem = { ...r };
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
    setOverrideCreditLimit(false);
    setShowCreditOverrideBox(false);
    const foundCust = customerOptions.find((c) => c.namaCustomer === customerName);
    if (foundCust) {
      if (foundCust.sales) setNewSales(foundCust.sales);
      const nextPpnPct = foundCust.ppn ? defaultCompanyPpn : 0;
      handlePpnPercentChange(String(nextPpnPct));
    }
  };

  const handleSelectSalesQuotation = (selectedNoSq: string) => {
    const cleanSq = selectedNoSq.trim().toUpperCase();
    setNewNoSq(cleanSq);
    if (!cleanSq) return;

    const sq = sqOptions.find((q) => q.noSq === cleanSq);
    if (sq) {
      if (sq.namaCustomer) setNewCustomer(sq.namaCustomer);
      if (sq.sales) setNewSales(sq.sales);
      if (sq.lokasiStock) setNewLokasiStock(sq.lokasiStock);
      if (sq.keterangan) setNewKeterangan(sq.keterangan);
      setNewDiscPct(String(sq.discPct || 0));
      setNewPpn(String(sq.ppn ?? defaultCompanyPpn));
      setPpnManualOverride(false);

      const sqDets = sqDetailsByIdMap[sq.id] || sqDetailsByIdMap[sq.noSq] || [];
      if (sqDets.length > 0) {
        const mappedRows: SalesOrderDetailItem[] = sqDets.map((d: any, idx: number) => {
          const qty = Number(d.qty || 1);
          const harga = Number(d.harga || 0);
          const jumlah = Number(d.jumlah ?? qty * harga);
          const total = Number(d.total ?? jumlah);
          return {
            id: `sq-fill-${Date.now()}-${idx}`,
            noUrut: idx + 1,
            kode: String(d.kode || '').trim().toUpperCase(),
            namaBarang: String(d.nama_barang || '').trim(),
            unit: String(d.unit || 'PCS').trim().toUpperCase(),
            terima: 0,
            qty,
            harga,
            jumlah,
            total,
          };
        });
        setDetailRows(mappedRows);
        const sum = mappedRows.reduce((s, r) => s + r.total, 0);
        recalcFromModalInputs(sum, sq.discPct || 0, sq.ppn ?? defaultCompanyPpn, newIsPpnIncluded, false, 0);
        showFeedback(`${mappedRows.length} item dimuat dari Sales Quotation [${cleanSq}]`);
      }
    }
  };

  const handleAddNew = async () => {
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setOverrideCreditLimit(false);
    setShowCreditOverrideBox(false);
    setNewNoBukti(nextUniqueCode(soList.map((s) => s.noBukti), '2608-SO-', 3));
    setNewTanggal(todayDisp);
    setNewNoSq('');
    setNewCustomer('');
    setNewSales('');
    setNewPoNo('');
    setNewDiscPct('0');
    setNewIsPpnIncluded(false);
    setNewNilaiSo('0');
    setNewDeposit('0');
    setNewTglKirim(todayDisp);
    setNewPersen('0');
    setNewKeterangan('');
    setNewPpn(String(defaultCompanyPpn));
    setNewNilaiPpn('0');
    setPpnManualOverride(false);
    setNewSoClose('Not Yet');
    setNewLokasiStock(lokasiOptions[0] || '01 - OFFICE');
    setNewDibuatOleh(currentUser);
    setNewTglCreated(todayDisp);
    setNewDiupdateOleh('-');
    setNewTglUpdate('');
    setDetailRows([createBlankDetailRow(1)]);
    setIsAddOpen(true);
    const [defPpn] = await Promise.all([fetchDefaultPpnRate(), loadMasterReferences()]);
    setDefaultCompanyPpn(defPpn);
    setNewPpn(String(defPpn));
  };

  const handleEdit = async () => {
    const item = soList.find((s) => s.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(item.id);
    setModalError(null);
    setOverrideCreditLimit(false);
    setShowCreditOverrideBox(false);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal || todayDisp);
    setNewNoSq(item.noSq || '');
    setNewCustomer(item.namaCustomer);
    setNewSales(item.sales);
    setNewPoNo(item.poNo);
    setNewDiscPct(String(item.discPct || 0));
    setNewIsPpnIncluded(Boolean(item.isPpnIncluded));
    setNewDeposit(String(parseNum(item.deposit)));
    setNewTglKirim(item.tglKirim === '-' ? '' : item.tglKirim);
    setNewPersen(String(parseNum(item.persen)));
    setNewKeterangan(item.keterangan);
    const pctVal = parseNum(item.ppn);
    setNewPpn(String(pctVal));
    setNewSoClose(item.soClose || 'Not Yet');
    setNewLokasiStock(item.lokasiStock || lokasiOptions[0] || '01 - OFFICE');
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(
      item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser
    );
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);

    const existingDetails = soDetailsMap[item.id] || [];
    const existingDetailSum = existingDetails.reduce((acc, d) => acc + d.total, 0);
    if (existingDetails.length > 0) {
      const autoCalc = calcSalesOrderTotals(
        existingDetailSum,
        item.discPct || 0,
        pctVal,
        Boolean(item.isPpnIncluded)
      );
      if (item.nilaiPpnNum > 0) {
        const isManual = Math.abs(item.nilaiPpnNum - autoCalc.nominalPpn) > 1;
        setNewNilaiPpn(String(item.nilaiPpnNum));
        setNewNilaiSo(String(autoCalc.dpp + item.nilaiPpnNum));
        setPpnManualOverride(isManual);
      } else {
        setNewNilaiPpn(String(autoCalc.nominalPpn));
        setNewNilaiSo(String(autoCalc.grandTotal));
        setPpnManualOverride(false);
      }
    } else {
      setNewNilaiPpn(String(item.nilaiPpnNum));
      setNewNilaiSo(String(item.nilaiSoNum));
      setPpnManualOverride(item.nilaiPpnNum > 0);
    }

    setDetailRows(
      existingDetails.length > 0
        ? existingDetails.map((d, idx) => ({ ...d, noUrut: idx + 1 }))
        : [createBlankDetailRow(1)]
    );

    const linkedSjs = linkedSjMap[item.noBukti.trim().toUpperCase()] || [];
    if (linkedSjs.length > 0 || item.soClose === 'Closed') {
      showFeedback(
        `Perhatian: SO [${item.noBukti}] sudah berstatus ${item.soClose} / memiliki Surat Jalan (${linkedSjs.join(', ') || '-'})`
      );
    }

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
    const totalFromDetails = activeDetails.reduce((acc, d) => acc + d.total, 0);
    const ppnPct = Math.max(0, parseNum(newPpn));
    const discPctVal = Math.max(0, parseNum(newDiscPct));
    const calc = calcSalesOrderTotals(
      activeDetails.length > 0 ? totalFromDetails : parseNum(newNilaiSo),
      discPctVal,
      ppnPct,
      newIsPpnIncluded
    );

    let finalNilaiPpn = Math.max(0, parseNum(newNilaiPpn));
    let finalNilaiSo = parseNum(newNilaiSo);
    let finalDpp = calc.dpp;

    if (activeDetails.length > 0) {
      if (ppnManualOverride && !newIsPpnIncluded) {
        finalNilaiSo = calc.dpp + finalNilaiPpn;
      } else {
        finalNilaiPpn = calc.nominalPpn;
        finalNilaiSo = calc.grandTotal;
      }
    } else if (!ppnManualOverride && ppnPct > 0) {
      finalNilaiPpn = Math.round((Math.max(0, finalNilaiSo) * ppnPct) / 100);
      finalDpp = finalNilaiSo;
      finalNilaiSo = finalDpp + finalNilaiPpn;
    }

    if (!overrideCreditLimit) {
      const custMeta = customerOptions.find(
        (c) => c.namaCustomer === newCustomer.trim().toUpperCase()
      );
      if (custMeta && custMeta.limitKredit > 0 && custMeta.piutang + finalNilaiSo > custMeta.limitKredit) {
        setShowCreditOverrideBox(true);
        setModalError(
          `Peringatan Limit Kredit Customer: Piutang (${formatRupiah(custMeta.piutang)}) + Nilai SO (${formatRupiah(
            finalNilaiSo
          )}) melebihi Limit Kredit (${formatRupiah(custMeta.limitKredit)}). Centang "Abaikan batas limit kredit" jika tetap ingin menyimpan.`
        );
        return;
      }
      const salesLimit = salesLimitMap[newSales.trim().toUpperCase()] || 0;
      if (salesLimit > 0 && finalNilaiSo > salesLimit) {
        setShowCreditOverrideBox(true);
        setModalError(
          `Peringatan Limit Kredit Sales (${newSales.trim().toUpperCase()}): Nilai SO (${formatRupiah(
            finalNilaiSo
          )}) melebihi Limit (${formatRupiah(salesLimit)}). Centang "Abaikan batas limit kredit" jika tetap ingin menyimpan.`
        );
        return;
      }
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const baseHeader: Record<string, any> = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: toIsoDate(newTanggal) || todayIso(),
        no_sq: newNoSq.trim().toUpperCase(),
        nama_customer: newCustomer.trim().toUpperCase(),
        sales: newSales.trim().toUpperCase(),
        po_no: newPoNo.trim().toUpperCase(),
        subtotal: calc.subtotal,
        disc_pct: discPctVal,
        nilai_disc: calc.nilaiDisc,
        dpp: finalDpp,
        nilai_so: finalNilaiSo,
        deposit: parseNum(newDeposit),
        tgl_kirim: toIsoDate(newTglKirim),
        persen: parseNum(newPersen),
        keterangan: newKeterangan.trim(),
        ppn: ppnPct,
        nilai_ppn: finalNilaiPpn,
        is_ppn_included: newIsPpnIncluded,
        so_close: newSoClose,
        lokasi_stock: newLokasiStock.trim().toUpperCase() || '01 - OFFICE',
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

      const res = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'sales-order',
        baseHeader,
        detailPayloads
      );

      const savedHeader = mapDbToSo(res.header);
      const savedDetails = (res.details || []).map((d, idx) => mapDbToSoDetail(d, idx));

      if (editingId) {
        setSoList((prev) => prev.map((item) => (item.id === editingId ? savedHeader : item)));
        showFeedback(
          res.detailWarning
            ? `SO diperbarui (${res.detailWarning})`
            : 'Sales Order & S.O. Detail diperbarui (DPP + PPN tersimpan)'
        );
      } else {
        setSoList((prev) => [savedHeader, ...prev]);
        setSelectedId(savedHeader.id);
        showFeedback(
          res.detailWarning
            ? `SO tersimpan (${res.detailWarning})`
            : 'Sales Order tersimpan (DPP + PPN + qty_so tersinkron)'
        );
      }

      setSoDetailsMap((prev) => ({
        ...prev,
        [savedHeader.id]: savedDetails,
      }));

      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Sales Order';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const requestDeleteSelected = () => {
    if (!selectedSo) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    const linkedSjs = linkedSjMap[selectedSo.noBukti.trim().toUpperCase()] || [];
    if (linkedSjs.length > 0) {
      showFeedback(
        `Tidak bisa hapus: SO [${selectedSo.noBukti}] sudah memiliki Surat Jalan (${linkedSjs.join(', ')})`
      );
      return;
    }
    setConfirmDeleteItem(selectedSo);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteItem) return;
    try {
      setIsBusy(true);
      await erpDelete('sales_order_details', confirmDeleteItem.id, 'so_id').catch(() => {});
      await erpDelete('sales_orders', confirmDeleteItem.id);
      const updated = soList.filter((item) => item.id !== confirmDeleteItem.id);
      setSoList(updated);
      setSoDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[confirmDeleteItem.id];
        return copy;
      });
      if (selectedId === confirmDeleteItem.id) {
        setSelectedId(updated[0]?.id || '');
      }
      setConfirmDeleteItem(null);
      showFeedback('Sales Order dihapus & qty_so disesuaikan');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = soList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (searchField === 'Kode' || searchField === 'No.Bukti') {
      return matchesMultiKeyword([item.noBukti], searchTerm);
    }
    if (searchField === 'No. SQ') return matchesMultiKeyword([item.noSq], searchTerm);
    if (searchField === 'Nama Pelanggan') return matchesMultiKeyword([item.namaCustomer], searchTerm);
    if (searchField === 'Sales') return matchesMultiKeyword([item.sales], searchTerm);
    if (searchField === 'PO.NO') return matchesMultiKeyword([item.poNo], searchTerm);
    if (searchField === 'Lokasi Stock') return matchesMultiKeyword([item.lokasiStock], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
    if (searchField === 'SO.Close') return matchesMultiKeyword([item.soClose], searchTerm);
    return matchesMultiKeyword(
      [
        item.noBukti,
        item.noSq,
        item.tanggal,
        item.namaCustomer,
        item.sales,
        item.poNo,
        item.lokasiStock,
        item.keterangan,
        item.soClose,
      ],
      searchTerm
    );
  });

  const totalNilaiSo = filteredList.reduce((acc, s) => acc + s.nilaiSoNum, 0);
  const totalNilaiPpn = filteredList.reduce((acc, s) => acc + s.nilaiPpnNum, 0);

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
          ? `Ditemukan ${rows.length} Sales Order dari Supabase`
          : `Menampilkan ${rows.length} Sales Order dari Supabase`
      );
    } else if (rows) {
      setSelectedId('');
      showFeedback('Data Sales Order tidak ditemukan di Supabase');
    }
  };

  const handleResetSearch = async () => {
    setSearchTerm('');
    setSearchField('Semua');
    setTanggalFilter('Semua');
    const rows = await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
    if (rows) {
      showFeedback(`Filter direset (${rows.length} Sales Order)`);
    }
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
  };

  const handleOpenPrint = (mode?: 'list' | 'detail') => {
    setPrintMode(mode ?? (selectedSo ? 'detail' : 'list'));
    setIsPrintOpen(true);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Sales_Order',
      sheetTitle: 'LIST SALES ORDER',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'No. SQ', accessor: 'noSq' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'Sales', accessor: 'sales' },
        { header: 'PO.NO', accessor: 'poNo' },
        { header: 'Lokasi Stock', accessor: 'lokasiStock' },
        { header: 'DPP', accessor: 'dpp', align: 'right' },
        { header: 'PPN', accessor: 'ppn', align: 'center' },
        { header: 'Nominal PPN', accessor: 'nilaiPpnNum', align: 'right' },
        { header: 'Nilai SO', accessor: 'nilaiSoNum', align: 'right' },
        { header: 'Tgl.Kirim', accessor: 'tglKirim', align: 'center' },
        { header: 'SO.Close', accessor: 'soClose', align: 'center' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
        { header: 'Tgl.Created', accessor: 'tglCreated', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const customerDropdownChoices = Array.from(
    new Set(
      [...customerOptions.map((c) => c.namaCustomer), newCustomer.trim().toUpperCase()].filter(
        Boolean
      )
    )
  );

  const salesDropdownChoices = Array.from(
    new Set([...salesOptions, newSales.trim().toUpperCase()].filter(Boolean))
  );

  const sqDropdownChoices = Array.from(
    new Set([...sqOptions.map((q) => q.noSq), newNoSq.trim().toUpperCase()].filter(Boolean))
  );

  const lokasiDropdownChoices = Array.from(
    new Set(['01 - OFFICE', ...lokasiOptions, newLokasiStock.trim().toUpperCase()].filter(Boolean))
  );

  const listPrintColumns: PrintColumn<SalesOrderItem>[] = [
    { header: 'No.Bukti', accessor: 'noBukti', width: '86px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '60px' },
    { header: 'Nama Customer', accessor: 'namaCustomer', width: '130px' },
    { header: 'Sales', accessor: 'sales', width: '68px' },
    { header: 'PO.NO', accessor: 'poNo', width: '78px' },
    { header: 'DPP', accessor: (r) => formatMoney(r.dpp), align: 'right', width: '80px' },
    { header: 'PPN', accessor: 'ppn', align: 'center', width: '42px' },
    { header: 'Nominal PPN', accessor: 'nilaiPpn', align: 'right', width: '76px' },
    { header: 'Nilai SO (Net)', accessor: 'nilaiSo', align: 'right', width: '86px' },
    { header: 'Tgl.Kirim', accessor: 'tglKirim', align: 'center', width: '60px' },
    { header: 'SO.Close', accessor: 'soClose', align: 'center', width: '54px' },
  ];

  const detailPrintColumns: PrintColumn<SalesOrderDetailItem>[] = [
    { header: 'Kode', accessor: 'kode', width: '88px' },
    { header: 'Nama Barang', accessor: 'namaBarang' },
    { header: 'Unit', accessor: 'unit', align: 'center', width: '58px' },
    {
      header: 'Terkirim',
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
      id="list-sales-order-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="List Sales Order"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => handleOpenPrint()}
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
            onHapus={requestDeleteSelected}
            onPrint={() => handleOpenPrint()}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />
          {onOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="h-[28px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] active:bg-[#DCD8C8] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1 text-[11px] font-sans text-black cursor-pointer whitespace-nowrap"
              title="Cetak Sales Order Detail"
            >
              <span>🖶</span>
              <span>Sales Order Detail</span>
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
          <div className="text-xs font-semibold px-2.5 py-1 bg-[#FFF7E6] border border-[#C7A05A] text-[#7A4900] whitespace-nowrap">
            PPN: {formatRupiah(totalNilaiPpn)}
          </div>
          <div className="font-bold text-sm text-right px-3 py-0.5 bg-white border border-[#919191] min-w-[110px] shadow-inner">
            {formatRupiah(totalNilaiSo)}
          </div>
        </div>
      </div>

      {/* Upper Table */}
      <div className="flex-[1.35] min-h-[160px] overflow-auto bg-white border border-[#7A7A7A] mx-2 mt-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1680px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Bukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No. SQ</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5">PO.NO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Lokasi Stock</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">DPP</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center">PPN</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Nominal PPN</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Nilai SO (+PPN)</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Deposit</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Kirim</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center">Persen</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5">SO.Close</th>
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
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noSq || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-medium">{item.namaCustomer}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.sales}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.poNo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.lokasiStock}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-right font-mono">{formatMoney(item.dpp)}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.ppn}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-right font-mono">{item.nilaiPpn}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-right font-mono font-semibold">{item.nilaiSo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-right font-mono">{item.deposit}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglKirim}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.persen}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.soClose}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.dibuatOleh}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.diupdateOleh}</td>
                  <td className="px-3 py-1">{item.tglUpdate}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={21} className="text-center py-6 text-gray-500">
                  Tidak ada data sales order
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lower Panel */}
      <div className="flex-1 min-h-[145px] flex flex-col mx-2 mt-1.5 mb-1 border border-[#7A7A7A] bg-white shadow-inner overflow-hidden">
        <div className="shrink-0 bg-[#E6E3D5] border-b border-[#ACA899] px-2.5 py-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-[#003C74] whitespace-nowrap">S.O. Detail</span>
            {selectedSo ? (
              <span className="text-[11px] text-gray-800 truncate">
                No. Bukti: <b className="font-mono">{selectedSo.noBukti}</b> | Customer:{' '}
                <b>{selectedSo.namaCustomer}</b> | Lokasi Stock:{' '}
                <b className="text-[#0055EA]">{selectedSo.lokasiStock}</b>
              </span>
            ) : (
              <span className="text-[11px] text-gray-500 italic">
                Pilih Sales Order di atas untuk melihat S.O. Detail
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] font-bold text-gray-900 font-mono">
              Subtotal: {formatRupiah(selectedDetailTotal)}
            </span>
            {selectedSo && (
              <>
                <span className="text-[11px] font-semibold text-[#166534] font-mono">
                  PPN ({selectedSo.ppn}): +{formatRupiah(selectedSo.nilaiPpnNum)}
                </span>
                <span className="text-[11px] font-bold text-[#000084] font-mono">
                  Grand Total SO: {formatRupiah(selectedSo.nilaiSoNum)}
                </span>
              </>
            )}
            {selectedSo && (
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
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-20">Terkirim</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-20">QTY</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-28">Harga</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-32">Jumlah</th>
                <th className="px-2 py-1 text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedSoDetails.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                    Belum ada item S.O. Detail pada dokumen ini. Klik Koreksi atau Baru untuk menambahkan detail barang.
                  </td>
                </tr>
              ) : (
                selectedSoDetails.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={`border-b border-[#E5E5E5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
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
        <ToolbarSearchControl
          compact
          searchField={searchField}
          onSearchFieldChange={setSearchField}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onCari={handleExecuteToolbarSearch}
          onReset={handleResetSearch}
          inputRef={searchInputRef}
          isBusy={isBusy}
          inputWidthClass="w-56"
          options={[
            { value: 'Semua', label: 'Semua' },
            { value: 'Kode', label: 'Kode (No.Bukti)' },
            { value: 'No.Bukti', label: 'No.Bukti' },
            { value: 'No. SQ', label: 'No. SQ' },
            { value: 'Nama Pelanggan', label: 'Nama Pelanggan' },
            { value: 'Sales', label: 'Sales' },
            { value: 'PO.NO', label: 'PO.NO' },
            { value: 'Lokasi Stock', label: 'Lokasi Stock' },
            { value: 'Keterangan', label: 'Keterangan' },
            { value: 'SO.Close', label: 'SO.Close' },
          ]}
        />
        <div className="flex items-center space-x-4 shrink-0">
          <div className="w-56 h-5 bg-[#FFFF00] border border-[#919191] shadow-inner px-2 text-[10px] flex items-center text-black truncate">
            {selectedSo ? `${selectedSo.noBukti} - ${selectedSo.namaCustomer}` : ''}
          </div>
          <div className="font-semibold px-2 py-0.5 bg-[#ECE9D8] border border-[#919191]">
            Record {filteredList.length}
          </div>
        </div>
      </div>

      {/* Add / Koreksi Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[940px] max-w-[97vw] max-h-[93vh] flex flex-col overflow-hidden">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs shrink-0">
              <span>{editingId ? 'Koreksi Sales Order' : 'Tambah Sales Order Baru'}</span>
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
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">No. Bukti SO:</label>
                  <input
                    type="text"
                    value={newNoBukti}
                    onChange={(e) => setNewNoBukti(e.target.value.toUpperCase())}
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
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0 text-[#000084]">Tarik dari No. SQ:</label>
                  <select
                    value={newNoSq}
                    onChange={(e) => handleSelectSalesQuotation(e.target.value)}
                    className="w-64 px-2 py-1 bg-[#FFFF99] border border-[#000084] uppercase font-mono cursor-pointer"
                  >
                    <option value="">-- Pilih Sales Quotation --</option>
                    {sqDropdownChoices.map((sqCode) => {
                      const info = sqOptions.find((x) => x.noSq === sqCode);
                      return (
                        <option key={sqCode} value={sqCode}>
                          {info ? `${sqCode} - ${info.namaCustomer}` : sqCode}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">PO.NO (Customer PO):</label>
                  <input
                    type="text"
                    value={newPoNo}
                    onChange={(e) => setNewPoNo(e.target.value.toUpperCase())}
                    placeholder="No. PO dari Customer..."
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Nama Customer:</label>
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
                  <label className="font-semibold shrink-0">Sales:</label>
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
                  <label className="font-semibold shrink-0">Lokasi Stock:</label>
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
                  <label className="font-semibold shrink-0">Disc (%) & Harga Termasuk PPN:</label>
                  <div className="w-64 flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={newDiscPct}
                      onChange={(e) => handleDiscPctChange(e.target.value)}
                      className="w-20 px-2 py-1 bg-white border border-[#7A7A7A] font-mono text-right"
                      title="Diskon %"
                    />
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newIsPpnIncluded}
                        onChange={(e) => handleTogglePpnIncluded(e.target.checked)}
                      />
                      Harga Termasuk PPN
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">PPN (%) / Nominal PPN:</label>
                  <div className="w-64 flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={newPpn}
                      onChange={(e) => handlePpnPercentChange(e.target.value)}
                      className="w-20 px-2 py-1 bg-white border border-[#7A7A7A] font-mono text-center"
                      title="Persentase PPN (%)"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newNilaiPpn}
                      onChange={(e) => handleManualNilaiPpnChange(e.target.value)}
                      className="flex-1 px-2 py-1 bg-[#F0FDF4] border border-[#7A7A7A] font-mono text-right font-semibold text-[#166534]"
                      placeholder="Nominal PPN"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">
                    Nilai SO Total (Rp)
                    {hasFilledDetailRows && (
                      <span className="ml-1 text-[10px] font-normal text-[#0055EA]">
                        (DPP + PPN)
                      </span>
                    )}
                    :
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newNilaiSo}
                    onChange={(e) => setNewNilaiSo(e.target.value)}
                    readOnly={hasFilledDetailRows}
                    className={`w-64 px-2 py-1 border border-[#7A7A7A] font-mono text-right font-bold ${
                      hasFilledDetailRows ? 'bg-[#F0F4FF] text-[#000084]' : 'bg-white'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Deposit / Tgl. Kirim:</label>
                  <div className="w-64 grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      value={newDeposit}
                      onChange={(e) => setNewDeposit(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#7A7A7A] font-mono text-right"
                      placeholder="Deposit"
                    />
                    <DatePickerInput
                      value={newTglKirim}
                      onChange={(formatted) => setNewTglKirim(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Persen (%) / SO.Close:</label>
                  <div className="w-64 flex gap-2">
                    <input
                      type="number"
                      value={newPersen}
                      onChange={(e) => setNewPersen(e.target.value)}
                      className="w-1/2 px-2 py-1 bg-white border border-[#7A7A7A] font-mono text-right"
                    />
                    <select
                      value={newSoClose}
                      onChange={(e) => setNewSoClose(e.target.value)}
                      className="w-1/2 px-2 py-1 bg-white border border-[#7A7A7A]"
                    >
                      <option value="Not Yet">Not Yet</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Keterangan:</label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    className="flex-1 max-w-[730px] px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
              </div>

              {/* S.O. Detail Section */}
              <div className="border border-[#999999] bg-white rounded-xs overflow-hidden">
                <div className="bg-[#E6E3D5] border-b border-[#C0C0C0] px-2.5 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#003C74]">S.O. Detail</span>
                    <span className="text-[11px] text-gray-600">
                      (Pilih Kode Barang dari Master Barang atau tarik dari No. SQ)
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
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-16">Terkirim</th>
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
                <div className="bg-[#F5F4EE] border-t border-[#C0C0C0] px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-bold">
                  <span>
                    Item: {detailRows.filter((d) => d.kode.trim() || d.namaBarang.trim()).length}
                  </span>
                  <div className="flex flex-wrap items-center gap-3 font-mono">
                    <span>Subtotal: {formatRupiah(modalTotals.subtotal)}</span>
                    <span>Disc: -{formatRupiah(modalTotals.nilaiDisc)}</span>
                    <span>DPP: {formatRupiah(modalTotals.dpp)}</span>
                    <span className="text-[#166534]">
                      PPN ({parseNum(newPpn)}%): +{formatRupiah(parseNum(newNilaiPpn))}
                    </span>
                    <span className="text-[#000084] bg-[#E8EEFF] px-2 py-0.5 border border-[#8BA4E8]">
                      Total SO: {formatRupiah(parseNum(newNilaiSo))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit Fields */}
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tgl. Created:</label>
                  <DatePickerInput
                    value={newTglCreated}
                    onChange={(formatted) => setNewTglCreated(formatted)}
                    format="dMyShort"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Diupdate Oleh:</label>
                  <input
                    type="text"
                    value={newDiupdateOleh}
                    onChange={(e) => setNewDiupdateOleh(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tgl.Update:</label>
                  <DatePickerInput
                    value={newTglUpdate}
                    onChange={(formatted) => setNewTglUpdate(formatted)}
                    format="dMyShort"
                  />
                </div>
              </div>

              {modalError && (
                <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold space-y-1">
                  <div>⚠ {modalError}</div>
                  {showCreditOverrideBox && (
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-black font-normal cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overrideCreditLimit}
                        onChange={(e) => setOverrideCreditLimit(e.target.checked)}
                      />
                      Abaikan batas limit kredit dan tetap simpan Sales Order ini
                    </label>
                  )}
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

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteItem)}
        title="Konfirmasi Hapus Sales Order"
        message={`Yakin ingin menghapus Sales Order [${confirmDeleteItem?.noBukti || ''}]?`}
        detail={
          confirmDeleteItem
            ? `Customer: ${confirmDeleteItem.namaCustomer}\nNilai SO: ${formatRupiah(confirmDeleteItem.nilaiSoNum)}`
            : undefined
        }
        confirmLabel="Ya, Hapus"
        isBusy={isBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteItem(null)}
      />

      {/* Find Modal */}
      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Sales Order"
        rows={soList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.noBukti,
          r.noSq,
          r.tanggal,
          r.namaCustomer,
          r.sales,
          r.poNo,
          r.lokasiStock,
          r.keterangan,
          r.soClose,
          r.nilaiSo,
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
          showFeedback(`Sales Order [${row.noBukti} - ${row.namaCustomer}] dipilih`);
        }}
        columns={[
          { header: 'Kode / No.Bukti', accessor: (r) => r.noBukti, widthClass: 'w-28', mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal, widthClass: 'w-22', align: 'center' },
          { header: 'No. SQ', accessor: (r) => r.noSq || '-', widthClass: 'w-24', mono: true },
          { header: 'Nama Customer', accessor: (r) => r.namaCustomer, bold: true },
          { header: 'Sales', accessor: (r) => r.sales || '-', widthClass: 'w-24' },
          { header: 'PO.NO', accessor: (r) => r.poNo || '-', widthClass: 'w-24', mono: true },
          { header: 'PPN', accessor: (r) => r.ppn, widthClass: 'w-14', align: 'center' },
          { header: 'Nilai SO', accessor: (r) => r.nilaiSo, widthClass: 'w-24', align: 'right', mono: true, bold: true },
        ]}
      />

      {/* Dual-mode Print Preview */}
      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={printMode === 'detail' ? 'SALES ORDER (S.O. DETAIL)' : 'LAPORAN LIST SALES ORDER'}
        subtitle={
          printMode === 'detail'
            ? `No. Bukti: ${selectedSo?.noBukti || '-'} | Customer: ${selectedSo?.namaCustomer || '-'}`
            : `Filter Tanggal: ${tanggalFilter}`
        }
        metaLines={
          printMode === 'detail' && selectedSo
            ? [
                { label: 'No. Bukti', value: selectedSo.noBukti },
                { label: 'Tanggal', value: selectedSo.tanggal },
                { label: 'No. SQ', value: selectedSo.noSq || '-' },
                { label: 'Nama Customer', value: selectedSo.namaCustomer },
                { label: 'Sales', value: selectedSo.sales || '-' },
                { label: 'PO.NO', value: selectedSo.poNo || '-' },
                { label: 'Lokasi Stock', value: selectedSo.lokasiStock || '-' },
                { label: 'Tgl. Kirim', value: selectedSo.tglKirim || '-' },
                { label: 'SO. Close', value: selectedSo.soClose || '-' },
                { label: 'Keterangan', value: selectedSo.keterangan || '-' },
              ]
            : []
        }
        showSignatures={printMode === 'detail'}
        orientation="landscape"
        columns={
          printMode === 'detail'
            ? selectedSoDetails.length > 0
              ? (detailPrintColumns as PrintColumn<any>[])
              : (listPrintColumns as PrintColumn<any>[])
            : (listPrintColumns as PrintColumn<any>[])
        }
        rows={
          printMode === 'detail'
            ? selectedSoDetails.length > 0
              ? selectedSoDetails
              : selectedSo
              ? [selectedSo]
              : []
            : filteredList
        }
        summaryItems={
          printMode === 'detail'
            ? [
                { label: 'Total Item', value: `${selectedSoDetails.length} Item` },
                {
                  label: 'Subtotal',
                  value: formatRupiah(selectedDetailTotal || selectedSo?.subtotal || 0),
                },
                {
                  label: `Diskon (${selectedSo?.discPct || 0}%)`,
                  value: `-${formatRupiah(selectedSo?.nilaiDisc || 0)}`,
                },
                {
                  label: 'DPP',
                  value: formatRupiah(selectedSo?.dpp || 0),
                },
                {
                  label: `PPN (${selectedSo?.ppn || '0%'})`,
                  value: `+${formatRupiah(selectedSo?.nilaiPpnNum || 0)}`,
                },
                {
                  label: 'Grand Total Nilai SO',
                  value: formatRupiah(selectedSo?.nilaiSoNum || 0),
                },
              ]
            : [
                { label: 'Total Sales Order', value: `${filteredList.length} Dokumen` },
                { label: 'Total Nominal PPN', value: formatRupiah(totalNilaiPpn) },
                { label: 'Total Nilai SO', value: formatRupiah(totalNilaiSo) },
              ]
        }
        selectedRow={printMode === 'list' ? selectedSo : undefined}
        selectedTitle={printMode === 'list' ? 'SALES ORDER (RECORD TERPILIH)' : undefined}
        selectedSubtitle={
          printMode === 'list' && selectedSo
            ? `No. Bukti: ${selectedSo.noBukti} | Customer: ${selectedSo.namaCustomer}`
            : undefined
        }
        selectedMetaLines={
          printMode === 'list' && selectedSo
            ? [
                { label: 'No. Bukti', value: selectedSo.noBukti },
                { label: 'Tanggal', value: selectedSo.tanggal },
                { label: 'Customer', value: selectedSo.namaCustomer },
                { label: 'Sales', value: selectedSo.sales || '-' },
                { label: 'PO.NO', value: selectedSo.poNo || '-' },
                { label: 'Nilai SO (+PPN)', value: formatRupiah(selectedSo.nilaiSoNum) },
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
              S.O. Terpilih (Detail)
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('list')}
              className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                printMode === 'list' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              List Sales Order
            </button>
          </div>
        }
      />
    </div>
  );
};
