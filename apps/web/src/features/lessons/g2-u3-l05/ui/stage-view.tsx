'use client'

// 舞台：把真实 VM 每一帧回报的 timeLeft / score 画成大大的倒计时牌和得分牌。
// 本课没有渲染器画面（判定不需要碰撞），所以舞台是课程自己画的显示牌：数字全部来自 VM，不在页面里推算；
// 圆环只是把同一个 timeLeft 画成一圈进度，不产生新的数值。
// 尺寸：共享壳在不同断点和缩放档位下给舞台一个固定高度的框（overflow:hidden），所以这里按框的宽高取 4:3，整幅舞台都要看得见。

import type { StageDisplay } from '../stage-state'

export type { StageDisplay }

export function StageView({ display, running, startSeconds, testId, label, caption }: {
  display: StageDisplay
  running: boolean
  startSeconds: number
  testId: string
  label: string
  /** 舞台左上角的一行小标签（本关要求）。放在舞台里面，不占舞台框之外的高度。 */
  caption?: string
}) {
  const { timeLeft, score, over } = display
  const frac = startSeconds > 0 ? Math.max(0, Math.min(1, timeLeft / startSeconds)) : 0
  const R = 52
  const CIRC = 2 * Math.PI * R
  return (
    <div
      role="img"
      aria-label={label}
      data-testid={testId}
      data-time-left={timeLeft}
      data-score={score}
      data-over={over}
      style={{
        position: 'relative', width: 'min(100cqw, 133.333cqh)', aspectRatio: '4 / 3', flex: 'none', overflow: 'hidden', borderRadius: 10,
        background: 'linear-gradient(180deg, #fdf6e3 0%, #f7e8c9 55%, #eed9ac 100%)',
        border: '1px solid var(--kc-line)',
      }}
    >
      {caption && (
        <span
          data-testid="l5-situation"
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
        得分 {score}
      </span>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <svg width="150" height="150" viewBox="0 0 150 150" aria-hidden="true" style={{ maxWidth: '46%', height: 'auto' }}>
          <circle cx="75" cy="75" r={R} fill="rgba(255,255,255,0.75)" stroke="#d9c08a" strokeWidth="10" />
          <circle
            cx="75" cy="75" r={R} fill="none" stroke={timeLeft < 0 ? '#c0392b' : '#e07b24'} strokeWidth="10"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - frac)} strokeLinecap="round"
            transform="rotate(-90 75 75)"
          />
          <text x="75" y="72" textAnchor="middle" fontSize="40" fontWeight="700" fill={timeLeft < 0 ? '#c0392b' : '#1f2d3d'}>
            {timeLeft}
          </text>
          <text x="75" y="96" textAnchor="middle" fontSize="13" fill="#5a4632">还剩（秒）</text>
        </svg>
        <span
          data-testid={`${testId}-status`}
          style={{ fontSize: 15, fontWeight: 700, color: over ? '#1d7a4f' : '#1f2d3d', minHeight: 22 }}
        >
          {over ? '游戏结束！' : running ? '倒计时进行中…' : timeLeft < 0 ? '时间变成负数了' : '点“运行作品”开始'}
        </span>
      </div>
    </div>
  )
}
