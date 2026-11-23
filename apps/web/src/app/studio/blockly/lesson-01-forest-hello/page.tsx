import { currentLessonDraftOwner } from '@/features/lessons/draft-identity'
import { LessonDraftBoundary } from '@/features/lessons/lesson-draft-boundary'

import StudioForestHelloClient from './studio-forest-hello-client'

/**
 * OPS-041 G0 route: resolve the draft/progress owner on the server (the same
 * `currentLessonDraftOwner()` the /learn routes use) and lock the workspace
 * when identity cannot be confirmed. The editor itself stays client-only.
 */
export default async function StudioForestHelloPage() {
  const owner = await currentLessonDraftOwner()
  return (
    <LessonDraftBoundary key={owner} owner={owner}>
      <StudioForestHelloClient />
    </LessonDraftBoundary>
  )
}
