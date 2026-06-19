#!/usr/bin/env node
// Generates assets/og-image.jpg (1200x630) for social link previews.
//
// The brand fonts (Baloo 2, Plus Jakarta Sans) are baked into the raster at
// generate-time, so the output is a static file with no runtime font
// dependency. Re-run on demand when the headline or logo changes.
//
// Requirements: node, rsvg-convert, sips, and the brand TTFs visible to
// fontconfig. See scripts/generate-og-image.sh for the one-shot wrapper that
// downloads the fonts and sets FONTCONFIG_FILE before calling this.
//
//   node scripts/generate-og-image.mjs
//
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const W = 1200, H = 630;

// Brand tokens (sampled from index.html :root)
const olive = '#76A000', oliveDeep = '#5A7D00', ink = '#283312';
const inkSoft = '#6E7656', cream = '#FBF8EF', sand = '#F2ECDC';
const honey = '#E7A92E', line = '#E6E0CE';

// Embed the logo as a data URI so the SVG is self-contained for librsvg.
const logoPng = readFileSync('/tmp/wacao-logo.png').toString('base64');
const logo = `data:image/png;base64,${logoPng}`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="badge"><circle cx="958" cy="315" r="208"/></clipPath>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="22" flood-color="#283312" flood-opacity="0.16"/>
    </filter>
  </defs>

  <!-- page -->
  <rect width="${W}" height="${H}" fill="${cream}"/>
  <rect width="${W}" height="${H}" fill="none"/>
  <!-- warm sand band echoing the site's alternating panels -->
  <rect x="0" y="0" width="14" height="${H}" fill="${olive}"/>

  <!-- logo badge -->
  <circle cx="958" cy="315" r="212" fill="${olive}" filter="url(#soft)"/>
  <image xlink:href="${logo}" x="750" y="107" width="416" height="416" clip-path="url(#badge)"/>
  <circle cx="958" cy="315" r="208" fill="none" stroke="${cream}" stroke-width="6"/>

  <!-- eyebrow -->
  <text x="74" y="168" font-family="Baloo 2" font-weight="600" font-size="25"
        letter-spacing="3" fill="${oliveDeep}">PRIVATE · ON-DEVICE · FREE</text>

  <!-- headline -->
  <text x="72" y="262" font-family="Baloo 2" font-weight="800" font-size="74"
        fill="${ink}" letter-spacing="-0.5">A private AI for</text>
  <!-- text first, then the honey brush BELOW the baseline so it reads as an
       underline (not a highlight). Baseline is y=344; brush sits at ~352. -->
  <text x="72" y="344" font-family="Baloo 2" font-weight="800" font-size="74"
        fill="${ink}" letter-spacing="-0.5">your <tspan fill="${olive}">WhatsApp</tspan></text>
  <rect x="244" y="352" width="338" height="15" rx="7.5" fill="${honey}" opacity="0.6"/>

  <!-- subhead -->
  <text x="74" y="420" font-family="Plus Jakarta Sans" font-weight="500" font-size="27"
        fill="${inkSoft}">Summarize busy group chats and translate</text>
  <text x="74" y="458" font-family="Plus Jakarta Sans" font-weight="500" font-size="27"
        fill="${inkSoft}">conversations in real time. Nothing leaves your device.</text>

  <!-- url pill -->
  <rect x="72" y="516" width="184" height="50" rx="25" fill="none" stroke="${line}" stroke-width="2"/>
  <circle cx="100" cy="541" r="6" fill="${olive}"/>
  <text x="118" y="550" font-family="Baloo 2" font-weight="600" font-size="24" fill="${ink}">wacao.in</text>
</svg>`;

const svgPath = join(root, 'scripts', 'og-image.svg');
const pngPath = '/tmp/wacao-og.png';
const outPath = join(root, 'assets', 'og-image.jpg');

writeFileSync(svgPath, svg);
execFileSync('rsvg-convert', ['-w', String(W), '-h', String(H), svgPath, '-o', pngPath]);
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', pngPath, '--out', outPath]);
console.log('wrote', outPath);
