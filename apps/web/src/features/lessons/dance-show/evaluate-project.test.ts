/**
 * OPS-038 评价引擎单元测试。
 * 夹具是按负责人提供的 Scratch.sb3 已核实结构手工构造的 project.json
 * （Stage 3 背景+pop，Abby 4 造型+Dance Space，两条绿旗脚本），
 * 不含任何儿童作品文件或音频素材。
 */
import { describe, expect, it } from 'vitest'
import {
  evaluateProject,
  getCurrentBackdropName,
  getWaitDurations,
  parseSb3,
  projectHash,
  type ScratchBlock,
  type ScratchProject,
} from './evaluate-project'

function block(
  opcode: string,
  extra: Partial<ScratchBlock> = {},
): ScratchBlock {
  return { opcode, ...extra }
}

/** 与真实 Scratch.sb3 结构一致的原始项目。 */
function originalProject(): ScratchProject {
  return {
    targets: [
      {
        isStage: true,
        name: 'Stage',
        costumes: [
          { name: 'backdrop1' },
          { name: 'Spotlight' },
          { name: 'Bedroom 3' },
        ],
        sounds: [{ name: 'pop' }],
        blocks: {},
        // 真实 starter 保存时当前背景是 Bedroom 3（下标 2），不是 backdrop1
        currentCostume: 2,
      },
      {
        isStage: false,
        name: 'Abby',
        costumes: [
          { name: 'Abby-a' },
          { name: 'Abby-b' },
          { name: 'Abby-c' },
          { name: 'Abby-d' },
        ],
        sounds: [{ name: 'Dance Space' }],
        blocks: {
          hat1: block('event_whenflagclicked', { topLevel: true, next: 'forever1' }),
          forever1: block('control_forever', { parent: 'hat1', next: null }),
          nextcostume1: block('looks_nextcostume', { parent: 'forever1' }),
          wait1: block('control_wait', {
            parent: 'forever1',
            // 真实 Scratch 3 里 DURATION 存在 inputs 里：[1, [5, "0.3"]]
            inputs: { DURATION: [1, [5, '0.3']] },
          }),
          hat2: block('event_whenflagclicked', { topLevel: true, next: 'forever2' }),
          forever2: block('control_forever', { parent: 'hat2', next: null }),
          play1: block('sound_playuntildone', { parent: 'forever2' }),
          menu1: block('sound_sounds_menu', {
            parent: 'play1',
            fields: { SOUND_MENU: ['Dance Space', null] },
          }),
        },
        currentCostume: 0,
      },
    ],
  }
}

/** 孩子按步骤改过的项目：转圈循环、等待改 1 秒、音量 80、背景 Spotlight、第三条脚本。 */
function modifiedProject(): ScratchProject {
  const p = originalProject()
  const abby = p.targets[1]
  const stage = p.targets[0]
  // 等待 0.3 -> 1（真实格式：inputs.DURATION = [1, [5, "0.3"]]）
  const wait1Inputs = abby.blocks.wait1.inputs as Record<string, unknown>
  const d = wait1Inputs.DURATION as [number, [number, string]]
  d[1][1] = '1'
  // 转圈循环：新脚本 绿旗 -> 重复 10 次 -> 右转 36 度 -> 等待 0.1
  abby.blocks.hat3 = block('event_whenflagclicked', { topLevel: true, next: 'repeat1' })
  abby.blocks.repeat1 = block('control_repeat', { parent: 'hat3' })
  abby.blocks.turn1 = block('motion_turnright', { parent: 'repeat1' })
  abby.blocks.wait2 = block('control_wait', {
    parent: 'repeat1',
    inputs: { DURATION: [1, [5, '0.1']] },
  })
  // 音乐脚本加音量设置
  abby.blocks.vol1 = block('sound_setvolumeto', {
    parent: 'hat2',
    fields: { VOLUME: ['80', null] },
  })
  // 背景换成 Spotlight（下标 1）
  stage.currentCostume = 1
  return p
}

describe('evaluateProject（原始作品）', () => {
  it('步骤 0/1/2 通过，改动类步骤不通过', () => {
    const results = evaluateProject(originalProject())
    const byId = Object.fromEntries(results.map((r) => [r.id, r]))
    expect(byId['step-0-preview'].pass).toBe(true)
    expect(byId['step-1-load'].pass).toBe(true)
    expect(byId['step-2-observe'].pass).toBe(true)
    // 未改过：无重复执行、等待仍是 0.3、无音量设置、背景仍是 Bedroom 3（starter 保存时的背景）、只有 2 条脚本
    expect(byId['step-3-loop'].pass).toBe(false)
    expect(byId['step-4-rhythm'].pass).toBe(false)
    expect(byId['step-5-music'].pass).toBe(false)
    expect(byId['step-6-backdrop'].pass).toBe(false)
    expect(byId['step-7-challenge'].pass).toBe(false)
    expect(byId['step-8-save'].pass).toBe(false)
  })

  it('读出等待时间 0.3 与当前背景 Bedroom 3', () => {
    const p = originalProject()
    expect(getWaitDurations(p)).toEqual([0.3])
    expect(getCurrentBackdropName(p)).toBe('Bedroom 3')
  })
})

// 真实的保存→关闭→重新打开流程走完后，页面才会给恢复证据。
// 证据绑定恢复当时的作品内容（projectHash），恢复后又改过的作品
// 不能搭便车——评价时须同时传当前作品的 projectHash。
const restoredFor = (project: ScratchProject) => ({
  savedAt: 1792000000000,
  loadedAt: 1792000005000,
  restored: true,
  projectHash: projectHash(project),
})

describe('evaluateProject（按步骤改过的作品）', () => {

  it('有恢复证据且哈希一致时 9 步全部通过', () => {
    const p = modifiedProject()
    const results = evaluateProject(p, {
      restoreEvidence: restoredFor(p),
      projectHash: projectHash(p),
    })
    const failed = results.filter((r) => !r.pass)
    expect(failed).toEqual([])
    expect(results).toHaveLength(9)
  })

  it('恢复证据的哈希与当前作品不一致时步骤 8 不通过（恢复后又改过）', () => {
    const modified = modifiedProject()
    const original = originalProject()
    const byId = Object.fromEntries(
      evaluateProject(original, {
        // 证据是改过作品的，当前却是原始作品：哈希对不上。
        restoreEvidence: restoredFor(modified),
        projectHash: projectHash(original),
      }).map((r) => [r.id, r]),
    )
    expect(byId['step-8-save'].pass).toBe(false)
    expect(byId['step-8-save'].detail).toMatch(/不一样/)
  })

  it('没有恢复证据时步骤 8 不通过（只看文件里有没有改是不够的）', () => {
    const results = evaluateProject(modifiedProject())
    const byId = Object.fromEntries(results.map((r) => [r.id, r]))
    expect(byId['step-8-save'].pass).toBe(false)
    expect(byId['step-8-save'].detail).toMatch(/保存后重新打开/)
    // 其余 8 步不受影响
    expect(results.filter((r) => r.pass)).toHaveLength(8)
  })

  it('恢复证据为假时步骤 8 不通过', () => {
    const p = modifiedProject()
    const results = evaluateProject(p, {
      restoreEvidence: { ...restoredFor(p), restored: false },
      projectHash: projectHash(p),
    })
    const byId = Object.fromEntries(results.map((r) => [r.id, r]))
    expect(byId['step-8-save'].pass).toBe(false)
  })

  it('有恢复证据但原始作品没改过时步骤 8 不通过', () => {
    const p = originalProject()
    const results = evaluateProject(p, {
      restoreEvidence: restoredFor(p),
      projectHash: projectHash(p),
    })
    const byId = Object.fromEntries(results.map((r) => [r.id, r]))
    expect(byId['step-8-save'].pass).toBe(false)
  })

  it('读出等待时间已改（1 与 0.1）与当前背景 Spotlight', () => {
    const p = modifiedProject()
    expect(getWaitDurations(p).sort()).toEqual([0.1, 1])
    expect(getCurrentBackdropName(p)).toBe('Spotlight')
  })
})

describe('evaluateProject（P2 判定修复：连接计数与至少判据）', () => {
  it('未连接的重复执行积木不通过步骤 3（浮动积木）', () => {
    const p = originalProject()
    const abby = p.targets[1]
    // 浮在工作区、没连在任何脚本里的重复执行积木。
    abby.blocks.floatRepeat = block('control_repeat', {
      topLevel: true,
      parent: null,
      next: null,
    })
    const byId = Object.fromEntries(
      evaluateProject(p).map((r) => [r.id, r]),
    )
    expect(byId['step-3-loop'].pass).toBe(false)
    expect(byId['step-3-loop'].detail).toMatch(/没连上/)
  })

  it('挂在浮动积木下的重复执行也不通过步骤 3', () => {
    const p = originalProject()
    const abby = p.targets[1]
    // 浮动的右转积木（不是帽子开头），重复执行挂在它下面。
    abby.blocks.floatTurn = block('motion_turnright', {
      topLevel: true,
      parent: null,
      next: 'hangRepeat',
    })
    abby.blocks.hangRepeat = block('control_repeat', {
      parent: 'floatTurn',
      next: null,
    })
    const byId = Object.fromEntries(
      evaluateProject(p).map((r) => [r.id, r]),
    )
    expect(byId['step-3-loop'].pass).toBe(false)
  })

  it('浮动的等待积木不计入节奏（步骤 4 仍不通过）', () => {
    const p = originalProject()
    const abby = p.targets[1]
    abby.blocks.floatWait = block('control_wait', {
      topLevel: true,
      parent: null,
      inputs: { DURATION: [1, [5, '1']] },
    })
    expect(getWaitDurations(p)).toEqual([0.3])
    const byId = Object.fromEntries(
      evaluateProject(p).map((r) => [r.id, r]),
    )
    expect(byId['step-4-rhythm'].pass).toBe(false)
  })

  it('造型 5 个、背景 4 个时步骤 0/1 通过（至少判据，增加素材不扣分）', () => {
    const p = modifiedProject()
    p.targets[1].costumes.push({ name: 'Abby-e' })
    p.targets[0].costumes.push({ name: 'Spotlight 2' })
    const byId = Object.fromEntries(
      evaluateProject(p, {
        restoreEvidence: restoredFor(p),
        projectHash: projectHash(p),
      }).map((r) => [r.id, r]),
    )
    expect(byId['step-0-preview'].pass).toBe(true)
    expect(byId['step-1-load'].pass).toBe(true)
    expect(byId['step-0-preview'].detail).toMatch(/至少 4 个/)
  })

  it('评价口径：无运行观测值时明确标注局限，有观测值时写明已观测', () => {
    const without = evaluateProject(originalProject())
    expect(without[0].detail).toMatch(/未观测到实际运行过程/)
    const withObs = evaluateProject(originalProject(), {
      runObservations: { greenFlagClicked: true, costumeSwitched: true },
    })
    expect(withObs[0].detail).toMatch(/已观测的运行证据/)
    expect(withObs[0].detail).toMatch(/绿旗被点击、造型确实切换过/)
    expect(withObs[2].detail).toMatch(/已观测到造型确实切换过/)
  })
})

describe('parseSb3', () => {
  it('缺少 project.json 时抛错', async () => {
    // 一个空 ZIP（只有 22 字节结束记录），不是有效 .sb3。
    const emptyZip = new Uint8Array([
      0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
    await expect(parseSb3(emptyZip.buffer as ArrayBuffer)).rejects.toThrow(
      /project\.json/,
    )
  })
})
