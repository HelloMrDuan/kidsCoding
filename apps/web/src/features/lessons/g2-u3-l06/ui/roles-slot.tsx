'use client'

// 角色槽位（RolesSlot）：水果 / 篮子 / 背景三张角色卡。选中的角色决定脚本区显示谁的脚本
// （水果的脚本可编辑；篮子跟随指针、背景的倒计时是课程准备好的，没有要孩子搭的脚本）。
// 缩略图来自真实 VM 沙箱素材（与舞台上渲染的造型是同一份 SVG）。

import type { RolesSlotProps } from '../../workspace/workspace-slots'
import type { L06Session } from '../session'
import styles from './classroom.module.css'
import { useSession } from './use-session'

function RoleThumb({ src }: { src: string | undefined }) {
  // 素材是沙箱内置的 data: SVG，不经过 next/image 优化。
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" /> : null
}

export function L06RolesSlot({ session }: RolesSlotProps & { session: L06Session }) {
  const { snap } = useSession(session)
  const assets = snap.engine.assets
  return (
    <div className={styles.roles}>
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'fruit'} data-testid="l6-role-fruit" onClick={() => session.setRole('fruit')}>
        <RoleThumb src={assets?.fruit} />水果
      </button>
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'basket'} data-testid="l6-role-basket" onClick={() => session.setRole('basket')}>
        <RoleThumb src={assets?.basket} />篮子
      </button>
      <div className={styles.roleDivider} />
      <button type="button" className={styles.roleBtn} aria-pressed={snap.role === 'backdrop'} data-testid="l6-role-backdrop" onClick={() => session.setRole('backdrop')}>
        <RoleThumb src={assets?.backdrop} />背景
      </button>
    </div>
  )
}
