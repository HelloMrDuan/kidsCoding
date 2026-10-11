'use client'

import { useCallback, useState } from 'react'
import { BlocklyWorkspace } from '../blockly/blockly-workspace'
import { readGuestProgress, writeGuestProgress } from '@/features/progress/local-progress'
import { DuoStage } from './duo-stage'

const allowed = ['when_start', 'move_right', 'switch_character', 'say_line']
const required = ['when_start', 'move_right', 'switch_character', 'move_right']

export function DuoProject({ initialBlocks, lessonId = 'lesson-10-second-friend' }: { initialBlocks: Array<{ type: string }>; lessonId?: string }) {
  const [blocks, setBlocks] = useState(initialBlocks)
  const [passed, setPassed] = useState(false)
  const [message, setMessage] = useState('这是本机保存的积木作品。可以重新运行、修改，验证后再保存。')
  const onChange = useCallback((next: Array<{ type: string }>) => {
    setBlocks(next)
    setPassed(false)
    setMessage('代码已修改，请重新运行验证。')
  }, [])
  const onSuccess = useCallback(() => setPassed(true), [])
  const onClear = useCallback(() => setPassed(false), [])
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
    <DuoStage graduation={lessonId === 'lesson-12-graduation-show'} dialogue={lessonId === 'lesson-11-duo-rehearsal'} blocks={blocks} requiredBlocks={required} stepIndex={4} onRunSuccess={onSuccess} onRunClear={onClear}/>
    <BlocklyWorkspace allowedBlocks={lessonId === 'lesson-12-graduation-show' ? [...allowed, 'repeat_twice'] : allowed} blocks={blocks} onSnapshotChange={onChange} enableProgramTools/>
    <button type="button" data-testid="duo-save-project" disabled={!passed} onClick={save}
      className="min-h-11 rounded-full bg-emerald-800 px-5 py-3 font-bold text-white disabled:opacity-50">保存改好的本机作品</button>
  </div>
}
