'use client'

// 把会话绑定到三个槽位组件，得到壳需要的 editorSlot / stageSlot / rolesSlot（引用稳定：每个适配器只创建一次）。
//   const adapter = new LessonL05Adapter()
//   const slots = createL05Slots(adapter)   // { EditorSlot, StageSlot, RolesSlot }

import type { EditorSlotComponent, RolesSlotComponent, StageSlotComponent } from '../../workspace/workspace-slots'
import type { LessonL05Adapter } from '../lesson-adapter'
import { L05EditorSlot, type EditorSlotOptions } from './editor-slot'
import { L05RolesSlot } from './roles-slot'
import { L05StageSlot } from './stage-slot'

export type L05Slots = { EditorSlot: EditorSlotComponent; StageSlot: StageSlotComponent; RolesSlot: RolesSlotComponent }
export type L05SlotOptions = EditorSlotOptions & { embedEngineStatus?: boolean }

export function createL05Slots(adapter: LessonL05Adapter, options: L05SlotOptions = {}): L05Slots {
  const { session } = adapter
  const { embedEngineStatus, ...editorOptions } = options
  const EditorSlot: EditorSlotComponent = props => <L05EditorSlot {...props} {...editorOptions} session={session} />
  const StageSlot: StageSlotComponent = props => <L05StageSlot {...props} embedEngineStatus={embedEngineStatus} session={session} />
  const RolesSlot: RolesSlotComponent = props => <L05RolesSlot {...props} session={session} />
  EditorSlot.displayName = 'L05EditorSlot'
  StageSlot.displayName = 'L05StageSlot'
  RolesSlot.displayName = 'L05RolesSlot'
  return { EditorSlot, StageSlot, RolesSlot }
}
