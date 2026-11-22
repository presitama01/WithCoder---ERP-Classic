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
  syncAppSettings,
  todayIso,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

interface LaporanSuratJalanPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaporanSuratJalanPrintForm: React.FC<LaporanSuratJalanPrintFormProps> = ({
  isOpen,
  onClose,
}) => {
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
  const [filterType, setFilterType] = useState<'merk' | 'sales' | 'customer' | 'all_periode'>('all_periode');
  const [merkFilter, setMerkFilter] = useState<string>('');
  const [salesCode, setSalesCode] = useState<string>('');
  const [salesDesc, setSalesDesc] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Laporan Detail Surat Jalan');
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

  const loadLiveRows = async (barangMerkMap?: Map<string, string>): Promise<any[]> => {
    const merkMap = barangMerkMap || new Map<string, string>();
    if (merkMap.size === 0) {
      const barangs = await erpList<any>('master_barangs', { limit: 2000 }).catch(() => []);
      for (const b of barangs) {
        if (b.kode) merkMap.set(String(b.kode).trim().toUpperCase(), String(b.merk || ''));
      }
    }

    const viewRows = await erpList<any>('v_laporan_surat_jalan', {
      orderBy: 'tanggal',
      asc: false,
      limit: 2000,
    }).catch(() => null);

    let mapped: any[] = [];

    if (Array.isArray(viewRows)) {
      mapped = viewRows.map((r, idx) => {
        const tglIso = toIsoDate(r.tanggal) || '';
        const kode = String(r.kode || '').trim().toUpperCase();
        return {
          id: `${r.sj_id || r.no_bukti}-${kode || idx}`,
          sj_id: r.sj_id,
          no_bukti: r.no_bukti || '',
          tanggal_iso: tglIso,
          tanggal_display: toDisplayDMyShort(tglIso) || '-',
          nama_customer: r.nama_customer || '',
          no_so: r.no_so || '',
          po_no: r.po_no || '',
          sales: r.sales || '',
          no_faktur: r.no_faktur || '',
          lokasi_stock: r.lokasi_stock || '01 - OFFICE',
          nama_expedisi: r.nama_expedisi || '',
          no_polisi: r.no_polisi || '',
          nama_supir: r.nama_supir || '',
          sts_print: r.sts_print || 'Not Yet',
          sts_post: r.sts_post || 'Posting',
          keterangan: r.keterangan || '',
          kode,
          nama_barang: r.nama_barang || '',
          merk_barang: merkMap.get(kode) || '',
          unit: r.unit || 'PCS',
          qty: Number(r.qty || 0),
          terima: Number(r.terima || 0),
        };
      });
    } else {
      const [headers, details] = await Promise.all([
        erpList<any>('surat_jalans', { orderBy: 'tanggal', asc: false, limit: 1500 }),
        erpList<any>('surat_jalan_details', { limit: 4000 }).catch(() => []),
      ]);
      const detailsBySjId = new Map<string, any[]>();
      for (const d of details) {
        const sid = String(d.surat_jalan_id || '');
        if (!sid) continue;
        const list = detailsBySjId.get(sid) || [];
        list.push(d);
        detailsBySjId.set(sid, list);
      }

      for (const h of headers) {
        const tglIso = toIsoDate(h.tanggal) || '';
        const dets = detailsBySjId.get(String(h.id)) || [];
        if (dets.length === 0) {
          mapped.push({
            id: `${h.id}-hdr`,
            sj_id: h.id,
            no_bukti: h.no_bukti || '',
            tanggal_iso: tglIso,
            tanggal_display: toDisplayDMyShort(tglIso) || '-',
            nama_customer: h.nama_customer || '',
            no_so: h.no_so || '',
            po_no: h.po_no || '',
            sales: h.sales || '',
            no_faktur: h.no_faktur || '',
            lokasi_stock: h.lokasi_stock || '01 - OFFICE',
            nama_expedisi: h.nama_expedisi || '',
            no_polisi: h.no_polisi || '',
            nama_supir: h.nama_supir || '',
            sts_print: h.sts_print || 'Not Yet',
            sts_post: h.sts_post || 'Posting',
            keterangan: h.keterangan || '',
            kode: '',
            nama_barang: '',
            merk_barang: '',
            unit: 'PCS',
            qty: 0,
            terima: 0,
          });
        } else {
          for (const d of dets) {
            const kode = String(d.kode || '').trim().toUpperCase();
            mapped.push({
              id: String(d.id),
              sj_id: h.id,
              no_bukti: h.no_bukti || '',
              tanggal_iso: tglIso,
              tanggal_display: toDisplayDMyShort(tglIso) || '-',
              nama_customer: h.nama_customer || '',
              no_so: h.no_so || '',
              po_no: h.po_no || '',
              sales: h.sales || '',
              no_faktur: h.no_faktur || '',
              lokasi_stock: h.lokasi_stock || '01 - OFFICE',
              nama_expedisi: h.nama_expedisi || '',
              no_polisi: h.no_polisi || '',
              nama_supir: h.nama_supir || '',
              sts_print: h.sts_print || 'Not Yet',
              sts_post: h.sts_post || 'Posting',
              keterangan: h.keterangan || '',
              kode,
              nama_barang: d.nama_barang || '',
              merk_barang: merkMap.get(kode) || '',
              unit: d.unit || 'PCS',
              qty: Number(d.qty || 0),
              terima: Number(d.terima || 0),
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
        const [sales, lokasis, customers, merks, barangs] = await Promise.all([
          erpList<any>('master_sales', { orderBy: 'nama_sales', asc: true }).catch(() => []),
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
          erpList<any>('master_merks', { orderBy: 'merk', asc: true }).catch(() => []),
          erpList<any>('master_barangs', { limit: 2000 }).catch(() => []),
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

        const merkMap = new Map<string, string>();
        for (const b of barangs) {
          if (b.kode) merkMap.set(String(b.kode).trim().toUpperCase(), String(b.merk || ''));
        }
        const mList = Array.from(
          new Set([
            ...merks.filter((m) => m.is_active !== false).map((m) => String(m.merk || m.nama_merk || '').trim()),
            ...Array.from(merkMap.values()),
          ])
        ).filter(Boolean);
        setMerkOptions(mList);

        const rawPreset = localStorage.getItem('withcoder_preset_surat_jalan');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.lokasiStock) setLokasiStock(v.lokasiStock);
          if (v.bentukLaporan) setBentukLaporan(v.bentukLaporan);
        }

        await loadLiveRows(merkMap);
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
    setSalesDesc(match ? match.nama : '');
  }, [salesCode, salesCatalog]);

  if (!isOpen) return null;

  const startIso = toIsoDate(tglStart);
  const endIso = toIsoDate(tglEnd);

  const filteredDetailRows = tableRows.filter((r) => {
    if (startIso && r.tanggal_iso && r.tanggal_iso < startIso) return false;
    if (endIso && r.tanggal_iso && r.tanggal_iso > endIso) return false;
    if (lokasiStock !== 'ALL' && r.lokasi_stock && r.lokasi_stock !== lokasiStock) return false;

    if (filterType === 'merk' && merkFilter.trim()) {
      if (!r.merk_barang.toLowerCase().includes(merkFilter.trim().toLowerCase())) return false;
    }
    if (filterType === 'sales' && salesCode.trim()) {
      const q = salesCode.trim().toLowerCase();
      const sDesc = salesDesc.trim().toLowerCase();
      const rowSales = String(r.sales || '').toLowerCase();
      if (!rowSales.includes(q) && !(sDesc && rowSales.includes(sDesc))) return false;
    }
    if (filterType === 'customer' && customerFilter.trim()) {
      if (!r.nama_customer.toLowerCase().includes(customerFilter.trim().toLowerCase())) return false;
    }

    if (searchTerm.trim()) {
      if (searchField === 'Kode' || searchField === 'No.Bukti') {
        return matchesMultiKeyword([r.no_bukti], searchTerm);
      }
      if (searchField === 'Customer') return matchesMultiKeyword([r.nama_customer], searchTerm);
      if (searchField === 'No.SO') return matchesMultiKeyword([r.no_so], searchTerm);
      if (searchField === 'PO.No') return matchesMultiKeyword([r.po_no], searchTerm);
      if (searchField === 'Sales') return matchesMultiKeyword([r.sales], searchTerm);
      if (searchField === 'No.Faktur') return matchesMultiKeyword([r.no_faktur], searchTerm);
      return matchesMultiKeyword(
        [
          r.no_bukti,
          r.tanggal_display,
          r.nama_customer,
          r.no_so,
          r.po_no,
          r.sales,
          r.no_faktur,
          r.kode,
          r.nama_barang,
          r.merk_barang,
          r.nama_expedisi,
          r.lokasi_stock,
          r.sts_post,
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
    if (mode.startsWith('02')) {
      // 02 - Laporan Rekap Surat Jalan (grouped by no_bukti)
      const grouped = new Map<string, any>();
      for (const r of rows) {
        const key = r.no_bukti || r.id;
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            no_bukti: r.no_bukti,
            tanggal_display: r.tanggal_display,
            nama_customer: r.nama_customer,
            no_so: r.no_so || '-',
            po_no: r.po_no || '-',
            sales: r.sales || '-',
            no_faktur: r.no_faktur || '-',
            nama_expedisi: r.nama_expedisi || '-',
            no_polisi: r.no_polisi || '-',
            nama_supir: r.nama_supir || '-',
            jml_item: 0,
            qty: 0,
            terima: 0,
            sts_post: r.sts_post,
          });
        }
        const g = grouped.get(key);
        if (r.kode) g.jml_item += 1;
        g.qty += Number(r.qty || 0);
        g.terima += Number(r.terima || 0);
      }
      return Array.from(grouped.values());
    }
    // 03 - Laporan Surat Jalan by Customer
    const byCust = new Map<string, any>();
    for (const r of rows) {
      const cust = r.nama_customer || '(TANPA CUSTOMER)';
      if (!byCust.has(cust)) {
        byCust.set(cust, {
          id: cust,
          nama_customer: cust,
          sjSet: new Set<string>(),
          fakturSet: new Set<string>(),
          unbilledSjSet: new Set<string>(),
          jml_item: 0,
          qty: 0,
          terima: 0,
        });
      }
      const g = byCust.get(cust);
      if (r.no_bukti) {
        g.sjSet.add(r.no_bukti);
        if (r.no_faktur && r.no_faktur !== '-') {
          g.fakturSet.add(r.no_bukti);
        } else {
          g.unbilledSjSet.add(r.no_bukti);
        }
      }
      if (r.kode) g.jml_item += 1;
      g.qty += Number(r.qty || 0);
      g.terima += Number(r.terima || 0);
    }
    return Array.from(byCust.values())
      .map((g) => ({
        id: g.id,
        nama_customer: g.nama_customer,
        jml_sj: g.sjSet.size,
        jml_item: g.jml_item,
        qty: g.qty,
        terima: g.terima,
        sudah_faktur: g.fakturSet.size,
        belum_faktur: g.unbilledSjSet.size,
      }))
      .sort((a, b) => b.jml_sj - a.jml_sj);
  };

  const activeModeRows = buildModeRows(filteredDetailRows, bentukLaporan);
  const selectedTableRow =
    filteredDetailRows.find((r) => r.id === selectedId) ||
    tableRows.find((r) => r.id === selectedId) ||
    null;

  const selectedSjPrintRow = selectedTableRow
    ? { ...selectedTableRow, tanggal: selectedTableRow.tanggal_display }
    : null;

  const handleSimpanFilter = async () => {
    try {
      setIsBusy(true);
      localStorage.setItem(
        'withcoder_preset_surat_jalan',
        JSON.stringify({ lokasiStock, bentukLaporan })
      );
      await syncAppSettings({
        periode_start: toIsoDate(tglStart),
        periode_end: toIsoDate(tglEnd),
        lokasi_aktif: lokasiStock !== 'ALL' ? lokasiStock : undefined,
      });
      showFeedback('Preset filter Laporan Surat Jalan tersimpan');
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
        { header: 'No.Bukti SJ', accessor: 'no_bukti', width: '92px' },
        { header: 'Tanggal', accessor: 'tanggal_display', align: 'center', width: '70px' },
        { header: 'Customer', accessor: 'nama_customer' },
        { header: 'No.SO', accessor: 'no_so', width: '82px' },
        { header: 'Kode Brg', accessor: 'kode', width: '72px' },
        { header: 'Nama Barang', accessor: 'nama_barang' },
        { header: 'Unit', accessor: 'unit', align: 'center', width: '40px' },
        { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', width: '46px' },
        { header: 'Terima', accessor: (r) => formatMoney(r.terima), align: 'right', width: '46px' },
        { header: 'Expedisi', accessor: 'nama_expedisi', width: '80px' },
        { header: 'No.Faktur', accessor: 'no_faktur', width: '82px' },
        { header: 'Status', accessor: 'sts_post', align: 'center', width: '54px' },
      ];
    }
    if (mode.startsWith('02')) {
      return [
        { header: 'No.Bukti SJ', accessor: 'no_bukti', width: '96px' },
        { header: 'Tanggal', accessor: 'tanggal_display', align: 'center', width: '74px' },
        { header: 'Nama Customer', accessor: 'nama_customer' },
        { header: 'No.SO', accessor: 'no_so', width: '85px' },
        { header: 'PO.No', accessor: 'po_no', width: '78px' },
        { header: 'Sales', accessor: 'sales', align: 'center', width: '65px' },
        { header: 'No.Faktur', accessor: 'no_faktur', width: '85px' },
        { header: 'Expedisi', accessor: 'nama_expedisi', width: '80px' },
        { header: 'No.Pol', accessor: 'no_polisi', width: '68px' },
        { header: 'Item', accessor: 'jml_item', align: 'right', width: '40px' },
        { header: 'Total Qty', accessor: (r) => formatMoney(r.qty), align: 'right', width: '56px' },
        { header: 'Status', accessor: 'sts_post', align: 'center', width: '55px' },
      ];
    }
    return [
      { header: 'Nama Customer', accessor: 'nama_customer' },
      { header: 'Jml SJ', accessor: 'jml_sj', align: 'right', width: '65px' },
      { header: 'Jml Item', accessor: 'jml_item', align: 'right', width: '65px' },
      { header: 'Total Qty Kirim', accessor: (r) => formatMoney(r.qty), align: 'right', width: '90px' },
      { header: 'Total Qty Terima', accessor: (r) => formatMoney(r.terima), align: 'right', width: '90px' },
      { header: 'SJ Sudah Faktur', accessor: 'sudah_faktur', align: 'right', width: '85px' },
      { header: 'SJ Belum Faktur', accessor: 'belum_faktur', align: 'right', width: '85px' },
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
      showFeedback('Pilih baris Surat Jalan yang akan dicetak terlebih dahulu');
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
        fileName: 'Laporan_Surat_Jalan',
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
      showFeedback('Export Excel Surat Jalan selesai');
    } catch (err: any) {
      showFeedback(`Gagal export: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const totalQty = activeModeRows.reduce((a, r) => a + Number(r.qty || 0), 0);
  const totalTerima = activeModeRows.reduce((a, r) => a + Number(r.terima || 0), 0);
  const printColumns = getColumnsForMode(bentukLaporan);

  return (
    <div
      id="laporan-surat-jalan-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Laporan Surat Jalan"
        onClose={onClose}
        onFind={handleFind}
        onPrint={handlePreview}
        onTableView={() => loadLiveRows()}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3 space-y-2.5">
        <div className="max-w-[660px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-3 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-sm tracking-wider text-black font-sans">
              LAPORAN SURAT JALAN (DETAIL / REKAP / CUSTOMER)
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

          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">Periode</legend>
            <div className="flex items-center space-x-2 pt-0.5">
              <span className="font-semibold text-black text-[11px]">
                Tanggal ( dd-MMM-yyyy ) :
              </span>

              <DatePickerInput
                value={tglStart}
                onChange={(formatted) => setTglStart(formatted)}
                format="dMyShort"
                inputClassName="w-[96px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />

              <span className="font-bold text-[11px] px-1 text-black">s / d</span>

              <DatePickerInput
                value={tglEnd}
                onChange={(formatted) => setTglEnd(formatted)}
                format="dMyShort"
                inputClassName="w-[96px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />
            </div>
          </fieldset>

          <fieldset className="border border-[#999999] p-2 rounded-none relative">
            <legend className="text-[11px] font-semibold px-1 text-black">
              Pilihan Laporan Berdasarkan :
            </legend>

            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-semibold cursor-pointer w-[115px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_sj_filter"
                    checked={filterType === 'merk'}
                    onChange={() => setFilterType('merk')}
                    className="cursor-pointer"
                  />
                  <span>Merk Barang</span>
                </label>
                <input
                  type="text"
                  list="lap-sj-merk-list"
                  value={merkFilter}
                  onChange={(e) => setMerkFilter(e.target.value.toUpperCase())}
                  disabled={filterType !== 'merk'}
                  placeholder="Pilih / ketik merk barang..."
                  className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] uppercase outline-none disabled:bg-[#ECE9D8]"
                />
                <datalist id="lap-sj-merk-list">
                  {merkOptions.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-semibold cursor-pointer w-[115px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_sj_filter"
                    checked={filterType === 'sales'}
                    onChange={() => setFilterType('sales')}
                    className="cursor-pointer"
                  />
                  <span>Sales</span>
                </label>

                <div className="flex items-center space-x-1 flex-1">
                  <input
                    type="text"
                    list="lap-sj-sales-list"
                    value={salesCode}
                    onChange={(e) => setSalesCode(e.target.value.toUpperCase())}
                    disabled={filterType !== 'sales'}
                    className="bg-white border border-[#7A7A7A] px-2 py-0.5 w-32 text-[11px] font-mono uppercase disabled:bg-[#ECE9D8]"
                    placeholder="Kode/Nama Sales..."
                  />
                  <datalist id="lap-sj-sales-list">
                    {salesCatalog.map((s) => (
                      <option key={s.kode} value={s.kode}>
                        {s.nama}
                      </option>
                    ))}
                  </datalist>
                  <input
                    type="text"
                    value={salesDesc}
                    readOnly
                    className="bg-[#FFFFCC] border border-[#7A7A7A] px-2 py-0.5 flex-1 text-[11px] shadow-inner uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold w-[115px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_sj_filter"
                    checked={filterType === 'customer'}
                    onChange={() => setFilterType('customer')}
                    className="cursor-pointer"
                  />
                  <span>Customer</span>
                </label>
                <input
                  type="text"
                  list="lap-sj-cust-list"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  disabled={filterType !== 'customer'}
                  placeholder="Pilih / ketik customer..."
                  className="flex-1 bg-white border border-[#7A7A7A] px-2 py-0.5 text-[11px] uppercase outline-none disabled:bg-[#ECE9D8]"
                />
                <datalist id="lap-sj-cust-list">
                  {customerCatalog.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="laporan_sj_filter"
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
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer uppercase"
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
                    <option value="01 - Laporan Detail Surat Jalan">01 - Laporan Detail Surat Jalan</option>
                    <option value="02 - Laporan Rekap Surat Jalan">02 - Laporan Rekap Surat Jalan</option>
                    <option value="03 - Laporan Surat Jalan by Customer">03 - Laporan Surat Jalan by Customer</option>
                  </select>
                </div>
              </fieldset>
            </div>

            <div className="w-[100px] border border-[#999999] p-1.5 flex flex-col items-center justify-center gap-1.5 bg-[#E6E2D4]">
              <button
                type="button"
                disabled={isBusy}
                onClick={handlePreview}
                className="w-full flex-1 py-2 bg-[#EAE6D9] border-2 border-[#FFFFFF] border-r-[#808080] border-b-[#808080] hover:bg-[#F2EFE6] font-extrabold text-[12px] text-black shadow-xs cursor-pointer flex items-center justify-center text-center"
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
                  { value: 'Kode', label: 'Kode (No.Bukti)' },
                  { value: 'No.Bukti', label: 'No.Bukti' },
                  { value: 'Customer', label: 'Customer' },
                  { value: 'No.SO', label: 'No.SO' },
                  { value: 'PO.No', label: 'PO.No' },
                  { value: 'Sales', label: 'Sales' },
                  { value: 'No.Faktur', label: 'No.Faktur' },
                ]}
                inputRef={searchInputRef}
                isBusy={isBusy}
                placeholder="Cari No.Bukti SJ, Customer, No.SO, Barang..."
              />
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-black">
              <span>
                Mode: <b>{bentukLaporan}</b> ({activeModeRows.length} baris)
              </span>
              <span>
                Total Qty: <b>{formatMoney(totalQty)}</b> | Terima: <b>{formatMoney(totalTerima)}</b>
              </span>
            </div>
          </div>

          <div className="max-h-[260px] overflow-auto bg-white">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080]">
                {bentukLaporan.startsWith('01') ? (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Bukti SJ</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.SO</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Kode Brg</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Barang</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Unit</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Qty</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Terima</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Expedisi</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Faktur</th>
                    <th className="px-2 py-1 text-center">Status</th>
                  </tr>
                ) : bentukLaporan.startsWith('02') ? (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Bukti SJ</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.SO</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">PO.No</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Sales</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Faktur</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Expedisi</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Item</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total Qty</th>
                    <th className="px-2 py-1 text-center">Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Jml SJ</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Jml Item</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total Qty Kirim</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total Qty Terima</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Sudah Faktur</th>
                    <th className="px-2 py-1 text-right">Belum Faktur</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeModeRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-6 text-gray-500 italic">
                      Tidak ada data Surat Jalan sesuai filter yang dipilih.
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
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_customer}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_so || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.kode || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_barang || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.unit}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.qty)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.terima)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_expedisi || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_faktur || '-'}</td>
                        <td className="px-2 py-1 text-center">{r.sts_post}</td>
                      </tr>
                    );
                  })
                ) : bentukLaporan.startsWith('02') ? (
                  activeModeRows.map((r) => (
                    <tr key={r.id} className="border-b border-[#E0E0E0] hover:bg-[#EAF2FC]">
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.no_bukti}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.tanggal_display}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_customer}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_so}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.po_no}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.sales}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_faktur}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_expedisi}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{r.jml_item}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">{formatMoney(r.qty)}</td>
                      <td className="px-2 py-1 text-center">{r.sts_post}</td>
                    </tr>
                  ))
                ) : (
                  activeModeRows.map((r) => (
                    <tr key={r.id} className="border-b border-[#E0E0E0] hover:bg-[#EAF2FC]">
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-semibold">{r.nama_customer}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">{r.jml_sj}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{r.jml_item}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.qty)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.terima)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono text-[#107C10]">{r.sudah_faktur}</td>
                      <td className="px-2 py-1 text-right font-mono text-[#C00000]">{r.belum_faktur}</td>
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
        tableLabel="Laporan Surat Jalan"
        rows={tableRows}
        columns={[
          { header: 'No.Bukti SJ', accessor: (r) => r.no_bukti, mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal_display, align: 'center' },
          { header: 'Customer', accessor: (r) => r.nama_customer },
          { header: 'No.SO', accessor: (r) => r.no_so || '-', mono: true },
          { header: 'Kode Brg', accessor: (r) => r.kode || '-', mono: true },
          { header: 'Nama Barang', accessor: (r) => r.nama_barang || '-' },
          { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', mono: true },
          { header: 'Status', accessor: (r) => r.sts_post, align: 'center' },
        ]}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.no_bukti,
          r.tanggal_display,
          r.nama_customer,
          r.no_so,
          r.po_no,
          r.sales,
          r.no_faktur,
          r.kode,
          r.nama_barang,
          r.merk_barang,
          r.lokasi_stock,
          r.sts_post,
        ]}
        selectedId={selectedId}
        onSelectRow={(r) => {
          setSelectedId(r.id);
          showFeedback(`Surat Jalan [${r.no_bukti}] dipilih`);
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
        selectedRow={selectedSjPrintRow}
        selectedTitle="CETAK ITEM SURAT JALAN TERPILIH"
        selectedSubtitle={
          selectedSjPrintRow
            ? `No.Bukti SJ: ${selectedSjPrintRow.no_bukti} | Customer: ${selectedSjPrintRow.nama_customer}`
            : undefined
        }
        selectedMetaLines={
          selectedSjPrintRow
            ? [
                { label: 'No.Bukti SJ', value: selectedSjPrintRow.no_bukti },
                { label: 'Tanggal', value: selectedSjPrintRow.tanggal },
                { label: 'Customer', value: selectedSjPrintRow.nama_customer },
                {
                  label: 'No.SO / PO',
                  value: `${selectedSjPrintRow.no_so || '-'} / ${selectedSjPrintRow.po_no || '-'}`,
                },
                { label: 'Expedisi', value: selectedSjPrintRow.nama_expedisi || '-' },
                { label: 'Lokasi Stock', value: selectedSjPrintRow.lokasi_stock || '-' },
              ]
            : undefined
        }
        selectedColumns={[
          { header: 'No.Bukti SJ', accessor: 'no_bukti', width: '95px' },
          { header: 'Kode Brg', accessor: 'kode', width: '85px' },
          { header: 'Nama Barang', accessor: 'nama_barang' },
          { header: 'Unit', accessor: 'unit', align: 'center', width: '50px' },
          { header: 'Qty Kirim', accessor: (r) => formatMoney(r.qty), align: 'right', width: '70px' },
          { header: 'Qty Terima', accessor: (r) => formatMoney(r.terima), align: 'right', width: '70px' },
        ]}
        metaLines={[
          { label: 'Periode Tanggal', value: `${tglStart} s/d ${tglEnd}` },
          { label: 'Lokasi Stock', value: lokasiStock },
          {
            label: 'Filter',
            value:
              filterType === 'merk'
                ? `Merk ${merkFilter || 'Semua'}`
                : filterType === 'sales'
                ? `Sales ${salesCode || 'Semua'} ${salesDesc ? `(${salesDesc})` : ''}`
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
          { label: 'Total Qty Kirim', value: formatMoney(totalQty) },
          { label: 'Total Qty Terima', value: formatMoney(totalTerima) },
        ]}
      />
    </div>
  );
};
