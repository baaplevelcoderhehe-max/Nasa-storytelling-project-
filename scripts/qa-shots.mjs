// Review screenshots for a phase or feature, saved for good in qa/screenshots/.
//
//   node scripts/qa-shots.mjs <NN-feature-name> <page id> [<page id> ...]
//   node scripts/qa-shots.mjs 02-phaseB-scenes title test-moon test-mars test-space
//
// Page ids: "title" is the title screen; anything else is a state id from
// public/story.json. The story's first page is reached by pressing Begin on the
// title screen; every other page opens with ?page=<id>.
//
// Writes qa/screenshots/<folder>/:
//   phone/           375x812, deviceScaleFactor 2
//   tablet/          768x1024, deviceScaleFactor 1
//   desktop/         1280x800, deviceScaleFactor 1
//   reduced-motion/  one desktop shot per page with reduced motion on
//   sheets/          one contact sheet per page: phone, tablet and desktop side by
//                    side, labeled (WebP quality ~80, at most 2400 px wide, under 2 MB)
//
// Only sheets/ and NOTES.md are kept in git. The per-device folders stay on disk
// for a closer look but are ignored (see .gitignore).
//   NOTES.md         page list and any console errors, with sections to fill in
//
// An existing folder is never overwritten: pick the next number instead.
// Starts `pnpm dev` itself if nothing answers on the dev URL (and stops it after).
// Options (environment): QA_URL=http://localhost:5174/ to shoot another server;
// QA_SCRATCH=1 to write a working pass to qa/scratch/ instead (not kept in git);
// QA_FAST=1 for a quick working pass: phone and desktop only, no reduced-motion shots.

import { spawn, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from '@playwright/test'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..')
const [folder, ...pages] = process.argv.slice(2)
if (!folder || pages.length === 0 || !/^\d{2}-[\w.-]+$/.test(folder)) {
  console.error('usage: node scripts/qa-shots.mjs <NN-feature-name> <page id> [...]')
  console.error('example: node scripts/qa-shots.mjs 03-phaseC-story title prologue-1 moon-1')
  process.exit(1)
}

const URL_BASE = process.env.QA_URL ?? 'http://localhost:5173/'
// QA_SCRATCH=1 writes to qa/scratch/ (not kept in git) for working passes.
const OUT = path.join(ROOT, 'qa', process.env.QA_SCRATCH ? 'scratch' : 'screenshots', folder)
const SIZES = {
  phone: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
}
const SETTLE_MS = 2000
const SHEET_MAX_WIDTH = 2400
const SHEET_MAX_BYTES = 2 * 1024 * 1024
const unfrozen = new Set()

// ---------- dev server ----------

async function answers(url) {
  try {
    const r = await fetch(url)
    return r.ok
  } catch {
    return false
  }
}

async function ensureServer() {
  if (await answers(URL_BASE)) return null
  const port = new URL(URL_BASE).port || '5173'
  console.log(`starting the dev server on port ${port}...`)
  const child = spawn('pnpm', ['dev', '--port', port, '--strictPort'], { cwd: ROOT, shell: true, stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    if (await answers(URL_BASE)) return child
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`the dev server did not start on ${URL_BASE}`)
}

function stopServer(child) {
  if (!child) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' })
    else child.kill('SIGTERM')
  } catch {
    /* already gone */
  }
}

// ---------- one shot ----------

async function storyStart() {
  try {
    const r = await fetch(new URL('story.json', URL_BASE))
    return (await r.json()).start
  } catch {
    return null
  }
}

/**
 * Opens a page, waits for the art and fonts, then freezes animation time. The app's
 * screenshot mode (?freeze=2) plays the scene's first 2 seconds frame by frame and
 * holds that exact frame, so every shot is identical. Builds without that mode (older
 * commits) just get a 2 s wait.
 */
async function shoot(browser, size, id, { start, reduced, file, errors }) {
  const context = await browser.newContext({ ...SIZES[size], reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const page = await context.newPage()
  const tag = `${reduced ? 'reduced' : size}/${id}`
  page.on('pageerror', (e) => errors.add(`${tag}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.add(`${tag}: ${m.text()}`))
  page.on('response', (r) => r.status() >= 400 && errors.add(`${tag}: HTTP ${r.status()} ${r.url()}`))

  // Same random numbers every run (fireflies and the like), and a fixed date.
  await page.addInitScript(() => {
    let seed = 42
    Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  })
  const query = new URLSearchParams()
  if (id !== 'title' && id !== start) query.set('page', id)
  if (reduced) query.set('reduce', '1')
  query.set('freeze', String(SETTLE_MS / 1000))
  const qs = query.toString()
  await page.goto(qs ? `${URL_BASE}?${qs}` : URL_BASE)
  await page.waitForLoadState('networkidle')

  if (id !== 'title' && id === start) {
    // The first page: press Begin like a reader does.
    await page.getByRole('button', { name: /begin/i }).click()
    // Make sure the title screen has really gone before going on.
    await page.waitForFunction(() => !document.querySelector('.ts'), null, { timeout: 30000 }).catch(() => {
      errors.add(`${tag}: the title screen was still showing 30 s after pressing Begin`)
    })
  }

  // Art and fonts: no "Turning page…" placeholder, no pending requests, fonts ready.
  await page.waitForFunction(() => !document.querySelector('.status'), null, { timeout: 30000 }).catch(() => {
    errors.add(`${tag}: page still showed a loading message after 30 s`)
  })
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)

  // Wait for the frozen frame (the scene marks itself), then the 2 seconds.
  const expected = id === 'title' ? 'title' : id
  const frozen = await page
    .waitForFunction((name) => document.body.dataset.qaFrozen === name, expected, { timeout: 15000 })
    .then(() => true)
    .catch(() => false)
  if (!frozen) unfrozen.add(id)
  await page.waitForTimeout(SETTLE_MS)

  await page.screenshot({ path: file, animations: 'disabled' })
  await context.close()
}

// ---------- contact sheet ----------

function labelSvg(text, width, height) {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<text x="${width / 2}" y="${height - 16}" font-family="Segoe UI, Arial, sans-serif" font-size="26" ` +
      `font-weight="600" fill="#e8e3d6" text-anchor="middle">${safe}</text></svg>`,
  )
}

async function contactSheet(id, files, out) {
  const PAD = 24
  const LABEL = 54
  const TITLE = 64
  const metas = await Promise.all(files.map(async (f) => sharp(f.path).metadata()))
  const ratios = metas.map((m) => m.width / m.height)
  // One shared height so the three sit side by side, as tall as fits in 2400 px.
  let height = Math.floor((SHEET_MAX_WIDTH - PAD * (files.length + 1)) / ratios.reduce((a, b) => a + b, 0))
  for (;;) {
    const widths = ratios.map((r) => Math.round(r * height))
    const sheetW = widths.reduce((a, b) => a + b, 0) + PAD * (files.length + 1)
    const sheetH = TITLE + LABEL + height + PAD
    const layers = [{ input: labelSvg(`${id}`, sheetW, TITLE), left: 0, top: 0 }]
    let x = PAD
    for (let i = 0; i < files.length; i++) {
      const img = await sharp(files[i].path).resize({ height, width: widths[i], fit: 'fill' }).png().toBuffer()
      layers.push({ input: labelSvg(files[i].label, widths[i], LABEL), left: x, top: TITLE })
      layers.push({ input: img, left: x, top: TITLE + LABEL })
      x += widths[i] + PAD
    }
    const base = sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#1b1a22' } }).composite(layers)
    // WebP, quality ~80: only the contact sheets are kept in git.
    const buffer = await base.clone().webp({ quality: 80, effort: 5 }).toBuffer()
    if (buffer.length <= SHEET_MAX_BYTES || height < 300) {
      await writeFile(out, buffer)
      return { width: sheetW, bytes: buffer.length }
    }
    height = Math.floor(height * 0.85)
  }
}

// ---------- main ----------

async function main() {
  if (existsSync(OUT)) {
    console.error(`${path.relative(ROOT, OUT)} already exists. Old folders are never overwritten: use the next number.`)
    process.exit(1)
  }
  for (const dir of ['phone', 'tablet', 'desktop', 'reduced-motion', 'sheets']) {
    await mkdir(path.join(OUT, dir), { recursive: true })
  }

  const server = await ensureServer()
  const start = await storyStart()
  const errors = new Set()
  const browser = await chromium.launch({
    channel: 'chromium',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  })
  const sheets = []
  try {
    for (const id of pages) {
      const files = []
      const sizes = process.env.QA_FAST ? ['phone', 'desktop'] : Object.keys(SIZES)
      for (const size of sizes) {
        const file = path.join(OUT, size, `${id}.png`)
        await shoot(browser, size, id, { start, reduced: false, file, errors })
        const { viewport, deviceScaleFactor } = SIZES[size]
        files.push({ path: file, label: `${size}  ${viewport.width}×${viewport.height}  @${deviceScaleFactor}x` })
      }
      if (!process.env.QA_FAST) {
        await shoot(browser, 'desktop', id, { start, reduced: true, file: path.join(OUT, 'reduced-motion', `${id}.png`), errors })
      }
      const sheet = path.join(OUT, 'sheets', `${id}.webp`)
      const info = await contactSheet(id, files, sheet)
      sheets.push(sheet)
      console.log(`  ${id}: sheet ${info.width}px, ${(info.bytes / 1024).toFixed(0)} KB`)
    }
  } finally {
    await browser.close()
    stopServer(server)
  }

  const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/')
  const notesPath = path.join(OUT, 'NOTES.md')
  const notes = [
    `# ${folder}`,
    '',
    `Captured ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from ${URL_BASE}`,
    '',
    '## What changed',
    '',
    '_(fill in)_',
    '',
    '## Pages captured',
    '',
    ...pages.map((p) => `- \`${p}\`: [sheet](sheets/${p}.webp) · [phone](phone/${p}.png) · [tablet](tablet/${p}.png) · [desktop](desktop/${p}.png) · [reduced motion](reduced-motion/${p}.png)`),
    '',
    ...(unfrozen.size
      ? ['## Animation not frozen', '', `This build has no screenshot mode, so these were shot after a plain 2 s wait: ${[...unfrozen].join(', ')}.`, '']
      : []),
    '## Console errors and failed requests',
    '',
    ...(errors.size ? [...errors].map((e) => `- ${e}`) : ['None.']),
    '',
    '## Still looks off',
    '',
    '_(fill in after looking at the shots)_',
    '',
  ].join('\n')
  await writeFile(notesPath, notes)

  console.log(`\n${rel(OUT)}/`)
  console.log(sheets.map((s) => `  ${rel(s)}`).join('\n'))
  console.log(errors.size ? `\nproblems:\n${[...errors].join('\n')}` : '\nno console errors or failed requests')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
