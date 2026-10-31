// SYS-106: which Blockly engine capabilities really run in the product, and
// where. A lesson may only become playable when none of its
// requiredEngineCapabilities is missing (rewrite + review still required).

export const blocklyEngineCapabilities: Record<string, string> = {
  when_start: 'playable-stage/use-block-executor.ts',
  when_clicked: 'playable-stage/use-block-executor.ts; event/event-engine.ts (G0-U2 click a character)',
  movement: 'playable-stage/use-block-executor.ts; grid/grid-engine.ts',
  character_selection: 'playable-stage/use-block-executor.ts (lessons 10-12); event/event-lab.tsx (one script per character)',
  message_event: 'event/event-engine.ts (when_bell / send_bell broadcast between characters)',
  direction: 'grid/grid-engine.ts (up/down/left/right, forward, turn left/right)',
  path_obstacles: 'grid/grid-engine.ts (rocks, river, map edge, key and locked door)',
  finite_repeat: 'blockly/program-tree.ts + grid/grid-engine.ts (SYS-107 “重复 N 次” C-block, nested bodies unrolled by the engine)',
  sync_show: 'event/event-engine.ts (G0-U3-L04 repeat inside event scripts; parallel show stage plays beat by beat and judges out_of_sync / left_glowing)',
  batch_action: 'grid/grid-engine.ts (G0-U3-L03 water_plant on level pots: each pot exactly once; no_pot_here / watered_twice / pots_missed)',
  jump_over: 'grid/grid-engine.ts (G0-U3-L02 jump_forward hops over one cell: puddles yes, rocks / locked doors no)',
  pattern_stamp: 'grid/grid-engine.ts (G0-U3 stamp_red / stamp_blue footprints judged against the level pattern)',
}

export function missingEngineCapabilities(required: readonly string[] | undefined | null) {
  return (required ?? []).filter(cap => !(cap in blocklyEngineCapabilities))
}
