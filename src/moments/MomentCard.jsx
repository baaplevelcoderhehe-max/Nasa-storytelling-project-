import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ACTIONS } from './actions'
import { useIdle } from './useIdle'

// A tap moment in a crayon card over the scene (loaded only when a reader opens one).
export default function MomentCard({ item, done, onDone, onClose }) {
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

