import React from 'react'
import { play as sfx } from '../sound'

// The bottom controls: big crayon Back / Next buttons and a hand-drawn progress line.
// Their height is --controls-h in crayon.css; bubbles stay above --controls-clear.

function Arrow({ dir }) {
  // A slightly wobbly, hand-drawn arrow.
  const d = dir < 0 ? 'M15 5 L7.5 12.2 L15.2 19' : 'M9 5 L16.5 12.2 L8.8 19'
  return (
    <svg className="crayon-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// A gently wavy line; the read part is drawn in solid crayon, the rest dotted.
const LINE = 'M4 12 C 30 8, 52 15, 78 11 S 128 8, 156 12 S 206 15, 236 11'

function Progress({ position, total }) {
  const share = total > 1 ? Math.min(1, Math.max(0, (position - 1) / (total - 1))) : 0
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Pages read"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={position}
      aria-valuetext={`Page ${position} of ${total}`}
    >
      <svg className="progress__line" viewBox="0 0 240 24" preserveAspectRatio="none" aria-hidden="true">
        <path d={LINE} pathLength="100" className="progress__todo" />
        <path d={LINE} pathLength="100" className="progress__done" style={{ strokeDasharray: `${share * 100} 100` }} />
      </svg>
      <span className="progress__count" aria-hidden="true">
        {position} / {total}
      </span>
    </div>
  )
}

export default function PageControls({ position, total, canBack, canNext, onBack, onNext }) {
  return (
    <nav className="controls" aria-label="Story controls">
      <button
        type="button"
        className="crayon-btn controls__btn"
        onClick={onBack}
        disabled={!canBack}
        onMouseEnter={() => canBack && sfx('hover', { gain: 0.18, jitter: 0.08 })}
      >
        <Arrow dir={-1} />
        <span className="controls__label">Back</span>
      </button>
      <Progress position={position} total={total} />
      <button
        type="button"
        className="crayon-btn controls__btn"
        onClick={onNext}
        disabled={!canNext}
        onMouseEnter={() => canNext && sfx('hover', { gain: 0.18, jitter: 0.08 })}
      >
        <span className="controls__label">Next</span>
        <Arrow dir={1} />
      </button>
    </nav>
  )
}
