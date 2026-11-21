import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, FileSpreadsheet, Printer, RotateCw, X } from 'lucide-react';
import {
  CompanyProfileData,
  FALLBACK_COMPANY_PROFILE,
  fetchActiveCompanyProfile,
  toDisplayDMyShort,
  todayIso,
} from '../lib/erpApi';
import { getCurrentUser } from '../lib/authService';
import { exportToExcel } from '../lib/exportExcel';
import { exportToPdf, extractTextFromReactNode } from '../lib/exportPdf';

export interface PrintColumn<T = any> {
  header: string;
  accessor: string | ((row: T, index: number) => React.ReactNode);
  excelAccessor?: string | ((row: T, index: number) => string | number | boolean | null | undefined);
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface PrintSummaryItem {
  label: string;
  value: string;
}

interface A4PrintPreviewModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  metaLines?: { label: string; value: string }[];
  columns: PrintColumn<T>[];
  rows: T[];
  summaryItems?: PrintSummaryItem[];
  showSignatures?: boolean;
  orientation?: 'portrait' | 'landscape';
  printedBy?: string;
  fileName?: string;
  toolbarExtra?: React.ReactNode;
}

function parseWidthPx(w?: string): number | null {
  if (!w) return null;
  const m = w.trim().match(/^(\d+(?:\.\d+)?)px$/i);
  return m ? Number(m[1]) : null;
}

function computeRecommendedOrientation<T>(
  columns: PrintColumn<T>[],
  rows: T[],
  requestedOrientation?: 'portrait' | 'landscape'
): 'portrait' | 'landscape' {
  if (requestedOrientation === 'landscape') return 'landscape';
  if (columns.length >= 6) return 'landscape';

  const explicitPxSum = columns.reduce((acc, col) => acc + (parseWidthPx(col.width) ?? 110), 30);
  if (explicitPxSum > 560) return 'landscape';

  const sampleRows = rows.slice(0, 15);
  let totalChars = columns.reduce((sum, col) => sum + col.header.length, 4);
  if (sampleRows.length > 0) {
    totalChars = columns.reduce((sum, col, colIdx) => {
      let maxLen = col.header.length;
      for (const r of sampleRows) {
        const raw =
          typeof col.accessor === 'function' ? col.accessor(r, colIdx) : (r as any)[col.accessor];
        const str = typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
        if (str.length > maxLen) maxLen = Math.min(str.length, 38);
      }
      return sum + maxLen;
    }, 4);
  }
  if (totalChars > 82) return 'landscape';

  return requestedOrientation || 'portrait';
}

function computeNormalizedColWidths<T>(
  columns: PrintColumn<T>[],
  orientation: 'portrait' | 'landscape'
): string[] {
  const usablePx = orientation === 'landscape' ? 990 : 665;
  const noColPx = 28;
  const remainingPx = usablePx - noColPx;

  const parsed = columns.map((c) => parseWidthPx(c.width));
  const flexCount = parsed.filter((p) => p === null).length;
  const fixedSum = parsed.reduce<number>((sum, p) => sum + (p ?? 0), 0);
  const flexFallback = Math.max(95, Math.floor((remainingPx - fixedSum) / Math.max(1, flexCount)));

  const rawWidths = parsed.map((p) => p ?? flexFallback);
  const totalRaw = rawWidths.reduce((a, b) => a + b, 0);

  if (totalRaw <= 0) {
    const even = `${(100 / Math.max(1, columns.length)).toFixed(2)}%`;
    return columns.map(() => even);
  }

  // Normalize to percentages within the table body (after reserving No column)
  // so every field fits inside A4 margins without overflowing horizontally
  const noPct = (noColPx / usablePx) * 100;
  const dataAreaPct = 100 - noPct;
  return rawWidths.map((w) => `${((w / totalRaw) * dataAreaPct).toFixed(2)}%`);
}

function estimateRowLines<T>(
  row: T,
  columns: PrintColumn<T>[],
  isLandscape: boolean
): number {
  let maxLines = 1;
  const totalCharBudget = isLandscape ? 148 : 96;
  const avgCharsPerCol = Math.max(12, Math.floor(totalCharBudget / Math.max(1, columns.length)));

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const val =
      typeof col.accessor === 'function' ? col.accessor(row, 0) : (row as any)[col.accessor];
    const str = typeof val === 'string' || typeof val === 'number' ? String(val) : '';
    const explicitPx = parseWidthPx(col.width);
    const colChars = explicitPx
      ? Math.max(10, Math.floor(explicitPx / 5.5))
      : Math.max(avgCharsPerCol, 18);
    if (str.length > colChars) {
      maxLines = Math.max(maxLines, Math.ceil(str.length / colChars));
    }
  }
  return Math.min(maxLines, 5);
}

export function A4PrintPreviewModal<T = any>({
  isOpen,
  onClose,
  title,
  subtitle,
  metaLines = [],
  columns,
  rows,
  summaryItems = [],
  showSignatures = true,
  orientation: requestedOrientation,
  printedBy,
  fileName,
  toolbarExtra,
}: A4PrintPreviewModalProps<T>) {
  const recommendedOrientation = useMemo(
    () => computeRecommendedOrientation(columns, rows, requestedOrientation),
    [columns, rows, requestedOrientation]
  );

  const [company, setCompany] = useState<CompanyProfileData>(FALLBACK_COMPANY_PROFILE);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(recommendedOrientation);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    setOrientation(recommendedOrientation);
  }, [recommendedOrientation, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoadingCompany(true);
    fetchActiveCompanyProfile()
      .then((profile) => {
        if (active) setCompany(profile);
      })
      .finally(() => {
        if (active) setIsLoadingCompany(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  const activeUser = useMemo(() => {
    if (printedBy && printedBy.trim()) {
      return printedBy.trim().toUpperCase();
    }
    return (getCurrentUser().username || 'ADMIN').toUpperCase();
  }, [printedBy, isOpen]);

  const normalizedColWidths = useMemo(
    () => computeNormalizedColWidths(columns, orientation),
    [columns, orientation]
  );

  // Paginate rows cleanly onto A4 pages respecting compact 8pt font and 10-12mm margins
  const pages = useMemo(() => {
    const isLand = orientation === 'landscape';
    const metaRowsPenalty = Math.ceil((metaLines.length || 0) / 2);
    const firstPageUnits = Math.max(10, (isLand ? 22 : 34) - metaRowsPenalty);
    const nextPageUnits = isLand ? 30 : 44;
    const footerSignatureReserve = (showSignatures ? 5 : 0) + (summaryItems.length > 0 ? 2 : 0);

    if (rows.length === 0) {
      return [[] as { row: T; globalIndex: number }[]];
    }

    const result: { row: T; globalIndex: number }[][] = [];
    let currentPage: { row: T; globalIndex: number }[] = [];
    let usedUnits = 0;

    rows.forEach((row, idx) => {
      const units = estimateRowLines(row, columns, isLand);
      const limit = result.length === 0 ? firstPageUnits : nextPageUnits;

      if (currentPage.length > 0 && usedUnits + units > limit) {
        result.push(currentPage);
        currentPage = [];
        usedUnits = 0;
      }
      currentPage.push({ row, globalIndex: idx });
      usedUnits += units;
    });

    if (currentPage.length > 0) {
      // If final page is almost completely full and needs summary/signatures, move last row(s) to next page
      const lastLimit = result.length === 0 ? firstPageUnits : nextPageUnits;
      if (
        footerSignatureReserve > 0 &&
        currentPage.length > 2 &&
        usedUnits > lastLimit - footerSignatureReserve
      ) {
        const overflowCount = Math.min(3, Math.max(1, Math.floor(currentPage.length / 4)));
        const carry = currentPage.splice(currentPage.length - overflowCount, overflowCount);
        result.push(currentPage);
        result.push(carry);
      } else {
        result.push(currentPage);
      }
    }

    return result;
  }, [rows, columns, orientation, metaLines.length, showSignatures, summaryItems.length]);

  if (!isOpen) return null;

  const totalPages = pages.length;
  const printDate = toDisplayDMyShort(todayIso());

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 2800);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAsPdf = () => {
    try {
      setIsSavingPdf(true);
      exportToPdf<T>({
        fileName: fileName || title,
        title,
        subtitle,
        metaLines,
        companyProfile: company,
        columns,
        rows,
        summaryItems,
        showSignatures,
        orientation,
        printedBy: activeUser,
      });
      showNotice('File PDF berhasil disimpan/diunduh.');
    } catch (err: any) {
      showNotice(`Gagal membuat PDF: ${err?.message || 'Error'}`);
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleExport = () => {
    exportToExcel<T>({
      fileName: fileName || title,
      sheetTitle: title,
      subtitle,
      companyProfile: company,
      columns: columns.map((c) => ({
        header: c.header,
        align: c.align,
        accessor: (row: T, idx: number) => {
          if (c.excelAccessor) {
            return typeof c.excelAccessor === 'function'
              ? c.excelAccessor(row, idx)
              : (row as any)[c.excelAccessor];
          }
          if (typeof c.accessor === 'function') {
            const rendered = c.accessor(row, idx);
            return typeof rendered === 'string' || typeof rendered === 'number'
              ? rendered
              : extractTextFromReactNode(rendered) || String((row as any)[c.header] ?? '');
          }
          return (row as any)[c.accessor];
        },
      })),
      rows,
    });
    showNotice('File Excel berhasil diunduh.');
  };

  const pageSizeClasses =
    orientation === 'landscape'
      ? 'w-[297mm] min-h-[210mm] px-[12mm] py-[10mm]'
      : 'w-[210mm] min-h-[297mm] px-[12mm] py-[12mm]';

  const addressLines = (company.address || company.npwp_address || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const portalTarget =
    (typeof document !== 'undefined' &&
      (document.getElementById('desktop-root') || document.body)) ||
    null;

  const modalContent = (
    <div
      id="a4-print-preview-overlay"
      className="fixed inset-0 z-[99999] bg-black/65 flex flex-col font-sans select-text"
    >
      {/* Dynamic @page orientation matching current A4 Portrait / Landscape mode */}
      <style>{`@media print { @page { size: A4 ${orientation}; margin: 10mm; } }`}</style>

      {/* Preview Toolbar (Pinned top above MDI chrome, hidden during window.print) */}
      <div className="print:hidden shrink-0 min-h-[44px] bg-[#1F2937] text-white px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-black shadow-md">
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className="font-bold text-[12px] tracking-wide shrink-0">
            PRINT PREVIEW (A4 {orientation === 'landscape' ? 'Landscape' : 'Portrait'})
          </span>
          <span className="text-[10.5px] text-gray-300 border-l border-gray-600 pl-2.5 truncate">
            {title} • {rows.length} baris • {totalPages} halaman • User: {activeUser}
            {isLoadingCompany ? ' • Memuat Kop...' : ''}
          </span>
          {actionNotice && (
            <span className="text-[10.5px] font-semibold bg-[#065F46] text-[#D1FAE5] px-2 py-0.5 rounded-[2px] border border-[#34D399]/50 shrink-0">
              {actionNotice}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {toolbarExtra}
          <button
            type="button"
            onClick={() =>
              setOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))
            }
            title="Ubah Orientasi Kertas (Portrait / Landscape)"
            className="h-[28px] px-2.5 bg-[#374151] hover:bg-[#4B5563] border border-gray-500 text-white text-[11px] font-medium rounded-[2px] flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{orientation === 'portrait' ? 'Portrait' : 'Landscape'}</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            title="Simpan / Download sebagai Excel (.xls)"
            className="h-[28px] px-2.5 bg-[#1E7145] hover:bg-[#248A55] border border-white/40 text-white text-[11px] font-bold rounded-[2px] flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAsPdf}
            disabled={isSavingPdf}
            title="Simpan / Download sebagai file PDF (.pdf)"
            className="h-[28px] px-3 bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-60 border border-white/50 text-white text-[11px] font-bold rounded-[2px] flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isSavingPdf ? 'Menyimpan PDF...' : 'Save As PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="Cetak langsung ke Printer (Ctrl+P)"
            className="h-[28px] px-3 bg-[#0055EA] hover:bg-[#196DFF] border border-white/60 text-white text-[11px] font-bold rounded-[2px] flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Tutup Print Preview & Kembali (Esc)"
            className="h-[28px] px-2.5 bg-[#B91C1C] hover:bg-[#DC2626] border border-white/60 text-white text-[11px] font-bold rounded-[2px] flex items-center space-x-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Scrollable Preview Sheet Viewport */}
      <div
        id="a4-print-root"
        className="flex-1 overflow-auto bg-[#525659] py-5 px-4 flex flex-col items-center space-y-5 print:overflow-visible print:bg-white print:p-0 print:space-y-0"
      >
        {pages.map((pageRows, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === totalPages - 1;

          return (
            <div
              key={`a4-page-${pageIdx}`}
              className={`a4-page ${pageSizeClasses} bg-white text-black shadow-2xl flex flex-col justify-between box-border text-[8pt] leading-[1.3] print:shadow-none print:m-0 ${
                !isLastPage ? 'print:break-after-page' : ''
              }`}
            >
              <div>
                {/* KOP SURAT PERUSAHAAN (Compact Header matching reference layout) */}
                <header className="mb-2.5">
                  {isFirstPage ? (
                    <div className="border-b-[2px] border-black pb-1.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h1 className="text-[11.5pt] font-bold uppercase tracking-tight text-black leading-[1.15]">
                            {company.company_name || 'PT. UNIMETRIKA UTAMA'}
                          </h1>
                          {addressLines.map((line, i) => (
                            <div
                              key={i}
                              className="text-[7.5pt] text-black uppercase leading-[1.3]"
                            >
                              {line}
                            </div>
                          ))}
                          <div className="text-[7.5pt] text-black leading-[1.3] mt-[1px]">
                            {[
                              company.country,
                              company.phone ? `Telp: ${company.phone}` : '',
                              company.fax ? `Fax: ${company.fax}` : '',
                              company.mail ? `Email: ${company.mail}` : '',
                            ]
                              .filter(Boolean)
                              .join(' | ')}
                          </div>
                        </div>

                        <div className="text-right text-[7.5pt] leading-[1.35] text-black shrink-0 pl-3">
                          {company.no_npwp && (
                            <div className="font-bold">NPWP: {company.no_npwp}</div>
                          )}
                          <div>Kode Profil: {company.profile_code || '01'}</div>
                          <div>Tgl Cetak: {printDate}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-b border-black pb-1 flex items-center justify-between text-[7.5pt]">
                      <span className="font-bold uppercase">
                        {company.company_name} — {title} (Lanjutan)
                      </span>
                      <span>
                        Halaman {pageIdx + 1} dari {totalPages}
                      </span>
                    </div>
                  )}
                </header>

                {/* Document Title & Metadata on First Page */}
                {isFirstPage && (
                  <div className="mb-2">
                    <div className="text-center mb-1.5">
                      <h2 className="text-[10pt] font-bold uppercase underline tracking-wide">
                        {title}
                      </h2>
                      {subtitle && (
                        <div className="text-[8pt] text-gray-800 mt-0.5">{subtitle}</div>
                      )}
                    </div>

                    {metaLines.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 border border-black/40 bg-[#F9FAFB] px-2.5 py-1 text-[7.5pt]">
                        {metaLines.map((m, idx) => (
                          <div key={idx} className="flex min-w-0">
                            <span className="font-semibold w-[115px] shrink-0">{m.label}</span>
                            <span className="mr-1">:</span>
                            <span className="truncate">{m.value || '-'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Report Data Table — Compact 8pt, all columns guaranteed to fit inside A4 width */}
                <table className="w-full max-w-full table-fixed border-collapse border border-black text-[8pt] leading-[1.25]">
                  <thead>
                    <tr className="bg-[#E5E7EB] text-black">
                      <th
                        style={{ width: orientation === 'landscape' ? '2.8%' : '4.2%' }}
                        className="border border-black px-1 py-[3px] text-center font-bold"
                      >
                        No
                      </th>
                      {columns.map((col, colIdx) => (
                        <th
                          key={colIdx}
                          style={{ width: normalizedColWidths[colIdx] }}
                          className={`border border-black px-1.5 py-[3px] font-bold break-words [overflow-wrap:anywhere] ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length + 1}
                          className="border border-black px-3 py-5 text-center text-gray-600 italic text-[8pt]"
                        >
                          Tidak ada data untuk filter / periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map(({ row, globalIndex }) => (
                        <tr key={globalIndex} className="odd:bg-white even:bg-[#F9FAFB]">
                          <td className="border border-black px-1 py-[3px] text-center align-top">
                            {globalIndex + 1}
                          </td>
                          {columns.map((col, colIdx) => {
                            const cellVal =
                              typeof col.accessor === 'function'
                                ? col.accessor(row, globalIndex)
                                : (row as any)[col.accessor];
                            return (
                              <td
                                key={colIdx}
                                className={`border border-black px-1.5 py-[3px] align-top break-words [overflow-wrap:anywhere] ${
                                  col.align === 'right'
                                    ? 'text-right tabular-nums'
                                    : col.align === 'center'
                                    ? 'text-center'
                                    : 'text-left'
                                }`}
                              >
                                {cellVal ?? ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Summary Totals & Signatures only on Final Page */}
                {isLastPage && summaryItems.length > 0 && (
                  <div className="mt-2.5 flex justify-end">
                    <div className="border border-black bg-[#F3F4F6] px-2.5 py-1 min-w-[220px] text-[8pt]">
                      {summaryItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between space-x-5 font-bold">
                          <span>{item.label}</span>
                          <span className="tabular-nums">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isLastPage && showSignatures && (
                  <div className="mt-4 grid grid-cols-3 gap-6 text-center text-[8pt]">
                    <div>
                      <div>Dibuat Oleh,</div>
                      <div className="h-[38px]" />
                      <div className="border-t border-black pt-0.5 font-semibold">
                        ( {activeUser} )
                      </div>
                    </div>
                    <div>
                      <div>Diperiksa Oleh,</div>
                      <div className="h-[38px]" />
                      <div className="border-t border-black pt-0.5 font-semibold">
                        ( Supervisor )
                      </div>
                    </div>
                    <div>
                      <div>Disetujui Oleh,</div>
                      <div className="h-[38px]" />
                      <div className="border-t border-black pt-0.5 font-semibold">
                        ( Pimpinan )
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Page Footer */}
              <footer className="mt-3 pt-1 border-t border-black/50 flex items-center justify-between text-[7.5pt] text-gray-700">
                <span>
                  {company.company_name} — WithCoder ERP
                </span>
                <span>
                  Dicetak oleh: {activeUser} | {printDate} | Halaman {pageIdx + 1} dari {totalPages}
                </span>
              </footer>
            </div>
          );
        })}
      </div>
    </div>
  );

  return portalTarget ? createPortal(modalContent, portalTarget) : modalContent;
}
