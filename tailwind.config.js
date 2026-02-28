export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          mint: '#B8E6D4',
          mintDark: '#7BC4A8',
          lavender: '#E2D4F0',
          lavenderDark: '#B89DD4',
          peach: '#FFDAB9',
          peachDark: '#F5B895',
          rose: '#F8C8D4',
          roseDark: '#E8A0B0',
          sky: '#C5E8F7',
          skyDark: '#8FCDE8',
          cream: '#FDF8F3',
          creamDark: '#F5EDE5',
          sage: '#C5D5C5',
          sageDark: '#9BB89B',
          lilac: '#D4C8E8',
          lilacDark: '#B5A2CC',
        },
        brand: {
          bijan: '#8BB8E8',
          esther: '#F5A8C0',
        },
        accent: {
          mint: '#7BC4A8',
          lavender: '#B89DD4',
          peach: '#F5B895',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 20px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 4px 30px rgba(0, 0, 0, 0.06)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'slide-down': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-up-out': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'slide-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-right-out': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0)' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-8px)' },
          '30%': { transform: 'translateX(8px)' },
          '45%': { transform: 'translateX(-4px)' },
          '60%': { transform: 'translateX(4px)' },
          '75%': { transform: 'translateX(-2px)' },
          '90%': { transform: 'translateX(2px)' },
        },
        'slide-content-left': {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-content-right': {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'slide-down': 'slide-down 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-up-out': 'slide-up-out 0.25s ease-in forwards',
        'slide-right': 'slide-right 0.3s ease-out',
        'slide-right-out': 'slide-right-out 0.25s ease-in forwards',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.25s ease-in forwards',
        'scale-in': 'scale-in 0.2s ease-out',
        'shake': 'shake 0.5s ease-out',
        'slide-content-left': 'slide-content-left 0.25s ease-out',
        'slide-content-right': 'slide-content-right 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
