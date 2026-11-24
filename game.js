/* Perci Shorti vs BROKE-pilot: Dream Laser Tag (5v5). (c) ZEV DOD. Vanilla JS, no build step. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const cvs = $('game'), ctx = cvs.getContext('2d');
let DPR = 1, VW = 0, VH = 0;
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight; cvs.width = VW * DPR; cvs.height = VH * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
addEventListener('resize', resize); resize();

/* ---------------- data ---------------- */
const CHARS = {
  perci:   { name: 'PERCI',   role: 'Gold blaster. Tough. A little too relaxed.', speed: 205, rate: 0.26, dmg: 1, range: 560, spread: 0.05, shot: '#ffd60a', hp: 4, ability: "LET'S GOOO!", abilityDesc: 'Rapid fire for 4s', cd: 12, stats: [3, 3, 4, 3] },
  miracle: { name: 'MIRACLE', role: 'A+ student. Fast trigger finger.',           speed: 235, rate: 0.17, dmg: 1, range: 520, spread: 0.07, shot: '#34a8a6', hp: 3, ability: 'A+ OVERRIDE', abilityDesc: 'Slows all bots for 4s', cd: 14, stats: [4, 4, 3, 3] },
  chatgpt: { name: 'CHATGPT', role: 'Calm. Knows too much. Long-range beam.',     speed: 195, rate: 0.55, dmg: 2, range: 820, spread: 0.0,  shot: '#00e6ff', hp: 3, ability: 'LOG OUT',     abilityDesc: 'Teleport-dash forward', cd: 7, stats: [2, 2, 5, 3] },
  jessica: { name: 'JESSICA', role: 'Coder. Shots bounce off walls.',             speed: 225, rate: 0.24, dmg: 1, range: 600, spread: 0.04, shot: '#7cff6b', hp: 3, ability: 'SUDO HACK',   abilityDesc: 'Freezes the nearest bot 3s', cd: 10, stats: [3, 3, 3, 5], bounce: true },
  mixi:    { name: 'MIXI',    role: 'Smallest, fastest, level 99.',               speed: 270, rate: 0.21, dmg: 1, range: 480, spread: 0.08, shot: '#ff78c8', hp: 3, ability: 'LEVEL 99',    abilityDesc: 'Shield blocks all hits 3s', cd: 13, stats: [5, 3, 2, 4], small: true },
};
const ORDER = ['perci', 'miracle', 'chatgpt', 'jessica', 'mixi'];
const BOT_NAMES = ['BROKE-pilot', 'A+ Bot', 'The Grader', 'Show-Your-Work', 'Vacuum-Tron'];
const DIFF = { easy: { acc: 0.32, react: 0.75, mult: 0.75, speed: 0.85 }, normal: { acc: 0.18, react: 0.45, mult: 1, speed: 1 }, hard: { acc: 0.09, react: 0.25, mult: 1.5, speed: 1.12 } };
const MATCH_TIME = 120, RESPAWN = 3, WORLD = { w: 1800, h: 1200 };

/* ---------------- assets ---------------- */
const IMG = {};
['perci', 'miracle', 'chatgpt', 'jessica', 'mixi', 'brokepilot', 'aplus'].forEach((k) => { const i = new Image(); i.src = 'assets/' + (k === 'aplus' ? 'aplus' : k + '_tok') + '.png'; IMG[k] = i; });

/* ---------------- audio (synth) ---------------- */
let AC = null, muted = localStorage.getItem('ps_muted') === '1';
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; }
function beep(f0, f1, dur, type = 'square', vol = 0.06) {
  if (muted) return; const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, a.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
const SFX = { pew: () => beep(1400, 380, 0.09, 'square', 0.035), beam: () => beep(600, 1800, 0.18, 'sawtooth', 0.04), hit: () => beep(220, 80, 0.12, 'triangle', 0.08), tag: () => { beep(880, 220, 0.25, 'sawtooth', 0.06); }, power: () => { beep(300, 1200, 0.35, 'sine', 0.08); }, pick: () => beep(900, 1600, 0.12, 'sine', 0.07), win: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, f, 0.25, 'square', 0.05), i * 140)); }, lose: () => { [392, 330, 262].forEach((f, i) => setTimeout(() => beep(f, f * 0.95, 0.3, 'triangle', 0.07), i * 180)); } };

/* ---------------- arena ---------------- */
function buildWalls() {
  const W = WORLD.w, H = WORLD.h, w = [];
  const add = (x, y, ww, hh, kind = 'hay') => w.push({ x, y, w: ww, h: hh, kind });
  add(-40, -40, W + 80, 40, 'edge'); add(-40, H, W + 80, 40, 'edge'); add(-40, 0, 40, H, 'edge'); add(W, 0, 40, H, 'edge');
  // symmetric cover
  const half = [[300, 220, 120, 60], [300, 1020, 120, 60], [520, 560, 60, 180], [700, 300, 160, 50], [700, 950, 160, 50], [860, 600, 90, 100], [420, 400, 70, 70], [420, 830, 70, 70], [640, 140, 60, 110], [640, 1050, 60, 110], [760, 520, 60, 60], [760, 720, 60, 60]];
  half.forEach(([x, y, ww, hh], i) => { add(x, y, ww, hh, i % 2 ? 'crate' : 'hay'); add(W - x - ww, y, ww, hh, i % 2 ? 'crate' : 'hay'); });
  add(960, 160, 80, 160, 'glitch'); add(960, 980, 80, 160, 'glitch');
  return w;
}
let WALLS = buildWalls();

/* ---------------- state ---------------- */
let state = 'menu', pick = localStorage.getItem('ps_pick') || 'perci', diff = localStorage.getItem('ps_diff') || 'normal';
let G = null; // match
const input = { keys: {}, mx: 0, my: 0, mdown: false, touchMove: null, touchAim: null, ability: false };

function newEntity(team, kind, i, isPlayer) {
  const c = team === 'P' ? CHARS[kind] : null;
  const base = team === 'P' ? { x: 130, y: 220 + i * 190 } : { x: WORLD.w - 130, y: 220 + i * 190 };
  return {
    team, kind, isPlayer, name: team === 'P' ? CHARS[kind].name : BOT_NAMES[i], spawn: { ...base }, x: base.x, y: base.y, vx: 0, vy: 0, a: team === 'P' ? 0 : Math.PI,
    r: c && c.small ? 17 : 21, hp: c ? c.hp : 3, maxhp: c ? c.hp : 3, cool: 0, dead: 0, abilityCd: 0, rapid: 0, shield: 0, frozen: 0,
    stats: c || { speed: 200, rate: 0.36, dmg: 1, range: 560, spread: 0.06, shot: '#ff8c28' }, tags: 0, tagged: 0, shots: 0, hits: 0,
    ai: { target: null, think: 0, strafe: Math.random() < 0.5 ? 1 : -1, wander: { x: WORLD.w / 2, y: WORLD.h / 2 }, react: 0 },
  };
}

function startMatch() {
  const others = ORDER.filter((k) => k !== pick);
  const P = [newEntity('P', pick, 2, true)].concat(others.map((k, i) => newEntity('P', k, [0, 1, 3, 4][i], false)));
  const B = [0, 1, 2, 3, 4].map((i) => newEntity('B', 'bot', i, false));
  G = { ents: P.concat(B), player: P[0], bullets: [], parts: [], pickups: [], score: { P: 0, B: 0 }, time: MATCH_TIME, slow: 0, over: false, pickupT: 6, cam: { x: 0, y: 0 }, shake: 0, startedAt: Date.now(), banner: 2.0 };
  G.player.x = G.player.spawn.x = 160; G.player.y = G.player.spawn.y = WORLD.h / 2;
  showScreen(null); $('hud').classList.add('on'); document.body.classList.add('playing'); if (document.activeElement) document.activeElement.blur(); state = 'play'; feed('Match start! Tag BROKE-pilot\'s bots!'); banner('FIGHT!');
  if (ac() && AC.state === 'suspended') AC.resume();
}

/* ---------------- helpers ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function circleRect(x, y, r, w) { const cx = clamp(x, w.x, w.x + w.w), cy = clamp(y, w.y, w.y + w.h); return (x - cx) ** 2 + (y - cy) ** 2 < r * r; }
function moveEnt(e, dx, dy) {
  e.x += dx; for (const w of WALLS) if (circleRect(e.x, e.y, e.r, w)) { e.x -= dx; break; }
  e.y += dy; for (const w of WALLS) if (circleRect(e.x, e.y, e.r, w)) { e.y -= dy; break; }
}
function segHitsRect(x1, y1, x2, y2, w) {
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy], q = [x1 - w.x, w.x + w.w - x1, y1 - w.y, w.y + w.h - y1];
  for (let i = 0; i < 4; i++) { if (p[i] === 0) { if (q[i] < 0) return false; } else { const t = q[i] / p[i]; if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } } }
  return true;
}
function los(a, b) { for (const w of WALLS) { if (w.kind === 'edge') continue; if (segHitsRect(a.x, a.y, b.x, b.y, w)) return false; } return true; }
function feed(msg) { const d = document.createElement('div'); d.textContent = msg; $('feed').prepend(d); setTimeout(() => d.remove(), 3600); while ($('feed').children.length > 5) $('feed').lastChild.remove(); }
let bannerT = null;
function banner(t) { const b = $('banner'); b.textContent = t; b.style.opacity = 1; clearTimeout(bannerT); bannerT = setTimeout(() => (b.style.opacity = 0), 1100); }

/* ---------------- combat ---------------- */
function fire(e, ang) {
  const s = e.stats;
  if (e.cool > 0 || e.dead > 0 || e.frozen > 0) return;
  const rapid = e.rapid > 0 ? 0.45 : 1;
  e.cool = s.rate * rapid * (e.team === 'B' && G.slow > 0 ? 1.8 : 1);
  const spread = (Math.random() - 0.5) * 2 * (s.spread + (e.isPlayer ? 0 : e.team === 'B' ? DIFF[diff].acc : 0.2));
  const a = ang + spread, sp = e.kind === 'chatgpt' ? 1500 : 900;
  G.bullets.push({ x: e.x + Math.cos(a) * (e.r + 6), y: e.y + Math.sin(a) * (e.r + 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: s.range / sp, owner: e, team: e.team, dmg: s.dmg, col: s.shot, bounce: s.bounce ? 1 : 0, beam: e.kind === 'chatgpt' });
  e.shots++;
  if (e.isPlayer) (e.kind === 'chatgpt' ? SFX.beam : SFX.pew)();
}
function hitEnt(t, b) {
  if (t.shield > 0) { spark(b.x, b.y, '#ffffff', 6); return; }
  t.hp -= b.dmg; b.owner.hits++; spark(b.x, b.y, b.col, 10);
  if (t.isPlayer) { G.shake = 0.25; SFX.hit(); }
  if (t.hp <= 0) {
    t.dead = RESPAWN; t.tagged++; b.owner.tags++; G.score[b.team]++;
    spark(t.x, t.y, t.team === 'P' ? '#ff5050' : '#ff8c28', 26);
    feed(`${b.owner.name} tagged ${t.name}`);
    if (b.owner.isPlayer) { SFX.tag(); banner(['TAGGED!', 'GOT EM!', 'A-PLUS SHOT!', 'LET\'S GOOO!'][Math.floor(Math.random() * 4)]); }
    if (t.isPlayer) banner('YOU GOT TAGGED');
  }
}
function spark(x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 220; G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.35, col }); } }

function useAbility(e) {
  if (e.abilityCd > 0 || e.dead > 0) return;
  const c = CHARS[e.kind]; e.abilityCd = c.cd;
  if (e.isPlayer) { SFX.power(); banner(c.ability); }
  if (e.kind === 'perci') e.rapid = 4;
  if (e.kind === 'miracle') { G.slow = 4; spark(e.x, e.y, '#ff8c28', 30); }
  if (e.kind === 'mixi') e.shield = 3;
  if (e.kind === 'jessica') { const t = G.ents.filter((o) => o.team === 'B' && o.dead <= 0).sort((a, b) => dist(a, e) - dist(b, e))[0]; if (t) { t.frozen = 3; spark(t.x, t.y, '#7cff6b', 24); } }
  if (e.kind === 'chatgpt') { const ox = e.x, oy = e.y; for (let k = 0; k < 14; k++) moveEnt(e, Math.cos(e.a) * 18, Math.sin(e.a) * 18); spark(ox, oy, '#00e6ff', 20); spark(e.x, e.y, '#00e6ff', 20); }
}

/* ---------------- AI ---------------- */
function aiThink(e, dt) {
  const d = DIFF[diff];
  e.ai.think -= dt;
  const foes = G.ents.filter((o) => o.team !== e.team && o.dead <= 0);
  if (e.ai.think <= 0) {
    e.ai.think = 0.3 + Math.random() * 0.3;
    let best = null, bd = 1e9;
    for (const f of foes) { const dd = dist(e, f) * (los(e, f) ? 1 : 1.8) * (f.isPlayer && e.team === 'B' ? 0.85 : 1); if (dd < bd) { bd = dd; best = f; } }
    if (best !== e.ai.target) e.ai.react = e.team === 'B' ? d.react : 0.3;
    e.ai.target = best;
    if (Math.random() < 0.08) e.ai.strafe *= -1;
    if (Math.random() < 0.15) e.ai.wander = { x: 200 + Math.random() * (WORLD.w - 400), y: 150 + Math.random() * (WORLD.h - 300) };
    if (e.team === 'P' && e.abilityCd <= 0 && best && dist(e, best) < 500 && Math.random() < 0.25) useAbility(e);
  }
  const t = e.ai.target;
  let mx = 0, my = 0;
  const spd = e.stats.speed * (e.team === 'B' ? d.speed * (G.slow > 0 ? 0.5 : 1) : 0.85);
  // pickups when hurt
  const pk = G.pickups.find((p) => dist(p, e) < 400);
  if (pk && e.hp < e.maxhp && e.team === 'P') { const a = Math.atan2(pk.y - e.y, pk.x - e.x); mx = Math.cos(a); my = Math.sin(a); }
  else if (t) {
    const dd = dist(e, t), a = Math.atan2(t.y - e.y, t.x - e.x), want = e.stats.range * 0.55, see = los(e, t);
    if (!see) { mx = Math.cos(a); my = Math.sin(a); }
    else { const fwd = dd > want ? 1 : dd < want * 0.6 ? -1 : 0; mx = Math.cos(a) * fwd + Math.cos(a + Math.PI / 2) * e.ai.strafe * 0.8; my = Math.sin(a) * fwd + Math.sin(a + Math.PI / 2) * e.ai.strafe * 0.8; }
    e.a = a;
    e.ai.react -= dt;
    if (see && dd < e.stats.range && e.ai.react <= 0) fire(e, a + (t.vx || 0) * 0.0004 * dd / 10);
  } else { const a = Math.atan2(e.ai.wander.y - e.y, e.ai.wander.x - e.x); mx = Math.cos(a); my = Math.sin(a); }
  const m = Math.hypot(mx, my) || 1;
  const ox = e.x, oy = e.y;
  moveEnt(e, (mx / m) * spd * dt, (my / m) * spd * dt);
  if (Math.abs(e.x - ox) + Math.abs(e.y - oy) < spd * dt * 0.2) e.ai.strafe *= -1;
  e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt;
}

/* ---------------- update ---------------- */
function update(dt) {
  if (!G || state !== 'play') return;
  G.time -= dt; G.slow = Math.max(0, G.slow - dt); G.shake = Math.max(0, G.shake - dt);
  if (G.time <= 0) return endMatch();
  const p = G.player;
  for (const e of G.ents) {
    e.cool = Math.max(0, e.cool - dt); e.abilityCd = Math.max(0, e.abilityCd - dt); e.rapid = Math.max(0, e.rapid - dt); e.shield = Math.max(0, e.shield - dt); e.frozen = Math.max(0, e.frozen - dt);
    if (e.dead > 0) { e.dead -= dt; if (e.dead <= 0) { e.hp = e.maxhp; e.x = e.spawn.x; e.y = e.spawn.y; e.shield = 1.2; } continue; }
    if (e.frozen > 0) continue;
    if (e.isPlayer) {
      let mx = 0, my = 0; const k = input.keys;
      if (k.KeyW || k.ArrowUp) my -= 1; if (k.KeyS || k.ArrowDown) my += 1; if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1;
      if (input.touchMove) { mx = input.touchMove.dx; my = input.touchMove.dy; }
      const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
      const ox = e.x, oy = e.y; moveEnt(e, mx * e.stats.speed * dt, my * e.stats.speed * dt); e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt;
      if (input.touchAim) { e.a = Math.atan2(input.touchAim.dy, input.touchAim.dx); if (input.touchAim.m > 0.35) fire(e, e.a); }
      else { e.a = Math.atan2(input.my + G.cam.y - e.y, input.mx + G.cam.x - e.x); if (input.mdown) fire(e, e.a); }
      if (input.ability) { input.ability = false; useAbility(e); }
    } else aiThink(e, dt);
  }
  // bullets
  for (const b of G.bullets) {
    const steps = 3;
    for (let s = 0; s < steps && b.life > 0; s++) {
      const nx = b.x + (b.vx * dt) / steps, ny = b.y + (b.vy * dt) / steps;
      let wall = null; for (const w of WALLS) if (nx > w.x && nx < w.x + w.w && ny > w.y && ny < w.y + w.h) { wall = w; break; }
      if (wall) {
        if (b.bounce > 0) { b.bounce--; const inX = b.x > wall.x && b.x < wall.x + wall.w; if (inX) b.vy *= -1; else b.vx *= -1; }
        else { b.life = 0; spark(b.x, b.y, b.col, 4); }
        break;
      }
      b.x = nx; b.y = ny;
      for (const e of G.ents) { if (e.team === b.team || e.dead > 0) continue; if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (e.r + 4) ** 2) { hitEnt(e, b); b.life = 0; break; } }
    }
    b.life -= dt;
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92; q.life -= dt; }
  G.parts = G.parts.filter((q) => q.life > 0);
  // pickups
  G.pickupT -= dt;
  if (G.pickupT <= 0 && G.pickups.length < 3) { G.pickupT = 9; for (let tries = 0; tries < 20; tries++) { const x = 300 + Math.random() * (WORLD.w - 600), y = 150 + Math.random() * (WORLD.h - 300); if (!WALLS.some((w) => circleRect(x, y, 30, w))) { G.pickups.push({ x, y, t: 0 }); break; } } }
  for (const pk of G.pickups) { pk.t += dt; for (const e of G.ents) if (e.dead <= 0 && dist(e, pk) < e.r + 22 && e.hp < e.maxhp) { e.hp = Math.min(e.maxhp, e.hp + 1); pk.gone = true; if (e.isPlayer) { SFX.pick(); banner('+1 SHIELD'); } break; } }
  G.pickups = G.pickups.filter((q) => !q.gone);
  G.cam.x = clamp(p.x - VW / 2, -60, WORLD.w - VW + 60); G.cam.y = clamp(p.y - VH / 2, -60, WORLD.h - VH + 60);
  if (WORLD.w < VW) G.cam.x = (WORLD.w - VW) / 2; if (WORLD.h < VH) G.cam.y = (WORLD.h - VH) / 2;
  hud();
}

/* ---------------- render ---------------- */
function drawWorld(t) {
  ctx.fillStyle = '#0d0b14'; ctx.fillRect(0, 0, VW, VH);
  const sx = G.shake > 0 ? (Math.random() - 0.5) * 10 : 0, sy = G.shake > 0 ? (Math.random() - 0.5) * 10 : 0;
  ctx.save(); ctx.translate(-G.cam.x + sx, -G.cam.y + sy);
  // floor
  const grd = ctx.createLinearGradient(0, 0, WORLD.w, WORLD.h); grd.addColorStop(0, '#24123a'); grd.addColorStop(0.5, '#1a1030'); grd.addColorStop(1, '#2a1416');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.strokeStyle = 'rgba(130,80,220,0.18)'; ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.w; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.h); ctx.stroke(); }
  for (let y = 0; y <= WORLD.h; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD.w, y); ctx.stroke(); }
  // bases
  ctx.fillStyle = 'rgba(200,30,50,0.13)'; ctx.fillRect(0, 0, 260, WORLD.h); ctx.fillStyle = 'rgba(255,140,40,0.13)'; ctx.fillRect(WORLD.w - 260, 0, 260, WORLD.h);
  ctx.font = '42px Anton, Impact'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillText('TEAM PERCI', 130, WORLD.h / 2); ctx.fillText('BROKE-PILOT', WORLD.w - 130, WORLD.h / 2);
  ctx.fillText('BUILDING 8 • DREAM LEVEL', WORLD.w / 2, WORLD.h / 2 + 14);
  // walls
  for (const w of WALLS) {
    if (w.kind === 'edge') continue;
    ctx.fillStyle = w.kind === 'hay' ? '#c8aa50' : w.kind === 'crate' ? '#7a4e34' : 'rgba(0,230,255,0.25)';
    ctx.strokeStyle = '#100814'; ctx.lineWidth = 4; ctx.fillRect(w.x, w.y, w.w, w.h); ctx.strokeRect(w.x, w.y, w.w, w.h);
    if (w.kind === 'hay') { ctx.strokeStyle = 'rgba(120,90,30,0.7)'; ctx.lineWidth = 2; for (let yy = w.y + 12; yy < w.y + w.h; yy += 14) { ctx.beginPath(); ctx.moveTo(w.x + 4, yy); ctx.lineTo(w.x + w.w - 4, yy); ctx.stroke(); } }
    if (w.kind === 'crate') { ctx.strokeStyle = 'rgba(30,15,10,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + w.w, w.y + w.h); ctx.moveTo(w.x + w.w, w.y); ctx.lineTo(w.x, w.y + w.h); ctx.stroke(); }
    if (w.kind === 'glitch') { ctx.strokeStyle = '#00e6ff'; ctx.lineWidth = 2; ctx.strokeRect(w.x + Math.sin(t * 9) * 3, w.y, w.w, w.h); }
  }
  // pickups
  for (const pk of G.pickups) { const s = 44 + Math.sin(pk.t * 5) * 4; if (IMG.aplus.complete) ctx.drawImage(IMG.aplus, pk.x - s / 2, pk.y - s / 2, s, s); }
  // bullets
  for (const b of G.bullets) {
    ctx.strokeStyle = b.col; ctx.lineWidth = b.beam ? 6 : 4; ctx.shadowColor = b.col; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * (b.beam ? 0.05 : 0.025), b.y - b.vy * (b.beam ? 0.05 : 0.025)); ctx.stroke(); ctx.shadowBlur = 0;
  }
  // entities
  for (const e of G.ents) {
    if (e.dead > 0) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.font = '14px Poppins'; ctx.fillText(Math.ceil(e.dead) + '', e.spawn.x, e.spawn.y + 5); ctx.globalAlpha = 1; continue; }
    const col = e.team === 'P' ? '#e0283c' : '#ff8c28';
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, e.r * 0.9, e.r, e.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    // blaster
    ctx.rotate(e.a); ctx.fillStyle = e.team === 'P' ? (e.kind === 'chatgpt' ? '#00e6ff' : '#ffd60a') : '#ff8c28'; ctx.strokeStyle = '#100814'; ctx.lineWidth = 3;
    ctx.fillRect(e.r - 4, -6, 22, 12); ctx.strokeRect(e.r - 4, -6, 22, 12); ctx.rotate(-e.a);
    const img = e.team === 'P' ? IMG[e.kind] : IMG.brokepilot;
    ctx.beginPath(); ctx.arc(0, 0, e.r + 3, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#100814'; ctx.stroke();
    if (img && img.complete) ctx.drawImage(img, -e.r, -e.r, e.r * 2, e.r * 2);
    if (e.shield > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, e.r + 9, 0, Math.PI * 2); ctx.stroke(); }
    if (e.frozen > 0) { ctx.strokeStyle = '#7cff6b'; ctx.setLineDash([4, 4]); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, e.r + 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    if (e.team === 'B' && G.slow > 0) { ctx.fillStyle = 'rgba(255,140,40,0.35)'; ctx.beginPath(); ctx.arc(0, 0, e.r + 5, 0, Math.PI * 2); ctx.fill(); }
    // shields pips
    for (let i = 0; i < e.maxhp; i++) { ctx.fillStyle = i < e.hp ? (e.team === 'P' ? '#00e6ff' : '#ffd60a') : 'rgba(255,255,255,0.18)'; ctx.fillRect(-e.maxhp * 6 + i * 12, -e.r - 14, 9, 5); }
    ctx.font = (e.isPlayer ? 'bold 13px' : '11px') + ' Poppins'; ctx.textAlign = 'center'; ctx.fillStyle = e.isPlayer ? '#ffd60a' : 'rgba(255,255,255,0.8)';
    ctx.fillText(e.isPlayer ? 'YOU' : e.name, 0, e.r + 22);
    ctx.restore();
  }
  for (const q of G.parts) { ctx.globalAlpha = Math.max(0, q.life * 2); ctx.fillStyle = q.col; ctx.fillRect(q.x - 2, q.y - 2, 4, 4); }
  ctx.globalAlpha = 1;
  ctx.restore();
  // vignette
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.35, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
  vg.addColorStop(0, 'rgba(34,6,56,0)'); vg.addColorStop(1, 'rgba(34,6,56,0.6)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  if (G.player.dead > 0) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#fff'; ctx.font = '36px Anton'; ctx.textAlign = 'center'; ctx.fillText('RESPAWN IN ' + Math.ceil(G.player.dead), VW / 2, VH / 2 + 60); }
  drawSticks();
}
function drawMenuBg(t) {
  ctx.fillStyle = '#141217'; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 26; i++) { const a = t * 0.2 + i; ctx.strokeStyle = `rgba(130,50,220,${0.05 + 0.04 * Math.sin(a)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(VW / 2, VH * 0.4); ctx.lineTo(VW / 2 + Math.cos(i / 26 * Math.PI * 2 + t * 0.05) * 2000, VH * 0.4 + Math.sin(i / 26 * Math.PI * 2 + t * 0.05) * 2000); ctx.stroke(); }
}

/* ---------------- HUD ---------------- */
function hud() {
  const p = G.player, c = CHARS[p.kind];
  $('tp').textContent = 'PERCI ' + G.score.P; $('tb').textContent = G.score.B + ' BROKE';
  const s = Math.max(0, Math.ceil(G.time)); $('clock').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  $('me').textContent = `${c.name} • tags ${p.tags} • tagged ${p.tagged}`;
  $('abil').textContent = p.abilityCd > 0 ? `${c.ability}: ${Math.ceil(p.abilityCd)}s` : `${c.ability} READY (SPACE)`;
  $('abBtn').textContent = p.abilityCd > 0 ? Math.ceil(p.abilityCd) + 's' : c.ability.split(' ')[0];
}

/* ---------------- end + score ---------------- */
let lastResult = null;
function endMatch() {
  state = 'end'; $('hud').classList.remove('on'); document.body.classList.remove('playing');
  const p = G.player, won = G.score.P > G.score.B, tie = G.score.P === G.score.B;
  const acc = p.shots ? Math.round((p.hits / p.shots) * 100) : 0;
  const raw = p.tags * 100 + (won ? 500 : tie ? 200 : 0) + acc * 3 - p.tagged * 25;
  const score = Math.max(0, Math.round(raw * DIFF[diff].mult));
  lastResult = { score, tags: p.tags, tagged: p.tagged, acc, won, tie, character: p.kind, difficulty: diff, team: G.score.P, enemy: G.score.B };
  $('endTitle').textContent = won ? 'YOU WIN!' : tie ? 'TIE GAME' : 'BROKE-PILOT WINS';
  $('endTitle').className = 'big ' + (won ? 'win' : 'lose');
  $('endSub').textContent = `Team Perci ${G.score.P} — ${G.score.B} BROKE-pilot • ${CHARS[p.kind].name} • ${diff.toUpperCase()}`;
  $('endKV').innerHTML = `<span>Your tags</span><b>${p.tags}</b><span>Times tagged</span><b>${p.tagged}</b><span>Accuracy</span><b>${acc}%</b><span>Result bonus</span><b>${won ? '500' : tie ? '200' : '0'}</b><span>Difficulty</span><b>x${DIFF[diff].mult}</b><span style="color:var(--gold);font-family:Anton;font-size:20px">SCORE</span><b style="color:var(--gold);font-size:30px">${score}</b>`;
  $('submitMsg').textContent = ''; $('bSubmit').disabled = false; $('nameIn').value = localStorage.getItem('ps_name') || '';
  (won ? SFX.win : SFX.lose)();
  saveLocal(lastResult);
  showScreen('sEnd');
}
const BAD = ['fuck', 'shit', 'bitch', 'nigg', 'fag', 'cunt', 'dick', 'pussy', 'whore', 'slut', 'rape', 'nazi', 'kkk'];
function cleanName(n) { n = (n || '').toUpperCase().replace(/[^A-Z0-9 _.-]/g, '').trim().slice(0, 14); if (n.length < 2) return null; const l = n.toLowerCase().replace(/[^a-z]/g, ''); if (BAD.some((b) => l.includes(b))) return null; return n; }
function saveLocal(r) { const all = JSON.parse(localStorage.getItem('ps_local') || '[]'); all.push({ ...r, name: localStorage.getItem('ps_name') || 'YOU', created_at: new Date().toISOString() }); all.sort((a, b) => b.score - a.score); localStorage.setItem('ps_local', JSON.stringify(all.slice(0, 50))); }
const online = () => LEADERBOARD.url && LEADERBOARD.anonKey;
async function submitScore() {
  const name = cleanName($('nameIn').value);
  if (!name) { $('submitMsg').textContent = 'Pick a name: 2-14 letters or numbers, keep it clean.'; return; }
  localStorage.setItem('ps_name', name); $('bSubmit').disabled = true;
  const row = { name, character: lastResult.character, score: lastResult.score, tags: lastResult.tags, tagged: lastResult.tagged, accuracy: lastResult.acc, won: lastResult.won, difficulty: lastResult.difficulty };
  const loc = JSON.parse(localStorage.getItem('ps_local') || '[]'); if (loc.length) { const i = loc.findIndex((x) => x.score === row.score && x.name === 'YOU'); if (i >= 0) loc[i].name = name; localStorage.setItem('ps_local', JSON.stringify(loc)); }
  if (!online()) { $('submitMsg').textContent = 'Saved! (The public board goes live once the site owner connects it.)'; return; }
  try {
    const r = await fetch(`${LEADERBOARD.url}/rest/v1/${LEADERBOARD.table}`, { method: 'POST', headers: { apikey: LEADERBOARD.anonKey, Authorization: 'Bearer ' + LEADERBOARD.anonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) });
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
      const r = await fetch(q, { headers: { apikey: LEADERBOARD.anonKey, Authorization: 'Bearer ' + LEADERBOARD.anonKey } });
      rows = await r.json(); note = 'Public leaderboard • top 50';
    } catch (e) { rows = []; note = 'Could not load the public board right now.'; }
  }
  body.innerHTML = rows.length ? rows.slice(0, 50).map((r, i) => `<tr class="${r.name === me ? 'me' : ''}"><td class="rank">${i + 1}</td><td><img src="assets/${r.character}_tok.png" alt="">${esc(r.name)}</td><td><b>${r.score}</b></td><td>${r.tags}</td><td>${(r.difficulty || '').toUpperCase()}${r.won ? ' ✓' : ''}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">No scores yet. Be the first!</td></tr>';
  $('boardNote').textContent = note;
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function share() {
  const r = lastResult; if (!r) return;
  const txt = `I scored ${r.score} as ${CHARS[r.character].name} in Perci Shorti vs BROKE-pilot Dream Laser Tag (${r.tags} tags, ${r.difficulty}). Beat that: ${location.href.split('#')[0]} #PerciShorti`;
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
$('muteBtn').onclick = () => { muted = !muted; localStorage.setItem('ps_muted', muted ? '1' : '0'); $('muteBtn').textContent = muted ? 'MUTED' : 'SOUND'; };
$('muteBtn').textContent = muted ? 'MUTED' : 'SOUND';
function togglePause() { if (state === 'play') { state = 'paused'; banner('PAUSED'); } else if (state === 'paused') { state = 'play'; } }
$('pauseBtn').onclick = togglePause;

/* ---------------- input ---------------- */
addEventListener('keydown', (e) => { input.keys[e.code] = true; if (e.code === 'Space' && (state === 'play' || state === 'paused')) { input.ability = true; e.preventDefault(); } if (e.code === 'KeyP' || e.code === 'Escape') togglePause(); });
addEventListener('keyup', (e) => { input.keys[e.code] = false; });
cvs.addEventListener('mousemove', (e) => { input.mx = e.clientX; input.my = e.clientY; });
cvs.addEventListener('mousedown', (e) => { input.mdown = true; input.mx = e.clientX; input.my = e.clientY; });
addEventListener('mouseup', () => { input.mdown = false; });
$('abBtn').addEventListener('touchstart', (e) => { e.preventDefault(); input.ability = true; }, { passive: false });
const sticks = {};
function stickFrom(t, s) { const dx = t.clientX - s.x, dy = t.clientY - s.y, m = Math.min(1, Math.hypot(dx, dy) / 60), a = Math.atan2(dy, dx); return { dx: Math.cos(a) * m, dy: Math.sin(a) * m, m }; }
cvs.addEventListener('touchstart', (e) => { e.preventDefault(); for (const t of e.changedTouches) { const side = t.clientX < VW / 2 ? 'move' : 'aim'; if (!sticks[side]) sticks[side] = { id: t.identifier, x: t.clientX, y: t.clientY, cx: t.clientX, cy: t.clientY }; } }, { passive: false });
cvs.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) for (const side of ['move', 'aim']) { const s = sticks[side]; if (s && s.id === t.identifier) { s.cx = t.clientX; s.cy = t.clientY; const v = stickFrom(t, s); if (side === 'move') input.touchMove = v; else input.touchAim = v; } } }, { passive: false });
const tend = (e) => { for (const t of e.changedTouches) for (const side of ['move', 'aim']) { const s = sticks[side]; if (s && s.id === t.identifier) { delete sticks[side]; if (side === 'move') input.touchMove = null; else input.touchAim = null; } } };
cvs.addEventListener('touchend', tend); cvs.addEventListener('touchcancel', tend);
function drawSticks() { for (const side of ['move', 'aim']) { const s = sticks[side]; if (!s) continue; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, 60, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = side === 'aim' ? 'rgba(255,214,10,0.6)' : 'rgba(0,230,255,0.5)'; const dx = clamp(s.cx - s.x, -60, 60), dy = clamp(s.cy - s.y, -60, 60); ctx.beginPath(); ctx.arc(s.x + dx, s.y + dy, 26, 0, Math.PI * 2); ctx.fill(); } }


/* ---------------- launch lock ---------------- */
(function launchLock() {
  const qs = new URLSearchParams(location.search);
  if (qs.get('preview') && qs.get('preview') === PREVIEW_KEY) { localStorage.setItem('ps_preview', PREVIEW_KEY); history.replaceState(null, '', location.pathname); }
  const owner = localStorage.getItem('ps_preview') === PREVIEW_KEY;
  const t = LAUNCH_AT ? new Date(LAUNCH_AT).getTime() : 0;
  if (owner || !t || Date.now() >= t) { showScreen('sTitle'); if (owner && t && Date.now() < t) feedSoon('PRIVATE PREVIEW • public unlock ' + new Date(t).toLocaleString()); return; }
  showScreen('sLocked');
  $('lockWhen').textContent = 'Opens ' + new Date(t).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const tick = () => { const ms = t - Date.now(); if (ms <= 0) { location.reload(); return; } const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60; $('lockCount').textContent = (d ? d + 'd ' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); };
  tick(); setInterval(tick, 1000);
})();
function feedSoon(msg) { const p = document.createElement('div'); p.textContent = msg; p.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);background:#8232dc;color:#fff;font:700 12px Poppins;padding:4px 12px;border-radius:10px;z-index:9'; document.body.appendChild(p); }

/* ---------------- loop ---------------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  if (state === 'play') { update(dt); drawWorld(t); }
  else if (state === 'paused' && G) { drawWorld(t); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#ffd60a'; ctx.font = '48px Anton'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', VW / 2, VH / 2); ctx.font = '18px Poppins'; ctx.fillStyle = '#fff'; ctx.fillText('Press P or tap II to resume', VW / 2, VH / 2 + 34); }
  else drawMenuBg(t);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// test hook (used for automated checks): ?autoplay=1 makes the player an AI and speeds up time
if (/autoplay=1/.test(location.search)) { window.__auto = true; }
window.__ps = { startMatch, get G() { return G; }, endMatch, set pickChar(k) { pick = k; } };
})();
