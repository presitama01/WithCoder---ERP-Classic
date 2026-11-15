import React, { useEffect, useRef, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import {
  erpCreate,
  erpDelete,
  erpList,
  erpUpdate,
  erpUpsert,
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
  customer: string;
  sales: string;
  kode_barang: string;
  nama_barang: string;
  unit: string;
  pesan: number;
  kirim: number;
  sisa: number;
  nilai: number;
  lokasi_stock: string;
  so_close: string;
}

export const SalesOrderDetailForm: React.FC<SalesOrderDetailFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [tglStart, setTglStart] = useState<string>('12-09-2026');
  const [tglEnd, setTglEnd] = useState<string>('12-09-2026');
  const [filterType, setFilterType] = useState<
    'merk' | 'batasan_kode' | 'customer' | 'all_periode'
  >('all_periode');
  const [kodeBarang, setKodeBarang] = useState<string>('');
  const [namaBarangDesc, setNamaBarangDesc] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Sales Order Detail');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangCatalog, setBarangCatalog] = useState<{ kode: string; nama: string; unit: string }[]>([]);
  const [customerCatalog, setCustomerCatalog] = useState<string[]>([]);

  // Live Supabase table + Search state
  const [tableRows, setTableRows] = useState<SoDetailGridRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add / Koreksi Modal
  const [isCrudOpen, setIsCrudOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNoSo, setFormNoSo] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState<string>(() => toDisplayDMyShort(todayIso()));
  const [formNoPo, setFormNoPo] = useState<string>('');
  const [formCustomer, setFormCustomer] = useState<string>('');
  const [formKodeBarang, setFormKodeBarang] = useState<string>('');
  const [formNamaBarang, setFormNamaBarang] = useState<string>('');
  const [formUnit, setFormUnit] = useState<string>('PCS');
  const [formPesan, setFormPesan] = useState<string>('10');
  const [formKirim, setFormKirim] = useState<string>('0');
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<SoDetailGridRow | null>(null);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadLiveRows = async (): Promise<SoDetailGridRow[]> => {
    const [items, orders] = await Promise.all([
      erpList<any>('sales_order_items', { orderBy: 'created_at', asc: false }),
      erpList<any>('sales_orders', { orderBy: 'tanggal', asc: false }),
    ]);
    const orderById = new Map<string, any>();
    const orderByNo = new Map<string, any>();
    for (const o of orders) {
      if (o.id) orderById.set(o.id, o);
      if (o.no_bukti) orderByNo.set(String(o.no_bukti).toUpperCase(), o);
    }

    const mapped: SoDetailGridRow[] = items.map((it) => {
      const parent =
        (it.so_id && orderById.get(it.so_id)) ||
        orderByNo.get(String(it.no_so || '').toUpperCase());
      const tglIso = toIsoDate(parent?.tanggal) || toIsoDate(it.created_at) || '';
      const pesan = Number(it.pesan || 0);
      const kirim = Number(it.kirim || 0);
      const sisa =
        it.sisa !== undefined && it.sisa !== null ? Number(it.sisa) : Math.max(0, pesan - kirim);
      return {
        id: String(it.id),
        so_id: it.so_id || parent?.id || null,
        no_so: it.no_so || parent?.no_bukti || '',
        tanggal: toDisplayDMyShort(tglIso) || '-',
        tanggalIso: tglIso,
        no_po: parent?.po_no || '',
        customer: parent?.nama_customer || '',
        sales: parent?.sales || '',
        kode_barang: it.kode_barang || '',
        nama_barang: it.nama_barang || '',
        unit: it.unit || 'PCS',
        pesan,
        kirim,
        sisa,
        nilai: Number(parent?.nilai_so || 0),
        lokasi_stock: parent?.lokasi_stock || '01 - OFFICE',
        so_close: parent?.so_close || (sisa === 0 ? 'Closed' : 'Not Yet'),
      };
    });

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
        const [lokasis, barangs, customers] = await Promise.all([
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_customers', { orderBy: 'nama_customer', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setLokasiOptions(lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()));
        setBarangCatalog(
          barangs.map((b) => ({
            kode: b.kode || '',
            nama: b.nama_barang || '',
            unit: b.unit || 'PCS',
          }))
        );
        setCustomerCatalog(customers.map((c) => c.nama_customer || '').filter(Boolean));
        const rawPreset = localStorage.getItem('withcoder_preset_so_detail');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.tglStart) setTglStart(v.tglStart);
          if (v.tglEnd) setTglEnd(v.tglEnd);
          if (v.lokasiStock) setLokasiStock(v.lokasiStock);
          if (v.bentukLaporan) setBentukLaporan(v.bentukLaporan);
        }
        await loadLiveRows();
      } catch {
        // Ignore non-critical load error
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

  const filteredTableRows = tableRows.filter((r) => {
    if (lokasiStock !== 'ALL' && r.lokasi_stock && r.lokasi_stock !== lokasiStock) return false;
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
      const q = searchTerm.trim().toLowerCase();
      if (searchField === 'No.SO') return r.no_so.toLowerCase().includes(q);
      if (searchField === 'Customer') return r.customer.toLowerCase().includes(q);
      if (searchField === 'Kode Barang') return r.kode_barang.toLowerCase().includes(q);
      if (searchField === 'Nama Barang') return r.nama_barang.toLowerCase().includes(q);
      if (searchField === 'No.PO') return r.no_po.toLowerCase().includes(q);
      return (
        r.no_so.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.kode_barang.toLowerCase().includes(q) ||
        r.nama_barang.toLowerCase().includes(q) ||
        r.no_po.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleBaru = () => {
    setEditingId(null);
    setModalError(null);
    setFormNoSo(nextUniqueCode(tableRows.map((r) => r.no_so), '2608-SO-', 3));
    setFormTanggal(toDisplayDMyShort(todayIso()));
    setFormNoPo('');
    setFormCustomer(customerFilter || '');
    setFormKodeBarang(kodeBarang || '');
    setFormNamaBarang(namaBarangDesc || '');
    setFormUnit('PCS');
    setFormPesan('10');
    setFormKirim('0');
    setIsCrudOpen(true);
  };

  const handleKoreksi = () => {
    const current =
      filteredTableRows.find((r) => r.id === selectedId) ||
      tableRows.find((r) => r.id === selectedId) ||
      filteredTableRows[0];
    if (!current) {
      showFeedback('Pilih baris item SO terlebih dahulu (atau klik Baru)');
      return;
    }
    setSelectedId(current.id);
    setEditingId(current.id);
    setModalError(null);
    setFormNoSo(current.no_so);
    setFormTanggal(current.tanggal !== '-' ? current.tanggal : toDisplayDMyShort(todayIso()));
    setFormNoPo(current.no_po);
    setFormCustomer(current.customer);
    setFormKodeBarang(current.kode_barang);
    setFormNamaBarang(current.nama_barang);
    setFormUnit(current.unit || 'PCS');
    setFormPesan(String(current.pesan));
    setFormKirim(String(current.kirim));
    setIsCrudOpen(true);
  };

  const handleSaveCrud = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formNoSo.trim() || !formCustomer.trim() || !formKodeBarang.trim()) {
      setModalError('No. SO, Customer, dan Kode Barang wajib diisi.');
      return;
    }
    const pesanNum = parseNum(formPesan);
    const kirimNum = parseNum(formKirim);
    const sisaNum = Math.max(0, pesanNum - kirimNum);

    try {
      setIsBusy(true);
      const tglIso = toIsoDate(formTanggal) || todayIso();
      const parentSo = await erpUpsert<any>(
        'sales_orders',
        {
          no_bukti: formNoSo.trim().toUpperCase(),
          tanggal: tglIso,
          nama_customer: formCustomer.trim().toUpperCase(),
          po_no: formNoPo.trim().toUpperCase(),
          so_close: sisaNum === 0 ? 'Closed' : 'Not Yet',
          dibuat_oleh: (getCurrentUser().username || 'ADMIN'),
          tgl_created: tglIso,
        },
        'no_bukti'
      );

      const itemPayload = {
        so_id: parentSo?.id || null,
        no_so: formNoSo.trim().toUpperCase(),
        kode_barang: formKodeBarang.trim().toUpperCase(),
        nama_barang: formNamaBarang.trim().toUpperCase() || formKodeBarang.trim().toUpperCase(),
        unit: formUnit.trim().toUpperCase() || 'PCS',
        pesan: pesanNum,
        kirim: kirimNum,
      };

      if (editingId) {
        await erpUpdate('sales_order_items', editingId, itemPayload);
        showFeedback('Item Sales Order diperbarui di Supabase');
      } else {
        const created = await erpCreate<any>('sales_order_items', itemPayload);
        if (created?.id) setSelectedId(String(created.id));
        showFeedback('Item Sales Order tersimpan ke Supabase');
      }

      setIsCrudOpen(false);
      setEditingId(null);
      await loadLiveRows();
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan item SO';
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
      showFeedback('Pilih baris data yang akan dihapus');
      return;
    }
    setConfirmDeleteRow(current);
  };

  const handleConfirmHapus = async () => {
    if (!confirmDeleteRow) return;
    try {
      setIsBusy(true);
      await erpDelete('sales_order_items', confirmDeleteRow.id);
      setConfirmDeleteRow(null);
      await loadLiveRows();
      showFeedback('Baris Sales Order dihapus dari Supabase');
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
        'withcoder_preset_so_detail',
        JSON.stringify({ tglStart, tglEnd, lokasiStock, bentukLaporan })
      );
      await syncAppSettings({
        periode_start: toIsoDate(tglStart),
        periode_end: toIsoDate(tglEnd),
        lokasi_aktif: lokasiStock !== 'ALL' ? lokasiStock : undefined,
      });
      await loadLiveRows();
      showFeedback('Parameter & data Sales Order Detail tersinkron ke Supabase');
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
      showFeedback('Data Supabase dimuat ulang - ketik kata kunci pencarian');
    } catch (err: any) {
      showFeedback(`Gagal muat: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const startIso = toIsoDate(tglStart);
    const endIso = toIsoDate(tglEnd);
    const isDetailMode = bentukLaporan.startsWith('01');

    if (isDetailMode) {
      const fresh = await loadLiveRows();
      return fresh.filter((r) => {
        if (startIso && r.tanggalIso && r.tanggalIso < startIso) return false;
        if (endIso && r.tanggalIso && r.tanggalIso > endIso) return false;
        if (lokasiStock !== 'ALL' && r.lokasi_stock !== lokasiStock) return false;
        if (filterType === 'batasan_kode' && kodeBarang.trim()) {
          const k = kodeBarang.trim().toLowerCase();
          return (
            r.kode_barang.toLowerCase().includes(k) ||
            r.nama_barang.toLowerCase().includes((namaBarangDesc || k).toLowerCase())
          );
        }
        if (filterType === 'customer' && customerFilter.trim()) {
          return r.customer.toLowerCase().includes(customerFilter.trim().toLowerCase());
        }
        return true;
      });
    }

    const orders = await erpList<any>('sales_orders', {
      gte: startIso ? { tanggal: startIso } : undefined,
      lte: endIso ? { tanggal: endIso } : undefined,
      orderBy: 'tanggal',
      asc: false,
    });
    return orders
      .filter((o) => {
        if (lokasiStock !== 'ALL' && o.lokasi_stock && o.lokasi_stock !== lokasiStock) return false;
        if (filterType === 'customer' && customerFilter.trim()) {
          return (o.nama_customer || '').toLowerCase().includes(customerFilter.trim().toLowerCase());
        }
        return true;
      })
      .map((o) => ({
        no_so: o.no_bukti || '',
        tanggal: toDisplayDMyShort(o.tanggal),
        customer: o.nama_customer || '',
        sales: o.sales || '',
        no_po: o.po_no || '',
        nilai: Number(o.nilai_so || 0),
        so_close: o.so_close || 'Not Yet',
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
      const isDetail = bentukLaporan.startsWith('01');
      exportToExcel({
        fileName: 'Sales_Order_Detail',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Periode: ${tglStart} s/d ${tglEnd} | Lokasi: ${lokasiStock}`,
        companyProfile: company,
        columns: isDetail
          ? [
              { header: 'No.SO', accessor: 'no_so' },
              { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
              { header: 'Customer', accessor: 'customer' },
              { header: 'Kode Barang', accessor: 'kode_barang' },
              { header: 'Nama Barang', accessor: 'nama_barang' },
              { header: 'Unit', accessor: 'unit', align: 'center' },
              { header: 'Pesan', accessor: 'pesan', align: 'right' },
              { header: 'Kirim', accessor: 'kirim', align: 'right' },
              { header: 'Sisa', accessor: 'sisa', align: 'right' },
            ]
          : [
              { header: 'No.SO', accessor: 'no_so' },
              { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
              { header: 'Customer', accessor: 'customer' },
              { header: 'Sales', accessor: 'sales', align: 'center' },
              { header: 'PO.No', accessor: 'no_po' },
              { header: 'Nilai SO', accessor: 'nilai', align: 'right' },
              { header: 'Status', accessor: 'so_close', align: 'center' },
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

  const isDetailMode = bentukLaporan.startsWith('01');
  const printColumns: PrintColumn<any>[] = isDetailMode
    ? [
        { header: 'No.SO', accessor: 'no_so', width: '95px' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '75px' },
        { header: 'Customer', accessor: 'customer' },
        { header: 'Kode Brg', accessor: 'kode_barang', width: '80px' },
        { header: 'Nama Barang', accessor: 'nama_barang' },
        { header: 'Unit', accessor: 'unit', align: 'center', width: '45px' },
        { header: 'Pesan', accessor: (r) => formatMoney(r.pesan), align: 'right', width: '55px' },
        { header: 'Kirim', accessor: (r) => formatMoney(r.kirim), align: 'right', width: '55px' },
        { header: 'Sisa', accessor: (r) => formatMoney(r.sisa), align: 'right', width: '55px' },
      ]
    : [
        { header: 'No.SO', accessor: 'no_so', width: '105px' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '80px' },
        { header: 'Customer', accessor: 'customer' },
        { header: 'Sales', accessor: 'sales', align: 'center', width: '60px' },
        { header: 'No.PO', accessor: 'no_po', width: '95px' },
        { header: 'Nilai SO', accessor: (r) => formatMoney(r.nilai), align: 'right', width: '105px' },
        { header: 'Status', accessor: 'so_close', align: 'center', width: '70px' },
      ];

  const totalPesan = previewRows.reduce((a, r) => a + Number(r.pesan || 0), 0);
  const totalSisa = previewRows.reduce((a, r) => a + Number(r.sisa || 0), 0);
  const totalNilai = previewRows.reduce((a, r) => a + Number(r.nilai || 0), 0);

  return (
    <div
      id="sales-order-detail-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Sales Order Detail"
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
              SALES ORDER DETAIL
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
              <label className="flex items-center space-x-2 text-[11px] text-[#808080] cursor-not-allowed">
                <input
                  type="radio"
                  name="so_detail_filter"
                  disabled
                  checked={filterType === 'merk'}
                  onChange={() => setFilterType('merk')}
                  className="cursor-not-allowed"
                />
                <span>Merk Barang</span>
              </label>

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
                {filterType === 'customer' && (
                  <>
                    <input
                      type="text"
                      list="so-detail-customer-list"
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      placeholder="Pilih / ketik nama customer..."
                      className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] outline-none"
                    />
                    <datalist id="so-detail-customer-list">
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
                <option value="No.SO">No.SO</option>
                <option value="Customer">Customer</option>
                <option value="Kode Barang">Kode Barang</option>
                <option value="Nama Barang">Nama Barang</option>
                <option value="No.PO">No.PO</option>
              </select>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadLiveRows();
                }}
                placeholder="Cari No.SO, Customer, Kode/Nama Barang..."
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
              Data Supabase (<b>sales_order_items</b>): <b>{filteredTableRows.length}</b> baris
            </span>
          </div>

          <div className="max-h-[220px] overflow-auto bg-white">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#ECE9D8] border-b border-[#808080]">
                <tr>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.SO</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Tanggal</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Customer</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">No.PO</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Kode Brg</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-left">Nama Barang</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-center">Unit</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">Pesan</th>
                  <th className="border-r border-[#ACA899] px-2 py-1 text-right">Kirim</th>
                  <th className="px-2 py-1 text-right">Sisa</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-5 text-gray-500 italic">
                      Belum ada data Sales Order Detail. Klik "Baru" untuk menambah item SO ke Supabase.
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
                          setFormNoSo(r.no_so);
                          setFormTanggal(r.tanggal !== '-' ? r.tanggal : toDisplayDMyShort(todayIso()));
                          setFormNoPo(r.no_po);
                          setFormCustomer(r.customer);
                          setFormKodeBarang(r.kode_barang);
                          setFormNamaBarang(r.nama_barang);
                          setFormUnit(r.unit || 'PCS');
                          setFormPesan(String(r.pesan));
                          setFormKirim(String(r.kirim));
                          setIsCrudOpen(true);
                        }}
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
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-center">{r.unit}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.pesan)}</td>
                        <td className="border-r border-[#E0E0E0] px-2 py-1 text-right font-mono">{formatMoney(r.kirim)}</td>
                        <td className="px-2 py-1 text-right font-mono font-bold">{formatMoney(r.sisa)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Item Sales Order Modal */}
      {isCrudOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0055EA] shadow-2xl w-[460px] flex flex-col overflow-hidden text-xs">
            <div className="bg-[#0A246A] text-white px-3 py-1.5 flex justify-between items-center font-bold">
              <span>{editingId ? 'Koreksi Item Sales Order' : 'Tambah Sales Order Detail Baru'}</span>
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
                  <label className="block font-bold mb-0.5">No. SO *</label>
                  <input
                    type="text"
                    value={formNoSo}
                    onChange={(e) => setFormNoSo(e.target.value.toUpperCase())}
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
                  <label className="block font-bold mb-0.5">Customer *</label>
                  <input
                    type="text"
                    list="so-modal-cust"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                  <datalist id="so-modal-cust">
                    {customerCatalog.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-bold mb-0.5">No. PO</label>
                  <input
                    type="text"
                    value={formNoPo}
                    onChange={(e) => setFormNoPo(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Kode Barang *</label>
                  <input
                    type="text"
                    list="so-modal-brg"
                    value={formKodeBarang}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setFormKodeBarang(val);
                      const found = barangCatalog.find((b) => b.kode.toUpperCase() === val);
                      if (found) {
                        setFormNamaBarang(found.nama);
                        setFormUnit(found.unit || 'PCS');
                      }
                    }}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] font-mono uppercase"
                  />
                  <datalist id="so-modal-brg">
                    {barangCatalog.map((b) => (
                      <option key={b.kode} value={b.kode}>
                        {b.nama}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div className="col-span-2">
                  <label className="block font-bold mb-0.5">Nama Barang</label>
                  <input
                    type="text"
                    value={formNamaBarang}
                    onChange={(e) => setFormNamaBarang(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-0.5">Unit</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value.toUpperCase())}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Qty Pesan</label>
                  <input
                    type="number"
                    value={formPesan}
                    onChange={(e) => setFormPesan(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Qty Kirim</label>
                  <input
                    type="number"
                    value={formKirim}
                    onChange={(e) => setFormKirim(e.target.value)}
                    className="w-full h-[24px] px-2 bg-white border border-[#7A7A7A] text-right font-mono"
                  />
                </div>
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
              Konfirmasi Hapus Item Sales Order
            </div>
            <div className="p-4 text-xs text-black space-y-3">
              <p>
                Yakin ingin menghapus item [{confirmDeleteRow.no_so} - {confirmDeleteRow.kode_barang}]
                dari database Supabase?
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
            label: 'Filter Laporan',
            value:
              filterType === 'batasan_kode'
                ? kodeBarang || 'Semua Barang'
                : filterType === 'customer'
                ? customerFilter || 'Semua Customer'
                : 'ALL Berdasarkan Periode',
          },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={printColumns}
        rows={previewRows}
        summaryItems={
          isDetailMode
            ? [
                { label: 'Total Item', value: `${previewRows.length} Baris` },
                { label: 'Total Qty Pesan', value: formatMoney(totalPesan) },
                { label: 'Total Qty Sisa', value: formatMoney(totalSisa) },
              ]
            : [
                { label: 'Total Dokumen SO', value: `${previewRows.length} SO` },
                { label: 'Total Nilai SO', value: formatRupiah(totalNilai) },
              ]
        }
      />
    </div>
  );
};
