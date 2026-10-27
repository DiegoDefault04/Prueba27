import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// En desarrollo, /api se redirige al backend local. En Docker lo hace nginx.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_TARGET ?? 'http://localhost:3001',
    },
  },
});
