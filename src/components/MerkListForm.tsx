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

export interface MerkItem {
  id: string;
  kode: string;
  namaMerk: string;
}

interface MerkListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MerkListForm: React.FC<MerkListFormProps> = ({ isOpen, onClose }) => {
  const [merks, setMerks] = useState<MerkItem[]>([]);
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
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<MerkItem | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'kode',
    'Nama Merk': 'nama_merk',
  };

  const loadData = async (opts?: { field?: string; term?: string }): Promise<MerkItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = { orderBy: 'nama_merk', asc: true, limit: 1000 };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'kode,nama_merk';
          queryOpts.searchVal = activeTerm;
        }
      }
      const rows = await erpList<any>('master_merks', queryOpts);
      const mapped: MerkItem[] = rows.map((r) => ({
        id: r.id,
        kode: r.kode,
        namaMerk: r.nama_merk,
      }));
      setMerks(mapped);
      if (mapped.length > 0 && !mapped.some((m) => m.id === selectedId)) {
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
    const selected = merks.find((m) => m.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record yang akan disimpan terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const saved = await erpUpdate<any>('master_merks', selected.id, {
        kode: selected.kode.trim().toUpperCase(),
        nama_merk: selected.namaMerk.trim().toUpperCase(),
      });
      setMerks((prev) =>
        prev.map((m) =>
          m.id === selected.id ? { id: saved.id, kode: saved.kode, namaMerk: saved.nama_merk } : m
        )
      );
      showFeedback(`Merk [${saved.kode} - ${saved.nama_merk}] tersimpan ke Supabase`);
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
    const nextCode = nextUniqueCode(merks.map((m) => m.kode), '', 4);
    setEditingId(null);
    setModalError(null);
    setNewKode(nextCode);
    setNewNama('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = merks.find((m) => m.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewKode(item.kode);
    setNewNama(item.namaMerk);
    setIsAddOpen(true);
  };

  const handleRequestDelete = () => {
    const item = merks.find((m) => m.id === selectedId);
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
        { table: 'master_barangs', label: 'Master Barang', eq: { merk: confirmDeleteItem.namaMerk } },
      ]);
      if (usageMsg) {
        setConfirmDeleteItem(null);
        showFeedback(usageMsg);
        return;
      }
      await erpDelete('master_merks', confirmDeleteItem.id);
      const updated = merks.filter((m) => m.id !== confirmDeleteItem.id);
      setMerks(updated);
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
      setModalError('Kode dan Nama Merk wajib diisi.');
      return;
    }
    const dupKode = merks.find((m) => m.kode.toUpperCase() === cleanKode && m.id !== editingId);
    if (dupKode) {
      setModalError(`Kode Merk [${cleanKode}] sudah digunakan.`);
      return;
    }

    try {
      setIsBusy(true);
      const payload = {
        kode: cleanKode,
        nama_merk: cleanNama,
      };
      if (editingId) {
        const prevItem = merks.find((m) => m.id === editingId);
        const saved = await erpUpdate<any>('master_merks', editingId, payload);
        if (prevItem && prevItem.namaMerk.toUpperCase() !== cleanNama) {
          await cascadeMasterRename('master_barangs', 'merk', prevItem.namaMerk, {
            merk: cleanNama,
          });
        }
        setMerks((prev) =>
          prev
            .map((m) =>
              m.id === editingId ? { id: saved.id, kode: saved.kode, namaMerk: saved.nama_merk } : m
            )
            .sort((a, b) => a.namaMerk.localeCompare(b.namaMerk))
        );
        showFeedback('Data diperbarui');
      } else {
        const saved = await erpCreate<any>('master_merks', payload);
        const newItem: MerkItem = { id: saved.id, kode: saved.kode, namaMerk: saved.nama_merk };
        setMerks((prev) =>
          [...prev, newItem].sort((a, b) => a.namaMerk.localeCompare(b.namaMerk))
        );
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

  const filteredMerks = merks.filter((item) => {
    if (searchField === 'Kode') return matchesMultiKeyword([item.kode], searchTerm);
    if (searchField === 'Nama Merk') return matchesMultiKeyword([item.namaMerk], searchTerm);
    return matchesMultiKeyword([item.kode, item.namaMerk], searchTerm);
  });

  const selectedMerk =
    filteredMerks.find((m) => m.id === selectedId) ||
    merks.find((m) => m.id === selectedId) ||
    null;

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Merk dari Supabase`
          : 'Data Merk tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Merk)`);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Master_Merk',
      sheetTitle: 'LIST TABEL MERK',
      companyProfile: company,
      columns: [
        { header: 'Kode', accessor: 'kode' },
        { header: 'Nama Merk', accessor: 'namaMerk' },
      ],
      rows: filteredMerks,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  return (
    <div
      id="merk-list-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none"
    >
      <FormHeaderBanner
        id="merk-form-banner"
        title="List Tabel Merk"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => setIsPrintOpen(true)}
        onTableView={() => loadData({ field: searchField, term: searchTerm })}
        onExportExcel={handleExportExcel}
      />

      <div
        id="merk-form-toolbar"
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
            { value: 'Nama Merk', label: 'Nama Merk' },
          ]}
        />
      </div>

      <div className="flex-1 flex flex-col p-2 overflow-hidden bg-[#ECE9D8] min-h-[200px]">
        <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-white shadow-inner min-h-0">
          <div className="h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-bold text-black">
            List
          </div>

          <div className="flex-1 overflow-auto bg-[#F0EDE2] custom-scrollbar">
            <table className="w-full border-collapse text-[11px] font-sans select-none">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                  <th className="w-[24px] border-r border-[#ACA899] bg-[#ECE9D8] p-1" />
                  <th className="w-[100px] border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px]">Kode</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left font-bold text-[11px]">Nama Merk</th>
                </tr>
              </thead>
              <tbody>
                {filteredMerks.map((item) => {
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
                      <td className="px-2 py-0.5 uppercase tracking-wide">{item.namaMerk}</td>
                    </tr>
                  );
                })}

                {Array.from({ length: Math.max(0, 10 - filteredMerks.length) }).map((_, emptyIdx) => (
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
            {selectedId ? `Merk Terpilih: ${merks.find((m) => m.id === selectedId)?.namaMerk || '-'}` : ''}
          </div>

          <div className="flex items-center space-x-6 text-[12px] font-sans font-bold text-black pr-16">
            <span>Record</span>
            <span className="font-mono text-[13px]">{filteredMerks.length}</span>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="absolute inset-0 bg-black/25 flex items-center justify-center z-50 p-4">
          <div className="w-[360px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans">
            <div className="flex items-center justify-between h-[24px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
              <span>{editingId ? 'Koreksi Merk' : 'Input Merk Baru'}</span>
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
                <label className="w-[90px] font-bold">Nama Merk :</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: BOSCH"
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
        tableLabel="Tabel Merk"
        rows={merks}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [r.kode, r.namaMerk]}
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
          showFeedback(`Merk [${row.kode} - ${row.namaMerk}] dipilih`);
        }}
        columns={[
          { header: 'Kode', accessor: (r) => r.kode, widthClass: 'w-28', mono: true, bold: true },
          { header: 'Nama Merk', accessor: (r) => r.namaMerk, bold: true },
        ]}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MASTER TABEL MERK"
        subtitle={`Total Record: ${filteredMerks.length}`}
        columns={[
          { header: 'Kode', accessor: 'kode', width: '120px' },
          { header: 'Nama Merk', accessor: 'namaMerk' },
        ]}
        rows={filteredMerks}
        selectedRow={selectedMerk}
        selectedTitle="DETAIL MASTER TABEL MERK"
        selectedSubtitle={selectedMerk ? `Kode: ${selectedMerk.kode}` : undefined}
        selectedMetaLines={
          selectedMerk
            ? [
                { label: 'Kode Merk', value: selectedMerk.kode },
                { label: 'Nama Merk', value: selectedMerk.namaMerk },
              ]
            : undefined
        }
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteItem)}
        message={`Hapus Merk [${confirmDeleteItem?.kode} - ${confirmDeleteItem?.namaMerk}]?`}
        detail="Sistem akan memeriksa apakah Merk masih dipakai pada Master Barang sebelum menghapus."
        isBusy={isBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteItem(null)}
      />
    </div>
  );
};
