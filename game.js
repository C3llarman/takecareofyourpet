// Acorn Run — game code.
// Sprite rects and the atlas path come from src/atlas.js, which must load first.
// Coordinates are "world units"; see BAND/MINW below for how they map to pixels.

(() => {
'use strict';

const R = ATLAS_RECTS;
const atlas = new Image();
let ready = false;
atlas.onload = () => { ready = true; };
atlas.src = ATLAS_SRC;

const cvs = document.getElementById('c');
const ctx = cvs.getContext('2d');
const safeEl = document.getElementById('safe');
const safeBEl = document.getElementById('safeb');
const FONT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", Nunito, system-ui, -apple-system, sans-serif';
const INK = '#3B2412';     // outline brown from the art
const CREAM = '#FFF3D6';

// ---- Tuning ----
const BAND = 480, MINW = 420;
const G = 2300, JUMP = 800, BASE = 230, MAXS = 470, ACCEL = 4;
const COYOTE = 0.09, BUFFER = 0.12, LEDGE = 18;
const JUMP2 = 760, FLIP_DUR = 0.42;
const SHOT_CD = 0.28, SHOT_VX = 560, SHOT_G = 380;
const CRATE_H = 33;
// sprite scales (world units per source pixel)
const TK = 0.72;   // terrain
const SK = 0.42;   // squirrel
const KK = 0.34;   // skunk
const AK = 0.3;    // acorn

// surf = source-pixel row where the grass/top surface is; depth = solid wall height in world units
const TERR = {
  island: { img: 'island_wide', surf: 21, cap: 44, depth: 80 },
  med:    { img: 'island_med',  surf: 15, depth: 55 },
  vine:   { img: 'island_vine', surf: 7,  depth: 40 },
  log:    { img: 'log_plat',    surf: 25, depth: 45 },
  stone:  { img: 'stone',       surf: 7,  depth: 50 },
  bridge: { img: 'bridge',      surf: 5,  depth: 6 },
  crate:  { img: 'crate',       surf: 4,  depth: 34, k: 0.44 },
};

let scale = 1, VW = 420, VH = 600, oy = 0, safeTop = 0, safeBot = 0, PX = 126, dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = window.innerWidth, h = window.innerHeight;
  cvs.width = Math.round(w * dpr);
  cvs.height = Math.round(h * dpr);
  scale = Math.min(cvs.height / BAND, cvs.width / MINW);
  VW = cvs.width / scale;
  VH = cvs.height / scale;
  oy = (VH - BAND) * 0.72;
  safeTop = safeEl.offsetHeight * dpr / scale;
  safeBot = safeBEl.offsetHeight * dpr / scale;
  PX = Math.min(VW * 0.3, 150);
}
window.addEventListener('resize', resize);
resize();

// ---- Helpers ----
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(str, x, y, size, fill, align = 'center', stroke = null, sw = 0, weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(str, x, y); }
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
}
// Draw a sprite so that its (ox, oy) fraction point lands on (x, y)
function drawSpr(name, x, y, k, ox = 0.5, oy = 1, flip = false, rot = 0, sy = 1) {
  const r = R[name];
  const dw = r[2] * k, dh = r[3] * k;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(flip ? -1 : 1, sy);
  ctx.drawImage(atlas, r[0], r[1], r[2], r[3], -ox * dw, -oy * dh, dw, dh);
  ctx.restore();
}

// ---- State ----
let state = 'title', time = 0, elapsed = 0, speed = BASE, camX = 0;
let dieT = 0, overT = 0, deathKind = '', lastDist = 0, newBest = false;
let acornCount = 0, bridgeNext = false, lastMain = null;
let shotCD = 0, btnFlash = 0, btnPress = 0;
const best = { acorns: 0, dist: 0 };
let player, plats, acorns, skunks, props, parts, pops, shots, platCount;

function makePlat(type, x, y, w) {
  const t = TERR[type];
  if (type !== 'island') w = R[t.img][2] * (t.k || TK);
  return { type, x, y, w, depth: t.depth };
}

function reset() {
  player = { x: 0, y: 360, vy: 0, onGround: true, plat: null, coyote: 0, buffer: 0, run: 0, rot: 0, landT: 0, hidden: false, throwT: 0, jumps: 0, flipT: 99 };
  plats = [makePlat('island', -300, 360, 900)];
  lastMain = plats[0];
  player.plat = plats[0];
  acorns = []; skunks = []; parts = []; pops = []; shots = [];
  props = [{ name: 'sign', x: -70, y: 363, k: 0.55 }, { name: 'flowers', x: -190, y: 363, k: 0.4 }];
  platCount = 0; acornCount = 0; elapsed = 0; speed = BASE; dieT = 0; overT = 0; bridgeNext = false;
  shotCD = 0; btnFlash = 0;
  camX = player.x - PX;
  for (let i = 0; i < 4; i++) acorns.push({ x: 260 + i * 38, y: 336, ph: i * 0.7 });
  spawnAhead();
}

function addCrates(p, d) {
  const cw = R.crate[2] * TERR.crate.k;
  const cx = rand(p.x + 100, p.x + p.w - 60);
  const stack = d > 0.3 && Math.random() < 0.3 ? 2 : 1;
  for (let i = 0; i < stack; i++) {
    const c = makePlat('crate', cx, p.y - CRATE_H * (i + 1));
    c.crate = true;
    plats.push(c);
  }
  const topY = p.y - CRATE_H * stack;
  acorns.push({ x: cx + cw / 2, y: topY - 30, ph: 1 });
  return { x0: cx - 22, x1: cx + cw + 22, topY };
}

function addPlatform() {
  const last = lastMain;
  platCount++;
  const d = clamp(elapsed / 70, 0, 1);            // difficulty ramps over ~70s
  const s = Math.max(speed, BASE);
  let p, adjacent = false, bigGap = false;

  if (bridgeNext) {
    bridgeNext = false; adjacent = true;
    p = makePlat('island', last.x + last.w - 6, last.y, rand(200, 320));
  } else if (last.type === 'island' && platCount > 3 && Math.random() < 0.14) {
    p = makePlat('bridge', last.x + last.w - 6, last.y);
    plats.push(p); lastMain = p;
    bridgeNext = true;
    for (let i = 0; i < 3; i++) acorns.push({ x: p.x + p.w * (i + 1) / 4, y: p.y - 24, ph: i * 0.7 });
    return;
  } else {
    const gapMax = lerp(0.3, 0.46, d) * s;
    bigGap = platCount > 5 && Math.random() < 0.12;          // needs the backflip
    const gap = bigGap ? rand(0.62, 0.74) * s : rand(Math.min(60, gapMax * 0.8), gapMax);
    const w = rand(lerp(190, 120, d), lerp(380, 260, d));
    const y = clamp(last.y + (bigGap ? rand(-40, 30) : rand(-85, 85)), 235, 395);
    const x = last.x + last.w + gap;
    p = w < 160 ? makePlat(pick(['med', 'log', 'stone', 'vine']), x, y) : makePlat('island', x, y, w);
  }
  plats.push(p); lastMain = p;

  // Acorn patterns
  const row = [];
  const r = Math.random();
  if ((r < 0.3 || bigGap) && !adjacent) {
    const x0 = last.x + last.w, x1 = p.x, top = Math.min(last.y, p.y) - (bigGap ? 165 : 75);
    const n = bigGap ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const base = lerp(last.y, p.y, t) - 30;
      acorns.push({ x: lerp(x0 - 20, x1 + 20, t), y: lerp(base, top, Math.sin(Math.PI * t)), ph: Math.random() * 6 });
    }
  } else if (r < 0.75) {
    const n = clamp(Math.floor((p.w - 40) / 40), 1, 5);
    const start = p.x + (p.w - (n - 1) * 38) / 2;
    for (let i = 0; i < n; i++) {
      const a = { x: start + i * 38, y: p.y - 24, ph: i * 0.7 };
      acorns.push(a); row.push(a);
    }
  } else if (r < 0.92) {
    const gold = platCount > 4 && Math.random() < 0.35;
    acorns.push({ x: p.x + p.w * 0.5, y: p.y - (gold ? 195 : 125), ph: 0, gold });
  }

  // Skunks on the bigger islands: grumpy ones, and friends in hats
  let hasSkunk = false;
  if (p.type === 'island' && platCount > 2 && p.w >= 200 && Math.random() < lerp(0.35, 0.7, d)) {
    const kind = Math.random() < 0.3 ? pick(['green', 'blue']) : 'bad';
    const minX = p.x + 26, maxX = p.x + p.w - 26;
    skunks.push({ kind, x: rand(p.x + 110, maxX), y: p.y, minX, maxX, dir: Math.random() < 0.5 ? -1 : 1,
                  sp: kind === 'bad' ? rand(30, 60) : rand(25, 45), ph: Math.random() * 6, alert: 0, walk: 0,
                  gifted: false, ko: false, vy: 0, rot: 0 });
    if (kind === 'bad') for (const a of row) a.y -= 95;   // hop over the grump to grab these
    hasSkunk = true;
  }

  // Crates to hop over (or break with an acorn)
  if (!hasSkunk && p.type === 'island' && platCount > 3 && p.w >= 200 && Math.random() < lerp(0.3, 0.5, d)) {
    const c = addCrates(p, d);
    for (const a of row) if (a.x > c.x0 && a.x < c.x1) a.y = c.topY - 30;
  }

  // Scenery
  if (p.type === 'island' && Math.random() < (hasSkunk ? 0.35 : 0.7)) {
    const name = pick(['mushroom', 'flowers', 'flowers', 'rocks']);
    props.push({ name, x: rand(p.x + 34, p.x + p.w - 34), y: p.y + 3, k: name === 'rocks' ? 0.32 : 0.4 });
  }
}

function spawnAhead() {
  while (lastMain.x + lastMain.w < camX + VW + 400) addPlatform();
}

function cull() {
  const edge = camX - 140;
  plats = plats.filter(p => p.x + p.w > edge || p === player.plat);
  acorns = acorns.filter(a => !a.taken && a.x > edge);
  skunks = skunks.filter(s => s.maxX + 40 > edge && s.y < VH - oy + 80 && !(s.kind === 'gone'));
  props = props.filter(p => p.x > edge);
}

// ---- Effects ----
function puff(x, y, n) {
  for (let i = 0; i < n; i++) parts.push({ type: 'dust', x: x + rand(-8, 8), y: y - 2, vx: rand(-60, 20), vy: rand(-40, -10),
    r: rand(2, 3.5), grow: 8, life: 0.35, max: 0.35, c: '#E8DDB5' });
}
function sparkle(x, y, gold) {
  for (let i = 0; i < (gold ? 16 : 7); i++) parts.push({ type: 'spark', x, y, vx: rand(-140, 140), vy: rand(-240, -60),
    r: rand(1.8, gold ? 3.6 : 3), life: 0.55, max: 0.55, c: pick(['#FFD85A', '#FFF3B0', '#F2B632']) });
}
function stink(x, y, n = 18) {
  for (let i = 0; i < n; i++) parts.push({ type: 'stink', x: x + rand(-10, 10), y: y + rand(-10, 10), vx: rand(-80, 80), vy: rand(-90, -10),
    r: rand(6, 12), grow: 18, life: rand(0.8, 1.3), max: 1.3, c: pick(['#D6DD8F', '#C5D07A', '#E3E7A6']) });
}
function splinters(x, y) {
  for (let i = 0; i < 14; i++) parts.push({ type: 'spark', x: x + rand(-12, 12), y: y + rand(-12, 12), vx: rand(-160, 200), vy: rand(-320, -80),
    r: rand(2, 4), life: 0.7, max: 0.7, c: pick(['#8A5A2B', '#B07A42', '#5C3A1A', '#C99A5E']) });
}
function splash(x, y) {
  for (let i = 0; i < 20; i++) parts.push({ type: 'spark', x: x + rand(-10, 10), y, vx: rand(-110, 110), vy: rand(-380, -120),
    r: rand(2, 4.5), life: 0.7, max: 0.7, c: pick(['#FFFFFF', '#CDEEFF', '#7FD0F5']) });
}
function hearts(x, y) {
  for (let i = 0; i < 5; i++) parts.push({ type: 'heart', x: x + rand(-14, 14), y: y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-80, -40),
    r: rand(4, 6), life: 0.9, max: 0.9, c: '#F2789B' });
}
function pop(x, y, txt, col = CREAM, size = 18) { pops.push({ x, y, t: 0, txt, col, size }); }

function die(kind, s) {
  if (state !== 'play') return;
  state = 'dying'; deathKind = kind; dieT = 0;
  if (kind === 'skunk') { player.vy = -640; stink(s.x - s.dir * 16, s.y - 34); }
  if (kind === 'fall') { splash(player.x + 4, waterY()); player.hidden = true; }
  if (navigator.vibrate) navigator.vibrate(60);
}

function finish() {
  state = 'over'; overT = 0;
  lastDist = Math.max(0, Math.floor(player.x / 30));
  newBest = acornCount > best.acorns;
  best.acorns = Math.max(best.acorns, acornCount);
  best.dist = Math.max(best.dist, lastDist);
}

// ---- River ----
const WK = 0.6;   // river tile scale
function riverTop() { return VH - R.water[3] * WK + 2; }       // screen space
function waterY() { return riverTop() + 18 - oy; }            // world space surface

// ---- Throwing ----
function btn() { return { x: 58, y: VH - 60 - safeBot, r: 38 }; }
function shoot() {
  if (state !== 'play') return;
  if (shotCD > 0) return;
  if (acornCount < 1) { btnFlash = 0.35; return; }
  acornCount -= 1;
  shots.push({ x: player.x + 22, y: player.y - 22, vx: speed + SHOT_VX, vy: -90, rot: 0 });
  shotCD = SHOT_CD; btnPress = 0.12; player.throwT = 0.15;
}
function breakCrate(c) {
  plats = plats.filter(p => p !== c);
  splinters(c.x + c.w / 2, c.y + CRATE_H / 2);
  acorns.push({ x: c.x + c.w / 2, y: c.y + 6, ph: 0 });
  for (const p of plats) if (p.crate && Math.abs(p.x - c.x) < 1 && p.y < c.y) p.y += CRATE_H;   // stack settles
  if (player.plat === c) { player.onGround = false; player.plat = null; player.coyote = COYOTE; }
}
function updateShots(dt) {
  for (const sh of shots) {
    sh.x += sh.vx * dt; sh.vy += SHOT_G * dt; sh.y += sh.vy * dt; sh.rot += 18 * dt;
    // skunks
    for (const s of skunks) {
      if (s.ko || sh.dead) continue;
      if (sh.x > s.x - 20 && sh.x < s.x + 22 && sh.y > s.y - 32 && sh.y < s.y) {
        sh.dead = true;
        if (s.kind === 'bad') {
          s.ko = true; s.vy = -420;
          acornCount += 3;
          pop(s.x, s.y - 48, '+3', '#FFD85A', 24);
          sparkle(s.x, s.y - 20, true); stink(s.x, s.y - 20, 6);
        } else {
          // knocked a friend's hat off: now it's grumpy
          parts.push({ type: 'hat', name: 'hat_' + s.kind, x: s.x + s.dir * 12, y: s.y - 44, vx: rand(60, 140), vy: -420,
            rot: 0, vr: rand(6, 10), life: 1.4, max: 1.4 });
          s.kind = 'bad'; s.gifted = true;
          pop(s.x, s.y - 58, 'Hey!', '#FFB4A8', 22);
        }
      }
    }
    if (sh.dead) continue;
    // crates break, other terrain stops the acorn
    for (const p of plats) {
      if (p.type === 'bridge') continue;
      const h = p.crate ? CRATE_H : p.depth;
      if (sh.x > p.x && sh.x < p.x + p.w && sh.y > p.y + (p.crate ? 0 : 4) && sh.y < p.y + h) {
        sh.dead = true;
        if (p.crate) breakCrate(p); else puff(sh.x, sh.y, 4);
        break;
      }
    }
    if (sh.x > camX + VW + 60 || sh.y > waterY()) sh.dead = true;
  }
  shots = shots.filter(s => !s.dead);
}

function backflip() {
  player.vy = -JUMP2; player.jumps = 2; player.flipT = 0; player.buffer = 0;
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * 2 * i / 10;
    parts.push({ type: 'dust', x: player.x + 4, y: player.y - 4, vx: Math.cos(a) * 110, vy: Math.sin(a) * 40 + 30,
      r: rand(2.5, 4), grow: 6, life: 0.35, max: 0.35, c: '#FFFFFF' });
  }
}

// ---- Update ----
function updateSkunk(s, dt) {
  if (s.ko) { s.vy += G * dt; s.y += s.vy * dt; s.rot += 7 * dt; return; }
  const dx = player.x - s.x;
  const near = s.kind === 'bad' && state === 'play' && Math.abs(dx) < 170;
  s.alert = clamp(s.alert + (near ? 5 : -2.5) * dt, 0, 1);
  if (near) s.dir = dx < 0 ? 1 : -1;               // grumps turn their tail toward the squirrel
  if (state === 'play' && !near) {
    s.x += s.dir * s.sp * dt; s.walk += dt;
    if (s.x < s.minX) { s.x = s.minX; s.dir = 1; }
    if (s.x > s.maxX) { s.x = s.maxX; s.dir = -1; }
  }
}

function updateParts(dt) {
  for (const p of parts) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.type === 'spark') p.vy += 500 * dt;
    else if (p.type === 'hat') { p.vy += 1100 * dt; p.rot += p.vr * dt; }
    else if (p.type !== 'heart') p.r += (p.grow || 0) * dt;
  }
  parts = parts.filter(p => p.life > 0);
  for (const q of pops) q.t += dt;
  pops = pops.filter(q => q.t < 0.8);
}

function findSupport(x, y) {
  for (const p of plats) if (Math.abs(p.y - y) < 3 && x + 14 > p.x && x - 8 < p.x + p.w) return p;
  return null;
}
function land(p) {
  player.y = p.y; player.vy = 0; player.onGround = true; player.plat = p; player.landT = 0.12;
  player.jumps = 0; player.flipT = 99;
  puff(player.x, p.y, 3);
}

function update(dt) {
  time += dt;
  btnFlash -= dt; btnPress -= dt;

  if (state === 'title') {
    camX = player.x - PX;
  } else if (state === 'play') {
    elapsed += dt;
    speed = Math.min(MAXS, BASE + elapsed * ACCEL);
    camX += speed * dt;
    player.run += dt;
    player.landT -= dt;
    player.throwT -= dt;
    player.flipT += dt;
    shotCD -= dt;

    // jump
    player.buffer -= dt;
    player.coyote -= dt;
    if (player.buffer > 0 && (player.onGround || player.coyote > 0)) {
      player.vy = -JUMP; player.onGround = false; player.plat = null;
      player.coyote = 0; player.buffer = 0; player.jumps = 1;
      puff(player.x, player.y, 4);
    }

    // horizontal: keep pace with the camera; catch up if something held us back
    const target = camX + PX;
    let nx = player.x < target - 0.5 ? Math.min(target, player.x + (speed + 90) * dt) : target;
    for (const p of plats) {
      if (p === player.plat) continue;
      if (player.x + 14 <= p.x + 1 && nx + 14 > p.x) {
        if (player.y > p.y && player.y <= p.y + LEDGE && player.vy >= -150) { land(p); break; } // ledge assist
        if (player.y > p.y + LEDGE && player.y - 28 < p.y + p.depth) nx = Math.min(nx, p.x - 14); // wall
      }
    }
    player.x = nx;

    // vertical
    if (player.onGround) {
      const p = player.plat;
      if (!(player.x + 14 > p.x && player.x - 8 < p.x + p.w)) {
        const next = findSupport(player.x, p.y);
        if (next) player.plat = next;
        else { player.onGround = false; player.plat = null; player.coyote = COYOTE; }
      }
      if (player.onGround) { player.y = player.plat.y; player.vy = 0; }
    }
    if (!player.onGround) {
      const prevY = player.y;
      player.vy += G * dt;
      player.y += player.vy * dt;
      if (player.vy >= 0) {
        for (const p of plats) {
          if (prevY <= p.y + 2 && player.y >= p.y && player.x + 14 > p.x && player.x - 8 < p.x + p.w) { land(p); break; }
        }
      }
    }

    for (const s of skunks) updateSkunk(s, dt);
    updateShots(dt);

    const pl = player.x - 11, pr = player.x + 19, pt = player.y - 28, pb = player.y - 2;
    for (const s of skunks) {
      if (s.ko) continue;
      if (pr > s.x - 18 && pl < s.x + 20 && pb > s.y - 24 && pt < s.y) {
        if (s.kind === 'bad') { die('skunk', s); break; }
        if (!s.gifted) { s.gifted = true; acornCount += 2; hearts(s.x, s.y - 50); pop(s.x, s.y - 60, '+2', '#FFD85A', 22); }
      }
    }
    for (const a of acorns) {
      if (a.taken) continue;
      const dx = a.x - (player.x + 4), dy = a.y - (player.y - 16);
      if (dx * dx + dy * dy < 28 * 28) {
        a.taken = true;
        const v = a.gold ? 5 : 1;
        acornCount += v;
        sparkle(a.x, a.y, a.gold);
        pop(a.x, a.y - 12, `+${v}`, v > 1 ? '#FFD85A' : CREAM, v > 1 ? 24 : 18);
      }
    }

    spawnAhead();
    cull();
    if (player.y > waterY()) die('fall');
    else if (player.x < camX - 16) die('behind');
  } else if (state === 'dying') {
    dieT += dt;
    if (deathKind !== 'fall') {
      player.vy += G * dt;
      player.y += player.vy * dt;
      player.rot += 8 * dt;
    }
    for (const s of skunks) updateSkunk(s, dt);
    updateShots(dt);
    if (dieT > (deathKind === 'fall' ? 0.7 : 1.1)) finish();
  } else if (state === 'over') {
    overT += dt;
  }
  updateParts(dt);
}

// ---- Drawing ----
function drawBackground() {
  const r = R.pano, sx = r[0] + 3, sw = r[2] - 6;
  const ph = clamp(VH * 0.62, 280, 560);
  const pk = ph / r[3], pw = sw * pk;
  const top = VH - ph;
  const g = ctx.createLinearGradient(0, 0, 0, top + 4);
  g.addColorStop(0, '#5DB5EA'); g.addColorStop(1, '#8CD6FB');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, top + 6);
  // far panorama, mirrored every other tile so the seams match
  const off = camX * 0.08;
  let i = Math.floor(off / pw);
  for (let x = i * pw - off; x < VW; x += pw, i++) {
    if (((i % 2) + 2) % 2 === 0) ctx.drawImage(atlas, sx, r[1] + 3, sw, r[3] - 3, x, top, pw + 1, ph);
    else {
      ctx.save(); ctx.translate(x + pw, top); ctx.scale(-1, 1);
      ctx.drawImage(atlas, sx, r[1] + 3, sw, r[3] - 3, 0, 0, pw + 1, ph);
      ctx.restore();
    }
  }
  ctx.fillStyle = 'rgba(160,215,245,0.15)';
  ctx.fillRect(0, 0, VW, VH);
  // mid-distance trees
  const sp = 120, p = 0.3, toff = camX * p;
  const i0 = Math.floor(toff / sp) - 1, i1 = Math.floor((toff + VW) / sp) + 1;
  for (let j = i0; j <= i1; j++) {
    const h1 = hash(j * 3.7 + 13), h2 = hash(j * 1.9 + 3);
    const name = h1 < 0.72 ? 'pines' : 'oak';
    const k = 0.6 + h2 * 0.35;
    drawSpr(name, j * sp + h1 * 50 - toff, VH - 30, k, 0.5, 1, h2 > 0.5);
  }
  ctx.fillStyle = 'rgba(160,215,245,0.3)';
  ctx.fillRect(0, 0, VW, VH);
  drawRiver();
}

function drawRiver() {
  const r = R.water;
  const dw = r[2] * WK, dh = r[3] * WK, top = riverTop();
  const off = camX * 0.9;
  let i = Math.floor(off / dw);
  for (let x = i * dw - off; x < VW; x += dw, i++) {
    if (((i % 2) + 2) % 2 === 0) ctx.drawImage(atlas, r[0], r[1], r[2], r[3], x, top, dw + 0.6, dh);
    else {
      ctx.save(); ctx.translate(x + dw, top); ctx.scale(-1, 1);
      ctx.drawImage(atlas, r[0], r[1], r[2], r[3], 0, 0, dw + 0.6, dh);
      ctx.restore();
    }
  }
  // gentle shimmer so the water feels alive
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let k = 0; k < 7; k++) {
    const sx = ((k * 97 + 40 - off * 0.3 + time * 30) % (VW + 60) + VW + 60) % (VW + 60) - 30;
    const sy = top + 26 + (k % 3) * 11 + Math.sin(time * 2 + k) * 2;
    ctx.fillRect(sx, sy, 14 + (k % 2) * 8, 2);
  }
}

function drawPlat(p) {
  const t = TERR[p.type];
  const k = t.k || TK;
  const [sx, sy, w, h] = R[t.img];
  const top = p.y - t.surf * k;
  const dh = h * k;
  if (p.type !== 'island') { ctx.drawImage(atlas, sx, sy, w, h, p.x, top, w * k, dh); return; }
  // three-slice: rounded caps + mirrored middle tiles for any width
  const capS = t.cap, capD = capS * TK;
  const midS = w - 2 * capS, midD = midS * TK;
  let x = p.x + capD, end = p.x + p.w - capD, i = 0;
  while (x < end - 0.1) {
    const seg = Math.min(midD, end - x), segS = seg / TK;
    if (i % 2 === 0) ctx.drawImage(atlas, sx + capS, sy, segS, h, x, top, seg + 0.6, dh);
    else {
      ctx.save(); ctx.translate(x + seg, top); ctx.scale(-1, 1);
      ctx.drawImage(atlas, sx + capS + midS - segS, sy, segS, h, 0, 0, seg + 0.6, dh);
      ctx.restore();
    }
    x += seg; i++;
  }
  ctx.drawImage(atlas, sx, sy, capS, h, p.x, top, capD + 0.6, dh);
  ctx.drawImage(atlas, sx + w - capS, sy, capS, h, p.x + p.w - capD - 0.3, top, capD + 0.3, dh);
}

function drawAcorn(a) {
  const y = a.y + Math.sin(time * 3 + a.ph) * 3;
  if (a.gold) {
    ctx.fillStyle = `rgba(255,226,120,${0.28 + 0.12 * Math.sin(time * 5)})`;
    circ(a.x, y, 22);
    drawSpr('acorn_gold', a.x, y, AK * 1.05, 0.5, 0.62);
  } else {
    drawSpr('acorn', a.x, y, AK, 0.5, 0.5);
  }
}

function drawSkunk(s) {
  let name;
  if (s.kind === 'bad') name = (s.alert > 0.5 && !s.ko) ? 'skunk_spray' : 'skunk_walk';
  else name = 'skunk_' + s.kind;
  const dw = R[name][2] * KK;
  const ox = 1 - 22 / dw;
  let bob = 0, rot = 0, sc = 1;
  if (s.ko) { rot = s.rot; }
  else if (name !== 'skunk_spray' && state === 'play') {
    const ph = s.walk * 10 + s.ph;
    bob = -Math.abs(Math.sin(ph)) * (s.kind === 'bad' ? 1.5 : 2.5); rot = Math.sin(ph) * 0.03;
  }
  if (name === 'skunk_spray') sc = 1 + Math.sin(time * 6 + s.ph) * 0.02;
  drawSpr(name, s.x, s.y + 2 + bob, KK, ox, 1, s.dir < 0, rot, sc);
}

function drawSquirrel() {
  const p = player;
  if (p.hidden) return;
  let name, rot = 0, bob = 0, sy = 1;
  if (state === 'title') { name = 'sq_idle'; sy = 1 + Math.sin(time * 3) * 0.015; }
  else if (state === 'dying' || state === 'over') { name = 'sq_hurt'; rot = p.rot; }
  else if (!p.onGround) {
    name = 'sq_jump';
    if (p.flipT < FLIP_DUR) {
      const u = p.flipT / FLIP_DUR;
      rot = -Math.PI * 2 * (0.5 - 0.5 * Math.cos(Math.PI * u));   // smooth full backflip
      const dh = R[name][3] * SK, cy = p.y - dh * 0.5;
      ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - u)})`; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(p.x + 2, cy, 30, rot - Math.PI / 2 + 1.7, rot - Math.PI / 2 + 3.4); ctx.stroke();
      drawSpr(name, p.x + 4, cy, SK, 1 - 22 / (R[name][2] * SK), 0.5, false, rot);
      return;
    }
    rot = clamp(p.vy / 2600, -0.25, 0.3);
  }
  else if (p.landT > 0) { name = 'sq_land'; }
  else {
    name = 'sq_run';
    const ph = p.run * 18;
    bob = -Math.abs(Math.sin(ph)) * 3.5; rot = Math.sin(ph * 2) * 0.035;
  }
  if (p.throwT > 0) rot -= 0.12;       // little lean-back on a throw
  const dw = R[name][2] * SK, dh = R[name][3] * SK;
  const ox = 1 - 22 / dw;              // keep the nose in the same spot across frames
  if (name === 'sq_hurt') drawSpr(name, p.x + 4, p.y - dh / 2, SK, ox, 0.5, false, rot);
  else drawSpr(name, p.x + 4, p.y + 2 + bob, SK, ox, 1, false, rot, sy);
}

function heart(x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.3, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  ctx.fill();
}

function drawParts() {
  for (const p of parts) {
    let a = clamp(p.life / p.max, 0, 1);
    if (p.type === 'hat') { drawSpr(p.name, p.x, p.y, KK, 0.5, 0.5, false, p.rot); continue; }
    if (p.type === 'stink') a *= 0.75;
    ctx.globalAlpha = a; ctx.fillStyle = p.c;
    if (p.type === 'heart') heart(p.x, p.y, p.r); else circ(p.x, p.y, p.r);
  }
  ctx.globalAlpha = 1;
  for (const s of shots) drawSpr('acorn', s.x, s.y, 0.24, 0.5, 0.5, false, s.rot);
  for (const q of pops) {
    ctx.globalAlpha = 1 - q.t / 0.8;
    text(q.txt, q.x, q.y - q.t * 40, q.size, q.col, 'center', INK, 5);
  }
  ctx.globalAlpha = 1;
}

function drawHUD() {
  const y = safeTop + 32;
  drawSpr('acorn', 26, y, 0.38, 0.5, 0.5);
  text(String(acornCount), 48, y + 2, 30, CREAM, 'left', INK, 7);
  text(`${Math.max(0, Math.floor(player.x / 30))} m`, VW - 18, y + 2, 20, CREAM, 'right', INK, 6);
  if (state !== 'play') return;
  // throw button
  const b = btn();
  const empty = acornCount < 1;
  const shake = btnFlash > 0 ? Math.sin(btnFlash * 60) * 4 : 0;
  const sc = btnPress > 0 ? 0.9 : 1;
  ctx.save();
  ctx.translate(b.x + shake, b.y);
  ctx.scale(sc, sc);
  ctx.globalAlpha = empty ? 0.5 : 1;
  ctx.fillStyle = 'rgba(59,36,18,0.35)'; circ(0, 4, b.r);
  ctx.fillStyle = '#9A6433'; circ(0, 0, b.r);
  ctx.lineWidth = 4; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.arc(0, 0, b.r - 2, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#B98050'; circ(0, -3, b.r - 9);
  drawSpr('acorn', 0, 0, 0.62, 0.5, 0.5, false, -0.25);
  if (shotCD > 0) {
    ctx.strokeStyle = 'rgba(255,243,214,0.9)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, b.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - shotCD / SHOT_CD)); ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (btnFlash > 0) text('No acorns', b.x, b.y - b.r - 16, 16, CREAM, 'center', INK, 5);
}

function drawTitle() {
  const cx = VW / 2;
  const ty = Math.max(safeTop + 70, oy + 60);
  ctx.save(); ctx.translate(cx, ty); ctx.rotate(-0.05);
  text('Acorn Run', 0, 0, 64, '#FFE7A8', 'center', INK, 12);
  ctx.restore();
  const lines = ['Tap to jump. Tap again to backflip.', 'Tap the acorn button to throw.', 'Skunks in hats are friends.', 'Grumpy skunks are trouble.'];
  lines.forEach((l, i) => text(l, cx, ty + 56 + i * 24, 17, CREAM, 'center', INK, 5, 700));
  ctx.globalAlpha = 0.55 + 0.45 * Math.sin(time * 4);
  text('Tap to start', cx, ty + 170, 24, CREAM, 'center', INK, 7);
  ctx.globalAlpha = 1;
}

function drawOver() {
  ctx.fillStyle = 'rgba(20,45,60,0.35)'; ctx.fillRect(0, 0, VW, VH);
  const w = Math.min(330, VW - 40), h = 250;
  const x = (VW - w) / 2, y = clamp(oy + 80, safeTop + 60, VH - h - 20);
  ctx.fillStyle = '#5C3A1A'; rr(x, y + 6, w, h, 20); ctx.fill();
  ctx.fillStyle = '#9A6433'; rr(x, y, w, h, 20); ctx.fill();
  ctx.strokeStyle = '#7A4A22'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let ly = y + 62; ly < y + h - 10; ly += 62) { ctx.moveTo(x + 12, ly); ctx.lineTo(x + w - 12, ly); }
  ctx.stroke();
  ctx.fillStyle = '#7DB43A'; rr(x + 12, y - 5, w - 24, 11, 5.5); ctx.fill();
  drawSpr('sq_hurt', x + w - 46, y - 2, 0.5, 0.5, 1);

  const cx = VW / 2;
  const head = deathKind === 'skunk' ? 'Skunked!' : deathKind === 'behind' ? 'Left behind!' : 'Splash!';
  let hs = 40;
  ctx.font = `800 ${hs}px ${FONT}`;
  while (ctx.measureText(head).width > w - 40 && hs > 20) { hs -= 2; ctx.font = `800 ${hs}px ${FONT}`; }
  text(head, cx, y + 40, hs, '#FFE7A8', 'center', INK, 6);

  const label = String(acornCount);
  ctx.font = `800 44px ${FONT}`;
  const lw = ctx.measureText(label).width;
  const gx = cx - (30 + 10 + lw) / 2;
  drawSpr('acorn', gx + 15, y + 104, 0.46, 0.5, 0.5);
  text(label, gx + 40, y + 106, 44, CREAM, 'left', INK, 6);
  text(`${lastDist} m`, cx, y + 148, 20, '#F7E2BD', 'center', null, 0, 700);

  if (newBest) text('New best!', cx, y + 178, 18, '#FFD85A', 'center', INK, 4);
  else text(`Best: ${best.acorns} ${best.acorns === 1 ? 'acorn' : 'acorns'}, ${best.dist} m`, cx, y + 178, 16, '#F7E2BD', 'center', null, 0, 700);

  if (overT > 0.5) {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 4);
    text('Tap to run again', cx, y + 220, 22, CREAM, 'center', INK, 5);
    ctx.globalAlpha = 1;
  }
}

function draw() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (!ready) {
    ctx.fillStyle = '#62B9EC'; ctx.fillRect(0, 0, VW, VH);
    text('Loading…', VW / 2, VH / 2, 22, CREAM, 'center', INK, 5);
    return;
  }
  drawBackground();
  ctx.save();
  ctx.translate(-camX, oy);
  const L = camX - 80, Rt = camX + VW + 80;
  for (const p of plats) if (!p.crate && p.x + p.w > L && p.x < Rt) drawPlat(p);
  for (const pr of props) if (pr.x > L && pr.x < Rt) drawSpr(pr.name, pr.x, pr.y, pr.k, 0.5, 1);
  for (const p of plats) if (p.crate && p.x + p.w > L && p.x < Rt) drawPlat(p);
  for (const a of acorns) if (!a.taken && a.x > L && a.x < Rt) drawAcorn(a);
  for (const s of skunks) if (s.x > L && s.x < Rt) drawSkunk(s);
  drawSquirrel();
  drawParts();
  ctx.restore();
  if (state === 'play' || state === 'dying') drawHUD();
  else if (state === 'title') drawTitle();
  else if (state === 'over') drawOver();
}

// ---- Input ----
function press() {
  if (!ready) return;
  if (state === 'title') { state = 'play'; return; }
  if (state === 'play') {
    if (!player.onGround && player.coyote <= 0 && player.jumps < 2) backflip();
    else player.buffer = BUFFER;
    return;
  }
  if (state === 'over' && overT > 0.5) { reset(); state = 'play'; }
}
cvs.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (state === 'play') {
    const b = btn();
    const wx = e.clientX * dpr / scale, wy = e.clientY * dpr / scale;
    if (Math.hypot(wx - b.x, wy - b.y) < b.r + 14) { shoot(); return; }
  }
  press();
});
window.addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); if (!e.repeat) press(); }
  else if (['KeyX', 'KeyF', 'Enter', 'ArrowRight'].includes(e.code)) { e.preventDefault(); if (!e.repeat) shoot(); }
});
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());

// ---- Loop ----
reset();
let lastT = performance.now();
function frame(now) {
  const dt = Math.min((now - lastT) / 1000, 1 / 30);
  lastT = now;
  if (ready) update(dt);
  draw();
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { lastT = performance.now(); });
requestAnimationFrame(frame);
})();
