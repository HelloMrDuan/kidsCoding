'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'

import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { useLaunchCurriculum } from '@/features/curriculum/use-launch-curriculum'
import { MapWorldScene, MAP_WORLD_THEMES } from '@/features/lessons/map-world-scene'
import { CharacterArt } from '@/features/lessons/playable-stage/character-art'
import {
  defaultGuestProgress,
  readGuestProgress,
  subscribeGuestProgress,
} from '@/features/progress/local-progress'

/**
 * UX-601 home = frozen V2 学习中心 (prototype #page-home) in the
 * kid-cartoon content style the owner requires (VISUAL-LOCK.md,
 * children audience). Every number shown comes from real guest
 * progress and the real launch curriculum; nothing is demo data.
 */

const TRACKS = [
  {
    id: 'blockly',
    title: '图形化编程启蒙',
    body: '事件、顺序、角色动作，从第一段积木程序开始',
    status: '12 课全部开放',
    href: '/learn/map',
    cta: '进入课程',
    mascot: 'fox',
    tone: 'kc-home-track-sun',
  },
  {
    id: 'scratch',
    title: 'Scratch 创意编程',
    body: '动画、交互与小游戏，把奇思妙想变成作品',
    status: '部分课程试验',
    href: '/learn/scratch-lab/G3-U1-L02',
    cta: '去工作台',
    mascot: 'bird',
    tone: 'kc-home-track-sky',
  },
  {
    id: 'python',
    title: 'Python 项目编程',
    body: '变量、逻辑与真实项目，慢慢走向文字代码',
    status: '部分课程试验',
    href: '/learn/python-lab/P0-U1-L01',
    cta: '去实验室',
    mascot: 'frog',
    tone: 'kc-home-track-grape',
  },
] as const

function greeting() {
  const h = new Date().getHours()
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function HomeLearningCenter() {
  const curriculum = useLaunchCurriculum()
  const { allLessons, foundationUnits } = buildLaunchMap(curriculum.lessons)
  const progress = useSyncExternalStore(
    subscribeGuestProgress,
    readGuestProgress,
    () => defaultGuestProgress,
  )
  const hello = useSyncExternalStore(
    () => () => {},
    greeting,
    () => '你好',
  )

  const done = progress.completedLessonIds.length
  const total = allLessons.length
  const started = done > 0 || progress.projectSnapshots.length > 0
  const nextLesson =
    allLessons.find((l) => !progress.completedLessonIds.includes(l.id)) ??
    allLessons.find((l) => l.id === progress.currentLessonId) ??
    allLessons[0]
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="kc-home">
      <section className="kc-home-hero-row" data-testid="story-stage-hero">
        <div className="kc-home-hero">
          <MapWorldScene theme="forest" label="森林冒险世界，小狐狸和小兔子在等你" />
          <div className="kc-home-hero-card">
            <span className="kc-home-kicker">✨ 当前学习 · 图形化编程启蒙</span>
            <h1>{hello}，小小创作家！</h1>
            <p className="kc-home-lead">
              孩子可以自己做出动画故事：拖拖积木，让小动物走路、说话、表演。
            </p>
            {nextLesson ? (
              <p className="kc-home-next" data-testid="home-next-lesson">
                下一关：第 {nextLesson.sortOrder} 课 · {nextLesson.title}
              </p>
            ) : null}
            <div className="kc-home-buttons">
              {started && nextLesson ? (
                <Link
                  className="kc-home-btn kc-home-btn-main"
                  data-testid="home-continue"
                  href={`/learn/lesson/${nextLesson.id}`}
                >
                  继续学习 ▶
                </Link>
              ) : (
                <Link
                  className="kc-home-btn kc-home-btn-main"
                  data-testid="home-start"
                  href="/onboarding/age"
                >
                  开始学第一节
                </Link>
              )}
              <Link className="kc-home-btn kc-home-btn-soft" href="/learn/map">
                🗺️ 学习地图
              </Link>
            </div>
          </div>
        </div>

        <aside className="kc-home-progress" data-testid="home-progress">
          <div className="kc-home-progress-head">
            <b>我的闯关进度</b>
            <Link href="/cards" className="kc-home-sub">我的卡册 →</Link>
          </div>
          <div className="kc-home-ring-row">
            <div
              className="kc-home-ring"
              style={{ background: `conic-gradient(#ffab19 ${percent * 3.6}deg, #fff1cc 0deg)` }}
              role="img"
              aria-label={`已完成 ${done} / ${total} 课`}
            >
              <div className="kc-home-ring-hole">
                <strong>{done}/{total}</strong>
                <small>已完成</small>
              </div>
            </div>
            <ul className="kc-home-stats">
              <li><span className="kc-home-stat-ico">⭐</span><b>{progress.stars}</b> 颗星星</li>
              <li><span className="kc-home-stat-ico">🃏</span><b>{progress.cardIds.length}</b> 张卡片</li>
              <li><span className="kc-home-stat-ico">🔥</span>连续 <b>{progress.streakDays}</b> 天</li>
            </ul>
          </div>
          <div className="kc-home-progress-pet">
            <CharacterArt id="rabbit" className="kc-home-pet" />
            <span>{done === 0 ? '完成第一关，就能拿到第一颗星星哦！' : done >= total ? '太棒了！启蒙主线全部完成！' : `再闯 ${total - done} 关就毕业啦，加油！`}</span>
          </div>
        </aside>
      </section>

      <section data-testid="growth-path">
        <div className="kc-home-heading">
          <div>
            <h2>我的学习路径</h2>
            <p>从图形化思维到代码创作，每一步都做出能运行的作品</p>
          </div>
          <Link className="kc-home-sub" href="/learn/catalog">完整课程体系 →</Link>
        </div>
        <div className="kc-home-tracks">
          {TRACKS.map((t) => (
            <Link key={t.id} href={t.href} className={`kc-home-track ${t.tone}`} data-testid={`home-track-${t.id}`}>
              <CharacterArt id={t.mascot} className="kc-home-track-art" />
              <span className="kc-home-track-status">{t.status}</span>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
              <span className="kc-home-track-cta">{t.cta} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section data-testid="home-worlds">
        <div className="kc-home-heading">
          <div>
            <h2>四个冒险世界</h2>
            <p>启蒙 12 课分成四个单元，每个单元做出一个小作品</p>
          </div>
        </div>
        <div className="kc-home-worlds">
          {foundationUnits.map((unit, i) => {
            const unitDone = unit.lessonIds.filter((id) => progress.completedLessonIds.includes(id)).length
            return (
              <Link key={unit.id} href="/learn/map" className="kc-home-world" data-testid={`home-world-${unit.id}`}>
                <div className="kc-home-world-art">
                  <MapWorldScene theme={MAP_WORLD_THEMES[i % 4]} label={`${unit.title} 卡通世界`} />
                </div>
                <div className="kc-home-world-text">
                  <b>{unit.title}</b>
                  <span>{'⭐'.repeat(unitDone)}{'☆'.repeat(Math.max(unit.lessonIds.length - unitDone, 0))}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="kc-home-parent" data-testid="parent-confidence">
        <CharacterArt id="bear" className="kc-home-parent-art" />
        <div>
          <h2>家长也能看见孩子的进步</h2>
          <p>学了哪几课、做出了哪些作品、下一步学什么，都记在家长中心里。</p>
        </div>
        <Link className="kc-home-btn kc-home-btn-soft" href="/parent/overview">
          看看家长如何陪学
        </Link>
      </section>

      <section className="kc-home-cta" data-testid="trial-cta">
        <div className="kc-home-cta-cast" aria-hidden="true">
          <CharacterArt id="butterfly" className="kc-home-cta-art" />
          <CharacterArt id="fox" className="kc-home-cta-art" />
        </div>
        <div>
          <h2>每天一小关，做出会动的小故事</h2>
          <p>每 2–3 节就完成一个小作品，卡住时有提示和微补课帮忙。</p>
        </div>
        <Link className="kc-home-btn kc-home-btn-main" href="/learn/map">
          去学习地图闯关
        </Link>
      </section>
    </div>
  )
}
