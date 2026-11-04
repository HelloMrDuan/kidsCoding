/**
 * Demo workspace route — serves ONLY the demo contracts from
 * `features/lessons/workspace/demo-contracts.ts`, otherwise notFound().
 *
 * This page is a client component on purpose: engine adapter instances are
 * class instances and cannot cross the server→client boundary, so the adapter
 * is constructed here (stable per engine via a ref) and passed to the shell.
 * Lesson switching uses plain links between the demo lessons; the shell's
 * save-then-load switching runs on contract change and on unmount.
 *
 * TEST HOOK (demo route only): `?demoFailSave=1` makes 保存 report failure
 * without writing, so the E2E save-failure case can prove fail-closed
 * behavior. It is never part of the real save path.
 */

'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { use, useMemo } from 'react'

import { BlocklyAdapter } from '@/features/lessons/workspace/blockly-adapter'
import { getDemoContract } from '@/features/lessons/workspace/demo-contracts'
import { DemoSummaryEditor } from '@/features/lessons/workspace/demo-summary-editor'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'
import { ScratchVMAdapter } from '@/features/lessons/workspace/scratch-adapter'
import type { EngineAdapter } from '@/features/lessons/workspace/workspace-adapters'

const DEMO_LINKS = [
  { lessonId: 'demo-a', label: '演示 A：接住掉落水果' },
  { lessonId: 'demo-b', label: '演示 B：送篮子到果园' },
  { lessonId: 'demo-scratch', label: '演示 C：Scratch 沙箱' },
  { lessonId: 'demo-s', label: '演示 S：写一段学习总结' },
]

export default function WorkspaceDemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>
  searchParams?: Promise<{ demoFailSave?: string | string[] }>
}) {
  const { lessonId } = use(params)
  const sp = searchParams ? use(searchParams) : {}
  const demo = getDemoContract(lessonId)
  if (!demo) notFound()

  const engine = demo.contract.engine
  // Stable per engine; the shell additionally stabilizes the mounted adapter
  // by engine kind, so a fresh instance on re-render never remounts it.
  const adapter: EngineAdapter = useMemo(() => {
    if (engine === 'blockly') {
      return new BlocklyAdapter({ stageTarget: demo.contract.judging.target })
    }
    if (engine === 'scratch-vm') {
      return new ScratchVMAdapter()
    }
    // Summary engine: no editor adapter exists yet (4 号接入中). The shell
    // renders the honest summary note and never mounts this.
    return new BlocklyAdapter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, demo.contract.judging.target?.fruitX, demo.contract.judging.target?.threshold])

  const testFailSave = sp.demoFailSave === '1'

  return (
    <main className="min-h-screen bg-[var(--kc-canvas)]">
      <section className="kc-page-main">
        <nav aria-label="演示课程切换" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {DEMO_LINKS.map((link) => (
            <Link
              key={link.lessonId}
              className="kc-action-surface kc-btn-outline kc-btn-sm"
              href={`/learn/workspace/${link.lessonId}`}
              aria-current={link.lessonId === lessonId ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <LessonWorkspace
          contract={demo.contract}
          adapter={adapter}
          initialScript={demo.initialScript}
          testFailSave={testFailSave}
          editorSlot={lessonId === 'demo-s' ? DemoSummaryEditor : undefined}
        />
      </section>
    </main>
  )
}
