import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'

// Tests don't need the app's server plugins (TanStack Start, Nitro), so they get their own small config.
// A component test file opts into the browser-like environment with `// @vitest-environment jsdom`.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    // One copy of React for the components and for react-dom, or hooks fail with a null dispatcher
    dedupe: ['react', 'react-dom'],
  },
  plugins: [viteTsConfigPaths({ projects: ['./tsconfig.json'] }), viteReact()],
  test: {
    environment: 'node',
  },
})
