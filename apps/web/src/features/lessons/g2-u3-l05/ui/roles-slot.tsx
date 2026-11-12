'use client'

// 角色槽位（RolesSlot）：学生 / 水果 / 舞台三张角色卡。选中的角色决定脚本区显示谁的脚本
// （学生的脚本可编辑；水果的脚本是课程带来的，只能看说明；舞台没有脚本）。
// 缩略图来自真实 VM 沙箱内置的原创 SVG 造型（沙箱握手时随 FRAME_READY 回传 data: URI）。
// 本课没有渲染器：缩略图只用于角色栏识别，舞台判定只看 VM 的 timeLeft / score，不靠画面。

import type { RolesSlotProps } from '../../workspace/workspace-slots'
import type { L05Session } from '../session'
import styles from './classroom.module.css'
import { useSession } from './use-session'

function RoleThumb({ src }: { src: string | undefined }) {
  // 素材是沙箱内置的 data: SVG，不经过 next/image 优化。
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" /> : null
}

export function L05RolesSlot({ session }: RolesSlotProps & { session: L05Session }) {
  const { snap } = useSession(session)
  const assets = snap.engine.assets
  return (
    <div className={styles.roles}>
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'student'} data-testid="l5-role-student" onClick={() => session.setRole('student')}>
        <RoleThumb src={assets?.student} />学生
      </button>
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'fruit'} data-testid="l5-role-fruit" onClick={() => session.setRole('fruit')}>
        <RoleThumb src={assets?.fruit} />水果
      </button>
      <div className={styles.roleDivider} />
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'backdrop'} data-testid="l5-role-backdrop" onClick={() => session.setRole('backdrop')}>
        <RoleThumb src={assets?.backdrop} />舞台
      </button>
    </div>
  )
}
