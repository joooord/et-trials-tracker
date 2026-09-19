'use strict';

// Development tool. Not part of the build, and not run on Vercel.
//
// Renders the committed SVG sources in static/ to the raster files that ship
// beside them, so the type in the images is the same system sans the site uses.
// The build copies static/ into dist/ as it stands; it never runs this.
//
// Needs a Chromium through Playwright, which is not a dependency of this
// project. Install one ad hoc, then run:
//
//   npx --yes playwright install chromium
//   NODE_PATH=$(npm root -g) node tools/render-images.js
//
// The icon file is assembled here as well, as a container around the 16 and 32
// pixel PNGs, so no image library is needed.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const STATIC = path.join(__dirname, '..', 'static');

const TARGETS = [
  { source: 'og.svg', file: 'og.png', width: 1200, height: 630 },
  { source: 'favicon.svg', file: 'favicon-16.png', width: 16, height: 16 },
  { source: 'favicon.svg', file: 'favicon-32.png', width: 32, height: 32 },
  { source: 'favicon.svg', file: 'apple-touch-icon.png', width: 180, height: 180 },
  { source: 'favicon.svg', file: 'icon-192.png', width: 192, height: 192 },
  { source: 'favicon.svg', file: 'icon-512.png', width: 512, height: 512 },
];

// A page that holds one SVG at exactly the size asked for, and nothing else.
function html(svg, width, height) {
  return `<!doctype html><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  svg { display: block; width: ${width}px; height: ${height}px; }
</style>
${svg}`;
}

function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);

  const directory = Buffer.alloc(16 * pngs.length);
  let offset = header.length + directory.length;
  pngs.forEach((png, i) => {
    const at = i * 16;
    directory.writeUInt8(png.size === 256 ? 0 : png.size, at);
    directory.writeUInt8(png.size === 256 ? 0 : png.size, at + 1);
    directory.writeUInt8(0, at + 2);
    directory.writeUInt8(0, at + 3);
    directory.writeUInt16LE(1, at + 4);
    directory.writeUInt16LE(32, at + 6);
    directory.writeUInt32LE(png.data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += png.data.length;
  });

  return Buffer.concat([header, directory].concat(pngs.map((p) => p.data)));
}

(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const page = await browser.newPage();

  for (const target of TARGETS) {
    const svg = fs.readFileSync(path.join(STATIC, target.source), 'utf8');
    await page.setViewportSize({ width: target.width, height: target.height });
    await page.setContent(html(svg, target.width, target.height));
    await page.screenshot({
      path: path.join(STATIC, target.file),
      clip: { x: 0, y: 0, width: target.width, height: target.height },
      omitBackground: false,
    });
    console.log(`static/${target.file}  ${target.width}x${target.height}`);
  }

  await browser.close();

  const sizes = [16, 32];
  fs.writeFileSync(path.join(STATIC, 'favicon.ico'), ico(sizes.map((size) => ({
    size,
    data: fs.readFileSync(path.join(STATIC, `favicon-${size}.png`)),
  }))));
  console.log('static/favicon.ico  ' + sizes.join(' and ') + ' pixel copies');
})();
