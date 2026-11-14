/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', '../../src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        volt: '#E8FF3A',
        'volt-dark': '#C8DF20',
        up: '#2EE59D',
        down: '#FF4D6D',
        surface: {
          0: '#0A0A0B',
          1: '#121214',
          2: '#1A1A1D',
          3: '#26262B',
        },
        text: {
          primary: '#ECE9E1',
          secondary: '#8C8C93',
        },
        twitch: {
          DEFAULT: '#9146FF',
          dark: '#772CE8',
          light: '#A970FF',
        },
        kick: {
          DEFAULT: '#53FC18',
          dark: '#3DB812',
          light: '#7BFF4A',
        },
      },
      fontFamily: {
        display: ['Big Shoulders Display', 'sans-serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '0px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
