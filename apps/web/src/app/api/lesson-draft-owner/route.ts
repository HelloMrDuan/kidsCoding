import { currentLessonDraftOwner } from '@/features/lessons/draft-identity'

export async function GET() {
  return Response.json({ owner: await currentLessonDraftOwner() }, { headers: { 'Cache-Control': 'private, no-store' } })
}
