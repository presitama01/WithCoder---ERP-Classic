// Client-side Excel (.xls HTML SpreadsheetML) Exporter using Blob URL (no window.open)
import { CompanyProfileData, toDisplayDMyShort, todayIso } from './erpApi';

export interface ExcelColumn<T = any> {
  header: string;
  accessor: string | ((row: T, index: number) => string | number | boolean | null | undefined);
  align?: 'left' | 'center' | 'right';
}

function escapeHtml(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportToExcel<T = any>(options: {
  fileName: string;
  sheetTitle: string;
  subtitle?: string;
  companyProfile?: Partial<CompanyProfileData> | null;
  columns: ExcelColumn<T>[];
  rows: T[];
}): void {
  const { fileName, sheetTitle, subtitle, companyProfile, columns, rows } = options;
  const companyName = companyProfile?.company_name || 'WithCoder - ERP';
  const companyAddr = [companyProfile?.address, companyProfile?.phone ? `Telp: ${companyProfile.phone}` : '']
    .filter(Boolean)
    .join(' | ');

  const headerCells = columns
    .map(
      (col) =>
        `<th style="background-color:#1E7145;color:#FFFFFF;font-weight:bold;border:1px solid #333333;padding:5px 8px;text-align:${
          col.align || 'left'
        };">${escapeHtml(col.header)}</th>`
    )
    .join('');

  const bodyRows = rows
    .map((row, idx) => {
      const cells = columns
        .map((col) => {
          const raw =
            typeof col.accessor === 'function' ? col.accessor(row, idx) : (row as any)[col.accessor];
          const text = raw === null || raw === undefined ? '' : String(raw);
          const isNumericString = col.align === 'right';
          return `<td style="border:1px solid #999999;padding:4px 8px;text-align:${
            col.align || 'left'
          };${isNumericString ? "mso-number-format:'#,##0.##';" : "mso-number-format:'\\@';"}">${escapeHtml(
            text
          )}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${escapeHtml(sheetTitle.slice(0, 31))}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body style="font-family:Arial,sans-serif;font-size:11pt;">
  <table>
    <tr><td colspan="${columns.length}" style="font-size:14pt;font-weight:bold;">${escapeHtml(companyName)}</td></tr>
    ${
      companyAddr
        ? `<tr><td colspan="${columns.length}" style="font-size:10pt;color:#444444;">${escapeHtml(
            companyAddr
          )}</td></tr>`
        : ''
    }
    <tr><td colspan="${columns.length}" style="font-size:12pt;font-weight:bold;padding-top:6px;">${escapeHtml(
      sheetTitle
    )}</td></tr>
    ${
      subtitle
        ? `<tr><td colspan="${columns.length}" style="font-size:10pt;color:#333333;">${escapeHtml(
            subtitle
          )}</td></tr>`
        : ''
    }
    <tr><td colspan="${columns.length}" style="font-size:9pt;color:#666666;">Tanggal Cetak: ${escapeHtml(
      toDisplayDMyShort(todayIso())
    )}</td></tr>
    <tr><td colspan="${columns.length}"></td></tr>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`.trim();

  const blob = new Blob(['\ufeff', html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = fileName.replace(/[^a-zA-Z0-9_-]+/g, '_');
  link.href = url;
  link.download = `${safeName}_${todayIso()}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
