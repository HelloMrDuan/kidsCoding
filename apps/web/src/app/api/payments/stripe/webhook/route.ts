import type Stripe from 'stripe'
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createStripeClient } from '@/lib/billing/stripe'
import { getRequiredEnv } from '@/lib/env'

export async function POST(request: Request) {
  const stripe = createStripeClient()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'missing-signature' }, { status: 400 })
  }

  const body = await request.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getRequiredEnv('STRIPE_WEBHOOK_SECRET'),
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'invalid-signature',
      },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const productCode = session.metadata?.productCode

    if (userId && productCode) {
      await admin.from('orders').upsert(
        {
          user_id: userId,
          provider: 'stripe',
          provider_session_id: session.id,
          status: 'paid',
          product_code: productCode,
        },
        {
          onConflict: 'provider_session_id',
        },
      )
      await admin.from('entitlements').upsert(
        {
          user_id: userId,
          product_code: productCode,
          status: 'active',
        },
        {
          onConflict: 'user_id,product_code',
        },
      )
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const productCode = session.metadata?.productCode

    if (userId && productCode) {
      await admin.from('orders').upsert(
        {
          user_id: userId,
          provider: 'stripe',
          provider_session_id: session.id,
          status: 'expired',
          product_code: productCode,
        },
        {
          onConflict: 'provider_session_id',
        },
      )
    }
  }

  return NextResponse.json({ received: true })
}
