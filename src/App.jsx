import React, { Suspense, useCallback, useEffect, useState } from 'react'
import Scene from './Scene'
import Bubbles from './Bubbles'

export default function App() {
  const [story, setStory] = useState(null)
  const [error, setError] = useState(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    fetch('/story.json')
      .then((r) => {
        if (!r.ok) throw new Error(`story.json: ${r.status}`)
        return r.json()
      })
      .then(setStory)
      .catch((e) => setError(e.message))
  }, [])

  const count = story?.pages.length ?? 0
  const go = useCallback(
    (d) => setIndex((i) => Math.min(count - 1, Math.max(0, i + d))),
    [count],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  if (error) return <div className="status">Could not load story: {error}</div>
  if (!story) return <div className="status">Opening book…</div>

  const page = story.pages[index]
  return (
    <>
      <div className="scene">
        <Suspense fallback={<div className="status">Turning page…</div>}>
          <Scene page={page} />
        </Suspense>
      </div>
      <Bubbles key={page.id ?? index} bubbles={page.bubbles} />
      <header className="title">{story.title}</header>
      <nav className="nav">
        <button onClick={() => go(-1)} disabled={index === 0} aria-label="Previous page">
          ‹
        </button>
        <span>
          {index + 1} / {count}
        </span>
        <button onClick={() => go(1)} disabled={index === count - 1} aria-label="Next page">
          ›
        </button>
      </nav>
    </>
  )
}
