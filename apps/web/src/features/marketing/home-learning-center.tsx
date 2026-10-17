'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'

import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { useLaunchCurriculum } from '@/features/curriculum/use-launch-curriculum'
import {
  defaultGuestProgress,
  readGuestProgress,
  subscribeGuestProgress,
} from '@/features/progress/local-progress'

/**
 * UX-601 home = frozen V2 学习中心 (docs/design/kidscoding-v2/prototype.html
 * #page-home), section for section: title row, dark hero with the V2
 * illustration + continue CTA, weekly progress ring with day dots, three
 * illustrated learning tracks, and the example-works strip. Images are the
 * frozen V2 assets (public/v2). Numbers come from real guest progress; the
 * works strip is labelled as examples exactly like the prototype.
 */

const TRACKS = [
  { id: 'blockly', cls: 'kc-v2h-t-block', title: '图形化编程启蒙', lines: ['事件、顺序、角色动作', '从第一段积木程序开始'], cta: '进入课程', href: '/learn/map' },
  { id: 'scratch', cls: 'kc-v2h-t-scratch', title: 'Scratch 创意编程', lines: ['动画、交互与小游戏', '把奇思妙想变成作品'], cta: '查看工作台', href: '/learn/scratch-lab/G3-U1-L02' },
  { id: 'python', cls: 'kc-v2h-t-python', title: 'Python 项目编程', lines: ['变量、逻辑与真实项目', '逐步迈向文字代码'], cta: '查看实验室', href: '/learn/python-lab/P0-U1-L01' },
] as const

const WORKS = [
  { img: '/v2/work-1.webp', title: '迷宫探险', tags: '移动控制 · 事件逻辑' },
  { img: '/v2/work-2.webp', title: '海底世界', tags: '多角色 · 互动故事' },
  { img: '/v2/work-3.webp', title: '太空探险', tags: '游戏设计 · 判断条件' },
  { img: '/v2/work-4.webp', title: '几何图案', tags: '循环 · 绘制算法' },
  { img: '/v2/work-5.webp', title: '冬日小镇', tags: '场景 · 角色交互' },
] as const

const DAY_NAMES = ['一', '二', '三', '四', '五', '六', '日']

function greeting() {
  const h = new Date().getHours()
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

/** Monday-based index of today (0..6). */
function todayIndex() {
  return (new Date().getDay() + 6) % 7
}

export function HomeLearningCenter() {
  const curriculum = useLaunchCurriculum()
  const { allLessons } = buildLaunchMap(curriculum.lessons)
  const progress = useSyncExternalStore(subscribeGuestProgress, readGuestProgress, () => defaultGuestProgress)
  const hello = useSyncExternalStore(() => () => {}, greeting, () => '你好')
  const today = useSyncExternalStore(() => () => {}, todayIndex, () => -1)

  const done = progress.completedLessonIds.length
  const total = allLessons.length
  const started = done > 0 || progress.projectSnapshots.length > 0
  const nextLesson =
    allLessons.find((l) => !progress.completedLessonIds.includes(l.id)) ??
    allLessons.find((l) => l.id === progress.currentLessonId) ??
    allLessons[0]
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  const works = progress.completedProjectIds.length
  // Days of this week covered by the real streak (only counts once learning started).
  const streak = started ? progress.streakDays : 0
  const activeDay = (i: number) => today >= 0 && i <= today && i > today - streak

  return (
    <div className="kc-v2h">
      <div className="kc-v2h-title-row" data-testid="home-title-row">
        <div>
          <div className="kc-v2h-eyebrow">YOUR LEARNING SPACE</div>
          <h1>{hello}，今天继续创造点新东西。</h1>
          <p className="kc-v2h-subtitle">孩子可以自己做出动画故事：从正在学的课开始，完成一节真正可运行的编程课。</p>
        </div>
        <Link className="kc-v2h-btn kc-v2h-btn-outline kc-v2h-btn-sm" href="/learn/catalog">查看全部课程 →</Link>
      </div>

      <div className="kc-v2h-two-col">
        <section className="kc-v2h-hero" data-testid="story-stage-hero">
          <div className="kc-v2h-hero-art" role="img" aria-label="孩子和机器人一起编程的插画" />
          <div className="kc-v2h-hero-text">
            <div className="kc-v2h-hero-kicker">⎯ {started ? '当前学习' : '第一课'} · 图形化编程启蒙</div>
            {nextLesson ? (
              <h2 data-testid="home-next-lesson">
                第 {nextLesson.sortOrder} 课
                <br />
                {nextLesson.title}
              </h2>
            ) : null}
            <p className="kc-v2h-hero-body">
              拖动积木，让小动物走路、说话、表演，
              <br />
              把故事从想象变成能运行的作品。
            </p>
            <div className="kc-v2h-hero-progress">
              <span>主线进度</span>
              <div className="kc-v2h-line-progress"><i style={{ width: `${percent}%` }} /></div>
              <b>{done} / {total} 课</b>
            </div>
            <div className="kc-v2h-hero-buttons">
              {started && nextLesson ? (
                <Link className="kc-v2h-btn" data-testid="home-continue" href={`/learn/lesson/${nextLesson.id}`}>继续学习 ↗</Link>
              ) : (
                <Link className="kc-v2h-btn" data-testid="home-start" href="/onboarding/age">开始学第一节</Link>
              )}
              <Link className="kc-v2h-btn kc-v2h-btn-invert" href="/learn/map">学习地图</Link>
            </div>
          </div>
        </section>

        <section className="kc-v2h-panel kc-v2h-progress-card" data-testid="home-progress">
          <div className="kc-v2h-card-title">
            学习进度
            <Link className="kc-v2h-sub-action" href="/parent/overview">看看家长如何陪学 ↗</Link>
          </div>
          <div className="kc-v2h-progress-row">
            <div
              className="kc-v2h-ring"
              style={{ background: `conic-gradient(#3169ea 0% ${percent}%, #e8effc ${percent}% 100%)` }}
              role="img"
              aria-label={`已完成 ${done} / ${total} 课`}
            >
              <div className="kc-v2h-hole"><strong>{done}/{total}</strong><small>启蒙主线</small></div>
            </div>
            <div className="kc-v2h-stats">
              <div><b><i className="kc-v2h-dot" />{done} 节</b><small>完成课程</small></div>
              <div><b><i className="kc-v2h-dot kc-v2h-dot-green" />{works} 件</b><small>完成作品</small></div>
              <div><b><i className="kc-v2h-dot kc-v2h-dot-amber" />{progress.stars} 颗</b><small>获得星星</small></div>
            </div>
          </div>
          <div className="kc-v2h-days" aria-label={`连续学习 ${streak} 天`}>
            {DAY_NAMES.map((d, i) => (
              <span key={d} className={activeDay(i) ? 'kc-v2h-day-done' : undefined}>
                {d}
                <b>{activeDay(i) ? '✓' : '·'}</b>
              </span>
            ))}
          </div>
        </section>
      </div>

      <section data-testid="growth-path">
        <div className="kc-v2h-section-heading">
          <div>
            <h2>我的学习路径</h2>
            <p className="kc-v2h-subtitle">从图形化思维到代码创作，每一步都落到可运行作品</p>
          </div>
          <Link className="kc-v2h-sub-action" href="/learn/catalog">完整课程体系 ↗</Link>
        </div>
        <div className="kc-v2h-track-grid">
          {TRACKS.map((t) => (
            <div key={t.id} className={`kc-v2h-track ${t.cls}`} data-testid={`home-track-${t.id}`}>
              <div>
                <h3>{t.title}</h3>
                <p>{t.lines[0]}<br />{t.lines[1]}</p>
                <Link className="kc-v2h-mini-link" href={t.href}>{t.cta} ↗</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section data-testid="home-works">
        <div className="kc-v2h-section-heading">
          <div>
            <h2>作品展示 · 示例作品</h2>
            <p className="kc-v2h-subtitle">学完这些课，你也能做出这样的作品</p>
          </div>
          <Link className="kc-v2h-sub-action" href="/learn/portfolio">查看作品中心 ↗</Link>
        </div>
        <div className="kc-v2h-work-grid">
          {WORKS.map((w) => (
            <Link key={w.title} href="/learn/portfolio" className="kc-v2h-panel kc-v2h-work-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={w.img} alt={`${w.title}示例作品`} />
              <div className="kc-v2h-work-text"><h4>{w.title}</h4><p>{w.tags}</p></div>
            </Link>
          ))}
        </div>
        <p className="kc-v2h-footnote">作品封面为示例，你的作品会保存在作品中心。</p>
      </section>
    </div>
  )
}
