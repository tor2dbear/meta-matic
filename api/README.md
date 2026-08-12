# meta-matic-api

Tiny Cloudflare Worker that keeps the **certificate ledger** for
[Méta-Matic ∞](https://github.com/tor2dbear/meta-matic).

A work can be *certified* exactly once — first signer wins, everyone after is told
it's taken. That single-owner rule is enforced by the database: `serial` is the
`PRIMARY KEY`, so a second concurrent `/claim` on the same work fails the `INSERT`
instead of racing to a double-owner. Two ways to certify:

- **browser** — an instant, browser-id-backed certificate
- **wallet** — the same, plus a `personal_sign` signature (verifiable provenance)

Storage is **Cloudflare D1** (binding `DB`). Coordinates are derived from the serial
server-side and never trusted from the request.

## API

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET`  | `/stats` | — | `{ total }` (certified count) |
| `GET`  | `/work?serial=<n>` | — | `{ serial, claimed, cert? }` |
| `GET`  | `/claimed` | — | `{ certs: [{serial,u,v,method}] }` (recent 2000, for the map) |
| `POST` | `/claim` | `{ serial, method, id, address?, sig?, gen? }` | won: `{ ok:true, cert, total }` · taken: `{ ok:false, taken:true, cert }` |

CORS is open (`*`) so the static page can call it from any origin.

## Deploy

Requires a (free) Cloudflare account and Node.

```bash
cd api
npx wrangler login

# 1) create the D1 database
npx wrangler d1 create meta-matic-certs
#    -> copy the printed database_id into wrangler.toml

# 2) apply the schema (remote)
npx wrangler d1 execute meta-matic-certs --remote --file=schema.sql

# 3) deploy
npx wrangler deploy
```

`wrangler deploy` should print the bound resource as `env.DB (meta-matic-certs)
D1 Database` — if you still see a `TALLY` KV namespace you're deploying stale code.

Smoke-test:

```bash
curl https://api.tor2dbear.com/meta-matic/stats                 # {"total":0}
curl "https://api.tor2dbear.com/meta-matic/work?serial=4778528" # {"serial":...,"claimed":false}
curl https://api.tor2dbear.com/meta-matic/claimed               # {"certs":[]}
```

## Wire it to the page

Open `index.html` and set the single flag near the top of the script:

```js
const API = "https://api.tor2dbear.com/meta-matic";
```

The Worker is mounted under a path on the shared `api.tor2dbear.com` gateway
(route `api.tor2dbear.com/meta-matic/*` in `wrangler.toml`), so the host root stays
free for other projects. Leave `API` as `""` to run the page fully offline
(`localStorage` only): it degrades gracefully — the global total shows `—`, claim
status falls back to local, and everything else keeps working.

### One-time DNS for the gateway host

A path route does **not** create DNS (only a `custom_domain` does). Give
`api.tor2dbear.com` a proxied placeholder once, in the tor2dbear.com zone:

- Type **AAAA**, name **api**, IPv6 **100::**, Proxy status **Proxied** (orange).

`100::` is a discard address; all real traffic is served by the Worker route. Every
project under `api.tor2dbear.com/*` shares this one record.

## Trade-offs

- **Exclusivity is atomic:** `serial` `PRIMARY KEY` means a duplicate `/claim` fails
  the insert (caught → returned as `taken`) rather than double-owning. No app locks.
- **Abuse:** `/claim` is open and browser-id is cheap, so a script could land-grab
  serials. A per-IP rate limit is the mitigation — parked on the roadmap
  (`roadmap/claim-rate-limit.md`) to keep the deploy simple.
- **Provenance:** wallet claims store the address + signature as-is; the client
  verifies. Server-side signature recovery + persisting the signed message are a
  roadmap item (`roadmap/wallet-sig-verification.md`).

---

# Print shop (v2.1b) — order a physical print

Worldwide, priced **live per destination** so the customer always covers 100% of
cost (print + shipping + Stripe fee + a buffer) — you're never out of pocket, and
idle cost is **$0** (no subscription anywhere). Code: `src/printshop.js`.

Flow: client renders a 300 dpi PNG → `POST /print-image` (stored in R2) → `POST
/print-checkout {serial,imageKey,country}` (live Prodigi quote → Stripe Checkout) →
customer pays → `POST /stripe-webhook` (signature-verified) → Prodigi order created.

## One-time setup

1. **Prodigi** — create an account, grab your **API key**. In the catalogue pick a
   square fine-art print product and put its SKU in `wrangler.toml` → `PRODIGI_SKU`.
   Set `PRINT_CURRENCY` to your Prodigi account currency (avoids FX).
2. **Stripe** — create an account; copy the **test** secret key (`sk_test_…`).
3. **R2 bucket** — `npx wrangler r2 bucket create meta-matic-prints`.
4. **Secrets** (sandbox/test first):
   ```bash
   npx wrangler secret put PRODIGI_API_KEY        # your Prodigi (sandbox) key
   npx wrangler secret put STRIPE_SECRET_KEY      # sk_test_…
   npx wrangler deploy
   ```
5. **Stripe webhook** — Stripe Dashboard → Developers → Webhooks → add endpoint
   `https://api.tor2dbear.com/meta-matic/stripe-webhook`, subscribed to **both**
   `checkout.session.completed` **and** `checkout.session.async_payment_succeeded`
   (the second is what fulfils delayed methods like Klarna/SEPA once they clear).
   Copy its signing secret and:
   ```bash
   npx wrangler secret put STRIPE_WEBHOOK_SECRET  # whsec_…
   npx wrangler deploy
   ```

Once **all three** secrets are set (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`PRODIGI_API_KEY`), `GET /print/config` returns `{enabled:true}` and the site reveals
the **"🖼 Order print"** button. It stays hidden until the webhook secret is in place —
deliberately, so payments are never taken before fulfilment can happen. (This means
the button only appears after step 5 below, not step 4 — that's expected.)

## Test in sandbox (no money, no fulfilment)

`PRODIGI_BASE` defaults to `https://api.sandbox.prodigi.com` and you're on Stripe
test keys. Certify a work → **Order print** → pick a country → pay with Stripe test
card **4242 4242 4242 4242** (any future expiry/CVC). Stripe fires the webhook and a
**sandbox** Prodigi order appears in your Prodigi dashboard — not charged, not
fulfilled. Verify the address + image look right.

## Go live

- `wrangler.toml`: `PRODIGI_BASE = "https://api.prodigi.com"`, confirm `PRODIGI_SKU`.
- Re-put secrets with **live** values: Stripe `sk_live_…`, a **live** webhook's
  `whsec_…`, and your live Prodigi key. `npx wrangler deploy`.

## Pricing (never out of pocket)

`charge = (prodigi_cost + PRICE_FIXED_FEE) / (1 - PRICE_PCT_FEE) + PRICE_BUFFER`,
rounded up. The gross-up covers Stripe's cut so you net the full Prodigi cost; the
buffer absorbs FX/rounding. Tune the three `PRICE_*` vars in `wrangler.toml`.

## Notes / trade-offs

- **`/print-image` is open** (anyone can upload a ≤25 MB PNG to R2). Low-risk
  storage; add a per-IP limit with the `/claim` rate-limit work if needed.
- **Import duties/VAT** on international orders are the recipient's (note shown at
  checkout). At volume, add Stripe Tax (pay-per-use) or restrict `allowed_countries`.
- **Idempotency:** orders use `merchantReference = meta-matic-<serial>`; a webhook
  retry won't duplicate if Prodigi dedupes on it (confirm in your account settings).
