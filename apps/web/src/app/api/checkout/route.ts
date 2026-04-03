import { NextResponse } from 'next/server'

import { createPaymentOrderService } from '@/features/billing/payment-orders'
import { resolvePaymentProvider } from '@/features/billing/payment-provider-registry'
import { launchCoursePack } from '@/features/billing/course-pack'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDefaultPaymentProvider, getRequiredEnv, hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const admin = createAdminClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) {
    return NextResponse.json({ error: 'missing-user' }, { status: 401 })
  }

  const appUrl = getRequiredEnv('NEXT_PUBLIC_APP_URL')
  const providerName = getDefaultPaymentProvider()
  const provider = resolvePaymentProvider(providerName)
  const provisionalProviderOrderId = `draft_${crypto.randomUUID()}`
  const { data: order, error } = await admin
    .from('orders')
    .insert({
      user_id: user.id,
      provider: providerName,
      provider_session_id: provisionalProviderOrderId,
      status: 'created',
      product_code: launchCoursePack.productCode,
      amount_cny: launchCoursePack.priceCny,
    })
    .select('id')
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'order-create-failed' }, { status: 500 })
  }

  const successUrl = `${appUrl}/parent/purchase/success?order=${order.id}`
  const payment = await provider.createPayment({
    orderId: order.id,
    userId: user.id,
    productCode: launchCoursePack.productCode,
    title: launchCoursePack.title,
    amountCny: launchCoursePack.priceCny,
    successUrl,
  })
  const orderService = createPaymentOrderService({
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

  await orderService.applyCreatePaymentResult({
    orderId: order.id,
    provider: payment.provider,
    providerOrderId: payment.providerOrderId,
    status: payment.status === 'created' ? 'created' : 'pending',
    qrCodeValue: payment.qrCodeValue,
    qrExpiresAt: payment.qrExpiresAt,
  })

  return NextResponse.json({
    orderId: order.id,
    provider: payment.provider,
    status: payment.status,
    qrCodeValue: payment.qrCodeValue,
    successUrl,
    checkoutUrl: payment.provider === 'stripe' ? payment.qrCodeValue : undefined,
  })
}
