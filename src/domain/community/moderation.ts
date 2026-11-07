// 커뮤니티 작성 제한 (규칙 기반). 표현 목록은 데모 HTML의 MOD에서 옮겼다.
// 서버(7-2)에서도 같은 파일을 그대로 쓸 수 있게 브라우저 API·외부 패키지에 의존하지 않는다.

export const BLOCK_RULES: { category: string; words: string[] }[] = [
  {
    category: '욕설',
    words: ['씨발', '씨바', '씨빨', '시발', 'ㅅㅂ', 'ㅆㅂ', 'tlqkf', '썅', '병신', '븅신', 'ㅂㅅ', 'qudtls', '개새끼', '개새기', '개색기', '개세끼', '개색끼', '좆', '존만', '지랄', 'ㅈㄹ', '염병', '엠창', '니애미', '느금마', '애미뒤', '애비뒤'],
  },
  { category: '혐오·비하', words: ['장애인새끼', '애자새끼', '틀딱', '한남충', '김치녀', '쪽바리', '짱깨', '급식충', '맘충'] },
  { category: '위협', words: ['죽여버', '찾아가서패', '칼로찔', '죽어라', '뒤져라', '뒤지고싶'] },
]

/** 게시는 되지만 ●로 가리는 거친 표현 */
export const MILD_WORDS = ['존나', '졸라', 'ㅈㄴ', '꺼져', '닥쳐', '발암', '개못']

/** 걸러 낼 표현을 품고 있지만 문제없는 낱말 (예: "시발점"의 "시발") */
export const ALLOWED_PHRASES = ['시발점', '시발역', '시발택시']

export const PHONE_REASON = '개인정보(전화번호)'

/** 우회 표현을 잡기 위해 지우는 글자: 공백·숫자·기호 (데모 normTxt와 같은 목록 + ●) */
const SKIP = /[\s\d_.,!?~\-*^'"`·…|\\/()[\]{}<>@#$%&+=:;●]/

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

/** norm 안에서 word가 나오는 모든 시작 위치 */
function occurrences(norm: string, word: string): number[] {
  const out: number[] = []
  for (let i = norm.indexOf(word); i !== -1; i = norm.indexOf(word, i + 1)) out.push(i)
  return out
}

/** 전화번호: 공백·하이픈·점을 지우고 010·011·016~019로 시작하는 10~11자리 */
const hasPhone = (text: string) => /01[016789]\d{7,8}/.test(text.replace(/[\s.-]/g, ''))

export type ModerationResult =
  | { level: 'ok' }
  | { level: 'mild'; found: string[] }
  | { level: 'block'; reasons: string[]; found: string[] }

export function moderate(text: string): ModerationResult {
  const { norm } = normalize(text)
  const reasons = new Set<string>()
  const found = new Set<string>()
  for (const { category, words } of BLOCK_RULES) {
    for (const w of words) {
      if (norm.includes(w)) {
        reasons.add(category)
        found.add(w)
      }
    }
  }
  if (hasPhone(text)) {
    reasons.add(PHONE_REASON)
    found.add('전화번호')
  }
  if (reasons.size) return { level: 'block', reasons: [...reasons], found: [...found] }
  const mild = MILD_WORDS.filter((w) => norm.includes(w))
  return mild.length ? { level: 'mild', found: mild } : { level: 'ok' }
}

/**
 * 거친 표현을 ●로 가린다. 검사와 같은 방식(공백·숫자·기호를 지우고)으로 찾고,
 * 원문에서 그 표현이 차지한 구간 전체(사이에 끼운 공백·숫자 포함)를 가린다.
 * 데모는 원문에서 그대로 찾아 바꿔서 "존 나"처럼 띄어 쓰면 가려지지 않았다.
 */
export function maskMild(text: string): string {
  const { norm, at } = normalize(text)
  const hide = new Array<boolean>(text.length).fill(false)
  for (const w of MILD_WORDS) {
    for (const i of occurrences(norm, w)) {
      for (let j = at[i]; j <= at[i + w.length - 1]; j++) hide[j] = true
    }
  }
  // UTF-16 단위로 바꾼다 (normalize의 위치도 UTF-16 단위)
  return Array.from({ length: text.length }, (_, i) => (hide[i] ? '●' : text[i])).join('')
}
