// Read-aloud with the Web Speech API. Every function is a no-op where the browser
// has no speech synthesis, and the speaker button is hidden there.

export function speechAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function speak(text, { onEnd } = {}) {
  if (!speechAvailable() || !text) return
  try {
    window.speechSynthesis.cancel()
    const u = new window.SpeechSynthesisUtterance(text)
    u.rate = 0.92
    u.pitch = 1.05
    u.lang = 'en-US'
    u.onend = () => onEnd?.()
    u.onerror = () => onEnd?.()
    window.speechSynthesis.speak(u)
  } catch {
    onEnd?.()
  }
}

export function stopSpeaking() {
  if (!speechAvailable()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* nothing to stop */
  }
}
