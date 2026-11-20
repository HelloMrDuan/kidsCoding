import { currentCreateOwner } from '@/features/create/create-owner'

export async function GET() {
  return Response.json({ owner: await currentCreateOwner() }, { headers: { 'Cache-Control': 'private, no-store' } })
}
