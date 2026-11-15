# 09-performance

Captured 2026-11-15 08:05 UTC from http://localhost:5173/

## What changed

Performance pass; the look is unchanged (compare with 08 and earlier).

- A still WebP picture of the cover shows at once; the 3D scene loads in the background and fades in over it. Begin and Continue wait for the 3D scene if pressed early.
- three.js / React Three Fiber / postprocessing and each tap-moment card are split into their own chunks (first-load JS 318 KB to 64 KB gzip).
- Phones: pixel ratio capped at 1.5, depth of field and fireflies off, only the current and next page's pictures preloaded.
- Cover pictures, story.json and the Fredoka font are preloaded; images have width and height (CLS 0).
- [sheets/startup.webp](sheets/startup.webp): the cover at 400 ms, 1.2 s, 2.5 s, 5 s and 9 s after navigation, production build (pnpm preview), desktop above, phone below. The picture is up by 400 ms; the title and Begin appear over it.

Lighthouse (median of 3, localhost preview): mobile 57 to 59-61 (FCP 2.8 s to 1.3-2.0 s, SI 4.1-4.4 s to 1.9-3.4 s, LCP 3.1 s to 3.5 s); desktop 62-67 to 70-71 (TBT 1.7-3.4 s to ~1 s, SI 1.7-3.2 s to 1.0-1.1 s). Accessibility, best practices and SEO 100.

## Pages captured

- `title`: [sheet](sheets/title.webp) · [phone](phone/title.png) · [tablet](tablet/title.png) · [desktop](desktop/title.png) · [reduced motion](reduced-motion/title.png)
- `title-continue`: [sheet](sheets/title-continue.webp) · [phone](phone/title-continue.png) · [tablet](tablet/title-continue.png) · [desktop](desktop/title-continue.png) · [reduced motion](reduced-motion/title-continue.png)
- `prologue-1`: [sheet](sheets/prologue-1.webp) · [phone](phone/prologue-1.png) · [tablet](tablet/prologue-1.png) · [desktop](desktop/prologue-1.png) · [reduced motion](reduced-motion/prologue-1.png)
- `moon-2`: [sheet](sheets/moon-2.webp) · [phone](phone/moon-2.png) · [tablet](tablet/moon-2.png) · [desktop](desktop/moon-2.png) · [reduced motion](reduced-motion/moon-2.png)
- `mars2-6`: [sheet](sheets/mars2-6.webp) · [phone](phone/mars2-6.png) · [tablet](tablet/mars2-6.png) · [desktop](desktop/mars2-6.png) · [reduced motion](reduced-motion/mars2-6.png)
- `finale-3`: [sheet](sheets/finale-3.webp) · [phone](phone/finale-3.png) · [tablet](tablet/finale-3.png) · [desktop](desktop/finale-3.png) · [reduced motion](reduced-motion/finale-3.png)

## Console errors and failed requests

None.

## Still looks off

- Nothing new. Mobile LCP is slightly later (3.5 s): the LCP element is the cover title, which waits for the app code and story.json; the picture itself is on screen much sooner.
