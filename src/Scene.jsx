import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, Plane, useAspect, useTexture } from '@react-three/drei'
import { EffectComposer, DepthOfField, Vignette } from '@react-three/postprocessing'
import { MaskFunction } from 'postprocessing'
import * as THREE from 'three'
import Fireflies from './Fireflies'
import './materials/layerMaterial'
import './materials/spriteMaterial'
import { art } from './data/art'
import { useReducedMotion, useSmallScreen } from './motion'

// ---------------------------------------------------------------------------
// A story page is a stack of layers (see "_help" in public/story.json):
//   { "type": "bg", "image": "bg_moon_plain" }             fills the screen
//   { "type": "sprite", "image": "kit_helmet_idle", ... }   placed on the stage
//   { "image": "/some/path.png", ... }                      older full-screen layer
// Image names are keys of src/data/art.js (a plain path still works).
// ---------------------------------------------------------------------------

const TITLE_BG = 'bg_hilltop_night'
const WALK_FRAMES = ['kit_walk_a', 'kit_walk_b']

/** Extra size on the background so parallax never shows its edge. */
const BG_MARGIN = 1.1
/** Portrait screens: sprites shrink down to this share of their landscape size. */
const PORTRAIT_MIN_SCALE = 0.6
/** Screens at least this wide (width / height) use the full landscape sizes. */
const LANDSCAPE_ASPECT = 1.3

const srcOf = (name) => art[name]?.src ?? name
const sizeOf = (name) => (art[name] ? [art[name].width, art[name].height] : [1600, 1000])
const isSprite = (l) => l.type === 'sprite'
const isBg = (l) => l.type === 'bg'

/** Every image file a page needs (for loading now, or preloading the next page). */
export function pageImages(page) {
  if (!page?.layers) return []
  const names = page.layers.flatMap((l) => (l.walk ? WALK_FRAMES : [l.image]))
  return [...new Set(names.filter(Boolean).map(srcOf))]
}

/** Floating and spinning things live in space: no shadow, centred on their x/y. */
const FLOATS = new Set(['float', 'spin'])
function anchorOf(l) {
  return l.anchor ?? (FLOATS.has(l.anim) ? 'center' : 'bottom')
}
function hasShadow(l) {
  return l.shadow ?? (anchorOf(l) === 'bottom' && !FLOATS.has(l.anim))
}

/** The main subject's depth: the sprite marked "main", else the front-most sprite. */
export function focusDepth(page) {
  if (typeof page?.focus === 'number') return page.focus
  const sprites = (page?.layers ?? []).filter(isSprite)
  if (sprites.length === 0) return null
  const main = sprites.find((s) => s.main)
  if (main) return main.z ?? 20
  return Math.max(...sprites.map((s) => s.z ?? 20))
}

// ---------- the painted shadow under standing sprites ----------

let shadowTexture = null
function getShadowTexture() {
  if (shadowTexture) return shadowTexture
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')
  // A few overlapping soft ellipses, slightly off-centre, so it looks brushed on.
  const blobs = [
    [128, 32, 118, 24, 0.62],
    [112, 34, 80, 16, 0.42],
    [146, 30, 74, 14, 0.3],
    [128, 33, 46, 10, 0.45],
  ]
  for (const [x, y, rx, ry, a] of blobs) {
    g.save()
    g.translate(x, y)
    g.scale(1, ry / rx)
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx)
    grad.addColorStop(0, `rgba(28, 18, 14, ${a})`)
    grad.addColorStop(0.6, `rgba(28, 18, 14, ${a * 0.55})`)
    grad.addColorStop(1, 'rgba(28, 18, 14, 0)')
    g.fillStyle = grad
    g.beginPath()
    g.arc(0, 0, rx, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  shadowTexture = new THREE.CanvasTexture(c)
  shadowTexture.colorSpace = THREE.SRGBColorSpace
  return shadowTexture
}

// ---------- layout: from story.json numbers to world units ----------

/**
 * The stage. Vertically it is the background's visible area (which is the screen
 * height on nearly every screen), so a sprite's feet line up with the painted
 * ground on any device. Horizontally, x is a share of the visible width
 * (-50 = left edge, 50 = right edge), so sprites never fall off a narrow phone.
 */
function useStage(page) {
  const viewport = useThree((s) => s.viewport)
  const vw = viewport.width
  const vh = viewport.height
  const aspect = vw / vh
  const bg = page?.layers?.find(isBg)
  let bgW = vw
  let bgH = vh
  if (bg) {
    const [iw, ih] = sizeOf(bg.image)
    const s = Math.max(vw / iw, vh / ih)
    // The drawn size, margin included, so x/y line up with what is painted in it.
    bgW = iw * s * BG_MARGIN
    bgH = ih * s * BG_MARGIN
  }
  const portrait = aspect < 1
  const sizeScale =
    aspect >= LANDSCAPE_ASPECT ? 1 : Math.max(PORTRAIT_MIN_SCALE, aspect / LANDSCAPE_ASPECT)
  // focusX (0-1): which part of the picture stays in view when the sides are cropped
  // (0.5 = middle). Clamped so the picture always covers the screen.
  const bgo = bg && portrait && bg.mobile ? { ...bg, ...bg.mobile } : bg
  const focusX = bgo?.focusX ?? 0.5
  const room = Math.max(0, (bgW - vw) / 2)
  const bgOffsetX = Math.max(-room, Math.min(room, (0.5 - focusX) * bgW))
  return { vw, vh, bgW, bgH, bgOffsetX, sceneH: bgH, visibleW: Math.min(vw, bgW), portrait, sizeScale }
}

/** Where a sprite goes: centre position and size in world units. */
function placeSprite(l, stage) {
  const o = stage.portrait && l.mobile ? { ...l, ...l.mobile } : l
  const [iw, ih] = sizeOf(l.walk ? WALK_FRAMES[0] : l.image)
  const ownHeight = stage.portrait && l.mobile?.height != null
  const h = ((o.height ?? 30) / 100) * stage.sceneH * (ownHeight ? 1 : stage.sizeScale)
  const w = (h * iw) / ih
  const x = o.pin === 'bg' ? ((o.x ?? 0) / 100) * stage.bgW + stage.bgOffsetX : ((o.x ?? 0) / 100) * stage.visibleW
  const y = ((o.y ?? 0) / 100) * stage.sceneH
  const centerY = anchorOf(o) === 'bottom' ? y + h / 2 : y
  return { x, y, centerY, w, h, z: o.z ?? 20 }
}

/**
 * Places every sprite. A sprite with "on": { "sprite": "pathfinder_open", "x": 0.9, "y": 0 }
 * stands at a point on another sprite (x: 0 = its left edge, 1 = right edge; y: 0 =
 * its bottom, 1 = its top), so the two stay together on every screen shape.
 */
function placeAll(layers, stage) {
  const placed = layers.map((l) => (isSprite(l) ? placeSprite(l, stage) : null))
  layers.forEach((l, i) => {
    if (!isSprite(l)) return
    const on = (stage.portrait && l.mobile?.on) || l.on
    if (!on) return
    const parent = placed[layers.findIndex((p) => isSprite(p) && p.image === on.sprite)]
    if (!parent) return
    const me = placed[i]
    const x = parent.x - parent.w / 2 + (on.x ?? 0.5) * parent.w
    const y = parent.centerY - parent.h / 2 + (on.y ?? 0) * parent.h
    const z = l.z ?? parent.z + 1
    placed[i] = { ...me, x, y, z, centerY: anchorOf(l) === 'bottom' ? y + me.h / 2 : y }
  })
  return placed
}

// ---------- animation ----------

/** A small repeatable random number for a sprite, so its boil looks the same each visit. */
function seeded(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
const hash = (text) => [...text].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7)

function Sprite({ layer, place, textures, still, index }) {
  const mesh = useRef()
  const material = useRef()
  const shadow = useRef()
  const anim = layer.anim ?? 'boil'
  const rand = useMemo(() => seeded(Math.abs(hash(`${layer.image}:${index}`)) + 1), [layer.image, index])
  const phase = useMemo(() => rand() * 10, [rand])
  const boil = useRef({ step: -1, dx: 0, dy: 0, rot: 0, sc: 1 })
  const frames = layer.walk ? WALK_FRAMES.map((n) => textures[srcOf(n)]) : [textures[srcOf(layer.image)]]
  const showShadow = hasShadow(layer)
  const shadowW = place.w * (layer.shadowWidth ?? 0.85)
  const shadowH = layer.shadowHeight != null ? shadowW * layer.shadowHeight : Math.max(shadowW * 0.16, place.h * 0.04)
  // shadowLift raises the shadow's centre (share of the sprite height), for wide
  // hardware whose feet stand at different depths, so every footpad touches it.
  const shadowY = place.y + shadowH * 0.12 + (layer.shadowLift ?? 0) * place.h

  useFrame((state, delta) => {
    const m = mesh.current
    if (!m) return
    let dx = 0
    let dy = 0
    let rot = 0
    let sc = 1
    const t = state.clock.elapsedTime + phase

    if (!still) {
      if (anim === 'bob') dy += Math.sin(t * 1.3) * place.h * 0.012
      if (anim === 'float') {
        dy += Math.sin(t * 0.5) * place.h * 0.04
        dx += Math.cos(t * 0.33) * place.h * 0.03
        rot += Math.sin(t * 0.27) * 0.05
      }
      if (anim === 'spin') m.userData.spin = (m.userData.spin ?? 0) + delta * 0.06
      if (anim === 'boil' || layer.walk) {
        // Hand-drawn line boil: a new tiny offset 8 times a second.
        const step = Math.floor(state.clock.elapsedTime * 8)
        const b = boil.current
        if (step !== b.step) {
          b.step = step
          b.dx = (rand() - 0.5) * place.h * 0.006
          b.dy = (rand() - 0.5) * place.h * 0.006
          b.rot = (rand() - 0.5) * 0.012
          b.sc = 1 + (rand() - 0.5) * 0.012
        }
        dx += b.dx
        dy += b.dy
        rot += b.rot
        sc *= b.sc
      }
      if (layer.walk) {
        const frame = Math.floor(state.clock.elapsedTime * 4) % 2
        if (material.current && material.current.tex !== frames[frame]) material.current.tex = frames[frame]
        dy += Math.abs(Math.sin(state.clock.elapsedTime * Math.PI * 4)) * place.h * 0.012
      }
    }
    m.position.set(place.x + dx, place.centerY + dy, place.z)
    m.rotation.z = rot + (m.userData.spin ?? 0)
    m.scale.set(place.w * sc, place.h * sc, 1)
    if (shadow.current) {
      // The shadow stays on the ground; it shrinks a little when the sprite lifts.
      const lift = Math.max(0, dy) / place.h
      const s = 1 - lift * 2
      shadow.current.scale.set(shadowW * s, shadowH * s, 1)
      shadow.current.position.x = place.x + dx * 0.5
    }
  })

  return (
    <>
      {showShadow && (
        <mesh ref={shadow} position={[place.x, shadowY, place.z - 0.2]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={getShadowTexture()} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <mesh ref={mesh} position={[place.x, place.centerY, place.z]} scale={[place.w, place.h, 1]}>
        <planeGeometry args={[1, 1]} />
        <cutoutMaterial
          ref={material}
          tex={frames[0]}
          flip={layer.flip ? 1 : 0}
          opacity={layer.opacity ?? 1}
          premult={art[layer.walk ? WALK_FRAMES[0] : layer.image]?.premultiplied ? 1 : 0}
          premultipliedAlpha
          transparent
          depthWrite
        />
      </mesh>
    </>
  )
}

function Background({ layer, stage, texture, movement }) {
  return (
    <Plane
      scale={[stage.bgW, stage.bgH, 1]}
      args={[1, 1, 1, 1]}
      position={[stage.bgOffsetX, 0, layer.z ?? 0]}
    >
      <layerMaterial movement={movement} textr={texture} factor={layer.factor ?? 0.004} wiggle={0} scale={1} />
    </Plane>
  )
}

/** The older full-screen layers (kept so existing pages still draw). */
function LegacyLayer({ layer, index, texture, movement, scaleN, scaleW, layersRef }) {
  const wiggle = layer.wiggle ?? 0
  return (
    <Plane
      scale={layer.fit === 'narrow' ? scaleN : scaleW}
      args={[1, 1, wiggle ? 10 : 1, wiggle ? 10 : 1]}
      position={[layer.x ?? 0, layer.y ?? 0, layer.z ?? index * 10]}
    >
      <layerMaterial
        movement={movement}
        textr={texture}
        factor={layer.factor ?? 0}
        ref={(el) => (layersRef.current[index] = el)}
        wiggle={wiggle}
        scale={layer.scaleFactor ?? 1}
      />
    </Plane>
  )
}

// ---------- one page ----------

/**
 * Screenshot mode (?freeze=<seconds>, used by scripts/qa-shots.mjs): once the art is
 * loaded, play the scene's first <seconds> frame by frame, then hold that exact frame
 * and mark the page with data-qa-frozen, so every review shot is identical.
 */
const FREEZE_AT = (() => {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('freeze')
  return value === null || Number.isNaN(Number(value)) ? null : Number(value)
})()

function useFreezeFrame(name) {
  const advance = useThree((s) => s.advance)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    if (FREEZE_AT === null) return
    // Every animation here depends only on the time, so two frames are enough:
    // the start, then straight to FREEZE_AT seconds.
    advance(0)
    advance(FREEZE_AT)
    gl.getContext().finish() // wait until the GPU has actually drawn it
    document.body.dataset.qaFrozen = name
  }, [advance, gl, name])
}

function Experience({ page, cover, play, still, lowPower }) {
  const scaleN = useAspect(1600, 1000, 1.05)
  const scaleW = useAspect(2200, 1000, 1.05)
  const shown = play ? page : (cover ?? { layers: [{ type: 'bg', image: TITLE_BG }] })
  const urls = useMemo(() => pageImages(shown), [shown])
  const loaded = useTexture(urls)
  const textures = useMemo(() => {
    const list = [].concat(loaded)
    return Object.fromEntries(urls.map((u, i) => [u, list[i]]))
  }, [urls, loaded])
  useLayoutEffect(() => {
    Object.values(textures).forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      t.needsUpdate = true
    })
  }, [textures])

  useFreezeFrame(play ? page.id : 'title')
  const stage = useStage(shown)
  const places = placeAll(shown.layers, stage)
  const group = useRef()
  const layersRef = useRef([])
  const [movement] = useState(() => new THREE.Vector3())
  const [temp] = useState(() => new THREE.Vector3())
  const amount = still ? 0 : (shown.parallax ?? 1)

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    movement.lerp(temp.set(state.pointer.x * 0.5 * amount, state.pointer.y * 0.2 * amount, 0), 0.2)
    // Gentle parallax: a small slide and tilt, so nearer layers move more.
    g.position.x = THREE.MathUtils.lerp(g.position.x, state.pointer.x * 2 * amount, 0.05)
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, (state.pointer.y / 60) * amount, 0.05)
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, (-state.pointer.x / 18) * amount, 0.05)
    if (!still) {
      layersRef.current.forEach((m, i) => {
        if (m && shown.layers[i]?.wiggle) m.uniforms.time.value += delta
      })
    }
  }, 1)

  const fx = shown.fireflies
  const showFireflies = play && fx && fx.count !== 0 && !still && !lowPower
  return (
    <group ref={group}>
      {showFireflies && (
        <Fireflies count={fx.count ?? 20} radius={fx.radius ?? 80} colors={fx.colors ?? ['orange']} />
      )}
      {shown.layers.map((l, i) => {
        if (isBg(l)) return <Background key={i} layer={l} stage={stage} texture={textures[srcOf(l.image)]} movement={movement} />
        if (isSprite(l))
          return <Sprite key={i} index={i} layer={l} place={places[i]} textures={textures} still={still} />
        return (
          <LegacyLayer
            key={i}
            index={i}
            layer={l}
            texture={textures[srcOf(l.image)]}
            movement={movement}
            scaleN={scaleN}
            scaleW={scaleW}
            layersRef={layersRef}
          />
        )
      })}
    </group>
  )
}

/**
 * Depth of field focused on the main subject. The range is wide enough to keep
 * everything near the subject sharp, so only the background softens a little.
 */
function Effects({ focus, blur }) {
  const ref = useRef()
  useLayoutEffect(() => {
    if (!ref.current) return
    const maskMaterial = ref.current.maskPass.getFullscreenMaterial()
    maskMaterial.maskFunction = MaskFunction.MULTIPLY_RGB_SET_ALPHA
  })
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      {blur && (
        <DepthOfField ref={ref} target={[0, 0, focus]} focalLength={0.12} bokehScale={0.9} width={1024} />
      )}
      <Vignette offset={0.35} darkness={0.45} />
    </EffectComposer>
  )
}

/** Starts loading the images of the pages that can come next. */
function Preload({ pages }) {
  useEffect(() => {
    const urls = [...new Set((pages ?? []).flatMap(pageImages))]
    urls.forEach((u) => useTexture.preload(u))
  }, [pages])
  return null
}

export default function Scene({ page, cover, isPlaying, upcoming }) {
  const still = useReducedMotion()
  const small = useSmallScreen()
  const [lowFps, setLowFps] = useState(false)
  const lowPower = small || lowFps
  const focus = focusDepth(isPlaying ? page : cover)
  // A page with only a background stays sharp: there is no subject to focus on.
  const blur = focus !== null && !lowPower

  return (
    <Canvas
      orthographic
      dpr={[1, 1.75]}
      frameloop={FREEZE_AT !== null ? 'never' : still ? 'demand' : 'always'}
      gl={{ antialias: false }}
      camera={{ zoom: 5, position: [0, 0, 200], far: 300, near: 50 }}
      eventSource={document.getElementById('root')}
      eventPrefix="client"
    >
      {/* Turn the expensive effects off if the frame rate drops. */}
      {FREEZE_AT === null && <PerformanceMonitor onDecline={() => setLowFps(true)} />}
      <Experience key={isPlaying ? page.id : 'title'} page={page} cover={cover} play={isPlaying} still={still} lowPower={lowPower} />
      <Effects focus={focus ?? 0} blur={blur} />
      <Preload pages={upcoming} />
    </Canvas>
  )
}
