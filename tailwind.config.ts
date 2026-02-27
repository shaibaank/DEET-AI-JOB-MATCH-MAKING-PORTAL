import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        serif: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Luxury palette
        alabaster: '#F9F8F6',
        charcoal: '#1A1A1A',
        taupe: '#EBE5DE',
        warmgrey: '#6C6863',
        gold: '#D4AF37',
        // Semantic colors
        skill: {
          match: '#22C55E',
          mismatch: '#EF4444',
        },
        score: {
          excellent: '#10B981',
          good: '#3B82F6',
          fair: '#F59E0B',
          poor: '#EF4444',
        }
      },
      borderRadius: {
        none: '0px',
      },
      transitionDuration: {
        '700': '700ms',
        '1500': '1500ms',
        '2000': '2000ms',
      },
      transitionTimingFunction: {
        'luxury': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cascadeIn: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        goldSlide: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        progressBar: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        resumeFloat: {
          '0%, 100%': { transform: 'translateY(0) scale(1)', opacity: '0.3' },
          '50%': { transform: 'translateY(-20px) scale(1.5)', opacity: '0.6' },
        },
      },
      animation: {
        'fadeInUp': 'fadeInUp 0.6s ease-out forwards',
        'cascadeIn': 'cascadeIn 0.8s ease-out forwards',
        'slideInRight': 'slideInRight 0.5s ease-out forwards',
        'goldSlide': 'goldSlide 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'progressBar': 'progressBar 2.5s ease-out forwards',
        'shimmer': 'shimmer 2s infinite linear',
        'scaleIn': 'scaleIn 0.4s ease-out forwards',
        'resumeFloat': 'resumeFloat 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
