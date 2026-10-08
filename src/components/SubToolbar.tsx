import React, { useState } from 'react';

interface SubToolbarProps {
  onMonthChange?: (month: string) => void;
  onPeriodChange?: (start: string, end: string) => void;
  onLocationChange?: (loc: string) => void;
}

export const SubToolbar: React.FC<SubToolbarProps> = ({
  onMonthChange,
  onPeriodChange,
  onLocationChange,
}) => {
  const [monthActive, setMonthActive] = useState('08-2026');
  const [periodStart, setPeriodStart] = useState('01-08-2026');
  const [periodEnd, setPeriodEnd] = useState('31-08-2026');
  const [location, setLocation] = useState('01 - OFFICE');

  const handleMonth = (val: string) => {
    setMonthActive(val);
    onMonthChange?.(val);
  };

  const handleStart = (val: string) => {
    setPeriodStart(val);
    onPeriodChange?.(val, periodEnd);
  };

  const handleEnd = (val: string) => {
    setPeriodEnd(val);
    onPeriodChange?.(periodStart, val);
  };

  const handleLocation = (val: string) => {
    setLocation(val);
    onLocationChange?.(val);
  };

  return (
    <div
      id="sub-toolbar"
      className="flex items-center h-[28px] bg-[#ECE9D8] border-b border-[#ACA899] px-2 select-none text-[11px] font-sans text-black overflow-x-auto min-w-0"
    >
      <div className="flex items-center space-x-3">
        {/* 1. Month Active */}
        <div className="flex items-center space-x-1">
          <label htmlFor="subtoolbar-month-active" className="text-[11px] whitespace-nowrap">
            Month Active :
          </label>
          <div className="relative w-[78px]">
            <select
              id="subtoolbar-month-active"
              value={monthActive}
              onChange={(e) => handleMonth(e.target.value)}
              className="w-full h-[20px] bg-white border border-[#7F9DB9] text-[11px] px-1 pr-4 appearance-none outline-none font-sans focus:border-[#316AC5] cursor-pointer"
            >
              <option value="08-2026">08-2026</option>
              <option value="09-2026">09-2026</option>
              <option value="10-2026">10-2026</option>
              <option value="11-2026">11-2026</option>
              <option value="12-2026">12-2026</option>
              <option value="01-2027">01-2027</option>
            </select>
            <div className="absolute right-0 top-0 h-[20px] w-[15px] bg-[#ECE9D8] border-l border-[#ACA899] flex items-center justify-center pointer-events-none">
              <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
                <polygon points="0,0 7,0 3.5,4" fill="#000000" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2. Periode */}
        <div className="flex items-center space-x-1">
          <label htmlFor="subtoolbar-periode-start" className="text-[11px] whitespace-nowrap">
            Periode :
          </label>
          <input
            id="subtoolbar-periode-start"
            type="text"
            value={periodStart}
            onChange={(e) => handleStart(e.target.value)}
            className="w-[78px] h-[20px] bg-white border border-[#7F9DB9] text-[11px] font-sans px-1 outline-none text-center focus:border-[#316AC5]"
          />
          <span className="text-gray-600">-</span>
          <input
            id="subtoolbar-periode-end"
            type="text"
            value={periodEnd}
            onChange={(e) => handleEnd(e.target.value)}
            className="w-[78px] h-[20px] bg-white border border-[#7F9DB9] text-[11px] font-sans px-1 outline-none text-center focus:border-[#316AC5]"
          />
        </div>

        {/* 3. Lokasi */}
        <div className="flex items-center space-x-1">
          <label htmlFor="subtoolbar-lokasi" className="text-[11px] whitespace-nowrap">
            Lokasi :
          </label>
          <div className="relative w-[210px]">
            <select
              id="subtoolbar-lokasi"
              value={location}
              onChange={(e) => handleLocation(e.target.value)}
              className="w-full h-[20px] bg-white border border-[#7F9DB9] text-[11px] px-2 pr-4 appearance-none outline-none font-sans focus:border-[#316AC5] cursor-pointer"
            >
              <option value="01 - OFFICE">01 - OFFICE</option>
              <option value="02 - GUDANG UTAMA">02 - GUDANG UTAMA</option>
              <option value="03 - TOKO PUSAT">03 - TOKO PUSAT</option>
              <option value="04 - CABANG BARAT">04 - CABANG BARAT</option>
            </select>
            <div className="absolute right-0 top-0 h-[20px] w-[15px] bg-[#ECE9D8] border-l border-[#ACA899] flex items-center justify-center pointer-events-none">
              <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
                <polygon points="0,0 7,0 3.5,4" fill="#000000" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
