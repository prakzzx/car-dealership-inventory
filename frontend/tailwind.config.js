/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Petrol: the deep blue-green of a showroom floor. Signal: the orange of a window sticker.
        ink: '#14202b',
        petrol: { 50: '#eef6f8', 100: '#d5e8ee', 200: '#a9d0dc', 300: '#76b2c4', 400: '#4690a7', 500: '#2c748c', 600: '#235c71', 700: '#1e4b5c', 800: '#1b3f4d', 900: '#10303b' },
        signal: { 50: '#fff4ec', 100: '#ffe3cf', 400: '#f58a3f', 500: '#e8590c', 600: '#c94a06', 700: '#a33c07' },
        paper: '#f3f5f7',
      },
      fontFamily: {
        sans: ['"Segoe UI Variable Text"', '"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        display: ['"Segoe UI Variable Display"', '"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'Arial', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(16,48,59,.08), 0 4px 14px rgba(16,48,59,.06)' },
    },
  },
  plugins: [],
};
