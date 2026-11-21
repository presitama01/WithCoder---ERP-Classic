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
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

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

  const SEARCH_COL_MAP: Record<string, string> = {
    Kode: 'kode_customer',
    'Nama Pelanggan': 'nama_customer',
    NPWP: 'npwp',
    Kota: 'inv_kota',
    Phone: 'inv_telepon',
    Email: 'email',
    Sales: 'nama_sales',
    Wilayah: 'wilayah',
  };

  const loadData = async (opts?: { field?: string; term?: string }): Promise<CustomerItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();
      const queryOpts: Record<string, any> = { orderBy: 'kode_customer', asc: true, limit: 1000 };
      if (activeTerm) {
        const dbCol = SEARCH_COL_MAP[activeField];
        if (dbCol) {
          queryOpts.searchCol = dbCol;
          queryOpts.searchVal = activeTerm;
        } else {
          queryOpts.orSearch =
            'kode_customer,nama_customer,npwp,inv_alamat,inv_kota,del_alamat,del_kota,inv_telepon,email,handphone,nama_sales,nama_expedisi,contact_nama,wilayah';
          queryOpts.searchVal = activeTerm;
        }
      }
      const [rows] = await Promise.all([
        erpList<any>('master_customers', queryOpts),
        loadMasterReferences(),
      ]);
      const mapped = rows.map(mapDbToItem);
      setCustomerList(mapped);
      if (mapped.length > 0 && !mapped.some((c) => c.id === selectedId)) {
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
    const selected = customerList.find((c) => c.id === selectedId);
    if (!selected) {
      showFeedback('Pilih record yang akan disimpan terlebih dahulu');
      return;
    }
    try {
      setIsBusy(true);
      const saved = await erpUpdate<any>('master_customers', selected.id, {
        kode_customer: selected.kodeCustomer.trim().toUpperCase(),
        nama_customer: selected.namaCustomer.trim().toUpperCase(),
        ppn: selected.ppn,
        hitung: selected.hitung,
        npwp: selected.npwp.trim(),
        alamat_npwp: selected.alamatNpwp.trim(),
        wilayah: selected.wilayah.trim().toUpperCase(),
        limit_kredit: Number(selected.limitKredit) || 0,
        tmp_pembayaran: Number(selected.tmpPembayaran) || 0,
        rubah_kode: selected.rubahKode.trim().toUpperCase(),
        kode_sales: selected.kodeSales.trim().toUpperCase(),
        nama_sales: selected.namaSales.trim().toUpperCase(),
        kode_expedisi: selected.kodeExpedisi.trim().toUpperCase(),
        nama_expedisi: selected.namaExpedisi.trim().toUpperCase(),
        contact_nama: selected.cpNama.trim(),
        email: selected.email.trim(),
        handphone: selected.handphone.trim(),
        inv_alamat: selected.invAlamat.trim(),
        inv_kota: selected.invKota.trim().toUpperCase(),
        inv_telepon: selected.invTelepon.trim(),
        inv_fax: selected.invFax.trim(),
        del_alamat: selected.delAlamat.trim(),
        del_kota: selected.delKota.trim().toUpperCase(),
        del_telepon: selected.delTelepon.trim(),
        del_fax: selected.delFax.trim(),
        alamat: selected.invAlamat.trim(),
        kota: selected.invKota.trim().toUpperCase(),
        phone: selected.invTelepon.trim(),
        sales: selected.namaSales.trim().toUpperCase(),
      });
      const mapped = mapDbToItem(saved);
      setCustomerList((prev) => prev.map((c) => (c.id === selected.id ? mapped : c)));
      showFeedback(`Pelanggan [${mapped.kodeCustomer} - ${mapped.namaCustomer}] tersimpan ke Supabase`);
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
    if (searchField === 'Kode') return matchesMultiKeyword([item.kodeCustomer], searchTerm);
    if (searchField === 'Nama Pelanggan') return matchesMultiKeyword([item.namaCustomer], searchTerm);
    if (searchField === 'NPWP') return matchesMultiKeyword([item.npwp], searchTerm);
    if (searchField === 'Wilayah') return matchesMultiKeyword([item.wilayah], searchTerm);
    if (searchField === 'Kota') return matchesMultiKeyword([item.invKota, item.delKota], searchTerm);
    if (searchField === 'Phone') return matchesMultiKeyword([item.invTelepon, item.handphone, item.delTelepon], searchTerm);
    if (searchField === 'Email') return matchesMultiKeyword([item.email], searchTerm);
    if (searchField === 'Sales') return matchesMultiKeyword([item.namaSales, item.kodeSales], searchTerm);
    return matchesMultiKeyword(
      [
        item.kodeCustomer,
        item.namaCustomer,
        item.npwp,
        item.invAlamat,
        item.invKota,
        item.delAlamat,
        item.delKota,
        item.wilayah,
        item.cpNama,
        item.email,
        item.handphone,
        item.invTelepon,
        item.kodeSales,
        item.namaSales,
        item.namaExpedisi,
      ],
      searchTerm
    );
  });

  const selectedCustomer =
    filteredCustomer.find((c) => c.id === selectedId) ||
    customerList.find((c) => c.id === selectedId) ||
    null;

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

  const handleExecuteToolbarSearch = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows && rows.length > 0) {
      setSelectedId(rows[0].id);
      showFeedback(
        searchTerm.trim()
          ? `Ditemukan ${rows.length} pelanggan dari Supabase`
          : `Menampilkan ${rows.length} pelanggan dari Supabase`
      );
    } else if (rows) {
      showFeedback('Data pelanggan tidak ditemukan di Supabase');
    }
  };

  const handleResetSearch = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} pelanggan)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
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

          <ToolbarSearchControl
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onCari={handleExecuteToolbarSearch}
            onReset={handleResetSearch}
            inputRef={searchInputRef}
            isBusy={isBusy}
            compact
            options={[
              { value: 'Semua', label: 'Semua' },
              { value: 'Kode', label: 'Kode' },
              { value: 'Nama Pelanggan', label: 'Nama Pelanggan' },
              { value: 'NPWP', label: 'NPWP' },
              { value: 'Kota', label: 'Kota' },
              { value: 'Wilayah', label: 'Wilayah' },
              { value: 'Phone', label: 'Phone' },
              { value: 'Email', label: 'Email' },
              { value: 'Sales', label: 'Sales' },
            ]}
          />
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

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Master Pelanggan"
        rows={customerList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.kodeCustomer,
          r.namaCustomer,
          r.npwp,
          r.invAlamat,
          r.invKota,
          r.invTelepon,
          r.handphone,
          r.email,
          r.namaSales,
          r.namaExpedisi,
          r.wilayah,
          r.cpNama,
        ]}
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
        onSelectRow={(c, q) => {
          setSelectedId(c.id);
          setSearchTerm(q);
          showFeedback(`Pelanggan [${c.kodeCustomer} - ${c.namaCustomer}] dipilih`);
        }}
        columns={[
          { header: 'Kode', accessor: (r) => r.kodeCustomer, widthClass: 'w-24', mono: true, bold: true },
          { header: 'Nama Pelanggan', accessor: (r) => r.namaCustomer, bold: true },
          { header: 'Kota', accessor: (r) => r.invKota || '-', widthClass: 'w-24' },
          { header: 'Phone', accessor: (r) => r.invTelepon || '-', widthClass: 'w-28', mono: true },
          { header: 'Email', accessor: (r) => r.email || '-', widthClass: 'w-36' },
          { header: 'Sales', accessor: (r) => r.namaSales || '-', widthClass: 'w-24' },
        ]}
      />

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
        selectedRow={selectedCustomer}
        selectedTitle="DETAIL MASTER PELANGGAN"
        selectedSubtitle={selectedCustomer ? `Kode: ${selectedCustomer.kodeCustomer} - ${selectedCustomer.namaCustomer}` : undefined}
        selectedMetaLines={
          selectedCustomer
            ? [
                { label: 'Kode Customer', value: selectedCustomer.kodeCustomer },
                { label: 'Nama Customer', value: selectedCustomer.namaCustomer },
                { label: 'NPWP', value: selectedCustomer.npwp || '-' },
                { label: 'Wilayah / Sales', value: [selectedCustomer.wilayah, selectedCustomer.namaSales].filter(Boolean).join(' | ') || '-' },
                { label: 'Contact / Email', value: [selectedCustomer.cpNama, selectedCustomer.email].filter(Boolean).join(' | ') || '-' },
                { label: 'Piutang / Giro', value: `${formatMoney(selectedCustomer.piutang)} / ${formatMoney(selectedCustomer.piutangGiro)}` },
              ]
            : undefined
        }
        selectedSummaryItems={
          selectedCustomer
            ? [{ label: 'Limit Kredit', value: formatMoney(selectedCustomer.limitKredit) }]
            : undefined
        }
      />
    </div>
  );
};
