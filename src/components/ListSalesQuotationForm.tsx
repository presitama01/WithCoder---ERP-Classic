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

export interface SalesQuotationItem {
  id: string;
  noSq: string;
  tanggal: string;
  tanggalIso: string;
  namaCustomer: string;
  sales: string;
  noInquiry: string;
  keterangan: string;
  amount: string;
  amountNum: number;
  dibuatOleh: string;
  tglCreated: string;
  diUpdateOleh: string;
  tglUpdate: string;
}

interface ListSalesQuotationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToQuotation(r: any): SalesQuotationItem {
  const amtNum = Number(r.amount || 0);
  return {
    id: r.id,
    noSq: r.no_sq || '',
    tanggal: toDisplayDMyShort(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    namaCustomer: r.nama_customer || '',
    sales: r.sales || '',
    noInquiry: r.no_inquiry || '',
    keterangan: r.keterangan || '',
    amount: formatMoney(amtNum, true),
    amountNum: amtNum,
    dibuatOleh: r.dibuat_oleh || 'RETNO',
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diUpdateOleh: r.diupdate_oleh || '',
    tglUpdate: toDisplayDMyShort(r.tgl_update),
  };
}

export const ListSalesQuotationForm: React.FC<ListSalesQuotationFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [quotationList, setQuotationList] = useState<SalesQuotationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [tanggalFilter, setTanggalFilter] = useState<string>('');
  const [yellowNote, setYellowNote] = useState<string>('');

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [newNoSq, setNewNoSq] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('');
  const [newNoInquiry, setNewNoInquiry] = useState<string>('');
  const [newKeterangan, setNewKeterangan] = useState<string>('1. Price are Nett,');
  const [newAmount, setNewAmount] = useState<string>('0');

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadData = async (): Promise<boolean> => {
    try {
      setIsBusy(true);
      const rows = await erpList<any>('sales_quotations', { orderBy: 'tanggal', asc: false });
      const mapped = rows.map(mapDbToQuotation);
      setQuotationList(mapped);
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
    setNewNoSq(nextUniqueCode(quotationList.map((q) => q.noSq), '2608-SQ-', 3));
    setNewTanggal(toDisplayDMyShort(todayIso()));
    setNewCustomer('');
    setNewSales('');
    setNewNoInquiry('');
    setNewKeterangan('1. Price are Nett,');
    setNewAmount('0');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = quotationList.find((q) => q.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewNoSq(item.noSq);
    setNewTanggal(item.tanggal);
    setNewCustomer(item.namaCustomer);
    setNewSales(item.sales);
    setNewNoInquiry(item.noInquiry);
    setNewKeterangan(item.keterangan);
    setNewAmount(String(item.amountNum));
    setIsAddOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoSq.trim() || !newCustomer.trim()) {
      setModalError('No. SQ dan Nama Customer wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const payload = {
        no_sq: newNoSq.trim().toUpperCase(),
        tanggal: toIsoDate(newTanggal) || todayIso(),
        nama_customer: newCustomer.trim().toUpperCase(),
        sales: newSales.trim().toUpperCase(),
        no_inquiry: newNoInquiry.trim().toUpperCase(),
        keterangan: newKeterangan.trim(),
        amount: parseNum(newAmount),
      };

      if (editingId) {
        const saved = await erpUpdate<any>('sales_quotations', editingId, {
          ...payload,
          diupdate_oleh: 'RETNO',
          tgl_update: todayIso(),
        });
        const mapped = mapDbToQuotation(saved);
        setQuotationList(quotationList.map((item) => (item.id === editingId ? mapped : item)));
        showFeedback('Sales Quotation diperbarui');
      } else {
        const saved = await erpCreate<any>('sales_quotations', {
          ...payload,
          dibuat_oleh: 'RETNO',
          tgl_created: todayIso(),
        });
        const mapped = mapDbToQuotation(saved);
        setQuotationList([mapped, ...quotationList]);
        setSelectedId(mapped.id);
        showFeedback('Sales Quotation tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Sales Quotation';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('sales_quotations', id);
      const updated = quotationList.filter((item) => item.id !== id);
      setQuotationList(updated);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Sales Quotation dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter.trim() ? toIsoDate(tanggalFilter) : null;

  const filteredList = quotationList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    if (searchField === 'No. SQ') return item.noSq.toLowerCase().includes(term);
    if (searchField === 'Nama Pelanggan') return item.namaCustomer.toLowerCase().includes(term);
    if (searchField === 'Sales') return item.sales.toLowerCase().includes(term);
    if (searchField === 'No. Inquiry') return item.noInquiry.toLowerCase().includes(term);
    if (searchField === 'Keterangan') return item.keterangan.toLowerCase().includes(term);
    return (
      item.noSq.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.sales.toLowerCase().includes(term)
    );
  });

  const totalAmount = filteredList.reduce((sum, q) => sum + q.amountNum, 0);

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Sales_Quotation',
      sheetTitle: 'LIST SALES QUOTATION',
      subtitle: `Filter Tanggal: ${tanggalFilter || 'Semua'}`,
      companyProfile: company,
      columns: [
        { header: 'No. SQ', accessor: 'noSq' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'Sales', accessor: 'sales' },
        { header: 'No. Inquiry', accessor: 'noInquiry' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Amount', accessor: 'amountNum', align: 'right' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  return (
    <div
      id="list-sales-quotation-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Sales Quotation"
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
              onBaru={handleAddNew}
              onKoreksi={handleEdit}
              onHapus={() => (selectedId ? handleDelete(selectedId) : showFeedback('Pilih data yang akan dihapus'))}
              onPrint={() => setIsPrintOpen(true)}
              onFind={handleFind}
              isBusy={isBusy}
              feedback={feedback}
            />

            <div className="flex items-center space-x-1.5 pl-2">
              <span className="font-bold text-black text-[11px]">Tanggal :</span>
              <DatePickerInput
                value={tanggalFilter}
                onChange={(formatted) => setTanggalFilter(formatted)}
                format="dMyShort"
                placeholder="Semua"
              />
              <button
                type="button"
                onClick={() => setTanggalFilter('')}
                className="px-3 h-[22px] bg-[#EAE6D9] hover:bg-[#F4F1E8] border border-[#7A7A7A] shadow-2xs text-[11px] text-black cursor-pointer"
              >
                Semua
              </button>
            </div>
          </div>

          <div className="font-bold text-[15px] text-black pr-6">{formatRupiah(totalAmount)}</div>
        </div>

        <div className="flex-1 overflow-auto bg-[#F0F0F0] border border-[#808080] m-1.5 relative shadow-inner">
          <table className="border-collapse text-left min-w-[1120px] text-[11px]">
            <thead className="sticky top-0 bg-[#ECE9D8] text-black font-normal border-b border-[#ACA899] z-10">
              <tr>
                <th className="w-[22px] px-1 py-1 border-r border-[#ACA899] text-center bg-[#ECE9D8]" />
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[95px]">No. SQ</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[82px]">Tanggal</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[195px]">Nama Customer</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[76px]">Sales</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[92px]">No. Inquiry</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[135px]">Keterangan</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal text-right whitespace-nowrap w-[90px]">Amount</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[80px]">Dibuat Oleh</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[82px]">Tgl.Created</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[92px]">DiUpdate Oleh</th>
                <th className="px-2 py-1 border-r border-[#ACA899] font-normal whitespace-nowrap w-[82px]">Tgl.Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-gray-500 italic bg-white">
                    Tidak ada data Sales Quotation
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id);
                        setYellowNote(`${item.noSq} - ${item.namaCustomer}`);
                      }}
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
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.noSq}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.tanggal}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.namaCustomer}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.sales}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.noInquiry}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 whitespace-nowrap">{item.keterangan}</td>
                      <td className="px-2 py-0.5 border-r border-[#7A7A7A]/40 text-right whitespace-nowrap">{item.amount}</td>
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

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-[#ECE9D8] border-2 border-[#0A246A] shadow-2xl w-[460px] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
                <span>{editingId ? 'Koreksi Sales Quotation' : 'Tambah Sales Quotation Baru'}</span>
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
              <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">No. SQ:</label>
                  <input
                    type="text"
                    value={newNoSq}
                    onChange={(e) => setNewNoSq(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                    required
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
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">Sales:</label>
                  <input
                    type="text"
                    value={newSales}
                    onChange={(e) => setNewSales(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black">No. Inquiry:</label>
                  <input
                    type="text"
                    value={newNoInquiry}
                    onChange={(e) => setNewNoInquiry(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  />
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
                  <label className="font-semibold text-black">Amount (Rp):</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] font-mono text-right"
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
          title="LAPORAN SALES QUOTATION"
          subtitle={`Filter Tanggal: ${tanggalFilter || 'Semua'}`}
          orientation="landscape"
          columns={[
            { header: 'No. SQ', accessor: 'noSq', width: '105px' },
            { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '85px' },
            { header: 'Nama Customer', accessor: 'namaCustomer' },
            { header: 'Sales', accessor: 'sales', width: '85px' },
            { header: 'No. Inquiry', accessor: 'noInquiry', width: '100px' },
            { header: 'Keterangan', accessor: 'keterangan' },
            { header: 'Amount', accessor: 'amount', align: 'right', width: '105px' },
          ]}
          rows={filteredList}
          summaryItems={[
            { label: 'Total Quotation', value: `${filteredList.length} Dokumen` },
            { label: 'Total Amount', value: formatRupiah(totalAmount) },
          ]}
        />
      </div>
    </div>
  );
};
