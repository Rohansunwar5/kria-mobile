import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

const base = (size, color) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'square', strokeLinejoin: 'miter' });

export const IconShuttlecock = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M9.5 3h5l1 4h-7z" /><Path d="M7.5 7 4 19l8 2 8-2L16.5 7z" /><Path d="M10 7 8.4 19M14 7l1.6 12M12 7v14" /></Svg>
);

export const IconRacket = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M12 3l6 5-6 5-6-5z" /><Path d="M9 5.5h6M8.6 8.2h6.8M12 3v10" /><Path d="M12 13v8M10 21h4" /></Svg>
);

export const IconCourt = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 4h18v16H3z" /><Path d="M3 12h18M7 4v16M17 4v16M3 8h18M3 16h18" /></Svg>
);

export const IconCricketBat = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M10 2.5h4v4h-4z" /><Path d="M8.5 6.5h7l-.5 10-3 5-3-5z" /><Path d="M12 8v12" /></Svg>
);

export const IconStumps = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M7 8v13M12 8v13M17 8v13" /><Path d="M5.8 6.6h6.4M11.8 6.6h6.4" /></Svg>
);

export const IconBall = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Circle cx="12" cy="12" r="9" /><Path d="M8.6 3.8c2.4 5 2.4 11.4 0 16.4" /><Path d="M7 8h3M6.6 12h3M7 16h3" /></Svg>
);

export const IconBracket = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 6h4M3 11h4M7 6v5M7 8.5h5M3 15h4M3 20h4M7 15v5M7 17.5h5M12 8.5v9M12 13h9" /></Svg>
);

export const IconTrophy = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M6 4h12v4l-6 7-6-7z" /><Path d="M6 5.5H3v3l3 2M18 5.5h3v3l-3 2" /><Path d="M12 15v4M8 20.5h8" /></Svg>
);

export const IconMedal = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M8 3l2 5.5M16 3l-2 5.5" /><Path d="M8 9h8v8H8z" /><Path d="M11 12h2v2h-2z" /></Svg>
);

export const IconScoreboard = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 4h18v13H3z" /><Path d="M12 4v13M6 9h3M15 9h3M6 12.5h3M15 12.5h3" /><Path d="M7 17v3.5M17 17v3.5" /></Svg>
);

export const IconWhistle = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M4 9h9l7-2.5v11L13 15H4z" /><Path d="M6.5 11h2.5v2.5H6.5z" /></Svg>
);

export const IconStopwatch = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M10 2h4v3h-4z" /><Path d="M4 13.5l8-8 8 8-8 7.5z" /><Path d="M12 13.5V9" /></Svg>
);

export const IconTarget = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M4 4h16v16H4z" /><Path d="M8.5 8.5h7v7h-7z" /><Path d="M11.3 11.3h1.4v1.4h-1.4z" /></Svg>
);

export const IconStar = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z" /></Svg>
);

export const IconGavel = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M12.5 2.5l9 9-3 3-9-9z" /><Path d="M10.5 8.5 3 16l2.5 2.5L13 11" /><Path d="M13 21h8" /></Svg>
);

export const IconPaddle = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M7.5 3h9v10h-9z" /><Path d="M10.5 6h3v4h-3z" /><Path d="M12 13v8M9.5 21h5" /></Svg>
);

export const IconCash = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 7h18v10H3z" /><Path d="M10 10h4v4h-4z" /><Path d="M6 10v4M18 10v4" /></Svg>
);

export const IconCard = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 6h18v12H3z" /><Path d="M3 10h18M6 14h4" /></Svg>
);

export const IconWallet = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 6h18v14H3z" /><Path d="M3 11h18" /><Path d="M15 13.5h4v4h-4z" /></Svg>
);

export const IconReceipt = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M5 3h14v15.5H5z" /><Path d="M5 18.5l2.3 2.3 2.3-2.3 2.4 2.3 2.3-2.3 2.4 2.3L19 18.5" /><Path d="M8 8h8M8 12h8" /></Svg>
);

export const IconLock = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M6 11h12v10H6z" /><Path d="M9 11V8l3-3 3 3v3" /></Svg>
);

export const IconHourglass = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M6 3h12v3.5L12 12l6 5.5V21H6v-3.5L12 12 6 6.5z" /></Svg>
);

export const IconHome = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3.5 11.5 12 4l8.5 7.5V20.5h-17z" /><Path d="M9.5 20.5v-6h5v6" /></Svg>
);

export const IconSearch = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M4 4h11v11H4z" /><Path d="M15 15l5 5" /></Svg>
);

export const IconBell = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M5 18l2.5-3.5V10L12 5.5 16.5 10v4.5L19 18z" /><Path d="M10 18v1.8h4V18" /></Svg>
);

export const IconUser = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M8 3.5h8v7H8z" /><Path d="M4 20.5v-3l4-2h8l4 2v3" /></Svg>
);

export const IconUsers = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M6 5h6v5H6z" /><Path d="M2 20v-2.5l4-2h6l4 2V20" /><Path d="M15 4h5v4h-5z" /><Path d="M22 14.5 19.5 13" /></Svg>
);

export const IconGear = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M6.5 6.5h11v11h-11z" /><Path d="M10 10h4v4h-4z" /><Path d="M12 2v4.5M12 17.5V22M2 12h4.5M17.5 12H22" /></Svg>
);

export const IconMenu = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 6h18M3 12h18M3 18h18" /></Svg>
);

export const IconClose = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M5 5l14 14M19 5L5 19" /></Svg>
);

export const IconChevronLeft = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M15 4 7 12l8 8" /></Svg>
);

export const IconChevronRight = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M9 4l8 8-8 8" /></Svg>
);

export const IconChevronDown = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M4 9l8 8 8-8" /></Svg>
);

export const IconArrowRight = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 12h16M13 6l6 6-6 6" /></Svg>
);

export const IconFilter = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 5h18l-7 8v7l-4-2.5V13z" /></Svg>
);

export const IconSort = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 6h9M3 12h6M3 18h3" /><Path d="M17 5v14M13.5 15.5 17 19l3.5-3.5" /></Svg>
);

export const IconLive = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M9 9h6v6H9z" fill={color} stroke={"none"} /><Path d="M6.5 6 3.5 12l3 6M17.5 6l3 6-3 6" /></Svg>
);

export const IconAlert = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M12 3l10 18H2z" /><Path d="M12 9.5v5M11 16.6h2v2h-2z" /></Svg>
);

export const IconError = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" /><Path d="M9 9l6 6M15 9l-6 6" /></Svg>
);

export const IconInfo = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M4 4h16v16H4z" /><Path d="M12 10.5v7M11 6.5h2v2h-2z" /></Svg>
);

export const IconRetry = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M6 6h12v12H8.5" /><Path d="M11 15l-3 3 3 3" /></Svg>
);

export const IconSignalOff = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M4 20v-4M9 20v-6.5M14 20V9M19 20V4" /><Path d="M3 3l18 18" /></Svg>
);

export const IconCheck = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M4 12.5 9.5 18 20 6" /></Svg>
);

export const IconClock = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Circle cx="12" cy="12" r="9" /><Path d="M12 6.5v6l4 2.5" /></Svg>
);

export const IconCalendar = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M4 6h16v14H4z" /><Path d="M4 10.5h16M8 3v4M16 3v4" /><Path d="M8 13.5h2.5V16H8z" /></Svg>
);

export const IconMapPin = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M12 21 5 11 12 3l7 8z" /><Path d="M10.5 9.5h3v3h-3z" /></Svg>
);

export const IconShare = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M16 3h5v5h-5z" /><Path d="M3 9.5h5v5H3z" /><Path d="M16 16h5v5h-5z" /><Path d="M8 11l8-4.5M8 13l8 4.5" /></Svg>
);

export const IconEdit = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M4 20h4L20 8l-4-4L4 16z" /><Path d="M14 6l4 4" /></Svg>
);

export const IconTrash = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M4 6h16M9 6V3.5h6V6" /><Path d="M6 6l1 15h10l1-15" /><Path d="M10 10v7M14 10v7" /></Svg>
);

export const IconCamera = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 7h4l2-2h6l2 2h4v13H3z" /><Path d="M9 11h6v6H9z" /></Svg>
);

export const IconImage = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 5h18v14H3z" /><Path d="M3 15.5l5-5 4 4 3-3 6 6" /><Path d="M15.5 8h2.5v2.5h-2.5z" /></Svg>
);

export const IconChat = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 4h18v12H8l-5 4z" /><Path d="M7 8h10M7 12h6" /></Svg>
);

export const IconDownload = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M12 4v11M7 10.5l5 5 5-5" /><Path d="M4 20h16" /></Svg>
);

export const IconPlus = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M12 4v16M4 12h16" /></Svg>
);

export const IconMore = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3.5 10.5h3v3h-3zM10.5 10.5h3v3h-3zM17.5 10.5h3v3h-3z" /></Svg>
);

export const IconGrid = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" /></Svg>
);

export const IconList = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M3 6h3.5v3.5H3zM3 14.5h3.5V18H3z" /><Path d="M10 7.5h11M10 16h11" /></Svg>
);

export const IconEye = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M2 12l5-5h10l5 5-5 5H7z" /><Path d="M10 10h4v4h-4z" /></Svg>
);

export const IconFlag = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M6 3v18" /><Path d="M6 4h12l-2.5 4L18 12H6z" /></Svg>
);

export const IconBookmark = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M6 3h12v18l-6-5-6 5z" /></Svg>
);

export const IconShield = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M12 3l8 3v7l-8 8-8-8V6z" /><Path d="M9 12l2.5 2.5L16 10" /></Svg>
);

export const IconExternal = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M14 4h6v6M20 4l-8 8" /><Path d="M18 13v7H4V6h7" /></Svg>
);

export const IconHomeF = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M12 3.5 21 11.5V20.5h-6.5v-6h-5v6H3V11.5z" fill={color} stroke={"none"} /></Svg>
);

export const IconBellF = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M5 18l2.5-3.5V10L12 5.5 16.5 10v4.5L19 18zM10 19h4v1.8h-4z" fill={color} stroke={"none"} /></Svg>
);

export const IconUserF = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M8 3.5h8v7H8zM4 20.5v-3l4-2h8l4 2v3z" fill={color} stroke={"none"} /></Svg>
);

export const IconTrophyF = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M6 4h12v4l-6 7-6-7zM11 15h2v4.5h-2zM8 19.5h8V21H8z" fill={color} stroke={"none"} /><Path d="M6 5.5H3v3l3 2M18 5.5h3v3l-3 2" /></Svg>
);

export const IconStarF = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z" fill={color} stroke={"none"} /></Svg>
);

export const IconBookmarkF = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M6 3h12v18l-6-5-6 5z" fill={color} stroke={"none"} /></Svg>
);

export const IconMapPinF = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path fillRule="evenodd" d="M12 21 5 11 12 3l7 8zM10.5 9.5h3v3h-3z" fill={color} stroke={"none"} /></Svg>
);

export const IconShieldF = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M12 3l8 3v7l-8 8-8-8V6z" fill={color} stroke={"none"} /></Svg>
);

export const IconLockF = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M6 11h12v10H6z" fill={color} stroke={"none"} /><Path d="M9 11V8l3-3 3 3v3" /></Svg>
);

export const IconFlagF = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M5 3h1.6v18H5zM6.6 4h11.4l-2.5 4 2.5 4H6.6z" fill={color} stroke={"none"} /></Svg>
);

export const IconLiveF = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg {...base(size, color)}><Path d="M8 8h8v8H8z" fill={color} stroke={"none"} /><Path d="M5.5 4.5 2 12l3.5 7.5M18.5 4.5 22 12l-3.5 7.5" /></Svg>
);

