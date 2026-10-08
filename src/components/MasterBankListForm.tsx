import React, { useState, useRef } from 'react';

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

  const tableContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleAddNew = () => {
    setNewAccNumber('');
    setNewAccName('PT. UNIMETRIKA UTAMA');
    setNewNamaBank('');
    setNewCabang('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNumber.trim() || !newNamaBank.trim()) return;

    const newItem: BankItem = {
      id: Date.now().toString(),
      accNumber: newAccNumber.trim(),
      accName: newAccName.trim().toUpperCase(),
      namaBank: newNamaBank.trim().toUpperCase(),
      cabang: newCabang.trim().toUpperCase(),
    };
    setBanks([newItem, ...banks]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
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
        <div className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]">
          <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
            List Master Bank
          </span>

          <div className="flex items-center space-x-1.5">
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
              onClick={() => alert('Data Master Bank berhasil diexport ke format Excel')}
              className="w-[24px] h-[22px] bg-[#1E7145] border border-white/80 rounded-[1px] flex items-center justify-center hover:brightness-110 cursor-pointer"
            >
              <span className="text-[11px] font-bold text-white font-sans">X</span>
            </button>
          </div>
        </div>

        {/* 2. Action & Search Toolbar */}
        <div className="shrink-0 flex items-center h-[52px] px-3 space-x-4 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans">
          <button
            type="button"
            onClick={handleAddNew}
            className="w-[92px] h-[30px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:border-t-[#707070] active:border-l-[#707070] active:border-b-white active:border-r-white text-[11px] font-bold text-black hover:bg-[#F2EFE2] active:bg-[#DFDBD0] cursor-pointer shadow-sm"
          >
            Add New
          </button>

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
