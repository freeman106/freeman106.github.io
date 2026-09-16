---
project: gsm8k-dpo
title: 제공된 SFT 학습률을 그대로 믿지 않았다
when: 2026-05
decision:
  context: 템플릿의 SFT 학습률 2e-7에서 loss가 1.59에서 1.12로만 움직였다. 학습이 거의 일어나지 않은 값이었다.
  alternatives:
    - 템플릿 설정을 유지하고 다음 단계로 넘어간다
    - 학습률을 1e-6으로 올려 다시 학습한다
  choice: 학습률을 올렸다
  why: 주어진 설정이 항상 검증된 값은 아니다. 변경 하나만 적용해 효과를 분리했다.
  outcome: 이 변경만으로 +0.05가 나왔다. 이후 모든 단계에서 기본값을 먼저 확인하는 습관이 됐다.
public: true
order: 1
---
