import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setNewKode('');
    setNewNama('');
    setNewAlamat('');
    setNewKota('');
    setNewPhone1('');
    setNewPhone2('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = expedisiList.find((x) => x.id === selectedId);
    if (!item) return;
    setEditingId(item.id);
    setNewKode(item.kodeExpedisi);
    setNewNama(item.namaExpedisi);
    setNewAlamat(item.alamat);
    setNewKota(item.kota);
    setNewPhone1(item.phone1);
    setNewPhone2(item.phone2);
    setIsAddOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const updated = expedisiList.filter((x) => x.id !== selectedId);
    setExpedisiList(updated);
    setSelectedId(updated[0]?.id || '');
    showFeedback('Data dihapus');
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNama.trim()) return;

    const payload: ExpedisiItem = {
      id: editingId || Date.now().toString(),
      kodeExpedisi: newKode.trim().toUpperCase(),
      namaExpedisi: newNama.trim().toUpperCase(),
      alamat: newAlamat.trim(),
      kota: newKota.trim().toUpperCase(),
      phone1: newPhone1.trim(),
      phone2: newPhone2.trim(),
    };
    if (editingId) {
      setExpedisiList(expedisiList.map((x) => (x.id === editingId ? payload : x)));
      showFeedback('Data diperbarui');
    } else {
      setExpedisiList([payload, ...expedisiList]);
      setSelectedId(payload.id);
      showFeedback('Data tersimpan');
    }
    setIsAddOpen(false);
    setEditingId(null);
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

  return (
    <div
      id="master-expedisi-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner */}
        <FormHeaderBanner
          title="List Master Expedisi"
          onClose={onClose}
          onExportExcel={() => showFeedback('Export Excel selesai')}
        />

        {/* 2. Action & Search Bar */}
        <div className="shrink-0 flex items-center h-[48px] px-3 space-x-4 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans overflow-x-auto">
          <FormActionButtons
            onSimpan={() => showFeedback('Data Expedisi tersimpan')}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleDelete}
            feedback={feedback}
          />

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
              <span>{editingId ? 'Koreksi Master Expedisi' : 'Tambah Master Expedisi Baru'}</span>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-white hover:bg-red-600 px-1 font-bold cursor-pointer">✕</button>
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
