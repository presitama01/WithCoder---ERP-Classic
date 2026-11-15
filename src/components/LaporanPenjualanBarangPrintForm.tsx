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
  formatMoney,
  formatRupiah,
  nextUniqueCode,
  parseNum,
  syncAppSettings,
  todayIso,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { getCurrentUser } from '../lib/authService';

interface LaporanPenjualanBarangPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaporanPenjualanBarangPrintForm: React.FC<
  LaporanPenjualanBarangPrintFormProps
> = ({ isOpen, onClose }) => {
  const [tglStart, setTglStart] = useState<string>('12-09-2026');
  const [tglEnd, setTglEnd] = useState<string>('12-09-2026');
  const [filterType, setFilterType] = useState<
    'jenis_transaksi' | 'sales' | 'customer' | 'all_periode'
  >('all_periode');
  const [jenisTransaksi, setJenisTransaksi] = useState<string>('');
  const [salesCode, setSalesCode] = useState<string>('');
  const [salesName, setSalesName] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>(
    '01 - Laporan Detail Penjualan Barang'
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [salesCatalog, setSalesCatalog] = useState<{ kode: string; nama: string }[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [customerCatalog, setCustomerCatalog] = useState<string[]>([]);

  // Live Supabase table + Search state
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add / Koreksi Modal
  const [isCrudOpen, setIsCrudOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNoBukti, setFormNoBukti] = useState<string>('');
  const [formJenisFaktur, setFormJenisFaktur] = useState<string>('REGULAR');
  const [formTanggal, setFormTanggal] = useState<string>(() => toDisplayDMyShort(todayIso()));
  const [formCustomer, setFormCustomer] = useState<string>('');
  const [formNoSo, setFormNoSo] = useState<string>('');
  const [formNoSj, setFormNoSj] = useState<string>('');
  const [formSales, setFormSales] = useState<string>('05');
  const [formPpn, setFormPpn] = useState<string>('11');
  const [formNilai, setFormNilai] = useState<string>('0');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<any | null>(null);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadLiveRows = async (): Promise<any[]> => {
    const rows = await erpList<any>('faktur_penjualans', { orderBy: 'tanggal', asc: false });
    const mapped = rows.map((r) => ({
      ...r,
      id: String(r.id),
      no_bukti: r.no_bukti || '',
      jenis_faktur: r.jenis_faktur || 'REGULAR',
      tanggal_display: toDisplayDMyShort(r.tanggal),
      nama_customer: r.nama_customer || '',
      no_so: r.no_so || '',
      no_sj: r.no_sj || '',
      po_no: r.po_no || '',
      sales: r.sales || '',
      ppn_num: Number(r.ppn ?? 11),
      ppn: `${Number(r.ppn ?? 11)}%`,
      nilai: Number(r.nilai_penjualan || 0),
      sts_lunas: r.sts_lunas || 'Not Yet',
      keterangan: r.keterangan || '',
    }));
    setTableRows(mapped);
    if (mapped.length > 0 && !mapped.some((m) => m.id === selectedId)) {
      setSelectedId(mapped[0].id);
    }
    return mapped;
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      try {
        setIsBusy(true);
        const [sales, lokasis, customers] = await Promise.all([
          erpList<any>('master_sales', { orderBy: 'kode_sales', asc: true }).catch(() => []),
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setSalesCatalog(sales.map((s) => ({ kode: s.kode_sales || '', nama: s.nama_sales || '' })));
        setLokasiOptions(lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()));
        setCustomerCatalog(customers.map((c) => c.nama_customer || '').filter(Boolean));
        const rawPreset = localStorage.getItem('withcoder_preset_penjualan_barang');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.tglStart) setTglStart(v.tglStart);
          if (v.tglEnd) setTglEnd(v.tglEnd);
          if (v.lokasiStock) setLokasiStock(v.lokasiStock);
          if (v.bentukLaporan) setBentukLaporan(v.bentukLaporan);
        }
        await loadLiveRows();
      } catch {
        // ignore
      } finally {
        if (active) setIsBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const match = salesCatalog.find(
      (s) => s.kode.toLowerCase() === salesCode.trim().toLowerCase()
    );
    if (match) {
      setSalesName(match.nama);
    }
  }, [salesCode, salesCatalog]);

  if (!isOpen) return null;

  const filteredTableRows = tableRows.filter((r) => {
    if (filterType === 'sales' && salesCode.trim()) {
      if (!r.sales.toLowerCase().includes(salesCode.trim().toLowerCase())) return false;
    }
    if (filterType === 'customer' && customerFilter.trim()) {
      if (!r.nama_customer.toLowerCase().includes(customerFilter.trim().toLowerCase())) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      if (searchField === 'No.Faktur') return r.no_bukti.toLowerCase().includes(q);
      if (searchField === 'Customer') return r.nama_customer.toLowerCase().includes(q);
      if (searchField === 'No.SO') return r.no_so.toLowerCase().includes(q);
      if (searchField === 'Sales') return r.sales.toLowerCase().includes(q);
      if (searchField === 'Jenis') return r.jenis_faktur.toLowerCase().includes(q);
      return (
        r.no_bukti.toLowerCase().includes(q) ||
        r.nama_customer.toLowerCase().includes(q) ||
        r.no_so.toLowerCase().includes(q) ||
        r.jenis_faktur.toLowerCase().includes(q) ||
        r.keterangan.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleBaru = () => {
    setEditingId(null);
    setModalError(null);
    setFormNoBukti(nextUniqueCode(tableRows.map((r) => r.no_bukti), 'INJ-2608-', 4));
    setFormJenisFaktur('REGULAR');
    setFormTanggal(toDisplayDMyShort(todayIso()));
    setFormCustomer(customerFilter || '');
    setFormNoSo('');
    setFormNoSj('');
    setFormSales(salesCode || '05');
    setFormPpn('11');
    setFormNilai('0');
    setFormKeterangan('');
    setIsCrudOpen(true);
  };

  const handleKoreksi = () => {
    const current =
      filteredTableRows.find((r) => r.id === selectedId) ||
      tableRows.find((r) => r.id === selectedId) ||
      filteredTableRows[0];
    if (!current) {
      showFeedback('Pilih baris Faktur Penjualan terlebih dahulu (atau klik Baru)');
      return;
    }
    setSelectedId(current.id);
    setEditingId(current.id);
    setModalError(null);
    setFormNoBukti(current.no_bukti);
    setFormJenisFaktur(current.jenis_faktur || 'REGULAR');
    setFormTanggal(current.tanggal_display || toDisplayDMyShort(todayIso()));
    setFormCustomer(current.nama_customer);
    setFormNoSo(current.no_so);
    setFormNoSj(current.no_sj);
    setFormSales(current.sales || '05');
    setFormPpn(String(current.ppn_num ?? 11));
    setFormNilai(String(current.nilai || 0));
    setFormKeterangan(current.keterangan);
    setIsCrudOpen(true);
  };

  const handleSaveCrud = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formNoBukti.trim() || !formCustomer.trim()) {
      setModalError('No. Faktur dan Nama Customer wajib diisi.');
      return;
    }
    try {
      setIsBusy(true);
      const tglIso = toIsoDate(formTanggal) || todayIso();
      const payload = {
        jenis_faktur: formJenisFaktur,
        no_bukti: formNoBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_customer: formCustomer.trim().toUpperCase(),
        no_so: formNoSo.trim().toUpperCase(),
        no_sj: formNoSj.trim().toUpperCase(),
        sales: formSales.trim().toUpperCase(),
        jth_tmp: tglIso,
        ppn: parseNum(formPpn),
        nilai_penjualan: parseNum(formNilai),
        keterangan: formKeterangan.trim(),
      };
      if (editingId) {
        await erpUpdate('faktur_penjualans', editingId, {
          ...payload,
          diupdate_oleh: (getCurrentUser().username || 'ADMIN'),
          tgl_update: todayIso(),
        });
        showFeedback('Faktur Penjualan diperbarui di Supabase');
      } else {
        const created = await erpCreate<any>('faktur_penjualans', {
          ...payload,
          sts_lunas: 'Not Yet',
          sts_print: 'Not Yet',
          sts_post: 'Not Yet',
          dibuat_oleh: (getCurrentUser().username || 'ADMIN'),
          tgl_created: todayIso(),
        });
        if (created?.id) setSelectedId(String(created.id));
        showFeedback('Faktur Penjualan tersimpan ke Supabase');
      }
      setIsCrudOpen(false);
      setEditingId(null);
      await loadLiveRows();
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Faktur Penjualan';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRequestHapus = () => {
    const current =
      filteredTableRows.find((r) => r.id === selectedId) ||
      tableRows.find((r) => r.id === selectedId);
    if (!current) {
      showFeedback('Pilih baris Faktur Penjualan yang akan dihapus');
      return;
    }
    setConfirmDeleteRow(current);
  };

  const handleConfirmHapus = async () => {
    if (!confirmDeleteRow) return;
    try {
      setIsBusy(true);
      await erpDelete('faktur_penjualans', confirmDeleteRow.id);
      setConfirmDeleteRow(null);
      await loadLiveRows();
      showFeedback('Faktur Penjualan dihapus dari Supabase');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSimpan = async () => {
    try {
      setIsBusy(true);
      localStorage.setItem(
        'withcoder_preset_penjualan_barang',
        JSON.stringify({ tglStart, tglEnd, lokasiStock, bentukLaporan })
      );
      await syncAppSettings({
        periode_start: toIsoDate(tglStart),
        periode_end: toIsoDate(tglEnd),
        lokasi_aktif: lokasiStock !== 'ALL' ? lokasiStock : undefined,
      });
      await loadLiveRows();
      showFeedback('Parameter & data Penjualan Barang tersinkron ke Supabase');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFind = async () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
    try {
      setIsBusy(true);
      await loadLiveRows();
      showFeedback('Data Penjualan dimuat ulang dari Supabase');
    } catch (err: any) {
      showFeedback(`Gagal muat: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const startIso = toIsoDate(tglStart);
    const endIso = toIsoDate(tglEnd);
    const rows = await erpList<any>('faktur_penjualans', {
      gte: startIso ? { tanggal: startIso } : undefined,
      lte: endIso ? { tanggal: endIso } : undefined,
      orderBy: 'tanggal',
      asc: false,
    });
    return rows
      .filter((r) => {
        if (lokasiStock !== 'ALL' && r.lokasi_stock && r.lokasi_stock !== lokasiStock) return false;
        if (filterType === 'sales' && salesCode.trim()) {
          return (r.sales || '').toLowerCase().includes(salesCode.trim().toLowerCase());
        }
        if (filterType === 'customer' && customerFilter.trim()) {
          return (r.nama_customer || '').toLowerCase().includes(customerFilter.trim().toLowerCase());
        }
        return true;
      })
      .map((r) => ({
        no_bukti: r.no_bukti || '',
        jenis_faktur: r.jenis_faktur || 'REGULAR',
        tanggal: toDisplayDMyShort(r.tanggal),
        nama_customer: r.nama_customer || '',
        no_so: r.no_so || '',
        po_no: r.po_no || '',
        sales: r.sales || '',
        ppn: `${Number(r.ppn ?? 11)}%`,
        nilai: Number(r.nilai_penjualan || 0),
        sts_lunas: r.sts_lunas || 'Not Yet',
      }));
  };

  const handlePreview = async () => {
    try {
      setIsBusy(true);
      const data = await fetchReportData();
      setPreviewRows(data);
      setIsPrintOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal memuat laporan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsBusy(true);
      const [data, company] = await Promise.all([fetchReportData(), fetchActiveCompanyProfile()]);
      exportToExcel({
        fileName: 'Laporan_Penjualan_Barang',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Periode: ${tglStart} s/d ${tglEnd} | Lokasi: ${lokasiStock}`,
        companyProfile: company,
        columns: [
          { header: 'No.Faktur', accessor: 'no_bukti' },
          { header: 'Jenis', accessor: 'jenis_faktur', align: 'center' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
          { header: 'Nama Customer', accessor: 'nama_customer' },
          { header: 'No.SO', accessor: 'no_so' },
          { header: 'Sales', accessor: 'sales', align: 'center' },
          { header: 'PPN', accessor: 'ppn', align: 'center' },
          { header: 'Nilai Penjualan', accessor: 'nilai', align: 'right' },
          { header: 'Status', accessor: 'sts_lunas', align: 'center' },
        ],
        rows: data,
      });
      showFeedback('Export Excel selesai');
    } catch (err: any) {
      showFeedback(`Gagal export: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const totalPenjualan = previewRows.reduce((a, r) => a + Number(r.nilai || 0), 0);

  return (
    <div
      id="laporan-penjualan-barang-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Laporan Penjualan Barang"
        onClose={onClose}
        onFind={handleFind}
        onPrint={handlePreview}
        onTableView={() => loadLiveRows()}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3 space-y-2.5">
        <div className="max-w-[660px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[15px] tracking-wide text-black font-sans">
              LAPORAN PENJUALAN BARANG
            </h1>
          </div>

          <div className="border-b border-[#999999] pb-2">
            <FormActionButtons
              compact
              onSimpan={handleSimpan}
              onBaru={handleBaru}
              onKoreksi={handleKoreksi}
              onHapus={handleRequestHapus}
              onPrint={handlePreview}
              onFind={handleFind}
              isBusy={isBusy}
              feedback={feedback}
            />
          </div>

          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">Periode</legend>
            <div className="flex items-center space-x-1.5 pt-0.5">
              <label className="font-bold text-black text-[11px] whitespace-nowrap pl-2 pr-1">
                Tanggal ( dd-mm-yyyy ) :
              </label>

              <DatePickerInput
                value={tglStart}
                onChange={(formatted) => setTglStart(formatted)}
                format="dmy"
                inputClassName="w-[84px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />

              <span className="w-[62px] h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                s / d
              </span>

              <DatePickerInput
                value={tglEnd}
                onChange={(formatted) => setTglEnd(formatted)}
                format="dmy"
                inputClassName="w-[84px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />
            </div>
          </fieldset>

          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-[#808080] cursor-not-allowed w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_penjualan_filter"
                    disabled
                    checked={filterType === 'jenis_transaksi'}
                    onChange={() => setFilterType('jenis_transaksi')}
                    className="cursor-not-allowed"
                  />
                  <span>Jenis Transaksi</span>
                </label>

                <div className="flex items-center w-[106px] h-[21px] bg-white border border-[#7A7A7A]">
                  <select
                    value={jenisTransaksi}
                    onChange={(e) => setJenisTransaksi(e.target.value)}
                    disabled
                    className="w-full h-full px-1 text-[11px] bg-white outline-none cursor-not-allowed text-[#808080]"
                  >
                    <option value=""></option>
                    <option value="TUNAI">TUNAI</option>
                    <option value="KREDIT">KREDIT</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_penjualan_filter"
                    checked={filterType === 'sales'}
                    onChange={() => setFilterType('sales')}
                    className="cursor-pointer"
                  />
                  <span>Sales</span>
                </label>

                <div className="flex items-center space-x-1 flex-1">
                  <input
                    type="text"
                    list="lap-penj-sales-list"
                    value={salesCode}
                    onChange={(e) => setSalesCode(e.target.value.toUpperCase())}
                    disabled={filterType !== 'sales'}
                    className="w-[106px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8] shrink-0"
                  />
                  <datalist id="lap-penj-sales-list">
                    {salesCatalog.map((s) => (
                      <option key={s.kode} value={s.kode}>
                        {s.nama}
                      </option>
                    ))}
                  </datalist>
                  <input
                    type="text"
                    value={salesName}
                    onChange={(e) => setSalesName(e.target.value)}
                    disabled={filterType !== 'sales'}
                    className="flex-1 h-[21px] bg-[#FFFFBF] border border-[#7A7A7A] px-2 text-[11px] outline-none shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_penjualan_filter"
                    checked={filterType === 'customer'}
                    onChange={() => setFilterType('customer')}
                    className="cursor-pointer"
                  />
                  <span>Customer</span>
                </label>
                {filterType === 'customer' && (
                  <>
                    <input
                      type="text"
                      list="lap-penj-cust-list"
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      placeholder="Pilih / ketik customer..."
                      className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] outline-none"
                    />
                    <datalist id="lap-penj-cust-list">
                      {customerCatalog.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </>
                )}
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                <input
                  type="radio"
                  name="laporan_penjualan_filter"
                  checked={filterType === 'all_periode'}
                  onChange={() => setFilterType('all_periode')}
                  className="cursor-pointer"
                />
                <span>ALL berdasarkan periode</span>
              </label>
            </div>
          </fieldset>

          <div className="flex items-end justify-between gap-2.5 pt-0.5">
            <div className="flex-1 space-y-1.5">
              <fieldset className="border border-[#999999] px-2 py-1 rounded-none relative">
                <legend className="text-[11px] font-semibold px-1 text-black">
                  Lokasi Stock :
                </legend>
                <div className="flex items-center bg-white border border-[#7A7A7A]">
                  <select
                    value={lokasiStock}
                    onChange={(e) => setLokasiStock(e.target.value)}
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer"
                  >
                    <option value="ALL">ALL</option>
                    {lokasiOptions.length > 0 ? (
                      lokasiOptions.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="01 - OFFICE">01 - OFFICE</option>
                        <option value="02 - GUDANG JAKARTA">02 - GUDANG JAKARTA</option>
                        <option value="03 - CABANG SURABAYA">03 - CABANG SURABAYA</option>
                      </>
                    )}
                  </select>
                </div>
              </fieldset>

              <fieldset className="border border-[#999999] px-2 py-1 rounded-none relative">
                <legend className="text-[11px] font-semibold px-1 text-black">
                  Bentuk Laporan :
                </legend>
                <div className="flex items-center bg-white border border-[#7A7A7A]">
                  <select
                    value={bentukLaporan}
                    onChange={(e) => setBentukLaporan(e.target.value)}
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer"
                  >
                    <option value="01 - Laporan Detail Penjualan Barang">
                      01 - Laporan Detail Penjualan Barang
                    </option>
                    <option value="02 - Rekap Penjualan Barang">
                      02 - Rekap Penjualan Barang
                    </option>
                    <option value="03 - Laporan Penjualan per Customer">
                      03 - Laporan Penjualan per Customer
                    </option>
                  </select>
                </div>
              </fieldset>
            </div>

            <div className="flex items-stretch gap-1.5 h-[84px] shrink-0">
              <button
                type="button"
                disabled={isBusy}
                onClick={handlePreview}
                className="w-[82px] h-full bg-[#FFE4C4] hover:bg-[#FFECD6] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white font-extrabold text-[11px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span>
                  <span className="underline">P</span>REVIEW
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-[82px] h-full bg-[#FFE4C4] hover:bg-[#FFECD6] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white font-extrabold text-[11px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center p-1"
              >
                <span className="border border-dotted border-black/60 w-full h-full flex items-center justify-center">
                  <span className="underline">C</span>LOSE
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Supabase Search & Data Grid Panel */}
        <div className="max-w-[980px] bg-[#ECE9D8] border border-[#808080] flex flex-col shadow-xs">
          <div className="bg-[#D4D0C8] border-b border-[#808080] px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-[11px] text-[#003C74]">Search :</span>
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="h-[22px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] outline-none"
              >
                <option value="Semua">Semua Kolom</option>
                <option value="No.Faktur">No.Faktur</option>
                <option value="Customer">Customer</option>
                <option value="No.SO">No.SO</option>
                <option value="Sales">Sales</option>
                <option value="Jenis">Jenis</option>
              </select>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadLiveRows();
                }}
                placeholder="Cari No.Faktur, Customer, No.SO, Sales..."
                className="w-[230px] h-[22px] bg-white border border-[#7A7A7A] px-2 text-[11px] outline-none focus:border-[#316AC5]"
              />
              <button
                type="button"
                onClick={() => loadLiveRows()}
                className="h-[22px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] text-[11px] font-semibold cursor-pointer"
              >
                Cari / Refresh
              </button>
            </div>
            <span className="text-[11px] text-black">
              Data Supabase (<b>faktur_penjualans</b>): <b>{filteredTableRows.length}</b> baris
            </span>
          </div>

          <div className="max-h-[220px] overflow-auto bg-white">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080]">
                <tr>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Faktur</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Jenis</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.SO</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Sales</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">PPN</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">Nilai Penjualan</th>
                  <th className="px-2 py-1 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                      Belum ada data Faktur Penjualan. Klik "Baru" untuk menambah ke Supabase.
                    </td>
                  </tr>
                ) : (
                  filteredTableRows.map((r) => {
                    const isSel = r.id === selectedId;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        onDoubleClick={() => {
                          setSelectedId(r.id);
                          setEditingId(r.id);
                          setModalError(null);
                          setFormNoBukti(r.no_bukti);
                          setFormJenisFaktur(r.jenis_faktur || 'REGULAR');
                          setFormTanggal(r.tanggal_display || toDisplayDMyShort(todayIso()));
                          setFormCustomer(r.nama_customer);
                          setFormNoSo(r.no_so);
                          setFormNoSj(r.no_sj);
                          setFormSales(r.sales || '05');
                          setFormPpn(String(r.ppn_num ?? 11));
                          setFormNilai(String(r.nilai || 0));
                          setFormKeterangan(r.keterangan);
                          setIsCrudOpen(true);
                        }}
                        className={`cursor-pointer border-b border-[#E0E0E0] ${
                          isSel ? 'bg-[#316AC5] text-white' : 'hover:bg-[#EAF2FC]'
                        }`}
                      >
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.no_bukti}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.jenis_faktur}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.tanggal_display}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_customer}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_so || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.sales}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.ppn}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">
                          {formatMoney(r.nilai)}
                        </td>
                        <td className="px-2 py-1 text-center">{r.sts_lunas}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Faktur Penjualan Modal */}
      {isCrudOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[460px] flex flex-col overflow-hidden text-xs">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 flex justify-between items-center font-bold">
              <span>{editingId ? 'Koreksi Faktur Penjualan' : 'Tambah Faktur Penjualan Baru'}</span>
              <button
                type="button"
                onClick={() => setIsCrudOpen(false)}
                className="w-5 h-5 bg-[#C00000] text-white font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form noValidate onSubmit={handleSaveCrud} className="p-3 space-y-2 text-[11px]">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">No. Faktur *</label>
                  <input
                    type="text"
                    value={formNoBukti}
                    onChange={(e) => setFormNoBukti(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Jenis</label>
                  <select
                    value={formJenisFaktur}
                    onChange={(e) => setFormJenisFaktur(e.target.value)}
                    className="w-full h-[24px] px-1 bg-white border border-[#7A7A7A]"
                  >
                    <option value="REGULAR">REGULAR</option>
                    <option value="DP">DP</option>
                    <option value="LAIN">LAIN</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Tanggal</label>
                  <DatePickerInput
                    value={formTanggal}
                    onChange={(fmt) => setFormTanggal(fmt)}
                    format="dmy"
                    inputClassName="w-full h-[24px] px-2 bg-white border border-[#7A7A7A]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-0.5">Nama Customer *</label>
                <input
                  type="text"
                  list="penj-modal-cust"
                  value={formCustomer}
                  onChange={(e) => setFormCustomer(e.target.value.toUpperCase())}
                  className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                />
                <datalist id="penj-modal-cust">
                  {customerCatalog.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">No. SO</label>
                  <input
                    type="text"
                    value={formNoSo}
                    onChange={(e) => setFormNoSo(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">No. SJ</label>
                  <input
                    type="text"
                    value={formNoSj}
                    onChange={(e) => setFormNoSj(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Sales</label>
                  <input
                    type="text"
                    list="lap-penj-sales-list"
                    value={formSales}
                    onChange={(e) => setFormSales(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">PPN (%)</label>
                  <input
                    type="number"
                    value={formPpn}
                    onChange={(e) => setFormPpn(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold mb-0.5">Nilai Penjualan (Rp)</label>
                  <input
                    type="number"
                    value={formNilai}
                    onChange={(e) => setFormNilai(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-0.5">Keterangan</label>
                <input
                  type="text"
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A]"
                />
              </div>

              {modalError && (
                <div className="p-2 bg-[#FDE8E8] border border-[#C00000] text-[#900000] font-semibold">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#ACA899]">
                <button
                  type="button"
                  onClick={() => setIsCrudOpen(false)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-4 py-1 bg-[#0A246A] text-white border border-black font-bold cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-xl w-[360px] overflow-hidden">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 font-bold text-xs">
              Konfirmasi Hapus Faktur Penjualan
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>
                Yakin ingin menghapus Faktur [{confirmDeleteRow.no_bukti}] dari database Supabase?
              </p>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteRow(null)}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleConfirmHapus}
                  className="px-3 py-1 bg-[#C00000] text-white border border-black text-xs font-bold cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={bentukLaporan.toUpperCase()}
        subtitle={`Periode: ${tglStart} s/d ${tglEnd}`}
        orientation="landscape"
        metaLines={[
          { label: 'Periode Tanggal', value: `${tglStart} s/d ${tglEnd}` },
          { label: 'Lokasi Stock', value: lokasiStock },
          {
            label: 'Filter',
            value:
              filterType === 'sales'
                ? `Sales ${salesCode || 'Semua'} ${salesName ? `(${salesName})` : ''}`
                : filterType === 'customer'
                ? customerFilter || 'Semua Customer'
                : 'ALL Berdasarkan Periode',
          },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={[
          { header: 'No.Faktur', accessor: 'no_bukti', width: '105px' },
          { header: 'Jenis', accessor: 'jenis_faktur', align: 'center', width: '65px' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '80px' },
          { header: 'Nama Customer', accessor: 'nama_customer' },
          { header: 'No.SO', accessor: 'no_so', width: '100px' },
          { header: 'Sales', accessor: 'sales', align: 'center', width: '50px' },
          { header: 'PPN', accessor: 'ppn', align: 'center', width: '45px' },
          {
            header: 'Nilai Penjualan',
            accessor: (r) => formatMoney(r.nilai),
            align: 'right',
            width: '105px',
          },
          { header: 'Status', accessor: 'sts_lunas', align: 'center', width: '65px' },
        ]}
        rows={previewRows}
        summaryItems={[
          { label: 'Total Faktur', value: `${previewRows.length} Dokumen` },
          { label: 'Total Nilai Penjualan', value: formatRupiah(totalPenjualan) },
        ]}
      />
    </div>
  );
};
