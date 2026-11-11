'use client'

// 舞台：按 Scratch VM 回传的角色真实坐标画出背景、篮子、红球、蓝球和得分。
// 沙箱里真实渲染器的画面不会显示在页面上（它画在沙箱 iframe 里的离屏 canvas），所以这里按坐标绘制原创 SVG；
// 位置、可见性、得分全部来自 VM，不在页面里自己算。
// 尺寸：共享壳在不同断点和缩放档位下给舞台一个固定高度的框（overflow:hidden），所以这里按框的宽高取 4:3，整幅舞台都要看得见。

import type { StagePositions } from '../stage-state'
import type { SandboxAssets } from '../vm-adapter'

export type { StagePositions }

const WIDTH = 480
const HEIGHT = 360

const pct = (v: number, total: number) => `${(v / total) * 100}%`
const leftOf = (x: number) => pct(x + WIDTH / 2, WIDTH)
const topOf = (y: number) => pct(HEIGHT / 2 - y, HEIGHT)

export function StageView({ positions, assets, testId, label, caption }: {
  positions: StagePositions
  assets: SandboxAssets | null
  testId: string
  label: string
  /** 舞台左上角的一行小标签（本关要求）。放在舞台里面，不占舞台框之外的高度。 */
  caption?: string
}) {
  const place = (x: number, y: number, w: number) => ({
    position: 'absolute' as const,
    left: leftOf(x),
    top: topOf(y),
    width: pct(w, WIDTH),
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
      data-score={positions.score}
      data-hit-y={Math.round(positions.hitBall.y)}
      data-ground-y={Math.round(positions.groundBall.y)}
      data-hit-visible={positions.hitBall.visible}
      data-ground-visible={positions.groundBall.visible}
      style={{
        position: 'relative', width: 'min(100cqw, 133.333cqh)', aspectRatio: '4 / 3', flex: 'none', overflow: 'hidden', borderRadius: 10,
        background: assets ? `center / cover url("${assets.backdrop}")` : '#e7edf5',
        border: '1px solid var(--kc-line)',
      }}
    >
      {assets ? (
        <>
          {caption && (
            <span
              data-testid="l4-situation"
              style={{
                position: 'absolute', top: 3, left: 3, zIndex: 3, maxWidth: '72%', padding: '1px 6px', borderRadius: 6,
                background: 'rgba(255,255,255,0.88)', color: '#1f2d3d', fontSize: 11, lineHeight: 1.35, pointerEvents: 'none',
              }}
            >
              {caption}
            </span>
          )}
          <span
            data-testid={`${testId}-score`}
            style={{
              position: 'absolute', top: 3, right: 4, zIndex: 3, padding: '0 8px', borderRadius: 8,
              background: 'rgba(31,45,61,0.88)', color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.6, pointerEvents: 'none',
            }}
          >
            得分 {positions.score}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-testid={`${testId}-basket`} src={assets.basket} alt="" draggable={false} style={place(positions.basket.x, positions.basket.y, 80)} />
          {positions.groundBall.visible && (
            // eslint-disable-next-line @next/next/no-img-element
            <img data-testid={`${testId}-ground-ball`} src={assets.groundBall} alt="" draggable={false} style={place(positions.groundBall.x, positions.groundBall.y, 40)} />
          )}
          {positions.hitBall.visible && (
            // eslint-disable-next-line @next/next/no-img-element
            <img data-testid={`${testId}-hit-ball`} src={assets.hitBall} alt="" draggable={false} style={place(positions.hitBall.x, positions.hitBall.y, 40)} />
          )}
        </>
      ) : (
        <p style={{ margin: 0, padding: 12, color: 'var(--kc-text-muted)', fontSize: 13 }}>舞台正在准备…</p>
      )}
    </div>
  )
}
