import { describe, expect, it } from 'vitest'
import { demoCommunitySeeds } from '../../data/community/seed'
import { getDataSource } from '../../data/registry'
import { maskProfanity, moderate } from './moderation'
import { blockMessage } from './posts'

// 선수 이름은 리그 명단에서 받는다 (테스트에서는 두 명). "김OO" 자리에 김도윤을 쓴다
const ctx = { names: ['김도윤', '이하준'] }
const judge = (t: string) => moderate(t, ctx)

describe('사용자가 지정한 문장', () => {
  it.each([
    ['오늘 수비 진짜 ㅂㅅ같네', 'mild'],
    ['너 ㅂㅅ이냐', 'block'],
    ['병1신 같은 수비', 'block'],
    ['김도윤 오늘 볼질 좆같네', 'mild'],
    ['김도윤 얼굴부터 좆같이 생김', 'block'],
    ['심판 씨발 저게 스트라이크냐', 'mild'],
    ['감독 니애미', 'block'],
    ['김도윤 오늘도 얼굴 좆같네', 'block'], // 외모 낱말이 플레이 낱말("오늘")보다 우선
    ['김도윤 인간 쓰레기', 'block'], // 존재 비하
    ['씨발 홈런 미쳤다', 'mild'],
    ['니 말이 맞다 씨발 오늘 대박', 'ambiguous'], // 2인칭과 욕이 떨어져 있음 → 경고 후 선택
  ] as const)('%s → %s', (text, level) => {
    expect(judge(text).level).toBe(level)
  })

  it('차단 이유: 분류', () => {
    expect(judge('너 ㅂㅅ이냐')).toMatchObject({ reasons: ['인신공격(다른 사용자)'] })
    expect(judge('병1신 같은 수비')).toMatchObject({ reasons: ['혐오·비하'] })
    expect(judge('김도윤 얼굴부터 좆같이 생김')).toMatchObject({ reasons: ['인신공격(선수·심판·감독)'] })
    expect(judge('김도윤 오늘도 얼굴 좆같네')).toMatchObject({ reasons: ['인신공격(선수·심판·감독)'] })
    expect(judge('김도윤 인간 쓰레기')).toMatchObject({ reasons: ['인신공격(선수·심판·감독)'] })
    expect(judge('감독 니애미')).toMatchObject({ reasons: ['패드립'] })
  })
})

describe('차단: 누구를 향하든', () => {
  it.each([
    ['느금마 수비', '패드립'],
    ['니 애비가 그렇게 가르쳤냐', '패드립'],
    ['니 엄마 씨발', '패드립'],
    ['찾아가서 패버린다', '협박'],
    ['죽어라 진짜', '협박'],
    ['칼로 찔러버릴까', '협박'],
    ['병신 같은 수비', '혐오·비하'],
    ['병 신 같은 주루', '혐오·비하'],
    ['빙신 같네', '혐오·비하'],
    ['틀딱들 응원 시끄럽네', '혐오·비하'],
    ['한남충 같은 소리', '혐오·비하'],
    ['전라디언은 역시', '혐오·비하'],
    ['쪽바리 용병', '혐오·비하'],
    ['창녀 같은 소리', '성적 모욕'],
    ['연락 010-1234-5678', '개인정보'],
    ['010 1234 5678로 연락', '개인정보'],
    ['01012345678', '개인정보'],
    ['900101-1234567', '개인정보'],
  ] as const)('%s → %s', (text, category) => {
    const r = judge(text)
    expect(r.level).toBe('block')
    if (r.level === 'block') expect(r.reasons).toContain(category)
  })
})

describe('차단: 인신공격', () => {
  it.each([
    // 다른 사용자: 2인칭·글쓴이 지칭이 욕과 바로 붙어 있음 (ㅂㅅ 포함, 우회 표현 포함)
    ['니가 씨발 뭘 알아', '인신공격(다른 사용자)'],
    ['글쓴이 좆도 모르네', '인신공격(다른 사용자)'],
    ['너ㅂㅅ이냐', '인신공격(다른 사용자)'],
    ['너 진짜 쓰레기네', '인신공격(다른 사용자)'],
    ['니가 씨 1 발 뭘 알아', '인신공격(다른 사용자)'],
    ['꺼져 너', '인신공격(다른 사용자)'],
    // 선수·심판·감독: 사람 자체 비하(외모·존재·호칭)는 플레이 낱말이 있어도 차단
    ['김도윤 이 새끼 또 삼진', '인신공격(선수·심판·감독)'],
    ['저 심판 놈 없어져라', '인신공격(선수·심판·감독)'],
    ['감독 같은 쓰레기 인간', '인신공격(선수·심판·감독)'],
    ['김도윤 못생겨서 보기 싫다', '인신공격(선수·심판·감독)'],
    ['이하준 돼지같이 뛰네', '인신공격(선수·심판·감독)'],
    ['이하준 오늘 수비 보니까 살 가치가 없다', '인신공격(선수·심판·감독)'],
    // 이름이 없어도 이·저·그 + 호칭은 특정 사람을 가리킨다
    ['저 새끼 또 삼진', '인신공격(선수·심판·감독)'],
  ] as const)('%s → %s', (text, category) => {
    const r = judge(text)
    expect(r.level).toBe('block')
    if (r.level === 'block') expect(r.reasons).toContain(category)
  })
})

describe('허용: 경기·플레이·상황에 대한 일반 욕 (가리기 대상)', () => {
  it.each([
    '오늘 수비 진짜 좆같네',
    '씨발 또 병살이야',
    '9회 운영 ㅂㅅ같네',
    '감독 교체 타이밍 개판이네',
    '이하준 송구 존나 답답하다',
    '심판 판정 지랄 맞네',
    '오늘 수비 쓰레기네',
    '너무 못하네 씨발', // "너무" 속의 너는 2인칭이 아니다
    '아니 씨발 이게 왜 볼이야', // "아니" 속의 니도 아니다
    '언니랑 직관 왔는데 씨발 졌다',
    '와이프랑 직관 갔는데 씨발 졌다', // 가족 낱말과 욕이 떨어져 있음
    '존 나 잘한다',
    '씨1발 역전 실화냐',
  ])('%s', (text) => {
    expect(judge(text).level).toBe('mild')
  })

  it('허용된 욕은 무엇인지 알려 준다', () => {
    expect(judge('오늘 수비 진짜 ㅂㅅ같네')).toEqual({ level: 'mild', found: ['ㅂㅅ'] })
  })
})

describe('문제없음 (오탐 방지)', () => {
  it.each([
    '오늘 wRC+ 140 찍었네요',
    '시발점에서 다시 출발',
    '엄마랑 직관 왔어요',
    '오늘 타선 죽었네',
    '이 홈런 죽인다',
    '김도윤 얼굴 표정 좋네', // 외모 낱말이 있어도 욕이 없으면 문제없음
    '니 말이 맞다',
    '이년차 신인 대박',
    '새끼손가락 다쳤대',
    '등번호 10번',
    '2026년 10월 31일 경기',
    'OPS .910, 타율 .310',
  ])('%s', (text) => {
    expect(judge(text)).toEqual({ level: 'ok' })
  })
})

describe('애매함 → 경고 후 선택', () => {
  it.each([
    ['니 말이 맞다 씨발 오늘 대박', '다른 사용자를 향한 욕일 수 있음'],
    ['너는 오늘 경기 처음부터 끝까지 다 봤는데도 씨발 그런 소리 하냐', '다른 사용자를 향한 욕일 수 있음'],
    ['김도윤 ㅂㅅ', '선수·심판·감독을 향한 욕일 수 있음'], // 플레이 낱말 없음
    ['심판 씨발', '선수·심판·감독을 향한 욕일 수 있음'],
    ['새끼들 정신 좀 차려라', '사람을 욕하는 말'], // 호칭만 단독
    ['개새끼', '사람을 욕하는 말'],
  ] as const)('%s → %s', (text, reason) => {
    const r = judge(text)
    expect(r.level).toBe('ambiguous')
    if (r.level === 'ambiguous') expect(r.reasons).toContain(reason)
  })

  it('차단 사유가 하나라도 있으면 애매함보다 차단이 우선', () => {
    expect(judge('새끼들 정신 차려라 병신들').level).toBe('block')
  })
})

describe('차단 안내 문구', () => {
  it('어떤 이유로, 어떤 표현 때문인지 알려 준다', () => {
    const r = judge('너 ㅂㅅ이냐')
    if (r.level !== 'block') throw new Error('차단이어야 함')
    expect(blockMessage(r)).toBe('이대로는 올릴 수 없어요. 인신공격(다른 사용자): ‘너’와 ‘ㅂㅅ’을 함께 썼어요. 표현을 고쳐 주세요.')
    const p = judge('병1신 같은 수비')
    if (p.level !== 'block') throw new Error('차단이어야 함')
    expect(blockMessage(p)).toContain('혐오·비하: ‘병신’')
  })
})

describe('거친 표현 가리기', () => {
  it.each([
    ['오늘 수비 진짜 ㅂㅅ같네', '오늘 수비 진짜 ●●같네'],
    ['존 나 잘한다', '●●● 잘한다'], // 사이에 끼운 공백까지 가린다
    ['씨1발 역전 실화냐', '●●● 역전 실화냐'],
    ['김도윤 오늘 볼질 좆같네', '김도윤 오늘 볼질 ●같네'],
    ['새끼들 정신 좀 차려라', '●●들 정신 좀 차려라'], // 「주의」 글에 남는 사람 비하 말도 가린다
    ['존나 꺼져 진짜 존나', '●● ●● 진짜 ●●'],
    ['시발점에서 출발', '시발점에서 출발'],
    ['평범한 글', '평범한 글'],
  ])('%s → %s', (text, masked) => {
    expect(maskProfanity(text)).toBe(masked)
  })
})

describe('시연용 예시 글', async () => {
  const ds = await getDataSource('demo').load()
  const seeds = demoCommunitySeeds(ds)
  const names = [...ds.hitters, ...ds.pitchers].map((p) => p.name)

  it('예시 글은 모두 차단·애매함에 걸리지 않는다', () => {
    for (const s of seeds) expect(['ok', 'mild'], s.id).toContain(moderate(s.text, { names }).level)
  })

  it('허용되는 수준의 욕이 든 예시 글이 하나 있고, 기본 설정에서는 가려 보인다', () => {
    const swear = seeds.find((s) => s.id === 'demo-post-7')!
    expect(moderate(swear.text, { names })).toEqual({ level: 'mild', found: ['좆'] })
    expect(maskProfanity(swear.text)).toContain('오늘 수비 진짜 ●같네')
  })
})

