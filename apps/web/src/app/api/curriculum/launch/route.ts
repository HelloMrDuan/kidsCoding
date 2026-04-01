import { NextResponse } from 'next/server'

import { loadLaunchCurriculum } from '@/features/curriculum/load-launch-curriculum'

export async function GET() {
  const curriculum = await loadLaunchCurriculum()

  return NextResponse.json(curriculum, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
