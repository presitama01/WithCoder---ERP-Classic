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
import { cascadeMasterRename, checkMasterUsage } from '../lib/masterValidation';

export interface TypeItem {
  id: string;
  kode: string;
  namaTipe: string;
}

interface TypeListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TypeListForm: React.FC<TypeListFormProps> = ({ isOpen, onClose }) => {
  const [types, setTypes] = useState<TypeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [isFindOpen, setIsFindOpen] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<TypeItem | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'kode',
    'Nama Tipe': 'nama_tipe',
  };

  const loadData = async (opts?: { field?: string; term?: string }): Promise<TypeItem[] | null> => {
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
          queryOpts.orSearch = 'kode,nama_tipe';
          queryOpts.searchVal = activeTerm;
        }
      }
      const rows = await erpList<any>('master_types', queryOpts);
      const mapped: TypeItem[] = rows.map((r) => ({
        id: r.id,
        kode: r.kode,
        namaTipe: r.nama_tipe,
      }));
      setTypes(mapped);
      if (mapped.length > 0 && !mapped.some((t) => t.id === selectedId)) {
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
    const selected = types.find((t) => t.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record yang akan disimpan terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const saved = await erpUpdate<any>('master_types', selected.id, {
        kode: selected.kode.trim().toUpperCase(),
        nama_tipe: selected.namaTipe.trim().toUpperCase(),
      });
      setTypes((prev) =>
        prev.map((t) =>
          t.id === selected.id ? { id: saved.id, kode: saved.kode, namaTipe: saved.nama_tipe } : t
        )
      );
      showFeedback(`Type [${saved.kode} - ${saved.nama_tipe}] tersimpan ke Supabase`);
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
    const nextCode = nextUniqueCode(types.map((t) => t.kode), '', 4);
    setEditingId(null);
    setModalError(null);
    setNewKode(nextCode);
    setNewNama('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = types.find((t) => t.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewKode(item.kode);
    setNewNama(item.namaTipe);
    setIsAddOpen(true);
  };

  const handleRequestDelete = () => {
    const item = types.find((t) => t.id === selectedId);
    if (!item) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    setConfirmDeleteItem(item);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteItem) return;
    try {
      setIsBusy(true);
      const usageMsg = await checkMasterUsage([
        { table: 'master_barangs', label: 'Master Barang', eq: { tipe: confirmDeleteItem.namaTipe } },
      ]);
      if (usageMsg) {
        setConfirmDeleteItem(null);
        showFeedback(usageMsg);
        return;
      }
      await erpDelete('master_types', confirmDeleteItem.id);
      const updated = types.filter((t) => t.id !== confirmDeleteItem.id);
      setTypes(updated);
      setSelectedId(updated[0]?.id || '');
      setConfirmDeleteItem(null);
      showFeedback('Data dihapus');
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
      setModalError('Kode dan Nama Tipe wajib diisi.');
      return;
    }
    const dupKode = types.find((t) => t.kode.toUpperCase() === cleanKode && t.id !== editingId);
    if (dupKode) {
      setModalError(`Kode Type [${cleanKode}] sudah digunakan.`);
      return;
    }

    try {
      setIsBusy(true);
      const payload = {
        kode: cleanKode,
        nama_tipe: cleanNama,
      };
      if (editingId) {
        const prevItem = types.find((t) => t.id === editingId);
        const saved = await erpUpdate<any>('master_types', editingId, payload);
        if (prevItem && prevItem.namaTipe.toUpperCase() !== cleanNama) {
          await cascadeMasterRename('master_barangs', 'tipe', prevItem.namaTipe, {
            tipe: cleanNama,
          });
        }
        setTypes((prev) =>
          prev
            .map((t) =>
              t.id === editingId ? { id: saved.id, kode: saved.kode, namaTipe: saved.nama_tipe } : t
            )
            .sort((a, b) => a.kode.localeCompare(b.kode))
        );
        showFeedback('Data diperbarui');
      } else {
        const saved = await erpCreate<any>('master_types', payload);
        const newItem: TypeItem = { id: saved.id, kode: saved.kode, namaTipe: saved.nama_tipe };
        setTypes((prev) => [...prev, newItem].sort((a, b) => a.kode.localeCompare(b.kode)));
        setSelectedId(newItem.id);
        showFeedback('Data tersimpan');
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

  const filteredTypes = types.filter((item) => {
    if (searchField === 'Kode') return matchesMultiKeyword([item.kode], searchTerm);
    if (searchField === 'Nama Tipe') return matchesMultiKeyword([item.namaTipe], searchTerm);
    return matchesMultiKeyword([item.kode, item.namaTipe], searchTerm);
  });

  const selectedType =
    filteredTypes.find((t) => t.id === selectedId) ||
    types.find((t) => t.id === selectedId) ||
    null;

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Type dari Supabase`
          : 'Data Type tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Type)`);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Master_Type',
      sheetTitle: 'LIST TABEL TYPE',
      companyProfile: company,
      columns: [
        { header: 'Kode', accessor: 'kode' },
        { header: 'Nama Tipe', accessor: 'namaTipe' },
      ],
      rows: filteredTypes,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  return (
    <div
      id="type-list-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden"
    >
      <FormHeaderBanner
        id="type-form-banner"
        title="List Tabel Type"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => setIsPrintOpen(true)}
        onTableView={() => loadData({ field: searchField, term: searchTerm })}
        onExportExcel={handleExportExcel}
      />

      <div
        id="type-form-toolbar"
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
            { value: 'Nama Tipe', label: 'Nama Tipe' },
          ]}
        />
      </div>

      <div className="flex-1 flex flex-col p-2 overflow-hidden bg-[#ECE9D8] min-h-[200px]">
        <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-white shadow-inner min-h-0">
          <div className="h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-bold text-black">
            List
          </div>

          <div className="flex-1 overflow-auto bg-[#F0EDE2]">
            <table className="min-w-[500px] w-full border-collapse text-[11px] font-sans select-none">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                  <th className="w-[24px] border-r border-[#ACA899] bg-[#ECE9D8] p-1" />
                  <th className="w-[100px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px]">Kode</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px]">Nama Tipe</th>
                </tr>
              </thead>
              <tbody>
                {filteredTypes.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handleEdit}
                      className={`h-[22px] border-b border-[#D6D6D6] cursor-pointer ${
                        isSelected ? 'bg-[#0A246A] text-white font-semibold' : 'bg-white hover:bg-[#EAF2FC] text-black'
                      }`}
                    >
                      <td className="w-[24px] border-r border-[#ACA899] text-center p-0 bg-[#ECE9D8] text-black">
                        {isSelected ? <span className="text-[10px] font-bold leading-none inline-block">▶</span> : null}
                      </td>
                      <td className={`px-2 py-0.5 border-r border-[#D6D6D6] font-mono ${isSelected ? 'border-r-[#3A5FCD]' : ''}`}>
                        {item.kode}
                      </td>
                      <td className="px-2 py-0.5 uppercase tracking-wide">{item.namaTipe}</td>
                    </tr>
                  );
                })}

                {Array.from({ length: Math.max(0, 15 - filteredTypes.length) }).map((_, emptyIdx) => (
                  <tr key={`empty-${emptyIdx}`} className="h-[22px] bg-white border-b border-[#EBEBEB]">
                    <td className="w-[24px] border-r border-[#ACA899] bg-[#ECE9D8]" />
                    <td className="border-r border-[#EBEBEB]" />
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 px-1 text-[11px] font-sans">
          <div className="w-[450px] h-[22px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 flex items-center text-gray-700">
            {selectedId ? `Tipe Terpilih: ${types.find((t) => t.id === selectedId)?.namaTipe || '-'}` : ''}
          </div>

          <div className="flex items-center space-x-6 text-[12px] font-sans font-bold text-black pr-16">
            <span>Record</span>
            <span className="font-mono text-[13px]">{filteredTypes.length}</span>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="absolute inset-0 bg-black/25 flex items-center justify-center z-50 p-4">
          <div className="w-[360px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans">
            <div className="flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
              <span>{editingId ? 'Koreksi Type' : 'Input Type Baru'}</span>
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

            <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3 text-[11px] text-black">
              <div className="flex items-center space-x-3">
                <label className="w-[90px] font-bold">Kode :</label>
                <input
                  type="text"
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value)}
                  className="w-[120px] h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono font-bold uppercase outline-none focus:border-[#316AC5]"
                  required
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="w-[90px] font-bold">Nama Tipe :</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: CONTACT POINT"
                  className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase outline-none focus:border-[#316AC5]"
                  required
                  autoFocus
                />
              </div>

              {modalError && (
                <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                  ⚠ {modalError}
                </div>
              )}

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
        tableLabel="Tabel Type"
        rows={types}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [r.kode, r.namaTipe]}
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
          showFeedback(`Type [${row.kode} - ${row.namaTipe}] dipilih`);
        }}
        columns={[
          { header: 'Kode', accessor: (r) => r.kode, widthClass: 'w-28', mono: true, bold: true },
          { header: 'Nama Tipe', accessor: (r) => r.namaTipe, bold: true },
        ]}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MASTER TABEL TYPE"
        subtitle={`Total Record: ${filteredTypes.length}`}
        columns={[
          { header: 'Kode', accessor: 'kode', width: '120px' },
          { header: 'Nama Tipe', accessor: 'namaTipe' },
        ]}
        rows={filteredTypes}
        selectedRow={selectedType}
        selectedTitle="DETAIL MASTER TABEL TYPE"
        selectedSubtitle={selectedType ? `Kode: ${selectedType.kode}` : undefined}
        selectedMetaLines={
          selectedType
            ? [
                { label: 'Kode Type', value: selectedType.kode },
                { label: 'Nama Tipe', value: selectedType.namaTipe },
              ]
            : undefined
        }
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteItem)}
        message={`Hapus Type [${confirmDeleteItem?.kode} - ${confirmDeleteItem?.namaTipe}]?`}
        detail="Sistem akan memeriksa apakah Tipe masih dipakai pada Master Barang sebelum menghapus."
        isBusy={isBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteItem(null)}
      />
    </div>
  );
};
