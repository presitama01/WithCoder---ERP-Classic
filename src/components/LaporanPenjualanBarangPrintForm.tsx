import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';
import {
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
  syncAppSettings,
  todayIso,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

interface LaporanPenjualanBarangPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaporanPenjualanBarangPrintForm: React.FC<
  LaporanPenjualanBarangPrintFormProps
> = ({ isOpen, onClose }) => {
  const defaultRange = useMemo(() => {
    const now = todayIso();
    const monthStart = `${now.slice(0, 8)}01`;
    return {
      start: toDisplayDMyShort(monthStart),
      end: toDisplayDMyShort(now),
    };
  }, []);

  const [tglStart, setTglStart] = useState<string>(defaultRange.start);
  const [tglEnd, setTglEnd] = useState<string>(defaultRange.end);
  const [filterType, setFilterType] = useState<
    'jenis_transaksi' | 'merk' | 'sales' | 'customer' | 'all_periode'
  >('all_periode');
  const [jenisTransaksi, setJenisTransaksi] = useState<string>('');
  const [merkFilter, setMerkFilter] = useState<string>('');
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
  const [merkOptions, setMerkOptions] = useState<string[]>([]);

  const [tableRows, setTableRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printScopeOnOpen, setPrintScopeOnOpen] = useState<'selected' | 'all'>('all');

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const loadLiveRows = async (): Promise<any[]> => {
    const viewRows = await erpList<any>('v_laporan_penjualan_barang', {
      orderBy: 'tanggal',
      asc: false,
      limit: 2000,
    }).catch(() => null);

    let mapped: any[] = [];

    if (Array.isArray(viewRows)) {
      mapped = viewRows.map((r, idx) => {
        const tglIso = toIsoDate(r.tanggal) || '';
        const jthIso = toIsoDate(r.jth_tmp) || '';
        const caraBayar =
          r.cara_bayar || (!jthIso || jthIso <= tglIso ? 'TUNAI' : 'KREDIT');
        return {
          id: `${r.faktur_id || r.no_bukti}-${r.kode_barang || idx}`,
          faktur_id: r.faktur_id,
          no_bukti: r.no_bukti || '',
          jenis_faktur: r.jenis_faktur || 'REGULAR',
          tanggal_iso: tglIso,
          tanggal_display: toDisplayDMyShort(tglIso) || '-',
          jth_tmp_display: toDisplayDMyShort(jthIso) || '-',
          cara_bayar: caraBayar,
          nama_customer: r.nama_customer || '',
          kode_customer: r.kode_customer || '',
          no_so: r.no_so || '',
          no_sj: r.no_sj || '',
          po_no: r.po_no || '',
          sales: r.sales || '',
          kode_sales: r.kode_sales || r.sales || '',
          lokasi_stock: r.lokasi_stock || '01 - OFFICE',
          ppn_num: Number(r.ppn ?? 11),
          ppn: `${Number(r.ppn ?? 11)}%`,
          dpp: Number(r.dpp || 0),
          nilai_ppn: Number(r.nilai_ppn || 0),
          nilai: Number(r.nilai_penjualan || 0),
          sts_lunas: r.sts_lunas || 'Not Yet',
          sts_post: r.sts_post || 'Not Yet',
          kode_barang: r.kode_barang || '',
          nama_barang: r.nama_barang || '',
          merk_barang: r.merk_barang || '',
          unit: r.unit || 'PCS',
          qty: Number(r.qty || 0),
          harga: Number(r.harga || 0),
          total_item: Number(r.total || 0),
        };
      });
    } else {
      const [fakturs, details, barangs, salesList, custList] = await Promise.all([
        erpList<any>('faktur_penjualans', { orderBy: 'tanggal', asc: false, limit: 1500 }),
        erpList<any>('faktur_penjualan_details', { limit: 4000 }).catch(() => []),
        erpList<any>('master_barangs', { limit: 2000 }).catch(() => []),
        erpList<any>('master_sales', { limit: 500 }).catch(() => []),
        erpList<any>('master_customers', { limit: 1000 }).catch(() => []),
      ]);

      const merkByKode = new Map<string, string>();
      for (const b of barangs) {
        if (b.kode) merkByKode.set(String(b.kode).trim().toUpperCase(), String(b.merk || ''));
      }
      const salesByNama = new Map<string, string>();
      for (const s of salesList) {
        if (s.nama_sales) salesByNama.set(String(s.nama_sales).trim().toUpperCase(), String(s.kode_sales || ''));
        if (s.kode_sales) salesByNama.set(String(s.kode_sales).trim().toUpperCase(), String(s.kode_sales || ''));
      }
      const custByNama = new Map<string, string>();
      for (const c of custList) {
        if (c.nama_customer) custByNama.set(String(c.nama_customer).trim().toUpperCase(), String(c.kode_customer || ''));
      }

      const detailsByFakturId = new Map<string, any[]>();
      for (const d of details) {
        const fid = String(d.faktur_id || '');
        if (!fid) continue;
        const arr = detailsByFakturId.get(fid) || [];
        arr.push(d);
        detailsByFakturId.set(fid, arr);
      }

      for (const f of fakturs) {
        const tglIso = toIsoDate(f.tanggal) || '';
        const jthIso = toIsoDate(f.jth_tmp) || '';
        const caraBayar = !jthIso || jthIso <= tglIso ? 'TUNAI' : 'KREDIT';
        const custKey = String(f.nama_customer || '').trim().toUpperCase();
        const salesKey = String(f.sales || '').trim().toUpperCase();
        const dets = detailsByFakturId.get(String(f.id)) || [];

        const baseHeader = {
          faktur_id: f.id,
          no_bukti: f.no_bukti || '',
          jenis_faktur: f.jenis_faktur || 'REGULAR',
          tanggal_iso: tglIso,
          tanggal_display: toDisplayDMyShort(tglIso) || '-',
          jth_tmp_display: toDisplayDMyShort(jthIso) || '-',
          cara_bayar: caraBayar,
          nama_customer: f.nama_customer || '',
          kode_customer: custByNama.get(custKey) || '',
          no_so: f.no_so || '',
          no_sj: f.no_sj || '',
          po_no: f.po_no || '',
          sales: f.sales || '',
          kode_sales: salesByNama.get(salesKey) || f.sales || '',
          lokasi_stock: f.lokasi_stock || '01 - OFFICE',
          ppn_num: Number(f.ppn ?? 11),
          ppn: `${Number(f.ppn ?? 11)}%`,
          dpp: Number(f.dpp || 0),
          nilai_ppn: Number(f.nilai_ppn || 0),
          nilai: Number(f.nilai_penjualan || 0),
          sts_lunas: f.sts_lunas || 'Not Yet',
          sts_post: f.sts_post || 'Not Yet',
        };

        if (dets.length === 0) {
          mapped.push({
            ...baseHeader,
            id: `${f.id}-hdr`,
            kode_barang: '',
            nama_barang: f.keterangan || `FAKTUR ${f.jenis_faktur || 'REGULAR'}`,
            merk_barang: '',
            unit: '-',
            qty: 0,
            harga: 0,
            total_item: Number(f.nilai_penjualan || 0),
          });
        } else {
          for (const d of dets) {
            const kodeBrg = String(d.kode || '').trim().toUpperCase();
            mapped.push({
              ...baseHeader,
              id: String(d.id),
              kode_barang: kodeBrg,
              nama_barang: d.nama_barang || '',
              merk_barang: merkByKode.get(kodeBrg) || '',
              unit: d.unit || 'PCS',
              qty: Number(d.qty || 0),
              harga: Number(d.harga || 0),
              total_item: Number(d.total || Number(d.qty || 0) * Number(d.harga || 0)),
            });
          }
        }
      }
    }

    setTableRows(mapped);
    if (mapped.length > 0 && !mapped.some((m) => m.id === selectedId)) {
      setSelectedId(mapped[0].id);
    } else if (mapped.length === 0) {
      setSelectedId('');
    }
    return mapped;
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      try {
        setIsBusy(true);
        const [sales, lokasis, customers, merks] = await Promise.all([
          erpList<any>('master_sales', { orderBy: 'kode_sales', asc: true }).catch(() => []),
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
          erpList<any>('master_merks', { orderBy: 'merk', asc: true }).catch(() => []),
        ]);
        if (!active) return;

        setSalesCatalog(
          sales
            .filter((s) => s.is_active !== false)
            .map((s) => ({ kode: String(s.kode_sales || ''), nama: String(s.nama_sales || '') }))
        );
        setLokasiOptions(
          lokasis
            .filter((l) => l.is_active !== false)
            .map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim())
        );
        setCustomerCatalog(
          customers
            .filter((c) => c.is_active !== false)
            .map((c) => String(c.nama_customer || ''))
            .filter(Boolean)
        );
        setMerkOptions(
          merks
            .filter((m) => m.is_active !== false)
            .map((m) => String(m.merk || m.nama_merk || '').trim())
            .filter(Boolean)
        );

        const rawPreset = localStorage.getItem('withcoder_preset_penjualan_barang');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
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
    const q = salesCode.trim().toLowerCase();
    const match = salesCatalog.find(
      (s) => s.kode.toLowerCase() === q || s.nama.toLowerCase() === q
    );
    setSalesName(match ? match.nama : '');
  }, [salesCode, salesCatalog]);

  if (!isOpen) return null;

  const startIso = toIsoDate(tglStart);
  const endIso = toIsoDate(tglEnd);

  const filteredDetailRows = tableRows.filter((r) => {
    if (startIso && r.tanggal_iso && r.tanggal_iso < startIso) return false;
    if (endIso && r.tanggal_iso && r.tanggal_iso > endIso) return false;
    if (lokasiStock !== 'ALL' && r.lokasi_stock && r.lokasi_stock !== lokasiStock) return false;

    if (filterType === 'jenis_transaksi' && jenisTransaksi.trim()) {
      if (String(r.cara_bayar || '').toUpperCase() !== jenisTransaksi.trim().toUpperCase()) {
        return false;
      }
    }
    if (filterType === 'merk' && merkFilter.trim()) {
      if (!String(r.merk_barang || '').toLowerCase().includes(merkFilter.trim().toLowerCase())) {
        return false;
      }
    }
    if (filterType === 'sales' && salesCode.trim()) {
      const q = salesCode.trim().toLowerCase();
      const sNama = salesName.trim().toLowerCase();
      const rSales = String(r.sales || '').toLowerCase();
      const rKodeSales = String(r.kode_sales || '').toLowerCase();
      if (
        !rSales.includes(q) &&
        !rKodeSales.includes(q) &&
        !(sNama && rSales.includes(sNama))
      ) {
        return false;
      }
    }
    if (filterType === 'customer' && customerFilter.trim()) {
      if (!r.nama_customer.toLowerCase().includes(customerFilter.trim().toLowerCase())) return false;
    }

    if (searchTerm.trim()) {
      if (searchField === 'Kode' || searchField === 'No.Faktur') {
        return matchesMultiKeyword([r.no_bukti], searchTerm);
      }
      if (searchField === 'Customer') return matchesMultiKeyword([r.nama_customer], searchTerm);
      if (searchField === 'No.SO') return matchesMultiKeyword([r.no_so], searchTerm);
      if (searchField === 'Sales') return matchesMultiKeyword([r.sales, r.kode_sales], searchTerm);
      if (searchField === 'Jenis') return matchesMultiKeyword([r.jenis_faktur, r.cara_bayar], searchTerm);
      return matchesMultiKeyword(
        [
          r.no_bukti,
          r.jenis_faktur,
          r.cara_bayar,
          r.tanggal_display,
          r.nama_customer,
          r.no_so,
          r.po_no,
          r.no_sj,
          r.sales,
          r.kode_barang,
          r.nama_barang,
          r.merk_barang,
          r.sts_lunas,
        ],
        searchTerm
      );
    }
    return true;
  });

  const buildModeRows = (rows: any[], mode: string): any[] => {
    if (mode.startsWith('01')) {
      return rows;
    }

    // Deduplicate faktur headers first so DPP/PPN/Nilai are never double-counted across line items
    const fakturMap = new Map<string, any>();
    for (const r of rows) {
      const key = r.no_bukti || r.faktur_id || r.id;
      if (!fakturMap.has(key)) {
        fakturMap.set(key, {
          id: key,
          no_bukti: r.no_bukti,
          jenis_faktur: r.jenis_faktur,
          tanggal_display: r.tanggal_display,
          cara_bayar: r.cara_bayar,
          nama_customer: r.nama_customer,
          no_so: r.no_so || '-',
          sales: r.sales || '-',
          ppn: r.ppn,
          dpp: r.dpp,
          nilai_ppn: r.nilai_ppn,
          nilai: r.nilai,
          sts_lunas: r.sts_lunas,
          jml_item: 0,
          total_qty: 0,
        });
      }
      const hdr = fakturMap.get(key);
      if (r.kode_barang) hdr.jml_item += 1;
      hdr.total_qty += Number(r.qty || 0);
    }

    const fakturRekapList = Array.from(fakturMap.values());
    if (mode.startsWith('02')) {
      return fakturRekapList;
    }

    // 03 - Laporan Penjualan per Customer
    const byCust = new Map<string, any>();
    for (const f of fakturRekapList) {
      const cust = f.nama_customer || '(TANPA CUSTOMER)';
      if (!byCust.has(cust)) {
        byCust.set(cust, {
          id: cust,
          nama_customer: cust,
          jml_faktur: 0,
          total_qty: 0,
          dpp: 0,
          nilai_ppn: 0,
          nilai: 0,
          lunas_nilai: 0,
          piutang_nilai: 0,
        });
      }
      const g = byCust.get(cust);
      g.jml_faktur += 1;
      g.total_qty += f.total_qty;
      g.dpp += f.dpp;
      g.nilai_ppn += f.nilai_ppn;
      g.nilai += f.nilai;
      if (String(f.sts_lunas || '').toUpperCase() === 'LUNAS') {
        g.lunas_nilai += f.nilai;
      } else if (String(f.jenis_faktur || '').toUpperCase() !== 'DP') {
        g.piutang_nilai += f.nilai;
      }
    }
    return Array.from(byCust.values()).sort((a, b) => b.nilai - a.nilai);
  };

  const activeModeRows = buildModeRows(filteredDetailRows, bentukLaporan);
  const selectedTableRow =
    filteredDetailRows.find((r) => r.id === selectedId) ||
    tableRows.find((r) => r.id === selectedId) ||
    null;

  const selectedPenjPrintRow = selectedTableRow
    ? { ...selectedTableRow, tanggal: selectedTableRow.tanggal_display }
    : null;

  const handleSimpanFilter = async () => {
    try {
      setIsBusy(true);
      localStorage.setItem(
        'withcoder_preset_penjualan_barang',
        JSON.stringify({ lokasiStock, bentukLaporan })
      );
      await syncAppSettings({
        periode_start: toIsoDate(tglStart),
        periode_end: toIsoDate(tglEnd),
        lokasi_aktif: lokasiStock !== 'ALL' ? lokasiStock : undefined,
      });
      showFeedback('Preset filter Laporan Penjualan tersimpan');
    } catch (err: any) {
      showFeedback(`Gagal menyimpan preset: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    try {
      setIsBusy(true);
      await loadLiveRows();
    } catch (err: any) {
      showFeedback(`Gagal muat: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarCari = async () => {
    try {
      setIsBusy(true);
      await loadLiveRows();
      showFeedback(`Data dimuat (${filteredDetailRows.length} baris sesuai filter)`);
    } catch (err: any) {
      showFeedback(`Gagal mencari: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarReset = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setFilterType('all_periode');
    setJenisTransaksi('');
    setMerkFilter('');
    setSalesCode('');
    setCustomerFilter('');
    setLokasiStock('ALL');
    setTglStart(defaultRange.start);
    setTglEnd(defaultRange.end);
    try {
      setIsBusy(true);
      await loadLiveRows();
      showFeedback('Filter pencarian direset');
    } catch (err: any) {
      showFeedback(`Gagal reset: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const getColumnsForMode = (mode: string): PrintColumn<any>[] => {
    if (mode.startsWith('01')) {
      return [
        { header: 'No.Faktur', accessor: 'no_bukti', width: '88px' },
        { header: 'Tanggal', accessor: 'tanggal_display', align: 'center', width: '68px' },
        { header: 'Bayar', accessor: 'cara_bayar', align: 'center', width: '48px' },
        { header: 'Customer', accessor: 'nama_customer' },
        { header: 'Kode Brg', accessor: 'kode_barang', width: '70px' },
        { header: 'Nama Barang', accessor: 'nama_barang' },
        { header: 'Merk', accessor: 'merk_barang', width: '58px' },
        { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', width: '42px' },
        { header: 'Harga', accessor: (r) => formatMoney(r.harga), align: 'right', width: '72px' },
        { header: 'Subtotal', accessor: (r) => formatMoney(r.total_item), align: 'right', width: '80px' },
        { header: 'Status', accessor: 'sts_lunas', align: 'center', width: '52px' },
      ];
    }
    if (mode.startsWith('02')) {
      return [
        { header: 'No.Faktur', accessor: 'no_bukti', width: '98px' },
        { header: 'Jenis', accessor: 'jenis_faktur', align: 'center', width: '60px' },
        { header: 'Tanggal', accessor: 'tanggal_display', align: 'center', width: '74px' },
        { header: 'Bayar', accessor: 'cara_bayar', align: 'center', width: '52px' },
        { header: 'Nama Customer', accessor: 'nama_customer' },
        { header: 'No.SO', accessor: 'no_so', width: '85px' },
        { header: 'Sales', accessor: 'sales', align: 'center', width: '60px' },
        { header: 'DPP', accessor: (r) => formatMoney(r.dpp), align: 'right', width: '85px' },
        { header: 'PPN', accessor: (r) => formatMoney(r.nilai_ppn), align: 'right', width: '72px' },
        { header: 'Total Faktur', accessor: (r) => formatMoney(r.nilai), align: 'right', width: '95px' },
        { header: 'Status', accessor: 'sts_lunas', align: 'center', width: '58px' },
      ];
    }
    return [
      { header: 'Nama Customer', accessor: 'nama_customer' },
      { header: 'Jml Faktur', accessor: 'jml_faktur', align: 'right', width: '65px' },
      { header: 'Total Qty', accessor: (r) => formatMoney(r.total_qty), align: 'right', width: '65px' },
      { header: 'Total DPP', accessor: (r) => formatMoney(r.dpp), align: 'right', width: '95px' },
      { header: 'Total PPN', accessor: (r) => formatMoney(r.nilai_ppn), align: 'right', width: '85px' },
      { header: 'Total Penjualan', accessor: (r) => formatMoney(r.nilai), align: 'right', width: '105px' },
      { header: 'Sudah Lunas', accessor: (r) => formatMoney(r.lunas_nilai), align: 'right', width: '95px' },
      { header: 'Sisa Piutang', accessor: (r) => formatMoney(r.piutang_nilai), align: 'right', width: '95px' },
    ];
  };

  const handlePreview = async () => {
    try {
      setIsBusy(true);
      await loadLiveRows();
      setPrintScopeOnOpen('all');
      setIsPrintOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal memuat laporan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrintSelected = () => {
    if (!selectedTableRow) {
      showFeedback('Pilih baris Penjualan yang akan dicetak terlebih dahulu');
      return;
    }
    setPrintScopeOnOpen('selected');
    setIsPrintOpen(true);
  };

  const handleExportExcel = async () => {
    try {
      setIsBusy(true);
      const company = await fetchActiveCompanyProfile();
      const cols = getColumnsForMode(bentukLaporan);
      exportToExcel({
        fileName: 'Laporan_Penjualan_Barang',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Periode: ${tglStart} s/d ${tglEnd} | Lokasi: ${lokasiStock}`,
        companyProfile: company,
        columns: cols.map((c) => ({
          header: c.header,
          accessor:
            typeof c.accessor === 'function'
              ? (r: any) => (c.accessor as (row: any) => string)(r)
              : (c.accessor as string),
          align: c.align,
        })),
        rows: activeModeRows,
      });
      showFeedback('Export Excel Penjualan selesai');
    } catch (err: any) {
      showFeedback(`Gagal export: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fakturRekapList = buildModeRows(filteredDetailRows, '02');
  const totalPenjualan = fakturRekapList.reduce((a, r) => a + Number(r.nilai || 0), 0);
  const totalDppAll = fakturRekapList.reduce((a, r) => a + Number(r.dpp || 0), 0);
  const totalPpnAll = fakturRekapList.reduce((a, r) => a + Number(r.nilai_ppn || 0), 0);
  const printColumns = getColumnsForMode(bentukLaporan);

  const uniqueMerkOptions = Array.from(
    new Set([...merkOptions, ...tableRows.map((r) => r.merk_barang).filter(Boolean)])
  );

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
        <div className="max-w-[700px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[15px] tracking-wide text-black font-sans">
              LAPORAN PENJUALAN BARANG (DETAIL / REKAP / CUSTOMER)
            </h1>
          </div>

          <div className="border-b border-[#999999] pb-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleSimpanFilter}
              className="h-[25px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] text-[11px] font-semibold text-black cursor-pointer disabled:opacity-50"
            >
              Simpan Filter
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => loadLiveRows()}
              className="h-[25px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] text-[11px] font-semibold text-black cursor-pointer disabled:opacity-50"
            >
              Muat Ulang
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={handlePrintSelected}
              className="h-[25px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] text-[11px] font-semibold text-black cursor-pointer disabled:opacity-50"
            >
              Cetak Baris Terpilih
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={handleFind}
              className="h-[25px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] text-[11px] font-semibold text-black cursor-pointer disabled:opacity-50"
            >
              Find
            </button>
            {feedback && (
              <span className="ml-2 px-2 py-0.5 bg-[#FFFFCC] border border-[#ACA899] text-[10px] font-semibold text-black">
                {feedback}
              </span>
            )}
          </div>

          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">Periode</legend>
            <div className="flex items-center space-x-1.5 pt-0.5">
              <label className="font-bold text-black text-[11px] whitespace-nowrap pl-2 pr-1">
                Tanggal ( dd-MMM-yyyy ) :
              </label>

              <DatePickerInput
                value={tglStart}
                onChange={(formatted) => setTglStart(formatted)}
                format="dMyShort"
                inputClassName="w-[96px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />

              <span className="w-[62px] h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                s / d
              </span>

              <DatePickerInput
                value={tglEnd}
                onChange={(formatted) => setTglEnd(formatted)}
                format="dMyShort"
                inputClassName="w-[96px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />
            </div>
          </fieldset>

          <fieldset className="border border-[#999999] px-2.5 py-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_penjualan_filter"
                    checked={filterType === 'jenis_transaksi'}
                    onChange={() => setFilterType('jenis_transaksi')}
                    className="cursor-pointer"
                  />
                  <span>Jenis Transaksi</span>
                </label>

                <div className="flex items-center w-[150px] h-[21px] bg-white border border-[#7A7A7A]">
                  <select
                    value={jenisTransaksi}
                    onChange={(e) => setJenisTransaksi(e.target.value)}
                    disabled={filterType !== 'jenis_transaksi'}
                    className="w-full h-full px-1 text-[11px] bg-white outline-none cursor-pointer disabled:bg-[#ECE9D8]"
                  >
                    <option value="">Semua (Tunai & Kredit)</option>
                    <option value="TUNAI">TUNAI (Jth.Tmp = Tgl)</option>
                    <option value="KREDIT">KREDIT (Tempo &gt; 0)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_penjualan_filter"
                    checked={filterType === 'merk'}
                    onChange={() => setFilterType('merk')}
                    className="cursor-pointer"
                  />
                  <span>Merk Barang</span>
                </label>
                <input
                  type="text"
                  list="lap-penj-merk-list"
                  value={merkFilter}
                  onChange={(e) => setMerkFilter(e.target.value.toUpperCase())}
                  disabled={filterType !== 'merk'}
                  placeholder="Pilih / ketik merk barang..."
                  className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] uppercase outline-none disabled:bg-[#ECE9D8]"
                />
                <datalist id="lap-penj-merk-list">
                  {uniqueMerkOptions.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
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
                    placeholder="Kode/Nama Sales..."
                    className="w-[116px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8] shrink-0"
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
                    readOnly
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
                <input
                  type="text"
                  list="lap-penj-cust-list"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  disabled={filterType !== 'customer'}
                  placeholder="Pilih / ketik customer..."
                  className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] outline-none disabled:bg-[#ECE9D8]"
                />
                <datalist id="lap-penj-cust-list">
                  {customerCatalog.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
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
                    {lokasiOptions.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
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
                className="w-[82px] h-full bg-[#FFE4C4] hover:bg-[#FFECD6] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] font-extrabold text-[11px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span>
                  <span className="underline">P</span>REVIEW
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-[82px] h-full bg-[#FFE4C4] hover:bg-[#FFECD6] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] font-extrabold text-[11px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center p-1"
              >
                <span className="border border-dotted border-black/60 w-full h-full flex items-center justify-center">
                  <span className="underline">C</span>LOSE
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1060px] bg-[#ECE9D8] border border-[#808080] flex flex-col shadow-xs">
          <div className="bg-[#D4D0C8] border-b border-[#808080] px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center">
              <ToolbarSearchControl
                compact
                searchField={searchField}
                onSearchFieldChange={setSearchField}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onCari={handleToolbarCari}
                onReset={handleToolbarReset}
                options={[
                  { value: 'Semua', label: 'Semua Kolom' },
                  { value: 'Kode', label: 'Kode (No.Faktur)' },
                  { value: 'No.Faktur', label: 'No.Faktur' },
                  { value: 'Customer', label: 'Customer' },
                  { value: 'No.SO', label: 'No.SO' },
                  { value: 'Sales', label: 'Sales' },
                  { value: 'Jenis', label: 'Jenis / Bayar' },
                ]}
                inputRef={searchInputRef}
                isBusy={isBusy}
                placeholder="Cari No.Faktur, Customer, Barang, Sales..."
              />
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-black">
              <span>
                Mode: <b>{bentukLaporan}</b> ({activeModeRows.length} baris)
              </span>
              <span>
                DPP: <b>{formatRupiah(totalDppAll)}</b> | Total: <b>{formatRupiah(totalPenjualan)}</b>
              </span>
            </div>
          </div>

          <div className="max-h-[260px] overflow-auto bg-white">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080]">
                {bentukLaporan.startsWith('01') ? (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Faktur</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Bayar</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Kode Brg</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Barang</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Merk</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Qty</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Harga</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Subtotal Item</th>
                    <th className="px-2 py-1 text-center">Status</th>
                  </tr>
                ) : bentukLaporan.startsWith('02') ? (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Faktur</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Jenis</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Bayar</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.SO</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Sales</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">DPP</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">PPN</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Nilai Penjualan</th>
                    <th className="px-2 py-1 text-center">Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Jml Faktur</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total Qty</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total DPP</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total PPN</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total Penjualan</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Sudah Lunas</th>
                    <th className="px-2 py-1 text-right">Sisa Piutang</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeModeRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-6 text-gray-500 italic">
                      Tidak ada data Penjualan sesuai filter yang dipilih.
                    </td>
                  </tr>
                ) : bentukLaporan.startsWith('01') ? (
                  activeModeRows.map((r) => {
                    const isSel = r.id === selectedId;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        onDoubleClick={handlePrintSelected}
                        className={`cursor-pointer border-b border-[#E0E0E0] ${
                          isSel ? 'bg-[#316AC5] text-white' : 'hover:bg-[#EAF2FC]'
                        }`}
                      >
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.no_bukti}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.tanggal_display}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.cara_bayar}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_customer}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.kode_barang || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_barang}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.merk_barang || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.qty)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.harga)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">
                          {formatMoney(r.total_item)}
                        </td>
                        <td className="px-2 py-1 text-center">{r.sts_lunas}</td>
                      </tr>
                    );
                  })
                ) : bentukLaporan.startsWith('02') ? (
                  activeModeRows.map((r) => (
                    <tr key={r.id} className="border-b border-[#E0E0E0] hover:bg-[#EAF2FC]">
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.no_bukti}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.jenis_faktur}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.tanggal_display}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.cara_bayar}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_customer}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_so}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.sales}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.dpp)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.nilai_ppn)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">
                        {formatMoney(r.nilai)}
                      </td>
                      <td className="px-2 py-1 text-center">{r.sts_lunas}</td>
                    </tr>
                  ))
                ) : (
                  activeModeRows.map((r) => (
                    <tr key={r.id} className="border-b border-[#E0E0E0] hover:bg-[#EAF2FC]">
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-semibold">{r.nama_customer}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{r.jml_faktur}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.total_qty)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.dpp)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.nilai_ppn)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">{formatMoney(r.nilai)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono text-[#107C10]">
                        {formatMoney(r.lunas_nilai)}
                      </td>
                      <td className="px-2 py-1 text-right font-mono text-[#C00000]">
                        {formatMoney(r.piutang_nilai)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Laporan Penjualan Barang"
        rows={tableRows}
        columns={[
          { header: 'No.Faktur', accessor: (r) => r.no_bukti, mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal_display, align: 'center' },
          { header: 'Bayar', accessor: (r) => r.cara_bayar, align: 'center' },
          { header: 'Customer', accessor: (r) => r.nama_customer },
          { header: 'Kode Brg', accessor: (r) => r.kode_barang || '-', mono: true },
          { header: 'Nama Barang', accessor: (r) => r.nama_barang },
          { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', mono: true },
          { header: 'Nilai (Rp)', accessor: (r) => formatMoney(r.nilai), align: 'right', mono: true, bold: true },
          { header: 'Status', accessor: (r) => r.sts_lunas, align: 'center' },
        ]}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.no_bukti,
          r.jenis_faktur,
          r.cara_bayar,
          r.tanggal_display,
          r.nama_customer,
          r.no_so,
          r.sales,
          r.kode_barang,
          r.nama_barang,
          r.merk_barang,
          r.sts_lunas,
        ]}
        selectedId={selectedId}
        onSelectRow={(r) => {
          setSelectedId(r.id);
          showFeedback(`Faktur Penjualan [${r.no_bukti}] dipilih`);
        }}
        onSearchSupabase={() => loadLiveRows()}
        onRefreshSupabase={() => loadLiveRows()}
        isBusy={isBusy}
      />

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={bentukLaporan.toUpperCase()}
        subtitle={`Periode: ${tglStart} s/d ${tglEnd}`}
        orientation="landscape"
        defaultPrintScope={printScopeOnOpen}
        selectedRow={selectedPenjPrintRow}
        selectedTitle="CETAK FAKTUR PENJUALAN TERPILIH"
        selectedSubtitle={
          selectedPenjPrintRow
            ? `No.Faktur: ${selectedPenjPrintRow.no_bukti} | Customer: ${selectedPenjPrintRow.nama_customer}`
            : undefined
        }
        selectedMetaLines={
          selectedPenjPrintRow
            ? [
                { label: 'No.Faktur', value: selectedPenjPrintRow.no_bukti },
                { label: 'Jenis / Bayar', value: `${selectedPenjPrintRow.jenis_faktur} (${selectedPenjPrintRow.cara_bayar})` },
                { label: 'Tanggal', value: selectedPenjPrintRow.tanggal },
                { label: 'Customer', value: selectedPenjPrintRow.nama_customer },
                { label: 'No.SO / SJ', value: `${selectedPenjPrintRow.no_so || '-'} / ${selectedPenjPrintRow.no_sj || '-'}` },
              ]
            : undefined
        }
        selectedColumns={[
          { header: 'No.Faktur', accessor: 'no_bukti', width: '95px' },
          { header: 'Kode Brg', accessor: 'kode_barang', width: '80px' },
          { header: 'Nama Barang', accessor: 'nama_barang' },
          { header: 'Unit', accessor: 'unit', align: 'center', width: '48px' },
          { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', width: '50px' },
          { header: 'Harga', accessor: (r) => formatMoney(r.harga), align: 'right', width: '80px' },
          { header: 'Subtotal', accessor: (r) => formatMoney(r.total_item), align: 'right', width: '90px' },
        ]}
        selectedSummaryItems={
          selectedPenjPrintRow
            ? [
                { label: 'DPP Faktur', value: formatRupiah(selectedPenjPrintRow.dpp) },
                { label: `PPN (${selectedPenjPrintRow.ppn})`, value: formatRupiah(selectedPenjPrintRow.nilai_ppn) },
                { label: 'Nilai Faktur', value: formatRupiah(selectedPenjPrintRow.nilai) },
                { label: 'Status Lunas', value: selectedPenjPrintRow.sts_lunas },
              ]
            : undefined
        }
        metaLines={[
          { label: 'Periode Tanggal', value: `${tglStart} s/d ${tglEnd}` },
          { label: 'Lokasi Stock', value: lokasiStock },
          {
            label: 'Filter',
            value:
              filterType === 'jenis_transaksi'
                ? `Cara Bayar: ${jenisTransaksi || 'Semua'}`
                : filterType === 'merk'
                ? `Merk: ${merkFilter || 'Semua'}`
                : filterType === 'sales'
                ? `Sales ${salesCode || 'Semua'} ${salesName ? `(${salesName})` : ''}`
                : filterType === 'customer'
                ? customerFilter || 'Semua Customer'
                : 'ALL Berdasarkan Periode',
          },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={printColumns}
        rows={activeModeRows}
        summaryItems={[
          { label: 'Total Baris', value: `${activeModeRows.length} Baris` },
          { label: 'Total DPP', value: formatRupiah(totalDppAll) },
          { label: 'Total PPN', value: formatRupiah(totalPpnAll) },
          { label: 'Total Nilai Penjualan', value: formatRupiah(totalPenjualan) },
        ]}
      />
    </div>
  );
};
