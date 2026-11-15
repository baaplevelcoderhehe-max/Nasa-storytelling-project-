import React, { useEffect, useRef, useState } from 'react'
import { ArtImg, clamp, ease, useClock, useLoop, wobble } from './kit'

// The tap moments from the script's "Tap" lines. Each one is a small scene drawn in
// a crayon card: the reader makes it happen, and nothing can be failed.
// Props: done (finished already), onDone(), poke() (the reader did something, so
// no idle hint is needed yet). Facts shown (heights, times, counts) come from
// docs/script.md.

const W = 400
const H = 240
const INK = '#2b1d14'

function Stage({ children, label, sky = 'night', className = '', data = {} }) {
  return (
    <svg className={`moment__stage moment__stage--${sky} ${className}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} {...data}>
      {children}
    </svg>
  )
}

/** A picture from the book's art, placed inside the SVG stage. */
function Pic({ name, x, y, w, h, style }) {
  return (
    <foreignObject x={x} y={y} width={w} height={h} style={{ overflow: 'visible' }}>
      <ArtImg name={name} className="moment__pic" style={style} />
    </foreignObject>
  )
}

function Ground({ y = 200, color = '#b9b3aa', t = 0 }) {
  return (
    <path
      d={`M0 ${y + wobble(1, t)} C 120 ${y - 6} 260 ${y + 6} ${W} ${y + wobble(2, t)} L ${W} ${H} L 0 ${H} Z`}
      fill={color}
      stroke={INK}
      strokeWidth="2"
      strokeOpacity="0.5"
    />
  )
}

function Btn({ children, onClick, disabled, ...rest }) {
  return (
    <button type="button" className="crayon-btn moment__btn" onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  )
}

/** A button that counts as held while pressed (mouse, touch, Space or Enter). */
function HoldBtn({ children, onHold, disabled }) {
  const set = (v) => !disabled && onHold(v)
  return (
    <button
      type="button"
      className="crayon-btn moment__btn moment__btn--hold"
      disabled={disabled}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        set(true)
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onPointerLeave={() => set(false)}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault()
          set(true)
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') set(false)
      }}
      onBlur={() => set(false)}
    >
      {children}
    </button>
  )
}

function Status({ children }) {
  return (
    <p className="moment__status" role="status">
      {children}
    </p>
  )
}

const useFinish = (cond, onDone, delay = 600) => {
  useEffect(() => {
    if (!cond) return undefined
    const id = setTimeout(onDone, delay)
    return () => clearTimeout(id)
  }, [cond]) // eslint-disable-line react-hooks/exhaustive-deps
}

// ---------- P.2 tune the dial ----------
function Dial({ done, onDone, poke }) {
  const target = 72
  const [v, setV] = useState(done ? target : 18)
  const t = useClock(true)
  const off = Math.abs(v - target) / 100
  const clear = off < 0.04
  useFinish(clear, onDone, 900)
  const pts = Array.from({ length: 81 }, (_, i) => {
    const x = (i / 80) * W
    const noise = (Math.sin(i * 7.3 + Math.floor(t * 14) * 3.1) * 43758.5453) % 1
    const y = 110 + Math.sin(i / 5 + t * 3) * 28 * (1 - off * 0.6) + noise * 90 * Math.min(1, off * 2.2)
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  })
  const change = (n) => {
    poke()
    setV(clamp(n, 0, 100))
  }
  return (
    <>
      <Stage label="A round screen showing a signal wave" sky="screen">
        <rect x="20" y="20" width={W - 40} height="180" rx="40" fill="#123" stroke={INK} strokeWidth="4" />
        <path d={pts.join(' ')} fill="none" stroke={clear ? '#9ff0c0' : '#cfe8ff'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {clear && <Pic name="echo_excited" x="300" y="128" w="60" h="80" style={{ animation: 'moment-spin 0.9s ease-in-out 2' }} />}
      </Stage>
      <div className="moment__row">
        <Btn onClick={() => change(v - 4)} aria-label="Turn the dial left">◀</Btn>
        <input
          className="moment__dial"
          type="range"
          min="0"
          max="100"
          value={v}
          onChange={(e) => change(Number(e.target.value))}
          aria-label="Dial"
          aria-valuetext={clear ? 'clear signal' : 'static'}
        />
        <Btn onClick={() => change(v + 4)} aria-label="Turn the dial right">▶</Btn>
      </div>
      <Status>{clear ? 'A clear wave!' : 'Static… keep turning.'}</Status>
    </>
  )
}

// ---------- 1.2 Engine off! ----------
function EngineOff({ done, onDone, poke }) {
  const [go, setGo] = useState(done)
  const T = 3.4
  const t = useClock(go, T)
  useFinish(go && t >= T, onDone, 400)
  // Height in metres: drop, bounce to about 10 m, then 3 m, then settle (Mission Log).
  const hop = (s, a, b, peak) => (s < a || s > b ? null : peak * 4 * ((s - a) / (b - a)) * (1 - (s - a) / (b - a)))
  let h = 4
  if (go) {
    if (t < 0.5) h = 4 * (1 - t / 0.5)
    else h = hop(t, 0.5, 2.1, 10) ?? hop(t, 2.1, 2.9, 3) ?? 0
  }
  const settled = go && t >= 2.9
  const px = 9.5 // pixels per metre, so the 10 m hop stays inside the picture
  const flame = !settled && Math.floor(t * 12 + (go ? 0 : performance.now() / 80)) % 2
  const peak1 = go && t > 1.1 && t < 1.8
  const peak2 = go && t > 2.35 && t < 2.75
  return (
    <>
      <Stage label="Surveyor 3 landing on the Moon" sky="night">
        <Ground y={206} />
        <ellipse cx="200" cy="208" rx={60 - h * 2.5} ry="6" fill="#000" opacity="0.25" />
        <Pic name={settled ? 'surveyor3' : 'surveyor3_engine_on'} x="150" y={206 - 96 - h * px} w="100" h="100" />
        {flame && !settled ? <path d={`M192 ${206 - h * px} l8 ${14 + (t % 0.2) * 20} l8 -${14}`} fill="#ffc35a" opacity="0.8" /> : null}
        {peak1 && <text x="270" y={206 - 10 * px} className="moment__label">about 10 m</text>}
        {peak2 && <text x="270" y={206 - 3 * px - 40} className="moment__label">3 m</text>}
      </Stage>
      <div className="moment__row">
        <Btn
          onClick={() => {
            poke()
            setGo(true)
          }}
          disabled={go}
        >
          Engine off!
        </Btn>
      </div>
      <Status>{settled ? 'Bounce… bounce… settled!' : go ? 'Hop!' : 'Surveyor is coming down.'}</Status>
    </>
  )
}

// ---------- 1.3 drag the scoop ----------
function Scoop({ done, onDone, poke }) {
  const [depth, setDepth] = useState(done ? 1 : 0)
  const drag = useRef(null)
  const t = useClock(true)
  const dig = (amount) => {
    poke()
    setDepth((d) => clamp(d + amount, 0, 1))
  }
  useFinish(depth >= 1, onDone, 500)
  const x = 90 + depth * 220
  const trench = `M80 196 C ${120} ${196 + depth * 26} ${80 + depth * 240} ${196 + depth * 26} ${Math.max(90, x + 10)} 196`
  return (
    <>
      <Stage label="Surveyor's scoop digging a trench in the Moon's soil" sky="night">
        <Ground y={196} />
        <path d={trench} fill="#6d6760" stroke={INK} strokeWidth="2" opacity={depth > 0 ? 1 : 0} />
        <g
          className="moment__drag"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId)
            drag.current = e.clientX
          }}
          onPointerMove={(e) => {
            if (drag.current === null) return
            const d = e.clientX - drag.current
            drag.current = e.clientX
            if (d > 0) dig(d / 600)
          }}
          onPointerUp={() => (drag.current = null)}
        >
          <Pic name="surveyor3_scoop" x={x - 70} y={110 + wobble(3, t, 2)} w="120" h="90" />
        </g>
      </Stage>
      <div className="moment__row">
        <Btn onClick={() => dig(0.25)} disabled={depth >= 1}>
          Dig
        </Btn>
      </div>
      <Status>{depth >= 1 ? 'A trench! The soil holds its shape.' : 'Drag the scoop to the right, or press Dig.'}</Status>
    </>
  )
}

// ---------- 1.5 fire the laser ----------
function Laser({ done, onDone, poke }) {
  const [go, setGo] = useState(done)
  const T = 2.5 // "comes back about 2.5 seconds later" (script)
  const t = useClock(go, T)
  useFinish(go && t >= T, onDone, 700)
  const p = t / T
  const leg = p < 0.5 ? p * 2 : (1 - p) * 2
  const bx = 70 + leg * 250
  return (
    <>
      <Stage label="A laser beam from Earth to the Moon and back" sky="night">
        <circle cx="50" cy="120" r="34" fill="#3f7fd0" stroke={INK} strokeWidth="3" />
        <path d="M30 108 q12 -10 22 0 q8 8 18 2" fill="none" stroke="#7cc47a" strokeWidth="6" strokeLinecap="round" />
        <circle cx="345" cy="120" r="24" fill="#cfcac2" stroke={INK} strokeWidth="3" />
        {go && t < T && <line x1="70" y1="120" x2={bx} y2="120" stroke="#ff5a5a" strokeWidth="3" strokeDasharray="6 6" />}
        {go && t < T && <circle cx={bx} cy="120" r="6" fill="#ff8080" />}
        <text x="200" y="200" textAnchor="middle" className="moment__counter">
          {t.toFixed(1)} s
        </text>
      </Stage>
      <div className="moment__row">
        <Btn
          onClick={() => {
            poke()
            setGo(true)
          }}
          disabled={go}
        >
          Fire the laser
        </Btn>
      </div>
      <Status>{go && t >= T ? 'Back in about 2.5 seconds!' : go ? 'There and back…' : 'Aim at the Moon.'}</Status>
    </>
  )
}

// ---------- 1.7 drop the ascent stage ----------
function Ascent({ done, onDone, poke }) {
  const [go, setGo] = useState(done)
  const t = useClock(go, 60)
  useFinish(go && t > 4, onDone, 0)
  const fall = clamp(t / 1, 0, 1)
  const hit = go && t >= 1
  const since = Math.max(0, t - 1)
  const pts = Array.from({ length: 101 }, (_, i) => {
    const x = 20 + i * 3.6
    const age = since - (100 - i) * 0.03
    const a = age < 0 || !hit ? 0 : 26 * Math.exp(-age / 14) // keeps wiggling for a long time
    const y = 205 + Math.sin(i * 1.7 + since * 9) * a * (0.6 + 0.4 * Math.sin(i * 0.37))
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  })
  return (
    <>
      <Stage label="The ascent stage crashes far away; a seismograph line wiggles" sky="night">
        <path d="M0 140 C 120 134 260 146 400 138 L400 170 L0 170 Z" fill="#b9b3aa" stroke={INK} strokeOpacity="0.4" />
        {!hit && go && <Pic name="lm_ascent_stage" x={300 - fall * 30} y={10 + ease(fall) * 110} w="34" h="34" />}
        {!go && <Pic name="lm_ascent_stage" x="300" y="10" w="34" h="34" />}
        {hit && since < 1.2 && <circle cx="285" cy="140" r={6 + since * 30} fill="none" stroke="#fff3d1" strokeWidth="3" opacity={1 - since / 1.2} />}
        <rect x="10" y="172" width="380" height="64" rx="8" fill="#fff8e7" stroke={INK} strokeWidth="2" />
        <path d={pts.join(' ')} fill="none" stroke="#c0392b" strokeWidth="2" />
      </Stage>
      <div className="moment__row">
        <Btn
          onClick={() => {
            poke()
            setGo(true)
          }}
          disabled={go}
        >
          Drop the ascent stage
        </Btn>
      </div>
      <Status>{hit ? 'The Moon is ringing… and ringing.' : 'Far away, the empty ascent stage waits.'}</Status>
    </>
  )
}

// ---------- 2.3 scoop soil into Viking's lab ----------
function VikingLab({ done, onDone, poke }) {
  const [step, setStep] = useState(done ? 2 : 0)
  const t = useClock(step === 2, 4)
  useFinish(step === 2 && t >= 3, onDone, 0)
  const scoopX = step === 0 ? 120 : 250
  return (
    <>
      <Stage label="Viking's arm scoops soil into its tiny lab" sky="mars">
        <Ground y={200} color="#d0885a" />
        <rect x="236" y="96" width="100" height="74" rx="8" fill="#eee" stroke={INK} strokeWidth="3" />
        <rect x="250" y="110" width="72" height="46" rx="6" fill="#bfe3ff" stroke={INK} strokeWidth="2" />
        <path d={`M300 170 L ${scoopX + 10} 180`} stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d={`M${scoopX - 6} 178 q16 14 32 0 z`} fill="#999" stroke={INK} strokeWidth="2" />
        {step >= 1 && step < 2 && <ellipse cx={scoopX + 10} cy="178" rx="12" ry="5" fill="#a0552c" />}
        {step === 2 &&
          Array.from({ length: 9 }, (_, i) => {
            const life = (t * 0.8 + i * 0.37) % 1
            return <circle key={i} cx={262 + ((i * 23) % 52)} cy={152 - life * 40} r={3 + (i % 3)} fill="#fff" stroke="#6fb7e8" opacity={1 - life} />
          })}
        {step === 2 && t > 1.8 && (
          <text x="350" y="92" className="moment__label moment__label--big">
            ?
          </text>
        )}
      </Stage>
      <div className="moment__row">
        <Btn
          onClick={() => {
            poke()
            setStep(1)
          }}
          disabled={step > 0}
        >
          Scoop soil
        </Btn>
        <Btn
          onClick={() => {
            poke()
            setStep(2)
          }}
          disabled={step !== 1}
        >
          Into the lab
        </Btn>
      </div>
      <Status>{step === 2 ? 'Bubbles and sparkles… what does it mean?' : step === 1 ? 'Now drop it into the lab.' : 'Scoop some soil first.'}</Status>
    </>
  )
}

// ---------- 2.4 release the airbags ----------
function Airbags({ done, onDone, poke }) {
  const [go, setGo] = useState(done)
  const T = 7
  const t = useClock(go, T)
  useFinish(go && t >= T, onDone, 300)
  // About 15 bounces (script), each lower and shorter, drifting right, then a roll.
  const BOUNCES = 15
  const durs = Array.from({ length: BOUNCES }, (_, i) => 0.62 * Math.pow(0.82, i))
  let s = Math.max(0, t - 0.6)
  let n = 0
  let y = 0
  for (; n < BOUNCES; n++) {
    if (s < durs[n]) {
      const p = s / durs[n]
      y = 120 * Math.pow(0.76, n) * 4 * p * (1 - p)
      break
    }
    s -= durs[n]
  }
  const fallY = go && t < 0.6 ? 150 * (1 - t / 0.6) : 0
  const x = 60 + clamp(t / T, 0, 1) * 260
  const count = go ? Math.min(BOUNCES, n) : 0
  return (
    <>
      <Stage label="Pathfinder's airbags bounce across a rocky valley" sky="mars">
        <Ground y={204} color="#d0885a" />
        <ellipse cx={x + 30} cy="206" rx="34" ry="5" fill="#000" opacity="0.2" />
        <Pic name="pathfinder_airbags" x={x} y={204 - 64 - y - fallY} w="64" h="64" style={{ transform: `rotate(${t * 140}deg)` }} />
        <text x="390" y="30" textAnchor="end" className="moment__counter">
          {count} / {BOUNCES}
        </text>
      </Stage>
      <div className="moment__row">
        <Btn
          onClick={() => {
            poke()
            setGo(true)
          }}
          disabled={go}
        >
          Release the airbags
        </Btn>
      </div>
      <Status>{go && t >= T ? 'About 15 bounces, then a roll to a stop.' : go ? 'Boing!' : 'Ready to drop.'}</Status>
    </>
  )
}

// ---------- 2.6 dig with Phoenix ----------
function PhoenixDig({ done, onDone, poke }) {
  const [step, setStep] = useState(done ? 2 : 0)
  const t = useClock(step === 2, 6)
  useFinish(step === 2 && t >= 6, onDone, 300)
  const day = step < 2 ? 0 : Math.min(4, 1 + Math.floor(t / 1.4))
  const bits = step === 0 ? 0 : step === 1 ? 1 : clamp(1 - (t - 0.8) / 4.6, 0, 1)
  return (
    <>
      <Stage label="Phoenix digs a trench; white bits appear, then vanish over four days" sky="arctic">
        <Ground y={180} color="#d7b9a8" />
        <path d="M60 180 l40 -10 l60 6 l70 -8 l90 10" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" />
        {step > 0 && <path d="M120 182 C 150 214 230 214 260 182 Z" fill="#8b5a42" stroke={INK} strokeWidth="2" />}
        {Array.from({ length: 7 }, (_, i) => (
          <circle key={i} cx={140 + i * 17} cy={196 + (i % 2) * 6} r={4 + (i % 3)} fill="#fff" opacity={bits} />
        ))}
        {step === 2 && (
          <text x="200" y="60" textAnchor="middle" className="moment__counter">
            Day {day}
          </text>
        )}
      </Stage>
      <div className="moment__row">
        <Btn
          onClick={() => {
            poke()
            setStep(1)
          }}
          disabled={step > 0}
        >
          Dig
        </Btn>
        <Btn
          onClick={() => {
            poke()
            setStep(2)
          }}
          disabled={step !== 1}
        >
          Watch the days pass
        </Btn>
      </div>
      <Status>{step === 2 && t >= 5.6 ? 'Day 4: the white bits are gone!' : step === 1 ? 'White bits! Now watch the days.' : 'Dig a trench with Phoenix’s arm.'}</Status>
    </>
  )
}

// ---------- 3.2 steer under the dust devil ----------
function DustDevil({ done, onDone, poke }) {
  // Opportunity starts on the far side, so the reader has to drive to meet the dust devil.
  const [x, setX] = useState(330)
  const [clean, setClean] = useState(done)
  const steer = useRef(0)
  const t = useClock(true)
  const devilX = 40 + (((t * 45) % 420) - 20)
  useLoop(!clean, (dt) => {
    if (steer.current) setX((v) => clamp(v + steer.current * 140 * dt, 40, 360))
  })
  useEffect(() => {
    if (!clean && Math.abs(devilX - x) < 26) setClean(true)
  }, [devilX, x, clean])
  useFinish(clean, onDone, 1200)
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'ArrowLeft') steer.current = -1
      else if (e.key === 'ArrowRight') steer.current = 1
      else return
      e.preventDefault()
      poke()
    }
    const up = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') steer.current = 0
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [poke])
  const hold = (dir) => ({
    onPointerDown: () => {
      poke()
      steer.current = dir
    },
    onPointerUp: () => (steer.current = 0),
    onPointerLeave: () => (steer.current = 0),
    onClick: () => setX((v) => clamp(v + dir * 30, 40, 360)),
  })
  return (
    <>
      <Stage label="Opportunity steers under a passing dust devil" sky="mars">
        <Ground y={200} color="#d6955f" />
        {!clean && <Pic name="dust_devil" x={devilX - 30} y="80" w="60" h="110" style={{ opacity: 0.85 }} />}
        <Pic name="mer_rover" x={x - 48} y="120" w="96" h="90" />
        {!clean && <rect x={x - 40} y="136" width="80" height="10" rx="4" fill="#b07a4a" opacity="0.75" />}
        {clean &&
          [0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${x - 30 + i * 20} ${132 - (t % 1) * 6} l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 z`} fill="#fff6c8" />
          ))}
      </Stage>
      <div className="moment__row">
        <Btn {...hold(-1)} aria-label="Steer left" disabled={clean}>
          ◀
        </Btn>
        <Btn {...hold(1)} aria-label="Steer right" disabled={clean}>
          ▶
        </Btn>
      </div>
      <Status>{clean ? 'Whoosh! The panels sparkle.' : 'Steer under the dust devil (arrow keys work too).'}</Status>
    </>
  )
}

/** A scrolling line with events (marsquakes, star dips) the reader taps. */
function useEvents(running, period = 3.2, length = 1.6) {
  const t = useClock(running)
  const n = Math.floor((t - 1) / period)
  const local = t - 1 - n * period
  const active = t > 1 && local < length
  return { t, active, index: n }
}

// ---------- 3.5 tap the marsquake wiggle ----------
function Marsquake({ done, onDone, poke }) {
  const [found, setFound] = useState(done ? 3 : 0)
  const [last, setLast] = useState(-1)
  const [miss, setMiss] = useState(false)
  const { t, active, index } = useEvents(found < 3)
  useFinish(found >= 3, onDone, 700)
  const pts = Array.from({ length: 121 }, (_, i) => {
    const x = i * (W / 120)
    const tt = t - (120 - i) * 0.03
    const n = Math.floor((tt - 1) / 3.2)
    const local = tt - 1 - n * 3.2
    const quake = tt > 1 && local < 1.3 ? Math.sin((local / 1.3) * Math.PI) : 0
    const y = 120 + Math.sin(i * 2.1 + t * 20) * (3 + quake * 48) * (0.6 + 0.4 * Math.sin(i * 0.9))
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  })
  return (
    <>
      <Stage label="A seismograph line; tap when a marsquake wiggle appears" sky="paper" data={{ 'data-active': active ? 1 : 0 }}>
        <path d={pts.join(' ')} fill="none" stroke="#c0392b" strokeWidth="2.5" />
        <text x="390" y="30" textAnchor="end" className="moment__counter">
          {found} / 3
        </text>
      </Stage>
      <div className="moment__row">
        <Btn
          disabled={found >= 3}
          onClick={() => {
            poke()
            if (active && index !== last) {
              setFound((f) => f + 1)
              setLast(index)
              setMiss(false)
            } else setMiss(true)
          }}
        >
          Quake!
        </Btn>
      </div>
      <Status>{found >= 3 ? 'You heard Mars rumble!' : miss ? 'Wait for the big wiggle…' : 'Listen… tap when the line shakes.'}</Status>
    </>
  )
}

// ---------- 3.7 hold to fly Ingenuity, then land ----------
function Ingenuity({ done, onDone, poke }) {
  const [held, setHeld] = useState(false)
  const [h, setH] = useState(0)
  const [hover, setHover] = useState(0)
  const [phase, setPhase] = useState(done ? 'done' : 'up')
  const vy = useRef(0)
  const band = [100, 160]
  const hRef = useRef(0)
  useLoop(phase !== 'done', (dt) => {
    vy.current += (held ? 160 : -120) * dt
    vy.current = clamp(vy.current, -70, 70)
    const n = clamp(hRef.current + vy.current * dt, 0, 190)
    if (n === 0 && vy.current < 0) vy.current = 0
    hRef.current = n
    setH(n)
    // Time spent hovering inside the glowing band.
    if (n >= band[0] && n <= band[1]) setHover((x) => x + dt)
  })
  useEffect(() => {
    if (phase === 'up' && hover >= 2) setPhase('land')
    if (phase === 'land' && h === 0) setPhase('done')
  }, [phase, hover, h])
  useFinish(phase === 'done', onDone, 500)
  const t = useClock(true)
  return (
    <>
      <Stage label="Ingenuity lifts off, hovers in the glowing band, and lands" sky="mars" data={{ 'data-height': Math.round(h), 'data-phase': phase }}>
        <rect x="0" y={200 - band[1]} width={W} height={band[1] - band[0]} fill="#ffe28a" opacity={phase === 'up' ? 0.3 + 0.1 * Math.sin(t * 4) : 0.08} />
        <Ground y={200} color="#d0885a" />
        <rect x="160" y="196" width="80" height="8" rx="4" fill={phase === 'land' ? '#fff3b0' : '#c47a4c'} />
        <ellipse cx="200" cy="202" rx={34 - h / 8} ry="4" fill="#000" opacity="0.25" />
        <Pic name="ingenuity" x="165" y={200 - 66 - h} w="70" h="66" />
      </Stage>
      <div className="moment__row">
        <HoldBtn
          disabled={phase === 'done'}
          onHold={(v) => {
            poke()
            setHeld(v)
          }}
        >
          {phase === 'land' ? 'Hold (or let go to land)' : 'Hold to fly'}
        </HoldBtn>
      </div>
      <Status>
        {phase === 'done' ? 'Landed! A powered flight on Mars.' : phase === 'land' ? 'Now let go, and land on the flat spot.' : 'Hold to lift off; hover in the glowing band.'}
      </Status>
    </>
  )
}

// ---------- 4.2 gentle pushes to land NEAR ----------
function NearLand({ done, onDone, poke }) {
  const WALK = 10 // the "walking speed" mark on the meter
  const MIN_SINK = 8 // it always keeps sinking gently, just under walking speed
  const [state, setState] = useState(done ? { h: 0, v: 0, landed: true } : { h: 130, v: 26, landed: false })
  useLoop(!state.landed, (dt) => {
    setState((s) => {
      if (s.landed) return s
      let v = Math.max(MIN_SINK, s.v + 1.5 * dt)
      let h = s.h - v * dt
      if (h <= 0) {
        if (v <= WALK) return { h: 0, v: 0, landed: true }
        return { h: 8, v: MIN_SINK, landed: false } // too fast: one small hop, then it settles
      }
      return { h, v, landed: false }
    })
  })
  useFinish(state.landed, onDone, 600)
  const speed = clamp(state.v, 0, 40)
  return (
    <>
      <Stage label="NEAR Shoemaker lowers gently onto Eros" sky="night">
        <Ground y={200} color="#b9a48a" />
        <Pic name="near_shoemaker" x="150" y={200 - 70 - state.h} w="100" h="70" />
        <rect x="350" y="40" width="20" height="150" rx="6" fill="#fff8e7" stroke={INK} strokeWidth="2" />
        <rect x="353" y={190 - (speed / 40) * 150} width="14" height={(speed / 40) * 150} rx="4" fill={speed <= WALK ? '#7cc47a' : '#e8a04a'} />
        <line x1="344" x2="376" y1={190 - (WALK / 40) * 150} y2={190 - (WALK / 40) * 150} stroke={INK} strokeWidth="2" strokeDasharray="4 3" />
        <text x="340" y={194 - (WALK / 40) * 150} textAnchor="end" className="moment__small moment__small--light">
          walking speed
        </text>
      </Stage>
      <div className="moment__row">
        <Btn
          disabled={state.landed}
          onClick={() => {
            poke()
            setState((s) => ({ ...s, v: Math.max(0, s.v - 6) }))
          }}
        >
          Gentle push
        </Btn>
      </div>
      <Status>{state.landed ? 'Touchdown, about as fast as you walk.' : 'Give little pushes to slow down.'}</Status>
    </>
  )
}

// ---------- 4.4 hold a gentle push: Vesta to Ceres ----------
function DawnPush({ done, onDone, poke }) {
  const [held, setHeld] = useState(false)
  const [p, setP] = useState(done ? 1 : 0)
  useLoop(p < 1 && held, (dt) => setP((v) => Math.min(1, v + dt / 6)))
  useFinish(p >= 1, onDone, 600)
  const point = (q) => {
    const a = q * Math.PI * 1.15
    return [70 + q * 260 + Math.sin(a * 2) * 18, 150 - Math.sin(a) * 90]
  }
  const dots = Array.from({ length: Math.floor(p * 40) + 1 }, (_, i) => point(i / 40))
  const [dx, dy] = point(p)
  return (
    <>
      <Stage label="Dawn's gentle engine carries it from Vesta to Ceres" sky="space">
        <foreignObject x="30" y="120" width="70" height="70">
          <ArtImg name="vesta" className="moment__pic" />
        </foreignObject>
        <foreignObject x="310" y="120" width="70" height="70">
          <ArtImg name="ceres" className="moment__pic" />
        </foreignObject>
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#fff3d1" opacity="0.8" />
        ))}
        {held && p < 1 && <circle cx={dx - 22} cy={dy + 4} r="12" fill="#8fdcff" opacity="0.45" />}
        <Pic name="dawn" x={dx - 30} y={dy - 22} w="60" h="44" />
      </Stage>
      <div className="moment__row">
        <HoldBtn
          disabled={p >= 1}
          onHold={(v) => {
            poke()
            setHeld(v)
          }}
        >
          Hold a gentle push
        </HoldBtn>
      </div>
      <Status>{p >= 1 ? 'Arrived at Ceres!' : held ? 'Gently… gently…' : 'Hold the button to push softly.'}</Status>
    </>
  )
}

// ---------- 5.1 tap each dip ----------
function Dips({ done, onDone, poke }) {
  const [found, setFound] = useState(done ? 3 : 0)
  const [last, setLast] = useState(-1)
  const [miss, setMiss] = useState(false)
  const { t, active, index } = useEvents(found < 3, 3.4, 1.7)
  useFinish(found >= 3, onDone, 800)
  const level = (tt) => {
    const n = Math.floor((tt - 1) / 3.4)
    const local = tt - 1 - n * 3.4
    return tt > 1 && local < 1.4 ? Math.sin((local / 1.4) * Math.PI) : 0
  }
  const pts = Array.from({ length: 121 }, (_, i) => {
    const x = i * (W / 120)
    const y = 150 + level(t - (120 - i) * 0.03) * 40 + Math.sin(i * 3.1 + t * 9) * 1.5
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  })
  const now = level(t)
  return (
    <>
      <Stage label="A star's brightness line; tap each dip" sky="space" data={{ 'data-active': active ? 1 : 0 }}>
        <circle cx="200" cy="64" r={34} fill="#fff0b0" opacity={1 - now * 0.35} />
        <circle cx="200" cy="64" r={50} fill="#fff0b0" opacity={0.15 - now * 0.08} />
        {active && <circle cx={168 + (t - 1 - index * 3.4) / 1.4 * 64} cy="64" r="7" fill="#2b2f55" />}
        <path d={pts.join(' ')} fill="none" stroke="#fff3d1" strokeWidth="2.5" />
        <text x="390" y="30" textAnchor="end" className="moment__counter moment__counter--light">
          {found} / 3
        </text>
      </Stage>
      <div className="moment__row">
        <Btn
          disabled={found >= 3}
          onClick={() => {
            poke()
            if (active && index !== last) {
              setFound((f) => f + 1)
              setLast(index)
              setMiss(false)
            } else setMiss(true)
          }}
        >
          Dip!
        </Btn>
      </div>
      <Status>{found >= 3 ? 'Three planets found!' : miss ? 'Wait until the star dims…' : 'Watch the line. Tap when it dips.'}</Status>
    </>
  )
}

// ---------- 5.4 the Pioneer plaque ----------
const PLAQUE_PARTS = [
  { key: 'people', label: 'the people', box: [0.5, 0.4, 0.2, 0.36], below: true },
  { key: 'sun', label: 'the Sun', box: [0.06, 0.76, 0.12, 0.2] },
  { key: 'planets', label: 'the planets', box: [0.19, 0.78, 0.69, 0.16] },
  { key: 'craft', label: 'the spacecraft', box: [0.62, 0.04, 0.34, 0.36] },
]
function Plaque({ done, onDone, poke }) {
  const [seen, setSeen] = useState(done ? PLAQUE_PARTS.map((p) => p.key) : [])
  useFinish(seen.length === PLAQUE_PARTS.length, onDone, 900)
  return (
    <>
      <div className="moment__plaque">
        <ArtImg name="pioneer_plaque" className="moment__plaque-img" alt="The Pioneer plaque" />
        {PLAQUE_PARTS.map((p) => {
          const open = seen.includes(p.key)
          const [x, y, w, h] = p.box
          return (
            <button
              key={p.key}
              type="button"
              className={`moment__part${open ? ' is-open' : ''}`}
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
              aria-label={open ? p.label : `Part of the plaque (${PLAQUE_PARTS.indexOf(p) + 1} of 4)`}
              onClick={() => {
                poke()
                setSeen((s) => (s.includes(p.key) ? s : [...s, p.key]))
              }}
            >
              {open && <span className={`moment__tag${p.below ? ' moment__tag--below' : ''}`}>{p.label}</span>}
            </button>
          )
        })}
      </div>
      <Status>
        {seen.length === 4 ? 'A picture of us, and where we live.' : `Tap each part of the plaque (${seen.length} of 4).`}
      </Status>
    </>
  )
}

// ---------- F.3 the signal to Voyager ----------
function Pulse({ done, onDone, poke }) {
  const T = 20 // the 24-hour trip, sped up to about 20 s
  const t = useClock(true, T)
  // No automatic page turn: the reader presses Continue (or Skip) when ready.
  const p = t / T
  const x = 60 + p * 270
  return (
    <>
      <Stage label="A glowing pulse travels from the dish to Voyager: 24 hours to Voyager" sky="space">
        <text x="200" y="40" textAnchor="middle" className="moment__counter moment__counter--light">
          24 hours to Voyager
        </text>
        <circle cx="50" cy="140" r="20" fill="#3f7fd0" stroke="#fff3d1" strokeWidth="2" />
        <line x1="70" y1="140" x2="330" y2="140" stroke="#fff3d1" strokeWidth="2" strokeDasharray="3 7" />
        <Pic name="voyager" x="322" y="110" w="70" h="60" />
        <circle cx={x} cy="140" r="14" fill="#8fdcff" opacity="0.35" />
        <circle cx={x} cy="140" r="6" fill="#e8fbff" />
        <text x="200" y="200" textAnchor="middle" className="moment__counter moment__counter--light">
          {Math.min(24, Math.floor(p * 24))} h
        </text>
      </Stage>
      <div className="moment__row">
        <Btn
          onClick={() => {
            poke()
            onDone()
          }}
        >
          {t >= T ? 'Continue' : 'Skip'}
        </Btn>
      </div>
      <Status>{t >= T ? 'Your message has a whole day’s journey… and it’s on its way.' : 'Your message is travelling…'}</Status>
    </>
  )
}

export const ACTIONS = {
  dial: { title: 'Turn the dial', hint: 'Slide the dial until the wave looks smooth.', Component: Dial },
  engineOff: { title: 'Engine off!', hint: 'Press “Engine off!” to start the landing.', Component: EngineOff },
  scoop: { title: 'Drag the scoop', hint: 'Drag the scoop along the ground, or press Dig.', Component: Scoop },
  laser: { title: 'Fire the laser', hint: 'Press “Fire the laser” and watch the counter.', Component: Laser },
  ascent: { title: 'Drop the ascent stage', hint: 'Press the button to drop the ascent stage.', Component: Ascent },
  vikingLab: { title: 'Scoop soil', hint: 'Scoop soil, then drop it into the lab.', Component: VikingLab },
  airbags: { title: 'Release the airbags', hint: 'Press “Release the airbags”.', Component: Airbags },
  phoenixDig: { title: 'Dig with Phoenix', hint: 'Press Dig, then watch the days pass.', Component: PhoenixDig },
  dustDevil: { title: 'Catch the wind', hint: 'Use ◀ ▶ (or the arrow keys) to drive under the dust devil.', Component: DustDevil },
  marsquake: { title: 'Listen for marsquakes', hint: 'Tap “Quake!” while the line is shaking hard.', Component: Marsquake },
  ingenuity: { title: 'Fly Ingenuity', hint: 'Press and hold to lift off; let go to come down.', Component: Ingenuity },
  nearLand: { title: 'Land NEAR gently', hint: 'Tap “Gentle push” to slow down to walking speed.', Component: NearLand },
  dawnPush: { title: 'Hold a gentle push', hint: 'Press and hold the button.', Component: DawnPush },
  dips: { title: 'Spot the dips', hint: 'Tap “Dip!” when the star gets dimmer.', Component: Dips },
  plaque: { title: 'Read the plaque', hint: 'Tap the pictures on the plaque.', Component: Plaque },
  pulse: { title: 'Send it to Voyager', hint: 'Watch the pulse travel, or press Skip.', Component: Pulse },
}
