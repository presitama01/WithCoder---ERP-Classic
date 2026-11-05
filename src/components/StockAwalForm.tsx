import React, { useState } from 'react';

export interface StockAwalData {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  merk: string;
  satuan: string;
  hpp: number;
  stockBagus: number;
  stockRusak: number;
  lokasi: string;
  periode: string;
}

interface StockAwalFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockAwalForm: React.FC<StockAwalFormProps> = ({
  isOpen,
  onClose,
}) => {
  // Form input states matching image_caed022e.png
  const [periode, setPeriode] = useState<string>('08 - 2026');
  const [lokasiStock, setLokasiStock] = useState<string>('01 - OFFICE');
  const [itemCode, setItemCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [merk, setMerk] = useState<string>('');
  const [satuan, setSatuan] = useState<string>('PCS');
  const [hpp, setHpp] = useState<string>('Rp 0');
  const [stockBagus, setStockBagus] = useState<string>('0');
  const [stockRusak, setStockRusak] = useState<string>('0');

  // Modal for "Open" button to browse / view existing initial stock list
  const [isBrowseOpen, setIsBrowseOpen] = useState<boolean>(false);
  const [browseSearch, setBrowseSearch] = useState<string>('');

  // Sample data for the "Open" browse dialog
  const [stockList, setStockList] = useState<StockAwalData[]>([
    {
      id: '1',
      itemCode: 'BRG-001',
      description: 'BEARING 6204-2RS KOYO JAPAN',
      category: 'SPAREPART',
      merk: 'KOYO',
      satuan: 'PCS',
      hpp: 45000,
      stockBagus: 120,
      stockRusak: 2,
      lokasi: '01 - OFFICE',
      periode: '08 - 2026',
    },
    {
      id: '2',
      itemCode: 'BRG-002',
      description: 'OIL SEAL TC 25-47-8 NOK',
      category: 'SEAL',
      merk: 'NOK',
      satuan: 'PCS',
      hpp: 18500,
      stockBagus: 85,
      stockRusak: 0,
      lokasi: '01 - OFFICE',
      periode: '08 - 2026',
    },
    {
      id: '3',
      itemCode: 'BRG-003',
      description: 'V-BELT B-52 MITSUBOSHI',
      category: 'BELT',
      merk: 'MITSUBOSHI',
      satuan: 'PCS',
      hpp: 75000,
      stockBagus: 40,
      stockRusak: 1,
      lokasi: '01 - OFFICE',
      periode: '08 - 2026',
    },
    {
      id: '4',
      itemCode: 'BRG-004',
      description: 'GREASE EP-2 CHASSIS 15KG',
      category: 'LUBRICANT',
      merk: 'PERTAMINA',
      satuan: 'PAIL',
      hpp: 620000,
      stockBagus: 15,
      stockRusak: 0,
      lokasi: '01 - OFFICE',
      periode: '08 - 2026',
    },
    {
      id: '5',
      itemCode: 'BRG-005',
      description: 'FILTER OLI C-110 YARIS/VIOS',
      category: 'FILTER',
      merk: 'DENSO',
      satuan: 'PCS',
      hpp: 32000,
      stockBagus: 60,
      stockRusak: 0,
      lokasi: '01 - OFFICE',
      periode: '08 - 2026',
    },
  ]);

  if (!isOpen) return null;

  const handleSelectItem = (item: StockAwalData) => {
    setItemCode(item.itemCode);
    setDescription(item.description);
    setCategory(item.category);
    setMerk(item.merk);
    setSatuan(item.satuan);
    setHpp(`Rp ${item.hpp.toLocaleString('id-ID')}`);
    setStockBagus(item.stockBagus.toString());
    setStockRusak(item.stockRusak.toString());
    setLokasiStock(item.lokasi);
    setPeriode(item.periode);
    setIsBrowseOpen(false);
  };

  const handleSaveOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim()) {
      alert('Silakan isi Item Code terlebih dahulu.');
      return;
    }

    const numHpp = parseInt(hpp.replace(/[^0-9]/g, '') || '0', 10);
    const numBagus = parseInt(stockBagus || '0', 10);
    const numRusak = parseInt(stockRusak || '0', 10);

    const newItem: StockAwalData = {
      id: Date.now().toString(),
      itemCode: itemCode.trim().toUpperCase(),
      description: description.trim().toUpperCase(),
      category: category.trim().toUpperCase(),
      merk: merk.trim().toUpperCase(),
      satuan: satuan.trim().toUpperCase(),
      hpp: numHpp,
      stockBagus: numBagus,
      stockRusak: numRusak,
      lokasi: lokasiStock,
      periode,
    };

    setStockList([newItem, ...stockList]);
    alert(`Data Persediaan Awal untuk [${newItem.itemCode}] berhasil disimpan.`);
  };

  const filteredStockList = stockList.filter(
    (item) =>
      item.itemCode.toLowerCase().includes(browseSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(browseSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(browseSearch.toLowerCase()) ||
      item.merk.toLowerCase().includes(browseSearch.toLowerCase())
  );

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex items-start justify-start p-4 select-none">
      {/* Draggable/Fixed Classic Windows Dialog Window matching I-Software - STOCK AWAL */}
      <div
        id="stock-awal-dialog"
        className="pointer-events-auto bg-[#D4D0C8] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] shadow-[3px_3px_10px_rgba(0,0,0,0.4)] w-[500px] flex flex-col font-sans text-xs mt-1 ml-1"
      >
        {/* 1. Classic Windows Aero Title Bar with Folder Icon, Title, and Minimize, Maximize, Close */}
        <div className="bg-gradient-to-r from-[#0055EA] via-[#2E87FA] to-[#0A66EE] text-white px-2 py-1 flex items-center justify-between font-sans text-[11px] shadow-sm select-none">
          <div className="flex items-center space-x-1.5 font-bold drop-shadow">
            <span className="w-3.5 h-3.5 bg-yellow-400/90 border border-amber-600 rounded-xs flex items-center justify-center text-[9px] shadow-xs text-amber-900 font-extrabold">
              📁
            </span>
            <span>I-Software - STOCK AWAL</span>
          </div>

          <div className="flex items-center space-x-1">
            {/* Minimize button */}
            <button
              type="button"
              className="w-4.5 h-4 bg-gradient-to-b from-[#FFFFFF] to-[#C0C0C0] text-black font-bold text-[9px] rounded-xs flex items-center justify-center border border-[#606060] shadow-2xs hover:brightness-110 active:translate-y-px"
              title="Minimize"
            >
              _
            </button>
            {/* Maximize button */}
            <button
              type="button"
              className="w-4.5 h-4 bg-gradient-to-b from-[#FFFFFF] to-[#C0C0C0] text-black font-bold text-[9px] rounded-xs flex items-center justify-center border border-[#606060] shadow-2xs hover:brightness-110 active:translate-y-px"
              title="Maximize"
            >
              ▢
            </button>
            {/* Close button (red) */}
            <button
              onClick={onClose}
              type="button"
              className="w-5 h-4 bg-gradient-to-b from-[#E76C55] to-[#C93822] hover:from-[#FA7C65] hover:to-[#DE4832] text-white font-bold text-[9px] rounded-xs flex items-center justify-center border border-[#8B1A0E] shadow-xs active:translate-y-px cursor-pointer"
              title="Tutup"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Main Dialog Inner Container */}
        <div className="p-2 bg-[#ECE9D8] border border-[#808080] m-1">
          {/* Inner bordered fieldset container matching image_caed022e.png */}
          <div className="border border-[#999999] p-3 bg-[#ECE9D8] flex flex-col">
            <form onSubmit={handleSaveOrUpdate} className="flex flex-col space-y-2">
              {/* Row 1: Periode & Lokasi Stock */}
              <div className="flex items-center justify-between text-[11px]">
                {/* Periode */}
                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Periode :
                  </label>
                  <input
                    type="text"
                    value={periode}
                    onChange={(e) => setPeriode(e.target.value)}
                    placeholder="_ - ____"
                    className="w-20 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none shadow-inner"
                  />
                </div>

                {/* Lokasi Stock */}
                <div className="flex items-center space-x-1.5">
                  <label className="font-medium text-black">
                    Lokasi Stock :
                  </label>
                  <div className="flex items-center bg-white border border-[#7A7A7A]">
                    <select
                      value={lokasiStock}
                      onChange={(e) => setLokasiStock(e.target.value)}
                      className="px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer w-40"
                    >
                      <option value="01 - OFFICE">01 - OFFICE</option>
                      <option value="02 - GUDANG JAKARTA">02 - GUDANG JAKARTA</option>
                      <option value="03 - CABANG SURABAYA">03 - CABANG SURABAYA</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Thin Horizontal Divider 1 */}
              <div className="border-b border-[#999999] my-1" />

              {/* Middle Section: Item Code, Description, Category, Merk, Satuan */}
              <div className="space-y-1.5 text-[11px]">
                {/* Item Code */}
                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Item Code :
                  </label>
                  <input
                    type="text"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-44 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none shadow-inner"
                  />
                </div>

                {/* Description */}
                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Description :
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-72 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] outline-none shadow-inner"
                  />
                </div>

                {/* Category */}
                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Category :
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-28 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] outline-none shadow-inner"
                  />
                </div>

                {/* Merk */}
                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Merk :
                  </label>
                  <input
                    type="text"
                    value={merk}
                    onChange={(e) => setMerk(e.target.value)}
                    className="w-28 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] outline-none shadow-inner"
                  />
                </div>

                {/* Satuan */}
                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    Satuan :
                  </label>
                  <input
                    type="text"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    className="w-16 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] outline-none shadow-inner"
                  />
                </div>
              </div>

              {/* Thin Horizontal Divider 2 */}
              <div className="border-b border-[#999999] my-1" />

              {/* Bottom Row: HPP, Stock Bagus, Stock Rusak */}
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                {/* HPP */}
                <div className="flex items-center space-x-1.5">
                  <label className="w-18 text-right font-medium text-black">
                    HPP :
                  </label>
                  <input
                    type="text"
                    value={hpp}
                    onChange={(e) => setHpp(e.target.value)}
                    className="w-24 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] text-right font-mono outline-none shadow-inner"
                  />
                </div>

                {/* Stock Bagus */}
                <div className="flex items-center space-x-1.5">
                  <label className="font-medium text-black">
                    Stock Bagus :
                  </label>
                  <input
                    type="text"
                    value={stockBagus}
                    onChange={(e) => setStockBagus(e.target.value)}
                    className="w-14 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] text-right font-mono outline-none shadow-inner"
                  />
                </div>

                {/* Stock Rusak */}
                <div className="flex items-center space-x-1.5">
                  <label className="font-medium text-black">
                    Stock Rusak :
                  </label>
                  <input
                    type="text"
                    value={stockRusak}
                    onChange={(e) => setStockRusak(e.target.value)}
                    className="w-14 px-1.5 py-0.5 bg-white border border-[#7A7A7A] text-[11px] text-right font-mono outline-none shadow-inner"
                  />
                </div>
              </div>

              {/* Action Buttons: Open & Close */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBrowseOpen(true)}
                  className="w-18 py-1 bg-[#ECE9D8] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F2EFE6] active:border-[#808080] active:border-r-[#FFFFFF] active:border-b-[#FFFFFF] text-[11px] font-bold text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
                >
                  <span className="border border-dotted border-black/50 px-2 py-0.5 w-full block">
                    Open
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-18 py-1 bg-[#ECE9D8] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F2EFE6] active:border-[#808080] active:border-r-[#FFFFFF] active:border-b-[#FFFFFF] text-[11px] font-bold text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
                >
                  <span className="border border-dotted border-transparent px-2 py-0.5 w-full block">
                    <u>C</u>lose
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Browse / List Persediaan Awal (Opened by "Open" button) */}
      {isBrowseOpen && (
        <div
          id="stock-awal-browse-backdrop"
          className="pointer-events-auto fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-[#D4D0C8] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] shadow-2xl w-[720px] max-h-[85vh] flex flex-col font-sans text-xs">
            {/* Header */}
            <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs select-none">
              <span>Daftar Persediaan Awal (Stock Awal)</span>
              <button
                type="button"
                onClick={() => setIsBrowseOpen(false)}
                className="w-5 h-5 bg-[#C0C0C0] text-black border border-white font-bold flex items-center justify-center hover:bg-red-600 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Toolbar search */}
            <div className="bg-[#ECE9D8] p-2 border-b border-[#ACA899] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-black">Cari Barang :</span>
                <input
                  type="text"
                  placeholder="Ketik kode / nama barang..."
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                  className="px-2 py-0.5 bg-white border border-[#7A7A7A] w-56 text-xs outline-none"
                />
              </div>
              <div className="text-[11px] text-gray-700">
                Total Item: <b>{filteredStockList.length}</b>
              </div>
            </div>

            {/* Table */}
            <div className="p-2 overflow-auto max-h-[50vh] bg-white">
              <table className="w-full border-collapse border border-[#D4D0C8] text-[11px]">
                <thead>
                  <tr className="bg-[#ECE9D8] text-black">
                    <th className="border border-[#B5B3A8] px-2 py-1 text-center w-8">No</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-left w-24">Item Code</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-left">Description</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-left w-20">Category</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-left w-20">Merk</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-center w-14">Satuan</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-right w-20">HPP (Rp)</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-right w-16">Bagus</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-right w-16">Rusak</th>
                    <th className="border border-[#B5B3A8] px-2 py-1 text-center w-16">Pilih</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockList.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#EAF2FC] cursor-pointer"
                      onDoubleClick={() => handleSelectItem(item)}
                    >
                      <td className="border border-[#E0DED5] px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border border-[#E0DED5] px-2 py-1 font-mono font-semibold text-blue-900">
                        {item.itemCode}
                      </td>
                      <td className="border border-[#E0DED5] px-2 py-1">{item.description}</td>
                      <td className="border border-[#E0DED5] px-2 py-1">{item.category}</td>
                      <td className="border border-[#E0DED5] px-2 py-1">{item.merk}</td>
                      <td className="border border-[#E0DED5] px-2 py-1 text-center">{item.satuan}</td>
                      <td className="border border-[#E0DED5] px-2 py-1 text-right font-mono">
                        {item.hpp.toLocaleString('id-ID')}
                      </td>
                      <td className="border border-[#E0DED5] px-2 py-1 text-right font-mono font-bold text-green-700">
                        {item.stockBagus}
                      </td>
                      <td className="border border-[#E0DED5] px-2 py-1 text-right font-mono text-red-600">
                        {item.stockRusak}
                      </td>
                      <td className="border border-[#E0DED5] px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          className="px-2 py-0.5 bg-[#ECE9D8] border border-[#7A7A7A] hover:bg-white text-[10px] font-bold"
                        >
                          Pilih
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStockList.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-4 text-gray-500">
                        Tidak ada data item barang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div className="bg-[#ECE9D8] p-2 border-t border-[#ACA899] flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsBrowseOpen(false)}
                className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] font-semibold cursor-pointer active:shadow-inner"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
