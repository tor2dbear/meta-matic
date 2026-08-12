---
title: "Rate-limit /claim"
status: later
tags: [backend]
updated: 2026-08-12
---

## Goal
Stop a script from land-grabbing serials, now that certifying is exclusive and
browser-id is free.

## Research
Deliberately parked out of v1 to keep the deploy simple. Options:
- **Cloudflare rate-limiting rule** (dashboard, no code) — least code, but a config
  step, not in the repo.
- **Workers native rate-limit binding** — a few lines in `wrangler.toml` + the
  Worker, keyed on `CF-Connecting-IP`. Beta-ish binding.

## Open questions
- Per-IP is enough, or also cap per browser-id / per minute?
