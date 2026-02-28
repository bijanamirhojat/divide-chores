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
      },
      animation: {
        'slide-down': 'slide-down 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
