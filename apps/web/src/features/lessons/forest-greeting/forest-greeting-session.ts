/**
 * lesson-02-forest-greeting 会话共享状态（路由级 context + 轻量外部 store）。
 *
 * 为什么需要它：编辑插槽拥有草稿（经 onChange 交外壳保存），舞台插槽
 * 需要同一份草稿（当前关程序、关号）与会话内问答状态（错误实验的观察
 * 与回答、预测回答）来渲染 PlayableStage 的纠错/预测面板；而外壳只给
 * stageSlot 传 state / stageState，不传草稿。两个插槽因此通过本路由级
 * store 共享状态——编辑插槽是草稿的写入方（persist 时同步写 store 与
 * onChange），舞台插槽是读取方；问答状态是会话内的（与旧课堂一致，
 * 不持久化），由任一插槽写入、双方读取。
 *
 * 不是模块级单例：路由每次挂载新建一个 store（createGreetingSessionStore），
 * 经 GreetingSessionContext 提供；卸载即丢弃，不跨课节、不跨会话污染。
 * 运行适配器也经同一 context 提供，舞台插槽由此读它的完整执行快照
 * （含逐块动作日志数组——外壳的标量 stageState 装不下数组）。
 * store 只同步状态，不执行、不判定：唯一的运行与判定来源仍是
 * GreetingRunAdapter（裁定 3）。
 */
import { createContext, useContext, useSyncExternalStore } from 'react'

import type { GreetingRunAdapter } from './forest-greeting-run-adapter'
import { emptyGreetingDraft, type GreetingSlotData } from './forest-greeting-draft'

export type GreetingSessionState = {
  /** 草稿镜像（编辑插槽的 persist 写入；舞台插槽只读）。 */
  draft: GreetingSlotData
  /** 错误实验回答（会话内，不持久化）：关 id → 选项 id。 */
  mistakeAnswers: Record<string, string>
  /** 预测回答（会话内，不持久化）：关 id → 选项 id。 */
  practiceAnswers: Record<string, string>
  /** 已观察过设计错误实验的关 id（会话内，不持久化）。 */
  observed: string[]
}

export function emptyGreetingSessionState(): GreetingSessionState {
  return {
    draft: emptyGreetingDraft(),
    mistakeAnswers: {},
    practiceAnswers: {},
    observed: [],
  }
}

export type GreetingSessionStore = {
  getState: () => GreetingSessionState
  /** SSR 预渲染用的快照：恒为创建时的初始状态（引用稳定）。 */
  getServerSnapshot: () => GreetingSessionState
  setState: (patch: Partial<GreetingSessionState>) => void
  subscribe: (listener: () => void) => () => void
}

export function createGreetingSessionStore(
  initial?: GreetingSessionState,
): GreetingSessionStore {
  const initialState = initial ?? emptyGreetingSessionState()
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

export type GreetingSessionContextValue = {
  store: GreetingSessionStore
  runAdapter: GreetingRunAdapter
}

export const GreetingSessionContext = createContext<GreetingSessionContextValue | null>(null)

/** 插槽内读取路由提供的 store 与运行适配器（无 provider 时直接抛错）。 */
export function useGreetingSession(): GreetingSessionContextValue {
  const value = useContext(GreetingSessionContext)
  if (!value) {
    throw new Error('GreetingEditorSlot / GreetingStageSlot 必须在 GreetingSessionContext 内使用')
  }
  return value
}

/** 订阅会话状态（草稿镜像 + 问答状态），store 变化即重渲染。 */
export function useGreetingSessionState(): GreetingSessionState {
  const { store } = useGreetingSession()
  // 第三参数必填：路由是 SSR 预渲染的 client component，缺 getServerSnapshot
  // 会在 next build 生成静态页时抛错（Missing getServerSnapshot）。
  return useSyncExternalStore(store.subscribe, store.getState, store.getServerSnapshot)
}
