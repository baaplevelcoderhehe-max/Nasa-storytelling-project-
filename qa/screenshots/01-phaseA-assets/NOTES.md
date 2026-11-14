# 01-phaseA-assets

Captured 2026-11-14 20:19 UTC from http://localhost:5174/

## What changed

Phase A (commit c5f23cf), captured afterwards from that commit in a temporary worktree:
- art from /sprites converted to web-ready WebP in public/art (backgrounds 1920 px, paper borders cropped; sprites trimmed), src/data/art.js generated
- Zustand homepage art, logos, favicon, manifest, committed dist/ and stray files removed
- every story page temporarily shows one background from the new art
- title "Still Out There", subtitle "NASA's explorers, still out there"; music as Ogg

## Pages captured

- `title`: [sheet](sheets/title.webp) · [phone](phone/title.png) · [tablet](tablet/title.png) · [desktop](desktop/title.png) · [reduced motion](reduced-motion/title.png)
- `prologue-1`: [sheet](sheets/prologue-1.webp) · [phone](phone/prologue-1.png) · [tablet](tablet/prologue-1.png) · [desktop](desktop/prologue-1.png) · [reduced motion](reduced-motion/prologue-1.png)

## Animation not frozen

This build has no screenshot mode, so these were shot after a plain 2 s wait: title, prologue-1.

## Console errors and failed requests

- reduced/prologue-1: Failed to load resource: net::ERR_NETWORK_IO_SUSPENDED (a network stall during capture: that shot showed the title screen instead of page 1, so it was re-taken by hand with the same steps; the script now checks the title screen is gone after Begin)

## Still looks off

- Page 1 is heavily blurred: the old depth of field focuses in front of a lone background (fixed in Phase B, see 02-phaseB-scenes).
- On phone and tablet the progress bar overlaps the Next button (Phase C/E).
- Narration bubbles are low contrast (Phase E).
- Phase A has no reduced-motion support yet, so the reduced-motion shots still show fireflies.
