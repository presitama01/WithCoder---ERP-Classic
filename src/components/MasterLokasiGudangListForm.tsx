import React, { useState, useEffect, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { erpCreate, erpDelete, erpList, erpUpdate, fetchActiveCompanyProfile } from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

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

function mapDbToItem(r: any): LokasiGudangItem {
  return {
    id: r.id,
    kode: r.kode || '',
    namaLokasi: r.nama_lokasi || '',
    alamat: r.alamat || '',
    kota: r.kota || '',
    telepon1: r.telepon1 || '',
    telepon2: r.telepon2 || '',
    fax: r.fax || '',
    pic: r.pic || '',
    keterangan: r.keterangan || '',
  };
}

export const MasterLokasiGudangListForm: React.FC<MasterLokasiGudangListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [lokasiList, setLokasiList] = useState<LokasiGudangItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Description');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('JAKARTA');
  const [newTelp1, setNewTelp1] = useState('');
  const [newTelp2, setNewTelp2] = useState('');
  const [newFax, setNewFax] = useState('');
  const [newPic, setNewPic] = useState('');
  const [newKeterangan, setNewKeterangan] = useState('');

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
      const rows = await erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true });
      const mapped = rows.map(mapDbToItem);
      setLokasiList(mapped);
      if (mapped.length > 0 && !mapped.some((l) => l.id === selectedId)) {
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
    const nextCode = (lokasiList.length + 1).toString().padStart(2, '0');
    setEditingId(null);
    setNewKode(nextCode);
    setNewNama('');
    setNewAlamat('');
    setNewKota('JAKARTA');
    setNewTelp1('');
    setNewTelp2('');
    setNewFax('');
    setNewPic('');
    setNewKeterangan('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = lokasiList.find((l) => l.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setNewKode(item.kode);
    setNewNama(item.namaLokasi);
    setNewAlamat(item.alamat);
    setNewKota(item.kota);
    setNewTelp1(item.telepon1);
    setNewTelp2(item.telepon2);
    setNewFax(item.fax || '');
    setNewPic(item.pic || '');
    setNewKeterangan(item.keterangan || '');
    setIsAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      setIsBusy(true);
      await erpDelete('master_lokasi_gudangs', selectedId);
      const updated = lokasiList.filter((l) => l.id !== selectedId);
      setLokasiList(updated);
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
    if (!newKode.trim() || !newNama.trim()) return;

    try {
      setIsBusy(true);
      const dbPayload = {
        kode: newKode.trim().toUpperCase(),
        nama_lokasi: newNama.trim().toUpperCase(),
        alamat: newAlamat.trim().toUpperCase(),
        kota: newKota.trim().toUpperCase(),
        telepon1: newTelp1.trim(),
        telepon2: newTelp2.trim(),
        fax: newFax.trim(),
        pic: newPic.trim().toUpperCase(),
        keterangan: newKeterangan.trim().toUpperCase(),
      };
      if (editingId) {
        const saved = await erpUpdate<any>('master_lokasi_gudangs', editingId, dbPayload);
        const mapped = mapDbToItem(saved);
        setLokasiList(lokasiList.map((l) => (l.id === editingId ? mapped : l)));
        showFeedback('Data diperbarui');
      } else {
        const saved = await erpCreate<any>('master_lokasi_gudangs', dbPayload);
        const mapped = mapDbToItem(saved);
        setLokasiList([...lokasiList, mapped]);
        setSelectedId(mapped.id);
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

  const filteredLokasi = lokasiList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') return item.kode.toLowerCase().includes(term);
    return item.namaLokasi.toLowerCase().includes(term) || item.kota.toLowerCase().includes(term);
  });

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Master_Lokasi_Gudang',
      sheetTitle: 'LIST MASTER LOKASI GUDANG',
      companyProfile: company,
      columns: [
        { header: 'Kode', accessor: 'kode' },
        { header: 'Nama Lokasi', accessor: 'namaLokasi' },
        { header: 'Alamat', accessor: 'alamat' },
        { header: 'Kota', accessor: 'kota' },
        { header: 'Telepon 1', accessor: 'telepon1' },
        { header: 'Telepon 2', accessor: 'telepon2' },
      ],
      rows: filteredLokasi,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  return (
    <div
      id="master-lokasi-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          id="master-lokasi-banner"
          title="List Master Lokasi Gudang"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadData}
          onExportExcel={handleExportExcel}
        />

        <div
          id="master-lokasi-toolbar"
          className="flex items-center h-[48px] px-3 space-x-4 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans overflow-x-auto"
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
                <option value="Kode">Kode</option>
              </select>
              <div className="absolute right-1 top-2 pointer-events-none text-[8px] text-black">▼</div>
            </div>

            <div className="w-[340px]">
              <input
                ref={searchInputRef}
                id="lokasi-search-input"
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

            <div id="master-lokasi-table-scroll" className="flex-1 overflow-auto bg-[#ECE9D8]">
              <table className="border-collapse text-[11px] font-sans select-none bg-white w-full">
                <thead>
                  <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                    <th className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                    <th className="w-[64px] min-w-[64px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Kode</th>
                    <th className="w-[150px] min-w-[150px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Nama Lokasi</th>
                    <th className="w-[260px] min-w-[260px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Alamat</th>
                    <th className="w-[140px] min-w-[140px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Kota</th>
                    <th className="w-[110px] min-w-[110px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Telepon1</th>
                    <th className="w-[110px] min-w-[110px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Telepon2</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLokasi.map((item) => {
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
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold">{item.kode}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold uppercase">{item.namaLokasi}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.alamat}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold uppercase">{item.kota}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.telepon1}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.telepon2}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-between mt-2 px-1 text-[11px] font-sans">
            <div className="w-[450px] h-[22px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 flex items-center text-gray-700">
              {selectedId ? `Lokasi Terpilih: ${lokasiList.find((l) => l.id === selectedId)?.namaLokasi || '-'}` : ''}
            </div>

            <div className="flex items-center space-x-6 text-[12px] font-sans text-black pr-28 font-bold">
              <span>Record</span>
              <span className="font-mono text-[12px]">{filteredLokasi.length}</span>
            </div>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div id="lokasi-add-modal-backdrop" className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div id="lokasi-add-modal-window" className="w-[440px] max-w-full flex flex-col bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans overflow-hidden my-auto">
            <div className="shrink-0 flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
              <span>{editingId ? 'Koreksi Lokasi Gudang' : 'Input Lokasi Gudang Baru'}</span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-[16px] h-[15px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="p-4 space-y-2.5 text-[11px] text-black">
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
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Kota :</label>
                <input
                  type="text"
                  value={newKota}
                  onChange={(e) => setNewKota(e.target.value)}
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Telepon 1 :</label>
                <input
                  type="text"
                  value={newTelp1}
                  onChange={(e) => setNewTelp1(e.target.value)}
                  className="w-[180px] h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none font-mono"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Telepon 2 :</label>
                <input
                  type="text"
                  value={newTelp2}
                  onChange={(e) => setNewTelp2(e.target.value)}
                  className="w-[180px] h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none font-mono"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Fax :</label>
                <input
                  type="text"
                  value={newFax}
                  onChange={(e) => setNewFax(e.target.value)}
                  className="w-[180px] h-[22px] bg-white border border-[#7F9DB9] px-2 outline-none font-mono"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Penanggung Jawab :</label>
                <input
                  type="text"
                  value={newPic}
                  onChange={(e) => setNewPic(e.target.value)}
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold">Keterangan :</label>
                <input
                  type="text"
                  value={newKeterangan}
                  onChange={(e) => setNewKeterangan(e.target.value)}
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#ACA899]">
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
        title="LAPORAN MASTER LOKASI GUDANG"
        subtitle={`Total Record: ${filteredLokasi.length}`}
        columns={[
          { header: 'Kode', accessor: 'kode', width: '60px' },
          { header: 'Nama Lokasi', accessor: 'namaLokasi', width: '130px' },
          { header: 'Alamat', accessor: 'alamat' },
          { header: 'Kota', accessor: 'kota', width: '100px' },
          { header: 'Telepon', accessor: 'telepon1', width: '100px' },
        ]}
        rows={filteredLokasi}
      />
    </div>
  );
};
