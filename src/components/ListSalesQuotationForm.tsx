import React, { useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

export interface SalesQuotationItem {
  id: string;
  noSq: string;
  tanggal: string;
  namaCustomer: string;
  sales: string;
  noInquiry: string;
  keterangan: string;
  amount: string;
  dibuatOleh: string;
  tglCreated: string;
  diUpdateOleh: string;
  tglUpdate: string;
}

interface ListSalesQuotationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ListSalesQuotationForm: React.FC<ListSalesQuotationFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [quotationList, setQuotationList] = useState<SalesQuotationItem[]>([
    {
      id: '1',
      noSq: '2608-SQ-001',
      tanggal: '03-Aug-2026',
      namaCustomer: 'PT. STAINLESS STEEL',
      sales: 'M. TUTUK',
      noInquiry: '2607-SI-019',
      keterangan: '1. Price are Nett,',
      amount: '17,327,100.',
      dibuatOleh: 'RETNO',
      tglCreated: '03-Aug-2026',
      diUpdateOleh: '',
      tglUpdate: '',
    },
    {
      id: '2',
      noSq: '2608-SQ-002',
      tanggal: '04-Aug-2026',
      namaCustomer: 'PT. INDOFOOD CBP SUKSES',
      sales: 'DARMASTI',
      noInquiry: '',
      keterangan: '1. Price are Nett,',
      amount: '7,237,200.',
      dibuatOleh: 'RETNO',
      tglCreated: '04-Aug-2026',
      diUpdateOleh: '',
      tglUpdate: '',
    },
    {
      id: '3',
      noSq: '2608-SQ-004',
      tanggal: '05-Aug-2026',
      namaCustomer: 'PT. ASTRA HONDA MOTOR',
      sales: 'DARMASTI',
      noInquiry: '',
      keterangan: '1. Price are Nett,',
      amount: '1,359,750.',
      dibuatOleh: 'RETNO',
      tglCreated: '05-Aug-2026',
      diUpdateOleh: '',
      tglUpdate: '',
    },
    {
      id: '4',
      noSq: '2608-SQ-003',
      tanggal: '05-Aug-2026',
      namaCustomer: 'PT. DJABESMEN',
      sales: 'M. TUTUK',
      noInquiry: '2608-SQ-001',
      keterangan: '1. Price are Nett,',
      amount: '6,410,250.',
      dibuatOleh: 'RETNO',
      tglCreated: '05-Aug-2026',
      diUpdateOleh: 'RETNO',
      tglUpdate: '06-Aug-2026',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [tanggalFilter, setTanggalFilter] = useState<string>('');
  const [yellowNote, setYellowNote] = useState<string>('');

  // Add New / Koreksi Modal state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newNoSq, setNewNoSq] = useState<string>('2608-SQ-005');
  const [newTanggal, setNewTanggal] = useState<string>('05-Aug-2026');
  const [newCustomer, setNewCustomer] = useState<string>('PT. STAINLESS STEEL');
  const [newSales, setNewSales] = useState<string>('M. TUTUK');
  const [newNoInquiry, setNewNoInquiry] = useState<string>('');
  const [newKeterangan, setNewKeterangan] = useState<string>('1. Price are Nett,');
  const [newAmount, setNewAmount] = useState<string>('5,000,000.');

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setNewNoSq(`2608-SQ-00${quotationList.length + 1}`);
    setNewTanggal('05-Aug-2026');
    setNewCustomer('PT. STAINLESS STEEL');
    setNewSales('M. TUTUK');
    setNewNoInquiry('');
    setNewKeterangan('1. Price are Nett,');
    setNewAmount('5,000,000.');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = quotationList.find((q) => q.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setNewNoSq(item.noSq);
    setNewTanggal(item.tanggal);
    setNewCustomer(item.namaCustomer);
    setNewSales(item.sales);
    setNewNoInquiry(item.noInquiry);
    setNewKeterangan(item.keterangan);
    setNewAmount(item.amount);
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoSq.trim()) return;

    if (editingId) {
      setQuotationList(
        quotationList.map((item) =>
          item.id === editingId
            ? {
                ...item,
                noSq: newNoSq.trim().toUpperCase(),
                tanggal: newTanggal.trim(),
                namaCustomer: newCustomer.trim().toUpperCase(),
                sales: newSales.trim().toUpperCase(),
                noInquiry: newNoInquiry.trim().toUpperCase(),
                keterangan: newKeterangan.trim(),
                amount: newAmount.trim(),
                diUpdateOleh: 'RETNO',
                tglUpdate: '06-Aug-2026',
              }
            : item
        )
      );
      showFeedback('Sales Quotation diperbarui');
    } else {
      const newItem: SalesQuotationItem = {
        id: Date.now().toString(),
        noSq: newNoSq.trim().toUpperCase(),
        tanggal: newTanggal.trim(),
        namaCustomer: newCustomer.trim().toUpperCase(),
        sales: newSales.trim().toUpperCase(),
        noInquiry: newNoInquiry.trim().toUpperCase(),
        keterangan: newKeterangan.trim(),
        amount: newAmount.trim(),
        dibuatOleh: 'RETNO',
        tglCreated: newTanggal.trim(),
        diUpdateOleh: '',
        tglUpdate: '',
      };

      setQuotationList([...quotationList, newItem]);
      setSelectedId(newItem.id);
      showFeedback('Sales Quotation tersimpan');
    }
    setIsAddOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = quotationList.filter((item) => item.id !== id);
    setQuotationList(updated);
    if (selectedId === id) {
      setSelectedId(updated[0]?.id || '');
    }
    showFeedback('Sales Quotation dihapus');
  };

  const uniqueTanggalOptions = Array.from(
    new Set(quotationList.map((item) => item.tanggal).filter(Boolean))
  );

  const filteredList = quotationList.filter((item) => {
    const matchesTanggal =
      !tanggalFilter.trim() ||
      item.tanggal.toLowerCase() === tanggalFilter.trim().toLowerCase();

    if (!matchesTanggal) return false;
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    if (searchField === 'No. SQ') {
      return item.noSq.toLowerCase().includes(term);
    } else if (searchField === 'Nama Pelanggan') {
      return item.namaCustomer.toLowerCase().includes(term);
    } else if (searchField === 'Sales') {
      return item.sales.toLowerCase().includes(term);
    } else if (searchField === 'No. Inquiry') {
      return item.noInquiry.toLowerCase().includes(term);
    } else if (searchField === 'Keterangan') {
      return item.keterangan.toLowerCase().includes(term);
    }
    return (
      item.noSq.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.sales.toLowerCase().includes(term)
    );
  });

  return (
    <div
      id="list-sales-quotation-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Unified Black Top Banner */}
        <FormHeaderBanner
          title="List Sales Quotation"
          onClose={onClose}
          onExportExcel={() => showFeedback('Export Excel selesai')}
        />

        {/* 2. Action Toolbar, Tanggal Filter & Rp 0 */}
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto">
          <div className="flex items-center space-x-3">
            <FormActionButtons
              onSimpan={() => showFeedback('Data Sales Quotation tersimpan')}
              onBaru={handleAddNew}
              onKoreksi={handleEdit}
              onHapus={() => selectedId && handleDelete(selectedId)}
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
          <table className="border-collapse text-left min-w-[1120px] text-[11px]">
            <thead className="sticky top-0 bg-[#ECE9D8] text-black font-normal border-b border-[#ACA899] z-10">
              <tr>
                <th className="w-[22px] px-1 py-1 border-r border-[#ACA899] text-center bg-[#ECE9D8]" />
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[95px]">
                  No. SQ
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[82px]">
                  Tanggal
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[195px]">
                  Nama Customer
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[76px]">
                  Sales
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[92px]">
                  No. Inquiry
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[135px]">
                  Keterangan
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal text-right whitespace-nowrap w-[90px]">
                  Amount
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">
                  Dibuat Oleh
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[82px]">
                  Tgl.Created
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[92px]">
                  DiUpdate Oleh
                </th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[82px]">
                  Tgl.Update
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="text-center py-8 text-gray-500 italic bg-white"
                  >
                    Tidak ada data Sales Quotation
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handleEdit}
                      className={`cursor-pointer border-b border-[#D4D0C8] ${
                        isSelected
                          ? 'bg-[#DCEBFC] text-black'
                          : 'bg-white text-black hover:bg-[#F2F6FC]'
                      }`}
                    >
                      <td className="px-1 py-0.5 border-r border-[#ACA899] bg-[#ECE9D8] text-center text-[10px] font-bold text-black">
                        {isSelected ? '▸' : ''}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.noSq}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.tanggal}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.namaCustomer}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.sales}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.noInquiry}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">
                        {item.keterangan}
                      </td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 text-right whitespace-nowrap">
                        {item.amount}
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
              <option value="No. SQ">No. SQ</option>
              <option value="Sales">Sales</option>
              <option value="No. Inquiry">No. Inquiry</option>
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

        {/* Add New / Koreksi Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-[#ECE9D8] border-2 border-[#0A246A] shadow-2xl w-[460px] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
                <span>
                  {editingId
                    ? 'Koreksi Sales Quotation'
                    : 'Tambah Sales Quotation Baru'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="w-[16px] h-[16px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveNew} className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">No. SQ:</label>
                  <input
                    type="text"
                    value={newNoSq}
                    onChange={(e) => setNewNoSq(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">Tanggal:</label>
                  <input
                    type="text"
                    value={newTanggal}
                    onChange={(e) => setNewTanggal(e.target.value)}
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
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">Sales:</label>
                  <input
                    type="text"
                    value={newSales}
                    onChange={(e) => setNewSales(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">
                    No. Inquiry:
                  </label>
                  <input
                    type="text"
                    value={newNoInquiry}
                    onChange={(e) => setNewNoInquiry(e.target.value)}
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
                  <label className="font-semibold text-black">Amount:</label>
                  <input
                    type="text"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
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
