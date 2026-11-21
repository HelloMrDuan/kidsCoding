import { LocalPracticePortfolio } from '@/features/progress/local-practice-portfolio'
import { currentLessonDraftOwner } from '@/features/lessons/draft-identity'

export default async function PracticePortfolioPage() {
  const gridOwner = await currentLessonDraftOwner()
  return <LocalPracticePortfolio key={gridOwner} gridOwner={gridOwner} />
}
