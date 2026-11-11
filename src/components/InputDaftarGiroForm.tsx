import React, { useState, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';

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
  const [noBukti, setNoBukti] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>('');
  const datePickerRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<GiroDetailRow[]>([createEmptyRow()]);
  const [selectedId, setSelectedId] = useState<string>(() => rows[0]?.id || '');

  // Optional modal for + Baru / Koreksi button workflow
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formRow, setFormRow] = useState<GiroDetailRow>(createEmptyRow(1));
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleCellChange = (id: string, field: keyof GiroDetailRow, value: string | boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleTanggalMaskInput = (raw: string) => {
    const cleaned = raw.replace(/[^0-9-]/g, '').slice(0, 10);
    setTanggal(cleaned);
  };

  const handleDatePickerChange = (isoDate: string) => {
    if (!isoDate) return;
    const [yyyy, mm, dd] = isoDate.split('-');
    if (yyyy && mm && dd) {
      setTanggal(`${dd}-${mm}-${yyyy}`);
    }
  };

  const handleSimpan = () => {
    const hasDeletedChecked = rows.some((r) => r.markedDelete);
    if (hasDeletedChecked) {
      const remaining = rows.filter((r) => !r.markedDelete);
      const nextRows = remaining.length > 0 ? remaining : [createEmptyRow()];
      setRows(nextRows);
      setSelectedId(nextRows[0].id);
    }
    showFeedback('Data Daftar Giro tersimpan');
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
      showFeedback('Baris giro diperbarui');
    } else {
      const isFirstBlank =
        rows.length === 1 &&
        !rows[0].no &&
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
      showFeedback('Baris giro ditambahkan');
    }
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleHapus = () => {
    const hasMarked = rows.some((r) => r.markedDelete);
    const remaining = hasMarked
      ? rows.filter((r) => !r.markedDelete)
      : rows.filter((r) => r.id !== selectedId);

    if (remaining.length === 0) {
      const blank = createEmptyRow();
      setRows([blank]);
      setSelectedId(blank.id);
    } else {
      setRows(remaining);
      setSelectedId(remaining[0].id);
    }
    showFeedback('Baris giro dihapus');
  };

  const parseNumericAmount = (val: string): number => {
    const normalized = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const totalAmountPaid = rows.reduce(
    (sum, item) => sum + (item.markedDelete ? 0 : parseNumericAmount(item.amountPaid)),
    0
  );

  return (
    <div
      id="input-daftar-giro-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner */}
        <FormHeaderBanner
          title="Input Daftar Giro (Pendaftaran Penerimaan Giro)"
          onClose={onClose}
          onExportExcel={() => showFeedback('Export Excel selesai')}
        />

        {/* 2. Toolbar Aksi (Simpan, + Baru, Koreksi, Hapus) */}
        <div className="shrink-0 h-[40px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-3 space-x-2 overflow-x-auto">
          <FormActionButtons
            compact
            onSimpan={handleSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleHapus}
            feedback={feedback}
          />
        </div>

        {/* 3. Classic Desktop Form Body */}
        <div className="flex-1 flex flex-col overflow-auto bg-[#ECE9D8] p-2.5">
          {/* Header Input Box (No.Bukti & Tanggal) */}
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
                onChange={(e) => setNoBukti(e.target.value)}
                className="w-[100px] h-[22px] bg-white border border-t-[#7F9DB9] border-l-[#7F9DB9] border-b-[#D4D0C8] border-r-[#D4D0C8] px-1.5 text-[11px] font-mono text-black outline-none focus:border-[#316AC5]"
              />
            </div>

            <div className="flex items-center space-x-2 pr-4">
              <label
                htmlFor="giro-tanggal"
                className="font-bold text-[11px] text-black whitespace-nowrap"
              >
                Tanggal :
              </label>
              <div className="relative flex items-center">
                <input
                  id="giro-tanggal"
                  type="text"
                  value={tanggal}
                  onChange={(e) => handleTanggalMaskInput(e.target.value)}
                  placeholder="__-__-____"
                  className="w-[84px] h-[22px] bg-white border border-t-[#7F9DB9] border-l-[#7F9DB9] border-b-[#D4D0C8] border-r-[#D4D0C8] px-1.5 text-[11px] font-mono text-black outline-none focus:border-[#316AC5]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (datePickerRef.current?.showPicker) {
                      datePickerRef.current.showPicker();
                    } else {
                      datePickerRef.current?.click();
                    }
                  }}
                  title="Pilih Tanggal"
                  className="w-[18px] h-[22px] bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-l-0 border-[#7F9DB9] flex items-center justify-center text-[8px] text-black cursor-pointer"
                >
                  ▼
                </button>
                <input
                  ref={datePickerRef}
                  type="date"
                  onChange={(e) => handleDatePickerChange(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>
            </div>
          </div>

          {/* Grid Panel Container with Scrollbars */}
          <div className="flex-1 min-h-[260px] max-w-[1040px] w-full bg-[#EFEFEF] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white flex flex-col overflow-hidden">
            {/* Scrollable Table Container */}
            <div className="flex-1 overflow-auto bg-[#EFEFEF]">
              <div className="min-w-[920px] flex flex-col">
                {/* Centered Group Title Header */}
                <div className="h-[22px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-normal text-black tracking-wide">
                  GIRO / CEK / CASH DETAIL
                </div>

                <table className="w-full border-collapse text-left text-[11px] select-none bg-white">
                  <thead className="sticky top-0 z-10 bg-[#ECE9D8] text-black">
                    <tr className="h-[22px] border-b border-[#808080]">
                      <th className="w-[22px] min-w-[22px] border-r border-[#ACA899] bg-[#ECE9D8] p-0" />
                      <th className="w-[40px] min-w-[40px] border-r border-[#ACA899] px-1.5 font-normal text-center bg-[#ECE9D8]">
                        No.
                      </th>
                      <th className="w-[82px] min-w-[82px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">
                        ID Supplier
                      </th>
                      <th className="w-[190px] min-w-[190px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">
                        Supplier
                      </th>
                      <th className="w-[115px] min-w-[115px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">
                        No. Cek / Giro
                      </th>
                      <th className="w-[95px] min-w-[95px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">
                        Bank
                      </th>
                      <th className="w-[95px] min-w-[95px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">
                        Due
                      </th>
                      <th className="w-[110px] min-w-[110px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">
                        Amount Paid
                      </th>
                      <th className="min-w-[175px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">
                        Keterangan
                      </th>
                      <th className="w-[56px] min-w-[56px] border-r border-[#ACA899] px-2 font-normal text-center bg-[#ECE9D8]">
                        Delete
                      </th>
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
                          {/* Row Selector Marker (*) */}
                          <td className="w-[22px] border-r border-[#ACA899] bg-[#ECE9D8] text-center font-bold text-black text-[13px] leading-none p-0">
                            {isSelected ? '*' : ''}
                          </td>

                          {/* No. */}
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.no}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) => handleCellChange(row.id, 'no', e.target.value)}
                              className="w-full h-[21px] px-1 text-center font-mono text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>

                          {/* ID Supplier */}
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

                          {/* Supplier (highlighted pale yellow on active row matching reference) */}
                          <td
                            className={`border-r border-[#ACA899] p-0 ${
                              isSelected ? 'bg-[#FFFF99]' : 'bg-white'
                            }`}
                          >
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

                          {/* No. Cek / Giro */}
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

                          {/* Bank */}
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

                          {/* Due */}
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.due}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) => handleCellChange(row.id, 'due', e.target.value)}
                              className="w-full h-[21px] px-1.5 font-mono text-center text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>

                          {/* Amount Paid */}
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.amountPaid}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(row.id, 'amountPaid', e.target.value)
                              }
                              className="w-full h-[21px] px-1.5 font-mono text-right text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>

                          {/* Keterangan */}
                          <td className="border-r border-[#ACA899] p-0">
                            <input
                              type="text"
                              value={row.keterangan}
                              onFocus={() => setSelectedId(row.id)}
                              onChange={(e) =>
                                handleCellChange(row.id, 'keterangan', e.target.value)
                              }
                              className="w-full h-[21px] px-1.5 text-[11px] bg-transparent outline-none focus:bg-[#E8F1FF]"
                            />
                          </td>

                          {/* Delete Checkbox */}
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

          {/* Bottom Total Amount Paid Bar (matching reference layout) */}
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
              value={`Rp ${totalAmountPaid.toLocaleString('id-ID')}`}
              className="w-[180px] h-[22px] bg-white border border-t-[#7F9DB9] border-l-[#7F9DB9] border-b-[#D4D0C8] border-r-[#D4D0C8] px-2 text-right font-mono text-[11px] text-gray-600 outline-none"
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
                  <input
                    type="text"
                    placeholder="dd-mm-yyyy"
                    value={formRow.due}
                    onChange={(e) => setFormRow({ ...formRow, due: e.target.value })}
                    className="w-full h-[24px] px-2 bg-white border border-[#7F9DB9] font-mono"
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
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] font-bold active:border-t-[#707070] active:border-b-white cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:border-t-[#707070] active:border-b-white cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
