'use client'

// 角色槽位（RolesSlot）：礼物 / 背景两张角色卡。选中的角色决定脚本区显示谁的脚本
// （礼物的脚本可编辑，背景没有脚本）。缩略图来自真实 VM 沙箱素材。

import type { RolesSlotProps } from '../../workspace/workspace-slots'
import type { L03Session } from '../session'
import styles from './classroom.module.css'
import { useSession } from './use-session'

function RoleThumb({ src }: { src: string | undefined }) {
  // 素材是沙箱内置的 data: SVG，不经过 next/image 优化。
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" /> : null
}

export function L03RolesSlot({ session }: RolesSlotProps & { session: L03Session }) {
  const { snap } = useSession(session)
  const assets = snap.engine.assets
  return (
    <div className={styles.roles}>
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'gift'} data-testid="l3-role-gift" onClick={() => session.setRole('gift')}>
        <RoleThumb src={assets?.gift} />礼物
      </button>
      <div className={styles.roleDivider} />
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'backdrop'} data-testid="l3-role-backdrop" onClick={() => session.setRole('backdrop')}>
        背景
      </button>
    </div>
  )
}
