import React, { useEffect, useState } from 'react'
import { initSound, play, startMusic, stopMusic } from './sound'

// The book's cover. The picture behind it (the hill, the dish, Kit and Echo) is the
// "cover" scene in story.json, drawn by Scene; this is only the words and the button.
export default function TitleScreen({ title, subtitle = "NASA's explorers, still out there", onStart }) {
  const [leaving, setLeaving] = useState(false)

  const start = () => {
    if (leaving) return
    setLeaving(true)
    initSound() // browser requires audio to start from a user gesture
    stopMusic(2.5) // ambience fades out as the cover opens
    play('click', { gain: 0.25 })
    setTimeout(onStart, 900) // matches the exit animation
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
    const onKey = (e) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className={`cover ${leaving ? 'cover--leaving' : ''}`}>
      <header className="cover__top">
        <h1 className="cover__title" aria-label={title}>
          {/* Whole words wrap together; each letter tilts a little (hand-lettered). */}
          {title.split(' ').map((word, w, words) => {
            const start = words.slice(0, w).join(' ').length + (w > 0 ? 1 : 0)
            return (
              <React.Fragment key={w}>
                <span className="cover__word" aria-hidden="true">
                  {[...word].map((ch, i) => (
                    <span key={i} className="cover__letter" style={{ '--i': start + i }}>
                      {ch}
                    </span>
                  ))}
                </span>
                {w < words.length - 1 ? ' ' : null}
              </React.Fragment>
            )
          })}
        </h1>
        <p className="cover__banner">{subtitle}</p>
      </header>

      <div className="cover__bottom">
        <button type="button" className="crayon-btn cover__begin" onClick={start}>
          Begin
        </button>
        <p className="cover__hint">or press Enter</p>
      </div>
    </div>
  )
}
