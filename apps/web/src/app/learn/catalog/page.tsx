import Link from 'next/link'

import {
  curriculumTracks,
  getCatalogStatistics,
  getCatalogTrack,
  getLessonContentStage,
  type CatalogTrack,
} from '@/features/curriculum/full-catalog-access'

/**
 * UX-501 课程体系 = frozen V2 prototype #page-catalog: title row with the
 * catalog chip, group filter bar, illustrated route cards, then the chosen
 * route's units and lessons. Status chips are honest content stages: a route
 * card never implies lessons are playable when they are only planned.
 */

const engineLabels: Record<string, string> = {
  blockly: '图形化积木', scratch: 'Scratch', python: 'Python',
  cpp: 'C++', web: '网页编程', ai: 'AI 素养', 'ai-python': 'Python AI',
  hardware: '机器人与硬件', literacy: '数字安全', math: '数学编程', steam: 'STEAM',
}

type Group = 'starter' | 'coding' | 'other'
const GROUPS: { id: 'all' | Group; label: string }[] = [
  { id: 'all', label: '全部方向' },
  { id: 'starter', label: '图形化启蒙' },
  { id: 'coding', label: 'Scratch / Python' },
  { id: 'other', label: '科学拓展' },
]

function groupOf(engine: string): Group {
  if (engine === 'blockly') return 'starter'
  if (engine === 'scratch' || engine === 'python') return 'coding'
  return 'other'
}

/** V2 covers: the frozen track illustrations where one exists, V2 gradients + a big friendly emoji otherwise. */
const COVERS: Record<string, { image?: string; tint: string; emoji?: string }> = {
  blockly: { image: '/v2/track-blockly.webp', tint: 'linear-gradient(90deg,#0e549b99,#144c7c24)' },
  scratch: { image: '/v2/track-scratch.webp', tint: 'linear-gradient(90deg,#27246d88,#2d1f6424)' },
  python: { image: '/v2/track-python.webp', tint: 'linear-gradient(90deg,#14203488,#12284b33)' },
  cpp: { tint: 'linear-gradient(130deg,#173d55,#287d8a)', emoji: '🧮' },
  web: { tint: 'linear-gradient(130deg,#1f4f9a,#4c9be8)', emoji: '🌐' },
  ai: { tint: 'linear-gradient(130deg,#1b5e76,#52afbd)', emoji: '🤖' },
  'ai-python': { tint: 'linear-gradient(130deg,#24507a,#5aa7d6)', emoji: '🧠' },
  hardware: { tint: 'linear-gradient(130deg,#382d76,#827ce1)', emoji: '🦾' },
  literacy: { tint: 'linear-gradient(130deg,#1d6a5a,#4cb89a)', emoji: '🛡️' },
  math: { tint: 'linear-gradient(130deg,#7a4a16,#e3a144)', emoji: '📐' },
  steam: { tint: 'linear-gradient(130deg,#8a2f5b,#e2789f)', emoji: '🎨' },
}

const PYTHON_TRIAL = ['P0-U1-L01', 'P0-U1-L02', 'P0-U1-L03']

function coverStyle(engine: string) {
  const c = COVERS[engine] ?? COVERS.ai
  return { backgroundImage: c.image ? `${c.tint},url(${c.image})` : c.tint }
}

function trackStatus(track: CatalogTrack): { label: string; tone: 'green' | 'amber' | 'gray' } {
  if (track.id === 'G0') return { label: '启蒙 12 课可以玩', tone: 'green' }
  if (track.id === 'P0') return { label: 'Python 实验可体验', tone: 'green' }
  const detailed = track.units.some((u) => u.lessons.some((l) => getLessonContentStage(l.id) === 'detailed'))
  return detailed ? { label: '教案已备 · 制作中', tone: 'amber' } : { label: '规划目录', tone: 'gray' }
}

function lessonStatus(id: string): { label: string; tone: 'green' | 'amber' | 'gray' } {
  if (PYTHON_TRIAL.includes(id)) return { label: 'Python实验 · 可体验', tone: 'green' }
  return getLessonContentStage(id) === 'detailed'
    ? { label: '教案已备 · 待开发', tone: 'amber' }
    : { label: '大纲规划 · 待开发', tone: 'gray' }
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; group?: string }>
}) {
  const query = await searchParams
  const current = getCatalogTrack(query.track ?? '') ?? curriculumTracks[0]
  const group = (GROUPS.some((g) => g.id === query.group) ? query.group : 'all') as 'all' | Group
  const stats = getCatalogStatistics()
  const visible = curriculumTracks.filter((t) => group === 'all' || groupOf(t.engine) === group)
  const hrefFor = (params: { group?: string; track?: string }) => {
    const sp = new URLSearchParams()
    const g = params.group ?? group
    if (g !== 'all') sp.set('group', g)
    if (params.track) sp.set('track', params.track)
    const s = sp.toString()
    return `/learn/catalog${s ? `?${s}` : ''}`
  }
  const currentStatus = trackStatus(current)

  return (
    <div className="kc-v2h kc-v2c">
      <div className="kc-v2h-title-row">
        <div>
          <div className="kc-v2h-eyebrow">LEARNING PATHS</div>
          <h1>课程体系</h1>
          <p className="kc-v2h-subtitle">按年龄和兴趣挑一条编程冒险路线。还在制作的课程不会让你进入空白关卡。</p>
        </div>
        <span className="kc-v2c-chip kc-v2c-chip-gray" data-testid="catalog-stats">
          {stats.tracks} 路线 / {stats.lessons} 课 · 规划总目录
        </span>
      </div>

      <nav className="kc-v2c-filterbar" aria-label="课程方向">
        {GROUPS.map((g) => (
          <Link
            key={g.id}
            href={hrefFor({ group: g.id })}
            className={`kc-v2c-filter${g.id === group ? ' kc-v2c-filter-active' : ''}`}
            aria-current={g.id === group ? 'page' : undefined}
          >
            {g.label}
          </Link>
        ))}
        <Link className="kc-v2h-btn kc-v2h-btn-sm kc-v2c-map-link" href="/learn/map">进入现有 12 节启蒙地图 →</Link>
      </nav>

      <div className="kc-v2c-course-grid" aria-label="课程路径">
        {visible.map((track) => {
          const status = trackStatus(track)
          const cover = COVERS[track.engine] ?? COVERS.ai
          const selected = track.id === current.id
          return (
            <div key={track.id} className={`kc-v2h-panel kc-v2c-course-card${selected ? ' kc-v2c-selected' : ''}`}>
              <div className="kc-v2c-cover" style={coverStyle(track.engine)}>
                {cover.emoji ? <span className="kc-v2c-cover-emoji" aria-hidden="true">{cover.emoji}</span> : null}
                <b>{track.title}</b>
              </div>
              <div className="kc-v2c-body">
                <span className={`kc-v2c-chip kc-v2c-chip-${status.tone}`}>{status.label}</span>
                <p>
                  {engineLabels[track.engine] ?? track.engine} · {track.ageRange} 岁 · {track.units.length} 单元
                  <br />
                  {track.units.map((u) => u.title).slice(0, 2).join('、')}……
                </p>
                <Link
                  href={`${hrefFor({ track: track.id })}#track-detail`}
                  aria-current={selected ? 'page' : undefined}
                  className={`kc-v2h-btn kc-v2h-btn-sm${selected ? '' : ' kc-v2h-btn-outline'}`}
                  data-testid={`catalog-track-${track.id}`}
                >
                  {selected ? '正在查看 ↓' : '查看路线 →'}
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      <section id="track-detail" className="kc-v2h-panel kc-v2c-detail" data-testid="catalog-track-detail">
        <div className="kc-v2c-detail-head" style={coverStyle(current.engine)}>
          <div>
            <small>{current.id} · 学习路线</small>
            <h2>{current.title}</h2>
            <p>建议年龄 {current.ageRange} 岁 · {current.units.length} 单元 · {current.units.reduce((n, u) => n + u.lessons.length, 0)} 课</p>
          </div>
          <span className={`kc-v2c-chip kc-v2c-chip-${currentStatus.tone}`}>{currentStatus.label}</span>
        </div>
        <p className="kc-v2c-hint">课程目录不代表在线开放。「教案已备」的课也要等素材、运行引擎和测试都完成后才会解锁。</p>
        <div className="kc-v2c-units">
          {current.units.map((unit, index) => (
            <section key={unit.id} className="kc-v2c-unit" data-testid={`catalog-unit-${unit.id}`}>
              <div className="kc-v2c-unit-head">
                <h3><span className="kc-v2c-unit-index">{index + 1}</span>第 {index + 1} 单元 · {unit.title}</h3>
                <span className="kc-v2c-chip">{unit.concepts.join(' · ')}</span>
              </div>
              <div className="kc-v2c-lesson-grid">
                {unit.lessons.map((lesson, lessonIndex) => {
                  const ls = lessonStatus(lesson.id)
                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/catalog/${lesson.id}`}
                      className="kc-v2c-lesson"
                      data-testid={`catalog-lesson-${lesson.id}`}
                    >
                      <small>第 {index * 6 + lessonIndex + 1} 课 · {lesson.phase}</small>
                      <h4>{lesson.title}</h4>
                      <p>{lesson.learningOutcome}</p>
                      <span className={`kc-v2c-chip kc-v2c-chip-${ls.tone}`}>{ls.label}</span>
                    </Link>
                  )
                })}
              </div>
              <p className="kc-v2c-capstone">🏆 单元作品：{unit.lessons.at(-1)?.title}</p>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
