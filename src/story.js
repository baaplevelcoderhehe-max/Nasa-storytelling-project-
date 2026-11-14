// State-graph helpers for story.json.
//
// A story is a map of states. Each state carries the usual scene fields plus
// navigation (`next`), `choices`, an `input`, `onEnter` effects and an `if`
// condition. The app keeps { id, flags, counters, visited, history } and these
// helpers decide what is visible and what happens on a transition.

// `chapters` is derived: how many of story.chapters flags are currently set.
export function derivedCounters(story, flags) {
  const chapters = story?.chapters ?? []
  const n = chapters.filter((k) => flags?.[k]).length
  return n ? { chapters: n } : {}
}

export function testCond(cond, flags = {}, counters = {}) {
  if (!cond) return true
  if (typeof cond === 'string') return !!flags[cond]
  if (cond.flag !== undefined) return !!flags[cond.flag]
  if (cond.notFlag !== undefined) return !flags[cond.notFlag]
  if (cond.all) return cond.all.every((c) => testCond(c, flags, counters))
  if (cond.any) return cond.any.some((c) => testCond(c, flags, counters))
  if (cond.counter !== undefined) {
    const v = counters[cond.counter] ?? 0
    if (cond.gte !== undefined) return v >= cond.gte
    if (cond.gt !== undefined) return v > cond.gt
    if (cond.lte !== undefined) return v <= cond.lte
    if (cond.lt !== undefined) return v < cond.lt
    if (cond.eq !== undefined) return v === cond.eq
    return !!v
  }
  return true
}

// {counter:name} -> counters[name]; {flagName} -> flags[name] (strings only).
export function formatText(text, flags = {}, counters = {}) {
  if (!text) return text
  return String(text)
    .replace(/\{counter:([a-zA-Z0-9_]+)\}/g, (_, k) => String(counters[k] ?? 0))
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) =>
      flags[k] !== undefined && typeof flags[k] !== 'boolean' ? String(flags[k]) : '',
    )
}

export function filterBubbles(bubbles, flags, counters) {
  return (bubbles ?? []).filter((b) => !b.if || testCond(b.if, flags, counters))
}

export function visibleChoices(state, flags, counters) {
  return (state?.choices ?? []).filter((c) => !c.if || testCond(c.if, flags, counters))
}

// Apply a state's onEnter effects (and optional extra `set`, e.g. from a choice).
export function applyEffects(state, flags, counters, extraSet) {
  const set = { ...(state?.onEnter?.set ?? {}), ...(extraSet ?? {}) }
  const incr = state?.onEnter?.incr ?? {}
  const nextCounters = { ...counters }
  for (const [k, v] of Object.entries(incr)) {
    nextCounters[k] = (nextCounters[k] ?? 0) + v
  }
  return { flags: { ...flags, ...set }, counters: nextCounters }
}
