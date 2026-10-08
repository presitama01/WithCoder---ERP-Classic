import React, { useState } from 'react';

export interface LokasiGudangItem {
  id: string;
  kode: string;
  namaLokasi: string;
  alamat: string;
  kota: string;
  telepon1: string;
  telepon2: string;
  fax?: string;
  pic?: string;
  keterangan?: string;
}

interface MasterLokasiGudangListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterLokasiGudangListForm: React.FC<MasterLokasiGudangListFormProps> = ({
  isOpen,
  onClose,
}) => {
  // Data matching the user screenshot exactly
  const [lokasiList, setLokasiList] = useState<LokasiGudangItem[]>([
    {
      id: '1',
      kode: '01',
      namaLokasi: 'OFFICE',
      alamat: '',
      kota: 'JAKARTA',
      telepon1: '',
      telepon2: '',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Description');

  // Modal for Add New
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('JAKARTA');
  const [newTelp1, setNewTelp1] = useState('');
  const [newTelp2, setNewTelp2] = useState('');
  const [newFax, setNewFax] = useState('');
  const [newPic, setNewPic] = useState('');
  const [newKeterangan, setNewKeterangan] = useState('');

  if (!isOpen) return null;

  const handleAddNew = () => {
    const nextCode = (lokasiList.length + 1).toString().padStart(2, '0');
    setNewKode(nextCode);
    setNewNama('');
    setNewAlamat('');
    setNewKota('');
    setNewTelp1('');
    setNewTelp2('');
    setNewFax('');
    setNewPic('');
    setNewKeterangan('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNama.trim()) return;

    const newItem: LokasiGudangItem = {
      id: Date.now().toString(),
      kode: newKode.trim().toUpperCase(),
      namaLokasi: newNama.trim().toUpperCase(),
      alamat: newAlamat.trim().toUpperCase(),
      kota: newKota.trim().toUpperCase(),
      telepon1: newTelp1.trim(),
      telepon2: newTelp2.trim(),
      fax: newFax.trim(),
      pic: newPic.trim().toUpperCase(),
      keterangan: newKeterangan.trim().toUpperCase(),
    };
    setLokasiList([...lokasiList, newItem]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const filteredLokasi = lokasiList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') {
      return item.kode.toLowerCase().includes(term);
    }
    return (
      item.namaLokasi.toLowerCase().includes(term) ||
      item.kota.toLowerCase().includes(term)
    );
  });

  return (
    <div
      id="master-lokasi-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner: List Master Lokasi Gudang */}
        <div
          id="master-lokasi-banner"
          className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]"
        >
          <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
            List Master Lokasi Gudang
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
            onClick={() => alert('Data Master Lokasi Gudang berhasil diexport ke format Excel')}
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
        id="master-lokasi-toolbar"
        className="flex items-center h-[52px] px-3 space-x-4 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans"
      >
        {/* Add New Button */}
        <button
          id="btn-add-new-lokasi"
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
              id="lokasi-search-input"
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

          {/* Table Area matching screenshot */}
          <div
            id="master-lokasi-table-scroll"
            className="flex-1 overflow-auto bg-[#ECE9D8]"
          >
            <table className="border-collapse text-[11px] font-sans select-none bg-white">
              <thead>
                <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                  {/* Selector column header */}
                  <th className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                  {/* Kode column header */}
                  <th className="w-[64px] min-w-[64px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">
                    Kode
                  </th>
                  {/* Nama Lokasi column header */}
                  <th className="w-[130px] min-w-[130px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">
                    Nama Lokasi
                  </th>
                  {/* Alamat column header */}
                  <th className="w-[260px] min-w-[260px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">
                    Alamat
                  </th>
                  {/* Kota column header */}
                  <th className="w-[140px] min-w-[140px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">
                    Kota
                  </th>
                  {/* Telepon1 column header */}
                  <th className="w-[96px] min-w-[96px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">
                    Telepon1
                  </th>
                  {/* Telepon2 column header */}
                  <th className="w-[96px] min-w-[96px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">
                    Telepon2
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLokasi.map((item) => {
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

                      {/* Kode */}
                      <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold text-black">
                        {item.kode}
                      </td>

                      {/* Nama Lokasi */}
                      <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold text-black uppercase">
                        {item.namaLokasi}
                      </td>

                      {/* Alamat */}
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">
                        {item.alamat}
                      </td>

                      {/* Kota */}
                      <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold text-black uppercase">
                        {item.kota}
                      </td>

                      {/* Telepon1 */}
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">
                        {item.telepon1}
                      </td>

                      {/* Telepon2 */}
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">
                        {item.telepon2}
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

          {/* Record Count Indicator (matching 'Record   1' in screenshot) */}
          <div className="flex items-center space-x-6 text-[12px] font-sans text-black pr-28">
            <span>Record</span>
            <span className="font-sans text-[12px]">{filteredLokasi.length}</span>
          </div>
        </div>
      </div>
      </div>

      {/* Add New Dialog Window */}
      {isAddOpen && (
        <div
          id="lokasi-add-modal-backdrop"
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
          <div
            id="lokasi-add-modal-window"
            className="w-[440px] max-w-full max-h-[90vh] flex flex-col bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans overflow-hidden my-auto"
          >
            {/* Title Bar */}
            <div className="shrink-0 flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
              <span>Input Lokasi Gudang Baru</span>
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
              className="p-4 space-y-2.5 text-[11px] text-black overflow-y-auto max-h-[calc(90vh-32px)]"
            >
              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Kode Lokasi :</label>
                <input
                  type="text"
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value)}
                  className="w-[100px] h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono font-bold uppercase outline-none focus:border-[#316AC5]"
                  required
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Nama Lokasi :</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: GUDANG UTAMA"
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Alamat :</label>
                <input
                  type="text"
                  value={newAlamat}
                  onChange={(e) => setNewAlamat(e.target.value)}
                  placeholder="Contoh: JL. RAYA INDUSTRI NO. 12"
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Kota :</label>
                <input
                  type="text"
                  value={newKota}
                  onChange={(e) => setNewKota(e.target.value)}
                  placeholder="Contoh: JAKARTA"
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Telepon 1 :</label>
                <input
                  type="text"
                  value={newTelp1}
                  onChange={(e) => setNewTelp1(e.target.value)}
                  placeholder="021-xxxxxxx"
                  className="w-[180px] h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none font-mono"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Telepon 2 :</label>
                <input
                  type="text"
                  value={newTelp2}
                  onChange={(e) => setNewTelp2(e.target.value)}
                  placeholder="021-xxxxxxx"
                  className="w-[180px] h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none font-mono"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Fax :</label>
                <input
                  type="text"
                  value={newFax}
                  onChange={(e) => setNewFax(e.target.value)}
                  placeholder="021-xxxxxxx"
                  className="w-[180px] h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none font-mono"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Penanggung Jawab :</label>
                <input
                  type="text"
                  value={newPic}
                  onChange={(e) => setNewPic(e.target.value)}
                  placeholder="Nama PIC Gudang"
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Keterangan :</label>
                <input
                  type="text"
                  value={newKeterangan}
                  onChange={(e) => setNewKeterangan(e.target.value)}
                  placeholder="Catatan status / fungsi gudang"
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#ACA899]">
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
