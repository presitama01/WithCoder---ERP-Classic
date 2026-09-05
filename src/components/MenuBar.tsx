import React, { useState, useRef, useEffect } from 'react';
import { MenuGroup, MenuItem } from '../types';

interface MenuBarProps {
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onAction?: (actionName: string) => void;
  onExit?: () => void;
  onAbout?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onOpenLogin,
  onLogout,
  onAction,
  onExit,
  onAbout,
}) => {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAction = (label: string, customAction?: () => void) => {
    setOpenMenuIndex(null);
    setActiveSubmenuIndex(null);
    if (customAction) {
      customAction();
    } else {
      onAction?.(label);
    }
  };

  const menus: MenuGroup[] = [
    {
      title: 'File',
      accessKey: 'F',
      items: [
        {
          label: 'Database Utility',
          hasSubmenu: true,
          subItems: [
            { label: 'Backup Database...', action: () => handleAction('Backup Database') },
            { label: 'Restore Database...', action: () => handleAction('Restore Database') },
            { divider: true, label: '' },
            { label: 'Repair & Compact Database', action: () => handleAction('Repair Database') },
            { label: 'Check Database Integrity', action: () => handleAction('Check Database Integrity') },
          ],
        },
        { label: 'Rubah Password', action: () => handleAction('Rubah Password') },
        { divider: true, label: '' },
        {
          label: 'SecurityTransaksi',
          hasSubmenu: true,
          subItems: [
            { label: 'Otorisasi Transaksi...', action: () => handleAction('Otorisasi Transaksi') },
            { label: 'Approval Level...', action: () => handleAction('Approval Level') },
            { divider: true, label: '' },
            { label: 'Log Security Transaksi', action: () => handleAction('Log Security Transaksi') },
          ],
        },
        { divider: true, label: '' },
        { label: 'Tabel Transaksi', action: () => handleAction('Tabel Transaksi') },
        { label: 'Tabel Kurs', action: () => handleAction('Tabel Kurs') },
        { divider: true, label: '' },
        { label: 'Set Periode Bulan', action: () => handleAction('Set Periode Bulan') },
        { label: 'Perbaikan Transaksi', action: () => handleAction('Perbaikan Transaksi') },
        { label: 'Posting Transaksi To Jurnal', action: () => handleAction('Posting Transaksi To Jurnal') },
        { label: 'Proses Bulanan', action: () => handleAction('Proses Bulanan') },
        { divider: true, label: '' },
        { label: 'LogOut', action: onLogout || onExit },
      ],
    },
    {
      title: 'Edit',
      accessKey: 'E',
      items: [
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => handleAction('Cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => handleAction('Copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => handleAction('Paste') },
        { divider: true, label: '' },
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => handleAction('Select All') },
      ],
    },
    {
      title: 'Admin',
      accessKey: 'A',
      items: [
        { label: 'Otorisasi Pengguna / User Rights', action: () => handleAction('Otorisasi Pengguna') },
        { label: 'Ganti Password', action: () => handleAction('Ganti Password') },
        { divider: true, label: '' },
        { label: 'Setup Perusahaan & Cabang', action: () => handleAction('Setup Perusahaan') },
        { label: 'Konfigurasi Database', action: () => handleAction('Konfigurasi Database') },
        { label: 'Backup & Restore Data...', action: () => handleAction('Backup & Restore Data') },
        { divider: true, label: '' },
        { label: 'Audit Trail / Log Sistem', action: () => handleAction('Audit Trail') },
      ],
    },
    {
      title: 'Windows',
      accessKey: 'W',
      items: [
        { label: 'Cascade', action: () => handleAction('Cascade Windows') },
        { label: 'Tile Horizontal', action: () => handleAction('Tile Horizontal') },
        { label: 'Tile Vertical', action: () => handleAction('Tile Vertical') },
        { label: 'Arrange Icons', action: () => handleAction('Arrange Icons') },
      ],
    },
  ];

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenMenuIndex(null);
        setActiveSubmenuIndex(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuIndex(null);
        setActiveSubmenuIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMenuClick = (index: number) => {
    if (openMenuIndex === index) {
      setOpenMenuIndex(null);
      setActiveSubmenuIndex(null);
    } else {
      setOpenMenuIndex(index);
      setActiveSubmenuIndex(null);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (openMenuIndex !== null) {
      setOpenMenuIndex(index);
      setActiveSubmenuIndex(null);
    }
  };

  return (
    <div
      ref={containerRef}
      id="main-menubar"
      className="relative z-50 flex items-center h-[24px] bg-[#ECE9D8] border-b border-[#919B9C] px-1 text-[11px] font-sans select-none text-black"
    >
      {menus.map((menu, index) => {
        const isOpen = openMenuIndex === index;
        return (
          <div key={menu.title} className="relative">
            <button
              id={`menu-item-${menu.title.toLowerCase()}`}
              type="button"
              onClick={() => handleMenuClick(index)}
              onMouseEnter={() => handleMouseEnter(index)}
              className={`px-2 py-0.5 outline-none text-left transition-none text-[11px] font-sans cursor-pointer ${
                isOpen
                  ? 'bg-gradient-to-b from-[#E6EFF9] to-[#C8DBF4] border border-[#7BA7E1] rounded-[2px] shadow-sm text-black'
                  : 'hover:bg-[#E5EFF9] hover:border hover:border-[#B5D3FF] border border-transparent rounded-[2px]'
              }`}
            >
              <span className="underline">{menu.title.charAt(0)}</span>
              {menu.title.slice(1)}
            </button>

            {/* Main Dropdown Menu Popup */}
            {isOpen && (
              <div
                id={`dropdown-${menu.title.toLowerCase()}`}
                className="absolute left-0 top-[23px] min-w-[200px] bg-[#F9F9F8] border border-[#7F9DB9] shadow-[2px_3px_5px_rgba(0,0,0,0.25)] py-0.5 z-50 text-[11px]"
              >
                {menu.items.map((item, itemIdx) => {
                  if (item.divider) {
                    return (
                      <div
                        key={itemIdx}
                        className="my-1 mx-2 border-t border-[#D6D6D6] border-b border-white"
                      />
                    );
                  }

                  const hasSub = !!item.hasSubmenu || (item.subItems && item.subItems.length > 0);
                  const isSubOpen = activeSubmenuIndex === itemIdx;

                  return (
                    <div
                      key={itemIdx}
                      className="relative"
                      onMouseEnter={() => {
                        if (hasSub) {
                          setActiveSubmenuIndex(itemIdx);
                        } else {
                          setActiveSubmenuIndex(null);
                        }
                      }}
                    >
                      <button
                        id={`menu-option-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                        type="button"
                        disabled={item.disabled}
                        onClick={() => {
                          if (!hasSub) {
                            handleAction(item.label, item.action);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1 text-left ${
                          item.disabled
                            ? 'text-gray-400 cursor-default'
                            : isSubOpen
                            ? 'bg-gradient-to-r from-[#D7E6F8] to-[#EAF2FC] text-black border-y border-[#B2CEEF]'
                            : 'hover:bg-gradient-to-r hover:from-[#D7E6F8] hover:to-[#EAF2FC] hover:border-y hover:border-[#B2CEEF] text-black cursor-pointer'
                        }`}
                      >
                        <span className="pr-4">{item.label}</span>

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

                      {/* Nested Submenu if any */}
                      {hasSub && isSubOpen && item.subItems && (
                        <div
                          id={`submenu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                          className="absolute left-full top-[-2px] min-w-[180px] bg-[#F9F9F8] border border-[#7F9DB9] shadow-[2px_3px_5px_rgba(0,0,0,0.25)] py-0.5 z-50 text-[11px]"
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
                                onClick={() => handleAction(subItem.label, subItem.action)}
                                className="w-full px-3 py-1 text-left text-black hover:bg-gradient-to-r hover:from-[#D7E6F8] hover:to-[#EAF2FC] hover:border-y hover:border-[#B2CEEF] cursor-pointer"
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
  );
};
