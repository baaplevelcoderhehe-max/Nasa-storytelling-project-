// Where the scene's sprites are on screen (CSS pixels), so the HTML bubbles can keep
// clear of them. Scene publishes; Bubbles subscribes.
//
// Each entry: { name, main, soft, left, top, right, bottom }
//   main: the page's subject: bubbles never cover it
//   soft: Kit, Echo and sprites marked "keepClear" (like the Earth): bubbles avoid
//         them when there is room

let rects = []
const listeners = new Set()

export function publishSpriteRects(next) {
  const same =
    next.length === rects.length &&
    next.every((r, i) => ['left', 'top', 'right', 'bottom'].every((k) => Math.abs(r[k] - rects[i][k]) < 1))
  if (same) return
  rects = next
  if (typeof window !== 'undefined') window.__spriteRects = rects // read by scripts/check-bubbles.mjs
  listeners.forEach((fn) => fn(rects))
}

export function getSpriteRects() {
  return rects
}

export function subscribeSpriteRects(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
