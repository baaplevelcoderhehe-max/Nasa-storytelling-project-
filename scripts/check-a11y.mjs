// axe (WCAG 2.1 A and AA) on the cover, hub, settings, credits and 10 pages.
//   node scripts/check-a11y.mjs   (needs a server on QA_URL, default the dev server)
// Exits 1 if any serious or critical issue is found.
import AxeBuilder from '@axe-core/playwright'
import { chromium } from '@playwright/test'
const URL_BASE = process.env.QA_URL ?? 'http://localhost:5173/'
const PAGES = ['prologue-1', 'prologue-2', 'moon-2', 'mars1-4', 'mars1-7', 'mars2-1', 'mars2-6', 'small-4', 'beyond-4', 'finale-3']
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--use-angle=d3d11'] })
const report = []
async function audit(name, open) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
  const p = await ctx.newPage()
  await open(p)
  // Let every bubble finish appearing (half-faded text would fail contrast).
  await wait(6000)
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  for (const v of r.violations) report.push({ name, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) })
  const serious = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).length
  console.log(`${name.padEnd(12)} violations ${r.violations.length} (serious/critical ${serious}), passes ${r.passes.length}, needs review ${r.incomplete.length}`)
  await ctx.close()
}
const cover = async (p) => { await p.goto(URL_BASE); await p.waitForLoadState('networkidle') }
await audit('cover', cover)
await audit('settings', async (p) => { await cover(p); await wait(1500); await p.getByRole('button', { name: 'Settings' }).click() })
await audit('credits', async (p) => { await cover(p); await wait(1500); await p.getByRole('button', { name: 'Credits' }).click() })
await audit('hub', async (p) => { await p.goto(`${URL_BASE}?page=hub`); await p.waitForLoadState('networkidle') })
for (const id of PAGES) await audit(id, async (p) => { await p.goto(`${URL_BASE}?page=${id}`); await p.waitForLoadState('networkidle') })
await b.close()
for (const v of report) console.log(`- [${v.impact}] ${v.name}: ${v.id}: ${v.help}\n    ${v.nodes.join('\n    ')}`)
const bad = report.filter((v) => ['serious', 'critical'].includes(v.impact))
console.log(bad.length ? `${bad.length} serious/critical issues` : 'zero serious or critical issues')
process.exit(bad.length ? 1 : 0)
