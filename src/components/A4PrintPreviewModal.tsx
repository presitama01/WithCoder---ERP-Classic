import React, { useEffect, useMemo, useState } from 'react';
import {
  CompanyProfileData,
  FALLBACK_COMPANY_PROFILE,
  fetchActiveCompanyProfile,
  toDisplayDMyShort,
  todayIso,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

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
}

function estimateRowLines<T>(row: T, columns: PrintColumn<T>[], isLandscape: boolean): number {
  let maxLines = 1;
  const charsPerUnit = isLandscape ? 32 : 22;
  for (const col of columns) {
    const val =
      typeof col.accessor === 'function' ? col.accessor(row, 0) : (row as any)[col.accessor];
    const str = typeof val === 'string' || typeof val === 'number' ? String(val) : '';
    if (str.length > charsPerUnit) {
      maxLines = Math.max(maxLines, Math.ceil(str.length / charsPerUnit));
    }
  }
  return Math.min(maxLines, 4);
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
  orientation: defaultOrientation = 'portrait',
  printedBy = 'RETNO',
  fileName,
}: A4PrintPreviewModalProps<T>) {
  const [company, setCompany] = useState<CompanyProfileData>(FALLBACK_COMPANY_PROFILE);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(defaultOrientation);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);

  useEffect(() => {
    setOrientation(defaultOrientation);
  }, [defaultOrientation, isOpen]);

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

  // Paginate rows cleanly onto A4 pages respecting 11pt font and 15mm margins
  const pages = useMemo(() => {
    const isLand = orientation === 'landscape';
    // Available weighted line units inside A4 15mm margins at 11pt font
    // Page 1 includes full Kop Surat + title + meta block
    const metaRowsPenalty = Math.ceil((metaLines.length || 0) / 2);
    const firstPageUnits = (isLand ? 12 : 20) - metaRowsPenalty;
    const nextPageUnits = isLand ? 17 : 27;

    if (rows.length === 0) {
      return [[] as { row: T; globalIndex: number }[]];
    }

    const result: { row: T; globalIndex: number }[][] = [];
    let currentPage: { row: T; globalIndex: number }[] = [];
    let usedUnits = 0;

    rows.forEach((row, idx) => {
      const units = estimateRowLines(row, columns, isLand);
      const limit = result.length === 0 ? Math.max(6, firstPageUnits) : nextPageUnits;

      if (currentPage.length > 0 && usedUnits + units > limit) {
        result.push(currentPage);
        currentPage = [];
        usedUnits = 0;
      }
      currentPage.push({ row, globalIndex: idx });
      usedUnits += units;
    });

    if (currentPage.length > 0) {
      result.push(currentPage);
    }

    return result;
  }, [rows, columns, orientation, metaLines.length]);

  if (!isOpen) return null;

  const totalPages = pages.length;
  const printDate = toDisplayDMyShort(todayIso());

  const handlePrint = () => {
    window.print();
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
              : String((row as any)[c.header] ?? '');
          }
          return (row as any)[c.accessor];
        },
      })),
      rows,
    });
  };

  const pageSizeClasses =
    orientation === 'landscape'
      ? 'w-[297mm] min-h-[210mm] p-[14mm]'
      : 'w-[210mm] min-h-[297mm] p-[15mm]';

  const addressLines = (company.address || company.npwp_address || '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '');

  return (
    <div
      id="a4-print-preview-overlay"
      className="fixed inset-0 z-[100] bg-black/60 flex flex-col font-sans select-text"
    >
      {/* Preview Toolbar (Hidden during actual window.print) */}
      <div className="print:hidden shrink-0 h-[44px] bg-[#1F2937] text-white px-4 flex items-center justify-between border-b border-black shadow">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-[13px] tracking-wide">
            PRINT PREVIEW (A4 — Font 11pt)
          </span>
          <span className="text-[11px] text-gray-300 border-l border-gray-600 pl-3">
            {title} • {rows.length} baris • {totalPages} halaman
            {isLoadingCompany ? ' • Memuat Kop Perusahaan...' : ''}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() =>
              setOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))
            }
            className="h-[28px] px-3 bg-[#374151] hover:bg-[#4B5563] border border-gray-500 text-white text-[11px] font-medium rounded-[2px] cursor-pointer"
          >
            Orientasi: {orientation === 'portrait' ? 'A4 Portrait' : 'A4 Landscape'}
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="h-[28px] px-3 bg-[#1E7145] hover:bg-[#248A55] border border-white/40 text-white text-[11px] font-bold rounded-[2px] cursor-pointer"
          >
            Export Excel
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="h-[28px] px-4 bg-[#0055EA] hover:bg-[#196DFF] border border-white/50 text-white text-[11px] font-bold rounded-[2px] cursor-pointer"
          >
            Print A4
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-[28px] px-3 bg-[#C00000] hover:bg-[#E81123] border border-white/50 text-white text-[11px] font-bold rounded-[2px] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Scrollable Preview Sheet Viewport */}
      <div
        id="a4-print-root"
        className="flex-1 overflow-auto bg-[#525659] py-6 px-4 flex flex-col items-center space-y-6 print:overflow-visible print:bg-white print:p-0 print:space-y-0"
      >
        {pages.map((pageRows, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === totalPages - 1;

          return (
            <div
              key={`a4-page-${pageIdx}`}
              className={`a4-page ${pageSizeClasses} bg-white text-black shadow-2xl flex flex-col justify-between box-border text-[11pt] leading-[1.35] print:shadow-none print:m-0 ${
                !isLastPage ? 'print:break-after-page' : ''
              }`}
            >
              <div>
                {/* KOP SURAT PERUSAHAAN (Full on Page 1, compact continuation header on Page 2+) */}
                <header className="mb-3">
                  {isFirstPage ? (
                    <div className="border-b-[3px] border-double border-black pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h1 className="text-[15pt] font-bold uppercase tracking-wide text-black leading-tight">
                            {company.company_name || 'NAMA PERUSAHAAN'}
                          </h1>
                          {addressLines.map((line, i) => (
                            <div key={i} className="text-[10pt] text-black leading-snug">
                              {line}
                            </div>
                          ))}
                          <div className="text-[10pt] text-black mt-0.5">
                            {[
                              company.country,
                              company.phone ? `Telp: ${company.phone}` : '',
                              company.fax ? `Fax: ${company.fax}` : '',
                              company.mail ? `Email: ${company.mail}` : '',
                            ]
                              .filter(Boolean)
                              .join('  |  ')}
                          </div>
                        </div>

                        <div className="text-right text-[9.5pt] shrink-0 pl-4">
                          {company.no_npwp && (
                            <div className="font-semibold">NPWP: {company.no_npwp}</div>
                          )}
                          <div>Kode Profil: {company.profile_code || '01'}</div>
                          <div>Tgl Cetak: {printDate}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-b border-black pb-1.5 flex items-center justify-between text-[10pt]">
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
                  <div className="mb-3">
                    <div className="text-center mb-2">
                      <h2 className="text-[13pt] font-bold uppercase underline tracking-wide">
                        {title}
                      </h2>
                      {subtitle && (
                        <div className="text-[11pt] text-gray-800 mt-0.5">{subtitle}</div>
                      )}
                    </div>

                    {metaLines.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 border border-black/40 bg-[#F9FAFB] px-3 py-1.5 text-[10.5pt]">
                        {metaLines.map((m, idx) => (
                          <div key={idx} className="flex">
                            <span className="font-semibold w-[130px] shrink-0">{m.label}</span>
                            <span className="mr-1.5">:</span>
                            <span className="truncate">{m.value || '-'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Report Data Table — Strict Font Size 11pt */}
                <table className="w-full border-collapse border border-black text-[11pt]">
                  <thead>
                    <tr className="bg-[#E5E7EB] text-black">
                      <th className="border border-black px-2 py-1 text-center w-[36px] font-bold">
                        No
                      </th>
                      {columns.map((col, colIdx) => (
                        <th
                          key={colIdx}
                          style={col.width ? { width: col.width } : undefined}
                          className={`border border-black px-2 py-1 font-bold ${
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
                          className="border border-black px-3 py-6 text-center text-gray-600 italic"
                        >
                          Tidak ada data untuk filter / periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map(({ row, globalIndex }) => (
                        <tr key={globalIndex} className="odd:bg-white even:bg-[#F9FAFB]">
                          <td className="border border-black px-2 py-1 text-center align-top">
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
                                className={`border border-black px-2 py-1 align-top ${
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
                  <div className="mt-3 flex justify-end">
                    <div className="border border-black bg-[#F3F4F6] px-3 py-1.5 min-w-[260px] text-[11pt]">
                      {summaryItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between space-x-6 font-bold">
                          <span>{item.label}</span>
                          <span className="tabular-nums">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isLastPage && showSignatures && (
                  <div className="mt-6 grid grid-cols-3 gap-8 text-center text-[11pt]">
                    <div>
                      <div>Dibuat Oleh,</div>
                      <div className="h-[54px]" />
                      <div className="border-t border-black pt-1 font-semibold">
                        ( {printedBy} )
                      </div>
                    </div>
                    <div>
                      <div>Diperiksa Oleh,</div>
                      <div className="h-[54px]" />
                      <div className="border-t border-black pt-1 font-semibold">
                        ( Supervisor )
                      </div>
                    </div>
                    <div>
                      <div>Disetujui Oleh,</div>
                      <div className="h-[54px]" />
                      <div className="border-t border-black pt-1 font-semibold">
                        ( Pimpinan )
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Page Footer */}
              <footer className="mt-4 pt-1.5 border-t border-black/50 flex items-center justify-between text-[9.5pt] text-gray-700">
                <span>
                  {company.company_name} — WithCoder ERP
                </span>
                <span>
                  Dicetak oleh: {printedBy} | {printDate} | Halaman {pageIdx + 1} dari {totalPages}
                </span>
              </footer>
            </div>
          );
        })}
      </div>
    </div>
  );
}
