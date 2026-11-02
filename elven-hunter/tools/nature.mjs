#!/usr/bin/env node
/**
 * Builds assets/nature.json: the trees, bushes, rocks and forest-floor props the
 * world is scattered with, from Quaternius's Ultimate Nature Pack (CC0,
 * https://quaternius.com). The source is fetched from a public mirror on GitHub.
 *
 *   node tools/nature.mjs [path/to/lowpoly_nature]
 *
 * Each model is flattened to one mesh and simplified per colour, so a tree costs a few
 * hundred triangles rather than two or three thousand (the world bakes ~1,500 of
 * them). Materials become a small palette, so no textures ship. Positions are
 * stored as 16-bit integers, indices as 16-bit, one palette index per triangle;
 * normals are rebuilt at load. The whole set is a few tens of KB.
 */
import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'https://github.com/flo-bit/tiny-planets';
const SUB = 'public/lowpoly_nature';

let SRC = process.argv[2];
if (!SRC) {
  const cache = join(ROOT, 'node_modules/.cache/quaternius-nature');
  if (!existsSync(join(cache, SUB, 'CommonTree_3.gltf'))) {
    mkdirSync(dirname(cache), { recursive: true });
    execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPO, cache], { stdio: 'inherit' });
    execFileSync('git', ['-C', cache, 'sparse-checkout', 'set', SUB], { stdio: 'inherit' });
  }
  SRC = join(cache, SUB);
}

/* What the game uses, and how hard each one is simplified: `tris` for the
   full-detail model drawn near the camera, `lo` for the stand-in further out.
   smooth: soft normals over shared corners (canopies, needles, bushes), matching the
   game's rounded look; otherwise hard facets (rocks, stumps, logs). */
const PROPS = {
  oak1:   { f: 'CommonTree_3', tris: 240, lo: 70, smooth: true },
  oak2:   { f: 'CommonTree_4', tris: 230, lo: 70, smooth: true },
  oak3:   { f: 'CommonTree_5', tris: 240, lo: 70, smooth: true },
  birch1: { f: 'BirchTree_1', tris: 240, lo: 70, smooth: true },
  birch2: { f: 'BirchTree_2', tris: 230, lo: 70, smooth: true },
  pine1:  { f: 'PineTree_2', tris: 170, lo: 50, smooth: true },
  pine2:  { f: 'PineTree_4', tris: 170, lo: 50, smooth: true },
  pine3:  { f: 'PineTree_5', tris: 170, lo: 50, smooth: true },
  dead1:  { f: 'CommonTree_Dead_1', tris: 160, lo: 50, smooth: true },
  bush1:  { f: 'Bush_1', tris: 90, lo: 30, smooth: true },
  bush2:  { f: 'Bush_2', tris: 90, lo: 30, smooth: true },
  berry:  { f: 'BushBerries_1', tris: 130, lo: 40, smooth: true },
  fern1:  { f: 'Plant_1', tris: 80, lo: 24, smooth: true },
  fern2:  { f: 'Plant_3', tris: 90, lo: 26, smooth: true },
  flower: { f: 'Plant_5', tris: 90, lo: 26, smooth: true },
  rock1:  { f: 'Rock_Moss_1', tris: 999, lo: 40, smooth: false },
  rock2:  { f: 'Rock_Moss_3', tris: 999, lo: 40, smooth: false },
  rock3:  { f: 'Rock_Moss_4', tris: 999, lo: 50, smooth: false },
  rock4:  { f: 'Rock_Moss_6', tris: 999, lo: 50, smooth: false },
  stump:  { f: 'TreeStump_Moss', tris: 110, lo: 40, smooth: false },
  log:    { f: 'WoodLog_Moss', tris: 150, lo: 50, smooth: false },
};

/* the pack's materials, as display colours matched to the game's palette
   (the game turns colour management off: values are shown as written) */
const PALETTE = {
  Green: [0.27, 0.45, 0.20], DarkGreen: [0.17, 0.33, 0.17], Brown: [0.33, 0.22, 0.15],
  White: [0.82, 0.82, 0.76], Black: [0.16, 0.15, 0.14], Gray: [0.44, 0.45, 0.47],
  Red: [0.72, 0.16, 0.14], Yellow: [0.86, 0.72, 0.30], Pink: [0.84, 0.46, 0.62],
  Cyan: [0.40, 0.70, 0.78], Mushroom_Top: [0.62, 0.26, 0.18], Mushroom_Bottom: [0.86, 0.78, 0.66],
};
const palNames = Object.keys(PALETTE);

await MeshoptSimplifier.ready;
const io = new NodeIO();
const out = { palette: palNames.map((n) => PALETTE[n]), props: {} };

const b64 = (ta) => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength).toString('base64');
function mul(m, x, y, z) {
  return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
}

for (const [key, spec] of Object.entries(PROPS)) {
  const doc = await io.read(join(SRC, spec.f + '.gltf'));
  // gather triangles per palette colour, in world space
  const groups = {};
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const M = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const name = prim.getMaterial()?.getName() || 'Green';
      const ci = palNames.indexOf(name); if (ci < 0) throw new Error(`${spec.f}: unknown material ${name}`);
      const pos = prim.getAttribute('POSITION'), idx = prim.getIndices();
      const g = groups[ci] || (groups[ci] = []);
      const n = idx ? idx.getCount() : pos.getCount();
      for (let i = 0; i < n; i++) {
        const v = pos.getElement(idx ? idx.getScalar(i) : i, []);
        g.push(...mul(M, v[0], v[1], v[2]));
      }
    }
  }
  // total triangles, to share the budget between colours
  let total = 0; for (const g of Object.values(groups)) total += g.length / 9;
  const keyOf = (x, y, z) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
  function build(target, err, lock) {
    const P = [], I = [], C = [];
    for (const [ci, soup] of Object.entries(groups)) {
      // weld by position (the pack is flat shaded, so every face has its own corners)
      const map = new Map(), verts = [], ind = [];
      for (let i = 0; i < soup.length; i += 3) {
        const k = keyOf(soup[i], soup[i + 1], soup[i + 2]);
        let id = map.get(k);
        if (id === undefined) { id = verts.length / 3; map.set(k, id); verts.push(soup[i], soup[i + 1], soup[i + 2]); }
        ind.push(id);
      }
      let tri = new Uint32Array(ind);
      const want = Math.max(6, Math.round(target * (ind.length / 3) / total)) * 3;
      if (want < tri.length) {
        const [s] = MeshoptSimplifier.simplify(tri, new Float32Array(verts), 3, want, err, lock ? ['LockBorder'] : []);
        if (s.length >= 6) tri = s;
      }
      // drop degenerate triangles, renumber what is left into the shared list
      const remap = new Map();
      for (let i = 0; i < tri.length; i += 3) {
        const a = tri[i], b = tri[i + 1], c = tri[i + 2];
        if (a === b || b === c || a === c) continue;
        for (const v of [a, b, c]) {
          let id = remap.get(v);
          if (id === undefined) { id = P.length / 3; remap.set(v, id); P.push(verts[v * 3], verts[v * 3 + 1], verts[v * 3 + 2]); }
          I.push(id);
        }
        C.push(+ci);
      }
    }
    return { P, I, C };
  }
  // the near model keeps its seams sealed; far away a hairline gap cannot be seen
  const hi = build(spec.tris, 0.08, true), lo = build(spec.lo, 0.25, false);
  // normalise: base at y=0, centred on the trunk (x/z of the bounding box centre)
  const P0 = hi.P;
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < P0.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P0[i + k]); mx[k] = Math.max(mx[k], P0[i + k]); }
  const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2, h = mx[1] - mn[1];
  const half = Math.max(mx[0] - cx, mx[2] - cz, h) || 1;
  const pack = (m) => {
    const Q = new Int16Array(m.P.length);
    for (let i = 0; i < m.P.length; i += 3) {
      Q[i] = Math.max(-32767, Math.min(32767, Math.round((m.P[i] - cx) / half * 32767)));
      Q[i + 1] = Math.max(-32767, Math.min(32767, Math.round((m.P[i + 1] - mn[1]) / half * 32767)));
      Q[i + 2] = Math.max(-32767, Math.min(32767, Math.round((m.P[i + 2] - cz) / half * 32767)));
    }
    if (m.P.length / 3 > 65535) throw new Error(key + ': too many vertices');
    return { p: b64(Q), i: b64(new Uint16Array(m.I)), c: b64(new Uint8Array(m.C)) };
  };
  out.props[key] = {
    s: +(half / h).toFixed(5),           // multiply by height to get the unit of Q
    w: +((Math.max(mx[0] - mn[0], mx[2] - mn[2])) / h).toFixed(4),    // width / height
    smooth: spec.smooth ? 1 : 0,
    ...pack(hi),
    lo: pack(lo),                        // the stand-in drawn past the near ring
  };
  console.log(`${key.padEnd(7)} ${spec.f.padEnd(18)} ${String(Math.round(total)).padStart(5)} -> ${String(hi.C.length).padStart(4)} / ${String(lo.C.length).padStart(3)} tris`);
}

const file = join(ROOT, 'assets', 'nature.json');
writeFileSync(file, JSON.stringify(out));
console.log(`nature.json   ${(statSync(file).size / 1024).toFixed(1)} KB`);
