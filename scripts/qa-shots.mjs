// Quick visual check: screenshots of the title screen and the first page at phone
// (375x812) and desktop (1280x800) size, saved to qa/<label>/.
//
//   node scripts/qa-shots.mjs [label]        (needs `pnpm dev` running on port 5173)

import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const label = process.argv[2] ?? 'latest'
const URL = process.env.QA_URL ?? 'http://localhost:5173/'
const SIZES = { phone: { width: 375, height: 812 }, desktop: { width: 1280, height: 800 } }

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const errors = []
for (const [name, viewport] of Object.entries(SIZES)) {
  const page = await browser.newPage({ viewport })
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`))
  page.on('requestfailed', (r) => errors.push(`${name}: failed ${r.url()}`))
  page.on('response', (r) => r.status() >= 400 && errors.push(`${name}: ${r.status()} ${r.url()}`))
  await mkdir(`qa/${label}`, { recursive: true })
  await page.goto(URL)
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `qa/${label}/${name}-title.png` })
  await page.getByRole('button', { name: /begin/i }).click()
  await page.waitForTimeout(4000)
  await page.screenshot({ path: `qa/${label}/${name}-page1.png` })
  await page.close()
}
await browser.close()
console.log(errors.length ? `problems:\n${[...new Set(errors)].join('\n')}` : 'no console errors or failed requests')
