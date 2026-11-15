// Plays every tap moment like a reader would, mostly with the keyboard, and checks
// that each one finishes. Also checks the idle hint, the focus ring, Escape to close,
// and that F.3's Send plays the pulse and then turns to the last page.
//
//   node scripts/check-taps.mjs              (all)
//   node scripts/check-taps.mjs moon-2 ...   (some pages)
//   QA_SEQ=folder node scripts/check-taps.mjs moon-2 mars1-4 beyond-4
//      also saves a frame-by-frame sequence of each moment to <folder>
//
// Needs the dev server on QA_URL (default http://localhost:5173/).

import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const URL_BASE = process.env.QA_URL ?? 'http://localhost:5173/'
const SEQ = process.env.QA_SEQ
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// How a reader plays each one (by its page).
const PLAY = {
  'prologue-2': async (p) => {
    await p.locator('.moment__dial').focus()
    for (let i = 0; i < 54; i++) await p.keyboard.press('ArrowRight')
  },
  'moon-2': async (p) => press(p, 'Engine off!'),
  'moon-3': async (p) => {
    for (let i = 0; i < 4; i++) await press(p, 'Dig')
  },
  'moon-5': async (p) => press(p, 'Fire the laser'),
  'moon-7': async (p) => press(p, 'Drop the ascent stage'),
  'mars1-3': async (p) => {
    await press(p, 'Scoop soil')
    await press(p, 'Into the lab')
  },
  'mars1-4': async (p) => press(p, 'Release the airbags'),
  'mars1-6': async (p) => {
    await press(p, 'Dig')
    await press(p, 'Watch the days pass')
  },
  'mars2-2': async (p) => {
    await p.keyboard.down('ArrowLeft')
    await wait(1700)
    await p.keyboard.up('ArrowLeft')
  },
  'mars2-5': async (p) => tapEvents(p, 'Quake!', 3200),
  'mars2-7': async (p) => {
    const btn = p.locator('.moment').getByRole('button', { name: /Hold/ })
    await btn.focus()
    let holding = false
    const set = async (v) => {
      if (v === holding) return
      holding = v
      await (v ? p.keyboard.down('Space') : p.keyboard.up('Space'))
    }
    for (let i = 0; i < 120; i++) {
      const phase = await p.locator('[data-phase]').getAttribute('data-phase')
      if (phase !== 'up') break
      const h = Number(await p.locator('[data-height]').getAttribute('data-height'))
      await set(h < 120)
      await wait(80)
    }
    await set(false)
  },
  'small-2': async (p) => {
    for (let i = 0; i < 6; i++) {
      const b = p.locator('.moment').getByRole('button', { name: 'Gentle push' })
      if (await b.isDisabled()) break
      await b.press('Enter')
      await wait(400)
    }
  },
  'small-4': async (p) => {
    await p.locator('.moment').getByRole('button', { name: /gentle push/i }).focus()
    await p.keyboard.down('Space')
    await wait(7400)
    await p.keyboard.up('Space')
  },
  'beyond-1': async (p) => tapEvents(p, 'Dip!', 3400),
  'beyond-4': async (p) => {
    const parts = p.locator('.moment__part')
    for (let i = 0; i < 4; i++) {
      await parts.nth(i).focus()
      await p.keyboard.press('Enter')
      await wait(300)
    }
  },
}

async function press(p, name) {
  const b = p.locator('.moment').getByRole('button', { name, exact: true })
  await b.focus()
  await p.keyboard.press('Enter')
  await wait(250)
}

/** Waits for each event (marsquake / dip), like a reader watching, and taps during it. */
async function tapEvents(p, name) {
  for (let i = 0; i < 3; i++) {
    await p.waitForSelector('[data-active="1"]', { timeout: 8000 })
    await wait(200)
    await press(p, name)
    await p.waitForSelector('[data-active="0"]', { timeout: 8000 }).catch(() => {})
  }
}

async function snap(p, folder, name) {
  if (!folder) return
  await p.locator('.moment').screenshot({ path: `${folder}/${name}.png` })
}

const pages = process.argv.slice(2).length ? process.argv.slice(2) : [...Object.keys(PLAY), 'finale-3']
// The real GPU: software rendering runs the 3D scene at ~2 fps, too slow to play the timed moments.
const browser = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const results = []
for (const id of pages) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${URL_BASE}?page=${id}`)
  await page.waitForLoadState('networkidle')
  await wait(1200)
  const folder = SEQ ? `${SEQ}/${id}` : null
  if (folder) mkdirSync(folder, { recursive: true })
  try {
    if (id === 'finale-3') {
      await page.locator('.choices__input').fill('Hello Voyager, we hear you!')
      await page.getByRole('button', { name: 'Send' }).press('Enter')
      await page.locator('.moment').waitFor({ timeout: 5000 })
      await wait(20800)
      await page.getByRole('button', { name: 'Continue' }).press('Enter')
      await wait(1500)
      const ok = (await page.locator('.bubble', { hasText: 'Hello Voyager, we hear you!' }).count()) > 0
      results.push([id, ok ? 'ok' : 'FAILED: message bubble not on the last page', errors])
      await page.close()
      continue
    }
    // 1. The idle hint after 8 s on the page.
    const t0 = Date.now()
    const pageHint = await page.locator('.hotspots__hint').waitFor({ timeout: 12000 }).then(() => true, () => false)
    const hintAfter = (Date.now() - t0) / 1000
    // The measurement starts ~2 s after the page opened, so 8 s idle shows up as ~6 s here.
    if (pageHint && hintAfter < 5) throw new Error(`the hint came too early (${hintAfter.toFixed(1)} s)`)
    // 2. Open with the keyboard: Tab to the tap button, Enter.
    const tap = page.locator('.tap-btn')
    await tap.focus()
    const ring = await tap.evaluate((el) => {
      const s = getComputedStyle(el)
      return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2
    })
    await page.keyboard.press('Enter')
    await page.locator('.moment').waitFor({ timeout: 4000 })
    await snap(page, folder, '0-open')
    // 3. Play it; take frames along the way.
    const playing = PLAY[id](page)
    if (folder) {
      for (const ms of [500, 1300, 2300, 3600]) {
        await wait(ms === 500 ? 500 : ms - [500, 1300, 2300][[1300, 2300, 3600].indexOf(ms)])
        await snap(page, folder, `${ms}ms`)
      }
    }
    await playing
    await page.getByRole('button', { name: 'Back to the story' }).waitFor({ timeout: 15000 })
    await snap(page, folder, 'z-done')
    // 4. Close with Escape; the page is still turnable.
    await page.keyboard.press('Escape')
    await wait(300)
    const closed = (await page.locator('.moment').count()) === 0
    const nextOk = await page.getByRole('button', { name: 'Next' }).isEnabled()
    const problems = [!pageHint && 'no idle hint', !ring && 'no focus ring', !closed && 'Escape did not close', !nextOk && 'Next disabled'].filter(Boolean)
    results.push([id, problems.length ? `FAILED: ${problems.join(', ')}` : 'ok', errors])
  } catch (e) {
    await page.screenshot({ path: `qa/scratch/tap-fail-${id}.png` }).catch(() => {})
    results.push([id, `FAILED: ${e.message.split('\n')[0]}`, errors])
  }
  await page.close()
}
await browser.close()
for (const [id, r, errors] of results) console.log(`${id.padEnd(11)} ${r}${errors.length ? `  (errors: ${errors.join(' | ')})` : ''}`)
const failed = results.filter(([, r, e]) => r !== 'ok' || e.length)
console.log(failed.length ? `${failed.length} failed` : `all ${results.length} tap moments work`)
process.exit(failed.length ? 1 : 0)
