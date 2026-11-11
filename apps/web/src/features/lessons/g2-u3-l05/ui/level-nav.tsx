'use client'

import { L05_LEVEL_ORDER, type LevelId } from '../params'
import type { L05Session } from '../session'
import { exploreDone, isLevelPassed } from '../state'
import styles from './classroom.module.css'
import { useSession } from './use-session'

const LEVEL_LABEL: Record<LevelId, string> = {
  explore: '先猜一猜',
  solve: '自己搭',
  transferShort: '只数 6 秒',
}

export function LevelNav({ session }: { session: L05Session }) {
  const { snap } = useSession(session)
  return (
    <nav className={styles.levels} aria-label="关卡">
      {L05_LEVEL_ORDER.map((id, i) => (
        <button key={id} type="button" className={styles.levelBtn} data-testid={`l5-level-${id}`}
          aria-current={id === snap.state.levelId ? 'step' : undefined}
          data-done={id === 'explore' ? exploreDone(snap.state) : isLevelPassed(snap.state, id)}
          onClick={() => session.switchLevel(id)}>
          {i + 1}. {LEVEL_LABEL[id]}
        </button>
      ))}
    </nav>
  )
}
