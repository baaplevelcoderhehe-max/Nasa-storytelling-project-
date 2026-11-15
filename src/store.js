import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// The reader's progress and settings, saved in the browser (localStorage key
// "still-out-there-save"). Components select small slices: useBook((s) => s.nav).
//
// nav: { id, flags, counters, visited[], history[] } or null before the book is opened.
//   flags.message holds the reader's message to Voyager.
// settings: sound, music volume, motion ('device' | 'reduce' | 'full'), text size 1-3,
//   read-aloud.
//
// If storage is blocked (private mode, strict settings), everything still works for
// this visit; it just isn't saved. Test links (?page= or ?freeze=) never touch the save.

export const SAVE_KEY = 'still-out-there-save'

export const DEFAULT_SETTINGS = {
  sound: true,
  musicVolume: 60,
  motion: 'device',
  textSize: 1,
  readAloud: true,
}

const testLink =
  typeof window !== 'undefined' && /[?&](page|freeze)=/.test(window.location.search)

const memory = new Map()
/** localStorage when it works, otherwise a plain in-memory map. Never throws. */
const safeStorage = {
  getItem(key) {
    if (testLink) return memory.get(key) ?? null
    try {
      return window.localStorage.getItem(key)
    } catch {
      return memory.get(key) ?? null
    }
  },
  setItem(key, value) {
    if (testLink) return memory.set(key, value)
    try {
      window.localStorage.setItem(key, value)
    } catch {
      memory.set(key, value)
    }
  },
  removeItem(key) {
    memory.delete(key)
    if (testLink) return
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* blocked: nothing saved anyway */
    }
  },
}

const freshNav = (id) => ({ id, flags: {}, counters: {}, visited: [id], history: [] })

export const useBook = create(
  persist(
    (set) => ({
      nav: null,
      settings: DEFAULT_SETTINGS,

      /** Opens the book at a page with no progress (also used by test links). */
      start: (id) => set({ nav: freshNav(id) }),
      /** Replaces the navigation state (page turns, back, answers). */
      setNav: (next) => set((s) => ({ nav: typeof next === 'function' ? next(s.nav) : next })),
      /** "Start over": clears progress, keeps settings. */
      clearProgress: () => set({ nav: null }),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: SAVE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ nav: s.nav, settings: s.settings }),
      merge: (saved, current) => ({
        ...current,
        ...(saved ?? {}),
        settings: { ...DEFAULT_SETTINGS, ...(saved?.settings ?? {}) },
      }),
    },
  ),
)

// Test links expose the store so screenshot scripts can set a save or a setting.
if (testLink) window.__book = useBook

/** A save worth continuing: the reader got past the first page. */
export const selectHasSave = (s) => !!s.nav && (s.nav.visited?.length ?? 0) > 1
