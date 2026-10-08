import React, { useState } from 'react';

export interface TypeItem {
  id: string;
  kode: string;
  namaTipe: string;
}

interface TypeListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TypeListForm: React.FC<TypeListFormProps> = ({ isOpen, onClose }) => {
  // Data taken directly from screenshot
  const [types, setTypes] = useState<TypeItem[]>([
    { id: '1', kode: '0001', namaTipe: 'CONTACT POINT' },
    { id: '2', kode: '0002', namaTipe: 'LIMIT SEAL' },
    { id: '3', kode: '0003', namaTipe: 'UTM-1000D' },
    { id: '4', kode: '0005', namaTipe: 'UTM-1000E' },
    { id: '5', kode: '0004', namaTipe: 'UTM-1000E' },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Description');

  // Modal for Add New
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');

  if (!isOpen) return null;

  const handleAddNew = () => {
    const nextCode = (types.length + 1).toString().padStart(4, '0');
    setNewKode(nextCode);
    setNewNama('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNama.trim()) return;

    const newItem: TypeItem = {
      id: Date.now().toString(),
      kode: newKode.trim().toUpperCase(),
      namaTipe: newNama.trim().toUpperCase(),
    };
    setTypes([...types, newItem]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const filteredTypes = types.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') {
      return item.kode.toLowerCase().includes(term);
    }
    return item.namaTipe.toLowerCase().includes(term);
  });

  return (
    <div
      id="type-list-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none min-w-[550px] overflow-auto"
    >
      {/* 1. Black Top Banner: List Tabel Type */}
      <div
        id="type-form-banner"
        className="flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333] min-w-fit"
      >
        <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
          List Tabel Type
        </span>

        {/* Right tools: Table view icon & Excel export icon + Close button */}
        <div className="flex items-center space-x-1.5">
          {/* Table view icon button */}
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

          {/* Excel Export icon button */}
          <button
            type="button"
            title="Export Excel"
            onClick={() => alert('Data Type berhasil diexport ke format Excel')}
            className="w-[24px] h-[22px] bg-[#1E7145] border border-white/80 rounded-[1px] flex items-center justify-center hover:brightness-110 cursor-pointer"
          >
            <div className="relative flex items-center justify-center">
              <span className="text-[11px] font-bold text-white font-sans tracking-tighter">
                X
              </span>
              <div className="absolute -bottom-1 -right-1 w-[7px] h-[5px] bg-white grid grid-cols-2 gap-[0.5px]">
                <div className="bg-[#1E7145]" />
                <div className="bg-[#1E7145]" />
                <div className="bg-[#1E7145]" />
                <div className="bg-[#1E7145]" />
              </div>
            </div>
          </button>

          {/* Close MDI Child Form Button */}
          <button
            type="button"
            onClick={onClose}
            title="Tutup Form"
            className="ml-2 w-[22px] h-[22px] bg-[#ECE9D8] hover:bg-[#E81123] hover:text-white border border-[#707070] text-black text-[11px] font-bold flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Action & Search Bar */}
      <div
        id="type-form-toolbar"
        className="flex items-center h-[52px] px-3 space-x-4 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans min-w-max overflow-x-auto"
      >
        {/* Add New Button */}
        <button
          id="btn-add-new-type"
          type="button"
          onClick={handleAddNew}
          className="w-[92px] h-[30px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:border-t-[#707070] active:border-l-[#707070] active:border-b-white active:border-r-white text-[11px] font-bold text-black hover:bg-[#F2EFE2] active:bg-[#DFDBD0] cursor-pointer shadow-sm"
        >
          Add New
        </button>

        {/* Search controls */}
        <div className="flex items-center space-x-2">
          <span className="font-bold text-[11px] text-black">Search :</span>

          {/* Field selection button / combobox */}
          <div className="relative">
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-[24px] px-2 pr-6 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] font-sans font-medium text-black appearance-none outline-none cursor-pointer"
            >
              <option value="Description">Description</option>
              <option value="Kode">Kode</option>
            </select>
            <div className="absolute right-1 top-2 pointer-events-none text-[8px] text-black">
              ▼
            </div>
          </div>

          {/* Search Input Field */}
          <div className="w-[340px]">
            <input
              id="type-search-input"
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
      <div className="flex-1 flex flex-col p-2 overflow-hidden bg-[#ECE9D8] min-h-[200px]">
        {/* Table Frame Box */}
        <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-white shadow-inner min-h-0">
          {/* Header Bar: "List" */}
          <div className="h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-bold text-black">
            List
          </div>

          {/* Table Data Grid with full 2-directional scroll */}
          <div className="flex-1 overflow-auto bg-[#F0EDE2]">
            <table className="min-w-[500px] w-full border-collapse text-[11px] font-sans select-none">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                  {/* Selector column header */}
                  <th className="w-[24px] border-r border-[#ACA899] bg-[#ECE9D8] p-1" />
                  {/* Kode column header */}
                  <th className="w-[100px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px]">
                    Kode
                  </th>
                  {/* Nama Tipe column header */}
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px]">
                    Nama Tipe
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTypes.map((item) => {
                  const isSelected = selectedId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`h-[22px] border-b border-[#D6D6D6] cursor-pointer ${
                        isSelected
                          ? 'bg-[#0A246A] text-white font-semibold'
                          : 'bg-white hover:bg-[#EAF2FC] text-black'
                      }`}
                    >
                      {/* Left pointer column */}
                      <td
                        className={`w-[24px] border-r border-[#ACA899] text-center p-0 ${
                          isSelected ? 'bg-[#ECE9D8] text-black' : 'bg-[#ECE9D8] text-black'
                        }`}
                      >
                        {isSelected ? (
                          <span className="text-[10px] font-bold leading-none inline-block">
                            ▶
                          </span>
                        ) : null}
                      </td>

                      {/* Kode */}
                      <td
                        className={`px-2 py-0.5 border-r border-[#D6D6D6] font-mono ${
                          isSelected ? 'border-r-[#3A5FCD]' : ''
                        }`}
                      >
                        {item.kode}
                      </td>

                      {/* Nama Tipe */}
                      <td className="px-2 py-0.5 uppercase tracking-wide">
                        {item.namaTipe}
                      </td>
                    </tr>
                  );
                })}

                {/* Fill empty rows for authentic VB/Delphi grid look */}
                {Array.from({ length: Math.max(0, 15 - filteredTypes.length) }).map(
                  (_, emptyIdx) => (
                    <tr key={`empty-${emptyIdx}`} className="h-[22px] bg-white border-b border-[#EBEBEB]">
                      <td className="w-[24px] border-r border-[#ACA899] bg-[#ECE9D8]" />
                      <td className="border-r border-[#EBEBEB]" />
                      <td />
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Bottom Information Bar */}
        <div className="flex items-center justify-between mt-2 px-1 text-[11px] font-sans">
          {/* Status box / Beveled frame */}
          <div className="w-[450px] h-[22px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 flex items-center text-gray-700">
            {selectedId
              ? `Tipe Terpilih: ${types.find((t) => t.id === selectedId)?.namaTipe || '-'}`
              : ''}
          </div>

          {/* Record Count Indicator (matching 5 from screenshot) */}
          <div className="flex items-center space-x-6 text-[12px] font-sans font-bold text-black pr-16">
            <span>Record</span>
            <span className="font-mono text-[13px]">{filteredTypes.length}</span>
          </div>
        </div>
      </div>

      {/* Add New Dialog Window */}
      {isAddOpen && (
        <div className="absolute inset-0 bg-black/25 flex items-center justify-center z-50 p-4">
          <div className="w-[360px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans">
            {/* Title Bar */}
            <div className="flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
              <span>Input Type Baru</span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-[16px] h-[15px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="p-4 space-y-3 text-[11px] text-black">
              <div className="flex items-center space-x-3">
                <label className="w-[90px] font-bold">Kode :</label>
                <input
                  type="text"
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value)}
                  className="w-[120px] h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono font-bold uppercase outline-none focus:border-[#316AC5]"
                  required
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[90px] font-bold">Nama Tipe :</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: CONTACT POINT"
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ACA899]">
                <button
                  type="submit"
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:border-t-[#707070] active:border-l-[#707070] active:border-b-white active:border-r-white text-[11px] font-bold hover:bg-[#F2EFE2] cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:border-t-[#707070] active:border-l-[#707070] active:border-b-white active:border-r-white text-[11px] hover:bg-[#F2EFE2] cursor-pointer"
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
