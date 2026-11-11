'use client'

// 把会话绑定到三个槽位组件，得到壳需要的 editorSlot / stageSlot / rolesSlot（引用稳定：每个适配器只创建一次）。
//   const adapter = new LessonL04Adapter()
//   const slots = createL04Slots(adapter)   // { EditorSlot, StageSlot, RolesSlot }

import type { EditorSlotComponent, RolesSlotComponent, StageSlotComponent } from '../../workspace/workspace-slots'
import type { LessonL04Adapter } from '../lesson-adapter'
import { L04EditorSlot, type EditorSlotOptions } from './editor-slot'
import { L04RolesSlot } from './roles-slot'
import { L04StageSlot } from './stage-slot'

export type L04Slots = { EditorSlot: EditorSlotComponent; StageSlot: StageSlotComponent; RolesSlot: RolesSlotComponent }
export type L04SlotOptions = EditorSlotOptions & { embedEngineStatus?: boolean }

export function createL04Slots(adapter: LessonL04Adapter, options: L04SlotOptions = {}): L04Slots {
  const { session } = adapter
  const { embedEngineStatus, ...editorOptions } = options
  const EditorSlot: EditorSlotComponent = props => <L04EditorSlot {...props} {...editorOptions} session={session} />
  const StageSlot: StageSlotComponent = props => <L04StageSlot {...props} embedEngineStatus={embedEngineStatus} session={session} />
  const RolesSlot: RolesSlotComponent = props => <L04RolesSlot {...props} session={session} />
  EditorSlot.displayName = 'L04EditorSlot'
  StageSlot.displayName = 'L04StageSlot'
  RolesSlot.displayName = 'L04RolesSlot'
  return { EditorSlot, StageSlot, RolesSlot }
}
