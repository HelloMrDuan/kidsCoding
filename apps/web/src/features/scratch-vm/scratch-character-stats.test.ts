import {describe, expect, it} from 'vitest'
import {
  allProgramsApplied,
  formatProgram,
  iconForCharacter,
  liveClonesByCharacter,
  programsEqual,
} from './scratch-character-stats'

describe('scratch-character-stats (UX-402)', () => {
  it('maps known characters to distinct icons and falls back neutrally', () => {
    expect(iconForCharacter('流星')).toBe('☄️')
    expect(iconForCharacter('星星')).toBe('⭐')
    expect(iconForCharacter('未知')).toBe('◆')
    expect(iconForCharacter('流星')).not.toBe(iconForCharacter('星星'))
  })

  it('compares programs field by field and rejects nulls', () => {
    expect(programsEqual({spawnCount: 10, fallStep: 13, interval: 0.3}, {spawnCount: 10, fallStep: 13, interval: 0.3})).toBe(true)
    expect(programsEqual({spawnCount: 10, fallStep: 13, interval: 0.3}, {spawnCount: 6, fallStep: 13, interval: 0.3})).toBe(false)
    expect(programsEqual(null, {spawnCount: 10, fallStep: 13, interval: 0.3})).toBe(false)
  })

  it('requires every character applied, not just the selected one', () => {
    const programs = {流星: {spawnCount: 10, fallStep: 13, interval: 0.3}, 星星: {spawnCount: 6, fallStep: 12, interval: 0.5}}
    expect(allProgramsApplied(['流星', '星星'], programs, {...programs})).toBe(true)
    expect(allProgramsApplied(['流星', '星星'], programs, {流星: programs.流星, 星星: {spawnCount: 7, fallStep: 12, interval: 0.5}})).toBe(false)
    expect(allProgramsApplied(['流星', '星星'], programs, {流星: programs.流星})).toBe(false)
    expect(allProgramsApplied([], programs, programs)).toBe(false)
  })

  it('formats a program exactly like the observation panel', () => {
    expect(formatProgram({spawnCount: 10, fallStep: 13, interval: 0.3})).toBe('10颗 / 每步13 / 每0.3秒')
  })

  it('counts only visible non-original clones, grouped by character name', () => {
    const live = liveClonesByCharacter([
      {id: 'a', name: '流星', visible: true, original: true},
      {id: 'b', name: '流星', visible: true, original: false},
      {id: 'c', name: '流星', visible: false, original: false},
      {id: 'd', name: '星星', visible: true, original: false},
      {id: 'e', name: '星星', visible: true, original: false},
    ])
    expect(live).toEqual({流星: 1, 星星: 2})
  })
})
