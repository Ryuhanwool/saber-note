import { describe, expect, it } from 'vitest'
import { DEMO_ACCOUNT_NICKNAME, DEMO_AUTHOR_ID } from '../../data/types'
import { storeCatalog } from '../market/catalog'
import { TEAM_THEME_ORDER, teamThemeId, themeColors } from '../theme/teams'
import { THEMES } from '../theme/themes'
import { authorLabel, checkNickname, checkPassword, nicknameKey } from './account'

const none = new Set<string>()
const TEAMS = ['한빛 수달스', '태백 산양스', '청운 해오라기스', '금강 반딧불스', '남해 돌고래스', '북악 부엉이스']

describe('닉네임', () => {
  it('2~12자 한글·영문·숫자·밑줄, 앞뒤 공백은 지운다', () => {
    expect(checkNickname('  수달팬_01 ', none)).toEqual({ ok: true, value: '수달팬_01' })
    expect(checkNickname('가', none)).toMatchObject({ ok: false, message: '닉네임은 2~12자로 써 주세요.' })
    expect(checkNickname('가'.repeat(13), none).ok).toBe(false)
    expect(checkNickname('수달 팬', none)).toMatchObject({ ok: false, message: '닉네임에는 한글, 영문, 숫자, 밑줄(_)만 쓸 수 있어요.' })
    expect(checkNickname('fan!', none).ok).toBe(false)
  })

  it('작성 제한: 차단·애매함은 물론 허용 수준의 거친 표현도 쓸 수 없다', () => {
    for (const n of ['씨발홈런', '병1신', '개새끼팬', '느금마']) {
      expect(checkNickname(n, none)).toMatchObject({ ok: false, message: '닉네임에 쓸 수 없는 표현이 있어요. 다른 닉네임을 골라 주세요.' })
    }
    expect(checkNickname('ㅂㅅ팬', none).ok).toBe(false) // 낱자는 글자 규칙에서 먼저 막힌다
    expect(checkNickname('시발점여행', none).ok).toBe(true) // 오탐 예외 낱말
  })

  it('화면에서 쓰는 이름과 데모 계정 닉네임은 쓸 수 없다', () => {
    for (const n of ['나', '익명팬', '데모게시글', DEMO_ACCOUNT_NICKNAME, 'ADMIN']) {
      if (n.length < 2) continue // 한 글자는 길이에서 먼저 막힌다
      expect(checkNickname(n, none)).toMatchObject({ ok: false, message: '이 닉네임은 쓸 수 없어요. 다른 닉네임을 골라 주세요.' })
    }
  })

  it('이 브라우저 안 중복: 대소문자 무시', () => {
    const taken = new Set([nicknameKey('SaberFan')])
    expect(checkNickname('saberfan', taken)).toMatchObject({ ok: false, message: '이미 이 브라우저에서 쓰고 있는 닉네임이에요.' })
    expect(checkNickname('saberfan2', taken).ok).toBe(true)
    expect(nicknameKey(' Saber Fan ')).toBe('saberfan')
  })
})

describe('비밀번호', () => {
  it('6자 이상, 확인과 같아야 한다', () => {
    expect(checkPassword('12345', '12345')).toMatchObject({ ok: false, message: '비밀번호는 6자 이상으로 써 주세요.' })
    expect(checkPassword('123456', '123457')).toMatchObject({ ok: false, message: '비밀번호 확인이 맞지 않아요.' })
    expect(checkPassword('123456', '123456').ok).toBe(true)
  })
})

describe('응원 팀 → 팀 컬러 테마', () => {
  it('구단 순서대로 짝짓는다 (사용자가 정한 짝)', () => {
    expect(TEAMS.map((t) => teamThemeId(TEAMS, t))).toEqual(['navy-gold', 'burgundy-gray', 'deepnavy-sky', 'red-yellow', 'blue-white', 'orange-black'])
    expect(teamThemeId(TEAMS, '없는 구단')).toBeNull()
    expect(new Set(TEAM_THEME_ORDER).size).toBe(6)
    for (const id of TEAM_THEME_ORDER) expect(THEMES.some((t) => t.id === id)).toBe(true)
  })

  it('공식 스토어 상품 색은 그 구단 테마의 두 색이다', () => {
    const catalog = storeCatalog(TEAMS)
    for (const [i, team] of TEAMS.entries()) {
      expect(catalog.find((p) => p.team === team)!.colors).toEqual(themeColors(TEAM_THEME_ORDER[i]))
    }
    expect(() => themeColors('default')).toThrow()
  })
})

describe('작성자 표시', () => {
  it('예시 글, 로그인 전 익명 글, 닉네임', () => {
    expect(authorLabel({ authorId: DEMO_AUTHOR_ID, authorName: null }, '데모 게시글')).toBe('데모 게시글')
    expect(authorLabel({ authorId: 'local:abc', authorName: '나' }, '데모 게시글')).toBe('익명 팬')
    expect(authorLabel({ authorId: 'acct:1', authorName: '수달팬' }, '데모 게시글')).toBe('수달팬')
    expect(authorLabel({ authorId: 'acct:1', authorName: null }, '데모 게시글')).toBe('팬')
  })
})
