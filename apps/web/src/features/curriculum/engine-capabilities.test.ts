import { describe, expect, it } from 'vitest'
import g0 from '@/content/curriculum/track-g0-detailed-lessons-v1.json'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { blocklyEngineCapabilities, missingEngineCapabilities } from './engine-capabilities'

const lessons = (g0 as { lessons: Array<{ id: string; requiredEngineCapabilities?: string[]; playable?: boolean }> }).lessons

describe('engine capabilities (SYS-106)', () => {
  it('G0-U1 needs are now all implemented', () => {
    for (const lesson of lessons.filter(l => l.id.startsWith('G0-U1-'))) {
      expect(missingEngineCapabilities(lesson.requiredEngineCapabilities), lesson.id).toEqual([])
    }
  })

  it('G0-U2 needs are implemented by the event-stage engine (Hark A)', () => {
    for (const lesson of lessons.filter(l => l.id.startsWith('G0-U2-'))) {
      expect(missingEngineCapabilities(lesson.requiredEngineCapabilities), lesson.id).toEqual([])
    }
  })

  it('G0-U3-L01..L03 needs are implemented: the SYS-107 repeat, grid footprints, hops and watering (Hark A)', () => {
    const l01 = lessons.find(l => l.id === 'G0-U3-L01')!
    expect(missingEngineCapabilities(l01.requiredEngineCapabilities)).toEqual([])
    expect(missingEngineCapabilities(lessons.find(l => l.id === 'G0-U3-L02')!.requiredEngineCapabilities)).toEqual([])
    expect(missingEngineCapabilities(lessons.find(l => l.id === 'G0-U3-L03')!.requiredEngineCapabilities)).toEqual([])
    expect(blocklyEngineCapabilities.finite_repeat).toContain('program-tree.ts')
    expect(existsSync(path.resolve(__dirname, '../lessons/blockly/program-tree.ts'))).toBe(true)
  })

  it('message_event points at a real engine file', () => {
    expect(blocklyEngineCapabilities.message_event).toContain('event/event-engine.ts')
    expect(existsSync(path.resolve(__dirname, '../lessons/event/event-engine.ts'))).toBe(true)
  })

  it('does not claim capabilities the engine lacks', () => {
    expect(missingEngineCapabilities(['if_else', 'sound', 'counter', 'state', 'visual_effect'])).toHaveLength(5)
  })

  it('the legacy L1 scripts stay non-playable; playability comes only from the grid trial integration', () => {
    for (const lesson of lessons.filter(l => l.id.startsWith('G0-U1-'))) expect(lesson.playable).toBe(false)
  })
})
