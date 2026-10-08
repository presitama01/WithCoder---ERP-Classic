import React from 'react';

interface WindowHeaderProps {
  title?: string;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  title = 'Indo IT - Main Menu ~ Menu Utama',
  onMinimize,
  onMaximize,
  onClose,
}) => {
  return (
    <div
      id="main-app-window-header"
      className="relative z-50 flex items-center justify-between h-[28px] bg-gradient-to-b from-[#7CA5E9] via-[#4A7AC9] to-[#2B5FA9] px-2 select-none border-b border-[#184687]"
    >
      {/* Left: Icon & Window Title */}
      <div className="flex items-center space-x-2">
        {/* Blue 'i' circular logo */}
        <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-tr from-[#003B99] via-[#0055D4] to-[#3B82F6] flex items-center justify-center shadow-sm border border-white/40">
          <span className="text-white font-serif font-bold text-[12px] leading-none italic drop-shadow">
            i
          </span>
        </div>
        <span className="text-white font-sans font-semibold text-[12px] tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
          {title}
        </span>
      </div>

      {/* Right: Windows 7 style caption buttons */}
      <div className="flex items-center space-x-[2px]">
        {/* Minimize button */}
        <button
          id="win-btn-minimize"
          type="button"
          onClick={onMinimize}
          title="Minimize"
          className="w-[26px] h-[20px] rounded-[2px] bg-white/15 hover:bg-white/30 active:bg-white/40 border border-white/20 flex items-center justify-center text-white text-[12px] transition-colors cursor-pointer"
        >
          <div className="w-[10px] h-[1.5px] bg-white mt-2" />
        </button>

        {/* Maximize / Restore button */}
        <button
          id="win-btn-maximize"
          type="button"
          onClick={onMaximize}
          title="Maximize"
          className="w-[26px] h-[20px] rounded-[2px] bg-white/15 hover:bg-white/30 active:bg-white/40 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
        >
          <div className="w-[9px] h-[9px] border-[1.5px] border-white" />
        </button>

        {/* Close button (Windows red glow on hover) */}
        <button
          id="win-btn-close"
          type="button"
          onClick={onClose}
          title="Close (Exit)"
          className="w-[38px] h-[20px] rounded-[2px] bg-white/15 hover:bg-[#E81123] active:bg-[#BF0F1D] border border-white/20 flex items-center justify-center text-white text-[11px] font-bold transition-colors cursor-pointer shadow-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
