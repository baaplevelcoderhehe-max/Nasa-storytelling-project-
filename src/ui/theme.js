// Nine-sliced chrome from /public/ui.
//
// Geometry measured off the actual SVG pixels (not guessed):
//
//     y 0-1   outline (#9696A3)
//     y 2-3   highlight (#FFFFFF)
//     y 4+    flat fill (#DADCE7), uniform in both axes
//
// So the border-image cut is exactly 4 SOURCE px. CSS scales the slice with
// the rendered size, so the bevel lands correctly at any scale. Cutting deeper
// than 4 stretches the highlight band; cutting shallower distorts the corners.
// `fill` paints the plate's own flat colour inside the border; without it the
// element's background shows through (white corners on a <button>).

export const PANEL = '/ui/Extra/panel_glass_notches.svg'
export const PLATE = '/ui/Extra/panel_rectangle.svg'
export const BUTTON = '/ui/Extra/button_rectangle.svg'

const CUT = 4

function frame(url) {
  return {
    borderStyle: 'solid',
    borderWidth: `${CUT}px`,
    borderImageSource: `url(${url})`,
    borderImageSlice: `${CUT} fill`,
    borderImageRepeat: 'stretch',
    borderImageOutset: '0',
    background: 'none',
  }
}

// Stretched panel for arbitrary-size content boxes.
export function Panel({ w, h }) {
  return { ...frame(PANEL), width: w, height: h }
}

// Wide chrome plate for the nav bar.
export function Plate({ w, h }) {
  return { ...frame(PLATE), width: w, height: h }
}

// Nav button face. Extra/button_rectangle is a blank chrome plate; the arrow
// glyph is drawn over it.
export function NavButtonFrame({ w, h }) {
  return { ...frame(BUTTON), width: w, height: h, padding: 0 }
}
