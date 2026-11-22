'use client'

import { g2u1L03 } from '@/content/curriculum/g2-u1-scratch-lessons'
import { observeForestConcert } from './concert-runtime'
import { ScratchCourseEditor, type CourseJudgment, type ScratchGoldenCourse } from './scratch-course-editor'

const starterLine = '欢迎来到森林音乐会！'
const concert: ScratchGoldenCourse = {
  id: g2u1L03.id,
  title: g2u1L03.title,
  story: g2u1L03.story,
  sample: g2u1L03.sample,
  completionTitle: '音乐会已完成',
  badge: '森林音乐会导演',
  nextLessonId: 'G2-U1-L04',
  activities: [
    {
      title: '给舞台换上绿色草地',
      goal: '选择舞台。从“外观”找到换背景积木，让它在绿旗后执行。先猜一猜：不用积木，仅选一个背景，重新点绿旗还会保持吗？',
      hints: ['看一看点击绿旗后出现的背景。', '背景属于舞台，背景脚本也要放在舞台下。', '接好“当绿旗被点击”与“换成绿色草地背景”，再检查。'],
    },
    {
      title: '让小鸟唱另一首歌',
      goal: '在小鸟的脚本里，把点击时播放的声音改成“啾啾”，再在舞台点小鸟听听。',
      hints: ['检查响起来的是“叽叽”还是“啾啾”。', '声音列表跟随选中的角色。', '在小鸟的点击事件下面选择“播放声音 啾啾”。'],
    },
    {
      title: '观察三声开幕铃',
      goal: '先预测开幕铃会响几次。保持舞台原来的重复脚本，点击绿旗听一听，再检查。',
      prediction: { question: '按绿旗后，开幕铃响几次？', choices: ['响 1 次', '响 3 次', '一直响'] },
      hints: ['听一听是否有多声铃。', '播放声音在“重复执行”里面。', '先保留重复次数 3，点击绿旗后检查。'],
    },
    {
      title: '修好一直响的开幕铃',
      goal: '让音乐会每次开始只响一遍开幕铃，绿色草地仍然会出现。',
      hints: ['检查时看有几次铃声。', '每执行一遍循环就播放一次声音。', '把舞台脚本的重复次数改成 1，保留换背景和播放两块积木。'],
    },
    {
      title: '编排自己的音乐会开场',
      goal: '给小橘猫写一句新的开场词，再检查背景、开幕铃与小鸟的歌声。',
      hints: ['开场铃和歌声要各自出现。', '猫的对白应由猫的点击事件触发。', '选小橘猫，改“说”的文字，再点猫试一遍。'],
    },
  ],
}

async function judge(bytes: ArrayBuffer, step: number, observed: boolean): Promise<CourseJudgment> {
  const result = await observeForestConcert(bytes)
  if (result.reachedFrameCap) return { passed: false, detail: '开场脚本还在继续。检查是否有多余的重复或等待。' }
  const grass = result.backdrop === '绿色草地' && result.backdropSwitched
  const bird = result.birdSounds.includes('啾啾')
  if (step === 0) return {
    passed: grass,
    detail: grass ? '绿旗后，舞台真的换成了绿色草地。' : `绿旗后看到的是${result.backdrop ?? '空背景'}。检查舞台脚本。`,
  }
  if (step === 1) return { passed: bird, detail: bird ? '点小鸟时，播放了啾啾。' : '没有听到小鸟的啾啾，检查事件和音效。' }
  if (step === 2) return {
    passed: result.bellCount === 3,
    observed: result.bellCount === 3,
    detail: result.bellCount === 3 ? '这次记录到三声开幕铃。下一关修好它。' : `这次开幕铃响了 ${result.bellCount} 次。请先观察重复三次的原程序。`,
  }
  if (!observed || !grass || result.bellCount !== 1) return {
    passed: false, detail: `本次开幕铃响了 ${result.bellCount} 次。请让绿旗换上绿色草地，并只响一声开幕铃。`,
  }
  if (step === 3) return { passed: true, detail: '绿色草地出现，开幕铃只响了一声。' }
  const newLine = result.catLine?.trim()
  const complete = bird && !!newLine && newLine !== starterLine
  return {
    passed: complete,
    detail: complete ? '音乐会开幕了：换好背景、响一声铃，小鸟唱歌，主持人说出了你的开场词。' : '保留小鸟的啾啾声，再让小橘猫说一句你自己写的主持词。',
  }
}

export function ForestConcertCourse({ owner, host }: { owner: string; host?: string }) {
  return <ScratchCourseEditor course={concert} owner={owner} host={host} judge={judge} />
}
