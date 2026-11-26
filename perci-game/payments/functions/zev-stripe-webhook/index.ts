// Supabase Edge Function: zev-stripe-webhook
// Stripe calls this after a payment goes through. It records the payment once and delivers the coins or the item.
// Secrets needed: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (from the Stripe webhook you create).
// Deploy with "Verify JWT" OFF (Stripe signs its own requests; this function checks that signature).
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const crypto = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig ?? '', Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '', undefined, crypto);
  } catch (e) {
    return new Response('Bad signature', { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const m = pi.metadata ?? {};
    if (m.game !== 'perci-shorti' || !m.user_id) return new Response('ignored', { status: 200 });
    // one row per payment: if Stripe retries, the insert fails and nothing is delivered twice
    const { error } = await sb.from('zev_purchases').insert({
      id: pi.id, user_id: m.user_id, kind: m.kind, what: m.what, char: m.char || null,
      coins: Number(m.coins ?? 0), amount_cents: pi.amount_received, currency: pi.currency, status: 'paid',
    });
    if (error) {
      if (error.code === '23505') return new Response('already done', { status: 200 });
      return new Response('db error', { status: 500 });   // Stripe will retry
    }
    const r = m.kind === 'pack'
      ? await sb.rpc('zev_credit', { p_user: m.user_id, p_coins: Number(m.coins) })
      : await sb.rpc('zev_grant', { p_user: m.user_id, p_item: m.what, p_char: m.char ?? '' });
    if (r.error) {
      await sb.from('zev_purchases').delete().eq('id', pi.id);   // let Stripe's retry deliver it
      return new Response('deliver error', { status: 500 });
    }
  }

  if (event.type === 'charge.refunded') {   // mark refunds so you can see them; coins already spent can't be taken back
    const ch = event.data.object as Stripe.Charge;
    if (ch.payment_intent) await sb.from('zev_purchases').update({ status: 'refunded' }).eq('id', String(ch.payment_intent));
  }
  return new Response('ok', { status: 200 });
});
