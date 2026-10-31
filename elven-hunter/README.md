# Elven Hunter 3D

An open-world, third-person forest game that runs in **one self-contained HTML file**.

No game engine, no framework, no CDN, no network calls at runtime. The renderer, the
terrain generator, the character rigs and the gameplay are all plain JavaScript and raw
WebGL, bundled into a single ~87 KB file. Open it from a USB stick on a plane and it
plays.

The wood is 300 × 300 units of procedurally generated hills, a winding river and about
3,600 scattered trees, rocks and ferns, with four landmarks to find. Spiders hunt the
undergrowth, goblins hold a camp, and your kin hang in cocoons waiting to be cut down.
Free them and they follow you and fight.

---

## Play

```bash
npm start           # builds, then serves at http://localhost:8080
```

Or just open `index.html` directly in a browser — it needs nothing else.

### Controls

**Laptop** (auto-detected)

| Action | Input |
|---|---|
| Move | `W` `A` `S` `D` |
| Look | Move the mouse (click once to capture, `Esc` to release) |
| Strike | Left click |
| Shoot | Right click |
| Jump | `Space` |
| Dash | `Shift` *(unlocked by a skill)* |
| Drink a potion | `Q` |
| Skills | `Tab` |
| Diagnostics overlay | `I` |
| Zoom | Scroll wheel |

**Phone / tablet** (auto-detected)

Drag the left half of the screen to move, the right half to look. Buttons on the right
handle strike, shoot and jump. Your hunter also swings automatically when something
hostile gets within reach, so combat never depends on finding a button. (Auto-swing is
touch-only; with a mouse it yanked your facing around, so on a laptop you swing when
you click.) Tap the minimap to show its key.

The game switches between the two schemes live — move a mouse and it goes to desktop
mode, touch the screen and it goes back.

---

## How it's built

```
src/
  engine.js   4×4 matrix math, flat-shaded mesh builders (box, cone, blob, limb,
              disc, sky dome), the GLSL shader pair, GPU buffer wrapper
  world.js    value-noise heightmap, terrain and water mesh, prop scattering,
              the four hand-placed landmarks
  chars.js    procedural character rigs — humanoid, spider, cocoon — assembled
              from primitives each frame and animated by walk phase
  game.js     state, input, camera, combat, AI, allies, skills, HUD, telemetry
tools/
  build.mjs   inlines the four modules into index.html
  serve.mjs   dependency-free static server
test/
  run.mjs     headless suite driving the real game in Chromium
```

`npm run build` regenerates `index.html` from `src/`. **Edit the files in `src/`, never
`index.html`** — it is a build artifact and gets overwritten.

### Rendering notes

- **Smooth shading.** Meshes carry per-vertex normals: the terrain takes its normals from
  the heightmap's slope, characters are built from rounded tubes and subdivided spheres,
  trunks are round and pines are smooth cones. Hills roll and bodies read as round
  instead of breaking into facets.
- **See-through foliage.** Trees, rocks and buildings between the camera and the hunter
  are cut away in the fragment shader with a dithered hole, so the forest never hides
  you. Props are flagged per vertex (`aF = 2`) so the ground and characters are never cut.
- **Solid world.** Trunks, larger rocks, stumps and the landmarks register circle or
  rotated-box colliders in a coarse grid. The hunter, creatures and followers are pushed
  out of them, and out of each other, so crowds spread around you instead of stacking.
- **Minimap.** Every kind of thing has its own glyph (spider, goblin, archer, captive,
  follower, fairy, and an icon per landmark). Undiscovered landmarks show as `?`, and
  landmarks beyond the map's edge stay pinned to its rim so you can see which way they lie.

- Everything static — terrain, water, every tree and rock — is baked into **one vertex
  buffer and drawn in a single call** (~132k triangles).
- Characters are assembled per frame from a handful of shared primitive meshes, each
  drawn with its own model matrix. Beyond 20 units, or past the seventh-nearest
  character, a reduced rig is used; a 46-enemy horde costs about 455 draw calls instead
  of 1,100.
- **Adaptive resolution.** The game measures its own frame rate and scales the render
  target between 62% and 100% to hold ~60 fps, then eases back up. The HUD canvas draws
  at a lower scale than the 3D view, because Canvas2D compositing is expensive on iOS.

### Diagnostics

Press `I` (or tap the **i** button on a phone) for a live overlay: frame rate, worst
frame time, taps that landed on a button versus taps that missed (drawn as red dots),
and what has been damaging you. The title and death screens also have a **Copy
diagnostic report** button that dumps the same data as JSON.

This exists because the game is developed without a device in hand. Several real bugs
were found this way and nowhere else — most memorably, the attack button rendering
underneath the iPhone home-indicator strip, which made it impossible to press while
looking perfectly fine in a screenshot.

---

## Tests

```bash
npm install         # playwright, the only dev dependency
npm test
```

43 assertions run the actual game in headless Chromium with software WebGL and check
live state. Most of them are regression tests for bugs that shipped at least once:

- projectiles tunnelling through enemies on slow frames
- arrows flying over enemies' heads when shooting downhill
- the attack button sitting inside the iOS gesture strip
- holding the stick sideways walking the player in a circle (a feedback loop between
  camera-relative input and an auto-following camera)
- terrain normals facing downward, so the ground received no sunlight at all
- walking straight through tree trunks, and enemies piling onto one spot

Timing-sensitive checks wait on game time (`G.t`) rather than wall-clock time, because
software WebGL frame rates vary a lot between machines.

---

## Known limitations

- **Characters are built from primitives.** They are rounded now, but the honest fix is
  real low-poly models (`.glb`) with skeletal animation, which is the main reason to
  consider moving the renderer onto an engine such as three.js.
- **No haptics on iOS.** Safari does not implement the Vibration API. Android gets the
  full set.
- Save data is limited to a best-depth record in `localStorage`.

## License

MIT — see [LICENSE](LICENSE).
