import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: `${process.env.VITE_BACKEND_SERVER_URL}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
