import type Stripe from 'stripe'

import { createStripeClient } from '@/lib/billing/stripe'
import { getRequiredEnv } from '@/lib/env'
import { mapProviderStatus } from '../payment-status'
import type { PaymentProvider } from '../payment-provider'

function mapStripeSessionStatus(session: Stripe.Checkout.Session) {
  if (session.status === 'expired') {
    return 'expired'
  }

  if (session.payment_status === 'paid') {
    return 'paid'
  }

  return 'pending'
}

export function createStripeProvider(): PaymentProvider {
  return {
    name: 'stripe',
    async createPayment(input) {
      const stripe = createStripeClient()
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'cny',
              product_data: {
                name: input.title,
              },
              unit_amount: input.amountCny,
            },
            quantity: 1,
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.successUrl,
        metadata: {
          userId: input.userId,
          productCode: input.productCode,
          orderId: input.orderId,
        },
      })

      return {
        provider: 'stripe',
        providerOrderId: session.id,
        status: mapStripeSessionStatus(session),
        qrCodeValue: session.url ?? '',
        qrExpiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
      }
    },
    async parseWebhook(request) {
      const stripe = createStripeClient()
      const signature = request.headers.get('stripe-signature')

      if (!signature) {
        throw new Error('missing-signature')
      }

      const body = await request.text()
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        getRequiredEnv('STRIPE_WEBHOOK_SECRET'),
      )
      const session = event.data.object as Stripe.Checkout.Session

      return {
        providerOrderId: session.id,
        providerStatus: event.type,
        status:
          event.type === 'checkout.session.completed'
            ? mapProviderStatus('paid')
            : event.type === 'checkout.session.expired'
              ? mapProviderStatus('expired')
              : mapProviderStatus('failed'),
      }
    },
    async queryPayment(input) {
      const stripe = createStripeClient()
      const session = await stripe.checkout.sessions.retrieve(input.providerOrderId)

      return {
        providerStatus: session.payment_status ?? session.status ?? 'open',
        status: mapStripeSessionStatus(session),
      }
    },
  }
}
