/**
 * OPS-042：在真实 Scratch VM 里运行孩子的 .sb3 并采集 RunTrace，
 * 供本课既有的 judge.ts 三层判定使用（judgeRun 不改一行）。
 *
 * 方法与 2026-11-15 独立原型 judge-proto 的实证完全一致，不是
 * 静态数积木：
 * - 用真实 scratch-vm 加载工程并逐帧运行（30fps 虚拟步进）；
 * - 包裹 VM 的 motion_changexby 原语，记录篮子每一次真实执行的
 *   移动（帧号、dx、是否在循环内——inLoop 由执行时积木的父链
 *   得出，与 compile/沙箱的 ancestorIsLoop 同规则）；
 * - 每帧观测水果/篮子位置，记录水果第一次落到篮子高度的瞬间；
 * - 静态结构只用来给真实执行打 inLoop 标签，绝不用“积木存在”
 *   冒充“积木运行过”（原型五案已证明这条边界：空循环、无循环、
 *   未连接积木都会被真实执行记录识破）。
 *
 * VM 引擎的加载方式与本仓库既有沙箱一致，不经 webpack 打包
 * （scratch-vm 源码入口含二进制资源导入，webpack 无法处理，
 * 这也是仓库用 public/scratch-vm 自托管网页版构建的原因）：
 * - 浏览器：按需注入 /scratch-vm/scratch-vm.js 与
 *   scratch-storage.min.js（仓库 predev/prebuild 自托管的官方
 *   网页版构建，与 L02 沙箱同款），用全局 VirtualMachine /
 *   ScratchStorage；
 * - Node（单元测试）：直接动态导入 npm 包（与原型同路径）。
 */

import JSZip from 'jszip'

import { BASKET_NAME, FRUIT_NAME } from '../compile'
import type { BasketMove, RunTrace } from '../judge'
import { L02_PARAMS } from '../params'

/* eslint-disable @typescript-eslint/no-explicit-any */
type VmCtor = any
type StorageCtor = any

let enginePromise: Promise<{
  VirtualMachine: VmCtor
  ScratchStorage: StorageCtor
}> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const el = document.createElement('script')
    el.src = src
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`加载 Scratch 引擎失败：${src}`))
    document.head.appendChild(el)
  })
}

/** 加载真实 VM 引擎（浏览器走自托管网页版构建，Node 走 npm 包）。 */
export function loadVmEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      // vitest 虽然提供 DOM（window 存在），但不会加载外部脚本，
      // 必须走 npm 包路径；真实浏览器走自托管脚本路径。
      const isVitest =
        typeof process !== 'undefined' && !!process.env?.VITEST
      if (
        !isVitest &&
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      ) {
        const w = window as unknown as Record<string, unknown>
        if (!w.VirtualMachine) {
          await loadScript('/scratch-vm/scratch-vm.js')
        }
        if (!w.ScratchStorage) {
          await loadScript('/scratch-vm/scratch-storage.min.js')
        }
        const VirtualMachine = w.VirtualMachine as VmCtor
        // scratch-storage 网页版构建导出的是命名空间对象，类在其
        // ScratchStorage 属性上（与 L02 沙箱宿主同一种处理）。
        const storageGlobal = w.ScratchStorage as
          | StorageCtor
          | { ScratchStorage: StorageCtor }
        const ScratchStorage =
          typeof storageGlobal === 'function'
            ? storageGlobal
            : storageGlobal?.ScratchStorage
        if (!VirtualMachine || !ScratchStorage) {
          throw new Error('Scratch 引擎加载后不可用')
        }
        return { VirtualMachine, ScratchStorage }
      }
      // webpackIgnore：浏览器分支永远走上面的自托管脚本路径，不会
      // 执行到这里；这两个导入只给 Node（单元测试）用，不能让
      // webpack 去打包 scratch-vm 的源码入口。
      const vmModule = await import(/* webpackIgnore: true */ 'scratch-vm')
      const storageModule = await import(
        /* webpackIgnore: true */ 'scratch-storage'
      )
      return {
        VirtualMachine: vmModule.default,
        ScratchStorage: storageModule.ScratchStorage,
      }
    })()
  }
  return enginePromise
}

/** 执行时积木的父链里是否有“重复执行/永远”且当前积木不是它的 next（即在循环体内）。与原型逐行一致。 */
function ancestorIsLoop(
  target: {
    blocks: {
      _blocks: Record<
        string,
        { id: string; parent: string | null; opcode: string; next: string | null }
      >
    }
  },
  blockId: string,
): boolean {
  const blocks = target.blocks._blocks
  let cur = blocks[blockId]
  while (cur && cur.parent) {
    const parent = blocks[cur.parent]
    if (!parent) return false
    if (
      (parent.opcode === 'control_repeat' ||
        parent.opcode === 'control_forever') &&
      parent.next !== cur.id
    ) {
      return true
    }
    cur = parent
  }
  return false
}

export type RunTraceInput = {
  levelId: string
  runId: number
  /** 运行时的程序指纹（由调用方按工程内容计算，与 judge 的失效规则配套）。 */
  fingerprint: string
}

/**
 * 运行一份 .sb3 并采集轨迹。找不到“篮子/水果”角色时抛错，
 * 调用方应把这次判定记为未判定并把原因告诉孩子。
 */
export async function runProjectTrace(
  sb3: ArrayBuffer,
  input: RunTraceInput,
): Promise<RunTrace> {
  const { VirtualMachine, ScratchStorage } = await loadVmEngine()

  const zip = await JSZip.loadAsync(sb3)
  const projectFile = zip.file('project.json')
  if (!projectFile) throw new Error('作品文件里没有 project.json')
  const project = JSON.parse(await projectFile.async('string'))

  const storage = new ScratchStorage()
  for (const name of Object.keys(zip.files)) {
    if (name.endsWith('.svg')) {
      const data = await zip.file(name)!.async('uint8array')
      storage.cache(
        storage.AssetType.ImageVector,
        storage.DataFormat.SVG,
        data,
        name.replace('.svg', ''),
      )
    }
  }

  const vm: any = new VirtualMachine()
  vm.attachStorage(storage)
  await vm.loadProject(project)

  const targets: any[] = vm.runtime.targets
  const fruit = targets.find((t) => t.sprite.name === FRUIT_NAME)
  const basket = targets.find((t) => t.sprite.name === BASKET_NAME)
  if (!fruit || !basket) {
    throw new Error(
      `作品里找不到“${BASKET_NAME}”或“${FRUIT_NAME}”角色（是不是改了名字或删掉了？）`,
    )
  }

  const basketMoves: BasketMove[] = []
  let frame = 0
  const prims: Record<string, any> = vm.runtime._primitives
  const origMove = prims.motion_changexby
  prims.motion_changexby = function (args: any, util: any) {
    const out = origMove.call(this, args, util)
    if (util.target === basket) {
      const dx = Number(args.DX)
      basketMoves.push({
        frame,
        dx: Number.isFinite(dx) ? dx : 0,
        inLoop: ancestorIsLoop(util.target, util.thread.peekStack()),
      })
    }
    return out
  }
  const origRepeat = prims.control_repeat
  prims.control_repeat = function (args: any, util: any) {
    const out = origRepeat.call(this, args, util)
    vm.runtime.requestRedraw()
    return out
  }

  const trace: RunTrace = {
    levelId: input.levelId,
    runId: input.runId,
    fingerprint: input.fingerprint,
    endedBy: 'frameCap',
    framesRun: 0,
    start: { basketX: basket.x, fruitX: fruit.x },
    landing: null,
    basketMoves,
  }

  try {
    vm.runtime.currentStepTime = 1000 / 30
    vm.greenFlag()
    while (frame < L02_PARAMS.frameCap) {
      frame += 1
      vm.runtime._step()
      trace.framesRun = frame
      if (!trace.landing && fruit.y <= L02_PARAMS.basketY) {
        trace.landing = {
          frame,
          basketX: basket.x,
          fruitX: fruit.x,
          fruitY: fruit.y,
        }
      }
      if (vm.runtime.threads.length === 0) break
    }
  } finally {
    prims.motion_changexby = origMove
    prims.control_repeat = origRepeat
  }
  if (trace.landing) trace.endedBy = 'landed'
  return trace
}
/* eslint-enable @typescript-eslint/no-explicit-any */
