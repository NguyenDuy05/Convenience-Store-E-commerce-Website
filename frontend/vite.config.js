import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Mọi request /api được chuyển tiếp sang backend (cổng 5000), khỏi lo CORS khi dev
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const target = /^https?:\/\//.test(env.VITE_API_URL || '') ? new URL(env.VITE_API_URL).origin : 'http://localhost:5000';
  return { plugins: [react()], server: { port: 5173, proxy: { '/api': target } } };
});
