import { NextResponse } from 'next/server'

import { launchCoursePack } from '@/features/billing/course-pack'
import { createAdminClient } from '@/lib/supabase/admin'
import { createStripeClient } from '@/lib/billing/stripe'
import { getRequiredEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const admin = createAdminClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) {
    return NextResponse.redirect(`${getRequiredEnv('NEXT_PUBLIC_APP_URL')}/auth/bind`, 303)
  }

  const stripe = createStripeClient()
  const appUrl = getRequiredEnv('NEXT_PUBLIC_APP_URL')
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'cny',
          product_data: {
            name: launchCoursePack.title,
          },
          unit_amount: launchCoursePack.priceCny,
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/parent/overview?purchase=success`,
    cancel_url: `${appUrl}/parent/purchase?purchase=cancelled`,
    metadata: {
      userId: user.id,
      productCode: launchCoursePack.productCode,
    },
  })

  await admin.from('orders').upsert(
    {
      user_id: user.id,
      provider: 'stripe',
      provider_session_id: session.id,
      status: 'created',
      product_code: launchCoursePack.productCode,
    },
    {
      onConflict: 'provider_session_id',
    },
  )

  if (!session.url) {
    return NextResponse.json({ error: 'missing-checkout-url' }, { status: 500 })
  }

  return NextResponse.redirect(session.url, 303)
}
