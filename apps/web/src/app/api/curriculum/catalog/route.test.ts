import { describe, expect, it } from 'vitest'
import { GET } from './route'

describe('GET /api/curriculum/catalog', () => {
  const request = (query = '') => new Request(`http://localhost/api/curriculum/catalog${query}`)

  it('returns safe full-catalog metadata', async () => {
    const response = GET(request())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.stats).toMatchObject({ tracks: 18, units: 72, lessons: 432, detailedNewLessons: 168 })
    expect(body.tracks).toHaveLength(18)
    expect(JSON.stringify(body)).not.toContain('teacherPrompt')
  })

  it('filters a learning path and never returns a playable status for unpublished outlines', async () => {
    const response = GET(request('?trackId=G0'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.units).toHaveLength(4)
    expect(body.units.flatMap((unit: { lessons: Array<{ playable: boolean }> }) => unit.lessons)).toHaveLength(24)
    expect(body.units[0].lessons[0]).toMatchObject({ id: 'G0-U1-L01', contentStage: 'detailed', playable: false })
    expect(JSON.stringify(body)).not.toContain('negativeCases')
  })

  it('returns public lesson metadata without answer keys or teacher scripts', async () => {
    const response = GET(request('?lessonId=G0-U1-L01'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ id: 'G0-U1-L01', playable: false, contentStage: 'detailed' })
    expect(body).not.toHaveProperty('teachingSteps')
    expect(body).not.toHaveProperty('assessment')
    expect(body).not.toHaveProperty('hints')
  })

  it('rejects unknown tracks and lessons', () => {
    expect(GET(request('?trackId=unknown')).status).toBe(404)
    expect(GET(request('?lessonId=unknown')).status).toBe(404)
  })
})
