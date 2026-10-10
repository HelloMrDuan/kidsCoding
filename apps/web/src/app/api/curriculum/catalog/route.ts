import { NextResponse } from 'next/server'

import {
  getCatalogLesson,
  getCatalogStatistics,
  getCatalogTrack,
  getLessonContentStage,
  getPublicCatalogTracks,
  getPublicCatalogUnit,
} from '@/features/curriculum/full-catalog-access'

// Public metadata only. Unpublished teacher scripts and draft answers stay in admin views.
export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lessonId = searchParams.get('lessonId')
  if (lessonId) {
    const found = getCatalogLesson(lessonId)
    if (!found) return NextResponse.json({ error: 'lesson-not-found' }, { status: 404 })
    return NextResponse.json({
      id: found.lesson.id,
      title: found.lesson.title,
      trackId: found.track.id,
      unitId: found.unit.id,
      concepts: found.lesson.concepts,
      learningOutcome: found.lesson.learningOutcome,
      contentStage: getLessonContentStage(found.lesson.id),
      playable: false,
      trialAvailable: found.lesson.id === 'P0-U1-L01',
    })
  }

  const trackId = searchParams.get('trackId')
  if (trackId) {
    const track = getCatalogTrack(trackId)
    if (!track) return NextResponse.json({ error: 'track-not-found' }, { status: 404 })
    return NextResponse.json({
      track: { id: track.id, title: track.title, ageRange: track.ageRange, engine: track.engine },
      units: track.units.map(getPublicCatalogUnit),
      notice: '内容目录不是已发布的在线课程；未完成引擎验收的关卡不可游玩。',
    })
  }

  return NextResponse.json({
    stats: getCatalogStatistics(),
    tracks: getPublicCatalogTracks(),
    notice: '课程目录与可玩课程分别管理。只有通过引擎测试并正式发布的关卡才可学习。',
  })
}
