/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './entrypoints/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#53a8ff',
        'bg-gray': '#eee',
        'text-gray': '#444',
        'border-gray': '#ccc',
      },
      fontSize: {
        'header-lg': '24px',
        'header-md': '22px',
        'title-lg': '18px',
        'title-md': '14px',
        'title-sm': '12px',
      },
      spacing: {
        'popup-width': '400px',
        'sidebar-width': '300px',
      },
    },
  },
  plugins: [],
};

