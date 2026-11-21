import { StoryGoldenClassroom } from '@/features/lessons/story/story-golden-classroom'
import { currentLessonDraftOwner } from '@/features/lessons/draft-identity'
import { LessonDraftBoundary } from '@/features/lessons/lesson-draft-boundary'

export default async function FoxOpeningClassroomPage() {
  const owner = await currentLessonDraftOwner()
  return <LessonDraftBoundary key={owner} owner={owner}><StoryGoldenClassroom /></LessonDraftBoundary>
}
