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
  formatRupiah,
  nextUniqueCode,
  parseNum,
  toDisplayDMyShort,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

export interface ReturPembelianItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaSupplier: string;
  nilaiRetur: string;
  nilaiReturNum: number;
  keterangan: string;
  mataUang: string;
  disc: string;
  ppn: string;
  stsPrint: string;
  tglPrint: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListReturPembelianFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToReturPembelian(r: any): ReturPembelianItem {
  const valNum = Number(r.nilai_retur || 0);
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaSupplier: r.nama_supplier || '',
    nilaiRetur: formatMoney(valNum),
    nilaiReturNum: valNum,
    keterangan: r.keterangan || '',
    mataUang: r.mata_uang || 'IDR',
    disc: `${Number(r.disc || 0)}%`,
    ppn: `${Number(r.ppn || 0)}%`,
    stsPrint: r.sts_print || 'Not Yet',
    tglPrint: toDisplayDMyShort(r.tgl_print) || '-',
    stsPost: r.sts_post || 'Posted',
    tglPost: toDisplayDMyShort(r.tgl_post) || '-',
    dibuatOleh: r.dibuat_oleh || 'RETNO',
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

export const ListReturPembelianForm: React.FC<ListReturPembelianFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [returList, setReturList] = useState<ReturPembelianItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Supplier');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newSupplier, setNewSupplier] = useState<string>('');
  const [newNilaiRetur, setNewNilaiRetur] = useState<string>('0');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newMataUang, setNewMataUang] = useState<string>('IDR');
  const [newDisc, setNewDisc] = useState<string>('0');
  const [newPpn, setNewPpn] = useState<string>('11');

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

  const loadData = async (): Promise<boolean> => {
    try {
      setIsBusy(true);
      const rows = await erpList<any>('retur_pembelians', { orderBy: 'tanggal', asc: false });
      const mapped = rows.map(mapDbToReturPembelian);
      setReturList(mapped);
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

  const handleAddNew = () => {
    setEditingId(null);
    setModalError(null);
    setNewNoBukti(nextUniqueCode(returList.map((r) => r.noBukti), '2608-RP-IMP-', 3));
    setNewTanggal(toDisplayDMyShort(todayIso()));
    setNewSupplier('');
    setNewNilaiRetur('0');
    setNewKeterangan('');
    setNewMataUang('IDR');
    setNewDisc('0');
    setNewPpn('11');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = returList.find((r) => r.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal);
    setNewSupplier(item.namaSupplier);
    setNewNilaiRetur(String(item.nilaiReturNum));
    setNewKeterangan(item.keterangan);
    setNewMataUang(item.mataUang);
    setNewDisc(String(parseNum(item.disc)));
    setNewPpn(String(parseNum(item.ppn)));
    setIsAddOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoBukti.trim() || !newSupplier.trim()) {
      setModalError('No. Bukti Retur dan Nama Supplier wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const tglIso = toIsoDate(newTanggal) || todayIso();
      const payload = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_supplier: newSupplier.trim().toUpperCase(),
        nilai_retur: parseNum(newNilaiRetur),
        keterangan: newKeterangan.trim(),
        mata_uang: newMataUang.trim().toUpperCase(),
        disc: parseNum(newDisc),
        ppn: parseNum(newPpn),
      };

      if (editingId) {
        const saved = await erpUpdate<any>('retur_pembelians', editingId, {
          ...payload,
          diupdate_oleh: 'RETNO',
          tgl_update: todayIso(),
        });
        const mapped = mapDbToReturPembelian(saved);
        setReturList(returList.map((r) => (r.id === editingId ? mapped : r)));
        showFeedback('Retur Pembelian diperbarui');
      } else {
        const saved = await erpCreate<any>('retur_pembelians', {
          ...payload,
          sts_print: 'Not Yet',
          sts_post: 'Posted',
          tgl_post: tglIso,
          dibuat_oleh: 'RETNO',
          tgl_created: todayIso(),
          diupdate_oleh: '-',
        });
        const mapped = mapDbToReturPembelian(saved);
        setReturList([mapped, ...returList]);
        setSelectedId(mapped.id);
        showFeedback('Retur Pembelian tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Retur Pembelian';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('retur_pembelians', id);
      const updated = returList.filter((item) => item.id !== id);
      setReturList(updated);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Retur Pembelian dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = returList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'No.Bukti') return item.noBukti.toLowerCase().includes(term);
    if (searchField === 'Nama Supplier') return item.namaSupplier.toLowerCase().includes(term);
    if (searchField === 'Keterangan') return item.keterangan.toLowerCase().includes(term);
    return (
      item.noBukti.toLowerCase().includes(term) ||
      item.namaSupplier.toLowerCase().includes(term) ||
      item.keterangan.toLowerCase().includes(term)
    );
  });

  const totalNilaiRetur = filteredList.reduce((acc, r) => acc + r.nilaiReturNum, 0);

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Retur_Pembelian',
      sheetTitle: 'LIST RETUR PEMBELIAN BARANG',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Supplier', accessor: 'namaSupplier' },
        { header: 'Nilai Retur', accessor: 'nilaiReturNum', align: 'right' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Mata Uang', accessor: 'mataUang', align: 'center' },
        { header: 'PPN', accessor: 'ppn', align: 'center' },
        { header: 'Sts.Post', accessor: 'stsPost', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  return (
    <div
      id="list-retur-pembelian-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Retur Pembelian Barang"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadData}
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
                format="dMyShort"
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

          <div className="font-bold text-sm text-gray-900 pr-2">{formatRupiah(totalNilaiRetur)}</div>
        </div>

        <div className="flex-1 overflow-auto bg-white border border-[#7F9DB9] m-2 shadow-inner relative">
          <table className="w-full border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#EBE9ED] text-black font-semibold sticky top-0 z-10 border-b border-[#919B9C] select-none">
                <th className="px-2 py-1.5 text-center border-r border-[#C0C0C0] w-[45px]">No</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[130px]">No.Bukti</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tanggal</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[190px]">Nama Supplier</th>
                <th className="px-2.5 py-1.5 text-right border-r border-[#C0C0C0] min-w-[100px]">Nilai Retur</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[200px]">Keterangan</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[70px]">Mata Uang</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[60px]">Disc</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[60px]">PPN</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[80px]">Sts.Print</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Print</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[80px]">Sts.Post</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Post</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[100px]">Dibuat Oleh</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Created</th>
                <th className="px-2.5 py-1.5 text-left border-r border-[#C0C0C0] min-w-[110px]">DiUpdate Oleh</th>
                <th className="px-2.5 py-1.5 text-center border-r border-[#C0C0C0] min-w-[95px]">Tgl.Update</th>
                <th className="px-2 py-1.5 text-center min-w-[70px]">Aksi</th>
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
                    className={`cursor-pointer border-b border-[#E0E0E0] ${
                      isSelected
                        ? 'bg-[#316AC5] text-white'
                        : index % 2 === 0
                        ? 'bg-white hover:bg-[#F0F4F8]'
                        : 'bg-[#F9F9F8] hover:bg-[#F0F4F8]'
                    }`}
                  >
                    <td className="px-2 py-1 text-center border-r border-[#E0E0E0] font-mono">{index + 1}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-mono font-medium">{item.noBukti}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tanggal}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0] font-medium">{item.namaSupplier}</td>
                    <td className="px-2.5 py-1 text-right border-r border-[#E0E0E0] font-mono">{item.nilaiRetur}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">{item.keterangan}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.mataUang}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.disc}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.ppn}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          item.stsPrint === 'Printed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.stsPrint}
                      </span>
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglPrint}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800">
                        {item.stsPost}
                      </span>
                    </td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglPost}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">{item.dibuatOleh}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglCreated}</td>
                    <td className="px-2.5 py-1 border-r border-[#E0E0E0]">{item.diupdateOleh}</td>
                    <td className="px-2.5 py-1 text-center border-r border-[#E0E0E0]">{item.tglUpdate}</td>
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={18} className="text-center py-8 text-gray-500 italic">
                    Tidak ada data Retur Pembelian yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-t border-[#C0C0C0]">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-800">Cari Berdasarkan:</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="px-1.5 py-0.5 bg-white border border-[#7F9DB9] rounded-[2px] text-black"
            >
              <option>Nama Supplier</option>
              <option>No.Bukti</option>
              <option>Keterangan</option>
            </select>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik kata kunci..."
              className="w-[180px] px-2 py-0.5 bg-white border border-[#7F9DB9] rounded-[2px] text-black"
            />
          </div>

          <div className="flex items-center space-x-4 text-gray-700">
            <span>Record: {filteredList.length} of {returList.length}</span>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[480px] bg-[#ECE9D8] border-2 border-[#0055EA] rounded-[3px] shadow-[4px_4px_12px_rgba(0,0,0,0.4)] flex flex-col font-sans text-xs">
            <div className="flex items-center justify-between h-[28px] bg-gradient-to-r from-[#0055EA] to-[#1E90FF] text-white px-2 font-bold">
              <span>{editingId ? 'Koreksi Retur Pembelian Barang' : 'Form Input Retur Pembelian Barang'}</span>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsAddOpen(false);
                }}
                className="w-[20px] h-[20px] bg-[#C75050] hover:bg-red-600 text-white rounded-[2px] flex items-center justify-center text-[11px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3 bg-[#ECE9D8]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-800 mb-1">No. Bukti Retur:</label>
                  <input
                    type="text"
                    value={newNoBukti}
                    onChange={(e) => setNewNoBukti(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-800 mb-1">Tanggal:</label>
                  <DatePickerInput
                    value={newTanggal}
                    onChange={(formatted) => setNewTanggal(formatted)}
                    format="dMyShort"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-800 mb-1">Nama Supplier:</label>
                <input
                  type="text"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-gray-800 mb-1">Nilai Retur:</label>
                  <input
                    type="number"
                    value={newNilaiRetur}
                    onChange={(e) => setNewNilaiRetur(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px] font-mono text-right"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-800 mb-1">Mata Uang:</label>
                  <select
                    value={newMataUang}
                    onChange={(e) => setNewMataUang(e.target.value)}
                    className="w-full px-1 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                  >
                    <option value="IDR">IDR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-800 mb-1">Disc (%) / PPN (%):</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={newDisc}
                      onChange={(e) => setNewDisc(e.target.value)}
                      className="w-1/2 px-1 py-1 bg-white border border-[#7F9DB9] rounded-[2px] text-center"
                    />
                    <input
                      type="number"
                      value={newPpn}
                      onChange={(e) => setNewPpn(e.target.value)}
                      className="w-1/2 px-1 py-1 bg-white border border-[#7F9DB9] rounded-[2px] text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-800 mb-1">Keterangan:</label>
                <textarea
                  value={newKeterangan}
                  onChange={(e) => setNewKeterangan(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded-[2px]"
                  placeholder="Catatan atau keterangan retur..."
                />
              </div>

              {modalError && (
                <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                  ⚠ {modalError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#D4D0C8]">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1.5 bg-[#E1DFDD] hover:bg-[#F3F2F1] active:bg-[#C8C6C4] border border-[#ADABA1] text-black font-semibold rounded-[2px] shadow-xs cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="px-4 py-1.5 bg-[#E1DFDD] hover:bg-[#F3F2F1] active:bg-[#C8C6C4] border border-[#ADABA1] text-black rounded-[2px] shadow-xs cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN RETUR PEMBELIAN BARANG"
        subtitle={`Filter Tanggal: ${tanggalFilter}`}
        orientation="landscape"
        columns={[
          { header: 'No.Bukti', accessor: 'noBukti', width: '115px' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '85px' },
          { header: 'Nama Supplier', accessor: 'namaSupplier' },
          { header: 'Nilai Retur', accessor: 'nilaiRetur', align: 'right', width: '100px' },
          { header: 'Mata Uang', accessor: 'mataUang', align: 'center', width: '65px' },
          { header: 'Keterangan', accessor: 'keterangan' },
          { header: 'Sts.Post', accessor: 'stsPost', align: 'center', width: '70px' },
        ]}
        rows={filteredList}
        summaryItems={[
          { label: 'Total Record', value: `${filteredList.length} Transaksi` },
          { label: 'Total Nilai Retur', value: formatRupiah(totalNilaiRetur) },
        ]}
      />
    </div>
  );
};
