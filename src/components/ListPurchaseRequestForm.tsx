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
  nextUniqueCode,
  toDisplayDmy,
  todayIso,
  toIsoDate,
} from '../lib/erpApi';
import { exportToExcel } from '../lib/exportExcel';

export interface PurchaseRequestItem {
  id: string;
  noPr: string;
  tanggal: string;
  tanggalIso: string;
  deliveryTo: string;
  delivery: string;
  noPo: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListPurchaseRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function mapDbToPr(r: any): PurchaseRequestItem {
  return {
    id: r.id,
    noPr: r.no_pr || '',
    tanggal: toDisplayDmy(r.tanggal),
    tanggalIso: toIsoDate(r.tanggal) || '',
    deliveryTo: r.delivery_to || '',
    delivery: r.delivery || '',
    noPo: r.no_po || '-',
    dibuatOleh: r.dibuat_oleh || 'RETNO',
    tglCreated: toDisplayDmy(r.tgl_created),
    diupdateOleh: r.diupdate_oleh || '-',
    tglUpdate: toDisplayDmy(r.tgl_update) || '-',
  };
}

export const ListPurchaseRequestForm: React.FC<ListPurchaseRequestFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [prList, setPrList] = useState<PurchaseRequestItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('No.PR');
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua');

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoPr, setNewNoPr] = useState<string>('');
  const [newTanggal, setNewTanggal] = useState<string>('');
  const [newDeliveryTo, setNewDeliveryTo] = useState<string>('');
  const [newDelivery, setNewDelivery] = useState<string>('Darat');
  const [newNoPo, setNewNoPo] = useState<string>('-');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const loadData = async (): Promise<boolean> => {
    try {
      setIsBusy(true);
      const rows = await erpList<any>('purchase_requests', { orderBy: 'tanggal', asc: false });
      const mapped = rows.map(mapDbToPr);
      setPrList(mapped);
      if (mapped.length > 0 && !mapped.some((r) => r.id === selectedId)) {
        setSelectedId(mapped[0].id);
      }
      return true;
    } catch (err: any) {
      showFeedback(`Gagal load: ${err.message}`);
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolbarSimpan = async () => {
    const ok = await loadData();
    if (ok) showFeedback('Data tersinkronisasi dengan database Supabase');
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNew = () => {
    setEditingId(null);
    setModalError(null);
    setNewNoPr(nextUniqueCode(prList.map((p) => p.noPr), 'PR/2026/08/', 3));
    setNewTanggal(toDisplayDmy(todayIso()));
    setNewDeliveryTo('');
    setNewDelivery('Darat');
    setNewNoPo('-');
    setIsAddOpen(true);
  };

  const handleEdit = () => {
    const item = prList.find((p) => p.id === selectedId);
    if (!item) {
      showFeedback('Pilih baris terlebih dahulu');
      return;
    }
    setEditingId(item.id);
    setModalError(null);
    setNewNoPr(item.noPr);
    setNewTanggal(item.tanggal || toDisplayDmy(todayIso()));
    setNewDeliveryTo(item.deliveryTo);
    setNewDelivery(item.delivery);
    setNewNoPo(item.noPo);
    setIsAddOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newNoPr.trim()) {
      setModalError('No.PR wajib diisi.');
      return;
    }

    try {
      setIsBusy(true);
      if (editingId) {
        const saved = await erpUpdate<any>('purchase_requests', editingId, {
          no_pr: newNoPr.trim().toUpperCase(),
          tanggal: toIsoDate(newTanggal) || todayIso(),
          delivery_to: newDeliveryTo.trim().toUpperCase(),
          delivery: newDelivery.trim(),
          no_po: newNoPo.trim().toUpperCase(),
          diupdate_oleh: 'RETNO',
          tgl_update: todayIso(),
        });
        const mapped = mapDbToPr(saved);
        setPrList(prList.map((p) => (p.id === editingId ? mapped : p)));
        showFeedback('Purchase Request diperbarui');
      } else {
        const saved = await erpCreate<any>('purchase_requests', {
          no_pr: newNoPr.trim().toUpperCase(),
          tanggal: toIsoDate(newTanggal) || todayIso(),
          delivery_to: newDeliveryTo.trim().toUpperCase(),
          delivery: newDelivery.trim(),
          no_po: newNoPo.trim().toUpperCase(),
          dibuat_oleh: 'RETNO',
          tgl_created: todayIso(),
          diupdate_oleh: '-',
          tgl_update: null,
        });
        const mapped = mapDbToPr(saved);
        setPrList([mapped, ...prList]);
        setSelectedId(mapped.id);
        showFeedback('Purchase Request tersimpan');
      }
      setIsAddOpen(false);
      setEditingId(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan Purchase Request';
      setModalError(msg);
      showFeedback(`Gagal simpan: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsBusy(true);
      await erpDelete('purchase_requests', id);
      const updated = prList.filter((item) => item.id !== id);
      setPrList(updated);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || '');
      }
      showFeedback('Purchase Request dihapus');
    } catch (err: any) {
      showFeedback(`Gagal hapus: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const filterIso = tanggalFilter && tanggalFilter !== 'Semua' ? toIsoDate(tanggalFilter) : null;

  const filteredPrList = prList.filter((item) => {
    if (filterIso && item.tanggalIso !== filterIso) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'No.PR') return item.noPr.toLowerCase().includes(term);
    if (searchField === 'Delivery To') return item.deliveryTo.toLowerCase().includes(term);
    if (searchField === 'No. PO') return item.noPo.toLowerCase().includes(term);
    return item.noPr.toLowerCase().includes(term) || item.deliveryTo.toLowerCase().includes(term);
  });

  const handleFind = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const handleExportExcel = async () => {
    const company = await fetchActiveCompanyProfile();
    exportToExcel({
      fileName: 'List_Purchase_Request',
      sheetTitle: 'LIST PURCHASE REQUEST',
      subtitle: `Filter Tanggal: ${tanggalFilter}`,
      companyProfile: company,
      columns: [
        { header: 'No.PR', accessor: 'noPr' },
        { header: 'Tanggal', accessor: 'tanggal', align: 'center' },
        { header: 'Delivery To', accessor: 'deliveryTo' },
        { header: 'Delivery', accessor: 'delivery' },
        { header: 'No. PO', accessor: 'noPo' },
        { header: 'Dibuat Oleh', accessor: 'dibuatOleh' },
        { header: 'Tgl Created', accessor: 'tglCreated', align: 'center' },
      ],
      rows: filteredPrList,
    });
    showFeedback('Export Excel selesai');
  };

  return (
    <div
      id="list-purchase-request-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        <FormHeaderBanner
          title="List Purchase Request"
          onClose={onClose}
          onFind={handleFind}
          onPrint={() => setIsPrintOpen(true)}
          onTableView={loadData}
          onExportExcel={handleExportExcel}
        />

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0] overflow-x-auto">
          <div className="flex items-center space-x-3">
            <FormActionButtons
              onSimpan={handleToolbarSimpan}
              onBaru={handleAddNew}
              onKoreksi={handleEdit}
              onHapus={() => (selectedId ? handleDelete(selectedId) : showFeedback('Pilih data yang akan dihapus'))}
              onPrint={() => setIsPrintOpen(true)}
              onFind={handleFind}
              isBusy={isBusy}
              feedback={feedback}
            />
            <div className="flex items-center space-x-1">
              <span className="text-gray-800 font-medium">Tanggal :</span>
              <DatePickerInput
                value={tanggalFilter === 'Semua' ? '' : tanggalFilter}
                onChange={(formatted) => setTanggalFilter(formatted || 'Semua')}
                format="dmy"
                placeholder="Semua"
              />
              <button
                type="button"
                onClick={() => setTanggalFilter('Semua')}
                className="px-2 py-0.5 bg-[#E1DFDD] hover:bg-[#F3F2F1] border border-[#ADABA1] text-xs rounded-xs cursor-pointer"
              >
                Semua
              </button>
            </div>
          </div>

          <div className="font-bold text-sm text-gray-900 pr-2">
            Total PR : {filteredPrList.length}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white border border-[#999999] m-1.5 relative shadow-inner">
          <table className="w-full border-collapse text-left min-w-[1000px]">
            <thead className="sticky top-0 bg-[#F0F0F0] text-gray-800 font-semibold border-b border-[#C0C0C0] z-10">
              <tr>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0] text-center w-12">No</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No.PR</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tanggal</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Delivery To</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Delivery</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">No. PO</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Dibuat Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl Created</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">DiUpdate Oleh</th>
                <th className="px-2 py-1.5 border-r border-[#C0C0C0]">Tgl.Update</th>
                <th className="px-2 py-1.5 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500 italic">
                    Tidak ada data Purchase Request
                  </td>
                </tr>
              ) : (
                filteredPrList.map((item, idx) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={handleEdit}
                      className={`cursor-pointer border-b border-[#E0E0E0] ${
                        isSelected
                          ? 'bg-[#316AC5] text-white'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-[#F5F5F5]'
                          : 'bg-[#FAFAFA] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-center">{idx + 1}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] font-mono font-medium">{item.noPr}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.tanggal}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.deliveryTo}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.delivery}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.noPo}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.dibuatOleh}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-[11px]">{item.tglCreated}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0]">{item.diupdateOleh}</td>
                      <td className="px-2 py-1 border-r border-[#E0E0E0] text-[11px]">{item.tglUpdate}</td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                            isSelected ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-t border-[#C0C0C0]">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-800">Search :</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="bg-white border border-[#7A7A7A] px-1.5 py-0.5 rounded-xs text-xs"
            >
              <option value="No.PR">No.PR</option>
              <option value="Delivery To">Delivery To</option>
              <option value="No. PO">No. PO</option>
            </select>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari data..."
              className="w-64 px-1.5 py-0.5 bg-white border border-[#7A7A7A] rounded-xs text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-64 h-5 bg-[#FFFF99] border border-[#C0C0C0] rounded-xs px-2 text-[10px] flex items-center text-gray-700 truncate">
              {prList.find((r) => r.id === selectedId)?.deliveryTo || ''}
            </div>
            <div className="text-gray-800 font-medium">Record : {filteredPrList.length}</div>
          </div>
        </div>

        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] rounded shadow-2xl w-[440px] overflow-hidden">
              <div className="bg-gradient-to-r from-[#0055EA] to-[#2B579A] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
                <span>{editingId ? 'Koreksi Purchase Request' : 'Tambah Purchase Request Baru'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setIsAddOpen(false);
                  }}
                  className="text-white hover:bg-red-600 px-1.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form noValidate onSubmit={handleSaveNew} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">No.PR:</label>
                  <input
                    type="text"
                    value={newNoPr}
                    onChange={(e) => setNewNoPr(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs uppercase"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Tanggal:</label>
                  <div className="w-72">
                    <DatePickerInput
                      value={newTanggal}
                      onChange={(formatted) => setNewTanggal(formatted)}
                      format="dmy"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Delivery To:</label>
                  <input
                    type="text"
                    value={newDeliveryTo}
                    onChange={(e) => setNewDeliveryTo(e.target.value)}
                    placeholder="Contoh: Gudang Utama"
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Delivery:</label>
                  <input
                    type="text"
                    value={newDelivery}
                    onChange={(e) => setNewDelivery(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">No. PO:</label>
                  <input
                    type="text"
                    value={newNoPo}
                    onChange={(e) => setNewNoPo(e.target.value)}
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                  />
                </div>
                {modalError && (
                  <div className="bg-[#FFF0F0] border border-[#C00000] text-[#900000] px-2.5 py-1.5 text-[11px] font-semibold">
                    ⚠ {modalError}
                  </div>
                )}
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#D0D0D0]">
                  <button
                    type="button"
                    onClick={() => {
                      setModalError(null);
                      setIsAddOpen(false);
                    }}
                    className="px-3 py-1 bg-[#E1DFDD] border border-[#ADABA1] rounded text-xs hover:bg-[#F3F2F1] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="px-3 py-1 bg-[#0055EA] text-white border border-blue-800 rounded text-xs hover:bg-blue-700 cursor-pointer"
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
          title="LAPORAN PURCHASE REQUEST"
          subtitle={`Filter Tanggal: ${tanggalFilter}`}
          orientation="landscape"
          columns={[
            { header: 'No.PR', accessor: 'noPr', width: '120px' },
            { header: 'Tanggal', accessor: 'tanggal', align: 'center', width: '85px' },
            { header: 'Delivery To', accessor: 'deliveryTo' },
            { header: 'Delivery', accessor: 'delivery', width: '85px' },
            { header: 'No. PO', accessor: 'noPo', width: '110px' },
            { header: 'Dibuat Oleh', accessor: 'dibuatOleh', width: '85px' },
          ]}
          rows={filteredPrList}
          summaryItems={[{ label: 'Total Record', value: `${filteredPrList.length} Dokumen` }]}
        />
      </div>
    </div>
  );
};
