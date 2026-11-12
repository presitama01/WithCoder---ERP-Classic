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
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newPiutang, setNewPiutang] = useState('0');
  const [newPiutangGiro, setNewPiutangGiro] = useState('0');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGroupArea, setNewGroupArea] = useState('');
  const [newSales, setNewSales] = useState('');

  const [feedback, setFeedback] = useState<string | null>(null);
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
    setNewKode('');
    setNewNama('');
    setNewPiutang('0');
    setNewPiutangGiro('0');
    setNewAlamat('');
    setNewKota('');
    setNewPhone('');
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
    setNewKode(item.kodeCustomer);
    setNewNama(item.namaCustomer);
    setNewPiutang(String(item.piutang));
    setNewPiutangGiro(String(item.piutangGiro));
    setNewAlamat(item.alamat);
    setNewKota(item.kota);
    setNewPhone(item.phone);
    setNewGroupArea(item.groupArea);
    setNewSales(item.sales);
    setIsAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
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
    if (!newKode.trim() || !newNama.trim()) return;

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
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filteredCustomer = customerList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') return item.kodeCustomer.toLowerCase().includes(term);
    if (searchField === 'Kota') return item.kota.toLowerCase().includes(term);
    if (searchField === 'Sales') return item.sales.toLowerCase().includes(term);
    return item.namaCustomer.toLowerCase().includes(term);
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
        { header: 'Group Area', accessor: 'groupArea' },
        { header: 'Sales', accessor: 'sales' },
      ],
      rows: filteredCustomer,
    });
    showFeedback('Export Excel selesai');
  };

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
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
            onSimpan={loadData}
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

          <div className="ml-auto flex items-center space-x-2 text-[11px]">
            <span className="font-semibold text-black">Cari:</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-[22px] bg-white border border-[#7F9DB9] px-1 text-[11px]"
            >
              <option value="Nama Pelanggan">Nama Pelanggan</option>
              <option value="Kode">Kode</option>
              <option value="Kota">Kota</option>
              <option value="Sales">Sales</option>
            </select>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik kata kunci..."
              className="h-[22px] w-[150px] bg-white border border-[#7F9DB9] px-2 text-[11px]"
            />
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
                  <th className="w-[130px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Group Area</th>
                  <th className="w-[140px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Sales</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomer.map((item) => {
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
                      <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.groupArea}</td>
                      <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.sales}</td>
                    </tr>
                  );
                })}
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
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-white hover:bg-red-600 px-1 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveNew} className="space-y-2.5 text-[11px]">
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
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-1 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
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
          { header: 'Kode', accessor: 'kodeCustomer', width: '75px' },
          { header: 'Nama Pelanggan', accessor: 'namaCustomer' },
          { header: 'Piutang', accessor: (r) => formatMoney(r.piutang), align: 'right', width: '105px' },
          { header: 'Piutang Giro', accessor: (r) => formatMoney(r.piutangGiro), align: 'right', width: '105px' },
          { header: 'Kota', accessor: 'kota', width: '95px' },
          { header: 'Phone', accessor: 'phone', width: '95px' },
          { header: 'Sales', accessor: 'sales', width: '100px' },
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
