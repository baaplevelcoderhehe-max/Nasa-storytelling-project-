import React from 'react'

// Speech bubbles are plain HTML laid over the scene. Positions are % of screen.
// Remount per page (key) so the "delay" animation replays on every page turn.
export default function Bubbles({ bubbles = [] }) {
  return (
    <div className="bubbles">
      {bubbles.map((b, i) => {
        const style = b.style ?? 'speech'
        const tail = style === 'speech' || style === 'shout' ? b.tail ?? 'left' : 'none'
        return (
          <div
            key={i}
            className={`bubble ${style} tail-${tail}`}
            style={{
              left: `${b.x ?? 50}%`,
              top: `${b.y ?? 50}%`,
              animationDelay: `${b.delay ?? 0}s`,
              maxWidth: b.width ? `${b.width}px` : undefined,
            }}
          >
            {b.speaker && <span className="speaker">{b.speaker}</span>}
            {b.text}
          </div>
        )
      })}
    </div>
  )
}
