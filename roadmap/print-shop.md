---
title: "Print shop"
status: next
tags: [commerce]
updated: 2026-08-12
---

## Goal
Let a collector order their certified work as a physical print — the ultimate "pay
to own something that was never original."

## Research
The art is already vector-like canvas, so any work renders at 300 dpi for free — the
hard part is commerce, not the image. Stage it:

- **v2.0 — download a print file.** 300 dpi PNG/PDF of a certified work. Nearly free,
  no payment flow; ~90% of the experience, good demand signal.
- **v2.1 — real shop.** Print-on-demand via Gelato/Prodigi (poster/canvas, dropship,
  no inventory) + Stripe Checkout. Their API takes an image URL + product and handles
  print & shipping. A couple of days' work, mostly around payment / fulfilment /
  shipping edge cases.

## Open questions
- Gate print behind an owned certificate, or let anyone print any work?
- Ship v2.0 (download) first to validate demand before wiring payments?
