#!/usr/bin/env node
/**
 * Builds the slimmed character models in assets/ from the KayKit Adventurers
 * pack (CC0, Kay Lousberg, https://kaylousberg.com).
 *
 *   node tools/models.mjs [path/to/KayKit-Character-Pack-Adventures-1.0]
 *
 * With no path, the pack is shallow-cloned into node_modules/.cache. The output
 * (assets/*.glb) is committed, so this only needs re-running to change models.
 *
 * - Each character keeps its meshes, its weapon props and its 1 KB-ish texture,
 *   but none of its 75 animations.
 * - The animations are written once, to assets/anims.glb: all five characters
 *   share one 41-bone skeleton, so the same clips drive every one of them.
 *   Only the clips the game uses are kept, resampled to drop redundant keys,
 *   and tracks for the IK/control helpers (which skin nothing) are dropped.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { prune, resample, dedup } from '@gltf-transform/functions';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');
const REPO = 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0';
const SUB = 'addons/kaykit_character_pack_adventures/Characters/gltf';

let pack = process.argv[2];
if (!pack) {
  pack = join(ROOT, 'node_modules/.cache/kaykit-adventurers');
  if (!existsSync(join(pack, SUB))) {
    mkdirSync(dirname(pack), { recursive: true });
    execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPO, pack], { stdio: 'inherit' });
    execFileSync('git', ['-C', pack, 'sparse-checkout', 'set', SUB], { stdio: 'inherit' });
  }
}
const SRC = join(pack, SUB);

export const CHARACTERS = ['Barbarian', 'Knight', 'Mage', 'Rogue', 'Rogue_Hooded'];
export const CLIPS = [
  'Idle', 'Running_A', 'Walking_A', 'Jump_Idle',
  '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal', '2H_Melee_Attack_Spin',
  '1H_Ranged_Shoot', 'Spellcast_Shoot', 'Throw',
  'Hit_A', 'Death_A', 'Cheer', 'Dodge_Forward',
];
// helpers in the rig that are not part of the deforming skeleton
const HELPER = /IK|control-|kneeIK|elbowIK|handIK|heelIK/;

const io = new NodeIO();
function disposeAnim(a) {
  for (const s of a.listSamplers()) s.dispose();
  for (const c of a.listChannels()) c.dispose();
  a.dispose();
}
// disposing an animation leaves its sampler data behind; drop anything orphaned
function dropOrphans(doc) {
  const root = doc.getRoot();
  for (const a of root.listAccessors()) if (a.listParents().every((p) => p === root)) a.dispose();
}
mkdirSync(OUT, { recursive: true });

for (const name of CHARACTERS) {
  const doc = await io.read(join(SRC, `${name}.glb`));
  for (const a of doc.getRoot().listAnimations()) disposeAnim(a);
  dropOrphans(doc);
  await doc.transform(prune(), dedup());
  const out = join(OUT, `${name.toLowerCase()}.glb`);
  await io.write(out, doc);
  console.log(`${name.padEnd(13)} ${(statSync(out).size / 1024).toFixed(0)} KB`);
}

{
  const doc = await io.read(join(SRC, 'Rogue_Hooded.glb'));
  const root = doc.getRoot();
  for (const a of root.listAnimations()) {
    if (!CLIPS.includes(a.getName())) { disposeAnim(a); continue; }
    for (const ch of a.listChannels()) {
      const n = ch.getTargetNode(), path = ch.getTargetPath();
      // the rig never scales, and only the hips translate; everything else rotates
      const useless = !n || HELPER.test(n.getName()) || path === 'scale' ||
        (path === 'translation' && n.getName() !== 'hips');
      if (useless) { const s = ch.getSampler(); ch.dispose(); s.dispose(); }
    }
  }
  const missing = CLIPS.filter((c) => !root.listAnimations().some((a) => a.getName() === c));
  if (missing.length) throw new Error('clips not found: ' + missing.join(', '));
  // keep the skeleton the clips target, drop the meshes and texture
  for (const n of root.listNodes()) if (n.getMesh()) n.setMesh(null).setSkin(null);
  for (const m of root.listMeshes()) m.dispose();
  dropOrphans(doc);
  await doc.transform(resample({ tolerance: 5e-4 }), prune({ keepLeaves: true }), dedup());
  dropOrphans(doc);
  const out = join(OUT, 'anims.glb');
  await io.write(out, doc);
  console.log(`anims         ${(statSync(out).size / 1024).toFixed(0)} KB  (${CLIPS.length} clips)`);
}
