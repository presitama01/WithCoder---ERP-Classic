import React, { useEffect, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import {
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
  toDisplayDMyShort,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

interface LaporanKertasKerjaPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
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

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  useEffect(() => {
    if (!isOpen) return;
    try {
      const rawPreset = localStorage.getItem('withcoder_preset_kertas_kerja');
      if (rawPreset) {
        const v = JSON.parse(rawPreset);
        if (v.periode) setPeriode(v.periode);
        if (v.bentukLaporan) setBentukLaporan(v.bentukLaporan);
      }
    } catch {
      // Ignore
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBaru = () => {
    setPeriode('08-2026');
    setBentukLaporan('01 - Laporan Kertas Kerja I');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setPeriode('08-2026');
    setBentukLaporan('01 - Laporan Kertas Kerja I');
    showFeedback('Parameter dikembalikan ke default');
  };

  const handleSimpanPreset = async () => {
    try {
      localStorage.setItem(
        'withcoder_preset_kertas_kerja',
        JSON.stringify({ periode, bentukLaporan })
      );
      showFeedback('Parameter Laporan Kertas Kerja tersimpan');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    // Parse periode mm-yyyy -> prefix yyyy-mm
    const parts = periode.split('-');
    const yearMonthPrefix = parts.length === 2 ? `${parts[1]}-${parts[0]}` : '';

    // Try view first, then fallback / enrich with live tables
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

    // Fallback to jurnal_umums summary rows filtered by month
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
      const data = await fetchReportData();
      setPreviewRows(data);
      setIsPrintOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal memuat laporan: ${err.message}`);
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
        onPrint={handlePreview}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[540px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-bold text-[18px] tracking-normal text-black font-serif">
              Laporan Kertas Kerja I
            </h1>
          </div>

          <div className="border-b border-[#999999] pb-2">
            <FormActionButtons
              compact
              onSimpan={handleSimpanPreset}
              onBaru={handleBaru}
              onKoreksi={() => showFeedback('Silakan ubah parameter laporan')}
              onHapus={handleHapus}
              onPrint={handlePreview}
              isBusy={isBusy}
              feedback={feedback}
            />
          </div>

          {/* Group 1: Range */}
          <fieldset className="border border-[#999999] px-3 pt-2 pb-14 rounded-none relative">
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
      </div>

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={bentukLaporan.toUpperCase()}
        subtitle={`Periode: ${periode}`}
        orientation="portrait"
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
