---
project: image-eval
title: 오버샘플링과 손실 가중치를 함께 쓰는 조합도 확인했다
when: 2025-04
decision:
  context: 손실 가중치만으로 고득점 구간이 개선된 뒤, 오버샘플링을 더하면 추가 이득이 있는지 확인해야 했다.
  alternatives:
    - 손실 가중치 단독
    - 오버샘플링 + 손실 가중치
  choice: 손실 가중치 단독
  why: EfficientNet 계열에서는 일부 조합에서 시너지가 있었지만, ConvNeXt 계열에서는 추가 효과가 없거나 오히려 성능이 떨어졌다. 4~5점 데이터가 매우 적을 때만 오버샘플링이 의미가 있었다.
  outcome: 최종 백본이 ConvNeXt V2였으므로 오버샘플링 배수는 코드에 남기되 모두 1로 두었다.
public: true
order: 2
---
