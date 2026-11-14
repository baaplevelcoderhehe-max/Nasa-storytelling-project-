# Still Out There: animated storybook

NASA hackathon project: an animated, interactive storybook about NASA explorers left
on the Moon, Mars and in deep space. Readers turn pages and tap things to make the
story happen; nothing can be failed.

- Source of truth for all story text and facts: `docs/script.md`. Never invent facts,
  dates, numbers or quotes.
- Stack: Vite + React (JavaScript), React Three Fiber scenes (`src/Scene.jsx`),
  story state graph in `public/story.json` (read its `_help` block).
- Art: originals in `/sprites` (never edit); web versions in `public/art/`, made by
  `node scripts/prepare-art.mjs`, which also writes `src/data/art.js`.
- NASA hardware never gets a face and never talks with a mouth; it speaks through
  speech bubbles only.

## Standing rules

- **Review screenshots:** after every phase or feature, run `scripts/qa-shots.mjs`
  into a new numbered folder in `qa/screenshots/`, look at the shots yourself, and
  report the folder path and the contact sheet paths.
  - Example: `node scripts/qa-shots.mjs 03-phaseC-story title prologue-1 moon-1`
  - Folder names are `NN-short-feature-name`, numbered in order. Never overwrite an
    old folder.
  - Only the contact sheets (`sheets/*.webp`, WebP quality ~80) and `NOTES.md` are
    kept in git. The per-device shots (`phone/`, `tablet/`, `desktop/`,
    `reduced-motion/`) stay on disk and are ignored by `.gitignore`.
  - Working passes go to `qa/scratch/` (`QA_SCRATCH=1`, add `QA_FAST=1` for phone and
    desktop only); that folder is ignored.
  - Capture every page or screen the feature touched (for story work, every page
    that changed). Fill in "What changed" and "Still looks off" in the folder's
    `NOTES.md`.
- Bubble rules are checked with `node scripts/check-bubbles.mjs` (every page, three sizes).
- Story spreads are built by `node scripts/build-story.mjs` from `docs/script.md`; don't edit
  the spreads in `public/story.json` by hand.
- Git safety: never run destructive git commands (`reset --hard`, `checkout -- .`,
  `clean`, `rm -rf` on tracked folders) without asking. Commit after each phase:
  `feat(phaseX): summary`.
- Ask before adding a dependency that has not been approved.
- Run `pnpm run build` before calling a phase done.
