import React, { useState } from 'react';

export interface BarangItem {
  id: string;
  kode: string;
  namaBarang: string;
  unit: string;
  merk: string;
  category: string;
  tipe: string;
  stock: string;
  cost: string;
  price: string;
  disc: string;
  qMin: string;
  qtyPo: string;
  qtySo: string;
  notPrint: boolean;
}

interface MasterBarangListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterBarangListForm: React.FC<MasterBarangListFormProps> = ({
  isOpen,
  onClose,
}) => {
  // Sample data extracted directly from screenshot
  const [barangList, setBarangList] = useState<BarangItem[]>([
    {
      id: '1',
      kode: '00000002',
      namaBarang: 'MITUTOYO, 101120 CONTACT POINT',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: 'CONTACT POINT',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '2',
      kode: '00000003',
      namaBarang: 'MITUTOYO, 111460 CONTACT POINT',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: 'CONTACT POINT',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '3',
      kode: '00000004',
      namaBarang: 'MITUTOYO, 120047 CONTACT POINT',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: 'CONTACT POINT',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '4',
      kode: '00000005',
      namaBarang: 'MITUTOYO, 120056 CONTACT POINT',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: 'CONTACT POINT',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '5',
      kode: '00000006',
      namaBarang: 'MITUTOYO, 136.420 LIMIT SEAL (RED',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: 'LIMIT SEAL',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '6',
      kode: '00000007',
      namaBarang: 'MITUTOYO, 136.421 LIMIT SEAL (GREEN',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: 'LIMIT SEAL',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '7',
      kode: '00000008',
      namaBarang: 'MITUTOYO, 136.422 LIMIT SEAL',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: 'LIMIT SEAL',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '8',
      kode: '00000009',
      namaBarang: 'MITUTOYO, 182-307 STEEL RULE',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '9',
      kode: '00000010',
      namaBarang: 'MITUTOYO, 188-102 PITCH GAGE,',
      unit: 'SET',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '10',
      kode: '00000011',
      namaBarang: 'MITUTOYO, 172-116 STANDARD SCALE',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '1.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '11',
      kode: '00000012',
      namaBarang: 'MITUTOYO, 172-118 READING SCALE F',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '12',
      kode: '00000013',
      namaBarang: 'MITUTOYO, 122-103 BLADE',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '2,775,000.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '13',
      kode: '00000014',
      namaBarang: 'MITUTOYO, 124-173 GEAR TOOTH',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '14',
      kode: '00000015',
      namaBarang: 'MITUTOYO, 500-444 DIGITAL CALIPER',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '3,375,000.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '15',
      kode: '00000016',
      namaBarang: 'MITUTOYO, 368-907 HOLETEST SET',
      unit: 'SET',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '16',
      kode: '00000017',
      namaBarang: 'RUBERT, NO. 130 COMPOSITE SET OF',
      unit: 'PCS',
      merk: '',
      category: '',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '1.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '17',
      kode: '00000018',
      namaBarang: 'IMADA, KV-50N (SUCCESOR MODEL OF',
      unit: 'PCS',
      merk: '',
      category: '',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '18',
      kode: '00000019',
      namaBarang: 'MITUTOYO, 527-102 VERNIER DEPTH',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '2,275,000.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '19',
      kode: '00000020',
      namaBarang: 'MITUTOYO, 21AAA352 BALL POINT',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '20',
      kode: '00000021',
      namaBarang: 'MITUTOYO, 303613 EXTENSION ROD',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '21',
      kode: '00000022',
      namaBarang: 'MITUTOYO, 7321-B DIAL THICKNESS',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '22',
      kode: '00000023',
      namaBarang: 'IMADA, HV-500N II STAND',
      unit: 'PCS',
      merk: '',
      category: '',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '3.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '23',
      kode: '00000024',
      namaBarang: 'MITUTOYO, 103011 CONTACT POINT',
      unit: 'PCS',
      merk: 'MITUTOYO',
      category: 'PRODUCT',
      tipe: 'CONTACT POINT',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '24',
      kode: '00000025',
      namaBarang: 'AIR BOSS AB-1800 AIR IMPACT WRENCH',
      unit: 'UNIT',
      merk: '',
      category: '',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '25',
      kode: '00000026',
      namaBarang: 'AIR BOSS AB-1900P AIR IMPACT',
      unit: 'UNIT',
      merk: '',
      category: '',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '26',
      kode: '00000027',
      namaBarang: 'AIR BOSS AB-6PPH AIR SCREWDRIVER',
      unit: 'UNIT',
      merk: '',
      category: '',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '27',
      kode: '00000028',
      namaBarang: 'AIR BOSS AB-8SD AIR SCREWDRIVER',
      unit: 'UNIT',
      merk: '',
      category: '',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
    {
      id: '28',
      kode: '00000029',
      namaBarang: 'AIR BOSS AB-5602GL AIR IMPACT',
      unit: 'UNIT',
      merk: '',
      category: '',
      tipe: '',
      stock: '.',
      cost: '.',
      price: '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Description');
  const [filterSemua, setFilterSemua] = useState<string>('SEMUA-nya');

  // Modal for Add New
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newUnit, setNewUnit] = useState('PCS');
  const [newPrice, setNewPrice] = useState('');

  if (!isOpen) return null;

  const handleAddNew = () => {
    const nextCode = (barangList.length + 2).toString().padStart(8, '0');
    setNewKode(nextCode);
    setNewNama('');
    setNewUnit('PCS');
    setNewPrice('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNama.trim()) return;

    const newItem: BarangItem = {
      id: Date.now().toString(),
      kode: newKode.trim().toUpperCase(),
      namaBarang: newNama.trim().toUpperCase(),
      unit: newUnit.trim().toUpperCase(),
      merk: '',
      category: 'PRODUCT',
      tipe: '',
      stock: '.',
      cost: '.',
      price: newPrice.trim() || '.',
      disc: '.',
      qMin: '.',
      qtyPo: '.',
      qtySo: '.',
      notPrint: false,
    };
    setBarangList([newItem, ...barangList]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const toggleNotPrint = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBarangList(
      barangList.map((item) =>
        item.id === id ? { ...item, notPrint: !item.notPrint } : item
      )
    );
  };

  const filteredList = barangList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') {
      return item.kode.toLowerCase().includes(term);
    }
    return item.namaBarang.toLowerCase().includes(term);
  });

  return (
    <div
      id="master-barang-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none min-w-[750px] overflow-auto"
    >
      {/* 1. Black Top Banner: List Master Barang */}
      <div
        id="master-barang-banner"
        className="flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333] min-w-fit"
      >
        <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
          List Master Barang
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
            onClick={() => alert('Data Master Barang berhasil diexport ke format Excel')}
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
        id="master-barang-toolbar"
        className="flex items-center justify-between h-[52px] px-3 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans min-w-max overflow-x-auto"
      >
        <div className="flex items-center space-x-4">
          {/* Add New Button */}
          <button
            id="btn-add-new-barang"
            type="button"
            onClick={handleAddNew}
            className="w-[92px] h-[30px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:border-t-[#707070] active:border-l-[#707070] active:border-b-white active:border-r-white text-[11px] font-bold text-black hover:bg-[#F2EFE2] active:bg-[#DFDBD0] cursor-pointer shadow-sm"
          >
            Add New
          </button>

          {/* Search controls */}
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[11px] text-black">Search :</span>

            {/* Field selection combobox */}
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
                id="barang-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder=""
                className="w-full h-[24px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 text-[11px] font-sans outline-none focus:border-[#316AC5]"
              />
            </div>
          </div>
        </div>

        {/* Right filter dropdown: SEMUA-nya */}
        <div className="relative w-[180px] mr-2">
          <select
            value={filterSemua}
            onChange={(e) => setFilterSemua(e.target.value)}
            className="w-full h-[24px] bg-white border border-[#7F9DB9] text-[11px] px-2 pr-5 appearance-none outline-none font-sans focus:border-[#316AC5] cursor-pointer"
          >
            <option value="SEMUA-nya">SEMUA-nya</option>
            <option value="PRODUCT">PRODUCT</option>
            <option value="SERVICES">SERVICES</option>
          </select>
          <div className="absolute right-1 top-2 pointer-events-none text-[8px] text-black">
            ▼
          </div>
        </div>
      </div>

      {/* 3. Grid Workspace Section (with high-visibility yellow rows as in screenshot) */}
      <div className="flex-1 flex flex-col p-2 overflow-hidden bg-[#ECE9D8] min-h-[200px]">
        {/* Table Frame Box */}
        <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-white shadow-inner min-h-0">
          {/* Header Bar: "List" */}
          <div className="h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-bold text-black">
            List
          </div>

          {/* Table Data Grid with full horizontal & vertical scrolling */}
          <div className="flex-1 overflow-auto bg-[#F0EDE2]">
            <table className="min-w-[1350px] w-full border-collapse text-[11px] font-sans select-none">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                  <th className="w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                  <th className="w-[85px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">
                    Kode
                  </th>
                  <th className="w-[260px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px]">
                    Nama Barang
                  </th>
                  <th className="w-[50px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">
                    Unit
                  </th>
                  <th className="w-[80px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">
                    Merk
                  </th>
                  <th className="w-[85px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">
                    Category
                  </th>
                  <th className="w-[110px] border-r border-[#ACA899] px-1.5 py-1 text-left font-bold text-[11px]">
                    Tipe
                  </th>
                  <th className="w-[60px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">
                    Stock
                  </th>
                  <th className="w-[65px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">
                    Cost
                  </th>
                  <th className="w-[85px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">
                    Price
                  </th>
                  <th className="w-[45px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">
                    Disc
                  </th>
                  <th className="w-[50px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">
                    Q.Min
                  </th>
                  <th className="w-[55px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">
                    Qty.PO
                  </th>
                  <th className="w-[55px] border-r border-[#ACA899] px-1.5 py-1 text-right font-bold text-[11px]">
                    Qty.SO
                  </th>
                  <th className="w-[60px] border-r border-[#ACA899] px-1 py-1 text-center font-bold text-[11px]">
                    Not Print
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item) => {
                  const isSelected = selectedId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`h-[20px] border-b border-[#D6D6D6] cursor-pointer text-black ${
                        isSelected
                          ? 'bg-[#FFFF00] font-semibold'
                          : 'bg-[#FFFF00] hover:brightness-95'
                      }`}
                    >
                      {/* Left pointer column */}
                      <td className="w-[20px] border-r border-[#ACA899] text-center p-0 bg-[#ECE9D8]">
                        {isSelected ? (
                          <span className="text-[10px] font-bold leading-none inline-block">
                            ▶
                          </span>
                        ) : null}
                      </td>

                      {/* Kode */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] font-mono whitespace-nowrap">
                        {item.kode}
                      </td>

                      {/* Nama Barang */}
                      <td className="px-2 py-0.5 border-r border-[#ACA899] uppercase tracking-tight whitespace-nowrap">
                        {item.namaBarang}
                      </td>

                      {/* Unit */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">
                        {item.unit}
                      </td>

                      {/* Merk */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">
                        {item.merk}
                      </td>

                      {/* Category */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">
                        {item.category}
                      </td>

                      {/* Tipe */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] uppercase whitespace-nowrap">
                        {item.tipe}
                      </td>

                      {/* Stock */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">
                        {item.stock}
                      </td>

                      {/* Cost */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">
                        {item.cost}
                      </td>

                      {/* Price */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">
                        {item.price}
                      </td>

                      {/* Disc */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">
                        {item.disc}
                      </td>

                      {/* Q.Min */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">
                        {item.qMin}
                      </td>

                      {/* Qty.PO */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">
                        {item.qtyPo}
                      </td>

                      {/* Qty.SO */}
                      <td className="px-1.5 py-0.5 border-r border-[#ACA899] text-right whitespace-nowrap font-mono">
                        {item.qtySo}
                      </td>

                      {/* Not Print Checkbox */}
                      <td className="px-1 py-0.5 border-r border-[#ACA899] text-center">
                        <input
                          type="checkbox"
                          checked={item.notPrint}
                          onChange={() => {}}
                          onClick={(e) => toggleNotPrint(item.id, e)}
                          className="w-[12px] h-[12px] cursor-pointer align-middle"
                        />
                      </td>
                    </tr>
                  );
                })}

                {/* Empty Filler Rows */}
                {Array.from({ length: Math.max(0, 10 - filteredList.length) }).map(
                  (_, emptyIdx) => (
                    <tr
                      key={`empty-${emptyIdx}`}
                      className="h-[20px] bg-[#FFFF00] border-b border-[#D6D6D6]"
                    >
                      <td className="w-[20px] border-r border-[#ACA899] bg-[#ECE9D8]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
                      <td className="border-r border-[#ACA899]" />
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
              ? `Barang Terpilih: ${
                  barangList.find((b) => b.id === selectedId)?.namaBarang || '-'
                }`
              : ''}
          </div>

          {/* Record Count Indicator (matching 8273 from screenshot) */}
          <div className="flex items-center space-x-6 text-[12px] font-sans font-bold text-black pr-16">
            <span>Record</span>
            <span className="font-mono text-[13px]">8273</span>
          </div>
        </div>
      </div>

      {/* Add New Dialog Window */}
      {isAddOpen && (
        <div className="absolute inset-0 bg-black/25 flex items-center justify-center z-50 p-4">
          <div className="w-[420px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans">
            {/* Title Bar */}
            <div className="flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
              <span>Input Master Barang Baru</span>
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
                <label className="w-[100px] font-bold">Kode Barang :</label>
                <input
                  type="text"
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value)}
                  className="w-[140px] h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono font-bold uppercase outline-none focus:border-[#316AC5]"
                  required
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[100px] font-bold">Nama Barang :</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: MITUTOYO, VERNIER CALIPER"
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[100px] font-bold">Satuan (Unit) :</label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-[100px] h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none cursor-pointer"
                >
                  <option value="PCS">PCS</option>
                  <option value="SET">SET</option>
                  <option value="UNIT">UNIT</option>
                  <option value="BOX">BOX</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[100px] font-bold">Harga Jual :</label>
                <input
                  type="text"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Contoh: 2,775,000."
                  className="w-[160px] h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none font-mono"
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
