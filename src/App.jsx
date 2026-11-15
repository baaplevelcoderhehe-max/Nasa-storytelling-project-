import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Bubbles from './Bubbles'
import TitleScreen from './TitleScreen'
import Choices from './Choices'
import Interacts from './Interacts'

// The 3D scene (three.js, React Three Fiber, postprocessing) is the biggest part of the
// app, so it loads in the background while a still picture of the cover shows.
const Scene = lazy(() => import('./Scene'))
import SceneAnim from './SceneAnims'
import { play as sfx, setMusicVolume, setSoundEnabled } from './sound'
import PageControls from './ui/PageControls'
import Settings from './ui/Settings'
import Credits from './ui/Credits'
import { useReducedMotion } from './motion'
import { lightDayWords } from './lightDay'
import { selectHasSave, useBook } from './store'
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
// It lives in the saved store (src/store.js), so a refresh keeps the reader's place.
// `flags` drive conditions/interpolation, `counters` track progress, `history`
// powers the Back button.
export default function App() {
  const [story, setStory] = useState(null)
  const [error, setError] = useState(null)
  const [play, setPlay] = useState(false)
  const [panel, setPanel] = useState(null) // 'settings' | 'credits' | null
  const [autoOpen, setAutoOpen] = useState(null)
  const [pendingTo, setPendingTo] = useState(null)
  // The 3D scene has drawn its first frame: the still cover picture fades away.
  const [sceneReady, setSceneReady] = useState(false)
  const waiting = useRef(null)
  useEffect(() => {
    const on = () => {
      setSceneReady(true)
      const run = waiting.current
      waiting.current = null
      run?.()
    }
    window.addEventListener('scene-ready', on)
    return () => window.removeEventListener('scene-ready', on)
  }, [])
  // Start loading the 3D scene once the cover has painted and the browser is idle, so
  // the title and the still picture appear first. Test links load it straight away.
  const [loadScene, setLoadScene] = useState(() => /[?&](page|freeze)=/.test(window.location.search))
  useEffect(() => {
    if (loadScene) return undefined
    const go = () => setLoadScene(true)
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(go, { timeout: 1500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(go, 300)
    return () => clearTimeout(id)
  }, [loadScene])
  /** Runs now if the 3D scene is ready, otherwise as soon as it is (Begin, Continue). */
  const whenReady = (fn) => (sceneReady ? fn() : (waiting.current = fn))

  const nav = useBook((s) => s.nav)
  const setNav = useBook((s) => s.setNav)
  const startAt = useBook((s) => s.start)
  const clearProgress = useBook((s) => s.clearProgress)
  const hasSave = useBook(selectHasSave)
  const sound = useBook((s) => s.settings.sound)
  const musicVolume = useBook((s) => s.settings.musicVolume)
  const textSize = useBook((s) => s.settings.textSize)
  const readAloud = useBook((s) => s.settings.readAloud)

  useEffect(() => {
    setAutoOpen(null)
    setPendingTo(null)
  }, [nav?.id])

  // Settings take effect everywhere.
  const reduced = useReducedMotion()
  useEffect(() => {
    document.documentElement.dataset.reduce = reduced ? '1' : '0'
  }, [reduced])
  useEffect(() => {
    document.documentElement.dataset.textSize = String(textSize)
  }, [textSize])
  useEffect(() => setSoundEnabled(sound), [sound])
  useEffect(() => setMusicVolume(musicVolume / 100), [musicVolume])

  useEffect(() => {
    fetch('/story.json')
      .then((r) => {
        if (!r.ok) throw new Error(`story.json: ${r.status}`)
        return r.json()
      })
      .then((s) => {
        setStory(s)
        // ?page=<state id> opens that page straight away (tests and screenshots;
        // such links never touch the reader's save).
        const jump = new URLSearchParams(window.location.search).get('page')
        if (jump && s.states[jump]) {
          useBook.getState().start(jump)
          setPlay(true)
        }
      })
      .catch((e) => setError(e.message))
  }, [])

  const states = story?.states ?? {}
  // story.order lists the book's spreads in reading order (the hub and the hidden
  // test pages are not in it). Without it, every non-test state counts.
  const order = story?.order ?? Object.keys(states).filter((id) => !states[id]._test)
  const total = order.length
  const current = nav && play ? states[nav.id] : null

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
    [nav, states, counters, setNav],
  )

  const back = useCallback(() => {
    if (!nav || nav.history.length === 0) return
    sfx('back', { gain: 0.45, jitter: 0.12 })
    const prev = nav.history[nav.history.length - 1]
    setNav({ ...nav, id: prev, history: nav.history.slice(0, -1) })
  }, [nav, setNav])

  // Choice / input submit. `reset` restarts the book (settings stay); `open` opens a panel.
  const choose = useCallback(
    (choice) => {
      if (!choice || !nav) return
      if (choice.open) {
        setPanel(choice.open)
        return
      }
      if (choice.reset) {
        sfx('confirm', { gain: 0.4, jitter: 0.08 })
        startAt(story.start)
        return
      }
      sfx('click', { gain: 0.25 })
      // An answer with an action (F.3 Send): keep the answer, play the moment first;
      // the moment turns the page when it is finished.
      if (choice.action) {
        setNav((n) => ({ ...n, flags: { ...n.flags, ...(choice.set ?? {}) } }))
        setPendingTo(choice.to)
        setAutoOpen(choice.action)
        return
      }
      go(choice.to, choice.set)
    },
    [nav, story, go, setNav, startAt],
  )

  useEffect(() => {
    if (!play) return undefined // arrows/space do nothing on the title screen
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|BUTTON|SELECT|A)$/.test(e.target.tagName)) return
      // While a card (tap moment, note, settings, credits) is open, its own keys win.
      if (document.querySelector('.moment-backdrop')) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        if (current?.next) go(current.next)
      }
      if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play, current, go, back])

  if (error) return <div className="status">Could not load story: {error}</div>
  // While the story loads, keep showing the still cover picture from index.html.
  if (!story)
    return (
      <picture className="boot-still" aria-label="Still Out There is opening" role="img">
        <source media="(orientation: portrait)" srcSet="/art/cover-portrait.webp" width="780" height="1688" />
        <img src="/art/cover-landscape.webp" width="1600" height="900" alt="" />
      </picture>
    )

  // Words that change with the date ({voyagerHome}, {voyagerReach}), plus the flags.
  const vars = { ...(nav?.flags ?? {}), ...lightDayWords() }
  // States are keyed by id in the JSON but the objects themselves don't carry
  // one; Scene keys its renderer on page.id, so attach it here.
  const scene = current ? { ...current, id: nav.id } : null
  // The first spread of a part shows its chapter banner first; its words wait for it.
  const chapterDelay = current?.chapter ? 2.6 : 0
  const bubbles = current
    ? filterBubbles(current.bubbles, nav.flags, counters).map((b) => ({
        ...b,
        text: formatText(b.text, vars, counters),
        delay: (b.delay ?? 0) + chapterDelay,
      }))
    : []
  const pageText = bubbles
    .map((b) => (b.speaker ? `${b.speaker}: ${b.text}` : b.text))
    .filter(Boolean)
    .join(' ')
  // Read aloud: the Spark and the Story (and Voyager's lines), in reading order.
  const readText = bubbles
    .map((b) => b.text)
    .filter(Boolean)
    .join(' ')
  const choices = current ? visibleChoices(current, nav.flags, counters) : []
  // Page number in the book: this spread's place in story.order (on the hub, the
  // last spread read before it).
  const lastInBook = nav ? [nav.id, ...nav.history.slice().reverse()].find((id) => order.includes(id)) : null
  const position = lastInBook ? order.indexOf(lastInBook) + 1 : 1
  const nextId = current?.next ?? null
  // The pages a reader can turn to next, so their images load ahead of time.
  const upcoming = current
    ? [current.next, ...(current.choices ?? []).map((c) => c.to), current.input?.to]
        .filter((id) => id && states[id])
        .map((id) => states[id])
    : []
  const sceneAlt = current?.alt ?? story.cover?.alt ?? story.title

  const openBook = (id) => {
    startAt(id)
    setPlay(true)
  }

  return (
    <>
      {!play && (
        <TitleScreen
          title={story.title}
          subtitle={story.subtitle}
          hasSave={hasSave}
          panelOpen={!!panel}
          onStart={() => whenReady(() => openBook(story.start))}
          onContinue={() =>
            whenReady(() => {
              if (nav && states[nav.id]) setPlay(true)
              else openBook(story.start)
            })
          }
          onStartOver={() =>
            whenReady(() => {
              clearProgress()
              openBook(story.start)
            })
          }
          onSettings={() => setPanel('settings')}
          onCredits={() => setPanel('credits')}
        />
      )}

      {/* The picture: described in words for screen readers ("alt" on every page). */}
      <div className="scene" role="img" aria-label={sceneAlt}>
        <Suspense fallback={play ? <div className="status">Turning page…</div> : null}>
          {loadScene && <Scene page={scene} cover={story.cover} isPlaying={play && !!current} upcoming={upcoming} />}
        </Suspense>
        {/* A still picture of the cover scene, shown at once over the canvas; it fades away
            when the 3D scene is drawing. */}
        {!play && (
          <picture className={`scene__still${sceneReady ? ' is-hidden' : ''}`} aria-hidden="true">
            <source media="(orientation: portrait)" srcSet="/art/cover-portrait.webp" width="780" height="1688" />
            <img src="/art/cover-landscape.webp" width="1600" height="900" alt="" decoding="async" fetchpriority="high" />
          </picture>
        )}
      </div>

      {/* Each page's words, announced in reading order. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {play && current ? pageText : ''}
      </div>

      {play && current && (
        <Bubbles key={`${nav.id}:${nav.history.length}`} quiet={!!current?.quiet} bubbles={bubbles} />
      )}

      {play && current?.anim && <SceneAnim key={`anim:${nav.id}`} anim={current.anim} pageKey={nav.id} />}

      {play && current?.interacts?.length > 0 && (
        <Interacts
          interacts={current.interacts}
          pageKey={nav.id}
          autoOpen={autoOpen}
          onFinish={(item) => {
            if (item.action === 'pulse' && pendingTo) go(pendingTo)
          }}
          onAutoClosed={() => setAutoOpen(null)}
        />
      )}

      {play && current?.chapter && (
        <div key={`chapter:${nav.id}`} className="chapter" role="note">
          <span className="chapter__title">{current.chapter.title}</span>
          {current.chapter.subtitle && <span className="chapter__subtitle">{current.chapter.subtitle}</span>}
        </div>
      )}

      {play && current && (choices.length > 0 || current?.input) && (
        <Choices key={nav.id} state={{ ...current, choices }} onChoose={choose} />
      )}

      {play && current && (
        <PageControls
          position={position}
          total={total}
          canBack={nav.history.length > 0}
          canNext={!!nextId}
          onBack={back}
          onNext={() => go(nextId)}
          onSettings={() => setPanel('settings')}
          readText={readText}
          readAloud={readAloud}
          pageKey={nav.id}
        />
      )}

      {panel === 'settings' && <Settings onClose={() => setPanel(null)} />}
      {panel === 'credits' && <Credits onClose={() => setPanel(null)} />}
    </>
  )
}
