import type { CardDefinition } from '@/features/domain/types'

export const cardDefinitions: CardDefinition[] = [
  {
    id: 'theme-scout-cat',
    name: '探险小猫',
    category: 'theme',
    rarity: 'common',
    series: '森林启程',
    rewardTags: ['lesson_1', 'starter'],
  },
  {
    id: 'growth-first-project',
    name: '我的第一部动画',
    category: 'growth',
    rarity: 'fine',
    series: '成长时刻',
    rewardTags: ['first_project'],
  },
  {
    id: 'growth-three-day-streak',
    name: '三天坚持之星',
    category: 'growth',
    rarity: 'rare',
    series: '成长时刻',
    rewardTags: ['streak_3'],
  },
  {
    id: 'commemorative-story-graduate',
    name: '故事创作者纪念卡',
    category: 'commemorative',
    rarity: 'limited',
    series: '第一季纪念',
    rewardTags: ['story_path_complete'],
  },
]
