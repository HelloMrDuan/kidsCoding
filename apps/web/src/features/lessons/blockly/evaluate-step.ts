import { evaluateObservable, type ProgramBlock } from './observable-run'

/**
 * SYS-103: a step is complete when the program's observable result matches the step goal
 * (see observable-run.ts). Equivalent programs pass; programs that cannot run never pass.
 */
export function evaluateStep(requiredBlockTypes: string[], blocks: ProgramBlock[]) {
  return evaluateObservable(requiredBlockTypes, blocks).passed
}
