import type { PlayerId } from '../../data/types'
import type { Player } from '../../domain/players'

const POSITION_LABEL = {
  C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수',
  LF: '좌익수', CF: '중견수', RF: '우익수', DH: '지명타자',
  SP: '선발투수', RP: '불펜투수',
} as const

export const positionLabel = (p: Player) => POSITION_LABEL[p.type === 'H' ? p.raw.pos : p.raw.role]

export const playerPath = (id: PlayerId) => `/player/${encodeURIComponent(id)}`

export function comparePath(a?: PlayerId, b?: PlayerId) {
  const q = new URLSearchParams()
  if (a) q.set('a', a)
  if (b) q.set('b', b)
  const s = q.toString()
  return s ? `/compare?${s}` : '/compare'
}
