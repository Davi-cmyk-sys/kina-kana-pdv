/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Verde/branco — identidade da marca Kina Kana (header, navegação, TV)
        marca: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Paleta quente para produtos/categorias (amarelo, laranja, vermelho)
        brasa: {
          amarelo: '#f59e0b',
          laranja: '#ea580c',
          vermelho: '#dc2626',
        },
      },
      fontFamily: {
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 10px 0 rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
};
