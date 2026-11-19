import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/services/billing.calc.ts', 'src/utils/money.ts', 'src/utils/phone.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
    },
  },
});
