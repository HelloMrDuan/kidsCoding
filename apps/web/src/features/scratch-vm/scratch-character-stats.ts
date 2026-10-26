// Pure per-character helpers for the multi-character Scratch workbench
// (UX-402). Kept free of React so vitest can cover them directly; the
// trial component and the Blockly editor both use this single definition
// of a character program.

export type MeteorProgram = {spawnCount: number; fallStep: number; interval: number}

export function iconForCharacter(name: string): string {
  if (name === '流星') return '☄️'
  if (name === '星星') return '⭐'
  return '◆'
}

export function programsEqual(a: MeteorProgram | null, b: MeteorProgram | null): boolean {
  if (!a || !b) return false
  return a.spawnCount === b.spawnCount && a.fallStep === b.fallStep && a.interval === b.interval
}

// Every loaded character must have its editor draft applied to the VM
// before a run, export or cloud save reflects the editor.
export function allProgramsApplied(
  names: string[],
  programs: Record<string, MeteorProgram | undefined>,
  drafts: Record<string, MeteorProgram | null | undefined>,
): boolean {
  if (names.length === 0) return false
  return names.every((name) => programsEqual(programs[name] ?? null, drafts[name] ?? null))
}

export function formatProgram(program: MeteorProgram): string {
  return `${program.spawnCount}颗 / 每步${program.fallStep} / 每${program.interval}秒`
}

export type SnapshotTarget = {id: string; name: string; visible: boolean; original: boolean}

// Live visible clone counts per character name, from one VM snapshot.
// Stateful totals (created, movement, deletion) stay in the trial component
// because they accumulate across snapshots.
export function liveClonesByCharacter(targets: SnapshotTarget[]): Record<string, number> {
  const live: Record<string, number> = {}
  for (const target of targets) {
    if (target.original || !target.visible) continue
    live[target.name] = (live[target.name] ?? 0) + 1
  }
  return live
}
