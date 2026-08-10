# meta-matic-api

Tiny Cloudflare Worker that keeps a **global tally of signatures** for
[Méta-Matic ∞](https://github.com/tor2dbear/meta-matic):

- a single global `total`
- a per-work `sig:<serial>` count

so the page can show *"this work has been signed N times"* and a global total —
the small, uncomfortable jab that your "unique" pick was already picked by others.

## API

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET`  | `/stats` | — | `{ total }` |
| `GET`  | `/stats?serial=<n>` | — | `{ total, serial, count }` |
| `POST` | `/sign` | `{ "serial": <n> }` | `{ total, serial, count }` |

CORS is open (`*`) so the static page can call it from any origin.

## Deploy

Requires a (free) Cloudflare account and Node.

```bash
cd api
npx wrangler login

# 1) create the KV namespace
npx wrangler kv namespace create TALLY
#    -> copy the printed id into wrangler.toml (replace REPLACE_WITH_KV_ID)

# 2) deploy
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL, e.g.
`https://meta-matic-api.<your-subdomain>.workers.dev`.

Test it:

```bash
curl https://meta-matic-api.<your-subdomain>.workers.dev/stats
curl -X POST https://meta-matic-api.<your-subdomain>.workers.dev/sign \
  -H 'content-type: application/json' -d '{"serial":4778528}'
```

## Wire it to the page

Once deployed, open `index.html` and set the single flag near the top of the
script:

```js
const API = "https://api.tor2dbear.com/meta-matic";
```

The Worker is mounted under a path on the shared `api.tor2dbear.com` gateway
(route `api.tor2dbear.com/meta-matic/*` in `wrangler.toml`), so the host root
stays free for other projects — each new project adds its own Worker with a
`api.tor2dbear.com/<project>/*` route. The `meta-matic-api.<subdomain>.workers.dev`
URL keeps working as a fallback (the Worker accepts both the prefixed and bare
paths).

### One-time DNS for the gateway host

A path route does **not** create DNS (only a `custom_domain` does). Give
`api.tor2dbear.com` a proxied placeholder once, in the tor2dbear.com zone:

- Type **AAAA**, name **api**, IPv6 **100::**, Proxy status **Proxied** (orange).

`100::` is a discard address; all real traffic is served by the Worker route,
never an origin. Every project under `api.tor2dbear.com/*` shares this one record.

Leave it as `""` to run the page fully offline (local `localStorage` only, no
network). The page degrades gracefully: if `API` is empty or the Worker is
unreachable, the global total shows `—` and the "signed N times" line is hidden,
while everything else keeps working.

## Trade-offs

- **Consistency:** KV read-modify-write isn't atomic; simultaneous signs can lose a
  count. Fine for this traffic. For exactness, move the counter to a Durable Object.
- **Limits (free tier):** ~1,000 writes/day (each sign = 2 writes); reads are cheap
  and eventually consistent (a fresh `/stats` may lag a `/sign` by up to ~60s).
- **Abuse:** `/sign` is open by design. Add a per-IP rate limit later if needed.
