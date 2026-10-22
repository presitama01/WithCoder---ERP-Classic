import React, { useState } from 'react';

export interface SalesInquiryItem {
  id: string;
  noBukti: string;
  tanggalDo: string;
  namaCustomer: string;
  namaSales: string;
  keterangan: string;
  follow: string;
  tglFollow: string;
  noSq: string;
  tglSq: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListSalesInquiryFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ListSalesInquiryForm: React.FC<ListSalesInquiryFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [inquiryList, setInquiryList] = useState<SalesInquiryItem[]>([
    {
      id: '1',
      noBukti: '2608-SI-001',
      tanggalDo: '04-Aug-2026',
      namaCustomer: 'PT. DJABESMEN',
      namaSales: 'M. TUTUK',
      keterangan: 'MS DESTERLINA',
      follow: 'Follow',
      tglFollow: '-',
      noSq: '2608-SQ-C',
      tglSq: '05-Aug-2026',
      dibuatOleh: 'RETNO',
      tglCreated: '04-Aug-2026',
      diupdateOleh: 'RETNO',
      tglUpdate: '05-Aug-2026',
    },
    {
      id: '2',
      noBukti: '2608-SI-002',
      tanggalDo: '05-Aug-2026',
      namaCustomer: 'PT. MAKMUR JAYA',
      namaSales: 'BUDI SANTOSO',
      keterangan: 'Project tender pengadaan material',
      follow: 'Pending',
      tglFollow: '06-Aug-2026',
      noSq: '2608-SQ-D',
      tglSq: '06-Aug-2026',
      dibuatOleh: 'RETNO',
      tglCreated: '05-Aug-2026',
      diupdateOleh: '-',
      tglUpdate: '-',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [tanggalFilter, setTanggalFilter] = useState<string>('04-Aug-2026');
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  // Add New Modal state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoBukti, setNewNoBukti] = useState<string>('2608-SI-003');
  const [newTanggalDo, setNewTanggalDo] = useState<string>('04-Aug-2026');
  const [newCustomer, setNewCustomer] = useState<string>('PT. DJABESMEN');
  const [newSales, setNewSales] = useState<string>('M. TUTUK');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newFollow, setNewFollow] = useState<string>('Follow');
  const [newNoSq, setNewNoSq] = useState<string>('2608-SQ-E');
  const [newTglSq, setNewTglSq] = useState<string>('04-Aug-2026');

  if (!isOpen) return null;

  const handleAddNew = () => {
    setNewNoBukti(`2608-SI-00${inquiryList.length + 1}`);
    setNewTanggalDo('04-Aug-2026');
    setNewCustomer('PT. DJABESMEN');
    setNewSales('M. TUTUK');
    setNewKeterangan('');
    setNewFollow('Follow');
    setNewNoSq(`2608-SQ-0${inquiryList.length + 1}`);
    setNewTglSq('04-Aug-2026');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoBukti.trim()) return;

    const newItem: SalesInquiryItem = {
      id: Date.now().toString(),
      noBukti: newNoBukti.trim().toUpperCase(),
      tanggalDo: newTanggalDo,
      namaCustomer: newCustomer.trim().toUpperCase(),
      namaSales: newSales.trim().toUpperCase(),
      keterangan: newKeterangan.trim(),
      follow: newFollow.trim(),
      tglFollow: '-',
      noSq: newNoSq.trim().toUpperCase(),
      tglSq: newTglSq,
      dibuatOleh: 'RETNO',
      tglCreated: '04-Aug-2026',
      diupdateOleh: '-',
      tglUpdate: '-',
    };

    setInquiryList([newItem, ...inquiryList]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus Sales Inquiry ini?')) {
      const updated = inquiryList.filter((item) => item.id !== id);
      setInquiryList(updated);
      if (selectedId === id && updated.length > 0) {
        setSelectedId(updated[0].id);
      }
    }
  };

  const filteredList = inquiryList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'NoBukti') {
      return item.noBukti.toLowerCase().includes(term);
    } else if (searchField === 'Nama Pelanggan') {
      return item.namaCustomer.toLowerCase().includes(term);
    } else if (searchField === 'Nama Sales') {
      return item.namaSales.toLowerCase().includes(term);
    } else if (searchField === 'No.SQ') {
      return item.noSq.toLowerCase().includes(term);
    }
    return (
      item.noBukti.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.namaSales.toLowerCase().includes(term)
    );
  });

  const sqlQueryCode = `-- ==========================================
-- SQL Query untuk Supabase: Table "sales_inquiry"
-- Sesuai form: List Inquiry Penjualan (Sales Inquiry SI)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.sales_inquiry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    no_bukti VARCHAR(50) NOT NULL UNIQUE,
    tanggal_do VARCHAR(50) NOT NULL,
    nama_customer VARCHAR(255) NOT NULL,
    nama_sales VARCHAR(100),
    keterangan TEXT,
    follow VARCHAR(50),
    tgl_follow VARCHAR(50),
    no_sq VARCHAR(50),
    tgl_sq VARCHAR(50),
    dibuat_oleh VARCHAR(100),
    tgl_created VARCHAR(50),
    diupdate_oleh VARCHAR(100),
    tgl_update VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_si_no_bukti ON public.sales_inquiry(no_bukti);
CREATE INDEX IF NOT EXISTS idx_si_customer ON public.sales_inquiry(nama_customer);

-- Enable RLS
ALTER TABLE public.sales_inquiry ENABLE ROW LEVEL SECURITY;
`;

  return (
    <div
      id="list-sales-inquiry-container"
      className="absolute inset-4 z-30 flex flex-col bg-[#ECE9D8] border border-[#919191] shadow-2xl select-none overflow-hidden font-sans text-xs"
    >
      {/* 1. Black Window Header Banner */}
      <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs select-none">
        <div className="flex items-center space-x-2">
          <span>List Inquiry Penjualan</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowSqlModal(true)}
            className="px-2 py-0.5 bg-[#D4D0C8] text-black border border-white/40 rounded text-[10px] font-semibold hover:bg-white active:bg-[#B5B3A8]"
            title="Lihat Script SQL Supabase"
          >
            SQL Code
          </button>
          <button
            onClick={onClose}
            className="w-5 h-5 bg-[#C0C0C0] text-black border border-white font-bold flex items-center justify-center hover:bg-red-600 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Action Toolbar & Filter Header */}
      <div className="bg-[#ECE9D8] border-b border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddNew}
            className="px-3 py-1 bg-[#F0EEEB] border border-[#919191] rounded shadow-sm hover:bg-[#E2DECD] active:bg-[#C5C1B4] flex items-center space-x-1 font-medium"
          >
            <span className="text-green-700 font-bold">＋</span>
            <span>Add New</span>
          </button>
          <button
            onClick={() => {
              if (selectedId) handleDelete(selectedId);
            }}
            className="px-3 py-1 bg-[#F0EEEB] border border-[#919191] rounded shadow-sm hover:bg-[#E2DECD] active:bg-[#C5C1B4] flex items-center space-x-1 font-medium"
          >
            <span className="text-red-700 font-bold">🗑</span>
            <span>Delete</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className="font-semibold">Tanggal :</span>
            <input
              type="text"
              value={tanggalFilter}
              onChange={(e) => setTanggalFilter(e.target.value)}
              className="px-2 py-0.5 w-24 bg-white border border-[#7A7A7A] text-xs"
            />
            <button className="px-2 py-0.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded text-xs hover:bg-[#D4D0C8]">
              ▼
            </button>
            <button
              onClick={() => setTanggalFilter('Semua')}
              className="px-2 py-0.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded text-xs hover:bg-[#D4D0C8]"
            >
              Semua
            </button>
          </div>
          <div className="font-bold text-sm text-right px-3 py-0.5 bg-white border border-[#919191] min-w-[90px] shadow-inner">
            Rp 0
          </div>
        </div>
      </div>

      {/* 3. Main Data Table Container with Horizontal & Vertical Scrollbars */}
      <div className="flex-1 overflow-auto bg-white border border-[#7A7A7A] m-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1300px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">NoBukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal DO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Follow</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl. Follow</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No. SQ</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Dibuat Oleh</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Created</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Diupdate Oleh</th>
              <th className="px-3 py-1.5">Tgl.Update</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item, index) => {
              const isSelected = selectedId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`border-b border-[#E0E0E0] cursor-pointer text-xs ${
                    isSelected ? 'bg-[#000084] text-white' : index % 2 === 0 ? 'bg-white hover:bg-[#F2F0EB]' : 'bg-[#F9F8F5] hover:bg-[#F2F0EB]'
                  }`}
                >
                  <td className="border-r border-[#E0E0E0] px-2 py-1 text-center font-bold">
                    {isSelected ? '▶' : ''}
                  </td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noBukti}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tanggalDo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-medium">{item.namaCustomer}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.namaSales}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.follow}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglFollow}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noSq}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglSq}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.dibuatOleh}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.diupdateOleh}</td>
                  <td className="px-3 py-1">{item.tglUpdate}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={14} className="text-center py-6 text-gray-500">
                  Tidak ada data inquiry penjualan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Bottom Search Bar & Record Status */}
      <div className="bg-[#ECE9D8] border-t border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">Search :</span>
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="px-2 py-0.5 bg-white border border-[#7A7A7A] text-xs rounded"
          >
            <option value="Nama Pelanggan">Nama Pelanggan</option>
            <option value="NoBukti">NoBukti</option>
            <option value="Nama Sales">Nama Sales</option>
            <option value="No.SQ">No.SQ</option>
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari data..."
            className="px-2 py-0.5 w-64 bg-white border border-[#7A7A7A] text-xs shadow-inner"
          />
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-64 h-5 bg-[#FFFF00] border border-[#919191] shadow-inner"></div>
          <div className="font-semibold px-2 py-0.5 bg-[#ECE9D8] border border-[#919191]">
            Record {filteredList.length}
          </div>
        </div>
      </div>

      {/* Add New Modal */}
      {isAddOpen && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[500px] flex flex-col overflow-hidden">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
              <span>Tambah Sales Inquiry Baru</span>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-white hover:text-red-300 font-bold px-1.5"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNew} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No Bukti:</label>
                <input
                  type="text"
                  value={newNoBukti}
                  onChange={(e) => setNewNoBukti(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Tanggal DO:</label>
                <input
                  type="text"
                  value={newTanggalDo}
                  onChange={(e) => setNewTanggalDo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Nama Customer:</label>
                <input
                  type="text"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Nama Sales:</label>
                <input
                  type="text"
                  value={newSales}
                  onChange={(e) => setNewSales(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Keterangan:</label>
                <input
                  type="text"
                  value={newKeterangan}
                  onChange={(e) => setNewKeterangan(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Follow Status:</label>
                <input
                  type="text"
                  value={newFollow}
                  onChange={(e) => setNewFollow(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. SQ:</label>
                <input
                  type="text"
                  value={newNoSq}
                  onChange={(e) => setNewNoSq(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Tgl. SQ:</label>
                <input
                  type="text"
                  value={newTglSq}
                  onChange={(e) => setNewTglSq(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-[#D4D0C8]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-1.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded hover:bg-[#D4D0C8]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#000084] text-white border border-[#000066] rounded hover:bg-[#0000A0]"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL Code Modal */}
      {showSqlModal && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[650px] flex flex-col overflow-hidden">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
              <span>SQL Query CODE untuk Supabase (Sales Inquiry)</span>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-white hover:text-red-300 font-bold px-1.5"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-700">
                Salin kode SQL di bawah ini dan jalankan di SQL Editor Supabase Anda:
              </p>
              <textarea
                readOnly
                value={sqlQueryCode}
                className="w-full h-64 font-mono text-[11px] p-2 bg-white border border-[#7A7A7A] select-all"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sqlQueryCode);
                    alert('SQL Code berhasil disalin ke clipboard!');
                  }}
                  className="px-4 py-1.5 bg-[#000084] text-white rounded text-xs font-semibold hover:bg-[#0000A0]"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
