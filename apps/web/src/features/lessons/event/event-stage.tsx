'use client'

import { useEffect, useState } from 'react'

import { CharacterArt } from '@/features/lessons/playable-stage/character-art'
import { stageStateAfter, type EventActorId, type EventEffect, type EventLevel } from './event-engine'

/** G0-U2 story scenery: a morning glade with a rising sun (original art, V2 flat style). */
export function MorningGlade() {
  return (
    <g data-grid-item="morning-glade">
      <rect x="0" y="0" width="100" height="60" rx="4" fill="#dff3ff" />
      <circle cx="84" cy="12" r="7" fill="#ffd23f" />
      <g stroke="#ffd23f" strokeWidth="1.2" strokeLinecap="round">
        <path d="M84 1.5v2.5M84 20v2.5M73.5 12H76M92 12h2.5M76.6 4.6l1.7 1.7M89.7 17.7l1.7 1.7M76.6 19.4l1.7-1.7M89.7 6.3l1.7-1.7" />
      </g>
      <path d="M0 40 Q20 30 40 38 T80 34 T100 38 V60 H0 Z" fill="#9fdc7c" />
      <path d="M0 48 Q25 42 50 47 T100 46 V60 H0 Z" fill="#7cc35b" />
      <g fill="#4fae55" stroke="#2f7d3a" strokeWidth=".6">
        <circle cx="8" cy="30" r="6" />
        <circle cx="16" cy="28" r="5" />
      </g>
      <rect x="10.5" y="32" width="2.2" height="9" fill="#9b6a3c" />
    </g>
  )
}

export type EventStageProps = {
  level: EventLevel
  effects: EventEffect[]
  /** Free play: tapping a character clicks it. */
  onActorClick?: (id: EventActorId) => void
  label?: string
}

/** Draws the characters and what has happened to them so far; characters are tappable. */
export function EventStage({ level, effects, onActorClick, label }: EventStageProps) {
  const state = stageStateAfter(level, effects)
  return (
    <div className="relative w-full" data-testid="event-stage" aria-label={label ?? '林间空地舞台'}>
      <svg viewBox="0 0 100 60" className="block w-full rounded-[14px]" role="img" aria-label={label ?? '林间空地舞台'}>
        <MorningGlade />
      </svg>
      {level.actors.map(actor => {
        const s = state[actor.id]
        const name = actor.name
        return (
          <button
            key={actor.id}
            type="button"
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-sky-400"
            style={{ left: `${actor.x}%`, top: `${actor.y}%`, width: '18%', opacity: s.onstage ? 1 : 0.25 }}
            data-testid={`event-actor-${actor.id}`}
            data-awake={s.awake ? 'true' : 'false'}
            data-said={s.said ? 'true' : 'false'}
            data-surprised={s.surprised ? 'true' : 'false'}
            aria-label={`${name}：${s.awake ? '醒着' : '睡着'}${s.said ? '，说了早上好' : ''}${onActorClick ? '。点一下它' : ''}`}
            onClick={() => onActorClick?.(actor.id)}
          >
            <svg viewBox="0 0 100 110" className="block w-full" aria-hidden="true">
              <g style={{ filter: s.awake ? undefined : 'saturate(.55) brightness(.92)' }}>
                <CharacterArt id={actor.id} />
              </g>
              {!s.awake ? (
                <g data-event-mark="asleep">
                  <path d="M32 46 q6 4 12 0 M56 46 q6 4 12 0" stroke="#3b2a1a" strokeWidth="3.4" fill="#f6e0c6" strokeLinecap="round" />
                  <text x="74" y="22" fontSize="18" fontWeight="900" fill="#6f7d92">z</text>
                  <text x="84" y="10" fontSize="13" fontWeight="900" fill="#6f7d92">z</text>
                </g>
              ) : null}
              {s.surprised ? (
                <path data-event-mark="surprise" d="M50 -6 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="#ffd23f" stroke="#ff8a3d" strokeWidth="2" />
              ) : null}
            </svg>
            {s.said ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[12px] border-2 border-emerald-400 bg-white px-2 py-0.5 text-xs font-black text-emerald-700 shadow" data-event-mark="hello">早上好！</span>
            ) : null}
            <span className="mt-0.5 block text-center text-[11px] font-black text-slate-700">{name}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Plays effects one by one so the child sees each block act. */
export function useEventPlayback(effects: EventEffect[] | null, intervalMs = 520) {
  const [tick, setTick] = useState<{ effects: EventEffect[] | null; shown: number }>({ effects, shown: 0 })
  if (tick.effects !== effects) setTick({ effects, shown: 0 })
  const shown = tick.effects === effects ? tick.shown : 0
  useEffect(() => {
    if (!effects) return
    let i = 0
    const timer = setInterval(() => {
      i += 1
      if (i > effects.length) { clearInterval(timer); return }
      setTick({ effects, shown: i })
    }, intervalMs)
    return () => clearInterval(timer)
  }, [effects, intervalMs])
  const list = effects ?? []
  return { visible: list.slice(0, shown), done: !!effects && shown >= list.length }
}
