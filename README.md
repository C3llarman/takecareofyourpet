# Elk Leaf Arcade

The home of Elk Leaf Arcade at [elkleafarcade.com](https://elkleafarcade.com): a menu of games that run in the browser.

## Games

| Game | Address | Folder |
|---|---|---|
| Take Care of Your Pet | elkleafarcade.com/pet/ | `pet/` |
| Elven Hunter | elkleafarcade.com/elven-hunter/ | `elven-hunter/` |
| Cluck Patrol | elkleafarcade.com/cluck-patrol/ | `cluck-patrol/` |
| Acorn Run | elkleafarcade.com/acorn-run/ | `acorn-run/` |
| Build a House | elkleafarcade.com/build-a-house/ | `build-a-house/` |
| Flick Archery | elkleafarcade.com/flick-archery/ | `flick-archery/` |

**Take Care of Your Pet** is a 3D pet care game. Feed, pet and train your pets, explore a big city, walk into shops, visit the vet, go down forest trails, and make friends with woodland animals.

**Elven Hunter** is an open-world forest adventure: fight spiders, snakes, wasps and mushroom grumps, free your kin from their cocoons, call up the Stone Warden and face the dragon on his crag. It has its own README in `elven-hunter/`. Edit its files in `elven-hunter/src/`, then run `node tools/build.mjs` inside `elven-hunter/` to rebuild its `index.html`.

**Cluck Patrol** is a 2D platformer: hop across five tropical levels as a chicken and stomp or egg every raccoon and fox before the clock runs out. Palm Beach is the original island; clearing a level unlocks the next: Coconut Cove (drifting ledges over wide water), Sunset Cliffs (lifts up to the cliff tops), Moonlit Lagoon (cracked ledges that crumble under you) and Fox Den Peak (all of it at once). Pick any unlocked level on the title screen. Pick Easy, Medium or Hard (more lives and time on the easier ones), throw eggs with X or the EGG button, and grab floating hearts for an extra life. Everything, including its pictures, is inside `cluck-patrol/index.html`.

**Acorn Run** is an endless runner: race a squirrel across floating islands, backflip over wide gaps, throw acorns to break crates and knock out grumpy skunks, and say hi to the friendly skunks in hats. It runs straight from `acorn-run/` with no build step. To make a single self-contained HTML file instead, run `python3 tools/build.py` inside `acorn-run/`.

**Build a House** is a 3D block-building game: place blocks, craft new materials from real-life recipes, open and close doors, and dress up your builder. It has its own README in `build-a-house/`.

**Flick Archery** is a pass-the-phone archery game for 1 to 6 players. Flick up to shoot: flick speed sets the power, the flick's angle aims, and a curved swipe bends the arrow against the wind. Three rounds (15 m calm, 25 m breezy, 35 m gusty with a moving target), everyone gets the same wind, and the highest accuracy wins. Everything is inside `flick-archery/index.html`.

## Play locally

Start a small web server in this folder (for example `python3 -m http.server`) and open http://localhost:8000. You can also open `pet/index.html` directly to play the pet game.

## What's in here

| File | What it is |
|---|---|
| `index.html` | The arcade menu page |
| `icon.svg` | The arcade's elk leaf icon |
| `mascot.svg` | The arcade mascot, a little elk made of leaves (shown on the menu page) |
| `pet/index.html` | Take Care of Your Pet: page, styles and code |
| `pet/cover.jpg` | The game's picture on the arcade menu |
| `pet/manifest.webmanifest`, `pet/icon.svg` | Lets phones and tablets add the pet game to the home screen |
| `elven-hunter/` | Elven Hunter: built `index.html`, source in `src/`, build tools, tests and `cover.jpg` |
| `cluck-patrol/index.html` | Cluck Patrol: one self-contained page (art is embedded) |
| `cluck-patrol/cover.jpg` | Cluck Patrol's picture on the arcade menu |
| `acorn-run/` | Acorn Run: `index.html`, code in `src/`, sprite atlas in `assets/`, original art sheet in `assets/source/`, optional bundler in `tools/` |
| `acorn-run/cover.jpg` | Acorn Run's picture on the arcade menu |
| `flick-archery/index.html` | Flick Archery: one self-contained page |
| `flick-archery/cover.jpg` | Flick Archery's picture on the arcade menu |
| `build-a-house/` | Build a House: `index.html`, styles in `css/`, code in `js/`, and `cover.jpg` |
| `netlify.toml` | Netlify hosting settings (no build step) |

## Adding a game

Upload new games into their own folder, not the top of the repo, or they will replace the menu page.

1. Put the game in its own folder, for example `newgame/index.html`.
2. Add a card for it in the `games` section of `index.html` (copy the pet game card).
3. Add a link back to the menu in the game (`<a href="../">`).

## Hosting on Netlify

Connect this repository in Netlify ("Add new site" → "Import an existing project"). Leave the build command empty and the publish directory as `.`. Every push to `main` updates the live site. To use elkleafarcade.com, add it under the site's "Domain management" settings in Netlify.

## Notes

- The 3D engine (three.js r128) loads from cdnjs, with jsDelivr as a backup.
- Fonts load from Google Fonts.
- Game progress is saved in the browser's local storage on each device.
