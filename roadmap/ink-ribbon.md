---
title: "Variable-weight ink ribbon"
status: done
tags: [render]
updated: 2026-08-12
---

## Goal
Make the line read as ink laid by a machine, not a uniform stroke — weight from pen
speed, a real ribbon at the lock moment.

## Delivered
Per-segment quad ribbon with nonzero-winding fill, width derived from pen speed.
Cheap uniform `ctx.stroke()` during the morph, easing to the full variable-weight
ribbon exactly at lock — so the expensive geometry only exists for the ~2–3 works
near the signing point.
