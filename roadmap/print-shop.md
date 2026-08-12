---
title: "Print shop"
status: now
tags: [commerce]
updated: 2026-08-12
---

## Goal
Let a collector order their certified work as a physical print — the ultimate "pay
to own something that was never original." Constraint: **zero fixed cost.** No
subscription; every cost (print + shipping + payment fee) is covered per-order by the
customer. Expected volume is ~0, so idle cost must be $0.

## Delivered — v2.0 (download a print file)
A "↓ Print · 300 dpi" button on each of your certificates ("Certified · you"),
alongside "Save image". Renders the work at **3600×3600 px (12 in @ 300 dpi)** and
downloads it — print-ready at any framer. Gated to your own certificates (the drawer
only lists yours). Reuses `exportCanvas(entry, S)` (text/margins scale with size).
Nearly free, no payment flow; ~90% of the experience and a demand signal.

## Research — v2.1 (a real shop)

### Providers (all confirmed no-subscription, pay-per-order)
- **Prodigi** — *recommended.* No setup fee, no monthly fee, no subscription; you pay
  only when an order goes to print (base product + shipping). Full **print API** for
  automated fulfilment + a **sandbox** for testing. Fine Art Trade Guild-approved →
  museum-quality giclée. API access has no extra monthly fee. Best fit for an art piece.
- **Gelato** — also free / pay-per-order, but *API-level integration* skews toward the
  paid Platinum tier; Gelato+ is $29.99/mo. Weaker fit given the no-subscription rule.
- **Payment: Stripe** — no monthly fee, per-transaction only (~2.9% + fixed). Checkout
  is free, hosted, collects the shipping address and can compute shipping. `$0` idle.

### Zero-fixed-cost architecture (fully automated)
Everything is pay-per-use, so idle cost is `$0`:
1. Customer clicks "Order print" on a certified work.
2. Client renders the 3600px PNG (v2.0's `exportCanvas`) and uploads it to the Worker
   → **R2** (free tier, no egress) → a fetchable image URL.
3. Worker fetches a live **Prodigi quote** (product + shipping to the destination),
   adds the Stripe fee + a small buffer, and opens a **Stripe Checkout Session** at
   that price → the customer covers 100% of cost. Collect the address in Checkout.
4. Stripe webhook → Worker → create the **Prodigi order** (SKU + R2 image URL +
   address). Prodigi prints & ships; customer gets tracking.
- Backend = the existing Cloudflare Worker + Stripe webhook + R2. Secrets (Stripe +
  Prodigi keys) via `wrangler secret`. No new vendor, no subscription.

### Leaner alternative (matches "~0 orders" honestly)
- **v2.1a — manual fulfilment.** "Order print" → a **Stripe Payment Link** (fixed price
  set to cover worst-case product + shipping + fee) or a short form. When an order comes
  in, place it by hand in Prodigi's dashboard (upload the PNG, enter the address). Zero
  pipeline to build/maintain, `$0` idle. Best first step at 0 expected orders; upgrade to
  the automated flow only if orders actually materialise.

## Delivered — v2.1b (built, sandbox-first)
Decision: **worldwide, automated, live-priced** (not the manual v2.1a). Built in
`api/src/printshop.js` + the frontend "🖼 Order print" flow:

- Client renders the 300 dpi PNG → `/print-image` (R2) → `/print-checkout` (live
  **Prodigi quote** for the chosen country → **Stripe Checkout**) → `/stripe-webhook`
  (signature-verified) → **Prodigi order**. Dependency-free (fetch + WebCrypto).
- Priced so the customer covers 100% of cost, per destination — never out of pocket,
  `$0` idle. The button only appears once the backend reports it's configured.

**Left to go live (all on the owner):** create Stripe + Prodigi accounts, pick the
Prodigi SKU + currency, `wrangler r2 bucket create meta-matic-prints`, set the three
secrets, add the Stripe webhook, test in sandbox (test card 4242…), then flip
`PRODIGI_BASE` + live keys. Full checklist in `api/README.md`.

## Open questions
- Which exact Prodigi SKU / size(s)? (One square fine-art print to start; could offer
  a size picker later.)
- Idempotency: confirm Prodigi dedupes on `merchantReference` so a webhook retry can't
  double-order.
- International VAT/duties: leave to the recipient (current), or add Stripe Tax later?
