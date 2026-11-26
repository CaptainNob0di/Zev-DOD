// Supabase Edge Function: zev-pay
// Starts a Stripe payment for a ZEV Coin pack or a store item and returns the client secret the game's checkout needs.
// Prices come from the database (zev_packs / zev_items), never from the game.
// Secrets needed (Edge Functions > Secrets): STRIPE_SECRET_KEY. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are built in.
// Deploy with "Verify JWT" ON (the game sends the player's sign-in token).
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const ALLOWED_ORIGINS = ['https://zevsocialconnect.com', 'https://www.zevsocialconnect.com'];
const FIGHTERS = ['perci', 'miracle', 'chatgpt', 'jessica', 'mixi'];

function cors(req: Request) {
  const o = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(o) || o.startsWith('http://localhost') ? o : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'POST only' }, 405);
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return json(req, { error: 'Not signed in' }, 401);

  let body: { pack?: string; item?: string; char?: string };
  try { body = await req.json(); } catch { return json(req, { error: 'Bad request' }, 400); }

  let amount = 0, description = '';
  const metadata: Record<string, string> = { user_id: user.id, game: 'perci-shorti' };
  if (body.pack) {
    const { data: p } = await sb.from('zev_packs').select('*').eq('id', body.pack).single();
    if (!p) return json(req, { error: 'No such coin pack' }, 400);
    amount = p.usd_cents; description = `Perci Shorti: ${p.coins.toLocaleString()} ZEV Coins`;
    Object.assign(metadata, { kind: 'pack', what: p.id, coins: String(p.coins) });
  } else if (body.item) {
    const { data: it } = await sb.from('zev_items').select('*').eq('id', body.item).single();
    if (!it) return json(req, { error: 'No such item' }, 400);
    const ch = FIGHTERS.includes(body.char ?? '') ? body.char! : '';
    if (it.per_char && !ch) return json(req, { error: 'Pick a fighter first' }, 400);
    if (it.once || it.max_qty) {   // don't take money for something they can't get
      const { data: have } = await sb.from('zev_owned').select('qty').eq('user_id', user.id).eq('item', it.id).eq('char', it.per_char ? ch : '').maybeSingle();
      if (have && (it.once || have.qty >= it.max_qty)) return json(req, { error: 'You already have that' }, 400);
    }
    amount = it.usd_cents; description = `Perci Shorti store: ${it.id}${ch ? ' (' + ch + ')' : ''}`;
    Object.assign(metadata, { kind: 'item', what: it.id, char: ch });
  } else return json(req, { error: 'Nothing to buy' }, 400);

  const pi = await stripe.paymentIntents.create({
    amount, currency: 'usd', description, metadata,
    automatic_payment_methods: { enabled: true },   // card, Apple Pay, Google Pay, Cash App Pay, Link, PayPal: whatever is on in Stripe
  });
  return json(req, { clientSecret: pi.client_secret });
});
