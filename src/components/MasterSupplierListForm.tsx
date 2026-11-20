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
  const [findQuery, setFindQuery] = useState('');
  const findInputRef = useRef<HTMLInputElement>(null);

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
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows !== null) showFeedback('Data tersinkronisasi dengan database Supabase');
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
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    if (searchField === 'Kode') return item.kodeSupplier.toLowerCase().includes(term);
    if (searchField === 'Nama Supplier') return item.namaSupplier.toLowerCase().includes(term);
    if (searchField === 'Alamat') return item.alamat.toLowerCase().includes(term);
    if (searchField === 'Kota') return item.kota.toLowerCase().includes(term);
    if (searchField === 'Telepon') return item.telepon.toLowerCase().includes(term);
    if (searchField === 'Contact Person') return item.contactPerson.toLowerCase().includes(term);
    if (searchField === 'Email') return item.email.toLowerCase().includes(term);
    if (searchField === 'Website') return item.website.toLowerCase().includes(term);
    return (
      item.kodeSupplier.toLowerCase().includes(term) ||
      item.namaSupplier.toLowerCase().includes(term) ||
      item.alamat.toLowerCase().includes(term) ||
      item.kota.toLowerCase().includes(term) ||
      item.telepon.toLowerCase().includes(term) ||
      item.contactPerson.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term) ||
      item.website.toLowerCase().includes(term)
    );
  });

  const findModalRows = supplierList.filter((item) => {
    if (!findQuery.trim()) return true;
    const tokens = findQuery.trim().toLowerCase().split(/\s+/);
    const searchable = [
      item.kodeSupplier,
      item.namaSupplier,
      item.alamat,
      item.kota,
      item.telepon,
      item.contactPerson,
      item.email,
      item.website,
    ]
      .join(' ')
      .toLowerCase();
    return tokens.every((t) => searchable.includes(t));
  });

  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
    const clean = val.trim().toLowerCase();
    const matched = supplierList.filter((item) => {
      if (!clean) return true;
      if (searchField === 'Kode') return item.kodeSupplier.toLowerCase().includes(clean);
      if (searchField === 'Nama Supplier') return item.namaSupplier.toLowerCase().includes(clean);
      if (searchField === 'Alamat') return item.alamat.toLowerCase().includes(clean);
      if (searchField === 'Kota') return item.kota.toLowerCase().includes(clean);
      if (searchField === 'Telepon') return item.telepon.toLowerCase().includes(clean);
      if (searchField === 'Contact Person') return item.contactPerson.toLowerCase().includes(clean);
      if (searchField === 'Email') return item.email.toLowerCase().includes(clean);
      if (searchField === 'Website') return item.website.toLowerCase().includes(clean);
      return (
        item.kodeSupplier.toLowerCase().includes(clean) ||
        item.namaSupplier.toLowerCase().includes(clean) ||
        item.alamat.toLowerCase().includes(clean) ||
        item.kota.toLowerCase().includes(clean) ||
        item.telepon.toLowerCase().includes(clean) ||
        item.contactPerson.toLowerCase().includes(clean) ||
        item.email.toLowerCase().includes(clean) ||
        item.website.toLowerCase().includes(clean)
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
    setFindQuery(searchTerm);
    await loadData({ field: 'Semua', term: '' });
    setTimeout(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }, 60);
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

          <div className="ml-auto flex items-center space-x-1.5 text-[11px] shrink-0">
            <span className="font-semibold text-black">Search :</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-[22px] bg-white border border-[#7F9DB9] px-1 text-[11px]"
            >
              <option value="Semua">Semua</option>
              <option value="Nama Supplier">Nama Supplier</option>
              <option value="Kode">Kode</option>
              <option value="Alamat">Alamat</option>
              <option value="Kota">Kota</option>
              <option value="Telepon">Telepon</option>
              <option value="Contact Person">Contact Person</option>
              <option value="Email">Email</option>
              <option value="Website">Website</option>
            </select>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExecuteToolbarSearch();
              }}
              placeholder="Ketik kata kunci..."
              className="h-[22px] w-[150px] bg-white border border-[#7F9DB9] px-2 text-[11px]"
            />
            <button
              type="button"
              disabled={isBusy}
              onClick={handleExecuteToolbarSearch}
              className="h-[22px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer"
            >
              Cari
            </button>
            {(searchTerm || searchField !== 'Semua') && (
              <button
                type="button"
                disabled={isBusy}
                onClick={handleResetSearch}
                className="h-[22px] px-2 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
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

      {/* Find Modal: Cari & Daftar Master Supplier */}
      {isFindOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] shadow-2xl w-[940px] max-w-[96vw] max-h-[85vh] flex flex-col text-xs">
            <div className="bg-[#000080] text-white px-3 py-1.5 flex items-center justify-between font-bold shrink-0">
              <span>Cari &amp; Daftar Master Supplier (Supabase)</span>
              <button
                type="button"
                onClick={() => setIsFindOpen(false)}
                className="px-1.5 bg-[#C00000] text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-3 space-y-2 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-bold whitespace-nowrap">Cari :</span>
                <input
                  ref={findInputRef}
                  type="text"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      if (findModalRows.length > 0 && !findQuery.trim()) {
                        const first = findModalRows[0];
                        setSelectedId(first.id);
                        setSearchTerm(findQuery);
                        setIsFindOpen(false);
                        showFeedback(`Supplier [${first.kodeSupplier} - ${first.namaSupplier}] dipilih`);
                      } else {
                        const rows = await loadData({ field: 'Semua', term: findQuery });
                        setSearchField('Semua');
                        setSearchTerm(findQuery);
                        if (rows && rows.length > 0) {
                          setSelectedId(rows[0].id);
                          showFeedback(`Ditemukan ${rows.length} Supplier dari Supabase`);
                        } else if (rows) {
                          showFeedback('Data Supplier tidak ditemukan di Supabase');
                        }
                      }
                    }
                  }}
                  placeholder="Cari Kode, Nama Supplier, Alamat, Kota, Telepon, Contact Person, Email, Website..."
                  className="flex-1 h-[24px] px-2 bg-white border border-[#7F9DB9] outline-none"
                />
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    const rows = await loadData({ field: 'Semua', term: findQuery });
                    setSearchField('Semua');
                    setSearchTerm(findQuery);
                    if (rows && rows.length > 0) {
                      setSelectedId(rows[0].id);
                      showFeedback(`Ditemukan ${rows.length} Supplier dari Supabase`);
                    } else if (rows) {
                      showFeedback('Data Supplier tidak ditemukan di Supabase');
                    }
                  }}
                  className="h-[24px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer"
                >
                  Cari
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    setFindQuery('');
                    setSearchTerm('');
                    setSearchField('Semua');
                    await loadData({ field: 'Semua', term: '' });
                    showFeedback('Data Master Supplier di-refresh dari Supabase');
                  }}
                  className="h-[24px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer"
                >
                  Refresh
                </button>
              </div>
              <div className="flex-1 min-h-[240px] overflow-auto bg-white border border-[#7F9DB9]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#ACA899]">
                    <tr>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-20">Kode</th>
                      <th className="px-2 py-1 border-r border-[#ACA899]">Nama Supplier</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-24">Kota</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-28">Telepon</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-32">Contact Person</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-36">Email</th>
                      <th className="px-2 py-1 w-36">Website</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findModalRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-gray-500 italic">
                          Tidak ada data Supplier yang cocok
                        </td>
                      </tr>
                    ) : (
                      findModalRows.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => {
                            setSelectedId(s.id);
                            setSearchTerm(findQuery);
                            setIsFindOpen(false);
                            showFeedback(`Supplier [${s.kodeSupplier} - ${s.namaSupplier}] dipilih`);
                          }}
                          className={`cursor-pointer border-b border-[#E0E0E0] hover:bg-[#316AC5] hover:text-white ${
                            s.id === selectedId ? 'bg-[#FFFF99]' : ''
                          }`}
                        >
                          <td className="px-2 py-1 font-mono font-bold border-r border-[#E0E0E0]">{s.kodeSupplier}</td>
                          <td className="px-2 py-1 font-semibold border-r border-[#E0E0E0]">{s.namaSupplier}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{s.kota || '-'}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{s.telepon || '-'}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{s.contactPerson || '-'}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{s.email || '-'}</td>
                          <td className="px-2 py-1">{s.website || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-[#555]">
                  Menampilkan {findModalRows.length} dari {supplierList.length} Supplier. Klik baris untuk memilih record.
                </span>
                <button
                  type="button"
                  onClick={() => setIsFindOpen(false)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
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
      />
    </div>
  );
};
