import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5188, host: '127.0.0.1' },
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // Measured where the logic lives. Screens and 3D scenes have no browser tests yet, so they are left out on purpose.
    coverage: { provider: 'v8', include: ['src/domain/**', 'src/data/**', 'src/ui/ScoutPanel.tsx'], exclude: ['**/*.test.ts', '**/*.test.tsx', 'src/domain/sample.ts'], thresholds: { lines: 90, functions: 90, branches: 80 } },
  },
});
