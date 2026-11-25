/**
 * OPS-053：G0-U2 事件课的会话共享状态（路由级 context + 轻量外部 store）。
 *
 * 与 grid-v3-session 同一设计：编辑插槽拥有草稿（经 onChange 交外壳保存），
 * 舞台插槽需要同一份草稿（当前关、创意关选的角色）来渲染真实舞台与反馈；
 * 两个插槽经本路由级 store 共享状态——编辑插槽是草稿的写入方，舞台插槽
 * 读取并经 setState 写回（选角色、恢复预置程序、复盘选择、重玩某关），
 * 编辑插槽的采纳 effect 接到后统一保存。
 *
 * 会话内字段（与旧课堂一致，不持久化）：
 * - guess：当前关预测回答；
 * - editing：当前正在编辑的角色（多角色关切换脚本用；创意关选角色时同步）；
 * - play：自由试玩的交互序列（舞台即时显示，不判定）；
 * - editorRevision：“恢复预置程序”/导入后强制重挂 Blockly 画布。
 *
 * 不是模块级单例：路由每次挂载新建一个 store；store 只同步状态，不执行、
 * 不判定：唯一的运行检查与判定来源仍是 EventRunAdapter。
 */
import { createContext, useContext, useSyncExternalStore } from 'react'

import type { EventLesson } from '@/content/curriculum/g0-u2-event-lessons'

import type { EventActorId, EventInteraction } from '../event/event-engine'
import { emptyEventDraft, type EventSlotData } from './event-v3-draft'
import type { EventRunAdapter } from './event-v3-run-adapter'

export type EventSessionState = {
  /** 草稿镜像（编辑插槽的 persist 写入；舞台插槽读取并可写回）。 */
  draft: EventSlotData
  /** 当前关预测回答（会话内）：选项下标。 */
  guess: number | null
  /** 当前正在编辑的角色（null = 本关第一个可编辑角色）。 */
  editing: EventActorId | null
  /** 自由试玩的交互序列（会话内；编辑、运行检查、切关时清空）。 */
  play: EventInteraction[]
  /** 画布重挂载计数。 */
  editorRevision: number
}

export function emptyEventSessionState(lesson: EventLesson): EventSessionState {
  return {
    draft: emptyEventDraft(lesson),
    guess: null,
    editing: null,
    play: [],
    editorRevision: 0,
  }
}

export type EventSessionStore = {
  getState: () => EventSessionState
  /** SSR 预渲染用的快照：恒为创建时的初始状态（引用稳定）。 */
  getServerSnapshot: () => EventSessionState
  setState: (patch: Partial<EventSessionState>) => void
  subscribe: (listener: () => void) => () => void
}

export function createEventSessionStore(lesson: EventLesson, initial?: EventSessionState): EventSessionStore {
  const initialState = initial ?? emptyEventSessionState(lesson)
  let state = initialState
  const listeners = new Set<() => void>()
  return {
    getState: () => state,
    getServerSnapshot: () => initialState,
    setState: (patch) => {
      state = { ...state, ...patch }
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export type EventSessionContextValue = {
  lesson: EventLesson
  store: EventSessionStore
  runAdapter: EventRunAdapter
}

export const EventSessionContext = createContext<EventSessionContextValue | null>(null)

export function useEventSession(): EventSessionContextValue {
  const value = useContext(EventSessionContext)
  if (!value) {
    throw new Error('EventEditorSlot / EventStageSlot 必须在 EventSessionContext 内使用')
  }
  return value
}

export function useEventSessionState(): EventSessionState {
  const { store } = useEventSession()
  // 第三参数必填（next build 预渲染 client component 时需要 getServerSnapshot）。
  return useSyncExternalStore(store.subscribe, store.getState, store.getServerSnapshot)
}
