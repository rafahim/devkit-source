import { parseInteger } from '../utils/helpers.js';
import { print, printJson } from '../utils/output.js';

function parseDate(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${label} date: ${value}`);
  return date;
}

export function registerTimeCommands(program) {
  const time = program.command('time').description('Inspect timestamps, date differences, and cron schedules.');
  time.command('now').description('Print the current date and time').option('--unix', 'Print Unix seconds').option('--ms', 'Print Unix milliseconds').action(async (options) => {
    const now = new Date();
    if (options.ms) print(now.getTime());
    else if (options.unix) print(Math.floor(now.getTime() / 1000));
    else print(now.toISOString());
  });
  time.command('timestamp [date]').description('Convert a date to Unix timestamp seconds').option('--ms', 'Return milliseconds').action(async (value, options) => {
    const date = value ? parseDate(value, 'input') : new Date();
    print(options.ms ? date.getTime() : Math.floor(date.getTime() / 1000));
  });
  time.command('date-diff <start> <end>').description('Calculate elapsed time between two dates').action(async (startValue, endValue) => {
    const start = parseDate(startValue, 'start');
    const end = parseDate(endValue, 'end');
    const milliseconds = end.getTime() - start.getTime();
    let remaining = Math.abs(milliseconds);
    const days = Math.floor(remaining / 86_400_000); remaining %= 86_400_000;
    const hours = Math.floor(remaining / 3_600_000); remaining %= 3_600_000;
    const minutes = Math.floor(remaining / 60_000); remaining %= 60_000;
    const seconds = Math.floor(remaining / 1000);
    printJson({ start: start.toISOString(), end: end.toISOString(), milliseconds, seconds: milliseconds / 1000, minutes: milliseconds / 60_000, hours: milliseconds / 3_600_000, days: milliseconds / 86_400_000, absolute: { days, hours, minutes, seconds }, direction: milliseconds < 0 ? 'backward' : milliseconds > 0 ? 'forward' : 'same' });
  });
  time.command('cron <expression>').description('Validate a cron expression and show the next run times').option('-n, --count <count>', 'Number of run times from 1 to 20', '5').option('-t, --timezone <timezone>', 'IANA timezone').action(async (expression, options) => {
    const count = parseInteger(options.count, 'Count', 1, 20);
    const { Cron } = await import('croner');
    let job;
    try {
      job = new Cron(expression, options.timezone ? { timezone: options.timezone, paused: true } : { paused: true });
      const runs = job.nextRuns(count).map((date) => date.toISOString());
      if (!runs.length) throw new Error('No future runs could be calculated.');
      printJson({ expression, timezone: options.timezone || 'local', nextRuns: runs });
    } catch (cause) {
      throw new Error(`Invalid cron expression: ${cause.message}`);
    } finally {
      job?.stop();
    }
  });
}
