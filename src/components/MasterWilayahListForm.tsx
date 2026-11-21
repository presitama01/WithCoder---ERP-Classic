import React, { useState, useEffect, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { erpCreate, erpDelete, erpList, erpUpdate, fetchActiveCompanyProfile } from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

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
  const [searchField, setSearchField] = useState<string>('Semua');
  const [isFindOpen, setIsFindOpen] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newWilayah, setNewWilayah] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'kode_wilayah',
    Wilayah: 'wilayah',
  };

  const loadData = async (opts?: { field?: string; term?: string }): Promise<WilayahItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = { orderBy: 'wilayah', asc: true, limit: 1000 };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'kode_wilayah,wilayah';
          queryOpts.searchVal = activeTerm;
        }
      }
      const rows = await erpList<any>('master_wilayahs', queryOpts);
      const mapped: WilayahItem[] = rows.map((r) => ({
        id: r.id,
        kodeWilayah: r.kode_wilayah,
        wilayah: r.wilayah,
      }));
      setWilayahList(mapped);
      if (mapped.length > 0 && !mapped.some((w) => w.id === selectedId)) {
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
    const selected = wilayahList.find((w) => w.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record yang akan disimpan terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const saved = await erpUpdate<any>('master_wilayahs', selected.id, {
        kode_wilayah: selected.kodeWilayah.trim().toUpperCase(),
        wilayah: selected.wilayah.trim().toUpperCase(),
      });
      setWilayahList((prev) =>
        prev.map((w) =>
          w.id === selected.id
            ? { id: saved.id, kodeWilayah: saved.kode_wilayah, wilayah: saved.wilayah }
            : w
        )
      );
      showFeedback(`Wilayah [${saved.kode_wilayah} - ${saved.wilayah}] tersimpan ke Supabase`);
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
    setEditingId(null);
    setModalError(null);
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
    setModalError(null);
    setNewKode(item.kodeWilayah);
    setNewWilayah(item.wilayah);
    setIsAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
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
    setModalError(null);
    if (!newKode.trim() || !newWilayah.trim()) {
      setModalError('Kode Wilayah dan Nama Wilayah wajib diisi.');
      return;
    }

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
      const msg = err?.message || 'Gagal menyimpan data ke database';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filteredWilayah = wilayahList.filter((item) => {
    if (searchField === 'Kode') return matchesMultiKeyword([item.kodeWilayah], searchTerm);
    if (searchField === 'Wilayah') return matchesMultiKeyword([item.wilayah], searchTerm);
    return matchesMultiKeyword([item.kodeWilayah, item.wilayah], searchTerm);
  });

  const selectedWilayah =
    filteredWilayah.find((w) => w.id === selectedId) ||
    wilayahList.find((w) => w.id === selectedId) ||
    null;

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Wilayah dari Supabase`
          : 'Data Wilayah tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Wilayah)`);
  };

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

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
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
          onTableView={() => loadData({ field: searchField, term: searchTerm })}
          onExportExcel={handleExportExcel}
        />

        <div
          id="master-wilayah-toolbar"
          className="shrink-0 flex items-center h-[48px] px-3 space-x-3 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans overflow-x-auto"
        >
          <FormActionButtons
            onSimpan={handleToolbarSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleDelete}
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
              { value: 'Wilayah', label: 'Wilayah' },
            ]}
          />
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
        tableLabel="Master Wilayah"
        rows={wilayahList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [r.kodeWilayah, r.wilayah]}
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
          showFeedback(`Wilayah [${row.kodeWilayah} - ${row.wilayah}] dipilih`);
        }}
        columns={[
          { header: 'Kode Wilayah', accessor: (r) => r.kodeWilayah, widthClass: 'w-32', mono: true, bold: true },
          { header: 'Wilayah', accessor: (r) => r.wilayah, bold: true },
        ]}
      />

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
        selectedRow={selectedWilayah}
        selectedTitle="DETAIL MASTER WILAYAH"
        selectedSubtitle={selectedWilayah ? `Kode Wilayah: ${selectedWilayah.kodeWilayah}` : undefined}
        selectedMetaLines={
          selectedWilayah
            ? [
                { label: 'Kode Wilayah', value: selectedWilayah.kodeWilayah },
                { label: 'Nama Wilayah', value: selectedWilayah.wilayah },
              ]
            : undefined
        }
      />
    </div>
  );
};
