import { createHash, timingSafeEqual } from 'node:crypto';
import { readTextInput } from '../utils/helpers.js';
import { print } from '../utils/output.js';

const algorithms = ['md5', 'sha1', 'sha256', 'sha512'];

async function digest(algorithm, input, options = {}) {
  const value = await readTextInput(input);
  if (algorithm === 'bcrypt') {
    const imported = await import('bcryptjs');
    const bcrypt = imported.default || imported;
    const rounds = Number(options.rounds ?? 10);
    if (!Number.isInteger(rounds) || rounds < 4 || rounds > 15) throw new Error('Bcrypt rounds must be from 4 to 15.');
    print(await bcrypt.hash(value, rounds));
    return;
  }
  print(createHash(algorithm).update(value, 'utf8').digest('hex'));
}

export function registerHashCommands(program) {
  const group = program.command('hash').description('Create and compare cryptographic hashes.');
  for (const algorithm of [...algorithms, 'bcrypt']) {
    const sub = group.command(`${algorithm} [input]`).description(`Create a ${algorithm.toUpperCase()} hash`);
    if (algorithm === 'bcrypt') sub.option('-r, --rounds <number>', 'Bcrypt cost factor', '10');
    sub.action(async (input, options) => digest(algorithm, input, options));
  }
  group.command('check <value> <digest> [algorithm]')
    .description('Check a value against a hash; algorithm defaults to auto-detect')
    .action(async (input, target, algorithm = '') => {
      const value = await readTextInput(input);
      const inferred = target.startsWith('$2') ? 'bcrypt' : ({ 32: 'md5', 40: 'sha1', 64: 'sha256', 128: 'sha512' }[target.length] || 'sha256');
      const mode = algorithm.toLowerCase() || inferred;
      if (mode === 'bcrypt') {
        const imported = await import('bcryptjs');
        const bcrypt = imported.default || imported;
        print(await bcrypt.compare(value, target) ? 'Match' : 'No match');
        return;
      }
      if (!algorithms.includes(mode)) throw new Error(`Unsupported algorithm: ${mode}`);
      const actual = createHash(mode).update(value, 'utf8').digest('hex');
      const actualBytes = Buffer.from(actual, 'hex');
      const targetBytes = Buffer.from(target, 'hex');
      const matched = actualBytes.length === targetBytes.length && timingSafeEqual(actualBytes, targetBytes);
      print(matched ? 'Match' : 'No match');
    });
}
