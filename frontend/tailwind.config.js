/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // =====================================================
      // BRAND TOKENS
      // Centralised palette, type and radius scale so the
      // POS keeps one consistent professional identity.
      // =====================================================

      colors: {
        brand: {
          50: '#eef4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a4bcfc',
          400: '#8098f9',
          500: '#6172f3',
          600: '#4a3fe0',
          700: '#3d35c9',
          800: '#332fa3',
          900: '#2f2f83',
        },
      },

      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },

      borderRadius: {
        xs: '0.375rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
}
