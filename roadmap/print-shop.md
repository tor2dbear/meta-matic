---
title: "Print shop — order a physical giclée"
status: done
tags: [commerce, print]
updated: 2026-08-13
---

## Goal
Let a holder of a certified work order a real fine-art print of it, priced live per
country, with the seller never out of pocket and payment/fulfilment fully automated.

## Delivered
End-to-end shop on a Cloudflare Worker + D1 + R2, fronted by the single-page site:

- **Flow:** certify → "Order a print" → 6000 px render uploaded to R2 → Stripe Checkout
  (hosted) → on paid webhook, a Prodigi order is created against the shipping address.
  Exactly-once fulfilment via a D1 `print_orders` row + Prodigi `Idempotency-Key`, so a
  Stripe retry or a mid-flight crash never double-orders or strands a paid order.
- **Pricing (never out of pocket), modelled for a Swedish VAT-registered B2C seller:**
  `charge = ((base + margin)·(1 + vat) + fixed)/(1 − pct) + buffer`. `base` = Prodigi
  items + shipping (ex-VAT; input VAT is reclaimed). `vat` = output VAT the seller
  remits — home rate on EU sales, 0 % on non-EU exports. All levers in `wrangler.toml`
  (`PRICE_*`, `PRICE_VAT_RATE`, `PRICE_VAT_RATES`).
- **Two sizes:** 20×20″ and 12×12″, config-driven (`PRINT_SIZES`), each quoted, charged
  and ordered on its own SKU. Order dialog shows a live price per size for the chosen
  country via a session-free `/print-quote`.
- **Return-from-Stripe confirmation:** returning to `/?print=ok` shows a clear
  "✓ Print ordered" modal (replaced the easy-to-miss banner; no email promised that we
  don't send).
- **Export fixes:** wordmark matches the site (bold sans, ∞ in signal), uniform margins,
  and the ribbon's joint-fills wound to match the strokes (killed the dashed/stitched
  look at print resolution).
- **Live:** Prodigi production API, live Stripe keys + live webhook, Budget shipping.

## Notes / possible follow-ups
- VAT rate defaults to 25 %; confirm the art rate (Sweden's 12 % can apply to an
  artist's own work) and the EU OSS threshold with an accountant — both tunable via env.
- Drop the temporary D1 `webhook_debug` table (left behind after the signature-mismatch
  debugging; nothing writes to it now).
