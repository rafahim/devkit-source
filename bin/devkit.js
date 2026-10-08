#!/usr/bin/env node
import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerJsonCommands } from '../src/commands/json.js';
import { registerEncodingCommands } from '../src/commands/encoding.js';
import { registerHashCommands } from '../src/commands/hash.js';
import { registerIdCommands } from '../src/commands/id.js';
import { registerTimeCommands } from '../src/commands/time.js';
import { registerNetworkCommands } from '../src/commands/network.js';
import { registerFilesCommands } from '../src/commands/files.js';
import { registerTextCommands } from '../src/commands/text.js';
import { registerColorCommands } from '../src/commands/color.js';
import { initOutput, print, printJson, error } from '../src/utils/output.js';
import { getConfigPath, loadConfig, saveConfig } from '../src/utils/helpers.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageData = JSON.parse(await readFile(resolve(currentDir, '../package.json'), 'utf8'));
const program = new Command();

program
  .name('devkit')
  .description('CLI toolkit for developers — 50+ utilities in one command.')
  .version(packageData.version)
  .option('--json', 'Output machine-readable JSON')
  .option('--no-color', 'Disable colored output')
  .option('--config <path>', 'Use a custom config file')
  .option('--quiet', 'Suppress progress messages');

program.configureHelp({ showGlobalOptions: true });
program.showSuggestionAfterError();
program.hook('preAction', async (thisCommand, actionCommand) => {
  await initOutput(actionCommand.optsWithGlobals());
});

registerJsonCommands(program);
registerEncodingCommands(program);
registerHashCommands(program);
registerIdCommands(program);
registerTimeCommands(program);
registerNetworkCommands(program);
registerFilesCommands(program);
registerTextCommands(program);
registerColorCommands(program);

program.command('b64e [input]')
  .description('Encode text as Base64')
  .action(async (input) => {
    const { encodeBase64 } = await import('../src/commands/encoding.js');
    print(encodeBase64(await (await import('../src/utils/helpers.js')).readTextInput(input)));
  });

program.command('b64d [input]')
  .description('Decode Base64 text')
  .action(async (input) => {
    const { decodeBase64 } = await import('../src/commands/encoding.js');
    print(decodeBase64(await (await import('../src/utils/helpers.js')).readTextInput(input)));
  });

program.command('config [action] [key] [value]')
  .description('Show or edit ~/.devkitrc.json')
  .addHelpText('after', '\nActions: show, path, get <key>, set <key> <value>, init, reset')
  .action(async (action = 'show', key, value) => {
    const options = program.opts();
    const filePath = getConfigPath(options.config);
    const config = await loadConfig(options.config);
    if (action === 'path') {
      print(filePath);
      return;
    }
    if (action === 'show') {
      printJson(config);
      return;
    }
    if (action === 'init') {
      await saveConfig(config, options.config);
      print(`Config ready: ${filePath}`);
      return;
    }
    if (action === 'get') {
      if (!key) throw new Error('Usage: devkit config get <key>');
      print(config[key] === undefined ? '' : typeof config[key] === 'string' ? config[key] : JSON.stringify(config[key]));
      return;
    }
    if (action === 'set') {
      if (!key || value === undefined) throw new Error('Usage: devkit config set <key> <value>');
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('That config key is not allowed.');
      let parsed = value;
      try { parsed = JSON.parse(value); } catch {}
      config[key] = parsed;
      await saveConfig(config, options.config);
      print(`Saved ${key} in ${filePath}`);
      return;
    }
    if (action === 'reset') {
      await saveConfig({ color: true, output: 'text', timezone: 'UTC' }, options.config);
      print(`Reset ${filePath}`);
      return;
    }
    throw new Error(`Unknown config action: ${action}`);
  });

program.command('completion <shell>')
  .description('Print a shell completion script (bash, zsh, fish)')
  .action(async (shell) => {
    if (!['bash', 'zsh', 'fish'].includes(shell)) throw new Error('Shell must be bash, zsh, or fish.');
    const filePath = resolve(currentDir, '../completions', `devkit.${shell}`);
    print(await readFile(filePath, 'utf8').then((value) => value.trimEnd()));
  });

const menuItems = [
  ['JSON format', ['json', 'format']],
  ['Base64 encode', ['base64', 'encode']],
  ['Hash SHA-256', ['hash', 'sha256']],
  ['Generate UUID', ['id', 'uuid', 'v4']],
  ['Current time', ['time', 'now']],
  ['Public IP', ['network', 'ip']],
  ['File tree', ['files', 'file-tree']],
  ['Text count', ['text', 'count']],
  ['Color palette', ['color', 'palette']],
  ['Decode JWT', ['jwt', 'decode']]
];

function splitArguments(value) {
  const parts = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(value)) !== null) parts.push(match[1] ?? match[2] ?? match[3]);
  return parts;
}

async function runMenu() {
  const readline = await import('node:readline/promises');
  const { stdin, stdout } = await import('node:process');
  const terminal = readline.createInterface({ input: stdin, output: stdout });
  try {
    stdout.write('\n  devkit — choose a utility\n\n');
    menuItems.forEach(([label], index) => stdout.write(`  ${String(index + 1).padStart(2, ' ')}. ${label}\n`));
    stdout.write('  0. Help\n\n');
    const choice = Number((await terminal.question('  Select: ')).trim());
    if (!Number.isInteger(choice) || choice < 0 || choice > menuItems.length) throw new Error('Invalid menu choice.');
    if (choice === 0) {
      program.outputHelp();
      return;
    }
    const [label, commandParts] = menuItems[choice - 1];
    const input = await terminal.question(`  ${label} arguments (blank for none): `);
    await program.parseAsync([process.argv[0], process.argv[1], ...commandParts, ...splitArguments(input)]);
  } finally {
    terminal.close();
  }
}

async function main() {
  if (process.argv.length === 2 && process.stdin.isTTY && process.stdout.isTTY) {
    await runMenu();
    return;
  }
  if (process.argv.length === 2) {
    program.outputHelp();
    return;
  }
  await program.parseAsync(process.argv);
}

main().catch(async (cause) => {
  try {
    await initOutput(program.opts());
    error(cause instanceof Error ? cause.message : String(cause));
  } catch {
    process.stderr.write(`Error: ${cause instanceof Error ? cause.message : String(cause)}\n`);
  }
  process.exitCode = 1;
});
