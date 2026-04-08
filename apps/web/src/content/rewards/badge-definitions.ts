export type BadgeDefinition = {
  id: string
  name: string
  description: string
  group: string
}

export const badgeDefinitions: BadgeDefinition[] = [
  {
    id: 'lesson-lesson-03-forest-story',
    name: '森林里的第一次见面完成徽章',
    description: '完成第一个完整小故事时获得。',
    group: '完整作品',
  },
  {
    id: 'lesson-lesson-06-meadow-story',
    name: '草地旅行记完成徽章',
    description: '完成第二个完整小故事时获得。',
    group: '完整作品',
  },
  {
    id: 'lesson-lesson-09-garden-story',
    name: '花园互动表演完成徽章',
    description: '完成会回应点击的互动故事时获得。',
    group: '互动成长',
  },
  {
    id: 'lesson-lesson-12-graduation-show',
    name: '启蒙毕业作品徽章',
    description: '完成启蒙毕业作品时获得。',
    group: '启蒙毕业',
  },
  {
    id: 'first-project',
    name: '第一次完成作品徽章',
    description: '第一次完整完成作品时获得。',
    group: '成长时刻',
  },
]
