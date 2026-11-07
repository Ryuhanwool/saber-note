// 커뮤니티 작성 제한 (규칙 기반). 서버에서도 쓸 수 있게 브라우저 API·외부 패키지에 의존하지 않는다.
//
// 기준 (PRD v1.6 3단계):
// - 경기·플레이·상황에 대한 일반 욕설은 허용한다 (읽는 사람이 「거친 표현 가리기」를 켜면 ●●).
// - 패드립·협박·혐오·비하(「병신」 포함)·성적 모욕·개인정보는 누구를 향하든 막는다.
// - 다른 사용자를 가리키는 말(너·니가·글쓴이 …)이 욕과 바로 붙어 있으면 인신공격으로 막는다.
// - 선수·심판·감독·코치는 이름·직함과 함께 써도 플레이·직무에 대한 욕은 허용하고,
//   사람 자체를 욕하는 말(외모·가족·존재 비하)은 막는다. 이 비하 낱말은 플레이 낱말보다 항상 우선한다.
// - 규칙으로 가를 수 없으면 「애매함」: 작성자에게 경고하고 고쳐 쓰기/그래도 올리기를 고르게 한다.

// ---------- 낱말 목록 (띄어쓰기·숫자·기호를 지운 뒤 찾는다) ----------

/** 일반 욕설: 상황·플레이에 쓰면 허용 (가리기 대상) */
export const GENERAL_SWEARS = [
  '씨발', '씨바', '씨빨', '시발', 'ㅅㅂ', 'ㅆㅂ', 'tlqkf', '썅', '좆', '존나', '졸라', 'ㅈㄴ',
  '지랄', 'ㅈㄹ', '염병', '개판', '개못', '꺼져', '닥쳐', '발암', 'ㅂㅅ', '쓰레기',
]

/** 사람 자체를 욕하는 말: 사람 비하 호칭·존재 비하 (선수 이름과 함께면 차단, 대상 없이 쓰면 애매함) */
export const PERSON_INSULTS = [
  '새끼', '새기', '색기', '세끼', '색끼', '놈들', '놈아', '미친놈', '개놈', '나쁜놈', '쓰레기놈', '같은놈',
  '미친년', '썅년', '개년', '이년아',
  '인간쓰레기', '쓰레기인간', '쓰레기같은인간', '인간말종', '버러지', '벌레같은', '기생충같은',
  '없어져라', '살가치', '태어나지말', '존재자체가',
]

/** 외모 비하 낱말: 그 자체로 비하 (선수 이름과 함께면 차단) */
export const APPEARANCE_INSULTS = ['못생', '낯짝', '면상', '대머리', '돼지같', '뚱뚱', '난쟁이', '오크같']

/** 외모 낱말: 그 자체로는 중립 (선수 이름 + 욕과 함께면 외모 비하로 차단) */
export const APPEARANCE_WORDS = ['얼굴', '생김', '생겼', '외모', '몸매', '키가', '피부']

/** 가족 낱말: 바로 옆에 욕이 오면 패드립 */
export const FAMILY_WORDS = ['엄마', '애미', '애비', '아빠', '부모', '엄니', '어머니', '아버지', '마누라', '와이프', '가족', '딸래미', '아들내미']

export const BLOCK_RULES: { category: BlockCategory; words: string[] }[] = [
  {
    category: '패드립',
    words: ['니애미', '느금마', '느금', '애미뒤', '애비뒤', '엠창', '엄창', '니미', '니엄마', '니애비', '느그애미', '느그애비', '애미없', '애비없', '부모없'],
  },
  {
    category: '협박',
    words: ['죽여버', '찾아가서', '칼로찔', '칼침', '패버리', '패죽', '쳐죽', '죽어라', '뒤져라', '뒤지고싶', '뒤져버', '불질러', '테러하'],
  },
  {
    category: '혐오·비하',
    words: [
      // 장애: 「병신」은 원래 단어와 우회 표현 모두 막는다 (초성 「ㅂㅅ」은 일반 욕)
      '병신', '븅신', '병쉰', '빙신', '애자', '장애인새끼', '정신병자',
      // 세대·성별·국적·지역
      '틀딱', '급식충', '맘충', '한남충', '김치녀', '된장녀', '쪽바리', '짱깨', '깜둥이',
      '전라디언', '경상디언', '개쌍도', '멍청도', '홍어족',
    ],
  },
  { category: '성적 모욕', words: ['창녀', '창년', '걸레년', '따먹', '강간', '성노리개', '보지같', '자지같'] },
]

/** 플레이·직무 낱말: 선수·심판·감독 이름·직함 + 일반 욕이어도 이 말이 있으면 플레이에 대한 욕으로 본다 */
export const PLAY_WORDS = [
  '수비', '타격', '투구', '볼질', '볼넷', '송구', '주루', '도루', '타구', '실책', '삼진', '병살', '홈런', '안타',
  '스윙', '배팅', '번트', '판정', '스트라이크', '아웃', '세이프', '교체', '작전', '운영', '기용', '라인업', '타순',
  '오늘', '경기', '이닝', '플레이', '컨디션', '제구', '구속', '볼배합', '리드', '콜', '판독', '로테이션', '타율', '방어율', '성적',
]

/** 심판·감독·코치 직함 */
export const OFFICIAL_TITLES = ['심판', '주심', '구심', '루심', '감독', '코치']

/** 걸러 낼 표현을 품고 있지만 문제없는 낱말 */
export const ALLOWED_PHRASES = ['시발점', '시발역', '시발택시', '새끼손가락']

/** 다른 사용자를 가리키는 2인칭 (띄어쓰기로 나뉜 낱말 하나일 때만. "너무", "아니" 속의 너·니는 아니다) */
const SECOND_PERSON = [
  '너', '넌', '널', '니', '니가', '네가', '너가', '너는', '너도', '너를', '니를', '너한테', '니한테', '너랑', '니랑',
  '너네', '니네', '너네들', '니들', '너희', '너희들', '느그', '느그들', '당신', '당신이', '당신은', '당신도', '님아', '너같은', '니같은',
]
/** 글쓴이 지칭 (뒤에 조사가 붙어도 된다) */
const AUTHOR_REFS = ['글쓴이', '작성자', '윗글', '윗댓', '쓰니']
const PARTICLES = ['', '이', '가', '은', '는', '도', '야', '님', '아']

/** 이·저·그 + 호칭 = 특정 사람을 가리켜 욕함 */
const DEMONSTRATIVES = ['이', '저', '그']
const HONORIFIC_INSULTS = ['새끼', '놈', '년']

/** 다른 사용자 지칭과 욕이 이만큼(정규화한 글자 수) 이하로 붙어 있으면 인신공격으로 막는다. 더 멀면 애매함 */
export const DIRECT_GAP = 2

export type BlockCategory =
  | '패드립' | '협박' | '혐오·비하' | '성적 모욕' | '개인정보' | '인신공격(다른 사용자)' | '인신공격(선수·심판·감독)'

export type ModerationResult =
  | { level: 'ok' }
  /** 허용: 일반 욕설이 있다 (가리기 대상) */
  | { level: 'mild'; found: string[] }
  /** 애매함: 경고 후 선택 */
  | { level: 'ambiguous'; reasons: string[]; found: string[]; details: string[] }
  /** 차단 */
  | { level: 'block'; reasons: BlockCategory[]; found: string[]; details: string[] }

export type ModerationContext = {
  /** 리그 선수의 전체 이름 (성 포함). 이름만으로는 흔한 낱말과 겹쳐서 쓰지 않는다 */
  names?: readonly string[]
}

// ---------- 정규화 ----------

/** 우회 표현을 잡기 위해 지우는 글자: 공백·숫자·기호 (●는 이미 가린 글자) */
const SKIP = /[\s\d_.,!?~\-*^'"`·…|\\/()[\]{}<>@#$%&+=:;●“”‘’]/

/** 소문자로 바꾸고 SKIP 글자를 지운 문자열과, 각 글자의 원문 위치 */
function normalize(text: string): { norm: string; at: number[] } {
  let norm = ''
  const at: number[] = []
  const lower = text.toLowerCase()
  for (let i = 0; i < lower.length; i++) {
    if (SKIP.test(lower[i])) continue
    norm += lower[i]
    at.push(i)
  }
  // 허용 낱말은 다른 글자로 덮어서 검사에 걸리지 않게 한다 (위치는 그대로)
  for (const ok of ALLOWED_PHRASES) norm = norm.split(ok).join('\u0000'.repeat(ok.length))
  return { norm, at }
}

type Hit = { word: string; start: number; end: number }

/** norm 안에서 words가 나오는 모든 자리 */
function hits(norm: string, words: readonly string[]): Hit[] {
  const out: Hit[] = []
  for (const w of words) {
    for (let i = norm.indexOf(w); i !== -1; i = norm.indexOf(w, i + 1)) out.push({ word: w, start: i, end: i + w.length })
  }
  return out
}

const uniq = (xs: string[]) => [...new Set(xs)]
const gap = (a: Hit, b: Hit) => (a.end <= b.start ? b.start - a.end : b.end <= a.start ? a.start - b.end : 0)
const minGap = (as: Hit[], bs: Hit[]) => Math.min(Infinity, ...as.flatMap((a) => bs.map((b) => gap(a, b))))
const closest = (as: Hit[], bs: Hit[]): [Hit, Hit] => {
  let best: [Hit, Hit] = [as[0], bs[0]]
  for (const a of as) for (const b of bs) if (gap(a, b) < gap(...best)) best = [a, b]
  return best
}

// ---------- 개인정보 ----------

/** 전화번호: 공백·하이픈·점을 지우고 010·011·016~019로 시작하는 10~11자리 */
const hasPhone = (text: string) => /01[016789]\d{7,8}/.test(text.replace(/[\s.-]/g, ''))
/** 주민등록번호: 생년월일 6자리 + 7자리 (가운데 하이픈·공백 허용) */
const hasResidentNumber = (text: string) => /\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[\s-]?[1-4]\d{6}/.test(text)

// ---------- 문장 단위 판정 ----------

/** 문장 나누기: 물음표·느낌표·줄바꿈, 또는 마침표 뒤 공백 (우회 표현 "씨.발"은 나누지 않는다) */
const splitSentences = (text: string) => text.split(/[!?\n]+|[.。…]+\s+/).filter((s) => s.trim())

type Token = { raw: string; start: number; end: number }

/** 띄어쓰기로 나눈 낱말과 그 정규화 위치 (문장의 정규화 문자열 = 낱말 정규화 문자열을 이은 것) */
function tokensOf(sentence: string): Token[] {
  const out: Token[] = []
  let pos = 0
  for (const raw of sentence.split(/\s+/).filter(Boolean)) {
    const len = normalize(raw).norm.length
    out.push({ raw: raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''), start: pos, end: pos + len })
    pos += len
  }
  return out
}

/** 다른 사용자를 가리키는 말의 자리 */
function userTargets(tokens: Token[], swearWords: readonly string[]): Hit[] {
  const out: Hit[] = []
  const byLength = [...SECOND_PERSON].sort((a, b) => b.length - a.length)
  for (const t of tokens) {
    if (SECOND_PERSON.includes(t.raw)) {
      out.push({ word: t.raw, start: t.start, end: t.end })
      continue
    }
    // 붙여 쓴 경우: "너ㅂㅅ이냐"처럼 2인칭 바로 뒤에 욕
    const p = byLength.find((x) => t.raw.startsWith(x) && swearWords.some((w) => normalize(t.raw.slice(x.length)).norm.startsWith(w)))
    if (p) {
      out.push({ word: p, start: t.start, end: t.start + p.length })
      continue
    }
    const author = AUTHOR_REFS.find((a) => t.raw.startsWith(a) && PARTICLES.includes(t.raw.slice(a.length)))
    if (author) out.push({ word: author, start: t.start, end: t.start + author.length })
  }
  return out
}

/** 이·저·그 + 새끼·놈·년 (특정 사람을 가리킨 호칭 욕) */
function demonstrativeInsults(tokens: Token[]): Hit[] {
  const out: Hit[] = []
  tokens.forEach((t, i) => {
    const next = tokens[i + 1]
    if (DEMONSTRATIVES.includes(t.raw) && next && HONORIFIC_INSULTS.some((h) => next.raw.startsWith(h))) {
      out.push({ word: `${t.raw} ${next.raw}`, start: t.start, end: next.end })
    }
    // 붙여 쓴 "저새끼", "이놈" (「년」은 "이년차"처럼 흔한 낱말과 겹쳐서 붙여 쓴 형태는 보지 않는다)
    for (const d of DEMONSTRATIVES) for (const h of ['새끼', '놈']) {
      if (t.raw.startsWith(d + h)) out.push({ word: d + h, start: t.start, end: t.start + d.length + h.length })
    }
  })
  return out
}

type SentenceVerdict =
  | { level: 'ok' | 'mild' }
  | { level: 'ambiguous'; reason: string; found: string[]; detail: string }
  | { level: 'block'; reason: BlockCategory; found: string[]; detail: string }

function judgeSentence(sentence: string, ctx: ModerationContext): SentenceVerdict {
  const { norm } = normalize(sentence)
  const tokens = tokensOf(sentence)
  const swears = hits(norm, GENERAL_SWEARS)
  const insults = [...hits(norm, PERSON_INSULTS), ...demonstrativeInsults(tokens)]
  const appearanceInsults = hits(norm, APPEARANCE_INSULTS)
  const appearanceWords = hits(norm, APPEARANCE_WORDS)
  const users = userTargets(tokens, [...GENERAL_SWEARS, ...PERSON_INSULTS])
  const people = [...hits(norm, (ctx.names ?? []).map((n) => normalize(n).norm).filter(Boolean)), ...hits(norm, OFFICIAL_TITLES)]
  const plays = hits(norm, PLAY_WORDS)
  const abusive = [...swears, ...insults, ...appearanceInsults]

  // 1) 다른 사용자를 향한 욕: 바로 붙어 있으면 차단, 같은 문장 안에서 떨어져 있으면 애매함
  if (users.length && abusive.length) {
    const [u, a] = closest(users, abusive)
    if (minGap(users, abusive) <= DIRECT_GAP) {
      return { level: 'block', reason: '인신공격(다른 사용자)', found: [u.word, a.word], detail: `인신공격(다른 사용자): ‘${u.word}’와 ‘${a.word}’을 함께 썼어요` }
    }
    return { level: 'ambiguous', reason: '다른 사용자를 향한 욕일 수 있음', found: [u.word, a.word], detail: `다른 사용자를 향한 욕으로 보일 수 있어요(‘${u.word}’와 ‘${a.word}’이 같은 문장에 있어요)` }
  }

  // 2) 선수·심판·감독·코치: 사람 자체 비하(외모·존재·호칭)는 플레이 낱말보다 항상 우선해서 차단
  if (people.length) {
    const who = people[0].word
    const personal = [...insults, ...appearanceInsults, ...(swears.length ? appearanceWords : [])]
    if (personal.length) {
      return {
        level: 'block', reason: '인신공격(선수·심판·감독)', found: uniq([who, ...personal.map((h) => h.word)]),
        detail: `인신공격(선수·심판·감독): ‘${who}’에게 사람 자체를 욕하는 말(‘${uniq(personal.map((h) => h.word)).join('’, ‘')}’)을 썼어요`,
      }
    }
    if (swears.length && !plays.length) {
      return {
        level: 'ambiguous', reason: '선수·심판·감독을 향한 욕일 수 있음', found: [who, swears[0].word],
        detail: `‘${who}’ 선수·심판·감독 자체를 욕한 것으로 보일 수 있어요. 플레이·판정에 대한 말인지 알 수 있게 써 주세요`,
      }
    }
    return { level: swears.length ? 'mild' : 'ok' }
  }

  // 3) 대상 없이 쓴 말: 이·저·그 + 호칭은 특정 사람을 가리켜 차단, 그 밖의 사람 비하는 애매함
  const pointed = demonstrativeInsults(tokens)
  if (pointed.length) {
    return { level: 'block', reason: '인신공격(선수·심판·감독)', found: [pointed[0].word], detail: `인신공격: ‘${pointed[0].word}’처럼 특정 사람을 가리켜 욕했어요` }
  }
  if (insults.length) {
    return { level: 'ambiguous', reason: '사람을 욕하는 말', found: [insults[0].word], detail: `사람을 욕하는 말(‘${insults[0].word}’)이 있어요` }
  }
  return { level: swears.length ? 'mild' : 'ok' }
}

// ---------- 전체 판정 ----------

export function moderate(text: string, ctx: ModerationContext = {}): ModerationResult {
  const { norm } = normalize(text)

  // 1) 누구를 향하든 막는 말
  const reasons: BlockCategory[] = []
  const found: string[] = []
  const details: string[] = []
  for (const { category, words } of BLOCK_RULES) {
    const hs = hits(norm, words)
    if (hs.length) {
      reasons.push(category)
      found.push(...hs.map((h) => h.word))
      details.push(`${category}: ‘${uniq(hs.map((h) => h.word)).join('’, ‘')}’`)
    }
  }
  // 가족 낱말 바로 옆의 욕도 패드립
  const family = hits(norm, FAMILY_WORDS)
  const abuse = [...hits(norm, GENERAL_SWEARS), ...hits(norm, PERSON_INSULTS)]
  if (family.length && abuse.length && minGap(family, abuse) <= DIRECT_GAP && !reasons.includes('패드립')) {
    const [f, a] = closest(family, abuse)
    reasons.push('패드립')
    found.push(f.word, a.word)
    details.push(`패드립: ‘${f.word}’ 바로 옆에 ‘${a.word}’을 썼어요`)
  }
  if (hasPhone(text) || hasResidentNumber(text)) {
    reasons.push('개인정보')
    found.push(hasPhone(text) ? '전화번호' : '주민등록번호')
    details.push(`개인정보: ${hasPhone(text) ? '전화번호' : '주민등록번호'}`)
  }

  // 2) 문장마다 인신공격·애매함 판정
  const verdicts = splitSentences(text).map((s) => judgeSentence(s, ctx))
  for (const v of verdicts) {
    if (v.level === 'block' && !reasons.includes(v.reason)) {
      reasons.push(v.reason)
      found.push(...v.found)
      details.push(v.detail)
    }
  }
  if (reasons.length) return { level: 'block', reasons, found: uniq(found), details }

  const ambiguous = verdicts.filter((v): v is Extract<SentenceVerdict, { level: 'ambiguous' }> => v.level === 'ambiguous')
  if (ambiguous.length) {
    return {
      level: 'ambiguous', reasons: uniq(ambiguous.map((v) => v.reason)), found: uniq(ambiguous.flatMap((v) => v.found)), details: ambiguous.map((v) => v.detail),
    }
  }
  const swearFound = uniq(hits(norm, GENERAL_SWEARS).map((h) => h.word))
  return swearFound.length ? { level: 'mild', found: swearFound } : { level: 'ok' }
}

// ---------- 가리기 ----------

/** 가릴 말: 일반 욕설 + 사람 비하 말 (사람 비하는 「주의」 글에만 남아 있다) */
const MASK_WORDS = [...GENERAL_SWEARS, ...PERSON_INSULTS, ...APPEARANCE_INSULTS]

/**
 * 욕설을 ●로 가린다. 검사와 같은 방식(공백·숫자·기호를 지우고)으로 찾고,
 * 원문에서 그 표현이 차지한 구간 전체(사이에 끼운 공백·숫자 포함)를 가린다 ("존 나" → "●●●").
 */
export function maskProfanity(text: string): string {
  const { norm, at } = normalize(text)
  const hide = new Array<boolean>(text.length).fill(false)
  for (const h of hits(norm, MASK_WORDS)) {
    for (let j = at[h.start]; j <= at[h.end - 1]; j++) hide[j] = true
  }
  return Array.from({ length: text.length }, (_, i) => (hide[i] ? '●' : text[i])).join('')
}
