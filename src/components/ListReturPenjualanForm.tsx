import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

export interface ReturPenjualanItem {
  id: string;
  noBukti: string;
  tanggal: string;
  namaCustomer: string;
  nilaiRetur: string;
  keterangan: string;
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

interface ListReturPenjualanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrintReport?: () => void;
}

export const ListReturPenjualanForm: React.FC<ListReturPenjualanFormProps> = ({
  isOpen,
  onClose,
  onOpenPrintReport,
}) => {
  const [returList, setReturList] = useState<ReturPenjualanItem[]>([
    {
      id: '1',
      noBukti: '2608-RJ-INV-001',
      tanggal: '06-Aug-2026',
      namaCustomer: 'PT. DJABESMEN',
      nilaiRetur: '350,000.',
      keterangan: 'Barang tidak sesuai spesifikasi',
      disc: '0%',
      ppn: '11%',
      stsPrint: 'Not Yet',
      tglPrint: '',
      stsPost: 'Posting',
      tglPost: '06-Aug-2026',
      dibuatOleh: 'RETNO',
      tglCreated: '06-Aug-2026',
      diupdateOleh: '',
      tglUpdate: '',
    },
    {
      id: '2',
      noBukti: '2608-RJ-INV-002',
      tanggal: '08-Aug-2026',
      namaCustomer: 'PT. MAKMUR JAYA',
      nilaiRetur: '1,200,000.',
      keterangan: 'Retur kelebihan kirim',
      disc: '0%',
      ppn: '11%',
      stsPrint: 'Not Yet',
      tglPrint: '',
      stsPost: 'Posting',
      tglPost: '08-Aug-2026',
      dibuatOleh: 'RETNO',
      tglCreated: '08-Aug-2026',
      diupdateOleh: '',
      tglUpdate: '',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [tanggalFilter, setTanggalFilter] = useState<string>('');

  // Add New / Koreksi Modal state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newNoBukti, setNewNoBukti] = useState<string>('2608-RJ-INV-003');
  const [newTanggal, setNewTanggal] = useState<string>('09-Aug-2026');
  const [newCustomer, setNewCustomer] = useState<string>('PT. DJABESMEN');
  const [newNilaiRetur, setNewNilaiRetur] = useState<string>('500,000.');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newDisc, setNewDisc] = useState<string>('0%');
  const [newPpn, setNewPpn] = useState<string>('11%');

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setNewNoBukti(`2608-RJ-INV-00${returList.length + 1}`);
    setNewTanggal('09-Aug-2026');
    setNewCustomer('PT. DJABESMEN');
    setNewNilaiRetur('500,000.');
    setNewKeterangan('');
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
    setNewCustomer(item.namaCustomer);
    setNewNilaiRetur(item.nilaiRetur);
    setNewKeterangan(item.keterangan);
    setNewDisc(item.disc);
    setNewPpn(item.ppn);
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoBukti.trim()) return;

    if (editingId) {
      setReturList(
        returList.map((item) =>
          item.id === editingId
            ? {
                ...item,
                noBukti: newNoBukti.trim().toUpperCase(),
                tanggal: newTanggal,
                namaCustomer: newCustomer.trim().toUpperCase(),
                nilaiRetur: newNilaiRetur.trim(),
                keterangan: newKeterangan.trim(),
                disc: newDisc.trim(),
                ppn: newPpn.trim(),
                diupdateOleh: 'RETNO',
                tglUpdate: newTanggal,
              }
            : item
        )
      );
      showFeedback('Retur Penjualan diperbarui');
    } else {
      const newItem: ReturPenjualanItem = {
        id: Date.now().toString(),
        noBukti: newNoBukti.trim().toUpperCase(),
        tanggal: newTanggal,
        namaCustomer: newCustomer.trim().toUpperCase(),
        nilaiRetur: newNilaiRetur.trim(),
        keterangan: newKeterangan.trim(),
        disc: newDisc.trim(),
        ppn: newPpn.trim(),
        stsPrint: 'Not Yet',
        tglPrint: '',
        stsPost: 'Posting',
        tglPost: newTanggal,
        dibuatOleh: 'RETNO',
        tglCreated: newTanggal,
        diupdateOleh: '',
        tglUpdate: '',
      };

      setReturList([newItem, ...returList]);
      setSelectedId(newItem.id);
      showFeedback('Retur Penjualan tersimpan');
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
    showFeedback('Retur Penjualan dihapus');
  };

  const filteredList = returList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Nama Pelanggan') {
      return item.namaCustomer.toLowerCase().includes(term);
    } else if (searchField === 'No.Bukti') {
      return item.noBukti.toLowerCase().includes(term);
    } else if (searchField === 'Keterangan') {
      return item.keterangan.toLowerCase().includes(term);
    }
    return (
      item.noBukti.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.keterangan.toLowerCase().includes(term)
    );
  });

  return (
    <div
      id="list-retur-penjualan-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      {/* 1. Black Window Header Banner */}
      <FormHeaderBanner
        title="List Retur Penjualan"
        onClose={onClose}
        onExportExcel={() => showFeedback('Export Excel selesai')}
      />

      {/* 2. Action Toolbar & Filter Header */}
      <div className="bg-[#ECE9D8] border-b border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs shadow-sm">
        <div className="flex items-center space-x-2">
          <FormActionButtons
            onSimpan={() => showFeedback('Data Retur Penjualan tersimpan')}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={() => selectedId && handleDelete(selectedId)}
            feedback={feedback}
          />
          {onOpenPrintReport && (
            <button
              type="button"
              onClick={onOpenPrintReport}
              className="h-[28px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] active:bg-[#DCD8C8] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1 text-[11px] font-sans text-black cursor-pointer"
              title="Buka Form Retur Penjualan Berdasarkan Faktur"
            >
              <span className="text-blue-700">🖶</span>
              <span>Retur Berdasarkan Faktur</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className="font-semibold">Tanggal :</span>
            <input
              type="text"
              value={tanggalFilter}
              onChange={(e) => setTanggalFilter(e.target.value)}
              className="px-2 py-0.5 w-24 bg-white border border-[#7A7A7A] text-xs font-mono"
            />
            <button className="px-2 py-0.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded text-xs hover:bg-[#D4D0C8]">
              ▼
            </button>
            <button
              onClick={() => setTanggalFilter('')}
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
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1400px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Bukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Nilai Retur</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center">Disc</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center">PPN</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Post</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Post</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Dibuat Oleh</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Created</th>
              <th className="border-r border-[#919191] px-3 py-1.5">DiUpdate Oleh</th>
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
                    isSelected
                      ? 'bg-[#000084] text-white'
                      : index % 2 === 0
                      ? 'bg-white hover:bg-[#F2F0EB]'
                      : 'bg-[#F9F8F5] hover:bg-[#F2F0EB]'
                  }`}
                >
                  <td className="border-r border-[#E0E0E0] px-2 py-1 text-center font-bold">
                    {isSelected ? '▶' : ''}
                  </td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noBukti}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tanggal}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-medium">{item.namaCustomer}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-right font-semibold">{item.nilaiRetur}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.disc}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.ppn}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.stsPrint}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.tglPrint || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.stsPost}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.tglPost}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.dibuatOleh}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.diupdateOleh || '-'}</td>
                  <td className="px-3 py-1">{item.tglUpdate || '-'}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={16} className="text-center py-6 text-gray-500">
                  Tidak ada data retur penjualan
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
            <option value="No.Bukti">No.Bukti</option>
            <option value="Keterangan">Keterangan</option>
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
              <span>{editingId ? 'Koreksi Retur Penjualan' : 'Tambah Retur Penjualan Baru'}</span>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-white hover:text-red-300 font-bold px-1.5"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNew} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. Bukti:</label>
                <input
                  type="text"
                  value={newNoBukti}
                  onChange={(e) => setNewNoBukti(e.target.value)}
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
                <label className="font-semibold">Nilai Retur:</label>
                <input
                  type="text"
                  value={newNilaiRetur}
                  onChange={(e) => setNewNilaiRetur(e.target.value)}
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
                <label className="font-semibold">Disc:</label>
                <input
                  type="text"
                  value={newDisc}
                  onChange={(e) => setNewDisc(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">PPN:</label>
                <input
                  type="text"
                  value={newPpn}
                  onChange={(e) => setNewPpn(e.target.value)}
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

    </div>
  );
};
