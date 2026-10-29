'use client'

import { useEffect, useState } from 'react'
import { CharacterArt } from '../playable-stage/character-art'
import type { Cell, Facing, FootColor, Footprint, GridLevel, GridRun } from './grid-engine'

// SYS-106 cartoon forest grid stage. Draws the level and the fox at one
// frame of a real engine run; no answer animation is pre-recorded.

const T = 64
const has = (list: Cell[] | undefined, x: number, y: number) => !!list?.some(c => c.x === x && c.y === y)
const ARROW_ROT: Record<Facing, number> = { up: -90, right: 0, down: 90, left: 180 }

function Rock({ x, y }: Cell) {
  return (
    <g transform={`translate(${x * T} ${y * T})`} data-grid-item="rock">
      <ellipse cx="32" cy="52" rx="22" ry="5" fill="#2f5a3f" opacity=".2" />
      <path d="M12 48 Q10 26 26 18 Q40 12 50 24 Q58 34 54 48 Z" fill="#a9b4c2" stroke="#5f6b7a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 26 Q30 20 38 23" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".75" />
      <circle cx="40" cy="38" r="3" fill="#8c97a6" />
    </g>
  )
}

function Water({ x, y }: Cell) {
  return (
    <g transform={`translate(${x * T} ${y * T})`} data-grid-item="water">
      <rect x="2" y="2" width={T - 4} height={T - 4} rx="14" fill="#6cc8ff" stroke="#3a9ad9" strokeWidth="2.5" />
      <path d="M12 26 q6 -6 12 0 t12 0 t12 0 M12 42 q6 -6 12 0 t12 0 t12 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".85" />
    </g>
  )
}

function Key({ x, y }: Cell) {
  return (
    <g transform={`translate(${x * T} ${y * T})`} data-grid-item="key">
      <circle cx="32" cy="32" r="20" fill="#fff6c9" opacity=".8" />
      <circle cx="24" cy="32" r="8" fill="none" stroke="#f5b300" strokeWidth="5" />
      <path d="M32 32h16M42 32v7M47 32v5" stroke="#f5b300" strokeWidth="5" strokeLinecap="round" />
    </g>
  )
}

function Door({ x, y, open }: Cell & { open: boolean }) {
  return (
    <g transform={`translate(${x * T} ${y * T})`} data-grid-item="door" data-open={open ? 'true' : 'false'}>
      <path d="M6 60 V30 Q6 4 32 4 Q58 4 58 30 V60 Z" fill="#9b6a3c" stroke="#5e3b1c" strokeWidth="3" />
      <path d="M14 60 V32 Q14 14 32 14 Q50 14 50 32 V60 Z" fill={open ? '#3b2a1c' : '#d08a45'} stroke="#5e3b1c" strokeWidth="2.5" />
      {open ? (
        <path d="M18 58 Q32 40 46 58" fill="#5c4630" opacity=".6" />
      ) : (
        <>
          <path d="M32 16 V60" stroke="#5e3b1c" strokeWidth="2" opacity=".5" />
          <rect x="26" y="36" width="12" height="11" rx="3" fill="#f5b300" stroke="#8a5a12" strokeWidth="2" />
          <path d="M28.5 36 v-4 a3.5 3.5 0 0 1 7 0 v4" fill="none" stroke="#8a5a12" strokeWidth="2.4" />
        </>
      )}
    </g>
  )
}

function Goal({ x, y }: Cell) {
  return (
    <g transform={`translate(${x * T} ${y * T})`} data-grid-item="goal">
      <ellipse cx="32" cy="56" rx="22" ry="5" fill="#2f5a3f" opacity=".2" />
      <rect x="18" y="30" width="28" height="24" rx="6" fill="#fff3df" stroke="#a0704a" strokeWidth="2.5" />
      <path d="M8 34 Q32 0 56 34 Z" fill="#ff5d6c" stroke="#b5303e" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="22" cy="24" r="3.6" fill="#fff" />
      <circle cx="38" cy="18" r="3" fill="#fff" />
      <circle cx="44" cy="28" r="2.6" fill="#fff" />
      <rect x="27" y="40" width="10" height="14" rx="5" fill="#a0704a" />
    </g>
  )
}

const PAW_FILL: Record<FootColor, string> = { red: '#e5484d', blue: '#3e7bfa' }
/** G0-U3: a footprint on a cell — solid when the fox stamped it, a faded dashed outline for the bear's old trail. */
function Paw({ x, y, color, ghost }: Footprint & { ghost?: boolean }) {
  const fill = ghost ? 'none' : PAW_FILL[color]
  const stroke = ghost ? PAW_FILL[color] : '#fff'
  const dash = ghost ? '3 3' : undefined
  const op = ghost ? 0.55 : 1
  return (
    <g transform={`translate(${x * T + 16} ${y * T + 14})`} data-grid-item={ghost ? 'ghost-paw' : 'paw'} data-color={color} opacity={op}>
      <ellipse cx="16" cy="24" rx="9" ry="7.5" fill={fill} stroke={stroke} strokeWidth="2.4" strokeDasharray={dash} />
      {[[5, 12], [12, 6], [20, 6], [27, 12]].map(([cx, cy]) => (
        <circle key={`${cx}`} cx={cx} cy={cy} r="3.8" fill={fill} stroke={stroke} strokeWidth="2" strokeDasharray={dash} />
      ))}
    </g>
  )
}

/** G0-U3-L01 story scenery: the bear's mushroom signpost — red, blue, red, blue paws (original art, V2 flat style). */
export function MushroomPath() {
  return (
    <g data-grid-item="mushroompath">
      <ellipse cx="28" cy="60" rx="26" ry="5" fill="#2f5a3f" opacity=".22" />
      <rect x="25" y="30" width="6" height="30" rx="2" fill="#9b6a3c" stroke="#5e3b1c" strokeWidth="2" />
      <path d="M4 30 Q28 4 52 30 Z" fill="#ff5d6c" stroke="#b5303e" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="18" cy="20" r="3" fill="#fff" />
      <circle cx="34" cy="15" r="2.6" fill="#fff" />
      <circle cx="42" cy="24" r="2.4" fill="#fff" />
      <rect x="6" y="32" width="44" height="14" rx="4" fill="#ffe2b8" stroke="#a0704a" strokeWidth="2" />
      {(['#e5484d', '#3e7bfa', '#e5484d', '#3e7bfa'] as const).map((c, i) => (
        <g key={i} transform={`translate(${12 + i * 10} 39)`}>
          <ellipse cx="0" cy="1.5" rx="3" ry="2.6" fill={c} />
          <circle cx="-2.4" cy="-2.2" r="1.2" fill={c} />
          <circle cx="0" cy="-3.2" r="1.2" fill={c} />
          <circle cx="2.4" cy="-2.2" r="1.2" fill={c} />
        </g>
      ))}
    </g>
  )
}

/** G0-U1-L01 story scenery: the fox's treehouse with its two command signs (original art, V2 flat style). */
export function Treehouse() {
  return (
    <g data-grid-item="treehouse">
      <ellipse cx="28" cy="60" rx="26" ry="5" fill="#2f5a3f" opacity=".22" />
      <path d="M20 60 V30 h16 V60 Z" fill="#9b6a3c" stroke="#5e3b1c" strokeWidth="2.5" />
      <path d="M24 44 q4 -3 8 0" stroke="#5e3b1c" strokeWidth="2" fill="none" opacity=".6" />
      <circle cx="28" cy="10" r="22" fill="#4fae55" stroke="#2f7d3a" strokeWidth="2.5" />
      <circle cx="10" cy="20" r="12" fill="#5cbf60" stroke="#2f7d3a" strokeWidth="2" />
      <circle cx="46" cy="20" r="12" fill="#5cbf60" stroke="#2f7d3a" strokeWidth="2" />
      <rect x="12" y="14" width="32" height="20" rx="4" fill="#ffe2b8" stroke="#a0704a" strokeWidth="2.5" />
      <path d="M8 16 L28 2 L48 16 Z" fill="#ff8a3d" stroke="#b5562a" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="23" y="21" width="10" height="13" rx="5" fill="#a0704a" />
      <circle cx="17" cy="24" r="3" fill="#7fd0ff" stroke="#a0704a" strokeWidth="1.5" />
      <g transform="translate(-2 38)">
        <rect width="22" height="11" rx="3" fill="#ffbf00" stroke="#a87400" strokeWidth="1.5" />
        <path d="M5 5.5 h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g transform="translate(34 38)">
        <rect width="22" height="11" rx="3" fill="#4c97ff" stroke="#2f6fd1" strokeWidth="1.5" />
        <path d="M5 5.5 h10 M12 2.5 l3.5 3 -3.5 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </g>
  )
}

/** G0-U1-L02 story scenery: the forest post office with its four-way signpost (original art, V2 flat style). */
export function Signpost() {
  return (
    <g data-grid-item="signpost">
      <ellipse cx="28" cy="60" rx="26" ry="5" fill="#2f5a3f" opacity=".22" />
      <rect x="4" y="34" width="22" height="24" rx="3" fill="#ffe2b8" stroke="#a0704a" strokeWidth="2.5" />
      <path d="M1 36 L15 24 L29 36 Z" fill="#ff5d6c" stroke="#b5303e" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="9" y="42" width="12" height="8" rx="1.5" fill="#fff" stroke="#a0704a" strokeWidth="1.5" />
      <path d="M9 42 L15 47 L21 42" stroke="#a0704a" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <rect x="39" y="14" width="5" height="46" rx="2" fill="#9b6a3c" stroke="#5e3b1c" strokeWidth="2" />
      <g transform="translate(41.5 8)">
        <circle r="7" fill="#4c97ff" stroke="#2f6fd1" strokeWidth="1.5" />
        <path d="M0 4 V-4 M-3 -1 L0 -4 L3 -1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      <g transform="translate(41.5 24)">
        <path d="M2 -5 h11 l5 5 -5 5 h-11 Z" fill="#4c97ff" stroke="#2f6fd1" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M-2 -5 h-11 l-5 5 5 5 h11 Z" fill="#4c97ff" stroke="#2f6fd1" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
      <g transform="translate(41.5 40)">
        <circle r="6" fill="#4c97ff" stroke="#2f6fd1" strokeWidth="1.5" />
        <path d="M0 -3.5 V3.5 M-2.5 1 L0 3.5 L2.5 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </g>
  )
}

/** G0-U1-L03 story scenery: the squirrel's counting board — one acorn per step (original art, V2 flat style). */
export function CountingBoard() {
  return (
    <g data-grid-item="counting">
      <ellipse cx="28" cy="60" rx="26" ry="5" fill="#2f5a3f" opacity=".22" />
      <rect x="25" y="26" width="6" height="34" rx="2" fill="#9b6a3c" stroke="#5e3b1c" strokeWidth="2" />
      <rect x="2" y="4" width="52" height="26" rx="5" fill="#ffe2b8" stroke="#a0704a" strokeWidth="2.5" />
      <g transform="translate(13 13)">
        <ellipse cx="0" cy="2" rx="5" ry="6" fill="#c9823e" stroke="#7a4a1c" strokeWidth="1.5" />
        <path d="M-6 -2 Q0 -8 6 -2 Z" fill="#7a4a1c" />
      </g>
      <g transform="translate(28 13)">
        <ellipse cx="0" cy="2" rx="5" ry="6" fill="#c9823e" stroke="#7a4a1c" strokeWidth="1.5" />
        <path d="M-6 -2 Q0 -8 6 -2 Z" fill="#7a4a1c" />
      </g>
      <g transform="translate(43 13)">
        <ellipse cx="0" cy="2" rx="5" ry="6" fill="#c9823e" stroke="#7a4a1c" strokeWidth="1.5" />
        <path d="M-6 -2 Q0 -8 6 -2 Z" fill="#7a4a1c" />
      </g>
      <g fill="#5e3b1c" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
        <text x="13" y="28">1</text>
        <text x="28" y="28">2</text>
        <text x="43" y="28">3</text>
      </g>
      <path d="M6 58 q4 -8 10 -4 q4 -6 8 2" fill="#5cbf60" stroke="#2f7d3a" strokeWidth="1.5" />
    </g>
  )
}

/** G0-U1-L04 story scenery: the crossroads turn sign (turn left / turn right) beside a small rock (original art, V2 flat style). */
export function TurnSign() {
  return (
    <g data-grid-item="turnsign">
      <ellipse cx="28" cy="60" rx="26" ry="5" fill="#2f5a3f" opacity=".22" />
      <rect x="25" y="28" width="6" height="32" rx="2" fill="#9b6a3c" stroke="#5e3b1c" strokeWidth="2" />
      <circle cx="28" cy="18" r="17" fill="#ffe2b8" stroke="#a0704a" strokeWidth="2.5" />
      <path d="M24 28 V18 Q24 11 17 11 H13" stroke="#4c97ff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M16 7 L11 11 L16 15" stroke="#4c97ff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 28 V18 Q32 11 39 11 H43" stroke="#ff8a3d" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 7 L45 11 L40 15" stroke="#ff8a3d" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 60 q2 -9 9 -9 q8 0 10 9 Z" fill="#9aa3ad" stroke="#5f6b76" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 55 q3 -2 6 0" stroke="#fff" strokeWidth="1.5" fill="none" opacity=".6" />
    </g>
  )
}

/** G0-U1-L05 story scenery: the key hook board — key first, then the lock (original art, V2 flat style). */
export function KeyHook() {
  return (
    <g data-grid-item="keyhook">
      <ellipse cx="28" cy="60" rx="26" ry="5" fill="#2f5a3f" opacity=".22" />
      <rect x="25" y="30" width="6" height="30" rx="2" fill="#9b6a3c" stroke="#5e3b1c" strokeWidth="2" />
      <rect x="4" y="4" width="48" height="28" rx="5" fill="#ffe2b8" stroke="#a0704a" strokeWidth="2.5" />
      <path d="M14 8 v5" stroke="#5e3b1c" strokeWidth="2" strokeLinecap="round" />
      <g transform="translate(14 19)">
        <circle r="5" fill="#fff6c9" stroke="#f5b300" strokeWidth="2" />
        <path d="M0 5 v7 M0 9 h3 M0 12 h3" stroke="#f5b300" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <path d="M24 18 h7 M28 14.5 l3.5 3.5 -3.5 3.5" stroke="#4c97ff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(42 19)">
        <path d="M-4 -2 v-3 a4 4 0 0 1 8 0 v3" stroke="#7a4a1c" strokeWidth="2" fill="none" />
        <rect x="-6" y="-2" width="12" height="10" rx="2" fill="#c9823e" stroke="#7a4a1c" strokeWidth="1.5" />
        <circle cx="0" cy="3" r="1.6" fill="#7a4a1c" />
      </g>
    </g>
  )
}

/** G0-U1-L06 story scenery: the forest guide's hand-drawn map with a dotted route (original art, V2 flat style). */
export function GuideMap() {
  return (
    <g data-grid-item="guidemap">
      <ellipse cx="28" cy="60" rx="26" ry="5" fill="#2f5a3f" opacity=".22" />
      <rect x="25" y="34" width="6" height="26" rx="2" fill="#9b6a3c" stroke="#5e3b1c" strokeWidth="2" />
      <path d="M3 6 L19 2 L37 6 L53 2 V34 L37 38 L19 34 L3 38 Z" fill="#fff3df" stroke="#a0704a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M19 2 V34 M37 6 V38" stroke="#a0704a" strokeWidth="1.5" opacity=".5" />
      <path d="M8 30 Q14 22 22 24 T36 16 T48 10" stroke="#4c97ff" strokeWidth="2.2" fill="none" strokeDasharray="3 3" strokeLinecap="round" />
      <circle cx="8" cy="30" r="2.6" fill="#ff8a3d" />
      <path d="M45 7 l6 6 M51 7 l-6 6" stroke="#ff5d6c" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 14 q3 -4 6 0 Z" fill="#9aa3ad" stroke="#5f6b76" strokeWidth="1.2" />
      <path d="M10 15 q3 2 6 0" stroke="#4c97ff" strokeWidth="1.8" fill="none" />
    </g>
  )
}

function Bump({ x, y }: Cell) {
  return (
    <g transform={`translate(${x * T + 32} ${y * T + 32})`} data-grid-item="bump">
      <path d="M0 -20 L5 -7 19 -9 9 1 15 14 0 7 -15 14 -9 1 -19 -9 -5 -7Z" fill="#ffd23f" stroke="#ff6b3d" strokeWidth="3" strokeLinejoin="round" />
    </g>
  )
}

export type GridStageState = { x: number; y: number; facing: Facing; hasKey: boolean; doorOpen: boolean; bump?: Cell }

export function GridStage({ level, state, trail = [], stamps = [], label }: { level: GridLevel; state: GridStageState; trail?: Cell[]; /** G0-U3: footprints already stamped. */ stamps?: Footprint[]; label?: string }) {
  const w = level.cols * T
  const h = level.rows * T
  // Story scenery sits just left of the map, so the fox visibly leaves home or the post office; it is never a cell.
  const left = level.scenery ? 64 : 0
  const tiles = []
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      if (has(level.water, x, y)) continue
      tiles.push(<rect key={`${x}-${y}`} x={x * T + 2} y={y * T + 2} width={T - 4} height={T - 4} rx="14" fill={(x + y) % 2 ? '#b8e68f' : '#c9ef9f'} stroke="#8fcf6a" strokeWidth="2" />)
    }
  }
  return (
    <svg
      className="kc-grid-stage"
      viewBox={`${-8 - left} -8 ${w + 16 + left} ${h + 16}`}
      role="img"
      aria-label={label ?? `森林网格 ${level.cols}×${level.rows}，小狐狸在第 ${state.x + 1} 列第 ${state.y + 1} 行，面朝${{ up: '上', right: '右', down: '下', left: '左' }[state.facing]}`}
      data-testid="grid-stage"
      data-fox-cell={`${state.x},${state.y}`}
      data-fox-facing={state.facing}
      data-stamps={stamps.map(p => p.color[0]).join('')}
    >
      {left ? <g transform={`translate(${-left - 2} 2)`}>{level.scenery === 'signpost' ? <Signpost /> : level.scenery === 'counting' ? <CountingBoard /> : level.scenery === 'turnsign' ? <TurnSign /> : level.scenery === 'keyhook' ? <KeyHook /> : level.scenery === 'guidemap' ? <GuideMap /> : level.scenery === 'mushroompath' ? <MushroomPath /> : <Treehouse />}</g> : null}
      <rect x="-8" y="-8" width={w + 16} height={h + 16} rx="22" fill="#7cc35b" />
      {tiles}
      {level.water?.map(c => <Water key={`w${c.x}-${c.y}`} {...c} />)}
      {trail.map((c, i) => <circle key={`t${i}`} cx={c.x * T + 32} cy={c.y * T + 32} r="5" fill="#fff" opacity=".7" />)}
      {level.footprints?.map((p, i) => <Paw key={`g${i}`} {...p} ghost />)}
      {stamps.map((p, i) => <Paw key={`p${i}`} {...p} />)}
      <Goal {...level.goal} />
      {level.rocks?.map(c => <Rock key={`r${c.x}-${c.y}`} {...c} />)}
      {level.key && !state.hasKey ? <Key {...level.key} /> : null}
      {level.door ? <Door {...level.door} open={state.doorOpen} /> : null}
      <g transform={`translate(${state.x * T} ${state.y * T})`} data-grid-item="fox" style={{ transition: 'transform 260ms ease' }}>
        <svg x="2" y="-4" width="60" height="66" viewBox="0 0 100 110">
          <g transform={state.facing === 'left' ? 'translate(100 0) scale(-1 1)' : undefined}>
            <CharacterArt id="fox" />
          </g>
        </svg>
        <g transform={`translate(52 12) rotate(${ARROW_ROT[state.facing]})`}>
          <circle r="10" fill="#4c97ff" stroke="#fff" strokeWidth="2.5" />
          <path d="M-5 -3h5v-4l6 7-6 7v-4h-5z" fill="#fff" />
        </g>
        {state.hasKey ? (
          <g transform="translate(6 46)" data-grid-item="carried-key">
            <circle r="9" fill="#fff6c9" stroke="#f5b300" strokeWidth="2" />
            <path d="M-4 0h9M2 0v3" stroke="#f5b300" strokeWidth="2.6" strokeLinecap="round" />
          </g>
        ) : null}
      </g>
      {state.bump ? <Bump {...state.bump} /> : null}
    </svg>
  )
}

/** Steps through a real run's frames so the child watches each block act. */
export function useGridPlayback(level: GridLevel, run: GridRun | null, intervalMs = 420) {
  const [tick, setTick] = useState<{ run: GridRun | null; index: number }>({ run, index: -1 })
  if (tick.run !== run) setTick({ run, index: -1 })
  const index = tick.run === run ? tick.index : -1
  useEffect(() => {
    if (!run) return
    let i = -1
    const timer = setInterval(() => {
      i += 1
      if (i >= run.frames.length) { clearInterval(timer); return }
      setTick({ run, index: i })
    }, intervalMs)
    return () => clearInterval(timer)
  }, [run, intervalMs])
  const start: GridStageState = { x: level.start.x, y: level.start.y, facing: level.start.facing, hasKey: false, doorOpen: !level.door }
  const frames = run?.frames ?? []
  const state: GridStageState = index >= 0 ? frames[index] : start
  const trail = [{ x: level.start.x, y: level.start.y }, ...frames.slice(0, index + 1).map(f => ({ x: f.x, y: f.y }))]
  const stamps = frames.slice(0, index + 1).flatMap(f => (f.stamp ? [f.stamp] : []))
  const done = !!run && index >= frames.length - 1
  return { state, trail, stamps, done }
}
