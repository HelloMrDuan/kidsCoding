// SYS-106: G0 grid path-finding engine (direction, path_obstacles).
// Pure and deterministic: the stage animates the trace, and lesson checks
// judge the observed outcome, never a pre-recorded answer animation.

import { countBlocks, expandProgram, type ProgramBlock } from '../blockly/program-tree'

export type Facing = 'up' | 'right' | 'down' | 'left'
export type Cell = { x: number; y: number }

export type GridLevel = {
  cols: number
  rows: number
  start: Cell & { facing: Facing }
  goal: Cell
  rocks?: Cell[]
  water?: Cell[]
  key?: Cell
  door?: Cell
  /** Story decoration drawn under the start cell; never affects a run. */
  /** Original story art drawn beside the map (never a cell): L01 treehouse, L02 forest post signpost, L03 squirrel's acorn counting board, L04 turn sign, L05 key hook board, L06 forest guide's map. */
  scenery?: 'treehouse' | 'signpost' | 'counting' | 'turnsign' | 'keyhook' | 'guidemap' | 'mushroompath'
  /** G0-U3: footprints the program must leave, in path order (colour on each cell). */
  footprints?: Footprint[]
}

/** G0-U3 pattern lessons: a coloured footprint the fox leaves on its current cell. */
export type FootColor = 'red' | 'blue'
export type Footprint = Cell & { color: FootColor }
const FOOT_WORD: Record<FootColor, string> = { red: '红', blue: '蓝' }

export const GRID_BLOCK_TYPES = [
  'move_up',
  'move_down',
  'move_left',
  'move_right_cell',
  'move_forward',
  'turn_left',
  'turn_right',
  'pick_key',
  'open_door',
  'stamp_red',
  'stamp_blue',
] as const

export type GridBlockType = (typeof GRID_BLOCK_TYPES)[number]
export const GRID_MAX_ACTIONS = 40
/** SYS-107: most actions an unrolled program may run (a loop can multiply blocks). */
export const GRID_MAX_STEPS = 80

export type GridFailure =
  | 'no_start'
  | 'disconnected'
  | 'unknown_block'
  | 'too_many'
  | 'out_of_bounds'
  | 'hit_rock'
  | 'fell_in_water'
  | 'door_locked'
  | 'no_key_here'
  | 'not_at_door'
  | 'need_key'
  | 'not_at_goal'
  | 'empty_repeat'
  | 'too_deep'
  | 'stamp_twice'
  | 'wrong_pattern'
  | 'pattern_short'

export type GridFrame = {
  blockIndex: number
  action: GridBlockType
  x: number
  y: number
  facing: Facing
  hasKey: boolean
  doorOpen: boolean
  bump?: Cell
  /** SYS-107: which round of each enclosing repeat this action ran in (outermost first). */
  rounds?: number[]
  /** G0-U3: the footprint this action left. */
  stamp?: Footprint
}

export type GridRun = {
  passed: boolean
  failure?: GridFailure
  message: string
  frames: GridFrame[]
  final: { x: number; y: number; facing: Facing; hasKey: boolean; doorOpen: boolean }
  steps: number
  /** G0-U3: every footprint left, in the order they were stamped. */
  trail: Footprint[]
}

const ORDER: Facing[] = ['up', 'right', 'down', 'left']
const DELTA: Record<Facing, Cell> = { up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 } }
const ABSOLUTE: Partial<Record<GridBlockType, Facing>> = { move_up: 'up', move_down: 'down', move_left: 'left', move_right_cell: 'right' }
const FACING_WORD: Record<Facing, string> = { up: '上', right: '右', down: '下', left: '左' }

const same = (a: Cell | undefined, b: Cell) => !!a && a.x === b.x && a.y === b.y
const has = (list: Cell[] | undefined, c: Cell) => !!list?.some(item => same(item, c))

export function turn(facing: Facing, dir: 'left' | 'right'): Facing {
  const i = ORDER.indexOf(facing)
  return ORDER[(i + (dir === 'right' ? 1 : 3)) % 4]
}

function result(passed: boolean, failure: GridFailure | undefined, message: string, frames: GridFrame[], state: GridRun['final'], steps: number): GridRun {
  return { passed, failure, message, frames, final: { ...state }, steps, trail: frames.flatMap(f => (f.stamp ? [f.stamp] : [])) }
}

/** Run a connected program (first block must be when_start) on a level. */
export function runGridProgram(level: GridLevel, blocks: ProgramBlock[]): GridRun {
  const state = { x: level.start.x, y: level.start.y, facing: level.start.facing, hasKey: false, doorOpen: !level.door }
  const frames: GridFrame[] = []
  if (blocks[0]?.type !== 'when_start') return result(false, 'no_start', '先放“开始时”，小狐狸才知道什么时候出发。', frames, state, 0)
  if (blocks.some(b => b.disconnected)) return result(false, 'disconnected', '有积木没接在“开始时”下面，掉队的积木不会运行。', frames, state, 0)
  const program = blocks.slice(1)
  if (countBlocks(program) > GRID_MAX_ACTIONS) return result(false, 'too_many', `一次最多 ${GRID_MAX_ACTIONS} 块积木。`, frames, state, 0)
  // SYS-107: unroll “重复 N 次” into the actions that really run.
  const expanded = expandProgram(program, GRID_MAX_STEPS)
  if (!expanded.ok) {
    if (expanded.reason === 'empty_repeat') return result(false, 'empty_repeat', '“重复”积木里面是空的：把要重复的动作放进它的大嘴巴里。', frames, state, 0)
    if (expanded.reason === 'too_deep') return result(false, 'too_deep', '重复里面最多再放一层重复。', frames, state, 0)
    return result(false, 'too_many', `重复的次数太多啦，一次最多走 ${GRID_MAX_STEPS} 步。`, frames, state, 0)
  }
  let steps = 0
  for (const { block, topIndex, rounds } of expanded.steps) {
    const type = block.type as GridBlockType
    if (!GRID_BLOCK_TYPES.includes(type)) return result(false, 'unknown_block', '这块积木不能在网格森林里用。', frames, state, steps)
    const push = (bump?: Cell) => frames.push({ blockIndex: topIndex + 1, action: type, ...state, bump, ...(rounds.length ? { rounds } : {}) })
    if (type === 'turn_left' || type === 'turn_right') {
      state.facing = turn(state.facing, type === 'turn_left' ? 'left' : 'right')
      push()
      continue
    }
    if (type === 'stamp_red' || type === 'stamp_blue') {
      // G0-U3: leave a footprint on the current cell; one footprint per cell.
      const color: FootColor = type === 'stamp_red' ? 'red' : 'blue'
      if (frames.some(fr => fr.stamp && fr.stamp.x === state.x && fr.stamp.y === state.y)) {
        push()
        return result(false, 'stamp_twice', '这一格已经有脚印了。放好一个脚印后，先往前走一格再放下一个。', frames, state, steps)
      }
      frames.push({ blockIndex: topIndex + 1, action: type, ...state, stamp: { x: state.x, y: state.y, color }, ...(rounds.length ? { rounds } : {}) })
      continue
    }
    if (type === 'pick_key') {
      if (!same(level.key, state) || state.hasKey) {
        push()
        return result(false, 'no_key_here', '这里没有钥匙。先走到金钥匙的格子上，再捡钥匙。', frames, state, steps)
      }
      state.hasKey = true
      push()
      continue
    }
    if (type === 'open_door') {
      const door = level.door
      const near = !!door && ORDER.some(f => same(door, { x: state.x + DELTA[f].x, y: state.y + DELTA[f].y }))
      if (!near) {
        push()
        return result(false, 'not_at_door', '离树洞门太远了。走到门旁边的格子再开门。', frames, state, steps)
      }
      if (!state.hasKey) {
        push()
        return result(false, 'need_key', '门锁着，小狐狸手里还没有钥匙。先去捡钥匙再回来开门。', frames, state, steps)
      }
      state.doorOpen = true
      push()
      continue
    }
    const facing = ABSOLUTE[type] ?? state.facing
    state.facing = facing
    const next = { x: state.x + DELTA[facing].x, y: state.y + DELTA[facing].y }
    if (next.x < 0 || next.y < 0 || next.x >= level.cols || next.y >= level.rows) {
      push(next)
      return result(false, 'out_of_bounds', `再往${FACING_WORD[facing]}就走出森林地图了。数一数还剩几格。`, frames, state, steps)
    }
    if (has(level.rocks, next)) {
      push(next)
      return result(false, 'hit_rock', `前面有石头，小狐狸撞到了。在石头前先转弯，绕过去。`, frames, state, steps)
    }
    if (same(level.door, next) && !state.doorOpen) {
      push(next)
      return result(false, 'door_locked', '树洞门还关着，撞门过不去。先拿钥匙、再开门，最后才往前走。', frames, state, steps)
    }
    state.x = next.x
    state.y = next.y
    steps += 1
    if (has(level.water, next)) {
      push()
      return result(false, 'fell_in_water', '掉进小河啦！河边要绕开走，换一条路线试试。', frames, state, steps)
    }
    push()
  }
  if (level.footprints) {
    // G0-U3: the footprints must follow the pattern in path order.
    const trail = frames.flatMap(fr => (fr.stamp ? [fr.stamp] : []))
    const want = level.footprints
    for (let i = 0; i < trail.length; i++) {
      const w = want[i]
      if (!w) return result(false, 'wrong_pattern', `脚印多放了：规律只要 ${want.length} 个脚印，现在放了 ${trail.length} 个。`, frames, state, steps)
      if (w.color !== trail[i].color) return result(false, 'wrong_pattern', `第 ${i + 1} 个脚印应该是${FOOT_WORD[w.color]}色，放成了${FOOT_WORD[trail[i].color]}色。找一找规律从哪里乱了。`, frames, state, steps)
      if (w.x !== trail[i].x || w.y !== trail[i].y) return result(false, 'wrong_pattern', `第 ${i + 1} 个脚印放错了格子：每放一个脚印，要往前走一格。`, frames, state, steps)
    }
    if (trail.length < want.length) return result(false, 'pattern_short', `只放了 ${trail.length} 个脚印，规律要 ${want.length} 个，还差 ${want.length - trail.length} 个。数一数重复了几次。`, frames, state, steps)
  }
  if (!same(level.goal, state)) {
    const dx = level.goal.x - state.x
    const dy = level.goal.y - state.y
    const hint = [dx ? `往${dx > 0 ? '右' : '左'}还差 ${Math.abs(dx)} 格` : '', dy ? `往${dy > 0 ? '下' : '上'}还差 ${Math.abs(dy)} 格` : ''].filter(Boolean).join('，')
    return result(false, 'not_at_goal', `小狐狸停下了，但还没到目标：${hint}。`, frames, state, steps)
  }
  return result(true, undefined, `到达目标！一共走了 ${steps} 格。`, frames, state, steps)
}

export const GRID_FAILURE_LABELS: Record<GridFailure, string> = {
  no_start: '缺少开始',
  disconnected: '积木没连上',
  empty_repeat: '重复里是空的',
  too_deep: '重复套得太深',
  stamp_twice: '同一格放两个脚印',
  wrong_pattern: '脚印规律不对',
  pattern_short: '脚印不够',
  unknown_block: '积木不能用',
  too_many: '积木太多',
  out_of_bounds: '走出地图',
  hit_rock: '撞到石头',
  fell_in_water: '掉进河里',
  door_locked: '门还锁着',
  no_key_here: '这里没钥匙',
  not_at_door: '离门太远',
  need_key: '还没拿钥匙',
  not_at_goal: '没到目标',
}
