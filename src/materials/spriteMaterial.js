import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { Color } from 'three'

// Draws one cut-out sprite with its soft painted edges kept, optionally mirrored.
// `tint` dims or colours the sprite (quiet pages use it).
// Blending is premultiplied: the art script stores scene sprites premultiplied
// (premult = 1), so no white can bleed into the edges. Images that are not
// (premult = 0) are converted here, so both kinds blend the same way.

const CutoutMaterial = shaderMaterial(
  { tex: null, flip: 0, opacity: 1, premult: 1, tint: new Color(1, 1, 1) },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  /* glsl */ `
    uniform sampler2D tex;
    uniform float flip;
    uniform float opacity;
    uniform float premult;
    uniform vec3 tint;
    varying vec2 vUv;
    void main() {
      vec2 uv = vec2(flip > 0.5 ? 1.0 - vUv.x : vUv.x, vUv.y);
      vec4 color = texture2D(tex, uv);
      if (color.a < 0.02) discard;
      if (premult < 0.5) color.rgb *= color.a;
      gl_FragColor = vec4(color.rgb * tint * opacity, color.a * opacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
)

extend({ CutoutMaterial })
