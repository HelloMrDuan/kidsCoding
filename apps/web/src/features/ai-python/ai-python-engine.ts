/**
 * A1 ai-python engine registration — deliberately OUTSIDE the
 * lesson-maturity.ts trial registry.
 *
 * The U1 detailed-plan draft requires ai-python to register separately from
 * the lesson-maturity system and to coexist with the existing pyodide
 * registration, without changing any P0/P1/P2 registration or route. That is
 * why this module exists instead of a trialIntegrations entry: A1-U1 lessons
 * are still outline/todo in the catalog and ledger, so claiming a maturity
 * trial entry for them would be false. This pilot is reachable only by its
 * direct URL and is never presented as a published or playable lesson.
 *
 * Scope of this pilot: A1-U1-L01 → A1-U1-L05 only. L06 (second-batch
 * re-verification) is not in this pilot.
 */

export const AI_PYTHON_ENGINE_ID = 'ai-python' as const

/** Engines already registered elsewhere; ai-python must not collide with any of them. */
export const EXISTING_ENGINE_IDS = ['blockly', 'scratch-vm', 'pyodide', 'classify'] as const

export const AI_PYTHON_PILOT_LESSON_IDS = ['A1-U1-L01', 'A1-U1-L02', 'A1-U1-L03', 'A1-U1-L04', 'A1-U1-L05'] as const

export type AiPythonPilotLessonId = (typeof AI_PYTHON_PILOT_LESSON_IDS)[number]

export const AI_PYTHON_PILOT_STAGE_TITLES: Record<string, string> = {
  'A1-U1-L01': 'L01 观察水果数据',
  'A1-U1-L02': 'L02 选择合适特征',
  'A1-U1-L03': 'L03 划分训练与测试',
  'A1-U1-L04': 'L04 训练简单分类器',
  'A1-U1-L05': 'L05 混淆矩阵基础',
}

export function aiPythonPilotRoute(lessonId: string): string | null {
  return (AI_PYTHON_PILOT_LESSON_IDS as readonly string[]).includes(lessonId)
    ? `/learn/ai-python-lab/${lessonId}`
    : null
}

export const AI_PYTHON_PILOT_E2E_SPEC = 'tests/e2e/ai-python-a1-u1.spec.ts'
