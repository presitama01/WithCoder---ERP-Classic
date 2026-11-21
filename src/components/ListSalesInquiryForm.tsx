import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  erpCreate,
  erpDelete,
  erpList,
  erpUpdate,
  fetchActiveCompanyProfile,
  formatMoney,
  nextUniqueCode,
  parseNum,
  toDisplayDMyShort,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { getCurrentUser } from '../lib/authService';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface SalesInquiryItem {
  id: string;
  noBukti: string;
  tanggalSi: string;
  tanggalSiIso: string;
  namaCustomer: string;
  namaSales: string;
  qty: number;
  keterangan: string;
  follow: string;
  tglFollow: string;
  noSq: string;
  tglSq: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListSalesInquiryFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToInquiry(r: any): SalesInquiryItem {
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggalSi: toDisplayDMyShort(r.tanggal_si || r.tanggal_do),
    tanggalSiIso: toIsoDate(r.tanggal_si || r.tanggal_do) || '',
    namaCustomer: r.nama_customer || '',
    namaSales: r.nama_sales || '',
    qty: Number(r.qty ?? 0),
    keterangan: r.keterangan || '',
    follow: r.follow || 'Follow',
    tglFollow: toDisplayDMyShort(r.tgl_follow) || '-',
    noSq: r.no_sq || '-',
    tglSq: toDisplayDMyShort(r.tgl_sq) || '-',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

export const ListSalesInquiryForm: React.FC<ListSalesInquiryFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [inquiryList, setInquiryList] = useState<SalesInquiryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [salesOptions, setSalesOptions] = useState<string[]>([]);

  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggalSi, setNewTanggalSi] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('');
  const [newQty, setNewQty] = useState<string>('0');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newFollow, setNewFollow] = useState<string>('Follow');
  const [newTglFollow, setNewTglFollow] = useState<string>('');
  const [newNoSq, setNewNoSq] = useState<string>('');
  const [newTglSq, setNewTglSq] = useState<string>('');
  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadMasterReferences = async () => {
    const [custRes, salesRes] = await Promise.allSettled([
      erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true, limit: 1000 }),
      erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true, limit: 1000 }),
    ]);

    if (custRes.status === 'fulfilled') {
      const loadedCusts = Array.from(
        new Set(
          custRes.value
            .map((c: any) => String(c.nama_customer || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setCustomerOptions(loadedCusts);
    }

    if (salesRes.status === 'fulfilled') {
      const loadedSales = Array.from(
        new Set(
          salesRes.value
            .map((s: any) => String(s.nama_sales || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setSalesOptions(loadedSales);
    }
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'no_bukti',
    NoBukti: 'no_bukti',
    'Nama Pelanggan': 'nama_customer',
    'Nama Sales': 'nama_sales',
    'No.SQ': 'no_sq',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
  }): Promise<SalesInquiryItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = {
        orderBy: 'tanggal_si',
        asc: false,
        limit: 1000,
      };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'no_bukti,nama_customer,nama_sales,no_sq,keterangan,follow';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows] = await Promise.all([
        erpList<any>('sales_inquiries', queryOpts),
        loadMasterReferences(),
      ]);
      const mapped = rows.map(mapDbToInquiry);
      setInquiryList(mapped);
      if (mapped.length > 0 && !mapped.some((r) => r.id === selectedId)) {
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
    const selected = inquiryList.find((i) => i.id === selectedId);
    if (!selected) {
      showFeedback('Pilih baris Sales Inquiry yang akan disimpan');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglSiIso = selected.tanggalSiIso || toIsoDate(selected.tanggalSi) || todayIso();
      const saved = await erpUpdate<any>('sales_inquiries', selected.id, {
        no_bukti: selected.noBukti.trim().toUpperCase(),
        tanggal_si: tglSiIso,
        tanggal_do: tglSiIso,
        nama_customer: selected.namaCustomer.trim().toUpperCase(),
        nama_sales: selected.namaSales.trim().toUpperCase(),
        qty: Number(selected.qty || 0),
        keterangan: selected.keterangan.trim(),
        follow: selected.follow.trim(),
        tgl_follow: selected.tglFollow && selected.tglFollow !== '-' ? toIsoDate(selected.tglFollow) : null,
        no_sq: selected.noSq && selected.noSq !== '-' ? selected.noSq.trim().toUpperCase() : '',
        tgl_sq: selected.tglSq && selected.tglSq !== '-' ? toIsoDate(selected.tglSq) : null,
        dibuat_oleh: selected.dibuatOleh.trim().toUpperCase() || currentUser,
        tgl_created: toIsoDate(selected.tglCreated) || todayIso(),
        diupdate_oleh: currentUser,
        tgl_update: todayIso(),
      });
      const mapped = mapDbToInquiry(saved);
      setInquiryList((prev) => prev.map((item) => (item.id === selected.id ? mapped : item)));
      showFeedback(`Sales Inquiry [${mapped.noBukti}] berhasil disimpan`);
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

  const handleAddNew = async () => {
    setEditingId(null);
    setModalError(null);
    const todayDisp = toDisplayDMyShort(todayIso());
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    setNewNoBukti(nextUniqueCode(inquiryList.map((i) => i.noBukti), '2608-SI-', 3));
    setNewTanggalSi(todayDisp);
    setNewCustomer('');
    setNewSales('');
    setNewQty('0');
    setNewKeterangan('');
    setNewFollow('Follow');
    setNewTglFollow(todayDisp);
    setNewNoSq('');
    setNewTglSq(todayDisp);
    setNewDibuatOleh(currentUser);
    setNewTglCreated(todayDisp);
    setNewDiupdateOleh('-');
    setNewTglUpdate('');
    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleEdit = async () => {
    const item = inquiryList.find((i) => i.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    const todayDisp = toDisplayDMyShort(todayIso());
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    setEditingId(item.id);
    setModalError(null);
    setNewNoBukti(item.noBukti);
    setNewTanggalSi(item.tanggalSi);
    setNewCustomer(item.namaCustomer);
    setNewSales(item.namaSales);
    setNewQty(String(item.qty ?? 0));
    setNewKeterangan(item.keterangan);
    setNewFollow(item.follow);
    setNewTglFollow(item.tglFollow === '-' ? '' : item.tglFollow);
    setNewNoSq(item.noSq === '-' ? '' : item.noSq);
    setNewTglSq(item.tglSq === '-' ? '' : item.tglSq);
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(
      item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser
    );
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);
    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoBukti.trim() || !newCustomer.trim()) {
      setModalError('No Bukti dan Nama Customer wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const payload = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal_si: toIsoDate(newTanggalSi) || todayIso(),
        tanggal_do: toIsoDate(newTanggalSi) || todayIso(), // fallback
        nama_customer: newCustomer.trim().toUpperCase(),
        nama_sales: newSales.trim().toUpperCase(),
        qty: parseNum(newQty),
        keterangan: newKeterangan.trim(),
        follow: newFollow.trim(),
        tgl_follow: toIsoDate(newTglFollow),
        no_sq: newNoSq.trim().toUpperCase(),
        tgl_sq: toIsoDate(newTglSq),
        dibuat_oleh: newDibuatOleh.trim().toUpperCase() || currentUser,
        tgl_created: toIsoDate(newTglCreated) || todayIso(),
      };

      if (editingId) {
        const saved = await erpUpdate<any>('sales_inquiries', editingId, {
          ...payload,
          diupdate_oleh: newDiupdateOleh.trim().toUpperCase() || currentUser,
          tgl_update: toIsoDate(newTglUpdate) || todayIso(),
        });
        const mapped = mapDbToInquiry(saved);
        setInquiryList(inquiryList.map((item) => (item.id === editingId ? mapped : item)));
        showFeedback('Sales Inquiry diperbarui');
      } else {
        const saved = await erpCreate<any>('sales_inquiries', {
          ...payload,
          diupdate_oleh: newDiupdateOleh.trim() ? newDiupdateOleh.trim().toUpperCase() : '-',
          tgl_update: toIsoDate(newTglUpdate),
        });
        const mapped = mapDbToInquiry(saved);
        setInquiryList([mapped, ...inquiryList]);
        setSelectedId(mapped.id);
        showFeedback('Sales Inquiry tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Sales Inquiry';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('sales_inquiries', id);
      const updated = inquiryList.filter((item) => item.id !== id);
      setInquiryList(updated);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Sales Inquiry dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = inquiryList.filter((item) => {
    if (filterIso && item.tanggalSiIso !== filterIso) return false;
    if (searchField === 'Kode' || searchField === 'NoBukti') {
      return matchesMultiKeyword([item.noBukti], searchTerm);
    }
    if (searchField === 'Nama Pelanggan') {
      return matchesMultiKeyword([item.namaCustomer], searchTerm);
    }
    if (searchField === 'Nama Sales') {
      return matchesMultiKeyword([item.namaSales], searchTerm);
    }
    if (searchField === 'No.SQ') {
      return matchesMultiKeyword([item.noSq], searchTerm);
    }
    return matchesMultiKeyword(
      [item.noBukti, item.tanggalSi, item.namaCustomer, item.namaSales, item.noSq, item.keterangan, item.follow],
      searchTerm
    );
  });

  const selectedInquiry =
    filteredList.find((r) => r.id === selectedId) ||
    inquiryList.find((r) => r.id === selectedId) ||
    null;

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Sales Inquiry dari Supabase`
          : 'Data Sales Inquiry tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setTanggalFilter('Semua');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Sales Inquiry)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  const modalCustomerChoices = Array.from(
    new Set(
      [...customerOptions, newCustomer.trim().toUpperCase()].filter(Boolean)
    )
  );

  const modalSalesChoices = Array.from(
    new Set(
      [...salesOptions, newSales.trim().toUpperCase()].filter(Boolean)
    )
  );

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Sales_Inquiry',
      sheetTitle: 'LIST INQUIRY PENJUALAN',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'NoBukti', accessor: 'noBukti' },
        { header: 'Tanggal SI', accessor: 'tanggalSi', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'Nama Sales', accessor: 'namaSales' },
        { header: 'Qty', accessor: 'qty', align: 'right' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Follow', accessor: 'follow' },
        { header: 'No. SQ', accessor: 'noSq' },
        { header: 'Tgl. SQ', accessor: 'tglSq', align: 'center' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
        { header: 'Tgl.Created', accessor: 'tglCreated', align: 'center' },
        { header: 'Diupdate Oleh', accessor: 'diupdateOleh' },
        { header: 'Tgl.Update', accessor: 'tglUpdate', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  return (
    <div
      id="list-sales-inquiry-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="List Inquiry Penjualan"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => setIsPrintOpen(true)}
        onTableView={() => loadData({ field: searchField, term: searchTerm })}
        onExportExcel={handleExportExcel}
      />

      <div className="bg-[#ECE9D8] border-b border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs shadow-sm overflow-x-auto">
        <div className="flex items-center space-x-2">
          <FormActionButtons
            onSimpan={handleToolbarSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={() => (selectedId ? handleDelete(selectedId) : showFeedback('Pilih data yang akan dihapus'))}
            onPrint={() => setIsPrintOpen(true)}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className="font-semibold">Tanggal :</span>
            <DatePickerInput
              value={tanggalFilter === 'Semua' ? '' : tanggalFilter}
              onChange={(formatted) => setTanggalFilter(formatted || 'Semua')}
              format="dMyShort"
              placeholder="Semua"
            />
            <button
              type="button"
              onClick={() => setTanggalFilter('Semua')}
              className="px-2 py-0.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded text-xs hover:bg-[#D4D0C8] cursor-pointer"
            >
              Semua
            </button>
          </div>
          <div className="font-bold text-sm text-right px-3 py-0.5 bg-white border border-[#919191] min-w-[90px] shadow-inner">
            {filteredList.length} Inquiry
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-[#7A7A7A] m-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1380px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">NoBukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal SI</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Qty</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Follow</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl. Follow</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No. SQ</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Dibuat Oleh</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Created</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Diupdate Oleh</th>
              <th className="px-3 py-1.5">Tgl.Update</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item, index) => {
              const isSelected = selectedId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  onDoubleClick={handleEdit}
                  className={`border-b border-[#E0E0E0] cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-[#000084] text-white'
                      : index % 2 === 0
                      ? 'bg-white hover:bg-[#F2F0EB]'
                      : 'bg-[#F9F8F5] hover:bg-[#F2F0EB]'
                  }`}
                >
                  <td className="border-r border-[#E0E0E0] px-2 py-1 text-center font-bold">
                    {isSelected ? '▶' : ''}
                  </td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noBukti}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tanggalSi}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-medium">{item.namaCustomer}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.namaSales}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono text-right">{formatMoney(item.qty)}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.follow}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglFollow}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noSq}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglSq}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.dibuatOleh}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.diupdateOleh}</td>
                  <td className="px-3 py-1">{item.tglUpdate}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={15} className="text-center py-6 text-gray-500">
                  Tidak ada data inquiry penjualan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-[#ECE9D8] border-t border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs gap-2 overflow-x-auto">
        <ToolbarSearchControl
          compact
          searchField={searchField}
          onSearchFieldChange={setSearchField}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onCari={handleExecuteCari}
          onReset={handleResetCari}
          inputRef={searchInputRef}
          isBusy={isBusy}
          inputWidthClass="w-56"
          options={[
            { value: 'Semua', label: 'Semua' },
            { value: 'Kode', label: 'Kode (NoBukti)' },
            { value: 'NoBukti', label: 'NoBukti' },
            { value: 'Nama Pelanggan', label: 'Nama Pelanggan' },
            { value: 'Nama Sales', label: 'Nama Sales' },
            { value: 'No.SQ', label: 'No.SQ' },
          ]}
        />
        <div className="flex items-center space-x-4 shrink-0">
          <div className="w-64 h-5 bg-[#FFFF00] border border-[#919191] shadow-inner px-2 text-[10px] flex items-center text-black truncate">
            {inquiryList.find((r) => r.id === selectedId)?.keterangan || ''}
          </div>
          <div className="font-semibold px-2 py-0.5 bg-[#ECE9D8] border border-[#919191]">
            Record {filteredList.length}
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[540px] max-w-[95vw] max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs shrink-0">
              <span>{editingId ? 'Koreksi Sales Inquiry' : 'Tambah Sales Inquiry Baru'}</span>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsAddOpen(false);
                }}
                className="text-white hover:text-red-300 font-bold px-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-2.5 text-xs overflow-y-auto">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No Bukti:</label>
                <input
                  type="text"
                  value={newNoBukti}
                  onChange={(e) => setNewNoBukti(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Tanggal SI:</label>
                <div className="col-span-2">
                  <DatePickerInput
                    value={newTanggalSi}
                    onChange={(formatted) => setNewTanggalSi(formatted)}
                    format="dMyShort"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Nama Customer:</label>
                <select
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                  required
                >
                  <option value="">-- Pilih Customer --</option>
                  {modalCustomerChoices.map((cust) => (
                    <option key={cust} value={cust}>
                      {cust}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Nama Sales:</label>
                <select
                  value={newSales}
                  onChange={(e) => setNewSales(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                >
                  <option value="">-- Pilih Sales --</option>
                  {modalSalesChoices.map((sales) => (
                    <option key={sales} value={sales}>
                      {sales}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Qty:</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] font-mono text-right"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Keterangan:</label>
                <input
                  type="text"
                  value={newKeterangan}
                  onChange={(e) => setNewKeterangan(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Follow Status:</label>
                <input
                  type="text"
                  value={newFollow}
                  onChange={(e) => setNewFollow(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Tgl. Follow:</label>
                <div className="col-span-2">
                  <DatePickerInput
                    value={newTglFollow}
                    onChange={(formatted) => setNewTglFollow(formatted)}
                    format="dMyShort"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. SQ:</label>
                <input
                  type="text"
                  value={newNoSq}
                  onChange={(e) => setNewNoSq(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Tgl. SQ:</label>
                <div className="col-span-2">
                  <DatePickerInput
                    value={newTglSq}
                    onChange={(formatted) => setNewTglSq(formatted)}
                    format="dMyShort"
                  />
                </div>
              </div>
              <div className="border-t border-[#D4D0C8] pt-2.5 grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold mb-1">Dibuat Oleh:</label>
                  <input
                    type="text"
                    value={newDibuatOleh}
                    onChange={(e) => setNewDibuatOleh(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tgl Created:</label>
                  <DatePickerInput
                    value={newTglCreated}
                    onChange={(formatted) => setNewTglCreated(formatted)}
                    format="dMyShort"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Diupdate Oleh:</label>
                  <input
                    type="text"
                    value={newDiupdateOleh}
                    onChange={(e) => setNewDiupdateOleh(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tgl Update:</label>
                  <DatePickerInput
                    value={newTglUpdate}
                    onChange={(formatted) => setNewTglUpdate(formatted)}
                    format="dMyShort"
                  />
                </div>
              </div>
              {modalError && (
                <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                  ⚠ {modalError}
                </div>
              )}
              <div className="flex justify-end space-x-2 pt-3 border-t border-[#D4D0C8]">
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="px-4 py-1.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded hover:bg-[#D4D0C8] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1.5 bg-[#000084] text-white border border-[#000066] rounded hover:bg-[#0000A0] cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN INQUIRY PENJUALAN"
        subtitle={`Filter Tanggal: ${tanggalFilter}`}
        orientation="landscape"
        columns={[
          { header: 'NoBukti', accessor: 'noBukti', width: '105px' },
          { header: 'Tanggal SI', accessor: 'tanggalSi', align: 'center', width: '80px' },
          { header: 'Nama Customer', accessor: 'namaCustomer' },
          { header: 'Sales', accessor: 'namaSales', width: '85px' },
          { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', width: '60px' },
          { header: 'Follow', accessor: 'follow', width: '65px' },
          { header: 'No. SQ', accessor: 'noSq', width: '90px' },
          { header: 'Keterangan', accessor: 'keterangan' },
        ]}
        rows={filteredList}
        summaryItems={[{ label: 'Total Inquiry', value: `${filteredList.length} Dokumen` }]}
        selectedRow={selectedInquiry}
        selectedTitle="DETAIL INQUIRY PENJUALAN"
        selectedSubtitle={
          selectedInquiry
            ? `No. Bukti: ${selectedInquiry.noBukti} | Customer: ${selectedInquiry.namaCustomer}`
            : ''
        }
        selectedMetaLines={
          selectedInquiry
            ? [
                { label: 'No. Bukti', value: selectedInquiry.noBukti },
                { label: 'Tanggal SI', value: selectedInquiry.tanggalSi },
                { label: 'Customer', value: selectedInquiry.namaCustomer },
                { label: 'Sales', value: selectedInquiry.namaSales || '-' },
                { label: 'Qty', value: formatMoney(selectedInquiry.qty) },
                { label: 'Follow', value: selectedInquiry.follow },
                { label: 'No. SQ', value: selectedInquiry.noSq || '-' },
                { label: 'Keterangan', value: selectedInquiry.keterangan || '-' },
              ]
            : undefined
        }
        selectedSummaryItems={
          selectedInquiry
            ? [
                { label: 'No. Bukti Terpilih', value: selectedInquiry.noBukti },
                { label: 'Qty Inquiry', value: formatMoney(selectedInquiry.qty) },
              ]
            : undefined
        }
      />

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Sales Inquiry"
        rows={inquiryList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.noBukti,
          r.tanggalSi,
          r.namaCustomer,
          r.namaSales,
          r.noSq,
          r.keterangan,
          r.follow,
        ]}
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
          setTanggalFilter('Semua');
          return loadData({ field: 'Semua', term: '' });
        }}
        onSelectRow={(row, q) => {
          setSelectedId(row.id);
          setSearchTerm(q);
          showFeedback(`Sales Inquiry [${row.noBukti}] dipilih`);
        }}
        columns={[
          { header: 'Kode / NoBukti', accessor: (r) => r.noBukti, widthClass: 'w-32', mono: true, bold: true },
          { header: 'Tanggal SI', accessor: (r) => r.tanggalSi, widthClass: 'w-24', align: 'center' },
          { header: 'Nama Customer', accessor: (r) => r.namaCustomer, bold: true },
          { header: 'Nama Sales', accessor: (r) => r.namaSales || '-', widthClass: 'w-28' },
          { header: 'No. SQ', accessor: (r) => r.noSq || '-', widthClass: 'w-28', mono: true },
          { header: 'Qty', accessor: (r) => formatMoney(r.qty), widthClass: 'w-16', align: 'right', mono: true },
          { header: 'Follow', accessor: (r) => r.follow, widthClass: 'w-20' },
        ]}
      />
    </div>
  );
};
