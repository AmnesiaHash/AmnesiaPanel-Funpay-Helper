/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        accent: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
          dark: '#7c3aed',
          muted: '#6d28d9'
        },
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)'
        }
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px'
      },
      backdropBlur: {
        glass: '20px'
      },
      boxShadow: {
        glass: '0 8px 32px rgba(139, 92, 246, 0.12)',
        'glass-lg': '0 16px 48px rgba(139, 92, 246, 0.18)'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
