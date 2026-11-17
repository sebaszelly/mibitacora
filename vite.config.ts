import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages sirve el sitio en https://<usuario>.github.io/mibitacora/
export default defineConfig({
  base: '/mibitacora/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
