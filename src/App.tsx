/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MenuBar } from './components/MenuBar';
import { Toolbar } from './components/Toolbar';
import { SubToolbar } from './components/SubToolbar';
import { GlobeBackground } from './components/GlobeBackground';
import { LoginWindow } from './components/LoginWindow';
import { StatusBar } from './components/StatusBar';

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(true);
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [isInsertMode, setIsInsertMode] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleSelectModule = (moduleName: string) => {
    setStatusMessage(`Modul: ${moduleName} - Silakan login terlebih dahulu untuk membuka hak akses.`);
  };

  const handleLoginSuccess = (user: string) => {
    setActiveUser(user);
    setStatusMessage(`User: [${user}] terotentikasi. Sistem siap digunakan.`);
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    setStatusMessage('Sesi ditutup.');
    setActiveUser(null);
    setIsLoginOpen(false);
  };

  const handleLogout = () => {
    setActiveUser(null);
    setStatusMessage('User telah logout. Silakan login kembali.');
    setIsLoginOpen(true);
  };

  const handleMenuAction = (actionName: string) => {
    setStatusMessage(`Menu: ${actionName}`);
    if (actionName === 'Cascade Windows' || actionName === 'Arrange Icons') {
      setIsLoginOpen(true);
    }
  };

  return (
    <div id="desktop-root" className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#D4D0C8] select-none">
      {/* 1. Top Windows Menu Bar */}
      <MenuBar
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onAction={handleMenuAction}
        onExit={handleExit}
        onAbout={() => setAboutOpen(true)}
      />

      {/* 2. Main Desktop Toolbar */}
      <Toolbar
        onSelectModule={handleSelectModule}
        onExit={handleExit}
      />

      {/* 3. Sub-toolbar with Filter/Select boxes */}
      <SubToolbar />

      {/* 4. Desktop MDI Workspace Area */}
      <main id="mdi-workspace" className="relative flex-1 overflow-hidden w-full">
        {/* Curved Globe World Map Background Wallpaper */}
        <GlobeBackground />

        {/* Draggable Login Dialog Window */}
        <LoginWindow
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          initialPos={{ x: 10, y: 18 }}
        />

        {/* Restore Window Floating Hint when closed */}
        {!isLoginOpen && (
          <div className="absolute bottom-4 left-4 z-30">
            <button
              id="restore-login-btn"
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="px-3 py-1.5 bg-[#ECE9D8] text-[11px] font-sans border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] shadow-md flex items-center space-x-1.5 hover:bg-[#F2EFE2] cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" fill="#4B77BE" stroke="#2C3E50" strokeWidth="1" />
              </svg>
              <span>Buka Dialog Login (WithCoder)</span>
            </button>
          </div>
        )}

        {/* Exit Confirmation Dialog (Classic Windows Alert) */}
        {showExitDialog && (
          <div
            id="exit-modal-backdrop"
            className="absolute inset-0 bg-black/20 flex items-center justify-center z-50"
          >
            <div
              id="exit-dialog-window"
              className="w-[300px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl"
            >
              <div className="flex items-center justify-between h-[22px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
                <span>Konfirmasi Keluar</span>
                <button
                  onClick={() => setShowExitDialog(false)}
                  className="w-[16px] h-[15px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 text-[12px] font-sans text-black">
                <p>Apakah Anda yakin ingin keluar dari aplikasi?</p>
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    id="exit-confirm-btn"
                    onClick={confirmExit}
                    className="w-[60px] h-[22px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] active:shadow-inner cursor-pointer"
                  >
                    Ya
                  </button>
                  <button
                    id="exit-cancel-btn"
                    onClick={() => setShowExitDialog(false)}
                    className="w-[60px] h-[22px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] active:shadow-inner cursor-pointer"
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
              className="w-[320px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl font-sans"
            >
              <div className="flex items-center justify-between h-[22px] px-2 bg-gradient-to-r from-[#0A246A] to-[#A6CAF0] text-white text-[11px] font-bold">
                <span>Tentang WithCoder</span>
                <button
                  onClick={() => setAboutOpen(false)}
                  className="w-[16px] h-[15px] bg-[#ECE9D8] border border-black text-black flex items-center justify-center text-[9px] font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 text-[11px] text-black space-y-2">
                <div className="font-bold text-[13px] text-[#0A246A]">WithCoder Enterprise Suite</div>
                <p className="text-gray-700">Versi 2.4.1 (Build 2026)</p>
                <p className="text-gray-600">
                  Modul: Master Data, Pembelian, Penjualan, Manajemen Stock, dan Akuntansi Keuangan.
                </p>
                <div className="border-t border-[#808080] pt-2 flex justify-end">
                  <button
                    onClick={() => setAboutOpen(false)}
                    className="w-[60px] h-[22px] bg-[#ECE9D8] border-2 border-t-white border-l-white border-b-[#707070] border-r-[#707070] text-[11px] cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 5. Bottom Classic Status Bar */}
      <StatusBar
        statusMessage={activeUser ? `Logged in as: ${activeUser}` : statusMessage}
        isInsertMode={isInsertMode}
        onToggleInsert={() => setIsInsertMode(!isInsertMode)}
      />
    </div>
  );
}
