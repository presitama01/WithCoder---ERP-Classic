import React, { useState, useEffect } from 'react';
import { erpCreate, erpList, erpUpdate, toDisplayDmy, toIsoDate } from '../lib/erpApi';
import { DatePickerInput } from './DatePickerInput';

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
  const [settingId, setSettingId] = useState<string | null>(null);
  const [monthActive, setMonthActive] = useState('08-2026');
  const [periodStart, setPeriodStart] = useState('01-08-2026');
  const [periodEnd, setPeriodEnd] = useState('31-08-2026');
  const [location, setLocation] = useState('01 - OFFICE');
  const [lokasiOptions, setLokasiOptions] = useState<string[]>(['01 - OFFICE']);

  useEffect(() => {
    Promise.all([
      erpList<any>('app_settings', { limit: 1 }).catch(() => []),
      erpList<any>('master_lokasi_gudangs', { orderBy: 'kode', asc: true }).catch(() => []),
    ]).then(([settings, lokasis]) => {
      if (lokasis && lokasis.length > 0) {
        const opts = lokasis.map((l: any) => `${l.kode} - ${l.nama_lokasi}`);
        setLokasiOptions(opts);
      }
      if (settings && settings.length > 0) {
        const s = settings[0];
        setSettingId(s.id);
        if (s.month_active) setMonthActive(s.month_active);
        if (s.periode_start) setPeriodStart(toDisplayDmy(s.periode_start));
        if (s.periode_end) setPeriodEnd(toDisplayDmy(s.periode_end));
        if (s.lokasi_aktif) setLocation(s.lokasi_aktif);
      }
    });
  }, []);

  const persistSettings = async (patch: {
    month_active?: string;
    periode_start?: string | null;
    periode_end?: string | null;
    lokasi_aktif?: string;
  }) => {
    try {
      const payload = {
        month_active: patch.month_active ?? monthActive,
        periode_start: patch.periode_start !== undefined ? patch.periode_start : toIsoDate(periodStart),
        periode_end: patch.periode_end !== undefined ? patch.periode_end : toIsoDate(periodEnd),
        lokasi_aktif: patch.lokasi_aktif ?? location,
      };
      if (settingId) {
        await erpUpdate('app_settings', settingId, payload);
      } else {
        const created = await erpCreate<any>('app_settings', payload);
        if (created?.id) setSettingId(created.id);
      }
    } catch {
      // Non-blocking background sync
    }
  };

  const handleMonth = (val: string) => {
    setMonthActive(val);
    onMonthChange?.(val);
    persistSettings({ month_active: val });
  };

  const handleStart = (val: string) => {
    setPeriodStart(val);
    onPeriodChange?.(val, periodEnd);
    const iso = toIsoDate(val);
    if (iso) persistSettings({ periode_start: iso });
  };

  const handleEnd = (val: string) => {
    setPeriodEnd(val);
    onPeriodChange?.(periodStart, val);
    const iso = toIsoDate(val);
    if (iso) persistSettings({ periode_end: iso });
  };

  const handleLocation = (val: string) => {
    setLocation(val);
    onLocationChange?.(val);
    persistSettings({ lokasi_aktif: val });
  };

  return (
    <div
      id="sub-toolbar"
      className="flex items-center h-[28px] bg-[#ECE9D8] border-b border-[#ACA899] px-2 select-none text-[11px] font-sans text-black overflow-x-auto min-w-0"
    >
      <div className="flex items-center space-x-3">
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

        <div className="flex items-center space-x-1">
          <label htmlFor="subtoolbar-periode-start" className="text-[11px] whitespace-nowrap">
            Periode :
          </label>
          <DatePickerInput
            id="subtoolbar-periode-start"
            value={periodStart}
            onChange={(fmt) => handleStart(fmt)}
            format="dmy"
            inputClassName="w-[74px] h-[20px] bg-white border border-[#7F9DB9] text-[11px] font-sans px-1 outline-none text-center focus:border-[#316AC5]"
          />
          <span className="text-gray-600">-</span>
          <DatePickerInput
            id="subtoolbar-periode-end"
            value={periodEnd}
            onChange={(fmt) => handleEnd(fmt)}
            format="dmy"
            inputClassName="w-[74px] h-[20px] bg-white border border-[#7F9DB9] text-[11px] font-sans px-1 outline-none text-center focus:border-[#316AC5]"
          />
        </div>

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
              {Array.from(new Set([...lokasiOptions, location])).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
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
