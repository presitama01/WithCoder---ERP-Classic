import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
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
import { WORLD_CURRENCIES } from '../lib/currencies';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface PembelianDetailItem {
  id: string;
  pembelianId?: string;
  noUrut: number;
  kode: string;
  namaBarang: string;
  unit: string;
  terima: number;
  qty: number;
  harga: number;
  jumlah: number;
  total: number;
  poQty?: number;
  poTerima?: number;
}

export interface PembelianItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaSupplier: string;
  noPo: string;
  noFaktur: string;
  mataUang: string;
  keterangan: string;
  ppn: string;
  ppnPct: number;
  nilaiPpn: string;
  nilaiPpnNum: number;
  nilaiPembelian: string;
  nilaiPembelianNum: number;
  jthTmp: string;
  stsLunas: string;
  tglLunas: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

export interface PurchaseOrderRef {
  id: string;
  noBukti: string;
  namaSupplier: string;
  mataUang: string;
  ppn: number;
  nilaiPpn: number;
  keterangan: string;
  nilaiPo: number;
  poClose: string;
}

interface MasterBarangOption {
  kode: string;
  namaBarang: string;
  unit: string;
  cost: number;
}

interface MasterSupplierMeta {
  namaSupplier: string;
  mataUang: string;
  tmpPembayaran: number;
}

interface ListPembelianFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function calcPpnDeduction(
  grossTotal: number,
  ppnPct: number
): { nominalPpn: number; netNilai: number } {
  const safeGross = Math.max(0, Number(grossTotal || 0));
  const safePct = Math.max(0, Number(ppnPct || 0));
  const nominalPpn = Number(((safeGross * safePct) / 100).toFixed(2));
  const netNilai = Math.max(0, Number((safeGross - nominalPpn).toFixed(2)));
  return { nominalPpn, netNilai };
}

function mapDbToPembelian(r: any): PembelianItem {
  const valNum = Number(r.nilai_pembelian || 0);
  const ppnPct = Number(r.ppn ?? 0);
  const nilaiPpnNum = Number(r.nilai_ppn || 0);
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaSupplier: r.nama_supplier || '',
    noPo: r.no_po || '-',
    noFaktur: r.no_faktur || '-',
    mataUang: String(r.mata_uang || 'IDR').trim().toUpperCase() || 'IDR',
    keterangan: r.keterangan || '',
    ppn: `${ppnPct}%`,
    ppnPct,
    nilaiPpn: formatMoney(nilaiPpnNum),
    nilaiPpnNum,
    nilaiPembelian: formatMoney(valNum),
    nilaiPembelianNum: valNum,
    jthTmp: toDisplayDMyShort(r.jth_tmp) || '-',
    stsLunas: r.sts_lunas || 'Belum',
    tglLunas: toDisplayDMyShort(r.tgl_lunas) || '-',
    stsPost: r.sts_post || 'Posted',
    tglPost: toDisplayDMyShort(r.tgl_post) || '-',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

function mapDbToDetail(d: any, idx = 0): PembelianDetailItem {
  const qty = Number(d.qty || 0);
  const harga = Number(d.harga || 0);
  const jumlah = d.jumlah !== undefined && d.jumlah !== null ? Number(d.jumlah) : qty * harga;
  const total = d.total !== undefined && d.total !== null ? Number(d.total) : jumlah;
  return {
    id: d.id || `det-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    pembelianId: d.pembelian_id,
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

function createBlankDetailRow(noUrut: number): PembelianDetailItem {
  return {
    id: `new-${Date.now()}-${noUrut}-${Math.random().toString(36).slice(2, 6)}`,
    noUrut,
    kode: '',
    namaBarang: '',
    unit: 'PCS',
    terima: 1,
    qty: 1,
    harga: 0,
    jumlah: 0,
    total: 0,
  };
}

export const ListPembelianForm: React.FC<ListPembelianFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [pembelianList, setPembelianList] = useState<PembelianItem[]>([]);
  const [pembelianDetailsMap, setPembelianDetailsMap] = useState<Record<string, PembelianDetailItem[]>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [supplierMetaMap, setSupplierMetaMap] = useState<Record<string, MasterSupplierMeta>>({});
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);
  const [poOptions, setPoOptions] = useState<PurchaseOrderRef[]>([]);
  const [poDetailsByNoPoMap, setPoDetailsByNoPoMap] = useState<Record<string, PembelianDetailItem[]>>({});

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newSupplier, setNewSupplier] = useState<string>('');
  const [newNoPo, setNewNoPo] = useState<string>('');
  const [newNoFaktur, setNewNoFaktur] = useState<string>('');
  const [newMataUang, setNewMataUang] = useState<string>('IDR');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newPpn, setNewPpn] = useState<string>('11');
  const [newNilaiPpn, setNewNilaiPpn] = useState<string>('0');
  const [ppnManualOverride, setPpnManualOverride] = useState<boolean>(false);
  const [newNilai, setNewNilai] = useState<string>('0');
  const [newJthTmp, setNewJthTmp] = useState<string>('');
  const [newStsLunas, setNewStsLunas] = useState<string>('Belum');
  const [newTglLunas, setNewTglLunas] = useState<string>('');
  const [newStsPost, setNewStsPost] = useState<string>('Posted');
  const [newTglPost, setNewTglPost] = useState<string>('');

  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');

  const [detailRows, setDetailRows] = useState<PembelianDetailItem[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<'list' | 'detail'>('list');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadMasterReferences = async () => {
    const [suppRes, barangRes, poRes, poDetRes] = await Promise.allSettled([
      erpList<any>('master_suppliers', { orderBy: 'nama_supplier', asc: true, limit: 1000 }),
      erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 }),
      erpList<any>('purchase_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }),
      erpList<any>('purchase_order_details', { orderBy: 'no_urut', asc: true, limit: 5000 }),
    ]);

    if (suppRes.status === 'fulfilled') {
      const metaMap: Record<string, MasterSupplierMeta> = {};
      const activeSupps = suppRes.value.filter((s: any) => s.is_active !== false);
      const supps = Array.from(
        new Set(
          activeSupps
            .map((s: any) => {
              const nm = String(s.nama_supplier || '').trim().toUpperCase();
              if (nm) {
                metaMap[nm] = {
                  namaSupplier: nm,
                  mataUang: String(s.mata_uang || 'IDR').trim().toUpperCase() || 'IDR',
                  tmpPembayaran: Math.max(0, Number(s.tmp_pembayaran || 0)),
                };
              }
              return nm;
            })
            .filter(Boolean)
        )
      );
      setSupplierMetaMap(metaMap);
      setSupplierOptions(supps);
    }

    if (barangRes.status === 'fulfilled') {
      const mapped: MasterBarangOption[] = barangRes.value
        .filter((r: any) => r.is_active !== false)
        .map((r: any) => ({
          kode: String(r.kode || '').trim().toUpperCase(),
          namaBarang: String(r.nama_barang || '').trim(),
          unit: String(r.unit || 'PCS').trim().toUpperCase(),
          cost: Number(r.cost || 0),
        }))
        .filter((b: MasterBarangOption) => b.kode);
      setBarangOptions(mapped);
    }

    const poIdToNoBukti = new Map<string, string>();
    if (poRes.status === 'fulfilled') {
      const pos: PurchaseOrderRef[] = poRes.value
        .map((p: any) => {
          const noBukti = String(p.no_bukti || '').trim().toUpperCase();
          if (noBukti) poIdToNoBukti.set(String(p.id), noBukti);
          return {
            id: String(p.id || ''),
            noBukti,
            namaSupplier: String(p.nama_supplier || '').trim().toUpperCase(),
            mataUang: String(p.mata_uang || 'IDR').trim().toUpperCase() || 'IDR',
            ppn: Number(p.ppn ?? 0),
            nilaiPpn: Number(p.nilai_ppn || 0),
            keterangan: String(p.keterangan || '').trim(),
            nilaiPo: Number(p.nilai_po || 0),
            poClose: String(p.po_close || 'Not Yet').trim(),
          };
        })
        .filter((p: PurchaseOrderRef) => p.noBukti);
      setPoOptions(pos);
    }

    if (poDetRes.status === 'fulfilled') {
      const grouped: Record<string, PembelianDetailItem[]> = {};
      for (const raw of poDetRes.value) {
        const mapped = mapDbToDetail(raw, 0);
        mapped.poQty = Number(raw.qty || 0);
        mapped.poTerima = Number(raw.terima || 0);
        const keys = Array.from(
          new Set(
            [
              String(raw.no_bukti || '').trim().toUpperCase(),
              poIdToNoBukti.get(String(raw.po_id || '')) || '',
            ].filter(Boolean)
          )
        );
        for (const k of keys) {
          if (!grouped[k]) grouped[k] = [];
          grouped[k].push({ ...mapped, noUrut: grouped[k].length + 1 });
        }
      }
      setPoDetailsByNoPoMap(grouped);
    }
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'no_bukti',
    'No.Bukti': 'no_bukti',
    'Nama Supplier': 'nama_supplier',
    'No.PO': 'no_po',
    'No.Faktur Pembelian': 'no_faktur',
    'Mata Uang': 'mata_uang',
    Keterangan: 'keterangan',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
    tglFilter?: string;
  }): Promise<PembelianItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const activeTgl = opts?.tglFilter ?? tanggalFilter;
      const isoFilter = activeTgl && activeTgl !== 'Semua' ? toIsoDate(activeTgl) : null;

      const queryOpts: Record<string, any> = { orderBy: 'tanggal', asc: false, limit: 1000 };
      if (isoFilter) queryOpts.eq = { tanggal: isoFilter };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'no_bukti,nama_supplier,no_po,no_faktur,keterangan';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows, detRows] = await Promise.all([
        erpList<any>('pembelian_barangs', queryOpts),
        erpList<any>('pembelian_barang_details', { orderBy: 'no_urut', asc: true }).catch(() => []),
        loadMasterReferences(),
      ]);

      const mappedDetails: Record<string, PembelianDetailItem[]> = {};
      for (const d of detRows) {
        const pId = String(d.pembelian_id || '');
        if (!mappedDetails[pId]) mappedDetails[pId] = [];
        mappedDetails[pId].push(mapDbToDetail(d, mappedDetails[pId].length));
      }
      setPembelianDetailsMap(mappedDetails);

      const mapped = rows.map(mapDbToPembelian);
      setPembelianList(mapped);
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
    const selected = pembelianList.find((p) => p.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record Pembelian terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const details = pembelianDetailsMap[selected.id] || [];
      const headerPayload: Record<string, any> = {
        id: selected.id,
        no_bukti: selected.noBukti.trim().toUpperCase(),
        tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
        nama_supplier: selected.namaSupplier.trim().toUpperCase(),
        no_po: selected.noPo.trim().toUpperCase() || '-',
        no_faktur: selected.noFaktur.trim().toUpperCase(),
        mata_uang: selected.mataUang.trim().toUpperCase() || 'IDR',
        keterangan: selected.keterangan.trim(),
        ppn: selected.ppnPct,
        nilai_ppn: selected.nilaiPpnNum,
        nilai_pembelian: selected.nilaiPembelianNum,
        jth_tmp: selected.jthTmp !== '-' ? toIsoDate(selected.jthTmp) : null,
        sts_lunas: selected.stsLunas,
        tgl_lunas: selected.tglLunas !== '-' ? toIsoDate(selected.tglLunas) : null,
        sts_post: selected.stsPost,
        tgl_post: selected.tglPost !== '-' ? toIsoDate(selected.tglPost) : null,
        dibuat_oleh: selected.dibuatOleh.trim().toUpperCase() || currentUser,
        diupdate_oleh: currentUser,
        tgl_update: todayIso(),
      };
      const detailsPayload = details.map((d, idx) => ({
        no_urut: idx + 1,
        kode: d.kode.trim().toUpperCase(),
        nama_barang: d.namaBarang.trim(),
        unit: d.unit.trim().toUpperCase() || 'PCS',
        terima: Number(d.terima || 0),
        qty: Number(d.qty || 1),
        harga: Number(d.harga || 0),
        jumlah: Number(d.jumlah || 0),
        total: Number(d.total || 0),
      }));
      const saved = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'pembelian',
        headerPayload,
        detailsPayload
      );
      const mapped = mapDbToPembelian(saved.header);
      const mappedDet = (saved.details || []).map((d: any, idx: number) => mapDbToDetail(d, idx));
      setPembelianList((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
      setPembelianDetailsMap((prev) => ({ ...prev, [mapped.id]: mappedDet }));
      setSelectedId(mapped.id);
      await loadMasterReferences();
      showFeedback(
        saved.detailWarning
          ? saved.detailWarning
          : `Pembelian [${mapped.noBukti}] tersimpan (Stok, PO & HPP disinkronkan)`
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

  const modalDetailTotal = useMemo(
    () => detailRows.reduce((acc, r) => acc + r.total, 0),
    [detailRows]
  );

  const hasFilledDetailRows = useMemo(
    () => detailRows.some((r) => r.kode.trim() !== '' || r.namaBarang.trim() !== ''),
    [detailRows]
  );

  const selectedPembelian = useMemo(
    () => pembelianList.find((p) => p.id === selectedId) || null,
    [pembelianList, selectedId]
  );

  const selectedPembelianDetails = useMemo(
    () => (selectedPembelian ? pembelianDetailsMap[selectedPembelian.id] || [] : []),
    [pembelianDetailsMap, selectedPembelian]
  );

  const selectedDetailTotal = useMemo(
    () => selectedPembelianDetails.reduce((acc, d) => acc + d.total, 0),
    [selectedPembelianDetails]
  );

  if (!isOpen) return null;

  const updateDetailRowsWithSync = (
    updater: (prev: PembelianDetailItem[]) => PembelianDetailItem[],
    overridePpnPct?: number
  ) => {
    setDetailRows((prev) => {
      const next = updater(prev);
      const hasRows = next.some((r) => r.kode.trim() !== '' || r.namaBarang.trim() !== '');
      if (hasRows) {
        const sum = next.reduce((acc, r) => acc + r.total, 0);
        const pct = overridePpnPct !== undefined ? overridePpnPct : parseNum(newPpn);
        if (ppnManualOverride && overridePpnPct === undefined) {
          const manualPpn = Math.max(0, parseNum(newNilaiPpn));
          setNewNilai(String(Math.max(0, Number((sum - manualPpn).toFixed(2)))));
        } else {
          const { nominalPpn, netNilai } = calcPpnDeduction(sum, pct);
          setNewNilaiPpn(String(nominalPpn));
          setNewNilai(String(netNilai));
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
      const { nominalPpn, netNilai } = calcPpnDeduction(modalDetailTotal, pct);
      setNewNilaiPpn(String(nominalPpn));
      setNewNilai(String(netNilai));
    } else {
      const currentNilai = parseNum(newNilai);
      setNewNilaiPpn(String(Number(((Math.max(0, currentNilai) * Math.max(0, pct)) / 100).toFixed(2))));
    }
  };

  const handleManualNilaiPpnChange = (rawVal: string) => {
    setNewNilaiPpn(rawVal);
    setPpnManualOverride(true);
    if (hasFilledDetailRows) {
      const manualPpn = Math.max(0, parseNum(rawVal));
      setNewNilai(String(Math.max(0, Number((modalDetailTotal - manualPpn).toFixed(2)))));
    }
  };

  const handleSelectBarang = (rowIndex: number, selectedKode: string) => {
    const cleanKode = selectedKode.trim().toUpperCase();
    const found = barangOptions.find((b) => b.kode === cleanKode);
    updateDetailRowsWithSync((prev) =>
      prev.map((r, i) => {
        if (i !== rowIndex) return r;
        const harga = found ? (r.harga > 0 && r.kode === cleanKode ? r.harga : found.cost) : r.harga;
        const qty = r.qty || 1;
        const terima = r.terima > 0 ? r.terima : qty;
        const jumlah = qty * harga;
        return {
          ...r,
          kode: cleanKode,
          namaBarang: found ? found.namaBarang : r.namaBarang,
          unit: found ? found.unit : r.unit,
          qty,
          terima,
          harga,
          jumlah,
          total: jumlah,
        };
      })
    );
  };

  const applyPurchaseOrderAutoFill = (rawNoPo: string) => {
    const cleanNoPo = rawNoPo.trim().toUpperCase();
    setNewNoPo(cleanNoPo);
    if (!cleanNoPo) return;

    const matchedPo = poOptions.find((p) => p.noBukti === cleanNoPo);
    const targetPpn = matchedPo ? matchedPo.ppn : parseNum(newPpn);
    if (matchedPo) {
      if (matchedPo.namaSupplier) {
        setNewSupplier(matchedPo.namaSupplier);
        const suppMeta = supplierMetaMap[matchedPo.namaSupplier.trim().toUpperCase()];
        if (suppMeta && suppMeta.tmpPembayaran > 0) {
          const baseDateIso = toIsoDate(newTanggal) || todayIso();
          setNewJthTmp(toDisplayDMyShort(addDaysToIsoDate(baseDateIso, suppMeta.tmpPembayaran)));
        }
      }
      if (matchedPo.mataUang) setNewMataUang(matchedPo.mataUang);
      setNewPpn(String(matchedPo.ppn));
      setPpnManualOverride(false);
      if (matchedPo.keterangan && !newKeterangan.trim()) {
        setNewKeterangan(matchedPo.keterangan);
      }
      if (!newNoFaktur.trim()) {
        setNewNoFaktur(`INV-${matchedPo.noBukti}`);
      }
    }

    const rawPoItems = poDetailsByNoPoMap[cleanNoPo] || [];
    const mappedItems = rawPoItems
      .map((d, idx) => {
        const poQty = Number(d.poQty ?? d.qty ?? 0);
        const poTerima = Number(d.poTerima ?? d.terima ?? 0);
        const remaining = Math.max(0, poQty - poTerima);
        const effectiveQty = !editingId && poTerima > 0 ? remaining : poQty;
        const jumlah = effectiveQty * d.harga;
        return {
          ...d,
          id: `po-fill-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          noUrut: idx + 1,
          poQty,
          poTerima,
          qty: effectiveQty,
          terima: effectiveQty,
          jumlah,
          total: jumlah,
        };
      })
      .filter((item) => editingId || item.qty > 0);

    if (mappedItems.length > 0) {
      setDetailRows(mappedItems);
      const grossSum = mappedItems.reduce((acc, item) => acc + item.total, 0);
      const { nominalPpn, netNilai } = calcPpnDeduction(grossSum, targetPpn);
      setNewNilaiPpn(String(nominalPpn));
      setNewNilai(String(netNilai));
      showFeedback(
        `PO [${cleanNoPo}] dimuat (${mappedItems.length} item, MU: ${matchedPo?.mataUang || newMataUang}, PPN: ${targetPpn}%)`
      );
    } else if (rawPoItems.length > 0) {
      setDetailRows([createBlankDetailRow(1)]);
      setNewNilaiPpn('0');
      setNewNilai('0');
      showFeedback(`Seluruh item pada PO [${cleanNoPo}] sudah diterima penuh.`);
    } else {
      setDetailRows([createBlankDetailRow(1)]);
      if (matchedPo) {
        setNewNilaiPpn(String(matchedPo.nilaiPpn || 0));
        setNewNilai(String(matchedPo.nilaiPo || 0));
      }
    }
  };

  const handleSelectSupplier = (supplierName: string, overrideDateStr?: string) => {
    setNewSupplier(supplierName);
    const suppMeta = supplierMetaMap[supplierName.trim().toUpperCase()];
    if (suppMeta) {
      if (suppMeta.mataUang && !newNoPo.trim()) {
        setNewMataUang(suppMeta.mataUang);
      }
      const baseDateIso = toIsoDate(overrideDateStr ?? newTanggal) || todayIso();
      setNewJthTmp(toDisplayDMyShort(addDaysToIsoDate(baseDateIso, suppMeta.tmpPembayaran)));
    }
  };

  const handleAddNew = async () => {
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setNewNoBukti(nextUniqueCode(pembelianList.map((p) => p.noBukti), '2608-PB-IMP-', 3));
    setNewTanggal(todayDisp);
    setNewSupplier('');
    setNewNoPo('');
    setNewNoFaktur('');
    setNewMataUang('IDR');
    setNewKeterangan('');
    setNewPpn('11');
    setNewNilaiPpn('0');
    setPpnManualOverride(false);
    setNewNilai('0');
    setNewJthTmp(todayDisp);
    setNewStsLunas('Belum');
    setNewTglLunas('');
    setNewStsPost('Posted');
    setNewTglPost(todayDisp);
    setNewDibuatOleh(currentUser);
    setNewTglCreated(todayDisp);
    setNewDiupdateOleh('-');
    setNewTglUpdate('');
    setDetailRows([createBlankDetailRow(1)]);
    setIsAddOpen(true);
    const [defaultPpn] = await Promise.all([
      fetchDefaultPpnRate(),
      loadMasterReferences(),
    ]);
    setNewPpn(String(defaultPpn));
  };

  const handleEdit = async () => {
    const item = pembelianList.find((p) => p.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(item.id);
    setModalError(null);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal);
    setNewSupplier(item.namaSupplier);
    setNewNoPo(item.noPo === '-' ? '' : item.noPo);
    setNewNoFaktur(item.noFaktur);
    setNewMataUang(item.mataUang || 'IDR');
    setNewKeterangan(item.keterangan);
    setNewPpn(String(item.ppnPct));
    setNewJthTmp(item.jthTmp === '-' ? '' : item.jthTmp);
    setNewStsLunas(item.stsLunas);
    setNewTglLunas(item.tglLunas === '-' ? '' : item.tglLunas);
    setNewStsPost(item.stsPost || 'Posted');
    setNewTglPost(item.tglPost === '-' ? '' : item.tglPost);
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser);
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);

    const existingDet = pembelianDetailsMap[item.id] || [];
    const existingSum = existingDet.reduce((acc, d) => acc + d.total, 0);
    if (existingDet.length > 0) {
      const auto = calcPpnDeduction(existingSum, item.ppnPct);
      if (item.nilaiPpnNum > 0) {
        const isManual = Math.abs(item.nilaiPpnNum - auto.nominalPpn) > 1;
        setNewNilaiPpn(String(item.nilaiPpnNum));
        setNewNilai(String(Math.max(0, Number((existingSum - item.nilaiPpnNum).toFixed(2)))));
        setPpnManualOverride(isManual);
      } else {
        setNewNilaiPpn(String(auto.nominalPpn));
        setNewNilai(String(auto.netNilai));
        setPpnManualOverride(false);
      }
    } else {
      setNewNilaiPpn(String(item.nilaiPpnNum));
      setNewNilai(String(item.nilaiPembelianNum));
      setPpnManualOverride(item.nilaiPpnNum > 0);
    }

    setDetailRows(existingDet.length > 0 ? existingDet : [createBlankDetailRow(1)]);
    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoBukti.trim() || !newSupplier.trim() || !newNoFaktur.trim()) {
      setModalError('No.Bukti, Nama Supplier, dan No.Faktur wajib diisi.');
      return;
    }

    const activeDetails = detailRows.filter(
      (d) => d.kode.trim() !== '' || d.namaBarang.trim() !== ''
    );

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglIso = toIsoDate(newTanggal) || todayIso();
      const totalDetailSum = activeDetails.reduce((acc, r) => acc + r.total, 0);
      const ppnPct = Math.max(0, parseNum(newPpn));
      let finalNilaiPpn = Math.max(0, parseNum(newNilaiPpn));
      let finalNilai = parseNum(newNilai);

      if (activeDetails.length > 0) {
        if (ppnManualOverride) {
          finalNilai = Math.max(0, Number((totalDetailSum - finalNilaiPpn).toFixed(2)));
        } else {
          const calc = calcPpnDeduction(totalDetailSum, ppnPct);
          finalNilaiPpn = calc.nominalPpn;
          finalNilai = calc.netNilai;
        }
      }

      const headerPayload: Record<string, any> = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_supplier: newSupplier.trim().toUpperCase(),
        no_po: newNoPo.trim().toUpperCase() || '-',
        no_faktur: newNoFaktur.trim().toUpperCase(),
        mata_uang: newMataUang.trim().toUpperCase() || 'IDR',
        keterangan: newKeterangan.trim(),
        ppn: ppnPct,
        nilai_ppn: finalNilaiPpn,
        nilai_pembelian: finalNilai,
        jth_tmp: toIsoDate(newJthTmp),
        sts_lunas: newStsLunas,
        tgl_lunas: toIsoDate(newTglLunas) || (newStsLunas === 'Lunas' ? todayIso() : null),
        sts_post: newStsPost,
        tgl_post: toIsoDate(newTglPost) || (newStsPost === 'Posted' ? tglIso : null),
      };

      if (editingId) {
        headerPayload.diupdate_oleh = newDiupdateOleh.trim().toUpperCase() || currentUser;
        headerPayload.tgl_update = toIsoDate(newTglUpdate) || todayIso();
        headerPayload.id = editingId;
      } else {
        headerPayload.dibuat_oleh = newDibuatOleh.trim().toUpperCase() || currentUser;
        headerPayload.tgl_created = toIsoDate(newTglCreated) || todayIso();
        headerPayload.diupdate_oleh = '-';
      }

      const detailsPayload = activeDetails.map((d, idx) => ({
        no_urut: idx + 1,
        kode: d.kode.trim().toUpperCase(),
        nama_barang: d.namaBarang.trim(),
        unit: d.unit.trim().toUpperCase() || 'PCS',
        terima: Number(d.terima || d.qty || 0),
        qty: Number(d.qty || 1),
        harga: Number(d.harga || 0),
        jumlah: Number(d.jumlah || 0),
        total: Number(d.total || 0),
      }));

      const saved = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'pembelian',
        headerPayload,
        detailsPayload
      );

      const mapped = mapDbToPembelian(saved.header);
      const mappedDet = (saved.details || []).map((d: any, idx: number) => mapDbToDetail(d, idx));

      if (editingId) {
        setPembelianList((prev) => prev.map((p) => (p.id === editingId ? mapped : p)));
        setPembelianDetailsMap((prev) => ({ ...prev, [editingId]: mappedDet }));
      } else {
        setPembelianList((prev) => [mapped, ...prev]);
        setPembelianDetailsMap((prev) => ({ ...prev, [mapped.id]: mappedDet }));
        setSelectedId(mapped.id);
      }
      await loadMasterReferences();
      showFeedback(
        saved.detailWarning
          ? saved.detailWarning
          : editingId
          ? 'Pembelian diperbarui (Stok, PO & HPP disinkronkan)'
          : 'Pembelian tersimpan (Stok, PO & HPP disinkronkan)'
      );
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan data Pembelian';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('pembelian_barangs', id);
      const updated = pembelianList.filter((item) => item.id !== id);
      setPembelianList(updated);
      setPembelianDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      await loadMasterReferences();
      showFeedback('Data Pembelian dihapus & Stok/PO/HPP disinkronkan');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = pembelianList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (searchField === 'Kode' || searchField === 'No.Bukti') return matchesMultiKeyword([item.noBukti], searchTerm);
    if (searchField === 'Nama Supplier') return matchesMultiKeyword([item.namaSupplier], searchTerm);
    if (searchField === 'No.PO') return matchesMultiKeyword([item.noPo], searchTerm);
    if (searchField === 'No.Faktur Pembelian') return matchesMultiKeyword([item.noFaktur], searchTerm);
    if (searchField === 'Mata Uang') return matchesMultiKeyword([item.mataUang], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
    return matchesMultiKeyword(
      [
        item.noBukti,
        item.tanggal,
        item.namaSupplier,
        item.noPo,
        item.noFaktur,
        item.mataUang,
        item.keterangan,
        item.stsLunas,
      ],
      searchTerm
    );
  });

  const totalNilai = filteredList.reduce((acc, r) => acc + r.nilaiPembelianNum, 0);
  const totalNilaiPpn = filteredList.reduce((acc, r) => acc + r.nilaiPpnNum, 0);

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm, tglFilter: tanggalFilter });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Pembelian Barang dari Supabase`
          : 'Data Pembelian Barang tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setTanggalFilter('Semua');
    const rows = await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
    if (rows) showFeedback(`Filter direset (${rows.length} Pembelian)`);
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
      fileName: 'List_Pembelian_Barang',
      sheetTitle: 'LIST PEMBELIAN BARANG',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Supplier', accessor: 'namaSupplier' },
        { header: 'No.PO', accessor: 'noPo' },
        { header: 'No.Faktur Pembelian', accessor: 'noFaktur' },
        { header: 'MU', accessor: 'mataUang', align: 'center' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'PPN', accessor: 'ppn', align: 'center' },
        { header: 'Nominal PPN', accessor: 'nilaiPpnNum', align: 'right' },
        { header: 'Nilai Pembelian', accessor: 'nilaiPembelianNum', align: 'right' },
        { header: 'Jth.Tmp', accessor: 'jthTmp', align: 'center' },
        { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const supplierDropdownChoices = Array.from(
    new Set([...supplierOptions, newSupplier.trim().toUpperCase()].filter(Boolean))
  );

  const poDropdownChoices = Array.from(
    new Set([
      ...poOptions
        .filter((p) => p.poClose !== 'Closed' || (editingId && p.noBukti === newNoPo.trim().toUpperCase()))
        .map((p) => p.noBukti),
      newNoPo.trim().toUpperCase(),
    ].filter(Boolean))
  );

  const currencyOptionCodes = Array.from(
    new Set([...WORLD_CURRENCIES.map((c) => c.code), newMataUang.trim().toUpperCase()].filter(Boolean))
  );

  const listPrintColumns: PrintColumn<PembelianItem>[] = [
    { header: 'No.Bukti', accessor: 'noBukti', width: '92px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '68px' },
    { header: 'Nama Supplier', accessor: 'namaSupplier', width: '130px' },
    { header: 'No.PO', accessor: 'noPo', width: '88px' },
    { header: 'No.Faktur', accessor: 'noFaktur', width: '92px' },
    { header: 'MU', accessor: 'mataUang', align: 'center', width: '38px' },
    { header: 'PPN', accessor: 'ppn', align: 'center', width: '42px' },
    { header: 'Nominal PPN', accessor: 'nilaiPpn', align: 'right', width: '78px' },
    { header: 'Nilai Pembelian', accessor: 'nilaiPembelian', align: 'right', width: '88px' },
    { header: 'Lunas', accessor: 'stsLunas', align: 'center', width: '54px' },
    { header: 'Keterangan', accessor: 'keterangan' },
  ];

  const detailPrintColumns: PrintColumn<PembelianDetailItem>[] = [
    { header: 'Kode', accessor: 'kode', width: '90px' },
    { header: 'Nama Barang', accessor: 'namaBarang' },
    { header: 'Unit', accessor: 'unit', align: 'center', width: '58px' },
    { header: 'Terima', accessor: (r) => formatMoney(r.terima), align: 'right', width: '64px' },
    { header: 'QTY', accessor: (r) => formatMoney(r.qty), align: 'right', width: '64px' },
    { header: 'Harga', accessor: (r) => formatMoney(r.harga), align: 'right', width: '92px' },
    { header: 'Jumlah', accessor: (r) => formatMoney(r.jumlah), align: 'right', width: '98px' },
    { header: 'Total', accessor: (r) => formatMoney(r.total), align: 'right', width: '102px' },
  ];

  return (
    <div
      id="list-pembelian-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Pembelian Barang"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => handleOpenPrint(selectedPembelian ? 'detail' : 'list')}
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
              onPrint={() => handleOpenPrint(selectedPembelian ? 'detail' : 'list')}
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
            <div className="font-bold text-sm text-gray-900">{formatRupiah(totalNilai)}</div>
          </div>
        </div>

        {/* Upper Table: List Pembelian Barang */}
        <div className="flex-[1.3] min-h-[160px] overflow-auto bg-white border border-[#999999] mx-1.5 mt-1.5 relative shadow-inner">
          <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1860px]">
            <thead className="sticky top-0 bg-[#F0F0F0] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10">
              <tr>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center w-12">No</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.Bukti</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tanggal</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Nama Supplier</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.PO</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.Faktur Pembelian</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">MU</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Keterangan</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">PPN</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-right">Nominal PPN</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-right">Nilai Pembelian</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Jth.Tmp</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Sts.Lunas</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Tgl.Lunas</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Sts.Post</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Post</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Dibuat Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Created</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">DiUpdate Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Update</th>
                <th className="px-2 py-1.5 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={21} className="text-center py-8 text-gray-500 italic">
                    Tidak ada data Pembelian Barang
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
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
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.tanggal}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-semibold">{item.namaSupplier}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono text-[11px]">{item.noPo}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono text-[11px]">{item.noFaktur}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center font-mono font-bold">{item.mataUang}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.keterangan}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{item.ppn}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-right font-mono">{item.nilaiPpn}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-right font-mono font-semibold">{item.nilaiPembelian}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center text-[11px]">{item.jthTmp}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center font-medium">{item.stsLunas}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center text-[11px]">{item.tglLunas}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{item.stsPost}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-[11px]">{item.tglPost}</td>
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

        {/* Lower Panel: Pembelian Detail for Selected Row */}
        <div className="flex-1 min-h-[140px] flex flex-col mx-1.5 mt-1.5 mb-1 border border-[#999999] bg-white shadow-inner overflow-hidden">
          <div className="shrink-0 bg-[#E6E3D5] border-b border-[#ACA899] px-2.5 py-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-[#003C74] whitespace-nowrap">Pembelian Detail</span>
              {selectedPembelian ? (
                <span className="text-[11px] text-gray-800 truncate">
                  No.Bukti: <b className="font-mono">{selectedPembelian.noBukti}</b> | No.PO:{' '}
                  <b className="font-mono text-[#000084]">{selectedPembelian.noPo || '-'}</b> | Faktur:{' '}
                  <b className="font-mono">{selectedPembelian.noFaktur}</b> | Supplier:{' '}
                  <b>{selectedPembelian.namaSupplier}</b> | MU:{' '}
                  <b className="font-mono text-[#0055EA]">{selectedPembelian.mataUang}</b>
                </span>
              ) : (
                <span className="text-[11px] text-gray-500 italic">
                  Pilih transaksi pembelian di atas untuk melihat detail barang
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] font-bold text-gray-900 font-mono">
                Total Detail: {selectedPembelian?.mataUang || 'IDR'} {formatMoney(selectedDetailTotal)}
              </span>
              {selectedPembelian && (
                <>
                  <span className="text-[11px] font-semibold text-[#9A3412] font-mono">
                    Potongan PPN ({selectedPembelian.ppn}): -{selectedPembelian.mataUang}{' '}
                    {formatMoney(selectedPembelian.nilaiPpnNum)}
                  </span>
                  <span className="text-[11px] font-bold text-[#000084] font-mono">
                    Nilai Pembelian: {selectedPembelian.mataUang}{' '}
                    {formatMoney(selectedPembelian.nilaiPembelianNum)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenPrint('detail')}
                    className="px-2.5 py-0.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded-xs text-[11px] font-semibold cursor-pointer"
                  >
                    Print Detail
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-left min-w-[900px]">
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
                {selectedPembelianDetails.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                      Belum ada rincian barang pada pembelian ini.
                    </td>
                  </tr>
                ) : (
                  selectedPembelianDetails.map((d, idx) => (
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

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-t border-[#C0C0C0] gap-2 overflow-x-auto">
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
              { value: 'Kode', label: 'Kode (No.Bukti)' },
              { value: 'No.Bukti', label: 'No.Bukti' },
              { value: 'Nama Supplier', label: 'Nama Supplier' },
              { value: 'No.PO', label: 'No.PO' },
              { value: 'No.Faktur Pembelian', label: 'No.Faktur Pembelian' },
              { value: 'Mata Uang', label: 'Mata Uang' },
              { value: 'Keterangan', label: 'Keterangan' },
            ]}
          />

          <div className="flex items-center space-x-4 shrink-0">
            <div className="w-64 h-5 bg-[#FFFF99] border border-[#C0C0C0] rounded-xs px-2 text-[10px] flex items-center text-gray-700 truncate">
              {selectedPembelian ? `${selectedPembelian.noBukti} - ${selectedPembelian.namaSupplier}` : ''}
            </div>
            <div className="text-gray-800 font-medium">Record : {filteredList.length}</div>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] rounded shadow-2xl w-[920px] max-w-[97vw] max-h-[93vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-[#0055EA] to-[#2B579A] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs shrink-0">
                <span>{editingId ? 'Koreksi Pembelian Barang' : 'Tambah Pembelian Barang Baru'}</span>
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
              <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3 overflow-y-auto text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">No.Bukti:</label>
                    <input
                      type="text"
                      value={newNoBukti}
                      onChange={(e) => setNewNoBukti(e.target.value)}
                      required
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded uppercase font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Tanggal:</label>
                    <div className="w-64">
                      <DatePickerInput
                        value={newTanggal}
                        onChange={(formatted) => {
                          setNewTanggal(formatted);
                          if (!editingId && newSupplier) {
                            const suppMeta = supplierMetaMap[newSupplier.trim().toUpperCase()];
                            if (suppMeta && suppMeta.tmpPembayaran > 0) {
                              const baseDateIso = toIsoDate(formatted) || todayIso();
                              setNewJthTmp(
                                toDisplayDMyShort(addDaysToIsoDate(baseDateIso, suppMeta.tmpPembayaran))
                              );
                            }
                          }
                        }}
                        format="dMyShort"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-[#000084] shrink-0">No.PO (Auto-Load):</label>
                    <select
                      value={newNoPo}
                      onChange={(e) => applyPurchaseOrderAutoFill(e.target.value)}
                      className="w-64 px-2 py-1 bg-[#FFFBEB] border border-[#7A7A7A] rounded uppercase cursor-pointer font-mono"
                    >
                      <option value="">-- Pilih Purchase Order (Open) --</option>
                      {poDropdownChoices.map((po) => {
                        const info = poOptions.find((p) => p.noBukti === po);
                        return (
                          <option key={po} value={po}>
                            {info ? `${po} (${info.namaSupplier} | ${info.poClose})` : po}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Nama Supplier:</label>
                    <select
                      value={newSupplier}
                      onChange={(e) => handleSelectSupplier(e.target.value)}
                      required
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih Supplier --</option>
                      {supplierDropdownChoices.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">No.Faktur Pembelian:</label>
                    <input
                      type="text"
                      value={newNoFaktur}
                      onChange={(e) => setNewNoFaktur(e.target.value)}
                      required
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded uppercase font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Mata Uang:</label>
                    <select
                      value={newMataUang}
                      onChange={(e) => setNewMataUang(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded cursor-pointer"
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
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">PPN (%) / Nominal PPN:</label>
                    <div className="w-64 flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={newPpn}
                        onChange={(e) => handlePpnPercentChange(e.target.value)}
                        className="w-20 px-2 py-1 bg-white border border-[#7A7A7A] rounded font-mono text-center"
                        placeholder="PPN %"
                        title="Persentase PPN (%) — Memotong Total Detail"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={newNilaiPpn}
                        onChange={(e) => handleManualNilaiPpnChange(e.target.value)}
                        className="flex-1 px-2 py-1 bg-[#FFFBEB] border border-[#7A7A7A] rounded font-mono text-right font-semibold text-[#9A3412]"
                        placeholder="Nominal PPN"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">
                      Nilai Pembelian ({newMataUang}):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newNilai}
                      onChange={(e) => setNewNilai(e.target.value)}
                      readOnly={hasFilledDetailRows}
                      className={`w-64 px-2 py-1 border border-[#7A7A7A] rounded font-mono text-right font-bold ${
                        hasFilledDetailRows ? 'bg-[#F0F4FF] text-[#000084]' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Keterangan:</label>
                    <input
                      type="text"
                      value={newKeterangan}
                      onChange={(e) => setNewKeterangan(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Jth.Tmp / Sts.Lunas:</label>
                    <div className="w-64 flex items-center space-x-1.5">
                      <div className="flex-1">
                        <DatePickerInput
                          value={newJthTmp}
                          onChange={(formatted) => setNewJthTmp(formatted)}
                          format="dMyShort"
                        />
                      </div>
                      <select
                        value={newStsLunas}
                        onChange={(e) => setNewStsLunas(e.target.value)}
                        className="w-24 px-2 py-1 bg-white border border-[#7A7A7A] rounded"
                      >
                        <option value="Belum">Belum</option>
                        <option value="Lunas">Lunas</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Tgl.Lunas:</label>
                    <div className="w-64">
                      <DatePickerInput
                        value={newTglLunas}
                        onChange={(formatted) => setNewTglLunas(formatted)}
                        format="dMyShort"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Sts.Post / Tgl.Post:</label>
                    <div className="w-64 flex items-center space-x-1.5">
                      <select
                        value={newStsPost}
                        onChange={(e) => setNewStsPost(e.target.value)}
                        className="w-28 px-2 py-1 bg-white border border-[#7A7A7A] rounded"
                        title="Posted otomatis menambah Stok Master Barang, update Terima/Close PO, dan sinkron ke HPP"
                      >
                        <option value="Not Yet">Not Yet</option>
                        <option value="Posted">Posted</option>
                      </select>
                      <div className="flex-1">
                        <DatePickerInput
                          value={newTglPost}
                          onChange={(formatted) => setNewTglPost(formatted)}
                          format="dMyShort"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pembelian Detail Datagrid */}
                <div className="border border-[#7A7A7A] bg-white rounded flex flex-col mt-2">
                  <div className="bg-[#ECE9D8] px-2 py-1 font-bold border-b border-[#7A7A7A] flex justify-between items-center text-[11px]">
                    <span>PEMBELIAN DETAIL BARANG (Auto-sinkron Stok Master Barang, PO Terima/Close & HPP saat Posted)</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateDetailRowsWithSync((prev) => [
                          ...prev,
                          createBlankDetailRow(prev.length + 1),
                        ])
                      }
                      className="px-2 py-0.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded cursor-pointer"
                    >
                      + Tambah Baris
                    </button>
                  </div>
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-left border-collapse text-[11px] min-w-[820px]">
                      <thead className="sticky top-0 bg-[#F0F0F0] border-b border-[#C0C0C0]">
                        <tr>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-10 text-center">No</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-36">Kode</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0]">Nama Barang</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-16 text-center">Unit</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-20 text-right">Terima</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-20 text-right">QTY</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-24 text-right">Harga</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-24 text-right">Jumlah</th>
                          <th className="px-2 py-1 border-r border-[#C0C0C0] w-24 text-right">Total</th>
                          <th className="px-2 py-1 text-center w-10">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailRows.map((d, index) => {
                          const kodeChoices = Array.from(
                            new Set([...barangOptions.map((b) => b.kode), d.kode].filter(Boolean))
                          );
                          return (
                            <tr key={d.id} className="border-b border-[#E0E0E0]">
                              <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{index + 1}</td>
                              <td className="px-1 py-1 border-r border-[#E0E0E0]">
                                <select
                                  value={d.kode}
                                  onChange={(e) => handleSelectBarang(index, e.target.value)}
                                  className="w-full px-1 py-0.5 border border-[#ccc] rounded font-mono uppercase cursor-pointer"
                                >
                                  <option value="">-- Kode --</option>
                                  {kodeChoices.map((k) => {
                                    const b = barangOptions.find((item) => item.kode === k);
                                    return (
                                      <option key={k} value={k}>
                                        {b ? `${k} - ${b.namaBarang}` : k}
                                      </option>
                                    );
                                  })}
                                </select>
                              </td>
                              <td className="px-1 py-1 border-r border-[#E0E0E0]">
                                <input
                                  type="text"
                                  value={d.namaBarang}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateDetailRowsWithSync((prev) =>
                                      prev.map((r, i) => (i === index ? { ...r, namaBarang: val } : r))
                                    );
                                  }}
                                  className="w-full px-1 py-0.5 border border-[#ccc] rounded"
                                />
                              </td>
                              <td className="px-1 py-1 border-r border-[#E0E0E0]">
                                <input
                                  type="text"
                                  value={d.unit}
                                  onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    updateDetailRowsWithSync((prev) =>
                                      prev.map((r, i) => (i === index ? { ...r, unit: val } : r))
                                    );
                                  }}
                                  className="w-full px-1 py-0.5 border border-[#ccc] rounded uppercase text-center"
                                />
                              </td>
                              <td className="px-1 py-1 border-r border-[#E0E0E0]">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={d.terima}
                                  onChange={(e) => {
                                    const val = parseNum(e.target.value);
                                    updateDetailRowsWithSync((prev) =>
                                      prev.map((r, i) => (i === index ? { ...r, terima: val } : r))
                                    );
                                  }}
                                  className="w-full px-1 py-0.5 border border-[#ccc] rounded text-right font-mono"
                                />
                              </td>
                              <td className="px-1 py-1 border-r border-[#E0E0E0]">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={d.qty}
                                  onChange={(e) => {
                                    const val = parseNum(e.target.value);
                                    const jumlah = val * d.harga;
                                    updateDetailRowsWithSync((prev) =>
                                      prev.map((r, i) =>
                                        i === index
                                          ? { ...r, qty: val, terima: val, jumlah, total: jumlah }
                                          : r
                                      )
                                    );
                                  }}
                                  className="w-full px-1 py-0.5 border border-[#ccc] rounded text-right font-mono"
                                />
                              </td>
                              <td className="px-1 py-1 border-r border-[#E0E0E0]">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={d.harga}
                                  onChange={(e) => {
                                    const val = parseNum(e.target.value);
                                    const jumlah = d.qty * val;
                                    updateDetailRowsWithSync((prev) =>
                                      prev.map((r, i) =>
                                        i === index ? { ...r, harga: val, jumlah, total: jumlah } : r
                                      )
                                    );
                                  }}
                                  className="w-full px-1 py-0.5 border border-[#ccc] rounded text-right font-mono"
                                />
                              </td>
                              <td className="px-2 py-1 border-r border-[#E0E0E0] text-right font-mono bg-[#FAFAFA]">
                                {formatMoney(d.jumlah)}
                              </td>
                              <td className="px-2 py-1 border-r border-[#E0E0E0] text-right font-mono font-bold bg-[#FAFAFA]">
                                {formatMoney(d.total)}
                              </td>
                              <td className="px-1 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateDetailRowsWithSync((prev) =>
                                      prev.filter((_, i) => i !== index)
                                    )
                                  }
                                  className="px-1 py-0.5 bg-red-100 text-red-700 hover:bg-red-200 rounded font-bold text-[10px] cursor-pointer"
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
                  <div className="bg-[#F5F4EE] border-t border-[#C0C0C0] px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-bold">
                    <span>
                      Jumlah Item: {detailRows.filter((d) => d.kode.trim() || d.namaBarang.trim()).length}
                    </span>
                    <div className="flex flex-wrap items-center gap-4 font-mono">
                      <span className="text-[#003C74]">
                        Total Detail: {newMataUang} {formatMoney(modalDetailTotal)}
                      </span>
                      <span className="text-[#9A3412]">
                        Potongan PPN ({parseNum(newPpn)}%): -{newMataUang} {formatMoney(parseNum(newNilaiPpn))}
                      </span>
                      <span className="text-[#000084] bg-[#E8EEFF] px-2 py-0.5 border border-[#8BA4E8]">
                        Nilai Pembelian: {newMataUang} {formatMoney(parseNum(newNilai))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit Fields */}
                <div className="border-t border-[#D0D0D0] pt-2 grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Dibuat Oleh:</label>
                    <input
                      type="text"
                      value={newDibuatOleh}
                      onChange={(e) => setNewDibuatOleh(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded uppercase text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Tgl.Created:</label>
                    <DatePickerInput
                      value={newTglCreated}
                      onChange={(formatted) => setNewTglCreated(formatted)}
                      format="dMyShort"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Diupdate Oleh:</label>
                    <input
                      type="text"
                      value={newDiupdateOleh}
                      onChange={(e) => setNewDiupdateOleh(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded uppercase text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Tgl.Update:</label>
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

        <A4PrintPreviewModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title={printMode === 'detail' ? 'BUKTI PEMBELIAN BARANG (DETAIL)' : 'LAPORAN LIST PEMBELIAN BARANG'}
          subtitle={
            printMode === 'detail' && selectedPembelian
              ? `No. Bukti: ${selectedPembelian.noBukti} | No. PO: ${selectedPembelian.noPo} | Supplier: ${selectedPembelian.namaSupplier}`
              : `Filter Tanggal: ${tanggalFilter}`
          }
          metaLines={
            printMode === 'detail' && selectedPembelian
              ? [
                  { label: 'No. Bukti', value: selectedPembelian.noBukti },
                  { label: 'Tanggal', value: selectedPembelian.tanggal },
                  { label: 'Nama Supplier', value: selectedPembelian.namaSupplier },
                  { label: 'No. PO', value: selectedPembelian.noPo || '-' },
                  { label: 'No. Faktur', value: selectedPembelian.noFaktur || '-' },
                  { label: 'Mata Uang', value: selectedPembelian.mataUang },
                  { label: 'PPN (%)', value: selectedPembelian.ppn },
                  {
                    label: 'Nominal PPN',
                    value: `-${selectedPembelian.mataUang} ${selectedPembelian.nilaiPpn}`,
                  },
                  {
                    label: 'Nilai Pembelian (Net)',
                    value: `${selectedPembelian.mataUang} ${selectedPembelian.nilaiPembelian}`,
                  },
                  { label: 'Sts. Lunas', value: selectedPembelian.stsLunas },
                  { label: 'Sts. Post', value: selectedPembelian.stsPost },
                  { label: 'Keterangan', value: selectedPembelian.keterangan || '-' },
                ]
              : []
          }
          orientation="landscape"
          columns={
            printMode === 'detail'
              ? selectedPembelianDetails.length > 0
                ? (detailPrintColumns as PrintColumn<any>[])
                : (listPrintColumns as PrintColumn<any>[])
              : (listPrintColumns as PrintColumn<any>[])
          }
          rows={
            printMode === 'detail'
              ? selectedPembelianDetails.length > 0
                ? selectedPembelianDetails
                : selectedPembelian
                ? [selectedPembelian]
                : []
              : filteredList
          }
          summaryItems={
            printMode === 'detail'
              ? [
                  { label: 'Total Item', value: `${selectedPembelianDetails.length} Item` },
                  {
                    label: `Total Detail (${selectedPembelian?.mataUang || 'IDR'})`,
                    value: `${selectedPembelian?.mataUang || 'IDR'} ${formatMoney(selectedDetailTotal)}`,
                  },
                  {
                    label: `Potongan PPN (${selectedPembelian?.ppn || '0%'})`,
                    value: `-${selectedPembelian?.mataUang || 'IDR'} ${formatMoney(selectedPembelian?.nilaiPpnNum || 0)}`,
                  },
                  {
                    label: 'Nilai Pembelian (Net)',
                    value: `${selectedPembelian?.mataUang || 'IDR'} ${formatMoney(selectedPembelian?.nilaiPembelianNum || 0)}`,
                  },
                ]
              : [
                  { label: 'Total Record', value: `${filteredList.length} Transaksi` },
                  { label: 'Total Nominal PPN', value: formatRupiah(totalNilaiPpn) },
                  { label: 'Total Pembelian', value: formatRupiah(totalNilai) },
                ]
          }
          selectedRow={printMode === 'list' ? selectedPembelian : undefined}
          selectedRows={
            printMode === 'list' && selectedPembelianDetails.length > 0
              ? selectedPembelianDetails
              : undefined
          }
          selectedColumns={
            printMode === 'list' && selectedPembelianDetails.length > 0
              ? (detailPrintColumns as PrintColumn<any>[])
              : undefined
          }
          selectedTitle={
            printMode === 'list'
              ? selectedPembelianDetails.length > 0
                ? 'BUKTI PEMBELIAN BARANG (RECORD TERPILIH)'
                : 'PEMBELIAN BARANG (RECORD TERPILIH)'
              : undefined
          }
          selectedSubtitle={
            printMode === 'list' && selectedPembelian
              ? `No. Bukti: ${selectedPembelian.noBukti} | Supplier: ${selectedPembelian.namaSupplier}`
              : undefined
          }
          selectedMetaLines={
            printMode === 'list' && selectedPembelian
              ? [
                  { label: 'No. Bukti', value: selectedPembelian.noBukti },
                  { label: 'Tanggal', value: selectedPembelian.tanggal },
                  { label: 'Nama Supplier', value: selectedPembelian.namaSupplier },
                  { label: 'No. PO', value: selectedPembelian.noPo || '-' },
                  { label: 'No. Faktur', value: selectedPembelian.noFaktur || '-' },
                  { label: 'Mata Uang / PPN', value: `${selectedPembelian.mataUang} / ${selectedPembelian.ppn}` },
                  { label: 'Sts. Lunas', value: selectedPembelian.stsLunas },
                  { label: 'Keterangan', value: selectedPembelian.keterangan || '-' },
                ]
              : undefined
          }
          selectedSummaryItems={
            printMode === 'list' && selectedPembelian
              ? [
                  { label: 'No. Bukti', value: selectedPembelian.noBukti },
                  { label: 'Potongan PPN', value: `-${selectedPembelian.mataUang} ${selectedPembelian.nilaiPpn}` },
                  { label: 'Nilai Pembelian', value: `${selectedPembelian.mataUang} ${selectedPembelian.nilaiPembelian}` },
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
                Pembelian Terpilih (Detail)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('list')}
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                  printMode === 'list' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                List Pembelian Barang
              </button>
            </div>
          }
        />

        <SupabaseFindModal
          isOpen={isFindOpen}
          onClose={() => setIsFindOpen(false)}
          tableLabel="Pembelian Barang"
          rows={pembelianList}
          selectedId={selectedId}
          getRowId={(r) => r.id}
          getSearchValues={(r) => [
            r.noBukti,
            r.tanggal,
            r.namaSupplier,
            r.noPo,
            r.noFaktur,
            r.mataUang,
            r.keterangan,
            r.nilaiPembelian,
            r.stsLunas,
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
            showFeedback(`Pembelian [${row.noBukti} - ${row.namaSupplier}] dipilih`);
          }}
          columns={[
            { header: 'Kode / No.Bukti', accessor: (r) => r.noBukti, widthClass: 'w-32', mono: true, bold: true },
            { header: 'Tanggal', accessor: (r) => r.tanggal, widthClass: 'w-22', align: 'center' },
            { header: 'Nama Supplier', accessor: (r) => r.namaSupplier, bold: true },
            { header: 'No.PO', accessor: (r) => r.noPo, widthClass: 'w-28', mono: true },
            { header: 'No.Faktur', accessor: (r) => r.noFaktur, widthClass: 'w-28', mono: true },
            { header: 'MU', accessor: (r) => r.mataUang, widthClass: 'w-14', align: 'center', mono: true },
            { header: 'Nilai Pembelian', accessor: (r) => r.nilaiPembelian, widthClass: 'w-28', align: 'right', mono: true },
          ]}
        />
      </div>
    </div>
  );
};
