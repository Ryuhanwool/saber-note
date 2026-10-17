// 화면에 보여 주는 지표의 정의와 쉬운 설명. 설명 문구는 데모 HTML의 M 객체에서 옮겼다.
// 설명은 고정 텍스트로 관리한다 (PRD: AI는 초안 작성 보조에만 쓴다).

export type MetricDef = {
  label: string
  /** 소수점 자릿수 */
  digits: number
  /** pct: 0.123 → 12.3%, rate: 0.345 → .345, num: 그대로 */
  kind: 'pct' | 'rate' | 'num'
  /** 높을수록 좋은지. null이면 좋고 나쁨이 없는 지표(백분위 막대 대신 리그 평균만 보여 줌) */
  better: 'higher' | 'lower' | null
  /** 양수에 + 붙이기 */
  signed?: boolean
  /** 천 단위 구분 (예: 2,450) */
  grouped?: boolean
  unit?: string
  /** 값이 없을 때 막대 자리에 보여 줄 문구 */
  emptyText?: string
  desc: string
  scale: string
}

export const CATALOG = {
  WAR: {
    label: 'WAR', digits: 2, kind: 'num', better: 'higher',
    desc: '쉽게 구할 수 있는 2군급 선수(대체 선수) 대신 이 선수가 뛰어서 팀이 더 얻은 승리 수예요.',
    scale: '2 이상 주전급, 5 이상 리그 정상급',
  },
  wrcp: {
    label: 'wRC+', digits: 0, kind: 'num', better: 'higher',
    desc: '타석에서 만든 득점 가치를 리그 평균 100에 맞춘 값이에요. 140이면 평균보다 40% 더 만들어 낸 것.',
    scale: '120 이상 좋음, 80~120 보통, 80 미만 아쉬움',
  },
  ops: {
    label: 'OPS', digits: 3, kind: 'rate', better: 'higher',
    desc: '출루율과 장타율을 더한 값이에요. 얼마나 자주 나가고, 얼마나 멀리 치는지를 함께 봅니다.',
    scale: '.850 이상 좋음, .700 미만 아쉬움',
  },
  woba: {
    label: 'wOBA', digits: 3, kind: 'rate', better: 'higher',
    desc: '타격 결과마다 득점 가치를 다르게 매긴 출루율이에요. 볼넷보다 홈런을 훨씬 크게 칩니다.',
    scale: '.370 이상 좋음, .310 미만 아쉬움',
  },
  babip: {
    label: 'BABIP', digits: 3, kind: 'rate', better: null,
    desc: '홈런과 삼진을 뺀 인플레이 타구가 안타가 된 비율이에요. 운의 영향이 커서, 리그 평균에서 크게 벗어나면 다음 시즌에 평균 쪽으로 돌아오는 경우가 많아요.',
    scale: '좋고 나쁨보다 운의 신호로 봅니다',
  },
  bbp: {
    label: '볼넷 비율', digits: 1, kind: 'pct', better: 'higher',
    desc: '타석 중 볼넷을 얻은 비율이에요. 선구안을 보여 줍니다.',
    scale: '10% 이상 좋음, 6% 미만 아쉬움',
  },
  kp: {
    label: '삼진 비율', digits: 1, kind: 'pct', better: 'lower',
    desc: '타석 중 삼진을 당한 비율이에요. 낮을수록 좋아요.',
    scale: '15% 이하 좋음, 25% 이상 아쉬움',
  },
  hr: {
    label: '홈런', digits: 0, kind: 'num', better: 'higher',
    desc: '시즌 홈런 수예요.',
    scale: '20개 이상 거포',
  },
  oaa: {
    label: 'OAA', digits: 0, kind: 'num', better: 'higher', signed: true, emptyText: '지명타자는 수비 기록이 없어요',
    desc: '평균적인 수비수와 비교해 아웃을 몇 개 더 잡았는지예요. 타구가 얼마나 어려웠는지까지 고려합니다.',
    scale: '+5 이상 좋음, -5 이하 아쉬움',
  },
  drs: {
    label: 'DRS', digits: 0, kind: 'num', better: 'higher', signed: true,
    desc: '평균적인 수비수보다 수비로 몇 점을 더 막았는지(Defensive Runs Saved)예요. 범위, 송구, 병살, 실책을 모두 합칩니다.',
    scale: '+5 이상 좋음, +10 이상 골든글러브급, -5 이하 아쉬움',
  },
  uzr: {
    label: 'UZR', digits: 1, kind: 'num', better: 'higher', signed: true,
    desc: '범위·실책·병살·송구 득점을 더한 종합 수비 지표예요. 아래 세부 구성의 합계이고, 이 데모에서는 WAR의 수비 점수로 쓰여요.',
    scale: '+5 이상 좋음, -5 이하 아쉬움',
  },
  zr: {
    label: 'ZR', digits: 1, kind: 'num', better: 'higher', signed: true,
    desc: 'OOTP 시리즈 수비 화면에 나오는 존 레이팅이에요. 자기 수비 구역으로 온 타구를 얼마나 잘 처리했는지를 득점으로 나타내요. 계산 방식이 달라 DRS·UZR과 값이 조금씩 달라요.',
    scale: '+5 이상 좋음',
  },
  rngR: {
    label: '범위 득점', digits: 1, kind: 'num', better: 'higher', signed: true,
    desc: '평균보다 더 넓은 범위의 타구를 잡아 막은 점수예요.',
    scale: '+3 이상 좋음',
  },
  errR: {
    label: '실책 득점', digits: 1, kind: 'num', better: 'higher', signed: true,
    desc: '실책을 평균보다 적게 해서 막은 점수예요. 실책이 많으면 마이너스가 돼요.',
    scale: '+1 이상 좋음',
  },
  dpR: {
    label: '병살 득점', digits: 1, kind: 'num', better: 'higher', signed: true,
    desc: '병살 기회에서 평균보다 병살을 더 많이 완성해 막은 점수예요. 내야수만 해당돼요.',
    scale: '+1 이상 좋음',
  },
  armR: {
    label: '송구 득점', digits: 1, kind: 'num', better: 'higher', signed: true,
    desc: '강한 어깨로 주자의 추가 진루를 막거나 보살로 잡아 낸 점수예요. 외야수만 해당돼요.',
    scale: '+2 이상 좋음',
  },
  frmR: {
    label: '프레이밍 득점', digits: 1, kind: 'num', better: 'higher', signed: true,
    desc: '볼을 스트라이크처럼 잡아 판정을 유리하게 만든 점수예요. KBO는 2024년부터 자동 투구 판정(ABS)을 써서 실제 서비스에서는 비중이 작아요.',
    scale: '+1 이상 좋음',
  },
  blkR: {
    label: '블로킹 득점', digits: 1, kind: 'num', better: 'higher', signed: true,
    desc: '원바운드 공을 몸으로 막아 폭투·포일을 줄인 점수예요.',
    scale: '+1 이상 좋음',
  },
  csR: {
    label: '도루 저지 득점', digits: 1, kind: 'num', better: 'higher', signed: true,
    desc: '도루 주자를 잡아 내 막은 점수예요.',
    scale: '+1 이상 좋음',
  },
  csp: {
    label: '도루 저지율', digits: 1, kind: 'pct', better: 'higher',
    desc: '상대 도루 시도 중 잡아 낸 비율이에요.',
    scale: '35% 이상 좋음, 20% 미만 아쉬움',
  },
  fpct: {
    label: '수비율', digits: 3, kind: 'rate', better: 'higher',
    desc: '수비 기회 중 실책 없이 처리한 비율이에요.',
    scale: '포지션마다 다름',
  },
  ev: {
    label: '평균 타구 속도', digits: 1, kind: 'num', better: 'higher', unit: ' km/h',
    desc: '방망이에 맞은 공이 날아가는 평균 속도예요. 빠를수록 안타가 될 확률이 높아요.',
    scale: '145 km/h 이상 강타자',
  },
  maxev: {
    label: '최고 타구 속도', digits: 1, kind: 'num', better: 'higher', unit: ' km/h',
    desc: '시즌에 가장 세게 친 타구의 속도예요. 타고난 힘을 보여 줍니다.',
    scale: '180 km/h 이상 최상위',
  },
  hard: {
    label: '강한 타구 비율', digits: 1, kind: 'pct', better: 'higher',
    desc: '타구 속도 153 km/h 이상으로 친 타구의 비율이에요.',
    scale: '45% 이상 좋음',
  },
  barrel: {
    label: '배럴 비율', digits: 1, kind: 'pct', better: 'higher',
    desc: '타구 속도와 발사각이 모두 이상적이어서 장타가 될 확률이 아주 높은 타구의 비율이에요.',
    scale: '10% 이상 좋음',
  },
  xba: {
    label: '기대 타율', digits: 3, kind: 'rate', better: 'higher',
    desc: '타구 속도와 발사각만으로 계산한 타율이에요. 실제 타율보다 높으면 운이 없었다는 신호일 수 있어요.',
    scale: '.280 이상 좋음',
  },
  sprint: {
    label: '스프린트 스피드', digits: 2, kind: 'num', better: 'higher', unit: ' m/s',
    desc: '전력 질주할 때 가장 빠른 1초 구간의 속도예요.',
    scale: '8.6 m/s 이상 빠른 편',
  },
  bsr: {
    label: '주루 득점', digits: 1, kind: 'num', better: 'higher', signed: true,
    desc: '도루와 추가 진루를 모두 합쳐 주루로 만든 득점을 리그 평균과 비교한 값(BsR)이에요. WAR에도 들어가요.',
    scale: '+3 이상 좋음, -3 이하 아쉬움',
  },
  sb: {
    label: '도루', digits: 0, kind: 'num', better: 'higher',
    desc: '시즌 도루 성공 수예요.',
    scale: '20개 이상 준족',
  },
  sbp: {
    label: '도루 성공률', digits: 1, kind: 'pct', better: 'higher', emptyText: '도루 시도가 없어요',
    desc: '도루를 시도해 성공한 비율이에요. 실패하면 아웃이 늘어 손해가 커서, 대략 70% 이상 성공해야 팀에 득이 돼요.',
    scale: '80% 이상 좋음, 65% 미만 손해',
  },
  wsb: {
    label: '도루 득점', digits: 1, kind: 'num', better: 'higher', signed: true,
    desc: '도루 성공과 실패를 득점 가치로 바꿔 리그 평균과 비교한 값(wSB)이에요.',
    scale: '+2 이상 좋음',
  },
  xbt: {
    label: '추가 진루율', digits: 1, kind: 'pct', better: 'higher',
    desc: '안타 때 한 베이스 더 간 비율이에요. 예: 1루 주자가 단타 때 3루까지, 2루타 때 홈까지.',
    scale: '50% 이상 좋음',
  },
  h2f: {
    label: '홈→1루 시간', digits: 2, kind: 'num', better: 'lower', unit: '초',
    desc: '타격 후 1루에 도착하기까지 걸린 시간이에요. 짧을수록 내야 안타와 병살 피하기에 유리해요.',
    scale: '4.10초 이하 빠른 편',
  },
  era: {
    label: 'ERA', digits: 2, kind: 'num', better: 'lower',
    desc: '9이닝당 내준 자책점이에요. 수비와 운의 영향도 함께 들어 있어요.',
    scale: '3.50 이하 좋음, 5.00 이상 아쉬움',
  },
  fip: {
    label: 'FIP', digits: 2, kind: 'num', better: 'lower',
    desc: '홈런, 볼넷, 삼진처럼 투수가 직접 책임지는 결과만으로 계산한 평균자책점이에요. 수비의 영향을 뺐어요.',
    scale: '3.50 이하 좋음, 5.00 이상 아쉬움',
  },
  whip: {
    label: 'WHIP', digits: 2, kind: 'num', better: 'lower',
    desc: '1이닝당 내보낸 주자(안타+볼넷) 수예요.',
    scale: '1.20 이하 좋음, 1.50 이상 아쉬움',
  },
  pk: {
    label: '탈삼진 비율', digits: 1, kind: 'pct', better: 'higher',
    desc: '상대한 타자 중 삼진으로 잡은 비율이에요.',
    scale: '25% 이상 좋음',
  },
  pbb: {
    label: '볼넷 허용 비율', digits: 1, kind: 'pct', better: 'lower',
    desc: '상대한 타자 중 볼넷을 내준 비율이에요. 낮을수록 좋아요.',
    scale: '6% 이하 좋음, 10% 이상 아쉬움',
  },
  velo: {
    label: '평균 직구 구속', digits: 1, kind: 'num', better: 'higher', unit: ' km/h',
    desc: '직구의 평균 속도예요.',
    scale: '148 km/h 이상 빠른 편',
  },
  spin: {
    label: '직구 회전수', digits: 0, kind: 'num', better: 'higher', grouped: true, unit: ' rpm',
    desc: '직구가 1분에 도는 횟수예요. 많을수록 공이 덜 떨어져 떠오르는 듯 보여요.',
    scale: '2,450 rpm 이상 좋음',
  },
  whiff: {
    label: '헛스윙 비율', digits: 1, kind: 'pct', better: 'higher',
    desc: '타자가 스윙했을 때 헛스윙한 비율이에요.',
    scale: '30% 이상 좋음',
  },
} satisfies Record<string, MetricDef>

export type MetricKey = keyof typeof CATALOG

export const metricDef = (key: MetricKey): MetricDef => CATALOG[key]
