import React, { useState } from 'react';

export interface GiroItem {
  id: string;
  no: number;
  idSupplier: string;
  supplier: string;
  noCekGiro: string;
  bank: string;
  due: string;
  amountPaid: number;
  keterangan: string;
}

interface InputDaftarGiroFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InputDaftarGiroForm: React.FC<InputDaftarGiroFormProps> = ({ isOpen, onClose }) => {
  const [giroList, setGiroList] = useState<GiroItem[]>([
    {
      id: '1',
      no: 1,
      idSupplier: 'SUP01',
      supplier: 'PT. GLOBAL JAYA ABADI',
      noCekGiro: 'BG-982341',
      bank: 'BCA KCU JAKARTA',
      due: '2026-11-15',
      amountPaid: 15000000,
      keterangan: 'Pelunasan Faktur #INV-2026-001',
    },
    {
      id: '2',
      no: 2,
      idSupplier: 'SUP02',
      supplier: 'CV. MAKMUR SEJAHTERA',
      noCekGiro: 'CH-452109',
      bank: 'MANDIRI CABANG KOTA',
      due: '2026-11-20',
      amountPaid: 8500000,
      keterangan: 'Pembayaran Termin 1 Material Bangunan',
    },
    {
      id: '3',
      no: 3,
      idSupplier: 'SUP03',
      supplier: 'PT. NUSANTARA DISTRIBUSI',
      noCekGiro: 'BG-110293',
      bank: 'BNI KCP INDUSTRIAL',
      due: '2026-12-01',
      amountPaid: 25000000,
      keterangan: 'Giro Mundur Pembelian Stok Elektronik',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Add new modal state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newIdSupplier, setNewIdSupplier] = useState<string>('SUP04');
  const [newSupplier, setNewSupplier] = useState<string>('');
  const [newNoCekGiro, setNewNoCekGiro] = useState<string>('');
  const [newBank, setNewBank] = useState<string>('');
  const [newDue, setNewDue] = useState<string>('');
  const [newAmountPaid, setNewAmountPaid] = useState<string>('0');
  const [newKeterangan, setNewKeterangan] = useState<string>('');

  if (!isOpen) return null;

  const handleAddNew = () => {
    setNewIdSupplier(`SUP0${giroList.length + 1}`);
    setNewSupplier('');
    setNewNoCekGiro('');
    setNewBank('');
    setNewDue('');
    setNewAmountPaid('0');
    setNewKeterangan('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.trim() || !newNoCekGiro.trim()) return;

    const newItem: GiroItem = {
      id: Date.now().toString(),
      no: giroList.length + 1,
      idSupplier: newIdSupplier.trim().toUpperCase(),
      supplier: newSupplier.trim().toUpperCase(),
      noCekGiro: newNoCekGiro.trim().toUpperCase(),
      bank: newBank.trim().toUpperCase(),
      due: newDue || new Date().toISOString().split('T')[0],
      amountPaid: parseFloat(newAmountPaid) || 0,
      keterangan: newKeterangan.trim(),
    };

    setGiroList([...giroList, newItem]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data giro ini?')) {
      const updated = giroList.filter((item) => item.id !== id);
      // Re-index No
      const reindexed = updated.map((item, idx) => ({ ...item, no: idx + 1 }));
      setGiroList(reindexed);
      if (selectedId === id && reindexed.length > 0) {
        setSelectedId(reindexed[0].id);
      }
    }
  };

  const filteredGiroList = giroList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.supplier.toLowerCase().includes(term) ||
      item.noCekGiro.toLowerCase().includes(term) ||
      item.bank.toLowerCase().includes(term) ||
      item.idSupplier.toLowerCase().includes(term)
    );
  });

  const sqlQueryCode = `-- ==========================================
-- SQL Query untuk Supabase: Table "daftar_giro"
-- Sesuai form: Pendaftaran Penerimaan Giro
-- ==========================================

CREATE TABLE IF NOT EXISTS public.daftar_giro (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    no INTEGER NOT NULL,
    id_supplier VARCHAR(50) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    no_cek_giro VARCHAR(100) NOT NULL,
    bank VARCHAR(100) NOT NULL,
    due DATE NOT NULL,
    amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_daftar_giro_supplier ON public.daftar_giro(supplier);
CREATE INDEX IF NOT EXISTS idx_daftar_giro_no_cek ON public.daftar_giro(no_cek_giro);

-- Enable Row Level Security (RLS)
ALTER TABLE public.daftar_giro ENABLE ROW LEVEL SECURITY;

-- Policy akses terbuka untuk pengembangan (dapat disesuaikan)
CREATE POLICY "Enable all access for authenticated users" ON public.daftar_giro
    FOR ALL USING (true) WITH CHECK (true);
`;

  return (
    <div
      id="input-daftar-giro-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Window Header (Black Banner) */}
        <div className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]">
          <div className="flex items-center space-x-2">
            <span className="text-[15px] font-bold tracking-tight text-white drop-shadow">
              PEMBELIAN &gt; Input Daftar Giro (Pendaftaran Penerimaan Giro)
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              title="Lihat SQL Query Supabase"
              className="px-2 py-0.5 bg-[#2B579A] hover:bg-[#1F4E79] text-white font-semibold border border-white/80 rounded-[1px] text-[11px] cursor-pointer shadow-sm"
            >
              SQL Supabase
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-[22px] h-[22px] bg-[#c00000] hover:bg-red-700 text-white font-bold border border-white/80 rounded-[1px] flex items-center justify-center text-[12px] cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Toolbar / Action Ribbon */}
        <div className="shrink-0 h-[38px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-2 space-x-1">
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-green-700 font-bold text-sm">＋</span>
            <span className="text-black font-semibold">Baru</span>
          </button>
          <button
            onClick={() => {
              const item = giroList.find((g) => g.id === selectedId);
              if (item) alert(`Edit Giro: ${item.noCekGiro} - ${item.supplier}`);
              else alert('Pilih baris terlebih dahulu.');
            }}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-blue-700 font-bold">✎</span>
            <span className="text-black">Ubah</span>
          </button>
          <button
            onClick={() => {
              if (selectedId) handleDelete(selectedId);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-red-700 font-bold">🗑</span>
            <span className="text-black">Hapus</span>
          </button>

          <div className="h-[20px] w-[1px] bg-[#ACA899] mx-1" />

          <button
            onClick={() => setShowSqlModal(true)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-indigo-700 font-bold">📊</span>
            <span className="text-black">SQL Query</span>
          </button>

          <div className="flex-1" />

          <div className="flex items-center space-x-1 px-2">
            <span className="text-gray-700">Cari:</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Supplier / No Cek / Bank..."
              className="px-2 py-0.5 bg-white border border-[#7F9DB9] rounded-[1px] text-black text-xs w-[180px] focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* 3. Main Content Container with Horizontal and Vertical Scrollbars */}
        <div className="flex-1 overflow-auto p-3 bg-[#D4D0C8] relative">
          <div className="bg-white border border-[#7F9DB9] shadow-sm min-w-[950px] flex flex-col h-full">
            {/* Table Header & Scrollable Body */}
            <div className="overflow-auto flex-1 max-h-[calc(100vh-165px)]">
              <table className="w-full border-collapse text-left select-none text-[11px]">
                <thead>
                  <tr className="bg-gradient-to-b from-[#F2F2F2] to-[#DFDFDF] border-b border-[#7F9DB9] text-black font-semibold sticky top-0 z-10">
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[45px] text-center">No</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[90px]">Id Supplier</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] min-w-[200px]">Supplier</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[120px]">No Cek/Giro</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[150px]">Bank</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[95px] text-center">Due</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[120px] text-right">Amount Paid</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] min-w-[220px]">Keterangan</th>
                    <th className="py-1.5 px-2 w-[70px] text-center">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGiroList.map((item, index) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        onDoubleClick={() => alert(`Detail Giro: ${item.noCekGiro}`)}
                        className={`cursor-pointer border-b border-gray-200 ${
                          isSelected
                            ? 'bg-[#316AC5] text-white'
                            : index % 2 === 0
                            ? 'bg-white hover:bg-[#F0F4F8]'
                            : 'bg-[#F9FBFD] hover:bg-[#F0F4F8]'
                        }`}
                      >
                        <td className="py-1 px-2 border-r border-gray-200 text-center font-mono">
                          {item.no}
                        </td>
                        <td className="py-1 px-2 border-r border-gray-200 font-mono">
                          {item.idSupplier}
                        </td>
                        <td className="py-1 px-2 border-r border-gray-200 font-semibold">
                          {item.supplier}
                        </td>
                        <td className="py-1 px-2 border-r border-gray-200 font-mono">
                          {item.noCekGiro}
                        </td>
                        <td className="py-1 px-2 border-r border-gray-200">{item.bank}</td>
                        <td className="py-1 px-2 border-r border-gray-200 text-center font-mono">
                          {item.due}
                        </td>
                        <td className="py-1 px-2 border-r border-gray-200 text-right font-mono">
                          {item.amountPaid.toLocaleString('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="py-1 px-2 border-r border-gray-200">{item.keterangan}</td>
                        <td className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer shadow-sm"
                            title="Hapus Baris"
                          >
                            Del
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredGiroList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-gray-500 italic">
                        Tidak ada data daftar giro yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Status / Footer bar inside container */}
            <div className="shrink-0 bg-[#ECE9D8] border-t border-[#7F9DB9] px-3 py-1 flex items-center justify-between text-[11px] text-gray-700">
              <div>Total Data: {filteredGiroList.length} Giro</div>
              <div className="font-mono">
                Total Nominal:{' '}
                {filteredGiroList
                  .reduce((sum, i) => sum + i.amountPaid, 0)
                  .toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Add New Giro */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
            <div className="bg-[#ECE9D8] border-2 border-[#000000] shadow-2xl w-[520px] flex flex-col rounded-[2px] font-sans">
              <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between">
                <span className="font-bold text-sm">Tambah Daftar Giro Baru</span>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-white hover:text-red-300 font-bold px-1"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveNew} className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Id Supplier</label>
                    <input
                      type="text"
                      value={newIdSupplier}
                      onChange={(e) => setNewIdSupplier(e.target.value)}
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">No Cek / Giro</label>
                    <input
                      type="text"
                      value={newNoCekGiro}
                      onChange={(e) => setNewNoCekGiro(e.target.value)}
                      placeholder="Cth: BG-889922"
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-800 font-semibold mb-1">Nama Supplier</label>
                  <input
                    type="text"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    placeholder="Nama Perusahaan Supplier..."
                    required
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Bank</label>
                    <input
                      type="text"
                      value={newBank}
                      onChange={(e) => setNewBank(e.target.value)}
                      placeholder="Cth: BCA / Mandiri..."
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Jatuh Tempo (Due)</label>
                    <input
                      type="date"
                      value={newDue}
                      onChange={(e) => setNewDue(e.target.value)}
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-800 font-semibold mb-1">Amount Paid (Jumlah)</label>
                  <input
                    type="number"
                    value={newAmountPaid}
                    onChange={(e) => setNewAmountPaid(e.target.value)}
                    required
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono text-right"
                  />
                </div>

                <div>
                  <label className="block text-gray-800 font-semibold mb-1">Keterangan</label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    placeholder="Keterangan transaksi giro..."
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-[#ACA899]">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-1.5 bg-[#D4D0C8] hover:bg-gray-300 border border-[#707070] rounded text-black font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded font-semibold cursor-pointer shadow"
                  >
                    Simpan Giro
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal SQL Query Supabase */}
        {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
            <div className="bg-[#ECE9D8] border-2 border-[#000000] shadow-2xl w-[700px] flex flex-col rounded-[2px] font-sans">
              <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between">
                <span className="font-bold text-sm">Supabase SQL Query - Table: daftar_giro</span>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="text-white hover:text-red-300 font-bold px-1"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 flex flex-col space-y-3">
                <p className="text-gray-700 text-xs">
                  Salin dan jalankan SQL Query berikut di <strong>Supabase SQL Editor</strong> untuk membuat tabel <code>daftar_giro</code>:
                </p>
                <textarea
                  readOnly
                  value={sqlQueryCode}
                  rows={14}
                  className="w-full font-mono text-xs p-2.5 bg-gray-900 text-green-400 border border-[#7F9DB9] rounded select-all"
                />
                <div className="flex justify-between items-center pt-2 border-t border-[#ACA899]">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(sqlQueryCode);
                      alert('SQL Query berhasil disalin ke clipboard!');
                    }}
                    className="px-3 py-1 bg-[#2B579A] hover:bg-blue-800 text-white font-semibold border border-blue-900 rounded text-xs cursor-pointer shadow"
                  >
                    📋 Salin ke Clipboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSqlModal(false)}
                    className="px-4 py-1 bg-[#D4D0C8] hover:bg-gray-300 border border-[#707070] rounded text-black font-semibold text-xs cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
