import React, { useEffect, useState } from 'react'
import { initSound, play, startMusic, stopMusic } from './sound'

// The book's cover. The picture behind it is the opening scene (the hill, the dish,
// Kit and Echo), the same scene prologue-1 uses, so pressing Begin only fades the
// words away and the story starts right there: no cut, no reload.

const FADE_MS = 1000

// Tiny twinkling stars around the title: [left %, top %, size px, delay s]
const TITLE_STARS = [
  [4, 18, 10, 0],
  [96, 10, 12, 0.7],
  [12, 88, 8, 1.3],
  [88, 82, 9, 0.4],
  [50, -6, 7, 1.8],
  [-2, 52, 7, 2.2],
  [101, 48, 8, 1.1],
]

function PaperPanel({ title, onClose }) {
  return (
    <div className="paper-panel" role="dialog" aria-modal="true" aria-label={title}>
      <div className="paper-panel__card">
        <h2 className="paper-panel__title">{title}</h2>
        <p className="paper-panel__text">Coming soon.</p>
        <button type="button" className="crayon-btn paper-panel__close" onClick={onClose} autoFocus>
          Close
        </button>
      </div>
    </div>
  )
}

export default function TitleScreen({
  title,
  subtitle = "NASA's explorers, still out there",
  hasSave = false,
  onStart,
  onContinue,
}) {
  const [leaving, setLeaving] = useState(false)
  const [panel, setPanel] = useState(null)

  const start = (resume) => {
    if (leaving) return
    setLeaving(true)
    initSound() // browser requires audio to start from a user gesture
    stopMusic(2.5)
    play('click', { gain: 0.25 })
    // The words fade out first; then the story begins in the same scene.
    setTimeout(resume && onContinue ? onContinue : onStart, FADE_MS)
  }

  // Browsers block audio before a gesture: the ambience starts on the first
  // interaction anywhere (or immediately if the browser allows autoplay).
  useEffect(() => {
    startMusic()
    const wake = () => initSound()
    window.addEventListener('pointerdown', wake, { once: true })
    window.addEventListener('keydown', wake, { once: true })
    return () => {
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [])

  // Enter opens the book from anywhere on the cover. (Space only works on the
  // focused button, so it never fires twice.)
  useEffect(() => {
    if (panel) return undefined
    const onKey = (e) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        start(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className={`cover ${leaving ? 'cover--leaving' : ''}`}>
      <nav className="cover__tags" aria-label="More">
        <button type="button" className="paper-tag" onClick={() => setPanel('Settings')}>
          Settings
        </button>
        <button type="button" className="paper-tag paper-tag--b" onClick={() => setPanel('Credits')}>
          Credits
        </button>
      </nav>

      <header className="cover__top">
        <div className="cover__title-wrap">
          {TITLE_STARS.map(([left, top, size, delay], i) => (
            <span
              key={i}
              className="cover__star"
              aria-hidden="true"
              style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, animationDelay: `${delay}s` }}
            />
          ))}
          <h1 className="cover__title" aria-label={title}>
            {/* Whole words wrap together; each letter wobbles a little, like crayon. */}
            {title.split(' ').map((word, w, words) => {
              const start = words.slice(0, w).join(' ').length + (w > 0 ? 1 : 0)
              return (
                <React.Fragment key={w}>
                  <span className="cover__word" aria-hidden="true">
                    {[...word].map((ch, i) => (
                      <span key={i} className="cover__letter" style={{ '--i': start + i }}>
                        <span className="cover__wobble">{ch}</span>
                      </span>
                    ))}
                  </span>
                  {w < words.length - 1 ? ' ' : null}
                </React.Fragment>
              )
            })}
          </h1>
        </div>
        <p className="cover__banner">{subtitle}</p>
      </header>

      <div className="cover__middle">
        {hasSave && (
          <button type="button" className="crayon-btn cover__begin" onClick={() => start(true)}>
            Continue
          </button>
        )}
        <button
          type="button"
          className={`crayon-btn cover__begin${hasSave ? ' cover__begin--second' : ''}`}
          onClick={() => start(false)}
        >
          {hasSave ? 'Start over' : 'Begin'}
        </button>
        <p className="cover__hint">tap or press Enter</p>
      </div>

      {panel && <PaperPanel title={panel} onClose={() => setPanel(null)} />}
    </div>
  )
}
