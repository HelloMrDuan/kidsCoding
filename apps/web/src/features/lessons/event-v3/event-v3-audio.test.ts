import { describe, expect, it, vi } from 'vitest'

import { EventDrumKit, type DrumAudioContext } from './event-v3-audio'

/**
 * 只验证节点的创建 / 释放逻辑（mock AudioContext）。声音是否真的出在浏览器里，
 * 由真实 Chrome E2E 读取舞台 data 属性另行证明，不以本 mock 冒充。
 */
function fakeContext(initialState = 'suspended') {
  const nodes: Array<{ kind: 'osc' | 'gain'; connected: boolean; started: boolean; stopped: boolean; onended: (() => void) | null }> = []
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
  const ctx = {
    currentTime: 0,
    state: initialState,
    destination: {},
    resume: vi.fn(async () => { ctx.state = 'running' }),
    close: vi.fn(async () => { ctx.state = 'closed' }),
    createOscillator() {
      const node = { kind: 'osc' as const, connected: false, started: false, stopped: false, onended: null as (() => void) | null }
      nodes.push(node)
      return {
        frequency: param(),
        connect: () => { node.connected = true },
        disconnect: () => { node.connected = false },
        start: () => { node.started = true },
        stop: (when?: number) => {
          if (when === undefined) {
            if (node.stopped && node.onended === null) throw new Error('InvalidStateError')
            node.stopped = true
          }
        },
        get onended() { return node.onended },
        set onended(fn) { node.onended = fn },
      }
    },
    createGain() {
      const node = { kind: 'gain' as const, connected: false, started: false, stopped: false, onended: null }
      nodes.push(node)
      return { gain: param(), connect: () => { node.connected = true }, disconnect: () => { node.connected = false } }
    },
  }
  return { ctx: ctx as unknown as DrumAudioContext & { state: string }, nodes, raw: ctx }
}

describe('EventDrumKit (G0-U3-L06 Web Audio drum)', () => {
  it('creates the AudioContext only on unlock (the user gesture) and resumes a suspended one', () => {
    const { ctx, raw } = fakeContext()
    const factory = vi.fn(() => ctx)
    const kit = new EventDrumKit(factory)
    kit.hit()
    expect(factory).not.toHaveBeenCalled()
    expect(kit.liveNodes).toBe(0)
    kit.unlock()
    kit.unlock()
    expect(factory).toHaveBeenCalledTimes(1)
    expect(raw.resume).toHaveBeenCalled()
  })

  it('each hit is one oscillator + gain wired to the speakers, released when it ends', () => {
    const { ctx, nodes } = fakeContext('running')
    const kit = new EventDrumKit(() => ctx)
    kit.unlock()
    kit.hit()
    kit.hit()
    expect(kit.hits).toBe(2)
    expect(kit.liveNodes).toBe(2)
    expect(nodes.filter((n) => n.kind === 'osc').every((n) => n.started && n.connected)).toBe(true)
    nodes[0].onended?.()
    expect(kit.liveNodes).toBe(1)
    expect(nodes[0].connected).toBe(false)
    expect(nodes[1].connected).toBe(false)
  })

  it('stopAll stops and disconnects every node; beginRun also clears the count, so a rerun never stacks old sound', () => {
    const { ctx, nodes } = fakeContext('running')
    const kit = new EventDrumKit(() => ctx)
    kit.unlock()
    kit.hit(); kit.hit(); kit.hit()
    kit.stopAll()
    expect(kit.liveNodes).toBe(0)
    expect(nodes.every((n) => !n.connected)).toBe(true)
    expect(nodes.filter((n) => n.kind === 'osc').every((n) => n.stopped)).toBe(true)
    expect(kit.hits).toBe(3)
    kit.hit()
    kit.beginRun()
    expect(kit.liveNodes).toBe(0)
    expect(kit.hits).toBe(0)
    // Stopping twice is harmless.
    expect(() => kit.stopAll()).not.toThrow()
  })

  it('dispose releases everything and closes the context; a browser without Web Audio degrades silently', () => {
    const { ctx, raw } = fakeContext('running')
    const kit = new EventDrumKit(() => ctx)
    kit.unlock()
    kit.hit()
    kit.dispose()
    expect(kit.liveNodes).toBe(0)
    expect(raw.close).toHaveBeenCalled()

    const none = new EventDrumKit(() => null)
    none.unlock()
    expect(none.supported).toBe(false)
    none.hit()
    expect(none.hits).toBe(1)
    expect(none.liveNodes).toBe(0)
  })

  it('falls back to webkitAudioContext (older Safari / iOS) when AudioContext is missing', async () => {
    const { browserDrumContext } = await import('./event-v3-audio')
    const { ctx } = fakeContext()
    const w = window as unknown as Record<string, unknown>
    const saved = { a: w.AudioContext, b: w.webkitAudioContext }
    w.AudioContext = undefined
    w.webkitAudioContext = function WebkitCtx() { return ctx }
    try {
      expect(browserDrumContext()).toBe(ctx)
      w.webkitAudioContext = undefined
      expect(browserDrumContext()).toBeNull()
    } finally {
      w.AudioContext = saved.a
      w.webkitAudioContext = saved.b
    }
  })
})
