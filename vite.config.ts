import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  server: {
    port: 5173,
  },
  build: {
    target: 'node18',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 分离 monaco-editor
          if (id.includes('node_modules/monaco-editor')) {
            return 'monaco-editor'
          }
          // 分离 MUI
          if (id.includes('node_modules/@mui')) {
            return 'mui-vendor'
          }
          // 分离其他大型依赖
          if (id.includes('node_modules/react-syntax-highlighter') ||
              id.includes('node_modules/prismjs') ||
              id.includes('node_modules/remark-gfm') ||
              id.includes('node_modules/react-markdown')) {
            return 'markdown-vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // 优化资源内联
    assetsInlineLimit: 4096
  }
})

