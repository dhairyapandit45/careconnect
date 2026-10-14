/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      colors: {
        forest: {
          DEFAULT: '#285943',
          hover: '#204735',
          deep: '#204735',
          light: '#E7EFE4',
          50: '#f2f7f4',
          100: '#e1ede6',
          200: '#c5dccf',
          300: '#9ec3b0',
          400: '#72a38c',
          500: '#4f856d',
          600: '#285943',
          700: '#204735',
          800: '#1b3a2c',
          900: '#173025',
          950: '#0c1a14',
        },
        sage: {
          DEFAULT: '#A8C69F',
          pale: '#E7EFE4',
          50: '#f5f8f3',
          100: '#e7efe4',
          200: '#d1e1cc',
          300: '#b8d2b1',
          400: '#a8c69f',
          500: '#8ba982',
          600: '#6f8b66',
          700: '#556d4d',
          800: '#42553c',
          900: '#344330',
        },
        ivory: {
          DEFAULT: '#F5F5EF',
          warm: '#F5F5EF',
        },
        palesage: '#E7EFE4',
        themeborder: '#DCE3D8',
        darkgreen: {
          DEFAULT: '#24352B',
          muted: '#617267',
        },
        status: {
          success: '#276749',
          warning: '#92400E',
          error: '#B42318',
          info: '#245B75',
        },
        brand: {
          50: '#f2f7f4',
          100: '#e7efe4',
          200: '#c5dccf',
          300: '#a8c69f',
          400: '#72a38c',
          500: '#4f856d',
          600: '#285943',
          700: '#204735',
          800: '#1b3a2c',
          900: '#173025',
          950: '#0c1a14',
        }
      }
    },
  },
  plugins: [],
}
