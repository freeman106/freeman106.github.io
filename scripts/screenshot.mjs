/**
 * 빌드 결과를 preview 서버로 띄우고 페이지를 스크린샷한다 (검토용).
 *
 *   node scripts/screenshot.mjs [path ...]        기본: /
 *   옵션: --mobile-only · --desktop-only · --light-only · --dark-only · --full
 *
 * 결과: scripts/shots/<path>__<viewport>__<theme>.png
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'shots');
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const paths = args.filter((a) => !a.startsWith('--'));
if (paths.length === 0) paths.push('/');

const PORT = 4321;
// PREVIEW_URL 이 있으면 이미 떠 있는 서버를 쓴다.
const BASE = process.env.PREVIEW_URL || `http://127.0.0.1:${PORT}`;
const server = process.env.PREVIEW_URL
  ? null
  : spawn('npx', ['astro', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });

async function waitFor(url, tries = 120) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview 서버가 뜨지 않았습니다');
}

try {
  await waitFor(`${BASE}/`);
  const browser = await chromium.launch();
  const viewports = [
    ...(flags.has('--desktop-only') ? [] : [{ name: 'mobile', width: 390, height: 844, scale: 2 }]),
    ...(flags.has('--mobile-only') ? [] : [{ name: 'desktop', width: 1280, height: 900, scale: 1 }]),
  ];
  const themes = [
    ...(flags.has('--dark-only') ? [] : ['light']),
    ...(flags.has('--light-only') ? [] : ['dark']),
  ];
  for (const vp of viewports) {
    for (const theme of themes) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.scale,
        colorScheme: theme,
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      for (const p of paths) {
        await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle' });
        const slug = p === '/' ? 'home' : p.replace(/^\//, '').replace(/[\/?=&]+/g, '_');
        const file = path.join(OUT, `${slug}__${vp.name}__${theme}.png`);
        await page.screenshot({ path: file, fullPage: flags.has('--full') || vp.name === 'desktop' });
        console.log(`shot ${path.relative(ROOT, file)}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
} finally {
  server?.kill();
}
