export interface Period {
  start?: string;
  end?: string;
  tentative?: boolean;
}

const ym = (s: string) => (s.length === 7 ? s.replace('-', '.') : s);

/** "2025.03 – 2025.06" · "2024" · "2026.03 – 현재". 기간이 없으면 빈 문자열. */
export function formatPeriod(p: Period): string {
  if (!p.start) return '';
  if (!p.end || p.end === p.start) return ym(p.start);
  if (p.end === 'present') return `${ym(p.start)} – 현재`;
  return `${ym(p.start)} – ${ym(p.end)}`;
}

/** 결과 항목의 값과 단위를 한 문자열로. */
export function formatResult(r: { value?: number | string; unit?: string }): string {
  if (r.value === undefined) return '';
  const v = typeof r.value === 'number' ? r.value.toLocaleString('ko-KR') : r.value;
  if (!r.unit) return v;
  return /^[%a-zA-Z]/.test(r.unit) ? `${v}${r.unit}` : `${v} ${r.unit}`;
}
