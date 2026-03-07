import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#080A12',
        'bg-secondary': '#0D1017',
        'bg-tertiary': '#131620',
        'surface': 'rgba(255, 255, 255, 0.025)',
        'surface-hover': 'rgba(255, 255, 255, 0.05)',
        'border-default': 'rgba(255, 255, 255, 0.06)',
        'border-hover': 'rgba(255, 255, 255, 0.12)',
        'accent': '#00E5CC',
        'accent-hover': '#00CCB5',
        'accent-success': '#34D399',
        'accent-warning': '#F59E0B',
        'accent-danger': '#EF4444',
        'text-primary': '#F0F0F0',
        'text-secondary': '#8A919E',
        'text-muted': '#4B5263',
      },
      fontFamily: {
        heading: ['"Instrument Sans"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'hero': ['68px', { lineHeight: '1.08', letterSpacing: '-0.03em', fontWeight: '600' }],
        'hero-mobile': ['36px', { lineHeight: '1.12', letterSpacing: '-0.02em', fontWeight: '600' }],
        'section': ['44px', { lineHeight: '1.12', letterSpacing: '-0.02em', fontWeight: '600' }],
        'section-mobile': ['28px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'cta-headline': ['52px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'label': ['12px', { lineHeight: '1', letterSpacing: '0.1em', fontWeight: '500' }],
      },
      borderRadius: {
        'card': '12px',
      },
      spacing: {
        'section': '140px',
        'section-mobile': '80px',
      },
      keyframes: {
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg) translateX(40px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(40px) rotate(-360deg)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'scramble': {
          '0%': { opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'orbit': 'orbit 8s linear infinite',
        'orbit-delayed': 'orbit 8s linear infinite 2.66s',
        'orbit-delayed-2': 'orbit 8s linear infinite 5.33s',
        'float': 'float 3s ease-in-out infinite',
        'scramble': 'scramble 0.6s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
