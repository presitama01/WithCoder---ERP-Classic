import React, { useState } from 'react';

export interface ExpedisiItem {
  id: string;
  kodeExpedisi: string;
  namaExpedisi: string;
  alamat: string;
  kota: string;
  phone1: string;
  phone2: string;
}

interface MasterExpedisiListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterExpedisiListForm: React.FC<MasterExpedisiListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [expedisiList, setExpedisiList] = useState<ExpedisiItem[]>([
    {
      id: '1',
      kodeExpedisi: 'JNE',
      namaExpedisi: 'JALUR NUGRAHA EKAKURIR (JNE)',
      alamat: 'Jl. Tomang Raya No. 11',
      kota: 'JAKARTA BARAT',
      phone1: '021-5665262',
      phone2: '021-5671412',
    },
    {
      id: '2',
      kodeExpedisi: 'TIKI',
      namaExpedisi: 'TITIPAN KILAT (TIKI)',
      alamat: 'Jl. Raden Saleh No. 2',
      kota: 'JAKARTA PUSAT',
      phone1: '021-3140404',
      phone2: '021-3909505',
    },
    {
      id: '3',
      kodeExpedisi: 'SICEPAT',
      namaExpedisi: 'SICEPAT EXPRESS',
      alamat: 'Jl. Cideng Timur No. 56',
      kota: 'JAKARTA PUSAT',
      phone1: '021-50200505',
      phone2: '',
    },
    {
      id: '4',
      kodeExpedisi: 'JNT',
      namaExpedisi: 'J&T EXPRESS',
      alamat: 'Pluit Penjaringan',
      kota: 'JAKARTA UTARA',
      phone1: '021-80661888',
      phone2: '',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Expedisi');

  // Modal Add New
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('');
  const [newPhone1, setNewPhone1] = useState('');
  const [newPhone2, setNewPhone2] = useState('');

  if (!isOpen) return null;

  const handleAddNew = () => {
    setNewKode('');
    setNewNama('');
    setNewAlamat('');
    setNewKota('');
    setNewPhone1('');
    setNewPhone2('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNama.trim()) return;

    const newItem: ExpedisiItem = {
      id: Date.now().toString(),
      kodeExpedisi: newKode.trim().toUpperCase(),
      namaExpedisi: newNama.trim().toUpperCase(),
      alamat: newAlamat.trim(),
      kota: newKota.trim().toUpperCase(),
      phone1: newPhone1.trim(),
      phone2: newPhone2.trim(),
    };
    setExpedisiList([newItem, ...expedisiList]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const filteredExpedisi = expedisiList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') {
      return item.kodeExpedisi.toLowerCase().includes(term);
    } else if (searchField === 'Kota') {
      return item.kota.toLowerCase().includes(term);
    }
    return item.namaExpedisi.toLowerCase().includes(term);
  });

  const sqlQueryCode = `-- SQL Query untuk Supabase - Master Expedisi
CREATE TABLE IF NOT EXISTS public.master_expedisi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_expedisi VARCHAR(50) NOT NULL UNIQUE,
    nama_expedisi VARCHAR(150) NOT NULL,
    alamat TEXT,
    kota VARCHAR(100),
    phone1 VARCHAR(50),
    phone2 VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);`;

  return (
    <div
      id="master-expedisi-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner */}
        <div className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]">
          <div className="flex items-center space-x-3">
            <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
              List Master Expedisi
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
              title="Export Excel"
              onClick={() => alert('Data Master Expedisi berhasil diexport ke format Excel')}
              className="w-[24px] h-[22px] bg-[#1E7145] border border-white/80 rounded-[1px] flex items-center justify-center hover:brightness-110 cursor-pointer"
            >
              <span className="text-[11px] font-bold text-white font-sans">X</span>
            </button>
          </div>
        </div>

        {/* 2. Action & Search Bar */}
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
              <option value="Nama Expedisi">Nama Expedisi</option>
              <option value="Kode">Kode Expedisi</option>
              <option value="Kota">Kota</option>
            </select>
            <div className="w-[300px]">
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

            <div className="flex-1 overflow-auto bg-[#ECE9D8]">
              <table className="w-full border-collapse text-[11px] font-sans select-none bg-white">
                <thead>
                  <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                    <th className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                    <th className="w-[100px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">
                      Kode
                    </th>
                    <th className="w-[240px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">
                      Nama Expedisi
                    </th>
                    <th className="w-[260px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">
                      Alamat
                    </th>
                    <th className="w-[130px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">
                      Kota
                    </th>
                    <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">
                      Phone 1
                    </th>
                    <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">
                      Phone 2
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpedisi.map((item) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className="h-[22px] border-b border-[#ACA899] bg-white cursor-pointer"
                      >
                        <td className="w-[20px] min-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0">
                          {isSelected ? <span className="text-[10px] font-bold text-black">▶</span> : null}
                        </td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold text-black">{item.kodeExpedisi}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-black font-semibold">{item.namaExpedisi}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.alamat}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.kota}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.phone1}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.phone2}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Modal */}
      {isAddOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-[450px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl p-4 flex flex-col">
            <div className="bg-[#000080] text-white px-2 py-1 font-bold text-[12px] flex justify-between items-center mb-3">
              <span>Tambah Master Expedisi Baru</span>
              <button onClick={() => setIsAddOpen(false)} className="text-white hover:bg-red-600 px-1 font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveNew} className="space-y-3 text-[11px]">
              <div>
                <label className="block font-bold mb-1">Kode Expedisi:</label>
                <input
                  type="text"
                  required
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value)}
                  className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                  placeholder="Contoh: JNE, TIKI"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Nama Expedisi:</label>
                <input
                  type="text"
                  required
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                  placeholder="Contoh: JALUR NUGRAHA EKAKURIR"
                />
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
                  <label className="block font-bold mb-1">Phone 1:</label>
                  <input
                    type="text"
                    value={newPhone1}
                    onChange={(e) => setNewPhone1(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Phone 2:</label>
                <input
                  type="text"
                  value={newPhone2}
                  onChange={(e) => setNewPhone2(e.target.value)}
                  className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                />
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
