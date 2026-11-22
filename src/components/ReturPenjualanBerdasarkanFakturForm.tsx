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

interface ReturPenjualanBerdasarkanFakturFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReturPenjualanBerdasarkanFakturForm: React.FC<
  ReturPenjualanBerdasarkanFakturFormProps
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
  const [filterType, setFilterType] = useState<'merk' | 'no_bukti' | 'customer' | 'all_periode'>(
    'all_periode'
  );
  const [merkFilter, setMerkFilter] = useState<string>('');
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

    const viewRows = await erpList<any>('v_laporan_retur_penjualan', {
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
          id: `${r.retur_id || r.no_bukti}-${kode || idx}`,
          retur_id: r.retur_id,
          no_bukti: r.no_bukti || '',
          tanggal_iso: tglIso,
          tanggal_display: toDisplayDMyShort(tglIso) || '-',
          nama_customer: r.nama_customer || '',
          no_faktur: r.no_faktur || '-',
          lokasi_stock: r.lokasi_stock || '01 - OFFICE',
          disc_num: Number(r.disc || 0),
          ppn_num: Number(r.ppn ?? 11),
          disc: `${Number(r.disc || 0)}%`,
          ppn: `${Number(r.ppn ?? 11)}%`,
          nilai_retur: Number(r.nilai_retur || 0),
          sts_post: r.sts_post || 'Posting',
          keterangan: r.keterangan || '',
          kode,
          nama_barang: r.nama_barang || '',
          merk_barang: merkMap.get(kode) || '',
          unit: r.unit || 'PCS',
          qty: Number(r.qty || 0),
          harga: Number(r.harga || 0),
          total_item: Number(r.total || 0),
          alasan: r.alasan || '',
        };
      });
    } else {
      const [headers, details] = await Promise.all([
        erpList<any>('retur_penjualans', { orderBy: 'tanggal', asc: false, limit: 1500 }),
        erpList<any>('retur_penjualan_details', { limit: 4000 }).catch(() => []),
      ]);
      const detailsByReturId = new Map<string, any[]>();
      for (const d of details) {
        const rid = String(d.retur_id || '');
        if (!rid) continue;
        const arr = detailsByReturId.get(rid) || [];
        arr.push(d);
        detailsByReturId.set(rid, arr);
      }

      for (const h of headers) {
        const tglIso = toIsoDate(h.tanggal) || '';
        const baseHeader = {
          retur_id: h.id,
          no_bukti: h.no_bukti || '',
          tanggal_iso: tglIso,
          tanggal_display: toDisplayDMyShort(tglIso) || '-',
          nama_customer: h.nama_customer || '',
          no_faktur: h.no_faktur || '-',
          lokasi_stock: h.lokasi_stock || '01 - OFFICE',
          disc_num: Number(h.disc || 0),
          ppn_num: Number(h.ppn ?? 11),
          disc: `${Number(h.disc || 0)}%`,
          ppn: `${Number(h.ppn ?? 11)}%`,
          nilai_retur: Number(h.nilai_retur || 0),
          sts_post: h.sts_post || 'Posting',
          keterangan: h.keterangan || '',
        };
        const dets = detailsByReturId.get(String(h.id)) || [];
        if (dets.length === 0) {
          mapped.push({
            ...baseHeader,
            id: `${h.id}-hdr`,
            kode: '',
            nama_barang: h.keterangan || 'RETUR PENJUALAN',
            merk_barang: '',
            unit: '-',
            qty: 0,
            harga: 0,
            total_item: Number(h.nilai_retur || 0),
            alasan: h.keterangan || '',
          });
        } else {
          for (const d of dets) {
            const kode = String(d.kode || '').trim().toUpperCase();
            mapped.push({
              ...baseHeader,
              id: String(d.id),
              kode,
              nama_barang: d.nama_barang || '',
              merk_barang: merkMap.get(kode) || '',
              unit: d.unit || 'PCS',
              qty: Number(d.qty || 0),
              harga: Number(d.harga || 0),
              total_item: Number(d.total || Number(d.qty || 0) * Number(d.harga || 0)),
              alasan: d.alasan || '',
            });
          }
        }
      }
    }

    setTableRows(mapped);
    setReturCatalog(Array.from(new Set(mapped.map((m) => m.no_bukti).filter(Boolean))));
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
        const [lokasis, customers, merks, barangs] = await Promise.all([
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
          erpList<any>('master_merks', { orderBy: 'merk', asc: true }).catch(() => []),
          erpList<any>('master_barangs', { limit: 2000 }).catch(() => []),
        ]);
        if (!active) return;

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
        setMerkOptions(
          Array.from(
            new Set([
              ...merks
                .filter((m) => m.is_active !== false)
                .map((m) => String(m.merk || m.nama_merk || '').trim()),
              ...Array.from(merkMap.values()),
            ])
          ).filter(Boolean)
        );

        const rawPreset = localStorage.getItem('withcoder_preset_retur_penjualan_faktur');
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

  if (!isOpen) return null;

  const startIso = toIsoDate(tglStart);
  const endIso = toIsoDate(tglEnd);

  const filteredDetailRows = tableRows.filter((r) => {
    if (startIso && r.tanggal_iso && r.tanggal_iso < startIso) return false;
    if (endIso && r.tanggal_iso && r.tanggal_iso > endIso) return false;
    if (lokasiStock !== 'ALL' && r.lokasi_stock && r.lokasi_stock !== lokasiStock) return false;

    if (filterType === 'merk' && merkFilter.trim()) {
      if (!String(r.merk_barang || '').toLowerCase().includes(merkFilter.trim().toLowerCase())) {
        return false;
      }
    }
    if (filterType === 'no_bukti') {
      const nb = r.no_bukti.toUpperCase();
      if (noBuktiStart.trim() && nb < noBuktiStart.trim().toUpperCase()) return false;
      if (noBuktiEnd.trim() && nb > noBuktiEnd.trim().toUpperCase()) return false;
    }
    if (filterType === 'customer' && customerFilter.trim()) {
      if (!r.nama_customer.toLowerCase().includes(customerFilter.trim().toLowerCase())) return false;
    }

    if (searchTerm.trim()) {
      if (searchField === 'Kode' || searchField === 'No.Bukti') {
        return matchesMultiKeyword([r.no_bukti], searchTerm);
      }
      if (searchField === 'Customer') return matchesMultiKeyword([r.nama_customer], searchTerm);
      if (searchField === 'No.Faktur') return matchesMultiKeyword([r.no_faktur], searchTerm);
      if (searchField === 'Keterangan') return matchesMultiKeyword([r.keterangan, r.alasan], searchTerm);
      return matchesMultiKeyword(
        [
          r.no_bukti,
          r.tanggal_display,
          r.nama_customer,
          r.no_faktur,
          r.kode,
          r.nama_barang,
          r.merk_barang,
          r.alasan,
          r.sts_post,
          r.keterangan,
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

    // Deduplicate header documents first so nilai_retur isn't summed multiple times across items
    const returDocMap = new Map<string, any>();
    for (const r of rows) {
      const key = r.no_bukti || r.retur_id || r.id;
      if (!returDocMap.has(key)) {
        returDocMap.set(key, {
          id: key,
          no_bukti: r.no_bukti,
          tanggal_display: r.tanggal_display,
          nama_customer: r.nama_customer,
          no_faktur: r.no_faktur || '-',
          disc: r.disc,
          ppn: r.ppn,
          nilai_retur: r.nilai_retur,
          sts_post: r.sts_post,
          keterangan: r.keterangan,
          jml_item: 0,
          total_qty: 0,
        });
      }
      const doc = returDocMap.get(key);
      if (r.kode) doc.jml_item += 1;
      doc.total_qty += Number(r.qty || 0);
    }
    const rekapDocs = Array.from(returDocMap.values());

    if (mode.startsWith('03')) {
      return rekapDocs;
    }

    // 02 - Retur Penjualan per Customer
    const byCust = new Map<string, any>();
    for (const doc of rekapDocs) {
      const cust = doc.nama_customer || '(TANPA CUSTOMER)';
      if (!byCust.has(cust)) {
        byCust.set(cust, {
          id: cust,
          nama_customer: cust,
          jml_retur: 0,
          jml_item: 0,
          total_qty: 0,
          nilai_retur: 0,
        });
      }
      const g = byCust.get(cust);
      g.jml_retur += 1;
      g.jml_item += doc.jml_item;
      g.total_qty += doc.total_qty;
      g.nilai_retur += doc.nilai_retur;
    }
    return Array.from(byCust.values()).sort((a, b) => b.nilai_retur - a.nilai_retur);
  };

  const activeModeRows = buildModeRows(filteredDetailRows, bentukLaporan);
  const selectedTableRow =
    filteredDetailRows.find((r) => r.id === selectedId) ||
    tableRows.find((r) => r.id === selectedId) ||
    null;

  const selectedReturPrintRow = selectedTableRow
    ? { ...selectedTableRow, tanggal: selectedTableRow.tanggal_display }
    : null;

  const handleSimpanFilter = async () => {
    try {
      setIsBusy(true);
      localStorage.setItem(
        'withcoder_preset_retur_penjualan_faktur',
        JSON.stringify({ lokasiStock, bentukLaporan })
      );
      await syncAppSettings({
        periode_start: toIsoDate(tglStart),
        periode_end: toIsoDate(tglEnd),
        lokasi_aktif: lokasiStock !== 'ALL' ? lokasiStock : undefined,
      });
      showFeedback('Preset filter Laporan Retur Penjualan tersimpan');
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
    setNoBuktiStart('');
    setNoBuktiEnd('');
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
        { header: 'No.Bukti Retur', accessor: 'no_bukti', width: '98px' },
        { header: 'Tanggal', accessor: 'tanggal_display', align: 'center', width: '72px' },
        { header: 'Nama Customer', accessor: 'nama_customer' },
        { header: 'No.Faktur Ref', accessor: 'no_faktur', width: '92px' },
        { header: 'Kode Brg', accessor: 'kode', width: '72px' },
        { header: 'Nama Barang', accessor: 'nama_barang' },
        { header: 'Unit', accessor: 'unit', align: 'center', width: '42px' },
        { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', width: '46px' },
        { header: 'Harga', accessor: (r) => formatMoney(r.harga), align: 'right', width: '74px' },
        { header: 'Total Item', accessor: (r) => formatMoney(r.total_item), align: 'right', width: '82px' },
        { header: 'Alasan', accessor: 'alasan', width: '80px' },
      ];
    }
    if (mode.startsWith('02')) {
      return [
        { header: 'Nama Customer', accessor: 'nama_customer' },
        { header: 'Jml Dokumen Retur', accessor: 'jml_retur', align: 'right', width: '95px' },
        { header: 'Jml Item', accessor: 'jml_item', align: 'right', width: '75px' },
        { header: 'Total Qty Retur', accessor: (r) => formatMoney(r.total_qty), align: 'right', width: '95px' },
        { header: 'Total Nilai Retur', accessor: (r) => formatMoney(r.nilai_retur), align: 'right', width: '125px' },
      ];
    }
    return [
      { header: 'No.Bukti Retur', accessor: 'no_bukti', width: '108px' },
      { header: 'Tanggal', accessor: 'tanggal_display', align: 'center', width: '78px' },
      { header: 'Nama Customer', accessor: 'nama_customer' },
      { header: 'No.Faktur Ref', accessor: 'no_faktur', width: '100px' },
      { header: 'Item', accessor: 'jml_item', align: 'right', width: '45px' },
      { header: 'Disc', accessor: 'disc', align: 'center', width: '48px' },
      { header: 'PPN', accessor: 'ppn', align: 'center', width: '48px' },
      { header: 'Nilai Retur', accessor: (r) => formatMoney(r.nilai_retur), align: 'right', width: '100px' },
      { header: 'Status', accessor: 'sts_post', align: 'center', width: '64px' },
      { header: 'Keterangan', accessor: 'keterangan' },
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
      showFeedback('Pilih baris Retur Penjualan yang akan dicetak terlebih dahulu');
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
        fileName: 'Laporan_Retur_Penjualan',
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
      showFeedback('Export Excel Retur Penjualan selesai');
    } catch (err: any) {
      showFeedback(`Gagal export: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const rekapDocs = buildModeRows(filteredDetailRows, '03');
  const totalRetur = rekapDocs.reduce((a, r) => a + Number(r.nilai_retur || 0), 0);
  const totalQtyRetur = filteredDetailRows.reduce((a, r) => a + Number(r.qty || 0), 0);
  const printColumns = getColumnsForMode(bentukLaporan);

  return (
    <div
      id="retur-penjualan-faktur-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Laporan Retur Penjualan Barang"
        onClose={onClose}
        onFind={handleFind}
        onPrint={handlePreview}
        onTableView={() => loadLiveRows()}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3 space-y-2.5">
        <div className="max-w-[660px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-3 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[13px] tracking-wide text-black font-sans">
              LAPORAN RETUR PENJUALAN BERDASARKAN FAKTUR
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
                <label className="flex items-center space-x-2 text-[11px] text-black font-semibold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="retur_filter_type"
                    checked={filterType === 'merk'}
                    onChange={() => setFilterType('merk')}
                    className="cursor-pointer"
                  />
                  <span>Merk Barang</span>
                </label>
                <input
                  type="text"
                  list="retur-merk-list"
                  value={merkFilter}
                  onChange={(e) => setMerkFilter(e.target.value.toUpperCase())}
                  disabled={filterType !== 'merk'}
                  placeholder="Pilih / ketik merk barang..."
                  className="flex-1 bg-white border border-[#7A7A7A] px-2 py-0.5 text-[11px] uppercase outline-none disabled:bg-[#ECE9D8]"
                />
                <datalist id="retur-merk-list">
                  {merkOptions.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-semibold cursor-pointer whitespace-nowrap w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="retur_filter_type"
                    checked={filterType === 'no_bukti'}
                    onChange={() => setFilterType('no_bukti')}
                    className="cursor-pointer"
                  />
                  <span>Batasan No. Bukti</span>
                </label>

                <div className="flex items-center space-x-1 flex-1">
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
                <label className="flex items-center space-x-2 text-[11px] text-black cursor-pointer font-semibold w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="retur_filter_type"
                    checked={filterType === 'customer'}
                    onChange={() => setFilterType('customer')}
                    className="cursor-pointer"
                  />
                  <span>Customer</span>
                </label>
                <input
                  type="text"
                  list="retur-cust-list"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  disabled={filterType !== 'customer'}
                  placeholder="Pilih / ketik customer..."
                  className="flex-1 bg-white border border-[#7A7A7A] px-2 py-0.5 text-[11px] outline-none disabled:bg-[#ECE9D8]"
                />
                <datalist id="retur-cust-list">
                  {customerCatalog.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
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
                    <option value="01 - Retur Penjualan Barang">01 - Retur Penjualan Barang (Detail Item)</option>
                    <option value="02 - Retur Penjualan per Customer">02 - Retur Penjualan per Customer</option>
                    <option value="03 - Rekap Retur Penjualan">03 - Rekap Dokumen Retur Penjualan</option>
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
                  { value: 'No.Faktur', label: 'No.Faktur' },
                  { value: 'Keterangan', label: 'Keterangan / Alasan' },
                ]}
                inputRef={searchInputRef}
                isBusy={isBusy}
                placeholder="Cari No.Bukti Retur, Customer, Barang, No.Faktur..."
              />
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-black">
              <span>
                Mode: <b>{bentukLaporan}</b> ({activeModeRows.length} baris)
              </span>
              <span>
                Qty: <b>{formatMoney(totalQtyRetur)}</b> | Nilai Retur: <b>{formatRupiah(totalRetur)}</b>
              </span>
            </div>
          </div>

          <div className="max-h-[260px] overflow-auto bg-white">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080]">
                {bentukLaporan.startsWith('01') ? (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Bukti Retur</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Faktur Ref</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Kode Brg</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Barang</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Merk</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Unit</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Qty</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Harga</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total Item</th>
                    <th className="px-2 py-1 text-left">Alasan</th>
                  </tr>
                ) : bentukLaporan.startsWith('02') ? (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Jml Dokumen Retur</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Jml Item</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Total Qty Retur</th>
                    <th className="px-2 py-1 text-right">Total Nilai Retur</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Bukti Retur</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Customer</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.Faktur Ref</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Item</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Disc</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">PPN</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-right">Nilai Retur</th>
                    <th className="border-r border-[#ACA899] px-2 py-1 text-center">Status</th>
                    <th className="px-2 py-1 text-left">Keterangan</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeModeRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-6 text-gray-500 italic">
                      Tidak ada data Retur Penjualan sesuai filter yang dipilih.
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
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_faktur}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.kode || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_barang}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1">{r.merk_barang || '-'}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.unit}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.qty)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.harga)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">
                          {formatMoney(r.total_item)}
                        </td>
                        <td className="px-2 py-1">{r.alasan || r.keterangan || '-'}</td>
                      </tr>
                    );
                  })
                ) : bentukLaporan.startsWith('02') ? (
                  activeModeRows.map((r) => (
                    <tr key={r.id} className="border-b border-[#E0E0E0] hover:bg-[#EAF2FC]">
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-semibold">{r.nama_customer}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{r.jml_retur}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{r.jml_item}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.total_qty)}</td>
                      <td className="px-2 py-1 text-right font-mono font-bold">{formatMoney(r.nilai_retur)}</td>
                    </tr>
                  ))
                ) : (
                  activeModeRows.map((r) => (
                    <tr key={r.id} className="border-b border-[#E0E0E0] hover:bg-[#EAF2FC]">
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono font-bold">{r.no_bukti}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.tanggal_display}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1">{r.nama_customer}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 font-mono">{r.no_faktur}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{r.jml_item}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.disc}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.ppn}</td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono font-bold">
                        {formatMoney(r.nilai_retur)}
                      </td>
                      <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.sts_post}</td>
                      <td className="px-2 py-1">{r.keterangan}</td>
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
        tableLabel="Laporan Retur Penjualan"
        rows={tableRows}
        columns={[
          { header: 'No.Bukti', accessor: (r) => r.no_bukti, mono: true, bold: true },
          { header: 'Tanggal', accessor: (r) => r.tanggal_display, align: 'center' },
          { header: 'Customer', accessor: (r) => r.nama_customer },
          { header: 'No.Faktur Ref', accessor: (r) => r.no_faktur || '-', mono: true },
          { header: 'Kode Brg', accessor: (r) => r.kode || '-', mono: true },
          { header: 'Nama Barang', accessor: (r) => r.nama_barang },
          { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', mono: true },
          { header: 'Nilai Retur', accessor: (r) => formatMoney(r.nilai_retur), align: 'right', mono: true, bold: true },
          { header: 'Status', accessor: (r) => r.sts_post, align: 'center' },
        ]}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [
          r.no_bukti,
          r.tanggal_display,
          r.nama_customer,
          r.no_faktur,
          r.kode,
          r.nama_barang,
          r.merk_barang,
          r.lokasi_stock,
          r.sts_post,
          r.keterangan,
        ]}
        selectedId={selectedId}
        onSelectRow={(r) => {
          setSelectedId(r.id);
          showFeedback(`Retur Penjualan [${r.no_bukti}] dipilih`);
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
        selectedRow={selectedReturPrintRow}
        selectedTitle="CETAK ITEM RETUR PENJUALAN TERPILIH"
        selectedSubtitle={
          selectedReturPrintRow
            ? `No.Bukti: ${selectedReturPrintRow.no_bukti} | Customer: ${selectedReturPrintRow.nama_customer}`
            : undefined
        }
        selectedMetaLines={
          selectedReturPrintRow
            ? [
                { label: 'No.Bukti Retur', value: selectedReturPrintRow.no_bukti },
                { label: 'Tanggal', value: selectedReturPrintRow.tanggal },
                { label: 'Customer', value: selectedReturPrintRow.nama_customer },
                { label: 'No.Faktur Ref', value: selectedReturPrintRow.no_faktur || '-' },
                { label: 'Lokasi Stock', value: selectedReturPrintRow.lokasi_stock },
              ]
            : undefined
        }
        selectedColumns={[
          { header: 'No.Bukti', accessor: 'no_bukti', width: '95px' },
          { header: 'Kode Brg', accessor: 'kode', width: '80px' },
          { header: 'Nama Barang', accessor: 'nama_barang' },
          { header: 'Unit', accessor: 'unit', align: 'center', width: '48px' },
          { header: 'Qty', accessor: (r) => formatMoney(r.qty), align: 'right', width: '50px' },
          { header: 'Harga', accessor: (r) => formatMoney(r.harga), align: 'right', width: '80px' },
          { header: 'Total Item', accessor: (r) => formatMoney(r.total_item), align: 'right', width: '90px' },
          { header: 'Alasan', accessor: 'alasan', width: '95px' },
        ]}
        selectedSummaryItems={
          selectedReturPrintRow
            ? [
                { label: 'Disc', value: selectedReturPrintRow.disc },
                { label: 'PPN', value: selectedReturPrintRow.ppn },
                { label: 'Nilai Retur', value: formatRupiah(selectedReturPrintRow.nilai_retur) },
                { label: 'Status', value: selectedReturPrintRow.sts_post },
              ]
            : undefined
        }
        metaLines={[
          { label: 'Periode Tanggal', value: `${tglStart} s/d ${tglEnd}` },
          { label: 'Lokasi Stock', value: lokasiStock },
          {
            label: 'Batasan Filter',
            value:
              filterType === 'merk'
                ? `Merk: ${merkFilter || 'Semua'}`
                : filterType === 'no_bukti'
                ? `${noBuktiStart || 'Awal'} s/d ${noBuktiEnd || 'Akhir'}`
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
          { label: 'Total Qty Retur', value: formatMoney(totalQtyRetur) },
          { label: 'Total Nilai Retur', value: formatRupiah(totalRetur) },
        ]}
      />
    </div>
  );
};
