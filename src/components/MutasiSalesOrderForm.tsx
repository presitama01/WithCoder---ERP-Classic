import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

export interface MutasiSoItem {
  id: string;
  noSo: string;
  noPo: string;
  customer: string;
  kodeBarang: string;
  namaBarang: string;
  unit: string;
  pesan: number;
  kirim: number;
  sisa: number;
}

export interface SjDetailItem {
  id: string;
  noSj: string;
  tanggal: string;
  qty: number;
}

interface MutasiSalesOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MutasiSalesOrderForm: React.FC<MutasiSalesOrderFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [periodeStart, setPeriodeStart] = useState<string>('01-08-2026');
  const [periodeEnd, setPeriodeEnd] = useState<string>('31-08-2026');
  const [jenisTransaksi, setJenisTransaksi] = useState<string>('Semua Berdasarkan Periode');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string>('1');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNoSo, setFormNoSo] = useState<string>('2608-SO-003');
  const [formNoPo, setFormNoPo] = useState<string>('PO-99220');
  const [formCustomer, setFormCustomer] = useState<string>('PT. DJABESMEN');
  const [formKodeBarang, setFormKodeBarang] = useState<string>('BRG-002');
  const [formNamaBarang, setFormNamaBarang] = useState<string>('PIPA PVC 3 INCH AW');
  const [formUnit, setFormUnit] = useState<string>('BATANG');
  const [formPesan, setFormPesan] = useState<string>('50');
  const [formKirim, setFormKirim] = useState<string>('20');

  // Sample data to showcase table and column fields
  const [soList, setSoList] = useState<MutasiSoItem[]>([
    {
      id: '1',
      noSo: '2608-SO-001',
      noPo: 'PO-99218',
      customer: 'PT. DJABESMEN',
      kodeBarang: 'BRG-001',
      namaBarang: 'PIPA PVC 4 INCH AW',
      unit: 'BATANG',
      pesan: 100,
      kirim: 60,
      sisa: 40,
    },
    {
      id: '2',
      noSo: '2608-SO-002',
      noPo: 'PO-88231',
      customer: 'PT. MAKMUR JAYA',
      kodeBarang: 'BRG-008',
      namaBarang: 'FITTING ELBOW 90 DEG',
      unit: 'PCS',
      pesan: 50,
      kirim: 50,
      sisa: 0,
    },
  ]);

  const [sjList] = useState<SjDetailItem[]>([
    {
      id: '1',
      noSj: '2608-SJ-001',
      tanggal: '10-08-2026',
      qty: 60,
    },
  ]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormNoSo(`2608-SO-00${soList.length + 1}`);
    setFormNoPo('PO-99220');
    setFormCustomer('PT. DJABESMEN');
    setFormKodeBarang('BRG-002');
    setFormNamaBarang('');
    setFormUnit('PCS');
    setFormPesan('10');
    setFormKirim('0');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = soList.find((s) => s.id === selectedId);
    if (!item) return;
    setEditingId(item.id);
    setFormNoSo(item.noSo);
    setFormNoPo(item.noPo);
    setFormCustomer(item.customer);
    setFormKodeBarang(item.kodeBarang);
    setFormNamaBarang(item.namaBarang);
    setFormUnit(item.unit);
    setFormPesan(item.pesan.toString());
    setFormKirim(item.kirim.toString());
    setIsAddOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const updated = soList.filter((item) => item.id !== selectedId);
    setSoList(updated);
    setSelectedId(updated[0]?.id || '');
    showFeedback('Data Mutasi SO dihapus');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNoSo.trim() || !formCustomer.trim()) return;
    const pesanNum = parseInt(formPesan || '0', 10) || 0;
    const kirimNum = parseInt(formKirim || '0', 10) || 0;
    const sisaNum = Math.max(0, pesanNum - kirimNum);

    if (editingId) {
      setSoList(
        soList.map((item) =>
          item.id === editingId
            ? {
                ...item,
                noSo: formNoSo.trim().toUpperCase(),
                noPo: formNoPo.trim().toUpperCase(),
                customer: formCustomer.trim().toUpperCase(),
                kodeBarang: formKodeBarang.trim().toUpperCase(),
                namaBarang: formNamaBarang.trim().toUpperCase(),
                unit: formUnit.trim().toUpperCase(),
                pesan: pesanNum,
                kirim: kirimNum,
                sisa: sisaNum,
              }
            : item
        )
      );
      showFeedback('Mutasi SO diperbarui');
    } else {
      const newItem: MutasiSoItem = {
        id: Date.now().toString(),
        noSo: formNoSo.trim().toUpperCase(),
        noPo: formNoPo.trim().toUpperCase(),
        customer: formCustomer.trim().toUpperCase(),
        kodeBarang: formKodeBarang.trim().toUpperCase(),
        namaBarang: formNamaBarang.trim().toUpperCase(),
        unit: formUnit.trim().toUpperCase(),
        pesan: pesanNum,
        kirim: kirimNum,
        sisa: sisaNum,
      };
      setSoList([newItem, ...soList]);
      setSelectedId(newItem.id);
      showFeedback('Mutasi SO tersimpan');
    }
    setIsAddOpen(false);
    setEditingId(null);
  };

  const filteredList = soList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Nama Pelanggan' || searchField === 'Customer') {
      return item.customer.toLowerCase().includes(term);
    } else if (searchField === 'No.SO') {
      return item.noSo.toLowerCase().includes(term);
    } else if (searchField === 'No.PO') {
      return item.noPo.toLowerCase().includes(term);
    } else if (searchField === 'Nama Barang') {
      return item.namaBarang.toLowerCase().includes(term);
    }
    return (
      item.customer.toLowerCase().includes(term) ||
      item.noSo.toLowerCase().includes(term) ||
      item.namaBarang.toLowerCase().includes(term)
    );
  });

  return (
    <div
      id="mutasi-sales-order-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      {/* 1. Black Window Header Banner */}
      <FormHeaderBanner
        title="Mutasi Sales Order"
        onClose={onClose}
        onExportExcel={() => showFeedback('Export Excel selesai')}
      />

      {/* 2. Action Toolbar */}
      <div className="bg-[#ECE9D8] border-b border-[#D4D0C8] px-3 py-1.5 flex items-center justify-between text-xs shadow-sm">
        <FormActionButtons
          onSimpan={() => showFeedback('Data Mutasi Sales Order tersimpan')}
          onBaru={handleAddNew}
          onKoreksi={handleEdit}
          onHapus={handleDelete}
          feedback={feedback}
        />
      </div>

      {/* 3. Filter & Search Header Controls */}
      <div className="bg-[#ECE9D8] border-b border-[#D4D0C8] px-3 py-2 flex flex-col gap-2 text-xs shadow-sm">
        {/* Row 1: Periode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold w-24 text-right">Periode :</span>
            <div className="flex items-center space-x-1">
              <input
                type="text"
                value={periodeStart}
                onChange={(e) => setPeriodeStart(e.target.value)}
                className="px-2 py-0.5 w-24 bg-white border border-[#7A7A7A] text-xs font-mono"
              />
              <button className="px-1.5 py-0.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded text-xs hover:bg-[#D4D0C8]">
                ▼
              </button>
            </div>
            <span className="font-semibold px-1">s/d</span>
            <div className="flex items-center space-x-1">
              <input
                type="text"
                value={periodeEnd}
                onChange={(e) => setPeriodeEnd(e.target.value)}
                className="px-2 py-0.5 w-24 bg-white border border-[#7A7A7A] text-xs font-mono"
              />
              <button className="px-1.5 py-0.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded text-xs hover:bg-[#D4D0C8]">
                ▼
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Jenis Transaksi & Search */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold w-24 text-right">Jenis Transaksi :</span>
            <select
              value={jenisTransaksi}
              onChange={(e) => setJenisTransaksi(e.target.value)}
              className="px-2 py-0.5 w-64 bg-white border border-[#7A7A7A] text-xs rounded"
            >
              <option value="Semua Berdasarkan Periode">Semua Berdasarkan Periode</option>
              <option value="Outstanding SO (Belum Lunas Kirim)">Outstanding SO (Belum Lunas Kirim)</option>
              <option value="Closed SO">Closed SO</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-semibold">Search :</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="px-2 py-0.5 bg-white border border-[#7A7A7A] text-xs rounded"
            >
              <option value="Nama Pelanggan">Nama Pelanggan</option>
              <option value="No.SO">No.SO</option>
              <option value="No.PO">No.PO</option>
              <option value="Nama Barang">Nama Barang</option>
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-2 py-0.5 w-64 bg-white border border-[#7A7A7A] text-xs shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* 3. Main Data Container with Split Table (Left: S.O DETAIL, Right: S.J DETAIL) */}
      <div className="flex-1 overflow-hidden p-2 flex gap-2">
        {/* Left Side: S.O DETAIL Table */}
        <div className="flex-1 overflow-auto bg-white border border-[#7A7A7A] relative">
          <table className="w-full border-collapse text-left whitespace-nowrap min-w-[750px]">
            <thead>
              {/* Top Subheader spanning S.O DETAIL */}
              <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[10px] sticky top-0 z-10">
                <th className="border-r border-[#919191] px-2 py-0.5 w-6 text-center"></th>
                <th className="border-r border-[#919191] px-2 py-0.5"></th>
                <th className="border-r border-[#919191] px-2 py-0.5"></th>
                <th className="border-r border-[#919191] px-2 py-0.5"></th>
                <th
                  className="border-r border-[#919191] px-2 py-0.5 text-center font-semibold bg-[#E2DECD]"
                  colSpan={5}
                >
                  S.O DETAIL
                </th>
              </tr>
              {/* Main Column Header Row */}
              <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-[21px] z-10">
                <th className="border-r border-[#919191] px-2 py-1 w-6 text-center">▶</th>
                <th className="border-r border-[#919191] px-3 py-1">No.SO</th>
                <th className="border-r border-[#919191] px-3 py-1">No.PO</th>
                <th className="border-r border-[#919191] px-3 py-1">Customer</th>
                <th className="border-r border-[#919191] px-3 py-1">Kode Barang</th>
                <th className="border-r border-[#919191] px-3 py-1">Nama Barang</th>
                <th className="border-r border-[#919191] px-3 py-1 text-center">Unit</th>
                <th className="border-r border-[#919191] px-3 py-1 text-right">Pesan</th>
                <th className="border-r border-[#919191] px-3 py-1 text-right">Kirim</th>
                <th className="px-3 py-1 text-right">Sisa</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item, index) => {
                const isSelected = selectedId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`border-b border-[#E0E0E0] cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-[#000084] text-white'
                        : index % 2 === 0
                        ? 'bg-white hover:bg-[#F2F0EB]'
                        : 'bg-[#F9F8F5] hover:bg-[#F2F0EB]'
                    }`}
                  >
                    <td className="border-r border-[#E0E0E0] px-2 py-1 text-center font-bold">
                      {isSelected ? '▶' : ''}
                    </td>
                    <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noSo}</td>
                    <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noPo}</td>
                    <td className="border-r border-[#E0E0E0] px-3 py-1 font-medium">{item.customer}</td>
                    <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.kodeBarang}</td>
                    <td className="border-r border-[#E0E0E0] px-3 py-1">{item.namaBarang}</td>
                    <td className="border-r border-[#E0E0E0] px-3 py-1 text-center">{item.unit}</td>
                    <td className="border-r border-[#E0E0E0] px-3 py-1 text-right">{item.pesan}</td>
                    <td className="border-r border-[#E0E0E0] px-3 py-1 text-right">{item.kirim}</td>
                    <td className="px-3 py-1 text-right font-semibold">{item.sisa}</td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-6 text-gray-400">
                    Tidak ada data mutasi sales order
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Side: S.J DETAIL Table */}
        <div className="w-[280px] overflow-auto bg-white border border-[#7A7A7A] relative">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead>
              {/* Top Subheader spanning S.J DETAIL */}
              <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[10px] sticky top-0 z-10">
                <th
                  className="border-r border-[#919191] px-2 py-0.5 text-center font-semibold bg-[#E2DECD]"
                  colSpan={4}
                >
                  S.J DETAIL
                </th>
              </tr>
              {/* Main Column Header Row */}
              <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-[21px] z-10">
                <th className="border-r border-[#919191] px-2 py-1 w-6 text-center">*</th>
                <th className="border-r border-[#919191] px-3 py-1">No.SJ</th>
                <th className="border-r border-[#919191] px-3 py-1">Tanggal</th>
                <th className="px-3 py-1 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {sjList.map((sj, idx) => (
                <tr
                  key={sj.id}
                  className={`border-b border-[#E0E0E0] text-xs ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F8F5]'
                  }`}
                >
                  <td className="border-r border-[#E0E0E0] px-2 py-1 text-center font-bold text-gray-500">
                    *
                  </td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{sj.noSj}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{sj.tanggal}</td>
                  <td className="px-3 py-1 text-right font-semibold">{sj.qty}</td>
                </tr>
              ))}
              {sjList.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-400">
                    Tidak ada data SJ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddOpen && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[460px] flex flex-col overflow-hidden">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
              <span>{editingId ? 'Koreksi Mutasi Sales Order' : 'Tambah Mutasi Sales Order Baru'}</span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-white hover:text-red-300 font-bold px-1.5"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveForm} className="p-4 space-y-2.5 text-xs">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. SO:</label>
                <input
                  type="text"
                  value={formNoSo}
                  onChange={(e) => setFormNoSo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. PO:</label>
                <input
                  type="text"
                  value={formNoPo}
                  onChange={(e) => setFormNoPo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Customer:</label>
                <input
                  type="text"
                  value={formCustomer}
                  onChange={(e) => setFormCustomer(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Kode Barang:</label>
                <input
                  type="text"
                  value={formKodeBarang}
                  onChange={(e) => setFormKodeBarang(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Nama Barang:</label>
                <input
                  type="text"
                  value={formNamaBarang}
                  onChange={(e) => setFormNamaBarang(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Unit:</label>
                <input
                  type="text"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Pesan / Kirim:</label>
                <div className="col-span-2 flex gap-2">
                  <input
                    type="number"
                    value={formPesan}
                    onChange={(e) => setFormPesan(e.target.value)}
                    className="w-1/2 px-2 py-1 bg-white border border-[#7A7A7A]"
                    placeholder="Pesan"
                  />
                  <input
                    type="number"
                    value={formKirim}
                    onChange={(e) => setFormKirim(e.target.value)}
                    className="w-1/2 px-2 py-1 bg-white border border-[#7A7A7A]"
                    placeholder="Kirim"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-[#D4D0C8]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-1.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded hover:bg-[#D4D0C8]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#000084] text-white border border-[#000066] rounded hover:bg-[#0000A0]"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
