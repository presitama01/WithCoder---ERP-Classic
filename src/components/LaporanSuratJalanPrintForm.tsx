import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';
import {
  erpCreate,
  erpDelete,
  erpList,
  erpUpdate,
  fetchActiveCompanyProfile,
  nextUniqueCode,
  syncAppSettings,
  todayIso,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { getCurrentUser } from '../lib/authService';

interface LaporanSuratJalanPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaporanSuratJalanPrintForm: React.FC<LaporanSuratJalanPrintFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [tglStart, setTglStart] = useState<string>('12-09-2026');
  const [tglEnd, setTglEnd] = useState<string>('12-09-2026');
  const [filterType, setFilterType] = useState<string>('all_periode');
  const [salesCode, setSalesCode] = useState<string>('');
  const [salesDesc, setSalesDesc] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Laporan Detail Surat Jalan');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [salesCatalog, setSalesCatalog] = useState<{ kode: string; nama: string }[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [customerCatalog, setCustomerCatalog] = useState<string[]>([]);
  const [soOptions, setSoOptions] = useState<string[]>([]);
  const [poOptions, setPoOptions] = useState<string[]>([]);

  // Live Supabase table + Search state
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add / Koreksi Modal
  const [isCrudOpen, setIsCrudOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNoBukti, setFormNoBukti] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(() => toDisplayDMyShort(todayIso()));
  const [formCustomer, setFormCustomer] = useState<string>('');
  const [formNoSo, setFormNoSo] = useState<string>('');
  const [formPoNo, setFormPoNo] = useState<string>('');
  const [formSales, setFormSales] = useState<string>('');
  const [formNoFaktur, setFormNoFaktur] = useState<string>('');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formLokasiStock, setFormLokasiStock] = useState<string>('01 - OFFICE');
  const [formStsPrint, setFormStsPrint] = useState<string>('Not Yet');
  const [formTglPrint, setFormTglPrint] = useState<string>('');
  const [formStsPost, setFormStsPost] = useState<string>('Posting');
  const [formTglPost, setFormTglPost] = useState<string>('');
  const [formDibuatOleh, setFormDibuatOleh] = useState<string>('');
  const [formTglCreated, setFormTglCreated] = useState<string>('');
  const [formDiupdateOleh, setFormDiupdateOleh] = useState<string>('');
  const [formTglUpdate, setFormTglUpdate] = useState<string>('');

  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<any | null>(null);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printScopeOnOpen, setPrintScopeOnOpen] = useState<'selected' | 'all'>('all');
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadLiveRows = async (opts?: {
    field?: string;
    term?: string;
    skipSearch?: boolean;
  }): Promise<any[]> => {
    const activeField = opts?.field ?? searchField;
    const activeTerm = opts?.skipSearch ? '' : (opts?.term ?? searchTerm).trim();
    const SEARCH_COL_MAP: Record<string, string> = {
      Kode: 'no_bukti',
      'No.Bukti': 'no_bukti',
      Customer: 'nama_customer',
      'No.SO': 'no_so',
      'PO.No': 'po_no',
      Sales: 'sales',
      'No.Faktur': 'no_faktur',
    };
    const queryOpts: Record<string, any> = { orderBy: 'tanggal', asc: false };
    if (activeTerm) {
      if (activeField !== 'Semua' && SEARCH_COL_MAP[activeField]) {
        queryOpts.searchCol = SEARCH_COL_MAP[activeField];
        queryOpts.searchVal = activeTerm;
      } else {
        queryOpts.orSearch = 'no_bukti,nama_customer,no_so,po_no,sales,no_faktur,lokasi_stock,keterangan';
        queryOpts.searchVal = activeTerm;
      }
    }

    const rows = await erpList<any>('surat_jalans', queryOpts);
    const mapped = rows.map((r) => ({
      ...r,
      id: String(r.id),
      no_bukti: r.no_bukti || '',
      tanggal_iso: toIsoDate(r.tanggal) || '',
      tanggal_display: toDisplayDMyShort(r.tanggal),
      nama_customer: r.nama_customer || '',
      no_so: r.no_so || '',
      po_no: r.po_no || '',
      sales: r.sales || '',
      no_faktur: r.no_faktur || '',
      lokasi_stock: r.lokasi_stock || '01 - OFFICE',
      sts_print: r.sts_print || 'Not Yet',
      tgl_print_display: toDisplayDMyShort(r.tgl_print),
      sts_post: r.sts_post || 'Posting',
      tgl_post_display: toDisplayDMyShort(r.tgl_post),
      keterangan: r.keterangan || '',
    }));
    setTableRows(mapped);
    if (mapped.length > 0 && !mapped.some((m) => m.id === selectedId)) {
      setSelectedId(mapped[0].id);
    } else if (mapped.length === 0) {
      setSelectedId('');
    }
    return mapped;
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      try {
        setIsBusy(true);
        const [sales, lokasis, customers, soRes, poRes] = await Promise.all([
          erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true }).catch(() => []),
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
          erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false }).catch(() => []),
          erpList<any>('purchase_orders', { orderBy: 'tanggal', asc: false }).catch(() => []),
        ]);
        if (!active) return;
        setSalesCatalog(sales.map((s) => ({ kode: s.kode_sales || '', nama: s.nama_sales || '' })));
        setLokasiOptions(lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()));
        setCustomerCatalog(customers.map((c) => c.nama_customer || '').filter(Boolean));
        setSoOptions(soRes.map((so: any) => so.no_bukti || '').filter(Boolean));
        setPoOptions(poRes.map((po: any) => po.no_bukti || '').filter(Boolean));

        const rawPreset = localStorage.getItem('withcoder_preset_surat_jalan');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.tglStart) setTglStart(v.tglStart);
          if (v.tglEnd) setTglEnd(v.tglEnd);
          if (v.lokasiStock) setLokasiStock(v.lokasiStock);
          if (v.bentukLaporan) setBentukLaporan(v.bentukLaporan);
        }
        await loadLiveRows();
      } catch {
        // ignore
      } finally {
        if (active) setIsBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const match = salesCatalog.find(
      (s) => s.kode.toLowerCase() === salesCode.trim().toLowerCase() || s.nama.toLowerCase() === salesCode.trim().toLowerCase()
    );
    setSalesDesc(match ? match.nama : '');
  }, [salesCode, salesCatalog]);

  if (!isOpen) return null;

  const filteredTableRows = tableRows.filter((r) => {
    if (filterType === 'sales' && salesCode.trim()) {
      if (!r.sales.toLowerCase().includes(salesCode.trim().toLowerCase())) return false;
    }
    if (filterType === 'customer' && customerFilter.trim()) {
      if (!r.nama_customer.toLowerCase().includes(customerFilter.trim().toLowerCase())) return false;
    }
    if (searchTerm.trim()) {
      if (searchField === 'Kode' || searchField === 'No.Bukti') {
        return matchesMultiKeyword([r.no_bukti], searchTerm);
      }
      if (searchField === 'Customer') return matchesMultiKeyword([r.nama_customer], searchTerm);
      if (searchField === 'No.SO') return matchesMultiKeyword([r.no_so], searchTerm);
      if (searchField === 'PO.No') return matchesMultiKeyword([r.po_no], searchTerm);
      if (searchField === 'Sales') return matchesMultiKeyword([r.sales], searchTerm);
      if (searchField === 'No.Faktur') return matchesMultiKeyword([r.no_faktur], searchTerm);
      return matchesMultiKeyword(
        [r.no_bukti, r.tanggal_display, r.nama_customer, r.no_so, r.po_no, r.sales, r.no_faktur, r.lokasi_stock, r.keterangan, r.sts_post],
        searchTerm
      );
    }
    return true;
  });

  const selectedTableRow =
    filteredTableRows.find((r) => r.id === selectedId) ||
    tableRows.find((r) => r.id === selectedId) ||
    null;

  const selectedSjPrintRow = selectedTableRow
    ? { ...selectedTableRow, tanggal: selectedTableRow.tanggal_display || toDisplayDMyShort(selectedTableRow.tanggal) }
    : null;

  const handleBaru = () => {
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setFormNoBukti(nextUniqueCode(tableRows.map((r) => r.no_bukti), '2608-DO-INV-', 3));
    setFormTanggal(todayDisp);
    setFormCustomer(customerFilter || '');
    setFormNoSo('');
    setFormPoNo('');
    setFormSales(salesCode || '');
    setFormNoFaktur('');
    setFormKeterangan('');
    setFormLokasiStock(lokasiOptions[0] || '01 - OFFICE');
    setFormStsPrint('Not Yet');
    setFormTglPrint('');
    setFormStsPost('Posting');
    setFormTglPost(todayDisp);
    setFormDibuatOleh(currentUser);
    setFormTglCreated(todayDisp);
    setFormDiupdateOleh('-');
    setFormTglUpdate('');
    setIsCrudOpen(true);
  };

  const handleKoreksi = () => {
    const current =
      filteredTableRows.find((r) => r.id === selectedId) ||
      tableRows.find((r) => r.id === selectedId) ||
      filteredTableRows[0];
    if (!current) {
      showFeedback('Pilih baris Surat Jalan terlebih dahulu (atau klik Baru)');
      return;
    }
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setSelectedId(current.id);
    setEditingId(current.id);
    setModalError(null);
    setFormNoBukti(current.no_bukti);
    setFormTanggal(current.tanggal_display || todayDisp);
    setFormCustomer(current.nama_customer);
    setFormNoSo(current.no_so);
    setFormPoNo(current.po_no);
    setFormSales(current.sales || '');
    setFormNoFaktur(current.no_faktur);
    setFormKeterangan(current.keterangan);
    setFormLokasiStock(current.lokasi_stock || lokasiOptions[0] || '01 - OFFICE');
    setFormStsPrint(current.sts_print || 'Not Yet');
    setFormTglPrint(current.tgl_print_display || '');
    setFormStsPost(current.sts_post || 'Posting');
    setFormTglPost(current.tgl_post_display || '');
    setFormDibuatOleh(current.dibuat_oleh || currentUser);
    setFormTglCreated(!current.tgl_created || current.tgl_created === '-' ? todayDisp : toDisplayDMyShort(current.tgl_created));
    setFormDiupdateOleh(
      current.diupdate_oleh && current.diupdate_oleh !== '-' ? current.diupdate_oleh : currentUser
    );
    setFormTglUpdate(current.tgl_update && current.tgl_update !== '-' ? toDisplayDMyShort(current.tgl_update) : todayDisp);
    setIsCrudOpen(true);
  };

  const handleSaveCrud = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formNoBukti.trim() || !formCustomer.trim()) {
      setModalError('No. Bukti SJ dan Nama Customer wajib diisi.');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglIso = toIsoDate(formTanggal) || todayIso();
      const payload: Record<string, any> = {
        no_bukti: formNoBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_customer: formCustomer.trim().toUpperCase(),
        no_so: formNoSo.trim().toUpperCase(),
        po_no: formPoNo.trim().toUpperCase(),
        sales: formSales.trim().toUpperCase(),
        no_faktur: formNoFaktur.trim().toUpperCase(),
        keterangan: formKeterangan.trim(),
        lokasi_stock: formLokasiStock.trim().toUpperCase() || '01 - OFFICE',
        sts_print: formStsPrint,
        tgl_print: toIsoDate(formTglPrint) || (formStsPrint === 'Printed' ? todayIso() : null),
        sts_post: formStsPost,
        tgl_post: toIsoDate(formTglPost) || (formStsPost === 'Posting' ? tglIso : null),
        dibuat_oleh: formDibuatOleh.trim().toUpperCase() || currentUser,
        tgl_created: toIsoDate(formTglCreated) || todayIso(),
      };
      if (editingId) {
        payload.diupdate_oleh = formDiupdateOleh.trim().toUpperCase() || currentUser;
        payload.tgl_update = toIsoDate(formTglUpdate) || todayIso();
        await erpUpdate('surat_jalans', editingId, payload);
        showFeedback('Surat Jalan diperbarui di Supabase');
      } else {
        payload.diupdate_oleh = formDiupdateOleh.trim() ? formDiupdateOleh.trim().toUpperCase() : '-';
        payload.tgl_update = toIsoDate(formTglUpdate);
        const created = await erpCreate<any>('surat_jalans', payload);
        if (created?.id) setSelectedId(String(created.id));
        showFeedback('Surat Jalan tersimpan ke Supabase');
      }
      setIsCrudOpen(false);
      setEditingId(null);
      await loadLiveRows();
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Surat Jalan';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRequestHapus = () => {
    const current =
      filteredTableRows.find((r) => r.id === selectedId) ||
      tableRows.find((r) => r.id === selectedId);
    if (!current) {
      showFeedback('Pilih baris Surat Jalan yang akan dihapus');
      return;
    }
    setConfirmDeleteRow(current);
  };

  const handleConfirmHapus = async () => {
    if (!confirmDeleteRow) return;
    try {
      setIsBusy(true);
      await erpDelete('surat_jalans', confirmDeleteRow.id);
      if (confirmDeleteRow.id === selectedId) setSelectedId('');
      setConfirmDeleteRow(null);
      await loadLiveRows();
      showFeedback('Surat Jalan dihapus dari Supabase');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSimpan = async () => {
    const selected = selectedTableRow;
    if (!selected) {
      showFeedback('Pilih baris Surat Jalan terlebih dahulu untuk disimpan');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      await erpUpdate('surat_jalans', selected.id, {
        no_bukti: selected.no_bukti,
        tanggal: selected.tanggal_iso || toIsoDate(selected.tanggal) || todayIso(),
        nama_customer: selected.nama_customer,
        no_so: selected.no_so || '',
        po_no: selected.po_no || '',
        sales: selected.sales || '',
        no_faktur: selected.no_faktur || '',
        keterangan: selected.keterangan || '',
        lokasi_stock: selected.lokasi_stock || '01 - OFFICE',
        sts_print: selected.sts_print || 'Not Yet',
        tgl_print: toIsoDate(selected.tgl_print) || null,
        sts_post: selected.sts_post || 'Posting',
        tgl_post: toIsoDate(selected.tgl_post) || null,
        diupdate_oleh: currentUser,
        tgl_update: todayIso(),
      });
      localStorage.setItem(
        'withcoder_preset_surat_jalan',
        JSON.stringify({ tglStart, tglEnd, lokasiStock, bentukLaporan })
      );
      await syncAppSettings({
        periode_start: toIsoDate(tglStart),
        periode_end: toIsoDate(tglEnd),
        lokasi_aktif: lokasiStock !== 'ALL' ? lokasiStock : undefined,
      });
      await loadLiveRows();
      showFeedback(`Data Surat Jalan [${selected.no_bukti}] tersimpan ke Supabase`);
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    try {
      setIsBusy(true);
      await loadLiveRows({ skipSearch: true });
    } catch (err: any) {
      showFeedback(`Gagal muat: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarCari = async () => {
    try {
      setIsBusy(true);
      const res = await loadLiveRows({ field: searchField, term: searchTerm });
      showFeedback(
        searchTerm.trim()
          ? `Hasil cari Supabase: ${res.length} dokumen ditemukan`
          : `Data dimuat ulang (${res.length} dokumen)`
      );
    } catch (err: any) {
      showFeedback(`Gagal mencari: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarReset = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    try {
      setIsBusy(true);
      await loadLiveRows({ field: 'Semua', term: '' });
      showFeedback('Filter pencarian direset');
    } catch (err: any) {
      showFeedback(`Gagal reset: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const startIso = toIsoDate(tglStart);
    const endIso = toIsoDate(tglEnd);
    const rows = await erpList<any>('surat_jalans', {
      gte: startIso ? { tanggal: startIso } : undefined,
      lte: endIso ? { tanggal: endIso } : undefined,
      orderBy: 'tanggal',
      asc: false,
    });
    return rows
      .filter((r) => {
        if (lokasiStock !== 'ALL' && r.lokasi_stock && r.lokasi_stock !== lokasiStock) return false;
        if (filterType === 'sales' && salesCode.trim()) {
          return (r.sales || '').toLowerCase().includes(salesCode.trim().toLowerCase());
        }
        if (filterType === 'customer' && customerFilter.trim()) {
          return (r.nama_customer || '').toLowerCase().includes(customerFilter.trim().toLowerCase());
        }
        return true;
      })
      .map((r) => ({
        no_bukti: r.no_bukti || '',
        tanggal: toDisplayDMyShort(r.tanggal),
        nama_customer: r.nama_customer || '',
        no_so: r.no_so || '',
        po_no: r.po_no || '',
        sales: r.sales || '',
        no_faktur: r.no_faktur || '',
        lokasi_stock: r.lokasi_stock || '01 - OFFICE',
        sts_post: r.sts_post || 'Posting',
        keterangan: r.keterangan || '',
        dibuat_oleh: r.dibuat_oleh || 'ADMIN',
      }));
  };

  const handlePreview = async () => {
    try {
      setIsBusy(true);
      setPrintScopeOnOpen('all');
      const data = await fetchReportData();
      setPreviewRows(data);
      setIsPrintOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal memuat laporan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrintSelected = async () => {
    if (!selectedTableRow) {
      showFeedback('Pilih baris Surat Jalan yang akan dicetak terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      setPrintScopeOnOpen('selected');
      const data = await fetchReportData().catch(() => []);
      setPreviewRows(data);
      setIsPrintOpen(true);
    } catch {
      setPreviewRows([]);
      setIsPrintOpen(true);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsBusy(true);
      const [data, company] = await Promise.all([fetchReportData(), fetchActiveCompanyProfile()]);
      exportToExcel({
        fileName: 'Laporan_Surat_Jalan',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Periode: ${tglStart} s/d ${tglEnd} | Lokasi: ${lokasiStock}`,
        companyProfile: company,
        columns: [
          { header: 'No.Bukti SJ', accessor: 'no_bukti' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
          { header: 'Nama Customer', accessor: 'nama_customer' },
          { header: 'No.SO', accessor: 'no_so' },
          { header: 'PO.No', accessor: 'po_no' },
          { header: 'Sales', accessor: 'sales', align: 'center' },
          { header: 'No.Faktur', accessor: 'no_faktur' },
          { header: 'Lokasi Stock', accessor: 'lokasi_stock' },
          { header: 'Status', accessor: 'sts_post', align: 'center' },
          { header: 'Dibuat Oleh', accessor: 'dibuat_oleh' },
        ],
        rows: data,
      });
      showFeedback('Export Excel selesai');
    } catch (err: any) {
      showFeedback(`Gagal export: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      id="laporan-surat-jalan-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Laporan Surat Jalan"
        onClose={onClose}
        onFind={handleFind}
        onPrint={handlePrintSelected}
        onTableView={() => loadLiveRows()}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3 space-y-2.5">
        <div className="max-w-[590px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-3 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-sm tracking-wider text-black font-sans">
              LAPORAN SURAT JALAN
            </h1>
          </div>

          <div className="border-b border-[#999999] pb-2">
            <FormActionButtons
              compact
              onSimpan={handleSimpan}
              onBaru={handleBaru}
              onKoreksi={handleKoreksi}
              onHapus={handleRequestHapus}
              onPrint={handlePrintSelected}
              onFind={handleFind}
              isBusy={isBusy}
              feedback={feedback}
            />
          </div>

          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">Periode</legend>
            <div className="flex items-center space-x-2 pt-0.5">
              <span className="font-semibold text-black text-[11px]">
                Tanggal ( dd-mm-yyyy ) :
              </span>

              <DatePickerInput
                value={tglStart}
                onChange={(formatted) => setTglStart(formatted)}
                format="dmy"
                inputClassName="w-[82px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />

              <span className="font-bold text-[11px] px-1 text-black">s / d</span>

              <DatePickerInput
                value={tglEnd}
                onChange={(formatted) => setTglEnd(formatted)}
                format="dmy"
                inputClassName="w-[82px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />
            </div>
          </fieldset>

          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              <label className="flex items-center space-x-2 text-[11px] text-gray-400 cursor-not-allowed">
                <input
                  type="radio"
                  name="laporan_sj_filter"
                  disabled
                  checked={filterType === 'merk'}
                  onChange={() => setFilterType('merk')}
                  className="cursor-not-allowed"
                />
                <span>Merk Barang</span>
              </label>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="laporan_sj_filter"
                    checked={filterType === 'sales'}
                    onChange={() => setFilterType('sales')}
                    className="cursor-pointer"
                  />
                  <span>Sales</span>
                </label>

                <div className="flex items-center space-x-1 flex-1 ml-6">
                  <input
                    type="text"
                    list="lap-sj-sales-list"
                    value={salesCode}
                    onChange={(e) => setSalesCode(e.target.value.toUpperCase())}
                    disabled={filterType !== 'sales'}
                    className="bg-white border border-[#7A7A7A] px-2 py-0.5 w-32 text-[11px] font-mono uppercase disabled:bg-[#ECE9D8]"
                    placeholder="Pilih Sales..."
                  />
                  <datalist id="lap-sj-sales-list">
                    {salesCatalog.map((s) => (
                      <option key={s.kode} value={s.kode}>
                        {s.nama}
                      </option>
                    ))}
                  </datalist>
                  <input
                    type="text"
                    value={salesDesc}
                    readOnly
                    className="bg-[#FFFFCC] border border-[#7A7A7A] px-2 py-0.5 flex-1 text-[11px] shadow-inner uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="laporan_sj_filter"
                    checked={filterType === 'customer'}
                    onChange={() => setFilterType('customer')}
                    className="cursor-pointer"
                  />
                  <span>Customer</span>
                </label>
                <input
                  type="text"
                  list="lap-sj-cust-list"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  disabled={filterType !== 'customer'}
                  placeholder="Pilih / ketik customer..."
                  className="flex-1 bg-white border border-[#7A7A7A] px-2 py-0.5 text-[11px] uppercase outline-none disabled:bg-[#ECE9D8]"
                />
                <datalist id="lap-sj-cust-list">
                  {customerCatalog.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="laporan_sj_filter"
                  checked={filterType === 'all_periode'}
                  onChange={() => setFilterType('all_periode')}
                  className="cursor-pointer"
                />
                <span>ALL berdasarkan periode</span>
              </label>
            </div>
          </fieldset>

          <div className="flex items-stretch justify-between gap-3 pt-0.5">
            <div className="flex-1 space-y-2">
              <fieldset className="border border-[#999999] px-2 py-1 rounded-none relative">
                <legend className="text-[11px] font-semibold px-1 text-black">
                  Lokasi Stock :
                </legend>
                <div className="flex items-center bg-white border border-[#7A7A7A]">
                  <select
                    value={lokasiStock}
                    onChange={(e) => setLokasiStock(e.target.value)}
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer uppercase"
                  >
                    <option value="ALL">ALL</option>
                    {lokasiOptions.length > 0 ? (
                      lokasiOptions.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="01 - OFFICE">01 - OFFICE</option>
                        <option value="02 - GUDANG JAKARTA">02 - GUDANG JAKARTA</option>
                        <option value="03 - CABANG SURABAYA">03 - CABANG SURABAYA</option>
                      </>
                    )}
                  </select>
                </div>
              </fieldset>

              <fieldset className="border border-[#999999] px-2 py-1 rounded-none relative">
                <legend className="text-[11px] font-semibold px-1 text-black">
                  Bentuk Laporan :
                </legend>
                <div className="flex items-center bg-white border border-[#7A7A7A]">
                  <select
                    value={bentukLaporan}
                    onChange={(e) => setBentukLaporan(e.target.value)}
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer font-bold"
                  >
                    <option value="01 - Laporan Detail Surat Jalan">01 - Laporan Detail Surat Jalan</option>
                    <option value="02 - Laporan Rekap Surat Jalan">02 - Laporan Rekap Surat Jalan</option>
                    <option value="03 - Laporan Surat Jalan by Customer">03 - Laporan Surat Jalan by Customer</option>
                  </select>
                </div>
              </fieldset>
            </div>

            <div className="w-[100px] border border-[#999999] p-1.5 flex flex-col items-center justify-center gap-1.5 bg-[#E6E2D4]">
              <button
                type="button"
                disabled={isBusy}
                onClick={handlePreview}
                className="w-full flex-1 py-2 bg-[#EAE6D9] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F2EFE6] active:border-[#808080] active:border-r-[#FFFFFF] active:border-b-[#FFFFFF] font-extrabold text-[12px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span className="border border-dotted border-black/40 px-1 py-0.5 w-full block">
                  PREVIEW
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full h-[24px] bg-[#ECE9D8] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F5F3E8] font-bold text-[11px] text-black cursor-pointer flex items-center justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Live Supabase Search & Data Grid Panel */}
        <div className="max-w-[980px] bg-[#ECE9D8] border border-[#808080] flex flex-col shadow-xs">
          <div className="bg-[#D4D0C8] border-b border-[#808080] px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center">
              <ToolbarSearchControl
                compact
                searchField={searchField}
                onSearchFieldChange={setSearchField}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onCari={handleToolbarCari}
                onReset={handleToolbarReset}
                options={[
                  { value: 'Semua', label: 'Semua Kolom' },
                  { value: 'Kode', label: 'Kode (No.Bukti)' },
                  { value: 'No.Bukti', label: 'No.Bukti' },
                  { value: 'Customer', label: 'Customer' },
                  { value: 'No.SO', label: 'No.SO' },
                  { value: 'PO.No', label: 'PO.No' },
                  { value: 'Sales', label: 'Sales' },
                  { value: 'No.Faktur', label: 'No.Faktur' },
                ]}
                inputRef={searchInputRef}
                isBusy={isBusy}
                placeholder="Cari No.Bukti SJ, Customer, No.SO, No.Faktur..."
              />
            </div>
            <span className="text-[11px] text-black">
              Data Supabase (<b>surat_jalans</b>): <b>{filteredTableRows.length}</b> baris
            </span>
          </div>

          <div className="max-h-[220px] overflow-auto bg-white">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080]">
                <tr>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Bukti SJ</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.SO</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">PO.No</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Sales</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Faktur</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Lokasi Stock</th>
                  <th className="px-2 py-1 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                      Belum ada data Surat Jalan. Klik "Baru" untuk menambah ke Supabase.
                    </td>
                  </tr>
                ) : (
                  filteredTableRows.map((r) => {
                    const isSel = r.id === selectedId;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        onDoubleClick={() => {
                          setSelectedId(r.id);
                          setEditingId(r.id);
                          setModalError(null);
                          setFormNoBukti(r.no_bukti);
                          setFormTanggal(r.tanggal_display || toDisplayDMyShort(todayIso()));
                          setFormCustomer(r.nama_customer);
                          setFormNoSo(r.no_so);
                          setFormPoNo(r.po_no);
                          setFormSales(r.sales || '');
                          setFormNoFaktur(r.no_faktur);
                          setFormKeterangan(r.keterangan);
                          setFormLokasiStock(r.lokasi_stock || lokasiOptions[0] || '01 - OFFICE');
                          setFormStsPrint(r.sts_print || 'Not Yet');
                          setFormTglPrint(r.tgl_print_display || '');
                          setFormStsPost(r.sts_post || 'Posting');
                          setFormTglPost(r.tgl_post_display || '');
                          setFormDibuatOleh(r.dibuat_oleh || 'ADMIN');
                          setFormTglCreated(r.tgl_created ? toDisplayDMyShort(r.tgl_created) : toDisplayDMyShort(todayIso()));
                          setFormDiupdateOleh(r.diupdate_oleh || '-');
                          setFormTglUpdate(r.tgl_update ? toDisplayDMyShort(r.tgl_update) : '');
                          setIsCrudOpen(true);
                        }}
                        className={`cursor-pointer border-b border-[#E0E0E0] ${
                          isSel ? 'bg-[#316AC5] text-white' : 'hover:bg-[#EAF2FC]'
                        }`}
                      >
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.no_bukti}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.tanggal_display}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_customer}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_so || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.po_no || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.sales || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_faktur || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.lokasi_stock || '-'}</td>
                        <td className="px-2 py-1 text-center">{r.sts_post}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Surat Jalan Modal */}
      {isCrudOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[540px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden text-xs">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 flex justify-between items-center font-bold shrink-0">
              <span>{editingId ? 'Koreksi Surat Jalan' : 'Tambah Surat Jalan Baru'}</span>
              <button
                type="button"
                onClick={() => setIsCrudOpen(false)}
                className="w-5 h-5 bg-[#C00000] text-white font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form noValidate onSubmit={handleSaveCrud} className="p-3 space-y-2.5 text-[11px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">No. Bukti SJ *</label>
                  <input
                    type="text"
                    value={formNoBukti}
                    onChange={(e) => setFormNoBukti(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Tanggal</label>
                  <DatePickerInput
                    value={formTanggal}
                    onChange={(fmt) => setFormTanggal(fmt)}
                    format="dmy"
                    inputClassName="w-full h-[24px] px-2 bg-white border border-[#7A7A7A]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-0.5">Nama Customer *</label>
                <select
                  value={formCustomer}
                  onChange={(e) => setFormCustomer(e.target.value.toUpperCase())}
                  className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                >
                  <option value="">-- Pilih Customer --</option>
                  {customerCatalog.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">No. SO</label>
                  <select
                    value={formNoSo}
                    onChange={(e) => setFormNoSo(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-1 bg-white border border-[#7A7A7A] font-mono uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih SO --</option>
                    {soOptions.map((so) => (
                      <option key={so} value={so}>
                        {so}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-0.5">PO. No</label>
                  <select
                    value={formPoNo}
                    onChange={(e) => setFormPoNo(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-1 bg-white border border-[#7A7A7A] font-mono uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih PO --</option>
                    {poOptions.map((po) => (
                      <option key={po} value={po}>
                        {po}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Sales</label>
                  <select
                    value={formSales}
                    onChange={(e) => setFormSales(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Sales --</option>
                    {salesCatalog.map((s) => (
                      <option key={s.kode} value={s.nama}>
                        {s.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">No. Faktur</label>
                  <input
                    type="text"
                    value={formNoFaktur}
                    onChange={(e) => setFormNoFaktur(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Lokasi Stock</label>
                  <select
                    value={formLokasiStock}
                    onChange={(e) => setFormLokasiStock(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                  >
                    {lokasiOptions.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Sts.Print / Tgl.Print</label>
                  <div className="flex gap-1">
                    <select
                      value={formStsPrint}
                      onChange={(e) => setFormStsPrint(e.target.value)}
                      className="w-24 h-[24px] px-1 bg-white border border-[#7A7A7A]"
                    >
                      <option value="Not Yet">Not Yet</option>
                      <option value="Printed">Printed</option>
                    </select>
                    <div className="flex-1">
                      <DatePickerInput
                        value={formTglPrint}
                        onChange={(fmt) => setFormTglPrint(fmt)}
                        format="dMyShort"
                        inputClassName="w-full h-[24px] px-2 bg-white border border-[#7A7A7A]"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Sts.Post / Tgl.Post</label>
                  <div className="flex gap-1">
                    <select
                      value={formStsPost}
                      onChange={(e) => setFormStsPost(e.target.value)}
                      className="w-24 h-[24px] px-1 bg-white border border-[#7A7A7A]"
                    >
                      <option value="Not Yet">Not Yet</option>
                      <option value="Posting">Posting</option>
                    </select>
                    <div className="flex-1">
                      <DatePickerInput
                        value={formTglPost}
                        onChange={(fmt) => setFormTglPost(fmt)}
                        format="dMyShort"
                        inputClassName="w-full h-[24px] px-2 bg-white border border-[#7A7A7A]"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-0.5">Keterangan</label>
                <input
                  type="text"
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A]"
                />
              </div>

              {/* Audit Fields */}
              <div className="border-t border-[#D0D0D0] pt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="block font-semibold mb-0.5">Dibuat Oleh:</label>
                  <input
                    type="text"
                    value={formDibuatOleh}
                    onChange={(e) => setFormDibuatOleh(e.target.value.toUpperCase())}
                    className="w-full h-[22px] px-1 bg-white border border-[#7A7A7A] uppercase text-[10px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-0.5">Tgl. Created:</label>
                  <DatePickerInput
                    value={formTglCreated}
                    onChange={(formatted) => setFormTglCreated(formatted)}
                    format="dMyShort"
                    inputClassName="w-full h-[22px] px-1 bg-white border border-[#7A7A7A] text-[10px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-0.5">Diupdate Oleh:</label>
                  <input
                    type="text"
                    value={formDiupdateOleh}
                    onChange={(e) => setFormDiupdateOleh(e.target.value.toUpperCase())}
                    className="w-full h-[22px] px-1 bg-white border border-[#7A7A7A] uppercase text-[10px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-0.5">Tgl. Update:</label>
                  <DatePickerInput
                    value={formTglUpdate}
                    onChange={(formatted) => setFormTglUpdate(formatted)}
                    format="dMyShort"
                    inputClassName="w-full h-[22px] px-1 bg-white border border-[#7A7A7A] text-[10px]"
                  />
                </div>
              </div>

              {modalError && (
                <div className="p-2 bg-[#FDE8E8] border border-[#C00000] text-[#900000] font-semibold">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ACA899]">
                <button
                  type="button"
                  onClick={() => setIsCrudOpen(false)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1 bg-[#0A246A] text-white border border-black font-bold cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-xl w-[360px] overflow-hidden">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 font-bold text-xs">
              Konfirmasi Hapus Surat Jalan
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>
                Yakin ingin menghapus Surat Jalan [{confirmDeleteRow.no_bukti}] dari database Supabase?
              </p>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteRow(null)}
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

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Surat Jalan"
        rows={tableRows}
        columns={[
          { header: 'No.Bukti SJ', accessor: (r) => r.no_bukti, mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal_display, align: 'center' },
          { header: 'Customer', accessor: (r) => r.nama_customer },
          { header: 'No.SO', accessor: (r) => r.no_so || '-', mono: true },
          { header: 'PO.No', accessor: (r) => r.po_no || '-', mono: true },
          { header: 'Sales', accessor: (r) => r.sales || '-', align: 'center' },
          { header: 'No.Faktur', accessor: (r) => r.no_faktur || '-', mono: true },
          { header: 'Status', accessor: (r) => r.sts_post, align: 'center' },
        ]}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.no_bukti,
          r.tanggal_display,
          r.nama_customer,
          r.no_so,
          r.po_no,
          r.sales,
          r.no_faktur,
          r.lokasi_stock,
          r.keterangan,
          r.sts_post,
        ]}
        selectedId={selectedId}
        onSelectRow={(r) => {
          setSelectedId(r.id);
          showFeedback(`Surat Jalan [${r.no_bukti}] dipilih`);
        }}
        onSearchSupabase={(q) => loadLiveRows({ field: 'Semua', term: q })}
        onRefreshSupabase={() => loadLiveRows({ field: 'Semua', term: '' })}
        isBusy={isBusy}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={bentukLaporan.toUpperCase()}
        subtitle={`Periode: ${tglStart} s/d ${tglEnd}`}
        orientation="landscape"
        defaultPrintScope={printScopeOnOpen}
        selectedRow={selectedSjPrintRow}
        selectedTitle="CETAK SURAT JALAN TERPILIH"
        selectedSubtitle={
          selectedSjPrintRow
            ? `No.Bukti SJ: ${selectedSjPrintRow.no_bukti} | Customer: ${selectedSjPrintRow.nama_customer}`
            : undefined
        }
        selectedMetaLines={
          selectedSjPrintRow
            ? [
                { label: 'No.Bukti SJ', value: selectedSjPrintRow.no_bukti },
                { label: 'Tanggal', value: selectedSjPrintRow.tanggal },
                { label: 'Customer', value: selectedSjPrintRow.nama_customer },
                { label: 'No.SO / PO', value: `${selectedSjPrintRow.no_so || '-'} / ${selectedSjPrintRow.po_no || '-'}` },
                { label: 'Lokasi Stock', value: selectedSjPrintRow.lokasi_stock || '-' },
              ]
            : undefined
        }
        metaLines={[
          { label: 'Periode Tanggal', value: `${tglStart} s/d ${tglEnd}` },
          { label: 'Lokasi Stock', value: lokasiStock },
          {
            label: 'Filter',
            value:
              filterType === 'sales'
                ? `Sales ${salesCode || 'Semua'}`
                : filterType === 'customer'
                ? customerFilter || 'Semua Customer'
                : 'ALL Berdasarkan Periode',
          },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={[
          { header: 'No.Bukti SJ', accessor: 'no_bukti', width: '100px' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '75px' },
          { header: 'Nama Customer', accessor: 'nama_customer' },
          { header: 'No.SO', accessor: 'no_so', width: '95px' },
          { header: 'PO.No', accessor: 'po_no', width: '85px' },
          { header: 'Sales', accessor: 'sales', align: 'center', width: '70px' },
          { header: 'No.Faktur', accessor: 'no_faktur', width: '95px' },
          { header: 'Lokasi Stock', accessor: 'lokasi_stock', width: '95px' },
          { header: 'Status', accessor: 'sts_post', align: 'center', width: '65px' },
          { header: 'Dibuat Oleh', accessor: 'dibuat_oleh', width: '75px' },
        ]}
        rows={previewRows}
        summaryItems={[
          { label: 'Total Surat Jalan', value: `${previewRows.length} Dokumen` },
        ]}
      />
    </div>
  );
};
