import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createUuidV7, hexToRgb, parseJsonPath, randomToken, rgbToHex, slugify } from '../src/utils/helpers.js';
import { decodeBase64, encodeBase64 } from '../src/commands/encoding.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cli = resolve(root, 'bin/devkit.js');

test('base64 round trip preserves UTF-8', () => {
  const value = 'devkit ✓ বাংলা';
  assert.equal(decodeBase64(encodeBase64(value)), value);
});

test('JSON path reads object keys and array indexes', () => {
  assert.equal(parseJsonPath({ user: { emails: ['a@example.com'] } }, 'user.emails[0]'), 'a@example.com');
});

test('slug normalizes punctuation and accents', () => {
  assert.equal(slugify('Crème brûlée & DevKit!'), 'creme-brulee-devkit');
});

test('UUID v7 has the correct version and variant bits', () => {
  const uuid = createUuidV7(1710000000000);
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('random token has requested length and alphabet', () => {
  const token = randomToken(128, 'abc123');
  assert.equal(token.length, 128);
  assert.match(token, /^[abc123]+$/);
});

test('color conversion round trip', () => {
  assert.deepEqual(hexToRgb('#0fA'), [0, 255, 170]);
  assert.equal(rgbToHex([0, 255, 170]), '#00FFAA');
});

test('CLI formats JSON', () => {
  const result = spawnSync(process.execPath, [cli, 'json', 'format', '{"a":1}'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { a: 1 });
});

test('CLI supports the b64e shortcut', () => {
  const result = spawnSync(process.execPath, [cli, 'b64e', 'hello'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'aGVsbG8=');
});
