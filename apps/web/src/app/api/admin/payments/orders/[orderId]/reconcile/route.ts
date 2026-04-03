import { NextResponse } from 'next/server'

import { assertAdminUser } from '@/features/admin/admin-auth'
import { createPaymentOrderService } from '@/features/billing/payment-orders'
import { resolvePaymentProvider } from '@/features/billing/payment-provider-registry'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: authData } = await supabase.auth.getUser()

  try {
    assertAdminUser(authData.user)
  } catch {
    return NextResponse.json({ ok: false, error: 'admin-auth-required' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select('id,user_id,product_code,provider,provider_session_id')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ ok: false, error: 'order-not-found' }, { status: 404 })
  }

  const provider = resolvePaymentProvider(order.provider)
  const queried = await provider.queryPayment({
    orderId: order.id,
    providerOrderId: order.provider_session_id,
  })
  const service = createPaymentOrderService({
    updateOrder: async (input) => {
      await admin.from('orders').update(input).eq('id', order.id)
    },
    upsertEntitlement: async (input) => {
      await admin.from('entitlements').upsert(
        {
          user_id: input.userId,
          product_code: input.productCode,
          status: input.status,
        },
        { onConflict: 'user_id,product_code' },
      )
    },
  })

  if (queried.status === 'paid') {
    await service.markOrderPaid({
      orderId: order.id,
      userId: order.user_id,
      productCode: order.product_code,
      providerStatus: queried.providerStatus,
    })
  } else {
    await admin
      .from('orders')
      .update({
        status: queried.status,
        provider_status: queried.providerStatus,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', order.id)
  }

  return NextResponse.json({ ok: true, status: queried.status })
}
