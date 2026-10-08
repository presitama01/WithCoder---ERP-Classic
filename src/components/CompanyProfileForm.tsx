import React, { useState } from 'react';

interface CompanyProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyProfileForm: React.FC<CompanyProfileFormProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    profileCode: '01',
    companyName: 'PT. UNIMETRIKA UTAMA',
    noNpwp: '01.603.251.8-048.000',
    npwpAddress: 'JL. AGUNG TIMUR 8 BLOK D KAV. NO.7\nSUNTER JAYA, TANJUNG PRIOK- JAKARTA UTARA',
    tanggalNpwp: '26-05-1993',
    address: 'JL. AGUNG TIMUR 8 BLOK D KAV. NO.7\nSUNTER JAYA, TANJUNG PRIOK- JAKARTA UTARA',
    country: 'INDONESIA',
    phone: '021-65304111',
    fax: '021-65304110',
    mail: 'umu@unimetrika.co.id',
    ppnActive: false,
    ppnValue: '0',
    wirajaya: true,
    backup: true,
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    alert('Data Company Profile berhasil disimpan!');
  };

  return (
    <div
      id="company-profile-form-container"
      className="absolute inset-0 z-30 flex flex-col bg-[#ECE9D8] select-none overflow-hidden font-sans"
    >
      <div className="w-full h-full flex flex-col min-w-0">
        {/* 1. Black Top Banner */}
        <div className="shrink-0 flex items-center justify-between h-[36px] bg-black text-white px-3 border-b border-[#333333]">
          <span className="text-[17px] font-sans font-bold tracking-tight text-white drop-shadow">
            Company Profile
          </span>

          <div className="flex items-center space-x-1.5">
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
              onClick={() => alert('Data Company Profile berhasil diexport ke format Excel')}
              className="w-[24px] h-[22px] bg-[#1E7145] border border-white/80 rounded-[1px] flex items-center justify-center hover:brightness-110 cursor-pointer"
            >
              <span className="text-[11px] font-bold text-white font-sans">X</span>
            </button>
          </div>
        </div>

        {/* 2. Action Toolbar */}
        <div className="shrink-0 flex items-center h-[52px] px-3 space-x-2 bg-[#ECE9D8] border-b border-[#ACA899] text-[11px] font-sans">
          <button
            type="button"
            onClick={handleSave}
            className="w-[92px] h-[30px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:border-t-[#707070] active:border-l-[#707070] active:border-b-white active:border-r-white text-[11px] font-bold text-black hover:bg-[#F2EFE2] active:bg-[#DFDBD0] cursor-pointer shadow-sm"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-[92px] h-[30px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] active:border-t-[#707070] active:border-l-[#707070] active:border-b-white active:border-r-white text-[11px] font-bold text-black hover:bg-[#F2EFE2] active:bg-[#DFDBD0] cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>

        {/* 3. Scrollable Form Body Container */}
        <div className="flex-1 overflow-auto p-4 bg-[#ECE9D8]">
          <div className="max-w-3xl mx-auto bg-[#ECE9D8] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-6 shadow-md">
            <div className="text-sm font-bold text-[#003C74] border-b border-[#ACA899] pb-2 mb-4">
              Program Setup & Company Profile
            </div>

            <div className="space-y-3 text-xs text-black">
              {/* Profile Code */}
              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Profile Code :</label>
                <select
                  value={formData.profileCode}
                  onChange={(e) => handleChange('profileCode', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 w-24 text-xs outline-none focus:border-[#316AC5]"
                >
                  <option value="01">01</option>
                  <option value="02">02</option>
                </select>
              </div>

              {/* Company Name */}
              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Company Name :</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 flex-1 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              {/* No.NPWP */}
              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">No.NPWP :</label>
                <input
                  type="text"
                  value={formData.noNpwp}
                  onChange={(e) => handleChange('noNpwp', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 w-72 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              {/* NPWP Address */}
              <div className="flex items-start">
                <label className="w-36 text-right pr-3 font-medium pt-1">NPWP Address :</label>
                <textarea
                  value={formData.npwpAddress}
                  onChange={(e) => handleChange('npwpAddress', e.target.value)}
                  rows={3}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 flex-1 text-xs outline-none resize-none focus:border-[#316AC5]"
                />
              </div>

              {/* Tanggal NPWP */}
              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Tanggal NPWP :</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={formData.tanggalNpwp}
                    onChange={(e) => handleChange('tanggalNpwp', e.target.value)}
                    className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 w-32 text-xs outline-none focus:border-[#316AC5]"
                  />
                  <button type="button" className="bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] px-2 py-1 ml-1 text-xs active:border-t-[#707070] active:border-b-white">▼</button>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start">
                <label className="w-36 text-right pr-3 font-medium pt-1">Address :</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={3}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 flex-1 text-xs outline-none resize-none focus:border-[#316AC5]"
                />
              </div>

              {/* Country */}
              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Country :</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 flex-1 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              {/* Phone */}
              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Phone :</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 w-56 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              {/* Fax */}
              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Fax :</label>
                <input
                  type="text"
                  value={formData.fax}
                  onChange={(e) => handleChange('fax', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 w-56 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              {/* Mail */}
              <div className="flex items-center">
                <label className="w-36 text-right pr-3 font-medium">Mail :</label>
                <input
                  type="text"
                  value={formData.mail}
                  onChange={(e) => handleChange('mail', e.target.value)}
                  className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 flex-1 text-xs outline-none focus:border-[#316AC5]"
                />
              </div>

              {/* PPN & Right Checkboxes Layout */}
              <div className="flex justify-between items-center pt-3 border-t border-[#ACA899] mt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ppnActive}
                    onChange={(e) => handleChange('ppnActive', e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="font-medium">PPN :</span>
                  <input
                    type="text"
                    value={formData.ppnValue}
                    onChange={(e) => handleChange('ppnValue', e.target.value)}
                    className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white px-2 py-1 w-20 text-xs text-right outline-none focus:border-[#316AC5]"
                  />
                </div>

                <div className="flex flex-col gap-1.5 pr-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.wirajaya}
                      onChange={(e) => handleChange('wirajaya', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium">Wirajaya</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.backup}
                      onChange={(e) => handleChange('backup', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium">Back Up</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
