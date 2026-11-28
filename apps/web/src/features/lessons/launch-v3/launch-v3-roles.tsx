/**
 * OPS-056：启蒙课 V3 角色与背景插槽（LaunchRolesSlot，按课程模板参数化）。
 *
 * 结构与类名原样复用 OPS-041 ForestRolesSlot（kc-v3-role-heading / kc-v3-role-list /
 * kc-v3-background），不新做设计：
 * - 角色取自模板 starterCharacters（课程数据原文），第一位是可编程角色。
 * - 双角色课（L10–L12）两位都可编程；“当前编辑”随运行快照的当前操作角色变化。
 * - 背景取自模板 starterScene。
 */
'use client'

import { useEffect, useReducer } from 'react'

import { CharacterArt, type CharacterId } from '../playable-stage/character-art'
import { getLaunchV3Template, launchV3DuoMode } from './launch-v3-lessons'
import { useLaunchSession } from './launch-v3-session'

const CHARACTER_NAMES: Record<string, string> = {
  fox: '小狐狸',
  rabbit: '小兔子',
  bird: '草地小鸟',
  butterfly: '小蝴蝶',
  frog: '小青蛙',
  bear: '小熊',
}

const SCENE_NAMES: Record<string, string> = {
  forest: '森林',
  meadow: '森林 → 草地',
  garden: '花园',
  'forest-stage': '森林舞台',
}

const KNOWN_ART = new Set(['fox', 'rabbit', 'bird', 'butterfly', 'frog', 'bear', 'robot'])

export function LaunchRolesSlot() {
  const { lessonId, runAdapter } = useLaunchSession()
  const [, force] = useReducer((count: number) => count + 1, 0)
  useEffect(() => runAdapter.subscribe(force), [runAdapter])

  const template = getLaunchV3Template(lessonId)
  const characters = template?.starterCharacters ?? []
  const duo = launchV3DuoMode(lessonId) !== null
  const activeActor = runAdapter.getExecutionSnapshot().frame.activeActor
  const editingIndex = duo && activeActor === 'partner' ? 1 : 0
  const editingName = CHARACTER_NAMES[characters[editingIndex] ?? ''] ?? characters[editingIndex] ?? ''

  return (
    <div data-testid="launch-v3-roles">
      <p className="kc-v3-role-heading">角色与背景 <span>当前编辑：{editingName}</span></p>
      <ul className="kc-v3-role-list">
        {characters.map((id, index) => (
          <li
            key={id}
            aria-current={index === editingIndex ? 'true' : undefined}
            data-testid={`launch-v3-role-${id}`}
          >
            {KNOWN_ART.has(id) && <CharacterArt id={id as CharacterId} />}
            <span>
              <strong>{CHARACTER_NAMES[id] ?? id}</strong>
              <small>{index === 0 || duo ? '可编程角色' : '舞台角色'}</small>
            </span>
          </li>
        ))}
      </ul>
      <p className="kc-v3-background">背景：{SCENE_NAMES[template?.starterScene ?? ''] ?? template?.starterScene ?? ''}</p>
    </div>
  )
}
