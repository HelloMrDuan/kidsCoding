import { NextResponse } from 'next/server'

import { createPaymentOrderService } from '@/features/billing/payment-orders'
import { resolvePaymentProvider } from '@/features/billing/payment-provider-registry'
import type { PaymentProviderName } from '@/features/billing/payment-provider'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params

  if (provider !== 'stripe' && provider !== 'aggregated_cn') {
    return NextResponse.json({ error: 'unsupported-provider' }, { status: 404 })
  }

  const paymentProvider = resolvePaymentProvider(provider as PaymentProviderName)
  let parsed: Awaited<ReturnType<typeof paymentProvider.parseWebhook>>

  try {
    parsed = await paymentProvider.parseWebhook(request)
  } catch (error) {
    if (error instanceof Error && error.message === 'invalid-signature') {
      return NextResponse.json({ error: 'invalid-signature' }, { status: 400 })
    }

    throw error
  }

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id,user_id,product_code')
    .eq('provider_session_id', parsed.providerOrderId)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ received: true, ignored: true })
  }

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
        {
          onConflict: 'user_id,product_code',
        },
      )
    },
  })

  if (parsed.status === 'paid') {
    await service.markOrderPaid({
      orderId: order.id,
      userId: order.user_id,
      productCode: order.product_code,
      providerStatus: parsed.providerStatus,
    })
  } else {
    await admin
      .from('orders')
      .update({
        status: parsed.status,
        provider_status: parsed.providerStatus,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', order.id)
  }

  return NextResponse.json({ received: true })
}
