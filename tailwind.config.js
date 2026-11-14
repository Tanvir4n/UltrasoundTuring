/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          blue: '#9CDBFA', // User's requested sky blue
          'blue-hover': '#82CDF6',
          'blue-dark': '#0B132B',
          green: '#84CC16',
          yellow: '#F59E0B',
          purple: '#9CDBFA',
          bg: '#FAFAF9',
          card: '#FFFFFF',
          border: '#000000',
        },
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px 0px #000000',
        'neo': '3px 3px 0px 0px #000000',
        'neo-md': '4px 4px 0px 0px #000000',
        'neo-lg': '6px 6px 0px 0px #000000',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"SF Mono"', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
