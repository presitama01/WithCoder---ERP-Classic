import React from 'react';

interface FormModalProps {
  isOpen: boolean;
  moduleName: string;
  formTitle: string;
  onClose: () => void;
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  moduleName,
  formTitle,
  onClose,
}) => {
  if (!isOpen) return null;

  // Generate appropriate sample data based on the form
  const getColumnsAndRows = () => {
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
    if (formTitle.toLowerCase().includes('jurnal') || formTitle.toLowerCase().includes('ledger') || formTitle.toLowerCase().includes('keuangan')) {
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

    // Default generic grid
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

  const { columns, rows } = getColumnsAndRows();

  return (
    <div
      id="form-modal-backdrop"
      className="absolute inset-0 bg-black/15 flex items-center justify-center z-40 p-2 sm:p-4 overflow-auto select-none"
    >
      <div
        id="form-modal-window"
        className="w-[740px] max-w-full max-h-[92vh] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans flex flex-col overflow-hidden"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[12px] font-bold min-w-fit">
          <div className="flex items-center space-x-1.5">
            <span className="w-[12px] h-[12px] bg-white/20 border border-white/50 inline-block" />
            <span>
              {moduleName} ~ {formTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Tutup Form"
            className="w-[18px] h-[16px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[10px] font-bold hover:bg-red-500 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Action Toolbar */}
        <div className="flex items-center space-x-1 p-1.5 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] overflow-x-auto min-w-max">
          <button
            type="button"
            className="px-2.5 py-0.5 bg-[#ECE9D8] border border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:shadow-inner hover:bg-[#F2EFE2] cursor-pointer"
          >
            + Tambah
          </button>
          <button
            type="button"
            className="px-2.5 py-0.5 bg-[#ECE9D8] border border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:shadow-inner hover:bg-[#F2EFE2] cursor-pointer"
          >
            ✎ Edit
          </button>
          <button
            type="button"
            className="px-2.5 py-0.5 bg-[#ECE9D8] border border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:shadow-inner hover:bg-[#F2EFE2] cursor-pointer"
          >
            ✕ Hapus
          </button>
          <div className="w-[1px] h-[16px] bg-[#ACA899] mx-1" />
          <button
            type="button"
            className="px-2.5 py-0.5 bg-[#ECE9D8] border border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:shadow-inner hover:bg-[#F2EFE2] cursor-pointer"
          >
            💾 Simpan
          </button>
          <button
            type="button"
            className="px-2.5 py-0.5 bg-[#ECE9D8] border border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:shadow-inner hover:bg-[#F2EFE2] cursor-pointer"
          >
            ⟲ Batal
          </button>
          <div className="w-[1px] h-[16px] bg-[#ACA899] mx-1" />
          <button
            type="button"
            className="px-2.5 py-0.5 bg-[#ECE9D8] border border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:shadow-inner hover:bg-[#F2EFE2] cursor-pointer"
          >
            🖨 Cetak
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-3 py-0.5 bg-[#ECE9D8] border border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:shadow-inner hover:bg-[#F2EFE2] cursor-pointer font-semibold"
          >
            Tutup
          </button>
        </div>

        {/* Search / Filter Filter bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#F4F2E8] border-b border-[#D4D0C8] text-[11px] overflow-x-auto min-w-max">
          <div className="flex items-center space-x-2">
            <span>Pencarian:</span>
            <input
              type="text"
              placeholder="Ketik kata kunci..."
              className="w-[180px] h-[20px] bg-white border border-[#7F9DB9] px-1 text-[11px] outline-none focus:border-[#316AC5]"
            />
            <button
              type="button"
              className="px-2 py-0.5 bg-[#ECE9D8] border border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px]"
            >
              Cari
            </button>
          </div>
          <span className="text-gray-600 text-[10px]">
            Menampilkan {rows.length} data rekord aktif
          </span>
        </div>

        {/* Data Table Grid */}
        <div className="p-2 overflow-auto max-h-[380px] bg-white border border-[#7F9DB9] m-2">
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
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={`border-b border-[#E0DFE3] hover:bg-[#B5D3FF] hover:text-black cursor-pointer ${
                    rIdx % 2 === 1 ? 'bg-[#F9F9F8]' : 'bg-white'
                  }`}
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-1.5 border-r border-[#ECE9D8] whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Form Status */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#ECE9D8] border-t border-[#ACA899] text-[10px] text-gray-600">
          <span>Petugas: RETNO | Cabang: 01 - OFFICE</span>
          <span>Status: Siap (F2: Cari, F5: Refresh, Esc: Tutup)</span>
        </div>
      </div>
    </div>
  );
};
