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
