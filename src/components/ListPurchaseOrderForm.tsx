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
import { WORLD_CURRENCIES } from '../lib/currencies';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface PurchaseOrderItem {
  id: string;
  noBukti: string;
  noPr: string;
  tanggal: string;
  tanggalIso: string;
  namaSupplier: string;
  deliveryTo: string;
  delivery: string;
  mataUang: string;
  keterangan: string;
  nilaiPo: string;
  nilaiPoNum: number;
  ppn: string;
  ppnPct: number;
  nilaiPpn: string;
  nilaiPpnNum: number;
  deposit: string;
  tglLunas: string;
  tglKirim: string;
  persen: string;
  poClose: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

export interface PurchaseOrderDetailItem {
  id: string;
  poId?: string;
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

interface MasterBarangOption {
  kode: string;
  namaBarang: string;
  unit: string;
  cost: number;
}

interface PurchaseRequestOption {
  id: string;
  noPr: string;
  tanggal: string;
  deliveryTo: string;
  delivery: string;
  noPo: string;
}

interface ListPurchaseOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function calcPpnDeduction(
  grossTotal: number,
  ppnPct: number
): { nominalPpn: number; netNilaiPo: number } {
  const safeGross = Math.max(0, Number(grossTotal || 0));
  const safePct = Math.max(0, Number(ppnPct || 0));
  const nominalPpn = Number(((safeGross * safePct) / 100).toFixed(2));
  const netNilaiPo = Math.max(0, Number((safeGross - nominalPpn).toFixed(2)));
  return { nominalPpn, netNilaiPo };
}

function mapDbToPo(r: any): PurchaseOrderItem {
  const nilaiNum = Number(r.nilai_po || 0);
  const ppnPct = Number(r.ppn ?? 11);
  const nilaiPpnNum = Number(r.nilai_ppn || 0);
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    noPr: r.no_pr || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaSupplier: r.nama_supplier || '',
    deliveryTo: r.delivery_to || '',
    delivery: r.delivery || '',
    mataUang: String(r.mata_uang || 'IDR').trim().toUpperCase() || 'IDR',
    keterangan: r.keterangan || '',
    nilaiPo: formatMoney(nilaiNum),
    nilaiPoNum: nilaiNum,
    ppn: `${ppnPct}%`,
    ppnPct,
    nilaiPpn: formatMoney(nilaiPpnNum),
    nilaiPpnNum,
    deposit: Number(r.deposit || 0) > 0 ? formatMoney(r.deposit) : '-',
    tglLunas: toDisplayDMyShort(r.tgl_lunas) || '-',
    tglKirim: toDisplayDMyShort(r.tgl_kirim) || '-',
    persen: `${Number(r.persen || 0)}%`,
    poClose: r.po_close || 'Not Yet',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

function mapDbToPoDetail(d: any, idx = 0): PurchaseOrderDetailItem {
  const qty = Number(d.qty || 0);
  const harga = Number(d.harga || 0);
  const jumlah = d.jumlah !== undefined && d.jumlah !== null ? Number(d.jumlah) : qty * harga;
  const total = d.total !== undefined && d.total !== null ? Number(d.total) : jumlah;
  return {
    id: d.id || `det-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    poId: d.po_id,
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

function createBlankDetailRow(noUrut: number): PurchaseOrderDetailItem {
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

export const ListPurchaseOrderForm: React.FC<ListPurchaseOrderFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [poList, setPoList] = useState<PurchaseOrderItem[]>([]);
  const [poDetailsMap, setPoDetailsMap] = useState<Record<string, PurchaseOrderDetailItem[]>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newNoPr, setNewNoPr] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newSupplier, setNewSupplier] = useState<string>('');
  const [newDeliveryTo, setNewDeliveryTo] = useState<string>('');
  const [newDelivery, setNewDelivery] = useState<string>('Darat');
  const [newMataUang, setNewMataUang] = useState<string>('IDR');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newNilaiPo, setNewNilaiPo] = useState<string>('0');
  const [newPpn, setNewPpn] = useState<string>('11');
  const [newNilaiPpn, setNewNilaiPpn] = useState<string>('0');
  const [ppnManualOverride, setPpnManualOverride] = useState<boolean>(false);
  const [newDeposit, setNewDeposit] = useState<string>('0');
  const [newTglLunas, setNewTglLunas] = useState<string>('');
  const [newTglKirim, setNewTglKirim] = useState<string>('');
  const [newPersen, setNewPersen] = useState<string>('0');
  const [newPoClose, setNewPoClose] = useState<string>('Not Yet');
  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');
  const [detailRows, setDetailRows] = useState<PurchaseOrderDetailItem[]>([]);

  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);
  const [prOptions, setPrOptions] = useState<PurchaseRequestOption[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<'list' | 'detail'>('list');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadMasterReferences = async () => {
    const [suppRes, barangRes, prRes, lokasiRes] = await Promise.allSettled([
      erpList<any>('master_suppliers', { orderBy: 'nama_supplier', asc: true, limit: 1000 }),
      erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 }),
      erpList<any>('purchase_requests', { orderBy: 'tanggal', asc: false, limit: 1000 }),
      erpList<any>('master_lokasi_gudangs', { orderBy: 'nama_lokasi', asc: true, limit: 1000 }),
    ]);

    if (suppRes.status === 'fulfilled') {
      const uniqueNames = Array.from(
        new Set(
          suppRes.value
            .map((r: any) => String(r.nama_supplier || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setSupplierOptions(uniqueNames);
    }

    if (barangRes.status === 'fulfilled') {
      const mapped: MasterBarangOption[] = barangRes.value
        .map((r: any) => ({
          kode: String(r.kode || '').trim().toUpperCase(),
          namaBarang: String(r.nama_barang || '').trim(),
          unit: String(r.unit || 'PCS').trim().toUpperCase(),
          cost: Number(r.cost || 0),
        }))
        .filter((b: MasterBarangOption) => b.kode);
      setBarangOptions(mapped);
    }

    if (prRes.status === 'fulfilled') {
      const prMap = new Map<string, PurchaseRequestOption>();
      for (const r of prRes.value) {
        const noPr = String(r.no_pr || '').trim().toUpperCase();
        if (!noPr) continue;
        prMap.set(noPr, {
          id: String(r.id),
          noPr,
          tanggal: toDisplayDMyShort(r.tanggal),
          deliveryTo: String(r.delivery_to || '').trim().toUpperCase(),
          delivery: String(r.delivery || '').trim(),
          noPo: String(r.no_po || '').trim().toUpperCase(),
        });
      }
      setPrOptions(Array.from(prMap.values()));
    }

    if (lokasiRes.status === 'fulfilled') {
      const lokasis = Array.from(
        new Set(
          lokasiRes.value
            .map((l: any) => String(l.nama_lokasi || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setLokasiOptions(lokasis);
    }
  };

  const SEARCH_FIELD_TO_DB_COL: Record<string, string> = {
    Kode: 'no_bukti',
    'No.PR': 'no_pr',
    'Nama Supplier': 'nama_supplier',
    'No.Bukti': 'no_bukti',
    'Delivery To': 'delivery_to',
    'Mata Uang': 'mata_uang',
    Keterangan: 'keterangan',
    'PO.Close': 'po_close',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
    tglFilter?: string;
  }): Promise<PurchaseOrderItem[] | null> => {
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
            'no_bukti,no_pr,nama_supplier,delivery_to,delivery,mata_uang,keterangan,po_close';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows, details] = await Promise.all([
        erpList<any>('purchase_orders', queryOpts),
        erpList<any>('purchase_order_details', { orderBy: 'no_urut', asc: true }).catch(() => []),
        loadMasterReferences(),
      ]);
      const mapped = rows.map(mapDbToPo);
      setPoList(mapped);

      const grouped: Record<string, PurchaseOrderDetailItem[]> = {};
      for (const raw of details) {
        const key = String(raw.po_id || '');
        if (!key) continue;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(mapDbToPoDetail(raw, grouped[key].length));
      }
      setPoDetailsMap(grouped);

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
    const selected = poList.find((p) => p.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record Purchase Order terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const details = poDetailsMap[selected.id] || [];
      const headerPayload: Record<string, any> = {
        id: selected.id,
        no_bukti: selected.noBukti.trim().toUpperCase(),
        no_pr: selected.noPr.trim().toUpperCase() || null,
        tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
        nama_supplier: selected.namaSupplier.trim().toUpperCase(),
        delivery_to: selected.deliveryTo.trim().toUpperCase(),
        delivery: selected.delivery.trim(),
        mata_uang: selected.mataUang.trim().toUpperCase() || 'IDR',
        keterangan: selected.keterangan.trim(),
        nilai_po: selected.nilaiPoNum,
        ppn: selected.ppnPct,
        nilai_ppn: selected.nilaiPpnNum,
        deposit: parseNum(selected.deposit),
        tgl_lunas: selected.tglLunas !== '-' ? toIsoDate(selected.tglLunas) : null,
        tgl_kirim: selected.tglKirim !== '-' ? toIsoDate(selected.tglKirim) : null,
        persen: parseNum(selected.persen),
        po_close: selected.poClose,
        dibuat_oleh: selected.dibuatOleh.trim().toUpperCase() || currentUser,
        diupdate_oleh: currentUser,
        tgl_update: todayIso(),
      };
      const detailPayloads = details.map((d, idx) => ({
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
        'purchase-order',
        headerPayload,
        detailPayloads
      );
      const savedHeader = mapDbToPo(res.header);
      const savedDetails = (res.details || []).map((d, idx) => mapDbToPoDetail(d, idx));
      setPoList((prev) => prev.map((p) => (p.id === savedHeader.id ? savedHeader : p)));
      setPoDetailsMap((prev) => ({ ...prev, [savedHeader.id]: savedDetails }));
      setSelectedId(savedHeader.id);
      showFeedback(`Purchase Order [${savedHeader.noBukti}] tersimpan ke Supabase`);
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const selectedPo = useMemo(
    () => poList.find((p) => p.id === selectedId) || null,
    [poList, selectedId]
  );

  const selectedPoDetails = useMemo(
    () => (selectedId ? poDetailsMap[selectedId] || [] : []),
    [poDetailsMap, selectedId]
  );

  const selectedDetailTotal = useMemo(
    () => selectedPoDetails.reduce((acc, d) => acc + d.total, 0),
    [selectedPoDetails]
  );

  const modalDetailTotal = useMemo(
    () => detailRows.reduce((acc, d) => acc + d.total, 0),
    [detailRows]
  );

  const hasFilledDetailRows = useMemo(
    () => detailRows.some((r) => r.kode.trim() !== '' || r.namaBarang.trim() !== ''),
    [detailRows]
  );

  const modalNominalPpn = useMemo(() => parseNum(newNilaiPpn), [newNilaiPpn]);

  if (!isOpen) return null;

  const updateDetailRowsWithSync = (
    updater: (prev: PurchaseOrderDetailItem[]) => PurchaseOrderDetailItem[]
  ) => {
    setDetailRows((prev) => {
      const next = updater(prev);
      const hasFilledRow = next.some((r) => r.kode.trim() || r.namaBarang.trim());
      if (hasFilledRow) {
        const sum = next.reduce((acc, r) => acc + r.total, 0);
        if (ppnManualOverride) {
          const manualPpn = parseNum(newNilaiPpn);
          setNewNilaiPo(String(Math.max(0, Number((sum - manualPpn).toFixed(2)))));
        } else {
          const { nominalPpn, netNilaiPo } = calcPpnDeduction(sum, parseNum(newPpn));
          setNewNilaiPpn(String(nominalPpn));
          setNewNilaiPo(String(netNilaiPo));
        }
      }
      return next;
    });
  };

  const handlePpnPercentChange = (rawVal: string) => {
    setNewPpn(rawVal);
    setPpnManualOverride(false);
    const pct = parseNum(rawVal);
    if (hasFilledDetailRows) {
      const { nominalPpn, netNilaiPo } = calcPpnDeduction(modalDetailTotal, pct);
      setNewNilaiPpn(String(nominalPpn));
      setNewNilaiPo(String(netNilaiPo));
    } else {
      const currentNilaiPo = parseNum(newNilaiPo);
      const nominalPpn = Number(((Math.max(0, currentNilaiPo) * Math.max(0, pct)) / 100).toFixed(2));
      setNewNilaiPpn(String(nominalPpn));
    }
  };

  const handleManualNilaiPpnChange = (rawVal: string) => {
    setNewNilaiPpn(rawVal);
    setPpnManualOverride(true);
    if (hasFilledDetailRows) {
      const manualPpn = Math.max(0, parseNum(rawVal));
      setNewNilaiPo(String(Math.max(0, Number((modalDetailTotal - manualPpn).toFixed(2)))));
    }
  };

  const handleSelectNoPr = (selectedNoPr: string) => {
    const cleanPr = selectedNoPr.trim().toUpperCase();
    setNewNoPr(cleanPr);
    if (!cleanPr) return;

    const matchedPr = prOptions.find((p) => p.noPr === cleanPr);
    if (!matchedPr) return;

    if (matchedPr.deliveryTo) setNewDeliveryTo(matchedPr.deliveryTo);
    if (matchedPr.delivery) setNewDelivery(matchedPr.delivery);
    if (
      !editingId &&
      matchedPr.noPo &&
      matchedPr.noPo !== '-' &&
      !poList.some((po) => po.noBukti.toUpperCase() === matchedPr.noPo)
    ) {
      setNewNoBukti(matchedPr.noPo);
    }
    if (!newKeterangan.trim()) {
      setNewKeterangan(
        `Ref PR: ${matchedPr.noPr}${matchedPr.deliveryTo ? ` | ${matchedPr.deliveryTo}` : ''}${
          matchedPr.delivery ? ` (${matchedPr.delivery})` : ''
        }`
      );
    }
    showFeedback(
      `Field otomatis diisi dari PR [${matchedPr.noPr}] (${matchedPr.deliveryTo || '-'} / ${
        matchedPr.delivery || '-'
      })`
    );
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
        const harga = found ? (r.harga > 0 && r.kode === cleanKode ? r.harga : found.cost) : r.harga;
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
    field: keyof PurchaseOrderDetailItem,
    rawValue: string
  ) => {
    updateDetailRowsWithSync((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated: PurchaseOrderDetailItem = { ...r };
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
    const todayDisplay = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setNewNoBukti(nextUniqueCode(poList.map((p) => p.noBukti), '2608-PO-IMP-', 3));
    setNewNoPr('');
    setNewTanggal(todayDisplay);
    setNewSupplier('');
    setNewDeliveryTo('');
    setNewDelivery('Darat');
    setNewMataUang('IDR');
    setNewKeterangan('');
    setNewNilaiPo('0');
    setNewPpn('11');
    setNewNilaiPpn('0');
    setPpnManualOverride(false);
    setNewDeposit('0');
    setNewTglLunas('');
    setNewTglKirim(todayDisplay);
    setNewPersen('0');
    setNewPoClose('Not Yet');
    setNewDibuatOleh(currentUser);
    setNewTglCreated(todayDisplay);
    setNewDiupdateOleh('-');
    setNewTglUpdate('');
    setDetailRows([createBlankDetailRow(1)]);
    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleEdit = async () => {
    const item = poList.find((p) => p.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisplay = toDisplayDMyShort(todayIso());
    setEditingId(item.id);
    setModalError(null);
    setNewNoBukti(item.noBukti);
    setNewNoPr(item.noPr || '');
    setNewTanggal(item.tanggal || todayDisplay);
    setNewSupplier(item.namaSupplier);
    setNewDeliveryTo(item.deliveryTo || '');
    setNewDelivery(item.delivery || 'Darat');
    setNewMataUang(item.mataUang || 'IDR');
    setNewKeterangan(item.keterangan);
    const pctVal = parseNum(item.ppn);
    setNewPpn(String(pctVal));
    setNewDeposit(String(parseNum(item.deposit)));
    setNewTglLunas(item.tglLunas === '-' ? '' : item.tglLunas);
    setNewTglKirim(item.tglKirim === '-' ? '' : item.tglKirim);
    setNewPersen(String(parseNum(item.persen)));
    setNewPoClose(item.poClose);
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisplay : item.tglCreated);
    setNewDiupdateOleh(
      item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser
    );
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisplay);

    const existingDetails = poDetailsMap[item.id] || [];
    const existingDetailSum = existingDetails.reduce((acc, d) => acc + d.total, 0);
    if (existingDetails.length > 0) {
      const autoCalc = calcPpnDeduction(existingDetailSum, pctVal);
      if (item.nilaiPpnNum > 0) {
        const isManual = Math.abs(item.nilaiPpnNum - autoCalc.nominalPpn) > 1;
        setNewNilaiPpn(String(item.nilaiPpnNum));
        setNewNilaiPo(String(Math.max(0, Number((existingDetailSum - item.nilaiPpnNum).toFixed(2)))));
        setPpnManualOverride(isManual);
      } else {
        setNewNilaiPpn(String(autoCalc.nominalPpn));
        setNewNilaiPo(String(autoCalc.netNilaiPo));
        setPpnManualOverride(false);
      }
    } else {
      setNewNilaiPpn(String(item.nilaiPpnNum));
      setNewNilaiPo(String(item.nilaiPoNum));
      setPpnManualOverride(item.nilaiPpnNum > 0);
    }

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
    if (!newNoBukti.trim() || !newSupplier.trim()) {
      setModalError('No.Bukti dan Nama Supplier wajib diisi.');
      return;
    }

    const activeDetails = detailRows.filter(
      (d) => d.kode.trim() !== '' || d.namaBarang.trim() !== ''
    );
    const totalFromDetails = activeDetails.reduce((acc, d) => acc + d.total, 0);
    const ppnPct = Math.max(0, parseNum(newPpn));
    let finalNilaiPpn = Math.max(0, parseNum(newNilaiPpn));
    let finalNilaiPo = parseNum(newNilaiPo);

    if (activeDetails.length > 0) {
      if (ppnManualOverride) {
        finalNilaiPo = Math.max(0, Number((totalFromDetails - finalNilaiPpn).toFixed(2)));
      } else {
        const calc = calcPpnDeduction(totalFromDetails, ppnPct);
        finalNilaiPpn = calc.nominalPpn;
        finalNilaiPo = calc.netNilaiPo;
      }
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const baseHeader: Record<string, any> = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        no_pr: newNoPr.trim().toUpperCase() || null,
        tanggal: toIsoDate(newTanggal) || todayIso(),
        nama_supplier: newSupplier.trim().toUpperCase(),
        delivery_to: newDeliveryTo.trim().toUpperCase(),
        delivery: newDelivery.trim(),
        mata_uang: newMataUang.trim().toUpperCase() || 'IDR',
        keterangan: newKeterangan.trim(),
        nilai_po: finalNilaiPo,
        ppn: ppnPct,
        nilai_ppn: finalNilaiPpn,
        deposit: parseNum(newDeposit),
        tgl_lunas: toIsoDate(newTglLunas),
        tgl_kirim: toIsoDate(newTglKirim),
        persen: parseNum(newPersen),
        po_close: newPoClose,
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
        'purchase-order',
        baseHeader,
        detailPayloads
      );

      const savedHeader = mapDbToPo(res.header);
      const savedDetails = (res.details || []).map((d, idx) => mapDbToPoDetail(d, idx));

      if (editingId) {
        setPoList((prev) => prev.map((p) => (p.id === editingId ? savedHeader : p)));
        showFeedback('Purchase Order & P.O. Detail diperbarui (PPN tersimpan)');
      } else {
        setPoList((prev) => [savedHeader, ...prev]);
        setSelectedId(savedHeader.id);
        showFeedback('Purchase Order & P.O. Detail tersimpan (PPN tersimpan)');
      }

      setPoDetailsMap((prev) => ({
        ...prev,
        [savedHeader.id]: savedDetails,
      }));

      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const rawMsg = err?.message || 'Gagal menyimpan Purchase Order';
      const msg =
        (rawMsg.includes('nilai_ppn') || rawMsg.includes('no_pr') || rawMsg.includes('delivery_to')) &&
        rawMsg.toLowerCase().includes('schema cache')
          ? `${rawMsg} — Jalankan SQL Query migrasi tabel purchase_orders di Supabase SQL Editor.`
          : rawMsg;
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('purchase_order_details', id, 'po_id').catch(() => {});
      await erpDelete('purchase_orders', id);
      const updated = poList.filter((item) => item.id !== id);
      setPoList(updated);
      setPoDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Purchase Order dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const matchesPoRow = (item: PurchaseOrderItem, termVal: string) => {
    if (searchField === 'Kode' || searchField === 'No.Bukti') return matchesMultiKeyword([item.noBukti], termVal);
    if (searchField === 'No.PR') return matchesMultiKeyword([item.noPr], termVal);
    if (searchField === 'Nama Supplier') return matchesMultiKeyword([item.namaSupplier], termVal);
    if (searchField === 'Delivery To') return matchesMultiKeyword([item.deliveryTo], termVal);
    if (searchField === 'Mata Uang') return matchesMultiKeyword([item.mataUang], termVal);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], termVal);
    if (searchField === 'PO.Close') return matchesMultiKeyword([item.poClose], termVal);
    return matchesMultiKeyword(
      [
        item.noBukti,
        item.noPr,
        item.tanggal,
        item.namaSupplier,
        item.deliveryTo,
        item.delivery,
        item.mataUang,
        item.keterangan,
        item.poClose,
      ],
      termVal
    );
  };

  const filteredPoList = poList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    return matchesPoRow(item, searchTerm);
  });

  const totalNilaiPo = filteredPoList.reduce((acc, r) => acc + r.nilaiPoNum, 0);
  const totalNilaiPpn = filteredPoList.reduce((acc, r) => acc + r.nilaiPpnNum, 0);

  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
    const matched = poList.filter((item) => {
      if (filterIso && item.tanggalIso !== filterIso) return false;
      return matchesPoRow(item, val);
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
          ? `Ditemukan ${rows.length} Purchase Order dari Supabase`
          : `Menampilkan ${rows.length} Purchase Order dari Supabase`
      );
    } else if (rows) {
      setSelectedId('');
      showFeedback('Data Purchase Order tidak ditemukan di Supabase');
    }
  };

  const handleResetSearch = async () => {
    setSearchTerm('');
    setSearchField('Semua');
    const rows = await loadData({ field: 'Semua', term: '', tglFilter: tanggalFilter });
    if (rows) {
      showFeedback(`Filter direset (${rows.length} Purchase Order)`);
    }
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
  };

  const handleOpenPrint = (mode: 'list' | 'detail' = 'list') => {
    setPrintMode(mode);
    setIsPrintOpen(true);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Purchase_Order',
      sheetTitle: 'LIST PURCHASE ORDER',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'No.PR', accessor: 'noPr' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Supplier', accessor: 'namaSupplier' },
        { header: 'Delivery To', accessor: 'deliveryTo' },
        { header: 'Delivery', accessor: 'delivery' },
        { header: 'Mata Uang', accessor: 'mataUang', align: 'center' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'PPN', accessor: 'ppn', align: 'center' },
        { header: 'Nominal PPN', accessor: 'nilaiPpnNum', align: 'right' },
        { header: 'Nilai PO', accessor: 'nilaiPoNum', align: 'right' },
        { header: 'Tgl.Kirim', accessor: 'tglKirim', align: 'center' },
        { header: 'PO.Close', accessor: 'poClose', align: 'center' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
        { header: 'Tgl.Created', accessor: 'tglCreated', align: 'center' },
        { header: 'DiUpdate Oleh', accessor: 'diupdateOleh' },
        { header: 'Tgl.Updated', accessor: 'tglUpdate', align: 'center' },
      ],
      rows: filteredPoList,
    });
    showFeedback('Export Excel selesai');
  };

  const currencyOptionCodes = Array.from(
    new Set([
      ...WORLD_CURRENCIES.map((c) => c.code),
      newMataUang.trim().toUpperCase(),
    ].filter(Boolean))
  );

  const prDropdownChoices = Array.from(
    new Set([...prOptions.map((p) => p.noPr), newNoPr.trim().toUpperCase()].filter(Boolean))
  );

  const deliveryToChoices = Array.from(
    new Set([...lokasiOptions, newDeliveryTo.trim().toUpperCase()].filter(Boolean))
  );

  const listPrintColumns: PrintColumn<PurchaseOrderItem>[] = [
    { header: 'No.Bukti', accessor: 'noBukti', width: '82px' },
    { header: 'No.PR', accessor: 'noPr', width: '80px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '58px' },
    { header: 'Nama Supplier', accessor: 'namaSupplier', width: '116px' },
    { header: 'Delivery To', accessor: 'deliveryTo', width: '90px' },
    { header: 'MU', accessor: 'mataUang', align: 'center', width: '38px' },
    { header: 'PPN', accessor: 'ppn', align: 'center', width: '42px' },
    { header: 'Nominal PPN', accessor: 'nilaiPpn', align: 'right', width: '74px' },
    { header: 'Nilai PO', accessor: 'nilaiPo', align: 'right', width: '78px' },
    { header: 'Tgl.Kirim', accessor: 'tglKirim', align: 'center', width: '58px' },
    { header: 'PO.Close', accessor: 'poClose', align: 'center', width: '48px' },
    { header: 'Dibuat Oleh', accessor: 'dibuatOleh', width: '58px' },
    { header: 'Tgl.Created', accessor: 'tglCreated', align: 'center', width: '56px' },
  ];

  const detailPrintColumns: PrintColumn<PurchaseOrderDetailItem>[] = [
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
      id="list-purchase-order-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Purchase Order"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => handleOpenPrint(selectedPo ? 'detail' : 'list')}
          onTableView={() =>
            loadData({ field: searchField, term: searchTerm, tglFilter: tanggalFilter })
          }
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto">
          <div className="flex items-center space-x-3">
            <FormActionButtons
              onSimpan={handleToolbarSimpan}
              onBaru={handleAddNew}
              onKoreksi={handleEdit}
              onHapus={() => (selectedId ? handleDelete(selectedId) : showFeedback('Pilih data yang akan dihapus'))}
              onPrint={() => handleOpenPrint(selectedPo ? 'detail' : 'list')}
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

          <div className="flex items-center gap-3 pr-2 shrink-0">
            <div className="text-xs font-semibold px-2.5 py-1 bg-[#FFF7E6] border border-[#C7A05A] text-[#7A4900] whitespace-nowrap">
              PPN: {formatRupiah(totalNilaiPpn)}
            </div>
            <div className="font-bold text-sm text-gray-900">{formatRupiah(totalNilaiPo)}</div>
          </div>
        </div>

        {/* Upper Table: List Purchase Order */}
        <div className="flex-[1.35] min-h-[160px] overflow-auto bg-white border border-[#999999] mx-1.5 mt-1.5 relative shadow-inner">
          <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1780px]">
            <thead className="sticky top-0 bg-[#F0F0F0] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10">
              <tr>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center w-10">No</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.Bukti</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.PR</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tanggal</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Nama Supplier</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Delivery To</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Delivery</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Mata Uang</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Keterangan</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">PPN</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-right">Nominal PPN</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-right">Nilai PO</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Deposit</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Tgl. Lunas</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Kirim</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Persen</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">PO.Close</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Dibuat Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Created</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">DiUpdate Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Updated</th>
                <th className="px-2 py-1.5 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPoList.length === 0 ? (
                <tr>
                  <td colSpan={22} className="text-center py-6 text-gray-500 italic">
                    Tidak ada data Purchase Order
                  </td>
                </tr>
              ) : (
                filteredPoList.map((item, idx) => {
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
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono">{item.noPr || '-'}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.tanggal}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-semibold">{item.namaSupplier}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.deliveryTo || '-'}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.delivery || '-'}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center font-mono font-bold">
                        {item.mataUang}
                      </td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.keterangan}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{item.ppn}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-right font-mono">{item.nilaiPpn}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-right font-mono font-semibold">{item.nilaiPo}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{item.deposit}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{item.tglLunas}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.tglKirim}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{item.persen}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{item.poClose}</td>
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

        {/* Lower Panel: P.O. Detail for Selected PO */}
        <div className="flex-1 min-h-[145px] flex flex-col mx-1.5 mt-1.5 mb-1 border border-[#999999] bg-white shadow-inner overflow-hidden">
          <div className="shrink-0 bg-[#E6E3D5] border-b border-[#ACA899] px-2.5 py-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-[#003C74] whitespace-nowrap">P.O. Detail</span>
              {selectedPo ? (
                <span className="text-[11px] text-gray-800 truncate">
                  No.Bukti: <b className="font-mono">{selectedPo.noBukti}</b> | No.PR:{' '}
                  <b className="font-mono text-[#000084]">{selectedPo.noPr || '-'}</b> | Supplier:{' '}
                  <b>{selectedPo.namaSupplier}</b> | Delivery To:{' '}
                  <b>{selectedPo.deliveryTo || '-'}</b> | MU:{' '}
                  <b className="font-mono text-[#0055EA]">{selectedPo.mataUang}</b>
                </span>
              ) : (
                <span className="text-[11px] text-gray-500 italic">
                  Pilih Purchase Order di atas untuk melihat P.O. Detail
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] font-bold text-gray-900 font-mono">
                Total Detail: {selectedPo?.mataUang || 'IDR'} {formatMoney(selectedDetailTotal)}
              </span>
              {selectedPo && (
                <>
                  <span className="text-[11px] font-semibold text-[#9A3412] font-mono">
                    Potongan PPN ({selectedPo.ppn}): -{selectedPo.mataUang} {formatMoney(selectedPo.nilaiPpnNum)}
                  </span>
                  <span className="text-[11px] font-bold text-[#000084] font-mono">
                    Nilai PO: {selectedPo.mataUang} {formatMoney(selectedPo.nilaiPoNum)}
                  </span>
                </>
              )}
              {selectedPo && (
                <button
                  type="button"
                  onClick={() => handleOpenPrint('detail')}
                  className="px-2.5 py-0.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded-xs text-[11px] font-semibold cursor-pointer"
                >
                  Print P.O. Detail
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-left min-w-[920px]">
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
                {selectedPoDetails.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                      Belum ada item P.O. Detail pada dokumen ini. Klik Koreksi atau Baru untuk menambahkan detail barang.
                    </td>
                  </tr>
                ) : (
                  selectedPoDetails.map((d, idx) => (
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

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-t border-[#C0C0C0] gap-2 overflow-x-auto">
          <ToolbarSearchControl
            compact
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={handleSearchTermChange}
            onCari={handleExecuteToolbarSearch}
            onReset={handleResetSearch}
            inputRef={searchInputRef}
            isBusy={isBusy}
            inputWidthClass="w-56"
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode (No.Bukti)' },
              { value: 'No.PR', label: 'No.PR' },
              { value: 'Nama Supplier', label: 'Nama Supplier' },
              { value: 'No.Bukti', label: 'No.Bukti' },
              { value: 'Delivery To', label: 'Delivery To' },
              { value: 'Mata Uang', label: 'Mata Uang' },
              { value: 'Keterangan', label: 'Keterangan' },
              { value: 'PO.Close', label: 'PO.Close' },
            ]}
          />

          <div className="flex items-center space-x-4 shrink-0">
            <div className="w-64 h-5 bg-[#FFFF99] border border-[#C0C0C0] rounded-xs px-2 text-[10px] flex items-center text-gray-700 truncate">
              {selectedPo
                ? `${selectedPo.noBukti}${selectedPo.noPr ? ` (PR: ${selectedPo.noPr})` : ''} - ${
                    selectedPo.namaSupplier
                  }`
                : ''}
            </div>
            <div className="text-gray-800 font-medium">Record : {filteredPoList.length}</div>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] rounded shadow-2xl w-[940px] max-w-[97vw] max-h-[93vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-[#0055EA] to-[#2B579A] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs shrink-0">
                <span>{editingId ? 'Koreksi Purchase Order' : 'Tambah Purchase Order Baru'}</span>
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
              <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3 overflow-y-auto">
                {/* Header Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">No.Bukti:</label>
                    <input
                      type="text"
                      value={newNoBukti}
                      onChange={(e) => setNewNoBukti(e.target.value)}
                      required
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">Tanggal:</label>
                    <div className="w-64">
                      <DatePickerInput
                        value={newTanggal}
                        onChange={(formatted) => setNewTanggal(formatted)}
                        format="dMyShort"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-[#000084] shrink-0">
                      No. PR (Purchase Request):
                    </label>
                    <select
                      value={newNoPr}
                      onChange={(e) => handleSelectNoPr(e.target.value)}
                      className="w-64 px-2 py-1 bg-[#FFFBEB] border border-[#7A7A7A] rounded text-xs uppercase font-mono cursor-pointer"
                    >
                      <option value="">-- Pilih No. PR (Opsional) --</option>
                      {prDropdownChoices.map((prNo) => {
                        const info = prOptions.find((p) => p.noPr === prNo);
                        return (
                          <option key={prNo} value={prNo}>
                            {info ? `${prNo} (${info.deliveryTo || '-'})` : prNo}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">Nama Supplier:</label>
                    <select
                      value={newSupplier}
                      onChange={(e) => setNewSupplier(e.target.value)}
                      required
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih Supplier --</option>
                      {Array.from(
                        new Set(
                          [...supplierOptions, newSupplier.trim().toUpperCase()].filter(Boolean)
                        )
                      ).map((namaSupplier) => (
                        <option key={namaSupplier} value={namaSupplier}>
                          {namaSupplier}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">Delivery To:</label>
                    <select
                      value={newDeliveryTo}
                      onChange={(e) => setNewDeliveryTo(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih Lokasi Gudang --</option>
                      {deliveryToChoices.map((lok) => (
                        <option key={lok} value={lok}>
                          {lok}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">Delivery / Mata Uang:</label>
                    <div className="w-64 flex gap-2">
                      <select
                        value={newDelivery}
                        onChange={(e) => setNewDelivery(e.target.value)}
                        className="w-1/2 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs cursor-pointer"
                      >
                        <option value="Darat">Darat</option>
                        <option value="Laut">Laut</option>
                        <option value="Udara">Udara</option>
                        <option value="Ambil Sendiri">Ambil Sendiri</option>
                      </select>
                      <select
                        value={newMataUang}
                        onChange={(e) => setNewMataUang(e.target.value)}
                        className="w-1/2 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs cursor-pointer"
                      >
                        {currencyOptionCodes.map((code) => {
                          const info = WORLD_CURRENCIES.find((c) => c.code === code);
                          return (
                            <option key={code} value={code}>
                              {info ? `${info.code} - ${info.name}` : code}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">
                      PPN (%) / Nominal PPN:
                    </label>
                    <div className="w-64 flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={newPpn}
                        onChange={(e) => handlePpnPercentChange(e.target.value)}
                        className="w-20 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs font-mono text-center"
                        placeholder="PPN %"
                        title="Persentase PPN (%) — Memotong Total P.O. Detail"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={newNilaiPpn}
                        onChange={(e) => handleManualNilaiPpnChange(e.target.value)}
                        className="flex-1 px-2 py-1 bg-[#FFFBEB] border border-[#7A7A7A] rounded text-xs font-mono text-right font-semibold text-[#9A3412]"
                        placeholder="Nominal PPN"
                        title="Nominal Potongan PPN tersimpan di tabel purchase_orders"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">
                      Nilai PO ({newMataUang})
                      {hasFilledDetailRows && (
                        <span className="ml-1 text-[10px] font-normal text-[#0055EA]">
                          (Detail - PPN)
                        </span>
                      )}
                      :
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newNilaiPo}
                      onChange={(e) => setNewNilaiPo(e.target.value)}
                      readOnly={hasFilledDetailRows}
                      required
                      className={`w-64 px-2 py-1 border border-[#7A7A7A] rounded text-xs font-mono text-right font-bold ${
                        hasFilledDetailRows ? 'bg-[#F0F4FF] text-[#000084]' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">Deposit ({newMataUang}):</label>
                    <input
                      type="number"
                      value={newDeposit}
                      onChange={(e) => setNewDeposit(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs font-mono text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">Tgl.Lunas / Tgl.Kirim:</label>
                    <div className="w-64 flex gap-2">
                      <div className="w-1/2">
                        <DatePickerInput
                          value={newTglLunas}
                          onChange={(formatted) => setNewTglLunas(formatted)}
                          format="dMyShort"
                          placeholder="Tgl Lunas"
                        />
                      </div>
                      <div className="w-1/2">
                        <DatePickerInput
                          value={newTglKirim}
                          onChange={(formatted) => setNewTglKirim(formatted)}
                          format="dMyShort"
                          placeholder="Tgl Kirim"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">Keterangan:</label>
                    <input
                      type="text"
                      value={newKeterangan}
                      onChange={(e) => setNewKeterangan(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">Persen (%) / Status PO:</label>
                    <div className="w-64 flex items-center space-x-2">
                      <input
                        type="number"
                        value={newPersen}
                        onChange={(e) => setNewPersen(e.target.value)}
                        className="w-24 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs font-mono text-right"
                        placeholder="0"
                      />
                      <select
                        value={newPoClose}
                        onChange={(e) => setNewPoClose(e.target.value)}
                        className="flex-1 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                      >
                        <option value="Not Yet">Not Yet</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* P.O. Detail Section */}
                <div className="border border-[#999999] bg-white rounded-xs overflow-hidden">
                  <div className="bg-[#E6E3D5] border-b border-[#C0C0C0] px-2.5 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#003C74]">P.O. Detail</span>
                      <span className="text-[11px] text-gray-600">
                        (Pilih Kode Barang dari Master Barang atau isi manual)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDetailRow}
                      className="px-2.5 py-0.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded-xs text-[11px] font-semibold cursor-pointer"
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
                  <div className="bg-[#F5F4EE] border-t border-[#C0C0C0] px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-bold">
                    <span>Jumlah Item: {detailRows.filter((d) => d.kode.trim() || d.namaBarang.trim()).length}</span>
                    <div className="flex flex-wrap items-center gap-4 font-mono">
                      <span className="text-[#003C74]">
                        Total P.O Detail: {newMataUang} {formatMoney(modalDetailTotal)}
                      </span>
                      <span className="text-[#9A3412]">
                        Potongan PPN ({parseNum(newPpn)}%): -{newMataUang} {formatMoney(modalNominalPpn)}
                      </span>
                      <span className="text-[#000084] bg-[#E8EEFF] px-2 py-0.5 border border-[#8BA4E8]">
                        Nilai PO: {newMataUang} {formatMoney(parseNum(newNilaiPo))}
                      </span>
                    </div>
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

        <SupabaseFindModal
          isOpen={isFindOpen}
          onClose={() => setIsFindOpen(false)}
          tableLabel="Purchase Order"
          rows={poList}
          selectedId={selectedId}
          getRowId={(p) => p.id}
          getSearchValues={(p) => [
            p.noBukti,
            p.noPr,
            p.tanggal,
            p.namaSupplier,
            p.deliveryTo,
            p.delivery,
            p.mataUang,
            p.keterangan,
            p.poClose,
            p.ppn,
            p.nilaiPpn,
            p.nilaiPo,
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
          onSelectRow={(p, q) => {
            setSelectedId(p.id);
            setSearchTerm(q);
            showFeedback(`Purchase Order [${p.noBukti} - ${p.namaSupplier}] dipilih`);
          }}
          columns={[
            { header: 'Kode / No.Bukti', accessor: (p) => p.noBukti, widthClass: 'w-28', mono: true, bold: true },
            { header: 'No.PR', accessor: (p) => p.noPr || '-', widthClass: 'w-28', mono: true },
            { header: 'Tanggal', accessor: (p) => p.tanggal, widthClass: 'w-22' },
            { header: 'Nama Supplier', accessor: (p) => p.namaSupplier, bold: true },
            { header: 'Delivery To', accessor: (p) => p.deliveryTo || '-', widthClass: 'w-28' },
            { header: 'PPN', accessor: (p) => p.ppn, widthClass: 'w-14', align: 'center' },
            { header: 'Nominal PPN', accessor: (p) => p.nilaiPpn, widthClass: 'w-24', align: 'right', mono: true },
            { header: 'Nilai PO', accessor: (p) => p.nilaiPo, widthClass: 'w-24', align: 'right', mono: true, bold: true },
          ]}
        />

        <A4PrintPreviewModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title={printMode === 'detail' ? 'PURCHASE ORDER DETAIL' : 'LAPORAN LIST PURCHASE ORDER'}
          subtitle={
            printMode === 'detail'
              ? `No. Bukti: ${selectedPo?.noBukti || '-'} | No. PR: ${selectedPo?.noPr || '-'} | Mata Uang: ${
                  selectedPo?.mataUang || 'IDR'
                }`
              : `Filter Tanggal: ${tanggalFilter}`
          }
          metaLines={
            printMode === 'detail' && selectedPo
              ? [
                  { label: 'No. Bukti', value: selectedPo.noBukti },
                  { label: 'No. PR', value: selectedPo.noPr || '-' },
                  { label: 'Tanggal', value: selectedPo.tanggal },
                  { label: 'Nama Supplier', value: selectedPo.namaSupplier },
                  { label: 'Delivery To', value: selectedPo.deliveryTo || '-' },
                  { label: 'Delivery', value: selectedPo.delivery || '-' },
                  { label: 'Mata Uang', value: selectedPo.mataUang },
                  { label: 'Tgl. Kirim', value: selectedPo.tglKirim },
                  { label: 'Status PO', value: selectedPo.poClose },
                  { label: 'PPN (%)', value: selectedPo.ppn },
                  {
                    label: 'Nominal PPN',
                    value: `-${selectedPo.mataUang} ${selectedPo.nilaiPpn}`,
                  },
                  { label: 'Nilai PO (Net)', value: `${selectedPo.mataUang} ${selectedPo.nilaiPo}` },
                  { label: 'Keterangan', value: selectedPo.keterangan || '-' },
                  { label: 'Dibuat Oleh', value: selectedPo.dibuatOleh },
                  { label: 'Tgl. Created', value: selectedPo.tglCreated || '-' },
                  { label: 'DiUpdate Oleh', value: selectedPo.diupdateOleh },
                  { label: 'Tgl. Updated', value: selectedPo.tglUpdate },
                ]
              : []
          }
          orientation="landscape"
          columns={
            printMode === 'detail'
              ? selectedPoDetails.length > 0
                ? (detailPrintColumns as PrintColumn<any>[])
                : (listPrintColumns as PrintColumn<any>[])
              : (listPrintColumns as PrintColumn<any>[])
          }
          rows={
            printMode === 'detail'
              ? selectedPoDetails.length > 0
                ? selectedPoDetails
                : selectedPo
                ? [selectedPo]
                : []
              : filteredPoList
          }
          summaryItems={
            printMode === 'detail'
              ? [
                  { label: 'Total Item', value: `${selectedPoDetails.length} Item` },
                  {
                    label: 'Total QTY',
                    value: formatMoney(selectedPoDetails.reduce((acc, d) => acc + d.qty, 0)),
                  },
                  {
                    label: `Total P.O. Detail (${selectedPo?.mataUang || 'IDR'})`,
                    value: `${selectedPo?.mataUang || 'IDR'} ${formatMoney(selectedDetailTotal)}`,
                  },
                  {
                    label: `Potongan PPN (${selectedPo?.ppn || '0%'})`,
                    value: `-${selectedPo?.mataUang || 'IDR'} ${formatMoney(selectedPo?.nilaiPpnNum || 0)}`,
                  },
                  {
                    label: `Nilai PO (Setelah PPN)`,
                    value: `${selectedPo?.mataUang || 'IDR'} ${formatMoney(selectedPo?.nilaiPoNum || 0)}`,
                  },
                ]
              : [
                  { label: 'Total Record', value: `${filteredPoList.length} Dokumen` },
                  { label: 'Total Nominal PPN', value: formatRupiah(totalNilaiPpn) },
                  { label: 'Total Nilai PO', value: formatRupiah(totalNilaiPo) },
                ]
          }
          selectedRow={printMode === 'list' ? selectedPo : undefined}
          selectedTitle={printMode === 'list' ? 'PURCHASE ORDER (RECORD TERPILIH)' : undefined}
          selectedSubtitle={
            printMode === 'list' && selectedPo
              ? `No. Bukti: ${selectedPo.noBukti} | Supplier: ${selectedPo.namaSupplier}`
              : undefined
          }
          selectedMetaLines={
            printMode === 'list' && selectedPo
              ? [
                  { label: 'No. Bukti', value: selectedPo.noBukti },
                  { label: 'No. PR', value: selectedPo.noPr || '-' },
                  { label: 'Tanggal', value: selectedPo.tanggal },
                  { label: 'Supplier', value: selectedPo.namaSupplier },
                  { label: 'PPN (%)', value: selectedPo.ppn },
                  { label: 'Nilai PO', value: `${selectedPo.mataUang} ${selectedPo.nilaiPo}` },
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
                P.O. Terpilih (Detail)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('list')}
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                  printMode === 'list' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                List Purchase Order
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
};
