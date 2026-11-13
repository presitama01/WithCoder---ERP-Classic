import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
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
  todayIso,
  toDisplayDmy,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

export interface HppPembelianItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaSupplier: string;
  noPo: string;
  noFakturPembelian: string;
  keterangan: string;
  nilaiPembelian: number;
  jthTmp: string;
  stsLunas: string;
  tglLunas: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diUpdateOleh: string;
  tglUpdate: string;
}

interface ListHppPembelianFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ListHppPembelianForm: React.FC<ListHppPembelianFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [hppList, setHppList] = useState<HppPembelianItem[]>([]);
  const [supplierCatalog, setSupplierCatalog] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [tanggalFilter, setTanggalFilter] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Supplier');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [yellowNote, setYellowNote] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  // Add/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNoBukti, setFormNoBukti] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(toDisplayDMyShort(todayIso()));
  const [formNamaSupplier, setFormNamaSupplier] = useState<string>('');
  const [formNoPo, setFormNoPo] = useState<string>('');
  const [formNoFaktur, setFormNoFaktur] = useState<string>('');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formNilaiPembelian, setFormNilaiPembelian] = useState<string>('0');
  const [formJthTmp, setFormJthTmp] = useState<string>(toDisplayDMyShort(todayIso()));
  const [formStsLunas, setFormStsLunas] = useState<string>('Not Yet');
  const [formStsPost, setFormStsPost] = useState<string>('Not Yet');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const mapRow = (r: any): HppPembelianItem => ({
    id: String(r.id),
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaSupplier: r.nama_supplier || '',
    noPo: r.no_po || '',
    noFakturPembelian: r.no_faktur_pembelian || '',
    keterangan: r.keterangan || '',
    nilaiPembelian: Number(r.nilai_pembelian || 0),
    jthTmp: toDisplayDMyShort(r.jth_tmp),
    stsLunas: r.sts_lunas || 'Not Yet',
    tglLunas: toDisplayDMyShort(r.tgl_lunas),
    stsPost: r.sts_post || 'Not Yet',
    tglPost: toDisplayDMyShort(r.tgl_post),
    dibuatOleh: r.dibuat_oleh || 'RETNO',
    tglCreated: toDisplayDMyShort(r.tgl_created || r.created_at),
    diUpdateOleh: r.diupdate_oleh || '',
    tglUpdate: toDisplayDMyShort(r.tgl_update),
  });

  const loadData = async () => {
    try {
      setIsBusy(true);
      const [rows, suppliers] = await Promise.all([
        erpList<any>('hpp_pembelians', { orderBy: 'tanggal', asc: false }),
        erpList<any>('master_suppliers', { orderBy: 'nama_supplier', asc: true }).catch(() => []),
      ]);
      const mapped = rows.map(mapRow);
      setHppList(mapped);
      setSupplierCatalog(suppliers.map((s) => s.nama_supplier || '').filter(Boolean));
      if (mapped.length > 0 && !mapped.some((m) => m.id === selectedId)) {
        setSelectedId(mapped[0].id);
      }
    } catch (err: any) {
      showFeedback(`Gagal memuat HPP Pembelian: ${err.message}`);
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
    setModalError(null);
    setFormNoBukti(nextUniqueCode(hppList.map((h) => h.noBukti), '2608-LKL-', 3));
    const todayDmy = toDisplayDMyShort(todayIso());
    setFormTanggal(todayDmy);
    setFormNamaSupplier('');
    setFormNoPo('');
    setFormNoFaktur('');
    setFormKeterangan('');
    setFormNilaiPembelian('0');
    setFormJthTmp(todayDmy);
    setFormStsLunas('Not Yet');
    setFormStsPost('Not Yet');
    setIsModalOpen(true);
  };

  const handleKoreksi = () => {
    const current = hppList.find((item) => item.id === selectedId);
    if (!current) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setEditingId(current.id);
    setModalError(null);
    setFormNoBukti(current.noBukti);
    setFormTanggal(current.tanggal || toDisplayDMyShort(todayIso()));
    setFormNamaSupplier(current.namaSupplier);
    setFormNoPo(current.noPo);
    setFormNoFaktur(current.noFakturPembelian);
    setFormKeterangan(current.keterangan);
    setFormNilaiPembelian(String(current.nilaiPembelian));
    setFormJthTmp(current.jthTmp || toDisplayDMyShort(todayIso()));
    setFormStsLunas(current.stsLunas || 'Not Yet');
    setFormStsPost(current.stsPost || 'Not Yet');
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formNoBukti.trim() || !formNamaSupplier.trim()) {
      setModalError('No.Bukti dan Nama Supplier wajib diisi.');
      return;
    }
    const tglIso = toIsoDate(formTanggal) || todayIso();
    const jthIso = toIsoDate(formJthTmp) || tglIso;
    const nilaiNum = parseNum(formNilaiPembelian);

    const payload: Record<string, any> = {
      no_bukti: formNoBukti.trim().toUpperCase(),
      tanggal: tglIso,
      nama_supplier: formNamaSupplier.trim().toUpperCase(),
      no_po: formNoPo.trim().toUpperCase(),
      no_faktur_pembelian: formNoFaktur.trim().toUpperCase(),
      keterangan: formKeterangan.trim(),
      nilai_pembelian: nilaiNum,
      jth_tmp: jthIso,
      sts_lunas: formStsLunas,
      tgl_lunas: formStsLunas === 'Lunas' ? todayIso() : null,
      sts_post: formStsPost,
      tgl_post: formStsPost === 'Posted' ? todayIso() : null,
    };

    try {
      setIsBusy(true);
      if (editingId) {
        const updated = await erpUpdate<any>('hpp_pembelians', editingId, {
          ...payload,
          diupdate_oleh: 'RETNO',
          tgl_update: todayIso(),
        });
        const mapped = mapRow(updated);
        setHppList((prev) => prev.map((it) => (it.id === editingId ? mapped : it)));
        setSelectedId(mapped.id);
        showFeedback('Data HPP Pembelian diperbarui');
      } else {
        const created = await erpCreate<any>('hpp_pembelians', {
          ...payload,
          dibuat_oleh: 'RETNO',
          tgl_created: tglIso,
        });
        const mapped = mapRow(created);
        setHppList((prev) => [mapped, ...prev]);
        setSelectedId(mapped.id);
        showFeedback('Data HPP Pembelian tersimpan');
      }
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan data HPP Pembelian';
      setModalError(msg);
      showFeedback(`Gagal menyimpan: ${msg}`);
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
      await erpDelete('hpp_pembelians', confirmDeleteId);
      const updated = hppList.filter((item) => item.id !== confirmDeleteId);
      setHppList(updated);
      setSelectedId(updated[0]?.id || '');
      setConfirmDeleteId(null);
      showFeedback('Data HPP Pembelian dihapus');
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
    new Set(hppList.map((item) => item.tanggal).filter(Boolean))
  );

  const filteredList = hppList.filter((item) => {
    const matchesTanggal =
      !tanggalFilter.trim() ||
      item.tanggal.toLowerCase() === tanggalFilter.trim().toLowerCase();

    if (!matchesTanggal) return false;
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    if (searchField === 'No.Bukti') {
      return item.noBukti.toLowerCase().includes(term);
    } else if (searchField === 'No. PO') {
      return item.noPo.toLowerCase().includes(term);
    } else if (searchField === 'No.Faktur Pembelian') {
      return item.noFakturPembelian.toLowerCase().includes(term);
    } else if (searchField === 'Keterangan') {
      return item.keterangan.toLowerCase().includes(term);
    }
    return item.namaSupplier.toLowerCase().includes(term);
  });

  const totalNilai = filteredList.reduce((sum, item) => sum + item.nilaiPembelian, 0);

  const handleExportExcel = async () => {
    try {
      setIsBusy(true);
      const company = await fetchActiveCompanyProfile();
      exportToExcel({
        fileName: 'List_HPP_Pembelian',
        sheetTitle: 'LIST HPP PEMBELIAN',
        subtitle: `Filter Tanggal: ${tanggalFilter || 'Semua'} | Record: ${filteredList.length}`,
        companyProfile: company,
        columns: [
          { header: 'No.Bukti', accessor: 'noBukti' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
          { header: 'Nama Supplier', accessor: 'namaSupplier' },
          { header: 'No. PO', accessor: 'noPo' },
          { header: 'No.Faktur Pembelian', accessor: 'noFakturPembelian' },
          { header: 'Keterangan', accessor: 'keterangan' },
          { header: 'Nilai Pembelian', accessor: 'nilaiPembelian', align: 'right' },
          { header: 'Jth.Tmp', accessor: 'jthTmp', align: 'center' },
          { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center' },
          { header: 'Sts.Post', accessor: 'stsPost', align: 'center' },
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

  const printColumns: PrintColumn<HppPembelianItem>[] = [
    { header: 'No.Bukti', accessor: 'noBukti', width: '95px' },
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '75px' },
    { header: 'Nama Supplier', accessor: 'namaSupplier' },
    { header: 'No. PO', accessor: 'noPo', width: '95px' },
    { header: 'No.Faktur', accessor: 'noFakturPembelian', width: '95px' },
    { header: 'Nilai Pembelian', accessor: (r) => formatMoney(r.nilaiPembelian), align: 'right', width: '100px' },
    { header: 'Lunas', accessor: 'stsLunas', align: 'center', width: '55px' },
    { header: 'Post', accessor: 'stsPost', align: 'center', width: '55px' },
  ];

  return (
    <div
      id="list-hpp-pembelian-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List HPP Pembelian"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadData}
          onExportExcel={handleExportExcel}
        />

        {/* Sub-toolbar */}
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto">
          <div className="flex items-center space-x-3">
            <FormActionButtons
              onSimpan={() => (selectedId ? handleKoreksi() : handleBaru())}
              onBaru={handleBaru}
              onKoreksi={handleKoreksi}
              onHapus={requestDelete}
              onPrint={() => setIsPrintOpen(true)}
              onFind={handleFind}
              isBusy={isBusy}
              feedback={feedback}
            />

            <div className="flex items-center space-x-1.5 pl-2">
              <span className="font-bold text-black text-[11px]">Tanggal :</span>
              <select
                value={tanggalFilter}
                onChange={(e) => setTanggalFilter(e.target.value)}
                className="w-[90px] h-[22px] px-1 bg-white border border-[#7A7A7A] text-[11px] outline-none cursor-pointer"
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
                onClick={() => setTanggalFilter('')}
                className="px-3 h-[22px] bg-[#EAE6D9] hover:bg-[#F4F1E8] border border-[#7A7A7A] shadow-2xs text-[11px] text-black cursor-pointer"
              >
                Semua
              </button>
            </div>
          </div>

          <div className="font-bold text-[15px] text-black pr-6 tabular-nums">
            {formatRupiah(totalNilai)}
          </div>
        </div>

        {/* Main Data Grid */}
        <div className="flex-1 overflow-auto bg-[#F0F0F0] border border-[#808080] m-1.5 relative shadow-inner">
          <table className="w-full border-collapse text-left min-w-[1460px] text-[11px]">
            <thead className="sticky top-0 bg-[#ECE9D8] text-black font-normal border-b border-[#ACA899] z-10">
              <tr>
                <th className="w-[22px] px-1 py-1 border-r border-[#ACA899] text-center bg-[#ECE9D8]" />
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[105px]">No.Bukti</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[85px]">Tanggal</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[170px]">Nama Supplier</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[110px]">No. PO</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[135px]">No.Faktur Pembelian</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[180px]">Keterangan</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal text-right whitespace-nowrap w-[105px]">Nilai Pembelian</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">Jth.Tmp</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[75px]">Sts.Lunas</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">Tgl.Lunas</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[70px]">Sts.Post</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">Tgl.Post</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">Dibuat Oleh</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">Tgl.Created</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[90px]">DiUpdate Oleh</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">Tgl.Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={17} className="text-center py-8 text-gray-500 italic bg-white">
                    Tidak ada data HPP Pembelian Barang
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
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.namaSupplier}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.noPo}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.noFakturPembelian}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.keterangan}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 text-right whitespace-nowrap tabular-nums">
                        {formatMoney(item.nilaiPembelian, true)}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.jthTmp}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.stsLunas}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.tglLunas}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.stsPost}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.tglPost}</td>
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
              <option value="Nama Supplier">Nama Supplier</option>
              <option value="No.Bukti">No.Bukti</option>
              <option value="No. PO">No. PO</option>
              <option value="No.Faktur Pembelian">No.Faktur Pembelian</option>
              <option value="Keterangan">Keterangan</option>
            </select>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik untuk mencari..."
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

        {/* Add / Edit Modal Dialog */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[490px] overflow-hidden">
              <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
                <span>{editingId ? 'Koreksi HPP Pembelian' : 'Tambah HPP Pembelian Baru'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsModalOpen(false);
                  }}
                  className="w-[16px] h-[16px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form noValidate onSubmit={handleSaveModal} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">No.Bukti:</label>
                  <input
                    type="text"
                    value={formNoBukti}
                    onChange={(e) => setFormNoBukti(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">Tanggal:</label>
                  <DatePickerInput
                    value={formTanggal}
                    onChange={(formatted) => setFormTanggal(formatted)}
                    format="dMyShort"
                    inputClassName="w-[270px] h-[25px] px-2 bg-white border border-[#7A7A7A] text-xs outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">Nama Supplier:</label>
                  <input
                    type="text"
                    list="hpp-supplier-list"
                    value={formNamaSupplier}
                    onChange={(e) => setFormNamaSupplier(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                  <datalist id="hpp-supplier-list">
                    {supplierCatalog.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">No. PO:</label>
                  <input
                    type="text"
                    value={formNoPo}
                    onChange={(e) => setFormNoPo(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">No.Faktur Pembelian:</label>
                  <input
                    type="text"
                    value={formNoFaktur}
                    onChange={(e) => setFormNoFaktur(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">Keterangan:</label>
                  <input
                    type="text"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">Nilai Pembelian (Rp):</label>
                  <input
                    type="text"
                    value={formNilaiPembelian}
                    onChange={(e) => setFormNilaiPembelian(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs text-right font-mono"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">Jth.Tmp:</label>
                  <DatePickerInput
                    value={formJthTmp}
                    onChange={(formatted) => setFormJthTmp(formatted)}
                    format="dMyShort"
                    inputClassName="w-[270px] h-[25px] px-2 bg-white border border-[#7A7A7A] text-xs outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">Sts.Lunas / Sts.Post:</label>
                  <div className="w-72 flex space-x-2">
                    <select
                      value={formStsLunas}
                      onChange={(e) => setFormStsLunas(e.target.value)}
                      className="flex-1 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                    >
                      <option value="Not Yet">Not Yet</option>
                      <option value="Lunas">Lunas</option>
                    </select>
                    <select
                      value={formStsPost}
                      onChange={(e) => setFormStsPost(e.target.value)}
                      className="flex-1 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                    >
                      <option value="Not Yet">Not Yet</option>
                      <option value="Posted">Posted</option>
                    </select>
                  </div>
                </div>
                {modalError && (
                  <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                    ⚠ {modalError}
                  </div>
                )}
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                  <button
                    type="button"
                    onClick={() => {
                      setModalError(null);
                      setIsModalOpen(false);
                    }}
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
                Konfirmasi Hapus HPP Pembelian
              </div>
              <div className="p-4 text-xs text-black space-y-3">
                <p>Yakin ingin menghapus data HPP Pembelian terpilih dari Supabase?</p>
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
          title="LAPORAN LIST HPP PEMBELIAN"
          subtitle={`Filter Tanggal: ${tanggalFilter || 'Semua Tanggal'}`}
          orientation="landscape"
          metaLines={[
            { label: 'Filter Tanggal', value: tanggalFilter || 'Semua Tanggal' },
            { label: 'Pencarian', value: searchTerm ? `${searchField}: ${searchTerm}` : 'Semua Data' },
            { label: 'Jumlah Record', value: `${filteredList.length} Dokumen` },
          ]}
          columns={printColumns}
          rows={filteredList}
          summaryItems={[
            { label: 'Total Dokumen', value: `${filteredList.length} Dokumen` },
            { label: 'Total Nilai HPP Pembelian', value: formatRupiah(totalNilai) },
          ]}
        />
      </div>
    </div>
  );
};
