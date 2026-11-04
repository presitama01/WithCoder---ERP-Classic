import React, { useState } from 'react';

export interface FakturPenjualanItem {
  id: string;
  noBukti: string;
  tanggal: string;
  namaCustomer: string;
  noSo: string;
  poNo: string;
  noSj: string;
  noFakturPajak: string;
  sales: string;
  jthTmp: string;
  keterangan: string;
  ppn: string;
  nilaiPenjualan: string;
  stsLunas: string;
  tglLunas: string;
  stsPrint: string;
  tglPrint: string;
  stsPost: string;
  tglPost: string;
  dibuatOleh: string;
  tglCreated: string;
  diupdateOleh: string;
  tglUpdate: string;
}

interface ListFakturPenjualanFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ListFakturPenjualanForm: React.FC<ListFakturPenjualanFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [fakturList, setFakturList] = useState<FakturPenjualanItem[]>([
    {
      id: '1',
      noBukti: 'INJ-1808-0124',
      tanggal: '08-Aug-2018',
      namaCustomer: 'PT.Panca Mulia Sejahtera',
      noSo: '1808-SO-INJ-001',
      poNo: '03/PMS-PO/VIII/18',
      noSj: '003',
      noFakturPajak: '010.002.18-36287017',
      sales: '05',
      jthTmp: '08-Aug-2018',
      keterangan: '',
      ppn: '10.',
      nilaiPenjualan: '1,650,000.',
      stsLunas: 'Not Yet',
      tglLunas: '',
      stsPrint: 'Not Yet',
      tglPrint: '',
      stsPost: 'Not Yet',
      tglPost: '',
      dibuatOleh: 'RETNO',
      tglCreated: '08-Aug-2018',
      diupdateOleh: '',
      tglUpdate: '',
    },
    {
      id: '2',
      noBukti: 'INJ-1808-0125',
      tanggal: '09-Aug-2018',
      namaCustomer: 'PT. NANDYA KARYA PERKASA',
      noSo: '1807-SO-INJ-003',
      poNo: '500201802481',
      noSj: '002',
      noFakturPajak: '010.005.18-20780410',
      sales: '01',
      jthTmp: '09-Aug-2018',
      keterangan: '',
      ppn: '10.',
      nilaiPenjualan: '3,542,550.',
      stsLunas: 'Not Yet',
      tglLunas: '',
      stsPrint: 'Not Yet',
      tglPrint: '',
      stsPost: 'Not Yet',
      tglPost: '',
      dibuatOleh: 'RETNO',
      tglCreated: '13-Aug-2018',
      diupdateOleh: 'RETNO',
      tglUpdate: '13-Aug-2018',
    },
    {
      id: '3',
      noBukti: 'INJ-1808-0126',
      tanggal: '09-Aug-2018',
      namaCustomer: 'PT. NANDYA KARYA PERKASA',
      noSo: '1807-SO-INJ-002',
      poNo: '500201802486',
      noSj: '001',
      noFakturPajak: '010.005.18-20780410',
      sales: '01',
      jthTmp: '09-Aug-2018',
      keterangan: '',
      ppn: '10.',
      nilaiPenjualan: '8,056,950.',
      stsLunas: 'Not Yet',
      tglLunas: '',
      stsPrint: 'Not Yet',
      tglPrint: '',
      stsPost: 'Not Yet',
      tglPost: '',
      dibuatOleh: 'RETNO',
      tglCreated: '13-Aug-2018',
      diupdateOleh: '',
      tglUpdate: '',
    },
    {
      id: '4',
      noBukti: 'INJ-1808-0127',
      tanggal: '14-Aug-2018',
      namaCustomer: 'PT. FEDERAL NITTAN',
      noSo: '1805-SO-INJ-003',
      poNo: 'UMU2018040001',
      noSj: '004',
      noFakturPajak: '010.005.18-20780419',
      sales: '05',
      jthTmp: '13-Sep-2018',
      keterangan: '',
      ppn: '10.',
      nilaiPenjualan: '15,400,000.',
      stsLunas: 'Not Yet',
      tglLunas: '',
      stsPrint: 'Not Yet',
      tglPrint: '',
      stsPost: 'Not Yet',
      tglPost: '',
      dibuatOleh: 'RETNO',
      tglCreated: '13-Aug-2018',
      diupdateOleh: 'RETNO',
      tglUpdate: '27-Aug-2018',
    },
    {
      id: '5',
      noBukti: 'INJ-1808-0137',
      tanggal: '28-Aug-2018',
      namaCustomer: 'PT. BANGUNPERKASA',
      noSo: '1808-SO-INJ-003',
      poNo: 'KI1808-04813',
      noSj: '005',
      noFakturPajak: '010.005.18-20780416',
      sales: '05',
      jthTmp: '11-Sep-2018',
      keterangan: '',
      ppn: '10.',
      nilaiPenjualan: '5,390,000.',
      stsLunas: 'Not Yet',
      tglLunas: '',
      stsPrint: 'Not Yet',
      tglPrint: '',
      stsPost: 'Not Yet',
      tglPost: '',
      dibuatOleh: 'RETNO',
      tglCreated: '27-Aug-2018',
      diupdateOleh: '',
      tglUpdate: '',
    },
    {
      id: '6',
      noBukti: 'INJ-1811-0185',
      tanggal: '15-Nov-2018',
      namaCustomer: 'PT. NANDYA KARYA PERKASA',
      noSo: '1810-SO-INJ-001',
      poNo: '500201803616',
      noSj: '001',
      noFakturPajak: '010.005.18-20780473',
      sales: '031',
      jthTmp: '15-Dec-2018',
      keterangan: '',
      ppn: '10.',
      nilaiPenjualan: '4,827,900.',
      stsLunas: 'Not Yet',
      tglLunas: '',
      stsPrint: 'Not Yet',
      tglPrint: '',
      stsPost: 'Not Yet',
      tglPost: '',
      dibuatOleh: 'RETNO',
      tglCreated: '15-Nov-2018',
      diupdateOleh: '',
      tglUpdate: '',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Nama Pelanggan');
  const [tanggalFilter, setTanggalFilter] = useState<string>('');
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  // Add New Modal state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newNoBukti, setNewNoBukti] = useState<string>('INJ-1811-0186');
  const [newTanggal, setNewTanggal] = useState<string>('15-Nov-2018');
  const [newCustomer, setNewCustomer] = useState<string>('PT. NANDYA KARYA PERKASA');
  const [newNoSo, setNewNoSo] = useState<string>('1811-SO-INJ-002');
  const [newPoNo, setNewPoNo] = useState<string>('500201803620');
  const [newNoSj, setNewNoSj] = useState<string>('006');
  const [newNoFakturPajak, setNewNoFakturPajak] = useState<string>('010.005.18-20780480');
  const [newSales, setNewSales] = useState<string>('05');
  const [newJthTmp, setNewJthTmp] = useState<string>('15-Dec-2018');
  const [newKeterangan, setNewKeterangan] = useState<string>('');
  const [newPpn, setNewPpn] = useState<string>('10.');
  const [newNilaiPenjualan, setNewNilaiPenjualan] = useState<string>('2,500,000.');

  if (!isOpen) return null;

  const handleAddNew = () => {
    setNewNoBukti(`INJ-1811-018${fakturList.length + 1}`);
    setNewTanggal('15-Nov-2018');
    setNewCustomer('PT. NANDYA KARYA PERKASA');
    setNewNoSo('1811-SO-INJ-002');
    setNewPoNo('500201803620');
    setNewNoSj(`00${fakturList.length + 1}`);
    setNewNoFakturPajak(`010.005.18-2078048${fakturList.length + 1}`);
    setNewSales('05');
    setNewJthTmp('15-Dec-2018');
    setNewKeterangan('');
    setNewPpn('10.');
    setNewNilaiPenjualan('2,500,000.');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoBukti.trim()) return;

    const newItem: FakturPenjualanItem = {
      id: Date.now().toString(),
      noBukti: newNoBukti.trim().toUpperCase(),
      tanggal: newTanggal,
      namaCustomer: newCustomer.trim().toUpperCase(),
      noSo: newNoSo.trim().toUpperCase(),
      poNo: newPoNo.trim(),
      noSj: newNoSj.trim(),
      noFakturPajak: newNoFakturPajak.trim(),
      sales: newSales.trim(),
      jthTmp: newJthTmp.trim(),
      keterangan: newKeterangan.trim(),
      ppn: newPpn.trim(),
      nilaiPenjualan: newNilaiPenjualan.trim(),
      stsLunas: 'Not Yet',
      tglLunas: '',
      stsPrint: 'Not Yet',
      tglPrint: '',
      stsPost: 'Not Yet',
      tglPost: '',
      dibuatOleh: 'RETNO',
      tglCreated: newTanggal,
      diupdateOleh: '',
      tglUpdate: '',
    };

    setFakturList([newItem, ...fakturList]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data Faktur Penjualan ini?')) {
      const updated = fakturList.filter((item) => item.id !== id);
      setFakturList(updated);
      if (selectedId === id && updated.length > 0) {
        setSelectedId(updated[0].id);
      }
    }
  };

  const filteredList = fakturList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Nama Pelanggan') {
      return item.namaCustomer.toLowerCase().includes(term);
    } else if (searchField === 'No.Bukti') {
      return item.noBukti.toLowerCase().includes(term);
    } else if (searchField === 'No.SO') {
      return item.noSo.toLowerCase().includes(term);
    } else if (searchField === 'PO.No') {
      return item.poNo.toLowerCase().includes(term);
    } else if (searchField === 'No.SJ') {
      return item.noSj.toLowerCase().includes(term);
    } else if (searchField === 'No.Faktur Pajak') {
      return item.noFakturPajak.toLowerCase().includes(term);
    }
    return (
      item.noBukti.toLowerCase().includes(term) ||
      item.namaCustomer.toLowerCase().includes(term) ||
      item.noSo.toLowerCase().includes(term)
    );
  });

  const sqlQueryCode = `-- ==========================================
-- SQL Query untuk Supabase: Table "faktur_penjualan"
-- Sesuai form: List Faktur Penjualan
-- ==========================================

CREATE TABLE IF NOT EXISTS public.faktur_penjualan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    no_bukti VARCHAR(50) NOT NULL UNIQUE,
    tanggal VARCHAR(50) NOT NULL,
    nama_customer VARCHAR(255) NOT NULL,
    no_so VARCHAR(50),
    po_no VARCHAR(50),
    no_sj VARCHAR(50),
    no_faktur_pajak VARCHAR(50),
    sales VARCHAR(50),
    jth_tmp VARCHAR(50),
    keterangan TEXT,
    ppn VARCHAR(20) DEFAULT '10.',
    nilai_penjualan VARCHAR(50) DEFAULT '0',
    sts_lunas VARCHAR(20) DEFAULT 'Not Yet',
    tgl_lunas VARCHAR(50),
    sts_print VARCHAR(20) DEFAULT 'Not Yet',
    tgl_print VARCHAR(50),
    sts_post VARCHAR(20) DEFAULT 'Not Yet',
    tgl_post VARCHAR(50),
    dibuat_oleh VARCHAR(100),
    tgl_created VARCHAR(50),
    diupdate_oleh VARCHAR(100),
    tgl_update VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_fp_no_bukti ON public.faktur_penjualan(no_bukti);
CREATE INDEX IF NOT EXISTS idx_fp_customer ON public.faktur_penjualan(nama_customer);

-- Enable RLS
ALTER TABLE public.faktur_penjualan ENABLE ROW LEVEL SECURITY;
`;

  return (
    <div
      id="list-faktur-penjualan-container"
      className="absolute inset-4 z-30 flex flex-col bg-[#ECE9D8] border border-[#919191] shadow-2xl select-none overflow-hidden font-sans text-xs"
    >
      {/* 1. Black Window Header Banner */}
      <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs select-none">
        <div className="flex items-center space-x-2">
          <span>List Faktur Penjualan</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowSqlModal(true)}
            className="px-2 py-0.5 bg-[#D4D0C8] text-black border border-white/40 rounded text-[10px] font-semibold hover:bg-white active:bg-[#B5B3A8]"
            title="Lihat Script SQL Supabase"
          >
            SQL Code
          </button>
          <button
            onClick={onClose}
            className="w-5 h-5 bg-[#C0C0C0] text-black border border-white font-bold flex items-center justify-center hover:bg-red-600 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Action Toolbar & Filter Header */}
      <div className="bg-[#ECE9D8] border-b border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddNew}
            className="px-3 py-1 bg-[#F0EEEB] border border-[#919191] rounded shadow-sm hover:bg-[#E2DECD] active:bg-[#C5C1B4] flex items-center space-x-1 font-medium"
          >
            <span className="text-green-700 font-bold">＋</span>
            <span>Add New</span>
          </button>
          <button
            onClick={() => {
              if (selectedId) handleDelete(selectedId);
            }}
            className="px-3 py-1 bg-[#F0EEEB] border border-[#919191] rounded shadow-sm hover:bg-[#E2DECD] active:bg-[#C5C1B4] flex items-center space-x-1 font-medium"
          >
            <span className="text-red-700 font-bold">🗑</span>
            <span>Delete</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className="font-semibold">Tanggal :</span>
            <input
              type="text"
              value={tanggalFilter}
              onChange={(e) => setTanggalFilter(e.target.value)}
              className="px-2 py-0.5 w-24 bg-white border border-[#7A7A7A] text-xs font-mono"
            />
            <button className="px-2 py-0.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded text-xs hover:bg-[#D4D0C8]">
              ▼
            </button>
            <button
              onClick={() => setTanggalFilter('')}
              className="px-2 py-0.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded text-xs hover:bg-[#D4D0C8]"
            >
              Semua
            </button>
          </div>
          <div className="font-bold text-sm text-right px-3 py-0.5 bg-white border border-[#919191] min-w-[120px] shadow-inner">
            Rp 12,276,600
          </div>
        </div>
      </div>

      {/* 3. Main Data Table Container with Horizontal & Vertical Scrollbars */}
      <div className="flex-1 overflow-auto bg-white border border-[#7A7A7A] m-2 relative">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1900px]">
          <thead>
            <tr className="bg-[#ECE9D8] text-black border-b border-[#919191] text-[11px] font-semibold sticky top-0 z-10">
              <th className="border-r border-[#919191] px-2 py-1.5 w-8 text-center">▶</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Bukti</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tanggal</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Nama Customer</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.SO</th>
              <th className="border-r border-[#919191] px-3 py-1.5">PO.No</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.SJ</th>
              <th className="border-r border-[#919191] px-3 py-1.5">No.Faktur Pajak</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sales</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Jth.Tmp</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Keterangan</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-center">PPN</th>
              <th className="border-r border-[#919191] px-3 py-1.5 text-right">Nilai Penjualan</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Lunas</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Lunas</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Print</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Sts.Post</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Post</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Dibuat Oleh</th>
              <th className="border-r border-[#919191] px-3 py-1.5">Tgl.Created</th>
              <th className="border-r border-[#919191] px-3 py-1.5">DiUpdate Oleh</th>
              <th className="px-3 py-1.5">Tgl.Update</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`border-b border-[#00C000] cursor-pointer text-xs font-mono ${
                    isSelected
                      ? 'bg-[#00FF00] text-black font-semibold'
                      : 'bg-[#00E000] text-black hover:bg-[#00FF00]'
                  }`}
                  style={{ backgroundColor: '#00E800', color: '#000' }}
                >
                  <td className="border-r border-[#00B000] px-2 py-1 text-center font-bold">
                    {isSelected ? '▶' : ''}
                  </td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.noBukti}</td>
                  <td className="border-r border-[#00B000] px-3 py-1">{item.tanggal}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-medium font-sans">{item.namaCustomer}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.noSo}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.poNo}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-mono">{item.noSj}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-mono">{item.noFakturPajak}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.sales}</td>
                  <td className="border-r border-[#00B000] px-3 py-1">{item.jthTmp}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-sans">{item.keterangan || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.ppn}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-right font-semibold">{item.nilaiPenjualan}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-sans">{item.stsLunas}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.tglLunas || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-sans">{item.stsPrint}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.tglPrint || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center font-sans">{item.stsPost}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 text-center">{item.tglPost || '-'}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-sans">{item.dibuatOleh}</td>
                  <td className="border-r border-[#00B000] px-3 py-1">{item.tglCreated}</td>
                  <td className="border-r border-[#00B000] px-3 py-1 font-sans">{item.diupdateOleh || '-'}</td>
                  <td className="px-3 py-1">{item.tglUpdate || '-'}</td>
                </tr>
              );
            })}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={23} className="text-center py-6 text-gray-500">
                  Tidak ada data faktur penjualan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Bottom Search Bar & Record Status */}
      <div className="bg-[#ECE9D8] border-t border-[#D4D0C8] px-2 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">Search :</span>
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="px-2 py-0.5 bg-white border border-[#7A7A7A] text-xs rounded"
          >
            <option value="Nama Pelanggan">Nama Pelanggan</option>
            <option value="No.Bukti">No.Bukti</option>
            <option value="No.SO">No.SO</option>
            <option value="PO.No">PO.No</option>
            <option value="No.SJ">No.SJ</option>
            <option value="No.Faktur Pajak">No.Faktur Pajak</option>
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari data..."
            className="px-2 py-0.5 w-64 bg-white border border-[#7A7A7A] text-xs shadow-inner"
          />
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-64 h-5 bg-[#FFFF00] border border-[#919191] shadow-inner"></div>
          <div className="font-semibold px-2 py-0.5 bg-[#ECE9D8] border border-[#919191]">
            Record 1018
          </div>
        </div>
      </div>

      {/* Add New Modal */}
      {isAddOpen && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[550px] flex flex-col overflow-hidden max-h-[90vh]">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
              <span>Tambah Faktur Penjualan Baru</span>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-white hover:text-red-300 font-bold px-1.5"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNew} className="p-4 space-y-2 text-xs overflow-y-auto">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. Bukti:</label>
                <input
                  type="text"
                  value={newNoBukti}
                  onChange={(e) => setNewNoBukti(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Tanggal:</label>
                <input
                  type="text"
                  value={newTanggal}
                  onChange={(e) => setNewTanggal(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Nama Customer:</label>
                <input
                  type="text"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. SO:</label>
                <input
                  type="text"
                  value={newNoSo}
                  onChange={(e) => setNewNoSo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">PO.No:</label>
                <input
                  type="text"
                  value={newPoNo}
                  onChange={(e) => setNewPoNo(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. SJ:</label>
                <input
                  type="text"
                  value={newNoSj}
                  onChange={(e) => setNewNoSj(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">No. Faktur Pajak:</label>
                <input
                  type="text"
                  value={newNoFakturPajak}
                  onChange={(e) => setNewNoFakturPajak(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Sales:</label>
                <input
                  type="text"
                  value={newSales}
                  onChange={(e) => setNewSales(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Jth.Tmp:</label>
                <input
                  type="text"
                  value={newJthTmp}
                  onChange={(e) => setNewJthTmp(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Nilai Penjualan:</label>
                <input
                  type="text"
                  value={newNilaiPenjualan}
                  onChange={(e) => setNewNilaiPenjualan(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Keterangan:</label>
                <input
                  type="text"
                  value={newKeterangan}
                  onChange={(e) => setNewKeterangan(e.target.value)}
                  className="col-span-2 px-2 py-1 bg-white border border-[#7A7A7A]"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-[#D4D0C8]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-1.5 bg-[#E1DFD7] border border-[#7A7A7A] rounded hover:bg-[#D4D0C8]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#000084] text-white border border-[#000066] rounded hover:bg-[#0000A0]"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL Code Modal */}
      {showSqlModal && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] border-2 border-[#000084] rounded shadow-2xl w-[650px] flex flex-col overflow-hidden">
            <div className="bg-[#000084] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
              <span>SQL Query CODE untuk Supabase (Faktur Penjualan)</span>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-white hover:text-red-300 font-bold px-1.5"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-700">
                Salin kode SQL di bawah ini dan jalankan di SQL Editor Supabase Anda:
              </p>
              <textarea
                readOnly
                value={sqlQueryCode}
                className="w-full h-64 font-mono text-[11px] p-2 bg-white border border-[#7A7A7A] select-all"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sqlQueryCode);
                    alert('SQL Code berhasil disalin ke clipboard!');
                  }}
                  className="px-4 py-1.5 bg-[#000084] text-white rounded text-xs font-semibold hover:bg-[#0000A0]"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
