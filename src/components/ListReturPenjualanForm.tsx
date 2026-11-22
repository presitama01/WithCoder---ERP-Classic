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

export interface ReturPenjualanItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaCustomer: string;
  noFaktur: string;
  subtotal: number;
  disc: string;
  discPct: number;
  nilaiDisc: number;
  dpp: number;
  ppn: string;
  ppnPct: number;
  nilaiPpn: number;
  nilaiRetur: string;
  nilaiReturNum: number;
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

export interface ReturPenjualanDetailItem {
  id: string;
  returId?: string;
  noUrut: number;
  kode: string;
  namaBarang: string;
  unit: string;
  qtyFaktur: number;
  qty: number;
  harga: number;
  jumlah: number;
  total: number;
  alasan: string;
}

interface FakturRefOption {
  id: string;
  noBukti: string;
  tanggal: string;
  namaCustomer: string;
  noSo: string;
  lokasiStock: string;
  discPct: number;
  ppn: number;
  nilaiPenjualan: number;
}

interface MasterBarangOption {
  kode: string;
  namaBarang: string;
  unit: string;
  price: number;
}

interface ListReturPenjualanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrintReport?: () => void;
}

function calcReturTotals(grossSubtotal: number, discPct: number, ppnPct: number) {
  const subtotal = Math.max(0, Number(grossSubtotal || 0));
  const safeDisc = Math.max(0, Math.min(100, Number(discPct || 0)));
  const safePpn = Math.max(0, Number(ppnPct || 0));
  const nilaiDisc = Math.round((subtotal * safeDisc) / 100);
  const dpp = Math.max(0, subtotal - nilaiDisc);
  const nilaiPpn = Math.round((dpp * safePpn) / 100);
  const grandTotal = dpp + nilaiPpn;
  return { subtotal, nilaiDisc, dpp, nilaiPpn, grandTotal };
}

function mapDbToReturJual(r: any): ReturPenjualanItem {
  const nilaiNum = Number(r.nilai_retur || 0);
  const discPct = Number(r.disc || 0);
  const ppnPct = Number(r.ppn ?? 11);
  const nilaiPpn =
    r.nilai_ppn !== undefined && r.nilai_ppn !== null
      ? Number(r.nilai_ppn || 0)
      : ppnPct > 0
      ? Math.round(nilaiNum - nilaiNum / (1 + ppnPct / 100))
      : 0;
  const dpp =
    r.dpp !== undefined && r.dpp !== null && Number(r.dpp) > 0
      ? Number(r.dpp)
      : Math.max(0, nilaiNum - nilaiPpn);
  const nilaiDisc = Number(r.nilai_disc || 0);
  const subtotal =
    r.subtotal !== undefined && r.subtotal !== null && Number(r.subtotal) > 0
      ? Number(r.subtotal)
      : dpp + nilaiDisc;

  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaCustomer: r.nama_customer || '',
    noFaktur: r.no_faktur || '',
    subtotal,
    disc: `${discPct}%`,
    discPct,
    nilaiDisc,
    dpp,
    ppn: `${ppnPct}%`,
    ppnPct,
    nilaiPpn,
    nilaiRetur: formatMoney(nilaiNum, true),
    nilaiReturNum: nilaiNum,
    keterangan: r.keterangan || '',
    lokasiStock: r.lokasi_stock || '01 - OFFICE',
    stsPrint: r.sts_print || 'Not Yet',
    tglPrint: toDisplayDMyShort(r.tgl_print) || '',
    stsPost: r.sts_post || 'Posting',
    tglPost: toDisplayDMyShort(r.tgl_post) || '',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '',
  };
}

function mapDbToReturDetail(d: any, idx = 0): ReturPenjualanDetailItem {
  const qty = Number(d.qty || 0);
  const harga = Number(d.harga || 0);
  const jumlah = d.jumlah !== undefined && d.jumlah !== null ? Number(d.jumlah) : qty * harga;
  const total = d.total !== undefined && d.total !== null ? Number(d.total) : jumlah;
  return {
    id: d.id || `rdet-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    returId: d.retur_id,
    noUrut: Number(d.no_urut ?? idx + 1),
    kode: String(d.kode || '').trim().toUpperCase(),
    namaBarang: String(d.nama_barang || '').trim(),
    unit: String(d.unit || 'PCS').trim().toUpperCase(),
    qtyFaktur: Number(d.qty_faktur || 0),
    qty,
    harga,
    jumlah,
    total,
    alasan: String(d.alasan || '').trim(),
  };
}

function createBlankReturRow(noUrut: number): ReturPenjualanDetailItem {
  return {
    id: `new-rjdet-${Date.now()}-${noUrut}-${Math.random().toString(36).slice(2, 6)}`,
    noUrut,
    kode: '',
    namaBarang: '',
    unit: 'PCS',
    qtyFaktur: 0,
    qty: 1,
    harga: 0,
    jumlah: 0,
    total: 0,
    alasan: '',
  };
}

export const ListReturPenjualanForm: React.FC<ListReturPenjualanFormProps> = ({
  isOpen,
  onClose,
  onOpenPrintReport,
}) => {
  const [returList, setReturList] = useState<ReturPenjualanItem[]>([]);
  const [returDetailsMap, setReturDetailsMap] = useState<Record<string, ReturPenjualanDetailItem[]>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<'list' | 'detail'>('list');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // References
  const [defaultCompanyPpn, setDefaultCompanyPpn] = useState<number>(11);
  const [fakturOptions, setFakturOptions] = useState<FakturRefOption[]>([]);
  const [fakturDetailsById, setFakturDetailsById] = useState<Record<string, ReturPenjualanDetailItem[]>>({});
  const [soDetailsByNoSo, setSoDetailsByNoSo] = useState<Record<string, ReturPenjualanDetailItem[]>>({});
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);

  // Modal fields
  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newNoFaktur, setNewNoFaktur] = useState<string>('');
  const [newNilaiRetur, setNewNilaiRetur] = useState<string>('0');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newDisc, setNewDisc] = useState<string>('0');
  const [newPpn, setNewPpn] = useState<string>('11');
  const [newLokasiStock, setNewLokasiStock] = useState<string>('01 - OFFICE');
  const [newStsPrint, setNewStsPrint] = useState<string>('Not Yet');
  const [newTglPrint, setNewTglPrint] = useState<string>('');
  const [newStsPost, setNewStsPost] = useState<string>('Posting');
  const [newTglPost, setNewTglPost] = useState<string>('');
  const [detailRows, setDetailRows] = useState<ReturPenjualanDetailItem[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'no_bukti',
    'No.Bukti': 'no_bukti',
    'Nama Pelanggan': 'nama_customer',
    'No.Faktur': 'no_faktur',
    Keterangan: 'keterangan',
  };

  const loadMasterReferences = async () => {
    const [faktRes, fDetRes, soDetRes, custRes, lokRes, brgRes, ppnRate] =
      await Promise.allSettled([
        erpList<any>('faktur_penjualans', { orderBy: 'tanggal', asc: false, limit: 1000 }),
        erpList<any>('faktur_penjualan_details', { orderBy: 'no_urut', asc: true, limit: 5000 }),
        erpList<any>('sales_order_details', { orderBy: 'no_urut', asc: true, limit: 5000 }),
        erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true, limit: 1000 }),
        erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true, limit: 500 }),
        erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 }),
        fetchDefaultPpnRate(),
      ]);

    if (ppnRate.status === 'fulfilled') setDefaultCompanyPpn(ppnRate.value);

    if (faktRes.status === 'fulfilled') {
      const fList: FakturRefOption[] = faktRes.value
        .filter((f: any) => String(f.jenis_faktur || 'REGULAR').toUpperCase() !== 'DP')
        .map((f: any) => ({
          id: String(f.id),
          noBukti: String(f.no_bukti || '').trim().toUpperCase(),
          tanggal: toDisplayDMyShort(f.tanggal),
          namaCustomer: String(f.nama_customer || '').trim().toUpperCase(),
          noSo: String(f.no_so || '').trim().toUpperCase(),
          lokasiStock: String(f.lokasi_stock || '01 - OFFICE').trim().toUpperCase(),
          discPct: Number(f.disc_pct || 0),
          ppn: Number(f.ppn ?? 11),
          nilaiPenjualan: Number(f.nilai_penjualan || 0),
        }))
        .filter((f: FakturRefOption) => f.noBukti);
      setFakturOptions(fList);
    }

    if (fDetRes.status === 'fulfilled') {
      const grouped: Record<string, ReturPenjualanDetailItem[]> = {};
      for (const raw of fDetRes.value) {
        const fid = String(raw.faktur_id || '');
        if (!fid) continue;
        if (!grouped[fid]) grouped[fid] = [];
        const qtyVal = Number(raw.qty || 0);
        const hargaVal = Number(raw.harga || 0);
        const totalVal = Number(raw.total || qtyVal * hargaVal);
        grouped[fid].push({
          id: `fref-${fid}-${grouped[fid].length}`,
          noUrut: grouped[fid].length + 1,
          kode: String(raw.kode || '').trim().toUpperCase(),
          namaBarang: String(raw.nama_barang || '').trim(),
          unit: String(raw.unit || 'PCS').trim().toUpperCase(),
          qtyFaktur: qtyVal,
          qty: qtyVal,
          harga: hargaVal,
          jumlah: totalVal,
          total: totalVal,
          alasan: '',
        });
      }
      setFakturDetailsById(grouped);
    }

    if (soDetRes.status === 'fulfilled') {
      const groupedSo: Record<string, ReturPenjualanDetailItem[]> = {};
      for (const raw of soDetRes.value) {
        const noSo = String(raw.no_bukti || '').trim().toUpperCase();
        if (!noSo) continue;
        if (!groupedSo[noSo]) groupedSo[noSo] = [];
        const qtyVal = Number(raw.qty || 0);
        const hargaVal = Number(raw.harga || 0);
        const totalVal = Number(raw.total || qtyVal * hargaVal);
        groupedSo[noSo].push({
          id: `soref-${noSo}-${groupedSo[noSo].length}`,
          noUrut: groupedSo[noSo].length + 1,
          kode: String(raw.kode || '').trim().toUpperCase(),
          namaBarang: String(raw.nama_barang || '').trim(),
          unit: String(raw.unit || 'PCS').trim().toUpperCase(),
          qtyFaktur: qtyVal,
          qty: qtyVal,
          harga: hargaVal,
          jumlah: totalVal,
          total: totalVal,
          alasan: '',
        });
      }
      setSoDetailsByNoSo(groupedSo);
    }

    if (custRes.status === 'fulfilled') {
      setCustomerOptions(
        Array.from(
          new Set(
            custRes.value
              .filter((c: any) => c.is_active !== false)
              .map((c: any) => String(c.nama_customer || '').trim().toUpperCase())
              .filter(Boolean)
          )
        )
      );
    }

    if (lokRes.status === 'fulfilled') {
      setLokasiOptions(
        Array.from(
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
        )
      );
    }

    if (brgRes.status === 'fulfilled') {
      setBarangOptions(
        brgRes.value
          .filter((b: any) => b.is_active !== false)
          .map((b: any) => ({
            kode: String(b.kode || '').trim().toUpperCase(),
            namaBarang: String(b.nama_barang || '').trim(),
            unit: String(b.unit || 'PCS').trim().toUpperCase(),
            price: Number(b.price || 0),
          }))
          .filter((b: MasterBarangOption) => b.kode)
      );
    }
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
  }): Promise<ReturPenjualanItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = {
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
          queryOpts.orSearch = 'no_bukti,nama_customer,no_faktur,keterangan,lokasi_stock,sts_post';
          queryOpts.searchVal = activeTerm;
        }
      }
      const [rows, details] = await Promise.all([
        erpList<any>('retur_penjualans', queryOpts),
        erpList<any>('retur_penjualan_details', { orderBy: 'no_urut', asc: true, limit: 5000 }).catch(() => []),
        loadMasterReferences(),
      ]);
      const mapped = rows.map(mapDbToReturJual);
      setReturList(mapped);

      const grouped: Record<string, ReturPenjualanDetailItem[]> = {};
      for (const raw of details) {
        const key = String(raw.retur_id || '');
        if (!key) continue;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(mapDbToReturDetail(raw, grouped[key].length));
      }
      setReturDetailsMap(grouped);

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
      showFeedback('Pilih baris Retur Penjualan terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const existingDetails = returDetailsMap[selected.id] || [];
      const gross = existingDetails.reduce((s, d) => s + d.total, 0);
      const calc =
        existingDetails.length > 0 && gross > 0
          ? calcReturTotals(gross, selected.discPct, selected.ppnPct)
          : {
              subtotal: selected.subtotal,
              nilaiDisc: selected.nilaiDisc,
              dpp: selected.dpp,
              nilaiPpn: selected.nilaiPpn,
              grandTotal: selected.nilaiReturNum,
            };

      const res = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'retur-penjualan',
        {
          id: selected.id,
          no_bukti: selected.noBukti,
          tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
          nama_customer: selected.namaCustomer,
          no_faktur: selected.noFaktur,
          lokasi_stock: selected.lokasiStock || '01 - OFFICE',
          disc: selected.discPct,
          ppn: selected.ppnPct,
          subtotal: calc.subtotal,
          nilai_disc: calc.nilaiDisc,
          dpp: calc.dpp,
          nilai_ppn: calc.nilaiPpn,
          nilai_retur: calc.grandTotal,
          keterangan: selected.keterangan,
          sts_print: selected.stsPrint || 'Not Yet',
          tgl_print: toIsoDate(selected.tglPrint) || null,
          sts_post: selected.stsPost || 'Posting',
          tgl_post: toIsoDate(selected.tglPost) || null,
          diupdate_oleh: (getCurrentUser().username || 'ADMIN').toUpperCase(),
          tgl_update: todayIso(),
        },
        existingDetails.map((d, idx) => ({
          no_urut: idx + 1,
          kode: d.kode,
          nama_barang: d.namaBarang,
          unit: d.unit || 'PCS',
          qty_faktur: d.qtyFaktur,
          qty: d.qty,
          harga: d.harga,
          jumlah: d.jumlah,
          total: d.total,
          alasan: d.alasan,
        }))
      );
      const mapped = mapDbToReturJual(res.header);
      const savedDetails =
        res.details && res.details.length > 0
          ? res.details.map((d, idx) => mapDbToReturDetail(d, idx))
          : existingDetails;
      setReturList((prev) => prev.map((r) => (r.id === selected.id ? mapped : r)));
      setReturDetailsMap((prev) => ({ ...prev, [mapped.id]: savedDetails }));
      showFeedback(
        res.detailWarning
          ? `Retur [${mapped.noBukti}] tersimpan (${res.detailWarning})`
          : `Data Retur Penjualan [${mapped.noBukti}] tersimpan & stok disinkronkan`
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

  const selectedRetur = useMemo(
    () => returList.find((r) => r.id === selectedId) || null,
    [returList, selectedId]
  );

  const selectedReturDetails = useMemo(() => {
    if (!selectedRetur) return [];
    return returDetailsMap[selectedRetur.id] || [];
  }, [selectedRetur, returDetailsMap]);

  const modalSubtotal = useMemo(
    () => detailRows.reduce((acc, d) => acc + d.total, 0),
    [detailRows]
  );

  const modalCalc = useMemo(
    () => calcReturTotals(modalSubtotal, parseNum(newDisc), parseNum(newPpn)),
    [modalSubtotal, newDisc, newPpn]
  );

  if (!isOpen) return null;

  const syncModalTotalsFromRows = (rows: ReturPenjualanDetailItem[], discStr = newDisc, ppnStr = newPpn) => {
    const hasItem = rows.some((r) => r.kode.trim() || r.namaBarang.trim());
    if (hasItem) {
      const gross = rows.reduce((acc, d) => acc + d.total, 0);
      const calc = calcReturTotals(gross, parseNum(discStr), parseNum(ppnStr));
      setNewNilaiRetur(String(calc.grandTotal));
    }
  };

  const handleFakturSelect = (rawNoFaktur: string) => {
    const clean = rawNoFaktur.trim().toUpperCase();
    setNewNoFaktur(clean);
    if (!clean) return;
    const fakt = fakturOptions.find((f) => f.noBukti === clean);
    if (!fakt) return;
    setNewCustomer(fakt.namaCustomer);
    if (fakt.lokasiStock) setNewLokasiStock(fakt.lokasiStock);
    const nextDisc = String(fakt.discPct || 0);
    const nextPpn = String(fakt.ppn ?? defaultCompanyPpn);
    setNewDisc(nextDisc);
    setNewPpn(nextPpn);

    const fItems =
      (fakturDetailsById[fakt.id] && fakturDetailsById[fakt.id].length > 0
        ? fakturDetailsById[fakt.id]
        : fakt.noSo
        ? soDetailsByNoSo[fakt.noSo] || []
        : []
      ).map((d, idx) => ({
        ...d,
        id: `rf-${Date.now()}-${idx}`,
        noUrut: idx + 1,
        qtyFaktur: d.qtyFaktur || d.qty,
        qty: d.qty,
        jumlah: d.qty * d.harga,
        total: d.qty * d.harga,
      }));

    if (fItems.length > 0) {
      setDetailRows(fItems);
      syncModalTotalsFromRows(fItems, nextDisc, nextPpn);
    } else {
      setDetailRows([createBlankReturRow(1)]);
      setNewNilaiRetur(String(fakt.nilaiPenjualan || 0));
    }
  };

  const handleDetailSelectBarang = (rowId: string, selectedKode: string) => {
    const clean = selectedKode.trim().toUpperCase();
    const found = barangOptions.find((b) => b.kode === clean);
    setDetailRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== rowId) return r;
        const harga = found ? found.price : r.harga;
        const qty = r.qty || 1;
        const total = qty * harga;
        return {
          ...r,
          kode: clean,
          namaBarang: found ? found.namaBarang : r.namaBarang,
          unit: found ? found.unit : r.unit,
          harga,
          jumlah: total,
          total,
        };
      });
      syncModalTotalsFromRows(next);
      return next;
    });
  };

  const handleDetailFieldChange = (
    rowId: string,
    field: keyof ReturPenjualanDetailItem,
    rawVal: string
  ) => {
    setDetailRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r };
        if (field === 'kode') updated.kode = rawVal.toUpperCase();
        else if (field === 'namaBarang') updated.namaBarang = rawVal;
        else if (field === 'unit') updated.unit = rawVal.toUpperCase();
        else if (field === 'alasan') updated.alasan = rawVal;
        else if (field === 'qty') {
          let nextQty = Math.max(0, parseNum(rawVal));
          if (updated.qtyFaktur > 0 && nextQty > updated.qtyFaktur) {
            nextQty = updated.qtyFaktur;
          }
          updated.qty = nextQty;
          updated.jumlah = nextQty * updated.harga;
          updated.total = updated.jumlah;
        } else if (field === 'harga') {
          updated.harga = Math.max(0, parseNum(rawVal));
          updated.jumlah = updated.qty * updated.harga;
          updated.total = updated.jumlah;
        }
        return updated;
      });
      syncModalTotalsFromRows(next);
      return next;
    });
  };

  const handleAddDetailRow = () => {
    setDetailRows((prev) => [...prev, createBlankReturRow(prev.length + 1)]);
  };

  const handleRemoveDetailRow = (rowId: string) => {
    setDetailRows((prev) => {
      const next = prev.filter((r) => r.id !== rowId).map((r, i) => ({ ...r, noUrut: i + 1 }));
      syncModalTotalsFromRows(next);
      return next;
    });
  };

  const handleAddNew = async () => {
    setEditingId(null);
    setModalError(null);
    const todayDisp = toDisplayDMyShort(todayIso());
    setNewNoBukti(nextUniqueCode(returList.map((r) => r.noBukti), '2608-RJ-INV-', 3));
    setNewTanggal(todayDisp);
    setNewCustomer('');
    setNewNoFaktur('');
    setNewNilaiRetur('0');
    setNewKeterangan('');
    setNewDisc('0');
    setNewPpn(String(defaultCompanyPpn));
    setNewLokasiStock(lokasiOptions[0] || '01 - OFFICE');
    setNewStsPrint('Not Yet');
    setNewTglPrint('');
    setNewStsPost('Posting');
    setNewTglPost(todayDisp);
    setDetailRows([createBlankReturRow(1)]);
    setIsAddOpen(true);
    const [ppnRate] = await Promise.all([fetchDefaultPpnRate(), loadMasterReferences()]);
    setDefaultCompanyPpn(ppnRate);
    setNewPpn(String(ppnRate));
  };

  const handleEdit = () => {
    const item = returList.find((r) => r.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal);
    setNewCustomer(item.namaCustomer);
    setNewNoFaktur(item.noFaktur);
    setNewNilaiRetur(String(item.nilaiReturNum));
    setNewKeterangan(item.keterangan);
    setNewDisc(String(item.discPct));
    setNewPpn(String(item.ppnPct));
    setNewLokasiStock(item.lokasiStock || '01 - OFFICE');
    setNewStsPrint(item.stsPrint || 'Not Yet');
    setNewTglPrint(item.tglPrint || '');
    setNewStsPost(item.stsPost || 'Posting');
    setNewTglPost(item.tglPost || '');
    const existingDets = returDetailsMap[item.id] || [];
    setDetailRows(
      existingDets.length > 0
        ? existingDets.map((d, idx) => ({ ...d, noUrut: idx + 1 }))
        : [createBlankReturRow(1)]
    );
    setIsAddOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoBukti.trim() || !newCustomer.trim()) {
      setModalError('No. Bukti dan Nama Customer wajib diisi.');
      return;
    }

    const activeDetails = detailRows.filter((d) => d.kode.trim() !== '' || d.namaBarang.trim() !== '');
    for (const d of activeDetails) {
      if (d.qty <= 0) {
        setModalError(`Qty retur untuk [${d.kode || d.namaBarang}] harus lebih dari 0.`);
        return;
      }
      if (d.qtyFaktur > 0 && d.qty > d.qtyFaktur) {
        setModalError(
          `Qty retur [${d.kode}] (${d.qty}) melebihi Qty Faktur (${d.qtyFaktur}).`
        );
        return;
      }
    }

    const gross = activeDetails.reduce((acc, d) => acc + d.total, 0);
    const discPct = parseNum(newDisc);
    const ppnPct = parseNum(newPpn);
    const calc =
      activeDetails.length > 0 && gross > 0
        ? calcReturTotals(gross, discPct, ppnPct)
        : {
            subtotal: parseNum(newNilaiRetur),
            nilaiDisc: 0,
            dpp: parseNum(newNilaiRetur),
            nilaiPpn: 0,
            grandTotal: parseNum(newNilaiRetur),
          };

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const headerPayload: Record<string, any> = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: toIsoDate(newTanggal) || todayIso(),
        nama_customer: newCustomer.trim().toUpperCase(),
        no_faktur: newNoFaktur.trim().toUpperCase(),
        lokasi_stock: newLokasiStock.trim() || '01 - OFFICE',
        disc: discPct,
        ppn: ppnPct,
        subtotal: calc.subtotal,
        nilai_disc: calc.nilaiDisc,
        dpp: calc.dpp,
        nilai_ppn: calc.nilaiPpn,
        nilai_retur: activeDetails.length > 0 ? calc.grandTotal : parseNum(newNilaiRetur),
        keterangan: newKeterangan.trim(),
        sts_print: newStsPrint || 'Not Yet',
        tgl_print: toIsoDate(newTglPrint) || null,
        sts_post: newStsPost || 'Posting',
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

      const detailPayloads = activeDetails.map((d, idx) => ({
        no_urut: idx + 1,
        kode: d.kode.trim().toUpperCase(),
        nama_barang: d.namaBarang.trim(),
        unit: d.unit.trim().toUpperCase() || 'PCS',
        qty_faktur: Number(d.qtyFaktur || 0),
        qty: Number(d.qty || 0),
        harga: Number(d.harga || 0),
        jumlah: Number(d.jumlah || 0),
        total: Number(d.total || 0),
        alasan: d.alasan.trim(),
      }));

      const res = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'retur-penjualan',
        headerPayload,
        detailPayloads
      );
      const mapped = mapDbToReturJual(res.header);
      const savedDetails =
        res.details && res.details.length > 0
          ? res.details.map((d, idx) => mapDbToReturDetail(d, idx))
          : activeDetails.map((d, idx) => ({ ...d, returId: mapped.id, noUrut: idx + 1 }));

      if (editingId) {
        setReturList((prev) => prev.map((item) => (item.id === editingId ? mapped : item)));
        showFeedback(
          res.detailWarning
            ? `Retur diperbarui (${res.detailWarning})`
            : 'Retur Penjualan diperbarui & stok gudang disinkronkan'
        );
      } else {
        setReturList((prev) => [mapped, ...prev]);
        setSelectedId(mapped.id);
        showFeedback(
          res.detailWarning
            ? `Retur tersimpan (${res.detailWarning})`
            : 'Retur Penjualan tersimpan & stok gudang bertambah otomatis'
        );
      }
      setReturDetailsMap((prev) => ({ ...prev, [mapped.id]: savedDetails }));
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Retur Penjualan';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRetur) {
      setConfirmDeleteOpen(false);
      return;
    }
    try {
      setIsBusy(true);
      await erpDelete('retur_penjualan_details', selectedRetur.id, 'retur_id').catch(() => {});
      await erpDelete('retur_penjualans', selectedRetur.id);
      const updated = returList.filter((item) => item.id !== selectedRetur.id);
      setReturList(updated);
      setReturDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[selectedRetur.id];
        return copy;
      });
      setSelectedId(updated[0]?.id || '');
      setConfirmDeleteOpen(false);
      showFeedback(`Retur Penjualan [${selectedRetur.noBukti}] dihapus`);
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = returList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (!searchTerm.trim()) return true;
    if (searchField === 'Kode' || searchField === 'No.Bukti') {
      return matchesMultiKeyword([item.noBukti], searchTerm);
    }
    if (searchField === 'Nama Pelanggan') return matchesMultiKeyword([item.namaCustomer], searchTerm);
    if (searchField === 'No.Faktur') return matchesMultiKeyword([item.noFaktur], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
    return matchesMultiKeyword(
      [
        item.noBukti,
        item.tanggal,
        item.namaCustomer,
        item.noFaktur,
        item.keterangan,
        item.lokasiStock,
        item.stsPost,
      ],
      searchTerm
    );
  });

  const totalNilai = filteredList.reduce((acc, r) => acc + r.nilaiReturNum, 0);

  const handleToolbarCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows && rows.length > 0) {
      setSelectedId(rows[0].id);
      showFeedback(
        searchTerm.trim()
          ? `Ditemukan ${rows.length} Retur Penjualan di Supabase`
          : `Menampilkan ${rows.length} Retur Penjualan dari Supabase`
      );
    } else if (rows) {
      showFeedback('Data Retur Penjualan tidak ditemukan di Supabase');
    }
  };

  const handleToolbarReset = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setTanggalFilter('Semua');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Retur Penjualan)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  const handleOpenPrint = (mode?: 'list' | 'detail') => {
    setPrintMode(mode ?? (selectedRetur && selectedReturDetails.length > 0 ? 'detail' : 'list'));
    setIsPrintOpen(true);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Retur_Penjualan',
      sheetTitle: 'LIST RETUR PENJUALAN',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'No.Faktur', accessor: 'noFaktur' },
        { header: 'DPP', accessor: 'dpp', align: 'right' },
        { header: 'Nilai PPN', accessor: 'nilaiPpn', align: 'right' },
        { header: 'Nilai Retur', accessor: 'nilaiReturNum', align: 'right' },
        { header: 'Disc', accessor: 'disc', align: 'center' },
        { header: 'PPN', accessor: 'ppn', align: 'center' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Sts.Post', accessor: 'stsPost', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const fakturChoices = Array.from(
    new Set([...fakturOptions.map((f) => f.noBukti), newNoFaktur.trim().toUpperCase()].filter(Boolean))
  );
  const customerChoices = Array.from(
    new Set([...customerOptions, newCustomer.trim().toUpperCase()].filter(Boolean))
  );
  const lokasiChoices = Array.from(
    new Set(['01 - OFFICE', ...lokasiOptions, newLokasiStock.trim().toUpperCase()].filter(Boolean))
  );

  const listPrintColumns: PrintColumn<ReturPenjualanItem>[] = [
    { header: 'No.Bukti', accessor: 'noBukti', width: '110px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '75px' },
    { header: 'Nama Customer', accessor: 'namaCustomer' },
    { header: 'No.Faktur', accessor: 'noFaktur', width: '95px' },
    { header: 'Nilai Retur', accessor: 'nilaiRetur', align: 'right', width: '95px' },
    { header: 'Disc', accessor: 'disc', align: 'center', width: '48px' },
    { header: 'PPN', accessor: 'ppn', align: 'center', width: '48px' },
    { header: 'Sts.Post', accessor: 'stsPost', align: 'center', width: '65px' },
    { header: 'Keterangan', accessor: 'keterangan' },
  ];

  const detailPrintColumns: PrintColumn<ReturPenjualanDetailItem>[] = [
    { header: 'Kode', accessor: 'kode', width: '90px' },
    { header: 'Nama Barang', accessor: 'namaBarang' },
    { header: 'Unit', accessor: 'unit', align: 'center', width: '55px' },
    { header: 'Qty Faktur', accessor: (r) => formatMoney(r.qtyFaktur), align: 'right', width: '68px' },
    { header: 'Qty Retur', accessor: (r) => formatMoney(r.qty), align: 'right', width: '68px' },
    { header: 'Harga', accessor: (r) => formatMoney(r.harga), align: 'right', width: '90px' },
    { header: 'Total', accessor: (r) => formatMoney(r.total), align: 'right', width: '95px' },
    { header: 'Alasan', accessor: 'alasan', width: '120px' },
  ];

  return (
    <div
      id="list-retur-penjualan-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="List Retur Penjualan"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => handleOpenPrint()}
        onTableView={() => loadData({ field: searchField, term: searchTerm })}
        onExportExcel={handleExportExcel}
      />

      <div className="shrink-0 bg-[#ECE9D8] border-b border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs shadow-sm overflow-x-auto">
        <div className="flex items-center space-x-2">
          <FormActionButtons
            onSimpan={handleToolbarSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={() =>
              selectedRetur ? setConfirmDeleteOpen(true) : showFeedback('Pilih data yang akan dihapus')
            }
            onPrint={() => handleOpenPrint()}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />
          {onOpenPrintReport && (
            <button
              type="button"
              onClick={onOpenPrintReport}
              className="h-[28px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] active:bg-[#DCD8C8] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1 text-[11px] font-sans text-black cursor-pointer whitespace-nowrap"
              title="Buka Form Retur Penjualan Berdasarkan Faktur"
            >
              <span className="text-blue-700">🖶</span>
              <span>Retur Berdasarkan Faktur</span>
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
          <div className="font-bold text-sm text-right px-3 py-0.5 bg-white border border-[#919191] min-w-[110px] shadow-inner">
            {formatRupiah(totalNilai)}
          </div>
        </div>
      </div>

      {/* Upper Table: List Header Retur Penjualan */}
      <div className="flex-[1.3] min-h-[160px] overflow-auto bg-white border border-[#7A7A7A] mx-2 mt-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1520px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Bukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Faktur</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Nilai Retur</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center">Disc</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center">PPN</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Lokasi</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Post</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Post</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Dibuat Oleh</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Created</th>
              <th className="border-r border-[#919191] px-3 py-1.5">DiUpdate Oleh</th>
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
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noFaktur || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-right font-semibold">{item.nilaiRetur}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.disc}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.ppn}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.lokasiStock}</td>
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
                  Tidak ada data retur penjualan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lower Panel: Detail Barang Retur Penjualan */}
      <div className="flex-1 min-h-[145px] flex flex-col mx-2 mt-1.5 mb-1 border border-[#7A7A7A] bg-white shadow-inner overflow-hidden">
        <div className="shrink-0 bg-[#E6E3D5] border-b border-[#ACA899] px-2.5 py-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-[#003C74] whitespace-nowrap">
              Detail Barang Retur Penjualan
            </span>
            {selectedRetur ? (
              <span className="text-[11px] text-gray-800 truncate">
                No. Bukti: <b className="font-mono">{selectedRetur.noBukti}</b> | Faktur Ref:{' '}
                <b className="font-mono text-[#000084]">{selectedRetur.noFaktur || '-'}</b> | Customer:{' '}
                <b>{selectedRetur.namaCustomer}</b>
              </span>
            ) : (
              <span className="text-[11px] text-gray-500 italic">
                Pilih Retur Penjualan di atas untuk melihat rincian barang diretur
              </span>
            )}
          </div>
          {selectedRetur && (
            <button
              type="button"
              onClick={() => handleOpenPrint('detail')}
              className="px-2.5 py-0.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded-xs text-[11px] font-semibold cursor-pointer shrink-0"
            >
              Print Retur Detail
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-left min-w-[880px] text-[11px]">
            <thead className="sticky top-0 bg-[#F4F4F4] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10">
              <tr>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-center w-10">No</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] w-28">Kode</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0]">Nama Barang</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-center w-16">Unit</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-20">Qty Faktur</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-20">Qty Retur</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-28">Harga</th>
                <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-28">Total</th>
                <th className="px-2 py-1 w-40">Alasan Retur</th>
              </tr>
            </thead>
            <tbody>
              {selectedReturDetails.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                    Belum ada detail barang retur untuk transaksi ini.
                  </td>
                </tr>
              ) : (
                selectedReturDetails.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={`border-b border-[#E5E5E5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                  >
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-center">{idx + 1}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] font-mono font-semibold">{d.kode}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5]">{d.namaBarang}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-center">{d.unit}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono">{formatMoney(d.qtyFaktur)}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono font-bold text-[#000084]">{formatMoney(d.qty)}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono">{formatMoney(d.harga)}</td>
                    <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono font-semibold">{formatMoney(d.total)}</td>
                    <td className="px-2 py-1 text-gray-700">{d.alasan || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="shrink-0 bg-[#ECE9D8] border-t border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs">
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
            { value: 'No.Faktur', label: 'No.Faktur' },
            { value: 'Keterangan', label: 'Keterangan' },
          ]}
        />
        <div className="flex items-center space-x-4">
          <div className="w-64 h-5 bg-[#FFFF00] border border-[#919191] shadow-inner px-2 text-[10px] flex items-center text-black truncate">
            {selectedRetur ? `${selectedRetur.noBukti} - ${selectedRetur.namaCustomer}` : ''}
          </div>
          <div className="font-semibold px-2 py-0.5 bg-[#ECE9D8] border border-[#919191]">
            Record {filteredList.length}
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[940px] max-w-[97vw] max-h-[94vh] flex flex-col overflow-hidden">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs shrink-0">
              <span>{editingId ? 'Koreksi Retur Penjualan' : 'Tambah Retur Penjualan Baru'}</span>
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
                  <label className="font-semibold shrink-0 text-[#000084]">
                    No. Faktur Ref (Auto-Fill):
                  </label>
                  <select
                    value={newNoFaktur}
                    onChange={(e) => handleFakturSelect(e.target.value)}
                    className="w-64 px-2 py-1 bg-[#FFFF99] border border-[#000084] uppercase font-mono font-semibold cursor-pointer"
                  >
                    <option value="">-- Pilih No. Faktur Penjualan --</option>
                    {fakturChoices.map((noF) => {
                      const info = fakturOptions.find((f) => f.noBukti === noF);
                      return (
                        <option key={noF} value={noF}>
                          {info ? `${noF} - ${info.namaCustomer}` : noF}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Nama Customer:</label>
                  <select
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    required
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Customer --</option>
                    {customerChoices.map((c) => (
                      <option key={c} value={c}>
                        {c}
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
                    {lokasiChoices.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Disc (%) / PPN (%):</label>
                  <div className="w-64 flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newDisc}
                      onChange={(e) => {
                        setNewDisc(e.target.value);
                        syncModalTotalsFromRows(detailRows, e.target.value, newPpn);
                      }}
                      className="w-1/2 px-2 py-1 bg-white border border-[#7A7A7A] text-center font-mono"
                    />
                    <input
                      type="number"
                      min="0"
                      value={newPpn}
                      onChange={(e) => {
                        setNewPpn(e.target.value);
                        syncModalTotalsFromRows(detailRows, newDisc, e.target.value);
                      }}
                      className="w-1/2 px-2 py-1 bg-white border border-[#7A7A7A] text-center font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Nilai Retur (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    value={newNilaiRetur}
                    onChange={(e) => setNewNilaiRetur(e.target.value)}
                    className="w-64 px-2 py-1 bg-[#FFFF99] border border-[#7A7A7A] font-mono text-right font-bold"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Keterangan:</label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Sts / Tgl Print:</label>
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
                  <label className="font-semibold shrink-0">Sts / Tgl Post:</label>
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
              </div>

              {/* Detail Grid */}
              <div className="border border-[#999999] bg-white rounded-xs overflow-hidden">
                <div className="bg-[#E6E3D5] border-b border-[#C0C0C0] px-2.5 py-1.5 flex items-center justify-between">
                  <span className="font-bold text-xs text-[#003C74]">
                    Detail Barang Retur {newNoFaktur ? `(Faktur: ${newNoFaktur})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddDetailRow}
                    className="px-2.5 py-0.5 bg-[#000084] hover:bg-[#0000A8] text-white border border-black rounded-xs text-[11px] font-semibold cursor-pointer"
                  >
                    + Tambah Baris
                  </button>
                </div>
                <div className="max-h-[210px] overflow-auto">
                  <table className="w-full border-collapse text-left min-w-[860px]">
                    <thead className="sticky top-0 bg-[#F0F0F0] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10 text-[11px]">
                      <tr>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-center w-8">No</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] w-36">Kode</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0]">Nama Barang</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-center w-16">Unit</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-18">Qty Faktur</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-18">Qty Retur</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-24">Harga</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-24">Total</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] w-32">Alasan</th>
                        <th className="px-1.5 py-1 text-center w-10">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-4 text-gray-500 italic text-[11px]">
                            Belum ada item retur. Pilih No. Faktur atau klik "+ Tambah Baris".
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
                                  onChange={(e) => handleDetailFieldChange(d.id, 'namaBarang', e.target.value)}
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
                              <td className="px-1.5 py-1 border-r border-[#E5E5E5] text-right font-mono bg-[#FAFAFA]">
                                {formatMoney(d.qtyFaktur)}
                              </td>
                              <td className="p-0.5 border-r border-[#E5E5E5]">
                                <input
                                  type="number"
                                  min="0"
                                  max={d.qtyFaktur > 0 ? d.qtyFaktur : undefined}
                                  value={d.qty}
                                  onChange={(e) => handleDetailFieldChange(d.id, 'qty', e.target.value)}
                                  className="w-full px-1 py-0.5 bg-[#FFFF99] border border-[#C0C0C0] rounded-xs text-right font-mono text-[11px] font-bold"
                                />
                              </td>
                              <td className="p-0.5 border-r border-[#E5E5E5]">
                                <input
                                  type="number"
                                  min="0"
                                  value={d.harga}
                                  onChange={(e) => handleDetailFieldChange(d.id, 'harga', e.target.value)}
                                  className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-right font-mono text-[11px]"
                                />
                              </td>
                              <td className="px-1.5 py-1 border-r border-[#E5E5E5] text-right font-mono font-semibold bg-[#FAFAFA]">
                                {formatMoney(d.total)}
                              </td>
                              <td className="p-0.5 border-r border-[#E5E5E5]">
                                <input
                                  type="text"
                                  value={d.alasan}
                                  onChange={(e) => handleDetailFieldChange(d.id, 'alasan', e.target.value)}
                                  placeholder="Rusak / Salah kirim"
                                  className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-[11px]"
                                />
                              </td>
                              <td className="p-0.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDetailRow(d.id)}
                                  className="px-1.5 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xs font-bold text-[10px] cursor-pointer"
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
                <div className="bg-[#F5F4EE] border-t border-[#C0C0C0] px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                  <span>
                    Subtotal: <b>{formatRupiah(modalCalc.subtotal)}</b> | Disc ({parseNum(newDisc)}%):{' '}
                    <b>{formatRupiah(modalCalc.nilaiDisc)}</b> | DPP: <b>{formatRupiah(modalCalc.dpp)}</b> | PPN ({parseNum(newPpn)}%):{' '}
                    <b>{formatRupiah(modalCalc.nilaiPpn)}</b>
                  </span>
                  <span className="font-bold text-[#000084]">
                    Net Nilai Retur: {formatRupiah(modalCalc.grandTotal || parseNum(newNilaiRetur))}
                  </span>
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

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Konfirmasi Hapus Retur Penjualan"
        message={`Yakin ingin menghapus Retur Penjualan ${selectedRetur?.noBukti || ''}?`}
        detail={
          selectedRetur
            ? `Customer: ${selectedRetur.namaCustomer}\nNo. Faktur Ref: ${selectedRetur.noFaktur || '-'}\nNilai Retur: ${formatRupiah(selectedRetur.nilaiReturNum)}`
            : undefined
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isBusy={isBusy}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Retur Penjualan"
        rows={returList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.noBukti,
          r.tanggal,
          r.namaCustomer,
          r.noFaktur,
          r.keterangan,
          r.lokasiStock,
          r.stsPost,
        ]}
        initialQuery={searchTerm}
        isBusy={isBusy}
        placeholder="Cari Kode (No.Bukti), Customer, No.Faktur, Keterangan..."
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
        onSelectRow={(r, q) => {
          setSelectedId(r.id);
          setSearchTerm(q);
          showFeedback(`Retur Penjualan [${r.noBukti} - ${r.namaCustomer}] dipilih`);
        }}
        columns={[
          { header: 'Kode / No.Bukti', accessor: (r) => r.noBukti, widthClass: 'w-28', mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal, widthClass: 'w-22' },
          { header: 'Nama Customer', accessor: (r) => r.namaCustomer, bold: true },
          { header: 'No.Faktur Ref', accessor: (r) => r.noFaktur || '-', widthClass: 'w-28', mono: true },
          { header: 'Keterangan', accessor: (r) => r.keterangan || '-' },
          { header: 'Nilai Retur', accessor: (r) => r.nilaiRetur, widthClass: 'w-28', align: 'right', mono: true },
          { header: 'Status', accessor: (r) => r.stsPost, widthClass: 'w-20', align: 'center' },
        ]}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={
          printMode === 'detail' ? 'NOTA RETUR PENJUALAN' : 'LAPORAN LIST RETUR PENJUALAN'
        }
        subtitle={
          printMode === 'detail'
            ? `No. Bukti: ${selectedRetur?.noBukti || '-'} | Customer: ${selectedRetur?.namaCustomer || '-'}`
            : `Filter Tanggal: ${tanggalFilter}`
        }
        metaLines={
          printMode === 'detail' && selectedRetur
            ? [
                { label: 'No. Bukti', value: selectedRetur.noBukti },
                { label: 'Tanggal', value: selectedRetur.tanggal },
                { label: 'Nama Customer', value: selectedRetur.namaCustomer },
                { label: 'No. Faktur Ref', value: selectedRetur.noFaktur || '-' },
                { label: 'Lokasi Stock', value: selectedRetur.lokasiStock },
                { label: 'Keterangan', value: selectedRetur.keterangan || '-' },
              ]
            : []
        }
        orientation="landscape"
        columns={
          printMode === 'detail' && selectedReturDetails.length > 0
            ? (detailPrintColumns as PrintColumn<any>[])
            : (listPrintColumns as PrintColumn<any>[])
        }
        rows={
          printMode === 'detail'
            ? selectedReturDetails.length > 0
              ? selectedReturDetails
              : selectedRetur
              ? [selectedRetur]
              : []
            : filteredList
        }
        summaryItems={
          printMode === 'detail' && selectedRetur
            ? [
                { label: 'Subtotal', value: formatRupiah(selectedRetur.subtotal) },
                { label: `Disc (${selectedRetur.disc})`, value: formatRupiah(selectedRetur.nilaiDisc) },
                { label: 'DPP', value: formatRupiah(selectedRetur.dpp) },
                { label: `PPN (${selectedRetur.ppn})`, value: formatRupiah(selectedRetur.nilaiPpn) },
                { label: 'Total Nilai Retur', value: formatRupiah(selectedRetur.nilaiReturNum) },
              ]
            : [
                { label: 'Total Retur Penjualan', value: `${filteredList.length} Dokumen` },
                { label: 'Total Nilai Retur', value: formatRupiah(totalNilai) },
              ]
        }
        toolbarExtra={
          selectedRetur ? (
            <div className="flex items-center bg-[#111827] border border-gray-600 rounded-[2px] p-0.5 text-[10.5px]">
              <button
                type="button"
                onClick={() => setPrintMode('detail')}
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                  printMode === 'detail' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Nota Retur (Detail)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('list')}
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                  printMode === 'list' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                List Retur
              </button>
            </div>
          ) : undefined
        }
      />
    </div>
  );
};
