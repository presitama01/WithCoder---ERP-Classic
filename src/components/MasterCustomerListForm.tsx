import React, { useState } from 'react';

export interface CustomerItem {
  id: string;
  kodeCustomer: string;
  namaCustomer: string;
  piutang: number;
  piutangGiro: number;
  alamat: string;
  kota: string;
  phone: string;
  groupArea: string;
  sales: string;
}

interface MasterCustomerListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterCustomerListForm: React.FC<MasterCustomerListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [customerList, setCustomerList] = useState<CustomerItem[]>([
    {
      id: '1',
      kodeCustomer: 'CUST01',
      namaCustomer: 'TOKO BERKAH JAYA',
      piutang: 15000000,
      piutangGiro: 5000000,
      alamat: 'Jl. Perniagaan Timur No. 14',
      kota: 'JAKARTA BARAT',
      phone: '021-6677889',
      groupArea: 'JAKARTA',
      sales: 'BUDI SANTOSO',
    },
    {
      id: '2',
      kodeCustomer: 'CUST02',
      namaCustomer: 'TB. SUMBER MAKMUR',
      piutang: 8500000,
      piutangGiro: 0,
      alamat: 'Jl. Braga No. 88',
      kota: 'BANDUNG',
      phone: '022-4201122',
      groupArea: 'BANDUNG',
      sales: 'SITI AMINAH',
    },
    {
      id: '3',
      kodeCustomer: 'CUST03',
      namaCustomer: 'UD. SINAR TERANG',
      piutang: 25000000,
      piutangGiro: 10000000,
      alamat: 'Jl. Gajah Mada No. 45',
      kota: 'SURABAYA',
      phone: '031-5341234',
      groupArea: 'SURABAYA',
      sales: 'HENDRA WIJAYA',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');

  // Modal Add New
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newPiutang, setNewPiutang] = useState('0');
  const [newPiutangGiro, setNewPiutangGiro] = useState('0');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGroupArea, setNewGroupArea] = useState('');
  const [newSales, setNewSales] = useState('');

  if (!isOpen) return null;

  const handleAddNew = () => {
    setNewKode('');
    setNewNama('');
    setNewPiutang('0');
    setNewPiutangGiro('0');
    setNewAlamat('');
    setNewKota('');
    setNewPhone('');
    setNewGroupArea('');
    setNewSales('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNama.trim()) return;

    const newItem: CustomerItem = {
      id: Date.now().toString(),
      kodeCustomer: newKode.trim().toUpperCase(),
      namaCustomer: newNama.trim().toUpperCase(),
      piutang: parseFloat(newPiutang) || 0,
      piutangGiro: parseFloat(newPiutangGiro) || 0,
      alamat: newAlamat.trim(),
      kota: newKota.trim().toUpperCase(),
      phone: newPhone.trim(),
      groupArea: newGroupArea.trim().toUpperCase(),
      sales: newSales.trim().toUpperCase(),
    };
    setCustomerList([newItem, ...customerList]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const filteredCustomer = customerList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') {
      return item.kodeCustomer.toLowerCase().includes(term);
    } else if (searchField === 'Kota') {
      return item.kota.toLowerCase().includes(term);
    } else if (searchField === 'Sales') {
      return item.sales.toLowerCase().includes(term);
    }
    return item.namaCustomer.toLowerCase().includes(term);
  });

  return (
    <div
      id="master-customer-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner */}
        <div className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]">
          <div className="flex items-center space-x-3">
            <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
              List Master Pelanggan
            </span>
          </div>

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
              onClick={onClose}
              className="w-[22px] h-[22px] bg-[#c00000] hover:bg-red-700 text-white font-bold border border-white/80 rounded-[1px] flex items-center justify-center text-[12px] cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Toolbar / Action Ribbon */}
        <div className="shrink-0 h-[38px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-2 space-x-1">
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-green-700 font-bold">＋</span>
            <span className="text-black font-semibold">Baru</span>
          </button>
          <button
            onClick={() => {
              const item = customerList.find(c => c.id === selectedId);
              if (item) alert(`Edit: ${item.namaCustomer}`);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-blue-700 font-bold">✎</span>
            <span className="text-black font-semibold">Koreksi</span>
          </button>
          <button
            onClick={() => {
              if (confirm('Hapus data pelanggan terpilih?')) {
                setCustomerList(customerList.filter(c => c.id !== selectedId));
              }
            }}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-red-700 font-bold">🗑</span>
            <span className="text-black font-semibold">Hapus</span>
          </button>
          <div className="h-[20px] w-[1px] bg-[#ACA899] mx-1" />
          <button
            onClick={() => alert('Data direfresh')}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#ECE9D8] hover:bg-[#FFE7A2] border border-[#707070] rounded-[2px] active:border-black cursor-pointer text-[11px]"
          >
            <span className="text-black font-semibold">Refresh</span>
          </button>

          <div className="ml-auto flex items-center space-x-2 text-[11px]">
            <span className="font-semibold text-black">Cari:</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-[22px] bg-white border border-[#7F9DB9] px-1 text-[11px]"
            >
              <option value="Nama Pelanggan">Nama Pelanggan</option>
              <option value="Kode">Kode</option>
              <option value="Kota">Kota</option>
              <option value="Sales">Sales</option>
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik kata kunci..."
              className="h-[22px] w-[150px] bg-white border border-[#7F9DB9] px-2 text-[11px]"
            />
          </div>
        </div>

        {/* 3. Data Table Grid */}
        <div className="flex-1 overflow-auto bg-white m-2 border border-[#ACA899] shadow-inner">
          <div className="min-w-max">
            <table className="w-full text-left text-[11px] border-collapse select-none">
              <thead className="sticky top-0 bg-[#ECE9D8] text-black font-semibold border-b border-[#ACA899]">
                <tr className="h-[24px]">
                  <th className="w-[20px] min-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0"></th>
                  <th className="w-[90px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kode</th>
                  <th className="w-[220px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Nama Pelanggan</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Piutang</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Piutang Giro</th>
                  <th className="w-[220px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Alamat</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kota</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Phone</th>
                  <th className="w-[130px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Group Area</th>
                  <th className="w-[140px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Sales</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomer.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className="h-[22px] border-b border-[#ACA899] bg-white cursor-pointer hover:bg-[#E8EEF8]"
                    >
                      <td className="w-[20px] min-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0">
                        {isSelected ? <span className="text-[10px] font-bold text-black">▶</span> : null}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold text-black">{item.kodeCustomer}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black font-semibold">{item.namaCustomer}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-right text-black font-mono">
                        {item.piutang.toLocaleString('id-ID')}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-right text-black font-mono">
                        {item.piutangGiro.toLocaleString('id-ID')}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.alamat}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.kota}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.phone}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.groupArea}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.sales}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add New Modal */}
      {isAddOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-[480px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl p-4 flex flex-col">
            <div className="bg-[#000080] text-white px-2 py-1 font-bold text-[12px] flex justify-between items-center mb-3">
              <span>Tambah Master Pelanggan Baru</span>
              <button onClick={() => setIsAddOpen(false)} className="text-white hover:bg-red-600 px-1 font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveNew} className="space-y-2.5 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Kode:</label>
                  <input
                    type="text"
                    required
                    value={newKode}
                    onChange={(e) => setNewKode(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                    placeholder="CUST01"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Nama Pelanggan:</label>
                  <input
                    type="text"
                    required
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                    placeholder="TOKO BERKAH"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Piutang (Rp):</label>
                  <input
                    type="number"
                    value={newPiutang}
                    onChange={(e) => setNewPiutang(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Piutang Giro (Rp):</label>
                  <input
                    type="number"
                    value={newPiutangGiro}
                    onChange={(e) => setNewPiutangGiro(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Alamat:</label>
                <input
                  type="text"
                  value={newAlamat}
                  onChange={(e) => setNewAlamat(e.target.value)}
                  className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Kota:</label>
                  <input
                    type="text"
                    value={newKota}
                    onChange={(e) => setNewKota(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Phone:</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Group Area:</label>
                  <input
                    type="text"
                    value={newGroupArea}
                    onChange={(e) => setNewGroupArea(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                    placeholder="JAKARTA"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Sales:</label>
                  <input
                    type="text"
                    value={newSales}
                    onChange={(e) => setNewSales(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                    placeholder="BUDI SANTOSO"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] font-bold active:border-t-[#707070] active:border-b-white cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:border-t-[#707070] active:border-b-white cursor-pointer"
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
