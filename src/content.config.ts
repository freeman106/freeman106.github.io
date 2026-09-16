import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 콘텐츠 모델.
 *
 * 모든 컬렉션에 `public` 플래그가 있고 기본값은 false다. 공개할 항목만 `public: true`를
 * 명시한다. `public: false`인 파일은 `*.private.md(x)` 이름을 써야 하며(.gitignore 대상),
 * 빌드 뒤 scripts/privacy-guard.mjs 가 dist/ 에 비공개 내용이 한 글자도 없는지 검사한다.
 *
 * 문서에 없는 사실은 채우지 않는다. 빈 자리는 `todos` 배열에 남기고(렌더링되지 않음),
 * 본문에서는 MDX 주석(중괄호 안 블록 주석) 형태의 TODO 를 쓴다.
 */

/** YYYY-MM 또는 YYYY. 문서에 연도만 있으면 연도만 적는다. */
const ym = z.string().regex(/^\d{4}(-\d{2})?$/, 'YYYY-MM 또는 YYYY 형식');

export const ROLES = ['agent', 'mlops', 'backend', 'data', 'frontend'] as const;

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    oneLiner: z.string(),
    period: z.object({
      /** 문서에 시기가 없으면 비워 두고 tentative 를 켠다. */
      start: ym.optional(),
      end: ym.or(z.literal('present')).optional(),
      /** Git 이력이 없어 폴더 수정일로 임시 기재했거나 시기를 확인 중인 경우 true. 화면에 "확인 필요"로 표시. */
      tentative: z.boolean().default(false),
    }),
    team: z.object({
      size: z.number().int().positive(),
      role: z.string(),
      /** 기여 범위를 문장으로. */
      contribution: z.string(),
    }),
    /** 완성 범위. 어디까지 만들었고 무엇이 미구현인지. */
    scope: z.string(),
    /** 결과. 숫자가 있으면 value 에 숫자로 둔다. */
    result: z
      .array(
        z.object({
          label: z.string(),
          value: z.union([z.number(), z.string()]).optional(),
          unit: z.string().optional(),
          note: z.string().optional(),
        }),
      )
      .default([]),
    stack: z.array(z.string()),
    roles: z.array(z.enum(ROLES)).min(1),
    /** 낮을수록 대표. 홈 정렬과 print 필터 순서에 쓴다. */
    impact: z.number().int(),
    featured: z.boolean().default(false),
    public: z.boolean().default(false),
    /** src/assets/diagrams/ 안의 SVG 파일명. */
    diagram: z.string().optional(),
    cover: z.string().optional(),
    links: z
      .object({
        repo: z.url().optional(),
        demo: z.string().optional(),
        report: z.string().optional(),
        model: z.url().optional(),
      })
      .default({}),
    /** 아직 채우지 못한 사실. 렌더링하지 않는다. */
    todos: z.array(z.string()).default([]),
  }),
});

const episodes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/episodes' }),
  schema: z.object({
    /** projects 의 slug */
    project: z.string(),
    title: z.string(),
    when: z.string(),
    decision: z.object({
      context: z.string(),
      alternatives: z.array(z.string()),
      choice: z.string(),
      why: z.string(),
      outcome: z.string(),
    }),
    public: z.boolean().default(false),
    order: z.number().int().default(0),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.enum(['report', 'retro']),
    /** public/files/ 아래 경로. 리포트 원본 PDF. */
    file: z.string().optional(),
    summary: z.string().optional(),
    /** 연결된 프로젝트 slug */
    project: z.string().optional(),
    public: z.boolean().default(false),
  }),
});

export const collections = { projects, episodes, writing };
