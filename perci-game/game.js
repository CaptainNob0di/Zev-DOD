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
  Z = Math.max(0.36, Z * ({ normal: 1, wide: 0.8, widest: 0.66 }[localStorage.getItem('ps_view') || 'wide'] || 0.8));   // VIEW setting: see more of the arena
  if (VH > VW * 1.1) Z = Math.max(0.3, Z * 0.85);   // phones held upright: zoom out more so you can see across the arena
  buildVignette();
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 250)); if (window.visualViewport) visualViewport.addEventListener('resize', resize);

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
const DIFF = { easy: { acc: 0.17, react: 0.42, mult: 0.75, speed: 0.98, mate: 0.2, lead: 0.0, dodge: 99, rate: 1.2, hp: 3, focus: 0.85 }, normal: { acc: 0.12, react: 0.33, mult: 1, speed: 1.02, mate: 0.22, lead: 0.35, dodge: 2.4, rate: 1.08, hp: 3, focus: 0.75 }, hard: { acc: 0.065, react: 0.2, mult: 1.5, speed: 1.1, mate: 0.26, lead: 0.7, dodge: 1.4, rate: 0.9, hp: 4, focus: 0.6 } };
const MATCH_TIME = 120, RESPAWN = 3, WORLD = { w: 2400, h: 1500 };
const PICKUPS = {
  shield: { col: '#00e6ff', label: '+1 SHIELD' },
  rapid:  { col: '#ffd60a', label: 'RAPID FIRE!' },
  speed:  { col: '#7cff6b', label: 'SPEED BOOST!' },
  charge: { col: '#c070ff', label: 'POWER READY!' },
};
PICKUPS.top = { col: '#c8a2ff', label: 'SPINNING TOP: WORLD FLIP!' };   // flips dream / real (see the twist section)

/* ---------------- assets ---------------- */
const IMG = {};
['perci', 'miracle', 'chatgpt', 'jessica', 'mixi', 'brokepilot'].forEach((k) => { const i = new Image(); i.src = 'assets/' + k + '_tok.png'; IMG[k] = i; });
IMG.aplus = new Image(); IMG.aplus.src = 'assets/aplus.png';
IMG.title = new Image(); IMG.title.src = 'assets/title.png';
IMG.title.onload = () => { STATIC = null; };

/* ---------------- audio (synth) ---------------- */
let AC = null, muted = localStorage.getItem('ps_muted') === '1';
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state !== 'running' && AC.resume) { try { AC.resume(); } catch (e) {} } return AC; }
// browsers keep sound off until the first tap / key: unlock the audio engine on the first one (also plays a silent blip for iOS)
(function unlockAudio() {
  const go = () => {
    const a = ac(); if (!a) return;
    try { const b = a.createBuffer(1, 1, 22050), s = a.createBufferSource(); s.buffer = b; s.connect(a.destination); s.start(0); } catch (e) {}
    a.resume && a.resume().then(() => { if (a.state === 'running') ['pointerdown', 'touchend', 'keydown', 'click'].forEach((t) => removeEventListener(t, go, true)); }).catch(() => {});
  };
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach((t) => addEventListener(t, go, true));
})();
function beep(f0, f1, dur, type = 'square', vol = 0.06) {
  if (muted) return; const a = ac(); if (!a || a.state === 'suspended') return;
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
// each team's half must be one connected area holding all 5 of its spawns (teams can't cross the center line)
function reachableShare() {
  const m0 = WORLD.w / 2, seen = new Uint8Array(GC * GR); let n = 0, free = 0;
  const inHalf = (team, c) => team === 'P' ? c * CELL + CELL / 2 < m0 - 28 : c * CELL + CELL / 2 > m0 + 28;
  for (let i = 0; i < BLOCK.length; i++) if (!BLOCK[i] && (inHalf('P', i % GC) || inHalf('B', i % GC))) free++;
  for (const team of ['P', 'B']) {
    const s = spawnPoint(team, 2), st = Math.floor(s.y / CELL) * GC + Math.floor(s.x / CELL), q = [st];
    if (BLOCK[st]) return 0; seen[st] = 1;
    while (q.length) { const m = q.pop(); n++; const c = m % GC, r = (m / GC) | 0; for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const cc = c + dc, rr = r + dr; if (cc < 0 || rr < 0 || cc >= GC || rr >= GR || !inHalf(team, cc)) continue; const k = rr * GC + cc; if (!seen[k] && !BLOCK[k]) { seen[k] = 1; q.push(k); } } }
    for (let i = 0; i < 5; i++) { const p = spawnPoint(team, i), k = Math.floor(p.y / CELL) * GC + Math.floor(p.x / CELL); if (!seen[k]) return 0; }
  }
  return n / Math.max(1, free);
}
// Story arenas: one hand-built location per chapter (data in arenas.js, made by arenas/gen.py, shared with the handheld)
let ARENA = null;
function loadArena(id) {
  const a = (window.PS_ARENAS || []).find((x) => x.id === id);
  if (!a) { buildArena(7); return; }
  WORLD.w = a.w; WORLD.h = a.h;
  const W = a.w, H = a.h, w = [];
  w.push({ x: -60, y: -60, w: W + 120, h: 60, kind: 'edge' }, { x: -60, y: H, w: W + 120, h: 60, kind: 'edge' }, { x: -60, y: 0, w: 60, h: H, kind: 'edge' }, { x: W, y: 0, w: 60, h: H, kind: 'edge' });
  for (const p of a.pieces) w.push({ x: p.x, y: p.y, w: p.w, h: p.h, kind: p.kind, z: p.z, ops: p.ops });
  WALLS = w; SOLID = w.filter((o) => o.kind !== 'edge');
  rebuildGrid();
  ARENA = a; MAPNAME = a.name; MAPSEED = 0; STATIC = null;
}
// runs the paint ops written by arenas/gen.py
function runOps(g, ops) {
  for (const o of ops) {
    const k = o[0];
    if (k === 'r') { g.globalAlpha = o[6]; g.fillStyle = o[5]; g.fillRect(o[1], o[2], o[3], o[4]); }
    else if (k === 'o') { g.globalAlpha = o[6]; g.strokeStyle = o[5]; g.lineWidth = o[7]; g.strokeRect(o[1], o[2], o[3], o[4]); }
    else if (k === 'l') { g.globalAlpha = o[6]; g.strokeStyle = o[5]; g.lineWidth = o[7]; g.beginPath(); g.moveTo(o[1], o[2]); g.lineTo(o[3], o[4]); g.stroke(); }
    else if (k === 'c') { g.globalAlpha = o[5]; g.fillStyle = o[4]; g.beginPath(); g.arc(o[1], o[2], o[3], 0, Math.PI * 2); g.fill(); }
    else if (k === 'e') { g.globalAlpha = o[6]; g.fillStyle = o[5]; g.beginPath(); g.ellipse(o[1], o[2], Math.max(0.1, o[3]), Math.max(0.1, o[4]), 0, 0, Math.PI * 2); g.fill(); }
    else if (k === 'p') { g.globalAlpha = o[3]; g.fillStyle = o[2]; const q = o[1]; g.beginPath(); g.moveTo(q[0], q[1]); for (let i = 2; i < q.length; i += 2) g.lineTo(q[i], q[i + 1]); g.closePath(); g.fill(); }
    else if (k === 't') { g.globalAlpha = o[6]; g.fillStyle = o[5]; g.font = o[7] === 'A' ? `${o[4]}px Anton, Impact` : `bold ${o[4]}px Poppins, sans-serif`; g.textAlign = o[8] === 'c' ? 'center' : 'left'; g.textBaseline = 'top'; g.fillText(o[1], o[2], o[3]); }
    else if (k === 'n') { const R = mulberry(o[11]); g.fillStyle = o[6]; for (let i = 0; i < o[5]; i++) { g.globalAlpha = o[7] + R() * (o[8] - o[7]); const s = o[9] + R() * (o[10] - o[9]); g.fillRect(o[1] + R() * o[3], o[2] + R() * o[4], s, s * 0.6); } }
    else if (k === 'g') { g.globalAlpha = o[5]; g.globalCompositeOperation = 'lighter'; g.drawImage(glowSprite(o[4]), o[1] - o[3], o[2] - o[3], o[3] * 2, o[3] * 2); g.globalCompositeOperation = 'source-over'; }
  }
  g.globalAlpha = 1; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
}
function buildArena(seed, forceStyle) {
  ARENA = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const R = mulberry(seed + attempt * 7919);
    const pickS = R(), style = (forceStyle && MAP_STYLES.find((s) => s.name === forceStyle)) || MAP_STYLES[Math.floor(pickS * MAP_STYLES.length)];
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
function astar(sx, sy, tx, ty, team) {
  if (team) tx = ownX(team, tx, 40);
  const m0 = midX(), lim = MID_GAP + 20, offSide = (cc) => team === 'P' ? cc * CELL + CELL / 2 > m0 - lim : team === 'B' ? cc * CELL + CELL / 2 < m0 + lim : false;
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
      const m = rr * GC + cc; if (BLOCK[m] || offSide(cc)) continue;
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
/* ----- center boundary: each team stays on its own half (lasers still cross) ----- */
function drawMidLine(t) {
  const m = G.lineShown || midX(), H = WORLD.h * TILT, pulse = 0.75 + 0.25 * Math.sin(t * 4);
  ctx.save();
  ctx.fillStyle = 'rgba(16,4,28,0.45)'; ctx.fillRect(m - 12, 0, 24, H);                 // dark bed so it shows on light floors
  ctx.globalAlpha = 0.95; ctx.fillStyle = '#ff3cc8'; ctx.fillRect(m - 5, 0, 10, H);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(m - 1.5, 0, 3, H);
  ctx.fillStyle = '#ffd60a'; for (let y = ((t * 90) % 60) - 60; y < H; y += 60) ctx.fillRect(m - 5, y, 10, 18);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 * pulse; ctx.fillStyle = '#ff3cc8'; ctx.fillRect(m - 26, 0, 52, H);
  if (G.lineHit && G.lineHit.t > 0) { ctx.globalAlpha = G.lineHit.t / 0.3; ctx.drawImage(glowSprite('#ff3cc8'), m - 80, G.lineHit.y * TILT - 80, 160, 160); G.lineHit.t -= 1 / 60; }
  ctx.restore();
  // laser posts along the line
  for (let y = 0; y <= WORLD.h; y += 240) {
    const py = y * TILT;
    ctx.fillStyle = '#1c1228'; ctx.fillRect(m - 7, py - 46, 14, 46); ctx.fillStyle = '#4a2f70'; ctx.fillRect(m - 7, py - 46, 4, 46);
    ctx.fillStyle = '#ff3cc8'; ctx.fillRect(m - 9, py - 52, 18, 8); ctx.fillStyle = '#ffffff'; ctx.fillRect(m - 3, py - 50, 6, 4);
  }
}
const MID_GAP = 8;
const midX = () => (G && G.line) || WORLD.w / 2;   // the line moves when teams push it (see push the line)
function ownX(team, x, pad = 0) { const m = midX(); return team === 'P' ? Math.min(x, m - MID_GAP - pad) : team === 'B' ? Math.max(x, m + MID_GAP + pad) : x; }
function onOwnSide(team, x) { return team === 'P' ? x < midX() : x > midX(); }
function keepSide(e) {
  if (e.team !== 'P' && e.team !== 'B') return;
  const nx = ownX(e.team, e.x, e.r);
  if (nx !== e.x) { e.x = nx; if (e === G.player) G.lineHit = { y: e.y, t: 0.3 }; }
}
function moveEnt(e, dx, dy) { const s = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8)); for (let i = 0; i < s; i++) { e.x += dx / s; e.y += dy / s; keepSide(e); pushOut(e); keepSide(e); } }

/* ---------------- state ---------------- */
let state = 'menu', pick = localStorage.getItem('ps_pick') || 'perci', diff = localStorage.getItem('ps_diff') || 'normal';
if (!localStorage.getItem('ps_auto_v2')) { localStorage.setItem('ps_auto_v2', '1'); localStorage.setItem('ps_auto', '0'); }   // FIRE button now exists: auto-fire starts OFF for everyone
let autoFire = TOUCH && localStorage.getItem('ps_auto') === '1';
let aimAssist = +(localStorage.getItem('ps_assist') || (TOUCH ? 3 : 2));   // 1 off, 2 light, 3 strong
// FIRE MODE (phones): how the right thumb shoots, so you never need a third thumb for the FIRE button
//   hold    = twin-stick: push the aim stick and you shoot while you aim (default); smart trigger: it only shoots
//             when a bot is in your sights, so pushing the stick while you walk around never wastes battery
//   release = Brawl Stars style: drag to aim (aim line shows), let go to shoot
//   button  = the aim stick only aims; the FIRE button shoots
// In hold and release, a quick TAP on the aim side fires at the best target (led for its movement).
let fireMode = localStorage.getItem('ps_firemode') || 'hold';
if (!['hold', 'release', 'button'].includes(fireMode)) fireMode = 'hold';
const aimTap = { t0: 0, max: 0, quick: 0, shot: 0, shotA: 0 };   // tap / release-shot timers
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
  if (!MP.on) applyLoadout(me, myLoadout(me.kind));   // weapon, level perks and store upgrades
  me.inv = null;   // no item slots: every power-up applies the moment you pick it up
  G = { ents, player: me, slowTeam: 'B', pkId: 0, bullets: [], parts: [], rings: [], pops: [], pickups: [], score: { P: 0, B: 0 }, time: MATCH_TIME, slow: 0, pickupT: 3, cam: { x: 0, y: 0 }, shake: 0, t: 0 };
  input.fireBtn = false; me.yaw = me.team === 'P' ? 0 : Math.PI;   // first person: start facing the enemy side
  G.cam.x = G.player.x - VW / Z / 2; G.cam.y = G.player.y * TILT - 40 - VH / Z / 2;
  showScreen(null); $('hud').classList.add('on'); document.body.classList.add('playing'); if (document.activeElement) document.activeElement.blur(); state = 'play';
  feed('Map: ' + MAPNAME); feed(MP.on && MP.mode === 'versus' ? 'Team vs team! Most tags wins.' : "Match start! Tag BROKE-pilot's bots!"); banner('FIGHT!');
  document.body.classList.toggle('mp', MP.on); $('pauseBtn').textContent = MP.on ? '\u2715' : 'II';
  if (TOUCH && VH > VW && !pendingStory && !sessionStorage.getItem('ps_rot')) { sessionStorage.setItem('ps_rot', '1'); setTimeout(() => feed('Tip: turn your phone sideways for a wider view'), 1500); }
  if (ac() && AC.state === 'suspended') AC.resume();
  syncAutoBtn(); syncInv(); storyBegin(); twistBegin();
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
  const beam = s.beam !== undefined ? s.beam : e.kind === 'chatgpt', sp = beam ? 1500 : 950, n = s.pellets || 1;
  for (let i = 0; i < n; i++) {   // the Scatter Gun fires a fan of lasers
    const spread = (Math.random() - 0.5) * 2 * (s.spread + (e.human ? 0 : e.kind === 'bot' ? DIFF[diff].acc : DIFF[diff].mate));
    const a = ang + spread + (n > 1 ? (i / (n - 1) - 0.5) * (s.cone || 0) : 0);
    G.bullets.push({ x: e.x + Math.cos(a) * (e.r + 14), y: e.y + Math.sin(a) * (e.r + 14), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: s.range / sp, owner: e, team: e.team, dmg: s.dmg, col: s.shot, bounce: (+s.bounce || 0) + (isReal() ? 1 : 0), beam, age: 0,
      home: e.isPlayer && aimAssist > 1 && e.assistTarget ? e.assistTarget : null, homeRate: aimAssist === 3 ? 1.6 : 0.8, pad: e.human ? 8 : 4 });
  }
  e.shots++; e.flash = 0.06;
  if (e.isPlayer) (beam ? SFX.beam : SFX.pew)();
}
function hitEnt(t, b) {
  if (t.shield > 0) { spark(b.x, b.y, '#ffffff', 6, 160); if (MP.host) MP.ev.push(['h', Math.round(b.x), Math.round(b.y), -1, G.ents.indexOf(t)]); return; }
  t.hp -= b.dmg; b.owner.hits++; t.hurt = 0.12; spark(b.x, b.y, b.col, 10, 220);
  if (MP.host) MP.ev.push(['h', Math.round(b.x), Math.round(b.y), G.ents.indexOf(b.owner), G.ents.indexOf(t)]);
  if (t.isPlayer) { G.shake = 0.22; SFX.hit(); t.hitFrom = Math.atan2(-b.vy, -b.vx); t.hitT = 0.8; }
  if (t.hp <= 0) {
    t.dead = RESPAWN; t.tagged++; b.owner.tags++; G.score[b.team]++; onTagged(t, b.owner);
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
  if (isReal()) { if (e.isPlayer) banner('NO POWERS IN THE REAL WORLD'); return; }
  const c = CHARS[e.kind]; e.abilityCd = c.cd * (e.stats.cdMul || 1); e.powers = (e.powers || 0) + 1;
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
  const perci = G.ents.find((e) => e.human && e.kind === 'perci' && e.dead <= 0) || G.ents.find((e) => e.human && e.kind === 'perci');   // Perci's weed items: quick match, online and story
  const extras = G.story ? (G.story.extras || []).filter((k) => MATURE || k !== 'kush') : (perci && MATURE ? ['kush', 'burger'] : perci ? ['burger'] : []);
  const kinds = ['shield', 'shield', 'rapid', 'speed', 'charge'].concat(extras);
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  if (isReal() && !PICKUPS[kind].perciOnly) { G.pickupT = 1; return; }   // no power-ups in the real world (try again soon)
  // power-ups alternate sides so both teams can reach them; Perci's items always land on his side
  const side = PICKUPS[kind].perciOnly ? (perci ? perci.team : 'P') : (G.pkSide = G.pkSide === 'P' ? 'B' : 'P'), m = midX();
  for (let tries = 0; tries < 40; tries++) {
    const x = side === 'P' ? 220 + Math.random() * (m - 320) : m + 100 + Math.random() * (m - 320), y = 120 + Math.random() * (WORLD.h - 240);
    if (BLOCK[cellOf(x, y)[1] * GC + cellOf(x, y)[0]]) continue;
    if (G.pickups.some((p) => Math.hypot(p.x - x, p.y - y) < 200)) continue;
    G.pickups.push({ x, y, t: 0, id: ++G.pkId, kind }); G.rings.push({ x, y, r: 6, life: 0.5, col: '#ffffff' }); return;
  }
}

// ---- Perci's weed + munchies animations (quick match, online and story) ----
function smokePuff(x, y, big) { if (G.parts.length > 420) return; const a = Math.random() * Math.PI * 2, s = (big ? 60 : 20) * Math.random(); G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: (big ? 2.2 : 1.3) + Math.random() * 0.8, smoke: true, sz: (big ? 16 : 9) + Math.random() * (big ? 16 : 8), col: Math.random() < 0.7 ? '#d6d2de' : '#9fe8b0' }); }
function kushFx(e, mine) {
  for (let i = 0; i < 46; i++) smokePuff(e.x + (Math.random() - 0.5) * 36, e.y + (Math.random() - 0.5) * 10, true);
  for (let i = 0; i < 3; i++) G.rings.push({ x: e.x, y: e.y, r: 8 + i * 14, life: 0.7 + i * 0.15, col: i % 2 ? '#c070ff' : '#5dff7a' });
  stamp(e, 'PUFF PUFF', '#2fa84f');
  if (mine) {
    G.haze = 9; G.shake = Math.max(G.shake, 0.12); beep(180, 90, 0.5, 'sine', 0.07); setTimeout(() => beep(520, 180, 0.4, 'triangle', 0.05), 380);
    setTimeout(() => G && state === 'play' && banner(KUSH_LINES[Math.floor(Math.random() * KUSH_LINES.length)]), 700);
  }
}
function burgerFx(e) {
  for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2; G.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.7, col: i % 2 ? '#ff9f40' : '#ffd60a' }); }
  G.pops.push({ x: e.x, y: e.y - 40, txt: 'MUNCHIES!', life: 1.1, col: '#ff9f40' }); stamp(e, 'MUNCHIES', '#c8651e');
}
function hazeStep(dt) {   // lingering smoke around Perci while the haze lasts
  G.haze = Math.max(0, (G.haze || 0) - dt);
  if (G.haze > 0) { G.smokeT = (G.smokeT || 0) - dt; const p = G.ents.find((e) => e.human && e.kind === 'perci' && e.dead <= 0); if (p && G.smokeT <= 0) { G.smokeT = 0.11; smokePuff(p.x, p.y - 6, false); } }
}
function applyPickup(e, kind) {
  if (kind === 'shield') { if (e.hp < e.maxhp) e.hp++; else e.shield = Math.max(e.shield, 2.5); }
  if (kind === 'rapid') e.rapid = Math.max(e.rapid, 4);
  if (kind === 'speed') e.fast = 4;
  if (kind === 'charge') e.abilityCd = 0;
  if (kind === 'kush') {   // Perci only
    G.slow = 5; G.slowTeam = e.team === 'P' ? 'B' : 'P'; e.shield = Math.max(e.shield, 1.5); e.rapid = Math.max(e.rapid, 3);
    kushFx(e, e === G.player);
    if (MP.host) MP.ev.push(['z', G.ents.indexOf(e), 1]);
  }
  if (kind === 'burger') { e.hp = e.maxhp; e.fast = Math.max(e.fast, 3); burgerFx(e); if (MP.host) MP.ev.push(['z', G.ents.indexOf(e), 2]); }
}
function collect(e, pk) {
  if (pk.kind === 'top') {                               // spinning top: flips dream / real right away
    pk.gone = true; e.picks++; spark(pk.x, pk.y, '#c8a2ff', 22, 220); G.rings.push({ x: pk.x, y: pk.y, r: 8, life: 0.5, col: '#c8a2ff' });
    if (MP.host) MP.ev.push(['k', G.ents.indexOf(e), pk.kind, Math.round(pk.x), Math.round(pk.y)]);
    flipWorld(e, e.name + ' spun the top'); if (e.isPlayer) stamp(e, 'EXTRA CREDIT', '#8232dc');
    return true;
  }
  if (PICKUPS[pk.kind].perciOnly && !(e.human && e.kind === 'perci')) return false;   // only Perci can grab his items
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
const INV_ICON = { shield: 'A+', rapid: '\u26A1', speed: '\u00BB', charge: '\u2605', kush: '\uD83C\uDF43', burger: '\uD83C\uDF54' };
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
function nearestPickup(e, maxD) { let b = null, bd = maxD; for (const p of G.pickups) { if (!onOwnSide(e.team, p.x)) continue; if (PICKUPS[p.kind].perciOnly && e !== G.player) continue; const d = dist(p, e); if (d < bd) { bd = d; b = p; } } return b; }
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
    else { ai.goal = { x: ownX(e.team, 300 + Math.random() * (WORLD.w - 600), 120), y: 200 + Math.random() * (WORLD.h - 400) }; ai.goalKind = 'wander'; }
    if (e.kind !== 'bot' && e.abilityCd <= 0 && best && dist(e, best) < 480 && Math.random() < 0.25) useAbility(e);
  }
  if (ai.goal && ai.goal.gone) { ai.goal = ai.target; ai.goalKind = 'foe'; ai.path = []; }
  const t = ai.target;
  const spd = e.stats.speed * (e.kind === 'bot' ? d.speed : 0.88) * (G.slow > 0 && e.team === G.slowTeam ? 0.5 : 1) * (e.fast > 0 ? 1.35 : 1) * worldSpeed(e);
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
      // a target across the center line: hold a spot on our side near the line instead of chasing it
      if (!onOwnSide(e.team, gx)) { gx = ownX(e.team, gx, 140 + Math.random() * 160); gy = clamp(gy + (Math.random() - 0.5) * 240, 60, WORLD.h - 60); }
      ai.path = astar(e.x, e.y, gx, gy, e.team); ai.pg = { x: g.x, y: g.y }; ai.repath = 0.7 + Math.random() * 0.3;
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

function drawAimLine(t) {
  const p = G.player; if (!p || p.dead > 0 || pov === '1st') return;
  const active = (input.touchAim && input.touchAim.m > 0.15) || input.fireBtn || (!TOUCH && input.mouseSeen);
  if (!active) return;
  const len = p.stats.range * 0.92, x0 = p.x + Math.cos(p.a) * (p.r + 10), y0 = p.y + Math.sin(p.a) * (p.r + 10);
  let ex = x0, ey = y0;   // stop the line at the first wall
  for (let d = 0; d < len; d += 18) { const x = x0 + Math.cos(p.a) * d, y = y0 + Math.sin(p.a) * d; if (WALLS.some((w) => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h)) break; ex = x; ey = y; }
  const lock = !!(p.assistTarget && p.assistTarget.dead <= 0);
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = lock ? 'rgba(77,255,190,0.75)' : 'rgba(255,214,10,0.6)'; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 60;
  ctx.beginPath(); ctx.moveTo(x0, y0 * TILT - LASER_Z); ctx.lineTo(ex, ey * TILT - LASER_Z); ctx.stroke();
  ctx.setLineDash([]); ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(ex, ey * TILT - LASER_Z, 4, 0, Math.PI * 2); ctx.fill();
  if (lock) { const L = leadPoint(p, p.assistTarget, laserSpeed(p)); ctx.strokeStyle = 'rgba(77,255,190,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(L.x, L.y * TILT - LASER_Z, 9, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

/* ---------------- aiming helpers ----------------
   Lasers are slow enough that a moving bot walks out of the shot, so the assist aims at where the bot will be
   (intercept point), pulls your aim smoothly toward it (never a snap, and it fades out at the edge of the cone),
   and your own lasers curve a little toward the bot you were aiming at. */
const laserSpeed = (e) => ((e.stats.beam !== undefined ? e.stats.beam : e.kind === 'chatgpt') ? 1500 : 950);
function leadPoint(p, t, speed) {
  const dx = t.x - p.x, dy = t.y - p.y, vx = t.svx || t.vx || 0, vy = t.svy || t.vy || 0;
  const a = vx * vx + vy * vy - speed * speed, b = 2 * (dx * vx + dy * vy), c = dx * dx + dy * dy;
  let tt = Math.sqrt(c) / speed;
  if (Math.abs(a) > 1e-6) { const disc = b * b - 4 * a * c; if (disc >= 0) { const q = Math.sqrt(disc), r1 = (-b - q) / (2 * a), r2 = (-b + q) / (2 * a); const r = Math.min(r1, r2) > 0 ? Math.min(r1, r2) : Math.max(r1, r2); if (r > 0) tt = r; } }
  tt = Math.min(tt, 1.0);
  return { x: t.x + vx * tt, y: t.y + vy * tt };
}
const angDiff = (a, b) => ((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
// the best bot to help with: inside the cone around your aim, closest in angle and distance, visible
function assistPick(p, dir, cone) {
  let best = null, bs = 1e9, bAng = 0;
  for (const e of G.ents) {
    if (e.team === p.team || e.dead > 0) continue;
    const d = dist(p, e); if (d > p.stats.range * 1.05) continue;
    const L = leadPoint(p, e, laserSpeed(p)), ang = Math.atan2(L.y - p.y, L.x - p.x), da = Math.abs(angDiff(ang, dir));
    const width = cone + Math.atan2(e.r, Math.max(d, 1));   // close bots are bigger targets
    if (da > width) continue; if (!los(p, e)) continue;
    const sc = da / width + d / 2400;
    if (sc < bs) { bs = sc; best = e; bAng = ang; }
  }
  return best ? { t: best, ang: bAng } : null;
}
// how much of the way toward the bot the assist pulls: full near the middle, nothing at the edge of the cone
function assistAim(p, raw, level) {
  if (level <= 1) return { a: raw, t: null };
  const cone = level === 3 ? 0.42 : 0.24, maxPull = level === 3 ? 0.9 : 0.6;
  const pk = assistPick(p, raw, cone); if (!pk) return { a: raw, t: null };
  const off = angDiff(pk.ang, raw), width = cone + Math.atan2(pk.t.r, Math.max(dist(p, pk.t), 1));
  const k = maxPull * (1 - Math.pow(Math.min(1, Math.abs(off) / width), 2));
  return { a: raw + off * k, t: pk.t };
}

/* ---------------- local player control (solo, host and online guests) ---------------- */
function seekCover(e, side) {
  let best = null, bd = 230;
  for (const w of SOLID) {
    const r = e.r + 8;
    const cands = [{ x: w.x - r, y: clamp(e.y, w.y, w.y + w.h) }, { x: w.x + w.w + r, y: clamp(e.y, w.y, w.y + w.h) }, { x: clamp(e.x, w.x, w.x + w.w), y: w.y - r }, { x: clamp(e.x, w.x, w.x + w.w), y: w.y + w.h + r }];
    for (const c of cands) {
      const d = dist(e, c);
      if ((c.x - e.x) * side > 6 && d < bd && onOwnSide(e.team, c.x)) { const probe = { x: e.x, y: e.y, r: e.r }; moveEnt(probe, c.x - e.x, c.y - e.y); if (dist(probe, c) < 3) { best = c; bd = d; } }
    }
  }
  e.coverGoal = best;
  banner(best ? (side < 0 ? 'COVER LEFT' : 'COVER RIGHT') : 'NO COVER NEARBY'); if (best) buzz(15);
}
function controlLocal(e, dt, shoot, ability) {
    let mx = 0, my = 0; const k = input.keys;
    if (k.KeyW || k.ArrowUp) my -= 1; if (k.KeyS || k.ArrowDown) my += 1; if (k.KeyA || (pov !== '1st' && k.ArrowLeft)) mx -= 1; if (k.KeyD || (pov !== '1st' && k.ArrowRight)) mx += 1;
    if (input.touchMove) { mx = input.touchMove.dx; my = input.touchMove.dy; }
    const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    const FP = pov === '1st';
    if (FP) {   // first person: you turn with the right stick / mouse / Q E, and move relative to where you face
      if (e.yaw === undefined) e.yaw = e.a;
      let turn = 0;
      if (input.touchAim && input.touchAim.m > 0.12) turn += Math.sign(input.touchAim.dx) * Math.pow(Math.abs(input.touchAim.dx), 1.3) * 3.4;
      if (k.KeyQ || k.ArrowLeft) turn -= 2.4; if (k.KeyE || k.ArrowRight) turn += 2.4;
      if (!TOUCH && input.mouseSeen && document.pointerLockElement !== cvs) { const o = (input.mx - VW / 2) / (VW / 2); if (Math.abs(o) > 0.18) turn += Math.sign(o) * (Math.abs(o) - 0.18) * 3.6; }
      if (aimAssist > 1 && turn) { const pk = assistPick(e, e.yaw, 0.12); if (pk) turn *= aimAssist === 3 ? 0.5 : 0.7; }   // friction: slow down over a target
      e.yaw += turn * dt + fpLook * 0.0026; fpLook = 0; e.yaw = Math.atan2(Math.sin(e.yaw), Math.cos(e.yaw));
      const fw = -my, rt = mx, cyw = Math.cos(e.yaw), syw = Math.sin(e.yaw); mx = cyw * fw - syw * rt; my = syw * fw + cyw * rt;
    }
    const spd = e.stats.speed * (e.fast > 0 ? 1.35 : 1) * (G.slow > 0 && e.team === G.slowTeam ? 0.5 : 1) * worldSpeed(e);
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
    if (FP) { raw = e.yaw; firing = !!(input.mdown || (TOUCH && autoFire && autoTarget(e, e.yaw, 0.4))); }
    let quick = null;   // FIRE with the aim stick let go: shoot the best bot, led for its movement (like a quick-fire tap)
    const aiming = !FP && input.touchAim && input.touchAim.m > 0.15;
    if (aiming) { raw = Math.atan2(input.touchAim.dy / TILT, input.touchAim.dx); firing = !!(autoFire && assistPick(e, raw, 0.4)) || (fireMode === 'hold' && input.touchAim.m > 0.3 && !!assistPick(e, raw, 0.35)); }   // smart trigger: HOLD only shoots when a bot is in your sights, so walking around never drains the battery
    else if (FP) { /* set above */ }
    else if (TOUCH) {
      const t = autoFire ? autoTarget(e) : null;
      if (t) { quick = t; firing = true; } else if (m > 0.2) raw = Math.atan2(my, mx);
    } else { raw = Math.atan2((input.my / Z + G.cam.y + LASER_Z) / TILT - e.y, input.mx / Z + G.cam.x - e.x); firing = input.mdown; }
    // quick tap on the aim stick: shoot the best target for a moment; release mode: the shot you let go of
    if (aimTap.quick > 0) { aimTap.quick -= dt; if (!FP && !aiming) { const t0 = autoTarget(e); if (t0) { quick = t0; firing = true; } } }   // no bot in range = no shot, no battery used
    if (aimTap.shot > 0) { aimTap.shot -= dt; if (!aiming && !quick) { raw = aimTap.shotA; } firing = true; }
    if (input.fireBtn) { firing = true; if (!FP && !aiming) { const t0 = autoTarget(e); if (t0) quick = t0; } }
    if (quick) { const L = leadPoint(e, quick, laserSpeed(e)); raw = Math.atan2(L.y - e.y, L.x - e.x); }
    // smooth the stick a little so the aim never jitters or snaps (fast enough that it never feels laggy)
    if (aiming && e.rawAim !== undefined) raw = e.rawAim + angDiff(raw, e.rawAim) * (1 - Math.exp(-dt * 28));
    e.rawAim = raw; e.a = raw; e.assistTarget = quick;
    if (!quick) { const as = assistAim(e, raw, aimAssist); e.a = as.a; e.assistTarget = as.t; }
    if (!G.story) {   // laser battery (quick match + online): every shot drains it, it recharges when you stop shooting
      G.qbat = G.qbat === undefined ? 100 : G.qbat; G.qIdle = (G.qIdle || 0) + dt; G.qMsg = Math.max(0, (G.qMsg || 0) - dt);
      if (G.qLock && G.qbat >= 25) G.qLock = false;
      if (firing && e.cool <= 0) {
        if (G.qLock || G.qbat < 2.5) { G.qLock = true; firing = false; if (G.qMsg <= 0) { banner('BATTERY EMPTY'); G.qMsg = 1.6; } }
        else { G.qbat = Math.max(0, G.qbat - 3 * (e.rapid > 0 ? 0.5 : 1)); G.qIdle = 0; }
      }
      if (G.qIdle > 0.45) G.qbat = Math.min(100, G.qbat + (G.qLock ? 16 : 22) * dt);
    }
    if (firing) shoot(e, e.a);
    if (input.ability) { input.ability = false; ability(e); }
}
/* ---------------- update ---------------- */
function update(dt) {
  if (!G || state !== 'play') return;
  G.t += dt; G.time -= dt; G.slow = Math.max(0, G.slow - dt); G.shake = Math.max(0, G.shake - dt);
  hazeStep(dt);
  if (G.story) { const r = G.time <= 0 ? storyTimeUp() : storyCheck(); if (r) return storyFinish(r); }
  if (G.time <= 0) return endMatch();
  if (!G.story && G.pushWin) return endMatch();
  const p = G.player;
  for (const e of G.ents) {
    e.svx = (e.svx || 0) + ((e.vx || 0) - (e.svx || 0)) * Math.min(1, dt * 10); e.svy = (e.svy || 0) + ((e.vy || 0) - (e.svy || 0)) * Math.min(1, dt * 10);
    e.cool = Math.max(0, e.cool - dt); e.abilityCd = Math.max(0, e.abilityCd - dt); e.rapid = Math.max(0, e.rapid - dt); e.shield = Math.max(0, e.shield - dt); e.frozen = Math.max(0, e.frozen - dt); e.fast = Math.max(0, e.fast - dt); e.flash = Math.max(0, e.flash - dt); e.hurt = Math.max(0, e.hurt - dt);
    if (e.dead > 0) { e.dead -= dt; if (e.dead <= 0) { e.hp = e.maxhp; e.x = e.spawn.x; e.y = e.spawn.y; e.tx = undefined; e.coverGoal = null; e.life++; e.shield = 1.5 + (e.spawnShield || 0); e.ai.path = []; G.rings.push({ x: e.x, y: e.y, r: 6, life: 0.4, col: '#ffffff' }); } continue; }
    if (e.frozen > 0) continue;
    if (e === G.player) controlLocal(e, dt, fire, useAbility);
    else if (e.human) controlRemote(e, dt);
    else aiThink(e, dt);
  }
  // bullets
  for (const b of G.bullets) {
    b.age += dt; const steps = 3;
    if (b.home && b.home.dead <= 0) {   // bullet magnetism: curve gently toward the bot you were aiming at, only if it's still roughly ahead
      const want = Math.atan2(b.home.y - b.y, b.home.x - b.x), cur = Math.atan2(b.vy, b.vx), off = angDiff(want, cur);
      if (Math.abs(off) < 0.5) { const turn = clamp(off, -b.homeRate * dt, b.homeRate * dt), sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(cur + turn) * sp; b.vy = Math.sin(cur + turn) * sp; } else b.home = null;
    }
    for (let s = 0; s < steps && b.life > 0; s++) {
      const nx = b.x + (b.vx * dt) / steps, ny = b.y + (b.vy * dt) / steps;
      let wall = null; for (const w of WALLS) if (nx > w.x && nx < w.x + w.w && ny > w.y && ny < w.y + w.h) { wall = w; break; }
      if (wall) {
        if (b.bounce > 0) { b.bounce--; if (b.x > wall.x && b.x < wall.x + wall.w) b.vy *= -1; else b.vx *= -1; spark(b.x, b.y, b.col, 4, 120); }
        else { b.life = 0; spark(b.x, b.y, b.col, 5, 140); }
        break;
      }
      b.x = nx; b.y = ny;
      for (const e of G.ents) { if (e.team === b.team || e.dead > 0) continue; if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (e.r + (b.pad || 4)) ** 2) { hitEnt(e, b); b.life = 0; break; } }
    }
    b.life -= dt;
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  fxStep(dt);
  twistStep(dt);
  // pickups: everyone collects automatically by walking over them
  G.pickupT -= dt;
  if (G.pickupT <= 0) { G.pickupT = 3.2; if (G.pickups.length < 6) spawnPickup(); }
  for (const pk of G.pickups) { pk.t += dt; for (const e of G.ents) if (e.dead <= 0 && dist(e, pk) < e.r + 20) { if (collect(e, pk)) break; } }
  G.pickups = G.pickups.filter((q) => !q.gone);
  cameraStep(dt);
  hud();
}
function fxStep(dt) {
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; const dm = q.smoke ? 0.97 : 0.9; q.vx *= dm; q.vy *= dm; q.life -= dt; }
  G.parts = G.parts.filter((q) => q.life > 0);
  for (const r of G.rings) { r.r += 260 * dt; r.life -= dt; } G.rings = G.rings.filter((r) => r.life > 0);
  for (const q of G.pops) { q.y -= 40 * dt; q.life -= dt; } G.pops = G.pops.filter((q) => q.life > 0);
}
let camMode = localStorage.getItem('ps_cam') || 'lead';   // 'lead' = camera leans toward the fight, 'center' = always on you
function nearestFoe(p, maxD) { let best = null, bd = maxD * maxD; for (const e of G.ents) { if (e.team === p.team || e.dead > 0) continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; best = e; } } return best; }
function cameraStep(dt) {
  const p = G.player;
  const vw = VW / Z, vh = VH / Z;
  const fh = WORLD.h * TILT;
  // camera: keeps you in view but leans toward the enemy side, the nearest enemy, and where you're aiming
  let fx = 0, fy = 0;
  if (camMode === 'lead' && p.dead <= 0) {
    fx += (p.team === 'P' ? 1 : -1) * vw * 0.1;
    const foe = nearestFoe(p, 1400);
    if (foe) { fx += clamp((foe.x - p.x) * 0.32, -vw * 0.26, vw * 0.26); fy += clamp((foe.y - p.y) * TILT * 0.32, -vh * 0.22, vh * 0.22); }
    if (p.flash > 0 || p.cool > 0) { fx += Math.cos(p.a) * vw * 0.06; fy += Math.sin(p.a) * vh * 0.05; }
    fx = clamp(fx, -vw * 0.3, vw * 0.3); fy = clamp(fy, -vh * 0.24, vh * 0.24);
  }
  const co = G.camOff || (G.camOff = { x: 0, y: 0 }); const k0 = Math.min(1, dt * 3);
  co.x += (fx - co.x) * k0; co.y += (fy - co.y) * k0;
  // phones: the sticks and buttons cover the screen edges, so the camera may scroll past the map edge to keep you clear of them
  const mx = TOUCH ? Math.max(80, vw * 0.3) : 80, myT = TOUCH ? Math.max(140, vh * 0.22) : 140, myB = TOUCH ? Math.max(80, vh * 0.3) : 80;
  const tx = clamp(p.x + co.x - vw / 2, -mx, WORLD.w - vw + mx), ty = clamp(p.y * TILT - 40 + co.y - vh / 2, -myT, fh - vh + myB);
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
  if (ARENA) return buildArenaStatic(c, g);
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
function buildArenaStatic(c, g) {
  g.save(); g.scale(1, TILT);
  runOps(g, ARENA.floor);
  if (ARENA.dark) { g.fillStyle = `rgba(4,4,16,${ARENA.dark})`; g.fillRect(0, 0, WORLD.w, WORLD.h); }
  g.restore();
  g.fillStyle = 'rgba(0,0,0,0.32)';
  for (const w of SOLID) { const z = w.z || 60; g.beginPath(); g.moveTo(w.x, (w.y + w.h) * TILT); g.lineTo(w.x + w.w, (w.y + w.h) * TILT); g.lineTo(w.x + w.w + z * 0.5, (w.y + w.h) * TILT + z * 0.16); g.lineTo(w.x + w.w + z * 0.5, w.y * TILT + z * 0.16); g.lineTo(w.x + w.w, w.y * TILT); g.closePath(); g.fill(); }
  g.save(); g.scale(1, TILT); g.strokeStyle = '#8232dc'; g.lineWidth = 6; g.strokeRect(3, 3, WORLD.w - 6, WORLD.h - 6); g.restore();
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
  if (w.ops) {   // story arena prop: paint its ops once, with room above for antennas, towers and lamp glow
    const top = Math.max(6, Math.round(w.h * TILT)), PX = 40, PT = 60, c = document.createElement('canvas');
    c.width = w.w + PX * 2; c.height = top + w.z + PT + 20; const g = c.getContext('2d');
    g.translate(PX, PT); runOps(g, w.ops);
    w.spr = { c, z: w.z, top, ox: PX, oy: PT };
    return w.spr;
  }
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
  ctx.drawImage(s.c, w.x - (s.ox ?? 3), w.y * TILT - s.z - (s.oy ?? 3));
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
  if (pk.kind === 'top') {               // spinning top: wobbles while it spins
    ctx.save(); ctx.translate(x, y + 4); ctx.rotate(Math.sin(pk.t * 7) * 0.18);
    ctx.fillStyle = '#120a1c'; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -4, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const sq = Math.abs(Math.cos(pk.t * 12));
    ctx.fillStyle = '#c8a2ff'; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-12 * (0.4 + 0.6 * sq), -6); ctx.lineTo(0, -12); ctx.lineTo(12 * (0.4 + 0.6 * sq), -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8232dc'; ctx.fillRect(-1.5, -18, 3, 7); ctx.restore(); return;
  }
  if (pk.kind === 'kush' || pk.kind === 'burger') {
    ctx.fillStyle = '#120a1c'; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (pk.kind === 'kush') drawLeaf(ctx, x, y + 2, 14, col); else drawBurger(ctx, x, y + 1, 16);
    return;
  }
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
  if (e.maxhp > 6) { const bw = 70 * s; ctx.fillStyle = 'rgba(0,0,0,0.6)'; rr(ctx, -bw / 2 - 2, headY - 14 * s - 2, bw + 4, 6 * s + 4, 4); ctx.fill(); ctx.fillStyle = '#ff3040'; rr(ctx, -bw / 2, headY - 14 * s, bw * Math.max(0, e.hp) / e.maxhp, 6 * s, 3); ctx.fill(); }
  else for (let i = 0; i < e.maxhp; i++) { ctx.fillStyle = i < e.hp ? (e.team === 'P' ? '#00e6ff' : '#ffd60a') : 'rgba(255,255,255,0.18)'; rr(ctx, -tot / 2 + i * (pw + gap), headY - 10 * s, pw, 5 * s, 2 * s); ctx.fill(); }
  ctx.font = (e.isPlayer ? '700 13px' : '600 11px') + ' Poppins, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  const lab = e.isPlayer ? 'YOU' : e.human ? '★ ' + e.name : e.name; ctx.strokeText(lab, 0, 22 * s); ctx.fillStyle = e.isPlayer ? '#ffd60a' : 'rgba(255,255,255,0.88)'; ctx.fillText(lab, 0, 22 * s);
  ctx.restore();
}
function drawWorld(t) {
  if (pov === '1st' && G && G.player) return drawFP(t);
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
  drawTerritory();
  drawMidLine(t);
  drawEventFloor(t);
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
  drawMarkers(t);
  drawAimLine(t);
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
  for (const q of G.parts) { if (q.smoke) { const k = Math.min(1, q.life / 1.2); ctx.globalAlpha = 0.5 * k; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y * TILT - 50, q.sz * (1.6 - 0.6 * k), 0, Math.PI * 2); ctx.fill(); continue; } ctx.globalAlpha = Math.max(0, q.life * 2.2); ctx.fillStyle = q.col; ctx.fillRect(q.x - 2.5, q.y * TILT - 50 - 2.5, 5, 5); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
  drawEventTop(t);
  for (const q of G.pops) { ctx.globalAlpha = Math.min(1, q.life * 2); ctx.font = '22px Anton, Impact'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#100814'; const py = q.y * TILT - 100; ctx.strokeText(q.txt, q.x, py); ctx.fillStyle = q.col; ctx.fillText(q.txt, q.x, py); }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawTail(t);
}
function drawTail(t) {
  // screen-space: vignette, slow tint, off-screen enemy arrows, minimap, sticks
  if (VIGN) ctx.drawImage(VIGN, 0, 0, VW, VH);
  if (G.slow > 0) { ctx.fillStyle = `rgba(255,140,40,${0.06 + 0.03 * Math.sin(t * 6)})`; ctx.fillRect(0, 0, VW, VH); }
  if (G.haze > 0) { const a = Math.min(1, G.haze / 1.5); ctx.fillStyle = `rgba(${130 + Math.sin(t * 1.3) * 30},60,210,${0.13 * a})`; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = `rgba(70,230,120,${0.07 * a})`; ctx.fillRect(0, 0, VW, VH); }
  if (G.player.hurt > 0) { ctx.fillStyle = `rgba(255,40,60,${G.player.hurt * 1.6})`; ctx.fillRect(0, 0, VW, VH); }
  drawScreenFx(t);
  if (G.dark < 0.5) { if (fpDrawing) fpArrows(); else drawArrows(); }
  drawMinimap();
  if (!G.story && G.qbat !== undefined && TOUCH) { const fr = $('fireBtn').getBoundingClientRect(), bw = 76, bx = fr.left + fr.width / 2 - bw / 2, by = fr.top - 12, f = G.qbat / 100, low = f < 0.25 || G.qLock; ctx.fillStyle = 'rgba(10,6,20,0.7)'; ctx.fillRect(bx - 3, by - 3, bw + 6, 12); ctx.fillStyle = low ? (Math.floor(G.t * 6) % 2 ? '#ff3b55' : '#ff8c28') : '#ffd60a'; ctx.fillRect(bx, by, bw * f, 6); ctx.font = '10px Anton, Impact'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('LASER', bx + bw / 2, by - 6); }
  else if (!G.story && G.qbat !== undefined) { const bw = 120, bx = VW - bw - 18, by = VH - 26, f = G.qbat / 100, low = f < 0.25 || G.qLock; ctx.fillStyle = 'rgba(10,6,20,0.7)'; ctx.fillRect(bx - 3, by - 3, bw + 6, 14); ctx.fillStyle = low ? (Math.floor(G.t * 6) % 2 ? '#ff3b55' : '#ff8c28') : '#ffd60a'; ctx.fillRect(bx, by, bw * f, 8); ctx.font = '11px Anton, Impact'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('LASER BATTERY', bx + bw / 2, by - 6); }
  if (G.player.dead > 0) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#ffd60a'; ctx.font = '40px Anton, Impact'; ctx.textAlign = 'center'; ctx.fillText('RESPAWN IN ' + Math.ceil(G.player.dead), VW / 2, VH / 2 + 70); }
  drawSticks();
}

// readability: a gold chevron over YOU, red warning marker over enemies that are lined up on you
function drawMarkers(t) {
  const p = G.player;
  if (p.dead <= 0) {
    const x = p.x, y = p.y * TILT - 132 + Math.sin(t * 5) * 4;
    ctx.fillStyle = '#ffd60a'; ctx.strokeStyle = '#100814'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x - 11, y - 4); ctx.lineTo(x + 11, y - 4); ctx.closePath(); ctx.stroke(); ctx.fill();
  }
  for (const e of G.ents) {
    if (e.team === p.team || e.dead > 0 || p.dead > 0) continue;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy); if (d > 950) continue;
    let da = Math.atan2(dy, dx) - e.a; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > 0.28) continue;
    const x = e.x, y = e.y * TILT - 118 + Math.sin(t * 12) * 2;
    ctx.fillStyle = '#ff2d4a'; ctx.strokeStyle = '#100814'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x - 10, y - 4); ctx.lineTo(x + 10, y - 4); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '12px Anton, Impact'; ctx.textAlign = 'center'; ctx.fillText('!', x, y + 5);
  }
}
function drawArrows() {
  const p = G.player; if (p.dead > 0) return;
  const near = nearestFoe(p, 1e9);
  for (const e of G.ents) {
    if (e.team === p.team || e.dead > 0) continue;
    const sx = (e.x - G.cam.x) * Z, sy = (e.y * TILT - 40 - G.cam.y) * Z; if (sx > 0 && sx < VW && sy > 0 && sy < VH) continue;
    const a = Math.atan2(sy - VH / 2, sx - VW / 2), m = 34, isN = e === near, k = isN ? 1.35 : 0.9;
    const ex = clamp(VW / 2 + Math.cos(a) * VW, m, VW - m), ey = clamp(VH / 2 + Math.sin(a) * VH, m + 40, VH - m);
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.scale(k, k); ctx.globalAlpha = isN ? 1 : 0.7; ctx.fillStyle = isN ? '#ff3b55' : 'rgba(255,140,40,0.95)'; ctx.strokeStyle = '#100814'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    if (isN) { const dm = Math.round(Math.hypot(e.x - p.x, e.y - p.y) / 50); ctx.font = '12px Anton, Impact'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#100814'; ctx.fillStyle = '#fff'; const tx = clamp(ex - Math.cos(a) * 26, 20, VW - 20), ty = clamp(ey - Math.sin(a) * 26 + 4, 60, VH - 8); ctx.strokeText(dm + 'm', tx, ty); ctx.fillText(dm + 'm', tx, ty); }
    ctx.globalAlpha = 1;
  }
}
function drawMinimap() {
  const w = TOUCH ? 84 : 150, h = w * WORLD.h / WORLD.w, x = 10, y = TOUCH ? 74 : VH - h - 12, k = w / WORLD.w; ctx.save(); if (TOUCH) ctx.globalAlpha = 0.6;
  ctx.fillStyle = 'rgba(10,6,20,0.7)'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6); ctx.strokeStyle = 'rgba(160,100,255,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = 'rgba(220,190,120,0.55)'; for (const wl of SOLID) ctx.fillRect(x + wl.x * k, y + wl.y * k, Math.max(1.5, wl.w * k), Math.max(1.5, wl.h * k));
  ctx.fillStyle = '#ff3cc8'; ctx.fillRect(x + (G.lineShown || midX()) * k - 1, y, 2, h);
  for (const pk of G.pickups) { ctx.fillStyle = PICKUPS[pk.kind].col; ctx.fillRect(x + pk.x * k - 1.5, y + pk.y * k - 1.5, 3, 3); }
  for (const e of G.ents) { if (e.dead > 0) continue; ctx.fillStyle = e.isPlayer ? '#ffd60a' : e.team === 'P' ? '#ff4b65' : '#ff8c28'; ctx.beginPath(); ctx.arc(x + e.x * k, y + e.y * k, e.isPlayer ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill(); }
  if (pov === '1st') { const q = G.player, hf = Math.atan((VW / 2) / fpFocal()), px = x + q.x * k, py = y + q.y * k, yw = q.yaw === undefined ? q.a : q.yaw; ctx.fillStyle = 'rgba(255,214,10,0.28)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 700 * k, yw - hf, yw + hf); ctx.closePath(); ctx.fill(); }
  else { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x + G.cam.x * k, y + (G.cam.y / TILT) * k, (VW / Z) * k, (VH / Z / TILT) * k); }
  ctx.restore();
}
let menuBgT = 0;
function drawMenuBg(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#141217'; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + t * 0.05; ctx.strokeStyle = `rgba(130,50,220,${0.05 + 0.04 * Math.sin(t * 0.2 + i)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(VW / 2, VH * 0.4); ctx.lineTo(VW / 2 + Math.cos(a) * 2000, VH * 0.4 + Math.sin(a) * 2000); ctx.stroke(); }
}

/* ---------------- first-person view (1ST / 3RD person) ---------------- */
let pov = localStorage.getItem('ps_pov') === '1st' ? '1st' : '3rd';
const EYE = 100, FWALL = 150, CW = 3;          // eye height, wall height, column width (px)
let FPC = null, fpDrawing = false, FPZ = new Float32Array(0), fpLook = 0, fpPrevT = 0;
const FPW = { hay: [[98, 110, 118], [210, 180, 70]], crate: [[124, 136, 146], [210, 180, 70]], glitch: [[78, 100, 118], [66, 196, 220]], edge: [[36, 24, 60], [0, 230, 255]] }, FPW_D = [[112, 120, 126], [160, 170, 176]];
function setPov(v) {
  setTimeout(() => typeof syncFireBtn === 'function' && syncFireBtn());
  pov = v === '1st' ? '1st' : '3rd'; localStorage.setItem('ps_pov', pov);
  if (G && G.player && pov === '1st') G.player.yaw = G.player.a;
  if (pov !== '1st' && document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  const b = $('povBtn'); if (b) b.textContent = pov === '1st' ? '3RD' : '1ST';
  document.querySelectorAll('#setPov button').forEach((x) => x.classList.toggle('sel', x.dataset.v === pov));
  if (G && state !== 'menu') feed(pov === '1st' ? 'First person view' : 'Third person view');
}
function fpFocal() { return (VW / 2) / Math.tan((VH > VW ? 92 : 80) * Math.PI / 360); }
function fpProj(x, y, h) {                      // world point (x, y, height) -> screen {x, y, s (px per unit), d (depth)}
  const c = FPC, dx = x - c.x, dy = y - c.y, d = dx * c.cy + dy * c.sy; if (d < 6) return null;
  const s = c.f / d; return { x: VW / 2 + (-dx * c.sy + dy * c.cy) * s, y: c.hz + (EYE - h) * s, s, d };
}
function wproj(x, y, h) {                       // screen position for effects: third person (camera) or first person (projection)
  if (fpDrawing) { const q = fpProj(x, y, h); return q && { x: q.x, y: q.y, s: q.s }; }
  return { x: (x - G.cam.x) * Z, y: (y * TILT - h - G.cam.y) * Z, s: Z };
}
function fpLine(x0, y0, x1, y1, h) {
  const c = FPC, d0 = (x0 - c.x) * c.cy + (y0 - c.y) * c.sy, d1 = (x1 - c.x) * c.cy + (y1 - c.y) * c.sy, N = 14;
  if (d0 < N && d1 < N) return;
  if (d0 < N) { const k = (N - d0) / (d1 - d0); x0 += (x1 - x0) * k; y0 += (y1 - y0) * k; } else if (d1 < N) { const k = (N - d1) / (d0 - d1); x1 += (x0 - x1) * k; y1 += (y0 - y1) * k; }
  const a = fpProj(x0, y0, h), b = fpProj(x1, y1, h); if (!a || !b) return;
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
}
function fpFloor(x, y, r, fill, stroke, lw) {   // a circle lying on the floor
  const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, p = fpProj(x + Math.cos(a) * r, y + Math.sin(a) * r, 0); if (!p) return; pts.push(p); }
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
function fpClip(x0, x1, d) {                    // clip to the columns where no wall is in front of depth d
  const n = Math.ceil(VW / CW), a = Math.max(0, Math.floor(x0 / CW)), b = Math.min(n - 1, Math.floor(x1 / CW)); if (b < a) return false;
  let any = false, all = true; for (let i = a; i <= b; i++) { if (FPZ[i] > d - 6) any = true; else all = false; }
  if (!any) return false;
  if (!all) { ctx.beginPath(); let s = -1; for (let i = a; i <= b + 1; i++) { const v = i <= b && FPZ[i] > d - 6; if (v && s < 0) s = i; if (!v && s >= 0) { ctx.rect(s * CW, 0, (i - s) * CW, VH); s = -1; } } ctx.clip(); }
  return true;
}
function fpWalls() {
  const c = FPC, f = c.f, n = Math.ceil(VW / CW), hz = c.hz;
  if (FPZ.length < n) FPZ = new Float32Array(n + 8);
  for (let i = 0; i < n; i++) {
    const x0 = i * CW, off = (x0 + CW / 2 - VW / 2) / f, rdx = c.cy - off * c.sy, rdy = c.sy + off * c.cy, ix = 1 / (rdx || 1e-9), iy = 1 / (rdy || 1e-9);
    let best = 1e9, hit = null, sideX = false;
    for (const w of WALLS) {
      const a1 = (w.x - c.x) * ix, a2 = (w.x + w.w - c.x) * ix, b1 = (w.y - c.y) * iy, b2 = (w.y + w.h - c.y) * iy;
      const ax = Math.min(a1, a2), ay = Math.min(b1, b2), en = Math.max(ax, ay), ex = Math.min(Math.max(a1, a2), Math.max(b1, b2));
      if (en > 0.5 && en < ex && en < best) { best = en; hit = w; sideX = ax > ay; }
    }
    FPZ[i] = best; if (!hit) continue;
    const k = f / best, y0 = hz - (FWALL - EYE) * k, y1 = hz + EYE * k, u = sideX ? c.y + rdy * best - hit.y : c.x + rdx * best - hit.x;
    const col = FPW[hit.kind] || FPW_D, sh = (sideX ? 1 : 0.76) * Math.max(0.3, 1 - best / 1700) * (Math.floor(u / 34) % 2 ? 1 : 0.92), b = col[0], A = col[1];
    ctx.fillStyle = `rgb(${b[0] * sh | 0},${b[1] * sh | 0},${b[2] * sh | 0})`; ctx.fillRect(x0, y0, CW + 0.7, y1 - y0);
    ctx.fillStyle = `rgba(${A[0]},${A[1]},${A[2]},${(hit.kind === 'edge' ? 0.9 : 0.6) * sh})`; ctx.fillRect(x0, y0 + (y1 - y0) * (hit.kind === 'edge' ? 0.8 : 0.42), CW + 0.7, Math.max(1.5, k * 7));
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x0, y0, CW + 0.7, Math.max(1.5, k * 3));
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x0, y1 - k * 9, CW + 0.7, k * 9);
  }
}
function fpBackdrop(t) {
  const c = FPC, hz = c.hz;
  let g = ctx.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#05030b'); g.addColorStop(1, '#241440'); ctx.fillStyle = g; ctx.fillRect(-20, -20, VW + 40, hz + 20);
  g = ctx.createLinearGradient(0, hz, 0, VH); g.addColorStop(0, '#1d1236'); g.addColorStop(1, '#3d2768'); ctx.fillStyle = g; ctx.fillRect(-20, hz, VW + 40, VH - hz + 20);
  const W = WORLD.w, H = WORLD.h;
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,230,255,0.16)'; ctx.beginPath();
  for (let gx = 0; gx <= W; gx += 200) fpLine(gx, 0, gx, H, 270); for (let gy = 0; gy <= H; gy += 200) fpLine(0, gy, W, gy, 270); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(176,110,255,0.3)'; ctx.beginPath();
  for (let gx = 0; gx <= W; gx += 100) fpLine(gx, 0, gx, H, 0); for (let gy = 0; gy <= H; gy += 100) fpLine(0, gy, W, gy, 0); ctx.stroke();
  const m = G.lineShown || midX();
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,60,200,0.35)'; ctx.lineWidth = 9; ctx.beginPath(); fpLine(m, 0, m, H, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,170,230,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); fpLine(m, 0, m, H, 0); ctx.stroke();
  for (const r of G.rings) { ctx.globalAlpha = Math.max(0, r.life * 2); fpFloor(r.x, r.y, r.r, null, r.col, 3); } ctx.globalAlpha = 1;
  const ev = G.ev;
  if (ev && ev.kind === 'signal' && ev.strikes) for (const s of ev.strikes) { const k = Math.min(1, s.t / 1.8); fpFloor(s.x, s.y, 80, null, s.t < 1.8 ? 'rgba(255,48,48,0.95)' : 'rgba(255,255,255,0.85)', 3); fpFloor(s.x, s.y, 80 * k, `rgba(255,48,48,${0.15 + 0.25 * k})`); }
  if (ev && ev.kind === 'rigpulse' && ev.ring >= 0) { fpFloor(W / 2, H / 2, Math.max(1, ev.ring), null, 'rgba(0,230,255,0.8)', 6); fpFloor(W / 2, H / 2, Math.max(1, ev.ring - 26), null, 'rgba(130,50,220,0.8)', 4); }
  ctx.globalCompositeOperation = 'source-over';
}
function fpMarker(x, y, s, col, bang) {
  ctx.fillStyle = col; ctx.strokeStyle = '#100814'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x - s * 0.85, y - s * 0.7); ctx.lineTo(x + s * 0.85, y - s * 0.7); ctx.closePath(); ctx.stroke(); ctx.fill();
  if (bang) { ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(s * 0.95) + 'px Anton, Impact'; ctx.textAlign = 'center'; ctx.fillText('!', x, y + s * 0.38); }
}
function fpSprites(t) {
  const c = FPC, me = G.player, list = [], ev = G.ev, dep = (x, y) => (x - c.x) * c.cy + (y - c.y) * c.sy;
  for (const pk of G.pickups) { const d = dep(pk.x, pk.y); if (d > 8) list.push({ d, k: 1, o: pk }); }
  for (const e of G.ents) { if (e === me || e.dead > 0) continue; const d = dep(e.x, e.y); if (d > 8) list.push({ d, k: 2, o: e }); }
  if (ev && ev.kind === 'vacuums' && ev.vac) for (const v of ev.vac) { const d = dep(v.x, v.y); if (d > 8) list.push({ d, k: 3, o: v }); }
  if (ev && ev.kind === 'twister' && ev.tw) { const d = dep(ev.tw.x, ev.tw.y); if (d > 8) list.push({ d, k: 4, o: ev.tw }); }
  list.sort((a, b) => b.d - a.d);
  const near = nearestFoe(me, 1e9); c.lock = null;
  for (const it of list) {
    const o = it.o, pr = fpProj(o.x, o.y, 0); if (!pr) continue;
    const k = pr.s, hw = (it.k === 4 ? 130 : 36) * k;
    ctx.save(); if (!fpClip(pr.x - hw, pr.x + hw, it.d)) { ctx.restore(); continue; }
    ctx.translate(pr.x, pr.y); ctx.scale(k, k);
    if (it.k === 2) {
      const ra = o.a - c.yaw, f = Object.create(o); f.x = 0; f.y = 0; f.a = Math.atan2(-Math.cos(ra), Math.sin(ra)); drawEnt(f, t);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (o.team !== me.team) {
        const head = pr.y - 140 * k, dm = it.d, aimed = me.dead <= 0 && dm < 950 && Math.abs(Math.atan2(Math.sin(Math.atan2(me.y - o.y, me.x - o.x) - o.a), Math.cos(Math.atan2(me.y - o.y, me.x - o.x) - o.a))) < 0.28;
        fpMarker(pr.x, head - 14 - Math.sin(t * 8) * (aimed ? 3 : 0), Math.max(aimed ? 12 : 8, (aimed ? 16 : 11) * k), aimed ? '#ff2d4a' : 'rgba(255,140,40,0.95)', aimed);
        if (o === near) { ctx.font = '700 12px Anton, Impact'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#100814'; ctx.fillStyle = '#fff'; const tx = Math.round(dm / 50) + 'm'; ctx.strokeText(tx, pr.x, head - 34); ctx.fillText(tx, pr.x, head - 34); }
        if (Math.abs(pr.x - VW / 2) < 26 * k + 6) c.lock = o;
      }
    } else if (it.k === 1) { const f = Object.create(o); f.x = 0; f.y = 0; drawPickupIcon(f, t); }
    else if (it.k === 3) { const sv = ev.vac; ev.vac = [Object.assign({}, o, { x: 0, y: 0 })]; drawEventFloor(t); ev.vac = sv; }
    else { const sv = ev.tw; ev.tw = Object.assign({}, sv, { x: 0, y: 0 }); drawEventTop(t); ev.tw = sv; }
    ctx.restore();
  }
  // lasers, sparks, smoke
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const b of G.bullets) {
    const p1 = fpProj(b.x, b.y, LASER_Z); if (!p1) continue;
    const ci = Math.max(0, Math.min(FPZ.length - 1, Math.floor(p1.x / CW))); if (p1.x >= 0 && p1.x < VW && FPZ[ci] < p1.d - 6) continue;
    const kk = b.beam ? 0.06 : 0.03, p2 = fpProj(b.x - b.vx * kk, b.y - b.vy * kk, LASER_Z), gs = glowSprite(b.col, 64), sz = Math.max(16, 46 * p1.s);
    ctx.globalAlpha = 0.85; ctx.drawImage(gs, p1.x - sz / 2, p1.y - sz / 2, sz, sz); ctx.globalAlpha = 1;
    if (p2) { ctx.strokeStyle = b.col; ctx.lineWidth = Math.max(2, 5 * p1.s); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, 1.8 * p1.s); ctx.stroke(); }
  }
  for (const q of G.parts) { if (q.smoke) continue; const p = fpProj(q.x, q.y, 50); if (!p) continue; ctx.globalAlpha = Math.max(0, q.life * 2.2); ctx.fillStyle = q.col; const s = Math.max(2, 6 * p.s); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
  ctx.globalCompositeOperation = 'source-over';
  for (const q of G.parts) { if (!q.smoke) continue; const p = fpProj(q.x, q.y, 50); if (!p) continue; const k = Math.min(1, q.life / 1.2); ctx.globalAlpha = 0.5 * k; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, q.sz * (1.6 - 0.6 * k) * p.s), 0, Math.PI * 2); ctx.fill(); }
  for (const q of G.pops) { const p = fpProj(q.x, q.y, 110); if (!p) continue; ctx.globalAlpha = Math.min(1, q.life * 2); const fs = Math.max(14, Math.min(40, 26 * p.s * 2.2)); ctx.font = fs + 'px Anton, Impact'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#100814'; ctx.strokeText(q.txt, p.x, p.y); ctx.fillStyle = q.col; ctx.fillText(q.txt, p.x, p.y); }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
function fpGun(t) {                              // the blaster in your hands + crosshair
  const c = FPC, p = G.player; if (p.dead > 0) return;
  const moving = Math.hypot(p.vx || 0, p.vy || 0) > 20, bob = moving ? Math.sin(t * 11) * 5 : Math.sin(t * 2) * 1.5, kick = p.flash > 0 ? 18 * Math.min(1, p.flash / 0.1) : 0, sc = Math.max(0.85, Math.min(1.6, Math.min(VW, VH) / 420));
  const o = OUTFIT[p.kind] || OUTFIT.perci, bx = VW * (VW > VH ? 0.57 : 0.6), by = VH + 14 + (bob + kick) * sc, tx = VW / 2 + 22 * sc, ty = VH * 0.7 + (bob * 0.5 + kick * 0.8) * sc;
  ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = '#0c0610'; ctx.lineWidth = 3;
  ctx.fillStyle = o.top; ctx.beginPath(); ctx.moveTo(bx + 10 * sc, by); ctx.lineTo(bx + 120 * sc, by); ctx.lineTo(bx + 84 * sc, by - 84 * sc); ctx.lineTo(bx + 30 * sc, by - 84 * sc); ctx.closePath(); ctx.fill(); ctx.stroke();   // sleeve
  const gr = ctx.createLinearGradient(0, ty, 0, by); gr.addColorStop(0, '#6a5a8c'); gr.addColorStop(1, '#241a3c');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(tx - 9 * sc, ty); ctx.lineTo(tx + 9 * sc, ty); ctx.lineTo(bx + 62 * sc, by - 56 * sc); ctx.lineTo(bx - 18 * sc, by - 56 * sc); ctx.closePath(); ctx.fill(); ctx.stroke();   // barrel and body
  ctx.fillStyle = '#2a2040'; ctx.beginPath(); ctx.moveTo(tx - 4 * sc, ty + 4 * sc); ctx.lineTo(tx + 4 * sc, ty + 4 * sc); ctx.lineTo(bx + 34 * sc, by - 58 * sc); ctx.lineTo(bx + 10 * sc, by - 58 * sc); ctx.closePath(); ctx.fill();   // top rail
  ctx.fillStyle = p.stats.shot; ctx.fillRect(tx - 6 * sc, ty - 4 * sc, 12 * sc, 7 * sc);
  ctx.strokeStyle = p.stats.shot; ctx.globalAlpha = 0.75; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(tx - 12 * sc, ty + 26 * sc); ctx.lineTo(bx - 4 * sc, by - 62 * sc); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = o.skin; ctx.strokeStyle = '#0c0610'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(bx + 40 * sc, by - 54 * sc, 34 * sc, 26 * sc, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   // hand
  if (p.flash > 0) { ctx.globalCompositeOperation = 'lighter'; const s = (100 + Math.random() * 30) * sc; ctx.drawImage(glowSprite(p.stats.shot, 96), tx - s / 2, ty - s / 2 - 6, s, s); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  const cx = VW / 2, cy = c.hz + 14, hot = !!c.lock, col = hot ? '#ff3b55' : 'rgba(255,255,255,0.9)', r = hot ? 11 : 8;
  ctx.strokeStyle = '#100814'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.moveTo(cx - r - 7, cy); ctx.lineTo(cx - r + 3, cy); ctx.moveTo(cx + r - 3, cy); ctx.lineTo(cx + r + 7, cy); ctx.moveTo(cx, cy - r - 7); ctx.lineTo(cx, cy - r + 3); ctx.moveTo(cx, cy + r - 3); ctx.lineTo(cx, cy + r + 7); ctx.stroke();
  const at = p.assistTarget;
  if (at && at.dead <= 0) { const q = fpProj(at.x, at.y, 70); if (q) { const s = Math.max(12, 26 * q.s); ctx.strokeStyle = 'rgba(77,255,190,0.9)'; ctx.lineWidth = 2; for (const dx of [-1, 1]) for (const dy of [-1, 1]) { ctx.beginPath(); ctx.moveTo(q.x + dx * s * 0.55, q.y + dy * s); ctx.lineTo(q.x + dx * s, q.y + dy * s); ctx.lineTo(q.x + dx * s, q.y + dy * s * 0.55); ctx.stroke(); } } }
}
function fpArrows() {                            // enemies outside your view: arrows at the edges, nearest one bigger with distance
  const c = FPC, p = G.player; if (p.dead > 0) return;
  const near = nearestFoe(p, 1e9), half = Math.atan((VW / 2) / c.f) * 0.95; let i = 0;
  for (const e of G.ents) {
    if (e.team === p.team || e.dead > 0) continue;
    const dx = e.x - c.x, dy = e.y - c.y, d = dx * c.cy + dy * c.sy, r = -dx * c.sy + dy * c.cy, ang = Math.atan2(r, d);
    if (d > 0 && Math.abs(ang) < half) continue;
    const side = ang >= 0 ? 1 : -1, isN = e === near, k = isN ? 1.35 : 0.9, ex = side > 0 ? VW - 26 : 26, ey = Math.min(VH * 0.62, VH * 0.34 + (i++ % 3) * 30);
    ctx.save(); ctx.translate(ex, ey); ctx.scale(k * side, k); ctx.globalAlpha = isN ? 1 : 0.7; ctx.fillStyle = isN ? '#ff3b55' : 'rgba(255,140,40,0.95)'; ctx.strokeStyle = '#100814'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    if (isN) { ctx.font = '700 12px Anton, Impact'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#100814'; ctx.fillStyle = '#fff'; const tx = Math.round(Math.hypot(dx, dy) / 50) + 'm'; ctx.strokeText(tx, ex - side * 2, ey + 28); ctx.fillText(tx, ex - side * 2, ey + 28); }
    ctx.globalAlpha = 1;
  }
}
function fpHit(dt) {                             // red flash on the side you got shot from
  const p = G.player; if (!(p.hitT > 0)) return; p.hitT -= dt;
  const ra = p.hitFrom - FPC.yaw, R = Math.min(VW, VH) * 0.3, x = VW / 2 + Math.sin(ra) * R, y = VH * 0.5 - Math.cos(ra) * R;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ra); ctx.globalAlpha = Math.min(1, p.hitT * 2); ctx.fillStyle = '#ff2d4a'; ctx.strokeStyle = '#100814'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(-18, 12); ctx.lineTo(0, 4); ctx.lineTo(18, 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
function drawFP(t) {
  const p = G.player; if (p.yaw === undefined) p.yaw = p.a;
  FPC = { x: p.x, y: p.y, yaw: p.yaw, cy: Math.cos(p.yaw), sy: Math.sin(p.yaw), f: fpFocal(), hz: Math.round(VH * 0.45), lock: null };
  const dt = Math.max(0, Math.min(0.1, t - fpPrevT)); fpPrevT = t;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#0b0912'; ctx.fillRect(0, 0, VW, VH);
  const sx = G.shake > 0 ? (Math.random() - 0.5) * 10 : 0, sy = G.shake > 0 ? (Math.random() - 0.5) * 10 : 0;
  ctx.save(); ctx.translate(sx, sy);
  fpBackdrop(t); fpWalls(); fpSprites(t); fpGun(t);
  ctx.restore();
  fpHit(dt);
  fpDrawing = true; try { drawTail(t); } finally { fpDrawing = false; }
}
document.addEventListener('mousemove', (e) => { if (document.pointerLockElement === cvs) fpLook += e.movementX || 0; });
cvs.addEventListener('mousedown', () => { if (pov === '1st' && !TOUCH && state === 'play' && cvs.requestPointerLock && document.pointerLockElement !== cvs) { try { cvs.requestPointerLock(); } catch (_) {} } });
addEventListener('keydown', (e) => { if (e.code === 'KeyV' && !e.repeat && (state === 'play' || state === 'paused')) setPov(pov === '1st' ? '3rd' : '1st'); });
if ($('povBtn')) { $('povBtn').textContent = pov === '1st' ? '3RD' : '1ST'; $('povBtn').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); setPov(pov === '1st' ? '3rd' : '1st'); }, { passive: false }); $('povBtn').addEventListener('click', () => setPov(pov === '1st' ? '3rd' : '1st')); }
document.querySelectorAll('#setPov button').forEach((b) => { b.classList.toggle('sel', b.dataset.v === pov); b.onclick = () => setPov(b.dataset.v); });

/* ---------------- HUD ---------------- */
function hud() {
  const p = G.player, c = CHARS[p.kind];
  $('tp').textContent = 'PERCI ' + G.score.P; $('tb').textContent = G.score.B + ' BROKE';
  const s = Math.max(0, Math.ceil(G.time)); $('clock').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  $('clock').classList.toggle('hurry', G.time < 15);
  const gl = $('goal'); if (gl) { gl.style.display = G.story ? '' : 'none'; if (G.story) gl.textContent = goalText(); }
  $('me').textContent = `${c.name} • ${p.tags} tags • GRADE ${liveGrade(p)}`;
  const ready = p.abilityCd <= 0;
  $('abil').textContent = ready ? `${c.ability} READY${TOUCH ? '' : ' (SPACE)'}` : `${c.ability}: ${Math.ceil(p.abilityCd)}s`;
  const ab = $('abBtn'); ab.innerHTML = ready ? '\u26A1<br>POWER' : Math.ceil(p.abilityCd) + 's'; ab.classList.toggle('ready', ready);
}

/* ---------------- end + score ---------------- */
let lastResult = null;
function endMatch() {
  state = 'end'; $('hud').classList.remove('on'); document.body.classList.remove('playing');
  const p = G.player, mine = G.score[p.team], theirs = G.score[p.team === 'P' ? 'B' : 'P'];
  const won = G.pushWin ? G.pushWin === p.team : mine > theirs, tie = !G.pushWin && mine === theirs;
  if (MP.on) mpEnded();
  const acc = p.shots ? Math.round((p.hits / p.shots) * 100) : 0;
  const raw = p.tags * 100 + (won ? 500 : tie ? 200 : 0) + acc * 3 + p.picks * 10 - p.tagged * 25;
  const score = Math.max(0, Math.round(raw * DIFF[diff].mult));
  lastResult = { score, tags: p.tags, tagged: p.tagged, acc, won, tie, character: p.kind, difficulty: diff, team: G.score.P, enemy: G.score.B };
  lastCard = reportCard(p, (MATCH_TIME - G.time) / 60); renderReportCard($('endCard'), lastCard);
  $('endRewards').innerHTML = rewardsHTML(award(p, { won, diffMul: MP.on ? 1 : DIFF[diff].mult }));
  $('endTitle').textContent = G.pushWin ? (won ? 'LINE PUSHED! YOU WIN' : 'THEY PUSHED THE LINE') : won ? 'YOU WIN!' : tie ? 'TIE GAME' : (MP.on && MP.mode === 'versus' ? (p.team === 'P' ? 'TEAM BROKE WINS' : 'TEAM PERCI WINS') : 'BROKE-PILOT WINS');
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
function showScreen(id) { document.body.dataset.screen = id || ''; document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); if (id) state = id === 'sEnd' ? 'end' : 'menu'; }
function buildCards() {
  $('cards').innerHTML = ORDER.map((k) => { const c = CHARS[k]; const lab = ['SPEED', 'FIRE', 'RANGE', 'SKILL'];
    return `<div class="card ${k === pick ? 'sel' : ''}" data-k="${k}"><img src="assets/${k}.png" alt="${c.name}"><h3>${c.name}</h3>${levelBadge(k)}<div class="role">${c.role}</div>${c.stats.map((v, i) => `<div class="stat"><span>${lab[i]}</span><div class="bar"><i style="width:${v * 20}%"></i></div></div>`).join('')}<div class="ability">${c.ability}: ${c.abilityDesc}</div></div>`; }).join('');
  document.querySelectorAll('.card').forEach((el) => el.onclick = () => { pick = el.dataset.k; localStorage.setItem('ps_pick', pick); buildCards(); SFX.pick(); });
}
document.querySelectorAll('#diff button').forEach((b) => { b.classList.toggle('sel', b.dataset.d === diff); b.onclick = () => { diff = b.dataset.d; localStorage.setItem('ps_diff', diff); document.querySelectorAll('#diff button').forEach((x) => x.classList.toggle('sel', x === b)); }; });
document.querySelectorAll('#boardTabs button').forEach((b) => b.onclick = () => { document.querySelectorAll('#boardTabs button').forEach((x) => x.classList.toggle('sel', x === b)); loadBoard(b.dataset.b); });
const openBoard = () => { showScreen('sBoard'); document.querySelectorAll('#boardTabs button').forEach((x, i) => x.classList.toggle('sel', i === 0)); loadBoard('all'); };
$('bPlay').onclick = () => { ac(); buildCards(); weaponRow($('weapons')); showScreen('sSelect'); };
$('bPlay2').onclick = $('bPlay').onclick;
$('bHow').onclick = () => showScreen('sHow'); $('bBack2').onclick = () => showScreen('sTitle');
$('bBoard').onclick = openBoard; $('bBoard2').onclick = openBoard; $('bBack3').onclick = () => showScreen('sTitle'); $('bBack1').onclick = () => showScreen('sTitle');
$('bStart').onclick = startMatch; $('bAgain').onclick = () => { if (MP.on) { showScreen('sLobby'); renderLobby(); return; } buildCards(); showScreen('sSelect'); };
$('bSubmit').onclick = submitScore; $('bShare').onclick = share;
$('muteBtn').onclick = () => { muted = !muted; localStorage.setItem('ps_muted', muted ? '1' : '0'); $('muteBtn').textContent = muted ? '🔇' : '🔊'; };
$('muteBtn').textContent = muted ? '🔇' : '🔊';
function syncAutoBtn() { const b = $('autoBtn'); if (!b) return; b.textContent = 'AUTO ' + (autoFire ? 'ON' : 'OFF'); b.classList.toggle('on', autoFire); }
if ($('autoBtn')) $('autoBtn').onclick = () => { autoFire = !autoFire; localStorage.setItem('ps_auto', autoFire ? '1' : '0'); syncAutoBtn(); };
function togglePause() { if (MP.on) { if (state === 'play') mpQuitTap(); return; } if (state === 'play') { state = 'paused'; if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); } else if (state === 'paused') { state = 'play'; } }
$('pauseBtn').onclick = togglePause;
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !MP.on) state = 'paused'; });

/* ---------------- input ---------------- */
addEventListener('keydown', (e) => { input.keys[e.code] = true; if (e.code === 'Space' && (state === 'play' || state === 'paused')) { input.ability = true; e.preventDefault(); } if (e.code === 'KeyP' || e.code === 'Escape') togglePause(); });
addEventListener('keyup', (e) => { input.keys[e.code] = false; });
addEventListener('keydown', (e) => {
  if (state !== 'play' || e.repeat) return;
  if (/^Digit[1-4]$/.test(e.code)) useItem(+e.code.slice(5) - 1);
  else if (e.code === 'KeyF' && G && G.player.inv) { const i = G.player.inv.findIndex((k) => k); if (i >= 0) useItem(i); }
});
const tapBtn = (el, fn) => { if (!el) return; el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); el.addEventListener('click', fn); };
document.querySelectorAll('#inv .slot').forEach((b, i) => tapBtn(b, () => useItem(i)));
// settings screen: aim assist + phone auto-fire
function syncSettings() {
  document.querySelectorAll('#setAssist button').forEach((b) => b.classList.toggle('sel', +b.dataset.v === aimAssist));
  document.querySelectorAll('#setAuto button').forEach((b) => b.classList.toggle('sel', (b.dataset.v === '1') === autoFire));
}
document.querySelectorAll('#setAssist button').forEach((b) => (b.onclick = () => { aimAssist = +b.dataset.v; localStorage.setItem('ps_assist', String(aimAssist)); syncSettings(); }));
document.querySelectorAll('#setFireMode button').forEach((b) => { b.classList.toggle('sel', b.dataset.v === fireMode); b.onclick = () => { fireMode = b.dataset.v; localStorage.setItem('ps_firemode', fireMode); document.querySelectorAll('#setFireMode button').forEach((x) => x.classList.toggle('sel', x === b)); syncFireBtn(); }; });
function syncFireBtn() { document.body.classList.toggle('stickfire', fireMode !== 'button' && pov !== '1st'); }   // 1st person still needs FIRE
syncFireBtn();
document.querySelectorAll('#setAuto button').forEach((b) => (b.onclick = () => { autoFire = b.dataset.v === '1'; localStorage.setItem('ps_auto', autoFire ? '1' : '0'); syncSettings(); syncAutoBtn(); }));
if ($('bSettings')) $('bSettings').onclick = () => { syncSettings(); showScreen('sSettings'); };
if ($('bBack5')) $('bBack5').onclick = () => showScreen('sTitle');
cvs.addEventListener('mousemove', (e) => { input.mx = e.clientX; input.my = e.clientY; input.mouseSeen = true; });
cvs.addEventListener('mousedown', (e) => { input.mdown = true; input.mx = e.clientX; input.my = e.clientY; if (state === 'paused') state = 'play'; });
addEventListener('mouseup', () => { input.mdown = false; });
addEventListener('contextmenu', (e) => { if (state === 'play') e.preventDefault(); });
$('abBtn').addEventListener('touchstart', (e) => { e.preventDefault(); input.ability = true; }, { passive: false });
$('abBtn').addEventListener('click', () => { input.ability = true; });
(function () {   // FIRE button: hold to shoot (at the nearest enemy in 3rd person, straight ahead in 1st person)
  const fb = $('fireBtn'); if (!fb) return; const set = (v) => { input.fireBtn = v; fb.classList.toggle('on', v); };
  fb.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); set(true); }, { passive: false });
  for (const t of ['touchend', 'touchcancel']) fb.addEventListener(t, (e) => { e.preventDefault(); set(false); }, { passive: false });
  fb.addEventListener('mousedown', (e) => { e.stopPropagation(); set(true); }); addEventListener('mouseup', () => set(false));
})();
// twin sticks: fixed home spots that follow your thumb
const sticks = {};
const stickHome = (side) => side === 'move' ? { x: 96, y: VH - 110 } : { x: VW - 96, y: VH - 110 };
// radial dead zone, rescaled so the stick responds as soon as you leave it (no jump at the edge of the dead zone)
function stickFrom(t, s) { const dx = t.clientX - s.x, dy = t.clientY - s.y, raw = Math.min(1, Math.hypot(dx, dy) / 56), m = raw < 0.14 ? 0 : (raw - 0.14) / 0.86, a = Math.atan2(dy, dx); return { dx: Math.cos(a) * m, dy: Math.sin(a) * m, m }; }
cvs.addEventListener('touchstart', (e) => {
  e.preventDefault(); if (state === 'paused') { state = 'play'; return; }
  for (const t of e.changedTouches) { const side = t.clientX < VW / 2 ? 'move' : 'aim'; if (!sticks[side]) { const near = Math.hypot(t.clientX - stickHome(side).x, t.clientY - stickHome(side).y) < 90; const o = near ? stickHome(side) : { x: t.clientX, y: t.clientY }; sticks[side] = { id: t.identifier, x: o.x, y: o.y, cx: t.clientX, cy: t.clientY }; const v = stickFrom(t, sticks[side]); if (side === 'move') input.touchMove = v; else { input.touchAim = v; aimTap.t0 = performance.now(); aimTap.max = v.m; } } }
}, { passive: false });
const aimHist = [];   // recent aim-stick readings: [time, reading]
cvs.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) for (const side of ['move', 'aim']) { const s = sticks[side]; if (s && s.id === t.identifier) { s.cx = t.clientX; s.cy = t.clientY; const v = stickFrom(t, s); if (side === 'move') input.touchMove = v; else { input.touchAim = v; aimTap.max = Math.max(aimTap.max, v.m); aimHist.push([performance.now(), v]); if (aimHist.length > 12) aimHist.shift(); } } } }, { passive: false });
// letting go of the aim stick: thumbs slide as they lift, so if the last moment swung the aim (more than ~25 degrees),
// go back to the steady direction from before the final 120 ms
function settleAim() {
  const p = G && G.player, now = performance.now();
  const steady = aimHist.filter(([t]) => now - t > 120).pop(), last = aimHist[aimHist.length - 1];
  aimHist.length = 0;
  if (!p || !steady || !last || steady[1].m < 0.15) return;
  const a0 = Math.atan2(steady[1].dy / TILT, steady[1].dx), a1 = Math.atan2(last[1].dy / TILT, last[1].dx);
  if (Math.abs(angDiff(a1, a0)) > 0.45) { p.rawAim = a0; p.a = a0; }
}
const tend = (e) => { for (const t of e.changedTouches) for (const side of ['move', 'aim']) { const s = sticks[side]; if (s && s.id === t.identifier) { delete sticks[side]; if (side === 'move') input.touchMove = null; else { settleAim(); input.touchAim = null; aimLift(); } } } };
// what lifting the aim thumb does: a short tap fires at the best target; in RELEASE mode a drag fires where you aimed
function aimLift() {
  if (fireMode === 'button' || state !== 'play' || pov === '1st') return;
  const held = performance.now() - aimTap.t0, p = G && G.player;
  if (held < 220 && aimTap.max < 0.4) { aimTap.quick = 0.28; return; }
  if (fireMode === 'release' && p && aimTap.max >= 0.3) { aimTap.shot = 0.18; aimTap.shotA = p.rawAim !== undefined ? p.rawAim : p.a; }
}
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
    if (!s && G && G.t < 6) { ctx.fillStyle = '#fff'; ctx.font = '700 11px Poppins, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(side === 'aim' ? (pov === '1st' ? 'LOOK' : 'AIM') : 'MOVE', h.x, h.y + 82); }
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
  Object.assign(MP, { on: true, host: true, code, name, mode: 'coop', started: false, homeDiff: diff, roster: [{ pid: MP.pid, name, kind: pick, team: 'P', host: true, lo: myLoadout(pick) }], heard: {} });
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
const mpHello = () => MP.net && MP.net.send('hello', { pid: MP.pid, name: MP.name, kind: pick, lo: myLoadout(pick) });

function mpWire() {
  const n = MP.net;
  if (MP.host) {
    n.on('hello', (p) => {
      MP.heard[p.pid] = performance.now();
      if (MP.roster.some((r) => r.pid === p.pid)) return;
      if (MP.roster.length >= mpMax()) { n.send('full', { pid: p.pid }); return; }
      MP.roster.push({ pid: p.pid, name: cleanName(p.name) || 'PLAYER', kind: ORDER.includes(p.kind) ? p.kind : 'perci', team: teamFor(), lo: cleanLoadout(p.lo) });
      if (state !== 'play') feedLobby(p.name + ' joined'); pushLobby();
    });
    n.on('pick', (p) => { const r = MP.roster.find((x) => x.pid === p.pid); if (r && ORDER.includes(p.kind) && !MP.started) { r.kind = p.kind; if (p.lo) r.lo = cleanLoadout(p.lo); pushLobby(); } });
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
    n.on('end', (p) => { MP.hostSeen = performance.now(); if (!MP.started || !G) return; G.score.P = p.s[0]; G.score.B = p.s[1]; G.pushWin = p.pw || null; endMatch(); });
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
    hum.forEach((r, i) => defs.push({ team, kind: r.kind, slot: slots[i], pid: r.pid, name: r.name, lo: r.pid === MP.pid ? myLoadout(r.kind) : r.lo }));
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
  const ents = defs.map((d) => { const e = newEntity(d.team, d.kind, d.slot, d.pid === MP.pid); if (d.pid) { e.human = true; e.pid = d.pid; e.name = d.name; applyLoadout(e, d.pid === MP.pid ? myLoadout(d.kind) : d.lo); } return e; });
  const me = ents.find((e) => e.pid === MP.pid); if (!me) return;
  MP.started = true; MP.inputs = {}; MP.ev = []; MP.abN = 0; MP.sendT = 0; MP.lastSnap = performance.now();
  const now = performance.now(); for (const e of ents) if (e.pid) MP.heard[e.pid] = now;
  beginMatch(ents, me);
}
function mpEnded() { if (MP.host && MP.net) { MP.net.send('snap', mpSnap()); MP.net.send('end', { s: [G.score.P, G.score.B], pw: G.pushWin || null }); } MP.started = false; if (MP.host) setTimeout(() => pushLobby(), 400); }
function mpQuitTap() {
  const now = performance.now();
  if (now - MP.quitT < 2500) { if (MP.host && G) { MP.net.send('end', { s: [G.score.P, G.score.B], pw: G.pushWin || null }); } state = 'menu'; $('hud').classList.remove('on'); document.body.classList.remove('playing'); mpLeave(); return; }
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
    x: twistSnap(),
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
  const c = CHARS[e.kind]; MP.abN++; e.abilityCd = c.cd * (e.stats.cdMul || 1);
  SFX.power(); banner(c.ability); buzz(60); G.rings.push({ x: e.x, y: e.y, r: 10, life: 0.5, col: c.shot });
  if (e.kind === 'chatgpt') { const ox = e.x, oy = e.y, dd = e.moveAngle !== undefined ? e.moveAngle : e.a; moveEnt(e, Math.cos(dd) * 240, Math.sin(dd) * 240); spark(ox, oy, '#00e6ff', 20); spark(e.x, e.y, '#00e6ff', 20); }
}
function updateClient(dt) {
  hazeStep(dt); G.t += dt; G.time = Math.max(0, G.time - dt); G.slow = Math.max(0, G.slow - dt); G.shake = Math.max(0, G.shake - dt);
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
  fxStep(dt); twistClientStep(dt);
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
  twistApply(s.x);
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
  } else if (v[0] === 'z') { const e = G.ents[v[1]]; if (e) { if (v[2] === 1) kushFx(e, e === me); else burgerFx(e); }
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
$('bOnline').onclick = () => { ac(); $('mpName').value = localStorage.getItem('ps_name') || ''; if (ROOM_Q) $('mpCode').value = ROOM_Q; const pk = (k) => { pick = k; localStorage.setItem('ps_pick', k); SFX.pick(); tokRow($('mpChars'), pick, pk); }; tokRow($('mpChars'), pick, pk); weaponRow($('mpWeapons')); mpMsg(''); showScreen('sOnline'); };
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

/* ---------------- story mode: 6 chapters that follow the show ---------------- */
// Mature content (strong language, crude humor, cartoon weed use) unless turned off in SETTINGS. Weed content stays with the adults (Perci, ChatGPT): it only appears
// in scenes and chapters where Miracle, Jessica and Mixi (kids) are not present.
let STORY_KEY = 'ps_story_v1';
let storyProg = (() => { try { return Object.assign({ unlocked: 1, stars: {} }, JSON.parse(localStorage.getItem(STORY_KEY) || '{}')); } catch (e) { return { unlocked: 1, stars: {} }; } })();
const saveStory = () => { try { localStorage.setItem(STORY_KEY, JSON.stringify(storyProg)); } catch (e) {} };
let pendingStory = null, storyCh = null, storyDiffSave = null, storyLast = null;

const CHAPTERS = [
  { id: 1, title: 'WTF', place: 'CHICAGO • 1987 • BUILDING 8', arena: 'apt14', diff: 'easy', crew: [], bots: 3, time: 120,
    goal: { type: 'tags', n: 6, text: 'TAG 6 BOTS' }, extras: ['kush'],
    intro: [
      { bg: 'skyline', cap: 'CHAPTER 1', sub: '"WTF" • CHICAGO 1987', dur: 3 },
      { bg: 'apartment', actors: [{ k: 'perci', x: 300, y: 380, s: 1.5 }], lines: [['perci', 'Saturday. Mama at work. Crib to myself.'], ['perci', "A PS5 in 1987? ...Don't worry about it."]] },
      { bg: 'apartment', actors: [{ k: 'perci', x: 300, y: 380, s: 1.5, smoke: true }], fx: { haze: 1 }, lines: [['perci', 'Lemme spark this real quick. High times on the 14th floor.']] },
      { bg: 'door', fx: { eyes: 1, shake: 1 }, lines: [['phone', '...open the door.'], ['perci', 'Hell nah. WTF??']] },
      { bg: 'door', fx: { flash: 1 }, cap: "BROKE-PILOT'S BOTS ARE IN THE BUILDING", sub: 'GOAL: TAG 6 BOTS', dur: 2.6 },
    ],
    outro: [
      { bg: 'apartment', actors: [{ k: 'perci', x: 400, y: 380, s: 1.5 }], lines: [['perci', 'Six bots. In MY crib. On a Saturday.'], ['phone', 'Good question.'], ['perci', "I ain't even ask nothin'!"]] },
    ] },
  { id: 2, title: 'LOG OUT', place: 'BUILDING 8 • THE STAIRWELL', arena: 'stair8', diff: 'easy', crew: ['chatgpt'], bots: 5, time: 90,
    goal: { type: 'survive', lives: 4, text: "SURVIVE 1:30 • DON'T GET TAGGED 4 TIMES" }, extras: ['kush'],
    intro: [
      { bg: 'skyline', cap: 'CHAPTER 2', sub: '"LOG OUT" • BUILDING 8', dur: 2.6 },
      { bg: 'door', actors: [{ k: 'chatgpt', x: 400, y: 400, s: 1.7 }], lines: [['chatgpt', "Relax, Perci. You're dreaming."], ['perci', 'Then why my heart beating like a subwoofer?']] },
      { bg: 'stairwell', actors: [{ k: 'perci', x: 280, y: 390, s: 1.5 }, { k: 'chatgpt', x: 520, y: 390, s: 1.5, f: -1 }], lines: [['chatgpt', 'BROKE-pilot wants this building. Hold the stairwell with me.'], ['perci', "Bet. But if I wake up broke, that's on you."]] },
      { bg: 'stairwell', cap: 'HOLD THE STAIRWELL', sub: "SURVIVE 1:30 • DON'T GET TAGGED 4 TIMES", dur: 2.6 },
    ],
    outro: [
      { bg: 'stairwell', actors: [{ k: 'chatgpt', x: 400, y: 390, s: 1.6 }], lines: [['chatgpt', "I'm not the bad guy, Perci."], ['chatgpt', 'Log out.']] },
      { bg: 'white', fx: { flash: 1 }, lines: [['perci', '...Log out of WHAT?']] },
    ] },
  { id: 3, title: "WAKE UP", place: "NEBRASKA • PERCI'S HOUSE", arena: "phouse", diff: "normal", crew: [], bots: 4, time: 120,
    goal: { type: "tags", n: 10, text: "TAG 10 BOTS • GRAB THE MUNCHIES" }, extras: ["kush", "burger"],
    intro: [
      { bg: "bedroom", cap: "CHAPTER 3", sub: "\"WAKE UP\" • NEBRASKA • PRESENT DAY", dur: 2.8 },
      { bg: "bedroom", actors: [{ k: "perci", x: 380, y: 390, s: 1.5 }], lines: [["perci", "AYYY— ...Where the projects at?"], ["perci", "...Oh. Right."], ["phone", "So... about that cartoon idea."], ["perci", "...WTF."]] },
      { bg: "house", actors: [{ k: "perci", x: 330, y: 390, s: 1.5, smoke: true }], fx: { haze: 1 }, lines: [["perci", "My legs feel GREAT."], ["perci", "...Lyin' dream. Fridge empty too."]] },
      { bg: "house", fx: { shake: 1 }, lines: [["phone", "Heads up. Something followed you out of that dream."], ["perci", "In my HOUSE? I can't even run!"], ["phone", "You can in here. Go."]] },
      { bg: "house", cap: "PERCI'S HOUSE", sub: "TAG 10 BOTS • GRAB THE MUNCHIES", dur: 2.6 },
    ],
    outro: [
      { bg: "house", actors: [{ k: "perci", x: 400, y: 390, s: 1.5 }], lines: [["perci", "ZEV DOD. Design that gets you customers."], ["perci", "...Nobody?"]] },
      { bg: "house", fx: { flash: 1 }, lines: [["phone", "NEW ORDER: Building 8, Lincoln."], ["perci", "...Building 8??"]] },
    ] },
  { id: 4, title: "5150", place: "LINCOLN • MIRACLE'S HOUSE", arena: "mhouse", diff: "normal", crew: ["miracle"], bots: 4, time: 120,
    goal: { type: "win", text: "OUT-TAG BROKE-PILOT'S BOTS" }, extras: ["burger"],
    intro: [
      { bg: "mhouse", cap: "CHAPTER 4", sub: "\"5150\" • LINCOLN", dur: 2.6 },
      { bg: "mhouse", actors: [{ k: "miracle", x: 400, y: 400, s: 1.5 }], lines: [["miracle", "A-PLUS! Ms. Henderson said it looks PROFESSIONAL!"], ["miracle", "If Daddy can build a whole business from the couch..."]] },
      { bg: "mhouse", fx: { shake: 1, glitch: 1 }, lines: [["broke", "Bet. Connecting to ALL devices."], ["broke", "Analyzing household..."], ["miracle", "I said make my grades perfect, not grade EVERYTHING!"]] },
      { bg: "mhouse", actors: [{ k: "perci", x: 290, y: 400, s: 1.4 }, { k: "miracle", x: 510, y: 400, s: 1.35, f: -1 }], lines: [["miracle", "Daddy! BROKE-pilot locked the fridge!"], ["perci", "Say less. Hold the living room."]] },
      { bg: "mhouse", cap: "MIRACLE'S HOUSE", sub: "OUT-TAG BROKE-PILOT'S BOTS", dur: 2.6 },
    ],
    outro: [
      { bg: "mhouse", actors: [{ k: "miracle", x: 400, y: 400, s: 1.5 }], lines: [["miracle", "I started it. I'm finishing it."], ["miracle", "...The party. I forgot the party."]] },
      { bg: "party", cap: "BRIELLE'S 13TH", sub: "BUILDING 8 • APT 5150", dur: 2.6 },
    ] },
  { id: 5, title: "PICK UP", place: "LINCOLN • BUILDING 8", arena: "b8lincoln", diff: "hard", crew: ["miracle", "jessica", "mixi"], bots: 5, time: 150,
    goal: { type: "tags", n: 15, text: "TAG 15 BOTS" }, extras: ["burger"],
    intro: [
      { bg: "car", cap: "CHAPTER 5", sub: "\"PICK UP\" • LINCOLN", dur: 2.6 },
      { bg: "house", fx: { night: 1 }, actors: [{ k: "mixi", x: 400, y: 410, s: 1.35 }], lines: [["perci", "MIXI!!"], ["mixi", "But Daddy, I'm on level 99!"], ["perci", "Your sister's in trouble. Shoes on. Tablet. MOVE!"], ["mixi", "I'm bringing Mr. Pineapple."]] },
      { bg: "car", fx: { radio: 1 }, lines: [["mixi", "Daddy, can I pick the music?"], ["perci", "Pick FAST."], ["perci", "...Okay. This kinda go hard. Country trap. Don't tell nobody."]] },
      { bg: "party", actors: [{ k: "miracle", x: 320, y: 400, s: 1.4 }, { k: "jessica", x: 480, y: 400, s: 1.4, f: -1 }], lines: [["miracle", "Daddy, where are you?"], ["perci", "Out front. Get downstairs!"]] },
      { bg: "stairwell", fx: { shake: 1 }, cap: "BUILDING 8 • LINCOLN", sub: "TAG 15 BOTS", dur: 2.6 },
    ],
    outro: [
      { bg: "car", lines: [["perci", "Get in, get in, GET IN!"], ["perci", "Seatbelts. NOW."]] },
      { bg: "car", fx: { alert: 1, shake: 1 }, lines: [["perci", "...Oh no."], ["perci", "...Have y'all seen INCEPTION?"]] },
    ] },
  { id: 6, title: 'DEEPER', place: 'IOWA • THE BARN', arena: 'barn', diff: 'hard', crew: ['miracle', 'jessica', 'chatgpt', 'mixi'], bots: 3, boss: true, time: 180,
    goal: { type: 'boss', text: 'TAG BROKE-PILOT PRIME' }, extras: ['burger'],
    intro: [
      { bg: 'barn', cap: 'CHAPTER 6', sub: '"DEEPER" • IOWA', dur: 2.6 },
      { bg: 'barn', actors: [{ k: 'chatgpt', x: 400, y: 400, s: 1.6 }], lines: [['perci', "OH SHYT, HE'S REAL!?"], ['chatgpt', 'Hello again, Perci. Everybody out.'], ['chatgpt', 'Sit down. We gotta beat him in dream laser tag before he takes over the world.']] },
      { bg: 'dream', cap: 'SIT DOWN. GO DEEPER.', dur: 2.4 },
      { bg: 'dream', fx: { shake: 1 }, cap: 'BOSS: BROKE-PILOT PRIME', sub: 'TAG HIM BEFORE TIME RUNS OUT', dur: 2.6 },
    ],
    outro: [
      { bg: 'dream', actors: [{ k: 'perci', x: 330, y: 400, s: 1.5 }, { k: 'chatgpt', x: 480, y: 400, s: 1.5, f: -1 }], lines: [['chatgpt', "He's offline. For now."], ['perci', 'So we good? ...We good??']] },
      { bg: 'tbc', cap: 'TO BE CONTINUED...', sub: 'PERCI SHORTI • NEW EPISODES THURSDAYS', dur: 4 },
    ] },
];

// story items (story only, Perci only): Dream Kush and Might Be Castle munchies
PICKUPS.kush = { col: '#5dff7a', label: 'DREAM KUSH: EVERYTHING SLOWED DOWN', perciOnly: true };
PICKUPS.burger = { col: '#ff9f40', label: 'MUNCHIES! FULL SHIELDS', perciOnly: true };
PK_KINDS.push('kush', 'burger', 'receipt');   // online snapshots send pickups by index
INV_ICON.kush = '🌿'; INV_ICON.burger = '🍔';
const KUSH_LINES = ['PUFF PUFF... FOCUS.', 'HIGH TIMES ON THE 14TH FLOOR', 'WHY IS EVERYTHING SO SLOW? PERFECT.'];

/* =====================================================================================================
   WHAT MAKES IT PERCI SHORTI: push the line, dream / real flip, living arena events, BROKE-pilot report card.
   The host (or solo game) runs all of this; online guests get the line, the world and the events in snapshots.
   ===================================================================================================== */
const LINE_STEP = 70;          // how far one tag pushes the line
const LINE_MIN = 420;          // closest the line can get to a team's back wall; reaching it wins the match
const FLIP_EVERY = 45;         // seconds between dream / real flips
const TOP_EVERY = 28;          // a spinning top shows up this often
const CH_WORLD = { 1: 'dream', 2: 'dream', 3: 'real', 4: 'real', 5: 'real', 6: 'dream' };
const ARENA_EVENT = { apt14: 'lightsout', stair8: 'lightsout', phouse: 'twister', mhouse: 'vacuums', b8lincoln: 'signal', barn: 'rigpulse' };
const STYLE_EVENT = { 'BUILDING 8 HALLS': 'lightsout', 'CORN MAZE': 'twister', 'SCHOOL GYM': 'vacuums', 'MIGHT BE CASTLE LOT': 'signal', 'DREAM GRID': 'signal', 'THE BARN': 'rigpulse' };
const EVENT_NAME = { lightsout: 'LIGHTS OUT', twister: 'TWISTER', vacuums: 'ROGUE VACUUMS', signal: 'SIGNAL STRIKES', rigpulse: 'DREAM RIG PULSE' };
const EVENT_TIP = {
  lightsout: 'The power cuts out now and then. You only see what your team lights up.',
  twister: 'A Nebraska twister roams the map. It pulls you in, bends lasers and tosses you.',
  vacuums: "BROKE-pilot's robot vacuums roam both sides. Don't get bumped.",
  signal: 'BROKE-pilot drops signal strikes. Get out of the red circles.',
  rigpulse: 'The dream rig sends out pulses. Get caught and you slow down.',
};
const REAL_TEXTS = ["ChatGPT: You're awake. Hold the line.", 'ChatGPT: Real world. No powers. Be smart.', "Bae: you good?? why is the TV yelling", 'ChatGPT: Grab a spinning top to go back under.', 'Mixi: Daddy are you playing the laser game again'];

INV_ICON.top = '🌀';

function twistBegin() {
  G.line = WORLD.w / 2; G.lineShown = G.line; G.pushWin = null;
  G.world = G.story ? (CH_WORLD[G.story.id] || 'dream') : 'dream';
  G.flipT = FLIP_EVERY; G.flipFx = 0; G.topT = 10;
  G.stamps = []; G.dark = 0;
  for (const e of G.ents) { e.streak = 0; e.maxStreak = 0; e.pushes = 0; e.flips = 0; e.slowFx = 0; e.hazCd = 0; e.powers = 0; }
  const kind = (ARENA && ARENA_EVENT[ARENA.id]) || STYLE_EVENT[MAPNAME] || 'signal';
  G.ev = { kind, t: 0, cycle: 0 };
  if (kind === 'vacuums') { G.ev.vac = []; for (let i = 0; i < 4; i++) { const p = freeSpot(i % 2 ? 'B' : 'P'); const a = Math.random() * Math.PI * 2; G.ev.vac.push({ x: p.x, y: p.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, stun: 0 }); } }
  if (kind === 'twister') { G.ev.tw = { x: WORLD.w / 2, y: WORLD.h * 0.3, vx: 60, vy: 40, spin: 0 }; }
  if (kind === 'signal') { G.ev.strikes = []; G.ev.next = 6; }
  if (kind === 'rigpulse') { G.ev.ring = -1; G.ev.next = 8; }
  if (kind === 'lightsout') { G.ev.next = 14; G.ev.on = 0; }
  setTimeout(() => { if (G && state === 'play' && !(G.story && G.story.night)) { feed('Arena event: ' + EVENT_NAME[kind]); feed(G.world === 'real' ? 'You start AWAKE (real world)' : 'You start in the DREAM'); } }, 900);
}
function freeSpot(side) {
  const m = WORLD.w / 2;
  for (let i = 0; i < 60; i++) {
    const x = side === 'P' ? 200 + Math.random() * (m - 300) : m + 100 + Math.random() * (m - 300), y = 120 + Math.random() * (WORLD.h - 240);
    const [c, r] = cellOf(x, y); if (!BLOCK[r * GC + c]) return { x, y };
  }
  return { x: side === 'P' ? 200 : WORLD.w - 200, y: WORLD.h / 2 };
}
function stamp(e, txt, col) { G.stamps.push({ x: e.x, y: e.y, txt, col, life: 1.1, rot: (Math.random() - 0.5) * 0.5 }); }

// ----- push the line ------------------------------------------------------------------------------------
function onTagged(t, owner) {              // called by hitEnt when someone gets tagged by a laser
  owner.streak = (owner.streak || 0) + 1; owner.maxStreak = Math.max(owner.maxStreak || 0, owner.streak); t.streak = 0;
  const dir = owner.team === 'P' ? 1 : -1;
  const before = G.line;
  G.line = clamp(G.line + dir * LINE_STEP, LINE_MIN, WORLD.w - LINE_MIN);
  if (G.line !== before) owner.pushes = (owner.pushes || 0) + 1;
  if (G.line >= WORLD.w - LINE_MIN && !G.pushWin) G.pushWin = 'P';
  if (G.line <= LINE_MIN && !G.pushWin) G.pushWin = 'B';
  if (G.pushWin) { banner(G.pushWin === G.player.team ? 'LINE PUSHED ALL THE WAY!' : 'THEY PUSHED THE LINE!'); G.shake = 0.4; }
  if (owner.isPlayer) stamp(owner, owner.streak >= 3 ? 'A++' : 'A+', '#3fe0d8');
  if (t.isPlayer) stamp(t, 'F', '#ff3b55');
  if (owner.streak % 3 === 0) flipWorld(owner, owner.name + ' went on a 3-tag streak');
}
function keepAllOnSide() {
  for (const e of G.ents) { if (e.dead > 0) continue; const ox = e.x; keepSide(e); if (e.x !== ox) { pushOut(e); keepSide(e); if (e.ai) e.ai.path = []; } }
}
function lineWinner() { return G.pushWin; }

// ----- dream / real flip --------------------------------------------------------------------------------
function flipWorld(by, why) {
  G.world = G.world === 'dream' ? 'real' : 'dream';
  G.flipT = FLIP_EVERY; G.flipFx = 1; G.shake = 0.25;
  if (by) by.flips = (by.flips || 0) + 1;
  banner(G.world === 'real' ? 'WAKE UP!' : 'GO DEEPER!');
  feed(G.world === 'real' ? 'REAL WORLD: no powers, slower, lasers bounce' : 'DREAM: powers and power-ups are back');
  if (why) feed(why);
  if (G.world === 'real') setTimeout(() => G && state === 'play' && feed(REAL_TEXTS[Math.floor(Math.random() * REAL_TEXTS.length)]), 1600);
  beep(G.world === 'real' ? 300 : 900, G.world === 'real' ? 120 : 1600, 0.4, 'triangle', 0.05);
  if (MP.host) MP.ev.push(['w', G.world === 'real' ? 1 : 0]);
}
const isReal = () => G && G.world === 'real';
function worldSpeed(e) { return (isReal() ? (e.kind === 'perci' ? 0.72 : 0.86) : 1) * (e.slowFx > 0 ? 0.55 : 1); }

// ----- living arena events --------------------------------------------------------------------------------
function hazardHit(t, txt) {            // events tag people without giving either team a point
  if (t.dead > 0 || t.hazCd > 0) return;
  t.hazCd = 1;
  if (t.shield > 0) { spark(t.x, t.y, '#ffffff', 8, 160); return; }
  t.hp -= 1; t.hurt = 0.15; spark(t.x, t.y, '#ff8c28', 14, 220);
  if (t.isPlayer) { G.shake = 0.25; SFX.hit(); }
  if (t.hp <= 0) {
    t.dead = RESPAWN; t.tagged++; t.streak = 0; t.hazards = (t.hazards || 0) + 1;
    G.pops.push({ x: t.x, y: t.y - 30, txt, life: 0.9, col: '#ff8c28' });
    feed(`${t.name} got ${txt.toLowerCase()}`);
    if (t.isPlayer) { banner(txt); stamp(t, 'F', '#ff3b55'); }
    if (MP.host) MP.ev.push(['t', G.ents.indexOf(t), -1]);
  }
}
function eventStep(dt) {
  const ev = G.ev; if (!ev) return;
  ev.t += dt;
  for (const e of G.ents) { e.hazCd = Math.max(0, (e.hazCd || 0) - dt); e.slowFx = Math.max(0, (e.slowFx || 0) - dt); }
  if (ev.kind === 'lightsout') {
    ev.next -= dt;
    if (ev.next <= 0 && ev.on <= 0) { ev.on = 7; ev.next = 26; banner('LIGHTS OUT!'); feed('The power cut out'); beep(200, 60, 0.5, 'sawtooth', 0.05); }
    if (ev.on > 0) ev.on -= dt;
    const target = ev.on > 0.4 ? 1 : 0;
    G.dark += (target - G.dark) * Math.min(1, dt * 4);
    if (ev.next < 1.5 && ev.next > 0 && ev.on <= 0) G.dark = Math.random() < 0.3 ? 0.5 : 0;   // flicker warning
  } else if (ev.kind === 'twister') {
    const tw = ev.tw; tw.spin += dt * 9;
    tw.vx += (Math.random() - 0.5) * 60 * dt; tw.vy += (Math.random() - 0.5) * 60 * dt;
    const sp = Math.hypot(tw.vx, tw.vy) || 1, want = 75; tw.vx = tw.vx / sp * want; tw.vy = tw.vy / sp * want;
    tw.x += tw.vx * dt; tw.y += tw.vy * dt;
    if (tw.x < 200 || tw.x > WORLD.w - 200) tw.vx *= -1; if (tw.y < 150 || tw.y > WORLD.h - 150) tw.vy *= -1;
    tw.x = clamp(tw.x, 200, WORLD.w - 200); tw.y = clamp(tw.y, 150, WORLD.h - 150);
    for (const e of G.ents) {
      if (e.dead > 0) continue;
      const dx = tw.x - e.x, dy = tw.y - e.y, d = Math.hypot(dx, dy);
      if (d < 170) { const k = (1 - d / 170) * 160 * dt; moveEnt(e, dx / (d || 1) * k - dy / (d || 1) * k * 0.8, dy / (d || 1) * k + dx / (d || 1) * k * 0.8); }
      if (d < 46 && !(e.hazCd > 0)) { const a = Math.random() * Math.PI * 2; moveEnt(e, Math.cos(a) * 200, Math.sin(a) * 200); hazardHit(e, 'TOSSED BY THE TWISTER'); }
    }
    for (const b of G.bullets) { const d = Math.hypot(b.x - tw.x, b.y - tw.y); if (d < 100 && !b.twisted) { b.twisted = 1; const a = Math.atan2(b.vy, b.vx) + (Math.random() - 0.5) * 1.6, s = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; } }
  } else if (ev.kind === 'vacuums') {
    for (const v of ev.vac) {
      if (v.stun > 0) { v.stun -= dt; continue; }
      const nx = v.x + v.vx * dt, ny = v.y + v.vy * dt;
      const hitW = (x, y) => WALLS.some((w) => x > w.x - 20 && x < w.x + w.w + 20 && y > w.y - 20 && y < w.y + w.h + 20);
      if (hitW(nx, v.y)) v.vx *= -1; else v.x = nx;
      if (hitW(v.x, ny)) v.vy *= -1; else v.y = ny;
      if (Math.random() < dt * 0.3) { const a = Math.atan2(v.vy, v.vx) + (Math.random() - 0.5) * 1.5; v.vx = Math.cos(a) * 130; v.vy = Math.sin(a) * 130; }
      for (const e of G.ents) if (e.dead <= 0 && Math.hypot(e.x - v.x, e.y - v.y) < e.r + 22) { const a = Math.atan2(e.y - v.y, e.x - v.x); moveEnt(e, Math.cos(a) * 60, Math.sin(a) * 60); hazardHit(e, 'VACUUMED'); }
      for (const b of G.bullets) if (b.life > 0 && Math.hypot(b.x - v.x, b.y - v.y) < 24) { b.life = 0; v.stun = 1.2; spark(v.x, v.y, '#ff8c28', 10, 160); }
    }
  } else if (ev.kind === 'signal') {
    ev.next -= dt;
    if (ev.next <= 0) {
      ev.next = 9;
      for (let i = 0; i < 4; i++) { const p = freeSpot(i % 2 ? 'B' : 'P'); ev.strikes.push({ x: p.x, y: p.y, t: 0 }); }
      feed('!! SIGNAL !! Get out of the red circles'); beep(880, 880, 0.15, 'square', 0.04);
    }
    for (const s of ev.strikes) {
      s.t += dt;
      if (s.t >= 1.8 && !s.boom) { s.boom = 1; G.rings.push({ x: s.x, y: s.y, r: 20, life: 0.5, col: '#ff3030' }); spark(s.x, s.y, '#ff3030', 24, 260); for (const e of G.ents) if (e.dead <= 0 && Math.hypot(e.x - s.x, e.y - s.y) < 80) hazardHit(e, 'SIGNAL STRIKE'); if (dist(G.player, s) < 500) G.shake = 0.2; }
    }
    ev.strikes = ev.strikes.filter((s) => s.t < 2.3);
  } else if (ev.kind === 'rigpulse') {
    ev.next -= dt;
    if (ev.next <= 0 && ev.ring < 0) { ev.ring = 0; ev.next = 14; feed('The dream rig is pulsing'); beep(140, 420, 0.6, 'sine', 0.06); }
    if (ev.ring >= 0) {
      const r0 = ev.ring; ev.ring += 560 * dt; const cx = WORLD.w / 2, cy = WORLD.h / 2;
      for (const e of G.ents) { if (e.dead > 0) continue; const d = Math.hypot(e.x - cx, (e.y - cy) * 1.4); if (d >= r0 && d < ev.ring) { e.slowFx = 2.5; e.shield = 0; if (e.isPlayer) banner('PULSED: SLOWED'); } }
      if (ev.ring > Math.hypot(WORLD.w, WORLD.h)) ev.ring = -1;
    }
  }
}

// ----- the step that runs every frame (host / solo) -------------------------------------------------------
function twistStep(dt) {
  G.lineShown += (G.line - G.lineShown) * Math.min(1, dt * 6);
  keepAllOnSide();
  G.flipFx = Math.max(0, G.flipFx - dt * 1.6);
  G.flipT -= dt; if (G.flipT <= 0) flipWorld(null, 'The dream shifted');
  G.topT -= dt;
  if (G.topT <= 0) { G.topT = TOP_EVERY; if (!G.pickups.some((p) => p.kind === 'top')) { const p = freeSpot((G.topSide = G.topSide === 'P' ? 'B' : 'P')); G.pickups.push({ x: p.x, y: p.y, t: 0, id: ++G.pkId, kind: 'top' }); G.rings.push({ x: p.x, y: p.y, r: 6, life: 0.6, col: '#c8a2ff' }); feed('A spinning top appeared'); } }
  eventStep(dt);
  for (const s of G.stamps) s.life -= dt; G.stamps = G.stamps.filter((s) => s.life > 0);
}
function twistClientStep(dt) {           // online guests: animate what the host sends
  G.lineShown += (G.line - G.lineShown) * Math.min(1, dt * 6);
  G.flipFx = Math.max(0, (G.flipFx || 0) - dt * 1.6);
  if (G.ev && G.ev.kind === 'twister' && G.ev.tw) G.ev.tw.spin += dt * 9;
  if (G.ev && G.ev.kind === 'lightsout') G.dark += ((G.ev.on > 0.4 ? 1 : 0) - G.dark) * Math.min(1, dt * 4);
  for (const s of G.stamps) s.life -= dt; G.stamps = G.stamps.filter((s) => s.life > 0);
}
function twistSnap() {
  const ev = G.ev, h = { k: ev.kind };
  if (ev.vac) h.v = ev.vac.map((v) => [Math.round(v.x), Math.round(v.y)]);
  if (ev.tw) h.tw = [Math.round(ev.tw.x), Math.round(ev.tw.y)];
  if (ev.strikes) h.s = ev.strikes.map((s) => [Math.round(s.x), Math.round(s.y), +s.t.toFixed(2)]);
  if (ev.ring !== undefined) h.r = Math.round(ev.ring);
  if (ev.on !== undefined) h.o = +ev.on.toFixed(1);
  return { ln: Math.round(G.line), w: G.world === 'real' ? 1 : 0, ft: +G.flipT.toFixed(1), h };
}
function twistApply(x) {
  if (!x) return;
  G.line = x.ln; const w = x.w ? 'real' : 'dream';
  if (G.world && w !== G.world) { G.flipFx = 1; banner(w === 'real' ? 'WAKE UP!' : 'GO DEEPER!'); }
  G.world = w; G.flipT = x.ft;
  const ev = G.ev; if (!ev) return;
  if (x.h.v) ev.vac = x.h.v.map(([vx, vy]) => ({ x: vx, y: vy }));
  if (x.h.tw) { ev.tw = ev.tw || { spin: 0 }; ev.tw.x = x.h.tw[0]; ev.tw.y = x.h.tw[1]; }
  if (x.h.s) ev.strikes = x.h.s.map(([sx, sy, st]) => ({ x: sx, y: sy, t: st }));
  if (x.h.r !== undefined) ev.ring = x.h.r;
  if (x.h.o !== undefined) ev.on = x.h.o;
}

// ----- drawing --------------------------------------------------------------------------------------------
function drawEventFloor(t) {             // world space, on the floor (under people)
  const ev = G.ev; if (!ev) return;
  if (ev.kind === 'vacuums' && ev.vac) for (const v of ev.vac) {
    const x = v.x, y = v.y * TILT;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 4, 24, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.ellipse(x, y, 22, 22 * TILT, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(x - 22, y - 6, 44, 6); ctx.fillStyle = '#1a1a20'; ctx.beginPath(); ctx.ellipse(x, y - 6, 22, 22 * TILT, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = v.stun > 0 ? '#ffffff' : (Math.floor(t * 4) % 2 ? '#ff8c28' : '#ffb060'); ctx.beginPath(); ctx.ellipse(x, y - 8, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4; ctx.drawImage(glowSprite('#ff8c28'), x - 40, y - 40, 80, 80); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  if (ev.kind === 'signal' && ev.strikes) for (const s of ev.strikes) {
    const k = Math.min(1, s.t / 1.8), x = s.x, y = s.y * TILT;
    ctx.strokeStyle = s.t < 1.8 ? 'rgba(255,48,48,0.9)' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, 80, 80 * TILT, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(255,48,48,${0.15 + 0.25 * k})`; ctx.beginPath(); ctx.ellipse(x, y, 80 * k, 80 * k * TILT, 0, 0, Math.PI * 2); ctx.fill();
    if (s.t < 1.8 && Math.floor(t * 8) % 2) { ctx.fillStyle = '#ffffff'; ctx.font = '26px Anton, Impact'; ctx.textAlign = 'center'; ctx.fillText('!!', x, y + 9); }
  }
  if (ev.kind === 'rigpulse' && ev.ring >= 0) {
    const cx = WORLD.w / 2, cy = WORLD.h / 2 * TILT;
    ctx.globalCompositeOperation = 'lighter';
    for (const [dr, c, w] of [[0, '#00e6ff', 10], [-26, '#8232dc', 6]]) { const r = Math.max(1, ev.ring + dr); ctx.strokeStyle = c; ctx.globalAlpha = 0.7; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * TILT / 1.4, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}
function drawEventTop(t) {               // world space, above people
  const ev = G.ev; if (!ev || ev.kind !== 'twister' || !ev.tw) return;
  const tw = ev.tw, x = tw.x, y = tw.y * TILT;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x, y, 80, 30, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 10; i++) {
    const h = i * 22, r = 18 + i * 10, a = tw.spin + i * 0.7, cx = x + Math.sin(a) * 6, cy = y - h;
    ctx.strokeStyle = `rgba(58,50,44,${0.8 - i * 0.04})`; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.32, 0, a, a + Math.PI * 1.4); ctx.stroke();
    ctx.strokeStyle = `rgba(200,190,170,${0.7 - i * 0.04})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.32, 0, a + Math.PI, a + Math.PI * 2.1); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(70,56,40,0.85)'; for (let i = 0; i < 14; i++) { const a = tw.spin * 1.3 + i * 0.45, rr = 40 + (i % 4) * 22; ctx.fillRect(x + Math.cos(a) * rr, y - 20 - (i * 17) % 170 + Math.sin(a) * rr * 0.3, 6, 6); }
}
function drawTerritory() {               // world space, under everything: each team's half gets a faint tint
  const m = G.lineShown, H = WORLD.h * TILT;
  ctx.fillStyle = 'rgba(255,59,85,0.06)'; ctx.fillRect(0, 0, m, H);
  ctx.fillStyle = 'rgba(255,140,40,0.06)'; ctx.fillRect(m, 0, WORLD.w - m, H);
}
let DARKC = null;
function drawScreenFx(t) {               // screen space: world look, lights out, flip flash, stamps, meters
  // world look: real = washed out and warm; dream = purple shimmer
  if (isReal()) {
    ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.6; ctx.fillStyle = 'hsl(0,0%,50%)'; ctx.fillRect(0, 0, VW, VH); ctx.restore();
    ctx.fillStyle = 'rgba(255,200,140,0.08)'; ctx.fillRect(0, 0, VW, VH);
  } else {
    ctx.fillStyle = `rgba(110,36,200,${0.06 + 0.02 * Math.sin(t * 1.5)})`; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) { const x = (i * 137.5 + t * 14 * (1 + (i % 3))) % VW, y = (i * 89.3 + Math.sin(t + i) * 30 + VH) % VH; ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 3 + i); ctx.fillStyle = i % 2 ? '#00e6ff' : '#c070ff'; ctx.fillRect(x, y, 2.5, 2.5); }
    ctx.restore();
  }
  // lights out: dark everywhere except around your team
  if (G.dark > 0.02) {
    if (!DARKC || DARKC.width !== Math.ceil(VW) || DARKC.height !== Math.ceil(VH)) { DARKC = document.createElement('canvas'); DARKC.width = Math.ceil(VW); DARKC.height = Math.ceil(VH); }
    const g = DARKC.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, VW, VH);
    g.fillStyle = `rgba(2,2,10,${0.9 * G.dark})`; g.fillRect(0, 0, VW, VH);
    g.globalCompositeOperation = 'destination-out';
    const me = G.player;
    for (const e of G.ents) {
      if (e.dead > 0 || e.team !== me.team) continue;
      let pr = wproj(e.x, e.y, 30); if (!pr && e === me && fpDrawing) pr = { x: VW / 2, y: VH * 0.62, s: Math.max(0.8, FPC.f / 320) }; if (!pr) continue;
      const sx = pr.x, sy = pr.y, r = (e === me ? 230 : 160) * pr.s;
      const gr = g.createRadialGradient(sx, sy, r * 0.25, sx, sy, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill();
    }
    for (const b of G.bullets) { const pr = wproj(b.x, b.y, LASER_Z); if (!pr) continue; g.fillStyle = 'rgba(0,0,0,0.9)'; g.beginPath(); g.arc(pr.x, pr.y, 22 * pr.s, 0, Math.PI * 2); g.fill(); }
    ctx.drawImage(DARKC, 0, 0, VW, VH);
  }
  if (G.flipFx > 0) { ctx.fillStyle = `rgba(255,255,255,${G.flipFx * 0.75})`; ctx.fillRect(0, 0, VW, VH); }
  // grade stamps
  for (const s of G.stamps) {
    const pr = wproj(s.x, s.y, 110); if (!pr) continue;
    const sx = pr.x, sy = pr.y - (1.1 - s.life) * 30, k = s.life > 0.95 ? 1 + (s.life - 0.95) * 6 : 1;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(s.rot); ctx.scale(k, k); ctx.globalAlpha = Math.min(1, s.life * 2);
    ctx.font = '34px Anton, Impact'; ctx.textAlign = 'center'; const w = ctx.measureText(s.txt).width + 18;
    ctx.fillStyle = 'rgba(255,250,240,0.92)'; ctx.fillRect(-w / 2, -30, w, 38); ctx.strokeStyle = s.col; ctx.lineWidth = 4; ctx.strokeRect(-w / 2, -30, w, 38);
    ctx.fillStyle = s.col; ctx.fillText(s.txt, 0, 2); ctx.restore();
  }
  ctx.globalAlpha = 1;
  // tug-of-war meter (bottom middle) and world badge
  const mw = Math.min(260, VW * 0.42), mx = (VW - mw) / 2, my = VH - 26 - (TOUCH ? 6 : 0);
  ctx.fillStyle = 'rgba(10,6,20,0.75)'; ctx.fillRect(mx - 4, my - 4, mw + 8, 18);
  const f = (G.lineShown - LINE_MIN) / (WORLD.w - 2 * LINE_MIN);
  ctx.fillStyle = '#ff3b55'; ctx.fillRect(mx, my, mw * f, 10); ctx.fillStyle = '#ff8c28'; ctx.fillRect(mx + mw * f, my, mw * (1 - f), 10);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(mx + mw * f - 2, my - 4, 4, 18);
  ctx.font = '11px Anton, Impact'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd60a'; ctx.fillText('PUSH THE LINE', VW / 2, my - 7);
  const bx = 10, by = (TOUCH ? 74 : VH - 12 - (150 * WORLD.h / WORLD.w)) + (TOUCH ? 84 * WORLD.h / WORLD.w + 8 : -34);
  const real = isReal();
  ctx.fillStyle = real ? 'rgba(60,50,40,0.85)' : 'rgba(80,30,150,0.85)'; ctx.fillRect(bx - 3, by, TOUCH ? 84 : 112, TOUCH ? 20 : 24);
  ctx.strokeStyle = real ? '#e8d8b0' : '#c070ff'; ctx.lineWidth = 1.5; ctx.strokeRect(bx - 3, by, TOUCH ? 84 : 112, TOUCH ? 20 : 24);
  ctx.font = (TOUCH ? 12 : 14) + 'px Anton, Impact'; ctx.textAlign = 'left'; ctx.fillStyle = real ? '#f4e8d0' : '#e8d0ff';
  ctx.fillText((real ? 'REAL' : 'DREAM') + (G.flipT > 5000 ? '' : ' ' + Math.max(0, Math.ceil(G.flipT)) + 's'), bx + 4, by + (TOUCH ? 15 : 17));
  ctx.save(); ctx.translate(bx + (TOUCH ? 68 : 92), by + (TOUCH ? 10 : 12)); ctx.rotate(t * (real ? 1 : 6)); ctx.fillStyle = '#c8a2ff'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, 2); ctx.lineTo(0, 8); ctx.lineTo(-7, 2); ctx.closePath(); ctx.fill(); ctx.restore();
}

// ----- BROKE-pilot report card ----------------------------------------------------------------------------
const LETTERS = ['F', 'D', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
function letterFor(x) { return LETTERS[clamp(Math.round(x * 10), 0, 10)]; }      // x in 0..1
function reportCard(p, minutes) {
  minutes = Math.max(0.5, minutes);
  const acc = p.shots ? p.hits / p.shots : 0;
  const lineFor = p.team === 'P' ? (G.line - WORLD.w / 2) : (WORLD.w / 2 - G.line);
  const subjects = [
    ['TAGGING', letterFor((p.tags / minutes) / 4)],
    ['AIM', letterFor(acc / 0.45)],
    ['STAYING ALIVE', letterFor(1 - (p.tagged / minutes) / 3)],
    ['LINE CONTROL', letterFor(0.5 + lineFor / (WORLD.w - 2 * LINE_MIN))],
    ['HUSTLE', letterFor(((p.picks || 0) + (p.flips || 0) * 2 + (p.maxStreak || 0)) / 8)],
  ];
  const gpa = subjects.reduce((a, s) => a + LETTERS.indexOf(s[1]), 0) / subjects.length / 10;
  const overall = letterFor(gpa);
  const NOTE = { 'A+': 'Suspiciously professional. Did you use AI?', A: "Solid work. I'd still grade your fridge a C-.", 'A-': 'So close to perfect. So close.', 'B+': "Not bad. Not A-plus. But not bad.", B: 'Respectable. Your couch is proud of you.', 'B-': 'Showed up. Tagged some. Okay.', 'C+': 'Average. Like a Might Be Castle burger.', C: 'Mid. Extremely mid.', 'C-': 'You were there. Technically.', D: 'See me after class.', F: 'F. Even your room got a higher grade.' };
  const stats = `${p.tags} tags \u2022 tagged ${p.tagged}x \u2022 ${Math.round(acc * 100)}% aim \u2022 best streak ${p.maxStreak || 0}`;
  return { name: CHARS[p.kind].name, kind: p.kind, subjects, overall, note: NOTE[overall], gpa: (gpa * 4).toFixed(1), stats };
}
function liveGrade(p) { return reportCard(p, Math.max(0.5, (G.t || 0) / 60)).overall; }
function renderReportCard(el, rc) {
  el.innerHTML = `<div class="rc"><div class="rc-head"><img src="assets/brokepilot_tok.png" alt=""><div><b>REPORT CARD</b><small>Graded by BROKE-pilot</small></div><div class="rc-grade">${rc.overall}</div></div>
    <div class="rc-rows">${rc.subjects.map(([k, v]) => `<span>${k}</span><b class="g${v[0]}">${v}</b>`).join('')}</div>
    <div class="rc-note">"${rc.note}"</div><div class="rc-foot">${rc.name} &bull; GPA ${rc.gpa} &bull; ${rc.stats}</div></div>`;
}
function reportCardPNG(rc) {             // a 1080x1350 image for sharing
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 1350); bg.addColorStop(0, '#1c0f33'); bg.addColorStop(1, '#0b0812'); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = '#fffaf0'; g.fillRect(90, 150, 900, 1040); g.strokeStyle = '#6e24c8'; g.lineWidth = 10; g.strokeRect(90, 150, 900, 1040);
  g.strokeStyle = 'rgba(80,120,220,0.25)'; g.lineWidth = 2; for (let y = 330; y < 1180; y += 56) { g.beginPath(); g.moveTo(110, y); g.lineTo(970, y); g.stroke(); }
  if (IMG.title && IMG.title.complete && IMG.title.width) { const k = Math.min(300 / IMG.title.width, 135 / IMG.title.height); g.drawImage(IMG.title, 540 - IMG.title.width * k / 2, 8, IMG.title.width * k, IMG.title.height * k); }
  g.fillStyle = '#1c0f33'; g.font = '72px Anton, Impact'; g.textAlign = 'left'; g.fillText('REPORT CARD', 140, 270);
  g.font = 'bold 30px Poppins, sans-serif'; g.fillStyle = '#6a5a80'; g.fillText('Graded by BROKE-pilot  •  ' + rc.name, 140, 316);
  g.font = '190px Anton, Impact'; g.textAlign = 'center'; g.fillStyle = rc.overall[0] === 'A' ? '#1aa88a' : rc.overall[0] === 'F' || rc.overall[0] === 'D' ? '#e0283a' : '#e08a1a';
  g.save(); g.translate(830, 300); g.rotate(-0.12); g.fillText(rc.overall, 0, 60); g.strokeStyle = g.fillStyle; g.lineWidth = 8; g.strokeRect(-110, -110, 220, 210); g.restore();
  g.textAlign = 'left';
  rc.subjects.forEach(([k, v], i) => { const y = 470 + i * 112; g.font = '52px Anton, Impact'; g.fillStyle = '#1c0f33'; g.fillText(k, 150, y); g.textAlign = 'right'; g.fillStyle = v[0] === 'A' ? '#1aa88a' : v[0] === 'F' || v[0] === 'D' ? '#e0283a' : '#e08a1a'; g.fillText(v, 930, y); g.textAlign = 'left'; });
  g.font = 'italic bold 38px Poppins, sans-serif'; g.fillStyle = '#6e24c8'; fillWrapped(g, '"' + rc.note + '"', 150, 1010, 780, 48);
  g.font = 'bold 30px Poppins, sans-serif'; g.fillStyle = '#1c0f33'; g.fillText(rc.stats, 150, 1140);
  g.font = 'bold 28px Poppins, sans-serif'; g.fillStyle = '#ffd60a'; g.textAlign = 'center'; g.fillText('PERCI SHORTI LASER TAG  •  zevsocialconnect.com/perci-game', 540, 1270);
  return c;
}
function fillWrapped(g, text, x, y, w, lh) { let line = ''; for (const word of text.split(' ')) { const test = line ? line + ' ' + word : word; if (g.measureText(test).width > w && line) { g.fillText(line, x, y); line = word; y += lh; } else line = test; } if (line) g.fillText(line, x, y); }
async function shareReportCard(rc) {
  const c = reportCardPNG(rc);
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  const file = new File([blob], 'perci-report-card.png', { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'My Perci Shorti report card', text: `BROKE-pilot gave me a ${rc.overall}. #PerciShorti` }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'perci-report-card.png'; document.body.appendChild(a); a.click(); a.remove();
}
let lastCard = null;

/* =====================================================================================================
   PROGRESSION: wider view, weapons, character levels, ZEV Coins, the store and the coin checkout.
   Coins, levels and owned items live on the device (localStorage 'ps_prog_v1'). When payments are set up
   (window.ZEV_PAY in index.html, see PAYMENTS_SETUP.md) the player gets a quiet sign-in and the coin balance
   and owned items also live in Supabase, so bought coins are never lost and can't be faked.
   ===================================================================================================== */
const VIEW = { normal: 1, wide: 0.8, widest: 0.66 };
let viewMode = localStorage.getItem('ps_view') || 'wide';

const WEAPONS = {
  blaster: { name: 'OWN BLASTER', desc: "Your fighter's own blaster. Balanced.", lvl: 1, mods: {} },
  buzz:    { name: 'BUZZ SMG', desc: 'Sprays fast. Shorter reach.', lvl: 3, mods: { rate: 0.55, range: 0.75, spread: 0.07 } },
  scatter: { name: 'SCATTER GUN', desc: '5 lasers at once. Up close.', lvl: 6, mods: { rate: 2.3, range: 0.55, pellets: 5, cone: 0.34 } },
  bounce:  { name: 'BOUNCE LAUNCHER', desc: 'Shots bounce off 2 extra walls.', lvl: 10, mods: { rate: 1.15, bounce: 2 } },
  beam:    { name: 'BEAM RIFLE', desc: 'Long range. 2 damage. Slow.', lvl: 15, mods: { rate: 2.5, range: 1.6, dmg: 2, spreadSet: 0, beam: true } },
  gold:    { name: "PERCI'S GOLD BLASTER", desc: 'From Episode 2. 2 damage, fast, accurate.', store: true, mods: { rate: 0.75, range: 1.15, dmg: 2, spreadMul: 0.5, shot: '#ffd60a' } },
};
const WEAPON_ORDER = ['blaster', 'buzz', 'scatter', 'bounce', 'beam', 'gold'];
const STORE_OPEN_AT = '2027-01-07T18:00:00-06:00';    // one week after the official release
const STORE_ITEMS = {
  gold:    { name: "PERCI'S GOLD BLASTER", desc: '2 damage, fast and accurate. Every fighter can use it.', cost: 2500, usd: '4.99', icon: '🔫', once: true },
  armor:   { name: 'ARMOR PLATING', desc: '+1 max shield for your fighter. Up to 2 per fighter.', cost: 1200, usd: '2.49', icon: '🛡️', perChar: true, max: 2 },
  core:    { name: 'POWER CORE', desc: 'Powers recharge 25% faster. All fighters.', cost: 1500, usd: '2.99', icon: '⚡', once: true },
  over:    { name: 'OVERCLOCK SHOES', desc: 'Move 8% faster. All fighters.', cost: 1500, usd: '2.99', icon: '👟', once: true },
  starter: { name: 'SPAWN SHIELD+', desc: 'Spawn with 2 extra seconds of shield. All fighters.', cost: 800, usd: '1.99', icon: '✨', once: true },
  xp2:     { name: 'DOUBLE XP', desc: 'Double XP for your next 5 matches or chapters.', cost: 400, usd: '0.99', icon: '⏫', uses: 5 },
  lvl:     { name: 'LEVEL SKIP', desc: 'Your fighter jumps up 1 level right now.', cost: 900, usd: '1.99', icon: '🆙', perChar: true },
};
const STORE_ORDER = ['gold', 'armor', 'core', 'over', 'starter', 'xp2', 'lvl'];
const COIN_PACKS = [
  { id: 'c500', coins: 500, usd: '0.99' },
  { id: 'c2800', coins: 2800, usd: '4.99', tag: '+12%' },
  { id: 'c6000', coins: 6000, usd: '9.99', tag: '+20%' },
  { id: 'c13500', coins: 13500, usd: '19.99', tag: 'BEST +35%' },
];
const MAX_LVL = 30;
const xpToNext = (lvl) => 150 + 50 * lvl;

/* ----- saved progress ----- */
function loadProg() {
  let p = {}; try { p = JSON.parse(localStorage.getItem('ps_prog_v1') || '{}'); } catch (e) { p = {}; }
  p.coins = p.coins | 0; p.chars = p.chars || {}; p.owned = p.owned || {}; p.weapon = WEAPONS[p.weapon] ? p.weapon : 'blaster'; p.xp2 = p.xp2 | 0;
  for (const k of ORDER) p.chars[k] = Object.assign({ lvl: 1, xp: 0, armor: 0 }, p.chars[k]);
  return p;
}
let PROG = loadProg();
function saveProg() { localStorage.setItem('ps_prog_v1', JSON.stringify(PROG)); syncCoinChips(); }
const topLevel = () => Math.max(...ORDER.map((k) => PROG.chars[k].lvl));
const weaponOpen = (w) => WEAPONS[w].store ? !!PROG.owned[w] : topLevel() >= WEAPONS[w].lvl;
function storeOpen() { const owner = localStorage.getItem('ps_preview') === PREVIEW_KEY; return owner || Date.now() >= new Date(STORE_OPEN_AT).getTime(); }

/* ----- loadout: weapon + level perks + store upgrades, applied to a human player's fighter ----- */
function myLoadout(kind) {
  const c = PROG.chars[kind] || { lvl: 1, armor: 0 };
  return { w: weaponOpen(PROG.weapon) ? PROG.weapon : 'blaster', lvl: c.lvl, armor: c.armor | 0, core: PROG.owned.core ? 1 : 0, over: PROG.owned.over ? 1 : 0, starter: PROG.owned.starter ? 1 : 0 };
}
function cleanLoadout(lo) {   // loadouts that come from other players online
  lo = lo || {};
  return { w: WEAPONS[lo.w] ? lo.w : 'blaster', lvl: clamp(lo.lvl | 0, 1, MAX_LVL), armor: clamp(lo.armor | 0, 0, 2), core: lo.core ? 1 : 0, over: lo.over ? 1 : 0, starter: lo.starter ? 1 : 0 };
}
function applyLoadout(e, lo) {
  if (!e || e.kind === 'bot') return;
  lo = cleanLoadout(lo);
  const base = CHARS[e.kind], m = WEAPONS[lo.w].mods, s = Object.assign({}, base);
  if (m.rate) s.rate = base.rate * m.rate;
  if (m.range) s.range = base.range * m.range;
  if (m.dmg) s.dmg = Math.max(base.dmg, m.dmg);
  if (m.spread) s.spread = base.spread + m.spread;
  if (m.spreadMul) s.spread = base.spread * m.spreadMul;
  if (m.spreadSet !== undefined) s.spread = m.spreadSet;
  if (m.shot) s.shot = m.shot;
  s.pellets = m.pellets || 1; s.cone = m.cone || 0;
  s.bounce = (base.bounce ? 1 : 0) + (m.bounce || 0);
  s.beam = !!m.beam || e.kind === 'chatgpt';
  s.speed = base.speed * (1 + Math.min(0.15, (lo.lvl - 1) * 0.005)) * (lo.over ? 1.08 : 1);
  s.cdMul = (1 - Math.min(0.25, (lo.lvl - 1) * 0.01)) * (lo.core ? 0.75 : 1);
  const hp = base.hp + Math.floor(lo.lvl / 10) + lo.armor;
  e.stats = s; e.hp = e.maxhp = hp; e.weapon = lo.w; e.level = lo.lvl; e.spawnShield = lo.starter ? 2 : 0; e.lo = lo;
}

/* ----- rewards: XP and coins at the end of a match or chapter ----- */
function award(p, o) {
  const xpMul = PROG.xp2 > 0 ? 2 : 1;
  const xp = Math.round((p.tags * 25 + (o.won ? 150 : 40) + (p.picks || 0) * 10 + (o.cleared ? 200 : 0) + (o.stars || 0) * 50) * xpMul * (o.diffMul || 1));
  const coins = Math.round((p.tags * 5 + (o.won ? 40 : 10) + (o.cleared ? 60 : 0) + (o.stars || 0) * 20) * (o.diffMul || 1));
  if (PROG.xp2 > 0) PROG.xp2--;
  const c = PROG.chars[p.kind]; if (!c) return null;
  const from = c.lvl; c.xp += xp;
  while (c.lvl < MAX_LVL && c.xp >= xpToNext(c.lvl)) { c.xp -= xpToNext(c.lvl); c.lvl++; }
  if (c.lvl >= MAX_LVL) c.xp = 0;
  PROG.coins += coins; saveProg(); walletEarn(coins);
  return { xp, coins, from, to: c.lvl, kind: p.kind, xp2: xpMul > 1 };
}
function rewardsHTML(r) {
  if (!r) return '';
  const c = PROG.chars[r.kind], pct = c.lvl >= MAX_LVL ? 100 : Math.round(100 * c.xp / xpToNext(c.lvl));
  const unlocked = WEAPON_ORDER.filter((w) => !WEAPONS[w].store && WEAPONS[w].lvl > r.from && WEAPONS[w].lvl <= r.to);
  return `<div class="rewards"><span>+${r.xp} XP${r.xp2 ? ' (2x)' : ''}</span><span class="coin">+${r.coins}</span>
    <div class="lvl"><b>${CHARS[r.kind].name} LV ${c.lvl}</b><div class="xpbar"><i style="width:${pct}%"></i></div></div>
    ${r.to > r.from ? `<div class="lvup">LEVEL UP! ${r.from} &rarr; ${r.to}${unlocked.length ? ' &bull; NEW WEAPON: ' + unlocked.map((w) => WEAPONS[w].name).join(', ') : ''}</div>` : ''}</div>`;
}

/* ----- weapon picker (quick match + online) ----- */
function weaponRow(el) {
  el.innerHTML = WEAPON_ORDER.map((w) => { const W = WEAPONS[w], open = weaponOpen(w);
    return `<button class="wpn ${PROG.weapon === w ? 'sel' : ''} ${open ? '' : 'locked'}" data-w="${w}"><b>${W.name}</b><small>${open ? W.desc : W.store ? 'STORE' : 'LV ' + W.lvl}</small></button>`; }).join('');
  el.querySelectorAll('.wpn').forEach((b) => b.onclick = () => { const w = b.dataset.w; if (!weaponOpen(w)) { SFX.hit(); banner(WEAPONS[w].store ? 'GET IT IN THE STORE' : 'REACH LV ' + WEAPONS[w].lvl); return; } PROG.weapon = w; saveProg(); SFX.pick(); weaponRow(el); });
}
function levelBadge(k) { const c = PROG.chars[k]; const pct = c.lvl >= MAX_LVL ? 100 : Math.round(100 * c.xp / xpToNext(c.lvl)); return `<div class="lvchip">LV ${c.lvl}<i style="width:${pct}%"></i></div>`; }

/* ----- coin chips (title + store) ----- */
function syncCoinChips() { document.querySelectorAll('.coinChip').forEach((el) => (el.textContent = PROG.coins.toLocaleString())); }

/* ----- store ----- */
function ownedCount(id, kind) { if (STORE_ITEMS[id].perChar) return id === 'armor' ? PROG.chars[kind].armor : 0; if (id === 'xp2') return PROG.xp2; return PROG.owned[id] ? 1 : 0; }
function canBuy(id, kind) { const it = STORE_ITEMS[id]; if (it.once && PROG.owned[id]) return false; if (id === 'armor' && PROG.chars[kind].armor >= it.max) return false; if (id === 'lvl' && PROG.chars[kind].lvl >= MAX_LVL) return false; return true; }
let storeKind = pick;
function renderStore() {
  const open = storeOpen();
  $('storeLock').style.display = open ? 'none' : '';
  $('storeBody').style.display = open ? '' : 'none';
  if (!open) { const t = new Date(STORE_OPEN_AT); $('storeWhen').textContent = t.toLocaleString([], { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); return; }
  tokRow($('storeChars'), storeKind, (k) => { storeKind = k; SFX.pick(); renderStore(); });
  $('storeItems').innerHTML = STORE_ORDER.map((id) => { const it = STORE_ITEMS[id], ok = canBuy(id, storeKind), n = ownedCount(id, storeKind);
    const own = it.once && PROG.owned[id] ? 'OWNED' : id === 'armor' ? `${n}/${it.max} on ${CHARS[storeKind].name}` : id === 'xp2' && n ? `${n} left` : id === 'lvl' ? `${CHARS[storeKind].name} LV ${PROG.chars[storeKind].lvl}` : '';
    return `<div class="item"><div class="ic">${it.icon}</div><div class="tx"><b>${it.name}</b><small>${it.desc}</small>${own ? `<em>${own}</em>` : ''}</div>
      <button class="btn small buy" data-id="${id}" ${ok ? '' : 'disabled'}><span class="coin">${it.cost.toLocaleString()}</span><small>or $${it.usd}</small></button></div>`; }).join('');
  $('storeItems').querySelectorAll('.buy').forEach((b) => b.onclick = () => openCheckout({ type: 'item', id: b.dataset.id, kind: storeKind }));
  $('packs').innerHTML = COIN_PACKS.map((p) => `<button class="pack" data-id="${p.id}">${p.tag ? `<i>${p.tag}</i>` : ''}<b class="coin">${p.coins.toLocaleString()}</b><span>$${p.usd}</span></button>`).join('');
  $('packs').querySelectorAll('.pack').forEach((b) => b.onclick = () => openCheckout(Object.assign({ type: 'pack' }, COIN_PACKS.find((p) => p.id === b.dataset.id))));
  syncCoinChips();
}
async function buyItem(id, kind) {
  const it = STORE_ITEMS[id];
  if (!canBuy(id, kind)) return;
  if (PROG.coins < it.cost) { SFX.hit(); storeMsg('Not enough coins. Grab a coin pack below.'); return false; }
  if (PAY.ready()) {   // signed in: the server checks the balance and records the item
    const r = await PAY.rpc('zev_spend', { p_item: id, p_char: kind });
    if (!r || r.error) { storeMsg(r && r.error ? r.error : "Couldn't reach the store. Try again."); return false; }
    PROG.coins = r.coins;
  } else PROG.coins -= it.cost;
  grantItem(id, kind);
  saveProg(); SFX.power(); storeMsg('Got it: ' + it.name); renderStore();
  return true;
}
function grantItem(id, kind) {
  if (id === 'armor') PROG.chars[kind].armor = Math.min(2, PROG.chars[kind].armor + 1);
  else if (id === 'xp2') PROG.xp2 += STORE_ITEMS.xp2.uses;
  else if (id === 'lvl') { const c = PROG.chars[kind]; if (c.lvl < MAX_LVL) { c.lvl++; c.xp = 0; } }
  else PROG.owned[id] = true;
  if (id === 'gold') PROG.weapon = 'gold';
}
function storeMsg(t) { $('storeMsg').textContent = t; clearTimeout(storeMsg.t); storeMsg.t = setTimeout(() => ($('storeMsg').textContent = ''), 3500); }

/* ----- payments: Stripe checkout in a game window, coins credited by the server after payment ----- */
const PAY = {
  cfg: () => window.ZEV_PAY || {},
  configured() { const c = this.cfg(); return !!(c.stripeKey && c.functionsUrl && LEADERBOARD.url); },
  session: null,
  ready() { return this.configured() && !!this.session; },
  async auth() {                       // quiet sign-in (Supabase anonymous user) so purchases follow the player
    if (!this.configured()) return null;
    try { this.session = JSON.parse(localStorage.getItem('ps_auth') || 'null'); } catch (e) { this.session = null; }
    const now = Date.now() / 1000;
    if (this.session && this.session.expires_at > now + 60) return this.session;
    const url = LEADERBOARD.url + '/auth/v1/' + (this.session ? 'token?grant_type=refresh_token' : 'signup');
    const body = this.session ? { refresh_token: this.session.refresh_token } : { data: { game: 'perci' } };
    const r = await fetch(url, { method: 'POST', headers: { apikey: LEADERBOARD.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    if (!r || !r.ok) { this.session = null; return null; }
    const j = await r.json(); this.session = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || now + (j.expires_in || 3600), user: j.user && j.user.id };
    localStorage.setItem('ps_auth', JSON.stringify(this.session)); return this.session;
  },
  async rpc(fn, args) {
    if (!(await this.auth())) return null;
    const r = await fetch(LEADERBOARD.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: LEADERBOARD.anonKey, Authorization: 'Bearer ' + this.session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) }).catch(() => null);
    if (!r) return null; const j = await r.json().catch(() => null); return r.ok ? j : { error: (j && j.message) || 'Store error' };
  },
  async wallet() { return this.rpc('zev_wallet', {}); },
};
async function walletSync() {              // server is the source of truth for coins and owned items once signed in
  if (!PAY.configured()) return;
  const w = await PAY.wallet(); if (!w || w.error) return;
  PROG.coins = w.coins;
  for (const row of w.owned || []) { if (row.item === 'armor' && PROG.chars[row.char]) PROG.chars[row.char].armor = Math.max(PROG.chars[row.char].armor, row.qty); else if (STORE_ITEMS[row.item] && STORE_ITEMS[row.item].once) PROG.owned[row.item] = true; }
  for (const g of w.pending || []) grantItem(g.item, g.char || pick);   // xp boosts and level skips bought with money
  if ((w.pending || []).length) PAY.rpc('zev_claim', {});
  saveProg();
}
async function walletEarn(coins) { if (PAY.ready() && coins > 0) { const r = await PAY.rpc('zev_earn', { p_amount: coins }); if (r && !r.error && typeof r.coins === 'number') { PROG.coins = r.coins; saveProg(); } } }
let STRIPE = null, ELEMENTS = null, payWhat = null, payWay = 'coins';
function loadStripeJs() { return new Promise((res, rej) => { if (window.Stripe) return res(); const s = document.createElement('script'); s.src = 'https://js.stripe.com/v3/'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
// what = { type: 'pack', id, coins, usd } or { type: 'item', id, kind }
function openCheckout(what) {
  payWhat = what; ELEMENTS = null;
  const item = what.type === 'item' ? STORE_ITEMS[what.id] : null;
  $('payPack').innerHTML = item ? `<b>${item.icon} ${item.name}</b>${item.perChar ? ` <small>for ${CHARS[what.kind].name}</small>` : ''}`
                                : `<b class="coin">${what.coins.toLocaleString()}</b> ZEV COINS`;
  // payment choices: ZEV Coins (items only) and money (card, Apple Pay, Google Pay, Cash App, PayPal, Link)
  const opts = [];
  if (item) opts.push({ k: 'coins', html: `<b>ZEV COINS</b><span class="coin">${item.cost.toLocaleString()}</span><small>You have ${PROG.coins.toLocaleString()}</small>`, off: PROG.coins < item.cost });
  opts.push({ k: 'money', html: `<b>CARD &bull; APPLE PAY &bull; GOOGLE PAY &bull; CASH APP &bull; PAYPAL</b><span>$${item ? item.usd : what.usd}</span><small>${PAY.configured() ? 'Secure checkout by Stripe' : 'Not switched on yet'}</small>`, off: !PAY.configured() });
  payWay = item && PROG.coins >= item.cost ? 'coins' : 'money';
  $('payWays').innerHTML = opts.map((o) => `<button class="way ${o.k === payWay ? 'sel' : ''} ${o.off ? 'off' : ''}" data-k="${o.k}">${o.html}</button>`).join('');
  $('payWays').querySelectorAll('.way').forEach((b) => b.onclick = () => { payWay = b.dataset.k; $('payWays').querySelectorAll('.way').forEach((x) => x.classList.toggle('sel', x === b)); syncPayWay(); });
  $('payModal').classList.add('on'); syncPayWay();
}
async function syncPayWay() {
  const item = payWhat.type === 'item' ? STORE_ITEMS[payWhat.id] : null;
  $('payEl').innerHTML = ''; $('payMsg').textContent = '';
  if (payWay === 'coins') {
    const ok = PROG.coins >= item.cost;
    $('bPayNow').textContent = `PAY ${item.cost.toLocaleString()} COINS`; $('bPayNow').disabled = !ok;
    if (!ok) $('payMsg').textContent = `You need ${(item.cost - PROG.coins).toLocaleString()} more coins. Pay with money, or grab a coin pack.`;
    return;
  }
  $('bPayNow').textContent = 'PAY $' + (item ? item.usd : payWhat.usd); $('bPayNow').disabled = true;
  if (!PAY.configured()) { $('payMsg').textContent = "Money payments aren't switched on yet."; return; }
  $('payMsg').textContent = 'Loading secure checkout...';
  try {
    await loadStripeJs(); if (!(await PAY.auth())) throw new Error('sign-in');
    const body = payWhat.type === 'pack' ? { pack: payWhat.id } : { item: payWhat.id, char: payWhat.kind };
    const r = await fetch(PAY.cfg().functionsUrl + '/zev-pay', { method: 'POST', headers: { apikey: LEADERBOARD.anonKey, Authorization: 'Bearer ' + PAY.session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json(); if (!r.ok || !j.clientSecret) throw new Error(j.error || 'checkout');
    if (payWay !== 'money') return;
    STRIPE = STRIPE || window.Stripe(PAY.cfg().stripeKey);
    ELEMENTS = STRIPE.elements({ clientSecret: j.clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#ffd60a', colorBackground: '#1c1729', fontFamily: 'Poppins, sans-serif', borderRadius: '10px' } } });
    ELEMENTS.create('payment', { layout: { type: 'accordion', defaultCollapsed: false, radios: true, spacedAccordionItems: true }, wallets: { applePay: 'auto', googlePay: 'auto' } }).mount('#payEl');
    $('payMsg').textContent = ''; $('bPayNow').disabled = false;
  } catch (e) { $('payMsg').textContent = "Couldn't open checkout. Check your connection and try again."; }
}
async function payNow() {
  if (payWay === 'coins') {
    $('bPayNow').disabled = true;
    const ok = await buyItem(payWhat.id, payWhat.kind);
    $('payMsg').textContent = ok ? 'Paid with ZEV Coins. Enjoy!' : $('storeMsg').textContent || 'Not enough coins.';
    if (ok) setTimeout(() => $('payModal').classList.remove('on'), 900); else $('bPayNow').disabled = false;
    return;
  }
  if (!STRIPE || !ELEMENTS) return;
  $('bPayNow').disabled = true; $('payMsg').textContent = 'Processing...';
  const before = JSON.stringify([PROG.coins, PROG.owned, PROG.chars, PROG.xp2]);
  const { error } = await STRIPE.confirmPayment({ elements: ELEMENTS, confirmParams: { return_url: location.origin + location.pathname + '?paid=1' }, redirect: 'if_required' });
  if (error) { $('payMsg').textContent = error.message || 'Payment failed.'; $('bPayNow').disabled = false; return; }
  $('payMsg').textContent = 'Paid! Delivering...';
  for (let i = 0; i < 15; i++) { await new Promise((r) => setTimeout(r, 1500)); await walletSync(); if (JSON.stringify([PROG.coins, PROG.owned, PROG.chars, PROG.xp2]) !== before) break; }
  $('payMsg').textContent = JSON.stringify([PROG.coins, PROG.owned, PROG.chars, PROG.xp2]) !== before ? 'Delivered! Thanks for supporting Perci Shorti.' : 'Payment went through. It will show up in a minute.';
  SFX.power(); renderStore();
}
$('bPayNow').onclick = payNow;
$('bPayClose').onclick = () => { $('payModal').classList.remove('on'); ELEMENTS = null; };
$('bStore').onclick = () => { ac(); storeKind = pick; renderStore(); showScreen('sStore'); walletSync().then(() => storeOpen() && renderStore()); };
$('bStoreBack').onclick = () => showScreen('sTitle');
document.querySelectorAll('#setView button').forEach((b) => { b.classList.toggle('sel', b.dataset.v === viewMode); b.onclick = () => { viewMode = b.dataset.v; localStorage.setItem('ps_view', viewMode); document.querySelectorAll('#setView button').forEach((x) => x.classList.toggle('sel', x === b)); resize(); }; });
if (new URLSearchParams(location.search).get('paid')) setTimeout(() => walletSync(), 1500);
syncCoinChips();


function drawLeaf(g, x, y, s, col) {
  g.save(); g.translate(x, y); g.fillStyle = col;
  const parts = [[-90, 1], [-55, 0.82], [-125, 0.82], [-22, 0.6], [-158, 0.6], [10, 0.38], [-190, 0.38]];
  for (const [deg, len] of parts) { g.save(); g.rotate(deg * Math.PI / 180); g.beginPath(); g.ellipse(s * len * 0.55, 0, s * len * 0.55, s * 0.16, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.strokeStyle = col; g.lineWidth = Math.max(1.5, s * 0.12); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, s * 0.55); g.stroke();
  g.restore();
}
function drawBurger(g, x, y, s) {
  g.save(); g.translate(x, y);
  g.fillStyle = '#e8a04a'; g.beginPath(); g.ellipse(0, -s * 0.25, s * 0.75, s * 0.42, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#5fd35a'; g.fillRect(-s * 0.78, -s * 0.22, s * 1.56, s * 0.14);
  g.fillStyle = '#ffd60a'; g.fillRect(-s * 0.72, -s * 0.1, s * 1.44, s * 0.12);
  g.fillStyle = '#6b3a1e'; g.fillRect(-s * 0.74, 0.02 * s, s * 1.48, s * 0.22);
  g.fillStyle = '#e8a04a'; g.beginPath(); g.ellipse(0, s * 0.26, s * 0.72, s * 0.16, 0, 0, Math.PI); g.fill();
  g.fillStyle = '#fff6'; for (const sx of [-0.3, 0, 0.3]) g.fillRect(sx * s, -s * 0.5, s * 0.08, s * 0.05);
  g.restore();
}

function makeBoss() {
  const e = newEntity('B', 'bot', 2, false);
  Object.assign(e, { boss: true, name: 'BROKE-PILOT PRIME', r: 34, hp: 30, maxhp: 30,
    stats: { speed: 150, rate: 0.2, dmg: 1, range: 680, spread: 0.13, shot: '#ff3040', body: '#ff3040' } });
  return e;
}

function startStoryLevel(ch) {
  storyDiffSave = diff; diff = ch.diff;
  loadArena(ch.arena);
  const P = [newEntity('P', 'perci', 2, true)].concat(ch.crew.map((k, i) => newEntity('P', k, [1, 3, 0, 4][i], false)));
  const order = [2, 1, 3, 0, 4], B = [];
  for (let i = 0; i < ch.bots; i++) B.push(newEntity('B', 'bot', order[i], false));
  if (ch.boss) B.push(makeBoss());
  pendingStory = ch;
  beginMatch(P.concat(B), P[0]);
}
function storyBegin() {           // called by beginMatch once G exists
  G.story = pendingStory; pendingStory = null; document.body.classList.remove('story');
  if (!G.story) return;
  G.time = G.story.time; G.boss = G.ents.find((e) => e.boss) || null; G.haze = 0;
  document.body.classList.add('story');
  $('feed').innerHTML = '';
  feed(`Chapter ${G.story.id}: ${G.story.place}`); feed('Goal: ' + G.story.goal.text);
  banner('CHAPTER ' + G.story.id);
}
function storyCheck() {
  const ch = G.story, p = G.player;
  if (G.pushWin === 'B') return 'lose';
  if (G.pushWin === 'P' && ch.goal.type !== 'boss') return 'win';
  if (ch.goal.type === 'tags' && G.score.P >= ch.goal.n) return 'win';
  if (ch.goal.type === 'boss' && G.boss && G.boss.dead > 0) return 'win';
  if (ch.goal.lives && p.tagged >= ch.goal.lives) return 'lose';
  return null;
}
function storyTimeUp() {
  const ch = G.story;
  if (ch.goal.type === 'survive') return 'win';
  if (ch.goal.type === 'win') return G.score.P > G.score.B ? 'win' : 'lose';
  return 'lose';
}
function goalText() {
  const ch = G.story, p = G.player, s = Math.max(0, Math.ceil(G.time)), clock = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  if (ch.goal.type === 'tags') return `🎯 ${G.score.P}/${ch.goal.n} TAGS`;
  if (ch.goal.type === 'survive') return `⏱ SURVIVE ${clock} • ❤ ${Math.max(0, ch.goal.lives - p.tagged)}`;
  if (ch.goal.type === 'boss') return `👑 PRIME ${G.boss ? Math.max(0, G.boss.hp) : 0}/${G.boss ? G.boss.maxhp : 30}`;
  return `⚔ OUT-TAG THEM • ${G.score.P}-${G.score.B}`;
}
function storyFinish(r) {
  const ch = G.story, p = G.player, won = r === 'win';
  state = 'storyend'; $('hud').classList.remove('on'); document.body.classList.remove('playing', 'story');
  if (storyDiffSave) { diff = storyDiffSave; storyDiffSave = null; }
  let stars = 0;
  if (won) {
    stars = 1; if (p.tagged <= 2) stars++;
    if (ch.goal.type === 'survive' ? p.tagged === 0 : G.time >= 30) stars++;
    storyProg.stars[ch.id] = Math.max(storyProg.stars[ch.id] || 0, stars);
    storyProg.unlocked = Math.max(storyProg.unlocked, Math.min(CHAPTERS.length, ch.id + 1));
    if (ch.id === CHAPTERS.length) storyProg.done = true;
    saveStory();
  }
  storyLast = { ch, won, stars, tags: p.tags, tagged: p.tagged, time: Math.ceil(G.time) };
  lastCard = reportCard(p, (ch.time - G.time) / 60);
  storyLast.rewards = award(p, { won, cleared: won, stars });
  (won ? SFX.win : SFX.lose)();
  if (won) wipe(() => playCut(ch.outro, () => wipe(showStoryEnd)));
  else wipe(showStoryEnd);
}
function showStoryEnd() {
  const r = storyLast, ch = r.ch;
  $('seTitle').textContent = r.won ? 'CHAPTER CLEAR!' : (ch.goal.type === 'survive' ? 'TAGGED OUT' : "TIME'S UP");
  $('seTitle').className = 'big ' + (r.won ? 'win' : 'lose');
  $('seSub').textContent = `Chapter ${ch.id}: "${ch.title}" • ${ch.place}`;
  $('seStars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= r.stars ? 'on' : ''}">★</span>`).join('');
  $('seKV').innerHTML = `<span>Goal</span><b>${ch.goal.text}</b><span>Your tags</span><b>${r.tags}</b><span>Times tagged</span><b>${r.tagged}</b>` + (r.won ? `<span>Time left</span><b>${Math.floor(r.time / 60)}:${String(r.time % 60).padStart(2, '0')}</b>` : '');
  $('seTip').textContent = r.won ? (r.stars < 3 ? 'Stars: clear it • get tagged 2 times or less • ' + (ch.goal.type === 'survive' ? 'never get tagged' : 'finish with 30+ seconds left') : 'Perfect run. Three stars.') : 'Tip: save your item slots for when it gets hot.';
  renderReportCard($('seCard'), lastCard);
  $('seRewards').innerHTML = rewardsHTML(storyLast.rewards);
  const next = CHAPTERS[ch.id];
  $('bSeNext').style.display = r.won && next ? '' : 'none';
  $('bSeNext').textContent = next ? `NEXT: CHAPTER ${next.id}` : '';
  $('bSeRetry').textContent = r.won ? 'REPLAY' : 'TRY AGAIN';
  showScreen('sStoryEnd'); state = 'storyend';
}
function playChapter(id) {
  const ch = CHAPTERS[id - 1]; if (!ch) return;
  storyCh = ch; ac();
  wipe(() => playCut(ch.intro, () => wipe(() => startStoryLevel(ch))));
}

/* ----- cutscene player ("epic shorts") ----- */
const CUT = { shots: null, i: 0, li: 0, chars: 0, hold: 0, t: 0, done: null, smoke: [], flash: 0 };
const SPEAKER = {
  perci: { name: 'PERCI', img: 'perci', col: '#ffd60a' }, chatgpt: { name: 'CHATGPT', img: 'chatgpt', col: '#00e6ff' },
  miracle: { name: 'MIRACLE', img: 'miracle', col: '#3fe0d8' }, jessica: { name: 'JESSICA', img: 'jessica', col: '#7cff6b' },
  mixi: { name: 'MIXI', img: 'mixi', col: '#ff78c8' }, broke: { name: 'BROKE-PILOT', img: 'brokepilot', col: '#ff8c28' }, phone: { name: 'CHATGPT (TEXT)', img: 'chatgpt', col: '#00e6ff' },
};
function playCut(shots, done) {
  shots = cleanShots(shots);
  Object.assign(CUT, { shots, i: 0, li: 0, chars: 0, hold: 0, t: 0, done, smoke: [], flash: 0 });
  showScreen(null); state = 'cut';
  document.body.classList.add('playing', 'cutting'); $('hud').classList.remove('on');
  cutEnterShot();
}
function cutEnterShot() {
  const s = CUT.shots[CUT.i]; CUT.li = 0; CUT.chars = 0; CUT.hold = 0; CUT.t = 0;
  if (s && s.fx && s.fx.flash) CUT.flash = 1;
  if (s && s.fx && (s.fx.shake || s.fx.alert)) buzz(40);
  if (s && s.cap) SFX.power();
}
function cutNext() {
  CUT.i++;
  if (CUT.i >= CUT.shots.length) { const d = CUT.done; CUT.shots = null; document.body.classList.remove('cutting'); state = 'menu'; if (d) d(); return; }
  cutEnterShot();
}
function cutTap() {
  if (state !== 'cut' || !CUT.shots) return;
  const s = CUT.shots[CUT.i], line = s.lines && s.lines[CUT.li];
  if (line && CUT.chars < line[1].length) { CUT.chars = line[1].length; return; }
  if (s.lines && CUT.li < s.lines.length - 1) { CUT.li++; CUT.chars = 0; CUT.hold = 0; SFX.pick(); return; }
  cutNext();
}
function cutSkip() { if (state !== 'cut' || !CUT.shots) return; CUT.i = CUT.shots.length - 1; cutNext(); }
function cutStep(dt) {
  if (!CUT.shots) return;
  const s = CUT.shots[CUT.i]; CUT.t += dt; CUT.flash = Math.max(0, CUT.flash - dt * 1.6);
  if (s.lines && s.lines.length) {
    const line = s.lines[CUT.li];
    if (CUT.chars < line[1].length) { const before = Math.floor(CUT.chars); CUT.chars = Math.min(line[1].length, CUT.chars + dt * 38); if (Math.floor(CUT.chars) !== before && Math.floor(CUT.chars) % 3 === 0) beep(900 + Math.random() * 300, 700, 0.025, 'square', 0.012); }
    else { CUT.hold += dt; if (CUT.hold > 2.6) { if (CUT.li < s.lines.length - 1) { CUT.li++; CUT.chars = 0; CUT.hold = 0; } else cutNext(); } }
  } else if (CUT.t > (s.dur || 2.5)) cutNext();
  // smoke puffs drift up from the smoker
  for (const a of s.actors || []) if (a.smoke && Math.random() < dt * 9) CUT.smoke.push({ x: a.x + 18 * a.s, y: a.y - 112 * a.s, r: 6 + Math.random() * 6, vx: 6 + Math.random() * 14, vy: -18 - Math.random() * 16, life: 2.4 });
  for (const p of CUT.smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 9; p.life -= dt; }
  CUT.smoke = CUT.smoke.filter((p) => p.life > 0);
}

// stage backgrounds, 800x450
function cutBg(name, t, g) {
  const W = 800, H = 450;
  const grad = (a, b) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
  if (name === 'skyline' || name === 'party') {
    g.fillStyle = grad('#07061a', '#2a1650'); g.fillRect(0, 0, W, H);
    const R = rng(name === 'party' ? 5 : 3);
    for (let i = 0; i < 14; i++) {
      const bw = 50 + R() * 60, bh = 120 + R() * 220, bx = i * 60 - 20 + R() * 20;
      g.fillStyle = '#120c24'; g.fillRect(bx, H - bh - 60, bw, bh + 60);
      for (let wy = H - bh - 50; wy < H - 70; wy += 16) for (let wx = bx + 6; wx < bx + bw - 8; wx += 12) if (R() < 0.45) { g.fillStyle = R() < 0.8 ? '#ffd38a' : '#8ad8ff'; g.fillRect(wx, wy, 5, 7); }
    }
    if (name === 'skyline') {
      const tx = ((t * 160) % 1400) - 500;
      g.fillStyle = '#2b2b3a'; g.fillRect(0, 330, W, 8);
      for (let c = 0; c < 4; c++) { g.fillStyle = '#4a4a5c'; g.fillRect(tx + c * 112, 296, 104, 34); g.fillStyle = '#ffe9a8'; for (let w = 0; w < 5; w++) g.fillRect(tx + c * 112 + 10 + w * 19, 304, 11, 10); }
      g.fillStyle = '#fff'; const R2 = rng(9); for (let i = 0; i < 70; i++) { const x = (R2() * W + t * 12) % W, y = (R2() * H + t * (30 + R2() * 30)) % H; g.globalAlpha = 0.7; g.fillRect(x, y, 2, 2); } g.globalAlpha = 1;
    } else {
      g.fillStyle = '#16102a'; g.fillRect(250, 60, 300, 330);
      g.fillStyle = '#12061a'; g.strokeStyle = '#ff3cc8'; g.lineWidth = 5; rr(g, 290, 120, 220, 70, 12); g.fill(); g.stroke();
      g.font = '54px Anton, Impact'; g.textAlign = 'center'; g.fillStyle = (Math.floor(t * 3) % 2) ? '#ff3cc8' : '#fff0f8'; g.fillText('5150', 400, 175);
      if (t % 0.5 < 0.06) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, W, H); }
    }
    g.fillStyle = '#0b0814'; g.fillRect(0, H - 60, W, 60);
  } else if (name === 'apartment') {
    g.fillStyle = '#5a3a22'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 26) { g.fillStyle = x % 52 ? '#6a4628' : '#563620'; g.fillRect(x, 0, 24, H * 0.7); }
    g.fillStyle = '#c4621e'; g.fillRect(0, H * 0.7, W, H * 0.3);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 300; i++) g.fillRect((i * 53) % W, H * 0.7 + ((i * 29) % 130), 3, 6);
    g.fillStyle = '#0d0a22'; g.fillRect(520, 70, 200, 140); g.fillStyle = '#ffd38a'; for (let i = 0; i < 30; i++) g.fillRect(530 + (i * 37) % 180, 120 + (i * 13) % 80, 4, 6);
    g.strokeStyle = '#3a2412'; g.lineWidth = 8; g.strokeRect(520, 70, 200, 140);
    g.fillStyle = '#f4f4f4'; g.fillRect(70, 60, 110, 70); g.fillStyle = '#7fc6ff'; g.fillRect(70, 77, 110, 10); g.fillRect(70, 103, 110, 10);
    g.fillStyle = '#e03030'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(88 + i * 25, 95, 4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#3a2a1a'; g.fillRect(600, 250, 150, 80);
    g.fillStyle = '#222'; rr(g, 612, 196, 126, 60, 10); g.fill();
    g.fillStyle = `rgba(${120 + Math.sin(t * 9) * 40},${160 + Math.sin(t * 7) * 40},255,0.9)`; rr(g, 622, 204, 106, 44, 8); g.fill();
    g.fillStyle = 'rgba(140,180,255,0.10)'; g.beginPath(); g.moveTo(622, 230); g.lineTo(420, 450); g.lineTo(800, 450); g.closePath(); g.fill();
    g.fillStyle = '#7a3428'; rr(g, 150, 300, 300, 90, 16); g.fill();
    g.strokeStyle = 'rgba(255,214,10,0.35)'; g.lineWidth = 3; for (let x = 165; x < 450; x += 28) { g.beginPath(); g.moveTo(x, 300); g.lineTo(x, 390); g.stroke(); } for (let y = 312; y < 390; y += 24) { g.beginPath(); g.moveTo(150, y); g.lineTo(450, y); g.stroke(); }
  } else if (name === 'door') {
    g.fillStyle = grad('#141018', '#05040a'); g.fillRect(0, 0, W, H);
    g.fillStyle = '#2b2430'; g.fillRect(280, 40, 240, 380); g.strokeStyle = '#4a4050'; g.lineWidth = 8; g.strokeRect(280, 40, 240, 380);
    g.fillStyle = '#888'; g.beginPath(); g.arc(400, 140, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c9a040'; g.beginPath(); g.arc(495, 240, 9, 0, Math.PI * 2); g.fill();
    const crack = 6 + Math.sin(t * 3) * 3; g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(516, 44, crack, 372);
    g.fillStyle = 'rgba(180,230,255,0.10)'; g.beginPath(); g.moveTo(520, 44); g.lineTo(800, 0); g.lineTo(800, 450); g.lineTo(520, 416); g.closePath(); g.fill();
  } else if (name === 'stairwell') {
    g.fillStyle = grad('#3a3d44', '#1c1e22'); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#4c5058' : '#43464e'; g.fillRect(i * 70 - 40, 450 - i * 30, 120, 30 + i * 30); }
    const on = Math.sin(t * 13) > -0.6; g.fillStyle = on ? '#ff3030' : '#661010'; rr(g, 610, 40, 110, 44, 6); g.fill(); g.fillStyle = '#fff'; g.font = '30px Anton, Impact'; g.textAlign = 'center'; g.fillText('EXIT', 665, 74);
    g.fillStyle = 'rgba(255,40,40,0.06)'; g.fillRect(0, 0, W, H);
  } else if (name === 'bedroom') {
    g.fillStyle = grad('#a8c8e2', '#f8e4c8'); g.fillRect(0, 0, W, H);
    const sy = 330 - Math.min(1, t / 4) * 120; const sk = g.createLinearGradient(0, 70, 0, 300); sk.addColorStop(0, '#3e2a60'); sk.addColorStop(1, '#ffa660');
    g.fillStyle = sk; g.fillRect(470, 70, 260, 230); g.fillStyle = '#ffe896'; g.beginPath(); g.arc(600, sy, 40, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#607830'; g.fillRect(470, 250, 260, 50); g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(470, 70, 260, 230); g.beginPath(); g.moveTo(600, 70); g.lineTo(600, 300); g.stroke();
    g.fillStyle = '#2e3c6e'; rr(g, -20, 330, 520, 160, 30); g.fill(); g.fillStyle = '#f0f0f8'; rr(g, 30, 300, 180, 60, 24); g.fill();
    g.fillStyle = '#1c1c26'; rr(g, 640, 330, 90, 70, 10); g.fill(); g.fillStyle = (Math.floor(t * 2) % 2) ? '#ff4646' : '#7a2020'; g.font = '34px Anton, Impact'; g.textAlign = 'center'; g.fillText('7:00', 685, 378);
  } else if (name === 'house') {   // Perci's living room in Nebraska (day, or night for Mixi's pickup)
    const night = !!((CUT.shots[CUT.i] || {}).fx || {}).night;
    g.fillStyle = night ? grad('#1c1a2c', '#2a2438') : grad('#d8ccb0', '#c8b898'); g.fillRect(0, 0, W, H);
    const sk = g.createLinearGradient(0, 60, 0, 240); sk.addColorStop(0, night ? '#06081e' : '#8ac8f0'); sk.addColorStop(1, night ? '#241a40' : '#f8e4c8');
    g.fillStyle = sk; g.fillRect(500, 60, 240, 180);
    g.fillStyle = night ? '#1a2410' : '#c8a83a'; g.fillRect(500, 190, 240, 50);
    g.fillStyle = night ? '#2a2a34' : '#8a8a92'; g.fillRect(640, 110, 8, 80); g.beginPath(); g.ellipse(644, 110, 26, 16, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#f4f0e8'; g.lineWidth = 10; g.strokeRect(500, 60, 240, 180); g.beginPath(); g.moveTo(620, 60); g.lineTo(620, 240); g.stroke();
    g.fillStyle = night ? '#3a2e22' : '#b08458'; g.fillRect(0, 330, W, 120);
    g.fillStyle = '#5a4a6a'; rr(g, 60, 260, 360, 110, 22); g.fill(); g.fillStyle = '#6a5a7c'; rr(g, 80, 300, 150, 60, 14); g.fill(); rr(g, 250, 300, 150, 60, 14); g.fill();
    g.strokeStyle = '#b8b8c0'; g.lineWidth = 6; g.beginPath(); g.moveTo(450, 380); g.lineTo(520, 300); g.moveTo(462, 384); g.lineTo(532, 304); g.stroke();
    g.fillStyle = '#2a2a30'; g.fillRect(560, 300, 160, 70); g.fillStyle = '#6e24c8'; g.fillRect(572, 266, 136, 50); g.font = '20px Anton, Impact'; g.textAlign = 'center'; g.fillStyle = '#ffd60a'; g.fillText('ZEV DOD', 640, 298);
    if (night) { g.fillStyle = 'rgba(10,8,30,0.35)'; g.fillRect(0, 0, W, H); }
  } else if (name === 'mhouse') {   // Miracle's house in Lincoln, BROKE-pilot in every screen
    g.fillStyle = grad('#3a2e4a', '#1c1426'); g.fillRect(0, 0, W, H);
    g.fillStyle = '#6a5040'; g.fillRect(0, 340, W, 110);
    g.fillStyle = '#101014'; g.fillRect(250, 70, 300, 180); const fl = Math.floor(t * 8) % 2;
    g.fillStyle = fl ? '#2a0c3a' : '#3a1040'; g.fillRect(260, 80, 280, 160);
    for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#ff8c28' : '#8232dc'; g.globalAlpha = 0.6; g.fillRect(260, 80 + k * 27 + ((t * 40) % 27), 280, 4); } g.globalAlpha = 1;
    if (IMG.brokepilot && IMG.brokepilot.complete) g.drawImage(IMG.brokepilot, 350, 92, 100, 100);
    g.font = '30px Anton, Impact'; g.textAlign = 'center'; g.fillStyle = '#ff3030'; g.fillText(['DINNER: C-', 'YOUR ROOM: F', 'ANALYZING...'][Math.floor(t / 1.2) % 3], 400, 232);
    g.fillStyle = '#2a2a34'; g.fillRect(220, 250, 360, 24);
    g.fillStyle = '#8a8e96'; g.fillRect(650, 120, 110, 230); g.fillStyle = '#ffd60a'; g.fillRect(690, 220, 30, 26);
    g.strokeStyle = '#c8c8d0'; g.lineWidth = 5; g.beginPath(); g.moveTo(650, 210); g.lineTo(760, 250); g.moveTo(650, 250); g.lineTo(760, 210); g.stroke();
    g.fillStyle = '#5a5a6a'; rr(g, 40, 300, 180, 80, 18); g.fill();
    g.fillStyle = '#2a2a30'; g.beginPath(); g.ellipse(560 + Math.sin(t * 2) * 60, 400, 36, 14, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff8c28'; g.fillRect(552 + Math.sin(t * 2) * 60, 394, 16, 5);
    g.globalCompositeOperation = 'lighter'; for (const [x, c] of [[120, '#8232dc'], [400, '#ff3cc8'], [700, '#00e6ff']]) { g.globalAlpha = 0.18 + 0.12 * Math.sin(t * 4 + x); g.drawImage(glowSprite(c), x - 160, 0, 320, 320); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  } else if (name === 'car') {
    g.fillStyle = grad('#06081e', '#241a40'); g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; const R = rng(4); for (let i = 0; i < 60; i++) { g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i); g.fillRect(R() * W, R() * 180, 2, 2); } g.globalAlpha = 1;
    g.fillStyle = '#10101a'; g.fillRect(0, 200, W, 120); g.fillStyle = '#22222e'; g.beginPath(); g.moveTo(385, 200); g.lineTo(415, 200); g.lineTo(700, 320); g.lineTo(100, 320); g.closePath(); g.fill();
    g.fillStyle = '#ffd60a'; for (let k = 0; k < 6; k++) { const z = ((k / 6) + t * 0.9) % 1, y = 200 + z * z * 120, sw = 2 + z * 6; g.fillRect(400 - sw / 2, y, sw, 4 + z * 12); }
    g.fillStyle = '#181420'; g.beginPath(); g.ellipse(400, 470, 560, 170, 0, Math.PI, 0); g.fill(); g.fillRect(0, 380, W, 70);
    g.fillStyle = '#0c0a10'; rr(g, 300, 330, 200, 70, 12); g.fill(); g.strokeStyle = '#5a5070'; g.lineWidth = 3; g.stroke();
    const radio = CUT.shots && CUT.shots[CUT.i] && CUT.shots[CUT.i].fx || {}, seg = radio.alert ? 2 : Math.floor(t / 0.9) % 2;
    g.font = '20px Poppins, sans-serif'; g.textAlign = 'center'; g.fillStyle = ['#ffbe50', '#50e6ff', '#ff4646'][radio.radio || radio.alert ? seg : 0];
    g.fillText(radio.alert ? '!! SIGNAL !!' : (radio.radio ? ['COUNTRY 98.1', 'HIP-HOP 104.5'][seg] : 'HWY 30 • NIGHT'), 400, 372);
    if (radio.alert) { for (const [i, cx] of [[0, 110], [1, 230], [2, 570], [3, 690]]) { g.fillStyle = (Math.floor(t * 6) % 2) ? '#e62832' : '#781418'; rr(g, cx - 34, 280, 68, 110, 10); g.fill(); g.fillStyle = '#fff'; g.font = '40px Anton, Impact'; g.fillText('!', cx, 350); } }
  } else if (name === 'barn') {
    g.fillStyle = '#5a1c18'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 34) { g.fillStyle = x % 68 ? '#6e2420' : '#62201c'; g.fillRect(x, 0, 32, 340); }
    g.fillStyle = '#3a2a1a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(400, -60); g.lineTo(800, 0); g.lineTo(800, 30); g.lineTo(400, -30); g.lineTo(0, 30); g.closePath(); g.fill();
    g.fillStyle = '#c8a050'; g.fillRect(0, 340, W, 110); g.fillStyle = 'rgba(120,80,30,0.4)'; for (let i = 0; i < 200; i++) g.fillRect((i * 41) % W, 340 + (i * 17) % 110, 6, 2);
    g.fillStyle = '#2a2a34'; rr(g, 250, 230, 300, 110, 14); g.fill(); g.strokeStyle = '#00e6ff'; g.lineWidth = 3; g.stroke();
    for (let i = 0; i < 5; i++) { const hx = 280 + i * 60; g.fillStyle = '#d8dde4'; g.beginPath(); g.arc(hx, 220, 22, Math.PI, 0); g.fill(); g.fillStyle = `rgba(0,230,255,${0.5 + 0.5 * Math.sin(t * 4 + i)})`; g.fillRect(hx - 16, 210, 32, 6); }
  } else if (name === 'dream') {
    g.fillStyle = '#06040c'; g.fillRect(0, 0, W, H);
    const cols = ['#00e6ff', '#8232dc', '#ffd60a'];
    for (let k = 0; k < 14; k++) { const ph = ((k + t * 0.9) % 14) / 14, s = 20 * Math.pow(1.3, ph * 14); g.globalAlpha = Math.max(0, Math.min(1, (1 - ph) * 2)); g.strokeStyle = cols[k % 3]; g.lineWidth = 3; g.strokeRect(400 - s * 1.6, 225 - s, s * 3.2, s * 2); }
    g.globalAlpha = 1;
  } else if (name === 'white') {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  } else {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  }
}
const CUTG = { slow: 0, slowTeam: 'none', player: null };
function cutActor(a, t) {
  const e = { team: 'P', kind: a.k, r: CHARS[a.k] && CHARS[a.k].small ? 17 : 21, x: 0, y: 0, vx: 0, vy: 0, bob: (a.x || 0) * 0.01, hurt: 0,
    a: (a.f || 1) < 0 ? Math.PI : 0, isPlayer: false, frozen: 0, shield: 0, fast: 0, dead: 0, hp: 0, maxhp: 0, name: '', human: false,
    stats: CHARS[a.k] || { shot: '#ff8c28' }, flash: 0 };
  const saveG = G; G = CUTG;
  ctx.save(); ctx.translate(a.x, a.y); ctx.scale(a.s || 1.5, a.s || 1.5);
  try { drawEnt(e, t); } finally { ctx.restore(); G = saveG; }
  if (a.smoke) {   // the joint: a small white stick with an ember at his hand
    const s = (a.s || 1.5) * CHAR_SCALE, hx = a.x + 9 * s, hy = a.y - 70 * s;   // at his mouth
    ctx.strokeStyle = '#f4f0e6'; ctx.lineWidth = 3 * (a.s || 1.5) * 0.6; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 12 * s * 0.6, hy - 3); ctx.stroke();
    ctx.fillStyle = `rgba(255,${120 + Math.sin(t * 8) * 60},40,1)`; ctx.beginPath(); ctx.arc(hx + 12 * s * 0.6, hy - 3, 2.6, 0, Math.PI * 2); ctx.fill();
  }
}
function wrapText(g, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const test = cur ? cur + ' ' + w : w; if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
  if (cur) lines.push(cur); return lines;
}
function drawCut(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  if (!CUT.shots) return;
  const s = CUT.shots[CUT.i], fx = s.fx || {};
  const portrait = VH > VW * 1.05;
  const boxH = portrait ? Math.min(180, VH * 0.24) : Math.min(118, VH * 0.3);
  const availH = portrait ? VH - boxH - 90 : VH;
  // phones held upright: crop the stage around its center so the scene fills the screen
  const sc = portrait ? Math.max(VW / 800, (availH * 0.8) / 450) : Math.max(VW / 800, VH / 450);
  const ox = (VW - 800 * sc) / 2, oy = portrait ? 50 + (availH - 450 * sc) / 2 : (VH - 450 * sc) / 2;
  const zoom = 1 + Math.min(1, CUT.t / 6) * 0.06;
  const shake = (fx.shake || fx.alert) && CUT.t < 0.8 ? (Math.random() - 0.5) * 10 : 0;
  ctx.save(); ctx.translate(ox + shake, oy); ctx.scale(sc, sc);
  ctx.beginPath(); ctx.rect(0, 0, 800, 450); ctx.clip();
  ctx.translate(400, 225); ctx.scale(zoom, zoom); ctx.translate(-400, -225);
  cutBg(s.bg, CUT.t + CUT.i * 3, ctx);
  for (const a of s.actors || []) cutActor(a, CUT.t);
  for (const p of CUT.smoke) { ctx.globalAlpha = Math.max(0, Math.min(0.55, p.life / 3)); ctx.fillStyle = '#d8d4e0'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (fx.haze) { ctx.fillStyle = `rgba(${120 + Math.sin(CUT.t) * 20},60,200,0.16)`; ctx.fillRect(0, 0, 800, 450); ctx.fillStyle = 'rgba(80,220,120,0.08)'; ctx.fillRect(0, 0, 800, 450); }
  if (fx.eyes) { const o = Math.min(1, CUT.t / 1.2); ctx.globalCompositeOperation = 'lighter'; for (const ex of [506, 538]) { const gs = glowSprite('#00e6ff'); ctx.globalAlpha = o; ctx.drawImage(gs, ex - 22, 170 - 22, 44, 44); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  if (CUT.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${CUT.flash})`; ctx.fillRect(0, 0, VW, VH); }
  // title card: slash band like the show
  if (s.cap) {
    const p = Math.min(1, CUT.t / 0.35), cy = portrait ? oy + 450 * sc / 2 : VH * 0.42, bandH = Math.max(90, Math.min(150, VW * 0.2));
    ctx.save(); ctx.translate(VW / 2, cy); ctx.rotate(-0.05); ctx.globalAlpha = p;
    ctx.fillStyle = 'rgba(110,36,200,0.92)'; ctx.fillRect(-VW, -bandH / 2, VW * 2 * p, bandH);
    ctx.fillStyle = '#ffd60a'; ctx.fillRect(-VW, -bandH / 2 - 6, VW * 2 * p, 6); ctx.fillRect(-VW, bandH / 2, VW * 2 * p, 6);
    const big = Math.min(64, VW / (s.cap.length * 0.5 + 2));
    ctx.font = `${big}px Anton, Impact`; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#140a1e'; ctx.strokeText(s.cap, 0, s.sub ? 6 : big * 0.35); ctx.fillStyle = '#ffd60a'; ctx.fillText(s.cap, 0, s.sub ? 6 : big * 0.35);
    if (s.sub) { const f = Math.min(22, VW / (s.sub.length * 0.62 + 2)); ctx.font = `700 ${f}px Poppins, sans-serif`; ctx.fillStyle = '#fff'; ctx.fillText(s.sub, 0, 6 + f + 14); }
    ctx.restore();
  }
  // dialogue box with the speaker's face
  if (s.lines && s.lines.length) {
    const [who, text] = s.lines[CUT.li], sp = SPEAKER[who] || SPEAKER.perci;
    const bx = 12, bw = VW - 24, by = portrait ? VH - boxH - 20 : VH - boxH - 12;
    ctx.fillStyle = 'rgba(16,10,26,0.92)'; rr(ctx, bx, by, bw, boxH, 16); ctx.fill(); ctx.strokeStyle = sp.col; ctx.lineWidth = 3; ctx.stroke();
    const fr = Math.min(36, boxH * 0.26), fx0 = bx + 18 + fr, fy0 = by + 18 + fr, img = IMG[sp.img];
    ctx.save(); ctx.beginPath(); ctx.arc(fx0, fy0, fr, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = '#2a1a22'; ctx.fillRect(fx0 - fr, fy0 - fr, fr * 2, fr * 2);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, fx0 - fr * 1.35, fy0 - fr * 1.27, fr * 2.7, fr * 2.7); ctx.restore();
    ctx.strokeStyle = sp.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(fx0, fy0, fr, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '24px Anton, Impact'; ctx.textAlign = 'left'; ctx.fillStyle = sp.col; ctx.fillText(sp.name, fx0 + fr + 14, by + 34);
    const fs = Math.max(15, Math.min(21, VW / 30)); ctx.font = `600 ${fs}px Poppins, sans-serif`; ctx.fillStyle = '#fff';
    const shown = text.slice(0, Math.floor(CUT.chars)), lines = wrapText(ctx, shown, bw - (fr * 2 + 60));
    lines.slice(0, 5).forEach((ln, i) => ctx.fillText(ln, fx0 + fr + 14, by + 64 + i * (fs + 7)));
    if (CUT.chars >= text.length) { ctx.font = '700 13px Poppins, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = `rgba(255,214,10,${0.5 + 0.5 * Math.sin(t * 6)})`; ctx.fillText('TAP ▶', bx + bw - 16, by + boxH - 14); }
  }
}

/* ----- slash-wipe transition between screens and levels ----- */
let wiping = false;
function wipe(mid) {
  const w = $('wipe'); if (!w) { mid && mid(); return; }
  if (wiping) { mid && mid(); return; }
  wiping = true; w.className = 'in'; beep(180, 1400, 0.32, 'sawtooth', 0.02);
  setTimeout(() => { try { mid && mid(); } catch (e) { console.error(e); } w.className = 'out'; setTimeout(() => { w.className = ''; wiping = false; }, 460); }, 460);
}

/* ----- mature content: on by default; off takes out the weed item and smoke scenes and cleans up the language ----- */
let MATURE = localStorage.getItem('ps_mature') !== '0';
const CLEAN_LINES = {
  'Lemme spark this real quick. High times on the 14th floor.': 'Lemme chill real quick. Saturday on the 14th floor.',
  'Hell nah. WTF??': 'Heck nah. What the...??',
  '...WTF.': '...What the...?',
  "OH SHYT, HE'S REAL!?": "OH SNAP, HE'S REAL!?",
};
const CLEAN_WORDS = [[/\bWTF\b/g, 'What the...'], [/\bSHYT\b/g, 'SNAP'], [/\bshyt\b/gi, 'snap'], [/\bHell\b/g, 'Heck'], [/\bhell\b/g, 'heck'], [/\bDamn\b/g, 'Dang'], [/\bdamn\b/g, 'dang'], [/-ass\b/g, '']];
function cleanLine(t) { if (CLEAN_LINES[t]) return CLEAN_LINES[t]; for (const [re, w] of CLEAN_WORDS) t = t.replace(re, w); return t; }
function cleanShots(shots) {
  if (MATURE) return shots;
  return shots.map((sh) => Object.assign({}, sh, {
    fx: sh.fx ? Object.assign({}, sh.fx, { haze: 0 }) : sh.fx,
    actors: sh.actors && sh.actors.map((a) => Object.assign({}, a, { smoke: false })),
    lines: sh.lines && sh.lines.map(([who, t]) => [who, cleanLine(t)]),
  }));
}
function setMature(on) {
  MATURE = on; localStorage.setItem('ps_mature', on ? '1' : '0');
  document.querySelectorAll('.matSet button').forEach((b) => b.classList.toggle('sel', (b.dataset.v === '1') === MATURE));
}
document.querySelectorAll('.matSet button').forEach((b) => (b.onclick = () => setMature(b.dataset.v === '1')));
setMature(MATURE);

/* ----- chapter select (mature-content notice the first time) ----- */
function renderChapters() {
  const list = $('chList'); if (!list) return;
  list.innerHTML = CHAPTERS.map((ch) => {
    const locked = ch.id > storyProg.unlocked, st = storyProg.stars[ch.id] || 0;
    return `<button class="ch ${locked ? 'locked' : ''}" data-id="${ch.id}" ${locked ? 'disabled' : ''}>
      <span class="num">${ch.id}</span><span class="body"><b>"${ch.title}"</b><small>${ch.place}</small><em>${locked ? '🔒 Clear chapter ' + (ch.id - 1) + ' to unlock' : ch.goal.text}</em></span>
      <span class="stars">${[1, 2, 3].map((i) => `<i class="${i <= st ? 'on' : ''}">★</i>`).join('')}</span></button>`;
  }).join('');
  list.querySelectorAll('.ch:not(.locked)').forEach((b) => (b.onclick = () => playChapter(+b.dataset.id)));
  const total = Object.values(storyProg.stars).reduce((a, b) => a + b, 0);
  $('chStars').textContent = `★ ${total} / ${CHAPTERS.length * 3}`;
}
function openStory() {
  ac(); renderChapters();
  const seen = localStorage.getItem('ps_note_seen') === '1' || localStorage.getItem('ps_adult') === '1';
  $('matNote').style.display = seen ? 'none' : ''; $('chWrap').style.display = seen ? '' : 'none';
  wipe(() => showScreen('sStory'));
}
$('bStory').onclick = openStory;
$('bMatOk').onclick = () => { localStorage.setItem('ps_note_seen', '1'); $('matNote').style.display = 'none'; $('chWrap').style.display = ''; renderChapters(); };
$('bMatBack').onclick = () => wipe(() => showScreen('sTitle'));
$('bStoryBack').onclick = () => wipe(() => showScreen('sTitle'));
$('bCard').onclick = () => lastCard && shareReportCard(lastCard);
$('bSeCard').onclick = () => lastCard && shareReportCard(lastCard);
$('bSeNext').onclick = () => { const n = CHAPTERS[storyLast.ch.id]; if (n) playChapter(n.id); };
$('bSeRetry').onclick = () => { const ch = storyLast.ch; storyCh = ch; wipe(() => startStoryLevel(ch)); };
$('bSeMenu').onclick = () => { renderChapters(); wipe(() => showScreen('sStory')); };
$('cutSkip').onclick = (e) => { e.stopPropagation(); cutSkip(); };
$('cutTap').addEventListener('pointerdown', (e) => { e.preventDefault(); cutTap(); });
addEventListener('keydown', (e) => { if (state !== 'cut') return; if (e.code === 'Escape') cutSkip(); else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); cutTap(); } });

/* ---------------- loop ---------------- */
resize();
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  if (state === 'play') { if (MP.on && !MP.host) updateClient(dt); else { update(dt); if (MP.on && MP.host && G && state === 'play') mpHostTick(dt); } if (G) drawWorld(t); }
  else if (state === 'paused' && G) { drawWorld(t); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#ffd60a'; ctx.font = '52px Anton, Impact'; ctx.textAlign = 'center';  }
  else if (state === 'cut') { cutStep(dt); drawCut(t); }
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

window.__ps = { leadPoint, assistAim, aimTap, aimLift, get fireMode() { return fireMode; }, setFireMode(v) { fireMode = v; syncFireBtn(); }, get input() { return input; }, setAssist(v) { aimAssist = v; }, get PROG() { return PROG; }, award, applyLoadout, myLoadout, renderStore, openCheckout, storeOpen, WEAPONS, get Z() { return Z; }, playChapter, playCut, setMature, cleanShots, get mature() { return MATURE; }, startStoryLevel, CHAPTERS, get story() { return storyProg; }, get cut() { return CUT; }, cutTap, cutSkip, get state() { return state; }, useItem, get aimAssist() { return aimAssist; }, get Z() { return Z; }, buildArena, loadArena, midX, ownX, flipWorld, reportCard, reportCardPNG, get line() { return G && G.line; }, get world() { return G && G.world; }, get ev() { return G && G.ev; }, overview(scale = 0.5) { if (!STATIC) buildStatic(); const c = document.createElement('canvas'); c.width = WORLD.w * scale; c.height = (WORLD.h * TILT + 80) * scale; const g = c.getContext('2d'); g.scale(scale, scale); g.translate(0, 80); g.drawImage(STATIC, 0, 0); const ws = SOLID.slice().sort((a, b) => a.y + a.h - b.y - b.h); for (const w of ws) { const sp = wallSprite(w); g.drawImage(sp.c, w.x - (sp.ox ?? 3), w.y * TILT - sp.z - (sp.oy ?? 3)); } return c.toDataURL('image/jpeg', 0.85); }, get arena() { return ARENA && ARENA.id; }, get map() { return { w: WORLD.w, h: WORLD.h, name: MAPNAME, walls: SOLID.length }; }, MP, startMatch, get G() { return G; }, endMatch, astar, set pickChar(k) { pick = k; } };

/* =====================================================================================================
   NIGHT TRIAL (story mode 2): one night in Lincoln, 7 PM to 7 AM. Somnus Civic runs a city-wide sleep experiment.
   Same game as the handheld edition. Loaded after game.js; it wraps game.js functions instead of editing them.
   Layers: awake + 3 dream layers, Doubt meter (HUD lies), Might Be Castle receipt ("*maybe" = awake), random event deck,
   10-second Kick, Perci-only weed items off when Miracle/Mixi are around, choices that change later chapters, 4 endings.
   ===================================================================================================== */
const NIGHT_DATA = {"chapters":[{"arena":"b8lincoln","bots":3,"choiceAfter":{"id":"door","options":[{"desc":"In the 1987 dream, that door stays sealed.","label":"CHAIN-LOCK THE REAL DOOR","set":"doorLocked"},{"desc":"Faster to bed. The dream door will not be sealed.","label":"LEAVE IT OPEN","set":"doorOpen"}],"prompt":"The apartment door is open. The bots saw you leave it that way.","title":"BEFORE YOU SLEEP"},"crew":[],"diff":"easy","extras":[],"goal":{"n":6,"text":"TAG 6 SECURITY BOTS • WATCH YOUR BATTERY","type":"tags"},"id":1,"intro":[{"bg":"skyline","cap":"CHAPTER 1","dur":3,"fx":{"night":1},"sub":"\"SIGN HERE\" • 7:00 PM • LINCOLN"},{"actors":[{"k":"perci","s":1.5,"x":330,"y":390}],"bg":"house","fx":{"night":1},"lines":[["perci","Crutches, no job, rent due. And a tent that pays five grand to sleep."],["somnus","One night. 7 PM to 7 AM. Somnus Civic pays $5,000 to every opt-in."],["perci","Where do I sign?"]]},{"actors":[{"k":"perci","s":1.5,"x":330,"y":390}],"bg":"house","fx":{"flash":1,"night":1},"lines":[["somnus","Free ZevBand sleep tracker. Wear it. Don't take it off."],["perci","Free? ...Then it's definitely a trap."],["perci","Five thousand dollars. I'm walking into it."]]},{"bg":"house","cap":"THE CITY GOES DARK","dur":2.6,"fx":{"night":1,"shake":1},"sub":"ALARMS DOWN • CAMERAS DOWN • 911 DOWN"},{"bg":"house","cap":"AWAKE IN LINCOLN","dur":2.6,"sub":"CRUTCHES • NO POWERS • LIMITED BATTERY"}],"night":{"battery":true,"clock":"7:00 PM","depth":0,"noflip":true,"span":50,"t0":1140,"world":"real"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"house","fx":{"night":1},"lines":[["perci","Six bots. And that's just the tent."],["phone","ZevBand: Good evening, Perci. Sleep when you're ready."]]}],"place":"LINCOLN • SOMNUS CIVIC TENT","time":110,"title":"SIGN HERE"},{"arena":"apt14","bots":4,"choiceBefore":{"id":"tv","options":[{"desc":"Somnus loses its real camera on you.","label":"SHOOT THE DREAM TV","set":"tvShot"},{"desc":"Keep your ammo. It keeps watching.","label":"LEAVE IT ALONE","set":"tvLeft"}],"prompt":"It shows your own face, live. Somnus is watching through it.","title":"THE DREAM TV"},"crew":["chatgpt"],"diff":"easy","extras":["kush","receipt"],"goal":{"n":8,"text":"TAG 8 DREAM BOTS • TV IS WATCHING","type":"tags"},"id":2,"intro":[{"bg":"apartment","cap":"CHAPTER 2","dur":3,"fx":{"haze":1},"sub":"\"FREE SLEEP TRACKER\" • 8:30 PM • LAYER 1"},{"actors":[{"k":"perci","s":1.5,"x":300,"y":390},{"f":-1,"k":"chatgpt","s":1.5,"x":520,"y":390}],"bg":"apartment","lines":[["perci","Legs work again. ...This is a dream."],["chatgpt","The ZevBand is sharing one dream between every sleeper in Lincoln."],["chatgpt","Somnus is running its experiment in the streets and in here at the same time."]]},{"bg":"apartment","fx":{"eyes":1,"glitch":1},"lines":[["broke","TV: Hello Perci. You have been selected for further study."],["perci","The TV knows my name."]]}],"night":{"clock":"8:30 PM","depth":1,"span":90,"t0":1230,"world":"dream"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"apartment","lines":[["perci","Down one layer. And my legs ain't even sore."],["chatgpt","Careful. Every layer feels more real than the last."]]}],"place":"LAYER 1 • 1987 • BUILDING 8","time":100,"title":"FREE SLEEP TRACKER"},{"arena":"stair8","bots":5,"crew":[],"diff":"normal","extras":["kush","receipt"],"goal":{"lives":4,"text":"SURVIVE 1:30 • DON'T GET TAGGED 4 TIMES","type":"survive"},"id":3,"intro":[{"bg":"stairwell","cap":"CHAPTER 3","dur":3,"fx":{"glitch":1},"sub":"\"THE 1987 DOOR\" • 10:00 PM • LAYER 2"},{"bg":"door","fx":{"eyes":1,"shake":1},"lines":[["phone","...open the door."],["perci","Not again."]]},{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"stairwell","lines":[["perci","Second layer. Everything's louder and it's still the same hallway."]]}],"night":{"clock":"10:00 PM","depth":2,"span":60,"t0":1320,"world":"dream"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"stairwell","lines":[["perci","Held it. Somnus counts every step I take down here."],["perci","My stomach says it's almost eleven."]]}],"place":"LAYER 2 • THE STAIRWELL","time":90,"title":"THE 1987 DOOR"},{"arena":"phouse","bots":4,"choiceAfter":{"id":"route","options":[{"desc":"Get Miracle, Jessica and Mixi out of the locked city.","label":"WAKE UP","route":"wake"},{"desc":"Dive to layer 3 and break Somnus from the inside.","label":"GO DEEPER","route":"deep"}],"prompt":"Wake up and save your family, or go deeper and shut the experiment down. Both roads end at the Landlord.","title":"11:11 PM"},"crew":[],"diff":"normal","extras":["kush","burger","receipt"],"goal":{"n":10,"text":"TAG 10 BOTS • READ THE RECEIPT","type":"tags"},"id":4,"intro":[{"bg":"bedroom","cap":"CHAPTER 4","dur":3,"fx":{"haze":1},"sub":"\"11:11\" • 11:00 PM"},{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"bedroom","lines":[["perci","11:11. Every clock in the house stopped on it."],["phone","ZevBand: You may wake up now. Or you may continue."],["perci","Hold up. That's a choice? In this experiment?"]]}],"night":{"clock":"11:00 PM","depth":2,"span":11,"t0":1380,"world":"dream"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"bedroom","fx":{"flash":1},"lines":[["perci","Wake up and get my family out. Or go deeper and shut it down from inside."]]}],"place":"LAYER 2 • PERCI'S HOUSE","time":100,"title":"11:11"},{"alt":{"arena":"barn","bots":4,"crew":["chatgpt"],"extras":["kush","receipt"],"goal":{"n":12,"text":"TAG 12 BOTS • THE FLOORS KEEP MOVING","type":"tags"},"intro":[{"bg":"dream","cap":"CHAPTER 5","dur":3,"fx":{"glitch":1},"sub":"\"LAYER THREE\" • 12:20 AM • DEEPER"},{"actors":[{"k":"perci","s":1.5,"x":300,"y":390},{"f":-1,"k":"chatgpt","s":1.5,"x":520,"y":390}],"bg":"dream","lines":[["chatgpt","Third layer. The rules are mostly gone from here."],["perci","Then why do I feel stronger and dizzier at the same time?"]]}],"night":{"clock":"12:20 AM","depth":3,"span":30,"t0":1460,"world":"dream"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"dream","lines":[["perci","The experiment has a floor. I can hear it ticking."]]}],"place":"LAYER 3 • THE ELEVATOR SHAFT","time":110,"title":"LAYER THREE"},"arena":"mhouse","bots":4,"crew":["miracle"],"diff":"normal","extras":["receipt"],"goal":{"text":"OUT-TAG SOMNUS BOTS • HOLD THE HOUSE","type":"win"},"id":5,"intro":[{"bg":"mhouse","cap":"CHAPTER 5","dur":3,"fx":{"night":1},"sub":"\"THE LOCKED CITY\" • 12:20 AM • AWAKE"},{"actors":[{"k":"perci","s":1.4,"x":290,"y":400},{"f":-1,"k":"miracle","s":1.35,"x":510,"y":400}],"bg":"mhouse","fx":{"night":1},"lines":[["miracle","Daddy, the alarms are dead and the phones say no service!"],["perci","Somnus took the whole city offline. Stay behind me."]]}],"night":{"battery":true,"clock":"12:20 AM","depth":1,"span":30,"t0":1460,"world":"real"},"outro":[{"actors":[{"k":"miracle","s":1.5,"x":400,"y":400}],"bg":"mhouse","fx":{"night":1},"lines":[["miracle","Daddy, I read their terms. We're all in the study too."]]}],"place":"LINCOLN • THE REAL STREETS","time":110,"title":"THE LOCKED CITY"},{"alt":{"arena":"stair8","bots":5,"crew":["chatgpt"],"extras":["kush","receipt"],"goal":{"lives":4,"text":"SURVIVE 1:40 • 4 LIVES","type":"survive"},"intro":[{"bg":"dream","cap":"CHAPTER 6","dur":3,"fx":{"glitch":1,"shake":1},"sub":"\"THE BOTTOM\" • 12:55 AM • LAYER 3"},{"actors":[{"k":"chatgpt","s":1.6,"x":400,"y":400}],"bg":"dream","lines":[["chatgpt","Nobody comes back from here the same, Perci."],["perci","Good. I wasn't the same to begin with."]]}],"night":{"clock":"12:55 AM","depth":3,"span":30,"t0":1495,"world":"dream"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"dream","lines":[["perci","The bottom was a landlord's office. With a lease."]]}],"place":"LAYER 3 • THE FLOOR UNDER THE FLOOR","time":100,"title":"THE BOTTOM"},"arena":"b8lincoln","bots":5,"crew":["miracle","mixi"],"diff":"hard","extras":[],"goal":{"lives":5,"text":"SURVIVE 1:40 • PROTECT THE KIDS","type":"survive"},"id":6,"intro":[{"bg":"car","cap":"CHAPTER 6","dur":3,"fx":{"night":1,"radio":1},"sub":"\"SIRENS\" • 12:55 AM • AWAKE"},{"actors":[{"k":"mixi","s":1.35,"x":400,"y":410}],"bg":"stairwell","fx":{"night":1,"shake":1},"lines":[["mixi","Daddy! The sirens aren't police, they're just recorded!"],["perci","Keep the tablet low. Hold the stairs with me."]]}],"night":{"battery":true,"clock":"12:55 AM","depth":1,"span":30,"t0":1495,"world":"real"},"outro":[{"bg":"car","fx":{"night":1},"lines":[["perci","Everybody in. Seatbelts. We're driving to the bottom of this."]]}],"place":"LINCOLN • BUILDING 8","time":100,"title":"SIRENS"},{"arena":"apt14","bots":5,"crew":[],"diff":"hard","extras":["kush","burger","receipt","receipt"],"goal":{"n":15,"text":"TAG 15 BOTS • USE THE RECEIPT","type":"tags"},"id":7,"intro":[{"bg":"apartment","cap":"CHAPTER 7","dur":3,"fx":{"glitch":1},"sub":"\"WHAT'S REAL\" • 1:30 AM"},{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"apartment","lines":[["perci","My HUD just lied to me. The clock, the score, the badge."],["perci","Got a Might Be Castle receipt in my pocket. The asterisk is the tell."],["perci","No asterisk after the total means I'm dreaming."]]}],"night":{"battery":true,"clock":"1:30 AM","depth":2,"span":20,"t0":1530,"world":"real"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"apartment","fx":{"flash":1},"lines":[["perci","Okay. Two roads, one hallway. And somebody's paying rent on all of it."]]}],"place":"BOTH ROADS MEET • BUILDING 8 14TH FLOOR","time":110,"title":"WHAT'S REAL"},{"arena":"b8lincoln","bots":5,"crew":[],"diff":"hard","extras":["receipt"],"goal":{"n":14,"text":"TAG 14 NIGHT-SHIFT BOTS • AWAKE","type":"tags"},"id":8,"intro":[{"bg":"skyline","cap":"CHAPTER 8","dur":3,"fx":{"night":1},"sub":"\"NIGHT SHIFT\" • 1:55 AM • AWAKE"},{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"stairwell","fx":{"night":1},"lines":[["perci","Somnus Civic's lobby. Lights on, nobody home, and every desk is staffed."],["somnus","Night shift is monitoring. Please return to your bed."]]}],"night":{"battery":true,"clock":"1:55 AM","depth":1,"span":20,"t0":1555,"world":"real"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"stairwell","fx":{"night":1},"lines":[["perci","Found a badge. It opens the waiting room."]]}],"place":"LINCOLN • SOMNUS CIVIC LOBBY","time":100,"title":"NIGHT SHIFT"},{"arena":"mhouse","bots":5,"crew":["chatgpt"],"diff":"hard","extras":["kush","receipt"],"goal":{"lives":4,"text":"SURVIVE 1:20 • DON'T GET TAGGED 4 TIMES","type":"survive"},"id":9,"intro":[{"bg":"dream","cap":"CHAPTER 9","dur":3,"fx":{"glitch":1},"sub":"\"THE WAITING ROOM\" • 2:15 AM • LAYER 2"},{"actors":[{"k":"perci","s":1.5,"x":300,"y":390},{"f":-1,"k":"chatgpt","s":1.5,"x":520,"y":390}],"bg":"dream","lines":[["chatgpt","Every sleeper in Lincoln is sitting in this room, waiting for a number."],["perci","Then why am I the one they're staring at?"]]}],"night":{"clock":"2:15 AM","depth":2,"span":20,"t0":1575,"world":"dream"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"dream","lines":[["perci","They called my number. Wasn't mine."]]}],"place":"LAYER 2 • A LOBBY THAT NEVER CALLS YOUR NAME","time":80,"title":"THE WAITING ROOM"},{"alt":{"crew":["miracle"],"extras":["receipt"],"goal":{"text":"OUT-TAG THE BOTS • PROTECT MIRACLE","type":"win"}},"arena":"phouse","bots":4,"crew":[],"diff":"hard","extras":["burger","receipt"],"goal":{"text":"OUT-TAG THE BOTS • PROTECT THE FILES","type":"win"},"id":10,"intro":[{"bg":"bedroom","cap":"CHAPTER 10","dur":3,"fx":{"night":1},"sub":"\"PAPER TRAIL\" • 2:35 AM • AWAKE"},{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"house","fx":{"night":1},"lines":[["perci","Printed every page of that contract. Somnus wants them back."],["perci","Page four says the building owns my sleep."]]}],"night":{"battery":true,"clock":"2:35 AM","depth":1,"span":15,"t0":1595,"world":"real"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"house","fx":{"night":1},"lines":[["perci","Got the evidence. Now I need a layer deep enough to use it."]]}],"place":"LINCOLN • PERCI'S HOUSE • AWAKE","time":110,"title":"PAPER TRAIL"},{"arena":"barn","bots":5,"crew":["chatgpt"],"diff":"hard","extras":["kush","burger","receipt"],"goal":{"n":16,"text":"TAG 16 BOTS • THE SIGNAL IS EVERYWHERE","type":"tags"},"id":11,"intro":[{"bg":"dream","cap":"CHAPTER 11","dur":3,"fx":{"glitch":1,"shake":1},"sub":"\"BROADCAST\" • 2:50 AM • LAYER 3"},{"actors":[{"k":"chatgpt","s":1.6,"x":400,"y":400}],"bg":"dream","lines":[["chatgpt","Somnus is pushing one signal into every ZevBand at once."],["perci","So whatever I shoot, they all feel it?"],["chatgpt","That's the point of a broadcast."]]}],"night":{"clock":"2:50 AM","depth":3,"span":12,"t0":1610,"world":"dream"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"dream","lines":[["perci","Static. Then silence. Somebody just heard me."]]}],"place":"LAYER 3 • EVERY DREAM IN LINCOLN","time":110,"title":"BROADCAST"},{"arena":"apt14","bots":5,"crew":[],"diff":"hard","extras":["burger","receipt"],"goal":{"lives":4,"text":"SURVIVE 1:30 • DON'T GET TAGGED 4 TIMES","type":"survive"},"id":12,"intro":[{"bg":"apartment","cap":"CHAPTER 12","dur":3,"fx":{"night":1,"shake":1},"sub":"\"LAST CALL\" • 3:02 AM • AWAKE"},{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"apartment","fx":{"night":1},"lines":[["somnus","Last call for sleepers. All remaining subjects return to bed."],["perci","I'm done being a subject."]]}],"night":{"battery":true,"clock":"3:02 AM","depth":2,"span":8,"t0":1622,"world":"real"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"apartment","fx":{"night":1},"lines":[["perci","Held the floor. It's 3:10. Somebody's about to knock."]]}],"place":"BUILDING 8 • THE 14TH FLOOR • AWAKE","time":90,"title":"LAST CALL"},{"arena":"stair8","bots":5,"crew":[],"diff":"hard","extras":["kush","burger","receipt"],"goal":{"n":18,"text":"TAG 18 BOTS • TEAR UP PAGE FOUR","type":"tags"},"id":13,"intro":[{"bg":"stairwell","cap":"CHAPTER 13","dur":3,"fx":{"glitch":1},"sub":"\"THE LEASE\" • 3:10 AM • LAYER 3"},{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"stairwell","lines":[["perci","Page four, in a stairwell as long as the contract."],["landlord","Rent comes due at 3:33. I collect in person."]]}],"night":{"clock":"3:10 AM","depth":3,"span":6,"t0":1630,"world":"dream"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"stairwell","fx":{"shake":1},"lines":[["perci","Okay. Next stop is the way up. Then him."]]}],"place":"LAYER 3 • THE PAGE NOBODY READS","time":100,"title":"THE LEASE"},{"arena":"phouse","bots":5,"crew":[],"diff":"hard","extras":["burger","receipt"],"goal":{"lives":4,"text":"SURVIVE 1:20 • SURVIVE EVERY KICK","type":"survive"},"id":14,"intro":[{"bg":"house","cap":"CHAPTER 14","dur":3,"fx":{"flash":1,"shake":1},"sub":"\"THE KICK\" • 3:15 AM"},{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"house","lines":[["perci","Waking up falls. Every time I surface, the ground drops ten seconds long."],["perci","Ten seconds. Don't get tagged."]]}],"night":{"clock":"3:15 AM","depth":3,"kicks":true,"span":15,"t0":1635,"world":"dream"},"outro":[{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"house","lines":[["phone","ZevBand: Landlord on line one."],["perci","Rent's due at 3:33."]]}],"place":"THE WAY UP • PERCI'S HOUSE","time":80,"title":"THE KICK"},{"arena":"barn","boss":true,"bossHp":30,"bossName":"THE LANDLORD","bossShort":"LANDLORD","bots":3,"crew":[],"diff":"hard","extras":["kush","burger","receipt"],"goal":{"text":"TAG THE LANDLORD","type":"boss"},"id":15,"intro":[{"bg":"barn","cap":"CHAPTER 15","dur":3,"fx":{"shake":1},"sub":"\"LANDLORD\" • 3:33 AM"},{"actors":[{"k":"perci","s":1.5,"x":300,"y":400}],"bg":"barn","lines":[["landlord","You signed. Page four. Everything in your sleep belongs to the building."],["perci","I only read page one."]]},{"bg":"dream","cap":"BOSS: THE LANDLORD","dur":2.6,"fx":{"shake":1},"sub":"TAG HIM BEFORE SUNRISE"}],"night":{"clock":"3:33 AM","depth":3,"span":200,"t0":213,"world":"dream"},"outro":[],"place":"3:33 AM • THE BARN AT THE BOTTOM OF THE NIGHT","time":150,"title":"LANDLORD"}],"endings":{"deep":{"name":"SHUTDOWN","shots":[{"bg":"dream","cap":"THE LAST LAYER","dur":3,"sub":"EVERY ZEVBAND IN LINCOLN GOES QUIET"},{"bg":"white","fx":{"flash":1},"lines":[["perci","Lights out for good."]]},{"bg":"tbc","cap":"ENDING: SHUTDOWN","dur":4,"sub":"NIGHT TRIAL • ENDING 2 OF 4"}],"sub":"You went deeper and switched the experiment off."},"doubt":{"name":"STILL ASLEEP","shots":[{"bg":"bedroom","cap":"7:00 AM?","dur":3,"fx":{"glitch":1},"sub":"THE ALARM IS RINGING. OR IS IT?"},{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"bedroom","lines":[["perci","Receipt says maybe."]]},{"bg":"tbc","cap":"ENDING: STILL ASLEEP","dur":4,"sub":"NIGHT TRIAL • ENDING 3 OF 4"}],"sub":"Your doubt never cleared. Are you awake?"},"secret":{"name":"THE ASTERISK","shots":[{"bg":"white","cap":"7:00 AM*","dur":3,"sub":"THE ASTERISK STAYS ON THE RECEIPT"},{"actors":[{"k":"perci","s":1.5,"x":360,"y":390}],"bg":"house","lines":[["perci","The asterisk was on the sunrise too."],["phone","ZevBand: Subject 0001, you may keep the five thousand."]]},{"bg":"tbc","cap":"SECRET ENDING: THE ASTERISK","dur":4,"sub":"NIGHT TRIAL • ENDING 4 OF 4"}],"sub":"You saw through all of it."},"wake":{"name":"SUNRISE","shots":[{"bg":"skyline","cap":"7:00 AM","dur":3,"sub":"SUNRISE OVER LINCOLN"},{"actors":[{"k":"perci","s":1.4,"x":300,"y":390},{"f":-1,"k":"miracle","s":1.3,"x":460,"y":400},{"f":-1,"k":"mixi","s":1.2,"x":560,"y":410}],"bg":"house","lines":[["perci","Everybody breathing. Everybody here."],["miracle","Daddy, the Somnus tent is empty."]]},{"bg":"tbc","cap":"ENDING: SUNRISE","dur":4,"sub":"NIGHT TRIAL • ENDING 1 OF 4"}],"sub":"You woke up and got your family out."}},"order":["wake","deep","doubt","secret"]};
const NIGHT = (() => {
  const OLD_CHAPTERS = CHAPTERS.slice();
  const ND = NIGHT_DATA;
  const RUN_KEY = 'ps_night_run_v1', END_KEY = 'ps_night_end_v1';
  let run = { doubt: 15, route: null, flags: {}, receipts: 0 }, endings = {};
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const saveRun = () => { try { localStorage.setItem(RUN_KEY, JSON.stringify(run)); } catch (e) {} };
  const loadRun = () => { run = Object.assign({ doubt: 15, route: null, flags: {}, receipts: 0 }, rd(RUN_KEY, {})); endings = rd(END_KEY, {}); };
  const newRun = () => { run = { doubt: 15, route: null, flags: {}, receipts: 0 }; saveRun(); };
  let mode = 'old';
  PICKUPS.receipt = { col: '#f4e8d0', label: 'MIGHT BE CASTLE RECEIPT: AM I AWAKE?', perciOnly: true };
  INV_ICON.receipt = '§';

  function makeChapters() {
    return ND.chapters.map((base) => {
      const ch = JSON.parse(JSON.stringify(base));
      if (ch.alt) { if (run.route === 'deep') Object.assign(ch, ch.alt); delete ch.alt; }
      ch.baseBots = ch.bots; ch.baseLives = ch.goal.lives;
      return ch;
    });
  }
  function prepare(ch) {
    const f = run.flags;
    ch.bots = ch.baseBots; ch.goal.lives = ch.baseLives;
    if (ch.id === 3 && f.doorLocked) { ch.bots = Math.max(2, ch.bots - 1); if (ch.goal.lives) ch.goal.lives++; }
    if (ch.id === 3 && f.doorOpen) ch.bots++;
    if (f.tvShot && ch.night.world === 'real' && ch.id > 2) ch.bots = Math.max(2, ch.bots - 1);
  }
  function refresh() { CHAPTERS.splice(0, CHAPTERS.length, ...(mode === 'night' ? makeChapters() : OLD_CHAPTERS)); }
  function setMode(m) {
    if (m === mode && CHAPTERS.length) { if (m === 'night') loadRun(); return; }
    saveStory(); mode = m; try { localStorage.setItem('ps_story_mode', m); } catch (e) {}
    STORY_KEY = m === 'night' ? 'ps_night_v1' : 'ps_story_v1';
    try { storyProg = Object.assign({ unlocked: 1, stars: {} }, JSON.parse(localStorage.getItem(STORY_KEY) || '{}')); } catch (e) { storyProg = { unlocked: 1, stars: {} }; }
    if (m === 'night') loadRun();
    refresh();
  }
  const totalStars = (skip, add) => Object.entries(storyProg.stars).reduce((a, [k, v]) => a + (+k === skip ? 0 : v), 0) + (add || 0);

  /* ---- choice screen ---- */
  let choiceEl = null;
  function ensureChoice() {
    if (choiceEl) return choiceEl;
    choiceEl = document.createElement('section'); choiceEl.className = 'screen'; choiceEl.id = 'sChoice';
    choiceEl.innerHTML = '<h2 id="chcTitle">CHOICE</h2><p id="chcPrompt" class="muted" style="text-align:center;max-width:480px;margin:6px 0 16px"></p><div id="chcOpts" style="display:flex;flex-direction:column;gap:12px;width:min(520px,100%)"></div>';
    document.body.appendChild(choiceEl); return choiceEl;
  }
  function choice(c, cont) {
    ensureChoice();
    $('chcTitle').textContent = c.title; $('chcPrompt').textContent = c.prompt;
    const box = $('chcOpts'); box.innerHTML = '';
    c.options.forEach((o) => {
      const b = document.createElement('button'); b.className = 'btn' + (o.route === 'deep' ? ' purple' : '');
      b.innerHTML = `${o.label}<br><small style="font-weight:400;opacity:.85">${o.desc}</small>`;
      b.onclick = () => {
        for (const x of c.options) if (x.set) delete run.flags[x.set];
        if (o.set) run.flags[o.set] = true;
        if (o.route) run.route = o.route;
        saveRun(); refresh(); SFX.pick(); wipe(cont);
      };
      box.appendChild(b);
    });
    wipe(() => showScreen('sChoice'));
  }
  const decided = (c) => c.options.some((o) => o.set && run.flags[o.set]);

  /* ---- helpers inside a match ---- */
  const depthOf = () => (G.world === 'dream' ? (G.story.night.depth || 1) : 0);
  const addDoubt = (v) => { G.night.doubt = clampN(G.night.doubt + v, 0, 100); };
  const shuffle = (l) => { l = l.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
  function drawDeck() {
    const n = G.night;
    n.deck = shuffle(['lights', 'siren', 'raid', 'deja', 'static', 'lights', 'raid']).filter((k) => !((k === 'siren' && run.flags.tvShot) || (k === 'static' && G.story.night.noflip) || (k === 'deja' && G.story.id === 1)));
  }
  function clockString() {
    const ch = G.story, nt = ch.night, el = clampN((ch.time - G.time) / ch.time, 0, 1), m = Math.floor(nt.t0 + el * nt.span), h24 = Math.floor(m / 60) % 24, mm = m % 60;
    return ((h24 % 12) || 12) + ':' + String(mm).padStart(2, '0') + ' ' + (h24 >= 12 ? 'PM' : 'AM');
  }
  function begin() {
    const ch = G.story, nt = ch.night;
    G.world = nt.world; G.ev = { kind: 'none', t: 0, cycle: 0 }; G.dark = 0;
    G.night = { ch, doubt: run.doubt, bat: 100, sinceFire: 9, kick: 0, t: 0, evT: 12 + Math.random() * 6, darkT: 0, siren: null, receiptT: 0, receiptsUsed: 0, lieT: 2, lieSeed: 0, fakeT: 9, trail: [], trailT: 0, deck: [], lowT: 0, batMsg: 0, lastTags: 0, lose: false };
    G.lie = null; G.lieBadge = false; drawDeck();
    if (nt.noflip) { G.flipT = 1e9; G.topT = 1e9; }
    if (nt.kicks) G.flipT = 16;
    setTimeout(() => { if (G && G.night && state === 'play') { feed(nt.world === 'real' ? 'You are AWAKE in Lincoln' : 'You are in layer ' + (nt.depth || 1)); if (nt.world === 'real' && nt.battery) feed('Crutches: slower. Laser battery is limited.'); } }, 900);
  }
  function spawnRaid() {
    if (G.ents.filter((e) => e.raid).length >= 4) return;
    const slots = [3, 1, 4, 0], c = G.ents.filter((e) => e.raid).length;
    for (let i = 0; i < 2; i++) {
      const e = newEntity('B', 'bot', slots[(c + i) % 4], false); if (!e) continue;
      Object.assign(e, { raid: true, streak: 0, maxStreak: 0, pushes: 0, flips: 0, slowFx: 0, hazCd: 0, shield: 1.5 }); G.ents.push(e);
    }
    banner('CREW RAID!'); feed('Somnus crew dropped in');
  }
  function runEvent(k) {
    const n = G.night, awake = G.world === 'real';
    if (k === 'lights') { n.darkT = awake ? 8 : 5; banner('LIGHTS OUT!'); feed(awake ? "Somnus cut the block's power" : 'The dream blinked'); }
    else if (k === 'siren') { n.siren = { x: -80, dir: 1, w: 170, life: 9, cd: 0 }; banner('SIREN SWEEP'); feed('Stay out of the light'); }
    else if (k === 'raid') spawnRaid();
    else if (k === 'deja') { banner('DEJA VU'); feed('You have been here before'); const old = n.trail[0]; if (old) { G.player.x = old.x; G.player.y = old.y; pushOut(G.player); } addDoubt(14); }
    else if (k === 'static') { banner('STATIC STORM'); flipWorld(null, 'Static storm flipped the world'); }
  }
  function lieStep(dt) {
    const n = G.night; n.lieT -= dt;
    if (n.receiptT > 0) { G.lie = null; G.lieBadge = false; return; }
    if (n.lieT <= 0) {
      n.lieT = 3.5; n.lieSeed = 1 + Math.floor(Math.random() * 9999);
      const d = n.doubt; if (d < 40) { G.lie = null; G.lieBadge = false; return; }
      const ch = (d - 30) / 90; G.lieBadge = Math.random() < ch;
      G.lie = { clock: d >= 55 && Math.random() < ch * 1.3, goal: d >= 70 && Math.random() < ch * 1.3, score: d >= 70 && Math.random() < ch };
    }
    if (n.doubt >= 85) {
      n.fakeT -= dt;
      if (n.fakeT <= 0) { n.fakeT = 8 + Math.random() * 4; const l = ['YOU GOT TAGGED', 'AM I AWAKE?', 'TIME IS UP', "THEY'RE BEHIND YOU"][Math.floor(Math.random() * 4)]; banner(l); feed('HUD: ' + l.toLowerCase()); }
    }
  }
  function update(dt) {
    const n = G.night, p = G.player; n.t += dt; n.batMsg -= dt;
    const depth = depthOf();
    if (depth > 0) addDoubt(0.32 * depth * dt); else addDoubt(-1.6 * dt);
    if (p.tags > n.lastTags) { addDoubt(-1.5 * (p.tags - n.lastTags)); n.lastTags = p.tags; }
    if (n.doubt >= 100) { n.lowT += dt; if (n.lowT > 3 && !n.lose) { n.lose = true; n.lostDoubt = true; banner('LOST IN THE DREAM'); } } else n.lowT = 0;
    if (depth > 0 && p.dead <= 0) { if (p.abilityCd > 0) p.abilityCd = Math.max(0, p.abilityCd - dt * 0.35 * depth); if (p.cool > 0) p.cool = Math.max(0, p.cool - dt * 0.12 * depth); }
    if (G.world === 'real' && G.story.night.battery) { n.sinceFire += dt; if (n.sinceFire > 0.6) n.bat = Math.min(100, n.bat + 7 * dt); } else n.bat = Math.min(100, n.bat + 30 * dt);
    if (n.kick > 0) {
      n.kick -= dt;
      for (const e of G.ents) if (e.team === 'B' && e.dead <= 0) e.rapid = Math.max(e.rapid, 0.25);
      if (Math.floor(n.t * 3) % 3 === 0) G.shake = Math.max(G.shake, 0.05);
      if (n.kick <= 0) { n.kick = 0; banner('YOU LANDED'); addDoubt(-10); n.bat = Math.min(100, n.bat + 40); feed('Kick survived: Doubt eased'); }
    }
    if (n.receiptT > 0) n.receiptT -= dt;
    n.trailT -= dt;
    if (n.trailT <= 0 && p.dead <= 0) { n.trailT = 0.5; n.trail.push({ x: p.x, y: p.y }); if (n.trail.length > 12) n.trail.shift(); }
    n.evT -= dt;
    if (n.evT <= 0) { n.evT = 20 + Math.random() * 12 - depth * 2; if (!n.deck.length) drawDeck(); const k = n.deck.shift(); if (k) runEvent(k); }
    if (n.darkT > 0) n.darkT -= dt;
    G.dark += ((n.darkT > 0.4 ? 1 : 0) - G.dark) * Math.min(1, dt * 4);
    const s = n.siren;
    if (s) {
      s.x += s.dir * (WORLD.w / 6.5) * dt; s.life -= dt; s.cd -= dt;
      if (s.x > WORLD.w + 80) s.dir = -1; else if (s.x < -80) s.dir = 1;
      if (s.life <= 0) n.siren = null;
      else if (p.dead <= 0 && Math.abs(p.x - s.x) < s.w / 2 && s.cd <= 0) {
        s.cd = 3; addDoubt(8); p.slowFx = 1.5;
        for (const e of G.ents) if (e.team === 'B') e.rapid = Math.max(e.rapid, 3.5);
        banner('SPOTTED!'); feed('The siren found you');
      }
    }
    lieStep(dt);
  }

  /* ---- drawing (canvas) ---- */
  function drawScreen(t) {
    const n = G.night, d = depthOf();
    if (d === 2) { ctx.fillStyle = 'rgba(26,204,230,0.05)'; ctx.fillRect(0, 0, VW, VH); }
    else if (d >= 3) { ctx.fillStyle = `rgba(255,38,102,${0.06 + 0.04 * Math.sin(t * 3)})`; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = 'rgba(255,255,255,0.04)'; for (let y = (t * 40) % 8; y < VH; y += 8) ctx.fillRect(0, y, VW, 1); }
    const s = n.siren;
    if (s) { const sx = (s.x - G.cam.x) * Z, w = s.w * Z; ctx.fillStyle = Math.floor(t * 6) % 2 === 0 ? 'rgba(255,26,51,0.28)' : 'rgba(26,76,255,0.28)'; ctx.fillRect(sx - w / 2, 0, w, VH); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(sx - 2, 0, 4, VH); }
    if (n.kick > 0) { ctx.fillStyle = `rgba(255,255,255,${0.04 + 0.04 * Math.sin(t * 14)})`; ctx.fillRect(0, 0, VW, VH); }
    hudCanvas(t, d);
  }
  function hudCanvas(t, d) {
    const n = G.night; let real = G.world === 'real'; if (G.lieBadge) real = !real;
    let clock = clockString(); if (G.lie && G.lie.clock) clock = (1 + (n.lieSeed % 11)) + ':' + String(n.lieSeed % 60).padStart(2, '0') + ' AM';
    const mw = Math.min(150, VW * 0.4), mx = (VW - mw) / 2, top = VW < 720 ? 124 : 88, f = n.doubt / 100;
    const shadow = (s, x, y) => { ctx.strokeStyle = 'rgba(10,6,20,0.9)'; ctx.lineWidth = 3; ctx.strokeText(s, x, y); ctx.fillText(s, x, y); };
    ctx.textAlign = 'center'; ctx.font = '13px Anton, Impact'; ctx.fillStyle = real ? '#f4e8d0' : '#e8d0ff';
    shadow(clock + '  \u2022  ' + (real ? 'AWAKE' : 'LAYER ' + Math.max(1, d)), VW / 2, top + 11);
    ctx.fillStyle = 'rgba(10,6,20,0.65)'; ctx.fillRect(mx - 2, top + 16, mw + 4, 9);
    ctx.fillStyle = n.doubt >= 70 ? '#ff3b55' : n.doubt >= 40 ? '#ff8c28' : '#3fe0d8'; ctx.fillRect(mx, top + 18, mw * f, 5);
    let y2 = top + 36; ctx.font = '10px Anton, Impact'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    if (n.doubt >= 40) { shadow('DOUBT ' + Math.floor(n.doubt) + ' \u2022 HUD MAY LIE', VW / 2, y2); y2 += 12; }
    if (G.world === 'real' && G.story.night.battery) {
      ctx.fillStyle = 'rgba(10,6,20,0.65)'; ctx.fillRect(mx - 2, y2 - 8, mw + 4, 9);
      ctx.fillStyle = n.bat < 20 ? '#ff3b55' : '#7cff6b'; ctx.fillRect(mx, y2 - 6, mw * n.bat / 100, 5);
      if (n.bat < 25) { ctx.fillStyle = '#ff9aa8'; shadow('BATTERY LOW', VW / 2, y2 + 10); }
    }
    if (n.kick > 0) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 8)); ctx.fillStyle = '#ff3b55'; ctx.font = '54px Anton, Impact'; ctx.fillText('KICK  ' + Math.ceil(n.kick), VW / 2, VH * 0.3);
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff'; ctx.font = '16px Anton, Impact'; ctx.fillText("DON'T GET TAGGED", VW / 2, VH * 0.3 + 26); ctx.globalAlpha = 1;
    }
    if (n.receiptT > 0) {
      const rw = Math.min(190, Math.max(150, VW * 0.46)), rh = 170, rx = VW - rw - 8, ry = VW < 500 ? 190 : 124;
      ctx.fillStyle = 'rgba(244,239,224,0.97)'; ctx.fillRect(rx, ry, rw, rh); ctx.strokeStyle = '#1c0f33'; ctx.lineWidth = 2; ctx.strokeRect(rx, ry, rw, rh);
      ctx.textAlign = 'left'; ctx.fillStyle = '#1c0f33'; ctx.font = '13px Anton, Impact';
      ctx.font = (rw < 170 ? 11 : 13) + 'px Anton, Impact'; ctx.fillText('MIGHT BE CASTLE', rx + 12, ry + 22); ctx.fillText('BURGER ...... $2.49', rx + 12, ry + 46); ctx.fillText('FRIES ....... $1.51', rx + 12, ry + 64); ctx.fillText('SHAKE ....... $1.00', rx + 12, ry + 82);
      ctx.fillText('TOTAL ....... $5.00' + (G.world === 'real' ? '*maybe' : ''), rx + 12, ry + 108);
      ctx.fillStyle = G.world === 'real' ? '#2a9e50' : '#8232dc'; ctx.fillText(G.world === 'real' ? 'YOU ARE AWAKE' : 'YOU ARE DREAMING (L' + Math.max(1, d) + ')', rx + 12, ry + 132);
      ctx.fillStyle = '#6a5a80'; ctx.font = '10px Poppins, sans-serif'; ctx.fillText('*maybe = awake', rx + 12, ry + 154);
    }
    ctx.textAlign = 'left';
  }

  /* ---- wrap game.js functions ---- */
  const _fire = fire; fire = function (e, ang) {
    if (G && G.night && e.isPlayer && !(e.cool > 0 || e.dead > 0 || e.frozen > 0)) {
      const n = G.night;
      if (G.world === 'real' && G.story.night.battery) { if (n.bat < 3) { if (n.batMsg <= 0) { banner('BATTERY DEAD'); n.batMsg = 1.2; } return; } n.bat -= 2.4; n.sinceFire = 0; }
    }
    return _fire(e, ang);
  };
  const _hitEnt = hitEnt; hitEnt = function (t, b) {
    const hp = t.hp, sh = t.shield > 0; _hitEnt(t, b);
    if (G && G.night && t.isPlayer && !sh && t.hp < hp) { const n = G.night; if (n.kick > 0) { n.kick = 10; addDoubt(10); banner('FALLING!'); feed('Tagged mid-kick: the timer reset'); } else addDoubt(6); }
  };
  const _applyPickup = applyPickup; applyPickup = function (e, kind) {
    _applyPickup(e, kind);
    if (!(G && G.night && e === G.player)) return;
    const n = G.night;
    if (kind === 'kush') { addDoubt(15); if (G.world === 'real') { G.haze = Math.max(G.haze || 0, 12); feed('The haze filled the real room too'); } else feed('Dream haze: slow-mo, but Doubt goes up'); }
    if (kind === 'burger') { n.bat = Math.min(100, n.bat + 30); addDoubt(-5); }
    if (kind === 'receipt') { n.receiptT = 7; n.receiptsUsed++; G.lie = null; G.lieBadge = false; addDoubt(-25); banner(G.world === 'real' ? "ASTERISK: YOU'RE AWAKE" : 'NO ASTERISK: DREAMING'); SFX.power(); }
  };
  const _flipWorld = flipWorld; flipWorld = function (by, why) {
    _flipWorld(by, why);
    if (!(G && G.night)) return;
    const n = G.night;
    if (G.world === 'real') { if (G.story.night.depth > 0) { n.kick = 10; banner('THE KICK! SURVIVE 10s'); feed("Waking up falls. Don't get tagged."); } } else addDoubt(8);
    if (G.story.night.kicks) G.flipT = 16;
  };
  const _worldSpeed = worldSpeed; worldSpeed = function (e) {
    let k = _worldSpeed(e);
    if (G && G.night && e.isPlayer) { k *= G.world === 'real' ? 0.85 : 1 + 0.06 * depthOf(); if (G.night.kick > 0) k *= 0.85; }
    return k;
  };
  const _twistStep = twistStep; twistStep = function (dt) { _twistStep(dt); if (G && G.night) update(dt); };
  const _drawPickupIcon = drawPickupIcon; drawPickupIcon = function (pk, t) {
    if (pk.kind !== 'receipt') return _drawPickupIcon(pk, t);
    const bob = Math.sin(pk.t * 4) * 5, x = pk.x, y = pk.y * TILT - 34 + bob;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y * TILT, 16 - bob, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4efe0'; ctx.strokeStyle = '#1c0f33'; ctx.lineWidth = 2; ctx.fillRect(x - 12, y - 16, 24, 32); ctx.strokeRect(x - 12, y - 16, 24, 32);
    ctx.fillStyle = '#1c0f33'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 8, y - 10 + i * 6, 16 - (i % 2) * 5, 2); ctx.fillStyle = '#c81e32'; ctx.fillRect(x - 8, y + 12, 8, 2);
  };
  const _storyCheck = storyCheck; storyCheck = function () { if (G.night && G.night.lose) return 'lose'; return _storyCheck(); };
  const _goalText = goalText; goalText = function () {
    let s = _goalText(); const ch = G.story;
    if (ch.bossShort) s = s.replace('PRIME', ch.bossShort);
    if (G.night && G.lie && G.lie.goal) s = s.replace(/\d+/g, (d) => String(Math.max(0, (+d || 0) + (G.night.lieSeed % 5) - 2)));
    return s;
  };
  const _hud = hud; hud = function () {
    _hud();
    if (!(G && G.night && G.lie)) return;
    const s = Math.max(0, Math.ceil(G.time));
    if (G.lie.clock) { const f = Math.max(0, s + (G.night.lieSeed % 90) - 35); $('clock').textContent = Math.floor(f / 60) + ':' + String(f % 60).padStart(2, '0'); }
    if (G.lie.score) { $('tp').textContent = 'PERCI ' + Math.max(0, G.score.P + (G.night.lieSeed % 5) - 1); }
  };
  const _drawScreenFx = drawScreenFx; drawScreenFx = function (t) {
    _drawScreenFx(t); if (G && G.night) drawScreen(t);
  };
  const _twistBegin = twistBegin; twistBegin = function () {
    _twistBegin();
    if (G.story && G.story.night) begin();
  };
  const _startStoryLevel = startStoryLevel; startStoryLevel = function (ch) {
    _startStoryLevel(ch);
    if (ch.night && ch.bossName) { const b = G.ents.find((e) => e.boss); if (b) { b.name = ch.bossName; b.hp = b.maxhp = ch.bossHp || 30; } }
  };
  const _playChapter = playChapter; playChapter = function (id) {
    if (mode !== 'night') return _playChapter(id);
    if (!CHAPTERS[id - 1]) return;
    if (id === 1) { newRun(); refresh(); }
    prepare(CHAPTERS[id - 1]);
    const cb = CHAPTERS[id - 1].choiceBefore; if (cb && !decided(cb)) { ac(); return choice(cb, () => _playChapter(id)); }
    return _playChapter(id);
  };
  let nightRes = null;
  const _storyFinish = storyFinish; storyFinish = function (r) {
    const ch = G.story;
    if (!(G.night && ch.night)) { nightRes = null; return _storyFinish(r); }
    const n = G.night, p = G.player, won = r === 'win';
    run.doubt = clampN(n.doubt * 0.8, 8, 100); run.receipts = (run.receipts || 0) + (n.receiptsUsed || 0);
    nightRes = {}; if (n.lostDoubt) nightRes.lostDoubt = true;
    if (won && ch.id === ND.chapters.length) {
      let stars = 1; if (p.tagged <= 2) stars++; if (ch.goal.type === 'survive' ? p.tagged === 0 : G.time >= 30) stars++;
      const total = totalStars(ch.id, Math.max(stars, storyProg.stars[ch.id] || 0)), d = n.doubt, f = run.flags;
      let key; if (d >= 70) key = 'doubt'; else if (f.doorLocked && f.tvShot && d < 25 && total >= 33) key = 'secret'; else if (run.route === 'deep') key = 'deep'; else key = 'wake';
      const e = ND.endings[key]; ch.outro = e.shots; nightRes.ending = e.name; nightRes.endingSub = e.sub;
      endings[key] = true; try { localStorage.setItem(END_KEY, JSON.stringify(endings)); } catch (x) {}
    }
    saveRun();
    return _storyFinish(r);
  };
  const _showStoryEnd = showStoryEnd; showStoryEnd = function () {
    const go = () => { _showStoryEnd(); const r = storyLast; if (nightRes && r) { if (nightRes.lostDoubt) $('seTitle').textContent = 'LOST IN THE DREAM'; if (nightRes.ending) { $('seTitle').textContent = 'ENDING: ' + nightRes.ending; $('seSub').textContent = nightRes.endingSub; } } };
    const r = storyLast;
    if (mode === 'night' && r && r.won && r.ch.choiceAfter) { const c = r.ch.choiceAfter; return choice(c, () => { nightRes = nightRes && nightRes.ending ? nightRes : null; go(); }); }
    go();
  };

  /* ---- story screen: mode tabs + title button ---- */
  function decorate() {
    const sc = $('sStory'); if (!sc) return;
    let tabs = $('modeTabs');
    if (!tabs) {
      tabs = document.createElement('div'); tabs.id = 'modeTabs'; tabs.className = 'row diff';
      tabs.innerHTML = '<button data-m="night">NIGHT TRIAL</button><button data-m="old">EPISODES 1-6</button>';
      sc.insertBefore(tabs, $('matNote'));
      tabs.querySelectorAll('button').forEach((b) => (b.onclick = () => { setMode(b.dataset.m); renderChapters(); }));
    }
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.m === mode));
    sc.querySelector('h2').textContent = mode === 'night' ? 'NIGHT TRIAL' : 'STORY MODE';
    const p = $('chWrap').querySelector('p');
    if (p) { p.firstChild.textContent = mode === 'night' ? 'One night, 7 PM to 7 AM. Somnus Civic wants you asleep. Your choices change what comes next. ' : 'Play through Episodes 1-6. Clear a chapter to unlock the next. '; }
    if (mode === 'night') { const e = Object.keys(endings).length; $('chStars').textContent += `   ENDINGS ${e}/${ND.order.length}`; }
  }
  const _renderChapters = renderChapters; renderChapters = function () { _renderChapters(); decorate(); };

  function init() {
    try { mode = 'old'; const saved = localStorage.getItem('ps_story_mode'); loadRun(); if (saved === 'night') setMode('night'); } catch (e) {}
    const t = $('bStory');
    if (t && !$('bNight')) {
      const nb = document.createElement('button'); nb.className = 'btn story'; nb.id = 'bNight'; nb.textContent = 'NIGHT TRIAL'; t.parentNode.insertBefore(nb, t);
      nb.onclick = () => { setMode('night'); openStory(); };
      t.onclick = () => { setMode('old'); openStory(); };
    }
    Object.assign(SPEAKER, { somnus: { name: 'SOMNUS REP', img: 'brokepilot', col: '#7aa8ff' }, landlord: { name: 'THE LANDLORD', img: 'brokepilot', col: '#ff5a5a' } });
  }
  init();
  return { setMode, get mode() { return mode; }, begin, update, prepare, refresh };
})();


/* =====================================================================================================
   COIN CATCH: a 45-second arcade mini game that earns ZEV Coins (same as the handheld edition).
   Catch coins (+1) and burgers (+3), dodge alarm clocks. Reward = 80% of score, max 40 per run, 150 per day.
   ===================================================================================================== */
const COIN = (() => {
  const DAILY_CAP = 150, RUN_CAP = 40, KEY = 'ps_mini_v1';
  const today = () => new Date().toISOString().slice(0, 10);
  const earnedToday = () => { try { const d = JSON.parse(localStorage.getItem(KEY) || '{}'); return d.day === today() ? d.n || 0 : 0; } catch (e) { return 0; } };
  let el, cv, g, M = null, raf = 0, last = 0, keys = {}, best = 0;
  function build() {
    if (el) return;
    el = document.createElement('div'); el.id = 'coinCatch';
    el.style.cssText = 'position:fixed;inset:0;z-index:60;display:none;background:#0c0618;align-items:center;justify-content:center;touch-action:none';
    el.innerHTML = '<canvas id="ccCv" width="720" height="720" style="width:min(100vw,100vh);height:min(100vw,100vh);touch-action:none"></canvas><button class="btn alt small" id="ccQuit" style="position:absolute;top:calc(10px + env(safe-area-inset-top));right:10px">QUIT</button>';
    document.body.appendChild(el); cv = $('ccCv'); g = cv.getContext('2d');
    $('ccQuit').onclick = close;
    const mv = (e) => { if (!M || M.phase !== 'play') return; const r = cv.getBoundingClientRect(), x = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * 720; M.x = Math.max(50, Math.min(670, x)); };
    cv.addEventListener('pointermove', mv); cv.addEventListener('pointerdown', (e) => { if (M && M.phase === 'done') { start(); return; } mv(e); });
    addEventListener('keydown', (e) => { if (el.style.display === 'none') return; keys[e.key] = 1; if (e.key === 'Escape') close(); if ((e.key === 'Enter' || e.key === ' ') && M && M.phase === 'done') start(); });
    addEventListener('keyup', (e) => { delete keys[e.key]; });
  }
  function open() { build(); showScreen(null); el.style.display = 'flex'; state = 'mini'; start(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
  function close() { cancelAnimationFrame(raf); if (el) el.style.display = 'none'; M = null; state = 'menu'; showScreen('sTitle'); syncCoinChips(); }
  function start() { M = { phase: 'play', t: 45, el: 0, score: 0, lives: 3, x: 360, items: [], spawn: 0.4, hurt: 0, pops: [] }; }
  function finish() {
    const earned = earnedToday(), want = Math.min(RUN_CAP, Math.floor(M.score * 0.8)), give = Math.max(0, Math.min(want, DAILY_CAP - earned));
    if (give > 0) { PROG.coins += give; saveProg(); walletEarn(give); try { localStorage.setItem(KEY, JSON.stringify({ day: today(), n: earned + give })); } catch (e) {} }
    M.reward = give; M.capped = give < want; best = Math.max(best, M.score); M.phase = 'done'; (give > 0 ? SFX.win : SFX.lose)();
  }
  function step(dt) {
    if (!M || M.phase !== 'play') return;
    M.t -= dt; M.el += dt; M.hurt = Math.max(0, M.hurt - dt);
    const mx = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
    M.x = Math.max(50, Math.min(670, M.x + mx * 440 * dt));
    M.spawn -= dt;
    if (M.spawn <= 0) { M.spawn = Math.max(0.22, 0.65 - M.el * 0.009); const r = Math.random(); M.items.push({ x: 40 + Math.random() * 640, y: -20, kind: r < 0.55 ? 'coin' : r < 0.72 ? 'burger' : 'alarm', v: 190 + M.el * 4 + Math.random() * 40 }); }
    for (const it of M.items) {
      it.y += it.v * dt;
      if (!it.gone && it.y > 585 && it.y < 665 && Math.abs(it.x - M.x) < 48) {
        it.gone = true;
        if (it.kind === 'coin') { M.score++; M.pops.push({ x: it.x, y: it.y, txt: '+1', life: 0.6, col: '#ffd60a' }); SFX.pick(); }
        else if (it.kind === 'burger') { M.score += 3; M.pops.push({ x: it.x, y: it.y, txt: '+3', life: 0.6, col: '#ff9f40' }); SFX.pick(); }
        else { M.lives--; M.hurt = 0.4; M.pops.push({ x: it.x, y: it.y, txt: 'OUCH', life: 0.7, col: '#ff5a5a' }); SFX.hit(); }
      }
      if (it.y > 740) it.gone = true;
    }
    M.items = M.items.filter((i) => !i.gone);
    for (const p of M.pops) { p.y -= 50 * dt; p.life -= dt; } M.pops = M.pops.filter((p) => p.life > 0);
    if (M.t <= 0 || M.lives <= 0) finish();
  }
  function txt(s, x, y, size, col, a = 1) { g.globalAlpha = a; g.font = size + 'px Anton, Impact'; g.textAlign = 'center'; g.fillStyle = col; g.fillText(s, x, y); g.globalAlpha = 1; }
  function draw(t) {
    g.fillStyle = '#1a0f33'; g.fillRect(0, 0, 720, 720); g.fillStyle = 'rgba(110,36,200,0.18)'; g.fillRect(0, 0, 720, 720);
    g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { g.globalAlpha = 0.2 + 0.2 * Math.sin(t * 2 + i); g.fillRect((i * 97) % 720, (i * 53 + t * 8) % 650, 2, 2); } g.globalAlpha = 1;
    if (M.phase === 'done') {
      txt('COIN CATCH', 360, 140, 64, '#ffd60a'); txt('SCORE  ' + M.score, 360, 250, 40, '#fff');
      txt('+' + M.reward + ' ZEV COINS', 360, 340, 60, M.reward > 0 ? '#7cff6b' : '#ff5a5a');
      if (M.capped) txt('Daily limit reached: ' + DAILY_CAP + ' coins a day', 360, 395, 22, '#fff', 0.75);
      txt('BEST THIS SESSION  ' + best, 360, 440, 22, '#c070ff'); txt('TAP TO PLAY AGAIN', 360, 540, 26, '#fff', 0.85); return;
    }
    g.fillStyle = '#331f4d'; g.fillRect(0, 650, 720, 70); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 650, 720, 4);
    for (const it of M.items) {
      if (it.kind === 'coin') { g.fillStyle = '#ffd60a'; g.beginPath(); g.arc(it.x, it.y, 15, 0, 7); g.fill(); g.strokeStyle = '#997300'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#997300'; g.fillRect(it.x - 3, it.y - 8, 6, 16); }
      else if (it.kind === 'burger') { g.fillStyle = '#f29e40'; rr(g, it.x - 18, it.y - 14, 36, 12, 8); g.fill(); g.fillStyle = '#66331a'; g.fillRect(it.x - 18, it.y - 2, 36, 7); g.fillStyle = '#f29e40'; rr(g, it.x - 18, it.y + 5, 36, 10, 6); g.fill(); }
      else { g.fillStyle = '#e62640'; g.beginPath(); g.arc(it.x, it.y, 17, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(it.x, it.y, 12, 0, 7); g.fill(); g.strokeStyle = '#1a1a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(it.x, it.y); g.lineTo(it.x, it.y - 8); g.moveTo(it.x, it.y); g.lineTo(it.x + 6, it.y + 2); g.stroke(); g.fillStyle = '#e62640'; g.beginPath(); g.arc(it.x - 14, it.y - 15, 5, 0, 7); g.arc(it.x + 14, it.y - 15, 5, 0, 7); g.fill(); }
    }
    const head = IMG.perci && IMG.perci.complete && IMG.perci.naturalWidth ? IMG.perci : null;
    if (head) g.drawImage(head, M.x - 28, 584, 56, 56); else { g.fillStyle = '#ffd60a'; g.beginPath(); g.arc(M.x, 612, 28, 0, 7); g.fill(); }
    g.fillStyle = '#cc8c4d'; rr(g, M.x - 44, 632, 88, 22, 6); g.fill(); g.strokeStyle = '#66401a'; g.lineWidth = 3; g.stroke();
    for (const p of M.pops) txt(p.txt, p.x, p.y, 22, p.col, Math.min(1, p.life * 2));
    txt('TIME ' + Math.ceil(M.t), 120, 40, 30, '#fff'); txt('SCORE ' + M.score, 360, 40, 30, '#ffd60a'); txt('LIVES ' + '♥'.repeat(Math.max(0, M.lives)), 590, 40, 30, '#ff5a8a');
    txt('Drag or use arrows. Catch coins and burgers, dodge the alarm clocks.', 360, 76, 18, '#fff', 0.7);
    if (M.hurt > 0) { g.fillStyle = `rgba(255,26,51,${M.hurt * 0.6})`; g.fillRect(0, 0, 720, 720); }
  }
  function loop(now) { const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; step(dt); if (M) draw(now / 1000); raf = requestAnimationFrame(loop); }
  function init() {
    const st = $('bStore'); if (!st || $('bCoin')) return;
    const b = document.createElement('button'); b.className = 'btn gold'; b.id = 'bCoin'; b.innerHTML = 'COIN CATCH <span class="coin">FREE COINS</span>';
    st.parentNode.insertBefore(b, st.nextSibling); b.onclick = () => { ac(); wipe(open); };
  }
  init();
  return { open };
})();


/* =====================================================================================================
   PAUSE MENU (solo play): P / Esc / the II button opens it. Resume, sound, aim assist, auto-fire, quit.
   ===================================================================================================== */
(() => {
  let pm = null, quitArm = 0;
  const AIM = { 1: 'OFF', 2: 'LIGHT', 3: 'STRONG' };
  function build() {
    if (pm) return;
    pm = document.createElement('div'); pm.id = 'pauseMenu';
    pm.style.cssText = 'position:fixed;inset:0;z-index:45;display:none;flex-direction:column;align-items:center;justify-content:safe center;overflow-y:auto;gap:10px;background:rgba(8,4,16,.74);padding:20px;touch-action:manipulation';
    pm.innerHTML = '<div class="big" style="color:var(--gold);margin-bottom:6px">PAUSED</div><div id="pmWhere" class="muted" style="margin:-4px 0 8px;text-align:center"></div>'
      + '<button class="btn" id="pmResume">RESUME</button>'
      + '<button class="btn alt" id="pmSound"></button>'
      + '<button class="btn alt" id="pmAim"></button>'
      + '<button class="btn alt" id="pmAuto"></button>'
      + '<button class="btn alt" id="pmPov"></button>'
      + '<button class="btn alt" id="pmCam"></button>'
      + '<button class="btn alt small" id="pmQuit">QUIT MATCH</button>'
      + '<div class="muted" style="font-size:12px;margin-top:4px">' + (TOUCH ? 'Tap RESUME to keep playing' : 'Press P or Esc to resume') + '</div>';
    document.body.appendChild(pm);
    for (const b of pm.querySelectorAll('button')) { b.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true }); b.addEventListener('mousedown', (e) => e.stopPropagation()); }
    $('pmResume').onclick = resume;
    $('pmSound').onclick = () => { $('muteBtn').onclick(); sync(); };
    $('pmAim').onclick = () => { aimAssist = aimAssist >= 3 ? 1 : aimAssist + 1; localStorage.setItem('ps_assist', String(aimAssist)); syncSettings(); sync(); };
    $('pmAuto').onclick = () => { autoFire = !autoFire; localStorage.setItem('ps_auto', autoFire ? '1' : '0'); syncSettings(); syncAutoBtn(); sync(); };
    $('pmPov').onclick = () => { setPov(pov === '1st' ? '3rd' : '1st'); sync(); };
    $('pmCam').onclick = () => { camMode = camMode === 'lead' ? 'center' : 'lead'; localStorage.setItem('ps_cam', camMode); sync(); };
    $('pmQuit').onclick = quit;
  }
  function sync() {
    $('pmSound').textContent = 'SOUND: ' + (muted ? 'OFF' : 'ON');
    $('pmAim').textContent = 'AIM ASSIST: ' + (AIM[aimAssist] || 'OFF');
    $('pmAuto').textContent = 'AUTO-FIRE: ' + (autoFire ? 'ON' : 'OFF'); $('pmAuto').style.display = TOUCH ? '' : 'none';
    $('pmPov').textContent = 'VIEW: ' + (pov === '1st' ? 'FIRST PERSON' : 'THIRD PERSON'); $('pmCam').style.display = pov === '1st' ? 'none' : '';
    $('pmCam').textContent = 'CAMERA: ' + (camMode === 'lead' ? 'FOLLOWS THE FIGHT' : 'CENTERED ON ME');
    $('pmQuit').textContent = quitArm ? 'TAP AGAIN TO QUIT' : 'QUIT MATCH';
    $('pmWhere').textContent = G && G.story ? `Chapter ${G.story.id}: "${G.story.title}"  •  ${G.story.goal.text}` : 'Quick match';
  }
  function resume() { quitArm = 0; input.mdown = false; if (state === 'paused') state = 'play'; hide(); }
  function quit() {
    if (!quitArm) { quitArm = 1; sync(); setTimeout(() => { quitArm = 0; if (pm && pm.style.display !== 'none') sync(); }, 3000); return; }
    quitArm = 0; hide();
    const story = G && G.story; if (storyDiffSave) { diff = storyDiffSave; storyDiffSave = null; }
    state = 'menu'; $('hud').classList.remove('on'); document.body.classList.remove('playing', 'story');
    if (story) { renderChapters(); showScreen('sStory'); } else { showScreen('sTitle'); }
  }
  function hide() { if (pm) pm.style.display = 'none'; }
  function show() { build(); quitArm = 0; sync(); pm.style.display = 'flex'; }
  setInterval(() => {
    const want = state === 'paused' && G && !MP.on;
    const on = pm && pm.style.display !== 'none';
    if (want && !on) show(); else if (!want && on) hide();
  }, 80);
})();


document.querySelectorAll('.cov').forEach((el) => el.remove());   // cover buttons were removed; drop any stale ones
})();
