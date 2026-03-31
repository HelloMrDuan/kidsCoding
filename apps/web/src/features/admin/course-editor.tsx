'use client'

import { startTransition, useState } from 'react'

import { saveLaunchCurriculum } from './save-launch-curriculum'
import { AudioAssetEditor } from './audio-asset-editor'

type CourseEditorProps = {
  curriculum: {
    lessons: Array<{
      id: string
      title: string
      goal: string
      phase: 'trial' | 'course'
      steps: Array<{ title: string; instruction: string }>
      hintLayers: Array<{ id: string }>
    }>
    audioAssets: Array<{
      id: string
      lessonId: string
      usageType: string
      provider: string
    }>
  }
}

export function CourseEditor({ curriculum }: CourseEditorProps) {
  const [publishState, setPublishState] = useState<{
    status: 'idle' | 'checking'
    issues: Array<{ code: string; lessonId: string; value: string }>
  }>({
    status: 'idle',
    issues: [],
  })

  function handlePublishCheck() {
    setPublishState({
      status: 'checking',
      issues: [],
    })

    startTransition(async () => {
      const result = await saveLaunchCurriculum({
        lessons: curriculum.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          steps: lesson.steps.map((step) => ({
            title: step.title,
            instruction: step.instruction,
          })),
        })),
      })

      setPublishState({
        status: 'idle',
        issues: result.issues,
      })
    })
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-500">
              课程内容
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              试听与正式课程
            </h2>
          </div>
          <button
            className="rounded-full bg-amber-500 px-5 py-3 font-bold text-white"
            onClick={handlePublishCheck}
            type="button"
          >
            {publishState.status === 'checking' ? '正在校验发布内容' : '发布前校验'}
          </button>
        </div>
        {publishState.issues.length > 0 ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            发现 {publishState.issues.length} 条异常内容，请先修复再发布。
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            当前课程内容通过基础字符校验，可以进入发布流程。
          </div>
        )}
        <div className="grid gap-3">
          {curriculum.lessons.map((lesson) => (
            <article
              key={lesson.id}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {lesson.id}
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    {lesson.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {lesson.goal}
                  </p>
                </div>
                <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                  {lesson.phase === 'trial' ? '试听课' : '正式课'} · {lesson.steps.length}{' '}
                  步 · {lesson.hintLayers.length} 层提示
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <AudioAssetEditor audioAssets={curriculum.audioAssets} />
    </div>
  )
}
