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
  erpUpsert,
  fetchActiveCompanyProfile,
  nextUniqueCode,
  toDisplayDmy,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';
import { getCurrentUser } from '../lib/authService';
import { SupabaseFindModal } from './SupabaseFindModal';
import { ToolbarSearchControl } from './ToolbarSearchControl';
import { matchesMultiKeyword } from '../lib/searchUtils';

export interface MutasiSoItem {
  id: string;
  soId: string | null;
  noSo: string;
  noPo: string;
  customer: string;
  tanggalIso: string;
  kodeBarang: string;
  namaBarang: string;
  unit: string;
  pesan: number;
  kirim: number;
  sisa: number;
}

export interface SjDetailItem {
  id: string;
  soItemId: string | null;
  noSj: string;
  kodeBarang: string;
  tanggal: string;
  qty: number;
}

interface MutasiSalesOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MutasiSalesOrderForm: React.FC<MutasiSalesOrderFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [periodeStart, setPeriodeStart] = useState<string>('01-01-2018');
  const [periodeEnd, setPeriodeEnd] = useState<string>(() => toDisplayDmy(todayIso()));
  const [jenisTransaksi, setJenisTransaksi] = useState<string>('Semua Berdasarkan Periode');
  const [searchField, setSearchField] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formNoSo, setFormNoSo] = useState<string>('');
  const [formNoPo, setFormNoPo] = useState<string>('');
  const [formCustomer, setFormCustomer] = useState<string>('');
  const [formKodeBarang, setFormKodeBarang] = useState<string>('');
  const [formNamaBarang, setFormNamaBarang] = useState<string>('');
  const [formUnit, setFormUnit] = useState<string>('PCS');
  const [formPesan, setFormPesan] = useState<string>('10');
  const [formKirim, setFormKirim] = useState<string>('0');

  const [soList, setSoList] = useState<MutasiSoItem[]>([]);
  const [sjList, setSjList] = useState<SjDetailItem[]>([]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadData = async (opts?: {
    field?: string;
    term?: string;
  }): Promise<MutasiSoItem[] | null> => {
    try {
      setIsBusy(true);
      const activeField = opts?.field ?? searchField;
      const activeTerm = (opts?.term ?? '').trim();

      const itemQuery: Record<string, any> = { orderBy: 'created_at', asc: false, limit: 1000 };
      const orderQuery: Record<string, any> = { orderBy: 'tanggal', asc: false, limit: 1000 };

      if (activeTerm) {
        if (activeField === 'Kode') {
          itemQuery.orSearch = 'no_so,kode_barang';
          itemQuery.searchVal = activeTerm;
        } else if (activeField === 'No.SO') {
          itemQuery.searchCol = 'no_so';
          itemQuery.searchVal = activeTerm;
        } else if (activeField === 'Nama Barang') {
          itemQuery.searchCol = 'nama_barang';
          itemQuery.searchVal = activeTerm;
        } else if (activeField === 'Nama Pelanggan' || activeField === 'Customer') {
          orderQuery.searchCol = 'nama_customer';
          orderQuery.searchVal = activeTerm;
        } else if (activeField === 'No.PO') {
          orderQuery.searchCol = 'po_no';
          orderQuery.searchVal = activeTerm;
        }
      }

      const [items, orders, sjItems] = await Promise.all([
        erpList<any>('sales_order_items', itemQuery),
        erpList<any>('sales_orders', orderQuery),
        erpList<any>('surat_jalan_items', { orderBy: 'tanggal', asc: false, limit: 1000 }),
      ]);

      const orderById = new Map<string, any>();
      const orderByNo = new Map<string, any>();
      for (const o of orders) {
        if (o.id) orderById.set(o.id, o);
        if (o.no_bukti) orderByNo.set(String(o.no_bukti).toUpperCase(), o);
      }

      let mappedSo: MutasiSoItem[] = items.map((it) => {
        const parent =
          (it.so_id && orderById.get(it.so_id)) ||
          orderByNo.get(String(it.no_so || '').toUpperCase());
        const pesan = Number(it.pesan || 0);
        const kirim = Number(it.kirim || 0);
        const sisa = it.sisa !== undefined && it.sisa !== null ? Number(it.sisa) : Math.max(0, pesan - kirim);
        return {
          id: it.id,
          soId: it.so_id || parent?.id || null,
          noSo: it.no_so || parent?.no_bukti || '',
          noPo: parent?.po_no || '-',
          customer: parent?.nama_customer || '-',
          tanggalIso: toIsoDate(parent?.tanggal) || toIsoDate(it.created_at) || '',
          kodeBarang: it.kode_barang || '',
          namaBarang: it.nama_barang || '',
          unit: it.unit || 'PCS',
          pesan,
          kirim,
          sisa,
        };
      });

      if (activeTerm) {
        if (activeField === 'Nama Pelanggan' || activeField === 'Customer' || activeField === 'No.PO') {
          mappedSo = mappedSo.filter((it) =>
            (it.soId && orderById.has(it.soId)) ||
            orderByNo.has(String(it.noSo || '').toUpperCase())
          );
        } else if (activeField === 'Semua') {
          mappedSo = mappedSo.filter((it) =>
            matchesMultiKeyword(
              [it.noSo, it.noPo, it.customer, it.kodeBarang, it.namaBarang, it.unit],
              activeTerm
            )
          );
        }
      }

      const mappedSj: SjDetailItem[] = sjItems.map((sj) => ({
        id: sj.id,
        soItemId: sj.so_item_id || null,
        noSj: sj.no_sj || '',
        kodeBarang: sj.kode_barang || '',
        tanggal: toDisplayDmy(sj.tanggal),
        qty: Number(sj.qty || 0),
      }));

      setSoList(mappedSo);
      setSjList(mappedSj);
      if (mappedSo.length > 0 && !mappedSo.some((r) => r.id === selectedId)) {
        setSelectedId(mappedSo[0].id);
      } else if (mappedSo.length === 0) {
        setSelectedId('');
      }
      return mappedSo;
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarSimpan = async () => {
    const selected = soList.find((s) => s.id === selectedId);
    if (!selected) {
      showFeedback('Pilih baris Mutasi SO yang akan disimpan');
      return;
    }
    try {
      setIsBusy(true);
      await erpUpdate('sales_order_items', selected.id, {
        so_id: selected.soId,
        no_so: selected.noSo.trim().toUpperCase(),
        kode_barang: selected.kodeBarang.trim().toUpperCase(),
        nama_barang: selected.namaBarang.trim().toUpperCase(),
        unit: selected.unit.trim().toUpperCase() || 'PCS',
        pesan: Number(selected.pesan || 0),
        kirim: Number(selected.kirim || 0),
      });
      await loadData({ field: searchField, term: searchTerm });
      showFeedback(`Mutasi SO [${selected.noSo} - ${selected.kodeBarang}] berhasil disimpan`);
    } catch (err: any) {
      showFeedback(`Gagal simpan: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNew = () => {
    setEditingId(null);
    setModalError(null);
    setFormNoSo(nextUniqueCode(soList.map((s) => s.noSo), '2608-SO-', 3));
    setFormNoPo('');
    setFormCustomer('');
    setFormKodeBarang('');
    setFormNamaBarang('');
    setFormUnit('PCS');
    setFormPesan('10');
    setFormKirim('0');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = soList.find((s) => s.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris data terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setFormNoSo(item.noSo);
    setFormNoPo(item.noPo === '-' ? '' : item.noPo);
    setFormCustomer(item.customer === '-' ? '' : item.customer);
    setFormKodeBarang(item.kodeBarang);
    setFormNamaBarang(item.namaBarang);
    setFormUnit(item.unit);
    setFormPesan(item.pesan.toString());
    setFormKirim(item.kirim.toString());
    setIsAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedId) {
      showFeedback('Pilih baris yang akan dihapus');
      return;
    }
    try {
      setIsBusy(true);
      await erpDelete('sales_order_items', selectedId);
      const updated = soList.filter((item) => item.id !== selectedId);
      setSoList(updated);
      setSelectedId(updated[0]?.id || '');
      showFeedback('Data Mutasi SO dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formNoSo.trim() || !formCustomer.trim()) {
      setModalError('No. SO dan Customer wajib diisi.');
      return;
    }
    const pesanNum = parseInt(formPesan || '0', 10) || 0;
    const kirimNum = parseInt(formKirim || '0', 10) || 0;
    const sisaNum = Math.max(0, pesanNum - kirimNum);

    try {
      setIsBusy(true);
      // Ensure parent Sales Order header exists so Customer & PO.No persist cleanly
      const parentSo = await erpUpsert<any>(
        'sales_orders',
        {
          no_bukti: formNoSo.trim().toUpperCase(),
          tanggal: todayIso(),
          nama_customer: formCustomer.trim().toUpperCase(),
          po_no: formNoPo.trim().toUpperCase(),
          so_close: sisaNum === 0 ? 'Closed' : 'Not Yet',
          dibuat_oleh: (getCurrentUser().username || 'ADMIN'),
          tgl_created: todayIso(),
        },
        'no_bukti'
      );

      const itemPayload = {
        so_id: parentSo?.id || null,
        no_so: formNoSo.trim().toUpperCase(),
        kode_barang: formKodeBarang.trim().toUpperCase(),
        nama_barang: formNamaBarang.trim().toUpperCase(),
        unit: formUnit.trim().toUpperCase(),
        pesan: pesanNum,
        kirim: kirimNum,
      };

      if (editingId) {
        await erpUpdate('sales_order_items', editingId, itemPayload);
        showFeedback('Mutasi SO diperbarui');
      } else {
        const created = await erpCreate<any>('sales_order_items', itemPayload);
        if (created?.id) setSelectedId(created.id);
        showFeedback('Mutasi SO tersimpan');
      }

      setIsAddOpen(false);
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Mutasi SO';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const startIso = toIsoDate(periodeStart);
  const endIso = toIsoDate(periodeEnd);

  const filteredList = soList.filter((item) => {
    if (startIso && item.tanggalIso && item.tanggalIso < startIso) return false;
    if (endIso && item.tanggalIso && item.tanggalIso > endIso) return false;
    if (jenisTransaksi === 'Outstanding SO (Belum Lunas Kirim)' && item.sisa <= 0) {
      return false;
    }
    if (jenisTransaksi === 'Closed SO' && item.sisa > 0) {
      return false;
    }
    if (searchField === 'Kode') return matchesMultiKeyword([item.noSo, item.kodeBarang], searchTerm);
    if (searchField === 'Nama Pelanggan' || searchField === 'Customer') {
      return matchesMultiKeyword([item.customer], searchTerm);
    }
    if (searchField === 'No.SO') return matchesMultiKeyword([item.noSo], searchTerm);
    if (searchField === 'No.PO') return matchesMultiKeyword([item.noPo], searchTerm);
    if (searchField === 'Nama Barang') return matchesMultiKeyword([item.namaBarang, item.kodeBarang], searchTerm);
    return matchesMultiKeyword(
      [item.noSo, item.noPo, item.customer, item.kodeBarang, item.namaBarang, item.unit],
      searchTerm
    );
  });

  const selectedSoRow = filteredList.find((r) => r.id === selectedId);
  const activeSelectedSo = selectedSoRow || soList.find((r) => r.id === selectedId) || null;
  const visibleSjList = activeSelectedSo
    ? sjList.filter(
        (sj) =>
          (sj.soItemId && sj.soItemId === activeSelectedSo.id) ||
          (sj.kodeBarang && sj.kodeBarang === activeSelectedSo.kodeBarang)
      )
    : sjList;

  const handleExecuteCari = async () => {
    const rows = await loadData({ field: searchField, term: searchTerm });
    if (rows) {
      showFeedback(
        rows.length > 0
          ? `Ditemukan ${rows.length} item Mutasi SO dari Supabase`
          : 'Data Mutasi SO tidak ditemukan di Supabase'
      );
    }
  };

  const handleResetCari = async () => {
    setSearchField('Semua');
    setSearchTerm('');
    setJenisTransaksi('Semua Berdasarkan Periode');
    const rows = await loadData({ field: 'Semua', term: '' });
    if (rows) showFeedback(`Filter direset (${rows.length} Mutasi SO)`);
  };

  const handleFind = async () => {
    setIsFindOpen(true);
    await loadData({ field: 'Semua', term: '' });
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'Mutasi_Sales_Order',
      sheetTitle: 'MUTASI SALES ORDER',
      subtitle: `Periode: ${periodeStart} s/d ${periodeEnd} | ${jenisTransaksi}`,
      companyProfile: company,
      columns: [
        { header: 'No.SO', accessor: 'noSo' },
        { header: 'No.PO', accessor: 'noPo' },
        { header: 'Customer', accessor: 'customer' },
        { header: 'Kode Barang', accessor: 'kodeBarang' },
        { header: 'Nama Barang', accessor: 'namaBarang' },
        { header: 'Unit', accessor: 'unit', align: 'center' },
        { header: 'Pesan', accessor: 'pesan', align: 'right' },
        { header: 'Kirim', accessor: 'kirim', align: 'right' },
        { header: 'Sisa', accessor: 'sisa', align: 'right' },
      ],
      rows: filteredList,
    });
    showFeedback('Export Excel selesai');
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
        onPrint={() => setIsPrintOpen(true)}
        onTableView={() => loadData({ field: searchField, term: searchTerm })}
        onExportExcel={handleExportExcel}
      />

      <div className="shrink-0 bg-[#ECE9D8] border-b border-[#C0C0C0] px-3 py-1.5 flex items-center justify-between text-xs overflow-x-auto">
        <FormActionButtons
          onSimpan={handleToolbarSimpan}
          onBaru={handleAddNew}
          onKoreksi={handleEdit}
          onHapus={handleDelete}
          onPrint={() => setIsPrintOpen(true)}
          onFind={handleFind}
          isBusy={isBusy}
          feedback={feedback}
        />
      </div>

      <div className="shrink-0 bg-[#ECE9D8] px-3 py-2 flex flex-col gap-1.5 text-[11px]">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-black w-[105px] text-right">Periode :</span>
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

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-black w-[105px] text-right">Jenis Transaksi :</span>
            <select
              value={jenisTransaksi}
              onChange={(e) => setJenisTransaksi(e.target.value)}
              className="w-[300px] h-[22px] px-1.5 bg-white border border-[#7A7A7A] text-[11px] text-black outline-none cursor-pointer"
            >
              <option value="Semua Berdasarkan Periode">Semua Berdasarkan Periode</option>
              <option value="Outstanding SO (Belum Lunas Kirim)">
                Outstanding SO (Belum Lunas Kirim)
              </option>
              <option value="Closed SO">Closed SO</option>
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

      <div className="flex-1 overflow-hidden px-2 pb-2 flex gap-2">
        <div className="flex-1 overflow-auto bg-[#F0F0F0] border border-[#808080] relative shadow-inner">
          <table className="border-collapse text-left whitespace-nowrap text-[11px] w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                <th
                  className="px-2 py-0.5 text-center font-normal text-[11px] border-r border-[#ACA899]"
                  colSpan={10}
                >
                  S.O DETAIL
                </th>
              </tr>
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899] font-normal">
                <th className="border-r border-[#ACA899] w-[20px] px-1 py-0.5 text-center font-normal" />
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[92px]">No.SO</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[86px]">No.PO</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[155px]">Customer</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[88px]">Kode Barang</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[180px]">Nama Barang</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[48px]">Unit</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[52px]">Pesan</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[52px]">Kirim</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[52px]">Sisa</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500 italic bg-white">
                    Tidak ada data Mutasi Sales Order
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handleEdit}
                      className={`border-b border-[#D4D0C8] cursor-pointer ${
                        isSelected
                          ? 'bg-[#DCEBFC] text-black font-semibold'
                          : 'bg-white text-black hover:bg-[#F2F6FC]'
                      }`}
                    >
                      <td className="border-r border-[#ACA899] bg-[#ECE9D8] px-1 py-0.5 text-center font-bold text-[10px]">
                        {isSelected ? '▸' : ''}
                      </td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">{item.noSo}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">{item.noPo}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">{item.customer}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">{item.kodeBarang}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">{item.namaBarang}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-center">{item.unit}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right">{item.pesan}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right">{item.kirim}</td>
                      <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right">{item.sisa}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="w-[265px] shrink-0 overflow-auto bg-[#F0F0F0] border border-[#808080] relative shadow-inner">
          <table className="border-collapse text-left whitespace-nowrap text-[11px] w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899]">
                <th
                  className="px-2 py-0.5 text-center font-normal text-[11px] border-r border-[#ACA899]"
                  colSpan={4}
                >
                  S.J DETAIL
                </th>
              </tr>
              <tr className="bg-[#ECE9D8] text-black border-b border-[#ACA899] font-normal">
                <th className="border-r border-[#ACA899] w-[20px] px-1 py-0.5 text-center font-normal" />
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[76px]">No.SJ</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[68px]">Tanggal</th>
                <th className="border-r border-[#ACA899] px-2 py-0.5 font-normal text-center w-[42px]">Qty</th>
              </tr>
            </thead>
            <tbody>
              {visibleSjList.length === 0 ? (
                <tr className="bg-white border-b border-[#ACA899] h-[22px]">
                  <td className="border-r border-[#ACA899] bg-[#ECE9D8] px-1 py-0.5 text-center font-bold text-black">*</td>
                  <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5" />
                  <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5" />
                  <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5" />
                </tr>
              ) : (
                visibleSjList.map((sj) => (
                  <tr key={sj.id} className="border-b border-[#ACA899] bg-white text-black">
                    <td className="border-r border-[#ACA899] bg-[#ECE9D8] px-1 py-0.5 text-center font-bold text-black">*</td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">{sj.noSj}</td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5">{sj.tanggal}</td>
                    <td className="border-r border-[#7A7A7A]/40 px-2 py-0.5 text-right">{sj.qty}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#0A246A] shadow-2xl w-[460px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs shrink-0">
              <span>{editingId ? 'Koreksi Mutasi Sales Order' : 'Tambah Mutasi Sales Order Baru'}</span>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setIsAddOpen(false);
                }}
                className="w-[16px] h-[16px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form noValidate onSubmit={handleSaveForm} className="p-4 space-y-2.5 text-xs overflow-y-auto">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. SO:</label>
                <input
                  type="text"
                  value={formNoSo}
                  onChange={(e) => setFormNoSo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. PO:</label>
                <input
                  type="text"
                  value={formNoPo}
                  onChange={(e) => setFormNoPo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Customer:</label>
                <input
                  type="text"
                  value={formCustomer}
                  onChange={(e) => setFormCustomer(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Kode Barang:</label>
                <input
                  type="text"
                  value={formKodeBarang}
                  onChange={(e) => setFormKodeBarang(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Nama Barang:</label>
                <input
                  type="text"
                  value={formNamaBarang}
                  onChange={(e) => setFormNamaBarang(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Unit:</label>
                <input
                  type="text"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A] uppercase"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Pesan / Kirim / Sisa:</label>
                <div className="col-span-2 flex gap-2">
                  <input
                    type="number"
                    value={formPesan}
                    onChange={(e) => setFormPesan(e.target.value)}
                    className="w-1/3 px-2 py-1 bg-white border border-[#7A7A7A] text-right font-mono"
                    placeholder="Pesan"
                  />
                  <input
                    type="number"
                    value={formKirim}
                    onChange={(e) => setFormKirim(e.target.value)}
                    className="w-1/3 px-2 py-1 bg-white border border-[#7A7A7A] text-right font-mono"
                    placeholder="Kirim"
                  />
                  <input
                    type="number"
                    readOnly
                    value={Math.max(0, (parseInt(formPesan || '0', 10) || 0) - (parseInt(formKirim || '0', 10) || 0))}
                    title="Sisa otomatis (Pesan - Kirim)"
                    className="w-1/3 px-2 py-1 bg-[#EAE6D9] border border-[#7A7A7A] text-right font-mono font-bold"
                  />
                </div>
              </div>
              {modalError && (
                <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                  ⚠ {modalError}
                </div>
              )}
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#C0C0C0]">
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="px-3 py-1 bg-[#ECE9D8] border border-[#7A7A7A] text-xs hover:bg-[#F3F2F1] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="px-3 py-1 bg-[#0A246A] text-white border border-black text-xs hover:bg-[#163994] cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <A4PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="LAPORAN MUTASI SALES ORDER"
        subtitle={`Periode: ${periodeStart} s/d ${periodeEnd} | ${jenisTransaksi}`}
        orientation="landscape"
        columns={[
          { header: 'No.SO', accessor: 'noSo', width: '95px' },
          { header: 'No.PO', accessor: 'noPo', width: '90px' },
          { header: 'Customer', accessor: 'customer' },
          { header: 'Kode Barang', accessor: 'kodeBarang', width: '85px' },
          { header: 'Nama Barang', accessor: 'namaBarang' },
          { header: 'Unit', accessor: 'unit', align: 'center', width: '48px' },
          { header: 'Pesan', accessor: 'pesan', align: 'right', width: '55px' },
          { header: 'Kirim', accessor: 'kirim', align: 'right', width: '55px' },
          { header: 'Sisa', accessor: 'sisa', align: 'right', width: '55px' },
        ]}
        rows={filteredList}
        summaryItems={[
          { label: 'Total Item', value: `${filteredList.length} Baris` },
          {
            label: 'Total Sisa Kirim',
            value: String(filteredList.reduce((acc, r) => acc + r.sisa, 0)),
          },
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
                { label: 'No. PO', value: activeSelectedSo.noPo || '-' },
                { label: 'Customer', value: activeSelectedSo.customer || '-' },
                { label: 'Kode Barang', value: activeSelectedSo.kodeBarang || '-' },
                { label: 'Nama Barang', value: activeSelectedSo.namaBarang || '-' },
                { label: 'Pesan / Kirim / Sisa', value: `${activeSelectedSo.pesan} / ${activeSelectedSo.kirim} / ${activeSelectedSo.sisa}` },
              ]
            : undefined
        }
        selectedSummaryItems={
          activeSelectedSo
            ? [
                { label: 'Qty Pesan', value: `${activeSelectedSo.pesan} ${activeSelectedSo.unit}` },
                { label: 'Qty Kirim', value: `${activeSelectedSo.kirim} ${activeSelectedSo.unit}` },
                { label: 'Sisa Kirim', value: `${activeSelectedSo.sisa} ${activeSelectedSo.unit}` },
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
        getSearchValues={(r) => [r.noSo, r.noPo, r.customer, r.kodeBarang, r.namaBarang, r.unit]}
        initialQuery={searchTerm}
        isBusy={isBusy}
        onSearchSupabase={(q) => {
          setSearchField('Semua');
          setSearchTerm(q);
          return loadData({ field: 'Semua', term: q });
        }}
        onRefreshSupabase={() => {
          setSearchField('Semua');
          setSearchTerm('');
          setJenisTransaksi('Semua Berdasarkan Periode');
          return loadData({ field: 'Semua', term: '' });
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
          { header: 'Pesan', accessor: (r) => String(r.pesan), widthClass: 'w-14', align: 'right', mono: true },
          { header: 'Kirim', accessor: (r) => String(r.kirim), widthClass: 'w-14', align: 'right', mono: true },
          { header: 'Sisa', accessor: (r) => String(r.sisa), widthClass: 'w-14', align: 'right', mono: true, bold: true },
        ]}
      />
    </div>
  );
};
