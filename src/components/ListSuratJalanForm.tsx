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
  erpUpdate,
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

export interface SalesOrderRef {
  id: string;
  noBukti: string;
  namaCustomer: string;
  sales: string;
  poNo: string;
  lokasiStock: string;
  keterangan: string;
  soClose: string;
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
  stock: number;
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
  namaExpedisi: string;
  noPolisi: string;
  namaSupir: string;
  alamatKirim: string;
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
    namaExpedisi: r.nama_expedisi || '',
    noPolisi: r.no_polisi || '',
    namaSupir: r.nama_supir || '',
    alamatKirim: r.alamat_kirim || '',
    stsPrint: r.sts_print || 'Not Yet',
    tglPrint: toDisplayDMyShort(r.tgl_print) || '',
    stsPost: r.sts_post || 'Posting',
    tglPost: toDisplayDMyShort(r.tgl_post) || '',
    dibuatOleh: r.dibuat_oleh || getCurrentUser().username || 'ADMIN',
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
  Kode: 'no_bukti',
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

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<'list' | 'detail'>('list');
  const [hidePrintPrices, setHidePrintPrices] = useState<boolean>(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [customerAddressMap, setCustomerAddressMap] = useState<Record<string, string>>({});
  const [soOptions, setSoOptions] = useState<SalesOrderRef[]>([]);
  const [fakturOptions, setFakturOptions] = useState<FakturRef[]>([]);
  const [salesOptions, setSalesOptions] = useState<string[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [expedisiOptions, setExpedisiOptions] = useState<string[]>([]);
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
  const [newNamaExpedisi, setNewNamaExpedisi] = useState<string>('');
  const [newNoPolisi, setNewNoPolisi] = useState<string>('');
  const [newNamaSupir, setNewNamaSupir] = useState<string>('');
  const [newAlamatKirim, setNewAlamatKirim] = useState<string>('');
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
    const [custRes, soRes, soDetRes, salesRes, lokasiRes, fakturRes, barangRes, expRes] =
      await Promise.allSettled([
        erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true, limit: 1000 }),
        erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }),
        erpList<any>('sales_order_details', { orderBy: 'no_urut', asc: true, limit: 5000 }),
        erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true, limit: 1000 }),
        erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true, limit: 1000 }),
        erpList<any>('faktur_penjualans', { orderBy: 'tanggal', asc: false, limit: 1000 }).catch(() => []),
        erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 }),
        erpList<any>('master_expedisis', { orderBy: 'nama_expedisi', asc: true, limit: 500 }).catch(() => []),
      ]);

    if (custRes.status === 'fulfilled') {
      const addrMap: Record<string, string> = {};
      const custs = Array.from(
        new Set(
          custRes.value
            .filter((c: any) => c.is_active !== false)
            .map((c: any) => {
              const nm = String(c.nama_customer || '').trim().toUpperCase();
              if (nm && c.alamat) addrMap[nm] = String(c.alamat || '').trim();
              return nm;
            })
            .filter(Boolean)
        )
      );
      setCustomerAddressMap(addrMap);
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
            soClose: String(s.so_close || 'Not Yet').trim(),
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
            .filter((sl: any) => sl.is_active !== false)
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
            .filter((l: any) => l.is_active !== false)
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

    if (expRes.status === 'fulfilled') {
      const exps = Array.from(
        new Set(
          expRes.value
            .filter((x: any) => x.is_active !== false)
            .map((x: any) => String(x.nama_expedisi || x.nama || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setExpedisiOptions(exps);
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
          stock: Number(b.stock || 0),
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
    const selected = sjList.find((s) => s.id === selectedId);
    if (!selected) {
      showFeedback('Pilih baris Surat Jalan yang akan disimpan');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglIso = selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso();
      const existingDetails = sjDetailsMap[selected.id] || [];

      const headerPayload: Record<string, any> = {
        id: selected.id,
        no_bukti: selected.noBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_customer: selected.namaCustomer.trim().toUpperCase(),
        no_so: selected.noSo.trim().toUpperCase(),
        po_no: selected.poNo.trim().toUpperCase(),
        sales: selected.sales.trim().toUpperCase(),
        no_faktur: selected.noFaktur.trim().toUpperCase(),
        keterangan: selected.keterangan.trim(),
        lokasi_stock: selected.lokasiStock.trim().toUpperCase() || '01 - OFFICE',
        nama_expedisi: selected.namaExpedisi.trim().toUpperCase(),
        no_polisi: selected.noPolisi.trim().toUpperCase(),
        nama_supir: selected.namaSupir.trim().toUpperCase(),
        alamat_kirim: selected.alamatKirim.trim(),
        sts_print: selected.stsPrint || 'Not Yet',
        tgl_print: selected.tglPrint && selected.tglPrint !== '-' ? toIsoDate(selected.tglPrint) : null,
        sts_post: selected.stsPost || 'Posting',
        tgl_post: selected.tglPost && selected.tglPost !== '-' ? toIsoDate(selected.tglPost) : null,
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
        'surat-jalan',
        headerPayload,
        detailPayloads
      );
      const savedHeader = mapDbToSj(res.header);
      const savedDetails =
        res.details && res.details.length > 0
          ? res.details.map((d, idx) => mapDbToDetail(d, idx))
          : existingDetails;
      setSjList((prev) => prev.map((item) => (item.id === selected.id ? savedHeader : item)));
      setSjDetailsMap((prev) => ({ ...prev, [savedHeader.id]: savedDetails }));
      showFeedback(
        res.detailWarning
          ? `SJ [${savedHeader.noBukti}] tersimpan (${res.detailWarning})`
          : `Surat Jalan [${savedHeader.noBukti}] tersimpan & stok/SO diperbarui`
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

  const selectedSj = useMemo(
    () => sjList.find((s) => s.id === selectedId) || null,
    [sjList, selectedId]
  );

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

  const handleSelectCustomer = (custName: string) => {
    setNewCustomer(custName);
    if (custName && customerAddressMap[custName]) {
      setNewAlamatKirim(customerAddressMap[custName]);
    }
  };

  const applySalesOrderAutoFill = (rawNoSo: string) => {
    const cleanNoSo = rawNoSo.trim().toUpperCase();
    setNewNoSo(cleanNoSo);
    if (!cleanNoSo) return;

    const matchedSo = soOptions.find((s) => s.noBukti === cleanNoSo);
    if (matchedSo) {
      setNewCustomer(matchedSo.namaCustomer || '');
      if (matchedSo.namaCustomer && customerAddressMap[matchedSo.namaCustomer]) {
        setNewAlamatKirim(customerAddressMap[matchedSo.namaCustomer]);
      }
      setNewPoNo(matchedSo.poNo || '');
      setNewSales(matchedSo.sales || '');
      setNewLokasiStock(matchedSo.lokasiStock || lokasiOptions[0] || '01 - OFFICE');
      setNewKeterangan(matchedSo.keterangan || '');
    }

    const matchedFaktur = fakturOptions.find((f) => f.noSo === cleanNoSo);
    setNewNoFaktur(matchedFaktur ? matchedFaktur.noBukti : '');

    // Auto-fill remaining qty (qty - terima) per SO line item
    const rawItems = soDetailsByNoSoMap[cleanNoSo] || [];
    const remainingItems = rawItems
      .map((d, idx) => {
        const sisaQty = Math.max(0, Number(d.qty || 0) - Number(d.terima || 0));
        const jumlah = sisaQty * d.harga;
        return {
          ...d,
          id: `so-fill-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          noUrut: idx + 1,
          qty: sisaQty,
          terima: sisaQty,
          jumlah,
          total: jumlah,
        };
      })
      .filter((d) => d.qty > 0);

    if (remainingItems.length > 0) {
      setDetailRows(remainingItems);
    } else if (rawItems.length > 0) {
      setDetailRows(
        rawItems.map((d, idx) => ({
          ...d,
          id: `so-fill-${Date.now()}-${idx}`,
          noUrut: idx + 1,
          terima: d.qty,
        }))
      );
      showFeedback(`Seluruh item pada SO [${cleanNoSo}] sudah terkirim penuh`);
    } else {
      setDetailRows([createBlankDetailRow(1)]);
    }
  };

  const handleAddDetailRow = () => {
    setDetailRows((prev) => [...prev, createBlankDetailRow(prev.length + 1)]);
  };

  const handleRemoveDetailRow = (rowId: string) => {
    setDetailRows((prev) =>
      prev.filter((r) => r.id !== rowId).map((r, idx) => ({ ...r, noUrut: idx + 1 }))
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
          terima: qty,
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
          updated.terima = updated.qty;
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
    setNewNamaExpedisi('');
    setNewNoPolisi('');
    setNewNamaSupir('');
    setNewAlamatKirim('');
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
    setNewNamaExpedisi(item.namaExpedisi || '');
    setNewNoPolisi(item.noPolisi || '');
    setNewNamaSupir(item.namaSupir || '');
    setNewAlamatKirim(item.alamatKirim || customerAddressMap[item.namaCustomer] || '');
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

    if (item.noFaktur && item.noFaktur !== '-') {
      showFeedback(`Perhatian: Surat Jalan ini sudah memiliki Faktur [${item.noFaktur}]`);
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
    if (activeDetails.length === 0) {
      setModalError('Minimal 1 item barang pada S.J. Detail wajib diisi.');
      return;
    }

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
        nama_expedisi: newNamaExpedisi.trim().toUpperCase(),
        no_polisi: newNoPolisi.trim().toUpperCase(),
        nama_supir: newNamaSupir.trim().toUpperCase(),
        alamat_kirim: newAlamatKirim.trim(),
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
            : 'Surat Jalan diperbarui & stok/SO disinkronkan'
        );
      } else {
        setSjList((prev) => [savedHeader, ...prev]);
        setSelectedId(savedHeader.id);
        showFeedback(
          res.detailWarning
            ? `Surat Jalan tersimpan (${res.detailWarning})`
            : 'Surat Jalan tersimpan, stok gudang & progres SO diperbarui'
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
      showFeedback('Surat Jalan dihapus & stok/SO dikembalikan');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = sjList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (searchField === 'Kode' || searchField === 'No.Bukti') {
      return matchesMultiKeyword([item.noBukti], searchTerm);
    }
    if (searchField === 'Nama Pelanggan') return matchesMultiKeyword([item.namaCustomer], searchTerm);
    if (searchField === 'No.SO') return matchesMultiKeyword([item.noSo], searchTerm);
    if (searchField === 'PO.NO') return matchesMultiKeyword([item.poNo], searchTerm);
    if (searchField === 'Sales') return matchesMultiKeyword([item.sales], searchTerm);
    if (searchField === 'No.Faktur') return matchesMultiKeyword([item.noFaktur], searchTerm);
    if (searchField === 'Lokasi Stock') return matchesMultiKeyword([item.lokasiStock], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
    if (searchField === 'Sts.Post') return matchesMultiKeyword([item.stsPost], searchTerm);
    return matchesMultiKeyword(
      [
        item.noBukti,
        item.tanggal,
        item.namaCustomer,
        item.noSo,
        item.poNo,
        item.sales,
        item.noFaktur,
        item.lokasiStock,
        item.namaExpedisi,
        item.noPolisi,
        item.namaSupir,
        item.keterangan,
        item.stsPost,
      ],
      searchTerm
    );
  });

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
    setTanggalFilter('Semua');
    const rows = await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
    if (rows) {
      showFeedback(`Filter direset (${rows.length} Surat Jalan)`);
    }
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
  };

  const handleOpenPrint = (mode?: 'list' | 'detail') => {
    const nextMode = mode ?? (selectedSj ? 'detail' : 'list');
    setPrintMode(nextMode);
    setIsPrintOpen(true);

    if (nextMode === 'detail' && selectedSj && selectedSj.stsPrint !== 'Printed') {
      const todayIsoStr = todayIso();
      const todayDisp = toDisplayDMyShort(todayIsoStr);
      erpUpdate('surat_jalans', selectedSj.id, {
        sts_print: 'Printed',
        tgl_print: todayIsoStr,
      })
        .then(() => {
          setSjList((prev) =>
            prev.map((row) =>
              row.id === selectedSj.id ? { ...row, stsPrint: 'Printed', tglPrint: todayDisp } : row
            )
          );
        })
        .catch(() => {});
    }
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
        { header: 'Ekspedisi', accessor: 'namaExpedisi' },
        { header: 'No. Polisi', accessor: 'noPolisi' },
        { header: 'Supir', accessor: 'namaSupir' },
        { header: 'Lokasi Stock', accessor: 'lokasiStock' },
        { header: 'Sts.Post', accessor: 'stsPost', align: 'center' },
        { header: 'Keterangan', accessor: 'keterangan' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const customerDropdownChoices = Array.from(
    new Set([...customerOptions, newCustomer.trim().toUpperCase()].filter(Boolean))
  );

  // Filter Open SOs for new SJ; keep current SO when editing
  const soDropdownChoices = Array.from(
    new Set(
      [
        ...soOptions
          .filter((s) => s.soClose.toUpperCase() !== 'CLOSED' || s.noBukti === newNoSo.trim().toUpperCase())
          .map((s) => s.noBukti),
        newNoSo.trim().toUpperCase(),
      ].filter(Boolean)
    )
  );

  const salesDropdownChoices = Array.from(
    new Set([...salesOptions, newSales.trim().toUpperCase()].filter(Boolean))
  );

  const lokasiDropdownChoices = Array.from(
    new Set(['01 - OFFICE', ...lokasiOptions, newLokasiStock.trim().toUpperCase()].filter(Boolean))
  );

  const expedisiDropdownChoices = Array.from(
    new Set([...expedisiOptions, newNamaExpedisi.trim().toUpperCase()].filter(Boolean))
  );

  const listPrintColumns: PrintColumn<SuratJalanItem>[] = [
    { header: 'No.Bukti', accessor: 'noBukti', width: '92px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '64px' },
    { header: 'Nama Customer', accessor: 'namaCustomer', width: '132px' },
    { header: 'No.SO', accessor: 'noSo', width: '88px' },
    { header: 'PO.NO', accessor: 'poNo', width: '78px' },
    { header: 'Sales', accessor: 'sales', width: '64px' },
    { header: 'No.Faktur', accessor: 'noFaktur', width: '84px' },
    { header: 'Ekspedisi', accessor: (r) => r.namaExpedisi || '-', width: '82px' },
    { header: 'Lokasi Stock', accessor: 'lokasiStock', width: '80px' },
    { header: 'Sts.Post', accessor: 'stsPost', align: 'center', width: '54px' },
  ];

  const detailPrintColumns: PrintColumn<SuratJalanDetailItem>[] = hidePrintPrices
    ? [
        { header: 'Kode', accessor: 'kode', width: '92px' },
        { header: 'Nama Barang', accessor: 'namaBarang' },
        { header: 'Unit', accessor: 'unit', align: 'center', width: '52px' },
        {
          header: 'Qty Kirim',
          accessor: (r) => formatMoney(r.qty),
          align: 'right',
          width: '90px',
        },
        {
          header: 'Diterima',
          accessor: (r) => formatMoney(r.terima),
          align: 'right',
          width: '90px',
        },
      ]
    : [
        { header: 'Kode', accessor: 'kode', width: '70px' },
        { header: 'Nama Barang', accessor: 'namaBarang' },
        { header: 'Unit', accessor: 'unit', align: 'center', width: '38px' },
        {
          header: 'Terima',
          accessor: (r) => formatMoney(r.terima),
          align: 'right',
          width: '48px',
        },
        {
          header: 'QTY',
          accessor: (r) => formatMoney(r.qty),
          align: 'right',
          width: '48px',
        },
        {
          header: 'Harga',
          accessor: (r) => formatMoney(r.harga),
          align: 'right',
          width: '80px',
        },
        {
          header: 'Jumlah',
          accessor: (r) => formatMoney(r.jumlah),
          align: 'right',
          width: '86px',
        },
        {
          header: 'Total',
          accessor: (r) => formatMoney(r.total),
          align: 'right',
          width: '88px',
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
            onHapus={() => {
              const item = sjList.find((s) => s.id === selectedId);
              if (!item) {
                showFeedback('Pilih data yang akan dihapus');
                return;
              }
              if (item.noFaktur && item.noFaktur !== '-') {
                showFeedback(
                  `Tidak bisa hapus: Surat Jalan [${item.noBukti}] sudah ditagih di Faktur [${item.noFaktur}]`
                );
                return;
              }
              setConfirmDeleteRow(item);
            }}
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

      {/* Upper Table */}
      <div className="flex-[1.35] min-h-[160px] overflow-auto bg-white border border-[#7A7A7A] mx-2 mt-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1680px]">
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
              <th className="border-r border-[#919191] px-3 py-1.5">Ekspedisi</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Pol / Supir</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Lokasi Stock</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Post</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Dibuat Oleh</th>
              <th className="px-3 py-1.5">Tgl.Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item, index) => {
              const isSelected = selectedId === item.id;
              const supirInfo = [item.noPolisi, item.namaSupir].filter(Boolean).join(' / ') || '-';
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
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.namaExpedisi || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{supirInfo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.lokasiStock}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 whitespace-pre-line align-top">{item.keterangan || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.stsPrint}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.stsPost}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.dibuatOleh}</td>
                  <td className="px-3 py-1">{item.tglCreated}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={16} className="text-center py-6 text-gray-500">
                  Tidak ada data surat jalan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lower Panel: S.J. Detail */}
      <div className="flex-1 min-h-[145px] flex flex-col mx-2 mt-1.5 mb-1 border border-[#7A7A7A] bg-white shadow-inner overflow-hidden">
        <div className="shrink-0 bg-[#E6E3D5] border-b border-[#ACA899] px-2.5 py-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-[#003C74] whitespace-nowrap">S.J. Detail</span>
            {selectedSj ? (
              <span className="text-[11px] text-gray-800 truncate">
                No. Bukti: <b className="font-mono">{selectedSj.noBukti}</b> | No. SO:{' '}
                <b className="font-mono text-[#000084]">{selectedSj.noSo || '-'}</b> | Customer:{' '}
                <b>{selectedSj.namaCustomer}</b>
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
                Print Surat Jalan
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
            { value: 'Nama Pelanggan', label: 'Nama Pelanggan' },
            { value: 'No.SO', label: 'No.SO' },
            { value: 'PO.NO', label: 'PO.NO' },
            { value: 'Sales', label: 'Sales' },
            { value: 'No.Faktur', label: 'No.Faktur' },
            { value: 'Lokasi Stock', label: 'Lokasi Stock' },
            { value: 'Keterangan', label: 'Keterangan' },
            { value: 'Sts.Post', label: 'Sts.Post' },
          ]}
        />
        <div className="flex items-center space-x-4 shrink-0">
          <div className="w-60 h-5 bg-[#FFFF00] border border-[#919191] shadow-inner px-2 text-[10px] flex items-center text-black truncate">
            {selectedSj ? `${selectedSj.noBukti} - ${selectedSj.namaCustomer}` : ''}
          </div>
          <div className="font-semibold px-2 py-0.5 bg-[#ECE9D8] border border-[#919191]">
            Record {filteredList.length}
          </div>
        </div>
      </div>

      {/* Add / Koreksi Modal */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">No. Bukti SJ:</label>
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
                  <label className="font-semibold shrink-0 text-[#000084]">
                    No. SO (Open SO Auto-Fill):
                  </label>
                  <div className="w-64 flex gap-1">
                    <select
                      value={newNoSo}
                      onChange={(e) => applySalesOrderAutoFill(e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1 bg-[#FFFF99] border border-[#000084] font-mono font-semibold uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih No. SO Open --</option>
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
                        title="Muat ulang sisa qty dari No. SO"
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
                  <label className="font-semibold shrink-0">PO.NO / Sales:</label>
                  <div className="w-64 grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={newPoNo}
                      onChange={(e) => setNewPoNo(e.target.value.toUpperCase())}
                      placeholder="PO.NO"
                      className="px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                    />
                    <select
                      value={newSales}
                      onChange={(e) => setNewSales(e.target.value)}
                      className="px-1.5 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    >
                      <option value="">-- Sales --</option>
                      {salesDropdownChoices.map((sl) => (
                        <option key={sl} value={sl}>
                          {sl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Lokasi Stock / No. Faktur:</label>
                  <div className="w-64 grid grid-cols-2 gap-1.5">
                    <select
                      value={newLokasiStock}
                      onChange={(e) => setNewLokasiStock(e.target.value)}
                      className="px-1.5 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    >
                      {lokasiDropdownChoices.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newNoFaktur}
                      onChange={(e) => setNewNoFaktur(e.target.value.toUpperCase())}
                      placeholder="No. Faktur"
                      className="px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Ekspedisi / No. Polisi:</label>
                  <div className="w-64 grid grid-cols-2 gap-1.5">
                    <select
                      value={newNamaExpedisi}
                      onChange={(e) => setNewNamaExpedisi(e.target.value)}
                      className="px-1.5 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                    >
                      <option value="">-- Ekspedisi --</option>
                      {expedisiDropdownChoices.map((ex) => (
                        <option key={ex} value={ex}>
                          {ex}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newNoPolisi}
                      onChange={(e) => setNewNoPolisi(e.target.value.toUpperCase())}
                      placeholder="B 1234 XYZ"
                      className="px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Nama Supir:</label>
                  <input
                    type="text"
                    value={newNamaSupir}
                    onChange={(e) => setNewNamaSupir(e.target.value.toUpperCase())}
                    placeholder="Nama Pengemudi / Kurir"
                    className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Sts.Post / Tgl.Post:</label>
                  <div className="w-64 grid grid-cols-2 gap-1.5">
                    <select
                      value={newStsPost}
                      onChange={(e) => setNewStsPost(e.target.value)}
                      className="px-1.5 py-1 bg-white border border-[#7A7A7A] font-semibold"
                    >
                      <option value="Not Yet">Not Yet (Draft)</option>
                      <option value="Posting">Posting (Potong Stok)</option>
                    </select>
                    <DatePickerInput
                      value={newTglPost}
                      onChange={(formatted) => setNewTglPost(formatted)}
                      format="dMyShort"
                      placeholder="Tgl Post"
                    />
                  </div>
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

                <div className="md:col-span-2 flex items-center justify-between gap-2">
                  <label className="font-semibold shrink-0">Alamat Pengiriman:</label>
                  <input
                    type="text"
                    value={newAlamatKirim}
                    onChange={(e) => setNewAlamatKirim(e.target.value)}
                    placeholder="Otomatis dari Master Customer atau ketik alamat tujuan..."
                    className="flex-1 max-w-[730px] px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>

                <div className="md:col-span-2 flex items-start justify-between gap-2">
                  <label className="font-semibold shrink-0 pt-1">Keterangan:</label>
                  <textarea
                    rows={3}
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    placeholder="Otomatis dari No. SO atau ketik manual (mendukung baris penomoran)..."
                    className="flex-1 max-w-[730px] px-2 py-1 bg-white border border-[#7A7A7A] resize-y leading-snug"
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
                        ? `(Terhubung SO: ${newNoSo} — Posting memotong stok gudang & update progres SO)`
                        : '(Pilih No. SO di atas untuk muat sisa pengiriman otomatis)'}
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
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-16">QTY Kirim</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-24">Harga</th>
                        <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-24">Total</th>
                        <th className="px-1.5 py-1 text-center w-10">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-4 text-gray-500 italic text-[11px]">
                            Belum ada item S.J. Detail. Pilih No. SO atau klik "+ Tambah Baris".
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
                                        {b ? `${kode} - ${b.namaBarang} (Stok: ${b.stock})` : kode}
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

      {/* Find Modal */}
      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Surat Jalan"
        rows={sjList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.noBukti,
          r.tanggal,
          r.namaCustomer,
          r.noSo,
          r.poNo,
          r.sales,
          r.noFaktur,
          r.lokasiStock,
          r.namaExpedisi,
          r.keterangan,
          r.stsPost,
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
          showFeedback(`Surat Jalan [${row.noBukti} - ${row.namaCustomer}] dipilih`);
        }}
        columns={[
          { header: 'Kode / No.Bukti', accessor: (r) => r.noBukti, widthClass: 'w-28', mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal, widthClass: 'w-22', align: 'center' },
          { header: 'Nama Customer', accessor: (r) => r.namaCustomer, bold: true },
          { header: 'No.SO', accessor: (r) => r.noSo || '-', widthClass: 'w-28', mono: true },
          { header: 'PO.NO', accessor: (r) => r.poNo || '-', widthClass: 'w-24', mono: true },
          { header: 'No.Faktur', accessor: (r) => r.noFaktur || '-', widthClass: 'w-28', mono: true },
          { header: 'Ekspedisi', accessor: (r) => r.namaExpedisi || '-', widthClass: 'w-24' },
        ]}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteRow)}
        title="Konfirmasi Hapus Surat Jalan"
        message={`Yakin ingin menghapus Surat Jalan [${confirmDeleteRow?.noBukti || ''}]?`}
        detail={
          confirmDeleteRow
            ? `Customer: ${confirmDeleteRow.namaCustomer}\nNo. SO: ${confirmDeleteRow.noSo || '-'}\nStok gudang dan status SO akan disinkronkan ulang.`
            : undefined
        }
        confirmLabel="Ya, Hapus"
        isBusy={isBusy}
        onConfirm={() => confirmDeleteRow && handleDelete(confirmDeleteRow.id)}
        onCancel={() => setConfirmDeleteRow(null)}
      />

      {/* Dual-mode Print Preview */}
      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={printMode === 'detail' ? 'SURAT JALAN (DELIVERY ORDER)' : 'LAPORAN LIST SURAT JALAN (DO)'}
        subtitle={
          printMode === 'detail'
            ? `No. Surat Jalan: ${selectedSj?.noBukti || '-'} | Customer: ${selectedSj?.namaCustomer || '-'}`
            : `Filter Tanggal: ${tanggalFilter}`
        }
        metaLines={
          printMode === 'detail' && selectedSj
            ? [
                { label: 'No. Surat Jalan', value: selectedSj.noBukti },
                { label: 'Tanggal', value: selectedSj.tanggal },
                { label: 'Kepada Yth.', value: selectedSj.namaCustomer },
                { label: 'Alamat Kirim', value: selectedSj.alamatKirim || customerAddressMap[selectedSj.namaCustomer] || '-' },
                { label: 'No. SO / PO Customer', value: `${selectedSj.noSo || '-'} / ${selectedSj.poNo || '-'}` },
                {
                  label: 'Ekspedisi / Kendaraan',
                  value: [selectedSj.namaExpedisi, selectedSj.noPolisi, selectedSj.namaSupir]
                    .filter(Boolean)
                    .join(' | ') || '-',
                },
                { label: 'Lokasi Gudang', value: selectedSj.lokasiStock || '-' },
                { label: 'Keterangan', value: selectedSj.keterangan || '-' },
              ]
            : []
        }
        showSignatures={printMode === 'detail'}
        orientation={printMode === 'detail' ? 'portrait' : 'landscape'}
        toolbarExtra={
          <div className="flex items-center gap-2">
            {selectedSj && (
              <button
                type="button"
                onClick={() => setPrintMode((m) => (m === 'list' ? 'detail' : 'list'))}
                className="h-[26px] px-2.5 bg-[#374151] hover:bg-[#4B5563] border border-gray-500 text-white text-[10.5px] font-medium rounded-[2px] cursor-pointer"
              >
                Tampilan: {printMode === 'list' ? 'List Surat Jalan' : 'Surat Jalan Detail'}
              </button>
            )}
            {printMode === 'detail' && (
              <button
                type="button"
                onClick={() => setHidePrintPrices((v) => !v)}
                className={`h-[26px] px-2.5 border text-white text-[10.5px] font-medium rounded-[2px] cursor-pointer ${
                  hidePrintPrices
                    ? 'bg-[#065F46] border-emerald-500'
                    : 'bg-[#1E3A8A] border-blue-500'
                }`}
              >
                {hidePrintPrices ? 'Tanpa Harga (Aktif)' : 'Tampilkan Harga'}
              </button>
            )}
          </div>
        }
        columns={
          printMode === 'detail'
            ? selectedSjDetails.length > 0
              ? (detailPrintColumns as PrintColumn<any>[])
              : (listPrintColumns as PrintColumn<any>[])
            : (listPrintColumns as PrintColumn<any>[])
        }
        rows={
          printMode === 'detail'
            ? selectedSjDetails.length > 0
              ? selectedSjDetails
              : selectedSj
              ? [selectedSj]
              : []
            : filteredList
        }
        fileName={
          printMode === 'detail'
            ? `Surat_Jalan_Detail_${selectedSj?.noBukti || 'DO'}`
            : 'List_Surat_Jalan'
        }
        summaryItems={
          printMode === 'detail'
            ? hidePrintPrices
              ? [
                  { label: 'Jumlah Jenis Barang', value: `${selectedSjDetails.length} Item` },
                  { label: 'Total Qty Kirim', value: formatMoney(selectedDetailQty) },
                  { label: 'Tanda Tangan', value: 'Gudang / Supir / Penerima' },
                ]
              : [
                  { label: 'Jumlah Item', value: `${selectedSjDetails.length} Item` },
                  { label: 'Total QTY', value: formatMoney(selectedDetailQty) },
                  { label: 'Total Nilai SJ', value: formatRupiah(selectedDetailTotal) },
                ]
            : [{ label: 'Total Surat Jalan', value: `${filteredList.length} Dokumen` }]
        }
        selectedRow={printMode === 'list' ? selectedSj : undefined}
        selectedTitle={printMode === 'list' ? 'SURAT JALAN (RECORD TERPILIH)' : undefined}
        selectedSubtitle={
          printMode === 'list' && selectedSj
            ? `No. Bukti: ${selectedSj.noBukti} | Customer: ${selectedSj.namaCustomer}`
            : undefined
        }
        selectedMetaLines={
          printMode === 'list' && selectedSj
            ? [
                { label: 'No. Bukti', value: selectedSj.noBukti },
                { label: 'Tanggal', value: selectedSj.tanggal },
                { label: 'Customer', value: selectedSj.namaCustomer },
                { label: 'No. SO', value: selectedSj.noSo || '-' },
                { label: 'PO.NO', value: selectedSj.poNo || '-' },
                { label: 'No. Faktur', value: selectedSj.noFaktur || '-' },
              ]
            : undefined
        }
      />
    </div>
  );
};
