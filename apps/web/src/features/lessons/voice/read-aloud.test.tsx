import { afterEach, describe, expect, it, vi } from 'vitest'
import { readAloud, speakableText } from './read-aloud'

describe('read aloud', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads clean Chinese text without emoji or hint-layer labels', () => {
    expect(speakableText('🎉（第 2 层）向右 2 → 捡起钥匙')).toBe('向右 2 ，然后 捡起钥匙')
  })

  it('speaks with a zh-CN utterance and cancels anything still playing', () => {
    const spoken: Array<{ text: string; lang: string }> = []
    const cancel = vi.fn()
    class Utterance { lang = ''; rate = 1; pitch = 1; voice: unknown = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(public text: string) {} }
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
    vi.stubGlobal('speechSynthesis', { cancel, getVoices: () => [], speak: (u: Utterance) => spoken.push({ text: u.text, lang: u.lang }) })
    expect(readAloud('先猜一猜🤔')).toBe(true)
    expect(cancel).toHaveBeenCalled()
    expect(spoken).toEqual([{ text: '先猜一猜', lang: 'zh-CN' }])
  })

  it('reports false when the browser has no speech synthesis', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    expect(readAloud('你好')).toBe(false)
  })
})
