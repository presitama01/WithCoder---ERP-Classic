import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { ConfirmDialog } from './ConfirmDialog';
import {
  addDaysToIsoDate,
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

export interface FakturDpItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaCustomer: string;
  noSo: string;
  poNo: string;
  noSj: string;
  noFakturPajak: string;
  sales: string;
  jthTmp: string;
  keterangan: string;
  ppn: string;
  ppnNum: number;
  dpp: number;
  nilaiPpn: number;
  nilaiPenjualan: string;
  nilaiPenjualanNum: number;
  dpUsedOnFaktur: string;
  lokasiStock: string;
  stsLunas: string;
  tglLunas: string;
  stsPrint: string;
  tglPrint: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diUpdateOleh: string;
  tglUpdate: string;
}

interface SalesOrderRef {
  noBukti: string;
  namaCustomer: string;
  poNo: string;
  sales: string;
  lokasiStock: string;
  ppn: number;
  nilaiSo: number;
  keterangan: string;
}

interface CustomerMeta {
  namaCustomer: string;
  sales: string;
  ppn: boolean;
  tmpPembayaran: number;
}

interface ListFakturDpFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function calcDpTotals(dppVal: number, ppnPct: number) {
  const safeDpp = Math.max(0, Math.round(dppVal));
  const safePpn = Math.max(0, Number(ppnPct || 0));
  const nilaiPpn = Math.round((safeDpp * safePpn) / 100);
  const total = safeDpp + nilaiPpn;
  return { dpp: safeDpp, nilaiPpn, total };
}

function mapDbToFakturDp(r: any): FakturDpItem {
  const nilaiNum = Number(r.nilai_penjualan || 0);
  const ppnNum = Number(r.ppn ?? 11);
  const nilaiPpn =
    r.nilai_ppn !== undefined && r.nilai_ppn !== null
      ? Number(r.nilai_ppn || 0)
      : ppnNum > 0
      ? Math.round(nilaiNum - nilaiNum / (1 + ppnNum / 100))
      : 0;
  const dpp =
    r.dpp !== undefined && r.dpp !== null && Number(r.dpp) > 0
      ? Number(r.dpp)
      : Math.max(0, nilaiNum - nilaiPpn);

  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaCustomer: r.nama_customer || '',
    noSo: r.no_so || '',
    poNo: r.po_no || '',
    noSj: r.no_sj || '',
    noFakturPajak: r.no_faktur_pajak || '',
    sales: r.sales || '',
    jthTmp: toDisplayDMyShort(r.jth_tmp),
    keterangan: r.keterangan || '',
    ppn: `${ppnNum}%`,
    ppnNum,
    dpp,
    nilaiPpn,
    nilaiPenjualan: formatMoney(nilaiNum, true),
    nilaiPenjualanNum: nilaiNum,
    dpUsedOnFaktur: r.dp_used_on_faktur || '',
    lokasiStock: r.lokasi_stock || '01 - OFFICE',
    stsLunas: r.sts_lunas || 'Not Yet',
    tglLunas: toDisplayDMyShort(r.tgl_lunas) || '',
    stsPrint: r.sts_print || 'Not Yet',
    tglPrint: toDisplayDMyShort(r.tgl_print) || '',
    stsPost: r.sts_post || 'Not Yet',
    tglPost: toDisplayDMyShort(r.tgl_post) || '',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diUpdateOleh: r.diupdate_oleh || '',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '',
  };
}

export const ListFakturDpForm: React.FC<ListFakturDpFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [fakturDpList, setFakturDpList] = useState<FakturDpItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [tanggalFilter, setTanggalFilter] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [yellowNote, setYellowNote] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Master & reference data
  const [defaultCompanyPpn, setDefaultCompanyPpn] = useState<number>(11);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [customerMetaMap, setCustomerMetaMap] = useState<Record<string, CustomerMeta>>({});
  const [salesOptions, setSalesOptions] = useState<string[]>([]);
  const [soOptions, setSoOptions] = useState<SalesOrderRef[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);

  // Modal fields
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newNoSo, setNewNoSo] = useState<string>('');
  const [newPoNo, setNewPoNo] = useState<string>('');
  const [newNoSj, setNewNoSj] = useState<string>('');
  const [newNoFakturPajak, setNewNoFakturPajak] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('');
  const [newJthTmp, setNewJthTmp] = useState<string>('');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newPpn, setNewPpn] = useState<string>('11');
  const [newDpp, setNewDpp] = useState<string>('0');
  const [newDpPct, setNewDpPct] = useState<string>('');
  const [newNilaiPenjualan, setNewNilaiPenjualan] = useState<string>('0');
  const [newLokasiStock, setNewLokasiStock] = useState<string>('01 - OFFICE');
  const [newStsLunas, setNewStsLunas] = useState<string>('Not Yet');
  const [newTglLunas, setNewTglLunas] = useState<string>('');
  const [newStsPrint, setNewStsPrint] = useState<string>('Not Yet');
  const [newTglPrint, setNewTglPrint] = useState<string>('');
  const [newStsPost, setNewStsPost] = useState<string>('Posting');
  const [newTglPost, setNewTglPost] = useState<string>('');

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'no_bukti',
    'No.Bukti': 'no_bukti',
    'Nama Pelanggan': 'nama_customer',
    'No.SO': 'no_so',
    'PO.No': 'po_no',
    'No.Faktur Pajak': 'no_faktur_pajak',
    Keterangan: 'keterangan',
  };

  const loadMasterReferences = async () => {
    const [custRes, salesRes, soRes, lokRes, ppnRate] = await Promise.allSettled([
      erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true, limit: 1000 }),
      erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true, limit: 1000 }),
      erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }),
      erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true, limit: 500 }),
      fetchDefaultPpnRate(),
    ]);

    if (ppnRate.status === 'fulfilled') {
      setDefaultCompanyPpn(ppnRate.value);
    }

    if (custRes.status === 'fulfilled') {
      const meta: Record<string, CustomerMeta> = {};
      const list = Array.from(
        new Set(
          custRes.value
            .filter((c: any) => c.is_active !== false)
            .map((c: any) => {
              const nm = String(c.nama_customer || '').trim().toUpperCase();
              if (nm) {
                meta[nm] = {
                  namaCustomer: nm,
                  sales: String(c.sales || c.nama_sales || '').trim().toUpperCase(),
                  ppn: c.ppn !== false,
                  tmpPembayaran: Math.max(0, Number(c.tmp_pembayaran || 0)),
                };
              }
              return nm;
            })
            .filter(Boolean)
        )
      );
      setCustomerMetaMap(meta);
      setCustomerOptions(list);
    }

    if (salesRes.status === 'fulfilled') {
      const list = Array.from(
        new Set(
          salesRes.value
            .filter((s: any) => s.is_active !== false)
            .map((s: any) => String(s.nama_sales || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setSalesOptions(list);
    }

    if (soRes.status === 'fulfilled') {
      const mappedSo: SalesOrderRef[] = soRes.value
        .map((s: any) => ({
          noBukti: String(s.no_bukti || '').trim().toUpperCase(),
          namaCustomer: String(s.nama_customer || '').trim().toUpperCase(),
          poNo: String(s.po_no || '').trim().toUpperCase(),
          sales: String(s.sales || '').trim().toUpperCase(),
          lokasiStock: String(s.lokasi_stock || '01 - OFFICE').trim().toUpperCase(),
          ppn: Number(s.ppn ?? 11),
          nilaiSo: Number(s.nilai_so || 0),
          keterangan: String(s.keterangan || '').trim(),
        }))
        .filter((s: SalesOrderRef) => s.noBukti);
      setSoOptions(mappedSo);
    }

    if (lokRes.status === 'fulfilled') {
      const loks = Array.from(
        new Set(
          lokRes.value
            .filter((l: any) => l.is_active !== false)
            .sort((a: any, b: any) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0))
            .map((l: any) => {
              const kode = String(l.kode || '').trim().toUpperCase();
              const nama = String(l.nama_lokasi || '').trim().toUpperCase();
              return kode && nama ? `${kode} - ${nama}` : nama || kode;
            })
            .filter(Boolean)
        )
      );
      setLokasiOptions(loks);
    }
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
  }): Promise<FakturDpItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = {
        eq: { jenis_faktur: 'DP' },
        orderBy: 'tanggal',
        asc: false,
        limit: 1000,
      };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch =
            'no_bukti,nama_customer,no_so,po_no,no_sj,no_faktur_pajak,sales,keterangan';
          queryOpts.searchVal = activeTerm;
        }
      }
      const [rows] = await Promise.all([
        erpList<any>('faktur_penjualans', queryOpts),
        loadMasterReferences(),
      ]);
      const mapped = rows.map(mapDbToFakturDp);
      setFakturDpList(mapped);
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
    const selected = fakturDpList.find((r) => r.id === selectedId);
    if (!selected) {
      showFeedback('Pilih baris Faktur DP terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const ppnRate = parseNum(selected.ppn);
      const calc = calcDpTotals(selected.dpp, ppnRate);
      const finalNilai = calc.dpp > 0 ? calc.total : selected.nilaiPenjualanNum;
      const res = await erpCompositeSave<{ header: any; detailWarning?: string }>(
        'faktur-penjualan',
        {
          id: selected.id,
          jenis_faktur: 'DP',
          no_bukti: selected.noBukti,
          tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
          nama_customer: selected.namaCustomer,
          no_so: selected.noSo,
          po_no: selected.poNo,
          no_sj: selected.noSj,
          no_faktur_pajak: selected.noFakturPajak,
          sales: selected.sales,
          jth_tmp: toIsoDate(selected.jthTmp) || selected.tanggalIso || todayIso(),
          keterangan: selected.keterangan,
          ppn: ppnRate,
          subtotal: calc.dpp,
          disc_pct: 0,
          nilai_disc: 0,
          dpp: calc.dpp,
          nilai_ppn: calc.nilaiPpn,
          nilai_penjualan: finalNilai,
          lokasi_stock: selected.lokasiStock || '01 - OFFICE',
          sts_lunas: selected.stsLunas || 'Not Yet',
          tgl_lunas: toIsoDate(selected.tglLunas) || null,
          sts_print: selected.stsPrint || 'Not Yet',
          tgl_print: toIsoDate(selected.tglPrint) || null,
          sts_post: selected.stsPost || 'Not Yet',
          tgl_post: toIsoDate(selected.tglPost) || null,
          diupdate_oleh: (getCurrentUser().username || 'ADMIN').toUpperCase(),
          tgl_update: todayIso(),
        },
        []
      );
      const mapped = mapDbToFakturDp(res.header);
      setFakturDpList((prev) => prev.map((r) => (r.id === selected.id ? mapped : r)));
      showFeedback(
        res.detailWarning
          ? `Faktur DP [${mapped.noBukti}] tersimpan (${res.detailWarning})`
          : `Data Faktur DP [${mapped.noBukti}] tersimpan`
      );
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  const selectedSoRef = useMemo(
    () => soOptions.find((s) => s.noBukti === newNoSo.trim().toUpperCase()) || null,
    [soOptions, newNoSo]
  );

  const modalBreakdown = useMemo(() => {
    const ppnRate = parseNum(newPpn);
    return calcDpTotals(parseNum(newDpp), ppnRate);
  }, [newDpp, newPpn]);

  if (!isOpen) return null;

  const applySalesOrderSelection = (rawNoSo: string) => {
    const cleanNoSo = rawNoSo.trim().toUpperCase();
    setNewNoSo(cleanNoSo);
    if (!cleanNoSo) return;
    const matched = soOptions.find((s) => s.noBukti === cleanNoSo);
    if (!matched) return;
    setNewCustomer(matched.namaCustomer);
    setNewPoNo(matched.poNo);
    if (matched.sales) setNewSales(matched.sales);
    if (matched.lokasiStock) setNewLokasiStock(matched.lokasiStock);
    setNewPpn(String(matched.ppn ?? defaultCompanyPpn));
    const custMeta = customerMetaMap[matched.namaCustomer];
    if (custMeta) {
      const baseIso = toIsoDate(newTanggal) || todayIso();
      setNewJthTmp(toDisplayDMyShort(addDaysToIsoDate(baseIso, custMeta.tmpPembayaran)));
    }
    if (!newKeterangan.trim()) {
      setNewKeterangan(`DP Sales Order ${cleanNoSo}`);
    }
    if (newDpPct.trim() && matched.nilaiSo > 0) {
      applyDpPercentFromSo(parseNum(newDpPct), matched, matched.ppn ?? parseNum(newPpn));
    }
  };

  const applyCustomerSelection = (rawCust: string) => {
    const cleanCust = rawCust.trim().toUpperCase();
    setNewCustomer(cleanCust);
    const meta = customerMetaMap[cleanCust];
    if (meta) {
      if (meta.sales) setNewSales(meta.sales);
      const nextPpn = meta.ppn ? defaultCompanyPpn : 0;
      setNewPpn(String(nextPpn));
      const baseIso = toIsoDate(newTanggal) || todayIso();
      setNewJthTmp(toDisplayDMyShort(addDaysToIsoDate(baseIso, meta.tmpPembayaran)));
      const calc = calcDpTotals(parseNum(newDpp), nextPpn);
      setNewNilaiPenjualan(String(calc.total));
    }
  };

  const applyDpPercentFromSo = (
    pct: number,
    soOverride?: SalesOrderRef | null,
    ppnOverride?: number
  ) => {
    const so = soOverride ?? selectedSoRef;
    const pctStr = pct > 0 ? String(pct) : '';
    setNewDpPct(pctStr);
    if (!so || so.nilaiSo <= 0 || pct <= 0) return;
    const ppnRate = ppnOverride ?? parseNum(newPpn);
    const targetTotalDp = Math.round((so.nilaiSo * pct) / 100);
    const dppFromTotal =
      ppnRate > 0 ? Math.round(targetTotalDp / (1 + ppnRate / 100)) : targetTotalDp;
    setNewDpp(String(dppFromTotal));
    setNewNilaiPenjualan(String(calcDpTotals(dppFromTotal, ppnRate).total));
  };

  const handleDppChange = (rawDpp: string) => {
    setNewDpp(rawDpp);
    setNewDpPct('');
    const calc = calcDpTotals(parseNum(rawDpp), parseNum(newPpn));
    setNewNilaiPenjualan(String(calc.total));
  };

  const handlePpnChange = (rawPpn: string) => {
    setNewPpn(rawPpn);
    const calc = calcDpTotals(parseNum(newDpp), parseNum(rawPpn));
    setNewNilaiPenjualan(String(calc.total));
  };

  const handleTotalManualChange = (rawTotal: string) => {
    setNewNilaiPenjualan(rawTotal);
    setNewDpPct('');
    const tot = Math.max(0, parseNum(rawTotal));
    const ppnRate = parseNum(newPpn);
    const derivedDpp = ppnRate > 0 ? Math.round(tot / (1 + ppnRate / 100)) : tot;
    setNewDpp(String(derivedDpp));
  };

  const handleBaru = async () => {
    setEditingId(null);
    setModalError(null);
    const todayDisp = toDisplayDMyShort(todayIso());
    setNewNoBukti(nextUniqueCode(fakturDpList.map((f) => f.noBukti), 'INV-DP-', 4));
    setNewTanggal(todayDisp);
    setNewCustomer('');
    setNewNoSo('');
    setNewPoNo('');
    setNewNoSj('');
    setNewNoFakturPajak('');
    setNewSales(salesOptions[0] || '');
    setNewJthTmp(todayDisp);
    setNewKeterangan('');
    setNewPpn(String(defaultCompanyPpn));
    setNewDpp('0');
    setNewDpPct('');
    setNewNilaiPenjualan('0');
    setNewLokasiStock(lokasiOptions[0] || '01 - OFFICE');
    setNewStsLunas('Not Yet');
    setNewTglLunas('');
    setNewStsPrint('Not Yet');
    setNewTglPrint('');
    setNewStsPost('Posting');
    setNewTglPost(todayDisp);
    setIsAddOpen(true);
    const [ppnRate] = await Promise.all([fetchDefaultPpnRate(), loadMasterReferences()]);
    setDefaultCompanyPpn(ppnRate);
    setNewPpn(String(ppnRate));
  };

  const handleKoreksi = () => {
    const item = fakturDpList.find((f) => f.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal);
    setNewCustomer(item.namaCustomer);
    setNewNoSo(item.noSo);
    setNewPoNo(item.poNo);
    setNewNoSj(item.noSj);
    setNewNoFakturPajak(item.noFakturPajak);
    setNewSales(item.sales);
    setNewJthTmp(item.jthTmp);
    setNewKeterangan(item.keterangan);
    setNewPpn(String(item.ppnNum));
    setNewDpp(String(item.dpp));
    setNewDpPct('');
    setNewNilaiPenjualan(String(item.nilaiPenjualanNum));
    setNewLokasiStock(item.lokasiStock || '01 - OFFICE');
    setNewStsLunas(item.stsLunas || 'Not Yet');
    setNewTglLunas(item.tglLunas || '');
    setNewStsPrint(item.stsPrint || 'Not Yet');
    setNewTglPrint(item.tglPrint || '');
    setNewStsPost(item.stsPost || 'Not Yet');
    setNewTglPost(item.tglPost || '');
    setIsAddOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoBukti.trim() || !newCustomer.trim()) {
      setModalError('No.Bukti dan Nama Customer wajib diisi.');
      return;
    }
    const finalTotal = parseNum(newNilaiPenjualan);
    if (finalTotal <= 0) {
      setModalError('Nilai Faktur DP harus lebih besar dari 0.');
      return;
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const ppnRate = parseNum(newPpn);
      const dppVal = parseNum(newDpp);
      const calc = calcDpTotals(dppVal, ppnRate);

      const headerPayload: Record<string, any> = {
        jenis_faktur: 'DP',
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: toIsoDate(newTanggal) || todayIso(),
        nama_customer: newCustomer.trim().toUpperCase(),
        no_so: newNoSo.trim().toUpperCase(),
        po_no: newPoNo.trim().toUpperCase(),
        no_sj: newNoSj.trim().toUpperCase(),
        no_faktur_pajak: newNoFakturPajak.trim(),
        sales: newSales.trim().toUpperCase(),
        jth_tmp: toIsoDate(newJthTmp) || toIsoDate(newTanggal) || todayIso(),
        keterangan: newKeterangan.trim(),
        ppn: ppnRate,
        subtotal: calc.dpp,
        disc_pct: 0,
        nilai_disc: 0,
        dpp: calc.dpp,
        nilai_ppn: calc.nilaiPpn,
        nilai_penjualan: finalTotal,
        lokasi_stock: newLokasiStock.trim() || '01 - OFFICE',
        sts_lunas: newStsLunas || 'Not Yet',
        tgl_lunas: toIsoDate(newTglLunas) || null,
        sts_print: newStsPrint || 'Not Yet',
        tgl_print: toIsoDate(newTglPrint) || null,
        sts_post: newStsPost || 'Not Yet',
        tgl_post: toIsoDate(newTglPost) || null,
      };

      if (editingId) {
        headerPayload.id = editingId;
        headerPayload.diupdate_oleh = currentUser;
        headerPayload.tgl_update = todayIso();
      } else {
        headerPayload.dibuat_oleh = currentUser;
        headerPayload.tgl_created = todayIso();
      }

      const res = await erpCompositeSave<{ header: any; detailWarning?: string }>(
        'faktur-penjualan',
        headerPayload,
        []
      );
      const mapped = mapDbToFakturDp(res.header);
      if (editingId) {
        setFakturDpList((prev) => prev.map((item) => (item.id === editingId ? mapped : item)));
        showFeedback(
          res.detailWarning
            ? `Faktur DP diperbarui (${res.detailWarning})`
            : 'Faktur DP diperbarui & Deposit SO disinkronkan'
        );
      } else {
        setFakturDpList((prev) => [mapped, ...prev]);
        setSelectedId(mapped.id);
        showFeedback(
          res.detailWarning
            ? `Faktur DP ditambahkan (${res.detailWarning})`
            : 'Faktur DP tersimpan & Deposit SO disinkronkan'
        );
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Faktur DP';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRequestHapus = () => {
    const selected = fakturDpList.find((r) => r.id === selectedId);
    if (!selected) {
      showFeedback('Pilih baris yang akan dihapus');
      return;
    }
    if (selected.stsLunas.toUpperCase() === 'LUNAS') {
      showFeedback(`Faktur DP [${selected.noBukti}] sudah LUNAS dan tidak boleh dihapus.`);
      return;
    }
    if (selected.dpUsedOnFaktur.trim()) {
      showFeedback(
        `Faktur DP [${selected.noBukti}] sudah dipotong di Faktur [${selected.dpUsedOnFaktur}] dan tidak boleh dihapus.`
      );
      return;
    }
    setConfirmDeleteOpen(true);
  };

  const handleConfirmHapus = async () => {
    const selected = fakturDpList.find((r) => r.id === selectedId);
    if (!selected) {
      setConfirmDeleteOpen(false);
      return;
    }
    try {
      setIsBusy(true);
      await erpDelete('faktur_penjualans', selected.id);
      const updated = fakturDpList.filter((item) => item.id !== selected.id);
      setFakturDpList(updated);
      setSelectedId(updated[0]?.id || '');
      setConfirmDeleteOpen(false);
      showFeedback(`Faktur DP [${selected.noBukti}] dihapus`);
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const uniqueTanggalOptions = Array.from(
    new Set(fakturDpList.map((item) => item.tanggal).filter(Boolean))
  );

  const filteredList = fakturDpList.filter((item) => {
    const matchesTanggal =
      !tanggalFilter.trim() ||
      item.tanggal.toLowerCase() === tanggalFilter.trim().toLowerCase();

    if (!matchesTanggal) return false;
    if (!searchTerm.trim()) return true;

    if (searchField === 'Kode' || searchField === 'No.Bukti') {
      return matchesMultiKeyword([item.noBukti], searchTerm);
    }
    if (searchField === 'Nama Pelanggan') return matchesMultiKeyword([item.namaCustomer], searchTerm);
    if (searchField === 'No.SO') return matchesMultiKeyword([item.noSo], searchTerm);
    if (searchField === 'PO.No') return matchesMultiKeyword([item.poNo], searchTerm);
    if (searchField === 'No.Faktur Pajak') return matchesMultiKeyword([item.noFakturPajak], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
    return matchesMultiKeyword(
      [
        item.noBukti,
        item.tanggal,
        item.namaCustomer,
        item.noSo,
        item.poNo,
        item.noSj,
        item.noFakturPajak,
        item.sales,
        item.dpUsedOnFaktur,
        item.keterangan,
      ],
      searchTerm
    );
  });

  const selectedFakturDp =
    filteredList.find((r) => r.id === selectedId) ||
    fakturDpList.find((r) => r.id === selectedId) ||
    null;

  const totalNilai = filteredList.reduce((acc, f) => acc + f.nilaiPenjualanNum, 0);

  const handleToolbarCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows && rows.length > 0) {
      setSelectedId(rows[0].id);
      showFeedback(
        searchTerm.trim()
          ? `Ditemukan ${rows.length} Faktur DP di Supabase`
          : `Menampilkan ${rows.length} Faktur DP dari Supabase`
      );
    } else if (rows) {
      showFeedback('Data Faktur DP tidak ditemukan di Supabase');
    }
  };

  const handleToolbarReset = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setTanggalFilter('');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Faktur DP)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Faktur_DP',
      sheetTitle: 'LIST FAKTUR DP',
      subtitle: `Filter Tanggal: ${tanggalFilter || 'Semua'}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'No.SO', accessor: 'noSo' },
        { header: 'PO.No', accessor: 'poNo' },
        { header: 'Sales', accessor: 'sales', align: 'center' },
        { header: 'Jth.Tmp', accessor: 'jthTmp', align: 'center' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'DPP', accessor: 'dpp', align: 'right' },
        { header: 'Nilai PPN', accessor: 'nilaiPpn', align: 'right' },
        { header: 'Nilai Penjualan', accessor: 'nilaiPenjualanNum', align: 'right' },
        { header: 'Dipakai Faktur', accessor: 'dpUsedOnFaktur' },
        { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const customerChoices = Array.from(
    new Set([...customerOptions, newCustomer.trim().toUpperCase()].filter(Boolean))
  );
  const salesChoices = Array.from(
    new Set([...salesOptions, newSales.trim().toUpperCase()].filter(Boolean))
  );
  const soChoices = Array.from(
    new Set([...soOptions.map((s) => s.noBukti), newNoSo.trim().toUpperCase()].filter(Boolean))
  );
  const lokasiChoices = Array.from(
    new Set(['01 - OFFICE', ...lokasiOptions, newLokasiStock.trim().toUpperCase()].filter(Boolean))
  );

  return (
    <div
      id="list-faktur-dp-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Faktur DP"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={() => loadData({ field: searchField, term: searchTerm })}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto">
          <div className="flex items-center space-x-3">
            <FormActionButtons
              onSimpan={handleToolbarSimpan}
              onBaru={handleBaru}
              onKoreksi={handleKoreksi}
              onHapus={handleRequestHapus}
              onPrint={() => setIsPrintOpen(true)}
              onFind={handleFind}
              isBusy={isBusy}
              feedback={feedback}
            />

            <div className="flex items-center space-x-1.5 pl-2">
              <span className="font-bold text-black text-[11px]">Tanggal :</span>
              <select
                value={tanggalFilter}
                onChange={(e) => setTanggalFilter(e.target.value)}
                className="w-[94px] h-[22px] px-1 bg-white border border-[#7A7A7A] text-[11px] outline-none cursor-pointer"
              >
                <option value=""></option>
                {uniqueTanggalOptions.map((tgl) => (
                  <option key={tgl} value={tgl}>
                    {tgl}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setTanggalFilter('')}
                className="px-3 h-[22px] bg-[#EAE6D9] hover:bg-[#F4F1E8] border border-[#7A7A7A] shadow-2xs text-[11px] text-black cursor-pointer"
              >
                Semua
              </button>
            </div>
          </div>

          <div className="font-bold text-[15px] text-black pr-6">{formatRupiah(totalNilai)}</div>
        </div>

        <div className="flex-1 overflow-auto bg-[#F0F0F0] border border-[#808080] m-1.5 relative shadow-inner">
          <table className="border-collapse text-left whitespace-nowrap min-w-[2050px] text-[11px]">
            <thead className="sticky top-0 bg-[#ECE9D8] text-black font-normal z-10">
              <tr className="bg-[#ECE9D8] border-b border-[#ACA899]">
                <th
                  colSpan={24}
                  className="px-2 py-0.5 text-center font-normal text-[11px] border-r border-[#ACA899]"
                >
                  List Faktur Uang Muka (DP) Penjualan
                </th>
              </tr>
              <tr className="bg-[#ECE9D8] border-b border-[#ACA899]">
                <th className="w-[22px] px-1 py-0.5 border-r border-[#ACA899] text-center font-normal" />
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">No.Bukti</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tanggal</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Nama Customer</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">No.SO</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">PO.No</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Dipakai di Faktur</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">No.Faktur Pajak</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Sales</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Jth.Tmp</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Keterangan</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal text-center">PPN</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal text-right">Nilai DP</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Sts.Lunas</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tgl.Lunas</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Sts.Print</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tgl.Print</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Sts.Post</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tgl.Post</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Dibuat Oleh</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tgl.Created</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">DiUpdate Oleh</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tgl.Update</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Lokasi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={24} className="text-center py-8 text-gray-500 italic bg-white">
                    Tidak ada data Faktur DP
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handleKoreksi}
                      className={`cursor-pointer border-b border-[#00B800] text-black ${
                        isSelected ? 'bg-[#00FF00] font-semibold' : 'bg-[#00E800] hover:bg-[#33FF33]'
                      }`}
                    >
                      <td className="px-1 py-0.5 border-r border-[#ACA899] bg-[#ECE9D8] text-center text-[10px] font-bold text-black">
                        {isSelected ? '▸' : ''}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#00B800] font-mono">{item.noBukti}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tanggal}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.namaCustomer}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800] font-mono">{item.noSo}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800] font-mono">{item.poNo}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800] font-mono">
                        {item.dpUsedOnFaktur || <span className="text-blue-900">Tersedia</span>}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.noFakturPajak}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.sales}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.jthTmp}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.keterangan}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800] text-right">{item.ppn}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800] text-right font-mono">{item.nilaiPenjualan}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.stsLunas}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tglLunas}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.stsPrint}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tglPrint}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.stsPost}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tglPost}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.dibuatOleh}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tglCreated}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.diUpdateOleh}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tglUpdate}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.lokasiStock}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-4 py-2 border-t border-[#C0C0C0] gap-3 overflow-x-auto">
          <ToolbarSearchControl
            compact
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onCari={handleToolbarCari}
            onReset={handleToolbarReset}
            inputRef={searchInputRef}
            isBusy={isBusy}
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode (No.Bukti)' },
              { value: 'No.Bukti', label: 'No.Bukti' },
              { value: 'Nama Pelanggan', label: 'Nama Pelanggan' },
              { value: 'No.SO', label: 'No.SO' },
              { value: 'PO.No', label: 'PO.No' },
              { value: 'No.Faktur Pajak', label: 'No.Faktur Pajak' },
              { value: 'Keterangan', label: 'Keterangan' },
            ]}
          />

          <div className="flex items-center space-x-6 shrink-0">
            <input
              type="text"
              value={yellowNote || fakturDpList.find((r) => r.id === selectedId)?.namaCustomer || ''}
              onChange={(e) => setYellowNote(e.target.value)}
              className="w-[260px] h-[22px] px-1.5 bg-[#FFFF99] border border-[#7A7A7A] text-[11px] outline-none"
            />
            <div className="text-[11px] text-black flex items-center space-x-4 pr-4">
              <span>Record</span>
              <span className="font-semibold">{filteredList.length}</span>
            </div>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-[#ECE9D8] border-2 border-[#0A246A] shadow-2xl w-[580px] max-w-[96vw] max-h-[92vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs shrink-0">
                <span>{editingId ? 'Koreksi Faktur DP' : 'Tambah Faktur DP Baru'}</span>
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
              <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-2 text-xs overflow-y-auto">
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">No.Bukti:</label>
                  <input
                    type="text"
                    value={newNoBukti}
                    onChange={(e) => setNewNoBukti(e.target.value)}
                    required
                    className="w-80 px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">Tanggal:</label>
                  <div className="w-80">
                    <DatePickerInput
                      value={newTanggal}
                      onChange={(formatted) => setNewTanggal(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-[#000084] shrink-0">No.SO (Auto-Fill):</label>
                  <select
                    value={newNoSo}
                    onChange={(e) => applySalesOrderSelection(e.target.value)}
                    className="w-80 px-2 py-1 bg-[#FFFF99] border border-[#000084] uppercase font-mono font-semibold cursor-pointer"
                  >
                    <option value="">-- Pilih Sales Order (Opsional) --</option>
                    {soChoices.map((soNo) => {
                      const info = soOptions.find((s) => s.noBukti === soNo);
                      return (
                        <option key={soNo} value={soNo}>
                          {info ? `${soNo} - ${info.namaCustomer} (${formatRupiah(info.nilaiSo)})` : soNo}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">Nama Customer:</label>
                  <select
                    value={newCustomer}
                    onChange={(e) => applyCustomerSelection(e.target.value)}
                    required
                    className="w-80 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Customer Aktif --</option>
                    {customerChoices.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">PO.No / No.SJ:</label>
                  <div className="w-80 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newPoNo}
                      onChange={(e) => setNewPoNo(e.target.value)}
                      placeholder="PO Customer"
                      className="px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                    />
                    <input
                      type="text"
                      value={newNoSj}
                      onChange={(e) => setNewNoSj(e.target.value)}
                      placeholder="No. SJ (opsional)"
                      className="px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">No.Faktur Pajak:</label>
                  <input
                    type="text"
                    value={newNoFakturPajak}
                    onChange={(e) => setNewNoFakturPajak(e.target.value)}
                    className="w-80 px-2 py-1 bg-white border border-[#7A7A7A] font-mono"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">Sales / PPN (%):</label>
                  <div className="w-80 flex gap-2">
                    <select
                      value={newSales}
                      onChange={(e) => setNewSales(e.target.value)}
                      className="w-2/3 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih Sales --</option>
                      {salesChoices.map((sl) => (
                        <option key={sl} value={sl}>
                          {sl}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={newPpn}
                      onChange={(e) => handlePpnChange(e.target.value)}
                      className="w-1/3 px-2 py-1 bg-white border border-[#7A7A7A] text-center font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">Jth.Tmp / Lokasi:</label>
                  <div className="w-80 grid grid-cols-2 gap-2">
                    <DatePickerInput
                      value={newJthTmp}
                      onChange={(formatted) => setNewJthTmp(formatted)}
                      format="dMyShort"
                    />
                    <select
                      value={newLokasiStock}
                      onChange={(e) => setNewLokasiStock(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    >
                      {lokasiChoices.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedSoRef && selectedSoRef.nilaiSo > 0 && (
                  <div className="bg-[#EEF4FF] border border-[#9BB6E8] px-2.5 py-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#003C74]">
                        Hitung DP dari Nilai SO ({formatRupiah(selectedSoRef.nilaiSo)}):
                      </span>
                      <div className="flex items-center gap-1">
                        {[20, 30, 50].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => applyDpPercentFromSo(pct)}
                            className={`px-2 py-0.5 border text-[10px] font-bold cursor-pointer ${
                              newDpPct === String(pct)
                                ? 'bg-[#0055EA] text-white border-[#003C74]'
                                : 'bg-white text-black border-[#7A7A7A] hover:bg-[#E8EFFB]'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="% DP"
                          value={newDpPct}
                          onChange={(e) => applyDpPercentFromSo(parseNum(e.target.value))}
                          className="w-14 px-1 py-0.5 bg-white border border-[#7A7A7A] text-center font-mono text-[10px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">DPP DP (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    value={newDpp}
                    onChange={(e) => handleDppChange(e.target.value)}
                    className="w-80 px-2 py-1 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">Total Faktur DP (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    value={newNilaiPenjualan}
                    onChange={(e) => handleTotalManualChange(e.target.value)}
                    className="w-80 px-2 py-1 bg-[#FFFF99] border border-[#7A7A7A] text-right font-mono font-bold"
                  />
                </div>
                <div className="flex justify-end text-[10.5px] text-gray-700 font-mono">
                  DPP: {formatRupiah(modalBreakdown.dpp)} + PPN ({parseNum(newPpn)}%):{' '}
                  {formatRupiah(modalBreakdown.nilaiPpn)} = Total:{' '}
                  <b className="ml-1 text-black">{formatRupiah(parseNum(newNilaiPenjualan))}</b>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">Keterangan:</label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    className="w-80 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">Sts / Tgl Lunas:</label>
                  <div className="w-80 grid grid-cols-2 gap-2">
                    <select
                      value={newStsLunas}
                      onChange={(e) => setNewStsLunas(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#7A7A7A]"
                    >
                      <option value="Not Yet">Not Yet</option>
                      <option value="Lunas">Lunas</option>
                    </select>
                    <DatePickerInput
                      value={newTglLunas}
                      onChange={(formatted) => setNewTglLunas(formatted)}
                      format="dMyShort"
                      placeholder="Tgl Lunas"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">Sts / Tgl Print:</label>
                  <div className="w-80 grid grid-cols-2 gap-2">
                    <select
                      value={newStsPrint}
                      onChange={(e) => setNewStsPrint(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#7A7A7A]"
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
                <div className="flex items-center justify-between gap-3">
                  <label className="font-semibold text-black shrink-0">Sts / Tgl Post:</label>
                  <div className="w-80 grid grid-cols-2 gap-2">
                    <select
                      value={newStsPost}
                      onChange={(e) => setNewStsPost(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#7A7A7A]"
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

        <ConfirmDialog
          isOpen={confirmDeleteOpen}
          title="Konfirmasi Hapus Faktur DP"
          message={`Yakin ingin menghapus Faktur DP ${selectedFakturDp?.noBukti || ''}?`}
          detail={
            selectedFakturDp
              ? `Customer: ${selectedFakturDp.namaCustomer}\nNo. SO: ${selectedFakturDp.noSo || '-'}\nNilai DP: ${formatRupiah(selectedFakturDp.nilaiPenjualanNum)}`
              : undefined
          }
          confirmLabel="Ya, Hapus"
          cancelLabel="Batal"
          isBusy={isBusy}
          danger
          onConfirm={handleConfirmHapus}
          onCancel={() => setConfirmDeleteOpen(false)}
        />

        <SupabaseFindModal
          isOpen={isFindOpen}
          onClose={() => setIsFindOpen(false)}
          tableLabel="Faktur DP"
          rows={fakturDpList}
          selectedId={selectedId}
          getRowId={(r) => r.id}
          getSearchValues={(r) => [
            r.noBukti,
            r.tanggal,
            r.namaCustomer,
            r.noSo,
            r.poNo,
            r.noSj,
            r.noFakturPajak,
            r.sales,
            r.keterangan,
          ]}
          initialQuery={searchTerm}
          isBusy={isBusy}
          placeholder="Cari Kode (No.Bukti), Customer, No.SO, PO.No, Keterangan..."
          onSearchSupabase={(q) => {
            setSearchField('Semua');
            setSearchTerm(q);
            return loadData({ field: 'Semua', term: q });
          }}
          onRefreshSupabase={() => {
            setSearchField('Semua');
            setSearchTerm('');
            return loadData({ field: 'Semua', term: '' });
          }}
          onSelectRow={(f, q) => {
            setSelectedId(f.id);
            setSearchTerm(q);
            showFeedback(`Faktur DP [${f.noBukti} - ${f.namaCustomer}] dipilih`);
          }}
          columns={[
            { header: 'Kode / No.Bukti', accessor: (f) => f.noBukti, widthClass: 'w-28', mono: true, bold: true },
            { header: 'Tanggal', accessor: (f) => f.tanggal, widthClass: 'w-22' },
            { header: 'Nama Customer', accessor: (f) => f.namaCustomer, bold: true },
            { header: 'No.SO', accessor: (f) => f.noSo || '-', widthClass: 'w-28', mono: true },
            { header: 'Dipakai Faktur', accessor: (f) => f.dpUsedOnFaktur || 'Tersedia', widthClass: 'w-28', mono: true },
            { header: 'Keterangan', accessor: (f) => f.keterangan || '-' },
            { header: 'Nilai DP', accessor: (f) => f.nilaiPenjualan, widthClass: 'w-28', align: 'right', mono: true },
          ]}
        />

        <A4PrintPreviewModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title="LAPORAN LIST FAKTUR UANG MUKA (DP)"
          subtitle={`Filter Tanggal: ${tanggalFilter || 'Semua'}`}
          orientation="landscape"
          columns={[
            { header: 'No.Bukti', accessor: 'noBukti', width: '105px' },
            { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '80px' },
            { header: 'Nama Customer', accessor: 'namaCustomer' },
            { header: 'No.SO', accessor: 'noSo', width: '100px' },
            { header: 'Dipakai Faktur', accessor: (r) => r.dpUsedOnFaktur || 'Tersedia', width: '100px' },
            { header: 'Keterangan', accessor: 'keterangan' },
            { header: 'Nilai DP', accessor: 'nilaiPenjualan', align: 'right', width: '105px' },
            { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center', width: '70px' },
          ]}
          rows={filteredList}
          summaryItems={[
            { label: 'Total Faktur DP', value: `${filteredList.length} Dokumen` },
            { label: 'Total Nilai DP', value: formatRupiah(totalNilai) },
          ]}
          selectedRow={selectedFakturDp}
          selectedTitle="FAKTUR UANG MUKA (DP) PENJUALAN"
          selectedSubtitle={
            selectedFakturDp
              ? `No.Bukti: ${selectedFakturDp.noBukti} | Customer: ${selectedFakturDp.namaCustomer}`
              : undefined
          }
          selectedMetaLines={
            selectedFakturDp
              ? [
                  { label: 'No.Bukti', value: selectedFakturDp.noBukti },
                  { label: 'Tanggal', value: selectedFakturDp.tanggal },
                  { label: 'Customer', value: selectedFakturDp.namaCustomer },
                  { label: 'No.SO / PO.No', value: `${selectedFakturDp.noSo || '-'} / ${selectedFakturDp.poNo || '-'}` },
                  { label: 'Jth.Tmp', value: selectedFakturDp.jthTmp || '-' },
                  { label: 'Status / Pakai', value: `${selectedFakturDp.stsLunas} / ${selectedFakturDp.dpUsedOnFaktur || 'Tersedia'}` },
                ]
              : undefined
          }
          selectedSummaryItems={
            selectedFakturDp
              ? [
                  { label: 'DPP', value: formatRupiah(selectedFakturDp.dpp) },
                  { label: `PPN (${selectedFakturDp.ppn})`, value: formatRupiah(selectedFakturDp.nilaiPpn) },
                  { label: 'Total Faktur DP', value: formatRupiah(selectedFakturDp.nilaiPenjualanNum) },
                ]
              : undefined
          }
        />
      </div>
    </div>
  );
};
