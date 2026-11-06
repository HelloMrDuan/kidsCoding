'use client'

// 角色槽位（RolesSlot）：篮子 / 水果 / 背景三张角色卡。选中的角色决定脚本区显示谁的脚本
// （篮子可编辑，水果只读，背景没有脚本）。缩略图来自真实 VM 沙箱素材。

import type { RolesSlotProps } from '../../workspace/workspace-slots'
import type { L02Session } from '../session'
import styles from './classroom.module.css'
import { useSession } from './use-session'

function RoleThumb({ src }: { src: string | undefined }) {
  // 素材是沙箱内置的 data: SVG，不经过 next/image 优化。
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" /> : null
}

export function L02RolesSlot({ session }: RolesSlotProps & { session: L02Session }) {
  const { snap } = useSession(session)
  const assets = snap.engine.assets
  return (
    <div className={styles.roles}>
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'basket'} data-testid="l2-role-basket" onClick={() => session.setRole('basket')}>
        <RoleThumb src={assets?.basket} />篮子
      </button>
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'fruit'} data-testid="l2-role-fruit" onClick={() => session.setRole('fruit')}>
        <RoleThumb src={assets?.fruit} />水果
      </button>
      <div className={styles.roleDivider} />
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'backdrop'} data-testid="l2-role-backdrop" onClick={() => session.setRole('backdrop')}>
        背景
      </button>
    </div>
  )
}
