#!/usr/bin/env node
/**
 * Bundles src/ into a single self-contained index.html.
 *
 * The game ships as one file on purpose: no CDN, no imports, no network at
 * runtime. Open index.html from disk and it plays.
 *
 * Rendering uses three.js (MIT). It is ESM-only, so esbuild bundles just the
 * classes listed in src/three-entry.js into an IIFE that defines `THREE`, and
 * that is inlined ahead of the game's own scripts.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const three = await build({
  entryPoints: [join(SRC, 'three-entry.js')],
  bundle: true, format: 'iife', globalName: 'THREE', minify: true,
  target: 'es2018', legalComments: 'inline', write: false, logLevel: 'warning',
});
// `</script` inside the bundle would end the inline <script> early
const threeJs = three.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

// Character models (assets/*.glb, made by tools/models.mjs) ride along as base64,
// so the game still opens from disk with no fetch.
const ASSETS = join(ROOT, 'assets');
const models = readdirSync(ASSETS).filter((f) => f.endsWith('.glb')).sort();
const assetsJs = 'var MODEL_DATA={\n' + models.map((f) =>
  JSON.stringify(f.replace(/\.glb$/, '')) + ':"' + readFileSync(join(ASSETS, f)).toString('base64') + '"').join(',\n') + '\n};';
// Trees, bushes and rocks (tools/nature.mjs): small palette-coloured meshes the
// world bakes into its chunks. Without the file the world falls back to primitives.
const naturePath = join(ASSETS, 'nature.json');
const natureJs = existsSync(naturePath) ? 'var NATURE_DATA=' + readFileSync(naturePath, 'utf8') + ';' : '';
// Background music (tools/music.mjs), decoded by Web Audio when the player first
// clicks in. Optional: without it the game is simply silent apart from its effects.
const musicPath = join(ASSETS, 'music.mp3');
const musicJs = existsSync(musicPath) ? 'var MUSIC_DATA="' + readFileSync(musicPath).toString('base64') + '";' : '';

// Order matters: engine defines the math and mesh builders that world/chars use,
// and game.js wires everything together at the end.
const MODULES = [
  ['/*THREE*/',  null],
  ['/*ENGINE*/', 'engine.js'],
  ['/*WORLD*/',  'world.js'],
  ['/*CHARS*/',  'chars.js'],
  ['/*ASSETS*/', null],
  ['/*MODELS*/', 'models.js'],
  ['/*AUDIO*/',  'audio.js'],
  ['/*GAME*/',   'game.js'],
];

let html = readFileSync(join(SRC, 'shell.html'), 'utf8');

for (const [token, file] of MODULES) {
  if (!html.includes(token)) throw new Error(`shell.html is missing the ${token} placeholder`);
  const body = file ? readFileSync(join(SRC, file), 'utf8') : (token === '/*THREE*/' ? threeJs : assetsJs + '\n' + natureJs + '\n' + musicJs);
  html = html.replace(token, () => '\n' + body + '\n');
}

const out = join(ROOT, 'index.html');
writeFileSync(out, html);

const kb = (html.length / 1024).toFixed(1);
const tk = (threeJs.length / 1024).toFixed(1);
const mk = (assetsJs.length / 1024).toFixed(1);
const nk = (natureJs.length / 1024).toFixed(1), uk = (musicJs.length / 1024).toFixed(1);
console.log(`built index.html  (${kb} KB: ${tk} KB three.js, ${mk} KB models, ${nk} KB nature, ${uk} KB music; no external dependencies)`);
