// SYS-106: G0 grid path-finding engine (direction, path_obstacles).
// Pure and deterministic: the stage animates the trace, and lesson checks
// judge the observed outcome, never a pre-recorded answer animation.

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
}

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
] as const

export type GridBlockType = (typeof GRID_BLOCK_TYPES)[number]
export const GRID_MAX_ACTIONS = 40

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

export type GridFrame = {
  blockIndex: number
  action: GridBlockType
  x: number
  y: number
  facing: Facing
  hasKey: boolean
  doorOpen: boolean
  bump?: Cell
}

export type GridRun = {
  passed: boolean
  failure?: GridFailure
  message: string
  frames: GridFrame[]
  final: { x: number; y: number; facing: Facing; hasKey: boolean; doorOpen: boolean }
  steps: number
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
  return { passed, failure, message, frames, final: { ...state }, steps }
}

/** Run a connected program (first block must be when_start) on a level. */
export function runGridProgram(level: GridLevel, blocks: Array<{ type: string; disconnected?: boolean }>): GridRun {
  const state = { x: level.start.x, y: level.start.y, facing: level.start.facing, hasKey: false, doorOpen: !level.door }
  const frames: GridFrame[] = []
  if (blocks[0]?.type !== 'when_start') return result(false, 'no_start', '先放“开始时”，小狐狸才知道什么时候出发。', frames, state, 0)
  if (blocks.some(b => b.disconnected)) return result(false, 'disconnected', '有积木没接在“开始时”下面，掉队的积木不会运行。', frames, state, 0)
  const program = blocks.slice(1)
  if (program.length > GRID_MAX_ACTIONS) return result(false, 'too_many', `一次最多 ${GRID_MAX_ACTIONS} 块积木。`, frames, state, 0)
  let steps = 0
  for (let i = 0; i < program.length; i++) {
    const type = program[i].type as GridBlockType
    if (!GRID_BLOCK_TYPES.includes(type)) return result(false, 'unknown_block', '这块积木不能在网格森林里用。', frames, state, steps)
    const push = (bump?: Cell) => frames.push({ blockIndex: i + 1, action: type, ...state, bump })
    if (type === 'turn_left' || type === 'turn_right') {
      state.facing = turn(state.facing, type === 'turn_left' ? 'left' : 'right')
      push()
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
