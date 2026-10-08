import { createHash, randomBytes, randomInt } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, extname, join, relative, resolve, sep } from 'node:path';

export const DEFAULT_CONFIG = Object.freeze({ color: true, output: 'text', timezone: 'UTC' });

export function getConfigPath(override) {
  return resolve(override || join(homedir(), '.devkitrc.json'));
}

export async function loadConfig(override) {
  const filePath = getConfigPath(override);
  try {
    const value = JSON.parse(await readFile(filePath, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Config must contain a JSON object.');
    return { ...DEFAULT_CONFIG, ...value };
  } catch (cause) {
    if (cause?.code === 'ENOENT') return { ...DEFAULT_CONFIG };
    throw new Error(`Cannot read config ${filePath}: ${cause.message}`);
  }
}

export async function saveConfig(config, override) {
  const filePath = getConfigPath(override);
  await mkdir(resolve(filePath, '..'), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return filePath;
}

export async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export async function readTextInput(input, options = {}) {
  if (input === undefined || input === null || input === '-') {
    if (!process.stdin.isTTY) {
      const value = await readStdin();
      if (value.length || options.allowEmpty) return value;
    }
    if (options.allowEmpty) return '';
    throw new Error('No input provided. Pass a value, a file path, or pipe stdin.');
  }
  const value = String(input);
  try {
    const info = await stat(resolve(value));
    if (info.isFile()) return await readFile(resolve(value), 'utf8');
  } catch (cause) {
    if (!['ENOENT', 'ENOTDIR', 'ENAMETOOLONG', 'EINVAL'].includes(cause?.code)) throw cause;
  }
  return value;
}

export async function readFileArgument(input) {
  if (!input) throw new Error('A file path is required.');
  return readFile(resolve(input), 'utf8');
}

export function parseJson(text, label = 'input') {
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new Error(`Invalid JSON in ${label}: ${cause.message}`);
  }
}

export function parseJsonPath(value, expression) {
  const path = String(expression).trim().replace(/^\$\.?/, '');
  if (!path) return value;
  const tokens = [];
  const pattern = /(?:^|\.)([^.[\]]+)|\[(?:(\d+)|"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)')\]/g;
  let match;
  let lastIndex = 0;
  while ((match = pattern.exec(path)) !== null) {
    if (match.index !== lastIndex && path.slice(lastIndex, match.index).replace(/^\./, '') !== '') {
      throw new Error(`Invalid JSON query path near: ${path.slice(lastIndex)}`);
    }
    tokens.push(match[1] ?? match[2] ?? (match[3] !== undefined ? match[3].replace(/\\"/g, '"') : match[4] !== undefined ? match[4].replace(/\\'/g, "'") : undefined));
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex !== path.length) throw new Error(`Invalid JSON query path near: ${path.slice(lastIndex)}`);
  let current = value;
  for (const token of tokens) {
    if (current === null || current === undefined || !(token in Object(current))) return undefined;
    current = current[token];
  }
  return current;
}

export function stableStringify(value, indent = 2) {
  return JSON.stringify(value, (_, child) => {
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      return Object.fromEntries(Object.keys(child).sort().map((key) => [key, child[key]]));
    }
    return child;
  }, indent);
}

export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createUuidV7(now = Date.now()) {
  const bytes = randomBytes(16);
  let timestamp = BigInt(now);
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = Number(timestamp & 255n);
    timestamp >>= 8n;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function randomToken(length = 21, alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-') {
  if (!Number.isInteger(length) || length < 1 || length > 4096) throw new Error('Length must be an integer between 1 and 4096.');
  if (!alphabet || alphabet.length < 2 || alphabet.length > 256) throw new Error('Alphabet must contain between 2 and 256 characters.');
  const max = alphabet.length - 1;
  const mask = (2 ** Math.ceil(Math.log2(alphabet.length))) - 1;
  let result = '';
  while (result.length < length) {
    const bytes = randomBytes(Math.ceil((length - result.length) * 1.6));
    for (const byte of bytes) {
      const index = byte & mask;
      if (index < alphabet.length) result += alphabet[index];
      if (result.length === length) break;
    }
  }
  return result;
}

export function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return 'unknown';
  if (bytes < 1000) return `${bytes} B`;
  const units = ['kB', 'MB', 'GB', 'TB', 'PB'];
  let amount = bytes;
  let index = -1;
  do {
    amount /= 1000;
    index += 1;
  } while (amount >= 1000 && index < units.length - 1);
  return `${amount.toFixed(amount >= 100 ? 0 : amount >= 10 ? 1 : 2)} ${units[index]}`;
}

export async function walkFiles(rootPath, options = {}) {
  const root = resolve(rootPath);
  const results = [];
  const skipDirs = new Set(options.skipDirs || ['.git', 'node_modules', '.next', 'dist']);
  const maxDepth = Number.isInteger(options.maxDepth) ? options.maxDepth : Infinity;
  async function visit(current, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (cause) {
      throw new Error(`Cannot read ${current}: ${cause.message}`);
    }
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    for (const entry of entries) {
      if (!options.includeHidden && entry.name.startsWith('.')) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        results.push({ path: fullPath, relativePath: relative(root, fullPath), name: entry.name, type: 'directory', depth: depth + 1 });
        if (depth + 1 < maxDepth) await visit(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const info = await lstat(fullPath);
        results.push({ path: fullPath, relativePath: relative(root, fullPath), name: entry.name, type: 'file', size: info.size, depth: depth + 1, extension: extname(entry.name) });
      } else if (entry.isSymbolicLink() && options.includeSymlinks) {
        results.push({ path: fullPath, relativePath: relative(root, fullPath), name: entry.name, type: 'symlink', depth: depth + 1 });
      }
    }
  }
  const info = await stat(root);
  if (info.isFile()) return [{ path: root, relativePath: basename(root), name: basename(root), type: 'file', size: info.size, depth: 0, extension: extname(root) }];
  await visit(root, 0);
  return results;
}

export async function hashFile(filePath, algorithm = 'sha256') {
  const digest = createHash(algorithm);
  const stream = await import('node:fs');
  return new Promise((resolvePromise, reject) => {
    const fileStream = stream.createReadStream(filePath);
    fileStream.on('data', (chunk) => digest.update(chunk));
    fileStream.on('error', reject);
    fileStream.on('end', () => resolvePromise(digest.digest('hex')));
  });
}

export function parseInteger(value, name, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  return number;
}

export function parseRgb(value) {
  if (Array.isArray(value)) {
    if (value.length !== 3) throw new Error('RGB needs three channels.');
    const channels = value.map(Number);
    if (channels.some((v) => !Number.isInteger(v) || v < 0 || v > 255)) throw new Error('RGB channels must be integers from 0 to 255.');
    return channels;
  }
  const match = String(value).match(/^\s*(?:rgb\s*\()?\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)?\s*$/i);
  if (!match) throw new Error('Expected RGB values such as 12, 34, 56.');
  return parseRgb(match.slice(1).map(Number));
}

export function hexToRgb(value) {
  let hex = String(value).trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = [...hex].map((character) => character + character).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) throw new Error('Expected a 3- or 6-digit HEX color.');
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

export function rgbToHex(value) {
  return `#${parseRgb(value).map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
