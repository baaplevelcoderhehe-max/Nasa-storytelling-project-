import React, { useEffect, useRef } from 'react'

// A paper card over the page (Settings, Credits, "Are you sure?"). Focus moves into it
// and goes back where it was when it closes; Escape or the ✕ closes it; Tab stays
// inside while it is open.
export default function Panel({ title, onClose, children, className = '', wide = false }) {
  const card = useRef(null)
  const back = useRef(typeof document !== 'undefined' ? document.activeElement : null)

  useEffect(() => {
    const el = card.current
    el?.querySelector('button, [href], input, select')?.focus()
    const returnTo = back.current
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !el) return
      const items = [...el.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select')]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      returnTo?.focus?.()
    }
  }, [onClose])

  return (
    <div className="moment-backdrop panel-backdrop" onClick={onClose}>
      <div
        ref={card}
        className={`note-card panel ${wide ? 'panel--wide' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="moment__head">
          <h2 className="moment__title">{title}</h2>
          <button type="button" className="moment__close" onClick={onClose} aria-label="Close">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
