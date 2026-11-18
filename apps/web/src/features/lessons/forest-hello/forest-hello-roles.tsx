/**
 * lesson-01-forest-hello 角色插槽（ForestRolesSlot）：课程自有 RolesSlot。
 *
 * 只呈现真实状态，不冒充未实现的能力：
 * - 小狐狸是本课唯一的编程角色（四关的程序都只驱动它），标为当前编辑。
 * - 小兔子是舞台角色：它真实出现在舞台上（PlayableStage 渲染），但本课
 *   没有给它写程序的能力，不做成可点选的“切换编程对象”假按钮。
 * - 背景是森林（舞台真实场景）。角色增删、造型编辑、背景更换均不在
 *   本课范围，如实标注，绝不放假按钮。
 */
'use client'

import type { RolesSlotProps } from '@/features/lessons/workspace/workspace-slots'

export function ForestRolesSlot(_props: RolesSlotProps) {
  return (
    <div data-testid="forest-hello-roles">
      <p data-testid="forest-hello-current-role" style={{ margin: '0 0 8px', fontSize: 13, whiteSpace: 'nowrap' }}>
        当前编辑：<strong>小狐狸</strong>
      </p>
      <ul className="ws-role-list">
        <li>
          <div
            className="ws-role-card"
            style={{ cursor: 'default' }}
            aria-current="true"
            data-testid="forest-hello-role-fox"
          >
            <span style={{ fontSize: 30 }} aria-hidden="true">
              🦊
            </span>
            <span>
              小狐狸
              <br />
              <small>可编程角色</small>
            </span>
          </div>
        </li>
        <li>
          <div
            className="ws-role-card"
            style={{ cursor: 'default' }}
            data-testid="forest-hello-role-rabbit"
          >
            <span style={{ fontSize: 30 }} aria-hidden="true">
              🐰
            </span>
            <span>
              小兔子
              <br />
              <small>舞台角色</small>
            </span>
          </div>
        </li>
      </ul>
      <p className="ws-role-note" data-testid="forest-hello-role-note">
        🌲 背景：森林 · 角色增删、造型编辑不在本课范围（未实现，不冒充）。
      </p>
    </div>
  )
}
