import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works both from a static file and from a
// GitHub Pages subpath (e.g. /Porcadex/). Routing uses HashRouter to match.
export default defineConfig({
  base: './',
  plugins: [react()],
})
