import React, { useState, useRef, useEffect } from 'react';
import {
  MasterIcon,
  PembelianIcon,
  PenjualanIcon,
  StockIcon,
  KeuanganIcon,
  ExitIcon,
} from './ToolbarIcons';

export interface SubMenuItem {
  label: string;
  divider?: boolean;
  action?: () => void;
}

export interface ToolbarMenuItem {
  label: string;
  shortcut?: string;
  divider?: boolean;
  hasSubmenu?: boolean;
  subItems?: SubMenuItem[];
  action?: () => void;
}

export interface ToolbarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  items?: ToolbarMenuItem[];
  isDirectAction?: boolean;
}

interface ToolbarProps {
  onSelectAction: (moduleName: string, actionName: string) => void;
  onExit: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onSelectAction, onExit }) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeSubmenuIdx, setActiveSubmenuIdx] = useState<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
        setActiveSubmenuIdx(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        setActiveSubmenuIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleItemClick = (moduleName: string, item: ToolbarMenuItem) => {
    setOpenMenuId(null);
    setActiveSubmenuIdx(null);
    if (item.action) {
      item.action();
    } else {
      onSelectAction(moduleName, item.label);
    }
  };

  const handleSubItemClick = (moduleName: string, subItem: SubMenuItem) => {
    setOpenMenuId(null);
    setActiveSubmenuIdx(null);
    if (subItem.action) {
      subItem.action();
    } else {
      onSelectAction(moduleName, subItem.label);
    }
  };

  // Exact menus from the 6 user screenshots
  const toolbarMenus: ToolbarItem[] = [
    // 1. MASTER
    {
      id: 'master',
      label: 'Master',
      icon: <MasterIcon />,
      items: [
        { label: 'Tabel Category' },
        { label: 'Tabel Merk' },
        { label: 'Tabel Tipe' },
        { label: 'Master Barang' },
        { divider: true, label: '' },
        { label: 'Company Profile' },
        { label: 'Rekening Bank' },
        { label: 'Master Wilayah' },
        { label: 'Master Lokasi Gudang' },
        { divider: true, label: '' },
        { label: 'Master Expedisi' },
        { label: 'Master Sales' },
        { label: 'Master Supplier' },
        { label: 'Master Customer' },        
        { divider: true, label: '' },
        { label: 'Exit', shortcut: 'Ctrl+Q', action: onExit },
      ],
    },

    // 2. PEMBELIAN
    {
      id: 'pembelian',
      label: 'Pembelian',
      icon: <PembelianIcon />,
      items: [
        { label: 'Input Saldo Awal Hutang' },
        { label: 'Input Daftar Giro' },
        { divider: true, label: '' },
        { label: 'Purchase Request (PR)' },
        { label: 'Purchase Order (PO)' },
        { label: 'Input Pembelian Barang' },
        { label: 'Retur Pembelian Barang' },
        {
          label: 'Pembayaran Hutang Dagang',
          hasSubmenu: true,
          subItems: [
            { label: 'Pembayaran Kas / Tunai' },
            { label: 'Pembayaran Giro / Bank' },
            { divider: true, label: '' },
            { label: 'Daftar Pembayaran Hutang' },
          ],
        },
        { label: 'Posting Giro Keluar' },
        { divider: true, label: '' },
        { label: 'Laporan Purchase Order' },
        { label: 'Laporan Pembelian Barang' },
        { label: 'Laporan Retur Pembelian Barang' },
        { label: 'Rekap Hutang Dagang' },
        { label: 'Kartu Hutang' },
        { label: 'Rekap Pembayaran Hutang' },
      ],
    },

    // 3. PENJUALAN
    {
      id: 'penjualan',
      label: 'Penjualan',
      icon: <PenjualanIcon />,
      items: [
        { label: 'Input Saldo Awal Piutang' },
        { label: 'Input Daftar Giro' },
        { divider: true, label: '' },
        { label: 'Sales Inquary (SI)' },
        { label: 'Sales Quotation (SQ)' },
        {
          label: 'Sales Order (SO)',
          hasSubmenu: true,
          subItems: [
            { label: 'Entry Sales Order (SO)' },
            { label: 'Daftar Sales Order' },
            { label: 'Otorisasi SO' },
          ],
        },
        { label: 'Surat Jalan (DO)' },
        {
          label: 'Invoice Penjualan',
          hasSubmenu: true,
          subItems: [
            { label: 'Entry Invoice Penjualan' },
            { label: 'Daftar Invoice Penjualan' },
            { label: 'Cetak Ulang Faktur Penjualan' },
          ],
        },
        { label: 'Retur Penjualan Barang' },
        { label: 'Input Tukar Faktur' },
        {
          label: 'A/R Payment (Piutang Dagang)',
          hasSubmenu: true,
          subItems: [
            { label: 'Penerimaan Pembayaran Tunai' },
            { label: 'Penerimaan Pembayaran Giro/Bank' },
            { divider: true, label: '' },
            { label: 'Daftar Pembayaran Piutang' },
          ],
        },
        { label: 'Posting Giro In' },
        { label: 'Hitung Komisi' },
        { divider: true, label: '' },
        { label: 'Laporan Sales Order' },
        { label: 'Laporan Surat Jalan' },
        { label: 'Laporan Penjualan Barang' },
        { label: 'Laporan Retur Penjualan Barang' },
        { label: 'Rekap Piutang Dagang' },
        { label: 'Kartu Piutang' },
        { label: 'Laporan Pembayaran dan Penerimaan Giro' },
        { label: 'Laporan Omset Penjualan' },
      ],
    },

    // 4. STOCK
    {
      id: 'stock',
      label: 'Stock',
      icon: <StockIcon />,
      items: [
        { label: 'Input Persediaan Awal' },
        { label: 'Input Modal Barang' },
        { divider: true, label: '' },
        { label: 'Mutasi Antar Lokasi' },
        { divider: true, label: '' },
        { label: 'Penerimaan Barang Lain' },
        { label: 'Pengeluaran Barang Lain' },
        { divider: true, label: '' },
        { label: 'Cetak Item Barang' },
        { label: 'Kartu Stock' },
        { label: 'Laporan Persediaan Barang' },
        { divider: true, label: '' },
        { label: 'Laporan Penerimaan Barang Lain' },
        { label: 'Laporan Pengeluaran Barang Lain' },
      ],
    },

    // 5. KEUANGAN
    {
      id: 'keuangan',
      label: 'Keuangan',
      icon: <KeuanganIcon />,
      items: [
        { label: 'Jurnal Header' },
        { label: 'Daftar Akun/Perkiraan' },
        { label: 'Input Saldo Awal Ledger' },
        { divider: true, label: '' },
        { label: 'Ledger Setup Transaksi' },
        {
          label: 'Tabel Pembayaran',
          hasSubmenu: true,
          subItems: [
            { label: 'Metode Pembayaran' },
            { label: 'Setup Kas & Bank' },
            { label: 'Tabel Mata Uang & Kurs' },
          ],
        },
        { divider: true, label: '' },
        { label: 'HPP Pembelian Barang' },
        { divider: true, label: '' },
        { label: 'Jurnal Umum' },
        { label: 'Posting Ledger' },
        { divider: true, label: '' },
        { label: 'Laporan Keuangan' },
        { label: 'Rekap Jurnal Umum' },
      ],
    },

    // 6. EXIT
    {
      id: 'exit',
      label: 'Exit',
      icon: <ExitIcon />,
      isDirectAction: true,
    },
  ];

  const handleButtonClick = (tool: ToolbarItem) => {
    if (tool.isDirectAction) {
      setOpenMenuId(null);
      setActiveSubmenuIdx(null);
      onExit();
      return;
    }
    if (openMenuId === tool.id) {
      setOpenMenuId(null);
      setActiveSubmenuIdx(null);
    } else {
      setOpenMenuId(tool.id);
      setActiveSubmenuIdx(null);
    }
  };

  const handleButtonMouseEnter = (tool: ToolbarItem) => {
    if (openMenuId !== null && !tool.isDirectAction) {
      setOpenMenuId(tool.id);
      setActiveSubmenuIdx(null);
    }
  };

  return (
    <div
      ref={toolbarRef}
      id="main-toolbar"
      className="relative z-40 flex items-center h-[54px] bg-[#ECE9D8] border-b border-[#ACA899] px-2 select-none"
    >
      <div className="flex items-center space-x-1">
        {toolbarMenus.map((tool) => {
          const isOpen = openMenuId === tool.id;

          return (
            <div key={tool.id} className="relative">
              <button
                id={`toolbar-btn-${tool.id}`}
                type="button"
                onClick={() => handleButtonClick(tool)}
                onMouseEnter={() => handleButtonMouseEnter(tool)}
                title={tool.label}
                className={`group flex flex-col items-center justify-center w-[62px] h-[50px] px-1 py-0.5 transition-none cursor-pointer ${
                  isOpen
                    ? 'bg-[#E3EBF6] border border-[#7BA7E1] shadow-inner'
                    : 'hover:bg-[#F2EFE2] hover:border hover:border-[#D1CDBC] border border-transparent active:bg-[#DFDBD0]'
                }`}
              >
                <div className="flex items-center justify-center h-[32px] transition-transform group-active:translate-x-[0.5px] group-active:translate-y-[0.5px]">
                  {tool.icon}
                </div>
                <span className="text-[11px] font-sans text-black leading-tight group-active:translate-x-[0.5px] group-active:translate-y-[0.5px]">
                  {tool.label}
                </span>
              </button>

              {/* Toolbar Dropdown Menu */}
              {isOpen && tool.items && (
                <div
                  id={`toolbar-menu-${tool.id}`}
                  className="absolute left-0 top-[52px] min-w-[215px] max-h-[calc(100vh-140px)] overflow-y-auto bg-[#F7F7F6] border border-[#7F9DB9] shadow-[2px_4px_8px_rgba(0,0,0,0.35)] py-1 z-[9999] text-[11px] font-sans"
                >
                  {tool.items.map((item, itemIdx) => {
                    if (item.divider) {
                      return (
                        <div
                          key={itemIdx}
                          className="my-1 mx-2 border-t border-[#D6D6D6] border-b border-white"
                        />
                      );
                    }

                    const hasSub = !!item.hasSubmenu || (item.subItems && item.subItems.length > 0);
                    const isSubOpen = activeSubmenuIdx === itemIdx;

                    return (
                      <div
                        key={itemIdx}
                        className="relative"
                        onMouseEnter={() => {
                          if (hasSub) {
                            setActiveSubmenuIdx(itemIdx);
                          } else {
                            setActiveSubmenuIdx(null);
                          }
                        }}
                      >
                        <button
                          id={`toolbar-menu-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                          type="button"
                          onClick={() => {
                            if (!hasSub) {
                              handleItemClick(tool.label, item);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1 text-left ${
                            isSubOpen
                              ? 'bg-gradient-to-r from-[#D7E6F8] to-[#EAF2FC] text-black border-y border-[#B2CEEF]'
                              : 'hover:bg-gradient-to-r hover:from-[#D7E6F8] hover:to-[#EAF2FC] hover:border-y hover:border-[#B2CEEF] text-black cursor-pointer'
                          }`}
                        >
                          <span className="pr-3 whitespace-nowrap">{item.label}</span>

                          <div className="flex items-center space-x-2">
                            {item.shortcut && (
                              <span className="text-[10px] text-gray-500 font-sans">
                                {item.shortcut}
                              </span>
                            )}
                            {hasSub && (
                              <span className="text-[8px] text-black pl-1">
                                ▶
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Nested Submenu */}
                        {hasSub && isSubOpen && item.subItems && (
                          <div
                            id={`toolbar-submenu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                            className="absolute left-full top-[-2px] min-w-[190px] bg-[#F7F7F6] border border-[#7F9DB9] shadow-[2px_3px_6px_rgba(0,0,0,0.3)] py-1 z-50 text-[11px]"
                          >
                            {item.subItems.map((subItem, subIdx) => {
                              if (subItem.divider) {
                                return (
                                  <div
                                    key={subIdx}
                                    className="my-1 mx-2 border-t border-[#D6D6D6] border-b border-white"
                                  />
                                );
                              }
                              return (
                                <button
                                  key={subIdx}
                                  type="button"
                                  onClick={() => handleSubItemClick(tool.label, subItem)}
                                  className="w-full px-3 py-1 text-left text-black hover:bg-gradient-to-r hover:from-[#D7E6F8] hover:to-[#EAF2FC] hover:border-y hover:border-[#B2CEEF] cursor-pointer whitespace-nowrap"
                                >
                                  {subItem.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
