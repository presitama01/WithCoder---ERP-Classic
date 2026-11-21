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
  nextUniqueCode,
  toDisplayDmy,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { getCurrentUser } from '../lib/authService';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface PurchaseRequestItem {
  id: string;
  noPr: string;
  tanggal: string;
  tanggalIso: string;
  deliveryTo: string;
  delivery: string;
  noPo: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListPurchaseRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToPr(r: any): PurchaseRequestItem {
  return {
    id: r.id,
    noPr: r.no_pr || '',
    tanggal: toDisplayDmy(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    deliveryTo: r.delivery_to || '',
    delivery: r.delivery || '',
    noPo: r.no_po || '-',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDmy(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDmy(r.tgl_update) || '-',
  };
}

export const ListPurchaseRequestForm: React.FC<ListPurchaseRequestFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [prList, setPrList] = useState<PurchaseRequestItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [newNoPr, setNewNoPr] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newDeliveryTo, setNewDeliveryTo] = useState<string>('');
  const [newDelivery, setNewDelivery] = useState<string>('Darat');
  const [newNoPo, setNewNoPo] = useState<string>('-');
  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadMasterLokasi = async () => {
    try {
      const lokasis = await erpList<any>('master_lokasi_gudangs', {
        orderBy: 'nama_lokasi',
        asc: true,
        limit: 1000,
      });
      const uniqueNames = Array.from(
        new Set(
          lokasis
            .map((l: any) => String(l.nama_lokasi || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setLokasiOptions(uniqueNames);
      return uniqueNames;
    } catch {
      return [];
    }
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'no_pr',
    'No.PR': 'no_pr',
    'Delivery To': 'delivery_to',
    Delivery: 'delivery',
    'No. PO': 'no_po',
    'Dibuat Oleh': 'dibuat_oleh',
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
    tglFilter?: string;
  }): Promise<PurchaseRequestItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const activeTgl = opts?.tglFilter ?? tanggalFilter;
      const isoFilter = activeTgl && activeTgl !== 'Semua' ? toIsoDate(activeTgl) : null;

      const queryOpts: Record<string, any> = { orderBy: 'tanggal', asc: false, limit: 1000 };
      if (isoFilter) queryOpts.eq = { tanggal: isoFilter };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'no_pr,delivery_to,delivery,no_po,dibuat_oleh';
          queryOpts.searchVal = activeTerm;
        }
      }

      const [rows] = await Promise.all([
        erpList<any>('purchase_requests', queryOpts),
        loadMasterLokasi(),
      ]);
      const mapped = rows.map(mapDbToPr);
      setPrList(mapped);
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
    const selected = prList.find((p) => p.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record Purchase Request terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const saved = await erpUpdate<any>('purchase_requests', selected.id, {
        no_pr: selected.noPr.trim().toUpperCase(),
        tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
        delivery_to: selected.deliveryTo.trim().toUpperCase(),
        delivery: selected.delivery.trim(),
        no_po: selected.noPo.trim().toUpperCase(),
        dibuat_oleh: selected.dibuatOleh.trim().toUpperCase() || currentUser,
        diupdate_oleh: currentUser,
        tgl_update: todayIso(),
      });
      const mapped = mapDbToPr(saved);
      setPrList((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
      setSelectedId(mapped.id);
      showFeedback(`Purchase Request [${mapped.noPr}] tersimpan ke Supabase`);
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
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDmy(todayIso());
    setEditingId(null);
    setModalError(null);
    setNewNoPr(nextUniqueCode(prList.map((p) => p.noPr), 'PR/2026/08/', 3));
    setNewTanggal(todayDisp);
    setNewDeliveryTo('');
    setNewDelivery('Darat');
    setNewNoPo('-');
    setNewDibuatOleh(currentUser);
    setNewTglCreated(todayDisp);
    setNewDiupdateOleh('-');
    setNewTglUpdate('');
    setIsAddOpen(true);
    await loadMasterLokasi();
  };

  const handleEdit = async () => {
    const item = prList.find((p) => p.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDmy(todayIso());
    setEditingId(item.id);
    setModalError(null);
    setNewNoPr(item.noPr);
    setNewTanggal(item.tanggal || todayDisp);
    setNewDeliveryTo(item.deliveryTo);
    setNewDelivery(item.delivery);
    setNewNoPo(item.noPo);
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(
      item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser
    );
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);
    setIsAddOpen(true);
    await loadMasterLokasi();
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoPr.trim()) {
      setModalError('No.PR wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const basePayload = {
        no_pr: newNoPr.trim().toUpperCase(),
        tanggal: toIsoDate(newTanggal) || todayIso(),
        delivery_to: newDeliveryTo.trim().toUpperCase(),
        delivery: newDelivery.trim(),
        no_po: newNoPo.trim().toUpperCase(),
        dibuat_oleh: newDibuatOleh.trim().toUpperCase() || currentUser,
        tgl_created: toIsoDate(newTglCreated) || todayIso(),
      };
      if (editingId) {
        const saved = await erpUpdate<any>('purchase_requests', editingId, {
          ...basePayload,
          diupdate_oleh: newDiupdateOleh.trim().toUpperCase() || currentUser,
          tgl_update: toIsoDate(newTglUpdate) || todayIso(),
        });
        const mapped = mapDbToPr(saved);
        setPrList(prList.map((p) => (p.id === editingId ? mapped : p)));
        showFeedback('Purchase Request diperbarui');
      } else {
        const saved = await erpCreate<any>('purchase_requests', {
          ...basePayload,
          diupdate_oleh: newDiupdateOleh.trim() ? newDiupdateOleh.trim().toUpperCase() : '-',
          tgl_update: toIsoDate(newTglUpdate),
        });
        const mapped = mapDbToPr(saved);
        setPrList([mapped, ...prList]);
        setSelectedId(mapped.id);
        showFeedback('Purchase Request tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Purchase Request';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('purchase_requests', id);
      const updated = prList.filter((item) => item.id !== id);
      setPrList(updated);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Purchase Request dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredPrList = prList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (searchField === 'Kode' || searchField === 'No.PR') return matchesMultiKeyword([item.noPr], searchTerm);
    if (searchField === 'Delivery To') return matchesMultiKeyword([item.deliveryTo], searchTerm);
    if (searchField === 'Delivery') return matchesMultiKeyword([item.delivery], searchTerm);
    if (searchField === 'No. PO') return matchesMultiKeyword([item.noPo], searchTerm);
    if (searchField === 'Dibuat Oleh') return matchesMultiKeyword([item.dibuatOleh], searchTerm);
    return matchesMultiKeyword(
      [item.noPr, item.tanggal, item.deliveryTo, item.delivery, item.noPo, item.dibuatOleh],
      searchTerm
    );
  });

  const selectedPr =
    filteredPrList.find((p) => p.id === selectedId) ||
    prList.find((p) => p.id === selectedId) ||
    null;

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm, tglFilter: tanggalFilter });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Purchase Request dari Supabase`
          : 'Data Purchase Request tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setTanggalFilter('Semua');
    const rows = await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
    if (rows) showFeedback(`Filter direset (${rows.length} Purchase Request)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Purchase_Request',
      sheetTitle: 'LIST PURCHASE REQUEST',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.PR', accessor: 'noPr' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Delivery To', accessor: 'deliveryTo' },
        { header: 'Delivery', accessor: 'delivery' },
        { header: 'No. PO', accessor: 'noPo' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
        { header: 'Tgl Created', accessor: 'tglCreated', align: 'center' },
        { header: 'DiUpdate Oleh', accessor: 'diupdateOleh' },
        { header: 'Tgl.Updated', accessor: 'tglUpdate', align: 'center' },
      ],
      rows: filteredPrList,
    });
    showFeedback('Export Excel selesai');
  };

  return (
    <div
      id="list-purchase-request-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Purchase Request"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={() => loadData({ field: searchField, term: searchTerm, tglFilter: tanggalFilter })}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto">
          <div className="flex items-center space-x-3">
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
            <div className="flex items-center space-x-1">
              <span className="text-gray-800 font-medium">Tanggal :</span>
              <DatePickerInput
                value={tanggalFilter === 'Semua' ? '' : tanggalFilter}
                onChange={(formatted) => setTanggalFilter(formatted || 'Semua')}
                format="dmy"
                placeholder="Semua"
              />
              <button
                type="button"
                onClick={() => setTanggalFilter('Semua')}
                className="px-2 py-0.5 bg-[#E1DFDD] hover:bg-[#F3F2F1] border border-[#ADABA1] text-xs rounded-xs cursor-pointer"
              >
                Semua
              </button>
            </div>
          </div>

          <div className="font-bold text-sm text-gray-900 pr-2">
            Total PR : {filteredPrList.length}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white border border-[#999999] m-1.5 relative shadow-inner">
          <table className="w-full border-collapse text-left min-w-[1000px]">
            <thead className="sticky top-0 bg-[#F0F0F0] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10">
              <tr>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center w-12">No</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.PR</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tanggal</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Delivery To</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Delivery</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No. PO</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Dibuat Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl Created</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">DiUpdate Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Updated</th>
                <th className="px-2 py-1.5 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500 italic">
                    Tidak ada data Purchase Request
                  </td>
                </tr>
              ) : (
                filteredPrList.map((item, idx) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handleEdit}
                      className={`cursor-pointer border-b border-[#E0E0E0] ${
                        isSelected
                          ? 'bg-[#316AC5] text-white'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-[#F5F5F5]'
                          : 'bg-[#FAFAFA] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{idx + 1}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono font-medium">{item.noPr}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.tanggal}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.deliveryTo}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.delivery}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.noPo}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.dibuatOleh}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-[11px]">{item.tglCreated}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.diupdateOleh}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-[11px]">{item.tglUpdate}</td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                            isSelected ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-t border-[#C0C0C0] gap-2 overflow-x-auto">
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
              { value: 'Kode', label: 'Kode (No.PR)' },
              { value: 'No.PR', label: 'No.PR' },
              { value: 'Delivery To', label: 'Delivery To' },
              { value: 'Delivery', label: 'Delivery' },
              { value: 'No. PO', label: 'No. PO' },
              { value: 'Dibuat Oleh', label: 'Dibuat Oleh' },
            ]}
          />

          <div className="flex items-center space-x-4 shrink-0">
            <div className="w-64 h-5 bg-[#FFFF99] border border-[#C0C0C0] rounded-xs px-2 text-[10px] flex items-center text-gray-700 truncate">
              {prList.find((r) => r.id === selectedId)?.deliveryTo || ''}
            </div>
            <div className="text-gray-800 font-medium">Record : {filteredPrList.length}</div>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] rounded shadow-2xl w-[480px] max-w-[95vw] max-h-[92vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-[#0055EA] to-[#2B579A] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs shrink-0">
                <span>{editingId ? 'Koreksi Purchase Request' : 'Tambah Purchase Request Baru'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="text-white hover:bg-red-600 px-1.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-2.5 overflow-y-auto">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-gray-700 shrink-0">No.PR:</label>
                  <input
                    type="text"
                    value={newNoPr}
                    onChange={(e) => setNewNoPr(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-gray-700 shrink-0">Tanggal:</label>
                  <div className="w-72">
                    <DatePickerInput
                      value={newTanggal}
                      onChange={(formatted) => setNewTanggal(formatted)}
                      format="dmy"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-gray-700 shrink-0">Delivery To:</label>
                  <select
                    value={newDeliveryTo}
                    onChange={(e) => setNewDeliveryTo(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase cursor-pointer"
                  >
                    <option value="">-- Pilih Lokasi Gudang --</option>
                    {Array.from(
                      new Set(
                        [...lokasiOptions, newDeliveryTo.trim().toUpperCase()].filter(Boolean)
                      )
                    ).map((namaLokasi) => (
                      <option key={namaLokasi} value={namaLokasi}>
                        {namaLokasi}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-gray-700 shrink-0">Delivery:</label>
                  <input
                    type="text"
                    value={newDelivery}
                    onChange={(e) => setNewDelivery(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-gray-700 shrink-0">No. PO:</label>
                  <input
                    type="text"
                    value={newNoPo}
                    onChange={(e) => setNewNoPo(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                  />
                </div>

                <div className="border-t border-[#D0D0D0] pt-2.5 grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Dibuat Oleh:</label>
                    <input
                      type="text"
                      value={newDibuatOleh}
                      onChange={(e) => setNewDibuatOleh(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tgl Created:</label>
                    <DatePickerInput
                      value={newTglCreated}
                      onChange={(formatted) => setNewTglCreated(formatted)}
                      format="dmy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">DiUpdate Oleh:</label>
                    <input
                      type="text"
                      value={newDiupdateOleh}
                      onChange={(e) => setNewDiupdateOleh(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tgl.Updated:</label>
                    <DatePickerInput
                      value={newTglUpdate}
                      onChange={(formatted) => setNewTglUpdate(formatted)}
                      format="dmy"
                    />
                  </div>
                </div>

                {modalError && (
                  <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                    ⚠ {modalError}
                  </div>
                )}
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#D0D0D0]">
                  <button
                    type="button"
                    onClick={() => {
                      setModalError(null);
                      setIsAddOpen(false);
                    }}
                    className="px-3 py-1 bg-[#E1DFDD] border border-[#ADABA1] rounded text-xs hover:bg-[#F3F2F1] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="px-3 py-1 bg-[#0055EA] text-white border border-blue-800 rounded text-xs hover:bg-blue-700 cursor-pointer"
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
          title="LAPORAN PURCHASE REQUEST"
          subtitle={`Filter Tanggal: ${tanggalFilter}`}
          orientation="landscape"
          columns={[
            { header: 'No.PR', accessor: 'noPr', width: '110px' },
            { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '78px' },
            { header: 'Delivery To', accessor: 'deliveryTo', width: '170px' },
            { header: 'Delivery', accessor: 'delivery', width: '75px' },
            { header: 'No. PO', accessor: 'noPo', width: '100px' },
            { header: 'Dibuat Oleh', accessor: 'dibuatOleh', width: '85px' },
            { header: 'Tgl Created', accessor: 'tglCreated', align: 'center', width: '82px' },
            { header: 'DiUpdate Oleh', accessor: 'diupdateOleh', width: '85px' },
            { header: 'Tgl.Updated', accessor: 'tglUpdate', align: 'center', width: '82px' },
          ]}
          rows={filteredPrList}
          summaryItems={[{ label: 'Total Record', value: `${filteredPrList.length} Dokumen` }]}
          selectedRow={selectedPr}
          selectedTitle="PURCHASE REQUEST (RECORD TERPILIH)"
          selectedSubtitle={selectedPr ? `No. PR: ${selectedPr.noPr} | Tanggal: ${selectedPr.tanggal}` : undefined}
          selectedMetaLines={
            selectedPr
              ? [
                  { label: 'No. PR', value: selectedPr.noPr },
                  { label: 'Tanggal', value: selectedPr.tanggal },
                  { label: 'Delivery To', value: selectedPr.deliveryTo || '-' },
                  { label: 'Delivery', value: selectedPr.delivery || '-' },
                  { label: 'No. PO', value: selectedPr.noPo || '-' },
                  { label: 'Dibuat Oleh', value: selectedPr.dibuatOleh },
                ]
              : undefined
          }
          selectedSummaryItems={
            selectedPr
              ? [
                  { label: 'No. PR Terpilih', value: selectedPr.noPr },
                  { label: 'Delivery To', value: selectedPr.deliveryTo || '-' },
                ]
              : undefined
          }
        />

        <SupabaseFindModal
          isOpen={isFindOpen}
          onClose={() => setIsFindOpen(false)}
          tableLabel="Purchase Request"
          rows={prList}
          selectedId={selectedId}
          getRowId={(r) => r.id}
          getSearchValues={(r) => [r.noPr, r.tanggal, r.deliveryTo, r.delivery, r.noPo, r.dibuatOleh]}
          initialQuery={searchTerm}
          isBusy={isBusy}
          onSearchSupabase={(q) => {
            setSearchField('Semua');
            setSearchTerm(q);
            return loadData({ field: 'Semua', term: q, tglFilter: 'Semua' });
          }}
          onRefreshSupabase={() => {
            setSearchField('Semua');
            setSearchTerm('');
            setTanggalFilter('Semua');
            return loadData({ field: 'Semua', term: '', tglFilter: 'Semua' });
          }}
          onSelectRow={(row, q) => {
            setSelectedId(row.id);
            setSearchTerm(q);
            showFeedback(`Purchase Request [${row.noPr}] dipilih`);
          }}
          columns={[
            { header: 'Kode / No.PR', accessor: (r) => r.noPr, widthClass: 'w-32', mono: true, bold: true },
            { header: 'Tanggal', accessor: (r) => r.tanggal, widthClass: 'w-24', align: 'center' },
            { header: 'Delivery To', accessor: (r) => r.deliveryTo, bold: true },
            { header: 'Delivery', accessor: (r) => r.delivery, widthClass: 'w-24' },
            { header: 'No. PO', accessor: (r) => r.noPo, widthClass: 'w-32', mono: true },
            { header: 'Dibuat Oleh', accessor: (r) => r.dibuatOleh, widthClass: 'w-28' },
          ]}
        />
      </div>
    </div>
  );
};
