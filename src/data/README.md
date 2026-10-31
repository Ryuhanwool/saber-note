# data — ① 불러오기 층

리그를 아는 유일한 층입니다. 리그별 어댑터(`demo/`, `mlb/`, `kbo/`)가 원시 기록과 리그 상수를 `RawDataset`으로 넘깁니다.

- domain·ui·react를 import하지 않습니다 (`.oxlintrc.json`에서 강제).
- ui는 어댑터를 직접 부르지 않고 `registry.ts`를 거칩니다.
- 출처는 `meta.available`로 기록 필드 하나하나의 있음/없음을 알린다. 없다고 한 필드는 모든 선수에게 null이어야 한다 (`unavailableButPresent`로 검사). 단위는 km/h·m/s·0~1 비율로 바꿔서 넘긴다.
