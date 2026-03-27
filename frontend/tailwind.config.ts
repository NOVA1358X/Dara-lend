import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#000000',
        'bg-secondary': '#0A0A0A',
        'bg-tertiary': '#131313',
        'surface': '#131313',
        'surface-container': '#1F1F1F',
        'surface-hover': 'rgba(255, 255, 255, 0.06)',
        'border-default': 'rgba(255, 255, 255, 0.08)',
        'border-hover': 'rgba(255, 255, 255, 0.14)',
        'primary': '#C9DDFF',
        'primary-muted': 'rgba(201, 221, 255, 0.6)',
        'secondary': '#D6C5A1',
        'secondary-muted': 'rgba(214, 197, 161, 0.6)',
        'accent': '#C9DDFF',
        'accent-hover': '#B5CCFF',
        'accent-success': '#34D399',
        'accent-warning': '#F59E0B',
        'accent-danger': '#EF4444',
        'text-primary': '#E2E2E2',
        'text-secondary': '#999999',
        'text-muted': '#666666',
        'on-primary': '#0A0A0A',
      },
      fontFamily: {
        headline: ['"Gilda Display"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        label: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'hero': ['80px', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '400' }],
        'hero-mobile': ['40px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '400' }],
        'section': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '400' }],
        'section-mobile': ['30px', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '400' }],
        'cta-headline': ['56px', { lineHeight: '1.08', letterSpacing: '-0.02em', fontWeight: '400' }],
        'label': ['11px', { lineHeight: '1', letterSpacing: '0.25em', fontWeight: '500' }],
        'stat': ['64px', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '400' }],
        'stat-mobile': ['40px', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '400' }],
      },
      borderRadius: {
        'card': '16px',
        'pill': '9999px',
      },
      spacing: {
        'section': '160px',
        'section-mobile': '96px',
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
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'gauge-fill': {
          '0%': { 'stroke-dashoffset': '283' },
          '100%': { 'stroke-dashoffset': '70.75' },
        },
        'border-beam-spin': {
          '0%': { transform: 'translate(-50%, -50%) rotate(0deg)' },
          '100%': { transform: 'translate(-50%, -50%) rotate(360deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'logo-glow': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(201, 221, 255, 0.2), 0 0 30px rgba(201, 221, 255, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(201, 221, 255, 0.35), 0 0 40px rgba(201, 221, 255, 0.15)' },
        },
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'gauge-fill': 'gauge-fill 2s ease-out forwards',
        'border-beam': 'border-beam-spin 6s linear infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'slide-up': 'slide-up-fade 0.5s ease-out forwards',
        'scale-in': 'scale-in 0.4s ease-out forwards',
        'logo-glow': 'logo-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
