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
import { readFileSync, writeFileSync } from 'node:fs';
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

// Order matters: engine defines the math and mesh builders that world/chars use,
// and game.js wires everything together at the end.
const MODULES = [
  ['/*THREE*/',  null],
  ['/*ENGINE*/', 'engine.js'],
  ['/*WORLD*/',  'world.js'],
  ['/*CHARS*/',  'chars.js'],
  ['/*GAME*/',   'game.js'],
];

let html = readFileSync(join(SRC, 'shell.html'), 'utf8');

for (const [token, file] of MODULES) {
  if (!html.includes(token)) throw new Error(`shell.html is missing the ${token} placeholder`);
  const body = file ? readFileSync(join(SRC, file), 'utf8') : threeJs;
  html = html.replace(token, () => '\n' + body + '\n');
}

const out = join(ROOT, 'index.html');
writeFileSync(out, html);

const kb = (html.length / 1024).toFixed(1);
const tk = (threeJs.length / 1024).toFixed(1);
console.log(`built index.html  (${kb} KB incl. ${tk} KB of three.js, no external dependencies)`);
