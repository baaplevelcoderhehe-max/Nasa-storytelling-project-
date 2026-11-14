import { play as sfx } from '../sound'
import { NavButtonFrame } from './theme'

// Page-turn buttons: blank chrome plates with a glyph drawn over them.
// The kit's blue variants are header bars (colour covers only the top half),
// so the neutral Extra/button_rectangle is the right base here.

const GLYPH = { '-1': '‹', '1': '›' }

export function NavButton({ dir, disabled, onClick, label }) {
  return (
    <button
      type="button"
      className={`nav__btn ${disabled ? 'is-disabled' : ''}`}
      style={NavButtonFrame({ w: 44, h: 26 })}
      onClick={onClick}
      onMouseEnter={() => !disabled && sfx('hover', { gain: 0.18, jitter: 0.08 })}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <span className="nav__btn-glyph" aria-hidden="true">
        {GLYPH[dir]}
      </span>
    </button>
  )
}

// The pack has no speaker icon; inline SVG stays crisp at this size.
export function VolumeIcon({ muted }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
      {muted ? (
        <>
          <line x1="15" y1="9" x2="21" y2="15" />
          <line x1="21" y1="9" x2="15" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  )
}
