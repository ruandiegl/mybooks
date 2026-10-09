import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// ESM config; component tests use RN Web, native bridge tests import index.tsx.
export default defineConfig({
  resolve: { alias: [{ find: /^.*\/RemoteMediaImage$/, replacement: fileURLToPath(new URL('./src/components/RemoteMediaImage/index.web.tsx', import.meta.url)) }] }
});
