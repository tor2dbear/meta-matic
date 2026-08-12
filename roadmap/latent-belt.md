---
title: "Latent conveyor belt"
status: done
tags: [belt]
updated: 2026-08-12
---

## Goal
A wall-clock-driven drawing machine that retrieves works from a continuous latent
space rather than randomising them — the same work for everyone, right now, with no
server.

## Delivered
Serial is a pure function of time (1 work / 4 s since 2026-01-01). `coordFor(serial)`
is a deterministic walk through a value-noise field → `(u,v)`; neighbouring serials
give near-identical drawings, so the belt morphs smoothly. The walk is bounded and
aperiodic — infinitely many works, never an exact repeat, endlessly recurring
neighbourhoods (surfaced as the "≈ nearly identical, seen N works ago" seam).
