import React, { useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Plane, useAspect, useTexture } from '@react-three/drei'
import { EffectComposer, DepthOfField, Vignette } from '@react-three/postprocessing'
import { MaskFunction } from 'postprocessing'
import { Vector3, MathUtils } from 'three'
// Your existing files — adjust these two paths to wherever they live in your project
import Fireflies from './Fireflies'
import './materials/layerMaterial'
import * as THREE from "three"

// Renders one story page: the layer stack comes from story.json
function Experience({ page, play }) {
  const scaleN = useAspect(1600, 1000, 1.05)
  const scaleW = useAspect(2200, 1000, 1.05)
  const bgTexture = useTexture('/story/bg.jpg')
  const textures = useTexture(
  page.layers.map((l) => l.image),
  (arr) => [].concat(arr).forEach((t) => { t.colorSpace = THREE.SRGBColorSpace }),
)
useLayoutEffect(() => {
  [bgTexture, ...textures].forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
  })
}, [bgTexture, textures])
  const group = useRef()
  const layersRef = useRef([])
  const [movement] = useState(() => new Vector3())
  const [temp] = useState(() => new Vector3())
  const amount = page.parallax ?? 1

  useFrame((state, delta) => {
    movement.lerp(temp.set(state.pointer.x*0.5, state.pointer.y * 0.2, 0), 0.2)
    const g = group.current
    g.position.x = MathUtils.lerp(g.position.x, state.pointer.x * 20 * amount, 0.05)
    g.rotation.x = MathUtils.lerp(g.rotation.x, (state.pointer.y / 20) * amount, 0.05)
    g.rotation.y = MathUtils.lerp(g.rotation.y, (-state.pointer.x / 2) * amount, 0.05)
    layersRef.current.forEach((m, i) => {
      if (m && page.layers[i].wiggle) m.uniforms.time.value += delta
    })
  }, 1)

  const fx = page.fireflies
  return (
    <group ref={group}>
      {fx && fx.count !== 0 && (
        <Fireflies count={fx.count ?? 20} radius={fx.radius ?? 80} colors={fx.colors ?? ['orange']} />
      )}

      {play ? (
  page.layers.map((l, i) => {
    const wiggle = l.wiggle ?? 0
    return (
      <Plane
        key={i}
        scale={l.fit === 'narrow' ? scaleN : scaleW}
        args={[1, 1, wiggle ? 10 : 1, wiggle ? 10 : 1]}
        position={[l.x ?? 0, l.y ?? 0, l.z ?? i * 10]}
      >
        <layerMaterial
          movement={movement}
          textr={textures[i]}
          factor={l.factor ?? 0}
          ref={(el) => (layersRef.current[i] = el)}
          wiggle={wiggle}
          scale={l.scaleFactor ?? 1}
        />
      </Plane>
    )
  })
) : (
  <Plane scale={scaleW} args={[1, 1, 1, 1]} position={[0, 0, 0]}>
    <layerMaterial
      movement={movement}
      textr={bgTexture}
      factor={0}
      wiggle={0}
      scale={1}
    />
  </Plane>
)}
    </group>
  )
}

function Effects({ focus }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const maskMaterial = ref.current.maskPass.getFullscreenMaterial()
    maskMaterial.maskFunction = MaskFunction.MULTIPLY_RGB_SET_ALPHA
  })
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <DepthOfField ref={ref} target={[0, 0, focus]} bokehScale={4} focalLength={0.1} width={1024} />
      <Vignette />
    </EffectComposer>
  )
}

export default function Scene({ page, isPlaying }) {
  return (
    <Canvas
      orthographic
      gl={{ antialias: false }}
      camera={{ zoom: 5, position: [0, 0, 200], far: 300, near: 50 }}
      eventSource={document.getElementById('root')}
      eventPrefix="client"
    >
      <Experience key={page.id} page={page} play={isPlaying} />
      <Effects focus={page.focus ?? 30} />
    </Canvas>
  )
}
