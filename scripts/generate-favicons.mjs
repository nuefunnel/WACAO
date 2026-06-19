#!/usr/bin/env node
// Generates the favicon set from two committed vector sources:
//   favicon.svg      — the full WACAO square badge (true potrace vector,
//                      origin: nuefunnel brand repo). Used for large icons.
//   favicon-mark.svg — the same badge cropped to just the mask glyph, for
//                      small icons where the badge's wordmark is illegible.
//
// Output (site root, referenced from index.html <head>):
//   favicon.ico        — multi-size 16/32/48 legacy fallback
//   favicon-32.png     — crisp small PNG tab icon
//   apple-touch-icon.png (180) — iOS home screen
//   icon-192.png / icon-512.png — PWA / Android (any maskable)
//   site.webmanifest
//
// Dependency-free: rasterizes with rsvg-convert; packs the .ico with a tiny
// pure-Node encoder. Re-run after changing favicon.svg.
//
//   node scripts/generate-favicons.mjs
//
import { writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Scripts live at repo-root scripts/; assets are written into the sibling website/ dir.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'website');
// Full badge (wordmark + tagline) for large icons; the cropped mask mark for
// small icons, where the full badge's text is illegible.
const BADGE = join(root, 'favicon.svg');
const MARK = join(root, 'favicon-mark.svg');

// Brand tokens (kept in sync with index.html :root)
const OLIVE = '#76A000';
const CREAM = '#FBF8EF';

// Rasterize an SVG → PNG buffer at the given square size.
function png(size, src) {
  const out = `/tmp/wacao-fav-${size}.png`;
  execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), src, '-o', out]);
  return readFileSync(out);
}

// Pack PNG buffers into a multi-size .ico (icons embed PNG data directly).
// Adapted from the nuefunnel brand-assets generator.
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);            // reserved
  header.writeUInt16LE(1, 2);            // type: icon
  header.writeUInt16LE(pngs.length, 4); // image count

  const entries = [];
  const blobs = [];
  let offset = 6 + pngs.length * 16;
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width  (0 ⇒ 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2);    // palette
    e.writeUInt8(0, 3);    // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6);// bits per pixel
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    entries.push(e);
    blobs.push(buf);
  }
  return Buffer.concat([header, ...entries, ...blobs]);
}

// Small icons → mask mark (legible at tab size)
writeFileSync(join(root, 'favicon-32.png'), png(32, MARK));
writeFileSync(join(root, 'favicon.ico'), buildIco([
  { size: 16, buf: png(16, MARK) },
  { size: 32, buf: png(32, MARK) },
  { size: 48, buf: png(48, MARK) },
]));

// Large icons → full badge (wordmark reads at these sizes)
writeFileSync(join(root, 'apple-touch-icon.png'), png(180, BADGE));
writeFileSync(join(root, 'icon-192.png'), png(192, BADGE));
writeFileSync(join(root, 'icon-512.png'), png(512, BADGE));

// Web manifest
const manifest = {
  name: 'WACAO',
  short_name: 'WACAO',
  description: 'A private, on-device AI for WhatsApp Web — summarize and translate chats without anything leaving your browser.',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
  theme_color: OLIVE,
  background_color: CREAM,
  display: 'standalone',
  start_url: '/',
};
writeFileSync(join(root, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

console.log('✓ favicon.ico / favicon-32.png / apple-touch-icon.png');
console.log('✓ icon-192.png / icon-512.png / site.webmanifest');
