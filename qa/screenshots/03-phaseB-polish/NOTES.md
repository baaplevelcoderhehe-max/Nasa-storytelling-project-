# 03-phaseB-polish

Captured 2026-11-14 21:15 UTC from http://localhost:5173/

## What changed

- Title screen is a storybook cover: bg_hilltop_night full-screen (light shading only behind the words), Kit (kit_point) and Echo (echo_excited) on the hill pointing at the dish, the title in Fredoka (self-hosted, OFL), the subtitle on ui_chapter_banner, and a Begin button made from ui_button. The phone crop shifts right so the dish stays in view.
- New crayon page controls: Back / Next made from ui_button (56 px tall, hand-drawn arrows) and a hand-drawn progress line with a page count. Bubbles always stay above the controls and inside the screen (10 px margin, max 90vw).
- Bubbles restyled: narration on ui_paper_card, speech and shout as crayon-outlined paper with tails, dark readable ink.
- Kenney UI chrome removed (glass panels, Kenney buttons and bars, cursor, Syncopate / Space Grotesk fonts). The Kenney sounds and emotes are still used.
- Moon: Earth stays in clear sky on all three sizes and never touches Surveyor; on portrait screens the crop moves so the painted Earth is out of view (no sliver). Surveyor's shadow is taller so all footpads touch it.
- Mars: Sojourner stands at the foot of Pathfinder's ramp on every screen, using the new "on" option (place a sprite at a point on another sprite).
- Sprite edges: prepare-art.mjs now defringes every sprite (half-transparent edge pixels take the inner colour, a light 1-2 px rim is cleared) and stores scene sprites premultiplied; the scene material blends premultiplied. Light edge pixels on Ceres: 26.8% before, 1.3% after.
- New test page test-edges: sprites on a light background (test-space shows them on dark).

## Pages captured

- `title`: [sheet](sheets/title.webp) · [phone](phone/title.png) · [tablet](tablet/title.png) · [desktop](desktop/title.png) · [reduced motion](reduced-motion/title.png)
- `prologue-1`: [sheet](sheets/prologue-1.webp) · [phone](phone/prologue-1.png) · [tablet](tablet/prologue-1.png) · [desktop](desktop/prologue-1.png) · [reduced motion](reduced-motion/prologue-1.png)
- `test-moon`: [sheet](sheets/test-moon.webp) · [phone](phone/test-moon.png) · [tablet](tablet/test-moon.png) · [desktop](desktop/test-moon.png) · [reduced motion](reduced-motion/test-moon.png)
- `test-mars`: [sheet](sheets/test-mars.webp) · [phone](phone/test-mars.png) · [tablet](tablet/test-mars.png) · [desktop](desktop/test-mars.png) · [reduced motion](reduced-motion/test-mars.png)
- `test-space`: [sheet](sheets/test-space.webp) · [phone](phone/test-space.png) · [tablet](tablet/test-space.png) · [desktop](desktop/test-space.png) · [reduced motion](reduced-motion/test-space.png)
- `test-edges`: [sheet](sheets/test-edges.webp) · [phone](phone/test-edges.png) · [tablet](tablet/test-edges.png) · [desktop](desktop/test-edges.png) · [reduced motion](reduced-motion/test-edges.png)

## Console errors and failed requests

None.

## Still looks off

- Test pages have no next page, so both Back and Next show as disabled there; the progress count shows "1 / 21" (it counts the old book).
- On tablet portrait the scene uses the phone placements, so sprites look a little small.
- The progress count counts pages visited, not the position in the book; Phase C switches it to the page position.
