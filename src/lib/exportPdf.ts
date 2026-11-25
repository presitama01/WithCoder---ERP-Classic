import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyProfileData, toDisplayDMyShort, todayIso } from './erpApi';

export interface PdfColumn<T = any> {
  header: string;
  accessor: string | ((row: T, index: number) => React.ReactNode);
  excelAccessor?: string | ((row: T, index: number) => string | number | boolean | null | undefined);
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface PdfSummaryItem {
  label: string;
  value: string;
}

export function extractTextFromReactNode(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    return node.map(extractTextFromReactNode).filter(Boolean).join(' ');
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractTextFromReactNode(props?.children);
  }
  return '';
}

function parseWidthPx(w?: string): number | null {
  if (!w) return null;
  const m = w.trim().match(/^(\d+(?:\.\d+)?)px$/i);
  return m ? Number(m[1]) : null;
}

export interface PdfExportOptions<T = any> {
  fileName: string;
  title: string;
  subtitle?: string;
  metaLines?: { label: string; value: string }[];
  companyProfile?: Partial<CompanyProfileData> | null;
  columns: PdfColumn<T>[];
  rows: T[];
  summaryItems?: PdfSummaryItem[];
  showSignatures?: boolean;
  orientation?: 'portrait' | 'landscape';
  printedBy?: string;
}

function buildPdfDocument<T = any>(options: PdfExportOptions<T>): { doc: jsPDF; safeFileName: string } {
  const {
    fileName,
    title,
    subtitle,
    metaLines = [],
    companyProfile,
    columns,
    rows,
    summaryItems = [],
    showSignatures = true,
    orientation = 'portrait',
    printedBy = 'ADMIN',
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const isPortrait = orientation === 'portrait';
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = isPortrait ? 10 : 12;
  const marginTop = isPortrait ? 10 : 12;
  const marginBottom = isPortrait ? 14 : 16;
  const usableWidth = pageWidth - marginX * 2;
  const printDate = toDisplayDMyShort(todayIso());
  const companyName = (companyProfile?.company_name || 'PT. UNIMETRIKA UTAMA').toUpperCase();
  const activeUser = (printedBy || 'ADMIN').trim().toUpperCase();

  // --- 1. Draw Kop Surat on First Page ---
  let cursorY = marginTop;
  doc.setTextColor(0, 0, 0);

  // Left block: Company Name, Address, Contact
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isPortrait ? 10.5 : 11.5);
  const leftMaxWidth = usableWidth - 52;
  const compLines = doc.splitTextToSize(companyName, leftMaxWidth);
  doc.text(compLines, marginX, cursorY);
  let leftY = cursorY + compLines.length * 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isPortrait ? 7 : 7.5);
  const rawAddressLines = (companyProfile?.address || companyProfile?.npwp_address || '')
    .split(/\r?\n/)
    .map((l) => l.trim().toUpperCase())
    .filter(Boolean);

  for (const addrLine of rawAddressLines) {
    const wrapped = doc.splitTextToSize(addrLine, leftMaxWidth);
    doc.text(wrapped, marginX, leftY);
    leftY += wrapped.length * 3.1;
  }

  const contactLine = [
    companyProfile?.country,
    companyProfile?.phone ? `Telp: ${companyProfile.phone}` : '',
    companyProfile?.fax ? `Fax: ${companyProfile.fax}` : '',
    companyProfile?.mail ? `Email: ${companyProfile.mail}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  if (contactLine) {
    const wrappedContact = doc.splitTextToSize(contactLine, leftMaxWidth);
    doc.text(wrappedContact, marginX, leftY);
    leftY += wrappedContact.length * 3.1;
  }

  // Right block: NPWP, Kode Profil, Tgl Cetak
  let rightY = cursorY;
  doc.setFontSize(isPortrait ? 7 : 7.5);
  if (companyProfile?.no_npwp) {
    doc.setFont('helvetica', 'bold');
    doc.text(`NPWP: ${companyProfile.no_npwp}`, pageWidth - marginX, rightY, { align: 'right' });
    rightY += 3.5;
  }
  doc.setFont('helvetica', 'normal');
  doc.text(`Kode Profil: ${companyProfile?.profile_code || '01'}`, pageWidth - marginX, rightY, {
    align: 'right',
  });
  rightY += 3.5;
  doc.text(`Tgl Cetak: ${printDate}`, pageWidth - marginX, rightY, { align: 'right' });
  rightY += 3.5;

  cursorY = Math.max(leftY, rightY) + 1.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 4.5;

  // --- 2. Document Title & Subtitle ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isPortrait ? 9.5 : 10);
  const titleText = (title || 'LAPORAN').toUpperCase();
  doc.text(titleText, pageWidth / 2, cursorY, { align: 'center' });
  const titleWidth = doc.getTextWidth(titleText);
  doc.setLineWidth(0.3);
  doc.line(
    pageWidth / 2 - titleWidth / 2,
    cursorY + 0.9,
    pageWidth / 2 + titleWidth / 2,
    cursorY + 0.9
  );
  cursorY += 4;

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isPortrait ? 7.5 : 8);
    doc.setTextColor(45, 45, 45);
    doc.text(subtitle, pageWidth / 2, cursorY, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    cursorY += 4;
  }

  // --- 3. Metadata Grid (if present, wraps long & multiline values cleanly) ---
  if (metaLines.length > 0) {
    const colW = usableWidth / 2;
    const labelOffset = isPortrait ? 24 : 28;
    const lineStep = 3.7;
    doc.setFontSize(isPortrait ? 7 : 7.5);

    const metaPairs: {
      fullWidth?: { label: string; lines: string[] };
      left?: { label: string; lines: string[] };
      right?: { label: string; lines: string[] };
      rowLines: number;
    }[] = [];

    let pendingLeft: { label: string; lines: string[] } | null = null;
    for (const m of metaLines) {
      const normalizedVal = (m.value || '-').replace(/\r\n/g, '\n');
      const isWide =
        /keterangan/i.test(m.label || '') ||
        normalizedVal.includes('\n') ||
        normalizedVal.length > 52;

      if (isWide) {
        if (pendingLeft) {
          metaPairs.push({ left: pendingLeft, rowLines: Math.max(pendingLeft.lines.length, 1) });
          pendingLeft = null;
        }
        const fullLines = doc.splitTextToSize(`: ${normalizedVal}`, usableWidth - labelOffset - 4);
        metaPairs.push({
          fullWidth: { label: m.label || '', lines: fullLines },
          rowLines: Math.max(fullLines.length, 1),
        });
      } else {
        const halfLines = doc.splitTextToSize(`: ${normalizedVal}`, colW - labelOffset - 3);
        if (!pendingLeft) {
          pendingLeft = { label: m.label || '', lines: halfLines };
        } else {
          metaPairs.push({
            left: pendingLeft,
            right: { label: m.label || '', lines: halfLines },
            rowLines: Math.max(pendingLeft.lines.length, halfLines.length, 1),
          });
          pendingLeft = null;
        }
      }
    }
    if (pendingLeft) {
      metaPairs.push({ left: pendingLeft, rowLines: Math.max(pendingLeft.lines.length, 1) });
    }

    const totalMetaLines = metaPairs.reduce((acc, p) => acc + p.rowLines, 0);
    const boxHeight = totalMetaLines * lineStep + 3;

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(140, 140, 140);
    doc.setLineWidth(0.2);
    doc.rect(marginX, cursorY, usableWidth, boxHeight, 'FD');

    let metaY = cursorY + 3.8;
    for (const pair of metaPairs) {
      if (pair.fullWidth) {
        doc.setFont('helvetica', 'bold');
        doc.text(pair.fullWidth.label, marginX + 2.2, metaY);
        doc.setFont('helvetica', 'normal');
        doc.text(pair.fullWidth.lines, marginX + 2.2 + labelOffset, metaY);
      } else {
        if (pair.left) {
          doc.setFont('helvetica', 'bold');
          doc.text(pair.left.label, marginX + 2.2, metaY);
          doc.setFont('helvetica', 'normal');
          doc.text(pair.left.lines, marginX + 2.2 + labelOffset, metaY);
        }
        if (pair.right) {
          doc.setFont('helvetica', 'bold');
          doc.text(pair.right.label, marginX + colW + 2.2, metaY);
          doc.setFont('helvetica', 'normal');
          doc.text(pair.right.lines, marginX + colW + 2.2 + labelOffset, metaY);
        }
      }
      metaY += pair.rowLines * lineStep;
    }

    cursorY += boxHeight + 2.5;
  }

  // --- 4. Compute Normalized Column Widths ---
  const noColMm = isPortrait ? 7.2 : 9;
  const dataAreaMm = usableWidth - noColMm;
  const parsedPx = columns.map((c) => parseWidthPx(c.width));
  const flexCount = parsedPx.filter((p) => p === null).length;
  const fixedSum = parsedPx.reduce<number>((sum, p) => sum + (p ?? 0), 0);
  const usablePx = isPortrait ? 680 : 990;
  const noColPx = isPortrait ? 24 : 28;
  const flexFallback = Math.max(
    isPortrait ? 115 : 95,
    Math.floor((usablePx - noColPx - fixedSum) / Math.max(1, flexCount))
  );
  const rawWidths = parsedPx.map((p) => p ?? flexFallback);
  const totalRaw = rawWidths.reduce((a, b) => a + b, 0) || 1;
  const colMmWidths = rawWidths.map((w) => (w / totalRaw) * dataAreaMm);

  const headRow = ['No', ...columns.map((c) => c.header)];
  const bodyRows: (string | number)[][] =
    rows.length === 0
      ? [
          [
            {
              content: 'Tidak ada data untuk filter / periode yang dipilih.',
              colSpan: columns.length + 1,
              styles: { halign: 'center', fontStyle: 'italic', textColor: [90, 90, 90] },
            } as any,
          ],
        ]
      : rows.map((row, rowIdx) => {
          const cells = columns.map((col) => {
            if (col.excelAccessor) {
              const raw =
                typeof col.excelAccessor === 'function'
                  ? col.excelAccessor(row, rowIdx)
                  : (row as any)[col.excelAccessor];
              return raw === null || raw === undefined ? '' : String(raw);
            }
            if (typeof col.accessor === 'function') {
              return extractTextFromReactNode(col.accessor(row, rowIdx));
            }
            const raw = (row as any)[col.accessor];
            return raw === null || raw === undefined ? '' : String(raw);
          });
          return [rowIdx + 1, ...cells];
        });

  const columnStyles: Record<number, any> = {
    0: { cellWidth: noColMm, halign: 'center' },
  };
  columns.forEach((col, idx) => {
    columnStyles[idx + 1] = {
      cellWidth: colMmWidths[idx],
      halign: col.align || 'left',
    };
  });

  // Top margin on continuation pages leaves room for "(Lanjutan)" header
  const continuationHeaderY = 17;
  const tableFontSize = isPortrait ? (columns.length >= 7 ? 7 : 7.3) : 7.5;

  autoTable(doc, {
    startY: cursorY,
    margin: {
      top: continuationHeaderY,
      bottom: marginBottom,
      left: marginX,
      right: marginX,
    },
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: tableFontSize,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.18,
      cellPadding: isPortrait
        ? { top: 1.2, right: 1.1, bottom: 1.2, left: 1.1 }
        : { top: 1.4, right: 1.6, bottom: 1.4, left: 1.6 },
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: [229, 231, 235],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.22,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles,
    didParseCell: (data) => {
      if (data.section === 'head') {
        if (data.column.index === 0) {
          data.cell.styles.halign = 'center';
        } else {
          const col = columns[data.column.index - 1];
          if (col?.align) data.cell.styles.halign = col.align;
        }
      }
    },
    didDrawPage: (data) => {
      // Draw continuation header on page 2+
      if (data.pageNumber > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text(`${companyName} — ${titleText} (Lanjutan)`, marginX, 12);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.25);
        doc.line(marginX, 14, pageWidth - marginX, 14);
      }
    },
  });

  // --- 5. Summary Box & Signatures on Final Page ---
  let finalY: number = (doc as any).lastAutoTable?.finalY ?? cursorY + 10;
  const neededBottomHeight =
    (summaryItems.length > 0 ? summaryItems.length * 4.5 + 8 : 0) +
    (showSignatures ? 28 : 0);

  if (neededBottomHeight > 0 && finalY + neededBottomHeight > pageHeight - marginBottom) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`${companyName} — ${titleText} (Lanjutan)`, marginX, 12);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.line(marginX, 14, pageWidth - marginX, 14);
    finalY = continuationHeaderY;
  }

  if (summaryItems.length > 0) {
    finalY += 3.5;
    const boxW = Math.min(82, usableWidth * 0.45);
    const boxX = pageWidth - marginX - boxW;
    const boxH = summaryItems.length * 4.5 + 3;

    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.rect(boxX, finalY, boxW, boxH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    summaryItems.forEach((item, idx) => {
      const rowY = finalY + 4.3 + idx * 4.5;
      doc.text(item.label, boxX + 2.5, rowY);
      doc.text(item.value, boxX + boxW - 2.5, rowY, { align: 'right' });
    });

    finalY += boxH;
  }

  if (showSignatures) {
    finalY += 7;
    const sigWidth = usableWidth / 3;
    const labels = [
      { top: 'Dibuat Oleh,', bottom: `( ${activeUser} )` },
      { top: 'Diperiksa Oleh,', bottom: '( Supervisor )' },
      { top: 'Disetujui Oleh,', bottom: '( Pimpinan )' },
    ];

    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    labels.forEach((sig, i) => {
      const centerX = marginX + sigWidth * i + sigWidth / 2;
      doc.setFont('helvetica', 'normal');
      doc.text(sig.top, centerX, finalY, { align: 'center' });
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.25);
      doc.line(centerX - 24, finalY + 13, centerX + 24, finalY + 13);
      doc.setFont('helvetica', 'bold');
      doc.text(sig.bottom, centerX, finalY + 16.8, { align: 'center' });
    });
  }

  // --- 6. Page Footer on Every Page ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 8;
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.2);
    doc.line(marginX, footerY - 3.5, pageWidth - marginX, footerY - 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    doc.text(`${companyName} — WithCoder ERP`, marginX, footerY);
    doc.text(
      `Dicetak oleh: ${activeUser} | ${printDate} | Halaman ${p} dari ${totalPages}`,
      pageWidth - marginX,
      footerY,
      { align: 'right' }
    );
  }

  const safeName = (fileName || title || 'Laporan_ERP')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_');
  return { doc, safeFileName: `${safeName}_${todayIso()}.pdf` };
}

export function exportToPdf<T = any>(options: PdfExportOptions<T>): void {
  const { doc, safeFileName } = buildPdfDocument(options);
  doc.save(safeFileName);
}

export function createPrintablePdfBlobUrl<T = any>(options: PdfExportOptions<T>): string {
  const { doc } = buildPdfDocument(options);
  doc.autoPrint();
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
