'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const BlocklyWorkspace = dynamic(
  () => import('../blockly/blockly-workspace').then((m) => m.BlocklyWorkspace),
  { ssr: false },
)
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { readGuestProgress, writeGuestProgress } from '@/features/progress/local-progress'
import { buildHintState } from '../build-hint-state'
import { RemedialLinkCard } from '../remedial-link-card'
import { DuoStage } from './duo-stage'

const allowed = ['when_start', 'move_right', 'switch_character', 'say_line']
const required = ['when_start', 'move_right', 'switch_character', 'move_right']

export function DuoProject({ initialBlocks, lessonId = 'lesson-10-second-friend' }: { initialBlocks: Array<{ type: string }>; lessonId?: string }) {
  const router = useRouter()
  const [blocks, setBlocks] = useState(initialBlocks)
  const [passed, setPassed] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [message, setMessage] = useState('这是本机保存的积木作品。可以重新运行、修改，验证后再保存。')
  const onChange = useCallback((next: Array<{ type: string }>) => {
    setBlocks(next)
    setPassed(false)
    setMessage('代码已修改，请重新运行验证。')
  }, [])
  // TQ-019: a successful run clears the failure count, like finishing a classroom step.
  const onSuccess = useCallback(() => {
    setPassed(true)
    setFailedAttempts(0)
  }, [])
  const onClear = useCallback(() => setPassed(false), [])
  // TQ-019: the completion page has no classroom shell, so the project counts failed
  // runs itself and escalates the same hint layers the classroom uses (TQ-008/TQ-015).
  const onRunFailure = useCallback(() => {
    setFailedAttempts((count) => count + 1)
  }, [])
  const hintLayers = launchLessons.find((lesson) => lesson.id === lessonId)?.hintLayers ?? []
  const hintState = buildHintState({ failedAttempts, hintLayers })
  function handleStartRemedial(remedialId: string) {
    router.push(`/learn/remedial/${remedialId}?from=${lessonId}&step=step-3`)
  }
  function save() {
    try {
      const progress = readGuestProgress()
      writeGuestProgress({ ...progress, projectSnapshots: [
        ...progress.projectSnapshots.filter(snapshot => snapshot.lessonId !== lessonId),
        { lessonId, blocks, updatedAt: new Date().toISOString() },
      ] })
      setMessage('作品已保存到本机浏览器。重新打开这个页面可以运行和继续修改。')
    } catch {
      setMessage('本机存储失败，作品尚未保存。请检查浏览器存储空间后重试。')
    }
  }
  if (initialBlocks.length === 0) return <p>本机没有这节课的作品。请先回课堂完成真实练习。</p>
  return <div className="space-y-4" data-testid="duo-saved-project">
    <p role="status" data-testid="duo-save-status" className="text-sm leading-7 text-slate-700">{message}</p>
    <DuoStage graduation={lessonId === 'lesson-12-graduation-show'} dialogue={lessonId === 'lesson-11-duo-rehearsal'} blocks={blocks} requiredBlocks={required} stepIndex={4} onRunSuccess={onSuccess} onRunClear={onClear} onRunFailure={onRunFailure}/>
    {hintState.activeHint ? (
      <div className="kc-hint" data-hint-tier={hintState.tier} data-testid="duo-project-hint">卡住时提示：{hintState.activeHint.copy}</div>
    ) : null}
    {hintState.activeHint && hintState.showRemedialJump && hintState.activeHint.remedialLessonId ? (
      <RemedialLinkCard
        copy={hintState.activeHint.copy}
        onStartRemedial={handleStartRemedial}
        remedialLessonId={hintState.activeHint.remedialLessonId}
      />
    ) : null}
    <BlocklyWorkspace allowedBlocks={lessonId === 'lesson-12-graduation-show' ? [...allowed, 'repeat_twice'] : allowed} blocks={blocks} onSnapshotChange={onChange} enableProgramTools/>
    <button type="button" data-testid="duo-save-project" disabled={!passed} onClick={save}
      className="min-h-11 rounded-full bg-emerald-800 px-5 py-3 font-bold text-white disabled:opacity-50">保存改好的本机作品</button>
  </div>
}
