# Take Care of Your Pet

A 3D pet care game that runs in the browser. Feed, pet and train your pets, explore a big city, walk into shops, visit the vet, go down forest trails, and make friends with woodland animals.

## Play locally

Open `index.html` in a web browser. That's it: no installs or build step.

## What's in here

| File | What it is |
|---|---|
| `index.html` | The whole game: page, styles and code |
| `netlify.toml` | Netlify hosting settings (no build step) |
| `manifest.webmanifest`, `icon.svg` | Lets phones and tablets add the game to the home screen |

## Hosting on Netlify

Connect this repository in Netlify ("Add new site" → "Import an existing project"). Leave the build command empty and the publish directory as `.`. Every push to `main` updates the live site.

## Notes

- The 3D engine (three.js r128) loads from cdnjs, with jsDelivr as a backup.
- Fonts load from Google Fonts.
- Game progress is saved in the browser's local storage on each device.
