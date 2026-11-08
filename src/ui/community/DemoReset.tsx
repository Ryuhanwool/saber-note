import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useCheer } from '../cheer/CheerContext'
import { useMarket } from '../market/MarketContext'
import { useCommunity } from './CommunityContext'

/**
 * 시연 데이터 초기화: 커뮤니티(내가 쓴 글, 좋아요·신고), 응원방(내 응원 메시지, 「응원하기」·신고),
 * 마켓(내 판매글·사진·신고, 장바구니)을 지우고 예시 글·예시 응원·예시 판매글을 처음 상태로 되돌린다. 커뮤니티 화면과 응원방 화면에 함께 둔다.
 * 계정은 기본으로 남기고, 확인 창의 「가입한 계정도 모두 지우기」를 고르면 데모 계정을 뺀 계정도 지우고 로그아웃한다.
 * 지우는 일이라 무엇이 지워지는지 보여 주고 한 번 더 확인받는다. 저장소가 지원할 때만 보인다.
 */
export default function DemoReset() {
  const state = useCommunity()
  const cheer = useCheer()
  const market = useMarket()
  const auth = useAuth()
  const [withAccounts, setWithAccounts] = useState(false)
  const [step, setStep] = useState<'idle' | 'confirm' | 'busy'>('idle')
  const [message, setMessage] = useState<{ text: string; warn: boolean } | null>(null)
  if (state.status !== 'ready' || !state.repo.resetDemoData) return null
  const resets = [state.repo, cheer.status === 'ready' ? cheer.repo : null, market.status === 'ready' ? market.repo : null].flatMap((r) => (r?.resetDemoData ? [r.resetDemoData.bind(r)] : []))
  const authRepo = auth.status === 'ready' ? auth.repo : null
  const reset = async () => {
    await Promise.all(resets.map((f) => f()))
    // 계정은 마지막에 (로그아웃되면 저장소들이 다시 열린다)
    if (withAccounts) await authRepo?.resetDemoData?.({ accounts: true })
  }

  async function run() {
    setStep('busy')
    try {
      await reset()
      setMessage({ text: withAccounts ? '시연 데이터와 가입한 계정을 지웠어요. 로그아웃됐어요.' : '시연 데이터를 처음 상태로 되돌렸어요. 계정은 그대로예요.', warn: false })
      setWithAccounts(false)
    } catch {
      setMessage({ text: '초기화하지 못했어요. 잠시 뒤 다시 시도해 주세요.', warn: true })
    } finally {
      setStep('idle')
    }
  }

  return (
    <section className="panel" aria-label="시연 데이터 초기화" style={{ marginTop: 16 }}>
      <h2>시연 데이터 초기화</h2>
      {step === 'idle' ? (
        <>
          <p className="muted" style={{ fontSize: '.85rem', margin: '0 0 10px' }}>
            시연을 다시 시작할 때 써요. 커뮤니티·응원방·마켓에서 내가 남긴 글·응원·판매글, 좋아요·신고 기록, 장바구니를 지우고 예시 데이터를 처음 상태로 되돌려요.
          </p>
          <button className="btn ghost" onClick={() => { setMessage(null); setStep('confirm') }}>시연 데이터 초기화</button>
        </>
      ) : (
        <div role="alertdialog" aria-label="초기화 확인">
          <p style={{ margin: '0 0 10px' }}>
            <b>정말 초기화할까요?</b> 이 브라우저에 저장된 내가 쓴 글·사진·영상, 응원 메시지와 「응원하기」, 판매글과 장바구니, 좋아요·신고 기록이 모두 지워지고 되돌릴 수 없어요. 계정은 아래에서 고르지 않으면 남아요.
          </p>
          {authRepo?.resetDemoData && (
            <label className="row" style={{ gap: 8, alignItems: 'center', margin: '0 0 10px', fontSize: '.9rem' }}>
              <input type="checkbox" checked={withAccounts} onChange={(e) => setWithAccounts(e.target.checked)} />
              가입한 계정도 모두 지우기 (로그아웃돼요. 데모 계정은 남아요)
            </label>
          )}
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" disabled={step === 'busy'} onClick={run}>초기화</button>
            <button className="btn ghost" disabled={step === 'busy'} onClick={() => setStep('idle')}>취소</button>
          </div>
        </div>
      )}
      {message && (
        <p className="muted" role="status" style={{ fontSize: '.85rem', margin: '10px 0 0', color: message.warn ? 'var(--seam)' : undefined }}>
          {message.text}
        </p>
      )}
    </section>
  )
}
