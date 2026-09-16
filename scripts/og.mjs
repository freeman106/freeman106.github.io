/**
 * OG 이미지 생성 (satori + resvg). prebuild 로 실행된다.
 *   public/og/default.png, public/og/<slug>.png (1200×630)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'og');
mkdirSync(OUT, { recursive: true });

const NAME = '김환욱';
const NAME_EN = 'Hwan Uk Kim';
const POSITIONING = 'AI를 실제 작업 흐름에 연결하는 엔지니어.';

function findFont(candidates) {
  for (const c of candidates) if (existsSync(c)) return readFileSync(c);
  throw new Error(`font not found: ${candidates[0]}`);
}
const pretendardDir = path.join(ROOT, 'node_modules/pretendard/dist/public/static');
const fontRegular = findFont([path.join(pretendardDir, 'Pretendard-Regular.otf'), path.join(pretendardDir, 'Pretendard-Regular.ttf')]);
const fontSemi = findFont([path.join(pretendardDir, 'Pretendard-SemiBold.otf'), path.join(pretendardDir, 'Pretendard-SemiBold.ttf')]);
const monoDir = path.join(ROOT, 'node_modules/@fontsource-variable/jetbrains-mono/files');
const monoFile = readdirSync(monoDir).find((f) => /latin-wght-normal\.(ttf|otf|woff)$/.test(f)) ?? readdirSync(monoDir).find((f) => /wght-normal\.woff$/.test(f));
const fontMono = monoFile ? readFileSync(path.join(monoDir, monoFile)) : null;

/** frontmatter 에서 필요한 값만 뽑는다 (의존성 없이). */
function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = m[1];
  const get = (k) => {
    const r = fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'));
    return r ? r[1].trim().replace(/^['"]|['"]$/g, '') : '';
  };
  return { slug: get('slug'), title: get('title'), oneLiner: get('oneLiner'), pub: get('public') === 'true' };
}

const h = (type, props, ...children) => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } });

function card({ eyebrow, title, sub }) {
  return h('div', { style: { width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: '#fafafa', color: '#111', fontFamily: 'Pretendard' } },
    h('div', { style: { display: 'flex', flexDirection: 'column' } },
      h('div', { style: { display: 'flex', fontFamily: fontMono ? 'JetBrains Mono' : 'Pretendard', fontSize: '22px', color: '#888', letterSpacing: '0.02em' } }, eyebrow),
      h('div', { style: { display: 'flex', marginTop: '28px', fontSize: title.length > 24 ? '56px' : '64px', fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.01em', maxWidth: '1000px' } }, title),
      h('div', { style: { display: 'flex', marginTop: '24px', fontSize: '28px', color: '#444', lineHeight: 1.5, maxWidth: '1000px' } }, sub || ''),
    ),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e0e0e0', paddingTop: '24px', fontSize: '24px', color: '#444' } },
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'baseline' } }, h('span', { style: { fontWeight: 600, color: '#111' } }, NAME), h('span', { style: { color: '#888', fontFamily: fontMono ? 'JetBrains Mono' : 'Pretendard', fontSize: '20px' } }, NAME_EN)),
      h('div', { style: { display: 'flex', color: '#888', fontFamily: fontMono ? 'JetBrains Mono' : 'Pretendard', fontSize: '20px' } }, 'AI Agent · MLOps · Data · Backend'),
    ),
  );
}

const fonts = [
  { name: 'Pretendard', data: fontRegular, weight: 400, style: 'normal' },
  { name: 'Pretendard', data: fontSemi, weight: 600, style: 'normal' },
  ...(fontMono ? [{ name: 'JetBrains Mono', data: fontMono, weight: 400, style: 'normal' }] : []),
];

async function renderPng(node, file) {
  const svg = await satori(node, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  writeFileSync(file, png);
}

await renderPng(card({ eyebrow: 'portfolio', title: POSITIONING, sub: '' }), path.join(OUT, 'default.png'));
let n = 1;
const dir = path.join(ROOT, 'src/content/projects');
for (const f of readdirSync(dir).filter((f) => /\.mdx?$/.test(f) && !f.includes('.private.'))) {
  const p = parse(readFileSync(path.join(dir, f), 'utf-8'));
  if (!p || !p.pub || !p.slug) continue;
  await renderPng(card({ eyebrow: 'project', title: p.title, sub: p.oneLiner }), path.join(OUT, `${p.slug}.png`));
  n++;
}
console.log(`og: ${n} images → public/og/`);
