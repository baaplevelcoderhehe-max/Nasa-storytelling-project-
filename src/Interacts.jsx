import React, { useCallback, useEffect, useRef, useState } from 'react'
import { play } from './sound'
import { ACTIONS } from './moments/actions'

// The things a reader can tap on a spread (story.json: state.interacts).
//
//   { "id": "tap", "action": "engineOff" }          a tap moment (see moments/actions.jsx)
//   { "id": "log", "label": "Mission Log",
//     "facts": ["Landed April 20, 1967.", ...] }     a note with Mission Log facts
//   { "id": "x", "label": "…", "text": "…" }        a plain note
//
// They sit in a bar just above the page controls (bubbles keep clear of it). A tap
// moment opens in a crayon card over the scene; it can always be closed or skipped,
// and the page can always be turned. Works with mouse, touch and keyboard (Escape
// closes the card). If the reader does nothing for 8 seconds, a hint appears.

const IDLE_MS = 8000

function useIdle(active, deps) {
  const [idle, setIdle] = useState(false)
  const timer = useRef(null)
  const poke = useCallback(() => {
    setIdle(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setIdle(true), IDLE_MS)
  }, [])
  useEffect(() => {
    if (!active) {
      clearTimeout(timer.current)
      setIdle(false)
      return undefined
    }
    poke()
    return () => clearTimeout(timer.current)
  }, [active, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps
  return [idle, poke]
}

function MomentCard({ item, done, onDone, onClose }) {
  const action = ACTIONS[item.action]
  const [finished, setFinished] = useState(done)
  const [idle, poke] = useIdle(!finished, [item.id])
  const card = useRef(null)
  const back = useRef(typeof document !== 'undefined' ? document.activeElement : null)

  useEffect(() => {
    // The scene behind the card pauses while it is open (Scene listens for this).
    window.dispatchEvent(new CustomEvent('moment', { detail: true }))
    return () => window.dispatchEvent(new CustomEvent('moment', { detail: false }))
  }, [])

  useEffect(() => {
    // Move focus into the card; give it back when the card closes.
    const first = card.current?.querySelector('button:not(:disabled), input')
    ;(first ?? card.current)?.focus()
    const returnTo = back.current
    return () => returnTo?.focus?.()
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const finish = useCallback(() => {
    setFinished(true)
    onDone()
  }, [onDone])

  const Component = action.Component
  return (
    <div className="moment-backdrop" onClick={onClose}>
      <div
        ref={card}
        className="moment"
        role="dialog"
        aria-modal="true"
        aria-label={item.label ?? action.title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={poke}
      >
        <div className="moment__head">
          <h2 className="moment__title">{item.label ?? action.title}</h2>
          <button type="button" className="moment__close" onClick={onClose} aria-label={finished ? 'Close' : 'Skip this and close'}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <Component done={done} onDone={finish} poke={poke} />
        {idle && !finished && (
          <p className="moment__hint" role="status">
            {action.hint}
          </p>
        )}
        {finished && item.action !== 'pulse' && (
          <div className="moment__row">
            <button type="button" className="crayon-btn moment__btn" onClick={onClose}>
              Back to the story
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function NoteCard({ item, onClose }) {
  const card = useRef(null)
  useEffect(() => {
    card.current?.querySelector('button')?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="moment-backdrop" onClick={onClose}>
      <div ref={card} className="note-card" role="dialog" aria-modal="true" aria-label={item.label} onClick={(e) => e.stopPropagation()}>
        <div className="moment__head">
          <h2 className="moment__title">{item.label}</h2>
          <button type="button" className="moment__close" onClick={onClose} aria-label="Close">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {item.facts ? (
          <ul className="note-card__facts">
            {item.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : (
          <p className="note-card__text">{item.text}</p>
        )}
      </div>
    </div>
  )
}

/**
 * pageKey: the state id (resets what has been opened). autoOpen: an interact id to
 * open straight away (used by the F.3 pulse after Send). onFinish(item): called when
 * a moment is completed (the pulse uses it to turn the page).
 */
export default function Interacts({ interacts = [], pageKey, autoOpen, onFinish, onAutoClosed }) {
  const [opened, setOpened] = useState(null)
  const [done, setDone] = useState([])
  const visible = interacts.filter((it) => !it.hidden)
  const firstTap = visible.find((it) => it.action && !done.includes(it.id))
  const [idle, poke] = useIdle(!!firstTap && !opened, [pageKey])

  useEffect(() => {
    setOpened(null)
    setDone([])
  }, [pageKey])

  useEffect(() => {
    if (autoOpen) setOpened(autoOpen)
  }, [autoOpen])

  const open = (it) => {
    play('signal', { gain: 0.25, jitter: 0.05 })
    poke()
    setOpened(it.id)
  }
  const close = useCallback(() => {
    if (opened && interacts.find((i) => i.id === opened)?.hidden) onAutoClosed?.()
    setOpened(null)
  }, [opened, interacts, onAutoClosed])

  const item = interacts.find((it) => it.id === opened)
  return (
    <>
      {visible.length > 0 && (
        <div className="hotspots" role="group" aria-label="Things to try on this page">
          {visible.map((it) => {
            const isTap = !!it.action
            const isDone = done.includes(it.id)
            const label = it.label ?? ACTIONS[it.action]?.title ?? 'Open'
            return (
              <button
                key={it.id}
                type="button"
                className={`${isTap ? 'tap-btn crayon-btn' : 'paper-tag'}${isDone ? ' is-done' : ''}${
                  isTap && idle && it === firstTap ? ' is-hinting' : ''
                }`}
                onClick={() => open(it)}
              >
                {isTap && (
                  <span className="tap-btn__icon" aria-hidden="true">
                    {isDone ? '✓' : '✋'}
                  </span>
                )}
                {label}
              </button>
            )
          })}
          {idle && firstTap && (
            <span className="hotspots__hint" role="status">
              Try it: tap “{firstTap.label ?? ACTIONS[firstTap.action]?.title}”
            </span>
          )}
        </div>
      )}
      {item?.action && ACTIONS[item.action] && (
        <MomentCard
          key={item.id}
          item={item}
          done={done.includes(item.id)}
          onDone={() => {
            setDone((d) => (d.includes(item.id) ? d : [...d, item.id]))
            onFinish?.(item)
          }}
          onClose={close}
        />
      )}
      {item && !item.action && <NoteCard item={item} onClose={close} />}
    </>
  )
}
