import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    { name: 'preload-mock-runtime', transformIndexHtml: { order: 'post', handler(_html, context) {
      const worker = Object.values(context.bundle ?? {}).find((asset) => asset.type === 'chunk' && asset.facadeModuleId?.endsWith('/src/mocks/browser.ts'))
      return worker ? [{ tag: 'link', attrs: { rel: 'modulepreload', href: `/${worker.fileName}` }, injectTo: 'head' }] : []
    } } },
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
      // The official browser ESM bundle avoids duplicated public-suffix tables in the dependency graph.
      { find: /^tldts$/, replacement: path.resolve(import.meta.dirname, 'node_modules/tldts/dist/index.esm.min.js') },
    ],
  },
})
