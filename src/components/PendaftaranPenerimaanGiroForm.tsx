import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { ConfirmDialog } from './ConfirmDialog';
import {
  erpCompositeSave,
  erpDelete,
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
  nextUniqueCode,
  parseNum,
  toDisplayDmy,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { getCurrentUser } from '../lib/authService';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface PenerimaanGiroItem {
  id: string;
  no: number;
  idCustomer: string;
  customer: string;
  refType: 'FAKTUR' | 'SO' | 'DP' | 'UMUM';
  noRef: string;
  noFaktur: string;
  noCekGiro: string;
  bank: string;
  due: string;
  stsCair: 'Belum Cair' | 'Cair' | 'Tolak';
  tglCair: string;
  amountPaid: number;
  keterangan: string;
}

interface GiroPenjualanHeader {
  id: string;
  no_bukti: string;
  tanggal: string;
  dibuat_oleh: string;
}

interface FakturRefOption {
  noBukti: string;
  jenisFaktur: string;
  namaCustomer: string;
  noSo: string;
  nilaiPenjualan: number;
  stsLunas: string;
}

interface SalesOrderRefOption {
  noBukti: string;
  namaCustomer: string;
  nilaiSo: number;
  soClose: string;
}

interface PendaftaranPenerimaanGiroFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function normalizeStsCair(val: unknown): 'Belum Cair' | 'Cair' | 'Tolak' {
  const s = String(val || '').trim().toUpperCase();
  if (s === 'CAIR') return 'Cair';
  if (s === 'TOLAK' || s === 'BATAL') return 'Tolak';
  return 'Belum Cair';
}

function normalizeRefType(val: unknown): 'FAKTUR' | 'SO' | 'DP' | 'UMUM' {
  const s = String(val || '').trim().toUpperCase();
  if (s === 'SO') return 'SO';
  if (s === 'DP') return 'DP';
  if (s === 'UMUM') return 'UMUM';
  return 'FAKTUR';
}

export const PendaftaranPenerimaanGiroForm: React.FC<PendaftaranPenerimaanGiroFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [headerId, setHeaderId] = useState<string>('');
  const [noBukti, setNoBukti] = useState<string>('GIRO00001');
  const [tanggal, setTanggal] = useState<string>(() => toDisplayDmy(todayIso()));
  const [savedHeaders, setSavedHeaders] = useState<GiroPenjualanHeader[]>([]);
  const [headerIndex, setHeaderIndex] = useState<number>(0);

  const [giroList, setGiroList] = useState<PenerimaanGiroItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);

  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [bankOptions, setBankOptions] = useState<string[]>([]);
  const [fakturOptions, setFakturOptions] = useState<FakturRefOption[]>([]);
  const [soOptions, setSoOptions] = useState<SalesOrderRefOption[]>([]);

  const loadMasterCustomers = async () => {
    try {
      const rows = await erpList<any>('master_customers', {
        orderBy: 'nama_customer',
        asc: true,
        limit: 1000,
      });
      setCustomerOptions(rows.filter((r) => r.is_active !== false));
    } catch {
      setCustomerOptions([]);
    }
  };

  const loadMasterBanks = async () => {
    try {
      const rows = await erpList<any>('master_banks', {
        orderBy: 'nama_bank',
        asc: true,
        limit: 1000,
      });
      const uniqueBanks = Array.from(
        new Set(
          rows
            .filter((r) => r.is_active !== false)
            .map((r) => String(r.nama_bank || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setBankOptions(uniqueBanks);
    } catch {
      setBankOptions([]);
    }
  };

  const loadSalesReferences = async () => {
    const [fakturRes, soRes] = await Promise.allSettled([
      erpList<any>('faktur_penjualans', { orderBy: 'tanggal', asc: false, limit: 1000 }),
      erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }),
    ]);

    if (fakturRes.status === 'fulfilled') {
      setFakturOptions(
        fakturRes.value
          .map((f: any) => ({
            noBukti: String(f.no_bukti || '').trim().toUpperCase(),
            jenisFaktur: String(f.jenis_faktur || 'REGULAR').trim().toUpperCase(),
            namaCustomer: String(f.nama_customer || '').trim().toUpperCase(),
            noSo: String(f.no_so || '').trim().toUpperCase(),
            nilaiPenjualan: Number(f.nilai_penjualan || 0),
            stsLunas: String(f.sts_lunas || 'Not Yet').trim(),
          }))
          .filter((f: FakturRefOption) => Boolean(f.noBukti))
      );
    } else {
      setFakturOptions([]);
    }

    if (soRes.status === 'fulfilled') {
      setSoOptions(
        soRes.value
          .map((s: any) => ({
            noBukti: String(s.no_bukti || '').trim().toUpperCase(),
            namaCustomer: String(s.nama_customer || '').trim().toUpperCase(),
            nilaiSo: Number(s.nilai_so || 0),
            soClose: String(s.so_close || 'Not Yet').trim(),
          }))
          .filter((s: SalesOrderRefOption) => Boolean(s.noBukti))
      );
    } else {
      setSoOptions([]);
    }
  };

  const loadMasterData = async () => {
    await Promise.all([loadMasterCustomers(), loadMasterBanks(), loadSalesReferences()]);
  };

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoUrut, setNewNoUrut] = useState<string>('1');
  const [newIdCustomer, setNewIdCustomer] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newRefType, setNewRefType] = useState<'FAKTUR' | 'SO' | 'DP' | 'UMUM'>('FAKTUR');
  const [newNoRef, setNewNoRef] = useState<string>('');
  const [newNoFaktur, setNewNoFaktur] = useState<string>('');
  const [newNoCekGiro, setNewNoCekGiro] = useState<string>('');
  const [newBank, setNewBank] = useState<string>('');
  const [newDue, setNewDue] = useState<string>(() => toDisplayDmy(todayIso()));
  const [newStsCair, setNewStsCair] = useState<'Belum Cair' | 'Cair' | 'Tolak'>('Belum Cair');
  const [newTglCair, setNewTglCair] = useState<string>('');
  const [newAmountPaid, setNewAmountPaid] = useState<string>('0');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{
    mode: 'row' | 'header';
    id: string;
    label: string;
  } | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const mapDetailsFromDb = (dets: any[]): PenerimaanGiroItem[] =>
    dets.map((d, i) => ({
      id: d.id,
      no: Number(d.no_urut ?? i + 1),
      idCustomer: d.id_customer || '',
      customer: d.customer || '',
      refType: normalizeRefType(d.ref_type),
      noRef: String(d.no_ref || d.no_faktur || '').trim().toUpperCase(),
      noFaktur: String(d.no_faktur || '').trim().toUpperCase(),
      noCekGiro: d.no_cek_giro || '',
      bank: d.bank || '',
      due: toDisplayDmy(d.due),
      stsCair: normalizeStsCair(d.sts_cair),
      tglCair: d.tgl_cair ? toDisplayDmy(d.tgl_cair) : '',
      amountPaid: Number(d.amount_paid || 0),
      keterangan: d.keterangan || '',
    }));

  const loadHeaderDetails = async (hdr: GiroPenjualanHeader, idx = 0) => {
    try {
      setIsBusy(true);
      const dets = await erpList<any>('giro_penjualan_details', {
        eq: { header_id: hdr.id },
        orderBy: 'no_urut',
        asc: true,
      });
      setHeaderId(hdr.id);
      setHeaderIndex(idx);
      setNoBukti(hdr.no_bukti);
      setTanggal(toDisplayDmy(hdr.tanggal) || toDisplayDmy(todayIso()));

      const mapped = mapDetailsFromDb(dets);
      setGiroList(mapped);
      setSelectedId(mapped[0]?.id || '');
    } catch (err: any) {
      showFeedback(`Gagal load detail: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const loadInitialData = async () => {
    try {
      setIsBusy(true);
      const [headers] = await Promise.all([
        erpList<GiroPenjualanHeader>('giro_penjualan_headers', {
          orderBy: 'created_at',
          asc: false,
          limit: 100,
        }),
        loadMasterData(),
      ]);

      setSavedHeaders(headers);
      if (headers.length > 0) {
        await loadHeaderDetails(headers[0], 0);
      } else {
        setHeaderId('');
        setNoBukti('GIRO00001');
        setTanggal(toDisplayDmy(todayIso()));
        setGiroList([]);
        setSelectedId('');
      }
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadInitialData();
  }, [isOpen]);

  if (!isOpen) return null;

  const persistGiro = async (
    listToSave: PenerimaanGiroItem[],
    onError?: (msg: string) => void
  ): Promise<boolean> => {
    const cleanNoBukti = noBukti.trim().toUpperCase();
    if (!cleanNoBukti) {
      const msg = 'No.Bukti wajib diisi';
      showFeedback(msg);
      onError?.(msg);
      return false;
    }

    try {
      setIsBusy(true);
      const headerPayload: Record<string, any> = {
        no_bukti: cleanNoBukti,
        tanggal: toIsoDate(tanggal) || todayIso(),
        dibuat_oleh: getCurrentUser().username || 'ADMIN',
      };
      if (headerId) headerPayload.id = headerId;

      const detailPayloads = listToSave.map((item, idx) => {
        const cleanRefType = item.refType || 'FAKTUR';
        const cleanNoRef = item.noRef.trim().toUpperCase();
        const cleanNoFaktur =
          item.noFaktur.trim().toUpperCase() ||
          (cleanRefType === 'FAKTUR' || cleanRefType === 'DP' ? cleanNoRef : '');
        const cleanStsCair = item.stsCair || 'Belum Cair';
        const tglCairIso =
          cleanStsCair === 'Cair'
            ? toIsoDate(item.tglCair) || toIsoDate(item.due) || todayIso()
            : toIsoDate(item.tglCair);
        return {
          no_urut: parseInt(String(item.no || ''), 10) || idx + 1,
          id_customer: item.idCustomer.trim().toUpperCase(),
          customer: item.customer.trim().toUpperCase(),
          ref_type: cleanRefType,
          no_ref: cleanNoRef,
          no_faktur: cleanNoFaktur,
          no_cek_giro: item.noCekGiro.trim().toUpperCase(),
          bank: item.bank.trim().toUpperCase(),
          due: toIsoDate(item.due),
          sts_cair: cleanStsCair,
          tgl_cair: tglCairIso,
          amount_paid: parseNum(item.amountPaid),
          keterangan: item.keterangan.trim(),
        };
      });

      const res = await erpCompositeSave<{
        header: GiroPenjualanHeader;
        details: any[];
        detailWarning?: string;
      }>('giro-penjualan', headerPayload, detailPayloads);

      if (res.header) {
        setHeaderId(res.header.id);
        setNoBukti(res.header.no_bukti);
        setTanggal(toDisplayDmy(res.header.tanggal));
      }

      const mapped = mapDetailsFromDb(res.details || []);
      setGiroList(mapped);
      if (mapped.length > 0) setSelectedId(mapped[0].id);

      const headers = await erpList<GiroPenjualanHeader>('giro_penjualan_headers', {
        orderBy: 'created_at',
        asc: false,
        limit: 100,
      });
      setSavedHeaders(headers);
      showFeedback(
        res.detailWarning
          ? `Tersimpan (catatan: ${res.detailWarning})`
          : 'Penerimaan Giro tersimpan & piutang customer disinkronkan'
      );
      return true;
    } catch (err: any) {
      const msg = `Gagal simpan: ${err.message}`;
      showFeedback(msg);
      onError?.(msg);
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const handleNewDocument = () => {
    setHeaderId('');
    setNoBukti(nextUniqueCode(savedHeaders.map((h) => h.no_bukti), 'GIRO', 5));
    setTanggal(toDisplayDmy(todayIso()));
    setGiroList([]);
    setSelectedId('');
    showFeedback('Dokumen Giro Baru siap diisi');
  };

  const handleAddNew = async () => {
    setModalError(null);
    setEditingId(null);
    setNewNoUrut(String(giroList.length + 1));
    setNewIdCustomer('');
    setNewCustomer('');
    setNewRefType('FAKTUR');
    setNewNoRef('');
    setNewNoFaktur('');
    setNewNoCekGiro('');
    setNewBank('');
    setNewDue(toDisplayDmy(todayIso()));
    setNewStsCair('Belum Cair');
    setNewTglCair('');
    setNewAmountPaid('0');
    setNewKeterangan('');
    setIsAddOpen(true);
    await loadMasterData();
  };

  const handleEdit = async () => {
    const item = giroList.find((g) => g.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setModalError(null);
    setEditingId(item.id);
    setNewNoUrut(String(item.no));
    setNewIdCustomer(item.idCustomer);
    setNewCustomer(item.customer);
    setNewRefType(item.refType || 'FAKTUR');
    setNewNoRef(item.noRef || item.noFaktur || '');
    setNewNoFaktur(item.noFaktur || '');
    setNewNoCekGiro(item.noCekGiro);
    setNewBank(item.bank);
    setNewDue(item.due || toDisplayDmy(todayIso()));
    setNewStsCair(item.stsCair || 'Belum Cair');
    setNewTglCair(item.tglCair || '');
    setNewAmountPaid(String(item.amountPaid));
    setNewKeterangan(item.keterangan);
    setIsAddOpen(true);
    await loadMasterData();
  };

  const handleSelectReference = (refCode: string) => {
    const clean = refCode.trim().toUpperCase();
    setNewNoRef(clean);
    if (!clean) {
      if (newRefType === 'FAKTUR' || newRefType === 'DP') setNewNoFaktur('');
      return;
    }

    if (newRefType === 'FAKTUR' || newRefType === 'DP') {
      const f = fakturOptions.find((x) => x.noBukti === clean);
      setNewNoFaktur(clean);
      if (f) {
        if (!newCustomer.trim() && f.namaCustomer) {
          setNewCustomer(f.namaCustomer);
          const foundCust = customerOptions.find(
            (c) => String(c.nama_customer || '').trim().toUpperCase() === f.namaCustomer
          );
          if (foundCust) setNewIdCustomer(foundCust.kode_customer || foundCust.id || 'CUS01');
        }
        if (parseNum(newAmountPaid) <= 0 && f.nilaiPenjualan > 0) {
          setNewAmountPaid(String(f.nilaiPenjualan));
        }
        if (!newKeterangan.trim()) {
          setNewKeterangan(`Pelunasan ${newRefType === 'DP' ? 'Faktur DP' : 'Faktur'} ${clean}`);
        }
      }
    } else if (newRefType === 'SO') {
      const s = soOptions.find((x) => x.noBukti === clean);
      setNewNoFaktur('');
      if (s) {
        if (!newCustomer.trim() && s.namaCustomer) {
          setNewCustomer(s.namaCustomer);
          const foundCust = customerOptions.find(
            (c) => String(c.nama_customer || '').trim().toUpperCase() === s.namaCustomer
          );
          if (foundCust) setNewIdCustomer(foundCust.kode_customer || foundCust.id || 'CUS01');
        }
        if (parseNum(newAmountPaid) <= 0 && s.nilaiSo > 0) {
          setNewAmountPaid(String(s.nilaiSo));
        }
        if (!newKeterangan.trim()) {
          setNewKeterangan(`Pembayaran Giro untuk SO ${clean}`);
        }
      }
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newCustomer.trim() || !newNoCekGiro.trim() || !newBank.trim()) {
      setModalError('Customer, No. Cek / Giro, dan Bank wajib diisi.');
      return;
    }
    if (parseNum(newAmountPaid) <= 0) {
      setModalError('Amount Paid (Jumlah Giro) harus lebih dari 0.');
      return;
    }

    const cleanCust = newCustomer.trim().toUpperCase();
    const resolvedIdCust =
      newIdCustomer.trim().toUpperCase() ||
      customerOptions.find((c) => String(c.nama_customer || '').trim().toUpperCase() === cleanCust)
        ?.kode_customer ||
      'CUS01';
    const cleanNoRef = newNoRef.trim().toUpperCase();
    const cleanNoFaktur =
      newNoFaktur.trim().toUpperCase() ||
      (newRefType === 'FAKTUR' || newRefType === 'DP' ? cleanNoRef : '');

    let nextList: PenerimaanGiroItem[];
    if (editingId) {
      nextList = giroList.map((g) =>
        g.id === editingId
          ? {
              ...g,
              no: parseInt(newNoUrut, 10) || g.no,
              idCustomer: resolvedIdCust,
              customer: cleanCust,
              refType: newRefType,
              noRef: cleanNoRef,
              noFaktur: cleanNoFaktur,
              noCekGiro: newNoCekGiro.trim().toUpperCase(),
              bank: newBank.trim().toUpperCase(),
              due: newDue || g.due,
              stsCair: newStsCair,
              tglCair:
                newStsCair === 'Cair' ? newTglCair || newDue || toDisplayDmy(todayIso()) : newTglCair,
              amountPaid: parseNum(newAmountPaid),
              keterangan: newKeterangan.trim(),
            }
          : g
      );
    } else {
      const newItem: PenerimaanGiroItem = {
        id: Date.now().toString(),
        no: parseInt(newNoUrut, 10) || giroList.length + 1,
        idCustomer: resolvedIdCust,
        customer: cleanCust,
        refType: newRefType,
        noRef: cleanNoRef,
        noFaktur: cleanNoFaktur,
        noCekGiro: newNoCekGiro.trim().toUpperCase(),
        bank: newBank.trim().toUpperCase(),
        due: newDue || toDisplayDmy(todayIso()),
        stsCair: newStsCair,
        tglCair:
          newStsCair === 'Cair' ? newTglCair || newDue || toDisplayDmy(todayIso()) : newTglCair,
        amountPaid: parseNum(newAmountPaid),
        keterangan: newKeterangan.trim(),
      };
      nextList = [...giroList, newItem];
    }

    const ok = await persistGiro(nextList, (msg) => setModalError(msg));
    if (ok) {
      setIsAddOpen(false);
      setEditingId(null);
      setModalError(null);
    }
  };

  const requestDeleteRow = (id: string) => {
    const target = giroList.find((g) => g.id === id);
    if (!target) {
      if (giroList.length === 0 && headerId) {
        setConfirmDeleteTarget({
          mode: 'header',
          id: headerId,
          label: `dokumen giro [${noBukti}]`,
        });
        return;
      }
      showFeedback('Pilih baris yang akan dihapus');
      return;
    }
    setConfirmDeleteTarget({
      mode: 'row',
      id: target.id,
      label: `Giro ${target.noCekGiro || target.customer}`,
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTarget) return;
    if (confirmDeleteTarget.mode === 'header') {
      try {
        setIsBusy(true);
        await erpDelete('giro_penjualan_headers', confirmDeleteTarget.id);
        setConfirmDeleteTarget(null);
        showFeedback('Dokumen giro dihapus dari Supabase');
        await loadInitialData();
      } catch (err: any) {
        showFeedback(`Gagal hapus: ${err.message}`);
      } finally {
        setIsBusy(false);
      }
      return;
    }

    const updated = giroList
      .filter((item) => item.id !== confirmDeleteTarget.id)
      .map((item, idx) => ({ ...item, no: idx + 1 }));

    if (updated.length === 0 && headerId) {
      try {
        setIsBusy(true);
        await erpDelete('giro_penjualan_headers', headerId);
        setConfirmDeleteTarget(null);
        showFeedback('Dokumen giro dihapus dari Supabase');
        await loadInitialData();
      } catch (err: any) {
        showFeedback(`Gagal hapus: ${err.message}`);
      } finally {
        setIsBusy(false);
      }
      return;
    }

    const ok = await persistGiro(updated);
    if (ok) {
      setConfirmDeleteTarget(null);
    }
  };

  const handlePrevHeader = async () => {
    if (savedHeaders.length === 0) return;
    const nextIdx = Math.min(savedHeaders.length - 1, headerIndex + 1);
    await loadHeaderDetails(savedHeaders[nextIdx], nextIdx);
  };

  const handleNextHeader = async () => {
    if (savedHeaders.length === 0) return;
    const prevIdx = Math.max(0, headerIndex - 1);
    await loadHeaderDetails(savedHeaders[prevIdx], prevIdx);
  };

  const filteredList = giroList.filter((item) => {
    if (searchField === 'Kode') return matchesMultiKeyword([item.noCekGiro, item.idCustomer], searchTerm);
    if (searchField === 'Customer') return matchesMultiKeyword([item.customer], searchTerm);
    if (searchField === 'ID Customer') return matchesMultiKeyword([item.idCustomer], searchTerm);
    if (searchField === 'No. Cek / Giro') return matchesMultiKeyword([item.noCekGiro], searchTerm);
    if (searchField === 'No. Referensi') return matchesMultiKeyword([item.noRef, item.noFaktur], searchTerm);
    if (searchField === 'Bank') return matchesMultiKeyword([item.bank], searchTerm);
    if (searchField === 'Status') return matchesMultiKeyword([item.stsCair], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
    return matchesMultiKeyword(
      [
        item.idCustomer,
        item.customer,
        item.refType,
        item.noRef,
        item.noFaktur,
        item.noCekGiro,
        item.bank,
        item.due,
        item.stsCair,
        item.keterangan,
      ],
      searchTerm
    );
  });

  const totalAmountPaid = filteredList.reduce((sum, i) => sum + i.amountPaid, 0);

  const selectedGiro =
    filteredList.find((g) => g.id === selectedId) ||
    giroList.find((g) => g.id === selectedId) ||
    null;

  const SEARCH_DETAIL_COL_MAP: Record<string, string> = {
    Kode: 'no_cek_giro',
    Customer: 'customer',
    'ID Customer': 'id_customer',
    'No. Cek / Giro': 'no_cek_giro',
    'No. Referensi': 'no_ref',
    Bank: 'bank',
    Status: 'sts_cair',
    Keterangan: 'keterangan',
  };

  const searchDetailSupabase = async (fieldVal: string, termVal: string) => {
    if (!headerId) return;
    try {
      setIsBusy(true);
      const clean = termVal.trim();
      const queryOpts: Record<string, any> = {
        eq: { header_id: headerId },
        orderBy: 'no_urut',
        asc: true,
      };
      if (clean) {
        const col = SEARCH_DETAIL_COL_MAP[fieldVal];
        if (col) {
          queryOpts.searchCol = col;
          queryOpts.searchVal = clean;
        } else {
          queryOpts.orSearch = 'id_customer,customer,no_cek_giro,bank,keterangan';
          queryOpts.searchVal = clean;
        }
      }
      const dets = await erpList<any>('giro_penjualan_details', queryOpts);
      const mapped = mapDetailsFromDb(dets);
      setGiroList(mapped);
      setSelectedId(mapped[0]?.id || '');
      showFeedback(
        clean
          ? `Ditemukan ${mapped.length} baris giro dari Supabase`
          : `Menampilkan ${mapped.length} baris giro`
      );
    } catch (err: any) {
      showFeedback(`Gagal cari giro: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const searchHeadersSupabase = async (q: string): Promise<GiroPenjualanHeader[] | null> => {
    try {
      const clean = q.trim();
      const queryOpts: Record<string, any> = {
        orderBy: 'created_at',
        asc: false,
        limit: 100,
      };
      if (clean) {
        queryOpts.orSearch = 'no_bukti,dibuat_oleh';
        queryOpts.searchVal = clean;
      }
      const headers = await erpList<GiroPenjualanHeader>('giro_penjualan_headers', queryOpts);
      setSavedHeaders(headers);
      return headers;
    } catch {
      return null;
    }
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await searchHeadersSupabase('');
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: `Penerimaan_Giro_${noBukti}`,
      sheetTitle: 'PENDAFTARAN PENERIMAAN GIRO',
      subtitle: `No. Bukti: ${noBukti} | Tanggal: ${tanggal}`,
      companyProfile: company,
      columns: [
        { header: 'No.', accessor: 'no', align: 'center' },
        { header: 'ID Customer', accessor: 'idCustomer' },
        { header: 'Customer', accessor: 'customer' },
        { header: 'Ref. Type', accessor: 'refType', align: 'center' },
        { header: 'No. Referensi', accessor: (r) => r.noRef || r.noFaktur || '-' },
        { header: 'No. Cek / Giro', accessor: 'noCekGiro' },
        { header: 'Bank', accessor: 'bank' },
        { header: 'Due', accessor: 'due', align: 'center' },
        { header: 'Status Cair', accessor: 'stsCair', align: 'center' },
        { header: 'Tgl. Cair', accessor: 'tglCair', align: 'center' },
        { header: 'Amount Paid', accessor: 'amountPaid', align: 'right' },
        { header: 'Keterangan', accessor: 'keterangan' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const cleanCustUpper = newCustomer.trim().toUpperCase();
  const modalFakturChoices = fakturOptions.filter((f) => {
    if (newRefType === 'DP' && f.jenisFaktur !== 'DP') return false;
    if (newRefType === 'FAKTUR' && f.jenisFaktur === 'DP') return false;
    if (cleanCustUpper && f.namaCustomer !== cleanCustUpper) return false;
    return f.stsLunas.toUpperCase() !== 'LUNAS' || f.noBukti === newNoRef.trim().toUpperCase();
  });

  const modalSoChoices = soOptions.filter((s) => {
    if (cleanCustUpper && s.namaCustomer !== cleanCustUpper) return false;
    return s.soClose.toUpperCase() !== 'CLOSED' || s.noBukti === newNoRef.trim().toUpperCase();
  });

  return (
    <div
      id="pendaftaran-penerimaan-giro-form"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="Pendaftaran Penerimaan Giro"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadInitialData}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 bg-[#ECE9D8] border-b border-[#ACA899] px-3 py-2 flex items-center flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-black w-[65px]">No.Bukti :</span>
            <input
              type="text"
              value={noBukti}
              onChange={(e) => setNoBukti(e.target.value.toUpperCase())}
              className="px-2 py-0.5 bg-white border border-[#7F9DB9] rounded-[1px] text-black font-mono font-bold w-[130px]"
            />
            <button
              type="button"
              onClick={handleFind}
              className="px-2 py-0.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7F9DB9] text-[10px] font-bold cursor-pointer"
            >
              Pilih...
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-black">Tanggal :</span>
            <DatePickerInput
              value={tanggal}
              onChange={(formatted) => setTanggal(formatted)}
              format="dmy"
            />
          </div>
          <ToolbarSearchControl
            compact
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onCari={() => searchDetailSupabase(searchField, searchTerm)}
            onReset={() => {
              setSearchField('Semua');
              setSearchTerm('');
              return searchDetailSupabase('Semua', '');
            }}
            inputRef={searchInputRef}
            isBusy={isBusy}
            inputWidthClass="w-[160px]"
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode (No.Giro)' },
              { value: 'Customer', label: 'Customer' },
              { value: 'ID Customer', label: 'ID Customer' },
              { value: 'No. Referensi', label: 'No. Referensi / Faktur' },
              { value: 'No. Cek / Giro', label: 'No. Cek / Giro' },
              { value: 'Bank', label: 'Bank' },
              { value: 'Status', label: 'Status Cair' },
              { value: 'Keterangan', label: 'Keterangan' },
            ]}
          />
        </div>

        <div className="shrink-0 h-[44px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-3 space-x-2 overflow-x-auto">
          <FormActionButtons
            onSimpan={() => persistGiro(giroList)}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={() => requestDeleteRow(selectedId)}
            onPrint={() => setIsPrintOpen(true)}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />
          <div className="h-[20px] w-[1px] bg-[#ACA899] mx-1" />
          <button
            type="button"
            onClick={handleNewDocument}
            className="h-[28px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] cursor-pointer text-[11px] font-semibold"
          >
            No.Bukti Baru
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 bg-[#D4D0C8] relative">
          <div className="bg-white border border-[#7F9DB9] shadow-sm min-w-[1160px] flex flex-col h-full">
            <div className="bg-[#EBEBE4] px-3 py-1 border-b border-[#7F9DB9] font-bold text-center text-gray-800 text-[11px]">
              GIRO / CEK / TRANSFER PENERIMAAN CUSTOMER DETAIL
            </div>

            <div className="overflow-auto flex-1 max-h-[calc(100vh-210px)]">
              <table className="w-full border-collapse text-left select-none text-[11px]">
                <thead>
                  <tr className="bg-gradient-to-b from-[#F2F2F2] to-[#DFDFDF] border-b border-[#7F9DB9] text-black font-semibold sticky top-0 z-10">
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[42px] text-center">No.</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[85px]">ID Cust</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] min-w-[190px]">Customer</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[140px]">Referensi</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[125px]">No. Cek / Giro</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[115px]">Bank</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[88px] text-center">Jth. Tempo</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[90px] text-center">Status Cair</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[88px] text-center">Tgl. Cair</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[125px] text-right">Amount Paid</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] min-w-[180px]">Keterangan</th>
                    <th className="py-1.5 px-2 w-[65px] text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, index) => {
                    const isSelected = selectedId === item.id;
                    const refLabel = item.noRef || item.noFaktur ? `${item.refType}: ${item.noRef || item.noFaktur}` : item.refType;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        onDoubleClick={handleEdit}
                        className={`cursor-pointer border-b border-gray-200 ${
                          isSelected
                            ? 'bg-[#316AC5] text-white'
                            : index % 2 === 0
                            ? 'bg-white hover:bg-[#F0F4F8]'
                            : 'bg-[#F9FBFD] hover:bg-[#F0F4F8]'
                        }`}
                      >
                        <td className="py-1 px-2 border-r border-gray-200 text-center font-mono">{item.no}</td>
                        <td className="py-1 px-2 border-r border-gray-200 font-mono">{item.idCustomer}</td>
                        <td className="py-1 px-2 border-r border-gray-200 font-semibold">{item.customer}</td>
                        <td className="py-1 px-2 border-r border-gray-200 font-mono text-[10.5px]">{refLabel}</td>
                        <td className="py-1 px-2 border-r border-gray-200 font-mono">{item.noCekGiro}</td>
                        <td className="py-1 px-2 border-r border-gray-200">{item.bank}</td>
                        <td className="py-1 px-2 border-r border-gray-200 text-center font-mono">{item.due}</td>
                        <td className="py-1 px-2 border-r border-gray-200 text-center font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : item.stsCair === 'Cair'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.stsCair === 'Tolak'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.stsCair}
                          </span>
                        </td>
                        <td className="py-1 px-2 border-r border-gray-200 text-center font-mono">
                          {item.tglCair || '-'}
                        </td>
                        <td className="py-1 px-2 border-r border-gray-200 text-right font-mono">
                          {formatRupiah(item.amountPaid)}
                        </td>
                        <td className="py-1 px-2 border-r border-gray-200">{item.keterangan}</td>
                        <td className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => requestDeleteRow(item.id)}
                            className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-6 text-center text-gray-500 italic">
                        Tidak ada data pendaftaran penerimaan giro. Klik "+ Baru" untuk menambah.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 bg-[#ECE9D8] border-t border-[#7F9DB9] px-3 py-1.5 flex items-center justify-between text-[11px] text-gray-800">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrevHeader}
                  title="Voucher sebelumnya"
                  className="px-2 py-0.5 bg-[#D4D0C8] border border-[#707070] rounded text-black cursor-pointer font-bold"
                >
                  &lt;&lt;
                </button>
                <span className="px-3 py-0.5 bg-white border border-[#7F9DB9] font-bold text-black uppercase">
                  GIRO IN ({savedHeaders.length} Dokumen)
                </span>
                <button
                  type="button"
                  onClick={handleNextHeader}
                  title="Voucher berikutnya"
                  className="px-2 py-0.5 bg-[#D4D0C8] border border-[#707070] rounded text-black cursor-pointer font-bold"
                >
                  &gt;&gt;
                </button>
              </div>

              <div className="flex items-center space-x-2 font-bold font-mono">
                <span>Total Amount Paid :</span>
                <span className="px-3 py-0.5 bg-white border border-[#7F9DB9] text-right min-w-[140px] inline-block">
                  {formatRupiah(totalAmountPaid)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4">
            <div className="bg-[#ECE9D8] border-2 border-[#000000] shadow-2xl w-[580px] max-w-[95vw] max-h-[92vh] flex flex-col rounded-[2px] font-sans overflow-hidden">
              <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between shrink-0">
                <span className="font-bold text-sm">
                  {editingId
                    ? 'Koreksi Pendaftaran Penerimaan Giro'
                    : 'Tambah Pendaftaran Penerimaan Giro Baru'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="text-white hover:text-red-300 font-bold px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3 overflow-y-auto">
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">No. Urut</label>
                    <input
                      type="number"
                      min={1}
                      value={newNoUrut}
                      onChange={(e) => setNewNoUrut(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-800 font-semibold mb-1">ID Customer</label>
                    <input
                      type="text"
                      value={newIdCustomer}
                      readOnly
                      className="w-full px-2 py-1 bg-gray-100 border border-[#7F9DB9] rounded text-black font-mono uppercase"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-800 font-semibold mb-1">No. Cek / Giro *</label>
                    <input
                      type="text"
                      value={newNoCekGiro}
                      onChange={(e) => setNewNoCekGiro(e.target.value.toUpperCase())}
                      placeholder="Contoh: BG-123456"
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-800 font-semibold mb-1">Customer *</label>
                  <select
                    value={newCustomer}
                    onChange={(e) => {
                      const selName = e.target.value;
                      const found = customerOptions.find(
                        (c) => String(c.nama_customer || '').trim().toUpperCase() === selName
                      );
                      setNewCustomer(selName);
                      if (found) {
                        setNewIdCustomer(found.kode_customer || found.id || 'CUS01');
                      }
                    }}
                    required
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-semibold uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Customer Aktif --</option>
                    {Array.from(
                      new Set(
                        [
                          ...customerOptions.map((c) =>
                            String(c.nama_customer || '').trim().toUpperCase()
                          ),
                          newCustomer.trim().toUpperCase(),
                        ].filter(Boolean)
                      )
                    ).map((custName) => (
                      <option key={custName} value={custName}>
                        {custName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-[#F7F5EE] p-2.5 border border-[#C6C2B5] rounded">
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Jenis Referensi</label>
                    <select
                      value={newRefType}
                      onChange={(e) => {
                        const val = normalizeRefType(e.target.value);
                        setNewRefType(val);
                        setNewNoRef('');
                        setNewNoFaktur('');
                      }}
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-semibold cursor-pointer"
                    >
                      <option value="FAKTUR">FAKTUR PENJUALAN</option>
                      <option value="DP">FAKTUR DP</option>
                      <option value="SO">SALES ORDER (SO)</option>
                      <option value="UMUM">UMUM / NON-REF</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-800 font-semibold mb-1">
                      {newRefType === 'SO'
                        ? 'No. Sales Order (Open)'
                        : newRefType === 'UMUM'
                        ? 'No. Referensi Manual'
                        : 'No. Faktur (Belum Lunas)'}
                    </label>
                    {newRefType === 'UMUM' ? (
                      <input
                        type="text"
                        value={newNoRef}
                        onChange={(e) => setNewNoRef(e.target.value.toUpperCase())}
                        placeholder="Opsional..."
                        className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono uppercase"
                      />
                    ) : newRefType === 'SO' ? (
                      <select
                        value={newNoRef}
                        onChange={(e) => handleSelectReference(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono uppercase cursor-pointer"
                      >
                        <option value="">-- Pilih Sales Order --</option>
                        {modalSoChoices.map((s) => (
                          <option key={s.noBukti} value={s.noBukti}>
                            {s.noBukti} | {s.namaCustomer} ({formatRupiah(s.nilaiSo)})
                          </option>
                        ))}
                        {newNoRef && !modalSoChoices.some((s) => s.noBukti === newNoRef) && (
                          <option value={newNoRef}>{newNoRef}</option>
                        )}
                      </select>
                    ) : (
                      <select
                        value={newNoRef}
                        onChange={(e) => handleSelectReference(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono uppercase cursor-pointer"
                      >
                        <option value="">-- Pilih Faktur Belum Lunas --</option>
                        {modalFakturChoices.map((f) => (
                          <option key={f.noBukti} value={f.noBukti}>
                            {f.noBukti} | {f.namaCustomer} ({formatRupiah(f.nilaiPenjualan)})
                          </option>
                        ))}
                        {newNoRef && !modalFakturChoices.some((f) => f.noBukti === newNoRef) && (
                          <option value={newNoRef}>{newNoRef}</option>
                        )}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Bank *</label>
                    <select
                      value={newBank}
                      onChange={(e) => setNewBank(e.target.value)}
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih Bank --</option>
                      {Array.from(
                        new Set([...bankOptions, newBank.trim().toUpperCase()].filter(Boolean))
                      ).map((bankName) => (
                        <option key={bankName} value={bankName}>
                          {bankName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Due (Jatuh Tempo)</label>
                    <DatePickerInput
                      value={newDue}
                      onChange={(formatted) => setNewDue(formatted)}
                      format="dmy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Status Cair</label>
                    <select
                      value={newStsCair}
                      onChange={(e) => {
                        const val = normalizeStsCair(e.target.value);
                        setNewStsCair(val);
                        if (val === 'Cair' && !newTglCair) {
                          setNewTglCair(newDue || toDisplayDmy(todayIso()));
                        }
                      }}
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-semibold cursor-pointer"
                    >
                      <option value="Belum Cair">Belum Cair</option>
                      <option value="Cair">Cair</option>
                      <option value="Tolak">Tolak</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Tanggal Cair</label>
                    <DatePickerInput
                      value={newTglCair}
                      onChange={(formatted) => setNewTglCair(formatted)}
                      format="dmy"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Amount Paid (Rp) *</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={newAmountPaid}
                      onChange={(e) => setNewAmountPaid(e.target.value)}
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono text-right font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-800 font-semibold mb-1">Keterangan</label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    placeholder="Keterangan penerimaan giro..."
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black"
                  />
                </div>

                {modalError && (
                  <div className="p-2 bg-[#FDE8E8] border border-[#C00000] text-[#900000] text-[11px] font-semibold">
                    {modalError}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-3 border-t border-[#ACA899]">
                  <button
                    type="button"
                    onClick={() => {
                      setModalError(null);
                      setIsAddOpen(false);
                    }}
                    className="px-4 py-1.5 bg-[#D4D0C8] hover:bg-gray-300 border border-[#707070] rounded text-black font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="px-4 py-1.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded font-semibold cursor-pointer shadow"
                  >
                    Simpan Giro
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <SupabaseFindModal
          isOpen={isFindOpen}
          onClose={() => setIsFindOpen(false)}
          tableLabel="Pendaftaran Penerimaan Giro"
          rows={savedHeaders}
          selectedId={headerId}
          getRowId={(h) => h.id}
          getSearchValues={(h) => [h.no_bukti, toDisplayDmy(h.tanggal), h.dibuat_oleh]}
          isBusy={isBusy}
          onSearchSupabase={(q) => searchHeadersSupabase(q)}
          onRefreshSupabase={() => searchHeadersSupabase('')}
          onSelectRow={async (hdr) => {
            const idx = savedHeaders.findIndex((x) => x.id === hdr.id);
            await loadHeaderDetails(hdr, idx >= 0 ? idx : 0);
            showFeedback(`Dokumen Giro [${hdr.no_bukti}] dipilih`);
          }}
          columns={[
            { header: 'Kode / No.Bukti', accessor: (h) => h.no_bukti, widthClass: 'w-40', mono: true, bold: true },
            { header: 'Tanggal', accessor: (h) => toDisplayDmy(h.tanggal), widthClass: 'w-32', align: 'center' },
            { header: 'Dibuat Oleh', accessor: (h) => h.dibuat_oleh || '-' },
          ]}
        />

        <ConfirmDialog
          isOpen={Boolean(confirmDeleteTarget)}
          title="Konfirmasi Hapus Penerimaan Giro"
          message={`Yakin ingin menghapus ${confirmDeleteTarget?.label || ''} dari database Supabase?`}
          detail="Piutang customer dan status pelunasan faktur terkait akan disinkronkan ulang otomatis."
          confirmLabel="Ya, Hapus"
          isBusy={isBusy}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteTarget(null)}
        />

        <A4PrintPreviewModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title="BUKTI PENDAFTARAN PENERIMAAN GIRO"
          subtitle={`No. Bukti: ${noBukti}`}
          metaLines={[
            { label: 'No. Bukti', value: noBukti },
            { label: 'Tanggal', value: tanggal },
          ]}
          orientation="landscape"
          columns={[
            { header: 'ID Cust', accessor: 'idCustomer', width: '70px' },
            { header: 'Customer', accessor: 'customer' },
            {
              header: 'Referensi',
              accessor: (r) => (r.noRef || r.noFaktur ? `${r.refType}: ${r.noRef || r.noFaktur}` : r.refType),
              width: '120px',
            },
            { header: 'No. Cek / Giro', accessor: 'noCekGiro', width: '105px' },
            { header: 'Bank', accessor: 'bank', width: '95px' },
            { header: 'Due', accessor: 'due', align: 'center', width: '80px' },
            { header: 'Status', accessor: 'stsCair', align: 'center', width: '75px' },
            {
              header: 'Amount Paid',
              accessor: (r) => formatMoney(r.amountPaid),
              align: 'right',
              width: '100px',
            },
            { header: 'Keterangan', accessor: 'keterangan' },
          ]}
          rows={filteredList}
          summaryItems={[{ label: 'Total Amount Paid', value: formatRupiah(totalAmountPaid) }]}
          selectedRow={selectedGiro}
          selectedTitle="BUKTI PENERIMAAN GIRO (RECORD TERPILIH)"
          selectedSubtitle={
            selectedGiro ? `No. Bukti: ${noBukti} | No. Giro: ${selectedGiro.noCekGiro}` : undefined
          }
          selectedMetaLines={
            selectedGiro
              ? [
                  { label: 'No. Bukti', value: noBukti },
                  { label: 'Tanggal', value: tanggal },
                  { label: 'Customer', value: `${selectedGiro.idCustomer} - ${selectedGiro.customer}` },
                  {
                    label: 'Referensi',
                    value: `${selectedGiro.refType}: ${selectedGiro.noRef || selectedGiro.noFaktur || '-'}`,
                  },
                  { label: 'No. Cek / Giro', value: selectedGiro.noCekGiro },
                  {
                    label: 'Bank / Due / Status',
                    value: `${selectedGiro.bank} / ${selectedGiro.due} / ${selectedGiro.stsCair}`,
                  },
                ]
              : undefined
          }
          selectedSummaryItems={
            selectedGiro
              ? [{ label: 'Amount Paid Terpilih', value: formatRupiah(selectedGiro.amountPaid) }]
              : undefined
          }
        />
      </div>
    </div>
  );
};
