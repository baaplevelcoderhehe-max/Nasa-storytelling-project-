# 07-phaseE-saving-a11y

Captured 2026-11-15 07:00 UTC from http://localhost:5173/

## What changed

- Saving with Zustand + persist (key still-out-there-save): page, flags (incl. the Voyager message), counters, visited, history and settings. Cover shows Continue / Start over; Start over asks on a paper card and keeps settings. Works without saving when storage is blocked. scripts/check-save.mjs: 11/11 checks pass.
- Settings card (cover tag and a gear on every page): sound, music volume, calm motion (like my device / on / off), text size A / A+ / A++, read aloud. Speaker button reads the page (Web Speech API; hidden when unsupported).
- Date-aware Voyager lines ({voyagerHome}, {voyagerReach}); Vitest: day before, the day itself, a later date (3/3 pass).
- Accessibility: aria-live page text in reading order, scene description per page, focus moves into cards and back, Escape closes, Tab stays in cards, 44 px targets, dark pills behind text over the picture. Phones: Back / Next show arrows only (names still read out). F.4 marker names show on tap/focus.
- axe (WCAG 2.1 A/AA) on cover, settings, credits, hub + 10 pages: 0 violations of any level.
- Lighthouse (production build): mobile accessibility 100, performance 57, best practices 100, SEO 100; desktop accessibility 100, performance 63.
- Credits card: team, sources by chapter, Kenney, Fredoka, shader credit, NASA disclaimer.
- Share meta tags + og-image; vite preview has no console errors or warnings.

## Pages captured

- `title-continue`: [sheet](sheets/title-continue.webp) · [phone](phone/title-continue.png) · [tablet](tablet/title-continue.png) · [desktop](desktop/title-continue.png) · [reduced motion](reduced-motion/title-continue.png)
- `settings`: [sheet](sheets/settings.webp) · [phone](phone/settings.png) · [tablet](tablet/settings.png) · [desktop](desktop/settings.png) · [reduced motion](reduced-motion/settings.png)
- `credits`: [sheet](sheets/credits.webp) · [phone](phone/credits.png) · [tablet](tablet/credits.png) · [desktop](desktop/credits.png) · [reduced motion](reduced-motion/credits.png)
- `hub`: [sheet](sheets/hub.webp) · [phone](phone/hub.png) · [tablet](tablet/hub.png) · [desktop](desktop/hub.png) · [reduced motion](reduced-motion/hub.png)
- `moon-1`: [sheet](sheets/moon-1.webp) · [phone](phone/moon-1.png) · [tablet](tablet/moon-1.png) · [desktop](desktop/moon-1.png) · [reduced motion](reduced-motion/moon-1.png)
- `moon-1@text2`: [sheet](sheets/moon-1@text2.webp) · [phone](phone/moon-1@text2.png) · [tablet](tablet/moon-1@text2.png) · [desktop](desktop/moon-1@text2.png) · [reduced motion](reduced-motion/moon-1@text2.png)
- `moon-1@text3`: [sheet](sheets/moon-1@text3.webp) · [phone](phone/moon-1@text3.png) · [tablet](tablet/moon-1@text3.png) · [desktop](desktop/moon-1@text3.png) · [reduced motion](reduced-motion/moon-1@text3.png)
- `mars1-4@reduce`: [sheet](sheets/mars1-4@reduce.webp) · [phone](phone/mars1-4@reduce.png) · [tablet](tablet/mars1-4@reduce.png) · [desktop](desktop/mars1-4@reduce.png) · [reduced motion](reduced-motion/mars1-4@reduce.png)
- `finale-4`: [sheet](sheets/finale-4.webp) · [phone](phone/finale-4.png) · [tablet](tablet/finale-4.png) · [desktop](desktop/finale-4.png) · [reduced motion](reduced-motion/finale-4.png)

## Console errors and failed requests

None.

## Still looks off

- Mobile performance 57: the 3D scene's JavaScript (three.js) blocks the main thread ~6.5 s on Lighthouse's throttled phone CPU.
- Credits: the ambient music's source is unknown ("to be confirmed").
- og:image is a relative URL; some sites want an absolute one once the domain is known.
