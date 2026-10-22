import React, { useState } from 'react';

export interface PenerimaanGiroItem {
  id: string;
  no: number;
  idCustomer: string;
  customer: string;
  noCekGiro: string;
  bank: string;
  due: string;
  amountPaid: number;
  keterangan: string;
}

interface PendaftaranPenerimaanGiroFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PendaftaranPenerimaanGiroForm: React.FC<PendaftaranPenerimaanGiroFormProps> = ({ isOpen, onClose }) => {
  const [giroList, setGiroList] = useState<PenerimaanGiroItem[]>([
    {
      id: '1',
      no: 1,
      idCustomer: 'CUS01',
      customer: 'TOKO BERKAH JAYA',
      noCekGiro: 'BG-554120',
      bank: 'BCA KCP MANGGA DUA',
      due: '2026-11-10',
      amountPaid: 12500000,
      keterangan: 'Penerimaan Giro Pelunasan Faktur #INV-001',
    },
    {
      id: '2',
      no: 2,
      idCustomer: 'CUS02',
      customer: 'CV. SURYA ABADI',
      noCekGiro: 'CH-882310',
      bank: 'MANDIRI CABANG UTAMA',
      due: '2026-11-25',
      amountPaid: 7500000,
      keterangan: 'Pembayaran Piutang Termin 2',
    },
    {
      id: '3',
      no: 3,
      idCustomer: 'CUS03',
      customer: 'PT. MAJU MUNDUR SEJAHTERA',
      noCekGiro: 'BG-901234',
      bank: 'BNI KCP INDUSTRI',
      due: '2026-12-05',
      amountPaid: 20000000,
      keterangan: 'Giro Mundur Order Barang Elektronik',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [noBukti, setNoBukti] = useState<string>('GIRO00001');
  const [tanggal, setTanggal] = useState<string>('2017-07-13');

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newIdCustomer, setNewIdCustomer] = useState<string>('CUS04');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newNoCekGiro, setNewNoCekGiro] = useState<string>('');
  const [newBank, setNewBank] = useState<string>('');
  const [newDue, setNewDue] = useState<string>('');
  const [newAmountPaid, setNewAmountPaid] = useState<string>('0');
  const [newKeterangan, setNewKeterangan] = useState<string>('');

  if (!isOpen) return null;

  const handleAddNew = () => {
    setNewIdCustomer(`CUS0${giroList.length + 1}`);
    setNewCustomer('');
    setNewNoCekGiro('');
    setNewBank('');
    setNewDue('');
    setNewAmountPaid('0');
    setNewKeterangan('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.trim() || !newNoCekGiro.trim()) return;

    const newItem: PenerimaanGiroItem = {
      id: Date.now().toString(),
      no: giroList.length + 1,
      idCustomer: newIdCustomer.trim().toUpperCase(),
      customer: newCustomer.trim().toUpperCase(),
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
    if (confirm('Apakah Anda yakin ingin menghapus data penerimaan giro ini?')) {
      const updated = giroList.filter((item) => item.id !== id);
      const reindexed = updated.map((item, idx) => ({ ...item, no: idx + 1 }));
      setGiroList(reindexed);
      if (selectedId === id && reindexed.length > 0) {
        setSelectedId(reindexed[0].id);
      }
    }
  };

  const filteredList = giroList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.customer.toLowerCase().includes(term) ||
      item.noCekGiro.toLowerCase().includes(term) ||
      item.bank.toLowerCase().includes(term) ||
      item.idCustomer.toLowerCase().includes(term)
    );
  });

  const sqlQueryCode = `-- ==========================================
-- SQL Query untuk Supabase: Table "pendaftaran_penerimaan_giro"
-- Sesuai form: Pendaftaran Penerimaan Giro (Penjualan -> Input Daftar Giro)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.pendaftaran_penerimaan_giro (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    no INTEGER NOT NULL,
    id_customer VARCHAR(50) NOT NULL,
    customer VARCHAR(255) NOT NULL,
    no_cek_giro VARCHAR(100) NOT NULL,
    bank VARCHAR(100) NOT NULL,
    due DATE NOT NULL,
    amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_penerimaan_giro_customer ON public.pendaftaran_penerimaan_giro(customer);
CREATE INDEX IF NOT EXISTS idx_penerimaan_giro_no_cek ON public.pendaftaran_penerimaan_giro(no_cek_giro);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pendaftaran_penerimaan_giro ENABLE ROW LEVEL SECURITY;

-- Policy akses terbuka untuk pengembangan
CREATE POLICY "Enable all access for authenticated users" ON public.pendaftaran_penerimaan_giro
    FOR ALL USING (true) WITH CHECK (true);
`;

  return (
    <div
      id="pendaftaran-penerimaan-giro-form"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Window Header (Black Banner) */}
        <div className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]">
          <div className="flex items-center space-x-2">
            <span className="text-[15px] font-bold tracking-tight text-white drop-shadow">
              I-Software - PENDAFTARAN PENERIMAAN GIRO
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

        {/* 2. Top Header Fields (No.Bukti & Tanggal) */}
        <div className="shrink-0 bg-[#ECE9D8] border-b border-[#ACA899] px-3 py-2 flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-black w-[65px]">No.Bukti :</span>
            <input
              type="text"
              value={noBukti}
              onChange={(e) => setNoBukti(e.target.value)}
              className="px-2 py-0.5 bg-white border border-[#7F9DB9] rounded-[1px] text-black font-mono font-bold w-[120px]"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-black">Tanggal :</span>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="px-2 py-0.5 bg-white border border-[#7F9DB9] rounded-[1px] text-black font-mono w-[130px]"
            />
          </div>
          <div className="flex-1" />
          <div className="flex items-center space-x-1 px-2">
            <span className="text-gray-700">Cari:</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Customer / No Cek / Bank..."
              className="px-2 py-0.5 bg-white border border-[#7F9DB9] rounded-[1px] text-black text-xs w-[180px] focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* 3. Toolbar / Action Ribbon */}
        <div className="shrink-0 h-[38px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-2 space-x-1">
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-green-700 font-bold text-sm">＋</span>
            <span className="text-black font-semibold">Add New</span>
          </button>
          <button
            onClick={() => {
              const item = giroList.find((g) => g.id === selectedId);
              if (item) alert(`Cetak Giro Penerimaan: ${item.noCekGiro} - ${item.customer}`);
              else alert('Pilih baris terlebih dahulu.');
            }}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-blue-700 font-bold">🖨</span>
            <span className="text-black">Print</span>
          </button>
          <button
            onClick={() => {
              const item = giroList.find((g) => g.id === selectedId);
              if (item) alert(`Update Giro Penerimaan: ${item.noCekGiro}`);
              else alert('Pilih baris terlebih dahulu.');
            }}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-blue-700 font-bold">✎</span>
            <span className="text-black">Update</span>
          </button>
          <button
            onClick={() => {
              const term = prompt('Cari data giro customer / no cek:');
              if (term !== null) setSearchTerm(term);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-purple-700 font-bold">🔍</span>
            <span className="text-black">Find</span>
          </button>
          <button
            onClick={() => {
              if (selectedId) handleDelete(selectedId);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-red-700 font-bold">🗑</span>
            <span className="text-black">Delete</span>
          </button>

          <div className="h-[20px] w-[1px] bg-[#ACA899] mx-1" />

          <button
            onClick={onClose}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-red-800 font-bold">✖</span>
            <span className="text-black">Close</span>
          </button>
        </div>

        {/* 4. Main Content Container with Horizontal and Vertical Scrollbars */}
        <div className="flex-1 overflow-auto p-3 bg-[#D4D0C8] relative">
          <div className="bg-white border border-[#7F9DB9] shadow-sm min-w-[980px] flex flex-col h-full">
            <div className="bg-[#EBEBE4] px-3 py-1 border-b border-[#7F9DB9] font-bold text-center text-gray-800 text-[11px]">
              GIRO / CEK / CASH DETAIL
            </div>

            {/* Table Header & Scrollable Body */}
            <div className="overflow-auto flex-1 max-h-[calc(100vh-210px)]">
              <table className="w-full border-collapse text-left select-none text-[11px]">
                <thead>
                  <tr className="bg-gradient-to-b from-[#F2F2F2] to-[#DFDFDF] border-b border-[#7F9DB9] text-black font-semibold sticky top-0 z-10">
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[45px] text-center">No.</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[95px]">ID Customer</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] min-w-[210px]">Customer</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[130px]">No. Cek / Giro</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[150px]">Bank</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[95px] text-center">Due</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[130px] text-right">Amount Paid</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] min-w-[220px]">Keterangan</th>
                    <th className="py-1.5 px-2 w-[70px] text-center">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, index) => {
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
                          {item.idCustomer}
                        </td>
                        <td className="py-1 px-2 border-r border-gray-200 font-semibold">
                          {item.customer}
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
                          <input
                            type="checkbox"
                            onChange={() => handleDelete(item.id)}
                            className="cursor-pointer"
                            title="Centang untuk hapus"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-gray-500 italic">
                        Tidak ada data pendaftaran penerimaan giro yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer bar inside container with Total Amount Paid */}
            <div className="shrink-0 bg-[#ECE9D8] border-t border-[#7F9DB9] px-3 py-1.5 flex items-center justify-between text-[11px] text-gray-800">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => alert('Navigasi awal')}
                  className="px-2 py-0.5 bg-[#D4D0C8] border border-[#707070] rounded text-black cursor-pointer font-bold"
                >
                  &lt;&lt;
                </button>
                <span className="px-3 py-0.5 bg-white border border-[#7F9DB9] font-bold text-black uppercase">
                  GIRO IN
                </span>
                <button
                  type="button"
                  onClick={() => alert('Navigasi akhir')}
                  className="px-2 py-0.5 bg-[#D4D0C8] border border-[#707070] rounded text-black cursor-pointer font-bold"
                >
                  &gt;&gt;
                </button>
              </div>

              <div className="flex items-center space-x-2 font-bold font-mono">
                <span>Total Amount Paid :</span>
                <span className="px-3 py-0.5 bg-white border border-[#7F9DB9] text-right min-w-[140px] inline-block">
                  {filteredList
                    .reduce((sum, i) => sum + i.amountPaid, 0)
                    .toLocaleString('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      maximumFractionDigits: 0,
                    })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Add New Penerimaan Giro */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
            <div className="bg-[#ECE9D8] border-2 border-[#000000] shadow-2xl w-[520px] flex flex-col rounded-[2px] font-sans">
              <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between">
                <span className="font-bold text-sm">Tambah Pendaftaran Penerimaan Giro Baru</span>
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
                    <label className="block text-gray-800 font-semibold mb-1">ID Customer</label>
                    <input
                      type="text"
                      value={newIdCustomer}
                      onChange={(e) => setNewIdCustomer(e.target.value)}
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">No. Cek / Giro</label>
                    <input
                      type="text"
                      value={newNoCekGiro}
                      onChange={(e) => setNewNoCekGiro(e.target.value)}
                      placeholder="Cth: BG-778899"
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-800 font-semibold mb-1">Customer</label>
                  <input
                    type="text"
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    placeholder="Nama Perusahaan Customer..."
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
                    <label className="block text-gray-800 font-semibold mb-1">Due (Jatuh Tempo)</label>
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
                    placeholder="Keterangan penerimaan giro..."
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
                <span className="font-bold text-sm">Supabase SQL Query - Table: pendaftaran_penerimaan_giro</span>
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
                  Salin dan jalankan SQL Query berikut di <strong>Supabase SQL Editor</strong> untuk membuat tabel <code>pendaftaran_penerimaan_giro</code>:
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
