'use client'

import { exploreDone, isLevelPassed } from '../state'
import { L06_LEVEL_ORDER, type LevelId } from '../params'
import type { L06Session } from '../session'
import styles from './classroom.module.css'
import { useSession } from './use-session'

const LEVEL_LABEL: Record<LevelId, string> = {
  explore: '猜一猜',
  solve: '自己搭',
  transferFix: '找毛病',
  transferFast: '落得快',
}

export function LevelNav({ session }: { session: L06Session }) {
  const { snap } = useSession(session)
  return (
    <nav className={styles.levels} aria-label="关卡">
      {L06_LEVEL_ORDER.map((id, i) => (
        <button key={id} type="button" className={styles.levelBtn} data-testid={`l6-level-${id}`}
          aria-current={id === snap.state.levelId ? 'step' : undefined}
          data-done={id === 'explore' ? exploreDone(snap.state) : isLevelPassed(snap.state, id)}
          onClick={() => session.switchLevel(id)}>
          {i + 1}. {LEVEL_LABEL[id]}
        </button>
      ))}
    </nav>
  )
}
