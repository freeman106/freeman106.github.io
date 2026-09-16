---
project: image-eval
title: 입력 해상도를 224에서 384로 올렸다
when: 2025-04
decision:
  context: 매력도 판단에는 이미지의 세부가 중요한데 224 입력에서는 ConvNeXt-Base와 V2-Base가 convnext_small과 비슷한 수준에 머물렀다.
  alternatives:
    - 224 입력을 유지하고 모델 크기만 키우기
    - 384 입력으로 바꾸고 배치 크기를 줄이기
  choice: 384 입력
  why: 전체 오차와 점수별 오차가 거의 모든 항목에서 개선됐다. 대신 학습 시간이 3~4배 늘고 메모리 때문에 배치를 32에서 16 이하로 줄여야 했다.
  outcome: ConvNeXt-Base와 V2-Base 계열은 384 입력을 필수로 두었다.
public: true
order: 1
---
