# Elven Hunter 3D

An open-world, third-person forest game that runs in **one self-contained HTML file**.

No CDN and no network calls at runtime. Rendering is done by
[three.js](https://threejs.org) (MIT); the terrain generator, the character rigs and the
gameplay are plain JavaScript. Heroes, followers and goblins are rigged, animated
models from Kay Lousberg's CC0 [KayKit Adventurers](https://kaylousberg.itch.io/kaykit-adventurers)
pack. The build bundles the slice of three.js the game uses, the models and the game into
a single ~3.1 MB file. Open it from a USB stick on a plane and it plays.

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
| Strike | `E` or left click (hold to keep swinging) |
| Shoot | `F` or right click (hold to keep firing) |
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
  three-entry.js  the three.js classes the game uses (bundled by esbuild)
  engine.js   4×4 matrix math, smooth mesh builders (box, cone, tube, blob, disc,
              sky dome), the bridge to three.js: geometry, the world material
              (water ripple + see-through cutout), instanced batches
  world.js    value-noise heightmap, terrain and water mesh, prop scattering,
              the four hand-placed landmarks
  chars.js    procedural rigs — humanoid, spider, cocoon — built from primitives;
              humanoids use these only far away or while models load
  models.js   animated character models: loading, actors, animation layering
  game.js     state, input, camera, combat, AI, allies, skills, HUD, telemetry
assets/       slimmed KayKit models (*.glb, CC0) + shared animation clips
tools/
  build.mjs   bundles three.js with esbuild, inlines it, the models (base64) and
              the modules into index.html
  models.mjs  rebuilds assets/ from the KayKit pack (fetches it if needed)
  serve.mjs   dependency-free static server
test/
  run.mjs     headless suite driving the real game in Chromium
```

`npm install` then `npm run build` regenerates `index.html` from `src/`. **Edit the files
in `src/`, never `index.html`** — it is a build artifact and gets overwritten. It is
committed, because the site is served as static files with no build step.

To use another three.js class, add its name to `src/three-entry.js`; only listed classes
are bundled.

### Characters

- **Models.** Rogue → hooded rogue with crossbow (draws a knife to strike), Warrior →
  barbarian with axe, Wizard → mage with staff. Elves get ears and dwarves a beard,
  attached to the head bone. Followers use the knight, rogues, mage and barbarian;
  goblins are smaller, green-tinted rogues. Spiders, cocoons and fairies stay procedural.
- **One skeleton, one set of clips.** All five KayKit characters share a 41-bone rig, so
  `assets/anims.glb` carries 14 clips once (idle, run, jump, attacks, shoot, cast, throw,
  hit, death, cheer) and every model plays them. `tools/models.mjs` strips the other 61
  clips, constant tracks and IK helpers: 18 MB of source becomes 1.8 MB.
- **Layered animation.** Each clip also exists as an upper-body and a lower-body half.
  An attack or hit plays on the upper body while the legs keep their run or idle, so you
  can shoot on the move. Weights cross-fade every frame.
- **Budget.** The nearest 12 humanoids within 42 units get a model ("actor", pooled and
  reused); everything else is drawn by the instanced primitive rigs, so a horde costs
  a fixed amount. Each model's six body parts are merged into one skinned mesh.
- **Death.** Slain goblins and spiders leave a body that plays its death, then sinks.

### Rendering notes

- **Real shadows.** The sun casts a shadow map (2048² on laptops, 1024² on phones) that
  follows the hunter; trees, rocks, buildings and characters all cast. Beyond its reach,
  small contact discs stand in. If a device is still slow at the lowest render scale, the
  world stops casting shadows (characters keep theirs) and the diagnostics report says so.

- **Smooth shading.** Meshes carry per-vertex normals: the terrain takes its normals from
  the heightmap's slope, characters are built from rounded tubes and subdivided spheres,
  trunks are round and pines are smooth cones. Hills roll and bodies read as round
  instead of breaking into facets.
- **See-through foliage.** Trees, rocks and buildings between the camera and the hunter
  are cut away in the fragment shader with a dithered hole, so the forest never hides
  you. Props are flagged per vertex (`flag = 2`, water is `1`) so the ground and
  characters are never cut. This is injected into three.js's Lambert material with
  `onBeforeCompile`, so it keeps three's lighting and fog.
- **Lighting matched to the original renderer.** Colour management is off and output is
  linear, so palette values display as written. A hemisphere light and a warm sun
  reproduce the old shader's ambient and sun terms (intensities are scaled by π because
  three.js divides diffuse light by π).
- **Solid world.** Trunks, larger rocks, stumps and the landmarks register circle or
  rotated-box colliders in a coarse grid. The hunter, creatures and followers are pushed
  out of them, and out of each other, so crowds spread around you instead of stacking.
- **Minimap.** Every kind of thing has its own glyph (spider, goblin, archer, captive,
  follower, fairy, and an icon per landmark). Undiscovered landmarks show as `?`, and
  landmarks beyond the map's edge stay pinned to its rim so you can see which way they lie.

- Everything static — terrain, water, every tree and rock — is baked into **one vertex
  buffer and drawn in a single call** (~132k triangles).
- Characters are assembled per frame from a handful of shared primitive meshes and
  poured into **instanced batches**: one draw call per part shape, whatever the crowd.
  A 46-enemy horde costs 12 draw calls (it was 455 before three.js). Beyond 20 units,
  or past the seventh-nearest character, a reduced rig is still used to save vertices.
- Every batch is created and every shader compiled during the loading screen, so the
  first goblin you meet does not cause a stall.
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
npm install         # three, esbuild, playwright (dev only; nothing ships but index.html)
npm test
```

55 assertions run the actual game in headless Chromium with software WebGL and check
live state. Most of them are regression tests for bugs that shipped at least once:

- projectiles tunnelling through enemies on slow frames
- arrows flying over enemies' heads when shooting downhill
- the attack button sitting inside the iOS gesture strip
- `A`/`D` strafing the wrong way, and the minimap drawn mirrored
- arrows tumbling end over end instead of flying point-first
- holding the stick sideways walking the player in a circle (a feedback loop between
  camera-relative input and an auto-following camera)
- terrain normals facing downward, so the ground received no sunlight at all
- walking straight through tree trunks, and enemies piling onto one spot

Timing-sensitive checks wait on game time (`G.t`) rather than wall-clock time, because
software WebGL frame rates vary a lot between machines.

---

## Known limitations

- **Spiders are still built from primitives**; the KayKit pack has no spider. A CC0
  rigged spider would slot into the same actor system.
- **Size.** The models are embedded as base64, so the file is ~3.1 MB. Mesh quantisation
  (`KHR_mesh_quantization`) could roughly halve the model share if that matters.
- **Needs WebGL 2** (three.js dropped WebGL 1). Every current browser has it, including
  Safari on iOS 15 and later.
- **No haptics on iOS.** Safari does not implement the Vibration API. Android gets the
  full set.
- Save data is limited to a best-depth record in `localStorage`.

## License

MIT — see [LICENSE](LICENSE). Character models and animations: KayKit Adventurers by
Kay Lousberg, CC0 — see [assets/LICENSE-KayKit-Adventurers.txt](assets/LICENSE-KayKit-Adventurers.txt).
three.js: MIT, notice kept in the bundle.
