import React, { useState, useRef, useEffect } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { erpCreate, erpDelete, erpList, erpUpdate, fetchActiveCompanyProfile } from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface BankItem {
  id: string;
  accNumber: string;
  accName: string;
  namaBank: string;
  cabang: string;
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

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
      const mapped: BankItem[] = rows.map((r) => ({
        id: r.id,
        accNumber: r.acc_number,
        accName: r.acc_name,
        namaBank: r.nama_bank,
        cabang: r.cabang || '',
      }));
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
      const saved = await erpUpdate<any>('master_banks', selected.id, {
        acc_number: selected.accNumber.trim(),
        acc_name: selected.accName.trim().toUpperCase(),
        nama_bank: selected.namaBank.trim().toUpperCase(),
        cabang: selected.cabang.trim().toUpperCase(),
      });
      const mapped: BankItem = {
        id: saved.id,
        accNumber: saved.acc_number,
        accName: saved.acc_name,
        namaBank: saved.nama_bank,
        cabang: saved.cabang || '',
      };
      setBanks((prev) => prev.map((b) => (b.id === selected.id ? mapped : b)));
      showFeedback(`Rekening [${mapped.accNumber} - ${mapped.namaBank}] tersimpan ke Supabase`);
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
    setIsAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    try {
      setIsBusy(true);
      await erpDelete('master_banks', selectedId);
      const updated = banks.filter((b) => b.id !== selectedId);
      setBanks(updated);
      setSelectedId(updated[0]?.id || '');
      showFeedback('Data dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newAccNumber.trim() || !newAccName.trim() || !newNamaBank.trim()) {
      setModalError('Acc Number, Acc Name, dan Nama Bank wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const dbPayload = {
        acc_number: newAccNumber.trim(),
        acc_name: newAccName.trim().toUpperCase(),
        nama_bank: newNamaBank.trim().toUpperCase(),
        cabang: newCabang.trim().toUpperCase(),
      };
      if (editingId) {
        const saved = await erpUpdate<any>('master_banks', editingId, dbPayload);
        const mapped: BankItem = {
          id: saved.id,
          accNumber: saved.acc_number,
          accName: saved.acc_name,
          namaBank: saved.nama_bank,
          cabang: saved.cabang || '',
        };
        setBanks(banks.map((b) => (b.id === editingId ? mapped : b)));
        showFeedback('Data diperbarui');
      } else {
        const saved = await erpCreate<any>('master_banks', dbPayload);
        const mapped: BankItem = {
          id: saved.id,
          accNumber: saved.acc_number,
          accName: saved.acc_name,
          namaBank: saved.nama_bank,
          cabang: saved.cabang || '',
        };
        setBanks([mapped, ...banks]);
        setSelectedId(mapped.id);
        showFeedback('Data tersimpan');
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
            onHapus={handleDelete}
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
              <table className="w-full min-w-[750px] border-collapse text-[11px] font-sans">
                <thead className="bg-[#ECE9D8] sticky top-0 z-10">
                  <tr className="h-[22px] text-left border-b border-[#ACA899]">
                    <th className="py-1 px-3 border-r border-[#ACA899] font-bold text-black w-[160px]">Acc Number</th>
                    <th className="py-1 px-3 border-r border-[#ACA899] font-bold text-black w-[240px]">Acc Name</th>
                    <th className="py-1 px-3 border-r border-[#ACA899] font-bold text-black w-[180px]">Nama Bank</th>
                    <th className="py-1 px-3 font-bold text-black">Cabang</th>
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
                            : index % 2 === 0
                            ? 'bg-white hover:bg-[#F0F4F8]'
                            : 'bg-[#F9F9F9] hover:bg-[#F0F4F8]'
                        }`}
                      >
                        <td className={`py-0.5 px-3 border-r ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.accNumber}
                        </td>
                        <td className={`py-0.5 px-3 border-r ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.accName}
                        </td>
                        <td className={`py-0.5 px-3 border-r ${isSelected ? 'border-[#1D4A99]' : 'border-[#E0E0E0]'}`}>
                          {item.namaBank}
                        </td>
                        <td className="py-0.5 px-3">{item.cabang}</td>
                      </tr>
                    );
                  })}
                  {filteredBanks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-gray-500 italic">
                        Tidak ada data rekening bank yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="h-[24px] bg-[#ECE9D8] border-t border-[#999999] px-3 flex items-center justify-between text-[11px] font-sans text-[#333333]">
          <div className="flex items-center space-x-2">
            <span className="border border-[#7F9DB9] px-2 py-0.5 bg-white/60">
              Record: {filteredBanks.length} of {banks.length}
            </span>
          </div>
          <div className="text-gray-600">MASTER -&gt; Rekening Bank</div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#ECE9D8] w-[420px] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl flex flex-col font-sans">
              <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-3 py-1.5 flex justify-between items-center text-xs font-bold">
                <span>{editingId ? 'Koreksi Rekening Bank' : 'Tambah Master Bank Baru'}</span>
                <button type="button" onClick={() => { setModalError(null); setIsAddOpen(false); }} className="text-white hover:text-red-200 cursor-pointer">✕</button>
              </div>
              <form noValidate onSubmit={handleSaveNew} className="p-4 flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Acc Number :</label>
                  <input
                    type="text"
                    required
                    value={newAccNumber}
                    onChange={(e) => setNewAccNumber(e.target.value)}
                    placeholder="Contoh: 6590555888"
                    className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Acc Name :</label>
                  <input
                    type="text"
                    required
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Nama Bank :</label>
                  <input
                    type="text"
                    required
                    value={newNamaBank}
                    onChange={(e) => setNewNamaBank(e.target.value)}
                    placeholder="Contoh: BCA / MANDIRI / BNI"
                    className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Cabang :</label>
                  <input
                    type="text"
                    value={newCabang}
                    onChange={(e) => setNewCabang(e.target.value)}
                    placeholder="Contoh: PRIMA SUNTER"
                    className="px-2 py-1 bg-white border border-[#7F9DB9] rounded outline-none"
                  />
                </div>
                {modalError && (
                  <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                    ⚠ {modalError}
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-300">
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

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MASTER REKENING BANK"
        subtitle={`Total Record: ${filteredBanks.length}`}
        columns={[
          { header: 'No. Rekening', accessor: 'accNumber', width: '130px' },
          { header: 'Nama Rekening', accessor: 'accName' },
          { header: 'Nama Bank', accessor: 'namaBank', width: '140px' },
          { header: 'Cabang', accessor: 'cabang', width: '130px' },
        ]}
        rows={filteredBanks}
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
              ]
            : undefined
        }
      />
    </div>
  );
};
