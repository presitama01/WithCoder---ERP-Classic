import React, { useState } from 'react';

export interface ReturPembelianItem {
  id: string;
  noBukti: string;
  tanggal: string;
  namaSupplier: string;
  nilaiRetur: string;
  keterangan: string;
  mataUang: string;
  disc: string;
  ppn: string;
  stsPrint: string;
  tglPrint: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListReturPembelianFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ListReturPembelianForm: React.FC<ListReturPembelianFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [returList, setReturList] = useState<ReturPembelianItem[]>([
    {
      id: '1',
      noBukti: '2608-RP-IMP-001',
      tanggal: '06-Aug-2026',
      namaSupplier: 'DEPO TEKNIK',
      nilaiRetur: '250,000',
      keterangan: 'Retur barang rusak sebagian',
      mataUang: 'IDR',
      disc: '0%',
      ppn: '11%',
      stsPrint: 'Printed',
      tglPrint: '06-Aug-2026',
      stsPost: 'Posted',
      tglPost: '06-Aug-2026',
      dibuatOleh: 'RETNO',
      tglCreated: '06-Aug-2026',
      diupdateOleh: '-',
      tglUpdate: '-',
    },
    {
      id: '2',
      noBukti: '2608-RP-IMP-002',
      tanggal: '06-Aug-2026',
      namaSupplier: 'ELECTROMATIC EQUIPMENT CO.,',
      nilaiRetur: '45.0',
      keterangan: 'Defective testing gauge return',
      mataUang: 'USD',
      disc: '0%',
      ppn: '11%',
      stsPrint: 'Not Yet',
      tglPrint: '-',
      stsPost: 'Posted',
      tglPost: '06-Aug-2026',
      dibuatOleh: 'RETNO',
      tglCreated: '06-Aug-2026',
      diupdateOleh: '-',
      tglUpdate: '-',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Supplier');
  const [tanggalFilter, setTanggalFilter] = useState<string>('06-Aug-2026');
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  // Add New Modal state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoBukti, setNewNoBukti] = useState<string>('2608-RP-IMP-003');
  const [newTanggal, setNewTanggal] = useState<string>('06-Aug-2026');
  const [newSupplier, setNewSupplier] = useState<string>('DEPO TEKNIK');
  const [newNilaiRetur, setNewNilaiRetur] = useState<string>('150,000');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newMataUang, setNewMataUang] = useState<string>('IDR');
  const [newDisc, setNewDisc] = useState<string>('0%');
  const [newPpn, setNewPpn] = useState<string>('11%');

  if (!isOpen) return null;

  const handleAddNew = () => {
    setNewNoBukti(`2608-RP-IMP-0${returList.length + 1}`);
    setNewTanggal('06-Aug-2026');
    setNewSupplier('DEPO TEKNIK');
    setNewNilaiRetur('150,000');
    setNewKeterangan('');
    setNewMataUang('IDR');
    setNewDisc('0%');
    setNewPpn('11%');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoBukti.trim()) return;

    const newItem: ReturPembelianItem = {
      id: Date.now().toString(),
      noBukti: newNoBukti.trim().toUpperCase(),
      tanggal: newTanggal,
      namaSupplier: newSupplier.trim().toUpperCase(),
      nilaiRetur: newNilaiRetur.trim(),
      keterangan: newKeterangan.trim(),
      mataUang: newMataUang.trim(),
      disc: newDisc.trim(),
      ppn: newPpn.trim(),
      stsPrint: 'Not Yet',
      tglPrint: '-',
      stsPost: 'Posted',
      tglPost: newTanggal,
      dibuatOleh: 'RETNO',
      tglCreated: '06-Aug-2026',
      diupdateOleh: '-',
      tglUpdate: '-',
    };

    setReturList([newItem, ...returList]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus Retur Pembelian ini?')) {
      const updated = returList.filter((item) => item.id !== id);
      setReturList(updated);
      if (selectedId === id && updated.length > 0) {
        setSelectedId(updated[0].id);
      }
    }
  };

  const filteredList = returList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'No.Bukti') {
      return item.noBukti.toLowerCase().includes(term);
    } else if (searchField === 'Nama Supplier') {
      return item.namaSupplier.toLowerCase().includes(term);
    } else if (searchField === 'Keterangan') {
      return item.keterangan.toLowerCase().includes(term);
    }
    return (
      item.noBukti.toLowerCase().includes(term) ||
      item.namaSupplier.toLowerCase().includes(term) ||
      item.keterangan.toLowerCase().includes(term)
    );
  });

  const sqlQueryCode = `-- ==========================================
-- SQL Query untuk Supabase: Table "retur_pembelian"
-- Sesuai form: List Retur Pembelian
-- ==========================================

CREATE TABLE IF NOT EXISTS public.retur_pembelian (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    no_bukti VARCHAR(50) NOT NULL UNIQUE,
    tanggal VARCHAR(50) NOT NULL,
    nama_supplier VARCHAR(255) NOT NULL,
    nilai_retur VARCHAR(50) DEFAULT '0',
    keterangan TEXT,
    mata_uang VARCHAR(10) DEFAULT 'IDR',
    disc VARCHAR(20) DEFAULT '0%',
    ppn VARCHAR(20) DEFAULT '11%',
    sts_print VARCHAR(20) DEFAULT 'Not Yet',
    tgl_print VARCHAR(50) DEFAULT '-',
    sts_post VARCHAR(20) DEFAULT 'Posted',
    tgl_post VARCHAR(50),
    dibuat_oleh VARCHAR(100),
    tgl_created VARCHAR(50),
    diupdate_oleh VARCHAR(100),
    tgl_update VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_retur_pembelian_no_bukti ON public.retur_pembelian(no_bukti);
CREATE INDEX IF NOT EXISTS idx_retur_pembelian_supplier ON public.retur_pembelian(nama_supplier);

-- Enable RLS
ALTER TABLE public.retur_pembelian ENABLE ROW LEVEL SECURITY;
`;

  return (
    <div
      id="list-retur-pembelian-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner */}
        <div className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]">
          <div className="flex items-center space-x-3">
            <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
              List Retur Pembelian Barang
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-2 py-0.5 bg-[#2B579A] text-white rounded text-[11px] font-medium hover:bg-[#1F4E79] border border-white/40 flex items-center gap-1 shadow-sm cursor-pointer"
              title="Lihat SQL Query Supabase"
            >
              <span>Supabase SQL</span>
            </button>
            <button
              type="button"
              title="Tampilan Tabel"
              className="w-[24px] h-[22px] bg-[#1F4E79] border border-white/80 rounded-[1px] flex items-center justify-center p-[2px] hover:brightness-110 cursor-pointer"
            >
              <div className="w-full h-full border border-white/60 grid grid-cols-2 gap-[1px] bg-white p-[1px]">
                <div className="bg-[#2B579A] col-span-2 h-[3px]" />
                <div className="bg-[#E7EFF9] h-[4px]" />
                <div className="bg-[#E7EFF9] h-[4px]" />
              </div>
            </button>
            <button
              type="button"
              title="Export Excel"
              className="w-[24px] h-[22px] bg-[#107C41] border border-white/80 rounded-[1px] flex items-center justify-center text-white font-bold text-[10px] hover:brightness-110 cursor-pointer"
            >
              X
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-[22px] h-[22px] bg-[#C75050] hover:bg-[#E81123] text-white rounded-[2px] font-bold flex items-center justify-center text-[12px] border border-white/40 cursor-pointer ml-1 shadow-xs"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* 2. Sub-toolbar with Add New & Tanggal Filter */}
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0]">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleAddNew}
              className="px-3 py-1 bg-[#E1DFDD] hover:bg-[#F3F2F1] active:bg-[#C8C6C4] border border-[#ADABA1] text-black font-semibold rounded-[2px] shadow-xs flex items-center space-x-1 cursor-pointer"
            >
              <span>Add New</span>
            </button>
            <div className="flex items-center space-x-1">
              <span className="text-gray-800 font-medium">Tanggal :</span>
              <input
                type="text"
                value={tanggalFilter}
                onChange={(e) => setTanggalFilter(e.target.value)}
                className="w-[95px] px-1.5 py-0.5 bg-white border border-[#7F9DB9] rounded-[2px] text-black text-center font-mono"
              />
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-gray-800 font-medium">Periode :</span>
              <select className="px-1 py-0.5 bg-white border border-[#7F9DB9] rounded-[2px] text-black">
                <option>08/2026 - Agustus 2026</option>
                <option>09/2026 - September 2026</option>
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-gray-800 font-medium">Lokasi :</span>
              <select className="px-1 py-0.5 bg-white border border-[#7F9DB9] rounded-[2px] text-black">
                <option>GUDANG UTAMA</option>
                <option>CABANG SURABAYA</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-700 font-medium">Active Month:</span>
            <input
              type="text"
              readOnly
              value="August 2026"
              className="w-[90px] px-1.5 py-0.5 bg-[#EFEBE7] border border-[#7F9DB9] rounded-[2px] text-center font-medium text-gray-800"
            />
          </div>
        </div>

        {/* 3. Table Container with Horizontal and Vertical Scrollbars */}
        <div className="flex-1 overflow-auto bg-white border border-[#7F9DB9] m-2 shadow-inner relative">
          <table className="w-full border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#EBE9ED] text-black font-semibold sticky top-0 z-10 border-b border-[#919B9C] select-none">
                <th className="px-2 py-1.5 text-center border-r border-[#C0C0C0] w-[45px]">No</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[130px]">No.Bukti</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tanggal</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[190px]">Nama Supplier</th>
                <th className="px-2.5 py-1.5 text-right border-r border-[#C0C0C0] min-w-[100px]">Nilai Retur</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[200px]">Keterangan</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[70px]">Mata Uang</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[60px]">Disc</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[60px]">PPN</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[80px]">Sts.Print</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Print</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[80px]">Sts.Post</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Post</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[100px]">Dibuat Oleh</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Created</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[110px]">DiUpdate Oleh</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Update</th>
                <th className="px-2 py-1.5 text-center min-w-[70px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item, index) => {
                const isSelected = selectedId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`cursor-pointer border-b border-[#E0E0E0] ${
                      isSelected
                        ? 'bg-[#316AC5] text-white'
                        : index % 2 === 0
                        ? 'bg-white hover:bg-[#F0F4F8]'
                        : 'bg-[#F9F9F8] hover:bg-[#F0F4F8]'
                    }`}
                  >
                    <td className="px-2 py-1 text-center border-r border-[#E0E0E0] font-mono">
                      {index + 1}
                    </td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-mono font-medium">
                      {item.noBukti}
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      {item.tanggal}
                    </td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-medium">
                      {item.namaSupplier}
                    </td>
                    <td className="px-2.5 py-1 text-right border-r border-[#E0E0E0] font-mono">
                      {item.nilaiRetur}
                    </td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">
                      {item.keterangan}
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      {item.mataUang}
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      {item.disc}
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      {item.ppn}
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          item.stsPrint === 'Printed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.stsPrint}
                      </span>
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      {item.tglPrint}
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800">
                        {item.stsPost}
                      </span>
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      {item.tglPost}
                    </td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">
                      {item.dibuatOleh}
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      {item.tglCreated}
                    </td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">
                      {item.diupdateOleh}
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      {item.tglUpdate}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={18} className="text-center py-8 text-gray-500 italic">
                    Tidak ada data Retur Pembelian yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Bottom Search Bar & Record Counter */}
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-t border-[#C0C0C0]">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-800">Cari Berdasarkan:</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="px-1.5 py-0.5 bg-white border border-[#7F9DB9] rounded-[2px] text-black"
            >
              <option>Nama Supplier</option>
              <option>No.Bukti</option>
              <option>Keterangan</option>
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik kata kunci..."
              className="w-[180px] px-2 py-0.5 bg-white border border-[#7F9DB9] rounded-[2px] text-black"
            />
          </div>

          <div className="flex items-center space-x-4 text-gray-700">
            <span>Record: {filteredList.length} of {returList.length}</span>
            <span className="font-mono text-gray-500">[Active Database: Supabase Connected]</span>
          </div>
        </div>
      </div>

      {/* Add New Modal Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[480px] bg-[#ECE9D8] border-2 border-[#0055EA] rounded-[3px] shadow-[4px_4px_12px_rgba(0,0,0,0.4)] flex flex-col font-sans text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between h-[28px] bg-gradient-to-r from-[#0055EA] to-[#1E90FF] text-white px-2 font-bold">
              <span>Form Input Retur Pembelian Barang</span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-[20px] h-[20px] bg-[#C75050] hover:bg-red-600 text-white rounded-[2px] flex items-center justify-center text-[11px] cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveNew} className="p-4 space-y-3 bg-[#ECE9D8]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-800 mb-1">No. Bukti Retur:</label>
                  <input
                    type="text"
                    value={newNoBukti}
                    onChange={(e) => setNewNoBukti(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-800 mb-1">Tanggal:</label>
                  <input
                    type="text"
                    value={newTanggal}
                    onChange={(e) => setNewTanggal(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-800 mb-1">Nama Supplier:</label>
                <input
                  type="text"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-gray-800 mb-1">Nilai Retur:</label>
                  <input
                    type="text"
                    value={newNilaiRetur}
                    onChange={(e) => setNewNilaiRetur(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] font-mono text-right"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-800 mb-1">Mata Uang:</label>
                  <select
                    value={newMataUang}
                    onChange={(e) => setNewMataUang(e.target.value)}
                    className="w-full px-1 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                  >
                    <option value="IDR">IDR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-800 mb-1">Disc / PPN:</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newDisc}
                      onChange={(e) => setNewDisc(e.target.value)}
                      className="w-1/2 px-1 py-1 bg-white border border-[#7F9DB9] rounded-[2px] text-center"
                    />
                    <input
                      type="text"
                      value={newPpn}
                      onChange={(e) => setNewPpn(e.target.value)}
                      className="w-1/2 px-1 py-1 bg-white border border-[#7F9DB9] rounded-[2px] text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-800 mb-1">Keterangan:</label>
                <textarea
                  value={newKeterangan}
                  onChange={(e) => setNewKeterangan(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                  placeholder="Catatan atau keterangan retur..."
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#D4D0C8]">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#E1DFDD] hover:bg-[#F3F2F1] active:bg-[#C8C6C4] border border-[#ADABA1] text-black font-semibold rounded-[2px] shadow-xs cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-1.5 bg-[#E1DFDD] hover:bg-[#F3F2F1] active:bg-[#C8C6C4] border border-[#ADABA1] text-black rounded-[2px] shadow-xs cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supabase SQL Code Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[640px] bg-[#ECE9D8] border-2 border-[#1E90FF] rounded-[3px] shadow-[4px_4px_16px_rgba(0,0,0,0.5)] flex flex-col font-sans text-xs">
            <div className="flex items-center justify-between h-[28px] bg-black text-white px-3 font-bold">
              <span>Supabase SQL Query - List Retur Pembelian</span>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="w-[20px] h-[20px] bg-[#C75050] hover:bg-red-600 text-white rounded-[2px] flex items-center justify-center text-[11px] cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-3 bg-[#ECE9D8]">
              <p className="text-gray-700">
                Salin dan jalankan script SQL berikut di SQL Editor Supabase Anda untuk membuat tabel <code className="font-mono bg-white px-1 py-0.5 border border-gray-300">retur_pembelian</code>:
              </p>
              <textarea
                readOnly
                value={sqlQueryCode}
                rows={14}
                className="w-full p-2.5 font-mono text-[11px] bg-white border border-[#7F9DB9] rounded-[2px] text-gray-800 select-all"
              />
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(sqlQueryCode);
                    alert('SQL Query berhasil disalin ke clipboard!');
                  }}
                  className="px-4 py-1.5 bg-[#2B579A] hover:bg-[#1F4E79] text-white font-medium rounded-[2px] shadow-xs cursor-pointer"
                >
                  Salin SQL Query
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-1.5 bg-[#E1DFDD] hover:bg-[#F3F2F1] border border-[#ADABA1] text-black font-semibold rounded-[2px] shadow-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
