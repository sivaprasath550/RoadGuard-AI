// main.tsx is the ENTRY POINT of the entire React application.
// The browser loads index.html → finds <script src="/src/main.tsx">
// → Vite transforms and serves this file → this code runs in the browser.

import React from 'react'
import ReactDOM from 'react-dom/client'

// Global CSS: Tailwind's base styles, component styles, utility classes.
// This import makes Tailwind scan this file and inject all utility CSS.
import './index.css'

import App from './App'

// ReactDOM.createRoot() is the React 18 way to mount your app.
// It enables "Concurrent Mode" — React can now pause, interrupt, and
// resume rendering. This enables features like Suspense and Transitions.
//
// WHAT HAPPENS HERE INTERNALLY:
// 1. document.getElementById('root') finds the <div id="root"> in index.html
// 2. ReactDOM.createRoot() creates a "Fiber root" — React's internal tree manager
// 3. .render(<App />) tells React to render the App component into that div
// 4. React creates a "virtual DOM" tree representing your component hierarchy
// 5. React "reconciles" the virtual DOM with the actual DOM, making minimal changes
// 6. The browser renders the result to the screen
const rootElement = document.getElementById('root')

// TypeScript safety: getElementById can return null if the element doesn't exist.
// The '!' (non-null assertion) tells TypeScript: "I know this won't be null."
// In production code at Google, you'd handle this more gracefully with an error.
ReactDOM.createRoot(rootElement!).render(
  // StrictMode is a development-only tool. It has ZERO impact on production.
  // In development, it:
  //   1. Renders every component TWICE to detect side effects
  //   2. Warns about deprecated APIs
  //   3. Warns about missing keys in lists
  // This is why you might see console.log() run twice in dev — intentional.
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
