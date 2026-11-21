import { CharacterArt, SceneBackdrop } from '@/features/lessons/playable-stage/character-art'
import type { StageSlotProps } from '@/features/lessons/workspace/workspace-slots'

type StoryActor = {
  id: 'fox' | 'rabbit'
  name: string
  position: number
  start: number
  speaking: boolean
}

function StoryActorArt({ id, name, position, start, speaking }: StoryActor) {
  return (
    <div className="absolute bottom-2 w-[25%] max-w-[110px] -translate-x-1/2 transition-[left] duration-300"
      style={{ left: `${start + Math.min(position, 220) / 13}%` }}
      data-testid={`g1-u1-l01-${id}`}
      data-fox-position={id === 'fox' ? position : undefined}
      data-position={position} data-speaking={speaking}>
      <CharacterArt id={id} className="mx-auto block aspect-[10/11] w-full drop-shadow-md" />
      <span className="mx-auto block w-fit rounded-md bg-white/90 px-1 text-center text-xs font-bold">{name}</span>
    </div>
  )
}

export function StoryStageSlot({ state, stageState }: StageSlotProps) {
  const foxPosition = typeof stageState?.foxX === 'number' ? stageState.foxX : state.x
  const audiencePosition = typeof stageState?.audienceX === 'number' ? stageState.audienceX : 0
  const speaker = stageState?.speaker
  const bubble = typeof stageState?.bubble === 'string' ? stageState.bubble : ''
  return (
    <div data-testid="g1-u1-l01-stage">
      <div className="relative isolate min-h-[160px] overflow-hidden rounded-[10px] bg-sky-100">
        <SceneBackdrop scene="forest" />
        <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-bold">森林剧场</span>
        <StoryActorArt id="fox" name="狐狸主持人" position={foxPosition} start={18} speaking={speaker === 'fox'} />
        <StoryActorArt id="rabbit" name="兔子观众" position={audiencePosition} start={64} speaking={speaker === 'audience'} />
        {bubble ? (
          <div className={`absolute top-9 max-w-[76%] rounded-xl border border-[var(--kc-line)] bg-white px-3 py-2 text-sm font-bold shadow-sm ${speaker === 'audience' ? 'right-2' : 'left-2'}`}
            data-testid="g1-u1-l01-bubble" aria-live="polite">
            {speaker === 'audience' ? '观众说：' : '狐狸说：'}{bubble}
          </div>
        ) : (
          <div className="absolute top-9 left-2 rounded-xl bg-white/90 px-3 py-2 text-sm" data-testid="g1-u1-l01-bubble-empty">
            狐狸还没说话……
          </div>
        )}
      </div>
    </div>
  )
}
