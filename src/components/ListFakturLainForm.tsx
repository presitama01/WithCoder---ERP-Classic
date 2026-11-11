import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

export interface FakturLainItem {
  id: string;
  noBukti: string;
  tanggal: string;
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

interface ListFakturLainFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ListFakturLainForm: React.FC<ListFakturLainFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [fakturLainList, setFakturLainList] = useState<FakturLainItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [tanggalFilter, setTanggalFilter] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [yellowNote, setYellowNote] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNoBukti, setNewNoBukti] = useState<string>('INV-2608-0001');
  const [newTanggal, setNewTanggal] = useState<string>('01-Aug-2026');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newNoSo, setNewNoSo] = useState<string>('');
  const [newPoNo, setNewPoNo] = useState<string>('');
  const [newNoSj, setNewNoSj] = useState<string>('');
  const [newNoFakturPajak, setNewNoFakturPajak] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('01');
  const [newJthTmp, setNewJthTmp] = useState<string>('01-Aug-2026');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newPpn, setNewPpn] = useState<string>('10.');
  const [newNilaiPenjualan, setNewNilaiPenjualan] = useState<string>('0.');

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleBaru = () => {
    setEditingId(null);
    setNewNoBukti(`INV-2608-000${fakturLainList.length + 1}`);
    setNewTanggal('01-Aug-2026');
    setNewCustomer('');
    setNewNoSo('');
    setNewPoNo('');
    setNewNoSj('');
    setNewNoFakturPajak('');
    setNewSales('01');
    setNewJthTmp('01-Aug-2026');
    setNewKeterangan('');
    setNewPpn('10.');
    setNewNilaiPenjualan('0.');
    setIsAddOpen(true);
  };

  const handleKoreksi = () => {
    const item = fakturLainList.find((f) => f.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setEditingId(item.id);
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
    setNewPpn(item.ppn);
    setNewNilaiPenjualan(item.nilaiPenjualan);
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoBukti.trim()) return;

    if (editingId) {
      setFakturLainList((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                noBukti: newNoBukti.trim().toUpperCase(),
                tanggal: newTanggal.trim(),
                namaCustomer: newCustomer.trim().toUpperCase(),
                noSo: newNoSo.trim().toUpperCase(),
                poNo: newPoNo.trim(),
                noSj: newNoSj.trim(),
                noFakturPajak: newNoFakturPajak.trim(),
                sales: newSales.trim(),
                jthTmp: newJthTmp.trim(),
                keterangan: newKeterangan.trim(),
                ppn: newPpn.trim(),
                nilaiPenjualan: newNilaiPenjualan.trim(),
                diUpdateOleh: 'RETNO',
                tglUpdate: newTanggal.trim(),
              }
            : item
        )
      );
      showFeedback('Faktur Lain diperbarui');
    } else {
      const newItem: FakturLainItem = {
        id: Date.now().toString(),
        noBukti: newNoBukti.trim().toUpperCase(),
        tanggal: newTanggal.trim(),
        namaCustomer: newCustomer.trim().toUpperCase(),
        noSo: newNoSo.trim().toUpperCase(),
        poNo: newPoNo.trim(),
        noSj: newNoSj.trim(),
        noFakturPajak: newNoFakturPajak.trim(),
        sales: newSales.trim(),
        jthTmp: newJthTmp.trim(),
        keterangan: newKeterangan.trim(),
        ppn: newPpn.trim(),
        nilaiPenjualan: newNilaiPenjualan.trim(),
        stsLunas: 'Not Yet',
        tglLunas: '',
        stsPrint: 'Not Yet',
        tglPrint: '',
        stsPost: 'Not Yet',
        tglPost: '',
        dibuatOleh: 'RETNO',
        tglCreated: newTanggal.trim(),
        diUpdateOleh: '',
        tglUpdate: '',
      };

      setFakturLainList((prev) => [...prev, newItem]);
      setSelectedId(newItem.id);
      showFeedback('Faktur Lain ditambahkan');
    }
    setIsAddOpen(false);
    setEditingId(null);
  };

  const handleHapus = () => {
    if (!selectedId) {
      showFeedback('Pilih baris yang akan dihapus');
      return;
    }
    const updated = fakturLainList.filter((item) => item.id !== selectedId);
    setFakturLainList(updated);
    setSelectedId(updated[0]?.id || '');
    showFeedback('Data Faktur Lain dihapus');
  };

  const uniqueTanggalOptions = Array.from(
    new Set(fakturLainList.map((item) => item.tanggal).filter(Boolean))
  );

  const filteredList = fakturLainList.filter((item) => {
    const matchesTanggal =
      !tanggalFilter.trim() ||
      item.tanggal.toLowerCase() === tanggalFilter.trim().toLowerCase();

    if (!matchesTanggal) return false;
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    if (searchField === 'No.Bukti') {
      return item.noBukti.toLowerCase().includes(term);
    } else if (searchField === 'No.SO') {
      return item.noSo.toLowerCase().includes(term);
    } else if (searchField === 'PO.No') {
      return item.poNo.toLowerCase().includes(term);
    } else if (searchField === 'No.Faktur Pajak') {
      return item.noFakturPajak.toLowerCase().includes(term);
    } else if (searchField === 'Keterangan') {
      return item.keterangan.toLowerCase().includes(term);
    }
    return item.namaCustomer.toLowerCase().includes(term);
  });

  return (
    <div
      id="list-faktur-lain-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Unified Black Top Banner */}
        <FormHeaderBanner
          title="List Faktur Lain"
          onClose={onClose}
          onExportExcel={() => showFeedback('Export Excel selesai')}
        />

        {/* 2. Sub-toolbar with Action Buttons, Tanggal Filter, and Rp 0 */}
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto">
          <div className="flex items-center space-x-3">
            <FormActionButtons
              onSimpan={() => showFeedback('Data List Faktur Lain tersimpan')}
              onBaru={handleBaru}
              onKoreksi={handleKoreksi}
              onHapus={handleHapus}
              feedback={feedback}
            />

            <div className="flex items-center space-x-1.5 pl-2">
              <span className="font-bold text-black text-[11px]">Tanggal :</span>
              <select
                value={tanggalFilter}
                onChange={(e) => setTanggalFilter(e.target.value)}
                className="w-[74px] h-[22px] px-1 bg-white border border-[#7A7A7A] text-[11px] outline-none cursor-pointer"
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

          <div className="font-bold text-[15px] text-black pr-6">Rp 0</div>
        </div>

        {/* 3. Main Data Grid Table Container with Horizontal & Vertical Scrollbars */}
        <div className="flex-1 overflow-auto bg-[#F0F0F0] border border-[#808080] m-1.5 relative shadow-inner">
          <table className="border-collapse text-left whitespace-nowrap min-w-[1920px] text-[11px]">
            <thead className="sticky top-0 bg-[#ECE9D8] text-black font-normal z-10">
              <tr className="bg-[#ECE9D8] border-b border-[#ACA899]">
                <th className="w-[22px] px-1 py-0.5 border-r border-[#ACA899] text-center font-normal" />
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[95px]">
                  No.Bukti
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[85px]">
                  Tanggal
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[160px]">
                  Nama Customer
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[105px]">
                  No.SO
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[155px]">
                  PO.No
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[180px]">
                  No.SJ
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[110px]">
                  No.Faktur Pajak
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[50px]">
                  Sales
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[75px]">
                  Jth.Tmp
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[110px]">
                  Keterangan
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[45px]">
                  PPN
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[95px]">
                  Nilai Penjualan
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[65px]">
                  Sts.Lunas
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[75px]">
                  Tgl.Lunas
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[65px]">
                  Sts.Print
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[75px]">
                  Tgl.Print
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[65px]">
                  Sts.Post
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[75px]">
                  Tgl.Post
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[80px]">
                  Dibuat Oleh
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[75px]">
                  Tgl.Created
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[90px]">
                  DiUpdate Oleh
                </th>
                <th className="px-2 py-0.5 border-r border-[#ACA899] font-normal w-[75px]">
                  Tgl.Update
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    onDoubleClick={handleKoreksi}
                    className={`cursor-pointer border-b border-[#00B800] text-black ${
                      isSelected
                        ? 'bg-[#00FF00] font-medium'
                        : 'bg-[#00FF00] hover:bg-[#33FF33]'
                    }`}
                  >
                    <td className="px-1 py-0.5 border-r border-[#ACA899] bg-[#ECE9D8] text-center text-[10px] font-bold text-black">
                      {isSelected ? '▸' : ''}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.noBukti}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.tanggal}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.namaCustomer}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.noSo}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.poNo}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.noSj}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.noFakturPajak}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.sales}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.jthTmp}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.keterangan}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800] text-right">
                      {item.ppn}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800] text-right">
                      {item.nilaiPenjualan}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.stsLunas}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.tglLunas}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.stsPrint}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.tglPrint}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.stsPost}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.tglPost}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.dibuatOleh}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.tglCreated}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.diUpdateOleh}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#00B800]">
                      {item.tglUpdate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. Bottom Footer & Search Bar */}
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
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[260px] h-[22px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] outline-none"
            />
          </div>

          <div className="flex items-center space-x-6 shrink-0">
            <input
              type="text"
              value={yellowNote}
              onChange={(e) => setYellowNote(e.target.value)}
              className="w-[260px] h-[22px] px-1.5 bg-[#FFFF99] border border-[#7A7A7A] text-[11px] outline-none"
            />
            <div className="text-[11px] text-black flex items-center space-x-4 pr-4">
              <span>Record</span>
              <span className="font-semibold">{filteredList.length}</span>
            </div>
          </div>
        </div>

        {/* Add / Edit Modal Dialog */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-[#ECE9D8] border-2 border-[#0A246A] shadow-2xl w-[480px] overflow-hidden">
              <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
                <span>
                  {editingId ? 'Koreksi Faktur Lain' : 'Tambah Faktur Lain Baru'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="w-[16px] h-[16px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveNew} className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">No.Bukti:</label>
                  <input
                    type="text"
                    value={newNoBukti}
                    onChange={(e) => setNewNoBukti(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">Tanggal:</label>
                  <input
                    type="text"
                    value={newTanggal}
                    onChange={(e) => setNewTanggal(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">
                    Nama Customer:
                  </label>
                  <input
                    type="text"
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">No.SO:</label>
                  <input
                    type="text"
                    value={newNoSo}
                    onChange={(e) => setNewNoSo(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">PO.No:</label>
                  <input
                    type="text"
                    value={newPoNo}
                    onChange={(e) => setNewPoNo(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">
                    No.Faktur Pajak:
                  </label>
                  <input
                    type="text"
                    value={newNoFakturPajak}
                    onChange={(e) => setNewNoFakturPajak(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">
                    Keterangan:
                  </label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">
                    Nilai Penjualan:
                  </label>
                  <input
                    type="text"
                    value={newNilaiPenjualan}
                    onChange={(e) => setNewNilaiPenjualan(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs hover:bg-[#F3F2F1] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#0A246A] text-white border border-black text-xs hover:bg-[#163994] cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
