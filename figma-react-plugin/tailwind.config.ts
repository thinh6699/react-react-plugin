import type { Config } from 'tailwindcss'

/**
 * Tailwind v4 still works without this file (Vite plugin + `@import "tailwindcss"`).
 * Prefer design tokens in CSS via `@theme` in `src/index.css`.
 * Use this file for plugins, content globs, or legacy `theme.extend` options.
 *
 * Loaded from CSS: `@config "../tailwind.config.ts"`
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Example — prefer `@theme` in CSS for colors/spacing in v4:
      // colors: { brand: '#0d99ff' },
    },
  },
  plugins: [],
} satisfies Config
