---
project: debate
title: 답 추출이 실패해도 예외를 내지 않게 채점 규칙을 짰다
when: 2026-06
decision:
  context: 모델 출력에는 요청한 "Final answer:" 표식이 없거나, greedy decoding이 같은 문장을 반복하는 퇴화 출력이 섞였다.
  alternatives:
    - 표식이 없으면 해당 기록을 버린다
    - 표식 근처의 값을 우선 쓰고, 없으면 마지막 숫자나 마지막 줄로 물러나며 절대 예외를 내지 않는다
  choice: 단계적으로 물러나는 추출기를 썼다
  why: 10,800개 기록에서 일부가 빠지면 조건 간 비교가 어긋난다. GSM8K는 마지막 숫자 비교, HotpotQA는 소문자·구두점·관사 제거 뒤 포함 관계로 정규화 EM을 판정했다. 반복 퇴화는 repetition penalty 1.15로 억제하되 결정론은 유지했다.
  outcome: 채점 규칙을 코드로 고정해 재집계가 저장 지표와 일치했다. 독립 재채점은 하지 않았다.
public: true
order: 1
---
