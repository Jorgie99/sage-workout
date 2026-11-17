// Generates the app icons and iOS splash screens from one SVG mark.
// Run with: npm run assets   (the PNGs are committed, so this is only needed
// if you change the logo or palette).

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'public');

const CREAM = '#F6F1EA';
const LINE = '#D5CBBD';
const SAGE = '#9CAF94';
const SAGE_DEEP = '#6F8466';

/** The mark on a 64-unit grid: a timer ring with a small sage sprig. */
const mark = `
  <circle cx="32" cy="32" r="24" fill="none" stroke="${LINE}" stroke-width="2.5"/>
  <path d="M32 8a24 24 0 1 1-20.8 12" fill="none" stroke="${SAGE_DEEP}" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M32 44V27" fill="none" stroke="${SAGE_DEEP}" stroke-width="2" stroke-linecap="round"/>
  <path d="M32 33c-5.5 0-8.5-3-9-8 5 0 8.5 2.5 9 8Z" fill="${SAGE}"/>
  <path d="M32 29c5.5 0 8.5-3 9-8-5 0-8.5 2.5-9 8Z" fill="${SAGE}"/>`;

/** Square icon: cream background, mark scaled to `scale` of the canvas. */
const iconSvg = (size, scale) => {
  const s = (size * scale) / 64;
  const off = (size - 64 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${CREAM}"/>
    <g transform="translate(${off} ${off}) scale(${s})">${mark}</g>
  </svg>`;
};

const splashSvg = (w, h) => {
  const size = Math.round(Math.min(w, h) * 0.26);
  const s = size / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${CREAM}"/>
    <g transform="translate(${(w - size) / 2} ${(h - size) / 2}) scale(${s})">${mark}</g>
  </svg>`;
};

const png = (svg, file) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(out, file));

await mkdir(path.join(out, 'splash'), { recursive: true });

await writeFile(
  path.join(out, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${CREAM}"/>${mark}</svg>\n`,
);

await png(iconSvg(180, 0.7), 'apple-touch-icon.png'); // iOS rounds the corners itself
await png(iconSvg(192, 0.7), 'icon-192.png');
await png(iconSvg(512, 0.7), 'icon-512.png');
await png(iconSvg(512, 0.52), 'icon-maskable-512.png'); // keeps the mark inside the safe zone

// Portrait splash sizes for current iPhones (must match the <link> tags in index.html).
const SPLASH = [
  [750, 1334], [828, 1792], [1125, 2436], [1242, 2688], [1170, 2532],
  [1284, 2778], [1179, 2556], [1290, 2796], [1206, 2622], [1320, 2868],
];
for (const [w, h] of SPLASH) await png(splashSvg(w, h), `splash/splash-${w}x${h}.png`);

console.log(`Wrote favicon, 4 icons and ${SPLASH.length} splash screens to public/`);
