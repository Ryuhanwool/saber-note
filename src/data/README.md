# data — ① 불러오기 층

리그를 아는 유일한 층입니다. 리그별 어댑터(`demo/`, `mlb/`, `kbo/`)가 원시 기록과 리그 상수를 `RawDataset`으로 넘깁니다.

- domain·ui·react를 import하지 않습니다 (`.oxlintrc.json`에서 강제).
- ui는 어댑터를 직접 부르지 않고 `registry.ts`를 거칩니다.
