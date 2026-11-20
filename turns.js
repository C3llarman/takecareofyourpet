/* Elk Leaf Arcade turn timer.
 *
 * One small script shared by the arcade pages and every game. It keeps track of whose turn it is,
 * shows a little timer pill, chimes a warning at one minute left, and when time runs out it rings a
 * loud chime, sends the player back to the arcade home screen and asks them to pass the device on.
 *
 * Include it with:  <script src="../turns.js" data-game defer></script>   (games)
 *                   <script src="turns.js" defer></script>                 (arcade pages)
 * Optional attributes: data-pos="top|bottom|top-left|top-right|bottom-left|bottom-right" and
 * data-offset="66" (pixels from that edge), to keep the pill clear of a game's own buttons, and
 * data-narrow="top:120" (position:offset) to use instead on screens under 600px wide (phones held upright).
 * Players can also drag the pill; each game remembers where it was dropped.
 *
 * Everything is stored in this browser's localStorage, so it works across every game on this device.
 */
(function () {
  'use strict';
  if (window.ElkTurns) return;

  var KEY = 'elkleaf_turns_v1';
  var me = document.currentScript;
  var ROOT = new URL('./', me && me.src ? me.src : location.href).href;   // the arcade's home page
  var IS_GAME = !!(me && me.hasAttribute('data-game'));
  var NO_PILL = !!(me && me.hasAttribute('data-nopill'));
  var POS0 = (me && me.getAttribute('data-pos')) || (IS_GAME ? 'top' : 'bottom');
  var OFFSET0 = +((me && me.getAttribute('data-offset')) || 10);
  var NARROW = ((me && me.getAttribute('data-narrow')) || '').split(':');
  var POS = POS0, OFFSET = OFFSET0;
  var WARN_MS = 60 * 1000;          // warning chime this long before the end
  var LEAVE_S = 5;                  // seconds of "time's up" before going home (lets games save)
  var COLORS = ['#f2994a', '#7e5ff0', '#2fa36b', '#e2508c', '#2d8fd5', '#e0a514', '#d9573b', '#16a3a3'];

  /* ---------- state ---------- */
  // phase: 'off' | 'running' | 'paused' | 'handoff'
  function blank() { return { players: [], idx: 0, phase: 'off', endsAt: 0, left: 0, warned: false, pin: '' }; }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.players)) return Object.assign(blank(), s); } catch (e) {}
    return blank();
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} render(); }
  function cur(s) { return s.players[s.idx] || null; }
  function nextIdx(s) { return s.players.length ? (s.idx + 1) % s.players.length : 0; }
  function colorOf(i) { return COLORS[i % COLORS.length]; }
  function timeLeft(s) {
    if (s.phase === 'running') return Math.max(0, s.endsAt - Date.now());
    if (s.phase === 'paused') return s.left;
    return 0;
  }
  function fmt(ms) {
    var t = Math.ceil(ms / 1000), m = Math.floor(t / 60), sec = t % 60;
    if (m >= 60) return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    return m + ':' + String(sec).padStart(2, '0');
  }

  var api = {
    get: load,
    colorOf: colorOf,
    fmt: fmt,
    timeLeft: timeLeft,
    home: ROOT,
    setPlayers: function (players) { var s = load(); s.players = players; if (s.idx >= players.length) s.idx = 0; save(s); },
    setPin: function (pin) { var s = load(); s.pin = pin || ''; save(s); },
    start: function (idx) {
      var s = load(); if (!s.players.length) return;
      s.idx = Math.max(0, Math.min(idx || 0, s.players.length - 1));
      s.phase = 'running'; s.endsAt = Date.now() + s.players[s.idx].min * 60000; s.warned = false; save(s);
    },
    startNext: function () { var s = load(); api.start(s.phase === 'handoff' ? s.next : nextIdx(s)); },
    pause: function () { var s = load(); if (s.phase !== 'running') return; s.left = timeLeft(s); s.phase = 'paused'; save(s); },
    resume: function () { var s = load(); if (s.phase !== 'paused') return; s.endsAt = Date.now() + s.left; s.phase = 'running'; save(s); },
    addTime: function (min) {
      var s = load(), ms = min * 60000;
      if (s.phase === 'running') s.endsAt += ms; else if (s.phase === 'paused') s.left += ms; else return;
      if (timeLeft(s) > WARN_MS) s.warned = false; save(s);
    },
    skip: function () { var s = load(); if (s.phase === 'off') return; handoff(s); },
    end: function () { var s = load(); s.phase = 'off'; s.endsAt = 0; s.left = 0; save(s); },
    chime: function () { chime(true); },
    unlockAudio: unlock
  };
  window.ElkTurns = api;

  /* ---------- sound ---------- */
  var actx = null;
  function unlock() {
    try {
      if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC(); }
      if (actx.state === 'suspended') actx.resume();
    } catch (e) {}
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, unlock, { capture: true, passive: true }); });

  function bell(t, f, vol, len) {
    var out = actx.createGain(); out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    out.gain.exponentialRampToValueAtTime(0.0001, t + len);
    out.connect(comp);
    [[1, 1], [2.76, 0.45], [5.4, 0.22], [0.5, 0.3]].forEach(function (p) {
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f * p[0]; g.gain.value = p[1];
      o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.05);
    });
  }
  var comp = null;
  // loud = the end-of-turn chime (rung three times); otherwise a gentle two-note warning
  function chime(loud) {
    unlock(); if (!actx) return;
    try {
      if (!comp) {
        comp = actx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
        var master = actx.createGain(); master.gain.value = 1; comp.connect(master); master.connect(actx.destination);
      }
      var t = actx.currentTime + 0.05;
      if (loud) {
        var notes = [784, 988, 1175, 1568];
        for (var r = 0; r < 3; r++) notes.forEach(function (f, i) { bell(t + r * 1.1 + i * 0.16, f, 0.9, 1.6); });
      } else {
        bell(t, 1175, 0.45, 1.0); bell(t + 0.22, 1568, 0.45, 1.2);
      }
    } catch (e) {}
    if (loud && navigator.vibrate) { try { navigator.vibrate([400, 150, 400, 150, 600]); } catch (e) {} }
  }

  /* ---------- turn ends ---------- */
  function handoff(s) {
    s.prev = s.idx; s.next = nextIdx(s);
    s.phase = 'handoff'; s.endsAt = 0; s.left = 0; save(s);
  }
  var leaving = false, expiring = false;
  function goHome(delayS) {
    if (leaving) return; leaving = true;
    var n = delayS;
    function step() {
      if (ui.leaveCount) ui.leaveCount.textContent = n > 0 ? 'Heading back to the arcade in ' + n + '…' : 'Heading back to the arcade…';
      if (n <= 0) { location.href = ROOT; return; }
      n--; setTimeout(step, 1000);
    }
    step();
  }

  function tick() {
    var s = load();
    if (s.phase === 'running') {
      var left = timeLeft(s);
      if (left <= 0) {
        var who = cur(s);
        expiring = true;   // stops render() from starting its own quieter hand-off first
        handoff(s);
        chime(true);
        showTimesUp(who, true);
        return;
      }
      if (left <= WARN_MS && !s.warned) { s.warned = true; save(s); chime(false); }
    }
    render();
  }

  /* ---------- UI (inside a shadow root so game styles can't reach it) ---------- */
  var ui = {};
  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:"Nunito","Avenir Next",system-ui,-apple-system,"Segoe UI",sans-serif}',
    '.pill{position:fixed;z-index:2147483646;display:flex;align-items:center;gap:8px;padding:6px 14px 6px 8px;border-radius:999px;',
    ' background:rgba(19,38,26,.88);color:#fff8ec;border:3px solid #13261a;box-shadow:0 4px 0 rgba(0,0,0,.35);',
    ' font-weight:900;font-size:16px;line-height:1;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;white-space:nowrap}',
    '.pill.drag{cursor:grabbing;opacity:.9}',
    '.pill .dot{width:22px;height:22px;border-radius:50%;border:2px solid #fff8ec;flex:none}',
    '.pill .t{font-variant-numeric:tabular-nums;color:#ffc93c;font-size:17px}',
    '.pill.warn{background:#c4601c;animation:pulse 1s ease-in-out infinite}',
    '.pill.warn .t{color:#fff8ec}',
    '.pill.paused .t{color:#cfe3d4}',
    '@keyframes pulse{50%{transform:scale(1.08)}}',
    '@media (prefers-reduced-motion:reduce){.pill.warn{animation:none}}',
    '.veil{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:20px;',
    ' background:radial-gradient(circle at 50% 40%,rgba(31,138,134,.96),rgba(19,38,26,.98) 70%);color:#fff8ec;text-align:center}',
    '.box{width:min(460px,100%);display:grid;gap:14px;justify-items:center}',
    '.big{font-family:"Lilita One","Chewy","Trebuchet MS",system-ui,sans-serif;font-weight:400;font-size:clamp(40px,11vw,64px);line-height:1;margin:0;text-shadow:0 4px 0 rgba(0,0,0,.3)}',
    '.sub{font-weight:800;font-size:19px;margin:0;color:#e4f3e8;line-height:1.4}',
    '.av{width:96px;height:96px;border-radius:50%;border:5px solid #fff8ec;display:grid;place-items:center;font-family:"Lilita One",system-ui,sans-serif;font-size:48px;color:#fff8ec;box-shadow:0 6px 0 rgba(0,0,0,.3)}',
    '.bell{font-size:64px;line-height:1;animation:ring .5s ease-in-out infinite alternate;transform-origin:50% 0}',
    '@keyframes ring{from{transform:rotate(-18deg)}to{transform:rotate(18deg)}}',
    '@media (prefers-reduced-motion:reduce){.bell{animation:none}}',
    '.go{font-family:"Lilita One",system-ui,sans-serif;font-size:26px;color:#1b2e22;background:#ffc93c;border:3px solid #13261a;border-radius:18px;',
    ' padding:14px 30px;box-shadow:0 6px 0 #13261a;cursor:pointer;margin-top:6px}',
    '.go:active{transform:translateY(3px);box-shadow:0 3px 0 #13261a}',
    '.go:focus-visible,.lnk:focus-visible{outline:4px solid #fff8ec;outline-offset:3px}',
    '.lnk{color:#ffc93c;font-weight:800;font-size:15px}',
    '.small{font-weight:800;font-size:15px;color:#cfe3d4;margin:0}'
  ].join('\n');

  function mount() {
    if (ui.root) return;
    // the arcade's headline font, for games that don't already load it
    if (!document.querySelector('link[href*="Lilita+One"]')) {
      var f = document.createElement('link'); f.rel = 'stylesheet';
      f.href = 'https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@800;900&display=swap';
      document.head.appendChild(f);
    }
    var host = document.createElement('div');
    host.id = 'elkleaf-turns';
    document.body.appendChild(host);
    ui.root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var st = document.createElement('style'); st.textContent = CSS; ui.root.appendChild(st);
  }

  function placePill(p) {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem('elkleaf_turns_pos:' + location.pathname)); } catch (e) {}
    p.style.top = p.style.bottom = p.style.left = p.style.right = ''; p.style.transform = '';
    var narrow = NARROW[0] && innerWidth < 600;
    POS = narrow ? NARROW[0] : POS0; OFFSET = narrow ? +(NARROW[1] || 10) : OFFSET0;
    if (saved && typeof saved.x === 'number') {
      p.style.left = Math.min(Math.max(0, saved.x), innerWidth - 60) + 'px';
      p.style.top = Math.min(Math.max(0, saved.y), innerHeight - 40) + 'px';
      return;
    }
    var off = OFFSET + 'px', safeT = 'calc(env(safe-area-inset-top,0px) + ' + off + ')', safeB = 'calc(env(safe-area-inset-bottom,0px) + ' + off + ')';
    if (POS.indexOf('top') === 0) p.style.top = safeT; else p.style.bottom = safeB;
    if (/left$/.test(POS)) p.style.left = '10px';
    else if (/right$/.test(POS)) p.style.right = '10px';
    else { p.style.left = '50%'; p.style.transform = 'translateX(-50%)'; }
  }

  function makePill() {
    var p = document.createElement('div');
    p.className = 'pill'; p.setAttribute('role', 'timer'); p.setAttribute('aria-live', 'off');
    p.innerHTML = '<span class="dot"></span><span class="n"></span><span class="t"></span>';
    ui.root.appendChild(p); ui.pill = p; placePill(p);
    // drag to move (a tap on an arcade page opens the turn timer page instead)
    var sx, sy, ox, oy, moved = false, down = false;
    p.addEventListener('pointerdown', function (e) {
      e.stopPropagation(); e.preventDefault(); down = true; moved = false;
      var r = p.getBoundingClientRect(); sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      try { p.setPointerCapture(e.pointerId); } catch (er) {}
    });
    p.addEventListener('pointermove', function (e) {
      if (!down) return; e.stopPropagation();
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      moved = true; p.classList.add('drag');
      var x = Math.min(Math.max(0, ox + dx), innerWidth - p.offsetWidth), y = Math.min(Math.max(0, oy + dy), innerHeight - p.offsetHeight);
      p.style.transform = ''; p.style.right = p.style.bottom = ''; p.style.left = x + 'px'; p.style.top = y + 'px';
    });
    p.addEventListener('pointerup', function (e) {
      if (!down) return; e.stopPropagation(); down = false; p.classList.remove('drag');
      if (moved) {
        try { localStorage.setItem('elkleaf_turns_pos:' + location.pathname, JSON.stringify({ x: parseFloat(p.style.left), y: parseFloat(p.style.top) })); } catch (er) {}
      } else if (!IS_GAME) location.href = ROOT + 'turns/';
    });
    p.addEventListener('pointercancel', function () { down = false; p.classList.remove('drag'); });
    ['click', 'touchstart', 'mousedown'].forEach(function (ev) { p.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    p.title = IS_GAME ? 'Turn timer (drag to move)' : 'Turn timer: tap for settings, drag to move';
  }

  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function initial(name) { return esc((Array.from(String(name).trim())[0] || '?').toUpperCase()); }

  function showVeil(html) {
    mount();
    if (!ui.veil) { ui.veil = document.createElement('div'); ui.veil.className = 'veil'; ui.root.appendChild(ui.veil); }
    ui.veil.setAttribute('role', 'dialog'); ui.veil.setAttribute('aria-modal', 'true');
    ui.veil.innerHTML = '<div class="box">' + html + '</div>';
    // swallow game input underneath
    ['pointerdown', 'pointerup', 'touchstart', 'mousedown', 'click', 'wheel'].forEach(function (ev) {
      ui.veil.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
    });
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
    try { if (IS_GAME && document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
  }
  function hideVeil() { if (ui.veil) { ui.veil.remove(); ui.veil = null; } }

  // Time ran out (or a game was opened while it's someone else's turn to start)
  function showTimesUp(who, live) {
    var s = load();
    expiring = false;
    if (!IS_GAME) { renderHandoff(s, live); return; }
    showVeil(
      '<div class="bell" aria-hidden="true">🔔</div>' +
      '<p class="big">' + (live ? 'Time’s up' + (who ? ', ' + esc(who.name) : '') + '!' : 'Hold on!') + '</p>' +
      '<p class="sub">' + (live ? 'Great playing. Your game is being saved.' : 'It’s time to pass the device to the next player.') + '</p>' +
      '<p class="small" data-leave></p>'
    );
    ui.leaveCount = ui.veil.querySelector('[data-leave]');
    // swallow keys so the game stops reacting
    window.addEventListener('keydown', function (e) { e.stopPropagation(); e.preventDefault(); }, true);
    goHome(live ? LEAVE_S : 2);
  }

  // On the arcade pages: "pass it to the next person"
  var handoffShown = false;
  function renderHandoff(s, live) {
    var prev = s.players[s.prev] || null, next = s.players[s.next] || null;
    if (!next) return;
    var solo = s.players.length === 1;
    showVeil(
      (prev ? '<p class="sub">' + (live ? '🔔 ' : '') + 'Time’s up, ' + esc(prev.name) + '!</p>' : '') +
      (solo
        ? '<p class="big">Break time!</p><p class="sub">Stretch, grab a drink, and come back when a grown-up says it’s time.</p>'
        : '<p class="big">Pass it to<br>' + esc(next.name) + '!</p>' +
          '<div class="av" style="background:' + colorOf(s.next) + '">' + initial(next.name) + '</div>' +
          '<p class="sub">' + esc(next.name) + ', you get ' + next.min + ' minute' + (next.min === 1 ? '' : 's') + '.</p>') +
      '<button class="go" type="button" data-go>' + (solo ? 'Start another turn' : 'I’m ' + esc(next.name) + '. Start my turn!') + '</button>' +
      '<a class="lnk" href="' + ROOT + 'turns/">Turn timer settings</a>'
    );
    handoffShown = true;
    var b = ui.veil.querySelector('[data-go]');
    b.addEventListener('click', function () { api.startNext(); hideVeil(); handoffShown = false; render(); });
    try { b.focus(); } catch (e) {}
  }

  function render() {
    if (!document.body) return;
    var s = load();
    if (s.phase === 'handoff') {
      if (ui.pill) ui.pill.style.display = 'none';
      if (IS_GAME) { if (!leaving && !expiring) showTimesUp(null, false); }
      else if (!handoffShown && !expiring) renderHandoff(s, false);
      return;
    }
    if (handoffShown) { hideVeil(); handoffShown = false; }
    if (NO_PILL || s.phase === 'off' || !cur(s)) { if (ui.pill) ui.pill.style.display = 'none'; return; }
    mount(); if (!ui.pill) makePill();
    var p = ui.pill, c = cur(s), left = timeLeft(s);
    p.style.display = 'flex';
    p.querySelector('.dot').style.background = colorOf(s.idx);
    p.querySelector('.n').textContent = c.name;
    p.querySelector('.t').textContent = s.phase === 'paused' ? '⏸ ' + fmt(left) : fmt(left);
    p.classList.toggle('warn', s.phase === 'running' && left <= WARN_MS);
    p.classList.toggle('paused', s.phase === 'paused');
    p.setAttribute('aria-label', c.name + '’s turn, ' + fmt(left) + ' left' + (s.phase === 'paused' ? ' (paused)' : ''));
  }

  function boot() {
    render();
    setInterval(tick, 500);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
    window.addEventListener('storage', function (e) { if (e.key === KEY) render(); });
    window.addEventListener('resize', function () { if (ui.pill) placePill(ui.pill); });
    window.addEventListener('pageshow', function () { leaving = false; tick(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
