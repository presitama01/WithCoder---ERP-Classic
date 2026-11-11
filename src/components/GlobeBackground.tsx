import React from 'react';

/**
 * Vector recreation of the classic full-world oval projection wallpaper
 * seen in the reference main screen:
 * - Soft teal/cyan top fading smoothly into warm olive/khaki bottom
 * - Full oval world outline with curved latitude & meridian grid lines
 * - Sage green continents (Americas, Greenland, Europe, Africa, Asia, Australia, Antarctica)
 */
export const GlobeBackground: React.FC = () => {
  return (
    <div
      id="globe-background-container"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none border-t border-[#4B7A84]"
    >
      <svg
        id="globe-background-svg"
        viewBox="0 0 1200 660"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <defs>
          {/* Outer background gradient: pale teal top -> warm olive bottom */}
          <linearGradient id="bgSkyOliveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B8DCDE" />
            <stop offset="35%" stopColor="#A9CFD2" />
            <stop offset="68%" stopColor="#94AD96" />
            <stop offset="100%" stopColor="#858356" />
          </linearGradient>

          {/* Oval ocean gradient */}
          <linearGradient id="ovalOceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B4DADB" />
            <stop offset="30%" stopColor="#A2CBCD" />
            <stop offset="65%" stopColor="#8EAD9D" />
            <stop offset="100%" stopColor="#808357" />
          </linearGradient>

          <clipPath id="worldOvalClip">
            <path d="M 325 46 C 480 28, 720 28, 875 46 C 1070 115, 1188 220, 1188 330 C 1188 440, 1070 545, 875 614 C 720 632, 480 632, 325 614 C 130 545, 12 440, 12 330 C 12 220, 130 115, 325 46 Z" />
          </clipPath>
        </defs>

        {/* 1. Outer Backdrop */}
        <rect width="1200" height="660" fill="url(#bgSkyOliveGrad)" />

        {/* 2. Oval Globe Ocean & Grid */}
        <g clipPath="url(#worldOvalClip)">
          <rect x="0" y="0" width="1200" height="660" fill="url(#ovalOceanGrad)" />

          {/* Latitude lines */}
          <g stroke="#7EA4AE" strokeWidth="2" fill="none" opacity="0.85">
            <path d="M 160 110 Q 600 95 1040 110" />
            <path d="M 60 190 Q 600 175 1140 190" />
            <path d="M 10 272 Q 600 264 1190 272" />
            <path d="M 10 345 Q 600 345 1190 345" />
            <path d="M 20 420 Q 600 430 1180 420" />
            <path d="M 70 495 Q 600 512 1130 495" />
            <path d="M 170 568 Q 600 584 1030 568" />
          </g>

          {/* Meridian lines */}
          <g stroke="#7EA4AE" strokeWidth="2" fill="none" opacity="0.85">
            <line x1="600" y1="30" x2="600" y2="630" />
            <path d="M 520 32 C 470 210, 470 450, 520 628" />
            <path d="M 445 36 C 350 205, 350 455, 445 624" />
            <path d="M 375 43 C 230 200, 230 460, 375 617" />
            <path d="M 305 56 C 110 200, 110 460, 305 604" />

            <path d="M 680 32 C 730 210, 730 450, 680 628" />
            <path d="M 755 36 C 850 205, 850 455, 755 624" />
            <path d="M 825 43 C 970 200, 970 460, 825 617" />
            <path d="M 895 56 C 1090 200, 1090 460, 895 604" />
          </g>

          {/* Continents (Sage/Olive Green #A7CAA1) */}
          <g fill="#A7CAA1" stroke="#92B68C" strokeWidth="1.2" strokeLinejoin="round">
            {/* Greenland */}
            <path d="M 435 52 C 460 44, 520 42, 545 55 C 555 68, 535 90, 505 112 C 482 128, 468 122, 460 105 C 450 85, 425 65, 435 52 Z" />

            {/* North America & Central America */}
            <path d="M 118 118 C 165 100, 245 96, 308 106 C 345 112, 385 105, 412 115 C 430 125, 422 145, 395 162 C 378 174, 392 185, 372 205 C 350 225, 322 238, 300 256 C 280 274, 265 280, 268 302 C 270 318, 282 328, 305 344 C 318 352, 328 362, 322 368 C 312 372, 294 358, 275 344 C 254 328, 232 308, 222 288 C 214 270, 200 248, 178 232 C 155 215, 132 195, 118 175 C 98 152, 95 130, 118 118 Z" />

            {/* Caribbean islands */}
            <ellipse cx="322" cy="316" rx="16" ry="5" />
            <ellipse cx="348" cy="326" rx="9" ry="4" />

            {/* South America */}
            <path d="M 326 356 C 350 344, 390 352, 425 372 C 456 390, 474 414, 465 442 C 455 470, 424 495, 400 520 C 380 542, 365 568, 355 588 C 344 585, 336 565, 335 538 C 334 505, 332 474, 322 448 C 312 422, 305 375, 326 356 Z" />

            {/* UK & Ireland */}
            <path d="M 562 154 C 556 164, 560 176, 572 178 C 578 170, 576 158, 562 154 Z" />
            <ellipse cx="550" cy="168" rx="4" ry="7" />

            {/* Europe & Eurasia */}
            <path d="M 595 104 C 630 82, 685 78, 720 96 C 755 90, 825 82, 900 88 C 975 94, 1055 105, 1098 128 C 1118 140, 1098 164, 1068 182 C 1042 198, 1038 220, 1020 240 C 1002 260, 982 280, 962 296 C 942 312, 915 330, 898 352 C 885 368, 865 362, 855 340 C 845 318, 830 298, 814 304 C 798 310, 788 338, 774 342 C 760 346, 750 315, 738 296 C 722 272, 706 254, 686 248 C 668 242, 646 242, 632 232 C 618 222, 598 228, 582 232 C 566 236, 558 220, 566 205 C 578 188, 598 180, 610 164 C 620 150, 608 134, 595 122 Z" />

            {/* Japan & Maritime SE Asia */}
            <path d="M 1035 205 C 1048 214, 1050 236, 1034 252 C 1024 242, 1026 220, 1035 205 Z" />
            <path d="M 918 368 C 938 362, 962 372, 968 386 C 950 392, 926 385, 918 368 Z" />
            <path d="M 980 375 C 998 370, 1018 382, 1024 396 C 1005 400, 986 392, 980 375 Z" />

            {/* Africa */}
            <path d="M 555 245 C 585 234, 628 236, 658 248 C 684 258, 704 282, 725 312 C 742 336, 766 346, 765 368 C 764 388, 736 410, 726 436 C 718 458, 712 492, 692 522 C 674 548, 654 556, 638 548 C 624 536, 618 504, 612 474 C 606 444, 594 418, 568 398 C 542 378, 514 358, 510 326 C 506 294, 526 258, 555 245 Z" />

            {/* Madagascar */}
            <path d="M 744 468 C 756 462, 760 482, 750 505 C 742 515, 735 496, 744 468 Z" />

            {/* Australia & New Zealand */}
            <path d="M 952 440 C 986 426, 1032 428, 1062 452 C 1085 470, 1084 504, 1062 524 C 1038 544, 1002 536, 968 522 C 942 512, 928 482, 952 440 Z" />
            <path d="M 1102 520 C 1114 514, 1116 534, 1102 552 C 1094 544, 1095 528, 1102 520 Z" />

            {/* Antarctica */}
            <path d="M 245 612 C 320 582, 425 572, 540 578 C 640 584, 755 572, 875 588 C 930 595, 968 608, 980 618 L 920 635 L 280 635 Z" />
          </g>
        </g>

        {/* Oval Globe Outline */}
        <path
          d="M 325 46 C 480 28, 720 28, 875 46 C 1070 115, 1188 220, 1188 330 C 1188 440, 1070 545, 875 614 C 720 632, 480 632, 325 614 C 130 545, 12 440, 12 330 C 12 220, 130 115, 325 46 Z"
          fill="none"
          stroke="#7EA4AE"
          strokeWidth="2.5"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};
