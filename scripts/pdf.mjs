/**
 * 제출용 포트폴리오 PDF 생성.
 *
 *   npm run pdf:skt            → exports/김환욱_포트폴리오_SKT.pdf
 *   node scripts/pdf.mjs skt   (동일)
 *
 * 로컬 빌드 결과(dist/)를 정적으로 띄운 뒤 Playwright(Chromium) 로 /pdf/<name> 을
 * A4 · 라이트 모드로 렌더한다. 1차 렌더에서 각 프로젝트가 몇 쪽에 있는지 읽어 목차에
 * 쪽수를 채우고 2차 렌더로 저장한다. 쪽 번호는 하단 중앙.
 */
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT_DIR = path.join(ROOT, 'exports');
const SITE = 'https://freeman106.github.io';

const TARGETS = {
  skt: {
    route: '/pdf/skt',
    file: '김환욱_포트폴리오_SKT.pdf',
    toc: ['image-eval', 'agent24', 'debate', 'gsm8k-dpo', 'hans', 'cloud-cicd', 'rl-timing', 'review-gen', 'recsys'],
    maxPages: 25,
  },
};

const name = process.argv[2] ?? 'skt';
const target = TARGETS[name];
if (!target) {
  console.error(`알 수 없는 대상: ${name}. 가능한 값: ${Object.keys(TARGETS).join(', ')}`);
  process.exit(1);
}

// ── dist 준비 ────────────────────────────────────────────────
const routeFile = path.join(DIST, `${target.route.replace(/^\//, '')}.html`);
if (!existsSync(routeFile) || process.argv.includes('--build')) {
  console.log('dist 가 없거나 --build 지정: npm run build 실행');
  const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// ── 정적 서버 (dist/) ────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.pdf': 'application/pdf',
  '.xml': 'application/xml', '.ico': 'image/x-icon',
};
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  let abs = path.join(DIST, rel);
  if (!abs.startsWith(DIST)) { res.statusCode = 403; return res.end(); }
  if (existsSync(abs) && statSync(abs).isDirectory()) abs = path.join(abs, 'index.html');
  if (!existsSync(abs) && existsSync(`${abs}.html`)) abs = `${abs}.html`;
  if (!existsSync(abs)) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('Content-Type', MIME[path.extname(abs).toLowerCase()] ?? 'application/octet-stream');
  createReadStream(abs).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// ── 렌더 ─────────────────────────────────────────────────────
const PDF_OPTS = {
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: false,
  margin: { top: '15mm', right: '15mm', bottom: '17mm', left: '15mm' },
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;text-align:center;font-size:8px;color:#777;font-family:Helvetica,Arial,sans-serif;"><span class="pageNumber"></span></div>',
};

async function pageTexts(buffer) {
  const doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const texts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    texts.push(content.items.map((it) => it.str ?? '').join(''));
  }
  return { numPages: doc.numPages, texts };
}

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 900, height: 1200 } });
  const page = await ctx.newPage();
  await page.emulateMedia({ media: 'print', colorScheme: 'light' });
  await page.goto(`${base}${target.route}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.fonts.status === 'loaded');

  // 1차: 쪽 위치 파악
  const first = await page.pdf(PDF_OPTS);
  const { texts } = await pageTexts(first);
  const pageOf = {};
  for (const slug of target.toc) {
    const needle = `/projects/${slug}`;
    const idx = texts.findIndex((t, i) => i >= 2 && t.includes(needle)); // 표지·목차 이후부터
    pageOf[slug] = idx >= 0 ? idx + 1 : null;
  }
  await page.evaluate((map) => {
    for (const [slug, n] of Object.entries(map)) {
      const el = document.querySelector(`[data-toc="${slug}"]`);
      if (el) el.textContent = n ? String(n) : '';
    }
  }, pageOf);

  // 2차: 최종 저장
  const buffer = await page.pdf(PDF_OPTS);
  mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, target.file);
  writeFileSync(out, buffer);

  const { numPages, texts: finalTexts } = await pageTexts(buffer);
  const kb = Math.round(buffer.length / 1024);
  console.log(`\n${path.relative(ROOT, out)}`);
  console.log(`쪽수 ${numPages} · 용량 ${kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'}`);
  console.log('목차:', target.toc.map((s) => `${s}=${pageOf[s] ?? '?'}`).join(' '));
  const missing = target.toc.filter((s) => !pageOf[s]);
  if (missing.length) console.warn(`경고: 쪽 위치를 찾지 못한 항목 — ${missing.join(', ')}`);
  if (numPages > target.maxPages) console.warn(`경고: ${target.maxPages}쪽을 넘었습니다 (${numPages}쪽)`);
  const blank = finalTexts.map((t, i) => (t.trim().length < 3 ? i + 1 : null)).filter(Boolean);
  if (blank.length) console.warn(`경고: 텍스트가 거의 없는 쪽 — ${blank.join(', ')}`);
  await ctx.close();
} finally {
  await browser.close();
  server.close();
}
