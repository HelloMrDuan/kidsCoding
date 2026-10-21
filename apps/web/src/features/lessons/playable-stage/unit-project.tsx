'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import { evaluateUnitProject, getUnitProject, getUnitProjectStartBlocks } from '@/content/curriculum/unit-projects'
import { readGuestProgress, writeGuestProgress } from '@/features/progress/local-progress'
import type { SnapshotBlock } from '@/features/progress/project-snapshot'

import { motionVerbForTemplate } from '../blockly/block-labels'
import { BlocklyWorkspace } from '../blockly/blockly-workspace'
import type { ProgramBlock } from '../blockly/observable-run'
import { PlayableStage } from './playable-stage'

type Pane = 'stage' | 'code'

const PANES: Array<{ id: Pane; label: string }> = [
  { id: 'stage', label: '舞台' },
  { id: 'code', label: '积木' },
]

const READY = '这是你做好的作品。可以再运行一次，也可以改一改，运行成功后再保存。'
const EDITED = '积木改过啦，先运行一次，成功了就能保存。'
const SAVED = '作品已保存到本机浏览器。下次打开这个页面，还能接着运行和修改。'
const SAVE_FAILED = '作品尚未保存：本机存储空间不够或被浏览器禁止了。请清理浏览器存储空间后再点保存。'

/** Saved shape: type + chosen preset line only (no editor-only flags). */
function toSnapshot(blocks: ProgramBlock[]): SnapshotBlock[] {
  return blocks.map((block) => (block.line ? { type: block.type, line: block.line } : { type: block.type }))
}

/**
 * The editor gives every say block a dropdown value (the chosen line, else the first choice),
 * so the opening program is normalised the same way and opening the page is not an “edit”.
 */
function startBlocks(lessonId: string, initialBlocks: unknown): ProgramBlock[] {
  const choices = getUnitProject(lessonId)?.sayLineChoices
  return getUnitProjectStartBlocks(lessonId, initialBlocks).map((block) => {
    if (block.type !== 'say_line' || !choices || choices.length === 0) return { type: block.type }
    return { type: block.type, line: choices.some((choice) => choice.id === block.line) ? block.line : choices[0].id }
  })
}

/**
 * TQ-012 (= TQ-002f): the playable unit project on the completion page of lessons 01–09.
 * Opens the child's saved program (or the main build), runs it on the real stage with the unit
 * judge (several programs may be right), and saves edits to kc-progress only after a passing
 * run since the last edit. Modelled on DuoProject (lessons 10–12).
 */
export function UnitProject({ lessonId, initialBlocks }: { lessonId: string; initialBlocks?: unknown }) {
  const project = getUnitProject(lessonId)
  const template = useMemo(() => {
    const lesson = launchLessons.find((item) => item.id === lessonId)
    return launchTemplates.find((item) => item.id === lesson?.templateId)
  }, [lessonId])
  const [blocks, setBlocks] = useState<ProgramBlock[]>(() => startBlocks(lessonId, initialBlocks))
  const blocksKeyRef = useRef(JSON.stringify(blocks))
  const [passed, setPassed] = useState(false)
  const [message, setMessage] = useState(READY)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')
  const [pane, setPane] = useState<Pane>('stage')

  const judge = useCallback((program: ProgramBlock[]) => evaluateUnitProject(lessonId, program), [lessonId])
  // Any real edit (blocks, order or chosen line) needs a new passing run before saving.
  const onChange = useCallback((next: ProgramBlock[]) => {
    const key = JSON.stringify(next)
    if (key === blocksKeyRef.current) return
    blocksKeyRef.current = key
    setBlocks(next)
    setPassed(false)
    setSaveState('idle')
    setMessage(EDITED)
  }, [])
  const onSuccess = useCallback(() => {
    setPassed(true)
    setMessage('运行成功！现在可以保存这个作品啦。')
  }, [])
  const onClear = useCallback(() => setPassed(false), [])

  if (!project) return null

  function save() {
    if (!passed) return
    try {
      const progress = readGuestProgress()
      writeGuestProgress({
        ...progress,
        projectSnapshots: [
          ...progress.projectSnapshots.filter((snapshot) => snapshot.lessonId !== lessonId),
          { lessonId, blocks: toSnapshot(blocks), updatedAt: new Date().toISOString() },
        ],
      })
      setSaveState('saved')
      setMessage(SAVED)
    } catch {
      setSaveState('error')
      setMessage(SAVE_FAILED)
    }
  }

  const visible = (id: Pane) => (pane === id ? 'kc-mobile-visible' : '')

  return (
    <div className="kc-unit-project" data-testid="unit-project" data-lesson-id={lessonId} data-passed={String(passed)}>
      <div className="kc-unit-brief">
        <span className="kc-task-mark">我的单元作品</span>
        <h2>{project.title}</h2>
        <p>{project.prompt}</p>
        {project.choiceHint ? (
          <p className="kc-unit-choice">
            <span className="kc-chip kc-chip-info" data-testid="unit-choice-chip">两种做法都可以</span>
            <span>{project.choiceHint}</span>
          </p>
        ) : null}
      </div>

      <div aria-label="作品分区" className="kc-unit-tabs" data-testid="unit-mobile-tabs" role="tablist">
        {PANES.map((tab) => (
          <button
            key={tab.id}
            aria-controls={`unit-pane-${tab.id}`}
            aria-selected={pane === tab.id}
            data-testid={`unit-mobile-tab-${tab.id}`}
            onClick={() => setPane(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="kc-unit-grid">
        <section className={`kc-lesson-col kc-unit-pane ${visible('stage')}`} id="unit-pane-stage" role="tabpanel" aria-label="舞台">
          <PlayableStage
            askClickPrediction={false}
            blocks={blocks}
            judge={judge}
            onRunClear={onClear}
            onRunSuccess={onSuccess}
            requiredBlocks={[...project.starterProgram]}
            stepIndex={0}
            successMessage="🎉 运行成功！可以保存这个作品啦。"
            template={template}
          />
        </section>
        <section className={`kc-lesson-col kc-unit-pane ${visible('code')}`} id="unit-pane-code" role="tabpanel" aria-label="积木">
          <div className="p-3">
            <BlocklyWorkspace
              allowedBlocks={[...project.allowedBlocks]}
              blocks={blocks}
              enableProgramTools
              motionVerb={motionVerbForTemplate(template?.id)}
              onSnapshotChange={onChange}
              sayLineChoices={project.sayLineChoices}
            />
          </div>
        </section>
      </div>

      <div className="kc-unit-save">
        <p
          className={saveState === 'error' ? 'kc-unit-status kc-unit-status-error' : 'kc-unit-status'}
          data-save-state={saveState}
          data-testid="unit-save-status"
          role="status"
        >
          {message}
        </p>
        <button
          className="kc-action-surface disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="unit-save-project"
          disabled={!passed}
          onClick={save}
          type="button"
        >
          保存我的作品
        </button>
      </div>
    </div>
  )
}
