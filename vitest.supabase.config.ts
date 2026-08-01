import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.integration.ts'],
  },
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
