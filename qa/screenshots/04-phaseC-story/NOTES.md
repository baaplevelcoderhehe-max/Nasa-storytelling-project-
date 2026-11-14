# 04-phaseC-story

Captured 2026-11-14 22:34 UTC from http://localhost:5173/

## What changed

- public/story.json rebuilt from docs/script.md by scripts/build-story.mjs: all 44 spreads (Prologue 3, Moon 9, Mars 1 7, Mars 2 9, Small Worlds 6, Beyond 6, Finale 4), one state per spread, plus the hub. Every Spark, Story, Voyager line and Mission Log fact matches the script word for word (checked automatically: 108 matches, 0 misses).
- Bubble styles: Spark (big paper card), narration, explorer speech (speaker label, explorer glows softly while speaking), Voyager "incoming signal" panel.
- Bubbles without x/y flow from the top in reading order and never cover the page's main sprite; they avoid Kit, Echo and the Earth when there is room. scripts/check-bubbles.mjs checks every page at phone, tablet and desktop: no bubble wider than 90vw, none off-screen, none over the controls, none over the main sprite. All pass.
- Quiet pages (1.9, 2.7, 3.8, 4.6, 5.6, F.2): dimmer scene, half-speed motion, no fireflies, no sound effects.
- Chapter banner on the first spread of each part; the hub lists Moon, Mars 1, Mars 2, Small Worlds, Beyond and the Finale (always open), with a check mark once a chapter's last page is read. "You have woken N of my 5 memories."
- Progress shows the page number in the book (1-44).
- Kit and Echo appear on 40 of 44 spreads, on the ground with shadows (or floating in helmets in space). Moon pages with the painted Earth use the pin approach, and on phones the crop hides the painted Earth so it never doubles.
- The test pages are kept but hidden (only reachable with ?page=).

## Spreads

| # | State | Script | Background | Sprites (* = main) | Spark |
|---|---|---|---|---|---|
| 1 | prologue-1 | P.1 | hilltop_night | kit_idle*, echo_idle | It's your first night as a Signal Keeper. |
| 2 | prologue-2 | P.2 | control_hut | kit_surprised*, echo_excited | Beep… beep… Someone is calling. |
| 3 | prologue-3 | P.3 | deep_space | voyager*, earth | Hello, Keeper. |
| 4 | moon-1 | 1.1 | moon_plain | earth, surveyor3, kit_helmet_walk*, echo_curious | Welcome to the Moon. No air. No sound. Lots of dust. |
| 5 | moon-2 | 1.2 | moon_plain | earth, surveyor3_engine_on*, kit_helmet_idle, echo_curious | I bounced twice before I settled. |
| 6 | moon-3 | 1.3 | moon_plain | earth, surveyor3_scoop*, kit_helmet_idle, echo_curious | A little scoop. A big answer. |
| 7 | moon-4 | 1.4 | moon_plain | earth, lm_descent_stage*, lm_ascent_stage, kit_helmet_idle, echo_excited | Half of me flew home. Half stayed as a launch pad. |
| 8 | moon-5 | 1.5 | moon_plain | earth, laser_reflector*, kit_helmet_idle, echo_curious | I'm a mirror that scientists still use. |
| 9 | moon-6 | 1.6 | moon_plain | earth, surveyor3*, astronaut_walk, astronaut_wave | Two years later, I had visitors! |
| 10 | moon-7 | 1.7 | moon_plain | earth, alsep_station*, lm_ascent_stage, kit_helmet_idle, echo_curious | Listen… the Moon is ringing. |
| 11 | moon-8 | 1.8 | moon_mountains | lrv*, kit_helmet_idle, echo_happy | I'm a car parked on the Moon. Forever. |
| 12 | moon-9 (quiet) | 1.9 | moon_plain | earth, lm_descent_stage, lrv, laser_reflector, kit_helmet_idle*, echo_sad | The Moon is quiet now. But we're still here. |
| 13 | mars1-1 | 2.1 | mars_plain | kit_helmet_walk*, echo_curious | Mars is red, dusty, and very cold. |
| 14 | mars1-2 | 2.2 | mars_plain | viking_lander*, kit_helmet_idle, echo_curious | I took the first picture ever on Mars. |
| 15 | mars1-3 | 2.3 | mars_plain | viking_lander*, kit_helmet_idle, echo_curious | Is anything alive in here? |
| 16 | mars1-4 | 2.4 | mars_valley | pathfinder_airbags*, kit_helmet_idle, echo_excited | I landed inside a giant bouncy ball! |
| 17 | mars1-5 | 2.5 | mars_valley | pathfinder_open, sojourner*, kit_helmet_walk, echo_happy | I'm only 30 cm tall, but I was first! |
| 18 | mars1-6 | 2.6 | mars_arctic | phoenix*, kit_helmet_idle, echo_curious | Now you see it… now you don't! |
| 19 | mars1-7 (quiet) | 2.7 | mars_arctic | phoenix*, kit_helmet_idle, echo_sad | Winter came, and the Sun went away. |
| 20 | mars2-1 | 3.1 | mars_crater | mer_rover, mer_rover, kit_helmet_idle*, echo_curious | We were twins, sent to opposite sides of Mars. |
| 21 | mars2-2 | 3.2 | mars_meridiani | mer_rover*, kit_helmet_idle, echo_curious | Dusty panels? Catch the wind! |
| 22 | mars2-3 | 3.3 | mars_rock_closeup | kit_helmet_idle*, echo_curious | The rocks remembered water. |
| 23 | mars2-4 | 3.4 | mars_crater | mer_stuck*, kit_helmet_idle, echo_sad | Spirit's wheels got stuck. |
| 24 | mars2-5 | 3.5 | jezero | insight*, kit_helmet_idle, echo_curious | I listened to the heartbeat of Mars. |
| 25 | mars2-6 | 3.6 | jezero | insight*, kit_helmet_idle, echo_excited | Quakes showed what hides inside Mars. |
| 26 | mars2-7 | 3.7 | jezero | perseverance, ingenuity*, kit_helmet_idle, echo_excited | They said five flights. I flew seventy-two. |
| 27 | mars2-8 (quiet) | 3.8 | mars_meridiani | mer_rover*, kit_helmet_idle, echo_sad | Opportunity, the other twin, kept driving. Then came the storm. |
| 28 | mars2-9 | 3.9 | jezero | perseverance*, kit_helmet_idle, echo_happy | A new rover passes the old record. |
| 29 | small-1 | 4.1 | space_stars | eros*, vesta, ceres, kit_helmet_idle, echo_curious | Out here, the worlds are small and lumpy. |
| 30 | small-2 | 4.2 | eros_surface | near_shoemaker*, kit_helmet_idle, echo_curious | Nobody built me to land. I landed anyway. |
| 31 | small-3 | 4.3 | eros_surface | near_shoemaker*, kit_helmet_idle, echo_curious | Still talking, from the surface of an asteroid! |
| 32 | small-4 | 4.4 | space_stars | vesta, ceres, dawn*, kit_helmet_idle, echo_curious | I visited two worlds and stayed with both. |
| 33 | small-5 | 4.5 | space_stars | ceres*, dawn, kit_helmet_idle, echo_excited | What were those bright spots? |
| 34 | small-6 (quiet) | 4.6 | space_stars | ceres, dawn*, kit_helmet_idle, echo_sad | Out of fuel, but still circling. |
| 35 | beyond-1 | 5.1 | space_stars | kepler*, earth, kit_helmet_idle, echo_curious | I found planets by watching stars dim. |
| 36 | beyond-2 | 5.2 | space_stars | kepler*, kayak_doodle, kit_helmet_idle, echo_curious | A broken wheel. A clever fix. |
| 37 | beyond-3 | 5.3 | space_stars | kepler*, kit_helmet_idle, echo_excited | More planets than stars! |
| 38 | beyond-4 | 5.4 | space_stars | jupiter, pioneer*, kit_helmet_idle, echo_curious | I carry a picture of you to the stars. |
| 39 | beyond-5 | 5.5 | space_stars | saturn, pioneer*, kit_helmet_idle, echo_curious | My twin flew to Saturn first. |
| 40 | beyond-6 (quiet) | 5.6 | deep_space | pioneer*, pioneer, kit_helmet_idle, echo_sad | Quiet now, and very far away. |
| 41 | finale-1 | F.1 | deep_space | voyager_launch, jupiter, voyager*, saturn, voyager | Now, my own story. |
| 42 | finale-2 (quiet) | F.2 | deep_space | voyager* | I'll be honest with you, Keeper. |
| 43 | finale-3 | F.3 | hilltop_night | kit_typing*, echo_excited | Now you can answer me. |
| 44 | finale-4 | F.4 | hilltop_night | kit_sad*, echo_happy | They're quiet now. But they're still out there. |
| – | hub | hub | control_hut | – | My friends are waiting, Keeper. |

## Pages captured

- `title`: [sheet](sheets/title.png) · [phone](phone/title.png) · [tablet](tablet/title.png) · [desktop](desktop/title.png) · [reduced motion](reduced-motion/title.png)
- `hub`: [sheet](sheets/hub.png) · [phone](phone/hub.png) · [tablet](tablet/hub.png) · [desktop](desktop/hub.png) · [reduced motion](reduced-motion/hub.png)
- `prologue-1`: [sheet](sheets/prologue-1.png) · [phone](phone/prologue-1.png) · [tablet](tablet/prologue-1.png) · [desktop](desktop/prologue-1.png) · [reduced motion](reduced-motion/prologue-1.png)
- `prologue-2`: [sheet](sheets/prologue-2.png) · [phone](phone/prologue-2.png) · [tablet](tablet/prologue-2.png) · [desktop](desktop/prologue-2.png) · [reduced motion](reduced-motion/prologue-2.png)
- `prologue-3`: [sheet](sheets/prologue-3.png) · [phone](phone/prologue-3.png) · [tablet](tablet/prologue-3.png) · [desktop](desktop/prologue-3.png) · [reduced motion](reduced-motion/prologue-3.png)
- `moon-1`: [sheet](sheets/moon-1.png) · [phone](phone/moon-1.png) · [tablet](tablet/moon-1.png) · [desktop](desktop/moon-1.png) · [reduced motion](reduced-motion/moon-1.png)
- `moon-2`: [sheet](sheets/moon-2.png) · [phone](phone/moon-2.png) · [tablet](tablet/moon-2.png) · [desktop](desktop/moon-2.png) · [reduced motion](reduced-motion/moon-2.png)
- `moon-3`: [sheet](sheets/moon-3.png) · [phone](phone/moon-3.png) · [tablet](tablet/moon-3.png) · [desktop](desktop/moon-3.png) · [reduced motion](reduced-motion/moon-3.png)
- `moon-4`: [sheet](sheets/moon-4.png) · [phone](phone/moon-4.png) · [tablet](tablet/moon-4.png) · [desktop](desktop/moon-4.png) · [reduced motion](reduced-motion/moon-4.png)
- `moon-5`: [sheet](sheets/moon-5.png) · [phone](phone/moon-5.png) · [tablet](tablet/moon-5.png) · [desktop](desktop/moon-5.png) · [reduced motion](reduced-motion/moon-5.png)
- `moon-6`: [sheet](sheets/moon-6.png) · [phone](phone/moon-6.png) · [tablet](tablet/moon-6.png) · [desktop](desktop/moon-6.png) · [reduced motion](reduced-motion/moon-6.png)
- `moon-7`: [sheet](sheets/moon-7.png) · [phone](phone/moon-7.png) · [tablet](tablet/moon-7.png) · [desktop](desktop/moon-7.png) · [reduced motion](reduced-motion/moon-7.png)
- `moon-8`: [sheet](sheets/moon-8.png) · [phone](phone/moon-8.png) · [tablet](tablet/moon-8.png) · [desktop](desktop/moon-8.png) · [reduced motion](reduced-motion/moon-8.png)
- `moon-9`: [sheet](sheets/moon-9.png) · [phone](phone/moon-9.png) · [tablet](tablet/moon-9.png) · [desktop](desktop/moon-9.png) · [reduced motion](reduced-motion/moon-9.png)
- `mars1-1`: [sheet](sheets/mars1-1.png) · [phone](phone/mars1-1.png) · [tablet](tablet/mars1-1.png) · [desktop](desktop/mars1-1.png) · [reduced motion](reduced-motion/mars1-1.png)
- `mars1-2`: [sheet](sheets/mars1-2.png) · [phone](phone/mars1-2.png) · [tablet](tablet/mars1-2.png) · [desktop](desktop/mars1-2.png) · [reduced motion](reduced-motion/mars1-2.png)
- `mars1-3`: [sheet](sheets/mars1-3.png) · [phone](phone/mars1-3.png) · [tablet](tablet/mars1-3.png) · [desktop](desktop/mars1-3.png) · [reduced motion](reduced-motion/mars1-3.png)
- `mars1-4`: [sheet](sheets/mars1-4.png) · [phone](phone/mars1-4.png) · [tablet](tablet/mars1-4.png) · [desktop](desktop/mars1-4.png) · [reduced motion](reduced-motion/mars1-4.png)
- `mars1-5`: [sheet](sheets/mars1-5.png) · [phone](phone/mars1-5.png) · [tablet](tablet/mars1-5.png) · [desktop](desktop/mars1-5.png) · [reduced motion](reduced-motion/mars1-5.png)
- `mars1-6`: [sheet](sheets/mars1-6.png) · [phone](phone/mars1-6.png) · [tablet](tablet/mars1-6.png) · [desktop](desktop/mars1-6.png) · [reduced motion](reduced-motion/mars1-6.png)
- `mars1-7`: [sheet](sheets/mars1-7.png) · [phone](phone/mars1-7.png) · [tablet](tablet/mars1-7.png) · [desktop](desktop/mars1-7.png) · [reduced motion](reduced-motion/mars1-7.png)
- `mars2-1`: [sheet](sheets/mars2-1.png) · [phone](phone/mars2-1.png) · [tablet](tablet/mars2-1.png) · [desktop](desktop/mars2-1.png) · [reduced motion](reduced-motion/mars2-1.png)
- `mars2-2`: [sheet](sheets/mars2-2.png) · [phone](phone/mars2-2.png) · [tablet](tablet/mars2-2.png) · [desktop](desktop/mars2-2.png) · [reduced motion](reduced-motion/mars2-2.png)
- `mars2-3`: [sheet](sheets/mars2-3.png) · [phone](phone/mars2-3.png) · [tablet](tablet/mars2-3.png) · [desktop](desktop/mars2-3.png) · [reduced motion](reduced-motion/mars2-3.png)
- `mars2-4`: [sheet](sheets/mars2-4.png) · [phone](phone/mars2-4.png) · [tablet](tablet/mars2-4.png) · [desktop](desktop/mars2-4.png) · [reduced motion](reduced-motion/mars2-4.png)
- `mars2-5`: [sheet](sheets/mars2-5.png) · [phone](phone/mars2-5.png) · [tablet](tablet/mars2-5.png) · [desktop](desktop/mars2-5.png) · [reduced motion](reduced-motion/mars2-5.png)
- `mars2-6`: [sheet](sheets/mars2-6.png) · [phone](phone/mars2-6.png) · [tablet](tablet/mars2-6.png) · [desktop](desktop/mars2-6.png) · [reduced motion](reduced-motion/mars2-6.png)
- `mars2-7`: [sheet](sheets/mars2-7.png) · [phone](phone/mars2-7.png) · [tablet](tablet/mars2-7.png) · [desktop](desktop/mars2-7.png) · [reduced motion](reduced-motion/mars2-7.png)
- `mars2-8`: [sheet](sheets/mars2-8.png) · [phone](phone/mars2-8.png) · [tablet](tablet/mars2-8.png) · [desktop](desktop/mars2-8.png) · [reduced motion](reduced-motion/mars2-8.png)
- `mars2-9`: [sheet](sheets/mars2-9.png) · [phone](phone/mars2-9.png) · [tablet](tablet/mars2-9.png) · [desktop](desktop/mars2-9.png) · [reduced motion](reduced-motion/mars2-9.png)
- `small-1`: [sheet](sheets/small-1.png) · [phone](phone/small-1.png) · [tablet](tablet/small-1.png) · [desktop](desktop/small-1.png) · [reduced motion](reduced-motion/small-1.png)
- `small-2`: [sheet](sheets/small-2.png) · [phone](phone/small-2.png) · [tablet](tablet/small-2.png) · [desktop](desktop/small-2.png) · [reduced motion](reduced-motion/small-2.png)
- `small-3`: [sheet](sheets/small-3.png) · [phone](phone/small-3.png) · [tablet](tablet/small-3.png) · [desktop](desktop/small-3.png) · [reduced motion](reduced-motion/small-3.png)
- `small-4`: [sheet](sheets/small-4.png) · [phone](phone/small-4.png) · [tablet](tablet/small-4.png) · [desktop](desktop/small-4.png) · [reduced motion](reduced-motion/small-4.png)
- `small-5`: [sheet](sheets/small-5.png) · [phone](phone/small-5.png) · [tablet](tablet/small-5.png) · [desktop](desktop/small-5.png) · [reduced motion](reduced-motion/small-5.png)
- `small-6`: [sheet](sheets/small-6.png) · [phone](phone/small-6.png) · [tablet](tablet/small-6.png) · [desktop](desktop/small-6.png) · [reduced motion](reduced-motion/small-6.png)
- `beyond-1`: [sheet](sheets/beyond-1.png) · [phone](phone/beyond-1.png) · [tablet](tablet/beyond-1.png) · [desktop](desktop/beyond-1.png) · [reduced motion](reduced-motion/beyond-1.png)
- `beyond-2`: [sheet](sheets/beyond-2.png) · [phone](phone/beyond-2.png) · [tablet](tablet/beyond-2.png) · [desktop](desktop/beyond-2.png) · [reduced motion](reduced-motion/beyond-2.png)
- `beyond-3`: [sheet](sheets/beyond-3.png) · [phone](phone/beyond-3.png) · [tablet](tablet/beyond-3.png) · [desktop](desktop/beyond-3.png) · [reduced motion](reduced-motion/beyond-3.png)
- `beyond-4`: [sheet](sheets/beyond-4.png) · [phone](phone/beyond-4.png) · [tablet](tablet/beyond-4.png) · [desktop](desktop/beyond-4.png) · [reduced motion](reduced-motion/beyond-4.png)
- `beyond-5`: [sheet](sheets/beyond-5.png) · [phone](phone/beyond-5.png) · [tablet](tablet/beyond-5.png) · [desktop](desktop/beyond-5.png) · [reduced motion](reduced-motion/beyond-5.png)
- `beyond-6`: [sheet](sheets/beyond-6.png) · [phone](phone/beyond-6.png) · [tablet](tablet/beyond-6.png) · [desktop](desktop/beyond-6.png) · [reduced motion](reduced-motion/beyond-6.png)
- `finale-1`: [sheet](sheets/finale-1.png) · [phone](phone/finale-1.png) · [tablet](tablet/finale-1.png) · [desktop](desktop/finale-1.png) · [reduced motion](reduced-motion/finale-1.png)
- `finale-2`: [sheet](sheets/finale-2.png) · [phone](phone/finale-2.png) · [tablet](tablet/finale-2.png) · [desktop](desktop/finale-2.png) · [reduced motion](reduced-motion/finale-2.png)
- `finale-3`: [sheet](sheets/finale-3.png) · [phone](phone/finale-3.png) · [tablet](tablet/finale-3.png) · [desktop](desktop/finale-3.png) · [reduced motion](reduced-motion/finale-3.png)
- `finale-4`: [sheet](sheets/finale-4.png) · [phone](phone/finale-4.png) · [tablet](tablet/finale-4.png) · [desktop](desktop/finale-4.png) · [reduced motion](reduced-motion/finale-4.png)

## Console errors and failed requests

None.

## Still looks off

- No art exists for some script scenes, so they use the nearest sprite: 3.6 (Mars cut open, crust/mantle/core: "made in code" in the script, not built yet), 5.3 (planets popping in), 2.2 (the photo building up), F.4 (explorer markers in the sky). These are Phase D animations.
- 3.1 should be a split page (Spirit in a crater, Opportunity on a plain); both twins stand in one crater for now.
- 1.9 Voyager panel slightly overlaps the lunar rover on desktop; on phones the Voyager panel on 2.7 overlaps Kit's helmet (Kit is allowed to be covered when there is no free space; the main explorer never is).
- bg_moon_mountains has a painted Earth that peeks out behind the Spark card at the very top on 1.8.
- The reader's own message bubble on F.4 only shows after typing one on F.3 (not visible in these shots).
