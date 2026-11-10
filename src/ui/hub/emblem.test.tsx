// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { getDataSource } from '../../data/registry'
import { buildLeague } from '../../domain/league'
import { teamsOf } from '../../domain/market/catalog'
import { emblemColors, teamThemeId } from '../../domain/theme/teams'
import LeagueProvider from '../shared/LeagueProvider'
import { animalOf } from './animals'
import Emblem from './Emblem'

const league = buildLeague(await getDataSource('demo').load())
const teams = teamsOf([...league.hitters, ...league.pitchers])
afterEach(cleanup)

describe('구단 엠블럼', () => {
  it('가상 구단 6개마다 다른 동물 (수달·산양·해오라기·반딧불이·돌고래·부엉이)', () => {
    expect(teams).toHaveLength(6)
    expect(teams.map(animalOf).sort()).toEqual(['dolphin', 'firefly', 'goat', 'heron', 'otter', 'owl'])
  })

  it('동그란 SVG에 구단 색으로 그리고, 글자·외부 이미지는 쓰지 않는다', async () => {
    render(<LeagueProvider>{teams.map((t) => <Emblem key={t} team={t} />)}</LeagueProvider>)
    for (const t of teams) {
      const svg = await screen.findByRole('img', { name: `${t} 엠블럼` })
      expect(svg.tagName.toLowerCase()).toBe('svg')
      expect(svg.getAttribute('data-animal')).toBe(animalOf(t))
      expect(svg.querySelector('text, image, use, foreignObject')).toBeNull()
      const c = emblemColors(teamThemeId(teams, t)!)
      const fills = [...svg.querySelectorAll('[fill]')].map((e) => e.getAttribute('fill'))
      expect(svg.querySelector('circle')!.getAttribute('fill')).toBe(c.bg)
      expect(fills).toContain(c.fg)
    }
  })

  it('응원 팀이 없거나 모르는 구단이면 기본 엠블럼(야구공), 프로필 사진이 있으면 사진', async () => {
    render(
      <LeagueProvider>
        <Emblem team={null} />
        <Emblem team="없는 구단" />
        <Emblem team={teams[0]} imageUrl="blob:me" />
      </LeagueProvider>,
    )
    expect(await screen.findAllByRole('img', { name: '기본 엠블럼' })).toHaveLength(2)
    expect(screen.getByRole('img', { name: '내 프로필 사진' }).getAttribute('src')).toBe('blob:me')
  })
})
