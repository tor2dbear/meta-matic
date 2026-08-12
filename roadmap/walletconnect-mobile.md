---
title: "WalletConnect for mobile Safari"
status: later
tags: [wallet]
updated: 2026-08-12
---

## Goal
Let people certify with a wallet from ordinary mobile Safari, not only a wallet app's
in-app browser.

## Research
The certify-with-wallet flow uses injected `window.ethereum` (EIP-1193). Mobile Safari
injects nothing, so today it only works inside MetaMask/Rainbow/Coinbase in-app
browsers. WalletConnect (QR / deep-link to the app) would cover normal mobile Safari —
a self-contained integration on top of the existing `personal_sign` flow.

## Open questions
- Worth the dependency, or is "open in your wallet's browser" fine for a niche art piece?
