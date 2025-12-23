import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 🔥🔥🔥 核心修改：添加这行，使用相对路径 🔥🔥🔥
  base: './', 

  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) {
              return 'three';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})