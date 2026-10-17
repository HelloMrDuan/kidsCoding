'use client'

import { LessonCard } from '@/features/ui/lesson-card'

import { MapWorldScene, MAP_WORLD_THEMES } from './map-world-scene'
import { CharacterArt } from './playable-stage/character-art'
import type { LessonCardState } from '@/features/ui/lesson-card'

/**
 * UX-101 adventure map. Sole visual baseline: the V2 prototype map page
 * (docs/design/kidscoding-v2/prototype.html: .map-layout, .map-aside,
 * .module-item, .map-main, .map-head, .map-cover, .map-steps,
 * .map-bottom). NOT the old roadmap idea of four worlds laid out at
 * once as one big continuous island map, and NOT four recolored cards:
 * the aside switches one unit at a time, and every title, summary,
 * and lesson node comes from real curriculum data.
 *
 * This component is pure UI: it renders the units it is given and
 * reports selection through onSelectUnit. State derivation from real
 * progress lives in MapView (map-view.tsx). Lesson nodes are UX-003
 * LessonCards; locked / unreleased are never derived here.
 */

export type AdventureMapLesson = {
  id: string
  title: string
  sortOrder: number
  state: LessonCardState
  href: string
}

export type AdventureMapUnit = {
  id: string
  title: string
  summary: string
  lessons: AdventureMapLesson[]
}

export interface AdventureMapProps {
  units: AdventureMapUnit[]
  selectedUnitId: string
  onSelectUnit: (unitId: string) => void
}

const UNIT_NUMERALS = ['一', '二', '三', '四']
const UNIT_MASCOTS = ['fox', 'rabbit', 'butterfly', 'bear']
const UNIT_CHEERS = ['和小狐狸一起出发吧！', '背上小书包去旅行！', '花园里有好多惊喜！', '大家一起来表演！']

function getUnitRangeLabel(lessons: AdventureMapLesson[]) {
  if (lessons.length === 0) return '暂无课程'
  const orders = lessons.map((lesson) => lesson.sortOrder)
  const min = Math.min(...orders)
  const max = Math.max(...orders)
  return `第 ${String(min).padStart(2, '0')}–${String(max).padStart(2, '0')} 课`
}

function getNextLesson(unit: AdventureMapUnit) {
  // UX-102: prefer a lesson the child can actually play. Locked nodes
  // are never a navigation target when any playable lesson exists in
  // the unit. Only when every lesson in the unit is locked does the
  // button fall back to the first lesson, whose destination is the
  // lesson page's lock screen (which explains why and links to the
  // upgrade) — never the playable workspace.
  return (
    unit.lessons.find((lesson) => lesson.state === 'current') ??
    unit.lessons.find((lesson) => lesson.state === 'available') ??
    unit.lessons.find((lesson) => lesson.state === 'completed') ??
    unit.lessons[0] ??
    null
  )
}

export function AdventureMap({
  units,
  selectedUnitId,
  onSelectUnit,
}: AdventureMapProps) {
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? units[0]

  if (!selectedUnit) {
    return (
      <section className="kc-map-layout" data-testid="adventure-map">
        <p data-testid="adventure-map-empty">暂无课程数据，请稍后再来。</p>
      </section>
    )
  }

  const selectedIndex = units.indexOf(selectedUnit)
  const nextLesson = getNextLesson(selectedUnit)
  const theme = MAP_WORLD_THEMES[selectedIndex % MAP_WORLD_THEMES.length]

  return (
    <section className={`kc-map-layout kc-map-kids kc-map-theme-${theme}`} data-testid="adventure-map">
      <div className="kc-panel kc-map-aside">
        <h3>图形化启蒙 · 四个学习单元</h3>
        {units.map((unit, index) => (
          <button
            key={unit.id}
            type="button"
            className={`kc-module-item${unit.id === selectedUnit.id ? ' kc-module-selected' : ''}`}
            aria-pressed={unit.id === selectedUnit.id}
            data-testid={`adventure-map-unit-${unit.id}`}
            onClick={() => onSelectUnit(unit.id)}
          >
            <span className={`kc-module-index kc-module-index-${index % 4}`}>
              <CharacterArt id={UNIT_MASCOTS[index % 4]} className="kc-module-mascot" />
              <i>{String(index + 1).padStart(2, '0')}</i>
            </span>
            <span>
              <b>{unit.title}</b>
              <small>{getUnitRangeLabel(unit.lessons)}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="kc-panel kc-map-main">
        <div className="kc-map-head">
          <div>
            <div className="kc-eyebrow">
              CHAPTER {String(selectedIndex + 1).padStart(2, '0')}
            </div>
            <h2>
              第{UNIT_NUMERALS[selectedIndex] ?? selectedIndex + 1}单元 ·{' '}
              {selectedUnit.title}
            </h2>
            <p className="kc-subtitle">{selectedUnit.summary}</p>
          </div>
          <span className="kc-chip kc-chip-info">
            {selectedUnit.lessons.length} 个学习任务
          </span>
        </div>

        <div className="kc-map-cover">
          <MapWorldScene theme={theme} label={`${selectedUnit.title} 卡通冒险地图`} />
          <div className="kc-cover-label">
            <b>{selectedUnit.title}</b>
            <p>{UNIT_CHEERS[selectedIndex % UNIT_CHEERS.length]}</p>
          </div>
        </div>

        {selectedUnit.lessons.length === 0 ? (
          <p className="kc-map-steps" data-testid="adventure-map-empty">
            这个单元暂无课程数据，请稍后再来。
          </p>
        ) : (
          <div className="kc-map-steps" data-testid="adventure-map-steps">
            {selectedUnit.lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                state={lesson.state}
                href={lesson.href}
              />
            ))}
          </div>
        )}

        <div className="kc-map-bottom">
          <span className="kc-text-muted" style={{ fontSize: 12 }}>
            沿着小路一关一关闯过去，每完成一关都会点亮一颗星星 ⭐
          </span>
          {nextLesson ? (
            <a
              className="kc-action-surface kc-btn-sm"
              data-testid="adventure-map-next-lesson"
              href={nextLesson.href}
            >
              出发闯关 →
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}
