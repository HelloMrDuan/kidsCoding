import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getCatalogLesson, getLessonContentStage, getUnitProject } from '@/features/curriculum/full-catalog-access'

export default async function CatalogLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const found = getCatalogLesson(lessonId)
  if (!found) notFound()
  const { lesson, unit, track } = found
  const capstone = getUnitProject(unit.id)
  const detailed = getLessonContentStage(lesson.id) === 'detailed'
  return (
    <main className="min-h-screen bg-[linear-gradient(150deg,#eaf7f0_0%,#f7faff_65%,#fff9ea_100%)] p-5 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href={`/learn/catalog?track=${track.id}`} className="text-sm font-bold text-emerald-800">← 返回{track.title}</Link>
        <section className="rounded-[2rem] bg-white p-7 shadow-sm md:p-10">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">{track.title} · {unit.title}</span>
          <h1 className="mt-5 text-3xl font-black md:text-4xl">{lesson.title}</h1>
          <p className="mt-4 text-base leading-8 text-slate-700">{lesson.learningOutcome}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {lesson.concepts.map((concept) => <span key={concept} className="rounded-full bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700">{concept}</span>)}
          </div>
          <div className="mt-7 rounded-[1.5rem] bg-amber-50 p-5">
            <p className="font-bold text-amber-900">课程制作状态：{detailed ? '详细教案已备' : '课程大纲已备'}</p>
            <p className="mt-2 text-sm leading-7 text-amber-900">当前仅供了解课程内容，执行引擎、角色素材及自动评测尚未完成验收，因此暂不开放直接闯关。</p>
          </div>
        </section>
        <section className="rounded-[2rem] bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black">这一课将学会什么？</h2>
          <p className="mt-4 text-base leading-8 text-slate-700">{lesson.focusConcept}：{lesson.learningOutcome}</p>
          <h3 className="mt-6 text-lg font-black">完成后能做出来的作品</h3>
          <p className="mt-2 text-slate-700">{lesson.projectArtifact}</p>
          <h3 className="mt-6 text-lg font-black">怎么判断真正学会了？</h3>
          <p className="mt-2 leading-8 text-slate-700">{lesson.evidence}</p>
          <h3 className="mt-6 text-lg font-black">本单元最终挑战</h3>
          <p className="mt-2 leading-8 text-slate-700">{capstone?.title ?? unit.title}</p>
        </section>
        {lesson.id === 'G3-U1-L02' ? (
          <section className="rounded-[2rem] border-2 border-indigo-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold text-indigo-700">Scratch VM 真实执行 · 只读实验入口</p>
            <h2 className="mt-2 text-xl font-black">运行原创流星分身 Scratch 项目</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">加载真正的 .sb3 文件，点击绿旗，在舞台上观察 Scratch VM 计算出的分身坐标变化。当前仍是实验关卡，不保存正式成绩。</p>
            <Link data-testid="scratch-trial-entry" href="/learn/scratch-lab/G3-U1-L02" className="mt-4 inline-flex rounded-full bg-indigo-700 px-6 py-3 font-bold text-white">体验 Scratch VM →</Link>
          </section>
        ) : null}
        {['P0-U1-L02','P0-U1-L03','P0-U1-L04','P0-U1-L05','P0-U1-L06'].includes(lesson.id) ? (
          <section className="rounded-[2rem] border-2 border-emerald-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold text-emerald-700">Python 真运行 · 多组自动评测 · 浏览器草稿</p>
            <h2 className="mt-2 text-xl font-black">编写函数，用多组真实数据与边界条件验证</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">真实运行函数并检查不同参数的结果，自动保存本机草稿和试验完成状态。正式课程仍未发布。</p>
            <Link href={`/learn/python-lab/${lesson.id}`} data-testid="python-multi-trial-entry" className="mt-4 inline-flex rounded-full bg-emerald-700 px-6 py-3 font-bold text-white">开始多用例练习 →</Link>
          </section>
        ) : null}
        {lesson.id === 'P0-U1-L01' ? (
          <section className="rounded-[2rem] border-2 border-emerald-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold text-emerald-700">独立实验关卡 · Python 真运行</p>
            <h2 className="mt-2 text-xl font-black">试试亲手运行第一段 Python 程序</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">提供可修改的代码、实际 Python 标准输出和本地自动反馈。该入口不是正式课程发布，也不会提交成绩。</p>
            <Link data-testid="python-trial-entry" href="/learn/python-lab/P0-U1-L01" className="mt-4 inline-flex rounded-full bg-emerald-700 px-6 py-3 font-bold text-white">进入 Python 实验室 →</Link>
          </section>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Link href="/learn/map" className="rounded-full bg-emerald-700 px-6 py-3 font-bold text-white">先去体验已有启蒙课程</Link>
          <Link href={`/learn/catalog?track=${track.id}`} className="rounded-full bg-white px-6 py-3 font-bold text-slate-700">浏览同路线课程</Link>
        </div>
      </div>
    </main>
  )
}
