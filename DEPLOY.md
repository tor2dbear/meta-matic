# Deploy & CI/CD

How the site and the API get to production, and the merge-gated flow we want.

## What deploys what

| Piece | Source | Deployed by | Today |
|-------|--------|-------------|-------|
| **Site** — `index.html` + `og.png`, `robots.txt`, `sitemap.xml` (repo root, no build) | root `wrangler.jsonc` (static assets) | **Cloudflare Workers Builds** — a **Workers (static assets)** project, *not* Pages | `main` → prod; other branches → preview URL |
| **API** — `api/` Worker (Stripe + Prodigi + D1 + R2) | `api/wrangler.toml` | `wrangler deploy`, run manually | live keys; deployed by hand |

There is **no GitHub Actions** in this repo — deployment is Cloudflare-native.

The site Worker's config lives in the committed root **`wrangler.jsonc`** (`name`, `compatibility_date`,
`preview_urls: true`, `assets.directory: "."`), with **`.assetsignore`** keeping backend source /
docs out of the served bundle. It's a Workers *static-assets* project — unlike a Pages project
(e.g. `cadence`), branch previews aren't automatic: they run `wrangler versions upload`, which is
why an explicit config with `preview_urls` is required for the preview build to succeed.

## The flow we want

Develop on a branch → **Cloudflare preview URL** → open a PR → review → **merge to
`main`** → *only then* does production change. Exactly like the other sites.

Cloudflare Workers Builds supports this natively (no Actions needed). It's three
settings in the dashboard: **Workers & Pages → (the site Worker) → Settings → Builds**.

1. **Production branch = `main`.**
   Pushes to `main` (i.e. merges) run the **Deploy command** `npx wrangler deploy` → production.
2. **Enable "Non-production branch builds"** with the **Version command** `npx wrangler versions upload`.
   Every push to a non-`main` branch uploads a **preview version** with its own
   `*.workers.dev` **preview URL** (needs `preview_urls: true` in `wrangler.jsonc`), and
   Cloudflare comments that URL on the PR — production is untouched.
3. Leave the custom domain pointed at the **production** deployment, so it only
   moves on a merge to `main`.

Result: pushing to a `claude/…` (or any) branch → preview only; merging the PR →
production.

## Status / gotchas (already sorted)

- **Production branch = `main`** and non-production builds are enabled. ✅
- The **Version command** must be `npx wrangler versions upload` (not `wrangler deploy`) —
  otherwise every branch push deploys straight to **production**. This was the original
  "every push went live" bug. ✅ fixed.
- Preview builds also need the committed **`wrangler.jsonc`** (with `preview_urls: true`);
  without it `versions upload` fails instantly at the config stage. ✅ added.
- Because the production deploy only runs on a **merge to `main`**, any config change here is
  safe to trial on a branch first: the preview build exercises it without touching prod.

## The API Worker (real Stripe/Prodigi money)

Do **not** auto-deploy the API per branch — a preview API with live keys would take
real orders. Keep it merge-gated:

- Deploy the API only from `main`, and **always pass the config explicitly**:

  ```
  cd api
  npx wrangler deploy --config wrangler.toml
  ```

  ⚠️ The repo root has a `wrangler.jsonc` (for the *site* Worker's preview builds). Wrangler
  will pick that up and deploy the **site** Worker (`meta-matic`) — uploading the whole repo as
  assets — even when you run from `api/`, unless you point it at `api/wrangler.toml` with
  `--config`. Without `--config` you deploy the wrong Worker. (Alternatively, add a second
  Workers Build whose root dir is `api/`, production branch `main`.)
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
# merge to main  ->  production (site) deploys automatically
# API changed?  ->  after merge, from main:  cd api && npx wrangler deploy --config wrangler.toml
```

Never `wrangler deploy` the **site** by hand — Workers Builds owns it on merge. A manual root
deploy also drags `.git/`/`.wrangler/` into the asset bundle (see `.assetsignore`).
