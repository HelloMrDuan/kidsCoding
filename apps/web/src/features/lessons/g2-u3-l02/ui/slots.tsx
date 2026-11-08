'use client'

// 把会话绑定到三个槽位组件，得到壳需要的 editorSlot / stageSlot / rolesSlot（引用稳定：每个适配器只创建一次）。
//   const adapter = new LessonL02Adapter()
//   const slots = createL02Slots(adapter)   // { EditorSlot, StageSlot, RolesSlot }

import type { EditorSlotComponent, RolesSlotComponent, StageSlotComponent } from '../../workspace/workspace-slots'
import type { LessonL02Adapter } from '../lesson-adapter'
import { L02EditorSlot, type EditorSlotOptions } from './editor-slot'
import { L02RolesSlot } from './roles-slot'
import { L02StageSlot } from './stage-slot'

export type L02Slots = { EditorSlot: EditorSlotComponent; StageSlot: StageSlotComponent; RolesSlot: RolesSlotComponent }
export type L02SlotOptions = EditorSlotOptions & { embedEngineStatus?: boolean }

export function createL02Slots(adapter: LessonL02Adapter, options: L02SlotOptions = {}): L02Slots {
  const { session } = adapter
  const { embedEngineStatus, ...editorOptions } = options
  const EditorSlot: EditorSlotComponent = props => <L02EditorSlot {...props} {...editorOptions} session={session} />
  const StageSlot: StageSlotComponent = props => <L02StageSlot {...props} embedEngineStatus={embedEngineStatus} session={session} />
  const RolesSlot: RolesSlotComponent = props => <L02RolesSlot {...props} session={session} />
  EditorSlot.displayName = 'L02EditorSlot'
  StageSlot.displayName = 'L02StageSlot'
  RolesSlot.displayName = 'L02RolesSlot'
  return { EditorSlot, StageSlot, RolesSlot }
}
