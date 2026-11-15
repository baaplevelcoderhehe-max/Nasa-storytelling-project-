import React, { useEffect, useState } from 'react'
import { play as sfx } from '../sound'
import { speak, speechAvailable, stopSpeaking } from './readAloud'

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

function SpeakerIcon({ on }) {
  return (
    <svg viewBox="0 0 24 24" className="icon-btn__svg" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      {on ? (
        <path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="icon-btn__svg" aria-hidden="true">
      <path
        d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.3 2.4-1.9-.4a6.8 6.8 0 0 0-.7-1.7l1.1-1.6-1.9-1.9-1.6 1.1a6.8 6.8 0 0 0-1.7-.7L13.2 3.8h-2.6l-.4 1.9a6.8 6.8 0 0 0-1.7.7L6.9 5.3 5 7.2l1.1 1.6a6.8 6.8 0 0 0-.7 1.7l-1.9.4v2.6l1.9.4c.2.6.4 1.2.7 1.7L5 17.2l1.9 1.9 1.6-1.1c.5.3 1.1.5 1.7.7l.4 1.9h2.6l.4-1.9c.6-.2 1.2-.4 1.7-.7l1.6 1.1 1.9-1.9-1.1-1.6c.3-.5.5-1.1.7-1.7l1.9-.4z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Reads the page's Spark and Story out loud. Hidden where the browser can't speak. */
function ReadAloud({ text, pageKey }) {
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => {
    setSpeaking(false)
    stopSpeaking()
    return () => stopSpeaking()
  }, [pageKey])
  if (!speechAvailable() || !text) return null
  return (
    <button
      type="button"
      className="icon-btn"
      aria-pressed={speaking}
      aria-label={speaking ? 'Stop reading' : 'Read this page aloud'}
      onClick={() => {
        if (speaking) {
          stopSpeaking()
          setSpeaking(false)
        } else {
          setSpeaking(true)
          speak(text, { onEnd: () => setSpeaking(false) })
        }
      }}
    >
      <SpeakerIcon on={!speaking} />
    </button>
  )
}

export default function PageControls({ position, total, canBack, canNext, onBack, onNext, onSettings, readText, readAloud, pageKey }) {
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
      <div className="controls__middle">
        {readAloud ? <ReadAloud text={readText} pageKey={pageKey} /> : <span className="icon-btn icon-btn--space" aria-hidden="true" />}
        <Progress position={position} total={total} />
        <button type="button" className="icon-btn" onClick={onSettings} aria-label="Settings">
          <GearIcon />
        </button>
      </div>
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
