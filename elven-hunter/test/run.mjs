#!/usr/bin/env node
/**
 * Headless test suite. Runs the real game in Chromium with software WebGL and
 * asserts against live game state.
 *
 * Every check here exists because something was once broken:
 *   - projectiles tunnelled through enemies on slow frames
 *   - arrows flew over enemies' heads when shooting downhill
 *   - the attack button sat under the iOS home-indicator strip
 *   - holding the stick sideways walked the player in circles
 *   - terrain normals faced down, so the ground was never lit
 *
 * Usage:  npm test
 */
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'file://' + join(ROOT, 'index.html');

const PHONE = { viewport: { width: 440, height: 786 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const LAPTOP = { viewport: { width: 1440, height: 860 }, deviceScaleFactor: 1 };

let passed = 0, failed = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { passed++; console.log(`  ✓ ${name}${detail ? '  ' + detail : ''}`); }
  else { failed++; console.log(`  ✗ ${name}${detail ? '  ' + detail : ''}`); }
};
const section = (s) => console.log(`\n${s}`);

async function open(browser, opts) {
  const page = await browser.newPage(opts);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(PAGE);
  await page.waitForFunction('window.__ready===true', { timeout: 60000 });
  page.__errors = errors;
  return page;
}

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

/* ---------------- world ---------------- */
section('World');
{
  const page = await open(browser, LAPTOP);
  const w = await page.evaluate(() => ({
    tris: Math.round(WORLDTRIS),
    landmarks: LANDMARKS.map((l) => l.name),
    spawnAboveWater: H(0, 6) > WATER,
    // the ground must face the sky: sample terrain normals straight from the mesh
    upward: (() => {
      const m = terrainMesh();
      let up = 0, total = 0;
      for (let i = 1; i < 600 * 3; i += 3) { total++; if (m.n[i] > 0) up++; }
      return up / total;
    })(),
  }));
  ok('world mesh builds', w.tris > 50000, `${w.tris} triangles in one draw call`);
  ok('four landmarks placed', w.landmarks.length === 4, w.landmarks.join(', '));
  ok('spawn is above water', w.spawnAboveWater);
  ok('terrain normals face up', w.upward === 1, `${Math.round(w.upward * 100)}% of sampled faces`);
  await page.close();
}

/* ---------------- gameplay ---------------- */
section('Gameplay');
{
  const page = await open(browser, LAPTOP);
  await page.evaluate(() => startRun());

  const start = await page.evaluate(() => ({ x: G.player.x, z: G.player.z }));
  // wait on game time, not wall time: software WebGL frame rates vary a lot
  const t0 = await page.evaluate(() => G.t);
  await page.keyboard.down('w');
  await page.waitForFunction((t) => G.t - t > 1.2, t0, { timeout: 60000 });
  await page.keyboard.up('w');
  const walked = await page.evaluate(([s]) => ({
    moved: Math.hypot(G.player.x - s.x, G.player.z - s.z),
    grounded: Math.abs(G.player.y - H(G.player.x, G.player.z)) < 0.3,
    animated: G.player.walkPhase > 1,
  }), [start]);
  ok('walks on the ground', walked.moved > 2 && walked.grounded, `${walked.moved.toFixed(1)} units`);
  ok('run cycle advances', walked.animated);

  const melee = await page.evaluate(() => {
    G.ents.length = 0;
    const y = G.player.yaw;
    spawnSpider(G.player.x + Math.sin(y) * 2, G.player.z + Math.cos(y) * 2, false);
    const sp = G.ents[0], hp0 = sp.hp;
    G.player.cdT = 0; doAttack();
    return { dealt: hp0 - sp.hp };
  });
  ok('melee connects', melee.dealt > 0, `${melee.dealt.toFixed(1)} damage`);

  const shot = await page.evaluate(() => new Promise((res) => {
    G.ents.length = 0;
    const y = G.player.yaw;
    spawnSpider(G.player.x + Math.sin(y) * 9, G.player.z + Math.cos(y) * 9, false);
    const sp = G.ents[0], hp0 = sp.hp;
    G.player.cdT = 0; doShoot();
    let n = 0;
    const tick = () => {
      n++;
      if (sp.hp < hp0) res({ hit: true, frames: n });
      else if (n > 60) res({ hit: false, frames: n });
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  ok('projectile hits at range', shot.hit, `after ${shot.frames} frames`);

  const xp = await page.evaluate(() => {
    G.ents.length = 0; G.player.xp = 0; G.player.level = 1;
    const y = G.player.yaw;
    spawnSpider(G.player.x + Math.sin(y) * 2, G.player.z + Math.cos(y) * 2, false);
    const before = G.player.xp;
    for (let i = 0; i < 14; i++) { G.player.cdT = 0; doAttack(); }
    const killXp = G.player.xp - before;
    G.ents.length = 0;
    spawnCocoon(G.player.x + Math.sin(y) * 2, G.player.z + Math.cos(y) * 2);
    const b2 = G.player.xp;
    for (let i = 0; i < 16; i++) { G.player.cdT = 0; doAttack(); }
    return { killXp, freeXp: G.player.xp - b2, allies: G.ents.filter((e) => e.kind === 'ally' || e.kind === 'freed').length };
  });
  ok('50 XP per kill', xp.killXp === 50, `got ${xp.killXp}`);
  ok('100 XP per rescue', xp.freeXp === 100, `got ${xp.freeXp}`);
  ok('rescue spawns a follower', xp.allies === 1);

  const ally = await page.evaluate(() => new Promise((res) => {
    G.ents.length = 0;
    spawnAlly(1, G.player.x + 2, G.player.z);
    const a = G.ents[0]; a.cheer = 0;
    spawnSpider(a.x + 2.5, a.z, false);
    const sp = G.ents[G.ents.length - 1], hp0 = sp.hp;
    const t0 = G.t;
    const wait = () => (G.t - t0 > 2.5 ? res({ engaged: sp.hp < hp0 || G.ents.indexOf(sp) < 0 }) : requestAnimationFrame(wait));
    requestAnimationFrame(wait);
  }));
  ok('followers fight', ally.engaged);

  const solid = await page.evaluate(() => {
    // stand the hunter on a tree trunk: collision must push her clear of it
    const c = COLL.find((k) => !k.box && k.r > 0.25);
    const o = { x: c.x + 0.05, z: c.z };
    collide(o, 0.42);
    // a crowd spawned on one spot must spread out rather than stack
    G.ents.length = 0;
    for (let i = 0; i < 5; i++) spawnSpider(G.player.x + 3, G.player.z + 3, false);
    for (let i = 0; i < 30; i++) separate();
    const sp = G.ents.filter((e) => e.kind === 'spider');
    let minD = 1e9;
    for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++)
      minD = Math.min(minD, Math.hypot(sp[i].x - sp[j].x, sp[i].z - sp[j].z));
    return { clear: Math.hypot(o.x - c.x, o.z - c.z) >= c.r + 0.42 - 1e-6, minD, colliders: COLL.length };
  });
  ok('trees and rocks are solid', solid.clear, `${solid.colliders} colliders`);
  ok('creatures do not stack', solid.minD > 0.8, `closest pair ${solid.minD.toFixed(2)} apart`);

  const skills = await page.evaluate(() => {
    G.player.level = 1; G.player.xp = 0; G.build.points = 0; G.build.skills = {};
    gainXp(5000, 0, 0, 0);
    const pts = G.build.points;
    skillScreen();
    const cards = document.querySelectorAll('.sk').length;
    document.querySelectorAll('.sk')[0].click();
    const spent = { pts: G.build.points, vigor: SK('vigor'), hp: G.S.maxHp };
    document.getElementById('close').click();
    return { pts, cards, spent, state: G.state };
  });
  ok('levelling grants points', skills.pts > 0, `${skills.pts} points`);
  ok('skill tree renders', skills.cards === 8, `${skills.cards} skills`);
  ok('points can be spent', skills.spent.vigor === 1 && skills.spent.pts === skills.pts - 1);
  ok('returns to play', skills.state === 'play');

  const death = await page.evaluate(() => {
    G.player.hp = 5; G.player.inv = 0;
    hurtPlayer(999, 'test');
    return { dead: G.player.dead, logged: TELE.deaths.length > 0 };
  });
  // the death screen follows a 1.5 s timer; software WebGL frames can delay it
  const ended = await page.waitForFunction(() => G.state === 'dead', null, { timeout: 10000 }).then(() => true, () => false);
  ok('death ends the run', death.dead && ended);
  ok('death is recorded for diagnostics', death.logged);

  ok('no runtime errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.close();
}

/* ---------------- touch controls ---------------- */
section('Touch controls (phone)');
{
  const page = await open(browser, PHONE);
  await page.evaluate(() => {
    startRun();
    window.PT = (t, i, x, y) => document.getElementById('gl')
      .dispatchEvent(new PointerEvent(t, { pointerId: i, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
  });
  await page.waitForTimeout(300);

  const layout = await page.evaluate(() => ({
    safeB: SAFEB,
    lowest: Math.max(...btns.map((b) => b.y + b.r)),
    h: H2,
    ids: btns.map((b) => b.id),
  }));
  ok('controls clear the iOS gesture strip', layout.lowest < layout.h - layout.safeB,
    `lowest control ${Math.round(layout.lowest)} of ${layout.h}, reserve ${layout.safeB}`);
  ok('attack button present', layout.ids.includes('attack'));

  const overlap = await page.evaluate(() => {
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
      const a = btns[i], b = btns[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < (a.r + b.r) * 0.75) return `${a.id}/${b.id}`;
    }
    return null;
  });
  ok('buttons do not overlap', overlap === null, overlap || '');

  const taps = await page.evaluate(() => {
    const r = {};
    for (const id of ['attack', 'shoot', 'jump']) {
      const b = btns.find((x) => x.id === id);
      G.ents.length = 0; G.player.cdT = 0; G.player.onGround = true; G.player.vy = 0;
      const before = { shots: G.ents.length, vy: G.player.vy, atk: IN.atkBuf };
      PT('pointerdown', 50, b.x, b.y); PT('pointerup', 50, b.x, b.y);
      r[id] = IN.atkBuf > 0 || IN.shotBuf > 0 || IN.jumpBuf > 0;
      IN.atkBuf = IN.shotBuf = IN.jumpBuf = 0;
    }
    return r;
  });
  ok('STRIKE registers', taps.attack);
  ok('SHOOT registers', taps.shoot);
  ok('JUMP registers', taps.jump);

  const stick = await page.evaluate(() => {
    PT('pointerdown', 7, 100, 560); PT('pointermove', 7, 104, 563);
    return new Promise((res) => setTimeout(() => {
      const drift = Math.hypot(IN.mx, IN.mz);
      PT('pointerup', 7, 104, 563);
      res({ drift, uiOpen: ui.classList.contains('on') });
    }, 400));
  });
  ok('stick has a dead zone', stick.drift === 0, 'a resting thumb does not drift');
  ok('lower-left does not open a menu', !stick.uiOpen);

  // the spiral regression: holding a direction must travel in a straight line
  const spiral = await page.evaluate(() => {
    const trial = (dx, dy) => new Promise((res) => {
      G.player.x = 0; G.player.z = 0; G.player.yaw = 0; G.cam.yaw = 0; G.cam.manual = 0;
      PT('pointerdown', 9, 110, 600); PT('pointermove', 9, 110 + dx, 600 + dy);
      const s = []; const t0 = performance.now();
      const tick = () => {
        s.push(G.player.yaw);
        if (performance.now() - t0 > 2600) { PT('pointerup', 9, 110 + dx, 600 + dy); res(s); }
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const turn = (s) => {
      let t = 0;
      for (let i = 1; i < s.length; i++) {
        let d = s[i] - s[i - 1];
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        t += d;
      }
      return Math.abs(t * 57.3);
    };
    return trial(60, 0).then((r) => ({ right: turn(r) }));
  });
  ok('holding sideways walks straight', spiral.right < 70, `${spiral.right.toFixed(0)}° of drift over 2.6s`);

  ok('no runtime errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.close();
}

/* ---------------- desktop controls ---------------- */
section('Keyboard & mouse (laptop)');
{
  const page = await open(browser, LAPTOP);
  ok('detects a pointer device', await page.evaluate(() => DESKTOP));
  ok('hides the thumb controls', (await page.evaluate(() => btns.length)) === 0);

  await page.evaluate(() => startRun());
  await page.waitForTimeout(300);
  await page.mouse.click(720, 430);
  const locked = await page.waitForFunction('window.LOCKED===true', { timeout: 4000 })
    .then(() => true).catch(() => false);
  ok('click captures the pointer', locked);

  const look = await page.evaluate(() => {
    const y0 = G.cam.yaw, p0 = G.cam.pitch;
    window.dispatchEvent(new MouseEvent('mousemove', { movementX: 120, movementY: 40, bubbles: true }));
    return { yaw: Math.abs(G.cam.yaw - y0), pitch: Math.abs(G.cam.pitch - p0) };
  });
  ok('mouse turns the camera', look.yaw > 0.1 && look.pitch > 0.05);

  const click = await page.evaluate(() => {
    G.ents.length = 0; G.player.cdT = 0;
    window.dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true }));
    const shootQueued = IN.shoot || IN.shotBuf > 0;
    window.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
    const strikeQueued = IN.attack || IN.atkBuf > 0;
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
    return { shootQueued, strikeQueued };
  });
  ok('left click strikes', click.strikeQueued);
  ok('right click shoots', click.shootQueued);

  const d0 = await page.evaluate(() => G.cam.dist);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(150);
  ok('wheel zooms', (await page.evaluate(() => G.cam.dist)) !== d0);

  await page.evaluate(() => { G.build.points = 2; });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  ok('Tab opens skills', (await page.evaluate(() => G.state)) === 'skills');
  await page.evaluate(() => { hide(); G.state = 'play'; });

  // strafing: D must carry the hunter to the right of the screen, A to the left
  // (the right-hand vector was once flipped, so the keys felt reversed)
  const strafe = async (key) => {
    const a = await page.evaluate(() => ({ x: G.player.x, z: G.player.z, t: G.t }));
    await page.keyboard.down(key);
    await page.waitForFunction((t) => G.t - t > 0.3, a.t, { timeout: 60000 });
    await page.keyboard.up(key);
    // view row 0 is the camera's screen-right axis in world space
    return page.evaluate(([x, z]) => (G.player.x - x) * view[0] + (G.player.z - z) * view[8], [a.x, a.z]);
  };
  const dRight = await strafe('d'), aLeft = await strafe('a');
  ok('D strafes right, A strafes left', dRight > 0.5 && aLeft < -0.5, `D ${dRight.toFixed(2)}, A ${aLeft.toFixed(2)} along screen-right`);

  // the minimap turns with the camera: ahead is up, screen-right is right
  const mm = await page.evaluate(() => {
    const y = G.cam.yaw, f = rotPt(Math.sin(y) * 10, Math.cos(y) * 10, y), r = rotPt(view[0] * 10, view[8] * 10, y);
    return { f, r };
  });
  ok('minimap shows what is ahead above the arrow', mm.f.y < -9 && Math.abs(mm.f.x) < 1);
  ok('minimap is not mirrored', mm.r.x > 9 && Math.abs(mm.r.y) < 1);

  // arrows fly point-first: the shaft lies along the flight path, it does not tumble
  const arrow = await page.evaluate(() => {
    G.ents.length = 0; MPI = 0; DRAW.length = 0;
    const e = { kind: 'shot', x: 0, y: 5, z: 0, vx: 20, vy: 2, vz: 10, proj: 'arrow', spin: 0 };
    pushShot(e);
    const m = DRAW[0][1], ax = [m[4], m[5], m[6]], L = Math.hypot(...ax), v = Math.hypot(20, 2, 10);
    return (ax[0] * 20 + ax[1] * 2 + ax[2] * 10) / (L * v);
  });
  ok('arrows point along their flight', arrow > 0.999, `alignment ${arrow.toFixed(4)}`);

  ok('no runtime errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.close();
}

/* ---------------- animated characters ---------------- */
section('Characters');
{
  const page = await open(browser, LAPTOP);
  await page.evaluate(() => startRun());
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => ({
    ready: MODELS_READY, models: Object.keys(MODELS).length, clips: Object.keys(CLIPS).length,
    playerActor: ACTOR_OF.has(G.player),
    ears: (() => { const a = ACTOR_OF.get(G.player); let n = 0; a && a.root.getObjectByName('head').children.forEach((c) => { if (c.isMesh) n++; }); return n; })(),
  }));
  ok('character models load', m.ready && m.models === 5, `${m.models} models, ${m.clips} clips (incl. upper/lower masks)`);
  ok('the hunter is a skinned model', m.playerActor);
  ok('an elf has ears', m.ears === 2);

  const layered = await page.evaluate(() => new Promise((res) => {
    G.ents.length = 0; G.player.cdT = 0; IN.mx = 0; doShoot();
    const a = ACTOR_OF.get(G.player); let n = 0;
    const tick = () => {
      const up = a.acts['1H_Ranged_Shoot@up'];
      if (up && up.getEffectiveWeight() > 0.3) res({ ok: true, ov: a.ov });
      else if (++n > 40) res({ ok: false, ov: a.ov });
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  ok('shooting plays an upper-body animation', layered.ok, layered.ov || 'none');

  const corpse = await page.evaluate(() => new Promise((res) => {
    G.ents.length = 0;
    const y = G.player.yaw;
    spawnGoblin(G.player.x + Math.sin(y) * 2, G.player.z + Math.cos(y) * 2, 'spear');
    hurtEnemy(G.ents[0], 1e6);
    const c = G.ents.find((e) => e.kind === 'corpse'), t0 = G.t;
    let died = false;
    const wait = () => {
      const a = ACTOR_OF.get(c); if (a && a.dead) died = true;
      if (G.ents.indexOf(c) < 0 || G.t - t0 > 4) res({ had: !!c, gone: G.ents.indexOf(c) < 0, died });
      else requestAnimationFrame(wait);
    };
    requestAnimationFrame(wait);
  }));
  ok('a slain goblin plays its death, then clears away', corpse.had && corpse.died && corpse.gone);

  const shadows = await page.evaluate(() => ({ on: R3.shadowMap.enabled, sun: SUN.castShadow, world: WORLD.receiveShadow }));
  ok('real shadows are on', shadows.on && shadows.sun && shadows.world);
  ok('no runtime errors', page.__errors.length === 0, page.__errors.join(' | '));
  await page.close();
}

/* ---------------- rendering budget ---------------- */
section('Rendering');
{
  const page = await open(browser, LAPTOP);
  await page.evaluate(() => startRun());
  await page.waitForTimeout(600);
  // real GPU draw calls, as counted by three.js for the last rendered frame
  const normal = await page.evaluate(() => ({ draws: R3.info.render.calls, parts: DRAW.length + SHAD.length, jsMs: JSMS }));
  ok('ordinary scene stays cheap', normal.draws < 80, `${normal.draws} draw calls (incl. shadow pass) for ${normal.parts} instanced parts`);
  ok('simulation cost is negligible', normal.jsMs < 3, `${normal.jsMs.toFixed(2)} ms/frame`);

  await page.evaluate(() => {
    G.ents.length = 0;
    for (let i = 0; i < 30; i++) { const a = i / 30 * 6.28, d = 5 + i % 18; spawnSpider(G.player.x + Math.cos(a) * d, G.player.z + Math.sin(a) * d, i % 9 === 0); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28, d = 6 + i % 14; spawnGoblin(G.player.x + Math.cos(a) * d, G.player.z + Math.sin(a) * d, 'spear'); }
  });
  await page.waitForTimeout(500);
  const horde = await page.evaluate(() => ({ draws: R3.info.render.calls, parts: DRAW.length + SHAD.length }));
  ok('level-of-detail caps a horde', horde.parts < 700, `${horde.parts} parts with 46 enemies`);
  // nearest 12 humanoids are skinned models (several parts each, drawn twice with
  // the shadow pass); the rest stay instanced, so the cost is capped, not per-enemy
  ok('a horde stays within the draw-call budget', horde.draws < 200, `${horde.draws} draw calls`);
  await page.close();
}

await browser.close();

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
