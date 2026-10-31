# MLB 서번트 — 실제 CSV로 확인할 목록

뼈대(5단계)는 실제 파일 없이 만들었다. 실제 데이터를 연결할 때 아래를 하나씩 확인하고, 확인한 항목은 이 문서에서 지우거나 결과를 덮어쓴다.

## 1. 지금 "없음"으로 둔 기록 중 서번트에 있을 것으로 보이는 것

사용자 확인 사항(2026-10-31): 서번트에는 아래 기록이 있다. 지금은 `available`에서 없음(false)으로 두었다.

| 서번트 기록 (예상) | 앱 필드 후보 | 확인할 것 |
|---|---|---|
| 구종 사용 비율 (Pitch Arsenal) | `pitcherTracking.mix` (`RawPitchMix[]`) | 구종 이름 → 한글 이름 대응표, 비율 단위(0~100 → 0~1), 투수당 구종 수 |
| 포수 프레이밍 (Catcher Framing) | `fielding.frmR` | 단위가 득점(runs)인지 스트라이크 수인지. KBO는 ABS 도입으로 비중을 낮춘다는 PRD 원칙 유지 |
| 포수 블로킹 (Catcher Blocking) | `fielding.blkR` | 단위(득점 / 블록 수), 부호 방향 |
| 포수 도루 저지 (Catcher Throwing) | `fielding.csR`, `fielding.csp` | 저지 득점과 저지율이 각각 있는지, 저지율 단위 |
| 포수 팝 타임 (Pop Time) | 없음 → 새 필드 필요 | 초 단위인지, 2루·3루 송구가 나뉘는지. 화면·카탈로그에 지표 추가 여부 결정 |
| 외야 송구 강도 (Arm Strength) | 없음 → 새 필드 필요 (`armR`은 득점이라 단위가 다름) | mph → km/h 변환, 포지션별(내야 포함) 제공 여부 |
| Fielding Run Value | 없음 → 새 필드 후보 | DRS와 같은 "수비로 막은 점수"지만 계산 방식이 다르므로 DRS 칸에 넣지 않는다. 종합 수비 지표에 별도 줄로 추가할지 결정 |

새 필드를 추가하면 `RawFielding`/트래킹 타입, `data/availability.ts`의 키 목록, `domain/availability.ts`의 지표 연결, `domain/catalog.ts` 설명을 함께 고친다.

## 2. 뼈대에서 가정한 것

- **열 이름**: `savant.ts`의 행 타입 필드 이름(`exit_velocity_avg`, `hard_hit_percent`, `sprint_speed`, `hp_to_1b`, `outs_above_average` 등)은 리더보드 CSV 열 이름을 기억에 기대어 따랐다. 실제 파일 머리글과 대조한다.
- **백분율 단위**: `hard_hit_percent`, `barrel_batted_rate`, `whiff_percent`를 0~100으로 가정하고 0~1로 바꾼다. 배럴 비율의 분모가 타구(BBE)인지 타석(PA)인지 확인한다.
- **구속**: `fastball_avg_speed`를 포심 평균으로 가정했다. 서번트가 포심·싱커를 어떻게 나누는지 확인한다.
- **홈→1루 시간**: 스프린트 스피드 리더보드의 `hp_to_1b`가 초 단위인지 확인한다.
- **기본 기록**: 타석·안타·이닝 등은 서번트 커스텀 리더보드나 MLB Stats API에서 채운다고 가정했다. 어느 쪽을 쓸지, 두 출처의 선수 ID가 같은지 확인한다.
- **포지션**: 선수당 주 포지션 하나(`pos`)만 받는다. 여러 포지션을 뛴 선수의 처리(가장 많이 뛴 포지션)를 정한다.
- **타구 단위 데이터**: Statcast 검색 CSV의 `launch_speed`(mph), `launch_angle`, 안타 여부(`events`에서 판정)를 가정했다.
- **리그 상수**: wOBA 가중치·wOBA 스케일·타석당 득점 등은 시즌마다 다르므로 코드에 넣지 않고 바깥에서 받는다. 출처(예: FanGraphs Guts)와 이용 조건을 확인한다.
- **이용 조건**: PRD대로 KBO 대체가 아니라 화면 검증용으로만 쓴다. 서번트 데이터 이용 조건을 확인한다.
