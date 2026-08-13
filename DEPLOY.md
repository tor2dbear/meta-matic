# Deploy & CI/CD

How the site and the API get to production, and the merge-gated flow we want.

## What deploys what

| Piece | Source | Deployed by | Today |
|-------|--------|-------------|-------|
| **Site** — `index.html` + `og.png`, `robots.txt`, `sitemap.xml` (repo root, no build) | this repo | **Cloudflare Workers Builds** (connected to the GitHub repo) | every push to the connected branch builds & deploys |
| **API** — `api/` Worker (Stripe + Prodigi + D1 + R2) | `api/wrangler.toml` | `wrangler deploy`, run manually | live keys; deployed by hand |

There is **no GitHub Actions** in this repo — deployment is Cloudflare-native.

## The flow we want

Develop on a branch → **Cloudflare preview URL** → open a PR → review → **merge to
`main`** → *only then* does production change. Exactly like the other sites.

Cloudflare Workers Builds supports this natively (no Actions needed). It's three
settings in the dashboard: **Workers & Pages → (the site Worker) → Settings → Builds**.

1. **Production branch = `main`.**
   Pushes to `main` (i.e. merges) deploy to production / the custom domain.
2. **Enable "Non-production branch builds"** (preview deployments).
   Every push to a non-`main` branch builds and gets its own
   `*.workers.dev` **preview URL**, and Cloudflare comments that URL on the PR.
3. Leave the custom domain pointed at the **production** deployment, so it only
   moves on a merge to `main`.

Result: pushing to a `claude/…` (or any) branch → preview only; merging the PR →
production.

## ⚠️ Migration order (do this once, in this order)

Production branch is currently **not** `main` (it's been auto-deploying the working
branch — that's why every push went live). If you just flip the production branch to
`main` first, Cloudflare will deploy whatever is on `main` *now* (older) over prod.

So:

1. **Merge the current working branch into `main`** via its PR, so `main` equals
   what is already live.
2. **Then** set **Production branch = `main`** in the dashboard.
3. **Then** enable non-production branch builds (previews).

After that, `main` is production and every other branch is a preview.

## The API Worker (real Stripe/Prodigi money)

Do **not** auto-deploy the API per branch — a preview API with live keys would take
real orders. Keep it merge-gated:

- Deploy the API only from `main` (manually with `wrangler deploy`, or add a second
  Workers Build whose root dir is `api/` with production branch `main`).
- To exercise API changes safely before merge, stand up the **sandbox worker**
  (separate route, test Stripe keys, sandbox Prodigi, its own D1/R2) described in
  [`roadmap/sandbox-staging.md`](roadmap/sandbox-staging.md). That's the parallel
  test environment — previews for the API without touching live money.

## Day-to-day, once set up

```
git switch -c my-change            # branch off main
# …edit…
git push -u origin my-change       # Cloudflare builds a preview + comments the URL on the PR
# open a PR, review against the preview URL
# merge to main  ->  production deploys
# API changed?  ->  after merge, deploy it from main (or via the sandbox first)
```
