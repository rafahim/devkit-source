# devkit
> CLI toolkit for developers — 50+ utilities in one command.
By [RA Fahim](https://rafahim.com) · [github.com/rafahim](https://github.com/rafahim) · [@rafahimn](https://twitter.com/rafahimn)
Install: `npm i -g devkit-cli`

[![Made in Bangladesh](https://img.shields.io/badge/Made%20in-Bangladesh-006a4e?labelColor=f42a41)](https://rafahim.com)

## Install

```bash
npm i -g devkit-cli
```

Node.js 18 or later is required. Use `npx devkit-cli` to run without a global install, or run `node bin/devkit.js` in a checkout.

## Quick start

```bash
devkit
printf '{"name":"devkit","enabled":true}' | devkit json format
devkit json validate package.json
devkit b64e "hello world"
devkit hash sha256 "hello world"
devkit id uuid v7
devkit color hex-to-rgb '#1f6feb'
```

When run without arguments in a terminal, devkit opens an interactive menu. Most input commands accept a positional value, a file path, or `-` for stdin. When stdin is piped, prompts and spinners are disabled and color output is automatically disabled.

## Demo

![devkit CLI demo](docs/demo.gif)

Replace `docs/demo.gif` with a terminal recording of your own before publishing the package page.

## Commands

### JSON

| Command | Purpose | Example |
| --- | --- | --- |
| `json format [input]` | Pretty-print JSON | `devkit json format data.json` |
| `json minify [input]` | Compact JSON | `cat data.json | devkit json minify` |
| `json validate [input]` | Validate JSON | `devkit json validate package.json` |
| `json query <path> [input]` | Read a dotted path or array index | `devkit json query user.email data.json` |
| `json diff <file-a> <file-b>` | Compare JSON paths | `devkit json diff old.json new.json` |

### Encoding and JWT

| Command | Purpose | Example |
| --- | --- | --- |
| `base64 encode [input]` | Encode Base64 | `devkit b64e "hello"` |
| `base64 decode [input]` | Decode Base64 | `devkit b64d aGVsbG8=` |
| `url encode [input]` | Percent-encode URL component | `devkit url encode "hello world"` |
| `url decode [input]` | Decode URL component | `devkit url decode hello%20world` |
| `jwt encode [payload] --secret <secret>` | Sign JSON with HS256 | `devkit jwt encode '{"sub":"123"}' --secret "$JWT_SECRET"` |
| `jwt decode [token] [--secret <secret>]` | Decode and optionally verify | `devkit jwt decode "$TOKEN" --secret "$JWT_SECRET"` |

`b64e` and `b64d` are top-level shortcuts. JWT decoding without a secret only decodes the header and payload; it does not authenticate the signature. Do not use that mode to trust token claims.

### Hashing

| Command | Purpose | Example |
| --- | --- | --- |
| `hash md5 [input]` | MD5 digest | `devkit hash md5 file.txt` |
| `hash sha1 [input]` | SHA-1 digest | `devkit hash sha1 "hello"` |
| `hash sha256 [input]` | SHA-256 digest | `devkit hash sha256 - < input.txt` |
| `hash sha512 [input]` | SHA-512 digest | `devkit hash sha512 "hello"` |
| `hash bcrypt [input] [--rounds <n>]` | Password hash | `devkit hash bcrypt "secret" --rounds 12` |
| `hash check <value> <digest> [algorithm]` | Compare value to digest | `devkit hash check hello <digest> sha256` |

MD5 and SHA-1 are included for compatibility, not for password storage or new security designs. Use bcrypt for password hashing.

### IDs and slugs

| Command | Purpose | Example |
| --- | --- | --- |
| `id uuid [v4|v7]` | UUID generation | `devkit id uuid v7` |
| `id nanoid [length]` | URL-safe random ID | `devkit id nanoid 16` |
| `id slug [input]` | URL slug | `devkit id slug "Hello, Dhaka!"` |
| `id random-string [length]` | Random string | `devkit id random-string 32` |
| `id pin [digits]` | Numeric PIN with leading zeroes | `devkit id pin 6` |

### Time

| Command | Purpose | Example |
| --- | --- | --- |
| `time now [--unix|--ms]` | Current timestamp | `devkit time now --unix` |
| `time timestamp [date] [--ms]` | Convert date to Unix time | `devkit time timestamp 2025-01-01` |
| `time date-diff <start> <end>` | Calculate elapsed time | `devkit time date-diff 2025-01-01 2025-02-01` |
| `time cron <expression> [-n count] [-t timezone]` | Validate cron and list runs | `devkit time cron "0 9 * * 1-5" -n 5` |

### Network

| Command | Purpose | Example |
| --- | --- | --- |
| `network ip [--local]` | Public IP or local interfaces | `devkit network ip --local` |
| `network port-check <host> <port>` | Test TCP connectivity | `devkit network port-check example.com 443` |
| `network dns <host> [-t type]` | Resolve records | `devkit network dns example.com -t MX` |
| `network http <url>` | Make an HTTP request | `devkit network http https://example.com` |

The public-IP command contacts `api.ipify.org`. DNS, port, and HTTP commands perform the network requests implied by their names. Avoid sending secrets in URLs or command-line arguments when shell history or process listings may expose them.

### Files

| Command | Purpose | Example |
| --- | --- | --- |
| `files file-size <path>` | File metadata and size | `devkit files file-size package.json` |
| `files file-tree [path]` | Sorted tree | `devkit files file-tree . --max-depth 3` |
| `files duplicate-files <path>` | SHA-256 duplicate groups | `devkit files duplicate-files ~/Downloads` |
| `files zip <archive.zip> <paths...>` | Create ZIP archive | `devkit files zip backup.zip src README.md` |
| `files unzip <archive.zip> [destination]` | Extract ZIP safely | `devkit files unzip backup.zip ./restore` |

The tree and duplicate scan skip `.git`, `node_modules`, `.next`, and `dist` directories by default. Use `file-tree --all` to include hidden entries.

### Text

| Command | Purpose | Example |
| --- | --- | --- |
| `text case <mode> [input]` | Change case | `devkit text case camel "Hello world"` |
| `text count [input]` | Count characters, bytes, words, lines, and sentences | `devkit text count README.md` |
| `text replace <search> <replacement> [input]` | Replace text | `devkit text replace old new file.txt` |

Case modes: `upper`, `lower`, `title`, `kebab`, `snake`, `camel`, and `pascal`. Add `--regex` to use a regular expression with `text replace`; default replacement treats the search term literally.

### Color

| Command | Purpose | Example |
| --- | --- | --- |
| `color hex-to-rgb <hex>` | Convert HEX to RGB | `devkit color hex-to-rgb '#1f6feb'` |
| `color rgb-to-hex <rgb...>` | Convert RGB to HEX | `devkit color rgb-to-hex 31 111 235` |
| `color palette <hex> [--type <type>]` | Generate palette | `devkit color palette '#1f6feb' --type analogous` |

Palette types: `analogous`, `complementary`, `triadic`, `monochromatic`.

## Piping and output

```bash
cat input.json | devkit json format
printf 'hello' | devkit hash sha256
printf 'hello world' | devkit base64 encode
devkit json query version package.json --json
```

Use `--json` to request JSON output, `--no-color` to disable styling, `--quiet` to suppress progress indicators, and `--config <path>` to use a custom configuration file. Text output is the default. Color is disabled when stdout is not a terminal and when `NO_COLOR` is set.

## Configuration

Settings are loaded from `~/.devkitrc.json` (on Windows, the current user's home directory is used). A custom path can be specified with `--config`. Example:

```json
{
  "color": true,
  "output": "text",
  "timezone": "UTC",
  "jwtSecret": ""
}
```

```bash
devkit config path
devkit config show
devkit config set output json
devkit config set color true
devkit config init
```

Keep signing secrets out of source control. `DEVKIT_JWT_SECRET` is also supported for JWT commands.

## Shell completions

Bash:

```bash
echo 'source "$(npm root -g)/devkit-cli/completions/devkit.bash"' >> ~/.bashrc
```

Zsh:

```bash
mkdir -p ~/.zsh/completions
cp "$(npm root -g)/devkit-cli/completions/devkit.zsh" ~/.zsh/completions/_devkit
```

Fish:

```fish
mkdir -p ~/.config/fish/completions
cp (npm root -g)/devkit-cli/completions/devkit.fish ~/.config/fish/completions/devkit.fish
```

You can also print a completion script using `devkit completion bash`, `devkit completion zsh`, or `devkit completion fish`.

## Development

```bash
npm install
npm test
node bin/devkit.js --help
```

The project uses native ESM and Node.js built-ins where practical. ZIP operations use `archiver` and `extract-zip`; bcrypt hashing uses `bcryptjs`; cron parsing uses `croner`.

## Author

**RA Fahim** — Web Developer & Creator, full-stack, 1 year. Based in Dhaka, Bangladesh.

- Website: [rafahim.com](https://rafahim.com)
- GitHub: [github.com/rafahim](https://github.com/rafahim)
- Email: [dev@rafahim.com](mailto:dev@rafahim.com)
- X: [@rafahimn](https://twitter.com/rafahimn)
- LinkedIn: [linkedin.com/in/rafahimn](https://linkedin.com/in/rafahimn)

## SEO checklist

- [x] Clear package name, description, author, homepage, repository, and issue tracker
- [x] Keywords for JSON formatting, Base64, UUIDs, developer tools, and CLI usage
- [x] npm install and command examples near the top
- [x] README sections for each command family
- [x] MIT license and security contact
- [ ] Replace the demo GIF placeholder with a recorded terminal session
- [ ] Verify package availability and reserve `devkit-cli` on npm before publishing
- [ ] Run `npm pack --dry-run` and review the published file list

## Security

Report vulnerabilities privately using the contact in [`.well-known/security.txt`](.well-known/security.txt). Do not include credentials or personal data in public issues.
