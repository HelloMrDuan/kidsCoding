'use client'

import { hasCompletedFlight, hasRegularBursts, observeMeteorShower } from './meteor-runtime'
import { ScratchCourseEditor, type CourseJudgment, type ScratchGoldenCourse } from './scratch-course-editor'

const meteorCourse: ScratchGoldenCourse = {
  id: 'G3-U1-L02',
  title: '克隆流星雨',
  story: '星球防卫站正在测试流星发生器。先预测一颗流星的生命过程，再修好发生器，让十颗流星落到地面后各自退场。',
  sample: '/scratch-samples/g3-u1-l02-golden-starter.sb3',
  completionTitle: '流星雨项目已完成',
  badge: '分身工程师',
  nextLessonId: 'G3-U1-L03',
  activities: [
    {
      title: '校准发生器',
      goal: '预测会出现几颗流星。用绿旗试运行，再调整流星发生器，让它每 0.3 秒生成一颗，一口气生成十颗。',
      hints: ['看一看屏幕上出现了几颗。', '一颗流星对应一个克隆体。生成循环控制有几颗。', '在绿旗下的重复循环里保留克隆体和等待，把重复次数改成 10。'],
    },
    {
      title: '观察挤在地面的流星',
      goal: '先不改下落脚本。看完一整场流星雨，说说掉到舞台底部之后，流星去了哪里？然后检查。',
      prediction: { question: '原来的脚本跑完后，舞台会剩下流星吗？', choices: ['会留在地面', '会自动消失'] },
      hints: ['把目光移到舞台底边。', '原角色隐藏和克隆体消失是两回事。', '保留原有的下落和缺失的删除动作，检查会报告剩下的分身。'],
    },
    {
      title: '让分身安全退场',
      goal: '从控制分类拖入删除此克隆体，放到下落脚本最后。再点绿旗，确认流星仍然落到地面，然后才消失。',
      hints: ['删除太早，看不到完整的下落。', '结束的是“作为克隆体启动”的这段脚本。', '把“删除此克隆体”接到下落循环的底部，留在循环外。'],
    },
    {
      title: '封装一颗流星的动作',
      goal: '创建一个自制积木，把流星的下降管理交给它，再在分身启动时调用。运行结果仍须是十颗分身各自下落、到地面消失。',
      hints: ['想想每颗分身都要执行的动作。', '“定义”里的动作只会在调用自制积木时执行。', '用自制积木定义下落循环，在“当作为克隆体启动”里调用它，再删除克隆体。'],
    },
  ],
}

async function judge(bytes: ArrayBuffer, step: number, sawPile: boolean): Promise<CourseJudgment> {
  const run = await observeMeteorShower(bytes)
  if (!run.finished) return { passed: false, detail: '流星雨没有按时结束。看看生成循环的次数、等待或退出条件。' }
  if (!run.originalHidden || !hasRegularBursts(run.clones)) return {
    passed: false,
    detail: `检测到 ${run.clones.length} 颗分身。请先隐藏原角色，每 0.3 秒生成一颗，共生成十颗。`,
  }
  if (step === 0) return { passed: true, detail: '发生器按节拍生成了十颗流星。' }
  if (step === 1) {
    const stranded = run.remaining > 0 && run.clones.some(flight => flight.lowestY <= -145)
    return {
      passed: stranded,
      observed: stranded,
      detail: stranded ? `等到程序结束，舞台上还有 ${run.remaining} 颗分身。请修好退场动作。` : '这次没有观察到分身堆在地面。暂时把退场积木移开，再观察一次。',
    }
  }
  if (!sawPile || run.remaining !== 0 || !run.clones.every(hasCompletedFlight)) return {
    passed: false,
    detail: `结束时还有 ${run.remaining} 颗分身。每一颗都要先从高处落到底部，再执行删除。`,
  }
  if (step === 2) return { passed: true, detail: '十颗流星完整落下，并在到底后删除。' }
  return {
    passed: run.usedCustomBlock,
    detail: run.usedCustomBlock ? '你的自制积木执行了，十颗流星完成下落，舞台没有留下分身。' : '流星都退场了。还需要从流星的脚本实际调用自制积木。',
  }
}

export function MeteorCourse({ owner, host }: { owner: string; host?: string }) {
  return <ScratchCourseEditor course={meteorCourse} owner={owner} host={host} judge={judge} />
}
