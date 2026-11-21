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

export interface SalesOrderItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaCustomer: string;
  sales: string;
  poNo: string;
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
}

interface PurchaseOrderOption {
  noBukti: string;
  namaSupplier: string;
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

function calcPpnDeduction(
  grossTotal: number,
  ppnPct: number
): { nominalPpn: number; netNilaiSo: number } {
  const safeGross = Math.max(0, Number(grossTotal || 0));
  const safePct = Math.max(0, Number(ppnPct || 0));
  const nominalPpn = Number(((safeGross * safePct) / 100).toFixed(2));
  const netNilaiSo = Math.max(0, Number((safeGross - nominalPpn).toFixed(2)));
  return { nominalPpn, netNilaiSo };
}

function mapDbToSo(r: any): SalesOrderItem {
  const nilaiNum = Number(r.nilai_so || 0);
  const ppnPct = Number(r.ppn ?? 11);
  const nilaiPpnNum = Number(r.nilai_ppn || 0);
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaCustomer: r.nama_customer || '',
    sales: r.sales || '',
    poNo: r.po_no || '',
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
    soClose: r.so_close || 'Not Yet',
    lokasiStock: r.lokasi_stock || '01 - OFFICE',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [customerOptions, setCustomerOptions] = useState<MasterCustomerOption[]>([]);
  const [salesOptions, setSalesOptions] = useState<string[]>([]);
  const [poOptions, setPoOptions] = useState<PurchaseOrderOption[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);

  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('');
  const [newPoNo, setNewPoNo] = useState<string>('');
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
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadMasterReferences = async () => {
    const [custRes, salesRes, poRes, lokasiRes, barangRes] = await Promise.allSettled([
      erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true, limit: 1000 }),
      erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true, limit: 1000 }),
      erpList<any>('purchase_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }),
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

    if (poRes.status === 'fulfilled') {
      const poMap = new Map<string, PurchaseOrderOption>();
      for (const p of poRes.value) {
        const noBukti = String(p.no_bukti || '').trim().toUpperCase();
        if (!noBukti) continue;
        poMap.set(noBukti, {
          noBukti,
          namaSupplier: String(p.nama_supplier || '').trim().toUpperCase(),
        });
      }
      setPoOptions(Array.from(poMap.values()));
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

  const SEARCH_FIELD_TO_DB_COL: Record<string, string> = {
    Kode: 'no_bukti',
    'Nama Pelanggan': 'nama_customer',
    'No.Bukti': 'no_bukti',
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
      let finalNilaiPpn = Math.max(0, Number(selected.nilaiPpnNum || 0));
      let finalNilaiSo = Number(selected.nilaiSoNum || 0);

      if (existingDetails.length > 0) {
        if (finalNilaiPpn <= 0 && ppnPct > 0) {
          const calc = calcPpnDeduction(totalFromDetails, ppnPct);
          finalNilaiPpn = calc.nominalPpn;
          finalNilaiSo = calc.netNilaiSo;
        } else {
          finalNilaiSo = Math.max(0, Number((totalFromDetails - finalNilaiPpn).toFixed(2)));
        }
      }

      const headerPayload: Record<string, any> = {
        id: selected.id,
        no_bukti: selected.noBukti.trim().toUpperCase(),
        tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
        nama_customer: selected.namaCustomer.trim().toUpperCase(),
        sales: selected.sales.trim().toUpperCase(),
        po_no: selected.poNo.trim().toUpperCase(),
        nilai_so: finalNilaiSo,
        deposit: selected.deposit === '-' ? 0 : parseNum(selected.deposit),
        tgl_kirim: selected.tglKirim && selected.tglKirim !== '-' ? toIsoDate(selected.tglKirim) : null,
        persen: parseNum(selected.persen),
        keterangan: selected.keterangan.trim(),
        ppn: ppnPct,
        nilai_ppn: finalNilaiPpn,
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

      const res = await erpCompositeSave<{ header: any; details: any[] }>(
        'sales-order',
        headerPayload,
        detailPayloads
      );
      const savedHeader = mapDbToSo(res.header);
      const savedDetails = (res.details || []).map((d, idx) => mapDbToSoDetail(d, idx));
      setSoList((prev) => prev.map((item) => (item.id === selected.id ? savedHeader : item)));
      setSoDetailsMap((prev) => ({ ...prev, [savedHeader.id]: savedDetails }));
      showFeedback(`Sales Order [${savedHeader.noBukti}] berhasil disimpan`);
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

  const modalNominalPpn = useMemo(() => parseNum(newNilaiPpn), [newNilaiPpn]);

  if (!isOpen) return null;

  const updateDetailRowsWithSync = (
    updater: (prev: SalesOrderDetailItem[]) => SalesOrderDetailItem[]
  ) => {
    setDetailRows((prev) => {
      const next = updater(prev);
      const hasFilledRow = next.some((r) => r.kode.trim() || r.namaBarang.trim());
      if (hasFilledRow) {
        const sum = next.reduce((acc, r) => acc + r.total, 0);
        if (ppnManualOverride) {
          const manualPpn = parseNum(newNilaiPpn);
          setNewNilaiSo(String(Math.max(0, Number((sum - manualPpn).toFixed(2)))));
        } else {
          const { nominalPpn, netNilaiSo } = calcPpnDeduction(sum, parseNum(newPpn));
          setNewNilaiPpn(String(nominalPpn));
          setNewNilaiSo(String(netNilaiSo));
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
      const { nominalPpn, netNilaiSo } = calcPpnDeduction(modalDetailTotal, pct);
      setNewNilaiPpn(String(nominalPpn));
      setNewNilaiSo(String(netNilaiSo));
    } else {
      const currentNilaiSo = parseNum(newNilaiSo);
      const nominalPpn = Number(((Math.max(0, currentNilaiSo) * Math.max(0, pct)) / 100).toFixed(2));
      setNewNilaiPpn(String(nominalPpn));
    }
  };

  const handleManualNilaiPpnChange = (rawVal: string) => {
    setNewNilaiPpn(rawVal);
    setPpnManualOverride(true);
    if (hasFilledDetailRows) {
      const manualPpn = Math.max(0, parseNum(rawVal));
      setNewNilaiSo(String(Math.max(0, Number((modalDetailTotal - manualPpn).toFixed(2)))));
    }
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
    const foundCust = customerOptions.find((c) => c.namaCustomer === customerName);
    if (foundCust?.sales && !newSales.trim()) {
      setNewSales(foundCust.sales);
    }
  };

  const handleAddNew = async () => {
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setNewNoBukti(nextUniqueCode(soList.map((s) => s.noBukti), '2608-SO-', 3));
    setNewTanggal(todayDisp);
    setNewCustomer('');
    setNewSales('');
    setNewPoNo('');
    setNewNilaiSo('0');
    setNewDeposit('0');
    setNewTglKirim(todayDisp);
    setNewPersen('0');
    setNewKeterangan('');
    setNewPpn('11');
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
    await loadMasterReferences();
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
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal || todayDisp);
    setNewCustomer(item.namaCustomer);
    setNewSales(item.sales);
    setNewPoNo(item.poNo);
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
      const autoCalc = calcPpnDeduction(existingDetailSum, pctVal);
      if (item.nilaiPpnNum > 0) {
        const isManual = Math.abs(item.nilaiPpnNum - autoCalc.nominalPpn) > 1;
        setNewNilaiPpn(String(item.nilaiPpnNum));
        setNewNilaiSo(String(Math.max(0, Number((existingDetailSum - item.nilaiPpnNum).toFixed(2)))));
        setPpnManualOverride(isManual);
      } else {
        setNewNilaiPpn(String(autoCalc.nominalPpn));
        setNewNilaiSo(String(autoCalc.netNilaiSo));
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
    let finalNilaiPpn = Math.max(0, parseNum(newNilaiPpn));
    let finalNilaiSo = parseNum(newNilaiSo);

    if (activeDetails.length > 0) {
      if (ppnManualOverride) {
        finalNilaiSo = Math.max(0, Number((totalFromDetails - finalNilaiPpn).toFixed(2)));
      } else {
        const calc = calcPpnDeduction(totalFromDetails, ppnPct);
        finalNilaiPpn = calc.nominalPpn;
        finalNilaiSo = calc.netNilaiSo;
      }
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const baseHeader: Record<string, any> = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: toIsoDate(newTanggal) || todayIso(),
        nama_customer: newCustomer.trim().toUpperCase(),
        sales: newSales.trim().toUpperCase(),
        po_no: newPoNo.trim().toUpperCase(),
        nilai_so: finalNilaiSo,
        deposit: parseNum(newDeposit),
        tgl_kirim: toIsoDate(newTglKirim),
        persen: parseNum(newPersen),
        keterangan: newKeterangan.trim(),
        ppn: ppnPct,
        nilai_ppn: finalNilaiPpn,
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

      const res = await erpCompositeSave<{ header: any; details: any[] }>(
        'sales-order',
        baseHeader,
        detailPayloads
      );

      const savedHeader = mapDbToSo(res.header);
      const savedDetails = (res.details || []).map((d, idx) => mapDbToSoDetail(d, idx));

      if (editingId) {
        setSoList((prev) => prev.map((item) => (item.id === editingId ? savedHeader : item)));
        showFeedback('Sales Order & S.O. Detail diperbarui (PPN tersimpan)');
      } else {
        setSoList((prev) => [savedHeader, ...prev]);
        setSelectedId(savedHeader.id);
        showFeedback('Sales Order & S.O. Detail tersimpan (PPN tersimpan)');
      }

      setSoDetailsMap((prev) => ({
        ...prev,
        [savedHeader.id]: savedDetails,
      }));

      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const rawMsg = err?.message || 'Gagal menyimpan Sales Order';
      const msg =
        rawMsg.includes('nilai_ppn') && rawMsg.toLowerCase().includes('schema cache')
          ? `${rawMsg} — Jalankan SQL Query penambahan kolom "nilai_ppn" pada tabel sales_orders di Supabase SQL Editor.`
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
      await erpDelete('sales_order_details', id, 'so_id').catch(() => {});
      await erpDelete('sales_orders', id);
      const updated = soList.filter((item) => item.id !== id);
      setSoList(updated);
      setSoDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Sales Order dihapus');
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
    if (searchField === 'Nama Pelanggan') {
      return matchesMultiKeyword([item.namaCustomer], searchTerm);
    }
    if (searchField === 'Sales') {
      return matchesMultiKeyword([item.sales], searchTerm);
    }
    if (searchField === 'PO.NO') {
      return matchesMultiKeyword([item.poNo], searchTerm);
    }
    if (searchField === 'Lokasi Stock') {
      return matchesMultiKeyword([item.lokasiStock], searchTerm);
    }
    if (searchField === 'Keterangan') {
      return matchesMultiKeyword([item.keterangan], searchTerm);
    }
    if (searchField === 'SO.Close') {
      return matchesMultiKeyword([item.soClose], searchTerm);
    }
    return matchesMultiKeyword(
      [
        item.noBukti,
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
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'Sales', accessor: 'sales' },
        { header: 'PO.NO', accessor: 'poNo' },
        { header: 'Lokasi Stock', accessor: 'lokasiStock' },
        { header: 'PPN', accessor: 'ppn', align: 'center' },
        { header: 'Nominal PPN', accessor: 'nilaiPpnNum', align: 'right' },
        { header: 'Nilai SO', accessor: 'nilaiSoNum', align: 'right' },
        { header: 'Tgl.Kirim', accessor: 'tglKirim', align: 'center' },
        { header: 'SO.Close', accessor: 'soClose', align: 'center' },
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
    new Set(
      [...customerOptions.map((c) => c.namaCustomer), newCustomer.trim().toUpperCase()].filter(Boolean)
    )
  );

  const salesDropdownChoices = Array.from(
    new Set([...salesOptions, newSales.trim().toUpperCase()].filter(Boolean))
  );

  const poDropdownChoices = Array.from(
    new Set([...poOptions.map((p) => p.noBukti), newPoNo.trim().toUpperCase()].filter(Boolean))
  );

  const lokasiDropdownChoices = Array.from(
    new Set(['01 - OFFICE', ...lokasiOptions, newLokasiStock.trim().toUpperCase()].filter(Boolean))
  );

  const listPrintColumns: PrintColumn<SalesOrderItem>[] = [
    { header: 'No.Bukti', accessor: 'noBukti', width: '86px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '60px' },
    { header: 'Nama Customer', accessor: 'namaCustomer', width: '126px' },
    { header: 'Sales', accessor: 'sales', width: '68px' },
    { header: 'PO.NO', accessor: 'poNo', width: '80px' },
    { header: 'Lokasi Stock', accessor: 'lokasiStock', width: '80px' },
    { header: 'PPN', accessor: 'ppn', align: 'center', width: '44px' },
    { header: 'Nominal PPN', accessor: 'nilaiPpn', align: 'right', width: '78px' },
    { header: 'Nilai SO', accessor: 'nilaiSo', align: 'right', width: '82px' },
    { header: 'Tgl.Kirim', accessor: 'tglKirim', align: 'center', width: '60px' },
    { header: 'SO.Close', accessor: 'soClose', align: 'center', width: '50px' },
    { header: 'Dibuat Oleh', accessor: 'dibuatOleh', width: '60px' },
    { header: 'Tgl.Created', accessor: 'tglCreated', align: 'center', width: '58px' },
    { header: 'Diupdate Oleh', accessor: 'diupdateOleh', width: '60px' },
    { header: 'Tgl.Update', accessor: 'tglUpdate', align: 'center', width: '58px' },
  ];

  const detailPrintColumns: PrintColumn<SalesOrderDetailItem>[] = [
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
            onHapus={() => (selectedId ? handleDelete(selectedId) : showFeedback('Pilih data yang akan dihapus'))}
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

      {/* Upper Table: List Sales Order */}
      <div className="flex-[1.35] min-h-[160px] overflow-auto bg-white border border-[#7A7A7A] mx-2 mt-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1620px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Bukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5">PO.NO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Lokasi Stock</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Nilai SO</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Deposit</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Kirim</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center">Persen</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center">PPN</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Nominal PPN</th>
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
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-medium">{item.namaCustomer}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.sales}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.poNo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.lokasiStock}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-right font-mono font-semibold">{item.nilaiSo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-right font-mono">{item.deposit}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglKirim}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.persen}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.ppn}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-right font-mono">{item.nilaiPpn}</td>
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
                <td colSpan={19} className="text-center py-6 text-gray-500">
                  Tidak ada data sales order
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lower Panel: S.O. Detail for Selected Sales Order */}
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
              Total Detail: {formatRupiah(selectedDetailTotal)}
            </span>
            {selectedSo && (
              <>
                <span className="text-[11px] font-semibold text-[#9A3412] font-mono">
                  Potongan PPN ({selectedSo.ppn}): -{formatRupiah(selectedSo.nilaiPpnNum)}
                </span>
                <span className="text-[11px] font-bold text-[#000084] font-mono">
                  Nilai SO: {formatRupiah(selectedSo.nilaiSoNum)}
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
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-20">Terima</th>
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

      {/* Add / Koreksi Sales Order Modal */}
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
                  <label className="font-semibold shrink-0">PO.NO:</label>
                  <input
                    type="text"
                    value={newPoNo}
                    onChange={(e) => setNewPoNo(e.target.value)}
                    placeholder="Ketik No PO..."
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
                    {lokasiDropdownChoices.map((lok) => (
                      <option key={lok} value={lok}>
                        {lok}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">PPN (%) / Nominal PPN:</label>
                  <div className="w-64 flex gap-2">
                    <div className="w-20 relative">
                      <input
                        type="number"
                        step="0.01"
                        value={newPpn}
                        onChange={(e) => handlePpnPercentChange(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-[#7A7A7A] font-mono text-center"
                        placeholder="PPN %"
                        title="Persentase PPN (%) — Memotong Total S.O. Detail"
                      />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={newNilaiPpn}
                      onChange={(e) => handleManualNilaiPpnChange(e.target.value)}
                      className="flex-1 px-2 py-1 bg-[#FFFBEB] border border-[#7A7A7A] font-mono text-right font-semibold text-[#9A3412]"
                      placeholder="Nominal PPN"
                      title="Nominal Potongan PPN (Rp) tersimpan di tabel sales_orders"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">
                    Nilai SO (Rp)
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
                    value={newNilaiSo}
                    onChange={(e) => setNewNilaiSo(e.target.value)}
                    readOnly={hasFilledDetailRows}
                    className={`w-64 px-2 py-1 border border-[#7A7A7A] font-mono text-right font-bold ${
                      hasFilledDetailRows ? 'bg-[#F0F4FF] text-[#000084]' : 'bg-white'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Deposit (Rp):</label>
                  <input
                    type="number"
                    value={newDeposit}
                    onChange={(e) => setNewDeposit(e.target.value)}
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] font-mono text-right"
                    placeholder="Deposit"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Tgl. Kirim:</label>
                  <div className="w-64">
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
                      placeholder="Persen %"
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
                      (Pilih Kode Barang dari Master Barang atau isi manual)
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
                    Jumlah Item: {detailRows.filter((d) => d.kode.trim() || d.namaBarang.trim()).length}
                  </span>
                  <div className="flex flex-wrap items-center gap-4 font-mono">
                    <span className="text-[#003C74]">
                      Total S.O. Detail: {formatRupiah(modalDetailTotal)}
                    </span>
                    <span className="text-[#9A3412]">
                      Potongan PPN ({parseNum(newPpn)}%): -{formatRupiah(modalNominalPpn)}
                    </span>
                    <span className="text-[#000084] bg-[#E8EEFF] px-2 py-0.5 border border-[#8BA4E8]">
                      Nilai SO: {formatRupiah(parseNum(newNilaiSo))}
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

      {/* Find Modal: Cari & Daftar Sales Order */}
      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Sales Order"
        rows={soList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.noBukti,
          r.tanggal,
          r.namaCustomer,
          r.sales,
          r.poNo,
          r.lokasiStock,
          r.keterangan,
          r.soClose,
          r.ppn,
          r.nilaiPpn,
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
          { header: 'Nama Customer', accessor: (r) => r.namaCustomer, bold: true },
          { header: 'Sales', accessor: (r) => r.sales || '-', widthClass: 'w-24' },
          { header: 'PO.NO', accessor: (r) => r.poNo || '-', widthClass: 'w-24', mono: true },
          { header: 'Lokasi Stock', accessor: (r) => r.lokasiStock || '-', widthClass: 'w-28' },
          { header: 'PPN', accessor: (r) => r.ppn, widthClass: 'w-14', align: 'center' },
          { header: 'Nominal PPN', accessor: (r) => r.nilaiPpn, widthClass: 'w-24', align: 'right', mono: true },
          { header: 'Nilai SO', accessor: (r) => r.nilaiSo, widthClass: 'w-24', align: 'right', mono: true, bold: true },
        ]}
      />

      {/* Dual-mode Print Preview: List Sales Order & S.O. Detail */}
      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={
          printMode === 'detail' ? 'SALES ORDER (S.O. DETAIL)' : 'LAPORAN LIST SALES ORDER'
        }
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
                { label: 'Nama Customer', value: selectedSo.namaCustomer },
                { label: 'Sales', value: selectedSo.sales || '-' },
                { label: 'PO.NO', value: selectedSo.poNo || '-' },
                { label: 'Lokasi Stock', value: selectedSo.lokasiStock || '-' },
                { label: 'Tgl. Kirim', value: selectedSo.tglKirim || '-' },
                { label: 'SO. Close', value: selectedSo.soClose || '-' },
                { label: 'PPN (%)', value: selectedSo.ppn },
                { label: 'Nominal PPN', value: `-${formatRupiah(selectedSo.nilaiPpnNum)}` },
                { label: 'Nilai SO (Net)', value: formatRupiah(selectedSo.nilaiSoNum) },
                { label: 'Persen', value: selectedSo.persen },
                { label: 'Keterangan', value: selectedSo.keterangan || '-' },
                { label: 'Dibuat Oleh', value: selectedSo.dibuatOleh },
                { label: 'Tgl. Created', value: selectedSo.tglCreated || '-' },
                { label: 'Diupdate Oleh', value: selectedSo.diupdateOleh || '-' },
                { label: 'Tgl.Update', value: selectedSo.tglUpdate || '-' },
              ]
            : []
        }
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
                  label: 'Total QTY',
                  value: formatMoney(selectedSoDetails.reduce((acc, d) => acc + d.qty, 0)),
                },
                {
                  label: 'Total S.O. Detail',
                  value: formatRupiah(selectedDetailTotal),
                },
                {
                  label: `Potongan PPN (${selectedSo?.ppn || '0%'})`,
                  value: `-${formatRupiah(selectedSo?.nilaiPpnNum || 0)}`,
                },
                {
                  label: 'Nilai SO (Setelah PPN)',
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
                { label: 'Nilai SO', value: formatRupiah(selectedSo.nilaiSoNum) },
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
