import React, { useState, useRef } from 'react';

export interface ExpedisiItem {
  id: string;
  kode: string;
  nama_expedisi: string;
  alamat: string;
  kota: string;
  phone1: string;
  phone2: string;
}

interface MasterExpedisiListFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterExpedisiListForm: React.FC<MasterExpedisiListFormProps> = ({
  isOpen,
  onClose,
}) => {
  const [expedisiList, setExpedisiList] = useState<ExpedisiItem[]>([
    { id: '1', kode: '033', nama_expedisi: 'ABS', alamat: 'JL.PENDIDIKAN NO.19-21', kota: 'JAKARTA', phone1: '021-860-7440', phone2: '' },
    { id: '2', kode: '074', nama_expedisi: 'AFRO', alamat: 'JL. RUKAN PERMATA ANCOL BLOK K NO. 33', kota: 'JAKARTA UTARA', phone1: '021 4462 3909', phone2: '' },
    { id: '3', kode: '097', nama_expedisi: 'AL TRANS', alamat: 'JL. AGUNG TIMUR NO.8 BLOK 2 RUKO PRIMA', kota: 'JAKARTA UTARA', phone1: '', phone2: '' },
    { id: '4', kode: '203', nama_expedisi: 'ANDALAS PERMAI', alamat: 'KOMPLEK DUTA HARAPAN INDAH BLOK SS NO. 32 &', kota: 'JAKARTA BARAT', phone1: '021 6623 620', phone2: '021 6623 630' },
    { id: '5', kode: '046', nama_expedisi: 'ANGKASA', alamat: 'RUKO MANGGA 2 PLAZA BLOK B NO.6 RUKO', kota: 'JAKARTA', phone1: '021-6120705', phone2: '' },
    { id: '6', kode: '075', nama_expedisi: 'ANUGERAH', alamat: 'JL. TUBAGUS ANGKE RUKO GRAWISA NO. 27', kota: 'JAKARTA BARAT', phone1: '021 5664422', phone2: '' },
    { id: '7', kode: '012', nama_expedisi: 'ATLAS', alamat: 'RUKO FANTASI BLOK Z3 NO.26', kota: 'JAKARTA', phone1: '021-7077-8646', phone2: '021-9748-5856' },
    { id: '8', kode: '022', nama_expedisi: 'ATLAS PALEM', alamat: 'KOMPLEK RUKO TPL FANTASI BLOK W21', kota: 'JAKARTA BARAT', phone1: '021-6807-2588', phone2: '021-7110-4776' },
    { id: '9', kode: '056', nama_expedisi: 'AWAL JASA', alamat: '', kota: '', phone1: '0216623911', phone2: '' },
    { id: '10', kode: '047', nama_expedisi: 'BANGKIT JAYA MANUNGGAL', alamat: 'TAMAN HARAPAN INDAH JL. JATAYU 4 BLOK R NO.7', kota: 'JAKARTA', phone1: '021-92981041', phone2: '' },
    { id: '11', kode: '103', nama_expedisi: 'BARAKA SARANA TAMA', alamat: 'JL. TONGKOL NO. 23. A', kota: '', phone1: '6901476', phone2: '' },
    { id: '12', kode: '003', nama_expedisi: 'BEXINDO', alamat: 'JL.GUNUNG SAHARI RAYA NO.2', kota: 'JAKARTA', phone1: '021-6471-0507', phone2: '' },
    { id: '13', kode: '200', nama_expedisi: 'BINTANG MAS', alamat: 'JL. TONGKOL NO. 2 .PASAR IKAN', kota: 'JAKARTA UTARA', phone1: '6927447', phone2: '' },
    { id: '14', kode: '030', nama_expedisi: 'BINTANG MAS JAYA', alamat: 'JL.P.JAYAKARTA NO.121/24-25', kota: 'JAKARTA UTARA', phone1: '021 6294050', phone2: '' },
    { id: '15', kode: '031', nama_expedisi: 'BOGOR RAYA', alamat: '', kota: 'JAKARTA', phone1: '', phone2: '' },
    { id: '16', kode: '002', nama_expedisi: 'BSJ', alamat: 'RUKO PALEM FANTASI B.Z2 NO.8', kota: '', phone1: '087880190066', phone2: '08172325605' },
    { id: '17', kode: '008', nama_expedisi: 'BTN', alamat: 'BLOK X NO.7', kota: '', phone1: '021-33099836', phone2: '021-55960202' },
    { id: '18', kode: '044', nama_expedisi: 'C.M.M', alamat: 'JL.KAMAL RAYA NO.40 BLOK N NO7', kota: 'JAKARTA BARAT', phone1: '021-68600467', phone2: '021-98405748' },
    { id: '19', kode: '018', nama_expedisi: 'CAHAYA LINTAS SULAWESI', alamat: 'JL. R.E MARTADINATA', kota: 'JAKARTA UTARA', phone1: '021-645-7818', phone2: '' },
    { id: '20', kode: '055', nama_expedisi: 'CITRA MAS LOGISTIC ( KERETA )', alamat: 'JL.KAMPUNG BANDAN PINTU 1 NO.25B', kota: 'JAKARTA BARAT', phone1: '6906063', phone2: '081286405057' },
    { id: '21', kode: '064', nama_expedisi: 'CITRA MAS LOGISTIC ( MOBIL )', alamat: 'JL. KAMAL RAYA NO. 40 BLOK N NO. 7', kota: 'JAKARTA BARAT', phone1: '021 68600467', phone2: '98405748' },
    { id: '22', kode: '080', nama_expedisi: 'CV. AMARTA EXPRESS', alamat: 'JL. DANAU INDAH BARAT BLOK B9 NO.4', kota: '', phone1: '021 651 7974', phone2: '' },
    { id: '23', kode: '350', nama_expedisi: 'CV. BINTANG DELTA EXPRESS', alamat: 'JL. KAPUK MUARA ( TELUK GONG. KOMPLEK DHI.', kota: '', phone1: '021-668 2680', phone2: '021-661 3148' },
    { id: '24', kode: '026', nama_expedisi: 'CV.CAHAYA MAKMUR', alamat: 'JL.KAPUK KAMAL RAYA NO.40', kota: 'JAKARTA', phone1: '021-5560-982', phone2: '021-98334317' },
    { id: '25', kode: '036', nama_expedisi: 'CV.DWI PUTRA', alamat: 'JL.KAMPUNG BANDAN NO.1', kota: 'JAKARTA UTARA', phone1: '021-691-0061', phone2: '021-691-7423' },
    { id: '26', kode: '049', nama_expedisi: 'CV.JAKARTA BANGKA EXPRESS', alamat: 'RUKO DURI RAYA RT.02 / RW.01 NO.1 J&G', kota: 'JAKARTA BARAT', phone1: '021-98219303', phone2: '' },
    { id: '27', kode: '088', nama_expedisi: 'CV.KARYA INDAH 8 EXPRESS', alamat: 'JL. STASIUN KOTA NO.1', kota: 'JAKARTA BARAT', phone1: '021-690 1759', phone2: '021-690 1759' },
    { id: '28', kode: '001', nama_expedisi: 'CV.MARLIN UTAMA', alamat: 'JL. TELEPON KOTA NO.96(PASAR PAGI)', kota: 'JAKARTA BARAT', phone1: '021-6900859', phone2: '' },
  ]);

  const [selectedId, setSelectedId] = useState<string>('1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('Description');

  // Add New Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newAlamat, setNewAlamat] = useState('');
  const [newKota, setNewKota] = useState('');
  const [newPhone1, setNewPhone1] = useState('');
  const [newPhone2, setNewPhone2] = useState('');

  const tableContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleAddNew = () => {
    const nextKodeNum = (expedisiList.length + 1).toString().padStart(3, '0');
    setNewKode(nextKodeNum);
    setNewNama('');
    setNewAlamat('');
    setNewKota('');
    setNewPhone1('');
    setNewPhone2('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNama.trim()) return;

    const newItem: ExpedisiItem = {
      id: Date.now().toString(),
      kode: newKode.trim().toUpperCase(),
      nama_expedisi: newNama.trim().toUpperCase(),
      alamat: newAlamat.trim().toUpperCase(),
      kota: newKota.trim().toUpperCase(),
      phone1: newPhone1.trim(),
      phone2: newPhone2.trim(),
    };

    setExpedisiList([...expedisiList, newItem]);
    setSelectedId(newItem.id);
    setIsAddOpen(false);
  };

  const filteredData = expedisiList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (searchField === 'Kode') {
      return item.kode.toLowerCase().includes(term);
    }
    return (
      item.nama_expedisi.toLowerCase().includes(term) ||
      item.kota.toLowerCase().includes(term) ||
      item.alamat.toLowerCase().includes(term)
    );
  });

  return (
    <div
      id="master-expedisi-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner: List Master Expedisi */}
        <div
          id="master-expedisi-banner"
          className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]"
        >
          <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
            List Master Expedisi
          </span>

          <div className="flex items-center space-x-1.5">
            {/* Table icon */}
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

            {/* Excel export icon */}
            <button
              type="button"
              title="Export Excel"
              onClick={() => alert('Data Master Expedisi berhasil diexport ke format Excel')}
              className="w-[24px] h-[22px] bg-[#1E7145] border border-white/80 rounded-[1px] flex items-center justify-center hover:brightness-110 cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <span className="text-[11px] font-bold text-white font-sans tracking-tighter">
                  X
                </span>
                <div className="absolute -bottom-1 -right-1 w-[7px] h-[5px] bg-white grid grid-cols-2 gap-[0.5px]">
                  <div className="bg-[#1E7145]" />
                  <div className="bg-[#1E7145]" />
                  <div className="bg-[#1E7145]" />
                  <div className="bg-[#1E7145]" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Action & Search Toolbar */}
        <div
          id="master-expedisi-toolbar"
          className="shrink-0 flex items-center h-[52px] px-3 space-x-4 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans"
        >
          <button
            id="btn-add-new-expedisi"
            type="button"
            onClick={handleAddNew}
            className="w-[92px] h-[30px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:border-t-[#707070] active:border-l-[#707070] active:border-b-white active:border-r-white text-[11px] font-bold text-black hover:bg-[#F2EFE2] active:bg-[#DFDBD0] cursor-pointer shadow-sm"
          >
            Add New
          </button>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-[11px] text-black">Search :</span>
            <div className="relative">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="h-[24px] px-2 pr-6 bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] font-sans font-medium text-black appearance-none outline-none cursor-pointer"
              >
                <option value="Description">Description</option>
                <option value="Kode">Kode</option>
              </select>
              <div className="absolute right-1 top-2 pointer-events-none text-[8px] text-black">
                ▼
              </div>
            </div>

            <div className="w-[340px]">
              <input
                id="expedisi-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder=""
                className="w-full h-[24px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-2 text-[11px] font-sans outline-none focus:border-[#316AC5]"
              />
            </div>
          </div>
        </div>

        {/* 3. Grid Workspace Section */}
        <div className="flex-1 flex flex-col p-2 overflow-hidden bg-[#ECE9D8]">
          <div className="flex-1 flex flex-col border border-[#7F9DB9] bg-[#ECE9D8] overflow-hidden">
            <div className="shrink-0 h-[20px] bg-[#ECE9D8] border-b border-[#ACA899] flex items-center justify-center text-[11px] font-sans font-normal text-black select-none">
              List
            </div>

            <div
              ref={tableContainerRef}
              className="flex-1 overflow-auto bg-white border border-[#7F9DB9] relative select-none"
            >
              <table className="w-full min-w-[920px] border-collapse text-[11px] font-sans">
                <thead className="bg-[#ECE9D8] sticky top-0 z-10">
                  <tr className="h-[22px] text-left border-b border-[#ACA899]">
                    <th className="border-r border-[#ACA899] px-2 py-0.5 font-bold text-black w-[70px]">Kode</th>
                    <th className="border-r border-[#ACA899] px-2 py-0.5 font-bold text-black w-[200px]">Nama Expedisi</th>
                    <th className="border-r border-[#ACA899] px-2 py-0.5 font-bold text-black">Alamat</th>
                    <th className="border-r border-[#ACA899] px-2 py-0.5 font-bold text-black w-[150px]">Kota</th>
                    <th className="border-r border-[#ACA899] px-2 py-0.5 font-bold text-black w-[130px]">Phone 1</th>
                    <th className="px-2 py-0.5 font-bold text-black w-[130px]">Phone 2</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`h-[20px] cursor-pointer ${
                          isSelected
                            ? 'bg-[#316AC5] text-white'
                            : 'hover:bg-[#E8EEF9] text-black'
                        }`}
                      >
                        <td className="border-r border-gray-200 px-2 py-0.5 flex items-center space-x-1">
                          {isSelected && <span className="font-bold">▶</span>}
                          <span>{item.kode}</span>
                        </td>
                        <td className="border-r border-gray-200 px-2 py-0.5 truncate">{item.nama_expedisi}</td>
                        <td className="border-r border-gray-200 px-2 py-0.5 truncate">{item.alamat}</td>
                        <td className="border-r border-gray-200 px-2 py-0.5 truncate">{item.kota}</td>
                        <td className="border-r border-gray-200 px-2 py-0.5 truncate">{item.phone1}</td>
                        <td className="px-2 py-0.5 truncate">{item.phone2}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 4. Status Bar */}
        <div className="shrink-0 h-[22px] bg-[#ECE9D8] border-t border-[#ACA899] flex items-center justify-between px-2 text-[11px] font-sans text-black">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Ready</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Record</span>
            <div className="w-[70px] h-[18px] bg-white border border-[#7F9DB9] px-2 text-right font-bold leading-[16px]">
              {filteredData.length}
            </div>
          </div>
        </div>
      </div>

      {/* Add New Modal Dialog */}
      {isAddOpen && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] w-[450px] shadow-2xl flex flex-col font-sans">
            <div className="bg-gradient-to-r from-[#0055EA] to-[#316AC5] text-white px-2 py-1 flex justify-between items-center text-[11px] font-bold">
              <span>Tambah Master Expedisi Baru</span>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="bg-[#ECE9D8] text-black w-4 h-4 flex items-center justify-center border border-gray-700 text-[10px] hover:bg-red-600 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNew} className="p-4 space-y-3 text-[11px]">
              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold text-right">Kode :</label>
                <input
                  type="text"
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value)}
                  required
                  className="w-[100px] h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase"
                />
              </div>
              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold text-right">Nama Expedisi :</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  required
                  className="w-[280px] h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase"
                />
              </div>
              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold text-right">Alamat :</label>
                <input
                  type="text"
                  value={newAlamat}
                  onChange={(e) => setNewAlamat(e.target.value)}
                  className="w-[280px] h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase"
                />
              </div>
              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold text-right">Kota :</label>
                <input
                  type="text"
                  value={newKota}
                  onChange={(e) => setNewKota(e.target.value)}
                  className="w-[280px] h-[22px] bg-white border border-[#7F9DB9] px-2 uppercase"
                />
              </div>
              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold text-right">Phone 1 :</label>
                <input
                  type="text"
                  value={newPhone1}
                  onChange={(e) => setNewPhone1(e.target.value)}
                  className="w-[180px] h-[22px] bg-white border border-[#7F9DB9] px-2"
                />
              </div>
              <div className="flex items-center space-x-3">
                <label className="w-[110px] font-bold text-right">Phone 2 :</label>
                <input
                  type="text"
                  value={newPhone2}
                  onChange={(e) => setNewPhone2(e.target.value)}
                  className="w-[180px] h-[22px] bg-white border border-[#7F9DB9] px-2"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#ACA899]">
                <button
                  type="submit"
                  className="w-[75px] h-[24px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] font-bold active:translate-y-0.5"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="w-[75px] h-[24px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] font-bold active:translate-y-0.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
