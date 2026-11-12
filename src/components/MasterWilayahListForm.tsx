import React, { useState, useEffect, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { erpCreate, erpDelete, erpList, erpUpdate, fetchActiveCompanyProfile } from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

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
  const [wilayahList, setWilayahList] = useState<WilayahItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Description');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newWilayah, setNewWilayah] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadData = async () => {
    try {
      setIsBusy(true);
      const rows = await erpList<any>('master_wilayahs', { orderBy: 'wilayah', asc: true });
      const mapped: WilayahItem[] = rows.map((r) => ({
        id: r.id,
        kodeWilayah: r.kode_wilayah,
        wilayah: r.wilayah,
      }));
      setWilayahList(mapped);
      if (mapped.length > 0 && !mapped.some((w) => w.id === selectedId)) {
        setSelectedId(mapped[0].id);
      }
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNew = () => {
    setEditingId(null);
    setNewKode('');
    setNewWilayah('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = wilayahList.find((w) => w.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setNewKode(item.kodeWilayah);
    setNewWilayah(item.wilayah);
    setIsAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      setIsBusy(true);
      await erpDelete('master_wilayahs', selectedId);
      const updated = wilayahList.filter((w) => w.id !== selectedId);
      setWilayahList(updated);
      setSelectedId(updated[0]?.id || '');
      showFeedback('Data dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newWilayah.trim()) return;

    try {
      setIsBusy(true);
      const dbPayload = {
        kode_wilayah: newKode.trim().toUpperCase(),
        wilayah: newWilayah.trim().toUpperCase(),
      };
      if (editingId) {
        const saved = await erpUpdate<any>('master_wilayahs', editingId, dbPayload);
        setWilayahList(
          wilayahList.map((w) =>
            w.id === editingId
              ? { id: saved.id, kodeWilayah: saved.kode_wilayah, wilayah: saved.wilayah }
              : w
          )
        );
        showFeedback('Data diperbarui');
      } else {
        const saved = await erpCreate<any>('master_wilayahs', dbPayload);
        const newItem: WilayahItem = {
          id: saved.id,
          kodeWilayah: saved.kode_wilayah,
          wilayah: saved.wilayah,
        };
        setWilayahList([newItem, ...wilayahList]);
        setSelectedId(newItem.id);
        showFeedback('Data tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filteredWilayah = wilayahList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') return item.kodeWilayah.toLowerCase().includes(term);
    return item.wilayah.toLowerCase().includes(term);
  });

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Master_Wilayah',
      sheetTitle: 'LIST MASTER WILAYAH',
      companyProfile: company,
      columns: [
        { header: 'Kode Wilayah', accessor: 'kodeWilayah' },
        { header: 'Wilayah', accessor: 'wilayah' },
      ],
      rows: filteredWilayah,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  return (
    <div
      id="master-wilayah-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          id="master-wilayah-banner"
          title="List Master Wilayah"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadData}
          onExportExcel={handleExportExcel}
        />

        <div
          id="master-wilayah-toolbar"
          className="shrink-0 flex items-center h-[48px] px-3 space-x-4 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans overflow-x-auto"
        >
          <FormActionButtons
            onSimpan={loadData}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleDelete}
            onPrint={() => setIsPrintOpen(true)}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />

          <div className="flex items-center space-x-2">
            <span className="font-bold text-[11px] text-black">Search :</span>

            <div className="relative">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="h-[24px] px-2 pr-6 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] font-sans font-medium text-black appearance-none outline-none cursor-pointer"
              >
                <option value="Description">Description</option>
                <option value="Kode">Kode Wilayah</option>
              </select>
              <div className="absolute right-1 top-2 pointer-events-none text-[8px] text-black">▼</div>
            </div>

            <div className="w-[340px]">
              <input
                ref={searchInputRef}
                id="wilayah-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik untuk FIND..."
                className="w-full h-[24px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 text-[11px] font-sans outline-none focus:border-[#316AC5]"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-2 overflow-hidden bg-[#ECE9D8]">
          <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-[#ECE9D8] overflow-hidden">
            <div className="shrink-0 h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-sans font-normal text-black select-none">
              List
            </div>

            <div id="master-wilayah-table-scroll" className="flex-1 overflow-auto bg-[#ECE9D8]">
              <table className="border-collapse text-[11px] font-sans select-none bg-white w-full">
                <thead>
                  <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                    <th className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                    <th className="w-[110px] min-w-[110px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">
                      Kode Wilayah
                    </th>
                    <th className="border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">
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
                        onDoubleClick={handleEdit}
                        className={`h-[22px] border-b border-[#ACA899] cursor-pointer ${
                          isSelected ? 'bg-[#0A246A] text-white' : 'bg-white hover:bg-[#EAF2FC]'
                        }`}
                      >
                        <td className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0">
                          {isSelected ? <span className="text-[10px] font-bold text-black leading-none inline-block">▶</span> : null}
                        </td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold">{item.kodeWilayah}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold uppercase">{item.wilayah}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-between mt-2 px-1 text-[11px] font-sans">
            <div className="w-[450px] h-[22px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 flex items-center text-gray-700">
              {selectedId ? `Wilayah Terpilih: ${wilayahList.find((w) => w.id === selectedId)?.wilayah || '-'}` : ''}
            </div>

            <div className="flex items-center space-x-6 text-[12px] font-sans text-black pr-28 font-bold">
              <span>Record</span>
              <span className="font-mono text-[12px]">{filteredWilayah.length}</span>
            </div>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div id="wilayah-add-modal-backdrop" className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div id="wilayah-add-modal-window" className="w-[380px] max-w-full flex flex-col bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans overflow-hidden my-auto">
            <div className="shrink-0 flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
              <span>{editingId ? 'Koreksi Master Wilayah' : 'Input Master Wilayah Baru'}</span>
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
                  disabled={isBusy}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] font-bold hover:bg-[#F2EFE2] cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] hover:bg-[#F2EFE2] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MASTER WILAYAH"
        subtitle={`Total Record: ${filteredWilayah.length}`}
        columns={[
          { header: 'Kode Wilayah', accessor: 'kodeWilayah', width: '130px' },
          { header: 'Wilayah', accessor: 'wilayah' },
        ]}
        rows={filteredWilayah}
      />
    </div>
  );
};
