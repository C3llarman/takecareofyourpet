#!/usr/bin/env node
/**
 * Builds assets/music.mp3: "Peaceful Forest" by Samza (CC0,
 * https://opengameart.org/content/peaceful-forest), a 63-second seamless loop.
 * Fetched from a public mirror on GitHub, re-encoded with ffmpeg as mono 32 kHz
 * MP3 at 40 kbps and levelled for background play: ~320 KB. MP3 because it is the
 * one format every browser's decodeAudioData accepts (Safari has no Ogg Vorbis).
 *
 *   node tools/music.mjs [path/to/peaceful_forest.ogg]
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'https://github.com/LuisAldrichGuz/threecraft';
const SUB = 'public/music';

let src = process.argv[2];
if (!src) {
  const cache = join(ROOT, 'node_modules/.cache/cc0-music');
  if (!existsSync(join(cache, SUB, 'peaceful_forest.ogg'))) {
    mkdirSync(dirname(cache), { recursive: true });
    execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPO, cache], { stdio: 'inherit' });
    execFileSync('git', ['-C', cache, 'sparse-checkout', 'set', SUB], { stdio: 'inherit' });
  }
  src = join(cache, SUB, 'peaceful_forest.ogg');
}
const out = join(ROOT, 'assets', 'music.mp3');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-ac', '1', '-ar', '32000',
  '-af', 'loudnorm=I=-17:TP=-1.5:LRA=11', '-c:a', 'libmp3lame', '-b:a', '40k', out], { stdio: 'inherit' });
console.log(`music.mp3     ${(statSync(out).size / 1024).toFixed(0)} KB`);
