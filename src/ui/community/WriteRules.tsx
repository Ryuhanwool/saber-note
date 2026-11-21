import { REPORT_HIDE_THRESHOLD } from '../../domain/community/posts'

/** 커뮤니티 작성 규칙 (넓은 화면은 오른쪽 칸, 휴대폰 폭은 「글쓰기」 창 안) */
export default function WriteRules({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`write-rules${compact ? ' compact' : ''}`} aria-labelledby={compact ? 'rules-h-sheet' : 'rules-h'}>
      <h2 id={compact ? 'rules-h-sheet' : 'rules-h'}>작성 규칙</h2>
      <p className="muted">
        경기·플레이·상황에 대한 욕은 괜찮아요. 패드립, 협박, 인신공격(다른 사용자나 선수의 외모·가족·존재 비하), 혐오·비하, 성적 모욕,
        전화번호 같은 개인정보는 올릴 수 없어요. 애매한 글은 올리기 전에 한 번 더 물어보고, 그래도 올리면 「주의」 표시가 붙어요.
        거친 표현은 「거친 표현 가리기」(화면 설정, 기본 켜짐)를 켠 사람에게 ●●로 보여요. 신고가 {REPORT_HIDE_THRESHOLD}번 쌓인 글은
        가려지고, 도배를 막기 위해 30초에 한 번 글을 올릴 수 있어요.
      </p>
    </section>
  )
}
