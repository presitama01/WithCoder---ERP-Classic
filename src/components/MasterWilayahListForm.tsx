import React, { useState } from 'react';

export interface WilayahItem {
  id: string;
  kodeWilayah: string;
  wilayah: string;
}

interface MasterWilayahListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterWilayahListForm: React.FC<MasterWilayahListFormProps> = ({
  isOpen,
  onClose,
}) => {
  // 28 Records extracted directly from user screenshot
  const [wilayahList, setWilayahList] = useState<WilayahItem[]>([
    { id: '1', kodeWilayah: 'AMB', wilayah: 'AMBON' },
    { id: '2', kodeWilayah: 'BPN', wilayah: 'BALIK PAPAN - KALTIM' },
    { id: '3', kodeWilayah: 'BDG', wilayah: 'BANDUNG - JABAR' },
    { id: '4', kodeWilayah: 'BNGK', wilayah: 'BANGKA' },
    { id: '5', kodeWilayah: 'BJM', wilayah: 'BANJARMASIN - KALSEL' },
    { id: '6', kodeWilayah: 'BKS', wilayah: 'BEKASI' },
    { id: '7', kodeWilayah: 'BLKL', wilayah: 'BENGKULU' },
    { id: '8', kodeWilayah: 'BLORA', wilayah: 'BLORA - JATENG' },
    { id: '9', kodeWilayah: 'BGR', wilayah: 'BOGOR-JABAR' },
    { id: '10', kodeWilayah: 'BKM', wilayah: 'BUKIT KEMUNING-LAMPUNG' },
    { id: '11', kodeWilayah: 'CRB', wilayah: 'CIREBON-JABAR' },
    { id: '12', kodeWilayah: 'GRTL', wilayah: 'GORONTALO' },
    { id: '13', kodeWilayah: 'JKT', wilayah: 'JAKARTA' },
    { id: '14', kodeWilayah: 'JMB', wilayah: 'JAMBI' },
    { id: '15', kodeWilayah: 'JGL', wilayah: 'JONGGOL' },
    { id: '16', kodeWilayah: 'KRW', wilayah: 'KARAWANG' },
    { id: '17', kodeWilayah: 'LPG', wilayah: 'LAMPUNG' },
    { id: '18', kodeWilayah: 'SM06', wilayah: 'LAMPUNG' },
    { id: '19', kodeWilayah: 'LLG', wilayah: 'LUBUK LINGGAU-SUMSEL' },
    { id: '20', kodeWilayah: 'MKR', wilayah: 'MAKASSAR-SULSEL' },
    { id: '21', kodeWilayah: 'MTP', wilayah: 'MARTAPURA-SUMSEL' },
    { id: '22', kodeWilayah: 'MTRM', wilayah: 'MATARAM-LOMBOK' },
    { id: '23', kodeWilayah: 'MDN', wilayah: 'MEDAN - SUMUT' },
    { id: '24', kodeWilayah: 'MDO', wilayah: 'MENADO - SULUT' },
    { id: '25', kodeWilayah: 'MR2', wilayah: 'MUARA2-SUMSEL' },
    { id: '26', kodeWilayah: 'PLB', wilayah: 'PALEMBANG-SUMSEL' },
    { id: '27', kodeWilayah: 'PLW', wilayah: 'PALU' },
    { id: '28', kodeWilayah: 'PKU', wilayah: 'PEKAN BARU-RIAU' },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Description');

  // Modal for Add New
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKode, setNewKode] = useState('');
  const [newWilayah, setNewWilayah] = useState('');

  if (!isOpen) return null;

  const handleAddNew = () => {
    setNewKode('');
    setNewWilayah('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newWilayah.trim()) return;

    const newItem: WilayahItem = {
      id: Date.now().toString(),
      kodeWilayah: newKode.trim().toUpperCase(),
      wilayah: newWilayah.trim().toUpperCase(),
    };
    setWilayahList([newItem, ...wilayahList]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const filteredWilayah = wilayahList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') {
      return item.kodeWilayah.toLowerCase().includes(term);
    }
    return item.wilayah.toLowerCase().includes(term);
  });

  return (
    <div
      id="master-wilayah-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner: List Master Wilayah */}
        <div
          id="master-wilayah-banner"
          className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]"
        >
          <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
            List Master Wilayah
          </span>

          {/* Right tools: Table view icon & Excel export icon */}
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
              onClick={() => alert('Data Master Wilayah berhasil diexport ke format Excel')}
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
          </div>
        </div>

      {/* 2. Action & Search Bar */}
      <div
        id="master-wilayah-toolbar"
        className="shrink-0 flex items-center h-[52px] px-3 space-x-4 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans"
      >
        {/* Add New Button */}
        <button
          id="btn-add-new-wilayah"
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
              <option value="Kode">Kode Wilayah</option>
            </select>
            <div className="absolute right-1 top-2 pointer-events-none text-[8px] text-black">
              ▼
            </div>
          </div>

          {/* Search Input Field */}
          <div className="w-[340px]">
            <input
              id="wilayah-search-input"
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
        <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-[#ECE9D8] overflow-hidden">
          {/* Header Bar: "List" centered */}
          <div className="shrink-0 h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-sans font-normal text-black select-none">
            List
          </div>

          {/* Table Area matching the screenshot */}
          <div
            id="master-wilayah-table-scroll"
            className="flex-1 overflow-auto bg-[#ECE9D8]"
          >
            <table className="border-collapse text-[11px] font-sans select-none bg-white">
              <thead>
                <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                  {/* Selector column header */}
                  <th className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                  {/* Kode Wilayah column header */}
                  <th className="w-[110px] min-w-[110px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">
                    Kode Wilayah
                  </th>
                  {/* Wilayah column header */}
                  <th className="w-[360px] min-w-[360px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">
                    Wilayah
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWilayah.map((item) => {
                  const isSelected = selectedId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className="h-[22px] border-b border-[#ACA899] bg-white cursor-pointer"
                    >
                      {/* Left pointer column */}
                      <td className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0">
                        {isSelected ? (
                          <span className="text-[10px] font-bold text-black leading-none inline-block">
                            ▶
                          </span>
                        ) : null}
                      </td>

                      {/* Kode Wilayah */}
                      <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold text-black">
                        {item.kodeWilayah}
                      </td>

                      {/* Wilayah */}
                      <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold text-black uppercase">
                        {item.wilayah}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Bottom Information Bar */}
        <div className="shrink-0 flex items-center justify-between mt-2 px-1 text-[11px] font-sans">
          {/* Status box / Beveled frame (blank in screenshot) */}
          <div className="w-[450px] h-[22px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 flex items-center" />

          {/* Record Count Indicator (matching 'Record   44' in screenshot) */}
          <div className="flex items-center space-x-6 text-[12px] font-sans text-black pr-28">
            <span>Record</span>
            <span className="font-sans text-[12px]">{filteredWilayah.length}</span>
          </div>
        </div>
      </div>
      </div>

      {/* Add New Dialog Window */}
      {isAddOpen && (
        <div
          id="wilayah-add-modal-backdrop"
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
          <div
            id="wilayah-add-modal-window"
            className="w-[380px] max-w-full max-h-[90vh] flex flex-col bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans overflow-hidden my-auto"
          >
            {/* Title Bar */}
            <div className="shrink-0 flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
              <span>Input Master Wilayah Baru</span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-[16px] h-[15px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveNew}
              className="p-4 space-y-3 text-[11px] text-black overflow-y-auto max-h-[calc(90vh-32px)]"
            >
              <div className="flex items-center space-x-3">
                <label className="w-[100px] font-bold">Kode Wilayah :</label>
                <input
                  type="text"
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value)}
                  placeholder="Contoh: SUB"
                  className="w-[120px] h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono font-bold uppercase outline-none focus:border-[#316AC5]"
                  required
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[100px] font-bold">Nama Wilayah :</label>
                <input
                  type="text"
                  value={newWilayah}
                  onChange={(e) => setNewWilayah(e.target.value)}
                  placeholder="Contoh: SURABAYA - JATIM"
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
