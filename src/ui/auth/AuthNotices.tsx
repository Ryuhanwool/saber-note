/** 시연용 보안 안내 (로그인·회원가입 화면에 늘 보인다) */
export function SecurityNotice() {
  return (
    <p className="muted authnote" role="note">
      시연용 로그인이에요. 계정은 이 브라우저에만 저장되고, 비밀번호는 해시해서 저장하지만 실제 서비스 수준의 보안은 아니에요.
      다른 곳에서 쓰는 비밀번호는 넣지 마세요.
    </p>
  )
}

/** Web Crypto를 쓸 수 없는 접속 (https·localhost가 아닌 주소) */
export function CryptoNotice() {
  return (
    <div className="modmsg block" role="alert">
      <b>이 주소에서는 로그인·회원가입을 쓸 수 없어요.</b> 비밀번호를 안전하게 처리하는 브라우저 기능(Web Crypto)이 꺼져 있어요.
      localhost나 https 주소로 접속해 주세요.
    </div>
  )
}
