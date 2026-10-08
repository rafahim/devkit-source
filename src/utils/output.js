import { loadConfig } from './helpers.js';

let chalk;
let runtimeConfig = { color: true, output: 'text', timezone: 'UTC' };
let runtimeOptions = {};

export async function initOutput(options = {}) {
  runtimeOptions = options || {};
  runtimeConfig = await loadConfig(options.config);
  const module = await import('chalk');
  const Chalk = module.Chalk;
  const base = module.default;
  const supportsColor = module.supportsColor || base.supportsColor;
  const enabled = Boolean(process.stdout.isTTY && options.color !== false && runtimeConfig.color !== false && process.env.NO_COLOR === undefined);
  const level = enabled ? Math.max(1, supportsColor?.stdout?.level || 1) : 0;
  if (Chalk) chalk = new Chalk({ level });
  else { chalk = base; chalk.level = level; }
}

export function getChalk() {
  return chalk || { red: (value) => String(value), green: (value) => String(value), yellow: (value) => String(value), cyan: (value) => String(value), gray: (value) => String(value), bold: (value) => String(value), dim: (value) => String(value) };
}

export function getRuntimeConfig() {
  return { ...runtimeConfig };
}

export function getRuntimeOptions() {
  return { ...runtimeOptions };
}

export function print(value, options = {}) {
  const jsonMode = options.json ?? runtimeOptions.json ?? runtimeConfig.output === 'json';
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  process.stdout.write(`${text.endsWith('\n') ? text : `${text}\n`}`);
}

export function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function error(message) {
  const out = getChalk();
  process.stderr.write(`${out.red('Error:')} ${String(message)}\n`);
}

export function success(message) {
  print(getChalk().green(String(message)));
}

export async function renderTable(headers, rows) {
  const Table = (await import('cli-table3')).default;
  const out = getChalk();
  const table = new Table({ head: headers.map((item) => out.cyan(String(item))), style: { head: [], border: [], compact: true } });
  for (const row of rows) table.push(row.map((cell) => cell === null || cell === undefined ? '' : String(cell)));
  return table.toString();
}

export async function withSpinner(message, task) {
  if (!process.stdout.isTTY || runtimeOptions.quiet) return task();
  const ora = (await import('ora')).default;
  const spinner = ora({ text: String(message), isEnabled: true }).start();
  try {
    const result = await task();
    spinner.succeed(String(message));
    return result;
  } catch (cause) {
    spinner.fail(String(message));
    throw cause;
  }
}
