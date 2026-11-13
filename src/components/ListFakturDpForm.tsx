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

export interface FakturDpItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaCustomer: string;
  noSo: string;
  poNo: string;
  noSj: string;
  noFakturPajak: string;
  sales: string;
  jthTmp: string;
  keterangan: string;
  ppn: string;
  nilaiPenjualan: string;
  nilaiPenjualanNum: number;
  stsLunas: string;
  tglLunas: string;
  stsPrint: string;
  tglPrint: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diUpdateOleh: string;
  tglUpdate: string;
}

interface ListFakturDpFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToFakturDp(r: any): FakturDpItem {
  const nilaiNum = Number(r.nilai_penjualan || 0);
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaCustomer: r.nama_customer || '',
    noSo: r.no_so || '',
    poNo: r.po_no || '',
    noSj: r.no_sj || '',
    noFakturPajak: r.no_faktur_pajak || '',
    sales: r.sales || '',
    jthTmp: toDisplayDMyShort(r.jth_tmp),
    keterangan: r.keterangan || '',
    ppn: `${Number(r.ppn ?? 10)}.`,
    nilaiPenjualan: formatMoney(nilaiNum, true),
    nilaiPenjualanNum: nilaiNum,
    stsLunas: r.sts_lunas || 'Not Yet',
    tglLunas: toDisplayDMyShort(r.tgl_lunas) || '',
    stsPrint: r.sts_print || 'Not Yet',
    tglPrint: toDisplayDMyShort(r.tgl_print) || '',
    stsPost: r.sts_post || 'Not Yet',
    tglPost: toDisplayDMyShort(r.tgl_post) || '',
    dibuatOleh: r.dibuat_oleh || 'RETNO',
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diUpdateOleh: r.diupdate_oleh || '',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '',
  };
}

export const ListFakturDpForm: React.FC<ListFakturDpFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [fakturDpList, setFakturDpList] = useState<FakturDpItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [tanggalFilter, setTanggalFilter] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [yellowNote, setYellowNote] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newNoSo, setNewNoSo] = useState<string>('');
  const [newPoNo, setNewPoNo] = useState<string>('');
  const [newNoSj, setNewNoSj] = useState<string>('');
  const [newNoFakturPajak, setNewNoFakturPajak] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('01');
  const [newJthTmp, setNewJthTmp] = useState<string>('');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newPpn, setNewPpn] = useState<string>('11');
  const [newNilaiPenjualan, setNewNilaiPenjualan] = useState<string>('0');

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadData = async (): Promise<boolean> => {
    try {
      setIsBusy(true);
      const rows = await erpList<any>('faktur_penjualans', {
        eq: { jenis_faktur: 'DP' },
        orderBy: 'tanggal',
        asc: false,
      });
      const mapped = rows.map(mapDbToFakturDp);
      setFakturDpList(mapped);
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

  const handleBaru = () => {
    setEditingId(null);
    setModalError(null);
    const todayDisp = toDisplayDMyShort(todayIso());
    setNewNoBukti(nextUniqueCode(fakturDpList.map((f) => f.noBukti), 'INV-DP-', 4));
    setNewTanggal(todayDisp);
    setNewCustomer('');
    setNewNoSo('');
    setNewPoNo('');
    setNewNoSj('');
    setNewNoFakturPajak('');
    setNewSales('01');
    setNewJthTmp(todayDisp);
    setNewKeterangan('');
    setNewPpn('11');
    setNewNilaiPenjualan('0');
    setIsAddOpen(true);
  };

  const handleKoreksi = () => {
    const item = fakturDpList.find((f) => f.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal);
    setNewCustomer(item.namaCustomer);
    setNewNoSo(item.noSo);
    setNewPoNo(item.poNo);
    setNewNoSj(item.noSj);
    setNewNoFakturPajak(item.noFakturPajak);
    setNewSales(item.sales);
    setNewJthTmp(item.jthTmp);
    setNewKeterangan(item.keterangan);
    setNewPpn(String(parseNum(item.ppn)));
    setNewNilaiPenjualan(String(item.nilaiPenjualanNum));
    setIsAddOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoBukti.trim() || !newCustomer.trim()) {
      setModalError('No.Bukti dan Nama Customer wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const payload = {
        jenis_faktur: 'DP',
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: toIsoDate(newTanggal) || todayIso(),
        nama_customer: newCustomer.trim().toUpperCase(),
        no_so: newNoSo.trim().toUpperCase(),
        po_no: newPoNo.trim().toUpperCase(),
        no_sj: newNoSj.trim().toUpperCase(),
        no_faktur_pajak: newNoFakturPajak.trim(),
        sales: newSales.trim().toUpperCase(),
        jth_tmp: toIsoDate(newJthTmp) || toIsoDate(newTanggal) || todayIso(),
        keterangan: newKeterangan.trim(),
        ppn: parseNum(newPpn),
        nilai_penjualan: parseNum(newNilaiPenjualan),
      };

      if (editingId) {
        const saved = await erpUpdate<any>('faktur_penjualans', editingId, {
          ...payload,
          diupdate_oleh: 'RETNO',
          tgl_update: todayIso(),
        });
        const mapped = mapDbToFakturDp(saved);
        setFakturDpList((prev) => prev.map((item) => (item.id === editingId ? mapped : item)));
        showFeedback('Faktur DP diperbarui');
      } else {
        const saved = await erpCreate<any>('faktur_penjualans', {
          ...payload,
          sts_lunas: 'Not Yet',
          sts_print: 'Not Yet',
          sts_post: 'Not Yet',
          dibuat_oleh: 'RETNO',
          tgl_created: todayIso(),
        });
        const mapped = mapDbToFakturDp(saved);
        setFakturDpList((prev) => [mapped, ...prev]);
        setSelectedId(mapped.id);
        showFeedback('Faktur DP ditambahkan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Faktur DP';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleHapus = async () => {
    if (!selectedId) {
      showFeedback('Pilih baris yang akan dihapus');
      return;
    }
    try {
      setIsBusy(true);
      await erpDelete('faktur_penjualans', selectedId);
      const updated = fakturDpList.filter((item) => item.id !== selectedId);
      setFakturDpList(updated);
      setSelectedId(updated[0]?.id || '');
      showFeedback('Data Faktur DP dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const uniqueTanggalOptions = Array.from(
    new Set(fakturDpList.map((item) => item.tanggal).filter(Boolean))
  );

  const filteredList = fakturDpList.filter((item) => {
    const matchesTanggal =
      !tanggalFilter.trim() ||
      item.tanggal.toLowerCase() === tanggalFilter.trim().toLowerCase();

    if (!matchesTanggal) return false;
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    if (searchField === 'No.Bukti') return item.noBukti.toLowerCase().includes(term);
    if (searchField === 'No.SO') return item.noSo.toLowerCase().includes(term);
    if (searchField === 'PO.No') return item.poNo.toLowerCase().includes(term);
    if (searchField === 'No.Faktur Pajak') return item.noFakturPajak.toLowerCase().includes(term);
    if (searchField === 'Keterangan') return item.keterangan.toLowerCase().includes(term);
    return item.namaCustomer.toLowerCase().includes(term);
  });

  const totalNilai = filteredList.reduce((acc, f) => acc + f.nilaiPenjualanNum, 0);

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Faktur_DP',
      sheetTitle: 'LIST FAKTUR DP',
      subtitle: `Filter Tanggal: ${tanggalFilter || 'Semua'}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'No.SO', accessor: 'noSo' },
        { header: 'PO.No', accessor: 'poNo' },
        { header: 'Sales', accessor: 'sales', align: 'center' },
        { header: 'Jth.Tmp', accessor: 'jthTmp', align: 'center' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Nilai Penjualan', accessor: 'nilaiPenjualanNum', align: 'right' },
        { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  return (
    <div
      id="list-faktur-dp-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Faktur DP"
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
              onBaru={handleBaru}
              onKoreksi={handleKoreksi}
              onHapus={handleHapus}
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
                className="w-[94px] h-[22px] px-1 bg-white border border-[#7A7A7A] text-[11px] outline-none cursor-pointer"
              >
                <option value=""></option>
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

          <div className="font-bold text-[15px] text-black pr-6">{formatRupiah(totalNilai)}</div>
        </div>

        <div className="flex-1 overflow-auto bg-[#F0F0F0] border border-[#808080] m-1.5 relative shadow-inner">
          <table className="border-collapse text-left whitespace-nowrap min-w-[1920px] text-[11px]">
            <thead className="sticky top-0 bg-[#ECE9D8] text-black font-normal z-10">
              <tr className="bg-[#ECE9D8] border-b border-[#ACA899]">
                <th
                  colSpan={23}
                  className="px-2 py-0.5 text-center font-normal text-[11px] border-r border-[#ACA899]"
                >
                  List
                </th>
              </tr>
              <tr className="bg-[#ECE9D8] border-b border-[#ACA899]">
                <th className="w-[22px] px-1 py-0.5 border-r border-[#ACA899] text-center font-normal" />
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">No.Bukti</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tanggal</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Nama Customer</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">No.SO</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">PO.No</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[130px]">No.SJ</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">No.Faktur Pajak</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Sales</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Jth.Tmp</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Keterangan</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal text-center">PPN</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal text-right">Nilai Penjualan</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Sts.Lunas</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tgl.Lunas</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Sts.Print</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tgl.Print</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Sts.Post</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tgl.Post</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Dibuat Oleh</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tgl.Created</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">DiUpdate Oleh</th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal">Tgl.Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={23} className="text-center py-8 text-gray-500 italic bg-white">
                    Tidak ada data Faktur DP
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
                      className={`cursor-pointer border-b border-[#00B800] text-black ${
                        isSelected ? 'bg-[#00FF00] font-medium' : 'bg-[#00FF00] hover:bg-[#33FF33]'
                      }`}
                    >
                      <td className="px-1 py-0.5 border-r border-[#ACA899] bg-[#ECE9D8] text-center text-[10px] font-bold text-black">
                        {isSelected ? '▸' : ''}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.noBukti}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tanggal}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.namaCustomer}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.noSo}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.poNo}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.noSj}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.noFakturPajak}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.sales}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.jthTmp}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.keterangan}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800] text-right">{item.ppn}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800] text-right">{item.nilaiPenjualan}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.stsLunas}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tglLunas}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.stsPrint}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tglPrint}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.stsPost}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tglPost}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.dibuatOleh}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tglCreated}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.diUpdateOleh}</td>
                      <td className="px-2 py-0.5 border-r border-[#00B800]">{item.tglUpdate}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-4 py-2 border-t border-[#C0C0C0] gap-3 overflow-x-auto">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="font-bold text-black text-[11px]">Search :</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-[22px] px-2 bg-[#ECE9D8] border border-[#7A7A7A] shadow-xs text-[11px] text-black outline-none cursor-pointer"
            >
              <option value="Nama Pelanggan">Nama Pelanggan</option>
              <option value="No.Bukti">No.Bukti</option>
              <option value="No.SO">No.SO</option>
              <option value="PO.No">PO.No</option>
              <option value="No.Faktur Pajak">No.Faktur Pajak</option>
              <option value="Keterangan">Keterangan</option>
            </select>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[260px] h-[22px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] outline-none"
            />
          </div>

          <div className="flex items-center space-x-6 shrink-0">
            <input
              type="text"
              value={yellowNote || fakturDpList.find((r) => r.id === selectedId)?.namaCustomer || ''}
              onChange={(e) => setYellowNote(e.target.value)}
              className="w-[260px] h-[22px] px-1.5 bg-[#FFFF99] border border-[#7A7A7A] text-[11px] outline-none"
            />
            <div className="text-[11px] text-black flex items-center space-x-4 pr-4">
              <span>Record</span>
              <span className="font-semibold">{filteredList.length}</span>
            </div>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-[#ECE9D8] border-2 border-[#0A246A] shadow-2xl w-[480px] overflow-hidden">
              <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
                <span>{editingId ? 'Koreksi Faktur DP' : 'Tambah Faktur DP Baru'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="w-[16px] h-[16px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">No.Bukti:</label>
                  <input
                    type="text"
                    value={newNoBukti}
                    onChange={(e) => setNewNoBukti(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">Tanggal:</label>
                  <div className="w-72">
                    <DatePickerInput
                      value={newTanggal}
                      onChange={(formatted) => setNewTanggal(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">Nama Customer:</label>
                  <input
                    type="text"
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">No.SO:</label>
                  <input
                    type="text"
                    value={newNoSo}
                    onChange={(e) => setNewNoSo(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">PO.No:</label>
                  <input
                    type="text"
                    value={newPoNo}
                    onChange={(e) => setNewPoNo(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">No.Faktur Pajak:</label>
                  <input
                    type="text"
                    value={newNoFakturPajak}
                    onChange={(e) => setNewNoFakturPajak(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">Sales / PPN (%):</label>
                  <div className="w-72 flex gap-2">
                    <input
                      type="text"
                      value={newSales}
                      onChange={(e) => setNewSales(e.target.value)}
                      className="w-2/3 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                    />
                    <input
                      type="number"
                      value={newPpn}
                      onChange={(e) => setNewPpn(e.target.value)}
                      className="w-1/3 px-2 py-1 bg-white border border-[#7A7A7A] text-center"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">Jth.Tmp:</label>
                  <div className="w-72">
                    <DatePickerInput
                      value={newJthTmp}
                      onChange={(formatted) => setNewJthTmp(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">Keterangan:</label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">Nilai Penjualan (Rp):</label>
                  <input
                    type="number"
                    value={newNilaiPenjualan}
                    onChange={(e) => setNewNilaiPenjualan(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
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
                      setIsAddOpen(false);
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

        <A4PrintPreviewModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title="LAPORAN LIST FAKTUR DP"
          subtitle={`Filter Tanggal: ${tanggalFilter || 'Semua'}`}
          orientation="landscape"
          columns={[
            { header: 'No.Bukti', accessor: 'noBukti', width: '105px' },
            { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '80px' },
            { header: 'Nama Customer', accessor: 'namaCustomer' },
            { header: 'No.SO', accessor: 'noSo', width: '105px' },
            { header: 'PO.No', accessor: 'poNo', width: '95px' },
            { header: 'Keterangan', accessor: 'keterangan' },
            { header: 'Nilai DP', accessor: 'nilaiPenjualan', align: 'right', width: '105px' },
            { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center', width: '70px' },
          ]}
          rows={filteredList}
          summaryItems={[
            { label: 'Total Faktur DP', value: `${filteredList.length} Dokumen` },
            { label: 'Total Nilai DP', value: formatRupiah(totalNilai) },
          ]}
        />
      </div>
    </div>
  );
};
