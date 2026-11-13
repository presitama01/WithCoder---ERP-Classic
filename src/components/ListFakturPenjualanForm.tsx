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

export interface FakturPenjualanItem {
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
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListFakturPenjualanFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToFaktur(r: any): FakturPenjualanItem {
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
    ppn: `${Number(r.ppn ?? 11)}.`,
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
    diupdateOleh: r.diupdate_oleh || '',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '',
  };
}

export const ListFakturPenjualanForm: React.FC<ListFakturPenjualanFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [fakturList, setFakturList] = useState<FakturPenjualanItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newNoSo, setNewNoSo] = useState<string>('');
  const [newPoNo, setNewPoNo] = useState<string>('');
  const [newNoSj, setNewNoSj] = useState<string>('');
  const [newNoFakturPajak, setNewNoFakturPajak] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('05');
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
        eq: { jenis_faktur: 'REGULAR' },
        orderBy: 'tanggal',
        asc: false,
      });
      const mapped = rows.map(mapDbToFaktur);
      setFakturList(mapped);
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
    const todayDisp = toDisplayDMyShort(todayIso());
    setNewNoBukti(nextUniqueCode(fakturList.map((f) => f.noBukti), 'INJ-2608-', 4));
    setNewTanggal(todayDisp);
    setNewCustomer('');
    setNewNoSo('');
    setNewPoNo('');
    setNewNoSj('');
    setNewNoFakturPajak('');
    setNewSales('05');
    setNewJthTmp(todayDisp);
    setNewKeterangan('');
    setNewPpn('11');
    setNewNilaiPenjualan('0');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = fakturList.find((f) => f.id === selectedId);
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
      setModalError('No. Bukti dan Nama Customer wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const payload = {
        jenis_faktur: 'REGULAR',
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
        const mapped = mapDbToFaktur(saved);
        setFakturList(fakturList.map((item) => (item.id === editingId ? mapped : item)));
        showFeedback('Faktur Penjualan diperbarui');
      } else {
        const saved = await erpCreate<any>('faktur_penjualans', {
          ...payload,
          sts_lunas: 'Not Yet',
          sts_print: 'Not Yet',
          sts_post: 'Not Yet',
          dibuat_oleh: 'RETNO',
          tgl_created: todayIso(),
        });
        const mapped = mapDbToFaktur(saved);
        setFakturList([mapped, ...fakturList]);
        setSelectedId(mapped.id);
        showFeedback('Faktur Penjualan tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Faktur Penjualan';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('faktur_penjualans', id);
      const updated = fakturList.filter((item) => item.id !== id);
      setFakturList(updated);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Faktur Penjualan dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = fakturList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Nama Pelanggan') return item.namaCustomer.toLowerCase().includes(term);
    if (searchField === 'No.Bukti') return item.noBukti.toLowerCase().includes(term);
    if (searchField === 'No.SO') return item.noSo.toLowerCase().includes(term);
    if (searchField === 'PO.No') return item.poNo.toLowerCase().includes(term);
    if (searchField === 'No.SJ') return item.noSj.toLowerCase().includes(term);
    if (searchField === 'No.Faktur Pajak') return item.noFakturPajak.toLowerCase().includes(term);
    return (
      item.noBukti.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.noSo.toLowerCase().includes(term)
    );
  });

  const totalNilai = filteredList.reduce((acc, f) => acc + f.nilaiPenjualanNum, 0);

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Faktur_Penjualan',
      sheetTitle: 'LIST FAKTUR PENJUALAN',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'No.SO', accessor: 'noSo' },
        { header: 'PO.No', accessor: 'poNo' },
        { header: 'No.SJ', accessor: 'noSj' },
        { header: 'No.Faktur Pajak', accessor: 'noFakturPajak' },
        { header: 'Sales', accessor: 'sales', align: 'center' },
        { header: 'Jth.Tmp', accessor: 'jthTmp', align: 'center' },
        { header: 'Nilai Penjualan', accessor: 'nilaiPenjualanNum', align: 'right' },
        { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  return (
    <div
      id="list-faktur-penjualan-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="List Faktur Penjualan"
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
          <div className="font-bold text-sm text-right px-3 py-0.5 bg-white border border-[#919191] min-w-[120px] shadow-inner">
            {formatRupiah(totalNilai)}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-[#7A7A7A] m-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1900px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Bukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.SO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">PO.No</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.SJ</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Faktur Pajak</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Jth.Tmp</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center">PPN</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Nilai Penjualan</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Lunas</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Lunas</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Post</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Post</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Dibuat Oleh</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Created</th>
              <th className="border-r border-[#919191] px-3 py-1.5">DiUpdate Oleh</th>
              <th className="px-3 py-1.5">Tgl.Update</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  onDoubleClick={handleEdit}
                  className={`border-b border-[#00C000] cursor-pointer text-xs font-mono ${
                    isSelected ? 'font-semibold' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? '#00FF00' : '#00E800',
                    color: '#000',
                  }}
                >
                  <td className="border-r border-[#00B000] px-2 py-1 text-center font-bold">
                    {isSelected ? '▶' : ''}
                  </td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.noBukti}</td>
                  <td className="border-r border-[#00B000] px-3 py-1">{item.tanggal}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-medium font-sans">{item.namaCustomer}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.noSo}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.poNo}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-mono">{item.noSj}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.noFakturPajak}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.sales}</td>
                  <td className="border-r border-[#00B000] px-3 py-1">{item.jthTmp}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-sans">{item.keterangan || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.ppn}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-right font-semibold">{item.nilaiPenjualan}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-sans">{item.stsLunas}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.tglLunas || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-sans">{item.stsPrint}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.tglPrint || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-sans">{item.stsPost}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.tglPost || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-sans">{item.dibuatOleh}</td>
                  <td className="border-r border-[#00B000] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-sans">{item.diupdateOleh || '-'}</td>
                  <td className="px-3 py-1">{item.tglUpdate || '-'}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={23} className="text-center py-6 text-gray-500">
                  Tidak ada data faktur penjualan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-[#ECE9D8] border-t border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">Search :</span>
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="px-2 py-0.5 bg-white border border-[#7A7A7A] text-xs rounded"
          >
            <option value="Nama Pelanggan">Nama Pelanggan</option>
            <option value="No.Bukti">No.Bukti</option>
            <option value="No.SO">No.SO</option>
            <option value="PO.No">PO.No</option>
            <option value="No.SJ">No.SJ</option>
            <option value="No.Faktur Pajak">No.Faktur Pajak</option>
          </select>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari data..."
            className="px-2 py-0.5 w-64 bg-white border border-[#7A7A7A] text-xs shadow-inner"
          />
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-64 h-5 bg-[#FFFF00] border border-[#919191] shadow-inner px-2 text-[10px] flex items-center text-black truncate">
            {fakturList.find((r) => r.id === selectedId)?.namaCustomer || ''}
          </div>
          <div className="font-semibold px-2 py-0.5 bg-[#ECE9D8] border border-[#919191]">
            Record {filteredList.length}
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[550px] flex flex-col overflow-hidden max-h-[90vh]">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
              <span>{editingId ? 'Koreksi Faktur Penjualan' : 'Tambah Faktur Penjualan Baru'}</span>
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
            <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-2 text-xs overflow-y-auto">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. Bukti:</label>
                <input
                  type="text"
                  value={newNoBukti}
                  onChange={(e) => setNewNoBukti(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
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
                <input
                  type="text"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. SO:</label>
                <input
                  type="text"
                  value={newNoSo}
                  onChange={(e) => setNewNoSo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">PO.No:</label>
                <input
                  type="text"
                  value={newPoNo}
                  onChange={(e) => setNewPoNo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. SJ:</label>
                <input
                  type="text"
                  value={newNoSj}
                  onChange={(e) => setNewNoSj(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. Faktur Pajak:</label>
                <input
                  type="text"
                  value={newNoFakturPajak}
                  onChange={(e) => setNewNoFakturPajak(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Sales / PPN (%):</label>
                <div className="col-span-2 flex gap-2">
                  <input
                    type="text"
                    value={newSales}
                    onChange={(e) => setNewSales(e.target.value)}
                    className="w-2/3 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                    placeholder="Kode Sales"
                  />
                  <input
                    type="number"
                    value={newPpn}
                    onChange={(e) => setNewPpn(e.target.value)}
                    className="w-1/3 px-2 py-1 bg-white border border-[#7A7A7A] font-mono text-center"
                    placeholder="PPN"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Jth.Tmp:</label>
                <div className="col-span-2">
                  <DatePickerInput
                    value={newJthTmp}
                    onChange={(formatted) => setNewJthTmp(formatted)}
                    format="dMyShort"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Nilai Penjualan (Rp):</label>
                <input
                  type="number"
                  value={newNilaiPenjualan}
                  onChange={(e) => setNewNilaiPenjualan(e.target.value)}
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
        title="LAPORAN LIST FAKTUR PENJUALAN"
        subtitle={`Filter Tanggal: ${tanggalFilter}`}
        orientation="landscape"
        columns={[
          { header: 'No.Bukti', accessor: 'noBukti', width: '105px' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '80px' },
          { header: 'Nama Customer', accessor: 'namaCustomer' },
          { header: 'No.SO', accessor: 'noSo', width: '105px' },
          { header: 'PO.No', accessor: 'poNo', width: '95px' },
          { header: 'No.SJ', accessor: 'noSj', align: 'center', width: '65px' },
          { header: 'Jth.Tmp', accessor: 'jthTmp', align: 'center', width: '80px' },
          { header: 'Nilai Penjualan', accessor: 'nilaiPenjualan', align: 'right', width: '105px' },
          { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center', width: '70px' },
        ]}
        rows={filteredList}
        summaryItems={[
          { label: 'Total Faktur Penjualan', value: `${filteredList.length} Dokumen` },
          { label: 'Total Nilai Penjualan', value: formatRupiah(totalNilai) },
        ]}
      />
    </div>
  );
};
