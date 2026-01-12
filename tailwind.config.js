/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#0a0a1a',
        'neon-cyan': '#00ffff',
        'neon-magenta': '#ff00ff',
      },
    },
  },
  plugins: [],
};
