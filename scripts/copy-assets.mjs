import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

const targets = ['routes', 'styles', 'lib'];

for (const t of targets) {
  const srcDir = join(src, t);
  const dstDir = join(dist, t);
  if (!existsSync(srcDir)) {
    console.warn(`[copy-assets] skipping missing source: ${srcDir}`);
    continue;
  }
  if (existsSync(dstDir)) await rm(dstDir, { recursive: true, force: true });
  await mkdir(dstDir, { recursive: true });
  await cp(srcDir, dstDir, { recursive: true });
  console.log(`[copy-assets] ${t}/ → dist/${t}/`);
}
