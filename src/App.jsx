import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Scene from './Scene'
import Bubbles from './Bubbles'
import TitleScreen from './TitleScreen'
import Choices from './Choices'
import { play as sfx } from './sound'
import { NavButton } from './ui/nav'
import { Bar } from './ui/Bar'
import {
  applyEffects,
  derivedCounters,
  filterBubbles,
  formatText,
  testCond,
  visibleChoices,
} from './story'
import './ui.css' // keep AFTER TitleScreen so the skin wins

// Story navigation is a small state machine over story.json's state graph:
//   { id, flags, counters, visited[], history[] }
// `flags` drive conditions/interpolation, `counters` track progress, `history`
// powers the Back button.
export default function App() {
  const [story, setStory] = useState(null)
  const [error, setError] = useState(null)
  const [play, setPlay] = useState(false)
  const [nav, setNav] = useState(null)

  useEffect(() => {
    fetch('/story.json')
      .then((r) => {
        if (!r.ok) throw new Error(`story.json: ${r.status}`)
        return r.json()
      })
      .then((s) => {
        setStory(s)
        setNav({ id: s.start, flags: {}, counters: {}, visited: [s.start], history: [] })
      })
      .catch((e) => setError(e.message))
  }, [])

  const states = story?.states ?? {}
  const total = Object.keys(states).length
  const current = nav ? states[nav.id] : null

  const counters = useMemo(
    () => ({ ...derivedCounters(story, nav?.flags ?? {}), ...(nav?.counters ?? {}) }),
    [story, nav],
  )

  const go = useCallback(
    (to, extraSet) => {
      if (!to || !nav) return
      const st = states[to]
      if (!st) return
      if (st.if && !testCond(st.if, nav.flags, counters)) return
      sfx('next', { gain: 0.45, jitter: 0.12 })
      // nav.counters holds explicit increments only; derived counters (like
      // `chapters`) are recomputed from flags, so they must not be written back.
      const { flags, counters: c } = applyEffects(st, nav.flags, nav.counters, extraSet)
      setNav({
        id: to,
        flags,
        counters: c,
        visited: [...nav.visited, to],
        history: [...nav.history, nav.id],
      })
    },
    [nav, states, counters],
  )

  const back = useCallback(() => {
    if (!nav || nav.history.length === 0) return
    sfx('back', { gain: 0.45, jitter: 0.12 })
    const prev = nav.history[nav.history.length - 1]
    setNav({ ...nav, id: prev, history: nav.history.slice(0, -1) })
  }, [nav])

  // Choice / input submit. `reset` restarts the book from the first state.
  const choose = useCallback(
    (choice) => {
      if (!choice || !nav) return
      if (choice.reset) {
        sfx('confirm', { gain: 0.4, jitter: 0.08 })
        setNav({ id: story.start, flags: {}, counters: {}, visited: [story.start], history: [] })
        return
      }
      sfx('click', { gain: 0.25 })
      go(choice.to, choice.set)
    },
    [nav, story, go],
  )

  useEffect(() => {
    if (!play) return // arrows/space do nothing on the title screen
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return
      if (e.key === 'ArrowRight' || e.key === ' ') current?.next && go(current.next)
      if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play, current, go, back])

  if (error) return <div className="status">Could not load story: {error}</div>
  if (!story || !nav) return <div className="status">Opening book…</div>

  // States are keyed by id in the JSON but the objects themselves don't carry
  // one; Scene keys its renderer on page.id, so attach it here.
  const scene = current ? { ...current, id: nav.id } : null
  const bubbles = current
    ? filterBubbles(current.bubbles, nav.flags, counters).map((b) => ({
        ...b,
        text: formatText(b.text, nav.flags, counters),
      }))
    : []
  const choices = current ? visibleChoices(current, nav.flags, counters) : []
  const seen = new Set(nav.visited).size
  const nextId = current?.next ?? null

  return (
    <>
      {!play && (
        <TitleScreen
          title={story.title}
          subtitle={story.subtitle}
          onStart={() => setPlay(true)}
        />
      )}

      <div className="scene">
        <Suspense fallback={<div className="status">Turning page…</div>}>
          <Scene page={scene} isPlaying={play} />
        </Suspense>
      </div>

      {play && (
        <Bubbles
          key={`${nav.id}:${nav.history.length}`}
          bubbles={bubbles}
        />
      )}

      {play && (choices.length > 0 || current?.input) && (
        <Choices key={nav.id} state={current} onChoose={choose} />
      )}

      {play && (
        <nav className="hud" aria-label="Story controls">
          <NavButton
            dir="-1"
            disabled={nav.history.length === 0}
            onClick={back}
            label="Back"
          />
          <div className="hud__progress">
            <div className="hud__bar">
              <Bar w={220} h={24} theme="Grey" />
              <span className="hud__fill" style={{ width: `${(seen / total) * 100}%` }}>
                <Bar w={220} h={24} theme="Blue" />
              </span>
            </div>
            <span className="hud__count">
              {seen} / {total}
            </span>
          </div>
          <NavButton
            dir="1"
            disabled={!nextId}
            onClick={() => go(nextId)}
            label="Next page"
          />
        </nav>
      )}
    </>
  )
}
