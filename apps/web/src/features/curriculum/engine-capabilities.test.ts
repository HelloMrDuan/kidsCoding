import { describe, expect, it } from 'vitest'
import g0 from '@/content/curriculum/track-g0-detailed-lessons-v1.json'
import { missingEngineCapabilities } from './engine-capabilities'

const lessons = (g0 as { lessons: Array<{ id: string; requiredEngineCapabilities?: string[]; playable?: boolean }> }).lessons

describe('engine capabilities (SYS-106)', () => {
  it('G0-U1 needs are now all implemented', () => {
    for (const lesson of lessons.filter(l => l.id.startsWith('G0-U1-'))) {
      expect(missingEngineCapabilities(lesson.requiredEngineCapabilities), lesson.id).toEqual([])
    }
  })

  it('does not claim capabilities the engine lacks', () => {
    expect(missingEngineCapabilities(['finite_repeat', 'if_else', 'sound', 'counter', 'message_event', 'state', 'visual_effect'])).toHaveLength(7)
  })

  it('the legacy L1 scripts stay non-playable; playability comes only from the grid trial integration', () => {
    for (const lesson of lessons.filter(l => l.id.startsWith('G0-U1-'))) expect(lesson.playable).toBe(false)
  })
})
