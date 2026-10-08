import { lookup, resolve as resolveDns } from 'node:dns/promises';
import { networkInterfaces } from 'node:os';
import { createConnection } from 'node:net';
import { print, printJson, withSpinner } from '../utils/output.js';

async function checkPort(host, port, timeoutMs) {
  return new Promise((resolvePromise) => {
    const socket = createConnection({ host, port });
    let settled = false;
    let timer;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolvePromise(result);
    };
    timer = setTimeout(() => finish({ host, port, open: false, reason: 'timeout' }), timeoutMs);
    socket.setTimeout(timeoutMs, () => finish({ host, port, open: false, reason: 'timeout' }));
    socket.once('connect', () => finish({ host, port, open: true, reason: 'connected' }));
    socket.once('error', (cause) => finish({ host, port, open: false, reason: cause.code || cause.message }));
  });
}

export function registerNetworkCommands(program) {
  const network = program.command('network').alias('net').description('Inspect IP addresses, ports, DNS records, and HTTP endpoints.');
  network.command('ip').description('Show public IP or local interface addresses').option('--local', 'Show local interface addresses').action(async (options) => {
    if (options.local) {
      const rows = [];
      for (const [name, items] of Object.entries(networkInterfaces())) {
        for (const item of items || []) if (!item.internal) rows.push({ interface: name, family: item.family, address: item.address, mac: item.mac, cidr: item.cidr });
      }
      printJson(rows);
      return;
    }
    const value = await withSpinner('Looking up public IP', async () => {
      const response = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw new Error(`IP lookup returned HTTP ${response.status}`);
      return response.json();
    });
    print(value.ip);
  });
  network.command('port-check <host> <port>').description('Check whether a TCP port accepts connections').option('-t, --timeout <milliseconds>', 'Connection timeout', '3000').action(async (host, portValue, options) => {
    const port = Number(portValue);
    const timeout = Number(options.timeout);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be from 1 to 65535.');
    if (!Number.isInteger(timeout) || timeout < 100 || timeout > 60000) throw new Error('Timeout must be from 100 to 60000 milliseconds.');
    const result = await checkPort(host, port, timeout);
    printJson(result);
    if (!result.open) process.exitCode = 1;
  });
  network.command('dns <host>').description('Resolve DNS records').option('-t, --type <type>', 'Record type: lookup, A, AAAA, MX, TXT, NS, CAA, SRV, or PTR', 'lookup').action(async (host, options) => {
    const type = options.type.toUpperCase();
    let result;
    if (type === 'LOOKUP') result = await lookup(host, { all: true, verbatim: true });
    else if (['A', 'AAAA', 'ANY', 'CAA', 'CNAME', 'MX', 'NAPTR', 'NS', 'PTR', 'SOA', 'SRV', 'TXT'].includes(type)) result = await resolveDns(host, type);
    else throw new Error(`Unsupported DNS record type: ${options.type}`);
    printJson({ host, type, records: result });
  });
  network.command('http <url>').description('Make an HTTP request and print status, headers, and body').option('-X, --method <method>', 'HTTP method', 'GET').option('-H, --header <header...>', 'Headers in Name: value format').option('-d, --data <body>', 'Request body').option('-t, --timeout <milliseconds>', 'Timeout', '10000').option('--body-only', 'Print only the response body').action(async (urlInput, options) => {
    let url;
    try { url = new URL(urlInput); } catch { throw new Error('Provide a valid absolute URL.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
    const timeout = Number(options.timeout);
    if (!Number.isInteger(timeout) || timeout < 100 || timeout > 120000) throw new Error('Timeout must be from 100 to 120000 milliseconds.');
    const headers = {};
    for (const header of options.header || []) {
      const separator = header.indexOf(':');
      if (separator < 1) throw new Error(`Invalid header: ${header}`);
      headers[header.slice(0, separator).trim()] = header.slice(separator + 1).trim();
    }
    const method = String(options.method).toUpperCase();
    if (options.data !== undefined && ['GET', 'HEAD'].includes(method)) throw new Error(`${method} requests cannot include a body.`);
    const request = { method, headers, signal: AbortSignal.timeout(timeout), redirect: 'follow' };
    if (options.data !== undefined) request.body = options.data;
    const response = await withSpinner(`${method} ${url.href}`, () => fetch(url, request));
    const body = await response.text();
    if (options.bodyOnly) {
      print(body);
      return;
    }
    printJson({ url: response.url, status: response.status, statusText: response.statusText, ok: response.ok, headers: Object.fromEntries(response.headers.entries()), body });
    if (!response.ok) process.exitCode = 1;
  });
}
