import { randomInt, randomUUID } from 'node:crypto';
import { parseInteger, randomToken, readTextInput, slugify } from '../utils/helpers.js';
import { print } from '../utils/output.js';

const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function registerIdCommands(program) {
  const id = program.command('id').description('Generate identifiers and readable slugs.');
  id.command('uuid [version]').description('Generate UUID v4 or v7').action(async (version = 'v4') => {
    const mode = String(version).toLowerCase().replace(/^\d$/, (v) => `v${v}`);
    if (mode === 'v4' || mode === '4') print(randomUUID());
    else if (mode === 'v7' || mode === '7') print((await import('../utils/helpers.js')).createUuidV7());
    else throw new Error('UUID version must be v4 or v7.');
  });
  id.command('nanoid [length]').description('Generate a URL-safe Nano ID').action(async (length = '21') => print(randomToken(parseInteger(length, 'Length', 1, 4096))));
  id.command('slug [input]').description('Convert text to a URL slug').action(async (input) => print(slugify(await readTextInput(input))));
  id.command('random-string [length]').description('Generate a random alphanumeric string').option('-a, --alphabet <characters>', 'Custom alphabet').action(async (length = '24', options) => print(randomToken(parseInteger(length, 'Length', 1, 4096), options.alphabet || letters)));
  id.command('pin [digits]').description('Generate a numeric PIN with leading zeros preserved').action(async (digits = '6') => {
    const size = parseInteger(digits, 'Digits', 1, 12);
    const max = 10n ** BigInt(size);
    const value = BigInt(randomInt(0, Number(max <= BigInt(Number.MAX_SAFE_INTEGER) ? max : BigInt(Number.MAX_SAFE_INTEGER))));
    print(value.toString().padStart(size, '0'));
  });
}
