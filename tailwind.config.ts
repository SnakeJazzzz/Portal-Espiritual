import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        portal: {
          black: '#050510',
          indigo: '#0F0A2E',
          violet: '#2D1B69',
          gold: '#C9A84C',
          text: '#E8E0F3',
          white: '#FFFFFF',
          'card-bg': 'rgba(45, 27, 105, 0.3)',
          'card-border': 'rgba(255, 255, 255, 0.08)',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
      },
      backdropBlur: {
        card: '16px',
      },
      animation: {
        twinkle: 'twinkle var(--twinkle-duration, 5s) ease-in-out infinite',
        'twinkle-off': 'twinkle-off var(--twinkle-duration, 5s) ease-in-out infinite',
        'shooting-star': 'shooting-star 1s ease-in-out forwards',
        'celestial-rotate': 'celestial-rotate 750s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
