// 只给测试用：在 Node 里用**真实的 scratch-vm** 跑 compile.ts 生成的工程，产出 RunTrace。
// 这不是模拟器：积木由 scratch-vm 执行，本文件只负责（1）虚拟时钟与带种子的随机，（2）每帧读舞台变量与角色位置，
// （3）记录 operator_random / 出生 / 检查 / 得分 / 隐藏的真实调用。
//
// 重要边界：Node 侧**没有渲染器**，sensing_touchingobject 在无渲染器时永远返回 false——
// 所以本运行器只能验证随机出生、篮子跟随指针、倒计时与结束条件这些不依赖碰撞的行为；
// 碰撞与记分的真实行为由浏览器 E2E（真实 Chrome + 真实渲染器）验证，两者不能互相代替。
//
// 虚拟时钟与随机与浏览器沙箱的做法一致（Date.now 虚拟化、Math.random 带种子 PRNG、每遍线程请求重绘）。

import { createRequire } from 'node:module'
import { compileProject, L06_ASSETS, SCORE_VARIABLE_ID, TIME_VARIABLE_ID } from '../compile'
import type { RunTrace } from '../judge'
import { L06_LEVELS, L06_PARAMS, type LevelId } from '../params'
import { programFingerprint, type Program } from '../program'

const nodeRequire = createRequire(import.meta.url)
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4"/></svg>'
const STEP_MS = 1000 / 30

type AnyTarget = { sprite?: { name: string }; x: number; y: number; visible: boolean; variables: Record<string, { name: string; value: unknown }> }
type AnyVm = {
  runtime: {
    sequencer: { stepThread: (t: unknown) => unknown }
    requestRedraw: () => void
    updateCurrentMSecs: () => void
    _step: () => void
    getTargetForStage: () => AnyTarget
    targets: AnyTarget[]
    currentStepTime: number
    threads: unknown[]
    _primitives: Record<string, (args: Record<string, unknown>, util: { target?: AnyTarget }) => unknown>
    [k: string]: unknown
  }
  attachStorage: (s: unknown) => void
  loadProject: (json: string) => Promise<void>
  greenFlag: () => void
  stopAll: () => void
  postIOData: (ns: string, data: Record<string, unknown>) => void
}

export type RunOptions = {
  runId?: number
  frameCap?: number
  /** 每帧在步进之前调用：可借此用 postIOData 移动鼠标（测篮子跟随）。 */
  onFrame?: (frame: number, vm: AnyVm) => boolean | void
}

const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export async function runProgramInRealVm(program: Program, levelId: LevelId, opts: RunOptions = {}): Promise<RunTrace> {
  const level = L06_LEVELS[levelId]
  const VM = nodeRequire('scratch-vm') as new () => AnyVm
  const SS = nodeRequire('scratch-storage')
  const Storage = typeof SS === 'function' ? SS : (SS.default || SS.ScratchStorage)

  const realNow = Date.now
  const realRandom = Math.random
  let virtualNow = 1_000_000
  Date.now = () => virtualNow
  Math.random = mulberry32(L06_PARAMS.randomSeed)
  try {
    const vm = new VM()
    const storage = new Storage()
    vm.attachStorage(storage)
    // Node 侧没有渲染器，造型字节不影响执行；三个素材 ID 都要缓存，工程才能完整加载。
    for (const assetId of Object.values(L06_ASSETS)) {
      storage.cache(storage.AssetType.ImageVector, storage.DataFormat.SVG, Buffer.from(SVG), assetId)
    }
    await vm.loadProject(JSON.stringify(compileProject(program, level)))

    const stage = vm.runtime.getTargetForStage()
    const scoreVar = stage.variables[SCORE_VARIABLE_ID]
    const timeVar = stage.variables[TIME_VARIABLE_ID]
    if (!scoreVar || !timeVar) throw new Error('工程里缺少得分或时间变量')
    const sprite = (name: string) => vm.runtime.targets.find(t => t.sprite?.name === name)

    const trace: RunTrace = {
      levelId, runId: opts.runId ?? 1, fingerprint: programFingerprint(program),
      endedBy: 'finished', framesRun: 0, endReason: null, winFrame: null, timeupFrame: null,
      randoms: [], spawns: [], checks: [], scores: [], hides: [],
      finalScore: 0, finalTimeLeft: level.timeLimitSeconds, fruitVisible: true, basketX: 0,
    }
    let frame = 0
    const isFruit = (util: { target?: AnyTarget }) => util?.target?.sprite?.name === '水果'
    const prim = vm.runtime._primitives
    const wrap = (name: string, record: (args: Record<string, unknown>, util: { target?: AnyTarget }, out: unknown) => void) => {
      const orig = prim[name]
      prim[name] = (args, util) => {
        const out = orig.call(null, args, util)
        record(args, util, out)
        return out
      }
    }
    wrap('operator_random', (_a, util, out) => { if (isFruit(util)) trace.randoms.push({ frame, value: toNumber(out) }) })
    wrap('motion_setx', (args, util) => { if (isFruit(util)) trace.spawns.push({ frame, x: toNumber(args.X) }) })
    wrap('sensing_touchingobject', (_a, util, out) => { if (isFruit(util)) trace.checks.push({ frame, result: out === true }) })
    wrap('data_changevariableby', (args, util) => { if (isFruit(util)) trace.scores.push({ frame, by: toNumber(args.VALUE) }) })
    wrap('looks_hide', (_a, util) => { if (isFruit(util)) trace.hides.push({ frame }) })

    const seq = vm.runtime.sequencer
    const origStepThread = seq.stepThread.bind(seq)
    seq.stepThread = (thread: unknown) => { const out = origStepThread(thread); vm.runtime.requestRedraw(); return out }
    vm.runtime.currentStepTime = STEP_MS

    const cap = opts.frameCap ?? L06_PARAMS.frameCap
    let settleLeft = L06_PARAMS.settleFrames
    vm.greenFlag()
    for (frame = 1; frame <= cap; frame++) {
      if (opts.onFrame?.(frame, vm)) { trace.endedBy = 'stopped'; vm.stopAll(); break }
      virtualNow += STEP_MS
      vm.runtime.updateCurrentMSecs()
      vm.runtime._step()
      trace.framesRun = frame
      const score = toNumber(scoreVar.value)
      const timeLeft = toNumber(timeVar.value)
      if (trace.winFrame === null && score >= level.winTarget) { trace.winFrame = frame; trace.endReason = 'win' }
      if (trace.timeupFrame === null && timeLeft < 1) { trace.timeupFrame = frame; if (trace.endReason === null) trace.endReason = 'timeup' }
      if (trace.endReason !== null) {
        settleLeft -= 1
        if (settleLeft <= 0) break
      }
      if (vm.runtime.threads.length === 0) break
      if (frame === cap) trace.endedBy = 'frameCap'
    }
    trace.finalScore = toNumber(scoreVar.value)
    trace.finalTimeLeft = toNumber(timeVar.value)
    const fruit = sprite('水果')
    const basket = sprite('篮子')
    trace.fruitVisible = fruit ? !!fruit.visible : false
    trace.basketX = basket ? basket.x : 0
    return trace
  } finally {
    Date.now = realNow
    Math.random = realRandom
  }
}
