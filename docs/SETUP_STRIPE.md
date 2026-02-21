# Stripe Billing Setup

To use "Upgrade to Pro" on the dashboard, configure Stripe.

## Steps

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Create a product: **Products > Add product** (e.g. "Pro" at 29/mo)
3. Add a recurring price (monthly)
4. Copy the **Price ID** (starts with `price_`)
5. Go to **Developers > Webhooks > Add endpoint**
6. Endpoint URL: `https://your-domain.com/api/stripe/webhook` (for local testing use Stripe CLI to forward)
7. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
8. Copy the **Signing secret** (starts with `whsec_`)

## Add to .env.local

```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxxxxxxx
```

## Local Webhook Testing

For local development, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## Restart

Restart the dev server after adding the keys.

## Testing

Click "Upgrade to Pro" on the dashboard. You'll be redirected to Stripe Checkout. After payment, the webhook updates your profile to `plan: pro`. If Stripe is not configured, the Upgrade button will show an error message.
