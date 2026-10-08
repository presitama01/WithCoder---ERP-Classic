/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WindowHeader } from './components/WindowHeader';
import { MenuBar } from './components/MenuBar';
import { Toolbar } from './components/Toolbar';
import { SubToolbar } from './components/SubToolbar';
import { GlobeBackground } from './components/GlobeBackground';
import { LoginWindow } from './components/LoginWindow';
import { StatusBar } from './components/StatusBar';
import { FormModal } from './components/FormModal';
import { CategoryListForm } from './components/CategoryListForm';
import { MerkListForm } from './components/MerkListForm';
import { TypeListForm } from './components/TypeListForm';
import { MasterBarangListForm } from './components/MasterBarangListForm';
import { MasterWilayahListForm } from './components/MasterWilayahListForm';
import { MasterLokasiGudangListForm } from './components/MasterLokasiGudangListForm';
import { CompanyProfileForm } from './components/CompanyProfileForm';
import { MasterBankListForm } from './components/MasterBankListForm';
import { MasterExpedisiListForm } from './components/MasterExpedisiListForm';
import { MasterSalesListForm } from './components/MasterSalesListForm';
import { MasterSupplierListForm } from './components/MasterSupplierListForm';
import { MasterCustomerListForm } from './components/MasterCustomerListForm';

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeMdiForm, setActiveMdiForm] = useState<
    | 'category'
    | 'merk'
    | 'type'
    | 'barang'
    | 'wilayah'
    | 'lokasi'
    | 'company_profile'
    | 'bank'
    | 'expedisi'
    | 'sales'
    | 'supplier'
    | 'customer'
    | null
  >('lokasi');
  const [activeUser, setActiveUser] = useState<string>('RETNO');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isInsertMode, setIsInsertMode] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Active generic form opened by other menu item selections
  const [activeForm, setActiveForm] = useState<{ module: string; title: string } | null>(null);

  const handleToolbarSelectAction = (moduleName: string, actionName: string) => {
    setStatusMessage(`Modul [${moduleName}]: ${actionName}`);
    if (actionName === 'Tabel Category') {
      setActiveMdiForm('category');
      setActiveForm(null);
    } else if (actionName === 'Tabel Merk') {
      setActiveMdiForm('merk');
      setActiveForm(null);
    } else if (actionName === 'Tabel Tipe' || actionName === 'Tabel Type') {
      setActiveMdiForm('type');
      setActiveForm(null);
    } else if (actionName === 'Master Barang') {
      setActiveMdiForm('barang');
      setActiveForm(null);
    } else if (actionName === 'Master Wilayah') {
      setActiveMdiForm('wilayah');
      setActiveForm(null);
    } else if (actionName === 'Master Lokasi Gudang') {
      setActiveMdiForm('lokasi');
      setActiveForm(null);
    } else if (actionName === 'Company Profile') {
      setActiveMdiForm('company_profile');
      setActiveForm(null);
    } else if (actionName === 'Rekening Bank') {
      setActiveMdiForm('bank');
      setActiveForm(null);
    } else if (actionName === 'Master Expedisi') {
      setActiveMdiForm('expedisi');
      setActiveForm(null);
    } else if (actionName === 'Master Sales') {
      setActiveMdiForm('sales');
      setActiveForm(null);
    } else if (actionName === 'Master Supplier') {
      setActiveMdiForm('supplier');
      setActiveForm(null);
    } else if (actionName === 'Master Customer') {
      setActiveMdiForm('customer');
      setActiveForm(null);
    } else {
      setActiveMdiForm(null);
      setActiveForm({ module: moduleName, title: actionName });
    }
  };

  const handleLoginSuccess = (user: string) => {
    setActiveUser(user);
    setStatusMessage(`User: [${user}] terotentikasi. Sistem siap digunakan.`);
    setIsLoginOpen(false);
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    setStatusMessage('Sesi ditutup.');
    setIsLoginOpen(true);
  };

  const handleLogout = () => {
    setStatusMessage('User telah logout. Silakan login kembali.');
    setIsLoginOpen(true);
  };

  const handleMenuAction = (actionName: string) => {
    setStatusMessage(`Menu: ${actionName}`);
    if (actionName === 'Tabel Category') {
      setActiveMdiForm('category');
      setActiveForm(null);
    } else if (actionName === 'Tabel Merk') {
      setActiveMdiForm('merk');
      setActiveForm(null);
    } else if (actionName === 'Tabel Tipe' || actionName === 'Tabel Type') {
      setActiveMdiForm('type');
      setActiveForm(null);
    } else if (actionName === 'Master Barang') {
      setActiveMdiForm('barang');
      setActiveForm(null);
    } else if (actionName === 'Master Wilayah') {
      setActiveMdiForm('wilayah');
      setActiveForm(null);
    } else if (actionName === 'Master Lokasi Gudang') {
      setActiveMdiForm('lokasi');
      setActiveForm(null);
    } else if (actionName === 'Company Profile') {
      setActiveMdiForm('company_profile');
      setActiveForm(null);
    } else if (actionName === 'Rekening Bank') {
      setActiveMdiForm('bank');
      setActiveForm(null);
    } else if (actionName === 'Master Expedisi') {
      setActiveMdiForm('expedisi');
      setActiveForm(null);
    } else if (actionName === 'Master Sales') {
      setActiveMdiForm('sales');
      setActiveForm(null);
    } else if (actionName === 'Master Supplier') {
      setActiveMdiForm('supplier');
      setActiveForm(null);
    } else if (actionName === 'Master Customer') {
      setActiveMdiForm('customer');
      setActiveForm(null);
    } else if (actionName === 'Cascade Windows' || actionName === 'Arrange Icons') {
      setIsLoginOpen(true);
    } else {
      setActiveMdiForm(null);
      setActiveForm({ module: 'System', title: actionName });
    }
  };

  // Window title reflects active child form
  const windowTitle =
    activeMdiForm === 'customer'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Master Customer]'
      : activeMdiForm === 'supplier'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Master Supplier]'
      : activeMdiForm === 'sales'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Master Sales]'
      : activeMdiForm === 'expedisi'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Master Expedisi]'
      : activeMdiForm === 'bank'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Master Bank]'
      : activeMdiForm === 'company_profile'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Company Profile]'
      : activeMdiForm === 'lokasi'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Master Lokasi Gudang]'
      : activeMdiForm === 'wilayah'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Master Wilayah]'
      : activeMdiForm === 'barang'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Master Barang]'
      : activeMdiForm === 'type'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Tabel Type]'
      : activeMdiForm === 'merk'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Tabel Merk]'
      : activeMdiForm === 'category'
      ? 'Indo IT - Main Menu ~ Menu Utama - [Tabel Category]'
      : activeForm
      ? `Indo IT - Main Menu ~ Menu Utama - [${activeForm.title}]`
      : 'Indo IT - Main Menu ~ Menu Utama';

  return (
    <div
      id="desktop-root"
      className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#D4D0C8] select-none"
    >
      {/* 1. Windows Aero Frame Header */}
      <WindowHeader
        title={windowTitle}
        onMinimize={() => setStatusMessage('Aplikasi di-minimize')}
        onMaximize={() => setStatusMessage('Mode layar penuh aktif')}
        onClose={handleExit}
      />

      {/* 2. Top Windows Menu Bar (File, Edit, Admin, Windows) */}
      <MenuBar
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onAction={handleMenuAction}
        onExit={handleExit}
        onAbout={() => setAboutOpen(true)}
      />

      {/* 3. Main Desktop Toolbar (Master, Pembelian, Penjualan, Stock, Keuangan, Exit) */}
      <Toolbar
        onSelectAction={handleToolbarSelectAction}
        onExit={handleExit}
      />

      {/* 4. Sub-toolbar with Month Active, Periode, Lokasi */}
      <SubToolbar
        onMonthChange={(m) => setStatusMessage(`Periode aktif diubah: ${m}`)}
        onLocationChange={(loc) => setStatusMessage(`Lokasi aktif diubah: ${loc}`)}
      />

      {/* 5. Desktop MDI Workspace Area */}
      <main id="mdi-workspace" className="relative flex-1 overflow-hidden w-full">
        {/* Curved Globe World Map Background Wallpaper */}
        <GlobeBackground />

        {/* List Tabel Category MDI Child Window */}
        <CategoryListForm
          isOpen={activeMdiForm === 'category'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* List Tabel Merk MDI Child Window */}
        <MerkListForm
          isOpen={activeMdiForm === 'merk'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* List Tabel Type MDI Child Window */}
        <TypeListForm
          isOpen={activeMdiForm === 'type'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* List Master Barang MDI Child Window */}
        <MasterBarangListForm
          isOpen={activeMdiForm === 'barang'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* List Master Wilayah MDI Child Window */}
        <MasterWilayahListForm
          isOpen={activeMdiForm === 'wilayah'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* List Master Lokasi Gudang MDI Child Window */}
        <MasterLokasiGudangListForm
          isOpen={activeMdiForm === 'lokasi'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* Company Profile MDI Child Window */}
        <CompanyProfileForm
          isOpen={activeMdiForm === 'company_profile'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* Master Bank MDI Child Window */}
        <MasterBankListForm
          isOpen={activeMdiForm === 'bank'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* Master Expedisi MDI Child Window */}
        <MasterExpedisiListForm
          isOpen={activeMdiForm === 'expedisi'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* Master Sales MDI Child Window */}
        <MasterSalesListForm
          isOpen={activeMdiForm === 'sales'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* Master Supplier MDI Child Window */}
        <MasterSupplierListForm
          isOpen={activeMdiForm === 'supplier'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* Master Customer MDI Child Window */}
        <MasterCustomerListForm
          isOpen={activeMdiForm === 'customer'}
          onClose={() => setActiveMdiForm(null)}
        />

        {/* Dynamic MDI Form Window for other clicked menu actions */}
        {activeForm && (
          <FormModal
            isOpen={!!activeForm}
            moduleName={activeForm.module}
            formTitle={activeForm.title}
            onClose={() => setActiveForm(null)}
          />
        )}

        {/* Draggable Login Dialog Window (can be reopened via logout / menu) */}
        <LoginWindow
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          initialPos={{ x: 20, y: 30 }}
        />

        {/* Exit Confirmation Dialog (Classic Windows Alert) */}
        {showExitDialog && (
          <div
            id="exit-modal-backdrop"
            className="absolute inset-0 bg-black/20 flex items-center justify-center z-50"
          >
            <div
              id="exit-dialog-window"
              className="w-[320px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl"
            >
              <div className="flex items-center justify-between h-[22px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
                <span>Konfirmasi Keluar</span>
                <button
                  type="button"
                  onClick={() => setShowExitDialog(false)}
                  className="w-[16px] h-[15px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 text-[12px] font-sans text-black">
                <p>Apakah Anda yakin ingin keluar dari aplikasi?</p>
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    id="exit-confirm-btn"
                    type="button"
                    onClick={confirmExit}
                    className="w-[64px] h-[23px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] active:shadow-inner cursor-pointer font-sans"
                  >
                    Ya
                  </button>
                  <button
                    id="exit-cancel-btn"
                    type="button"
                    onClick={() => setShowExitDialog(false)}
                    className="w-[64px] h-[23px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] active:shadow-inner cursor-pointer font-sans"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* About Dialog */}
        {aboutOpen && (
          <div
            id="about-modal-backdrop"
            className="absolute inset-0 bg-black/20 flex items-center justify-center z-50"
          >
            <div
              id="about-dialog-window"
              className="w-[330px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans"
            >
              <div className="flex items-center justify-between h-[22px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
                <span>Tentang Indo IT ERP</span>
                <button
                  type="button"
                  onClick={() => setAboutOpen(false)}
                  className="w-[16px] h-[15px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 text-[11px] text-black space-y-2">
                <div className="font-bold text-[13px] text-[#0A246A]">Indo IT Enterprise Suite</div>
                <p className="text-gray-700">Versi 2.4.1 (Build 2026)</p>
                <p className="text-gray-600">
                  Modul: Master Data, Pembelian, Penjualan, Manajemen Stock, dan Akuntansi Keuangan.
                </p>
                <div className="border-t border-[#808080] pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAboutOpen(false)}
                    className="w-[60px] h-[22px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] cursor-pointer font-sans"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 6. Bottom Classic Status Bar */}
      <StatusBar
        userName={activeUser}
        statusMessage={statusMessage}
        isInsertMode={isInsertMode}
        onToggleInsert={() => setIsInsertMode(!isInsertMode)}
      />
    </div>
  );
}
