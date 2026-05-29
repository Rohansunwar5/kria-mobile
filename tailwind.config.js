/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: '#F97316',
        ink: '#111111',
      },
      fontFamily: {
        oswald: ['Oswald_500Medium'],
        montserrat: ['Montserrat_400Regular'],
      },
    },
  },
  plugins: [],
};
