import { describe, expect, it } from 'vitest'
import { hasReachedLightDay, lightDayWords } from './lightDay'
import { formatText } from './story'

const DAY_BEFORE = new Date(2026, 10, 17, 23, 59)
const THE_DAY = new Date(2026, 10, 18, 0, 0)
const LATER = new Date(2027, 2, 1, 12, 0)

const P3 = 'I am {voyagerHome}. Before you answer me, visit my friends.'
const F3 = 'On November 18, 2026, {voyagerReach} one light-day from Earth, about 25.9 billion km.'

describe('date-aware Voyager text', () => {
  it('the day before: still ahead', () => {
    expect(hasReachedLightDay(DAY_BEFORE)).toBe(false)
    const w = lightDayWords(DAY_BEFORE)
    expect(formatText(P3, w)).toBe('I am almost one light-day from home. Before you answer me, visit my friends.')
    expect(formatText(F3, w)).toBe('On November 18, 2026, I will reach one light-day from Earth, about 25.9 billion km.')
  })

  it('the day itself: reached', () => {
    expect(hasReachedLightDay(THE_DAY)).toBe(true)
    const w = lightDayWords(THE_DAY)
    expect(formatText(P3, w)).toBe('I am more than one light-day from home. Before you answer me, visit my friends.')
    expect(formatText(F3, w)).toBe('On November 18, 2026, I reached one light-day from Earth, about 25.9 billion km.')
  })

  it('a later date: reached', () => {
    const w = lightDayWords(LATER)
    expect(w.voyagerHome).toBe('more than one light-day from home')
    expect(w.voyagerReach).toBe('I reached')
  })
})
