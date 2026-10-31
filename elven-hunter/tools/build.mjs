#!/usr/bin/env node
/**
 * Bundles src/ into a single self-contained index.html.
 *
 * The game ships as one file on purpose: no CDN, no imports, no network at
 * runtime. Open index.html from disk and it plays.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

// Order matters: engine defines the math and mesh builders that world/chars use,
// and game.js wires everything together at the end.
const MODULES = [
  ['/*ENGINE*/', 'engine.js'],
  ['/*WORLD*/',  'world.js'],
  ['/*CHARS*/',  'chars.js'],
  ['/*GAME*/',   'game.js'],
];

let html = readFileSync(join(SRC, 'shell.html'), 'utf8');

for (const [token, file] of MODULES) {
  if (!html.includes(token)) throw new Error(`shell.html is missing the ${token} placeholder`);
  html = html.replace(token, '\n' + readFileSync(join(SRC, file), 'utf8') + '\n');
}

const out = join(ROOT, 'index.html');
writeFileSync(out, html);

const kb = (html.length / 1024).toFixed(1);
console.log(`built index.html  (${kb} KB, no external dependencies)`);
