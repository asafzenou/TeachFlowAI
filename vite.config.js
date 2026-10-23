import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  const port = Number(environment.VITE_DEV_PORT || 5173);
  const proxyTarget =
    environment.BACKEND_PROXY_TARGET || 'http://localhost:3001';
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('VITE_DEV_PORT must be a valid port.');
  }
  try {
    new URL(proxyTarget);
  } catch {
    throw new Error('BACKEND_PROXY_TARGET must be a valid URL.');
  }
  return {
    root: 'src',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
    publicDir: '../public',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    appType: 'spa',
    server: {
      port,
      proxy: { '/api': { target: proxyTarget, changeOrigin: true } },
    },
    plugins: [tailwindcss(), react()],
  };
});
