import { useCallback, useEffect, useRef, useState } from 'react'

export const IDLE_MS = 8000

export function useIdle(active, deps) {
  const [idle, setIdle] = useState(false)
  const timer = useRef(null)
  const poke = useCallback(() => {
    setIdle(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setIdle(true), IDLE_MS)
  }, [])
  useEffect(() => {
    if (!active) {
      clearTimeout(timer.current)
      setIdle(false)
      return undefined
    }
    poke()
    return () => clearTimeout(timer.current)
  }, [active, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps
  return [idle, poke]
}

