import React from 'react';

/**
 * Pixel-accurate vector recreations of the 6 classic ERP desktop toolbar icons
 */

export const MasterIcon: React.FC = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shelf shadow/base */}
    <rect x="2" y="28" width="30" height="3" fill="#696969" />
    <rect x="2" y="27" width="30" height="1" fill="#A8A8A8" />

    {/* Book 1 (Purple / Magenta) */}
    <g>
      <rect x="5" y="6" width="6" height="21" rx="1" fill="#7E1854" />
      <rect x="6" y="7" width="4" height="19" fill="#99226B" />
      <rect x="6" y="9" width="4" height="3" fill="#D85FA6" />
      <line x1="6" y1="18" x2="10" y2="18" stroke="#ECAAD1" strokeWidth="1" />
      <line x1="6" y1="20" x2="10" y2="20" stroke="#ECAAD1" strokeWidth="1" />
      {/* Top pages */}
      <path d="M 5 6 L 8 4 L 14 4 L 11 6 Z" fill="#F4E8B0" stroke="#8C1C60" strokeWidth="0.5" />
    </g>

    {/* Book 2 (Cyan / Teal) */}
    <g>
      <rect x="13" y="4" width="7" height="23" rx="1" fill="#176E79" />
      <rect x="14" y="5" width="5" height="21" fill="#20919F" />
      <rect x="14" y="7" width="5" height="3.5" fill="#52D0E0" />
      <line x1="14" y1="16" x2="19" y2="16" stroke="#A7EDF6" strokeWidth="1" />
      <line x1="14" y1="18" x2="19" y2="18" stroke="#A7EDF6" strokeWidth="1" />
      {/* Top pages */}
      <path d="M 13 4 L 16 2 L 23 2 L 20 4 Z" fill="#F9F5DE" stroke="#166772" strokeWidth="0.5" />
    </g>

    {/* Book 3 (Yellow / Gold / Greenish spine) */}
    <g>
      <rect x="22" y="7" width="7" height="20" rx="1" fill="#A67B10" />
      <rect x="23" y="8" width="5" height="18" fill="#C9971D" />
      <rect x="23" y="10" width="5" height="3" fill="#FDE167" />
      <line x1="23" y1="17" x2="28" y2="17" stroke="#FDEE9C" strokeWidth="1" />
      <line x1="23" y1="19" x2="28" y2="19" stroke="#FDEE9C" strokeWidth="1" />
      {/* Top pages */}
      <path d="M 22 7 L 25 5 L 31 5 L 29 7 Z" fill="#FBF9E7" stroke="#8A6509" strokeWidth="0.5" />
    </g>
  </svg>
);

export const PembelianIcon: React.FC = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Notebook / Order ledger */}
    {/* Shadow */}
    <rect x="6" y="5" width="22" height="26" rx="2" fill="#3E6941" />
    {/* Green border/binder */}
    <rect x="5" y="4" width="22" height="26" rx="2" fill="#4B814F" />
    {/* Yellowish notebook page */}
    <rect x="8" y="6" width="17" height="22" rx="1" fill="#FFFBE6" />

    {/* Spiral rings on left */}
    <circle cx="7" cy="8" r="1.5" fill="#D6D6D6" stroke="#333" strokeWidth="0.5" />
    <circle cx="7" cy="13" r="1.5" fill="#D6D6D6" stroke="#333" strokeWidth="0.5" />
    <circle cx="7" cy="18" r="1.5" fill="#D6D6D6" stroke="#333" strokeWidth="0.5" />
    <circle cx="7" cy="23" r="1.5" fill="#D6D6D6" stroke="#333" strokeWidth="0.5" />

    {/* Text lines */}
    <line x1="11" y1="9" x2="22" y2="9" stroke="#256B30" strokeWidth="1.5" />
    <line x1="11" y1="13" x2="22" y2="13" stroke="#8CA88E" strokeWidth="1" />
    <line x1="11" y1="16" x2="20" y2="16" stroke="#8CA88E" strokeWidth="1" />
    <line x1="11" y1="19" x2="22" y2="19" stroke="#8CA88E" strokeWidth="1" />
    <line x1="11" y1="22" x2="18" y2="22" stroke="#8CA88E" strokeWidth="1" />

    {/* Pen / Pencil overlay */}
    <g transform="rotate(35 24 20)">
      <rect x="22" y="10" width="3.5" height="16" rx="1" fill="#E8B020" stroke="#754E05" strokeWidth="0.5" />
      <polygon points="22,26 25.5,26 23.75,29.5" fill="#F0DC9B" stroke="#754E05" strokeWidth="0.5" />
      <polygon points="23,28.5 24.5,28.5 23.75,29.8" fill="#1C1C1C" />
      <rect x="22" y="10" width="3.5" height="3" fill="#D0D0D0" />
    </g>
  </svg>
);

export const PenjualanIcon: React.FC = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Two salesman/colleagues silhouettes with blue hair & suits */}
    {/* Person 2 (Behind on right) */}
    <g opacity="0.95">
      {/* Hair */}
      <circle cx="21" cy="9" r="5" fill="#1E5B94" />
      {/* Face */}
      <circle cx="21" cy="11" r="4.2" fill="#FFDFC4" />
      {/* Blue Suit / Shirt */}
      <path d="M 16 19 C 16 16, 26 16, 26 19 L 27 28 L 15 28 Z" fill="#1E5B94" />
      {/* White collar */}
      <polygon points="21,17 19,21 23,21" fill="#FFFFFF" />
      {/* Red tie */}
      <polygon points="20.5,20 21.5,20 22,26 21,27 20,26" fill="#C72525" />
    </g>

    {/* Person 1 (Foreground on left) */}
    <g>
      {/* Hair */}
      <path d="M 8 9 C 8 5, 16 5, 16 9 C 16 10, 15 11, 14 12 L 10 12 Z" fill="#14426E" />
      {/* Face */}
      <circle cx="12" cy="11.5" r="4.2" fill="#FFE3CC" />
      {/* Ear */}
      <circle cx="7.8" cy="12" r="1" fill="#FFD0B0" />
      {/* Eye & mouth accents */}
      <circle cx="10" cy="11" r="0.6" fill="#222" />
      <circle cx="13.5" cy="11" r="0.6" fill="#222" />
      {/* Blue Corporate Suit */}
      <path d="M 6 20 C 6 16.5, 18 16.5, 18 20 L 19 30 L 5 30 Z" fill="#184D80" />
      {/* White collar */}
      <polygon points="12,17.5 9.5,22 14.5,22" fill="#FFFFFF" />
      {/* Yellow/Gold tie */}
      <polygon points="11.5,21 12.5,21 13,27 12,28 11,27" fill="#E2A619" />
    </g>
  </svg>
);

export const StockIcon: React.FC = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Invoices / Reports stack & inventory goods */}
    {/* Back paper sheet */}
    <rect x="7" y="4" width="16" height="20" rx="1" fill="#EAEAEA" stroke="#999" strokeWidth="0.6" />
    <line x1="9" y1="7" x2="19" y2="7" stroke="#BBB" strokeWidth="1" />
    <line x1="9" y1="10" x2="18" y2="10" stroke="#BBB" strokeWidth="1" />

    {/* Middle paper sheet */}
    <rect x="10" y="6" width="16" height="20" rx="1" fill="#F6F6F6" stroke="#888" strokeWidth="0.6" />
    <line x1="12" y1="9" x2="22" y2="9" stroke="#999" strokeWidth="1" />
    <line x1="12" y1="12" x2="20" y2="12" stroke="#999" strokeWidth="1" />

    {/* Front inventory form / box */}
    <g transform="translate(1, 4)">
      <rect x="5" y="8" width="19" height="18" rx="1" fill="#FFFFFF" stroke="#444" strokeWidth="0.8" />
      {/* Header bar */}
      <rect x="5" y="8" width="19" height="4" fill="#E02B2B" />
      <text x="7" y="11" fontSize="3" fontWeight="bold" fill="white">INV</text>

      {/* Grid lines of receipt */}
      <line x1="7" y1="15" x2="22" y2="15" stroke="#444" strokeWidth="0.8" />
      <line x1="7" y1="18" x2="22" y2="18" stroke="#888" strokeWidth="0.6" />
      <line x1="7" y1="21" x2="22" y2="21" stroke="#888" strokeWidth="0.6" />
      <line x1="13" y1="12" x2="13" y2="24" stroke="#888" strokeWidth="0.6" />

      {/* Red check/tag icon badge */}
      <circle cx="21" cy="22" r="4.5" fill="#E02B2B" stroke="#9E1414" strokeWidth="0.6" />
      <path d="M 19 22 L 20.5 23.5 L 23 20" stroke="white" strokeWidth="1.2" fill="none" />
    </g>
  </svg>
);

export const KeuanganIcon: React.FC = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Computer terminal with financial green charts & money flow */}
    {/* Monitor Case (Retro beige CRT) */}
    <rect x="5" y="4" width="22" height="18" rx="2" fill="#E2DFD2" stroke="#8E8B7E" strokeWidth="0.8" />
    {/* Screen bezel */}
    <rect x="7" y="6" width="18" height="13" rx="1" fill="#152818" stroke="#444" strokeWidth="0.5" />

    {/* Financial Green Chart on Screen */}
    <path
      d="M 8 16 L 11 14 L 14 15 L 18 10 L 21 12 L 24 8"
      stroke="#36D44A"
      strokeWidth="1.5"
      fill="none"
    />
    <polygon points="8,17 8,16 11,14 14,15 18,10 21,12 24,8 24,17" fill="#36D44A" opacity="0.25" />

    {/* Monitor Stand */}
    <polygon points="13,22 19,22 21,26 11,26" fill="#CFCBB8" stroke="#8E8B7E" strokeWidth="0.6" />
    <rect x="9" y="26" width="14" height="2" rx="0.5" fill="#E2DFD2" stroke="#8E8B7E" strokeWidth="0.6" />

    {/* Cash / Currency network symbol on bottom right */}
    <g transform="translate(18, 17)">
      <circle cx="7" cy="7" r="6" fill="#1C8C38" stroke="#0F5A22" strokeWidth="0.8" />
      <text x="4.5" y="9.5" fontSize="8" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">$</text>
    </g>
  </svg>
);

export const ExitIcon: React.FC = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Green exit door with person exiting / arrow */}
    {/* Door Frame */}
    <rect x="13" y="4" width="16" height="24" rx="1" fill="#1B8779" stroke="#0E584E" strokeWidth="1" />
    {/* Open door panel in 3D perspective */}
    <polygon points="14,5 23,2 23,28 14,27" fill="#2EAB99" stroke="#0E584E" strokeWidth="0.8" />
    {/* Door handle */}
    <circle cx="21" cy="15" r="1.2" fill="#FFD54F" stroke="#B28900" strokeWidth="0.4" />

    {/* Dark door interior */}
    <polygon points="23,3 27,4 27,27 23,28" fill="#0B3E36" />

    {/* Cyan / Green Arrow pointing out */}
    <g transform="translate(2, 6)">
      <path
        d="M 3 13 L 11 13 L 11 10 L 16 14.5 L 11 19 L 11 16 L 3 16 Z"
        fill="#00E676"
        stroke="#009624"
        strokeWidth="0.8"
      />
    </g>
  </svg>
);
