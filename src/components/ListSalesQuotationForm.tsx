import React, { useState } from 'react';

export interface SalesQuotationItem {
  id: string;
  noSq: string;
  tanggal: string;
  namaCustomer: string;
  sales: string;
  noInquiry: string;
  keterangan: string;
  amount: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListSalesQuotationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ListSalesQuotationForm: React.FC<ListSalesQuotationFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [quotationList, setQuotationList] = useState<SalesQuotationItem[]>([
    {
      id: '1',
      noSq: '2608-SQ-001',
      tanggal: '03-Aug-2026',
      namaCustomer: 'PT. STAINLESS STEEL',
      sales: 'M. TUTUK',
      noInquiry: '2607-SI-019',
      keterangan: '1. Price are Nett,',
      amount: '17,327,100.',
      dibuatOleh: 'RETNO',
      tglCreated: '03-Aug-2026',
      diupdateOleh: '-',
      tglUpdate: '-',
    },
    {
      id: '2',
      noSq: '2608-SQ-002',
      tanggal: '04-Aug-2026',
      namaCustomer: 'PT. INDOFOOD CBP SUKSES',
      sales: 'DARMASTI',
      noInquiry: '-',
      keterangan: '1. Price are Nett,',
      amount: '7,237,200.',
      dibuatOleh: 'RETNO',
      tglCreated: '04-Aug-2026',
      diupdateOleh: '-',
      tglUpdate: '-',
    },
    {
      id: '3',
      noSq: '2608-SQ-004',
      tanggal: '05-Aug-2026',
      namaCustomer: 'PT. ASTRA HONDA MOTOR',
      sales: 'DARMASTI',
      noInquiry: '-',
      keterangan: '1. Price are Nett,',
      amount: '1,359,750.',
      dibuatOleh: 'RETNO',
      tglCreated: '05-Aug-2026',
      diupdateOleh: '-',
      tglUpdate: '-',
    },
    {
      id: '4',
      noSq: '2608-SQ-003',
      tanggal: '05-Aug-2026',
      namaCustomer: 'PT. DJABESMEN',
      sales: 'M. TUTUK',
      noInquiry: '2608-SQ-001',
      keterangan: '1. Price are Nett,',
      amount: '6,410,250.',
      dibuatOleh: 'RETNO',
      tglCreated: '05-Aug-2026',
      diupdateOleh: 'RETNO',
      tglUpdate: '06-Aug-2026',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [tanggalFilter, setTanggalFilter] = useState<string>('03-Aug-2026');
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  // Add New Modal state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoSq, setNewNoSq] = useState<string>('2608-SQ-005');
  const [newTanggal, setNewTanggal] = useState<string>('05-Aug-2026');
  const [newCustomer, setNewCustomer] = useState<string>('PT. STAINLESS STEEL');
  const [newSales, setNewSales] = useState<string>('M. TUTUK');
  const [newNoInquiry, setNewNoInquiry] = useState<string>('-');
  const [newKeterangan, setNewKeterangan] = useState<string>('1. Price are Nett,');
  const [newAmount, setNewAmount] = useState<string>('5,000,000');

  if (!isOpen) return null;

  const handleAddNew = () => {
    setNewNoSq(`2608-SQ-00${quotationList.length + 1}`);
    setNewTanggal('05-Aug-2026');
    setNewCustomer('PT. STAINLESS STEEL');
    setNewSales('M. TUTUK');
    setNewNoInquiry('-');
    setNewKeterangan('1. Price are Nett,');
    setNewAmount('5,000,000');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoSq.trim()) return;

    const newItem: SalesQuotationItem = {
      id: Date.now().toString(),
      noSq: newNoSq.trim().toUpperCase(),
      tanggal: newTanggal,
      namaCustomer: newCustomer.trim().toUpperCase(),
      sales: newSales.trim().toUpperCase(),
      noInquiry: newNoInquiry.trim().toUpperCase(),
      keterangan: newKeterangan.trim(),
      amount: newAmount.trim(),
      dibuatOleh: 'RETNO',
      tglCreated: '05-Aug-2026',
      diupdateOleh: '-',
      tglUpdate: '-',
    };

    setQuotationList([newItem, ...quotationList]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus Sales Quotation ini?')) {
      const updated = quotationList.filter((item) => item.id !== id);
      setQuotationList(updated);
      if (selectedId === id && updated.length > 0) {
        setSelectedId(updated[0].id);
      }
    }
  };

  const filteredList = quotationList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'No.SQ') {
      return item.noSq.toLowerCase().includes(term);
    } else if (searchField === 'Nama Pelanggan') {
      return item.namaCustomer.toLowerCase().includes(term);
    } else if (searchField === 'Sales') {
      return item.sales.toLowerCase().includes(term);
    } else if (searchField === 'No. Inquiry') {
      return item.noInquiry.toLowerCase().includes(term);
    }
    return (
      item.noSq.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.sales.toLowerCase().includes(term)
    );
  });

  const sqlQueryCode = `-- ==========================================
-- SQL Query untuk Supabase: Table "sales_quotation"
-- Sesuai form: List Sales Quotation (SQ)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.sales_quotation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    no_sq VARCHAR(50) NOT NULL UNIQUE,
    tanggal VARCHAR(50) NOT NULL,
    nama_customer VARCHAR(255) NOT NULL,
    sales VARCHAR(100),
    no_inquiry VARCHAR(50),
    keterangan TEXT,
    amount VARCHAR(50) DEFAULT '0',
    dibuat_oleh VARCHAR(100),
    tgl_created VARCHAR(50),
    diupdate_oleh VARCHAR(100),
    tgl_update VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_sq_no_sq ON public.sales_quotation(no_sq);
CREATE INDEX IF NOT EXISTS idx_sq_customer ON public.sales_quotation(nama_customer);

-- Enable RLS
ALTER TABLE public.sales_quotation ENABLE ROW LEVEL SECURITY;
`;

  return (
    <div
      id="list-sales-quotation-container"
      className="absolute inset-4 z-30 flex flex-col bg-[#ECE9D8] border border-[#919191] shadow-2xl select-none overflow-hidden font-sans text-xs"
    >
      {/* 1. Black Window Header Banner */}
      <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs select-none">
        <div className="flex items-center space-x-2">
          <span>List Sales Quotation</span>
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
              <th className="border-r border-[#919191] px-3 py-1.5">No. SQ</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No. Inquiry</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center bg-[#E2DECD]" colSpan={2}>
                List
              </th>
              <th className="border-r border-[#919191] px-3 py-1.5">Dibuat Oleh</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Created</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Diupdate Oleh</th>
              <th className="px-3 py-1.5">Tgl.Update</th>
            </tr>
            <tr className="bg-[#EAE6D9] text-black border-b border-[#919191] text-[10px] sticky top-[27px] z-10">
              <th className="border-r border-[#919191] px-2 py-1"></th>
              <th className="border-r border-[#919191] px-3 py-1"></th>
              <th className="border-r border-[#919191] px-3 py-1"></th>
              <th className="border-r border-[#919191] px-3 py-1"></th>
              <th className="border-r border-[#919191] px-3 py-1"></th>
              <th className="border-r border-[#919191] px-3 py-1"></th>
              <th className="border-r border-[#919191] px-3 py-1">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1">Amount</th>
              <th className="border-r border-[#919191] px-3 py-1"></th>
              <th className="border-r border-[#919191] px-3 py-1"></th>
              <th className="border-r border-[#919191] px-3 py-1"></th>
              <th className="px-3 py-1"></th>
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
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noSq}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tanggal}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-medium">{item.namaCustomer}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.sales}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noInquiry}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-right">{item.amount}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.dibuatOleh}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.diupdateOleh}</td>
                  <td className="px-3 py-1">{item.tglUpdate}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-6 text-gray-500">
                  Tidak ada data sales quotation
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
            <option value="No.SQ">No.SQ</option>
            <option value="Sales">Sales</option>
            <option value="No. Inquiry">No. Inquiry</option>
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
              <span>Tambah Sales Quotation Baru</span>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-white hover:text-red-300 font-bold px-1.5"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNew} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. SQ:</label>
                <input
                  type="text"
                  value={newNoSq}
                  onChange={(e) => setNewNoSq(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Tanggal:</label>
                <input
                  type="text"
                  value={newTanggal}
                  onChange={(e) => setNewTanggal(e.target.value)}
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
                <label className="font-semibold">Sales:</label>
                <input
                  type="text"
                  value={newSales}
                  onChange={(e) => setNewSales(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. Inquiry:</label>
                <input
                  type="text"
                  value={newNoInquiry}
                  onChange={(e) => setNewNoInquiry(e.target.value)}
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
                <label className="font-semibold">Amount:</label>
                <input
                  type="text"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
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
              <span>SQL Query CODE untuk Supabase (Sales Quotation)</span>
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
