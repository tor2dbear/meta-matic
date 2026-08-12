---
title: "Diffusion as a Fourier reveal"
status: done
tags: [diffusion]
updated: 2026-08-12
---

## Goal
Future works should sharpen "clearer and clearer until perfect" — an homage to how
AI generates images — not a grain crossfade laid on top.

## Delivered
Works to the right of now emerge from noise and gain their own harmonics low
frequency → high (a Fourier reveal, `nu`/`resolve` gating), screen-independent so
the effect is identical on every viewport (mobile "misses" it unless you scrub
forward). Far-future works shrink to points — both a performance win and "shouldn't
be legible that far ahead."

Ruled out along the way (see NOTES.md): grain crossfade, migrating particles,
`ctx.filter` blur, per-frame step-count changes.
