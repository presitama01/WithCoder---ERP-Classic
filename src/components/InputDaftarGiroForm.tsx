import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
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

export interface GiroDetailRow {
  id: string;
  no: string;
  idSupplier: string;
  supplier: string;
  refType: '' | 'PEMBELIAN' | 'PO';
  noRef: string;
  noFaktur: string;
  noCekGiro: string;
  bank: string;
  due: string;
  amountPaid: string;
  stsCair: 'Cair' | 'Belum Cair';
  keterangan: string;
  markedDelete: boolean;
}

interface GiroHeaderRecord {
  id: string;
  no_bukti: string;
  tanggal: string;
  total_amount: number;
  dibuat_oleh: string;
}

interface PembelianGiroRef {
  noBukti: string;
  namaSupplier: string;
  noFaktur: string;
  nilaiPembelian: number;
  stsLunas: string;
}

interface PoGiroRef {
  noBukti: string;
  namaSupplier: string;
  nilaiPo: number;
  deposit: number;
  poClose: string;
}

interface InputDaftarGiroFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const createEmptyRow = (index?: number): GiroDetailRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  no: index !== undefined ? String(index) : '',
  idSupplier: '',
  supplier: '',
  refType: '',
  noRef: '',
  noFaktur: '',
  noCekGiro: '',
  bank: '',
  due: '',
  amountPaid: '',
  stsCair: 'Cair',
  keterangan: '',
  markedDelete: false,
});

function mapDbToGiroRow(d: any, idx: number): GiroDetailRow {
  const rawType = String(d.ref_type || '').trim().toUpperCase();
  const refType: '' | 'PEMBELIAN' | 'PO' =
    rawType === 'PEMBELIAN' || rawType === 'PO' ? rawType : '';
  const rawSts = String(d.sts_cair || 'Cair').trim();
  const stsCair: 'Cair' | 'Belum Cair' =
    rawSts.toLowerCase() === 'belum cair' ? 'Belum Cair' : 'Cair';
  return {
    id: d.id || `${Date.now()}-${idx}`,
    no: String(d.no_urut ?? idx + 1),
    idSupplier: d.id_supplier || '',
    supplier: d.supplier || '',
    refType,
    noRef: String(d.no_ref || '').trim().toUpperCase(),
    noFaktur: String(d.no_faktur || '').trim().toUpperCase(),
    noCekGiro: d.no_cek_giro || '',
    bank: d.bank || '',
    due: toDisplayDmy(d.due),
    amountPaid: d.amount_paid ? String(d.amount_paid) : '',
    stsCair,
    keterangan: d.keterangan || '',
    markedDelete: Boolean(d.marked_delete),
  };
}

export const InputDaftarGiroForm: React.FC<InputDaftarGiroFormProps> = ({ isOpen, onClose }) => {
  const [headerId, setHeaderId] = useState<string>('');
  const [noBukti, setNoBukti] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(() => toDisplayDmy(todayIso()));

  const [rows, setRows] = useState<GiroDetailRow[]>([createEmptyRow(1)]);
  const [selectedId, setSelectedId] = useState<string>(() => rows[0]?.id || '');

  const [savedHeaders, setSavedHeaders] = useState<GiroHeaderRecord[]>([]);
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [supplierCodeMap, setSupplierCodeMap] = useState<Record<string, string>>({});
  const [bankOptions, setBankOptions] = useState<string[]>([]);
  const [pembelianRefs, setPembelianRefs] = useState<PembelianGiroRef[]>([]);
  const [poRefs, setPoRefs] = useState<PoGiroRef[]>([]);

  const loadMasterData = async () => {
    const [suppRes, bankRes, pembRes, poRes] = await Promise.allSettled([
      erpList<any>('master_suppliers', { orderBy: 'nama_supplier', asc: true, limit: 1000 }),
      erpList<any>('master_banks', { orderBy: 'nama_bank', asc: true, limit: 1000 }),
      erpList<any>('pembelian_barangs', { orderBy: 'tanggal', asc: false, limit: 1000 }),
      erpList<any>('purchase_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }),
    ]);

    if (suppRes.status === 'fulfilled') {
      const codeMap: Record<string, string> = {};
      const names: string[] = [];
      for (const r of suppRes.value) {
        const name = String(r.nama_supplier || '').trim().toUpperCase();
        const code = String(r.kode_supplier || '').trim().toUpperCase();
        if (name) {
          names.push(name);
          if (code && !codeMap[name]) codeMap[name] = code;
        }
      }
      setSupplierOptions(Array.from(new Set(names)));
      setSupplierCodeMap(codeMap);
    }

    if (bankRes.status === 'fulfilled') {
      const uniqueBanks = Array.from(
        new Set(
          bankRes.value
            .map((r: any) => String(r.nama_bank || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setBankOptions(uniqueBanks);
    }

    if (pembRes.status === 'fulfilled') {
      const pems: PembelianGiroRef[] = pembRes.value
        .map((p: any) => ({
          noBukti: String(p.no_bukti || '').trim().toUpperCase(),
          namaSupplier: String(p.nama_supplier || '').trim().toUpperCase(),
          noFaktur: String(p.no_faktur || '-').trim().toUpperCase(),
          nilaiPembelian: Number(p.nilai_pembelian || 0),
          stsLunas: String(p.sts_lunas || 'Belum').trim(),
        }))
        .filter((p: PembelianGiroRef) => p.noBukti);
      setPembelianRefs(pems);
    }

    if (poRes.status === 'fulfilled') {
      const pos: PoGiroRef[] = poRes.value
        .map((p: any) => ({
          noBukti: String(p.no_bukti || '').trim().toUpperCase(),
          namaSupplier: String(p.nama_supplier || '').trim().toUpperCase(),
          nilaiPo: Number(p.nilai_po || 0),
          deposit: Number(p.deposit || 0),
          poClose: String(p.po_close || 'Not Yet').trim(),
        }))
        .filter((p: PoGiroRef) => p.noBukti);
      setPoRefs(pos);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formRow, setFormRow] = useState<GiroDetailRow>(createEmptyRow(1));
  const [modalError, setModalError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  const [confirmDeleteSummary, setConfirmDeleteSummary] = useState<string>('');

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadHeaderDetails = async (hdr: GiroHeaderRecord) => {
    try {
      setIsBusy(true);
      const dets = await erpList<any>('giro_pembelian_details', {
        eq: { header_id: hdr.id },
        orderBy: 'no_urut',
        asc: true,
      });
      setHeaderId(hdr.id);
      setNoBukti(hdr.no_bukti);
      setTanggal(toDisplayDmy(hdr.tanggal) || toDisplayDmy(todayIso()));
      if (dets.length > 0) {
        const mapped = dets.map((d, idx) => mapDbToGiroRow(d, idx));
        setRows(mapped);
        setSelectedId(mapped[0].id);
      } else {
        const blank = createEmptyRow(1);
        setRows([blank]);
        setSelectedId(blank.id);
      }
    } catch (err: any) {
      showFeedback(`Gagal memuat detail: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchGiroHeaders = async (q = ''): Promise<GiroHeaderRecord[]> => {
    const clean = q.trim();
    for (const tbl of ['giro_pembelian_headers', 'giro_pembelian', 'giro_pembelians']) {
      try {
        const opts: Record<string, any> = {
          orderBy: 'created_at',
          asc: false,
          limit: 100,
        };
        if (clean) {
          opts.orSearch = 'no_bukti,dibuat_oleh';
          opts.searchVal = clean;
        }
        const hdrs = await erpList<GiroHeaderRecord>(tbl, opts);
        if (hdrs && (hdrs.length > 0 || clean)) {
          return hdrs;
        }
      } catch {}
    }
    return [];
  };

  const loadInitialData = async () => {
    try {
      setIsBusy(true);
      await loadMasterData();
      let headers = await fetchGiroHeaders();

      if (!headers || headers.length === 0) {
        try {
          const samplePayload = {
            no_bukti: `GP/${new Date().getFullYear()}/001`,
            tanggal: todayIso(),
            total_amount: 15000000,
            dibuat_oleh: 'ADMIN',
          };
          const sampleDetail = [{
            no_urut: 1,
            id_supplier: 'SUP-001',
            supplier: 'PT. JAYA ABADI',
            ref_type: '',
            no_ref: '',
            no_faktur: '',
            no_cek_giro: 'CG-988101',
            bank: 'BCA',
            due: todayIso(),
            amount_paid: 15000000,
            sts_cair: 'Cair',
            keterangan: 'PEMBAYARAN SUPPLIER UTAMA',
            marked_delete: false,
          }];
          const seeded = await erpCompositeSave<{ header: GiroHeaderRecord; details: any[] }>(
            'giro-pembelian',
            samplePayload,
            sampleDetail
          );
          if (seeded && seeded.header) {
            headers = [seeded.header];
          }
        } catch {
          // fallback
        }
      }

      setSavedHeaders(headers);
      if (headers.length > 0) {
        await loadHeaderDetails(headers[0]);
      } else {
        const defaultNo = `GP/${new Date().getFullYear()}/001`;
        setHeaderId('');
        setNoBukti(defaultNo);
        setTanggal(toDisplayDmy(todayIso()));
        const blank = createEmptyRow(1);
        setRows([blank]);
        setSelectedId(blank.id);
      }
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const applyRefToGiroRow = (row: GiroDetailRow, encodedRef: string): GiroDetailRow => {
    if (!encodedRef) {
      return { ...row, refType: '', noRef: '', noFaktur: '' };
    }
    const sepIdx = encodedRef.indexOf('|');
    if (sepIdx === -1) return row;
    const refType = encodedRef.slice(0, sepIdx) as 'PEMBELIAN' | 'PO';
    const noRef = encodedRef.slice(sepIdx + 1).trim().toUpperCase();

    if (refType === 'PEMBELIAN') {
      const pem = pembelianRefs.find((p) => p.noBukti === noRef);
      if (!pem) return { ...row, refType, noRef };
      const supp = pem.namaSupplier || row.supplier;
      const suppCode = supplierCodeMap[supp] || row.idSupplier;
      return {
        ...row,
        refType: 'PEMBELIAN',
        noRef: pem.noBukti,
        noFaktur: pem.noFaktur || '-',
        supplier: supp,
        idSupplier: suppCode,
        amountPaid: pem.nilaiPembelian > 0 ? String(pem.nilaiPembelian) : row.amountPaid,
        keterangan:
          row.keterangan.trim() ||
          `PELUNASAN PEMBELIAN ${pem.noBukti}${pem.noFaktur && pem.noFaktur !== '-' ? ` (${pem.noFaktur})` : ''}`,
      };
    }

    if (refType === 'PO') {
      const po = poRefs.find((p) => p.noBukti === noRef);
      if (!po) return { ...row, refType, noRef };
      const supp = po.namaSupplier || row.supplier;
      const suppCode = supplierCodeMap[supp] || row.idSupplier;
      const sisaTagihan = Math.max(0, po.nilaiPo - po.deposit);
      const suggestedAmount = sisaTagihan > 0 ? sisaTagihan : po.nilaiPo;
      return {
        ...row,
        refType: 'PO',
        noRef: po.noBukti,
        noFaktur: '-',
        supplier: supp,
        idSupplier: suppCode,
        amountPaid: suggestedAmount > 0 ? String(suggestedAmount) : row.amountPaid,
        keterangan: row.keterangan.trim() || `DP / PEMBAYARAN PO ${po.noBukti}`,
      };
    }

    return row;
  };

  const handleCellChange = (id: string, field: keyof GiroDetailRow, value: string | boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleInlineRefChange = (id: string, encodedRef: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? applyRefToGiroRow(r, encodedRef) : r)));
  };

  const totalAmountPaid = rows.reduce(
    (sum, item) => sum + (item.markedDelete ? 0 : parseNum(item.amountPaid)),
    0
  );

  const totalCairAmount = rows.reduce(
    (sum, item) =>
      sum + (!item.markedDelete && item.stsCair === 'Cair' ? parseNum(item.amountPaid) : 0),
    0
  );

  const buildDetailPayload = (activeRows: GiroDetailRow[]) =>
    activeRows.map((r, idx) => ({
      no_urut: parseInt(r.no, 10) || idx + 1,
      id_supplier: r.idSupplier.trim().toUpperCase(),
      supplier: r.supplier.trim().toUpperCase(),
      ref_type: r.refType || '',
      no_ref: r.noRef.trim().toUpperCase(),
      no_faktur: r.noFaktur.trim().toUpperCase(),
      no_cek_giro: r.noCekGiro.trim().toUpperCase(),
      bank: r.bank.trim().toUpperCase(),
      due: toIsoDate(r.due),
      amount_paid: parseNum(r.amountPaid),
      sts_cair: r.stsCair || 'Cair',
      keterangan: r.keterangan.trim(),
      marked_delete: false,
    }));

  const handleSimpan = async () => {
    const cleanNoBukti = noBukti.trim().toUpperCase();
    if (!cleanNoBukti) {
      showFeedback('No.Bukti wajib diisi');
      return;
    }

    const activeRows = rows.filter(
      (r) =>
        !r.markedDelete &&
        (r.idSupplier.trim() ||
          r.supplier.trim() ||
          r.noCekGiro.trim() ||
          r.noRef.trim() ||
          parseNum(r.amountPaid) > 0)
    );

    const computedTotal = activeRows.reduce((s, r) => s + parseNum(r.amountPaid), 0);

    try {
      setIsBusy(true);
      const headerPayload: Record<string, any> = {
        no_bukti: cleanNoBukti,
        tanggal: toIsoDate(tanggal) || todayIso(),
        total_amount: computedTotal,
        dibuat_oleh: (getCurrentUser().username || 'ADMIN'),
      };
      if (headerId) headerPayload.id = headerId;

      const detailPayloads = buildDetailPayload(activeRows);

      const res = await erpCompositeSave<{
        header: GiroHeaderRecord;
        details: any[];
        detailWarning?: string;
      }>('giro-pembelian', headerPayload, detailPayloads);

      if (res.header) {
        setHeaderId(res.header.id);
        setNoBukti(res.header.no_bukti);
        setTanggal(toDisplayDmy(res.header.tanggal));
      }

      if (res.details && res.details.length > 0) {
        const mapped = res.details.map((d, idx) => mapDbToGiroRow(d, idx));
        setRows(mapped);
        setSelectedId(mapped[0].id);
      } else {
        const blank = createEmptyRow(1);
        setRows([blank]);
        setSelectedId(blank.id);
      }

      const [headers] = await Promise.all([
        erpList<GiroHeaderRecord>('giro_pembelian_headers', {
          orderBy: 'created_at',
          asc: false,
          limit: 100,
        }),
        loadMasterData(),
      ]);
      setSavedHeaders(headers);
      showFeedback(
        res.detailWarning
          ? `${res.detailWarning}`
          : 'Daftar Giro tersimpan & status Hutang Pembelian / Deposit PO disinkronkan'
      );
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleNewDocument = () => {
    setHeaderId('');
    setNoBukti(nextUniqueCode(savedHeaders.map((h) => h.no_bukti), `GP/${new Date().getFullYear()}/`, 3));
    setTanggal(toDisplayDmy(todayIso()));
    const blank = createEmptyRow(1);
    setRows([blank]);
    setSelectedId(blank.id);
    showFeedback('Form Dokumen Giro Baru siap diisi');
  };

  const handleAddNew = async () => {
    const filledCount = rows.filter(
      (r) => r.idSupplier.trim() || r.supplier.trim() || r.noCekGiro.trim() || r.noRef.trim()
    ).length;
    setModalError(null);
    setEditingId(null);
    setFormRow(createEmptyRow(filledCount + 1));
    setIsModalOpen(true);
    await loadMasterData();
  };

  const handleEdit = async () => {
    const current = rows.find((r) => r.id === selectedId) || rows[0];
    if (!current) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setModalError(null);
    setEditingId(current.id);
    setFormRow({ ...current });
    setIsModalOpen(true);
    await loadMasterData();
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formRow.supplier.trim() || !formRow.noCekGiro.trim()) {
      setModalError('Supplier dan No. Cek / Giro wajib diisi.');
      return;
    }
    if (editingId) {
      setRows((prev) =>
        prev.map((r) => (r.id === editingId ? { ...formRow, id: editingId } : r))
      );
      showFeedback('Baris giro diperbarui (Klik Simpan untuk sinkron Hutang/PO & Supabase)');
    } else {
      const isFirstBlank =
        rows.length === 1 &&
        !rows[0].idSupplier &&
        !rows[0].supplier &&
        !rows[0].noCekGiro &&
        !rows[0].noRef &&
        !rows[0].amountPaid;

      const newEntry: GiroDetailRow = {
        ...formRow,
        id: `${Date.now()}`,
        no: formRow.no.trim() || String(isFirstBlank ? 1 : rows.length + 1),
      };

      if (isFirstBlank) {
        setRows([newEntry]);
      } else {
        setRows((prev) => [...prev, newEntry]);
      }
      setSelectedId(newEntry.id);
      showFeedback('Baris ditambahkan (Klik Simpan untuk sinkron Hutang/PO & Supabase)');
    }
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleHapus = () => {
    const hasMarked = rows.some((r) => r.markedDelete);
    const activeTargetRows = hasMarked
      ? rows.filter((r) => r.markedDelete)
      : rows.filter((r) => r.id === selectedId);

    const isEmptyHeaderOnly =
      !hasMarked &&
      rows.length <= 1 &&
      Boolean(headerId) &&
      !rows[0]?.supplier &&
      !rows[0]?.noCekGiro;

    if (isEmptyHeaderOnly) {
      setConfirmDeleteSummary(`Yakin ingin menghapus dokumen giro [${noBukti}] dari Supabase?`);
      setConfirmDeleteOpen(true);
      return;
    }

    if (activeTargetRows.length === 0) {
      showFeedback('Pilih atau centang baris giro yang akan dihapus');
      return;
    }

    setConfirmDeleteSummary(
      hasMarked
        ? `Yakin ingin menghapus ${activeTargetRows.length} baris giro yang dicentang?`
        : `Yakin ingin menghapus baris giro [${activeTargetRows[0]?.noCekGiro || activeTargetRows[0]?.supplier || 'terpilih'}]?`
    );
    setConfirmDeleteOpen(true);
  };

  const handleConfirmHapus = async () => {
    const hasMarked = rows.some((r) => r.markedDelete);
    const remaining = hasMarked
      ? rows.filter((r) => !r.markedDelete)
      : rows.filter((r) => r.id !== selectedId);

    const nonBlankRemaining = remaining.filter(
      (r) =>
        !r.markedDelete &&
        (r.idSupplier.trim() ||
          r.supplier.trim() ||
          r.noCekGiro.trim() ||
          r.noRef.trim() ||
          parseNum(r.amountPaid) > 0)
    );

    if (nonBlankRemaining.length === 0 && headerId) {
      try {
        setIsBusy(true);
        await erpDelete('giro_pembelian_headers', headerId);
        setConfirmDeleteOpen(false);
        showFeedback('Dokumen Giro dihapus & status Hutang Pembelian/PO disinkronkan');
        await loadInitialData();
      } catch (err: any) {
        showFeedback(`Gagal hapus: ${err.message}`);
      } finally {
        setIsBusy(false);
      }
      return;
    }

    if (headerId) {
      try {
        setIsBusy(true);
        const computedTotal = nonBlankRemaining.reduce((s, r) => s + parseNum(r.amountPaid), 0);
        const res = await erpCompositeSave<{
          header: GiroHeaderRecord;
          details: any[];
          detailWarning?: string;
        }>(
          'giro-pembelian',
          {
            id: headerId,
            no_bukti: noBukti.trim().toUpperCase(),
            tanggal: toIsoDate(tanggal) || todayIso(),
            total_amount: computedTotal,
            dibuat_oleh: (getCurrentUser().username || 'ADMIN'),
          },
          buildDetailPayload(nonBlankRemaining)
        );
        const mapped = (res.details || []).map((d, idx) => mapDbToGiroRow(d, idx));
        const nextRows = mapped.length > 0 ? mapped : [createEmptyRow(1)];
        setRows(nextRows);
        setSelectedId(nextRows[0].id);
        setConfirmDeleteOpen(false);
        await loadMasterData();
        showFeedback(
          res.detailWarning
            ? `${res.detailWarning}`
            : 'Baris giro dihapus & status Hutang/PO disinkronkan ke Supabase'
        );
      } catch (err: any) {
        showFeedback(`Gagal hapus: ${err.message}`);
      } finally {
        setIsBusy(false);
      }
      return;
    }

    const nextLocal = remaining.length > 0 ? remaining : [createEmptyRow(1)];
    setRows(nextLocal);
    setSelectedId(nextLocal[0].id);
    setConfirmDeleteOpen(false);
    showFeedback('Baris giro dihapus');
  };

  const handleOpenFind = async () => {
    setIsFindOpen(true);
    try {
      let headers = await fetchGiroHeaders();
      setSavedHeaders(headers);
    } catch {
      // keep existing
    }
  };

  const SEARCH_DETAIL_COL_MAP: Record<string, string> = {
    Kode: 'no_cek_giro',
    Supplier: 'supplier',
    'No. Cek / Giro': 'no_cek_giro',
    'ID Supplier': 'id_supplier',
    'Ref. Transaksi': 'no_ref',
    'No. Faktur': 'no_faktur',
    Bank: 'bank',
    Status: 'sts_cair',
    Keterangan: 'keterangan',
  };

  const searchDetailsSupabase = async (fieldVal: string, termVal: string) => {
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
          queryOpts.orSearch = 'id_supplier,supplier,no_ref,no_faktur,no_cek_giro,bank,sts_cair,keterangan';
          queryOpts.searchVal = clean;
        }
      }
      const dets = await erpList<any>('giro_pembelian_details', queryOpts);
      if (dets.length > 0 || clean) {
        const mapped = dets.map((d, idx) => mapDbToGiroRow(d, idx));
        setRows(mapped);
        setSelectedId(mapped[0]?.id || '');
        showFeedback(
          clean
            ? `Ditemukan ${mapped.length} baris giro dari Supabase`
            : `Menampilkan ${mapped.length} baris giro`
        );
      } else {
        const blank = createEmptyRow(1);
        setRows([blank]);
        setSelectedId(blank.id);
      }
    } catch (err: any) {
      showFeedback(`Gagal cari giro: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: `Daftar_Giro_Pembayaran_Supplier_${noBukti || 'Baru'}`,
      sheetTitle: 'INPUT DAFTAR GIRO PEMBAYARAN SUPPLIER',
      subtitle: `No. Bukti: ${noBukti || '-'} | Tanggal: ${tanggal || '-'}`,
      companyProfile: company,
      columns: [
        { header: 'No.', accessor: 'no', align: 'center' },
        {
          header: 'Ref. Transaksi',
          accessor: (r) => (r.refType && r.noRef ? `${r.refType}: ${r.noRef}` : '-'),
        },
        { header: 'No. Faktur', accessor: 'noFaktur' },
        { header: 'ID Supplier', accessor: 'idSupplier' },
        { header: 'Supplier', accessor: 'supplier' },
        { header: 'No. Cek / Giro', accessor: 'noCekGiro' },
        { header: 'Bank', accessor: 'bank' },
        { header: 'Due', accessor: 'due', align: 'center' },
        { header: 'Amount Paid', accessor: (r) => parseNum(r.amountPaid), align: 'right' },
        { header: 'Status Cair', accessor: 'stsCair', align: 'center' },
        { header: 'Keterangan', accessor: 'keterangan' },
      ],
      rows: rows.filter(
        (r) => !r.markedDelete && (r.supplier || r.noCekGiro || r.noRef || r.amountPaid)
      ),
    });
    showFeedback('Export Excel selesai');
  };

  const printableRows = rows.filter(
    (r) =>
      !r.markedDelete &&
      (r.idSupplier || r.supplier || r.noCekGiro || r.noRef || r.amountPaid)
  );

  const displayedRows = rows.filter((r) => {
    if (searchField === 'Kode') return matchesMultiKeyword([r.noCekGiro, r.idSupplier, r.noRef], searchTerm);
    if (searchField === 'Supplier') return matchesMultiKeyword([r.supplier], searchTerm);
    if (searchField === 'No. Cek / Giro') return matchesMultiKeyword([r.noCekGiro], searchTerm);
    if (searchField === 'ID Supplier') return matchesMultiKeyword([r.idSupplier], searchTerm);
    if (searchField === 'Ref. Transaksi') return matchesMultiKeyword([r.refType, r.noRef], searchTerm);
    if (searchField === 'No. Faktur') return matchesMultiKeyword([r.noFaktur], searchTerm);
    if (searchField === 'Bank') return matchesMultiKeyword([r.bank], searchTerm);
    if (searchField === 'Status') return matchesMultiKeyword([r.stsCair], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([r.keterangan], searchTerm);
    return matchesMultiKeyword(
      [
        r.idSupplier,
        r.supplier,
        r.refType,
        r.noRef,
        r.noFaktur,
        r.noCekGiro,
        r.bank,
        r.due,
        r.stsCair,
        r.keterangan,
      ],
      searchTerm
    );
  });

  const selectedGiroRow =
    printableRows.find((r) => r.id === selectedId) ||
    displayedRows.find(
      (r) =>
        r.id === selectedId &&
        (r.idSupplier || r.supplier || r.noCekGiro || r.noRef || r.amountPaid)
    ) ||
    null;

  const getFilteredRefChoices = (supplierFilterName: string, curType: string, curRef: string) => {
    const cleanSupp = supplierFilterName.trim().toUpperCase();
    const pemChoices = pembelianRefs.filter(
      (p) =>
        (p.stsLunas !== 'Lunas' || (curType === 'PEMBELIAN' && p.noBukti === curRef)) &&
        (!cleanSupp || p.namaSupplier === cleanSupp || (curType === 'PEMBELIAN' && p.noBukti === curRef))
    );
    const poChoices = poRefs.filter(
      (p) =>
        (p.poClose !== 'Closed' || (curType === 'PO' && p.noBukti === curRef)) &&
        (!cleanSupp || p.namaSupplier === cleanSupp || (curType === 'PO' && p.noBukti === curRef))
    );
    return { pemChoices, poChoices };
  };

  const modalRefChoices = getFilteredRefChoices(
    formRow.supplier,
    formRow.refType,
    formRow.noRef
  );

  return (
    <div
      id="input-daftar-giro-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="Input Daftar Giro Pembayaran Supplier"
          onClose={onClose}
          onFind={handleOpenFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadInitialData}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 h-[40px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-3 space-x-2 overflow-x-auto">
          <FormActionButtons
            compact
            onSimpan={handleSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleHapus}
            onPrint={() => setIsPrintOpen(true)}
            onFind={handleOpenFind}
            isBusy={isBusy}
            feedback={feedback}
          />
          <div className="h-[20px] w-[1px] bg-[#ACA899] mx-1" />
          <button
            type="button"
            onClick={handleNewDocument}
            className="h-[26px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] cursor-pointer text-[11px] font-semibold text-black whitespace-nowrap"
          >
            No.Bukti Baru
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-auto bg-[#ECE9D8] p-2.5">
          <div className="shrink-0 max-w-[1260px] w-full bg-[#EFEFEF] border border-[#ACA899] shadow-[inset_1px_1px_0_#FFFFFF] px-4 py-2 mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <label
                htmlFor="giro-no-bukti"
                className="font-bold text-[11px] text-black whitespace-nowrap"
              >
                No.Bukti :
              </label>
              <input
                id="giro-no-bukti"
                type="text"
                value={noBukti}
                onChange={(e) => setNoBukti(e.target.value.toUpperCase())}
                className="w-[140px] h-[22px] bg-white border border-t-[#7F9DB9] border-l-[#7F9DB9] border-b-[#D4D0C8] border-r-[#D4D0C8] px-1.5 text-[11px] font-mono text-black outline-none focus:border-[#316AC5]"
              />
              <button
                type="button"
                onClick={handleOpenFind}
                className="h-[22px] px-2 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7F9DB9] text-[10px] font-bold cursor-pointer"
                title="Cari Dokumen Giro tersimpan"
              >
                Pilih...
              </button>
            </div>

            <ToolbarSearchControl
              compact
              searchField={searchField}
              onSearchFieldChange={setSearchField}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onCari={() => searchDetailsSupabase(searchField, searchTerm)}
              onReset={() => {
                setSearchField('Semua');
                setSearchTerm('');
                return searchDetailsSupabase('Semua', '');
              }}
              inputRef={searchInputRef}
              isBusy={isBusy}
              inputWidthClass="w-[155px]"
              options={[
                { value: 'Semua', label: 'Semua' },
                { value: 'Kode', label: 'Kode (No.Giro / Ref)' },
                { value: 'Ref. Transaksi', label: 'Ref. Transaksi' },
                { value: 'No. Faktur', label: 'No. Faktur' },
                { value: 'Supplier', label: 'Supplier' },
                { value: 'No. Cek / Giro', label: 'No. Cek / Giro' },
                { value: 'ID Supplier', label: 'ID Supplier' },
                { value: 'Bank', label: 'Bank' },
                { value: 'Status', label: 'Status Cair' },
                { value: 'Keterangan', label: 'Keterangan' },
              ]}
            />

            <div className="flex items-center space-x-2">
              <label
                htmlFor="giro-tanggal"
                className="font-bold text-[11px] text-black whitespace-nowrap"
              >
                Tanggal :
              </label>
              <DatePickerInput
                id="giro-tanggal"
                value={tanggal}
                onChange={(formatted) => setTanggal(formatted)}
                format="dmy"
              />
            </div>
          </div>

          <div className="flex-1 min-h-[260px] max-w-[1260px] w-full bg-[#EFEFEF] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto bg-[#EFEFEF]">
              <div className="min-w-[1190px] flex flex-col">
                <div className="h-[22px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-normal text-black tracking-wide">
                  GIRO / CEK / CASH DETAIL PEMBAYARAN HUTANG SUPPLIER & DP PURCHASE ORDER
                </div>

                <table className="w-full border-collapse text-left text-[11px] select-none bg-white">
                  <thead className="sticky top-0 z-10 bg-[#ECE9D8] text-black">
                    <tr className="h-[22px] border-b border-[#808080]">
                      <th className="w-[22px] min-w-[22px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                      <th className="w-[38px] min-w-[38px] border-r border-[#ACA899] px-1.5 font-normal text-center bg-[#ECE9D8]">No.</th>
                      <th className="w-[165px] min-w-[165px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Ref. Pembelian / PO</th>
                      <th className="w-[115px] min-w-[115px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">No. Faktur</th>
                      <th className="w-[76px] min-w-[76px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">ID Supplier</th>
                      <th className="w-[165px] min-w-[165px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Supplier</th>
                      <th className="w-[108px] min-w-[108px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">No. Cek / Giro</th>
                      <th className="w-[78px] min-w-[78px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Bank</th>
                      <th className="w-[88px] min-w-[88px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Due</th>
                      <th className="w-[105px] min-w-[105px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Amount Paid</th>
                      <th className="w-[85px] min-w-[85px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Status</th>
                      <th className="min-w-[140px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Keterangan</th>
                      <th className="w-[50px] min-w-[50px] border-r border-[#ACA899] px-1.5 font-normal text-center bg-[#ECE9D8]">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map((row) => {
                      const isSelected = selectedId === row.id;
                      const encodedVal =
                        row.refType && row.noRef ? `${row.refType}|${row.noRef}` : '';
                      const inlineChoices = getFilteredRefChoices(
                        '',
                        row.refType,
                        row.noRef
                      );
                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedId(row.id)}
                          className="h-[22px] border-b border-[#ACA899] bg-white"
                        >
                          <td className="w-[22px] border-r border-[#ACA899] bg-[#ECE9D8] text-center font-bold text-black text-[13px] leading-none p-0">
                            {isSelected ? '*' : ''}
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.no}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) => handleCellChange(row.id, 'no', e.target.value)}
                              className="w-full h-[21px] px-1 text-center font-mono text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <select
                              value={encodedVal}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) => handleInlineRefChange(row.id, e.target.value)}
                              className="w-full h-[21px] px-1 font-mono text-[10.5px] bg-[#FFFBEB] outline-none cursor-pointer"
                            >
                              <option value="">-- Non-Ref / Umum --</option>
                              <optgroup label="Pembelian Barang (Hutang)">
                                {inlineChoices.pemChoices.map((p) => (
                                  <option key={`PEM-${p.noBukti}`} value={`PEMBELIAN|${p.noBukti}`}>
                                    BELI: {p.noBukti} ({p.stsLunas})
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Purchase Order (DP / Pelunasan)">
                                {inlineChoices.poChoices.map((po) => (
                                  <option key={`PO-${po.noBukti}`} value={`PO|${po.noBukti}`}>
                                    PO: {po.noBukti} ({po.poClose})
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.noFaktur}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(row.id, 'noFaktur', e.target.value.toUpperCase())
                              }
                              className="w-full h-[21px] px-1.5 font-mono text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.idSupplier}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(row.id, 'idSupplier', e.target.value.toUpperCase())
                              }
                              className="w-full h-[21px] px-1.5 font-mono text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className={`border-r border-[#ACA899] p-0 ${isSelected ? 'bg-[#FFFF99]' : 'bg-white'}`}>
                            <input
                              type="text"
                              value={row.supplier}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(row.id, 'supplier', e.target.value.toUpperCase())
                              }
                              className={`w-full h-[21px] px-1.5 text-[11px] font-semibold outline-none ${
                                isSelected ? 'bg-[#FFFF99]' : 'bg-transparent focus:bg-[#FFFF99]'
                              }`}
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.noCekGiro}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(row.id, 'noCekGiro', e.target.value.toUpperCase())
                              }
                              className="w-full h-[21px] px-1.5 font-mono text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.bank}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(row.id, 'bank', e.target.value.toUpperCase())
                              }
                              className="w-full h-[21px] px-1.5 text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.due}
                              placeholder="dd-mm-yyyy"
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) => handleCellChange(row.id, 'due', e.target.value)}
                              className="w-full h-[21px] px-1.5 font-mono text-center text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.amountPaid}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) => handleCellChange(row.id, 'amountPaid', e.target.value)}
                              className="w-full h-[21px] px-1.5 font-mono text-right text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <select
                              value={row.stsCair}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(
                                  row.id,
                                  'stsCair',
                                  e.target.value as 'Cair' | 'Belum Cair'
                                )
                              }
                              className={`w-full h-[21px] px-1 text-[10.5px] font-semibold outline-none cursor-pointer ${
                                row.stsCair === 'Cair'
                                  ? 'bg-[#ECFDF5] text-[#065F46]'
                                  : 'bg-[#FEF3C7] text-[#92400E]'
                              }`}
                            >
                              <option value="Cair">Cair</option>
                              <option value="Belum Cair">Belum Cair</option>
                            </select>
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.keterangan}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) => handleCellChange(row.id, 'keterangan', e.target.value)}
                              className="w-full h-[21px] px-1.5 text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td
                            className="border-r border-[#ACA899] text-center p-0 bg-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={row.markedDelete}
                              onChange={(e) =>
                                handleCellChange(row.id, 'markedDelete', e.target.checked)
                              }
                              aria-label="Tandai Hapus"
                              className="cursor-pointer align-middle"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="shrink-0 max-w-[1260px] w-full flex flex-wrap items-center justify-end gap-4 pt-2 pr-6">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-[11px] text-[#065F46] whitespace-nowrap">
                Total Giro Cair (Sinkron Lunas/Deposit) :
              </span>
              <input
                type="text"
                readOnly
                value={formatRupiah(totalCairAmount)}
                className="w-[165px] h-[22px] bg-[#ECFDF5] border border-[#6EE7B7] px-2 text-right font-mono text-[11px] text-[#065F46] font-bold outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label
                htmlFor="giro-total-amount-paid"
                className="font-bold text-[11px] text-black whitespace-nowrap"
              >
                Total Amount Paid :
              </label>
              <input
                id="giro-total-amount-paid"
                type="text"
                readOnly
                value={formatRupiah(totalAmountPaid)}
                className="w-[180px] h-[22px] bg-white border border-t-[#7F9DB9] border-l-[#7F9DB9] border-b-[#D4D0C8] border-r-[#D4D0C8] px-2 text-right font-mono text-[11px] text-black font-bold outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add / Edit Giro Row */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl w-[560px] max-w-[95vw] flex flex-col font-sans text-xs">
            <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between">
              <span className="font-bold text-[12px]">
                {editingId ? 'Koreksi Detail Giro Pembayaran Supplier' : 'Tambah Detail Giro Pembayaran Supplier Baru'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsModalOpen(false);
                }}
                className="w-[20px] h-[20px] bg-[#C00000] hover:bg-red-700 text-white font-bold flex items-center justify-center text-[11px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form noValidate onSubmit={handleSaveModal} className="p-4 space-y-2.5 text-[11px]">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-black mb-1">No.</label>
                  <input
                    type="text"
                    value={formRow.no}
                    onChange={(e) => setFormRow({ ...formRow, no: e.target.value })}
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-black mb-1">ID Supplier</label>
                  <input
                    type="text"
                    value={formRow.idSupplier}
                    onChange={(e) =>
                      setFormRow({ ...formRow, idSupplier: e.target.value.toUpperCase() })
                    }
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Supplier</label>
                <select
                  required
                  value={formRow.supplier}
                  onChange={(e) => {
                    const selectedName = e.target.value.trim().toUpperCase();
                    const code = supplierCodeMap[selectedName] || formRow.idSupplier;
                    setFormRow({ ...formRow, supplier: selectedName, idSupplier: code });
                  }}
                  className="w-full h-[24px] px-2 bg-[#FFFF99] border border-[#7F9DB9] font-semibold uppercase cursor-pointer"
                >
                  <option value="">-- Pilih Supplier --</option>
                  {Array.from(
                    new Set(
                      [...supplierOptions, formRow.supplier.trim().toUpperCase()].filter(Boolean)
                    )
                  ).map((supName) => (
                    <option key={supName} value={supName}>
                      {supName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-[#000084] mb-1">
                    Ref. Pembelian / Purchase Order (Auto-Load)
                  </label>
                  <select
                    value={formRow.refType && formRow.noRef ? `${formRow.refType}|${formRow.noRef}` : ''}
                    onChange={(e) =>
                      setFormRow((prev) => applyRefToGiroRow(prev, e.target.value))
                    }
                    className="w-full h-[24px] px-2 bg-[#FFFBEB] border border-[#7F9DB9] font-mono cursor-pointer"
                  >
                    <option value="">-- Non-Referensi / Umum --</option>
                    <optgroup label="Pembelian Barang (Hutang Supplier)">
                      {modalRefChoices.pemChoices.map((p) => (
                        <option key={`M-PEM-${p.noBukti}`} value={`PEMBELIAN|${p.noBukti}`}>
                          {p.noBukti} | {p.namaSupplier} | {formatMoney(p.nilaiPembelian)} ({p.stsLunas})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Purchase Order (Uang Muka / Pelunasan)">
                      {modalRefChoices.poChoices.map((po) => (
                        <option key={`M-PO-${po.noBukti}`} value={`PO|${po.noBukti}`}>
                          {po.noBukti} | {po.namaSupplier} | {formatMoney(po.nilaiPo)} (DP: {formatMoney(po.deposit)})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-black mb-1">No. Faktur Supplier</label>
                  <input
                    type="text"
                    value={formRow.noFaktur}
                    onChange={(e) =>
                      setFormRow({ ...formRow, noFaktur: e.target.value.toUpperCase() })
                    }
                    placeholder="Otomatis dari Pembelian"
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-black mb-1">No. Cek / Giro</label>
                  <input
                    type="text"
                    required
                    value={formRow.noCekGiro}
                    onChange={(e) =>
                      setFormRow({ ...formRow, noCekGiro: e.target.value.toUpperCase() })
                    }
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black mb-1">Bank</label>
                  <select
                    value={formRow.bank}
                    onChange={(e) => setFormRow({ ...formRow, bank: e.target.value.toUpperCase() })}
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Bank --</option>
                    {Array.from(
                      new Set(
                        [...bankOptions, formRow.bank.trim().toUpperCase()].filter(Boolean)
                      )
                    ).map((bankName) => (
                      <option key={bankName} value={bankName}>
                        {bankName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-black mb-1">Due</label>
                  <DatePickerInput
                    value={formRow.due}
                    onChange={(formatted) => setFormRow({ ...formRow, due: formatted })}
                    format="dmy"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black mb-1">Amount Paid</label>
                  <input
                    type="number"
                    value={formRow.amountPaid}
                    onChange={(e) => setFormRow({ ...formRow, amountPaid: e.target.value })}
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#065F46] mb-1">Status Pencairan</label>
                  <select
                    value={formRow.stsCair}
                    onChange={(e) =>
                      setFormRow({
                        ...formRow,
                        stsCair: e.target.value as 'Cair' | 'Belum Cair',
                      })
                    }
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] font-semibold cursor-pointer"
                  >
                    <option value="Cair">Cair (Update Lunas / Deposit)</option>
                    <option value="Belum Cair">Belum Cair (Gantung)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Keterangan</label>
                <input
                  type="text"
                  value={formRow.keterangan}
                  onChange={(e) => setFormRow({ ...formRow, keterangan: e.target.value })}
                  className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9]"
                />
              </div>

              {modalError && (
                <div className="p-2 bg-[#FDE8E8] border border-[#C00000] text-[#900000] text-[11px] font-semibold">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ACA899]">
                <button
                  type="submit"
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] font-bold cursor-pointer"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsModalOpen(false);
                  }}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal FIND Voucher Giro Pembelian */}
      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Daftar Giro Pembayaran Supplier"
        rows={savedHeaders}
        selectedId={headerId}
        getRowId={(h) => h.id}
        getSearchValues={(h) => [h.no_bukti, toDisplayDmy(h.tanggal), h.dibuat_oleh, h.total_amount]}
        isBusy={isBusy}
        onSearchSupabase={async (q) => {
          const headers = await fetchGiroHeaders(q);
          setSavedHeaders(headers);
          return headers;
        }}
        onRefreshSupabase={async () => {
          const headers = await fetchGiroHeaders('');
          setSavedHeaders(headers);
          return headers;
        }}
        onSelectRow={async (hdr) => {
          await loadHeaderDetails(hdr);
          showFeedback(`Dokumen Giro [${hdr.no_bukti}] dipilih`);
        }}
        columns={[
          { header: 'Kode / No.Bukti', accessor: (h) => h.no_bukti, widthClass: 'w-40', mono: true, bold: true },
          { header: 'Tanggal', accessor: (h) => toDisplayDmy(h.tanggal), widthClass: 'w-32', align: 'center' },
          { header: 'Total Amount', accessor: (h) => formatMoney(h.total_amount), widthClass: 'w-36', align: 'right', mono: true },
        ]}
      />

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-xl w-[360px] overflow-hidden">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 font-bold text-xs">
              Konfirmasi Hapus Daftar Giro
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>{confirmDeleteSummary}</p>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleConfirmHapus}
                  className="px-3 py-1 bg-[#C00000] text-white border border-black text-xs font-bold cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="BUKTI DAFTAR GIRO PEMBAYARAN SUPPLIER"
        subtitle={`No. Bukti: ${noBukti || '-'}`}
        metaLines={[
          { label: 'No. Bukti', value: noBukti || '-' },
          { label: 'Tanggal', value: tanggal || '-' },
          { label: 'Total Giro Cair', value: formatRupiah(totalCairAmount) },
        ]}
        orientation="landscape"
        columns={[
          {
            header: 'Ref. Transaksi',
            accessor: (r) => (r.refType && r.noRef ? `${r.refType}: ${r.noRef}` : '-'),
            width: '120px',
          },
          { header: 'No. Faktur', accessor: 'noFaktur', width: '90px' },
          { header: 'ID Supplier', accessor: 'idSupplier', width: '68px' },
          { header: 'Supplier', accessor: 'supplier' },
          { header: 'No. Cek / Giro', accessor: 'noCekGiro', width: '95px' },
          { header: 'Bank', accessor: 'bank', width: '65px' },
          { header: 'Due', accessor: 'due', align: 'center', width: '78px' },
          {
            header: 'Amount Paid',
            accessor: (r) => formatMoney(r.amountPaid),
            align: 'right',
            width: '95px',
          },
          { header: 'Status', accessor: 'stsCair', align: 'center', width: '68px' },
          { header: 'Keterangan', accessor: 'keterangan' },
        ]}
        rows={printableRows}
        summaryItems={[
          {
            label: 'Total Giro Cair',
            value: formatRupiah(totalCairAmount),
          },
          {
            label: 'Total Amount Paid',
            value: formatRupiah(totalAmountPaid),
          },
        ]}
        selectedRow={selectedGiroRow}
        selectedTitle="BUKTI GIRO PEMBAYARAN SUPPLIER (RECORD TERPILIH)"
        selectedSubtitle={
          selectedGiroRow
            ? `No. Bukti: ${noBukti || '-'} | No. Giro: ${selectedGiroRow.noCekGiro || '-'}`
            : undefined
        }
        selectedMetaLines={
          selectedGiroRow
            ? [
                { label: 'No. Bukti', value: noBukti || '-' },
                { label: 'Tanggal', value: tanggal || '-' },
                { label: 'Supplier', value: `${selectedGiroRow.idSupplier} - ${selectedGiroRow.supplier}` },
                {
                  label: 'Ref. Transaksi',
                  value:
                    selectedGiroRow.refType && selectedGiroRow.noRef
                      ? `${selectedGiroRow.refType}: ${selectedGiroRow.noRef}`
                      : '-',
                },
                { label: 'No. Faktur', value: selectedGiroRow.noFaktur || '-' },
                { label: 'No. Cek / Giro', value: selectedGiroRow.noCekGiro || '-' },
                { label: 'Bank / Due', value: `${selectedGiroRow.bank || '-'} / ${selectedGiroRow.due || '-'}` },
                { label: 'Status Cair', value: selectedGiroRow.stsCair },
              ]
            : undefined
        }
        selectedSummaryItems={
          selectedGiroRow
            ? [
                {
                  label: 'Amount Paid Terpilih',
                  value: formatRupiah(parseNum(selectedGiroRow.amountPaid)),
                },
              ]
            : undefined
        }
      />
    </div>
  );
};
