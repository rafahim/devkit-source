import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseJson, parseJsonPath, readTextInput, stableStringify } from '../utils/helpers.js';
import { print, printJson, success } from '../utils/output.js';

function parseIndent(value) {
  const indent = Number(value);
  if (!Number.isInteger(indent) || indent < 0 || indent > 10) throw new Error('Indent must be an integer from 0 to 10.');
  return indent;
}

export function registerJsonCommands(program) {
  const json = program.command('json').description('Format, validate, query, and diff JSON.');
  json.command('format [input]')
    .description('Pretty-print JSON from a value, file, or stdin')
    .option('-i, --indent <spaces>', 'Indent spaces from 0 to 10', '2')
    .action(async (input, options) => {
      const raw = await readTextInput(input);
      print(JSON.stringify(parseJson(raw), null, parseIndent(options.indent)));
    });
  json.command('minify [input]')
    .description('Minify JSON')
    .action(async (input) => print(JSON.stringify(parseJson(await readTextInput(input)))));
  json.command('validate [input]')
    .description('Validate JSON without changing it')
    .action(async (input) => {
      const raw = await readTextInput(input);
      parseJson(raw);
      success('Valid JSON');
    });
  json.command('query <expression> [input]')
    .description('Read a value by path, for example user.email or items[0].id')
    .action(async (expression, input) => {
      const parsed = parseJson(await readTextInput(input));
      const result = parseJsonPath(parsed, expression);
      if (result === undefined) throw new Error(`No value found at ${expression}`);
      if (typeof result === 'string') print(result);
      else printJson(result);
    });
  json.command('diff <file-a> <file-b>')
    .description('Show changed JSON paths between two files')
    .action(async (fileA, fileB) => {
      const left = parseJson(await readFile(resolve(fileA), 'utf8'), fileA);
      const right = parseJson(await readFile(resolve(fileB), 'utf8'), fileB);
      const changes = [];
      const compare = (a, b, path) => {
        if (Object.is(a, b)) return;
        const objects = a !== null && b !== null && typeof a === 'object' && typeof b === 'object';
        if (objects && Array.isArray(a) === Array.isArray(b)) {
          const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
          for (const key of [...keys].sort()) compare(a[key], b[key], Array.isArray(a) ? `${path}[${key}]` : path ? `${path}.${key}` : key);
          return;
        }
        if (a !== undefined) changes.push({ type: '-', path: path || '$', value: a });
        if (b !== undefined) changes.push({ type: '+', path: path || '$', value: b });
      };
      compare(left, right, '');
      if (!changes.length) {
        print('No differences.');
        return;
      }
      print(changes.map((item) => `${item.type} ${item.path}: ${JSON.stringify(item.value)}`).join('\n'));
    });
}

export { stableStringify };
