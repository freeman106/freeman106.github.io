# fable — 포트폴리오 사이트

Astro 정적 사이트. 상위 `reference/` 의 경험맵을 원본으로 삼아 공개 뷰를 만든다. `reference/` 는 읽기 전용이며 이 저장소에 포함하지 않는다.

## 실행

```
npm install
npm run dev        # 개발 서버
npm run build      # prebuild(fonts·icons·og) → astro build → postbuild(privacy-guard)
npm run preview
```

배포 도메인은 `SITE_URL` 환경변수로 준다 (`.env.example` 참고). sitemap·OG·print 뷰의 QR 에 쓴다. Plausible 은 `PUBLIC_PLAUSIBLE_DOMAIN` 을 넣을 때만 켜진다.

## 구조

```
src/content/projects/*.mdx   프로젝트 (frontmatter 스키마: src/content.config.ts)
src/content/episodes/*.md    상세 페이지 "더 읽기" 에 접히는 결정 기록
src/content/writing/*.md     리포트·회고 (PDF 는 public/files/)
src/assets/diagrams/*.svg    아키텍처 다이어그램 (scripts/diagrams/build.mjs 가 생성)
src/pages/                   / · /projects/[slug] · /writing · /about · /print · 404 · rss.xml
src/lib/site.ts              이름·포지셔닝·링크·연락처
scripts/privacy-guard.mjs    빌드 산출물 비공개 검사 (postbuild · CI)
```

## 콘텐츠 규칙

- 모든 컬렉션의 `public` 기본값은 false. 공개할 항목만 `public: true`.
- `public: false` 인 파일은 `*.private.md(x)` 이름을 써야 하며 `.gitignore` 대상이다. 가드가 이름 규칙을 검사한다.
- 문서에 없는 사실은 쓰지 않는다. 빈 자리는 frontmatter `todos` 에 남긴다 (렌더링되지 않음).
- 기간이 임시(폴더 수정일 등)면 `period.tentative: true`. 화면에 "확인 필요" 로 표시된다.
- 회사 내부 절대 수치는 상대값·범위로 쓴다.

## 프라이버시 가드

`npm run build` 뒤 자동 실행. 세 가지를 검사하고 하나라도 걸리면 빌드가 실패한다.

1. 이름 규칙: public 이 아닌 파일이 `*.private.*` 가 아니면 실패.
2. 비공개 지문: 비공개 파일의 제목·frontmatter 값·본문 문장이 `dist/` 어디에든 있으면 실패.
3. 금지 패턴: 로컬 경로, 참고 자료 파일명, 경험맵 ID(EP01 등), 자소서 어휘, TODO 마커.

`npm run guard:lint` 는 dist 없이 콘텐츠 규칙만 검사한다.

## 다이어그램

`scripts/diagrams/build.mjs` 안의 스펙에서 SVG 를 만든다. 박스는 실제 코드의 파일·모듈에 대응하고, `data-desc`·`data-file` 이 상세 페이지의 호버 설명이 된다. 미리보기 PNG 는 `npm run diagrams:png`.

## print 뷰

`/print?roles=agent,mlops&limit=3` 처럼 쿼리로 필터한 뒤 브라우저 인쇄로 PDF 를 저장한다. A4 기준.
