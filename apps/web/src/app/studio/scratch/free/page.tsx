// Scratch 自由创作工坊 · 作品库入口。
// 不依附任何课节：新建空白作品、导入 .sb3、继续上次的创作。
import type { Metadata } from 'next'

import { FreeCreateHub } from '@/features/lessons/studio/free-create/free-create-hub'

export const metadata: Metadata = {
  title: 'Scratch 创作工坊 · KidsCoding',
  description: '不跟课程走，自己设计 Scratch 动画、游戏和故事。',
}

export default function Page() {
  return <FreeCreateHub />
}
