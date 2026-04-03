import { NextResponse } from 'next/server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id,user_id,status,product_code')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 })
  }

  const { data: entitlement } = await supabase
    .from('entitlements')
    .select('status')
    .eq('user_id', user.id)
    .eq('product_code', order.product_code)
    .maybeSingle()
  const unlocked = entitlement?.status === 'active'
  const status = order.status === 'paid' && !unlocked ? 'pending' : order.status

  return NextResponse.json({
    orderId: order.id,
    status,
    unlocked,
  })
}
