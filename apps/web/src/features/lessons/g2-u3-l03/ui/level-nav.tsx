'use client'

import { exploreDone, isLevelPassed } from '../state'
import { L03_LEVEL_ORDER, type LevelId } from '../params'
import type { L03Session } from '../session'
import styles from './classroom.module.css'
import { useSession } from './use-session'

const LEVEL_LABEL: Record<LevelId, string> = {
  explore: '猜一猜',
  solve: '自己搭',
  transferRight: '换到右边',
  transferMiddle: '换到中间',
}

export function LevelNav({ session }: { session: L03Session }) {
  const { snap } = useSession(session)
  return (
    <nav className={styles.levels} aria-label="关卡">
      {L03_LEVEL_ORDER.map((id, i) => (
        <button key={id} type="button" className={styles.levelBtn} data-testid={`l3-level-${id}`}
          aria-current={id === snap.state.levelId ? 'step' : undefined}
          data-done={id === 'explore' ? exploreDone(snap.state) : isLevelPassed(snap.state, id)}
          onClick={() => session.switchLevel(id)}>
          {i + 1}. {LEVEL_LABEL[id]}
        </button>
      ))}
    </nav>
  )
}
