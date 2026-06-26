// PostCSS is a CSS processor — it transforms CSS through plugins.
// Vite runs PostCSS automatically on every .css file.
//
// The TWO plugins below are the only ones needed for Tailwind to work:
//
// 1. tailwindcss: Reads your HTML/JSX, finds class names, generates utility CSS
// 2. autoprefixer: Adds vendor prefixes (-webkit-, -moz-) for browser compatibility
//    Input:  display: grid;
//    Output: display: -ms-grid; display: grid;

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
