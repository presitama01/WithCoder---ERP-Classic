import React from 'react';
import {
  MasterIcon,
  PembelianIcon,
  PenjualanIcon,
  StockIcon,
  KeuanganIcon,
  ExitIcon,
} from './ToolbarIcons';

interface ToolbarProps {
  onSelectModule?: (moduleName: string) => void;
  onExit?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onSelectModule, onExit }) => {
  const tools = [
    { id: 'master', label: 'Master', icon: <MasterIcon />, action: () => onSelectModule?.('Master Data') },
    { id: 'pembelian', label: 'Pembelian', icon: <PembelianIcon />, action: () => onSelectModule?.('Pembelian') },
    { id: 'penjualan', label: 'Penjualan', icon: <PenjualanIcon />, action: () => onSelectModule?.('Penjualan') },
    { id: 'stock', label: 'Stock', icon: <StockIcon />, action: () => onSelectModule?.('Stock') },
    { id: 'keuangan', label: 'Keuangan', icon: <KeuanganIcon />, action: () => onSelectModule?.('Keuangan') },
    { id: 'exit', label: 'Exit', icon: <ExitIcon />, action: onExit },
  ];

  return (
    <div
      id="main-toolbar"
      className="flex items-center h-[54px] bg-[#ECE9D8] border-b border-[#ACA899] px-2 select-none"
    >
      <div className="flex items-center space-x-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            id={`toolbar-btn-${tool.id}`}
            type="button"
            onClick={tool.action}
            title={tool.label}
            className="group flex flex-col items-center justify-center w-[60px] h-[48px] px-1 py-0.5 rounded-none transition-none border border-transparent hover:border-[#FFFFFF_#808080_#808080_#FFFFFF] active:border-[#808080_#FFFFFF_#FFFFFF_#808080] hover:bg-[#F2EFE2] active:bg-[#DFDBD0] cursor-pointer"
          >
            <div className="flex items-center justify-center h-[32px] transition-transform group-active:translate-x-[0.5px] group-active:translate-y-[0.5px]">
              {tool.icon}
            </div>
            <span className="text-[11px] font-sans text-black leading-tight group-active:translate-x-[0.5px] group-active:translate-y-[0.5px]">
              {tool.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
