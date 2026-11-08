import { createContext, useContext } from 'react'
import type { AuthRepository } from '../../data/source'
import type { Account } from '../../data/types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  /** repo가 null이면 계정 제공자가 없는 것 (테스트 등): 늘 로그아웃 상태 */
  | { status: 'ready'; repo: AuthRepository | null; account: Account | null }

/** 제공자가 없으면 로그아웃 상태로 본다 */
export const AuthContext = createContext<AuthState>({ status: 'ready', repo: null, account: null })

export const useAuth = () => useContext(AuthContext)
