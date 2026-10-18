import Link from 'next/link'

import {
  curriculumTracks,
  getCatalogStatistics,
  getCatalogTrack,
  type CatalogTrack,
} from '@/features/curriculum/full-catalog-access'
import { getLessonMaturity, summarizeMaturity, maturityLevels } from '@/features/curriculum/lesson-maturity'
import { getLaunchLessonsForCatalogLesson } from '@/content/curriculum/launch-catalog-mapping'

/**
 * UX-501 课程体系 = frozen V2 prototype #page-catalog, split into pages so a
 * child never scrolls through 432 lessons at once:
 *  - list view: title row, direction filter, 6 illustrated route cards per page + pager
 *  - route view (?track=ID): route header, unit tabs (?unit=N), that unit's 6 lessons
 * Status chips read the single L0–L5 maturity source (SYS-102); nothing below L3 looks playable.
 */

const PAGE_SIZE = 6

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

function coverStyle(engine: string) {
  const c = COVERS[engine] ?? COVERS.ai
  return { backgroundImage: c.image ? `${c.tint},url(${c.image})` : c.tint }
}

type Tone = 'green' | 'amber' | 'gray'

function toneFor(level: number): Tone {
  return level >= 3 ? 'green' : level >= 1 ? 'amber' : 'gray'
}

function trackStatus(track: CatalogTrack): { label: string; tone: Tone } {
  const ids = track.units.flatMap((u) => u.lessons.map((l) => l.id))
  const own = summarizeMaturity(ids)
  if (own.trialCount > 0) return { label: `${own.trialCount} 课实验可试玩`, tone: 'green' }
  const bridged = new Set(ids.flatMap((id) => getLaunchLessonsForCatalogLesson(id).map((link) => link.launchLessonId)))
  if (bridged.size > 0) return { label: `启蒙衔接 ${bridged.size} 课可试玩`, tone: 'green' }
  return { label: `L${own.max} ${maturityLevels[own.max].label}`, tone: toneFor(own.max) }
}

function lessonStatus(id: string): { label: string; tone: Tone } {
  const m = getLessonMaturity(id)
  const level = m?.level ?? 0
  return { label: `L${level} ${maturityLevels[level].label}`, tone: toneFor(level) }
}

function toInt(value: string | undefined, fallback: number) {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) ? n : fallback
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; group?: string; page?: string; unit?: string }>
}) {
  const query = await searchParams
  const track = getCatalogTrack(query.track ?? '')
  return track ? <RouteView track={track} unitParam={query.unit} /> : <ListView groupParam={query.group} pageParam={query.page} />
}

function ListView({ groupParam, pageParam }: { groupParam?: string; pageParam?: string }) {
  const group = (GROUPS.some((g) => g.id === groupParam) ? groupParam : 'all') as 'all' | Group
  const stats = getCatalogStatistics()
  const filtered = curriculumTracks.filter((t) => group === 'all' || groupOf(t.engine) === group)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(Math.max(toInt(pageParam, 1), 1), pages)
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const listHref = (g: string, p = 1) => {
    const sp = new URLSearchParams()
    if (g !== 'all') sp.set('group', g)
    if (p > 1) sp.set('page', String(p))
    const s = sp.toString()
    return `/learn/catalog${s ? `?${s}` : ''}`
  }

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
            href={listHref(g.id)}
            className={`kc-v2c-filter${g.id === group ? ' kc-v2c-filter-active' : ''}`}
            aria-current={g.id === group ? 'page' : undefined}
          >
            {g.label}
          </Link>
        ))}
        <Link className="kc-v2h-btn kc-v2h-btn-sm kc-v2c-map-link" href="/learn/map">进入现有 12 节启蒙地图 →</Link>
      </nav>

      <div className="kc-v2c-course-grid" aria-label="课程路径">
        {visible.map((t) => {
          const status = trackStatus(t)
          const cover = COVERS[t.engine] ?? COVERS.ai
          return (
            <div key={t.id} className="kc-v2h-panel kc-v2c-course-card">
              <div className="kc-v2c-cover" style={coverStyle(t.engine)}>
                {cover.emoji ? <span className="kc-v2c-cover-emoji" aria-hidden="true">{cover.emoji}</span> : null}
                <b>{t.title}</b>
              </div>
              <div className="kc-v2c-body" data-title={t.title}>
                <span className={`kc-v2c-chip kc-v2c-chip-${status.tone}`}>{status.label}</span>
                <p>
                  {engineLabels[t.engine] ?? t.engine} · {t.ageRange} 岁 · {t.units.length} 单元
                  <br />
                  {t.units.map((u) => u.title).slice(0, 2).join('、')}……
                </p>
                <Link
                  href={`/learn/catalog?track=${t.id}`}
                  className={`kc-v2h-btn kc-v2h-btn-sm${status.tone === 'green' ? '' : ' kc-v2h-btn-outline'}`}
                  data-testid={`catalog-track-${t.id}`}
                >
                  查看路线 →
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {pages > 1 ? (
        <nav className="kc-v2c-pager" aria-label="分页" data-testid="catalog-pager">
          {page > 1 ? <Link className="kc-v2c-filter" href={listHref(group, page - 1)}>← 上一页</Link> : <span className="kc-v2c-filter kc-v2c-disabled">← 上一页</span>}
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={listHref(group, p)}
              className={`kc-v2c-page${p === page ? ' kc-v2c-page-active' : ''}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Link>
          ))}
          {page < pages ? <Link className="kc-v2c-filter" href={listHref(group, page + 1)}>下一页 →</Link> : <span className="kc-v2c-filter kc-v2c-disabled">下一页 →</span>}
          <span className="kc-v2c-pager-note">共 {filtered.length} 条路线</span>
        </nav>
      ) : null}
    </div>
  )
}

function RouteView({ track, unitParam }: { track: CatalogTrack; unitParam?: string }) {
  const unitIndex = Math.min(Math.max(toInt(unitParam, 1), 1), track.units.length) - 1
  const unit = track.units[unitIndex]
  const status = trackStatus(track)
  const lessonsTotal = track.units.reduce((n, u) => n + u.lessons.length, 0)

  return (
    <div className="kc-v2h kc-v2c">
      <Link className="kc-v2h-sub-action kc-v2c-back" href="/learn/catalog">← 全部路线</Link>

      <section className="kc-v2h-panel kc-v2c-detail" data-testid="catalog-track-detail">
        <div className="kc-v2c-detail-head" style={coverStyle(track.engine)}>
          <div>
            <small>{track.id} · 学习路线</small>
            <h1>{track.title}</h1>
            <p>{engineLabels[track.engine] ?? track.engine} · 建议年龄 {track.ageRange} 岁 · {track.units.length} 单元 · {lessonsTotal} 课</p>
          </div>
          <span className={`kc-v2c-chip kc-v2c-chip-${status.tone}`}>{status.label}</span>
        </div>

        <nav className="kc-v2c-unit-tabs" aria-label="单元">
          {track.units.map((u, i) => (
            <Link
              key={u.id}
              href={`/learn/catalog?track=${track.id}${i ? `&unit=${i + 1}` : ''}`}
              className={`kc-v2c-unit-tab${i === unitIndex ? ' kc-v2c-unit-tab-active' : ''}`}
              aria-current={i === unitIndex ? 'page' : undefined}
              data-testid={`catalog-unit-tab-${u.id}`}
            >
              <span className="kc-v2c-unit-index">{i + 1}</span>
              <span>{u.title}</span>
            </Link>
          ))}
        </nav>

        <section className="kc-v2c-unit" data-testid={`catalog-unit-${unit.id}`}>
          <div className="kc-v2c-unit-head">
            <h2>第 {unitIndex + 1} 单元 · {unit.title}</h2>
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
                  <small>第 {unitIndex * 6 + lessonIndex + 1} 课 · {lesson.phase}</small>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.learningOutcome}</p>
                  <span className={`kc-v2c-chip kc-v2c-chip-${ls.tone}`}>{ls.label}</span>
                </Link>
              )
            })}
          </div>
          <div className="kc-v2c-unit-foot">
            <span className="kc-v2c-capstone">🏆 单元作品：{unit.lessons.at(-1)?.title}</span>
            {unitIndex + 1 < track.units.length ? (
              <Link className="kc-v2h-btn kc-v2h-btn-sm kc-v2h-btn-outline" href={`/learn/catalog?track=${track.id}&unit=${unitIndex + 2}`}>
                下一单元 →
              </Link>
            ) : null}
          </div>
        </section>
        <p className="kc-v2c-hint">课程成熟度 L0 大纲 → L1 详案 → L2 引擎 → L3 实验可试玩 → L4 验收 → L5 正式发布；到 L5 才是正式课程。</p>
      </section>
    </div>
  )
}
