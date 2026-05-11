import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
});
