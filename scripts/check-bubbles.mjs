// Checks the bubble rules on every page, at phone, tablet and desktop size:
//   - no bubble wider than 90vw
//   - no bubble off-screen
//   - no bubble down in the bottom controls
//   - no bubble covering the page's main sprite
//   - the bottom controls never overlap each other
//
//   node scripts/check-bubbles.mjs            (all pages)
//   node scripts/check-bubbles.mjs moon-1 hub (some pages)
//
// Needs the dev server (starts it if nothing answers on QA_URL / localhost:5173).
// Exits with code 1 if any rule is broken, and prints each problem.

import { spawn, execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const URL_BASE = process.env.QA_URL ?? 'http://localhost:5173/'
const SIZES = {
  phone: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
}

async function answers(url) {
  try {
    return (await fetch(url)).ok
  } catch {
    return false
  }
}
async function ensureServer() {
  if (await answers(URL_BASE)) return null
  const port = new URL(URL_BASE).port || '5173'
  const child = spawn('pnpm', ['dev', '--port', port, '--strictPort'], { shell: true, stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    if (await answers(URL_BASE)) return child
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('dev server did not start')
}

const story = JSON.parse(await readFile(new URL('../public/story.json', import.meta.url), 'utf8'))
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['hub', ...story.order]

const server = await ensureServer()
const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const problems = []
let checked = 0
try {
  for (const [size, viewport] of Object.entries(SIZES)) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    for (const id of pages) {
      await page.goto(`${URL_BASE}?page=${id}&freeze=2`)
      await page.waitForFunction((name) => document.body.dataset.qaFrozen === name, id, { timeout: 30000 }).catch(() => {})
      // Screenshot mode shows every bubble at once; give layout a moment to settle.
      await page.waitForTimeout(600)
      const found = await page.evaluate(() => {
        const vw = window.innerWidth
        const vh = window.innerHeight
        const out = []
        const controls = document.querySelector('.controls')
        const controlsTop = controls ? controls.getBoundingClientRect().top : vh
        const mains = (window.__spriteRects ?? []).filter((r) => r.main)
        const overlap = (a, b) =>
          Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
          Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
        document.querySelectorAll('.bubbles .bubble').forEach((el) => {
          const r = el.getBoundingClientRect()
          const text = el.textContent.trim().slice(0, 40)
          if (r.width > vw * 0.9 + 1) out.push(`wider than 90vw (${Math.round(r.width)}px): "${text}"`)
          if (r.left < -1 || r.right > vw + 1 || r.top < -1) out.push(`off-screen: "${text}"`)
          if (r.bottom > controlsTop + 1) out.push(`over the controls: "${text}"`)
          for (const m of mains) {
            const area = overlap(r, m)
            if (area > 0) out.push(`covers the main sprite ${m.name} (${Math.round(area)} px²): "${text}"`)
          }
        })
        if (controls) {
          const parts = [...controls.children].map((c) => c.getBoundingClientRect())
          for (let i = 0; i < parts.length; i++)
            for (let j = i + 1; j < parts.length; j++)
              if (overlap(parts[i], parts[j]) > 0) out.push('bottom controls overlap each other')
          if (parts.some((p) => p.right > vw + 1 || p.left < -1)) out.push('bottom controls go off-screen')
          const buttons = [...controls.querySelectorAll('button')].map((b) => b.getBoundingClientRect())
          if (buttons.some((b) => b.height < 48)) out.push('a control button is under 48 px tall')
        }
        return out
      })
      checked++
      found.forEach((p) => problems.push(`${size} ${id}: ${p}`))
    }
    await context.close()
  }
} finally {
  await browser.close()
  if (server) {
    try {
      if (process.platform === 'win32') execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' })
      else server.kill()
    } catch {
      /* gone */
    }
  }
}

console.log(`checked ${checked} page views (${pages.length} pages x ${Object.keys(SIZES).length} sizes)`)
if (problems.length) {
  console.log(`${problems.length} problems:\n${problems.join('\n')}`)
  process.exit(1)
}
console.log('all bubble rules hold')
