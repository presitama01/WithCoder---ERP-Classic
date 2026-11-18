import React, { useState, useEffect, useRef } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  erpCreate,
  erpDelete,
  erpList,
  erpUpdate,
  fetchActiveCompanyProfile,
  formatMoney,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

export interface CustomerItem {
  id: string;
  kodeCustomer: string;
  namaCustomer: string;
  piutang: number;
  piutangGiro: number;
  alamat: string;
  kota: string;
  phone: string;
  email: string;
  groupArea: string;
  sales: string;
}

interface MasterCustomerListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToItem(r: any): CustomerItem {
  return {
    id: r.id,
    kodeCustomer: r.kode_customer || '',
    namaCustomer: r.nama_customer || '',
    piutang: Number(r.piutang || 0),
    piutangGiro: Number(r.piutang_giro || 0),
    alamat: r.alamat || '',
    kota: r.kota || '',
    phone: r.phone || '',
    email: r.email || '',
    groupArea: r.group_area || '',
    sales: r.sales || '',
  };
}

export const MasterCustomerListForm: React.FC<MasterCustomerListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [customerList, setCustomerList] = useState<CustomerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');

  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const findInputRef = useRef<HTMLInputElement>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newPiutang, setNewPiutang] = useState('0');
  const [newPiutangGiro, setNewPiutangGiro] = useState('0');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGroupArea, setNewGroupArea] = useState('');
  const [newSales, setNewSales] = useState('');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadData = async () => {
    try {
      setIsBusy(true);
      const rows = await erpList<any>('master_customers', { orderBy: 'kode_customer', asc: true });
      const mapped = rows.map(mapDbToItem);
      setCustomerList(mapped);
      if (mapped.length > 0 && !mapped.some((c) => c.id === selectedId)) {
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
    setNewKode('');
    setNewNama('');
    setNewPiutang('0');
    setNewPiutangGiro('0');
    setNewAlamat('');
    setNewKota('');
    setNewPhone('');
    setNewEmail('');
    setNewGroupArea('');
    setNewSales('');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = customerList.find((c) => c.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewKode(item.kodeCustomer);
    setNewNama(item.namaCustomer);
    setNewPiutang(String(item.piutang));
    setNewPiutangGiro(String(item.piutangGiro));
    setNewAlamat(item.alamat);
    setNewKota(item.kota);
    setNewPhone(item.phone);
    setNewEmail(item.email || '');
    setNewGroupArea(item.groupArea);
    setNewSales(item.sales);
    setIsAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) {
      showFeedback('Pilih data yang akan dihapus');
      return;
    }
    try {
      setIsBusy(true);
      await erpDelete('master_customers', selectedId);
      const updated = customerList.filter((c) => c.id !== selectedId);
      setCustomerList(updated);
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
    if (!newKode.trim() || !newNama.trim()) {
      setModalError('Kode dan Nama Pelanggan wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      const dbPayload = {
        kode_customer: newKode.trim().toUpperCase(),
        nama_customer: newNama.trim().toUpperCase(),
        piutang: parseFloat(newPiutang) || 0,
        piutang_giro: parseFloat(newPiutangGiro) || 0,
        alamat: newAlamat.trim(),
        kota: newKota.trim().toUpperCase(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        group_area: newGroupArea.trim().toUpperCase(),
        sales: newSales.trim().toUpperCase(),
      };
      if (editingId) {
        const saved = await erpUpdate<any>('master_customers', editingId, dbPayload);
        const mapped = mapDbToItem(saved);
        setCustomerList(customerList.map((c) => (c.id === editingId ? mapped : c)));
        showFeedback('Data diperbarui');
      } else {
        const saved = await erpCreate<any>('master_customers', dbPayload);
        const mapped = mapDbToItem(saved);
        setCustomerList([mapped, ...customerList]);
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

  const filteredCustomer = customerList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    if (searchField === 'Kode') return item.kodeCustomer.toLowerCase().includes(term);
    if (searchField === 'Nama Pelanggan') return item.namaCustomer.toLowerCase().includes(term);
    if (searchField === 'Kota') return item.kota.toLowerCase().includes(term);
    if (searchField === 'Phone') return item.phone.toLowerCase().includes(term);
    if (searchField === 'Email') return item.email.toLowerCase().includes(term);
    if (searchField === 'Group Area') return item.groupArea.toLowerCase().includes(term);
    if (searchField === 'Sales') return item.sales.toLowerCase().includes(term);
    return (
      item.kodeCustomer.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.alamat.toLowerCase().includes(term) ||
      item.kota.toLowerCase().includes(term) ||
      item.phone.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term) ||
      item.groupArea.toLowerCase().includes(term) ||
      item.sales.toLowerCase().includes(term)
    );
  });

  const findModalCustomers = customerList.filter((item) => {
    if (!findQuery.trim()) return true;
    const tokens = findQuery.trim().toLowerCase().split(/\s+/);
    const searchable = [
      item.kodeCustomer,
      item.namaCustomer,
      item.alamat,
      item.kota,
      item.phone,
      item.email,
      item.groupArea,
      item.sales,
    ]
      .join(' ')
      .toLowerCase();
    return tokens.every((t) => searchable.includes(t));
  });

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Master_Customer',
      sheetTitle: 'LIST MASTER PELANGGAN',
      companyProfile: company,
      columns: [
        { header: 'Kode', accessor: 'kodeCustomer' },
        { header: 'Nama Pelanggan', accessor: 'namaCustomer' },
        { header: 'Piutang', accessor: 'piutang', align: 'right' },
        { header: 'Piutang Giro', accessor: 'piutangGiro', align: 'right' },
        { header: 'Alamat', accessor: 'alamat' },
        { header: 'Kota', accessor: 'kota' },
        { header: 'Phone', accessor: 'phone' },
        { header: 'Email', accessor: 'email' },
        { header: 'Group Area', accessor: 'groupArea' },
        { header: 'Sales', accessor: 'sales' },
      ],
      rows: filteredCustomer,
    });
    showFeedback('Export Excel selesai');
  };

  const handleExecuteToolbarSearch = () => {
    if (filteredCustomer.length > 0) {
      setSelectedId(filteredCustomer[0].id);
      showFeedback(`Ditemukan ${filteredCustomer.length} data pelanggan`);
    } else {
      showFeedback('Data pelanggan tidak ditemukan');
    }
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    setFindQuery(searchTerm);
    await loadData();
    setTimeout(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }, 60);
  };

  return (
    <div
      id="master-customer-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Master Pelanggan"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadData}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 h-[44px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center px-3 space-x-2 overflow-x-auto">
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
          <div className="h-[22px] w-[1px] bg-[#ACA899] mx-1" />
          <button
            type="button"
            onClick={loadData}
            className="h-[28px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] cursor-pointer text-[11px] font-semibold text-black"
          >
            Refresh
          </button>

          <div className="ml-auto flex items-center space-x-1.5 text-[11px]">
            <span className="font-semibold text-black">Cari:</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-[22px] bg-white border border-[#7F9DB9] px-1 text-[11px]"
            >
              <option value="Semua">Semua</option>
              <option value="Nama Pelanggan">Nama Pelanggan</option>
              <option value="Kode">Kode</option>
              <option value="Kota">Kota</option>
              <option value="Phone">Phone</option>
              <option value="Email">Email</option>
              <option value="Group Area">Group Area</option>
              <option value="Sales">Sales</option>
            </select>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExecuteToolbarSearch();
              }}
              placeholder="Ketik kata kunci..."
              className="h-[22px] w-[160px] bg-white border border-[#7F9DB9] px-2 text-[11px]"
            />
            <button
              type="button"
              onClick={handleExecuteToolbarSearch}
              className="h-[22px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] cursor-pointer text-[11px] font-semibold text-black"
            >
              Cari
            </button>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="h-[22px] px-2 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] rounded-[2px] cursor-pointer text-[11px] text-black"
                title="Reset pencarian"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white m-2 border border-[#ACA899] shadow-inner">
          <div className="min-w-max">
            <table className="w-full text-left text-[11px] border-collapse select-none">
              <thead className="sticky top-0 bg-[#ECE9D8] text-black font-semibold border-b border-[#ACA899]">
                <tr className="h-[24px]">
                  <th className="w-[20px] min-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0" />
                  <th className="w-[90px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kode</th>
                  <th className="w-[220px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Nama Pelanggan</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Piutang</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Piutang Giro</th>
                  <th className="w-[220px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Alamat</th>
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kota</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Phone</th>
                  <th className="w-[170px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Email</th>
                  <th className="w-[130px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Group Area</th>
                  <th className="w-[140px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Sales</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomer.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-6 text-gray-500 italic">
                      Tidak ada data pelanggan yang cocok
                    </td>
                  </tr>
                ) : (
                  filteredCustomer.map((item) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        onDoubleClick={handleEdit}
                        className={`h-[22px] border-b border-[#ACA899] cursor-pointer ${
                          isSelected ? 'bg-[#0A246A] text-white' : 'bg-white hover:bg-[#E8EEF8]'
                        }`}
                      >
                        <td className="w-[20px] min-w-[20px] border-r border-[#ACA899] bg-[#ECE9D8] text-center p-0">
                          {isSelected ? <span className="text-[10px] font-bold text-black">▶</span> : null}
                        </td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-bold">{item.kodeCustomer}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-semibold">{item.namaCustomer}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-right font-mono">{item.piutang.toLocaleString('id-ID')}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-right font-mono">{item.piutangGiro.toLocaleString('id-ID')}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.alamat}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.kota}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.phone}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.email}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.groupArea}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.sales}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-[480px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl p-4 flex flex-col">
            <div className="bg-[#000080] text-white px-2 py-1 font-bold text-[12px] flex justify-between items-center mb-3">
              <span>{editingId ? 'Koreksi Master Pelanggan' : 'Tambah Master Pelanggan Baru'}</span>
              <button type="button" onClick={() => { setModalError(null); setIsAddOpen(false); }} className="text-white hover:bg-red-600 px-1 font-bold cursor-pointer">✕</button>
            </div>
            <form noValidate onSubmit={handleSaveNew} className="space-y-2.5 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Kode:</label>
                  <input
                    type="text"
                    required
                    value={newKode}
                    onChange={(e) => setNewKode(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                    placeholder="CUST01"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Nama Pelanggan:</label>
                  <input
                    type="text"
                    required
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Piutang (Rp):</label>
                  <input
                    type="number"
                    value={newPiutang}
                    onChange={(e) => setNewPiutang(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Piutang Giro (Rp):</label>
                  <input
                    type="number"
                    value={newPiutangGiro}
                    onChange={(e) => setNewPiutangGiro(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Alamat:</label>
                <input
                  type="text"
                  value={newAlamat}
                  onChange={(e) => setNewAlamat(e.target.value)}
                  className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Kota:</label>
                  <input
                    type="text"
                    value={newKota}
                    onChange={(e) => setNewKota(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Phone:</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Email:</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="contoh@perusahaan.com"
                  className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Group Area:</label>
                  <input
                    type="text"
                    value={newGroupArea}
                    onChange={(e) => setNewGroupArea(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Sales:</label>
                  <input
                    type="text"
                    value={newSales}
                    onChange={(e) => setNewSales(e.target.value)}
                    className="w-full h-[24px] bg-white border border-[#7F9DB9] px-2 uppercase"
                  />
                </div>
              </div>

              {modalError && (
                <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                  ⚠ {modalError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] font-bold cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isFindOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[740px] max-w-[96vw] max-h-[85vh] flex flex-col text-xs">
            <div className="bg-[#000080] text-white px-3 py-1.5 flex items-center justify-between font-bold shrink-0">
              <span>Cari &amp; Daftar Master Pelanggan (Supabase)</span>
              <button
                type="button"
                onClick={() => setIsFindOpen(false)}
                className="px-1.5 bg-[#C00000] text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-3 space-y-2 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-bold whitespace-nowrap">Cari :</span>
                <input
                  ref={findInputRef}
                  type="text"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && findModalCustomers.length > 0) {
                      const first = findModalCustomers[0];
                      setSelectedId(first.id);
                      setSearchTerm(findQuery);
                      setIsFindOpen(false);
                      showFeedback(`Pelanggan [${first.kodeCustomer}] dipilih`);
                    }
                  }}
                  placeholder="Cari Kode, Nama Pelanggan, Kota, Phone, Email, Sales..."
                  className="flex-1 h-[24px] px-2 bg-white border border-[#7F9DB9] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm(findQuery);
                    if (findModalCustomers.length > 0) {
                      setSelectedId(findModalCustomers[0].id);
                      showFeedback(`Ditemukan ${findModalCustomers.length} record pelanggan`);
                    } else {
                      showFeedback('Data pelanggan tidak ditemukan');
                    }
                  }}
                  className="h-[24px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer"
                >
                  Cari
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setFindQuery('');
                    setSearchTerm('');
                    await loadData();
                    showFeedback('Data pelanggan di-refresh dari Supabase');
                  }}
                  className="h-[24px] px-3 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] font-semibold cursor-pointer"
                >
                  Refresh
                </button>
              </div>
              <div className="flex-1 min-h-[240px] overflow-auto bg-white border border-[#7F9DB9]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#ACA899]">
                    <tr>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-24">Kode</th>
                      <th className="px-2 py-1 border-r border-[#ACA899]">Nama Pelanggan</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-24">Kota</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-28">Phone</th>
                      <th className="px-2 py-1 border-r border-[#ACA899] w-36">Email</th>
                      <th className="px-2 py-1 w-24">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findModalCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-gray-500 italic">
                          Tidak ada record data pelanggan yang cocok
                        </td>
                      </tr>
                    ) : (
                      findModalCustomers.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => {
                            setSelectedId(c.id);
                            setSearchTerm(findQuery);
                            setIsFindOpen(false);
                            showFeedback(`Pelanggan [${c.kodeCustomer} - ${c.namaCustomer}] dipilih`);
                          }}
                          className={`cursor-pointer border-b border-[#E0E0E0] hover:bg-[#316AC5] hover:text-white ${
                            c.id === selectedId ? 'bg-[#FFFF99]' : ''
                          }`}
                        >
                          <td className="px-2 py-1 font-mono font-bold border-r border-[#E0E0E0]">
                            {c.kodeCustomer}
                          </td>
                          <td className="px-2 py-1 font-semibold border-r border-[#E0E0E0]">
                            {c.namaCustomer}
                          </td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{c.kota || '-'}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{c.phone || '-'}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{c.email || '-'}</td>
                          <td className="px-2 py-1">{c.sales || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-[#555]">
                  Menampilkan {findModalCustomers.length} dari {customerList.length} pelanggan. Klik baris untuk memilih record.
                </span>
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
        title="LAPORAN MASTER PELANGGAN"
        subtitle={`Total Record: ${filteredCustomer.length}`}
        orientation="landscape"
        columns={[
          { header: 'Kode', accessor: 'kodeCustomer', width: '78px' },
          { header: 'Nama Pelanggan', accessor: 'namaCustomer' },
          { header: 'Piutang', accessor: (r) => formatMoney(r.piutang), align: 'right', width: '88px' },
          { header: 'Piutang Giro', accessor: (r) => formatMoney(r.piutangGiro), align: 'right', width: '88px' },
          { header: 'Kota', accessor: 'kota', width: '85px' },
          { header: 'Phone', accessor: 'phone', width: '90px' },
          { header: 'Email', accessor: 'email', width: '135px' },
          { header: 'Sales', accessor: 'sales', width: '90px' },
        ]}
        rows={filteredCustomer}
        summaryItems={[
          {
            label: 'Total Piutang',
            value: formatMoney(filteredCustomer.reduce((a, b) => a + b.piutang, 0)),
          },
          {
            label: 'Total Piutang Giro',
            value: formatMoney(filteredCustomer.reduce((a, b) => a + b.piutangGiro, 0)),
          },
        ]}
      />
    </div>
  );
};
