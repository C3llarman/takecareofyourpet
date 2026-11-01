# Elk Leaf Arcade

The home of Elk Leaf Arcade at [elkleafarcade.com](https://elkleafarcade.com): a menu of games that run in the browser.

## Games

| Game | Address | Folder |
|---|---|---|
| Take Care of Your Pet | elkleafarcade.com/pet/ | `pet/` |
| Elven Hunter | elkleafarcade.com/elven-hunter/ | `elven-hunter/` |
| Cluck Patrol | elkleafarcade.com/cluck-patrol/ | `cluck-patrol/` |
| Acorn Run | elkleafarcade.com/acorn-run/ | `acorn-run/` |

**Take Care of Your Pet** is a 3D pet care game. Feed, pet and train your pets, explore a big city, walk into shops, visit the vet, go down forest trails, and make friends with woodland animals.

**Elven Hunter** is an open-world forest adventure: fight spiders and goblins and free your kin from their cocoons. It has its own README in `elven-hunter/`. Edit its files in `elven-hunter/src/`, then run `node tools/build.mjs` inside `elven-hunter/` to rebuild its `index.html`.

**Cluck Patrol** is a 2D platformer: hop across a tropical island as a chicken and stomp all 22 raccoons and foxes within two and a half minutes. Everything, including its pictures, is inside `cluck-patrol/index.html`.

**Acorn Run** is an endless runner: race a squirrel across floating islands, backflip over wide gaps, throw acorns to break crates and knock out grumpy skunks, and say hi to the friendly skunks in hats. It runs straight from `acorn-run/` with no build step. To make a single self-contained HTML file instead, run `python3 tools/build.py` inside `acorn-run/`.

## Play locally

Start a small web server in this folder (for example `python3 -m http.server`) and open http://localhost:8000. You can also open `pet/index.html` directly to play the pet game.

## What's in here

| File | What it is |
|---|---|
| `index.html` | The arcade menu page |
| `icon.svg` | The arcade's elk leaf icon |
| `pet/index.html` | Take Care of Your Pet: page, styles and code |
| `pet/cover.jpg` | The game's picture on the arcade menu |
| `pet/manifest.webmanifest`, `pet/icon.svg` | Lets phones and tablets add the pet game to the home screen |
| `elven-hunter/` | Elven Hunter: built `index.html`, source in `src/`, build tools, tests and `cover.jpg` |
| `cluck-patrol/index.html` | Cluck Patrol: one self-contained page (art is embedded) |
| `cluck-patrol/cover.jpg` | Cluck Patrol's picture on the arcade menu |
| `acorn-run/` | Acorn Run: `index.html`, code in `src/`, sprite atlas in `assets/`, original art sheet in `assets/source/`, optional bundler in `tools/` |
| `acorn-run/cover.jpg` | Acorn Run's picture on the arcade menu |
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
