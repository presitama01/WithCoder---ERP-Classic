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
  parseNum,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

export interface CustomerItem {
  id: string;
  kodeCustomer: string;
  namaCustomer: string;
  ppn: boolean;
  hitung: boolean;
  npwp: string;
  alamatNpwp: string;
  wilayah: string;
  limitKredit: number;
  tmpPembayaran: number;
  rubahKode: string;
  kodeSales: string;
  namaSales: string;
  kodeExpedisi: string;
  namaExpedisi: string;
  cpNama: string;
  email: string;
  handphone: string;
  invAlamat: string;
  invKota: string;
  invTelepon: string;
  invFax: string;
  delAlamat: string;
  delKota: string;
  delTelepon: string;
  delFax: string;
  piutang: number;
  piutangGiro: number;
}

export interface SalesRef {
  kodeSales: string;
  namaSales: string;
}

export interface ExpedisiRef {
  kodeExpedisi: string;
  namaExpedisi: string;
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
    ppn: r.ppn ?? true,
    hitung: r.hitung ?? true,
    npwp: r.npwp || '',
    alamatNpwp: r.alamat_npwp || '',
    wilayah: r.wilayah || '',
    limitKredit: Number(r.limit_kredit || 0),
    tmpPembayaran: Number(r.tmp_pembayaran || 0),
    rubahKode: r.rubah_kode || '',
    kodeSales: r.kode_sales || '',
    namaSales: r.nama_sales || '',
    kodeExpedisi: r.kode_expedisi || '',
    namaExpedisi: r.nama_expedisi || '',
    cpNama: r.contact_nama || '',
    email: r.email || '',
    handphone: r.handphone || '',
    invAlamat: r.inv_alamat || r.alamat || '',
    invKota: r.inv_kota || r.kota || '',
    invTelepon: r.inv_telepon || r.phone || '',
    invFax: r.inv_fax || '',
    delAlamat: r.del_alamat || '',
    delKota: r.del_kota || '',
    delTelepon: r.del_telepon || '',
    delFax: r.del_fax || '',
    piutang: Number(r.piutang || 0),
    piutangGiro: Number(r.piutang_giro || 0),
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

  const [salesOptions, setSalesOptions] = useState<SalesRef[]>([]);
  const [expedisiOptions, setExpedisiOptions] = useState<ExpedisiRef[]>([]);
  const [wilayahOptions, setWilayahOptions] = useState<string[]>([]);

  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const findInputRef = useRef<HTMLInputElement>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newPpn, setNewPpn] = useState(true);
  const [newHitung, setNewHitung] = useState(true);
  const [newNpwp, setNewNpwp] = useState('');
  const [newAlamatNpwp, setNewAlamatNpwp] = useState('');
  const [newWilayah, setNewWilayah] = useState('');
  const [newLimitKredit, setNewLimitKredit] = useState('0');
  const [newTmpPembayaran, setNewTmpPembayaran] = useState('0');
  const [newRubahKode, setNewRubahKode] = useState('');

  const [newKodeSales, setNewKodeSales] = useState('');
  const [newNamaSales, setNewNamaSales] = useState('');
  const [newKodeExpedisi, setNewKodeExpedisi] = useState('');
  const [newNamaExpedisi, setNewNamaExpedisi] = useState('');

  const [newCpNama, setNewCpNama] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newHandphone, setNewHandphone] = useState('');

  const [newInvAlamat, setNewInvAlamat] = useState('');
  const [newInvKota, setNewInvKota] = useState('');
  const [newInvTelepon, setNewInvTelepon] = useState('');
  const [newInvFax, setNewInvFax] = useState('');

  const [newDelAlamat, setNewDelAlamat] = useState('');
  const [newDelKota, setNewDelKota] = useState('');
  const [newDelTelepon, setNewDelTelepon] = useState('');
  const [newDelFax, setNewDelFax] = useState('');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadMasterReferences = async () => {
    const [salesRes, expRes, wilRes] = await Promise.allSettled([
      erpList<any>('master_sales', { orderBy: 'kode_sales', asc: true, limit: 1000 }),
      erpList<any>('master_expedisis', { orderBy: 'kode_expedisi', asc: true, limit: 1000 }),
      erpList<any>('master_wilayahs', { orderBy: 'kode', asc: true, limit: 1000 }),
    ]);

    if (salesRes.status === 'fulfilled') {
      const sList: SalesRef[] = salesRes.value.map((s: any) => ({
        kodeSales: String(s.kode_sales || '').trim().toUpperCase(),
        namaSales: String(s.nama_sales || '').trim().toUpperCase(),
      })).filter((s: SalesRef) => s.kodeSales);
      setSalesOptions(sList);
    }

    if (expRes.status === 'fulfilled') {
      const eList: ExpedisiRef[] = expRes.value.map((e: any) => ({
        kodeExpedisi: String(e.kode_expedisi || '').trim().toUpperCase(),
        namaExpedisi: String(e.nama_expedisi || '').trim().toUpperCase(),
      })).filter((e: ExpedisiRef) => e.kodeExpedisi);
      setExpedisiOptions(eList);
    }

    if (wilRes.status === 'fulfilled') {
      const wList = Array.from(
        new Set(
          wilRes.value
            .map((w: any) => {
              const kode = String(w.kode || '').trim().toUpperCase();
              const nama = String(w.nama_wilayah || '').trim().toUpperCase();
              if (kode && nama) return `${kode} - ${nama}`;
              return nama || kode;
            })
            .filter(Boolean)
        )
      );
      setWilayahOptions(wList);
    }
  };

  const loadData = async () => {
    try {
      setIsBusy(true);
      const [rows] = await Promise.all([
        erpList<any>('master_customers', { orderBy: 'kode_customer', asc: true }),
        loadMasterReferences(),
      ]);
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

  const handleSalesChange = (kode: string) => {
    const clean = kode.trim().toUpperCase();
    setNewKodeSales(clean);
    const found = salesOptions.find((s) => s.kodeSales === clean);
    if (found) {
      setNewNamaSales(found.namaSales);
    }
  };

  const handleExpedisiChange = (kode: string) => {
    const clean = kode.trim().toUpperCase();
    setNewKodeExpedisi(clean);
    const found = expedisiOptions.find((e) => e.kodeExpedisi === clean);
    if (found) {
      setNewNamaExpedisi(found.namaExpedisi);
    }
  };

  const handleAddNew = async () => {
    setEditingId(null);
    setModalError(null);
    setNewKode('');
    setNewNama('');
    setNewPpn(true);
    setNewHitung(true);
    setNewNpwp('');
    setNewAlamatNpwp('');
    setNewWilayah('');
    setNewLimitKredit('0');
    setNewTmpPembayaran('0');
    setNewRubahKode('');
    setNewKodeSales('');
    setNewNamaSales('');
    setNewKodeExpedisi('');
    setNewNamaExpedisi('');
    setNewCpNama('');
    setNewEmail('');
    setNewHandphone('');
    setNewInvAlamat('');
    setNewInvKota('');
    setNewInvTelepon('');
    setNewInvFax('');
    setNewDelAlamat('');
    setNewDelKota('');
    setNewDelTelepon('');
    setNewDelFax('');
    setIsAddOpen(true);
    await loadMasterReferences();
  };

  const handleEdit = async () => {
    const item = customerList.find((c) => c.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewKode(item.kodeCustomer);
    setNewNama(item.namaCustomer);
    setNewPpn(item.ppn);
    setNewHitung(item.hitung);
    setNewNpwp(item.npwp);
    setNewAlamatNpwp(item.alamatNpwp);
    setNewWilayah(item.wilayah);
    setNewLimitKredit(String(item.limitKredit));
    setNewTmpPembayaran(String(item.tmpPembayaran));
    setNewRubahKode(item.rubahKode);
    setNewKodeSales(item.kodeSales);
    setNewNamaSales(item.namaSales);
    setNewKodeExpedisi(item.kodeExpedisi);
    setNewNamaExpedisi(item.namaExpedisi);
    setNewCpNama(item.cpNama);
    setNewEmail(item.email);
    setNewHandphone(item.handphone);
    setNewInvAlamat(item.invAlamat);
    setNewInvKota(item.invKota);
    setNewInvTelepon(item.invTelepon);
    setNewInvFax(item.invFax);
    setNewDelAlamat(item.delAlamat);
    setNewDelKota(item.delKota);
    setNewDelTelepon(item.delTelepon);
    setNewDelFax(item.delFax);
    setIsAddOpen(true);
    await loadMasterReferences();
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
        ppn: newPpn,
        hitung: newHitung,
        npwp: newNpwp.trim(),
        alamat_npwp: newAlamatNpwp.trim(),
        wilayah: newWilayah.trim().toUpperCase(),
        limit_kredit: parseNum(newLimitKredit),
        tmp_pembayaran: parseInt(newTmpPembayaran) || 0,
        rubah_kode: newRubahKode.trim().toUpperCase(),
        kode_sales: newKodeSales.trim().toUpperCase(),
        nama_sales: newNamaSales.trim().toUpperCase(),
        kode_expedisi: newKodeExpedisi.trim().toUpperCase(),
        nama_expedisi: newNamaExpedisi.trim().toUpperCase(),
        contact_nama: newCpNama.trim(),
        email: newEmail.trim(),
        handphone: newHandphone.trim(),
        inv_alamat: newInvAlamat.trim(),
        inv_kota: newInvKota.trim().toUpperCase(),
        inv_telepon: newInvTelepon.trim(),
        inv_fax: newInvFax.trim(),
        del_alamat: newDelAlamat.trim(),
        del_kota: newDelKota.trim().toUpperCase(),
        del_telepon: newDelTelepon.trim(),
        del_fax: newDelFax.trim(),
        alamat: newInvAlamat.trim(),
        kota: newInvKota.trim().toUpperCase(),
        phone: newInvTelepon.trim(),
        sales: newNamaSales.trim().toUpperCase(),
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
    if (searchField === 'Kota') return item.invKota.toLowerCase().includes(term) || item.kota.toLowerCase().includes(term);
    if (searchField === 'Phone') return item.invTelepon.toLowerCase().includes(term) || item.phone.toLowerCase().includes(term);
    if (searchField === 'Email') return item.email.toLowerCase().includes(term);
    if (searchField === 'Sales') return item.namaSales.toLowerCase().includes(term) || item.sales.toLowerCase().includes(term);
    return (
      item.kodeCustomer.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.invAlamat.toLowerCase().includes(term) ||
      item.invKota.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term) ||
      item.namaSales.toLowerCase().includes(term)
    );
  });

  const findModalCustomers = customerList.filter((item) => {
    if (!findQuery.trim()) return true;
    const tokens = findQuery.trim().toLowerCase().split(/\s+/);
    const searchable = [
      item.kodeCustomer,
      item.namaCustomer,
      item.invAlamat,
      item.invKota,
      item.invTelepon,
      item.email,
      item.namaSales,
      item.namaExpedisi,
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
        { header: 'Limit Kredit', accessor: 'limitKredit', align: 'right' },
        { header: 'Alamat', accessor: 'invAlamat' },
        { header: 'Kota', accessor: 'invKota' },
        { header: 'Phone', accessor: 'invTelepon' },
        { header: 'Email', accessor: 'email' },
        { header: 'Sales', accessor: 'namaSales' },
        { header: 'Expedisi', accessor: 'namaExpedisi' },
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
                  <th className="w-[120px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">NPWP</th>
                  <th className="w-[200px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Nama Customer</th>
                  <th className="w-[180px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Alamat Kirim</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kota</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Wilayah Area</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 text-right font-bold bg-[#ECE9D8]">Limit Kredit</th>
                  <th className="w-[130px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Contact Person</th>
                  <th className="w-[140px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Email</th>
                  <th className="w-[110px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Handphone</th>
                  <th className="w-[90px] border-r border-[#ACA899] px-2 py-0.5 font-bold bg-[#ECE9D8]">Kode Sales</th>
                  <th className="w-[130px] px-2 py-0.5 font-bold bg-[#ECE9D8]">Nama Sales</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomer.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-6 text-gray-500 italic">
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
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-mono">{item.npwp}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-semibold">{item.namaCustomer}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.delAlamat || item.invAlamat}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.delKota || item.invKota}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.wilayah}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] text-right font-mono">{formatMoney(item.limitKredit)}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.cpNama}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899]">{item.email}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-mono">{item.handphone}</td>
                        <td className="px-2 py-0.5 border-r border-[#ACA899] font-mono">{item.kodeSales}</td>
                        <td className="px-2 py-0.5">{item.namaSales || item.sales}</td>
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
          <div className="w-[860px] max-w-[98vw] max-h-[96vh] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-2xl p-4 flex flex-col text-[11px]">
            <div className="bg-[#000080] text-white px-2.5 py-1 font-bold text-[12px] flex justify-between items-center mb-3 shrink-0">
              <span>{editingId ? 'Koreksi Master Pelanggan' : 'Tambah Master Pelanggan Baru'}</span>
              <button type="button" onClick={() => { setModalError(null); setIsAddOpen(false); }} className="text-white hover:bg-red-600 px-1 font-bold cursor-pointer">✕</button>
            </div>

            <form noValidate onSubmit={handleSaveNew} className="space-y-3 overflow-y-auto flex-1 pr-1">
              {/* Top Grid: Customer Description vs Sales & Expedisi & Contact */}
              <div className="grid grid-cols-2 gap-4">
                {/* Left Box: Customer Description */}
                <fieldset className="border border-[#7F9DB9] p-2 rounded bg-[#ECE9D8] space-y-2">
                  <legend className="font-bold px-1 text-black">Customer Description</legend>
                  
                  <div className="flex items-center space-x-2">
                    <label className="w-28 font-semibold">Kode Customer* :</label>
                    <input
                      type="text"
                      required
                      value={newKode}
                      onChange={(e) => setNewKode(e.target.value)}
                      className="w-32 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase font-mono font-bold"
                    />
                    <div className="flex items-center space-x-3 ml-2">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPpn}
                          onChange={(e) => setNewPpn(e.target.checked)}
                        />
                        <span>PPN</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newHitung}
                          onChange={(e) => setNewHitung(e.target.checked)}
                        />
                        <span>Hitung</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="w-28 font-semibold">NPWP # :</label>
                    <input
                      type="text"
                      value={newNpwp}
                      onChange={(e) => setNewNpwp(e.target.value)}
                      className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="w-28 font-semibold">Alamat NPWP :</label>
                    <input
                      type="text"
                      value={newAlamatNpwp}
                      onChange={(e) => setNewAlamatNpwp(e.target.value)}
                      className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="w-28 font-semibold">Nama Customer* :</label>
                    <input
                      type="text"
                      required
                      value={newNama}
                      onChange={(e) => setNewNama(e.target.value)}
                      className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase font-semibold"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="w-28 font-semibold">Wilayah/Area :</label>
                    <select
                      value={newWilayah}
                      onChange={(e) => setNewWilayah(e.target.value)}
                      className="w-36 h-[22px] bg-white border border-[#7F9DB9] px-1 uppercase cursor-pointer"
                    >
                      <option value="">-- Pilih Wilayah --</option>
                      {wilayahOptions.map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="w-28 font-semibold">Limit Kredit :</label>
                    <input
                      type="number"
                      value={newLimitKredit}
                      onChange={(e) => setNewLimitKredit(e.target.value)}
                      className="w-36 h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono text-right"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="w-28 font-semibold">Tmp Pembayaran :</label>
                    <input
                      type="number"
                      value={newTmpPembayaran}
                      onChange={(e) => setNewTmpPembayaran(e.target.value)}
                      className="w-16 h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono text-center"
                    />
                    <span>Hari</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="w-28 font-semibold">Rubah Kode :</label>
                    <input
                      type="text"
                      value={newRubahKode}
                      onChange={(e) => setNewRubahKode(e.target.value)}
                      className="w-32 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase"
                    />
                  </div>
                </fieldset>

                {/* Right Box: Sales, Expedisi, Contact Person */}
                <div className="space-y-3">
                  {/* Sales */}
                  <fieldset className="border border-[#7F9DB9] p-2 rounded bg-[#ECE9D8] space-y-1.5">
                    <legend className="font-bold px-1 text-black">Sales</legend>
                    <div className="flex items-center space-x-2">
                      <label className="w-24 font-semibold">Kode Sales :</label>
                      <select
                        value={newKodeSales}
                        onChange={(e) => handleSalesChange(e.target.value)}
                        className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-1 uppercase cursor-pointer"
                      >
                        <option value="">-- Pilih Sales --</option>
                        {salesOptions.map((s) => (
                          <option key={s.kodeSales} value={s.kodeSales}>
                            {s.kodeSales} - {s.namaSales}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-24 font-semibold">Nama Sales :</label>
                      <input
                        type="text"
                        value={newNamaSales}
                        readOnly
                        className="flex-1 h-[22px] bg-[#FFFFE1] border border-[#7F9DB9] px-2 uppercase"
                      />
                    </div>
                  </fieldset>

                  {/* Expedisi */}
                  <fieldset className="border border-[#7F9DB9] p-2 rounded bg-[#ECE9D8] space-y-1.5">
                    <legend className="font-bold px-1 text-black">Expedisi</legend>
                    <div className="flex items-center space-x-2">
                      <label className="w-24 font-semibold">Kode Expedisi :</label>
                      <select
                        value={newKodeExpedisi}
                        onChange={(e) => handleExpedisiChange(e.target.value)}
                        className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-1 uppercase cursor-pointer"
                      >
                        <option value="">-- Pilih Expedisi --</option>
                        {expedisiOptions.map((ex) => (
                          <option key={ex.kodeExpedisi} value={ex.kodeExpedisi}>
                            {ex.kodeExpedisi} - {ex.namaExpedisi}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-24 font-semibold">Nama Expedisi :</label>
                      <input
                        type="text"
                        value={newNamaExpedisi}
                        readOnly
                        className="flex-1 h-[22px] bg-[#FFFFE1] border border-[#7F9DB9] px-2 uppercase"
                      />
                    </div>
                  </fieldset>

                  {/* Contact Person */}
                  <fieldset className="border border-[#7F9DB9] p-2 rounded bg-[#ECE9D8] space-y-1.5">
                    <legend className="font-bold px-1 text-black">Contact Person</legend>
                    <div className="flex items-center space-x-2">
                      <label className="w-24 font-semibold">Nama :</label>
                      <input
                        type="text"
                        value={newCpNama}
                        onChange={(e) => setNewCpNama(e.target.value)}
                        className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-24 font-semibold">Email :</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-24 font-semibold">Handphone :</label>
                      <input
                        type="text"
                        value={newHandphone}
                        onChange={(e) => setNewHandphone(e.target.value)}
                        className="w-36 h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono"
                      />
                    </div>
                  </fieldset>
                </div>
              </div>

              {/* Bottom Grid: Invoice Address vs Delivery Address */}
              <div className="grid grid-cols-2 gap-4 mt-3 pt-2 border-t border-[#ACA899]">
                {/* Invoice Address */}
                <fieldset className="border border-[#7F9DB9] p-2 rounded bg-[#ECE9D8] space-y-1.5">
                  <legend className="font-bold px-1 text-black">Invoice Address</legend>
                  <div className="flex items-center space-x-2">
                    <label className="w-20 font-semibold">Alamat :</label>
                    <input
                      type="text"
                      value={newInvAlamat}
                      onChange={(e) => setNewInvAlamat(e.target.value)}
                      className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="w-20 font-semibold">Kota :</label>
                    <input
                      type="text"
                      value={newInvKota}
                      onChange={(e) => setNewInvKota(e.target.value)}
                      className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="w-20 font-semibold">Telepon :</label>
                    <input
                      type="text"
                      value={newInvTelepon}
                      onChange={(e) => setNewInvTelepon(e.target.value)}
                      className="w-40 h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono"
                    />
                    <span>-</span>
                    <input
                      type="text"
                      value={newInvFax}
                      onChange={(e) => setNewInvFax(e.target.value)}
                      placeholder="Fax"
                      className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono"
                    />
                  </div>
                </fieldset>

                {/* Delivery Address */}
                <fieldset className="border border-[#7F9DB9] p-2 rounded bg-[#ECE9D8] space-y-1.5">
                  <legend className="font-bold px-1 text-black">Delivery Address</legend>
                  <div className="flex items-center space-x-2">
                    <label className="w-20 font-semibold">Alamat :</label>
                    <input
                      type="text"
                      value={newDelAlamat}
                      onChange={(e) => setNewDelAlamat(e.target.value)}
                      className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="w-20 font-semibold">Kota :</label>
                    <input
                      type="text"
                      value={newDelKota}
                      onChange={(e) => setNewDelKota(e.target.value)}
                      className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="w-20 font-semibold">Telepon :</label>
                    <input
                      type="text"
                      value={newDelTelepon}
                      onChange={(e) => setNewDelTelepon(e.target.value)}
                      className="w-40 h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono"
                    />
                    <span>-</span>
                    <input
                      type="text"
                      value={newDelFax}
                      onChange={(e) => setNewDelFax(e.target.value)}
                      placeholder="Fax"
                      className="flex-1 h-[22px] bg-white border border-[#7F9DB9] px-2 font-mono"
                    />
                  </div>
                </fieldset>
              </div>

              {modalError && (
                <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1 text-[11px] font-semibold">
                  ⚠ {modalError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ACA899]">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-5 py-1 bg-[#ECE9D8] hover:bg-[#F5F2E6] active:bg-[#D4D0C8] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] font-bold text-black rounded-[2px] cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="px-5 py-1 bg-[#ECE9D8] hover:bg-[#F5F2E6] active:bg-[#D4D0C8] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] text-black rounded-[2px] cursor-pointer"
                >
                  Close
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
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{c.invKota || '-'}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{c.invTelepon || '-'}</td>
                          <td className="px-2 py-1 border-r border-[#E0E0E0]">{c.email || '-'}</td>
                          <td className="px-2 py-1">{c.namaSales || '-'}</td>
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
          { header: 'Limit Kredit', accessor: (r) => formatMoney(r.limitKredit), align: 'right', width: '95px' },
          { header: 'Alamat Invoice', accessor: 'invAlamat' },
          { header: 'Kota', accessor: 'invKota', width: '85px' },
          { header: 'Phone', accessor: 'invTelepon', width: '90px' },
          { header: 'Sales', accessor: 'namaSales', width: '110px' },
          { header: 'Expedisi', accessor: 'namaExpedisi', width: '110px' },
        ]}
        rows={filteredCustomer}
        summaryItems={[
          {
            label: 'Total Limit Kredit',
            value: formatMoney(filteredCustomer.reduce((a, b) => a + b.limitKredit, 0)),
          },
        ]}
      />
    </div>
  );
};
