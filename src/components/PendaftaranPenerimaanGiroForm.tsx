import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  erpCompositeSave,
  erpDelete,
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
  parseNum,
  toDisplayDmy,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

export interface PenerimaanGiroItem {
  id: string;
  no: number;
  idCustomer: string;
  customer: string;
  noCekGiro: string;
  bank: string;
  due: string;
  amountPaid: number;
  keterangan: string;
}

interface GiroPenjualanHeader {
  id: string;
  no_bukti: string;
  tanggal: string;
  dibuat_oleh: string;
}

interface PendaftaranPenerimaanGiroFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PendaftaranPenerimaanGiroForm: React.FC<PendaftaranPenerimaanGiroFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [headerId, setHeaderId] = useState<string>('');
  const [noBukti, setNoBukti] = useState<string>('GIRO00001');
  const [tanggal, setTanggal] = useState<string>(() => toDisplayDmy(todayIso()));
  const [savedHeaders, setSavedHeaders] = useState<GiroPenjualanHeader[]>([]);
  const [headerIndex, setHeaderIndex] = useState<number>(0);

  const [giroList, setGiroList] = useState<PenerimaanGiroItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newIdCustomer, setNewIdCustomer] = useState<string>('CUS01');
  const [newCustomer, setNewCustomer] = useState<string>('');
  const [newNoCekGiro, setNewNoCekGiro] = useState<string>('');
  const [newBank, setNewBank] = useState<string>('');
  const [newDue, setNewDue] = useState<string>(() => toDisplayDmy(todayIso()));
  const [newAmountPaid, setNewAmountPaid] = useState<string>('0');
  const [newKeterangan, setNewKeterangan] = useState<string>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadHeaderDetails = async (hdr: GiroPenjualanHeader, idx = 0) => {
    try {
      setIsBusy(true);
      const dets = await erpList<any>('giro_penjualan_details', {
        eq: { header_id: hdr.id },
        orderBy: 'no_urut',
        asc: true,
      });
      setHeaderId(hdr.id);
      setHeaderIndex(idx);
      setNoBukti(hdr.no_bukti);
      setTanggal(toDisplayDmy(hdr.tanggal) || toDisplayDmy(todayIso()));

      const mapped: PenerimaanGiroItem[] = dets.map((d, i) => ({
        id: d.id,
        no: Number(d.no_urut ?? i + 1),
        idCustomer: d.id_customer || '',
        customer: d.customer || '',
        noCekGiro: d.no_cek_giro || '',
        bank: d.bank || '',
        due: toDisplayDmy(d.due),
        amountPaid: Number(d.amount_paid || 0),
        keterangan: d.keterangan || '',
      }));
      setGiroList(mapped);
      setSelectedId(mapped[0]?.id || '');
    } catch (err: any) {
      showFeedback(`Gagal load detail: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const loadInitialData = async () => {
    try {
      setIsBusy(true);
      const headers = await erpList<GiroPenjualanHeader>('giro_penjualan_headers', {
        orderBy: 'created_at',
        asc: false,
        limit: 100,
      });
      setSavedHeaders(headers);
      if (headers.length > 0) {
        await loadHeaderDetails(headers[0], 0);
      } else {
        setHeaderId('');
        setNoBukti('GIRO00001');
        setTanggal(toDisplayDmy(todayIso()));
        setGiroList([]);
        setSelectedId('');
      }
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadInitialData();
  }, [isOpen]);

  if (!isOpen) return null;

  const persistGiro = async (listToSave: PenerimaanGiroItem[]) => {
    const cleanNoBukti = noBukti.trim().toUpperCase();
    if (!cleanNoBukti) {
      showFeedback('No.Bukti wajib diisi');
      return;
    }

    try {
      setIsBusy(true);
      const headerPayload: Record<string, any> = {
        no_bukti: cleanNoBukti,
        tanggal: toIsoDate(tanggal) || todayIso(),
        dibuat_oleh: 'RETNO',
      };
      if (headerId) headerPayload.id = headerId;

      const detailPayloads = listToSave.map((item, idx) => ({
        no_urut: idx + 1,
        id_customer: item.idCustomer.trim().toUpperCase(),
        customer: item.customer.trim().toUpperCase(),
        no_cek_giro: item.noCekGiro.trim().toUpperCase(),
        bank: item.bank.trim().toUpperCase(),
        due: toIsoDate(item.due),
        amount_paid: parseNum(item.amountPaid),
        keterangan: item.keterangan.trim(),
      }));

      const res = await erpCompositeSave<{ header: GiroPenjualanHeader; details: any[] }>(
        'giro-penjualan',
        headerPayload,
        detailPayloads
      );

      if (res.header) {
        setHeaderId(res.header.id);
        setNoBukti(res.header.no_bukti);
        setTanggal(toDisplayDmy(res.header.tanggal));
      }

      const mapped: PenerimaanGiroItem[] = (res.details || []).map((d, i) => ({
        id: d.id,
        no: Number(d.no_urut ?? i + 1),
        idCustomer: d.id_customer || '',
        customer: d.customer || '',
        noCekGiro: d.no_cek_giro || '',
        bank: d.bank || '',
        due: toDisplayDmy(d.due),
        amountPaid: Number(d.amount_paid || 0),
        keterangan: d.keterangan || '',
      }));
      setGiroList(mapped);
      if (mapped.length > 0) setSelectedId(mapped[0].id);

      const headers = await erpList<GiroPenjualanHeader>('giro_penjualan_headers', {
        orderBy: 'created_at',
        asc: false,
        limit: 100,
      });
      setSavedHeaders(headers);
      showFeedback('Penerimaan Giro tersimpan ke Supabase');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleNewDocument = () => {
    setHeaderId('');
    setNoBukti(`GIRO${String(savedHeaders.length + 1).padStart(5, '0')}`);
    setTanggal(toDisplayDmy(todayIso()));
    setGiroList([]);
    setSelectedId('');
    showFeedback('Dokumen Giro Baru siap diisi');
  };

  const handleAddNew = () => {
    setEditingId(null);
    setNewIdCustomer(`CUS0${giroList.length + 1}`);
    setNewCustomer('');
    setNewNoCekGiro('');
    setNewBank('');
    setNewDue(toDisplayDmy(todayIso()));
    setNewAmountPaid('0');
    setNewKeterangan('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = giroList.find((g) => g.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setNewIdCustomer(item.idCustomer);
    setNewCustomer(item.customer);
    setNewNoCekGiro(item.noCekGiro);
    setNewBank(item.bank);
    setNewDue(item.due || toDisplayDmy(todayIso()));
    setNewAmountPaid(String(item.amountPaid));
    setNewKeterangan(item.keterangan);
    setIsAddOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.trim() || !newNoCekGiro.trim()) return;

    let nextList: PenerimaanGiroItem[];
    if (editingId) {
      nextList = giroList.map((g) =>
        g.id === editingId
          ? {
              ...g,
              idCustomer: newIdCustomer.trim().toUpperCase(),
              customer: newCustomer.trim().toUpperCase(),
              noCekGiro: newNoCekGiro.trim().toUpperCase(),
              bank: newBank.trim().toUpperCase(),
              due: newDue || g.due,
              amountPaid: parseNum(newAmountPaid),
              keterangan: newKeterangan.trim(),
            }
          : g
      );
    } else {
      const newItem: PenerimaanGiroItem = {
        id: Date.now().toString(),
        no: giroList.length + 1,
        idCustomer: newIdCustomer.trim().toUpperCase(),
        customer: newCustomer.trim().toUpperCase(),
        noCekGiro: newNoCekGiro.trim().toUpperCase(),
        bank: newBank.trim().toUpperCase(),
        due: newDue || toDisplayDmy(todayIso()),
        amountPaid: parseNum(newAmountPaid),
        keterangan: newKeterangan.trim(),
      };
      nextList = [...giroList, newItem];
    }

    setIsAddOpen(false);
    setEditingId(null);
    await persistGiro(nextList);
  };

  const handleDelete = async (id: string) => {
    const updated = giroList
      .filter((item) => item.id !== id)
      .map((item, idx) => ({ ...item, no: idx + 1 }));

    if (updated.length === 0 && headerId) {
      try {
        setIsBusy(true);
        await erpDelete('giro_penjualan_headers', headerId);
        showFeedback('Dokumen giro dihapus');
        await loadInitialData();
      } catch (err: any) {
        showFeedback(`Gagal hapus: ${err.message}`);
      } finally {
        setIsBusy(false);
      }
      return;
    }

    await persistGiro(updated);
  };

  const handlePrevHeader = async () => {
    if (savedHeaders.length === 0) return;
    const nextIdx = Math.min(savedHeaders.length - 1, headerIndex + 1);
    await loadHeaderDetails(savedHeaders[nextIdx], nextIdx);
  };

  const handleNextHeader = async () => {
    if (savedHeaders.length === 0) return;
    const prevIdx = Math.max(0, headerIndex - 1);
    await loadHeaderDetails(savedHeaders[prevIdx], prevIdx);
  };

  const filteredList = giroList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.customer.toLowerCase().includes(term) ||
      item.noCekGiro.toLowerCase().includes(term) ||
      item.bank.toLowerCase().includes(term) ||
      item.idCustomer.toLowerCase().includes(term)
    );
  });

  const totalAmountPaid = filteredList.reduce((sum, i) => sum + i.amountPaid, 0);

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: `Penerimaan_Giro_${noBukti}`,
      sheetTitle: 'PENDAFTARAN PENERIMAAN GIRO',
      subtitle: `No. Bukti: ${noBukti} | Tanggal: ${tanggal}`,
      companyProfile: company,
      columns: [
        { header: 'No.', accessor: 'no', align: 'center' },
        { header: 'ID Customer', accessor: 'idCustomer' },
        { header: 'Customer', accessor: 'customer' },
        { header: 'No. Cek / Giro', accessor: 'noCekGiro' },
        { header: 'Bank', accessor: 'bank' },
        { header: 'Due', accessor: 'due', align: 'center' },
        { header: 'Amount Paid', accessor: 'amountPaid', align: 'right' },
        { header: 'Keterangan', accessor: 'keterangan' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
  };

  const filteredHeaders = savedHeaders.filter((h) => {
    if (!findQuery.trim()) return true;
    const q = findQuery.toLowerCase();
    return h.no_bukti.toLowerCase().includes(q) || (h.tanggal || '').toLowerCase().includes(q);
  });

  return (
    <div
      id="pendaftaran-penerimaan-giro-form"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="Pendaftaran Penerimaan Giro"
          onClose={onClose}
          onFind={() => setIsFindOpen(true)}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadInitialData}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 bg-[#ECE9D8] border-b border-[#ACA899] px-3 py-2 flex items-center flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-black w-[65px]">No.Bukti :</span>
            <input
              type="text"
              value={noBukti}
              onChange={(e) => setNoBukti(e.target.value.toUpperCase())}
              className="px-2 py-0.5 bg-white border border-[#7F9DB9] rounded-[1px] text-black font-mono font-bold w-[130px]"
            />
            <button
              type="button"
              onClick={() => setIsFindOpen(true)}
              className="px-2 py-0.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7F9DB9] text-[10px] font-bold cursor-pointer"
            >
              Pilih...
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-black">Tanggal :</span>
            <DatePickerInput
              value={tanggal}
              onChange={(formatted) => setTanggal(formatted)}
              format="dmy"
            />
          </div>
          <div className="flex-1" />
          <div className="flex items-center space-x-1 px-2">
            <span className="text-gray-700">Cari:</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Customer / No Cek / Bank..."
              className="px-2 py-0.5 bg-white border border-[#7F9DB9] rounded-[1px] text-black text-xs w-[190px] focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="shrink-0 h-[44px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-3 space-x-2 overflow-x-auto">
          <FormActionButtons
            onSimpan={() => persistGiro(giroList)}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={() => selectedId && handleDelete(selectedId)}
            onPrint={() => setIsPrintOpen(true)}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />
          <div className="h-[20px] w-[1px] bg-[#ACA899] mx-1" />
          <button
            type="button"
            onClick={handleNewDocument}
            className="h-[28px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] cursor-pointer text-[11px] font-semibold"
          >
            No.Bukti Baru
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 bg-[#D4D0C8] relative">
          <div className="bg-white border border-[#7F9DB9] shadow-sm min-w-[980px] flex flex-col h-full">
            <div className="bg-[#EBEBE4] px-3 py-1 border-b border-[#7F9DB9] font-bold text-center text-gray-800 text-[11px]">
              GIRO / CEK / CASH DETAIL
            </div>

            <div className="overflow-auto flex-1 max-h-[calc(100vh-210px)]">
              <table className="w-full border-collapse text-left select-none text-[11px]">
                <thead>
                  <tr className="bg-gradient-to-b from-[#F2F2F2] to-[#DFDFDF] border-b border-[#7F9DB9] text-black font-semibold sticky top-0 z-10">
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[45px] text-center">No.</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[95px]">ID Customer</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] min-w-[210px]">Customer</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[130px]">No. Cek / Giro</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[150px]">Bank</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[95px] text-center">Due</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] w-[130px] text-right">Amount Paid</th>
                    <th className="py-1.5 px-2 border-r border-[#ACC0E9] min-w-[220px]">Keterangan</th>
                    <th className="py-1.5 px-2 w-[70px] text-center">Delete</th>
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
                        className={`cursor-pointer border-b border-gray-200 ${
                          isSelected
                            ? 'bg-[#316AC5] text-white'
                            : index % 2 === 0
                            ? 'bg-white hover:bg-[#F0F4F8]'
                            : 'bg-[#F9FBFD] hover:bg-[#F0F4F8]'
                        }`}
                      >
                        <td className="py-1 px-2 border-r border-gray-200 text-center font-mono">{item.no}</td>
                        <td className="py-1 px-2 border-r border-gray-200 font-mono">{item.idCustomer}</td>
                        <td className="py-1 px-2 border-r border-gray-200 font-semibold">{item.customer}</td>
                        <td className="py-1 px-2 border-r border-gray-200 font-mono">{item.noCekGiro}</td>
                        <td className="py-1 px-2 border-r border-gray-200">{item.bank}</td>
                        <td className="py-1 px-2 border-r border-gray-200 text-center font-mono">{item.due}</td>
                        <td className="py-1 px-2 border-r border-gray-200 text-right font-mono">
                          {formatRupiah(item.amountPaid)}
                        </td>
                        <td className="py-1 px-2 border-r border-gray-200">{item.keterangan}</td>
                        <td className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-gray-500 italic">
                        Tidak ada data pendaftaran penerimaan giro. Klik "+ Baru" untuk menambah.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 bg-[#ECE9D8] border-t border-[#7F9DB9] px-3 py-1.5 flex items-center justify-between text-[11px] text-gray-800">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrevHeader}
                  title="Voucher sebelumnya"
                  className="px-2 py-0.5 bg-[#D4D0C8] border border-[#707070] rounded text-black cursor-pointer font-bold"
                >
                  &lt;&lt;
                </button>
                <span className="px-3 py-0.5 bg-white border border-[#7F9DB9] font-bold text-black uppercase">
                  GIRO IN ({savedHeaders.length} Dokumen)
                </span>
                <button
                  type="button"
                  onClick={handleNextHeader}
                  title="Voucher berikutnya"
                  className="px-2 py-0.5 bg-[#D4D0C8] border border-[#707070] rounded text-black cursor-pointer font-bold"
                >
                  &gt;&gt;
                </button>
              </div>

              <div className="flex items-center space-x-2 font-bold font-mono">
                <span>Total Amount Paid :</span>
                <span className="px-3 py-0.5 bg-white border border-[#7F9DB9] text-right min-w-[140px] inline-block">
                  {formatRupiah(totalAmountPaid)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
            <div className="bg-[#ECE9D8] border-2 border-[#000000] shadow-2xl w-[520px] flex flex-col rounded-[2px] font-sans">
              <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between">
                <span className="font-bold text-sm">
                  {editingId ? 'Koreksi Pendaftaran Penerimaan Giro' : 'Tambah Pendaftaran Penerimaan Giro Baru'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-white hover:text-red-300 font-bold px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSaveNew} className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">ID Customer</label>
                    <input
                      type="text"
                      value={newIdCustomer}
                      onChange={(e) => setNewIdCustomer(e.target.value)}
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">No. Cek / Giro</label>
                    <input
                      type="text"
                      value={newNoCekGiro}
                      onChange={(e) => setNewNoCekGiro(e.target.value)}
                      placeholder="Cth: BG-778899"
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-800 font-semibold mb-1">Customer</label>
                  <input
                    type="text"
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    placeholder="Nama Perusahaan Customer..."
                    required
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-semibold uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Bank</label>
                    <input
                      type="text"
                      value={newBank}
                      onChange={(e) => setNewBank(e.target.value)}
                      placeholder="Cth: BCA / Mandiri..."
                      required
                      className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-800 font-semibold mb-1">Due (Jatuh Tempo)</label>
                    <DatePickerInput
                      value={newDue}
                      onChange={(formatted) => setNewDue(formatted)}
                      format="dmy"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-800 font-semibold mb-1">Amount Paid (Jumlah)</label>
                  <input
                    type="number"
                    value={newAmountPaid}
                    onChange={(e) => setNewAmountPaid(e.target.value)}
                    required
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black font-mono text-right"
                  />
                </div>

                <div>
                  <label className="block text-gray-800 font-semibold mb-1">Keterangan</label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    placeholder="Keterangan penerimaan giro..."
                    className="w-full px-2 py-1 bg-white border border-[#7F9DB9] rounded text-black"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-[#ACA899]">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-1.5 bg-[#D4D0C8] hover:bg-gray-300 border border-[#707070] rounded text-black font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="px-4 py-1.5 bg-[#0055EA] hover:bg-blue-700 text-white border border-blue-900 rounded font-semibold cursor-pointer shadow"
                  >
                    Simpan Giro
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isFindOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[460px] flex flex-col text-xs">
              <div className="bg-[#000080] text-white px-3 py-1.5 flex items-center justify-between font-bold">
                <span>Pilih Dokumen Penerimaan Giro</span>
                <button
                  type="button"
                  onClick={() => setIsFindOpen(false)}
                  className="px-1.5 bg-[#C00000] text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  placeholder="Cari No.Bukti / Tanggal..."
                  className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9]"
                />
                <div className="h-[220px] overflow-auto bg-white border border-[#7F9DB9]">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#ACA899]">
                      <tr>
                        <th className="px-2 py-1 border-r border-[#ACA899]">No.Bukti</th>
                        <th className="px-2 py-1">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHeaders.map((h, i) => (
                        <tr
                          key={h.id}
                          onClick={async () => {
                            await loadHeaderDetails(h, i);
                            setIsFindOpen(false);
                          }}
                          className="cursor-pointer border-b border-[#E0E0E0] hover:bg-[#316AC5] hover:text-white"
                        >
                          <td className="px-2 py-1 font-mono font-bold border-r border-[#E0E0E0]">
                            {h.no_bukti}
                          </td>
                          <td className="px-2 py-1">{toDisplayDmy(h.tanggal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsFindOpen(false)}
                    className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <A4PrintPreviewModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title="BUKTI PENDAFTARAN PENERIMAAN GIRO"
          subtitle={`No. Bukti: ${noBukti}`}
          metaLines={[
            { label: 'No. Bukti', value: noBukti },
            { label: 'Tanggal', value: tanggal },
          ]}
          orientation="landscape"
          columns={[
            { header: 'ID Customer', accessor: 'idCustomer', width: '80px' },
            { header: 'Customer', accessor: 'customer' },
            { header: 'No. Cek / Giro', accessor: 'noCekGiro', width: '110px' },
            { header: 'Bank', accessor: 'bank', width: '110px' },
            { header: 'Due', accessor: 'due', align: 'center', width: '85px' },
            {
              header: 'Amount Paid',
              accessor: (r) => formatMoney(r.amountPaid),
              align: 'right',
              width: '105px',
            },
            { header: 'Keterangan', accessor: 'keterangan' },
          ]}
          rows={filteredList}
          summaryItems={[
            { label: 'Total Amount Paid', value: formatRupiah(totalAmountPaid) },
          ]}
        />
      </div>
    </div>
  );
};
