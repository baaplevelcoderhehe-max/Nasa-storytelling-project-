// Builds public/story.json: the 44 spreads of the book, from docs/script.md.
//
//   node scripts/build-story.mjs
//
// This file is the source for the spreads: every Spark, Story, Voyager line and
// Mission Log fact below is copied word for word from docs/script.md (never invented).
// Scenes are composed from the sprites in src/data/art.js with small placement helpers,
// so Kit, Echo and the hardware stand on the ground at a consistent scale on every
// screen. The cover, the "_help" block and the hidden test pages are kept from the
// existing story.json.
//
// After editing this file, run it again; don't edit the spreads in story.json by hand.

import { readFile, writeFile } from 'node:fs/promises'
import { art } from '../src/data/art.js'

const STORY = new URL('../public/story.json', import.meta.url)

// ---------- placement helpers ----------
//
// Coordinates follow the layer rules in story.json "_help": x is a percent of the
// visible width from the centre, y a percent of the scene height (up is positive),
// height a percent of the scene height. "mobile" holds the phone placement.

// Phone and desktop stages (used only to keep wide sprites from overflowing).
const PHONE = { width: 375, sceneH: 812 * 1.1 }
const DESKTOP = { width: 1280, sceneH: 800 * 1.1 }
const aspect = (image) => art[image].width / art[image].height
/** Largest height (percent) at which a sprite stays under `share` of the screen width. */
const capHeight = (image, stage, share) => (share * stage.width * 100) / (stage.sceneH * aspect(image))

const round = (v) => Math.round(v * 10) / 10

function sprite(image, o = {}) {
  if (!art[image]) throw new Error(`No art called ${image}`)
  const { m, ...rest } = o
  const layer = { type: 'sprite', image, ...rest }
  if (layer.height) layer.height = round(Math.min(layer.height, capHeight(image, DESKTOP, 0.46)))
  if (m) {
    const mobile = { ...m }
    if (mobile.height) mobile.height = round(Math.min(mobile.height, capHeight(image, PHONE, 0.66)))
    layer.mobile = mobile
  }
  return layer
}

// Kit and Echo standing on the ground. Echo is knee-high to Kit and stands beside them.
const KIT_SPOT = {
  left: { x: -30, y: -34, height: 36, z: 26, m: { x: -25, y: -34, height: 23 } },
  right: { x: 30, y: -34, height: 36, z: 26, m: { x: 25, y: -34, height: 23 } },
}
const ECHO_SPOT = {
  left: { x: -17, y: -35, height: 11, z: 27, m: { x: -6, y: -35.5, height: 7.5 } },
  right: { x: 17, y: -35, height: 11, z: 27, m: { x: 6, y: -35.5, height: 7.5 } },
}
const mergeSpot = (spot, o = {}) => ({ ...spot, ...o, m: { ...spot.m, ...(o.m ?? {}) } })
const kit = (image, side = 'left', o = {}) => sprite(image, { anim: 'boil', ...mergeSpot(KIT_SPOT[side], o) })
const echo = (image, side = 'left', o = {}) => sprite(image, { anim: 'bob', ...mergeSpot(ECHO_SPOT[side], o) })

// In space Kit and Echo float, glowing visitors in their helmets (no shadow).
const KIT_FLOAT = { x: -31, y: -22, height: 30, z: 26, m: { x: -24, y: -22, height: 19 } }
const ECHO_FLOAT = { x: -17, y: -28, height: 10, z: 27, m: { x: -7, y: -27, height: 7 } }
const kitFloat = (o = {}) => sprite('kit_helmet_idle', { anim: 'float', anchor: 'center', ...mergeSpot(KIT_FLOAT, o) })
const echoFloat = (image = 'echo_curious', o = {}) => sprite(image, { anim: 'float', anchor: 'center', ...mergeSpot(ECHO_FLOAT, o) })

// Hardware standing in the middle ground, bigger than Kit.
const hardware = (image, o = {}) =>
  sprite(image, { x: 16, y: -16, height: 40, z: 16, anim: 'boil', ...o, m: { x: 14, y: -13, height: 26, ...(o.m ?? {}) } })
// Things in space: centred on x/y, drifting.
const floating = (image, o = {}) =>
  sprite(image, { x: 12, y: 4, height: 30, z: 18, anim: 'float', anchor: 'center', ...o, m: { x: 8, y: 2, height: 20, ...(o.m ?? {}) } })

// Backgrounds. bg_moon_plain has an Earth painted in: on wide screens the Earth sprite
// sits exactly on top of it ("pin": "bg"); on phones the crop moves so the painted one
// is out of view and the sprite sits low in clear sky, just above the horizon and below
// the words. The two never double up.
const bg = (image, o = {}) => ({ type: 'bg', image, ...o })
const moonPlain = () => [
  bg('bg_moon_plain', { mobile: { focusX: 0.4 } }),
  sprite('earth', { pin: 'bg', x: 22.25, y: 28.3, height: 14.8, z: 4, anim: 'none', anchor: 'center', keepClear: true, m: { pin: 'screen', x: 32, y: 8, height: 6 } }),
]
// Viking's lowest point is its arm reaching forward to the soil; the shadow sits under
// its footpads instead.
const VIKING_SHADOW = { shadowLift: 0.15, shadowHeight: 0.26, shadowWidth: 0.9 }
const hilltop = () => bg('bg_hilltop_night', { mobile: { focusX: 0.66 } })
// On bg_moon_plain the painted Earth is right of centre and high up, so hardware stands
// on the LEFT there and Kit and Echo on the right: tall masts never reach the Earth.

// The opening scene: the cover AND prologue-1 use exactly this, so pressing Begin only
// fades the words away and the story starts in the same scene (no cut). Kit and Echo
// stand small on the hill; the dish sends out a faint signal ring every ~6 s.
const OPENING = {
  sceneKey: 'opening',
  pushIn: 1.05,
  ambient: { stars: 18, rings: { x: 22.5, y: 20, every: 6, size: 0.42 }, shootingStars: 11 },
  layers: () => [
    bg('bg_hilltop_night', { brightness: 1.12, mobile: { focusX: 0.66 } }),
    kit('kit_idle', 'left', { x: -24, y: -33, height: 28, main: true, m: { x: -20, y: -33, height: 17 } }),
    echo('echo_curious', 'left', { x: -13, y: -34, height: 9, m: { x: -2, y: -34, height: 6.5 } }),
  ],
}
const opening = () => ({ sceneKey: OPENING.sceneKey, pushIn: OPENING.pushIn, ambient: OPENING.ambient, layers: OPENING.layers() })

// ---------- text helpers ----------

const spark = (text) => ({ text, style: 'spark' })
const told = (text, speaker) =>
  speaker ? { text, style: 'speech', tail: 'none', speaker, delay: 1.2 } : { text, style: 'narration', delay: 1.2 }
const voyager = (text, delay = 1.2) => ({
  text,
  style: 'voyager',
  speaker: 'Voyager 1',
  delay,
  emote: ['dots1', 'dots2', 'dots3'],
  emoteSpeed: 450,
})
const voyagerSignoff = (text) => voyager(text, 3.2)

// ---------- the book ----------

const PARTS = {
  prologue: { title: 'Prologue', subtitle: 'The Faint Signal' },
  moon: { title: 'Chapter 1: The Moon', subtitle: 'The Ones Who Proved It Was Possible' },
  mars1: { title: 'Chapter 2: Mars', subtitle: 'The First Visitors' },
  mars2: { title: 'Chapter 3: Mars', subtitle: 'The Long Drivers' },
  small: { title: 'Chapter 4: Small Worlds', subtitle: 'Small Worlds, Big Firsts' },
  beyond: { title: 'Chapter 5: Beyond', subtitle: 'Eyes on the Stars' },
  finale: { title: 'Finale', subtitle: 'One Light-Day' },
}

const spreads = [
  // ===== Prologue: The Faint Signal =====
  {
    id: 'prologue-1',
    script: 'P.1',
    part: 'prologue',
    alt: 'A grassy hilltop at night. A giant radio dish points at the stars. Kit stands below it with a flashlight; Echo rolls beside them.',
    ...opening(),
    bubbles: [
      spark("It's your first night as a Signal Keeper."),
      told("The big dish listens to the sky. Most nights it hears only a soft hiss. Tonight, Echo's antenna starts to blink."),
    ],
  },
  {
    id: 'prologue-2',
    script: 'P.2',
    alt: 'Inside the cozy control hut. A round crayon screen shows wild, fuzzy static.',
    tap: 'Turn the big dial until the static smooths into a clear wave. Echo spins happily.',
    layers: [
      bg('bg_control_hut', { mobile: { focusX: 0.42 } }),
      kit('kit_surprised', 'right', { x: 28, y: -42, height: 44, main: true, m: { x: 24, y: -38, height: 24 } }),
      echo('echo_excited', 'right', { x: 14, y: -40, height: 12, m: { x: 4, y: -40, height: 8 } }),
    ],
    bubbles: [
      spark('Beep… beep… Someone is calling.'),
      told("The signal is faint, but it's real. It comes from Voyager 1, the farthest machine people have ever built."),
    ],
  },
  {
    id: 'prologue-3',
    script: 'P.3',
    alt: 'Deep space. Voyager 1 glides past, with the Sun as a tiny bright star behind it. Rings of signal ripple toward a faraway Earth.',
    next: 'hub',
    layers: [
      bg('bg_deep_space'),
      floating('voyager', { x: -4, y: 2, height: 36, z: 20, main: true, speaking: true, m: { x: 0, y: -8, height: 22 } }),
      sprite('earth', { x: 38, y: -20, height: 6, z: 6, anim: 'none', anchor: 'center', m: { x: 32, y: -32, height: 5 } }),
    ],
    bubbles: [
      spark('Hello, Keeper.'),
      voyager(
        // {voyagerHome} changes on November 18, 2026 (src/lightDay.js): "almost" before, "more than" after.
        "I am {voyagerHome}. Before you answer me, visit my friends. They went first. Wake their memories, and you'll understand why I'm still out here.",
      ),
    ],
  },

  // ===== Chapter 1: The Moon =====
  {
    id: 'moon-1',
    script: '1.1',
    part: 'moon',
    alt: 'A gray, dusty plain under a black sky. Earth hangs blue and white above the horizon. Kit and Echo appear in a shimmer of signal light, wearing little bubble helmets.',
    layers: [...moonPlain(), hardware('surveyor3', { x: -20, y: -12, height: 40, z: 14, shadowWidth: 1, shadowHeight: 0.36, shadowLift: 0.06, m: { x: -18, y: -10, height: 22 } }), kit('kit_helmet_walk', 'right', { main: true, flip: true }), echo('echo_curious', 'right', { flip: true })],
    bubbles: [
      spark('Welcome to the Moon. No air. No sound. Lots of dust.'),
      told('Long before people walked here, robots came first. One of them is standing right over there.'),
    ],
  },
  {
    id: 'moon-2',
    script: '1.2',
    alt: 'A memory flashback. Surveyor 3 drops toward the ground on its three legs, its engine still firing.',
    tap: 'Press "Engine off!" to start the landing and watch it bounce.',
    missionLog: ['Landed April 20, 1967.', 'Bounced to about 10 m, then 3 m, then settled.'],
    layers: [...moonPlain(), floating('surveyor3_engine_on', { x: -16, y: 0, height: 40, anim: 'bob', main: true, speaking: true, m: { x: -14, y: -4, height: 24 } }), kit('kit_helmet_idle', 'right'), echo('echo_curious', 'right', { flip: true })],
    bubbles: [
      spark('I bounced twice before I settled.'),
      told("My job was to check whether the Moon's ground could hold a spaceship. My engine didn't shut off in time, so I hopped across the dust.", 'Surveyor 3'),
    ],
  },
  {
    id: 'moon-3',
    script: '1.3',
    alt: "Close-up of Surveyor's scoop arm over the soil.",
    tap: 'Drag the scoop to dig a trench.',
    missionLog: ['Sent 6,326 TV pictures.', 'Last contact May 4, 1967.'],
    layers: [...moonPlain(), hardware('surveyor3_scoop', { x: -16, y: -30, height: 34, z: 20, main: true, speaking: true, shadowHeight: 0.22, m: { x: -12, y: -26, height: 20 } }), kit('kit_helmet_idle', 'right'), echo('echo_curious', 'right', { flip: true })],
    bubbles: [
      spark('A little scoop. A big answer.'),
      told('I dug trenches and pushed on the soil. It felt like wet sand, strong enough to hold a lunar module. People could come!', 'Surveyor 3'),
    ],
  },
  {
    id: 'moon-4',
    script: '1.4',
    alt: 'The Apollo 11 lunar module, gold foil shining, on four legs in the Sea of Tranquility. Its top half lifts off; the bottom half stays behind.',
    layers: [
      ...moonPlain(),
      hardware('lm_descent_stage', { x: -16, y: -16, height: 30, main: true, speaking: true, m: { x: -12, y: -13, height: 18 } }),
      // The top half, just blasted off, rising (kept clear of the Earth).
      floating('lm_ascent_stage', { x: -6, y: 24, height: 16, z: 12, m: { x: -16, y: 12, height: 10 } }),
      kit('kit_helmet_idle', 'right'),
      echo('echo_excited', 'right'),
    ],
    bubbles: [
      spark('Half of me flew home. Half stayed as a launch pad.'),
      told("In July 1969, two astronauts landed in me. When they left, my top half blasted off from my back. I've stood here ever since.", 'Eagle'),
    ],
  },
  {
    id: 'moon-5',
    script: '1.5',
    alt: 'The laser reflector, a small panel of mirrors, sitting on the gray ground. Earth shines above.',
    tap: 'Fire a laser from Earth. The beam travels to the Moon, bounces, and comes back about 2.5 seconds later. A counter ticks.',
    badge: 'Still useful',
    layers: [...moonPlain(), hardware('laser_reflector', { x: -14, y: -24, height: 24, z: 18, main: true, speaking: true, m: { x: -12, y: -20, height: 14 } }), kit('kit_helmet_idle', 'right'), echo('echo_curious', 'right', { flip: true })],
    bubbles: [
      spark("I'm a mirror that scientists still use."),
      told(
        "People on Earth still shine lasers at my mirrors and time the bounce. That's how they know the Moon drifts about 3.8 cm farther away every year, as fast as your fingernails grow.",
        'Laser reflector',
      ),
    ],
  },
  {
    id: 'moon-6',
    script: '1.6',
    alt: 'Apollo 12 has landed. Two astronauts walk toward the old, dusty Surveyor 3. The astronauts wave; Surveyor glows warmly.',
    layers: [
      ...moonPlain(),
      hardware('surveyor3', { x: -22, y: -16, height: 40, main: true, speaking: true, shadowWidth: 1, shadowHeight: 0.36, shadowLift: 0.06, m: { x: -16, y: -14, height: 22 } }),
      sprite('astronaut_walk', { x: 12, y: -30, height: 40, z: 22, anim: 'boil', flip: true, m: { x: 10, y: -30, height: 23 } }),
      sprite('astronaut_wave', { x: 30, y: -32, height: 40, z: 23, anim: 'boil', flip: true, m: { x: 30, y: -33, height: 23 } }),
    ],
    bubbles: [
      spark('Two years later, I had visitors!'),
      told('In 1969, Apollo 12 landed about 180 meters from me. The astronauts took pieces of me home, so scientists could see how I survived on the Moon.', 'Surveyor 3'),
    ],
  },
  {
    id: 'moon-7',
    script: '1.7',
    alt: 'The Apollo 12 science station: a central box, a seismometer, and a finned nuclear battery, connected by cables.',
    tap: 'Drop the empty ascent stage far away. A seismograph line wiggles… and keeps wiggling.',
    layers: [
      ...moonPlain(),
      hardware('alsep_station', { x: -14, y: -20, height: 30, z: 17, main: true, speaking: true, m: { x: -12, y: -17, height: 18 } }),
      // The empty ascent stage, far away, about to crash.
      floating('lm_ascent_stage', { x: -36, y: 14, height: 10, z: 10, m: { x: -30, y: 12, height: 7 } }),
      kit('kit_helmet_idle', 'right'),
      echo('echo_curious', 'right', { flip: true }),
    ],
    bubbles: [
      spark('Listen… the Moon is ringing.'),
      told('The crew crashed their empty ascent stage into the Moon on purpose, and I felt it shake. It was the first recorded artificial moonquake.', 'Science station'),
    ],
  },
  {
    id: 'moon-8',
    script: '1.8',
    alt: 'The Apollo 15 Lunar Roving Vehicle near tall, rounded mountains.',
    // bg_moon_mountains has an Earth painted in that peeked out above the words; this
    // variant has it painted out (made by scripts/prepare-art.mjs).
    layers: [bg('bg_moon_mountains_noearth'), hardware('lrv', { x: 16, y: -18, height: 34, main: true, speaking: true, m: { x: 14, y: -15, height: 20 } }), kit('kit_helmet_idle'), echo('echo_happy')],
    bubbles: [
      spark("I'm a car parked on the Moon. Forever."),
      told('I rode folded up inside the lander. On Apollo 15, the astronauts drove me to explore far from their landing site. Together they covered 27.9 km.', 'Lunar rover'),
    ],
  },
  {
    id: 'moon-9',
    script: '1.9',
    quiet: true,
    alt: 'A wide view of the quiet Moon: the lander base, the rover and the mirrors, all still. Earth over the horizon. Echo sits down, a little sad.',
    onEnter: { set: { moon: true } },
    next: 'hub',
    layers: [
      ...moonPlain(),
      hardware('lm_descent_stage', { x: -22, y: -8, height: 22, z: 12, m: { x: -26, y: -8, height: 12 } }),
      hardware('lrv', { x: 26, y: -10, height: 22, z: 13, m: { x: 26, y: -10, height: 12 } }),
      hardware('laser_reflector', { x: 4, y: -14, height: 13, z: 14, m: { x: 0, y: -13, height: 8 } }),
      kit('kit_helmet_idle', 'right', { x: 16, y: -36, main: true, m: { x: 18, y: -36, height: 21 } }),
      echo('echo_sad', 'right', { x: 4, y: -37, m: { x: -6, y: -37.5, height: 7 } }),
    ],
    bubbles: [
      spark("The Moon is quiet now. But we're still here."),
      told('On September 30, 1977, the science stations were switched off. Footprints, wheels and mirrors still wait under the black sky.'),
      voyagerSignoff('They proved we could land. Now watch where that led.'),
    ],
  },

  // ===== Chapter 2: Mars, "The First Visitors" =====
  {
    id: 'mars1-1',
    script: '2.1',
    part: 'mars1',
    alt: 'A rocky orange plain under a butterscotch sky. Kit and Echo shimmer in.',
    layers: [bg('bg_mars_plain'), kit('kit_helmet_walk', 'left', { main: true }), echo('echo_curious')],
    bubbles: [spark('Mars is red, dusty, and very cold.'), told('Reaching Mars takes months. And landing is the hardest part of all.')],
  },
  {
    id: 'mars1-2',
    script: '2.2',
    alt: 'The Viking 1 lander on its three legs, its camera turned toward its own footpad.',
    layers: [bg('bg_mars_plain'), hardware('viking_lander', { ...VIKING_SHADOW, main: true, speaking: true }), kit('kit_helmet_idle'), echo('echo_curious')],
    bubbles: [
      spark('I took the first picture ever on Mars.'),
      told('I landed on July 20, 1976. Minutes later, I sent home a picture of the rocky ground beside my foot.', 'Viking 1'),
    ],
  },
  {
    id: 'mars1-3',
    script: '2.3',
    alt: "Viking's long arm reaching for the soil.",
    tap: "Scoop soil and drop it into Viking's tiny onboard lab. Bubbles and sparkles puzzle everyone.",
    missionLog: ['Sent weather reports for years.', 'A wrong command from Earth cut contact in November 1982.'],
    layers: [bg('bg_mars_plain'), hardware('viking_lander', { ...VIKING_SHADOW, x: 10, y: -24, height: 48, z: 18, main: true, speaking: true, m: { x: 12, y: -18, height: 30 } }), kit('kit_helmet_idle', 'left', { x: -33 }), echo('echo_curious', 'left', { x: -20 })],
    bubbles: [
      spark('Is anything alive in here?'),
      told('Some of my tests looked a bit like life. Another test found no carbon-based chemicals at all. Scientists still argue about what it meant.', 'Viking 1'),
    ],
  },
  {
    id: 'mars1-4',
    script: '2.4',
    alt: 'Sky view. A giant cluster of airbags falls toward a rocky valley.',
    tap: 'Release the airbags, then watch them bounce about 15 times and roll to a stop.',
    layers: [bg('bg_mars_valley'), floating('pathfinder_airbags', { x: 16, y: 14, height: 36, main: true, speaking: true, m: { x: 18, y: -4, height: 16 } }), kit('kit_helmet_idle'), echo('echo_excited')],
    bubbles: [
      spark('I landed inside a giant bouncy ball!'),
      told('In July 1997, my lander fell wrapped in huge airbags. We bounced as high as 15 meters before rolling to a stop.', 'Sojourner'),
    ],
  },
  {
    id: 'mars1-5',
    script: '2.5',
    alt: 'The Pathfinder lander open like a flower. Little six-wheeled Sojourner rolls down its ramp onto Mars.',
    missionLog: ['The lander is now called the Carl Sagan Memorial Station.', 'The last data came on September 27, 1997.'],
    layers: [
      bg('bg_mars_valley'),
      hardware('pathfinder_open', { x: 16, y: -14, height: 40, z: 14, m: { x: 4, y: -12, height: 25 } }),
      // At the foot of the ramp, which ends at the lander's lower right.
      sprite('sojourner', { on: { sprite: 'pathfinder_open', x: 0.98, y: -0.02 }, height: 11, z: 15, anim: 'boil', main: true, speaking: true, m: { height: 7 } }),
      kit('kit_helmet_walk', 'left', { x: -28 }),
      echo('echo_happy', 'left', { x: -13 }),
    ],
    bubbles: [
      spark("I'm only 30 cm tall, but I was first!"),
      told('I was the first rover on Mars. I drove up to rocks to study them. Rounded pebbles showed that water once rushed through this valley.', 'Sojourner'),
    ],
  },
  {
    id: 'mars1-6',
    script: '2.6',
    alt: 'A flat, frosty plain near the north pole, cracked into big polygon shapes. The Phoenix lander with its two round solar panels.',
    tap: 'Dig a trench with Phoenix\'s arm. White bits appear. Then a time-lapse runs "Day 1… Day 4" as the white bits vanish.',
    layers: [bg('bg_mars_arctic'), hardware('phoenix', { x: 14, height: 36, main: true, speaking: true }), kit('kit_helmet_idle'), echo('echo_curious')],
    bubbles: [
      spark("Now you see it… now you don't!"),
      told(
        'I landed near the north pole on May 25, 2008. I dug a trench and found white bits. Four days later they were gone. They were ice, turning straight into vapor in the thin, dry air!',
        'Phoenix',
      ),
    ],
  },
  {
    id: 'mars1-7',
    script: '2.7',
    quiet: true,
    alt: "The frosty plain at dusk. Frost creeps over Phoenix's panels. Echo pulls its arms in, cold.",
    onEnter: { set: { mars1: true } },
    next: 'hub',
    layers: [
      bg('bg_mars_arctic'),
      hardware('phoenix', { x: 14, height: 36, main: true, speaking: true, m: { x: 14, y: -9, height: 22 } }),
      // avoid: bubbles never cover Kit on this page (the Voyager panel used to sit on the helmet)
      kit('kit_helmet_idle', 'left', { avoid: true, m: { x: -24, y: -37, height: 21 } }),
      echo('echo_sad', 'left', { m: { x: -6, y: -37.5 } }),
    ],
    bubbles: [
      spark('Winter came, and the Sun went away.'),
      told('I was built for one summer. In November 2008, the long winter came and my solar panels stopped, just as planned.', 'Phoenix'),
      // Narrower and on the right, so it fits beside Kit on phones.
      { ...voyagerSignoff('They were the first visitors. Each one made the next one possible.'), side: 'right', width: 210 },
    ],
  },

  // ===== Chapter 3: Mars, "The Long Drivers" =====
  {
    id: 'mars2-1',
    script: '3.1',
    part: 'mars2',
    alt: 'The twins: Spirit in a crater on one side, Opportunity on the other side of Mars. Both rovers raise their camera masts and look around.',
    // A split page: Spirit in its crater on the left, Opportunity on the flat plain on
    // the right, with a soft crayon line between them.
    layers: [
      bg('bg_mars_crater', { half: 'left', focusX: 0.45 }),
      bg('bg_mars_meridiani', { half: 'right', focusX: 0.4 }),
      hardware('mer_rover', { x: -25, y: -15, height: 30, z: 14, main: true, m: { x: -25, y: -14, height: 14 } }),
      hardware('mer_rover', { x: 25, y: -15, height: 30, z: 14, flip: true, avoid: true, m: { x: 25, y: -14, height: 14 } }),
      kit('kit_helmet_idle', 'left', { x: -36, y: -38, height: 26, m: { x: -36, y: -38, height: 15 } }),
      echo('echo_curious', 'right', { x: 36, y: -38, height: 9, flip: true, m: { x: 36, y: -38.5, height: 6 } }),
    ],
    bubbles: [
      spark('We were twins, sent to opposite sides of Mars.'),
      told('Spirit landed on January 3, 2004, and Opportunity three weeks later. They were built for about 90 days. Their mission: find clues about water from long ago.'),
    ],
  },
  {
    id: 'mars2-2',
    script: '3.2',
    alt: 'Opportunity on a dusty plain, its solar panels covered in a layer of dust. A swirling dust devil dances in the distance.',
    tap: 'Steer Opportunity under the passing dust devil. The dust blows off and the panels sparkle.',
    layers: [bg('bg_mars_meridiani'), hardware('mer_rover', { x: -12, y: -18, height: 36, main: true, speaking: true, m: { x: -10, y: -14, height: 20 } }), kit('kit_helmet_idle', 'right'), echo('echo_curious', 'right')],
    bubbles: [
      spark('Dusty panels? Catch the wind!'),
      told('Dust slowly covered my solar panels, and my power dropped. But sometimes Martian winds swept them clean, and I woke up with fresh energy.', 'Opportunity'),
    ],
  },
  {
    id: 'mars2-3',
    script: '3.3',
    alt: 'A close-up of layered rock dotted with tiny round pebbles.',
    layers: [bg('bg_mars_rock_closeup'), kit('kit_helmet_idle', 'right', { y: -36, height: 30, main: true, m: { y: -37, height: 20 } }), echo('echo_curious', 'right', { x: 18, y: -37, height: 10, m: { x: 8, y: -38, height: 7 } })],
    bubbles: [spark('The rocks remembered water.'), told('The twins found rocks that could only form where water stayed for a long time. Long ago, Mars was a wetter world.')],
  },
  {
    id: 'mars2-4',
    script: '3.4',
    alt: 'Spirit with its wheels sunk in soft, pale sand.',
    layers: [bg('bg_mars_crater'), hardware('mer_stuck', { x: 6, y: -14, height: 36, main: true, m: { x: 8, y: -12, height: 20 } }), kit('kit_helmet_idle', 'left', { x: -32 }), echo('echo_sad', 'left', { x: -19 })],
    bubbles: [
      spark("Spirit's wheels got stuck."),
      told('After driving 7.7 km, Spirit sank into soft sand. It kept studying the ground right where it stood, until its mission ended in 2010.'),
    ],
  },
  {
    id: 'mars2-5',
    script: '3.5',
    alt: 'InSight on a flat, smooth plain with two round solar panels. Its arm sets a dome-covered seismometer on the ground.',
    tap: 'Listen to the seismograph line and tap when a marsquake wiggle appears.',
    layers: [bg('bg_jezero'), hardware('insight', { x: 14, height: 34, main: true, speaking: true }), kit('kit_helmet_idle'), echo('echo_curious')],
    bubbles: [
      spark('I listened to the heartbeat of Mars.'),
      told('I landed in November 2018. My robot arm placed a super-sensitive seismometer on the ground. Then I listened, very carefully.', 'InSight'),
    ],
  },
  {
    id: 'mars2-6',
    script: '3.6',
    alt: 'InSight listening to Mars. Quake waves ripple through the planet and light up its crust, mantle and core.',
    layers: [bg('bg_jezero'), hardware('insight', { x: 14, height: 34, main: true, speaking: true }), kit('kit_helmet_idle'), echo('echo_excited')],
    bubbles: [
      spark('Quakes showed what hides inside Mars.'),
      told('Marsquake waves traveled through the planet and showed scientists its crust, mantle and core. Slowly, dust covered my panels. My mission ended in December 2022.', 'InSight'),
    ],
  },
  {
    id: 'mars2-7',
    script: '3.7',
    alt: 'Jezero Crater. The tiny Ingenuity helicopter with its two stacked rotors, and the Perseverance rover watching nearby.',
    tap: 'Hold to lift off, hover in the glowing band, then land on the flat spot.',
    missionLog: ['Flew 17 km in total and reached 24 m high.', 'A rotor was damaged on its last flight on January 18, 2024.', 'It now stands still on Mars.'],
    layers: [
      bg('bg_jezero'),
      hardware('perseverance', { x: 24, y: -14, height: 36, z: 14, m: { x: 22, y: -11, height: 18 } }),
      hardware('ingenuity', { x: 0, y: -22, height: 13, z: 18, main: true, speaking: true, m: { x: 2, y: -20, height: 9 } }),
      kit('kit_helmet_idle', 'left', { x: -32 }),
      echo('echo_excited', 'left', { x: -19 }),
    ],
    bubbles: [
      spark('They said five flights. I flew seventy-two.'),
      told("I rode to Mars under Perseverance's belly. On April 19, 2021, I made the first powered flight on another planet, in air less than 1% as thick as Earth's.", 'Ingenuity'),
    ],
  },
  {
    id: 'mars2-8',
    script: '3.8',
    quiet: true,
    alt: 'Opportunity alone on a wide plain as a planet-wide dust storm rolls in and the sky turns to a thick brown haze. Echo moves close to Kit.',
    layers: [bg('bg_mars_meridiani'), hardware('mer_rover', { x: 8, y: -16, height: 32, main: true, m: { x: 12, y: -13, height: 18 } }), kit('kit_helmet_idle', 'left', { x: -30 }), echo('echo_sad', 'left', { x: -21, m: { x: -12 } })],
    bubbles: [
      spark('Opportunity, the other twin, kept driving. Then came the storm.'),
      told('For almost 15 years, Opportunity rolled on, 45.16 km in all. In 2018, a dust storm wrapped the whole planet. Its last signal came on June 10, 2018.'),
    ],
  },
  {
    id: 'mars2-9',
    script: '3.9',
    alt: 'The Perseverance rover rolls past a small marker post for the old record of 45.16 km. Sparkles burst softly; Echo cheers.',
    onEnter: { set: { mars2: true } },
    next: 'hub',
    layers: [bg('bg_jezero'), hardware('perseverance', { x: 14, height: 40, main: true }), kit('kit_helmet_idle'), echo('echo_happy')],
    bubbles: [
      spark('A new rover passes the old record.'),
      told('On October 11, 2026, Perseverance drove farther than Opportunity ever had. The old record was finally broken.'),
      voyagerSignoff("Records are made to be passed. That's how explorers say thank you."),
    ],
  },

  // ===== Chapter 4: Small Worlds, "Small Worlds, Big Firsts" =====
  {
    id: 'small-1',
    script: '4.1',
    part: 'small',
    alt: 'A starry space scene with tumbling rocky shapes. A long, peanut-shaped asteroid, Eros, turns slowly in the foreground.',
    layers: [
      bg('bg_space_stars'),
      floating('eros', { x: 14, y: 2, height: 26, z: 18, anim: 'spin', main: true, m: { x: 6, y: -4, height: 13 } }),
      floating('vesta', { x: -38, y: 18, height: 10, z: 8, anim: 'spin', m: { x: -30, y: 4, height: 6 } }),
      floating('ceres', { x: 38, y: -26, height: 9, z: 8, anim: 'spin', m: { x: 32, y: -20, height: 6 } }),
      kitFloat(),
      echoFloat(),
    ],
    bubbles: [
      spark('Out here, the worlds are small and lumpy.'),
      told('Some small worlds wander near Earth. Others crowd together in a belt between Mars and Jupiter. Two brave explorers visited them.'),
    ],
  },
  {
    id: 'small-2',
    script: '4.2',
    alt: "The NEAR Shoemaker spacecraft (an eight-sided body with four solar panels and a dish) floating above Eros' cratered surface.",
    tap: 'Give gentle little pushes to slow NEAR down and touch down softly. A speed meter shows walking speed.',
    layers: [bg('bg_eros_surface'), floating('near_shoemaker', { x: 14, y: 12, height: 26, main: true, speaking: true, m: { x: 10, y: 4, height: 15 } }), kit('kit_helmet_idle'), echo('echo_curious')],
    bubbles: [
      spark('Nobody built me to land. I landed anyway.'),
      told('I was the first spacecraft to orbit an asteroid. At the end of my mission, on February 12, 2001, my team lowered me gently onto Eros, about as fast as you walk.', 'NEAR'),
    ],
  },
  {
    id: 'small-3',
    script: '4.3',
    alt: 'NEAR resting on the dusty surface of Eros, one solar panel tipped up toward the Sun. Tiny signal rings pulse from its dish, then slow and stop.',
    missionLog: ['Last contact February 28, 2001.', 'Renamed in honor of geologist Eugene Shoemaker.'],
    layers: [bg('bg_eros_surface'), hardware('near_shoemaker', { x: 14, y: -16, height: 26, rotate: -12, main: true, speaking: true, m: { x: 12, y: -13, height: 15 } }), kit('kit_helmet_idle'), echo('echo_curious')],
    bubbles: [
      spark('Still talking, from the surface of an asteroid!'),
      told("I wasn't built to survive landing, but I did, and I kept sending data for about two weeks. In all, I took 160,000 pictures. Then the deep cold, about −173 °C, quieted me.", 'NEAR'),
    ],
  },
  {
    id: 'small-4',
    script: '4.4',
    alt: 'The Dawn spacecraft with its very long solar-panel wings and a soft blue glow from its ion engine, between the asteroid Vesta and the dwarf planet Ceres.',
    tap: 'Hold a gentle, steady push for a while. A dotted path slowly curls from Vesta toward Ceres.',
    missionLog: ['Orbited Vesta 2011–2012 and arrived at Ceres in early 2015.', 'The first mission to orbit two bodies besides Earth and the Moon.'],
    layers: [
      bg('bg_space_stars'),
      floating('vesta', { x: -12, y: 24, height: 12, z: 10, anim: 'spin', m: { x: -22, y: 26, height: 8 } }),
      floating('ceres', { x: 38, y: -20, height: 14, z: 10, anim: 'spin', m: { x: 30, y: -18, height: 9 } }),
      floating('dawn', { x: 10, y: 4, height: 30, main: true, speaking: true, m: { x: 6, y: 4, height: 16 } }),
      kitFloat(),
      echoFloat(),
    ],
    bubbles: [
      spark('I visited two worlds and stayed with both.'),
      told('My ion engine gave the gentlest push, like a breath. But it kept pushing for weeks at a time. That let me orbit the giant asteroid Vesta, then fly on to the dwarf planet Ceres.', 'Dawn'),
    ],
  },
  {
    id: 'small-5',
    script: '4.5',
    alt: 'Dark gray Ceres with glittering white spots inside a large crater, Occator.',
    layers: [
      bg('bg_space_stars'),
      floating('ceres', { x: 14, y: 0, height: 50, z: 12, anim: 'spin', main: true, m: { x: 6, y: -4, height: 28 } }),
      floating('dawn', { x: -14, y: 24, height: 12, z: 20, speaking: true, m: { x: 28, y: 13, height: 8 } }),
      kitFloat(),
      echoFloat('echo_excited'),
    ],
    bubbles: [
      spark('What were those bright spots?'),
      told('Ceres had shining spots inside a crater. They turned out to be salt, left behind when salty ice from below turned to vapor.', 'Dawn'),
    ],
  },
  {
    id: 'small-6',
    script: '4.6',
    quiet: true,
    alt: 'Dawn as a small silhouette circling Ceres, its wings catching faint sunlight.',
    onEnter: { set: { small: true } },
    next: 'hub',
    layers: [
      bg('bg_space_stars'),
      floating('ceres', { x: 6, y: -2, height: 40, z: 12, anim: 'spin', m: { x: 4, y: -6, height: 24 } }),
      floating('dawn', { x: 28, y: 16, height: 11, z: 18, main: true, speaking: true, m: { x: 26, y: 14, height: 8 } }),
      kitFloat(),
      echoFloat('echo_sad'),
    ],
    bubbles: [
      spark('Out of fuel, but still circling.'),
      told('In 2018, I ran out of the fuel I used to point myself. I still circle Ceres today, quietly.', 'Dawn'),
      voyagerSignoff('Small worlds. Big firsts. Keep going, Keeper.'),
    ],
  },

  // ===== Chapter 5: Beyond, "Eyes on the Stars" =====
  {
    id: 'beyond-1',
    script: '5.1',
    part: 'beyond',
    alt: 'The Kepler telescope (a tube with a slanted sunshade and a solar panel) drifting in space, staring at a rich star field. Earth is a small blue dot ahead of it.',
    tap: "Watch one star's brightness line and tap each time it dips. Each dip reveals a tiny planet passing in front of the star.",
    layers: [
      bg('bg_space_stars'),
      floating('kepler', { x: 10, y: 2, height: 34, main: true, speaking: true, m: { x: 8, y: 0, height: 20 } }),
      sprite('earth', { x: 36, y: 24, height: 5, z: 6, anim: 'none', anchor: 'center', m: { x: 32, y: 20, height: 4 } }),
      kitFloat(),
      echoFloat(),
    ],
    bubbles: [
      spark('I found planets by watching stars dim.'),
      told('I launched in 2009 and stared at one patch of sky. When a star dimmed just a tiny bit, it meant a planet was passing in front of it.', 'Kepler'),
    ],
  },
  {
    id: 'beyond-2',
    script: '5.2',
    alt: 'Kepler wobbling, with arrows of sunlight pushing on it until it holds steady. A small kayak doodle in the corner shows the idea.',
    layers: [
      bg('bg_space_stars'),
      floating('kepler', { x: 8, y: 2, height: 34, rotate: -14, main: true, speaking: true, m: { x: 6, y: 0, height: 20 } }),
      sprite('kayak_doodle', { x: 36, y: -30, height: 10, z: 22, anim: 'boil', anchor: 'center', m: { x: 30, y: -20, height: 7 } }),
      kitFloat(),
      echoFloat(),
    ],
    bubbles: [
      spark('A broken wheel. A clever fix.'),
      told('In 2013, I lost one of the wheels that kept me pointing steady. Engineers used the gentle push of sunlight to balance me, like a kayak steering into the current. My second life was called K2.', 'Kepler'),
    ],
  },
  {
    id: 'beyond-3',
    script: '5.3',
    alt: 'The night sky filling up: around each star, a tiny planet appears, until the whole sky is full.',
    layers: [bg('bg_space_stars'), floating('kepler', { x: 14, y: 4, height: 26, main: true, speaking: true, m: { x: 10, y: 2, height: 16 } }), kitFloat(), echoFloat('echo_excited')],
    bubbles: [
      spark('More planets than stars!'),
      told('I found more than 2,600 planets and showed that there are more planets than stars in our sky. I ran out of fuel in 2018. Now I drift around the Sun, trailing behind Earth.', 'Kepler'),
    ],
  },
  {
    id: 'beyond-4',
    script: '5.4',
    alt: 'Pioneer 10 (a big dish on a small body, with long thin booms) racing past giant, stripy Jupiter. A small gold plaque glints on its side.',
    tap: 'Tap each part of the plaque to reveal what it means: the people, the Sun, the planets, the spacecraft.',
    layers: [
      bg('bg_space_stars'),
      floating('jupiter', { x: -4, y: 8, height: 46, z: 8, anim: 'none', m: { x: -6, y: 4, height: 24 } }),
      floating('pioneer', { x: 26, y: 2, height: 32, main: true, speaking: true, m: { x: 24, y: -6, height: 18 } }),
      kitFloat(),
      echoFloat(),
    ],
    bubbles: [
      spark('I carry a picture of you to the stars.'),
      told('I launched in 1972. I was the first spacecraft to cross the asteroid belt and fly past Jupiter. On my side is a plaque showing people and where Earth is.', 'Pioneer 10'),
    ],
  },
  {
    id: 'beyond-5',
    script: '5.5',
    alt: 'Pioneer 11 swinging past Saturn and its shimmering rings.',
    layers: [
      bg('bg_space_stars'),
      floating('saturn', { x: -6, y: 8, height: 30, z: 8, anim: 'none', m: { x: -4, y: 6, height: 14 } }),
      floating('pioneer', { x: 28, y: 0, height: 30, main: true, m: { x: 24, y: -8, height: 17 } }),
      kitFloat(),
      echoFloat(),
    ],
    bubbles: [spark('My twin flew to Saturn first.'), told('Pioneer 11 was the first spacecraft to fly past Saturn. It carries the same plaque, the same picture of us.')],
  },
  {
    id: 'beyond-6',
    script: '5.6',
    quiet: true,
    alt: 'Two tiny probes drifting apart into a vast, dark star field. A faint red star, Aldebaran, glows far ahead of one.',
    onEnter: { set: { beyond: true } },
    next: 'hub',
    layers: [
      bg('bg_deep_space'),
      floating('pioneer', { x: -16, y: 10, height: 15, z: 18, main: true, m: { x: -16, y: 6, height: 10 } }),
      floating('pioneer', { x: 24, y: -2, height: 12, z: 16, flip: true, avoid: true, m: { x: 22, y: -8, height: 8 } }),
      kitFloat({ x: -32, y: -26, height: 24, m: { x: -26, y: -24, height: 16 } }),
      echoFloat('echo_sad', { x: -20, y: -31, height: 8, m: { x: -10, y: -28, height: 6 } }),
    ],
    bubbles: [
      spark('Quiet now, and very far away.'),
      told("Pioneer 11 last spoke in 1995. Pioneer 10's last faint signal came on January 23, 2003, from 12.23 billion km away. In about two million years, it will pass a red star called Aldebaran."),
      voyagerSignoff("They carried your picture. Now, Keeper, it's time for my story."),
    ],
  },

  // ===== Finale: One Light-Day =====
  {
    id: 'finale-1',
    script: 'F.1',
    part: 'finale',
    alt: 'A montage page in three panels: a rocket launch, Voyager passing stripy Jupiter, then Voyager passing ringed Saturn.',
    layers: [
      bg('bg_deep_space'),
      // voyager_launch is a small rectangular picture: only ever a small panel here.
      sprite('voyager_launch', { x: -30, y: 4, height: 17, z: 14, anim: 'boil', anchor: 'center', shadow: false, m: { x: -20, y: -6, height: 10 } }),
      floating('jupiter', { x: 2, y: 10, height: 26, z: 10, anim: 'none', m: { x: 22, y: -2, height: 11 } }),
      floating('voyager', { x: 6, y: -16, height: 14, z: 18, main: true, speaking: true, m: { x: 26, y: -12, height: 8 } }),
      floating('saturn', { x: 30, y: 8, height: 16, z: 10, anim: 'none', m: { x: -4, y: -26, height: 7 } }),
      floating('voyager', { x: 34, y: -12, height: 11, z: 18, m: { x: 4, y: -34, height: 6 } }),
    ],
    bubbles: [spark('Now, my own story.'), voyager('I launched in 1977. I flew past Jupiter and Saturn. In 2012, I became the first spacecraft in interstellar space.')],
  },
  {
    id: 'finale-2',
    script: 'F.2',
    quiet: true,
    alt: 'Voyager alone in deep space, its glow soft and low. Small instrument lights on its body, most of them off.',
    layers: [bg('bg_deep_space'), floating('voyager', { x: 6, y: -2, height: 36, main: true, speaking: true, m: { x: 4, y: -10, height: 22 } })],
    bubbles: [
      spark("I'll be honest with you, Keeper."),
      voyager("My power is low. Only a couple of my instruments are still on. But I'm still out here, still sending my signal home."),
    ],
  },
  {
    id: 'finale-3',
    script: 'F.3',
    alt: 'Back on the hilltop at night. Kit types at a little console under the giant dish. Echo watches, antenna glowing.',
    next: 'finale-4',
    input: { key: 'message', to: 'finale-4', placeholder: 'Type a message for Voyager…', submit: 'Send', maxLength: 140, action: 'pulse' },
    layers: [hilltop(), kit('kit_typing', 'left', { x: -14, y: -32, height: 32, main: true, m: { x: -12, y: -27, height: 21 } }), echo('echo_excited', 'left', { x: 4, y: -33, height: 12, m: { x: 14, y: -28, height: 8.5 } })],
    bubbles: [
      spark('Now you can answer me.'),
      // {voyagerReach}: "I will reach" before November 18, 2026, "I reached" from that day (src/lightDay.js).
      voyager('On November 18, 2026, {voyagerReach} one light-day from Earth, about 25.9 billion km. Your message will take a whole day to reach me. Send me one, Keeper.'),
    ],
  },
  {
    id: 'finale-4',
    script: 'F.4',
    alt: 'Kit and Echo sitting on the hill under a sky full of stars. Small glowing markers appear across the sky for every explorer they met. Echo leans against Kit.',
    fireflies: { count: 30, radius: 80, colors: ['yellow', 'orange'] },
    next: null,
    choices: [
      { text: 'Read again', to: 'prologue-1', reset: true },
      { text: 'Credits', open: 'credits' },
    ],
    layers: [hilltop(), kit('kit_sad', 'left', { x: 14, y: -26, height: 24, main: true, m: { x: -12, y: -27, height: 16 } }), echo('echo_happy', 'left', { x: 26, y: -26, height: 11, m: { x: 4, y: -27.5, height: 8 } })],
    bubbles: [
      spark("They're quiet now. But they're still out there."),
      told('And so is the next explorer: you.'),
      // The reader's own message (from F.3), shown back to them.
      { text: '{message}', style: 'speech', tail: 'none', speaker: 'Your message', delay: 2.4, if: { flag: 'message' } },
    ],
  },
]

// ---------- tap moments and animated scenes (Phase D) ----------

// Which tap moment (src/moments/actions.jsx) each spread's "Tap" line becomes.
const TAPS = {
  'prologue-2': 'dial',
  'moon-2': 'engineOff',
  'moon-3': 'scoop',
  'moon-5': 'laser',
  'moon-7': 'ascent',
  'mars1-3': 'vikingLab',
  'mars1-4': 'airbags',
  'mars1-6': 'phoenixDig',
  'mars2-2': 'dustDevil',
  'mars2-5': 'marsquake',
  'mars2-7': 'ingenuity',
  'small-2': 'nearLand',
  'small-4': 'dawnPush',
  'beyond-1': 'dips',
  'beyond-4': 'plaque',
}

// The "made in code" animations from the script (src/SceneAnims.jsx). box: percent of
// the screen (x, y = centre, w/h = size); mobile: the phone box.
const ANIMS = {
  'mars1-2': { type: 'photo', box: { x: 45, y: 50, w: 19 }, mobile: { x: 31, y: 47, w: 42, max: 230 } },
  'mars2-6': { type: 'cutaway', box: { x: 47, y: 56, w: 20 }, mobile: { x: 32, y: 47, w: 52, max: 270 } },
  'beyond-3': { type: 'planetPops', avoid: false, box: { x: 50, y: 34, w: 96, h: 56 } },
  'finale-4': { type: 'markers', box: { x: 40, y: 51, w: 72, h: 24 }, mobile: { x: 50, y: 47, w: 90, h: 16 } },
}

function interactsFor(id, spread) {
  const list = []
  if (TAPS[id]) list.push({ id: 'tap', action: TAPS[id] })
  if (spread.missionLog) list.push({ id: 'log', label: 'Mission Log', facts: spread.missionLog })
  // F.3: Send plays the pulse along "24 hours to Voyager" before the last page.
  if (id === 'finale-3') list.push({ id: 'pulse', action: 'pulse', hidden: true })
  return list
}

// ---------- assemble ----------

const CHAPTER_FLAGS = ['moon', 'mars1', 'mars2', 'small', 'beyond']

function hub() {
  // The hub lines and choice labels are interface text from the base project.
  const choice = (label, to, flag) =>
    flag
      ? [
          { text: `${label} ✓`, to, if: { flag } },
          { text: label, to, if: { notFlag: flag } },
        ]
      : [{ text: label, to }]
  return {
    alt: 'The cozy control hut at night. The console screen glows, ready for the next memory.',
    fireflies: { count: 0 },
    layers: [bg('bg_control_hut', { mobile: { focusX: 0.42 } })],
    bubbles: [
      spark('My friends are waiting, Keeper.'),
      voyager('You have woken {counter:chapters} of my 5 memories. Where to next?', 1),
    ],
    choices: [
      ...choice('The Moon', 'moon-1', 'moon'),
      ...choice('Mars: The First Visitors', 'mars1-1', 'mars1'),
      ...choice('Mars: The Long Drivers', 'mars2-1', 'mars2'),
      ...choice('Small Worlds', 'small-1', 'small'),
      ...choice('Beyond', 'beyond-1', 'beyond'),
      ...choice('Finale: One Light-Day', 'finale-1'),
    ],
  }
}

async function main() {
  const old = JSON.parse(await readFile(STORY, 'utf8'))
  const states = {}
  spreads.forEach((s, i) => {
    const { id, part, script, ...rest } = s
    const next = s.next !== undefined ? s.next : spreads[i + 1]?.id ?? null
    const interacts = interactsFor(id, s)
    states[id] = {
      _script: script,
      ...(part ? { chapter: PARTS[part] } : {}),
      ...rest,
      ...(interacts.length ? { interacts } : {}),
      ...(ANIMS[id] ? { anim: ANIMS[id] } : {}),
      next,
    }
  })
  states.hub = hub()
  // Keep the hidden test pages (open them with ?page=<id>).
  for (const [id, st] of Object.entries(old.states)) if (st._test) states[id] = st

  if (spreads.length !== 44) throw new Error(`Expected 44 spreads, found ${spreads.length}`)
  const story = {
    title: old.title,
    subtitle: old.subtitle,
    start: 'prologue-1',
    chapters: CHAPTER_FLAGS,
    order: spreads.map((s) => s.id),
    _help: {
      ...old._help,
      source:
        'The spreads are built by scripts/build-story.mjs from docs/script.md. Edit that file and run `node scripts/build-story.mjs`; edits made here by hand are overwritten.',
      spread:
        'Spread fields: chapter { title, subtitle } (first spread of a part: shows the banner), quiet (quiet page: dimmer, slower, no fireflies, no sound effects), alt (what the picture shows, for screen readers), tap (the tap moment from the script, built in Phase D), missionLog [facts], badge, _script (spread number in docs/script.md). Bubbles without x/y flow from the top and keep clear of the main sprite. Bubble styles: spark | narration | speech | voyager | thought | shout. Sprite field speaking: true makes the explorer glow softly while it talks; rotate: degrees.',
    },
    cover: { ...opening(), alt: 'The cover: a grassy hilltop at night with a giant radio dish. Kit and Echo stand on the hill, looking up at the stars.' },
    states,
  }
  await writeFile(STORY, JSON.stringify(story, null, 2) + '\n')
  console.log(`wrote public/story.json: ${spreads.length} spreads + hub + ${Object.values(states).filter((s) => s._test).length} hidden test pages`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
