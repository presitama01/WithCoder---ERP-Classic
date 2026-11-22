import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  toDisplayDmy,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface MutasiSoItem {
  id: string;
  soId: string | null;
  noSo: string;
  noPo: string;
  noSq: string;
  customer: string;
  sales: string;
  lokasiStock: string;
  tanggalIso: string;
  tanggalDisplay: string;
  soClose: string;
  kodeBarang: string;
  namaBarang: string;
  unit: string;
  pesan: number;
  kirim: number;
  sisa: number;
  persenTerpenuhi: number;
  statusMutasi: 'Closed' | 'Parsial' | 'Open';
}

export interface SjDetailItem {
  id: string;
  noSj: string;
  noSo: string;
  kodeBarang: string;
  namaBarang: string;
  tanggalIso: string;
  tanggal: string;
  qty: number;
  stsPost: string;
  lokasiStock: string;
}

interface MutasiSalesOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MutasiSalesOrderForm: React.FC<MutasiSalesOrderFormProps> = ({
  isOpen,
  onClose,
}) => {
  const defaultRange = useMemo(() => {
    const now = todayIso();
    const monthStart = `${now.slice(0, 8)}01`;
    return {
      start: toDisplayDmy(monthStart),
      end: toDisplayDmy(now),
    };
  }, []);

  const [periodeStart, setPeriodeStart] = useState<string>(defaultRange.start);
  const [periodeEnd, setPeriodeEnd] = useState<string>(defaultRange.end);
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [jenisTransaksi, setJenisTransaksi] = useState<string>('Semua Berdasarkan Periode');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [printScopeOnOpen, setPrintScopeOnOpen] = useState<'selected' | 'all'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [soList, setSoList] = useState<MutasiSoItem[]>([]);
  const [sjList, setSjList] = useState<SjDetailItem[]>([]);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2800);
  };

  const mapRawMutasiRow = (row: any): MutasiSoItem => {
    const pesan = Number(row.pesan || 0);
    const kirim = Number(row.kirim || 0);
    const sisa = row.sisa !== undefined && row.sisa !== null ? Number(row.sisa) : Math.max(0, pesan - kirim);
    const persenTerpenuhi =
      pesan > 0 ? Math.min(100, Math.round((kirim / pesan) * 100)) : row.so_close === 'Closed' ? 100 : 0;
    const isClosed = String(row.so_close || '').toLowerCase() === 'closed' || (pesan > 0 && sisa <= 0);
    const statusMutasi: 'Closed' | 'Parsial' | 'Open' = isClosed
      ? 'Closed'
      : kirim > 0
      ? 'Parsial'
      : 'Open';
    const tglIso = toIsoDate(row.tanggal) || '';
    return {
      id: String(row.id || `${row.so_id || row.no_so}-${row.kode_barang}`),
      soId: row.so_id || null,
      noSo: String(row.no_so || '').trim(),
      noPo: String(row.no_po || '-').trim() || '-',
      noSq: String(row.no_sq || '').trim(),
      customer: String(row.customer || '-').trim() || '-',
      sales: String(row.sales || '').trim(),
      lokasiStock: String(row.lokasi_stock || '').trim(),
      tanggalIso: tglIso,
      tanggalDisplay: toDisplayDmy(tglIso) || '-',
      soClose: isClosed ? 'Closed' : 'Not Yet',
      kodeBarang: String(row.kode_barang || '').trim(),
      namaBarang: String(row.nama_barang || '').trim(),
      unit: String(row.unit || 'PCS').trim() || 'PCS',
      pesan,
      kirim,
      sisa,
      persenTerpenuhi,
      statusMutasi,
    };
  };

  const loadData = async (opts?: { term?: string }): Promise<MutasiSoItem[] | null> => {
    try {
      setIsBusy(true);
      const activeTerm = (opts?.term ?? '').trim();

      const [viewRows, customers, sjHeaders, sjDetails] = await Promise.all([
        erpList<any>('v_mutasi_sales_order', { orderBy: 'tanggal', asc: false, limit: 2000 }).catch(
          () => null
        ),
        erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
        erpList<any>('surat_jalans', { orderBy: 'tanggal', asc: false, limit: 2000 }).catch(() => []),
        erpList<any>('surat_jalan_details', { limit: 4000 }).catch(() => []),
      ]);

      setCustomerOptions(
        customers
          .filter((c) => c.is_active !== false)
          .map((c) => String(c.nama_customer || '').trim())
          .filter(Boolean)
      );

      const sjHeaderById = new Map<string, any>();
      for (const h of sjHeaders) {
        if (h.id) sjHeaderById.set(String(h.id), h);
      }

      const mappedSj: SjDetailItem[] = sjDetails.map((d) => {
        const hdr = sjHeaderById.get(String(d.surat_jalan_id || '')) || {};
        const tglIso = toIsoDate(hdr.tanggal) || '';
        const qtyVal = Number(d.terima || 0) > 0 ? Number(d.terima) : Number(d.qty || 0);
        return {
          id: String(d.id),
          noSj: String(hdr.no_bukti || d.no_bukti || '').trim(),
          noSo: String(hdr.no_so || '').trim().toUpperCase(),
          kodeBarang: String(d.kode || '').trim().toUpperCase(),
          namaBarang: String(d.nama_barang || '').trim(),
          tanggalIso: tglIso,
          tanggal: toDisplayDmy(tglIso) || '-',
          qty: qtyVal,
          stsPost: String(hdr.sts_post || 'Not Yet'),
          lokasiStock: String(hdr.lokasi_stock || ''),
        };
      });

      let mappedSo: MutasiSoItem[] = [];

      if (Array.isArray(viewRows)) {
        mappedSo = viewRows.map(mapRawMutasiRow);
      } else {
        // Fallback join from sales_orders + sales_order_details + posted surat_jalans
        const [orders, details] = await Promise.all([
          erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false, limit: 1500 }),
          erpList<any>('sales_order_details', { limit: 4000 }),
        ]);

        const orderById = new Map<string, any>();
        for (const o of orders) {
          if (o.id) orderById.set(String(o.id), o);
        }

        const kirimBySoKode = new Map<string, number>();
        for (const sj of mappedSj) {
          const st = sj.stsPost.trim().toUpperCase();
          if (st !== 'POSTING' && st !== 'POSTED') continue;
          if (!sj.noSo || !sj.kodeBarang) continue;
          const key = `${sj.noSo}__${sj.kodeBarang}`;
          kirimBySoKode.set(key, (kirimBySoKode.get(key) || 0) + sj.qty);
        }

        mappedSo = details.map((d) => {
          const parent = orderById.get(String(d.so_id || '')) || {};
          const noSo = String(parent.no_bukti || d.no_bukti || '').trim().toUpperCase();
          const kode = String(d.kode || '').trim().toUpperCase();
          const pesan = Number(d.qty || 0);
          const kirimAgg = kirimBySoKode.get(`${noSo}__${kode}`);
          const kirim = kirimAgg !== undefined ? kirimAgg : Number(d.terima || 0);
          return mapRawMutasiRow({
            id: d.id,
            so_id: d.so_id || parent.id || null,
            no_so: parent.no_bukti || d.no_bukti || '',
            no_po: parent.po_no || '-',
            no_sq: parent.no_sq || '',
            customer: parent.nama_customer || '-',
            sales: parent.sales || '',
            lokasi_stock: parent.lokasi_stock || '',
            tanggal: parent.tanggal || d.created_at,
            so_close: parent.so_close || 'Not Yet',
            kode_barang: d.kode || '',
            nama_barang: d.nama_barang || '',
            unit: d.unit || 'PCS',
            pesan,
            kirim,
            sisa: Math.max(0, pesan - kirim),
          });
        });
      }

      if (activeTerm) {
        mappedSo = mappedSo.filter((it) =>
          matchesMultiKeyword(
            [it.noSo, it.noPo, it.customer, it.kodeBarang, it.namaBarang, it.unit, it.sales],
            activeTerm
          )
        );
      }

      setSoList(mappedSo);
      setSjList(mappedSj);
      if (mappedSo.length > 0 && !mappedSo.some((r) => r.id === selectedId)) {
        setSelectedId(mappedSo[0].id);
      } else if (mappedSo.length === 0) {
        setSelectedId('');
      }
      return mappedSo;
    } catch (err: any) {
      showFeedback(`Gagal memuat Mutasi SO: ${err.message}`);
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startIso = toIsoDate(periodeStart);
  const endIso = toIsoDate(periodeEnd);

  const filteredList = soList.filter((item) => {
    if (startIso && item.tanggalIso && item.tanggalIso < startIso) return false;
    if (endIso && item.tanggalIso && item.tanggalIso > endIso) return false;
    if (customerFilter !== 'ALL' && item.customer.toUpperCase() !== customerFilter.toUpperCase()) {
      return false;
    }
    if (jenisTransaksi === 'Outstanding SO (Belum Lunas Kirim)' && item.sisa <= 0) {
      return false;
    }
    if (jenisTransaksi === 'Closed SO' && item.statusMutasi !== 'Closed') {
      return false;
    }
    if (searchTerm.trim()) {
      if (searchField === 'Kode') return matchesMultiKeyword([item.noSo, item.kodeBarang], searchTerm);
      if (searchField === 'Nama Pelanggan' || searchField === 'Customer') {
        return matchesMultiKeyword([item.customer], searchTerm);
      }
      if (searchField === 'No.SO') return matchesMultiKeyword([item.noSo], searchTerm);
      if (searchField === 'No.PO') return matchesMultiKeyword([item.noPo], searchTerm);
      if (searchField === 'Nama Barang') {
        return matchesMultiKeyword([item.namaBarang, item.kodeBarang], searchTerm);
      }
      return matchesMultiKeyword(
        [item.noSo, item.noPo, item.customer, item.kodeBarang, item.namaBarang, item.unit, item.sales],
        searchTerm
      );
    }
    return true;
  });

  const activeSelectedSo =
    filteredList.find((r) => r.id === selectedId) || soList.find((r) => r.id === selectedId) || null;

  const visibleSjList = activeSelectedSo
    ? sjList.filter((sj) => {
        const matchSo =
          sj.noSo && activeSelectedSo.noSo && sj.noSo === activeSelectedSo.noSo.toUpperCase();
        const matchKode =
          sj.kodeBarang &&
          activeSelectedSo.kodeBarang &&
          sj.kodeBarang === activeSelectedSo.kodeBarang.toUpperCase();
        return matchSo && matchKode;
      })
    : [];

  const allCustomersInRows = Array.from(
    new Set([...customerOptions, ...soList.map((s) => s.customer).filter((c) => c && c !== '-')])
  ).sort();

  const totalPesanAll = filteredList.reduce((acc, r) => acc + r.pesan, 0);
  const totalKirimAll = filteredList.reduce((acc, r) => acc + r.kirim, 0);
  const totalSisaAll = filteredList.reduce((acc, r) => acc + r.sisa, 0);
  const avgTerpenuhi =
    totalPesanAll > 0 ? Math.min(100, Math.round((totalKirimAll / totalPesanAll) * 100)) : 0;

  const handleExecuteCari = async () => {
    const rows = await loadData({ term: '' });
    if (rows) {
      showFeedback(`Ditemukan ${rows.length} baris Mutasi SO dari server`);
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setCustomerFilter('ALL');
    setJenisTransaksi('Semua Berdasarkan Periode');
    const now = todayIso();
    setPeriodeStart(toDisplayDmy(`${now.slice(0, 8)}01`));
    setPeriodeEnd(toDisplayDmy(now));
    const rows = await loadData({ term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} baris Mutasi SO)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ term: '' });
  };

  const handlePrintAll = () => {
    setPrintScopeOnOpen('all');
    setIsPrintOpen(true);
  };

  const handlePrintSelected = () => {
    if (!activeSelectedSo) {
      showFeedback('Pilih baris Mutasi SO yang akan dicetak terlebih dahulu');
      return;
    }
    setPrintScopeOnOpen('selected');
    setIsPrintOpen(true);
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Mutasi_Sales_Order',
      sheetTitle: 'MUTASI SALES ORDER',
      subtitle: `Periode: ${periodeStart} s/d ${periodeEnd} | Customer: ${customerFilter} | Status: ${jenisTransaksi}`,
      companyProfile: company,
      columns: [
        { header: 'No.SO', accessor: 'noSo' },
        { header: 'Tanggal', accessor: 'tanggalDisplay', align: 'center' },
        { header: 'No.PO', accessor: 'noPo' },
        { header: 'Customer', accessor: 'customer' },
        { header: 'Kode Barang', accessor: 'kodeBarang' },
        { header: 'Nama Barang', accessor: 'namaBarang' },
        { header: 'Unit', accessor: 'unit', align: 'center' },
        { header: 'Pesan', accessor: 'pesan', align: 'right' },
        { header: 'Kirim', accessor: 'kirim', align: 'right' },
        { header: 'Sisa', accessor: 'sisa', align: 'right' },
        { header: '% Kirim', accessor: 'persenTerpenuhi', align: 'right' },
        { header: 'Status', accessor: 'statusMutasi', align: 'center' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel Mutasi SO selesai');
  };

  return (
    <div
      id="mutasi-sales-order-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Mutasi Sales Order"
        onClose={onClose}
        onFind={handleFind}
        onPrint={handlePrintAll}
        onTableView={() => loadData({ term: '' })}
        onExportExcel={handleExportExcel}
      />

      {/* Toolbar Monitoring Mutasi SO */}
      <div className="shrink-0 bg-[#ECE9D8] border-b border-[#C0C0C0] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => loadData({ term: '' })}
            className="h-[26px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1 text-black font-semibold cursor-pointer disabled:opacity-50"
          >
            <span>Refresh Data</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handlePrintSelected}
            className="h-[26px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1 text-black font-semibold cursor-pointer disabled:opacity-50"
          >
            <span>Cetak Terpilih</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handlePrintAll}
            className="h-[26px] px-2.5 bg-[#0A246A] hover:bg-[#163994] border border-black rounded-[2px] flex items-center space-x-1 text-white font-bold cursor-pointer disabled:opacity-50"
          >
            <span>Preview Laporan A4</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleExportExcel}
            className="h-[26px] px-2.5 bg-[#1E7145] hover:bg-[#155935] border border-black rounded-[2px] flex items-center space-x-1 text-white font-bold cursor-pointer disabled:opacity-50"
          >
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleFind}
            className="h-[26px] px-2.5 bg-[#ECE9D8] hover:bg-[#F5F2E6] border border-[#7A7A7A] shadow-[inset_1px_1px_0_#FFFFFF] rounded-[2px] flex items-center space-x-1 text-black font-semibold cursor-pointer disabled:opacity-50"
          >
            <span>Find</span>
          </button>

          {feedback && (
            <span className="ml-2 px-2 py-0.5 bg-[#FFFFCC] border border-[#ACA899] text-[10px] font-semibold text-black">
              {feedback}
            </span>
          )}
        </div>

        {/* Summary Status Metrics */}
        <div className="flex items-center space-x-3 text-[11px] font-semibold text-black">
          <span>
            Baris: <b className="font-mono">{filteredList.length}</b>
          </span>
          <span>
            Pesan: <b className="font-mono text-[#0A246A]">{formatMoney(totalPesanAll)}</b>
          </span>
          <span>
            Kirim: <b className="font-mono text-[#107C10]">{formatMoney(totalKirimAll)}</b>
          </span>
          <span>
            Sisa: <b className="font-mono text-[#C00000]">{formatMoney(totalSisaAll)}</b>
          </span>
          <span>
            Terpenuhi: <b className="font-mono">{avgTerpenuhi}%</b>
          </span>
        </div>
      </div>

      {/* Filter Header */}
      <div className="shrink-0 bg-[#ECE9D8] px-3 py-2 flex flex-col gap-1.5 text-[11px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-black w-[100px] text-right">Periode SO :</span>
            <DatePickerInput
              value={periodeStart}
              onChange={(formatted) => setPeriodeStart(formatted)}
              format="dmy"
            />
            <span className="font-bold text-black px-1">s/d</span>
            <DatePickerInput
              value={periodeEnd}
              onChange={(formatted) => setPeriodeEnd(formatted)}
              format="dmy"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-black">Customer :</span>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-[240px] h-[22px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] text-black outline-none cursor-pointer"
            >
              <option value="ALL">-- Semua Customer --</option>
              {allCustomersInRows.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-black w-[100px] text-right">Status SO :</span>
            <select
              value={jenisTransaksi}
              onChange={(e) => setJenisTransaksi(e.target.value)}
              className="w-[260px] h-[22px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] text-black outline-none cursor-pointer"
            >
              <option value="Semua Berdasarkan Periode">Semua Berdasarkan Periode</option>
              <option value="Outstanding SO (Belum Lunas Kirim)">
                Outstanding SO (Belum Lunas Kirim)
              </option>
              <option value="Closed SO">Closed SO (Sudah Lengkap Kirim)</option>
            </select>
          </div>

          <div className="flex items-center flex-1 justify-end min-w-[420px]">
            <ToolbarSearchControl
              compact
              searchField={searchField}
              onSearchFieldChange={setSearchField}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onCari={handleExecuteCari}
              onReset={handleResetCari}
              inputRef={searchInputRef}
              isBusy={isBusy}
              inputWidthClass="w-52"
              options={[
                { value: 'Semua', label: 'Semua' },
                { value: 'Kode', label: 'Kode (No.SO/Brg)' },
                { value: 'No.SO', label: 'No.SO' },
                { value: 'No.PO', label: 'No.PO' },
                { value: 'Nama Pelanggan', label: 'Nama Pelanggan' },
                { value: 'Nama Barang', label: 'Nama Barang' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Main Split Grid: Left = SO Detail, Right = SJ Realization Detail */}
      <div className="flex-1 overflow-hidden px-2 pb-2 flex gap-2">
        <div className="flex-1 overflow-auto bg-[#F0F0F0] border border-[#808080] relative shadow-inner">
          <table className="border-collapse text-left whitespace-nowrap text-[11px] w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                <th
                  className="px-2 py-0.5 text-center font-bold text-[11px] border-r border-[#ACA899]"
                  colSpan={13}
                >
                  MUTASI REALISASI SALES ORDER (PESAN vs SURAT JALAN)
                </th>
              </tr>
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899] font-normal">
                <th className="border-r border-[#ACA899] w-[20px] px-1 py-0.5 text-center font-normal" />
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-center w-[95px]">No.SO</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-center w-[76px]">Tanggal</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-center w-[86px]">No.PO</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-left w-[150px]">Customer</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-center w-[88px]">Kode Brg</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-left w-[170px]">Nama Barang</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-center w-[45px]">Unit</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-right w-[52px]">Pesan</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-right w-[52px]">Kirim</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-right w-[52px]">Sisa</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-right w-[54px]">% Kirim</th>
                <th className="px-2 py-0.5 font-semibold text-center w-[62px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-gray-500 italic bg-white">
                    Tidak ada data Mutasi Sales Order pada periode/filter ini.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handlePrintSelected}
                      className={`border-b border-[#D4D0C8] cursor-pointer ${
                        isSelected
                          ? 'bg-[#DCEBFC] text-black font-semibold'
                          : 'bg-white text-black hover:bg-[#F2F6FC]'
                      }`}
                    >
                      <td className="border-r border-[#ACA899] bg-[#ECE9D8] px-1 py-0.5 text-center font-bold text-[10px]">
                        {isSelected ? '▸' : ''}
                      </td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 font-mono font-semibold">
                        {item.noSo}
                      </td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-center">
                        {item.tanggalDisplay}
                      </td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 font-mono">{item.noPo}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">{item.customer}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 font-mono">{item.kodeBarang}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">{item.namaBarang}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-center">{item.unit}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right font-mono">
                        {formatMoney(item.pesan)}
                      </td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right font-mono text-[#107C10]">
                        {formatMoney(item.kirim)}
                      </td>
                      <td
                        className={`border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right font-mono font-bold ${
                          item.sisa > 0 ? 'text-[#C00000]' : 'text-[#107C10]'
                        }`}
                      >
                        {formatMoney(item.sisa)}
                      </td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right font-mono">
                        {item.persenTerpenuhi}%
                      </td>
                      <td className="px-2 py-0.5 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded-[2px] text-[10px] font-bold ${
                            item.statusMutasi === 'Closed'
                              ? 'bg-[#DDF5D5] text-[#107C10] border border-[#107C10]/40'
                              : item.statusMutasi === 'Parsial'
                              ? 'bg-[#FFF3CD] text-[#856404] border border-[#856404]/40'
                              : 'bg-[#FDE8E8] text-[#900000] border border-[#900000]/30'
                          }`}
                        >
                          {item.statusMutasi}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="w-[310px] shrink-0 overflow-auto bg-[#F0F0F0] border border-[#808080] relative shadow-inner">
          <table className="border-collapse text-left whitespace-nowrap text-[11px] w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                <th
                  className="px-2 py-0.5 text-center font-bold text-[11px] border-r border-[#ACA899]"
                  colSpan={5}
                >
                  RIWAYAT SURAT JALAN (ITEM TERPILIH)
                </th>
              </tr>
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899] font-normal">
                <th className="border-r border-[#ACA899] w-[18px] px-1 py-0.5 text-center font-normal" />
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-center">No.SJ</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-center">Tanggal</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-semibold text-right">Qty</th>
                <th className="px-2 py-0.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleSjList.length === 0 ? (
                <tr className="bg-white border-b border-[#ACA899]">
                  <td colSpan={5} className="px-2 py-4 text-center text-gray-500 italic">
                    Belum ada Surat Jalan untuk item SO terpilih.
                  </td>
                </tr>
              ) : (
                visibleSjList.map((sj) => (
                  <tr key={sj.id} className="border-b border-[#ACA899] bg-white text-black">
                    <td className="border-r border-[#ACA899] bg-[#ECE9D8] px-1 py-0.5 text-center font-bold text-black">
                      •
                    </td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 font-mono">{sj.noSj}</td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-center">{sj.tanggal}</td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right font-mono">
                      {formatMoney(sj.qty)}
                    </td>
                    <td className="px-2 py-0.5 text-center">{sj.stsPost}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MUTASI SALES ORDER"
        subtitle={`Periode: ${periodeStart} s/d ${periodeEnd} | Customer: ${customerFilter} | ${jenisTransaksi}`}
        orientation="landscape"
        defaultPrintScope={printScopeOnOpen}
        metaLines={[
          { label: 'Periode Tanggal', value: `${periodeStart} s/d ${periodeEnd}` },
          { label: 'Filter Customer', value: customerFilter },
          { label: 'Status SO', value: jenisTransaksi },
        ]}
        columns={[
          { header: 'No.SO', accessor: 'noSo', width: '95px' },
          { header: 'Tanggal', accessor: 'tanggalDisplay', align: 'center', width: '75px' },
          { header: 'No.PO', accessor: 'noPo', width: '85px' },
          { header: 'Customer', accessor: 'customer' },
          { header: 'Kode Brg', accessor: 'kodeBarang', width: '80px' },
          { header: 'Nama Barang', accessor: 'namaBarang' },
          { header: 'Unit', accessor: 'unit', align: 'center', width: '44px' },
          { header: 'Pesan', accessor: (r) => formatMoney(r.pesan), align: 'right', width: '50px' },
          { header: 'Kirim', accessor: (r) => formatMoney(r.kirim), align: 'right', width: '50px' },
          { header: 'Sisa', accessor: (r) => formatMoney(r.sisa), align: 'right', width: '50px' },
          { header: '% Kirim', accessor: (r) => `${r.persenTerpenuhi}%`, align: 'right', width: '50px' },
          { header: 'Status', accessor: 'statusMutasi', align: 'center', width: '55px' },
        ]}
        rows={filteredList}
        summaryItems={[
          { label: 'Total Item', value: `${filteredList.length} Baris` },
          { label: 'Total Pesan', value: formatMoney(totalPesanAll) },
          { label: 'Total Kirim', value: formatMoney(totalKirimAll) },
          { label: 'Total Sisa', value: formatMoney(totalSisaAll) },
        ]}
        selectedRow={activeSelectedSo}
        selectedTitle="DETAIL MUTASI SALES ORDER"
        selectedSubtitle={
          activeSelectedSo
            ? `No. SO: ${activeSelectedSo.noSo} | Customer: ${activeSelectedSo.customer}`
            : ''
        }
        selectedMetaLines={
          activeSelectedSo
            ? [
                { label: 'No. SO', value: activeSelectedSo.noSo },
                { label: 'Tanggal SO', value: activeSelectedSo.tanggalDisplay },
                { label: 'No. PO', value: activeSelectedSo.noPo || '-' },
                { label: 'Customer', value: activeSelectedSo.customer || '-' },
                { label: 'Kode Barang', value: activeSelectedSo.kodeBarang || '-' },
                { label: 'Nama Barang', value: activeSelectedSo.namaBarang || '-' },
                {
                  label: 'Realisasi Kirim',
                  value: `${formatMoney(activeSelectedSo.kirim)} / ${formatMoney(activeSelectedSo.pesan)} ${activeSelectedSo.unit} (${activeSelectedSo.persenTerpenuhi}%)`,
                },
              ]
            : undefined
        }
        selectedSummaryItems={
          activeSelectedSo
            ? [
                { label: 'Qty Pesan', value: `${formatMoney(activeSelectedSo.pesan)} ${activeSelectedSo.unit}` },
                { label: 'Qty Kirim', value: `${formatMoney(activeSelectedSo.kirim)} ${activeSelectedSo.unit}` },
                { label: 'Sisa Kirim', value: `${formatMoney(activeSelectedSo.sisa)} ${activeSelectedSo.unit}` },
                { label: 'Status', value: activeSelectedSo.statusMutasi },
              ]
            : undefined
        }
      />

      <SupabaseFindModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        tableLabel="Mutasi Sales Order"
        rows={soList}
        selectedId={selectedId}
        getRowId={(r) => r.id}
        getSearchValues={(r) => [r.noSo, r.noPo, r.customer, r.kodeBarang, r.namaBarang, r.unit, r.statusMutasi]}
        initialQuery={searchTerm}
        isBusy={isBusy}
        onSearchSupabase={(q) => {
          setSearchField('Semua');
          setSearchTerm(q);
          return loadData({ term: q });
        }}
        onRefreshSupabase={() => {
          setSearchField('Semua');
          setSearchTerm('');
          setCustomerFilter('ALL');
          setJenisTransaksi('Semua Berdasarkan Periode');
          return loadData({ term: '' });
        }}
        onSelectRow={(row, q) => {
          setSelectedId(row.id);
          setSearchTerm(q);
          showFeedback(`Mutasi SO [${row.noSo} - ${row.kodeBarang}] dipilih`);
        }}
        columns={[
          { header: 'No.SO', accessor: (r) => r.noSo, widthClass: 'w-28', mono: true, bold: true },
          { header: 'No.PO', accessor: (r) => r.noPo, widthClass: 'w-24', mono: true },
          { header: 'Customer', accessor: (r) => r.customer, bold: true },
          { header: 'Kode Brg', accessor: (r) => r.kodeBarang, widthClass: 'w-24', mono: true },
          { header: 'Nama Barang', accessor: (r) => r.namaBarang },
          { header: 'Pesan', accessor: (r) => formatMoney(r.pesan), widthClass: 'w-14', align: 'right', mono: true },
          { header: 'Kirim', accessor: (r) => formatMoney(r.kirim), widthClass: 'w-14', align: 'right', mono: true },
          { header: 'Sisa', accessor: (r) => formatMoney(r.sisa), widthClass: 'w-14', align: 'right', mono: true, bold: true },
        ]}
      />
    </div>
  );
};
