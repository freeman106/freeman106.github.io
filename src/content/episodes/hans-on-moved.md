---
project: hans
title: 동기화 파일의 이동 이벤트를 전사 시작 조건에 넣었다
when: 2026-04
decision:
  context: Syncthing은 파일을 임시 이름으로 받은 뒤 rename하는 방식으로 전송한다. 생성 이벤트만 보던 watchdog은 최종 파일을 감지하지 못했다.
  alternatives:
    - 폴더를 주기적으로 스캔한다
    - on_moved 핸들러를 추가하고 임시 파일 prefix를 필터링한다
  choice: on_moved 처리와 prefix 필터
  why: 도구의 이름이 아니라 실제 파일이 도착하는 방식을 관찰해 원인을 찾았다. 주기 스캔은 지연과 중복 전사를 낳는다.
  outcome: 동기화가 끝난 파일만 전사 대기열에 들어간다. 누락 건수 같은 수치는 기록하지 않았다.
public: true
order: 1
---
