import React, { useEffect, useMemo, useState } from 'react'
import { play } from './sound'

// ---------- emotes ----------
// Files: /public/emotes/emote_<name>.png  (32x38 art, each has its own little bubble + tail).
// Use "blank" for the empty bubble (emote__.png).
const EMOTE_DIR = '/emotes'
const emoteSrc = (n) => `${EMOTE_DIR}/${n === 'blank' || n === '' ? 'emote__' : `emote_${n}`}.png`

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
export function Emote({ name, speed = 350, scale = 2, className = '', style }) {
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

  return (
    <span className={`emote ${className}`} style={style}>
      <img
        src={emoteSrc(frames[frame % frames.length])}
        width={32 * scale}
        height={38 * scale}
        alt=""
        draggable={false}
        onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
      />
    </span>
  )
}

// One-shot sound for a timed reveal, keyed off an explicit `at`.
// Auto-timed (per-bubble `delay`) is handled inside <Bubbles/> itself.
export function TimedSound({ name, at = 0, gain = 0.3, jitter = 0.1 }) {
  useEffect(() => {
    if (!name || name === false) return
    play(name, { gain, jitter, delay: at })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

// Interactables live in story.json (page.interacts), each with:
//   id          unique key within the page
//   x, y        % of screen (centre of the hotspot)
//   radius      px, hit area (default 44)
//   label       shown on the marker (optional)
//   text        first line of the note
//   detail      rest of the note
//   sound       play on open (default "signal")
//   emote       emote on the marker / in the note (optional)
//   require     array of interactable ids on the SAME page that must be done first
//   hidden      1 = invisible marker, until it becomes available
//   target      "note" (default) | "page"  — page opens an image panel and queues
//              the page turn (works only on the last interactable of a page)
//   go          page id to turn to when target is "page"
//   layers      extra layers to show on the scene while this is available/open
//   fireflies   firefly config to merge in while open
//   replace     id of an interactable to retire (its marker/line disappears)
//   delay, emoteSpeed, emoteScale, emoteDelay — same conventions as bubbles
const DOT = 80

export default function Interacts({
  interacts = [],
  done,
  opened,
  available,
  onOpen,
  onClose,
  onDone,
}) {
  const ordered = useMemo(
    () => interacts.map((it, i) => ({ ...it, _i: i })),
    [interacts],
  )
  const byId = useMemo(() => {
    const m = {}
    ordered.forEach((it) => { m[it.id] = it })
    return m
  }, [ordered])
  const doneSet = useMemo(() => new Set(done), [done])

  // An interactable is available when it isn't done and every `require` is done.
  // Anything not explicitly gated is available right away.
  useEffect(() => {
    ordered.forEach((it) => {
      const isDone = doneSet.has(it.id)
      const reqs = [].concat(it.require ?? [])
      const unmet = reqs.filter((r) => !doneSet.has(r))
      const isOpen = opened === it.id
      const avail = !isDone && unmet.length === 0
      if (avail && !available.has(it.id)) onDone('add', it.id)
      if (!avail && available.has(it.id) && !isOpen) onDone('remove', it.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, opened])

  const active = ordered.filter((it) => !doneSet.has(it.id) || opened === it.id)
  const isOpen = (it) => opened === it.id

  return (
    <>
      {/* markers (under the note layer) */}
      <div className="hotspots">
        {active.map((it) => {
          const avail = available.has(it.id)
          const hidden = it.hidden && !avail
          if (hidden) return null
          return (
            <button
              key={it.id}
              type="button"
              className={`hotspot ${avail ? 'is-available' : 'is-locked'} ${isOpen(it) ? 'is-open' : ''}`}
              style={{
                left: `${it.x ?? 50}%`,
                top: `${it.y ?? 50}%`,
                '--r': `${it.radius ?? 44}px`,
              }}
              onClick={() => avail && onOpen(it.id)}
              disabled={!avail}
              aria-label={it.label ?? 'More about this'}
              title={avail ? it.label ?? 'Open' : 'Find the other signal first'}
            >
              <span className="hotspot__ring" aria-hidden="true" />
              <span className="hotspot__dot" aria-hidden="true" />
              {it.label && <span className="hotspot__label">{it.label}</span>}
              {it.emote && (
                <Emote
                  name={it.emote}
                  speed={it.emoteSpeed}
                  scale={it.emoteScale ?? 2}
                  className="emote--marker"
                  style={{ animationDelay: `${(it.delay ?? 0) + (it.emoteDelay ?? 0)}s` }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* the open note / image panel */}
      {opened && byId[opened] && (
        <div
          className={`note-backdrop ${byId[opened].target === 'page' ? 'note-backdrop--page' : ''}`}
          onClick={onClose}
        >
          <div
            className={`note ${byId[opened].target === 'page' ? 'note--page' : ''}`}
            style={{ '--note-w': byId[opened].width ? `${byId[opened].width}px` : 'auto' }}
            role="dialog"
            aria-modal="false"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="note__close" onClick={onClose} aria-label="Close">
              <span aria-hidden="true">✕</span>
            </button>
            {byId[opened].speaker && <span className="note__speaker">{byId[opened].speaker}</span>}
            <p className="note__text">
              {byId[opened].label && <span className="note__title">{byId[opened].label}</span>}
              {byId[opened].text}
              {byId[opened].detail && (
                <>
                  {' '}
                  <span className="note__detail">{byId[opened].detail}</span>
                </>
              )}
            </p>
            {byId[opened].image && (
              <img className="note__img" src={byId[opened].image} alt={byId[opened].label ?? ''} />
            )}
            {byId[opened].target === 'page' && (
              <button
                type="button"
                className="note__go"
                onClick={() => onDone('go', byId[opened].go)}
              >
                {byId[opened].goLabel ?? 'Continue ›'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
