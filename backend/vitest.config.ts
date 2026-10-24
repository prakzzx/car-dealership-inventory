import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/setup/globalSetup.ts'],
    setupFiles: ['./tests/setup/env.ts'],
    // All integration files share ONE real Postgres test database and truncate it between tests,
    // so files must not run in parallel.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // server.ts only wires process signals/listen(); it is exercised manually, not by unit tests.
      // *.d.ts / types-only files contain no executable logic.
      exclude: ['src/server.ts', 'src/**/*.d.ts', 'src/domain/types.ts', 'src/types/**'],
      reporter: ['text', 'html', 'lcov'],
      // Target from the brief: >= 80% for business logic (services) and middleware.
      thresholds: {
        'src/modules/**/*.service.ts': { statements: 80, branches: 80, functions: 80, lines: 80 },
        'src/middleware/**/*.ts': { statements: 80, branches: 80, functions: 80, lines: 80 },
      },
    },
  },
});
