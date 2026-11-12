import React, { useEffect, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import {
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  toDisplayDMyShort,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

interface KartuStockPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KartuStockPrintForm: React.FC<KartuStockPrintFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [bulanStart, setBulanStart] = useState<string>('08-2026');
  const [bulanEnd, setBulanEnd] = useState<string>('08-2026');
  const [tglStart, setTglStart] = useState<string>('01-08-2026');
  const [tglEnd, setTglEnd] = useState<string>('31-08-2026');
  const [filterType, setFilterType] = useState<string>('item_code');
  const [itemCode, setItemCode] = useState<string>('');
  const [itemName, setItemName] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('01 - OFFICE');
  const [bentukLaporan, setBentukLaporan] = useState<string>('01 - Kartu Stock');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangCatalog, setBarangCatalog] = useState<{ kode: string; nama: string }[]>([]);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      try {
        const [lokasis, barangs] = await Promise.all([
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setLokasiOptions(
          lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()).filter(Boolean)
        );
        setBarangCatalog(
          barangs.map((b) => ({
            kode: b.kode || '',
            nama: b.nama_barang || '',
          }))
        );
        const rawPreset = localStorage.getItem('withcoder_preset_kartu_stock');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.bulanStart) setBulanStart(v.bulanStart);
          if (v.bulanEnd) setBulanEnd(v.bulanEnd);
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

  useEffect(() => {
    const match = barangCatalog.find(
      (b) => b.kode.toLowerCase() === itemCode.trim().toLowerCase()
    );
    if (match) {
      setItemName(match.nama);
    }
  }, [itemCode, barangCatalog]);

  if (!isOpen) return null;

  const handleBaru = () => {
    setBulanStart('08-2026');
    setBulanEnd('08-2026');
    setTglStart('01-08-2026');
    setTglEnd('31-08-2026');
    setFilterType('item_code');
    setItemCode('');
    setItemName('');
    setLokasiStock('01 - OFFICE');
    setBentukLaporan('01 - Kartu Stock');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setTglStart('');
    setTglEnd('');
    setItemCode('');
    setItemName('');
    showFeedback('Parameter dibersihkan');
  };

  const handleSimpanPreset = async () => {
    try {
      localStorage.setItem(
        'withcoder_preset_kartu_stock',
        JSON.stringify({ bulanStart, bulanEnd, tglStart, tglEnd, lokasiStock, bentukLaporan })
      );
      showFeedback('Parameter Kartu Stock tersimpan');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const startIso = toIsoDate(tglStart);
    const endIso = toIsoDate(tglEnd);
    const filterCode = itemCode.trim().toUpperCase();

    const [stockAwals, penerimaanLain, pengeluaranLain, barangs] = await Promise.all([
      erpList<any>('stock_awal', { orderBy: 'item_code', asc: true }).catch(() => []),
      erpList<any>('penerimaan_barang_lains', { orderBy: 'tanggal', asc: true }).catch(() => []),
      erpList<any>('pengeluaran_barang_lains', { orderBy: 'tanggal', asc: true }).catch(() => []),
      erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
    ]);

    const movements: {
      sortDate: string;
      tanggal: string;
      no_bukti: string;
      jenis: string;
      kode_barang: string;
      nama_barang: string;
      lokasi: string;
      masuk: number;
      keluar: number;
      keterangan: string;
    }[] = [];

    // 1. Stock Awal entries
    for (const sa of stockAwals) {
      const code = (sa.item_code || '').toUpperCase();
      if (filterCode && code !== filterCode) continue;
      if (lokasiStock !== 'ALL' && sa.lokasi && sa.lokasi !== lokasiStock) continue;
      movements.push({
        sortDate: '0000-00-00',
        tanggal: sa.periode || '-',
        no_bukti: 'STOCK-AWAL',
        jenis: 'Saldo Awal',
        kode_barang: code,
        nama_barang: sa.description || '',
        lokasi: sa.lokasi || '01 - OFFICE',
        masuk: Number(sa.stock_bagus || 0),
        keluar: 0,
        keterangan: `Periode ${sa.periode || '-'}`,
      });
    }

    // Fallback to master_barangs initial stock if no stock_awal row found
    if (movements.length === 0) {
      for (const b of barangs) {
        const code = (b.kode || '').toUpperCase();
        if (filterCode && code !== filterCode) continue;
        movements.push({
          sortDate: '0000-00-00',
          tanggal: 'Saldo Master',
          no_bukti: 'MASTER-BRG',
          jenis: 'Saldo Awal',
          kode_barang: code,
          nama_barang: b.nama_barang || '',
          lokasi: '01 - OFFICE',
          masuk: Number(b.stock || 0),
          keluar: 0,
          keterangan: 'Saldo dari Master Barang',
        });
      }
    }

    // 2. Penerimaan Barang Lain (Masuk)
    for (const p of penerimaanLain) {
      const code = (p.kode_barang || '').toUpperCase();
      if (filterCode && code !== filterCode) continue;
      if (lokasiStock !== 'ALL' && p.lokasi_stock && p.lokasi_stock !== lokasiStock) continue;
      const tglIso = toIsoDate(p.tanggal) || '';
      if (startIso && tglIso && tglIso < startIso) continue;
      if (endIso && tglIso && tglIso > endIso) continue;
      movements.push({
        sortDate: tglIso || '9999-99-99',
        tanggal: toDisplayDMyShort(p.tanggal) || '-',
        no_bukti: p.no_bukti || '',
        jenis: 'Penerimaan Lain',
        kode_barang: code,
        nama_barang: p.nama_barang || '',
        lokasi: p.lokasi_stock || '01 - OFFICE',
        masuk: Number(p.qty || 0),
        keluar: 0,
        keterangan: p.keterangan || p.customer || '',
      });
    }

    // 3. Pengeluaran Barang Lain (Keluar)
    for (const k of pengeluaranLain) {
      const code = (k.kode_barang || '').toUpperCase();
      if (filterCode && code !== filterCode) continue;
      if (lokasiStock !== 'ALL' && k.lokasi_stock && k.lokasi_stock !== lokasiStock) continue;
      const tglIso = toIsoDate(k.tanggal) || '';
      if (startIso && tglIso && tglIso < startIso) continue;
      if (endIso && tglIso && tglIso > endIso) continue;
      movements.push({
        sortDate: tglIso || '9999-99-99',
        tanggal: toDisplayDMyShort(k.tanggal) || '-',
        no_bukti: k.no_bukti || '',
        jenis: 'Pengeluaran Lain',
        kode_barang: code,
        nama_barang: k.nama_barang || '',
        lokasi: k.lokasi_stock || '01 - OFFICE',
        masuk: 0,
        keluar: Number(k.qty || 0),
        keterangan: k.keterangan || k.customer || '',
      });
    }

    movements.sort((a, b) => a.sortDate.localeCompare(b.sortDate));

    // Calculate running balance per item code
    const runningByItem = new Map<string, number>();
    return movements.map((m) => {
      const prevSaldo = runningByItem.get(m.kode_barang) || 0;
      const newSaldo = prevSaldo + m.masuk - m.keluar;
      runningByItem.set(m.kode_barang, newSaldo);
      return {
        ...m,
        saldo: newSaldo,
      };
    });
  };

  const handlePreview = async () => {
    try {
      setIsBusy(true);
      const data = await fetchReportData();
      setPreviewRows(data);
      setIsPrintOpen(true);
    } catch (err: any) {
      showFeedback(`Gagal memuat Kartu Stock: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsBusy(true);
      const [data, company] = await Promise.all([fetchReportData(), fetchActiveCompanyProfile()]);
      exportToExcel({
        fileName: 'Kartu_Stock',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Item: ${itemCode || 'Semua'} | Lokasi: ${lokasiStock} | Periode: ${tglStart || '-'} s/d ${tglEnd || '-'}`,
        companyProfile: company,
        columns: [
          { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
          { header: 'No. Bukti', accessor: 'no_bukti' },
          { header: 'Jenis', accessor: 'jenis' },
          { header: 'Kode Brg', accessor: 'kode_barang' },
          { header: 'Nama Barang', accessor: 'nama_barang' },
          { header: 'Masuk', accessor: 'masuk', align: 'right' },
          { header: 'Keluar', accessor: 'keluar', align: 'right' },
          { header: 'Saldo', accessor: 'saldo', align: 'right' },
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

  const printColumns: PrintColumn<any>[] = [
    { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '78px' },
    { header: 'No.Bukti', accessor: 'no_bukti', width: '95px' },
    { header: 'Jenis Mutasi', accessor: 'jenis', width: '90px' },
    { header: 'Kode Brg', accessor: 'kode_barang', width: '75px' },
    { header: 'Nama Barang', accessor: 'nama_barang' },
    { header: 'Masuk', accessor: (r) => formatMoney(r.masuk), align: 'right', width: '55px' },
    { header: 'Keluar', accessor: (r) => formatMoney(r.keluar), align: 'right', width: '55px' },
    { header: 'Saldo', accessor: (r) => formatMoney(r.saldo), align: 'right', width: '60px' },
  ];

  const totalMasuk = previewRows.reduce((s, r) => s + Number(r.masuk || 0), 0);
  const totalKeluar = previewRows.reduce((s, r) => s + Number(r.keluar || 0), 0);

  return (
    <div
      id="kartu-stock-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Kartu Stock"
        onClose={onClose}
        onPrint={handlePreview}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[600px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[14px] tracking-wide text-black font-sans">
              KARTU STOCK
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
            <div className="grid grid-cols-[140px_108px_58px_108px] items-center gap-x-1.5 gap-y-1.5 pt-0.5">
              <label className="text-right font-bold text-black text-[11px] pr-1">
                Bulan :
              </label>
              <input
                type="text"
                value={bulanStart}
                onChange={(e) => setBulanStart(e.target.value)}
                className="w-full h-[21px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none"
              />
              <span className="h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                s / d
              </span>
              <input
                type="text"
                value={bulanEnd}
                onChange={(e) => setBulanEnd(e.target.value)}
                className="w-full h-[21px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none"
              />

              <label className="text-right font-bold text-black text-[11px] pr-1 whitespace-nowrap">
                Tanggal ( dd-mm-yyyy ) :
              </label>
              <DatePickerInput
                value={tglStart}
                onChange={(formatted) => setTglStart(formatted)}
                format="dmy"
                inputClassName="w-[88px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
              />

              <span className="h-[21px] flex items-center justify-center bg-[#BDF4BA] border border-[#7A7A7A] text-[11px] font-bold text-black">
                s / d
              </span>

              <DatePickerInput
                value={tglEnd}
                onChange={(formatted) => setTglEnd(formatted)}
                format="dmy"
                inputClassName="w-[88px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none"
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
                  name="kartu_stock_filter"
                  disabled
                  checked={filterType === 'merk'}
                  onChange={() => setFilterType('merk')}
                  className="cursor-not-allowed"
                />
                <span>Merk Barang</span>
              </label>

              <label className="flex items-center space-x-2 text-[11px] text-[#808080] cursor-not-allowed">
                <input
                  type="radio"
                  name="kartu_stock_filter"
                  disabled
                  checked={filterType === 'batasan_kode'}
                  onChange={() => setFilterType('batasan_kode')}
                  className="cursor-not-allowed"
                />
                <span>Batasan kode Barang</span>
              </label>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="kartu_stock_filter"
                    checked={filterType === 'item_code'}
                    onChange={() => setFilterType('item_code')}
                    className="cursor-pointer"
                  />
                  <span>Item Code</span>
                </label>

                <div className="flex items-center space-x-1 flex-1">
                  <input
                    type="text"
                    list="kartu-stock-barang-list"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                    disabled={filterType !== 'item_code'}
                    placeholder="Semua / Pilih..."
                    className="w-[104px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8]"
                  />
                  <datalist id="kartu-stock-barang-list">
                    {barangCatalog.map((b) => (
                      <option key={b.kode} value={b.kode}>
                        {b.nama}
                      </option>
                    ))}
                  </datalist>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    disabled={filterType !== 'item_code'}
                    className="flex-1 h-[21px] bg-[#FFFFBF] border border-[#7A7A7A] px-2 text-[11px] outline-none shadow-inner"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                <input
                  type="radio"
                  name="kartu_stock_filter"
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
                    className="w-full px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer"
                  >
                    <option value="01 - Kartu Stock">01 - Kartu Stock</option>
                    <option value="02 - Rekap Kartu Stock">02 - Rekap Kartu Stock</option>
                    <option value="03 - Mutasi Kartu Stock">03 - Mutasi Kartu Stock</option>
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
                <span>PREVIEW</span>
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

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={bentukLaporan.toUpperCase()}
        subtitle={`Periode: ${tglStart || bulanStart} s/d ${tglEnd || bulanEnd}`}
        orientation="landscape"
        metaLines={[
          { label: 'Periode Tanggal', value: `${tglStart || bulanStart} s/d ${tglEnd || bulanEnd}` },
          { label: 'Lokasi Stock', value: lokasiStock },
          { label: 'Item Code', value: itemCode ? `${itemCode} (${itemName})` : 'Semua Item' },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={printColumns}
        rows={previewRows}
        summaryItems={[
          { label: 'Total Mutasi Baris', value: `${previewRows.length} Baris` },
          { label: 'Total Qty Masuk', value: formatMoney(totalMasuk) },
          { label: 'Total Qty Keluar', value: formatMoney(totalKeluar) },
          { label: 'Saldo Akhir Net', value: formatMoney(totalMasuk - totalKeluar) },
        ]}
      />
    </div>
  );
};
