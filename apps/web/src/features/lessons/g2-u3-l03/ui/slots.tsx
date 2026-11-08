'use client'

// 把会话绑定到三个槽位组件，得到壳需要的 editorSlot / stageSlot / rolesSlot（引用稳定：每个适配器只创建一次）。
//   const adapter = new LessonL03Adapter()
//   const slots = createL03Slots(adapter)   // { EditorSlot, StageSlot, RolesSlot }

import type { EditorSlotComponent, RolesSlotComponent, StageSlotComponent } from '../../workspace/workspace-slots'
import type { LessonL03Adapter } from '../lesson-adapter'
import { L03EditorSlot, type EditorSlotOptions } from './editor-slot'
import { L03RolesSlot } from './roles-slot'
import { L03StageSlot } from './stage-slot'

export type L03Slots = { EditorSlot: EditorSlotComponent; StageSlot: StageSlotComponent; RolesSlot: RolesSlotComponent }
export type L03SlotOptions = EditorSlotOptions & { embedEngineStatus?: boolean }

export function createL03Slots(adapter: LessonL03Adapter, options: L03SlotOptions = {}): L03Slots {
  const { session } = adapter
  const { embedEngineStatus, ...editorOptions } = options
  const EditorSlot: EditorSlotComponent = props => <L03EditorSlot {...props} {...editorOptions} session={session} />
  const StageSlot: StageSlotComponent = props => <L03StageSlot {...props} embedEngineStatus={embedEngineStatus} session={session} />
  const RolesSlot: RolesSlotComponent = props => <L03RolesSlot {...props} session={session} />
  EditorSlot.displayName = 'L03EditorSlot'
  StageSlot.displayName = 'L03StageSlot'
  RolesSlot.displayName = 'L03RolesSlot'
  return { EditorSlot, StageSlot, RolesSlot }
}
