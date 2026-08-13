---
title: "On-chain attestation (optional, satire) — mint the joke"
status: later
tags: [wallet, onchain, satire]
updated: 2026-08-13
---

## Goal
An OPTIONAL third certify path that writes the attestation to a public blockchain, so the
joke — "I certify authorship of a work that was never original" — lives permanently and
publicly on-chain. Coexists with (never replaces) the free off-chain `personal_sign` and
the browser-certify path.

## Approach (deliberately cheap + low-maintenance)
- **Chain:** an L2 (Base / Optimism) where gas is cents, not L1 where it's dollars.
- **No custom contract:** use **EAS (Ethereum Attestation Service)**, already deployed on
  Base/Optimism. Register one small schema (serial, coordinate, fingerprint, generator,
  time) once — cents, no contract to write/deploy/audit. On-brand: it's literally an
  "attestation".
- **Who pays: the signer (user-pays).** They send the attestation tx from their own wallet
  and pay the few cents of L2 gas. The seller pays ~nothing ongoing (only the one-time
  schema registration). No sponsored/gasless mint (that would put gas cost on the seller).
- **Frontend:** reuse the same `window.ethereum` provider as wallet-sign, so on-chain only
  appears where a wallet is connected (desktop extension or in-app wallet browser — same
  reach as wallet-sign). Build + send the EAS attestation tx, then store the tx hash /
  attestation UID next to the ledger entry and link to the explorer / EAS scan. Optionally
  show an on-chain badge in the ledger and on the exported print.

## Explicitly out of scope (keep it small)
- Not a replacement for off-chain sign or browser-certify — a third, optional method.
- No sponsored/gasless mint (would make the seller pay gas + add infra).
- No NFT/ERC-721 (heavier than an EAS attestation, and less on-theme).
- Same wallet-provider requirement as wallet-sign (so it won't help bare iOS Safari; that's
  the separate WalletConnect track).

## Open questions
- Base vs Optimism (Base = cheapest + most reach)?
- Surface the on-chain link/badge in the ledger and/or the exported print file?
- Copy that keeps the satire ("mint a certificate of authenticity for something that was
  never new — for a few cents of gas").
