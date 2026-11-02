/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ryda: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#0f9f8f',
          600: '#0b7f73',
          700: '#09665d',
          800: '#0a4f4a',
          950: '#062f2c'
        }
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.05), 0 8px 24px rgba(15, 23, 42, 0.06)'
      }
    }
  },
  plugins: []
};
