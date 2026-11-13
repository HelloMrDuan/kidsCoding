/**
 * G1-U1-L01 舞台插槽（StoryStageSlot）：狐狸舞台，纯数据透传。
 *
 * 狐狸形象复用 playable-stage/character-art 的已有狐狸美术（真实插画），
 * 绝不用纯色圆块或文字块冒充卡通角色。舞台只收外壳透传的纯数据：
 * state.x（狐狸位置）、stageState.{foxX, speaker, bubble, frameIndex}
 *（来自 StoryRunAdapter.getStageState()）；不挂载引擎、不读写草稿。
 * 气泡显示最近一句对白并标明说话人（狐狸说 / 观众说）；没说话时显示
 * 空泡文案。Q5：不提供 rolesSlot（只有狐狸有真实插画，观众无形象，
 * 绝不造占位角色）；舞台插槽内以气泡与说话人标明当前说话者。
 */
import { CharacterArt } from '@/features/lessons/playable-stage/character-art'
import type { StageSlotProps } from '@/features/lessons/workspace/workspace-slots'

export function StoryStageSlot({ state, stageState }: StageSlotProps) {
  const foxPosition = typeof stageState?.foxX === 'number' ? stageState.foxX : state.x
  const speaker = typeof stageState?.speaker === 'string' ? stageState.speaker : ''
  const bubble = typeof stageState?.bubble === 'string' ? stageState.bubble : ''
  return (
    <div data-testid="g1-u1-l01-stage">
      <p className="text-xs font-bold text-[#6f7d92]">森林剧场 · 舞台</p>
      <div className="relative mt-2 h-[170px]">
        <div
          className="absolute bottom-0 left-2 w-[110px] transition-transform duration-300"
          style={{ transform: `translateX(${Math.min(foxPosition, 220)}px)` }}
          data-testid="g1-u1-l01-fox"
          data-fox-position={foxPosition}
          data-speaker={speaker}
        >
          <CharacterArt id="fox" className="h-[130px] w-[110px]" />
          <p className="text-center text-xs font-bold">狐狸主持人</p>
        </div>
        {bubble ? (
          <div
            className="absolute left-2 top-0 max-w-[70%] rounded-[12px] border border-[#e7edf5] bg-white px-3 py-2 text-sm font-bold shadow-sm"
            data-testid="g1-u1-l01-bubble"
          >
            {speaker === 'audience' ? '观众说：' : '狐狸说：'}
            {bubble}
          </div>
        ) : (
          <div
            className="absolute left-2 top-0 rounded-[12px] border border-dashed border-[#e7edf5] bg-white/70 px-3 py-2 text-sm text-[#6f7d92]"
            data-testid="g1-u1-l01-bubble-empty"
          >
            狐狸还没说话……
          </div>
        )}
      </div>
    </div>
  )
}
