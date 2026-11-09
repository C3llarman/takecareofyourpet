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
 *   - on a phone, running forward after turning the view round spun the hunter
 *
 * Usage:  npm test
 */
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'file://' + join(ROOT, 'index.html');
const WATER_ = -1.6;

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
  ok('nine landmarks placed', w.landmarks.length === 9, w.landmarks.join(', '));
  ok('spawn is above water', w.spawnAboveWater);
  // the "objectives outside the map" bug: things were scattered over a square, but the
  // walkable land is a circle inside the mountains, so the corners were unreachable
  const reach = await page.evaluate(() => { startRun(); QUESTS.forEach((q) => { WILD.q[q.id] = { s: 'on', got: [] }; }); spawnQuestItems();
    const lim = WHALF * 0.95, bad = [];
    G.ents.forEach((e) => { if (e.z > CAVE.z0 || e.kind === 'critter' || e.kind === 'eagle') return;
      if (Math.hypot(e.x, e.z) > lim - 2 || Hn(e.x, e.z) > 0.9) bad.push(e.kind); });
    return { bad, n: G.ents.length, size: WSIZE }; });
  ok('everything you can find or fight is somewhere you can reach', reach.bad.length === 0, reach.bad.length ? reach.bad.join(', ') : `${reach.n} things, on a ${reach.size}-unit map`);
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
    // arrows now stick in trunks and rocks: shoot down a lane that is clear of them
    const p = G.player, clear = (a) => { for (let d = 0.5; d < 10; d += 0.25) {
      const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d; if (solidAt(x, z, 1.3)) return false; } return true; };
    for (let k = 0; k < 64 && !clear(p.yaw); k++) p.yaw += 0.1;
    G.cam.yaw = p.yaw;            // with the mouse captured, shots go where the camera looks
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
    const cards = document.querySelectorAll('.sk:not(.ab)').length;
    document.querySelectorAll('.sk:not(.ab)')[0].click();
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

  // the spin regression: after the view had been turned round a turn and a half, running
  // forward made the auto-camera fold the wrong way and whirl (1,263° in 4 s); and a stick
  // held a hair off straight slowly circled
  const spin = await page.evaluate(() => {
    G.ents = G.ents.filter((e) => !FOE[e.kind]);
    const trial = (camYaw, dx) => new Promise((res) => {
      const p = G.player; p.x = -40; p.z = 10; p.yaw = Math.atan2(Math.sin(camYaw), Math.cos(camYaw));
      G.cam.yaw = camYaw; G.cam.manual = 0; MREFset = false;
      PT('pointerdown', 9, 110, 600); PT('pointermove', 9, 110 + dx, 538);
      const s = []; const t0 = G.t;
      const tick = () => {
        s.push([G.cam.yaw, G.player.yaw]);
        if (G.t - t0 > 3) {
          PT('pointerup', 9, 110 + dx, 538);
          const turn = (k) => { let t = 0; for (let i = 1; i < s.length; i++) { let d = s[i][k] - s[i - 1][k];
            while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; t += d; } return Math.abs(t * 57.3); };
          res(Math.max(turn(0), turn(1)));
        } else requestAnimationFrame(tick);
      };
      tick();
    });
    return trial(12, 0).then((a) => trial(12, 10).then((b) => trial(0, 10).then((c) => ({ wound: a, both: b, off: c }))));
  });
  ok('running forward never spins you round', spin.wound < 10 && spin.both < 10, `${spin.wound.toFixed(0)}° / ${spin.both.toFixed(0)}° over 3s with the view turned 1.9 times`);
  ok('a stick a hair off straight runs straight', spin.off < 10, `${spin.off.toFixed(0)}° over 3s`);

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

  const keys = await page.evaluate(() => {
    IN.attack = false; IN.atkBuf = 0; IN.shoot = false; IN.shotBuf = 0; IN.shootHeld = false;
    const kd = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    const ku = (k) => window.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true }));
    kd('e'); const strike = IN.attack; ku('e'); const released = !IN.attack;
    kd('f'); const shoot = IN.shoot && IN.shootHeld; ku('f'); const stop = !IN.shootHeld;
    return { strike, released, shoot, stop };
  });
  ok('E strikes, F shoots (hold to repeat)', keys.strike && keys.released && keys.shoot && keys.stop);

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
    ready: MODELS_READY, models: Object.keys(MODELS).length, clips: Object.keys(CLIPS).length, spider: !!MODELS.spider && !!SPIDER_CLIPS.Walk,
    playerActor: ACTOR_OF.has(G.player),
    ears: (() => { const a = ACTOR_OF.get(G.player); let n = 0; a && a.root.getObjectByName('head').children.forEach((c) => { if (c.isMesh) n++; }); return n; })(),
  }));
  ok('character models load', m.ready && m.models === 8 && m.spider, `${m.models} models (5 heroes + 3 monsters), ${m.clips} clips (incl. upper/lower masks)`);
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
    spawnWasp(G.player.x + Math.sin(y) * 2, G.player.z + Math.cos(y) * 2);
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
  ok('a slain wasp plays its death, then clears away', corpse.had && corpse.died && corpse.gone);

  const shadows = await page.evaluate(() => ({ on: R3.shadowMap.enabled, sun: SUN.castShadow, world: WORLD.receiveShadow }));
  ok('real shadows are on', shadows.on && shadows.sun && shadows.world);
  ok('no runtime errors', page.__errors.length === 0, page.__errors.join(' | '));
  await page.close();
}

/* ---------------- the tavern ---------------- */
section('Tavern');
{
  const page = await open(browser, PHONE);
  ok('no diagnostic report on the title screen', await page.evaluate(() => !document.getElementById('diag2') && !/diagnostic/i.test(ui.textContent)));
  await page.evaluate(() => startRun());
  await page.waitForTimeout(300);
  const yard = await page.evaluate(() => {
    // nothing planted in the yard or on the path; the ground is level around the door
    const n = (r) => { let c = 0; for (let a = 0; a < 6.28; a += 0.2) for (let d = 1; d < r; d += 1) {
      const x = TAVERN.x + Math.cos(a) * d, z = TAVERN.z + Math.sin(a) * d; if (solidAt(x, z, 1.0)) c++; } return c; };
    const hs = []; for (let a = 0; a < 6.28; a += 0.5) hs.push(H(TAVERN.x + Math.cos(a) * 9, TAVERN.z + Math.sin(a) * 9));
    return { keeper: !!keeper(), noButtons: !btns.some((b) => b.id === 'dbg'),
      flat: Math.max(...hs) - Math.min(...hs), pathClear: [0, 0.2, 0.4, 0.6, 0.8, 0.95].every((t) => !solidAt(PATH_END.x * t * t, 4 + (PATH_END.z - 4) * t, 1.0)) };
  });
  ok('the innkeeper stands at the tavern', yard.keeper);
  const foes = await page.evaluate(() => { const k = {}; G.ents.forEach((e) => { if (FOE[e.kind]) k[e.kind] = (k[e.kind] || 0) + 1; });
    return { kinds: k, humans: G.ents.some((e) => e.kind === 'goblin') || typeof spawnGoblin !== 'undefined' }; });
  ok('every foe is a monster', !foes.humans && foes.kinds.spider > 0 && foes.kinds.snake > 0 && foes.kinds.wasp > 0, JSON.stringify(foes.kinds));
  ok('the tavern yard is level', yard.flat < 0.6, `${yard.flat.toFixed(2)} units of rise across the yard`);
  ok('the path to the tavern is clear', yard.pathClear);
  ok('no diagnostics button in the game', yard.noButtons);

  const talk = await page.evaluate(() => new Promise((res) => {
    const k = keeper(), p = G.player; G.ents = G.ents.filter((e) => !FOE[e.kind]);
    p.x = k.x + Math.sin(k.yaw) * 2.2; p.z = k.z + Math.cos(k.yaw) * 2.2; p.y = H(p.x, p.z); p.coins = 200;
    const t0 = G.t; const tick = () => { if (G.t - t0 > 0.3) res({ talk: !!G.talk }); else requestAnimationFrame(tick); }; tick();
  }));
  ok('walking up to Bram offers a talk', talk.talk);
  const atk = await page.evaluate(() => { const b = btns.find((b) => b.id === 'attack'); return [b.x, b.y]; });
  await page.touchscreen.tap(atk[0], atk[1]);
  await page.waitForTimeout(300);
  ok('the strike button talks to Bram', (await page.evaluate(() => G.state)) === 'talk');
  await page.click('.opt[data-o="work"]');
  await page.click('.opt[data-o="potion"]');
  const shop = await page.evaluate(() => ({ bounty: !!G.bounty, coins: G.player.coins, potions: G.player.potions, price: POTION_PRICE }));
  ok('Bram hands out a bounty and sells potions', shop.bounty && shop.coins === 200 - shop.price && shop.potions === 3, `${shop.coins} coins left`);
  await page.click('.opt[data-o="hire"]');
  await page.click('.opt[data-h]');
  ok('you can hire a companion', (await page.evaluate(() => G.ents.filter((e) => e.kind === 'ally').length)) === 1);
  const tick = await page.evaluate(() => { const b = G.bounty; const before = b.got; bountyTick(b.def.on); return b.got - before; });
  ok('bounty progress counts', tick === 1);

  await page.click('#hback');
  await page.evaluate(() => { G.build.points = 2; keeperScreen(); });
  await page.click('.opt[data-o="train"]');
  await page.click('.sk.can');
  const sk = await page.evaluate(() => ({ pts: G.build.points, shown: document.querySelector('.pts').textContent, state: G.state }));
  ok('spending a skill point takes, and the page updates', sk.pts === 1 && sk.shown === '1' && sk.state === 'skills', `${sk.shown} left`);
  await page.click('#close');
  ok('closing the menu returns to the wood', (await page.evaluate(() => G.state)) === 'play');
  ok('no runtime errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.close();
}

/* ---------------- the cottage, the farm, gear and saving ---------------- */
section('Home and progress');
{
  const page = await open(browser, LAPTOP);
  await page.click('#make'); await page.click('#go');
  await page.waitForTimeout(300);
  const pay = await page.evaluate(() => { G.ents = G.ents.filter((e) => !FOE[e.kind]); const p = G.player, c0 = p.coins;
    spawnSnake(p.x + 2, p.z + 2); hurtEnemy(G.ents[G.ents.length - 1], 1e6); return p.coins - c0; });
  ok('every kill pays coins', pay >= 3, `+${pay}`);
  const gear = await page.evaluate(() => { const p = G.player, m0 = G.S.melee; p.coins = 100; G.state = 'play'; keeperScreen(); keeperDo('gear');
    document.querySelector('.opt[data-g="w"]').click(); const r = { melee: G.S.melee / m0, coins: p.coins, tier: G.build.gear.w, price: GEAR_PRICE.w[0] }; menuClose(); return r; });
  ok('gear can be bought and makes you stronger', gear.tier === 1 && gear.melee > 1.14 && gear.coins === 100 - gear.price, `+${Math.round((gear.melee - 1) * 100)}% damage`);

  const locked = await page.evaluate(() => { const p = G.player; p.coins = 5000; G.state = 'play'; cottageScreen(); cottageDo('buy');
    const r = { owned: HOME.owned, btnOff: document.querySelector('.opt[data-o="buy"]').disabled }; menuClose(); return r; });
  ok('the cottage needs level 10', !locked.owned && locked.btnOff);
  const home = await page.evaluate(() => { const p = G.player; p.level = 10; recalc(); G.state = 'play'; cottageScreen(); cottageDo('buy');
    ['roof', 'door', 'yard', 'patch', 'well', 'patch2', 'hearth'].forEach((u) => cottageDo('up:' + u));
    cottageDo('plant:wheat'); const planted = HOME.plots.filter((q) => q.c === 'wheat').length;
    HOME.playT += 200; const before = p.coins; cottageDo('harvest'); const r = { owned: HOME.owned, ups: Object.keys(HOME.up).length, planted, earned: p.coins - before,
      tris: HOUSE3.geometry.attributes.position.count / 3, sell: CROPS.wheat.sell }; menuClose(); return r; });
  ok('at level 10 you can buy the cottage and fix it up', home.owned && home.ups === 7, `${home.ups} jobs done`);
  ok('crops grow and sell', home.planted === 8 && home.earned === 8 * home.sell, `8 plots of wheat: +${home.earned}`);

  // everything you own survives a reload
  await page.evaluate(() => { G.bounty = { def: BOUNTIES[0], n: 9, got: 4 }; saveGame(); });
  const saved = await page.evaluate(() => ({ lvl: G.player.level, coins: G.player.coins, gear: G.build.gear.w }));
  await page.reload(); await page.waitForFunction('window.__ready===true', { timeout: 60000 });
  const hasCont = await page.evaluate(() => !!document.getElementById('cont'));
  ok('the title offers to continue', hasCont);
  await page.click('#cont'); await page.waitForTimeout(400);
  const back = await page.evaluate(() => ({ lvl: G.player.level, coins: G.player.coins, gear: G.build.gear.w, owned: HOME.owned, ups: Object.keys(HOME.up).length,
    bounty: G.bounty && G.bounty.got, dHome: Math.hypot(G.player.x - HOUSE.x, G.player.z - HOUSE.z) }));
  ok('your hunter, coin, gear, bounty and cottage are saved', back.lvl === saved.lvl && back.coins === saved.coins && back.gear === saved.gear
    && back.owned && back.ups === 7 && back.bounty === 4, JSON.stringify({ lvl: back.lvl, coins: back.coins }));
  ok('you carry on at your own hearth', back.dHome < 8);
  await page.evaluate(() => { G.player.inv = 0; hurtPlayer(1e6, 'test'); });
  await page.waitForFunction(() => G.state === 'dead', null, { timeout: 10000 });
  await page.click('#again'); await page.waitForTimeout(200);
  const woke = await page.evaluate(() => ({ state: G.state, full: G.player.hp === G.player.maxHp, kept: G.player.level, coins: G.player.coins }));
  ok('dying wakes you at home, keeping your level', woke.state === 'play' && woke.full && woke.kept === saved.lvl && woke.coins < saved.coins, `lost ${saved.coins - woke.coins} coins`);
  ok('no runtime errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.close();
}

/* ---------------- feel: sound, strafing, impact ---------------- */
section('Feel');
{
  const page = await open(browser, LAPTOP);
  await page.click('#make'); await page.click('#go');
  await page.mouse.click(720, 430);                     // a real click: unlocks audio, captures the mouse
  await page.waitForFunction('window.LOCKED===true', { timeout: 4000 }).catch(() => {});
  const music = await page.waitForFunction(() => SND.musicBuf && SND.musicSrc, null, { timeout: 20000 }).then(() => true).catch(() => false);
  const snd = await page.evaluate(() => ({ state: SND.ctx && SND.ctx.state, dur: SND.musicBuf ? SND.musicBuf.duration : 0 }));
  ok('sound starts on the first click', snd.state === 'running', snd.state || 'no context');
  ok('the music loop decodes and plays', music && snd.dur > 60, `${snd.dur.toFixed(1)} s loop`);
  const fxErr = await page.evaluate(() => {
    const errs = [];
    ['swing', 'hit', 'squish', 'bow', 'zap', 'throw', 'thunk', 'ehit', 'hurt', 'hissup', 'spiderdie', 'snakedie', 'waspdie', 'rattle', 'sting',
      'jump', 'land', 'step', 'dash', 'coin', 'potion', 'pickup', 'levelup', 'fairy', 'freed', 'discover', 'death', 'click']
      .forEach((n) => { try { SND.last = {}; SND.voices = 0; sfx(n, G.player.x + 1, G.player.z + 1); } catch (e) { errs.push(n + ': ' + e.message); } });
    return errs;
  });
  ok('every sound effect plays', fxErr.length === 0, fxErr.join(' | ') || '28 synthesised effects');

  // strafing: with the mouse captured, the hunter keeps facing the camera and steps sideways
  const wait = (s) => page.evaluate(() => G.t).then((t0) => page.waitForFunction(([t, s]) => G.t - t > s, [t0, s], { timeout: 60000 }));
  await page.evaluate(() => { G.ents.length = 0; G.cam.yaw = 0.7; G.player.yaw = 0.7; });
  await page.keyboard.down('d'); await wait(0.6);
  const st = await page.evaluate(() => { const a = ACTOR_OF.get(G.player);
    return { yaw: G.player.yaw, cam: G.cam.yaw, clips: Object.keys(a.acts).filter((k) => a.acts[k].weight > 0.5) }; });
  await page.keyboard.up('d');
  ok('strafing keeps facing where you look', Math.abs(st.yaw - st.cam) < 0.05, `body ${st.yaw.toFixed(2)}, camera ${st.cam.toFixed(2)}`);
  ok('strafing plays the strafe animation', st.clips.some((c) => /Strafe_Right/.test(c)), st.clips.join(', '));
  await page.keyboard.down('s'); await wait(0.6);
  const back = await page.evaluate(() => { const a = ACTOR_OF.get(G.player); return Object.keys(a.acts).filter((k) => a.acts[k].weight > 0.5); });
  await page.keyboard.up('s');
  ok('backing away plays the backpedal', back.some((c) => /Walking_Backwards/.test(c)), back.join(', '));

  const hit = await page.evaluate(() => { G.ents.length = 0; FX.length = 0; const p = G.player;
    spawnSpider(p.x + Math.sin(G.cam.yaw) * 2, p.z + Math.cos(G.cam.yaw) * 2, false); p.cdT = 0; doAttack();
    return { stop: G.hitStop, fx: FX.length, shake: G.shakeA }; });
  ok('a landed blow has hit-stop, shake and sparks', hit.stop > 0 && hit.fx > 5 && hit.shake > 0.05, `${hit.fx} particles`);

  const stuck = await page.evaluate(() => new Promise((res) => { G.ents.length = 0; const p = G.player;
    G.ents.push({ kind: 'shot', x: p.x + 2, y: p.y + 0.5, z: p.z + 2, vx: 5, vy: -10, vz: 5, life: 2, aimed: 1, dmg: 1, pierce: 0, hits: [], proj: 'arrow', spin: 0 });
    const t0 = G.t; const tick = () => { if (G.t - t0 > 0.4) res(G.ents.map((e) => e.kind)); else requestAnimationFrame(tick); }; tick(); }));
  ok('a missed arrow sticks where it lands', stuck.includes('stuck'), stuck.join(', '));

  const sp = await page.evaluate(() => new Promise((res) => { G.ents.length = 0; const p = G.player;
    spawnSpider(p.x + 4, p.z + 4, false); G.ents[0].aggro = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => { const a = ACTOR_OF.get(G.ents[0]); res({ model: !!(a && a.creature === 'spider') }); })); }));
  ok('monsters near you are animated models', sp.model);

  ok('no runtime errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.close();
}

/* ---------------- the forest ---------------- */
section('Forest');
{
  const page = await open(browser, LAPTOP);
  await page.evaluate(() => startRun());
  await page.waitForTimeout(400);
  const f = await page.evaluate(() => {
    const near = PROPS3.filter((c) => Math.hypot(c.cx - G.cam.x, c.cz - G.cam.z) < LOD_NEAR);
    const far = PROPS3.filter((c) => { const d = Math.hypot(c.cx - G.cam.x, c.cz - G.cam.z); return d > LOD_NEAR + 5 && d < 130; });
    return { kinds: Object.keys(PROPN).length, props: Object.values(PROPN).reduce((a, b) => a + b, 0), chunks: PROPS3.length,
      nearHi: near.length > 0 && near.every((c) => c.hi.visible && !c.lo.visible),
      farLo: far.length > 0 && far.every((c) => c.lo.visible && !c.hi.visible) };
  });
  ok('the wood is planted with the nature pack', f.kinds >= 15 && f.props > 1500, `${f.props} props of ${f.kinds} kinds in ${f.chunks} chunks`);
  ok('near chunks draw full detail, far ones the stand-ins', f.nearHi && f.farLo);
  const trees = await page.evaluate(() => ({ n: ['pine1', 'pine2', 'pine3', 'oak1', 'oak2', 'oak3', 'birch1', 'birch2', 'dead1'].reduce((a, k) => a + (PROPN[k] || 0), 0), area: WS * WS }));
  const spread = await page.evaluate(() => { let min = 1e9; const T = TREEPOS; const g = {};
    T.forEach((t) => { const k = Math.floor(t[0] / 8) + ',' + Math.floor(t[1] / 8); (g[k] = g[k] || []).push(t); });
    T.forEach((t) => { const ix = Math.floor(t[0] / 8), iz = Math.floor(t[1] / 8);
      for (let i = ix - 1; i <= ix + 1; i++) for (let j = iz - 1; j <= iz + 1; j++) (g[i + ',' + j] || []).forEach((u) => { if (u !== t) min = Math.min(min, Math.hypot(u[0] - t[0], u[1] - t[1])); }); });
    return min; });
  ok('no thickets: every tree has room around it', spread >= 4, `closest two trees ${spread.toFixed(1)} apart`);
  const coast = await page.evaluate(() => new Promise((res) => {
    const east = H(WHALF * 0.93, 0), west = H(-WHALF * 0.93, 0), north = H(0, -WHALF * 0.93);
    const p = G.player; p.x = SHORE.at.x; p.z = SHORE.at.z + 12; p.y = H(p.x, p.z); p.yaw = Math.PI / 2; G.cam.yaw = p.yaw; G.ents = G.ents.filter((e) => !FOE[e.kind]); p.inv = 1e9;
    KEY.d = false; KEY.w = true; const t0 = G.t;
    const tick = () => { if (G.t - t0 < 4) { requestAnimationFrame(tick); return; } KEY.w = false; res({ east, west, north, deep: H(p.x, p.z) }); }; tick(); }));
  ok('the east of the wood runs down to the sea; mountains hold the rest', coast.east < WATER_ - 3 && coast.west > 15 && coast.north > 15,
    `east ${coast.east.toFixed(1)}, west ${coast.west.toFixed(1)}, north ${coast.north.toFixed(1)}`);
  ok('you can wade into the shallows, not out to sea', coast.deep >= WATER_ - 1.0, `stopped where the water is ${(WATER_ - coast.deep + 0).toFixed(1)} deep`);
  ok('the wood is open, not a thicket', trees.n / trees.area < 500, `${trees.n} trees, ${Math.round(trees.n / trees.area)} per original map's worth of ground`);
  const size = (await import('node:fs')).statSync(PAGE.replace('file://', '')).size / 1024 / 1024;
  ok('the whole game stays small', size < 3.2, `${size.toFixed(2)} MB with models, forest and music`);
  await page.close();
}

/* ---------------- the wilder wood ---------------- */
section('Difficulty, bosses, the cave and the gnomes');
{
  const page = await open(browser, LAPTOP);
  await page.click('#make');
  ok('difficulty is chosen when you make a hunter', (await page.$$('.pick[data-kind="diff"]')).length === 3);
  await page.click('.pick[data-kind="diff"][data-k="hard"]');
  await page.click('#go'); await page.waitForTimeout(300);
  const diff = await page.evaluate(() => {
    const p = G.player; G.ents = G.ents.filter((e) => !FOE[e.kind]);
    const hard = G.build.diff;
    spawnSpider(p.x + 30, p.z, false); const hHard = G.ents[G.ents.length - 1].maxHp;
    p.inv = 0; const h0 = p.hp; hurtPlayer(10, 'test'); const dHard = h0 - p.hp;
    G.build.diff = 'easy'; spawnSpider(p.x + 30, p.z, false); const hEasy = G.ents[G.ents.length - 1].maxHp;
    p.inv = 0; p.hp = p.maxHp; const h1 = p.hp; hurtPlayer(10, 'test'); const dEasy = h1 - p.hp;
    p.hp = p.maxHp; G.build.diff = 'normal';
    return { hard, hp: hHard / hEasy, dmg: dHard / dEasy, cap: [DIFFS.easy.cap, DIFFS.normal.cap, DIFFS.hard.cap] };
  });
  ok('harder settings make foes tougher and harder-hitting', diff.hard === 'hard' && diff.hp > 1.5 && diff.dmg > 2, `hard: ×${diff.hp.toFixed(2)} health, ×${diff.dmg.toFixed(2)} damage`);
  ok('and there are more of them', diff.cap[0] < diff.cap[1] && diff.cap[1] < diff.cap[2], diff.cap.join(' / ') + ' at once');
  const pop = await page.evaluate(() => { startRun(); const k = {}; G.ents.forEach((e) => { if (FOE[e.kind]) k[e.cave ? 'in the cave' : e.kind] = (k[e.cave ? 'in the cave' : e.kind] || 0) + 1; }); return k; });
  ok('the wood is busy: spiders, snakes, wasps, grumps and a dragon', pop.spider > 40 && pop.shroom > 8 && pop.dragon === 1, JSON.stringify(pop));
  await page.evaluate(() => { G.state = 'skills'; skillScreen(); });
  await page.click('#diff');
  ok('difficulty can be changed mid-hunt', (await page.evaluate(() => G.build.diff)) === 'hard');
  await page.evaluate(() => { G.build.diff = 'normal'; menuClose(); });

  // the standing stones wake with time and kills, then call up the Warden
  const stones = await page.evaluate(() => new Promise((res) => {
    const p = G.player; G.ents = G.ents.filter((e) => !FOE[e.kind] || e.kind === 'dragon');
    WILD.stone.c = 0.98; for (let i = 0; i < 2; i++) stonesKill();
    p.x = STONES.x + 1.5; p.z = STONES.z + 1.5; p.y = H(p.x, p.z);
    const t0 = G.t; const tick = () => { if (G.t - t0 > 0.3) res({ full: WILD.stone.c >= 1, talk: G.talk && G.talk.tap }); else requestAnimationFrame(tick); }; tick();
  }));
  ok('the stones wake, and offer a summoning', stones.full && stones.talk === 'SUMMON', stones.talk || 'nothing to use');
  await page.evaluate(() => { G.talk.open(); });
  await page.click('.opt[data-o="summon"]');
  const warden = await page.evaluate(() => { const g = findKind('golem'); return g && { hp: g.hp, rising: g.riseT > 0, state: G.state }; });
  ok('laying a hand on the altar calls up the Stone Warden', warden && warden.rising && warden.state === 'play');
  const wdown = await page.evaluate(() => new Promise((res) => {
    const g = findKind('golem'), p = G.player, c0 = p.coins, t0 = G.t; p.inv = 99;
    const tick = () => { if (G.t - t0 < 2.6) { requestAnimationFrame(tick); return; }
      hurtEnemy(g, 1e7); res({ gone: !findKind('golem'), paid: p.coins - c0, tier: WILD.stone.tier, c: WILD.stone.c }); };
    tick();
  }));
  ok('the Warden pays well and the stones go back to sleep', wdown.gone && wdown.paid > 100 && wdown.tier === 1 && wdown.c === 0, `+${wdown.paid} coins`);

  // the crag: solid at its foot, a ramp to the top, a sleeping dragon who wakes when you climb up
  const crag = await page.evaluate(() => {
    let solid = 0, n = 0;
    for (let a = 0; a < 6.28; a += 0.05) { const ux = Math.cos(a), uz = Math.sin(a);
      if (ux * CRAG.rd[0] + uz * CRAG.rd[1] > 0.9) continue; n++;
      if (solidAt(CRAG.x + ux * (CRAG.r + 1.6), CRAG.z + uz * (CRAG.r + 1.6), 1)) solid++; }
    let step = 0, prev = null;
    for (let t = 0; t <= 1.0001; t += 0.02) { const al = CRAG.r - 2 + (CRAG.rl + 2) * t;
      const h = H(CRAG.x + CRAG.rd[0] * al, CRAG.z + CRAG.rd[1] * al); if (prev !== null) step = Math.max(step, Math.abs(h - prev)); prev = h; }
    const d = findKind('dragon');
    return { ring: solid / n, step, rise: CRAG.top - H(CRAG.x + CRAG.rd[0] * (CRAG.r + CRAG.rl), CRAG.z + CRAG.rd[1] * (CRAG.r + CRAG.rl)), asleep: d && d.state === 'sleep' };
  });
  ok('the crag is a cliff you cannot just walk up', crag.ring > 0.97, `${Math.round(crag.ring * 100)}% of its foot is solid`);
  ok('a ramp climbs to the top', crag.rise > 8 && crag.step < 1.0, `${crag.rise.toFixed(1)} units up, steepest step ${crag.step.toFixed(2)}`);
  ok('the dragon sleeps on his crag', crag.asleep);
  const dragon = await page.evaluate(() => new Promise((res) => {
    const p = G.player, d = findKind('dragon'); G.ents = G.ents.filter((e) => !FOE[e.kind] || e === d);
    p.x = CRAG.x + 2; p.z = CRAG.z + 7; p.y = H(p.x, p.z); p.inv = 999; p.hp = p.maxHp;
    const seen = new Set(), t0 = G.t;
    const tick = () => { seen.add(d.state);
      if (d.state === 'ground' && !seen.has('forced')) { seen.add('forced'); d.stT = 20; }
      if (G.t - t0 < 9) { requestAnimationFrame(tick); return; }
      const c0 = p.coins; hurtEnemy(d, 1e7);
      res({ states: [...seen], paid: p.coins - c0, cd: WILD.dragon.t, kills: WILD.dragon.kills, fire: G.ents.some((e) => e.proj === 'fire') || seen.has('fly') }); };
    tick();
  }));
  ok('climbing up wakes him; he fights on foot, then takes to the air', dragon.states.includes('wake') && dragon.states.includes('ground') && dragon.states.includes('fly'), dragon.states.join(' → '));
  ok('slaying the dragon pays a fortune, and he returns in time', dragon.paid > 400 && dragon.kills === 1 && dragon.cd > 0, `+${dragon.paid} coins`);

  // the cave: dark without a torch; Bram sells one; inside the light changes
  const mouth = await page.evaluate(() => new Promise((res) => {
    const p = G.player; WILD.torch = false; p.x = CRAG.mouth.x - 2; p.z = CRAG.mouth.z; p.y = H(p.x, p.z);
    const t0 = G.t; const tick = () => { if (G.t - t0 > 0.3) res(G.talk && G.talk.tap); else requestAnimationFrame(tick); }; tick();
  }));
  ok('without a torch the cave is too dark to enter', mouth === 'LOOK', mouth || 'nothing');
  await page.evaluate(() => { const p = G.player; p.coins = 100; G.state = 'play'; keeperScreen(); });
  await page.click('.opt[data-o="torch"]');
  ok('Bram sells a torch', await page.evaluate(() => WILD.torch && G.player.coins === 100 - TORCH_PRICE));
  await page.evaluate(() => { menuClose(); enterCave(); });
  await page.waitForTimeout(400);
  const cave = await page.evaluate(() => ({ inCave: WILD.inCave, dark: SCENE.fog.far < 50 && !SKY.visible, torch: TORCH.intensity > 1,
    foes: G.ents.filter((e) => e.cave).length, floor: caveSD(G.player.x, G.player.z) < 0 }));
  ok('with a torch you go in: dark, lit by your flame', cave.inCave && cave.dark && cave.torch && cave.floor);
  ok('things live down there', pop['in the cave'] > 8, `${pop['in the cave']} cave dwellers`);
  const walls = await page.evaluate(() => { const p = G.player; p.x = CAVE.x; p.z = CAVE.z - 40;
    for (let i = 0; i < 200; i++) { p.x += 0.3; collide(p, 0.42); } return caveSD(p.x, p.z); });
  ok('cave walls are solid', walls < 0, `stopped ${(-walls).toFixed(2)} inside the wall line`);
  const hoard = await page.evaluate(() => { const p = G.player, c0 = p.coins; G.state = 'play'; chestScreen(); const got = p.coins - c0; menuClose();
    G.state = 'play'; chestScreen(); const again = p.coins - c0 - got; menuClose(); return { got, again }; });
  ok('the hoard pays once, then refills slowly', hoard.got > 150 && hoard.again === 0, `+${hoard.got} coins`);
  await page.evaluate(() => { leaveCave(); });
  await page.waitForTimeout(200);
  ok('leaving brings back the daylight', await page.evaluate(() => !WILD.inCave && SKY.visible && TORCH.intensity === 0));

  // whimsy: gnomes, toadstools, butterflies and rabbits
  const whim = await page.evaluate(() => new Promise((res) => {
    const p = G.player, g = G.ents.find((e) => e.kind === 'gnome'), c0 = p.coins, n0 = gnomeCount();
    p.x = g.x + 1; p.z = g.z; p.y = H(p.x, p.z);
    const t0 = G.t; const tick = () => { if (G.t - t0 < 0.3) { requestAnimationFrame(tick); return; }
      const gn = { found: gnomeCount() - n0, paid: p.coins - c0 };
      const b = BOUNCE[0]; p.x = b.x; p.z = b.z; p.y = H(p.x, p.z); p.onGround = true; p.vy = 0; p.bounceCd = 0;
      const t1 = G.t; let top = 0;
      const tick2 = () => { top = Math.max(top, p.y - H(p.x, p.z)); if (G.t - t1 < 1.2) { requestAnimationFrame(tick2); return; }
        res({ gn, top, critters: G.ents.filter((e) => e.kind === 'critter').length }); }; tick2(); }; tick();
  }));
  ok('a lost gnome is found and pays', whim.gn.found === 1 && whim.gn.paid > 20, `+${whim.gn.paid} coins`);
  ok('toadstools bounce you sky-high', whim.top > 4, `${whim.top.toFixed(1)} units up`);
  ok('butterflies and rabbits about the wood', whim.critters > 40, `${whim.critters}`);

  // all of it is saved
  await page.evaluate(() => saveGame());
  await page.reload(); await page.waitForFunction('window.__ready===true', { timeout: 60000 });
  await page.click('#cont'); await page.waitForTimeout(300);
  const kept = await page.evaluate(() => ({ torch: WILD.torch, gnomes: gnomeCount(), tier: WILD.stone.tier, dragon: WILD.dragon.kills, gnomeEnts: G.ents.filter((e) => e.kind === 'gnome').length, dEnt: !!findKind('dragon') }));
  ok('torch, gnomes, wardens and dragon are saved', kept.torch && kept.gnomes === 1 && kept.gnomeEnts === 6 && kept.tier === 1 && kept.dragon === 1 && !kept.dEnt, JSON.stringify(kept));
  ok('no runtime errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.close();
}

/* ---------------- legends: lore, mini-bosses, champions, armour ---------------- */
section('Lore, mini-bosses, champions and armour');
{
  const page = await open(browser, LAPTOP);
  await page.evaluate(() => { G.build.diff = 'normal'; startRun(); });
  await page.waitForTimeout(300);
  const start = await page.evaluate(() => ({ minis: G.ents.filter((e) => e.mini).map((e) => e.mini), champs: G.ents.filter((e) => e.elite).length,
    pages: loreCount(), total: LORE.length }));
  ok('five mini-bosses guard their homes', start.minis.length === 5, start.minis.join(', '));
  ok('golden champions roam on Normal', start.champs >= 4, `${start.champs} champions`);
  const easy = await page.evaluate(() => { G.build.diff = 'easy'; startRun(); const n = G.ents.filter((e) => e.elite).length; G.build.diff = 'normal'; startRun(); return n; });
  ok('but not on Easy', easy === 0);
  ok('the journal starts with the story of the wood', start.pages === 1 && start.total >= 30, `${start.total} pages to find`);

  const mini = await page.evaluate(() => new Promise((res) => {
    const q = G.ents.find((e) => e.mini === 'queen'), p = G.player; p.inv = 1e9;
    p.x = q.x + 6; p.z = q.z; p.y = H(p.x, p.z); q.abT = 0; q.ab2 = 0;
    const t0 = G.t; let webs = 0;
    const tick = () => { if (G.ents.some((e) => e.proj === 'web')) webs++;
      if (G.t - t0 < 2.5) { requestAnimationFrame(tick); return; }
      const brood = G.ents.filter((e) => e.minion === 'queen').length, c0 = p.coins;
      hurtEnemy(q, 1e8);
      res({ brood, webs, paid: p.coins - c0, lore: !!WILD.lore.queen, cd: WILD.minis.queen, big: q.scale }); };
    tick();
  }));
  ok('Vessa spits webs and calls her brood', mini.webs > 0 && mini.brood >= 2, `${mini.brood} spiderlings`);
  ok('a slain mini-boss pays, writes a journal page, and returns later', mini.paid > 100 && mini.lore && mini.cd > 0, `+${mini.paid} coins`);
  const champ = await page.evaluate(() => { const e = G.ents.find((x) => x.elite); const c0 = G.player.coins; hurtEnemy(e, 1e8); return { paid: G.player.coins - c0, lore: !!WILD.lore.champions }; });
  ok('a champion pays extra', champ.paid > 20 && champ.lore, `+${champ.paid} coins`);

  const lore = await page.evaluate(() => new Promise((res) => {
    const p = G.player, w = WAYSTONES[0]; G.ents = G.ents.filter((e) => !FOE[e.kind] || e.boss);
    p.x = w.x + 1.6; p.z = w.z; p.y = H(p.x, p.z);
    const t0 = G.t; const tick = () => { if (G.t - t0 < 0.3) { requestAnimationFrame(tick); return; }
      const tap = G.talk && G.talk.tap; if (G.talk) G.talk.open(); const read = !!WILD.lore.way1; menuClose();
      G.state = 'play'; keeperScreen(); keeperDo('story'); const tale = !!WILD.lore.bram1; menuClose();
      res({ tap, read, tale, pages: loreCount() }); }; tick();
  }));
  ok('waystones can be read into the journal', lore.tap === 'READ' && lore.read);
  ok('Bram tells his stories', lore.tale, `${lore.pages} pages written`);
  await page.evaluate(() => { G.state = 'play'; journalScreen(); });
  const jp = await page.evaluate(() => ({ written: document.querySelectorAll('.lp:not(.off):not(.qp)').length, empty: document.querySelectorAll('.lp.off:not(.qp)').length, total: LORE.length }));
  ok('the journal shows written pages and hints for the rest', jp.written === lore.pages && jp.empty === jp.total - lore.pages, `${jp.written} written, ${jp.empty} to find`);
  await page.evaluate(() => menuClose());

  // armour you can see: more pieces at each tier, gold and glowing at Legendary
  const armour = await page.evaluate(() => new Promise((res) => {
    const count = () => { const a = ACTOR_OF.get(G.player); let n = 0; a.root.traverse((o) => { if (o.isMesh && o.geometry && ARMGEO && Object.values(ARMGEO).includes(o.geometry)) n++; }); return { n, glow: a.glow.length }; };
    const r = {}; const tiers = [0, 1, 3, 5]; let i = 0;
    const step = () => { if (i >= tiers.length) { res(r); return; } G.build.gear = { w: tiers[i], a: tiers[i] }; recalc();
      const t0 = G.t; const wait = () => { if (G.t - t0 < 0.2) { requestAnimationFrame(wait); return; } r[tiers[i]] = count(); i++; step(); }; wait(); };
    step();
  }));
  ok('better armour shows on your hunter', armour[0].n === 0 && armour[1].n > 0 && armour[3].n > armour[1].n && armour[5].n > armour[3].n,
    `pieces by tier: ${[0, 1, 3, 5].map((t) => armour[t].n).join(' / ')}`);
  ok('legendary armour and weapons shine gold', armour[5].glow > 5, `${armour[5].glow} glowing parts`);

  // the dragon: proper wings and a head that opens its jaws
  const dragon = await page.evaluate(() => { const d = findKind('dragon'), out = []; d.state = 'ground'; d.breathT = 1; dragonRig(out, d, 1);
    return { wings: out.filter((r) => r[0] === 'wingIn' || r[0] === 'wingOut').length, parts: out.length, mouth: !!d.mouth }; });
  ok('the dragon has bat wings, horns, teeth and a jaw', dragon.wings === 4 && dragon.parts > 100 && dragon.mouth, `${dragon.parts} parts`);
  const enrage = await page.evaluate(() => new Promise((res) => { const d = findKind('dragon'), p = G.player; p.inv = 1e9;
    p.x = CRAG.x + 2; p.z = CRAG.z + 7; p.y = H(p.x, p.z); d.state = 'ground'; d.hp = d.maxHp * 0.3;
    const t0 = G.t; const tick = () => { if (G.t - t0 < 0.3) { requestAnimationFrame(tick); return; } res(!!d.enraged); }; tick(); }));
  ok('wounded, the dragon enrages', enrage);

  const before = await page.evaluate(() => { saveGame(); return loreCount(); });
  await page.reload(); await page.waitForFunction('window.__ready===true', { timeout: 60000 });
  await page.click('#cont'); await page.waitForTimeout(300);
  const kept = await page.evaluate(() => ({ pages: loreCount(), queenDown: WILD.minis.queen > 0 && !G.ents.some((e) => e.mini === 'queen') }));
  ok('journal and fallen mini-bosses are saved', kept.pages >= before && kept.queenDown, JSON.stringify(kept));
  ok('no runtime errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.close();
}

/* ---------------- folk: quest givers, gathering, crafting, the eagles ---------------- */
section('Folk, quests, gathering, crafting and the eagles');
{
  const page = await open(browser, PHONE);
  await page.evaluate(() => { startRun(); G.ents = G.ents.filter((e) => !FOE[e.kind] || e.boss); G.player.inv = 1e9; });
  await page.waitForTimeout(300);
  const folk = await page.evaluate(() => ({ npcs: G.ents.filter((e) => e.npcId).map((e) => e.npcId), eagle: G.ents.some((e) => e.kind === 'eagle' && e.sub === 'great'),
    nodes: G.ents.filter((e) => e.kind === 'node').length, quests: QUESTS.length,
    eyrieFar: Math.hypot(FOLKSITE.eyrie.x - CRAG.x, FOLKSITE.eyrie.z - CRAG.z) }));
  ok('Wren and Tobin keep camp, and Ærtheldor nests in the south', folk.npcs.includes('wren') && folk.npcs.includes('tobin') && folk.eagle, folk.npcs.join(', '));
  ok('the eyrie is across the map from the dragon', folk.eyrieFar > 200, `${Math.round(folk.eyrieFar)} units apart`);
  ok('there are things to gather', folk.nodes > 80, `${folk.nodes} patches of silverleaf, wood, ore, silk, honeycomb and glowcaps`);

  // walk up to Wren: talk, take her quest, gather, hand in, learn to craft
  const wren = await page.evaluate(() => new Promise((res) => {
    const w = folkEnt('wren'), p = G.player; p.x = w.x + 2; p.z = w.z + 1; p.y = H(p.x, p.z);
    const t0 = G.t; const tick = () => { if (G.t - t0 < 0.3) { requestAnimationFrame(tick); return; } res(G.talk && G.talk.tap); }; tick();
  }));
  ok('walking up to Wren offers a talk', wren === 'TALK');
  const atk = await page.evaluate(() => { const b = btns.find((b) => b.id === 'attack'); return [b.x, b.y]; });
  await page.touchscreen.tap(atk[0], atk[1]); await page.waitForTimeout(300);
  await page.click('.opt[data-o="accept"]');
  const gather = await page.evaluate(() => new Promise((res) => {
    menuClose(); const p = G.player, before = inv('herb');
    const nodes = G.ents.filter((e) => e.kind === 'node' && e.res === 'herb').slice(0, 4);
    let i = 0; const step = () => { if (i >= nodes.length) { res({ got: inv('herb') - before, regrow: nodes[0].t > 0 }); return; }
      const n = nodes[i++]; p.x = n.x; p.z = n.z; p.y = H(p.x, p.z); const t0 = G.t; const w = () => { if (G.t - t0 < 0.15) requestAnimationFrame(w); else step(); }; w(); };
    step();
  }));
  ok('walking over silverleaf gathers it, and it grows back', gather.got >= 3 && gather.regrow, `+${gather.got} silverleaf`);
  const handIn = await page.evaluate(() => { WILD.inv.herb = Math.max(5, inv('herb')); G.state = 'play'; folkScreen('wren');
    document.querySelector('.opt[data-o="turn"]').click(); return { done: qDone('w_leaf'), potion: !!WILD.recipes.potion, craft: !!document.querySelector('.opt[data-o="craft"]') }; });
  ok('handing in teaches you recipes and opens the workbench', handIn.done && handIn.potion && handIn.craft);
  await page.click('.opt[data-o="craft"]');
  const craft = await page.evaluate(() => { WILD.inv.herb = 2; WILD.inv.honey = 1; const p0 = G.player.potions; craftScreen();
    document.querySelector('.opt[data-r="potion"]').click(); return { potions: G.player.potions - p0, herb: inv('herb'), honey: inv('honey') }; });
  ok('crafting turns silverleaf and honeycomb into a potion', craft.potions === 1 && craft.herb === 0 && craft.honey === 0);
  const charm = await page.evaluate(() => { WILD.recipes.mantle = 1; WILD.inv.silk = 6; WILD.inv.herb = 2; const h0 = G.S.maxHp; craftScreen();
    document.querySelector('.opt[data-r="mantle"]').click(); const again = !!document.querySelector('.opt[data-r="mantle"]:not([disabled])'); menuClose();
    return { hp: G.S.maxHp - h0, again }; });
  ok('a crafted charm is a lasting upgrade, made once', charm.hp === 25 && !charm.again, `+${charm.hp} health`);

  // Tobin: lost parts lie in the world while his quest is open; the compass points at them
  const parts = await page.evaluate(() => { G.state = 'play'; acceptQuest(QUEST_BY.t_parts); const items = G.ents.filter((e) => e.kind === 'qitem' && e.qid === 't_parts');
    const marks = questTargets().length; items.forEach((it) => { G.player.x = it.x; G.player.z = it.z; updateQItem(it, 0.016, 0); });
    const ready = qReady(QUEST_BY.t_parts); finishQuest(QUEST_BY.t_parts); return { items: items.length, marks, ready, compass: WILD.compass, left: G.ents.filter((e) => e.qid === 't_parts').length }; });
  ok('Tobin\'s lost parts can be found and returned', parts.items === 4 && parts.ready && parts.left === 0, `${parts.items} parts`);
  ok('open quests are marked on the map, and the compass is your reward', parts.marks >= 4 && parts.compass === 1);
  const parcel = await page.evaluate(() => { acceptQuest(QUEST_BY.t_parcel); G.state = 'play'; keeperScreen(); const offered = !!document.querySelector('.opt[data-o="parcel"]');
    keeperDo('parcel'); menuClose(); return { offered, ready: qReady(QUEST_BY.t_parcel) }; });
  ok('a delivery: Tobin\'s parcel for Bram', parcel.offered && parcel.ready);

  // Ærtheldor's chain ends with Aelfrend
  await page.evaluate(() => setMode(false));            // page.click() moved a mouse, which switched to laptop controls
  const eagle = await page.evaluate(() => { const order = ['e_feathers', 'e_egg', 'e_scale', 'e_nest']; const seen = [];
    order.forEach((id) => { const q = QUEST_BY[id]; seen.push(giverQuest('eagle') === q); acceptQuest(q);
      if (q.goal.type === 'find') G.ents.filter((e) => e.kind === 'qitem' && e.qid === id).forEach((it) => { const d = findKind('dragon'); if (d) d.state = 'sleep'; updateQItem(it, 0.016, 0); });
      if (q.goal.type === 'bring') for (const k in q.goal.cost) WILD.inv[k] = (WILD.inv[k] || 0) + q.goal.cost[k];
      finishQuest(q); });
    return { inOrder: seen.every(Boolean), pet: !!findPet(), btn: btns.some((b) => b.id === 'fly') }; });
  ok('Ærtheldor\'s quests come one after another', eagle.inOrder);
  ok('and end with Aelfrend, who follows you', eagle.pet && eagle.btn, 'and a FLY button');
  const dive = await page.evaluate(() => new Promise((res) => { const p = G.player; p.x = 0; p.z = 10; p.y = H(0, 10); spawnSpider(p.x + 6, p.z, false);
    const sp = G.ents[G.ents.length - 1], h0 = sp.hp, t0 = G.t; const pet = findPet(); pet.cd = 0;
    const tick = () => { if (G.t - t0 < 4 && sp.hp === h0) { requestAnimationFrame(tick); return; } res({ hurt: h0 - sp.hp }); }; tick(); }));
  ok('Aelfrend dives on your foes', dive.hurt > 0, `${Math.round(dive.hurt)} damage`);
  const fly = await page.evaluate(() => { const b = btns.find((x) => x.id === 'fly'); return [b.x, b.y]; });
  await page.touchscreen.tap(fly[0], fly[1]); await page.waitForTimeout(300);
  ok('the FLY button asks where to', await page.evaluate(() => document.querySelectorAll('.opt[data-d]').length >= 4));
  await page.click('.opt[data-d="eyrie"]');
  await page.waitForFunction(() => G.flight && G.player.y > H(G.player.x, G.player.z) + 8, null, { timeout: 20000 });
  await page.waitForFunction(() => !G.flight, null, { timeout: 30000 });
  const landed = await page.evaluate(() => Math.hypot(G.player.x - FOLKSITE.eyrie.x, G.player.z - FOLKSITE.eyrie.z));
  ok('Aelfrend flies you back to the eyrie', landed < 14, `landed ${landed.toFixed(1)} from Ærtheldor`);

  const before = await page.evaluate(() => { saveGame(); return { q: Object.keys(WILD.q).length, inv: JSON.stringify(WILD.inv), eagle: WILD.eagle }; });
  await page.reload(); await page.waitForFunction('window.__ready===true', { timeout: 60000 });
  await page.click('#cont'); await page.waitForTimeout(300);
  const kept = await page.evaluate(() => ({ q: Object.keys(WILD.q).length, inv: JSON.stringify(WILD.inv), eagle: WILD.eagle, pet: !!findPet(), mantle: !!WILD.charms.mantle }));
  ok('quests, satchel, charms and Aelfrend are saved', kept.q === before.q && kept.inv === before.inv && kept.eagle && kept.pet && kept.mantle);
  ok('no runtime errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.close();
}

/* ---------------- the laptop HUD ---------------- */
section('Laptop HUD: frames, action bar, targets');
{
  const page = await open(browser, LAPTOP);
  await page.evaluate(() => { startRun(); G.ents = G.ents.filter((e) => !FOE[e.kind] || e.boss); });
  await page.waitForTimeout(300);
  const bar = await page.evaluate(() => { const p = G.player; p.potions = 2; p.hp = p.maxHp * 0.5; WILD.inv.cake = 1;
    const h0 = p.hp; uiKey('6'); const potion = p.hp > h0 && p.potions === 1; uiKey('7'); const cake = inv('cake') === 0 && p.buff === 3;
    return { potion, cake, slots: deskSlots().length, keys: deskSlots().map((s) => s.k).join('') }; });
  ok('the action bar has eight slots on keys 1–8', bar.slots === 8 && bar.keys === '12345678');
  ok('6 drinks a potion, 7 eats a honey cake', bar.potion && bar.cake);
  const tgt = await page.evaluate(() => new Promise((res) => { const p = G.player; p.yaw = 0; G.cam.yaw = 0;
    spawnSpider(p.x + 0.5, p.z + 8, false); spawnSnake(p.x - 4, p.z + 12);
    const t0 = G.t; const tick = () => { if (G.t - t0 < 0.3) { requestAnimationFrame(tick); return; }
      const auto = G.target && G.target.kind; cycleTarget(); const first = G.pick && G.pick.kind; cycleTarget(); const second = G.pick && G.pick.kind;
      res({ auto, first, second }); }; tick(); }));
  ok('the target frame shows what you face, with no clicking needed', tgt.auto === 'spider');
  ok('T picks the next foe, for those who want to', tgt.first && tgt.second && tgt.first !== tgt.second, `${tgt.first} → ${tgt.second}`);
  const click = await page.evaluate(() => { document.exitPointerLock && document.exitPointerLock(); LOCKED = false; drawHUD();
    const a = UIBAR.slots[5]; const p = G.player; p.potions = 1; p.hp = p.maxHp * 0.5; const used = uiClick(a.x + a.s / 2, a.y + a.s / 2); return used && p.potions === 0; });
  ok('with the cursor free, slots can be clicked', click);
  const log = await page.evaluate(() => { tip('hello log'); return LOG.length > 0 && LOG[LOG.length - 1].t === 'hello log'; });
  ok('tips and pickups go to the event log', log);
  ok('no runtime errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.close();
}

/* ---------------- abilities ---------------- */
section('Abilities');
{
  const page = await open(browser, LAPTOP);
  const res = await page.evaluate(() => new Promise((done) => {
    const out = {}; const classes = ['warrior', 'rogue', 'wizard']; let ci = 0;
    const nextClass = () => {
      if (ci >= classes.length) { done(out); return; }
      const cls = classes[ci++]; G.build.cls = cls; startRun(); G.ents = G.ents.filter((e) => !FOE[e.kind]);
      const p = G.player; p.inv = 1e9; p.x = 0; p.z = 8; p.y = H(0, 8); p.yaw = 0; G.cam.yaw = 0;
      const locked = abList().every((a, i) => !useAbility(i));
      p.level = 7; recalc();
      const r = { locked, hit: [], again: [] }; out[cls] = r; let i = 0;
      const nextAb = () => {
        if (i >= 3) { nextClass(); return; }
        G.ents = G.ents.filter((e) => !FOE[e.kind] && e.kind !== 'corpse');
        for (let k = 0; k < 5; k++) spawnSpider(p.x + (k - 2) * 1.4, p.z + 3.2, false);
        p.x = 0; p.z = 8; p.y = H(0, 8); p.yaw = 0; p.hp = p.maxHp * 0.5;
        const foes = G.ents.filter((e) => FOE[e.kind]), hp0 = foes.reduce((a, e) => a + e.hp, 0), php = p.hp;
        const used = useAbility(i); r.again.push(!useAbility(i));
        const t0 = G.t; const w = () => { if (G.t - t0 < 1.5) { requestAnimationFrame(w); return; }
          const hurt = foes.reduce((a, e) => a + Math.min(e.hp, e.maxHp) - Math.max(0, e.hp), 0) + (hp0 - foes.reduce((a, e) => a + Math.max(0, e.hp), 0));
          r.hit.push(used && (hp0 - foes.reduce((a, e) => a + Math.max(0, e.hp), 0) > 0 || foes.some((e) => e.stunT > 0 || e.slowT > 0) || p.hp > php || p.ward > 0));
          i++; nextAb(); }; w();
      };
      nextAb();
    };
    nextClass();
  }));
  for (const cls of ['warrior', 'rogue', 'wizard']) {
    const r = res[cls];
    ok(`${cls}: abilities wait for their level`, r.locked);
    ok(`${cls}: all three abilities work`, r.hit.every(Boolean), r.hit.map((h) => (h ? '✓' : '✗')).join(' '));
    ok(`${cls}: and then recharge`, r.again.every(Boolean));
  }
  const easy = await page.evaluate(() => { G.build.diff = 'easy'; const e = abCdFull(abList()[0]); G.build.diff = 'normal'; return e / abCdFull(abList()[0]); });
  ok('Easy recharges abilities faster', easy < 1, `×${easy.toFixed(2)}`);
  const unlock = await page.evaluate(() => { G.build.cls = 'rogue'; startRun(); const p = G.player; abTick(0.01); p.level = 2; abTick(0.01); return G.tip; });
  ok('a new ability announces itself', /Volley/.test(unlock || ''), unlock || '');
  ok('no runtime errors', page.__errors.length === 0, page.__errors.slice(0, 2).join(' | '));
  await page.close();
}
{
  const page = await open(browser, PHONE);
  const ph = await page.evaluate(() => { startRun(); const a = btns.filter((b) => b.ab).length; G.player.level = 7; recalc(); layoutButtons(); const b = btns.filter((x) => x.ab).length;
    let ov = null; for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const x = btns[i], y = btns[j]; if (Math.hypot(x.x - y.x, x.y - y.y) < (x.r + y.r) * 0.75) ov = x.id + '/' + y.id; }
    const low = Math.max(...btns.map((q) => q.y + q.r)); return { a, b, ov, clear: low < H2 - SAFEB }; });
  ok('on a phone each ability gets a button as it unlocks', ph.a === 0 && ph.b === 3);
  ok('ability buttons overlap nothing and clear the gesture strip', !ph.ov && ph.clear, ph.ov || '');
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
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28, d = 6 + i % 14; spawnBeast(G.player.x + Math.cos(a) * d, G.player.z + Math.sin(a) * d, i % 2 === 0); }
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
