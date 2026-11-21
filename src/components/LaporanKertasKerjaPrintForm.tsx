import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';
import {
  erpCompositeSave,
  erpDelete,
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
  nextUniqueCode,
  parseNum,
  syncAppSettings,
  todayIso,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { getCurrentUser } from '../lib/authService';

interface LaporanKertasKerjaPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface JurnalDetailLine {
  id?: string;
  kode_akun: string;
  nama_akun: string;
  debet: number;
  kredit: number;
  keterangan: string;
}

export const LaporanKertasKerjaPrintForm: React.FC<
  LaporanKertasKerjaPrintFormProps
> = ({ isOpen, onClose }) => {
  const [periode, setPeriode] = useState<string>('08-2026');
  const [bentukLaporan, setBentukLaporan] = useState<string>(
    '01 - Laporan Kertas Kerja I'
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  // Live Supabase table (jurnal_umums) + Search state
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add / Koreksi Modal for jurnal_umums + jurnal_umum_details
  const [isCrudOpen, setIsCrudOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNoBukti, setFormNoBukti] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(() => toDisplayDMyShort(todayIso()));
  const [formKategori, setFormKategori] = useState<string>('Jurnal Umum');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formSaldoDebet, setFormSaldoDebet] = useState<string>('0');
  const [formStsPost, setFormStsPost] = useState<string>('Not Yet');
  const [detailLines, setDetailLines] = useState<JurnalDetailLine[]>([]);
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
      Kategori: 'kategori',
      Keterangan: 'keterangan',
      Status: 'sts_post',
    };
    const queryOpts: Record<string, any> = { orderBy: 'tanggal', asc: false };
    if (activeTerm) {
      if (activeField !== 'Semua' && SEARCH_COL_MAP[activeField]) {
        queryOpts.searchCol = SEARCH_COL_MAP[activeField];
        queryOpts.searchVal = activeTerm;
      } else {
        queryOpts.orSearch = 'no_bukti,kategori,keterangan,sts_post,dibuat_oleh';
        queryOpts.searchVal = activeTerm;
      }
    }

    const rows = await erpList<any>('jurnal_umums', queryOpts);
    const mapped = rows.map((r) => ({
      ...r,
      id: String(r.id),
      no_bukti: r.no_bukti || '',
      tanggal_iso: toIsoDate(r.tanggal) || '',
      tanggal_display: toDisplayDMyShort(r.tanggal),
      kategori: r.kategori || 'Jurnal Umum',
      keterangan: r.keterangan || '',
      saldo_debet: Number(r.saldo_debet || 0),
      sts_post: r.sts_post || 'Not Yet',
      dibuat_oleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
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
        const rawPreset = localStorage.getItem('withcoder_preset_kertas_kerja');
        if (rawPreset && active) {
          const v = JSON.parse(rawPreset);
          if (v.periode) setPeriode(v.periode);
          if (v.bentukLaporan) setBentukLaporan(v.bentukLaporan);
        }
        await loadLiveRows();
      } catch {
        // Ignore
      } finally {
        if (active) setIsBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const parts = periode.split('-');
  const yearMonthPrefix = parts.length === 2 ? `${parts[1]}-${parts[0]}` : '';

  const filteredTableRows = tableRows.filter((r) => {
    if (yearMonthPrefix && r.tanggal_iso && !r.tanggal_iso.startsWith(yearMonthPrefix)) {
      return false;
    }
    if (searchTerm.trim()) {
      if (searchField === 'Kode' || searchField === 'No.Bukti') {
        return matchesMultiKeyword([r.no_bukti], searchTerm);
      }
      if (searchField === 'Kategori') return matchesMultiKeyword([r.kategori], searchTerm);
      if (searchField === 'Keterangan') return matchesMultiKeyword([r.keterangan], searchTerm);
      if (searchField === 'Status') return matchesMultiKeyword([r.sts_post], searchTerm);
      return matchesMultiKeyword(
        [r.no_bukti, r.tanggal_display, r.kategori, r.keterangan, r.sts_post, r.dibuat_oleh],
        searchTerm
      );
    }
    return true;
  });

  const selectedTableRow =
    filteredTableRows.find((r) => r.id === selectedId) ||
    tableRows.find((r) => r.id === selectedId) ||
    null;

  const handleBaru = () => {
    setModalError(null);
    setEditingId(null);
    setFormNoBukti(nextUniqueCode(tableRows.map((r) => r.no_bukti), '2608-JU-', 3));
    setFormTanggal(toDisplayDMyShort(todayIso()));
    setFormKategori('Jurnal Umum');
    setFormKeterangan('');
    setFormSaldoDebet('0');
    setFormStsPost('Not Yet');
    setDetailLines([
      { kode_akun: '1101', nama_akun: 'Kas / Bank', debet: 0, kredit: 0, keterangan: '' },
      { kode_akun: '4101', nama_akun: 'Pendapatan / Biaya', debet: 0, kredit: 0, keterangan: '' },
    ]);
    setIsCrudOpen(true);
  };

  const openEditRow = async (current: any) => {
    setSelectedId(current.id);
    setModalError(null);
    setEditingId(current.id);
    setFormNoBukti(current.no_bukti);
    setFormTanggal(current.tanggal_display || toDisplayDMyShort(todayIso()));
    setFormKategori(current.kategori || 'Jurnal Umum');
    setFormKeterangan(current.keterangan);
    setFormSaldoDebet(String(current.saldo_debet || 0));
    setFormStsPost(current.sts_post || 'Not Yet');
    setIsCrudOpen(true);

    try {
      const dets = await erpList<any>('jurnal_umum_details', {
        eq: { jurnal_id: current.id },
        orderBy: 'created_at',
        asc: true,
      });
      setDetailLines(
        dets.map((d) => ({
          id: d.id,
          kode_akun: d.kode_akun || '',
          nama_akun: d.nama_akun || '',
          debet: Number(d.debet || 0),
          kredit: Number(d.kredit || 0),
          keterangan: d.keterangan || '',
        }))
      );
    } catch {
      setDetailLines([]);
    }
  };

  const handleKoreksi = () => {
    const current =
      filteredTableRows.find((r) => r.id === selectedId) ||
      tableRows.find((r) => r.id === selectedId) ||
      filteredTableRows[0];
    if (!current) {
      showFeedback('Pilih baris Jurnal Kertas Kerja terlebih dahulu (atau klik Baru)');
      return;
    }
    openEditRow(current);
  };

  const totalLineDebet = detailLines.reduce((s, d) => s + Number(d.debet || 0), 0);
  const totalLineKredit = detailLines.reduce((s, d) => s + Number(d.kredit || 0), 0);

  const handleSaveCrud = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formNoBukti.trim() || !formKeterangan.trim()) {
      setModalError('No.Bukti dan Keterangan wajib diisi.');
      return;
    }
    const tglIso = toIsoDate(formTanggal) || todayIso();
    const numericSaldo = totalLineDebet > 0 ? totalLineDebet : parseNum(formSaldoDebet);

    const headerPayload: Record<string, any> = {
      ...(editingId ? { id: editingId } : {}),
      no_bukti: formNoBukti.trim().toUpperCase(),
      tanggal: tglIso,
      kategori: formKategori,
      keterangan: formKeterangan.trim(),
      saldo_debet: numericSaldo,
      sts_post: formStsPost,
      ...(editingId
        ? { diupdate_oleh: (getCurrentUser().username || 'ADMIN'), tgl_update: todayIso() }
        : { dibuat_oleh: (getCurrentUser().username || 'ADMIN'), tgl_created: tglIso }),
    };

    const validDetails = detailLines
      .filter((d) => d.kode_akun.trim() || d.nama_akun.trim() || d.debet > 0 || d.kredit > 0)
      .map((d) => ({
        kode_akun: d.kode_akun.trim().toUpperCase(),
        nama_akun: d.nama_akun.trim(),
        debet: Number(d.debet || 0),
        kredit: Number(d.kredit || 0),
        keterangan: d.keterangan.trim(),
      }));

    try {
      setIsBusy(true);
      const saved = await erpCompositeSave<{ header: any }>(
        'jurnal-umum',
        headerPayload,
        validDetails
      );
      if (saved?.header?.id) setSelectedId(String(saved.header.id));
      setIsCrudOpen(false);
      setEditingId(null);
      await loadLiveRows();
      showFeedback(
        editingId
          ? 'Jurnal Kertas Kerja diperbarui di Supabase'
          : 'Jurnal Kertas Kerja tersimpan ke Supabase'
      );
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Jurnal Kertas Kerja';
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
      showFeedback('Pilih baris Jurnal Kertas Kerja yang akan dihapus');
      return;
    }
    setConfirmDeleteRow(current);
  };

  const handleConfirmHapus = async () => {
    if (!confirmDeleteRow) return;
    try {
      setIsBusy(true);
      await erpDelete('jurnal_umums', confirmDeleteRow.id);
      if (confirmDeleteRow.id === selectedId) setSelectedId('');
      setConfirmDeleteRow(null);
      await loadLiveRows();
      showFeedback('Jurnal Kertas Kerja dihapus dari Supabase');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSimpan = async () => {
    const selected = selectedTableRow;
    if (!selected) {
      showFeedback('Pilih baris Jurnal Kertas Kerja terlebih dahulu untuk disimpan');
      return;
    }
    try {
      setIsBusy(true);
      const dets = await erpList<any>('jurnal_umum_details', {
        eq: { jurnal_id: selected.id },
        orderBy: 'created_at',
        asc: true,
      }).catch(() => []);
      const mappedDetails = dets.map((d) => ({
        kode_akun: (d.kode_akun || '').trim().toUpperCase(),
        nama_akun: (d.nama_akun || '').trim(),
        debet: Number(d.debet || 0),
        kredit: Number(d.kredit || 0),
        keterangan: (d.keterangan || '').trim(),
      }));
      await erpCompositeSave(
        'jurnal-umum',
        {
          id: selected.id,
          no_bukti: selected.no_bukti,
          tanggal: selected.tanggal_iso || toIsoDate(selected.tanggal) || todayIso(),
          kategori: selected.kategori || 'Jurnal Umum',
          keterangan: selected.keterangan || '',
          saldo_debet: Number(selected.saldo_debet || 0),
          sts_post: selected.sts_post || 'Not Yet',
          diupdate_oleh: getCurrentUser().username || 'ADMIN',
          tgl_update: todayIso(),
        },
        mappedDetails
      );
      localStorage.setItem(
        'withcoder_preset_kertas_kerja',
        JSON.stringify({ periode, bentukLaporan })
      );
      await syncAppSettings({
        month_active: periode.trim() || undefined,
      });
      await loadLiveRows();
      showFeedback(`Data Jurnal [${selected.no_bukti}] tersimpan ke Supabase`);
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
          ? `Hasil cari Supabase: ${res.length} jurnal ditemukan`
          : `Data dimuat ulang (${res.length} jurnal)`
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
    const [jurnals, details, viewRows] = await Promise.all([
      erpList<any>('jurnal_umums', { orderBy: 'tanggal', asc: true }).catch(() => []),
      erpList<any>('jurnal_umum_details', { orderBy: 'kode_akun', asc: true }).catch(() => []),
      erpList<any>('v_laporan_kertas_kerja').catch(() => []),
    ]);

    if (details.length > 0) {
      const jurnalMap = new Map<string, any>(jurnals.map((j) => [j.id, j]));
      const accountSummary = new Map<
        string,
        { kode_akun: string; nama_akun: string; debet: number; kredit: number; saldo: number }
      >();

      for (const d of details) {
        const j = jurnalMap.get(d.jurnal_id);
        if (yearMonthPrefix && j?.tanggal && !String(j.tanggal).startsWith(yearMonthPrefix)) {
          continue;
        }
        const kode = d.kode_akun || '0000';
        const prev = accountSummary.get(kode) || {
          kode_akun: kode,
          nama_akun: d.nama_akun || '',
          debet: 0,
          kredit: 0,
          saldo: 0,
        };
        const deb = prev.debet + Number(d.debet || 0);
        const kre = prev.kredit + Number(d.kredit || 0);
        accountSummary.set(kode, {
          ...prev,
          debet: deb,
          kredit: kre,
          saldo: deb - kre,
        });
      }
      if (accountSummary.size > 0) {
        return Array.from(accountSummary.values());
      }
    }

    if (viewRows.length > 0) {
      return viewRows
        .filter((v) => !v.periode || !yearMonthPrefix || String(v.periode) === yearMonthPrefix)
        .map((v) => ({
          kode_akun: v.kode_akun || '-',
          nama_akun: v.nama_akun || 'Akun Umum',
          debet: Number(v.total_debet ?? v.debet ?? 0),
          kredit: Number(v.total_kredit ?? v.kredit ?? 0),
          saldo: Number(v.saldo_akhir ?? v.saldo ?? 0),
        }));
    }

    return jurnals
      .filter((j) => !yearMonthPrefix || String(j.tanggal || '').startsWith(yearMonthPrefix))
      .map((j) => ({
        kode_akun: j.no_bukti || '-',
        nama_akun: `${j.kategori || 'Jurnal Umum'} — ${j.keterangan || ''}`.trim(),
        tanggal: toDisplayDMyShort(j.tanggal),
        debet: Number(j.saldo_debet || 0),
        kredit: 0,
        saldo: Number(j.saldo_debet || 0),
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
      showFeedback('Pilih baris Jurnal Kertas Kerja yang akan dicetak terlebih dahulu');
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
        fileName: 'Laporan_Kertas_Kerja',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Periode: ${periode}`,
        companyProfile: company,
        columns: [
          { header: 'Kode Akun / Bukti', accessor: 'kode_akun' },
          { header: 'Nama Akun / Keterangan', accessor: 'nama_akun' },
          { header: 'Debet (Rp)', accessor: 'debet', align: 'right' },
          { header: 'Kredit (Rp)', accessor: 'kredit', align: 'right' },
          { header: 'Saldo (Rp)', accessor: 'saldo', align: 'right' },
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

  const printColumns: PrintColumn<any>[] = [
    { header: 'Kode Akun / Bukti', accessor: 'kode_akun', width: '115px' },
    { header: 'Nama Akun / Keterangan', accessor: 'nama_akun' },
    { header: 'Debet (Rp)', accessor: (r) => formatMoney(r.debet), align: 'right', width: '110px' },
    { header: 'Kredit (Rp)', accessor: (r) => formatMoney(r.kredit), align: 'right', width: '110px' },
    { header: 'Saldo (Rp)', accessor: (r) => formatMoney(r.saldo), align: 'right', width: '110px' },
  ];

  const totalDebet = previewRows.reduce((s, r) => s + Number(r.debet || 0), 0);
  const totalKredit = previewRows.reduce((s, r) => s + Number(r.kredit || 0), 0);

  return (
    <div
      id="laporan-kertas-kerja-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Laporan Kertas Kerja"
        onClose={onClose}
        onFind={handleFind}
        onPrint={handlePrintSelected}
        onTableView={() => loadLiveRows()}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3 space-y-2.5">
        <div className="max-w-[540px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-bold text-[18px] tracking-normal text-black font-serif">
              Laporan Kertas Kerja I
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

          {/* Group 1: Range */}
          <fieldset className="border border-[#999999] px-3 pt-2 pb-6 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Range
            </legend>
            <div className="flex items-center space-x-2 pt-0.5">
              <label className="font-bold text-black text-[12px] whitespace-nowrap">
                Periode (mm-yyyy) :
              </label>
              <select
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="w-[92px] h-[22px] px-1 bg-white border border-[#7A7A7A] text-[11px] font-sans text-black outline-none cursor-pointer"
              >
                <option value="07-2026">07-2026</option>
                <option value="08-2026">08-2026</option>
                <option value="09-2026">09-2026</option>
                <option value="10-2026">10-2026</option>
                <option value="11-2026">11-2026</option>
                <option value="12-2026">12-2026</option>
              </select>
            </div>
          </fieldset>

          {/* Group 2: Bentuk Laporan */}
          <fieldset className="border border-[#999999] px-3 py-2.5 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Bentuk Laporan
            </legend>
            <div className="flex items-center bg-white border border-[#7A7A7A]">
              <select
                value={bentukLaporan}
                onChange={(e) => setBentukLaporan(e.target.value)}
                className="w-full h-[22px] px-1.5 text-[11px] bg-white text-black outline-none cursor-pointer"
              >
                <option value="01 - Laporan Kertas Kerja I">01 - Laporan Kertas Kerja I</option>
                <option value="02 - Laporan Kertas Kerja II">02 - Laporan Kertas Kerja II</option>
                <option value="03 - Neraca Percobaan">03 - Neraca Percobaan</option>
                <option value="04 - Laporan Laba Rugi">04 - Laporan Laba Rugi</option>
                <option value="05 - Neraca">05 - Neraca</option>
              </select>
            </div>
          </fieldset>

          {/* Bottom Buttons */}
          <div className="flex items-center justify-around pt-1 pb-0.5">
            <button
              type="button"
              disabled={isBusy}
              onClick={handlePreview}
              className="w-[106px] h-[28px] bg-[#ECE9D8] hover:bg-[#F5F3E8] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white font-bold text-[12px] text-black shadow-2xs cursor-pointer flex items-center justify-center"
            >
              <span>
                <span className="underline">P</span>review
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-[106px] h-[28px] bg-[#ECE9D8] hover:bg-[#F5F3E8] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white font-bold text-[12px] text-black shadow-2xs cursor-pointer flex items-center justify-center"
            >
              <span>
                <span className="underline">C</span>lose
              </span>
            </button>
          </div>
        </div>

        {/* Live Supabase Search & Jurnal Sumber Kertas Kerja Panel */}
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
                  { value: 'Kategori', label: 'Kategori' },
                  { value: 'Keterangan', label: 'Keterangan' },
                  { value: 'Status', label: 'Status' },
                ]}
                inputRef={searchInputRef}
                isBusy={isBusy}
                placeholder="Cari No.Bukti Jurnal, Kategori, Keterangan..."
              />
            </div>
            <span className="text-[11px] text-black">
              Data Supabase (<b>jurnal_umums</b>): <b>{filteredTableRows.length}</b> baris
            </span>
          </div>

          <div className="max-h-[220px] overflow-auto bg-white">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080]">
                <tr>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Bukti</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Kategori</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Keterangan</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">Saldo Debet</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Status</th>
                  <th className="px-2 py-1 text-center">Dibuat Oleh</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-gray-500 italic">
                      Belum ada data Jurnal untuk periode {periode}. Klik "Baru" untuk menambah ke Supabase.
                    </td>
                  </tr>
                ) : (
                  filteredTableRows.map((r) => {
                    const isSel = r.id === selectedId;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        onDoubleClick={() => openEditRow(r)}
                        className={`cursor-pointer border-b border-[#E0E0E0] ${
                          isSel ? 'bg-[#316AC5] text-white' : 'hover:bg-[#EAF2FC]'
                        }`}
                      >
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.no_bukti}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.tanggal_display}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.kategori}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.keterangan}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">
                          {formatRupiah(r.saldo_debet)}
                        </td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.sts_post}</td>
                        <td className="px-2 py-1 text-center">{r.dibuat_oleh}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Composite Journal Modal */}
      {isCrudOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[720px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
              <span>{editingId ? 'Koreksi Jurnal Kertas Kerja' : 'Tambah Jurnal Kertas Kerja Baru'}</span>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsCrudOpen(false);
                }}
                className="w-[16px] h-[16px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form noValidate onSubmit={handleSaveCrud} className="p-4 flex flex-col space-y-3 overflow-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">No.Bukti:</label>
                  <input
                    type="text"
                    value={formNoBukti}
                    onChange={(e) => setFormNoBukti(e.target.value)}
                    required
                    className="w-48 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">Tanggal:</label>
                  <DatePickerInput
                    value={formTanggal}
                    onChange={(formatted) => setFormTanggal(formatted)}
                    format="dMyShort"
                    inputClassName="w-[174px] h-[25px] px-2 bg-white border border-[#7A7A7A] text-xs outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">Kategori:</label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-48 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  >
                    <option value="Jurnal Umum">Jurnal Umum</option>
                    <option value="Kas Masuk">Kas Masuk</option>
                    <option value="Kas Keluar">Kas Keluar</option>
                    <option value="Bank Masuk">Bank Masuk</option>
                    <option value="Bank Keluar">Bank Keluar</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">Sts.Post:</label>
                  <select
                    value={formStsPost}
                    onChange={(e) => setFormStsPost(e.target.value)}
                    className="w-48 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  >
                    <option value="Not Yet">Not Yet</option>
                    <option value="Posted">Posted</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-black w-28">Keterangan:</label>
                <input
                  type="text"
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  required
                  className="flex-1 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-black w-28">Saldo Debet:</label>
                <input
                  type="text"
                  value={totalLineDebet > 0 ? String(totalLineDebet) : formSaldoDebet}
                  onChange={(e) => setFormSaldoDebet(e.target.value)}
                  disabled={totalLineDebet > 0}
                  className="w-48 px-2 py-1 bg-white border border-[#7A7A7A] text-xs text-right font-mono disabled:bg-[#F3F2F1]"
                />
              </div>

              {/* Composite Detail Akun Debet / Kredit */}
              <div className="border border-[#ACA899] bg-white p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-black">
                    Rincian Baris Akun Jurnal (Debet / Kredit)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDetailLines((prev) => [
                        ...prev,
                        { kode_akun: '', nama_akun: '', debet: 0, kredit: 0, keterangan: '' },
                      ])
                    }
                    className="px-2 py-0.5 bg-[#ECE9D8] border border-[#7A7A7A] text-[10px] font-bold cursor-pointer"
                  >
                    + Tambah Baris Akun
                  </button>
                </div>

                <table className="w-full border-collapse border border-[#D4D0C8] text-[11px]">
                  <thead className="bg-[#ECE9D8]">
                    <tr>
                      <th className="border border-[#B5B3A8] px-1.5 py-0.5 text-left w-20">Kode Akun</th>
                      <th className="border border-[#B5B3A8] px-1.5 py-0.5 text-left">Nama Akun</th>
                      <th className="border border-[#B5B3A8] px-1.5 py-0.5 text-right w-24">Debet</th>
                      <th className="border border-[#B5B3A8] px-1.5 py-0.5 text-right w-24">Kredit</th>
                      <th className="border border-[#B5B3A8] px-1.5 py-0.5 text-left w-32">Keterangan</th>
                      <th className="border border-[#B5B3A8] px-1 py-0.5 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {detailLines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="border border-[#E0DED5] p-0.5">
                          <input
                            type="text"
                            value={line.kode_akun}
                            onChange={(e) =>
                              setDetailLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, kode_akun: e.target.value } : l))
                              )
                            }
                            className="w-full px-1 py-0.5 bg-white outline-none font-mono"
                          />
                        </td>
                        <td className="border border-[#E0DED5] p-0.5">
                          <input
                            type="text"
                            value={line.nama_akun}
                            onChange={(e) =>
                              setDetailLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, nama_akun: e.target.value } : l))
                              )
                            }
                            className="w-full px-1 py-0.5 bg-white outline-none"
                          />
                        </td>
                        <td className="border border-[#E0DED5] p-0.5">
                          <input
                            type="number"
                            value={line.debet}
                            onChange={(e) =>
                              setDetailLines((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, debet: Number(e.target.value || 0) } : l
                                )
                              )
                            }
                            className="w-full px-1 py-0.5 bg-white outline-none text-right font-mono"
                          />
                        </td>
                        <td className="border border-[#E0DED5] p-0.5">
                          <input
                            type="number"
                            value={line.kredit}
                            onChange={(e) =>
                              setDetailLines((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, kredit: Number(e.target.value || 0) } : l
                                )
                              )
                            }
                            className="w-full px-1 py-0.5 bg-white outline-none text-right font-mono"
                          />
                        </td>
                        <td className="border border-[#E0DED5] p-0.5">
                          <input
                            type="text"
                            value={line.keterangan}
                            onChange={(e) =>
                              setDetailLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, keterangan: e.target.value } : l))
                              )
                            }
                            className="w-full px-1 py-0.5 bg-white outline-none"
                          />
                        </td>
                        <td className="border border-[#E0DED5] text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setDetailLines((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-red-700 font-bold cursor-pointer px-1"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end space-x-6 text-[11px] font-bold pt-1">
                  <span>Total Debet: {formatRupiah(totalLineDebet)}</span>
                  <span>Total Kredit: {formatRupiah(totalLineKredit)}</span>
                </div>
              </div>

              {modalError && (
                <div className="p-2 bg-[#FDE8E8] border border-[#C00000] text-[#900000] text-[11px] font-semibold">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsCrudOpen(false);
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

      {/* Delete Confirmation Modal */}
      {confirmDeleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-xl w-[360px] overflow-hidden">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 font-bold text-xs">
              Konfirmasi Hapus Jurnal Kertas Kerja
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>
                Yakin ingin menghapus Jurnal [{confirmDeleteRow.no_bukti}] beserta rinciannya dari database Supabase?
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
        tableLabel="Jurnal Kertas Kerja"
        rows={tableRows}
        columns={[
          { header: 'No.Bukti', accessor: (r) => r.no_bukti, mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal_display, align: 'center' },
          { header: 'Kategori', accessor: (r) => r.kategori },
          { header: 'Keterangan', accessor: (r) => r.keterangan },
          { header: 'Saldo Debet', accessor: (r) => formatRupiah(r.saldo_debet), align: 'right', mono: true, bold: true },
          { header: 'Status', accessor: (r) => r.sts_post, align: 'center' },
          { header: 'Dibuat Oleh', accessor: (r) => r.dibuat_oleh, align: 'center' },
        ]}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.no_bukti,
          r.tanggal_display,
          r.kategori,
          r.keterangan,
          r.sts_post,
          r.dibuat_oleh,
        ]}
        selectedId={selectedId}
        onSelectRow={(r) => {
          setSelectedId(r.id);
          showFeedback(`Jurnal [${r.no_bukti}] dipilih`);
        }}
        onSearchSupabase={(q) => loadLiveRows({ field: 'Semua', term: q })}
        onRefreshSupabase={() => loadLiveRows({ field: 'Semua', term: '' })}
        isBusy={isBusy}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={bentukLaporan.toUpperCase()}
        subtitle={`Periode: ${periode}`}
        orientation="portrait"
        defaultPrintScope={printScopeOnOpen}
        selectedRow={selectedTableRow}
        selectedTitle="CETAK JURNAL KERTAS KERJA TERPILIH"
        selectedSubtitle={
          selectedTableRow
            ? `No.Bukti: ${selectedTableRow.no_bukti} | Kategori: ${selectedTableRow.kategori}`
            : undefined
        }
        selectedMetaLines={
          selectedTableRow
            ? [
                { label: 'No.Bukti', value: selectedTableRow.no_bukti },
                { label: 'Tanggal', value: selectedTableRow.tanggal_display },
                { label: 'Kategori', value: selectedTableRow.kategori },
                { label: 'Status Post', value: selectedTableRow.sts_post },
                { label: 'Dibuat Oleh', value: selectedTableRow.dibuat_oleh },
              ]
            : undefined
        }
        selectedColumns={[
          { header: 'No.Bukti', accessor: 'no_bukti', width: '95px' },
          { header: 'Tanggal', accessor: 'tanggal_display', align: 'center', width: '75px' },
          { header: 'Kategori', accessor: 'kategori', width: '95px' },
          { header: 'Keterangan', accessor: 'keterangan' },
          { header: 'Saldo Debet', accessor: (r) => formatMoney(r.saldo_debet), align: 'right', width: '95px' },
          { header: 'Status', accessor: 'sts_post', align: 'center', width: '65px' },
          { header: 'Dibuat Oleh', accessor: 'dibuat_oleh', align: 'center', width: '80px' },
        ]}
        selectedSummaryItems={
          selectedTableRow
            ? [
                { label: 'Saldo Debet', value: formatRupiah(selectedTableRow.saldo_debet) },
                { label: 'Status Posting', value: selectedTableRow.sts_post },
              ]
            : undefined
        }
        metaLines={[
          { label: 'Periode (mm-yyyy)', value: periode },
          { label: 'Bentuk Laporan', value: bentukLaporan },
          { label: 'Jumlah Akun / Baris', value: `${previewRows.length} Baris` },
        ]}
        columns={printColumns}
        rows={previewRows}
        summaryItems={[
          { label: 'Total Debet', value: formatRupiah(totalDebet) },
          { label: 'Total Kredit', value: formatRupiah(totalKredit) },
          { label: 'Selisih / Net Saldo', value: formatRupiah(totalDebet - totalKredit) },
        ]}
      />
    </div>
  );
};
