import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.mjs'),
          dest: ''
        }
      ]
    })
  ],
  server: {
    fs: {
      allow: ['..']
    }
  }
})
