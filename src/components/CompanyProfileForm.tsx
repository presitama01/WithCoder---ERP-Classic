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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[100]">
      <div className="bg-[#ECE9D8] w-[620px] border-2 border-[#7F9DB9] shadow-2xl flex flex-col font-sans select-none">
        {/* Windows Aero Frame Title Bar */}
        <div className="bg-gradient-to-r from-[#0055EA] via-[#3375FF] to-[#0055EA] text-white px-2 py-1 flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="bg-blue-600 px-1 rounded">🪟</span>
            <span>i-Software - Company Profile</span>
          </div>
          <div className="flex gap-1">
            <button className="bg-[#ECE9D8] text-black w-4 h-4 flex items-center justify-center text-[10px] font-bold border border-gray-400">_</button>
            <button className="bg-[#ECE9D8] text-black w-4 h-4 flex items-center justify-center text-[10px] font-bold border border-gray-400">□</button>
            <button onClick={onClose} className="bg-[#E81123] text-white w-4 h-4 flex items-center justify-center text-[10px] font-bold border border-gray-700 hover:bg-red-700">✕</button>
          </div>
        </div>

        {/* Main Black Header Banner */}
        <div className="bg-black text-white px-4 py-2.5">
          <h1 className="text-xl font-bold tracking-wide">Program Setup</h1>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-2.5 text-xs text-black">
          {/* Profile Code */}
          <div className="flex items-center">
            <label className="w-32 text-right pr-3 font-medium">Profile Code :</label>
            <select
              value={formData.profileCode}
              onChange={(e) => handleChange('profileCode', e.target.value)}
              className="border border-[#7F9DB9] bg-white px-2 py-0.5 w-20 text-xs outline-none"
            >
              <option value="01">01</option>
              <option value="02">02</option>
            </select>
          </div>

          {/* Company Name */}
          <div className="flex items-center">
            <label className="w-32 text-right pr-3 font-medium">Company Name :</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              className="border border-[#7F9DB9] bg-white px-2 py-0.5 flex-1 text-xs outline-none"
            />
          </div>

          {/* No.NPWP */}
          <div className="flex items-center">
            <label className="w-32 text-right pr-3 font-medium">No.NPWP :</label>
            <input
              type="text"
              value={formData.noNpwp}
              onChange={(e) => handleChange('noNpwp', e.target.value)}
              className="border border-[#7F9DB9] bg-white px-2 py-0.5 w-64 text-xs outline-none"
            />
          </div>

          {/* NPWP Address */}
          <div className="flex items-start">
            <label className="w-32 text-right pr-3 font-medium pt-0.5">NPWP Address :</label>
            <textarea
              value={formData.npwpAddress}
              onChange={(e) => handleChange('npwpAddress', e.target.value)}
              rows={2}
              className="border border-[#7F9DB9] bg-white px-2 py-1 flex-1 text-xs outline-none resize-none"
            />
          </div>

          {/* Tanggal NPWP */}
          <div className="flex items-center">
            <label className="w-32 text-right pr-3 font-medium">Tanggal NPWP :</label>
            <div className="flex items-center">
              <input
                type="text"
                value={formData.tanggalNpwp}
                onChange={(e) => handleChange('tanggalNpwp', e.target.value)}
                className="border border-[#7F9DB9] bg-white px-2 py-0.5 w-28 text-xs outline-none"
              />
              <button type="button" className="bg-[#ECE9D8] border border-[#7F9DB9] px-1.5 py-0.5 ml-0.5 text-xs">▼</button>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start">
            <label className="w-32 text-right pr-3 font-medium pt-0.5">Address :</label>
            <textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={2}
              className="border border-[#7F9DB9] bg-white px-2 py-1 flex-1 text-xs outline-none resize-none"
            />
          </div>

          {/* Country */}
          <div className="flex items-center">
            <label className="w-32 text-right pr-3 font-medium">Country :</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              className="border border-[#7F9DB9] bg-white px-2 py-0.5 flex-1 text-xs outline-none"
            />
          </div>

          {/* Phone */}
          <div className="flex items-center">
            <label className="w-32 text-right pr-3 font-medium">Phone :</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="border border-[#7F9DB9] bg-white px-2 py-0.5 w-48 text-xs outline-none"
            />
          </div>

          {/* Fax */}
          <div className="flex items-center">
            <label className="w-32 text-right pr-3 font-medium">Fax :</label>
            <input
              type="text"
              value={formData.fax}
              onChange={(e) => handleChange('fax', e.target.value)}
              className="border border-[#7F9DB9] bg-white px-2 py-0.5 w-48 text-xs outline-none"
            />
          </div>

          {/* Mail */}
          <div className="flex items-center">
            <label className="w-32 text-right pr-3 font-medium">Mail :</label>
            <input
              type="text"
              value={formData.mail}
              onChange={(e) => handleChange('mail', e.target.value)}
              className="border border-[#7F9DB9] bg-white px-2 py-0.5 flex-1 text-xs outline-none"
            />
          </div>

          {/* PPN & Right Checkboxes Layout */}
          <div className="flex justify-between items-center pt-1 border-t border-gray-300 mt-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.ppnActive}
                onChange={(e) => handleChange('ppnActive', e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className="font-medium">PPN :</span>
              <input
                type="text"
                value={formData.ppnValue}
                onChange={(e) => handleChange('ppnValue', e.target.value)}
                className="border border-[#7F9DB9] bg-white px-2 py-0.5 w-16 text-xs text-right outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 pr-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.wirajaya}
                  onChange={(e) => handleChange('wirajaya', e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                <span>Wirajaya</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.backup}
                  onChange={(e) => handleChange('backup', e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                <span>Back Up</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-[#ECE9D8] px-4 py-3 border-t border-[#7F9DB9] flex justify-center gap-3">
          <button
            onClick={() => alert('Data Company Profile berhasil disimpan!')}
            className="bg-[#ECE9D8] hover:bg-[#E5E2D0] active:bg-[#D4D0C8] border border-[#003C74] px-6 py-1 text-xs font-medium rounded-sm shadow-sm"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="bg-[#ECE9D8] hover:bg-[#E5E2D0] active:bg-[#D4D0C8] border border-[#003C74] px-6 py-1 text-xs font-medium rounded-sm shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
