---
title: "Server-side wallet signature check"
status: later
tags: [backend, wallet]
updated: 2026-08-12
---

## Goal
Make a wallet certificate's provenance trustworthy server-side, not just client-side.

## Research
Today `/claim` stores the address + `personal_sign` signature; the client sends the
signed `message` too (`payload.msg`), but the Worker does **not** persist it and D1
has no `msg` column — and the attestation message embeds a client timestamp, so the
preimage can't be reconstructed from the server's own timestamp. So the stored
signature is currently unverifiable once the local entry is gone.

To harden:
1. Add a `msg` column and persist the exact signed message (or sign a deterministic /
   server-issued payload with no client timestamp, so it's reconstructable from serial).
2. In the Worker, recover the address from the signature over that message and assert
   it matches the claimed address before writing the row. Needs secp256k1 recovery
   in-Worker (WebCrypto doesn't do it natively — a small lib or manual implementation).

## Open questions
- Persist the message, or switch to a deterministic (timestamp-free) signed payload?
- Reject on mismatch, or accept-but-flag?
