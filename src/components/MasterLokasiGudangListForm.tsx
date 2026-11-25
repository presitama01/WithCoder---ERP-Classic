import React, { useState, useEffect, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { erpCreate, erpDelete, erpList, erpUpdate, fetchActiveCompanyProfile, nextUniqueCode } from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';
import { ConfirmDialog } from './ConfirmDialog';
import { cascadeMasterRename, checkMasterUsage, isMissingColumnError } from '../lib/masterValidation';

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
  isDefault: boolean;
  isActive: boolean;
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
    isDefault: Boolean(r.is_default),
    isActive: r.is_active !== false,
  };
}

export const MasterLokasiGudangListForm: React.FC<MasterLokasiGudangListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [lokasiList, setLokasiList] = useState<LokasiGudangItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [isFindOpen, setIsFindOpen] = useState(false);

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
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [newIsActive, setNewIsActive] = useState(true);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'kode',
    'Nama Lokasi': 'nama_lokasi',
    Kota: 'kota',
    'Penanggung Jawab': 'pic',
  };

  const loadData = async (opts?: { field?: string; term?: string }): Promise<LokasiGudangItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = { orderBy: 'kode', asc: true, limit: 1000 };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'kode,nama_lokasi,alamat,kota,telepon1,telepon2,fax,pic,keterangan';
          queryOpts.searchVal = activeTerm;
        }
      }
      const rows = await erpList<any>('master_lokasi_gudangs', queryOpts);
      const mapped = rows.map(mapDbToItem);
      setLokasiList(mapped);
      if (mapped.length > 0 && !mapped.some((l) => l.id === selectedId)) {
        setSelectedId(mapped[0].id);
      } else if (mapped.length === 0) {
        setSelectedId('');
      }
      return mapped;
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarSimpan = async () => {
    const selected = lokasiList.find((l) => l.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record yang akan disimpan terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const basePayload = {
        kode: selected.kode.trim().toUpperCase(),
        nama_lokasi: selected.namaLokasi.trim().toUpperCase(),
        alamat: selected.alamat.trim().toUpperCase(),
        kota: selected.kota.trim().toUpperCase(),
        telepon1: selected.telepon1.trim(),
        telepon2: selected.telepon2.trim(),
        fax: (selected.fax || '').trim(),
        pic: (selected.pic || '').trim().toUpperCase(),
        keterangan: (selected.keterangan || '').trim(),
      };
      let saved: any;
      let usedFallback = false;
      try {
        saved = await erpUpdate<any>('master_lokasi_gudangs', selected.id, {
          ...basePayload,
          is_default: selected.isDefault,
          is_active: selected.isActive,
        });
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          saved = await erpUpdate<any>('master_lokasi_gudangs', selected.id, basePayload);
        } else {
          throw err;
        }
      }
      const mapped = mapDbToItem(saved);
      setLokasiList((prev) => prev.map((l) => (l.id === selected.id ? mapped : l)));
      showFeedback(
        usedFallback
          ? `Lokasi Gudang [${mapped.kode}] tersimpan (jalankan SQL migrasi untuk kolom tambahan)`
          : `Lokasi Gudang [${mapped.kode} - ${mapped.namaLokasi}] tersimpan ke Supabase`
      );
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNew = () => {
    const nextCode = nextUniqueCode(lokasiList.map((l) => l.kode), '', 2);
    setEditingId(null);
    setModalError(null);
    setNewKode(nextCode);
    setNewNama('');
    setNewAlamat('');
    setNewKota('JAKARTA');
    setNewTelp1('');
    setNewTelp2('');
    setNewFax('');
    setNewPic('');
    setNewKeterangan('');
    setNewIsDefault(false);
    setNewIsActive(true);
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = lokasiList.find((l) => l.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewKode(item.kode);
    setNewNama(item.namaLokasi);
    setNewAlamat(item.alamat);
    setNewKota(item.kota);
    setNewTelp1(item.telepon1);
    setNewTelp2(item.telepon2);
    setNewFax(item.fax || '');
    setNewPic(item.pic || '');
    setNewKeterangan(item.keterangan || '');
    setNewIsDefault(Boolean(item.isDefault));
    setNewIsActive(item.isActive !== false);
    setIsAddOpen(true);
  };

  const handleRequestDelete = async () => {
    const item = lokasiList.find((l) => l.id === selectedId);
    if (!item) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    try {
      setIsBusy(true);
      const formattedLabel = `${item.kode} - ${item.namaLokasi}`;
      const usageMsg = await checkMasterUsage([
        { table: 'purchase_requests', label: 'Purchase Request', ilike: { lokasi_stock: item.namaLokasi } },
        { table: 'purchase_orders', label: 'Purchase Order', ilike: { delivery_to: item.namaLokasi } },
        { table: 'sales_orders', label: 'Sales Order', ilike: { lokasi_stock: item.namaLokasi } },
        { table: 'faktur_penjualans', label: 'Faktur Penjualan', ilike: { lokasi_stock: item.namaLokasi } },
        { table: 'stock_awal', label: 'Stock Awal', eq: { lokasi: formattedLabel } },
      ]);
      if (usageMsg) {
        showFeedback(usageMsg);
        return;
      }
      setConfirmDeleteOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal cek referensi: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedId) return;
    try {
      setIsBusy(true);
      await erpDelete('master_lokasi_gudangs', selectedId);
      const updated = lokasiList.filter((l) => l.id !== selectedId);
      setLokasiList(updated);
      setSelectedId(updated[0]?.id || '');
      setConfirmDeleteOpen(false);
      showFeedback('Data lokasi gudang dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const cleanKode = newKode.trim().toUpperCase();
    const cleanNama = newNama.trim().toUpperCase();
    if (!cleanKode || !cleanNama) {
      setModalError('Kode Lokasi dan Nama Lokasi wajib diisi.');
      return;
    }
    if (lokasiList.some((l) => l.kode.toUpperCase() === cleanKode && l.id !== editingId)) {
      setModalError(`Kode Lokasi [${cleanKode}] sudah terdaftar.`);
      return;
    }

    try {
      setIsBusy(true);
      const basePayload = {
        kode: cleanKode,
        nama_lokasi: cleanNama,
        alamat: newAlamat.trim().toUpperCase(),
        kota: newKota.trim().toUpperCase(),
        telepon1: newTelp1.trim(),
        telepon2: newTelp2.trim(),
        fax: newFax.trim(),
        pic: newPic.trim().toUpperCase(),
        keterangan: newKeterangan.trim(),
      };
      const fullPayload = {
        ...basePayload,
        is_default: newIsDefault,
        is_active: newIsActive,
      };
      let saved: any;
      let usedFallback = false;
      const saveFn = async (payload: Record<string, any>) =>
        editingId
          ? erpUpdate<any>('master_lokasi_gudangs', editingId, payload)
          : erpCreate<any>('master_lokasi_gudangs', payload);
      try {
        saved = await saveFn(fullPayload);
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          saved = await saveFn(basePayload);
        } else {
          throw err;
        }
      }
      const mapped = mapDbToItem(saved);
      if (editingId) {
        const prevItem = lokasiList.find((l) => l.id === editingId);
        setLokasiList((prev) =>
          prev
            .map((l) => (l.id === editingId ? mapped : l))
            .sort((a, b) => a.kode.localeCompare(b.kode))
        );
        if (prevItem && prevItem.namaLokasi !== mapped.namaLokasi) {
          const oldFormatted = `${prevItem.kode} - ${prevItem.namaLokasi}`;
          const newFormatted = `${mapped.kode} - ${mapped.namaLokasi}`;
          await Promise.all([
            cascadeMasterRename('purchase_requests', 'lokasi_stock', oldFormatted, { lokasi_stock: newFormatted }),
            cascadeMasterRename('sales_orders', 'lokasi_stock', oldFormatted, { lokasi_stock: newFormatted }),
            cascadeMasterRename('faktur_penjualans', 'lokasi_stock', oldFormatted, { lokasi_stock: newFormatted }),
          ]);
        }
        showFeedback(
          usedFallback
            ? 'Data diperbarui (jalankan SQL migrasi untuk kolom is_default / is_active)'
            : 'Data diperbarui'
        );
      } else {
        setLokasiList((prev) => [...prev, mapped].sort((a, b) => a.kode.localeCompare(b.kode)));
        setSelectedId(mapped.id);
        showFeedback(
          usedFallback
            ? 'Data tersimpan (jalankan SQL migrasi untuk kolom is_default / is_active)'
            : 'Data tersimpan'
        );
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan data ke database';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filteredLokasi = lokasiList.filter((item) => {
    if (searchField === 'Kode') return matchesMultiKeyword([item.kode], searchTerm);
    if (searchField === 'Nama Lokasi') return matchesMultiKeyword([item.namaLokasi], searchTerm);
    if (searchField === 'Kota') return matchesMultiKeyword([item.kota], searchTerm);
    if (searchField === 'Penanggung Jawab') return matchesMultiKeyword([item.pic], searchTerm);
    return matchesMultiKeyword(
      [item.kode, item.namaLokasi, item.alamat, item.kota, item.telepon1, item.telepon2, item.fax, item.pic, item.keterangan],
      searchTerm
    );
  });

  const selectedLokasi =
    filteredLokasi.find((l) => l.id === selectedId) ||
    lokasiList.find((l) => l.id === selectedId) ||
    null;

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Lokasi Gudang dari Supabase`
          : 'Data Lokasi Gudang tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Lokasi Gudang)`);
  };

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
        { header: 'Fax', accessor: (r) => r.fax || '' },
        { header: 'Penanggung Jawab', accessor: (r) => r.pic || '' },
        { header: 'Keterangan', accessor: (r) => r.keterangan || '' },
      ],
      rows: filteredLokasi,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
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
          onTableView={() => loadData({ field: searchField, term: searchTerm })}
          onExportExcel={handleExportExcel}
        />

        <div
          id="master-lokasi-toolbar"
          className="flex items-center h-[48px] px-3 space-x-3 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans overflow-x-auto"
        >
          <FormActionButtons
            onSimpan={handleToolbarSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleRequestDelete}
            onPrint={() => setIsPrintOpen(true)}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />

          <ToolbarSearchControl
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onCari={handleExecuteCari}
            onReset={handleResetCari}
            inputRef={searchInputRef}
            isBusy={isBusy}
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode' },
              { value: 'Nama Lokasi', label: 'Nama Lokasi' },
              { value: 'Kota', label: 'Kota' },
              { value: 'Penanggung Jawab', label: 'Penanggung Jawab' },
            ]}
          />
        </div>

        <div className="flex-1 flex flex-col p-2 overflow-hidden bg-[#ECE9D8]">
          <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-[#ECE9D8] overflow-hidden">
            <div className="shrink-0 h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-sans font-normal text-black select-none">
              List
            </div>

            <div id="master-lokasi-table-scroll" className="flex-1 overflow-auto bg-[#ECE9D8]">
              <table className="border-collapse text-[11px] font-sans select-none bg-white w-full min-w-[1180px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                    <th className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                    <th className="w-[64px] min-w-[64px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Kode</th>
                    <th className="w-[150px] min-w-[150px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Nama Lokasi</th>
                    <th className="w-[230px] min-w-[230px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Alamat</th>
                    <th className="w-[115px] min-w-[115px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Kota</th>
                    <th className="w-[105px] min-w-[105px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Telepon1</th>
                    <th className="w-[105px] min-w-[105px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Telepon2</th>
                    <th className="w-[105px] min-w-[105px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Fax</th>
                    <th className="w-[140px] min-w-[140px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Penanggung Jawab</th>
                    <th className="min-w-[140px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold text-[11px] bg-[#ECE9D8]">Keterangan</th>
                    <th className="w-[85px] border-r border-[#ACA899] px-2 py-0.5 text-center font-bold text-[11px] bg-[#ECE9D8]">Status</th>
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
                          isSelected
                            ? 'bg-[#0A246A] text-white'
                            : !item.isActive
                            ? 'bg-[#F3F3F3] text-gray-500 hover:bg-[#EAF2FC]'
                            : 'bg-white hover:bg-[#EAF2FC]'
                        }`}
                      >
                        <td className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0">
                          {isSelected ? <span className="text-[10px] font-bold text-black leading-none inline-block">▶</span> : null}
                        </td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold">{item.kode}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold uppercase">
                          {item.namaLokasi}
                          {item.isDefault && (
                            <span className={`ml-1.5 text-[9px] px-1 border ${isSelected ? 'border-white/70 text-white' : 'border-blue-600 text-blue-700 bg-blue-50'}`}>
                              UTAMA
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.alamat}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold uppercase">{item.kota}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.telepon1}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.telepon2}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.fax || ''}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] uppercase">{item.pic || ''}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] whitespace-pre-line align-top">{item.keterangan || ''}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-center text-[10px] font-bold">
                          {item.isActive ? 'AKTIF' : 'NON-AKTIF'}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLokasi.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-6 text-gray-500">
                        Belum ada data lokasi gudang
                      </td>
                    </tr>
                  )}
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
                onClick={() => {
                  setModalError(null);
                  setIsAddOpen(false);
                }}
                className="w-[16px] h-[15px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-2.5 text-[11px] text-black">
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

              <div className="flex items-start space-x-3">
                <label className="w-[110px] font-bold pt-1">Keterangan :</label>
                <textarea
                  rows={2}
                  value={newKeterangan}
                  onChange={(e) => setNewKeterangan(e.target.value)}
                  placeholder="Catatan lokasi gudang..."
                  className="flex-1 bg-white border border-[#7F9DB9] px-2 py-1 outline-none focus:border-[#316AC5] resize-y leading-snug"
                />
              </div>

              <div className="flex items-center gap-6 pl-[122px] pt-1">
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsDefault}
                    onChange={(e) => setNewIsDefault(e.target.checked)}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Gudang Utama (Default)</span>
                </label>
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Lokasi Aktif</span>
                </label>
              </div>

              {modalError && (
                <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                  ⚠ {modalError}
                </div>
              )}

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
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] hover:bg-[#F2EFE2] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Master Lokasi Gudang"
        rows={lokasiList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [r.kode, r.namaLokasi, r.alamat, r.kota, r.telepon1, r.pic, r.keterangan]}
        initialQuery={searchTerm}
        isBusy={isBusy}
        onSearchSupabase={(q) => {
          setSearchField('Semua');
          setSearchTerm(q);
          return loadData({ field: 'Semua', term: q });
        }}
        onRefreshSupabase={() => {
          setSearchField('Semua');
          setSearchTerm('');
          return loadData({ field: 'Semua', term: '' });
        }}
        onSelectRow={(row, q) => {
          setSelectedId(row.id);
          setSearchTerm(q);
          showFeedback(`Lokasi [${row.kode} - ${row.namaLokasi}] dipilih`);
        }}
        columns={[
          { header: 'Kode', accessor: (r) => r.kode, widthClass: 'w-20', mono: true, bold: true },
          { header: 'Nama Lokasi', accessor: (r) => r.namaLokasi, bold: true },
          { header: 'Alamat', accessor: (r) => r.alamat || '-' },
          { header: 'Kota', accessor: (r) => r.kota || '-', widthClass: 'w-24' },
          { header: 'Penanggung Jawab', accessor: (r) => r.pic || '-', widthClass: 'w-32' },
        ]}
      />

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Konfirmasi Hapus Lokasi Gudang"
        message={`Yakin ingin menghapus Lokasi [${selectedLokasi?.kode || ''} - ${selectedLokasi?.namaLokasi || ''}]?`}
        detail="Data yang sudah dihapus tidak dapat dikembalikan."
        isBusy={isBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MASTER LOKASI GUDANG"
        subtitle={`Total Record: ${filteredLokasi.length}`}
        orientation="landscape"
        columns={[
          { header: 'Kode', accessor: 'kode', width: '50px', align: 'center' },
          { header: 'Nama Lokasi', accessor: 'namaLokasi', width: '125px' },
          { header: 'Alamat', accessor: 'alamat', width: '190px' },
          { header: 'Kota', accessor: 'kota', width: '85px' },
          { header: 'Telepon 1', accessor: 'telepon1', width: '90px' },
          { header: 'Telepon 2', accessor: 'telepon2', width: '90px' },
          { header: 'Fax', accessor: (r) => r.fax || '-', width: '85px' },
          { header: 'Penanggung Jawab', accessor: (r) => r.pic || '-', width: '115px' },
          { header: 'Keterangan', accessor: (r) => r.keterangan || '-', width: '130px' },
        ]}
        rows={filteredLokasi}
        summaryItems={[{ label: 'Total Lokasi Gudang', value: `${filteredLokasi.length} Lokasi` }]}
        selectedRow={selectedLokasi}
        selectedTitle="DETAIL MASTER LOKASI GUDANG"
        selectedSubtitle={selectedLokasi ? `Kode: ${selectedLokasi.kode} - ${selectedLokasi.namaLokasi}` : undefined}
        selectedMetaLines={
          selectedLokasi
            ? [
                { label: 'Kode Lokasi', value: selectedLokasi.kode },
                { label: 'Nama Lokasi', value: selectedLokasi.namaLokasi },
                { label: 'Kota', value: selectedLokasi.kota || '-' },
                { label: 'Penanggung Jawab', value: selectedLokasi.pic || '-' },
              ]
            : undefined
        }
      />
    </div>
  );
};
