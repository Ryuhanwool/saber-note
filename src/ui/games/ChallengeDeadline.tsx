import { challengeSchedule, challengeStatusText } from '../../domain/games/schedule'
import { useNow } from '../shared/useNow'

/** 이번 주 세이버 픽 챌린지 마감 표시 (매주 화요일 18:30, 한국 시간). 시연용이라 마감 뒤에도 제출은 막지 않는다 */
export default function ChallengeDeadline({ demoNote = false }: { demoNote?: boolean }) {
  const now = useNow()
  const s = challengeSchedule(now)
  return (
    <>
      {challengeStatusText(s, now)}
      {demoNote && s.phase === 'closed' && ' (시연이라 지금도 제출할 수 있어요)'}
    </>
  )
}
