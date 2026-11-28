import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { getLaunchV3Template } from './launch-v3-lessons'
import { LaunchRunAdapter } from './launch-v3-run-adapter'
import { LaunchRolesSlot } from './launch-v3-roles'
import { createLaunchSessionStore, LaunchSessionContext } from './launch-v3-session'

function renderRoles(lessonId: string) {
  const store = createLaunchSessionStore(lessonId)
  const runAdapter = new LaunchRunAdapter(lessonId)
  return render(
    <LaunchSessionContext.Provider value={{ lessonId, store, runAdapter }}>
      <LaunchRolesSlot />
    </LaunchSessionContext.Provider>,
  )
}

afterEach(() => {
  cleanup()
})

describe('LaunchRolesSlot', () => {
  it('lists the template characters in order; only the first is programmable in a single-role lesson', () => {
    renderRoles('lesson-02-forest-greeting')
    const characters = getLaunchV3Template('lesson-02-forest-greeting')?.starterCharacters ?? []
    expect(characters).toEqual(['fox', 'rabbit'])
    expect(screen.getByTestId('launch-v3-role-fox')).toHaveAttribute('aria-current', 'true')
    expect(screen.getByTestId('launch-v3-role-fox')).toHaveTextContent('可编程角色')
    expect(screen.getByTestId('launch-v3-role-rabbit')).not.toHaveAttribute('aria-current')
    expect(screen.getByTestId('launch-v3-role-rabbit')).toHaveTextContent('舞台角色')
    expect(screen.getByTestId('launch-v3-roles')).toHaveTextContent('当前编辑：小狐狸')
    expect(screen.getByTestId('launch-v3-roles')).toHaveTextContent('背景：森林')
  })

  it('uses each lesson\'s own template (garden lesson shows butterfly and frog)', () => {
    renderRoles('lesson-07-garden-click')
    expect(screen.getByTestId('launch-v3-role-butterfly')).toHaveAttribute('aria-current', 'true')
    expect(screen.getByTestId('launch-v3-role-frog')).toBeInTheDocument()
    expect(screen.getByTestId('launch-v3-roles')).toHaveTextContent('背景：花园')
  })

  it('marks both characters programmable in a duo lesson and starts editing the fox', () => {
    renderRoles('lesson-10-second-friend')
    expect(screen.getByTestId('launch-v3-role-fox')).toHaveTextContent('可编程角色')
    expect(screen.getByTestId('launch-v3-role-bear')).toHaveTextContent('可编程角色')
    expect(screen.getByTestId('launch-v3-role-fox')).toHaveAttribute('aria-current', 'true')
    expect(screen.getByTestId('launch-v3-roles')).toHaveTextContent('当前编辑：小狐狸')
    expect(screen.getByTestId('launch-v3-roles')).toHaveTextContent('背景：森林舞台')
  })
})
