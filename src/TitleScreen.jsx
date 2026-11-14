import React, { useEffect, useState } from 'react'
import './TitleScreen.css'
import { initSound, play, startMusic, stopMusic } from './sound'

export default function TitleScreen({ title, subtitle = "NASA's explorers, still out there", onStart }) {
  const [leaving, setLeaving] = useState(false)

  const start = () => {
    if (leaving) return
    setLeaving(true)
    initSound() // browser requires audio to start from a user gesture
    stopMusic(2.5) // ambience fades out as the title warps away
    play('click', { gain: 0.25 }) // the one and only click sound
    setTimeout(onStart, 1100) // matches exit animation
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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const letters = [...title]

  return (
    <div className={`ts ${leaving ? 'ts--leaving' : ''}`}>
      <div className="ts__glow" />
      <div className="ts__grain" />

      <div className="ts__content">
        <div className="ts__panel">
          <span className="ts__chip">{subtitle}</span>

          <div className="ts__ornament ts__ornament--top"><span /><i>✦</i><span /></div>

          <h1 className="ts__title" aria-label={title}>
            {letters.map((ch, i) => (
              <span key={i} className="ts__letter" style={{ '--i': i }} aria-hidden="true">
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </h1>

          <div className="ts__ornament ts__ornament--bottom"><span /><i>✦</i><span /></div>

          <button
            className="ts__btn"
            onClick={start}
          >
            <span className="ts__btn-text">Begin</span>
            <span className="ts__btn-ring" />
          </button>

          <p className="ts__hint">press enter</p>
        </div>
      </div>
    </div>
  )
}