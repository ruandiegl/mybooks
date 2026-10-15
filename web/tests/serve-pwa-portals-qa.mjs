// Test-only Vite entry; real RN Web modals with OS boundaries replaced, no API.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const app = fileURLToPath(new URL('../../app/', import.meta.url));
const require = createRequire(path.join(app, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const fixture = path.join(app, 'src/__tests__/fixtures/pwa-os-boundaries.tsx');
const server = await createServer({
  configFile: false, root: app, server: { host: '127.0.0.1', port: 4183, strictPort: true }, esbuild: { jsx: 'automatic' },
  resolve: { extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'], alias: [
    { find: /^react-native$/, replacement: 'react-native-web' },
    { find: /^(expo-status-bar|react-native-safe-area-context|@expo\/vector-icons\/MaterialIcons)$/, replacement: fixture },
  ] },
});
await server.listen(); server.printUrls();
