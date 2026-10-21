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
        primary: 'var(--primary)',
        primaryDark: 'var(--primary-dark)',
        onPrimary: 'var(--on-primary)',
        danger: 'var(--danger)',
        gradeAgain: 'var(--grade-again)',
        gradeHard: 'var(--grade-hard)',
        gradeGood: 'var(--grade-good)',
        gradeEasy: 'var(--grade-easy)',
        brand: {
          500: 'var(--primary)',
          600: 'var(--primary-dark)',
        },
      },
      borderRadius: {
        small: '10px',
        medium: '16px',
        large: '22px',
        pill: '9999px',
      },
      fontFamily: {
        uthmanic: ['UthmanicHafs', 'serif'],
        surah: ['SurahNames', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
