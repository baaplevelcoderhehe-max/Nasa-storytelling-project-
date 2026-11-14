# 05-cleanup-and-cover

Captured 2026-11-14 23:06 UTC from http://localhost:5173/

## What changed

- Repo cleanup: only WebP contact sheets are kept in git; per-device shots stay on disk. Unpushed history rewritten to drop the old PNG shots and a stray qa.zip (backup branch backup-before-qa-cleanup + zip outside the repo). main went from 450 MB to 138 MB.
- Cover = opening scene: the cover and prologue-1 share one scene, so Begin fades the title, banner and button (~1 s) and the story starts in the same scene, same canvas, with a gentle 5% push-in. See sheets/begin-sequence.webp.
- Cover: brighter hilltop, Kit and Echo small on the hill, Echo's antenna blinks, title cream with gold glow and a gentle crayon wobble, twinkling stars around it, a signal ring from the dish every ~6 s, an occasional shooting star (all off in reduced motion), paper-tag Settings / Credits (placeholder panels until Phase E), "Continue / Start over" ready for when a save exists.
- 2.7: Voyager's panel no longer covers Kit's helmet on phones.
- 1.8: new background variant with the painted Earth painted out.
- 3.1: real split page, Spirit in the crater (left) | Opportunity on the plain (right), crayon divider.

## Pages captured

- `begin-sequence`: [the Begin handover, frame by frame](sheets/begin-sequence.webp)

- `title`: [sheet](sheets/title.webp) · [phone](phone/title.png) · [tablet](tablet/title.png) · [desktop](desktop/title.png) · [reduced motion](reduced-motion/title.png)
- `prologue-1`: [sheet](sheets/prologue-1.webp) · [phone](phone/prologue-1.png) · [tablet](tablet/prologue-1.png) · [desktop](desktop/prologue-1.png) · [reduced motion](reduced-motion/prologue-1.png)
- `moon-8`: [sheet](sheets/moon-8.webp) · [phone](phone/moon-8.png) · [tablet](tablet/moon-8.png) · [desktop](desktop/moon-8.png) · [reduced motion](reduced-motion/moon-8.png)
- `mars1-7`: [sheet](sheets/mars1-7.webp) · [phone](phone/mars1-7.png) · [tablet](tablet/mars1-7.png) · [desktop](desktop/mars1-7.png) · [reduced motion](reduced-motion/mars1-7.png)
- `mars2-1`: [sheet](sheets/mars2-1.webp) · [phone](phone/mars2-1.png) · [tablet](tablet/mars2-1.png) · [desktop](desktop/mars2-1.png) · [reduced motion](reduced-motion/mars2-1.png)

## Console errors and failed requests

None.

## Still looks off

- On phone the dish's signal rings pass behind the title; it's faint, but they cross the letters.
- The chapter banner on prologue-1 shows ~1 s after the words fade, so for a moment the scene has no words; intended, but worth a look in motion.
