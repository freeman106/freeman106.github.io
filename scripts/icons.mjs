/**
 * 파비콘 · 애플 터치 아이콘 생성. prebuild 로 실행된다.
 *   public/favicon.svg, public/favicon.ico (PNG 포맷 ICO), public/apple-touch-icon.png
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
mkdirSync(PUB, { recursive: true });

const font = path.join(ROOT, 'node_modules/pretendard/dist/public/static/Pretendard-SemiBold.otf');

const svg = (size, radius) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#111111"/>
  <text x="50%" y="50%" dy="0.36em" text-anchor="middle" font-family="Pretendard, 'Pretendard Variable', -apple-system, system-ui, sans-serif" font-weight="600" font-size="${Math.round(size * 0.56)}" fill="#fafafa">K</text>
</svg>`;

writeFileSync(path.join(PUB, 'favicon.svg'), svg(32, 7));

function png(size, radius) {
  const r = new Resvg(svg(size, radius), {
    fitTo: { mode: 'width', value: size },
    font: { fontFiles: existsSync(font) ? [font] : [], loadSystemFonts: true, defaultFontFamily: 'Pretendard' },
  });
  return r.render().asPng();
}

writeFileSync(path.join(PUB, 'apple-touch-icon.png'), png(180, 36));

// ICO 컨테이너에 PNG 하나를 담는다 (현대 브라우저 지원).
const p32 = png(32, 7);
const header = Buffer.alloc(6 + 16);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6);
header.writeUInt8(32, 7);
header.writeUInt8(0, 8);
header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(p32.length, 14);
header.writeUInt32LE(22, 18);
writeFileSync(path.join(PUB, 'favicon.ico'), Buffer.concat([header, p32]));
console.log('icons: favicon.svg · favicon.ico · apple-touch-icon.png');
