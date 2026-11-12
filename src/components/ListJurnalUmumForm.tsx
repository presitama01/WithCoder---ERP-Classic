import React, { useEffect, useRef, useState } from 'react';
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
  formatRupiah,
  parseNum,
  todayIso,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

export interface JurnalDetailLine {
  id?: string;
  kode_akun: string;
  nama_akun: string;
  debet: number;
  kredit: number;
  keterangan: string;
}

export interface JurnalUmumItem {
  id: string;
  noBukti: string;
  tanggal: string;
  kategori: string;
  keterangan: string;
  saldoDebet: number;
  stsPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diUpdateOleh: string;
  tglUpdate: string;
}

interface ListJurnalUmumFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ListJurnalUmumForm: React.FC<ListJurnalUmumFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [jurnalList, setJurnalList] = useState<JurnalUmumItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<'jurnal_umum' | 'posting'>('jurnal_umum');
  const [kategoriFilter, setKategoriFilter] = useState<string>('SEMUA-nya');
  const [tanggalFilter, setTanggalFilter] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Keterangan');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [yellowNote, setYellowNote] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  // Add / Edit Modal state (with composite journal lines!)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNoBukti, setFormNoBukti] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(toDisplayDMyShort(todayIso()));
  const [formKategori, setFormKategori] = useState<string>('Jurnal Umum');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formSaldoDebet, setFormSaldoDebet] = useState<string>('0');
  const [formStsPost, setFormStsPost] = useState<string>('Not Yet');
  const [detailLines, setDetailLines] = useState<JurnalDetailLine[]>([]);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const mapRow = (r: any): JurnalUmumItem => ({
    id: String(r.id),
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    kategori: r.kategori || 'Jurnal Umum',
    keterangan: r.keterangan || '',
    saldoDebet: Number(r.saldo_debet || 0),
    stsPost: r.sts_post || 'Not Yet',
    dibuatOleh: r.dibuat_oleh || 'RETNO',
    tglCreated: toDisplayDMyShort(r.tgl_created || r.created_at),
    diUpdateOleh: r.diupdate_oleh || '',
    tglUpdate: toDisplayDMyShort(r.tgl_update),
  });

  const loadData = async () => {
    try {
      setIsBusy(true);
      const rows = await erpList<any>('jurnal_umums', { orderBy: 'tanggal', asc: false });
      const mapped = rows.map(mapRow);
      setJurnalList(mapped);
      if (mapped.length > 0 && !mapped.some((m) => m.id === selectedId)) {
        setSelectedId(mapped[0].id);
      }
    } catch (err: any) {
      showFeedback(`Gagal memuat Jurnal Umum: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBaru = () => {
    setEditingId(null);
    const nextNum = String(jurnalList.length + 1).padStart(3, '0');
    setFormNoBukti(`2608-JU-${nextNum}`);
    setFormTanggal(toDisplayDMyShort(todayIso()));
    setFormKategori(kategoriFilter !== 'SEMUA-nya' ? kategoriFilter : 'Jurnal Umum');
    setFormKeterangan('');
    setFormSaldoDebet('0');
    setFormStsPost('Not Yet');
    setDetailLines([
      { kode_akun: '1101', nama_akun: 'Kas / Bank', debet: 0, kredit: 0, keterangan: '' },
      { kode_akun: '4101', nama_akun: 'Pendapatan / Biaya', debet: 0, kredit: 0, keterangan: '' },
    ]);
    setIsModalOpen(true);
  };

  const handleKoreksi = async () => {
    const current = jurnalList.find((item) => item.id === selectedId);
    if (!current) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setEditingId(current.id);
    setFormNoBukti(current.noBukti);
    setFormTanggal(current.tanggal || toDisplayDMyShort(todayIso()));
    setFormKategori(current.kategori || 'Jurnal Umum');
    setFormKeterangan(current.keterangan);
    setFormSaldoDebet(String(current.saldoDebet));
    setFormStsPost(current.stsPost);
    setIsModalOpen(true);

    try {
      const dets = await erpList<any>('jurnal_umum_details', {
        eq: { jurnal_id: current.id },
        orderBy: 'created_at',
        asc: true,
      });
      setDetailLines(
        dets.map((d) => ({
          id: d.id,
          kode_akun: d.kode_akun || '',
          nama_akun: d.nama_akun || '',
          debet: Number(d.debet || 0),
          kredit: Number(d.kredit || 0),
          keterangan: d.keterangan || '',
        }))
      );
    } catch {
      setDetailLines([]);
    }
  };

  const totalLineDebet = detailLines.reduce((s, d) => s + Number(d.debet || 0), 0);
  const totalLineKredit = detailLines.reduce((s, d) => s + Number(d.kredit || 0), 0);

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNoBukti.trim()) return;
    const tglIso = toIsoDate(formTanggal) || todayIso();
    const numericSaldo =
      totalLineDebet > 0 ? totalLineDebet : parseNum(formSaldoDebet);

    const headerPayload: Record<string, any> = {
      ...(editingId ? { id: editingId } : {}),
      no_bukti: formNoBukti.trim().toUpperCase(),
      tanggal: tglIso,
      kategori: formKategori,
      keterangan: formKeterangan.trim(),
      saldo_debet: numericSaldo,
      sts_post: formStsPost,
      ...(editingId
        ? { diupdate_oleh: 'RETNO', tgl_update: todayIso() }
        : { dibuat_oleh: 'RETNO', tgl_created: tglIso }),
    };

    const validDetails = detailLines
      .filter((d) => d.kode_akun.trim() || d.nama_akun.trim() || d.debet > 0 || d.kredit > 0)
      .map((d) => ({
        kode_akun: d.kode_akun.trim().toUpperCase(),
        nama_akun: d.nama_akun.trim(),
        debet: Number(d.debet || 0),
        kredit: Number(d.kredit || 0),
        keterangan: d.keterangan.trim(),
      }));

    try {
      setIsBusy(true);
      const saved = await erpCompositeSave<{ header: any }>(
        'jurnal-umum',
        headerPayload,
        validDetails
      );
      const mapped = mapRow(saved.header);
      if (editingId) {
        setJurnalList((prev) => prev.map((it) => (it.id === editingId ? mapped : it)));
        showFeedback('Jurnal Umum diperbarui');
      } else {
        setJurnalList((prev) => [mapped, ...prev]);
        showFeedback('Jurnal Umum ditambahkan');
      }
      setSelectedId(mapped.id);
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err: any) {
      showFeedback(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const requestDelete = () => {
    if (!selectedId) {
      showFeedback('Pilih baris yang akan dihapus');
      return;
    }
    setConfirmDeleteId(selectedId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setIsBusy(true);
      await erpDelete('jurnal_umums', confirmDeleteId);
      const updated = jurnalList.filter((item) => item.id !== confirmDeleteId);
      setJurnalList(updated);
      setSelectedId(updated[0]?.id || '');
      setConfirmDeleteId(null);
      showFeedback('Data Jurnal Umum dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
    showFeedback('Ketik kata kunci pencarian di bawah');
  };

  const uniqueTanggalOptions = Array.from(
    new Set(jurnalList.map((item) => item.tanggal).filter(Boolean))
  );

  const filteredList = jurnalList.filter((item) => {
    if (modeFilter === 'posting' && item.stsPost !== 'Posted') return false;
    if (
      kategoriFilter !== 'SEMUA-nya' &&
      item.kategori.toLowerCase() !== kategoriFilter.toLowerCase()
    ) {
      return false;
    }
    if (
      tanggalFilter.trim() &&
      item.tanggal.toLowerCase() !== tanggalFilter.trim().toLowerCase()
    ) {
      return false;
    }
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    if (searchField === 'No.Bukti') {
      return item.noBukti.toLowerCase().includes(term);
    } else if (searchField === 'Sts.Post') {
      return item.stsPost.toLowerCase().includes(term);
    } else if (searchField === 'Dibuat Oleh') {
      return item.dibuatOleh.toLowerCase().includes(term);
    }
    return (
      item.keterangan.toLowerCase().includes(term) ||
      item.noBukti.toLowerCase().includes(term)
    );
  });

  const totalSaldoDebet = filteredList.reduce(
    (sum, item) => sum + item.saldoDebet,
    0
  );

  const handleExportExcel = async () => {
    try {
      setIsBusy(true);
      const company = await fetchActiveCompanyProfile();
      exportToExcel({
        fileName: 'List_Jurnal_Umum',
        sheetTitle: 'LIST JURNAL UMUM',
        subtitle: `Kategori: ${kategoriFilter} | Mode: ${modeFilter === 'posting' ? 'Posting' : 'Jurnal Umum'}`,
        companyProfile: company,
        columns: [
          { header: 'No.Bukti', accessor: 'noBukti' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
          { header: 'Kategori', accessor: 'kategori' },
          { header: 'Keterangan', accessor: 'keterangan' },
          { header: 'Saldo Debet', accessor: 'saldoDebet', align: 'right' },
          { header: 'Sts.Post', accessor: 'stsPost', align: 'center' },
          { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
        ],
        rows: filteredList,
      });
      showFeedback('Export Excel selesai');
    } catch (err: any) {
      showFeedback(`Gagal export: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const printColumns: PrintColumn<JurnalUmumItem>[] = [
    { header: 'No.Bukti', accessor: 'noBukti', width: '95px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '75px' },
    { header: 'Kategori', accessor: 'kategori', width: '95px' },
    { header: 'Keterangan', accessor: 'keterangan' },
    { header: 'Saldo Debet', accessor: (r) => formatMoney(r.saldoDebet), align: 'right', width: '105px' },
    { header: 'Sts.Post', accessor: 'stsPost', align: 'center', width: '65px' },
    { header: 'Dibuat', accessor: 'dibuatOleh', width: '70px' },
  ];

  return (
    <div
      id="list-jurnal-umum-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Jurnal Umum"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadData}
          onExportExcel={handleExportExcel}
        />

        {/* Sub-toolbar */}
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto gap-3">
          <div className="flex items-center space-x-3 shrink-0">
            <FormActionButtons
              compact
              onSimpan={() => (selectedId ? handleKoreksi() : handleBaru())}
              onBaru={handleBaru}
              onKoreksi={handleKoreksi}
              onHapus={requestDelete}
              onPrint={() => setIsPrintOpen(true)}
              onFind={handleFind}
              isBusy={isBusy}
              feedback={feedback}
            />

            <div className="flex flex-col justify-center space-y-0.5 pl-1 pr-2">
              <label className="flex items-center space-x-1.5 text-[11px] text-black cursor-pointer">
                <input
                  type="radio"
                  name="jurnal_umum_mode"
                  checked={modeFilter === 'jurnal_umum'}
                  onChange={() => setModeFilter('jurnal_umum')}
                  className="cursor-pointer"
                />
                <span>Jurnal Umum</span>
              </label>
              <label className="flex items-center space-x-1.5 text-[11px] text-black cursor-pointer">
                <input
                  type="radio"
                  name="jurnal_umum_mode"
                  checked={modeFilter === 'posting'}
                  onChange={() => setModeFilter('posting')}
                  className="cursor-pointer"
                />
                <span>Posting</span>
              </label>
            </div>

            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="w-[180px] h-[22px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] text-black outline-none cursor-pointer"
            >
              <option value="SEMUA-nya">SEMUA-nya</option>
              <option value="Jurnal Umum">Jurnal Umum</option>
              <option value="Kas Masuk">Kas Masuk</option>
              <option value="Kas Keluar">Kas Keluar</option>
              <option value="Bank Masuk">Bank Masuk</option>
              <option value="Bank Keluar">Bank Keluar</option>
            </select>

            <div className="flex items-center space-x-1.5 pl-1">
              <span className="font-bold text-black text-[11px]">Tanggal :</span>
              <select
                value={tanggalFilter}
                onChange={(e) => setTanggalFilter(e.target.value)}
                className="w-[88px] h-[22px] px-1 bg-white border border-[#7A7A7A] text-[11px] outline-none cursor-pointer"
              >
                <option value="">-- Semua --</option>
                {uniqueTanggalOptions.map((tgl) => (
                  <option key={tgl} value={tgl}>
                    {tgl}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setTanggalFilter('');
                  setKategoriFilter('SEMUA-nya');
                }}
                className="px-3 h-[22px] bg-[#EAE6D9] hover:bg-[#F4F1E8] border border-[#7A7A7A] shadow-2xs text-[11px] text-black cursor-pointer"
              >
                Semua
              </button>
            </div>
          </div>

          <div className="font-bold text-[15px] text-black pr-4 shrink-0 tabular-nums">
            {formatRupiah(totalSaldoDebet)}
          </div>
        </div>

        {/* Main Data Grid */}
        <div className="flex-1 overflow-auto bg-[#F0F0F0] border border-[#808080] m-1.5 relative shadow-inner">
          <table className="w-full border-collapse text-left min-w-[1060px] text-[11px]">
            <thead className="sticky top-0 bg-[#ECE9D8] text-black font-normal border-b border-[#ACA899] z-10">
              <tr>
                <th className="w-[22px] px-1 py-1 border-r border-[#ACA899] text-center bg-[#ECE9D8]" />
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[105px]">No.Bukti</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[85px]">Tanggal</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[100px]">Kategori</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[280px]">Keterangan</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal text-right whitespace-nowrap w-[95px]">Saldo Debet</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[65px]">Sts.Post</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">Dibuat Oleh</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">Tgl.Created</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[90px]">DiUpdate Oleh</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">Tgl.Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500 italic bg-white">
                    Belum ada data Jurnal Umum. Klik "+ Baru" untuk membuat jurnal.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handleKoreksi}
                      className={`cursor-pointer border-b border-[#D4D0C8] ${
                        isSelected ? 'bg-[#00FF00] text-black' : 'bg-white text-black hover:bg-[#EAF2FC]'
                      }`}
                    >
                      <td className="px-1 py-0.5 border-r border-[#ACA899] bg-[#ECE9D8] text-center text-[10px] font-bold text-black">
                        {isSelected ? '▸' : ''}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.noBukti}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.tanggal}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.kategori}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.keterangan}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 text-right whitespace-nowrap tabular-nums">
                        {formatMoney(item.saldoDebet)}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.stsPost}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.dibuatOleh}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.tglCreated}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.diUpdateOleh}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.tglUpdate}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Footer & Search Bar */}
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-4 py-2 border-t border-[#C0C0C0] gap-3 overflow-x-auto">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="font-bold text-black text-[11px]">Search :</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-[22px] px-2 bg-[#ECE9D8] border border-[#7A7A7A] shadow-xs text-[11px] text-black outline-none cursor-pointer"
            >
              <option value="Keterangan">Keterangan</option>
              <option value="No.Bukti">No.Bukti</option>
              <option value="Sts.Post">Sts.Post</option>
              <option value="Dibuat Oleh">Dibuat Oleh</option>
            </select>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik kata kunci pencarian..."
              className="w-[260px] h-[22px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] outline-none"
            />
          </div>

          <div className="flex items-center space-x-6 shrink-0">
            <input
              type="text"
              value={yellowNote}
              onChange={(e) => setYellowNote(e.target.value)}
              placeholder="Catatan..."
              className="w-[260px] h-[22px] px-1.5 bg-[#FFFF99] border border-[#7A7A7A] text-[11px] outline-none"
            />
            <div className="text-[11px] text-black flex items-center space-x-4 pr-4">
              <span>Record</span>
              <span className="font-semibold">{filteredList.length}</span>
            </div>
          </div>
        </div>

        {/* Add / Edit Composite Journal Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[720px] max-h-[90vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
                <span>{editingId ? 'Koreksi Jurnal Umum' : 'Tambah Jurnal Umum Baru'}</span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-[16px] h-[16px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveModal} className="p-4 flex flex-col space-y-3 overflow-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-black">No.Bukti:</label>
                    <input
                      type="text"
                      value={formNoBukti}
                      onChange={(e) => setFormNoBukti(e.target.value)}
                      required
                      className="w-48 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-black">Tanggal:</label>
                    <DatePickerInput
                      value={formTanggal}
                      onChange={(formatted) => setFormTanggal(formatted)}
                      format="dMyShort"
                      inputClassName="w-[174px] h-[25px] px-2 bg-white border border-[#7A7A7A] text-xs outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-black">Kategori:</label>
                    <select
                      value={formKategori}
                      onChange={(e) => setFormKategori(e.target.value)}
                      className="w-48 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                    >
                      <option value="Jurnal Umum">Jurnal Umum</option>
                      <option value="Kas Masuk">Kas Masuk</option>
                      <option value="Kas Keluar">Kas Keluar</option>
                      <option value="Bank Masuk">Bank Masuk</option>
                      <option value="Bank Keluar">Bank Keluar</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-black">Sts.Post:</label>
                    <select
                      value={formStsPost}
                      onChange={(e) => setFormStsPost(e.target.value)}
                      className="w-48 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                    >
                      <option value="Not Yet">Not Yet</option>
                      <option value="Posted">Posted</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black w-28">Keterangan:</label>
                  <input
                    type="text"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    required
                    className="flex-1 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black w-28">Saldo Debet (Manual jika tanpa rincian):</label>
                  <input
                    type="text"
                    value={totalLineDebet > 0 ? String(totalLineDebet) : formSaldoDebet}
                    onChange={(e) => setFormSaldoDebet(e.target.value)}
                    disabled={totalLineDebet > 0}
                    className="w-48 px-2 py-1 bg-white border border-[#7A7A7A] text-xs text-right font-mono disabled:bg-[#F3F2F1]"
                  />
                </div>

                {/* Composite Detail Akun Debet / Kredit */}
                <div className="border border-[#ACA899] bg-white p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-black">
                      Rincian Baris Akun Jurnal (Debet / Kredit)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDetailLines((prev) => [
                          ...prev,
                          { kode_akun: '', nama_akun: '', debet: 0, kredit: 0, keterangan: '' },
                        ])
                      }
                      className="px-2 py-0.5 bg-[#ECE9D8] border border-[#7A7A7A] text-[10px] font-bold cursor-pointer"
                    >
                      + Tambah Baris Akun
                    </button>
                  </div>

                  <table className="w-full border-collapse border border-[#D4D0C8] text-[11px]">
                    <thead className="bg-[#ECE9D8]">
                      <tr>
                        <th className="border border-[#B5B3A8] px-1.5 py-0.5 text-left w-20">Kode Akun</th>
                        <th className="border border-[#B5B3A8] px-1.5 py-0.5 text-left">Nama Akun</th>
                        <th className="border border-[#B5B3A8] px-1.5 py-0.5 text-right w-24">Debet</th>
                        <th className="border border-[#B5B3A8] px-1.5 py-0.5 text-right w-24">Kredit</th>
                        <th className="border border-[#B5B3A8] px-1.5 py-0.5 text-left w-32">Keterangan</th>
                        <th className="border border-[#B5B3A8] px-1 py-0.5 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {detailLines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="border border-[#E0DED5] p-0.5">
                            <input
                              type="text"
                              value={line.kode_akun}
                              onChange={(e) =>
                                setDetailLines((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, kode_akun: e.target.value } : l))
                                )
                              }
                              className="w-full px-1 py-0.5 bg-white outline-none font-mono"
                            />
                          </td>
                          <td className="border border-[#E0DED5] p-0.5">
                            <input
                              type="text"
                              value={line.nama_akun}
                              onChange={(e) =>
                                setDetailLines((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, nama_akun: e.target.value } : l))
                                )
                              }
                              className="w-full px-1 py-0.5 bg-white outline-none"
                            />
                          </td>
                          <td className="border border-[#E0DED5] p-0.5">
                            <input
                              type="number"
                              value={line.debet}
                              onChange={(e) =>
                                setDetailLines((prev) =>
                                  prev.map((l, i) =>
                                    i === idx ? { ...l, debet: Number(e.target.value || 0) } : l
                                  )
                                )
                              }
                              className="w-full px-1 py-0.5 bg-white outline-none text-right font-mono"
                            />
                          </td>
                          <td className="border border-[#E0DED5] p-0.5">
                            <input
                              type="number"
                              value={line.kredit}
                              onChange={(e) =>
                                setDetailLines((prev) =>
                                  prev.map((l, i) =>
                                    i === idx ? { ...l, kredit: Number(e.target.value || 0) } : l
                                  )
                                )
                              }
                              className="w-full px-1 py-0.5 bg-white outline-none text-right font-mono"
                            />
                          </td>
                          <td className="border border-[#E0DED5] p-0.5">
                            <input
                              type="text"
                              value={line.keterangan}
                              onChange={(e) =>
                                setDetailLines((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, keterangan: e.target.value } : l))
                                )
                              }
                              className="w-full px-1 py-0.5 bg-white outline-none"
                            />
                          </td>
                          <td className="border border-[#E0DED5] text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setDetailLines((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-red-700 font-bold cursor-pointer px-1"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-end space-x-6 text-[11px] font-bold pt-1">
                    <span>Total Debet: {formatRupiah(totalLineDebet)}</span>
                    <span>Total Kredit: {formatRupiah(totalLineKredit)}</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs hover:bg-[#F3F2F1] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="px-3 py-1 bg-[#0A246A] text-white border border-black text-xs hover:bg-[#163994] cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-xl w-[360px] overflow-hidden">
              <div className="bg-[#0A246A] text-white px-3 py-1.5 font-bold text-xs">
                Konfirmasi Hapus Jurnal Umum
              </div>
              <div className="p-4 text-xs text-black space-y-3">
                <p>Yakin ingin menghapus Jurnal Umum terpilih beserta rinciannya dari Supabase?</p>
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={confirmDelete}
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
          title="LAPORAN LIST JURNAL UMUM"
          subtitle={`Kategori: ${kategoriFilter} | Mode: ${modeFilter === 'posting' ? 'Posting' : 'Semua'}`}
          orientation="landscape"
          metaLines={[
            { label: 'Kategori', value: kategoriFilter },
            { label: 'Filter Tanggal', value: tanggalFilter || 'Semua Tanggal' },
            { label: 'Mode', value: modeFilter === 'posting' ? 'Posting' : 'Jurnal Umum' },
            { label: 'Jumlah Dokumen', value: `${filteredList.length} Jurnal` },
          ]}
          columns={printColumns}
          rows={filteredList}
          summaryItems={[
            { label: 'Total Jurnal', value: `${filteredList.length} Dokumen` },
            { label: 'Total Saldo Debet', value: formatRupiah(totalSaldoDebet) },
          ]}
        />
      </div>
    </div>
  );
};
