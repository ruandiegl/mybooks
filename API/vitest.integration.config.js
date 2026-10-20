import { defineConfig } from 'vitest/config';

// Never load .env or fall back to the application's DATABASE_URL.
export function disposableDatabaseUrl(env = process.env) {
  const invalid = () => new Error('Migration tests require TEST_DATABASE_URL for a local PostgreSQL *_test database and TEST_DATABASE_DISPOSABLE=true.');
  if (!env.TEST_DATABASE_URL || env.TEST_DATABASE_DISPOSABLE !== 'true') throw invalid();
  let url;
  try {
    url = new URL(env.TEST_DATABASE_URL);
  } catch {
    throw invalid();
  }
  if (!['postgresql:', 'postgres:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || !/^\/[a-zA-Z0-9_]+_test$/.test(url.pathname)
    || url.searchParams.has('host')) throw invalid();
  return url;
}

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    include: ['tests/*.migration.integration.test.js'],
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 30000
  }
});
