/**
 * 다이어그램 SVG 를 PNG 로 렌더한다 (검토용). 원본은 SVG 다.
 *
 *   node scripts/diagrams/render.mjs
 */
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../../src/assets/diagrams');
const OUT = path.join(HERE, 'out');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });

for (const name of readdirSync(SRC).filter((f) => f.endsWith('.svg'))) {
  const svg = readFileSync(path.join(SRC, name), 'utf-8');
  const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  await page.setViewportSize({ width: Number(w) + 32, height: Number(h) + 32 });
  await page.setContent(
    `<!doctype html><html><head><style>body{margin:16px;background:#fafafa}</style></head><body>${svg}</body></html>`,
  );
  const file = path.join(OUT, name.replace(/\.svg$/, '.png'));
  await page.screenshot({ path: file, fullPage: true });
  console.log(`rendered ${path.relative(process.cwd(), file)}`);
}

await browser.close();
