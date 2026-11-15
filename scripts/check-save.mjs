// Checks saving: refresh keeps the place, Continue resumes, Start over asks first and
// keeps settings, and the book still works when storage is blocked (private mode).
//   node scripts/check-save.mjs        (needs the dev server on QA_URL / :5173)
import { chromium } from '@playwright/test'
const URL_BASE = process.env.QA_URL ?? 'http://localhost:5173/'
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--use-angle=d3d11'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const out = []
const check = (name, ok) => out.push(`${ok ? 'ok    ' : 'FAILED'} ${name}`)

// 1. Normal storage
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  await p.goto(URL_BASE); await p.waitForLoadState('networkidle'); await wait(1500)
  check('fresh cover shows Begin, no Continue', (await p.getByRole('button', { name: 'Begin' }).count()) === 1 && (await p.getByRole('button', { name: 'Continue' }).count()) === 0)
  await p.getByRole('button', { name: 'Begin' }).click(); await wait(2500)
  for (let i = 0; i < 3; i++) { await p.getByRole('button', { name: /Next/ }).click(); await wait(900) }
  await p.getByRole('button', { name: 'The Moon' }).click(); await wait(3500) // the hub
  // a setting
  await p.getByRole('button', { name: 'Settings' }).click(); await wait(400)
  await p.getByRole('radio', { name: 'A++' }).click(); await p.keyboard.press('Escape'); await wait(300)
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('still-out-there-save')))
  check('save written to localStorage (page moon-1, text size 3)', saved?.state?.nav?.id === 'moon-1' && saved?.state?.settings?.textSize === 3)
  await p.reload(); await p.waitForLoadState('networkidle'); await wait(1500)
  check('after refresh the cover offers Continue and Start over', (await p.getByRole('button', { name: 'Continue' }).count()) === 1 && (await p.getByRole('button', { name: 'Start over' }).count()) === 1)
  await p.getByRole('button', { name: 'Continue' }).click(); await wait(2500)
  check('Continue resumes the saved page (Welcome to the Moon)', (await p.locator('.bubble', { hasText: 'Welcome to the Moon' }).count()) === 1)
  check('text size setting survived the refresh', (await p.evaluate(() => document.documentElement.dataset.textSize)) === '3')
  await p.reload(); await p.waitForLoadState('networkidle'); await wait(1500)
  await p.getByRole('button', { name: 'Start over' }).click(); await wait(400)
  check('Start over asks first, on a paper card (not a browser dialog)', (await p.getByRole('dialog', { name: 'Are you sure?' }).count()) === 1)
  await p.getByRole('button', { name: 'Keep my place' }).click(); await wait(300)
  check('"Keep my place" keeps the save', (await p.evaluate(() => JSON.parse(localStorage.getItem('still-out-there-save')).state.nav.id)) === 'moon-1')
  await p.getByRole('button', { name: 'Start over' }).click(); await wait(300)
  await p.getByRole('dialog').getByRole('button', { name: 'Start over' }).click(); await wait(2500)
  const after = await p.evaluate(() => JSON.parse(localStorage.getItem('still-out-there-save')).state)
  check('Start over: back at the first page, settings kept', after.nav.id === 'prologue-1' && after.nav.visited.length === 1 && after.settings.textSize === 3)
  check(`no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`, errors.length === 0)
  await ctx.close()
}

// 2. Storage blocked
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
  await ctx.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError') } })
  })
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  await p.goto(URL_BASE); await p.waitForLoadState('networkidle'); await wait(1500)
  await p.getByRole('button', { name: 'Begin' }).click(); await wait(2500)
  await p.getByRole('button', { name: /Next/ }).click(); await wait(900)
  check('storage blocked: the book still opens and turns pages', (await p.locator('.bubble', { hasText: 'Someone is calling' }).count()) === 1)
  check('storage blocked: no page errors', errors.length === 0)
  await ctx.close()
}
await b.close()
console.log(out.join('\n'))
process.exit(out.some((l) => l.startsWith('FAILED')) ? 1 : 0)
