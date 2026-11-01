// G3-U1-L01 pen trial content (PR #260 web-classroom access).
// The trial runs the lesson's own main project in the real Scratch VM
// (scratch-pen-sandbox.html) and draws the VM's own pen output.
// Steps below are the VM-observed outcomes the SYS-105 schema gate counts
// as right/wrong examples. Every string is a verified run, not a forecast:
// - main run: editor visual check + Node VM run with a recording renderer
//   (30 pen lines, 6 stars with segment lengths 20/40/60/80/100/120,
//   end x=160, size variable=140).
// - failure run: editor visual check of the hardcoded-size variant
//   (6 equal small stars, no growth, end x=160).
// - dead-opcode run: Node VM run of the pre-fix generator output
//   (pen_down/pen_up do not exist in the VM, so 0 pen lines while the
//   sprite still walks to x=160).
// Nothing here is a published course or a verified grade.

export type G3PenStep = { id: string; solutions: string[]; counterExamples: string[] }

export type G3PenLesson = {
  id: string
  title: string
  /** Public sample URL the pen lab fetches (same bytes as the branch .sb3). */
  sample: string
  exportName: string
  steps: G3PenStep[]
}

export const g3PenLessons: Record<string, G3PenLesson> = {
  'G3-U1-L01': {
    id: 'G3-U1-L01',
    title: '用自制积木画图',
    sample: '/scratch-samples/g3-u1-l01-star-flags.sb3',
    exportName: 'G3-U1-L01-用自制积木画图.sb3',
    steps: [
      {
        id: 'main-six-growing-stars',
        solutions: ['绿旗运行主项目 → VM 画笔产出 30 段画线，6 颗星段长 20/40/60/80/100/120 递增，终点 x=160、size 变量=140'],
        counterExamples: ['找错项目（move 步数写死 20、未用 size 参数）→ 6 颗星大小完全相同、无递增，终点仍 x=160'],
      },
      {
        id: 'pen-down-draws-lines',
        solutions: ['主项目绿旗运行 → 画笔落笔产出 7 次 penPoint、30 次 penLine，舞台出现星形轨迹'],
        counterExamples: ['旧生成器项目（pen_down/pen_up 死 opcode）→ 画笔永不落笔，0 次 penLine，角色照常移动但无画线'],
      },
    ],
  },
}

export function getG3PenLesson(id: string): G3PenLesson | null {
  return g3PenLessons[id] ?? null
}
