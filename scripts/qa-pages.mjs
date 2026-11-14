// Screenshots of chosen story pages at phone (375x812) and desktop (1280x800).
//
//   node scripts/qa-pages.mjs <label> test-moon test-mars test-space
//   QA_QUERY=reduce=1 node scripts/qa-pages.mjs reduced test-moon
//
// Needs `pnpm dev` on port 5173. Saves to qa/<label>/<size>-<page>.png and prints any
// console errors or failed requests.

import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const [label = 'pages', ...pages] = process.argv.slice(2)
const BASE = process.env.QA_URL ?? 'http://localhost:5173/'
const EXTRA = process.env.QA_QUERY ? `&${process.env.QA_QUERY}` : ''
const SIZES = { phone: { width: 375, height: 812 }, desktop: { width: 1280, height: 800 } }

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errors = []
await mkdir(`qa/${label}`, { recursive: true })
for (const [size, viewport] of Object.entries(SIZES)) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  for (const id of pages) {
    const page = await context.newPage()
    page.on('pageerror', (e) => errors.push(`${size}/${id}: ${e.message}`))
    page.on('console', (m) => m.type() === 'error' && errors.push(`${size}/${id}: ${m.text()}`))
    page.on('response', (r) => r.status() >= 400 && errors.push(`${size}/${id}: ${r.status()} ${r.url()}`))
    await page.goto(`${BASE}?page=${id}${EXTRA}`)
    await page.waitForTimeout(5000)
    await page.screenshot({ path: `qa/${label}/${size}-${id}.png` })
    await page.close()
  }
  await context.close()
}
await browser.close()
console.log(errors.length ? `problems:\n${[...new Set(errors)].join('\n')}` : 'no console errors or failed requests')
