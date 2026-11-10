import { useMemo, type ReactNode } from 'react'
import { teamsOf } from '../../domain/market/catalog'
import { emblemColors, teamThemeId } from '../../domain/theme/teams'
import { useLeagueState } from '../shared/LeagueContext'
import { animalOf, type Animal } from './animals'

// 가상 구단 엠블럼: 동그라미 안에 그 구단 동물 하나를 단순한 면으로 그린다(외부 이미지·글자 없음).
// 실제 구단 로고·마스코트를 떠올리지 않게 방패·글자·사람 같은 캐릭터 없이, 구단 색 두 가지만 쓴다.

type Colors = { bg: string; fg: string; detail: string }

/** 동물 그림 (viewBox 0 0 100 100, 원 안). fg = 동물, bg = 눈·무늬처럼 바탕색으로 뚫는 부분 */
function animalArt(a: Animal, c: Colors): ReactNode {
  const { fg, bg, detail } = c
  switch (a) {
    case 'otter': // 정면 수달 얼굴: 옆으로 넓적한 머리, 옆에 붙은 작은 귀, 밝은 주둥이, 옆으로 뻗은 수염
      return (
        <g>
          <circle cx="25" cy="44" r="6" fill={fg} />
          <circle cx="75" cy="44" r="6" fill={fg} />
          <ellipse cx="50" cy="54" rx="28" ry="21" fill={fg} />
          <circle cx="40" cy="48" r="3.5" fill={bg} />
          <circle cx="60" cy="48" r="3.5" fill={bg} />
          <ellipse cx="50" cy="63" rx="15" ry="9" fill={bg} />
          <ellipse cx="50" cy="58.5" rx="5" ry="3.2" fill={fg} />
          <path d="M50 61.5 L50 66 M50 66 Q46 69 43 67 M50 66 Q54 69 57 67" fill="none" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M37 63 L12 59 M37 67 L13 69 M63 63 L88 59 M63 67 L87 69" stroke={fg} strokeWidth="2" strokeLinecap="round" />
        </g>
      )
    case 'goat': // 산양: 뒤로 휘어진 뿔 두 개, 긴 얼굴, 옆으로 난 귀, 턱수염
      return (
        <g>
          <path d="M43 37 C38 22 27 19 21 27" fill="none" stroke={fg} strokeWidth="6" strokeLinecap="round" />
          <path d="M57 37 C62 22 73 19 79 27" fill="none" stroke={fg} strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="30" cy="46" rx="10" ry="4.5" transform="rotate(-18 30 46)" fill={fg} />
          <ellipse cx="70" cy="46" rx="10" ry="4.5" transform="rotate(18 70 46)" fill={fg} />
          <path d="M36 40 Q50 31 64 40 L59 71 Q50 80 41 71 Z" fill={fg} />
          <circle cx="44" cy="50" r="3" fill={bg} />
          <circle cx="56" cy="50" r="3" fill={bg} />
          <path d="M45 66 Q50 69 55 66" fill="none" stroke={bg} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M46 76 L50 88 L54 76 Z" fill={fg} />
        </g>
      )
    case 'heron': // 해오라기 옆모습: 짧은 목의 통통한 몸, 뾰족한 부리, 머리 뒤 깃 한 가닥, 다리
      return (
        <g>
          <path d="M44 32 Q58 20 74 25" fill="none" stroke={fg} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="56" cy="60" rx="21" ry="15" fill={fg} />
          <circle cx="40" cy="41" r="12" fill={fg} />
          <path d="M30 38 L11 43 L30 46 Z" fill={fg} />
          <circle cx="37" cy="39" r="2.8" fill={bg} />
          <path d="M60 52 Q70 56 76 64" fill="none" stroke={bg} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M51 74 L49 87 M60 74 L62 87" stroke={fg} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )
    case 'firefly': // 반딧불이: 위에서 본 몸, 펼친 날개(테두리), 더듬이, 빛나는 꼬리와 빛줄기
      return (
        <g>
          <path d="M47 25 Q42 15 35 14 M53 25 Q58 15 65 14" fill="none" stroke={fg} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="34" cy="46" rx="15" ry="7.5" transform="rotate(-28 34 46)" fill="none" stroke={fg} strokeWidth="3" />
          <ellipse cx="66" cy="46" rx="15" ry="7.5" transform="rotate(28 66 46)" fill="none" stroke={fg} strokeWidth="3" />
          <circle cx="50" cy="29" r="6.5" fill={fg} />
          <ellipse cx="50" cy="44" rx="8" ry="9.5" fill={fg} />
          <ellipse cx="50" cy="66" rx="9.5" ry="12.5" fill={detail} stroke={fg} strokeWidth="3" />
          <path d="M50 84 L50 90 M36 72 L31 76 M64 72 L69 76 M38 82 L34 87 M62 82 L66 87" stroke={fg} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    case 'dolphin': // 물결 위로 뛰어오르는 돌고래: 휘어진 몸, 주둥이, 등지느러미, 꼬리지느러미, 물결 두 줄
      return (
        <g>
          <path d="M28 64 Q44 32 74 38" fill="none" stroke={fg} strokeWidth="15" strokeLinecap="round" />
          <path d="M78 35 Q90 39 79 44 Z" fill={fg} />
          <path d="M43 38 L51 22 L58 37 Z" fill={fg} />
          <path d="M31 61 L14 58 Q21 65 18 75 Z" fill={fg} />
          <path d="M51 46 L48 57 L59 48 Z" fill={fg} />
          <circle cx="70" cy="37" r="2.2" fill={bg} />
          <path d="M16 78 q8 -6 16 0 t16 0 t16 0 t16 0" fill="none" stroke={fg} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M26 87 q8 -5 16 0 t16 0 t16 0" fill="none" stroke={fg} strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'owl': // 부엉이 정면: 귀깃이 솟은 몸, 큰 눈 두 개, 작은 부리, 가슴 무늬
      return (
        <g>
          <path d="M29 36 L34 18 L44 30 Q50 28 56 30 L66 18 L71 36 Q78 54 70 70 Q50 86 30 70 Q22 54 29 36 Z" fill={fg} />
          <circle cx="40.5" cy="45" r="9.5" fill={bg} />
          <circle cx="59.5" cy="45" r="9.5" fill={bg} />
          <circle cx="40.5" cy="46" r="4.5" fill={fg} />
          <circle cx="59.5" cy="46" r="4.5" fill={fg} />
          <path d="M46.5 55 L53.5 55 L50 62 Z" fill={bg} />
          <path d="M42 68 l3 3 l3 -3 M52 68 l3 3 l3 -3" fill="none" stroke={bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )
  }
}

/** 응원 팀이 없을 때의 기본 엠블럼: 야구공 (색은 화면 토큰을 따라 라이트·다크·팀 테마에 맞는다) */
function DefaultArt() {
  return (
    <g>
      <circle cx="50" cy="50" r="48" fill="var(--chip)" />
      <circle cx="50" cy="50" r="27" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3" />
      <path d="M33 30 Q42 50 33 70 M67 30 Q58 50 67 70" fill="none" stroke="var(--seam)" strokeWidth="3" />
      <path d="M36 37 l-5 2 M38 44 l-5 1 M38 56 l-5 -1 M36 63 l-5 -2 M64 37 l5 2 M62 44 l5 1 M62 56 l5 -1 M64 63 l5 -2" stroke="var(--seam)" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  )
}

type Props = {
  /** 응원 팀 (가상 구단 이름). null이면 기본 엠블럼 */
  team: string | null
  /** 내 프로필 사진 주소. 있으면 엠블럼 대신 동그랗게 보여 준다 */
  imageUrl?: string | null
  size?: number
  className?: string
}

/** 구단 엠블럼 (또는 내 프로필 사진). 그림이 무엇인지 화면 읽기 프로그램에 알려 준다 */
export default function Emblem({ team, imageUrl, size = 56, className }: Props) {
  // 구단 순서는 처음 불러온 선수 명단으로 정한다 (날짜를 옮겨도 같은 색). 아직 불러오는 중이면 기본 엠블럼
  const state = useLeagueState()
  const roster = state.status === 'ready' ? state.roster : null
  const teams = useMemo(() => (roster ? teamsOf([...roster.hitters, ...roster.pitchers]) : []), [roster])
  const animal = animalOf(team)
  const themeId = team ? teamThemeId(teams, team) : null
  const cls = `emblem${className ? ` ${className}` : ''}`
  if (imageUrl) return <img className={`${cls} emblem-photo`} src={imageUrl} alt="내 프로필 사진" width={size} height={size} />
  const label = animal && themeId ? `${team} 엠블럼` : '기본 엠블럼'
  return (
    <svg className={cls} viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label} data-animal={animal && themeId ? animal : 'default'}>
      {animal && themeId ? (() => {
        const c = emblemColors(themeId)
        return (
          <>
            <circle cx="50" cy="50" r="48" fill={c.bg} />
            <circle cx="50" cy="50" r="44" fill="none" stroke={c.fg} strokeWidth="2" />
            {animalArt(animal, c)}
          </>
        )
      })() : <DefaultArt />}
    </svg>
  )
}
