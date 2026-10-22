/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        backgroundElement: 'var(--background-element)',
        backgroundSelected: 'var(--background-selected)',
        card: 'var(--card)',
        border: 'var(--border)',
        text: 'var(--text)',
        textSecondary: 'var(--text-secondary)',
        textMuted: 'var(--text-muted)',
        primary: 'rgb(var(--primary-rgb) / <alpha-value>)',
        primaryDark: 'var(--primary-dark)',
        onPrimary: 'rgb(var(--on-primary-rgb) / <alpha-value>)',
        danger: 'var(--danger)',
        gold: 'var(--gold)',
        gradeAgain: 'var(--grade-again)',
        gradeHard: 'var(--grade-hard)',
        gradeGood: 'var(--grade-good)',
        gradeEasy: 'var(--grade-easy)',
        brand: {
          500: 'rgb(var(--primary-rgb) / <alpha-value>)',
          600: 'var(--primary-dark)',
        },
      },
      borderRadius: {
        small: '10px',
        medium: '14px',
        large: '20px',
        xlarge: '28px',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        uthmanic: ['UthmanicHafs', 'serif'],
        surah: ['SurahNames', 'sans-serif'],
      },
      boxShadow: {
        '2xs': '0 1px 0 0 rgb(0 0 0 / 0.04)',
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.06)',
        soft: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -8px rgb(0 0 0 / 0.12)',
        lift: '0 2px 4px rgb(0 0 0 / 0.04), 0 24px 48px -16px rgb(0 0 0 / 0.22)',
        glow: '0 0 0 1px rgb(var(--primary-rgb) / 0.25), 0 12px 40px -12px rgb(var(--primary-rgb) / 0.55)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.28s ease-out both',
        scaleIn: 'scaleIn 0.18s ease-out both',
        slideUp: 'slideUp 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};
