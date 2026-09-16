/**
 * 프라이버시 가드 — 빌드 산출물(dist/)에 비공개 내용이 한 글자도 없는지 검사한다.
 *
 *   node scripts/privacy-guard.mjs            # dist/ 검사 (postbuild 로 자동 실행)
 *   node scripts/privacy-guard.mjs --lint     # dist/ 없이 콘텐츠 규칙만 검사
 *
 * 검사 항목
 *   1. 콘텐츠 규칙: `public: false`(기본값 포함)인 파일은 반드시 `*.private.md(x)` 이름이어야 한다.
 *      그 이름은 .gitignore 대상이라 저장소가 공개돼도 새지 않는다.
 *   2. 비공개 지문: public 이 아닌 파일의 제목·frontmatter 문자열·본문 문장을 dist/ 전체에서 찾는다.
 *   3. 금지 토큰: 로컬 경로, 참고 자료 파일명, 경험맵 ID(EP01 등), 자소서 관련 어휘, TODO 마커.
 *
 * 의존성 없음. 실패하면 exit 1 로 빌드를 깨뜨린다.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'src', 'content');
const LINT_ONLY = process.argv.includes('--lint');

/** 어떤 공개 페이지에도 나타나면 안 되는 문자열·패턴. */
const FORBIDDEN = [
  { re: /\/Users\/[a-z0-9_-]+\//i, why: '로컬 절대 경로' },
  { re: /knowledge_vault/i, why: '개인 노트 경로' },
  { re: /Experience_Map|Evidence_Audit|Episode_Discovery|Episode_Catalog|Portfolio_Strategy|Project_Map|portfolio_inventory|reference_manifest/i, why: '참고 자료 파일명' },
  { re: /\bEP\d{2}\b/, why: '경험맵 에피소드 ID' },
  { re: /(^|[^A-Za-z0-9])E\d{2}(?![0-9A-Za-z-])/, why: '경험맵 맥락 ID' },
  { re: /\b[CQ]0\d\b/, why: '경험맵 확인 항목 ID' },
  { re: /자소서|자기소개서|지원 원고|지원서 원고/, why: '자소서 관련 어휘' },
  { re: /본인 기록|사용자 직접 확인|AI 정리문|기억 확인 후보/, why: '출처 구분 메모' },
  { re: /TODO:/, why: 'TODO 마커' },
  { re: /<!--/, why: 'HTML 주석' },
  { re: /\.private\./, why: '비공개 파일명' },
];

/** 지문을 만들 때 무시할 짧은 값. */
const MIN_FRAGMENT = 12;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: '', body: text };
  return { fm: m[1], body: m[2] };
}

function isPublic(fm) {
  const m = fm.match(/^public:\s*(true|false)\s*$/m);
  return m ? m[1] === 'true' : false;
}

/** frontmatter 의 문자열 값과 본문 문장을 지문으로 뽑는다. */
function fingerprints(fm, body) {
  const out = new Set();
  for (const line of fm.split('\n')) {
    const m = line.match(/^\s*(?:-\s*)?(?:[A-Za-z_]+:\s*)?["']?(.+?)["']?\s*$/);
    if (!m) continue;
    const v = norm(m[1]).replace(/^["']|["']$/g, '');
    if (v.length >= MIN_FRAGMENT && !/^(true|false|\d{4}-\d{2}|[\d.]+)$/.test(v)) out.add(v);
  }
  const plain = body
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/[#>*_`~\[\]()|]/g, ' ');
  for (const para of plain.split(/\n{2,}/)) {
    for (const sentence of norm(para).split(/(?<=[.!?。])\s+/)) {
      const s = norm(sentence);
      if (s.length >= MIN_FRAGMENT) out.add(s.slice(0, 80));
    }
  }
  return [...out];
}

const problems = [];

// ── 1·2. 콘텐츠 파일 검사 ─────────────────────────────────────
const contentFiles = walk(CONTENT).filter((f) => /\.(md|mdx)$/.test(f));
const privateFingerprints = [];

for (const file of contentFiles) {
  const rel = path.relative(ROOT, file);
  const { fm, body } = parseFrontmatter(readFileSync(file, 'utf-8'));
  const pub = isPublic(fm);
  const named = /\.private\.(md|mdx)$/.test(file);
  if (!pub && !named) {
    problems.push(`[규칙] ${rel}: public 이 아닌데 파일명이 *.private.md(x) 가 아닙니다. 이름을 바꾸거나 public: true 를 명시하세요.`);
  }
  if (pub && named) {
    problems.push(`[규칙] ${rel}: *.private 파일에 public: true 가 있습니다. 둘 중 하나를 고치세요.`);
  }
  if (!pub) {
    for (const fp of fingerprints(fm, body)) privateFingerprints.push({ rel, fp });
  }
}

if (LINT_ONLY) {
  report();
}

// ── 3. dist/ 검사 ─────────────────────────────────────────────
if (!existsSync(DIST)) {
  console.error(`dist/ 가 없습니다. 먼저 astro build 를 실행하세요.`);
  process.exit(1);
}

const TEXT_EXT = /\.(html|xml|json|txt|js|mjs|css|svg|webmanifest|md)$/i;
const distFiles = walk(DIST).filter((f) => TEXT_EXT.test(f));

for (const file of distFiles) {
  const rel = path.relative(ROOT, file);
  const raw = readFileSync(file, 'utf-8');
  const text = norm(
    raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&amp;/g, '&'),
  );

  for (const { re, why } of FORBIDDEN) {
    const m = raw.match(re);
    if (m) problems.push(`[금지] ${rel}: ${why} — "${m[0]}"`);
  }
  for (const { rel: src, fp } of privateFingerprints) {
    if (text.includes(fp) || raw.includes(fp)) {
      problems.push(`[유출] ${rel}: 비공개 파일 ${src} 의 내용 — "${fp.slice(0, 60)}"`);
    }
  }
}

report();

function report() {
  if (problems.length === 0) {
    console.log(
      LINT_ONLY
        ? `privacy-guard: 콘텐츠 규칙 통과 (${contentFiles.length}개 파일)`
        : `privacy-guard: 통과 — dist ${distFiles.length}개 파일, 비공개 지문 ${privateFingerprints.length}개, 금지 패턴 ${FORBIDDEN.length}개`,
    );
    process.exit(0);
  }
  console.error(`\nprivacy-guard: 실패 (${problems.length}건)\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('');
  process.exit(1);
}
