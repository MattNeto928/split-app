/**
 * Split design tokens — "Receipt" direction (light-only).
 *
 * One source of truth for color, spacing, radius, elevation, and type.
 * The look: warm paper canvas, ink text, a single stamped terracotta accent,
 * and monospace (Space Mono) figures for money — like a well-designed receipt.
 *
 * The app is light-only, so `dark` mirrors `light` as a safety net for any
 * code path that still reads the dark scheme. `useColorScheme` is also forced
 * to 'light'.
 */

const accent = '#BD4B2C';        // terracotta "stamp"
const accentPressed = '#A33E22';
const accentSubtle = '#F3E0D6';  // tint for selected/active fills
const onAccent = '#FBF6EC';      // text/icon on the accent

const ink = '#221D16';           // primary text
const inkSecondary = '#6E6354';  // secondary text
const inkMuted = '#9A8E7C';      // hints / placeholders

const paper = '#F4EDDF';         // page canvas
const card = '#FFFCF6';          // raised surface
const cardAlt = '#FBF4E8';       // subtle inset surface

const border = '#E7DCC8';        // hairline
const borderStrong = '#D8C9AE';  // emphasized divider

const success = '#3C6B47';
const successSubtle = '#E2EBDD';
const warning = '#9C7A2E';
const warningSubtle = '#F1E8D2';
const error = '#A82E22';
const errorSubtle = '#F3DBD5';

const light = {
  // text
  text: ink,
  secondaryText: inkSecondary,
  mutedText: inkMuted,
  // surfaces
  background: paper,
  surface: card,
  surfaceAlt: cardAlt,
  cardBackground: card, // legacy name kept for back-compat
  // accent
  tint: accent, // legacy name kept (useThemeColor(..,'tint'))
  accent,
  accentPressed,
  accentSubtle,
  onAccent,
  // lines
  border,
  borderStrong,
  separator: border, // legacy name kept
  // icons / tabs
  icon: inkSecondary,
  tabIconDefault: inkMuted,
  tabIconSelected: accent,
  // status
  success,
  successSubtle,
  warning,
  warningSubtle,
  error,
  errorSubtle,
  // overlay
  scrim: 'rgba(34,29,22,0.45)',
} as const;

export const Colors = {
  light,
  dark: light, // light-only app
};

/** 8-step categorical ramp for per-person avatars — earthy, de-conflicted
 *  from the accent and from success/error. fg = solid color, bg = soft tint. */
export const PersonColors: { fg: string; bg: string }[] = [
  { fg: '#B07A2B', bg: '#F1E7D1' }, // ochre
  { fg: '#4E7C59', bg: '#E0EBDF' }, // sage
  { fg: '#3E6B8B', bg: '#DCE7EE' }, // dusty blue
  { fg: '#8E5184', bg: '#EEE0EC' }, // plum
  { fg: '#3F7E73', bg: '#DCEAE7' }, // teal
  { fg: '#7C7A3F', bg: '#ECEAD6' }, // olive
  { fg: '#5E6090', bg: '#E3E3EF' }, // slate violet
  { fg: '#8A5A44', bg: '#EDE0D9' }, // clay brown
];

export function personColor(index: number) {
  return PersonColors[((index % PersonColors.length) + PersonColors.length) % PersonColors.length];
}

/** Spacing scale (4-based). */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

/** Corner radius scale. */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Elevation scale — warm, subtle shadows (pairs with hairline borders). */
export const Elevation = {
  e0: {},
  e1: {
    shadowColor: '#2B2015',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  e2: {
    shadowColor: '#2B2015',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  e3: {
    shadowColor: '#2B2015',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
} as const;

/** Font families registered in app/_layout.tsx. */
export const Fonts = {
  regular: 'OutfitRegular',
  medium: 'OutfitMedium',
  semibold: 'OutfitSemiBold',
  bold: 'OutfitBold',
  extrabold: 'OutfitExtraBold',
  mono: 'SpaceMono', // tabular figures for money
} as const;

/** Type scale (~1.2 modular). Consumed by ThemedText. */
export const Type = {
  display: { fontFamily: Fonts.extrabold, fontSize: 44, lineHeight: 48, letterSpacing: -0.6 },
  h1: { fontFamily: Fonts.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.4 },
  h2: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  subtitle: { fontFamily: Fonts.semibold, fontSize: 20, lineHeight: 27, letterSpacing: -0.2 },
  h3: { fontFamily: Fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  bodyLg: { fontFamily: Fonts.regular, fontSize: 18, lineHeight: 27 },
  body: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24 },
  bodySemibold: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: Fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 1.6, textTransform: 'uppercase' as const },
  // money — Space Mono, tabular by nature
  money: { fontFamily: Fonts.mono, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  moneyLg: { fontFamily: Fonts.mono, fontSize: 44, lineHeight: 48, letterSpacing: -1 },
  moneySm: { fontFamily: Fonts.mono, fontSize: 15, lineHeight: 20 },
} as const;

/** Convenience bundle. */
export const theme = { colors: light, Spacing, Radius, Elevation, Type, Fonts, PersonColors };
