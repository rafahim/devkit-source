#!/usr/bin/env bash
set -eu
node --input-type=module <<'NODE'
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const root = process.cwd();
const manifest = JSON.parse(await readFile(resolve(root, 'project-source.json'), 'utf8'));
for (const [name, encoded] of Object.entries(manifest.files)) {
  const target = resolve(root, name);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(encoded, 'base64'));
}
NODE
npm install
node --input-type=module <<'NODE'
import { createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
const archiver = (await import('archiver')).default;
const out = createWriteStream(resolve(process.cwd(), 'devkit-source.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });
await new Promise((resolvePromise, reject) => {
  out.on('close', resolvePromise);
  out.on('error', reject);
  archive.on('error', reject);
  archive.pipe(out);
  archive.glob('**/*', { dot: true, ignore: ['node_modules/**', 'devkit-source.zip', '.git/**'] });
  const finalization = archive.finalize();
  if (finalization && typeof finalization.catch === 'function') finalization.catch(reject);
});
process.stdout.write('Created devkit-source.zip\n');
NODE
