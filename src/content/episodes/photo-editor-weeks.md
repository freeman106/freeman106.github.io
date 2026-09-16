---
project: photo-editor
title: 4주 동안의 시행착오
when: 2025-04
decision:
  context: 편집기를 만드는 동안 매주 한 번씩 접근을 바꿔야 했다.
  alternatives:
    - CSS transform과 clip-path
    - Canvas 2D
  choice: Canvas 2D
  why: 1주차에 clip-path로는 픽셀 데이터를 추출할 수 없다는 것을 확인하고 Canvas로 옮겼다. 2주차에는 Canvas 변환이 코드 작성 순서의 역순으로 적용되는 원리를 이해했다. 3주차에는 크롭 핸들을 리팩터링하고 크롭 영역이 음수가 되는 경우를 막았다. 4주차에 PointerEvent에서 TouchEvent로 바꾸고 stale closure와 제스처 전환 점프를 해결했다.
  outcome: 한 주에 하나씩 문제를 정리한 기록이 남았다.
public: true
order: 1
---
