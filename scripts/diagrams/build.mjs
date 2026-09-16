/**
 * 아키텍처 다이어그램 SVG 생성기.
 *
 *   node scripts/diagrams/build.mjs
 *
 * 각 박스는 실제 코드의 파일·모듈 하나에 대응한다. 코드에 없는 구성요소는 그리지 않는다.
 * 박스마다 data-desc(호버 설명)와 data-file(대응 파일)을 실어 두어, 사이트에서
 * 인라인으로 삽입할 때 그대로 인터랙션에 쓴다. 색은 CSS 변수로만 정하고 SVG 안에는
 * 폴백 값만 둔다.
 *
 * 박스 높이는 줄 수로 계산하고, 화살표는 박스 id 와 변(side)으로 지정해 좌표를 손으로
 * 맞추지 않는다. 글자 폭이 박스를 넘으면 경고를 낸다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/assets/diagrams');

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let FS = 1; // 글자 배율. PDF 용 압축 도식은 크게 그린다.
const STYLE_OF = (fs) => `
  .dg-grp { fill: none; stroke: var(--dg-group, #e2e2e2); stroke-width: 1; }
  .dg-grp-l { font: 500 ${11*fs}px ui-monospace, "JetBrains Mono", Menlo, monospace; fill: var(--dg-meta, #888); letter-spacing: .04em; }
  .dg-bx { fill: var(--dg-box, #ffffff); stroke: var(--dg-line, #c4c4c4); stroke-width: 1; }
  .dg-bx-ext { fill: var(--dg-ext, #f4f4f4); stroke: var(--dg-line, #c4c4c4); stroke-width: 1; stroke-dasharray: 4 3; }
  .dg-bx-state { fill: var(--dg-state, #fafafa); stroke: var(--dg-line, #c4c4c4); stroke-width: 1; }
  .dg-node:hover rect, .dg-node:focus rect, .dg-node.is-active rect { stroke: var(--dg-accent, #2563eb); }
  .dg-node:focus { outline: none; }
  .dg-t { font: 500 ${13*fs}px Pretendard, "Pretendard Variable", -apple-system, system-ui, sans-serif; fill: var(--dg-text, #111); }
  .dg-s { font: ${11*fs}px Pretendard, "Pretendard Variable", -apple-system, system-ui, sans-serif; fill: var(--dg-body, #555); }
  .dg-f { font: ${10.5*fs}px ui-monospace, "JetBrains Mono", Menlo, monospace; fill: var(--dg-meta, #888); }
  .dg-ar { fill: none; stroke: var(--dg-arrow, #9a9a9a); stroke-width: 1.2; marker-end: url(#MARKER); }
  .dg-ar-d { stroke-dasharray: 4 3; }
  .dg-al { font: ${10.5*fs}px Pretendard, "Pretendard Variable", -apple-system, system-ui, sans-serif; fill: var(--dg-meta, #888); }
  .dg-node { cursor: default; }
`;

// ── 글자 폭 추정 (경고용) ─────────────────────────────────────
function textWidth(str, size) {
  let w = 0;
  for (const ch of String(str)) {
    if (/[ᄀ-ᇿ㄰-㆏가-힯一-鿿　-〿]/.test(ch)) w += size * 0.95;
    else if (/[A-Z@#%&_]/.test(ch)) w += size * 0.68;
    else if (/[a-z0-9]/.test(ch)) w += size * 0.57;
    else if (/[·→↔⇄①②③④]/.test(ch)) w += size * 0.7;
    else w += size * 0.32;
  }
  return w;
}

// ── 박스 높이: 제목 + 줄 + 파일명 ─────────────────────────────
const PAD_X = 12;
function boxHeight(b) {
  const n = (b.lines ?? []).length;
  const content = (27 + 15 * n) * FS; // 마지막 줄 아래 여백까지
  return Math.max(40 * FS, b.file ? content + 27 * FS : content + 10 * FS);
}

/** 박스들을 세로로 쌓는다. y 를 채워 넣고 다음 y 를 돌려준다. */
function stack(boxes, y0, gap = 16) {
  let y = y0;
  for (const b of boxes) {
    b.y = y;
    b.h = boxHeight(b);
    y = b.y + b.h + gap;
  }
  return y - gap;
}

/** 같은 줄에 나란히 놓는 박스들: 높이를 가장 큰 값으로 맞춘다. */
function row(boxes, y) {
  const h = Math.max(...boxes.map(boxHeight));
  for (const b of boxes) {
    b.y = y;
    b.h = h;
  }
  return y + h;
}

function anchor(b, side, t = 0.5) {
  switch (side) {
    case 'left': return { x: b.x, y: b.y + b.h * t };
    case 'right': return { x: b.x + b.w, y: b.y + b.h * t };
    case 'top': return { x: b.x + b.w * t, y: b.y };
    case 'bottom': return { x: b.x + b.w * t, y: b.y + b.h };
    default: throw new Error(`side ${side}`);
  }
}

const horiz = (s) => s === 'left' || s === 'right';

function route(a, byId) {
  if (a.d) return a.d;
  const from = byId[a.from];
  const to = byId[a.to];
  if (!from || !to) throw new Error(`arrow ${a.from} → ${a.to}: 박스가 없습니다`);
  const p = anchor(from, a.fromSide, a.fromT);
  const q = anchor(to, a.toSide, a.toT);
  const seg = [];
  seg.push(`M${p.x},${p.y}`);
  if (horiz(a.fromSide) && horiz(a.toSide)) {
    const mx = a.midX ?? (p.x + q.x) / 2;
    if (p.y === q.y) seg.push(`H${q.x}`);
    else seg.push(`H${mx}`, `V${q.y}`, `H${q.x}`);
  } else if (!horiz(a.fromSide) && !horiz(a.toSide)) {
    const my = a.midY ?? (p.y + q.y) / 2;
    if (p.x === q.x) seg.push(`V${q.y}`);
    else seg.push(`V${my}`, `H${q.x}`, `V${q.y}`);
  } else if (horiz(a.fromSide)) {
    // 가로로 나가서 세로로 들어간다. midX 가 있으면 한 번 꺾어 내려간 뒤 간다.
    if (a.midX !== undefined && a.midY !== undefined) seg.push(`H${a.midX}`, `V${a.midY}`, `H${q.x}`, `V${q.y}`);
    else if (a.midX !== undefined) seg.push(`H${a.midX}`, `V${q.y}`, `H${q.x}`);
    else seg.push(`H${q.x}`, `V${q.y}`);
  } else {
    if (a.midY !== undefined) seg.push(`V${a.midY}`, `H${q.x}`, `V${q.y}`);
    else seg.push(`V${q.y}`, `H${q.x}`);
  }
  return seg.join(' ');
}

function render(spec) {
  const { id, title, w, h, groups, boxes, arrows } = spec;
  const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));
  const warn = [];
  for (const b of boxes) {
    const inner = b.w - PAD_X * 2;
    const fsw = spec.fontScale ?? 1;
    if (textWidth(b.title, 13 * fsw) > inner) warn.push(`${id}/${b.id}: 제목이 넓음 "${b.title}"`);
    for (const l of b.lines ?? []) if (textWidth(l, 11 * fsw) > inner) warn.push(`${id}/${b.id}: 줄이 넓음 "${l}"`);
    if (b.file && textWidth(b.file, 10.5 * fsw) > inner) warn.push(`${id}/${b.id}: 파일명이 넓음 "${b.file}"`);
  }
  for (const m of warn) console.warn(`  ! ${m}`);

  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="${id}-title" data-diagram="${id}">`);
  out.push(`<title id="${id}-title">${esc(title)}</title>`);
  out.push(`<style>${STYLE_OF(spec.fontScale ?? 1).replace(/MARKER/g, `${id}-ah`)}</style>`);
  out.push(`<defs><marker id="${id}-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--dg-arrow, #9a9a9a)"/></marker></defs>`);

  for (const g of groups) {
    out.push(`<g class="dg-group" data-group="${esc(g.id)}">`);
    out.push(`<rect class="dg-grp" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="4"/>`);
    out.push(`<text class="dg-grp-l" x="${g.x + 12}" y="${g.y + 16 * (spec.fontScale ?? 1)}">${esc(g.label)}</text>`);
    out.push(`</g>`);
  }

  for (const a of arrows) {
    out.push(`<path class="dg-ar${a.dashed ? ' dg-ar-d' : ''}" d="${route(a, byId)}"/>`);
    if (a.label) {
      out.push(`<text class="dg-al" x="${a.lx}" y="${a.ly}" text-anchor="${a.anchor ?? 'start'}">${esc(a.label)}</text>`);
    }
  }

  for (const b of boxes) {
    const cls = b.kind === 'ext' ? 'dg-bx-ext' : b.kind === 'state' ? 'dg-bx-state' : 'dg-bx';
    out.push(`<g class="dg-node" id="${id}-${esc(b.id)}" data-node="${esc(b.id)}" data-file="${esc(b.file ?? '')}" data-desc="${esc(b.desc ?? '')}" tabindex="0">`);
    out.push(`<title>${esc(b.desc ? `${b.title} — ${b.desc}` : b.title)}</title>`);
    out.push(`<rect class="${cls}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3"/>`);
    const fs = spec.fontScale ?? 1;
    out.push(`<text class="dg-t" x="${b.x + PAD_X}" y="${b.y + 19 * fs}">${esc(b.title)}</text>`);
    let y = b.y + 36 * fs;
    for (const line of b.lines ?? []) {
      out.push(`<text class="dg-s" x="${b.x + PAD_X}" y="${y}">${esc(line)}</text>`);
      y += 15 * fs;
    }
    if (b.file) out.push(`<text class="dg-f" x="${b.x + PAD_X}" y="${b.y + b.h - 9 * fs}">${esc(b.file)}</text>`);
    out.push(`</g>`);
  }

  out.push(`</svg>`);
  return out.join('\n');
}

const GAP_GROUP = 24; // 그룹 사이 세로 간격
const INSET = 16; // 그룹 테두리와 박스 사이

// ─────────────────────────────────────────────────────────────
// 1. 식당 이미지 자동 평가 — photo_evaluator + polle_RIA
// ─────────────────────────────────────────────────────────────
function imageEval() {
  const ria = [
    {
      id: 'ria-model', x: 40, w: 268, title: 'RIAModel 백본 비교',
      lines: ['ResNet50V2 · InceptionV3 · InceptionResNetV2', 'EfficientNetV2B0 · NIMA(MobileNet)'],
      file: 'polle_RIA/scripts/build.py · train_*.py',
      desc: 'Keras로 사전학습 백본에 회귀·분포 헤드를 붙여 비교한 초기 단계. NIMA는 EMD, 나머지는 MSE로 학습했다.',
    },
    {
      id: 'ria-results', x: 40, w: 268, title: 'EMD · MSE 손실 / 결과 CSV',
      file: 'polle_RIA/scripts/losses.py · results/',
      desc: '분포 예측용 EMD 손실과 백본별 MSE·class별 오차 결과표. 이 결과가 백본 전환의 근거가 됐다.',
    },
  ];
  const data = [
    {
      id: 'label-csv', x: 40, w: 268, title: '검수 라벨 CSV',
      lines: ['image_id · score(1~5) · S3 URI'],
      file: 'label.csv',
      desc: '운영팀이 검수한 점수 라벨. 학습 스냅샷 한 시점의 6,213행이 들어 있다.',
    },
    {
      id: 's3-download', x: 40, w: 268, title: 'S3 이미지 다운로드',
      lines: ['boto3 · images/{image_id}.jpg'],
      file: 's3_file_downloader.py',
      desc: 'CSV의 S3 URI를 순회하며 학습 이미지를 로컬 폴더로 받는다.',
    },
    {
      id: 'dataset', x: 40, w: 268, title: 'PhotoScoreDataset',
      lines: ['Resize 384 · ImageNet Normalize'],
      file: 'photo_score_dataset.py',
      desc: 'DataFrame 행을 이미지 텐서와 float 점수로 바꾸는 Dataset. 384×384 입력을 쓴다.',
    },
  ];
  const train = [
    {
      id: 'trainer', x: 376, w: 268, title: 'PhotoModelTrainer',
      lines: [
        'ConvNeXt V2-Base 384 + 1-출력 회귀 헤드',
        'stratified 80:20 split · 오버샘플링 표(비활성)',
        'weighted MSE · 4점 ×2.0 · 5점 ×3.0',
        'AdamW 전체 파라미터 · lr 1e-4',
        '점수 구간별 MAE·RMSE·예측평균 진단',
      ],
      file: 'photo_model_trainer.py',
      desc: 'timm ConvNeXt V2를 전체 파인튜닝하는 학습기. 고득점 라벨 부족에 대응해 손실 가중치를 쓰고, 점수 구간별 진단 표를 출력한다.',
    },
    {
      id: 'run-training', x: 376, w: 268, title: '학습 실행 (GPU)',
      lines: ['CUDA / AMP 변형 트레이너'],
      file: 'run_training.py · *_cuda.py · *_amp.py',
      desc: 'CSV와 이미지 폴더를 지정해 학습을 돌리고 가중치를 저장하는 진입점. CUDA·AMP 변형 파일이 함께 있다.',
    },
    {
      id: 'weights', kind: 'state', x: 376, w: 268, title: '모델 가중치 .pth',
      file: 'models/…_384_weighted_mse_a1.pth',
      desc: '학습 결과 state_dict. 추론기와 서비스가 이 파일을 읽는다.',
    },
  ];
  const serve = [
    {
      id: 'evaluator', x: 712, w: 224, title: 'PhotoEvaluator',
      lines: ['predict_score(image) → float', '학습과 동일한 전처리'],
      file: 'photo_evaluator.py',
      desc: '가중치를 로드해 이미지 한 장의 점수를 돌려주는 추론 클래스.',
    },
    {
      id: 'web-server', kind: 'ext', x: 712, w: 224, title: '웹 서버 (Ruby · PyCall)',
      lines: ['pyimport photo_evaluator', '프로세스 시작 시 모델 상시 로드'],
      file: 'SETUP',
      desc: 'Ruby 웹 서버가 PyCall로 PhotoEvaluator를 임포트해 호출하는 연동 설정. 서버 본체 코드는 이 저장소 밖에 있다.',
    },
  ];

  const riaBottom = stack(ria, 24 + 28);
  const gRia = { id: 'ria', label: '1차 실험 · Keras (polle_RIA)', x: 24, y: 24, w: 300, h: riaBottom + INSET - 24 };
  const y2 = gRia.y + gRia.h + GAP_GROUP + 12;
  const b1 = stack(data, y2 + 28);
  const b2 = stack(train, y2 + 28);
  // 추론 열: 평가기는 위, 웹 서버는 열 아래쪽에 둔다.
  serve[0].y = y2 + 28; serve[0].h = boxHeight(serve[0]);
  serve[1].h = boxHeight(serve[1]); serve[1].y = serve[0].y + serve[0].h + 72;
  const b3 = serve[1].y + serve[1].h;
  const bottom = Math.max(b1, b2, b3);
  const gh = bottom + INSET - y2;
  const groups = [
    gRia,
    { id: 'data', label: '데이터', x: 24, y: y2, w: 300, h: gh },
    { id: 'train', label: '학습 · PyTorch / timm (photo_evaluator)', x: 360, y: y2, w: 300, h: gh },
    { id: 'serve', label: '추론 · 서비스 연동', x: 696, y: y2, w: 256, h: gh },
  ];
  const boxes = [...ria, ...data, ...train, ...serve];
  const arrows = [
    { from: 'ria-results', fromSide: 'right', to: 'trainer', toSide: 'left', toT: 0.3, midX: 342, dashed: true,
      label: '백본·스택 전환 (Keras → PyTorch/timm)', lx: 350, ly: y2 - 8 },
    { from: 'label-csv', fromSide: 'bottom', to: 's3-download', toSide: 'top' },
    { from: 's3-download', fromSide: 'bottom', to: 'dataset', toSide: 'top' },
    { from: 'dataset', fromSide: 'right', to: 'trainer', toSide: 'left', toT: 0.7, midX: 342 },
    { from: 'trainer', fromSide: 'bottom', to: 'run-training', toSide: 'top' },
    { from: 'run-training', fromSide: 'bottom', to: 'weights', toSide: 'top' },
    { from: 'weights', fromSide: 'right', to: 'evaluator', toSide: 'left', midX: 678, label: '로드', lx: 652, ly: 0 },
    { from: 'web-server', fromSide: 'top', to: 'evaluator', toSide: 'bottom', label: '호출', lx: 832, ly: 0 },
  ];
  // 라벨 y 를 박스 위치에서 계산
  arrows[6].ly = serve[1].y + serve[1].h / 2 - 6 + 0; // 근처
  arrows[6].ly = boxes.find((b) => b.id === 'weights').y + boxes.find((b) => b.id === 'weights').h / 2 - 8;
  arrows[7].ly = (serve[0].y + serve[0].h + serve[1].y) / 2 + 4;
  return { id: 'image-eval', title: '식당 이미지 자동 평가 아키텍처', w: 976, h: bottom + INSET + 24, groups, boxes, arrows };
}

// ─────────────────────────────────────────────────────────────
// 2. AGENT24 지식그래프 에이전트 — agent24/knowledge_graph
// ─────────────────────────────────────────────────────────────
function agent24() {
  const browser = [
    {
      id: 'app', x: 40, w: 218, title: 'App.tsx',
      lines: ['입력: 대화 붙여넣기 · 공유 링크', '강의안 PDF (pdfjs로 텍스트 추출)'],
      file: 'src/App.tsx · src/pdfNote.ts',
      desc: '화면 상태와 세 가지 입력 경로를 관리하는 루트 컴포넌트.',
    },
    {
      id: 'graph-view', x: 40, w: 218, title: 'Graph · layout',
      lines: ['그래프 렌더 · 단원별 세로 배치', '좌표는 프론트 로컬 (계약에 없음)'],
      file: 'components/Graph.tsx · layout.ts',
      desc: '백엔드는 구조만 주고 좌표는 프론트가 정한다는 경계를 코드로 구현한 부분.',
    },
    {
      id: 'stream-panel', x: 40, w: 218, title: 'StreamPanel',
      lines: ['raw 뷰 / 요약 뷰 토글', 'raw만 있는 이벤트는 요약 뷰에서 제외'],
      file: 'components/StreamPanel.tsx',
      desc: '한 스트림을 두 뷰로 보여주는 패널. 대회 규칙(원본 이벤트 무가공 출력)과 사람이 읽는 요약을 함께 만족한다.',
    },
    {
      id: 'note', x: 40, w: 218, title: 'NoteWorkspace · NodeDetail',
      lines: ['노드 문서를 이어 붙인 노트', '약점 코멘트를 원문 인용과 함께 표시'],
      file: 'components/NoteWorkspace.tsx',
      desc: '학생이 어디서 막혔는지를 대화 원문 근거와 함께 보여주는 화면.',
    },
    {
      id: 'agent-api-client', x: 40, w: 218, title: 'agentApi.ts',
      lines: ['fetch로 SSE를 직접 읽어 파싱', 'status가 불가면 mock.ts로 동작', '토글 없음 — 환경이 스스로 답한다'],
      file: 'src/agentApi.ts · src/mock.ts',
      desc: 'API 키가 없는 팀원의 브라우저는 자동으로 목 데이터로 흐른다.',
    },
  ];
  const node = [
    {
      id: 'agent-api', x: 346, w: 278, title: 'agent-api.mjs · createAgentApi',
      lines: [
        '/status /graph /run /lecture',
        '/question /share /undo /redo',
        '세션 쿠키로 접속자별 상태 격리',
        '동시 실행 상한 (메모리 근거)',
        '15초 heartbeat · JSONL → SSE 중계',
        '(req, res) => boolean 함수 하나',
      ],
      file: 'scripts/agent-api.mjs',
      desc: '서버를 만들지 않고 핸들러 함수 하나만 돌려준다. 개발과 배포가 같은 함수를 마운트한다.',
    },
  ];
  const mounts = [
    { id: 'vite-mount', x: 346, w: 132, title: 'vite.config.ts', lines: ['개발: 미들웨어 마운트'], file: 'vite.config.ts',
      desc: '개발 서버에서 같은 핸들러를 미들웨어로 건다.' },
    { id: 'serve-mount', x: 492, w: 132, title: 'serve.mjs', lines: ['배포: node:http + dist/'], file: 'scripts/serve.mjs',
      desc: '정적 파일과 API를 같은 오리진에서 내보내는 배포 서버. 표준 모듈만 쓴다.' },
  ];
  const node2 = [
    {
      id: 'share-parser', x: 346, w: 278, title: 'chatgpt-share.mjs',
      lines: ['공유 페이지 turbo-stream 페이로드 inflate', 'author.role + content.parts 객체 재귀 수집'],
      file: 'scripts/chatgpt-share.mjs',
      desc: '내부 경로를 고정하지 않고 메시지처럼 생긴 객체를 찾는다. 배포마다 구조가 바뀌어도 살아남게 한 선택.',
    },
    {
      id: 'dockerfile', x: 346, w: 278, title: 'Dockerfile',
      lines: ['2단계 빌드 · contract:check → build', 'KG_STATE_DIR 고정 · 상시 구동 컨테이너'],
      file: 'Dockerfile',
      desc: '파이썬 서브프로세스·분 단위 실행·파일 상태라는 세 제약에 맞춰 컨테이너를 택했다.',
    },
  ];
  const main = {
    id: 'main', x: 716, w: 240, title: 'main.py',
    lines: [
      'Agents SDK Runner.run_streamed',
      '프롬프트 2종 · 툴 목록 2종',
      'max_turns 80 (강의안) / 20 (대화)',
      '_drive: SDK 이벤트 → 계약 C 변환',
      '상한 도달 시 limit 이벤트',
    ],
    file: 'agent/main.py · agent/config.py',
    desc: '단계를 강제하지 않고 목표만 준다. 대화 에이전트에는 단원 생성 툴을 아예 주지 않아 권한을 코드로 제한한다.',
  };
  const openai = { id: 'openai', kind: 'ext', x: 968, w: 84, title: 'OpenAI', lines: ['모델 호출'], desc: 'Agents SDK가 호출하는 외부 모델 API.' };
  const pyRow = [
    { id: 'tools', x: 716, w: 160, title: 'tools.py', lines: ['@function_tool 10종', '조회 4 · 변경 6 · LLM 호출 없음'], file: 'agent/tools.py',
      desc: '툴은 조회하거나 변경만 한다. 판단은 전부 모델이 한다는 원칙이 여기서 지켜진다.' },
    { id: 'stream', x: 892, w: 160, title: 'stream.py', lines: ['raw 층 + 요약 층 한 스트림', 'stdout JSONL · JSONL 기록'], file: 'agent/stream.py',
      desc: '모든 이벤트를 JSONL로 남겨 키 없는 팀원의 픽스처가 된다.' },
  ];
  const py2 = [
    {
      id: 'store', x: 716, w: 336, title: 'store.py · GraphStore',
      lines: ['graph.json 단일 파일 · 프로세스 잠금', 'slug 중복 흡수 · 정규화 문자열 검색 (임베딩 없음)'],
      file: 'agent/store.py',
      desc: 'DB 없이 JSON 파일 하나. 같은 실행 안의 중복 생성은 저장소가 막고, 검색은 예측 가능한 문자열 매칭만 쓴다.',
    },
    {
      id: 'state-files', kind: 'state', x: 716, w: 336, title: '그래프 상태 파일',
      lines: ['graph.json · last_run.jsonl · undo/redo 스냅샷'],
      file: 'KG_STATE_DIR/sessions/<id>/…',
      desc: '세션·과목별로 디렉터리를 나눈 파일 상태. 다중 인스턴스 확장 시 공유 저장이 필요하다는 한계를 배포 시점에 문서화했다.',
    },
  ];
  const contract = [
    {
      id: 'schema', x: 40, w: 300, title: 'schema.py ↔ schema.ts',
      lines: ['계약 A 그래프 상태 · B 툴 시그니처 · C 스트림 이벤트', '좌표 없음 · 간선 방향 규칙을 상수로', 'pydantic 원본 · TypeScript 사본'],
      file: 'contract/schema.py · contract/schema.ts',
      desc: '세 층으로 나눈 데이터 계약. 담당자마다 읽어야 할 층이 다르다.',
    },
    {
      id: 'lock-fixtures', x: 356, w: 300, title: '.lock · fixtures/',
      lines: ['소유자 1인의 해시 잠금', 'seed_graph · reference · 대화 픽스처', '실제 실행 기록으로 키 없이 개발'],
      file: 'contract/.lock · contract/fixtures/',
      desc: '계약 변경 권한을 한 명으로 묶고, 픽스처로 나머지 세 명이 독립 개발하게 했다.',
    },
    {
      id: 'contract-check', x: 672, w: 380, title: 'contract-check.mjs (predev · Node만)',
      lines: ['① 잠금 해시  ② py↔ts 필드 대조', '③ 계약 타입 재선언 스캔  ④ 픽스처 간선 무결성', '실패하면 dev·agent 실행 자체가 시작되지 않음'],
      file: 'scripts/contract-check.mjs · contract-seal.mjs',
      desc: '계약이 깨진 상태로는 작업을 시작할 수 없게 하는 200ms 검사. 파이썬이 없는 프론트 담당자도 통과해야 하므로 Node만 쓴다.',
    },
  ];

  const y0 = 24 + 28;
  const bBrowser = stack(browser, y0);
  let y = stack(node, y0) + 16;
  y = row(mounts, y) + 16;
  const bNode = stack(node2, y);
  main.y = y0; main.h = boxHeight(main);
  openai.y = y0; openai.h = boxHeight(openai);
  let py = main.y + main.h + 16;
  py = row(pyRow, py) + 16;
  const bPy = stack(py2, py);
  const bottom = Math.max(bBrowser, bNode, bPy);
  const gh = bottom + INSET - 24;
  const cy = 24 + gh + GAP_GROUP;
  const cBottom = row(contract, cy + 28);
  const groups = [
    { id: 'browser', label: '브라우저 · React (src/)', x: 24, y: 24, w: 250, h: gh },
    { id: 'node', label: 'Node 서버 (scripts/)', x: 330, y: 24, w: 310, h: gh },
    { id: 'python', label: 'Python 에이전트 (agent/)', x: 700, y: 24, w: 368, h: gh },
    { id: 'contract', label: '계약 (contract/) — 4인 병렬 개발의 단일 원본', x: 24, y: cy, w: 1044, h: cBottom + INSET - cy },
  ];
  const boxes = [...browser, ...node, ...mounts, ...node2, main, openai, ...pyRow, ...py2, ...contract];
  const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));
  const arrows = [
    { from: 'agent-api-client', fromSide: 'right', to: 'agent-api', toSide: 'left', toT: 0.5, midX: 302,
      label: 'POST /run', lx: 302, ly: byId['agent-api'].y + byId['agent-api'].h / 2 - 8, anchor: 'middle' },
    { from: 'agent-api', fromSide: 'right', fromT: 0.3, to: 'main', toSide: 'left', toT: 0.3,
      label: 'spawn', lx: 670, ly: byId['main'].y + byId['main'].h * 0.3 - 6, anchor: 'middle' },
    { from: 'main', fromSide: 'left', fromT: 0.75, to: 'agent-api', toSide: 'right', toT: 0.75,
      label: 'stdout JSONL', lx: 670, ly: byId['main'].y + byId['main'].h * 0.75 + 30, anchor: 'middle' },
    { from: 'main', fromSide: 'right', to: 'openai', toSide: 'left' },
    { from: 'main', fromSide: 'bottom', fromT: 80 / 240, to: 'tools', toSide: 'top', toT: 0.5 },
    { from: 'main', fromSide: 'bottom', fromT: 0.9, to: 'stream', toSide: 'top', toT: 0.5 },
    { from: 'tools', fromSide: 'bottom', toT: 80 / 336, to: 'store', toSide: 'top' },
    { from: 'store', fromSide: 'bottom', to: 'state-files', toSide: 'top' },
    { from: 'state-files', fromSide: 'left', to: 'agent-api', toSide: 'right', toT: 0.95, midX: 672, dashed: true,
      label: 'GET /graph', lx: 672, ly: byId['state-files'].y + byId['state-files'].h / 2 + 22, anchor: 'middle' },
    { d: `M190,${cy} V${24 + gh}`, dashed: true, label: '계약 타입 import (재선언 금지)', lx: 198, ly: cy - 8 },
    { d: `M884,${cy} V${24 + gh}`, dashed: true, label: 'from contract.schema import', lx: 892, ly: cy - 8 },
  ];
  return { id: 'agent24', title: 'AGENT24 지식그래프 에이전트 아키텍처', w: 1092, h: cBottom + INSET + 24, groups, boxes, arrows };
}

// ─────────────────────────────────────────────────────────────
// 3. 다중 에이전트 토론 실패 조건 분석 — LLM/final/src
// ─────────────────────────────────────────────────────────────
function debate() {
  const top = [
    { id: 'hf-datasets', kind: 'ext', x: 40, w: 130, title: 'HF datasets', lines: ['GSM8K test', 'HotpotQA distractor'], desc: '외부 벤치마크 데이터셋.' },
    { id: 'data', x: 186, w: 150, title: 'data.py', lines: ['200 + 200 문항', 'HotpotQA closed-book'], file: 'load_questions',
      desc: '두 데이터셋을 {qid, dataset, question, gold} 한 목록으로 정규화한다.' },
    { id: 'prompts', x: 352, w: 190, title: 'prompts.py',
      lines: ['R0 독립 답변 · 토론 메시지', '조건별 peer block:', 'baseline · anti_syco', 'length_robust (추론 은닉)'],
      desc: 'R0 프롬프트는 조건과 무관하고, R1·R2에서만 한 줄 추가(anti_syco)나 동료 추론 은닉(length_robust)이 들어간다.' },
    { id: 'orchestrate', x: 558, w: 226, title: 'orchestrate.py',
      lines: ['R0 1회 생성 → 3조건에 공유', 'R1·R2: 조건×모델 job 풀링', 'GPU wave 실행 · 실패 시 재시도', '라운드마다 records.jsonl checkpoint'],
      file: 'orchestrate.py',
      desc: 'R0가 조건 독립적이고 temp=0이라 한 번만 생성해 공유한다. 라운드 안의 job은 독립이라 GPU를 채워 돌린다.' },
    { id: 'worker', x: 800, w: 136, title: 'worker_vllm.py',
      lines: ['서브프로세스 1개', '= 모델 1개 로드', 'vLLM chat 배치 생성', 'in/out JSON'],
      file: 'results/batches/',
      desc: '모델마다 프로세스를 새로 띄워 GPU 메모리를 깨끗이 반환한다.' },
  ];
  const second = [
    { id: 'config', x: 558, w: 226, title: 'config.py', lines: ['3 모델 · 2 라운드 · 3 조건 · temp 0'], desc: '모델·라운드·조건·디코딩·경로를 한 곳에 둔다.' },
    { id: 'hf-models', kind: 'ext', x: 800, w: 136, title: 'HF 모델 3종', lines: ['Qwen2.5-7B', 'Llama-3.1-8B', 'Mistral-7B-v0.3'], desc: '서로 다른 벤더의 유사 규모 instruct 모델.' },
  ];
  const bottomRow = [
    { id: 'extract', x: 40, w: 170, title: 'extract.py', lines: ['"Final answer:" 표식 추출', 'GSM8K 수치 비교', 'HotpotQA 정규화 EM · F1'],
      desc: '자유 텍스트에서 답을 뽑고 데이터셋별 규칙으로 채점한다. 표식이 없어도 예외를 내지 않는다.' },
    { id: 'records', kind: 'state', x: 226, w: 160, title: 'records.jsonl', lines: ['10,800 조건별 평가 기록', 'condition · qid · model', 'round · answer · correct'], file: 'results/records.jsonl',
      desc: '집계의 원본. 이 파일을 재집계해 저장된 지표와 일치함을 확인했다.' },
    { id: 'analyze', x: 402, w: 192, title: 'analyze.py', lines: ['majority · round_curve', 'flip_to_wrong / flip_to_correct', 'verbosity · source asymmetry'], file: '→ results/metrics.json',
      desc: '정확도뿐 아니라 정답→오답 전환, 채택한 동료가 더 길었는지, 어느 모델이 합의를 지배하는지를 센다.' },
    { id: 'plots', x: 610, w: 140, title: 'plots.py', lines: ['figs/*.png 8장', '데이터셋별 분리 그림'], file: 'results/figs/',
      desc: 'metrics.json에서 슬라이드용 그림을 만든다.' },
    { id: 'slides', x: 766, w: 170, title: 'build_slides · demo', lines: ['슬라이드 PDF', '터미널 리플레이 (GPU 없이)'],
      desc: '결과 발표물과 토론 과정을 재생하는 데모.' },
  ];

  const y0 = 24 + 28;
  const r1 = row(top, y0);
  const r2 = row(second, r1 + 22);
  const g1h = r2 + INSET - 24;
  const gy2 = 24 + g1h + GAP_GROUP;
  const r3 = row(bottomRow, gy2 + 28);
  const groups = [
    { id: 'run', label: '실험 실행', x: 24, y: 24, w: 912, h: g1h },
    { id: 'analyze-group', label: '채점 · 집계 · 산출물', x: 24, y: gy2, w: 912, h: r3 + INSET - gy2 },
  ];
  const boxes = [...top, ...second, ...bottomRow];
  const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));
  const midGap = (r1 + 22 + r1) / 2; // 1행과 2행 사이
  const arrows = [
    { from: 'hf-datasets', fromSide: 'right', to: 'data', toSide: 'left' },
    { from: 'data', fromSide: 'right', to: 'prompts', toSide: 'left' },
    { from: 'prompts', fromSide: 'right', to: 'orchestrate', toSide: 'left' },
    { from: 'orchestrate', fromSide: 'right', fromT: 0.3, to: 'worker', toSide: 'left', toT: 0.3,
      label: 'batch JSON', lx: 792, ly: y0 - 8, anchor: 'middle' },
    { from: 'worker', fromSide: 'left', fromT: 0.75, to: 'orchestrate', toSide: 'right', toT: 0.75,
      label: '생성 텍스트', lx: 792, ly: midGap + 4, anchor: 'middle' },
    { from: 'hf-models', fromSide: 'top', to: 'worker', toSide: 'bottom' },
    { from: 'config', fromSide: 'top', to: 'orchestrate', toSide: 'bottom', dashed: true },
    { from: 'orchestrate', fromSide: 'left', fromT: 0.9, to: 'extract', toSide: 'top', midX: 550, midY: (24 + g1h + gy2) / 2,
      label: '라운드별 생성 텍스트', lx: 300, ly: (24 + g1h + gy2) / 2 - 6 },
    { from: 'extract', fromSide: 'right', to: 'records', toSide: 'left' },
    { from: 'records', fromSide: 'right', to: 'analyze', toSide: 'left' },
    { from: 'analyze', fromSide: 'right', to: 'plots', toSide: 'left' },
    { from: 'plots', fromSide: 'right', to: 'slides', toSide: 'left' },
  ];
  void byId;
  return { id: 'debate', title: '다중 에이전트 토론 실험 파이프라인', w: 960, h: r3 + INSET + 24, groups, boxes, arrows };
}


// ─────────────────────────────────────────────────────────────
// PDF 용 압축 도식 — 입력 → 핵심 처리 → 상태 → 출력, 내 담당을 크게
// ─────────────────────────────────────────────────────────────
function pdfImageEval() {
  FS = 1.3;
  const top = [
    { id: 'p-label', kind: 'ext', x: 32, w: 290, title: '검수 기준 · 1~5점 라벨',
      lines: ['마케팅·운영팀과 공동 정의', '어드민 라벨링·재검수 화면 (내가 구현)'],
      desc: '기준은 공동, 도구는 단독.' },
    { id: 'p-data', x: 352, w: 270, title: '학습 데이터',
      lines: ['S3 이미지 수집 → Dataset', '384px 입력 · stratified split'],
      desc: '' },
    { id: 'p-train', x: 652, w: 290, title: '학습',
      lines: ['ConvNeXt V2-Base 전체 파인튜닝', 'weighted MSE (4점 ×2 · 5점 ×3)', '점수 구간별 진단'],
      desc: '' },
  ];
  const bottom = [
    { id: 'p-infer', x: 352, w: 270, title: '추론',
      lines: ['PhotoEvaluator 클래스', 'Ruby 웹 서버가 상시 로드 (PyCall)'],
      desc: '' },
    { id: 'p-ops', x: 652, w: 290, title: '운영 루프',
      lines: ['전수 자동 평가 → 상위 후보만 사람이 재검수', '재검수 결과를 학습 데이터에 반영'],
      desc: '' },
  ];
  const r1 = row(top, 24 + 34);
  const r2 = row(bottom, r1 + 44);
  const groups = [{ id: 'g', label: '내 담당: 데이터 · 학습 · 추론 연동 · 운영 흐름 설계  (점선: 공동 정의)', x: 16, y: 24, w: 958, h: r2 + 20 - 24 }];
  const boxes = [...top, ...bottom];
  const arrows = [
    { from: 'p-label', fromSide: 'right', to: 'p-data', toSide: 'left' },
    { from: 'p-data', fromSide: 'right', to: 'p-train', toSide: 'left' },
    { from: 'p-train', fromSide: 'bottom', to: 'p-infer', toSide: 'top', midY: r1 + 22 },
    { from: 'p-infer', fromSide: 'right', to: 'p-ops', toSide: 'left' },
    { from: 'p-ops', fromSide: 'top', fromT: 0.85, to: 'p-train', toSide: 'bottom', toT: 0.85, dashed: true, label: '재학습', lx: 930, ly: r1 + 30, anchor: 'end' },
    { d: `M352,${r2 - (r2 - r1 - 44) / 2 - 10} H200 V${r1 + 0}`, dashed: true, label: '', lx: 0, ly: 0 },
  ];
  // 마지막 화살표: 운영 루프의 재검수 라벨이 기준·라벨 상자로 돌아간다
  arrows.pop();
  const spec = { id: 'pdf-image-eval', title: '식당 이미지 자동 평가 — 업무 흐름', w: 990, h: r2 + 44, groups, boxes, arrows, fontScale: FS };
  FS = 1;
  return spec;
}

function pdfAgent24() {
  FS = 1.3;
  const top = [
    { id: 'a-input', kind: 'ext', x: 32, w: 200, title: '입력',
      lines: ['강의안 PDF', '학습 대화 · 공유 링크'], desc: '' },
    { id: 'a-api', x: 262, w: 300, title: 'Node 서버 (내 담당)',
      lines: ['API 핸들러 하나를 개발·배포가 공유', '세션 격리 · 동시 실행 상한', 'JSONL → SSE 중계 · heartbeat'], desc: '' },
    { id: 'a-agent', x: 592, w: 366, title: 'Python 에이전트 루프 (내 담당)',
      lines: ['목표만 부여, 단계는 강제하지 않음', '실행 종류별로 툴 노출을 분리 (권한 = 툴)', '상태 변경 전 판단 근거 기록 · 스텝 상한'], desc: '' },
  ];
  const mid = [
    { id: 'a-state', kind: 'state', x: 592, w: 366, title: '그래프 상태',
      lines: ['세션별 JSON 파일 · 툴은 조회·변경만 (LLM 호출 없음)'], desc: '' },
  ];
  const bottom = [
    { id: 'a-front', kind: 'ext', x: 32, w: 300, title: '프론트 (팀원)',
      lines: ['그래프 · 노트 · 약점 표시', 'raw / 요약 스트림 토글'], desc: '' },
    { id: 'a-contract', x: 362, w: 596, title: '데이터 계약 3층 + 자동 검사 (내 담당)',
      lines: ['그래프 상태 · 툴 시그니처 · 스트림 이벤트를 pydantic·TypeScript 두 벌로', '검사 4종을 dev·agent 실행 전에 강제 → 4인이 키 없이 병렬 개발'], desc: '' },
  ];
  const r1 = row(top, 24 + 34);
  const r2 = row(mid, r1 + 40);
  const r3 = row(bottom, r2 + 44);
  const groups = [{ id: 'g', label: 'AGENT24 — 입력 → 에이전트 → 상태 → 화면. 실선 상자가 내 담당', x: 16, y: 24, w: 958, h: r3 + 20 - 24 }];
  const boxes = [...top, ...mid, ...bottom];
  const arrows = [
    { from: 'a-input', fromSide: 'right', to: 'a-api', toSide: 'left' },
    { from: 'a-api', fromSide: 'right', fromT: 0.35, to: 'a-agent', toSide: 'left', toT: 0.35 },
    { from: 'a-agent', fromSide: 'left', fromT: 0.75, to: 'a-api', toSide: 'right', toT: 0.75, label: '실행 → 이벤트 JSONL', lx: 577, ly: r1 + 14, anchor: 'middle' },
    { from: 'a-agent', fromSide: 'bottom', to: 'a-state', toSide: 'top' },
    { from: 'a-api', fromSide: 'bottom', fromT: 0.3, to: 'a-front', toSide: 'top', toT: 0.7, midY: r1 + 20, label: 'SSE 스트림 (raw + 요약)', lx: 180, ly: r1 + 14 },
    { d: `M660,${r3 - 2} V${r3 + 2}`, dashed: true },
  ];
  arrows.pop();
  const spec = { id: 'pdf-agent24', title: 'AGENT24 — 구조와 담당', w: 990, h: r3 + 44, groups, boxes, arrows, fontScale: FS };
  FS = 1;
  return spec;
}

mkdirSync(OUT, { recursive: true });
for (const build of [imageEval, agent24, debate, pdfImageEval, pdfAgent24]) {
  const spec = build();
  const file = path.join(OUT, `${spec.id}.svg`);
  writeFileSync(file, render(spec), 'utf-8');
  console.log(`wrote ${path.relative(process.cwd(), file)} (${spec.w}×${spec.h})`);
}
