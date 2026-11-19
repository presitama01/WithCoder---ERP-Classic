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
  toDisplayDMyShort,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { getCurrentUser } from '../lib/authService';

export interface SuratJalanItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaCustomer: string;
  noSo: string;
  poNo: string;
  sales: string;
  noFaktur: string;
  keterangan: string;
  lokasiStock: string;
  stsPrint: string;
  tglPrint: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListSuratJalanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrintReport?: () => void;
}

function mapDbToSj(r: any): SuratJalanItem {
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaCustomer: r.nama_customer || '',
    noSo: r.no_so || '',
    poNo: r.po_no || '',
    sales: r.sales || '',
    noFaktur: r.no_faktur || '',
    keterangan: r.keterangan || '',
    lokasiStock: r.lokasi_stock || '01 - OFFICE',
    stsPrint: r.sts_print || 'Not Yet',
    tglPrint: toDisplayDMyShort(r.tgl_print) || '',
    stsPost: r.sts_post || 'Posting',
    tglPost: toDisplayDMyShort(r.tgl_post) || '',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '',
  };
}

export const ListSuratJalanForm: React.FC<ListSuratJalanFormProps> = ({
  isOpen,
  onClose,
  onOpenPrintReport,
}) => {
  const [sjList, setSjList] = useState<SuratJalanItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const findInputRef = useRef<HTMLInputElement>(null);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [soOptions, setSoOptions] = useState<string[]>([]);
  const [poOptions, setPoOptions] = useState<string[]>([]);
  const [salesOptions, setSalesOptions] = useState<string[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);

  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newNoSo, setNewNoSo] = useState<string>('');
  const [newPoNo, setNewPoNo] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('');
  const [newNoFaktur, setNewNoFaktur] = useState<string>('');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newLokasiStock, setNewLokasiStock] = useState<string>('01 - OFFICE');
  const [newStsPrint, setNewStsPrint] = useState<string>('Not Yet');
  const [newTglPrint, setNewTglPrint] = useState<string>('');
  const [newStsPost, setNewStsPost] = useState<string>('Posting');
  const [newTglPost, setNewTglPost] = useState<string>('');
  const [newDibuatOleh, setNewDibuatOleh] = useState<string>('');
  const [newTglCreated, setNewTglCreated] = useState<string>('');
  const [newDiupdateOleh, setNewDiupdateOleh] = useState<string>('');
  const [newTglUpdate, setNewTglUpdate] = useState<string>('');

  const [confirmDeleteRow, setConfirmDeleteRow] = useState<SuratJalanItem | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadMasterReferences = async () => {
    const [custRes, soRes, poRes, salesRes, lokasiRes] = await Promise.allSettled([
      erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true, limit: 1000 }),
      erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }),
      erpList<any>('purchase_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }),
      erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true, limit: 1000 }),
      erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true, limit: 1000 }),
    ]);

    if (custRes.status === 'fulfilled') {
      const custs = Array.from(
        new Set(
          custRes.value
            .map((c: any) => String(c.nama_customer || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setCustomerOptions(custs);
    }

    if (soRes.status === 'fulfilled') {
      const sos = Array.from(
        new Set(
          soRes.value
            .map((s: any) => String(s.no_bukti || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setSoOptions(sos);
    }

    if (poRes.status === 'fulfilled') {
      const pos = Array.from(
        new Set(
          poRes.value
            .map((p: any) => String(p.no_bukti || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setPoOptions(pos);
    }

    if (salesRes.status === 'fulfilled') {
      const salesList = Array.from(
        new Set(
          salesRes.value
            .map((sl: any) => String(sl.nama_sales || '').trim().toUpperCase())
            .filter(Boolean)
        )
      );
      setSalesOptions(salesList);
    }

    if (lokasiRes.status === 'fulfilled') {
      const lokasis = Array.from(
        new Set(
          lokasiRes.value
            .map((l: any) => {
              const kode = String(l.kode || '').trim().toUpperCase();
              const nama = String(l.nama_lokasi || '').trim().toUpperCase();
              if (kode && nama) return `${kode} - ${nama}`;
              return nama || kode;
            })
            .filter(Boolean)
        )
      );
      setLokasiOptions(lokasis);
    }
  };

  const loadData = async (): Promise<boolean> => {
    try {
      setIsBusy(true);
      const [rows] = await Promise.all([
        erpList<any>('surat_jalans', { orderBy: 'tanggal', asc: false }),
        loadMasterReferences(),
      ]);
      const mapped = rows.map(mapDbToSj);
      setSjList(mapped);
      if (mapped.length > 0 && !mapped.some((r) => r.id === selectedId)) {
        setSelectedId(mapped[0].id);
      }
      return true;
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarSimpan = async () => {
    const ok = await loadData();
    if (ok) showFeedback('Data tersinkronisasi dengan database Supabase');
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNew = async () => {
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(null);
    setModalError(null);
    setNewNoBukti(nextUniqueCode(sjList.map((s) => s.noBukti), '2608-DO-INV-', 3));
    setNewTanggal(todayDisp);
    setNewCustomer('');
    setNewNoSo('');
    setNewPoNo('');
    setNewSales('');
    setNewNoFaktur('');
    setNewKeterangan('');
    setNewLokasiStock(lokasiOptions[0] || '01 - OFFICE');
    setNewStsPrint('Not Yet');
    setNewTglPrint('');
    setNewStsPost('Posting');
    setNewTglPost(todayDisp);
    setNewDibuatOleh(currentUser);
    setNewTglCreated(todayDisp);
    setNewDiupdateOleh('-');
    setNewTglUpdate('');
    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleEdit = async () => {
    const item = sjList.find((s) => s.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
    const todayDisp = toDisplayDMyShort(todayIso());
    setEditingId(item.id);
    setModalError(null);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal || todayDisp);
    setNewCustomer(item.namaCustomer);
    setNewNoSo(item.noSo);
    setNewPoNo(item.poNo);
    setNewSales(item.sales);
    setNewNoFaktur(item.noFaktur);
    setNewKeterangan(item.keterangan);
    setNewLokasiStock(item.lokasiStock || lokasiOptions[0] || '01 - OFFICE');
    setNewStsPrint(item.stsPrint || 'Not Yet');
    setNewTglPrint(item.tglPrint === '-' ? '' : item.tglPrint);
    setNewStsPost(item.stsPost || 'Posting');
    setNewTglPost(item.tglPost === '-' ? '' : item.tglPost);
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
      setModalError('No. Bukti dan Nama Customer wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const tglIso = toIsoDate(newTanggal) || todayIso();
      const payload: Record<string, any> = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_customer: newCustomer.trim().toUpperCase(),
        no_so: newNoSo.trim().toUpperCase(),
        po_no: newPoNo.trim().toUpperCase(),
        sales: newSales.trim().toUpperCase(),
        no_faktur: newNoFaktur.trim().toUpperCase(),
        keterangan: newKeterangan.trim(),
        lokasi_stock: newLokasiStock.trim().toUpperCase() || '01 - OFFICE',
        sts_print: newStsPrint,
        tgl_print: toIsoDate(newTglPrint) || (newStsPrint === 'Printed' ? todayIso() : null),
        sts_post: newStsPost,
        tgl_post: toIsoDate(newTglPost) || (newStsPost === 'Posting' ? tglIso : null),
        dibuat_oleh: newDibuatOleh.trim().toUpperCase() || currentUser,
        tgl_created: toIsoDate(newTglCreated) || todayIso(),
      };

      if (editingId) {
        payload.diupdate_oleh = newDiupdateOleh.trim().toUpperCase() || currentUser;
        payload.tgl_update = toIsoDate(newTglUpdate) || todayIso();
        const saved = await erpUpdate<any>('surat_jalans', editingId, payload);
        const mapped = mapDbToSj(saved);
        setSjList(sjList.map((item) => (item.id === editingId ? mapped : item)));
        showFeedback('Surat Jalan diperbarui');
      } else {
        payload.diupdate_oleh = newDiupdateOleh.trim() ? newDiupdateOleh.trim().toUpperCase() : '-';
        payload.tgl_update = toIsoDate(newTglUpdate);
        const saved = await erpCreate<any>('surat_jalans', payload);
        const mapped = mapDbToSj(saved);
        setSjList([mapped, ...sjList]);
        setSelectedId(mapped.id);
        showFeedback('Surat Jalan tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Surat Jalan';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('surat_jalans', id);
      const updated = sjList.filter((item) => item.id !== id);
      setSjList(updated);
      setConfirmDeleteRow(null);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Surat Jalan dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = sjList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    if (searchField === 'Nama Pelanggan') return item.namaCustomer.toLowerCase().includes(term);
    if (searchField === 'No.Bukti') return item.noBukti.toLowerCase().includes(term);
    if (searchField === 'No.SO') return item.noSo.toLowerCase().includes(term);
    if (searchField === 'PO.NO') return item.poNo.toLowerCase().includes(term);
    if (searchField === 'No.Faktur') return item.noFaktur.toLowerCase().includes(term);
    if (searchField === 'Lokasi Stock') return item.lokasiStock.toLowerCase().includes(term);
    return (
      item.noBukti.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.noSo.toLowerCase().includes(term) ||
      item.poNo.toLowerCase().includes(term) ||
      item.noFaktur.toLowerCase().includes(term)
    );
  });

  const findModalRows = sjList.filter((item) => {
    if (!findQuery.trim()) return true;
    const tokens = findQuery.trim().toLowerCase().split(/\s+/);
    const searchable = [
      item.noBukti,
      item.tanggal,
      item.namaCustomer,
      item.noSo,
      item.poNo,
      item.sales,
      item.noFaktur,
      item.lokasiStock,
    ]
      .join(' ')
      .toLowerCase();
    return tokens.every((t) => searchable.includes(t));
  });

  const handleExecuteToolbarSearch = () => {
    if (filteredList.length > 0) {
      setSelectedId(filteredList[0].id);
      showFeedback(`Ditemukan ${filteredList.length} Surat Jalan`);
    } else {
      showFeedback('Data Surat Jalan tidak ditemukan');
    }
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    setFindQuery(searchTerm);
    await loadData();
    setTimeout(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }, 60);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Surat_Jalan',
      sheetTitle: 'LIST SURAT JALAN',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'No.SO', accessor: 'noSo' },
        { header: 'PO.NO', accessor: 'poNo' },
        { header: 'Sales', accessor: 'sales' },
        { header: 'No.Faktur', accessor: 'noFaktur' },
        { header: 'Lokasi Stock', accessor: 'lokasiStock' },
        { header: 'Sts.Post', accessor: 'stsPost', align: 'center' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
        { header: 'Tgl.Created', accessor: 'tglCreated', align: 'center' },
        { header: 'Diupdate Oleh', accessor: 'diupdateOleh' },
        { header: 'Tgl.Update', accessor: 'tglUpdate', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const customerDropdownChoices = Array.from(
    new Set([...customerOptions, newCustomer.trim().toUpperCase()].filter(Boolean))
  );

  const soDropdownChoices = Array.from(
    new Set([...soOptions, newNoSo.trim().toUpperCase()].filter(Boolean))
  );

  const poDropdownChoices = Array.from(
    new Set([...poOptions, newPoNo.trim().toUpperCase()].filter(Boolean))
  );

  const salesDropdownChoices = Array.from(
    new Set([...salesOptions, newSales.trim().toUpperCase()].filter(Boolean))
  );

  const lokasiDropdownChoices = Array.from(
    new Set(['01 - OFFICE', ...lokasiOptions, newLokasiStock.trim().toUpperCase()].filter(Boolean))
  );

  return (
    <div
      id="list-surat-jalan-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="List Surat Jalan"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => setIsPrintOpen(true)}
        onTableView={loadData}
        onExportExcel={handleExportExcel}
      />

      <div className="bg-[#ECE9D8] border-b border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs shadow-sm overflow-x-auto">
        <div className="flex items-center space-x-2">
          <FormActionButtons
            onSimpan={handleToolbarSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={() => {
              const item = sjList.find((s) => s.id === selectedId);
              if (item) setConfirmDeleteRow(item);
              else showFeedback('Pilih data yang akan dihapus');
            }}
            onPrint={() => setIsPrintOpen(true)}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />
          {onOpenPrintReport && (
            <button
              type="button"
              onClick={onOpenPrintReport}
              className="h-[28px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] active:bg-[#DCD8C8] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1 text-[11px] font-sans text-black cursor-pointer whitespace-nowrap"
              title="Buka Dialog Laporan Surat Jalan"
            >
              <span className="text-blue-700">🖶</span>
              <span>Laporan Surat Jalan</span>
            </button>
          )}
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
            {filteredList.length} DO
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-[#7A7A7A] m-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1520px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Bukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.SO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">PO.NO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Faktur</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Lokasi Stock</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Post</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Post</th>
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
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tanggal}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-medium">{item.namaCustomer}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noSo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.poNo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.sales}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noFaktur}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.lokasiStock}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.stsPrint}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.tglPrint || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.stsPost}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.tglPost || '-'}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.dibuatOleh}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.diupdateOleh || '-'}</td>
                  <td className="px-3 py-1">{item.tglUpdate || '-'}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={18} className="text-center py-6 text-gray-500">
                  Tidak ada data surat jalan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-[#ECE9D8] border-t border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">Search :</span>
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="px-2 py-0.5 bg-white border border-[#7A7A7A] text-xs rounded"
          >
            <option value="Semua">Semua</option>
            <option value="Nama Pelanggan">Nama Pelanggan</option>
            <option value="No.Bukti">No.Bukti</option>
            <option value="No.SO">No.SO</option>
            <option value="PO.NO">PO.NO</option>
            <option value="No.Faktur">No.Faktur</option>
            <option value="Lokasi Stock">Lokasi Stock</option>
          </select>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExecuteToolbarSearch();
            }}
            placeholder="Cari data..."
            className="px-2 py-0.5 w-52 bg-white border border-[#7A7A7A] text-xs shadow-inner"
          />
          <button
            type="button"
            onClick={handleExecuteToolbarSearch}
            className="px-2.5 py-0.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] text-xs font-semibold cursor-pointer"
          >
            Cari
          </button>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="px-2 py-0.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] text-xs cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-56 h-5 bg-[#FFFF00] border border-[#919191] shadow-inner px-2 text-[10px] flex items-center text-black truncate">
            {sjList.find((r) => r.id === selectedId)?.namaCustomer || ''}
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
              <span>{editingId ? 'Koreksi Surat Jalan' : 'Tambah Surat Jalan Baru'}</span>
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
                <label className="font-semibold">No. Bukti:</label>
                <input
                  type="text"
                  value={newNoBukti}
                  onChange={(e) => setNewNoBukti(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Tanggal:</label>
                <div className="col-span-2">
                  <DatePickerInput
                    value={newTanggal}
                    onChange={(formatted) => setNewTanggal(formatted)}
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
                  {customerDropdownChoices.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. SO:</label>
                <select
                  value={newNoSo}
                  onChange={(e) => setNewNoSo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                >
                  <option value="">-- Pilih Sales Order --</option>
                  {soDropdownChoices.map((so) => (
                    <option key={so} value={so}>
                      {so}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">PO.NO:</label>
                <select
                  value={newPoNo}
                  onChange={(e) => setNewPoNo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                >
                  <option value="">-- Pilih Purchase Order --</option>
                  {poDropdownChoices.map((po) => (
                    <option key={po} value={po}>
                      {po}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Sales:</label>
                <select
                  value={newSales}
                  onChange={(e) => setNewSales(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                >
                  <option value="">-- Pilih Sales --</option>
                  {salesDropdownChoices.map((sl) => (
                    <option key={sl} value={sl}>
                      {sl}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. Faktur:</label>
                <input
                  type="text"
                  value={newNoFaktur}
                  onChange={(e) => setNewNoFaktur(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase font-mono"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Lokasi Stock:</label>
                <select
                  value={newLokasiStock}
                  onChange={(e) => setNewLokasiStock(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase cursor-pointer"
                >
                  {lokasiDropdownChoices.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Sts.Print / Tgl.Print:</label>
                <div className="col-span-2 flex gap-2 items-center">
                  <select
                    value={newStsPrint}
                    onChange={(e) => setNewStsPrint(e.target.value)}
                    className="w-28 px-2 py-1 bg-white border border-[#7A7A7A]"
                  >
                    <option value="Not Yet">Not Yet</option>
                    <option value="Printed">Printed</option>
                  </select>
                  <div className="flex-1">
                    <DatePickerInput
                      value={newTglPrint}
                      onChange={(formatted) => setNewTglPrint(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Sts.Post / Tgl.Post:</label>
                <div className="col-span-2 flex gap-2 items-center">
                  <select
                    value={newStsPost}
                    onChange={(e) => setNewStsPost(e.target.value)}
                    className="w-28 px-2 py-1 bg-white border border-[#7A7A7A]"
                  >
                    <option value="Not Yet">Not Yet</option>
                    <option value="Posting">Posting</option>
                  </select>
                  <div className="flex-1">
                    <DatePickerInput
                      value={newTglPost}
                      onChange={(formatted) => setNewTglPost(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>
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

              {/* Audit Fields */}
              <div className="border-t border-[#D0D0D0] pt-2.5 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Dibuat Oleh:</label>
                  <input
                    type="text"
                    value={newDibuatOleh}
                    onChange={(e) => setNewDibuatOleh(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tgl. Created:</label>
                  <DatePickerInput
                    value={newTglCreated}
                    onChange={(formatted) => setNewTglCreated(formatted)}
                    format="dMyShort"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Diupdate Oleh:</label>
                  <input
                    type="text"
                    value={newDiupdateOleh}
                    onChange={(e) => setNewDiupdateOleh(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tgl. Update:</label>
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

      {/* Find Modal: Cari & Daftar Surat Jalan */}
      {isFindOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] shadow-2xl w-[840px] max-w-[96vw] max-h-[85vh] flex flex-col text-xs">
            <div className="bg-[#000080] text-white px-3 py-1.5 flex items-center justify-between font-bold shrink-0">
              <span>Cari &amp; Daftar Surat Jalan (Supabase)</span>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && findModalRows.length > 0) {
                      const first = findModalRows[0];
                      setSelectedId(first.id);
                      setSearchTerm(findQuery);
                      setIsFindOpen(false);
                      showFeedback(`Surat Jalan [${first.noBukti}] dipilih`);
                    }
                  }}
                  placeholder="Cari No.Bukti, Nama Customer, No.SO, PO.NO, Sales, Lokasi Stock..."
                  className="flex-1 h-[24px] px-2 bg-white border border-[#7F9DB9] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm(findQuery);
                    if (findModalRows.length > 0) {
                      setSelectedId(findModalRows[0].id);
                      showFeedback(`Ditemukan ${findModalRows.length} Surat Jalan`);
                    } else {
                      showFeedback('Data Surat Jalan tidak ditemukan');
                    }
                  }}
                  className="h-[24px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer"
                >
                  Cari
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setFindQuery('');
                    setSearchTerm('');
                    await loadData();
                    showFeedback('Data Surat Jalan di-refresh dari Supabase');
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
                      <th className="px-2 py-1 border-r border-[#ACA899] w-28">No.Bukti</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-22">Tanggal</th>
                      <th className="px-2 py-1 border-r border-[#ACA899]">Nama Customer</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-28">No.SO</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-28">PO.NO</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-20">Sales</th>
                      <th className="px-2 py-1 w-28">Lokasi Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findModalRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-gray-500 italic">
                          Tidak ada data Surat Jalan yang cocok
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
                            showFeedback(`Surat Jalan [${s.noBukti} - ${s.namaCustomer}] dipilih`);
                          }}
                          className={`cursor-pointer border-b border-[#E0E0E0] hover:bg-[#316AC5] hover:text-white ${
                            s.id === selectedId ? 'bg-[#FFFF99]' : ''
                          }`}
                        >
                          <td className="px-2 py-1 font-mono font-bold border-r border-[#E0E0E0]">{s.noBukti}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{s.tanggal}</td>
                          <td className="px-2 py-1 font-semibold border-r border-[#E0E0E0]">{s.namaCustomer}</td>
                          <td className="px-2 py-1 font-mono border-r border-[#E0E0E0]">{s.noSo || '-'}</td>
                          <td className="px-2 py-1 font-mono border-r border-[#E0E0E0]">{s.poNo || '-'}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{s.sales || '-'}</td>
                          <td className="px-2 py-1">{s.lokasiStock || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-[#555]">
                  Menampilkan {findModalRows.length} dari {sjList.length} Surat Jalan. Klik baris untuk memilih record.
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

      {/* Delete Confirmation Modal */}
      {confirmDeleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-xl w-[360px] overflow-hidden">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 font-bold text-xs">
              Konfirmasi Hapus Surat Jalan
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>
                Yakin ingin menghapus Surat Jalan [{confirmDeleteRow.noBukti}] dari database Supabase?
              </p>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteRow(null)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleDelete(confirmDeleteRow.id)}
                  className="px-3 py-1 bg-[#C00000] text-white border border-black text-xs font-bold cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN LIST SURAT JALAN (DO)"
        subtitle={`Filter Tanggal: ${tanggalFilter}`}
        orientation="landscape"
        columns={[
          { header: 'No.Bukti', accessor: 'noBukti', width: '110px' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '80px' },
          { header: 'Nama Customer', accessor: 'namaCustomer' },
          { header: 'No.SO', accessor: 'noSo', width: '105px' },
          { header: 'PO.NO', accessor: 'poNo', width: '95px' },
          { header: 'Sales', accessor: 'sales', align: 'center', width: '55px' },
          { header: 'No.Faktur', accessor: 'noFaktur', width: '105px' },
          { header: 'Lokasi Stock', accessor: 'lokasiStock', width: '100px' },
          { header: 'Sts.Post', accessor: 'stsPost', align: 'center', width: '70px' },
          { header: 'Dibuat Oleh', accessor: 'dibuatOleh', width: '80px' },
        ]}
        rows={filteredList}
        summaryItems={[
          { label: 'Total Surat Jalan', value: `${filteredList.length} Dokumen` },
        ]}
      />
    </div>
  );
};
