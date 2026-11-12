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
  toDisplayDMyShort,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

export interface SalesInquiryItem {
  id: string;
  noBukti: string;
  tanggalDo: string;
  tanggalDoIso: string;
  namaCustomer: string;
  namaSales: string;
  keterangan: string;
  follow: string;
  tglFollow: string;
  noSq: string;
  tglSq: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListSalesInquiryFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToInquiry(r: any): SalesInquiryItem {
  return {
    id: r.id,
    noBukti: r.no_bukti || '',
    tanggalDo: toDisplayDMyShort(r.tanggal_do),
    tanggalDoIso: toIsoDate(r.tanggal_do) || '',
    namaCustomer: r.nama_customer || '',
    namaSales: r.nama_sales || '',
    keterangan: r.keterangan || '',
    follow: r.follow || 'Follow',
    tglFollow: toDisplayDMyShort(r.tgl_follow) || '-',
    noSq: r.no_sq || '-',
    tglSq: toDisplayDMyShort(r.tgl_sq) || '-',
    dibuatOleh: r.dibuat_oleh || 'RETNO',
    tglCreated: toDisplayDMyShort(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDMyShort(r.tgl_update) || '-',
  };
}

export const ListSalesInquiryForm: React.FC<ListSalesInquiryFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [inquiryList, setInquiryList] = useState<SalesInquiryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [newNoBukti, setNewNoBukti] = useState<string>('');
  const [newTanggalDo, setNewTanggalDo] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newSales, setNewSales] = useState<string>('');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newFollow, setNewFollow] = useState<string>('Follow');
  const [newNoSq, setNewNoSq] = useState<string>('');
  const [newTglSq, setNewTglSq] = useState<string>('');

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadData = async () => {
    try {
      setIsBusy(true);
      const rows = await erpList<any>('sales_inquiries', { orderBy: 'tanggal_do', asc: false });
      const mapped = rows.map(mapDbToInquiry);
      setInquiryList(mapped);
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
    setNewNoBukti(`2608-SI-${String(inquiryList.length + 1).padStart(3, '0')}`);
    setNewTanggalDo(todayDisp);
    setNewCustomer('');
    setNewSales('');
    setNewKeterangan('');
    setNewFollow('Follow');
    setNewNoSq('');
    setNewTglSq(todayDisp);
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = inquiryList.find((i) => i.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setNewNoBukti(item.noBukti);
    setNewTanggalDo(item.tanggalDo);
    setNewCustomer(item.namaCustomer);
    setNewSales(item.namaSales);
    setNewKeterangan(item.keterangan);
    setNewFollow(item.follow);
    setNewNoSq(item.noSq === '-' ? '' : item.noSq);
    setNewTglSq(item.tglSq === '-' ? '' : item.tglSq);
    setIsAddOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoBukti.trim()) return;

    try {
      setIsBusy(true);
      const payload = {
        no_bukti: newNoBukti.trim().toUpperCase(),
        tanggal_do: toIsoDate(newTanggalDo) || todayIso(),
        nama_customer: newCustomer.trim().toUpperCase(),
        nama_sales: newSales.trim().toUpperCase(),
        keterangan: newKeterangan.trim(),
        follow: newFollow.trim(),
        no_sq: newNoSq.trim().toUpperCase(),
        tgl_sq: toIsoDate(newTglSq),
      };

      if (editingId) {
        const saved = await erpUpdate<any>('sales_inquiries', editingId, {
          ...payload,
          diupdate_oleh: 'RETNO',
          tgl_update: todayIso(),
        });
        const mapped = mapDbToInquiry(saved);
        setInquiryList(inquiryList.map((item) => (item.id === editingId ? mapped : item)));
        showFeedback('Sales Inquiry diperbarui');
      } else {
        const saved = await erpCreate<any>('sales_inquiries', {
          ...payload,
          dibuat_oleh: 'RETNO',
          tgl_created: todayIso(),
          diupdate_oleh: '-',
        });
        const mapped = mapDbToInquiry(saved);
        setInquiryList([mapped, ...inquiryList]);
        setSelectedId(mapped.id);
        showFeedback('Sales Inquiry tersimpan');
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
      await erpDelete('sales_inquiries', id);
      const updated = inquiryList.filter((item) => item.id !== id);
      setInquiryList(updated);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Sales Inquiry dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredList = inquiryList.filter((item) => {
    if (filterIso && item.tanggalDoIso !== filterIso) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'NoBukti') return item.noBukti.toLowerCase().includes(term);
    if (searchField === 'Nama Pelanggan') return item.namaCustomer.toLowerCase().includes(term);
    if (searchField === 'Nama Sales') return item.namaSales.toLowerCase().includes(term);
    if (searchField === 'No.SQ') return item.noSq.toLowerCase().includes(term);
    return (
      item.noBukti.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.namaSales.toLowerCase().includes(term)
    );
  });

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Sales_Inquiry',
      sheetTitle: 'LIST INQUIRY PENJUALAN',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'NoBukti', accessor: 'noBukti' },
        { header: 'Tanggal DO', accessor: 'tanggalDo', align: 'center' },
        { header: 'Nama Customer', accessor: 'namaCustomer' },
        { header: 'Nama Sales', accessor: 'namaSales' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Follow', accessor: 'follow' },
        { header: 'No. SQ', accessor: 'noSq' },
        { header: 'Tgl. SQ', accessor: 'tglSq', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  return (
    <div
      id="list-sales-inquiry-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="List Inquiry Penjualan"
        onClose={onClose}
        onFind={handleFind}
        onPrint={() => setIsPrintOpen(true)}
        onTableView={loadData}
        onExportExcel={handleExportExcel}
      />

      <div className="bg-[#ECE9D8] border-b border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs shadow-sm overflow-x-auto">
        <div className="flex items-center space-x-2">
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
          <div className="font-bold text-sm text-right px-3 py-0.5 bg-white border border-[#919191] min-w-[90px] shadow-inner">
            {filteredList.length} Inquiry
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-[#7A7A7A] m-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1300px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">NoBukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal DO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Follow</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl. Follow</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No. SQ</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Dibuat Oleh</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Created</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Diupdate Oleh</th>
              <th className="px-3 py-1.5">Tgl.Update</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item, index) => {
              const isSelected = selectedId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  onDoubleClick={handleEdit}
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
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noBukti}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tanggalDo}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-medium">{item.namaCustomer}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.namaSales}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.keterangan}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.follow}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglFollow}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1 font-mono">{item.noSq}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglSq}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.dibuatOleh}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#E0E0E0] px-3 py-1">{item.diupdateOleh}</td>
                  <td className="px-3 py-1">{item.tglUpdate}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={14} className="text-center py-6 text-gray-500">
                  Tidak ada data inquiry penjualan
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
            <option value="NoBukti">NoBukti</option>
            <option value="Nama Sales">Nama Sales</option>
            <option value="No.SQ">No.SQ</option>
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
            {inquiryList.find((r) => r.id === selectedId)?.keterangan || ''}
          </div>
          <div className="font-semibold px-2 py-0.5 bg-[#ECE9D8] border border-[#919191]">
            Record {filteredList.length}
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[500px] flex flex-col overflow-hidden">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
              <span>{editingId ? 'Koreksi Sales Inquiry' : 'Tambah Sales Inquiry Baru'}</span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-white hover:text-red-300 font-bold px-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNew} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No Bukti:</label>
                <input
                  type="text"
                  value={newNoBukti}
                  onChange={(e) => setNewNoBukti(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Tanggal DO:</label>
                <div className="col-span-2">
                  <DatePickerInput
                    value={newTanggalDo}
                    onChange={(formatted) => setNewTanggalDo(formatted)}
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
                <label className="font-semibold">Nama Sales:</label>
                <input
                  type="text"
                  value={newSales}
                  onChange={(e) => setNewSales(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
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
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Follow Status:</label>
                <input
                  type="text"
                  value={newFollow}
                  onChange={(e) => setNewFollow(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. SQ:</label>
                <input
                  type="text"
                  value={newNoSq}
                  onChange={(e) => setNewNoSq(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Tgl. SQ:</label>
                <div className="col-span-2">
                  <DatePickerInput
                    value={newTglSq}
                    onChange={(formatted) => setNewTglSq(formatted)}
                    format="dMyShort"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-[#D4D0C8]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
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
        title="LAPORAN INQUIRY PENJUALAN"
        subtitle={`Filter Tanggal: ${tanggalFilter}`}
        orientation="landscape"
        columns={[
          { header: 'NoBukti', accessor: 'noBukti', width: '110px' },
          { header: 'Tanggal DO', accessor: 'tanggalDo', align: 'center', width: '85px' },
          { header: 'Nama Customer', accessor: 'namaCustomer' },
          { header: 'Sales', accessor: 'namaSales', width: '90px' },
          { header: 'Follow', accessor: 'follow', width: '70px' },
          { header: 'No. SQ', accessor: 'noSq', width: '100px' },
          { header: 'Keterangan', accessor: 'keterangan' },
        ]}
        rows={filteredList}
        summaryItems={[{ label: 'Total Inquiry', value: `${filteredList.length} Dokumen` }]}
      />
    </div>
  );
};
