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

export interface SalesItem {
  id: string;
  kodeSales: string;
  namaSales: string;
  alamat: string;
  kota: string;
  wilayah: string;
  telepon: string;
  email: string;
  limit: number;
  komisi: number;
  isActive: boolean;
}

interface MasterSalesListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToItem(r: any): SalesItem {
  return {
    id: r.id,
    kodeSales: r.kode_sales || '',
    namaSales: r.nama_sales || '',
    alamat: r.alamat || '',
    kota: r.kota || '',
    wilayah: r.wilayah || '',
    telepon: r.telepon || '',
    email: r.email || '',
    limit: Number(r.limit_kredit || 0),
    komisi: Number(r.komisi || 0),
    isActive: r.is_active !== false,
  };
}

export const MasterSalesListForm: React.FC<MasterSalesListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [salesList, setSalesList] = useState<SalesItem[]>([]);
  const [wilayahOptions, setWilayahOptions] = useState<string[]>([]);
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
  const [newWilayah, setNewWilayah] = useState('');
  const [newTelepon, setNewTelepon] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLimit, setNewLimit] = useState('10000000');
  const [newKomisi, setNewKomisi] = useState('2.0');
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
    Kode: 'kode_sales',
    'Nama Sales': 'nama_sales',
    Alamat: 'alamat',
    Kota: 'kota',
    Telepon: 'telepon',
    Email: 'email',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
  }): Promise<SalesItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();

      const queryOpts: Record<string, any> = {
        orderBy: 'kode_sales',
        asc: true,
        limit: 1000,
      };
      if (activeTerm) {
        const dbCol = SEARCH_FIELD_TO_DB_COL[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'kode_sales,nama_sales,alamat,kota,telepon,email';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows, wilRes] = await Promise.all([
        erpList<any>('master_sales', queryOpts),
        erpList<any>('master_wilayahs', { orderBy: 'wilayah', asc: true, limit: 1000 }).catch(() => []),
      ]);
      const wOpts = Array.from(
        new Set(
          (wilRes || [])
            .map((w: any) => {
              const kode = String(w.kode_wilayah || w.kode || '').trim().toUpperCase();
              const nama = String(w.wilayah || w.nama_wilayah || '').trim().toUpperCase();
              return kode && nama ? `${kode} - ${nama}` : nama || kode;
            })
            .filter(Boolean)
        )
      );
      setWilayahOptions(wOpts);
      const mapped = rows.map(mapDbToItem);
      setSalesList(mapped);
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
    const selected = salesList.find((s) => s.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record yang akan disimpan terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const corePayload = {
        kode_sales: selected.kodeSales.trim().toUpperCase(),
        nama_sales: selected.namaSales.trim().toUpperCase(),
        alamat: selected.alamat.trim(),
        kota: selected.kota.trim().toUpperCase(),
        telepon: selected.telepon.trim(),
        email: selected.email.trim(),
        limit_kredit: Number(selected.limit) || 0,
        komisi: Number(selected.komisi) || 0,
      };
      let saved: any;
      let usedFallback = false;
      try {
        saved = await erpUpdate<any>('master_sales', selected.id, {
          ...corePayload,
          wilayah: selected.wilayah.trim().toUpperCase(),
          is_active: selected.isActive,
        });
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          saved = await erpUpdate<any>('master_sales', selected.id, corePayload);
        } else {
          throw err;
        }
      }
      const mapped = mapDbToItem(saved);
      setSalesList((prev) => prev.map((s) => (s.id === selected.id ? mapped : s)));
      showFeedback(
        usedFallback
          ? `Sales [${mapped.kodeSales}] tersimpan (jalankan SQL migrasi untuk kolom Wilayah / Status)`
          : `Sales [${mapped.kodeSales} - ${mapped.namaSales}] tersimpan ke Supabase`
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
    setNewKode(nextUniqueCode(salesList.map((s) => s.kodeSales), 'SLS', 3));
    setNewNama('');
    setNewAlamat('');
    setNewKota('');
    setNewWilayah('');
    setNewTelepon('');
    setNewEmail('');
    setNewLimit('10000000');
    setNewKomisi('2.0');
    setNewIsActive(true);
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = salesList.find((s) => s.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewKode(item.kodeSales);
    setNewNama(item.namaSales);
    setNewAlamat(item.alamat);
    setNewKota(item.kota);
    setNewWilayah(item.wilayah || '');
    setNewTelepon(item.telepon);
    setNewEmail(item.email);
    setNewLimit(String(item.limit));
    setNewKomisi(String(item.komisi));
    setNewIsActive(item.isActive !== false);
    setIsAddOpen(true);
  };

  const handleRequestDelete = async () => {
    const item = salesList.find((s) => s.id === selectedId);
    if (!item) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    try {
      setIsBusy(true);
      const usageMsg = await checkMasterUsage([
        { table: 'master_customers', label: 'Master Customer', eq: { kode_sales: item.kodeSales } },
        { table: 'sales_orders', label: 'Sales Order', eq: { sales: item.namaSales } },
        { table: 'faktur_penjualans', label: 'Faktur Penjualan', eq: { sales: item.namaSales } },
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
      await erpDelete('master_sales', selectedId);
      const updated = salesList.filter((s) => s.id !== selectedId);
      setSalesList(updated);
      setSelectedId(updated[0]?.id || '');
      setConfirmDeleteOpen(false);
      showFeedback('Data sales dihapus');
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
      setModalError('Kode dan Nama Sales wajib diisi.');
      return;
    }
    if (salesList.some((s) => s.kodeSales.toUpperCase() === cleanKode && s.id !== editingId)) {
      setModalError(`Kode Sales [${cleanKode}] sudah terdaftar.`);
      return;
    }
    if (!isValidEmail(newEmail)) {
      setModalError('Format email sales tidak valid.');
      return;
    }
    const limitVal = parseFloat(newLimit) || 0;
    const komisiVal = parseFloat(newKomisi) || 0;
    if (limitVal < 0) {
      setModalError('Limit kredit sales tidak boleh negatif.');
      return;
    }
    if (komisiVal < 0 || komisiVal > 100) {
      setModalError('Persentase komisi harus berada di antara 0% sampai 100%.');
      return;
    }

    try {
      setIsBusy(true);
      const safeCorePayload = {
        kode_sales: cleanKode,
        nama_sales: cleanNama,
        alamat: newAlamat.trim(),
        kota: newKota.trim().toUpperCase(),
        telepon: newTelepon.trim(),
        limit_kredit: limitVal,
        komisi: komisiVal,
      };
      const withEmailPayload = {
        ...safeCorePayload,
        email: newEmail.trim(),
      };
      const fullPayload = {
        ...withEmailPayload,
        wilayah: newWilayah.trim().toUpperCase(),
        is_active: newIsActive,
      };
      let saved: any;
      let usedFallback = false;
      const saveFn = async (payload: Record<string, any>) =>
        editingId
          ? erpUpdate<any>('master_sales', editingId, payload)
          : erpCreate<any>('master_sales', payload);

      try {
        saved = await saveFn(fullPayload);
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          try {
            saved = await saveFn(withEmailPayload);
          } catch (err2: any) {
            if (isMissingColumnError(err2?.message || '')) {
              saved = await saveFn(safeCorePayload);
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
        const prevItem = salesList.find((s) => s.id === editingId);
        setSalesList((prev) =>
          prev
            .map((s) => (s.id === editingId ? mapped : s))
            .sort((a, b) => a.kodeSales.localeCompare(b.kodeSales))
        );
        if (prevItem && (prevItem.kodeSales !== mapped.kodeSales || prevItem.namaSales !== mapped.namaSales)) {
          await Promise.all([
            cascadeMasterRename('master_customers', 'kode_sales', prevItem.kodeSales, {
              kode_sales: mapped.kodeSales,
              nama_sales: mapped.namaSales,
              sales: mapped.namaSales,
            }),
            cascadeMasterRename('sales_orders', 'sales', prevItem.namaSales, { sales: mapped.namaSales }),
            cascadeMasterRename('faktur_penjualans', 'sales', prevItem.namaSales, { sales: mapped.namaSales }),
          ]);
        }
        showFeedback(
          usedFallback
            ? 'Data diperbarui (jalankan SQL migrasi untuk kolom Wilayah / Status)'
            : 'Data diperbarui'
        );
      } else {
        setSalesList((prev) => [mapped, ...prev].sort((a, b) => a.kodeSales.localeCompare(b.kodeSales)));
        setSelectedId(mapped.id);
        showFeedback(
          usedFallback
            ? 'Data tersimpan (jalankan SQL migrasi untuk kolom Wilayah / Status)'
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

  const matchesSearch = (item: SalesItem, field: string, rawTerm: string): boolean => {
    if (field === 'Kode') return matchesMultiKeyword([item.kodeSales], rawTerm);
    if (field === 'Nama Sales') return matchesMultiKeyword([item.namaSales], rawTerm);
    if (field === 'Alamat') return matchesMultiKeyword([item.alamat], rawTerm);
    if (field === 'Kota') return matchesMultiKeyword([item.kota], rawTerm);
    if (field === 'Telepon') return matchesMultiKeyword([item.telepon], rawTerm);
    if (field === 'Email') return matchesMultiKeyword([item.email], rawTerm);
    return matchesMultiKeyword(
      [item.kodeSales, item.namaSales, item.alamat, item.kota, item.wilayah, item.telepon, item.email],
      rawTerm
    );
  };

  const filteredSales = salesList.filter((item) =>
    matchesSearch(item, searchField, searchTerm)
  );

  const selectedSales =
    filteredSales.find((s) => s.id === selectedId) ||
    salesList.find((s) => s.id === selectedId) ||
    null;

  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
    const matched = salesList.filter((item) => matchesSearch(item, searchField, val));
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
          ? `Ditemukan ${rows.length} Master Sales dari Supabase`
          : `Menampilkan ${rows.length} Master Sales dari Supabase`
      );
    } else if (rows) {
      setSelectedId('');
      showFeedback('Data Master Sales tidak ditemukan di Supabase');
    }
  };

  const handleResetSearch = async () => {
    setSearchTerm('');
    setSearchField('Semua');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) {
      showFeedback(`Filter direset (${rows.length} Master Sales)`);
    }
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Master_Sales',
      sheetTitle: 'LIST MASTER SALES',
      companyProfile: company,
      columns: [
        { header: 'Kode', accessor: 'kodeSales' },
        { header: 'Nama Sales', accessor: 'namaSales' },
        { header: 'Alamat', accessor: 'alamat' },
        { header: 'Kota', accessor: 'kota' },
        { header: 'Wilayah', accessor: 'wilayah' },
        { header: 'Telepon', accessor: 'telepon' },
        { header: 'Email', accessor: 'email' },
        { header: 'Limit', accessor: 'limit', align: 'right' },
        { header: 'Komisi (%)', accessor: 'komisi', align: 'right' },
        { header: 'Status', accessor: (r) => (r.isActive ? 'AKTIF' : 'NON-AKTIF') },
      ],
      rows: filteredSales,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  return (
    <div
      id="master-sales-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Master Sales"
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
            inputWidthClass="w-[170px]"
            compact
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode' },
              { value: 'Nama Sales', label: 'Nama Sales' },
              { value: 'Alamat', label: 'Alamat' },
              { value: 'Kota', label: 'Kota' },
              { value: 'Telepon', label: 'Telepon' },
              { value: 'Email', label: 'Email' },
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
                  <th className="w-[180px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Nama Sales</th>
                  <th className="w-[190px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Alamat</th>
                  <th className="w-[105px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kota</th>
                  <th className="w-[130px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Wilayah</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Telepon</th>
                  <th className="w-[165px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Email</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Limit</th>
                  <th className="w-[85px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Komisi (%)</th>
                  <th className="w-[75px] px-2 py-0.5 text-center font-bold bg-[#ECE9D8]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-6 text-gray-500 italic">
                      Tidak ada data Master Sales
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((item) => {
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
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold">{item.kodeSales}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-semibold">{item.namaSales}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.alamat}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.kota}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.wilayah || '-'}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.telepon}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.email || '-'}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-right font-mono">
                          {item.limit.toLocaleString('id-ID')}
                        </td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-right font-mono">
                          {item.komisi}%
                        </td>
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
            {selectedSales ? `Sales Terpilih: ${selectedSales.kodeSales} - ${selectedSales.namaSales}` : ''}
          </div>
          <div className="flex items-center space-x-6 text-[12px] font-bold text-black pr-16">
            <span>Record</span>
            <span className="font-mono">{filteredSales.length}</span>
          </div>
        </div>
      </div>

      {/* Add / Koreksi Modal */}
      {isAddOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-[500px] max-w-[96vw] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl p-4 flex flex-col">
            <div className="bg-[#000080] text-white px-2 py-1 font-bold text-[12px] flex justify-between items-center mb-3">
              <span>{editingId ? 'Koreksi Master Sales' : 'Tambah Master Sales Baru'}</span>
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
                    placeholder="SL01"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Nama Sales:</label>
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
                  <label className="block font-bold mb-1">Email:</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="sales@perusahaan.com"
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Wilayah Tugas:</label>
                  <select
                    value={newWilayah}
                    onChange={(e) => setNewWilayah(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Wilayah --</option>
                    {Array.from(
                      new Set([...wilayahOptions, newWilayah.trim().toUpperCase()].filter(Boolean))
                    ).map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold mb-1">Limit (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Komisi (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newKomisi}
                    onChange={(e) => setNewKomisi(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold pt-0.5">
                <input
                  type="checkbox"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="w-3.5 h-3.5 cursor-pointer"
                />
                <span>Sales Aktif</span>
              </label>

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
        tableLabel="Master Sales"
        rows={salesList}
        selectedId={selectedId}
        getRowId={(s) => s.id}
        getSearchValues={(s) => [
          s.kodeSales,
          s.namaSales,
          s.alamat,
          s.kota,
          s.telepon,
          s.email,
        ]}
        initialQuery={searchTerm}
        isBusy={isBusy}
        placeholder="Cari Kode, Nama Sales, Alamat, Kota, Telepon, Email..."
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
          showFeedback(`Sales [${s.kodeSales} - ${s.namaSales}] dipilih`);
        }}
        columns={[
          { header: 'Kode', accessor: (s) => s.kodeSales, widthClass: 'w-20', mono: true, bold: true },
          { header: 'Nama Sales', accessor: (s) => s.namaSales, bold: true },
          { header: 'Kota', accessor: (s) => s.kota || '-', widthClass: 'w-24' },
          { header: 'Telepon', accessor: (s) => s.telepon || '-', widthClass: 'w-28' },
          { header: 'Email', accessor: (s) => s.email || '-', widthClass: 'w-40' },
          { header: 'Limit', accessor: (s) => s.limit.toLocaleString('id-ID'), widthClass: 'w-28', align: 'right', mono: true },
          { header: 'Komisi', accessor: (s) => `${s.komisi}%`, widthClass: 'w-20', align: 'right', mono: true },
        ]}
      />

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Konfirmasi Hapus Master Sales"
        message={`Yakin ingin menghapus Sales [${selectedSales?.kodeSales || ''} - ${selectedSales?.namaSales || ''}]?`}
        detail="Data yang sudah dihapus tidak dapat dikembalikan."
        isBusy={isBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MASTER SALES"
        subtitle={`Total Record: ${filteredSales.length}`}
        orientation="landscape"
        columns={[
          { header: 'Kode', accessor: 'kodeSales', width: '65px' },
          { header: 'Nama Sales', accessor: 'namaSales', width: '130px' },
          { header: 'Alamat', accessor: 'alamat', width: '140px' },
          { header: 'Kota', accessor: 'kota', width: '80px' },
          { header: 'Wilayah', accessor: (r) => r.wilayah || '-', width: '105px' },
          { header: 'Telepon', accessor: 'telepon', width: '90px' },
          { header: 'Email', accessor: 'email', width: '125px' },
          { header: 'Limit', accessor: (r) => formatMoney(r.limit), align: 'right', width: '90px' },
          { header: 'Komisi (%)', accessor: (r) => `${r.komisi}%`, align: 'right', width: '65px' },
        ]}
        rows={filteredSales}
        summaryItems={[
          {
            label: 'Total Sales',
            value: `${filteredSales.length} Sales`,
          },
        ]}
        selectedRow={selectedSales}
        selectedTitle="DETAIL MASTER SALES"
        selectedSubtitle={selectedSales ? `Kode: ${selectedSales.kodeSales} - ${selectedSales.namaSales}` : undefined}
        selectedMetaLines={
          selectedSales
            ? [
                { label: 'Kode Sales', value: selectedSales.kodeSales },
                { label: 'Nama Sales', value: selectedSales.namaSales },
                { label: 'Kota / Wilayah', value: [selectedSales.kota, selectedSales.wilayah].filter(Boolean).join(' / ') || '-' },
                { label: 'Email', value: selectedSales.email || '-' },
              ]
            : undefined
        }
        selectedSummaryItems={
          selectedSales
            ? [
                { label: 'Limit Kredit', value: formatMoney(selectedSales.limit) },
                { label: 'Komisi', value: `${selectedSales.komisi}%` },
              ]
            : undefined
        }
      />
    </div>
  );
};
