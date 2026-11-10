import { describe, expect, it } from 'vitest'
import { compileProject, FRUIT_NAME, STUDENT_NAME } from './compile'
import { L05_PARAMS } from './params'
import { countBlocks, programFingerprint, runnableScripts, validateProgram, type Block, type Program } from './program'

const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })
const set = (value: number): Block => ({ t: 'setTime', value })
const wait = (secs = 1): Block => ({ t: 'wait', secs })
const dec = (by = 1): Block => ({ t: 'decrease', by })
const until = (...body: Block[]): Block => ({ t: 'untilZero', body: body as never })
const rep = (times: number, ...body: Block[]): Block => ({ t: 'repeat', times, body: body as never })
const STANDARD = flag(set(10), until(wait(), dec()), { t: 'broadcast' })

describe('程序校验', () => {
  it('合法程序通过；空程序、散积木合法', () => {
    expect(validateProgram(STANDARD)).toEqual([])
    expect(validateProgram({ scripts: [] })).toEqual([])
    expect(validateProgram({ scripts: [{ hat: null, body: [set(10)] }] })).toEqual([])
  })

  it('格式不对、未知类型、null 积木都被拒绝（不抛异常）', () => {
    expect(validateProgram(null)).not.toEqual([])
    expect(validateProgram({})).not.toEqual([])
    expect(validateProgram({ scripts: [{ hat: 'x', body: [] }] })).not.toEqual([])
    expect(validateProgram({ scripts: [{ hat: 'flag', body: 'no' }] })).not.toEqual([])
    expect(validateProgram({ scripts: [{ hat: 'flag', body: [null] }] })).not.toEqual([])
    expect(validateProgram(flag({ t: 'move' } as never))).not.toEqual([])
  })

  it('起点秒数：1 与 20 合法；0、21、1.5、NaN 非法（两端各自检查）', () => {
    for (const n of [L05_PARAMS.minStart, L05_PARAMS.maxStart]) expect(validateProgram(flag(set(n))), String(n)).toEqual([])
    for (const n of [0, 21, 1.5, Number.NaN, -3]) expect(validateProgram(flag(set(n))), String(n)).not.toEqual([])
  })

  it('等待秒数 1～2、减少量 1～5、重复次数 1～20：边界各自检查', () => {
    for (const n of [1, 2]) expect(validateProgram(flag(until(wait(n)))), `wait ${n}`).toEqual([])
    for (const n of [0, 3, 1.5]) expect(validateProgram(flag(until(wait(n)))), `wait ${n}`).not.toEqual([])
    for (const n of [1, 5]) expect(validateProgram(flag(until(dec(n)))), `dec ${n}`).toEqual([])
    for (const n of [0, 6, 1.5]) expect(validateProgram(flag(until(dec(n)))), `dec ${n}`).not.toEqual([])
    for (const n of [1, 20]) expect(validateProgram(flag(rep(n, wait()))), `rep ${n}`).toEqual([])
    for (const n of [0, 21, 1.5]) expect(validateProgram(flag(rep(n, wait()))), `rep ${n}`).not.toEqual([])
  })

  it('重复里不能再放重复，也不能放“设为”或“广播”；每一种非法都写明原因', () => {
    const nested = validateProgram(flag({ t: 'untilZero', body: [{ t: 'repeat', times: 2, body: [] }] as never }))
    expect(nested[0]).toContain('只能放在最外层')
    expect(validateProgram(flag({ t: 'untilZero', body: [set(5)] as never }))[0]).toContain('只能放在最外层')
    expect(validateProgram(flag({ t: 'untilZero', body: [{ t: 'broadcast' }] as never }))[0]).toContain('只能放在最外层')
    expect(validateProgram(flag(set(0)))[0]).toContain('起始秒数')
  })

  it('积木总数：8 块合法，9 块非法（嵌套的积木也算，分散在多个脚本里也一起计数）', () => {
    expect(countBlocks([until(wait(), dec()), set(5)])).toBe(4)
    const many = (n: number): Block[] => Array.from({ length: n }, () => set(5))
    expect(validateProgram(flag(...many(8)))).toEqual([])
    expect(validateProgram(flag(...many(9)))).not.toEqual([])
    expect(validateProgram({ scripts: [{ hat: 'flag', body: many(5) }, { hat: 'flag', body: many(4) }] })).not.toEqual([])
  })

  it('脚本条数：3 条合法，4 条非法', () => {
    const s = { hat: 'flag' as const, body: [set(5)] }
    expect(validateProgram({ scripts: [s, s, s] })).toEqual([])
    expect(validateProgram({ scripts: [s, s, s, s] })).not.toEqual([])
  })

  it('runnableScripts 只留绿旗脚本；指纹随任何编辑改变（含散积木）', () => {
    const p: Program = { scripts: [{ hat: 'flag', body: [set(5)] }, { hat: null, body: [set(6)] }] }
    expect(runnableScripts(p)).toHaveLength(1)
    expect(programFingerprint(p)).not.toBe(programFingerprint({ scripts: [p.scripts[0]] }))
  })
})

describe('编译', () => {
  it('三个角色：学生只放学生的积木，水果放课程自带的得分脚本；舞台有两个变量和“游戏结束”广播', () => {
    const proj = compileProject(STANDARD) as { targets: Array<{ name: string; isStage: boolean; blocks: Record<string, { opcode: string }>; variables: Record<string, unknown[]>; broadcasts?: Record<string, string> }> }
    const names = proj.targets.map(t => t.name)
    expect(names).toEqual(['Stage', STUDENT_NAME, FRUIT_NAME])
    const stage = proj.targets[0]
    expect(Object.values(stage.variables).map(v => v[0]).sort()).toEqual(['score', 'timeLeft'])
    expect(Object.values(stage.broadcasts ?? {})).toEqual([L05_PARAMS.broadcastName])
    const ops = (t: number) => Object.values(proj.targets[t].blocks).map(b => b.opcode)
    expect(ops(1)).toEqual(expect.arrayContaining(['event_whenflagclicked', 'data_setvariableto', 'control_repeat_until', 'control_wait', 'data_changevariableby', 'event_broadcast', 'operator_lt']))
    expect(ops(2)).toContain('control_forever')
    expect(ops(2)).not.toContain('operator_lt') // 课程自带脚本里没有学生那个“<”，运行器靠它区分学生的判断
  })

  it('空程序与散积木：学生角色上没有任何积木', () => {
    for (const p of [{ scripts: [] } as Program, { scripts: [{ hat: null, body: [set(5)] }] } as Program]) {
      const proj = compileProject(p) as { targets: Array<{ blocks: Record<string, unknown> }> }
      expect(Object.keys(proj.targets[1].blocks)).toHaveLength(0)
    }
  })
})
