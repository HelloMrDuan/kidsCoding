// 只给测试用：在 Node 里用**真实的 scratch-vm** 跑 compile.ts 生成的工程，产出 RunTrace。
// 这不是模拟器：积木由 scratch-vm 执行，本文件只负责（1）虚拟时钟，（2）每帧读舞台变量，（3）记录 operator_lt 的求值和广播。
// 正式页面里的沙箱（浏览器 iframe）用同样的做法，浏览器里的行为由 E2E 验证，不由本文件代替。
//
// 虚拟时钟：scratch-vm 的 control_wait 用全局时钟（浏览器里是 self.performance.now，Node 里退回 Date.now）。
// 本运行器在运行期间替换 Date.now，结束后一定恢复。
// 调度器在一帧里会反复轮询正在“等待”的线程，直到有重绘请求或用掉 75% 的帧时间才退出；虚拟时钟在一帧内不走，
// 所以必须靠重绘请求退出（否则死循环，探针里复现过）：每跑一遍线程就请求一次重绘，一帧恰好一遍。

import { createRequire } from 'node:module'
import { compileProject, L05_ASSET_ID, SCORE_VAR, TIME_VAR } from '../compile'
import type { Check, Frame, RunTrace } from '../judge'
import { L05_PARAMS } from '../params'
import type { Program } from '../program'
import { programFingerprint } from '../program'

const nodeRequire = createRequire(import.meta.url)
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4"/></svg>'

type AnyVm = {
  runtime: {
    sequencer: { stepThread: (t: unknown) => void }
    requestRedraw: () => void
    updateCurrentMSecs: () => void
    _step: () => void
    getTargetForStage: () => { variables: Record<string, { name: string; value: unknown }> }
    startHats: (opcode: string, ...rest: unknown[]) => unknown
    currentStepTime: number
    threads: unknown[]
    [k: string]: unknown
  }
  attachStorage: (s: unknown) => void
  loadProject: (json: string) => Promise<void>
  greenFlag: () => void
  stopAll: () => void
}

export type RunOptions = {
  levelId?: string
  runId?: number
  /** 学生脚本结束后再多看多少帧（默认取课程参数）。 */
  settleFrames?: number
  frameCap?: number
  /** 每帧调用一次（返回 true 表示停止运行，用来测“运行中停止”）。 */
  onFrame?: (frame: number) => boolean | void
}

const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function runProgramInRealVm(program: Program, opts: RunOptions = {}): Promise<RunTrace> {
  const VM = nodeRequire('scratch-vm') as new () => AnyVm
  const SS = nodeRequire('scratch-storage')
  const Storage = typeof SS === 'function' ? SS : (SS.default || SS.ScratchStorage)

  const realNow = Date.now
  let virtualNow = 1_000_000
  Date.now = () => virtualNow
  try {
    const vm = new VM()
    const storage = new Storage()
    vm.attachStorage(storage)
    storage.cache(storage.AssetType.ImageVector, storage.DataFormat.SVG, Buffer.from(SVG), L05_ASSET_ID)
    await vm.loadProject(JSON.stringify(compileProject(program)))

    const stage = vm.runtime.getTargetForStage()
    const variable = (name: string) => Object.values(stage.variables).find(v => v.name === name)
    const timeVar = variable(TIME_VAR.name)
    const scoreVar = variable(SCORE_VAR.name)
    if (!timeVar || !scoreVar) throw new Error('工程里缺少 timeLeft 或 score')

    const frames: Frame[] = []
    const broadcasts: number[] = []
    const checks: Check[] = []
    let frame = 0

    // 记录广播：事件“收到广播”的帽子积木每被触发一次就是一次广播
    const origStartHats = vm.runtime.startHats.bind(vm.runtime)
    vm.runtime.startHats = (opcode: string, ...rest: unknown[]) => {
      if (opcode === 'event_whenbroadcastreceived') broadcasts.push(frame)
      return origStartHats(opcode, ...rest)
    }
    // 记录学生“timeLeft < 1”的真实求值（课程自带脚本里没有 operator_lt，只有 operator_gt）
    const blocksCls = (vm.runtime as unknown as { _primitives: Record<string, (args: Record<string, unknown>, util: unknown) => unknown> })._primitives
    const origLt = blocksCls.operator_lt
    blocksCls.operator_lt = (args, util) => {
      const result = origLt.call(null, args, util) as boolean
      checks.push({ frame, value: toNumber(timeVar.value), result })
      return result
    }

    const seq = vm.runtime.sequencer
    const origStepThread = seq.stepThread.bind(seq)
    seq.stepThread = (thread: unknown) => { origStepThread(thread); vm.runtime.requestRedraw() }
    vm.runtime.currentStepTime = L05_PARAMS.stepMs

    const cap = opts.frameCap ?? L05_PARAMS.frameCap
    const settle = opts.settleFrames ?? L05_PARAMS.settleFrames
    // 课程自带的“水果”脚本永远不结束，所以“学生脚本结束”要自己判断：学生角色上没有活动线程
    const studentActive = () => (vm.runtime.threads as Array<{ target?: { sprite?: { name: string } }; status: number }>)
      .some(t => t.target?.sprite?.name === '学生' && t.status !== 4)

    vm.greenFlag()
    let endedBy: RunTrace['endedBy'] = 'finished'
    let settledSince = -1
    for (frame = 1; frame <= cap; frame++) {
      virtualNow += L05_PARAMS.stepMs
      vm.runtime.updateCurrentMSecs()
      vm.runtime._step()
      frames.push({ frame, timeLeft: toNumber(timeVar.value), score: toNumber(scoreVar.value) })
      if (opts.onFrame?.(frame)) { endedBy = 'stopped'; vm.stopAll(); break }
      if (settledSince < 0 && !studentActive()) settledSince = frame
      if (settledSince >= 0 && frame - settledSince >= settle) break
      if (frame === cap) endedBy = 'frameCap'
    }
    return {
      levelId: opts.levelId ?? 'solve',
      runId: opts.runId ?? 1,
      fingerprint: programFingerprint(program),
      endedBy,
      frames,
      broadcasts,
      checks,
    }
  } finally {
    Date.now = realNow
  }
}
