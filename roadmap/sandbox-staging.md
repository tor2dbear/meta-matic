---
title: "Parallel sandbox/staging environment for the print shop"
status: next
tags: [devops, print]
updated: 2026-08-13
---

## Goal
Be able to run and test the full order pipeline against the **sandbox** Stripe + Prodigi
in parallel with production, so future changes (pricing, sizes, webhook logic) can be
verified end-to-end without touching live money or live orders.

## Today
There is one worker with live secrets and `PRODIGI_BASE = https://api.prodigi.com`.
Going live was a one-way flip of the base URL + swapping secrets; there's no way to
exercise the real flow in sandbox afterwards without disrupting production.

## Approach
Use a second Wrangler **environment** (e.g. `[env.sandbox]`) that deploys a separate
worker (its own route/subdomain, e.g. `api-sandbox.…`) with:
- sandbox `PRODIGI_BASE`, sandbox Prodigi key, test Stripe keys, and a **test-mode**
  Stripe webhook pointing at the sandbox worker's `/stripe-webhook`;
- its own D1 + R2 bindings (or clearly namespaced) so test orders never mix with live;
- a staging copy of the site (or a `?env=sandbox` switch) pointing `API` at the sandbox
  worker.

Then: develop → deploy to `sandbox` → test with Stripe test cards + Prodigi sandbox →
promote the same code to production with `wrangler deploy`. Secrets differ per env;
`wrangler.toml` vars can be overridden per `[env.*]`.

## Open questions
- Separate D1/R2 per env vs shared with a prefix?
- Staging site as a distinct Pages project, or a runtime `API` toggle on the same site?
- Worth a tiny "env banner" on the sandbox site so it's never mistaken for live.
