// Progress bars built from the kit's own pieces.
//
// The bar suffixes are literal side pieces, not scale variants: `_l` is the
// left cap (12x24), `_m` repeats (24x24), `_r` the right cap (verified as an
// exact horizontal mirror of `_l`). Composing them at row y=12 gives an
// unbroken profile — outline, highlight, flat fill — with no transparent gaps
// and no colour jumps, at any total width.
//
// A border-image slice cannot do this: it would have to cut through the cap's
// curved bevel, which is exactly what shows as a smeared edge.

const CAP_W = 12 // source px per cap

function parts(theme) {
  return {
    l: `/ui/${theme}/bar_round_gloss_large_l.svg`,
    m: `/ui/${theme}/bar_round_gloss_large_m.svg`,
    r: `/ui/${theme}/bar_round_gloss_large_r.svg`,
  }
}

export function Bar({ w, h, theme = 'Grey' }) {
  const p = parts(theme)
  const midW = Math.max(0, w - CAP_W * 2)
  return (
    <span className="bar" style={{ position: 'relative', width: w, height: h }}>
      <img className="bar__cap" src={p.l} alt="" aria-hidden="true" />
      <span
        className="bar__mid"
        style={{
          position: 'absolute',
          top: 0,
          left: CAP_W,
          width: midW,
          height: h,
          backgroundImage: `url(${p.m})`,
          backgroundSize: `auto ${h}px`,
          backgroundRepeat: 'repeat-x',
        }}
        aria-hidden="true"
      />
      <img className="bar__cap bar__cap--r" src={p.r} alt="" aria-hidden="true" />
    </span>
  )
}
