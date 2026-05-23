import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      CORS_ORIGINS: '*',
      ENABLE_BACKGROUND_WORKERS: 'false',
      REDIS_URL: '',
    },
    restoreMocks: true,
    fileParallelism: false,
    pool: 'forks',
    globalSetup: ['./tests/utils/globalSetup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'clover', 'html'],
      exclude: ['node_modules', 'src/config', 'src/app.js', 'tests'],
    },
  },
});
