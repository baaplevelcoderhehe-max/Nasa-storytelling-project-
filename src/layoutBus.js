// Where things are on screen (CSS pixels), so the HTML bubbles can keep clear of them.
// The scene publishes its sprites; the animated scene overlays (SceneAnims) publish
// their own boxes under a key. Bubbles subscribe and read the combined list.
//
// Each entry: { name, main, soft, left, top, right, bottom }
//   main: never covered by a bubble (the page's subject, an animation box)
//   soft: Kit, Echo and sprites marked "keepClear" (like the Earth): bubbles avoid
//         them when there is room

let spriteRects = []
const extra = new Map()
let combined = []
const listeners = new Set()

function same(a, b) {
  return (
    a.length === b.length &&
    a.every((r, i) => ['left', 'top', 'right', 'bottom'].every((k) => Math.abs(r[k] - b[i][k]) < 1))
  )
}

function update() {
  const next = [...spriteRects, ...[...extra.values()].flat()]
  if (same(next, combined)) return
  combined = next
  if (typeof window !== 'undefined') window.__spriteRects = combined // read by scripts/check-bubbles.mjs
  listeners.forEach((fn) => fn(combined))
}

export function publishSpriteRects(next) {
  spriteRects = next
  update()
}

/** Boxes from something other than the scene (key: who owns them). [] clears them. */
export function publishExtraRects(key, rects) {
  if (rects.length) extra.set(key, rects)
  else extra.delete(key)
  update()
}

export function getSpriteRects() {
  return combined
}

export function subscribeSpriteRects(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
