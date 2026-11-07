// 내 이미지 배경 규칙
export const BACKGROUND_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024

/** 배경으로 쓸 수 없으면 이유, 쓸 수 있으면 null */
export function checkBackgroundImage(file: { name: string; type: string; size: number }): string | null {
  if (!BACKGROUND_TYPES.includes(file.type)) return `${file.name}: PNG, JPG, WEBP 사진만 배경으로 쓸 수 있어요`
  if (file.size > MAX_BACKGROUND_BYTES) return `${file.name}: 10MB를 넘어요. 용량을 줄여서 다시 올려 주세요`
  return null
}
