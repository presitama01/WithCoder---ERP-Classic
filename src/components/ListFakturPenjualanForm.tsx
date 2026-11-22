import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
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

export interface FakturPenjualanItem {
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
  subtotal: number;
  discPct: number;
  nilaiDisc: number;
  dpp: number;
  ppn: string;
  ppnPct: number;
  nilaiPpn: number;
  noDp: string;
  totalDp: number;
  nilaiPenjualan: string;
  nilaiPenjualanNum: number;
  lokasiStock: string;
  stsLunas: string;
  tglLunas: string;
  stsPrint: string;
  tglPrint: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

export interface FakturDetailItem {
  id: string;
  fakturId?: string;
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

interface SalesOrderRef {
  id: string;
  noBukti: string;
  namaCustomer: string;
  sales: string;
  poNo: string;
  nilaiSo: number;
  discPct: number;
  ppn: number;
  lokasiStock: string;
  keterangan: string;
}

interface SuratJalanRef {
  id: string;
  noBukti: string;
  noSo: string;
  poNo: string;
  namaCustomer: string;
  sales: string;
  lokasiStock: string;
  noFaktur: string;
  stsPost: string;
  keterangan: string;
}

interface FakturDpRef {
  id: string;
  noBukti: string;
  namaCustomer: string;
  noSo: string;
  nilaiPenjualan: number;
  dpUsedOnFaktur: string;
}

interface BankRef {
  namaBank: string;
  accNumber: string;
  accName: string;
  cabang: string;
}

interface MasterBarangOption {
  kode: string;
  namaBarang: string;
  unit: string;
  price: number;
  cost: number;
}

interface MasterCustomerMeta {
  namaCustomer: string;
  sales: string;
  ppn: boolean;
  npwp: string;
  alamatNpwp: string;
  invAlamat: string;
  tmpPembayaran: number;
  limitKredit: number;
  piutang: number;
}

interface ListFakturPenjualanFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const TERBILANG_SATUAN = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
  'Sebelas',
];

function terbilangAngka(n: number): string {
  const num = Math.floor(Math.abs(n));
  if (num === 0) return '';
  if (num < 12) return TERBILANG_SATUAN[num];
  if (num < 20) return `${terbilangAngka(num - 10)} Belas`;
  if (num < 100) return `${terbilangAngka(Math.floor(num / 10))} Puluh ${terbilangAngka(num % 10)}`.trim();
  if (num < 200) return `Seratus ${terbilangAngka(num - 100)}`.trim();
  if (num < 1000) return `${terbilangAngka(Math.floor(num / 100))} Ratus ${terbilangAngka(num % 100)}`.trim();
  if (num < 2000) return `Seribu ${terbilangAngka(num - 1000)}`.trim();
  if (num < 1_000_000) return `${terbilangAngka(Math.floor(num / 1000))} Ribu ${terbilangAngka(num % 1000)}`.trim();
  if (num < 1_000_000_000) return `${terbilangAngka(Math.floor(num / 1_000_000))} Juta ${terbilangAngka(num % 1_000_000)}`.trim();
  if (num < 1_000_000_000_000) return `${terbilangAngka(Math.floor(num / 1_000_000_000))} Miliar ${terbilangAngka(num % 1_000_000_000)}`.trim();
  return `${terbilangAngka(Math.floor(num / 1_000_000_000_000))} Triliun ${terbilangAngka(num % 1_000_000_000_000)}`.trim();
}

function terbilangRupiah(val: number): string {
  const rounded = Math.round(Math.abs(val || 0));
  if (rounded === 0) return 'Nol Rupiah';
  return `${terbilangAngka(rounded)} Rupiah`;
}

function calcFakturTotals(
  grossSubtotal: number,
  discPct: number,
  ppnPct: number,
  dpAmount: number
) {
  const subtotal = Math.max(0, Math.round(grossSubtotal || 0));
  const safeDisc = Math.max(0, Math.min(100, Number(discPct || 0)));
  const safePpn = Math.max(0, Number(ppnPct || 0));
  const nilaiDisc = Math.round((subtotal * safeDisc) / 100);
  const dpp = Math.max(0, subtotal - nilaiDisc);
  const nilaiPpn = Math.round((dpp * safePpn) / 100);
  const totalDp = Math.max(0, Math.round(dpAmount || 0));
  const grandTotal = Math.max(0, dpp + nilaiPpn - totalDp);
  return { subtotal, nilaiDisc, dpp, nilaiPpn, totalDp, grandTotal };
}

function mapDbToFaktur(r: any): FakturPenjualanItem {
  const nilaiNum = Number(r.nilai_penjualan || 0);
  const ppnPct = Number(r.ppn ?? 11);
  const discPct = Number(r.disc_pct || 0);
  const totalDp = Number(r.total_dp || 0);
  const nilaiPpn =
    r.nilai_ppn !== undefined && r.nilai_ppn !== null
      ? Number(r.nilai_ppn || 0)
      : ppnPct > 0
      ? Math.round((nilaiNum + totalDp) - (nilaiNum + totalDp) / (1 + ppnPct / 100))
      : 0;
  const dpp =
    r.dpp !== undefined && r.dpp !== null && Number(r.dpp) > 0
      ? Number(r.dpp)
      : Math.max(0, nilaiNum + totalDp - nilaiPpn);
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
    noSo: r.no_so || '',
    poNo: r.po_no || '',
    noSj: r.no_sj || '',
    noFakturPajak: r.no_faktur_pajak || '',
    sales: r.sales || '',
    jthTmp: toDisplayDMyShort(r.jth_tmp),
    keterangan: r.keterangan || '',
    subtotal,
    discPct,
    nilaiDisc,
    dpp,
    ppn: `${ppnPct}%`,
    ppnPct,
    nilaiPpn,
    noDp: r.no_dp || '',
    totalDp,
    nilaiPenjualan: formatMoney(nilaiNum, true),
    nilaiPenjualanNum: nilaiNum,
    lokasiStock: r.lokasi_stock || '01 - OFFICE',
    stsLunas: r.sts_lunas || 'Not Yet',
    tglLunas: toDisplayDMyShort(r.tgl_lunas) || '',
    stsPrint: r.sts_print || 'Not Yet',
    tglPrint: toDisplayDMyShort(r.tgl_print) || '',
    stsPost: r.sts_post || 'Not Yet',
    tglPost: toDisplayDMyShort(r.tgl_post) || '',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

function mapDbToDetail(d: any, idx = 0): FakturDetailItem {
  const qty = Number(d.qty || 0);
  const harga = Number(d.harga || 0);
  const jumlah = d.jumlah !== undefined && d.jumlah !== null ? Number(d.jumlah) : qty * harga;
  const total = d.total !== undefined && d.total !== null ? Number(d.total) : jumlah;
  return {
    id: d.id || `fdet-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    fakturId: d.faktur_id,
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

function createBlankDetailRow(noUrut: number): FakturDetailItem {
  return {
    id: `new-fdet-${Date.now()}-${noUrut}-${Math.random().toString(36).slice(2, 6)}`,
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

export const ListFakturPenjualanForm: React.FC<ListFakturPenjualanFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [fakturList, setFakturList] = useState<FakturPenjualanItem[]>([]);
  const [fakturDetailsMap, setFakturDetailsMap] = useState<Record<string, FakturDetailItem[]>>({});
  const [soDetailsByNoSoMap, setSoDetailsByNoSoMap] = useState<Record<string, FakturDetailItem[]>>({});
  const [sjDetailsByIdMap, setSjDetailsByIdMap] = useState<Record<string, FakturDetailItem[]>>({});
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

  // Reference catalogs from Supabase
  const [soOptions, setSoOptions] = useState<SalesOrderRef[]>([]);
  const [sjOptions, setSjOptions] = useState<SuratJalanRef[]>([]);
  const [dpOptions, setDpOptions] = useState<FakturDpRef[]>([]);
  const [bankOptions, setBankOptions] = useState<BankRef[]>([]);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [customerMetaMap, setCustomerMetaMap] = useState<Record<string, MasterCustomerMeta>>({});
  const [salesOptions, setSalesOptions] = useState<string[]>([]);
  const [salesLimitMap, setSalesLimitMap] = useState<Record<string, number>>({});
  const [defaultCompanyPpn, setDefaultCompanyPpn] = useState<number>(11);
  const [overrideCreditLimit, setOverrideCreditLimit] = useState<boolean>(false);
  const [showCreditOverrideBox, setShowCreditOverrideBox] = useState<boolean>(false);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);
  const [barangPriceMap, setBarangPriceMap] = useState<Record<string, number>>({});

  // Modal fields
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
  const [newDiscPct, setNewDiscPct] = useState<string>('0');
  const [newPpn, setNewPpn] = useState<string>('11');
  const [newNoDp, setNewNoDp] = useState<string>('');
  const [newTotalDp, setNewTotalDp] = useState<string>('0');
  const [newNilaiPenjualan, setNewNilaiPenjualan] = useState<string>('0');
  const [newLokasiStock, setNewLokasiStock] = useState<string>('01 - OFFICE');
  const [newStsLunas, setNewStsLunas] = useState<string>('Not Yet');
  const [newTglLunas, setNewTglLunas] = useState<string>('');
  const [newStsPrint, setNewStsPrint] = useState<string>('Not Yet');
  const [newTglPrint, setNewTglPrint] = useState<string>('');
  const [newStsPost, setNewStsPost] = useState<string>('Posting');
  const [newTglPost, setNewTglPost] = useState<string>('');
  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');
  const [detailRows, setDetailRows] = useState<FakturDetailItem[]>([]);

  const [confirmDeleteRow, setConfirmDeleteRow] = useState<FakturPenjualanItem | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadMasterReferences = async () => {
    const [soRes, soDetRes, sjRes, sjDetRes, custRes, salesRes, lokasiRes, barangRes, bankRes] =
      await Promise.allSettled([
        erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }),
        erpList<any>('sales_order_details', { orderBy: 'no_urut', asc: true, limit: 5000 }),
        erpList<any>('surat_jalans', { orderBy: 'tanggal', asc: false, limit: 1000 }),
        erpList<any>('surat_jalan_details', { orderBy: 'no_urut', asc: true, limit: 5000 }),
        erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true, limit: 1000 }),
        erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true, limit: 1000 }),
        erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true, limit: 1000 }),
        erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 }),
        erpList<any>('master_banks', { orderBy: 'nama_bank', asc: true, limit: 200 }),
      ]);

    const priceByKode: Record<string, number> = {};
    if (barangRes.status === 'fulfilled') {
      const mappedBarangs: MasterBarangOption[] = barangRes.value
        .filter((b: any) => b.is_active !== false)
        .map((b: any) => {
          const kd = String(b.kode || '').trim().toUpperCase();
          const pr = Number(b.price || 0);
          if (kd) priceByKode[kd] = pr;
          return {
            kode: kd,
            namaBarang: String(b.nama_barang || '').trim(),
            unit: String(b.unit || 'PCS').trim().toUpperCase(),
            price: pr,
            cost: Number(b.cost || 0),
          };
        })
        .filter((b: MasterBarangOption) => b.kode);
      setBarangOptions(mappedBarangs);
      setBarangPriceMap(priceByKode);
    }

    const soListMapped: SalesOrderRef[] = [];
    const soIdToNoBukti = new Map<string, string>();
    if (soRes.status === 'fulfilled') {
      for (const s of soRes.value) {
        const noBukti = String(s.no_bukti || '').trim().toUpperCase();
        if (!noBukti) continue;
        soIdToNoBukti.set(String(s.id), noBukti);
        soListMapped.push({
          id: String(s.id),
          noBukti,
          namaCustomer: String(s.nama_customer || '').trim().toUpperCase(),
          sales: String(s.sales || '').trim().toUpperCase(),
          poNo: String(s.po_no || '').trim().toUpperCase(),
          nilaiSo: Number(s.nilai_so || 0),
          discPct: Number(s.disc_pct || 0),
          ppn: Number(s.ppn ?? 11),
          lokasiStock: String(s.lokasi_stock || '01 - OFFICE').trim().toUpperCase(),
          keterangan: String(s.keterangan || '').trim(),
        });
      }
      setSoOptions(soListMapped);
    }

    if (soDetRes.status === 'fulfilled') {
      const groupedByNoSo: Record<string, FakturDetailItem[]> = {};
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

    if (sjRes.status === 'fulfilled') {
      const sjs: SuratJalanRef[] = sjRes.value
        .map((r: any) => ({
          id: String(r.id),
          noBukti: String(r.no_bukti || '').trim().toUpperCase(),
          noSo: String(r.no_so || '').trim().toUpperCase(),
          poNo: String(r.po_no || '').trim().toUpperCase(),
          namaCustomer: String(r.nama_customer || '').trim().toUpperCase(),
          sales: String(r.sales || '').trim().toUpperCase(),
          lokasiStock: String(r.lokasi_stock || '01 - OFFICE').trim().toUpperCase(),
          noFaktur: String(r.no_faktur || '').trim().toUpperCase(),
          stsPost: String(r.sts_post || '').trim(),
          keterangan: String(r.keterangan || '').trim(),
        }))
        .filter((s: SuratJalanRef) => s.noBukti)
        .sort((a: SuratJalanRef, b: SuratJalanRef) => {
          const aReady = !a.noFaktur && a.stsPost.toUpperCase().startsWith('POST') ? 1 : 0;
          const bReady = !b.noFaktur && b.stsPost.toUpperCase().startsWith('POST') ? 1 : 0;
          return bReady - aReady;
        });
      setSjOptions(sjs);
    }

    if (sjDetRes.status === 'fulfilled') {
      const groupedSj: Record<string, FakturDetailItem[]> = {};
      for (const raw of sjDetRes.value) {
        const sid = String(raw.surat_jalan_id || '');
        if (!sid) continue;
        if (!groupedSj[sid]) groupedSj[sid] = [];
        const qtyVal = Number(raw.terima || 0) > 0 ? Number(raw.terima) : Number(raw.qty || 0);
        const kode = String(raw.kode || '').trim().toUpperCase();
        const hargaVal = Number(raw.harga || 0) > 0 ? Number(raw.harga) : priceByKode[kode] || 0;
        const totalVal = qtyVal * hargaVal;
        groupedSj[sid].push({
          id: String(raw.id || `sjdet-${sid}-${groupedSj[sid].length}`),
          noUrut: groupedSj[sid].length + 1,
          kode,
          namaBarang: String(raw.nama_barang || '').trim(),
          unit: String(raw.unit || 'PCS').trim().toUpperCase(),
          terima: qtyVal,
          qty: qtyVal,
          harga: hargaVal,
          jumlah: totalVal,
          total: totalVal,
        });
      }
      setSjDetailsByIdMap(groupedSj);
    }

    if (custRes.status === 'fulfilled') {
      const cMetaMap: Record<string, MasterCustomerMeta> = {};
      const custs = Array.from(
        new Set(
          custRes.value
            .filter((c: any) => c.is_active !== false)
            .map((c: any) => {
              const nm = String(c.nama_customer || '').trim().toUpperCase();
              if (nm) {
                cMetaMap[nm] = {
                  namaCustomer: nm,
                  sales: String(c.sales || c.nama_sales || '').trim().toUpperCase(),
                  ppn: c.ppn !== false,
                  npwp: String(c.npwp || '').trim(),
                  alamatNpwp: String(c.alamat_npwp || '').trim(),
                  invAlamat: String(c.inv_alamat || c.alamat || '').trim(),
                  tmpPembayaran: Math.max(0, Number(c.tmp_pembayaran || 0)),
                  limitKredit: Math.max(0, Number(c.limit_kredit || 0)),
                  piutang: Math.max(0, Number(c.piutang || 0)),
                };
              }
              return nm;
            })
            .filter(Boolean)
        )
      );
      setCustomerMetaMap(cMetaMap);
      setCustomerOptions(custs);
    }

    if (salesRes.status === 'fulfilled') {
      const sLimit: Record<string, number> = {};
      const salesList = Array.from(
        new Set(
          salesRes.value
            .filter((sl: any) => sl.is_active !== false)
            .map((sl: any) => {
              const nm = String(sl.nama_sales || '').trim().toUpperCase();
              if (nm) sLimit[nm] = Math.max(0, Number(sl.limit_kredit || 0));
              return nm;
            })
            .filter(Boolean)
        )
      );
      setSalesLimitMap(sLimit);
      setSalesOptions(salesList);
    }

    if (bankRes.status === 'fulfilled') {
      setBankOptions(
        bankRes.value
          .filter((b: any) => b.is_active !== false)
          .map((b: any) => ({
            namaBank: String(b.nama_bank || '').trim(),
            accNumber: String(b.acc_number || '').trim(),
            accName: String(b.acc_name || '').trim(),
            cabang: String(b.cabang || '').trim(),
          }))
      );
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
      return { defaultLokasi: lokasis[0] || '01 - OFFICE' };
    }

    return { defaultLokasi: lokasiOptions[0] || '01 - OFFICE' };
  };

  const SEARCH_FIELD_TO_DB_COL: Record<string, string> = {
    Kode: 'no_bukti',
    'Nama Pelanggan': 'nama_customer',
    'No.Bukti': 'no_bukti',
    'No.SO': 'no_so',
    'PO.No': 'po_no',
    'No.SJ': 'no_sj',
    'No.Faktur Pajak': 'no_faktur_pajak',
    Sales: 'sales',
    'Lokasi Stock': 'lokasi_stock',
    Keterangan: 'keterangan',
    'Sts.Lunas': 'sts_lunas',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
    tglFilter?: string;
  }): Promise<FakturPenjualanItem[] | null> => {
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
            'no_bukti,nama_customer,no_so,po_no,no_sj,no_faktur_pajak,sales,lokasi_stock,keterangan,sts_lunas';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows, details, ppnRate] = await Promise.all([
        erpList<any>('faktur_penjualans', queryOpts),
        erpList<any>('faktur_penjualan_details', { orderBy: 'no_urut', asc: true }).catch(() => []),
        fetchDefaultPpnRate(),
        loadMasterReferences(),
      ]);
      setDefaultCompanyPpn(ppnRate);

      const dpRefs: FakturDpRef[] = rows
        .filter((r: any) => String(r.jenis_faktur || '').trim().toUpperCase() === 'DP')
        .map((r: any) => ({
          id: String(r.id),
          noBukti: String(r.no_bukti || '').trim().toUpperCase(),
          namaCustomer: String(r.nama_customer || '').trim().toUpperCase(),
          noSo: String(r.no_so || '').trim().toUpperCase(),
          nilaiPenjualan: Number(r.nilai_penjualan || 0),
          dpUsedOnFaktur: String(r.dp_used_on_faktur || '').trim().toUpperCase(),
        }));
      setDpOptions(dpRefs);

      const regularRows = rows.filter((r: any) => {
        const jenis = String(r.jenis_faktur || 'REGULAR').trim().toUpperCase();
        return jenis === '' || jenis === 'REGULAR';
      });

      const mapped = regularRows.map(mapDbToFaktur);
      setFakturList(mapped);

      const groupedDetails: Record<string, FakturDetailItem[]> = {};
      for (const raw of details) {
        const key = String(raw.faktur_id || '');
        if (!key) continue;
        if (!groupedDetails[key]) groupedDetails[key] = [];
        groupedDetails[key].push(mapDbToDetail(raw, groupedDetails[key].length));
      }
      setFakturDetailsMap(groupedDetails);

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
    const selected = fakturList.find((f) => f.id === selectedId);
    if (!selected) {
      showFeedback('Pilih baris Faktur Penjualan yang akan disimpan');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglIso = selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso();
      const existingDetails = fakturDetailsMap[selected.id] || [];
      const grossFromDetails = existingDetails.reduce((acc, d) => acc + d.total, 0);
      const calc =
        existingDetails.length > 0 && grossFromDetails > 0
          ? calcFakturTotals(grossFromDetails, selected.discPct, selected.ppnPct, selected.totalDp)
          : {
              subtotal: selected.subtotal,
              nilaiDisc: selected.nilaiDisc,
              dpp: selected.dpp,
              nilaiPpn: selected.nilaiPpn,
              totalDp: selected.totalDp,
              grandTotal: Number(selected.nilaiPenjualanNum || 0),
            };

      const headerPayload: Record<string, any> = {
        id: selected.id,
        jenis_faktur: 'REGULAR',
        no_bukti: selected.noBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_customer: selected.namaCustomer.trim().toUpperCase(),
        no_so: selected.noSo.trim().toUpperCase(),
        po_no: selected.poNo.trim().toUpperCase(),
        no_sj: selected.noSj.trim().toUpperCase(),
        no_faktur_pajak: selected.noFakturPajak.trim(),
        sales: selected.sales.trim().toUpperCase(),
        jth_tmp: toIsoDate(selected.jthTmp) || tglIso,
        keterangan: selected.keterangan.trim(),
        ppn: selected.ppnPct,
        subtotal: calc.subtotal,
        disc_pct: selected.discPct,
        nilai_disc: calc.nilaiDisc,
        dpp: calc.dpp,
        nilai_ppn: calc.nilaiPpn,
        no_dp: selected.noDp.trim().toUpperCase(),
        total_dp: calc.totalDp,
        nilai_penjualan: calc.grandTotal,
        lokasi_stock: selected.lokasiStock.trim().toUpperCase() || '01 - OFFICE',
        sts_lunas: selected.stsLunas || 'Not Yet',
        tgl_lunas: selected.tglLunas ? toIsoDate(selected.tglLunas) : null,
        sts_print: selected.stsPrint || 'Not Yet',
        tgl_print: selected.tglPrint ? toIsoDate(selected.tglPrint) : null,
        sts_post: selected.stsPost || 'Not Yet',
        tgl_post: selected.tglPost ? toIsoDate(selected.tglPost) : null,
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
        'faktur-penjualan',
        headerPayload,
        detailPayloads
      );
      const savedHeader = mapDbToFaktur(res.header);
      const savedDetails =
        res.details && res.details.length > 0
          ? res.details.map((d, idx) => mapDbToDetail(d, idx))
          : existingDetails;
      setFakturList((prev) => prev.map((item) => (item.id === selected.id ? savedHeader : item)));
      setFakturDetailsMap((prev) => ({ ...prev, [savedHeader.id]: savedDetails }));
      showFeedback(`Faktur Penjualan [${savedHeader.noBukti}] berhasil disimpan`);
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const selectedFaktur = useMemo(
    () => fakturList.find((f) => f.id === selectedId) || null,
    [fakturList, selectedId]
  );

  const selectedFakturDetails = useMemo(() => {
    if (!selectedFaktur) return [];
    const saved = fakturDetailsMap[selectedFaktur.id];
    if (saved && saved.length > 0) return saved;
    const soKey = selectedFaktur.noSo.trim().toUpperCase();
    return soKey ? soDetailsByNoSoMap[soKey] || [] : [];
  }, [selectedFaktur, fakturDetailsMap, soDetailsByNoSoMap]);

  const isSelectedDetailFromSoFallback = useMemo(() => {
    if (!selectedFaktur) return false;
    const saved = fakturDetailsMap[selectedFaktur.id];
    if (saved && saved.length > 0) return false;
    const soKey = selectedFaktur.noSo.trim().toUpperCase();
    return Boolean(soKey && (soDetailsByNoSoMap[soKey] || []).length > 0);
  }, [selectedFaktur, fakturDetailsMap, soDetailsByNoSoMap]);

  const selectedDetailTotal = useMemo(
    () => selectedFakturDetails.reduce((acc, d) => acc + d.total, 0),
    [selectedFakturDetails]
  );

  const modalDetailTotal = useMemo(
    () => detailRows.reduce((acc, d) => acc + d.total, 0),
    [detailRows]
  );

  const modalBillingBreakdown = useMemo(
    () => calcFakturTotals(modalDetailTotal, parseNum(newDiscPct), parseNum(newPpn), parseNum(newTotalDp)),
    [modalDetailTotal, newDiscPct, newPpn, newTotalDp]
  );

  const availableDpChoices = useMemo(() => {
    const cleanCust = newCustomer.trim().toUpperCase();
    const cleanSo = newNoSo.trim().toUpperCase();
    const currentFakturNo = newNoBukti.trim().toUpperCase();
    return dpOptions.filter((d) => {
      const notUsedElsewhere = !d.dpUsedOnFaktur || d.dpUsedOnFaktur === currentFakturNo;
      if (!notUsedElsewhere) return false;
      if (cleanSo && d.noSo) return d.noSo === cleanSo;
      if (cleanCust && d.namaCustomer) return d.namaCustomer === cleanCust;
      return true;
    });
  }, [dpOptions, newCustomer, newNoSo, newNoBukti]);

  if (!isOpen) return null;

  const syncModalGrandTotal = (
    rows: FakturDetailItem[],
    discStr = newDiscPct,
    ppnStr = newPpn,
    dpStr = newTotalDp
  ) => {
    const hasFilled = rows.some((r) => r.kode.trim() || r.namaBarang.trim());
    if (hasFilled) {
      const gross = rows.reduce((acc, r) => acc + r.total, 0);
      const calc = calcFakturTotals(gross, parseNum(discStr), parseNum(ppnStr), parseNum(dpStr));
      setNewNilaiPenjualan(String(calc.grandTotal));
    }
  };

  const updateDetailRowsWithSync = (
    updater: (prev: FakturDetailItem[]) => FakturDetailItem[]
  ) => {
    setDetailRows((prev) => {
      const next = updater(prev);
      syncModalGrandTotal(next);
      return next;
    });
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
    field: keyof FakturDetailItem,
    rawValue: string
  ) => {
    updateDetailRowsWithSync((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated: FakturDetailItem = { ...r };
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

  // Primary Flow: Select Surat Jalan (posted & un-invoiced) -> auto-fill SJ items, match prices from SO/MasterBarang
  const applySuratJalanAutoFill = (rawNoSj: string) => {
    const cleanSj = rawNoSj.trim().toUpperCase();
    setNewNoSj(cleanSj);
    if (!cleanSj) return;

    const matchedSj = sjOptions.find((sj) => sj.noBukti === cleanSj);
    if (!matchedSj) return;

    const cleanNoSo = matchedSj.noSo.trim().toUpperCase();
    const matchedSo = cleanNoSo ? soOptions.find((s) => s.noBukti === cleanNoSo) : undefined;

    if (cleanNoSo) setNewNoSo(cleanNoSo);
    setNewPoNo(matchedSj.poNo || matchedSo?.poNo || '');
    const custName = matchedSj.namaCustomer || matchedSo?.namaCustomer || '';
    setNewCustomer(custName);
    if (matchedSj.sales || matchedSo?.sales) setNewSales(matchedSj.sales || matchedSo?.sales || '');
    if (matchedSj.lokasiStock || matchedSo?.lokasiStock) {
      setNewLokasiStock(matchedSj.lokasiStock || matchedSo?.lokasiStock || '01 - OFFICE');
    }

    const nextDisc = matchedSo ? String(matchedSo.discPct || 0) : newDiscPct;
    const custMeta = custName ? customerMetaMap[custName.trim().toUpperCase()] : undefined;
    const nextPpn = matchedSo
      ? String(matchedSo.ppn ?? defaultCompanyPpn)
      : custMeta
      ? String(custMeta.ppn ? defaultCompanyPpn : 0)
      : newPpn;

    setNewDiscPct(nextDisc);
    setNewPpn(nextPpn);

    if (custMeta && custMeta.tmpPembayaran > 0) {
      const baseDateIso = toIsoDate(newTanggal) || todayIso();
      setNewJthTmp(toDisplayDMyShort(addDaysToIsoDate(baseDateIso, custMeta.tmpPembayaran)));
    }
    if (!newKeterangan.trim() && (matchedSj.keterangan || matchedSo?.keterangan)) {
      setNewKeterangan(matchedSj.keterangan || matchedSo?.keterangan || '');
    }

    const soPriceByKode = new Map<string, number>();
    if (cleanNoSo && soDetailsByNoSoMap[cleanNoSo]) {
      for (const sd of soDetailsByNoSoMap[cleanNoSo]) {
        if (sd.kode && sd.harga > 0) soPriceByKode.set(sd.kode, sd.harga);
      }
    }

    const rawSjItems = sjDetailsByIdMap[matchedSj.id] || [];
    const hydratedItems: FakturDetailItem[] =
      rawSjItems.length > 0
        ? rawSjItems.map((d, idx) => {
            const qty = d.terima > 0 ? d.terima : d.qty;
            const harga = soPriceByKode.get(d.kode) ?? (d.harga > 0 ? d.harga : barangPriceMap[d.kode] || 0);
            const jumlah = qty * harga;
            return {
              ...d,
              id: `sj-fill-${Date.now()}-${idx}`,
              noUrut: idx + 1,
              qty,
              harga,
              jumlah,
              total: jumlah,
            };
          })
        : (soDetailsByNoSoMap[cleanNoSo] || []).map((d, idx) => ({
            ...d,
            id: `sj-so-fill-${Date.now()}-${idx}`,
            noUrut: idx + 1,
          }));

    if (hydratedItems.length > 0) {
      setDetailRows(hydratedItems);
      syncModalGrandTotal(hydratedItems, nextDisc, nextPpn, newTotalDp);
    } else {
      setDetailRows([createBlankDetailRow(1)]);
    }
  };

  // Fallback Flow: Select No. SO directly
  const applySalesOrderAutoFill = (rawNoSo: string) => {
    const cleanNoSo = rawNoSo.trim().toUpperCase();
    setNewNoSo(cleanNoSo);
    if (!cleanNoSo) return;

    const matchedSo = soOptions.find((s) => s.noBukti === cleanNoSo);
    const matchedSj =
      sjOptions.find((sj) => sj.noSo === cleanNoSo && !sj.noFaktur) ||
      sjOptions.find((sj) => sj.noSo === cleanNoSo) ||
      sjOptions.find((sj) => matchedSo?.poNo && sj.poNo === matchedSo.poNo);

    if (matchedSj) {
      applySuratJalanAutoFill(matchedSj.noBukti);
      return;
    }

    let nextDisc = newDiscPct;
    let nextPpn = newPpn;
    if (matchedSo) {
      setNewPoNo(matchedSo.poNo || '');
      const custName = matchedSo.namaCustomer || '';
      setNewCustomer(custName);
      if (matchedSo.sales) setNewSales(matchedSo.sales);
      setNewLokasiStock(matchedSo.lokasiStock || lokasiOptions[0] || '01 - OFFICE');
      nextDisc = String(matchedSo.discPct || 0);
      nextPpn = String(matchedSo.ppn ?? defaultCompanyPpn);
      setNewDiscPct(nextDisc);
      setNewPpn(nextPpn);
      if (custName) {
        const custMeta = customerMetaMap[custName.trim().toUpperCase()];
        if (custMeta && custMeta.tmpPembayaran > 0) {
          const baseDateIso = toIsoDate(newTanggal) || todayIso();
          setNewJthTmp(toDisplayDMyShort(addDaysToIsoDate(baseDateIso, custMeta.tmpPembayaran)));
        }
      }
      if (!newKeterangan.trim() && matchedSo.keterangan) {
        setNewKeterangan(matchedSo.keterangan);
      }
    }

    const soItems = (soDetailsByNoSoMap[cleanNoSo] || []).map((d, idx) => ({
      ...d,
      id: `so-fill-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      noUrut: idx + 1,
    }));

    if (soItems.length > 0) {
      setDetailRows(soItems);
      syncModalGrandTotal(soItems, nextDisc, nextPpn, newTotalDp);
    } else {
      setDetailRows([createBlankDetailRow(1)]);
      if (matchedSo) {
        setNewNilaiPenjualan(String(Math.max(0, matchedSo.nilaiSo - parseNum(newTotalDp))));
      }
    }
  };

  const applyFakturDpSelection = (rawNoDp: string) => {
    const clean = rawNoDp.trim().toUpperCase();
    setNewNoDp(clean);
    const dp = dpOptions.find((d) => d.noBukti === clean);
    const nextDpAmt = dp ? dp.nilaiPenjualan : 0;
    const nextDpStr = String(nextDpAmt);
    setNewTotalDp(nextDpStr);
    syncModalGrandTotal(detailRows, newDiscPct, newPpn, nextDpStr);
  };

  const handleSelectCustomer = (customerName: string, overrideDateStr?: string) => {
    setNewCustomer(customerName);
    setOverrideCreditLimit(false);
    setShowCreditOverrideBox(false);
    const custMeta = customerMetaMap[customerName.trim().toUpperCase()];
    if (custMeta) {
      if (custMeta.sales) setNewSales(custMeta.sales);
      const nextPpnStr = String(custMeta.ppn ? defaultCompanyPpn : 0);
      setNewPpn(nextPpnStr);
      const baseDateIso = toIsoDate(overrideDateStr ?? newTanggal) || todayIso();
      setNewJthTmp(toDisplayDMyShort(addDaysToIsoDate(baseDateIso, custMeta.tmpPembayaran)));
      syncModalGrandTotal(detailRows, newDiscPct, nextPpnStr, newTotalDp);
    }
  };

  const handleAddNew = async () => {
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setOverrideCreditLimit(false);
    setShowCreditOverrideBox(false);
    setNewNoBukti(nextUniqueCode(fakturList.map((f) => f.noBukti), 'INJ-2608-', 4));
    setNewTanggal(todayDisp);
    setNewCustomer('');
    setNewNoSo('');
    setNewPoNo('');
    setNewNoSj('');
    setNewNoFakturPajak('');
    setNewSales('');
    setNewJthTmp(todayDisp);
    setNewKeterangan('');
    setNewDiscPct('0');
    setNewPpn(String(defaultCompanyPpn));
    setNewNoDp('');
    setNewTotalDp('0');
    setNewNilaiPenjualan('0');
    setNewLokasiStock(lokasiOptions[0] || '01 - OFFICE');
    setNewStsLunas('Not Yet');
    setNewTglLunas('');
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
    const [defPpn, refInfo] = await Promise.all([
      fetchDefaultPpnRate(),
      loadMasterReferences(),
    ]);
    setDefaultCompanyPpn(defPpn);
    setNewPpn(String(defPpn));
    if (refInfo?.defaultLokasi) setNewLokasiStock(refInfo.defaultLokasi);
  };

  const handleEdit = async () => {
    const item = fakturList.find((f) => f.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris data terlebih dahulu');
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
    setNewCustomer(item.namaCustomer);
    setNewNoSo(item.noSo);
    setNewPoNo(item.poNo);
    setNewNoSj(item.noSj);
    setNewNoFakturPajak(item.noFakturPajak);
    setNewSales(item.sales);
    setNewJthTmp(item.jthTmp || todayDisp);
    setNewKeterangan(item.keterangan);
    setNewDiscPct(String(item.discPct));
    setNewPpn(String(item.ppnPct));
    setNewNoDp(item.noDp);
    setNewTotalDp(String(item.totalDp));
    setNewNilaiPenjualan(String(item.nilaiPenjualanNum));
    setNewLokasiStock(item.lokasiStock || lokasiOptions[0] || '01 - OFFICE');
    setNewStsLunas(item.stsLunas || 'Not Yet');
    setNewTglLunas(item.tglLunas || '');
    setNewStsPrint(item.stsPrint || 'Not Yet');
    setNewTglPrint(item.tglPrint || '');
    setNewStsPost(item.stsPost || 'Not Yet');
    setNewTglPost(item.tglPost || '');
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(
      item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser
    );
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);

    const existingDetails = fakturDetailsMap[item.id] || [];
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
    const grossFromDetails = activeDetails.reduce((acc, d) => acc + d.total, 0);
    const discPct = parseNum(newDiscPct);
    const ppnPct = parseNum(newPpn);
    const dpAmt = parseNum(newTotalDp);

    const calc =
      activeDetails.length > 0 && grossFromDetails > 0
        ? calcFakturTotals(grossFromDetails, discPct, ppnPct, dpAmt)
        : {
            subtotal: parseNum(newNilaiPenjualan) + dpAmt,
            nilaiDisc: 0,
            dpp: parseNum(newNilaiPenjualan) + dpAmt,
            nilaiPpn: 0,
            totalDp: dpAmt,
            grandTotal: parseNum(newNilaiPenjualan),
          };
    const finalNilaiPenjualan = calc.grandTotal;

    if (!overrideCreditLimit) {
      const custMeta = customerMetaMap[newCustomer.trim().toUpperCase()];
      const oldEditedVal = editingId
        ? fakturList.find((f) => f.id === editingId)?.nilaiPenjualanNum || 0
        : 0;
      const projectedPiutang = Math.max(0, (custMeta?.piutang || 0) - oldEditedVal) + finalNilaiPenjualan;
      if (
        custMeta &&
        custMeta.limitKredit > 0 &&
        projectedPiutang > custMeta.limitKredit
      ) {
        setShowCreditOverrideBox(true);
        setModalError(
          `Peringatan Limit Kredit Customer: Proyeksi Piutang (${formatRupiah(
            projectedPiutang
          )}) melebihi Limit Kredit (${formatRupiah(custMeta.limitKredit)}). Centang "Abaikan batas limit kredit" untuk melanjutkan.`
        );
        return;
      }
      const salesLimit = salesLimitMap[newSales.trim().toUpperCase()] || 0;
      if (salesLimit > 0 && finalNilaiPenjualan > salesLimit) {
        setShowCreditOverrideBox(true);
        setModalError(
          `Peringatan Limit Kredit Sales (${newSales.trim().toUpperCase()}): Nilai Faktur (${formatRupiah(
            finalNilaiPenjualan
          )}) melebihi Limit (${formatRupiah(salesLimit)}). Centang "Abaikan batas limit kredit" untuk melanjutkan.`
        );
        return;
      }
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const baseHeader: Record<string, any> = {
        jenis_faktur: 'REGULAR',
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
        ppn: ppnPct,
        subtotal: calc.subtotal,
        disc_pct: discPct,
        nilai_disc: calc.nilaiDisc,
        dpp: calc.dpp,
        nilai_ppn: calc.nilaiPpn,
        no_dp: newNoDp.trim().toUpperCase(),
        total_dp: calc.totalDp,
        nilai_penjualan: finalNilaiPenjualan,
        lokasi_stock: newLokasiStock.trim().toUpperCase() || '01 - OFFICE',
        sts_lunas: newStsLunas || 'Not Yet',
        tgl_lunas: toIsoDate(newTglLunas) || null,
        sts_print: newStsPrint || 'Not Yet',
        tgl_print: toIsoDate(newTglPrint) || null,
        sts_post: newStsPost || 'Not Yet',
        tgl_post: toIsoDate(newTglPost) || null,
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
        'faktur-penjualan',
        baseHeader,
        detailPayloads
      );

      const savedHeader = mapDbToFaktur(res.header);
      const savedDetails =
        res.details && res.details.length > 0
          ? res.details.map((d, idx) => mapDbToDetail(d, idx))
          : activeDetails.map((d, idx) => ({ ...d, fakturId: savedHeader.id, noUrut: idx + 1 }));

      if (editingId) {
        setFakturList((prev) => prev.map((item) => (item.id === editingId ? savedHeader : item)));
        showFeedback(
          res.detailWarning
            ? `Faktur diperbarui (${res.detailWarning})`
            : 'Faktur Penjualan & Detail Barang diperbarui'
        );
      } else {
        setFakturList((prev) => [savedHeader, ...prev]);
        setSelectedId(savedHeader.id);
        showFeedback(
          res.detailWarning
            ? `Faktur tersimpan (${res.detailWarning})`
            : 'Faktur Penjualan & Detail Barang tersimpan'
        );
      }

      setFakturDetailsMap((prev) => ({
        ...prev,
        [savedHeader.id]: savedDetails,
      }));
      await loadMasterReferences();

      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Faktur Penjualan';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRequestDelete = async () => {
    const target = fakturList.find((f) => f.id === selectedId);
    if (!target) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    if (target.stsLunas.toUpperCase() === 'LUNAS') {
      showFeedback(`Faktur [${target.noBukti}] sudah LUNAS dan tidak boleh dihapus.`);
      return;
    }
    try {
      setIsBusy(true);
      const [returs, giros] = await Promise.all([
        erpList<any>('retur_penjualans', { eq: { no_faktur: target.noBukti }, limit: 5 }).catch(() => []),
        erpList<any>('giro_penjualan_details', { limit: 1000 }).catch(() => []),
      ]);
      if (returs.length > 0) {
        showFeedback(
          `Faktur [${target.noBukti}] sudah memiliki Retur Penjualan (${returs[0].no_bukti}) dan tidak boleh dihapus.`
        );
        return;
      }
      const linkedCairGiro = giros.find((g: any) => {
        const refMatch =
          String(g.no_faktur || g.no_ref || '').trim().toUpperCase() === target.noBukti.toUpperCase();
        const isCair = String(g.sts_cair || '').trim().toUpperCase() === 'CAIR';
        return refMatch && isCair;
      });
      if (linkedCairGiro) {
        showFeedback(
          `Faktur [${target.noBukti}] sudah dibayar dengan Giro Cair (${linkedCairGiro.no_cek_giro || ''}) dan tidak boleh dihapus.`
        );
        return;
      }
      setConfirmDeleteRow(target);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('faktur_penjualan_details', id, 'faktur_id').catch(() => {});
      await erpDelete('faktur_penjualans', id);
      const updated = fakturList.filter((item) => item.id !== id);
      setFakturList(updated);
      setFakturDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setConfirmDeleteRow(null);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Faktur Penjualan dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = fakturList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (!searchTerm.trim()) return true;
    if (searchField === 'Kode' || searchField === 'No.Bukti') {
      return matchesMultiKeyword([item.noBukti], searchTerm);
    }
    if (searchField === 'Nama Pelanggan') return matchesMultiKeyword([item.namaCustomer], searchTerm);
    if (searchField === 'No.SO') return matchesMultiKeyword([item.noSo], searchTerm);
    if (searchField === 'PO.No') return matchesMultiKeyword([item.poNo], searchTerm);
    if (searchField === 'No.SJ') return matchesMultiKeyword([item.noSj], searchTerm);
    if (searchField === 'No.Faktur Pajak') return matchesMultiKeyword([item.noFakturPajak], searchTerm);
    if (searchField === 'Sales') return matchesMultiKeyword([item.sales], searchTerm);
    if (searchField === 'Lokasi Stock') return matchesMultiKeyword([item.lokasiStock], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
    if (searchField === 'Sts.Lunas') return matchesMultiKeyword([item.stsLunas], searchTerm);
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
        item.lokasiStock,
        item.keterangan,
        item.stsLunas,
      ],
      searchTerm
    );
  });

  const totalNilai = filteredList.reduce((acc, f) => acc + f.nilaiPenjualanNum, 0);

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
          ? `Ditemukan ${rows.length} Faktur Penjualan dari Supabase`
          : `Menampilkan ${rows.length} Faktur Penjualan dari Supabase`
      );
    } else if (rows) {
      setSelectedId('');
      showFeedback('Data Faktur Penjualan tidak ditemukan di Supabase');
    }
  };

  const handleResetSearch = async () => {
    setSearchTerm('');
    setSearchField('Semua');
    const rows = await loadData({ field: 'Semua', term: '', tglFilter: tanggalFilter });
    if (rows) {
      showFeedback(`Filter direset (${rows.length} Faktur Penjualan)`);
    }
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
  };

  const handleOpenPrint = (mode?: 'list' | 'detail') => {
    const targetMode = mode ?? (selectedFaktur ? 'detail' : 'list');
    setPrintMode(targetMode);
    setIsPrintOpen(true);

    if (targetMode === 'detail' && selectedFaktur && selectedFaktur.stsPrint !== 'Printed') {
      const todayStr = todayIso();
      const dispToday = toDisplayDMyShort(todayStr);
      erpCompositeSave<{ header: any }>(
        'faktur-penjualan',
        {
          id: selectedFaktur.id,
          jenis_faktur: 'REGULAR',
          no_bukti: selectedFaktur.noBukti,
          sts_print: 'Printed',
          tgl_print: todayStr,
        },
        undefined
      )
        .then(() => {
          setFakturList((prev) =>
            prev.map((f) =>
              f.id === selectedFaktur.id ? { ...f, stsPrint: 'Printed', tglPrint: dispToday } : f
            )
          );
        })
        .catch(() => {});
    }
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Faktur_Penjualan',
      sheetTitle: 'LIST FAKTUR PENJUALAN',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'No.SO', accessor: 'noSo' },
        { header: 'PO.No', accessor: 'poNo' },
        { header: 'No.SJ', accessor: 'noSj' },
        { header: 'No.Faktur Pajak', accessor: 'noFakturPajak' },
        { header: 'Sales', accessor: 'sales', align: 'center' },
        { header: 'Lokasi Stock', accessor: 'lokasiStock' },
        { header: 'Jth.Tmp', accessor: 'jthTmp', align: 'center' },
        { header: 'DPP', accessor: 'dpp', align: 'right' },
        { header: 'Nilai PPN', accessor: 'nilaiPpn', align: 'right' },
        { header: 'Potongan DP', accessor: 'totalDp', align: 'right' },
        { header: 'Nilai Penjualan', accessor: 'nilaiPenjualanNum', align: 'right' },
        { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const sjDropdownChoices = Array.from(
    new Set([...sjOptions.map((s) => s.noBukti), newNoSj.trim().toUpperCase()].filter(Boolean))
  );

  const soDropdownChoices = Array.from(
    new Set([...soOptions.map((s) => s.noBukti), newNoSo.trim().toUpperCase()].filter(Boolean))
  );

  const customerDropdownChoices = Array.from(
    new Set([...customerOptions, newCustomer.trim().toUpperCase()].filter(Boolean))
  );

  const salesDropdownChoices = Array.from(
    new Set([...salesOptions, newSales.trim().toUpperCase()].filter(Boolean))
  );

  const lokasiDropdownChoices = Array.from(
    new Set(['01 - OFFICE', ...lokasiOptions, newLokasiStock.trim().toUpperCase()].filter(Boolean))
  );

  const selectedCustMeta = selectedFaktur
    ? customerMetaMap[selectedFaktur.namaCustomer.trim().toUpperCase()]
    : undefined;
  const primaryBank = bankOptions[0];

  const listPrintColumns: PrintColumn<FakturPenjualanItem>[] = [
    { header: 'No.Bukti', accessor: 'noBukti', width: '88px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '62px' },
    { header: 'Nama Customer', accessor: 'namaCustomer', width: '130px' },
    { header: 'No.SO', accessor: 'noSo', width: '88px' },
    { header: 'PO.No', accessor: 'poNo', width: '78px' },
    { header: 'No.SJ', accessor: 'noSj', width: '78px' },
    { header: 'Sales', accessor: 'sales', width: '66px' },
    { header: 'Lokasi Stock', accessor: 'lokasiStock', width: '78px' },
    { header: 'Jth.Tmp', accessor: 'jthTmp', align: 'center', width: '62px' },
    { header: 'Nilai Penjualan', accessor: 'nilaiPenjualan', align: 'right', width: '84px' },
    { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center', width: '54px' },
    { header: 'Dibuat Oleh', accessor: 'dibuatOleh', width: '60px' },
    { header: 'Tgl.Created', accessor: 'tglCreated', align: 'center', width: '60px' },
  ];

  const detailPrintColumns: PrintColumn<FakturDetailItem>[] = [
    { header: 'Kode', accessor: 'kode', width: '92px' },
    { header: 'Nama Barang', accessor: 'namaBarang' },
    { header: 'Unit', accessor: 'unit', align: 'center', width: '58px' },
    { header: 'QTY', accessor: (r) => formatMoney(r.qty), align: 'right', width: '68px' },
    { header: 'Harga', accessor: (r) => formatMoney(r.harga), align: 'right', width: '96px' },
    { header: 'Jumlah', accessor: (r) => formatMoney(r.jumlah), align: 'right', width: '104px' },
    { header: 'Total', accessor: (r) => formatMoney(r.total), align: 'right', width: '104px' },
  ];

  return (
    <div
      id="list-faktur-penjualan-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="List Faktur Penjualan"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => handleOpenPrint()}
        onTableView={() => loadData({ field: searchField, term: searchTerm, tglFilter: tanggalFilter })}
        onExportExcel={handleExportExcel}
      />

      <div className="shrink-0 bg-[#ECE9D8] border-b border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs shadow-sm overflow-x-auto">
        <div className="flex items-center space-x-2">
          <FormActionButtons
            onSimpan={handleToolbarSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleRequestDelete}
            onPrint={() => handleOpenPrint()}
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
          <div className="font-bold text-sm text-right px-3 py-0.5 bg-white border border-[#919191] min-w-[120px] shadow-inner">
            {formatRupiah(totalNilai)}
          </div>
        </div>
      </div>

      {/* Upper Table: List Faktur Penjualan */}
      <div className="flex-[1.35] min-h-[160px] overflow-auto bg-white border border-[#7A7A7A] mx-2 mt-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[2150px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Bukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.SJ</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.SO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">PO.No</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Faktur Pajak</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Lokasi Stock</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Jth.Tmp</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center">PPN</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Potongan DP</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Nilai Penjualan</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Lunas</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Lunas</th>
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
            {filteredList.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  onDoubleClick={handleEdit}
                  className={`border-b border-[#00C000] cursor-pointer text-xs font-mono text-black ${
                    isSelected ? 'bg-[#00FF00] font-semibold' : 'bg-[#00E800] hover:bg-[#33FF33]'
                  }`}
                >
                  <td className="border-r border-[#00B000] px-2 py-1 text-center font-bold">
                    {isSelected ? '▶' : ''}
                  </td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.noBukti}</td>
                  <td className="border-r border-[#00B000] px-3 py-1">{item.tanggal}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-medium font-sans">{item.namaCustomer}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-mono">{item.noSj}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.noSo}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.poNo}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.noFakturPajak}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-sans">{item.sales}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-sans">{item.lokasiStock}</td>
                  <td className="border-r border-[#00B000] px-3 py-1">{item.jthTmp}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-sans">{item.keterangan || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.ppn}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-right">
                    {item.totalDp > 0 ? formatMoney(item.totalDp) : '-'}
                  </td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-right font-semibold">{item.nilaiPenjualan}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-sans">{item.stsLunas}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.tglLunas || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-sans">{item.stsPrint}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.tglPrint || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-sans">{item.stsPost}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.tglPost || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-sans">{item.dibuatOleh}</td>
                  <td className="border-r border-[#00B000] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-sans">{item.diupdateOleh || '-'}</td>
                  <td className="px-3 py-1">{item.tglUpdate || '-'}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={25} className="text-center py-6 text-gray-500">
                  Tidak ada data faktur penjualan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lower Panel: Detail Barang */}
      <div className="flex-1 min-h-[145px] flex flex-col mx-2 mt-1.5 mb-1 border border-[#7A7A7A] bg-white shadow-inner overflow-hidden">
        <div className="shrink-0 bg-[#E6E3D5] border-b border-[#ACA899] px-2.5 py-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-[#003C74] whitespace-nowrap">
              Detail Barang Faktur (SJ / SO)
            </span>
            {selectedFaktur ? (
              <span className="text-[11px] text-gray-800 truncate">
                No. Bukti: <b className="font-mono">{selectedFaktur.noBukti}</b> | No. SJ:{' '}
                <b className="font-mono text-[#000084]">{selectedFaktur.noSj || '-'}</b> | No. SO:{' '}
                <b className="font-mono">{selectedFaktur.noSo || '-'}</b> | Customer:{' '}
                <b>{selectedFaktur.namaCustomer}</b>
                {selectedFaktur.noDp && (
                  <span className="ml-2 px-1.5 py-0.5 bg-[#E0F2FE] border border-[#7DD3FC] text-[10px] text-[#0369A1] rounded-xs">
                    DP: {selectedFaktur.noDp} (-{formatRupiah(selectedFaktur.totalDp)})
                  </span>
                )}
                {isSelectedDetailFromSoFallback && (
                  <span className="ml-2 px-1.5 py-0.5 bg-[#FFF7D6] border border-[#D4B040] text-[10px] text-[#7A5900] rounded-xs">
                    Sumber: S.O. Detail
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[11px] text-gray-500 italic">
                Pilih Faktur Penjualan di atas untuk melihat detail barang
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] font-bold text-gray-900 font-mono">
              Subtotal: {formatRupiah(selectedDetailTotal)}
            </span>
            {selectedFaktur && (
              <button
                type="button"
                onClick={() => handleOpenPrint('detail')}
                className="px-2.5 py-0.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded-xs text-[11px] font-semibold cursor-pointer"
              >
                Print Faktur Detail
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
              {selectedFakturDetails.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                    Belum ada detail barang untuk faktur ini. Pilih No. SJ atau No. SO saat Baru / Koreksi.
                  </td>
                </tr>
              ) : (
                selectedFakturDetails.map((d, idx) => (
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
          options={[
            { value: 'Semua', label: 'Semua' },
            { value: 'Kode', label: 'Kode (No.Bukti)' },
            { value: 'Nama Pelanggan', label: 'Nama Pelanggan' },
            { value: 'No.Bukti', label: 'No.Bukti' },
            { value: 'No.SJ', label: 'No.SJ' },
            { value: 'No.SO', label: 'No.SO' },
            { value: 'PO.No', label: 'PO.No' },
            { value: 'No.Faktur Pajak', label: 'No.Faktur Pajak' },
            { value: 'Sales', label: 'Sales' },
            { value: 'Lokasi Stock', label: 'Lokasi Stock' },
            { value: 'Keterangan', label: 'Keterangan' },
            { value: 'Sts.Lunas', label: 'Sts.Lunas' },
          ]}
        />
        <div className="flex items-center space-x-4 shrink-0">
          <div className="w-60 h-5 bg-[#FFFF00] border border-[#919191] shadow-inner px-2 text-[10px] flex items-center text-black truncate">
            {selectedFaktur ? `${selectedFaktur.noBukti} - ${selectedFaktur.namaCustomer}` : ''}
          </div>
          <div className="font-semibold px-2 py-0.5 bg-[#ECE9D8] border border-[#919191]">
            Record {filteredList.length}
          </div>
        </div>
      </div>

      {/* Add / Koreksi Faktur Penjualan Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[980px] max-w-[97vw] max-h-[94vh] flex flex-col overflow-hidden">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs shrink-0">
              <span>{editingId ? 'Koreksi Faktur Penjualan' : 'Tambah Faktur Penjualan Baru'}</span>
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
                      onChange={(formatted) => {
                        setNewTanggal(formatted);
                        if (!editingId && newCustomer) {
                          const custMeta = customerMetaMap[newCustomer.trim().toUpperCase()];
                          if (custMeta && custMeta.tmpPembayaran > 0) {
                            const baseDateIso = toIsoDate(formatted) || todayIso();
                            setNewJthTmp(
                              toDisplayDMyShort(addDaysToIsoDate(baseDateIso, custMeta.tmpPembayaran))
                            );
                          }
                        }
                      }}
                      format="dMyShort"
                    />
                  </div>
                </div>

                {/* Primary Flow: No. SJ Dropdown */}
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0 text-[#003C74]">
                    No. SJ (Surat Jalan):
                  </label>
                  <div className="w-64 flex gap-1">
                    <select
                      value={newNoSj}
                      onChange={(e) => applySuratJalanAutoFill(e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1 bg-[#E0F2FE] border border-[#0369A1] font-mono font-semibold uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih No. SJ (Utama) --</option>
                      {sjDropdownChoices.map((sjNo) => {
                        const info = sjOptions.find((s) => s.noBukti === sjNo);
                        const tag = info?.noFaktur
                          ? `[Faktur: ${info.noFaktur}]`
                          : info?.stsPost.toUpperCase().startsWith('POST')
                          ? '[Siap Tagih]'
                          : '[Draft]';
                        return (
                          <option key={sjNo} value={sjNo}>
                            {info ? `${sjNo} ${tag} - ${info.namaCustomer}` : sjNo}
                          </option>
                        );
                      })}
                    </select>
                    {newNoSj && (
                      <button
                        type="button"
                        onClick={() => applySuratJalanAutoFill(newNoSj)}
                        title="Muat ulang item dari Surat Jalan"
                        className="px-2 py-1 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] text-[10px] font-bold cursor-pointer shrink-0"
                      >
                        Sync
                      </button>
                    )}
                  </div>
                </div>

                {/* Fallback: No. SO Dropdown */}
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0 text-[#000084]">
                    No. SO (Fallback):
                  </label>
                  <div className="w-64 flex gap-1">
                    <select
                      value={newNoSo}
                      onChange={(e) => applySalesOrderAutoFill(e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1 bg-[#FFFF99] border border-[#000084] font-mono font-semibold uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih No. SO --</option>
                      {soDropdownChoices.map((soNo) => {
                        const info = soOptions.find((s) => s.noBukti === soNo);
                        return (
                          <option key={soNo} value={soNo}>
                            {info && info.namaCustomer ? `${soNo} - ${info.namaCustomer}` : soNo}
                          </option>
                        );
                      })}
                    </select>
                    {newNoSo && (
                      <button
                        type="button"
                        onClick={() => applySalesOrderAutoFill(newNoSo)}
                        title="Muat ulang data & barang dari No. SO"
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
                  <label className="font-semibold shrink-0">PO.No:</label>
                  <input
                    type="text"
                    value={newPoNo}
                    onChange={(e) => setNewPoNo(e.target.value)}
                    placeholder="Otomatis dari SJ / SO"
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Faktur DP (Potongan):</label>
                  <div className="w-64 flex gap-1.5">
                    <select
                      value={newNoDp}
                      onChange={(e) => applyFakturDpSelection(e.target.value)}
                      className="w-3/5 px-1.5 py-1 bg-white border border-[#7A7A7A] font-mono uppercase cursor-pointer"
                    >
                      <option value="">-- Tanpa Potongan DP --</option>
                      {availableDpChoices.map((d) => (
                        <option key={d.id} value={d.noBukti}>
                          {d.noBukti} ({formatRupiah(d.nilaiPenjualan)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={newTotalDp}
                      onChange={(e) => {
                        setNewTotalDp(e.target.value);
                        syncModalGrandTotal(detailRows, newDiscPct, newPpn, e.target.value);
                      }}
                      placeholder="Rp DP"
                      className="w-2/5 px-1.5 py-1 bg-white border border-[#7A7A7A] font-mono text-right"
                    />
                  </div>
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
                  <label className="font-semibold shrink-0">Sales / Disc (%) / PPN (%):</label>
                  <div className="w-64 flex gap-1.5">
                    <select
                      value={newSales}
                      onChange={(e) => setNewSales(e.target.value)}
                      className="w-1/2 px-1.5 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    >
                      <option value="">-- Sales --</option>
                      {salesDropdownChoices.map((sl) => (
                        <option key={sl} value={sl}>
                          {sl}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newDiscPct}
                      onChange={(e) => {
                        setNewDiscPct(e.target.value);
                        syncModalGrandTotal(detailRows, e.target.value, newPpn, newTotalDp);
                      }}
                      title="Diskon %"
                      placeholder="Disc%"
                      className="w-1/4 px-1 py-1 bg-white border border-[#7A7A7A] font-mono text-center"
                    />
                    <input
                      type="number"
                      min="0"
                      value={newPpn}
                      onChange={(e) => {
                        setNewPpn(e.target.value);
                        syncModalGrandTotal(detailRows, newDiscPct, e.target.value, newTotalDp);
                      }}
                      title="PPN %"
                      placeholder="PPN%"
                      className="w-1/4 px-1 py-1 bg-white border border-[#7A7A7A] font-mono text-center"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">No. Faktur Pajak:</label>
                  <input
                    type="text"
                    value={newNoFakturPajak}
                    onChange={(e) => setNewNoFakturPajak(e.target.value)}
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] font-mono"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Jth.Tmp:</label>
                  <div className="w-64">
                    <DatePickerInput
                      value={newJthTmp}
                      onChange={(formatted) => setNewJthTmp(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Net Nilai Tagihan (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    value={newNilaiPenjualan}
                    onChange={(e) => setNewNilaiPenjualan(e.target.value)}
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
                  <label className="font-semibold shrink-0">Sts / Tgl Lunas:</label>
                  <div className="w-64 grid grid-cols-2 gap-1.5">
                    <select
                      value={newStsLunas}
                      onChange={(e) => setNewStsLunas(e.target.value)}
                      className="px-1.5 py-1 bg-white border border-[#7A7A7A]"
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

              {/* Detail Barang */}
              <div className="border border-[#999999] bg-white rounded-xs overflow-hidden">
                <div className="bg-[#E6E3D5] border-b border-[#C0C0C0] px-2.5 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#003C74]">
                      Detail Barang Penjualan
                    </span>
                    <span className="text-[11px] text-gray-600">
                      {newNoSj
                        ? `(Dari Surat Jalan: ${newNoSj})`
                        : newNoSo
                        ? `(Dari Sales Order: ${newNoSo})`
                        : '(Pilih No. SJ / No. SO di atas untuk mengisi detail otomatis)'}
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
                            Belum ada detail barang. Pilih No. SJ / No. SO atau klik "+ Tambah Baris".
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
                <div className="bg-[#F5F4EE] border-t border-[#C0C0C0] px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                  <span>
                    Subtotal: <b>{formatRupiah(modalBillingBreakdown.subtotal)}</b> | Disc ({parseNum(newDiscPct)}%):{' '}
                    <b>{formatRupiah(modalBillingBreakdown.nilaiDisc)}</b> | DPP:{' '}
                    <b>{formatRupiah(modalBillingBreakdown.dpp)}</b> | PPN ({parseNum(newPpn)}%):{' '}
                    <b>{formatRupiah(modalBillingBreakdown.nilaiPpn)}</b> | DP:{' '}
                    <b>{formatRupiah(modalBillingBreakdown.totalDp)}</b>
                  </span>
                  <span className="font-bold text-[#003C74]">
                    Net Tagihan: {formatRupiah(parseNum(newNilaiPenjualan))}
                  </span>
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
                      Abaikan batas limit kredit dan tetap simpan Faktur Penjualan ini
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

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Faktur Penjualan"
        rows={fakturList}
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
          r.lokasiStock,
          r.keterangan,
          r.stsLunas,
        ]}
        initialQuery={searchTerm}
        isBusy={isBusy}
        placeholder="Cari Kode (No.Bukti), Customer, No.SJ, No.SO, PO.No, Sales..."
        onSearchSupabase={(q) => {
          setSearchField('Semua');
          setSearchTerm(q);
          return loadData({ field: 'Semua', term: q, tglFilter: 'Semua' });
        }}
        onRefreshSupabase={() => {
          setSearchField('Semua');
          setSearchTerm('');
          return loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
        }}
        onSelectRow={(f, q) => {
          setSelectedId(f.id);
          setSearchTerm(q);
          showFeedback(`Faktur Penjualan [${f.noBukti} - ${f.namaCustomer}] dipilih`);
        }}
        columns={[
          { header: 'Kode / No.Bukti', accessor: (f) => f.noBukti, widthClass: 'w-28', mono: true, bold: true },
          { header: 'Tanggal', accessor: (f) => f.tanggal, widthClass: 'w-22' },
          { header: 'Nama Customer', accessor: (f) => f.namaCustomer, bold: true },
          { header: 'No.SJ', accessor: (f) => f.noSj || '-', widthClass: 'w-24', mono: true },
          { header: 'No.SO', accessor: (f) => f.noSo || '-', widthClass: 'w-28', mono: true },
          { header: 'PO.No', accessor: (f) => f.poNo || '-', widthClass: 'w-24', mono: true },
          { header: 'Nilai Penjualan', accessor: (f) => f.nilaiPenjualan, widthClass: 'w-28', align: 'right', mono: true },
        ]}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteRow)}
        title="Konfirmasi Hapus Faktur Penjualan"
        message={`Yakin ingin menghapus Faktur Penjualan ${confirmDeleteRow?.noBukti || ''}?`}
        detail={
          confirmDeleteRow
            ? `Customer: ${confirmDeleteRow.namaCustomer}\nNo. SJ / No. SO: ${confirmDeleteRow.noSj || '-'} / ${confirmDeleteRow.noSo || '-'}\nNilai Tagihan: ${formatRupiah(confirmDeleteRow.nilaiPenjualanNum)}`
            : undefined
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isBusy={isBusy}
        danger
        onConfirm={() => confirmDeleteRow && handleDelete(confirmDeleteRow.id)}
        onCancel={() => setConfirmDeleteRow(null)}
      />

      {/* Dual-mode Print Preview: List & Invoice Detail w/ NPWP, Bank, Terbilang */}
      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={
          printMode === 'detail'
            ? 'INVOICE / FAKTUR PENJUALAN'
            : 'LAPORAN LIST FAKTUR PENJUALAN'
        }
        subtitle={
          printMode === 'detail'
            ? `No. Faktur: ${selectedFaktur?.noBukti || '-'} | Pelanggan: ${selectedFaktur?.namaCustomer || '-'}`
            : `Filter Tanggal: ${tanggalFilter}`
        }
        metaLines={
          printMode === 'detail' && selectedFaktur
            ? [
                { label: 'No. Faktur', value: selectedFaktur.noBukti },
                { label: 'Tanggal / Jth.Tmp', value: `${selectedFaktur.tanggal} / ${selectedFaktur.jthTmp || '-'}` },
                { label: 'Nama Customer', value: selectedFaktur.namaCustomer },
                { label: 'NPWP Customer', value: selectedCustMeta?.npwp || '-' },
                { label: 'Alamat Customer', value: selectedCustMeta?.invAlamat || selectedCustMeta?.alamatNpwp || '-' },
                { label: 'No. SJ / No. SO', value: `${selectedFaktur.noSj || '-'} / ${selectedFaktur.noSo || '-'}` },
                { label: 'PO Customer / Pajak', value: `${selectedFaktur.poNo || '-'} / ${selectedFaktur.noFakturPajak || '-'}` },
                {
                  label: 'Rekening Transfer',
                  value: primaryBank
                    ? `${primaryBank.namaBank} ${primaryBank.accNumber} a/n ${primaryBank.accName}`
                    : '-',
                },
                { label: 'Terbilang', value: terbilangRupiah(selectedFaktur.nilaiPenjualanNum) },
              ]
            : []
        }
        orientation="landscape"
        columns={
          printMode === 'detail'
            ? selectedFakturDetails.length > 0
              ? (detailPrintColumns as PrintColumn<any>[])
              : (listPrintColumns as PrintColumn<any>[])
            : (listPrintColumns as PrintColumn<any>[])
        }
        rows={
          printMode === 'detail'
            ? selectedFakturDetails.length > 0
              ? selectedFakturDetails
              : selectedFaktur
              ? [selectedFaktur]
              : []
            : filteredList
        }
        summaryItems={
          printMode === 'detail' && selectedFaktur
            ? [
                { label: 'Subtotal', value: formatRupiah(selectedFaktur.subtotal || selectedDetailTotal) },
                { label: `Diskon (${selectedFaktur.discPct}%)`, value: formatRupiah(selectedFaktur.nilaiDisc) },
                { label: 'DPP', value: formatRupiah(selectedFaktur.dpp) },
                { label: `PPN (${selectedFaktur.ppn})`, value: formatRupiah(selectedFaktur.nilaiPpn) },
                ...(selectedFaktur.totalDp > 0
                  ? [{ label: `Potongan DP (${selectedFaktur.noDp})`, value: `- ${formatRupiah(selectedFaktur.totalDp)}` }]
                  : []),
                { label: 'NET TAGIHAN', value: formatRupiah(selectedFaktur.nilaiPenjualanNum) },
              ]
            : [
                { label: 'Total Faktur Penjualan', value: `${filteredList.length} Dokumen` },
                { label: 'Total Nilai Penjualan', value: formatRupiah(totalNilai) },
              ]
        }
        selectedRow={printMode === 'list' ? selectedFaktur : undefined}
        selectedTitle={printMode === 'list' ? 'FAKTUR PENJUALAN (RECORD TERPILIH)' : undefined}
        selectedSubtitle={
          printMode === 'list' && selectedFaktur
            ? `No. Bukti: ${selectedFaktur.noBukti} | Customer: ${selectedFaktur.namaCustomer}`
            : undefined
        }
        selectedMetaLines={
          printMode === 'list' && selectedFaktur
            ? [
                { label: 'No. Bukti', value: selectedFaktur.noBukti },
                { label: 'Tanggal', value: selectedFaktur.tanggal },
                { label: 'Customer', value: selectedFaktur.namaCustomer },
                { label: 'No. SJ / No. SO', value: `${selectedFaktur.noSj || '-'} / ${selectedFaktur.noSo || '-'}` },
                { label: 'Terbilang', value: terbilangRupiah(selectedFaktur.nilaiPenjualanNum) },
                { label: 'Net Tagihan', value: formatRupiah(selectedFaktur.nilaiPenjualanNum) },
              ]
            : undefined
        }
        toolbarExtra={
          selectedFaktur ? (
            <div className="flex items-center bg-[#111827] border border-gray-600 rounded-[2px] p-0.5 text-[10.5px]">
              <button
                type="button"
                onClick={() => handleOpenPrint('detail')}
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                  printMode === 'detail' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Faktur Terpilih (Detail)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('list')}
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                  printMode === 'list' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                List Faktur
              </button>
            </div>
          ) : undefined
        }
      />
    </div>
  );
};
