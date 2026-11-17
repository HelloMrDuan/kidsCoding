/**
 * OPS-042：把 L02 的固定模型编译为真实可编辑的 .sb3 初始作品。
 *
 * 做法与原型（2026-11-15 独立验证通过）一致，不另起一套：
 * - 工程结构直接用本课既有的 compileProject(program, level)——
 *   opcode、预置水果脚本、坐标与关卡参数全部同源，教学参数
 *   （params.ts，pilot-approved）一个数字都不改；
 * - compileProject 用的是沙箱内置资源 ID（假 md5，沙箱宿主内部
 *   映射到内置 SVG）；真实 Scratch GUI 按 assetId 找文件，所以
 *   这里把三个资源 ID 换成 SVG 内容的真实 md5，并把 SVG 文件
 *   本身打进 .sb3。三幅 SVG 是本项目原创素材，与沙箱宿主
 *   （public/scratch-g2-u3-l02-sandbox.html）内置的原文逐字一致，
 *   已核对 md5：backdrop 3abff32b…、basket 19af2626…、fruit 34cf10d9…。
 *
 * 孩子在 GUI 里打开的就是这份工程：积木可拖拽、改数、连接、
 * 删除；保存/导出走 GUI 与桥接的真实通道，本模块只负责生成
 * 每一关的初始作品。
 */

import JSZip from 'jszip'

import { compileProject, L02_ASSETS } from '../compile'
import {
  L02_LEVELS,
  type LevelId,
  type LevelParams,
} from '../params'
import { EMPTY_PROGRAM, type Program } from '../program'

const SVG_BACKDROP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#dff3ff"/><rect y="250" width="480" height="110" fill="#9bd36b"/><rect y="290" width="480" height="70" fill="#7fbf55"/><circle cx="420" cy="50" r="28" fill="#ffd95a"/><g fill="#6b4a2b"><rect x="60" y="130" width="14" height="120"/><rect x="380" y="150" width="12" height="100"/></g><g fill="#58a845"><circle cx="67" cy="115" r="46"/><circle cx="386" cy="135" r="38"/></g></svg>'
const SVG_BASKET =
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40" viewBox="0 0 80 40"><path d="M4 8h72l-8 28a4 4 0 0 1-4 3H16a4 4 0 0 1-4-3z" fill="#c98a3d" stroke="#8a5a1f" stroke-width="3" stroke-linejoin="round"/><path d="M14 16h52M18 26h44M28 8l2 30M40 8v31M52 8l-2 30" stroke="#8a5a1f" stroke-width="2" fill="none"/></svg>'
const SVG_FRUIT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><path d="M20 12c-8-6-16 0-15 10 1 9 7 15 11 15 2 0 3-1 4-1s2 1 4 1c4 0 10-6 11-15 1-10-7-16-15-10z" fill="#e8483c" stroke="#a82a22" stroke-width="2"/><path d="M20 12c0-4 1-7 4-9" stroke="#6b4a2b" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M24 6c4-3 8-1 8 1-3 2-7 2-8-1z" fill="#58a845"/></svg>'

/** 真实 md5 资源表（与原型 .sb3 完全一致的三个文件）。 */
export const L02_STUDIO_ASSETS = {
  backdrop: {
    md5: '3abff32bae618976a4dd1a8f1cbb64c9',
    svg: SVG_BACKDROP,
    sandboxId: L02_ASSETS.backdrop,
  },
  basket: {
    md5: '19af262622389e4e2f47cf3f5070f140',
    svg: SVG_BASKET,
    sandboxId: L02_ASSETS.basket,
  },
  fruit: {
    md5: '34cf10d99f8974614eb30ac109f80ebd',
    svg: SVG_FRUIT,
    sandboxId: L02_ASSETS.fruit,
  },
} as const

/** 第一关的演示程序（contract.ts：重复 2 次，每次 x 增加 20，只能看不能改的教学设定）。 */
export const L02_DEMO_PROGRAM: Program = {
  scripts: [
    {
      hat: 'flag',
      body: [{ t: 'repeat', times: 2, body: [{ t: 'move', dx: 20 }] }],
    },
  ],
}

/** 参考程序（第二关）：重复 15 次，每次 x 增加 10 → 篮子到 150 接住。仅供测试与教师演示，不进学生界面。 */
export const L02_REFERENCE_PROGRAM: Program = {
  scripts: [
    {
      hat: 'flag',
      body: [{ t: 'repeat', times: 15, body: [{ t: 'move', dx: 10 }] }],
    },
  ],
}

/** 毛病程序（第二关）：方向反了，重复 15 次，每次 x 增加 -10 → 篮子到 -150，落空。仅供测试与教师演示。 */
export const L02_BUGGY_PROGRAM: Program = {
  scripts: [
    {
      hat: 'flag',
      body: [{ t: 'repeat', times: 15, body: [{ t: 'move', dx: -10 }] }],
    },
  ],
}

/** 每一关的初始篮子程序：第一关给演示程序，其余关从空程序开始自己搭（与 state.ts 的初始状态一致）。 */
export function starterProgramFor(levelId: LevelId): Program {
  return levelId === 'explore' ? L02_DEMO_PROGRAM : EMPTY_PROGRAM
}

/**
 * 生成一关的初始作品工程（project.json 对象）：compileProject 的
 * 结构原样保留，只把三个沙箱资源 ID 换成真实 md5。
 */
export function buildStarterProject(program: Program, level: LevelParams) {
  const project = compileProject(program, level)
  const remap = new Map<string, string>([
    [L02_STUDIO_ASSETS.backdrop.sandboxId, L02_STUDIO_ASSETS.backdrop.md5],
    [L02_STUDIO_ASSETS.basket.sandboxId, L02_STUDIO_ASSETS.basket.md5],
    [L02_STUDIO_ASSETS.fruit.sandboxId, L02_STUDIO_ASSETS.fruit.md5],
  ])
  for (const target of project.targets) {
    for (const costume of target.costumes) {
      const md5 = remap.get(costume.assetId)
      if (md5) {
        costume.assetId = md5
        costume.md5ext = `${md5}.svg`
      }
    }
  }
  return project
}

/** 生成一关的初始作品 .sb3（project.json + 三个 SVG 文件）。 */
export async function buildStarterSb3(
  program: Program,
  level: LevelParams,
): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file('project.json', JSON.stringify(buildStarterProject(program, level)))
  for (const asset of Object.values(L02_STUDIO_ASSETS)) {
    zip.file(`${asset.md5}.svg`, asset.svg)
  }
  return zip.generateAsync({ type: 'arraybuffer' })
}

/** 按关卡 id 取初始作品 .sb3。 */
export async function buildLevelStarterSb3(
  levelId: LevelId,
): Promise<ArrayBuffer> {
  return buildStarterSb3(starterProgramFor(levelId), L02_LEVELS[levelId])
}
