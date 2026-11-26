# Turning on real-money payments (ZEV Coins and store items)

The store, ZEV Coins and the "pay with ZEV Coins" option already work. This guide turns on the second option in the
checkout window: **card, Apple Pay, Google Pay, Cash App Pay, Link and PayPal**, all through Stripe.
Until you finish it, that option shows "Not switched on yet" and nobody can be charged.

Everything below can be done from a phone browser. It takes about 30 minutes. Do it in **Stripe test mode** first.

**Never paste a secret key (`sk_live_...`, `sk_test_...`, `whsec_...`) or your Supabase service_role key into a chat,
an email or the game files.** Only the *publishable* key (`pk_...`) goes in the game.

---

## 1. Stripe account
1. Sign up at **stripe.com** and finish "Activate payments" (business details, bank account for payouts).
2. **Settings > Payment methods**: turn on Cards, Apple Pay, Google Pay, Link, Cash App Pay, and PayPal if it's
   offered for your account. The game shows whichever ones are on.
3. **Settings > Payment method domains**: add `zevsocialconnect.com` (needed for Apple Pay and Google Pay).
4. Optional: **Stripe Tax** if you need to collect sales tax.

## 2. Supabase database (project `gfxtobocpqagikouxqmp`)
1. **SQL Editor > New query**: paste all of `payments/payments.sql`, then tap **Run**. It's safe to run again later.
2. **Authentication > Sign In / Providers**: turn on **Allow anonymous sign-ins**. Each player gets a quiet account,
   so coins they buy stay theirs.

## 3. The two server functions (Supabase > Edge Functions)
1. **Deploy a new function > Via editor**, name it `zev-pay`. Paste `payments/functions/zev-pay/index.ts` and deploy.
   Leave **Verify JWT** on.
2. Make another one named `zev-stripe-webhook`. Paste `payments/functions/zev-stripe-webhook/index.ts` and deploy.
   Turn **Verify JWT off** for this one (Stripe signs its own requests and the function checks that).
3. **Edge Functions > Secrets**: add `STRIPE_SECRET_KEY` (Stripe > Developers > API keys > Secret key).

## 4. Stripe webhook
1. Stripe > **Developers > Webhooks > Add endpoint**.
2. URL: `https://gfxtobocpqagikouxqmp.supabase.co/functions/v1/zev-stripe-webhook`
3. Events: `payment_intent.succeeded` and `charge.refunded`.
4. Copy the **Signing secret** (`whsec_...`) into Supabase **Edge Functions > Secrets** as `STRIPE_WEBHOOK_SECRET`.

## 5. Switch it on in the game
In `perci-game/index.html`, fill in:

```js
window.ZEV_PAY = { stripeKey: 'pk_test_...', functionsUrl: 'https://gfxtobocpqagikouxqmp.supabase.co/functions/v1' };
```

Or send Claude the **publishable** key (`pk_test_...`, then `pk_live_...` later) and it'll do this for you.

## 6. Test it
1. Open the game with your preview link (that opens the store before Jan 7).
2. **STORE > a coin pack > CARD**. Pay with Stripe's test card `4242 4242 4242 4242`, any future date and any CVC.
3. The coins should show up within a few seconds. Check Supabase **Table Editor > zev_purchases** and **zev_wallets**.
4. When it all works, switch Stripe to live mode, put the `pk_live_...` key in the game, make the live webhook and
   swap the two secrets for their live versions.

---

### How it works
- **Prices live in the database** (`zev_items`, `zev_packs`), so the game can't change what someone pays. To change a
  price, edit those tables and the `usd` / `cost` numbers in `game.js` (STORE_ITEMS, COIN_PACKS) so the screen matches.
- **`zev-pay`** checks who's signed in, looks up the price and starts a Stripe payment.
- **`zev-stripe-webhook`** runs when Stripe says the money arrived. It records the payment once (`zev_purchases`) and
  delivers the coins or the item.
- **Paying with ZEV Coins** goes through `zev_spend`, which checks the price and balance on the server.
- **Coins earned by playing** are added through `zev_earn`: at most 300 per match, one match every 20 seconds and
  4,000 a day, which limits cheating.

### Before going live
- **Terms and refunds.** The store says coins have no cash value and sales are final where the law allows. Add a
  short terms page and link it from the store.
- **Age.** Story Mode carries a mature-content notice. Card networks and app stores expect you to take reasonable
  steps around minors making purchases. Stripe's own terms also apply to you.
- **Refunds.** Refunds you make in Stripe are marked in `zev_purchases`. Coins already spent aren't taken back
  automatically.
