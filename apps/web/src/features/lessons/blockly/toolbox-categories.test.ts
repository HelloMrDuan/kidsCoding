import { describe, expect, it } from 'vitest'

import { buildKidsToolboxCategories } from './register-kids-blocks'

describe('UX-203 toolbox categories', () => {
  it('groups allowed blocks by family in lesson order', () => {
    expect(buildKidsToolboxCategories(['say_line', 'when_start', 'move_right', 'when_clicked'])).toEqual([
      { name: '开始', colour: '#ffab19', types: ['when_start', 'when_clicked'] },
      { name: '移动', colour: '#4c97ff', types: ['move_right'] },
      { name: '说话', colour: '#3fbf6a', types: ['say_line'] },
    ])
  })

  it('covers every kids block family exactly once', () => {
    const categories = buildKidsToolboxCategories([
      'when_start', 'when_clicked',
      'move_right', 'move_up', 'move_down', 'move_left', 'move_right_cell', 'move_forward', 'turn_left', 'turn_right',
      'say_line', 'switch_scene', 'switch_character', 'pick_key', 'open_door', 'repeat_twice',
    ])
    expect(categories.map((category) => category.name)).toEqual(['开始', '移动', '说话', '场景', '朋友', '物品', '控制'])
    expect(categories.flatMap((category) => category.types)).toHaveLength(16)
  })

  it('omits empty categories', () => {
    expect(buildKidsToolboxCategories(['repeat_twice'])).toEqual([
      { name: '控制', colour: '#0fbdbd', types: ['repeat_twice'] },
    ])
  })

  it('keeps an undefined block usable instead of dropping it', () => {
    expect(buildKidsToolboxCategories(['move_right', 'future_block'])).toEqual([
      { name: '移动', colour: '#4c97ff', types: ['move_right'] },
      { name: '更多', colour: '#6f7d92', types: ['future_block'] },
    ])
  })

  it('returns no categories for an empty allow-list', () => {
    expect(buildKidsToolboxCategories([])).toEqual([])
  })
})
