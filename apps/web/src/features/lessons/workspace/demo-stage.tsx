/**
 * DEMO STAGE + ROLES ONLY — never shared-shell content and never formal
 * lesson data.
 *
 * The shared shell renders only the stage card chrome (header, box, run
 * bar, zoom). Everything demo-specific — the forest backdrop, the fox
 * character, the apple target, the x→percent mapping, the role cards —
 * lives here and reaches the shell through the stageSlot / rolesSlot
 * props. A formal course supplies its own stage and roles UI the same way;
 * the shell never hardcodes a character or a target again.
 *
 * The fruit positions below are the spec-published prototype demo values
 * (demo-a: 200, demo-b: 240). They are NOT formal G2-U3-L02 or A1-U3-L02
 * teaching parameters.
 */

import { useState } from 'react'

import { CharacterArt, SceneBackdrop } from '@/features/lessons/playable-stage/character-art'

import type { RolesSlotProps, StageSlotComponent } from './workspace-slots'

/** Demo stage x mapping: clamp to [-50, 300], then map to 0–100%. */
export function demoStagePercent(x: number): number {
  const clamped = Math.max(-50, Math.min(300, x))
  return ((clamped + 50) / 350) * 100
}

/**
 * Build the demo stage scene for one fruit target. The shell renders the
 * stage box (sized by its zoom state); this component renders only the
 * scene content inside it, so stage zoom keeps working for slot stages.
 */
export function createDemoStage(fruitX: number): StageSlotComponent {
  return function DemoStage({ state }) {
    return (
      <>
        <SceneBackdrop scene="forest" />
        <div
          style={{
            position: 'absolute',
            left: `${demoStagePercent(state.x)}%`,
            bottom: 12,
            transform: 'translateX(-50%)',
          }}
          data-testid="ws-stage-character"
        >
          <CharacterArt id="fox" />
        </div>
        <div
          style={{
            position: 'absolute',
            left: `${demoStagePercent(fruitX)}%`,
            bottom: 12,
            transform: 'translateX(-50%)',
            fontSize: 28,
          }}
          data-testid="ws-stage-target"
          aria-label="水果目标"
        >
          🍎
        </div>
      </>
    )
  }
}

const DEMO_ROLES = [
  { id: 'fox', label: '小狐狸' },
  { id: 'rabbit', label: '小兔子' },
  { id: 'bird', label: '小鸟' },
] as const

/**
 * Demo role column: select-only thumbnails. Role add/delete/costume
 * editing and background management are engine work, honestly unimplemented
 * — this component never pretends otherwise.
 */
export function DemoRoles({ lessonId }: RolesSlotProps) {
  void lessonId
  const [selectedRole, setSelectedRole] = useState<string>('fox')
  return (
    <>
      <ul className="ws-role-list">
        {DEMO_ROLES.map((role) => (
          <li key={role.id}>
            <button
              type="button"
              className="ws-role-card"
              aria-pressed={selectedRole === role.id}
              onClick={() => setSelectedRole(role.id)}
              data-testid={`ws-role-${role.id}`}
            >
              <CharacterArt id={role.id} />
              <span>
                {role.label}
                {selectedRole === role.id ? '（已选中）' : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="ws-role-note">
        演示仅支持点选角色；角色增删、造型编辑与背景管理为引擎接入工作，未冒充已实现。
      </p>
    </>
  )
}
