'use client'

// 舞台：按 Scratch VM 回传的角色真实坐标画出果园、篮子、水果。
// 沙箱没有渲染器，所以画面是这里按坐标绘制的原创 SVG；位置全部来自 VM，不在页面里自己算。

import type { StagePositions } from '../stage-state'
import type { SandboxAssets } from '../vm-adapter'

export type { StagePositions }

const WIDTH = 480
const HEIGHT = 360

const pct = (v: number, total: number) => `${(v / total) * 100}%`

export function StageView({ positions, assets, testId, label }: {
  positions: StagePositions
  assets: SandboxAssets | null
  testId: string
  label: string
}) {
  const place = (p: { x: number; y: number }, size: { w: number; h: number }) => ({
    position: 'absolute' as const,
    left: pct(p.x + WIDTH / 2, WIDTH),
    top: pct(HEIGHT / 2 - p.y, HEIGHT),
    width: pct(size.w, WIDTH),
    transform: 'translate(-50%, -50%)',
    height: 'auto',
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
  })
  return (
    <div
      role="img"
      aria-label={label}
      data-testid={testId}
      data-basket-x={Math.round(positions.basket.x)}
      data-fruit-x={Math.round(positions.fruit.x)}
      data-fruit-y={Math.round(positions.fruit.y)}
      style={{
        position: 'relative', width: '100%', aspectRatio: '4 / 3', overflow: 'hidden', borderRadius: 10,
        background: assets ? `center / cover url("${assets.backdrop}")` : '#e7edf5',
        border: '1px solid var(--kc-line)',
      }}
    >
      {assets ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-testid={`${testId}-fruit`} src={assets.fruit} alt="" draggable={false} style={place(positions.fruit, { w: 40, h: 40 })} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-testid={`${testId}-basket`} src={assets.basket} alt="" draggable={false} style={place(positions.basket, { w: 80, h: 40 })} />
        </>
      ) : (
        <p style={{ margin: 0, padding: 12, color: 'var(--kc-text-muted)', fontSize: 13 }}>舞台正在准备…</p>
      )}
    </div>
  )
}
