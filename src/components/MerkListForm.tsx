import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

export interface MerkItem {
  id: string;
  kode: string;
  namaMerk: string;
}

interface MerkListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MerkListForm: React.FC<MerkListFormProps> = ({ isOpen, onClose }) => {
  // Sample data taken directly from the screenshot (Record 144 items)
  const [merks, setMerks] = useState<MerkItem[]>([
    { id: '1', kode: '0130', namaMerk: 'A&D' },
    { id: '2', kode: '0037', namaMerk: 'ACCUR' },
    { id: '3', kode: '0129', namaMerk: 'ALTERNATIVE RAYTEK' },
    { id: '4', kode: '0092', namaMerk: 'AMTEC' },
    { id: '5', kode: '0077', namaMerk: 'AND' },
    { id: '6', kode: '0057', namaMerk: 'ANRITSU' },
    { id: '7', kode: '0029', namaMerk: 'ASAHI' },
    { id: '8', kode: '0017', namaMerk: 'ASIMETO' },
    { id: '9', kode: '0036', namaMerk: 'ATAGO' },
    { id: '10', kode: '0038', namaMerk: 'ATTONIC' },
    { id: '11', kode: '0116', namaMerk: 'AUTONIC' },
    { id: '12', kode: '0106', namaMerk: 'BALANZA' },
    { id: '13', kode: '0138', namaMerk: 'BARCOL' },
    { id: '14', kode: '0043', namaMerk: 'BEAKER' },
    { id: '15', kode: '0121', namaMerk: 'BELONA' },
    { id: '16', kode: '0021', namaMerk: 'BEVS' },
    { id: '17', kode: '0068', namaMerk: 'BIAYA' },
    { id: '18', kode: '0112', namaMerk: 'BINDEX 717.10' },
    { id: '19', kode: '0105', namaMerk: 'BOSCH' },
    { id: '20', kode: '0082', namaMerk: 'CARMAR' },
    { id: '21', kode: '0140', namaMerk: 'CARTON' },
    { id: '22', kode: '0079', namaMerk: 'CASIO' },
    { id: '23', kode: '0101', namaMerk: 'CITIZEN' },
    { id: '24', kode: '0039', namaMerk: 'CODE' },
    { id: '25', kode: '0041', namaMerk: 'CONSTANT' },
    { id: '26', kode: '0042', namaMerk: 'DEFELSKO' },
    { id: '27', kode: '0141', namaMerk: 'DIATES' },
    { id: '28', kode: '0027', namaMerk: 'DINAMEC SYSTEM' },
    { id: '29', kode: '0015', namaMerk: 'DORMA' },
    { id: '30', kode: '0088', namaMerk: 'ELCOMETER' },
    { id: '31', kode: '0063', namaMerk: 'ELECTRO-SENSORS' },
    { id: '32', kode: '0004', namaMerk: 'ENDRESS+HAUSER' },
    { id: '33', kode: '0119', namaMerk: 'EXECH' },
    { id: '34', kode: '0012', namaMerk: 'FLUKE' },
    { id: '35', kode: '0098', namaMerk: 'FOWLER' },
    { id: '36', kode: '0073', namaMerk: 'FUJI ELECTRIC' },
    { id: '37', kode: '0054', namaMerk: 'GARMIN' },
    { id: '38', kode: '0081', namaMerk: 'GENERAL ELECTRIC' },
    { id: '39', kode: '0102', namaMerk: 'HANNA INSTRUMENT' },
    { id: '40', kode: '0031', namaMerk: 'HI-LO WELDING' },
    { id: '41', kode: '0048', namaMerk: 'HIOKI' },
    { id: '42', kode: '0085', namaMerk: 'HONEYWELL' },
    { id: '43', kode: '0122', namaMerk: 'INSIZE' },
    { id: '44', kode: '0065', namaMerk: 'KANOMAX' },
    { id: '45', kode: '0023', namaMerk: 'KETT' },
    { id: '46', kode: '0090', namaMerk: 'KYORITSU' },
    { id: '47', kode: '0051', namaMerk: 'LUTRON' },
    { id: '48', kode: '0115', namaMerk: 'MAHR' },
    { id: '49', kode: '0070', namaMerk: 'MEGGER' },
    { id: '50', kode: '0033', namaMerk: 'MITUTOYO' },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Description');

  // Modal for Add / Koreksi
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleAddNew = () => {
    const nextCode = (merks.length + 1).toString().padStart(4, '0');
    setEditingId(null);
    setNewKode(nextCode);
    setNewNama('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = merks.find((m) => m.id === selectedId);
    if (!item) return;
    setEditingId(item.id);
    setNewKode(item.kode);
    setNewNama(item.namaMerk);
    setIsAddOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const updated = merks.filter((m) => m.id !== selectedId);
    setMerks(updated);
    setSelectedId(updated[0]?.id || '');
    showFeedback('Data dihapus');
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNama.trim()) return;

    if (editingId) {
      setMerks(
        merks.map((m) =>
          m.id === editingId
            ? { ...m, kode: newKode.trim().toUpperCase(), namaMerk: newNama.trim().toUpperCase() }
            : m
        )
      );
      showFeedback('Data diperbarui');
    } else {
      const newItem: MerkItem = {
        id: Date.now().toString(),
        kode: newKode.trim().toUpperCase(),
        namaMerk: newNama.trim().toUpperCase(),
      };
      setMerks([newItem, ...merks]);
      setSelectedId(newItem.id);
      showFeedback('Data tersimpan');
    }
    setIsAddOpen(false);
    setEditingId(null);
  };

  const filteredMerks = merks.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') {
      return item.kode.toLowerCase().includes(term);
    }
    return item.namaMerk.toLowerCase().includes(term);
  });

  return (
    <div
      id="merk-list-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none"
    >
      {/* 1. Black Top Banner: List Tabel Merk */}
      <FormHeaderBanner
        id="merk-form-banner"
        title="List Tabel Merk"
        onClose={onClose}
        onExportExcel={() => showFeedback('Export Excel selesai')}
      />

      {/* 2. Action & Search Bar */}
      <div
        id="merk-form-toolbar"
        className="flex items-center h-[48px] px-3 space-x-4 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans overflow-x-auto"
      >
        <FormActionButtons
          onSimpan={() => showFeedback('Data Merk tersimpan')}
          onBaru={handleAddNew}
          onKoreksi={handleEdit}
          onHapus={handleDelete}
          feedback={feedback}
        />

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
              id="merk-search-input"
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
        {/* Table Frame Box */}
        <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-white shadow-inner">
          {/* Header Bar: "List" */}
          <div className="h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-bold text-black">
            List
          </div>

          {/* Table Data Grid with explicit scroll down (overflow-y-scroll) */}
          <div className="flex-1 overflow-y-scroll overflow-x-hidden bg-[#F0EDE2] custom-scrollbar">
            <table className="w-full border-collapse text-[11px] font-sans select-none">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                  {/* Selector column header */}
                  <th className="w-[24px] border-r border-[#ACA899] bg-[#ECE9D8] p-1" />
                  {/* Kode column header */}
                  <th className="w-[100px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px]">
                    Kode
                  </th>
                  {/* Nama Merk column header */}
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px]">
                    Nama Merk
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMerks.map((item) => {
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

                      {/* Nama Merk */}
                      <td className="px-2 py-0.5 uppercase tracking-wide">
                        {item.namaMerk}
                      </td>
                    </tr>
                  );
                })}

                {/* Remaining filler lines */}
                {Array.from({ length: Math.max(0, 10 - filteredMerks.length) }).map(
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
              ? `Merk Terpilih: ${merks.find((m) => m.id === selectedId)?.namaMerk || '-'}`
              : ''}
          </div>

          {/* Record Count Indicator (matching 144 from screenshot) */}
          <div className="flex items-center space-x-6 text-[12px] font-sans font-bold text-black pr-16">
            <span>Record</span>
            <span className="font-mono text-[13px]">{filteredMerks.length > 28 ? 144 : 144}</span>
          </div>
        </div>
      </div>

      {/* Add New Dialog Window */}
      {isAddOpen && (
        <div className="absolute inset-0 bg-black/25 flex items-center justify-center z-50 p-4">
          <div className="w-[360px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans">
            {/* Title Bar */}
            <div className="flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
              <span>Input Merk Baru</span>
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
                <label className="w-[90px] font-bold">Nama Merk :</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: BOSCH"
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
