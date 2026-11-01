/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#F8F5EC',
          100: '#EFE8D5',
          200: '#E5DCC3', // rgb(229, 220, 195)
          300: '#C7BEA2', // rgb(199, 190, 162)
          400: '#AAA492', // rgb(170, 164, 146)
          500: '#9A9483', // rgb(154, 148, 131)
          600: '#787263',
          700: '#585347',
          800: '#3B372F',
          900: '#26231D',
          950: '#181612',
        },
        slate: {
          50: '#F5EFE0',
          100: '#E5DCC3', // rgb(229, 220, 195)
          200: '#C7BEA2', // rgb(199, 190, 162)
          300: '#AAA492', // rgb(170, 164, 146)
          400: '#9A9483', // rgb(154, 148, 131)
          500: '#6E6859',
          600: '#544F43',
          700: '#3D3930',
          800: '#2C2922',
          900: '#1F1D18',
          950: '#14120F',
        },
      },
      fontFamily: {
        sans: ["'Mukta'", "'Segoe UI'", 'system-ui', '-apple-system', 'sans-serif'],
        marathi: ["'Tiro Devanagari Marathi'", 'serif'],
        ams: ["'Tiro Devanagari Marathi'", 'serif'],
        shikha: ["'Tiro Devanagari Marathi'", 'serif'],
        calligraphy: ["'Tiro Devanagari Marathi'", 'serif'],
        english: ["'Mukta'", "'Segoe UI'", 'system-ui', '-apple-system', 'sans-serif'],
        mukta: ["'Mukta'", "'Segoe UI'", 'system-ui', 'sans-serif'],
      },
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
        90: '90',
        100: '100',
      },
    },
  },
  plugins: [],
}
