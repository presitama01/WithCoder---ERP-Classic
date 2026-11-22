import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import {
  erpCompositeSave,
  erpDelete,
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  nextUniqueCode,
  parseNum,
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
  keterangan: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

export interface PurchaseRequestDetailItem {
  id: string;
  prId?: string;
  noUrut: number;
  kode: string;
  namaBarang: string;
  unit: string;
  qty: number;
  keterangan: string;
}

interface MasterBarangOption {
  kode: string;
  namaBarang: string;
  unit: string;
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
    keterangan: r.keterangan || '',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDmy(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDmy(r.tgl_update) || '-',
  };
}

function mapDbToPrDetail(d: any, idx = 0): PurchaseRequestDetailItem {
  return {
    id: d.id || `pr-det-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    prId: d.pr_id,
    noUrut: Number(d.no_urut ?? idx + 1),
    kode: String(d.kode || '').trim().toUpperCase(),
    namaBarang: String(d.nama_barang || '').trim(),
    unit: String(d.unit || 'PCS').trim().toUpperCase(),
    qty: Number(d.qty || 1),
    keterangan: String(d.keterangan || '').trim(),
  };
}

function createBlankDetailRow(noUrut: number): PurchaseRequestDetailItem {
  return {
    id: `new-pr-${Date.now()}-${noUrut}-${Math.random().toString(36).slice(2, 6)}`,
    noUrut,
    kode: '',
    namaBarang: '',
    unit: 'PCS',
    qty: 1,
    keterangan: '',
  };
}

export const ListPurchaseRequestForm: React.FC<ListPurchaseRequestFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [prList, setPrList] = useState<PurchaseRequestItem[]>([]);
  const [prDetailsMap, setPrDetailsMap] = useState<Record<string, PurchaseRequestDetailItem[]>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);
  const [newNoPr, setNewNoPr] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newDeliveryTo, setNewDeliveryTo] = useState<string>('');
  const [newDelivery, setNewDelivery] = useState<string>('Darat');
  const [newNoPo, setNewNoPo] = useState<string>('-');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');
  const [detailRows, setDetailRows] = useState<PurchaseRequestDetailItem[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<'list' | 'detail'>('list');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadMasterReferences = async () => {
    const [lokasiRes, barangRes] = await Promise.allSettled([
      erpList<any>('master_lokasi_gudangs', { orderBy: 'nama_lokasi', asc: true, limit: 1000 }),
      erpList<any>('master_barangs', { orderBy: 'kode', asc: true, limit: 2000 }),
    ]);

    if (lokasiRes.status === 'fulfilled') {
      const uniqueNames = Array.from(
        new Set(
          lokasiRes.value
            .map((l: any) => String(l.nama_lokasi || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setLokasiOptions(uniqueNames);
    }

    if (barangRes.status === 'fulfilled') {
      const mapped: MasterBarangOption[] = barangRes.value
        .map((r: any) => ({
          kode: String(r.kode || '').trim().toUpperCase(),
          namaBarang: String(r.nama_barang || '').trim(),
          unit: String(r.unit || 'PCS').trim().toUpperCase(),
        }))
        .filter((b: MasterBarangOption) => b.kode);
      setBarangOptions(mapped);
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

      const [rows, details] = await Promise.all([
        erpList<any>('purchase_requests', queryOpts),
        erpList<any>('purchase_request_details', { orderBy: 'no_urut', asc: true }).catch(() => []),
        loadMasterReferences(),
      ]);

      const grouped: Record<string, PurchaseRequestDetailItem[]> = {};
      for (const raw of details) {
        const key = String(raw.pr_id || '');
        if (!key) continue;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(mapDbToPrDetail(raw, grouped[key].length));
      }
      setPrDetailsMap(grouped);

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
      const details = prDetailsMap[selected.id] || [];
      const headerPayload: Record<string, any> = {
        id: selected.id,
        no_pr: selected.noPr.trim().toUpperCase(),
        tanggal: selected.tanggalIso || toIsoDate(selected.tanggal) || todayIso(),
        delivery_to: selected.deliveryTo.trim().toUpperCase(),
        delivery: selected.delivery.trim(),
        no_po: selected.noPo.trim().toUpperCase() || '-',
        keterangan: selected.keterangan.trim(),
        dibuat_oleh: selected.dibuatOleh.trim().toUpperCase() || currentUser,
        diupdate_oleh: currentUser,
        tgl_update: todayIso(),
      };
      const detailPayloads = details.map((d, idx) => ({
        no_urut: idx + 1,
        kode: d.kode.trim().toUpperCase(),
        nama_barang: d.namaBarang.trim(),
        unit: d.unit.trim().toUpperCase() || 'PCS',
        qty: Number(d.qty || 1),
        keterangan: d.keterangan.trim(),
      }));
      const res = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'purchase-request',
        headerPayload,
        detailPayloads
      );
      const mapped = mapDbToPr(res.header);
      const mappedDet = (res.details || []).map((d: any, idx: number) => mapDbToPrDetail(d, idx));
      setPrList((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
      setPrDetailsMap((prev) => ({ ...prev, [mapped.id]: mappedDet }));
      setSelectedId(mapped.id);
      showFeedback(
        res.detailWarning
          ? res.detailWarning
          : `Purchase Request [${mapped.noPr}] & Detail tersimpan ke Supabase`
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

  const selectedPr = useMemo(
    () => prList.find((p) => p.id === selectedId) || null,
    [prList, selectedId]
  );

  const selectedPrDetails = useMemo(
    () => (selectedId ? prDetailsMap[selectedId] || [] : []),
    [prDetailsMap, selectedId]
  );

  if (!isOpen) return null;

  const handleDetailSelectBarang = (rowId: string, selectedKode: string) => {
    const cleanKode = selectedKode.trim().toUpperCase();
    const found = barangOptions.find((b) => b.kode === cleanKode);
    setDetailRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              kode: cleanKode,
              namaBarang: found ? found.namaBarang : r.namaBarang,
              unit: found ? found.unit : r.unit,
            }
          : r
      )
    );
  };

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
    setNewKeterangan('');
    setNewDibuatOleh(currentUser);
    setNewTglCreated(todayDisp);
    setNewDiupdateOleh('-');
    setNewTglUpdate('');
    setDetailRows([createBlankDetailRow(1)]);
    setIsAddOpen(true);
    await loadMasterReferences();
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
    setNewKeterangan(item.keterangan || '');
    setNewDibuatOleh(item.dibuatOleh || currentUser);
    setNewTglCreated(!item.tglCreated || item.tglCreated === '-' ? todayDisp : item.tglCreated);
    setNewDiupdateOleh(
      item.diupdateOleh && item.diupdateOleh !== '-' ? item.diupdateOleh : currentUser
    );
    setNewTglUpdate(item.tglUpdate && item.tglUpdate !== '-' ? item.tglUpdate : todayDisp);
    const existingDetails = prDetailsMap[item.id] || [];
    setDetailRows(
      existingDetails.length > 0
        ? existingDetails.map((d, idx) => ({ ...d, noUrut: idx + 1 }))
        : [createBlankDetailRow(1)]
    );
    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoPr.trim()) {
      setModalError('No.PR wajib diisi.');
      return;
    }

    const activeDetails = detailRows.filter(
      (d) => d.kode.trim() !== '' || d.namaBarang.trim() !== ''
    );

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const baseHeader: Record<string, any> = {
        no_pr: newNoPr.trim().toUpperCase(),
        tanggal: toIsoDate(newTanggal) || todayIso(),
        delivery_to: newDeliveryTo.trim().toUpperCase(),
        delivery: newDelivery.trim(),
        no_po: newNoPo.trim().toUpperCase() || '-',
        keterangan: newKeterangan.trim(),
        dibuat_oleh: newDibuatOleh.trim().toUpperCase() || currentUser,
        tgl_created: toIsoDate(newTglCreated) || todayIso(),
      };
      if (editingId) {
        baseHeader.id = editingId;
        baseHeader.diupdate_oleh = newDiupdateOleh.trim().toUpperCase() || currentUser;
        baseHeader.tgl_update = toIsoDate(newTglUpdate) || todayIso();
      } else {
        baseHeader.diupdate_oleh = newDiupdateOleh.trim()
          ? newDiupdateOleh.trim().toUpperCase()
          : '-';
        baseHeader.tgl_update = toIsoDate(newTglUpdate);
      }

      const detailPayloads = activeDetails.map((d, idx) => ({
        no_urut: idx + 1,
        kode: d.kode.trim().toUpperCase(),
        nama_barang: d.namaBarang.trim(),
        unit: d.unit.trim().toUpperCase() || 'PCS',
        qty: Number(d.qty || 1),
        keterangan: d.keterangan.trim(),
      }));

      const res = await erpCompositeSave<{ header: any; details: any[]; detailWarning?: string }>(
        'purchase-request',
        baseHeader,
        detailPayloads
      );
      const mapped = mapDbToPr(res.header);
      const mappedDetails = (res.details || []).map((d: any, idx: number) => mapDbToPrDetail(d, idx));

      if (editingId) {
        setPrList((prev) => prev.map((p) => (p.id === editingId ? mapped : p)));
      } else {
        setPrList((prev) => [mapped, ...prev]);
        setSelectedId(mapped.id);
      }
      setPrDetailsMap((prev) => ({
        ...prev,
        [mapped.id]: mappedDetails.length > 0 ? mappedDetails : activeDetails,
      }));
      showFeedback(
        res.detailWarning
          ? res.detailWarning
          : editingId
          ? 'Purchase Request & P.R. Detail diperbarui'
          : 'Purchase Request & P.R. Detail tersimpan'
      );
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
      await erpDelete('purchase_request_details', id, 'pr_id').catch(() => {});
      await erpDelete('purchase_requests', id);
      const updated = prList.filter((item) => item.id !== id);
      setPrList(updated);
      setPrDetailsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
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
      [item.noPr, item.tanggal, item.deliveryTo, item.delivery, item.noPo, item.keterangan, item.dibuatOleh],
      searchTerm
    );
  });

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

  const handleOpenPrint = (mode: 'list' | 'detail' = 'list') => {
    setPrintMode(mode);
    setIsPrintOpen(true);
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
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
        { header: 'Tgl Created', accessor: 'tglCreated', align: 'center' },
        { header: 'DiUpdate Oleh', accessor: 'diupdateOleh' },
        { header: 'Tgl.Updated', accessor: 'tglUpdate', align: 'center' },
      ],
      rows: filteredPrList,
    });
    showFeedback('Export Excel selesai');
  };

  const listPrintColumns: PrintColumn<PurchaseRequestItem>[] = [
    { header: 'No.PR', accessor: 'noPr', width: '110px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '78px' },
    { header: 'Delivery To', accessor: 'deliveryTo', width: '160px' },
    { header: 'Delivery', accessor: 'delivery', width: '75px' },
    { header: 'No. PO', accessor: 'noPo', width: '100px' },
    { header: 'Keterangan', accessor: 'keterangan' },
    { header: 'Dibuat Oleh', accessor: 'dibuatOleh', width: '80px' },
    { header: 'Tgl Created', accessor: 'tglCreated', align: 'center', width: '80px' },
  ];

  const detailPrintColumns: PrintColumn<PurchaseRequestDetailItem>[] = [
    { header: 'Kode', accessor: 'kode', width: '110px' },
    { header: 'Nama Barang', accessor: 'namaBarang' },
    { header: 'Unit', accessor: 'unit', align: 'center', width: '70px' },
    { header: 'QTY', accessor: (r) => formatMoney(r.qty), align: 'right', width: '80px' },
    { header: 'Keterangan', accessor: 'keterangan', width: '180px' },
  ];

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
          onPrint={() => handleOpenPrint(selectedPr ? 'detail' : 'list')}
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
              onPrint={() => handleOpenPrint(selectedPr ? 'detail' : 'list')}
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

        {/* Upper Table: List Purchase Request */}
        <div className="flex-[1.3] min-h-[160px] overflow-auto bg-white border border-[#999999] mx-1.5 mt-1.5 relative shadow-inner">
          <table className="w-full border-collapse text-left min-w-[1120px]">
            <thead className="sticky top-0 bg-[#F0F0F0] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10">
              <tr>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center w-12">No</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.PR</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tanggal</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Delivery To</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Delivery</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No. PO</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Keterangan</th>
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
                  <td colSpan={12} className="text-center py-8 text-gray-500 italic">
                    Tidak ada data Purchase Request
                  </td>
                </tr>
              ) : (
                filteredPrList.map((item, idx) => {
                  const isSelected = selectedId === item.id;
                  const itemCount = (prDetailsMap[item.id] || []).length;
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
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono font-medium">
                        {item.noPr}
                        {itemCount > 0 && (
                          <span className={`ml-1.5 text-[10px] px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>
                            {itemCount} item
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.tanggal}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.deliveryTo}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.delivery}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono">{item.noPo}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.keterangan || '-'}</td>
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

        {/* Lower Panel: P.R. Detail */}
        <div className="flex-1 min-h-[140px] flex flex-col mx-1.5 mt-1.5 mb-1 border border-[#999999] bg-white shadow-inner overflow-hidden">
          <div className="shrink-0 bg-[#E6E3D5] border-b border-[#ACA899] px-2.5 py-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-[#003C74] whitespace-nowrap">P.R. Detail Barang Diminta</span>
              {selectedPr ? (
                <span className="text-[11px] text-gray-800 truncate">
                  No.PR: <b className="font-mono">{selectedPr.noPr}</b> | Delivery To:{' '}
                  <b>{selectedPr.deliveryTo || '-'}</b> | Status PO:{' '}
                  <b className="font-mono text-[#000084]">{selectedPr.noPo !== '-' ? selectedPr.noPo : 'Belum PO'}</b>
                </span>
              ) : (
                <span className="text-[11px] text-gray-500 italic">
                  Pilih Purchase Request di atas untuk melihat rincian barang
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] font-bold text-gray-900 font-mono">
                Total Item: {selectedPrDetails.length} | Total QTY:{' '}
                {formatMoney(selectedPrDetails.reduce((s, d) => s + d.qty, 0))}
              </span>
              {selectedPr && (
                <button
                  type="button"
                  onClick={() => handleOpenPrint('detail')}
                  className="px-2.5 py-0.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded-xs text-[11px] font-semibold cursor-pointer"
                >
                  Print P.R. Detail
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-left min-w-[700px]">
              <thead className="sticky top-0 bg-[#F4F4F4] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10">
                <tr>
                  <th className="px-2 py-1 border-r border-[#C0C0C0] text-center w-10">No</th>
                  <th className="px-2 py-1 border-r border-[#C0C0C0] w-32">Kode</th>
                  <th className="px-2 py-1 border-r border-[#C0C0C0]">Nama Barang</th>
                  <th className="px-2 py-1 border-r border-[#C0C0C0] text-center w-20">Unit</th>
                  <th className="px-2 py-1 border-r border-[#C0C0C0] text-right w-24">QTY Diminta</th>
                  <th className="px-2 py-1">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {selectedPrDetails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-gray-500 italic">
                      Belum ada rincian barang pada PR ini. Klik Baru atau Koreksi untuk menambahkan P.R. Detail.
                    </td>
                  </tr>
                ) : (
                  selectedPrDetails.map((d, idx) => (
                    <tr
                      key={d.id}
                      className={`border-b border-[#E5E5E5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                    >
                      <td className="px-2 py-1 border-r border-[#E5E5E5] text-center">{idx + 1}</td>
                      <td className="px-2 py-1 border-r border-[#E5E5E5] font-mono font-semibold">{d.kode}</td>
                      <td className="px-2 py-1 border-r border-[#E5E5E5]">{d.namaBarang}</td>
                      <td className="px-2 py-1 border-r border-[#E5E5E5] text-center">{d.unit}</td>
                      <td className="px-2 py-1 border-r border-[#E5E5E5] text-right font-mono font-semibold">
                        {formatMoney(d.qty)}
                      </td>
                      <td className="px-2 py-1">{d.keterangan || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
              {selectedPr ? `${selectedPr.noPr} - ${selectedPr.deliveryTo || '-'}` : ''}
            </div>
            <div className="text-gray-800 font-medium">Record : {filteredPrList.length}</div>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] rounded shadow-2xl w-[840px] max-w-[96vw] max-h-[93vh] flex flex-col overflow-hidden">
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
              <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">No.PR:</label>
                    <input
                      type="text"
                      value={newNoPr}
                      onChange={(e) => setNewNoPr(e.target.value)}
                      required
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">Tanggal:</label>
                    <div className="w-64">
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
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase cursor-pointer"
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
                    <select
                      value={newDelivery}
                      onChange={(e) => setNewDelivery(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs cursor-pointer"
                    >
                      <option value="Darat">Darat</option>
                      <option value="Laut">Laut</option>
                      <option value="Udara">Udara</option>
                      <option value="Ambil Sendiri">Ambil Sendiri</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">No. PO:</label>
                    <input
                      type="text"
                      value={newNoPo}
                      onChange={(e) => setNewNoPo(e.target.value)}
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs font-mono uppercase"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-700 shrink-0">Keterangan:</label>
                    <input
                      type="text"
                      value={newKeterangan}
                      onChange={(e) => setNewKeterangan(e.target.value)}
                      placeholder="Catatan permintaan pembelian..."
                      className="w-64 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                    />
                  </div>
                </div>

                {/* P.R. Detail Datagrid */}
                <div className="border border-[#999999] bg-white rounded-xs overflow-hidden">
                  <div className="bg-[#E6E3D5] border-b border-[#C0C0C0] px-2.5 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#003C74]">P.R. Detail Barang Diminta</span>
                      <span className="text-[11px] text-gray-600">
                        (Otomatis termuat ke P.O. Detail saat No.PR dipilih di Purchase Order)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDetailRows((prev) => [...prev, createBlankDetailRow(prev.length + 1)])
                      }
                      className="px-2.5 py-0.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded-xs text-[11px] font-semibold cursor-pointer"
                    >
                      + Tambah Baris
                    </button>
                  </div>
                  <div className="max-h-[200px] overflow-auto">
                    <table className="w-full border-collapse text-left min-w-[720px]">
                      <thead className="sticky top-0 bg-[#F0F0F0] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10 text-[11px]">
                        <tr>
                          <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-center w-8">No</th>
                          <th className="px-1.5 py-1 border-r border-[#C0C0C0] w-40">Kode</th>
                          <th className="px-1.5 py-1 border-r border-[#C0C0C0]">Nama Barang</th>
                          <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-center w-16">Unit</th>
                          <th className="px-1.5 py-1 border-r border-[#C0C0C0] text-right w-20">QTY</th>
                          <th className="px-1.5 py-1 border-r border-[#C0C0C0] w-44">Keterangan</th>
                          <th className="px-1.5 py-1 text-center w-10">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-4 text-gray-500 italic text-[11px]">
                              Belum ada item PR. Klik "+ Tambah Baris".
                            </td>
                          </tr>
                        ) : (
                          detailRows.map((d, idx) => {
                            const kodeChoices = Array.from(
                              new Set([...barangOptions.map((b) => b.kode), d.kode].filter(Boolean))
                            );
                            return (
                              <tr key={d.id} className="border-b border-[#E5E5E5] text-[11px]">
                                <td className="px-1.5 py-1 border-r border-[#E5E5E5] text-center">{idx + 1}</td>
                                <td className="p-0.5 border-r border-[#E5E5E5]">
                                  <select
                                    value={d.kode}
                                    onChange={(e) => handleDetailSelectBarang(d.id, e.target.value)}
                                    className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs font-mono text-[11px] uppercase cursor-pointer"
                                  >
                                    <option value="">-- Kode Barang --</option>
                                    {kodeChoices.map((kode) => {
                                      const b = barangOptions.find((item) => item.kode === kode);
                                      return (
                                        <option key={kode} value={kode}>
                                          {b ? `${kode} - ${b.namaBarang}` : kode}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </td>
                                <td className="p-0.5 border-r border-[#E5E5E5]">
                                  <input
                                    type="text"
                                    value={d.namaBarang}
                                    onChange={(e) =>
                                      setDetailRows((prev) =>
                                        prev.map((r) =>
                                          r.id === d.id ? { ...r, namaBarang: e.target.value } : r
                                        )
                                      )
                                    }
                                    placeholder="Nama Barang"
                                    className="w-full px-1.5 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-[11px]"
                                  />
                                </td>
                                <td className="p-0.5 border-r border-[#E5E5E5]">
                                  <input
                                    type="text"
                                    value={d.unit}
                                    onChange={(e) =>
                                      setDetailRows((prev) =>
                                        prev.map((r) =>
                                          r.id === d.id ? { ...r, unit: e.target.value.toUpperCase() } : r
                                        )
                                      )
                                    }
                                    className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-center text-[11px] uppercase"
                                  />
                                </td>
                                <td className="p-0.5 border-r border-[#E5E5E5]">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={d.qty}
                                    onChange={(e) =>
                                      setDetailRows((prev) =>
                                        prev.map((r) =>
                                          r.id === d.id ? { ...r, qty: parseNum(e.target.value) } : r
                                        )
                                      )
                                    }
                                    className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-right font-mono text-[11px]"
                                  />
                                </td>
                                <td className="p-0.5 border-r border-[#E5E5E5]">
                                  <input
                                    type="text"
                                    value={d.keterangan}
                                    onChange={(e) =>
                                      setDetailRows((prev) =>
                                        prev.map((r) =>
                                          r.id === d.id ? { ...r, keterangan: e.target.value } : r
                                        )
                                      )
                                    }
                                    placeholder="Catatan item"
                                    className="w-full px-1.5 py-0.5 bg-white border border-[#C0C0C0] rounded-xs text-[11px]"
                                  />
                                </td>
                                <td className="p-0.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDetailRows((prev) =>
                                        prev
                                          .filter((r) => r.id !== d.id)
                                          .map((r, i) => ({ ...r, noUrut: i + 1 }))
                                      )
                                    }
                                    className="px-1.5 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xs font-bold text-[10px] cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-[#D0D0D0] pt-2.5 grid grid-cols-2 md:grid-cols-4 gap-2.5">
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
          title={printMode === 'detail' ? 'PURCHASE REQUEST DETAIL' : 'LAPORAN PURCHASE REQUEST'}
          subtitle={
            printMode === 'detail' && selectedPr
              ? `No. PR: ${selectedPr.noPr} | Tanggal: ${selectedPr.tanggal} | Delivery To: ${selectedPr.deliveryTo || '-'}`
              : `Filter Tanggal: ${tanggalFilter}`
          }
          metaLines={
            printMode === 'detail' && selectedPr
              ? [
                  { label: 'No. PR', value: selectedPr.noPr },
                  { label: 'Tanggal', value: selectedPr.tanggal },
                  { label: 'Delivery To', value: selectedPr.deliveryTo || '-' },
                  { label: 'Delivery', value: selectedPr.delivery || '-' },
                  { label: 'No. PO', value: selectedPr.noPo || '-' },
                  { label: 'Keterangan', value: selectedPr.keterangan || '-' },
                  { label: 'Dibuat Oleh', value: selectedPr.dibuatOleh },
                ]
              : []
          }
          orientation="landscape"
          columns={
            printMode === 'detail'
              ? selectedPrDetails.length > 0
                ? (detailPrintColumns as PrintColumn<any>[])
                : (listPrintColumns as PrintColumn<any>[])
              : (listPrintColumns as PrintColumn<any>[])
          }
          rows={
            printMode === 'detail'
              ? selectedPrDetails.length > 0
                ? selectedPrDetails
                : selectedPr
                ? [selectedPr]
                : []
              : filteredPrList
          }
          summaryItems={
            printMode === 'detail'
              ? [
                  { label: 'Total Item', value: `${selectedPrDetails.length} Item` },
                  {
                    label: 'Total QTY Diminta',
                    value: formatMoney(selectedPrDetails.reduce((s, d) => s + d.qty, 0)),
                  },
                ]
              : [{ label: 'Total Record', value: `${filteredPrList.length} Dokumen` }]
          }
          selectedRow={printMode === 'list' ? selectedPr : undefined}
          selectedRows={printMode === 'list' && selectedPrDetails.length > 0 ? selectedPrDetails : undefined}
          selectedColumns={
            printMode === 'list' && selectedPrDetails.length > 0
              ? (detailPrintColumns as PrintColumn<any>[])
              : undefined
          }
          selectedTitle={printMode === 'list' ? 'PURCHASE REQUEST (RECORD TERPILIH)' : undefined}
          selectedSubtitle={
            printMode === 'list' && selectedPr
              ? `No. PR: ${selectedPr.noPr} | Tanggal: ${selectedPr.tanggal}`
              : undefined
          }
          selectedMetaLines={
            printMode === 'list' && selectedPr
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
            printMode === 'list' && selectedPr
              ? [
                  { label: 'No. PR Terpilih', value: selectedPr.noPr },
                  { label: 'Total Item Diminta', value: `${selectedPrDetails.length} Item` },
                ]
              : undefined
          }
          toolbarExtra={
            <div className="flex items-center bg-[#111827] border border-gray-600 rounded-[2px] p-0.5 text-[10.5px]">
              <button
                type="button"
                onClick={() => setPrintMode('detail')}
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                  printMode === 'detail' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                P.R. Terpilih (Detail)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('list')}
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer font-semibold ${
                  printMode === 'list' ? 'bg-[#0055EA] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                List Purchase Request
              </button>
            </div>
          }
        />

        <SupabaseFindModal
          isOpen={isFindOpen}
          onClose={() => setIsFindOpen(false)}
          tableLabel="Purchase Request"
          rows={prList}
          selectedId={selectedId}
          getRowId={(r) => r.id}
          getSearchValues={(r) => [r.noPr, r.tanggal, r.deliveryTo, r.delivery, r.noPo, r.keterangan, r.dibuatOleh]}
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
