import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// Absolute outDirs: with renderer root:'src', a relative outDir (or CLI
// --outDir=dist → resetOutDir against config.root) lands in src/dist/renderer,
// which Forge then strips via ignore /^\/src/.
const distMain = resolve('dist/main')
const distPreload = resolve('dist/preload')
const distRenderer = resolve('dist/renderer')

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: distMain,
      rollupOptions: {
        input: {
          index: resolve('electron/main/index.ts')
        }
      }
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: distPreload,
      rollupOptions: {
        input: {
          index: resolve('electron/preload/index.ts')
        }
      }
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    root: 'src',
    build: {
      outDir: distRenderer,
      rollupOptions: {
        input: {
          index: resolve('src/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve('src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
