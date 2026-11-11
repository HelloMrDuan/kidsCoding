'use client'

// 角色槽位（RolesSlot）：学生 / 水果 / 舞台三张角色卡。选中的角色决定脚本区显示谁的脚本
// （学生的脚本可编辑；水果的脚本是课程带来的，只能看说明；舞台没有脚本）。

import type { RolesSlotProps } from '../../workspace/workspace-slots'
import type { L05Session } from '../session'
import styles from './classroom.module.css'
import { useSession } from './use-session'

export function L05RolesSlot({ session }: RolesSlotProps & { session: L05Session }) {
  const { snap } = useSession(session)
  return (
    <div className={styles.roles}>
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'student'} data-testid="l5-role-student" onClick={() => session.setRole('student')}>
        学生
      </button>
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'fruit'} data-testid="l5-role-fruit" onClick={() => session.setRole('fruit')}>
        水果
      </button>
      <div className={styles.roleDivider} />
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'backdrop'} data-testid="l5-role-backdrop" onClick={() => session.setRole('backdrop')}>
        舞台
      </button>
    </div>
  )
}
