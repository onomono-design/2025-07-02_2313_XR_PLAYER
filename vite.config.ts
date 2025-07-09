import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections for mobile testing  
    port: 3001,
    open: true,
    // Only use HTTPS in development if certificate files exist
    ...(process.env.NODE_ENV !== 'production' && 
        fs.existsSync('.certs/key.pem') && 
        fs.existsSync('.certs/cert.pem') && {
      https: {
        key: fs.readFileSync('.certs/key.pem'),
        cert: fs.readFileSync('.certs/cert.pem'),
      }
    }),
  },
  build: {
    // Ensure proper chunk size for better performance
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'ui': ['@radix-ui/react-slider', '@radix-ui/react-switch', '@radix-ui/react-scroll-area', '@radix-ui/react-dialog']
        }
      }
    },
    // Optimize asset handling
    assetsInlineLimit: 4096,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: true
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
}) 