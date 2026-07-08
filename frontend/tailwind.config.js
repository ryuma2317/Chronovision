/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Hanken Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        page: 'var(--color-page)',
        card: 'var(--color-card)',
        'card-alt': 'var(--color-card-alt)',
        border: 'var(--color-border)',
        input: 'var(--color-input)',
        navy: 'var(--color-navy)',
        gold: 'var(--color-gold)',
        'gold-dim': 'var(--color-gold-dim)',
        heading: 'var(--color-heading)',
        body: 'var(--color-body)',
        muted: 'var(--color-muted)',
        success: 'var(--color-success)',
        'success-bg': 'var(--color-success-bg)',
        warning: 'var(--color-warning)',
        'warning-bg': 'var(--color-warning-bg)',
        danger: 'var(--color-danger)',
        'danger-bg': 'var(--color-danger-bg)',
        info: 'var(--color-info)',
        'info-bg': 'var(--color-info-bg)',
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      boxShadow: {
        card: '0px 2px 16px rgba(5, 20, 36, 0.06)',
        'card-dark': '0px 2px 16px rgba(0, 0, 0, 0.35)',
        overlay: '0px 8px 32px rgba(5, 20, 36, 0.2)',
      },
      spacing: {
        'nav-height': '64px',
      },
      maxWidth: {
        'container-max': '1280px',
      },
    },
  },
  plugins: [],
};
