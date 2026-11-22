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
  nextUniqueCode,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { matchesMultiKeyword } from '../lib/searchUtils';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { ConfirmDialog } from './ConfirmDialog';
import {
  cascadeMasterRename,
  checkMasterUsage,
  isMissingColumnError,
  isValidEmail,
  isValidWebsite,
} from '../lib/masterValidation';

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
  npwp: string;
  tmpPembayaran: number;
  noRekening: string;
  mataUang: string;
  isActive: boolean;
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
    npwp: r.npwp || '',
    tmpPembayaran: Number(r.tmp_pembayaran || 0),
    noRekening: r.no_rekening || '',
    mataUang: r.mata_uang || 'IDR',
    isActive: r.is_active !== false,
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
  const [newNpwp, setNewNpwp] = useState('');
  const [newTmpPembayaran, setNewTmpPembayaran] = useState('30');
  const [newNoRekening, setNewNoRekening] = useState('');
  const [newMataUang, setNewMataUang] = useState('IDR');
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
      const basePayload = {
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
      };
      let saved: any;
      let usedFallback = false;
      try {
        saved = await erpUpdate<any>('master_suppliers', selected.id, {
          ...basePayload,
          npwp: selected.npwp.trim(),
          tmp_pembayaran: Number(selected.tmpPembayaran) || 0,
          no_rekening: selected.noRekening.trim(),
          mata_uang: selected.mataUang || 'IDR',
          is_active: selected.isActive,
        });
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          saved = await erpUpdate<any>('master_suppliers', selected.id, basePayload);
        } else {
          throw err;
        }
      }
      const mapped = mapDbToItem(saved);
      setSupplierList((prev) => prev.map((s) => (s.id === selected.id ? mapped : s)));
      showFeedback(
        usedFallback
          ? `Supplier [${mapped.kodeSupplier}] tersimpan (jalankan SQL migrasi untuk kolom tambahan)`
          : `Supplier [${mapped.kodeSupplier} - ${mapped.namaSupplier}] tersimpan ke Supabase`
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
    setNewKode(nextUniqueCode(supplierList.map((s) => s.kodeSupplier), 'SUP', 3));
    setNewNama('');
    setNewHutang('0');
    setNewHutangGiro('0');
    setNewAlamat('');
    setNewKota('');
    setNewTelepon('');
    setNewContactPerson('');
    setNewEmail('');
    setNewWebsite('');
    setNewNpwp('');
    setNewTmpPembayaran('30');
    setNewNoRekening('');
    setNewMataUang('IDR');
    setNewIsActive(true);
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
    setNewNpwp(item.npwp);
    setNewTmpPembayaran(String(item.tmpPembayaran ?? 0));
    setNewNoRekening(item.noRekening);
    setNewMataUang(item.mataUang || 'IDR');
    setNewIsActive(item.isActive !== false);
    setIsAddOpen(true);
  };

  const handleRequestDelete = async () => {
    const item = supplierList.find((s) => s.id === selectedId);
    if (!item) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    try {
      setIsBusy(true);
      const usageMsg = await checkMasterUsage([
        { table: 'purchase_orders', label: 'Purchase Order', eq: { nama_supplier: item.namaSupplier } },
        { table: 'pembelian_barangs', label: 'Pembelian Barang', eq: { nama_supplier: item.namaSupplier } },
        { table: 'retur_pembelians', label: 'Retur Pembelian', eq: { nama_supplier: item.namaSupplier } },
        { table: 'giro_pembelian_headers', label: 'Daftar Giro Pembelian', eq: { supplier: item.namaSupplier } },
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
      await erpDelete('master_suppliers', selectedId);
      const updated = supplierList.filter((s) => s.id !== selectedId);
      setSupplierList(updated);
      setSelectedId(updated[0]?.id || '');
      setConfirmDeleteOpen(false);
      showFeedback('Data supplier dihapus');
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
      setModalError('Kode dan Nama Supplier wajib diisi.');
      return;
    }
    if (supplierList.some((s) => s.kodeSupplier.toUpperCase() === cleanKode && s.id !== editingId)) {
      setModalError(`Kode Supplier [${cleanKode}] sudah terdaftar.`);
      return;
    }
    const hutangVal = parseFloat(newHutang) || 0;
    const giroVal = parseFloat(newHutangGiro) || 0;
    const tmpVal = parseInt(newTmpPembayaran, 10) || 0;
    if (hutangVal < 0 || giroVal < 0 || tmpVal < 0) {
      setModalError('Hutang, Hutang Giro, dan Tempo Pembayaran tidak boleh negatif.');
      return;
    }
    if (!isValidEmail(newEmail)) {
      setModalError('Format email supplier tidak valid.');
      return;
    }
    if (!isValidWebsite(newWebsite)) {
      setModalError('Format website tidak valid (contoh: https://perusahaan.com).');
      return;
    }

    try {
      setIsBusy(true);
      const legacyPayload = {
        kode_supplier: cleanKode,
        nama_supplier: cleanNama,
        hutang: hutangVal,
        hutang_giro: giroVal,
        alamat: newAlamat.trim(),
        kota: newKota.trim().toUpperCase(),
        telepon: newTelepon.trim(),
      };
      const midPayload = {
        ...legacyPayload,
        contact_person: newContactPerson.trim(),
        email: newEmail.trim(),
        website: newWebsite.trim(),
      };
      const fullPayload = {
        ...midPayload,
        npwp: newNpwp.trim(),
        tmp_pembayaran: tmpVal,
        no_rekening: newNoRekening.trim(),
        mata_uang: newMataUang.trim().toUpperCase() || 'IDR',
        is_active: newIsActive,
      };
      let saved: any;
      let usedFallback = false;
      const saveFn = async (payload: Record<string, any>) =>
        editingId
          ? erpUpdate<any>('master_suppliers', editingId, payload)
          : erpCreate<any>('master_suppliers', payload);
      try {
        saved = await saveFn(fullPayload);
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          try {
            saved = await saveFn(midPayload);
          } catch (err2: any) {
            if (isMissingColumnError(err2?.message || '')) {
              saved = await saveFn(legacyPayload);
            } else {
              throw err2;
            }
          }
        } else {
          throw err;
        }
      }
      const mapped = mapDbToItem(saved);
      if (editingId) {
        const prevItem = supplierList.find((s) => s.id === editingId);
        setSupplierList((prev) =>
          prev
            .map((s) => (s.id === editingId ? mapped : s))
            .sort((a, b) => a.kodeSupplier.localeCompare(b.kodeSupplier))
        );
        if (prevItem && prevItem.namaSupplier !== mapped.namaSupplier) {
          await Promise.all([
            cascadeMasterRename('purchase_orders', 'nama_supplier', prevItem.namaSupplier, { nama_supplier: mapped.namaSupplier }),
            cascadeMasterRename('pembelian_barangs', 'nama_supplier', prevItem.namaSupplier, { nama_supplier: mapped.namaSupplier }),
            cascadeMasterRename('retur_pembelians', 'nama_supplier', prevItem.namaSupplier, { nama_supplier: mapped.namaSupplier }),
            cascadeMasterRename('giro_pembelian_headers', 'supplier', prevItem.namaSupplier, { supplier: mapped.namaSupplier }),
          ]);
        }
        showFeedback(
          usedFallback
            ? 'Data diperbarui (jalankan SQL migrasi untuk NPWP / Tempo / Rekening / Currency)'
            : 'Data diperbarui'
        );
      } else {
        setSupplierList((prev) => [mapped, ...prev].sort((a, b) => a.kodeSupplier.localeCompare(b.kodeSupplier)));
        setSelectedId(mapped.id);
        showFeedback(
          usedFallback
            ? 'Data tersimpan (jalankan SQL migrasi untuk NPWP / Tempo / Rekening / Currency)'
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
        { header: 'NPWP', accessor: 'npwp' },
        { header: 'Tempo (Hari)', accessor: 'tmpPembayaran', align: 'right' },
        { header: 'No. Rekening', accessor: 'noRekening' },
        { header: 'Curr', accessor: 'mataUang' },
        { header: 'Alamat', accessor: 'alamat' },
        { header: 'Kota', accessor: 'kota' },
        { header: 'Telepon', accessor: 'telepon' },
        { header: 'Contact Person', accessor: 'contactPerson' },
        { header: 'Email', accessor: 'email' },
        { header: 'Website', accessor: 'website' },
        { header: 'Status', accessor: (r) => (r.isActive ? 'AKTIF' : 'NON-AKTIF') },
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
            onHapus={handleRequestDelete}
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

        <div className="flex-1 overflow-auto bg-white mx-2 mt-2 border border-[#ACA899] shadow-inner">
          <div className="min-w-max">
            <table className="w-full text-left text-[11px] border-collapse select-none">
              <thead className="sticky top-0 bg-[#ECE9D8] text-black font-semibold border-b border-[#ACA899]">
                <tr className="h-[24px]">
                  <th className="w-[20px] min-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0" />
                  <th className="w-[85px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kode</th>
                  <th className="w-[200px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Nama Supplier</th>
                  <th className="w-[105px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Hutang</th>
                  <th className="w-[105px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Hutang Giro</th>
                  <th className="w-[125px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">NPWP</th>
                  <th className="w-[65px] border-r border-[#ACA899] px-2 py-0.5 text-center font-bold bg-[#ECE9D8]">Tempo</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">No. Rekening</th>
                  <th className="w-[50px] border-r border-[#ACA899] px-2 py-0.5 text-center font-bold bg-[#ECE9D8]">Curr</th>
                  <th className="w-[190px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Alamat</th>
                  <th className="w-[100px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kota</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Telepon</th>
                  <th className="w-[130px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Contact Person</th>
                  <th className="w-[155px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Email</th>
                  <th className="w-[155px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Website</th>
                  <th className="w-[75px] px-2 py-0.5 text-center font-bold bg-[#ECE9D8]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplier.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-6 text-gray-500 italic">
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
                          isSelected
                            ? 'bg-[#0A246A] text-white'
                            : !item.isActive
                            ? 'bg-[#F3F3F3] text-gray-500 hover:bg-[#E8EEF8]'
                            : 'bg-white hover:bg-[#E8EEF8]'
                        }`}
                      >
                        <td className="w-[20px] min-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0">
                          {isSelected ? <span className="text-[10px] font-bold text-black">▶</span> : null}
                        </td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold">{item.kodeSupplier}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-semibold">{item.namaSupplier}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-right font-mono">{item.hutang.toLocaleString('id-ID')}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-right font-mono">{item.hutangGiro.toLocaleString('id-ID')}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-mono">{item.npwp || '-'}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-center font-mono">{item.tmpPembayaran} hr</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-mono">{item.noRekening || '-'}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-center font-mono">{item.mataUang}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.alamat}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.kota}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.telepon}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.contactPerson || '-'}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.email || '-'}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.website || '-'}</td>
                        <td className="px-2 py-0.5 text-center text-[10px] font-bold">
                          {item.isActive ? 'AKTIF' : 'NON-AKTIF'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 text-[11px] font-sans">
          <div className="w-[450px] max-w-[60vw] truncate h-[22px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 flex items-center text-gray-700">
            {selectedSupplier ? `Supplier Terpilih: ${selectedSupplier.kodeSupplier} - ${selectedSupplier.namaSupplier}` : ''}
          </div>
          <div className="flex items-center space-x-6 text-[12px] font-bold text-black pr-16">
            <span>Record</span>
            <span className="font-mono">{filteredSupplier.length}</span>
          </div>
        </div>
      </div>

      {/* Add / Koreksi Modal */}
      {isAddOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-[580px] max-w-[96vw] max-h-[92vh] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl p-4 flex flex-col overflow-hidden">
            <div className="bg-[#000080] text-white px-2 py-1 font-bold text-[12px] flex justify-between items-center mb-3 shrink-0">
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
            <form noValidate onSubmit={handleSaveNew} className="space-y-2.5 text-[11px] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold mb-1">Kode:</label>
                  <input
                    type="text"
                    required
                    value={newKode}
                    onChange={(e) => setNewKode(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase font-mono font-bold"
                    placeholder="SUP001"
                  />
                </div>
                <div className="col-span-2">
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
                  <label className="block font-bold mb-1">
                    Hutang (Rp) {editingId && <span className="text-[9px] font-normal text-gray-600">(Auto transaksi)</span>}:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newHutang}
                    onChange={(e) => setNewHutang(e.target.value)}
                    readOnly={Boolean(editingId)}
                    title={editingId ? 'Otomatis disinkronkan dari Pembelian, Retur Pembelian & Giro Pembelian' : undefined}
                    className={`w-full h-[24px] border border-[#7F9DB9] px-2 font-mono text-right ${
                      editingId ? 'bg-[#ECE9D8] text-gray-600 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    Hutang Giro (Rp) {editingId && <span className="text-[9px] font-normal text-gray-600">(Auto transaksi)</span>}:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newHutangGiro}
                    onChange={(e) => setNewHutangGiro(e.target.value)}
                    readOnly={Boolean(editingId)}
                    title={editingId ? 'Otomatis disinkronkan dari Daftar Giro Pembelian yang belum cair' : undefined}
                    className={`w-full h-[24px] border border-[#7F9DB9] px-2 font-mono text-right ${
                      editingId ? 'bg-[#ECE9D8] text-gray-600 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold mb-1">NPWP:</label>
                  <input
                    type="text"
                    value={newNpwp}
                    onChange={(e) => setNewNpwp(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
                    placeholder="00.000.000.0-000.000"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Tempo Bayar (Hari):</label>
                  <input
                    type="number"
                    min="0"
                    value={newTmpPembayaran}
                    onChange={(e) => setNewTmpPembayaran(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Mata Uang:</label>
                  <select
                    value={newMataUang}
                    onChange={(e) => setNewMataUang(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 cursor-pointer"
                  >
                    <option value="IDR">IDR</option>
                    <option value="USD">USD</option>
                    <option value="SGD">SGD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">No. Rekening Supplier:</label>
                <input
                  type="text"
                  value={newNoRekening}
                  onChange={(e) => setNewNoRekening(e.target.value)}
                  className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
                  placeholder="Contoh: BCA 1234567890 a/n PT. SUPPLIER"
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
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
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

              <label className="flex items-center gap-2 cursor-pointer font-bold pt-0.5">
                <input
                  type="checkbox"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="w-3.5 h-3.5 cursor-pointer"
                />
                <span>Supplier Aktif</span>
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

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Konfirmasi Hapus Master Supplier"
        message={`Yakin ingin menghapus Supplier [${selectedSupplier?.kodeSupplier || ''} - ${selectedSupplier?.namaSupplier || ''}]?`}
        detail="Data yang sudah dihapus tidak dapat dikembalikan."
        isBusy={isBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MASTER SUPPLIER"
        subtitle={`Total Record: ${filteredSupplier.length}`}
        orientation="landscape"
        columns={[
          { header: 'Kode', accessor: 'kodeSupplier', width: '62px' },
          { header: 'Nama Supplier', accessor: 'namaSupplier', width: '125px' },
          { header: 'Hutang', accessor: (r) => formatMoney(r.hutang), align: 'right', width: '78px' },
          { header: 'Hutang Giro', accessor: (r) => formatMoney(r.hutangGiro), align: 'right', width: '78px' },
          { header: 'Tempo', accessor: (r) => `${r.tmpPembayaran} hr`, align: 'center', width: '48px' },
          { header: 'NPWP', accessor: (r) => r.npwp || '-', width: '92px' },
          { header: 'Alamat', accessor: 'alamat', width: '115px' },
          { header: 'Kota', accessor: 'kota', width: '72px' },
          { header: 'Telepon', accessor: 'telepon', width: '80px' },
          { header: 'Contact Person', accessor: 'contactPerson', width: '88px' },
          { header: 'Email', accessor: 'email', width: '95px' },
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
                { label: 'NPWP / Tempo', value: `${selectedSupplier.npwp || '-'} | ${selectedSupplier.tmpPembayaran} Hari (${selectedSupplier.mataUang})` },
                { label: 'No. Rekening', value: selectedSupplier.noRekening || '-' },
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
