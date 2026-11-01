# Build a House

A 3D block-building game that runs in a web browser. Place blocks, craft new materials from real-life recipes, open and close doors, and dress up your builder. It works on laptops (mouse, trackpad and keyboard) and on phones and tablets (touch).

## Play it

Open `index.html` in Chrome, Edge, Firefox or Safari. You don't need to install anything.

The first time it opens, the computer needs to be online so the browser can download the 3D library (three.js) and the fonts. Your world saves automatically in that browser.

## Controls

### Laptop

| Action | How |
| --- | --- |
| Place a block, or open/close a door | Click |
| Break a block | Right-click, or Shift + click on a trackpad |
| Spin the camera | Click and drag |
| Zoom | Scroll wheel, or two-finger scroll on a trackpad |
| Slide the camera | W A S D or the arrow keys |
| Turn the camera | Q and E |
| Pick a block | 1–9 and 0 |
| Previous / next block | [ and ] |
| Switch Build and Break | B |
| Workbench (crafting) | C |
| Dress your builder | P |
| Move your builder | M |
| Show the controls | H |
| Close a panel | Esc |

### Phone or tablet

- Tap to place a block, or tap a door to open it.
- Use the **Break** button, then tap a block to remove it.
- Drag with one finger to spin the camera. Pinch to zoom, and drag with two fingers to slide.

## Materials and recipes

You start with Grass, Dirt, Stone, Sand, Clay, Oak Log, Leaves, Planks and Door. Every material is unlimited.

| Make | Mix |
| --- | --- |
| Planks | Oak Log + Oak Log |
| Door | Planks + Planks |
| Glass | Sand + Sand |
| Brick | Clay + Clay |
| Concrete | Stone + Sand |
| Roof Tile | Clay + Stone |
| Marble | Stone + Stone |
| Window | Glass + Planks |
| Bookshelf | Planks + Leaves |

A door is a rectangle two blocks tall, and it faces the camera when you place it.

## Project layout

```
build-a-house/
├── index.html      Page layout: top bar, block bar, workbench and character panels
├── css/style.css   All styles; the laptop layout is under the 900px media query
└── js/game.js      Game logic: textures, world, blocks, crafting, character, controls
```

The block textures are drawn in code (16×16 pixels), so there are no image files.

### Common changes

- **Add a material:** add it to `MATS` in `js/game.js` along with a texture in the `C` section. To make it craftable, add a line to `RECIPES`.
- **Add a starting material:** add its key to `START`.
- **Change the world size:** change `HALF`. The island is `HALF × 2` blocks wide.
- **Reset your world:** clear the site data for the page in your browser settings.

## Put it online with GitHub Pages

1. Make a new repository on GitHub and push this folder to it.
2. In the repository, open **Settings → Pages**.
3. Under **Source**, choose the `main` branch and the root folder, then save.
4. GitHub shows the link to your game after about a minute.

## Credits

Uses [three.js](https://threejs.org) r128 (MIT license), loaded from cdnjs and jsDelivr, and the Bungee and Rubik fonts from Google Fonts.
