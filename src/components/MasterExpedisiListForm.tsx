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
import {
  cascadeMasterRename,
  checkMasterUsage,
  isMissingColumnError,
  isValidEmail,
} from '../lib/masterValidation';

export interface ExpedisiItem {
  id: string;
  kodeExpedisi: string;
  namaExpedisi: string;
  alamat: string;
  kota: string;
  phone1: string;
  phone2: string;
  contactPerson: string;
  email: string;
  armada: string;
  keterangan: string;
  isActive: boolean;
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
    contactPerson: r.contact_person || '',
    email: r.email || '',
    armada: r.armada || '',
    keterangan: r.keterangan || '',
    isActive: r.is_active !== false,
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
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newArmada, setNewArmada] = useState('');
  const [newKeterangan, setNewKeterangan] = useState('');
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
      const basePayload = {
        kode_expedisi: selected.kodeExpedisi.trim().toUpperCase(),
        nama_expedisi: selected.namaExpedisi.trim().toUpperCase(),
        alamat: selected.alamat.trim(),
        kota: selected.kota.trim().toUpperCase(),
        phone1: selected.phone1.trim(),
        phone2: selected.phone2.trim(),
      };
      let saved: any;
      let usedFallback = false;
      try {
        saved = await erpUpdate<any>('master_expedisis', selected.id, {
          ...basePayload,
          contact_person: selected.contactPerson.trim(),
          email: selected.email.trim(),
          armada: selected.armada.trim().toUpperCase(),
          keterangan: selected.keterangan.trim(),
          is_active: selected.isActive,
        });
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          saved = await erpUpdate<any>('master_expedisis', selected.id, basePayload);
        } else {
          throw err;
        }
      }
      const mapped = mapDbToItem(saved);
      setExpedisiList((prev) => prev.map((x) => (x.id === selected.id ? mapped : x)));
      showFeedback(
        usedFallback
          ? `Expedisi [${mapped.kodeExpedisi}] tersimpan (jalankan SQL migrasi untuk kolom tambahan)`
          : `Expedisi [${mapped.kodeExpedisi} - ${mapped.namaExpedisi}] tersimpan ke Supabase`
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
    setEditingId(null);
    setModalError(null);
    setNewKode(nextUniqueCode(expedisiList.map((x) => x.kodeExpedisi), 'EXP', 3));
    setNewNama('');
    setNewAlamat('');
    setNewKota('');
    setNewPhone1('');
    setNewPhone2('');
    setNewContactPerson('');
    setNewEmail('');
    setNewArmada('');
    setNewKeterangan('');
    setNewIsActive(true);
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
    setNewContactPerson(item.contactPerson);
    setNewEmail(item.email);
    setNewArmada(item.armada);
    setNewKeterangan(item.keterangan);
    setNewIsActive(item.isActive !== false);
    setIsAddOpen(true);
  };

  const handleRequestDelete = async () => {
    const item = expedisiList.find((x) => x.id === selectedId);
    if (!item) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    try {
      setIsBusy(true);
      const usageMsg = await checkMasterUsage([
        { table: 'master_customers', label: 'Master Customer', eq: { kode_expedisi: item.kodeExpedisi } },
        { table: 'master_customers', label: 'Master Customer', eq: { nama_expedisi: item.namaExpedisi } },
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
      await erpDelete('master_expedisis', selectedId);
      const updated = expedisiList.filter((x) => x.id !== selectedId);
      setExpedisiList(updated);
      setSelectedId(updated[0]?.id || '');
      setConfirmDeleteOpen(false);
      showFeedback('Data expedisi dihapus');
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
      setModalError('Kode Expedisi dan Nama Expedisi wajib diisi.');
      return;
    }
    if (expedisiList.some((x) => x.kodeExpedisi.toUpperCase() === cleanKode && x.id !== editingId)) {
      setModalError(`Kode Expedisi [${cleanKode}] sudah terdaftar.`);
      return;
    }
    if (!isValidEmail(newEmail)) {
      setModalError('Format email expedisi tidak valid.');
      return;
    }

    try {
      setIsBusy(true);
      const basePayload = {
        kode_expedisi: cleanKode,
        nama_expedisi: cleanNama,
        alamat: newAlamat.trim(),
        kota: newKota.trim().toUpperCase(),
        phone1: newPhone1.trim(),
        phone2: newPhone2.trim(),
      };
      const fullPayload = {
        ...basePayload,
        contact_person: newContactPerson.trim(),
        email: newEmail.trim(),
        armada: newArmada.trim().toUpperCase(),
        keterangan: newKeterangan.trim(),
        is_active: newIsActive,
      };
      let saved: any;
      let usedFallback = false;
      const saveFn = async (payload: Record<string, any>) =>
        editingId
          ? erpUpdate<any>('master_expedisis', editingId, payload)
          : erpCreate<any>('master_expedisis', payload);
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
        const prevItem = expedisiList.find((x) => x.id === editingId);
        setExpedisiList((prev) =>
          prev
            .map((x) => (x.id === editingId ? mapped : x))
            .sort((a, b) => a.kodeExpedisi.localeCompare(b.kodeExpedisi))
        );
        if (prevItem && (prevItem.kodeExpedisi !== mapped.kodeExpedisi || prevItem.namaExpedisi !== mapped.namaExpedisi)) {
          await cascadeMasterRename('master_customers', 'kode_expedisi', prevItem.kodeExpedisi, {
            kode_expedisi: mapped.kodeExpedisi,
            nama_expedisi: mapped.namaExpedisi,
          });
        }
        showFeedback(
          usedFallback
            ? 'Data diperbarui (jalankan SQL migrasi untuk kolom tambahan Expedisi)'
            : 'Data diperbarui'
        );
      } else {
        setExpedisiList((prev) => [mapped, ...prev].sort((a, b) => a.kodeExpedisi.localeCompare(b.kodeExpedisi)));
        setSelectedId(mapped.id);
        showFeedback(
          usedFallback
            ? 'Data tersimpan (jalankan SQL migrasi untuk kolom tambahan Expedisi)'
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

  const filteredExpedisi = expedisiList.filter((item) => {
    if (searchField === 'Kode') return matchesMultiKeyword([item.kodeExpedisi], searchTerm);
    if (searchField === 'Nama Expedisi') return matchesMultiKeyword([item.namaExpedisi], searchTerm);
    if (searchField === 'Kota') return matchesMultiKeyword([item.kota], searchTerm);
    if (searchField === 'Alamat') return matchesMultiKeyword([item.alamat], searchTerm);
    return matchesMultiKeyword(
      [
        item.kodeExpedisi,
        item.namaExpedisi,
        item.alamat,
        item.kota,
        item.phone1,
        item.phone2,
        item.contactPerson,
        item.email,
        item.armada,
      ],
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
        { header: 'Contact Person', accessor: 'contactPerson' },
        { header: 'Email', accessor: 'email' },
        { header: 'Armada', accessor: 'armada' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Status', accessor: (r) => (r.isActive ? 'AKTIF' : 'NON-AKTIF') },
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
              <table className="w-full min-w-[1250px] border-collapse text-[11px] font-sans select-none bg-white">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                    <th className="w-[20px] min-w-[20px] max-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                    <th className="w-[90px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Kode</th>
                    <th className="w-[210px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Nama Expedisi</th>
                    <th className="w-[220px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Alamat</th>
                    <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Kota</th>
                    <th className="w-[105px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Phone 1</th>
                    <th className="w-[105px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Phone 2</th>
                    <th className="w-[125px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Contact Person</th>
                    <th className="w-[140px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Email</th>
                    <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 text-left font-bold bg-[#ECE9D8]">Armada</th>
                    <th className="w-[75px] border-r border-[#ACA899] px-2 py-0.5 text-center font-bold bg-[#ECE9D8]">Status</th>
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
                          isSelected
                            ? 'bg-[#0A246A] text-white'
                            : !item.isActive
                            ? 'bg-[#F3F3F3] text-gray-500 hover:bg-[#EAF2FC]'
                            : 'bg-white hover:bg-[#EAF2FC]'
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
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.contactPerson || '-'}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.email || '-'}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.armada || '-'}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-center text-[10px] font-bold">
                          {item.isActive ? 'AKTIF' : 'NON-AKTIF'}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredExpedisi.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-6 text-gray-500 italic">
                        Tidak ada data Master Expedisi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-between mt-2 px-1 text-[11px] font-sans">
            <div className="w-[450px] max-w-[60vw] truncate h-[22px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 flex items-center text-gray-700">
              {selectedExpedisi ? `Expedisi Terpilih: ${selectedExpedisi.kodeExpedisi} - ${selectedExpedisi.namaExpedisi}` : ''}
            </div>
            <div className="flex items-center space-x-6 text-[12px] font-sans font-bold text-black pr-16">
              <span>Record</span>
              <span className="font-mono text-[12px]">{filteredExpedisi.length}</span>
            </div>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-[510px] max-w-[96vw] max-h-[92vh] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl p-4 flex flex-col overflow-hidden">
            <div className="bg-[#000080] text-white px-2 py-1 font-bold text-[12px] flex justify-between items-center mb-3 shrink-0">
              <span>{editingId ? 'Koreksi Master Expedisi' : 'Tambah Master Expedisi Baru'}</span>
              <button type="button" onClick={() => { setModalError(null); setIsAddOpen(false); }} className="text-white hover:bg-red-600 px-1 font-bold cursor-pointer">✕</button>
            </div>
            <form noValidate onSubmit={handleSaveNew} className="space-y-2.5 text-[11px] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-1">Kode Expedisi:</label>
                  <input
                    type="text"
                    required
                    value={newKode}
                    onChange={(e) => setNewKode(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase font-mono font-bold"
                    placeholder="EXP001"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold mb-1">Nama Expedisi:</label>
                  <input
                    type="text"
                    required
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
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
              <div className="grid grid-cols-3 gap-2">
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
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Phone 2:</label>
                  <input
                    type="text"
                    value={newPhone2}
                    onChange={(e) => setNewPhone2(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Contact Person:</label>
                  <input
                    type="text"
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                    placeholder="Nama PIC Expedisi"
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Email:</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ops@expedisi.com"
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Armada / No. Polisi:</label>
                  <input
                    type="text"
                    value={newArmada}
                    onChange={(e) => setNewArmada(e.target.value)}
                    placeholder="Contoh: BOX ENGKEL / B 1234 XYZ"
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Keterangan:</label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-0.5 font-bold">
                <input
                  type="checkbox"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="w-3.5 h-3.5 cursor-pointer"
                />
                <span>Expedisi Aktif</span>
              </label>
              {modalError && (
                <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                  ⚠ {modalError}
                </div>
              )}
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ACA899]">
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
          { header: 'Kode', accessor: (r) => r.kodeExpedisi, widthClass: 'w-20', mono: true, bold: true },
          { header: 'Nama Expedisi', accessor: (r) => r.namaExpedisi, bold: true },
          { header: 'Kota', accessor: (r) => r.kota || '-', widthClass: 'w-24' },
          { header: 'Phone 1', accessor: (r) => r.phone1 || '-', widthClass: 'w-28' },
          { header: 'Phone 2', accessor: (r) => r.phone2 || '-', widthClass: 'w-28' },
          { header: 'PIC', accessor: (r) => r.contactPerson || '-', widthClass: 'w-28' },
        ]}
      />

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Konfirmasi Hapus Master Expedisi"
        message={`Yakin ingin menghapus Expedisi [${selectedExpedisi?.kodeExpedisi || ''} - ${selectedExpedisi?.namaExpedisi || ''}]?`}
        detail="Data yang sudah dihapus tidak dapat dikembalikan."
        isBusy={isBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MASTER EXPEDISI"
        subtitle={`Total Record: ${filteredExpedisi.length}`}
        orientation="landscape"
        columns={[
          { header: 'Kode', accessor: 'kodeExpedisi', width: '70px' },
          { header: 'Nama Expedisi', accessor: 'namaExpedisi', width: '130px' },
          { header: 'Alamat', accessor: 'alamat' },
          { header: 'Kota', accessor: 'kota', width: '85px' },
          { header: 'Telepon 1', accessor: 'phone1', width: '88px' },
          { header: 'Telepon 2', accessor: 'phone2', width: '88px' },
          { header: 'Contact Person', accessor: 'contactPerson', width: '100px' },
          { header: 'Armada', accessor: 'armada', width: '90px' },
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
                { label: 'Telepon 1 / 2', value: [selectedExpedisi.phone1, selectedExpedisi.phone2].filter(Boolean).join(' / ') || '-' },
                { label: 'PIC / Armada', value: [selectedExpedisi.contactPerson, selectedExpedisi.armada].filter(Boolean).join(' | ') || '-' },
              ]
            : undefined
        }
      />
    </div>
  );
};
