/**
 * Pretendard 동적 서브셋을 public/fonts 로 복사한다 (prebuild).
 * 본문 CSS 번들에 @font-face 100여 개를 넣으면 첫 페인트를 막으므로,
 * 폰트 CSS 는 별도 파일로 두고 비차단으로 로드한다.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'node_modules/pretendard/dist/web/variable');
const OUT = path.join(ROOT, 'public/fonts/pretendard');

if (!existsSync(SRC)) throw new Error('pretendard 패키지가 없습니다. npm install 을 먼저 실행하세요.');
mkdirSync(OUT, { recursive: true });
cpSync(path.join(SRC, 'pretendardvariable-dynamic-subset.css'), path.join(OUT, 'pretendardvariable-dynamic-subset.css'));
cpSync(path.join(SRC, 'woff2-dynamic-subset'), path.join(OUT, 'woff2-dynamic-subset'), { recursive: true });
console.log('fonts: public/fonts/pretendard/ 준비');
