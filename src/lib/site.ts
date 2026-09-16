/** 사이트 전역 상수. 개인 정보는 여기서만 관리한다. */
export const SITE = {
  name: '김환욱',
  nameEn: 'Hwan Uk Kim',
  positioning:
    'AI를 실제 작업 흐름에 연결하는 엔지니어.',
  /** 주 지원 직무. 홈 첫 화면과 print 뷰 상단에 쓴다. */
  targets: ['AI Agent', 'MLOps', '데이터 파이프라인', '백엔드 · 플랫폼'],
  description:
    '김환욱(Hwan Uk Kim)의 포트폴리오. AI를 실제 작업 흐름에 연결하는 엔지니어. 이미지 평가 모델, LLM 에이전트, 다중 에이전트 토론 연구를 중심으로 한 프로젝트 기록.',
  /** 연락 이메일. 비워 두면 화면에 표시하지 않는다. */
  email: '',
  github: 'https://github.com/freeman106',
  githubHandle: 'freeman106',
  huggingface: 'https://huggingface.co/hwanuk16',
} as const;

export const ROLE_LABEL: Record<string, string> = {
  agent: '에이전트',
  mlops: 'MLOps',
  backend: '백엔드',
  data: '데이터',
  frontend: '프론트엔드',
};
