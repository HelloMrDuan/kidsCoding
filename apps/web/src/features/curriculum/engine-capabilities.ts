// SYS-106: which Blockly engine capabilities really run in the product, and
// where. A lesson may only become playable when none of its
// requiredEngineCapabilities is missing (rewrite + review still required).

export const blocklyEngineCapabilities: Record<string, string> = {
  when_start: 'playable-stage/use-block-executor.ts',
  when_clicked: 'playable-stage/use-block-executor.ts',
  movement: 'playable-stage/use-block-executor.ts; grid/grid-engine.ts',
  character_selection: 'playable-stage/use-block-executor.ts (lessons 10-12)',
  direction: 'grid/grid-engine.ts (up/down/left/right, forward, turn left/right)',
  path_obstacles: 'grid/grid-engine.ts (rocks, river, map edge, key and locked door)',
}

export function missingEngineCapabilities(required: readonly string[] | undefined | null) {
  return (required ?? []).filter(cap => !(cap in blocklyEngineCapabilities))
}
