/**
 * StudioLesson — the course contract for the fullscreen StudioShell
 * (OPS-039). It is LessonContract plus the studio-only fields, and one
 * extra engine value:
 *
 * - `engine` adds `'python'`. Python's mount semantics differ from
 *   Blockly/Scratch: the editor is a plain React component and execution
 *   runs in a hidden sandbox iframe (Pyodide in a Web Worker), as in the
 *   existing python labs — NOT via EngineAdapter.mount(el). This module
 *   only defines the contract and its validation; the Python adapter
 *   arrives with a real Python lesson, never as a stub here.
 * - `backHref` is the topbar back link target (e.g. the learning map).
 * - `help` is optional lesson help shown in the guidance drawer.
 *
 * The shell only renders contract content; it never invents lesson titles,
 * tasks, hints or answers. `toLessonContract()` converts a StudioLesson
 * to a LessonContract for embedding LessonWorkspace; it throws for
 * `python` instead of silently degrading to `slot`, because
 * LessonWorkspace has no python engine branch.
 */

import {
  validateLessonContract,
  type LessonContract,
  type WorkspaceEngine,
} from '../workspace/lesson-contract'

/** Studio engines: the four workspace engines plus Python. */
export type StudioEngine = WorkspaceEngine | 'python'

export type StudioHelp = {
  title: string
  body: string[]
}

export type StudioLesson = Omit<LessonContract, 'engine'> & {
  engine: StudioEngine
  /** Topbar back link target. */
  backHref: string
  /** Optional lesson help, shown in the guidance drawer. */
  help?: StudioHelp
}

/**
 * Validate a StudioLesson without throwing. Reuses the shared field
 * validator: for `python` the engine stands in as `slot` there, because
 * the shared validator only knows the four workspace engines — the engine
 * value itself is already checked above.
 */
export function validateStudioLesson(lesson: unknown): string[] {
  if (!lesson || typeof lesson !== 'object') {
    return ['课程契约不是对象']
  }
  const l = lesson as Partial<StudioLesson>
  const errors: string[] = []
  const engineOk =
    l.engine === 'blockly' ||
    l.engine === 'scratch-vm' ||
    l.engine === 'summary' ||
    l.engine === 'slot' ||
    l.engine === 'python'
  if (!engineOk) {
    errors.push('engine 必须是 blockly、scratch-vm、summary、slot 或 python')
  } else {
    errors.push(
      ...validateLessonContract({
        ...l,
        engine: l.engine === 'python' ? 'slot' : l.engine,
      }),
    )
  }
  if (typeof l.backHref !== 'string' || l.backHref.length === 0) {
    errors.push('backHref 缺失或不是字符串')
  }
  if (l.help !== undefined) {
    const h = l.help as Partial<StudioHelp>
    const ok =
      h !== null &&
      typeof h === 'object' &&
      typeof h.title === 'string' &&
      h.title.length > 0 &&
      Array.isArray(h.body) &&
      h.body.every((b) => typeof b === 'string' && b.length > 0)
    if (!ok) {
      errors.push('help 必须是 title 非空字符串与 body 非空字符串数组')
    }
  }
  return errors
}

/**
 * Convert a StudioLesson to a LessonContract for embedding
 * LessonWorkspace. Throws for `python`: LessonWorkspace has no python
 * engine branch, and silently mapping it to `slot` would misrepresent
 * the lesson.
 */
export function toLessonContract(lesson: StudioLesson): LessonContract {
  if (lesson.engine === 'python') {
    throw new Error(
      'StudioLesson engine=python 无法转为 LessonContract：LessonWorkspace 暂无 python 引擎分支，' +
        'Python 课须走 React 编辑器 + 隐藏执行 iframe 的挂载方式',
    )
  }
  const contract: LessonContract = {
    lessonId: lesson.lessonId,
    title: lesson.title,
    goal5: lesson.goal5,
    brief: lesson.brief,
    step: lesson.step,
    hints: lesson.hints,
    engine: lesson.engine,
    judging: lesson.judging,
    draftKey: lesson.draftKey,
  }
  if (lesson.demo !== undefined) contract.demo = lesson.demo
  if (lesson.structuredHints !== undefined) contract.structuredHints = lesson.structuredHints
  if (lesson.methodSteps !== undefined) contract.methodSteps = lesson.methodSteps
  if (lesson.scopeGap !== undefined) contract.scopeGap = lesson.scopeGap
  if (lesson.progress !== undefined) contract.progress = lesson.progress
  if (lesson.activities !== undefined) contract.activities = lesson.activities
  if (lesson.fileCapabilities !== undefined) contract.fileCapabilities = lesson.fileCapabilities
  if (lesson.hasStage !== undefined) contract.hasStage = lesson.hasStage
  return contract
}
