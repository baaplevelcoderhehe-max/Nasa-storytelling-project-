import React, { useEffect, useState } from 'react'
import { play } from './sound'

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

// Speech bubbles are plain HTML laid over the scene. Positions are % of screen.
// Remount per page (key) so the "delay" animation replays on every page turn.
//
// bubble fields (story.json):
//   text, speaker, style, tail, x, y, width, delay   – as before
//   emote        "heart" | ["dots1","dots2","dots3"]  – with text: pops on the bubble's corner.
//                                                       without text: a standalone emote, x/y = where its tail points
//   emoteSide    "right" (default) | "left"           – which corner it sits on (text bubbles)
//   emoteScale   1-4 (default 1 on a bubble, 2 standalone) – 1 = native 32x38, crispest
//   emoteDelay   seconds after the bubble appears (default 0.35)
//   emoteSpeed   ms per frame for animated emotes (default 350)
//   emoteSound   a sound name from sound.js, or false for silence
export default function Bubbles({ bubbles = [] }) {
  // Sounds: one per bubble (shouts get the bong), one per emote, timed to their pop-in.
  useEffect(() => {
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
        // Lower-band bubbles are anchored above the HUD (progress bar) rather
        // than at a screen %, which would collide with it on short windows.
        const low = (b.y ?? 50) >= 75
        return (
          <div
            key={i}
            className={`bubble ${style} tail-${tail}${low ? ' bubble--low' : ''}${hasEmote ? ' has-emote' : ''}${b.speaker ? ' has-speaker' : ''}`}
            style={{
              left: `${b.x ?? 50}%`,
              ...(low ? { bottom: 'var(--hud-clear)' } : { top: `${b.y ?? 50}%` }),
              animationDelay: `${b.delay ?? 0}s`,
              maxWidth: b.width ? `${b.width}px` : undefined,
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