// JS-side mirror of tailwind.config.js, for inline styles and native props.
export const colors = {
  ink: '#0B0B0B',
  panel: '#151515',
  panel2: '#1E1E1E',
  brand: '#F97316',
  auction: '#FA4C93',
  open: '#16C46A',
  fail: '#FF4438',
  line: 'rgba(255,255,255,0.14)',
  white: '#FFFFFF',
};

export const fonts = {
  display: 'Anton_400Regular',
  body: 'Barlow_400Regular',
  bodyMed: 'Barlow_500Medium',
  bodyBold: 'Barlow_700Bold',
  data: 'JetBrainsMono_400Regular',
  dataBold: 'JetBrainsMono_700Bold',
};

// Single import path for the token layer. The app is dark-only (DESIGN.md v1.1).
import { dark, type Palette } from './theme/palette';

export { dark, type Palette };
export function useTheme(): Palette {
  return dark;
}
