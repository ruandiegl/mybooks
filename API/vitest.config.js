import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/modules/**/*.js', 'src/shared/**/*.js']
    }
  }
});
