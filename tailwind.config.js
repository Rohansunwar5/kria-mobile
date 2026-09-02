/** @type {import('tailwindcss').Config} */
// Values come straight from docs/design-canvas/_head.html + body-Components.html.
// Do not round them.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#0B0B0B',
        panel: '#151515',
        panel2: '#1E1E1E',
        // Three accents at oklch(0.70 0.19 h) — h46 / h350 / h145, so they
        // hold equal weight next to each other. Derive a fourth the same way.
        brand: '#F97316',
        auction: '#FA4C93',
        open: '#16C46A',
        fail: '#FF4438',
        line: 'rgba(255,255,255,0.14)',
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.14)',
      },
      borderRadius: {
        tag: '3px',
        ctl: '5px',
        blk: '6px',
      },
      fontFamily: {
        anton: ['Anton_400Regular'],
        grotesk: ['SpaceGrotesk_400Regular'],
        'grotesk-med': ['SpaceGrotesk_500Medium'],
        'grotesk-bold': ['SpaceGrotesk_700Bold'],
        mono: ['SpaceMono_400Regular'],
        'mono-bold': ['SpaceMono_700Bold'],
      },
    },
  },
  plugins: [],
};
