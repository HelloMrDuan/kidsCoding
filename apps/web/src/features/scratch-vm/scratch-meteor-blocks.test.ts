import {describe,expect,it} from 'vitest'
import {isValidMeteorInterval,readMeteorProgram} from './scratch-meteor-blocks'

type FakeBlock = {
  type: string
  fields: Record<string,string>
  next: FakeBlock | null
  getNextBlock: () => FakeBlock | null
  getFieldValue: (name: string) => string
}

function fakeBlock(type: string, fields: Record<string,string> = {}, next: FakeBlock | null = null): FakeBlock {
  return {
    type,
    fields,
    next,
    getNextBlock: () => next,
    getFieldValue: (name: string) => fields[name] ?? '',
  }
}

function fakeWorkspace(top: FakeBlock | null) {
  const workspace = {getTopBlocks: () => (top ? [top] : [])}
  return workspace as unknown as Parameters<typeof readMeteorProgram>[0]
}

function validStack(interval = '0.3') {
  const intervalBlock = fakeBlock('kc_meteor_interval', {INTERVAL: interval})
  const fall = fakeBlock('kc_meteor_fall', {STEP: '13'}, intervalBlock)
  const count = fakeBlock('kc_meteor_count', {COUNT: '10'}, fall)
  return fakeBlock('kc_meteor_start', {}, count)
}

describe('TQ-006 restricted meteor block stack', () => {
  it('accepts the four-block stack and reads the spawn interval', () => {
    expect(readMeteorProgram(fakeWorkspace(validStack()))).toEqual({spawnCount: 10, fallStep: 13, interval: 0.3})
    expect(readMeteorProgram(fakeWorkspace(validStack('1')))).toEqual({spawnCount: 10, fallStep: 13, interval: 1})
    expect(readMeteorProgram(fakeWorkspace(validStack('0.1')))).toEqual({spawnCount: 10, fallStep: 13, interval: 0.1})
  })

  it('rejects the old three-block stack without an interval block', () => {
    const fall = fakeBlock('kc_meteor_fall', {STEP: '13'})
    const count = fakeBlock('kc_meteor_count', {COUNT: '10'}, fall)
    expect(readMeteorProgram(fakeWorkspace(fakeBlock('kc_meteor_start', {}, count)))).toBeNull()
  })

  it('rejects intervals outside 0.1–1.0s or off the 0.1s step', () => {
    expect(readMeteorProgram(fakeWorkspace(validStack('0.35')))).toBeNull()
    expect(readMeteorProgram(fakeWorkspace(validStack('0')))).toBeNull()
    expect(readMeteorProgram(fakeWorkspace(validStack('1.1')))).toBeNull()
    expect(readMeteorProgram(fakeWorkspace(validStack('abc')))).toBeNull()
  })

  it('rejects a wrong order and a trailing block after the interval', () => {
    const intervalBlock = fakeBlock('kc_meteor_interval', {INTERVAL: '0.3'})
    const count = fakeBlock('kc_meteor_count', {COUNT: '10'}, intervalBlock)
    const fall = fakeBlock('kc_meteor_fall', {STEP: '13'}, count)
    expect(readMeteorProgram(fakeWorkspace(fakeBlock('kc_meteor_start', {}, fall)))).toBeNull()
    const trailing = fakeBlock('kc_meteor_count', {COUNT: '5'})
    const intervalWithTrailing = fakeBlock('kc_meteor_interval', {INTERVAL: '0.3'}, trailing)
    const fall2 = fakeBlock('kc_meteor_fall', {STEP: '13'}, intervalWithTrailing)
    const count2 = fakeBlock('kc_meteor_count', {COUNT: '10'}, fall2)
    expect(readMeteorProgram(fakeWorkspace(fakeBlock('kc_meteor_start', {}, count2)))).toBeNull()
  })

  it('validates interval steps without floating point surprises', () => {
    expect(isValidMeteorInterval(0.3)).toBe(true)
    expect(isValidMeteorInterval(0.35)).toBe(false)
    expect(isValidMeteorInterval(1.0)).toBe(true)
    expect(isValidMeteorInterval(1.05)).toBe(false)
  })
})
