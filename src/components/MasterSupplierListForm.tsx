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
import { matchesMultiKeyword } from '../lib/searchUtils';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';

export interface SupplierItem {
  id: string;
  kodeSupplier: string;
  namaSupplier: string;
  hutang: number;
  hutangGiro: number;
  alamat: string;
  kota: string;
  telepon: string;
  contactPerson: string;
  email: string;
  website: string;
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
    contactPerson: r.contact_person || '',
    email: r.email || '',
    website: r.website || '',
  };
}

export const MasterSupplierListForm: React.FC<MasterSupplierListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [supplierList, setSupplierList] = useState<SupplierItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');

  const [isFindOpen, setIsFindOpen] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newHutang, setNewHutang] = useState('0');
  const [newHutangGiro, setNewHutangGiro] = useState('0');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('');
  const [newTelepon, setNewTelepon] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newWebsite, setNewWebsite] = useState('');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const SEARCH_FIELD_TO_DB_COL: Record<string, string> = {
    Kode: 'kode_supplier',
    'Nama Supplier': 'nama_supplier',
    Alamat: 'alamat',
    Kota: 'kota',
    Telepon: 'telepon',
    'Contact Person': 'contact_person',
    Email: 'email',
    Website: 'website',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
  }): Promise<SupplierItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();

      const queryOpts: Record<string, any> = {
        orderBy: 'kode_supplier',
        asc: true,
        limit: 1000,
      };
      if (activeTerm) {
        const dbCol = SEARCH_FIELD_TO_DB_COL[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch =
            'kode_supplier,nama_supplier,alamat,kota,telepon,contact_person,email,website';
          queryOpts.searchVal = activeTerm;
        }
      }

      const rows = await erpList<any>('master_suppliers', queryOpts);
      const mapped = rows.map(mapDbToItem);
      setSupplierList(mapped);
      if (mapped.length > 0 && !mapped.some((s) => s.id === selectedId)) {
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
    const selected = supplierList.find((s) => s.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record yang akan disimpan terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const saved = await erpUpdate<any>('master_suppliers', selected.id, {
        kode_supplier: selected.kodeSupplier.trim().toUpperCase(),
        nama_supplier: selected.namaSupplier.trim().toUpperCase(),
        hutang: Number(selected.hutang) || 0,
        hutang_giro: Number(selected.hutangGiro) || 0,
        alamat: selected.alamat.trim(),
        kota: selected.kota.trim().toUpperCase(),
        telepon: selected.telepon.trim(),
        contact_person: selected.contactPerson.trim(),
        email: selected.email.trim(),
        website: selected.website.trim(),
      });
      const mapped = mapDbToItem(saved);
      setSupplierList((prev) => prev.map((s) => (s.id === selected.id ? mapped : s)));
      showFeedback(`Supplier [${mapped.kodeSupplier} - ${mapped.namaSupplier}] tersimpan ke Supabase`);
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
    setNewHutang('0');
    setNewHutangGiro('0');
    setNewAlamat('');
    setNewKota('');
    setNewTelepon('');
    setNewContactPerson('');
    setNewEmail('');
    setNewWebsite('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = supplierList.find((s) => s.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewKode(item.kodeSupplier);
    setNewNama(item.namaSupplier);
    setNewHutang(String(item.hutang));
    setNewHutangGiro(String(item.hutangGiro));
    setNewAlamat(item.alamat);
    setNewKota(item.kota);
    setNewTelepon(item.telepon);
    setNewContactPerson(item.contactPerson);
    setNewEmail(item.email);
    setNewWebsite(item.website);
    setIsAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
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
    setModalError(null);
    if (!newKode.trim() || !newNama.trim()) {
      setModalError('Kode dan Nama Supplier wajib diisi.');
      return;
    }

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
        contact_person: newContactPerson.trim(),
        email: newEmail.trim(),
        website: newWebsite.trim(),
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
      const rawMsg = err?.message || 'Gagal menyimpan data ke database';
      const msg =
        (rawMsg.includes('contact_person') ||
          rawMsg.includes('email') ||
          rawMsg.includes('website')) &&
        rawMsg.toLowerCase().includes('schema cache')
          ? `${rawMsg} — Jalankan SQL Query penambahan kolom contact_person, email, website pada tabel master_suppliers di Supabase SQL Editor.`
          : rawMsg;
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filteredSupplier = supplierList.filter((item) => {
    if (searchField === 'Kode') return matchesMultiKeyword([item.kodeSupplier], searchTerm);
    if (searchField === 'Nama Supplier') return matchesMultiKeyword([item.namaSupplier], searchTerm);
    if (searchField === 'Alamat') return matchesMultiKeyword([item.alamat], searchTerm);
    if (searchField === 'Kota') return matchesMultiKeyword([item.kota], searchTerm);
    if (searchField === 'Telepon') return matchesMultiKeyword([item.telepon], searchTerm);
    if (searchField === 'Contact Person') return matchesMultiKeyword([item.contactPerson], searchTerm);
    if (searchField === 'Email') return matchesMultiKeyword([item.email], searchTerm);
    if (searchField === 'Website') return matchesMultiKeyword([item.website], searchTerm);
    return matchesMultiKeyword(
      [
        item.kodeSupplier,
        item.namaSupplier,
        item.alamat,
        item.kota,
        item.telepon,
        item.contactPerson,
        item.email,
        item.website,
      ],
      searchTerm
    );
  });

  const selectedSupplier =
    filteredSupplier.find((s) => s.id === selectedId) ||
    supplierList.find((s) => s.id === selectedId) ||
    null;

  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
    const matched = supplierList.filter((item) => {
      if (searchField === 'Kode') return matchesMultiKeyword([item.kodeSupplier], val);
      if (searchField === 'Nama Supplier') return matchesMultiKeyword([item.namaSupplier], val);
      if (searchField === 'Alamat') return matchesMultiKeyword([item.alamat], val);
      if (searchField === 'Kota') return matchesMultiKeyword([item.kota], val);
      if (searchField === 'Telepon') return matchesMultiKeyword([item.telepon], val);
      if (searchField === 'Contact Person') return matchesMultiKeyword([item.contactPerson], val);
      if (searchField === 'Email') return matchesMultiKeyword([item.email], val);
      if (searchField === 'Website') return matchesMultiKeyword([item.website], val);
      return matchesMultiKeyword(
        [
          item.kodeSupplier,
          item.namaSupplier,
          item.alamat,
          item.kota,
          item.telepon,
          item.contactPerson,
          item.email,
          item.website,
        ],
        val
      );
    });
    if (matched.length > 0 && !matched.some((m) => m.id === selectedId)) {
      setSelectedId(matched[0].id);
    }
  };

  const handleExecuteToolbarSearch = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows && rows.length > 0) {
      setSelectedId(rows[0].id);
      showFeedback(
        searchTerm.trim()
          ? `Ditemukan ${rows.length} Master Supplier dari Supabase`
          : `Menampilkan ${rows.length} Master Supplier dari Supabase`
      );
    } else if (rows) {
      setSelectedId('');
      showFeedback('Data Master Supplier tidak ditemukan di Supabase');
    }
  };

  const handleResetSearch = async () => {
    setSearchTerm('');
    setSearchField('Semua');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) {
      showFeedback(`Filter direset (${rows.length} Master Supplier)`);
    }
  };

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
        { header: 'Contact Person', accessor: 'contactPerson' },
        { header: 'Email', accessor: 'email' },
        { header: 'Website', accessor: 'website' },
      ],
      rows: filteredSupplier,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
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
          onTableView={() => loadData({ field: searchField, term: searchTerm })}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 h-[44px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-3 space-x-2 overflow-x-auto">
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
          <div className="h-[22px] w-[1px] bg-[#ACA899] mx-1" />
          <button
            type="button"
            onClick={() => loadData({ field: searchField, term: searchTerm })}
            className="h-[28px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] cursor-pointer text-[11px] font-semibold text-black shrink-0"
          >
            Refresh
          </button>

          <ToolbarSearchControl
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={handleSearchTermChange}
            onCari={handleExecuteToolbarSearch}
            onReset={handleResetSearch}
            inputRef={searchInputRef}
            isBusy={isBusy}
            inputWidthClass="w-[160px]"
            compact
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode' },
              { value: 'Nama Supplier', label: 'Nama Supplier' },
              { value: 'Alamat', label: 'Alamat' },
              { value: 'Kota', label: 'Kota' },
              { value: 'Telepon', label: 'Telepon' },
              { value: 'Contact Person', label: 'Contact Person' },
              { value: 'Email', label: 'Email' },
              { value: 'Website', label: 'Website' },
            ]}
          />
        </div>

        <div className="flex-1 overflow-auto bg-white m-2 border border-[#ACA899] shadow-inner">
          <div className="min-w-max">
            <table className="w-full text-left text-[11px] border-collapse select-none">
              <thead className="sticky top-0 bg-[#ECE9D8] text-black font-semibold border-b border-[#ACA899]">
                <tr className="h-[24px]">
                  <th className="w-[20px] min-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0" />
                  <th className="w-[90px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kode</th>
                  <th className="w-[210px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Nama Supplier</th>
                  <th className="w-[115px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Hutang</th>
                  <th className="w-[115px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Hutang Giro</th>
                  <th className="w-[210px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Alamat</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kota</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Telepon</th>
                  <th className="w-[150px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Contact Person</th>
                  <th className="w-[170px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Email</th>
                  <th className="w-[170px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Website</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplier.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-6 text-gray-500 italic">
                      Tidak ada data Master Supplier
                    </td>
                  </tr>
                ) : (
                  filteredSupplier.map((item) => {
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
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.contactPerson || '-'}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.email || '-'}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.website || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Koreksi Modal */}
      {isAddOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-[540px] max-w-[96vw] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl p-4 flex flex-col">
            <div className="bg-[#000080] text-white px-2 py-1 font-bold text-[12px] flex justify-between items-center mb-3">
              <span>{editingId ? 'Koreksi Master Supplier' : 'Tambah Master Supplier Baru'}</span>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsAddOpen(false);
                }}
                className="text-white hover:bg-red-600 px-1 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form noValidate onSubmit={handleSaveNew} className="space-y-2.5 text-[11px]">
              <div className="grid grid-cols-2 gap-2.5">
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

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold mb-1">Hutang (Rp):</label>
                  <input
                    type="number"
                    value={newHutang}
                    onChange={(e) => setNewHutang(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Hutang Giro (Rp):</label>
                  <input
                    type="number"
                    value={newHutangGiro}
                    onChange={(e) => setNewHutangGiro(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
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

              <div className="grid grid-cols-2 gap-2.5">
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

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold mb-1">Contact Person:</label>
                  <input
                    type="text"
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                    placeholder="Nama PIC / Contact Person"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Email:</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                    placeholder="supplier@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Website:</label>
                <input
                  type="text"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                  placeholder="https://www.perusahaan.com"
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
        tableLabel="Master Supplier"
        rows={supplierList}
        selectedId={selectedId}
        getRowId={(s) => s.id}
        getSearchValues={(s) => [
          s.kodeSupplier,
          s.namaSupplier,
          s.alamat,
          s.kota,
          s.telepon,
          s.contactPerson,
          s.email,
          s.website,
        ]}
        initialQuery={searchTerm}
        isBusy={isBusy}
        placeholder="Cari Kode, Nama Supplier, Alamat, Kota, Telepon, Contact Person, Email, Website..."
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
        onSelectRow={(s, q) => {
          setSelectedId(s.id);
          setSearchTerm(q);
          showFeedback(`Supplier [${s.kodeSupplier} - ${s.namaSupplier}] dipilih`);
        }}
        columns={[
          { header: 'Kode', accessor: (s) => s.kodeSupplier, widthClass: 'w-20', mono: true, bold: true },
          { header: 'Nama Supplier', accessor: (s) => s.namaSupplier, bold: true },
          { header: 'Kota', accessor: (s) => s.kota || '-', widthClass: 'w-24' },
          { header: 'Telepon', accessor: (s) => s.telepon || '-', widthClass: 'w-28' },
          { header: 'Contact Person', accessor: (s) => s.contactPerson || '-', widthClass: 'w-32' },
          { header: 'Email', accessor: (s) => s.email || '-', widthClass: 'w-36' },
          { header: 'Website', accessor: (s) => s.website || '-', widthClass: 'w-36' },
        ]}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MASTER SUPPLIER"
        subtitle={`Total Record: ${filteredSupplier.length}`}
        orientation="landscape"
        columns={[
          { header: 'Kode', accessor: 'kodeSupplier', width: '68px' },
          { header: 'Nama Supplier', accessor: 'namaSupplier', width: '130px' },
          { header: 'Hutang', accessor: (r) => formatMoney(r.hutang), align: 'right', width: '86px' },
          { header: 'Hutang Giro', accessor: (r) => formatMoney(r.hutangGiro), align: 'right', width: '86px' },
          { header: 'Alamat', accessor: 'alamat', width: '120px' },
          { header: 'Kota', accessor: 'kota', width: '78px' },
          { header: 'Telepon', accessor: 'telepon', width: '84px' },
          { header: 'Contact Person', accessor: 'contactPerson', width: '96px' },
          { header: 'Email', accessor: 'email', width: '104px' },
          { header: 'Website', accessor: 'website', width: '104px' },
        ]}
        rows={filteredSupplier}
        summaryItems={[
          {
            label: 'Total Supplier',
            value: `${filteredSupplier.length} Supplier`,
          },
          {
            label: 'Total Hutang',
            value: formatMoney(filteredSupplier.reduce((a, b) => a + b.hutang, 0)),
          },
          {
            label: 'Total Hutang Giro',
            value: formatMoney(filteredSupplier.reduce((a, b) => a + b.hutangGiro, 0)),
          },
        ]}
        selectedRow={selectedSupplier}
        selectedTitle="DETAIL MASTER SUPPLIER"
        selectedSubtitle={selectedSupplier ? `Kode: ${selectedSupplier.kodeSupplier} - ${selectedSupplier.namaSupplier}` : undefined}
        selectedMetaLines={
          selectedSupplier
            ? [
                { label: 'Kode Supplier', value: selectedSupplier.kodeSupplier },
                { label: 'Nama Supplier', value: selectedSupplier.namaSupplier },
                { label: 'Contact Person', value: selectedSupplier.contactPerson || '-' },
                { label: 'Email / Website', value: [selectedSupplier.email, selectedSupplier.website].filter(Boolean).join(' | ') || '-' },
              ]
            : undefined
        }
        selectedSummaryItems={
          selectedSupplier
            ? [
                { label: 'Hutang', value: formatMoney(selectedSupplier.hutang) },
                { label: 'Hutang Giro', value: formatMoney(selectedSupplier.hutangGiro) },
              ]
            : undefined
        }
      />
    </div>
  );
};
