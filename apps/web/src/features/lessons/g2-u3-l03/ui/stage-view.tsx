'use client'

// 舞台：按 Scratch VM 回传的角色真实坐标画出背景和礼物，并把这一次运行里礼物依次出现过的位置画成小圆点。
// 沙箱没有渲染器，所以画面是这里按坐标绘制的原创 SVG；位置全部来自 VM，不在页面里自己算。
// 尺寸：共享壳在不同断点和缩放档位下给舞台一个固定高度的框（overflow:hidden），所以这里按框的高度取 4:3，整幅舞台都要看得见。
// 绿色底纹是本关要求的范围；落在范围外的圆点是红色（data-out="true"）；落在整个舞台之外的用贴边的红色箭头表示（data-offstage="true"）。

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

export function StageView({ positions, assets, testId, label, level, caption }: {
  positions: StagePositions
  assets: SandboxAssets | null
  testId: string
  label: string
  level: LevelParams
  /** 舞台左上角的一行小标签（本关要求）。放在舞台里面，不占舞台框之外的高度。 */
  caption?: string
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
        position: 'relative', width: 'min(100cqw, 133.333cqh)', aspectRatio: '4 / 3', flex: 'none', overflow: 'hidden', borderRadius: 10,
        background: assets ? `center / cover url("${assets.backdrop}")` : '#e7edf5',
        border: '1px solid var(--kc-line)',
      }}
    >
      {assets ? (
        <>
          {caption && (
            <span
              data-testid="l3-situation"
              style={{
                position: 'absolute', top: 3, left: 3, zIndex: 2, maxWidth: '70%', padding: '1px 6px', borderRadius: 6,
                background: 'rgba(255,255,255,0.85)', color: '#1f2d3d', fontSize: 11, lineHeight: 1.35, pointerEvents: 'none',
              }}
            >
              {caption}
            </span>
          )}
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
            // 位置在整个舞台之外时，圆点会被舞台边缘裁掉、孩子看不见“跑出去了”：改成贴在边缘的红色箭头（具体数值见反馈文字）。
            const offStage = x < L03_PARAMS.stageMinX || x > L03_PARAMS.stageMaxX
            const out = !inAllowed(x, level) || offStage
            const shownX = Math.min(L03_PARAMS.stageMaxX, Math.max(L03_PARAMS.stageMinX, x))
            return (
              <span
                key={i}
                data-testid={`${testId}-dot`}
                data-x={x}
                data-out={out}
                data-offstage={offStage}
                style={{
                  position: 'absolute', left: leftOf(shownX), top: pct(HEIGHT / 2 - TRAIL_Y, HEIGHT),
                  transform: offStage ? `translate(${x < 0 ? '0' : '-100%'}, -50%)` : 'translate(-50%, -50%)',
                  pointerEvents: 'none', opacity: 0.95,
                  // 箭头用 CSS 三角形画，不依赖字体（字体缺失时字符会变成方框）
                  ...(offStage
                    ? { width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', ...(x < 0 ? { borderRight: '11px solid #d6342c' } : { borderLeft: '11px solid #d6342c' }) }
                    : { width: 10, height: 10, borderRadius: '50%', background: out ? '#d6342c' : '#1f7a46', border: '1.5px solid #fff' }),
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
