/**
 * G1-U1-L02 舞台插槽（TurnTakingStageSlot）：狐狸 + 兔子双角色舞台，纯数据透传。
 *
 * 狐狸与兔子形象均复用 playable-stage/character-art 的已有美术（真实插画），
 * 绝不用纯色圆块或文字块冒充卡通角色。本课无移动：两角色固定左右并排站位。
 * 舞台只收外壳透传的纯数据：state.x（恒为 0）与
 * stageState.{foxX, rabbitX, speaker, bubble, frameIndex}
 *（来自 TurnTakingRunAdapter.getStageState()）；不挂载引擎、不读写草稿。
 * 气泡显示最近一句对白并标明说话人（狐狸说 / 兔子说）；没说话时显示
 * 空泡文案。Q5：不提供 rolesSlot（路由目前不传；是否补是待首席裁定的
 * 开放项，不擅自加）；舞台插槽内以气泡与说话人标明当前说话者。
 */
import { CharacterArt } from '@/features/lessons/playable-stage/character-art'
import type { StageSlotProps } from '@/features/lessons/workspace/workspace-slots'

export function TurnTakingStageSlot({ state, stageState }: StageSlotProps) {
  const foxPosition = typeof stageState?.foxX === 'number' ? stageState.foxX : state.x
  const rabbitPosition = typeof stageState?.rabbitX === 'number' ? stageState.rabbitX : 0
  const speaker = typeof stageState?.speaker === 'string' ? stageState.speaker : ''
  const bubble = typeof stageState?.bubble === 'string' ? stageState.bubble : ''
  return (
    <div data-testid="g1-u1-l02-stage">
      <p className="text-xs font-bold text-[#6f7d92]">森林剧场 · 舞台</p>
      <div className="relative mt-2 h-[170px]">
        <div
          className="absolute bottom-0 left-2 w-[110px] transition-transform duration-300"
          style={{ transform: `translateX(${Math.min(foxPosition, 220)}px)` }}
          data-testid="g1-u1-l02-fox"
          data-fox-position={foxPosition}
          data-speaker={speaker}
        >
          <CharacterArt id="fox" className="h-[130px] w-[110px]" />
          <p className="text-center text-xs font-bold">狐狸</p>
        </div>
        <div
          className="absolute bottom-0 right-2 w-[110px] transition-transform duration-300"
          style={{ transform: `translateX(${Math.min(rabbitPosition, 220)}px)` }}
          data-testid="g1-u1-l02-rabbit"
          data-rabbit-position={rabbitPosition}
          data-speaker={speaker}
        >
          <CharacterArt id="rabbit" className="h-[130px] w-[110px]" />
          <p className="text-center text-xs font-bold">兔子</p>
        </div>
        {bubble ? (
          <div
            className="absolute left-2 top-0 max-w-[70%] rounded-[12px] border border-[#e7edf5] bg-white px-3 py-2 text-sm font-bold shadow-sm"
            data-testid="g1-u1-l02-bubble"
          >
            {speaker === 'rabbit' ? '兔子说：' : '狐狸说：'}
            {bubble}
          </div>
        ) : (
          <div
            className="absolute left-2 top-0 rounded-[12px] border border-dashed border-[#e7edf5] bg-white/70 px-3 py-2 text-sm text-[#6f7d92]"
            data-testid="g1-u1-l02-bubble-empty"
          >
            狐狸和兔子还没打招呼……
          </div>
        )}
      </div>
    </div>
  )
}
