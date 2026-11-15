# 06-phaseD-taps

Captured 2026-11-15 06:09 UTC from http://localhost:5173/

## What changed

- 16 tap moments from the script's Tap lines, each a crayon "moment card" over the scene, drawn with the book's own art: P.2 dial, 1.2 Engine off!, 1.3 scoop, 1.5 laser (2.5 s counter), 1.7 ascent stage + seismograph, 2.3 Viking lab, 2.4 airbags (15 bounces), 2.6 Phoenix Day 1-4, 3.2 dust devil, 3.5 marsquakes, 3.7 Ingenuity (hold), 4.2 NEAR (walking speed), 4.4 Dawn (hold), 5.1 dips, 5.4 plaque, F.3 pulse "24 hours to Voyager" (~20 s) after Send.
- A bar above the page controls holds the tap button (pulsing ring) and a "Mission Log" paper tag on the 7 spreads that have one. Bubbles keep clear of the bar.
- Mouse, touch and keyboard everywhere; Escape closes; focus moves into the card and back; idle hint after 8 s (on the page and inside the card); every moment can be skipped and the page can always be turned.
- The scene pauses while a card is open; Space/arrow keys no longer turn pages while a moment or button has focus.
- Animated scenes made in code: 2.2 photo builds stripe by stripe, 3.6 Mars cutaway with quake waves lighting crust/mantle/core, 5.3 planets pop in, F.4 markers light up for all 17 explorers in story order. Reduced motion shows the finished picture.
- scripts/check-taps.mjs plays all 16 with the keyboard (all pass). Bubble rules still hold on every page.

Sequences: sheets/moon-2-sequence.webp, sheets/mars1-4-sequence.webp, sheets/beyond-4-sequence.webp. Phone cards: sheets/moment-cards-phone.webp.

## Pages captured

- `prologue-2`: [sheet](sheets/prologue-2.webp) · [phone](phone/prologue-2.png) · [tablet](tablet/prologue-2.png) · [desktop](desktop/prologue-2.png) · [reduced motion](reduced-motion/prologue-2.png)
- `moon-2`: [sheet](sheets/moon-2.webp) · [phone](phone/moon-2.png) · [tablet](tablet/moon-2.png) · [desktop](desktop/moon-2.png) · [reduced motion](reduced-motion/moon-2.png)
- `mars1-2`: [sheet](sheets/mars1-2.webp) · [phone](phone/mars1-2.png) · [tablet](tablet/mars1-2.png) · [desktop](desktop/mars1-2.png) · [reduced motion](reduced-motion/mars1-2.png)
- `mars2-6`: [sheet](sheets/mars2-6.webp) · [phone](phone/mars2-6.png) · [tablet](tablet/mars2-6.png) · [desktop](desktop/mars2-6.png) · [reduced motion](reduced-motion/mars2-6.png)
- `beyond-3`: [sheet](sheets/beyond-3.webp) · [phone](phone/beyond-3.png) · [tablet](tablet/beyond-3.png) · [desktop](desktop/beyond-3.png) · [reduced motion](reduced-motion/beyond-3.png)
- `beyond-4`: [sheet](sheets/beyond-4.webp) · [phone](phone/beyond-4.png) · [tablet](tablet/beyond-4.png) · [desktop](desktop/beyond-4.png) · [reduced motion](reduced-motion/beyond-4.png)
- `small-4`: [sheet](sheets/small-4.webp) · [phone](phone/small-4.png) · [tablet](tablet/small-4.png) · [desktop](desktop/small-4.png) · [reduced motion](reduced-motion/small-4.png)
- `finale-4`: [sheet](sheets/finale-4.webp) · [phone](phone/finale-4.png) · [tablet](tablet/finale-4.png) · [desktop](desktop/finale-4.png) · [reduced motion](reduced-motion/finale-4.png)

## Console errors and failed requests

None.

## Still looks off

- Moments play in a card over the scene rather than moving the scene's own sprites; the card uses the same art, so it reads as part of the page, but the scene behind is dimmed.
- Explorer marker names are hidden under 1000 px wide (only the glowing dots show); on desktop the "Dawn" name sits near Kit's hair.
- The empty dark sky in some cards (Engine off!, NEAR) is plain; could take a star texture later.
