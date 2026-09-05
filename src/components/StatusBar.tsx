import React, { useState, useEffect } from 'react';

interface StatusBarProps {
  statusMessage?: string;
  isInsertMode?: boolean;
  onToggleInsert?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  statusMessage = '',
  isInsertMode = true,
  onToggleInsert,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format as 9:44 AM (no leading zero on hour, uppercase AM/PM)
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 hour is 12
      const formattedMin = minutes < 10 ? '0' + minutes : minutes;
      setTimeStr(`${hours}:${formattedMin} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer
      id="main-statusbar"
      className="fixed bottom-0 left-0 right-0 h-[24px] bg-[#ECE9D8] border-t border-[#808080] flex items-center px-1 space-x-1 select-none text-[11px] font-sans z-50"
    >
      {/* Panel 1: Operator / Presenter Icon */}
      <div
        id="status-panel-operator"
        title="Current Operator / Session"
        className="flex items-center justify-center w-[28px] h-[19px] bg-[#ECE9D8] border-2 border-t-[#808080] border-l-[#808080] border-b-[#FFFFFF] border-r-[#FFFFFF] shadow-inner px-1"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          {/* Head */}
          <circle cx="6" cy="4" r="2.2" fill="#000000" />
          {/* Body */}
          <path d="M 3 13 L 5 8 L 7 8 L 9 13 Z" fill="#000000" />
          {/* Arm pointing to screen/podium */}
          <line x1="7" y1="8" x2="11" y2="6" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
          {/* Screen / Presentation Board */}
          <rect x="10" y="3" width="5" height="5" fill="#000000" rx="0.5" />
          <line x1="12.5" y1="8" x2="12.5" y2="13" stroke="#000000" strokeWidth="1" />
          {/* Base */}
          <line x1="11" y1="13" x2="14" y2="13" stroke="#000000" strokeWidth="1.2" />
        </svg>
      </div>

      {/* Panel 2: INS (Insert Key Mode) */}
      <div
        id="status-panel-ins"
        onClick={onToggleInsert}
        title="Toggle Insert Mode"
        className="flex items-center justify-center w-[40px] h-[19px] bg-[#ECE9D8] border-2 border-t-[#808080] border-l-[#808080] border-b-[#FFFFFF] border-r-[#FFFFFF] shadow-inner text-[11px] font-sans font-normal text-black cursor-default"
      >
        {isInsertMode ? 'INS' : 'OVR'}
      </div>

      {/* Panel 3: Live Clock (e.g. 9:44 AM) */}
      <div
        id="status-panel-clock"
        title="System Time"
        className="flex items-center justify-center min-w-[70px] px-2 h-[19px] bg-[#ECE9D8] border-2 border-t-[#808080] border-l-[#808080] border-b-[#FFFFFF] border-r-[#FFFFFF] shadow-inner text-[11px] font-sans text-black"
      >
        {timeStr || '9:44 AM'}
      </div>

      {/* Panel 4: Main Status Message Area */}
      <div
        id="status-panel-message"
        className="flex-1 h-[19px] bg-[#ECE9D8] border-2 border-t-[#808080] border-l-[#808080] border-b-[#FFFFFF] border-r-[#FFFFFF] shadow-inner px-2 flex items-center text-[11px] text-gray-700 truncate"
      >
        {statusMessage || 'WithCoder Ready'}
      </div>
    </footer>
  );
};
