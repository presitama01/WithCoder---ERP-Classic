import React, { useState } from 'react';

export const SubToolbar: React.FC = () => {
  const [dropdown1, setDropdown1] = useState('');
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState('');
  const [dropdown2, setDropdown2] = useState('');

  return (
    <div
      id="sub-toolbar"
      className="flex items-center h-[30px] bg-[#ECE9D8] border-b border-[#ACA899] px-3 select-none text-[11px] font-sans"
    >
      <div className="flex items-center space-x-2 pl-[70px]">
        {/* Dropdown 1: Small combobox */}
        <div className="relative w-[62px]">
          <select
            id="subtoolbar-select-1"
            value={dropdown1}
            onChange={(e) => setDropdown1(e.target.value)}
            className="w-full h-[20px] bg-white border border-[#7F9DB9] text-[11px] px-1 pr-4 appearance-none outline-none font-sans focus:border-[#316AC5] cursor-pointer"
          >
            <option value=""></option>
            <option value="01">01 - UTAMA</option>
            <option value="02">02 - CABANG 1</option>
            <option value="03">03 - GUDANG</option>
          </select>
          <div className="absolute right-0 top-0 h-[20px] w-[16px] bg-[#ECE9D8] border-l border-[#ACA899] flex items-center justify-center pointer-events-none">
            <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
              <polygon points="0,0 7,0 3.5,4" fill="#000000" />
            </svg>
          </div>
        </div>

        {/* Input 1: __-__ format */}
        <div className="w-[62px]">
          <input
            id="subtoolbar-input-mask-1"
            type="text"
            value={field1}
            placeholder="_ _ - _ _"
            onChange={(e) => setField1(e.target.value)}
            className="w-full h-[20px] bg-white border border-[#7F9DB9] text-[11px] font-mono px-1 outline-none text-center focus:border-[#316AC5]"
          />
        </div>

        {/* Input 2: __-__ format */}
        <div className="w-[62px]">
          <input
            id="subtoolbar-input-mask-2"
            type="text"
            value={field2}
            placeholder="_ _ - _ _"
            onChange={(e) => setField2(e.target.value)}
            className="w-full h-[20px] bg-white border border-[#7F9DB9] text-[11px] font-mono px-1 outline-none text-center focus:border-[#316AC5]"
          />
        </div>

        {/* Dropdown 2: Wide combobox */}
        <div className="relative w-[210px]">
          <select
            id="subtoolbar-select-2"
            value={dropdown2}
            onChange={(e) => setDropdown2(e.target.value)}
            className="w-full h-[20px] bg-white border border-[#7F9DB9] text-[11px] px-2 pr-4 appearance-none outline-none font-sans focus:border-[#316AC5] cursor-pointer"
          >
            <option value=""></option>
            <option value="ALL">SEMUA DIVISI / DEPARTEMEN</option>
            <option value="DIV1">DIVISI PENJUALAN RETAIL</option>
            <option value="DIV2">DIVISI GROSIR & DISTRIBUSI</option>
            <option value="DIV3">DIVISI LOGISTIK & GUDANG</option>
          </select>
          <div className="absolute right-0 top-0 h-[20px] w-[16px] bg-[#ECE9D8] border-l border-[#ACA899] flex items-center justify-center pointer-events-none">
            <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
              <polygon points="0,0 7,0 3.5,4" fill="#000000" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
