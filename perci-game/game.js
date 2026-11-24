/* Perci Shorti vs BROKE-pilot: Dream Laser Tag (5v5). v2. (c) ZEV DOD. Vanilla JS, no build step. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const cvs = $('game'), ctx = cvs.getContext('2d');
const TOUCH = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
let DPR = 1, VW = 0, VH = 0, Z = 1;
function resize() {
  DPR = Math.min(TOUCH ? 1.75 : 2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
  cvs.width = Math.round(VW * DPR); cvs.height = Math.round(VH * DPR);
  // zoom out on small screens so phones see enough of the arena
  Z = Math.min(1, Math.max(0.5, Math.max(VW, VH) / 1350, Math.min(VW, VH) / 760));
  buildVignette();
}
addEventListener('resize', resize);

/* ---------------- data ---------------- */
const CHARS = {
  perci:   { name: 'PERCI',   role: 'Gold blaster. Tough. A little too relaxed.', speed: 205, rate: 0.26, dmg: 1, range: 560, spread: 0.05, shot: '#ffd60a', body: '#c81e32', hp: 4, ability: "LET'S GOOO!", abilityDesc: 'Rapid fire for 4s', cd: 12, stats: [3, 3, 4, 3] },
  miracle: { name: 'MIRACLE', role: 'A+ student. Fast trigger finger.',           speed: 235, rate: 0.17, dmg: 1, range: 520, spread: 0.07, shot: '#3fe0d8', body: '#2a9e9c', hp: 3, ability: 'A+ OVERRIDE', abilityDesc: 'Slows all bots for 4s', cd: 14, stats: [4, 4, 3, 3] },
  chatgpt: { name: 'CHATGPT', role: 'Calm. Knows too much. Long-range beam.',     speed: 195, rate: 0.55, dmg: 2, range: 820, spread: 0.0,  shot: '#00e6ff', body: '#0d2a3a', hp: 3, ability: 'LOG OUT',     abilityDesc: 'Teleport-dash forward', cd: 7, stats: [2, 2, 5, 3] },
  jessica: { name: 'JESSICA', role: 'Coder. Shots bounce off walls.',             speed: 225, rate: 0.24, dmg: 1, range: 600, spread: 0.04, shot: '#7cff6b', body: '#26262e', hp: 3, ability: 'SUDO HACK',   abilityDesc: 'Freezes the nearest bot 3s', cd: 10, stats: [3, 3, 3, 5], bounce: true },
  mixi:    { name: 'MIXI',    role: 'Smallest, fastest, level 99.',               speed: 270, rate: 0.21, dmg: 1, range: 480, spread: 0.08, shot: '#ff78c8', body: '#b48ce6', hp: 3, ability: 'LEVEL 99',    abilityDesc: 'Shield blocks all hits 3s', cd: 13, stats: [5, 3, 2, 4], small: true },
};
const ORDER = ['perci', 'miracle', 'chatgpt', 'jessica', 'mixi'];
const BOT_NAMES = ['BROKE-pilot', 'A+ Bot', 'The Grader', 'Show-Your-Work', 'Vacuum-Tron'];
const DIFF = { easy: { acc: 0.26, react: 0.6, mult: 0.75, speed: 0.92, mate: 0.2 }, normal: { acc: 0.12, react: 0.32, mult: 1, speed: 1.05, mate: 0.3 }, hard: { acc: 0.06, react: 0.18, mult: 1.5, speed: 1.15, mate: 0.38 } };
const MATCH_TIME = 120, RESPAWN = 3, WORLD = { w: 1800, h: 1200 };
const PICKUPS = {
  shield: { col: '#00e6ff', label: '+1 SHIELD' },
  rapid:  { col: '#ffd60a', label: 'RAPID FIRE!' },
  speed:  { col: '#7cff6b', label: 'SPEED BOOST!' },
  charge: { col: '#c070ff', label: 'POWER READY!' },
};

/* ---------------- assets ---------------- */
const IMG = {};
['perci', 'miracle', 'chatgpt', 'jessica', 'mixi', 'brokepilot'].forEach((k) => { const i = new Image(); i.src = 'assets/' + k + '_tok.png'; IMG[k] = i; });
IMG.aplus = new Image(); IMG.aplus.src = 'assets/aplus.png';
IMG.title = new Image(); IMG.title.src = 'assets/title.png';
IMG.title.onload = () => { STATIC = null; };

/* ---------------- audio (synth) ---------------- */
let AC = null, muted = localStorage.getItem('ps_muted') === '1';
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; }
function beep(f0, f1, dur, type = 'square', vol = 0.06) {
  if (muted) return; const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, a.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
const buzz = (ms) => { if (TOUCH && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} };
const SFX = { pew: () => beep(1400, 380, 0.09, 'square', 0.03), beam: () => beep(600, 1800, 0.18, 'sawtooth', 0.035), hit: () => { beep(220, 80, 0.12, 'triangle', 0.08); buzz(25); }, tag: () => { beep(880, 220, 0.25, 'sawtooth', 0.06); buzz(40); }, power: () => beep(300, 1200, 0.35, 'sine', 0.08), pick: () => { beep(900, 1600, 0.12, 'sine', 0.07); beep(1300, 2200, 0.1, 'sine', 0.04); }, win: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, f, 0.25, 'square', 0.05), i * 140)); }, lose: () => { [392, 330, 262].forEach((f, i) => setTimeout(() => beep(f, f * 0.95, 0.3, 'triangle', 0.07), i * 180)); } };

/* ---------------- arena ---------------- */
function buildWalls() {
  const W = WORLD.w, H = WORLD.h, w = [];
  const add = (x, y, ww, hh, kind = 'hay') => w.push({ x, y, w: ww, h: hh, kind });
  add(-60, -60, W + 120, 60, 'edge'); add(-60, H, W + 120, 60, 'edge'); add(-60, 0, 60, H, 'edge'); add(W, 0, 60, H, 'edge');
  const half = [[300, 220, 120, 60], [300, 920, 120, 60], [520, 520, 60, 160], [700, 300, 160, 50], [700, 850, 160, 50], [860, 560, 80, 80], [420, 380, 70, 70], [420, 750, 70, 70], [640, 100, 60, 110], [640, 990, 60, 110], [760, 470, 50, 50], [760, 680, 50, 50]];
  half.forEach(([x, y, ww, hh], i) => { add(x, y, ww, hh, i % 2 ? 'crate' : 'hay'); add(W - x - ww, y, ww, hh, i % 2 ? 'crate' : 'hay'); });
  add(880, 150, 40, 150, 'glitch'); add(880, 900, 40, 150, 'glitch');
  return w;
}
const WALLS = buildWalls();
const SOLID = WALLS.filter((w) => w.kind !== 'edge');

/* ---------------- navigation grid (A*) ---------------- */
const CELL = 30, GC = Math.ceil(WORLD.w / CELL), GR = Math.ceil(WORLD.h / CELL), INFL = 24;
const BLOCK = new Uint8Array(GC * GR);
for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) {
  const x = c * CELL + CELL / 2, y = r * CELL + CELL / 2;
  if (x < INFL || y < INFL || x > WORLD.w - INFL || y > WORLD.h - INFL) { BLOCK[r * GC + c] = 1; continue; }
  for (const w of SOLID) if (x > w.x - INFL && x < w.x + w.w + INFL && y > w.y - INFL && y < w.y + w.h + INFL) { BLOCK[r * GC + c] = 1; break; }
}
const cellOf = (x, y) => [Math.max(0, Math.min(GC - 1, Math.floor(x / CELL))), Math.max(0, Math.min(GR - 1, Math.floor(y / CELL)))];
function nearestFree(c, r) {
  if (!BLOCK[r * GC + c]) return [c, r];
  for (let rad = 1; rad < 8; rad++) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
    const cc = c + dc, rr = r + dr; if (cc < 0 || rr < 0 || cc >= GC || rr >= GR) continue; if (!BLOCK[rr * GC + cc]) return [cc, rr];
  }
  return [c, r];
}
const G_SCORE = new Float32Array(GC * GR), CAME = new Int32Array(GC * GR), STAMP = new Int32Array(GC * GR); let stampN = 0;
function astar(sx, sy, tx, ty) {
  let [sc, sr] = nearestFree(...cellOf(sx, sy)); const [tc, tr] = nearestFree(...cellOf(tx, ty));
  const start = sr * GC + sc, goal = tr * GC + tc; if (start === goal) return [{ x: tx, y: ty }];
  stampN++; const heap = [];
  const push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
  const h = (n) => { const dc = Math.abs((n % GC) - tc), dr = Math.abs(((n / GC) | 0) - tr); return (dc + dr) + (Math.SQRT2 - 2) * Math.min(dc, dr); };
  STAMP[start] = stampN; G_SCORE[start] = 0; CAME[start] = -1; push(start, h(start));
  let found = false, iter = 0;
  while (heap.length && iter++ < 4000) {
    const n = pop(); if (n === goal) { found = true; break; }
    const c = n % GC, r = (n / GC) | 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue; const cc = c + dc, rr = r + dr; if (cc < 0 || rr < 0 || cc >= GC || rr >= GR) continue;
      const m = rr * GC + cc; if (BLOCK[m]) continue;
      if (dr && dc && (BLOCK[r * GC + cc] || BLOCK[rr * GC + c])) continue; // no corner cutting
      const g = G_SCORE[n] + (dr && dc ? Math.SQRT2 : 1);
      if (STAMP[m] !== stampN || g < G_SCORE[m]) { STAMP[m] = stampN; G_SCORE[m] = g; CAME[m] = n; push(m, g + h(m)); }
    }
  }
  if (!found) return [];
  const path = []; let n = goal; while (n !== -1 && n !== start) { path.push({ x: (n % GC) * CELL + CELL / 2, y: ((n / GC) | 0) * CELL + CELL / 2 }); n = CAME[n]; }
  path.reverse(); path[path.length - 1] = { x: tx, y: ty }; return path;
}

/* ---------------- geometry ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function segHitsRect(x1, y1, x2, y2, w, pad = 0) {
  const rx = w.x - pad, ry = w.y - pad, rw = w.w + pad * 2, rh = w.h + pad * 2;
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy], q = [x1 - rx, rx + rw - x1, y1 - ry, ry + rh - y1];
  for (let i = 0; i < 4; i++) { if (p[i] === 0) { if (q[i] < 0) return false; } else { const t = q[i] / p[i]; if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } } }
  return true;
}
function clear(a, b, pad = 0) { for (const w of SOLID) if (segHitsRect(a.x, a.y, b.x, b.y, w, pad)) return false; return true; }
const los = (a, b) => clear(a, b, 0);
function pushOut(e) {
  for (let it = 0; it < 2; it++) for (const w of WALLS) {
    const cx = clamp(e.x, w.x, w.x + w.w), cy = clamp(e.y, w.y, w.y + w.h); const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= e.r * e.r) continue;
    if (d2 > 1e-4) { const d = Math.sqrt(d2); e.x += (dx / d) * (e.r - d); e.y += (dy / d) * (e.r - d); }
    else { const l = e.x - w.x, r = w.x + w.w - e.x, t = e.y - w.y, b = w.y + w.h - e.y, m = Math.min(l, r, t, b); if (m === l) e.x = w.x - e.r; else if (m === r) e.x = w.x + w.w + e.r; else if (m === t) e.y = w.y - e.r; else e.y = w.y + w.h + e.r; }
  }
}
function moveEnt(e, dx, dy) { const s = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8)); for (let i = 0; i < s; i++) { e.x += dx / s; e.y += dy / s; pushOut(e); } }

/* ---------------- state ---------------- */
let state = 'menu', pick = localStorage.getItem('ps_pick') || 'perci', diff = localStorage.getItem('ps_diff') || 'normal';
let autoFire = TOUCH && localStorage.getItem('ps_auto') !== '0';
let G = null;
const input = { keys: {}, mx: 0, my: 0, mdown: false, touchMove: null, touchAim: null, ability: false };

function newEntity(team, kind, i, isPlayer) {
  const c = team === 'P' ? CHARS[kind] : null;
  const base = team === 'P' ? { x: 120, y: 200 + i * 200 } : { x: WORLD.w - 120, y: 200 + i * 200 };
  return {
    team, kind, isPlayer, name: team === 'P' ? CHARS[kind].name : BOT_NAMES[i], spawn: { ...base }, x: base.x, y: base.y, vx: 0, vy: 0, a: team === 'P' ? 0 : Math.PI,
    r: c && c.small ? 17 : 21, hp: c ? c.hp : 3, maxhp: c ? c.hp : 3, cool: 0, dead: 0, abilityCd: 0, rapid: 0, shield: 2, frozen: 0, fast: 0, flash: 0, hurt: 0, bob: Math.random() * 6,
    stats: c || { speed: 200, rate: 0.36, dmg: 1, range: 560, spread: 0.06, shot: '#ff8c28', body: '#ff8c28' }, tags: 0, tagged: 0, shots: 0, hits: 0, picks: 0,
    ai: { target: null, think: Math.random() * 0.3, strafe: Math.random() < 0.5 ? 1 : -1, path: [], repath: 0, goal: null, chk: 0.5, lx: base.x, ly: base.y, escape: 0, ex: 0, ey: 0, react: 0, goalKind: '' },
  };
}

function startMatch() {
  const others = ORDER.filter((k) => k !== pick);
  const P = [newEntity('P', pick, 2, true)].concat(others.map((k, i) => newEntity('P', k, [0, 1, 3, 4][i], false)));
  const B = [0, 1, 2, 3, 4].map((i) => newEntity('B', 'bot', i, false));
  G = { ents: P.concat(B), player: P[0], bullets: [], parts: [], rings: [], pops: [], pickups: [], score: { P: 0, B: 0 }, time: MATCH_TIME, slow: 0, pickupT: 3, cam: { x: 0, y: 0 }, shake: 0, t: 0 };
  G.cam.x = G.player.x - VW / Z / 2; G.cam.y = G.player.y - VH / Z / 2;
  showScreen(null); $('hud').classList.add('on'); document.body.classList.add('playing'); if (document.activeElement) document.activeElement.blur(); state = 'play';
  feed("Match start! Tag BROKE-pilot's bots!"); banner('FIGHT!');
  if (TOUCH && VH > VW && !sessionStorage.getItem('ps_rot')) { sessionStorage.setItem('ps_rot', '1'); setTimeout(() => feed('Tip: turn your phone sideways for a wider view'), 1500); }
  if (ac() && AC.state === 'suspended') AC.resume();
  syncAutoBtn();
}

/* ---------------- HUD helpers ---------------- */
function feed(msg) { const d = document.createElement('div'); d.textContent = msg; $('feed').prepend(d); setTimeout(() => d.remove(), 3600); while ($('feed').children.length > 4) $('feed').lastChild.remove(); }
let bannerT = null;
function banner(t) { const b = $('banner'); b.textContent = t; b.style.opacity = 1; b.style.transform = 'scale(1.15)'; requestAnimationFrame(() => (b.style.transform = 'scale(1)')); clearTimeout(bannerT); bannerT = setTimeout(() => (b.style.opacity = 0), 1100); }

/* ---------------- combat ---------------- */
function fire(e, ang) {
  const s = e.stats;
  if (e.cool > 0 || e.dead > 0 || e.frozen > 0) return;
  e.cool = s.rate * (e.rapid > 0 ? 0.45 : 1) * (e.team === 'B' && G.slow > 0 ? 1.8 : 1);
  const spread = (Math.random() - 0.5) * 2 * (s.spread + (e.isPlayer ? 0 : e.team === 'B' ? DIFF[diff].acc : DIFF[diff].mate));
  const a = ang + spread, sp = e.kind === 'chatgpt' ? 1500 : 950;
  G.bullets.push({ x: e.x + Math.cos(a) * (e.r + 14), y: e.y + Math.sin(a) * (e.r + 14), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: s.range / sp, owner: e, team: e.team, dmg: s.dmg, col: s.shot, bounce: s.bounce ? 1 : 0, beam: e.kind === 'chatgpt', age: 0 });
  e.shots++; e.flash = 0.06;
  if (e.isPlayer) (e.kind === 'chatgpt' ? SFX.beam : SFX.pew)();
}
function hitEnt(t, b) {
  if (t.shield > 0) { spark(b.x, b.y, '#ffffff', 6, 160); return; }
  t.hp -= b.dmg; b.owner.hits++; t.hurt = 0.12; spark(b.x, b.y, b.col, 10, 220);
  if (t.isPlayer) { G.shake = 0.22; SFX.hit(); }
  if (t.hp <= 0) {
    t.dead = RESPAWN; t.tagged++; b.owner.tags++; G.score[b.team]++;
    spark(t.x, t.y, t.team === 'P' ? '#ff5050' : '#ff8c28', 30, 320); G.rings.push({ x: t.x, y: t.y, r: 10, life: 0.45, col: b.col });
    G.pops.push({ x: t.x, y: t.y - 30, txt: 'TAGGED!', life: 0.9, col: b.team === 'P' ? '#ffd60a' : '#ff8c28' });
    feed(`${b.owner.name} tagged ${t.name}`);
    if (b.owner.isPlayer) { SFX.tag(); banner(['TAGGED!', 'GOT EM!', 'A-PLUS SHOT!', "LET'S GOOO!"][Math.floor(Math.random() * 4)]); }
    if (t.isPlayer) banner('YOU GOT TAGGED');
  }
}
function spark(x, y, col, n, sp = 220) { if (G.parts.length > 340) return; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * sp; G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.35, col }); } }

function useAbility(e) {
  if (e.abilityCd > 0 || e.dead > 0) return;
  const c = CHARS[e.kind]; e.abilityCd = c.cd;
  if (e.isPlayer) { SFX.power(); banner(c.ability); buzz(60); }
  G.rings.push({ x: e.x, y: e.y, r: 10, life: 0.5, col: c.shot });
  if (e.kind === 'perci') e.rapid = 4;
  if (e.kind === 'miracle') { G.slow = 4; spark(e.x, e.y, '#ff8c28', 30); }
  if (e.kind === 'mixi') e.shield = 3;
  if (e.kind === 'jessica') { const t = G.ents.filter((o) => o.team === 'B' && o.dead <= 0).sort((a, b) => dist(a, e) - dist(b, e))[0]; if (t) { t.frozen = 3; spark(t.x, t.y, '#7cff6b', 24); } }
  if (e.kind === 'chatgpt') { const ox = e.x, oy = e.y; moveEnt(e, Math.cos(e.a) * 240, Math.sin(e.a) * 240); spark(ox, oy, '#00e6ff', 20); spark(e.x, e.y, '#00e6ff', 20); }
}

/* ---------------- pickups (auto-collect on contact) ---------------- */
function spawnPickup() {
  const kinds = ['shield', 'shield', 'rapid', 'speed', 'charge'];
  for (let tries = 0; tries < 40; tries++) {
    const x = 260 + Math.random() * (WORLD.w - 520), y = 120 + Math.random() * (WORLD.h - 240);
    if (BLOCK[cellOf(x, y)[1] * GC + cellOf(x, y)[0]]) continue;
    if (G.pickups.some((p) => Math.hypot(p.x - x, p.y - y) < 200)) continue;
    G.pickups.push({ x, y, t: 0, kind: kinds[Math.floor(Math.random() * kinds.length)] }); G.rings.push({ x, y, r: 6, life: 0.5, col: '#ffffff' }); return;
  }
}
function collect(e, pk) {
  pk.gone = true; e.picks++;
  if (pk.kind === 'shield') { if (e.hp < e.maxhp) e.hp++; else e.shield = Math.max(e.shield, 2.5); }
  if (pk.kind === 'rapid') e.rapid = Math.max(e.rapid, 4);
  if (pk.kind === 'speed') e.fast = 4;
  if (pk.kind === 'charge') e.abilityCd = 0;
  spark(pk.x, pk.y, PICKUPS[pk.kind].col, 18, 200); G.rings.push({ x: pk.x, y: pk.y, r: 8, life: 0.4, col: PICKUPS[pk.kind].col });
  if (e.isPlayer) { SFX.pick(); banner(PICKUPS[pk.kind].label); buzz(20); G.pops.push({ x: pk.x, y: pk.y - 24, txt: '+10', life: 0.8, col: '#ffffff' }); }
}

/* ---------------- AI ---------------- */
function nearestPickup(e, maxD) { let b = null, bd = maxD; for (const p of G.pickups) { const d = dist(p, e); if (d < bd) { bd = d; b = p; } } return b; }
function aiThink(e, dt) {
  const d = DIFF[diff], ai = e.ai;
  ai.think -= dt; ai.repath -= dt;
  if (ai.think <= 0) {
    ai.think = 0.25 + Math.random() * 0.25;
    let best = null, bd = 1e9;
    for (const f of G.ents) { if (f.team === e.team || f.dead > 0) continue; const dd = dist(e, f) * (los(e, f) ? 1 : 1.6) * (f.isPlayer && e.team === 'B' ? 0.85 : 1); if (dd < bd) { bd = dd; best = f; } }
    if (best !== ai.target) ai.react = e.team === 'B' ? d.react : 0.45;
    ai.target = best;
    if (Math.random() < 0.1) ai.strafe *= -1;
    // goal choice: pickups when hurt (or sometimes anyway), otherwise the target
    const pk = nearestPickup(e, e.hp < e.maxhp ? 650 : 280);
    if (pk && (e.hp < e.maxhp || Math.random() < (e.team === 'P' ? 0.5 : 0.3))) { ai.goal = pk; ai.goalKind = 'pick'; }
    else if (best) { ai.goal = best; ai.goalKind = 'foe'; }
    else { ai.goal = { x: 300 + Math.random() * (WORLD.w - 600), y: 200 + Math.random() * (WORLD.h - 400) }; ai.goalKind = 'wander'; }
    if (e.team === 'P' && e.abilityCd <= 0 && best && dist(e, best) < 480 && Math.random() < 0.25) useAbility(e);
  }
  if (ai.goal && ai.goal.gone) { ai.goal = ai.target; ai.goalKind = 'foe'; ai.path = []; }
  const t = ai.target;
  const spd = e.stats.speed * (e.team === 'B' ? d.speed * (G.slow > 0 ? 0.5 : 1) : 0.88) * (e.fast > 0 ? 1.35 : 1);
  let mx = 0, my = 0;
  const see = t && los(e, t), dd = t ? dist(e, t) : 1e9;
  // aim + shoot whenever a target is visible
  if (t && see) {
    const a = Math.atan2(t.y - e.y, t.x - e.x); e.a = a; ai.react -= dt;
    if (dd < e.stats.range && ai.react <= 0) fire(e, a + (t.vx || 0) * 0.00035 * dd / 10);
  }
  if (ai.escape > 0) { ai.escape -= dt; mx = ai.ex; my = ai.ey; }
  else if (ai.goalKind === 'foe' && see && dd < e.stats.range * 1.05) {
    // combat: keep range + strafe; flip strafe if the side is blocked
    const a = e.a, want = e.stats.range * 0.55, fwd = dd > want ? 1 : dd < want * 0.6 ? -1 : 0;
    const sx = Math.cos(a + Math.PI / 2) * ai.strafe, sy = Math.sin(a + Math.PI / 2) * ai.strafe;
    if (!clear(e, { x: e.x + sx * 50, y: e.y + sy * 50 }, e.r - 2)) ai.strafe *= -1;
    mx = Math.cos(a) * fwd + Math.cos(a + Math.PI / 2) * ai.strafe * 0.85; my = Math.sin(a) * fwd + Math.sin(a + Math.PI / 2) * ai.strafe * 0.85;
    ai.path = [];
  } else if (ai.goal) {
    // follow an A* path around obstacles
    const g = ai.goal;
    if (ai.repath <= 0 || !ai.path.length || (ai.pg && Math.hypot(ai.pg.x - g.x, ai.pg.y - g.y) > 90)) {
      ai.path = astar(e.x, e.y, g.x, g.y); ai.pg = { x: g.x, y: g.y }; ai.repath = 0.7 + Math.random() * 0.3;
    }
    while (ai.path.length > 1 && clear(e, ai.path[1], e.r - 4)) ai.path.shift();      // string-pull: skip visible waypoints
    if (ai.path.length && Math.hypot(ai.path[0].x - e.x, ai.path[0].y - e.y) < 14) ai.path.shift();
    const wp = ai.path[0] || g; const a = Math.atan2(wp.y - e.y, wp.x - e.x); mx = Math.cos(a); my = Math.sin(a);
    if (!see) e.a = a;
  }
  // separation from teammates so they don't clump
  for (const o of G.ents) { if (o === e || o.dead > 0 || o.team !== e.team) continue; const dx = e.x - o.x, dy = e.y - o.y, d2 = dx * dx + dy * dy; if (d2 < 2500 && d2 > 1) { const k = (50 - Math.sqrt(d2)) / 50; mx += (dx / Math.sqrt(d2)) * k * 0.8; my += (dy / Math.sqrt(d2)) * k * 0.8; } }
  const m = Math.hypot(mx, my) || 1;
  const ox = e.x, oy = e.y;
  moveEnt(e, (mx / m) * spd * dt, (my / m) * spd * dt);
  e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt;
  // stuck detection: barely moved while trying to move -> escape sideways and repath
  ai.chk -= dt;
  if (ai.chk <= 0) {
    if (Math.hypot(e.x - ai.lx, e.y - ai.ly) < 10 && (mx || my)) { const a = Math.atan2(my, mx) + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random() * 0.6); ai.ex = Math.cos(a); ai.ey = Math.sin(a); ai.escape = 0.35; ai.path = []; ai.repath = 0; ai.strafe *= -1; }
    ai.lx = e.x; ai.ly = e.y; ai.chk = 0.45;
  }
}

/* ---------------- player helpers ---------------- */
function autoTarget(p, coneDir) {
  let best = null, bs = 1e9;
  for (const e of G.ents) {
    if (e.team === 'P' || e.dead > 0) continue; const d = dist(p, e); if (d > p.stats.range) continue; if (!los(p, e)) continue;
    let s = d; if (coneDir !== undefined) { let da = Math.abs(((Math.atan2(e.y - p.y, e.x - p.x) - coneDir + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (da > 0.55) continue; s = d * (1 + da * 2); }
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}

/* ---------------- update ---------------- */
function update(dt) {
  if (!G || state !== 'play') return;
  G.t += dt; G.time -= dt; G.slow = Math.max(0, G.slow - dt); G.shake = Math.max(0, G.shake - dt);
  if (G.time <= 0) return endMatch();
  const p = G.player;
  for (const e of G.ents) {
    e.cool = Math.max(0, e.cool - dt); e.abilityCd = Math.max(0, e.abilityCd - dt); e.rapid = Math.max(0, e.rapid - dt); e.shield = Math.max(0, e.shield - dt); e.frozen = Math.max(0, e.frozen - dt); e.fast = Math.max(0, e.fast - dt); e.flash = Math.max(0, e.flash - dt); e.hurt = Math.max(0, e.hurt - dt);
    if (e.dead > 0) { e.dead -= dt; if (e.dead <= 0) { e.hp = e.maxhp; e.x = e.spawn.x; e.y = e.spawn.y; e.shield = 1.5; e.ai.path = []; G.rings.push({ x: e.x, y: e.y, r: 6, life: 0.4, col: '#ffffff' }); } continue; }
    if (e.frozen > 0) continue;
    if (e.isPlayer) {
      let mx = 0, my = 0; const k = input.keys;
      if (k.KeyW || k.ArrowUp) my -= 1; if (k.KeyS || k.ArrowDown) my += 1; if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1;
      if (input.touchMove) { mx = input.touchMove.dx; my = input.touchMove.dy; }
      const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
      const spd = e.stats.speed * (e.fast > 0 ? 1.35 : 1);
      const ox = e.x, oy = e.y; moveEnt(e, mx * spd * dt, my * spd * dt); e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt;
      if (input.touchAim && input.touchAim.m > 0.25) {
        const dir = Math.atan2(input.touchAim.dy, input.touchAim.dx), t = autoTarget(e, dir);   // aim assist toward the stick direction
        e.a = t ? Math.atan2(t.y - e.y, t.x - e.x) : dir; fire(e, e.a);
      } else if (TOUCH) {
        const t = autoFire ? autoTarget(e) : null;
        if (t) { e.a = Math.atan2(t.y - e.y, t.x - e.x); fire(e, e.a); } else if (m > 0.2) e.a = Math.atan2(my, mx);
      } else { e.a = Math.atan2(input.my / Z + G.cam.y - e.y, input.mx / Z + G.cam.x - e.x); if (input.mdown) fire(e, e.a); }
      if (input.ability) { input.ability = false; useAbility(e); }
    } else aiThink(e, dt);
  }
  // bullets
  for (const b of G.bullets) {
    b.age += dt; const steps = 3;
    for (let s = 0; s < steps && b.life > 0; s++) {
      const nx = b.x + (b.vx * dt) / steps, ny = b.y + (b.vy * dt) / steps;
      let wall = null; for (const w of WALLS) if (nx > w.x && nx < w.x + w.w && ny > w.y && ny < w.y + w.h) { wall = w; break; }
      if (wall) {
        if (b.bounce > 0) { b.bounce--; if (b.x > wall.x && b.x < wall.x + wall.w) b.vy *= -1; else b.vx *= -1; spark(b.x, b.y, b.col, 4, 120); }
        else { b.life = 0; spark(b.x, b.y, b.col, 5, 140); }
        break;
      }
      b.x = nx; b.y = ny;
      for (const e of G.ents) { if (e.team === b.team || e.dead > 0) continue; if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (e.r + 4) ** 2) { hitEnt(e, b); b.life = 0; break; } }
    }
    b.life -= dt;
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; q.life -= dt; }
  G.parts = G.parts.filter((q) => q.life > 0);
  for (const r of G.rings) { r.r += 260 * dt; r.life -= dt; } G.rings = G.rings.filter((r) => r.life > 0);
  for (const q of G.pops) { q.y -= 40 * dt; q.life -= dt; } G.pops = G.pops.filter((q) => q.life > 0);
  // pickups: everyone collects automatically by walking over them
  G.pickupT -= dt;
  if (G.pickupT <= 0) { G.pickupT = 5.5; if (G.pickups.length < 5) spawnPickup(); }
  for (const pk of G.pickups) { pk.t += dt; for (const e of G.ents) if (e.dead <= 0 && dist(e, pk) < e.r + 20) { collect(e, pk); break; } }
  G.pickups = G.pickups.filter((q) => !q.gone);
  // camera: smooth follow with a little look-ahead toward the aim
  const vw = VW / Z, vh = VH / Z;
  const tx = clamp(p.x + Math.cos(p.a) * 70 - vw / 2, -80, WORLD.w - vw + 80), ty = clamp(p.y + Math.sin(p.a) * 70 - vh / 2, -80, WORLD.h - vh + 80);
  G.cam.x += ((vw > WORLD.w + 160 ? (WORLD.w - vw) / 2 : tx) - G.cam.x) * Math.min(1, dt * 8);
  G.cam.y += ((vh > WORLD.h + 160 ? (WORLD.h - vh) / 2 : ty) - G.cam.y) * Math.min(1, dt * 8);
  hud();
}

/* ---------------- graphics: pre-rendered layers ---------------- */
let STATIC = null, VIGN = null;
const GLOW = {};
function glowSprite(col, size = 128) {
  const k = col + size; if (GLOW[k]) return GLOW[k];
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); gr.addColorStop(0, col); gr.addColorStop(0.35, col + '88'); gr.addColorStop(1, col + '00');
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return (GLOW[k] = c);
}
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function buildStatic() {
  const c = document.createElement('canvas'); c.width = WORLD.w; c.height = WORLD.h; const g = c.getContext('2d'); const R = rng(7);
  // floor: dark dream-barn planks
  g.fillStyle = '#1c1029'; g.fillRect(0, 0, WORLD.w, WORLD.h);
  for (let y = 0; y < WORLD.h; y += 48) {
    let x = -R() * 200;
    while (x < WORLD.w) { const len = 160 + R() * 220, v = R() * 12 - 6; g.fillStyle = `rgb(${38 + v},${22 + v / 2},${54 + v})`; g.fillRect(x + 2, y + 2, len - 4, 44); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 2, y + 42, len - 4, 4); for (let k = 0; k < 3; k++) { g.strokeStyle = 'rgba(255,255,255,0.03)'; g.beginPath(); g.moveTo(x + 10, y + 10 + k * 12); g.lineTo(x + len - 10, y + 12 + k * 12); g.stroke(); } x += len; }
  }
  // neon grid
  g.strokeStyle = 'rgba(150,90,255,0.10)'; g.lineWidth = 1;
  for (let x = 0; x <= WORLD.w; x += 100) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, WORLD.h); g.stroke(); }
  for (let y = 0; y <= WORLD.h; y += 100) { g.beginPath(); g.moveTo(0, y); g.lineTo(WORLD.w, y); g.stroke(); }
  // dream fog pools
  for (let i = 0; i < 9; i++) { const x = R() * WORLD.w, y = R() * WORLD.h, r = 180 + R() * 260; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${R() < 0.5 ? '120,60,220' : '0,160,220'},0.13)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  // team bases
  let gr = g.createLinearGradient(0, 0, 300, 0); gr.addColorStop(0, 'rgba(220,30,60,0.32)'); gr.addColorStop(1, 'rgba(220,30,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 300, WORLD.h);
  gr = g.createLinearGradient(WORLD.w, 0, WORLD.w - 300, 0); gr.addColorStop(0, 'rgba(255,140,40,0.32)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = gr; g.fillRect(WORLD.w - 300, 0, 300, WORLD.h);
  g.save(); g.font = '44px Anton, Impact'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.08)';
  g.translate(60, WORLD.h / 2); g.rotate(-Math.PI / 2); g.fillText('TEAM PERCI', 0, 16); g.restore();
  g.save(); g.font = '44px Anton, Impact'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.08)'; g.translate(WORLD.w - 60, WORLD.h / 2); g.rotate(Math.PI / 2); g.fillText('BROKE-PILOT', 0, 16); g.restore();
  // center emblem
  g.save(); g.globalAlpha = 0.1; g.strokeStyle = '#c070ff'; g.lineWidth = 6; g.beginPath(); g.arc(WORLD.w / 2, WORLD.h / 2, 150, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(WORLD.w / 2, WORLD.h / 2, 110, 0, Math.PI * 2); g.stroke();
  if (IMG.title.complete && IMG.title.naturalWidth) { g.globalAlpha = 0.16; const w = 260, h = w * IMG.title.naturalHeight / IMG.title.naturalWidth; g.drawImage(IMG.title, WORLD.w / 2 - w / 2, WORLD.h / 2 - h / 2, w, h); }
  g.restore();
  // wall shadows
  g.fillStyle = 'rgba(0,0,0,0.38)'; for (const w of SOLID) { if (w.kind === 'glitch') continue; g.beginPath(); g.moveTo(w.x + 8, w.y + w.h); g.lineTo(w.x + w.w + 22, w.y + w.h + 20); g.lineTo(w.x + w.w + 22, w.y + 8); g.lineTo(w.x + w.w, w.y - 6); g.lineTo(w.x + w.w, w.y + w.h); g.fill(); g.fillRect(w.x + 6, w.y + w.h, w.w, 18); }
  // walls (2.5D: front face + top face)
  const H = 16;
  for (const w of SOLID) {
    if (w.kind === 'glitch') continue;
    const top = w.kind === 'hay' ? '#dcbe5e' : '#8c5c3c', front = w.kind === 'hay' ? '#a7863a' : '#5c3826', edge = '#120a10';
    g.fillStyle = front; g.fillRect(w.x, w.y + w.h - H, w.w, H + 2);
    g.fillStyle = top; g.fillRect(w.x, w.y - H, w.w, w.h);
    if (w.kind === 'hay') {
      g.strokeStyle = 'rgba(120,90,30,0.55)'; g.lineWidth = 2; for (let k = 0; k < (w.w * w.h) / 70; k++) { const x = w.x + 4 + R() * (w.w - 8), y = w.y - H + 4 + R() * (w.h - 8); g.beginPath(); g.moveTo(x, y); g.lineTo(x + R() * 10 - 5, y + 4); g.stroke(); }
      g.strokeStyle = '#6e3c1c'; g.lineWidth = 3; if (w.w >= w.h) { g.beginPath(); g.moveTo(w.x + w.w * 0.3, w.y - H); g.lineTo(w.x + w.w * 0.3, w.y + w.h - H); g.moveTo(w.x + w.w * 0.7, w.y - H); g.lineTo(w.x + w.w * 0.7, w.y + w.h - H); g.stroke(); } else { g.beginPath(); g.moveTo(w.x, w.y - H + w.h * 0.3); g.lineTo(w.x + w.w, w.y - H + w.h * 0.3); g.moveTo(w.x, w.y - H + w.h * 0.7); g.lineTo(w.x + w.w, w.y - H + w.h * 0.7); g.stroke(); }
    } else {
      g.strokeStyle = 'rgba(30,15,10,0.6)'; g.lineWidth = 3; g.strokeRect(w.x + 5, w.y - H + 5, w.w - 10, w.h - 10);
      g.beginPath(); g.moveTo(w.x + 5, w.y - H + 5); g.lineTo(w.x + w.w - 5, w.y - H + w.h - 5); g.moveTo(w.x + w.w - 5, w.y - H + 5); g.lineTo(w.x + 5, w.y - H + w.h - 5); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(w.x, w.y - H, w.w, 4);
    }
    g.strokeStyle = edge; g.lineWidth = 3; g.strokeRect(w.x, w.y - H, w.w, w.h); g.strokeRect(w.x, w.y + w.h - H, w.w, H);
  }
  // arena border
  g.strokeStyle = '#8232dc'; g.lineWidth = 6; g.strokeRect(3, 3, WORLD.w - 6, WORLD.h - 6); g.strokeStyle = 'rgba(0,230,255,0.4)'; g.lineWidth = 2; g.strokeRect(10, 10, WORLD.w - 20, WORLD.h - 20);
  STATIC = c;
}
function buildVignette() {
  const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(VW / 2)); c.height = Math.max(2, Math.round(VH / 2)); const g = c.getContext('2d');
  const vg = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.3, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.72);
  vg.addColorStop(0, 'rgba(30,6,56,0)'); vg.addColorStop(1, 'rgba(20,4,40,0.62)'); g.fillStyle = vg; g.fillRect(0, 0, c.width, c.height); VIGN = c;
}

/* ---------------- render ---------------- */
function drawPickupIcon(pk, t) {
  const bob = Math.sin(pk.t * 4) * 4, x = pk.x, y = pk.y + bob, col = PICKUPS[pk.kind].col;
  ctx.globalCompositeOperation = 'lighter'; const gs = glowSprite(col); const s = 90 + Math.sin(pk.t * 5) * 10; ctx.drawImage(gs, x - s / 2, y - s / 2, s, s); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y + 20, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  if (pk.kind === 'shield' && IMG.aplus.complete) { ctx.drawImage(IMG.aplus, x - 24, y - 24, 48, 48); return; }
  ctx.save(); ctx.translate(x, y); ctx.rotate(pk.kind === 'charge' ? pk.t * 1.5 : 0);
  ctx.fillStyle = '#120a1c'; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath();
  if (pk.kind === 'rapid') { ctx.moveTo(3, -12); ctx.lineTo(-7, 2); ctx.lineTo(0, 2); ctx.lineTo(-3, 12); ctx.lineTo(8, -3); ctx.lineTo(1, -3); ctx.closePath(); }
  if (pk.kind === 'speed') { for (const o of [-6, 4]) { ctx.moveTo(o - 4, -9); ctx.lineTo(o + 5, 0); ctx.lineTo(o - 4, 9); ctx.lineTo(o - 1, 0); ctx.closePath(); } }
  if (pk.kind === 'charge') { for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12, a = (i / 10) * Math.PI * 2 - Math.PI / 2; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); }
  ctx.fill(); ctx.restore();
}
function drawEnt(e, t) {
  const c = e.team === 'P' ? CHARS[e.kind] : null, col = e.team === 'P' ? '#ff3b55' : '#ff8c28', bodyCol = e.team === 'P' ? c.body : '#3a2418';
  const bob = Math.sin(t * 9 + e.bob) * (Math.hypot(e.vx, e.vy) > 20 ? 2 : 0.6);
  // shadow + team glow
  ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.85, e.r * 1.05, e.r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; const gs = glowSprite(e.isPlayer ? '#ffd60a' : col); const s = e.r * 4.2; ctx.globalAlpha = 0.55; ctx.drawImage(gs, e.x - s / 2, e.y - s / 2, s, s); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (e.isPlayer) { ctx.strokeStyle = 'rgba(255,214,10,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.85, e.r * 1.5, e.r * 0.6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  ctx.save(); ctx.translate(e.x, e.y + bob);
  // blaster (drawn under body when pointing up)
  const drawGun = () => {
    ctx.save(); ctx.rotate(e.a);
    const gc = e.team === 'P' ? (e.kind === 'chatgpt' ? '#16323e' : '#3a2c08') : '#3a1e08', tip = e.stats.shot;
    ctx.fillStyle = gc; ctx.strokeStyle = '#0c0610'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(e.r - 6, -7, 28, 14, 4) : ctx.rect(e.r - 6, -7, 28, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tip; ctx.fillRect(e.r + 16, -4, 7, 8);
    ctx.fillStyle = e.team === 'P' ? '#ffd60a' : '#ff8c28'; ctx.fillRect(e.r - 2, -3, 12, 3);
    if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; const g2 = glowSprite(tip, 64); ctx.drawImage(g2, e.r + 6, -22, 44, 44); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  };
  const gunBehind = Math.sin(e.a) < -0.2; if (gunBehind) drawGun();
  // body
  ctx.beginPath(); ctx.arc(0, 0, e.r + 4, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#0c0610'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fillStyle = bodyCol; ctx.fill();
  const img = e.team === 'P' ? IMG[e.kind] : IMG.brokepilot;
  if (img && img.complete) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(img, -e.r, -e.r, e.r * 2, e.r * 2); ctx.restore(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, e.r + 1, -2.6, -1.2); ctx.stroke();
  if (e.team === 'B') { // bot antenna + eye glow
    ctx.strokeStyle = '#0c0610'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -e.r - 3); ctx.lineTo(0, -e.r - 12); ctx.stroke(); ctx.fillStyle = (t * 2 + e.bob) % 1 < 0.5 ? '#ff3030' : '#ff8c28'; ctx.beginPath(); ctx.arc(0, -e.r - 13, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (!gunBehind) drawGun();
  if (e.hurt > 0) { ctx.globalAlpha = e.hurt / 0.12 * 0.8; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, e.r + 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  if (e.shield > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(180,240,255,${0.5 + 0.3 * Math.sin(t * 12)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, e.r + 10, 0, Math.PI * 2); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
  if (e.frozen > 0) { ctx.strokeStyle = '#7cff6b'; ctx.setLineDash([4, 4]); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, e.r + 8, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  if (e.fast > 0) { ctx.strokeStyle = 'rgba(124,255,107,0.7)'; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-e.vx * 0.05 - 6 + k * 6, -8 + k * 8 - e.vy * 0.05); ctx.lineTo(-e.vx * 0.12 - 6 + k * 6, -8 + k * 8 - e.vy * 0.12); ctx.stroke(); } }
  if (e.team === 'B' && G.slow > 0) { ctx.fillStyle = 'rgba(255,140,40,0.28)'; ctx.beginPath(); ctx.arc(0, 0, e.r + 6, 0, Math.PI * 2); ctx.fill(); }
  // shield arcs
  const seg = (Math.PI * 1.1) / e.maxhp;
  for (let i = 0; i < e.maxhp; i++) { const a0 = -Math.PI / 2 - (Math.PI * 1.1) / 2 + i * seg + 0.06; ctx.strokeStyle = i < e.hp ? (e.team === 'P' ? '#00e6ff' : '#ffd60a') : 'rgba(255,255,255,0.15)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, e.r + 15, a0, a0 + seg - 0.12); ctx.stroke(); }
  ctx.font = (e.isPlayer ? '700 13px' : '600 11px') + ' Poppins, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  const lab = e.isPlayer ? 'YOU' : e.name; ctx.strokeText(lab, 0, e.r + 26); ctx.fillStyle = e.isPlayer ? '#ffd60a' : 'rgba(255,255,255,0.85)'; ctx.fillText(lab, 0, e.r + 26);
  ctx.restore();
}
function drawWorld(t) {
  if (!STATIC) buildStatic();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#0b0912'; ctx.fillRect(0, 0, VW, VH);
  const sx = G.shake > 0 ? (Math.random() - 0.5) * 12 : 0, sy = G.shake > 0 ? (Math.random() - 0.5) * 12 : 0;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(Z, Z); ctx.translate(-G.cam.x, -G.cam.y);
  ctx.drawImage(STATIC, 0, 0);
  // animated glitch pillars
  for (const w of SOLID) if (w.kind === 'glitch') {
    const j = Math.sin(t * 9) * 3; ctx.fillStyle = 'rgba(0,230,255,0.18)'; ctx.fillRect(w.x + j, w.y - 16, w.w, w.h + 16);
    ctx.strokeStyle = '#00e6ff'; ctx.lineWidth = 2; ctx.strokeRect(w.x + j, w.y - 16, w.w, w.h + 16);
    ctx.fillStyle = 'rgba(0,230,255,0.5)'; for (let k = 0; k < 6; k++) { const yy = w.y - 16 + ((t * 120 + k * 30) % (w.h + 16)); ctx.fillRect(w.x + j, yy, w.w, 2); }
  }
  for (const pk of G.pickups) drawPickupIcon(pk, t);
  // lasers (additive glow)
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const b of G.bullets) {
    const k = b.beam ? 0.06 : 0.03, x2 = b.x - b.vx * k, y2 = b.y - b.vy * k;
    ctx.strokeStyle = b.col + '55'; ctx.lineWidth = b.beam ? 12 : 9; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = b.col; ctx.lineWidth = b.beam ? 5 : 4; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * k * 0.6, b.y - b.vy * k * 0.6); ctx.stroke();
  }
  for (const q of G.parts) { ctx.globalAlpha = Math.max(0, q.life * 2.2); ctx.fillStyle = q.col; ctx.fillRect(q.x - 2.5, q.y - 2.5, 5, 5); }
  ctx.globalAlpha = 1;
  for (const r of G.rings) { ctx.globalAlpha = Math.max(0, r.life * 2); ctx.strokeStyle = r.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
  // respawn markers + entities (sorted by y for depth)
  for (const e of G.ents) if (e.dead > 0) { ctx.globalAlpha = 0.5; ctx.strokeStyle = e.team === 'P' ? '#ff3b55' : '#ff8c28'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.spawn.x, e.spawn.y, 18, -Math.PI / 2, -Math.PI / 2 + (1 - e.dead / RESPAWN) * Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  const live = G.ents.filter((e) => e.dead <= 0).sort((a, b) => a.y - b.y); for (const e of live) drawEnt(e, t);
  for (const q of G.pops) { ctx.globalAlpha = Math.min(1, q.life * 2); ctx.font = '22px Anton, Impact'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#100814'; ctx.strokeText(q.txt, q.x, q.y); ctx.fillStyle = q.col; ctx.fillText(q.txt, q.x, q.y); }
  ctx.globalAlpha = 1;
  ctx.restore();
  // screen-space: vignette, slow tint, off-screen enemy arrows, minimap, sticks
  if (VIGN) ctx.drawImage(VIGN, 0, 0, VW, VH);
  if (G.slow > 0) { ctx.fillStyle = `rgba(255,140,40,${0.06 + 0.03 * Math.sin(t * 6)})`; ctx.fillRect(0, 0, VW, VH); }
  if (G.player.hurt > 0) { ctx.fillStyle = `rgba(255,40,60,${G.player.hurt * 1.6})`; ctx.fillRect(0, 0, VW, VH); }
  drawArrows(); drawMinimap();
  if (G.player.dead > 0) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#ffd60a'; ctx.font = '40px Anton, Impact'; ctx.textAlign = 'center'; ctx.fillText('RESPAWN IN ' + Math.ceil(G.player.dead), VW / 2, VH / 2 + 70); }
  drawSticks();
}
function drawArrows() {
  const p = G.player; if (p.dead > 0) return;
  for (const e of G.ents) {
    if (e.team === 'P' || e.dead > 0) continue;
    const sx = (e.x - G.cam.x) * Z, sy = (e.y - G.cam.y) * Z; if (sx > 0 && sx < VW && sy > 0 && sy < VH) continue;
    const a = Math.atan2(sy - VH / 2, sx - VW / 2), m = 34;
    const ex = clamp(VW / 2 + Math.cos(a) * VW, m, VW - m), ey = clamp(VH / 2 + Math.sin(a) * VH, m + 40, VH - m);
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = 'rgba(255,140,40,0.9)'; ctx.strokeStyle = '#100814'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
}
function drawMinimap() {
  const w = TOUCH ? 108 : 150, h = w * WORLD.h / WORLD.w, x = 10, y = TOUCH ? 74 : VH - h - 12, k = w / WORLD.w;
  ctx.fillStyle = 'rgba(10,6,20,0.7)'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6); ctx.strokeStyle = 'rgba(160,100,255,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = 'rgba(220,190,120,0.55)'; for (const wl of SOLID) ctx.fillRect(x + wl.x * k, y + wl.y * k, Math.max(1.5, wl.w * k), Math.max(1.5, wl.h * k));
  for (const pk of G.pickups) { ctx.fillStyle = PICKUPS[pk.kind].col; ctx.fillRect(x + pk.x * k - 1.5, y + pk.y * k - 1.5, 3, 3); }
  for (const e of G.ents) { if (e.dead > 0) continue; ctx.fillStyle = e.isPlayer ? '#ffd60a' : e.team === 'P' ? '#ff4b65' : '#ff8c28'; ctx.beginPath(); ctx.arc(x + e.x * k, y + e.y * k, e.isPlayer ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x + G.cam.x * k, y + G.cam.y * k, (VW / Z) * k, (VH / Z) * k);
}
let menuBgT = 0;
function drawMenuBg(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#141217'; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + t * 0.05; ctx.strokeStyle = `rgba(130,50,220,${0.05 + 0.04 * Math.sin(t * 0.2 + i)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(VW / 2, VH * 0.4); ctx.lineTo(VW / 2 + Math.cos(a) * 2000, VH * 0.4 + Math.sin(a) * 2000); ctx.stroke(); }
}

/* ---------------- HUD ---------------- */
function hud() {
  const p = G.player, c = CHARS[p.kind];
  $('tp').textContent = 'PERCI ' + G.score.P; $('tb').textContent = G.score.B + ' BROKE';
  const s = Math.max(0, Math.ceil(G.time)); $('clock').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  $('clock').classList.toggle('hurry', G.time < 15);
  $('me').textContent = `${c.name} • ${p.tags} tags`;
  const ready = p.abilityCd <= 0;
  $('abil').textContent = ready ? `${c.ability} READY${TOUCH ? '' : ' (SPACE)'}` : `${c.ability}: ${Math.ceil(p.abilityCd)}s`;
  const ab = $('abBtn'); ab.innerHTML = ready ? '\u26A1<br>POWER' : Math.ceil(p.abilityCd) + 's'; ab.classList.toggle('ready', ready);
}

/* ---------------- end + score ---------------- */
let lastResult = null;
function endMatch() {
  state = 'end'; $('hud').classList.remove('on'); document.body.classList.remove('playing');
  const p = G.player, won = G.score.P > G.score.B, tie = G.score.P === G.score.B;
  const acc = p.shots ? Math.round((p.hits / p.shots) * 100) : 0;
  const raw = p.tags * 100 + (won ? 500 : tie ? 200 : 0) + acc * 3 + p.picks * 10 - p.tagged * 25;
  const score = Math.max(0, Math.round(raw * DIFF[diff].mult));
  lastResult = { score, tags: p.tags, tagged: p.tagged, acc, won, tie, character: p.kind, difficulty: diff, team: G.score.P, enemy: G.score.B };
  $('endTitle').textContent = won ? 'YOU WIN!' : tie ? 'TIE GAME' : 'BROKE-PILOT WINS';
  $('endTitle').className = 'big ' + (won ? 'win' : 'lose');
  $('endSub').textContent = `Team Perci ${G.score.P} — ${G.score.B} BROKE-pilot • ${CHARS[p.kind].name} • ${diff.toUpperCase()}`;
  $('endKV').innerHTML = `<span>Your tags</span><b>${p.tags}</b><span>Times tagged</span><b>${p.tagged}</b><span>Accuracy</span><b>${acc}%</b><span>Power-ups grabbed</span><b>${p.picks}</b><span>Result bonus</span><b>${won ? '500' : tie ? '200' : '0'}</b><span>Difficulty</span><b>x${DIFF[diff].mult}</b><span style="color:var(--gold);font-family:Anton;font-size:20px">SCORE</span><b style="color:var(--gold);font-size:30px">${score}</b>`;
  $('submitMsg').textContent = ''; $('bSubmit').disabled = false; $('nameIn').value = localStorage.getItem('ps_name') || '';
  (won ? SFX.win : SFX.lose)();
  saveLocal(lastResult);
  showScreen('sEnd');
}
const BAD = ['fuck', 'shit', 'bitch', 'nigg', 'fag', 'cunt', 'dick', 'pussy', 'whore', 'slut', 'rape', 'nazi', 'kkk'];
function cleanName(n) { n = (n || '').toUpperCase().replace(/[^A-Z0-9 _.-]/g, '').trim().slice(0, 14); if (n.length < 2) return null; const l = n.toLowerCase().replace(/[^a-z]/g, ''); if (BAD.some((b) => l.includes(b))) return null; return n; }
function saveLocal(r) { const all = JSON.parse(localStorage.getItem('ps_local') || '[]'); all.push({ ...r, name: localStorage.getItem('ps_name') || 'YOU', created_at: new Date().toISOString() }); all.sort((a, b) => b.score - a.score); localStorage.setItem('ps_local', JSON.stringify(all.slice(0, 50))); }
const online = () => LEADERBOARD.url && LEADERBOARD.anonKey;
const sbHead = (extra) => Object.assign({ apikey: LEADERBOARD.anonKey }, LEADERBOARD.anonKey.startsWith('eyJ') ? { Authorization: 'Bearer ' + LEADERBOARD.anonKey } : {}, extra || {});
async function submitScore() {
  const name = cleanName($('nameIn').value);
  if (!name) { $('submitMsg').textContent = 'Pick a name: 2-14 letters or numbers, keep it clean.'; return; }
  localStorage.setItem('ps_name', name); $('bSubmit').disabled = true;
  const row = { name, character: lastResult.character, score: lastResult.score, tags: lastResult.tags, tagged: lastResult.tagged, accuracy: lastResult.acc, won: lastResult.won, difficulty: lastResult.difficulty };
  const loc = JSON.parse(localStorage.getItem('ps_local') || '[]'); const i = loc.findIndex((x) => x.score === row.score && x.name === 'YOU'); if (i >= 0) { loc[i].name = name; localStorage.setItem('ps_local', JSON.stringify(loc)); }
  if (!online()) { $('submitMsg').textContent = 'Saved! (The public board goes live once the site owner connects it.)'; return; }
  try {
    const r = await fetch(`${LEADERBOARD.url}/rest/v1/${LEADERBOARD.table}`, { method: 'POST', headers: sbHead({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }), body: JSON.stringify(row) });
    if (!r.ok) throw new Error(r.status);
    $('submitMsg').textContent = 'Posted! Check the leaderboard.';
  } catch (e) { $('submitMsg').textContent = 'Could not reach the leaderboard. Saved on this device.'; $('bSubmit').disabled = false; }
}
async function loadBoard(mode) {
  const body = $('boardBody'); body.innerHTML = '<tr><td colspan="5" class="muted">Loading...</td></tr>';
  let rows = [], note = '';
  const me = localStorage.getItem('ps_name');
  if (mode === 'mine' || !online()) {
    rows = JSON.parse(localStorage.getItem('ps_local') || '[]');
    if (mode === 'today') { const d0 = new Date(); d0.setHours(0, 0, 0, 0); rows = rows.filter((r) => new Date(r.created_at) >= d0); }
    note = online() ? 'Your best runs on this device.' : 'Showing scores saved on this device. The public board goes live once it is connected (see README).';
  } else {
    try {
      let q = `${LEADERBOARD.url}/rest/v1/${LEADERBOARD.table}?select=name,character,score,tags,difficulty,won,created_at&order=score.desc&limit=50`;
      if (mode === 'today') { const d0 = new Date(); d0.setHours(0, 0, 0, 0); q += '&created_at=gte.' + d0.toISOString(); }
      const r = await fetch(q, { headers: sbHead() });
      if (!r.ok) throw new Error(r.status); rows = await r.json(); note = 'Public leaderboard • top 50';
    } catch (e) { rows = []; note = 'Could not load the public board right now.'; }
  }
  body.innerHTML = rows.length ? rows.slice(0, 50).map((r, i) => `<tr class="${r.name === me ? 'me' : ''}"><td class="rank">${i + 1}</td><td><img src="assets/${r.character}_tok.png" alt="">${esc(r.name)}</td><td><b>${r.score}</b></td><td>${r.tags}</td><td>${(r.difficulty || '').toUpperCase()}${r.won ? ' ✓' : ''}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">No scores yet. Be the first!</td></tr>';
  $('boardNote').textContent = note;
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function share() {
  const r = lastResult; if (!r) return;
  const txt = `I scored ${r.score} as ${CHARS[r.character].name} in Perci Shorti vs BROKE-pilot Dream Laser Tag (${r.tags} tags, ${r.difficulty}). Beat that: ${location.href.split('?')[0]} #PerciShorti`;
  try { if (navigator.share) await navigator.share({ title: 'Perci Shorti Laser Tag', text: txt }); else { await navigator.clipboard.writeText(txt); $('submitMsg').textContent = 'Copied! Paste it anywhere.'; } } catch (e) {}
}

/* ---------------- screens / UI ---------------- */
function showScreen(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); if (id) state = id === 'sEnd' ? 'end' : 'menu'; }
function buildCards() {
  $('cards').innerHTML = ORDER.map((k) => { const c = CHARS[k]; const lab = ['SPEED', 'FIRE', 'RANGE', 'SKILL'];
    return `<div class="card ${k === pick ? 'sel' : ''}" data-k="${k}"><img src="assets/${k}.png" alt="${c.name}"><h3>${c.name}</h3><div class="role">${c.role}</div>${c.stats.map((v, i) => `<div class="stat"><span>${lab[i]}</span><div class="bar"><i style="width:${v * 20}%"></i></div></div>`).join('')}<div class="ability">${c.ability}: ${c.abilityDesc}</div></div>`; }).join('');
  document.querySelectorAll('.card').forEach((el) => el.onclick = () => { pick = el.dataset.k; localStorage.setItem('ps_pick', pick); buildCards(); SFX.pick(); });
}
document.querySelectorAll('#diff button').forEach((b) => { b.classList.toggle('sel', b.dataset.d === diff); b.onclick = () => { diff = b.dataset.d; localStorage.setItem('ps_diff', diff); document.querySelectorAll('#diff button').forEach((x) => x.classList.toggle('sel', x === b)); }; });
document.querySelectorAll('#boardTabs button').forEach((b) => b.onclick = () => { document.querySelectorAll('#boardTabs button').forEach((x) => x.classList.toggle('sel', x === b)); loadBoard(b.dataset.b); });
const openBoard = () => { showScreen('sBoard'); document.querySelectorAll('#boardTabs button').forEach((x, i) => x.classList.toggle('sel', i === 0)); loadBoard('all'); };
$('bPlay').onclick = () => { ac(); buildCards(); showScreen('sSelect'); };
$('bPlay2').onclick = $('bPlay').onclick;
$('bHow').onclick = () => showScreen('sHow'); $('bBack2').onclick = () => showScreen('sTitle');
$('bBoard').onclick = openBoard; $('bBoard2').onclick = openBoard; $('bBack3').onclick = () => showScreen('sTitle'); $('bBack1').onclick = () => showScreen('sTitle');
$('bStart').onclick = startMatch; $('bAgain').onclick = () => { buildCards(); showScreen('sSelect'); };
$('bSubmit').onclick = submitScore; $('bShare').onclick = share;
$('muteBtn').onclick = () => { muted = !muted; localStorage.setItem('ps_muted', muted ? '1' : '0'); $('muteBtn').textContent = muted ? '🔇' : '🔊'; };
$('muteBtn').textContent = muted ? '🔇' : '🔊';
function syncAutoBtn() { const b = $('autoBtn'); if (!b) return; b.textContent = 'AUTO ' + (autoFire ? 'ON' : 'OFF'); b.classList.toggle('on', autoFire); }
if ($('autoBtn')) $('autoBtn').onclick = () => { autoFire = !autoFire; localStorage.setItem('ps_auto', autoFire ? '1' : '0'); syncAutoBtn(); };
function togglePause() { if (state === 'play') { state = 'paused'; } else if (state === 'paused') { state = 'play'; } }
$('pauseBtn').onclick = togglePause;
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') state = 'paused'; });

/* ---------------- input ---------------- */
addEventListener('keydown', (e) => { input.keys[e.code] = true; if (e.code === 'Space' && (state === 'play' || state === 'paused')) { input.ability = true; e.preventDefault(); } if (e.code === 'KeyP' || e.code === 'Escape') togglePause(); });
addEventListener('keyup', (e) => { input.keys[e.code] = false; });
cvs.addEventListener('mousemove', (e) => { input.mx = e.clientX; input.my = e.clientY; });
cvs.addEventListener('mousedown', (e) => { input.mdown = true; input.mx = e.clientX; input.my = e.clientY; if (state === 'paused') state = 'play'; });
addEventListener('mouseup', () => { input.mdown = false; });
addEventListener('contextmenu', (e) => { if (state === 'play') e.preventDefault(); });
$('abBtn').addEventListener('touchstart', (e) => { e.preventDefault(); input.ability = true; }, { passive: false });
$('abBtn').addEventListener('click', () => { input.ability = true; });
// twin sticks: fixed home spots that follow your thumb
const sticks = {};
const stickHome = (side) => side === 'move' ? { x: 96, y: VH - 110 } : { x: VW - 96, y: VH - 110 };
function stickFrom(t, s) { const dx = t.clientX - s.x, dy = t.clientY - s.y, m = Math.min(1, Math.hypot(dx, dy) / 56), a = Math.atan2(dy, dx); return { dx: Math.cos(a) * m, dy: Math.sin(a) * m, m }; }
cvs.addEventListener('touchstart', (e) => {
  e.preventDefault(); if (state === 'paused') { state = 'play'; return; }
  for (const t of e.changedTouches) { const side = t.clientX < VW / 2 ? 'move' : 'aim'; if (!sticks[side]) { const near = Math.hypot(t.clientX - stickHome(side).x, t.clientY - stickHome(side).y) < 90; const o = near ? stickHome(side) : { x: t.clientX, y: t.clientY }; sticks[side] = { id: t.identifier, x: o.x, y: o.y, cx: t.clientX, cy: t.clientY }; const v = stickFrom(t, sticks[side]); if (side === 'move') input.touchMove = v; else input.touchAim = v; } }
}, { passive: false });
cvs.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) for (const side of ['move', 'aim']) { const s = sticks[side]; if (s && s.id === t.identifier) { s.cx = t.clientX; s.cy = t.clientY; const v = stickFrom(t, s); if (side === 'move') input.touchMove = v; else input.touchAim = v; } } }, { passive: false });
const tend = (e) => { for (const t of e.changedTouches) for (const side of ['move', 'aim']) { const s = sticks[side]; if (s && s.id === t.identifier) { delete sticks[side]; if (side === 'move') input.touchMove = null; else input.touchAim = null; } } };
cvs.addEventListener('touchend', tend); cvs.addEventListener('touchcancel', tend);
function drawSticks() {
  if (!TOUCH) return;
  for (const side of ['move', 'aim']) {
    const s = sticks[side], h = s || stickHome(side);
    ctx.globalAlpha = s ? 0.9 : 0.45;
    ctx.fillStyle = 'rgba(10,6,20,0.45)'; ctx.beginPath(); ctx.arc(h.x, h.y, 58, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = side === 'aim' ? 'rgba(255,214,10,0.7)' : 'rgba(0,230,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, 58, 0, Math.PI * 2); ctx.stroke();
    const dx = s ? clamp(s.cx - s.x, -56, 56) : 0, dy = s ? clamp(s.cy - s.y, -56, 56) : 0;
    ctx.fillStyle = side === 'aim' ? 'rgba(255,214,10,0.85)' : 'rgba(0,230,255,0.75)'; ctx.beginPath(); ctx.arc(h.x + dx, h.y + dy, 24, 0, Math.PI * 2); ctx.fill();
    if (!s) { ctx.fillStyle = '#fff'; ctx.font = '700 11px Poppins, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(side === 'aim' ? 'AIM + FIRE' : 'MOVE', h.x, h.y + 82); }
    ctx.globalAlpha = 1;
  }
}

/* ---------------- loop ---------------- */
resize();
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  if (state === 'play') { update(dt); drawWorld(t); }
  else if (state === 'paused' && G) { drawWorld(t); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#ffd60a'; ctx.font = '52px Anton, Impact'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', VW / 2, VH / 2); ctx.font = '600 16px Poppins, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(TOUCH ? 'Tap the screen to resume' : 'Press P or click to resume', VW / 2, VH / 2 + 34); }
  else drawMenuBg(t);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------------- launch lock ---------------- */
(function launchLock() {
  const qs = new URLSearchParams(location.search);
  if (qs.get('preview') && qs.get('preview') === PREVIEW_KEY) { localStorage.setItem('ps_preview', PREVIEW_KEY); history.replaceState(null, '', location.pathname); }
  const owner = localStorage.getItem('ps_preview') === PREVIEW_KEY;
  const t = LAUNCH_AT ? new Date(LAUNCH_AT).getTime() : 0;
  if (owner || !t || Date.now() >= t) { showScreen('sTitle'); if (owner && t && Date.now() < t) { const p = document.createElement('div'); p.textContent = 'PRIVATE PREVIEW • public unlock ' + new Date(t).toLocaleString(); p.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);background:#8232dc;color:#fff;font:700 12px Poppins;padding:4px 12px;border-radius:10px;z-index:9;pointer-events:none'; p.className = 'previewTag'; document.body.appendChild(p); } return; }
  showScreen('sLocked');
  $('lockWhen').textContent = 'Opens ' + new Date(t).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const tick = () => { const ms = t - Date.now(); if (ms <= 0) { location.reload(); return; } const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60; $('lockCount').textContent = (d ? d + 'd ' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); };
  tick(); setInterval(tick, 1000);
})();

window.__ps = { startMatch, get G() { return G; }, endMatch, astar, set pickChar(k) { pick = k; } };
})();
