import { createHmac, timingSafeEqual } from 'node:crypto';
import { parseJson, readTextInput } from '../utils/helpers.js';
import { getRuntimeConfig, print, printJson } from '../utils/output.js';

export function encodeBase64(value) {
  return Buffer.from(String(value), 'utf8').toString('base64');
}

export function decodeBase64(value) {
  const text = String(value).trim();
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text) || text.length % 4 === 1) throw new Error('Invalid Base64 input.');
  return Buffer.from(text, 'base64').toString('utf8');
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function safeEqualText(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function getSecret(options) {
  const secret = options.secret || process.env.DEVKIT_JWT_SECRET || getRuntimeConfig().jwtSecret;
  if (!secret) throw new Error('JWT signing needs --secret or DEVKIT_JWT_SECRET.');
  return String(secret);
}

export function registerEncodingCommands(program) {
  const base64 = program.command('base64').alias('b64').description('Encode and decode Base64 text.');
  base64.command('encode [input]').description('Encode UTF-8 text').action(async (input) => print(encodeBase64(await readTextInput(input))));
  base64.command('decode [input]').description('Decode Base64 into UTF-8 text').action(async (input) => print(decodeBase64(await readTextInput(input))));

  const url = program.command('url').description('Encode and decode URL components.');
  url.command('encode [input]').description('Percent-encode text').action(async (input) => print(encodeURIComponent(await readTextInput(input))));
  url.command('decode [input]').description('Decode percent-encoded text').action(async (input) => {
    try { print(decodeURIComponent(await readTextInput(input))); } catch (cause) { throw new Error(`Cannot URL-decode input: ${cause.message}`); }
  });

  const jwt = program.command('jwt').description('Create or inspect JSON Web Tokens.');
  jwt.command('encode [payload]')
    .description('Sign a JSON payload with HS256')
    .option('-s, --secret <secret>', 'Signing secret; otherwise use DEVKIT_JWT_SECRET or config')
    .action(async (payloadInput, options) => {
      const raw = await readTextInput(payloadInput);
      const payload = parseJson(raw, 'JWT payload');
      if (payload === null || typeof payload !== 'object') throw new Error('JWT payload must be a JSON object or array.');
      const header = { alg: 'HS256', typ: 'JWT' };
      const unsigned = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}`;
      const signature = createHmac('sha256', getSecret(options)).update(unsigned).digest('base64url');
      print(`${unsigned}.${signature}`);
    });
  jwt.command('decode [token]')
    .description('Decode a JWT and optionally verify its HS256 signature')
    .option('-s, --secret <secret>', 'Secret for signature verification')
    .action(async (tokenInput, options) => {
      const token = (await readTextInput(tokenInput)).trim();
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('JWT must have three dot-separated sections.');
      let header;
      let payload;
      try {
        header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      } catch (cause) {
        throw new Error(`Invalid JWT content: ${cause.message}`);
      }
      let verified = false;
      let verification = 'not-verified';
      const secret = options.secret || process.env.DEVKIT_JWT_SECRET || getRuntimeConfig().jwtSecret;
      if (secret) {
        if (header.alg !== 'HS256') throw new Error(`Cannot verify algorithm ${header.alg}; only HS256 is supported.`);
        const expected = createHmac('sha256', String(secret)).update(`${parts[0]}.${parts[1]}`).digest('base64url');
        verified = safeEqualText(expected, parts[2]);
        if (!verified) throw new Error('JWT signature verification failed.');
        verification = 'verified';
      }
      printJson({ verified, verification, header, payload, signaturePresent: Boolean(parts[2]) });
    });
}
