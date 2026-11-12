import React, { useEffect, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import {
  erpCreate,
  erpDelete,
  erpList,
  erpUpdate,
  fetchActiveCompanyProfile,
  formatMoney,
  parseNum,
  todayIso,
  toDisplayDmy,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

interface LaporanPengeluaranBarangLainPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaporanPengeluaranBarangLainPrintForm: React.FC<
  LaporanPengeluaranBarangLainPrintFormProps
> = ({ isOpen, onClose }) => {
  const [tglStart, setTglStart] = useState<string>('01-08-2026');
  const [tglEnd, setTglEnd] = useState<string>('31-08-2026');
  const [filterType, setFilterType] = useState<
    'merk' | 'batasan_no_bukti' | 'customer' | 'all_periode'
  >('batasan_no_bukti');
  const [noBuktiStart, setNoBuktiStart] = useState<string>('');
  const [noBuktiEnd, setNoBuktiEnd] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>(
    '01 - Laporan Pengeluaran Barang Lain'
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [customerCatalog, setCustomerCatalog] = useState<string[]>([]);
  const [barangCatalog, setBarangCatalog] = useState<{ kode: string; nama: string }[]>([]);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // CRUD Modal for pengeluaran_barang_lains
  const [isCrudOpen, setIsCrudOpen] = useState<boolean>(false);
  const [crudRows, setCrudRows] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNoBukti, setFormNoBukti] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(toDisplayDmy(todayIso()));
  const [formLokasi, setFormLokasi] = useState<string>('01 - OFFICE');
  const [formCustomer, setFormCustomer] = useState<string>('');
  const [formKodeBarang, setFormKodeBarang] = useState<string>('');
  const [formNamaBarang, setFormNamaBarang] = useState<string>('');
  const [formQty, setFormQty] = useState<string>('1');
  const [formKeterangan, setFormKeterangan] = useState<string>('');

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      try {
        const [lokasis, customers, barangs] = await Promise.all([
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
          erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setLokasiOptions(
          lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()).filter(Boolean)
        );
        setCustomerCatalog(customers.map((c) => c.nama_customer || '').filter(Boolean));
        setBarangCatalog(
          barangs.map((b) => ({ kode: b.kode || '', nama: b.nama_barang || '' }))
        );
        const rawPreset = localStorage.getItem('withcoder_preset_pengeluaran_lain');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.tglStart) setTglStart(v.tglStart);
          if (v.tglEnd) setTglEnd(v.tglEnd);
          if (v.lokasiStock) setLokasiStock(v.lokasiStock);
          if (v.bentukLaporan) setBentukLaporan(v.bentukLaporan);
        }
      } catch {
        // Ignore lookup error
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBaru = () => {
    setTglStart('01-08-2026');
    setTglEnd('31-08-2026');
    setFilterType('batasan_no_bukti');
    setNoBuktiStart('');
    setNoBuktiEnd('');
    setCustomerFilter('');
    setLokasiStock('ALL');
    setBentukLaporan('01 - Laporan Pengeluaran Barang Lain');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setNoBuktiStart('');
    setNoBuktiEnd('');
    setCustomerFilter('');
    showFeedback('Parameter dibersihkan');
  };

  const handleSimpanPreset = async () => {
    try {
      localStorage.setItem(
        'withcoder_preset_pengeluaran_lain',
        JSON.stringify({ tglStart, tglEnd, lokasiStock, bentukLaporan })
      );
      showFeedback('Parameter Laporan Pengeluaran Barang Lain tersimpan');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const startIso = toIsoDate(tglStart);
    const endIso = toIsoDate(tglEnd);
    const rows = await erpList<any>('pengeluaran_barang_lains', {
      gte: startIso ? { tanggal: startIso } : undefined,
      lte: endIso ? { tanggal: endIso } : undefined,
      orderBy: 'tanggal',
      asc: false,
    });

    return rows
      .filter((r) => {
        if (lokasiStock !== 'ALL' && r.lokasi_stock && r.lokasi_stock !== lokasiStock) {
          return false;
        }
        if (filterType === 'batasan_no_bukti') {
          const nb = (r.no_bukti || '').toUpperCase();
          const s = noBuktiStart.trim().toUpperCase();
          const e = noBuktiEnd.trim().toUpperCase();
          if (s && nb < s) return false;
          if (e && nb > e) return false;
        }
        if (filterType === 'customer' && customerFilter.trim()) {
          return (r.customer || '').toLowerCase().includes(customerFilter.trim().toLowerCase());
        }
        return true;
      })
      .map((r) => ({
        ...r,
        tanggal_display: toDisplayDMyShort(r.tanggal),
        qty: Number(r.qty || 0),
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
        fileName: 'Laporan_Pengeluaran_Barang_Lain',
        sheetTitle: (bentukLaporan || 'LAPORAN PENGELUARAN BARANG LAIN').toUpperCase(),
        subtitle: `Periode: ${tglStart} s/d ${tglEnd} | Lokasi: ${lokasiStock}`,
        companyProfile: company,
        columns: [
          { header: 'No.Bukti', accessor: 'no_bukti' },
          { header: 'Tanggal', accessor: 'tanggal_display', align: 'center' },
          { header: 'Lokasi Stock', accessor: 'lokasi_stock' },
          { header: 'Customer / Tujuan', accessor: 'customer' },
          { header: 'Kode Barang', accessor: 'kode_barang' },
          { header: 'Nama Barang', accessor: 'nama_barang' },
          { header: 'Qty', accessor: 'qty', align: 'right' },
          { header: 'Keterangan', accessor: 'keterangan' },
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

  const openCrudModal = async () => {
    setIsCrudOpen(true);
    try {
      setIsBusy(true);
      const rows = await erpList<any>('pengeluaran_barang_lains', { orderBy: 'tanggal', asc: false });
      setCrudRows(rows);
      setEditingId(null);
      setFormNoBukti(`PGL-${String(rows.length + 1).padStart(3, '0')}`);
      setFormTanggal(toDisplayDmy(todayIso()));
      setFormLokasi(lokasiStock !== 'ALL' ? lokasiStock : '01 - OFFICE');
      setFormCustomer('');
      setFormKodeBarang('');
      setFormNamaBarang('');
      setFormQty('1');
      setFormKeterangan('');
    } catch (err: any) {
      showFeedback(`Gagal memuat data: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveCrud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNoBukti.trim()) return;
    try {
      setIsBusy(true);
      const payload = {
        no_bukti: formNoBukti.trim().toUpperCase(),
        tanggal: toIsoDate(formTanggal) || todayIso(),
        lokasi_stock: formLokasi,
        customer: formCustomer.trim().toUpperCase(),
        kode_barang: formKodeBarang.trim().toUpperCase(),
        nama_barang: formNamaBarang.trim().toUpperCase(),
        qty: parseNum(formQty),
        keterangan: formKeterangan.trim(),
        dibuat_oleh: 'RETNO',
      };
      if (editingId) {
        const updated = await erpUpdate<any>('pengeluaran_barang_lains', editingId, payload);
        setCrudRows((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
        setEditingId(null);
        showFeedback('Data pengeluaran lain diperbarui');
      } else {
        const created = await erpCreate<any>('pengeluaran_barang_lains', payload);
        setCrudRows((prev) => [created, ...prev]);
        showFeedback('Data pengeluaran lain ditambahkan');
      }
      setFormNoBukti(`PGL-${String(crudRows.length + 2).padStart(3, '0')}`);
      setFormKodeBarang('');
      setFormNamaBarang('');
      setFormQty('1');
      setFormKeterangan('');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteCrud = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('pengeluaran_barang_lains', id);
      setCrudRows((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) setEditingId(null);
      showFeedback('Baris dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const printColumns: PrintColumn<any>[] = [
    { header: 'No.Bukti', accessor: 'no_bukti', width: '95px' },
    { header: 'Tanggal', accessor: 'tanggal_display', align: 'center', width: '75px' },
    { header: 'Lokasi', accessor: 'lokasi_stock', width: '85px' },
    { header: 'Customer / Tujuan', accessor: 'customer' },
    { header: 'Kode Brg', accessor: 'kode_barang', width: '75px' },
    { header: 'Nama Barang', accessor: 'nama_barang' },
    { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', width: '50px' },
    { header: 'Keterangan', accessor: 'keterangan' },
  ];

  const totalQty = previewRows.reduce((s, r) => s + Number(r.qty || 0), 0);

  return (
    <div
      id="laporan-pengeluaran-barang-lain-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Laporan Pengeluaran Barang Lain"
        onClose={onClose}
        onPrint={handlePreview}
        onExportExcel={handleExportExcel}
        extraTools={
          <button
            type="button"
            onClick={openCrudModal}
            className="h-[22px] px-2 bg-[#0055EA] hover:bg-[#196DFF] border border-white/80 rounded-[1px] text-[10px] font-bold text-white cursor-pointer"
          >
            Input / List Data
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[630px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[15px] tracking-wide text-black font-sans">
              LAPORAN PENGELUARAN BARANG LAIN
            </h1>
          </div>

          <div className="border-b border-[#999999] pb-2">
            <FormActionButtons
              compact
              onSimpan={handleSimpanPreset}
              onBaru={handleBaru}
              onKoreksi={() => showFeedback('Silakan ubah filter laporan')}
              onHapus={handleHapus}
              onPrint={handlePreview}
              isBusy={isBusy}
              feedback={feedback}
            />
          </div>

          {/* Group 1: Periode */}
          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Periode
            </legend>
            <div className="flex items-center space-x-1.5 pt-0.5">
              <label className="font-bold text-black text-[11px] whitespace-nowrap pl-2 pr-1">
                Tanggal ( dd-mm-yyyy ) :
              </label>

              <DatePickerInput
                value={tglStart}
                onChange={(formatted) => setTglStart(formatted)}
                format="dmy"
                inputClassName="w-[86px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />

              <span className="w-[62px] h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                s / d
              </span>

              <DatePickerInput
                value={tglEnd}
                onChange={(formatted) => setTglEnd(formatted)}
                format="dmy"
                inputClassName="w-[86px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />
            </div>
          </fieldset>

          {/* Group 2: Pilihan Laporan Berdasarkan */}
          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              <label className="flex items-center space-x-2 text-[11px] text-[#808080] cursor-not-allowed">
                <input
                  type="radio"
                  name="pengeluaran_lain_filter"
                  disabled
                  checked={filterType === 'merk'}
                  onChange={() => setFilterType('merk')}
                  className="cursor-not-allowed"
                />
                <span>Merk Barang</span>
              </label>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[142px] shrink-0">
                  <input
                    type="radio"
                    name="pengeluaran_lain_filter"
                    checked={filterType === 'batasan_no_bukti'}
                    onChange={() => setFilterType('batasan_no_bukti')}
                    className="cursor-pointer"
                  />
                  <span>Batasan No.Bukti</span>
                </label>

                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={noBuktiStart}
                    onChange={(e) => setNoBuktiStart(e.target.value.toUpperCase())}
                    disabled={filterType !== 'batasan_no_bukti'}
                    className="w-[125px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8]"
                  />
                  <span className="w-[62px] h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                    s / d
                  </span>
                  <input
                    type="text"
                    value={noBuktiEnd}
                    onChange={(e) => setNoBuktiEnd(e.target.value.toUpperCase())}
                    disabled={filterType !== 'batasan_no_bukti'}
                    className="w-[125px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[142px] shrink-0">
                  <input
                    type="radio"
                    name="pengeluaran_lain_filter"
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
                      list="pengeluaran-lain-cust-list"
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      placeholder="Pilih / ketik customer..."
                      className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] outline-none"
                    />
                    <datalist id="pengeluaran-lain-cust-list">
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
                  name="pengeluaran_lain_filter"
                  checked={filterType === 'all_periode'}
                  onChange={() => setFilterType('all_periode')}
                  className="cursor-pointer"
                />
                <span>ALL berdasarkan periode</span>
              </label>
            </div>
          </fieldset>

          {/* Lower Section */}
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
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer min-h-[21px]"
                  >
                    <option value="01 - Laporan Pengeluaran Barang Lain">
                      01 - Laporan Pengeluaran Barang Lain
                    </option>
                    <option value="02 - Rekap Pengeluaran Barang Lain">
                      02 - Rekap Pengeluaran Barang Lain
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
      </div>

      {/* Input / Manage Data Pengeluaran Barang Lain Modal */}
      {isCrudOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[840px] max-h-[88vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
              <span>Input &amp; Kelola Pengeluaran Barang Lain — Supabase</span>
              <button
                type="button"
                onClick={() => setIsCrudOpen(false)}
                className="w-5 h-5 bg-[#ECE9D8] border border-black text-black font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCrud} className="p-3 border-b border-[#ACA899] bg-[#ECE9D8] grid grid-cols-4 gap-2 text-[11px]">
              <div>
                <label className="block font-semibold">No.Bukti *</label>
                <input
                  type="text"
                  required
                  value={formNoBukti}
                  onChange={(e) => setFormNoBukti(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div>
                <label className="block font-semibold">Tanggal *</label>
                <DatePickerInput
                  value={formTanggal}
                  onChange={(formatted) => setFormTanggal(formatted)}
                  format="dmy"
                  inputClassName="w-[140px] h-[24px] px-2 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div>
                <label className="block font-semibold">Lokasi Stock</label>
                <select
                  value={formLokasi}
                  onChange={(e) => setFormLokasi(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#7A7A7A]"
                >
                  {lokasiOptions.length > 0 ? (
                    lokasiOptions.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))
                  ) : (
                    <option value="01 - OFFICE">01 - OFFICE</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block font-semibold">Customer / Tujuan</label>
                <input
                  type="text"
                  list="crud-pgl-cust"
                  value={formCustomer}
                  onChange={(e) => setFormCustomer(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#7A7A7A]"
                />
                <datalist id="crud-pgl-cust">
                  {customerCatalog.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block font-semibold">Kode Barang</label>
                <input
                  type="text"
                  list="crud-pgl-brg"
                  value={formKodeBarang}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    setFormKodeBarang(v);
                    const match = barangCatalog.find((b) => b.kode.toUpperCase() === v);
                    if (match) setFormNamaBarang(match.nama);
                  }}
                  className="w-full px-2 py-1 bg-white border border-[#7A7A7A]"
                />
                <datalist id="crud-pgl-brg">
                  {barangCatalog.map((b) => (
                    <option key={b.kode} value={b.kode}>
                      {b.nama}
                    </option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block font-semibold">Nama Barang</label>
                <input
                  type="text"
                  value={formNamaBarang}
                  onChange={(e) => setFormNamaBarang(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div>
                <label className="block font-semibold">Qty</label>
                <input
                  type="number"
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#7A7A7A] text-right"
                />
              </div>
              <div className="flex items-end space-x-1.5">
                <div className="flex-1">
                  <label className="block font-semibold">Keterangan</label>
                  <input
                    type="text"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#7A7A7A]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-3 py-1 bg-[#0A246A] text-white border border-black font-bold cursor-pointer h-[25px]"
                >
                  {editingId ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-auto bg-white p-2">
              <table className="w-full border-collapse border border-[#ACA899] text-[11px]">
                <thead className="bg-[#ECE9D8]">
                  <tr>
                    <th className="border border-[#ACA899] px-2 py-1 text-left">No.Bukti</th>
                    <th className="border border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                    <th className="border border-[#ACA899] px-2 py-1 text-left">Lokasi</th>
                    <th className="border border-[#ACA899] px-2 py-1 text-left">Customer</th>
                    <th className="border border-[#ACA899] px-2 py-1 text-left">Kode Brg</th>
                    <th className="border border-[#ACA899] px-2 py-1 text-left">Nama Barang</th>
                    <th className="border border-[#ACA899] px-2 py-1 text-right">Qty</th>
                    <th className="border border-[#ACA899] px-2 py-1 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {crudRows.map((r) => (
                    <tr key={r.id} className="hover:bg-[#EAF2FC]">
                      <td className="border border-[#D4D0C8] px-2 py-1 font-mono">{r.no_bukti}</td>
                      <td className="border border-[#D4D0C8] px-2 py-1 text-center">
                        {toDisplayDMyShort(r.tanggal)}
                      </td>
                      <td className="border border-[#D4D0C8] px-2 py-1">{r.lokasi_stock}</td>
                      <td className="border border-[#D4D0C8] px-2 py-1">{r.customer}</td>
                      <td className="border border-[#D4D0C8] px-2 py-1 font-mono">{r.kode_barang}</td>
                      <td className="border border-[#D4D0C8] px-2 py-1">{r.nama_barang}</td>
                      <td className="border border-[#D4D0C8] px-2 py-1 text-right">{r.qty}</td>
                      <td className="border border-[#D4D0C8] px-2 py-1 text-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(r.id);
                            setFormNoBukti(r.no_bukti || '');
                            setFormTanggal(toDisplayDmy(r.tanggal));
                            setFormLokasi(r.lokasi_stock || '01 - OFFICE');
                            setFormCustomer(r.customer || '');
                            setFormKodeBarang(r.kode_barang || '');
                            setFormNamaBarang(r.nama_barang || '');
                            setFormQty(String(r.qty || 1));
                            setFormKeterangan(r.keterangan || '');
                          }}
                          className="px-1.5 py-0.5 bg-[#ECE9D8] border border-[#7A7A7A] cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCrud(r.id)}
                          className="px-1.5 py-0.5 bg-[#C00000] text-white border border-black cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {crudRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-gray-500 italic">
                        Belum ada data Pengeluaran Barang Lain.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={(bentukLaporan || 'LAPORAN PENGELUARAN BARANG LAIN').toUpperCase()}
        subtitle={`Periode: ${tglStart} s/d ${tglEnd}`}
        orientation="landscape"
        metaLines={[
          { label: 'Periode Tanggal', value: `${tglStart} s/d ${tglEnd}` },
          { label: 'Lokasi Stock', value: lokasiStock },
          {
            label: 'Filter Laporan',
            value:
              filterType === 'batasan_no_bukti'
                ? `${noBuktiStart || '-'} s/d ${noBuktiEnd || '-'}`
                : filterType === 'customer'
                ? customerFilter || 'Semua Customer'
                : 'ALL Berdasarkan Periode',
          },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={printColumns}
        rows={previewRows}
        summaryItems={[
          { label: 'Total Dokumen', value: `${previewRows.length} Baris` },
          { label: 'Total Qty Keluar', value: formatMoney(totalQty) },
        ]}
      />
    </div>
  );
};
