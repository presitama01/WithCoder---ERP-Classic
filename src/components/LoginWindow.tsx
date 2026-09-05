import React, { useState, useRef, useEffect } from 'react';
import { WindowPosition } from '../types';

interface LoginWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (username: string) => void;
  initialPos?: WindowPosition;
}

export const LoginWindow: React.FC<LoginWindowProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialPos = { x: 8, y: 110 },
}) => {
  const [position, setPosition] = useState<WindowPosition>(initialPos);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  const windowRef = useRef<HTMLDivElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag from titlebar
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
      const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.x));
      const newY = Math.max(76, Math.min(window.innerHeight - 300, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleOk = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim()) {
      setLoginMessage('Silakan masukkan User ID.');
      return;
    }
    setLoginMessage(`Login berhasil sebagai: ${username}`);
    onLoginSuccess?.(username);
    setTimeout(() => {
      setLoginMessage(null);
    }, 3000);
  };

  const handleCancel = () => {
    setUsername('');
    setPassword('');
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
      className="absolute z-40 w-[310px] bg-[#ECE9D8] rounded-t-md shadow-[3px_3px_10px_rgba(0,0,0,0.4)] border border-[#0055EA] select-none font-sans"
    >
      {/* Window Title Bar */}
      <div
        id="login-titlebar"
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between h-[28px] px-2 rounded-t-[5px] bg-gradient-to-r from-[#9CBFEF] via-[#ABC8F3] to-[#88B0EB] border-b border-[#7095D3] cursor-move select-none"
      >
        <div className="flex items-center space-x-1.5">
          {/* Small application key/logo icon */}
          <div className="w-[16px] h-[16px] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" fill="#4B77BE" stroke="#2C3E50" strokeWidth="1" />
              <path d="M 6 8 L 10 8 M 8 6 L 8 10" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[12px] font-bold text-[#001D4A] tracking-tight drop-shadow-sm">
            WithCoder - Login
          </span>
        </div>

        {/* Windows XP / Classic style close button */}
        <button
          id="login-close-btn"
          type="button"
          onClick={onClose}
          className="w-[20px] h-[19px] bg-[#D74338] hover:bg-[#E85347] active:bg-[#B3261C] border border-[#B72A20] rounded-[2px] flex items-center justify-center cursor-pointer shadow-inner"
          title="Tutup"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d="M1 1L7 7M7 1L1 7"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="square"
            />
          </svg>
        </button>
      </div>

      {/* Window Body */}
      <div className="p-2 space-y-2 bg-[#ECE9D8]">
        {/* Upper Blank / Header Banner Area (as seen in screenshot) */}
        <div
          id="login-banner-box"
          className="w-full h-[105px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-[#FFFFFF] border-r-[#FFFFFF] shadow-inner flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Subtle watermark or clean area matching screenshot */}
          <div className="text-center opacity-70">
            <div className="text-[14px] font-serif font-bold text-[#1A4588] tracking-widest">
              W I T H C O D E R
            </div>
            <div className="text-[10px] text-gray-500 font-sans tracking-wide mt-0.5">
              Enterprise Resource Planning
            </div>
          </div>
        </div>

        {/* Thin divider line */}
        <div className="h-[2px] bg-[#A0A0A0] border-b border-white" />

        {/* Lower GroupBox: Authorization */}
        <form onSubmit={handleOk}>
          <fieldset
            id="login-authorization-fieldset"
            className="border border-[#7F9DB9] px-2 pb-2.5 pt-1 rounded-none"
          >
            <legend className="px-1 text-[11px] font-bold text-[#CC0000]">
              Authorization
            </legend>

            <div className="flex items-start justify-between mt-1 pt-1">
              {/* Input Fields on the left */}
              <div className="space-y-1.5 flex-1 pr-3">
                {/* Username Input */}
                <div>
                  <input
                    ref={usernameInputRef}
                    id="login-username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder=""
                    className="w-full h-[21px] px-1.5 text-[11px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-[#FFFFFF] border-r-[#FFFFFF] shadow-inner outline-none font-sans focus:bg-[#FFFFF0]"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <input
                    id="login-password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    className="w-full h-[21px] px-1.5 text-[11px] bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-[#FFFFFF] border-r-[#FFFFFF] shadow-inner outline-none font-sans focus:bg-[#FFFFF0]"
                  />
                </div>
              </div>

              {/* Action Buttons on the right (stacked OK and Cancel) */}
              <div className="flex flex-col space-y-2">
                <button
                  id="login-ok-btn"
                  type="submit"
                  className="w-[66px] h-[22px] bg-[#ECE9D8] border-2 border-t-[#FFFFFF] border-l-[#FFFFFF] border-b-[#707070] border-r-[#707070] shadow-[1px_1px_0px_#333333] active:border-t-[#707070] active:border-l-[#707070] active:border-b-[#FFFFFF] active:border-r-[#FFFFFF] active:shadow-inner text-[11px] font-sans text-black cursor-pointer flex items-center justify-center font-normal"
                >
                  OK
                </button>
                <button
                  id="login-cancel-btn"
                  type="button"
                  onClick={handleCancel}
                  className="w-[66px] h-[22px] bg-[#ECE9D8] border-2 border-t-[#FFFFFF] border-l-[#FFFFFF] border-b-[#707070] border-r-[#707070] shadow-[1px_1px_0px_#333333] active:border-t-[#707070] active:border-l-[#707070] active:border-b-[#FFFFFF] active:border-r-[#FFFFFF] active:shadow-inner text-[11px] font-sans text-black cursor-pointer flex items-center justify-center font-normal"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Status / feedback line */}
            {loginMessage && (
              <div
                id="login-feedback-message"
                className="mt-2 text-[10px] text-blue-800 font-medium px-1 bg-[#FFFFE0] border border-[#E0D890] py-0.5"
              >
                {loginMessage}
              </div>
            )}
          </fieldset>
        </form>
      </div>
    </div>
  );
};
