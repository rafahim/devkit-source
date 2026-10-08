import { access, mkdir, stat } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { formatBytes, hashFile, parseInteger, walkFiles } from '../utils/helpers.js';
import { print, printJson, success, withSpinner } from '../utils/output.js';

export function registerFilesCommands(program) {
  const files = program.command('files').description('Inspect files, detect duplicates, and manage ZIP archives.');
  files.command('file-size <path>').description('Show file size and basic metadata').action(async (inputPath) => {
    const filePath = resolve(inputPath);
    const info = await stat(filePath);
    printJson({ path: filePath, name: basename(filePath), type: info.isDirectory() ? 'directory' : 'file', bytes: info.size, size: formatBytes(info.size), modified: info.mtime.toISOString() });
  });
  files.command('file-tree [path]').description('Display a sorted directory tree').option('-d, --max-depth <depth>', 'Maximum directory depth', '5').option('--all', 'Include hidden files').action(async (inputPath = '.', options) => {
    const depth = parseInteger(options.maxDepth, 'Depth', 0, 100);
    const rootPath = resolve(inputPath);
    const rootInfo = await stat(rootPath);
    if (rootInfo.isFile()) {
      print(`${basename(rootPath)} (${formatBytes(rootInfo.size)})`);
      return;
    }
    const list = await walkFiles(rootPath, { maxDepth: depth, includeHidden: options.all });
    const lines = [basename(rootPath) || rootPath];
    const tree = list.filter((item) => item.depth <= depth).sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true }));
    const branches = new Map();
    for (const item of tree) {
      const parts = item.relativePath.split(/[\\/]/).filter(Boolean);
      const prefixParts = parts.slice(0, -1);
      const parentKey = prefixParts.join('/');
      const siblings = tree.filter((candidate) => {
        const candidateParts = candidate.relativePath.split(/[\\/]/).filter(Boolean);
        return candidateParts.slice(0, -1).join('/') === parentKey;
      });
      const index = siblings.findIndex((candidate) => candidate.relativePath === item.relativePath);
      const prefix = prefixParts.map((part, i) => {
        const ancestor = prefixParts.slice(0, i + 1).join('/');
        return branches.get(ancestor) === true ? '    ' : '│   ';
      }).join('');
      const last = index === siblings.length - 1;
      branches.set(item.relativePath, last);
      lines.push(`${prefix}${last ? '└── ' : '├── '}${item.name}${item.type === 'directory' ? '/' : ''}${item.type === 'file' ? ` (${formatBytes(item.size)})` : ''}`);
    }
    print(lines.join('\n'));
  });
  files.command('duplicate-files <path>').description('Find identical files using SHA-256').option('--min-size <bytes>', 'Ignore files smaller than this size', '1').action(async (inputPath, options) => {
    const rootPath = resolve(inputPath);
    const minSize = Number(options.minSize);
    if (!Number.isSafeInteger(minSize) || minSize < 0) throw new Error('Minimum size must be a non-negative integer.');
    const entries = await walkFiles(rootPath, { includeHidden: true });
    const fileEntries = entries.filter((item) => item.type === 'file' && item.size >= minSize);
    const buckets = new Map();
    for (const item of fileEntries) {
      const key = `${item.size}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(item);
    }
    const groups = [];
    for (const bucket of buckets.values()) {
      if (bucket.length < 2) continue;
      const hashed = new Map();
      for (const item of bucket) {
        const digest = await hashFile(item.path);
        if (!hashed.has(digest)) hashed.set(digest, []);
        hashed.get(digest).push(item.path);
      }
      for (const [sha256, paths] of hashed) if (paths.length > 1) groups.push({ sha256, count: paths.length, paths });
    }
    printJson({ root: rootPath, duplicateGroups: groups.length, groups });
  });
  files.command('zip <archive> <paths...>').description('Create a ZIP archive from files or directories').action(async (archivePath, inputPaths) => {
    const destination = resolve(archivePath);
    const resolvedInputs = await Promise.all(inputPaths.map(async (item) => {
      const absolute = resolve(item);
      if (absolute === destination) throw new Error('The archive cannot include itself.');
      const info = await stat(absolute).catch(() => null);
      if (!info || (!info.isFile() && !info.isDirectory())) throw new Error(`Input does not exist or is unsupported: ${item}`);
      return { absolute, info };
    }));
    const archiver = (await import('archiver')).default;
    const fs = await import('node:fs');
    await mkdir(dirname(destination), { recursive: true });
    const output = fs.createWriteStream(destination);
    const archive = archiver('zip', { zlib: { level: 9 } });
    const result = await new Promise((resolvePromise, reject) => {
      output.on('close', () => resolvePromise({ file: destination, bytes: archive.pointer() }));
      output.on('error', reject);
      archive.on('error', reject);
      archive.pipe(output);
      for (const { absolute, info } of resolvedInputs) {
        if (info.isDirectory()) archive.directory(absolute, basename(absolute));
        else archive.file(absolute, { name: basename(absolute) });
      }
      const finalization = archive.finalize();
      if (finalization && typeof finalization.catch === 'function') finalization.catch(reject);
    });
    printJson({ ...result, size: formatBytes(result.bytes) });
  });
  files.command('unzip <archive> [destination]').description('Safely extract a ZIP archive').action(async (archivePath, destination = '.') => {
    const archive = resolve(archivePath);
    const target = resolve(destination);
    await access(archive);
    await mkdir(target, { recursive: true });
    await withSpinner(`Extracting ${basename(archive)}`, async () => {
      const extract = (await import('extract-zip')).default;
      await extract(archive, { dir: target });
    });
    success(`Extracted to ${target}`);
  });
}
