---
title: "Rubberband scrub + screen-space lock"
status: done
tags: [interaction]
updated: 2026-08-12
---

## Goal
Let people peek into the future (feel the noise, especially on mobile) and a short
way back, without ever stopping the machine — and lock/ink a work crisply at the
signing point.

## Delivered
Springy rubberband peek forward/back with spring-back to now; nothing parks, only
the present is signable. The lock (ink stroke→ribbon and the focus-ring snap) fires
in the last ~22 px into the live head — screen-space, not on `resolve` — so it never
feels early, and the ring snap is tied to the exact stroke→ribbon curve. The signing
point (line + ring + lock) follows the live head while scrubbing.
