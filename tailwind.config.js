/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
        colors: {
            primary: '#10b981',
            'primary-hover': '#059669',
            gray: {
                50: '#f9fafb',
                100: '#f3f4f6',
                200: '#e5e7eb',
                300: '#d1d5db',
                700: '#374151',
                800: '#1f2937',
                900: '#111827',
                950: '#030712'
            }
        },
        fontSize: {
            'xs': '0.75rem',
            'sm': '0.8125rem',
            'base': '0.875rem',
            'lg': '1rem',
            'xl': '1.125rem',
            '2xl': '1.5rem',
        }
    },
  },
  plugins: [],
}
