import { createContext, useContext } from 'react'
import type { ProfileRepository } from '../../data/source'
import type { CommunityUser, SeenMarks } from '../../data/types'

export type ProfileState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  /** imageUrl: 내 프로필 사진 주소 (없으면 null — 구단 엠블럼) */
  | { status: 'ready'; repo: ProfileRepository; user: CommunityUser | null; imageUrl: string | null; seen: SeenMarks }

export const ProfileContext = createContext<ProfileState>({ status: 'loading' })

export const useProfile = () => useContext(ProfileContext)
