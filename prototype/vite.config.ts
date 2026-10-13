import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages project subpath only when building the static preview.
  base: process.env.GITHUB_PAGES_PREVIEW === 'true' ? '/Wan-s-Hermes-UI/' : '/',
  plugins: [react(), tailwindcss()]
})
