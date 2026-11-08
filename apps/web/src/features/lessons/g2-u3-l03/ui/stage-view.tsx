'use client'

// 舞台：按 Scratch VM 回传的角色真实坐标画出背景和礼物，并把这一次运行里礼物依次出现过的位置画成小圆点。
// 沙箱没有渲染器，所以画面是这里按坐标绘制的原创 SVG；位置全部来自 VM，不在页面里自己算。
// 绿色底纹是本关要求的范围；落在范围外（或舞台外）的圆点是红色，并带 data-out="true"。

import { inAllowed, L03_PARAMS, type LevelParams } from '../params'
import type { StagePositions } from '../stage-state'
import type { SandboxAssets } from '../vm-adapter'

export type { StagePositions }

const WIDTH = 480
const HEIGHT = 360
/** 圆点所在的横线（舞台坐标 y）：在礼物下方，避免被礼物挡住。 */
const TRAIL_Y = -100

const pct = (v: number, total: number) => `${(v / total) * 100}%`
const leftOf = (x: number) => pct(x + WIDTH / 2, WIDTH)

export function StageView({ positions, assets, testId, label, level }: {
  positions: StagePositions
  assets: SandboxAssets | null
  testId: string
  label: string
  level: LevelParams
}) {
  const lo = Math.max(level.allowedMin, -WIDTH / 2)
  const hi = Math.min(level.allowedMax, WIDTH / 2)
  return (
    <div
      role="img"
      aria-label={label}
      data-testid={testId}
      data-gift-x={Math.round(positions.gift.x)}
      data-gift-y={Math.round(positions.gift.y)}
      data-placed={positions.trail.length}
      style={{
        position: 'relative', width: '100%', aspectRatio: '4 / 3', overflow: 'hidden', borderRadius: 10,
        background: assets ? `center / cover url("${assets.backdrop}")` : '#e7edf5',
        border: '1px solid var(--kc-line)',
      }}
    >
      {assets ? (
        <>
          <div
            data-testid={`${testId}-allowed`}
            data-from={level.allowedMin}
            data-to={level.allowedMax}
            style={{
              position: 'absolute', top: 0, bottom: 0, left: leftOf(lo), width: pct(hi - lo, WIDTH),
              background: 'rgba(46, 160, 90, 0.16)', borderLeft: '2px dashed rgba(46, 140, 80, 0.8)',
              borderRight: '2px dashed rgba(46, 140, 80, 0.8)', pointerEvents: 'none',
            }}
          />
          {positions.trail.map((x, i) => {
            const out = !inAllowed(x, level) || x < L03_PARAMS.stageMinX || x > L03_PARAMS.stageMaxX
            return (
              <span
                key={i}
                data-testid={`${testId}-dot`}
                data-x={x}
                data-out={out}
                style={{
                  position: 'absolute', left: leftOf(x), top: pct(HEIGHT / 2 - TRAIL_Y, HEIGHT), width: 10, height: 10,
                  transform: 'translate(-50%, -50%)', borderRadius: '50%', pointerEvents: 'none',
                  background: out ? '#d6342c' : '#1f7a46', border: '1.5px solid #fff', opacity: 0.9,
                }}
              />
            )
          })}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-testid={`${testId}-gift`}
            src={assets.gift}
            alt=""
            draggable={false}
            style={{
              position: 'absolute', left: leftOf(positions.gift.x), top: pct(HEIGHT / 2 - positions.gift.y, HEIGHT),
              width: pct(48, WIDTH), transform: 'translate(-50%, -50%)', height: 'auto', pointerEvents: 'none', userSelect: 'none',
            }}
          />
        </>
      ) : (
        <p style={{ margin: 0, padding: 12, color: 'var(--kc-text-muted)', fontSize: 13 }}>舞台正在准备…</p>
      )}
    </div>
  )
}
