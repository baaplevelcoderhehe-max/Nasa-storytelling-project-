import React, { useEffect, useLayoutEffect, useRef } from 'react'
import { publishExtraRects } from './layoutBus'
import { FROZEN, clamp, ease, useClock } from './moments/kit'

// Animated scenes that the script says are "made in code" (story.json: state.anim):
//   photo       2.2  Viking's first picture builds up one stripe at a time
//   cutaway     3.6  Mars sliced open; quake waves light up crust, mantle and core
//   planetPops  5.3  tiny planets pop in around the stars until the sky is full
//   markers     F.4  a glowing marker for every explorer, lighting up in story order
// They play on their own when the page opens. Reduced motion (and screenshot mode)
// shows the finished picture straight away. Each box is reported to the bubbles,
// which keep clear of it ("box" is percent of the screen: x, y = centre, w = width).

const STRIPES = 14

function Photo({ t }) {
  const shown = Math.floor(clamp(t / 4, 0, 1) * STRIPES)
  return (
    <div className="anim-photo">
      <svg viewBox="0 0 280 200" role="img" aria-label="Viking's first picture, building up one stripe at a time: rocky ground beside its footpad">
        <defs>
          <clipPath id="photo-reveal">
            <rect x="0" y="0" width={(280 * shown) / STRIPES} height="200" />
          </clipPath>
        </defs>
        <rect width="280" height="200" fill="#3a2a22" />
        <g clipPath="url(#photo-reveal)">
          <rect width="280" height="200" fill="#9a8573" />
          <path d="M0 130 C60 120 140 136 280 122 L280 200 L0 200Z" fill="#7d6857" />
          {[30, 70, 118, 160, 205, 240, 255, 90, 186].map((x, i) => (
            <ellipse key={i} cx={x} cy={150 + ((i * 37) % 40)} rx={6 + (i % 4) * 4} ry={4 + (i % 3) * 3} fill="#5c4a3d" />
          ))}
          {/* the footpad */}
          <ellipse cx="200" cy="172" rx="56" ry="20" fill="#cfc6bb" stroke="#2b1d14" strokeWidth="3" />
          <rect x="190" y="70" width="16" height="96" fill="#bdb3a7" stroke="#2b1d14" strokeWidth="3" />
          {/* scan lines */}
          {Array.from({ length: STRIPES }, (_, i) => (
            <line key={i} x1={(280 * i) / STRIPES} x2={(280 * i) / STRIPES} y1="0" y2="200" stroke="#000" strokeOpacity="0.08" />
          ))}
        </g>
        {shown < STRIPES && (
          <rect x={(280 * shown) / STRIPES} y="0" width={280 / STRIPES} height="200" fill="#fff6d6" opacity="0.5" />
        )}
      </svg>
    </div>
  )
}

function Cutaway({ t }) {
  const R = 100
  const wave = ((t % 3.2) / 3.2) * 2.2 // a wave travels in from the surface every 3.2 s
  const lit = (inner, outer) => {
    const depth = 1 - (inner + outer) / 2 / R
    const d = Math.abs(wave - depth * 1.6)
    return FROZEN || t > 1e6 ? 0.8 : clamp(1 - d * 2.5, 0, 1)
  }
  const layers = [
    { r: R, inner: 82, name: 'crust', color: '#c8663f', glow: '#ffb08a' },
    { r: 82, inner: 36, name: 'mantle', color: '#8e3a28', glow: '#ff8a5a' },
    { r: 36, inner: 0, name: 'core', color: '#e0a341', glow: '#fff0a0' },
  ]
  return (
    <div className="anim-cutaway">
      <svg viewBox="-112 -112 300 224" role="img" aria-label="Mars cut open like a fruit: crust, mantle and core. Quake waves light up each layer.">
        <circle r={R + 4} fill="#2b1d14" />
        {layers.map((l) => {
          const k = lit(l.inner, l.r)
          return <circle key={l.name} r={l.r} fill={l.color} style={{ filter: `drop-shadow(0 0 ${6 * k}px ${l.glow})` }} opacity={0.75 + 0.25 * k} />
        })}
        {/* the slice: a quarter cut away to show the inside */}
        <path d={`M0 0 L${R + 6} 0 A ${R + 6} ${R + 6} 0 0 0 0 ${-(R + 6)} Z`} fill="#0d1230" opacity="0.92" />
        {t < 1e6 && !FROZEN && (
          <circle r={clamp(R * (1 - wave / 1.6), 0, R)} fill="none" stroke="#fff3d1" strokeWidth="3" opacity={wave < 1.6 ? 0.8 : 0} />
        )}
        {/* labels on the right, pointing at each layer along the cut edge */}
        {layers.map((l, i) => {
          const mid = (l.r + l.inner) / 2
          const ly = -78 + i * 34
          return (
            <g key={l.name}>
              <line x1={mid} y1={-4} x2={R + 14} y2={ly} stroke="#fff3d1" strokeWidth="2" />
              <circle cx={mid} cy={-4} r="3.5" fill="#fff3d1" />
              <text x={R + 18} y={ly + 5} className="anim-cutaway__label">
                {l.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Positions of the stars that get planets (percent of the sky area).
const STARS = Array.from({ length: 26 }, (_, i) => {
  const a = Math.sin(i * 91.7) * 43758.5453
  const b = Math.sin(i * 37.3 + 1) * 23421.631
  return [8 + (a - Math.floor(a)) * 84, 6 + (b - Math.floor(b)) * 86]
})

function PlanetPops({ t }) {
  const shown = clamp(Math.floor(t / 0.28), 0, STARS.length)
  return (
    <div className="anim-planets" role="img" aria-label="Around each star, a tiny planet appears, until the whole sky is full.">
      {STARS.map(([x, y], i) => (
        <span key={i} className={`anim-planets__star${i < shown ? ' has-planet' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}>
          <i />
        </span>
      ))}
    </div>
  )
}

// Every explorer Kit and Echo met, in story order (names as the script uses them).
const EXPLORERS = [
  'Surveyor 3',
  'Eagle',
  'Laser reflector',
  'Science station',
  'Lunar rover',
  'Viking 1',
  'Sojourner',
  'Phoenix',
  'Spirit',
  'Opportunity',
  'InSight',
  'Ingenuity',
  'NEAR',
  'Dawn',
  'Kepler',
  'Pioneer 10',
  'Pioneer 11',
]

function Markers({ t }) {
  const shown = clamp(Math.floor(t / 0.35) + 1, 0, EXPLORERS.length)
  const pos = (i) => {
    const p = i / (EXPLORERS.length - 1)
    // A gentle arc that zig-zags a little, so neighbouring names don't touch.
    return [6 + p * 88, 58 - Math.sin(p * Math.PI) * 40 + (i % 2 ? 9 : -9)]
  }
  return (
    <div className="anim-markers" role="img" aria-label={`Glowing markers light up across the sky for every explorer: ${EXPLORERS.join(', ')}.`}>
      <svg className="anim-markers__path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          points={EXPLORERS.slice(0, shown)
            .map((_, i) => pos(i).join(','))
            .join(' ')}
          fill="none"
          stroke="#fff3d1"
          strokeOpacity="0.35"
          strokeWidth="0.4"
          strokeDasharray="1 1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {EXPLORERS.map((name, i) => {
        const [x, y] = pos(i)
        return (
          // A button, so on phones and tablets tapping or focusing a dot shows its name.
          <button
            key={name}
            type="button"
            className={`anim-markers__dot${i < shown ? ' is-lit' : ''}${i % 2 ? '' : ' is-above'}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={name}
          >
            <span className="anim-markers__name" aria-hidden="true">
              {name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const KINDS = {
  photo: { C: Photo, duration: 4 },
  cutaway: { C: Cutaway, duration: Infinity, still: 1e7 },
  planetPops: { C: PlanetPops, duration: 7.5 },
  markers: { C: Markers, duration: 6.5 },
}

export default function SceneAnim({ anim, pageKey }) {
  const ref = useRef(null)
  const kind = KINDS[anim?.type]
  const t = useClock(!!kind, kind?.duration ?? 1)
  // Endless animations (the cutaway) show a still, lit picture in reduced motion.
  const reduced = typeof document !== 'undefined' && document.documentElement.dataset.reduce === '1'
  const time = kind?.duration === Infinity && (reduced || FROZEN) ? kind.still : t

  const portrait = typeof window !== 'undefined' && window.innerWidth < window.innerHeight
  const box = anim ? { ...anim.box, ...(portrait && anim.mobile ? anim.mobile : {}) } : null

  useLayoutEffect(() => {
    if (!kind || !ref.current || anim.avoid === false) {
      publishExtraRects('anim', [])
      return undefined
    }
    const r = ref.current.getBoundingClientRect()
    publishExtraRects('anim', [{ name: `anim:${anim.type}`, main: true, soft: false, left: r.left, top: r.top, right: r.right, bottom: r.bottom }])
    return () => publishExtraRects('anim', [])
  }, [anim, kind, pageKey, box?.x, box?.y, box?.w])

  useEffect(() => {
    const onResize = () => {
      if (!ref.current || !kind || anim.avoid === false) return
      const r = ref.current.getBoundingClientRect()
      publishExtraRects('anim', [{ name: `anim:${anim.type}`, main: true, soft: false, left: r.left, top: r.top, right: r.right, bottom: r.bottom }])
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [anim, kind])

  if (!kind || !box) return null
  const C = kind.C
  return (
    <div
      ref={ref}
      className={`scene-anim scene-anim--${anim.type}`}
      style={{
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: box.w ? (box.max ? `min(${box.w}%, ${box.max}px)` : `${box.w}%`) : undefined,
        height: box.h ? `${box.h}%` : undefined,
        opacity: ease(Math.min(1, t * 3 + (FROZEN ? 1 : 0))),
      }}
    >
      <C t={time} />
    </div>
  )
}
