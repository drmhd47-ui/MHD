/** @type {import('tailwindcss').Config} */
// ألوان الهوية الرسمية لمجموعة إم فقط: الكحلي والكحلي العميق والذهبي، مع تظليل رمادي خفيف مشتق من الكحلي.
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F1F3F6',
          100: '#E3E8EE',
          500: '#A9812F',
          600: '#0F2A46',
          700: '#0A1B2E'
        },
        gold: '#A9812F',
        cream: '#FDFBF6'
      },
      fontFamily: {
        sans: ['"Noto Naskh Arabic"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
