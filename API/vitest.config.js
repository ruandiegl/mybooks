import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    exclude: ['**/node_modules/**', '**/.git/**', 'tests/*.migration.integration.test.js', 'tests/matches.integration.test.js', 'tests/gamification.integration.test.js', 'tests/moderation.integration.test.js'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/modules/**/*.js', 'src/shared/**/*.js']
    }
  }
});
