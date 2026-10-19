'use client'

import { useState } from 'react'

import type { RemedialPractice as RemedialPracticeData } from '@/features/domain/types'
import { getKidsBlockLabel } from '@/features/lessons/blockly/block-labels'
import { CharacterArt } from '@/features/lessons/playable-stage/character-art'

/** TQ-008: tiny hands-on practice on a remedial page. Nothing is graded or stored. */
export function RemedialPractice({ practice }: { practice: RemedialPracticeData }) {
  return practice.kind === 'order' ? <OrderPractice practice={practice} /> : <ClickPractice practice={practice} />
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
          className="mt-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
          onClick={() => { setPlaced([]); setNudge(null) }}
          type="button"
        >
          ↺ 再排一次
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
        <span className="kc-block-chip shrink-0" data-block="move_right">{getKidsBlockLabel('move_right')}</span>
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
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
            onClick={() => setState('idle')}
            type="button"
          >
            ↺ 再试一次
          </button>
        ) : null}
      </div>
    </div>
  )
}
