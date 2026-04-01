'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import type {
  CourseContentValidationIssue,
  EditableLaunchLesson,
} from '@/features/domain/types'

import {
  generateCurriculumSkeleton,
  generateLessonDraft,
  publishLesson,
  rollbackLesson,
  saveLessonDraft,
} from './admin-api'

function formatTime(value: string | null | undefined) {
  if (!value) {
    return '未保存'
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
  })
}

type LessonEditorProps = {
  lesson: EditableLaunchLesson
  draftUpdatedAt: string | null
  publishedAt: string | null
  hasUnpublishedChanges: boolean
  saveDraftRequest?: (
    lessonId: string,
    lesson: EditableLaunchLesson,
  ) => Promise<{ ok: boolean; issues: CourseContentValidationIssue[] }>
  publishRequest?: (
    lessonId: string,
  ) => Promise<{ ok: boolean; issues: CourseContentValidationIssue[] }>
  rollbackRequest?: (lessonId: string) => Promise<{ ok: boolean }>
  generateSkeletonRequest?: () => Promise<{
    ok: boolean
    skeletonCount?: number
    error?: string
  }>
  generateDraftRequest?: (lessonId: string) => Promise<{
    ok: boolean
    lesson?: EditableLaunchLesson
    issues: CourseContentValidationIssue[]
    error?: string
  }>
}

export function LessonEditor({
  lesson,
  draftUpdatedAt,
  publishedAt,
  hasUnpublishedChanges,
  saveDraftRequest = saveLessonDraft,
  publishRequest = publishLesson,
  rollbackRequest = rollbackLesson,
  generateSkeletonRequest = generateCurriculumSkeleton,
  generateDraftRequest = generateLessonDraft,
}: LessonEditorProps) {
  const router = useRouter()
  const [formLesson, setFormLesson] = useState(lesson)
  const [pendingAction, setPendingAction] = useState<
    | 'idle'
    | 'save'
    | 'publish'
    | 'rollback'
    | 'generateSkeleton'
    | 'generateDraft'
  >('idle')
  const [issues, setIssues] = useState<CourseContentValidationIssue[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setFormLesson(lesson)
  }, [lesson])

  function updateStep(
    stepId: string,
    field: 'title' | 'instruction',
    value: string,
  ) {
    setFormLesson((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.id === stepId ? { ...step, [field]: value } : step,
      ),
    }))
  }

  async function handleSaveDraft() {
    setPendingAction('save')
    setIssues([])
    setMessage(null)

    const result = await saveDraftRequest(formLesson.id, formLesson)

    setPendingAction('idle')
    setIssues(result.issues)

    if (result.ok) {
      setMessage('草稿已保存')
      router.refresh()
      return
    }

    setMessage('草稿保存失败，请先修复内容问题')
  }

  async function handlePublish() {
    setPendingAction('publish')
    setIssues([])
    setMessage(null)

    const result = await publishRequest(formLesson.id)

    setPendingAction('idle')
    setIssues(result.issues)

    if (result.ok) {
      setMessage('本课已发布')
      router.refresh()
      return
    }

    setMessage('发布失败，请先修复校验问题')
  }

  async function handleRollback() {
    setPendingAction('rollback')
    setIssues([])
    setMessage(null)

    const result = await rollbackRequest(formLesson.id)

    setPendingAction('idle')

    if (result.ok) {
      setMessage('已回退到上一发布版')
      router.refresh()
      return
    }

    setMessage('回退失败，请稍后重试')
  }

  async function handleGenerateSkeleton() {
    setPendingAction('generateSkeleton')
    setIssues([])
    setMessage(null)

    const result = await generateSkeletonRequest()

    setPendingAction('idle')

    if (result.ok) {
      setMessage('整套课程骨架已生成')
      return
    }

    setMessage(result.error ?? '课程骨架生成失败，请稍后重试')
  }

  async function handleGenerateDraft() {
    setPendingAction('generateDraft')
    setIssues([])
    setMessage(null)

    const result = await generateDraftRequest(formLesson.id)

    setPendingAction('idle')
    setIssues(result.issues)

    if (result.ok && result.lesson) {
      setFormLesson(result.lesson)
      setMessage('AI 草稿已生成，请审核后再发布')
      return
    }

    setMessage(result.error ?? 'AI 草稿生成失败，请先检查课程骨架')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
              课程编辑
            </p>
            <h1 className="text-3xl font-black text-slate-950">{formLesson.title}</h1>
            <p className="text-sm font-semibold text-slate-600">
              {formLesson.phase === 'trial' ? '试听课' : '正式课'} · {formLesson.id}
            </p>
          </div>
          <div className="space-y-2 rounded-[1.5rem] bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            <p>{hasUnpublishedChanges ? '当前有未发布改动' : '当前草稿与线上一致'}</p>
            <p>草稿更新：{formatTime(draftUpdatedAt)}</p>
            <p>线上发布：{formatTime(publishedAt)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="grid gap-6">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">课程标题</span>
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-900"
              aria-label="课程标题"
              data-testid="admin-lesson-title"
              value={formLesson.title}
              onChange={(event) =>
                setFormLesson((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">课程目标</span>
            <textarea
              className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-900"
              aria-label="课程目标"
              data-testid="admin-lesson-goal"
              value={formLesson.goal}
              onChange={(event) =>
                setFormLesson((current) => ({
                  ...current,
                  goal: event.target.value,
                }))
              }
            />
          </label>

          <div className="space-y-4">
            {formLesson.steps.map((step, index) => (
              <article
                key={step.id}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
              >
                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700">
                      步骤 {index + 1} 标题
                    </span>
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900"
                      aria-label={`步骤 ${index + 1} 标题`}
                      data-testid={`admin-step-title-${step.id}`}
                      value={step.title}
                      onChange={(event) =>
                        updateStep(step.id, 'title', event.target.value)
                      }
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700">
                      步骤 {index + 1} 说明
                    </span>
                    <textarea
                      className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900"
                      aria-label={`步骤 ${index + 1} 说明`}
                      data-testid={`admin-step-instruction-${step.id}`}
                      value={step.instruction}
                      onChange={(event) =>
                        updateStep(step.id, 'instruction', event.target.value)
                      }
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            className="rounded-full border border-sky-300 px-5 py-3 font-bold text-sky-700 disabled:cursor-not-allowed disabled:text-sky-300"
            data-testid="admin-generate-skeleton"
            disabled={pendingAction !== 'idle'}
            onClick={handleGenerateSkeleton}
          >
            {pendingAction === 'generateSkeleton'
              ? '正在生成整套课程骨架'
              : '生成整套课程骨架'}
          </button>
          <button
            type="button"
            className="rounded-full border border-emerald-300 px-5 py-3 font-bold text-emerald-700 disabled:cursor-not-allowed disabled:text-emerald-300"
            data-testid="admin-generate-draft"
            disabled={pendingAction !== 'idle'}
            onClick={handleGenerateDraft}
          >
            {pendingAction === 'generateDraft'
              ? '正在生成本课草稿'
              : '生成本课草稿'}
          </button>
        </div>
        <p className="mb-4 text-sm font-semibold text-slate-600">
          AI 只会覆盖标题、目标、步骤说明、提示文案和家长建议，不会改动积木结构字段。
        </p>
        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            className="rounded-full bg-amber-500 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-amber-300"
            data-testid="admin-save-draft"
            disabled={pendingAction !== 'idle'}
            onClick={handleSaveDraft}
          >
            {pendingAction === 'save' ? '正在保存草稿' : '保存草稿'}
          </button>
          <button
            type="button"
            className="rounded-full bg-slate-900 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            data-testid="admin-publish-lesson"
            disabled={pendingAction !== 'idle'}
            onClick={handlePublish}
          >
            {pendingAction === 'publish' ? '正在发布本课' : '发布本课'}
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-300 px-5 py-3 font-bold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
            data-testid="admin-rollback-lesson"
            disabled={pendingAction !== 'idle'}
            onClick={handleRollback}
          >
            {pendingAction === 'rollback' ? '正在回退上一发布版' : '回退上一发布版'}
          </button>
        </div>

        {message ? (
          <p className="mt-4 text-sm font-semibold text-slate-700">{message}</p>
        ) : null}

        {issues.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm font-semibold text-rose-700">
            {issues.map((issue) => (
              <li key={`${issue.code}-${issue.lessonId}-${issue.value}`}>
                {issue.code}：{issue.value}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
