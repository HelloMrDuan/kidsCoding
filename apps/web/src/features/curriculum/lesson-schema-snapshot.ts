// SYS-105: build a CurriculumSnapshot from the real repository (node only; used by tests/CI).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import assetLicenses from '@/content/curriculum/asset-licenses-v1.json'
import { a0u1L01SnapshotSteps } from '@/content/curriculum/a0-u1-ai-lessons'
import { g0u1GridLessons } from '@/content/curriculum/g0-u1-grid-lessons'
import { g0u2EventLessons } from '@/content/curriculum/g0-u2-event-lessons'
import { g0u3EventLessons } from '@/content/curriculum/g0-u3-event-loop-lessons'
import { g0u3LoopLessons } from '@/content/curriculum/g0-u3-loop-lessons'
import { g2ScratchLessons } from '@/content/curriculum/g2-u1-scratch-lessons'
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { blocklyEngineCapabilities } from './engine-capabilities'
import { EXAMPLE_DEBT_BASELINE, type CurriculumSnapshot } from './lesson-schema'
import { getLessonMaturity, trialIntegrations } from './lesson-maturity'

const WEB = join(__dirname, '..', '..', '..')

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

export function readCurriculumSnapshot(): CurriculumSnapshot {
  const curriculum = join(WEB, 'src/content/curriculum')
  const catalog = JSON.parse(readFileSync(join(curriculum, 'full-catalog-v1.json'), 'utf8')) as { tracks: Array<{ units: Array<{ lessons: Array<{ id: string }> }> }> }
  const detailedFiles = readdirSync(curriculum).filter(f => /^track-.*-detailed-lessons-v\d+\.json$/.test(f))
  const detailedLessons = detailedFiles.flatMap(f => {
    const track = JSON.parse(readFileSync(join(curriculum, f), 'utf8')) as { trackId: string; lessons: Array<{ id: string; engine: string; playable?: boolean; requiredEngineCapabilities?: string[] }> }
    return track.lessons.map(l => ({ id: l.id, trackId: track.trackId, engine: l.engine, playable: !!l.playable, requiredEngineCapabilities: l.requiredEngineCapabilities ?? [] }))
  })
  const assetFiles = readdirSync(curriculum).filter(f => /asset-requirements-v\d+\.json$/.test(f))
  const lessonAssets = assetFiles.flatMap(f => (JSON.parse(readFileSync(join(curriculum, f), 'utf8')).assets ?? []) as CurriculumSnapshot['lessonAssets'])
  const appDir = join(WEB, 'src/app')
  const routes = walk(appDir).filter(f => /page\.tsx$/.test(f)).map(f => relative(appDir, f).split('/').slice(0, 2).join('/'))
  const e2eSpecs = walk(join(WEB, 'tests/e2e')).map(f => relative(WEB, f))
  const publicDir = join(WEB, 'public')
  const publicAssets = walk(publicDir).map(f => relative(publicDir, f)).filter(f => !f.endsWith('-sandbox.html'))
  const trialIds = Object.keys(trialIntegrations)
  const allIds = [...catalog.tracks.flatMap(t => t.units.flatMap(u => u.lessons.map(l => l.id))), ...launchLessons.map(l => l.id)]

  return {
    catalogLessonIds: catalog.tracks.flatMap(t => t.units.flatMap(u => u.lessons.map(l => l.id))),
    detailedLessons,
    launchLessonIds: launchLessons.map(l => l.id),
    trials: trialIds.map(id => ({ id, ...trialIntegrations[id] })),
    engineCapabilities: Object.keys(blocklyEngineCapabilities),
    routes: [...new Set(routes)],
    e2eSpecs,
    publicAssets,
    assetLicenses: assetLicenses.assets,
    lessonAssets,
    publishedLessonIds: allIds.filter(id => getLessonMaturity(id)?.published),
    steps: [...Object.values(g0u1GridLessons), ...Object.values(g0u3LoopLessons)].flatMap(lesson => lesson.steps.map(step => ({
      lessonId: lesson.id, stepId: step.id, positiveExamples: step.solutions.length, negativeExamples: step.counterExamples.length,
    }))).concat([...Object.values(g0u2EventLessons), ...Object.values(g0u3EventLessons)].flatMap(lesson => lesson.steps.map(step => ({
      lessonId: lesson.id, stepId: step.id, positiveExamples: step.solutions.length, negativeExamples: step.counterExamples.length,
    })))).concat(Object.values(g2ScratchLessons).flatMap(lesson => lesson.steps.map(step => ({
      lessonId: lesson.id, stepId: step.id, positiveExamples: step.solutions.length, negativeExamples: step.counterExamples.length,
    })))).concat(a0u1L01SnapshotSteps.map(step => ({
      lessonId: 'A0-U1-L01', stepId: step.id, positiveExamples: step.positiveExamples.length, negativeExamples: step.negativeExamples.length,
    }))),
    exampleDebt: [...EXAMPLE_DEBT_BASELINE],
  }
}
