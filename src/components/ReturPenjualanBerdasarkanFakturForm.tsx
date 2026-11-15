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

interface ReturPenjualanBerdasarkanFakturFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReturPenjualanBerdasarkanFakturForm: React.FC<
  ReturPenjualanBerdasarkanFakturFormProps
> = ({ isOpen, onClose }) => {
  const [tglStart, setTglStart] = useState<string>('12-09-2026');
  const [tglEnd, setTglEnd] = useState<string>('12-09-2026');
  const [filterType, setFilterType] = useState<string>('all_periode');
  const [noBuktiStart, setNoBuktiStart] = useState<string>('');
  const [noBuktiEnd, setNoBuktiEnd] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Retur Penjualan Barang');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [returCatalog, setReturCatalog] = useState<string[]>([]);
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
  const [formTanggal, setFormTanggal] = useState<string>(() => toDisplayDMyShort(todayIso()));
  const [formCustomer, setFormCustomer] = useState<string>('');
  const [formNoFaktur, setFormNoFaktur] = useState<string>('');
  const [formNilaiRetur, setFormNilaiRetur] = useState<string>('0');
  const [formDisc, setFormDisc] = useState<string>('0');
  const [formPpn, setFormPpn] = useState<string>('11');
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
    const rows = await erpList<any>('retur_penjualans', { orderBy: 'tanggal', asc: false });
    const mapped = rows.map((r) => ({
      ...r,
      id: String(r.id),
      no_bukti: r.no_bukti || '',
      tanggal_display: toDisplayDMyShort(r.tanggal),
      nama_customer: r.nama_customer || '',
      no_faktur: r.no_faktur || '',
      nilai_retur: Number(r.nilai_retur || 0),
      disc_num: Number(r.disc || 0),
      ppn_num: Number(r.ppn ?? 11),
      disc: `${Number(r.disc || 0)}%`,
      ppn: `${Number(r.ppn ?? 11)}%`,
      sts_post: r.sts_post || 'Posting',
      keterangan: r.keterangan || '',
    }));
    setTableRows(mapped);
    setReturCatalog(mapped.map((m) => m.no_bukti).filter(Boolean));
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
        const [lokasis, customers] = await Promise.all([
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setLokasiOptions(lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()));
        setCustomerCatalog(customers.map((c) => c.nama_customer || '').filter(Boolean));
        const rawPreset = localStorage.getItem('withcoder_preset_retur_penjualan_faktur');
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

  if (!isOpen) return null;

  const filteredTableRows = tableRows.filter((r) => {
    if (filterType === 'no_bukti') {
      const nb = r.no_bukti.toUpperCase();
      if (noBuktiStart.trim() && nb < noBuktiStart.trim().toUpperCase()) return false;
      if (noBuktiEnd.trim() && nb > noBuktiEnd.trim().toUpperCase()) return false;
    }
    if (filterType === 'customer' && customerFilter.trim()) {
      if (!r.nama_customer.toLowerCase().includes(customerFilter.trim().toLowerCase())) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      if (searchField === 'No.Bukti') return r.no_bukti.toLowerCase().includes(q);
      if (searchField === 'Customer') return r.nama_customer.toLowerCase().includes(q);
      if (searchField === 'No.Faktur') return r.no_faktur.toLowerCase().includes(q);
      if (searchField === 'Keterangan') return r.keterangan.toLowerCase().includes(q);
      return (
        r.no_bukti.toLowerCase().includes(q) ||
        r.nama_customer.toLowerCase().includes(q) ||
        r.no_faktur.toLowerCase().includes(q) ||
        r.keterangan.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleBaru = () => {
    setEditingId(null);
    setModalError(null);
    setFormNoBukti(nextUniqueCode(tableRows.map((r) => r.no_bukti), '2608-RJ-INV-', 3));
    setFormTanggal(toDisplayDMyShort(todayIso()));
    setFormCustomer(customerFilter || '');
    setFormNoFaktur('');
    setFormNilaiRetur('0');
    setFormDisc('0');
    setFormPpn('11');
    setFormKeterangan('');
    setIsCrudOpen(true);
  };

  const handleKoreksi = () => {
    const current =
      filteredTableRows.find((r) => r.id === selectedId) ||
      tableRows.find((r) => r.id === selectedId) ||
      filteredTableRows[0];
    if (!current) {
      showFeedback('Pilih baris Retur Penjualan terlebih dahulu (atau klik Baru)');
      return;
    }
    setSelectedId(current.id);
    setEditingId(current.id);
    setModalError(null);
    setFormNoBukti(current.no_bukti);
    setFormTanggal(current.tanggal_display || toDisplayDMyShort(todayIso()));
    setFormCustomer(current.nama_customer);
    setFormNoFaktur(current.no_faktur);
    setFormNilaiRetur(String(current.nilai_retur || 0));
    setFormDisc(String(current.disc_num || 0));
    setFormPpn(String(current.ppn_num ?? 11));
    setFormKeterangan(current.keterangan);
    setIsCrudOpen(true);
  };

  const handleSaveCrud = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formNoBukti.trim() || !formCustomer.trim()) {
      setModalError('No. Bukti Retur dan Nama Customer wajib diisi.');
      return;
    }
    try {
      setIsBusy(true);
      const tglIso = toIsoDate(formTanggal) || todayIso();
      const payload = {
        no_bukti: formNoBukti.trim().toUpperCase(),
        tanggal: tglIso,
        nama_customer: formCustomer.trim().toUpperCase(),
        no_faktur: formNoFaktur.trim().toUpperCase(),
        nilai_retur: parseNum(formNilaiRetur),
        disc: parseNum(formDisc),
        ppn: parseNum(formPpn),
        keterangan: formKeterangan.trim(),
      };
      if (editingId) {
        await erpUpdate('retur_penjualans', editingId, {
          ...payload,
          diupdate_oleh: (getCurrentUser().username || 'ADMIN'),
          tgl_update: todayIso(),
        });
        showFeedback('Retur Penjualan diperbarui di Supabase');
      } else {
        const created = await erpCreate<any>('retur_penjualans', {
          ...payload,
          sts_print: 'Not Yet',
          sts_post: 'Posting',
          tgl_post: todayIso(),
          dibuat_oleh: (getCurrentUser().username || 'ADMIN'),
          tgl_created: todayIso(),
        });
        if (created?.id) setSelectedId(String(created.id));
        showFeedback('Retur Penjualan tersimpan ke Supabase');
      }
      setIsCrudOpen(false);
      setEditingId(null);
      await loadLiveRows();
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Retur Penjualan';
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
      showFeedback('Pilih baris Retur Penjualan yang akan dihapus');
      return;
    }
    setConfirmDeleteRow(current);
  };

  const handleConfirmHapus = async () => {
    if (!confirmDeleteRow) return;
    try {
      setIsBusy(true);
      await erpDelete('retur_penjualans', confirmDeleteRow.id);
      setConfirmDeleteRow(null);
      await loadLiveRows();
      showFeedback('Retur Penjualan dihapus dari Supabase');
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
        'withcoder_preset_retur_penjualan_faktur',
        JSON.stringify({ tglStart, tglEnd, lokasiStock, bentukLaporan })
      );
      await syncAppSettings({
        periode_start: toIsoDate(tglStart),
        periode_end: toIsoDate(tglEnd),
        lokasi_aktif: lokasiStock !== 'ALL' ? lokasiStock : undefined,
      });
      await loadLiveRows();
      showFeedback('Parameter & data Retur Penjualan tersinkron ke Supabase');
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
      showFeedback('Data Retur Penjualan dimuat ulang dari Supabase');
    } catch (err: any) {
      showFeedback(`Gagal muat: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const startIso = toIsoDate(tglStart);
    const endIso = toIsoDate(tglEnd);
    const rows = await erpList<any>('retur_penjualans', {
      gte: startIso ? { tanggal: startIso } : undefined,
      lte: endIso ? { tanggal: endIso } : undefined,
      orderBy: 'tanggal',
      asc: false,
    });
    return rows
      .filter((r) => {
        if (lokasiStock !== 'ALL' && r.lokasi_stock && r.lokasi_stock !== lokasiStock) return false;
        if (filterType === 'no_bukti') {
          const nb = (r.no_bukti || '').toUpperCase();
          if (noBuktiStart.trim() && nb < noBuktiStart.trim().toUpperCase()) return false;
          if (noBuktiEnd.trim() && nb > noBuktiEnd.trim().toUpperCase()) return false;
        }
        if (filterType === 'customer' && customerFilter.trim()) {
          return (r.nama_customer || '').toLowerCase().includes(customerFilter.trim().toLowerCase());
        }
        return true;
      })
      .map((r) => ({
        no_bukti: r.no_bukti || '',
        tanggal: toDisplayDMyShort(r.tanggal),
        nama_customer: r.nama_customer || '',
        no_faktur: r.no_faktur || '-',
        nilai_retur: Number(r.nilai_retur || 0),
        disc: `${Number(r.disc || 0)}%`,
        ppn: `${Number(r.ppn ?? 11)}%`,
        sts_post: r.sts_post || 'Posting',
        keterangan: r.keterangan || '',
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
        fileName: 'Retur_Penjualan_Berdasarkan_Faktur',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Periode: ${tglStart} s/d ${tglEnd} | Lokasi: ${lokasiStock}`,
        companyProfile: company,
        columns: [
          { header: 'No.Bukti', accessor: 'no_bukti' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
          { header: 'Nama Customer', accessor: 'nama_customer' },
          { header: 'No.Faktur Ref', accessor: 'no_faktur' },
          { header: 'Disc', accessor: 'disc', align: 'center' },
          { header: 'PPN', accessor: 'ppn', align: 'center' },
          { header: 'Nilai Retur', accessor: 'nilai_retur', align: 'right' },
          { header: 'Status', accessor: 'sts_post', align: 'center' },
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

  const totalRetur = previewRows.reduce((a, r) => a + Number(r.nilai_retur || 0), 0);

  return (
    <div
      id="retur-penjualan-faktur-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Retur Penjualan Berdasarkan Faktur"
        onClose={onClose}
        onFind={handleFind}
        onPrint={handlePreview}
        onTableView={() => loadLiveRows()}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3 space-y-2.5">
        <div className="max-w-[590px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-3 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[13px] tracking-wide text-black font-sans">
              RETUR PENJUALAN BERDASARKAN FAKTUR
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

          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">Periode</legend>
            <div className="flex items-center space-x-2 pt-0.5">
              <span className="font-semibold text-black text-[11px]">
                Tanggal ( dd-mm-yyyy ) :
              </span>

              <DatePickerInput
                value={tglStart}
                onChange={(formatted) => setTglStart(formatted)}
                format="dmy"
                inputClassName="w-[82px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />

              <span className="font-bold text-[11px] px-1 text-black">s / d</span>

              <DatePickerInput
                value={tglEnd}
                onChange={(formatted) => setTglEnd(formatted)}
                format="dmy"
                inputClassName="w-[82px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />
            </div>
          </fieldset>

          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              <label className="flex items-center space-x-2 text-[11px] text-gray-400 cursor-not-allowed">
                <input
                  type="radio"
                  name="retur_filter_type"
                  disabled
                  checked={filterType === 'merk'}
                  onChange={() => setFilterType('merk')}
                  className="cursor-not-allowed"
                />
                <span>Merk Barang</span>
              </label>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-semibold cursor-pointer whitespace-nowrap">
                  <input
                    type="radio"
                    name="retur_filter_type"
                    checked={filterType === 'no_bukti'}
                    onChange={() => setFilterType('no_bukti')}
                    className="cursor-pointer"
                  />
                  <span>Batasan No. Bukti</span>
                </label>

                <div className="flex items-center space-x-1 flex-1 ml-4">
                  <input
                    type="text"
                    list="retur-bukti-list"
                    value={noBuktiStart}
                    onChange={(e) => setNoBuktiStart(e.target.value.toUpperCase())}
                    disabled={filterType !== 'no_bukti'}
                    className="bg-white border border-[#7A7A7A] px-2 py-0.5 w-28 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8]"
                  />

                  <span className="px-2 py-0.5 bg-[#E2F0D9] border border-[#7A7A7A] text-[11px] font-bold text-black text-center min-w-[38px]">
                    s / d
                  </span>

                  <input
                    type="text"
                    list="retur-bukti-list"
                    value={noBuktiEnd}
                    onChange={(e) => setNoBuktiEnd(e.target.value.toUpperCase())}
                    disabled={filterType !== 'no_bukti'}
                    className="bg-white border border-[#7A7A7A] px-2 py-0.5 w-28 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8]"
                  />
                  <datalist id="retur-bukti-list">
                    {returCatalog.map((nb) => (
                      <option key={nb} value={nb} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="retur_filter_type"
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
                      list="retur-cust-list"
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      placeholder="Pilih / ketik customer..."
                      className="flex-1 bg-white border border-[#7A7A7A] px-2 py-0.5 text-[11px] outline-none"
                    />
                    <datalist id="retur-cust-list">
                      {customerCatalog.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </>
                )}
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="retur_filter_type"
                  checked={filterType === 'all_periode'}
                  onChange={() => setFilterType('all_periode')}
                  className="cursor-pointer"
                />
                <span>ALL berdasarkan periode</span>
              </label>
            </div>
          </fieldset>

          <div className="flex items-stretch justify-between gap-3 pt-0.5">
            <div className="flex-1 space-y-2">
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
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer font-bold"
                  >
                    <option value="01 - Retur Penjualan Barang">01 - Retur Penjualan Barang</option>
                    <option value="02 - Retur Penjualan per Customer">02 - Retur Penjualan per Customer</option>
                    <option value="03 - Rekap Retur Penjualan">03 - Rekap Retur Penjualan</option>
                  </select>
                </div>
              </fieldset>
            </div>

            <div className="w-[100px] border border-[#999999] p-1.5 flex flex-col items-center justify-center gap-1.5 bg-[#E6E2D4]">
              <button
                type="button"
                disabled={isBusy}
                onClick={handlePreview}
                className="w-full flex-1 py-2 bg-[#EAE6D9] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F2EFE6] active:border-[#808080] active:border-r-[#FFFFFF] active:border-b-[#FFFFFF] font-extrabold text-[12px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span className="border border-dotted border-black/40 px-1 py-0.5 w-full block">
                  PREVIEW
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full h-[24px] bg-[#ECE9D8] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F5F3E8] font-bold text-[11px] text-black cursor-pointer flex items-center justify-center"
              >
                Close
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
                <option value="No.Bukti">No.Bukti</option>
                <option value="Customer">Customer</option>
                <option value="No.Faktur">No.Faktur</option>
                <option value="Keterangan">Keterangan</option>
              </select>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadLiveRows();
                }}
                placeholder="Cari No.Bukti Retur, Customer, No.Faktur..."
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
              Data Supabase (<b>retur_penjualans</b>): <b>{filteredTableRows.length}</b> baris
            </span>
          </div>

          <div className="max-h-[220px] overflow-auto bg-white">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080]">
                <tr>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Bukti Retur</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Faktur Ref</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Disc</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">PPN</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">Nilai Retur</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Status</th>
                  <th className="px-2 py-1 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-gray-500 italic">
                      Belum ada data Retur Penjualan. Klik "Baru" untuk menambah ke Supabase.
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
                          setFormTanggal(r.tanggal_display || toDisplayDMyShort(todayIso()));
                          setFormCustomer(r.nama_customer);
                          setFormNoFaktur(r.no_faktur);
                          setFormNilaiRetur(String(r.nilai_retur || 0));
                          setFormDisc(String(r.disc_num || 0));
                          setFormPpn(String(r.ppn_num ?? 11));
                          setFormKeterangan(r.keterangan);
                          setIsCrudOpen(true);
                        }}
                        className={`cursor-pointer border-b border-[#E0E0E0] ${
                          isSel ? 'bg-[#316AC5] text-white' : 'hover:bg-[#EAF2FC]'
                        }`}
                      >
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.no_bukti}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.tanggal_display}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_customer}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_faktur || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.disc}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.ppn}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">
                          {formatMoney(r.nilai_retur)}
                        </td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.sts_post}</td>
                        <td className="px-2 py-1">{r.keterangan}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Retur Penjualan Modal */}
      {isCrudOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[460px] flex flex-col overflow-hidden text-xs">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 flex justify-between items-center font-bold">
              <span>{editingId ? 'Koreksi Retur Penjualan' : 'Tambah Retur Penjualan Baru'}</span>
              <button
                type="button"
                onClick={() => setIsCrudOpen(false)}
                className="w-5 h-5 bg-[#C00000] text-white font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form noValidate onSubmit={handleSaveCrud} className="p-3 space-y-2 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">No. Bukti Retur *</label>
                  <input
                    type="text"
                    value={formNoBukti}
                    onChange={(e) => setFormNoBukti(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Nama Customer *</label>
                  <input
                    type="text"
                    list="retur-modal-cust"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                  <datalist id="retur-modal-cust">
                    {customerCatalog.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-bold mb-0.5">No. Faktur Ref</label>
                  <input
                    type="text"
                    value={formNoFaktur}
                    onChange={(e) => setFormNoFaktur(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Disc (%)</label>
                  <input
                    type="number"
                    value={formDisc}
                    onChange={(e) => setFormDisc(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">PPN (%)</label>
                  <input
                    type="number"
                    value={formPpn}
                    onChange={(e) => setFormPpn(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Nilai Retur (Rp)</label>
                  <input
                    type="number"
                    value={formNilaiRetur}
                    onChange={(e) => setFormNilaiRetur(e.target.value)}
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
              Konfirmasi Hapus Retur Penjualan
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>
                Yakin ingin menghapus Retur [{confirmDeleteRow.no_bukti}] dari database Supabase?
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
            label: 'Batasan Filter',
            value:
              filterType === 'no_bukti'
                ? `${noBuktiStart || 'Awal'} s/d ${noBuktiEnd || 'Akhir'}`
                : filterType === 'customer'
                ? customerFilter || 'Semua Customer'
                : 'ALL Berdasarkan Periode',
          },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={[
          { header: 'No.Bukti Retur', accessor: 'no_bukti', width: '110px' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '80px' },
          { header: 'Nama Customer', accessor: 'nama_customer' },
          { header: 'No.Faktur Ref', accessor: 'no_faktur', width: '105px' },
          { header: 'Disc', accessor: 'disc', align: 'center', width: '50px' },
          { header: 'PPN', accessor: 'ppn', align: 'center', width: '50px' },
          {
            header: 'Nilai Retur',
            accessor: (r) => formatMoney(r.nilai_retur),
            align: 'right',
            width: '105px',
          },
          { header: 'Status', accessor: 'sts_post', align: 'center', width: '70px' },
          { header: 'Keterangan', accessor: 'keterangan' },
        ]}
        rows={previewRows}
        summaryItems={[
          { label: 'Total Dokumen Retur', value: `${previewRows.length} Dokumen` },
          { label: 'Total Nilai Retur', value: formatRupiah(totalRetur) },
        ]}
      />
    </div>
  );
};
