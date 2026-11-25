import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import { ConfirmDialog } from './ConfirmDialog';
import {
  erpCompositeSave,
  erpDelete,
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
  nextUniqueCode,
  parseNum,
  todayIso,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { getCurrentUser } from '../lib/authService';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface StockOpnameDetailItem {
  id: string;
  kode: string;
  namaBarang: string;
  unit: string;
  stockSistem: number;
  stockFisik: number;
  selisih: number;
  hpp: number;
  totalSelisih: number;
  keterangan: string;
}

export interface StockOpnameItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  lokasiStock: string;
  keterangan: string;
  stsPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diUpdateOleh: string;
  tglUpdate: string;
}

interface MasterBarangOption {
  kode: string;
  namaBarang: string;
  unit: string;
  stock: number;
  cost: number;
}

interface StockOpnameFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const createEmptyDetailRow = (idx = 0): StockOpnameDetailItem => ({
  id: `tmp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
  kode: '',
  namaBarang: '',
  unit: 'PCS',
  stockSistem: 0,
  stockFisik: 0,
  selisih: 0,
  hpp: 0,
  totalSelisih: 0,
  keterangan: '',
});

export const StockOpnameForm: React.FC<StockOpnameFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [opnameList, setOpnameList] = useState<StockOpnameItem[]>([]);
  const [opnameDetailsMap, setOpnameDetailsMap] = useState<Record<string, StockOpnameDetailItem[]>>({});
  const [barangOptions, setBarangOptions] = useState<MasterBarangOption[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);

  const [selectedId, setSelectedId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);

  // Form Header State
  const [formNoBukti, setFormNoBukti] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(toDisplayDMyShort(todayIso()));
  const [formLokasi, setFormLokasi] = useState<string>('01 - OFFICE');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formStsPost, setFormStsPost] = useState<string>('Posting');
  const [detailRows, setDetailRows] = useState<StockOpnameDetailItem[]>([createEmptyDetailRow(0)]);

  const [confirmDeleteRow, setConfirmDeleteRow] = useState<StockOpnameItem | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const mapDbToItem = (r: any): StockOpnameItem => ({
    id: String(r.id),
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    lokasiStock: r.lokasi_stock || '01 - OFFICE',
    keterangan: r.keterangan || '',
    stsPost: r.sts_post || 'Posting',
    dibuatOleh: r.dibuat_oleh || (getCurrentUser().username || 'ADMIN'),
    tglCreated: toDisplayDMyShort(r.tgl_created || r.created_at),
    diUpdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update),
  });

  const mapDbToDetail = (d: any, idx: number): StockOpnameDetailItem => {
    const stockSistem = Number(d.stock_sistem || 0);
    const stockFisik = Number(d.stock_fisik || 0);
    const selisih = d.selisih !== undefined ? Number(d.selisih || 0) : stockFisik - stockSistem;
    const hpp = Number(d.hpp || 0);
    return {
      id: String(d.id || `det-${idx}`),
      kode: String(d.kode || '').trim().toUpperCase(),
      namaBarang: String(d.nama_barang || '').trim(),
      unit: String(d.unit || 'PCS').trim().toUpperCase(),
      stockSistem,
      stockFisik,
      selisih,
      hpp,
      totalSelisih: d.total_selisih !== undefined ? Number(d.total_selisih || 0) : selisih * hpp,
      keterangan: String(d.keterangan || ''),
    };
  };

  const applyItemToForm = (
    item: StockOpnameItem,
    detailsSource: Record<string, StockOpnameDetailItem[]> = opnameDetailsMap
  ) => {
    setSelectedId(item.id);
    setEditingId(item.id);
    setFormNoBukti(item.noBukti);
    setFormTanggal(item.tanggal);
    setFormLokasi(item.lokasiStock);
    setFormKeterangan(item.keterangan);
    setFormStsPost(item.stsPost || 'Posting');
    const dets = detailsSource[item.id] || [];
    setDetailRows(dets.length > 0 ? dets.map((d) => ({ ...d })) : [createEmptyDetailRow(0)]);
    setModalError(null);
  };

  const resetToNewForm = (
    existingItems: StockOpnameItem[] = opnameList,
    lokList: string[] = lokasiOptions
  ) => {
    setSelectedId('');
    setEditingId(null);
    const nextNo = nextUniqueCode(
      existingItems.map((o) => o.noBukti),
      'OPN'
    );
    setFormNoBukti(nextNo);
    setFormTanggal(toDisplayDMyShort(todayIso()));
    setFormLokasi(lokList[0] || '01 - OFFICE');
    setFormKeterangan('');
    setFormStsPost('Posting');
    setDetailRows([createEmptyDetailRow(0)]);
    setModalError(null);
  };

  const loadData = async (opts?: { selectId?: string; keepNewMode?: boolean }) => {
    try {
      setIsBusy(true);
      const [opnRes, detRes, barangRes, lokRes] = await Promise.all([
        erpList<any>('stock_opnames', { orderBy: 'tanggal', asc: false, limit: 1000 }).catch(() => []),
        erpList<any>('stock_opname_details', { orderBy: 'no_urut', asc: true, limit: 5000 }).catch(() => []),
        erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
        erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
      ]);

      const mappedItems = opnRes.map(mapDbToItem);
      setOpnameList(mappedItems);

      const grouped: Record<string, StockOpnameDetailItem[]> = {};
      detRes.forEach((d, idx) => {
        const opId = String(d.opname_id || '');
        if (!opId) return;
        if (!grouped[opId]) grouped[opId] = [];
        grouped[opId].push(mapDbToDetail(d, idx));
      });
      setOpnameDetailsMap(grouped);

      if (barangRes.length > 0) {
        setBarangOptions(
          barangRes
            .filter((b: any) => b.is_active !== false)
            .map((b: any) => ({
              kode: String(b.kode || '').trim().toUpperCase(),
              namaBarang: String(b.nama_barang || '').trim(),
              unit: String(b.unit || 'PCS').trim().toUpperCase(),
              stock: Number(b.stock || 0),
              cost: Number(b.cost || 0),
            }))
        );
      }

      let mappedLok: string[] = [];
      if (lokRes.length > 0) {
        mappedLok = lokRes
          .filter((l: any) => l.is_active !== false)
          .map(
            (l: any) =>
              `${String(l.kode || '').trim().toUpperCase()} - ${String(l.nama_lokasi || '')
                .trim()
                .toUpperCase()}`
          )
          .filter(Boolean);
        setLokasiOptions(mappedLok);
      }

      if (!opts?.keepNewMode) {
        const targetId = opts?.selectId || selectedId;
        const matched = mappedItems.find((m) => m.id === targetId) || mappedItems[0];
        if (matched) {
          applyItemToForm(matched, grouped);
        } else {
          resetToNewForm(mappedItems, mappedLok);
        }
      }
      return mappedItems;
    } catch (err: any) {
      showFeedback(`Gagal memuat Stock Opname: ${err.message}`);
      return [];
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const filteredOpnameList = useMemo(() => {
    if (!searchTerm.trim()) return opnameList;
    return opnameList.filter((item) => {
      if (searchField === 'No. Bukti') return matchesMultiKeyword([item.noBukti], searchTerm);
      if (searchField === 'Lokasi Stock') return matchesMultiKeyword([item.lokasiStock], searchTerm);
      if (searchField === 'Keterangan') return matchesMultiKeyword([item.keterangan], searchTerm);
      return matchesMultiKeyword(
        [item.noBukti, item.tanggal, item.lokasiStock, item.keterangan, item.stsPost],
        searchTerm
      );
    });
  }, [opnameList, searchField, searchTerm]);

  if (!isOpen) return null;

  const handleBaru = () => {
    resetToNewForm(opnameList, lokasiOptions);
    showFeedback('Form Stock Opname baru siap diisi');
  };

  const handleAddRow = () => {
    setDetailRows((prev) => [...prev, createEmptyDetailRow(prev.length)]);
  };

  const handleRemoveRow = (idx: number) => {
    setDetailRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const handleDetailChange = (idx: number, field: keyof StockOpnameDetailItem, val: any) => {
    setDetailRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const updated = { ...row, [field]: val };
        if (field === 'kode') {
          const cleanKode = String(val || '').trim().toUpperCase();
          updated.kode = cleanKode;
          const matched = barangOptions.find((b) => b.kode === cleanKode);
          if (matched) {
            updated.namaBarang = matched.namaBarang;
            updated.unit = matched.unit;
            updated.hpp = matched.cost;
            updated.stockSistem = matched.stock;
            updated.selisih = Number((updated.stockFisik - matched.stock).toFixed(2));
            updated.totalSelisih = Number((updated.selisih * updated.hpp).toFixed(2));
          }
        } else if (field === 'stockFisik' || field === 'stockSistem' || field === 'hpp') {
          const fisik = field === 'stockFisik' ? parseNum(val) : row.stockFisik;
          const sistem = field === 'stockSistem' ? parseNum(val) : row.stockSistem;
          const cost = field === 'hpp' ? parseNum(val) : row.hpp;
          updated.stockFisik = fisik;
          updated.stockSistem = sistem;
          updated.hpp = cost;
          updated.selisih = Number((fisik - sistem).toFixed(2));
          updated.totalSelisih = Number((updated.selisih * cost).toFixed(2));
        }
        return updated;
      })
    );
  };

  const handleSave = async () => {
    setModalError(null);
    if (!formNoBukti.trim()) {
      setModalError('No. Bukti Stock Opname wajib diisi.');
      return;
    }
    const validDetails = detailRows.filter((d) => d.kode.trim());
    if (validDetails.length === 0) {
      setModalError('Minimal pilih 1 kode barang pada detail Stock Opname.');
      return;
    }

    try {
      setIsBusy(true);
      const currentUser = (getCurrentUser().username || 'ADMIN').toUpperCase();
      const isoTgl = toIsoDate(formTanggal) || todayIso();

      const headerPayload: Record<string, any> = {
        no_bukti: formNoBukti.trim().toUpperCase(),
        tanggal: isoTgl,
        lokasi_stock: formLokasi.trim().toUpperCase() || '01 - OFFICE',
        keterangan: formKeterangan.trim(),
        sts_post: formStsPost || 'Posting',
        dibuat_oleh: currentUser,
        tgl_created: isoTgl,
        diupdate_oleh: currentUser,
        tgl_update: todayIso(),
      };
      if (editingId) {
        headerPayload.id = editingId;
      }

      const detailPayloads = validDetails.map((d, idx) => ({
        no_urut: idx + 1,
        kode: d.kode.trim().toUpperCase(),
        nama_barang: d.namaBarang.trim(),
        unit: d.unit.trim().toUpperCase() || 'PCS',
        stock_sistem: Number(d.stockSistem || 0),
        stock_fisik: Number(d.stockFisik || 0),
        selisih: Number((Number(d.stockFisik || 0) - Number(d.stockSistem || 0)).toFixed(2)),
        hpp: Number(d.hpp || 0),
        total_selisih: Number(
          ((Number(d.stockFisik || 0) - Number(d.stockSistem || 0)) * Number(d.hpp || 0)).toFixed(2)
        ),
        keterangan: d.keterangan.trim(),
      }));

      const res = await erpCompositeSave<{ header: any; details: any[] }>(
        'stock-opname',
        headerPayload,
        detailPayloads
      );
      const savedHeader = mapDbToItem(res.header);
      await loadData({ selectId: savedHeader.id });
      showFeedback(
        `Stock Opname [${savedHeader.noBukti}] tersimpan & stok Master Barang tersinkron`
      );
    } catch (err: any) {
      setModalError(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const requestDelete = () => {
    const item = opnameList.find((o) => o.id === selectedId);
    if (!item) {
      showFeedback('Pilih dokumen Stock Opname yang ingin dihapus');
      return;
    }
    setConfirmDeleteRow(item);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteRow) return;
    try {
      setIsBusy(true);
      await erpDelete('stock_opnames', confirmDeleteRow.id);
      setConfirmDeleteRow(null);
      await loadData({ keepNewMode: true });
      resetToNewForm(
        opnameList.filter((p) => p.id !== confirmDeleteRow.id),
        lokasiOptions
      );
      showFeedback(`Stock Opname [${confirmDeleteRow.noBukti}] dihapus & stok dikembalikan`);
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsBusy(true);
      const company = await fetchActiveCompanyProfile();
      const rowsToExport = detailRows
        .filter((d) => d.kode.trim())
        .map((d, idx) => ({
          no: idx + 1,
          noBukti: formNoBukti,
          tanggal: formTanggal,
          lokasi: formLokasi,
          kode: d.kode,
          namaBarang: d.namaBarang,
          unit: d.unit,
          stockSistem: d.stockSistem,
          stockFisik: d.stockFisik,
          selisih: d.selisih,
          hpp: d.hpp,
          totalSelisih: d.totalSelisih,
        }));
      exportToExcel({
        fileName: `Stock_Opname_${formNoBukti || 'BARU'}`,
        sheetTitle: `LAPORAN STOCK OPNAME [${formNoBukti}]`,
        subtitle: `Tanggal: ${formTanggal} | Lokasi: ${formLokasi} | Status: ${formStsPost}`,
        companyProfile: company,
        columns: [
          { header: 'No', accessor: 'no', align: 'center' },
          { header: 'Kode Barang', accessor: 'kode' },
          { header: 'Nama Barang', accessor: 'namaBarang' },
          { header: 'Sat', accessor: 'unit', align: 'center' },
          { header: 'Stok Sistem', accessor: 'stockSistem', align: 'right' },
          { header: 'Stok Fisik', accessor: 'stockFisik', align: 'right' },
          { header: 'Selisih', accessor: 'selisih', align: 'right' },
          { header: 'HPP', accessor: 'hpp', align: 'right' },
          { header: 'Total Selisih', accessor: 'totalSelisih', align: 'right' },
        ],
        rows: rowsToExport,
      });
      showFeedback('Export Excel Stock Opname selesai');
    } catch (err: any) {
      showFeedback(`Gagal export Excel: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const validDetailCount = detailRows.filter((d) => d.kode.trim()).length;
  const totalSelisihQty = detailRows.reduce((s, d) => s + Number(d.selisih || 0), 0);
  const totalSelisihNilai = detailRows.reduce((s, d) => s + Number(d.totalSelisih || 0), 0);

  const printColumns: PrintColumn<StockOpnameDetailItem>[] = [
    { header: 'No', accessor: (_, idx) => idx + 1, align: 'center', width: '32px' },
    { header: 'Kode Barang', accessor: (r) => r.kode, align: 'left', width: '90px' },
    { header: 'Nama Barang', accessor: (r) => r.namaBarang, align: 'left' },
    { header: 'Sat', accessor: (r) => r.unit, align: 'center', width: '48px' },
    { header: 'Stok Sistem', accessor: (r) => formatMoney(r.stockSistem), align: 'right', width: '75px' },
    { header: 'Stok Fisik', accessor: (r) => formatMoney(r.stockFisik), align: 'right', width: '75px' },
    { header: 'Selisih', accessor: (r) => formatMoney(r.selisih), align: 'right', width: '70px' },
    { header: 'HPP', accessor: (r) => formatMoney(r.hpp), align: 'right', width: '85px' },
    { header: 'Total Selisih', accessor: (r) => formatMoney(r.totalSelisih), align: 'right', width: '95px' },
  ];

  const printableDetails = detailRows.filter((d) => d.kode.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-2 font-sans select-none">
      <div className="w-[1040px] max-w-[98vw] max-h-[92vh] bg-[#ECE9D8] border-2 border-[#316AC5] rounded shadow-2xl flex flex-col overflow-hidden text-black">
        <FormHeaderBanner
          title="STOCK OPNAME & PENYESUAIAN STOK (KOREKSI FISIK)"
          onClose={onClose}
          onFind={() => setIsFindOpen(true)}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={() => loadData()}
          onExportExcel={handleExportExcel}
        />

        {/* Top Action & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#F1EFE2] border-b border-[#ACA899] text-xs">
          <FormActionButtons
            compact
            onSimpan={handleSave}
            onBaru={handleBaru}
            onKoreksi={handleSave}
            onHapus={requestDelete}
            onPrint={() => setIsPrintOpen(true)}
            onFind={() => setIsFindOpen(true)}
            isBusy={isBusy}
            feedback={feedback}
          />

          <ToolbarSearchControl
            compact
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onCari={() => {
              if (filteredOpnameList.length > 0) {
                applyItemToForm(filteredOpnameList[0]);
                showFeedback(`Ditemukan ${filteredOpnameList.length} dokumen Stock Opname`);
              } else {
                showFeedback('Dokumen Stock Opname tidak ditemukan');
              }
            }}
            onReset={() => {
              setSearchField('Semua');
              setSearchTerm('');
              loadData();
              showFeedback('Filter pencarian direset');
            }}
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'No. Bukti', label: 'No. Bukti' },
              { value: 'Lokasi Stock', label: 'Lokasi Stock' },
              { value: 'Keterangan', label: 'Keterangan' },
            ]}
            inputRef={searchInputRef}
            isBusy={isBusy}
          />
        </div>

        {modalError && (
          <div className="bg-red-100 border-l-4 border-red-600 text-red-800 px-3 py-1.5 text-xs font-semibold">
            {modalError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Header Daftar Dokumen Opname Tersimpan */}
          <div className="border border-[#7A7A7A] bg-white rounded overflow-hidden">
            <div className="bg-[#D4D0C8] px-2.5 py-1 border-b border-[#7A7A7A] flex items-center justify-between text-[11px] font-bold">
              <span>Daftar Dokumen Stock Opname ({filteredOpnameList.length} Transaksi)</span>
              <span className="font-normal text-gray-700">
                Mode: <b className="text-[#0A246A]">{editingId ? `KOREKSI [${formNoBukti}]` : 'BARU'}</b>
              </span>
            </div>
            <div className="max-h-[120px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#ACA899]">
                  <tr>
                    <th className="px-2 py-1 border-r border-[#C0C0C0] w-32">No. Bukti</th>
                    <th className="px-2 py-1 border-r border-[#C0C0C0] w-24 text-center">Tanggal</th>
                    <th className="px-2 py-1 border-r border-[#C0C0C0] w-40">Lokasi Stock</th>
                    <th className="px-2 py-1 border-r border-[#C0C0C0]">Keterangan</th>
                    <th className="px-2 py-1 border-r border-[#C0C0C0] w-24 text-center">Status</th>
                    <th className="px-2 py-1 w-24 text-center">Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpnameList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-3 text-gray-500 italic">
                        Belum ada dokumen Stock Opname. Isi form di bawah lalu klik Simpan.
                      </td>
                    </tr>
                  ) : (
                    filteredOpnameList.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => applyItemToForm(item)}
                        className={`cursor-pointer border-b border-[#E5E5E5] hover:bg-[#EAF2FC] ${
                          selectedId === item.id ? 'bg-[#FFFF99] font-semibold' : ''
                        }`}
                      >
                        <td className="px-2 py-1 border-r border-[#E5E5E5] font-mono">{item.noBukti}</td>
                        <td className="px-2 py-1 border-r border-[#E5E5E5] text-center font-mono">
                          {item.tanggal}
                        </td>
                        <td className="px-2 py-1 border-r border-[#E5E5E5]">{item.lokasiStock}</td>
                        <td className="px-2 py-1 border-r border-[#E5E5E5] whitespace-pre-line align-top max-w-[260px]">
                          {item.keterangan || '-'}
                        </td>
                        <td className="px-2 py-1 border-r border-[#E5E5E5] text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold ${
                              item.stsPost.toUpperCase() === 'POSTING'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {item.stsPost}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-center font-mono">{item.dibuatOleh}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Input Header Form */}
          <div className="grid grid-cols-2 gap-4 bg-[#F1EFE2] p-3 border border-[#C0C0C0] rounded">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-700 shrink-0 w-28">No. Bukti:</label>
                <input
                  type="text"
                  value={formNoBukti}
                  onChange={(e) => setFormNoBukti(e.target.value.toUpperCase())}
                  className="flex-1 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase font-mono font-bold"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-700 shrink-0 w-28">Tanggal:</label>
                <DatePickerInput
                  value={formTanggal}
                  onChange={setFormTanggal}
                  format="dmy"
                  inputClassName="w-full px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs font-mono"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-700 shrink-0 w-28">Lokasi Stock:</label>
                <select
                  value={formLokasi}
                  onChange={(e) => setFormLokasi(e.target.value)}
                  className="flex-1 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase cursor-pointer"
                >
                  {lokasiOptions.length > 0 ? (
                    lokasiOptions.map((lok, idx) => (
                      <option key={`${lok}-${idx}`} value={lok}>
                        {lok}
                      </option>
                    ))
                  ) : (
                    <option value="01 - OFFICE">01 - OFFICE</option>
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-700 shrink-0 w-28">Status Post:</label>
                <select
                  value={formStsPost}
                  onChange={(e) => setFormStsPost(e.target.value)}
                  className="flex-1 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase cursor-pointer font-bold text-blue-700"
                >
                  <option value="Posting">Posting (Update Stok Otomatis)</option>
                  <option value="Draft">Draft (Belum Update Stok)</option>
                </select>
              </div>
              <div className="flex items-start justify-between gap-2">
                <label className="text-xs font-bold text-gray-700 shrink-0 w-28 pt-1">Keterangan:</label>
                <textarea
                  rows={3}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Contoh:&#10;1. Stock Opname Bulanan&#10;2. Koreksi Fisik Gudang"
                  className="flex-1 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs resize-y leading-snug"
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-gray-700">
                <span>Total Selisih Qty: <b className="font-mono">{formatMoney(totalSelisihQty)}</b></span>
                <span>Nilai Selisih: <b className="font-mono text-[#0A246A]">{formatRupiah(totalSelisihNilai)}</b></span>
              </div>
            </div>
          </div>

          {/* Detail Grid */}
          <div className="border border-[#7A7A7A] bg-white rounded flex flex-col overflow-hidden">
            <div className="bg-[#D4D0C8] px-3 py-1.5 border-b border-[#7A7A7A] flex justify-between items-center text-xs font-bold">
              <span>Detail Hasil Stock Opname & Penyesuaian ({validDetailCount} Item)</span>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-2.5 py-0.5 bg-[#316AC5] text-white rounded text-[11px] font-bold hover:bg-blue-700 cursor-pointer"
              >
                + Tambah Baris
              </button>
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#ECE9D8] text-gray-800 border-b border-[#7A7A7A] sticky top-0 text-[11px]">
                    <th className="p-1 border-r border-[#C0C0C0] text-center w-9">No</th>
                    <th className="p-1 border-r border-[#C0C0C0] w-44">Kode Barang</th>
                    <th className="p-1 border-r border-[#C0C0C0]">Nama Barang</th>
                    <th className="p-1 border-r border-[#C0C0C0] text-center w-14">Sat</th>
                    <th className="p-1 border-r border-[#C0C0C0] text-right w-24">Stok Sistem</th>
                    <th className="p-1 border-r border-[#C0C0C0] text-right w-24">Stok Fisik</th>
                    <th className="p-1 border-r border-[#C0C0C0] text-right w-20">Selisih</th>
                    <th className="p-1 border-r border-[#C0C0C0] text-right w-24">HPP</th>
                    <th className="p-1 border-r border-[#C0C0C0] text-right w-28">Total Selisih</th>
                    <th className="p-1 border-r border-[#C0C0C0] w-32">Alasan / Ket</th>
                    <th className="p-1 text-center w-14">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((d, idx) => {
                    const kodeChoices = Array.from(
                      new Set([...barangOptions.map((b) => b.kode), d.kode].filter(Boolean))
                    );
                    return (
                      <tr
                        key={d.id ? `${d.id}-${idx}` : `row-${idx}`}
                        className="border-b border-[#E5E5E5] text-[11px]"
                      >
                        <td className="p-1 border-r border-[#E5E5E5] text-center">{idx + 1}</td>
                        <td className="p-1 border-r border-[#E5E5E5]">
                          <select
                            value={d.kode}
                            onChange={(e) => handleDetailChange(idx, 'kode', e.target.value)}
                            className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded text-[11px] uppercase cursor-pointer font-mono"
                          >
                            <option value="">-- Pilih Kode --</option>
                            {kodeChoices.map((kc, kIdx) => {
                              const bo = barangOptions.find((b) => b.kode === kc);
                              return (
                                <option key={`${kc}-${kIdx}`} value={kc}>
                                  {bo ? `${kc} - ${bo.namaBarang}` : kc}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td className="p-1 border-r border-[#E5E5E5] truncate max-w-[180px]">
                          {d.namaBarang}
                        </td>
                        <td className="p-1 border-r border-[#E5E5E5] text-center">{d.unit}</td>
                        <td className="p-1 border-r border-[#E5E5E5] text-right font-mono text-gray-700 bg-[#F7F6F0]">
                          {formatMoney(d.stockSistem)}
                        </td>
                        <td className="p-1 border-r border-[#E5E5E5] text-right">
                          <input
                            type="number"
                            value={d.stockFisik}
                            onChange={(e) => handleDetailChange(idx, 'stockFisik', e.target.value)}
                            className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded text-right font-mono text-[11px]"
                          />
                        </td>
                        <td
                          className={`p-1 border-r border-[#E5E5E5] text-right font-mono font-bold ${
                            d.selisih < 0
                              ? 'text-red-600'
                              : d.selisih > 0
                              ? 'text-blue-600'
                              : 'text-gray-700'
                          }`}
                        >
                          {d.selisih > 0 ? `+${formatMoney(d.selisih)}` : formatMoney(d.selisih)}
                        </td>
                        <td className="p-1 border-r border-[#E5E5E5] text-right font-mono">
                          {formatMoney(d.hpp)}
                        </td>
                        <td className="p-1 border-r border-[#E5E5E5] text-right font-mono font-bold">
                          {formatMoney(d.totalSelisih)}
                        </td>
                        <td className="p-1 border-r border-[#E5E5E5] align-top">
                          <textarea
                            rows={2}
                            value={d.keterangan}
                            onChange={(e) => handleDetailChange(idx, 'keterangan', e.target.value)}
                            placeholder="Alasan / keterangan selisih..."
                            className="w-full px-1 py-0.5 bg-white border border-[#C0C0C0] rounded text-[11px] resize-y leading-snug"
                          />
                        </td>
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] hover:bg-red-200 cursor-pointer font-bold"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="px-3 py-1.5 bg-[#ECE9D8] border-t border-[#ACA899] flex items-center justify-between text-[11px]">
          <span className="text-gray-700">
            Catatan: Stok Sistem diambil otomatis dari Master Barang. Selisih (Stok Fisik - Stok Sistem) otomatis menyesuaikan stok Master Barang saat Status = <b>Posting</b>.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Stock Opname"
        rows={opnameList}
        columns={[
          { header: 'No. Bukti', accessor: (r) => r.noBukti, widthClass: 'w-32', mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal, widthClass: 'w-24', align: 'center', mono: true },
          { header: 'Lokasi', accessor: (r) => r.lokasiStock, widthClass: 'w-36' },
          { header: 'Keterangan', accessor: (r) => r.keterangan || '-' },
          { header: 'Status', accessor: (r) => r.stsPost, widthClass: 'w-24', align: 'center' },
        ]}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [r.noBukti, r.tanggal, r.lokasiStock, r.keterangan, r.stsPost]}
        selectedId={selectedId}
        onSelectRow={(row) => applyItemToForm(row)}
        onRefreshSupabase={() => loadData({ keepNewMode: true })}
        isBusy={isBusy}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteRow)}
        title="Konfirmasi Hapus Stock Opname"
        message={`Yakin ingin menghapus Stock Opname [${confirmDeleteRow?.noBukti}]?`}
        detail="Jika dokumen berstatus Posting, penyesuaian stok pada Master Barang akan otomatis dikembalikan."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isBusy={isBusy}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteRow(null)}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN STOCK OPNAME & PENYESUAIAN STOK"
        subtitle={`No. Bukti: ${formNoBukti} | Status: ${formStsPost}`}
        orientation="landscape"
        metaLines={[
          { label: 'No. Bukti', value: formNoBukti },
          { label: 'Tanggal', value: formTanggal },
          { label: 'Lokasi Stock', value: formLokasi },
          { label: 'Keterangan', value: formKeterangan || '-' },
        ]}
        columns={printColumns}
        rows={printableDetails}
        summaryItems={[
          { label: 'Total Item Opname', value: `${printableDetails.length} Item` },
          { label: 'Total Selisih Qty', value: formatMoney(totalSelisihQty) },
          { label: 'Total Selisih Nilai', value: formatRupiah(totalSelisihNilai) },
        ]}
      />
    </div>
  );
};
