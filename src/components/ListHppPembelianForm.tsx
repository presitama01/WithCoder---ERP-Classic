import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

export interface HppPembelianItem {
  id: string;
  noBukti: string;
  tanggal: string;
  namaSupplier: string;
  noPo: string;
  noFakturPembelian: string;
  keterangan: string;
  nilaiPembelian: string;
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
  const [hppList, setHppList] = useState<HppPembelianItem[]>([
    {
      id: '1',
      noBukti: '1807-LKL-002',
      tanggal: '18-Jul-2018',
      namaSupplier: 'CAHAYATIARA MUSTIKA',
      noPo: '1805-PO-LKL-003',
      noFakturPembelian: '',
      keterangan: '',
      nilaiPembelian: '9,664,900.',
      jthTmp: '18-Jul-2018',
      stsLunas: 'Not Yet',
      tglLunas: '',
      stsPost: 'Not Yet',
      tglPost: '',
      dibuatOleh: 'RETNO',
      tglCreated: '18-Jul-2018',
      diUpdateOleh: '',
      tglUpdate: '',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [tanggalFilter, setTanggalFilter] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [yellowNote, setYellowNote] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Add/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNoBukti, setFormNoBukti] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>('18-Jul-2018');
  const [formNamaSupplier, setFormNamaSupplier] = useState<string>('');
  const [formNoPo, setFormNoPo] = useState<string>('');
  const [formNoFaktur, setFormNoFaktur] = useState<string>('');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formNilaiPembelian, setFormNilaiPembelian] = useState<string>('0');
  const [formJthTmp, setFormJthTmp] = useState<string>('18-Jul-2018');

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleBaru = () => {
    setEditingId(null);
    setFormNoBukti(`1807-LKL-00${hppList.length + 2}`);
    setFormTanggal('18-Jul-2018');
    setFormNamaSupplier('');
    setFormNoPo('');
    setFormNoFaktur('');
    setFormKeterangan('');
    setFormNilaiPembelian('0');
    setFormJthTmp('18-Jul-2018');
    setIsModalOpen(true);
  };

  const handleKoreksi = () => {
    const current = hppList.find((item) => item.id === selectedId);
    if (!current) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setEditingId(current.id);
    setFormNoBukti(current.noBukti);
    setFormTanggal(current.tanggal);
    setFormNamaSupplier(current.namaSupplier);
    setFormNoPo(current.noPo);
    setFormNoFaktur(current.noFakturPembelian);
    setFormKeterangan(current.keterangan);
    setFormNilaiPembelian(current.nilaiPembelian);
    setFormJthTmp(current.jthTmp);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNoBukti.trim()) return;

    if (editingId) {
      setHppList((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                noBukti: formNoBukti.trim().toUpperCase(),
                tanggal: formTanggal.trim(),
                namaSupplier: formNamaSupplier.trim().toUpperCase(),
                noPo: formNoPo.trim().toUpperCase(),
                noFakturPembelian: formNoFaktur.trim().toUpperCase(),
                keterangan: formKeterangan.trim(),
                nilaiPembelian: formNilaiPembelian.trim(),
                jthTmp: formJthTmp.trim(),
                diUpdateOleh: 'RETNO',
                tglUpdate: new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).replace(/ /g, '-'),
              }
            : item
        )
      );
      showFeedback('Data HPP Pembelian diperbarui');
    } else {
      const newItem: HppPembelianItem = {
        id: Date.now().toString(),
        noBukti: formNoBukti.trim().toUpperCase(),
        tanggal: formTanggal.trim(),
        namaSupplier: formNamaSupplier.trim().toUpperCase(),
        noPo: formNoPo.trim().toUpperCase(),
        noFakturPembelian: formNoFaktur.trim().toUpperCase(),
        keterangan: formKeterangan.trim(),
        nilaiPembelian: formNilaiPembelian.trim(),
        jthTmp: formJthTmp.trim(),
        stsLunas: 'Not Yet',
        tglLunas: '',
        stsPost: 'Not Yet',
        tglPost: '',
        dibuatOleh: 'RETNO',
        tglCreated: formTanggal.trim(),
        diUpdateOleh: '',
        tglUpdate: '',
      };
      setHppList((prev) => [...prev, newItem]);
      setSelectedId(newItem.id);
      showFeedback('Data HPP Pembelian ditambahkan');
    }

    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleHapus = () => {
    if (!selectedId) {
      showFeedback('Pilih baris yang akan dihapus');
      return;
    }
    const updated = hppList.filter((item) => item.id !== selectedId);
    setHppList(updated);
    setSelectedId(updated[0]?.id || '');
    showFeedback('Data HPP Pembelian dihapus');
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
    // 'Nama Pelanggan' / 'Nama Supplier'
    return item.namaSupplier.toLowerCase().includes(term);
  });

  return (
    <div
      id="list-hpp-pembelian-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Unified Black Top Banner */}
        <FormHeaderBanner
          title="List HPPPembelian"
          onClose={onClose}
          onExportExcel={() => showFeedback('Export Excel selesai')}
        />

        {/* 2. Sub-toolbar with Action Buttons, Tanggal Filter, and Total Rp 0 */}
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto">
          <div className="flex items-center space-x-3">
            <FormActionButtons
              onSimpan={() => showFeedback('Data List HPP Pembelian tersimpan')}
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
          <table className="w-full border-collapse text-left min-w-[1460px] text-[11px]">
            <thead className="sticky top-0 bg-[#ECE9D8] text-black font-normal border-b border-[#ACA899] z-10">
              <tr>
                <th className="w-[22px] px-1 py-1 border-r border-[#ACA899] text-center bg-[#ECE9D8]" />
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[105px]">
                  No.Bukti
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[85px]">
                  Tanggal
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[170px]">
                  Nama Supplier
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[110px]">
                  No. PO
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[135px]">
                  No.Faktur Pembelian
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[180px]">
                  Keterangan
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal text-right whitespace-nowrap w-[95px]">
                  Nilai Pembelian
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[75px]">
                  Jth.Tmp
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[75px]">
                  Sts.Lunas
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[70px]">
                  Tgl.Lunas
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[70px]">
                  Sts.Post
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[70px]">
                  Tgl.Post
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">
                  Dibuat Oleh
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">
                  Tgl.Created
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[90px]">
                  DiUpdate Oleh
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">
                  Tgl.Update
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={17}
                    className="text-center py-8 text-gray-500 italic bg-white"
                  >
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
                        isSelected
                          ? 'bg-[#00FF00] text-black'
                          : 'bg-white text-black hover:bg-[#EAF2FC]'
                      }`}
                    >
                      <td className="px-1 py-0.5 border-r border-[#ACA899] bg-[#ECE9D8] text-center text-[10px] font-bold text-black">
                        {isSelected ? '▸' : ''}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.noBukti}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.tanggal}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.namaSupplier}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.noPo}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.noFakturPembelian}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.keterangan}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 text-right whitespace-nowrap">
                        {item.nilaiPembelian}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.jthTmp}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.stsLunas}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.tglLunas}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.stsPost}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.tglPost}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.dibuatOleh}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.tglCreated}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.diUpdateOleh}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.tglUpdate}
                      </td>
                    </tr>
                  );
                })
              )}
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
              <option value="No. PO">No. PO</option>
              <option value="No.Faktur Pembelian">No.Faktur Pembelian</option>
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
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[460px] overflow-hidden">
              <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
                <span>
                  {editingId
                    ? 'Koreksi HPP Pembelian'
                    : 'Tambah HPP Pembelian Baru'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-[16px] h-[16px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveModal} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">
                    No.Bukti:
                  </label>
                  <input
                    type="text"
                    value={formNoBukti}
                    onChange={(e) => setFormNoBukti(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">
                    Tanggal:
                  </label>
                  <input
                    type="text"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">
                    Nama Supplier:
                  </label>
                  <input
                    type="text"
                    value={formNamaSupplier}
                    onChange={(e) => setFormNamaSupplier(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">
                    No. PO:
                  </label>
                  <input
                    type="text"
                    value={formNoPo}
                    onChange={(e) => setFormNoPo(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">
                    No.Faktur Pembelian:
                  </label>
                  <input
                    type="text"
                    value={formNoFaktur}
                    onChange={(e) => setFormNoFaktur(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">
                    Keterangan:
                  </label>
                  <input
                    type="text"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">
                    Nilai Pembelian:
                  </label>
                  <input
                    type="text"
                    value={formNilaiPembelian}
                    onChange={(e) => setFormNilaiPembelian(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">
                    Jth.Tmp:
                  </label>
                  <input
                    type="text"
                    value={formJthTmp}
                    onChange={(e) => setFormJthTmp(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
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
