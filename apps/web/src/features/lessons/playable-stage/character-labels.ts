/**
 * OPS-057: character labels without React.
 *
 * `getMainCharacterLabel` used to live in playable-stage.tsx, a Client Component module. The
 * work-mode pure functions (launch-v3-judging → launch-v3-project) are also imported by the
 * server page /studio/blockly/project/[projectId], so the label lookup has to live in a
 * hook-free module. playable-stage re-exports it, keeping every existing import working.
 */
import type { ProjectTemplateDefinition } from '@/features/domain/types'

export const CHARACTER_LABELS: Record<string, string> = {
  fox: '小狐狸',
  rabbit: '小兔子',
  bird: '草地小鸟',
  butterfly: '小蝴蝶',
  frog: '小青蛙',
  bear: '小熊',
}

export function getMainCharacterLabel(template?: ProjectTemplateDefinition) {
  const first = template?.starterCharacters[0]
  return first ? (CHARACTER_LABELS[first] ?? '小狐狸') : '小狐狸'
}
