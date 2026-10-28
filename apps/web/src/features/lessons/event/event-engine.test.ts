import { describe, expect, it } from 'vitest'
import { checkEventGoal, runEventProgram, stageStateAfter, type EventLevel } from './event-engine'

const level: EventLevel = {
  actors: [
    { id: 'fox', name: '小狐狸', can: ['wake_up', 'say_hello', 'send_bell'], x: 30, y: 60, asleep: true },
    { id: 'rabbit', name: '小兔子', can: ['show_surprise', 'say_hello'], x: 70, y: 60 },
    { id: 'apple', name: '苹果', can: ['fall_down'], x: 50, y: 20 },
  ],
}
const B = (...types: string[]) => types.map(type => ({ type }))

describe('G0-U2 event engine', () => {
  it('nothing runs before an interaction; the start flag runs when_start scripts in stage order', () => {
    const scripts = { fox: B('when_start', 'wake_up', 'say_hello'), rabbit: B('when_start', 'say_hello') }
    expect(runEventProgram(level, scripts, []).effects).toEqual([])
    const run = runEventProgram(level, scripts, [{ kind: 'start' }])
    expect(run.effects.map(e => `${e.actor}:${e.action}`)).toEqual(['fox:wake_up', 'fox:say_hello', 'rabbit:say_hello'])
    expect(stageStateAfter(level, run.effects).fox).toMatchObject({ awake: true, said: true })
    expect(stageStateAfter(level, []).fox.awake).toBe(false)
  })

  it('a click runs only the clicked character\'s when_clicked script', () => {
    const scripts = { apple: B('when_clicked', 'fall_down'), fox: B('when_clicked', 'wake_up') }
    const run = runEventProgram(level, scripts, [{ kind: 'click', actor: 'apple' }, { kind: 'click', actor: 'rabbit' }])
    expect(run.effects.map(e => `${e.interaction}:${e.actor}:${e.action}`)).toEqual(['0:apple:fall_down'])
  })

  it('the bell runs every when_bell script after the sender finishes, and a bell that rings itself is stopped', () => {
    const scripts = { fox: B('when_start', 'send_bell', 'say_hello'), rabbit: B('when_bell', 'show_surprise') }
    const run = runEventProgram(level, scripts, [{ kind: 'start' }])
    expect(run.effects.map(e => `${e.actor}:${e.action}`)).toEqual(['fox:send_bell', 'fox:say_hello', 'rabbit:show_surprise'])
    const looping = runEventProgram(level, { fox: B('when_bell', 'send_bell'), rabbit: B('when_start', 'say_hello') }, [{ kind: 'start' }])
    expect(looping.loop).toBe(false) // rabbit cannot ring
    const self = runEventProgram(level, { fox: B('when_start', 'send_bell') , rabbit: B('when_bell', 'say_hello') }, [{ kind: 'start' }])
    expect(self.loop).toBe(false)
    const realLoop = runEventProgram({ actors: [level.actors[0]] }, { fox: B('when_bell', 'send_bell') }, [])
    expect(realLoop.effects).toEqual([])
    const ring = runEventProgram({ actors: [level.actors[0], { ...level.actors[0], id: 'bird', name: '小鸟' }] }, { fox: B('when_start', 'send_bell'), bird: B('when_bell', 'send_bell') }, [{ kind: 'start' }])
    expect(ring.loop).toBe(true)
  })

  it('reports scripts that can never run: no hat, a hat below an action, a loose block, an action the character cannot do', () => {
    const run = runEventProgram(level, {
      fox: B('say_hello', 'when_start'),
      rabbit: [{ type: 'when_start' }, { type: 'say_hello', disconnected: true }],
      apple: B('when_clicked', 'say_hello'),
    }, [{ kind: 'start' }])
    expect(run.effects).toEqual([])
    expect(run.issues.fox?.issue).toBe('hat_not_on_top')
    expect(run.issues.rabbit?.issue).toBe('disconnected')
    expect(run.issues.apple?.issue).toBe('cannot_do')
    expect(runEventProgram(level, { fox: B('wake_up') }, []).issues.fox?.issue).toBe('no_hat')
  })

  describe('checkEventGoal', () => {
    const goal = [{ interaction: { kind: 'start' as const }, effects: [['fox', 'wake_up'], ['fox', 'say_hello']] as Array<['fox', 'wake_up' | 'say_hello']> }]
    it('passes the right program and names each kind of mistake', () => {
      expect(checkEventGoal(level, { fox: B('when_start', 'wake_up', 'say_hello') }, goal).passed).toBe(true)
      expect(checkEventGoal(level, { fox: B('say_hello', 'when_start') }, goal).failure).toBe('hat_not_on_top')
      expect(checkEventGoal(level, { fox: B('when_start', 'say_hello', 'wake_up') }, goal).failure).toBe('wrong_order')
      expect(checkEventGoal(level, { fox: B('when_clicked', 'wake_up', 'say_hello') }, goal).failure).toBe('nothing_happened')
      expect(checkEventGoal(level, { fox: B('when_start', 'wake_up') }, goal).failure).toBe('missing_effect')
      expect(checkEventGoal(level, { fox: B('when_start', 'wake_up', 'say_hello'), rabbit: B('when_start', 'say_hello') }, goal).failure).toBe('extra_effect')
    })
    it('detects an effect that happens too early, a wrong trigger, and the wrong character', () => {
      const appleGoal = [
        { interaction: { kind: 'start' as const }, effects: [] },
        { interaction: { kind: 'click' as const, actor: 'apple' as const }, effects: [['apple', 'fall_down']] as Array<['apple', 'fall_down']> },
      ]
      expect(checkEventGoal(level, { apple: B('when_clicked', 'fall_down') }, appleGoal, [{ kind: 'click', actor: 'fox' }]).passed).toBe(true)
      expect(checkEventGoal(level, { apple: B('when_start', 'fall_down') }, appleGoal).failure).toBe('too_early')
      expect(checkEventGoal(level, { apple: B('when_clicked', 'fall_down'), fox: B('when_clicked', 'say_hello') }, appleGoal, [{ kind: 'click', actor: 'fox' }]).failure).toBe('wrong_trigger')
      const helloGoal = [{ interaction: { kind: 'start' as const }, effects: [['rabbit', 'say_hello']] as Array<['rabbit', 'say_hello']> }]
      expect(checkEventGoal(level, { fox: B('when_start', 'say_hello') }, helloGoal).failure).toBe('wrong_actor')
    })
  })

  describe('message_event (the forest bell)', () => {
    const three: EventLevel = { actors: [
      { id: 'squirrel', name: '松鼠', can: ['send_bell', 'say_hello'], x: 20, y: 60 },
      { id: 'rabbit', name: '小兔子', can: ['show_surprise'], x: 50, y: 60 },
      { id: 'bird', name: '小鸟', can: ['enter_stage'], x: 80, y: 30, offstage: true },
    ] }
    it('a when_bell script never runs until someone rings the bell', () => {
      const scripts = { rabbit: B('when_bell', 'show_surprise') }
      expect(runEventProgram(three, scripts, [{ kind: 'start' }, { kind: 'click', actor: 'rabbit' }]).effects).toEqual([])
    })
    it('one bell reaches every listener, in stage order, after the sender finishes', () => {
      const scripts = { squirrel: B('when_clicked', 'send_bell', 'say_hello'), rabbit: B('when_bell', 'show_surprise'), bird: B('when_bell', 'enter_stage') }
      const run = runEventProgram(three, scripts, [{ kind: 'click', actor: 'squirrel' }])
      expect(run.effects.map(e => `${e.actor}:${e.action}`)).toEqual(['squirrel:send_bell', 'squirrel:say_hello', 'rabbit:show_surprise', 'bird:enter_stage'])
      expect(stageStateAfter(three, run.effects).bird.onstage).toBe(true)
      expect(stageStateAfter(three, []).bird.onstage).toBe(false)
    })
    it('a goal on the receiver fails when sender and receiver are swapped', () => {
      const goal = [{ interaction: { kind: 'click' as const, actor: 'squirrel' as const }, effects: [['squirrel', 'send_bell'], ['rabbit', 'show_surprise']] as Array<['squirrel' | 'rabbit', 'send_bell' | 'show_surprise']> }]
      expect(checkEventGoal(three, { squirrel: B('when_clicked', 'send_bell'), rabbit: B('when_bell', 'show_surprise') }, goal).passed).toBe(true)
      expect(checkEventGoal(three, { squirrel: B('when_bell', 'send_bell'), rabbit: B('when_clicked', 'show_surprise') }, goal).passed).toBe(false)
    })
  })
})
