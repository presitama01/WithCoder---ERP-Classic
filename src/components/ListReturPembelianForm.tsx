import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleAddNew = () => {
    setEditingId(null);
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

  const handleEdit = () => {
    const item = returList.find((r) => r.id === selectedId);
    if (!item) return;
    setEditingId(item.id);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal);
    setNewSupplier(item.namaSupplier);
    setNewNilaiRetur(item.nilaiRetur);
    setNewKeterangan(item.keterangan);
    setNewMataUang(item.mataUang);
    setNewDisc(item.disc);
    setNewPpn(item.ppn);
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoBukti.trim()) return;

    if (editingId) {
      setReturList(
        returList.map((r) =>
          r.id === editingId
            ? {
                ...r,
                noBukti: newNoBukti.trim().toUpperCase(),
                tanggal: newTanggal,
                namaSupplier: newSupplier.trim().toUpperCase(),
                nilaiRetur: newNilaiRetur.trim(),
                keterangan: newKeterangan.trim(),
                mataUang: newMataUang.trim(),
                disc: newDisc.trim(),
                ppn: newPpn.trim(),
                diupdateOleh: 'RETNO',
                tglUpdate: new Date().toLocaleDateString('id-ID'),
              }
            : r
        )
      );
      showFeedback('Retur Pembelian diperbarui');
    } else {
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
      showFeedback('Retur Pembelian tersimpan');
    }
    setIsAddOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = returList.filter((item) => item.id !== id);
    setReturList(updated);
    if (selectedId === id) {
      setSelectedId(updated[0]?.id || '');
    }
    showFeedback('Retur Pembelian dihapus');
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

  return (
    <div
      id="list-retur-pembelian-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner */}
        <FormHeaderBanner
          title="List Retur Pembelian Barang"
          onClose={onClose}
          onExportExcel={() => showFeedback('Export Excel selesai')}
        />

        {/* 2. Sub-toolbar with FormActionButtons & Tanggal Filter */}
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto">
          <div className="flex items-center space-x-3">
            <FormActionButtons
              onSimpan={() => showFeedback('Data Retur Pembelian tersimpan')}
              onBaru={handleAddNew}
              onKoreksi={handleEdit}
              onHapus={() => selectedId && handleDelete(selectedId)}
              feedback={feedback}
            />
            <div className="flex items-center space-x-1">
              <span className="text-gray-800 font-medium">Tanggal :</span>
              <input
                type="text"
                value={tanggalFilter}
                onChange={(e) => setTanggalFilter(e.target.value)}
                className="w-[95px] px-1.5 py-0.5 bg-white border border-[#7F9DB9] rounded-[2px] text-black text-center font-mono"
              />
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
          </div>
        </div>
      </div>

      {/* Add New Modal Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[480px] bg-[#ECE9D8] border-2 border-[#0055EA] rounded-[3px] shadow-[4px_4px_12px_rgba(0,0,0,0.4)] flex flex-col font-sans text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between h-[28px] bg-gradient-to-r from-[#0055EA] to-[#1E90FF] text-white px-2 font-bold">
              <span>{editingId ? 'Koreksi Retur Pembelian Barang' : 'Form Input Retur Pembelian Barang'}</span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-[20px] h-[20px] bg-[#C75050] hover:bg-red-600 text-white rounded-[2px] flex items-center justify-center text-[11px] cursor-pointer"
              >
                ✕
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

    </div>
  );
};
