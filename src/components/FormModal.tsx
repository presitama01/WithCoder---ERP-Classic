import React, { useEffect, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { exportToExcel } from '../lib/exportExcel';
import { fetchActiveCompanyProfile } from '../lib/erpApi';

interface FormModalProps {
  isOpen: boolean;
  moduleName: string;
  formTitle: string;
  onClose: () => void;
}

const getColumnsAndRows = (formTitle: string) => {
  if (formTitle.toLowerCase().includes('barang')) {
    return {
      columns: ['Kode Barang', 'Nama Barang', 'Kategori', 'Satuan', 'Harga Beli', 'Harga Jual', 'Stock'],
      rows: [
        ['BRG-001', 'Kertas HVS A4 70gr', 'ATK & Kantor', 'Rim', 'Rp 42.000', 'Rp 48.500', '150'],
        ['BRG-002', 'Tinta Printer Black HP', 'Elektronik', 'Pcs', 'Rp 115.000', 'Rp 135.000', '42'],
        ['BRG-003', 'Stapler No. 10 Joyko', 'ATK & Kantor', 'Pcs', 'Rp 12.500', 'Rp 16.000', '85'],
        ['BRG-004', 'Flashdisk Sandisk 32GB', 'Elektronik', 'Unit', 'Rp 58.000', 'Rp 72.000', '60'],
        ['BRG-005', 'Buku Kas Kwitansi Folio', 'Buku & Form', 'Buku', 'Rp 9.000', 'Rp 12.500', '210'],
      ],
    };
  }
  if (formTitle.toLowerCase().includes('customer') || formTitle.toLowerCase().includes('piutang')) {
    return {
      columns: ['Kode Cust', 'Nama Pelanggan', 'Kota / Wilayah', 'Telepon', 'Plafon Kredit', 'Saldo Piutang', 'Status'],
      rows: [
        ['CUST-01', 'PT. Maju Bersama Abadi', 'Jakarta Pusat', '021-3849120', 'Rp 50.000.000', 'Rp 14.500.000', 'Active'],
        ['CUST-02', 'CV. Sumber Rejeki Makmur', 'Surabaya', '031-5948301', 'Rp 30.000.000', 'Rp 8.200.000', 'Active'],
        ['CUST-03', 'Toko Berkah Mandiri', 'Bandung', '022-7210948', 'Rp 20.000.000', 'Rp 3.750.000', 'Active'],
        ['CUST-04', 'PT. Sinar Jaya Gemilang', 'Semarang', '024-8491029', 'Rp 40.000.000', 'Rp 0', 'Active'],
      ],
    };
  }
  if (formTitle.toLowerCase().includes('supplier') || formTitle.toLowerCase().includes('hutang')) {
    return {
      columns: ['Kode Spl', 'Nama Pemasok', 'Alamat', 'Kontak Person', 'Termin (Hari)', 'Saldo Hutang', 'Status'],
      rows: [
        ['SPL-001', 'PT. Indotama Distribusi', 'Kawasan Industri Cikarang', 'Bpk. Hendra', '30 Hari', 'Rp 28.400.000', 'Active'],
        ['SPL-002', 'CV. Aneka Logam Perkasa', 'Rungkut, Surabaya', 'Ibu Maya', '14 Hari', 'Rp 12.000.000', 'Active'],
        ['SPL-003', 'PT. Global Kimia Nusantara', 'Gatot Subroto, Jakarta', 'Bpk. Denny', '45 Hari', 'Rp 45.300.000', 'Active'],
      ],
    };
  }
  if (
    formTitle.toLowerCase().includes('jurnal') ||
    formTitle.toLowerCase().includes('ledger') ||
    formTitle.toLowerCase().includes('keuangan')
  ) {
    return {
      columns: ['No. Transaksi', 'Tanggal', 'No. Akun', 'Keterangan Akun', 'Debet (IDR)', 'Kredit (IDR)', 'Status'],
      rows: [
        ['JU-2608001', '01-08-2026', '110-10', 'Kas Operasional', 'Rp 15.000.000', 'Rp 0', 'Posted'],
        ['JU-2608002', '01-08-2026', '111-20', 'Bank Mandiri Giro', 'Rp 0', 'Rp 15.000.000', 'Posted'],
        ['JU-2608003', '03-08-2026', '510-01', 'Beban Gaji Karyawan', 'Rp 28.500.000', 'Rp 0', 'Posted'],
        ['JU-2608004', '03-08-2026', '111-10', 'Bank BCA Giro', 'Rp 0', 'Rp 28.500.000', 'Posted'],
      ],
    };
  }

  return {
    columns: ['No.', 'Kode / ID', 'Deskripsi / Keterangan', 'Tanggal Entry', 'Nilai / Qty', 'Petugas', 'Status'],
    rows: [
      ['1', 'TRX-101', `${formTitle} - Data Rekord 01`, '01-08-2026', 'Rp 4.500.000', 'RETNO', 'Normal'],
      ['2', 'TRX-102', `${formTitle} - Data Rekord 02`, '05-08-2026', 'Rp 12.350.000', 'RETNO', 'Normal'],
      ['3', 'TRX-103', `${formTitle} - Data Rekord 03`, '12-08-2026', 'Rp 8.900.000', 'RETNO', 'Verified'],
      ['4', 'TRX-104', `${formTitle} - Data Rekord 04`, '18-08-2026', 'Rp 2.100.000', 'RETNO', 'Approved'],
    ],
  };
};

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  moduleName: _moduleName,
  formTitle,
  onClose,
}) => {
  const initialData = getColumnsAndRows(formTitle);
  const [columns, setColumns] = useState<string[]>(initialData.columns);
  const [rows, setRows] = useState<string[][]>(initialData.rows);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<string[]>([]);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  useEffect(() => {
    const nextData = getColumnsAndRows(formTitle);
    setColumns(nextData.columns);
    setRows(nextData.rows);
    setSelectedRowIdx(0);
    setSearchTerm('');
    setIsEditOpen(false);
    setEditingIdx(null);
  }, [formTitle]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleBaru = () => {
    setEditingIdx(null);
    setFormValues(columns.map((_, idx) => (idx === 0 ? `${rows.length + 1}` : '')));
    setIsEditOpen(true);
  };

  const handleKoreksi = () => {
    const targetRow = rows[selectedRowIdx];
    if (!targetRow) return;
    setEditingIdx(selectedRowIdx);
    setFormValues([...targetRow]);
    setIsEditOpen(true);
  };

  const handleHapus = () => {
    if (rows.length === 0 || selectedRowIdx < 0 || selectedRowIdx >= rows.length) return;
    const updated = rows.filter((_, idx) => idx !== selectedRowIdx);
    setRows(updated);
    setSelectedRowIdx(Math.max(0, Math.min(selectedRowIdx, updated.length - 1)));
    showFeedback('Data rekord dihapus');
  };

  const handleSaveRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIdx !== null) {
      setRows(rows.map((r, idx) => (idx === editingIdx ? formValues : r)));
      showFeedback('Data rekord diperbarui');
    } else {
      setRows([...rows, formValues]);
      setSelectedRowIdx(rows.length);
      showFeedback('Data rekord tersimpan');
    }
    setIsEditOpen(false);
    setEditingIdx(null);
  };

  const filteredRows = rows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return row.some((cell) => cell.toLowerCase().includes(q));
    });

  return (
    <div
      id="form-modal-window"
      className="absolute inset-0 z-40 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      {/* Black Header Banner */}
      <FormHeaderBanner
        title={formTitle}
        onClose={onClose}
        onPrint={() => setIsPrintOpen(true)}
        onExportExcel={async () => {
          const company = await fetchActiveCompanyProfile();
          exportToExcel({
            fileName: formTitle.replace(/\s+/g, '_'),
            sheetTitle: formTitle.toUpperCase(),
            companyProfile: company,
            columns: columns.map((c, idx) => ({
              header: c,
              accessor: (r: string[]) => r[idx] || '',
            })),
            rows: filteredRows.map((f) => f.row),
          });
          showFeedback(`Export Excel ${formTitle} selesai`);
        }}
      />

        {/* Form Action Toolbar */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] overflow-x-auto min-w-max">
          <div className="flex items-center space-x-2">
            <FormActionButtons
              onSimpan={() => showFeedback(`Data ${formTitle} tersimpan`)}
              onBaru={handleBaru}
              onKoreksi={handleKoreksi}
              onHapus={handleHapus}
              onPrint={() => setIsPrintOpen(true)}
              feedback={feedback}
            />
          </div>
        </div>

        {/* Search / Filter bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#F4F2E8] border-b border-[#D4D0C8] text-[11px] overflow-x-auto min-w-max">
          <div className="flex items-center space-x-2">
            <span>Pencarian:</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik kata kunci..."
              className="w-[180px] h-[20px] bg-white border border-[#7F9DB9] px-1 text-[11px] outline-none focus:border-[#316AC5]"
            />
          </div>
          <span className="text-gray-600 text-[10px]">
            Menampilkan {filteredRows.length} data rekord aktif
          </span>
        </div>

        {/* Data Table Grid */}
        <div className="flex-1 p-2 overflow-auto bg-white border border-[#7F9DB9] m-2">
          <table className="min-w-[620px] w-full text-[11px] text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="p-1.5 font-bold border-r border-[#D4D0C8] shadow-[inset_0_-1px_0_#808080] whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ row, idx: originalIdx }) => {
                const isSelected = selectedRowIdx === originalIdx;
                return (
                  <tr
                    key={originalIdx}
                    onClick={() => setSelectedRowIdx(originalIdx)}
                    className={`border-b border-[#E0DFE3] cursor-pointer ${
                      isSelected
                        ? 'bg-[#316AC5] text-white'
                        : originalIdx % 2 === 1
                        ? 'bg-[#F9F9F8] hover:bg-[#B5D3FF]'
                        : 'bg-white hover:bg-[#B5D3FF]'
                    }`}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-1.5 border-r border-[#ECE9D8] whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="p-4 text-center text-gray-500">
                    Tidak ada data rekord ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Form Status */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#ECE9D8] border-t border-[#ACA899] text-[10px] text-gray-600">
          <span>Petugas: RETNO | Cabang: 01 - OFFICE</span>
          <span>Status: Siap (F2: Cari, F5: Refresh, Esc: Tutup)</span>
        </div>

        {/* Add / Edit Row Modal */}
        {isEditOpen && (
          <div className="absolute inset-0 bg-black/35 z-50 flex items-center justify-center p-4">
            <div className="bg-[#ECE9D8] border-2 border-[#0A246A] shadow-2xl w-[420px] flex flex-col overflow-hidden">
              <div className="bg-[#0A246A] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
                <span>{editingIdx !== null ? `Koreksi ${formTitle}` : `Tambah ${formTitle}`}</span>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="text-white hover:text-red-300 font-bold px-1.5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveRow} className="p-3 space-y-2 text-[11px]">
                {columns.map((col, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                    <label className="font-semibold text-black">{col}:</label>
                    <input
                      type="text"
                      value={formValues[idx] || ''}
                      onChange={(e) => {
                        const next = [...formValues];
                        next[idx] = e.target.value;
                        setFormValues(next);
                      }}
                      className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] outline-none"
                    />
                  </div>
                ))}
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#ACA899]">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] hover:bg-white cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#0A246A] text-white border border-[#000044] hover:brightness-110 cursor-pointer font-semibold"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <A4PrintPreviewModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title={formTitle.toUpperCase()}
          subtitle={`Total Data: ${filteredRows.length} Record`}
          columns={columns.map((c, idx) => ({
            header: c,
            accessor: (r: string[]) => r[idx] || '',
          }))}
          rows={filteredRows.map((f) => f.row)}
        />
    </div>
  );
};
