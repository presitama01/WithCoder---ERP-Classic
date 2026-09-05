import React from 'react';

/**
 * High-fidelity vector recreation of the classic curved globe world map wallpaper
 * seen in the reference screenshot:
 * - Teal/cyan sky & ocean
 * - Curved orthographic longitude/latitude grid
 * - Sage/olive green continents (Africa, Europe, South America, North America, Antarctica)
 * - Warm earthy bottom horizon curvature
 */
export const GlobeBackground: React.FC = () => {
  return (
    <div id="globe-background-container" className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <svg
        id="globe-background-svg"
        viewBox="0 0 1000 680"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <defs>
          {/* Main sky / ocean gradient */}
          <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d1eaf1" />
            <stop offset="20%" stopColor="#b6dfe8" />
            <stop offset="60%" stopColor="#96cad6" />
            <stop offset="85%" stopColor="#81bccb" />
            <stop offset="100%" stopColor="#76b1bf" />
          </linearGradient>

          {/* Earthy horizon band gradient at the bottom */}
          <linearGradient id="horizonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8a804c" stopOpacity="0.4" />
            <stop offset="25%" stopColor="#a39965" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#b5aa77" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#9a915f" stopOpacity="0.5" />
          </linearGradient>

          {/* Horizon ring curve */}
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#746c3b" />
            <stop offset="50%" stopColor="#a1975e" />
            <stop offset="100%" stopColor="#746c3b" />
          </linearGradient>
        </defs>

        {/* 1. Base Ocean Layer */}
        <rect width="1000" height="680" fill="url(#oceanGrad)" />

        {/* 2. Atmosphere / Curvature Horizon Arc */}
        <ellipse
          cx="500"
          cy="750"
          rx="680"
          ry="320"
          fill="none"
          stroke="#4f919f"
          strokeWidth="1.5"
          opacity="0.6"
        />

        {/* Earthy horizon arch band */}
        <path
          d="M -100 560 Q 500 480 1100 560 L 1100 690 L -100 690 Z"
          fill="url(#horizonGrad)"
        />
        <path
          d="M -50 560 Q 500 482 1050 560"
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="3.5"
          opacity="0.8"
        />
        <path
          d="M -50 562 Q 500 484 1050 562"
          fill="none"
          stroke="#554e29"
          strokeWidth="1.2"
          opacity="0.5"
        />

        {/* 3. Curved Longitude / Meridian Grid Lines */}
        <g stroke="#5697a5" strokeWidth="1.2" fill="none" opacity="0.75">
          {/* Main vertical meridian (Prime meridian / Central axis) */}
          <path d="M 500 135 C 500 240, 500 450, 500 580" />

          {/* Left meridians (arching towards America / Atlantic) */}
          <path d="M 440 136 C 390 220, 360 410, 420 580" />
          <path d="M 380 138 C 290 220, 240 400, 340 580" />
          <path d="M 320 142 C 190 230, 130 400, 260 580" />
          <path d="M 260 148 C 100 240, 30 400, 180 580" />
          <path d="M 200 156 C 10 260, -60 410, 90 580" />
          <path d="M 140 168 C -70 290, -140 430, 10 580" />
          <path d="M 80 185 C -140 330, -180 470, -70 580" />

          {/* Right meridians (arching towards Indian Ocean / Asia) */}
          <path d="M 560 136 C 610 220, 640 410, 580 580" />
          <path d="M 620 138 C 710 220, 760 400, 660 580" />
          <path d="M 680 142 C 810 230, 870 400, 740 580" />
          <path d="M 740 148 C 900 240, 970 400, 820 580" />
          <path d="M 800 156 C 990 260, 1060 410, 910 580" />
          <path d="M 860 168 C 1070 290, 1140 430, 990 580" />
          <path d="M 920 185 C 1140 330, 1180 470, 1070 580" />
        </g>

        {/* 4. Curved Latitude / Parallel Grid Lines */}
        <g stroke="#5697a5" strokeWidth="1.2" fill="none" opacity="0.75">
          {/* Outer hemisphere boundary */}
          <ellipse cx="500" cy="460" rx="490" ry="325" />

          {/* Curved Parallels */}
          <path d="M 310 142 Q 500 130 690 142" />
          <path d="M 210 178 Q 500 160 790 178" />
          <path d="M 130 222 Q 500 198 870 222" />
          <path d="M 70 274 Q 500 242 930 274" />
          <path d="M 30 336 Q 500 295 970 336" />
          <path d="M 8 406 Q 500 355 992 406" />
          <path d="M 2 485 Q 500 425 998 485" />
          <path d="M 18 565 Q 500 500 982 565" />
          <path d="M 60 645 Q 500 575 940 645" />
        </g>

        {/* 5. Continents (Sage/Olive green) */}
        {/* Colors matching the reference screenshot: Soft muted olive/sage #9dc39a */}
        <g fill="#9dc39a" stroke="#89b086" strokeWidth="1">
          {/* North America (visible top left) */}
          <path d="M 0 160 Q 60 140 120 150 Q 150 170 170 200 Q 180 230 150 250 Q 130 270 145 290 Q 140 310 110 320 Q 90 325 80 340 Q 60 360 40 350 L 0 350 Z" />

          {/* Central America & Caribbean Bridge */}
          <path d="M 80 340 Q 110 345 130 370 Q 145 390 170 410 Q 165 420 150 415 Q 130 395 100 375 Q 85 365 75 350 Z" />
          {/* Caribbean islands */}
          <ellipse cx="185" cy="380" rx="14" ry="5" />
          <ellipse cx="205" cy="390" rx="8" ry="4" />

          {/* South America (center-left) */}
          <path d="M 160 410 C 180 400, 240 380, 280 400 C 310 415, 335 445, 335 480 C 335 520, 310 560, 280 600 C 265 620, 240 660, 225 680 C 215 670, 205 650, 205 620 C 205 580, 190 550, 180 520 C 170 490, 150 450, 160 410 Z" />

          {/* Europe & Mediterranean (top center-right) */}
          {/* British Isles */}
          <path d="M 585 288 C 580 295, 582 305, 592 312 C 598 305, 600 295, 595 288 Z" />
          <ellipse cx="575" cy="300" rx="5" ry="9" />

          {/* Western & Central Europe */}
          <path d="M 610 240 C 650 230, 710 230, 760 235 C 800 240, 850 245, 900 250 C 930 255, 980 260, 1000 270 L 1000 370 C 960 360, 920 355, 870 355 C 840 355, 820 365, 800 360 C 780 355, 765 340, 750 345 C 730 350, 720 370, 700 370 C 680 370, 675 350, 660 340 C 640 330, 615 320, 610 300 C 605 280, 605 260, 610 240 Z" />

          {/* Scandinavia */}
          <path d="M 670 195 C 690 190, 720 200, 715 225 C 700 235, 680 235, 670 215 Z" />

          {/* Africa (center-right, prominent) */}
          <path d="M 590 355 C 610 345, 660 340, 690 350 C 725 360, 750 380, 765 410 C 775 430, 770 460, 750 480 C 740 490, 735 520, 730 550 C 725 580, 715 620, 685 650 C 660 675, 640 680, 625 680 C 615 670, 605 640, 600 610 C 595 580, 580 560, 560 540 C 540 520, 530 490, 530 460 C 530 430, 550 410, 565 390 C 575 375, 580 365, 590 355 Z" />

          {/* Madagascar */}
          <path d="M 780 565 C 790 555, 796 570, 790 590 C 785 605, 778 600, 780 565 Z" />

          {/* Asia / Middle East partial edge */}
          <path d="M 800 365 C 830 360, 870 365, 910 380 C 950 400, 990 410, 1000 415 L 1000 480 C 980 470, 940 455, 910 440 C 880 425, 840 410, 810 400 Z" />

          {/* Antarctica (bottom center arc landmass) */}
          <path d="M 230 680 C 270 655, 330 645, 410 650 C 470 655, 530 660, 600 655 C 660 650, 740 640, 820 655 C 890 670, 930 678, 960 680 L 1000 680 L 1000 750 L 0 750 L 0 680 Z" />
          {/* Antarctica foreground cap matching screenshot */}
          <path
            d="M 180 660 C 260 635, 380 635, 500 640 C 620 645, 750 630, 850 645 C 900 655, 940 665, 970 675 L 970 700 L 160 700 Z"
            fill="#a6cba3"
            opacity="0.95"
          />
        </g>
      </svg>
    </div>
  );
};
