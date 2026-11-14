# 02-phaseB-scenes

Captured 2026-11-14 20:21 UTC from http://localhost:5173/

## What changed

Phase B (commit 376daef):
- new layer types: bg (cover-cropped) and positioned sprite (x/y/height/z, anchor, flip, anim boil/bob/float/spin, walk cycle, mobile overrides, pin to background)
- soft painted shadows under standing sprites; correct scale (Echo and Sojourner knee-high, landers bigger than Kit, planets as discs)
- depth of field focuses on the main sprite, backgrounds only softly blurred, background-only pages sharp; off under 768 px and when the frame rate drops
- reduced motion: no parallax, boil, bob, float, spin, walk or fireflies
- paper grain overlay, next-page preloading
- test pages: test-moon, test-mars, test-space
- (since the phase) screenshot mode ?freeze=<seconds> so review shots are identical

## Pages captured

- `title`: [sheet](sheets/title.webp) · [phone](phone/title.png) · [tablet](tablet/title.png) · [desktop](desktop/title.png) · [reduced motion](reduced-motion/title.png)
- `test-moon`: [sheet](sheets/test-moon.webp) · [phone](phone/test-moon.png) · [tablet](tablet/test-moon.png) · [desktop](desktop/test-moon.png) · [reduced motion](reduced-motion/test-moon.png)
- `test-mars`: [sheet](sheets/test-mars.webp) · [phone](phone/test-mars.png) · [tablet](tablet/test-mars.png) · [desktop](desktop/test-mars.png) · [reduced motion](reduced-motion/test-mars.png)
- `test-space`: [sheet](sheets/test-space.webp) · [phone](phone/test-space.png) · [tablet](tablet/test-space.png) · [desktop](desktop/test-space.png) · [reduced motion](reduced-motion/test-space.png)

## Console errors and failed requests

None.

## Still looks off

- Tablet (768x1024) moon: a sliver of the Earth painted into bg_moon_plain shows at the right edge next to the Earth sprite. Fix when building real pages (cover it or give tablets their own placement).
- Tablet portrait uses the phone placements, so sprites look a little small on tablet.
- Progress bar overlaps the Next button on phone and tablet (Phase C/E).
- The title screen is unchanged from the base project.
