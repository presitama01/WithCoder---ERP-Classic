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

export interface GiroDetailRow {
  id: string;
  no: string;
  idSupplier: string;
  supplier: string;
  noCekGiro: string;
  bank: string;
  due: string;
  amountPaid: string;
  keterangan: string;
  markedDelete: boolean;
}

interface GiroHeaderRecord {
  id: string;
  no_bukti: string;
  tanggal: string;
  total_amount: number;
  dibuat_oleh: string;
}

interface InputDaftarGiroFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const createEmptyRow = (index?: number): GiroDetailRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  no: index !== undefined ? String(index) : '',
  idSupplier: '',
  supplier: '',
  noCekGiro: '',
  bank: '',
  due: '',
  amountPaid: '',
  keterangan: '',
  markedDelete: false,
});

export const InputDaftarGiroForm: React.FC<InputDaftarGiroFormProps> = ({ isOpen, onClose }) => {
  const [headerId, setHeaderId] = useState<string>('');
  const [noBukti, setNoBukti] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(() => toDisplayDmy(todayIso()));

  const [rows, setRows] = useState<GiroDetailRow[]>([createEmptyRow(1)]);
  const [selectedId, setSelectedId] = useState<string>(() => rows[0]?.id || '');

  const [savedHeaders, setSavedHeaders] = useState<GiroHeaderRecord[]>([]);
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const findInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formRow, setFormRow] = useState<GiroDetailRow>(createEmptyRow(1));

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadHeaderDetails = async (hdr: GiroHeaderRecord) => {
    try {
      setIsBusy(true);
      const dets = await erpList<any>('giro_pembelian_details', {
        eq: { header_id: hdr.id },
        orderBy: 'no_urut',
        asc: true,
      });
      setHeaderId(hdr.id);
      setNoBukti(hdr.no_bukti);
      setTanggal(toDisplayDmy(hdr.tanggal) || toDisplayDmy(todayIso()));
      if (dets.length > 0) {
        const mapped: GiroDetailRow[] = dets.map((d, idx) => ({
          id: d.id || `${Date.now()}-${idx}`,
          no: String(d.no_urut ?? idx + 1),
          idSupplier: d.id_supplier || '',
          supplier: d.supplier || '',
          noCekGiro: d.no_cek_giro || '',
          bank: d.bank || '',
          due: toDisplayDmy(d.due),
          amountPaid: d.amount_paid ? String(d.amount_paid) : '',
          keterangan: d.keterangan || '',
          markedDelete: Boolean(d.marked_delete),
        }));
        setRows(mapped);
        setSelectedId(mapped[0].id);
      } else {
        const blank = createEmptyRow(1);
        setRows([blank]);
        setSelectedId(blank.id);
      }
    } catch (err: any) {
      showFeedback(`Gagal memuat detail: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const loadInitialData = async () => {
    try {
      setIsBusy(true);
      const headers = await erpList<GiroHeaderRecord>('giro_pembelian_headers', {
        orderBy: 'created_at',
        asc: false,
        limit: 100,
      });
      setSavedHeaders(headers);
      if (headers.length > 0) {
        await loadHeaderDetails(headers[0]);
      } else {
        const defaultNo = `GP/${new Date().getFullYear()}/001`;
        setHeaderId('');
        setNoBukti(defaultNo);
        setTanggal(toDisplayDmy(todayIso()));
        const blank = createEmptyRow(1);
        setRows([blank]);
        setSelectedId(blank.id);
      }
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCellChange = (id: string, field: keyof GiroDetailRow, value: string | boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const totalAmountPaid = rows.reduce(
    (sum, item) => sum + (item.markedDelete ? 0 : parseNum(item.amountPaid)),
    0
  );

  const handleSimpan = async () => {
    const cleanNoBukti = noBukti.trim().toUpperCase();
    if (!cleanNoBukti) {
      showFeedback('No.Bukti wajib diisi');
      return;
    }

    const activeRows = rows.filter(
      (r) =>
        !r.markedDelete &&
        (r.idSupplier.trim() ||
          r.supplier.trim() ||
          r.noCekGiro.trim() ||
          parseNum(r.amountPaid) > 0)
    );

    const computedTotal = activeRows.reduce((s, r) => s + parseNum(r.amountPaid), 0);

    try {
      setIsBusy(true);
      const headerPayload: Record<string, any> = {
        no_bukti: cleanNoBukti,
        tanggal: toIsoDate(tanggal) || todayIso(),
        total_amount: computedTotal,
        dibuat_oleh: 'RETNO',
      };
      if (headerId) headerPayload.id = headerId;

      const detailPayloads = activeRows.map((r, idx) => ({
        no_urut: parseInt(r.no, 10) || idx + 1,
        id_supplier: r.idSupplier.trim().toUpperCase(),
        supplier: r.supplier.trim().toUpperCase(),
        no_cek_giro: r.noCekGiro.trim().toUpperCase(),
        bank: r.bank.trim().toUpperCase(),
        due: toIsoDate(r.due),
        amount_paid: parseNum(r.amountPaid),
        keterangan: r.keterangan.trim(),
        marked_delete: false,
      }));

      const res = await erpCompositeSave<{ header: GiroHeaderRecord; details: any[] }>(
        'giro-pembelian',
        headerPayload,
        detailPayloads
      );

      if (res.header) {
        setHeaderId(res.header.id);
        setNoBukti(res.header.no_bukti);
        setTanggal(toDisplayDmy(res.header.tanggal));
      }

      if (res.details && res.details.length > 0) {
        const mapped: GiroDetailRow[] = res.details.map((d, idx) => ({
          id: d.id,
          no: String(d.no_urut ?? idx + 1),
          idSupplier: d.id_supplier || '',
          supplier: d.supplier || '',
          noCekGiro: d.no_cek_giro || '',
          bank: d.bank || '',
          due: toDisplayDmy(d.due),
          amountPaid: d.amount_paid ? String(d.amount_paid) : '',
          keterangan: d.keterangan || '',
          markedDelete: false,
        }));
        setRows(mapped);
        setSelectedId(mapped[0].id);
      } else {
        const blank = createEmptyRow(1);
        setRows([blank]);
        setSelectedId(blank.id);
      }

      const headers = await erpList<GiroHeaderRecord>('giro_pembelian_headers', {
        orderBy: 'created_at',
        asc: false,
        limit: 100,
      });
      setSavedHeaders(headers);
      showFeedback('Data Daftar Giro tersimpan ke Supabase');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleNewDocument = () => {
    const nextNum = savedHeaders.length + 1;
    setHeaderId('');
    setNoBukti(`GP/${new Date().getFullYear()}/${String(nextNum).padStart(3, '0')}`);
    setTanggal(toDisplayDmy(todayIso()));
    const blank = createEmptyRow(1);
    setRows([blank]);
    setSelectedId(blank.id);
    showFeedback('Form Dokumen Giro Baru siap diisi');
  };

  const handleAddNew = () => {
    const filledCount = rows.filter(
      (r) => r.idSupplier.trim() || r.supplier.trim() || r.noCekGiro.trim()
    ).length;
    setEditingId(null);
    setFormRow(createEmptyRow(filledCount + 1));
    setIsModalOpen(true);
  };

  const handleEdit = () => {
    const current = rows.find((r) => r.id === selectedId) || rows[0];
    if (!current) return;
    setEditingId(current.id);
    setFormRow({ ...current });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setRows((prev) =>
        prev.map((r) => (r.id === editingId ? { ...formRow, id: editingId } : r))
      );
      showFeedback('Baris giro diperbarui (Klik Simpan untuk commit DB)');
    } else {
      const isFirstBlank =
        rows.length === 1 &&
        !rows[0].idSupplier &&
        !rows[0].supplier &&
        !rows[0].noCekGiro &&
        !rows[0].amountPaid;

      const newEntry: GiroDetailRow = {
        ...formRow,
        id: `${Date.now()}`,
        no: formRow.no.trim() || String(isFirstBlank ? 1 : rows.length + 1),
      };

      if (isFirstBlank) {
        setRows([newEntry]);
      } else {
        setRows((prev) => [...prev, newEntry]);
      }
      setSelectedId(newEntry.id);
      showFeedback('Baris ditambahkan (Klik Simpan untuk commit DB)');
    }
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleHapus = async () => {
    const hasMarked = rows.some((r) => r.markedDelete);
    if (!hasMarked && rows.length <= 1 && headerId && !rows[0]?.supplier && !rows[0]?.noCekGiro) {
      // Delete whole voucher header when deleting empty header
      try {
        setIsBusy(true);
        await erpDelete('giro_pembelian_headers', headerId);
        showFeedback('Dokumen Giro dihapus dari database');
        await loadInitialData();
      } catch (err: any) {
        showFeedback(`Gagal hapus: ${err.message}`);
      } finally {
        setIsBusy(false);
      }
      return;
    }

    const remaining = hasMarked
      ? rows.filter((r) => !r.markedDelete)
      : rows.filter((r) => r.id !== selectedId);

    if (remaining.length === 0) {
      const blank = createEmptyRow(1);
      setRows([blank]);
      setSelectedId(blank.id);
    } else {
      setRows(remaining);
      setSelectedId(remaining[0].id);
    }
    showFeedback('Baris giro dihapus (Klik Simpan untuk sinkron DB)');
  };

  const handleOpenFind = async () => {
    setIsFindOpen(true);
    try {
      const headers = await erpList<GiroHeaderRecord>('giro_pembelian_headers', {
        orderBy: 'created_at',
        asc: false,
        limit: 100,
      });
      setSavedHeaders(headers);
    } catch {
      // keep existing
    }
    setTimeout(() => findInputRef.current?.focus(), 60);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: `Daftar_Giro_Pembelian_${noBukti || 'Baru'}`,
      sheetTitle: 'INPUT DAFTAR GIRO (PEMBELIAN)',
      subtitle: `No. Bukti: ${noBukti || '-'} | Tanggal: ${tanggal || '-'}`,
      companyProfile: company,
      columns: [
        { header: 'No.', accessor: 'no', align: 'center' },
        { header: 'ID Supplier', accessor: 'idSupplier' },
        { header: 'Supplier', accessor: 'supplier' },
        { header: 'No. Cek / Giro', accessor: 'noCekGiro' },
        { header: 'Bank', accessor: 'bank' },
        { header: 'Due', accessor: 'due', align: 'center' },
        { header: 'Amount Paid', accessor: (r) => parseNum(r.amountPaid), align: 'right' },
        { header: 'Keterangan', accessor: 'keterangan' },
      ],
      rows: rows.filter((r) => !r.markedDelete && (r.supplier || r.noCekGiro || r.amountPaid)),
    });
    showFeedback('Export Excel selesai');
  };

  const printableRows = rows.filter(
    (r) => !r.markedDelete && (r.idSupplier || r.supplier || r.noCekGiro || r.amountPaid)
  );

  const filteredHeaders = savedHeaders.filter((h) => {
    if (!findQuery.trim()) return true;
    const q = findQuery.toLowerCase();
    return h.no_bukti.toLowerCase().includes(q) || (h.tanggal || '').toLowerCase().includes(q);
  });

  return (
    <div
      id="input-daftar-giro-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="Input Daftar Giro (Pendaftaran Penerimaan Giro)"
          onClose={onClose}
          onFind={handleOpenFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadInitialData}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 h-[40px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-3 space-x-2 overflow-x-auto">
          <FormActionButtons
            compact
            onSimpan={handleSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleHapus}
            onPrint={() => setIsPrintOpen(true)}
            onFind={handleOpenFind}
            isBusy={isBusy}
            feedback={feedback}
          />
          <div className="h-[20px] w-[1px] bg-[#ACA899] mx-1" />
          <button
            type="button"
            onClick={handleNewDocument}
            className="h-[26px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] cursor-pointer text-[11px] font-semibold text-black whitespace-nowrap"
          >
            No.Bukti Baru
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-auto bg-[#ECE9D8] p-2.5">
          <div className="shrink-0 max-w-[920px] w-full bg-[#EFEFEF] border border-[#ACA899] shadow-[inset_1px_1px_0_#FFFFFF] px-4 py-2.5 mb-2 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <label
                htmlFor="giro-no-bukti"
                className="font-bold text-[11px] text-black whitespace-nowrap"
              >
                No.Bukti :
              </label>
              <input
                id="giro-no-bukti"
                type="text"
                value={noBukti}
                onChange={(e) => setNoBukti(e.target.value.toUpperCase())}
                className="w-[140px] h-[22px] bg-white border border-t-[#7F9DB9] border-l-[#7F9DB9] border-b-[#D4D0C8] border-r-[#D4D0C8] px-1.5 text-[11px] font-mono text-black outline-none focus:border-[#316AC5]"
              />
              <button
                type="button"
                onClick={handleOpenFind}
                className="h-[22px] px-2 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7F9DB9] text-[10px] font-bold cursor-pointer"
                title="Cari Dokumen Giro tersimpan"
              >
                Pilih...
              </button>
            </div>

            <div className="flex items-center space-x-2 pr-4">
              <label
                htmlFor="giro-tanggal"
                className="font-bold text-[11px] text-black whitespace-nowrap"
              >
                Tanggal :
              </label>
              <DatePickerInput
                id="giro-tanggal"
                value={tanggal}
                onChange={(formatted) => setTanggal(formatted)}
                format="dmy"
              />
            </div>
          </div>

          <div className="flex-1 min-h-[260px] max-w-[1040px] w-full bg-[#EFEFEF] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto bg-[#EFEFEF]">
              <div className="min-w-[920px] flex flex-col">
                <div className="h-[22px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-normal text-black tracking-wide">
                  GIRO / CEK / CASH DETAIL
                </div>

                <table className="w-full border-collapse text-left text-[11px] select-none bg-white">
                  <thead className="sticky top-0 z-10 bg-[#ECE9D8] text-black">
                    <tr className="h-[22px] border-b border-[#808080]">
                      <th className="w-[22px] min-w-[22px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                      <th className="w-[40px] min-w-[40px] border-r border-[#ACA899] px-1.5 font-normal text-center bg-[#ECE9D8]">No.</th>
                      <th className="w-[82px] min-w-[82px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">ID Supplier</th>
                      <th className="w-[190px] min-w-[190px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Supplier</th>
                      <th className="w-[115px] min-w-[115px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">No. Cek / Giro</th>
                      <th className="w-[95px] min-w-[95px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Bank</th>
                      <th className="w-[95px] min-w-[95px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Due</th>
                      <th className="w-[110px] min-w-[110px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Amount Paid</th>
                      <th className="min-w-[175px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Keterangan</th>
                      <th className="w-[56px] min-w-[56px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isSelected = selectedId === row.id;
                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedId(row.id)}
                          className="h-[22px] border-b border-[#ACA899] bg-white"
                        >
                          <td className="w-[22px] border-r border-[#ACA899] bg-[#ECE9D8] text-center font-bold text-black text-[13px] leading-none p-0">
                            {isSelected ? '*' : ''}
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.no}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) => handleCellChange(row.id, 'no', e.target.value)}
                              className="w-full h-[21px] px-1 text-center font-mono text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.idSupplier}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(row.id, 'idSupplier', e.target.value.toUpperCase())
                              }
                              className="w-full h-[21px] px-1.5 font-mono text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className={`border-r border-[#ACA899] p-0 ${isSelected ? 'bg-[#FFFF99]' : 'bg-white'}`}>
                            <input
                              type="text"
                              value={row.supplier}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(row.id, 'supplier', e.target.value.toUpperCase())
                              }
                              className={`w-full h-[21px] px-1.5 text-[11px] font-semibold outline-none ${
                                isSelected ? 'bg-[#FFFF99]' : 'bg-transparent focus:bg-[#FFFF99]'
                              }`}
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.noCekGiro}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(row.id, 'noCekGiro', e.target.value.toUpperCase())
                              }
                              className="w-full h-[21px] px-1.5 font-mono text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.bank}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(row.id, 'bank', e.target.value.toUpperCase())
                              }
                              className="w-full h-[21px] px-1.5 text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.due}
                              placeholder="dd-mm-yyyy"
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) => handleCellChange(row.id, 'due', e.target.value)}
                              className="w-full h-[21px] px-1.5 font-mono text-center text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.amountPaid}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) => handleCellChange(row.id, 'amountPaid', e.target.value)}
                              className="w-full h-[21px] px-1.5 font-mono text-right text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.keterangan}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) => handleCellChange(row.id, 'keterangan', e.target.value)}
                              className="w-full h-[21px] px-1.5 text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>
                          <td
                            className="border-r border-[#ACA899] text-center p-0 bg-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={row.markedDelete}
                              onChange={(e) =>
                                handleCellChange(row.id, 'markedDelete', e.target.checked)
                              }
                              aria-label="Tandai Hapus"
                              className="cursor-pointer align-middle"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="shrink-0 max-w-[1040px] w-full flex items-center justify-end space-x-2 pt-2 pr-6">
            <label
              htmlFor="giro-total-amount-paid"
              className="font-bold text-[11px] text-black whitespace-nowrap"
            >
              Total Amount Paid :
            </label>
            <input
              id="giro-total-amount-paid"
              type="text"
              readOnly
              value={formatRupiah(totalAmountPaid)}
              className="w-[180px] h-[22px] bg-white border border-t-[#7F9DB9] border-l-[#7F9DB9] border-b-[#D4D0C8] border-r-[#D4D0C8] px-2 text-right font-mono text-[11px] text-black font-bold outline-none"
            />
          </div>
        </div>
      </div>

      {/* Modal Add / Edit Giro Row */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl w-[500px] flex flex-col font-sans text-xs">
            <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between">
              <span className="font-bold text-[12px]">
                {editingId ? 'Koreksi Detail Giro' : 'Tambah Detail Giro Baru'}
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-[20px] h-[20px] bg-[#C00000] hover:bg-red-700 text-white font-bold flex items-center justify-center text-[11px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-4 space-y-2.5 text-[11px]">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-black mb-1">No.</label>
                  <input
                    type="text"
                    value={formRow.no}
                    onChange={(e) => setFormRow({ ...formRow, no: e.target.value })}
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-black mb-1">ID Supplier</label>
                  <input
                    type="text"
                    value={formRow.idSupplier}
                    onChange={(e) =>
                      setFormRow({ ...formRow, idSupplier: e.target.value.toUpperCase() })
                    }
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Supplier</label>
                <input
                  type="text"
                  required
                  value={formRow.supplier}
                  onChange={(e) =>
                    setFormRow({ ...formRow, supplier: e.target.value.toUpperCase() })
                  }
                  className="w-full h-[24px] px-2 bg-[#FFFF99] border border-[#7F9DB9] font-semibold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-black mb-1">No. Cek / Giro</label>
                  <input
                    type="text"
                    required
                    value={formRow.noCekGiro}
                    onChange={(e) =>
                      setFormRow({ ...formRow, noCekGiro: e.target.value.toUpperCase() })
                    }
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black mb-1">Bank</label>
                  <input
                    type="text"
                    value={formRow.bank}
                    onChange={(e) =>
                      setFormRow({ ...formRow, bank: e.target.value.toUpperCase() })
                    }
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-black mb-1">Due</label>
                  <DatePickerInput
                    value={formRow.due}
                    onChange={(formatted) => setFormRow({ ...formRow, due: formatted })}
                    format="dmy"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black mb-1">Amount Paid</label>
                  <input
                    type="number"
                    value={formRow.amountPaid}
                    onChange={(e) => setFormRow({ ...formRow, amountPaid: e.target.value })}
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Keterangan</label>
                <input
                  type="text"
                  value={formRow.keterangan}
                  onChange={(e) => setFormRow({ ...formRow, keterangan: e.target.value })}
                  className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ACA899]">
                <button
                  type="submit"
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] font-bold cursor-pointer"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal FIND Voucher Giro Pembelian */}
      {isFindOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[460px] flex flex-col text-xs">
            <div className="bg-[#000080] text-white px-3 py-1.5 flex items-center justify-between font-bold">
              <span>Cari Dokumen Giro Pembelian (Supabase)</span>
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
                ref={findInputRef}
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder="Ketik No.Bukti atau Tanggal..."
                className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9]"
              />
              <div className="h-[220px] overflow-auto bg-white border border-[#7F9DB9]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#ACA899]">
                    <tr>
                      <th className="px-2 py-1 border-r border-[#ACA899]">No. Bukti</th>
                      <th className="px-2 py-1 border-r border-[#ACA899]">Tanggal</th>
                      <th className="px-2 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHeaders.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-gray-500 italic">
                          Belum ada dokumen giro tersimpan
                        </td>
                      </tr>
                    ) : (
                      filteredHeaders.map((h) => (
                        <tr
                          key={h.id}
                          onClick={async () => {
                            await loadHeaderDetails(h);
                            setIsFindOpen(false);
                          }}
                          className="cursor-pointer border-b border-[#E0E0E0] hover:bg-[#316AC5] hover:text-white"
                        >
                          <td className="px-2 py-1 font-mono font-bold border-r border-[#E0E0E0]">
                            {h.no_bukti}
                          </td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">
                            {toDisplayDmy(h.tanggal)}
                          </td>
                          <td className="px-2 py-1 text-right font-mono">
                            {formatMoney(h.total_amount)}
                          </td>
                        </tr>
                      ))
                    )}
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
        title="BUKTI PENDAFTARAN GIRO PEMBELIAN"
        subtitle={`No. Bukti: ${noBukti || '-'}`}
        metaLines={[
          { label: 'No. Bukti', value: noBukti || '-' },
          { label: 'Tanggal', value: tanggal || '-' },
        ]}
        orientation="landscape"
        columns={[
          { header: 'ID Supplier', accessor: 'idSupplier', width: '75px' },
          { header: 'Supplier', accessor: 'supplier' },
          { header: 'No. Cek / Giro', accessor: 'noCekGiro', width: '110px' },
          { header: 'Bank', accessor: 'bank', width: '80px' },
          { header: 'Due', accessor: 'due', align: 'center', width: '85px' },
          {
            header: 'Amount Paid',
            accessor: (r) => formatMoney(r.amountPaid),
            align: 'right',
            width: '105px',
          },
          { header: 'Keterangan', accessor: 'keterangan' },
        ]}
        rows={printableRows}
        summaryItems={[
          {
            label: 'Total Amount Paid',
            value: formatRupiah(totalAmountPaid),
          },
        ]}
      />
    </div>
  );
};
