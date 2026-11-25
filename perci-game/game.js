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
const ALLY = { lead: 0.6, dodge: 1.5 };
const DIFF = { easy: { acc: 0.13, react: 0.34, mult: 0.75, speed: 1.02, mate: 0.2, lead: 0.0, dodge: 99, rate: 1.0, hp: 3, focus: 0.85 }, normal: { acc: 0.09, react: 0.26, mult: 1, speed: 1.08, mate: 0.22, lead: 0.5, dodge: 1.9, rate: 0.95, hp: 3, focus: 0.75 }, hard: { acc: 0.045, react: 0.15, mult: 1.5, speed: 1.18, mate: 0.26, lead: 0.9, dodge: 1.0, rate: 0.8, hp: 4, focus: 0.6 } };
const MATCH_TIME = 120, RESPAWN = 3, WORLD = { w: 2400, h: 1500 };
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

/* ---------------- arena: a new generated map every match ---------------- */
let STATIC = null;
let WALLS = [], SOLID = [], MAPNAME = '', MAPSEED = 0;
const CELL = 30, INFL = 24;
let GC = 0, GR = 0, BLOCK = new Uint8Array(0), G_SCORE = new Float32Array(0), CAME = new Int32Array(0), STAMP = new Int32Array(0); let stampN = 0;
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const MAP_STYLES = [
  { name: 'CORN MAZE', tint: [40, 34, 18] }, { name: 'BUILDING 8 HALLS', tint: [36, 22, 52] }, { name: 'MIGHT BE CASTLE LOT', tint: [44, 26, 30] },
  { name: 'THE BARN', tint: [46, 26, 18] }, { name: 'DREAM GRID', tint: [18, 24, 50] }, { name: 'SCHOOL GYM', tint: [44, 34, 22] },
];
function spawnPoint(team, i) { return { x: team === 'P' ? 120 : WORLD.w - 120, y: Math.round(WORLD.h * (i + 1) / 6) }; }
function rebuildGrid() {
  GC = Math.ceil(WORLD.w / CELL); GR = Math.ceil(WORLD.h / CELL);
  BLOCK = new Uint8Array(GC * GR); G_SCORE = new Float32Array(GC * GR); CAME = new Int32Array(GC * GR); STAMP = new Int32Array(GC * GR); stampN = 0;
  for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) {
    const x = c * CELL + CELL / 2, y = r * CELL + CELL / 2;
    if (x < INFL || y < INFL || x > WORLD.w - INFL || y > WORLD.h - INFL) { BLOCK[r * GC + c] = 1; continue; }
    for (const w of SOLID) if (x > w.x - INFL && x < w.x + w.w + INFL && y > w.y - INFL && y < w.y + w.h + INFL) { BLOCK[r * GC + c] = 1; break; }
  }
}
function reachableShare() {
  const s = spawnPoint('P', 2), sc = Math.floor(s.x / CELL), sr = Math.floor(s.y / CELL), seen = new Uint8Array(GC * GR), q = [sr * GC + sc];
  if (BLOCK[q[0]]) return 0; seen[q[0]] = 1; let n = 0;
  while (q.length) { const m = q.pop(); n++; const c = m % GC, r = (m / GC) | 0; for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const cc = c + dc, rr = r + dr; if (cc < 0 || rr < 0 || cc >= GC || rr >= GR) continue; const k = rr * GC + cc; if (!seen[k] && !BLOCK[k]) { seen[k] = 1; q.push(k); } } }
  let free = 0; for (let i = 0; i < BLOCK.length; i++) if (!BLOCK[i]) free++;
  for (const team of ['P', 'B']) for (let i = 0; i < 5; i++) { const p = spawnPoint(team, i), k = Math.floor(p.y / CELL) * GC + Math.floor(p.x / CELL); if (!seen[k]) return 0; }
  return n / Math.max(1, free);
}
function buildArena(seed) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const R = mulberry(seed + attempt * 7919);
    const style = MAP_STYLES[Math.floor(R() * MAP_STYLES.length)];
    WORLD.w = 2200 + Math.round(R() * 10) * 60; WORLD.h = 1300 + Math.round(R() * 6) * 60;
    const W = WORLD.w, H = WORLD.h, w = [];
    const add = (x, y, ww, hh, kind) => w.push({ x: Math.round(x), y: Math.round(y), w: Math.round(ww), h: Math.round(hh), kind });
    add(-60, -60, W + 120, 60, 'edge'); add(-60, H, W + 120, 60, 'edge'); add(-60, 0, 60, H, 'edge'); add(W, 0, 60, H, 'edge');
    const half = [], cx = W / 2;
    const ok = (x, y, ww, hh) => x > 250 && x + ww < cx - 30 && y > 40 && y + hh < H - 40 && !half.some((o) => x < o[0] + o[2] + 70 && x + ww + 70 > o[0] && y < o[1] + o[3] + 70 && y + hh + 70 > o[1]);
    const kinds = ['hay', 'crate'];
    const layout = Math.floor(R() * 3);
    const count = 9 + Math.floor(R() * 6);
    for (let k = 0, tries = 0; k < count && tries < 400; tries++) {
      let ww, hh;
      if (layout === 0) { ww = 50 + R() * 110; hh = 50 + R() * 110; }                         // scattered cover
      else if (layout === 1) { const v = R() < 0.5; ww = v ? 50 : 150 + R() * 180; hh = v ? 150 + R() * 220 : 50; } // long walls and lanes
      else { ww = 60 + R() * 60; hh = 60 + R() * 60; if (R() < 0.35) { ww *= 2.2; } }          // bunkers
      const x = 260 + R() * (cx - 300 - ww), y = 60 + R() * (H - 120 - hh);
      if (!ok(x, y, ww, hh)) continue;
      half.push([x, y, ww, hh]); k++;
    }
    half.forEach(([x, y, ww, hh], i) => { const kind = kinds[i % 2]; add(x, y, ww, hh, kind); add(W - x - ww, y, ww, hh, kind); });
    // center piece: glitch pillars or a big crate
    if (R() < 0.6) { add(cx - 20, H * 0.18, 40, 150, 'glitch'); add(cx - 20, H * 0.82 - 150, 40, 150, 'glitch'); }
    else { add(cx - 55, H / 2 - 55, 110, 110, 'crate'); }
    WALLS = w; SOLID = w.filter((o) => o.kind !== 'edge');
    rebuildGrid();
    if (reachableShare() > 0.9) { MAPNAME = style.name; MAPSEED = seed; MAPTINT = style.tint; STATIC = null; return; }
  }
  STATIC = null;
}
let MAPTINT = [28, 16, 41];
buildArena(1);
const cellOf = (x, y) => [Math.max(0, Math.min(GC - 1, Math.floor(x / CELL))), Math.max(0, Math.min(GR - 1, Math.floor(y / CELL)))];
function nearestFree(c, r) {
  if (!BLOCK[r * GC + c]) return [c, r];
  for (let rad = 1; rad < 8; rad++) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
    const cc = c + dc, rr = r + dr; if (cc < 0 || rr < 0 || cc >= GC || rr >= GR) continue; if (!BLOCK[rr * GC + cc]) return [cc, rr];
  }
  return [c, r];
}
function astar(sx, sy, tx, ty) {
  let [sc, sr] = nearestFree(...cellOf(sx, sy)); const [tc, tr] = nearestFree(...cellOf(tx, ty));
  const start = sr * GC + sc, goal = tr * GC + tc; if (start === goal) return [{ x: tx, y: ty }];
  stampN++; const heap = [];
  const push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
  const h = (n) => { const dc = Math.abs((n % GC) - tc), dr = Math.abs(((n / GC) | 0) - tr); return (dc + dr) + (Math.SQRT2 - 2) * Math.min(dc, dr); };
  STAMP[start] = stampN; G_SCORE[start] = 0; CAME[start] = -1; push(start, h(start));
  let found = false, iter = 0;
  while (heap.length && iter++ < 9000) {
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
let autoFire = TOUCH && localStorage.getItem('ps_auto') === '1';
let aimAssist = +(localStorage.getItem('ps_assist') || (TOUCH ? 3 : 2));   // 1 off, 2 light, 3 strong
let G = null;
const input = { keys: {}, mx: 0, my: 0, mdown: false, touchMove: null, touchAim: null, ability: false, coverL: false, coverR: false };

function newEntity(team, kind, i, isPlayer) {
  const c = kind !== 'bot' ? CHARS[kind] : null;
  const base = spawnPoint(team, i);
  return {
    team, kind, isPlayer, human: !!isPlayer, pid: null, life: 0, abSeen: 0, name: c ? c.name : BOT_NAMES[i], spawn: { ...base }, x: base.x, y: base.y, vx: 0, vy: 0, a: team === 'P' ? 0 : Math.PI,
    r: c && c.small ? 17 : 21, hp: c ? c.hp : DIFF[diff].hp, maxhp: c ? c.hp : DIFF[diff].hp, dodgeCd: 0, cool: 0, dead: 0, abilityCd: 0, rapid: 0, shield: 2, frozen: 0, fast: 0, flash: 0, hurt: 0, bob: Math.random() * 6,
    stats: c || { speed: 200, rate: 0.36, dmg: 1, range: 560, spread: 0.06, shot: '#ff8c28', body: '#ff8c28' }, tags: 0, tagged: 0, shots: 0, hits: 0, picks: 0,
    ai: { target: null, think: Math.random() * 0.3, strafe: Math.random() < 0.5 ? 1 : -1, path: [], repath: 0, goal: null, chk: 0.5, lx: base.x, ly: base.y, escape: 0, ex: 0, ey: 0, react: 0, goalKind: '' },
  };
}

function startMatch() {
  buildArena((Math.random() * 1e9) | 0);
  const others = ORDER.filter((k) => k !== pick);
  const P = [newEntity('P', pick, 2, true)].concat(others.map((k, i) => newEntity('P', k, [0, 1, 3, 4][i], false)));
  const B = [0, 1, 2, 3, 4].map((i) => newEntity('B', 'bot', i, false));
  beginMatch(P.concat(B), P[0]);
}
function beginMatch(ents, me) {
  for (const e of ents) e.dodgeCd = 0;
  me.inv = MP.on ? null : [null, null, null, null];   // item slots (solo); online keeps instant power-ups
  G = { ents, player: me, slowTeam: 'B', pkId: 0, bullets: [], parts: [], rings: [], pops: [], pickups: [], score: { P: 0, B: 0 }, time: MATCH_TIME, slow: 0, pickupT: 3, cam: { x: 0, y: 0 }, shake: 0, t: 0 };
  G.cam.x = G.player.x - VW / Z / 2; G.cam.y = G.player.y * TILT - 40 - VH / Z / 2;
  showScreen(null); $('hud').classList.add('on'); document.body.classList.add('playing'); if (document.activeElement) document.activeElement.blur(); state = 'play';
  feed('Map: ' + MAPNAME); feed(MP.on && MP.mode === 'versus' ? 'Team vs team! Most tags wins.' : "Match start! Tag BROKE-pilot's bots!"); banner('FIGHT!');
  document.body.classList.toggle('mp', MP.on); $('pauseBtn').textContent = MP.on ? '\u2715' : 'II';
  if (TOUCH && VH > VW && !sessionStorage.getItem('ps_rot')) { sessionStorage.setItem('ps_rot', '1'); setTimeout(() => feed('Tip: turn your phone sideways for a wider view'), 1500); }
  if (ac() && AC.state === 'suspended') AC.resume();
  syncAutoBtn(); syncInv();
}

/* ---------------- HUD helpers ---------------- */
function feed(msg) { const d = document.createElement('div'); d.textContent = msg; $('feed').prepend(d); setTimeout(() => d.remove(), 3600); while ($('feed').children.length > 4) $('feed').lastChild.remove(); }
let bannerT = null;
function banner(t) { const b = $('banner'); b.textContent = t; b.style.opacity = 1; b.style.transform = 'scale(1.15)'; requestAnimationFrame(() => (b.style.transform = 'scale(1)')); clearTimeout(bannerT); bannerT = setTimeout(() => (b.style.opacity = 0), 1100); }

/* ---------------- combat ---------------- */
function fire(e, ang) {
  const s = e.stats;
  if (e.cool > 0 || e.dead > 0 || e.frozen > 0) return;
  e.cool = s.rate * (e.kind === 'bot' ? DIFF[diff].rate : 1) * (e.rapid > 0 ? 0.45 : 1) * (G.slow > 0 && e.team === G.slowTeam ? 1.8 : 1);
  const spread = (Math.random() - 0.5) * 2 * (s.spread + (e.human ? 0 : e.kind === 'bot' ? DIFF[diff].acc : DIFF[diff].mate));
  const a = ang + spread, sp = e.kind === 'chatgpt' ? 1500 : 950;
  G.bullets.push({ x: e.x + Math.cos(a) * (e.r + 14), y: e.y + Math.sin(a) * (e.r + 14), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: s.range / sp, owner: e, team: e.team, dmg: s.dmg, col: s.shot, bounce: s.bounce ? 1 : 0, beam: e.kind === 'chatgpt', age: 0 });
  e.shots++; e.flash = 0.06;
  if (e.isPlayer) (e.kind === 'chatgpt' ? SFX.beam : SFX.pew)();
}
function hitEnt(t, b) {
  if (t.shield > 0) { spark(b.x, b.y, '#ffffff', 6, 160); if (MP.host) MP.ev.push(['h', Math.round(b.x), Math.round(b.y), -1, G.ents.indexOf(t)]); return; }
  t.hp -= b.dmg; b.owner.hits++; t.hurt = 0.12; spark(b.x, b.y, b.col, 10, 220);
  if (MP.host) MP.ev.push(['h', Math.round(b.x), Math.round(b.y), G.ents.indexOf(b.owner), G.ents.indexOf(t)]);
  if (t.isPlayer) { G.shake = 0.22; SFX.hit(); }
  if (t.hp <= 0) {
    t.dead = RESPAWN; t.tagged++; b.owner.tags++; G.score[b.team]++;
    if (MP.host) MP.ev.push(['t', G.ents.indexOf(t), G.ents.indexOf(b.owner)]);
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
  if (MP.host) MP.ev.push(['a', G.ents.indexOf(e)]);
  if (e.kind === 'perci') e.rapid = 4;
  if (e.kind === 'miracle') { G.slow = 4; G.slowTeam = e.team === 'P' ? 'B' : 'P'; spark(e.x, e.y, '#ff8c28', 30); }
  if (e.kind === 'mixi') e.shield = 3;
  if (e.kind === 'jessica') { const t = G.ents.filter((o) => o.team !== e.team && o.dead <= 0).sort((a, b) => dist(a, e) - dist(b, e))[0]; if (t) { t.frozen = 3; spark(t.x, t.y, '#7cff6b', 24); } }
  if (e.kind === 'chatgpt' && (!e.human || e === G.player)) { const ox = e.x, oy = e.y, dd = e === G.player && e.moveAngle !== undefined ? e.moveAngle : e.a; moveEnt(e, Math.cos(dd) * 240, Math.sin(dd) * 240); spark(ox, oy, '#00e6ff', 20); spark(e.x, e.y, '#00e6ff', 20); }
}

/* ---------------- pickups (auto-collect on contact) ---------------- */
function spawnPickup() {
  const kinds = ['shield', 'shield', 'rapid', 'speed', 'charge'];
  for (let tries = 0; tries < 40; tries++) {
    const x = 260 + Math.random() * (WORLD.w - 520), y = 120 + Math.random() * (WORLD.h - 240);
    if (BLOCK[cellOf(x, y)[1] * GC + cellOf(x, y)[0]]) continue;
    if (G.pickups.some((p) => Math.hypot(p.x - x, p.y - y) < 200)) continue;
    G.pickups.push({ x, y, t: 0, id: ++G.pkId, kind: kinds[Math.floor(Math.random() * kinds.length)] }); G.rings.push({ x, y, r: 6, life: 0.5, col: '#ffffff' }); return;
  }
}
function applyPickup(e, kind) {
  if (kind === 'shield') { if (e.hp < e.maxhp) e.hp++; else e.shield = Math.max(e.shield, 2.5); }
  if (kind === 'rapid') e.rapid = Math.max(e.rapid, 4);
  if (kind === 'speed') e.fast = 4;
  if (kind === 'charge') e.abilityCd = 0;
}
function collect(e, pk) {
  if (e === G.player && e.inv) {
    const slot = e.inv.indexOf(null);
    if (slot < 0) return false;                          // slots full: leave it on the floor
    e.inv[slot] = pk.kind; pk.gone = true; e.picks++;
    spark(pk.x, pk.y, PICKUPS[pk.kind].col, 18, 200); G.rings.push({ x: pk.x, y: pk.y, r: 8, life: 0.4, col: PICKUPS[pk.kind].col });
    SFX.pick(); banner('STORED: ' + PICKUPS[pk.kind].label); buzz(20); G.pops.push({ x: pk.x, y: pk.y - 24, txt: '+10', life: 0.8, col: '#ffffff' });
    syncInv(); return true;
  }
  pk.gone = true; e.picks++;
  if (MP.host) MP.ev.push(['k', G.ents.indexOf(e), pk.kind, Math.round(pk.x), Math.round(pk.y)]);
  applyPickup(e, pk.kind);
  spark(pk.x, pk.y, PICKUPS[pk.kind].col, 18, 200); G.rings.push({ x: pk.x, y: pk.y, r: 8, life: 0.4, col: PICKUPS[pk.kind].col });
  if (e.isPlayer) { SFX.pick(); banner(PICKUPS[pk.kind].label); buzz(20); G.pops.push({ x: pk.x, y: pk.y - 24, txt: '+10', life: 0.8, col: '#ffffff' }); }
  return true;
}
function useItem(i) {
  const p = G && G.player;
  if (!p || state !== 'play' || !p.inv || p.dead > 0 || !p.inv[i]) return;
  const kind = p.inv[i]; p.inv[i] = null;
  applyPickup(p, kind); SFX.power(); banner(PICKUPS[kind].label); buzz(30);
  G.rings.push({ x: p.x, y: p.y, r: 10, life: 0.5, col: PICKUPS[kind].col }); spark(p.x, p.y, PICKUPS[kind].col, 16, 200);
  syncInv();
}
const INV_ICON = { shield: 'A+', rapid: '\u26A1', speed: '\u00BB', charge: '\u2605' };
function syncInv() {
  const box = $('inv'); if (!box || !G || !G.player) return;
  const inv = G.player.inv || [];
  box.querySelectorAll('.slot').forEach((b, i) => {
    const k = inv[i]; b.classList.toggle('full', !!k);
    b.style.setProperty('--c', k ? PICKUPS[k].col : '#5a4f70');
    b.innerHTML = `<span>${k ? INV_ICON[k] : ''}</span><i>${i + 1}</i>`;
  });
}

/* ---------------- AI ---------------- */
function nearestPickup(e, maxD) { let b = null, bd = maxD; for (const p of G.pickups) { const d = dist(p, e); if (d < bd) { bd = d; b = p; } } return b; }
function aiThink(e, dt) {
  const d = DIFF[diff], ai = e.ai;
  ai.think -= dt; ai.repath -= dt;
  if (ai.think <= 0) {
    ai.think = 0.25 + Math.random() * 0.25;
    let best = null, bd = 1e9;
    for (const f of G.ents) { if (f.team === e.team || f.dead > 0) continue; const dd = dist(e, f) * (los(e, f) ? 1 : 1.6) * (f.human && e.kind === 'bot' ? d.focus : 1) * (0.75 + 0.25 * (f.hp / f.maxhp)); if (dd < bd) { bd = dd; best = f; } }
    if (best !== ai.target) ai.react = e.kind === 'bot' ? d.react : 0.45;
    ai.target = best;
    if (Math.random() < 0.1) ai.strafe *= -1;
    // goal choice: pickups when hurt (or sometimes anyway), otherwise the target
    const pk = nearestPickup(e, e.hp < e.maxhp ? 650 : 280);
    if (pk && (e.hp < e.maxhp || Math.random() < (e.kind !== 'bot' ? 0.5 : 0.3))) { ai.goal = pk; ai.goalKind = 'pick'; }
    else if (best) { ai.goal = best; ai.goalKind = 'foe'; }
    else { ai.goal = { x: 300 + Math.random() * (WORLD.w - 600), y: 200 + Math.random() * (WORLD.h - 400) }; ai.goalKind = 'wander'; }
    if (e.kind !== 'bot' && e.abilityCd <= 0 && best && dist(e, best) < 480 && Math.random() < 0.25) useAbility(e);
  }
  if (ai.goal && ai.goal.gone) { ai.goal = ai.target; ai.goalKind = 'foe'; ai.path = []; }
  const t = ai.target;
  const spd = e.stats.speed * (e.kind === 'bot' ? d.speed : 0.88) * (G.slow > 0 && e.team === G.slowTeam ? 0.5 : 1) * (e.fast > 0 ? 1.35 : 1);
  let mx = 0, my = 0;
  const see = t && los(e, t), dd = t ? dist(e, t) : 1e9;
  // aim + shoot whenever a target is visible
  if (t && see) {
    const a = Math.atan2(t.y - e.y, t.x - e.x); e.a = a; ai.react -= dt;
    if (dd < e.stats.range && ai.react <= 0) {
      let aim = a;
      { const tt = dd / 950 * (e.kind === 'bot' ? d.lead : ALLY.lead); aim = Math.atan2(t.y + (t.vy || 0) * tt - e.y, t.x + (t.vx || 0) * tt - e.x); }
      fire(e, aim);
    }
  }
  // bots sidestep lasers that are about to hit them
  {
    e.dodgeCd -= dt;
    if (e.dodgeCd <= 0) for (const b of G.bullets) {
      if (b.team === e.team) continue;
      const rx = e.x - b.x, ry = e.y - b.y, sp = Math.hypot(b.vx, b.vy) || 1, along = (rx * b.vx + ry * b.vy) / sp;
      if (along < 0 || along > 260) continue;
      const perp = (rx * b.vy - ry * b.vx) / sp;
      if (Math.abs(perp) < e.r + 14) { const side = perp >= 0 ? 1 : -1, ang = Math.atan2(b.vy, b.vx) + side * Math.PI / 2; ai.ex = Math.cos(ang); ai.ey = Math.sin(ang); ai.escape = 0.28; e.dodgeCd = (e.kind === 'bot' ? d.dodge : ALLY.dodge) * (0.7 + Math.random() * 0.6); break; }
    }
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
      let gx = g.x, gy = g.y;
      if (ai.goalKind === 'foe' && !see) { const ang = Math.atan2(e.y - g.y, e.x - g.x) + ai.strafe * 0.9; gx = clamp(g.x + Math.cos(ang) * 220, 60, WORLD.w - 60); gy = clamp(g.y + Math.sin(ang) * 220, 60, WORLD.h - 60); }
      ai.path = astar(e.x, e.y, gx, gy); ai.pg = { x: g.x, y: g.y }; ai.repath = 0.7 + Math.random() * 0.3;
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
function autoTarget(p, coneDir, coneLimit) {
  let best = null, bs = 1e9;
  for (const e of G.ents) {
    if (e.team === p.team || e.dead > 0) continue; const d = dist(p, e); if (d > p.stats.range) continue; if (!los(p, e)) continue;
    let s = d; if (coneDir !== undefined) { let da = Math.abs(((Math.atan2(e.y - p.y, e.x - p.x) - coneDir + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (da > (coneLimit || 0.55)) continue; s = d * (1 + da * 2); }
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}

/* ---------------- local player control (solo, host and online guests) ---------------- */
function seekCover(e, side) {
  let best = null, bd = 230;
  for (const w of SOLID) {
    const r = e.r + 8;
    const cands = [{ x: w.x - r, y: clamp(e.y, w.y, w.y + w.h) }, { x: w.x + w.w + r, y: clamp(e.y, w.y, w.y + w.h) }, { x: clamp(e.x, w.x, w.x + w.w), y: w.y - r }, { x: clamp(e.x, w.x, w.x + w.w), y: w.y + w.h + r }];
    for (const c of cands) {
      const d = dist(e, c);
      if ((c.x - e.x) * side > 6 && d < bd) { const probe = { x: e.x, y: e.y, r: e.r }; moveEnt(probe, c.x - e.x, c.y - e.y); if (dist(probe, c) < 3) { best = c; bd = d; } }
    }
  }
  e.coverGoal = best;
  banner(best ? (side < 0 ? 'COVER LEFT' : 'COVER RIGHT') : 'NO COVER NEARBY'); if (best) buzz(15);
}
function controlLocal(e, dt, shoot, ability) {
    let mx = 0, my = 0; const k = input.keys;
    if (k.KeyW || k.ArrowUp) my -= 1; if (k.KeyS || k.ArrowDown) my += 1; if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1;
    if (input.touchMove) { mx = input.touchMove.dx; my = input.touchMove.dy; }
    const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    const spd = e.stats.speed * (e.fast > 0 ? 1.35 : 1) * (G.slow > 0 && e.team === G.slowTeam ? 0.5 : 1);
    if (input.coverL) { input.coverL = false; seekCover(e, -1); } else if (input.coverR) { input.coverR = false; seekCover(e, 1); }
    if (m > 0.2) { e.coverGoal = null; e.moveAngle = Math.atan2(my, mx); }
    const ox = e.x, oy = e.y;
    if (e.coverGoal) {
      const dx = e.coverGoal.x - e.x, dy = e.coverGoal.y - e.y, d = Math.hypot(dx, dy);
      if (d < 3) e.coverGoal = null; else { const st = Math.min(d, spd * 1.5 * dt); moveEnt(e, dx / d * st, dy / d * st); if (Math.hypot(e.x - ox, e.y - oy) < 0.1) e.coverGoal = null; }
    } else moveEnt(e, mx * spd * dt, my * spd * dt);
    e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt;
    // aim: your raw aim, then aim assist pulls it toward a bot near that direction (Off / Light / Strong)
    let raw = e.rawAim !== undefined ? e.rawAim : e.a, firing = false;
    if (input.touchAim && input.touchAim.m > 0.25) { raw = Math.atan2(input.touchAim.dy / TILT, input.touchAim.dx); firing = true; }
    else if (TOUCH) {
      const t = autoFire ? autoTarget(e) : null;
      if (t) { raw = Math.atan2(t.y - e.y, t.x - e.x); firing = true; } else if (m > 0.2) raw = Math.atan2(my, mx);
    } else { raw = Math.atan2((input.my / Z + G.cam.y + LASER_Z) / TILT - e.y, input.mx / Z + G.cam.x - e.x); firing = input.mdown; }
    e.rawAim = raw; e.a = raw; e.assistTarget = null;
    if (aimAssist > 1) {
      const cone = aimAssist === 3 ? 0.48 : 0.28, t = autoTarget(e, raw, cone);
      if (t) { const off = ((Math.atan2(t.y - e.y, t.x - e.x) - raw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; e.a = raw + off * (aimAssist === 3 ? 0.85 : 0.55); e.assistTarget = t; }
    }
    if (firing) shoot(e, e.a);
    if (input.ability) { input.ability = false; ability(e); }
}
/* ---------------- update ---------------- */
function update(dt) {
  if (!G || state !== 'play') return;
  G.t += dt; G.time -= dt; G.slow = Math.max(0, G.slow - dt); G.shake = Math.max(0, G.shake - dt);
  if (G.time <= 0) return endMatch();
  const p = G.player;
  for (const e of G.ents) {
    e.cool = Math.max(0, e.cool - dt); e.abilityCd = Math.max(0, e.abilityCd - dt); e.rapid = Math.max(0, e.rapid - dt); e.shield = Math.max(0, e.shield - dt); e.frozen = Math.max(0, e.frozen - dt); e.fast = Math.max(0, e.fast - dt); e.flash = Math.max(0, e.flash - dt); e.hurt = Math.max(0, e.hurt - dt);
    if (e.dead > 0) { e.dead -= dt; if (e.dead <= 0) { e.hp = e.maxhp; e.x = e.spawn.x; e.y = e.spawn.y; e.tx = undefined; e.coverGoal = null; e.life++; e.shield = 1.5; e.ai.path = []; G.rings.push({ x: e.x, y: e.y, r: 6, life: 0.4, col: '#ffffff' }); } continue; }
    if (e.frozen > 0) continue;
    if (e === G.player) controlLocal(e, dt, fire, useAbility);
    else if (e.human) controlRemote(e, dt);
    else aiThink(e, dt);
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
  fxStep(dt);
  // pickups: everyone collects automatically by walking over them
  G.pickupT -= dt;
  if (G.pickupT <= 0) { G.pickupT = 5.5; if (G.pickups.length < 5) spawnPickup(); }
  for (const pk of G.pickups) { pk.t += dt; for (const e of G.ents) if (e.dead <= 0 && dist(e, pk) < e.r + 20) { if (collect(e, pk)) break; } }
  G.pickups = G.pickups.filter((q) => !q.gone);
  cameraStep(dt);
  hud();
}
function fxStep(dt) {
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; q.life -= dt; }
  G.parts = G.parts.filter((q) => q.life > 0);
  for (const r of G.rings) { r.r += 260 * dt; r.life -= dt; } G.rings = G.rings.filter((r) => r.life > 0);
  for (const q of G.pops) { q.y -= 40 * dt; q.life -= dt; } G.pops = G.pops.filter((q) => q.life > 0);
}
function cameraStep(dt) {
  const p = G.player;
  // camera: smooth follow with a little look-ahead toward the aim
  const vw = VW / Z, vh = VH / Z;
  const fh = WORLD.h * TILT;
  const look = 0;   // camera stays centered on you
  const tx = clamp(p.x + Math.cos(p.a) * 70 * look - vw / 2, -80, WORLD.w - vw + 80), ty = clamp(p.y * TILT - 40 + Math.sin(p.a) * 50 * look - vh / 2, -140, fh - vh + 80);
  G.cam.x += ((vw > WORLD.w + 160 ? (WORLD.w - vw) / 2 : tx) - G.cam.x) * Math.min(1, dt * 8);
  G.cam.y += ((vh > fh + 220 ? (fh - vh) / 2 - 40 : ty) - G.cam.y) * Math.min(1, dt * 8);
}

/* ---------------- graphics: pre-rendered layers ---------------- */
let VIGN = null;
const GLOW = {};
function glowSprite(col, size = 128) {
  const k = col + size; if (GLOW[k]) return GLOW[k];
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); gr.addColorStop(0, col); gr.addColorStop(0.35, col + '88'); gr.addColorStop(1, col + '00');
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return (GLOW[k] = c);
}
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function buildStatic() {
  const c = document.createElement('canvas'); c.width = WORLD.w; c.height = Math.ceil(WORLD.h * TILT); const g = c.getContext('2d'); const R = rng(7);
  g.save(); g.scale(1, TILT);
  // floor: concrete slabs with joints, scuffs, lane paint and safety stripes (tactical V10 look)
  const tint = MAPTINT;
  for (let y = 0; y < WORLD.h; y += 96) for (let x = 0; x < WORLD.w; x += 128) {
    const v = 46 + R() * 12; g.fillStyle = `rgb(${Math.round(v + tint[0] * 0.25)},${Math.round(v + 3 + tint[1] * 0.25)},${Math.round(v + 6 + tint[2] * 0.25)})`; g.fillRect(x + 1, y + 1, 126, 94);
    g.fillStyle = 'rgba(20,23,26,0.65)'; g.fillRect(x, y, 128, 2); g.fillRect(x, y, 2, 96); g.fillStyle = 'rgba(90,92,95,0.14)'; g.fillRect(x + 2, y + 3, 123, 1);
  }
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(14,16,18,${0.14 + R() * 0.14})`; g.fillRect(R() * WORLD.w, R() * WORLD.h, 2 + R() * 7, 1 + R() * 3); }
  g.strokeStyle = 'rgba(204,190,102,0.55)'; g.lineWidth = 3;
  for (let x = 40; x < WORLD.w - 80; x += 100) { g.beginPath(); g.moveTo(x, WORLD.h / 2); g.lineTo(x + 45, WORLD.h / 2); g.stroke(); }
  for (const y of [32, WORLD.h - 32]) { g.fillStyle = 'rgba(140,125,61,0.7)'; g.fillRect(0, y - 8, WORLD.w, 16); g.fillStyle = 'rgba(20,23,26,0.9)'; for (let x = 0; x < WORLD.w - 24; x += 32) { g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 12, y - 8); g.lineTo(x + 24, y + 8); g.lineTo(x + 12, y + 8); g.closePath(); g.fill(); } }
  for (const w of SOLID) { g.fillStyle = 'rgba(15,18,20,0.75)'; g.fillRect(w.x - 5, w.y - 5, w.w + 10, w.h + 10); g.strokeStyle = 'rgba(178,155,64,0.35)'; g.lineWidth = 2; g.strokeRect(w.x - 8, w.y - 8, w.w + 16, w.h + 16); }
  // dream fog pools
  for (let i = 0; i < 9; i++) { const x = R() * WORLD.w, y = R() * WORLD.h, r = 180 + R() * 260; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${R() < 0.5 ? '120,60,220' : '0,160,220'},0.07)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
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
  g.restore();
  // soft shadows the boxes cast on the floor
  g.fillStyle = 'rgba(0,0,0,0.32)';
  for (const w of SOLID) { const z = WALL_Z[w.kind] || 60; g.beginPath(); g.moveTo(w.x, (w.y + w.h) * TILT); g.lineTo(w.x + w.w, (w.y + w.h) * TILT); g.lineTo(w.x + w.w + z * 0.5, (w.y + w.h) * TILT + z * 0.16); g.lineTo(w.x + w.w + z * 0.5, w.y * TILT + z * 0.16); g.lineTo(w.x + w.w, w.y * TILT); g.closePath(); g.fill(); }
  g.save(); g.scale(1, TILT);
  // arena border
  g.strokeStyle = '#8232dc'; g.lineWidth = 6; g.strokeRect(3, 3, WORLD.w - 6, WORLD.h - 6); g.strokeStyle = 'rgba(0,230,255,0.4)'; g.lineWidth = 2; g.strokeRect(10, 10, WORLD.w - 20, WORLD.h - 20);
  g.restore();
  STATIC = c;
}
function buildVignette() {
  const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(VW / 2)); c.height = Math.max(2, Math.round(VH / 2)); const g = c.getContext('2d');
  const vg = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.3, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.72);
  vg.addColorStop(0, 'rgba(30,6,56,0)'); vg.addColorStop(1, 'rgba(20,4,40,0.62)'); g.fillStyle = vg; g.fillRect(0, 0, c.width, c.height); VIGN = c;
}

/* ---------------- 2.5D renderer helpers ---------------- */
const TILT = 0.7, CHAR_SCALE = 1.4, LASER_Z = 62;   // tilt of the floor, character size, chest height of lasers                        // floor is seen at an angle: screen y = world y * TILT - height
const WALL_Z = { hay: 54, crate: 70, glitch: 130 };
const OUTFIT = {
  perci:   { top: '#c81e32', trim: '#ffffff', legs: '#2a3350', shoe: '#f4f4f4', skin: '#5a3420', gun: '#3a2c08' },
  miracle: { top: '#2a9e9c', trim: '#c070ff', legs: '#3d5a92', shoe: '#c070ff', skin: '#6b3e24', gun: '#2a1e3a' },
  chatgpt: { top: '#16161c', trim: '#ffffff', legs: '#16161c', shoe: '#0a0a0e', skin: '#22222c', gun: '#16323e', tall: 1.1 },
  jessica: { top: '#26262e', trim: '#7cff6b', legs: '#34405e', shoe: '#e8e8e8', skin: '#f0c8a8', gun: '#1e2a1e' },
  mixi:    { top: '#b48ce6', trim: '#ffd60a', legs: '#ff78c8', shoe: '#ffffff', skin: '#6b3e24', gun: '#3a1e34' },
};
function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
function wallSprite(w) {
  if (w.spr) return w.spr;
  const z = WALL_Z[w.kind] || 60, top = Math.max(6, Math.round(w.h * TILT)), c = document.createElement('canvas');
  c.width = w.w + 6; c.height = top + z + 6; const g = c.getContext('2d'), R = rng(Math.abs(w.x * 7 + w.y * 13) + 1);
  g.translate(3, 3);
  const padded = w.kind === 'hay', tall = w.kind === 'glitch';
  g.fillStyle = padded ? '#4e5961' : tall ? '#465462' : '#657077'; g.fillRect(0, 0, w.w, top);
  g.fillStyle = padded ? '#303b44' : '#29343c'; g.fillRect(0, top, w.w, z);
  g.strokeStyle = 'rgba(133,145,152,0.65)'; g.lineWidth = 2; g.strokeRect(4, 4, w.w - 8, Math.max(2, top - 8));
  g.strokeStyle = 'rgba(23,35,44,0.7)'; g.strokeRect(5, top + 5, w.w - 10, z - 10);
  for (let xx = 12; xx < w.w - 8; xx += 24) { g.fillStyle = 'rgba(18,27,33,0.65)'; g.fillRect(xx, top + 9, 3, z - 18); g.fillStyle = 'rgba(154,164,170,0.38)'; g.fillRect(xx + 3, top + 9, 2, z - 18); }
  g.fillStyle = '#b19a43'; g.fillRect(5, top + 5, w.w - 10, 5);
  g.fillStyle = '#111a20'; for (let xx = 7; xx < w.w - 15; xx += 16) g.fillRect(xx, top + 5, 7, 5);
  if (tall) { g.fillStyle = 'rgba(66,196,220,0.85)'; g.fillRect(6, top + z - 12, w.w - 12, 3); }
  g.fillStyle = '#9ca5ac'; for (const xx of [8, w.w - 8]) for (const yy of [top + 13, top + z - 9]) { g.beginPath(); g.arc(xx, yy, 2, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(0, 0, w.w, 3);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, top, w.w, 4);
  g.strokeStyle = '#120a10'; g.lineWidth = 3; g.strokeRect(0, 0, w.w, top); g.strokeRect(0, top, w.w, z);
  w.spr = { c, z, top };
  return w.spr;
}
function drawWall(w, t) {
  const p = G.player;
  const s = wallSprite(w);
  const hides = p && p.dead <= 0 && p.y < w.y + w.h && p.x > w.x - 26 && p.x < w.x + w.w + 26 && p.y * TILT > w.y * TILT - s.z - 4 && p.y * TILT - 125 < (w.y + w.h) * TILT;
  if (hides) ctx.globalAlpha = 0.42;
  ctx.drawImage(s.c, w.x - 3, w.y * TILT - s.z - 3);
  ctx.globalAlpha = 1;
}
function drawGunArms(e, s, sa, shY, armCol, handCol, gunCol, F) {
  const cx = Math.cos(sa), cy = Math.sin(sa), gx = cx * 14 * s, gy = shY + 14 * s + cy * 14 * s, len = (e.kind === 'chatgpt' ? 36 : 30) * s;
  ctx.save(); ctx.translate(gx, gy); ctx.rotate(sa); if (cx < 0) ctx.scale(1, -1);
  ctx.fillStyle = F(gunCol); ctx.strokeStyle = '#0c0610'; ctx.lineWidth = 2.5; rr(ctx, -6 * s, -5 * s, len, 10 * s, 3 * s); ctx.fill(); ctx.stroke();
  ctx.fillStyle = e.stats.shot; ctx.fillRect(len - 9 * s, -3.5 * s, 6 * s, 7 * s);
  ctx.fillStyle = e.team === 'P' ? '#ffd60a' : '#ff8c28'; ctx.fillRect(-2 * s, -2 * s, 12 * s, 2.5 * s);
  if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; const g2 = glowSprite(e.stats.shot, 64); ctx.drawImage(g2, len - 22 * s, -22 * s, 44 * s, 44 * s); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  ctx.strokeStyle = F(armCol); ctx.lineWidth = 7 * s; ctx.lineCap = 'round';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 11 * s, shY + 5 * s); ctx.lineTo(gx - cx * 3 * s + side * 2 * s, gy - cy * 3 * s); ctx.stroke(); }
  ctx.lineCap = 'butt';
  ctx.fillStyle = F(handCol); ctx.beginPath(); ctx.arc(gx, gy, 4.5 * s, 0, Math.PI * 2); ctx.fill();
}
function drawHead(img, hy, hr, face, F, flash) {
  ctx.save(); ctx.beginPath(); ctx.arc(0, hy, hr, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = '#2a1a22'; ctx.fill(); ctx.clip(); ctx.translate(0, hy);
  if (img && img.complete && img.naturalWidth) { const D = hr * 2.7; ctx.save(); ctx.scale(face, 1); ctx.drawImage(img, -D / 2, -D * 0.47, D, D); ctx.restore(); }
  if (flash) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-hr, -hr, hr * 2, hr * 2); }
  ctx.restore();
  ctx.strokeStyle = '#0c0610'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, hy, hr, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, hy, hr - 2, -2.6, -1.3); ctx.stroke();
}

/* ---------------- render ---------------- */
function drawPickupIcon(pk, t) {
  const bob = Math.sin(pk.t * 4) * 5, x = pk.x, y = pk.y * TILT - 34 + bob, col = PICKUPS[pk.kind].col;
  ctx.globalCompositeOperation = 'lighter'; const gs = glowSprite(col); const s = 90 + Math.sin(pk.t * 5) * 10; ctx.drawImage(gs, x - s / 2, y - s / 2, s, s); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y * TILT, 16 - bob, 6, 0, 0, Math.PI * 2); ctx.fill();
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
  const c = e.kind !== 'bot' ? CHARS[e.kind] : null, team = e.team === 'P' ? '#ff3b55' : '#ff8c28';
  const s = (e.r / 21) * CHAR_SCALE, X = e.x, Y = e.y * TILT;
  const moving = Math.hypot(e.vx, e.vy) > 20, ph = t * 13 + e.bob;
  const flash = e.hurt > 0.04, F = (col) => (flash ? '#ffffff' : col);
  const sa = Math.atan2(Math.sin(e.a) * TILT, Math.cos(e.a)), face = Math.cos(e.a) < 0 ? -1 : 1, back = Math.sin(e.a) < -0.35;
  // on the floor: shadow, team ring, your ring, status rings
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(X, Y, 22 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; const gs = glowSprite(e.isPlayer ? '#ffd60a' : team); ctx.globalAlpha = 0.45; ctx.drawImage(gs, X - 40 * s, Y - 16 * s, 80 * s, 32 * s); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = team; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(X, Y, 20 * s, 8 * s, 0, 0, Math.PI * 2); ctx.stroke();
  if (e.isPlayer) { ctx.strokeStyle = 'rgba(255,214,10,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.ellipse(X, Y, 31 * s, 12 * s, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  if (e.frozen > 0) { ctx.strokeStyle = '#7cff6b'; ctx.setLineDash([4, 4]); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(X, Y, 26 * s, 10 * s, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  if (e.team === G.slowTeam && G.slow > 0) { ctx.fillStyle = 'rgba(255,140,40,0.3)'; ctx.beginPath(); ctx.ellipse(X, Y, 24 * s, 10 * s, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.save(); ctx.translate(X, Y);
  let headY;
  if (!c) {
    // BROKE-pilot bot: hover pod, metal body, screen head
    const hv = Math.sin(t * 4 + e.bob) * 3 * s, base = -14 * s + hv, shY = base - 40 * s;
    ctx.globalCompositeOperation = 'lighter'; const tg = glowSprite('#ff8c28', 64); ctx.drawImage(tg, -14 * s, -10 * s + hv * 0.5, 28 * s, 20 * s); ctx.globalCompositeOperation = 'source-over';
    if (back) drawGunArms(e, s, sa, shY, '#5a5462', '#7a7484', '#3a1e08', F);
    ctx.fillStyle = F('#3a3442'); ctx.beginPath(); ctx.ellipse(0, base, 14 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#0c0610'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = F('#4a4452'); rr(ctx, -15 * s, shY, 30 * s, 36 * s, 8 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = F('#5e5868'); rr(ctx, -15 * s, shY, 30 * s, 8 * s, 6 * s); ctx.fill();
    ctx.fillStyle = (t * 2 + e.bob) % 1 < 0.5 ? '#ff3030' : '#ff8c28'; ctx.beginPath(); ctx.arc(0, shY + 20 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    const hy = shY - 18 * s; headY = hy - 18 * s;
    ctx.fillStyle = F('#121018'); rr(ctx, -17 * s, hy - 14 * s, 34 * s, 28 * s, 7 * s); ctx.fill(); ctx.strokeStyle = '#ff8c28'; ctx.lineWidth = 2.5; ctx.stroke();
    if (IMG.brokepilot.complete) { ctx.save(); rr(ctx, -14 * s, hy - 11 * s, 28 * s, 22 * s, 5 * s); ctx.clip(); ctx.scale(face, 1); ctx.drawImage(IMG.brokepilot, -15 * s, -15 * s + hy, 30 * s, 30 * s); ctx.restore(); }
    ctx.strokeStyle = '#0c0610'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, hy - 14 * s); ctx.lineTo(0, hy - 24 * s); ctx.stroke();
    ctx.fillStyle = (t * 2 + e.bob) % 1 < 0.5 ? '#ff3030' : '#ff8c28'; ctx.beginPath(); ctx.arc(0, hy - 26 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
    if (!back) drawGunArms(e, s, sa, shY, '#5a5462', '#7a7484', '#3a1e08', F);
  } else {
    const o = OUTFIT[e.kind] || OUTFIT.perci, hg = o.tall || 1;
    const hip = -30 * s * hg, shY = -60 * s * hg, hr = 16 * s, hy = shY - hr + 2 * s; headY = hy - hr;
    const bounce = moving ? Math.abs(Math.sin(ph)) * 2 * s : Math.sin(t * 2 + e.bob) * 0.6 * s;
    ctx.translate(0, -bounce);
    // legs + shoes
    for (const side of [-1, 1]) {
      const sw = moving ? Math.sin(ph) * side : 0, fx = side * 6 * s + sw * 7 * s, lift = moving ? Math.max(0, Math.cos(ph) * side) * 5 * s : 0;
      ctx.strokeStyle = F(o.legs); ctx.lineWidth = 9 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(side * 5 * s, hip); ctx.lineTo(fx, -6 * s - lift + bounce); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = F(o.shoe); ctx.beginPath(); ctx.ellipse(fx + face * 3 * s, -3 * s - lift + bounce, 7.5 * s, 4.2 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#0c0610'; ctx.lineWidth = 2; ctx.stroke();
      if (e.kind === 'perci') { ctx.fillStyle = '#c81e32'; ctx.fillRect(fx + face * 3 * s - 5 * s, -3 * s - lift + bounce, 10 * s, 1.6 * s); }
    }
    if (back) drawGunArms(e, s, sa, shY, o.top, o.skin, o.gun, F);
    // torso
    ctx.fillStyle = F(o.top); ctx.strokeStyle = '#0c0610'; ctx.lineWidth = 2.5; rr(ctx, -13 * s, shY, 26 * s, hip - shY + 5 * s, 7 * s); ctx.fill(); ctx.stroke();
    if (!flash) {
      if (e.kind === 'perci') { ctx.fillStyle = '#ffffff'; ctx.fillRect(-12 * s, shY + 6 * s, 2.5 * s, hip - shY - 6 * s); ctx.fillRect(9.5 * s, shY + 6 * s, 2.5 * s, hip - shY - 6 * s); ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.arc(0, shY + 3 * s, 8 * s, 0.3, Math.PI - 0.3); ctx.stroke(); }
      else if (e.kind === 'chatgpt') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-6 * s, shY); ctx.lineTo(6 * s, shY); ctx.lineTo(0, shY + 12 * s); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#00e6ff'; ctx.beginPath(); ctx.moveTo(-2 * s, shY + 2 * s); ctx.lineTo(2 * s, shY + 2 * s); ctx.lineTo(3 * s, shY + 20 * s); ctx.lineTo(0, shY + 24 * s); ctx.lineTo(-3 * s, shY + 20 * s); ctx.closePath(); ctx.fill(); }
      else if (e.kind === 'jessica') { ctx.strokeStyle = o.trim; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(0, shY + 4 * s); ctx.lineTo(0, hip + 2 * s); ctx.stroke(); ctx.fillStyle = o.trim; ctx.fillRect(-13 * s, hip - 1 * s, 26 * s, 3 * s); }
      else if (e.kind === 'miracle') { ctx.fillStyle = o.trim; ctx.fillRect(-13 * s, hip - 1 * s, 26 * s, 3.5 * s); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5 * s; rr(ctx, -7 * s, hip - 12 * s, 14 * s, 8 * s, 3 * s); ctx.stroke(); }
      else if (e.kind === 'mixi') { ctx.fillStyle = o.trim; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.5 * s : 6 * s, a = (i / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, shY + 13 * s + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
    }
    drawHead(IMG[e.kind], hy, hr, face, F, flash);
    if (!back) drawGunArms(e, s, sa, shY, o.top, o.skin, o.gun, F);
    ctx.translate(0, bounce);
  }
  // shield bubble, speed lines
  if (e.shield > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(180,240,255,${0.55 + 0.3 * Math.sin(t * 12)})`; ctx.fillStyle = 'rgba(120,220,255,0.12)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, headY * 0.5, 30 * s, -headY * 0.5 + 10 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
  if (e.fast > 0) { ctx.strokeStyle = 'rgba(124,255,107,0.75)'; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { const yy = -18 * s - k * 16 * s; ctx.beginPath(); ctx.moveTo(-e.vx * 0.05, yy - e.vy * 0.05 * TILT); ctx.lineTo(-e.vx * 0.13, yy - e.vy * 0.13 * TILT); ctx.stroke(); } }
  // shield pips above the head, name under the feet
  const pw = 8 * s, gap = 2.5 * s, tot = e.maxhp * pw + (e.maxhp - 1) * gap;
  for (let i = 0; i < e.maxhp; i++) { ctx.fillStyle = i < e.hp ? (e.team === 'P' ? '#00e6ff' : '#ffd60a') : 'rgba(255,255,255,0.18)'; rr(ctx, -tot / 2 + i * (pw + gap), headY - 10 * s, pw, 5 * s, 2 * s); ctx.fill(); }
  ctx.font = (e.isPlayer ? '700 13px' : '600 11px') + ' Poppins, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  const lab = e.isPlayer ? 'YOU' : e.human ? '★ ' + e.name : e.name; ctx.strokeText(lab, 0, 22 * s); ctx.fillStyle = e.isPlayer ? '#ffd60a' : 'rgba(255,255,255,0.88)'; ctx.fillText(lab, 0, 22 * s);
  ctx.restore();
}
function drawWorld(t) {
  if (!STATIC) buildStatic();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#0b0912'; ctx.fillRect(0, 0, VW, VH);
  const sx = G.shake > 0 ? (Math.random() - 0.5) * 12 : 0, sy = G.shake > 0 ? (Math.random() - 0.5) * 12 : 0;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(Z, Z); ctx.translate(-G.cam.x, -G.cam.y);
  // back wall behind the arena for depth
  const bw = ctx.createLinearGradient(0, -110, 0, 0); bw.addColorStop(0, '#120a20'); bw.addColorStop(1, '#2a1640');
  ctx.fillStyle = bw; ctx.fillRect(-60, -110, WORLD.w + 120, 110);
  ctx.fillStyle = 'rgba(0,230,255,0.5)'; ctx.fillRect(-60, -8, WORLD.w + 120, 3); ctx.fillStyle = 'rgba(192,112,255,0.35)'; ctx.fillRect(-60, -60, WORLD.w + 120, 2);
  ctx.drawImage(STATIC, 0, 0);
  // front lip of the floor
  ctx.fillStyle = '#100818'; ctx.fillRect(-60, WORLD.h * TILT, WORLD.w + 120, 26); ctx.fillStyle = 'rgba(130,50,220,0.6)'; ctx.fillRect(-60, WORLD.h * TILT, WORLD.w + 120, 3);
  // floor effects: respawn timers + rings
  for (const e of G.ents) if (e.dead > 0) { ctx.globalAlpha = 0.6; ctx.strokeStyle = e.team === 'P' ? '#ff3b55' : '#ff8c28'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(e.spawn.x, e.spawn.y * TILT, 20, 20 * TILT, 0, -Math.PI / 2, -Math.PI / 2 + (1 - e.dead / RESPAWN) * Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.globalCompositeOperation = 'lighter';
  for (const r of G.rings) { ctx.globalAlpha = Math.max(0, r.life * 2); ctx.strokeStyle = r.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(r.x, r.y * TILT, r.r, r.r * TILT, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // everything that stands up, drawn back to front
  const items = [];
  for (const w of SOLID) items.push([w.y + w.h, 0, w]);
  for (const pk of G.pickups) items.push([pk.y, 1, pk]);
  for (const e of G.ents) if (e.dead <= 0) items.push([e.y, 2, e]);
  items.sort((a, b) => a[0] - b[0]);
  for (const [, kind, o] of items) { if (kind === 0) drawWall(o, t); else if (kind === 1) drawPickupIcon(o, t); else drawEnt(o, t); }
  const at = G.player.assistTarget;
  if (G.player.dead <= 0 && at && at.dead <= 0) {
    const x = at.x, y = at.y * TILT - LASER_Z; ctx.strokeStyle = 'rgba(77,255,190,0.85)'; ctx.lineWidth = 2;
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + dx * 12, y + dy * 21); ctx.lineTo(x + dx * 21, y + dy * 21); ctx.lineTo(x + dx * 21, y + dy * 12); ctx.stroke(); }
  }
  // lasers fly at chest height (additive glow)
  const LZ = LASER_Z;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const b of G.bullets) {
    const k = b.beam ? 0.06 : 0.03, x1 = b.x, y1 = b.y * TILT - LZ, x2 = b.x - b.vx * k, y2 = (b.y - b.vy * k) * TILT - LZ;
    ctx.strokeStyle = 'rgba(0,0,0,0.0)';
    ctx.strokeStyle = b.col + '55'; ctx.lineWidth = b.beam ? 12 : 9; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = b.col; ctx.lineWidth = b.beam ? 5 : 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(b.x - b.vx * k * 0.6, (b.y - b.vy * k * 0.6) * TILT - LZ); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.fillStyle = b.col; ctx.beginPath(); ctx.ellipse(b.x, b.y * TILT, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  for (const q of G.parts) { ctx.globalAlpha = Math.max(0, q.life * 2.2); ctx.fillStyle = q.col; ctx.fillRect(q.x - 2.5, q.y * TILT - 50 - 2.5, 5, 5); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
  for (const q of G.pops) { ctx.globalAlpha = Math.min(1, q.life * 2); ctx.font = '22px Anton, Impact'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#100814'; const py = q.y * TILT - 100; ctx.strokeText(q.txt, q.x, py); ctx.fillStyle = q.col; ctx.fillText(q.txt, q.x, py); }
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
    if (e.team === p.team || e.dead > 0) continue;
    const sx = (e.x - G.cam.x) * Z, sy = (e.y * TILT - 40 - G.cam.y) * Z; if (sx > 0 && sx < VW && sy > 0 && sy < VH) continue;
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
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x + G.cam.x * k, y + (G.cam.y / TILT) * k, (VW / Z) * k, (VH / Z / TILT) * k);
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
  const p = G.player, mine = G.score[p.team], theirs = G.score[p.team === 'P' ? 'B' : 'P'], won = mine > theirs, tie = mine === theirs;
  if (MP.on) mpEnded();
  const acc = p.shots ? Math.round((p.hits / p.shots) * 100) : 0;
  const raw = p.tags * 100 + (won ? 500 : tie ? 200 : 0) + acc * 3 + p.picks * 10 - p.tagged * 25;
  const score = Math.max(0, Math.round(raw * DIFF[diff].mult));
  lastResult = { score, tags: p.tags, tagged: p.tagged, acc, won, tie, character: p.kind, difficulty: diff, team: G.score.P, enemy: G.score.B };
  $('endTitle').textContent = won ? 'YOU WIN!' : tie ? 'TIE GAME' : (MP.on && MP.mode === 'versus' ? (p.team === 'P' ? 'TEAM BROKE WINS' : 'TEAM PERCI WINS') : 'BROKE-PILOT WINS');
  $('endTitle').className = 'big ' + (won ? 'win' : 'lose');
  $('endSub').textContent = `Team Perci ${G.score.P} — ${G.score.B} ${MP.on && MP.mode === 'versus' ? 'Team BROKE' : 'BROKE-pilot'} • ${CHARS[p.kind].name} • ${diff.toUpperCase()}${MP.on ? ' • ONLINE' : ''}`;
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
$('bStart').onclick = startMatch; $('bAgain').onclick = () => { if (MP.on) { showScreen('sLobby'); renderLobby(); return; } buildCards(); showScreen('sSelect'); };
$('bSubmit').onclick = submitScore; $('bShare').onclick = share;
$('muteBtn').onclick = () => { muted = !muted; localStorage.setItem('ps_muted', muted ? '1' : '0'); $('muteBtn').textContent = muted ? '🔇' : '🔊'; };
$('muteBtn').textContent = muted ? '🔇' : '🔊';
function syncAutoBtn() { const b = $('autoBtn'); if (!b) return; b.textContent = 'AUTO ' + (autoFire ? 'ON' : 'OFF'); b.classList.toggle('on', autoFire); }
if ($('autoBtn')) $('autoBtn').onclick = () => { autoFire = !autoFire; localStorage.setItem('ps_auto', autoFire ? '1' : '0'); syncAutoBtn(); };
function togglePause() { if (MP.on) { if (state === 'play') mpQuitTap(); return; } if (state === 'play') { state = 'paused'; } else if (state === 'paused') { state = 'play'; } }
$('pauseBtn').onclick = togglePause;
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !MP.on) state = 'paused'; });

/* ---------------- input ---------------- */
addEventListener('keydown', (e) => { input.keys[e.code] = true; if (e.code === 'Space' && (state === 'play' || state === 'paused')) { input.ability = true; e.preventDefault(); } if (e.code === 'KeyP' || e.code === 'Escape') togglePause(); });
addEventListener('keyup', (e) => { input.keys[e.code] = false; });
addEventListener('keydown', (e) => {
  if (state !== 'play' || e.repeat) return;
  if (e.code === 'KeyQ') input.coverL = true;
  else if (e.code === 'KeyE') input.coverR = true;
  else if (/^Digit[1-4]$/.test(e.code)) useItem(+e.code.slice(5) - 1);
  else if (e.code === 'KeyF' && G && G.player.inv) { const i = G.player.inv.findIndex((k) => k); if (i >= 0) useItem(i); }
});
const tapBtn = (el, fn) => { if (!el) return; el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); el.addEventListener('click', fn); };
tapBtn($('covL'), () => { input.coverL = true; }); tapBtn($('covR'), () => { input.coverR = true; });
document.querySelectorAll('#inv .slot').forEach((b, i) => tapBtn(b, () => useItem(i)));
// settings screen: aim assist + phone auto-fire
function syncSettings() {
  document.querySelectorAll('#setAssist button').forEach((b) => b.classList.toggle('sel', +b.dataset.v === aimAssist));
  document.querySelectorAll('#setAuto button').forEach((b) => b.classList.toggle('sel', (b.dataset.v === '1') === autoFire));
}
document.querySelectorAll('#setAssist button').forEach((b) => (b.onclick = () => { aimAssist = +b.dataset.v; localStorage.setItem('ps_assist', String(aimAssist)); syncSettings(); }));
document.querySelectorAll('#setAuto button').forEach((b) => (b.onclick = () => { autoFire = b.dataset.v === '1'; localStorage.setItem('ps_auto', autoFire ? '1' : '0'); syncSettings(); syncAutoBtn(); }));
if ($('bSettings')) $('bSettings').onclick = () => { syncSettings(); showScreen('sSettings'); };
if ($('bBack5')) $('bBack5').onclick = () => showScreen('sTitle');
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

/* ---------------- online multiplayer (host runs the match, guests send moves) ---------------- */
const MP_LOCAL = new URLSearchParams(location.search).get('mp') === 'local';   // test mode: rooms between tabs on one device
const ROOM_Q = (new URLSearchParams(location.search).get('room') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
const MP = { on: false, host: false, code: '', pid: Math.random().toString(36).slice(2, 10), name: '', mode: 'coop', roster: [], net: null, inputs: {}, heard: {}, ev: [], sendT: 0, lastSnap: 0, abN: 0, fireSince: false, started: false, playing: false, joined: false, tick: null, homeDiff: null, quitT: 0 };
const NET_EVENTS = ['hello', 'lobby', 'pick', 'team', 'bye', 'start', 'in', 'snap', 'end', 'full'];
const PK_KINDS = Object.keys(PICKUPS);
const lerpA = (a, b, k) => a + ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * k;

function loadSB() {
  return new Promise((res, rej) => {
    if (window.supabase && window.supabase.createClient) return res();
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = () => res(); s.onerror = () => rej(new Error('lib')); document.head.appendChild(s);
  });
}
async function mpConnect(code) {
  const topic = 'perci-room-' + code, H = {};
  if (MP_LOCAL || !online()) {
    const bc = new BroadcastChannel(topic);
    bc.onmessage = (m) => { const f = H[m.data.ev]; if (f) f(m.data.p); };
    return { send: (ev, p) => bc.postMessage({ ev, p }), on: (ev, f) => (H[ev] = f), close: () => bc.close() };
  }
  await loadSB();
  const sb = window.supabase.createClient(LEADERBOARD.url, LEADERBOARD.anonKey, { realtime: { params: { eventsPerSecond: 30 } } });
  const ch = sb.channel(topic, { config: { broadcast: { self: false, ack: false } } });
  for (const ev of NET_EVENTS) ch.on('broadcast', { event: ev }, (m) => { const f = H[ev]; if (f) f(m.payload); });
  await new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('timeout')), 12000);
    ch.subscribe((st) => { if (st === 'SUBSCRIBED') { clearTimeout(to); res(); } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') { clearTimeout(to); rej(new Error(st)); } });
  });
  return { send: (ev, p) => ch.send({ type: 'broadcast', event: ev, payload: p }), on: (ev, f) => (H[ev] = f), close: () => { try { sb.removeChannel(ch); } catch (e) {} } };
}

/* ----- lobby ----- */
const newCode = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
const mpMax = () => (MP.mode === 'coop' ? 5 : 10);
function teamFor() { const p = MP.roster.filter((r) => r.team === 'P').length, b = MP.roster.filter((r) => r.team === 'B').length; return MP.mode === 'coop' || p <= b ? 'P' : 'B'; }
function lobbyMsg(extra) { return Object.assign({ code: MP.code, host: MP.pid, roster: MP.roster, mode: MP.mode, diff, playing: MP.started }, extra || {}); }
function pushLobby(extra) { if (MP.host && MP.net) MP.net.send('lobby', lobbyMsg(extra)); renderLobby(); }
function mpMsg(t) { $('mpMsg').textContent = t; }

async function mpCreate() {
  const name = cleanName($('mpName').value); if (!name) return mpMsg('Pick a name first: 2-14 letters or numbers.');
  localStorage.setItem('ps_name', name); mpMsg('Opening a room...');
  const code = newCode();
  try { MP.net = await mpConnect(code); } catch (e) { return mpMsg("Couldn't open a room. Check your connection and try again."); }
  Object.assign(MP, { on: true, host: true, code, name, mode: 'coop', started: false, homeDiff: diff, roster: [{ pid: MP.pid, name, kind: pick, team: 'P', host: true }], heard: {} });
  mpWire(); mpStartTick(); showScreen('sLobby'); pushLobby();
}
async function mpJoin(codeIn) {
  const name = cleanName($('mpName').value); if (!name) return mpMsg('Pick a name first: 2-14 letters or numbers.');
  const code = (codeIn || $('mpCode').value || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (code.length !== 4) return mpMsg('Room codes are 4 letters.');
  localStorage.setItem('ps_name', name); mpMsg('Joining ' + code + '...');
  try { MP.net = await mpConnect(code); } catch (e) { return mpMsg("Couldn't connect. Check your connection and try again."); }
  Object.assign(MP, { on: true, host: false, code, name, joined: false, started: false, homeDiff: diff, roster: [] });
  mpWire(); mpStartTick(); mpHello();
  const t0 = Date.now();
  const wait = setInterval(() => {
    if (!MP.on || MP.code !== code) return clearInterval(wait);
    if (MP.joined) { clearInterval(wait); showScreen('sLobby'); renderLobby(); }
    else if (Date.now() - t0 > 9000) { clearInterval(wait); mpLeave(true); showScreen('sOnline'); mpMsg('No room called ' + code + '. Check the code with your friend.'); }
  }, 250);
}
const mpHello = () => MP.net && MP.net.send('hello', { pid: MP.pid, name: MP.name, kind: pick });

function mpWire() {
  const n = MP.net;
  if (MP.host) {
    n.on('hello', (p) => {
      MP.heard[p.pid] = performance.now();
      if (MP.roster.some((r) => r.pid === p.pid)) return;
      if (MP.roster.length >= mpMax()) { n.send('full', { pid: p.pid }); return; }
      MP.roster.push({ pid: p.pid, name: cleanName(p.name) || 'PLAYER', kind: ORDER.includes(p.kind) ? p.kind : 'perci', team: teamFor() });
      if (state !== 'play') feedLobby(p.name + ' joined'); pushLobby();
    });
    n.on('pick', (p) => { const r = MP.roster.find((x) => x.pid === p.pid); if (r && ORDER.includes(p.kind) && !MP.started) { r.kind = p.kind; pushLobby(); } });
    n.on('team', (p) => { const r = MP.roster.find((x) => x.pid === p.pid); if (r && MP.mode === 'versus' && !MP.started) { const to = r.team === 'P' ? 'B' : 'P'; if (MP.roster.filter((x) => x.team === to).length < 5) { r.team = to; pushLobby(); } } });
    n.on('bye', (p) => { MP.roster = MP.roster.filter((x) => x.pid !== p.pid); if (G && MP.started) { const e = G.ents.find((x) => x.pid === p.pid); if (e && e.human) { e.human = false; feed(e.name + ' left, a bot took over'); } } pushLobby(); });
    n.on('in', (p) => { MP.inputs[p.pid] = p; MP.heard[p.pid] = performance.now(); });
  } else {
    n.on('lobby', (p) => {
      MP.hostSeen = performance.now();
      if (p.closed) { mpLeave(true); showScreen('sOnline'); mpMsg('The host closed the room.'); return; }
      MP.roster = p.roster; MP.mode = p.mode; MP.playing = p.playing; MP.hostPid = p.host;
      if (!MP.started && diff !== p.diff) diff = p.diff;
      const was = MP.joined; MP.joined = p.roster.some((r) => r.pid === MP.pid);
      if (was && !MP.joined && !MP.started) mpHello();
      if (state !== 'play' && $('sLobby').classList.contains('on')) renderLobby();
    });
    n.on('full', (p) => { if (p.pid !== MP.pid) return; mpLeave(true); showScreen('sOnline'); mpMsg('That room is full.'); });
    n.on('start', (p) => { if (!p.defs.some((d) => d.pid === MP.pid)) return; diff = p.diff; MP.mode = p.mode; mpBegin(p.defs, p.seed); });
    n.on('snap', (s) => { MP.hostSeen = performance.now(); applySnap(s); });
    n.on('end', (p) => { MP.hostSeen = performance.now(); if (!MP.started || !G) return; G.score.P = p.s[0]; G.score.B = p.s[1]; endMatch(); });
  }
}
function mpStartTick() {
  clearInterval(MP.tick);
  MP.tick = setInterval(() => {
    if (!MP.on) return;
    const now = performance.now();
    if (MP.host) {
      if (!MP.started) {
        const before = MP.roster.length;
        MP.roster = MP.roster.filter((r) => r.host || now - (MP.heard[r.pid] || now) < 12000);
        if (MP.roster.length !== before || Math.random() < 0.5) pushLobby();
      }
    } else {
      if (!MP.started) mpHello();
      if (MP.joined && !MP.started && now - (MP.hostSeen || now) > 15000) { mpLeave(true); showScreen('sOnline'); mpMsg('Lost the host. The room may be closed.'); }
    }
  }, 1000);
}
function mpLeave(quiet) {
  if (MP.net) { try { if (MP.host) MP.net.send('lobby', lobbyMsg({ closed: true })); else MP.net.send('bye', { pid: MP.pid }); } catch (e) {} setTimeout(((n) => () => n.close())(MP.net), 300); }
  clearInterval(MP.tick); MP.net = null; MP.on = false; MP.started = false; MP.joined = false; MP.roster = [];
  if (MP.homeDiff) diff = MP.homeDiff;
  document.body.classList.remove('mp'); $('pauseBtn').textContent = 'II';
  if (!quiet) showScreen('sTitle');
}
function buildDefs() {
  const defs = [], slots = [2, 1, 3, 0, 4];
  for (const team of ['P', 'B']) {
    const hum = MP.roster.filter((r) => r.team === team).slice(0, 5);
    hum.forEach((r, i) => defs.push({ team, kind: r.kind, slot: slots[i], pid: r.pid, name: r.name }));
    if (team === 'P') { const left = ORDER.filter((k) => !hum.some((h) => h.kind === k)); for (let i = hum.length; i < 5; i++) defs.push({ team, kind: left[i - hum.length], slot: slots[i] }); }
    else for (let i = hum.length; i < 5; i++) defs.push({ team, kind: 'bot', slot: slots[i] });
  }
  return defs;
}
function mpStartMatch() {
  if (!MP.host || MP.started) return;
  const defs = buildDefs(), seed = (Math.random() * 1e9) | 0; MP.net.send('start', { defs, diff, mode: MP.mode, seed }); mpBegin(defs, seed);
}
function mpBegin(defs, seed) {
  buildArena(seed || 1);
  const ents = defs.map((d) => { const e = newEntity(d.team, d.kind, d.slot, d.pid === MP.pid); if (d.pid) { e.human = true; e.pid = d.pid; e.name = d.name; } return e; });
  const me = ents.find((e) => e.pid === MP.pid); if (!me) return;
  MP.started = true; MP.inputs = {}; MP.ev = []; MP.abN = 0; MP.sendT = 0; MP.lastSnap = performance.now();
  const now = performance.now(); for (const e of ents) if (e.pid) MP.heard[e.pid] = now;
  beginMatch(ents, me);
}
function mpEnded() { if (MP.host && MP.net) { MP.net.send('snap', mpSnap()); MP.net.send('end', { s: [G.score.P, G.score.B] }); } MP.started = false; if (MP.host) setTimeout(() => pushLobby(), 400); }
function mpQuitTap() {
  const now = performance.now();
  if (now - MP.quitT < 2500) { if (MP.host && G) { MP.net.send('end', { s: [G.score.P, G.score.B] }); } state = 'menu'; $('hud').classList.remove('on'); document.body.classList.remove('playing'); mpLeave(); return; }
  MP.quitT = now; banner(MP.host ? 'TAP ✕ AGAIN TO END FOR ALL' : 'TAP ✕ AGAIN TO LEAVE');
}

/* ----- host: remote players + snapshots ----- */
function controlRemote(e, dt) {
  const inp = MP.inputs[e.pid]; if (!inp) return;
  if (inp.l === e.life) {
    if (e.tx === undefined || Math.hypot(inp.x - e.x, inp.y - e.y) > 260) { e.x = inp.x; e.y = inp.y; }
    e.tx = clamp(inp.x, 0, WORLD.w); e.ty = clamp(inp.y, 0, WORLD.h);
    const k = Math.min(1, dt * 15), ox = e.x, oy = e.y; e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; pushOut(e); e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt;
  }
  e.a = inp.a; if (inp.f) fire(e, e.a);
  if (inp.ab > e.abSeen) { e.abSeen = inp.ab; useAbility(e); }
}
function mpSnap() {
  const ix = new Map(G.ents.map((e, i) => [e, i]));
  return {
    t: +G.time.toFixed(2), s: [G.score.P, G.score.B], sl: [+G.slow.toFixed(1), G.slowTeam],
    e: G.ents.map((e) => [Math.round(e.x), Math.round(e.y), +e.a.toFixed(2), e.hp, +Math.max(0, e.dead).toFixed(1), e.life, (e.shield > 0 ? 1 : 0) | (e.frozen > 0 ? 2 : 0) | (e.fast > 0 ? 4 : 0) | (e.rapid > 0 ? 8 : 0), e.tags, e.tagged, e.shots, e.hits, e.picks, +e.abilityCd.toFixed(1), e.human ? 1 : 0]),
    b: G.bullets.filter((b) => b.life > 0).map((b) => [Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), ix.get(b.owner), b.bounce, +b.life.toFixed(2)]),
    k: G.pickups.map((p) => [Math.round(p.x), Math.round(p.y), PK_KINDS.indexOf(p.kind), p.id]),
    ev: MP.ev.splice(0),
  };
}
function mpHostTick(dt) {
  MP.sendT -= dt;
  if (MP.sendT <= 0) { MP.sendT = 0.1; MP.net.send('snap', mpSnap()); }
  const now = performance.now();
  for (const e of G.ents) if (e.human && e !== G.player && now - (MP.heard[e.pid] || now) > 8000) { e.human = false; feed(e.name + ' dropped, a bot took over'); }
}

/* ----- guest: predict yourself, smooth everyone else ----- */
function clientShoot(e, ang) {
  MP.fireSince = true;
  if (e.cool > 0 || e.dead > 0 || e.frozen > 0) return;
  const s = e.stats; e.cool = s.rate * (e.rapid > 0 ? 0.45 : 1) * (G.slow > 0 && e.team === G.slowTeam ? 1.8 : 1);
  const sp = e.kind === 'chatgpt' ? 1500 : 950;
  G.bullets.push({ x: e.x + Math.cos(ang) * (e.r + 14), y: e.y + Math.sin(ang) * (e.r + 14), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: s.range / sp, team: e.team, col: s.shot, bounce: s.bounce ? 1 : 0, beam: e.kind === 'chatgpt', mine: true });
  e.flash = 0.06; (e.kind === 'chatgpt' ? SFX.beam : SFX.pew)();
}
function clientAbility(e) {
  if (e.abilityCd > 0 || e.dead > 0) return;
  const c = CHARS[e.kind]; MP.abN++; e.abilityCd = c.cd;
  SFX.power(); banner(c.ability); buzz(60); G.rings.push({ x: e.x, y: e.y, r: 10, life: 0.5, col: c.shot });
  if (e.kind === 'chatgpt') { const ox = e.x, oy = e.y, dd = e.moveAngle !== undefined ? e.moveAngle : e.a; moveEnt(e, Math.cos(dd) * 240, Math.sin(dd) * 240); spark(ox, oy, '#00e6ff', 20); spark(e.x, e.y, '#00e6ff', 20); }
}
function updateClient(dt) {
  G.t += dt; G.time = Math.max(0, G.time - dt); G.slow = Math.max(0, G.slow - dt); G.shake = Math.max(0, G.shake - dt);
  const me = G.player;
  for (const e of G.ents) {
    e.cool = Math.max(0, e.cool - dt); e.flash = Math.max(0, e.flash - dt); e.hurt = Math.max(0, e.hurt - dt);
    if (e.dead > 0) { e.dead = Math.max(0.01, e.dead - dt); continue; }
    if (e === me) { e.abilityCd = Math.max(0, e.abilityCd - dt); if (e.frozen <= 0) controlLocal(e, dt, clientShoot, clientAbility); else if (input.ability) input.ability = false; }
    else if (e.tx !== undefined) { const k = Math.min(1, dt * 12), ox = e.x, oy = e.y; e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt; e.a = lerpA(e.a, e.ta, Math.min(1, dt * 15)); }
  }
  for (const b of G.bullets) {
    const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    let wall = null; for (const w of WALLS) if (nx > w.x && nx < w.x + w.w && ny > w.y && ny < w.y + w.h) { wall = w; break; }
    if (wall) { if (b.bounce > 0) { b.bounce--; if (b.x > wall.x && b.x < wall.x + wall.w) b.vy *= -1; else b.vx *= -1; } else { b.life = 0; spark(b.x, b.y, b.col, 4, 120); } }
    else { b.x = nx; b.y = ny; }
    if (b.mine) for (const e of G.ents) if (e.team !== b.team && e.dead <= 0 && (e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (e.r + 4) ** 2) { b.life = 0; break; }
    b.life -= dt;
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  fxStep(dt);
  for (const pk of G.pickups) pk.t += dt;
  cameraStep(dt); hud();
  MP.sendT -= dt;
  if (MP.sendT <= 0) { MP.sendT = 0.1; MP.net.send('in', { pid: MP.pid, x: Math.round(me.x), y: Math.round(me.y), a: +me.a.toFixed(2), f: MP.fireSince ? 1 : 0, ab: MP.abN, l: me.life }); MP.fireSince = false; }
  if (performance.now() - MP.lastSnap > 6000) { state = 'menu'; $('hud').classList.remove('on'); document.body.classList.remove('playing'); mpLeave(true); showScreen('sOnline'); mpMsg('Lost the host, so the match ended.'); }
}
function applySnap(s) {
  if (!G || !MP.started || state !== 'play') return;
  MP.lastSnap = MP.hostSeen = performance.now();
  G.time = s.t; G.score.P = s.s[0]; G.score.B = s.s[1]; G.slow = s.sl[0]; G.slowTeam = s.sl[1];
  const me = G.player;
  s.e.forEach((r, i) => {
    const e = G.ents[i]; if (!e) return;
    const [x, y, a, hp, dead, life, fl, tags, tagged, shots, hits, picks, cd, hum] = r;
    e.hp = hp; e.tags = tags; e.tagged = tagged; e.picks = picks; e.human = !!hum;
    e.shield = fl & 1 ? 0.3 : 0; e.frozen = fl & 2 ? 0.3 : 0; e.fast = fl & 4 ? 0.3 : 0; e.rapid = fl & 8 ? 0.3 : 0;
    if (dead > 0 || e.dead <= 0) e.dead = dead;
    if (e === me) { e.hits = hits; e.shots = shots; if (Math.abs(e.abilityCd - cd) > 1) e.abilityCd = cd; if (life !== e.life) { e.life = life; e.x = x; e.y = y; e.dead = dead; } }
    else {
      if (shots > e.shots) e.flash = 0.08; e.shots = shots; e.hits = hits;
      e.tx = x; e.ty = y; e.ta = a;
      if (life !== e.life || Math.hypot(x - e.x, y - e.y) > 250) { e.x = x; e.y = y; e.a = a; e.life = life; e.dead = dead; }
    }
  });
  G.bullets = G.bullets.filter((b) => b.mine).concat(s.b.filter((r) => G.ents[r[4]] && G.ents[r[4]] !== me).map((r) => { const o = G.ents[r[4]]; return { x: r[0], y: r[1], vx: r[2], vy: r[3], team: o.team, col: o.stats.shot, beam: o.kind === 'chatgpt', bounce: r[5], life: r[6] }; }));
  G.pickups = s.k.map((r) => { const old = G.pickups.find((q) => q.id === r[3]); return { x: r[0], y: r[1], kind: PK_KINDS[r[2]], id: r[3], t: old ? old.t : 0 }; });
  for (const v of s.ev) applyEv(v, me);
}
function applyEv(v, me) {
  if (v[0] === 'h') { const t = G.ents[v[4]]; if (v[3] < 0) { spark(v[1], v[2], '#ffffff', 6, 160); return; } const o = G.ents[v[3]]; spark(v[1], v[2], o ? o.stats.shot : '#fff', 10, 220); if (t) t.hurt = 0.12; if (t === me) { G.shake = 0.22; SFX.hit(); } }
  else if (v[0] === 't') {
    const t = G.ents[v[1]], o = G.ents[v[2]]; if (!t || !o) return;
    spark(t.x, t.y, t.team === 'P' ? '#ff5050' : '#ff8c28', 30, 320); G.rings.push({ x: t.x, y: t.y, r: 10, life: 0.45, col: o.stats.shot });
    G.pops.push({ x: t.x, y: t.y - 30, txt: 'TAGGED!', life: 0.9, col: o.team === 'P' ? '#ffd60a' : '#ff8c28' }); feed(`${o.name} tagged ${t.name}`);
    if (o === me) { SFX.tag(); banner(['TAGGED!', 'GOT EM!', 'A-PLUS SHOT!', "LET'S GOOO!"][Math.floor(Math.random() * 4)]); }
    if (t === me) banner('YOU GOT TAGGED');
  } else if (v[0] === 'k') {
    const e = G.ents[v[1]], pk = PICKUPS[v[2]]; if (!pk) return;
    spark(v[3], v[4], pk.col, 18, 200); G.rings.push({ x: v[3], y: v[4], r: 8, life: 0.4, col: pk.col });
    if (e === me) { SFX.pick(); banner(pk.label); buzz(20); G.pops.push({ x: v[3], y: v[4] - 24, txt: '+10', life: 0.8, col: '#ffffff' }); }
  } else if (v[0] === 'a') { const e = G.ents[v[1]]; if (e && e !== me) G.rings.push({ x: e.x, y: e.y, r: 10, life: 0.5, col: e.stats.shot }); }
}

/* ----- lobby screens ----- */
function feedLobby(t) { const el = $('lbMsg'); if (el) { el.textContent = t; } }
function tokRow(el, cur, onPick) {
  el.innerHTML = ORDER.map((k) => `<button class="tok ${k === cur ? 'sel' : ''}" data-k="${k}"><img src="assets/${k}_tok.png" alt=""><span>${CHARS[k].name}</span></button>`).join('');
  el.querySelectorAll('.tok').forEach((b) => (b.onclick = () => onPick(b.dataset.k)));
}
function renderLobby() {
  if (!MP.on) return;
  $('lbCode').textContent = MP.code;
  const me = MP.roster.find((r) => r.pid === MP.pid);
  document.querySelectorAll('#lbMode button').forEach((b) => { b.classList.toggle('sel', b.dataset.m === MP.mode); b.disabled = !MP.host; });
  document.querySelectorAll('#lbDiff button').forEach((b) => { b.classList.toggle('sel', b.dataset.d === diff); b.disabled = !MP.host; });
  tokRow($('lbChars'), me ? me.kind : pick, (k) => { pick = k; localStorage.setItem('ps_pick', k); SFX.pick(); if (MP.host) { if (me) me.kind = k; pushLobby(); } else { MP.net.send('pick', { pid: MP.pid, kind: k }); if (me) { me.kind = k; renderLobby(); } } });
  const row = (r) => `<div class="pl ${r.pid === MP.pid ? 'me' : ''}"><img src="assets/${r.kind}_tok.png" alt="">${esc(r.name)}${r.host ? ' <i>HOST</i>' : ''}${r.pid === MP.pid ? ' <i>YOU</i>' : ''}</div>`;
  const P = MP.roster.filter((r) => r.team === 'P'), B = MP.roster.filter((r) => r.team === 'B');
  $('lbP').innerHTML = `<h4>TEAM PERCI</h4>${P.map(row).join('')}${P.length < 5 ? `<div class="pl bot">+ ${5 - P.length} crew bot${5 - P.length > 1 ? 's' : ''}</div>` : ''}`;
  $('lbB').innerHTML = MP.mode === 'coop' ? `<h4>BROKE-PILOT</h4><div class="pl bot">5 A+ bots</div>` : `<h4>TEAM BROKE</h4>${B.map(row).join('')}${B.length < 5 ? `<div class="pl bot">+ ${5 - B.length} A+ bot${5 - B.length > 1 ? 's' : ''}</div>` : ''}`;
  $('bSwitch').style.display = MP.mode === 'versus' ? '' : 'none';
  $('bGo').style.display = MP.host ? '' : 'none';
  $('lbWho').textContent = MP.roster.length + ' player' + (MP.roster.length === 1 ? '' : 's') + ' in the room';
  if (!MP.host) $('lbMsg').textContent = MP.playing ? "A match is running. You're in the next one." : 'Waiting for the host to start...';
  else if (!$('lbMsg').textContent) $('lbMsg').textContent = 'Share the code. Bots fill any empty spots.';
}
$('bOnline').onclick = () => { ac(); $('mpName').value = localStorage.getItem('ps_name') || ''; if (ROOM_Q) $('mpCode').value = ROOM_Q; const pk = (k) => { pick = k; localStorage.setItem('ps_pick', k); SFX.pick(); tokRow($('mpChars'), pick, pk); }; tokRow($('mpChars'), pick, pk); mpMsg(''); showScreen('sOnline'); };
$('bCreate').onclick = mpCreate;
$('bJoin').onclick = () => mpJoin();
$('mpCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') mpJoin(); });
$('bBack4').onclick = () => showScreen('sTitle');
$('bLeave').onclick = () => mpLeave();
$('bGo').onclick = mpStartMatch;
$('bSwitch').onclick = () => { if (MP.host) { const r = MP.roster.find((x) => x.pid === MP.pid); const to = r.team === 'P' ? 'B' : 'P'; if (MP.roster.filter((x) => x.team === to).length < 5) { r.team = to; pushLobby(); } } else MP.net.send('team', { pid: MP.pid }); };
document.querySelectorAll('#lbMode button').forEach((b) => (b.onclick = () => {
  if (!MP.host || MP.started) return;
  MP.mode = b.dataset.m;
  if (MP.mode === 'coop') { MP.roster.forEach((r) => (r.team = 'P')); if (MP.roster.length > 5) { const cut = MP.roster.slice(5); MP.roster = MP.roster.slice(0, 5); cut.forEach((r) => MP.net.send('full', { pid: r.pid })); } }
  else MP.roster.forEach((r, i) => (r.team = i % 2 ? 'B' : 'P'));
  pushLobby();
}));
document.querySelectorAll('#lbDiff button').forEach((b) => (b.onclick = () => { if (!MP.host || MP.started) return; diff = b.dataset.d; pushLobby(); }));
$('bInvite').onclick = async () => {
  const url = location.origin + location.pathname + '?room=' + MP.code;
  const txt = `Join my Perci Shorti laser tag room! Code: ${MP.code}\n${url}`;
  try { if (navigator.share) await navigator.share({ title: 'Perci Shorti Laser Tag', text: txt }); else { await navigator.clipboard.writeText(txt); feedLobby('Invite copied! Paste it to your friends.'); } } catch (e) {}
};
addEventListener('pagehide', () => { if (MP.on && MP.net) { try { MP.net.send(MP.host ? 'lobby' : 'bye', MP.host ? lobbyMsg({ closed: true }) : { pid: MP.pid }); } catch (e) {} } });

/* ---------------- loop ---------------- */
resize();
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  if (state === 'play') { if (MP.on && !MP.host) updateClient(dt); else { update(dt); if (MP.on && MP.host && G && state === 'play') mpHostTick(dt); } if (G) drawWorld(t); }
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
  if (owner || !t || Date.now() >= t) { showScreen('sTitle'); if (ROOM_Q) $('bOnline').onclick(); if (owner && t && Date.now() < t) { const p = document.createElement('div'); p.textContent = 'PRIVATE PREVIEW • public unlock ' + new Date(t).toLocaleString(); p.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);background:#8232dc;color:#fff;font:700 12px Poppins;padding:4px 12px;border-radius:10px;z-index:9;pointer-events:none'; p.className = 'previewTag'; document.body.appendChild(p); } return; }
  showScreen('sLocked');
  $('lockWhen').textContent = 'Opens ' + new Date(t).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const tick = () => { const ms = t - Date.now(); if (ms <= 0) { location.reload(); return; } const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60; $('lockCount').textContent = (d ? d + 'd ' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); };
  tick(); setInterval(tick, 1000);
})();

window.__ps = { useItem, get aimAssist() { return aimAssist; }, get Z() { return Z; }, buildArena, get map() { return { w: WORLD.w, h: WORLD.h, name: MAPNAME, walls: SOLID.length }; }, MP, startMatch, get G() { return G; }, endMatch, astar, set pickChar(k) { pick = k; } };
})();
