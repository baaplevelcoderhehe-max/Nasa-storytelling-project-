import React, { useEffect, useRef, useState } from 'react'
import { art } from '../data/art'
import { prefersReducedMotion } from '../motion'

// Shared pieces for the tap moments and the animated scenes.

/** Screenshot mode (?freeze=…): animations show their finished state. */
export const FROZEN =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('freeze')

/**
 * Seconds since `running` became true, updated every frame. Stops at `duration`.
 * With reduced motion (or in screenshot mode) it jumps straight to `duration`,
 * so an animation shows its result without moving.
 */
export function useClock(running, duration = Infinity) {
  const [t, setT] = useState(0)
  const start = useRef(null)
  useEffect(() => {
    if (!running) {
      start.current = null
      return undefined
    }
    if ((prefersReducedMotion() || FROZEN) && Number.isFinite(duration)) {
      setT(duration)
      return undefined
    }
    let id
    const tick = (now) => {
      if (start.current === null) start.current = now
      const s = Math.min(duration, (now - start.current) / 1000)
      setT(s)
      if (s < duration) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [running, duration])
  return running ? t : 0
}

/** Calls fn(dt) every frame while `running` (for things the reader steers). */
export function useLoop(running, fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!running) return undefined
    let id
    let last = null
    const tick = (now) => {
      // Capped so a stalled tab doesn't jump, but high enough that slow devices keep real time.
      const dt = last === null ? 0 : Math.min(0.12, (now - last) / 1000)
      last = now
      ref.current(dt)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [running])
}

const cache = new Map()

/**
 * A picture from src/data/art.js as an <img>. Scene sprites are stored with
 * premultiplied colours (for the 3D scene); here they are converted back once
 * through a canvas, so their edges look right on any background.
 */
export function ArtImg({ name, className, style, alt = '' }) {
  const entry = art[name]
  const [src, setSrc] = useState(() => (entry?.premultiplied ? cache.get(name) : entry?.src))
  useEffect(() => {
    if (!entry?.premultiplied || cache.has(name)) {
      setSrc(entry?.premultiplied ? cache.get(name) : entry?.src)
      return undefined
    }
    let alive = true
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const g = c.getContext('2d', { willReadFrequently: true })
      g.drawImage(img, 0, 0)
      try {
        const data = g.getImageData(0, 0, c.width, c.height)
        const d = data.data
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3]
          if (a > 0 && a < 255) {
            d[i] = Math.min(255, (d[i] * 255) / a)
            d[i + 1] = Math.min(255, (d[i + 1] * 255) / a)
            d[i + 2] = Math.min(255, (d[i + 2] * 255) / a)
          }
        }
        g.putImageData(data, 0, 0)
        cache.set(name, c.toDataURL('image/png'))
      } catch {
        cache.set(name, entry.src)
      }
      if (alive) setSrc(cache.get(name))
    }
    img.src = entry.src
    return () => {
      alive = false
    }
  }, [name, entry])
  if (!entry || !src) return <span className={className} style={style} aria-hidden="true" />
  return <img className={className} style={style} src={src} alt={alt} draggable={false} />
}

/** A soft crayon wobble for SVG paths: small offsets that change a few times a second. */
export function wobble(seed, t, size = 1.5) {
  const step = Math.floor(t * 8)
  const x = Math.sin(seed * 12.9898 + step * 78.233) * 43758.5453
  return (x - Math.floor(x) - 0.5) * size
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const ease = (p) => 1 - Math.pow(1 - clamp(p, 0, 1), 3)
