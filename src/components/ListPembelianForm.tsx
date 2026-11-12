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
  parseNum,
  toDisplayDMyShort,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

export interface PembelianItem {
  id: string;
  noBukti: string;
  tanggal: string;
  tanggalIso: string;
  namaSupplier: string;
  noPo: string;
  noFaktur: string;
  keterangan: string;
  nilaiPembelian: string;
  nilaiPembelianNum: number;
  jthTmp: string;
  stsLunas: string;
  tglLunas: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListPembelianFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToPembelian(r: any): PembelianItem {
  const valNum = Number(r.nilai_pembelian || 0);
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaSupplier: r.nama_supplier || '',
    noPo: r.no_po || '-',
    noFaktur: r.no_faktur || '-',
    keterangan: r.keterangan || '',
    nilaiPembelian: formatMoney(valNum),
    nilaiPembelianNum: valNum,
    jthTmp: toDisplayDMyShort(r.jth_tmp) || '-',
    stsLunas: r.sts_lunas || 'Belum',
    tglLunas: toDisplayDMyShort(r.tgl_lunas) || '-',
    stsPost: r.sts_post || 'Posted',
    tglPost: toDisplayDMyShort(r.tgl_post) || '-',
    dibuatOleh: r.dibuat_oleh || 'RETNO',
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

export const ListPembelianForm: React.FC<ListPembelianFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [pembelianList, setPembelianList] = useState<PembelianItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Supplier');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newSupplier, setNewSupplier] = useState<string>('');
  const [newNoPo, setNewNoPo] = useState<string>('');
  const [newNoFaktur, setNewNoFaktur] = useState<string>('');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newNilai, setNewNilai] = useState<string>('0');
  const [newJthTmp, setNewJthTmp] = useState<string>('');
  const [newStsLunas, setNewStsLunas] = useState<string>('Belum');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadData = async () => {
    try {
      setIsBusy(true);
      const rows = await erpList<any>('pembelian_barangs', { orderBy: 'tanggal', asc: false });
      const mapped = rows.map(mapDbToPembelian);
      setPembelianList(mapped);
      if (mapped.length > 0 && !mapped.some((r) => r.id === selectedId)) {
        setSelectedId(mapped[0].id);
      }
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNew = () => {
    setEditingId(null);
    const todayDisp = toDisplayDMyShort(todayIso());
    setNewNoBukti(`2608-PB-IMP-${String(pembelianList.length + 1).padStart(3, '0')}`);
    setNewTanggal(todayDisp);
    setNewSupplier('');
    setNewNoPo('');
    setNewNoFaktur('');
    setNewKeterangan('');
    setNewNilai('0');
    setNewJthTmp(todayDisp);
    setNewStsLunas('Belum');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = pembelianList.find((p) => p.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setNewNoBukti(item.noBukti);
    setNewTanggal(item.tanggal);
    setNewSupplier(item.namaSupplier);
    setNewNoPo(item.noPo);
    setNewNoFaktur(item.noFaktur);
    setNewKeterangan(item.keterangan);
    setNewNilai(String(item.nilaiPembelianNum));
    setNewJthTmp(item.jthTmp === '-' ? '' : item.jthTmp);
    setNewStsLunas(item.stsLunas);
    setIsAddOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoBukti.trim()) return;

    try {
      setIsBusy(true);
      const tglIso = toIsoDate(newTanggal) || todayIso();
      const payload = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_supplier: newSupplier.trim().toUpperCase(),
        no_po: newNoPo.trim().toUpperCase() || '-',
        no_faktur: newNoFaktur.trim().toUpperCase(),
        keterangan: newKeterangan.trim(),
        nilai_pembelian: parseNum(newNilai),
        jth_tmp: toIsoDate(newJthTmp),
        sts_lunas: newStsLunas,
        tgl_lunas: newStsLunas === 'Lunas' ? todayIso() : null,
      };

      if (editingId) {
        const saved = await erpUpdate<any>('pembelian_barangs', editingId, {
          ...payload,
          diupdate_oleh: 'RETNO',
          tgl_update: todayIso(),
        });
        const mapped = mapDbToPembelian(saved);
        setPembelianList(pembelianList.map((p) => (p.id === editingId ? mapped : p)));
        showFeedback('Pembelian diperbarui');
      } else {
        const saved = await erpCreate<any>('pembelian_barangs', {
          ...payload,
          sts_post: 'Posted',
          tgl_post: tglIso,
          dibuat_oleh: 'RETNO',
          tgl_created: todayIso(),
          diupdate_oleh: '-',
        });
        const mapped = mapDbToPembelian(saved);
        setPembelianList([mapped, ...pembelianList]);
        setSelectedId(mapped.id);
        showFeedback('Pembelian tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('pembelian_barangs', id);
      const updated = pembelianList.filter((item) => item.id !== id);
      setPembelianList(updated);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Data Pembelian dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = pembelianList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'No.Bukti') return item.noBukti.toLowerCase().includes(term);
    if (searchField === 'Nama Supplier') return item.namaSupplier.toLowerCase().includes(term);
    if (searchField === 'No.Faktur Pembelian') return item.noFaktur.toLowerCase().includes(term);
    if (searchField === 'Keterangan') return item.keterangan.toLowerCase().includes(term);
    return (
      item.noBukti.toLowerCase().includes(term) ||
      item.namaSupplier.toLowerCase().includes(term) ||
      item.noFaktur.toLowerCase().includes(term) ||
      item.keterangan.toLowerCase().includes(term)
    );
  });

  const totalNilai = filteredList.reduce((acc, r) => acc + r.nilaiPembelianNum, 0);

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Pembelian_Barang',
      sheetTitle: 'LIST PEMBELIAN BARANG',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.Bukti', accessor: 'noBukti' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Supplier', accessor: 'namaSupplier' },
        { header: 'No.PO', accessor: 'noPo' },
        { header: 'No.Faktur Pembelian', accessor: 'noFaktur' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Nilai Pembelian', accessor: 'nilaiPembelianNum', align: 'right' },
        { header: 'Jth.Tmp', accessor: 'jthTmp', align: 'center' },
        { header: 'Sts.Lunas', accessor: 'stsLunas', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  return (
    <div
      id="list-pembelian-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Pembelian Barang"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadData}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto">
          <div className="flex items-center space-x-3">
            <FormActionButtons
              onSimpan={loadData}
              onBaru={handleAddNew}
              onKoreksi={handleEdit}
              onHapus={() => selectedId && handleDelete(selectedId)}
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

          <div className="font-bold text-sm text-gray-900 pr-2">{formatRupiah(totalNilai)}</div>
        </div>

        <div className="flex-1 overflow-auto bg-white border border-[#999999] m-1.5 relative shadow-inner">
          <table className="w-full border-collapse text-left min-w-[1600px]">
            <thead className="sticky top-0 bg-[#F0F0F0] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10">
              <tr>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center w-12">No</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.Bukti</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tanggal</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Nama Supplier</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.PO</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.Faktur Pembelian</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Keterangan</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-right">Nilai Pembelian</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Jth.Tmp</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Sts.Lunas</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Tgl.Lunas</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center">Sts.Post</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Post</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Dibuat Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Created</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">DiUpdate Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Update</th>
                <th className="px-2 py-1.5 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={18} className="text-center py-8 text-gray-500 italic">
                    Tidak ada data Pembelian Barang
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
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
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono font-medium">{item.noBukti}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.tanggal}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-semibold">{item.namaSupplier}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono text-[11px]">{item.noPo}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono text-[11px]">{item.noFaktur}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.keterangan}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-right font-mono">{item.nilaiPembelian}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center text-[11px]">{item.jthTmp}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center font-medium">{item.stsLunas}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center text-[11px]">{item.tglLunas}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{item.stsPost}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-[11px]">{item.tglPost}</td>
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
                            isSelected
                              ? 'bg-red-700 text-white hover:bg-red-800'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
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

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-t border-[#C0C0C0]">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-800">Search :</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="bg-white border border-[#7A7A7A] px-1.5 py-0.5 rounded-xs text-xs"
            >
              <option value="Nama Supplier">Nama Supplier</option>
              <option value="No.Bukti">No.Bukti</option>
              <option value="No.Faktur Pembelian">No.Faktur Pembelian</option>
              <option value="Keterangan">Keterangan</option>
            </select>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari data..."
              className="w-64 px-1.5 py-0.5 bg-white border border-[#7A7A7A] rounded-xs text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-64 h-5 bg-[#FFFF99] border border-[#C0C0C0] rounded-xs px-2 text-[10px] flex items-center text-gray-700 truncate">
              {pembelianList.find((r) => r.id === selectedId)?.namaSupplier || ''}
            </div>
            <div className="text-gray-800 font-medium">Record : {filteredList.length}</div>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] rounded shadow-2xl w-[460px] overflow-hidden">
              <div className="bg-gradient-to-r from-[#0055EA] to-[#2B579A] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
                <span>{editingId ? 'Koreksi Pembelian Barang' : 'Tambah Pembelian Barang Baru'}</span>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-white hover:bg-red-600 px-1.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveNew} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">No.Bukti:</label>
                  <input
                    type="text"
                    value={newNoBukti}
                    onChange={(e) => setNewNoBukti(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Tanggal:</label>
                  <div className="w-72">
                    <DatePickerInput
                      value={newTanggal}
                      onChange={(formatted) => setNewTanggal(formatted)}
                      format="dMyShort"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Nama Supplier:</label>
                  <input
                    type="text"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">No.PO:</label>
                  <input
                    type="text"
                    value={newNoPo}
                    onChange={(e) => setNewNoPo(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">No.Faktur Pembelian:</label>
                  <input
                    type="text"
                    value={newNoFaktur}
                    onChange={(e) => setNewNoFaktur(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Keterangan:</label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Nilai Pembelian:</label>
                  <input
                    type="number"
                    value={newNilai}
                    onChange={(e) => setNewNilai(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs font-mono text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Jth.Tmp / Status:</label>
                  <div className="w-72 flex items-center space-x-2">
                    <DatePickerInput
                      value={newJthTmp}
                      onChange={(formatted) => setNewJthTmp(formatted)}
                      format="dMyShort"
                    />
                    <select
                      value={newStsLunas}
                      onChange={(e) => setNewStsLunas(e.target.value)}
                      className="flex-1 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                    >
                      <option value="Belum">Belum</option>
                      <option value="Lunas">Lunas</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#D0D0D0]">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
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
          title="LAPORAN LIST PEMBELIAN BARANG"
          subtitle={`Filter Tanggal: ${tanggalFilter}`}
          orientation="landscape"
          columns={[
            { header: 'No.Bukti', accessor: 'noBukti', width: '110px' },
            { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '80px' },
            { header: 'Nama Supplier', accessor: 'namaSupplier' },
            { header: 'No.Faktur', accessor: 'noFaktur', width: '105px' },
            { header: 'Keterangan', accessor: 'keterangan' },
            { header: 'Nilai', accessor: 'nilaiPembelian', align: 'right', width: '95px' },
            { header: 'Lunas', accessor: 'stsLunas', align: 'center', width: '60px' },
          ]}
          rows={filteredList}
          summaryItems={[
            { label: 'Total Record', value: `${filteredList.length} Transaksi` },
            { label: 'Total Pembelian', value: formatRupiah(totalNilai) },
          ]}
        />
      </div>
    </div>
  );
};
