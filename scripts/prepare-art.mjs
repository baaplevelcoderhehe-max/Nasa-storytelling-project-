// Prepares the storybook art for the web.
//
//   node scripts/prepare-art.mjs
//
// Reads the untouched originals in /sprites and writes web-ready WebP files to
// /public/art/<group>/, plus src/data/art.js (name -> { src, width, height }).
// Run it again whenever a sprite is added or changed in /sprites.
//
// Backgrounds: 1920 px wide WebP, quality ~80 (lowered step by step until the file
//   is under 350 KB), with any painted paper border cropped off.
// Sprites: transparent padding trimmed, at most 1024 px on the long side, WebP
//   with alpha.

import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..')
const SRC = path.join(ROOT, 'sprites')
const OUT = path.join(ROOT, 'public', 'art')
const ART_JS = path.join(ROOT, 'src', 'data', 'art.js')

// Source folder in /sprites -> output group in /public/art
const GROUPS = {
  Characters: 'characters',
  hardware: 'hardware',
  backgrounds: 'backgrounds',
  planets: 'planets',
  props: 'props',
  UI: 'ui',
}

// Files that are skipped, and files that get a new name.
const IGNORE = new Set(['pathfinder_open (2).png'])
const RENAME = { 'Untitled design (1).png': 'voyager' }

const BG_WIDTH = 1920
const BG_QUALITY = 80
const BG_MIN_QUALITY = 50
const BG_MAX_BYTES = 350 * 1024
const SPRITE_MAX = 1024
const SPRITE_QUALITY = 85
const ALPHA_THRESHOLD = 8 // alpha at or below this counts as empty padding

const log = (...a) => console.log(...a)

/** "bg_moon_plain.png.jpg" -> "bg_moon_plain", "Kit Idle.png" -> "kit_idle" */
function cleanName(file) {
  if (RENAME[file]) return RENAME[file]
  return file
    .replace(/(\.(png|jpe?g|webp))+$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

// ---------- backgrounds ----------

/**
 * Finds a light paper border painted around the picture and returns the crop box
 * inside it, or null when the picture runs edge to edge.
 * Works on a small copy for speed, then scales the box back up.
 */
async function findPaperBorder(file, width, height) {
  const SCALE = 4
  const { data, info } = await sharp(file)
    .resize(Math.round(width / SCALE))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const px = (x, y) => {
    const i = (y * w + x) * 3
    return [data[i], data[i + 1], data[i + 2]]
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  const average = (pts) =>
    pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((v) => v / pts.length)

  // Paper colour = the four corners; picture colour = the middle.
  const corner = []
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++)
      corner.push(px(x, y), px(w - 1 - x, y), px(x, h - 1 - y), px(w - 1 - x, h - 1 - y))
  const middle = []
  for (let y = Math.round(h * 0.3); y < h * 0.7; y += 2)
    for (let x = Math.round(w * 0.3); x < w * 0.7; x += 2) middle.push(px(x, y))
  const paper = average(corner)
  const brightness = (c) => (c[0] + c[1] + c[2]) / 3
  // A paper border is light, low in colour, and clearly different from the picture.
  const isLight = brightness(paper) > 200 && Math.max(...paper) - Math.min(...paper) < 60
  if (!isLight || dist(paper, average(middle)) < 60) return null

  const isPaper = (p) => dist(p, paper) < 70

  // How far the paper reaches in from one edge along a line. Only the unbroken run
  // from the edge counts, so light stars or highlights inside the picture are ignored.
  const runFromEdge = (length, at) => {
    let n = 0
    while (n < length / 3 && isPaper(at(n))) n++
    return n
  }
  // The painted edge is ragged: take the deepest reach along each side.
  const deepest = (lines, length, at) => {
    let max = 0
    for (const line of lines) max = Math.max(max, runFromEdge(length, (n) => at(line, n)))
    return max
  }
  const range = (from, to) => Array.from({ length: to - from }, (_, i) => from + i)
  const rows = range(Math.round(h * 0.04), Math.round(h * 0.96))
  const cols = range(Math.round(w * 0.04), Math.round(w * 0.96))

  const left = deepest(rows, w, (y, n) => px(n, y))
  const right = deepest(rows, w, (y, n) => px(w - 1 - n, y))
  const top = deepest(cols, h, (x, n) => px(x, n))
  const bottom = deepest(cols, h, (x, n) => px(x, h - 1 - n))

  // A small extra inset clears the last brush-stroke wisps and the rounded corners.
  const inset = Math.round(Math.min(w, h) * 0.012)
  const box = {
    left: (left + inset) * SCALE,
    top: (top + inset) * SCALE,
    width: (w - left - right - 2 * inset) * SCALE,
    height: (h - top - bottom - 2 * inset) * SCALE,
  }
  box.width = Math.min(box.width, width - box.left)
  box.height = Math.min(box.height, height - box.top)
  return box
}

async function prepareBackground(file, name, outDir) {
  const meta = await sharp(file).metadata()
  const border = await findPaperBorder(file, meta.width, meta.height)
  let pipeline = () => {
    let p = sharp(file)
    if (border) p = p.extract(border)
    return p.resize({ width: BG_WIDTH, withoutEnlargement: true })
  }
  let quality = BG_QUALITY
  let buffer
  for (;;) {
    buffer = await pipeline().webp({ quality, effort: 6 }).toBuffer()
    if (buffer.length <= BG_MAX_BYTES || quality <= BG_MIN_QUALITY) break
    quality -= 5
  }
  const out = path.join(outDir, `${name}.webp`)
  await writeFile(out, buffer)
  const size = await sharp(buffer).metadata()
  return {
    width: size.width,
    height: size.height,
    bytes: buffer.length,
    note: [
      border ? `paper border cropped (${border.left},${border.top} ${border.width}x${border.height})` : '',
      quality !== BG_QUALITY ? `quality ${quality}` : '',
      buffer.length > BG_MAX_BYTES ? 'STILL OVER 350 KB' : '',
    ]
      .filter(Boolean)
      .join(', '),
  }
}

// ---------- sprites ----------

/** Bounding box of every pixel that is not (almost) fully transparent. */
async function opaqueBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels } = info
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  let opaque = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * channels + 3] > ALPHA_THRESHOLD) {
        opaque++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
  return { box, coverage: opaque / (box.width * box.height), hasPadding: box.width < w || box.height < h }
}

// ---------- defringe ----------

const SCENE_GROUPS = new Set(['characters', 'hardware', 'planets', 'props'])
const OPAQUE = 250
const FRINGE_RADIUS = 3
const luminance = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b

/**
 * Removes the light halo a cut-out keeps from the paper or white it was cut from.
 * Every half-transparent edge pixel takes the colour of the solid pixels next to it;
 * if the edge pixel was clearly lighter than them (a fringe), it is also faded out.
 * Very faint leftovers are cleared. Then, for sprites drawn in the 3D scene, colours
 * are premultiplied by alpha, so fully transparent pixels are black and texture
 * filtering can never pull white into the edge.
 * (UI images are shown as plain <img> tags, which expect straight alpha, so they are
 * defringed but not premultiplied.)
 */
/**
 * Rim pass: solid pixels on the outer edge (next to transparency) that are much
 * lighter than the drawing just inside them are a light outline left by the cut-out.
 * They take the inner colour. Run twice to clear a 2-pixel rim.
 */
function clearLightRim(data, width, height) {
  let fixed = 0
  for (let pass = 0; pass < 2; pass++) {
    const src = Buffer.from(data)
    const alpha = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : src[(y * width + x) * 4 + 3])
    const onEdge = (x, y) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (alpha(x + dx, y + dy) < 128) return true
      return false
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        if (src[i + 3] < OPAQUE || !onEdge(x, y)) continue
        let r = 0
        let g = 0
        let b = 0
        let n = 0
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const xx = x + dx
            const yy = y + dy
            if (Math.abs(dx) + Math.abs(dy) < 3) continue // look a little further inside
            if (alpha(xx, yy) < OPAQUE || onEdge(xx, yy)) continue
            const j = (yy * width + xx) * 4
            r += src[j]
            g += src[j + 1]
            b += src[j + 2]
            n++
          }
        }
        if (n < 4) continue
        r /= n
        g /= n
        b /= n
        if (luminance(src[i], src[i + 1], src[i + 2]) - luminance(r, g, b) > 40) {
          data[i] = Math.round(r)
          data[i + 1] = Math.round(g)
          data[i + 2] = Math.round(b)
          fixed++
        }
      }
    }
  }
  return fixed
}

function defringe(data, width, height, premultiply) {
  let fixed = clearLightRim(data, width, height)
  const src = Buffer.from(data)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const a = src[i + 3]
      if (a === 0 || a >= OPAQUE) continue
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let dy = -FRINGE_RADIUS; dy <= FRINGE_RADIUS; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= height) continue
        for (let dx = -FRINGE_RADIUS; dx <= FRINGE_RADIUS; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= width) continue
          const j = (yy * width + xx) * 4
          if (src[j + 3] >= OPAQUE) {
            const w = 1 / (1 + dx * dx + dy * dy)
            r += src[j] * w
            g += src[j + 1] * w
            b += src[j + 2] * w
            n += w
          }
        }
      }
      if (n > 0) {
        r /= n
        g /= n
        b /= n
        const lighter = luminance(src[i], src[i + 1], src[i + 2]) - luminance(r, g, b)
        data[i] = Math.round(r)
        data[i + 1] = Math.round(g)
        data[i + 2] = Math.round(b)
        if (lighter > 35) data[i + 3] = Math.round(a * 0.55)
        fixed++
      } else if (a < 64 && luminance(src[i], src[i + 1], src[i + 2]) > 200) {
        // A faint, light speck away from the drawing: part of the halo.
        data[i + 3] = 0
        fixed++
      }
    }
  }
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 6) data[i + 3] = 0
    if (premultiply) {
      const a = data[i + 3] / 255
      data[i] = Math.round(data[i] * a)
      data[i + 1] = Math.round(data[i + 1] * a)
      data[i + 2] = Math.round(data[i + 2] * a)
    } else if (data[i + 3] === 0) {
      data[i] = data[i + 1] = data[i + 2] = 0
    }
  }
  return fixed
}

async function prepareSprite(file, name, outDir, group) {
  const meta = await sharp(file).metadata()
  const found = await opaqueBox(file)
  if (!found) throw new Error(`${file} is fully transparent`)
  const notes = []
  if (!meta.hasAlpha) notes.push('NO ALPHA CHANNEL in the original')

  const premultiply = SCENE_GROUPS.has(group)
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .extract(found.box)
    .resize({ width: SPRITE_MAX, height: SPRITE_MAX, fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const fixed = defringe(data, info.width, info.height, premultiply)
  notes.push(`defringed ${fixed} edge px${premultiply ? ', premultiplied' : ''}`)
  const buffer = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: SPRITE_QUALITY, alphaQuality: 95, effort: 6, exact: true })
    .toBuffer()
  await writeFile(path.join(outDir, `${name}.webp`), buffer)
  const size = await sharp(buffer).metadata()
  if (found.hasPadding) notes.push(`trimmed ${meta.width}x${meta.height} -> ${found.box.width}x${found.box.height}`)
  return { width: size.width, height: size.height, bytes: buffer.length, coverage: found.coverage, premultiplied: premultiply, note: notes.join(', ') }
}

// ---------- background variants ----------

/**
 * Variants of a prepared background with something painted out. Each patch covers a
 * circle (cx, cy, r, in prepared-file pixels; optional maxY) with sky copied from dx pixels to the
 * side, blended in with a soft edge, so the painted Earth can't double up with a
 * placed Earth sprite or peek out from behind the words.
 */
const VARIANTS = [
  { from: 'bg_moon_mountains', name: 'bg_moon_mountains_noearth', patches: [{ cx: 1001, cy: 128, r: 100, dx: 330, maxY: 222 }] },
]

async function makeVariant(variant, outDir) {
  const source = path.join(outDir, `${variant.from}.webp`)
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const out = Buffer.from(data)
  for (const { cx, cy, r, dx, maxY = h } of variant.patches) {
    const feather = r * 0.35
    // maxY: rows below it are left alone (keeps the mountains), fading out over 12 px.
    for (let y = Math.max(0, Math.floor(cy - r - feather)); y < Math.min(h, cy + r + feather, maxY); y++) {
      for (let x = Math.max(0, Math.floor(cx - r - feather)); x < Math.min(w, cx + r + feather); x++) {
        const d = Math.hypot(x - cx, y - cy)
        const kr = d <= r ? 1 : d >= r + feather ? 0 : 1 - (d - r) / feather
        const k = kr * Math.min(1, (maxY - y) / 12)
        if (k === 0) continue
        const sx = Math.min(w - 1, Math.max(0, x + dx))
        const i = (y * w + x) * 3
        const j = (y * w + sx) * 3
        for (let c = 0; c < 3; c++) out[i + c] = Math.round(out[i + c] * (1 - k) + data[j + c] * k)
      }
    }
  }
  const buffer = await sharp(out, { raw: { width: w, height: h, channels: 3 } }).webp({ quality: BG_QUALITY, effort: 6 }).toBuffer()
  await writeFile(path.join(outDir, `${variant.name}.webp`), buffer)
  return { width: w, height: h, bytes: buffer.length }
}

// ---------- main ----------

async function main() {
  // Clear only the folders this script writes; the still cover pictures in public/art
  // (cover-landscape.webp, cover-portrait.webp) are made by hand and stay.
  for (const group of new Set([...Object.values(GROUPS), 'backgrounds'])) {
    await rm(path.join(OUT, group), { recursive: true, force: true })
  }
  const art = {}
  const report = []
  let total = 0

  for (const [srcGroup, group] of Object.entries(GROUPS)) {
    const srcDir = path.join(SRC, srcGroup)
    const outDir = path.join(OUT, group)
    await mkdir(outDir, { recursive: true })
    const files = (await readdir(srcDir)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort()

    for (const file of files) {
      if (IGNORE.has(file)) {
        report.push(`  skip   ${srcGroup}/${file} (ignored duplicate)`)
        continue
      }
      let name = cleanName(file)
      const full = path.join(srcDir, file)
      let result
      if (group === 'backgrounds') {
        result = await prepareBackground(full, name, outDir)
      } else {
        result = await prepareSprite(full, name, outDir, group)
        // The Pioneer plaque is a rectangular plate. If this file is a round disc
        // it is the Voyager Golden Record instead, so it gets that name.
        if (name === 'pioneer_plaque' && result.coverage < 0.88) {
          const { rename } = await import('node:fs/promises')
          await rename(path.join(outDir, `${name}.webp`), path.join(outDir, 'golden_record.webp'))
          result.note = `${result.note}, ROUND DISC (coverage ${result.coverage.toFixed(2)}): saved as golden_record`
          name = 'golden_record'
        } else if (name === 'pioneer_plaque') {
          result.note = `${result.note ? `${result.note}, ` : ''}rectangular plate (coverage ${result.coverage.toFixed(2)})`
        }
      }
      if (art[name]) throw new Error(`Two files would both be called "${name}"`)
      art[name] = { src: `/art/${group}/${name}.webp`, width: result.width, height: result.height, group, premultiplied: !!result.premultiplied }
      total += result.bytes
      report.push(
        `  ${String(Math.round(result.bytes / 1024)).padStart(4)} KB  ${group}/${name}  ${result.width}x${result.height}${
          result.note ? `  (${result.note})` : ''
        }`,
      )
    }
  }

  for (const variant of VARIANTS) {
    const outDir = path.join(OUT, 'backgrounds')
    const result = await makeVariant(variant, outDir)
    art[variant.name] = { src: `/art/backgrounds/${variant.name}.webp`, width: result.width, height: result.height, group: 'backgrounds' }
    total += result.bytes
    report.push(`  ${String(Math.round(result.bytes / 1024)).padStart(4)} KB  backgrounds/${variant.name}  (variant of ${variant.from}, painted out)`)
  }

  const names = Object.keys(art).sort()
  const body = names
    .map((n) => `  ${n}: { src: '${art[n].src}', width: ${art[n].width}, height: ${art[n].height}, group: '${art[n].group}'${art[n].premultiplied ? ', premultiplied: true' : ''} },`)
    .join('\n')
  await mkdir(path.dirname(ART_JS), { recursive: true })
  await writeFile(
    ART_JS,
    `// Generated by scripts/prepare-art.mjs from /sprites. Do not edit by hand:\n` +
      `// change the originals in /sprites and run \`node scripts/prepare-art.mjs\`.\n` +
      `//\n// Each entry: the public path, the pixel size of the prepared file, and its group\n` +
      `// (characters | hardware | backgrounds | planets | props | ui). premultiplied: colours are\n` +
      `// already multiplied by alpha (scene sprites; the scene material expects that).\n\n` +
      `export const art = {\n${body}\n}\n\n` +
      `/** The art entry for a name, or undefined. */\nexport const getArt = (name) => art[name]\n`,
  )

  log(report.join('\n'))
  log(`\n${names.length} images, ${(total / 1024 / 1024).toFixed(2)} MB in public/art`)
  log(`wrote ${path.relative(ROOT, ART_JS)}`)
  const over = (await Promise.all(names.filter((n) => art[n].group === 'backgrounds').map(async (n) => {
    const s = await stat(path.join(ROOT, 'public', art[n].src))
    return s.size > BG_MAX_BYTES ? n : null
  }))).filter(Boolean)
  if (over.length) log(`WARNING: over 350 KB: ${over.join(', ')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
