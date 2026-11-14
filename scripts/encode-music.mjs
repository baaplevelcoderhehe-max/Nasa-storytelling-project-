// Converts a WAV file to Ogg Opus, with no extra tools installed.
//
//   node scripts/encode-music.mjs public/ambient-music.wav public/ambient-music.ogg [kbps]
//
// Chromium (from Playwright) does the work: it resamples the audio to 48 kHz and
// encodes it with its built-in Opus encoder (WebCodecs). This script then wraps the
// Opus packets in an Ogg container (RFC 7845), so the result is a normal .ogg file.

import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const [input, output, kbps = '40'] = process.argv.slice(2)
if (!input || !output) {
  console.error('usage: node scripts/encode-music.mjs <in.wav> <out.ogg> [kbps]')
  process.exit(1)
}

const SAMPLE_RATE = 48000 // Opus always works at 48 kHz inside
const FRAME = 960 // 20 ms at 48 kHz

// ---------- encode in the browser ----------

async function encodeInBrowser(wav, bitrate) {
  // WebCodecs only exists on secure pages, so serve a blank page on a fake https URL.
  const browser = await chromium.launch({ channel: 'chromium' })
  try {
    const page = await browser.newPage()
    await page.route('https://encoder.local/', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>encoder</title>' }),
    )
    await page.goto('https://encoder.local/')
    return await page.evaluate(
      async ({ base64, bitrate, sampleRate, frame }) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        // decodeAudioData resamples to the context's rate (48 kHz).
        const probe = new OfflineAudioContext(1, 1, sampleRate)
        const audio = await probe.decodeAudioData(bytes.buffer)
        const channels = audio.numberOfChannels
        const length = audio.length

        const packets = []
        let description = null
        const encoder = new AudioEncoder({
          output: (chunk, meta) => {
            const data = new Uint8Array(chunk.byteLength)
            chunk.copyTo(data)
            let s = ''
            for (const b of data) s += String.fromCharCode(b)
            packets.push(btoa(s))
            if (meta?.decoderConfig?.description && !description) {
              const d = new Uint8Array(meta.decoderConfig.description)
              description = Array.from(d)
            }
          },
          error: (e) => {
            throw e
          },
        })
        encoder.configure({ codec: 'opus', sampleRate, numberOfChannels: channels, bitrate })

        // Feed the samples in 20 ms frames, interleaved (f32).
        const planes = Array.from({ length: channels }, (_, c) => audio.getChannelData(c))
        for (let start = 0; start < length; start += frame) {
          const n = Math.min(frame, length - start)
          const data = new Float32Array(n * channels)
          for (let i = 0; i < n; i++)
            for (let c = 0; c < channels; c++) data[i * channels + c] = planes[c][start + i]
          encoder.encode(
            new AudioData({
              format: 'f32',
              sampleRate,
              numberOfFrames: n,
              numberOfChannels: channels,
              timestamp: Math.round((start / sampleRate) * 1e6),
              data,
            }),
          )
        }
        await encoder.flush()
        encoder.close()
        return { packets, channels, length, description }
      },
      { base64: wav.toString('base64'), bitrate, sampleRate: SAMPLE_RATE, frame: FRAME },
    )
  } finally {
    await browser.close()
  }
}

// ---------- Ogg container ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let r = i << 24
    for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1
    table[i] = r >>> 0
  }
  return table
})()

function oggCrc(buf) {
  let crc = 0
  for (const b of buf) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ b) & 0xff]) >>> 0
  return crc
}

const SERIAL = 0x5354494c // "STIL"

function page({ packets, granule, sequence, first = false, last = false }) {
  const lacing = []
  for (const p of packets) {
    let n = p.length
    while (n >= 255) {
      lacing.push(255)
      n -= 255
    }
    lacing.push(n)
  }
  const header = Buffer.alloc(27 + lacing.length)
  header.write('OggS', 0, 'ascii')
  header[4] = 0 // version
  header[5] = (first ? 0x02 : 0) | (last ? 0x04 : 0)
  header.writeBigInt64LE(BigInt(granule), 6)
  header.writeUInt32LE(SERIAL, 14)
  header.writeUInt32LE(sequence, 18)
  header.writeUInt32LE(0, 22) // CRC, filled in below
  header[26] = lacing.length
  lacing.forEach((v, i) => (header[27 + i] = v))
  const full = Buffer.concat([header, ...packets])
  full.writeUInt32LE(oggCrc(full), 22)
  return full
}

function opusHead(channels, preSkip, inputRate) {
  const b = Buffer.alloc(19)
  b.write('OpusHead', 0, 'ascii')
  b[8] = 1 // version
  b[9] = channels
  b.writeUInt16LE(preSkip, 10)
  b.writeUInt32LE(inputRate, 12)
  b.writeInt16LE(0, 16) // output gain
  b[18] = 0 // channel mapping family (mono / stereo)
  return b
}

function opusTags() {
  const vendor = Buffer.from('Still Out There encode-music (Chromium WebCodecs)')
  const b = Buffer.alloc(8 + 4 + vendor.length + 4)
  b.write('OpusTags', 0, 'ascii')
  b.writeUInt32LE(vendor.length, 8)
  vendor.copy(b, 12)
  b.writeUInt32LE(0, 12 + vendor.length) // no comments
  return b
}

function wavRate(wav) {
  return wav.toString('ascii', 0, 4) === 'RIFF' ? wav.readUInt32LE(24) : SAMPLE_RATE
}

async function main() {
  const wav = await readFile(input)
  const { packets, channels, length, description } = await encodeInBrowser(wav, Number(kbps) * 1000)
  const data = packets.map((p) => Buffer.from(p, 'base64'))

  // Pre-skip: from the encoder's own OpusHead if it gave one, else libopus's 312.
  let preSkip = 312
  if (description && description.length >= 12 && Buffer.from(description.slice(0, 8)).toString() === 'OpusHead') {
    preSkip = Buffer.from(description).readUInt16LE(10)
  }

  const pages = []
  let sequence = 0
  pages.push(page({ packets: [opusHead(channels, preSkip, wavRate(wav))], granule: 0, sequence: sequence++, first: true }))
  pages.push(page({ packets: [opusTags()], granule: 0, sequence: sequence++ }))

  // About one second of audio per page (50 packets of 20 ms).
  const PER_PAGE = 50
  const endGranule = preSkip + length
  for (let i = 0; i < data.length; i += PER_PAGE) {
    const group = data.slice(i, i + PER_PAGE)
    const done = i + group.length
    const last = done >= data.length
    const granule = last ? endGranule : preSkip + done * FRAME
    pages.push(page({ packets: group, granule: Math.min(granule, endGranule), sequence: sequence++, last }))
  }

  const ogg = Buffer.concat(pages)
  await writeFile(output, ogg)
  console.log(
    `${input} (${(wav.length / 1024 / 1024).toFixed(1)} MB) -> ${output} (${(ogg.length / 1024).toFixed(0)} KB), ` +
      `${(length / SAMPLE_RATE).toFixed(1)} s, ${channels} ch, Opus ${kbps} kbps, pre-skip ${preSkip}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
