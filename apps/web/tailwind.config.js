/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
        surface: {
          0: '#0A0A0F',
          1: '#12121A',
          2: '#1A1A24',
          3: '#24242F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
