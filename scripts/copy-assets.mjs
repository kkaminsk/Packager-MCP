import { cpSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const assets = [
  { src: 'src/templates', dest: 'dist/templates' },
  { src: 'src/knowledge', dest: 'dist/knowledge' },
];

for (const { src, dest } of assets) {
  const srcPath = resolve(root, src);
  const destPath = resolve(root, dest);
  cpSync(srcPath, destPath, { recursive: true, force: true });
  console.log(`Copied ${src} → ${dest}`);
}
