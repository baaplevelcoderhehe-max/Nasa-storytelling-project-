// Voyager 1 reaches one light-day from Earth on November 18, 2026 (docs/script.md).
// Its lines talk about that day in the future or the past depending on today's date,
// in the reader's own time zone (the change happens at local midnight).

export const LIGHT_DAY = new Date(2026, 10, 18) // months count from 0: 10 = November

export function hasReachedLightDay(now = new Date()) {
  return now.getTime() >= LIGHT_DAY.getTime()
}

/**
 * Words that change with the date, used in story.json text as {voyagerHome} and
 * {voyagerReach}:
 *   P.3  "I am {voyagerHome}. …"
 *   F.3  "On November 18, 2026, {voyagerReach} one light-day from Earth, …"
 */
export function lightDayWords(now = new Date()) {
  return hasReachedLightDay(now)
    ? { voyagerHome: 'more than one light-day from home', voyagerReach: 'I reached' }
    : { voyagerHome: 'almost one light-day from home', voyagerReach: 'I will reach' }
}
