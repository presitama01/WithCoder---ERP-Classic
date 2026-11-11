import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

export interface SalesItem {
  id: string;
  kodeSales: string;
  namaSales: string;
  alamat: string;
  kota: string;
  telepon: string;
  limit: number;
  komisi: number;
}

interface MasterSalesListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterSalesListForm: React.FC<MasterSalesListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [salesList, setSalesList] = useState<SalesItem[]>([
    {
      id: '1',
      kodeSales: 'SL01',
      namaSales: 'BUDI SANTOSO',
      alamat: 'Jl. Merdeka No. 10',
      kota: 'JAKARTA PUSAT',
      telepon: '081234567890',
      limit: 50000000,
      komisi: 2.5,
    },
    {
      id: '2',
      kodeSales: 'SL02',
      namaSales: 'SITI AMINAH',
      alamat: 'Jl. Sudirman No. 45',
      kota: 'BANDUNG',
      telepon: '081987654321',
      limit: 30000000,
      komisi: 2.0,
    },
    {
      id: '3',
      kodeSales: 'SL03',
      namaSales: 'HENDRA WIJAYA',
      alamat: 'Jl. Pemuda No. 12',
      kota: 'SURABAYA',
      telepon: '081333444555',
      limit: 40000000,
      komisi: 3.0,
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Sales');

  // Modal Add New
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('');
  const [newTelepon, setNewTelepon] = useState('');
  const [newLimit, setNewLimit] = useState('10000000');
  const [newKomisi, setNewKomisi] = useState('2.0');

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
    setNewTelepon('');
    setNewLimit('10000000');
    setNewKomisi('2.0');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = salesList.find((s) => s.id === selectedId);
    if (!item) return;
    setEditingId(item.id);
    setNewKode(item.kodeSales);
    setNewNama(item.namaSales);
    setNewAlamat(item.alamat);
    setNewKota(item.kota);
    setNewTelepon(item.telepon);
    setNewLimit(String(item.limit));
    setNewKomisi(String(item.komisi));
    setIsAddOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const updated = salesList.filter((s) => s.id !== selectedId);
    setSalesList(updated);
    setSelectedId(updated[0]?.id || '');
    showFeedback('Data dihapus');
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNama.trim()) return;

    const payload: SalesItem = {
      id: editingId || Date.now().toString(),
      kodeSales: newKode.trim().toUpperCase(),
      namaSales: newNama.trim().toUpperCase(),
      alamat: newAlamat.trim(),
      kota: newKota.trim().toUpperCase(),
      telepon: newTelepon.trim(),
      limit: parseFloat(newLimit) || 0,
      komisi: parseFloat(newKomisi) || 0,
    };
    if (editingId) {
      setSalesList(salesList.map((s) => (s.id === editingId ? payload : s)));
      showFeedback('Data diperbarui');
    } else {
      setSalesList([payload, ...salesList]);
      setSelectedId(payload.id);
      showFeedback('Data tersimpan');
    }
    setIsAddOpen(false);
    setEditingId(null);
  };

  const filteredSales = salesList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') {
      return item.kodeSales.toLowerCase().includes(term);
    } else if (searchField === 'Kota') {
      return item.kota.toLowerCase().includes(term);
    }
    return item.namaSales.toLowerCase().includes(term);
  });

  return (
    <div
      id="master-sales-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner */}
        <FormHeaderBanner
          title="List Master Sales"
          onClose={onClose}
          onExportExcel={() => showFeedback('Export Excel selesai')}
        />

        {/* 2. Toolbar / Action Ribbon */}
        <div className="shrink-0 h-[44px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-3 space-x-2 overflow-x-auto">
          <FormActionButtons
            onSimpan={() => showFeedback('Data Master Sales tersimpan')}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleDelete}
            feedback={feedback}
          />
          <div className="h-[22px] w-[1px] bg-[#ACA899] mx-1" />
          <button
            type="button"
            onClick={() => showFeedback('Data direfresh')}
            className="h-[28px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] cursor-pointer text-[11px] font-semibold text-black"
          >
            Refresh
          </button>

          <div className="ml-auto flex items-center space-x-2 text-[11px]">
            <span className="font-semibold text-black">Cari:</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-[22px] bg-white border border-[#7F9DB9] px-1 text-[11px]"
            >
              <option value="Nama Sales">Nama Sales</option>
              <option value="Kode">Kode</option>
              <option value="Kota">Kota</option>
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
                  <th className="w-[200px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Nama Sales</th>
                  <th className="w-[220px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Alamat</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kota</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Telepon</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Limit</th>
                  <th className="w-[100px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Komisi (%)</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((item) => {
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
                      <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold text-black">{item.kodeSales}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black font-semibold">{item.namaSales}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.alamat}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.kota}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-black">{item.telepon}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-right text-black font-mono">
                        {item.limit.toLocaleString('id-ID')}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-right text-black font-mono">
                        {item.komisi}%
                      </td>
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
              <span>{editingId ? 'Koreksi Master Sales' : 'Tambah Master Sales Baru'}</span>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-white hover:bg-red-600 px-1 font-bold cursor-pointer">✕</button>
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
                    placeholder="SL01"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Nama Sales:</label>
                  <input
                    type="text"
                    required
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                    placeholder="BUDI SANTOSO"
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
                  <label className="block font-bold mb-1">Telepon:</label>
                  <input
                    type="text"
                    value={newTelepon}
                    onChange={(e) => setNewTelepon(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Limit (Rp):</label>
                  <input
                    type="number"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Komisi (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newKomisi}
                    onChange={(e) => setNewKomisi(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
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
