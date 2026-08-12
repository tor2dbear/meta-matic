---
title: "Exclusive certificates"
status: done
tags: [backend, ownership]
updated: 2026-08-12
issue: 17
---

## Goal
One owner per work — a real certificate of authenticity, first signer wins. A
certificate for something that was never new: that is the whole point.

## Research
Weighed **A** (anyone can sign the same work, "signed N times before you") against
**B** (one work = one owner). A was redundant with "nothing is new" (already said at
the generation layer) and weakened the certificate. Chose **B**. The irony survives:
near-duplicates recur, so your one-of-one is authentic yet visually generic. Two
*methods* (browser / wallet), not two *tiers* of ownership.

## Delivered
Cloudflare **D1** ledger; `serial` is `PRIMARY KEY`, so exclusivity is atomic — a
second concurrent `/claim` on the same work fails the INSERT instead of racing to a
double-owner. Two methods: browser-id (instant) and wallet (`personal_sign` adds a
verifiable signature). Focus card shows available / yours / claimed-by-someone and
offers the certify buttons only when available, never claiming before the server
answers. Counter "Certified · all"; offline degrades to a local certificate.
