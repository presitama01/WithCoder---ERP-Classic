import React, { useState, useEffect, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  erpCreate,
  erpDelete,
  erpList,
  erpUpdate,
  fetchActiveCompanyProfile,
  formatMoney,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

export interface SupplierItem {
  id: string;
  kodeSupplier: string;
  namaSupplier: string;
  hutang: number;
  hutangGiro: number;
  alamat: string;
  kota: string;
  telepon: string;
}

interface MasterSupplierListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToItem(r: any): SupplierItem {
  return {
    id: r.id,
    kodeSupplier: r.kode_supplier || '',
    namaSupplier: r.nama_supplier || '',
    hutang: Number(r.hutang || 0),
    hutangGiro: Number(r.hutang_giro || 0),
    alamat: r.alamat || '',
    kota: r.kota || '',
    telepon: r.telepon || '',
  };
}

export const MasterSupplierListForm: React.FC<MasterSupplierListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [supplierList, setSupplierList] = useState<SupplierItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Supplier');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newHutang, setNewHutang] = useState('0');
  const [newHutangGiro, setNewHutangGiro] = useState('0');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('');
  const [newTelepon, setNewTelepon] = useState('');

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
      const rows = await erpList<any>('master_suppliers', { orderBy: 'kode_supplier', asc: true });
      const mapped = rows.map(mapDbToItem);
      setSupplierList(mapped);
      if (mapped.length > 0 && !mapped.some((s) => s.id === selectedId)) {
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
    setNewNama('');
    setNewHutang('0');
    setNewHutangGiro('0');
    setNewAlamat('');
    setNewKota('');
    setNewTelepon('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = supplierList.find((s) => s.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setNewKode(item.kodeSupplier);
    setNewNama(item.namaSupplier);
    setNewHutang(String(item.hutang));
    setNewHutangGiro(String(item.hutangGiro));
    setNewAlamat(item.alamat);
    setNewKota(item.kota);
    setNewTelepon(item.telepon);
    setIsAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      setIsBusy(true);
      await erpDelete('master_suppliers', selectedId);
      const updated = supplierList.filter((s) => s.id !== selectedId);
      setSupplierList(updated);
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
        kode_supplier: newKode.trim().toUpperCase(),
        nama_supplier: newNama.trim().toUpperCase(),
        hutang: parseFloat(newHutang) || 0,
        hutang_giro: parseFloat(newHutangGiro) || 0,
        alamat: newAlamat.trim(),
        kota: newKota.trim().toUpperCase(),
        telepon: newTelepon.trim(),
      };
      if (editingId) {
        const saved = await erpUpdate<any>('master_suppliers', editingId, dbPayload);
        const mapped = mapDbToItem(saved);
        setSupplierList(supplierList.map((s) => (s.id === editingId ? mapped : s)));
        showFeedback('Data diperbarui');
      } else {
        const saved = await erpCreate<any>('master_suppliers', dbPayload);
        const mapped = mapDbToItem(saved);
        setSupplierList([mapped, ...supplierList]);
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

  const filteredSupplier = supplierList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') return item.kodeSupplier.toLowerCase().includes(term);
    if (searchField === 'Kota') return item.kota.toLowerCase().includes(term);
    return item.namaSupplier.toLowerCase().includes(term);
  });

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Master_Supplier',
      sheetTitle: 'LIST MASTER SUPPLIER',
      companyProfile: company,
      columns: [
        { header: 'Kode', accessor: 'kodeSupplier' },
        { header: 'Nama Supplier', accessor: 'namaSupplier' },
        { header: 'Hutang', accessor: 'hutang', align: 'right' },
        { header: 'Hutang Giro', accessor: 'hutangGiro', align: 'right' },
        { header: 'Alamat', accessor: 'alamat' },
        { header: 'Kota', accessor: 'kota' },
        { header: 'Telepon', accessor: 'telepon' },
      ],
      rows: filteredSupplier,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  return (
    <div
      id="master-supplier-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Master Supplier"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadData}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 h-[44px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-3 space-x-2 overflow-x-auto">
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
          <div className="h-[22px] w-[1px] bg-[#ACA899] mx-1" />
          <button
            type="button"
            onClick={loadData}
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
              <option value="Nama Supplier">Nama Supplier</option>
              <option value="Kode">Kode</option>
              <option value="Kota">Kota</option>
            </select>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik kata kunci..."
              className="h-[22px] w-[150px] bg-white border border-[#7F9DB9] px-2 text-[11px]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white m-2 border border-[#ACA899] shadow-inner">
          <div className="min-w-max">
            <table className="w-full text-left text-[11px] border-collapse select-none">
              <thead className="sticky top-0 bg-[#ECE9D8] text-black font-semibold border-b border-[#ACA899]">
                <tr className="h-[24px]">
                  <th className="w-[20px] min-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0" />
                  <th className="w-[90px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kode</th>
                  <th className="w-[220px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Nama Supplier</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Hutang</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Hutang Giro</th>
                  <th className="w-[220px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Alamat</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kota</th>
                  <th className="w-[130px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Telepon</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplier.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handleEdit}
                      className={`h-[22px] border-b border-[#ACA899] cursor-pointer ${
                        isSelected ? 'bg-[#0A246A] text-white' : 'bg-white hover:bg-[#E8EEF8]'
                      }`}
                    >
                      <td className="w-[20px] min-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0">
                        {isSelected ? <span className="text-[10px] font-bold text-black">▶</span> : null}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold">{item.kodeSupplier}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] font-semibold">{item.namaSupplier}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-right font-mono">{item.hutang.toLocaleString('id-ID')}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899] text-right font-mono">{item.hutangGiro.toLocaleString('id-ID')}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.alamat}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.kota}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.telepon}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-[480px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl p-4 flex flex-col">
            <div className="bg-[#000080] text-white px-2 py-1 font-bold text-[12px] flex justify-between items-center mb-3">
              <span>{editingId ? 'Koreksi Master Supplier' : 'Tambah Master Supplier Baru'}</span>
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
                    placeholder="SUP01"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Nama Supplier:</label>
                  <input
                    type="text"
                    required
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Hutang (Rp):</label>
                  <input
                    type="number"
                    value={newHutang}
                    onChange={(e) => setNewHutang(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Hutang Giro (Rp):</label>
                  <input
                    type="number"
                    value={newHutangGiro}
                    onChange={(e) => setNewHutangGiro(e.target.value)}
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
                  <label className="block font-bold mb-1">Telepon:</label>
                  <input
                    type="text"
                    value={newTelepon}
                    onChange={(e) => setNewTelepon(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] font-bold cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] cursor-pointer"
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
        title="LAPORAN MASTER SUPPLIER"
        subtitle={`Total Record: ${filteredSupplier.length}`}
        orientation="landscape"
        columns={[
          { header: 'Kode', accessor: 'kodeSupplier', width: '75px' },
          { header: 'Nama Supplier', accessor: 'namaSupplier' },
          { header: 'Hutang', accessor: (r) => formatMoney(r.hutang), align: 'right', width: '110px' },
          { header: 'Hutang Giro', accessor: (r) => formatMoney(r.hutangGiro), align: 'right', width: '110px' },
          { header: 'Alamat', accessor: 'alamat' },
          { header: 'Kota', accessor: 'kota', width: '100px' },
          { header: 'Telepon', accessor: 'telepon', width: '100px' },
        ]}
        rows={filteredSupplier}
        summaryItems={[
          {
            label: 'Total Hutang',
            value: formatMoney(filteredSupplier.reduce((a, b) => a + b.hutang, 0)),
          },
          {
            label: 'Total Hutang Giro',
            value: formatMoney(filteredSupplier.reduce((a, b) => a + b.hutangGiro, 0)),
          },
        ]}
      />
    </div>
  );
};
