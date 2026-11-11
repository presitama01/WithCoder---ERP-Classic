import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

export interface JurnalUmumItem {
  id: string;
  noBukti: string;
  tanggal: string;
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
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [yellowNote, setYellowNote] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNoBukti, setFormNoBukti] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>('06-Aug-2026');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formSaldoDebet, setFormSaldoDebet] = useState<string>('0');
  const [formStsPost, setFormStsPost] = useState<string>('Not Yet');

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleBaru = () => {
    setEditingId(null);
    const nextNum = String(jurnalList.length + 1).padStart(3, '0');
    setFormNoBukti(`2608-JU-${nextNum}`);
    setFormTanggal('06-Aug-2026');
    setFormKeterangan('');
    setFormSaldoDebet('0');
    setFormStsPost('Not Yet');
    setIsModalOpen(true);
  };

  const handleKoreksi = () => {
    const current = jurnalList.find((item) => item.id === selectedId);
    if (!current) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setEditingId(current.id);
    setFormNoBukti(current.noBukti);
    setFormTanggal(current.tanggal);
    setFormKeterangan(current.keterangan);
    setFormSaldoDebet(String(current.saldoDebet));
    setFormStsPost(current.stsPost);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNoBukti.trim()) return;
    const numericSaldo = parseFloat(formSaldoDebet.replace(/[^0-9.-]/g, '')) || 0;

    if (editingId) {
      setJurnalList((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                noBukti: formNoBukti.trim().toUpperCase(),
                tanggal: formTanggal.trim(),
                keterangan: formKeterangan.trim(),
                saldoDebet: numericSaldo,
                stsPost: formStsPost,
                diUpdateOleh: 'RETNO',
                tglUpdate: new Date()
                  .toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                  .replace(/ /g, '-'),
              }
            : item
        )
      );
      showFeedback('Jurnal Umum diperbarui');
    } else {
      const newItem: JurnalUmumItem = {
        id: Date.now().toString(),
        noBukti: formNoBukti.trim().toUpperCase(),
        tanggal: formTanggal.trim(),
        keterangan: formKeterangan.trim(),
        saldoDebet: numericSaldo,
        stsPost: formStsPost,
        dibuatOleh: 'RETNO',
        tglCreated: formTanggal.trim(),
        diUpdateOleh: '',
        tglUpdate: '',
      };
      setJurnalList((prev) => [...prev, newItem]);
      setSelectedId(newItem.id);
      showFeedback('Jurnal Umum ditambahkan');
    }

    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleHapus = () => {
    if (!selectedId) {
      showFeedback('Pilih baris yang akan dihapus');
      return;
    }
    const updated = jurnalList.filter((item) => item.id !== selectedId);
    setJurnalList(updated);
    setSelectedId(updated[0]?.id || '');
    showFeedback('Data Jurnal Umum dihapus');
  };

  const uniqueTanggalOptions = Array.from(
    new Set(jurnalList.map((item) => item.tanggal).filter(Boolean))
  );

  const filteredList = jurnalList.filter((item) => {
    if (modeFilter === 'posting' && item.stsPost !== 'Posted') return false;
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

  return (
    <div
      id="list-jurnal-umum-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Unified Black Top Banner */}
        <FormHeaderBanner
          title="List Jurnal Umum"
          onClose={onClose}
          onExportExcel={() => showFeedback('Export Excel selesai')}
        />

        {/* 2. Sub-toolbar with Action Buttons, Radio Filter, Kategori Dropdown, Tanggal Filter, and Total Rp 0 */}
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto gap-3">
          <div className="flex items-center space-x-3 shrink-0">
            <FormActionButtons
              compact
              onSimpan={() => showFeedback('Data List Jurnal Umum tersimpan')}
              onBaru={handleBaru}
              onKoreksi={handleKoreksi}
              onHapus={handleHapus}
              feedback={feedback}
            />

            {/* Stacked Radio Buttons: Jurnal Umum / Posting */}
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

            {/* Category Dropdown: SEMUA-nya */}
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="w-[240px] h-[22px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] text-black outline-none cursor-pointer"
            >
              <option value="SEMUA-nya">SEMUA-nya</option>
              <option value="Jurnal Umum">Jurnal Umum</option>
              <option value="Kas Masuk">Kas Masuk</option>
              <option value="Kas Keluar">Kas Keluar</option>
              <option value="Bank Masuk">Bank Masuk</option>
              <option value="Bank Keluar">Bank Keluar</option>
            </select>

            {/* Tanggal Filter + Semua Button */}
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

          <div className="font-bold text-[15px] text-black pr-4 shrink-0">
            Rp {totalSaldoDebet.toLocaleString('en-US')}
          </div>
        </div>

        {/* 3. Main Data Grid Table Container */}
        <div className="flex-1 overflow-auto bg-[#F0F0F0] border border-[#808080] m-1.5 relative shadow-inner">
          <table className="border-collapse text-left min-w-[960px] text-[11px]">
            <thead className="sticky top-0 bg-[#ECE9D8] text-black font-normal border-b border-[#ACA899] z-10">
              <tr>
                <th className="w-[22px] px-1 py-1 border-r border-[#ACA899] text-center bg-[#ECE9D8]" />
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[105px]">
                  No.Bukti
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[75px]">
                  Tanggal
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[280px]">
                  Keterangan
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal text-right whitespace-nowrap w-[85px]">
                  Saldo Debet
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[65px]">
                  Sts.Post
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
              {filteredList.map((item) => {
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
                      {item.keterangan}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 text-right whitespace-nowrap">
                      {item.saldoDebet.toLocaleString('en-US')}
                    </td>
                    <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                      {item.stsPost}
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
              <option value="Keterangan">Keterangan</option>
              <option value="Sts.Post">Sts.Post</option>
              <option value="Dibuat Oleh">Dibuat Oleh</option>
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
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[440px] overflow-hidden">
              <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
                <span>
                  {editingId
                    ? 'Koreksi Jurnal Umum'
                    : 'Tambah Jurnal Umum Baru'}
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
                    className="w-68 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
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
                    className="w-68 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
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
                    required
                    className="w-68 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">
                    Saldo Debet:
                  </label>
                  <input
                    type="text"
                    value={formSaldoDebet}
                    onChange={(e) => setFormSaldoDebet(e.target.value)}
                    className="w-68 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black">
                    Sts.Post:
                  </label>
                  <select
                    value={formStsPost}
                    onChange={(e) => setFormStsPost(e.target.value)}
                    className="w-68 px-2 py-1 bg-white border border-[#7A7A7A] text-xs"
                  >
                    <option value="Not Yet">Not Yet</option>
                    <option value="Posted">Posted</option>
                  </select>
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
