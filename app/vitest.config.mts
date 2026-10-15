import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// ESM config; component tests use RN Web, native bridge tests import index.tsx.
export default defineConfig({
  resolve: { alias: [
    ...['WebExperience', 'PwaInstallAction', 'PwaInstallPanel'].map(name => ({ find: new RegExp(`^.*\\/${name}$`), replacement: fileURLToPath(new URL(`./src/components/${name}/index.web.tsx`, import.meta.url)) })),
    { find: /^.*\/RemoteMediaImage$/, replacement: fileURLToPath(new URL('./src/components/RemoteMediaImage/index.web.tsx', import.meta.url)) },
    { find: /^.*\/warmMediaUrl$/, replacement: fileURLToPath(new URL('./src/features/media/warmMediaUrl.web.ts', import.meta.url)) }
  ] }
});
