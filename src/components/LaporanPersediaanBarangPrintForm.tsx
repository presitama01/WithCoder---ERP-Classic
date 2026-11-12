import React, { useEffect, useState } from 'react';
import { FormActionButtons } from './FormActionButtons';
import { FormHeaderBanner } from './FormHeaderBanner';
import { DatePickerInput } from './DatePickerInput';
import { A4PrintPreviewModal, PrintColumn } from './A4PrintPreviewModal';
import {
  erpList,
  fetchActiveCompanyProfile,
  formatMoney,
  formatRupiah,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

interface LaporanPersediaanBarangPrintFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MerkOption {
  label: string;
  code: string;
  name: string;
}

export const LaporanPersediaanBarangPrintForm: React.FC<
  LaporanPersediaanBarangPrintFormProps
> = ({ isOpen, onClose }) => {
  const [bulan, setBulan] = useState<string>('08-2026');
  const [tglStart, setTglStart] = useState<string>('01-08-2026');
  const [tglEnd, setTglEnd] = useState<string>('31-08-2026');
  const [filterType, setFilterType] = useState<
    'merk' | 'batasan_kode' | 'kode_barang' | 'all'
  >('merk');
  const [selectedMerk, setSelectedMerk] = useState<string>('');
  const [merkCode, setMerkCode] = useState<string>('');
  const [merkName, setMerkName] = useState<string>('');
  const [kodeBarangInput, setKodeBarangInput] = useState<string>('');
  const [lokasiStock, setLokasiStock] = useState<string>('ALL');
  const [bentukLaporan, setBentukLaporan] = useState<string>(
    '01 - Laporan Persediaan Barang'
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [merkOptions, setMerkOptions] = useState<MerkOption[]>([]);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [barangCodes, setBarangCodes] = useState<string[]>([]);

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
        const [merks, lokasis, barangs] = await Promise.all([
          erpList<any>('master_merks', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
          erpList<any>('master_barangs', { orderBy: 'kode', asc: true }).catch(() => []),
        ]);
        if (!active) return;
        setMerkOptions(
          merks.map((m) => ({
            label: `${m.kode} - ${m.nama_merk || ''}`,
            code: m.kode || '',
            name: m.nama_merk || '',
          }))
        );
        setLokasiOptions(
          lokasis.map((l) => `${l.kode} - ${l.nama_lokasi || ''}`.trim()).filter(Boolean)
        );
        setBarangCodes(barangs.map((b) => b.kode || '').filter(Boolean));
        const rawPreset = localStorage.getItem('withcoder_preset_persediaan_barang');
        if (rawPreset) {
          const v = JSON.parse(rawPreset);
          if (v.bulan) setBulan(v.bulan);
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

  const handleMerkSelect = (val: string) => {
    setSelectedMerk(val);
    const found = merkOptions.find((m) => m.label === val);
    if (found) {
      setMerkCode(found.code);
      setMerkName(found.name);
    } else {
      setMerkCode('');
      setMerkName('');
    }
  };

  const handleBaru = () => {
    setBulan('08-2026');
    setTglStart('01-08-2026');
    setTglEnd('31-08-2026');
    setFilterType('merk');
    setSelectedMerk('');
    setMerkCode('');
    setMerkName('');
    setKodeBarangInput('');
    setLokasiStock('ALL');
    setBentukLaporan('01 - Laporan Persediaan Barang');
    showFeedback('Filter baru direset');
  };

  const handleHapus = () => {
    setTglStart('');
    setTglEnd('');
    setSelectedMerk('');
    setMerkCode('');
    setMerkName('');
    setKodeBarangInput('');
    showFeedback('Parameter dibersihkan');
  };

  const handleSimpanPreset = async () => {
    try {
      localStorage.setItem(
        'withcoder_preset_persediaan_barang',
        JSON.stringify({ bulan, tglStart, tglEnd, lokasiStock, bentukLaporan })
      );
      showFeedback('Parameter Laporan Persediaan Barang tersimpan');
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    }
  };

  const fetchReportData = async (): Promise<any[]> => {
    const [barangs, stockAwals] = await Promise.all([
      erpList<any>('master_barangs', { orderBy: 'kode', asc: true }),
      erpList<any>('stock_awal', { orderBy: 'item_code', asc: true }).catch(() => []),
    ]);

    const saMap = new Map<string, { bagus: number; rusak: number; hpp: number; lokasi: string }>();
    for (const sa of stockAwals) {
      if (lokasiStock !== 'ALL' && sa.lokasi && sa.lokasi !== lokasiStock) continue;
      const k = (sa.item_code || '').toUpperCase();
      const prev = saMap.get(k) || { bagus: 0, rusak: 0, hpp: Number(sa.hpp || 0), lokasi: sa.lokasi || '01 - OFFICE' };
      saMap.set(k, {
        bagus: prev.bagus + Number(sa.stock_bagus || 0),
        rusak: prev.rusak + Number(sa.stock_rusak || 0),
        hpp: Number(sa.hpp || prev.hpp || 0),
        lokasi: sa.lokasi || prev.lokasi,
      });
    }

    const mapped = barangs.map((b) => {
      const code = (b.kode || '').toUpperCase();
      const sa = saMap.get(code);
      const stockBagus = sa ? sa.bagus : Number(b.stock || 0);
      const stockRusak = sa ? sa.rusak : 0;
      const hpp = Number(b.cost || sa?.hpp || 0);
      return {
        kode_barang: b.kode || '',
        nama_barang: b.nama_barang || '',
        category: b.category || '',
        merk: b.merk || '',
        satuan: b.unit || 'PCS',
        lokasi: sa?.lokasi || '01 - OFFICE',
        hpp,
        stock_bagus: stockBagus,
        stock_rusak: stockRusak,
        nilai_persediaan: hpp * stockBagus,
      };
    });

    return mapped.filter((r) => {
      if (filterType === 'merk' && (merkName.trim() || merkCode.trim())) {
        const needle = (merkName.trim() || merkCode.trim()).toLowerCase();
        return r.merk.toLowerCase().includes(needle);
      }
      if ((filterType === 'batasan_kode' || filterType === 'kode_barang') && kodeBarangInput.trim()) {
        return r.kode_barang.toLowerCase().includes(kodeBarangInput.trim().toLowerCase());
      }
      return true;
    });
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
        fileName: 'Laporan_Persediaan_Barang',
        sheetTitle: bentukLaporan.toUpperCase(),
        subtitle: `Bulan: ${bulan} | Lokasi: ${lokasiStock}`,
        companyProfile: company,
        columns: [
          { header: 'Kode Barang', accessor: 'kode_barang' },
          { header: 'Nama Barang', accessor: 'nama_barang' },
          { header: 'Category', accessor: 'category' },
          { header: 'Merk', accessor: 'merk' },
          { header: 'Satuan', accessor: 'satuan', align: 'center' },
          { header: 'Stock Bagus', accessor: 'stock_bagus', align: 'right' },
          { header: 'Stock Rusak', accessor: 'stock_rusak', align: 'right' },
          { header: 'HPP (Rp)', accessor: 'hpp', align: 'right' },
          { header: 'Nilai Persediaan (Rp)', accessor: 'nilai_persediaan', align: 'right' },
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
    { header: 'Kode Brg', accessor: 'kode_barang', width: '80px' },
    { header: 'Nama Barang', accessor: 'nama_barang' },
    { header: 'Category', accessor: 'category', width: '75px' },
    { header: 'Merk', accessor: 'merk', width: '70px' },
    { header: 'Sat', accessor: 'satuan', align: 'center', width: '40px' },
    { header: 'Bagus', accessor: (r) => formatMoney(r.stock_bagus), align: 'right', width: '52px' },
    { header: 'Rusak', accessor: (r) => formatMoney(r.stock_rusak), align: 'right', width: '50px' },
    { header: 'HPP (Rp)', accessor: (r) => formatMoney(r.hpp), align: 'right', width: '85px' },
    { header: 'Nilai (Rp)', accessor: (r) => formatMoney(r.nilai_persediaan), align: 'right', width: '95px' },
  ];

  const totalBagus = previewRows.reduce((s, r) => s + Number(r.stock_bagus || 0), 0);
  const totalNilai = previewRows.reduce((s, r) => s + Number(r.nilai_persediaan || 0), 0);

  return (
    <div
      id="laporan-persediaan-barang-dialog"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <FormHeaderBanner
        title="Laporan Persediaan Barang"
        onClose={onClose}
        onPrint={handlePreview}
        onExportExcel={handleExportExcel}
      />

      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-[640px] p-3 bg-[#ECE9D8] border border-[#808080] flex flex-col space-y-2.5 shadow-xs">
          <div className="border border-[#808080] bg-white py-1.5 px-4 text-center shadow-xs">
            <h1 className="font-extrabold text-[15px] tracking-wide text-black font-sans">
              LAPORAN PERSEDIAAN BARANG
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
            <div className="grid grid-cols-[145px_108px_62px_108px] items-center gap-x-1.5 gap-y-1.5 pt-0.5">
              <label className="text-right font-bold text-black text-[11px] pr-1">
                Bulan :
              </label>
              <input
                type="text"
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="w-[78px] h-[21px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] font-mono outline-none"
              />
              <span />
              <span />

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
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_persediaan_filter"
                    checked={filterType === 'merk'}
                    onChange={() => setFilterType('merk')}
                    className="cursor-pointer"
                  />
                  <span>Merk Barang</span>
                </label>

                <div className="flex items-center space-x-1 flex-1">
                  <div className="flex items-center w-[118px] h-[21px] bg-white border border-[#7A7A7A] shrink-0">
                    <select
                      value={selectedMerk}
                      onChange={(e) => handleMerkSelect(e.target.value)}
                      disabled={filterType !== 'merk'}
                      className="w-full h-full px-1 text-[11px] bg-white outline-none cursor-pointer disabled:bg-[#ECE9D8] disabled:cursor-not-allowed"
                    >
                      <option value="">-- Semua Merk --</option>
                      {merkOptions.map((opt) => (
                        <option key={opt.label} value={opt.label}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={merkCode}
                    onChange={(e) => setMerkCode(e.target.value.toUpperCase())}
                    disabled={filterType !== 'merk'}
                    className="w-[54px] h-[21px] bg-white border border-[#7A7A7A] px-1.5 text-[11px] font-mono outline-none disabled:bg-[#ECE9D8] shrink-0"
                  />
                  <input
                    type="text"
                    value={merkName}
                    onChange={(e) => setMerkName(e.target.value)}
                    disabled={filterType !== 'merk'}
                    className="flex-1 h-[21px] bg-[#FFFFBF] border border-[#7A7A7A] px-2 text-[11px] outline-none shadow-inner disabled:opacity-75"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                <input
                  type="radio"
                  name="laporan_persediaan_filter"
                  checked={filterType === 'batasan_kode'}
                  onChange={() => setFilterType('batasan_kode')}
                  className="cursor-pointer"
                />
                <span>Batasan kode Barang</span>
              </label>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer w-[135px] shrink-0">
                  <input
                    type="radio"
                    name="laporan_persediaan_filter"
                    checked={filterType === 'kode_barang'}
                    onChange={() => setFilterType('kode_barang')}
                    className="cursor-pointer"
                  />
                  <span>Kode Barang</span>
                </label>
                {(filterType === 'kode_barang' || filterType === 'batasan_kode') && (
                  <>
                    <input
                      type="text"
                      list="persediaan-kode-list"
                      value={kodeBarangInput}
                      onChange={(e) => setKodeBarangInput(e.target.value.toUpperCase())}
                      placeholder="Ketik kode barang..."
                      className="flex-1 h-[21px] bg-white border border-[#7A7A7A] px-2 text-[11px] font-mono outline-none"
                    />
                    <datalist id="persediaan-kode-list">
                      {barangCodes.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </>
                )}
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-black font-bold cursor-pointer">
                <input
                  type="radio"
                  name="laporan_persediaan_filter"
                  checked={filterType === 'all'}
                  onChange={() => setFilterType('all')}
                  className="cursor-pointer"
                />
                <span>ALL</span>
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
                    <option value="01 - Laporan Persediaan Barang">
                      01 - Laporan Persediaan Barang
                    </option>
                    <option value="02 - Rekap Persediaan Barang">
                      02 - Rekap Persediaan Barang
                    </option>
                    <option value="03 - Laporan Stock Opname">
                      03 - Laporan Stock Opname
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
        subtitle={`Bulan: ${bulan} | Periode: ${tglStart || '-'} s/d ${tglEnd || '-'}`}
        orientation="landscape"
        metaLines={[
          { label: 'Bulan / Periode', value: `${bulan} (${tglStart || '-'} s/d ${tglEnd || '-'})` },
          { label: 'Lokasi Stock', value: lokasiStock },
          {
            label: 'Filter',
            value:
              filterType === 'merk'
                ? merkName || merkCode || 'Semua Merk'
                : kodeBarangInput || 'Semua Item',
          },
          { label: 'Bentuk Laporan', value: bentukLaporan },
        ]}
        columns={printColumns}
        rows={previewRows}
        summaryItems={[
          { label: 'Total Item Persediaan', value: `${previewRows.length} Item` },
          { label: 'Total Qty Stock Bagus', value: formatMoney(totalBagus) },
          { label: 'Total Nilai Persediaan', value: formatRupiah(totalNilai) },
        ]}
      />
    </div>
  );
};
