import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/commands/**', 'src/output/**'],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 70,
        lines: 80
      }
    },
    testTimeout: 30000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});