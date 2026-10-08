import { hexToRgb, parseRgb, rgbToHex } from '../utils/helpers.js';
import { print, printJson, getChalk, renderTable } from '../utils/output.js';

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b);
  let h = 0; let s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslToRgb([h, s, l]) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

function paletteFor(hex, type) {
  const rgb = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(rgb);
  let colors;
  if (type === 'complementary') colors = [h - 30, h, h + 180, h + 210];
  else if (type === 'analogous') colors = [h - 30, h - 15, h, h + 15, h + 30];
  else if (type === 'triadic') colors = [h, h + 120, h + 240];
  else if (type === 'monochromatic') colors = [15, 30, 45, 60, 75].map((lightness) => [h, Math.max(10, s), lightness]);
  else throw new Error('Palette type must be complementary, analogous, triadic, or monochromatic.');
  return (type === 'monochromatic' ? colors : colors.map((hue) => [((hue % 360) + 360) % 360, s, l])).map((hsl) => ({ hex: rgbToHex(hslToRgb(hsl)), rgb: hslToRgb(hsl) }));
}

export function registerColorCommands(program) {
  const color = program.command('color').description('Convert colors and generate palettes.');
  color.command('hex-to-rgb <hex>').description('Convert HEX to RGB').action(async (hex) => {
    const rgb = hexToRgb(hex);
    printJson({ hex: rgbToHex(rgb), rgb: `rgb(${rgb.join(', ')})`, channels: { r: rgb[0], g: rgb[1], b: rgb[2] } });
  });
  color.command('rgb-to-hex <rgb...>').description('Convert RGB channels to HEX, e.g. 12 34 56').action(async (channels) => print(rgbToHex(channels.length === 1 ? channels[0] : channels)));
  color.command('palette <hex>').description('Generate a color palette').option('-t, --type <type>', 'Palette type', 'analogous').option('--json', 'Return JSON data').action(async (hex, options, command) => {
    const items = paletteFor(hex, options.type);
    if (options.json || command.optsWithGlobals().json) {
      printJson({ source: rgbToHex(hexToRgb(hex)), type: options.type, colors: items });
      return;
    }
    const out = getChalk();
    const rows = items.map((item) => [out.hex(item.hex)('██'), item.hex, `rgb(${item.rgb.join(', ')})`]);
    print(await renderTable(['Color', 'HEX', 'RGB'], rows));
  });
}
