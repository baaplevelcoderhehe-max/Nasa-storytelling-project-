// Central interface-sound engine.
// All UI sounds live in /public/sfx and are served from /sfx/*.
//
// Browsers block audio until a user gesture, so initSound() is called from the
// TitleScreen "Begin" click. Every play() before that is a silent no-op.

const BASE = '/sfx'

// Expand "family: count" into the numbered file list (files are family_NNN.ogg).
const series = (family, count) =>
  Array.from({ length: count }, (_, i) => `${family}_${String(i + 1).padStart(3, '0')}.ogg`)

// Every action picks a random file from its family (or family mix) and gets a
// pitch jitter, so repeats — page turns especially — never sound identical.
// Exception: clicks. Every click interaction shares ONE fixed sample (no random
// pick, no pitch shift), so a tap always sounds identical everywhere.
const CLICK_FILE = 'click_002.ogg'

const SOUNDS = {
  begin: series('maximize', 9),
  confirm: series('confirmation', 4),
  next: [...series('open', 4), ...series('scroll', 5), ...series('drop', 4)],
  back: [...series('back', 4), ...series('minimize', 9), ...series('scratch', 5), ...series('close', 4)],
  hover: series('select', 8),
  tick: ['tick_001.ogg', 'tick_002.ogg', 'tick_004.ogg'], // the pack has no tick_003
  pluck: series('pluck', 2),
  bong: series('bong', 1),
  question: series('question', 4),
  glass: series('glass', 6),
  error: series('error', 8),
  glitch: series('glitch', 4),
  click: [CLICK_FILE], // one shared click sample for every click interaction
  switch: series('switch', 7),
  toggle: series('toggle', 4),
  signal: series('question', 4), // "awake the machine" ping
}

// Click sounds are the one family that must not be pitch-shifted: jitter makes
// a quick UI tap sound like a different (often harsh) sample every time.
const NO_JITTER = new Set(['click'])

let ctx = null
let master = null
const buffers = new Map()
let enabled = true
let volume = 0.6

// Must be called from a user gesture (click / keydown) at least once.
export function initSound() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume()
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = enabled ? volume : 0
  master.connect(ctx.destination)
}

export function setSoundEnabled(value) {
  enabled = value
  if (ctx && master) {
    master.gain.setTargetAtTime(value ? volume : 0, ctx.currentTime, 0.02)
  }
}

export function setSoundVolume(value) {
  volume = value
  if (ctx && master && enabled) {
    master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02)
  }
}

function loadFile(url) {
  if (!ctx) return Promise.resolve(null)
  let pending = buffers.get(url)
  if (!pending) {
    pending = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`)
        return r.arrayBuffer()
      })
      .then((ab) => ctx.decodeAudioData(ab))
      .catch(() => null)
    buffers.set(url, pending)
  }
  return pending
}

function load(file) {
  return loadFile(`${BASE}/${file}`)
}

// play('next', { gain: 0.5, rate: 1, jitter: 0.15, delay: 0 })
//   gain   – per-sound volume on top of the master volume
//   rate   – base playback rate (pitch)
//   jitter – random pitch variation, ±jitter fraction (0.15 = ±15%)
//   delay  – seconds before the sound starts (for layered accents)
export function play(name, { gain = 1, rate = 1, jitter = 0, delay = 0 } = {}) {
  if (!ctx || !enabled) return
  const files = SOUNDS[name]
  if (!files?.length) return
  const file = files[(Math.random() * files.length) | 0]
  const pitchJitter = NO_JITTER.has(name) ? 0 : jitter
  load(file).then((buf) => {
    if (!buf || !ctx || !enabled) return
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * pitchJitter)
    const g = ctx.createGain()
    g.gain.value = gain
    src.connect(g)
    g.connect(master)
    src.onended = () => {
      src.disconnect()
      g.disconnect()
    }
    src.start(ctx.currentTime + delay)
  })
}

// ---------- ambient music (title screen) ----------

const MUSIC_URL = '/ambient-music.ogg'
const MUSIC_VOLUME = 0.6

let musicSrc = null
let musicGain = null
let musicWanted = false
let musicStopTimer = null

// Loops the title-screen ambience. No-op while it is already playing. Browsers
// block audio before a gesture, so if the context is still suspended the loop
// starts silently and fades in as soon as the first gesture resumes it.
export function startMusic({ fadeInSeconds = 3 } = {}) {
  if (!ctx) initSound()
  if (musicSrc || musicWanted) return
  musicWanted = true
  loadFile(MUSIC_URL).then((buf) => {
    if (!buf || !ctx || !musicWanted || musicSrc) return
    musicGain = ctx.createGain()
    musicGain.gain.value = 0
    musicGain.connect(master)
    musicSrc = ctx.createBufferSource()
    musicSrc.buffer = buf
    musicSrc.loop = true
    musicSrc.connect(musicGain)
    musicSrc.start()
    const t = ctx.currentTime
    musicGain.gain.cancelScheduledValues(t)
    musicGain.gain.setValueAtTime(0, t)
    musicGain.gain.linearRampToValueAtTime(MUSIC_VOLUME, t + fadeInSeconds)
  })
}

// Fades the ambience out, then stops and disconnects the loop.
export function stopMusic(fadeSeconds = 2.5) {
  musicWanted = false
  if (!ctx || !musicSrc || !musicGain) return
  const src = musicSrc
  const g = musicGain
  musicSrc = null
  musicGain = null
  clearTimeout(musicStopTimer)
  const t = ctx.currentTime
  g.gain.cancelScheduledValues(t)
  g.gain.setValueAtTime(g.gain.value, t)
  g.gain.linearRampToValueAtTime(0, t + fadeSeconds)
  musicStopTimer = setTimeout(() => {
    try {
      src.stop()
    } catch {
      /* already stopped */
    }
    src.disconnect()
    g.disconnect()
  }, fadeSeconds * 1000 + 300)
}
