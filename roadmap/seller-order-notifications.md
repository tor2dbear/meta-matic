---
title: "Seller notification on new print order"
status: next
tags: [commerce, ops]
updated: 2026-08-13
---

## Goal
Notify the seller the moment a print order is paid and fulfilled, with everything needed
to recognise it at a glance — serial, size, destination country, buyer name/email — so a
sale is never missed and can be reconciled against Stripe + Prodigi.

## Today
Nothing is sent to the seller from our own code. The buyer sees the on-site confirmation
modal; awareness of a sale relies on Stripe's owner emails / mobile app and Prodigi's
dashboard + order emails (both should be enabled in their respective settings).

## Approach
Send a "new order" email from the Stripe webhook right after Prodigi confirms the order
(the point where we already have serial, size, country, buyer). Resend is the connected
option — needs a `RESEND_API_KEY` secret and a verified sender domain. Keep it best-effort
(never fail fulfilment if the email send fails). A Slack/webhook variant is an easy
alternative to email.

## Open questions
- Email vs Slack vs both?
- Include the R2 image link / a thumbnail?
- Also send the buyer a branded receipt, or leave that to Stripe's receipt emails?
