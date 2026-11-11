import React, { useState, useRef } from 'react';
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
  const [jenisTransaksi, setJenisTransaksi] = useState<string>(
    'Semua Berdasarkan Periode'
  );
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formNoSo, setFormNoSo] = useState<string>('2608-SO-001');
  const [formNoPo, setFormNoPo] = useState<string>('PO-99220');
  const [formCustomer, setFormCustomer] = useState<string>('PT. DJABESMEN');
  const [formKodeBarang, setFormKodeBarang] = useState<string>('BRG-001');
  const [formNamaBarang, setFormNamaBarang] = useState<string>(
    'PIPA PVC 4 INCH AW'
  );
  const [formUnit, setFormUnit] = useState<string>('BATANG');
  const [formPesan, setFormPesan] = useState<string>('50');
  const [formKirim, setFormKirim] = useState<string>('20');

  const [soList, setSoList] = useState<MutasiSoItem[]>([]);
  const [sjList] = useState<SjDetailItem[]>([]);

  const startPickerRef = useRef<HTMLInputElement>(null);
  const endPickerRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleDatePickerChange = (
    isoDate: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!isoDate) return;
    const [yyyy, mm, dd] = isoDate.split('-');
    if (yyyy && mm && dd) {
      setter(`${dd}-${mm}-${yyyy}`);
    }
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
    if (!item) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
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
    if (!selectedId) {
      showFeedback('Pilih baris yang akan dihapus');
      return;
    }
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
    if (jenisTransaksi === 'Outstanding SO (Belum Lunas Kirim)' && item.sisa <= 0) {
      return false;
    }
    if (jenisTransaksi === 'Closed SO' && item.sisa > 0) {
      return false;
    }
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
      {/* 1. Unified Black Window Header Banner */}
      <FormHeaderBanner
        title="Mutasi Sales Order"
        onClose={onClose}
        onExportExcel={() => showFeedback('Export Excel selesai')}
      />

      {/* 2. Action Toolbar */}
      <div className="shrink-0 bg-[#ECE9D8] border-b border-[#C0C0C0] px-3 py-1.5 flex items-center justify-between text-xs">
        <FormActionButtons
          onSimpan={() => showFeedback('Data Mutasi Sales Order tersimpan')}
          onBaru={handleAddNew}
          onKoreksi={handleEdit}
          onHapus={handleDelete}
          feedback={feedback}
        />
      </div>

      {/* 3. Filter & Search Header Controls */}
      <div className="shrink-0 bg-[#ECE9D8] px-3 py-2 flex flex-col gap-1.5 text-[11px]">
        {/* Row 1: Periode */}
        <div className="flex items-center space-x-2">
          <span className="font-bold text-black w-[105px] text-right">
            Periode :
          </span>
          <div className="flex items-center w-[106px] h-[21px] bg-white border border-[#7A7A7A]">
            <input
              type="text"
              value={periodeStart}
              onChange={(e) => setPeriodeStart(e.target.value)}
              className="w-full px-1.5 text-[11px] outline-none font-sans bg-transparent"
            />
            <button
              type="button"
              onClick={() => {
                if (startPickerRef.current?.showPicker) {
                  startPickerRef.current.showPicker();
                } else {
                  startPickerRef.current?.click();
                }
              }}
              title="Pilih Tanggal Awal"
              className="px-1 bg-[#D4D0C8] border-l border-[#7A7A7A] hover:bg-[#E5E1D8] text-[9px] h-full cursor-pointer"
            >
              ▼
            </button>
            <input
              ref={startPickerRef}
              type="date"
              onChange={(e) =>
                handleDatePickerChange(e.target.value, setPeriodeStart)
              }
              className="sr-only"
              tabIndex={-1}
            />
          </div>

          <span className="font-bold text-black px-1">s/d</span>

          <div className="flex items-center w-[106px] h-[21px] bg-white border border-[#7A7A7A]">
            <input
              type="text"
              value={periodeEnd}
              onChange={(e) => setPeriodeEnd(e.target.value)}
              className="w-full px-1.5 text-[11px] outline-none font-sans bg-transparent"
            />
            <button
              type="button"
              onClick={() => {
                if (endPickerRef.current?.showPicker) {
                  endPickerRef.current.showPicker();
                } else {
                  endPickerRef.current?.click();
                }
              }}
              title="Pilih Tanggal Akhir"
              className="px-1 bg-[#D4D0C8] border-l border-[#7A7A7A] hover:bg-[#E5E1D8] text-[9px] h-full cursor-pointer"
            >
              ▼
            </button>
            <input
              ref={endPickerRef}
              type="date"
              onChange={(e) =>
                handleDatePickerChange(e.target.value, setPeriodeEnd)
              }
              className="sr-only"
              tabIndex={-1}
            />
          </div>
        </div>

        {/* Row 2: Jenis Transaksi & Search */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-black w-[105px] text-right">
              Jenis Transaksi :
            </span>
            <select
              value={jenisTransaksi}
              onChange={(e) => setJenisTransaksi(e.target.value)}
              className="w-[300px] h-[22px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] text-black outline-none cursor-pointer"
            >
              <option value="Semua Berdasarkan Periode">
                Semua Berdasarkan Periode
              </option>
              <option value="Outstanding SO (Belum Lunas Kirim)">
                Outstanding SO (Belum Lunas Kirim)
              </option>
              <option value="Closed SO">Closed SO</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 flex-1 justify-end min-w-[360px]">
            <span className="font-bold text-black">Search :</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-[22px] px-2 bg-[#ECE9D8] border border-[#7A7A7A] shadow-2xs text-[11px] text-black outline-none cursor-pointer"
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
              className="flex-1 max-w-[360px] h-[22px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Main Split Data Container (Left: S.O DETAIL, Right: S.J DETAIL) */}
      <div className="flex-1 overflow-hidden px-2 pb-2 flex gap-2">
        {/* Left Side: S.O DETAIL Grid */}
        <div className="flex-1 overflow-auto bg-[#F0F0F0] border border-[#808080] relative shadow-inner">
          <table className="border-collapse text-left whitespace-nowrap text-[11px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                <th
                  className="px-2 py-0.5 text-center font-normal text-[11px] border-r border-[#ACA899]"
                  colSpan={10}
                >
                  S.O DETAIL
                </th>
              </tr>
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899] font-normal">
                <th className="border-r border-[#ACA899] w-[20px] px-1 py-0.5 text-center font-normal" />
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[92px]">
                  No.SO
                </th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[86px]">
                  No.PO
                </th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[155px]">
                  Customer
                </th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[88px]">
                  Kode Barang
                </th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[180px]">
                  Nama Barang
                </th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[48px]">
                  Unit
                </th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[52px]">
                  Pesan
                </th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[52px]">
                  Kirim
                </th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[52px]">
                  Sisa
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
                    onDoubleClick={handleEdit}
                    className={`border-b border-[#D4D0C8] cursor-pointer ${
                      isSelected
                        ? 'bg-[#DCEBFC] text-black'
                        : 'bg-white text-black hover:bg-[#F2F6FC]'
                    }`}
                  >
                    <td className="border-r border-[#ACA899] bg-[#ECE9D8] px-1 py-0.5 text-center font-bold text-[10px]">
                      {isSelected ? '▸' : ''}
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">
                      {item.noSo}
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">
                      {item.noPo}
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">
                      {item.customer}
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">
                      {item.kodeBarang}
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">
                      {item.namaBarang}
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-center">
                      {item.unit}
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right">
                      {item.pesan}
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right">
                      {item.kirim}
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right">
                      {item.sisa}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Side: S.J DETAIL Grid */}
        <div className="w-[265px] shrink-0 overflow-auto bg-[#F0F0F0] border border-[#808080] relative shadow-inner">
          <table className="border-collapse text-left whitespace-nowrap text-[11px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                <th
                  className="px-2 py-0.5 text-center font-normal text-[11px] border-r border-[#ACA899]"
                  colSpan={4}
                >
                  S.J DETAIL
                </th>
              </tr>
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899] font-normal">
                <th className="border-r border-[#ACA899] w-[20px] px-1 py-0.5 text-center font-normal" />
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[76px]">
                  No.SJ
                </th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[68px]">
                  Tanggal
                </th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[42px]">
                  Qty
                </th>
              </tr>
            </thead>
            <tbody>
              {sjList.length === 0 ? (
                <tr className="bg-white border-b border-[#ACA899] h-[22px]">
                  <td className="border-r border-[#ACA899] bg-[#ECE9D8] px-1 py-0.5 text-center font-bold text-black">
                    *
                  </td>
                  <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5" />
                  <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5" />
                  <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5" />
                </tr>
              ) : (
                sjList.map((sj) => (
                  <tr
                    key={sj.id}
                    className="border-b border-[#ACA899] bg-white text-black"
                  >
                    <td className="border-r border-[#ACA899] bg-[#ECE9D8] px-1 py-0.5 text-center font-bold text-black">
                      *
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">
                      {sj.noSj}
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">
                      {sj.tanggal}
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right">
                      {sj.qty}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0A246A] shadow-2xl w-[460px] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
              <span>
                {editingId
                  ? 'Koreksi Mutasi Sales Order'
                  : 'Tambah Mutasi Sales Order Baru'}
              </span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-[16px] h-[16px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
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
  );
};
