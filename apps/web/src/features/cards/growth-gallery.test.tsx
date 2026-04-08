import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GrowthGallery } from './growth-gallery'

const growthGalleryFixture = {
  summary: {
    stars: 18,
    badgeCount: 2,
    cardCount: 2,
  },
  badges: [
    {
      id: 'lesson-lesson-03-forest-story',
      name: '森林里的第一次见面完成徽章',
      description: '完成第一个完整小故事时获得。',
      group: '完整作品',
      isEarned: true,
    },
    {
      id: 'lesson-lesson-09-garden-story',
      name: '花园互动表演完成徽章',
      description: '完成会回应点击的互动故事时获得。',
      group: '互动成长',
      isEarned: false,
    },
  ],
  cardGroups: [
    {
      category: 'theme',
      cards: [
        {
          id: 'theme-forest-fox',
          name: '森林小狐狸',
          category: 'theme',
          rarity: 'common',
          series: '森林见面会',
          rewardTags: ['lesson-01-forest-hello'],
          isEarned: true,
        },
      ],
    },
  ],
}

describe('GrowthGallery', () => {
  it('shows summary stats, badge gallery, and premium card wall', () => {
    render(<GrowthGallery gallery={growthGalleryFixture} />)

    expect(screen.getByText('成长收藏馆')).toBeInTheDocument()
    expect(screen.getByText('已获得星星')).toBeInTheDocument()
    expect(screen.getByText('勋章墙')).toBeInTheDocument()
    expect(screen.getByText('高质感收藏卡')).toBeInTheDocument()
  })
})
