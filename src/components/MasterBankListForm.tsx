import React, { useState, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

export interface BankItem {
  id: string;
  accNumber: string;
  accName: string;
  namaBank: string;
  cabang: string;
}

interface MasterBankListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterBankListForm: React.FC<MasterBankListFormProps> = ({ isOpen, onClose }) => {
  const [banks, setBanks] = useState<BankItem[]>([
    { id: '1', accNumber: '120-00-81697', accName: 'PT. UNIMETRIKA UTAMA', namaBank: 'BANK MANDIRI', cabang: 'KK JAKARTA ROYAL' },
    { id: '2', accNumber: '6590313171', accName: 'PT. UNIMETRIKA UTAMA', namaBank: 'BCA', cabang: 'PRIMA SUNTER' },
    { id: '3', accNumber: '6590400694', accName: 'PT. UNIMETRIKA UTAMA', namaBank: 'BCA', cabang: 'PRIMA SUNTER' },
    { id: '4', accNumber: '2-138-100072', accName: 'PT. UNIMETRIKA UTAMA', namaBank: 'BII MAYBANK - JPY', cabang: 'JUANDA' },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Bank');

  // Modal for Add New
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccName, setNewAccName] = useState('PT. UNIMETRIKA UTAMA');
  const [newNamaBank, setNewNamaBank] = useState('');
  const [newCabang, setNewCabang] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setNewAccNumber('');
    setNewAccName('PT. UNIMETRIKA UTAMA');
    setNewNamaBank('');
    setNewCabang('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = banks.find((b) => b.id === selectedId);
    if (!item) return;
    setEditingId(item.id);
    setNewAccNumber(item.accNumber);
    setNewAccName(item.accName);
    setNewNamaBank(item.namaBank);
    setNewCabang(item.cabang);
    setIsAddOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const updated = banks.filter((b) => b.id !== selectedId);
    setBanks(updated);
    setSelectedId(updated[0]?.id || '');
    showFeedback('Data dihapus');
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNumber.trim() || !newNamaBank.trim()) return;

    const payload: BankItem = {
      id: editingId || Date.now().toString(),
      accNumber: newAccNumber.trim(),
      accName: newAccName.trim().toUpperCase(),
      namaBank: newNamaBank.trim().toUpperCase(),
      cabang: newCabang.trim().toUpperCase(),
    };
    if (editingId) {
      setBanks(banks.map((b) => (b.id === editingId ? payload : b)));
      showFeedback('Data diperbarui');
    } else {
      setBanks([payload, ...banks]);
      setSelectedId(payload.id);
      showFeedback('Data tersimpan');
    }
    setIsAddOpen(false);
    setEditingId(null);
  };

  const filteredBanks = banks.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Acc Number') {
      return item.accNumber.toLowerCase().includes(term);
    } else if (searchField === 'Acc Name') {
      return item.accName.toLowerCase().includes(term);
    } else if (searchField === 'Cabang') {
      return item.cabang.toLowerCase().includes(term);
    }
    return item.namaBank.toLowerCase().includes(term);
  });

  return (
    <div
      id="master-bank-list-form"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner: List Master Bank */}
        <FormHeaderBanner
          title="List Master Bank"
          onClose={onClose}
          onExportExcel={() => showFeedback('Export Excel selesai')}
        />

        {/* 2. Action & Search Toolbar */}
        <div className="shrink-0 flex items-center h-[48px] px-3 space-x-4 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans overflow-x-auto">
          <FormActionButtons
            onSimpan={() => showFeedback('Data Rekening Bank tersimpan')}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleDelete}
            feedback={feedback}
          />

          <div className="flex items-center space-x-2">
            <span className="font-bold text-[11px] text-black">Search :</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-[24px] px-2 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] font-sans font-medium text-black outline-none cursor-pointer"
            >
              <option value="Nama Bank">Nama Bank</option>
              <option value="Acc Number">Acc Number</option>
              <option value="Acc Name">Acc Name</option>
              <option value="Cabang">Cabang</option>
            </select>
            <div className="w-[260px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder=""
                className="w-full h-[24px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 text-[11px] font-sans outline-none focus:border-[#316AC5]"
              />
            </div>
          </div>
        </div>

        {/* 3. Grid Workspace Section */}
        <div className="flex-1 flex flex-col p-2 overflow-hidden bg-[#ECE9D8]">
          <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-[#ECE9D8] overflow-hidden shadow-inner">
            <div className="shrink-0 h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-sans font-normal text-black select-none">
              List
            </div>

            <div
              ref={tableContainerRef}
              className="flex-1 overflow-auto bg-white border border-[#7F9DB9] relative select-none"
            >
              <table className="w-full min-w-[750px] border-collapse text-[11px] font-sans">
                <thead className="bg-[#ECE9D8] sticky top-0 z-10">
                  <tr className="h-[22px] text-left border-b border-[#ACA899]">
                    <th className="py-1 px-3 border-r border-[#ACA899] font-bold text-black w-[160px]">Acc Number</th>
                    <th className="py-1 px-3 border-r border-[#ACA899] font-bold text-black w-[240px]">Acc Name</th>
                    <th className="py-1 px-3 border-r border-[#ACA899] font-bold text-black w-[180px]">Nama Bank</th>
                    <th className="py-1 px-3 font-bold text-black">Cabang</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBanks.map((item, index) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`cursor-pointer h-[22px] ${
                          isSelected
                            ? 'bg-[#316AC5] text-white'
                            : index % 2 === 0
                            ? 'bg-white hover:bg-[#F0F4F8]'
                            : 'bg-[#F9F9F9] hover:bg-[#F0F4F8]'
                        }`}
                      >
                        <td className={`py-0.5 px-3 border-r ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.accNumber}
                        </td>
                        <td className={`py-0.5 px-3 border-r ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.accName}
                        </td>
                        <td className={`py-0.5 px-3 border-r ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.namaBank}
                        </td>
                        <td className="py-0.5 px-3">{item.cabang}</td>
                      </tr>
                    );
                  })}
                  {filteredBanks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-gray-500 italic">
                        Tidak ada data rekening bank yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 4. Status Bar */}
        <div className="h-[24px] bg-[#ECE9D8] border-t border-[#999999] px-3 flex items-center justify-between text-[11px] font-sans text-[#333333]">
          <div className="flex items-center space-x-2">
            <span className="border border-[#7F9DB9] px-2 py-0.5 bg-white/60">
              Record: {filteredBanks.length} of {banks.length}
            </span>
          </div>
          <div className="text-gray-600">MASTER -&gt; Rekening Bank</div>
        </div>

        {/* Add New Modal Dialog */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#ECE9D8] w-[420px] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl flex flex-col font-sans">
              <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-3 py-1.5 flex justify-between items-center text-xs font-bold">
                <span>Tambah Master Bank Baru</span>
                <button onClick={() => setIsAddOpen(false)} className="text-white hover:text-red-200">✕</button>
              </div>
              <form onSubmit={handleSaveNew} className="p-4 flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Acc Number :</label>
                  <input
                    type="text"
                    required
                    value={newAccNumber}
                    onChange={(e) => setNewAccNumber(e.target.value)}
                    placeholder="Contoh: 6590555888"
                    className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Acc Name :</label>
                  <input
                    type="text"
                    required
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Nama Bank :</label>
                  <input
                    type="text"
                    required
                    value={newNamaBank}
                    onChange={(e) => setNewNamaBank(e.target.value)}
                    placeholder="Contoh: BCA / MANDIRI / BNI"
                    className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Cabang :</label>
                  <input
                    type="text"
                    value={newCabang}
                    onChange={(e) => setNewCabang(e.target.value)}
                    placeholder="Contoh: PRIMA SUNTER"
                    className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-300">
                  <button
                    type="submit"
                    className="px-4 py-1 bg-[#E1DFD7] hover:bg-[#D0CEBF] border border-[#7F9DB9] font-semibold rounded shadow-sm cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-1 bg-[#E1DFD7] hover:bg-[#D0CEBF] border border-[#7F9DB9] rounded shadow-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
