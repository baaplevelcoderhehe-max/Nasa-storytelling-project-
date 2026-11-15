import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { play } from './sound'
import { getSpriteRects, subscribeSpriteRects } from './layoutBus'

// ---------- emotes ----------
// Files: /public/emotes/emote_<name>.png  (32x38 art, each has its own little bubble + tail).
// Use "blank" for the empty bubble (emote__.png).
const EMOTE_DIR = '/emotes'
const emoteFile = (n) => (n === 'blank' || n === '' ? 'emote__' : `emote_${n}`)
// 1x is the native 32x38; @2x/@4x are pre-upscaled so HiDPI / Windows-scaled
// displays don't blur the art with a real-time upscale.
const emoteSrc = (n, dpr = 1) => `${EMOTE_DIR}/${emoteFile(n)}${dpr > 1 ? `@${dpr}x` : ''}.png`

// Which UI sound each emote plays when it pops (override per bubble with "emoteSound", or false = silent).
const EMOTE_SFX = {
  question: ['question', 0.3],
  exclamation: ['error', 0.18], exclamations: ['error', 0.18], alert: ['error', 0.18],
  anger: ['error', 0.18], cross: ['error', 0.18],
  heart: ['confirm', 0.3], hearts: ['confirm', 0.3], star: ['confirm', 0.3], stars: ['confirm', 0.3],
  idea: ['confirm', 0.3], faceHappy: ['confirm', 0.3], laugh: ['confirm', 0.3],
  music: ['confirm', 0.3], cash: ['confirm', 0.3],
}
const DEFAULT_EMOTE_SFX = ['tick', 0.35]

// name: "heart"  or  ["dots1","dots2","dots3"] (loops as an animation)
function Emote({ name, speed = 350, scale = 2, className = '', style }) {
  const frames = [].concat(name)
  const key = frames.join('|')
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    frames.forEach((n) => { new Image().src = emoteSrc(n) }) // preload so frame swaps don't flicker
    if (frames.length < 2) return
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), speed)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, speed])

  const f = frames[frame % frames.length]

  return (
    <span className={`emote ${className}`} style={style}>
      <img
        src={emoteSrc(f)}
        srcSet={`${emoteSrc(f, 1)} 32w, ${emoteSrc(f, 2)} 64w, ${emoteSrc(f, 4)} 128w`}
        sizes={`${32 * scale}px`}
        width={32 * scale}
        height={38 * scale}
        alt=""
        draggable={false}
        onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
      />
    </span>
  )
}


// ---------- layout ----------
//
// Bubbles with an x/y are placed there (percent of the screen), then nudged so they
// stay inside it. Bubbles WITHOUT x/y "flow": they stack down from the top in order
// (Spark first, then the story, then Voyager), each in the first spot that:
//   - stays inside the screen (EDGE px from each side) and above the bottom controls
//   - never covers the page's main sprite (the scene reports where it is)
//   - avoids Kit and Echo when there is room
// "side": "left" | "right" | "center" (default) says where a flowing bubble prefers to sit.

const EDGE = 10
const GAP = 12
const LABEL_ROOM = 18 // the speaker label sits just above a bubble
const SPRITE_MARGIN = 8
const STEP = 10

function controlsClear() {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;visibility:hidden;height:var(--controls-clear)'
  document.body.appendChild(probe)
  const h = probe.getBoundingClientRect().height
  probe.remove()
  return h
}

const isFlow = (b) => b.x === undefined && b.y === undefined
const hasTail = (b) => (b.style ?? 'speech') === 'speech' || b.style === 'shout'

function overlapArea(a, r) {
  const w = Math.min(a.right, r.right + SPRITE_MARGIN) - Math.max(a.left, r.left - SPRITE_MARGIN)
  const h = Math.min(a.bottom, r.bottom + SPRITE_MARGIN) - Math.max(a.top, r.top - SPRITE_MARGIN)
  return w > 0 && h > 0 ? w * h : 0
}

/**
 * The first spot (from `fromTop` down) for a w x h bubble; returns its top-left.
 * `strict` boxes must not be covered (the main sprite, bubbles already placed);
 * `soft` ones are avoided when possible. If nothing is free, the spot that covers
 * the least is used, always inside the screen.
 */
function findSpot(w, h, fromTop, side, strict, soft, vw, bottomLimit) {
  const xs = {
    left: EDGE,
    center: Math.max(EDGE, (vw - w) / 2),
    right: Math.max(EDGE, vw - EDGE - w),
  }
  const order = side === 'left' ? ['left', 'center', 'right'] : side === 'right' ? ['right', 'center', 'left'] : ['center', 'left', 'right']
  const firstTop = Math.min(fromTop, Math.max(EDGE, bottomLimit - h))
  const lastTop = Math.max(firstTop, bottomLimit - h)
  let fallback = null // free of strict boxes, but touching a soft one
  let leastBad = null // covers the least of the strict boxes
  for (let top = firstTop; top <= lastTop; top += STEP) {
    for (const key of order) {
      const box = { left: xs[key], top, right: xs[key] + w, bottom: top + h }
      const strictHit = strict.reduce((sum, r) => sum + overlapArea(box, r), 0)
      if (strictHit > 0) {
        if (!leastBad || strictHit < leastBad.strictHit) leastBad = { ...box, strictHit }
        continue
      }
      const softHit = soft.reduce((sum, r) => sum + overlapArea(box, r), 0)
      if (softHit === 0) return box
      if (!fallback || softHit < fallback.softHit) fallback = { ...box, softHit }
    }
  }
  return fallback ?? leastBad ?? { left: xs[order[0]], top: firstTop }
}

/** Nudges a positioned (x/y) bubble so it stays inside the screen and above the controls. */
function fitInside(el, clear, tail) {
  el.style.translate = '0 0'
  const rect = el.getBoundingClientRect()
  // The real box: the pop-in animation scales it while it appears.
  const w = el.offsetWidth
  const h = el.offsetHeight
  const left = (rect.left + rect.right) / 2 - w / 2
  const top = (rect.top + rect.bottom) / 2 - h / 2
  const vw = window.innerWidth
  const vh = window.innerHeight
  let dx = 0
  let dy = 0
  if (left < EDGE) dx = EDGE - left
  else if (left + w > vw - EDGE) dx = vw - EDGE - (left + w)
  if (top < EDGE + LABEL_ROOM) dy = EDGE + LABEL_ROOM - top
  else if (top + h + tail > vh - clear) dy = vh - clear - (top + h + tail)
  el.style.translate = `${Math.round(dx)}px ${Math.round(dy)}px`
}

export default function Bubbles({ bubbles = [], quiet = false }) {
  const refs = useRef([])

  // Sounds: one per bubble (shouts get the bong), one per emote, timed to their pop-in.
  // Quiet pages have no sound effects.
  useEffect(() => {
    if (quiet) return
    bubbles.forEach((b) => {
      const delay = b.delay ?? 0
      if (b.text) {
        play(b.style === 'shout' ? 'bong' : 'pluck', { gain: 0.3, jitter: 0.1, delay })
      }
      if (b.emote !== undefined && b.emoteSound !== false) {
        const first = [].concat(b.emote)[0]
        const [def, gain] = EMOTE_SFX[first] ?? DEFAULT_EMOTE_SFX
        const at = delay + (b.text ? b.emoteDelay ?? 0.35 : 0)
        play(b.emoteSound ?? def, { gain, jitter: 0.08, delay: at })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const layout = useRef(() => {})
  layout.current = () => {
    const clear = controlsClear()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const rects = getSpriteRects()
    const strict = rects.filter((r) => r.main)
    const soft = rects.filter((r) => r.soft && !r.main)
    // Flowing bubbles also stop above any choice buttons and the tap-moment bar.
    const tops = ['.choices', '.hotspots']
      .map((sel) => document.querySelector(sel))
      .filter(Boolean)
      .map((el) => el.getBoundingClientRect().top - GAP)
    const bottomLimit = Math.min(vh - clear, ...tops)
    // Each flowing bubble starts looking at the previous one's top, so it can sit beside
    // it or below it, but never above it (reading order). Placed bubbles are obstacles.
    let cursor = EDGE + LABEL_ROOM
    const placed = []
    bubbles.forEach((b, i) => {
      const el = refs.current[i]
      if (!el || !b.text) return
      const tail = hasTail(b) ? 22 : 0
      if (!isFlow(b)) {
        fitInside(el, clear, tail)
        return
      }
      const w = el.offsetWidth
      const h = el.offsetHeight + tail
      const labelRoom = b.speaker ? LABEL_ROOM : 0
      const obstacles = [...strict, ...placed]
      const spot = findSpot(w, h, cursor + labelRoom, b.side, obstacles, soft, vw, bottomLimit)
      el.style.left = `${Math.round(spot.left)}px`
      el.style.top = `${Math.round(spot.top)}px`
      // Room for this bubble's speaker label and a gap, so neighbours never touch.
      placed.push({ left: spot.left - GAP, right: spot.left + w + GAP, top: spot.top - labelRoom - GAP, bottom: spot.top + h + GAP })
      cursor = spot.top
    })
  }

  useLayoutEffect(() => {
    const run = () => layout.current()
    run()
    document.fonts?.ready?.then(run) // fonts can change a bubble's size once they load
    const stop = subscribeSpriteRects(run)
    window.addEventListener('resize', run)
    return () => {
      stop()
      window.removeEventListener('resize', run)
    }
  }, [bubbles])

  return (
    <div className="bubbles">
      {bubbles.map((b, i) => {
        const hasEmote = b.emote !== undefined

        // standalone emote (no text)
        if (!b.text && hasEmote) {
          return (
            <Emote
              key={i}
              name={b.emote}
              speed={b.emoteSpeed}
              scale={b.emoteScale ?? 2}
              className="emote--solo"
              style={{
                left: `${b.x ?? 50}%`,
                top: `${b.y ?? 50}%`,
                animationDelay: `${b.delay ?? 0}s`,
              }}
            />
          )
        }
        if (!b.text) return null

        const style = b.style ?? 'speech'
        const tail = style === 'speech' || style === 'shout' ? b.tail ?? 'left' : 'none'
        const flow = isFlow(b)
        // Lower-band positioned bubbles sit just above the bottom controls.
        const low = !flow && (b.y ?? 50) >= 75
        const position = flow
          ? { left: 0, top: 0 }
          : { left: `${b.x ?? 50}%`, ...(low ? { bottom: 'var(--controls-clear)' } : { top: `${b.y ?? 50}%` }) }
        return (
          <div
            key={i}
            ref={(el) => (refs.current[i] = el)}
            className={`bubble ${style} tail-${tail}${flow ? ' bubble--flow' : ''}${low ? ' bubble--low' : ''}${hasEmote ? ' has-emote' : ''}${b.speaker ? ' has-speaker' : ''}`}
            style={{
              ...position,
              animationDelay: `${b.delay ?? 0}s`,
              maxWidth: b.width ? `min(${b.width}px, 90vw)` : undefined,
            }}
          >
            {b.speaker && <span className="speaker">{b.speaker}</span>}
            {b.text}
            {hasEmote && (
              <Emote
                name={b.emote}
                speed={b.emoteSpeed}
                scale={b.emoteScale ?? 1}
                className={`emote--${b.emoteSide ?? 'right'}`}
                style={{ animationDelay: `${(b.delay ?? 0) + (b.emoteDelay ?? 0.35)}s` }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
