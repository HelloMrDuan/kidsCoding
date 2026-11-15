'use client'

// 把会话绑定到三个槽位组件，得到壳需要的 editorSlot / stageSlot / rolesSlot（引用稳定：每个适配器只创建一次）。
//   const adapter = new LessonL06Adapter()
//   const slots = createL06Slots(adapter)   // { EditorSlot, StageSlot, RolesSlot }
// StageSlot 多拿一条 onStageHost：把舞台框元素交给适配器，真实渲染的沙箱 iframe 显示在舞台框里。

import { useCallback } from 'react'
import type { EditorSlotComponent, RolesSlotComponent, StageSlotComponent, StageSlotProps } from '../../workspace/workspace-slots'
import type { LessonL06Adapter } from '../lesson-adapter'
import { L06EditorSlot, type EditorSlotOptions } from './editor-slot'
import { L06RolesSlot } from './roles-slot'
import { L06StageSlot } from './stage-slot'

export type L06Slots = { EditorSlot: EditorSlotComponent; StageSlot: StageSlotComponent; RolesSlot: RolesSlotComponent }
export type L06SlotOptions = EditorSlotOptions & { embedEngineStatus?: boolean }

export function createL06Slots(adapter: LessonL06Adapter, options: L06SlotOptions = {}): L06Slots {
  const { session } = adapter
  const { embedEngineStatus, ...editorOptions } = options
  const EditorSlot: EditorSlotComponent = props => <L06EditorSlot {...props} {...editorOptions} session={session} />
  const StageSlot: StageSlotComponent = props => (
    <L06StageSlotWithHost {...props} adapter={adapter} embedEngineStatus={embedEngineStatus} />
  )
  const RolesSlot: RolesSlotComponent = props => <L06RolesSlot {...props} session={session} />
  EditorSlot.displayName = 'L06EditorSlot'
  StageSlot.displayName = 'L06StageSlot'
  RolesSlot.displayName = 'L06RolesSlot'
  return { EditorSlot, StageSlot, RolesSlot }
}

function L06StageSlotWithHost(props: StageSlotProps & { adapter: LessonL06Adapter; embedEngineStatus?: boolean }) {
  const { adapter, embedEngineStatus, ...slotProps } = props
  const onStageHost = useCallback((el: HTMLElement | null) => adapter.setStageHost(el), [adapter])
  return <L06StageSlot {...slotProps} session={adapter.session} embedEngineStatus={embedEngineStatus} onStageHost={onStageHost} />
}
