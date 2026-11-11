import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

export interface SuratJalanItem {
  id: string;
  noBukti: string;
  tanggal: string;
  namaCustomer: string;
  noSo: string;
  poNo: string;
  sales: string;
  noFaktur: string;
  keterangan: string;
  stsPrint: string;
  tglPrint: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListSuratJalanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrintReport?: () => void;
}

export const ListSuratJalanForm: React.FC<ListSuratJalanFormProps> = ({
  isOpen,
  onClose,
  onOpenPrintReport,
}) => {
  const [sjList, setSjList] = useState<SuratJalanItem[]>([
    {
      id: '1',
      noBukti: '2607-DO-INV-011',
      tanggal: '03-Aug-2026',
      namaCustomer: 'PT. HI-LEX INDONESIA',
      noSo: '2601-SO-INV-005',
      poNo: 'P4Q2697',
      sales: '01',
      noFaktur: 'INV-2607-0050',
      keterangan: '',
      stsPrint: 'Not Yet',
      tglPrint: '',
      stsPost: 'Posting',
      tglPost: '31-Jul-2026',
      dibuatOleh: 'RETNO',
      tglCreated: '09-Jul-2026',
      diupdateOleh: 'RETNO',
      tglUpdate: '31-Jul-2026',
    },
    {
      id: '2',
      noBukti: '2608-DO-INV-012',
      tanggal: '03-Aug-2026',
      namaCustomer: 'PT. MITSUBA INDONESIA',
      noSo: '2607-SO-INV-009',
      poNo: 'PC/F3-NA/07/2026/02',
      sales: '01',
      noFaktur: 'INV-2608-0061',
      keterangan: '',
      stsPrint: 'Not Yet',
      tglPrint: '',
      stsPost: 'Posting',
      tglPost: '31-Jul-2026',
      dibuatOleh: 'RETNO',
      tglCreated: '31-Jul-2026',
      diupdateOleh: '',
      tglUpdate: '',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [tanggalFilter, setTanggalFilter] = useState<string>('03-Aug-2026');

  // Add New / Koreksi Modal state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newNoBukti, setNewNoBukti] = useState<string>('2608-DO-INV-013');
  const [newTanggal, setNewTanggal] = useState<string>('03-Aug-2026');
  const [newCustomer, setNewCustomer] = useState<string>('PT. HI-LEX INDONESIA');
  const [newNoSo, setNewNoSo] = useState<string>('2608-SO-INV-010');
  const [newPoNo, setNewPoNo] = useState<string>('P4Q2700');
  const [newSales, setNewSales] = useState<string>('01');
  const [newNoFaktur, setNewNoFaktur] = useState<string>('INV-2608-0062');
  const [newKeterangan, setNewKeterangan] = useState<string>('');

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setNewNoBukti(`2608-DO-INV-01${sjList.length + 1}`);
    setNewTanggal('03-Aug-2026');
    setNewCustomer('PT. HI-LEX INDONESIA');
    setNewNoSo('2608-SO-INV-010');
    setNewPoNo('P4Q2700');
    setNewSales('01');
    setNewNoFaktur(`INV-2608-006${sjList.length + 1}`);
    setNewKeterangan('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = sjList.find((s) => s.id === selectedId);
    if (!item) return;
    setEditingId(item.id);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal);
    setNewCustomer(item.namaCustomer);
    setNewNoSo(item.noSo);
    setNewPoNo(item.poNo);
    setNewSales(item.sales);
    setNewNoFaktur(item.noFaktur);
    setNewKeterangan(item.keterangan);
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoBukti.trim()) return;

    if (editingId) {
      setSjList(
        sjList.map((item) =>
          item.id === editingId
            ? {
                ...item,
                noBukti: newNoBukti.trim().toUpperCase(),
                tanggal: newTanggal,
                namaCustomer: newCustomer.trim().toUpperCase(),
                noSo: newNoSo.trim().toUpperCase(),
                poNo: newPoNo.trim(),
                sales: newSales.trim(),
                noFaktur: newNoFaktur.trim().toUpperCase(),
                keterangan: newKeterangan.trim(),
                diupdateOleh: 'RETNO',
                tglUpdate: newTanggal,
              }
            : item
        )
      );
      showFeedback('Surat Jalan diperbarui');
    } else {
      const newItem: SuratJalanItem = {
        id: Date.now().toString(),
        noBukti: newNoBukti.trim().toUpperCase(),
        tanggal: newTanggal,
        namaCustomer: newCustomer.trim().toUpperCase(),
        noSo: newNoSo.trim().toUpperCase(),
        poNo: newPoNo.trim(),
        sales: newSales.trim(),
        noFaktur: newNoFaktur.trim().toUpperCase(),
        keterangan: newKeterangan.trim(),
        stsPrint: 'Not Yet',
        tglPrint: '',
        stsPost: 'Posting',
        tglPost: newTanggal,
        dibuatOleh: 'RETNO',
        tglCreated: newTanggal,
        diupdateOleh: '',
        tglUpdate: '',
      };

      setSjList([newItem, ...sjList]);
      setSelectedId(newItem.id);
      showFeedback('Surat Jalan tersimpan');
    }
    setIsAddOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = sjList.filter((item) => item.id !== id);
    setSjList(updated);
    if (selectedId === id) {
      setSelectedId(updated[0]?.id || '');
    }
    showFeedback('Surat Jalan dihapus');
  };

  const filteredList = sjList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Nama Pelanggan') {
      return item.namaCustomer.toLowerCase().includes(term);
    } else if (searchField === 'No.Bukti') {
      return item.noBukti.toLowerCase().includes(term);
    } else if (searchField === 'No.SO') {
      return item.noSo.toLowerCase().includes(term);
    } else if (searchField === 'PO.NO') {
      return item.poNo.toLowerCase().includes(term);
    } else if (searchField === 'No.Faktur') {
      return item.noFaktur.toLowerCase().includes(term);
    }
    return (
      item.noBukti.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.noSo.toLowerCase().includes(term)
    );
  });

  return (
    <div
      id="list-surat-jalan-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      {/* 1. Black Window Header Banner */}
      <FormHeaderBanner
        title="List Surat Jalan"
        onClose={onClose}
        onExportExcel={() => showFeedback('Export Excel selesai')}
      />

      {/* 2. Action Toolbar & Filter Header */}
      <div className="bg-[#ECE9D8] border-b border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs shadow-sm">
        <div className="flex items-center space-x-2">
          <FormActionButtons
            onSimpan={() => showFeedback('Data Surat Jalan tersimpan')}
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
              title="Buka Dialog Laporan Surat Jalan"
            >
              <span className="text-blue-700">🖶</span>
              <span>Laporan Surat Jalan</span>
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
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1450px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Bukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.SO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">PO.NO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Faktur</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
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
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noSo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.poNo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.sales}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noFaktur}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan || '-'}</td>
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
                <td colSpan={17} className="text-center py-6 text-gray-500">
                  Tidak ada data surat jalan
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
            <option value="No.SO">No.SO</option>
            <option value="PO.NO">PO.NO</option>
            <option value="No.Faktur">No.Faktur</option>
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
              <span>{editingId ? 'Koreksi Surat Jalan' : 'Tambah Surat Jalan Baru'}</span>
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
                <label className="font-semibold">No. SO:</label>
                <input
                  type="text"
                  value={newNoSo}
                  onChange={(e) => setNewNoSo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">PO.NO:</label>
                <input
                  type="text"
                  value={newPoNo}
                  onChange={(e) => setNewPoNo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
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
                <label className="font-semibold">No. Faktur:</label>
                <input
                  type="text"
                  value={newNoFaktur}
                  onChange={(e) => setNewNoFaktur(e.target.value)}
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
