import type { TextStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';

// DESIGN.md §4. Dark only. The second block is mock values DESIGN.md has no
// token for yet (flagged there per its precedence rule: the mock wins).
export const colors = {
  mark: '#FF5404', markSeam: '#3E403D',
  bg: '#0B0B0D', surface1: '#151518', surface2: '#1D1D21', surface3: '#2A2A30',
  line: '#18181B', lineStrong: '#26262B',
  text: '#F5F5F5', text2: '#C6C6CC', text3: '#92929A', text4: '#6E6E76', disabled: '#5E5E66',
  accent: '#FF5A1F', onAccent: '#0B0B0D', accentTint: 'rgba(255,90,31,0.16)', accentInk: '#FF7A45',
  loss: '#F0525F', lossTint: 'rgba(240,68,82,0.14)', lossInk: '#F26B76',
  tie: '#3B9EFF', tieTint: 'rgba(59,158,255,0.16)', tieInk: '#6BB6FF', noResult: '#4A4A52',
  error: '#FF7A4D',
  gold: '#C9A35A', silver: '#A9AFB7', bronze: '#A8714A', platinum: '#C3CAD6',

  cardLine: '#222227', navRing: '#24242A', navIdle: '#85858D', ring: '#3A3A42',
  scrim: 'rgba(0,0,0,0.62)', coverIn: '#232328', coverOut: '#141416', glowOut: '#121214',
  skeleton: '#17171A', skeletonHi: '#232328', bgClear: 'rgba(11,11,13,0)', shadow: '#000000', flipTop: '#222227', onAccentTrack: 'rgba(11,11,13,0.25)', bracketLine: '#34343B',
};

/** DESIGN §5.12 metal ramps; enamel is the coin face, light → deep. */
export const metals = {
  bronze: { hi: '#FFE3CC', light: '#E2A77D', base: '#A8714A', dark: '#6E4428', deep: '#3A2213', enamel: ['#2A1A10', '#0E0805'] },
  silver: { hi: '#FFFFFF', light: '#E3E7EC', base: '#A9AFB7', dark: '#676D76', deep: '#33373D', enamel: ['#1F242B', '#0A0C0F'] },
  gold: { hi: '#FFF5D6', light: '#F0D592', base: '#C9A35A', dark: '#8C6A2F', deep: '#4D3A17', enamel: ['#2C2213', '#0F0B06'] },
  platinum: { hi: '#FFFFFF', light: '#EEF2F8', base: '#C3CAD6', dark: '#7C8695', deep: '#3A414C', enamel: ['#18202C', '#06080C'] },
  locked: { hi: '#6A6A72', light: '#55555D', base: '#3A3A42', dark: '#2A2A30', deep: '#18181B', enamel: ['#17171A', '#0E0E10'] },
} as const;
export type Metal = keyof typeof metals;

export const space = { gutter: 20, sectionGap: 44, headerToContent: 18, cardInner: 16, rowY: 14 };
export const radius = { pill: 999, datePill: 9, input: 14, button: 16, card: 20, cardLg: 24, sheet: 30, nav: 24 };

// Static instances of Archivo (assets/fonts). React Native can't drive the
// variable font's wdth axis, so the 62% condensed cut is its own file. There
// is no static 650, so the mock's 650 renders as 600.
export const font = {
  regular: 'Archivo-400',
  medium: 'Archivo-500',
  semibold: 'Archivo-600',
  bold: 'Archivo-700',
  display: 'ArchivoXC-800',
  mono: 'JetBrainsMono_600SemiBold',
};

/**
 * Condensed display type. Leading never goes under 0.9em even where the mock
 * says .78: with Archivo's metrics (ascent 878, cap 686, descent 210 per 1000)
 * Android clips cap tops below that.
 */
export function display(size: number): TextStyle {
  return {
    fontFamily: font.display,
    fontSize: size,
    lineHeight: Math.round(size * 0.9),
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
    color: colors.text,
  };
}

// Kria Motion.dc.html → Tokens. 150–250ms default; loops only for loaders.
export const motion = { fast: 100, base: 160, flipHalf: 170, enter: 220, tab: 280, slow: 320, fill: 520, launch: 620 };
export const ease = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  enter: Easing.bezier(0.05, 0.7, 0.1, 1),
  exit: Easing.bezier(0.3, 0, 0.8, 0.15),
  tab: Easing.bezier(0.2, 0.9, 0.3, 1),
};
