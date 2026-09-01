/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NIPA Cloud brand: signature magenta (#E6117F) accent
        brand: {
          50: '#fdebf4',
          100: '#fbd0e6',
          200: '#f7a8cf',
          300: '#f272ad',
          400: '#ea3f8c',
          500: '#e6117f',
          600: '#c60a6b',
          700: '#a30a59',
          800: '#7c0b45',
          900: '#560a31',
          950: '#35061e',
        },
        // NIPA Cloud deep indigo/navy (#232152) — hero, structure, dark text
        navy: {
          DEFAULT: '#232152',
          50: '#eeeef5',
          100: '#d7d6e8',
          200: '#b0aecf',
          300: '#807daf',
          400: '#55527f',
          500: '#383560',
          600: '#2a2856',
          700: '#232152',
          800: '#1a1940',
          900: '#13122e',
          950: '#0b0a1c',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Prompt', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'card': '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 8px 24px -12px rgb(35 33 82 / 0.14)',
        'card-hover': '0 4px 12px -2px rgb(15 23 42 / 0.10), 0 20px 40px -16px rgb(230 17 127 / 0.20)',
        'glow': '0 0 0 1px rgb(230 17 127 / 0.18), 0 8px 30px -8px rgb(230 17 127 / 0.40)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #e6117f 0%, #ec2f92 55%, #f36fae 100%)',
        'navy-gradient': 'linear-gradient(135deg, #13122e 0%, #232152 55%, #2a2856 100%)',
        'mesh': 'radial-gradient(at 0% 0%, rgb(251 208 230 / 0.4) 0px, transparent 50%), radial-gradient(at 98% 2%, rgb(204 251 241 / 0.35) 0px, transparent 45%), radial-gradient(at 50% 100%, rgb(215 214 232 / 0.4) 0px, transparent 50%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-down': 'fade-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop': 'pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
}
