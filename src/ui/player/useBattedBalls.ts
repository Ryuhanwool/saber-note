import { useEffect, useState } from 'react'
import type { PlayerId, RawBattedBall } from '../../data/types'
import { useDataSource } from '../shared/LeagueContext'

/** 선수 한 명의 타구 목록. 불러오는 중이면 null */
export function useBattedBalls(id: PlayerId, enabled: boolean): RawBattedBall[] | null {
  const source = useDataSource()
  const [loaded, setLoaded] = useState<{ id: PlayerId; balls: RawBattedBall[] } | null>(null)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    source.loadBattedBalls(id).then(
      (balls) => alive && setLoaded({ id, balls }),
      () => alive && setLoaded({ id, balls: [] }),
    )
    return () => {
      alive = false
    }
  }, [id, source, enabled])

  return loaded?.id === id ? loaded.balls : null
}
