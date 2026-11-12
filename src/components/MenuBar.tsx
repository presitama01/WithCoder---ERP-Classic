import React, { useState, useRef, useEffect } from 'react';
import { MenuGroup } from '../types';
import { executeEditAction } from '../lib/clipboardHelper';

interface MenuBarProps {
  isLoggedIn?: boolean;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onAction?: (actionName: string) => void;
  onExit?: () => void;
  onAbout?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  isLoggedIn = true,
  onOpenLogin,
  onLogout,
  onAction,
  onExit,
  onAbout: _onAbout,
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
          label: 'LogIn...',
          disabled: isLoggedIn,
          action: () => {
            setOpenMenuIndex(null);
            onOpenLogin?.();
          },
        },
        { divider: true, label: '' },
        {
          label: 'Database Utility',
          disabled: true,
          hasSubmenu: true,
          subItems: [
            { label: 'Backup Database...', action: () => handleAction('Backup Database') },
            { label: 'Restore Database...', action: () => handleAction('Restore Database') },
            { divider: true, label: '' },
            { label: 'Repair & Compact Database', action: () => handleAction('Repair Database') },
            { label: 'Check Database Integrity', action: () => handleAction('Check Database Integrity') },
          ],
        },
        { label: 'Rubah Password', disabled: true, action: () => handleAction('Rubah Password') },
        { divider: true, label: '' },
        {
          label: 'SecurityTransaksi',
          disabled: true,
          hasSubmenu: true,
          subItems: [
            { label: 'Otorisasi Transaksi...', action: () => handleAction('Otorisasi Transaksi') },
            { label: 'Approval Level...', action: () => handleAction('Approval Level') },
            { divider: true, label: '' },
            { label: 'Log Security Transaksi', action: () => handleAction('Log Security Transaksi') },
          ],
        },
        { divider: true, label: '' },
        { label: 'Tabel Transaksi', disabled: true, action: () => handleAction('Tabel Transaksi') },
        { label: 'Tabel Kurs', disabled: true, action: () => handleAction('Tabel Kurs') },
        { divider: true, label: '' },
        { label: 'Set Periode Bulan', disabled: true, action: () => handleAction('Set Periode Bulan') },
        { label: 'Perbaikan Transaksi', disabled: true, action: () => handleAction('Perbaikan Transaksi') },
        { label: 'Posting Transaksi To Jurnal', disabled: true, action: () => handleAction('Posting Transaksi To Jurnal') },
        { label: 'Proses Bulanan', disabled: true, action: () => handleAction('Proses Bulanan') },
        { divider: true, label: '' },
        {
          label: 'LogOut',
          disabled: !isLoggedIn,
          action: () => {
            setOpenMenuIndex(null);
            onLogout?.();
          },
        },
        { divider: true, label: '' },
        { label: 'Exit', action: onExit },
      ],
    },
    {
      title: 'Edit',
      accessKey: 'E',
      items: [
        {
          label: 'Cut',
          shortcut: 'Ctrl+X',
          disabled: !isLoggedIn,
          action: () => {
            const feedback = executeEditAction('Cut');
            handleAction(feedback);
          },
        },
        {
          label: 'Copy',
          shortcut: 'Ctrl+C',
          disabled: !isLoggedIn,
          action: () => {
            const feedback = executeEditAction('Copy');
            handleAction(feedback);
          },
        },
        {
          label: 'Paste',
          shortcut: 'Ctrl+V',
          disabled: !isLoggedIn,
          action: () => {
            const feedback = executeEditAction('Paste');
            handleAction(feedback);
          },
        },
        { divider: true, label: '' },
        {
          label: 'Select All',
          shortcut: 'Ctrl+A',
          disabled: !isLoggedIn,
          action: () => {
            const feedback = executeEditAction('Select All');
            handleAction(feedback);
          },
        },
      ],
    },
    {
      title: 'Admin',
      accessKey: 'A',
      items: [
        { label: 'Otorisasi Pengguna / User Rights', disabled: !isLoggedIn, action: () => handleAction('Otorisasi Pengguna') },
        { label: 'Ganti Password', disabled: !isLoggedIn, action: () => handleAction('Ganti Password') },
        { divider: true, label: '' },
        { label: 'Setup Perusahaan & Cabang', disabled: !isLoggedIn, action: () => handleAction('Setup Perusahaan') },
        { label: 'Konfigurasi Database', disabled: true, action: () => handleAction('Konfigurasi Database') },
        { label: 'Backup & Restore Data...', disabled: true, action: () => handleAction('Backup & Restore Data') },
        { divider: true, label: '' },
        { label: 'Audit Trail / Log Sistem', disabled: true, action: () => handleAction('Audit Trail') },
      ],
    },
    {
      title: 'Windows',
      accessKey: 'W',
      items: [
        { label: 'Cascade', disabled: !isLoggedIn, action: () => handleAction('Cascade Windows') },
        { label: 'Tile Horizontal', disabled: !isLoggedIn, action: () => handleAction('Tile Horizontal') },
        { label: 'Tile Vertical', disabled: !isLoggedIn, action: () => handleAction('Tile Vertical') },
        { label: 'Arrange Icons', disabled: !isLoggedIn, action: () => handleAction('Arrange Icons') },
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
    // If not logged in, only File menu can be opened
    if (!isLoggedIn && index !== 0) {
      return;
    }
    if (openMenuIndex === index) {
      setOpenMenuIndex(null);
      setActiveSubmenuIndex(null);
    } else {
      setOpenMenuIndex(index);
      setActiveSubmenuIndex(null);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (!isLoggedIn && index !== 0) return;
    if (openMenuIndex !== null) {
      setOpenMenuIndex(index);
      setActiveSubmenuIndex(null);
    }
  };

  return (
    <div
      ref={containerRef}
      id="main-menubar"
      className="relative z-[999] flex items-center h-[24px] bg-[#ECE9D8] border-b border-[#919B9C] px-1 text-[11px] font-sans select-none text-black"
    >
      {menus.map((menu, index) => {
        const isOpen = openMenuIndex === index;
        const isMenuDisabled = !isLoggedIn && index !== 0;

        return (
          <div key={menu.title} className="relative">
            <button
              id={`menu-item-${menu.title.toLowerCase()}`}
              type="button"
              disabled={isMenuDisabled}
              onClick={() => handleMenuClick(index)}
              onMouseEnter={() => handleMouseEnter(index)}
              className={`px-2 py-0.5 outline-none text-left transition-none text-[11px] font-sans ${
                isMenuDisabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : isOpen
                  ? 'bg-gradient-to-b from-[#E6EFF9] to-[#C8DBF4] border border-[#7BA7E1] rounded-[2px] shadow-sm text-black cursor-pointer'
                  : 'hover:bg-[#E5EFF9] hover:border hover:border-[#B5D3FF] border border-transparent rounded-[2px] cursor-pointer'
              }`}
            >
              <span className="underline">{menu.title.charAt(0)}</span>
              {menu.title.slice(1)}
            </button>

            {/* Main Dropdown Menu Popup */}
            {isOpen && (
              <div
                id={`dropdown-${menu.title.toLowerCase()}`}
                className="absolute left-0 top-[23px] min-w-[200px] bg-[#F9F9F8] border border-[#7F9DB9] shadow-[2px_3px_5px_rgba(0,0,0,0.25)] py-0.5 z-[10000] text-[11px]"
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
