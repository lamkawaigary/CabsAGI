/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#667eea',
          dark: '#1a1a2e',
        },
        accent: '#764ba2',
      },
      fontFamily: {
        sans: ['Outfit', 'Noto Sans TC', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xxs': '10px',
      },
      borderRadius: {
        'phone': '50px',
        'card': '24px',
        'button': '18px',
      },
      spacing: {
        'header': '44px',
        'bottom-nav': '90px',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'card-sm': '0 2px 12px rgba(0, 0, 0, 0.06)',
        'button': '0 8px 25px rgba(26, 26, 46, 0.4)',
      }
    },
  },
  plugins: [],
}
