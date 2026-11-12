import React, { useState, useRef, useEffect } from 'react';
import { WindowPosition } from '../types';
import { authenticateUser, UserRole } from '../lib/authService';

interface LoginWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (username: string, role: UserRole) => void;
  initialPos?: WindowPosition;
}

export const LoginWindow: React.FC<LoginWindowProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialPos,
}) => {
  // Center window on screen by default or use provided pos
  const defaultPos = (): WindowPosition => {
    if (initialPos) return initialPos;
    if (typeof window !== 'undefined') {
      const x = Math.max(20, Math.floor((window.innerWidth - 330) / 2));
      const y = Math.max(50, Math.floor((window.innerHeight - 300) / 2));
      return { x, y };
    }
    return { x: 50, y: 70 };
  };

  const [position, setPosition] = useState<WindowPosition>(defaultPos);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const windowRef = useRef<HTMLDivElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLoginMessage(null);
      setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(0, Math.min(window.innerWidth - 330, e.clientX - dragOffset.x));
      const newY = Math.max(30, Math.min(window.innerHeight - 290, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleOk = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanUser = username.trim().toUpperCase();
    if (!cleanUser) {
      setLoginMessage({ text: 'Silakan masukkan User ID.', isError: true });
      usernameInputRef.current?.focus();
      return;
    }
    if (!password) {
      setLoginMessage({ text: 'Silakan masukkan Password.', isError: true });
      return;
    }

    try {
      setIsChecking(true);
      const user = await authenticateUser(cleanUser, password);
      setLoginMessage({
        text: `Login berhasil: ${user.username} (${user.role})`,
        isError: false,
      });
      onLoginSuccess?.(user.username, user.role);
      setTimeout(() => {
        setLoginMessage(null);
        onClose();
      }, 500);
    } catch (err: any) {
      setLoginMessage({ text: err?.message || 'Login gagal.', isError: true });
    } finally {
      setIsChecking(false);
    }
  };

  const handleCancel = () => {
    setLoginMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={windowRef}
      id="login-window"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className="absolute z-40 w-[330px] bg-[#ECE9D8] rounded-t-[4px] shadow-[3px_3px_12px_rgba(0,0,0,0.45)] border-[2px] border-[#0055EA] select-none font-sans"
    >
      {/* 1. Title Bar */}
      <div
        id="login-titlebar"
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between h-[28px] px-2 rounded-t-[2px] bg-gradient-to-r from-[#80A8E9] via-[#A8C7F5] to-[#7DA4E6] border-b border-[#7095D3] cursor-move select-none"
      >
        <div className="flex items-center space-x-1.5">
          <div className="w-[16px] h-[16px] flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill="#4377B8" stroke="#1D4B83" strokeWidth="1" />
              <circle cx="8" cy="8" r="2.8" fill="#DDEBFD" />
              <path d="M8 2.5V13.5M2.5 8H13.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[12px] font-bold text-[#001D4A] tracking-tight">
            WithCoder - Login
          </span>
        </div>

        <button
          id="login-close-btn"
          type="button"
          onClick={handleCancel}
          className="w-[21px] h-[20px] bg-[#D74338] hover:bg-[#E85347] active:bg-[#B3261C] border border-[#B72A20] rounded-[2px] flex items-center justify-center cursor-pointer shadow-inner"
          title="Tutup"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 1L7 7M7 1L1 7" stroke="white" strokeWidth="1.8" strokeLinecap="square" />
          </svg>
        </button>
      </div>

      {/* 2. Dialog Body */}
      <div className="p-2.5 bg-[#ECE9D8]">
        {/* Top Inset Logo Frame */}
        <div
          id="login-banner-box"
          className="w-full h-[110px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-[#FFFFFF] border-r-[#FFFFFF] shadow-inner flex flex-col items-center justify-center"
        >
          <div className="text-[18px] font-serif font-bold text-[#3B6691] tracking-[0.24em] text-center">
            W I T H C O D E R
          </div>
          <div className="text-[11px] text-[#8A9AA8] font-sans tracking-wide mt-1.5 text-center font-normal">
            Enterprise Resource Planning
          </div>
        </div>

        {/* Etched Horizontal Separator */}
        <div className="h-[2px] border-t border-[#909090] border-b border-white my-2.5" />

        {/* Bottom Authorization Group Box */}
        <form onSubmit={handleOk}>
          <fieldset
            id="login-authorization-fieldset"
            className="border border-[#A5A5A5] px-2.5 pt-2 pb-2.5 rounded-none"
          >
            <legend className="px-1 text-[11px] font-bold text-[#C00000] ml-2">
              Authorization
            </legend>

            <div className="grid grid-cols-[1fr_72px] gap-x-3 gap-y-2 items-center mt-1">
              {/* Row 1: Username & OK button */}
              <input
                ref={usernameInputRef}
                id="login-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-[23px] px-1.5 text-[11px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white shadow-inner outline-none font-sans focus:bg-[#FFFFF0]"
                autoComplete="username"
              />
              <button
                id="login-ok-btn"
                type="submit"
                disabled={isChecking}
                className="w-[72px] h-[23px] bg-[#ECE9D8] hover:bg-[#F2EFE4] active:bg-[#DDD9C9] border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] shadow-[1px_1px_0px_#202020] text-[11px] font-sans text-black cursor-pointer flex items-center justify-center active:border-t-[#404040] active:border-l-[#404040] active:border-b-white active:border-r-white"
              >
                {isChecking ? '...' : 'OK'}
              </button>

              {/* Row 2: Password & Cancel button */}
              <input
                id="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[23px] px-1.5 text-[11px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white shadow-inner outline-none font-sans focus:bg-[#FFFFF0]"
                autoComplete="current-password"
              />
              <button
                id="login-cancel-btn"
                type="button"
                onClick={handleCancel}
                className="w-[72px] h-[23px] bg-[#ECE9D8] hover:bg-[#F2EFE4] active:bg-[#DDD9C9] border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] shadow-[1px_1px_0px_#202020] text-[11px] font-sans text-black cursor-pointer flex items-center justify-center active:border-t-[#404040] active:border-l-[#404040] active:border-b-white active:border-r-white"
              >
                Cancel
              </button>
            </div>

            {loginMessage && (
              <div
                id="login-feedback-message"
                className={`mt-2 text-[10px] font-bold px-1.5 py-0.5 border ${
                  loginMessage.isError
                    ? 'text-red-700 bg-red-50 border-red-300'
                    : 'text-green-800 bg-green-50 border-green-300'
                }`}
              >
                {loginMessage.text}
              </div>
            )}
          </fieldset>
        </form>
      </div>
    </div>
  );
};
