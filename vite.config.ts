import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    {
      name: 'emit-version',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'VERSION', source: `${pkg.version}\n` })
      },
    },
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'icons', test: /[\\/]node_modules[\\/]lucide-react[\\/]/, includeDependenciesRecursively: false },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    globals: false,
    environment: 'happy-dom',
  },
})
