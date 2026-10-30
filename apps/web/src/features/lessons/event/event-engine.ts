// G0-U2 (Hark A): event stage engine — start flag, clicking a character, and a
// broadcast message between characters (capability `message_event`).
// Pure and deterministic like grid-engine: the stage animates the effects it
// returns, and lesson checks judge what really happened, never a recording.
//
// Model (Scratch-like, sized for 5–7 year olds):
// - every character on stage owns ONE script: an event hat on top, actions below;
// - an interaction is the child pressing the start flag or clicking a character;
// - `send_bell` rings the forest bell; after the running script ends, every
//   script whose hat is `when_bell` runs (in stage order).

import { REPEAT_BLOCK, repeatTimes, type ProgramBlock } from '../blockly/program-tree'

export type EventActorId = 'fox' | 'rabbit' | 'bird' | 'frog' | 'squirrel' | 'apple' | 'tree' | 'flag' | 'firefly_a' | 'firefly_b' | 'firefly_c'

export const EVENT_HATS = ['when_start', 'when_clicked', 'when_bell'] as const
export type EventHat = (typeof EVENT_HATS)[number]

export const EVENT_ACTIONS = [
  'wake_up',
  'say_hello',
  'show_surprise',
  'enter_stage',
  'raise_flag',
  'fall_down',
  'send_bell',
  // G0-U3-L04: a firefly lights up / goes dark
  'glow_on',
  'glow_off',
] as const
export type EventAction = (typeof EVENT_ACTIONS)[number]

export type EventActor = {
  id: EventActorId
  name: string
  /** Actions this character can really do (an apple cannot say hello). */
  can: EventAction[]
  /** Where it stands on the stage, in stage units (0–100). */
  x: number
  y: number
  /** Not on stage until an `enter_stage` runs. */
  offstage?: boolean
  /** Asleep (eyes shut) until `wake_up` runs. */
  asleep?: boolean
  /** What its speech bubble says when `say_hello` runs (drawing only). */
  line?: string
  /** Drawing only: width as % of the stage (default 18), and where it lands after `fall_down` (stage %). */
  size?: number
  fallY?: number
}

export type EventLevel = {
  actors: EventActor[]
  /** Original story art behind the stage. */
  scenery?: 'morning-glade' | 'stage-flags' | 'bell-tree' | 'two-doors' | 'apple-tree' | 'meeting-stage' | 'firefly-night'
  /** G0-U3-L04: every character's script plays at the same time, beat by beat (a show), and must stay in step. */
  parallel?: boolean
}

/** SYS-107 repeat blocks carry `times` and `body` (G0-U3-L04 brings them to the event stage). */
export type EventBlock = ProgramBlock
export type EventScripts = Partial<Record<EventActorId, EventBlock[]>>

export type EventInteraction = { kind: 'start' } | { kind: 'click'; actor: EventActorId }

export type EventEffect = {
  actor: EventActorId
  action: EventAction
  /** Index of the interaction that caused it. */
  interaction: number
  /** Which block ran (1-based after the hat). */
  blockIndex: number
  /** G0-U3-L04: the beat within its script (0-based); on a parallel stage the same beat plays together. */
  beat: number
}

export type EventScriptIssue = 'no_hat' | 'hat_not_on_top' | 'unknown_block' | 'cannot_do' | 'disconnected' | 'empty_repeat'

export type EventRun = {
  effects: EventEffect[]
  /** Per actor, why its script can never run (the run still happens for the others). */
  issues: Partial<Record<EventActorId, { issue: EventScriptIssue; blockIndex: number; type: string }>>
  /** Stopped because the bell kept ringing itself. */
  loop: boolean
}

export const EVENT_MAX_EFFECTS = 40

const isHat = (type: string): type is EventHat => (EVENT_HATS as readonly string[]).includes(type)
const isAction = (type: string): type is EventAction => (EVENT_ACTIONS as readonly string[]).includes(type)

/** Checks one character's script and returns its hat and actions, or why it can never run. */
export function parseScript(actor: EventActor, blocks: EventBlock[] | undefined) {
  const list = blocks ?? []
  if (list.length === 0) return { hat: null, actions: [] as EventAction[] }
  const hatIndex = list.findIndex(b => isHat(b.type))
  if (hatIndex === -1) return { hat: null, actions: [], issue: { issue: 'no_hat' as const, blockIndex: 0, type: list[0].type } }
  if (hatIndex > 0) return { hat: null, actions: [], issue: { issue: 'hat_not_on_top' as const, blockIndex: 0, type: list[0].type } }
  const actions: EventAction[] = []
  /** 1-based top-level block each action came from. */
  const from: number[] = []
  for (let i = 1; i < list.length; i += 1) {
    const b = list[i]
    if (b.disconnected) return { hat: null, actions: [], issue: { issue: 'disconnected' as const, blockIndex: i, type: b.type } }
    // G0-U3-L04: one level of “重复 N 次” around actions (no repeat inside a repeat on the event stage).
    const inner = b.type === REPEAT_BLOCK ? b.body ?? [] : [b]
    if (b.type === REPEAT_BLOCK && inner.length === 0) return { hat: null, actions: [], issue: { issue: 'empty_repeat' as const, blockIndex: i, type: b.type } }
    for (const c of inner) {
      if (!isAction(c.type)) return { hat: null, actions: [], issue: { issue: 'unknown_block' as const, blockIndex: i, type: c.type } }
      if (!actor.can.includes(c.type)) return { hat: null, actions: [], issue: { issue: 'cannot_do' as const, blockIndex: i, type: c.type } }
    }
    const times = b.type === REPEAT_BLOCK ? repeatTimes(b) : 1
    for (let t = 0; t < times; t += 1) for (const c of inner) { actions.push(c.type as EventAction); from.push(i) }
  }
  return { hat: list[0].type as EventHat, actions, from }
}

/** Runs the interactions in order against every character's script. */
export function runEventProgram(level: EventLevel, scripts: EventScripts, interactions: EventInteraction[]): EventRun {
  const parsed = level.actors.map(actor => ({ actor, ...parseScript(actor, scripts[actor.id]) }))
  const issues: EventRun['issues'] = {}
  for (const p of parsed) if ('issue' in p && p.issue) issues[p.actor.id] = p.issue
  const effects: EventEffect[] = []
  let loop = false
  interactions.forEach((interaction, index) => {
    const queue = parsed.filter(p => p.hat && (interaction.kind === 'start'
      ? p.hat === 'when_start'
      : p.hat === 'when_clicked' && p.actor.id === interaction.actor))
    while (queue.length && !loop) {
      const p = queue.shift()!
      let rang = false
      p.actions.forEach((action, i) => {
        if (loop) return
        if (effects.length >= EVENT_MAX_EFFECTS) { loop = true; return }
        effects.push({ actor: p.actor.id, action, interaction: index, blockIndex: p.from?.[i] ?? i + 1, beat: i })
        if (action === 'send_bell') rang = true
      })
      if (rang) queue.push(...parsed.filter(q => q.hat === 'when_bell'))
    }
  })
  return { effects, issues, loop }
}

/** What the stage looks like after some effects (for drawing and for checks). */
export type EventActorState = { awake: boolean; onstage: boolean; said: boolean; surprised: boolean; flagUp: boolean; fallen: boolean; glowing: boolean }

export function stageStateAfter(level: EventLevel, effects: EventEffect[]): Record<EventActorId, EventActorState> {
  const state = {} as Record<EventActorId, EventActorState>
  for (const a of level.actors) state[a.id] = { awake: !a.asleep, onstage: !a.offstage, said: false, surprised: false, flagUp: false, fallen: false, glowing: false }
  for (const e of effects) {
    const s = state[e.actor]
    if (!s) continue
    if (e.action === 'wake_up') s.awake = true
    if (e.action === 'say_hello') s.said = true
    if (e.action === 'show_surprise') s.surprised = true
    if (e.action === 'enter_stage') s.onstage = true
    if (e.action === 'raise_flag') s.flagUp = true
    if (e.action === 'fall_down') s.fallen = true
    if (e.action === 'glow_on') s.glowing = true
    if (e.action === 'glow_off') s.glowing = false
  }
  return state
}

// ---------- Judging a lesson goal ----------

export type EventExpectation = {
  /** The interaction the checker performs. */
  interaction: EventInteraction
  /** Effects this interaction must cause, in this order, and nothing else. */
  effects: Array<[EventActorId, EventAction]>
}

export type EventFailure =
  | 'no_hat'
  | 'hat_not_on_top'
  | 'disconnected'
  | 'unknown_block'
  | 'cannot_do'
  | 'loop'
  | 'too_early'
  | 'nothing_happened'
  | 'wrong_actor'
  | 'wrong_order'
  | 'missing_effect'
  | 'extra_effect'
  | 'wrong_trigger'
  | 'empty_repeat'
  | 'out_of_sync'
  | 'left_glowing'

export type EventCheck = {
  passed: boolean
  failure?: EventFailure
  /** Which expectation (0-based) failed, and on which character. */
  at?: number
  actor?: EventActorId
  run: EventRun
}

const same = (a: Array<[string, string]>, b: Array<[string, string]>) => a.length === b.length && a.every((x, i) => x[0] === b[i][0] && x[1] === b[i][1])

/**
 * Judges scripts against a goal: before any interaction nothing may happen;
 * then each expectation's interaction must cause exactly its effects, in order.
 * `probes` are extra interactions that must cause nothing (e.g. clicking the tree).
 */
export function checkEventGoal(level: EventLevel, scripts: EventScripts, expectations: EventExpectation[], probes: EventInteraction[] = []): EventCheck {
  const interactions = [...expectations.map(e => e.interaction), ...probes]
  const run = runEventProgram(level, scripts, interactions)
  const fail = (failure: EventFailure, at?: number, actor?: EventActorId): EventCheck => ({ passed: false, failure, at, actor, run })
  if (run.loop) return fail('loop')
  const expectedActors = new Set(expectations.flatMap(e => e.effects.map(([actor]) => actor)))
  // A character the goal needs whose script can never run explains the failure best.
  for (const actor of level.actors) {
    const issue = run.issues[actor.id]
    if (issue && expectedActors.has(actor.id)) return fail(issue.issue, undefined, actor.id)
  }
  if (level.parallel) {
    // G0-U3-L04: on a show stage every performer the goal names must do the same thing on the same beat.
    const performers = level.actors.filter(a => expectedActors.has(a.id)).map(a => a.id)
    const seq = (id: EventActorId) => run.effects.filter(e => e.actor === id).map(e => e.action)
    const lead = seq(performers[0])
    const odd = performers.find(id => { const s = seq(id); return s.some((x, k) => k < lead.length && x !== lead[k]) })
    if (odd) return fail('out_of_sync', undefined, odd)
    const final = stageStateAfter(level, run.effects)
    const lit = performers.find(id => final[id]?.glowing)
    if (lit) return fail('left_glowing', undefined, lit)
  }
  for (let i = 0; i < expectations.length; i += 1) {
    const want = expectations[i].effects
    const got = run.effects.filter(e => e.interaction === i).map(e => [e.actor, e.action] as [EventActorId, EventAction])
    if (same(got, want)) continue
    // Something the goal wants later already happened here: it started too early.
    const later = expectations.slice(i + 1).flatMap(e => e.effects)
    if (got.some(([a, x]) => later.some(([b, y]) => a === b && x === y) && !want.some(([b, y]) => a === b && x === y))) return fail('too_early', i, got[0]?.[0])
    if (got.length === 0) return fail('nothing_happened', i)
    // G0-U3-L04: a repeat that ran too few / too many rounds leaves a prefix of the goal / overshoots it.
    const prefix = (a: Array<[string, string]>, b: Array<[string, string]>) => a.length < b.length && a.every((x, k) => x[0] === b[k][0] && x[1] === b[k][1])
    if (level.parallel && prefix(got, want)) return fail('missing_effect', i, want[got.length][0])
    if (level.parallel && prefix(want, got)) return fail('extra_effect', i, got[want.length][0])
    const wantKeys = new Set(want.map(([a, x]) => `${a}:${x}`))
    const gotKeys = new Set(got.map(([a, x]) => `${a}:${x}`))
    // Another character did what the goal wanted from someone who stayed still.
    const wrongActor = got.find(([a, x]) => !wantKeys.has(`${a}:${x}`) && want.some(([b, y]) => y === x && b !== a && !gotKeys.has(`${b}:${y}`)))
    if (wrongActor) return fail('wrong_actor', i, wrongActor[0])
    if (want.every(([a, x]) => gotKeys.has(`${a}:${x}`)) && got.length === want.length) return fail('wrong_order', i)
    if (want.some(([a, x]) => !gotKeys.has(`${a}:${x}`))) return fail('missing_effect', i, want.find(([a, x]) => !gotKeys.has(`${a}:${x}`))?.[0])
    return fail('extra_effect', i, got.find(([a, x]) => !wantKeys.has(`${a}:${x}`))?.[0])
  }
  for (let p = 0; p < probes.length; p += 1) {
    const got = run.effects.filter(e => e.interaction === expectations.length + p)
    if (got.length) return fail('wrong_trigger', expectations.length + p, got[0].actor)
  }
  return { passed: true, run }
}
