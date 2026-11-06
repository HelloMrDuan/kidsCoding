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
import { createDemoStage, DemoRoles } from '@/features/lessons/workspace/demo-stage'
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
  // Stable per lesson: adapter instances carry per-lesson state (the
  // Blockly stageTarget, the Scratch lastState), so two lessons must
  // never share one instance even when engine + target match (compat
  // defects 2b/4a: a shared Scratch adapter's poller writes the old
  // lesson's state into the new one, and a shared Blockly adapter
  // judges the new lesson by the old lesson's target). A new instance
  // (a different lesson) makes the shell unmount the old adapter and
  // mount the new one (OPS-023), while the same instance on re-render
  // never remounts.
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
  }, [lessonId, engine, demo.contract.judging.target?.fruitX, demo.contract.judging.target?.threshold])

  const testFailSave = sp.demoFailSave === '1'

  // Demo stage + roles reach the shell only through slots now: the shell
  // itself renders no demo character, backdrop, or target. Scratch and
  // summary demos supply no stage/roles slot (scratch renders its own
  // mount; summary is stageless). The stage component is memoized on
  // fruitX so re-renders never remount the scene.
  const isBlocklyDemo = engine === 'blockly' && demo.contract.judging.target !== undefined
  const fruitX = demo.contract.judging.target?.fruitX ?? 200
  const demoStageSlot = useMemo(
    () => (isBlocklyDemo ? createDemoStage(fruitX) : undefined),
    [isBlocklyDemo, fruitX],
  )

  return (
    <main className="min-h-screen bg-[var(--kc-canvas)]">
      {/* Round 4: the test-only demo nav is hidden on phones (it stays in
          the DOM and stays usable on desktop, where the E2E
          lesson-switch cases run). It costs a full row above the editor
          on a 375px first screen and is not product UI.
          Gate 1: also hidden on tablets (<= 1023px), where it costs
          24px of first-screen height above the canvas. Tablet demo
          switching still works by direct URL; no E2E case opens the
          nav below 1440px. */}
      <style>{`@media (max-width: 1023px) { [data-testid="ws-demo-nav"] { display: none; } }`}</style>
      <section className="kc-page-main">
        {/* Round 3 §3.2: the demo switch lives in a collapsed <details>
            test nav — one compact line, closed by default, never a
            multi-row strip above the formal workspace. E2E navigates by
            direct URL and opens this only for the lesson-switch case. */}
        <details
          data-testid="ws-demo-nav"
          style={{ marginBottom: 4, fontSize: 13, color: '#6f7d92' }}
        >
          <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
            测试导航（仅测试用）
          </summary>
          <nav
            aria-label="演示课程切换"
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline', marginTop: 4 }}
          >
            {DEMO_LINKS.map((link) => (
              <Link
                key={link.lessonId}
                href={`/learn/workspace/${link.lessonId}`}
                aria-current={link.lessonId === lessonId ? 'page' : undefined}
                style={{ color: link.lessonId === lessonId ? '#18243a' : '#2463eb', fontWeight: link.lessonId === lessonId ? 700 : 400 }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </details>
        <LessonWorkspace
          contract={demo.contract}
          adapter={adapter}
          initialScript={demo.initialScript}
          testFailSave={testFailSave}
          editorSlot={lessonId === 'demo-s' ? DemoSummaryEditor : undefined}
          stageSlot={demoStageSlot}
          rolesSlot={isBlocklyDemo ? DemoRoles : undefined}
        />
      </section>
    </main>
  )
}
