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

export interface PenerimaanGiroItem {
  id: string;
  no: number;
  idCustomer: string;
  customer: string;
  noCekGiro: string;
  bank: string;
  due: string;
  amountPaid: number;
  keterangan: string;
}

interface GiroPenjualanHeader {
  id: string;
  no_bukti: string;
  tanggal: string;
  dibuat_oleh: string;
}

interface PendaftaranPenerimaanGiroFormProps {
  isOpen: boolean;
  onClose: () => void;
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
  const [giroOptions, setGiroOptions] = useState<any[]>([]);

  const loadMasterCustomers = async () => {
    try {
      const rows = await erpList<any>('master_customers', {
        orderBy: 'nama_customer',
        asc: true,
        limit: 1000,
      });
      setCustomerOptions(rows);
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
        new Set(rows.map((r) => String(r.nama_bank || '').trim().toUpperCase()).filter(Boolean))
      );
      setBankOptions(uniqueBanks);
    } catch {
      setBankOptions([]);
    }
  };

  const loadGiroTable = async () => {
    try {
      const rows = await erpList<any>('giro_pembelian_details', {
        limit: 1000,
      });
      setGiroOptions(rows);
    } catch {
      setGiroOptions([]);
    }
  };

  const loadMasterData = async () => {
    await Promise.all([loadMasterCustomers(), loadMasterBanks(), loadGiroTable()]);
  };

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoUrut, setNewNoUrut] = useState<string>('1');
  const [newIdCustomer, setNewIdCustomer] = useState<string>('CUS01');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newNoCekGiro, setNewNoCekGiro] = useState<string>('');
  const [newBank, setNewBank] = useState<string>('');
  const [newDue, setNewDue] = useState<string>(() => toDisplayDmy(todayIso()));
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
    setTimeout(() => setFeedback(null), 2500);
  };

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

      const mapped: PenerimaanGiroItem[] = dets.map((d, i) => ({
        id: d.id,
        no: Number(d.no_urut ?? i + 1),
        idCustomer: d.id_customer || '',
        customer: d.customer || '',
        noCekGiro: d.no_cek_giro || '',
        bank: d.bank || '',
        due: toDisplayDmy(d.due),
        amountPaid: Number(d.amount_paid || 0),
        keterangan: d.keterangan || '',
      }));
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
      let [headers] = await Promise.all([
        erpList<GiroPenjualanHeader>('giro_penjualan_headers', {
          orderBy: 'created_at',
          asc: false,
          limit: 100,
        }),
        loadMasterData(),
      ]);

      if (!headers || headers.length === 0) {
        try {
          const samplePayload = {
            no_bukti: 'GIRO00001',
            tanggal: todayIso(),
            dibuat_oleh: 'ADMIN',
          };
          const sampleDetail = [{
            no_urut: 1,
            id_customer: 'CUS-01',
            customer: 'PT. MAKMUR SEJAHTERA',
            no_cek_giro: 'CG-889900',
            bank: 'BCA',
            due: todayIso(),
            amount_paid: 25000000,
            keterangan: 'PENERIMAAN GIRO PENJUALAN',
          }];
          const seeded = await erpCompositeSave<{ header: GiroPenjualanHeader; details: any[] }>(
            'giro-penjualan',
            samplePayload,
            sampleDetail
          );
          if (seeded && seeded.header) {
            headers = [seeded.header];
          }
        } catch {}
      }

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
        dibuat_oleh: (getCurrentUser().username || 'ADMIN'),
      };
      if (headerId) headerPayload.id = headerId;

      const detailPayloads = listToSave.map((item, idx) => ({
        no_urut: parseInt(String(item.no || ''), 10) || idx + 1,
        id_customer: item.idCustomer.trim().toUpperCase(),
        customer: item.customer.trim().toUpperCase(),
        no_cek_giro: item.noCekGiro.trim().toUpperCase(),
        bank: item.bank.trim().toUpperCase(),
        due: toIsoDate(item.due),
        amount_paid: parseNum(item.amountPaid),
        keterangan: item.keterangan.trim(),
      }));

      const res = await erpCompositeSave<{ header: GiroPenjualanHeader; details: any[] }>(
        'giro-penjualan',
        headerPayload,
        detailPayloads
      );

      if (res.header) {
        setHeaderId(res.header.id);
        setNoBukti(res.header.no_bukti);
        setTanggal(toDisplayDmy(res.header.tanggal));
      }

      const mapped: PenerimaanGiroItem[] = (res.details || []).map((d, i) => ({
        id: d.id,
        no: Number(d.no_urut ?? i + 1),
        idCustomer: d.id_customer || '',
        customer: d.customer || '',
        noCekGiro: d.no_cek_giro || '',
        bank: d.bank || '',
        due: toDisplayDmy(d.due),
        amountPaid: Number(d.amount_paid || 0),
        keterangan: d.keterangan || '',
      }));
      setGiroList(mapped);
      if (mapped.length > 0) setSelectedId(mapped[0].id);

      const headers = await erpList<GiroPenjualanHeader>('giro_penjualan_headers', {
        orderBy: 'created_at',
        asc: false,
        limit: 100,
      });
      setSavedHeaders(headers);
      showFeedback('Penerimaan Giro tersimpan ke Supabase');
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
    setNewNoCekGiro('');
    setNewBank('');
    setNewDue(toDisplayDmy(todayIso()));
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
    setNewNoCekGiro(item.noCekGiro);
    setNewBank(item.bank);
    setNewDue(item.due || toDisplayDmy(todayIso()));
    setNewAmountPaid(String(item.amountPaid));
    setNewKeterangan(item.keterangan);
    setIsAddOpen(true);
    await loadMasterData();
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (
      !newIdCustomer.trim() ||
      !newCustomer.trim() ||
      !newNoCekGiro.trim() ||
      !newBank.trim()
    ) {
      setModalError('ID Customer, Customer, No. Cek / Giro, dan Bank wajib diisi.');
      return;
    }

    let nextList: PenerimaanGiroItem[];
    if (editingId) {
      nextList = giroList.map((g) =>
        g.id === editingId
          ? {
              ...g,
              no: parseInt(newNoUrut, 10) || g.no,
              idCustomer: newIdCustomer.trim().toUpperCase(),
              customer: newCustomer.trim().toUpperCase(),
              noCekGiro: newNoCekGiro.trim().toUpperCase(),
              bank: newBank.trim().toUpperCase(),
              due: newDue || g.due,
              amountPaid: parseNum(newAmountPaid),
              keterangan: newKeterangan.trim(),
            }
          : g
      );
    } else {
      const newItem: PenerimaanGiroItem = {
        id: Date.now().toString(),
        no: parseInt(newNoUrut, 10) || giroList.length + 1,
        idCustomer: newIdCustomer.trim().toUpperCase(),
        customer: newCustomer.trim().toUpperCase(),
        noCekGiro: newNoCekGiro.trim().toUpperCase(),
        bank: newBank.trim().toUpperCase(),
        due: newDue || toDisplayDmy(todayIso()),
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
      label: `${target.noCekGiro || target.customer}`,
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
    if (searchField === 'Bank') return matchesMultiKeyword([item.bank], searchTerm);
    if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
    return matchesMultiKeyword(
      [item.idCustomer, item.customer, item.noCekGiro, item.bank, item.due, item.keterangan],
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
    Bank: 'bank',
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
      const mapped: PenerimaanGiroItem[] = dets.map((d, i) => ({
        id: d.id,
        no: Number(d.no_urut ?? i + 1),
        idCustomer: d.id_customer || '',
        customer: d.customer || '',
        noCekGiro: d.no_cek_giro || '',
        bank: d.bank || '',
        due: toDisplayDmy(d.due),
        amountPaid: Number(d.amount_paid || 0),
        keterangan: d.keterangan || '',
      }));
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
        { header: 'No. Cek / Giro', accessor: 'noCekGiro' },
        { header: 'Bank', accessor: 'bank' },
        { header: 'Due', accessor: 'due', align: 'center' },
        { header: 'Amount Paid', accessor: 'amountPaid', align: 'right' },
        { header: 'Keterangan', accessor: 'keterangan' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

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
              { value: 'No. Cek / Giro', label: 'No. Cek / Giro' },
              { value: 'Bank', label: 'Bank' },
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
          <div className="bg-white border border-[#7F9DB9] shadow-sm min-w-[980px] flex flex-col h-full">
            <div className="bg-[#EBEBE4] px-3 py-1 border-b border-[#7F9DB9] font-bold text-center text-gray-800 text-[11px]">
              GIRO / CEK / CASH DETAIL
            </div>

            <div className="overflow-auto flex-1 max-h-[calc(100vh-210px)]">
              <table className="w-full border-collapse text-left select-none text-[11px]">
                <thead>
                  <tr className="bg-gradient-to-b from-[#F2F2F2] to-[#DFDFDF] border-b border-[#7F9DB9] text-black font-semibold sticky top-0 z-10">
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[45px] text-center">No.</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[95px]">ID Customer</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] min-w-[210px]">Customer</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[130px]">No. Cek / Giro</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[150px]">Bank</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[95px] text-center">Due</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[130px] text-right">Amount Paid</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] min-w-[220px]">Keterangan</th>
                    <th className="py-1.5 px-2 w-[70px] text-center">Delete</th>
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
                        <td className="py-1 px-2 border-r border-gray-200 font-mono">{item.noCekGiro}</td>
                        <td className="py-1 px-2 border-r border-gray-200">{item.bank}</td>
                        <td className="py-1 px-2 border-r border-gray-200 text-center font-mono">{item.due}</td>
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
                      <td colSpan={9} className="py-6 text-center text-gray-500 italic">
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
            <div className="bg-[#ECE9D8] border-2 border-[#000000] shadow-2xl w-[520px] max-w-[95vw] max-h-[90vh] flex flex-col rounded-[2px] font-sans overflow-hidden">
              <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between shrink-0">
                <span className="font-bold text-sm">
                  {editingId ? 'Koreksi Pendaftaran Penerimaan Giro' : 'Tambah Pendaftaran Penerimaan Giro Baru'}
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
                    <label className="block text-gray-800 font-semibold mb-1">No. Cek / Giro</label>
                    <select
                      value={newNoCekGiro}
                      onChange={(e) => {
                        const selGiroNo = e.target.value;
                        const foundGiro = giroOptions.find(
                          (g) => String(g.no_cek_giro || '').trim().toUpperCase() === selGiroNo
                        );
                        setNewNoCekGiro(selGiroNo);
                        if (foundGiro) {
                          if (foundGiro.bank) setNewBank(foundGiro.bank);
                          if (foundGiro.amount_paid) setNewAmountPaid(String(foundGiro.amount_paid));
                          if (foundGiro.supplier) setNewKeterangan(`Giro dari ${foundGiro.supplier}`);
                        }
                      }}
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih No. Giro --</option>
                      {Array.from(
                        new Set(
                          [
                            ...giroOptions.map((g) => String(g.no_cek_giro || '').trim().toUpperCase()),
                            newNoCekGiro.trim().toUpperCase(),
                          ].filter(Boolean)
                        )
                      ).map((giroNo) => (
                        <option key={giroNo} value={giroNo}>
                          {giroNo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-800 font-semibold mb-1">Customer & ID</label>
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
                    <option value="">-- Pilih Customer --</option>
                    {Array.from(
                      new Set(
                        [
                          ...customerOptions.map((c) => String(c.nama_customer || '').trim().toUpperCase()),
                          newCustomer.trim().toUpperCase(),
                        ].filter(Boolean)
                      )
                    ).map((custName) => (
                      <option key={custName} value={custName}>
                        {custName}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-[11px] text-gray-600 font-mono">
                    ID Customer: <span className="font-bold">{newIdCustomer || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Bank</label>
                    <select
                      value={newBank}
                      onChange={(e) => setNewBank(e.target.value)}
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih Bank --</option>
                      {Array.from(
                        new Set(
                          [
                            ...bankOptions,
                            newBank.trim().toUpperCase(),
                          ].filter(Boolean)
                        )
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

                <div>
                  <label className="block text-gray-800 font-semibold mb-1">Amount Paid (Jumlah)</label>
                  <input
                    type="number"
                    value={newAmountPaid}
                    onChange={(e) => setNewAmountPaid(e.target.value)}
                    required
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono text-right"
                  />
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

        {confirmDeleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-xl w-[360px] overflow-hidden">
              <div className="bg-[#0A246A] text-white px-3 py-1.5 font-bold text-xs">
                Konfirmasi Hapus Penerimaan Giro
              </div>
              <div className="p-4 text-xs text-black space-y-3">
                <p>
                  Yakin ingin menghapus {confirmDeleteTarget.label} dari database Supabase?
                </p>
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteTarget(null)}
                    className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleConfirmDelete}
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
          title="BUKTI PENDAFTARAN PENERIMAAN GIRO"
          subtitle={`No. Bukti: ${noBukti}`}
          metaLines={[
            { label: 'No. Bukti', value: noBukti },
            { label: 'Tanggal', value: tanggal },
          ]}
          orientation="landscape"
          columns={[
            { header: 'ID Customer', accessor: 'idCustomer', width: '80px' },
            { header: 'Customer', accessor: 'customer' },
            { header: 'No. Cek / Giro', accessor: 'noCekGiro', width: '110px' },
            { header: 'Bank', accessor: 'bank', width: '110px' },
            { header: 'Due', accessor: 'due', align: 'center', width: '85px' },
            {
              header: 'Amount Paid',
              accessor: (r) => formatMoney(r.amountPaid),
              align: 'right',
              width: '105px',
            },
            { header: 'Keterangan', accessor: 'keterangan' },
          ]}
          rows={filteredList}
          summaryItems={[
            { label: 'Total Amount Paid', value: formatRupiah(totalAmountPaid) },
          ]}
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
                  { label: 'No. Cek / Giro', value: selectedGiro.noCekGiro },
                  { label: 'Bank / Due', value: `${selectedGiro.bank} / ${selectedGiro.due}` },
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
