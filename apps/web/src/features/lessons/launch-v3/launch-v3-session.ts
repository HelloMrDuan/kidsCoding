/**
 * OPS-056：启蒙课 V3 会话共享状态（路由级 context + 轻量外部 store，按课程 ID 参数化）。
 *
 * 与 OPS-041 forest-hello-session 同一语义：编辑插槽是草稿的写入方（persist 时
 * 同步写 store 与 onChange），舞台插槽是读取方；问答状态是会话内的（与旧课堂
 * 一致，不持久化），由任一插槽写入、双方读取。
 *
 * 在 forest-hello 的基础上只多两项双角色课（L10–L12）的会话内活动状态，
 * 语义照搬旧课堂 DuoStage 的组件内状态：
 * - duoPredictions：第 1 关“先猜一猜”（'bear' | 'both'），关 id → 选项。
 * - duoReflections：第 5 关复盘（'own' | 'together'），关 id → 选项。
 * 第 4 关“错误实验已观察”沿用 observed（与单角色课同一字段）。
 *
 * 不是模块级单例：路由每次挂载新建一个 store，卸载即丢弃，不跨课节、不跨会话污染。
 * store 只同步状态，不执行、不判定：唯一的运行与判定来源仍是 LaunchRunAdapter。
 */
import { createContext, useContext, useSyncExternalStore } from 'react'

import type { ProgramBlock } from '@/features/lessons/blockly/observable-run'

import { emptyLaunchDraft, type LaunchSlotData } from './launch-v3-draft'
import type { LaunchRunAdapter } from './launch-v3-run-adapter'

export type LaunchDuoPrediction = 'bear' | 'both'
export type LaunchDuoReflection = 'own' | 'together'
/** OPS-056 复审 HOLD P1：花园课“先猜一猜”（语义同旧课堂 PlayableStage 内部 prediction）。 */
export type LaunchClickPrediction = 'automatic' | 'needs-click'

export type LaunchSessionState = {
  /** 草稿镜像（编辑插槽的 persist 写入；舞台插槽只读）。 */
  draft: LaunchSlotData
  /** 错误实验回答（会话内，不持久化）：关 id → 选项 id。 */
  mistakeAnswers: Record<string, string>
  /** 预测 / 对比回答（会话内，不持久化）：关 id → 选项 id。 */
  practiceAnswers: Record<string, string>
  /** 已观察过设计错误实验的关 id（会话内，不持久化）。 */
  observed: string[]
  /** 双角色课第 1 关预测（会话内，不持久化）：关 id → 选项。 */
  duoPredictions: Record<string, LaunchDuoPrediction>
  /** 双角色课第 5 关复盘（会话内，不持久化）：关 id → 选项。 */
  duoReflections: Record<string, LaunchDuoReflection>
  /** 花园课点击预测（会话内，不持久化）：关 id → 选项。 */
  clickPredictions: Record<string, LaunchClickPrediction>
}

export function emptyLaunchSessionState(lessonId: string): LaunchSessionState {
  return {
    draft: emptyLaunchDraft(lessonId),
    mistakeAnswers: {},
    practiceAnswers: {},
    observed: [],
    duoPredictions: {},
    duoReflections: {},
    clickPredictions: {},
  }
}

export type LaunchSessionStore = {
  getState: () => LaunchSessionState
  /** SSR 预渲染用的快照：恒为创建时的初始状态（引用稳定）。 */
  getServerSnapshot: () => LaunchSessionState
  setState: (patch: Partial<LaunchSessionState>) => void
  subscribe: (listener: () => void) => () => void
}

export function createLaunchSessionStore(
  lessonId: string,
  initial?: LaunchSessionState,
): LaunchSessionStore {
  const initialState = initial ?? emptyLaunchSessionState(lessonId)
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

export type LaunchSessionContextValue = {
  lessonId: string
  store: LaunchSessionStore
  runAdapter: LaunchRunAdapter
  /**
   * OPS-057（可选）：作品模式共享的当前作品程序。编辑插槽写入、舞台插槽读取；
   * 课程模式的插槽不读取它，行为与 OPS-056 完全一致。
   */
  project?: {
    program: ProgramBlock[]
    setProgram: (program: ProgramBlock[]) => void
  }
  /**
   * OPS-056 复审 HOLD P1（可选）：插槽出现新提示时调用。路由用它在 1040px 以下把面板切到
   * 提示所在的编程面板，保证同步失败 / 导航失败 / notice 与重试操作在当前可见面板里。
   * 不传时行为不变（桌面三栏同时可见，data-pane 不生效）。
   */
  revealAlerts?: () => void
}

export const LaunchSessionContext = createContext<LaunchSessionContextValue | null>(null)

/** 插槽内读取路由提供的 store 与运行适配器（无 provider 时直接抛错）。 */
export function useLaunchSession(): LaunchSessionContextValue {
  const value = useContext(LaunchSessionContext)
  if (!value) {
    throw new Error('LaunchEditorSlot / LaunchStageSlot / LaunchRolesSlot 必须在 LaunchSessionContext 内使用')
  }
  return value
}

/** 订阅会话状态（草稿镜像 + 问答状态），store 变化即重渲染。 */
export function useLaunchSessionState(): LaunchSessionState {
  const { store } = useLaunchSession()
  // 第三参数必填：路由是 SSR 预渲染的 client component，缺 getServerSnapshot
  // 会在 next build 生成静态页时抛错（Missing getServerSnapshot）。
  return useSyncExternalStore(store.subscribe, store.getState, store.getServerSnapshot)
}
