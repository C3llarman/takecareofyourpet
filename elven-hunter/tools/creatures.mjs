#!/usr/bin/env node
/**
 * Builds assets/spider.glb from Quaternius's animated spider (CC0,
 * https://quaternius.com, from his animated monsters set). The source is fetched
 * from a public mirror on GitHub, since the game is built in places that can
 * reach GitHub and npm but not the asset stores.
 *
 *   node tools/creatures.mjs [path/to/Spider.glb]
 *
 * - The five clips (attack, death, idle, jump, walk) lose their
 *   "SpiderArmature|Spider_" prefix, are resampled and compressed.
 * - Mesh data is packed with EXT_meshopt_compression, like the characters.
 * The output is committed, so this only needs re-running to change the spider.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { prune, resample, dedup, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');
const REPO = 'https://github.com/g0ddest/renethack';
const SUB = 'client/godot/art/cc0/quaternius/monsters';

let src = process.argv[2];
if (!src) {
  const cache = join(ROOT, 'node_modules/.cache/quaternius-monsters');
  if (!existsSync(join(cache, SUB, 'Spider.glb'))) {
    mkdirSync(dirname(cache), { recursive: true });
    execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPO, cache], { stdio: 'inherit' });
    execFileSync('git', ['-C', cache, 'sparse-checkout', 'set', SUB], { stdio: 'inherit' });
  }
  src = join(cache, SUB, 'Spider.glb');
}

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read(src);
const root = doc.getRoot();
for (const a of root.listAnimations()) a.setName(a.getName().replace(/^.*\|/, '').replace(/^Spider_/, ''));
// the rig never scales; drop constant scale tracks
for (const a of root.listAnimations()) for (const ch of a.listChannels()) {
  if (ch.getTargetPath() === 'scale') { const s = ch.getSampler(); ch.dispose(); s.dispose(); }
}
for (const m of root.listMaterials()) m.setName(m.getName() === 'Material' ? 'body' : 'marking');
await doc.transform(resample({ tolerance: 5e-4 }), prune(), dedup(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizationVolume: 'scene' }));
mkdirSync(OUT, { recursive: true });
const out = join(OUT, 'spider.glb');
await io.write(out, doc);
console.log(`spider        ${(statSync(out).size / 1024).toFixed(0)} KB  (${root.listAnimations().map((a) => a.getName()).join(', ')})`);
