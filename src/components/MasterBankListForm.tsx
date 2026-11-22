import React, { useState, useRef, useEffect } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { erpCreate, erpDelete, erpList, erpUpdate, fetchActiveCompanyProfile, formatMoney, parseNum } from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';
import { ConfirmDialog } from './ConfirmDialog';
import { cascadeMasterRename, checkMasterUsage, isMissingColumnError } from '../lib/masterValidation';

export interface BankItem {
  id: string;
  accNumber: string;
  accName: string;
  namaBank: string;
  cabang: string;
  mataUang: string;
  jenisRekening: string;
  saldoAwal: number;
  isActive: boolean;
}

function mapDbToBank(r: any): BankItem {
  return {
    id: r.id,
    accNumber: r.acc_number || '',
    accName: r.acc_name || '',
    namaBank: r.nama_bank || '',
    cabang: r.cabang || '',
    mataUang: r.mata_uang || 'IDR',
    jenisRekening: r.jenis_rekening || 'OPERASIONAL',
    saldoAwal: Number(r.saldo_awal || 0),
    isActive: r.is_active !== false,
  };
}

interface MasterBankListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterBankListForm: React.FC<MasterBankListFormProps> = ({ isOpen, onClose }) => {
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [isFindOpen, setIsFindOpen] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccName, setNewAccName] = useState('PT. UNIMETRIKA UTAMA');
  const [newNamaBank, setNewNamaBank] = useState('');
  const [newCabang, setNewCabang] = useState('');
  const [newMataUang, setNewMataUang] = useState('IDR');
  const [newJenisRekening, setNewJenisRekening] = useState('OPERASIONAL');
  const [newSaldoAwal, setNewSaldoAwal] = useState('0');
  const [newIsActive, setNewIsActive] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'acc_number',
    'Acc Number': 'acc_number',
    'Acc Name': 'acc_name',
    'Nama Bank': 'nama_bank',
    Cabang: 'cabang',
  };

  const loadData = async (opts?: { field?: string; term?: string }): Promise<BankItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = { orderBy: 'nama_bank', asc: true, limit: 1000 };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch = 'acc_number,acc_name,nama_bank,cabang';
          queryOpts.searchVal = activeTerm;
        }
      }
      const rows = await erpList<any>('master_banks', queryOpts);
      const mapped: BankItem[] = rows.map(mapDbToBank);
      setBanks(mapped);
      if (mapped.length > 0 && !mapped.some((b) => b.id === selectedId)) {
        setSelectedId(mapped[0].id);
      } else if (mapped.length === 0) {
        setSelectedId('');
      }
      return mapped;
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarSimpan = async () => {
    const selected = banks.find((b) => b.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record yang akan disimpan terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const basePayload = {
        acc_number: selected.accNumber.trim(),
        acc_name: selected.accName.trim().toUpperCase(),
        nama_bank: selected.namaBank.trim().toUpperCase(),
        cabang: selected.cabang.trim().toUpperCase(),
      };
      let saved: any;
      let usedFallback = false;
      try {
        saved = await erpUpdate<any>('master_banks', selected.id, {
          ...basePayload,
          mata_uang: selected.mataUang || 'IDR',
          jenis_rekening: selected.jenisRekening || 'OPERASIONAL',
          saldo_awal: Number(selected.saldoAwal) || 0,
          is_active: selected.isActive,
        });
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          saved = await erpUpdate<any>('master_banks', selected.id, basePayload);
        } else {
          throw err;
        }
      }
      const mapped = mapDbToBank(saved);
      setBanks((prev) => prev.map((b) => (b.id === selected.id ? mapped : b)));
      showFeedback(
        usedFallback
          ? `Rekening [${mapped.accNumber}] tersimpan (jalankan SQL migrasi untuk kolom tambahan)`
          : `Rekening [${mapped.accNumber} - ${mapped.namaBank}] tersimpan ke Supabase`
      );
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNew = async () => {
    setEditingId(null);
    setModalError(null);
    setNewAccNumber('');
    const company = await fetchActiveCompanyProfile();
    setNewAccName(company.company_name || 'PT. UNIMETRIKA UTAMA');
    setNewNamaBank('');
    setNewCabang('');
    setNewMataUang('IDR');
    setNewJenisRekening('OPERASIONAL');
    setNewSaldoAwal('0');
    setNewIsActive(true);
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = banks.find((b) => b.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewAccNumber(item.accNumber);
    setNewAccName(item.accName);
    setNewNamaBank(item.namaBank);
    setNewCabang(item.cabang);
    setNewMataUang(item.mataUang || 'IDR');
    setNewJenisRekening(item.jenisRekening || 'OPERASIONAL');
    setNewSaldoAwal(String(item.saldoAwal ?? 0));
    setNewIsActive(item.isActive !== false);
    setIsAddOpen(true);
  };

  const handleRequestDelete = async () => {
    const item = banks.find((b) => b.id === selectedId);
    if (!item) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    try {
      setIsBusy(true);
      const usageMsg = await checkMasterUsage([
        { table: 'giro_pembelian_details', label: 'Daftar Giro Pembelian', eq: { bank: item.namaBank } },
        { table: 'giro_penjualan_details', label: 'Penerimaan Giro Penjualan', eq: { bank: item.namaBank } },
      ]);
      if (usageMsg) {
        showFeedback(usageMsg);
        return;
      }
      setConfirmDeleteOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal cek referensi: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedId) return;
    try {
      setIsBusy(true);
      await erpDelete('master_banks', selectedId);
      const updated = banks.filter((b) => b.id !== selectedId);
      setBanks(updated);
      setSelectedId(updated[0]?.id || '');
      setConfirmDeleteOpen(false);
      showFeedback('Data rekening bank dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const cleanAcc = newAccNumber.trim();
    const cleanAccName = newAccName.trim().toUpperCase();
    const cleanBank = newNamaBank.trim().toUpperCase();
    if (!cleanAcc || !cleanAccName || !cleanBank) {
      setModalError('Acc Number, Acc Name, dan Nama Bank wajib diisi.');
      return;
    }
    if (banks.some((b) => b.accNumber.toLowerCase() === cleanAcc.toLowerCase() && b.id !== editingId)) {
      setModalError(`Acc Number [${cleanAcc}] sudah terdaftar.`);
      return;
    }
    const saldoAwalVal = parseNum(newSaldoAwal);
    if (saldoAwalVal < 0) {
      setModalError('Saldo Awal tidak boleh bernilai negatif.');
      return;
    }

    try {
      setIsBusy(true);
      const basePayload = {
        acc_number: cleanAcc,
        acc_name: cleanAccName,
        nama_bank: cleanBank,
        cabang: newCabang.trim().toUpperCase(),
      };
      const fullPayload = {
        ...basePayload,
        mata_uang: newMataUang.trim().toUpperCase() || 'IDR',
        jenis_rekening: newJenisRekening.trim().toUpperCase() || 'OPERASIONAL',
        saldo_awal: saldoAwalVal,
        is_active: newIsActive,
      };
      let saved: any;
      let usedFallback = false;
      const saveFn = async (payload: Record<string, any>) =>
        editingId
          ? erpUpdate<any>('master_banks', editingId, payload)
          : erpCreate<any>('master_banks', payload);
      try {
        saved = await saveFn(fullPayload);
      } catch (err: any) {
        if (isMissingColumnError(err?.message || '')) {
          usedFallback = true;
          saved = await saveFn(basePayload);
        } else {
          throw err;
        }
      }
      const mapped = mapDbToBank(saved);
      if (editingId) {
        const prevItem = banks.find((b) => b.id === editingId);
        setBanks((prev) =>
          prev
            .map((b) => (b.id === editingId ? mapped : b))
            .sort((a, b) => a.namaBank.localeCompare(b.namaBank))
        );
        if (prevItem && prevItem.namaBank !== mapped.namaBank) {
          await Promise.all([
            cascadeMasterRename('giro_pembelian_details', 'bank', prevItem.namaBank, { bank: mapped.namaBank }),
            cascadeMasterRename('giro_penjualan_details', 'bank', prevItem.namaBank, { bank: mapped.namaBank }),
          ]);
        }
        showFeedback(
          usedFallback
            ? 'Data diperbarui (jalankan SQL migrasi untuk kolom tambahan Bank)'
            : 'Data diperbarui'
        );
      } else {
        setBanks((prev) => [mapped, ...prev].sort((a, b) => a.namaBank.localeCompare(b.namaBank)));
        setSelectedId(mapped.id);
        showFeedback(
          usedFallback
            ? 'Data tersimpan (jalankan SQL migrasi untuk kolom tambahan Bank)'
            : 'Data tersimpan'
        );
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan data ke database';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filteredBanks = banks.filter((item) => {
    if (searchField === 'Kode' || searchField === 'Acc Number') return matchesMultiKeyword([item.accNumber], searchTerm);
    if (searchField === 'Acc Name') return matchesMultiKeyword([item.accName], searchTerm);
    if (searchField === 'Nama Bank') return matchesMultiKeyword([item.namaBank], searchTerm);
    if (searchField === 'Cabang') return matchesMultiKeyword([item.cabang], searchTerm);
    return matchesMultiKeyword([item.accNumber, item.accName, item.namaBank, item.cabang], searchTerm);
  });

  const selectedBank =
    filteredBanks.find((b) => b.id === selectedId) ||
    banks.find((b) => b.id === selectedId) ||
    null;

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} Rekening Bank dari Supabase`
          : 'Data Rekening Bank tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Bank)`);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Master_Bank',
      sheetTitle: 'LIST MASTER REKENING BANK',
      companyProfile: company,
      columns: [
        { header: 'Acc Number', accessor: 'accNumber' },
        { header: 'Acc Name', accessor: 'accName' },
        { header: 'Nama Bank', accessor: 'namaBank' },
        { header: 'Cabang', accessor: 'cabang' },
        { header: 'Mata Uang', accessor: 'mataUang' },
        { header: 'Jenis Rekening', accessor: 'jenisRekening' },
        { header: 'Saldo Awal', accessor: 'saldoAwal', align: 'right' },
        { header: 'Status', accessor: (r) => (r.isActive ? 'AKTIF' : 'NON-AKTIF') },
      ],
      rows: filteredBanks,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  return (
    <div
      id="master-bank-list-form"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Master Bank"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={() => loadData({ field: searchField, term: searchTerm })}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 flex items-center h-[48px] px-3 space-x-3 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans overflow-x-auto">
          <FormActionButtons
            onSimpan={handleToolbarSimpan}
            onBaru={handleAddNew}
            onKoreksi={handleEdit}
            onHapus={handleRequestDelete}
            onPrint={() => setIsPrintOpen(true)}
            onFind={handleFind}
            isBusy={isBusy}
            feedback={feedback}
          />

          <ToolbarSearchControl
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onCari={handleExecuteCari}
            onReset={handleResetCari}
            inputRef={searchInputRef}
            isBusy={isBusy}
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode (Acc Number)' },
              { value: 'Nama Bank', label: 'Nama Bank' },
              { value: 'Acc Name', label: 'Acc Name' },
              { value: 'Cabang', label: 'Cabang' },
            ]}
          />
        </div>

        <div className="flex-1 flex flex-col p-2 overflow-hidden bg-[#ECE9D8]">
          <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-[#ECE9D8] overflow-hidden shadow-inner">
            <div className="shrink-0 h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-sans font-normal text-black select-none">
              List
            </div>

            <div ref={tableContainerRef} className="flex-1 overflow-auto bg-white border border-[#7F9DB9] relative select-none">
              <table className="w-full min-w-[980px] border-collapse text-[11px] font-sans">
                <thead className="bg-[#ECE9D8] sticky top-0 z-10">
                  <tr className="h-[22px] text-left border-b border-[#ACA899]">
                    <th className="py-1 px-3 border-r border-[#ACA899] font-bold text-black w-[150px]">Acc Number</th>
                    <th className="py-1 px-3 border-r border-[#ACA899] font-bold text-black w-[220px]">Acc Name</th>
                    <th className="py-1 px-3 border-r border-[#ACA899] font-bold text-black w-[150px]">Nama Bank</th>
                    <th className="py-1 px-3 border-r border-[#ACA899] font-bold text-black w-[150px]">Cabang</th>
                    <th className="py-1 px-2 border-r border-[#ACA899] font-bold text-black w-[70px] text-center">Curr</th>
                    <th className="py-1 px-2 border-r border-[#ACA899] font-bold text-black w-[110px]">Jenis</th>
                    <th className="py-1 px-3 border-r border-[#ACA899] font-bold text-black w-[120px] text-right">Saldo Awal</th>
                    <th className="py-1 px-2 font-bold text-black w-[75px] text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBanks.map((item, index) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        onDoubleClick={handleEdit}
                        className={`cursor-pointer h-[22px] ${
                          isSelected
                            ? 'bg-[#316AC5] text-white'
                            : !item.isActive
                            ? 'bg-[#F3F3F3] text-gray-500 hover:bg-[#F0F4F8]'
                            : index % 2 === 0
                            ? 'bg-white hover:bg-[#F0F4F8]'
                            : 'bg-[#F9F9F9] hover:bg-[#F0F4F8]'
                        }`}
                      >
                        <td className={`py-0.5 px-3 border-r font-mono ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.accNumber}
                        </td>
                        <td className={`py-0.5 px-3 border-r ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.accName}
                        </td>
                        <td className={`py-0.5 px-3 border-r font-semibold ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.namaBank}
                        </td>
                        <td className={`py-0.5 px-3 border-r ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.cabang}
                        </td>
                        <td className={`py-0.5 px-2 border-r text-center font-mono ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.mataUang}
                        </td>
                        <td className={`py-0.5 px-2 border-r ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.jenisRekening}
                        </td>
                        <td className={`py-0.5 px-3 border-r text-right font-mono ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {formatMoney(item.saldoAwal)}
                        </td>
                        <td className="py-0.5 px-2 text-center text-[10px] font-bold">
                          {item.isActive ? 'AKTIF' : 'NON-AKTIF'}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBanks.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-gray-500 italic">
                        Tidak ada data rekening bank yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="h-[26px] bg-[#ECE9D8] border-t border-[#999999] px-3 flex items-center justify-between text-[11px] font-sans text-[#333333]">
          <div className="flex items-center space-x-2">
            <div className="w-[380px] max-w-[55vw] truncate h-[20px] bg-white border border-[#7F9DB9] px-2 flex items-center text-gray-700">
              {selectedBank ? `Rekening Terpilih: ${selectedBank.accNumber} - ${selectedBank.namaBank}` : 'Pilih rekening bank...'}
            </div>
            <span className="border border-[#7F9DB9] px-2 py-0.5 bg-white/60">
              Record: {filteredBanks.length} of {banks.length}
            </span>
          </div>
          <div className="text-gray-600">MASTER -&gt; Rekening Bank</div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#ECE9D8] w-[460px] max-w-[95vw] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl flex flex-col font-sans">
              <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-3 py-1.5 flex justify-between items-center text-xs font-bold">
                <span>{editingId ? 'Koreksi Rekening Bank' : 'Tambah Master Bank Baru'}</span>
                <button type="button" onClick={() => { setModalError(null); setIsAddOpen(false); }} className="text-white hover:text-red-200 cursor-pointer">✕</button>
              </div>
              <form noValidate onSubmit={handleSaveNew} className="p-4 flex flex-col gap-2.5 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Acc Number :</label>
                  <input
                    type="text"
                    required
                    value={newAccNumber}
                    onChange={(e) => setNewAccNumber(e.target.value)}
                    placeholder="Contoh: 6590555888"
                    className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Acc Name :</label>
                  <input
                    type="text"
                    required
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">Nama Bank :</label>
                    <input
                      type="text"
                      required
                      value={newNamaBank}
                      onChange={(e) => setNewNamaBank(e.target.value)}
                      placeholder="Contoh: BCA / MANDIRI"
                      className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none uppercase"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">Cabang :</label>
                    <input
                      type="text"
                      value={newCabang}
                      onChange={(e) => setNewCabang(e.target.value)}
                      placeholder="Contoh: PRIMA SUNTER"
                      className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none uppercase"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">Mata Uang :</label>
                    <select
                      value={newMataUang}
                      onChange={(e) => setNewMataUang(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none cursor-pointer"
                    >
                      <option value="IDR">IDR</option>
                      <option value="USD">USD</option>
                      <option value="SGD">SGD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">Jenis Rekening :</label>
                    <select
                      value={newJenisRekening}
                      onChange={(e) => setNewJenisRekening(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none cursor-pointer"
                    >
                      <option value="OPERASIONAL">OPERASIONAL</option>
                      <option value="GIRO">GIRO</option>
                      <option value="TABUNGAN">TABUNGAN</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">Saldo Awal :</label>
                    <input
                      type="number"
                      min="0"
                      value={newSaldoAwal}
                      onChange={(e) => setNewSaldoAwal(e.target.value)}
                      className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none font-mono text-right"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="font-semibold text-gray-800">Rekening Aktif</span>
                </label>
                {modalError && (
                  <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                    ⚠ {modalError}
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-300">
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="px-4 py-1 bg-[#E1DFD7] hover:bg-[#D0CEBF] border border-[#7F9DB9] font-semibold rounded shadow-sm cursor-pointer"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalError(null);
                      setIsAddOpen(false);
                    }}
                    className="px-4 py-1 bg-[#E1DFD7] hover:bg-[#D0CEBF] border border-[#7F9DB9] rounded shadow-sm cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Master Bank"
        rows={banks}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [r.accNumber, r.accName, r.namaBank, r.cabang]}
        initialQuery={searchTerm}
        isBusy={isBusy}
        onSearchSupabase={(q) => {
          setSearchField('Semua');
          setSearchTerm(q);
          return loadData({ field: 'Semua', term: q });
        }}
        onRefreshSupabase={() => {
          setSearchField('Semua');
          setSearchTerm('');
          return loadData({ field: 'Semua', term: '' });
        }}
        onSelectRow={(row, q) => {
          setSelectedId(row.id);
          setSearchTerm(q);
          showFeedback(`Bank [${row.accNumber} - ${row.namaBank}] dipilih`);
        }}
        columns={[
          { header: 'Kode / Acc Number', accessor: (r) => r.accNumber, widthClass: 'w-36', mono: true, bold: true },
          { header: 'Acc Name', accessor: (r) => r.accName, bold: true },
          { header: 'Nama Bank', accessor: (r) => r.namaBank, widthClass: 'w-36' },
          { header: 'Cabang', accessor: (r) => r.cabang || '-', widthClass: 'w-36' },
        ]}
      />

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Konfirmasi Hapus Rekening Bank"
        message={`Yakin ingin menghapus rekening [${selectedBank?.accNumber || ''} - ${selectedBank?.namaBank || ''}]?`}
        detail="Data yang sudah dihapus tidak dapat dikembalikan."
        isBusy={isBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MASTER REKENING BANK"
        subtitle={`Total Record: ${filteredBanks.length}`}
        orientation="landscape"
        columns={[
          { header: 'No. Rekening', accessor: 'accNumber', width: '120px' },
          { header: 'Nama Rekening', accessor: 'accName' },
          { header: 'Nama Bank', accessor: 'namaBank', width: '120px' },
          { header: 'Cabang', accessor: 'cabang', width: '110px' },
          { header: 'Curr', accessor: 'mataUang', width: '48px', align: 'center' },
          { header: 'Jenis', accessor: 'jenisRekening', width: '90px' },
          { header: 'Saldo Awal', accessor: (r) => formatMoney(r.saldoAwal), width: '105px', align: 'right' },
        ]}
        rows={filteredBanks}
        summaryItems={[
          {
            label: 'Total Saldo Awal',
            value: formatMoney(filteredBanks.reduce((sum, b) => sum + b.saldoAwal, 0)),
          },
        ]}
        selectedRow={selectedBank}
        selectedTitle="DETAIL MASTER REKENING BANK"
        selectedSubtitle={selectedBank ? `No. Rekening: ${selectedBank.accNumber}` : undefined}
        selectedMetaLines={
          selectedBank
            ? [
                { label: 'Acc Number', value: selectedBank.accNumber },
                { label: 'Acc Name', value: selectedBank.accName },
                { label: 'Nama Bank', value: selectedBank.namaBank },
                { label: 'Cabang', value: selectedBank.cabang || '-' },
                { label: 'Mata Uang / Jenis', value: `${selectedBank.mataUang} / ${selectedBank.jenisRekening}` },
              ]
            : undefined
        }
        selectedSummaryItems={
          selectedBank
            ? [{ label: 'Saldo Awal', value: `${selectedBank.mataUang} ${formatMoney(selectedBank.saldoAwal)}` }]
            : undefined
        }
      />
    </div>
  );
};
