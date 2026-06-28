/** @type {import('tailwindcss').Config} */
// BLACK BOX Front Desk — tokens charcoal + amber. Zéro hex dans les composants.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0E0E0F',
        surface: { DEFAULT: '#1A1A1C', 2: '#141416' },
        ink:     '#FFFFFF',
        muted:   '#8A8A8E',
        accent:  { DEFAULT: '#F5A623' },
        success: '#5BBF7A',
        pending: '#F5A623',
        error:   '#E05C5C',
        line:    '#2A2A2C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
};
