import React, { useState } from 'react';

export interface PurchaseRequestItem {
  id: string;
  noPr: string;
  tanggal: string;
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

export const ListPurchaseRequestForm: React.FC<ListPurchaseRequestFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [prList, setPrList] = useState<PurchaseRequestItem[]>([
    {
      id: '1',
      noPr: 'PR/2026/08/001',
      tanggal: '01-08-2026',
      deliveryTo: 'Gudang Utama Jakarta',
      delivery: 'Darat',
      noPo: 'PO/2026/08/010',
      dibuatOleh: 'RETNO',
      tglCreated: '01-08-2026 09:30',
      diupdateOleh: 'RETNO',
      tglUpdate: '01-08-2026 10:15',
    },
    {
      id: '2',
      noPr: 'PR/2026/08/002',
      tanggal: '05-08-2026',
      deliveryTo: 'Cabang Surabaya',
      delivery: 'Laut',
      noPo: '-',
      dibuatOleh: 'ADMIN',
      tglCreated: '05-08-2026 14:20',
      diupdateOleh: '-',
      tglUpdate: '-',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('No.PR');
  const [tanggalFilter, setTanggalFilter] = useState<string>('01-08-2026');
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  // Add New Modal
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoPr, setNewNoPr] = useState<string>('PR/2026/08/003');
  const [newTanggal, setNewTanggal] = useState<string>('2026-08-10');
  const [newDeliveryTo, setNewDeliveryTo] = useState<string>('');
  const [newDelivery, setNewDelivery] = useState<string>('Darat');
  const [newNoPo, setNewNoPo] = useState<string>('-');

  if (!isOpen) return null;

  const handleAddNew = () => {
    setNewNoPr(`PR/2026/08/${String(prList.length + 3).padStart(3, '0')}`);
    setNewTanggal(new Date().toISOString().split('T')[0]);
    setNewDeliveryTo('');
    setNewDelivery('Darat');
    setNewNoPo('-');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoPr.trim()) return;

    const newItem: PurchaseRequestItem = {
      id: Date.now().toString(),
      noPr: newNoPr.trim().toUpperCase(),
      tanggal: newTanggal,
      deliveryTo: newDeliveryTo.trim().toUpperCase(),
      delivery: newDelivery.trim(),
      noPo: newNoPo.trim().toUpperCase(),
      dibuatOleh: 'RETNO',
      tglCreated: new Date().toLocaleString(),
      diupdateOleh: '-',
      tglUpdate: '-',
    };

    setPrList([newItem, ...prList]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus Purchase Request ini?')) {
      const updated = prList.filter((item) => item.id !== id);
      setPrList(updated);
      if (selectedId === id && updated.length > 0) {
        setSelectedId(updated[0].id);
      }
    }
  };

  const filteredPrList = prList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'No.PR') {
      return item.noPr.toLowerCase().includes(term);
    } else if (searchField === 'Delivery To') {
      return item.deliveryTo.toLowerCase().includes(term);
    } else if (searchField === 'No. PO') {
      return item.noPo.toLowerCase().includes(term);
    }
    return item.noPr.toLowerCase().includes(term) || item.deliveryTo.toLowerCase().includes(term);
  });

  const sqlQueryCode = `-- ==========================================
-- SQL Query untuk Supabase: Table "purchase_request"
-- Sesuai form: List Purchase Request
-- ==========================================

CREATE TABLE IF NOT EXISTS public.purchase_request (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    no_pr VARCHAR(50) NOT NULL UNIQUE,
    tanggal DATE NOT NULL,
    delivery_to VARCHAR(255),
    delivery VARCHAR(100),
    no_po VARCHAR(50),
    dibuat_oleh VARCHAR(100),
    tgl_created TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    diupdate_oleh VARCHAR(100),
    tgl_update TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_pr_no_pr ON public.purchase_request(no_pr);
CREATE INDEX IF NOT EXISTS idx_pr_tanggal ON public.purchase_request(tanggal);

-- Enable RLS
ALTER TABLE public.purchase_request ENABLE ROW LEVEL SECURITY;
`;

  return (
    <div
      id="list-purchase-request-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans text-xs"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner */}
        <div className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]">
          <div className="flex items-center space-x-3">
            <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
              List Purchase Request
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-2 py-0.5 bg-[#2B579A] text-white rounded text-[11px] font-medium hover:bg-[#1F4E79] border border-white/40 flex items-center gap-1 shadow-sm cursor-pointer"
              title="Lihat SQL Query Supabase"
            >
              <span>Supabase SQL</span>
            </button>
            <button
              type="button"
              title="Tampilan Tabel"
              className="w-[24px] h-[22px] bg-[#1F4E79] border border-white/80 rounded-[1px] flex items-center justify-center p-[2px] hover:brightness-110 cursor-pointer"
            >
              <div className="w-full h-full border border-white/60 grid grid-cols-2 gap-[1px] bg-white p-[1px]">
                <div className="bg-[#2B579A] col-span-2 h-[3px]" />
                <div className="bg-[#E7EFF9] h-[4px]" />
                <div className="bg-[#E7EFF9] h-[4px]" />
              </div>
            </button>
            <button
              type="button"
              title="Export Excel"
              className="w-[24px] h-[22px] bg-[#107C41] border border-white/80 rounded-[1px] flex items-center justify-center text-white font-bold text-[10px] hover:brightness-110 cursor-pointer"
            >
              X
            </button>
          </div>
        </div>

        {/* 2. Sub-toolbar with Add New & Tanggal Filter */}
        <div className="shrink-0 flex items-center justify-between bg-[#ECE9D8] px-3 py-1.5 border-b border-[#C0C0C0]">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleAddNew}
              className="px-3 py-1 bg-[#E1DFDD] hover:bg-[#F3F2F1] active:bg-[#C8C6C4] border border-[#ADABA1] text-black font-semibold rounded-[2px] shadow-xs flex items-center space-x-1 cursor-pointer"
            >
              <span>Add New</span>
            </button>
            <div className="flex items-center space-x-1">
              <span className="text-gray-800 font-medium">Tanggal :</span>
              <input
                type="text"
                value={tanggalFilter}
                onChange={(e) => setTanggalFilter(e.target.value)}
                className="w-24 px-1.5 py-0.5 bg-white border border-[#7A7A7A] rounded-xs text-xs focus:outline-none"
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
            Rp {prList.length > 0 ? '0' : '0'}
          </div>
        </div>

        {/* 3. Main Data Table Container with Horizontal & Vertical Scrollbars */}
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
                      className={`cursor-pointer border-b border-[#E0E0E0] ${
                        isSelected ? 'bg-[#316AC5] text-white' : idx % 2 === 0 ? 'bg-white hover:bg-[#F5F5F5]' : 'bg-[#FAFAFA] hover:bg-[#F5F5F5]'
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
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
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

        {/* 4. Footer & Search Bar */}
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
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari data..."
              className="w-64 px-1.5 py-0.5 bg-white border border-[#7A7A7A] rounded-xs text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-64 h-5 bg-[#FFFF99] border border-[#C0C0C0] rounded-xs" />
            <div className="text-gray-800 font-medium">Record : {filteredPrList.length}</div>
          </div>
        </div>

        {/* Add New Modal Dialog */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] rounded shadow-2xl w-[420px] overflow-hidden">
              <div className="bg-gradient-to-r from-[#0055EA] to-[#2B579A] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
                <span>Tambah Purchase Request Baru</span>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-white hover:bg-red-600 px-1.5 rounded"
                >
                  X
                </button>
              </div>
              <form onSubmit={handleSaveNew} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">No.PR:</label>
                  <input
                    type="text"
                    value={newNoPr}
                    onChange={(e) => setNewNoPr(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Tanggal:</label>
                  <input
                    type="date"
                    value={newTanggal}
                    onChange={(e) => setNewTanggal(e.target.value)}
                    required
                    className="w-72 px-2 py-1 bg-white border border-[#7A7A7A] rounded text-xs"
                  />
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
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#D0D0D0]">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-3 py-1 bg-[#E1DFDD] border border-[#ADABA1] rounded text-xs hover:bg-[#F3F2F1]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#0055EA] text-white border border-blue-800 rounded text-xs hover:bg-blue-700"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Supabase SQL Query Modal */}
        {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#ECE9D8] border-2 border-[#0055EA] rounded shadow-2xl w-[650px] overflow-hidden">
              <div className="bg-gradient-to-r from-[#0055EA] to-[#2B579A] text-white px-3 py-1.5 flex justify-between items-center font-bold text-xs">
                <span>Supabase SQL Query - List Purchase Request</span>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="text-white hover:bg-red-600 px-1.5 rounded cursor-pointer"
                >
                  X
                </button>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-gray-700">
                  Salin dan jalankan SQL Query berikut di SQL Editor Supabase Anda:
                </p>
                <textarea
                  readOnly
                  value={sqlQueryCode}
                  rows={16}
                  className="w-full font-mono text-xs p-2 bg-gray-900 text-green-400 border border-gray-700 rounded select-all"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(sqlQueryCode);
                      alert('SQL Query berhasil disalin ke clipboard!');
                    }}
                    className="px-3 py-1 bg-[#0055EA] text-white font-medium rounded text-xs hover:bg-blue-700 cursor-pointer"
                  >
                    Salin SQL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
