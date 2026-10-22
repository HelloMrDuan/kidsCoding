'use client'

import { useState } from 'react'

import type { RemedialPractice as RemedialPracticeData } from '@/features/domain/types'
import { getKidsBlockLabel } from '@/features/lessons/blockly/block-labels'
import { CharacterArt } from '@/features/lessons/playable-stage/character-art'
import { ResetIcon } from '@/features/ui/reset-icon'

/** TQ-008: tiny hands-on practice on a remedial page. Nothing is graded or stored. */
export function RemedialPractice({ practice }: { practice: RemedialPracticeData }) {
  if (practice.kind === 'order') return <OrderPractice practice={practice} />
  if (practice.kind === 'switch') return <SwitchPractice practice={practice} />
  return <ClickPractice practice={practice} />
}

function OrderPractice({ practice }: { practice: Extract<RemedialPracticeData, { kind: 'order' }> }) {
  const [placed, setPlaced] = useState<number[]>([])
  const [nudge, setNudge] = useState<string | null>(null)
  const done = placed.length === practice.cards.length

  function pick(index: number) {
    if (done || placed.includes(index)) return
    if (index === placed.length) {
      setPlaced([...placed, index])
      setNudge(null)
    } else {
      setNudge(`“${practice.cards[index].label}”要晚一点哦，先找找第 ${placed.length + 1} 块是谁？`)
    }
  }

  return (
    <div className="rounded-[1.5rem] bg-sky-50 p-5" data-testid="remedial-practice">
      <p className="text-base font-bold text-slate-900">{practice.prompt}</p>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="可以点的积木">
        {practice.displayOrder.map((index) => (
          <button
            className="kc-block-chip"
            data-block={practice.cards[index].type}
            data-testid={`remedial-card-${practice.cards[index].type}`}
            disabled={placed.includes(index) || done}
            key={practice.cards[index].type}
            onClick={() => pick(index)}
            type="button"
          >
            {practice.cards[index].label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">我的程序：</p>
      <ol className="mt-2 flex min-h-[44px] flex-wrap items-center gap-2" data-testid="remedial-program">
        {placed.map((index, order) => (
          <li className="flex items-center gap-2" key={practice.cards[index].type}>
            {order > 0 ? <span aria-hidden="true" className="font-black text-slate-400">→</span> : null}
            <span className="kc-block-chip" data-block={practice.cards[index].type}>{practice.cards[index].label}</span>
          </li>
        ))}
      </ol>
      <div aria-live="polite">
        {nudge ? <p className="mt-3 text-sm font-semibold text-amber-800" data-testid="remedial-nudge">{nudge}</p> : null}
        {done ? <p className="mt-3 text-base font-bold text-emerald-700" data-testid="remedial-success">🎉 {practice.success}</p> : null}
      </div>
      {placed.length > 0 ? (
        <button
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
          onClick={() => { setPlaced([]); setNudge(null) }}
          type="button"
        >
          <ResetIcon size={14} />
          再排一次
        </button>
      ) : null}
    </div>
  )
}

function ClickPractice({ practice }: { practice: Extract<RemedialPracticeData, { kind: 'click' }> }) {
  const [state, setState] = useState<'idle' | 'armed' | 'flown'>('idle')

  return (
    <div className="rounded-[1.5rem] bg-emerald-50 p-5" data-testid="remedial-practice">
      <p className="text-base font-bold text-slate-900">{practice.prompt}</p>
      <div className="mt-3 flex items-center gap-3 overflow-hidden rounded-[1.25rem] bg-white px-4 py-3">
        <span className="kc-block-chip shrink-0" data-block="when_clicked">{getKidsBlockLabel('when_clicked')}</span>
        <span aria-hidden="true" className="font-black text-slate-400">→</span>
        <span className="kc-block-chip shrink-0" data-block="move_right">{getKidsBlockLabel('move_right', 'fly')}</span>
      </div>
      <div className="mt-3 h-[120px] overflow-hidden rounded-[1.25rem] bg-gradient-to-b from-sky-100 to-emerald-100 p-2">
        <button
          aria-label="点击蝴蝶"
          className="h-[100px] w-[100px] transition-transform duration-500 disabled:cursor-default"
          data-testid="remedial-butterfly"
          disabled={state !== 'armed'}
          onClick={() => setState('flown')}
          style={{ transform: state === 'flown' ? 'translateX(min(160px, 40vw))' : 'none' }}
          type="button"
        >
          <CharacterArt className="h-full w-full" id="butterfly" />
        </button>
      </div>
      <div aria-live="polite">
        {state === 'armed' ? (
          <p className="mt-3 text-sm font-semibold text-amber-800" data-testid="remedial-nudge">
            程序准备好了，可蝴蝶没有自己飞哦。现在点一下蝴蝶！
          </p>
        ) : null}
        {state === 'flown' ? <p className="mt-3 text-base font-bold text-emerald-700" data-testid="remedial-success">🎉 {practice.success}</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          data-testid="remedial-arm"
          disabled={state !== 'idle'}
          onClick={() => setState('armed')}
          type="button"
        >
          ▶ 启动
        </button>
        {state === 'flown' ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
            onClick={() => setState('idle')}
            type="button"
          >
            <ResetIcon size={14} />
            再试一次
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** TQ-015: feel the switch — a move only ever goes to the friend you are operating now. */
function SwitchPractice({ practice }: { practice: Extract<RemedialPracticeData, { kind: 'switch' }> }) {
  const [actor, setActor] = useState<'fox' | 'bear'>('fox')
  const [foxSteps, setFoxSteps] = useState(0)
  const [bearSteps, setBearSteps] = useState(0)
  const [nudge, setNudge] = useState<string | null>(null)
  const done = foxSteps === 100 && bearSteps === 100

  function move() {
    if (done) return
    if (actor === 'fox') {
      if (foxSteps >= 100) {
        setNudge('小狐狸已经到 100 步啦，先点“切换到另一位朋友”，再让小熊走。')
        return
      }
      setFoxSteps(100)
      setNudge(null)
    } else {
      if (bearSteps >= 100) return
      setBearSteps(100)
      setNudge(null)
    }
  }

  function switchActor() {
    if (done) return
    if (actor === 'bear') {
      setNudge('已经切换过啦，现在让小熊走吧。')
      return
    }
    if (foxSteps < 100) {
      setNudge('先让小狐狸走 100 步，再切换哦。')
      return
    }
    setActor('bear')
    setNudge(null)
  }

  function reset() {
    setActor('fox')
    setFoxSteps(0)
    setBearSteps(0)
    setNudge(null)
  }

  const lanes = [
    { id: 'fox' as const, label: '小狐狸', steps: foxSteps, active: actor === 'fox' },
    { id: 'bear' as const, label: '小熊', steps: bearSteps, active: actor === 'bear' },
  ]

  return (
    <div className="rounded-[1.5rem] bg-orange-50 p-5" data-testid="remedial-practice">
      <p className="text-base font-bold text-slate-900">{practice.prompt}</p>
      <p className="mt-3 text-sm font-semibold text-slate-600" data-testid="remedial-active-actor">
        当前操作：<strong className="text-slate-900">{actor === 'fox' ? '小狐狸' : '小熊'}</strong>
      </p>
      <div className="mt-3 space-y-3 rounded-[1.25rem] bg-white px-4 py-3">
        {lanes.map((lane) => (
          <div className="flex items-center gap-3" key={lane.id}>
            <span className="w-14 shrink-0 text-sm font-bold text-slate-700">{lane.label}</span>
            <span className="relative block h-[52px] w-[128px] shrink-0">
              <span
                className={`absolute left-0 top-0 h-[52px] w-[52px] transition-transform duration-500 ${lane.active && !done ? 'rounded-full ring-2 ring-emerald-500' : ''}`}
                style={{ transform: lane.steps > 0 ? 'translateX(72px)' : 'none' }}
              >
                <CharacterArt className="h-full w-full" id={lane.id} />
              </span>
            </span>
            <span className="text-sm font-semibold text-slate-500" data-testid={`remedial-${lane.id}-steps`}>已走 {lane.steps} 步</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="可以点的积木">
        <button
          className="kc-block-chip"
          data-block="move_right"
          data-testid="remedial-card-move_right"
          disabled={done}
          onClick={move}
          type="button"
        >
          {getKidsBlockLabel('move_right')}
        </button>
        <button
          className="kc-block-chip"
          data-block="switch_character"
          data-testid="remedial-card-switch_character"
          disabled={done}
          onClick={switchActor}
          type="button"
        >
          {getKidsBlockLabel('switch_character')}
        </button>
      </div>
      <div aria-live="polite">
        {nudge ? <p className="mt-3 text-sm font-semibold text-amber-800" data-testid="remedial-nudge">{nudge}</p> : null}
        {done ? <p className="mt-3 text-base font-bold text-emerald-700" data-testid="remedial-success">🎉 {practice.success}</p> : null}
      </div>
      {foxSteps > 0 || bearSteps > 0 ? (
        <button
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
          onClick={reset}
          type="button"
        >
          <ResetIcon size={14} />
          再试一次
        </button>
      ) : null}
    </div>
  )
}
