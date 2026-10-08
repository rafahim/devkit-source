import { readTextInput } from '../utils/helpers.js';
import { print, printJson } from '../utils/output.js';

function wordsOf(value) {
  return String(value).trim().match(/\S+/g) || [];
}

function convertCase(value, mode) {
  const text = String(value);
  const words = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[A-Za-z0-9]+/g) || [];
  if (mode === 'upper') return text.toUpperCase();
  if (mode === 'lower') return text.toLowerCase();
  if (mode === 'title') return text.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
  if (mode === 'kebab') return words.map((word) => word.toLowerCase()).join('-');
  if (mode === 'snake') return words.map((word) => word.toLowerCase()).join('_');
  if (mode === 'camel') return words.map((word, index) => index ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase()).join('');
  if (mode === 'pascal') return words.map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase()).join('');
  throw new Error(`Unknown case mode: ${mode}`);
}

export function registerTextCommands(program) {
  const text = program.command('text').description('Convert casing, count content, and replace text.');
  text.command('case <mode> [input]').description('Case modes: upper, lower, title, kebab, snake, camel, pascal').action(async (mode, input) => {
    const allowed = ['upper', 'lower', 'title', 'kebab', 'snake', 'camel', 'pascal'];
    if (!allowed.includes(mode)) throw new Error(`Mode must be one of: ${allowed.join(', ')}`);
    print(convertCase(await readTextInput(input), mode));
  });
  text.command('count [input]').description('Count characters, bytes, words, lines, and sentences').action(async (input) => {
    const value = await readTextInput(input);
    printJson({ characters: [...value].length, charactersWithoutWhitespace: [...value].filter((character) => !/\s/.test(character)).length, bytes: Buffer.byteLength(value), words: wordsOf(value).length, lines: value.length ? value.split(/\r\n|\r|\n/).length : 0, sentences: value.trim() ? (value.trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).length : 0 });
  });
  text.command('replace <search> <replacement> [input]').description('Replace matching text').option('--regex', 'Treat search as a regular expression').option('-f, --flags <flags>', 'Regular expression flags', 'g').option('--first', 'Replace only the first match').action(async (search, replacement, input, options) => {
    const value = await readTextInput(input);
    let matcher;
    try {
      matcher = options.regex ? new RegExp(search, options.first ? options.flags.replace(/g/g, '') : options.flags) : new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options.first ? '' : 'g');
    } catch (cause) {
      throw new Error(`Invalid replacement pattern: ${cause.message}`);
    }
    print(value.replace(matcher, replacement));
  });
}
