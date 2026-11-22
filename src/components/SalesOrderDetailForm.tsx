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

interface SalesOrderDetailFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SoDetailGridRow {
  id: string;
  so_id: string | null;
  no_so: string;
  tanggal: string;
  tanggalIso: string;
  no_po: string;
  no_sq: string;
  customer: string;
  sales: string;
  kode_barang: string;
  nama_barang: string;
  merk_barang: string;
  unit: string;
  pesan: number;
  kirim: number;
  sisa: number;
  persen: number;
  harga: number;
  total_item: number;
  nilai_so: number;
  lokasi_stock: string;
  so_close: string;
}

export const SalesOrderDetailForm: React.FC<SalesOrderDetailFormProps> = ({
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
  const [filterType, setFilterType] = useState<
    'merk' | 'batasan_kode' | 'customer' | 'all_periode'
  >('all_periode');
  const [merkFilter, setMerkFilter] = useState<string>('');
  const [kodeBarang, setKodeBarang] = useState<string>('');
  const [namaBarangDesc, setNamaBarangDesc] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Sales Order Detail');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [merkOptions, setMerkOptions] = useState<string[]>([]);
  const [barangCatalog, setBarangCatalog] = useState<
    { kode: string; nama: string; unit: string; merk: string }[]
  >([]);
  const [customerCatalog, setCustomerCatalog] = useState<string[]>([]);

  const [tableRows, setTableRows] = useState<SoDetailGridRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printScopeOnOpen, setPrintScopeOnOpen] = useState<'selected' | 'all'>('all');
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const loadLiveRows = async (
    catalogOverride?: { kode: string; nama: string; unit: string; merk: string }[]
  ): Promise<SoDetailGridRow[]> => {
    const activeCatalog = catalogOverride || barangCatalog;
    const merkByKode = new Map<string, string>();
    for (const b of activeCatalog) {
      if (b.kode) merkByKode.set(b.kode.trim().toUpperCase(), b.merk || '');
    }

    const viewRows = await erpList<any>('v_mutasi_sales_order', {
      orderBy: 'tanggal',
      asc: false,
      limit: 2000,
    }).catch(() => null);

    let mapped: SoDetailGridRow[] = [];

    if (Array.isArray(viewRows)) {
      const orders = await erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false, limit: 1000 }).catch(
        () => []
      );
      const nilaiBySoId = new Map<string, number>();
      for (const o of orders) {
        if (o.id) nilaiBySoId.set(String(o.id), Number(o.nilai_so || 0));
      }

      mapped = viewRows.map((r) => {
        const tglIso = toIsoDate(r.tanggal) || '';
        const kodeBrg = String(r.kode_barang || '').trim().toUpperCase();
        const pesan = Number(r.pesan || 0);
        const kirim = Number(r.kirim || 0);
        const sisa =
          r.sisa !== undefined && r.sisa !== null ? Number(r.sisa) : Math.max(0, pesan - kirim);
        const harga = Number(r.harga || 0);
        const totalItem = Number(r.total || pesan * harga);
        const isClosed = String(r.so_close || '').toLowerCase() === 'closed' || (pesan > 0 && sisa <= 0);
        return {
          id: String(r.id),
          so_id: r.so_id || null,
          no_so: String(r.no_so || ''),
          tanggal: toDisplayDMyShort(tglIso) || '-',
          tanggalIso: tglIso,
          no_po: String(r.no_po || ''),
          no_sq: String(r.no_sq || ''),
          customer: String(r.customer || ''),
          sales: String(r.sales || ''),
          kode_barang: kodeBrg,
          nama_barang: String(r.nama_barang || ''),
          merk_barang: merkByKode.get(kodeBrg) || '',
          unit: String(r.unit || 'PCS'),
          pesan,
          kirim,
          sisa,
          persen: pesan > 0 ? Math.min(100, Math.round((kirim / pesan) * 100)) : 0,
          harga,
          total_item: totalItem,
          nilai_so: (r.so_id && nilaiBySoId.get(String(r.so_id))) || totalItem,
          lokasi_stock: String(r.lokasi_stock || '01 - OFFICE'),
          so_close: isClosed ? 'Closed' : 'Not Yet',
        };
      });
    } else {
      const [orders, details, sjHeaders, sjDetails] = await Promise.all([
        erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false, limit: 1500 }),
        erpList<any>('sales_order_details', { limit: 4000 }),
        erpList<any>('surat_jalans', { limit: 2000 }).catch(() => []),
        erpList<any>('surat_jalan_details', { limit: 4000 }).catch(() => []),
      ]);

      const orderById = new Map<string, any>();
      for (const o of orders) {
        if (o.id) orderById.set(String(o.id), o);
      }

      const sjHdrById = new Map<string, any>();
      for (const h of sjHeaders) {
        if (h.id) sjHdrById.set(String(h.id), h);
      }

      const kirimBySoKode = new Map<string, number>();
      for (const d of sjDetails) {
        const h = sjHdrById.get(String(d.surat_jalan_id || ''));
        if (!h) continue;
        const st = String(h.sts_post || '').trim().toUpperCase();
        if (st !== 'POSTING' && st !== 'POSTED') continue;
        const noSo = String(h.no_so || '').trim().toUpperCase();
        const kode = String(d.kode || '').trim().toUpperCase();
        if (!noSo || !kode) continue;
        const qtyVal = Number(d.terima || 0) > 0 ? Number(d.terima) : Number(d.qty || 0);
        const key = `${noSo}__${kode}`;
        kirimBySoKode.set(key, (kirimBySoKode.get(key) || 0) + qtyVal);
      }

      mapped = details.map((d) => {
        const parent = orderById.get(String(d.so_id || '')) || {};
        const tglIso = toIsoDate(parent.tanggal || d.created_at) || '';
        const noSo = String(parent.no_bukti || d.no_bukti || '').trim().toUpperCase();
        const kodeBrg = String(d.kode || '').trim().toUpperCase();
        const pesan = Number(d.qty || 0);
        const kirimAgg = kirimBySoKode.get(`${noSo}__${kodeBrg}`);
        const kirim = kirimAgg !== undefined ? kirimAgg : Number(d.terima || 0);
        const sisa = Math.max(0, pesan - kirim);
        const harga = Number(d.harga || 0);
        const totalItem = Number(d.total || pesan * harga);
        const isClosed = String(parent.so_close || '').toLowerCase() === 'closed' || (pesan > 0 && sisa <= 0);
        return {
          id: String(d.id),
          so_id: d.so_id || parent.id || null,
          no_so: parent.no_bukti || d.no_bukti || '',
          tanggal: toDisplayDMyShort(tglIso) || '-',
          tanggalIso: tglIso,
          no_po: parent.po_no || '',
          no_sq: parent.no_sq || '',
          customer: parent.nama_customer || '',
          sales: parent.sales || '',
          kode_barang: kodeBrg,
          nama_barang: d.nama_barang || '',
          merk_barang: merkByKode.get(kodeBrg) || '',
          unit: d.unit || 'PCS',
          pesan,
          kirim,
          sisa,
          persen: pesan > 0 ? Math.min(100, Math.round((kirim / pesan) * 100)) : 0,
          harga,
          total_item: totalItem,
          nilai_so: Number(parent.nilai_so || 0),
          lokasi_stock: parent.lokasi_stock || '01 - OFFICE',
          so_close: isClosed ? 'Closed' : 'Not Yet',
        };
      });
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
        const [lokasis, barangs, merks, customers] = await Promise.all([
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_merks', { orderBy: 'merk', asc: true }).catch(() => []),
          erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
        ]);
        if (!active) return;

        setLokasiOptions(
          lokasis
            .filter((l) => l.is_active !== false)
            .map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim())
        );

        const catalog = barangs
          .filter((b) => b.is_active !== false)
          .map((b) => ({
            kode: String(b.kode || ''),
            nama: String(b.nama_barang || ''),
            unit: String(b.unit || 'PCS'),
            merk: String(b.merk || ''),
          }));
        setBarangCatalog(catalog);

        const merkList = Array.from(
          new Set([
            ...merks.filter((m) => m.is_active !== false).map((m) => String(m.merk || m.nama_merk || '').trim()),
            ...catalog.map((b) => b.merk.trim()),
          ])
        ).filter(Boolean);
        setMerkOptions(merkList);

        setCustomerCatalog(
          customers
            .filter((c) => c.is_active !== false)
            .map((c) => String(c.nama_customer || ''))
            .filter(Boolean)
        );

        const rawPreset = localStorage.getItem('withcoder_preset_so_detail');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.lokasiStock) setLokasiStock(v.lokasiStock);
          if (v.bentukLaporan) setBentukLaporan(v.bentukLaporan);
        }

        await loadLiveRows(catalog);
      } catch {
        // ignore non-critical load error
      } finally {
        if (active) setIsBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const match = barangCatalog.find(
      (b) => b.kode.toLowerCase() === kodeBarang.trim().toLowerCase()
    );
    if (match) {
      setNamaBarangDesc(match.nama);
    }
  }, [kodeBarang, barangCatalog]);

  if (!isOpen) return null;

  const startIso = toIsoDate(tglStart);
  const endIso = toIsoDate(tglEnd);

  const filteredDetailRows = tableRows.filter((r) => {
    if (startIso && r.tanggalIso && r.tanggalIso < startIso) return false;
    if (endIso && r.tanggalIso && r.tanggalIso > endIso) return false;
    if (lokasiStock !== 'ALL' && r.lokasi_stock && r.lokasi_stock !== lokasiStock) return false;

    if (filterType === 'merk' && merkFilter.trim()) {
      if (!r.merk_barang.toLowerCase().includes(merkFilter.trim().toLowerCase())) return false;
    }
    if (filterType === 'batasan_kode' && kodeBarang.trim()) {
      const k = kodeBarang.trim().toLowerCase();
      if (
        !r.kode_barang.toLowerCase().includes(k) &&
        !r.nama_barang.toLowerCase().includes((namaBarangDesc || k).toLowerCase())
      ) {
        return false;
      }
    }
    if (filterType === 'customer' && customerFilter.trim()) {
      if (!r.customer.toLowerCase().includes(customerFilter.trim().toLowerCase())) return false;
    }

    if (searchTerm.trim()) {
      if (searchField === 'Kode') return matchesMultiKeyword([r.no_so, r.kode_barang], searchTerm);
      if (searchField === 'No.SO') return matchesMultiKeyword([r.no_so], searchTerm);
      if (searchField === 'Customer') return matchesMultiKeyword([r.customer], searchTerm);
      if (searchField === 'Kode Barang') return matchesMultiKeyword([r.kode_barang], searchTerm);
      if (searchField === 'Nama Barang') return matchesMultiKeyword([r.nama_barang], searchTerm);
      if (searchField === 'No.PO') return matchesMultiKeyword([r.no_po], searchTerm);
      return matchesMultiKeyword(
        [
          r.no_so,
          r.tanggal,
          r.customer,
          r.no_po,
          r.kode_barang,
          r.nama_barang,
          r.merk_barang,
          r.unit,
          r.lokasi_stock,
          r.so_close,
        ],
        searchTerm
      );
    }
    return true;
  });

  const buildReportRowsForMode = (rows: SoDetailGridRow[], mode: string): any[] => {
    if (mode.startsWith('01')) {
      return rows;
    }

    if (mode.startsWith('02')) {
      // 02 - Sales Order Rekap (grouped per No.SO)
      const grouped = new Map<string, any>();
      for (const r of rows) {
        const key = r.no_so || r.id;
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            no_so: r.no_so,
            tanggal: r.tanggal,
            customer: r.customer,
            sales: r.sales || '-',
            no_po: r.no_po || '-',
            jml_item: 0,
            pesan: 0,
            kirim: 0,
            sisa: 0,
            nilai: r.nilai_so || 0,
            calc_total: 0,
            so_close: r.so_close,
          });
        }
        const g = grouped.get(key);
        g.jml_item += 1;
        g.pesan += r.pesan;
        g.kirim += r.kirim;
        g.sisa += r.sisa;
        g.calc_total += r.total_item;
        if (r.so_close !== 'Closed') g.so_close = 'Not Yet';
      }
      return Array.from(grouped.values()).map((g) => ({
        ...g,
        nilai: g.nilai > 0 ? g.nilai : g.calc_total,
        persen: g.pesan > 0 ? Math.min(100, Math.round((g.kirim / g.pesan) * 100)) : 0,
        so_close: g.sisa === 0 && g.pesan > 0 ? 'Closed' : g.so_close,
      }));
    }

    // 03 - Sales Order by Customer
    const byCust = new Map<string, any>();
    for (const r of rows) {
      const cust = r.customer || '(TANPA CUSTOMER)';
      if (!byCust.has(cust)) {
        byCust.set(cust, {
          id: cust,
          customer: cust,
          soSet: new Set<string>(),
          soNilaiMap: new Map<string, number>(),
          jml_item: 0,
          pesan: 0,
          kirim: 0,
          sisa: 0,
          calc_total: 0,
        });
      }
      const g = byCust.get(cust);
      if (r.no_so) {
        g.soSet.add(r.no_so);
        if (r.nilai_so > 0) g.soNilaiMap.set(r.no_so, r.nilai_so);
      }
      g.jml_item += 1;
      g.pesan += r.pesan;
      g.kirim += r.kirim;
      g.sisa += r.sisa;
      g.calc_total += r.total_item;
    }
    return Array.from(byCust.values())
      .map((g) => {
        const nilaiValues = Array.from(g.soNilaiMap.values()) as number[];
        const nilaiFromHeaders = nilaiValues.reduce(
          (a: number, b: number) => a + Number(b || 0),
          0
        );
        return {
          id: g.id,
          customer: g.customer,
          jml_so: g.soSet.size,
          jml_item: g.jml_item,
          pesan: g.pesan,
          kirim: g.kirim,
          sisa: g.sisa,
          persen: g.pesan > 0 ? Math.min(100, Math.round((g.kirim / g.pesan) * 100)) : 0,
          nilai: nilaiFromHeaders > 0 ? nilaiFromHeaders : g.calc_total,
        };
      })
      .sort((a, b) => b.nilai - a.nilai);
  };

  const activeModeRows = buildReportRowsForMode(filteredDetailRows, bentukLaporan);
  const selectedTableRow =
    filteredDetailRows.find((r) => r.id === selectedId) ||
    tableRows.find((r) => r.id === selectedId) ||
    null;

  const handleSimpanFilter = async () => {
    try {
      setIsBusy(true);
      localStorage.setItem(
        'withcoder_preset_so_detail',
        JSON.stringify({ lokasiStock, bentukLaporan })
      );
      await syncAppSettings({
        periode_start: toIsoDate(tglStart),
        periode_end: toIsoDate(tglEnd),
        lokasi_aktif: lokasiStock !== 'ALL' ? lokasiStock : undefined,
      });
      showFeedback('Preset filter Laporan Sales Order tersimpan');
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
    setKodeBarang('');
    setNamaBarangDesc('');
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

  const handlePreview = async () => {
    try {
      setIsBusy(true);
      await loadLiveRows();
      setPrintScopeOnOpen('all');
      setPreviewRows(activeModeRows);
      setIsPrintOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal memuat laporan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrintSelected = async () => {
    if (!selectedTableRow) {
      showFeedback('Pilih baris item Sales Order yang akan dicetak terlebih dahulu');
      return;
    }
    setPrintScopeOnOpen('selected');
    setPreviewRows(activeModeRows);
    setIsPrintOpen(true);
  };

  const getColumnsForMode = (mode: string): PrintColumn<any>[] => {
    if (mode.startsWith('01')) {
      return [
        { header: 'No.SO', accessor: 'no_so', width: '90px' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '72px' },
        { header: 'Customer', accessor: 'customer' },
        { header: 'Kode Brg', accessor: 'kode_barang', width: '75px' },
        { header: 'Nama Barang', accessor: 'nama_barang' },
        { header: 'Merk', accessor: 'merk_barang', width: '65px' },
        { header: 'Unit', accessor: 'unit', align: 'center', width: '42px' },
        { header: 'Pesan', accessor: (r) => formatMoney(r.pesan), align: 'right', width: '48px' },
        { header: 'Kirim', accessor: (r) => formatMoney(r.kirim), align: 'right', width: '48px' },
        { header: 'Sisa', accessor: (r) => formatMoney(r.sisa), align: 'right', width: '48px' },
        { header: 'Total', accessor: (r) => formatMoney(r.total_item), align: 'right', width: '85px' },
        { header: 'Status', accessor: 'so_close', align: 'center', width: '55px' },
      ];
    }
    if (mode.startsWith('02')) {
      return [
        { header: 'No.SO', accessor: 'no_so', width: '100px' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '78px' },
        { header: 'Customer', accessor: 'customer' },
        { header: 'Sales', accessor: 'sales', align: 'center', width: '70px' },
        { header: 'No.PO', accessor: 'no_po', width: '85px' },
        { header: 'Item', accessor: 'jml_item', align: 'right', width: '42px' },
        { header: 'Pesan', accessor: (r) => formatMoney(r.pesan), align: 'right', width: '55px' },
        { header: 'Kirim', accessor: (r) => formatMoney(r.kirim), align: 'right', width: '55px' },
        { header: 'Sisa', accessor: (r) => formatMoney(r.sisa), align: 'right', width: '55px' },
        { header: '% Kirim', accessor: (r) => `${r.persen}%`, align: 'right', width: '55px' },
        { header: 'Nilai SO', accessor: (r) => formatMoney(r.nilai), align: 'right', width: '95px' },
        { header: 'Status', accessor: 'so_close', align: 'center', width: '62px' },
      ];
    }
    return [
      { header: 'Nama Customer', accessor: 'customer' },
      { header: 'Jml SO', accessor: 'jml_so', align: 'right', width: '65px' },
      { header: 'Jml Item', accessor: 'jml_item', align: 'right', width: '65px' },
      { header: 'Total Pesan', accessor: (r) => formatMoney(r.pesan), align: 'right', width: '80px' },
      { header: 'Total Kirim', accessor: (r) => formatMoney(r.kirim), align: 'right', width: '80px' },
      { header: 'Total Sisa', accessor: (r) => formatMoney(r.sisa), align: 'right', width: '80px' },
      { header: '% Terpenuhi', accessor: (r) => `${r.persen}%`, align: 'right', width: '80px' },
      { header: 'Total Nilai SO', accessor: (r) => formatMoney(r.nilai), align: 'right', width: '115px' },
    ];
  };

  const handleExportExcel = async () => {
    try {
      setIsBusy(true);
      const company = await fetchActiveCompanyProfile();
      const cols = getColumnsForMode(bentukLaporan);
      exportToExcel({
        fileName: 'Laporan_Sales_Order',
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
      showFeedback('Export Excel Laporan SO selesai');
    } catch (err: any) {
      showFeedback(`Gagal export: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const printColumns = getColumnsForMode(bentukLaporan);
  const rowsToSummarize = previewRows.length > 0 ? previewRows : activeModeRows;
  const totalPesan = rowsToSummarize.reduce((a, r) => a + Number(r.pesan || 0), 0);
  const totalKirim = rowsToSummarize.reduce((a, r) => a + Number(r.kirim || 0), 0);
  const totalSisa = rowsToSummarize.reduce((a, r) => a + Number(r.sisa || 0), 0);
  const totalNilai = rowsToSummarize.reduce(
    (a, r) => a + Number(r.nilai ?? r.total_item ?? 0),
    0
  );

  const filterSummaryText =
    filterType === 'merk'
      ? `Merk: ${merkFilter || 'Semua'}`
      : filterType === 'batasan_kode'
      ? `Barang: ${kodeBarang || 'Semua'}`
      : filterType === 'customer'
      ? `Customer: ${customerFilter || 'Semua'}`
      : 'ALL Berdasarkan Periode';

  return (
    <div
      id="sales-order-detail-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Laporan Sales Order"
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
              LAPORAN SALES ORDER (DETAIL / REKAP / CUSTOMER)
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
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[148px] shrink-0">
                  <input
                    type="radio"
                    name="so_detail_filter"
                    checked={filterType === 'merk'}
                    onChange={() => setFilterType('merk')}
                    className="cursor-pointer"
                  />
                  <span>Merk Barang</span>
                </label>
                <input
                  type="text"
                  list="so-detail-merk-list"
                  value={merkFilter}
                  onChange={(e) => setMerkFilter(e.target.value.toUpperCase())}
                  disabled={filterType !== 'merk'}
                  placeholder="Pilih / ketik merk barang..."
                  className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] uppercase outline-none disabled:bg-[#ECE9D8]"
                />
                <datalist id="so-detail-merk-list">
                  {merkOptions.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[148px] shrink-0">
                  <input
                    type="radio"
                    name="so_detail_filter"
                    checked={filterType === 'batasan_kode'}
                    onChange={() => setFilterType('batasan_kode')}
                    className="cursor-pointer"
                  />
                  <span>Batasan kode Barang</span>
                </label>

                <div className="flex items-center space-x-1 flex-1">
                  <input
                    type="text"
                    list="so-detail-barang-list"
                    value={kodeBarang}
                    onChange={(e) => setKodeBarang(e.target.value.toUpperCase())}
                    disabled={filterType !== 'batasan_kode'}
                    className="w-[106px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8] shrink-0"
                  />
                  <datalist id="so-detail-barang-list">
                    {barangCatalog.map((b) => (
                      <option key={b.kode} value={b.kode}>
                        {b.nama}
                      </option>
                    ))}
                  </datalist>
                  <input
                    type="text"
                    value={namaBarangDesc}
                    onChange={(e) => setNamaBarangDesc(e.target.value)}
                    disabled={filterType !== 'batasan_kode'}
                    className="flex-1 h-[21px] bg-[#FFFFBF] border border-[#7A7A7A] px-2 text-[11px] outline-none shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[148px] shrink-0">
                  <input
                    type="radio"
                    name="so_detail_filter"
                    checked={filterType === 'customer'}
                    onChange={() => setFilterType('customer')}
                    className="cursor-pointer"
                  />
                  <span>Customer</span>
                </label>
                <input
                  type="text"
                  list="so-detail-customer-list"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  disabled={filterType !== 'customer'}
                  placeholder="Pilih / ketik nama customer..."
                  className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] outline-none disabled:bg-[#ECE9D8]"
                />
                <datalist id="so-detail-customer-list">
                  {customerCatalog.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                <input
                  type="radio"
                  name="so_detail_filter"
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
                    <option value="01 - Sales Order Detail">01 - Sales Order Detail</option>
                    <option value="02 - Sales Order Rekap">02 - Sales Order Rekap</option>
                    <option value="03 - Sales Order by Customer">03 - Sales Order by Customer</option>
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

        {/* Live Data Grid Panel (adapts to Bentuk Laporan 01 / 02 / 03) */}
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
                  { value: 'Kode', label: 'Kode (No.SO / Brg)' },
                  { value: 'No.SO', label: 'No.SO' },
                  { value: 'Customer', label: 'Customer' },
                  { value: 'Kode Barang', label: 'Kode Barang' },
                  { value: 'Nama Barang', label: 'Nama Barang' },
                  { value: 'No.PO', label: 'No.PO' },
                ]}
                inputRef={searchInputRef}
                isBusy={isBusy}
                placeholder="Cari No.SO, Kode/Nama Barang, Customer..."
              />
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-black">
              <span>
                Mode: <b>{bentukLaporan}</b> ({activeModeRows.length} baris)
              </span>
              <span>
                Pesan: <b>{formatMoney(totalPesan)}</b> | Kirim: <b>{formatMoney(totalKirim)}</b> | Sisa:{' '}
                <b>{formatMoney(totalSisa)}</b>
              </span>
            </div>
          </div>

          <div className="max-h-[260px] overflow-auto bg-white">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080]">
                {bentukLaporan.startsWith('01') ? (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.SO</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.PO</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Kode Brg</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Barang</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Merk</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Unit</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Pesan</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Kirim</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Sisa</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total</th>
                    <th className="px-2 py-1 text-center">Status</th>
                  </tr>
                ) : bentukLaporan.startsWith('02') ? (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.SO</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Sales</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.PO</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Item</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Pesan</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Kirim</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Sisa</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">% Kirim</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Nilai SO</th>
                    <th className="px-2 py-1 text-center">Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Jml SO</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Jml Item</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total Pesan</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total Kirim</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total Sisa</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">% Terpenuhi</th>
                    <th className="px-2 py-1 text-right">Total Nilai SO</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeModeRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-6 text-gray-500 italic">
                      Tidak ada data Sales Order sesuai filter yang dipilih.
                    </td>
                  </tr>
                ) : bentukLaporan.startsWith('01') ? (
                  activeModeRows.map((r: SoDetailGridRow) => {
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
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.no_so}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.tanggal}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.customer}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_po || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.kode_barang}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_barang}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.merk_barang || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.unit}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.pesan)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.kirim)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">{formatMoney(r.sisa)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.total_item)}</td>
                        <td className="px-2 py-1 text-center">{r.so_close}</td>
                      </tr>
                    );
                  })
                ) : bentukLaporan.startsWith('02') ? (
                  activeModeRows.map((r: any) => (
                    <tr key={r.id} className="border-b border-[#E0E0E0] hover:bg-[#EAF2FC]">
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.no_so}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.tanggal}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1">{r.customer}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.sales}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_po}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{r.jml_item}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.pesan)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.kirim)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">{formatMoney(r.sisa)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{r.persen}%</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">{formatMoney(r.nilai)}</td>
                      <td className="px-2 py-1 text-center">{r.so_close}</td>
                    </tr>
                  ))
                ) : (
                  activeModeRows.map((r: any) => (
                    <tr key={r.id} className="border-b border-[#E0E0E0] hover:bg-[#EAF2FC]">
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-semibold">{r.customer}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{r.jml_so}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{r.jml_item}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.pesan)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.kirim)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">{formatMoney(r.sisa)}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{r.persen}%</td>
                      <td className="px-2 py-1 text-right font-mono font-bold">{formatMoney(r.nilai)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SupabaseFindModal<SoDetailGridRow>
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Laporan Sales Order"
        rows={tableRows}
        columns={[
          { header: 'No.SO', accessor: (r) => r.no_so, mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal, align: 'center' },
          { header: 'Customer', accessor: (r) => r.customer },
          { header: 'No.PO', accessor: (r) => r.no_po || '-', mono: true },
          { header: 'Kode Brg', accessor: (r) => r.kode_barang, mono: true },
          { header: 'Nama Barang', accessor: (r) => r.nama_barang },
          { header: 'Merk', accessor: (r) => r.merk_barang || '-' },
          { header: 'Pesan', accessor: (r) => formatMoney(r.pesan), align: 'right', mono: true },
          { header: 'Sisa', accessor: (r) => formatMoney(r.sisa), align: 'right', mono: true, bold: true },
        ]}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.no_so,
          r.tanggal,
          r.customer,
          r.no_po,
          r.kode_barang,
          r.nama_barang,
          r.merk_barang,
          r.unit,
          r.lokasi_stock,
          r.so_close,
        ]}
        selectedId={selectedId}
        onSelectRow={(r) => {
          setSelectedId(r.id);
          showFeedback(`Sales Order Detail [${r.no_so} - ${r.kode_barang}] dipilih`);
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
        selectedRow={selectedTableRow}
        selectedTitle="CETAK DETAIL ITEM SALES ORDER"
        selectedSubtitle={
          selectedTableRow
            ? `No.SO: ${selectedTableRow.no_so} | Kode: ${selectedTableRow.kode_barang}`
            : undefined
        }
        selectedMetaLines={
          selectedTableRow
            ? [
                { label: 'No. Sales Order', value: selectedTableRow.no_so },
                { label: 'Tanggal', value: selectedTableRow.tanggal },
                { label: 'Customer', value: selectedTableRow.customer || '-' },
                { label: 'No. PO', value: selectedTableRow.no_po || '-' },
                { label: 'Lokasi Stock', value: selectedTableRow.lokasi_stock || '-' },
              ]
            : undefined
        }
        selectedColumns={[
          { header: 'No.SO', accessor: 'no_so', width: '95px' },
          { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '75px' },
          { header: 'Customer', accessor: 'customer' },
          { header: 'Kode Brg', accessor: 'kode_barang', width: '80px' },
          { header: 'Nama Barang', accessor: 'nama_barang' },
          { header: 'Merk', accessor: 'merk_barang', width: '70px' },
          { header: 'Unit', accessor: 'unit', align: 'center', width: '45px' },
          { header: 'Pesan', accessor: (r) => formatMoney(r.pesan), align: 'right', width: '55px' },
          { header: 'Kirim', accessor: (r) => formatMoney(r.kirim), align: 'right', width: '55px' },
          { header: 'Sisa', accessor: (r) => formatMoney(r.sisa), align: 'right', width: '55px' },
        ]}
        selectedSummaryItems={
          selectedTableRow
            ? [
                { label: 'Qty Pesan', value: formatMoney(selectedTableRow.pesan) },
                { label: 'Qty Kirim', value: formatMoney(selectedTableRow.kirim) },
                { label: 'Qty Sisa', value: formatMoney(selectedTableRow.sisa) },
              ]
            : undefined
        }
        metaLines={[
          { label: 'Periode Tanggal', value: `${tglStart} s/d ${tglEnd}` },
          { label: 'Lokasi Stock', value: lokasiStock },
          { label: 'Filter Laporan', value: filterSummaryText },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={printColumns}
        rows={activeModeRows}
        summaryItems={[
          { label: 'Total Baris', value: `${activeModeRows.length} Baris` },
          { label: 'Total Qty Pesan', value: formatMoney(totalPesan) },
          { label: 'Total Qty Kirim', value: formatMoney(totalKirim) },
          { label: 'Total Qty Sisa', value: formatMoney(totalSisa) },
          { label: 'Total Nilai', value: formatRupiah(totalNilai) },
        ]}
      />
    </div>
  );
};
