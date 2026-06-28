import { NextResponse } from 'next/server'

// Lightweight liveness probe for load balancers and deployment platforms.
// Deliberately does NOT touch Supabase or any external dependency: a 200 here
// only means the Node process is up and Next.js is routing. Deep checks
// (Supabase reachability, payment provider reachability) should be handled by
// a separate readiness probe or external monitoring, not this endpoint.
export function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
