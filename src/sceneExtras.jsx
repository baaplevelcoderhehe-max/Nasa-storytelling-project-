import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Small living details drawn in the scene (all made in code, no art files):
//   Ambient   twinkling stars, signal rings from the dish, an occasional shooting star
//   Divider   the soft crayon line down the middle of a split page
//   glowTexture  a soft warm dot (Echo's antenna tip, signal light)
// Every animation depends only on the clock, so screenshot mode (?freeze=) is stable.
// Reduced motion: Ambient draws nothing at all.

/** A small repeatable random number generator. */
export function seeded(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

const textures = {}
function canvasTexture(key, w, h, draw) {
  if (textures[key]) return textures[key]
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  textures[key] = t
  return t
}

/** A soft round glow (warm by default). */
export function glowTexture(color = '255, 214, 120') {
  return canvasTexture(`glow:${color}`, 64, 64, (g, w) => {
    const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
    grad.addColorStop(0, `rgba(255, 252, 235, 1)`)
    grad.addColorStop(0.25, `rgba(${color}, 0.95)`)
    grad.addColorStop(1, `rgba(${color}, 0)`)
    g.fillStyle = grad
    g.fillRect(0, 0, w, w)
  })
}

/** A four-point star sparkle. */
function sparkleTexture() {
  return canvasTexture('sparkle', 64, 64, (g, w) => {
    g.translate(w / 2, w / 2)
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, w / 2)
    grad.addColorStop(0, 'rgba(255, 250, 225, 1)')
    grad.addColorStop(0.3, 'rgba(255, 236, 180, 0.6)')
    grad.addColorStop(1, 'rgba(255, 236, 180, 0)')
    g.fillStyle = grad
    g.beginPath()
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? w / 2 : w / 10
      const a = (i / 8) * Math.PI * 2
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    g.closePath()
    g.fill()
  })
}

/** A thin crayon ring for signal pulses. */
function ringTexture() {
  return canvasTexture('ring', 256, 256, (g, w) => {
    g.translate(w / 2, w / 2)
    for (let k = 0; k < 3; k++) {
      g.beginPath()
      g.strokeStyle = `rgba(220, 245, 255, ${0.55 - k * 0.15})`
      g.lineWidth = 7 - k * 2
      g.arc(0, 0, w / 2 - 8 - k * 2, 0, Math.PI * 2)
      g.stroke()
    }
  })
}

/** A shooting-star streak: bright head on the right, fading tail to the left. */
function streakTexture() {
  return canvasTexture('streak', 256, 16, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, 0)
    grad.addColorStop(0, 'rgba(255, 245, 210, 0)')
    grad.addColorStop(0.85, 'rgba(255, 245, 210, 0.7)')
    grad.addColorStop(1, 'rgba(255, 255, 245, 1)')
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(0, h / 2)
    g.lineTo(w - 6, h / 2 - 3)
    g.arc(w - 6, h / 2, 3, -Math.PI / 2, Math.PI / 2)
    g.closePath()
    g.fill()
  })
}

/** The wobbly crayon divider for split pages. */
function dividerTexture() {
  return canvasTexture('divider', 32, 512, (g, w, h) => {
    const rand = seeded(7)
    const path = (offset, color, width) => {
      g.beginPath()
      g.strokeStyle = color
      g.lineWidth = width
      g.lineCap = 'round'
      for (let y = 0; y <= h; y += 16) {
        const x = w / 2 + offset + (rand() - 0.5) * 3
        if (y === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
    path(0, 'rgba(43, 29, 20, 0.8)', 16)
    path(-0.5, 'rgba(255, 243, 209, 0.95)', 9)
  })
}

const basic = (texture, extra = {}) => ({
  map: texture,
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  blending: THREE.AdditiveBlending,
  ...extra,
})

/**
 * Twinkling stars, signal rings and shooting stars.
 * ambient: { stars: n, rings: { x, y, every }, shootingStars: seconds }
 * Ring x/y are percent of the background picture (like "pin": "bg"), so they start
 * at the painted dish on every screen.
 */
export function Ambient({ ambient, stage, still }) {
  if (!ambient || still) return null
  return (
    <group>
      {ambient.stars ? <Twinkles count={ambient.stars} stage={stage} /> : null}
      {ambient.rings ? <Rings rings={ambient.rings} stage={stage} /> : null}
      {ambient.shootingStars ? <ShootingStar every={ambient.shootingStars} stage={stage} /> : null}
    </group>
  )
}

function Twinkles({ count, stage }) {
  const refs = useRef([])
  const stars = useMemo(() => {
    const rand = seeded(1234)
    return Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * stage.vw * 0.96,
      // the upper part of the sky
      y: stage.vh * (0.08 + rand() * 0.38),
      size: stage.vh * (0.008 + rand() * 0.012),
      phase: rand() * Math.PI * 2,
      speed: 0.6 + rand() * 1.1,
    }))
  }, [count, stage.vw, stage.vh])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    stars.forEach((s, i) => {
      const m = refs.current[i]
      if (!m) return
      const k = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase)
      m.material.opacity = 0.15 + 0.85 * k * k
      m.scale.setScalar(s.size * (0.7 + 0.5 * k))
    })
  })
  const tex = sparkleTexture()
  return stars.map((s, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[s.x, s.y, 3]} scale={s.size}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial {...basic(tex)} />
    </mesh>
  ))
}

function Rings({ rings, stage }) {
  const refs = useRef([])
  const every = rings.every ?? 6
  const x = ((rings.x ?? 0) / 100) * stage.bgW + stage.bgOffsetX
  const y = ((rings.y ?? 0) / 100) * stage.sceneH
  const maxR = stage.vh * (rings.size ?? 0.5)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    refs.current.forEach((m, k) => {
      if (!m) return
      // Two rings a little apart, then a quiet pause until the next pulse.
      const local = (t - k * 0.7) % every
      const life = 3.2
      const p = local < 0 || local > life ? -1 : local / life
      m.visible = p >= 0
      if (p < 0) return
      const r = maxR * (0.08 + 0.92 * p)
      m.scale.set(r * 2, r * 2, 1)
      m.material.opacity = 0.38 * (1 - p) * Math.min(1, p * 6)
    })
  })
  const tex = ringTexture()
  return [0, 1].map((k) => (
    <mesh key={k} ref={(el) => (refs.current[k] = el)} position={[x, y, 2]} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial {...basic(tex)} />
    </mesh>
  ))
}

function ShootingStar({ every, stage }) {
  const ref = useRef()
  const rand = useMemo(() => seeded(99), [])
  const paths = useMemo(
    () =>
      Array.from({ length: 12 }, () => ({
        x: (rand() - 0.7) * stage.vw * 0.8,
        y: stage.vh * (0.3 + rand() * 0.15),
        angle: -0.25 - rand() * 0.25,
      })),
    [rand, stage.vw, stage.vh],
  )
  useFrame((state) => {
    const m = ref.current
    if (!m) return
    const t = state.clock.elapsedTime + every * 0.6
    const n = Math.floor(t / every)
    const local = t - n * every
    const life = 0.9
    m.visible = local < life
    if (!m.visible) return
    const p = local / life
    const path = paths[n % paths.length]
    const len = stage.vw * 0.18
    const dist = stage.vw * 0.35 * p
    m.position.set(path.x + Math.cos(path.angle) * dist, path.y + Math.sin(path.angle) * dist, 3)
    m.rotation.z = path.angle
    m.scale.set(len, stage.vh * 0.012, 1)
    m.material.opacity = Math.sin(Math.PI * p)
  })
  return (
    <mesh ref={ref} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial {...basic(streakTexture())} />
    </mesh>
  )
}

/** The crayon line down the middle of a split page. */
export function Divider({ stage }) {
  const w = Math.max(stage.vw * 0.022, stage.vh * 0.02)
  return (
    <mesh position={[0, 0, 1]} scale={[w, stage.vh * 1.1, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={dividerTexture()} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
