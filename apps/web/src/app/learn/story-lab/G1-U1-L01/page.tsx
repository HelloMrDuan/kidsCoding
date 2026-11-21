import { currentLessonDraftOwner } from '@/features/lessons/draft-identity'
import { LessonDraftBoundary } from '@/features/lessons/lesson-draft-boundary'
import StoryLabPage from '../[lessonId]/page'

export default async function OriginalOpeningStoryPage() {
  const owner = await currentLessonDraftOwner()
  return <LessonDraftBoundary key={owner} owner={owner}>
    <StoryLabPage params={Promise.resolve({ lessonId: 'G1-U1-L01' })} />
  </LessonDraftBoundary>
}
