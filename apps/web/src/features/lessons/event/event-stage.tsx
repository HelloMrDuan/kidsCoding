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

/** G0-U2-L02 story scenery: the forest opening stage with bunting and a flagpole; the flag is down until someone raises it. */
export function StageFlags({ flagUp }: { flagUp: boolean }) {
  return (
    <g data-grid-item="stage-flags" data-flag-up={flagUp ? 'true' : 'false'}>
      <rect x="0" y="0" width="100" height="60" rx="4" fill="#e7f0ff" />
      <path d="M0 44 Q30 38 60 42 T100 41 V60 H0 Z" fill="#9fdc7c" />
      <rect x="18" y="46" width="64" height="8" rx="2" fill="#c9905a" stroke="#8a5a2e" strokeWidth=".6" />
      <rect x="18" y="46" width="64" height="2" rx="1" fill="#e2b27c" />
      <path d="M4 8 Q50 20 96 8" fill="none" stroke="#8a5a2e" strokeWidth=".6" />
      <g strokeWidth=".3" stroke="#ffffff">
        <path d="M12 10.2l2.2 4.6 2.2-3.9z" fill="#ff8a3d" />
        <path d="M24 13.4l2.2 4.6 2.2-3.6z" fill="#4fae55" />
        <path d="M36 15.4l2.2 4.6 2.2-4.4z" fill="#3b82f6" />
        <path d="M48 15.9l2.2 4.6 2.2-4.6z" fill="#ffd23f" />
        <path d="M60 15.2l2.2 4.6 2.2-4.3z" fill="#ff8a3d" />
        <path d="M72 13.2l2.2 4.6 2.2-3.5z" fill="#4fae55" />
        <path d="M84 10l2.2 4.6 2.2-3.8z" fill="#3b82f6" />
      </g>
      <rect x="89.4" y="18" width="1.4" height="30" rx=".6" fill="#6b7280" />
      <circle cx="90.1" cy="17.6" r="1.2" fill="#ffd23f" />
      <g style={{ transform: `translateY(${flagUp ? 0 : 20}px)`, transition: 'transform .45s ease-out' }} data-event-mark="flag">
        <path d="M90.8 19 h8 l-2.2 3 2.2 3 h-8z" fill="#ef4444" stroke="#b91c1c" strokeWidth=".4" />
      </g>
    </g>
  )
}

/** G0-U2-L03 story scenery: the bell tree — an old oak with the forest bell; the bell swings when someone rings it. */
export function BellTree({ rung }: { rung: boolean }) {
  return (
    <g data-grid-item="bell-tree" data-bell-rung={rung ? 'true' : 'false'}>
      <rect x="0" y="0" width="100" height="60" rx="4" fill="#e3f4ff" />
      <path d="M0 42 Q25 36 50 41 T100 40 V60 H0 Z" fill="#9fdc7c" />
      <path d="M0 50 Q30 46 60 49 T100 48 V60 H0 Z" fill="#7cc35b" />
      <rect x="9" y="18" width="4.2" height="26" rx="1.4" fill="#9b6a3c" />
      <path d="M11 26 Q20 22 27 23" fill="none" stroke="#9b6a3c" strokeWidth="1.6" strokeLinecap="round" />
      <g fill="#4fae55" stroke="#2f7d3a" strokeWidth=".6">
        <circle cx="6" cy="16" r="7" />
        <circle cx="15" cy="12" r="8" />
        <circle cx="23" cy="18" r="6" />
      </g>
      <path d="M26 23 v3" stroke="#6b4a2a" strokeWidth=".6" />
      <g style={{ transformOrigin: '26px 26px', transform: `rotate(${rung ? 18 : 0}deg)`, transition: 'transform .3s ease-out' }} data-event-mark="bell">
        <path d="M23.2 32 Q23.4 26 26 26 Q28.6 26 28.8 32 Z" fill="#ffd23f" stroke="#c48a00" strokeWidth=".5" />
        <circle cx="26" cy="32.6" r=".9" fill="#c48a00" />
      </g>
      {rung ? <path d="M31 25 q2 2 0 4 M33 23.5 q3.5 3.5 0 7" fill="none" stroke="#ff8a3d" strokeWidth=".7" strokeLinecap="round" /> : null}
    </g>
  )
}

/** G0-U2-L04 story scenery: the forest theatre — a wooden stage between two curtained doors; friends wait backstage until they come on. */
export function TwoDoors() {
  return (
    <g data-grid-item="two-doors">
      <rect x="0" y="0" width="100" height="60" rx="4" fill="#fdf1e3" />
      <rect x="0" y="0" width="100" height="6" rx="3" fill="#b4473f" />
      <path d="M0 6 q6 5 12 0 q6 5 12 0 q6 5 12 0 q6 5 12 0 q6 5 12 0 q6 5 12 0 q6 5 12 0 q6 5 12 0 q6 5 4 0" fill="#d8574c" />
      <g stroke="#8a5a2e" strokeWidth=".6">
        <rect x="2" y="16" width="13" height="30" rx="6" fill="#6b3f8f" />
        <rect x="85" y="16" width="13" height="30" rx="6" fill="#6b3f8f" />
      </g>
      <path d="M2.4 22 q6.1 -6 12.2 0 M85.4 22 q6.1 -6 12.2 0" fill="none" stroke="#ffd23f" strokeWidth=".8" />
      <rect x="0" y="44" width="100" height="16" fill="#c9905a" />
      <path d="M0 44 H100" stroke="#8a5a2e" strokeWidth=".8" />
      <path d="M0 50 H100 M0 55 H100" stroke="#b07a45" strokeWidth=".4" />
      <circle cx="50" cy="12" r="2.2" fill="#ffd23f" />
      <path d="M50 14 L36 44 H64 Z" fill="#fff6c8" opacity=".45" />
    </g>
  )
}

/** G0-U2-L05 story scenery: the apple orchard — open sky, a soft hill and grass where the apple lands. */
export function AppleOrchard() {
  return (
    <g data-grid-item="apple-tree">
      <rect x="0" y="0" width="100" height="60" rx="4" fill="#e6f6ff" />
      <circle cx="86" cy="11" r="6" fill="#ffe27a" />
      <path d="M0 40 Q30 33 62 39 T100 37 V60 H0 Z" fill="#a8dd88" />
      <path d="M0 48 Q28 44 56 47 T100 46 V60 H0 Z" fill="#86c968" />
      <g fill="#6fb85a"><circle cx="70" cy="52" r="1.2" /><circle cx="78" cy="55" r="1" /><circle cx="18" cy="54" r="1.1" /></g>
    </g>
  )
}

/** G0-U2-L05 apple tree (original art): the tree itself is a character the child can (wrongly) build on. */
function TreeArt() {
  return (
    <g>
      <ellipse cx="50" cy="106" rx="26" ry="4" fill="#305a43" opacity=".2" />
      <path d="M44 106 L46 62 Q50 58 54 62 L56 106 Z" fill="#9b6a3c" stroke="#6b4423" strokeWidth="2" />
      <path d="M50 74 Q62 66 70 60" fill="none" stroke="#9b6a3c" strokeWidth="5" strokeLinecap="round" />
      <g fill="#4fae55" stroke="#2f7d3a" strokeWidth="2">
        <circle cx="30" cy="42" r="22" /><circle cx="70" cy="40" r="22" /><circle cx="50" cy="26" r="24" /><circle cx="50" cy="52" r="18" />
      </g>
    </g>
  )
}

/** G0-U2-L05 apple (original art). */
function AppleArt() {
  return (
    <g>
      <path d="M50 30 Q49 20 56 14" fill="none" stroke="#6b4423" strokeWidth="4" strokeLinecap="round" />
      <path d="M54 22 Q66 12 74 20 Q64 28 54 22Z" fill="#6fcf5a" stroke="#2f7d3a" strokeWidth="2" />
      <path d="M50 34 Q30 22 18 40 Q8 62 24 86 Q36 102 50 92 Q64 102 76 86 Q92 62 82 40 Q70 22 50 34Z" fill="#ef4444" stroke="#a61b1b" strokeWidth="3" />
      <ellipse cx="34" cy="50" rx="6" ry="10" fill="#fff" opacity=".45" />
    </g>
  )
}

/** G0-U2-L06 story scenery: the forest meet-and-greet — a round stage under bunting, two spotlights and a row of audience stumps. */
export function MeetingStage() {
  return (
    <g data-grid-item="meeting-stage">
      <rect x="0" y="0" width="100" height="60" rx="4" fill="#eef3ff" />
      <path d="M2 6 Q50 18 98 6" fill="none" stroke="#8a5a2e" strokeWidth=".6" />
      <g strokeWidth=".3" stroke="#ffffff">
        <path d="M14 8.6l2 4 2-3.4z" fill="#ff8a3d" /><path d="M28 11.6l2 4 2-3.3z" fill="#4fae55" /><path d="M42 13.2l2 4 2-3.8z" fill="#ffd23f" />
        <path d="M56 13.3l2 4 2-3.9z" fill="#3b82f6" /><path d="M70 11.8l2 4 2-3.3z" fill="#ff8a3d" /><path d="M84 8.8l2 4 2-3.4z" fill="#4fae55" />
      </g>
      <path d="M22 4 L10 46 H34 Z M78 4 L66 46 H90 Z" fill="#fff6c8" opacity=".35" />
      <path d="M0 42 Q50 36 100 42 V60 H0 Z" fill="#a8dd88" />
      <ellipse cx="50" cy="48" rx="40" ry="7" fill="#c9905a" stroke="#8a5a2e" strokeWidth=".6" />
      <ellipse cx="50" cy="47" rx="40" ry="5.6" fill="#e2b27c" />
      <g fill="#9b6a3c" stroke="#6b4423" strokeWidth=".4">
        <rect x="6" y="54" width="7" height="4" rx="1.5" /><rect x="24" y="55" width="7" height="4" rx="1.5" /><rect x="69" y="55" width="7" height="4" rx="1.5" /><rect x="87" y="54" width="7" height="4" rx="1.5" />
      </g>
    </g>
  )
}

/** G0-U2 squirrel (original art, same chibi style as CharacterArt): the bell ringer. */
function SquirrelArt() {
  const fur = '#c9874b', line = '#7a4a22', cream = '#fff1dc'
  return (
    <g>
      <ellipse cx="50" cy="104" rx="30" ry="5" fill="#305a43" opacity=".22" />
      <path d="M66 92 Q98 92 94 56 Q92 30 74 34 Q86 46 80 62 Q76 76 64 80Z" fill={fur} stroke={line} strokeWidth="3" strokeLinejoin="round" />
      <path d="M78 44 Q88 52 84 66" fill="none" stroke={cream} strokeWidth="4" strokeLinecap="round" opacity=".7" />
      <ellipse cx="50" cy="84" rx="19" ry="16" fill={fur} stroke={line} strokeWidth="3" />
      <ellipse cx="50" cy="87" rx="10" ry="9" fill={cream} />
      <ellipse cx="40" cy="100" rx="7.5" ry="4.6" fill="#7a4a22" />
      <ellipse cx="60" cy="100" rx="7.5" ry="4.6" fill="#7a4a22" />
      <path d="M24 26 L26 8 40 22Z M76 26 L74 8 60 22Z" fill={fur} stroke={line} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="50" cy="48" rx="31" ry="28" fill={fur} stroke={line} strokeWidth="3" />
      <ellipse cx="50" cy="58" rx="17" ry="13" fill={cream} />
      <ellipse cx="38" cy="45" rx="5.4" ry="6.6" fill="#1a2739" />
      <ellipse cx="62" cy="45" rx="5.4" ry="6.6" fill="#1a2739" />
      <circle cx="39.8" cy="42.4" r="2.1" fill="#fff" />
      <circle cx="63.8" cy="42.4" r="2.1" fill="#fff" />
      <g fill="#ff8fa3" opacity=".55"><ellipse cx="28" cy="57" rx="5.4" ry="3.2" /><ellipse cx="72" cy="57" rx="5.4" ry="3.2" /></g>
      <ellipse cx="50" cy="55" rx="3.8" ry="2.8" fill="#3a2016" />
      <path d="M44 60 Q50 66 56 60" fill="#e86a5a" stroke="#5b2f22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

/** G0-U3-L04 story scenery: a summer night by the pond — moon, stars and reeds where the fireflies perform (original art, V2 flat style). */
export function FireflyNight() {
  return (
    <g data-grid-item="firefly-night">
      <rect x="0" y="0" width="100" height="60" rx="4" fill="#1f2f57" />
      <circle cx="84" cy="11" r="6" fill="#fff4c2" />
      <circle cx="86.5" cy="9.5" r="5" fill="#1f2f57" />
      <g fill="#fff4c2">
        <circle cx="12" cy="8" r=".7" /><circle cx="26" cy="14" r=".5" /><circle cx="40" cy="6" r=".6" /><circle cx="58" cy="12" r=".5" /><circle cx="70" cy="5" r=".7" /><circle cx="94" cy="24" r=".5" />
      </g>
      <path d="M0 44 Q25 38 50 43 T100 42 V60 H0 Z" fill="#2f6b4a" />
      <ellipse cx="50" cy="53" rx="30" ry="4.5" fill="#3a5f9c" stroke="#5b86c9" strokeWidth=".5" />
      <g stroke="#4fae55" strokeWidth="1" strokeLinecap="round" fill="none">
        <path d="M8 58 q1 -10 -1 -16 M11 58 q0 -8 2 -13 M90 58 q-1 -10 1 -15 M93 58 q0 -7 -2 -12" />
      </g>
    </g>
  )
}

/** G0-U3-L04 firefly (original art, same chibi style): its tail lights up while glowing. */
function FireflyArt({ glowing }: { glowing: boolean }) {
  return (
    <g>
      {glowing ? <circle cx="50" cy="74" r="34" fill="#fff36b" opacity=".45" data-event-mark="glow" /> : null}
      <ellipse cx="50" cy="76" rx="18" ry="16" fill={glowing ? '#fff36b' : '#8a8f5a'} stroke={glowing ? '#e0b400' : '#5b5e3a'} strokeWidth="3" />
      <ellipse cx="30" cy="40" rx="16" ry="10" fill="#dff3ff" stroke="#8fb6d9" strokeWidth="2" opacity=".9" transform="rotate(-25 30 40)" />
      <ellipse cx="70" cy="40" rx="16" ry="10" fill="#dff3ff" stroke="#8fb6d9" strokeWidth="2" opacity=".9" transform="rotate(25 70 40)" />
      <circle cx="50" cy="44" r="20" fill="#3d3a5c" stroke="#24223a" strokeWidth="3" />
      <ellipse cx="43" cy="42" rx="4" ry="5" fill="#fff" /><ellipse cx="57" cy="42" rx="4" ry="5" fill="#fff" />
      <circle cx="44" cy="43" r="2.2" fill="#1a2739" /><circle cx="58" cy="43" r="2.2" fill="#1a2739" />
      <path d="M44 52 Q50 56 56 52" fill="none" stroke="#ffb3c1" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M42 26 q-4 -10 -10 -12 M58 26 q4 -10 10 -12" fill="none" stroke="#24223a" strokeWidth="2.4" strokeLinecap="round" />
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

const STAGE_LABELS: Partial<Record<NonNullable<EventLevel['scenery']>, string>> = { 'morning-glade': '林间空地舞台', 'stage-flags': '森林开幕舞台', 'bell-tree': '铃铛树下的舞台', 'two-doors': '森林小剧场', 'apple-tree': '苹果园', 'meeting-stage': '森林见面会舞台', 'firefly-night': '池塘边的萤火虫夜晚舞台' }

/** Draws the characters and what has happened to them so far; characters are tappable. */
export function EventStage({ level, effects, onActorClick, label }: EventStageProps) {
  const state = stageStateAfter(level, effects)
  const rang = new Set(effects.filter(e => e.action === 'send_bell').map(e => e.actor))
  return (
    <div className="relative w-full" data-testid="event-stage" aria-label={label ?? STAGE_LABELS[level.scenery ?? 'morning-glade'] ?? '林间空地舞台'}>
      <svg viewBox="0 0 100 60" className="block w-full rounded-[14px]" role="img" aria-label={label ?? STAGE_LABELS[level.scenery ?? 'morning-glade'] ?? '林间空地舞台'}>
        {level.scenery === 'stage-flags' ? <StageFlags flagUp={Object.values(state).some(x => x.flagUp)} />
          : level.scenery === 'bell-tree' ? <BellTree rung={effects.some(e => e.action === 'send_bell')} />
          : level.scenery === 'two-doors' ? <TwoDoors />
          : level.scenery === 'apple-tree' ? <AppleOrchard />
          : level.scenery === 'meeting-stage' ? <MeetingStage />
          : level.scenery === 'firefly-night' ? <FireflyNight />
          : <MorningGlade />}
      </svg>
      {level.actors.map(actor => {
        const s = state[actor.id]
        const name = actor.name
        const firefly = actor.id.startsWith('firefly')
        // G0-U3-L04: the light log under a firefly, one dot per beat (filled = lit).
        const glowLog = effects.filter(e => e.actor === actor.id && (e.action === 'glow_on' || e.action === 'glow_off')).map(e => (e.action === 'glow_on' ? '1' : '0')).join('')
        return (
          <button
            key={actor.id}
            type="button"
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-sky-400"
            style={{ left: `${actor.x}%`, top: `${s.fallen && actor.fallY !== undefined ? actor.fallY : actor.y}%`, width: `${actor.size ?? 18}%`, opacity: s.onstage ? 1 : 0.25, transition: 'top .5s ease-in' }}
            data-testid={`event-actor-${actor.id}`}
            data-awake={s.awake ? 'true' : 'false'}
            data-onstage={s.onstage ? 'true' : 'false'}
            data-fallen={s.fallen ? 'true' : 'false'}
            data-said={s.said ? 'true' : 'false'}
            data-surprised={s.surprised ? 'true' : 'false'}
            data-rang={rang.has(actor.id) ? 'true' : 'false'}
            data-glowing={s.glowing ? 'true' : 'false'}
            data-glow-log={glowLog}
            aria-label={`${name}：${s.onstage ? '' : '在后台，'}${firefly ? (s.glowing ? '亮着' : '暗着') : actor.id === 'apple' || actor.id === 'tree' ? '' : s.awake ? '醒着' : '睡着'}${s.said ? `，说了“${actor.line ?? '早上好！'}”` : ''}${s.surprised ? '，露出惊喜' : ''}${s.fallen ? '，落到了地上' : ''}${rang.has(actor.id) ? '，摇响了铃铛' : ''}${onActorClick ? '。点一下它' : ''}`}
            onClick={() => onActorClick?.(actor.id)}
          >
            <svg viewBox="0 0 100 110" className="block w-full" aria-hidden="true">
              <g style={{ filter: s.awake ? undefined : 'saturate(.55) brightness(.92)' }}>
                {firefly ? <FireflyArt glowing={s.glowing} /> : actor.id === 'squirrel' ? <SquirrelArt /> : actor.id === 'tree' ? <TreeArt /> : actor.id === 'apple' ? <AppleArt /> : <CharacterArt id={actor.id} />}
              </g>
              {!s.awake ? (
                <g data-event-mark="asleep">
                  <path d="M32 46 q6 4 12 0 M56 46 q6 4 12 0" stroke="#3b2a1a" strokeWidth="3.4" fill="#f6e0c6" strokeLinecap="round" />
                  <text x="74" y="22" fontSize="18" fontWeight="900" fill="#6f7d92">z</text>
                  <text x="84" y="10" fontSize="13" fontWeight="900" fill="#6f7d92">z</text>
                </g>
              ) : null}
            </svg>
            {s.said ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[12px] border-2 border-emerald-400 bg-white px-2 py-0.5 text-xs font-black text-emerald-700 shadow" data-event-mark="hello">{actor.line ?? '早上好！'}</span>
            ) : null}
            {s.surprised && !s.said && !rang.has(actor.id) ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[12px] border-2 border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700 shadow" data-event-mark="surprise">✨ 哇！</span>
            ) : null}
            {rang.has(actor.id) && !s.said ? (
              <span className="absolute -top-3 left-1/2 whitespace-nowrap rounded-[12px] border-2 border-orange-400 bg-white px-2 py-0.5 text-xs font-black text-orange-700 shadow" style={{ transform: 'translate(-50%, -210%)' }} data-event-mark="bell">{s.surprised ? '✨🔔 叮铃！' : '🔔 叮铃！'}</span>
            ) : null}
            <span className={`mt-0.5 block text-center text-[11px] font-black ${firefly ? 'text-amber-100' : 'text-slate-700'}`}>{name}</span>
            {firefly && glowLog ? (
              <span className="mx-auto mt-0.5 flex max-w-[64px] flex-wrap justify-center gap-[2px]" data-event-mark="glow-log" aria-hidden="true">
                {glowLog.split('').map((g, i) => <i key={i} className={`block h-[7px] w-[7px] shrink-0 rounded-full border ${g === '1' ? 'border-amber-500 bg-yellow-300' : 'border-slate-400 bg-slate-600'}`} />)}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/** Plays effects one by one so the child sees each block act; on a parallel show stage (G0-U3-L04) a whole beat plays at once. */
export function useEventPlayback(effects: EventEffect[] | null, intervalMs = 520, parallel = false) {
  const list = effects ?? []
  // Step k reveals every effect whose step index is below k.
  const stepOf = parallel ? beatSteps(list) : list.map((_, i) => i)
  const total = list.length ? Math.max(...stepOf) + 1 : 0
  const [tick, setTick] = useState<{ effects: EventEffect[] | null; shown: number }>({ effects, shown: 0 })
  if (tick.effects !== effects) setTick({ effects, shown: 0 })
  const shown = tick.effects === effects ? tick.shown : 0
  useEffect(() => {
    if (!effects) return
    let i = 0
    const timer = setInterval(() => {
      i += 1
      if (i > total) { clearInterval(timer); return }
      setTick({ effects, shown: i })
    }, intervalMs)
    return () => clearInterval(timer)
  }, [effects, intervalMs, total])
  return { visible: list.filter((_, i) => stepOf[i] < shown), done: !!effects && shown >= total }
}

/** For a show stage: effects of the same interaction and beat share one playback step. */
export function beatSteps(effects: EventEffect[]) {
  const keys = [...new Set(effects.map(e => e.interaction * 1000 + e.beat))].sort((a, b) => a - b)
  return effects.map(e => keys.indexOf(e.interaction * 1000 + e.beat))
}
