import React, { useState, useRef } from 'react';

export interface SalesItem {
  id: string;
  kode: string;
  namaSales: string;
  alamat: string;
  kota: string;
  telepon: string;
  limit: string;
  komisi: string;
}

interface MasterSalesListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterSalesListForm: React.FC<MasterSalesListFormProps> = ({
  isOpen,
  onClose,
}) => {
  // Sample data matching the user screenshot for Master Sales
  const [salesList, setSalesList] = useState<SalesItem[]>([
    { id: '1', kode: '03', namaSales: 'AGUS RIYADI', alamat: '', kota: 'JAKARTA', telepon: '0812 8100 9515', limit: '', komisi: '' },
    { id: '2', kode: '06', namaSales: 'ANTON S', alamat: '', kota: '', telepon: '', limit: '', komisi: '' },
    { id: '3', kode: '02', namaSales: 'CHRISTIAWAN', alamat: '', kota: 'JAKARTA', telepon: '0878 2931 5454', limit: '', komisi: '' },
    { id: '4', kode: '05', namaSales: 'DARMASTUTI', alamat: '', kota: 'JAKARTA', telepon: '0813 1031 8868', limit: '', komisi: '' },
    { id: '5', kode: '01', namaSales: 'M. TUTUK', alamat: '', kota: 'JAKARTA', telepon: '0858 8286 5571', limit: '', komisi: '' },
    { id: '6', kode: '04', namaSales: 'UGI', alamat: '', kota: 'JAKARTA', telepon: '0812 8653 2387', limit: '', komisi: '' },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Description');

  // Add New Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('JAKARTA');
  const [newTelepon, setNewTelepon] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newKomisi, setNewKomisi] = useState('');

  // Horizontal table scroll ref
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollLeft = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: -250, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: 250, behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  const handleAddNew = () => {
    const nextCode = (salesList.length + 1).toString().padStart(2, '0');
    setNewKode(nextCode);
    setNewNama('');
    setNewAlamat('');
    setNewKota('JAKARTA');
    setNewTelepon('');
    setNewLimit('');
    setNewKomisi('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNama.trim()) return;

    const newItem: SalesItem = {
      id: Date.now().toString(),
      kode: newKode.trim().toUpperCase(),
      namaSales: newNama.trim().toUpperCase(),
      alamat: newAlamat.trim().toUpperCase(),
      kota: newKota.trim().toUpperCase(),
      telepon: newTelepon.trim(),
      limit: newLimit.trim(),
      komisi: newKomisi.trim(),
    };

    setSalesList([...salesList, newItem]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const filteredSales = salesList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') {
      return item.kode.toLowerCase().includes(term);
    }
    return item.namaSales.toLowerCase().includes(term);
  });

  return (
    <div
      id="master-sales-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner: List Master Sales */}
        <div
          id="master-sales-banner"
          className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]"
        >
          <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
            List Master Sales
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
              onClick={() => alert('Data Master Sales berhasil diexport ke format Excel')}
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
          id="master-sales-toolbar"
          className="shrink-0 flex items-center h-[52px] px-3 space-x-4 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans"
        >
          {/* Add New Button */}
          <button
            id="btn-add-new-sales"
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
                <option value="Kode">Kode Sales</option>
              </select>
              <div className="absolute right-1 top-2 pointer-events-none text-[8px] text-black">
                ▼
              </div>
            </div>

            {/* Search Input Field */}
            <div className="w-[340px]">
              <input
                id="sales-search-input"
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
          <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-white shadow-inner min-h-[220px]">
            {/* Header Bar: "List" with quick scroll left/right buttons */}
            <div className="shrink-0 h-[24px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-between px-2 text-[11px] font-bold text-black select-none">
              <div className="flex items-center space-x-1.5">
                <span>List</span>
                <span className="text-[10px] text-gray-500 font-normal hidden sm:inline">(Geser Scrollbar atau Tombol ◀ ▶ untuk Scroll Kiri/Kanan & Bawah)</span>
              </div>

              {/* Quick Scroll Left & Right buttons */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handleScrollLeft}
                  className="px-2 py-0.5 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[10px] font-bold hover:bg-[#F2EFE2] cursor-pointer"
                >
                  ◀ Geser Kiri
                </button>
                <button
                  type="button"
                  onClick={handleScrollRight}
                  className="px-2 py-0.5 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[10px] font-bold hover:bg-[#F2EFE2] cursor-pointer"
                >
                  Geser Kanan ▶
                </button>
              </div>
            </div>

            {/* Table Data Grid with full horizontal (left/right) & vertical (down) scrolling */}
            <div
              id="master-sales-table-container"
              ref={tableContainerRef}
              className="flex-1 overflow-x-auto overflow-y-auto bg-white"
            >
              <table className="min-w-[1000px] w-full border-collapse text-[11px] font-sans select-none whitespace-nowrap">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                    {/* Selector column header */}
                    <th className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] p-0 sticky left-0 z-20 shadow-[1px_0_0_#ACA899]" />
                    {/* Kode column header */}
                    <th className="w-[70px] min-w-[70px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px] bg-[#ECE9D8] sticky left-[20px] z-20 shadow-[1px_0_0_#ACA899]">
                      Kode
                    </th>
                    {/* Nama Sales column header */}
                    <th className="w-[240px] min-w-[240px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px] bg-[#ECE9D8]">
                      Nama Sales
                    </th>
                    {/* Alamat column header */}
                    <th className="w-[300px] min-w-[300px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px] bg-[#ECE9D8]">
                      Alamat
                    </th>
                    {/* Kota column header */}
                    <th className="w-[140px] min-w-[140px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px] bg-[#ECE9D8]">
                      Kota
                    </th>
                    {/* Telepon column header */}
                    <th className="w-[140px] min-w-[140px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px] bg-[#ECE9D8]">
                      Telepon
                    </th>
                    {/* Limit column header */}
                    <th className="w-[90px] min-w-[90px] border-r border-[#ACA899] px-2 py-1 text-center font-bold text-[11px] bg-[#ECE9D8]">
                      Limit
                    </th>
                    {/* Komisi column header */}
                    <th className="w-[90px] min-w-[90px] border-r border-[#ACA899] px-2 py-1 text-center font-bold text-[11px] bg-[#ECE9D8]">
                      Komisi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((item) => {
                    const isSelected = selectedId === item.id;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className="h-[22px] border-b border-[#ACA899] bg-white hover:bg-[#EAF2FC] cursor-pointer"
                      >
                        {/* Selector column */}
                        <td className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0 sticky left-0 z-10 shadow-[1px_0_0_#ACA899]">
                          {isSelected ? (
                            <span className="text-[10px] font-bold text-black leading-none inline-block">
                              ▶
                            </span>
                          ) : null}
                        </td>

                        {/* Kode */}
                        <td className="w-[70px] min-w-[70px] px-2 py-0.5 border-r border-[#ACA899] font-bold text-black sticky left-[20px] z-10 bg-white shadow-[1px_0_0_#ACA899]">
                          {item.kode}
                        </td>

                        {/* Nama Sales */}
                        <td className="w-[240px] min-w-[240px] px-2 py-0.5 border-r border-[#ACA899] font-bold text-black uppercase">
                          {item.namaSales}
                        </td>

                        {/* Alamat */}
                        <td className="w-[300px] min-w-[300px] px-2 py-0.5 border-r border-[#ACA899] text-black uppercase">
                          {item.alamat || '-'}
                        </td>

                        {/* Kota */}
                        <td className="w-[140px] min-w-[140px] px-2 py-0.5 border-r border-[#ACA899] text-black uppercase">
                          {item.kota || '-'}
                        </td>

                        {/* Telepon */}
                        <td className="w-[140px] min-w-[140px] px-2 py-0.5 border-r border-[#ACA899] font-mono text-black">
                          {item.telepon || '-'}
                        </td>

                        {/* Limit */}
                        <td className="w-[90px] min-w-[90px] px-2 py-0.5 border-r border-[#ACA899] text-center text-gray-400">
                          .
                        </td>

                        {/* Komisi */}
                        <td className="w-[90px] min-w-[90px] px-2 py-0.5 border-r border-[#ACA899] text-center text-gray-400">
                          .
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
            {/* Status box / Beveled frame */}
            <div className="w-[450px] h-[22px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 flex items-center text-gray-700">
              {selectedId
                ? `Sales Terpilih: ${
                    salesList.find((s) => s.id === selectedId)?.namaSales || '-'
                  }`
                : ''}
            </div>

            {/* Record Count Indicator (matching 6 from screenshot) */}
            <div className="flex items-center space-x-6 text-[12px] font-sans text-black pr-28">
              <span>Record</span>
              <span className="font-sans text-[12px]">{salesList.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Modal Window */}
      {isAddOpen && (
        <div
          id="sales-add-modal-backdrop"
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
          <div
            id="sales-add-modal-window"
            className="w-[420px] max-w-full max-h-[90vh] flex flex-col bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans overflow-hidden my-auto"
          >
            {/* Title Bar */}
            <div className="shrink-0 flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
              <span>Input Master Sales Baru</span>
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
                <label className="w-[110px] font-bold">Kode :</label>
                <input
                  type="text"
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value)}
                  placeholder="Contoh: 07"
                  className="w-[80px] h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono font-bold uppercase outline-none focus:border-[#316AC5]"
                  required
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Nama Sales :</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: BUDI SANTOSO"
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
                  placeholder="Contoh: JL. RAYA NO. 1"
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Kota :</label>
                <input
                  type="text"
                  value={newKota}
                  onChange={(e) => setNewKota(e.target.value)}
                  placeholder="JAKARTA"
                  className="w-[180px] h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Telepon :</label>
                <input
                  type="text"
                  value={newTelepon}
                  onChange={(e) => setNewTelepon(e.target.value)}
                  placeholder="08123456789"
                  className="w-[160px] h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono outline-none focus:border-[#316AC5]"
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
