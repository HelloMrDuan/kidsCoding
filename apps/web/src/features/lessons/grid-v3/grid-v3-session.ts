/**
 * OPS-052：G0-U1 grid 课的会话共享状态（路由级 context + 轻量外部 store）。
 *
 * 为什么需要它：编辑插槽拥有草稿（经 onChange 交外壳保存），舞台插槽
 * 需要同一份草稿（当前关、创意目标格）来渲染真实关卡与反馈；而外壳只给
 * stageSlot 传 state / stageState，不传草稿。两个插槽因此通过本路由级
 * store 共享状态——编辑插槽是草稿的写入方（persist 时同步写 store 与
 * onChange），舞台插槽是读取方。预测回答（guess）是会话内的，与旧课堂
 * 一致不持久化；editorRevision 只用于“恢复初始”后强制重挂 Blockly 画布。
 *
 * 不是模块级单例：路由每次挂载新建一个 store（createGridSessionStore），
 * 经 GridSessionContext 提供；卸载即丢弃，不跨课节、不跨会话污染。
 * 运行适配器也经同一 context 提供，舞台插槽由此读它的完整执行快照
 * （含逐帧动作数组——外壳的标量 stageState 装不下数组）。
 * store 只同步状态，不执行、不判定：唯一的运行与判定来源仍是
 * GridRunAdapter。
 */
import { createContext, useContext, useSyncExternalStore } from 'react'

import type { GridLesson } from '@/content/curriculum/g0-u1-grid-lessons'

import { emptyGridDraft, type GridSlotData } from './grid-v3-draft'
import type { GridRunAdapter } from './grid-v3-run-adapter'

export type GridSessionState = {
  /** 草稿镜像（编辑插槽的 persist 写入；舞台插槽只读）。 */
  draft: GridSlotData
  /** 当前关预测回答（会话内，不持久化）：选项下标。 */
  guess: number | null
  /** 画布重挂载计数（“恢复初始”后强制重建）。 */
  editorRevision: number
}

export function emptyGridSessionState(lesson: GridLesson): GridSessionState {
  return {
    draft: emptyGridDraft(lesson),
    guess: null,
    editorRevision: 0,
  }
}

export type GridSessionStore = {
  getState: () => GridSessionState
  /** SSR 预渲染用的快照：恒为创建时的初始状态（引用稳定）。 */
  getServerSnapshot: () => GridSessionState
  setState: (patch: Partial<GridSessionState>) => void
  subscribe: (listener: () => void) => () => void
}

export function createGridSessionStore(
  lesson: GridLesson,
  initial?: GridSessionState,
): GridSessionStore {
  const initialState = initial ?? emptyGridSessionState(lesson)
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

export type GridSessionContextValue = {
  lesson: GridLesson
  store: GridSessionStore
  runAdapter: GridRunAdapter
  /**
   * OPS-057 复审：作品模式只编辑实际保存的作品关。设置后插槽不再渲染
   * 课堂关卡进度/完成按钮/预测/教学判定，舞台只播放真实执行结果。
   */
  work?: { stepId: string }
}

export const GridSessionContext = createContext<GridSessionContextValue | null>(null)

/** 插槽内读取路由提供的课程、store 与运行适配器（无 provider 时直接抛错）。 */
export function useGridSession(): GridSessionContextValue {
  const value = useContext(GridSessionContext)
  if (!value) {
    throw new Error('GridEditorSlot / GridStageSlot 必须在 GridSessionContext 内使用')
  }
  return value
}

/** 订阅会话状态（草稿镜像 + 预测回答），store 变化即重渲染。 */
export function useGridSessionState(): GridSessionState {
  const { store } = useGridSession()
  // 第三参数必填：路由是 SSR 预渲染的 client component，缺 getServerSnapshot
  // 会在 next build 生成静态页时抛错（Missing getServerSnapshot）。
  return useSyncExternalStore(store.subscribe, store.getState, store.getServerSnapshot)
}
