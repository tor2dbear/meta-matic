---
title: "Server-side wallet signature check"
status: later
tags: [backend, wallet]
updated: 2026-08-12
---

## Goal
Make a wallet certificate's provenance trustworthy server-side, not just client-side.

## Research
Today `/claim` stores the address + `personal_sign` signature as-is; the client
verifies. To harden: in the Worker, recover the address from the signature over the
attestation message and assert it matches the claimed address before writing the row.
Needs secp256k1 recovery in-Worker (WebCrypto doesn't do it natively — a small lib or
manual implementation).

## Open questions
- Reject on mismatch, or accept-but-flag?
