import { describe, expect, it } from 'vitest'

import {
  createIndexedDbProjectStore,
  createMemoryProjectStore,
  defaultProjectName,
  newProjectId,
  normalizeProjectName,
  type ProjectSummary,
  type StoredProject,
} from './project-library'

function project(overrides: Partial<StoredProject> = {}): StoredProject {
  const sb3 = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer
  return {
    id: 'p-1',
    name: '我的作品',
    sb3,
    savedAt: 1_000,
    byteLength: sb3.byteLength,
    ...overrides,
  }
}

function summary(id: string, name: string, savedAt: number): ProjectSummary {
  return { id, name, savedAt, byteLength: 16 }
}

describe('normalizeProjectName', () => {
  it('去掉首尾空白并压缩连续空白', () => {
    expect(normalizeProjectName('  我的   动画  ')).toBe('我的 动画')
  })

  it('空名字回退为“我的作品”', () => {
    expect(normalizeProjectName('   ')).toBe('我的作品')
  })

  it('超长名字截到 24 个字符', () => {
    expect(normalizeProjectName('作'.repeat(40))).toHaveLength(24)
  })
})

describe('defaultProjectName', () => {
  it('没有作品时从“我的作品”开始', () => {
    expect(defaultProjectName([])).toBe('我的作品')
  })

  it('跳过已被占用的名字', () => {
    const existing = [summary('a', '我的作品', 1), summary('b', '我的作品 2', 2)]
    expect(defaultProjectName(existing)).toBe('我的作品 3')
  })
})

describe('newProjectId', () => {
  it('生成非空且不重复的 id', () => {
    const ids = new Set(Array.from({ length: 20 }, () => newProjectId()))
    expect(ids.size).toBe(20)
  })
})

describe('createMemoryProjectStore（与浏览器实现共用行为约定）', () => {
  it('按保存时间倒序列出作品，且列表不带 .sb3 内容', async () => {
    const store = createMemoryProjectStore([
      project({ id: 'old', savedAt: 1_000 }),
      project({ id: 'new', savedAt: 5_000 }),
    ])
    const list = await store.list()
    expect(list.map((entry) => entry.id)).toEqual(['new', 'old'])
    expect(list[0]).not.toHaveProperty('sb3')
  })

  it('读写、删除和“上次打开”互不影响', async () => {
    const store = createMemoryProjectStore()
    await store.put(project({ id: 'a' }))
    await store.put(project({ id: 'b' }))
    await store.setLastOpened('b')

    expect((await store.get('a'))?.name).toBe('我的作品')
    expect(await store.getLastOpened()).toBe('b')

    await store.remove('b')
    expect(await store.get('b')).toBeNull()
    expect(await store.getLastOpened()).toBeNull()
    expect((await store.list()).map((entry) => entry.id)).toEqual(['a'])
  })

  it('拒绝不完整的作品记录（空 .sb3）', async () => {
    const store = createMemoryProjectStore()
    await expect(store.put(project({ sb3: new ArrayBuffer(0), byteLength: 0 }))).rejects.toThrow(
      '作品记录不完整',
    )
  })

  it('损坏的记录不会让列表整体失败', async () => {
    const store = createMemoryProjectStore()
    await store.put(project({ id: 'good' }))
    // 模拟存储里被外部写坏的一条记录。
    const broken = { id: 'broken', name: '坏记录', sb3: 'not-a-buffer', savedAt: 9, byteLength: 9 }
    await expect(store.put(broken as unknown as StoredProject)).rejects.toThrow('作品记录不完整')
    expect((await store.list()).map((entry) => entry.id)).toEqual(['good'])
  })
})

describe('createIndexedDbProjectStore', () => {
  it('浏览器不支持 IndexedDB 时明确报错，而不是静默丢作品', async () => {
    // jsdom 不实现 IndexedDB，正对应“浏览器不支持”这条真实路径。
    await expect(createIndexedDbProjectStore().list()).rejects.toThrow('浏览器不支持 IndexedDB')
  })
})
