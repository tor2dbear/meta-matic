---
title: "Reduced-motion mode"
status: done
tags: [a11y]
updated: 2026-08-12
---

## Goal
Respect `prefers-reduced-motion`: no autoplay, but the piece stays fully usable.

## Delivered
Under reduced motion the belt doesn't animate; the status pill fetches a fresh still
frame of "now" on demand, and scrub updates render synchronously. Everything —
inspect, certify, save, the map — keeps working.
