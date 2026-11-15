import { useSyncExternalStore } from 'react'
import { useBook } from './store'

// Reduced motion: the in-app setting ('reduce' / 'full'), or when it is 'device', the
// reader's OS setting (prefers-reduced-motion). ?reduce=1 in the URL forces it (tests).

const QUERY = '(prefers-reduced-motion: reduce)'

function urlAsks() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('reduce') === '1'
}

function osAsks() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

export function prefersReducedMotion() {
  if (urlAsks()) return true
  const motion = useBook.getState().settings?.motion ?? 'device'
  if (motion === 'reduce') return true
  if (motion === 'full') return false
  return osAsks()
}

function subscribe(onChange) {
  const unsub = useBook.subscribe(onChange)
  if (typeof window === 'undefined' || !window.matchMedia) return unsub
  const mq = window.matchMedia(QUERY)
  mq.addEventListener?.('change', onChange)
  return () => {
    unsub()
    mq.removeEventListener?.('change', onChange)
  }
}

/** True when scenes should stay still: no parallax, boil, bob, fireflies or blur animation. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false)
}

/** True on screens narrower than 768 px, where depth of field and fireflies are off. */
const SMALL_QUERY = '(max-width: 767px)'
function subscribeSmall(onChange) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(SMALL_QUERY)
  mq.addEventListener?.('change', onChange)
  return () => mq.removeEventListener?.('change', onChange)
}
export function useSmallScreen() {
  return useSyncExternalStore(
    subscribeSmall,
    () => typeof window !== 'undefined' && !!window.matchMedia?.(SMALL_QUERY).matches,
    () => false,
  )
}
