import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Scene from './Scene'
import Bubbles from './Bubbles'
import TitleScreen from './TitleScreen'
import Choices from './Choices'
import { play as sfx } from './sound'
import PageControls from './ui/PageControls'
import { useReducedMotion } from './motion'
import {
  applyEffects,
  derivedCounters,
  filterBubbles,
  formatText,
  testCond,
  visibleChoices,
} from './story'

// Story navigation is a small state machine over story.json's state graph:
//   { id, flags, counters, visited[], history[] }
// `flags` drive conditions/interpolation, `counters` track progress, `history`
// powers the Back button.
export default function App() {
  const [story, setStory] = useState(null)
  const [error, setError] = useState(null)
  const [play, setPlay] = useState(false)
  const [nav, setNav] = useState(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    document.documentElement.dataset.reduce = reduced ? '1' : '0'
  }, [reduced])

  useEffect(() => {
    fetch('/story.json')
      .then((r) => {
        if (!r.ok) throw new Error(`story.json: ${r.status}`)
        return r.json()
      })
      .then((s) => {
        setStory(s)
        // ?page=<state id> opens that page straight away (for testing and screenshots).
        const jump = new URLSearchParams(window.location.search).get('page')
        const first = jump && s.states[jump] ? jump : s.start
        setNav({ id: first, flags: {}, counters: {}, visited: [first], history: [] })
        if (jump && s.states[jump]) setPlay(true)
      })
      .catch((e) => setError(e.message))
  }, [])

  const states = story?.states ?? {}
  // story.order lists the book's spreads in reading order (the hub and the hidden
  // test pages are not in it). Without it, every non-test state counts.
  const order = story?.order ?? Object.keys(states).filter((id) => !states[id]._test)
  const total = order.length
  const current = nav ? states[nav.id] : null

  // Quiet pages: a class on <body> lets the CSS calm things down.
  const quietPage = play && !!current?.quiet
  useEffect(() => {
    document.body.classList.toggle('quiet', quietPage)
  }, [quietPage])

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
  // The first spread of a part shows its chapter banner first; its words wait for it.
  const chapterDelay = current?.chapter ? 2.6 : 0
  const bubbles = current
    ? filterBubbles(current.bubbles, nav.flags, counters).map((b) => ({
        ...b,
        text: formatText(b.text, nav.flags, counters),
        delay: (b.delay ?? 0) + chapterDelay,
      }))
    : []
  const choices = current ? visibleChoices(current, nav.flags, counters) : []
  // Page number in the book: this spread's place in story.order (on the hub, the
  // last spread read before it).
  const lastInBook = [nav.id, ...nav.history.slice().reverse()].find((id) => order.includes(id))
  const position = lastInBook ? order.indexOf(lastInBook) + 1 : 1
  const nextId = current?.next ?? null
  // The pages a reader can turn to next, so their images load ahead of time.
  const upcoming = current
    ? [current.next, ...(current.choices ?? []).map((c) => c.to), current.input?.to]
        .filter((id) => id && states[id])
        .map((id) => states[id])
    : []

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
          <Scene page={scene} cover={story.cover} isPlaying={play} upcoming={upcoming} />
        </Suspense>
      </div>

      {play && (
        <Bubbles
          key={`${nav.id}:${nav.history.length}`}
          quiet={!!current?.quiet}
          bubbles={bubbles}
        />
      )}

      {play && current?.chapter && (
        <div key={`chapter:${nav.id}`} className="chapter" role="note">
          <span className="chapter__title">{current.chapter.title}</span>
          {current.chapter.subtitle && <span className="chapter__subtitle">{current.chapter.subtitle}</span>}
        </div>
      )}

      {play && (choices.length > 0 || current?.input) && (
        <Choices key={nav.id} state={{ ...current, choices }} onChoose={choose} />
      )}

      {play && (
        <PageControls
          position={position}
          total={total}
          canBack={nav.history.length > 0}
          canNext={!!nextId}
          onBack={back}
          onNext={() => go(nextId)}
        />
      )}
    </>
  )
}
