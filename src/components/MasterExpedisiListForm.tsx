import React, { useState, useEffect, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { erpCreate, erpDelete, erpList, erpUpdate, fetchActiveCompanyProfile } from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

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

function mapDbToItem(r: any): ExpedisiItem {
  return {
    id: r.id,
    kodeExpedisi: r.kode_expedisi || '',
    namaExpedisi: r.nama_expedisi || '',
    alamat: r.alamat || '',
    kota: r.kota || '',
    phone1: r.phone1 || '',
    phone2: r.phone2 || '',
  };
}

export const MasterExpedisiListForm: React.FC<MasterExpedisiListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [expedisiList, setExpedisiList] = useState<ExpedisiItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [isFindOpen, setIsFindOpen] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('');
  const [newPhone1, setNewPhone1] = useState('');
  const [newPhone2, setNewPhone2] = useState('');

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
    Kode: 'kode_expedisi',
    'Nama Expedisi': 'nama_expedisi',
    Kota: 'kota',
    Alamat: 'alamat',
  };

  const loadData = async (opts?: { field?: string; term?: string }): Promise<ExpedisiItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = { orderBy: 'kode_expedisi', asc: true, limit: 1000 };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'kode_expedisi,nama_expedisi,alamat,kota,phone1,phone2';
          queryOpts.searchVal = activeTerm;
        }
      }
      const rows = await erpList<any>('master_expedisis', queryOpts);
      const mapped = rows.map(mapDbToItem);
      setExpedisiList(mapped);
      if (mapped.length > 0 && !mapped.some((x) => x.id === selectedId)) {
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
    const selected = expedisiList.find((x) => x.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record yang akan disimpan terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const saved = await erpUpdate<any>('master_expedisis', selected.id, {
        kode_expedisi: selected.kodeExpedisi.trim().toUpperCase(),
        nama_expedisi: selected.namaExpedisi.trim().toUpperCase(),
        alamat: selected.alamat.trim(),
        kota: selected.kota.trim().toUpperCase(),
        phone1: selected.phone1.trim(),
        phone2: selected.phone2.trim(),
      });
      const mapped = mapDbToItem(saved);
      setExpedisiList((prev) => prev.map((x) => (x.id === selected.id ? mapped : x)));
      showFeedback(`Expedisi [${mapped.kodeExpedisi} - ${mapped.namaExpedisi}] tersimpan ke Supabase`);
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
    setNewNama('');
    setNewAlamat('');
    setNewKota('');
    setNewPhone1('');
    setNewPhone2('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = expedisiList.find((x) => x.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewKode(item.kodeExpedisi);
    setNewNama(item.namaExpedisi);
    setNewAlamat(item.alamat);
    setNewKota(item.kota);
    setNewPhone1(item.phone1);
    setNewPhone2(item.phone2);
    setIsAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    try {
      setIsBusy(true);
      await erpDelete('master_expedisis', selectedId);
      const updated = expedisiList.filter((x) => x.id !== selectedId);
      setExpedisiList(updated);
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
    if (!newKode.trim() || !newNama.trim()) {
      setModalError('Kode Expedisi dan Nama Expedisi wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const dbPayload = {
        kode_expedisi: newKode.trim().toUpperCase(),
        nama_expedisi: newNama.trim().toUpperCase(),
        alamat: newAlamat.trim(),
        kota: newKota.trim().toUpperCase(),
        phone1: newPhone1.trim(),
        phone2: newPhone2.trim(),
      };
      if (editingId) {
        const saved = await erpUpdate<any>('master_expedisis', editingId, dbPayload);
        const mapped = mapDbToItem(saved);
        setExpedisiList(expedisiList.map((x) => (x.id === editingId ? mapped : x)));
        showFeedback('Data diperbarui');
      } else {
        const saved = await erpCreate<any>('master_expedisis', dbPayload);
        const mapped = mapDbToItem(saved);
        setExpedisiList([mapped, ...expedisiList]);
        setSelectedId(mapped.id);
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

  const filteredExpedisi = expedisiList.filter((item) => {
    if (searchField === 'Kode') return matchesMultiKeyword([item.kodeExpedisi], searchTerm);
    if (searchField === 'Nama Expedisi') return matchesMultiKeyword([item.namaExpedisi], searchTerm);
    if (searchField === 'Kota') return matchesMultiKeyword([item.kota], searchTerm);
    if (searchField === 'Alamat') return matchesMultiKeyword([item.alamat], searchTerm);
    return matchesMultiKeyword(
      [item.kodeExpedisi, item.namaExpedisi, item.alamat, item.kota, item.phone1, item.phone2],
      searchTerm
    );
  });

  const selectedExpedisi =
    filteredExpedisi.find((x) => x.id === selectedId) ||
    expedisiList.find((x) => x.id === selectedId) ||
    null;

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Expedisi dari Supabase`
          : 'Data Expedisi tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Expedisi)`);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Master_Expedisi',
      sheetTitle: 'LIST MASTER EXPEDISI',
      companyProfile: company,
      columns: [
        { header: 'Kode Expedisi', accessor: 'kodeExpedisi' },
        { header: 'Nama Expedisi', accessor: 'namaExpedisi' },
        { header: 'Alamat', accessor: 'alamat' },
        { header: 'Kota', accessor: 'kota' },
        { header: 'Phone 1', accessor: 'phone1' },
        { header: 'Phone 2', accessor: 'phone2' },
      ],
      rows: filteredExpedisi,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  return (
    <div
      id="master-expedisi-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Master Expedisi"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={() => loadData({ field: searchField, term: searchTerm })}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 flex items-center h-[48px] px-3 space-x-3 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans overflow-x-auto">
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
              { value: 'Nama Expedisi', label: 'Nama Expedisi' },
              { value: 'Kota', label: 'Kota' },
              { value: 'Alamat', label: 'Alamat' },
            ]}
          />
        </div>

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
                    <th className="w-[100px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Kode</th>
                    <th className="w-[240px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Nama Expedisi</th>
                    <th className="w-[260px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Alamat</th>
                    <th className="w-[130px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Kota</th>
                    <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Phone 1</th>
                    <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Phone 2</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpedisi.map((item) => {
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
                        <td className="w-[20px] min-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0">
                          {isSelected ? <span className="text-[10px] font-bold text-black">▶</span> : null}
                        </td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold">{item.kodeExpedisi}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-semibold">{item.namaExpedisi}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.alamat}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.kota}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.phone1}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.phone2}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-between mt-1.5 px-1 text-[11px] font-bold">
            <span>Record: {filteredExpedisi.length}</span>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-[450px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl p-4 flex flex-col">
            <div className="bg-[#000080] text-white px-2 py-1 font-bold text-[12px] flex justify-between items-center mb-3">
              <span>{editingId ? 'Koreksi Master Expedisi' : 'Tambah Master Expedisi Baru'}</span>
              <button type="button" onClick={() => { setModalError(null); setIsAddOpen(false); }} className="text-white hover:bg-red-600 px-1 font-bold cursor-pointer">✕</button>
            </div>
            <form noValidate onSubmit={handleSaveNew} className="space-y-3 text-[11px]">
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
              {modalError && (
                <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                  ⚠ {modalError}
                </div>
              )}
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
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] cursor-pointer"
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
        tableLabel="Master Expedisi"
        rows={expedisiList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [r.kodeExpedisi, r.namaExpedisi, r.alamat, r.kota, r.phone1, r.phone2]}
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
          showFeedback(`Expedisi [${row.kodeExpedisi} - ${row.namaExpedisi}] dipilih`);
        }}
        columns={[
          { header: 'Kode', accessor: (r) => r.kodeExpedisi, widthClass: 'w-24', mono: true, bold: true },
          { header: 'Nama Expedisi', accessor: (r) => r.namaExpedisi, bold: true },
          { header: 'Alamat', accessor: (r) => r.alamat || '-' },
          { header: 'Kota', accessor: (r) => r.kota || '-', widthClass: 'w-28' },
          { header: 'Phone 1', accessor: (r) => r.phone1 || '-', widthClass: 'w-28' },
        ]}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MASTER EXPEDISI"
        subtitle={`Total Record: ${filteredExpedisi.length}`}
        columns={[
          { header: 'Kode', accessor: 'kodeExpedisi', width: '80px' },
          { header: 'Nama Expedisi', accessor: 'namaExpedisi' },
          { header: 'Alamat', accessor: 'alamat' },
          { header: 'Kota', accessor: 'kota', width: '110px' },
          { header: 'Telepon', accessor: 'phone1', width: '100px' },
        ]}
        rows={filteredExpedisi}
        selectedRow={selectedExpedisi}
        selectedTitle="DETAIL MASTER EXPEDISI"
        selectedSubtitle={selectedExpedisi ? `Kode: ${selectedExpedisi.kodeExpedisi}` : undefined}
        selectedMetaLines={
          selectedExpedisi
            ? [
                { label: 'Kode Expedisi', value: selectedExpedisi.kodeExpedisi },
                { label: 'Nama Expedisi', value: selectedExpedisi.namaExpedisi },
                { label: 'Kota', value: selectedExpedisi.kota || '-' },
                { label: 'Telepon', value: selectedExpedisi.phone1 || '-' },
              ]
            : undefined
        }
      />
    </div>
  );
};
