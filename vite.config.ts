import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared-types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@design-system': fileURLToPath(new URL('./src/design-system', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
    },
  },
});
