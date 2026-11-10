// 구단 이름 → 엠블럼 동물
export type Animal = 'otter' | 'goat' | 'heron' | 'firefly' | 'dolphin' | 'owl'

const ANIMAL_BY_NAME: [string, Animal][] = [
  ['수달', 'otter'], ['산양', 'goat'], ['해오라기', 'heron'], ['반딧불', 'firefly'], ['돌고래', 'dolphin'], ['부엉이', 'owl'],
]

/** 구단 이름으로 동물을 고른다. 모르는 구단이면 null (기본 엠블럼) */
export const animalOf = (team: string | null): Animal | null => (team ? (ANIMAL_BY_NAME.find(([k]) => team.includes(k))?.[1] ?? null) : null)
