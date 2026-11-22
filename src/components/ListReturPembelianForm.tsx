import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
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
import { WORLD_CURRENCIES } from '../lib/currencies';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface ReturPembelianDetailItem {
  id: string;
  returId?: string;
  noUrut: number;
  kode: string;
  namaBarang: string;
  unit: string;
  terima: number;
  qty: number;
  harga: number;
  jumlah: number;
  total: number;
  maxQty?: number;
}

export interface ReturPembelianItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaSupplier: string;
  noPembelian: string;
  noPo: string;
  noFaktur: string;
  nilaiRetur: string;
  nilaiReturNum: number;
  keterangan: string;
  mataUang: string;
  disc: string;
  discPct: number;
  nilaiDisc: string;
  nilaiDiscNum: number;
  ppn: string;
  ppnPct: number;
  nilaiPpn: string;
  nilaiPpnNum: number;
  stsPrint: string;
  tglPrint: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

export interface PembelianOrderRef {
  id: string;
  noBukti: string;
  namaSupplier: string;
  noPo: string;
  noFaktur: string;
  mataUang: string;
  ppn: number;
  keterangan: string;
  nilaiPembelian: number;
}

interface MasterBarangOption {
  kode: string;
  namaBarang: string;
  unit: string;
  cost: number;
}

interface ListReturPembelianFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function calcReturTotals(
  grossTotal: number,
  discPct: number,
  ppnPct: number
): { nilaiDisc: number; nominalPpn: number; netNilai: number } {
  const safeGross = Math.max(0, Number(grossTotal || 0));
  const safeDiscPct = Math.max(0, Number(discPct || 0));
  const safePpnPct = Math.max(0, Number(ppnPct || 0));
  const nilaiDisc = Number(((safeGross * safeDiscPct) / 100).toFixed(2));
  const afterDisc = Math.max(0, Number((safeGross - nilaiDisc).toFixed(2)));
  const nominalPpn = Number(((afterDisc * safePpnPct) / 100).toFixed(2));
  const netNilai = Math.max(0, Number((afterDisc - nominalPpn).toFixed(2)));
  return { nilaiDisc, nominalPpn, netNilai };
}

function mapDbToReturPembelian(r: any): ReturPembelianItem {
  const valNum = Number(r.nilai_retur || 0);
  const discPct = Number(r.disc || 0);
  const nilaiDiscNum = Number(r.nilai_disc || 0);
  const ppnPct = Number(r.ppn ?? 0);
  const nilaiPpnNum = Number(r.nilai_ppn || 0);
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaSupplier: r.nama_supplier || '',
    noPembelian: String(r.no_pembelian || '-').trim().toUpperCase() || '-',
    noPo: r.no_po || '-',
    noFaktur: r.no_faktur || '-',
    nilaiRetur: formatMoney(valNum),
    nilaiReturNum: valNum,
    keterangan: r.keterangan || '',
    mataUang: String(r.mata_uang || 'IDR').trim().toUpperCase() || 'IDR',
    disc: `${discPct}%`,
    discPct,
    nilaiDisc: formatMoney(nilaiDiscNum),
    nilaiDiscNum,
    ppn: `${ppnPct}%`,
    ppnPct,
    nilaiPpn: formatMoney(nilaiPpnNum),
    nilaiPpnNum,
    stsPrint: r.sts_print || 'Not Yet',
    tglPrint: toDisplayDMyShort(r.tgl_print) || '-',
    stsPost: r.sts_post || 'Posted',
    tglPost: toDisplayDMyShort(r.tgl_post) || '-',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

function mapDbToDetail(d: any, idx = 0): ReturPembelianDetailItem {
  const qty = Number(d.qty || 0);
  const harga = Number(d.harga || 0);
  const jumlah = d.jumlah !== undefined && d.jumlah !== null ? Number(d.jumlah) : qty * harga;
  const total = d.total !== undefined && d.total !== null ? Number(d.total) : jumlah;
  return {
    id: d.id || `det-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    returId: d.retur_id,
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

function createBlankDetailRow(noUrut: number): ReturPembelianDetailItem {
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

export const ListReturPembelianForm: React.FC<ListReturPembelianFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [returList, setReturList] = useState<ReturPembelianItem[]>([]);
  const [returDetailsMap, setReturDetailsMap] = useState<Record<string, ReturPembelianDetailItem[]>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);
  const [pembelianOptions, setPembelianOptions] = useState<PembelianOrderRef[]>([]);
  const [pembelianDetailsByNoPembMap, setPembelianDetailsByNoPembMap] = useState<
    Record<string, ReturPembelianDetailItem[]>
  >({});
  const [allReturHeadersRef, setAllReturHeadersRef] = useState<any[]>([]);
  const [allReturDetailsRef, setAllReturDetailsRef] = useState<any[]>([]);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newSupplier, setNewSupplier] = useState<string>('');
  const [newNoPembelian, setNewNoPembelian] = useState<string>('');
  const [newNoPo, setNewNoPo] = useState<string>('');
  const [newNoFaktur, setNewNoFaktur] = useState<string>('');
  const [newNilaiRetur, setNewNilaiRetur] = useState<string>('0');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newMataUang, setNewMataUang] = useState<string>('IDR');
  const [newDisc, setNewDisc] = useState<string>('0');
  const [newNilaiDisc, setNewNilaiDisc] = useState<string>('0');
  const [newPpn, setNewPpn] = useState<string>('11');
  const [newNilaiPpn, setNewNilaiPpn] = useState<string>('0');
  const [newStsPrint, setNewStsPrint] = useState<string>('Not Yet');
  const [newTglPrint, setNewTglPrint] = useState<string>('');
  const [newStsPost, setNewStsPost] = useState<string>('Posted');
  const [newTglPost, setNewTglPost] = useState<string>('');

  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');

  const [detailRows, setDetailRows] = useState<ReturPembelianDetailItem[]>([]);

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

  const computeAlreadyReturnedMap = (
    headers: any[],
    details: any[],
    excludeReturId?: string | null
  ): Record<string, Record<string, number>> => {
    const returIdToNoPemb = new Map<string, string>();
    for (const h of headers) {
      if (excludeReturId && String(h.id) === String(excludeReturId)) continue;
      if (String(h.sts_post || '').toUpperCase() !== 'POSTED') continue;
      const noPemb = String(h.no_pembelian || '').trim().toUpperCase();
      if (noPemb && noPemb !== '-') {
        returIdToNoPemb.set(String(h.id), noPemb);
      }
    }
    const map: Record<string, Record<string, number>> = {};
    for (const d of details) {
      const noPemb = returIdToNoPemb.get(String(d.retur_id || ''));
      if (!noPemb) continue;
      const kode = String(d.kode || '').trim().toUpperCase();
      if (!kode) continue;
      if (!map[noPemb]) map[noPemb] = {};
      map[noPemb][kode] = (map[noPemb][kode] || 0) + Number(d.qty || 0);
    }
    return map;
  };

  const loadMasterReferences = async () => {
    const [suppRes, barangRes, pembRes, pembDetRes, allReturRes, allReturDetRes] =
      await Promise.allSettled([
        erpList<any>('master_suppliers', { orderBy: 'nama_supplier', asc: true, limit: 1000 }),
        erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 }),
        erpList<any>('pembelian_barangs', { orderBy: 'tanggal', asc: false, limit: 1000 }),
        erpList<any>('pembelian_barang_details', { orderBy: 'no_urut', asc: true, limit: 5000 }),
        erpList<any>('retur_pembelians', { limit: 1000 }),
        erpList<any>('retur_pembelian_details', { limit: 5000 }),
      ]);

    if (suppRes.status === 'fulfilled') {
      const supps = Array.from(
        new Set(
          suppRes.value
            .filter((s: any) => s.is_active !== false)
            .map((s: any) => String(s.nama_supplier || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
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

    const pembIdToNoBukti = new Map<string, string>();
    if (pembRes.status === 'fulfilled') {
      const pems: PembelianOrderRef[] = pembRes.value
        .map((p: any) => {
          const noBukti = String(p.no_bukti || '').trim().toUpperCase();
          if (noBukti) pembIdToNoBukti.set(String(p.id), noBukti);
          return {
            id: String(p.id || ''),
            noBukti,
            namaSupplier: String(p.nama_supplier || '').trim().toUpperCase(),
            noPo: String(p.no_po || '-').trim().toUpperCase() || '-',
            noFaktur: String(p.no_faktur || '-').trim().toUpperCase() || '-',
            mataUang: String(p.mata_uang || 'IDR').trim().toUpperCase() || 'IDR',
            ppn: Number(p.ppn ?? 0),
            keterangan: String(p.keterangan || '').trim(),
            nilaiPembelian: Number(p.nilai_pembelian || 0),
          };
        })
        .filter((p: PembelianOrderRef) => p.noBukti);
      setPembelianOptions(pems);
    }

    if (pembDetRes.status === 'fulfilled') {
      const grouped: Record<string, ReturPembelianDetailItem[]> = {};
      for (const raw of pembDetRes.value) {
        const mapped = mapDbToDetail(raw, 0);
        const keys = Array.from(
          new Set(
            [
              String(raw.no_bukti || '').trim().toUpperCase(),
              pembIdToNoBukti.get(String(raw.pembelian_id || '')) || '',
            ].filter(Boolean)
          )
        );
        for (const k of keys) {
          if (!grouped[k]) grouped[k] = [];
          grouped[k].push({ ...mapped, noUrut: grouped[k].length + 1 });
        }
      }
      setPembelianDetailsByNoPembMap(grouped);
    }

    if (allReturRes.status === 'fulfilled') {
      setAllReturHeadersRef(allReturRes.value);
    }
    if (allReturDetRes.status === 'fulfilled') {
      setAllReturDetailsRef(allReturDetRes.value);
    }
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'no_bukti',
    'No.Bukti': 'no_bukti',
    'Nama Supplier': 'nama_supplier',
    'No.Pembelian': 'no_pembelian',
    'No.PO': 'no_po',
    'No.Faktur Pembelian': 'no_faktur',
    'Mata Uang': 'mata_uang',
    Keterangan: 'keterangan',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
    tglFilter?: string;
  }): Promise<ReturPembelianItem[] | null> => {
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
          queryOpts.orSearch = 'no_bukti,nama_supplier,no_pembelian,no_po,no_faktur,keterangan';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows, detRows] = await Promise.all([
        erpList<any>('retur_pembelians', queryOpts),
        erpList<any>('retur_pembelian_details', { orderBy: 'no_urut', asc: true }).catch(() => []),
        loadMasterReferences(),
      ]);

      const mappedDetails: Record<string, ReturPembelianDetailItem[]> = {};
      for (const d of detRows) {
        const rId = String(d.retur_id || '');
        if (!mappedDetails[rId]) mappedDetails[rId] = [];
        mappedDetails[rId].push(mapDbToDetail(d, mappedDetails[rId].length));
      }
      setReturDetailsMap(mappedDetails);

      const mapped = rows.map(mapDbToReturPembelian);
      setReturList(mapped);
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
      showFeedback('Pilih record Retur Pembelian terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const details = returDetailsMap[selected.id] || [];
      const grossSum = details.reduce((acc, d) => acc + Number(d.total || 0), 0);
      const calc = calcReturTotals(grossSum, selected.discPct, selected.ppnPct);
      const hasDetails = details.length > 0 && grossSum > 0;

      const headerPayload: Record<string, any> = {
        id: selected.id,
        no_bukti: selected.noBukti.trim().toUpperCase(),
        tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
        nama_supplier: selected.namaSupplier.trim().toUpperCase(),
        no_pembelian: selected.noPembelian.trim().toUpperCase() || '-',
        no_po: selected.noPo.trim().toUpperCase() || '-',
        no_faktur: selected.noFaktur.trim().toUpperCase() || '-',
        nilai_retur: hasDetails ? calc.netNilai : selected.nilaiReturNum,
        keterangan: selected.keterangan.trim(),
        mata_uang: selected.mataUang.trim().toUpperCase() || 'IDR',
        disc: selected.discPct,
        nilai_disc: hasDetails ? calc.nilaiDisc : selected.nilaiDiscNum,
        ppn: selected.ppnPct,
        nilai_ppn: hasDetails ? calc.nominalPpn : selected.nilaiPpnNum,
        sts_print: selected.stsPrint,
        tgl_print: selected.tglPrint !== '-' ? toIsoDate(selected.tglPrint) : null,
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
        'retur-pembelian',
        headerPayload,
        detailsPayload
      );
      const mapped = mapDbToReturPembelian(saved.header);
      const mappedDet = (saved.details || []).map((d: any, idx: number) => mapDbToDetail(d, idx));
      setReturList((prev) => prev.map((r) => (r.id === mapped.id ? mapped : r)));
      setReturDetailsMap((prev) => ({ ...prev, [mapped.id]: mappedDet }));
      setSelectedId(mapped.id);
      await loadMasterReferences();
      showFeedback(
        saved.detailWarning
          ? `${saved.detailWarning}`
          : `Retur [${mapped.noBukti}] tersimpan & stok gudang disinkronkan`
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

  if (!isOpen) return null;

  const syncTotalsFromModal = (rows: ReturPembelianDetailItem[], discStr: string, ppnStr: string) => {
    const grossSum = rows.reduce((acc, r) => acc + Number(r.total || 0), 0);
    const { nilaiDisc, nominalPpn, netNilai } = calcReturTotals(
      grossSum,
      parseNum(discStr),
      parseNum(ppnStr)
    );
    setNewNilaiDisc(String(nilaiDisc));
    setNewNilaiPpn(String(nominalPpn));
    if (rows.some((r) => r.kode.trim() || r.namaBarang.trim()) && grossSum >= 0) {
      setNewNilaiRetur(String(netNilai));
    }
  };

  const updateDetailRowsWithSync = (
    updater: (prev: ReturPembelianDetailItem[]) => ReturPembelianDetailItem[]
  ) => {
    setDetailRows((prev) => {
      const next = updater(prev);
      syncTotalsFromModal(next, newDisc, newPpn);
      return next;
    });
  };

  const handleDiscChange = (val: string) => {
    setNewDisc(val);
    syncTotalsFromModal(detailRows, val, newPpn);
  };

  const handlePpnChange = (val: string) => {
    setNewPpn(val);
    syncTotalsFromModal(detailRows, newDisc, val);
  };

  const handleSelectBarang = (rowIndex: number, selectedKode: string) => {
    const cleanKode = selectedKode.trim().toUpperCase();
    const found = barangOptions.find((b) => b.kode === cleanKode);
    updateDetailRowsWithSync((prev) =>
      prev.map((r, i) => {
        if (i !== rowIndex) return r;
        const harga = found && found.cost > 0 ? found.cost : r.harga;
        const qty = r.qty > 0 ? r.qty : 1;
        const jumlah = qty * harga;
        return {
          ...r,
          kode: cleanKode,
          namaBarang: found ? found.namaBarang : r.namaBarang,
          unit: found ? found.unit : r.unit || 'PCS',
          harga,
          jumlah,
          total: jumlah,
        };
      })
    );
  };

  const applyPembelianAutoFill = (rawNoPemb: string) => {
    const cleanNoPemb = rawNoPemb.trim().toUpperCase();
    setNewNoPembelian(cleanNoPemb);
    setModalError(null);
    if (!cleanNoPemb) {
      setNewNoPo('');
      return;
    }

    const matchedPem = pembelianOptions.find((p) => p.noBukti === cleanNoPemb);
    const nextPpn = matchedPem ? String(matchedPem.ppn) : newPpn;
    if (matchedPem) {
      if (matchedPem.namaSupplier) setNewSupplier(matchedPem.namaSupplier);
      setNewNoPo(matchedPem.noPo || '-');
      setNewNoFaktur(matchedPem.noFaktur || '-');
      setNewMataUang(matchedPem.mataUang || 'IDR');
      setNewPpn(nextPpn);
      if (matchedPem.keterangan && !newKeterangan.trim()) {
        setNewKeterangan(`Retur Pembelian ${cleanNoPemb} - ${matchedPem.keterangan}`);
      } else if (!newKeterangan.trim()) {
        setNewKeterangan(`Retur Pembelian ${cleanNoPemb}`);
      }
    }

    const returnedMap = computeAlreadyReturnedMap(allReturHeadersRef, allReturDetailsRef, editingId);
    const returnedForPemb = returnedMap[cleanNoPemb] || {};
    const rawItems = pembelianDetailsByNoPembMap[cleanNoPemb] || [];

    const items: ReturPembelianDetailItem[] = rawItems.map((d, idx) => {
      const purchasedQty = Number(d.terima || 0) > 0 ? Number(d.terima) : Number(d.qty || 0);
      const alreadyReturned = Number(returnedForPemb[d.kode] || 0);
      const sisa = Math.max(0, purchasedQty - alreadyReturned);
      const defaultQty = sisa > 0 ? sisa : 0;
      const jumlah = defaultQty * d.harga;
      return {
        ...d,
        id: `pemb-fill-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        noUrut: idx + 1,
        terima: purchasedQty,
        qty: defaultQty,
        maxQty: sisa,
        jumlah,
        total: jumlah,
      };
    });

    if (items.length > 0) {
      setDetailRows(items);
      const grossSum = items.reduce((acc, item) => acc + item.total, 0);
      const { nilaiDisc, nominalPpn, netNilai } = calcReturTotals(
        grossSum,
        parseNum(newDisc),
        parseNum(nextPpn)
      );
      setNewNilaiDisc(String(nilaiDisc));
      setNewNilaiPpn(String(nominalPpn));
      setNewNilaiRetur(String(netNilai));
      const allEmpty = items.every((it) => (it.maxQty ?? 0) <= 0);
      if (allEmpty) {
        setModalError(
          `Seluruh QTY barang pada Pembelian [${cleanNoPemb}] sudah pernah diretur sebelumnya.`
        );
      }
    } else {
      setDetailRows([createBlankDetailRow(1)]);
      if (matchedPem) {
        setNewNilaiRetur(String(matchedPem.nilaiPembelian || 0));
      }
    }
  };

  const handleAddNew = async () => {
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setNewNoBukti(nextUniqueCode(returList.map((r) => r.noBukti), '2608-RP-IMP-', 3));
    setNewTanggal(todayDisp);
    setNewSupplier('');
    setNewNoPembelian('');
    setNewNoPo('');
    setNewNoFaktur('');
    setNewNilaiRetur('0');
    setNewKeterangan('');
    setNewMataUang('IDR');
    setNewDisc('0');
    setNewNilaiDisc('0');
    setNewPpn('11');
    setNewNilaiPpn('0');
    setNewStsPrint('Not Yet');
    setNewTglPrint('');
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
    const item = returList.find((r) => r.id === selectedId);
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
    const cleanPembRef = item.noPembelian && item.noPembelian !== '-' ? item.noPembelian : '';
    setNewNoPembelian(cleanPembRef);
    setNewNoPo(item.noPo);
    setNewNoFaktur(item.noFaktur);
    setNewNilaiRetur(String(item.nilaiReturNum));
    setNewKeterangan(item.keterangan);
    setNewMataUang(item.mataUang);
    setNewDisc(String(item.discPct));
    setNewNilaiDisc(String(item.nilaiDiscNum));
    setNewPpn(String(item.ppnPct));
    setNewNilaiPpn(String(item.nilaiPpnNum));
    setNewStsPrint(item.stsPrint || 'Not Yet');
    setNewTglPrint(item.tglPrint === '-' ? '' : item.tglPrint);
    setNewStsPost(item.stsPost || 'Posted');
    setNewTglPost(item.tglPost === '-' ? '' : item.tglPost);
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser);
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);

    const existingDet = returDetailsMap[item.id] || [];
    const returnedMap = computeAlreadyReturnedMap(allReturHeadersRef, allReturDetailsRef, item.id);
    const returnedForPemb = cleanPembRef ? returnedMap[cleanPembRef] || {} : {};
    const sourcePembDet = cleanPembRef ? pembelianDetailsByNoPembMap[cleanPembRef] || [] : [];

    const hydratedDet =
      existingDet.length > 0
        ? existingDet.map((d) => {
            const matchedSrc = sourcePembDet.find((sd) => sd.kode === d.kode);
            if (!matchedSrc) return d;
            const purchasedQty =
              Number(matchedSrc.terima || 0) > 0
                ? Number(matchedSrc.terima)
                : Number(matchedSrc.qty || 0);
            const alreadyOther = Number(returnedForPemb[d.kode] || 0);
            return {
              ...d,
              maxQty: Math.max(0, purchasedQty - alreadyOther),
            };
          })
        : [createBlankDetailRow(1)];

    setDetailRows(hydratedDet);
    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoBukti.trim() || !newSupplier.trim()) {
      setModalError('No. Bukti Retur dan Nama Supplier wajib diisi.');
      return;
    }

    const filledDetails = detailRows.filter(
      (d) => d.kode.trim() || d.namaBarang.trim() || d.total > 0
    );
    const activeDetails = filledDetails.filter((d) => d.qty > 0 || d.total > 0);
    if (filledDetails.length > 0 && activeDetails.length === 0) {
      setModalError('Minimal 1 barang memiliki QTY Retur > 0.');
      return;
    }

    const cleanPembRef = newNoPembelian.trim().toUpperCase();
    if (cleanPembRef && cleanPembRef !== '-') {
      const returnedMap = computeAlreadyReturnedMap(allReturHeadersRef, allReturDetailsRef, editingId);
      const returnedForPemb = returnedMap[cleanPembRef] || {};
      const sourcePembDet = pembelianDetailsByNoPembMap[cleanPembRef] || [];
      if (sourcePembDet.length > 0) {
        for (const d of activeDetails) {
          const cleanKode = d.kode.trim().toUpperCase();
          const matchedSrc = sourcePembDet.find((sd) => sd.kode === cleanKode);
          if (matchedSrc) {
            const purchasedQty =
              Number(matchedSrc.terima || 0) > 0
                ? Number(matchedSrc.terima)
                : Number(matchedSrc.qty || 0);
            const alreadyReturned = Number(returnedForPemb[cleanKode] || 0);
            const maxAllowed = Math.max(0, purchasedQty - alreadyReturned);
            if (d.qty > maxAllowed) {
              setModalError(
                `QTY Retur untuk [${cleanKode}] (${d.qty}) melebihi sisa yang dapat diretur (${maxAllowed} dari ${purchasedQty}).`
              );
              return;
            }
          }
        }
      }
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglIso = toIsoDate(newTanggal) || todayIso();
      const totalDetailSum = activeDetails.reduce((acc, r) => acc + r.total, 0);
      const discPctNum = parseNum(newDisc);
      const ppnPctNum = parseNum(newPpn);
      const calc = calcReturTotals(totalDetailSum, discPctNum, ppnPctNum);

      const finalNilai = activeDetails.length > 0 ? calc.netNilai : parseNum(newNilaiRetur);
      const finalDiscVal = activeDetails.length > 0 ? calc.nilaiDisc : parseNum(newNilaiDisc);
      const finalPpnVal = activeDetails.length > 0 ? calc.nominalPpn : parseNum(newNilaiPpn);

      const headerPayload: Record<string, any> = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_supplier: newSupplier.trim().toUpperCase(),
        no_pembelian: cleanPembRef || '-',
        no_po: newNoPo.trim().toUpperCase() || '-',
        no_faktur: newNoFaktur.trim().toUpperCase() || '-',
        nilai_retur: finalNilai,
        keterangan: newKeterangan.trim(),
        mata_uang: newMataUang.trim().toUpperCase() || 'IDR',
        disc: discPctNum,
        nilai_disc: finalDiscVal,
        ppn: ppnPctNum,
        nilai_ppn: finalPpnVal,
        sts_print: newStsPrint,
        tgl_print: toIsoDate(newTglPrint) || (newStsPrint === 'Printed' ? todayIso() : null),
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
        terima: Number(d.terima || 0),
        qty: Number(d.qty || 1),
        harga: Number(d.harga || 0),
        jumlah: Number(d.jumlah || 0),
        total: Number(d.total || 0),
      }));

      const saved = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'retur-pembelian',
        headerPayload,
        detailsPayload
      );

      const mapped = mapDbToReturPembelian(saved.header);
      const mappedDet = (saved.details || []).map((d: any, idx: number) => mapDbToDetail(d, idx));

      if (editingId) {
        setReturList((prev) => prev.map((r) => (r.id === editingId ? mapped : r)));
        setReturDetailsMap((prev) => ({ ...prev, [editingId]: mappedDet }));
        showFeedback(
          saved.detailWarning
            ? `${saved.detailWarning}`
            : 'Retur Pembelian diperbarui & stok gudang disinkronkan'
        );
      } else {
        setReturList((prev) => [mapped, ...prev]);
        setReturDetailsMap((prev) => ({ ...prev, [mapped.id]: mappedDet }));
        setSelectedId(mapped.id);
        showFeedback(
          saved.detailWarning
            ? `${saved.detailWarning}`
            : 'Retur Pembelian tersimpan & stok gudang dikurangi otomatis'
        );
      }
      setIsAddOpen(false);
      setEditingId(null);
      await loadMasterReferences();
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Retur Pembelian';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('retur_pembelians', id);
      const updated = returList.filter((item) => item.id !== id);
      setReturList(updated);
      setReturDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      await loadMasterReferences();
      showFeedback('Retur Pembelian dihapus & stok barang dipulihkan');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = returList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (searchField === 'Kode' || searchField === 'No.Bukti') return matchesMultiKeyword([item.noBukti], searchTerm);
    if (searchField === 'Nama Supplier') return matchesMultiKeyword([item.namaSupplier], searchTerm);
    if (searchField === 'No.Pembelian') return matchesMultiKeyword([item.noPembelian], searchTerm);
    if (searchField === 'No.PO') return matchesMultiKeyword([item.noPo], searchTerm);
    if (searchField === 'No.Faktur Pembelian') return matchesMultiKeyword([item.noFaktur], searchTerm);
    if (searchField === 'Mata Uang') return matchesMultiKeyword([item.mataUang], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
    return matchesMultiKeyword(
      [
        item.noBukti,
        item.tanggal,
        item.namaSupplier,
        item.noPembelian,
        item.noPo,
        item.noFaktur,
        item.keterangan,
        item.mataUang,
      ],
      searchTerm
    );
  });

  const totalNilaiRetur = filteredList.reduce((acc, r) => acc + r.nilaiReturNum, 0);
  const totalNilaiDisc = filteredList.reduce((acc, r) => acc + r.nilaiDiscNum, 0);
  const totalNilaiPpn = filteredList.reduce((acc, r) => acc + r.nilaiPpnNum, 0);

  const selectedRetur =
    filteredList.find((r) => r.id === selectedId) ||
    returList.find((r) => r.id === selectedId) ||
    null;
  const selectedReturDetails = selectedRetur ? returDetailsMap[selectedRetur.id] || [] : [];
  const selectedDetailTotal = selectedReturDetails.reduce((s, d) => s + Number(d.total || 0), 0);

  const modalGrossTotal = detailRows.reduce((acc, r) => acc + Number(r.total || 0), 0);
  const hasFilledDetailRows = detailRows.some(
    (d) => d.kode.trim() || d.namaBarang.trim() || d.total > 0
  );

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm, tglFilter: tanggalFilter });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Retur Pembelian dari Supabase`
          : 'Data Retur Pembelian tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setTanggalFilter('Semua');
    const rows = await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
    if (rows) showFeedback(`Filter direset (${rows.length} Retur Pembelian)`);
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
      fileName: 'List_Retur_Pembelian',
      sheetTitle: 'LIST RETUR PEMBELIAN BARANG',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Supplier', accessor: 'namaSupplier' },
        { header: 'Ref. Pembelian', accessor: 'noPembelian' },
        { header: 'No.PO', accessor: 'noPo' },
        { header: 'No.Faktur Pembelian', accessor: 'noFaktur' },
        { header: 'Mata Uang', accessor: 'mataUang', align: 'center' },
        { header: 'Disc', accessor: 'disc', align: 'center' },
        { header: 'Nominal Disc', accessor: 'nilaiDiscNum', align: 'right' },
        { header: 'PPN', accessor: 'ppn', align: 'center' },
        { header: 'Nominal PPN', accessor: 'nilaiPpnNum', align: 'right' },
        { header: 'Nilai Retur', accessor: 'nilaiReturNum', align: 'right' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const supplierDropdownChoices = Array.from(
    new Set([...supplierOptions, newSupplier.trim().toUpperCase()].filter(Boolean))
  );

  const pembelianDropdownChoices = Array.from(
    new Set(
      [...pembelianOptions.map((p) => p.noBukti), newNoPembelian.trim().toUpperCase()].filter(Boolean)
    )
  );

  const currencyOptionCodes = Array.from(
    new Set([...WORLD_CURRENCIES.map((c) => c.code), newMataUang.trim().toUpperCase()].filter(Boolean))
  );

  const listPrintColumns: PrintColumn<ReturPembelianItem>[] = [
    { header: 'No.Bukti', accessor: 'noBukti', width: '92px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '68px' },
    { header: 'Nama Supplier', accessor: 'namaSupplier', width: '125px' },
    { header: 'Ref. Pembelian', accessor: 'noPembelian', width: '92px' },
    { header: 'No.PO', accessor: 'noPo', width: '84px' },
    { header: 'MU', accessor: 'mataUang', align: 'center', width: '36px' },
    { header: 'Disc', accessor: 'disc', align: 'center', width: '40px' },
    { header: 'PPN', accessor: 'ppn', align: 'center', width: '40px' },
    { header: 'Nominal PPN', accessor: 'nilaiPpn', align: 'right', width: '74px' },
    { header: 'Nilai Retur', accessor: 'nilaiRetur', align: 'right', width: '88px' },
    { header: 'Keterangan', accessor: 'keterangan' },
  ];

  const detailPrintColumns: PrintColumn<ReturPembelianDetailItem>[] = [
    { header: 'Kode', accessor: 'kode', width: '90px' },
    { header: 'Nama Barang', accessor: 'namaBarang' },
    { header: 'Unit', accessor: 'unit', align: 'center', width: '58px' },
    { header: 'Terima', accessor: (r) => formatMoney(r.terima), align: 'right', width: '64px' },
    { header: 'QTY Retur', accessor: (r) => formatMoney(r.qty), align: 'right', width: '68px' },
    { header: 'Harga', accessor: (r) => formatMoney(r.harga), align: 'right', width: '92px' },
    { header: 'Jumlah', accessor: (r) => formatMoney(r.jumlah), align: 'right', width: '98px' },
    { header: 'Total', accessor: (r) => formatMoney(r.total), align: 'right', width: '102px' },
  ];

  return (
    <div
      id="list-retur-pembelian-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Retur Pembelian Barang"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => handleOpenPrint(selectedRetur ? 'detail' : 'list')}
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
              onPrint={() => handleOpenPrint(selectedRetur ? 'detail' : 'list')}
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

          <div className="flex items-center gap-2 pr-2 shrink-0">
            <div className="text-xs font-semibold px-2 py-1 bg-[#FFF7E6] border border-[#C7A05A] text-[#7A4900] whitespace-nowrap">
              PPN: {formatRupiah(totalNilaiPpn)}
            </div>
            <div className="font-bold text-sm text-gray-900">{formatRupiah(totalNilaiRetur)}</div>
          </div>
        </div>

        {/* Upper Table: List Retur Pembelian */}
        <div className="flex-[1.3] min-h-[160px] overflow-auto bg-white border border-[#7F9DB9] mx-2 mt-2 shadow-inner relative">
          <table className="w-full border-collapse text-xs whitespace-nowrap min-w-[2050px]">
            <thead>
              <tr className="bg-[#EBE9ED] text-black font-semibold sticky top-0 z-10 border-b border-[#919B9C] select-none">
                <th className="px-2 py-1.5 text-center border-r border-[#C0C0C0] w-[45px]">No</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[130px]">No.Bukti</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[90px]">Tanggal</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[180px]">Nama Supplier</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[130px]">Ref. Pembelian</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[120px]">No.PO</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[125px]">No.Faktur Pembelian</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[55px]">MU</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[55px]">Disc</th>
                <th className="px-2.5 py-1.5 text-right border-r border-[#C0C0C0] min-w-[90px]">Nominal Disc</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[55px]">PPN</th>
                <th className="px-2.5 py-1.5 text-right border-r border-[#C0C0C0] min-w-[90px]">Nominal PPN</th>
                <th className="px-2.5 py-1.5 text-right border-r border-[#C0C0C0] min-w-[105px]">Nilai Retur</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[180px]">Keterangan</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[80px]">Sts.Print</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[90px]">Tgl.Print</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[80px]">Sts.Post</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[90px]">Tgl.Post</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[100px]">Dibuat Oleh</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[90px]">Tgl.Created</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[100px]">DiUpdate Oleh</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[90px]">Tgl.Update</th>
                <th className="px-2.5 py-1.5 text-center min-w-[70px]">Aksi</th>
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
                    className={`cursor-pointer border-b border-[#E0E0E0] ${
                      isSelected
                        ? 'bg-[#316AC5] text-white'
                        : index % 2 === 0
                        ? 'bg-white hover:bg-[#F0F4F8]'
                        : 'bg-[#F9F9F8] hover:bg-[#F0F4F8]'
                    }`}
                  >
                    <td className="px-2 py-1 text-center border-r border-[#E0E0E0] font-mono">{index + 1}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-mono font-medium">{item.noBukti}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tanggal}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-medium">{item.namaSupplier}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-mono">{item.noPembelian}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-mono">{item.noPo}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-mono">{item.noFaktur}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0] font-mono font-bold">{item.mataUang}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.disc}</td>
                    <td className="px-2.5 py-1 text-right border-r border-[#E0E0E0] font-mono">{item.nilaiDisc}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.ppn}</td>
                    <td className="px-2.5 py-1 text-right border-r border-[#E0E0E0] font-mono">{item.nilaiPpn}</td>
                    <td className="px-2.5 py-1 text-right border-r border-[#E0E0E0] font-mono font-semibold">{item.nilaiRetur}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">{item.keterangan}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          item.stsPrint === 'Printed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.stsPrint}
                      </span>
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglPrint}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800">
                        {item.stsPost}
                      </span>
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglPost}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">{item.dibuatOleh}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglCreated}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">{item.diupdateOleh}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglUpdate}</td>
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={23} className="text-center py-8 text-gray-500 italic">
                    Tidak ada data Retur Pembelian yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Lower Panel: Retur Pembelian Detail */}
        <div className="flex-1 min-h-[140px] flex flex-col mx-2 mt-1.5 mb-1 border border-[#7F9DB9] bg-white shadow-inner overflow-hidden">
          <div className="shrink-0 bg-[#E6E3D5] border-b border-[#ACA899] px-2.5 py-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-[#003C74] whitespace-nowrap">Retur Pembelian Detail</span>
              {selectedRetur ? (
                <span className="text-[11px] text-gray-800 truncate">
                  No.Bukti: <b className="font-mono">{selectedRetur.noBukti}</b> | Ref. Pembelian:{' '}
                  <b className="font-mono text-[#000084]">{selectedRetur.noPembelian || '-'}</b> | No.PO:{' '}
                  <b className="font-mono">{selectedRetur.noPo || '-'}</b> | Supplier:{' '}
                  <b>{selectedRetur.namaSupplier}</b> | MU:{' '}
                  <b className="font-mono text-[#0055EA]">{selectedRetur.mataUang}</b>
                </span>
              ) : (
                <span className="text-[11px] text-gray-500 italic">
                  Pilih transaksi retur di atas untuk melihat rincian barang diretur
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] font-bold text-gray-900 font-mono">
                Total Detail: {selectedRetur?.mataUang || 'IDR'} {formatMoney(selectedDetailTotal)}
              </span>
              {selectedRetur && (
                <>
                  {selectedRetur.nilaiDiscNum > 0 && (
                    <span className="text-[11px] font-semibold text-gray-700 font-mono">
                      Disc ({selectedRetur.disc}): -{selectedRetur.mataUang}{' '}
                      {formatMoney(selectedRetur.nilaiDiscNum)}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-[#9A3412] font-mono">
                    PPN ({selectedRetur.ppn}): -{selectedRetur.mataUang}{' '}
                    {formatMoney(selectedRetur.nilaiPpnNum)}
                  </span>
                  <span className="text-[11px] font-bold text-[#000084] font-mono">
                    Nilai Retur: {selectedRetur.mataUang} {formatMoney(selectedRetur.nilaiReturNum)}
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
                  <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-20">Terima Beli</th>
                  <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-20">QTY Retur</th>
                  <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-28">Harga</th>
                  <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-32">Jumlah</th>
                  <th className="px-2 py-1 text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedReturDetails.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                      Belum ada rincian barang pada retur pembelian ini.
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
                      <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono">{formatMoney(d.terima)}</td>
                      <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono font-semibold text-red-700">{formatMoney(d.qty)}</td>
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
              { value: 'No.Pembelian', label: 'Ref. No.Pembelian' },
              { value: 'No.PO', label: 'No.PO' },
              { value: 'No.Faktur Pembelian', label: 'No.Faktur Pembelian' },
              { value: 'Mata Uang', label: 'Mata Uang' },
              { value: 'Keterangan', label: 'Keterangan' },
            ]}
          />

          <div className="flex items-center space-x-4 text-gray-700 shrink-0">
            <div className="w-64 h-5 bg-[#FFFF99] border border-[#C0C0C0] rounded-xs px-2 text-[10px] flex items-center text-gray-700 truncate">
              {selectedRetur ? `${selectedRetur.noBukti} - ${selectedRetur.namaSupplier}` : ''}
            </div>
            <span>Record: {filteredList.length}</span>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-[920px] max-w-[97vw] max-h-[93vh] bg-[#ECE9D8] border-2 border-[#0055EA] rounded-[3px] shadow-[4px_4px_12px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden font-sans text-xs">
            <div className="flex items-center justify-between h-[28px] bg-gradient-to-r from-[#0055EA] to-[#1E90FF] text-white px-2 font-bold shrink-0">
              <span>{editingId ? 'Koreksi Retur Pembelian Barang' : 'Tambah Retur Pembelian Barang Baru'}</span>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsAddOpen(false);
                }}
                className="w-[20px] h-[20px] bg-[#C75050] hover:bg-red-600 text-white rounded-[2px] flex items-center justify-center text-[11px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3 bg-[#ECE9D8] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">No. Bukti Retur:</label>
                    <input
                      type="text"
                      value={newNoBukti}
                      onChange={(e) => setNewNoBukti(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] font-mono uppercase"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Tanggal:</label>
                    <div className="w-64">
                      <DatePickerInput
                        value={newTanggal}
                        onChange={(formatted) => setNewTanggal(formatted)}
                        format="dMyShort"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-[#000084] shrink-0">Ref. No. Pembelian (Auto-Load):</label>
                    <select
                      value={newNoPembelian}
                      onChange={(e) => applyPembelianAutoFill(e.target.value)}
                      className="w-64 px-2 py-1 bg-[#FFFBEB] border border-[#7F9DB9] rounded-[2px] uppercase cursor-pointer font-mono"
                    >
                      <option value="">-- Pilih No. Pembelian Barang --</option>
                      {pembelianDropdownChoices.map((noPemb) => {
                        const info = pembelianOptions.find((p) => p.noBukti === noPemb);
                        return (
                          <option key={noPemb} value={noPemb}>
                            {info ? `${noPemb} (${info.namaSupplier} | ${info.noFaktur})` : noPemb}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Nama Supplier:</label>
                    <select
                      value={newSupplier}
                      onChange={(e) => setNewSupplier(e.target.value)}
                      required
                      className="w-64 px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] uppercase cursor-pointer"
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
                    <label className="font-semibold text-gray-700 shrink-0">No. PO / No. Faktur:</label>
                    <div className="w-64 flex gap-1.5">
                      <input
                        type="text"
                        value={newNoPo}
                        onChange={(e) => setNewNoPo(e.target.value)}
                        placeholder="No. PO"
                        className="w-1/2 px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] uppercase font-mono"
                      />
                      <input
                        type="text"
                        value={newNoFaktur}
                        onChange={(e) => setNewNoFaktur(e.target.value)}
                        placeholder="No. Faktur"
                        className="w-1/2 px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] uppercase font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Keterangan:</label>
                    <input
                      type="text"
                      value={newKeterangan}
                      onChange={(e) => setNewKeterangan(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Mata Uang:</label>
                    <select
                      value={newMataUang}
                      onChange={(e) => setNewMataUang(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] cursor-pointer"
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
                    <label className="font-semibold text-gray-700 shrink-0">Disc (%) / Nominal:</label>
                    <div className="w-64 flex gap-1.5 items-center">
                      <input
                        type="number"
                        step="0.01"
                        value={newDisc}
                        onChange={(e) => handleDiscChange(e.target.value)}
                        placeholder="Disc%"
                        className="w-20 px-1.5 py-1 bg-white border border-[#7F9DB9] rounded-[2px] text-center font-mono"
                      />
                      <input
                        type="text"
                        value={formatMoney(parseNum(newNilaiDisc))}
                        readOnly
                        className="flex-1 px-2 py-1 bg-[#F5F5F5] border border-[#7F9DB9] rounded-[2px] font-mono text-right"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">PPN (%) / Nominal PPN:</label>
                    <div className="w-64 flex gap-1.5 items-center">
                      <input
                        type="number"
                        step="0.01"
                        value={newPpn}
                        onChange={(e) => handlePpnChange(e.target.value)}
                        placeholder="PPN%"
                        className="w-20 px-1.5 py-1 bg-white border border-[#7F9DB9] rounded-[2px] text-center font-mono"
                        title="Persentase PPN (%) — Memotong Total setelah Disc"
                      />
                      <input
                        type="text"
                        value={formatMoney(parseNum(newNilaiPpn))}
                        readOnly
                        className="flex-1 px-2 py-1 bg-[#FFFBEB] border border-[#7F9DB9] rounded-[2px] font-mono text-right font-semibold text-[#9A3412]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">
                      Nilai Retur ({newMataUang}):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newNilaiRetur}
                      onChange={(e) => setNewNilaiRetur(e.target.value)}
                      readOnly={hasFilledDetailRows}
                      className={`w-64 px-2 py-1 border border-[#7F9DB9] rounded-[2px] font-mono text-right font-bold ${
                        hasFilledDetailRows ? 'bg-[#F0F4FF] text-[#000084]' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Sts.Print / Tgl.Print:</label>
                    <div className="w-64 flex gap-1.5 items-center">
                      <select
                        value={newStsPrint}
                        onChange={(e) => setNewStsPrint(e.target.value)}
                        className="w-24 px-1.5 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                      >
                        <option value="Not Yet">Not Yet</option>
                        <option value="Printed">Printed</option>
                      </select>
                      <div className="flex-1">
                        <DatePickerInput
                          value={newTglPrint}
                          onChange={(formatted) => setNewTglPrint(formatted)}
                          format="dMyShort"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-gray-700 shrink-0">Sts.Post / Tgl.Post:</label>
                    <div className="w-64 flex gap-1.5 items-center">
                      <select
                        value={newStsPost}
                        onChange={(e) => setNewStsPost(e.target.value)}
                        className="w-24 px-1.5 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                        title="Posted otomatis mengurangi stok di Master Barang"
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
              </div>

              {/* Retur Detail Datagrid */}
              <div className="border border-[#7F9DB9] bg-white rounded flex flex-col mt-2">
                <div className="bg-[#ECE9D8] px-2 py-1 font-bold border-b border-[#7F9DB9] flex justify-between items-center text-[11px]">
                  <span>RETUR DETAIL BARANG (Auto-Kurangi Stok Master Barang saat Posted)</span>
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
                        <th className="px-2 py-1 border-r border-[#C0C0C0] w-20 text-right">Terima Beli</th>
                        <th className="px-2 py-1 border-r border-[#C0C0C0] w-24 text-right">QTY Retur</th>
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
                        const overLimit = d.maxQty !== undefined && d.qty > d.maxQty;
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
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={d.qty}
                                  onChange={(e) => {
                                    const val = parseNum(e.target.value);
                                    const jumlah = val * d.harga;
                                    updateDetailRowsWithSync((prev) =>
                                      prev.map((r, i) =>
                                        i === index ? { ...r, qty: val, jumlah, total: jumlah } : r
                                      )
                                    );
                                  }}
                                  className={`w-full px-1 py-0.5 border rounded text-right font-mono ${
                                    overLimit ? 'border-red-600 bg-red-50 text-red-700 font-bold' : 'border-[#ccc]'
                                  }`}
                                />
                                {d.maxQty !== undefined && (
                                  <span
                                    className="text-[9px] text-gray-500 font-mono shrink-0"
                                    title={`Maksimal sisa bisa diretur: ${d.maxQty}`}
                                  >
                                    /{d.maxQty}
                                  </span>
                                )}
                              </div>
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
                      Total Detail: {newMataUang} {formatMoney(modalGrossTotal)}
                    </span>
                    <span className="text-gray-700">
                      Disc ({parseNum(newDisc)}%): -{newMataUang} {formatMoney(parseNum(newNilaiDisc))}
                    </span>
                    <span className="text-[#9A3412]">
                      Potongan PPN ({parseNum(newPpn)}%): -{newMataUang} {formatMoney(parseNum(newNilaiPpn))}
                    </span>
                    <span className="text-[#000084] bg-[#E8EEFF] px-2 py-0.5 border border-[#8BA4E8]">
                      Nilai Retur: {newMataUang} {formatMoney(parseNum(newNilaiRetur))}
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
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded uppercase text-xs"
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
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded uppercase text-xs"
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

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#D4D0C8]">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-800 font-semibold rounded-[2px] shadow-xs cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="px-4 py-1.5 bg-[#E1DFDD] hover:bg-[#F3F2F1] active:bg-[#C8C6C4] border border-[#ADABA1] text-black rounded-[2px] shadow-xs cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={printMode === 'detail' ? 'BUKTI RETUR PEMBELIAN BARANG (DETAIL)' : 'LAPORAN RETUR PEMBELIAN BARANG'}
        subtitle={
          printMode === 'detail' && selectedRetur
            ? `No. Bukti: ${selectedRetur.noBukti} | Ref. Pembelian: ${selectedRetur.noPembelian} | Supplier: ${selectedRetur.namaSupplier}`
            : `Filter Tanggal: ${tanggalFilter}`
        }
        metaLines={
          printMode === 'detail' && selectedRetur
            ? [
                { label: 'No. Bukti Retur', value: selectedRetur.noBukti },
                { label: 'Tanggal', value: selectedRetur.tanggal },
                { label: 'Nama Supplier', value: selectedRetur.namaSupplier },
                { label: 'Ref. No. Pembelian', value: selectedRetur.noPembelian || '-' },
                { label: 'No. PO', value: selectedRetur.noPo || '-' },
                { label: 'No. Faktur', value: selectedRetur.noFaktur || '-' },
                { label: 'Mata Uang', value: selectedRetur.mataUang },
                {
                  label: `Disc (${selectedRetur.disc})`,
                  value: `-${selectedRetur.mataUang} ${selectedRetur.nilaiDisc}`,
                },
                {
                  label: `PPN (${selectedRetur.ppn})`,
                  value: `-${selectedRetur.mataUang} ${selectedRetur.nilaiPpn}`,
                },
                {
                  label: 'Nilai Retur (Net)',
                  value: `${selectedRetur.mataUang} ${selectedRetur.nilaiRetur}`,
                },
                { label: 'Sts. Post', value: selectedRetur.stsPost },
                { label: 'Keterangan', value: selectedRetur.keterangan || '-' },
              ]
            : []
        }
        orientation="landscape"
        columns={
          printMode === 'detail'
            ? selectedReturDetails.length > 0
              ? (detailPrintColumns as PrintColumn<any>[])
              : (listPrintColumns as PrintColumn<any>[])
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
          printMode === 'detail'
            ? [
                { label: 'Total Item', value: `${selectedReturDetails.length} Item` },
                {
                  label: `Total Detail (${selectedRetur?.mataUang || 'IDR'})`,
                  value: `${selectedRetur?.mataUang || 'IDR'} ${formatMoney(selectedDetailTotal)}`,
                },
                {
                  label: `Disc (${selectedRetur?.disc || '0%'})`,
                  value: `-${selectedRetur?.mataUang || 'IDR'} ${formatMoney(selectedRetur?.nilaiDiscNum || 0)}`,
                },
                {
                  label: `Potongan PPN (${selectedRetur?.ppn || '0%'})`,
                  value: `-${selectedRetur?.mataUang || 'IDR'} ${formatMoney(selectedRetur?.nilaiPpnNum || 0)}`,
                },
                {
                  label: 'Nilai Retur (Net)',
                  value: `${selectedRetur?.mataUang || 'IDR'} ${formatMoney(selectedRetur?.nilaiReturNum || 0)}`,
                },
              ]
            : [
                { label: 'Total Record', value: `${filteredList.length} Transaksi` },
                { label: 'Total Disc', value: formatRupiah(totalNilaiDisc) },
                { label: 'Total PPN', value: formatRupiah(totalNilaiPpn) },
                { label: 'Total Nilai Retur', value: formatRupiah(totalNilaiRetur) },
              ]
        }
        selectedRow={printMode === 'list' ? selectedRetur : undefined}
        selectedRows={
          printMode === 'list' && selectedReturDetails.length > 0 ? selectedReturDetails : undefined
        }
        selectedTitle={
          printMode === 'list'
            ? selectedReturDetails.length > 0
              ? 'BUKTI RETUR PEMBELIAN BARANG (RECORD TERPILIH)'
              : 'RETUR PEMBELIAN BARANG (RECORD TERPILIH)'
            : undefined
        }
        selectedSubtitle={
          printMode === 'list' && selectedRetur
            ? `No. Bukti: ${selectedRetur.noBukti} | Ref. Pembelian: ${selectedRetur.noPembelian} | Supplier: ${selectedRetur.namaSupplier}`
            : undefined
        }
        selectedMetaLines={
          printMode === 'list' && selectedRetur
            ? [
                { label: 'No. Bukti', value: selectedRetur.noBukti },
                { label: 'Tanggal', value: selectedRetur.tanggal },
                { label: 'Nama Supplier', value: selectedRetur.namaSupplier },
                { label: 'Ref. Pembelian', value: selectedRetur.noPembelian || '-' },
                { label: 'No. PO', value: selectedRetur.noPo || '-' },
                { label: 'No. Faktur', value: selectedRetur.noFaktur || '-' },
                { label: 'Mata Uang / Disc / PPN', value: `${selectedRetur.mataUang} / ${selectedRetur.disc} / ${selectedRetur.ppn}` },
                { label: 'Keterangan', value: selectedRetur.keterangan || '-' },
              ]
            : undefined
        }
        selectedColumns={
          printMode === 'list' && selectedReturDetails.length > 0
            ? (detailPrintColumns as PrintColumn<any>[])
            : undefined
        }
        selectedSummaryItems={
          printMode === 'list' && selectedRetur
            ? [
                { label: 'No. Bukti', value: selectedRetur.noBukti },
                { label: 'Potongan PPN', value: `-${selectedRetur.mataUang} ${selectedRetur.nilaiPpn}` },
                { label: 'Nilai Retur', value: `${selectedRetur.mataUang} ${selectedRetur.nilaiRetur}` },
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
              Retur Terpilih (Detail)
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('list')}
              className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                printMode === 'list' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              List Retur Pembelian
            </button>
          </div>
        }
      />

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Retur Pembelian"
        rows={returList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.noBukti,
          r.tanggal,
          r.namaSupplier,
          r.noPembelian,
          r.noPo,
          r.noFaktur,
          r.nilaiRetur,
          r.keterangan,
          r.mataUang,
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
          showFeedback(`Retur Pembelian [${row.noBukti} - ${row.namaSupplier}] dipilih`);
        }}
        columns={[
          { header: 'Kode / No.Bukti', accessor: (r) => r.noBukti, widthClass: 'w-32', mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal, widthClass: 'w-22', align: 'center' },
          { header: 'Nama Supplier', accessor: (r) => r.namaSupplier, bold: true },
          { header: 'Ref. Pembelian', accessor: (r) => r.noPembelian, widthClass: 'w-28', mono: true },
          { header: 'No.PO', accessor: (r) => r.noPo, widthClass: 'w-28', mono: true },
          { header: 'MU', accessor: (r) => r.mataUang, widthClass: 'w-14', align: 'center', mono: true },
          { header: 'Nilai Retur', accessor: (r) => r.nilaiRetur, widthClass: 'w-28', align: 'right', mono: true },
        ]}
      />
    </div>
  );
};
