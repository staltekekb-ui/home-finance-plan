/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Основная палитра (светлая тема)
        cream: {
          50: '#FFFFFF',
          100: '#FAF9F6',  // Основной фон
          200: '#F5F4F1',
          300: '#EFEEE9',
        },
        sage: {
          50: '#F1F8E9',
          100: '#DCEDC8',
          200: '#C5E1A5',
          300: '#AED581',
          400: '#9CCC65',
          500: '#8BC34A',  // Основной зелёный
          600: '#7CB342',
          700: '#689F38',
          800: '#558B2F',
          900: '#33691E',
        },
        slate: {
          600: '#546E7A',
          700: '#424242',  // Основной тёмно-серый
          800: '#37474F',
          900: '#263238',
        },
        // Темная палитра
        dark: {
          50: '#3A3A3A',   // Светлые элементы в темной теме
          100: '#2D2D2D',  // Карточки
          200: '#242424',  // Приподнятые элементы
          300: '#1F1F1F',  // Фон страниц
          400: '#1A1A1A',  // Основной фон
          500: '#151515',  // Глубокий фон
        },
        // Акцентные цвета (одинаковые для обеих тем)
        success: '#4CAF50',
        warning: '#FFC107',
        danger: '#EF5350',
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
        'inner-glow': 'inset 0 1px 2px rgba(255, 255, 255, 0.5)',
        'combined': '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      backgroundImage: {
        'gradient-green': 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)',
        'gradient-progress': 'linear-gradient(90deg, #8BC34A 0%, #757575 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
