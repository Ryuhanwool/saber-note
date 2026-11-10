// 프로필 사진 규칙
export const PROFILE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024

/** 프로필 사진으로 쓸 수 없으면 이유, 쓸 수 있으면 null */
export function checkProfileImage(file: { name: string; type: string; size: number }): string | null {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) return `${file.name}: PNG, JPG, WEBP 사진만 프로필 이미지로 쓸 수 있어요`
  if (file.size > MAX_PROFILE_IMAGE_BYTES) return `${file.name}: 5MB를 넘어요. 용량을 줄여서 다시 올려 주세요`
  return null
}
