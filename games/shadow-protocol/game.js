/* SHADOW PROTOCOL (web edition) - Copyright (c) 2026 Zev DOD. All rights reserved.
   Created and developed by Zev Development Operations & Graphics Design (Zev DOD).
   True 3D (three.js) with first and third person cameras; classic raycaster fallback. Solo campaign + online co-op (host-authoritative, Supabase Realtime broadcast). */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (x, y, u, v) => Math.hypot(x - u, y - v);
const angN = (a) => (((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const rnd = Math.random;
const r2 = (v) => Math.round(v * 100) / 100;

/* ============================== DATA ============================== */
const WEAPONS = [
  { name: 'Viper 9', rank: 1, damage: 26, mag: 12, rate: .30, reserve: 72, reload: 1.25, recoil: .26, len: .5 },
  { name: 'Spectre SMG', rank: 2, damage: 19, mag: 30, rate: .11, reserve: 120, reload: 1.65, recoil: .20, len: .62 },
  { name: 'Falcon AR', rank: 4, damage: 36, mag: 24, rate: .19, reserve: 96, reload: 1.9, recoil: .31, len: .78 },
  { name: 'Bulwark', rank: 7, damage: 72, mag: 6, rate: .65, reserve: 48, reload: 2.2, recoil: .62, len: .85 },
  { name: 'Phantom DMR', rank: 10, damage: 85, mag: 10, rate: .48, reserve: 50, reload: 2.0, recoil: .52, len: .95 },
  { name: 'APEX Elite', rank: 15, damage: 55, mag: 32, rate: .14, reserve: 128, reload: 1.8, recoil: .27, len: .8 }];
const GEAR = [{ name: 'Light armor', hp: 100, speed: 2.7, rank: 1 }, { name: 'Heavy armor', hp: 150, speed: 2.0, rank: 3 }, { name: 'Recon armor', hp: 115, speed: 3.0, rank: 6 }];
const MISSIONS = [
  { name: 'Silent Entry', place: 'Dockside warehouse', brief: 'Intercept a BLACK VEIL courier. A stolen APEX key is hidden in the warehouse terminal.', endline: 'The key belongs to your missing squad. Someone inside APEX authorized the transfer.', n: 4 },
  { name: 'Broken Signal', place: 'Abandoned relay station', brief: 'Restore a compromised relay and recover the transmission from your lost team.', endline: 'A recording reveals your squad was ordered into a trap. The voice is an APEX director.', n: 5 },
  { name: 'Glass House', place: 'Corporate archive', brief: 'Recover the classified financial archive. BLACK VEIL is being funded through APEX shell companies.', endline: 'The files identify Director Voss as the financier. Your own clearance has been revoked.', n: 6 },
  { name: 'Ghost Network', place: 'Underground server facility', brief: 'Disconnect the network that is tracking your movements and retrieve the prison coordinates.', endline: 'You find evidence that two members of your team are alive. Voss is moving them tonight.', n: 7 },
  { name: 'Black Site', place: 'Detention facility', brief: 'Secure the detention control terminal. Your allies will use the unlocked route to escape.', endline: 'Your squad escapes. They reveal Shadow Protocol is a system designed to erase evidence and frame APEX agents.', n: 8 },
  { name: 'False Flag', place: 'Transit command center', brief: 'Prevent the final activation by taking control of the command terminal.', endline: 'The activation stops, but Voss transfers the remaining data to his private headquarters.', n: 9 },
  { name: 'No Way Home', place: 'BLACK VEIL headquarters', brief: 'Recover the original authorization records. You need proof that cannot be erased.', endline: 'The evidence is authenticated. Voss retreats to his bunker, where he plans to destroy the last copy.', n: 10 },
  { name: 'Shadow Protocol', place: 'Director Voss bunker', brief: 'Secure the final archive and transmit the evidence to the independent oversight council.', endline: 'The truth goes public. BLACK VEIL collapses and your team is cleared. APEX is rebuilt under independent oversight. OPERATION COMPLETE.', n: 11 }];
const ATT = [
  [{ name: 'Factory sight', rank: 1 }, { name: 'Reflex optic', rank: 2 }, { name: 'Holo optic', rank: 5 }, { name: 'Precision optic', rank: 10 }],
  [{ name: 'Factory muzzle', rank: 1 }, { name: 'Stabilizer', rank: 3 }, { name: 'Suppressor', rank: 6 }],
  [{ name: 'Standard magazine', rank: 1 }, { name: 'Extended magazine', rank: 4 }, { name: 'Fast reload kit', rank: 8 }]];
const THROW = [{ name: 'Impact charge', rank: 1, stock: 2 }, { name: 'Flash pulse', rank: 3, stock: 3 }, { name: 'Smoke screen', rank: 5, stock: 3 }];
const CREW = [{ k: 'ghost', name: 'GHOST', c: '#cdbd82' }, { k: 'raven', name: 'RAVEN', c: '#38d6ff' }, { k: 'nomad', name: 'NOMAD', c: '#ffd60a' }, { k: 'specter', name: 'SPECTER', c: '#c070ff' }, { k: 'ember', name: 'EMBER', c: '#ff8c28' }];
const WALLSTYLE = ['concrete', 'steel', 'brick', 'steel', 'concrete', 'brick', 'concrete', 'steel'];
const SB = { url: 'https://gfxtobocpqagikouxqmp.supabase.co', key: 'sb_publishable_8PIP4hO1s-ghNSu-AhMRUQ_uLxPNFev' };

/* ============================== PROFILE ============================== */
const prof = { xp: 0, unlocked: 1, gun: 0, armor: 0, cleared: 0, thr: 0, crew: 0, b: WEAPONS.map(() => [0, 0, 0]), name: '', sens: 1 };
function rankOf(xp) { return Math.min(100, 1 + Math.floor((xp === undefined ? prof.xp : xp) / 100)); }
function loadProf() {
  try {
    const o = JSON.parse(localStorage.getItem('sp_profile_v1') || '{}');
    for (const k of ['xp', 'unlocked', 'gun', 'armor', 'cleared', 'thr', 'crew']) if (typeof o[k] === 'number') prof[k] = o[k];
    if (Array.isArray(o.b)) o.b.forEach((r, i) => { if (prof.b[i] && Array.isArray(r)) prof.b[i] = [r[0] | 0, r[1] | 0, r[2] | 0]; });
    if (typeof o.name === 'string') prof.name = o.name; if (typeof o.sens === 'number') prof.sens = clamp(o.sens, .4, 2.5);
  } catch (e) {}
  prof.xp = clamp(prof.xp | 0, 0, 999999); prof.unlocked = clamp(prof.unlocked | 0, 1, MISSIONS.length);
  prof.gun = clamp(prof.gun | 0, 0, WEAPONS.length - 1); prof.armor = clamp(prof.armor | 0, 0, GEAR.length - 1); prof.crew = clamp(prof.crew | 0, 0, CREW.length - 1);
  prof.thr = clamp(prof.thr | 0, 0, THROW.length - 1); prof.cleared = clamp(prof.cleared | 0, 0, MISSIONS.length);
  if (WEAPONS[prof.gun].rank > rankOf()) prof.gun = 0; if (GEAR[prof.armor].rank > rankOf()) prof.armor = 0;
  if (THROW[prof.thr].rank > rankOf()) prof.thr = 0;
  prof.b.forEach((b) => b.forEach((v, s) => { if (!ATT[s][v] || ATT[s][v].rank > rankOf()) b[s] = 0; }));
}
function saveProf() { try { localStorage.setItem('sp_profile_v1', JSON.stringify(prof)); } catch (e) {} }

/* ============================== IMAGES, TEXTURES, SPRITES ============================== */
const IMG = {};
function loadImgs() {
  const names = [];
  return Promise.all(names.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = 'assets/' + n + '.png'; })));
}
function canvasPx(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const d = g.getImageData(0, 0, w, h); return { w, h, d: new Uint32Array(d.data.buffer.slice(0)), c }; }
function noise(g, w, h, amt) { const im = g.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0); }
const TS = 128;
const TEX = {};
function lin(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function speck(g, amt, n) { for (let i = 0; i < n; i++) { g.fillStyle = (rnd() < .5 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + (rnd() * amt).toFixed(3) + ')'; g.fillRect(rnd() * TS, rnd() * TS, 1 + rnd() * 2, 1 + rnd() * 2); } }
function bevelRect(g, x, y, w, h, d) { g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x, y, w, d); g.fillRect(x, y, d, h); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + h - d, w, d); g.fillRect(x + w - d, y, d, h); }
function stain(g, n, a) { for (let i = 0; i < n; i++) { const x = rnd() * TS, y = rnd() * TS, r = 14 + rnd() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }
/* ---- realistic surface painter: tileable value-noise fields shaded per pixel ---- */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function tfield(cx, cy, seed, oct) {
  const n = TS, r = mulberry(seed), out = new Float32Array(n * n); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const gx = cx << o, gy = cy << o, lat = new Float32Array(gx * gy); for (let i = 0; i < lat.length; i++) lat[i] = r();
    for (let y = 0; y < n; y++) {
      const fy = y / n * gy, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), ya = y0 % gy, yb = (y0 + 1) % gy;
      for (let x = 0; x < n; x++) {
        const fx = x / n * gx, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), xa = x0 % gx, xb = (x0 + 1) % gx;
        const a = lat[ya * gx + xa], b = lat[ya * gx + xb], c = lat[yb * gx + xa], d = lat[yb * gx + xb], top = a + (b - a) * sx, bot = c + (d - c) * sx;
        out[y * n + x] += amp * (top + (bot - top) * sy);
      }
    }
    tot += amp; amp *= .5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot; return out;
}
const cl8 = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
function pix(fn, then) {
  return canvasPx(TS, TS, (g) => {
    const im = g.createImageData(TS, TS), d = im.data;
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const c = fn(x, y, y * TS + x), i = (y * TS + x) * 4; d[i] = cl8(c[0]); d[i + 1] = cl8(c[1]); d[i + 2] = cl8(c[2]); d[i + 3] = 255; }
    g.putImageData(im, 0, 0); if (then) then(g);
  });
}
function crack(g, r, x, y, len, a) { g.strokeStyle = 'rgba(8,8,6,' + a + ')'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); let ang = 1.2 + r() * .6; for (let i = 0; i < len; i++) { x += Math.cos(ang) * 3; y += Math.sin(ang) * 3; ang += (r() - .5) * 1.1; g.lineTo(x, y); } g.stroke(); }
function rivet(g, x, y) { const gr = g.createRadialGradient(x - 1, y - 1, 0, x, y, 3.2); gr.addColorStop(0, '#9a9a8a'); gr.addColorStop(1, '#25251f'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x + 1.5, y + 2, 3, 0, 7); g.fill(); }
function drawBase(style, seed) {
  const r = mulberry(seed), n1 = tfield(4, 4, seed, 5), n2 = tfield(18, 18, seed + 1, 2), st = tfield(14, 2, seed + 2, 3), br = tfield(2, 40, seed + 3, 2);
  if (style === 'concrete') return pix((x, y, i) => {
    let v = 100 + (n1[i] - .5) * 64 + (n2[i] - .5) * 26 - Math.max(0, st[i] - .5) * 160 * (.4 + y / TS * .9);
    const e = Math.min(x % 64, 63 - x % 64, y % 64, 63 - y % 64); if (e < 2) v -= (2 - e) * 24; else if (e < 4) v += 7;
    v -= Math.pow(y / TS, 3) * 26;
    return [v + 6, v + 4, v - 4];
  }, (g) => { for (let k = 0; k < 3; k++) crack(g, r, r() * TS, r() * 50, 8 + r() * 10, .5); for (const [x, y] of [[10, 10], [54, 10], [74, 10], [118, 10], [10, 74], [54, 74], [74, 74], [118, 74]]) { g.fillStyle = 'rgba(10,10,8,.5)'; g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); } });
  if (style === 'steel') return pix((x, y, i) => {
    let v = 70 + (n1[i] - .5) * 26 + (br[i] - .5) * 30 + (n2[i] - .5) * 14; const e = Math.min(y % 64, 63 - y % 64); if (e < 2) v -= (2 - e) * 20; else if (e < 4) v += 8;
    const rust = Math.max(0, st[i] - .56) * 3.2, wear = Math.max(0, n2[i] - .66) * 3;
    return [v + 2 + rust * 70 + wear * 40, v + 5 + rust * 22 + wear * 38, v + 2 - rust * 14 + wear * 32];
  }, (g) => { for (const [x, y] of [[9, 9], [119, 9], [9, 55], [119, 55], [9, 73], [119, 73], [9, 119], [119, 119], [64, 9], [64, 73]]) rivet(g, x, y); g.strokeStyle = 'rgba(255,255,255,.05)'; for (let k = 0; k < 24; k++) { g.beginPath(); const y = r() * TS, x = r() * TS; g.moveTo(x, y); g.lineTo(x + 10 + r() * 30, y + (r() - .5) * 3); g.stroke(); } });
  return pix((x, y, i) => {                       // weathered brick, heavily sooted
    const row = Math.floor(y / 16), off = row % 2 ? 16 : 0, bx = ((x + off) % 32 + 32) % 32, by = y % 16, id = Math.floor((x + off) / 32) + row * 5;
    const mortar = bx < 1.5 || by < 1.5; const t = .82 + ((Math.sin(id * 12.9898) * 43758.5453) % 1 + 1) % 1 * .4;
    let v = mortar ? 128 + (n2[i] - .5) * 30 : (92 + (n1[i] - .5) * 46) * t; const grime = Math.pow(y / TS, 2) * .25 + (1 - y / TS) * .15;
    const rr = mortar ? v : v * 1.12 + 6, gg = mortar ? v - 2 : v * .78 + 2, bb = mortar ? v - 8 : v * .66;
    return [rr * (1 - grime), gg * (1 - grime), bb * (1 - grime)];
  });
}
function buildWallTex(style) {
  const seed = 11 + style.length * 7;
  TEX.wall = drawBase(style, seed);
  TEX.vent = canvasPx(TS, TS, (g) => {
    g.drawImage(drawBase(style, seed).c, 0, 0); g.fillStyle = '#080a0a'; g.fillRect(28, 24, 72, 64);
    for (let i = 0; i < 8; i++) { g.fillStyle = lin(g, 0, 28 + i * 7.5, 0, 33 + i * 7.5, [[0, '#4b4d46'], [1, '#1b1d1a']]); g.fillRect(31, 28 + i * 7.5, 66, 4.5); }
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(26, 22, 76, 2); g.fillRect(26, 22, 2, 68); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(26, 88, 76, 3); g.fillRect(100, 22, 3, 68);
    for (const [x, y] of [[30, 26], [98, 26], [30, 86], [98, 86]]) rivet(g, x, y);
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 6; k++) g.fillRect(34 + k * 10, 92, 3, 14 + (k * 7) % 13);
  });
  TEX.sign = canvasPx(TS, TS, (g) => {
    g.drawImage(drawBase(style, seed).c, 0, 0);
    g.fillStyle = '#1d211b'; g.fillRect(16, 34, 96, 52); g.fillStyle = '#d9cfa0'; g.fillRect(16, 34, 96, 5); g.fillRect(16, 81, 96, 5);
    g.fillStyle = '#d9cfa0'; g.font = '700 21px "Share Tech Mono",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RESTRICTED', 64, 54); g.font = '700 14px "Share Tech Mono",monospace'; g.fillText('AREA 7', 64, 72);
    g.fillStyle = 'rgba(0,0,0,.5)'; for (let k = 0; k < 90; k++) g.fillRect(16 + (k * 37) % 96, 34 + (k * 53) % 52, 1 + k % 3, 1);
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(14, 32, 100, 2); rivet(g, 20, 44); rivet(g, 108, 44); rivet(g, 20, 76); rivet(g, 108, 76);
  });
}
function buildStaticTex() {
  const n1 = tfield(5, 5, 91, 4), n2 = tfield(16, 16, 92, 2), br = tfield(2, 36, 93, 2);
  TEX.door = pix((x, y, i) => { let v = 52 + (n1[i] - .5) * 24 + (br[i] - .5) * 16 + (n2[i] - .5) * 10; if (Math.abs(x - 64) < 1.5) v -= 24; const e = Math.min(x, 127 - x, y, 127 - y); if (e < 3) v += 12; return [v + 2, v + 4, v]; }, (g) => {
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(12, 12, 104, 104); bevelRect(g, 12, 12, 104, 104, 2);
    g.save(); g.beginPath(); g.rect(12, 92, 104, 20); g.clip(); for (let k = -2; k < 12; k++) { g.save(); g.translate(12 + k * 20, 92); g.rotate(.7); g.fillStyle = k % 2 ? '#c2a02e' : '#15160f'; g.fillRect(0, -10, 10, 60); g.restore(); } g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(12, 92, 104, 20); g.restore();
    g.fillStyle = '#0a0b0a'; g.fillRect(52, 22, 24, 12); g.fillStyle = '#d98a1e'; g.shadowColor = '#d98a1e'; g.shadowBlur = 6; g.fillRect(56, 26, 16, 4); g.shadowBlur = 0;
    g.fillStyle = lin(g, 0, 56, 0, 78, [[0, '#b9b8a8'], [1, '#55564d']]); g.fillRect(56, 54, 6, 24); g.fillRect(66, 54, 6, 24);
    g.fillStyle = 'rgba(0,0,0,.4)'; for (let k = 0; k < 30; k++) g.fillRect((k * 41) % 120, (k * 29) % 120, 1 + k % 4, 1);
    g.fillStyle = 'rgba(170,70,30,.22)'; g.fillRect(18, 40, 5, 44); g.fillRect(104, 30, 6, 52);
  });
  TEX.crate = pix((x, y, i) => { const plank = Math.floor(y / 32), py = y % 32; let v = 70 + (n1[i] - .5) * 18 + (br[i] - .5) * 26 + plank * 2 - (py < 2 ? 20 : 0) - (py > 29 ? 24 : 0); return [v * .78 + 6, v * .86 + 10, v * .52]; }, (g) => {
    g.fillStyle = '#272b20'; g.fillRect(0, 0, 14, TS); g.fillRect(114, 0, 14, TS); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, 2, TS); g.fillRect(114, 0, 2, TS);
    for (const y of [8, 36, 64, 92, 120]) { rivet(g, 7, y); rivet(g, 121, y); }
    g.fillStyle = '#cfc9a8'; g.font = '700 15px "Share Tech Mono",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AMMUNITION', 64, 46); g.font = '700 12px "Share Tech Mono",monospace'; g.fillText('5.56mm  LOT 114', 64, 66); g.fillRect(28, 78, 72, 2);
    g.fillStyle = 'rgba(0,0,0,.45)'; for (let k = 0; k < 70; k++) g.fillRect(14 + (k * 47) % 100, (k * 31) % 126, 1 + k % 3, 1);
    g.fillStyle = 'rgba(210,205,170,.35)'; for (let k = 0; k < 18; k++) g.fillRect(16 + (k * 29) % 94, 20 + (k * 17) % 90, 3, 1);
  });
  const fl = tfield(3, 3, 94, 5), fs = tfield(9, 9, 95, 3);
  TEX.floor = pix((x, y, i) => { let v = 54 + (fl[i] - .5) * 40 + (fs[i] - .5) * 18; const e = Math.min(x % 64, 63 - x % 64, y % 64, 63 - y % 64); if (e < 1.5) v -= 22; const oil = Math.max(0, fl[(i + 4000) % fl.length] - .62) * 60; v -= oil; return [v + 3, v + 3, v]; }, (g) => {
    const r = mulberry(96); for (let k = 0; k < 3; k++) crack(g, r, r() * TS, r() * TS, 6 + r() * 8, .55);
    g.fillStyle = 'rgba(0,0,0,.4)'; for (let k = 0; k < 120; k++) g.fillRect(r() * TS, r() * TS, 1, 1);
    g.fillStyle = 'rgba(255,255,255,.06)'; for (let k = 0; k < 90; k++) g.fillRect(r() * TS, r() * TS, 1, 1);
  });
  const cn = tfield(4, 4, 97, 4);
  TEX.ceil = pix((x, y, i) => { let v = 62 + (cn[i] - .5) * 30; const e = Math.min(x % 64, 63 - x % 64, y % 64, 63 - y % 64); if (e < 2) v -= 22; return [v, v + 2, v]; }, (g) => {
    g.fillStyle = '#1b1c1a'; g.fillRect(24, 48, 80, 32); g.fillStyle = '#e9efdc'; g.shadowColor = '#d9e8c8'; g.shadowBlur = 9; g.fillRect(28, 52, 72, 24); g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.fillRect(32, 56, 64, 16);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(30, 52, 5, 24); g.fillRect(92, 52, 5, 24);
  });
}
function px(r, g, b, a) { return ((a === undefined ? 255 : a) << 24) | (b << 16) | (g << 8) | r; }

const SPR = {};
function sprCanvas(w, h, fn) { return canvasPx(w * 2, h * 2, (g) => { g.scale(2, 2); g.lineJoin = 'round'; fn(g, w, h); }); }
function sprCanvas3(w, h, fn) { return canvasPx(w * 3, h * 3, (g) => { g.scale(3, 3); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g, w, h); }); }
const CAMO = { marine: ['#566038', '#3a4529', '#7b6a45', '#262c1d'], vc: ['#26292b', '#1a1c1e', '#33373a', '#111213'] };
function blotch(g, bb, pal, seed, n) { const r = mulberry(seed); for (let i = 0; i < n; i++) { g.fillStyle = pal[(r() * pal.length) | 0]; g.beginPath(); g.ellipse(bb[0] + r() * bb[2], bb[1] + r() * bb[3], 2.5 + r() * 6, 2 + r() * 4, r() * 3, 0, 7); g.fill(); } }
function part(g, path, o) {                       // fill + camo + light-from-left volume + outline
  g.beginPath(); path(g); g.fillStyle = o.fill; g.fill();
  g.save(); g.beginPath(); path(g); g.clip();
  if (o.pal) blotch(g, o.bb, o.pal, o.seed || 1, o.n || 14);
  const gr = g.createLinearGradient(o.bb[0], 0, o.bb[0] + o.bb[2], 0); gr.addColorStop(0, 'rgba(255,255,235,.16)'); gr.addColorStop(.4, 'rgba(255,255,235,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = gr; g.fillRect(o.bb[0], o.bb[1], o.bb[2], o.bb[3]);
  if (o.fold) { g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = .8; for (const [a, b, c, d] of o.fold) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); } }
  g.restore(); g.beginPath(); path(g); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = .8; g.stroke();
}
const rrp = (x, y, w, h, r) => (c) => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
function limb(g, pts, w, col) { g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = w + 1.6; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke(); g.strokeStyle = 'rgba(255,255,230,.14)'; g.lineWidth = w * .3; g.beginPath(); g.moveTo(pts[0][0] - w * .22, pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] - w * .22, pts[i][1]); g.stroke(); }
function soldier(g, enemy, state, frame, tag, seed) {
  const pal = enemy ? CAMO.vc : CAMO.marine, uni = enemy ? '#2a2d2f' : '#4f5a35', vest = enemy ? '#1b1c1e' : '#8b7e5a', vestHi = enemy ? '#2b2d30' : '#a39571', glove = enemy ? '#121314' : '#3a3a33', skin = '#b58767';
  const aim = state === 'aim' || state === 'fire', sw = state === 'walk' ? (frame ? 4 : -4) : 0;
  if (state === 'down') {
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(32, 116, 29, 6, 0, 0, 7); g.fill();
    part(g, rrp(30, 100, 30, 10, 4), { fill: uni, pal, seed, bb: [30, 100, 30, 10], n: 8 }); part(g, rrp(32, 109, 28, 8, 4), { fill: uni, pal, seed: seed + 1, bb: [32, 109, 28, 8], n: 8 });
    part(g, rrp(55, 99, 9, 19, 3), { fill: '#0d0e0e', bb: [55, 99, 9, 19] });
    part(g, rrp(14, 98, 24, 17, 6), { fill: uni, pal, seed: seed + 2, bb: [14, 98, 24, 17], n: 8 }); part(g, rrp(17, 99, 15, 14, 4), { fill: vest, bb: [17, 99, 15, 14] });
    part(g, (c) => { c.ellipse(9, 106, 8.5, 8, 0, 0, 7); }, { fill: enemy ? '#202224' : '#4c5733', pal, seed: seed + 4, bb: [1, 98, 16, 16], n: 6 });
    limb(g, [[2, 114], [32, 112]], 2.6, '#121314'); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(8, 112, 26, 1.4);
    return;
  }
  g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(32, 123, 21, 4.2, 0, 0, 7); g.fill();
  // legs + boots
  for (const [x, d] of [[24.5, -sw], [39.5, sw]]) {
    part(g, (c) => { c.moveTo(x - 8, 70); c.lineTo(x + 8, 70); c.lineTo(x + 6.5, 95); c.lineTo(x + 5.2, 117 + d * .6); c.lineTo(x - 5.2, 117 + d * .6); c.lineTo(x - 6.5, 95); c.closePath(); }, { fill: uni, pal, seed: seed + 3, bb: [x - 8, 70, 16, 48], n: 12, fold: [[x - 4, 78, x - 2, 92], [x + 3, 80, x + 2, 95], [x - 5, 100, x - 3, 114]] });
    part(g, rrp(x - 5.4, 89, 10.8, 8, 2.5), { fill: '#16171a', bb: [x - 5, 89, 11, 8] });                      // knee pad
    part(g, rrp(x - 6.4, 112 + d * .6, 12.8, 9.5, 2.5), { fill: enemy ? '#0c0c0d' : '#2b2519', bb: [x - 6, 112, 13, 10] });
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x - 4, 113 + d * .6, 4, 1);
  }
  // torso + sleeves
  part(g, (c) => { c.moveTo(14.5, 40); c.quadraticCurveTo(32, 33, 49.5, 40); c.lineTo(46.5, 74); c.lineTo(17.5, 74); c.closePath(); }, { fill: uni, pal, seed: seed + 5, bb: [14, 34, 36, 40], n: 16 });
  if (!aim) { limb(g, [[14.5, 42], [10.5, 58], [16, 70]], 7.4, uni); limb(g, [[49.5, 42], [54, 58], [50, 70]], 7.4, uni); }
  // plate carrier, pouches, webbing
  part(g, (c) => { c.moveTo(18.5, 39); c.lineTo(45.5, 39); c.lineTo(44.5, 70); c.lineTo(19.5, 70); c.closePath(); }, { fill: vest, bb: [18, 39, 28, 31], fold: [[20, 47, 44, 47], [20, 52, 44, 52], [20, 57, 44, 57]] });
  g.fillStyle = vestHi; g.fillRect(22, 41, 20, 2.2);
  for (let k = 0; k < 3; k++) part(g, rrp(21 + k * 7.6, 56, 6.4, 11, 1.2), { fill: enemy ? '#222427' : '#74684a', bb: [21 + k * 7.6, 56, 6.4, 11] });
  part(g, rrp(25, 44, 14, 8, 1.5), { fill: enemy ? '#272a2d' : '#7a6e50', bb: [25, 44, 14, 8] });
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(31.2, 44, 1.6, 8);
  part(g, rrp(16.5, 70, 31, 6, 1.5), { fill: '#1b1b19', bb: [16, 70, 31, 6] }); part(g, rrp(40, 70, 8, 9, 1.5), { fill: '#242520', bb: [40, 70, 8, 9] });
  // shoulders / straps / ID
  part(g, rrp(11.5, 37, 9, 8, 3), { fill: uni, pal, seed: seed + 6, bb: [11, 37, 9, 8], n: 5 }); part(g, rrp(43.5, 37, 9, 8, 3), { fill: uni, pal, seed: seed + 7, bb: [43, 37, 9, 8], n: 5 });
  if (enemy) { g.fillStyle = '#a82020'; g.fillRect(12.5, 45, 7, 4.5); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(12.5, 49, 7, 1); } else { g.fillStyle = tag; g.fillRect(12.5, 45, 7, 3.6); g.fillStyle = '#d8d3b6'; g.fillRect(44.5, 45, 6, 3.2); }
  // rifle + arms
  const hand = (x, y) => { part(g, (c) => { c.ellipse(x, y, 3.8, 3.4, 0, 0, 7); }, { fill: glove, bb: [x - 4, y - 3.5, 8, 7] }); };
  if (aim) {
    limb(g, [[14.5, 42], [9.5, 58], [27, 57]], 7, uni); limb(g, [[49.5, 42], [55, 55], [37.5, 49]], 7, uni);
    part(g, rrp(27.5, 40, 9, 24, 1.6), { fill: '#17181a', bb: [27, 40, 9, 24] }); part(g, rrp(29.5, 33, 5, 9, 1), { fill: '#202225', bb: [29, 33, 5, 9] });
    g.fillStyle = '#0a0a0b'; g.beginPath(); g.arc(32, 41.5, 3.3, 0, 7); g.fill(); g.fillStyle = '#3b3d40'; g.beginPath(); g.arc(32, 41.5, 1.5, 0, 7); g.fill();
    g.fillStyle = '#d9d9d0'; g.fillRect(31.4, 29.5, 1.2, 4.5); part(g, rrp(28.5, 62, 7, 12, 1.4), { fill: '#16171a', bb: [28, 62, 7, 12] });
    g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(28, 41, 1.4, 20);
    hand(27, 57); hand(37.5, 49);
  } else {
    limb(g, [[14.5, 42], [10, 57], [22, 55]], 7, uni); limb(g, [[49.5, 42], [54, 57], [44, 64]], 7, uni);
    limb(g, [[48, 66], [20, 50]], 5.2, '#17181a'); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(24, 51, 14, 1); part(g, rrp(32, 58, 6, 11, 1.2), { fill: '#16171a', bb: [32, 58, 6, 11] });
    hand(22, 54); hand(44, 63);
  }
  // neck + head
  part(g, rrp(27.5, 30, 9, 9, 2), { fill: enemy ? '#141516' : '#9a7254', bb: [27, 30, 9, 9] });
  if (enemy) {
    part(g, (c) => { c.ellipse(32, 23.5, 8.8, 10.5, 0, 0, 7); }, { fill: '#18191b', bb: [23, 13, 18, 21] });
    g.fillStyle = '#050506'; g.fillRect(24.5, 20, 15, 4.6); g.fillStyle = 'rgba(220,40,30,.8)'; g.fillRect(26.5, 21.6, 4, 1.4); g.fillRect(33.5, 21.6, 4, 1.4);
    part(g, rrp(21, 25, 4, 5, 1.5), { fill: '#222428', bb: [21, 25, 4, 5] }); part(g, rrp(39, 25, 4, 5, 1.5), { fill: '#222428', bb: [39, 25, 4, 5] });
  } else {
    part(g, (c) => { c.ellipse(32, 24, 8.4, 10, 0, 0, 7); }, { fill: skin, bb: [23, 14, 17, 20] });
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(32, 31, 7, 4, 0, 0, Math.PI); g.fill(); g.fillStyle = '#080908'; g.fillRect(24, 19.6, 16, 5.2); g.fillStyle = 'rgba(180,215,230,.55)'; g.fillRect(25.4, 20.4, 5, 1.4); g.fillRect(33.4, 20.4, 5, 1.4);
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = .8; g.beginPath(); g.moveTo(23.8, 22); g.lineTo(22, 31); g.moveTo(40.2, 22); g.lineTo(42, 31); g.stroke();
  }
  // helmet (cover, band, NVG mount)
  part(g, (c) => { c.moveTo(19.5, 22); c.bezierCurveTo(17.5, 5, 46.5, 5, 44.5, 22); c.lineTo(41.5, 19.5); c.lineTo(22.5, 19.5); c.closePath(); }, { fill: enemy ? '#202224' : '#4c5733', pal, seed: seed + 9, bb: [17, 6, 30, 16], n: 10 });
  g.fillStyle = enemy ? '#101112' : '#2d3320'; g.fillRect(21.4, 17.2, 21.2, 2.4);
  part(g, rrp(29, 7, 6, 5.5, 1.2), { fill: '#16171a', bb: [29, 7, 6, 5.5] });
  if (!enemy) { g.fillStyle = tag; g.fillRect(36.5, 12, 4.4, 2.6); }
  // volume + grime over the whole figure, only where pixels exist
  g.save(); g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, 40, 0, 124); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.42)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
  const r = mulberry(seed + 21); for (let k = 0; k < 260; k++) { g.fillStyle = r() < .6 ? 'rgba(0,0,0,.14)' : 'rgba(255,255,240,.07)'; g.fillRect(r() * 64, r() * 128, 1, 1); }
  g.fillStyle = 'rgba(70,55,35,.28)'; g.fillRect(0, 104, 64, 24);
  g.restore();
  if (state === 'fire') {
    const fx = 32, fy = 41.5, gr2 = g.createRadialGradient(fx, fy, 0, fx, fy, 20); gr2.addColorStop(0, 'rgba(255,255,245,1)'); gr2.addColorStop(.25, 'rgba(255,214,110,.95)'); gr2.addColorStop(.6, 'rgba(255,130,30,.35)'); gr2.addColorStop(1, 'rgba(255,90,0,0)');
    g.fillStyle = gr2; g.fillRect(fx - 20, fy - 20, 40, 40); g.fillStyle = 'rgba(255,240,190,.9)'; for (let a = 0; a < 5; a++) { g.save(); g.translate(fx, fy); g.rotate(a * 1.256 + .3); g.beginPath(); g.moveTo(-1.2, 0); g.lineTo(0, -17); g.lineTo(1.2, 0); g.fill(); g.restore(); }
  }
}
function humanoid(kind, state, frame, crewIdx) {
  const key = kind + state + frame + crewIdx; if (SPR[key]) return SPR[key];
  const enemy = kind === 'enemy';
  return (SPR[key] = sprCanvas3(64, 128, (g) => soldier(g, enemy, state, frame, enemy ? '#a82020' : CREW[crewIdx].c, 100 + (enemy ? 0 : 7 * (crewIdx + 1)))));
}
function spriteTerminal(on) {
  const key = 'term' + on; if (SPR[key]) return SPR[key];
  return (SPR[key] = sprCanvas(48, 64, (g) => {
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(24, 60, 18, 4, 0, 0, 7); g.fill();
    g.fillStyle = lin(g, 0, 24, 0, 60, [[0, '#26333d'], [1, '#141c23']]); g.fillRect(8, 24, 32, 36); g.fillStyle = lin(g, 0, 18, 0, 44, [[0, '#2f4658'], [1, '#1c2c38']]); g.fillRect(6, 18, 36, 26);
    g.fillStyle = '#071c26'; g.fillRect(10, 21, 28, 20); g.shadowColor = '#38d6ff'; g.shadowBlur = 8; g.fillStyle = '#38d6ff'; g.fillRect(13, 24, 22, 3); g.fillRect(13, 30, 15, 3); g.fillRect(13, 36, 19, 3); g.fillRect(12, 46, 24, 3); g.fillRect(12, 51, 24, 2); g.shadowBlur = 0;
  }));
}
function spriteExit() { return SPR.exit || (SPR.exit = sprCanvas(48, 64, (g) => { g.fillStyle = 'rgba(92,232,184,.25)'; g.beginPath(); g.ellipse(24, 56, 22, 6, 0, 0, 7); g.fill(); g.strokeStyle = '#cdbd82'; g.lineWidth = 3; g.beginPath(); g.ellipse(24, 56, 20, 5, 0, 0, 7); g.stroke(); g.fillStyle = '#cdbd82'; g.shadowColor = '#cdbd82'; g.shadowBlur = 8; g.beginPath(); g.moveTo(24, 8); g.lineTo(36, 30); g.lineTo(28, 30); g.lineTo(28, 46); g.lineTo(20, 46); g.lineTo(20, 30); g.lineTo(12, 30); g.fill(); })); }
function spriteNade(kind) { const k = 'nade' + kind; return SPR[k] || (SPR[k] = sprCanvas(16, 16, (g) => { const gr = g.createRadialGradient(6, 6, 1, 8, 8, 7); gr.addColorStop(0, '#fff'); gr.addColorStop(1, ['#ff6a3a', '#d8c870', '#7d8f98'][kind - 1]); g.fillStyle = gr; g.beginPath(); g.arc(8, 8, 6, 0, 7); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 1.5; g.stroke(); })); }
function spriteSmoke() { return SPR.smoke || (SPR.smoke = canvasPx(128, 128, (g) => { for (let i = 0; i < 9; i++) { const x = 64 + (rnd() - .5) * 50, y = 64 + (rnd() - .5) * 50, r = 30 + rnd() * 18, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(205,214,219,.55)'); gr.addColorStop(1, 'rgba(160,172,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } })); }

/* ============================== AUDIO ============================== */
let AC = null; const sfxCache = {};
function audioInit() { if (AC) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
function sfx(name, vol, freqMul) {
  if (!AC || AC.state === 'suspended' && (AC.resume(), false)) return;
  vol = (vol === undefined ? 1 : vol); if (vol <= 0.02) return;
  const P = { shot: [150, .13, 1], shot2: [210, .09, 1], shot3: [120, .16, 1], shotB: [80, .24, 1], hit: [900, .05, 0], confirm: [1400, .1, 0], dry: [300, .04, 0], reload: [500, .09, 0], enemy: [180, .1, 1], near: [1200, .05, 1], impact: [110, .08, 1], explosion: [55, .55, 1], flash: [2200, .3, 0], alarm: [620, .35, 0], door: [160, .18, 1], step: [70, .05, 1], pulse: [60, .12, 0], success: [880, .5, 0] }[name];
  if (!P) return; const [f, dur, nz] = P, t0 = AC.currentTime;
  const g = AC.createGain(); g.gain.setValueAtTime(vol * .5, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); g.connect(AC.destination);
  if (nz) { const n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / n, 2); const s = AC.createBufferSource(); s.buffer = b; const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f * 9 * (freqMul || 1); s.connect(fl); fl.connect(g); s.start(t0); }
  else { const o = AC.createOscillator(); o.type = name === 'alarm' ? 'square' : 'sine'; o.frequency.setValueAtTime(f * (freqMul || 1), t0); if (name === 'success') o.frequency.linearRampToValueAtTime(f * 1.5, t0 + dur); o.connect(g); o.start(t0); o.stop(t0 + dur); }
}
const shotName = () => ['shot2', 'shot2', 'shot', 'shotB', 'shot3', 'shot'][G.me ? G.me.gun : 0];

/* ============================== GAME STATE ============================== */
const G = { mode: 'menu', state: 'splash', mission: 0, trainMode: false, grid: null, target: null, exit: null, enemies: [], players: [], me: null, objective: false, over: false,
  kills: 0, timer: 0, reinforce: 0, waves: 0, combatClock: 0, projectiles: [], clouds: [], impacts: [], threats: [], opened: [], flow: {}, flowClock: 0, evlog: [], evId: 0, seenEv: 0, blast: 0,
  hitmark: 0, killmark: 0, flash: 0, hurt: 0, shake: 0, pressure: 0, radio: 0, msgT: 0, paused: false, stats: {} };
let mapStyle = 'concrete';
const tile = (x, y) => { const row = G.grid[Math.floor(y) + 1]; return row ? (row[Math.floor(x) + 1] === undefined ? 1 : row[Math.floor(x) + 1]) : 1; };
const RAD = .21;
const free = (x, y) => tile(x - RAD, y - RAD) === 0 && tile(x + RAD, y - RAD) === 0 && tile(x - RAD, y + RAD) === 0 && tile(x + RAD, y + RAD) === 0;
function move(o, dx, dy) { if (free(o.x + dx, o.y)) o.x += dx; if (free(o.x, o.y + dy)) o.y += dy; }
function ray(x, y, a, maxd) {
  const dx = Math.cos(a), dy = Math.sin(a); maxd = maxd || 24;
  let mx = Math.floor(x), my = Math.floor(y); const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
  const ax = 1 / Math.max(Math.abs(dx), 1e-9), ay = 1 / Math.max(Math.abs(dy), 1e-9);
  let tx = (dx < 0 ? x - mx : mx + 1 - x) * ax, ty = (dy < 0 ? y - my : my + 1 - y) * ay;
  for (let i = 0; i < 80; i++) {
    let d, side; if (tx < ty) { d = tx; tx += ax; mx += sx; side = 1; } else { d = ty; ty += ay; my += sy; side = 2; }
    if (d > maxd) break;
    const row = G.grid[my + 1], t = row && row[mx + 1] !== undefined ? row[mx + 1] : 1;
    if (t !== 0) return { d, t, cx: mx + 1, cy: my + 1, x: x + dx * d, y: y + dy * d, side };
  }
  return { d: maxd, t: 0, cx: 0, cy: 0, x: x + dx * maxd, y: y + dy * maxd, side: 1 };
}
function los(x, y, u, v) { const d = dist(x, y, u, v); if (d < .1) return true; return ray(x, y, Math.atan2(v - y, u - x), d).d >= d - .08; }

/* ---------- level (deterministic, shared by host and guests) ---------- */
function makeLevel(i0) {
  const i = i0 + 1, size = 17, grid = [[]];
  for (let y = 1; y <= size; y++) { grid[y] = [undefined]; for (let x = 1; x <= size; x++) grid[y][x] = (x === 1 || y === 1 || x === size || y === size) ? 1 : 0; }
  const plans = [
    [['v', 6, 3, 15, 5, 12], ['v', 11, 3, 15, 7, 13], ['h', 9, 3, 14, 4, 8, 13]],
    [['h', 5, 2, 15, 4, 12], ['h', 12, 2, 15, 6, 14], ['v', 9, 5, 12, 8, 10]],
    [['v', 5, 2, 15, 4, 10, 14], ['v', 12, 2, 15, 5, 11, 14], ['h', 7, 5, 12, 8], ['h', 13, 5, 12, 9]],
    [['h', 4, 3, 15, 6, 12], ['h', 8, 2, 14, 4, 10], ['h', 12, 3, 15, 7, 13], ['v', 8, 4, 12, 6, 10]],
    [['v', 5, 2, 14, 4, 8, 12], ['v', 9, 3, 15, 6, 10, 14], ['v', 13, 2, 14, 4, 8, 12], ['h', 8, 5, 13, 7, 11]],
    [['h', 6, 2, 15, 4, 8, 13], ['h', 11, 2, 15, 5, 10, 14], ['v', 7, 6, 11, 8], ['v', 12, 6, 11, 9]],
    [['v', 4, 3, 15, 6, 13], ['v', 8, 2, 14, 4, 9, 12], ['v', 12, 3, 15, 6, 11], ['h', 10, 4, 12, 6, 10]],
    [['h', 5, 2, 15, 5, 13], ['h', 9, 3, 14, 7, 11], ['h', 13, 2, 15, 4, 12], ['v', 6, 5, 13, 7, 11], ['v', 11, 5, 13, 7, 12]]];
  const set = (v, a, b) => { if (v === 'v') return (val) => { grid[b][a] = val; }; return (val) => { grid[a][b] = val; }; };
  for (const r of plans[i - 1]) for (let j = r[2]; j <= r[3]; j++) { if (r[0] === 'v') grid[j][r[1]] = 1; else grid[r[1]][j] = 1; }
  for (const r of plans[i - 1]) for (let n = 4; n < r.length; n++) { const j = r[n], val = n === 4 ? 2 : 0; if (r[0] === 'v') grid[j][r[1]] = val; else grid[r[1]][j] = val; }
  const goals = [[14, 14], [3, 14], [14, 3], [14, 14], [11, 14], [14, 14], [14, 3], [14, 14]], [gx, gy] = goals[i - 1];
  grid[gy][gx] = 0; G.target = { x: gx - .5, y: gy - .5 }; G.exit = { x: 1.5, y: 1.5 };
  for (const c of [[3, 5], [8, 3], [13, 6], [3, 12], [9, 14], [14, 12], [10, 5], [5, 14]]) if (grid[c[1]][c[0]] === 0 && (c[0] + c[1] + i) % 3 !== 0 && !(c[0] === gx && c[1] === gy)) grid[c[1]][c[0]] = 3;
  const spots = []; for (let y = 3; y <= 15; y++) for (let x = 3; x <= 15; x++) if (grid[y][x] === 0 && (x + y) > 8 && (x * 7 + y * 13 + i * 3) % 7 === 0 && dist(x - .5, y - .5, G.target.x, G.target.y) > 1.3) spots.push([x - .5, y - .5]);
  const en = [], n = Math.min(MISSIONS[i - 1].n, spots.length);
  for (let j = 1; j <= n; j++) { const v = spots[Math.floor((j - 1) * spots.length / MISSIONS[i - 1].n)]; en.push({ x: v[0], y: v[1], hp: 55 + i * 5, wait: 1 + j * .16, phase: j * .8, alive: true, homeX: v[0], homeY: v[1], alert: 0, fire: 0, walk: 0, stun: 0, stagger: 0, burst: 0 }); }
  G.grid = grid; G.enemies = en; mapStyle = WALLSTYLE[i - 1]; G.gridVer = (G.gridVer || 0) + 1; if (TEX.floor) buildWallTex(mapStyle);
}
const startSpots = [[1.5, 1.5], [2.5, 1.5], [1.5, 2.5], [2.5, 2.5]];
function newPlayer(d, idx) {
  const w = WEAPONS[d.gun], ge = GEAR[d.armor], at = d.att || [0, 0, 0];
  const cap = w.mag + (at[2] === 1 ? Math.max(2, Math.floor(w.mag * .35)) : 0);
  return { pid: d.pid, name: d.name, crew: d.crew || 0, gun: d.gun, armor: d.armor, att: at, thr: d.thr || 0, x: startSpots[idx % 4][0], y: startSpots[idx % 4][1], a: 0, hp: ge.hp, maxhp: ge.hp, dead: false, cap,
    ammo: cap, reserve: w.reserve, kit: 1, breach: 3, throwCount: THROW[d.thr || 0].stock, reload: 0, reloadTotal: 1, cooldown: 0, aim: 0, recoil: 0, moving: 0, stride: 0, ack: 0, lastSeq: 0, lastX: 0, lastY: 0, tx: 0, ty: 0, ta: 0 };
}
function resetRun() {
  G.objective = false; G.over = false; G.kills = 0; G.timer = 0; G.reinforce = 0; G.waves = 0; G.combatClock = 0; G.projectiles = []; G.clouds = []; G.impacts = []; G.threats = []; G.opened = []; G.flow = {}; G.flowClock = 0;
  G.evlog = []; G.evId = 0; G.seenEv = 0; G.blast = 0; G.hitmark = 0; G.killmark = 0; G.flash = 0; G.hurt = 0; G.shake = 0; G.pressure = 0; G.radio = 0; G.msgT = 0; G.paused = false;
  G.stats = { fired: 0, hits: 0 }; keys.clear(); mouseDown = false; mouseAim = false;
}

/* ============================== EVENTS / NOTIFY ============================== */
function emit(ev) { if (G.mode === 'host') { ev.id = ++G.evId; ev.t = G.timer; G.evlog.push(ev); } }
function notify(s, toPid) { if (!toPid || toPid === (G.me && G.me.pid)) { $('note').textContent = s; $('note').classList.add('on'); G.msgT = 2.4; } if (G.mode === 'host' && (!toPid || toPid !== G.me.pid)) emit({ k: 'msg', s, to: toPid || '' }); }
function impact(x, y, kind) { if (G.impacts.length >= 24) G.impacts.shift(); G.impacts.push({ x, y, kind, life: kind === 'wall' ? .3 : .18, total: kind === 'wall' ? .3 : .18 }); emit({ k: 'imp', x: r2(x), y: r2(y), kind }); }
function threat(pl, e, hit) { if (pl === G.me) { if (G.threats.length >= 8) G.threats.shift(); G.threats.push({ a: Math.atan2(e.y - pl.y, e.x - pl.x), life: .48, hit }); } else emit({ k: 'thr', pid: pl.pid, ax: r2(e.x), ay: r2(e.y), hit }); }
function sound(name, vol, x, y) { // positional: local plays attenuated by distance to me, guests get an event
  const me = G.me; if (me) { const d = dist(me.x, me.y, x === undefined ? me.x : x, y === undefined ? me.y : y); sfx(name, vol * clamp(1 - d / 12, 0, 1)); }
  if (G.mode === 'host') emit({ k: 'snd', n: name, v: vol, x: r2(x === undefined ? 0 : x), y: r2(y === undefined ? 0 : y), g: x === undefined ? 1 : 0 });
}

/* ============================== COMBAT (authoritative: solo + host) ============================== */
const alivePlayers = () => G.players.filter((p) => !p.dead);
function killEnemy(e, by) { e.alive = false; e.fire = 0; G.kills++; if (by === G.me) { G.killmark = .28; sfx('confirm', .65); } else emit({ k: 'hm', pid: by.pid, kill: 1 }); }
function hostShoot(pl, ang) {
  const w = WEAPONS[pl.gun]; let best = null, bd = 100;
  const wd = ray(pl.x, pl.y, ang, 18);
  for (const e of G.enemies) if (e.alive) {
    const d = dist(pl.x, pl.y, e.x, e.y), diff = Math.abs(angN(Math.atan2(e.y - pl.y, e.x - pl.x) - ang));
    if (diff < Math.atan(.34 / Math.max(.3, d)) && d < bd && wd.d >= d - .1) { best = e; bd = d; }
  }
  if (best) {
    best.hp -= w.damage; best.alert = 6; best.lastX = pl.x; best.lastY = pl.y; best.wait = Math.max(best.wait, .18); best.stagger = .18; impact(best.x, best.y, 'hit');
    if (pl === G.me) { G.hitmark = .13; sfx('hit', .55); } else emit({ k: 'hm', pid: pl.pid, kill: 0 });
    if (best.hp <= 0) killEnemy(best, pl);
  } else if (wd.t !== 0) { impact(wd.x - Math.cos(ang) * .035, wd.y - Math.sin(ang) * .035, 'wall'); if (pl === G.me) sfx('impact', .4); }
}
function damagePlayer(pl, dmg) {
  pl.hp -= dmg; if (pl === G.me) { G.hurt = .23; G.shake = Math.min(1, G.shake + .4); sfx('impact', .4); }
  if (pl.hp <= 0 && !pl.dead) { pl.hp = 0; pl.dead = true; notify(pl.name + ' is down'); }
}
function throwFrom(pl) {
  if (pl.throwCount <= 0 || pl.dead) { if (pl === G.me) notify('Throwable unavailable'); return; }
  pl.throwCount--; const d = Math.max(.2, Math.min(4.2, ray(pl.x, pl.y, pl.a, 4.2).d - .24)), kind = pl.thr + 1;
  const pr = { x: pl.x, y: pl.y, sx: pl.x, sy: pl.y, tx: pl.x + Math.cos(pl.a) * d, ty: pl.y + Math.sin(pl.a) * d, life: .68, total: .68, kind, z: .5 };
  G.projectiles.push(pr); emit({ k: 'thr2', sx: r2(pr.sx), sy: r2(pr.sy), tx: r2(pr.tx), ty: r2(pr.ty), kind }); if (pl === G.me) sfx('reload', .55);
}
function updateThrowables(dt) {
  G.blast = Math.max(0, G.blast - dt);
  for (let i = G.clouds.length - 1; i >= 0; i--) { G.clouds[i].life -= dt; if (G.clouds[i].life <= 0) G.clouds.splice(i, 1); }
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const v = G.projectiles[i]; v.life -= dt; const t = clamp(1 - v.life / v.total, 0, 1);
    v.x = v.sx + (v.tx - v.sx) * t; v.y = v.sy + (v.ty - v.sy) * t; v.z = .12 + .62 * Math.sin(t * Math.PI) + .38 * (1 - t);
    if (v.life > 0) continue; G.projectiles.splice(i, 1);
    if (G.mode === 'guest') continue;                                    // guests only animate; the host resolves it
    if (v.kind === 3) { G.clouds.push({ x: v.x, y: v.y, life: 6 }); sound('near', .6, v.x, v.y); continue; }
    sound(v.kind === 1 ? 'explosion' : 'flash', .75, v.x, v.y); impact(v.x, v.y, 'wall'); G.pressure = Math.min(1, G.pressure + .3);
    for (const p of G.players) if (los(p.x, p.y, v.x, v.y)) { if (p === G.me) { G.blast = v.kind === 2 ? Math.max(0, .75 - dist(p.x, p.y, v.x, v.y) * .1) : .24; G.shake = .55; } else emit({ k: 'boom', pid: p.pid, f: v.kind === 2 ? 1 : 0, d: r2(dist(p.x, p.y, v.x, v.y)) }); }
    for (const e of G.enemies) if (e.alive) { const ed = dist(e.x, e.y, v.x, v.y); if (ed < 2.5 && los(v.x, v.y, e.x, e.y)) {
      if (v.kind === 1) { e.hp -= Math.floor(95 * (1 - ed / 3.1)); e.stagger = .5; if (e.hp <= 0) killEnemy(e, G.me || G.players[0]); } else { e.stun = 3; e.burst = 0; e.fire = 0; e.stagger = .4; } } }
  }
}
const smokeBetween = (x, y, u, v) => { const dx = u - x, dy = v - y, len = dx * dx + dy * dy; for (const c of G.clouds) { const t = clamp(((c.x - x) * dx + (c.y - y) * dy) / Math.max(.001, len), 0, 1); if (dist(x + dx * t, y + dy * t, c.x, c.y) < 1.35) return true; } return false; };
function callReinforcements() {
  let count = 0; const maxC = G.mission <= 1 ? 2 : 3, ps = alivePlayers(); if (!ps.length) return 0; const p0 = ps[0];
  for (let y = 3; y <= 15; y++) for (let x = 3; x <= 15; x++) {
    const xx = x - .5, yy = y - .5, d = dist(p0.x, p0.y, xx, yy);
    if (G.grid[y][x] === 0 && d > 4 && d < 11 && !los(p0.x, p0.y, xx, yy) && dist(xx, yy, G.exit.x, G.exit.y) > 2 && (x * 7 + y * 3 + G.mission + 1) % 5 === 0) {
      if (!G.enemies.some((e) => e.alive && dist(e.x, e.y, xx, yy) < 1)) { G.enemies.push({ x: xx, y: yy, hp: 45 + (G.mission + 1) * 4, wait: 1.1 + count * .4, phase: count * .9, alive: true, homeX: xx, homeY: yy, alert: 6, fire: 0, walk: 0, stun: 0, stagger: 0, burst: 0, lastX: p0.x, lastY: p0.y }); if (++count >= maxC) return count; }
    }
  }
  return count;
}
function updateFlow(dt) {
  G.flowClock -= dt; if (G.flowClock > 0) return; G.flowClock = .32; const flow = {}, q = [];
  for (const p of alivePlayers()) { const px_ = Math.floor(p.x) + 1, py_ = Math.floor(p.y) + 1; flow[py_ * 32 + px_] = 0; q.push([px_, py_]); }
  for (let h = 0; h < q.length; h++) { const [qx, qy] = q[h], cost = flow[qy * 32 + qx]; for (const [vx, vy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = qx + vx, y = qy + vy, k = y * 32 + x; if (G.grid[y] && G.grid[y][x] === 0 && flow[k] === undefined) { flow[k] = cost + 1; q.push([x, y]); } } }
  G.flow = flow;
}
function updateEnemies(dt) {
  updateFlow(dt); const ps = alivePlayers(); let engaged = 0;
  for (const e of G.enemies) if (e.alive) {
    e.wait -= dt; e.fire = Math.max(0, e.fire - dt); e.alert = Math.max(0, e.alert - dt); e.stun = Math.max(0, e.stun - dt); e.stagger = Math.max(0, e.stagger - dt);
    let tgt = null, d = 99;
    for (const p of ps) { const dd = dist(p.x, p.y, e.x, e.y); if (dd < d && dd < 9.2 && e.stun <= 0 && los(e.x, e.y, p.x, p.y) && !smokeBetween(e.x, e.y, p.x, p.y)) { tgt = p; d = dd; } }
    const visible = !!tgt;
    if (visible) {
      engaged++; if (!e.wasVisible) { e.wait = Math.max(e.wait, .42 + rnd() * .24); e.burst = 0; if (G.radio <= 0) { G.radio = 3; notify('CONTACT!'); } }
      e.alert = 7; e.lastX = tgt.x; e.lastY = tgt.y;
      if (!e.called) { e.called = true; for (const al of G.enemies) if (al.alive && dist(e.x, e.y, al.x, al.y) < 5) { al.alert = Math.max(al.alert, 4); al.lastX = tgt.x; al.lastY = tgt.y; } }
    } else e.burst = 0;
    e.wasVisible = visible; const ox = e.x, oy = e.y;
    if (e.alert > 0 && e.lastX !== undefined) {
      let a = Math.atan2(e.lastY - e.y, e.lastX - e.x);
      if (!visible) { const ex = Math.floor(e.x) + 1, ey = Math.floor(e.y) + 1; let best = G.flow[ey * 32 + ex]; if (best === undefined) best = 999; for (const [vx, vy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = ex + vx, y = ey + vy, c = G.flow[y * 32 + x]; if (c !== undefined && c < best) { best = c; a = Math.atan2(y - .5 - e.y, x - .5 - e.x); } } }
      if (e.stagger <= 0 && e.stun <= 0) {
        if (!visible || d > 4.1) { const v = 1.15 + ((e.phase || 0) % 2) * .16; move(e, Math.cos(a) * dt * v, Math.sin(a) * dt * v); }
        else if (d < 1.7) move(e, -Math.cos(a) * dt * .65, -Math.sin(a) * dt * .65);
        else if (e.burst === 0) { const side = Math.sin(G.timer * 1.5 + e.phase) > 0 ? 1 : -1; move(e, -Math.sin(a) * dt * .55 * side, Math.cos(a) * dt * .55 * side); }
      }
      if (visible && e.wait <= 0 && e.stagger <= 0) {
        if (e.burst === 0) e.burst = G.mission < 2 ? 3 : 4;
        e.burst--; e.fire = .10; e.wait = e.burst > 0 ? (.14 + rnd() * .065) : (.85 + rnd() * .65 + engaged * .18);
        G.pressure = Math.min(1, G.pressure + .18); if (tgt === G.me) G.shake = Math.min(1, G.shake + .11); sound('enemy', Math.max(.16, .8 - d * .07), e.x, e.y);
        const hit = rnd() < clamp(.64 - d * .045 - (tgt.moving || 0) * .13, .16, .66); threat(tgt, e, hit);
        if (hit) damagePlayer(tgt, 5 + Math.floor((G.mission + 1) * .55)); else if (tgt === G.me) sfx('near', .42);
      }
    } else if (e.alert <= 0 && e.stun <= 0) {
      const tx = e.homeX + Math.cos(G.timer * .35 + e.phase) * .7, ty = e.homeY + Math.sin(G.timer * .35 + e.phase) * .7, a = Math.atan2(ty - e.y, tx - e.x);
      if (dist(e.x, e.y, tx, ty) > .08) move(e, Math.cos(a) * dt * .38, Math.sin(a) * dt * .38);
    }
    e.moving = dist(ox, oy, e.x, e.y) > .001; if (e.moving) e.walk += dt * 6;
  }
  if (G.objective && G.mission >= 2 && G.waves === 1 && G.reinforce <= 0) { G.combatClock += dt; if (G.combatClock >= 14) { G.reinforce = 2.5; G.combatClock = 0; notify('SECOND RESPONSE WAVE INBOUND'); } }
  G.engaged = engaged;
}
function hostTick(dt) {
  G.timer += dt; updateThrowables(dt); updateEnemies(dt);
  if (G.reinforce > 0) { G.reinforce -= dt; if (G.reinforce <= 0) { const n = callReinforcements(); G.waves++; if (n > 0) { notify('BLACK VEIL RESPONSE TEAM INBOUND'); sound('alarm', .65); } } }
  G.evlog = G.evlog.filter((e) => G.timer - e.t < 1.4);
  if (!G.over && G.players.length && G.players.every((p) => p.dead)) finish(false);
}
/* host-side handling of an interact / breach / heal / throw by any player */
function doUse(pl) {
  if (pl.dead) return;
  for (const o of G.players) if (o.dead && o !== pl && dist(pl.x, pl.y, o.x, o.y) < 1.4 && los(pl.x, pl.y, o.x, o.y)) { o.dead = false; o.hp = Math.ceil(o.maxhp * .4); notify(pl.name + ' revived ' + o.name); return; }
  if (dist(pl.x, pl.y, G.target.x, G.target.y) < 1.2 && los(pl.x, pl.y, G.target.x, G.target.y) && !G.objective) { G.objective = true; G.reinforce = 2.8; G.pressure = Math.max(G.pressure, .6); notify('ALARM: Archive secured. Get to extraction!'); sound('alarm', .8); return; }
  if (dist(pl.x, pl.y, G.exit.x, G.exit.y) < 1.2 && los(pl.x, pl.y, G.exit.x, G.exit.y) && G.objective) { finish(true); return; }
  const r = ray(pl.x, pl.y, pl.a, 1.6);
  if (r.t === 2) { openCell(r.cx, r.cy); notify('Door opened', pl.pid); sound('door', .7, r.x, r.y); } else notify('No object in reach', pl.pid);
}
function openCell(cx, cy) { G.gridVer++; G.grid[cy][cx] = 0; G.opened.push([cx, cy]); G.flowClock = 0; }
function doBreach(pl) {
  if (pl.dead) return; const r = ray(pl.x, pl.y, pl.a, 1.8);
  if (pl.breach > 0 && (r.t === 2 || r.t === 3)) { openCell(r.cx, r.cy); pl.breach--; notify('Barrier cleared', pl.pid); sound('explosion', .5, r.x, r.y); G.shake = Math.max(G.shake, .3); } else notify(pl.breach > 0 ? 'Nothing to breach' : 'No breach charges', pl.pid);
}
function doHeal(pl) { if (pl.dead) return; if (pl.kit > 0 && pl.hp < pl.maxhp) { pl.hp = Math.min(pl.maxhp, pl.hp + 45); pl.kit--; notify('Medkit applied', pl.pid); } else notify('Medkit unavailable', pl.pid); }

/* ---------- mission end ---------- */
function finish(win) {
  if (G.over) return; G.over = true;
  if (G.mode === 'host') netSend('end', { win, kills: G.kills });
  showResult(win, G.kills);
}
function showResult(win, kills) {
  G.over = true; const me = G.me, m = MISSIONS[G.mission];
  const reward = win ? 100 + 20 * kills + Math.floor((me.dead ? 0 : me.hp / me.maxhp) * 40) : 0;
  if (win) { prof.xp += reward; if (!G.trainMode) { prof.unlocked = Math.max(prof.unlocked, Math.min(MISSIONS.length, G.mission + 2)); prof.cleared = Math.max(prof.cleared, G.mission + 1); } }
  saveProf(); sfx(win ? 'success' : 'alarm', .8);
  $('rsT').textContent = win ? 'MISSION COMPLETE' : 'OPERATOR DOWN'; $('rsT').style.color = win ? '#cdbd82' : '#ff4a4a';
  $('rsS').textContent = 'OPERATION ' + (G.mission + 1) + ' / ' + m.name;
  const acc = G.stats.fired ? Math.round(G.stats.hits / G.stats.fired * 100) : 0;
  $('rsStats').innerHTML = '<div>XP earned<b>+' + reward + '</b></div><div>Eliminations<b>' + kills + '</b></div><div>Accuracy<b>' + acc + '%</b></div><div>Rank<b>' + rankOf() + '</b></div>';
  $('rsText').textContent = win ? m.endline : 'Your squad was overrun. Refit and try again.';
  const b = $('rsBtns'); b.innerHTML = '';
  const add = (t, f, alt) => { const x = document.createElement('button'); x.className = 'btn' + (alt ? ' alt' : ''); x.textContent = t; x.onclick = f; b.appendChild(x); };
  if (G.mode === 'solo') { if (win && !G.trainMode && G.mission < MISSIONS.length - 1) add('NEXT MISSION', () => brief(G.mission + 1)); add('REPLAY MISSION', () => startSolo(G.mission, G.trainMode), win); add('RETURN TO HQ', () => toMenu(), true); }
  else { add('BACK TO SQUAD ROOM', () => backToLobby()); add('LEAVE SQUAD', () => { leaveMP(); toMenu(); }, true); }
  setState('result'); document.exitPointerLock && document.exitPointerLock();
}

/* ============================== LOCAL PLAYER ============================== */
let keys = new Set(), mouseDown = false, mouseAim = false, lookX = 0, lockedPtr = false;
const touch = { mx: 0, my: 0, fire: false, aim: false, look: 0, sprint: false, lookRate: 0, fireRate: 0 };   // lookRate / fireRate: stick turn speed (-1..1)
let footClock = 0;
function capOf(p) { return p.cap; }
function reloadGun(p) {
  const w = WEAPONS[p.gun]; if (p.reload > 0 || p.ammo >= p.cap || p.reserve <= 0 || p.dead) return;
  p.reload = w.reload * (p.att[2] === 2 ? .73 : 1); p.reloadTotal = p.reload; sfx('reload', .6);
}
function fireLocal() {
  const p = G.me; if (!p || p.dead || G.over) return;
  if (p.cooldown > 0 || p.reload > 0) return;
  if (p.ammo <= 0) { if (p.reserve > 0) reloadGun(p); else { p.cooldown = .32; sfx('dry'); } return; }
  const w = WEAPONS[p.gun]; p.ammo--; G.stats.fired++; p.cooldown = w.rate; G.flash = .075; G.pressure = Math.min(1, G.pressure + .07); G.shake = Math.min(1, G.shake + .22);
  p.recoil = Math.min(1, p.recoil + w.recoil * (p.att[1] === 1 ? .7 : p.att[1] === 2 ? .85 : 1));
  sfx(shotName(), p.att[1] === 2 ? .45 : .9);
  const ang = p.a + (rnd() - .5) * (.018 + .045 * (1 - p.aim) + .025 * p.moving + .035 * (p.sprint || 0) + .025 * p.recoil) * (1 - p.aim * p.att[0] * .12);
  if (G.mode === 'guest') G.out.push({ s: ++G.seq, t: 'f', a: r2(ang), x: r2(p.x), y: r2(p.y) }); else { const before = G.kills; hostShoot(p, ang); if (G.hitmark > 0) G.stats.hits++; void before; }
  if (p.ammo <= 0 && p.reserve > 0) setTimeout(() => G.me && reloadGun(G.me), 120);
}
function localEvent(t) { // use / breach / heal / throw from the local player
  const p = G.me; if (!p || p.dead || G.over) return;
  if (t === 'r') return reloadGun(p);
  if (G.mode === 'guest') { G.out.push({ s: ++G.seq, t, x: r2(p.x), y: r2(p.y), a: r2(p.a) }); if (t === 'g') sfx('reload', .55); return; }
  if (t === 'u') doUse(p); else if (t === 'b') doBreach(p); else if (t === 'h') doHeal(p); else if (t === 'g') throwFrom(p);
}
// the visible, alive enemy closest to your crosshair (within `cone` radians and 16 m)
function assistTarget(p, cone) {
  let best = null, bd = cone;
  for (const e of G.enemies) {
    if (!e.alive) continue; const d = dist(p.x, p.y, e.x, e.y); if (d > 16 || d < .3) continue;
    const da = angN(Math.atan2(e.y - p.y, e.x - p.x) - p.a); if (Math.abs(da) > bd) continue;
    if (!los(p.x, p.y, e.x, e.y)) continue; bd = Math.abs(da); best = { e, da };
  }
  return best;
}
function updatePlayer(dt) {
  const p = G.me; if (!p) return;
  p.cooldown = Math.max(0, p.cooldown - dt); p.recoil = Math.max(0, p.recoil - dt * 3.4);
  if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { const n = Math.min(p.cap - p.ammo, p.reserve); p.ammo += n; p.reserve -= n; } }
  if (p.dead) { p.moving = 0; p.vx = p.vy = 0; return; }
  // ---- input -> desired move vector (local space: f forward, s strafe right)
  const dz = (v) => { const m = Math.abs(v); return m < .12 ? 0 : Math.sign(v) * Math.pow((m - .12) / .88, 1.25); };
  let f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + dz(touch.my);
  let s = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + dz(touch.mx);
  const mag = Math.hypot(f, s); if (mag > 1) { f /= mag; s /= mag; }
  const aiming = keys.has('KeyZ') || mouseAim || touch.aim;
  const wantSprint = (keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.sprint) && f > .3 && !aiming && p.reload <= 0;
  p.sprint = clamp((p.sprint || 0) + (wantSprint ? 1 : -1) * dt * 6, 0, 1);
  p.aim = clamp(p.aim + (aiming ? 1 : -1) * dt * 7, 0, 1);
  // ---- look: keyboard turn ramps up so short taps are precise, holds turn fast
  const tk = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
  p.turnV = tk ? clamp((p.turnV || 0) + tk * dt * 9, -1, 1) : (p.turnV || 0) * Math.max(0, 1 - dt * 14);
  const sens = prof.sens * (1 - p.aim * .5);
  // phone sticks: LOOK (and sideways drag on FIRE) turn you at a rate; slower over a target so it's easy to stop on it
  let stickTurn = touch.lookRate + touch.fireRate * .75;
  const tgt = touchMode ? assistTarget(p, .16) : null;
  if (stickTurn && tgt && Math.abs(tgt.da) < .1) stickTurn *= .5;
  p.a = angN(p.a + p.turnV * 2.5 * (1 - p.aim * .4) * dt + lookX * sens + touch.look * sens + stickTurn * 2.7 * prof.sens * (1 - p.aim * .45) * dt); lookX = 0; touch.look = 0;
  // holding FIRE on a phone gently pulls your crosshair onto a visible enemy right next to it
  if (touch.fire && tgt && !p.dead) p.a = angN(p.a + tgt.da * Math.min(1, dt * (4 + p.aim * 3)));
  // ---- velocity with acceleration and friction (frame-rate independent), then wall-sliding collision
  const base = GEAR[p.armor].speed, top = base * (1 + .42 * p.sprint) * (1 - p.aim * .55);
  const dxw = (Math.cos(p.a) * f - Math.sin(p.a) * s) * top, dyw = (Math.sin(p.a) * f + Math.cos(p.a) * s) * top;
  const k = 1 - Math.exp(-dt * (mag > .02 ? 10 : 16));
  p.vx = (p.vx || 0) + (dxw - (p.vx || 0)) * k; p.vy = (p.vy || 0) + (dyw - (p.vy || 0)) * k;
  const steps = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt / .1)), sx = p.vx * dt / steps, sy = p.vy * dt / steps; let hit = false;     // sub-steps so fast moves can't tunnel through walls
  for (let i = 0; i < steps; i++) { const ox = p.x, oy = p.y; move(p, sx, sy); if (Math.abs(p.x - ox - sx) > 1e-6) { p.vx *= .2; hit = true; } if (Math.abs(p.y - oy - sy) > 1e-6) { p.vy *= .2; hit = true; } }
  void hit;
  const spd = Math.hypot(p.vx, p.vy); p.speedNow = spd; p.moving = Math.min(1, spd / base); p.stride += dt * spd * 3.1;
  if (spd > .35) { footClock -= dt; if (footClock <= 0) { sfx('step', .3 + p.sprint * .2); footClock = Math.max(.22, .46 - spd * .045) + p.aim * .2; } } else footClock = 0;
  if (mouseDown || touch.fire || keys.has('Space')) { if (p.sprint < .5) fireLocal(); }
  G.pressure = Math.max(0, G.pressure - dt * .16);
  if (p.hp / p.maxhp < .36 || G.pressure > .6) { G.heart = (G.heart || 0) - dt; if (G.heart <= 0) { sfx('pulse', .45); G.heart = .85 - G.pressure * .35; } }
}
function timers(dt) {
  G.flash = Math.max(0, G.flash - dt); G.hurt = Math.max(0, G.hurt - dt); G.hitmark = Math.max(0, G.hitmark - dt); G.killmark = Math.max(0, G.killmark - dt); G.shake = Math.max(0, G.shake - dt * 3); G.radio = Math.max(0, G.radio - dt);
  for (let i = G.impacts.length - 1; i >= 0; i--) { G.impacts[i].life -= dt; if (G.impacts[i].life <= 0) G.impacts.splice(i, 1); }
  for (let i = G.threats.length - 1; i >= 0; i--) { G.threats[i].life -= dt; if (G.threats[i].life <= 0) G.threats.splice(i, 1); }
  if (G.msgT > 0) { G.msgT -= dt; if (G.msgT <= 0) $('note').classList.remove('on'); }
}

/* ============================== RENDER ============================== */
/* ============================== RENDER ============================== */
const view = $('view'), vctx = view.getContext('2d'), glc = $('gl');
let BW = 320, BH = 240, buf, buf32, bufCanvas, bctx, imgData, zbuf, VW = 0, VH = 0, focal = 240;
let useGL = false, resScale = 1, GL = null, use3D = false, R3 = null, camView = 3; const r3c = $('r3');
try { const v = localStorage.getItem('sp_view'); if (v === '1' || v === '3') camView = +v; } catch (e) {}
function setView(v) { camView = v; try { localStorage.setItem('sp_view', String(v)); } catch (e) {} notify(v === 1 ? 'FIRST PERSON' : 'THIRD PERSON'); const b = $('pView'); if (b) b.textContent = 'CAMERA: ' + (v === 1 ? 'FIRST PERSON' : 'THIRD PERSON'); }
function toggleView() { setView(camView === 1 ? 3 : 1); }
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, useGL ? 1.25 : 1.5) * (useGL ? resScale : 1); VW = Math.max(160, Math.floor(innerWidth * dpr)); VH = Math.max(120, Math.floor(innerHeight * dpr)); view.width = VW; view.height = VH;
  if (use3D) { r3c.style.display = 'block'; glc.style.display = 'none'; return; }
  if (useGL) { glc.width = VW; glc.height = VH; glc.style.display = 'block'; return; }
  glc.style.display = 'none';
  BH = 240; BW = clamp(Math.round(BH * VW / VH), 220, 440); if (innerWidth < 600) { BH = 200; BW = clamp(Math.round(BH * VW / VH), 200, 420); }
  bufCanvas = document.createElement('canvas'); bufCanvas.width = BW; bufCanvas.height = BH; bctx = bufCanvas.getContext('2d'); imgData = bctx.createImageData(BW, BH); buf32 = new Uint32Array(imgData.data.buffer); zbuf = new Float32Array(BW);
  vctx.imageSmoothingEnabled = true;
}
const shade = (c, l) => 0xff000000 | ((((c >> 16) & 255) * l | 0) << 16) | ((((c >> 8) & 255) * l | 0) << 8) | ((c & 255) * l | 0);
function wallTex(t, cx, cy) {
  if (t === 2) return TEX.door; if (t === 3) return TEX.crate;
  const h = ((cx - 1) * 7 + (cy - 1) * 13 + G.mission) % 7; return h === 0 ? TEX.vent : h === 3 ? TEX.sign : TEX.wall;
}
function sprDesc(s) {
  let sprite, hgt = .85, wid = .43, lift = 0, alpha = 1, emit = false, soft = false;
  if (s.k === 'e') { const e = s.e, st = !e.alive ? 'down' : e.fire > 0 ? 'fire' : e.alert > 0 && e.stun <= 0 && !e.moving ? 'aim' : e.moving ? 'walk' : 'idle'; sprite = humanoid('enemy', st, Math.floor(e.walk) % 2, 0); emit = e.fire > 0; }
  else if (s.k === 'p') { const p = s.p; sprite = humanoid('ally', p.dead ? 'down' : (G.timer - (p.shotT || -9) < .12 ? 'fire' : 'aim'), 0, p.crew); }
  else if (s.k === 't') { sprite = spriteTerminal(1); hgt = .8; wid = .6; emit = true; } else if (s.k === 'x') { sprite = spriteExit(); hgt = .8; wid = .6; emit = true; }
  else if (s.k === 'n') { sprite = spriteNade(s.v.kind); hgt = .16; wid = .16; lift = s.v.z - .1; }
  else { sprite = spriteSmoke(); hgt = 1.2; wid = 1.2; lift = -.1; alpha = clamp(s.c.life, 0, 1) * .8; soft = true; }
  return { sprite, hgt, wid, lift, alpha, emit, soft };
}
function collectSprites(cx0, cy0, me) {
  const sp = [], addS = (s) => { const dx = s.x - cx0, dy = s.y - cy0; s.d = dx * dx + dy * dy; sp.push(s); };
  for (const e of G.enemies) addS({ x: e.x, y: e.y, k: 'e', e });
  for (const p of G.players) if (p !== me) addS({ x: p.x, y: p.y, k: 'p', p });
  if (!G.objective) addS({ x: G.target.x, y: G.target.y, k: 't' }); else addS({ x: G.exit.x, y: G.exit.y, k: 'x' });
  for (const v of G.projectiles) addS({ x: v.x, y: v.y, k: 'n', v });
  for (const c of G.clouds) addS({ x: c.x, y: c.y, k: 's', c });
  sp.sort((a, b) => b.d - a.d); return sp;
}

/* ---------- WebGL2 renderer: smooth, full-resolution, mip-mapped textures, per-pixel lighting ---------- */
const VS_FULL = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const FS_WORLD = `#version 300 es
precision highp float; precision highp sampler2DArray;
uniform vec2 uRes, uPos, uDir, uPlane; uniform float uFocal, uHor, uMis, uTime, uFlash;
uniform sampler2D uGrid; uniform sampler2DArray uTex;
out vec4 oC;
float cellAt(ivec2 c){ if (c.x < 0 || c.y < 0 || c.x > 16 || c.y > 16) return 1.0; return floor(texelFetch(uGrid, c, 0).r * 255.0 + 0.5); }
void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float cam = 2.0 * frag.x / uRes.x - 1.0; vec2 rd = uDir + uPlane * cam;
  ivec2 mp = ivec2(floor(uPos));
  vec2 dd = vec2(abs(1.0 / (abs(rd.x) < 1e-6 ? 1e-6 : rd.x)), abs(1.0 / (abs(rd.y) < 1e-6 ? 1e-6 : rd.y)));
  ivec2 st = ivec2(rd.x < 0.0 ? -1 : 1, rd.y < 0.0 ? -1 : 1);
  vec2 sd = vec2(rd.x < 0.0 ? (uPos.x - float(mp.x)) * dd.x : (float(mp.x) + 1.0 - uPos.x) * dd.x, rd.y < 0.0 ? (uPos.y - float(mp.y)) * dd.y : (float(mp.y) + 1.0 - uPos.y) * dd.y);
  int side = 0; float tile = 0.0; float pd = 40.0;
  for (int i = 0; i < 48; i++) {
    if (sd.x < sd.y) { sd.x += dd.x; mp.x += st.x; side = 0; } else { sd.y += dd.y; mp.y += st.y; side = 1; }
    float t = cellAt(mp); if (t > 0.5) { tile = t; pd = side == 0 ? sd.x - dd.x : sd.y - dd.y; break; }
  }
  float lineH = uFocal / max(pd, 0.05); float y0 = uHor - lineH * 0.5, y1 = uHor + lineH * 0.5;
  vec3 col; float depth = 1.0; float dist;
  if (tile > 0.5 && frag.y >= y0 && frag.y <= y1) {
    float wx = side == 0 ? uPos.y + pd * rd.y : uPos.x + pd * rd.x; wx -= floor(wx);
    if ((side == 0 && rd.x < 0.0) || (side == 1 && rd.y > 0.0)) wx = 1.0 - wx;
    float v = (frag.y - y0) / lineH;
    float layer = tile > 2.5 ? 2.0 : (tile > 1.5 ? 1.0 : 0.0);
    if (tile < 1.5) { float h = mod(float(mp.x) * 7.0 + float(mp.y) * 13.0 + uMis, 7.0); if (h < 0.5) layer = 5.0; else if (h > 2.5 && h < 3.5) layer = 6.0; }
    float lod = max(0.0, log2(128.0 * pd / uFocal));
    col = textureLod(uTex, vec3(wx, v, layer), lod).rgb;
    float l = 0.15 + 0.85 / (1.0 + pd * 0.3); if (side == 1) l *= 0.7; l *= 1.0 - 0.12 * step(0.94, fract(sin(floor(uTime * 9.0) * 91.7) * 43758.5453));
    float ao = smoothstep(0.0, 0.1, v) * smoothstep(1.0, 0.9, v); col *= 0.68 + 0.32 * ao;
    col *= l; depth = pd / 30.0; dist = pd;
  } else {
    float off = frag.y - uHor; float rdist = 0.5 * uFocal / max(abs(off), 0.5);
    vec2 w = uPos + rdist * (uDir + uPlane * cam); bool fl = off > 0.0;
    float lod = max(0.0, log2(128.0 * rdist / uFocal));
    vec3 t = textureLod(uTex, vec3(w, fl ? 3.0 : 4.0), lod).rgb;
    float l = (0.2 + 0.8 / (1.0 + rdist * 0.3)) * (fl ? 1.0 : 0.8);
    float emit = fl ? 0.0 : smoothstep(0.80, 0.94, dot(t, vec3(0.3333)));
    col = t * mix(l, 1.4, emit); dist = rdist;
  }
  col *= 1.0 + uFlash * 2.6 / (1.0 + dist * dist * 0.2); col += vec3(0.95, 0.55, 0.2) * uFlash * 0.28 / (1.0 + dist * dist * 0.25) * dot(col, vec3(0.333));
  col = mix(vec3(0.028, 0.03, 0.026), col, exp(-dist * 0.045));
  float lum = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(lum), col, 0.7); col = (col - 0.5) * 1.1 + 0.5; col = max(col, 0.0) * vec3(1.05, 1.0, 0.92);
  vec2 vc = frag / uRes - 0.5; col *= 1.0 - 0.95 * dot(vc, vc);
  col += (fract(sin(dot(frag + fract(uTime) * 91.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.05;
  oC = vec4(col, 1.0); gl_FragDepth = depth;
}`;
const VS_SPR = `#version 300 es
in vec3 aP; in vec2 aUV; out vec2 vUV; void main(){ vUV = aUV; gl_Position = vec4(aP, 1.0); }`;
const FS_SPR = `#version 300 es
precision highp float; uniform sampler2D uS; uniform float uL, uA, uE; in vec2 vUV; out vec4 o;
void main(){ vec4 t = texture(uS, vUV); if (t.a < 0.01) discard; float l = mix(uL, 1.0, uE); float lm = dot(t.rgb, vec3(0.299, 0.587, 0.114)); vec3 c = mix(vec3(lm), t.rgb, 0.82) * vec3(1.04, 1.0, 0.93); o = vec4(c * l * uA, t.a * uA); }`;
function glInit() {
  let gl; try { gl = glc.getContext('webgl2', { antialias: false, alpha: false, depth: true, powerPreference: 'high-performance' }); } catch (e) {}
  if (!gl) return false;
  try {
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'aP'); gl.bindAttribLocation(p, 1, 'aUV'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
    const pw = prog(VS_FULL, FS_WORLD), ps = prog(VS_SPR, FS_SPR), U = (p, n) => gl.getUniformLocation(p, n);
    const grid = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, grid); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 17, 17, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array(289));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const arr = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, arr); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 8, gl.RGBA8, TS, TS, 7);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const an = gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D_ARRAY, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    const buf = gl.createBuffer(); const vao = gl.createVertexArray();
    GL = { gl, pw, ps, grid, arr, buf, vao, gridVer: -1, style: '', spr: new Map(), uw: { res: U(pw, 'uRes'), pos: U(pw, 'uPos'), dir: U(pw, 'uDir'), plane: U(pw, 'uPlane'), focal: U(pw, 'uFocal'), hor: U(pw, 'uHor'), mis: U(pw, 'uMis'), time: U(pw, 'uTime'), flash: U(pw, 'uFlash'), grid: U(pw, 'uGrid'), tex: U(pw, 'uTex') }, us: { s: U(ps, 'uS'), l: U(ps, 'uL'), a: U(ps, 'uA'), e: U(ps, 'uE') } };
    glLayer(1, TEX.door); glLayer(2, TEX.crate); glLayer(3, TEX.floor); glLayer(4, TEX.ceil); return true;
  } catch (e) { console.warn('WebGL setup failed, using the canvas renderer', e); GL = null; return false; }
}
function glLayer(i, t) { const gl = GL.gl; gl.bindTexture(gl.TEXTURE_2D_ARRAY, GL.arr); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, TS, TS, 1, gl.RGBA, gl.UNSIGNED_BYTE, t.c); }
function glWalls() { const k = mapStyle; if (GL.style === k) return; GL.style = k; glLayer(0, TEX.wall); glLayer(5, TEX.vent); glLayer(6, TEX.sign); GL.gl.bindTexture(GL.gl.TEXTURE_2D_ARRAY, GL.arr); GL.gl.generateMipmap(GL.gl.TEXTURE_2D_ARRAY); }
function glGrid() { if (GL.gridVer === G.gridVer) return; GL.gridVer = G.gridVer; const d = new Uint8Array(289); for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) d[y * 17 + x] = G.grid[y + 1][x + 1] || 0; const gl = GL.gl; gl.bindTexture(gl.TEXTURE_2D, GL.grid); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 17, 17, gl.RED, gl.UNSIGNED_BYTE, d); }
function glSprTex(sp) {
  let t = GL.spr.get(sp.c); if (t) return t; const gl = GL.gl; t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sp.c); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  GL.spr.set(sp.c, t); return t;
}
function renderGL() {
  const me = G.me, gl = GL.gl; glWalls(); glGrid();
  const W = VW, H = VH, plane = (.4875 * W / H) * (1 - me.aim * .28); focal = W / (2 * plane);
  const sh = G.shake, cx0 = me.x + (rnd() - .5) * sh * .03, cy0 = me.y + (rnd() - .5) * sh * .03, dirX = Math.cos(me.a), dirY = Math.sin(me.a), plX = -dirY * plane, plY = dirX * plane;
  const horizon = H / 2 + Math.sin(me.stride) * me.moving * 1.6 * (H / 240);
  gl.viewport(0, 0, W, H); gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(GL.pw); const u = GL.uw;
  gl.uniform2f(u.res, W, H); gl.uniform2f(u.pos, cx0, cy0); gl.uniform2f(u.dir, dirX, dirY); gl.uniform2f(u.plane, plX, plY); gl.uniform1f(u.focal, focal); gl.uniform1f(u.hor, horizon); gl.uniform1f(u.mis, G.mission); gl.uniform1f(u.time, (performance.now() / 1000) % 1000); gl.uniform1f(u.flash, clamp(G.flash / .075, 0, 1));
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GL.grid); gl.uniform1i(u.grid, 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D_ARRAY, GL.arr); gl.uniform1i(u.tex, 1);
  gl.bindVertexArray(GL.vao); gl.drawArrays(gl.TRIANGLES, 0, 3);
  // sprites
  const sp = collectSprites(cx0, cy0, me), inv = 1 / (plX * dirY - dirX * plY);
  gl.useProgram(GL.ps); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.bindBuffer(gl.ARRAY_BUFFER, GL.buf);
  gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
  gl.activeTexture(gl.TEXTURE2); gl.uniform1i(GL.us.s, 2);
  for (const s of sp) {
    const d = sprDesc(s), dx = s.x - cx0, dy = s.y - cy0, tx = inv * (dirY * dx - dirX * dy), ty = inv * (-plY * dx + plX * dy); if (ty < .15) continue;
    const scrX = (W / 2) * (1 + tx / ty), shh = focal / ty * d.hgt, sww = focal / ty * d.wid, floorY = horizon + .5 * focal / ty - d.lift * focal / ty, top = floorY - shh;
    if (scrX + sww / 2 < 0 || scrX - sww / 2 > W) continue;
    const x0 = (scrX - sww / 2) / W * 2 - 1, x1 = (scrX + sww / 2) / W * 2 - 1, y0 = 1 - top / H * 2, y1 = 1 - floorY / H * 2, z = Math.min(.999, ty / 30) * 2 - 1;
    gl.depthMask(!d.soft); gl.bindTexture(gl.TEXTURE_2D, glSprTex(d.sprite));
    gl.uniform1f(GL.us.l, clamp(.22 + .78 / (1 + ty * .28) + G.flash / .075 * .25 / (1 + ty * ty * .1), 0, 1.2)); gl.uniform1f(GL.us.a, d.alpha); gl.uniform1f(GL.us.e, d.emit ? 1 : 0);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x0, y0, z, 0, 0, x1, y0, z, 1, 0, x1, y1, z, 1, 1, x0, y0, z, 0, 0, x1, y1, z, 1, 1, x0, y1, z, 0, 1]), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  gl.depthMask(true); gl.disable(gl.BLEND);
  // 2D overlay on top: hit sparks, then HUD effects and the weapon
  vctx.clearRect(0, 0, VW, VH);
  for (const im of G.impacts) {
    if (!los(me.x, me.y, im.x, im.y)) continue; const dx = im.x - cx0, dy = im.y - cy0, tx = inv * (dirY * dx - dirX * dy), ty = inv * (-plY * dx + plX * dy); if (ty < .2) continue;
    const X = (W / 2) * (1 + tx / ty), r = Math.max(2, focal / ty * .16 * (im.life / im.total + .4)), gr = vctx.createRadialGradient(X, horizon, 0, X, horizon, r);
    gr.addColorStop(0, im.kind === 'hit' ? 'rgba(255,90,90,.95)' : 'rgba(255,240,190,.95)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); vctx.fillStyle = gr; vctx.fillRect(X - r, horizon - r, r * 2, r * 2);
  }
  drawOverlay(me);
}

function renderCPU() {
  const me = G.me; if (!me) return;
  const aimZ = me.aim, plane = (.4875 * BW / BH) * (1 - aimZ * .28); focal = BW / (2 * plane);
  const sh = G.shake > 0 ? G.shake : 0, cx0 = me.x + (rnd() - .5) * sh * .03, cy0 = me.y + (rnd() - .5) * sh * .03;
  const dirX = Math.cos(me.a), dirY = Math.sin(me.a), plX = -dirY * plane, plY = dirX * plane;
  const hor = BH >> 1, bob = Math.sin(me.stride) * me.moving * 1.6 | 0, horizon = hor + bob;
  // floor + ceiling
  const FT = TEX.floor.d, CT = TEX.ceil.d, TM = TS - 1;
  for (let y = 0; y < BH; y++) {
    const off = y - horizon; if (off === 0) continue; const isFloor = off > 0, rd = 0.5 * focal / Math.abs(off); if (rd > 22) { buf32.fill(0xff0b0f14, y * BW, (y + 1) * BW); continue; }
    const l = clamp(.28 + .72 / (1 + rd * .22), 0, 1) * (isFloor ? 1 : .8), T = isFloor ? FT : CT;
    let fx = cx0 + rd * (dirX - plX), fy = cy0 + rd * (dirY - plY); const sx = rd * 2 * plX / BW, sy = rd * 2 * plY / BW; let o = y * BW;
    for (let x = 0; x < BW; x++, fx += sx, fy += sy) { const tx = ((fx * TS) & TM), ty = ((fy * TS) & TM); buf32[o++] = shade(T[ty * TS + tx], l); }
  }
  // walls
  for (let x = 0; x < BW; x++) {
    const cam = 2 * x / BW - 1, rdx = dirX + plX * cam, rdy = dirY + plY * cam; let mx = Math.floor(cx0), my = Math.floor(cy0);
    const ddx = Math.abs(1 / (rdx || 1e-9)), ddy = Math.abs(1 / (rdy || 1e-9)); let stx, sty, sdx, sdy;
    if (rdx < 0) { stx = -1; sdx = (cx0 - mx) * ddx; } else { stx = 1; sdx = (mx + 1 - cx0) * ddx; }
    if (rdy < 0) { sty = -1; sdy = (cy0 - my) * ddy; } else { sty = 1; sdy = (my + 1 - cy0) * ddy; }
    let side = 0, t = 0, pd = 24;
    for (let i = 0; i < 64; i++) {
      if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
      const row = G.grid[my + 1], tt = row && row[mx + 1] !== undefined ? row[mx + 1] : 1;
      if (tt !== 0) { t = tt; pd = side === 0 ? sdx - ddx : sdy - ddy; break; }
    }
    zbuf[x] = pd; if (!t) continue;
    const lh = Math.min(BH * 4, focal / Math.max(pd, .05)), y0 = (horizon - lh / 2) | 0, y1 = (horizon + lh / 2) | 0;
    let wx = side === 0 ? cy0 + pd * rdy : cx0 + pd * rdx; wx -= Math.floor(wx); if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) wx = 1 - wx;
    const tex = wallTex(t, mx + 1, my + 1).d, tx = (wx * TS) | 0, l = clamp(.2 + .8 / (1 + pd * .2), 0, 1) * (side ? .72 : 1), step = TS / lh;
    let tp = (Math.max(y0, 0) - y0) * step;
    for (let y = Math.max(y0, 0); y < Math.min(y1, BH); y++) { buf32[y * BW + x] = shade(tex[(tp | 0) * TS + tx], l); tp += step; }
  }
  // sprites
  const sp = [];
  const addS = (s) => { const dx = s.x - cx0, dy = s.y - cy0; s.d = dx * dx + dy * dy; sp.push(s); };
  for (const e of G.enemies) addS({ x: e.x, y: e.y, k: 'e', e });
  for (const p of G.players) if (p !== me) addS({ x: p.x, y: p.y, k: 'p', p });
  if (!G.objective) addS({ x: G.target.x, y: G.target.y, k: 't' }); else addS({ x: G.exit.x, y: G.exit.y, k: 'x' });
  for (const v of G.projectiles) addS({ x: v.x, y: v.y, k: 'n', v });
  for (const c of G.clouds) addS({ x: c.x, y: c.y, k: 's', c });
  sp.sort((a, b) => b.d - a.d);
  const inv = 1 / (plX * dirY - dirX * plY);
  for (const s of sp) {
    const dx = s.x - cx0, dy = s.y - cy0, tx = inv * (dirY * dx - dirX * dy), ty = inv * (-plY * dx + plX * dy);
    if (ty < .15) continue; const scrX = (BW / 2) * (1 + tx / ty); let sprite, hgt = .85, wid = .43, lift = 0, alpha = 1, fl = 1;
    if (s.k === 'e') { const e = s.e; const st = !e.alive ? 'down' : e.fire > 0 ? 'fire' : e.alert > 0 && e.stun <= 0 && !e.moving ? 'aim' : e.moving ? 'walk' : 'idle'; sprite = humanoid('enemy', st === 'walk' ? 'walk' : st, Math.floor(e.walk) % 2, 0); if (!e.alive) { hgt = .85; } }
    else if (s.k === 'p') { const p = s.p; sprite = humanoid('ally', p.dead ? 'down' : (G.timer - (p.shotT || -9) < .12 ? 'fire' : 'aim'), 0, p.crew); }
    else if (s.k === 't') { sprite = spriteTerminal(1); hgt = .8; wid = .6; } else if (s.k === 'x') { sprite = spriteExit(); hgt = .8; wid = .6; }
    else if (s.k === 'n') { sprite = spriteNade(s.v.kind); hgt = .16; wid = .16; lift = s.v.z - .1; }
    else { sprite = spriteSmoke(); hgt = 1.2; wid = 1.2; lift = -.1; fl = clamp(s.c.life, 0, 1) * .8; }
    const sh_ = Math.abs(focal / ty) * hgt, sw_ = Math.abs(focal / ty) * wid * (s.k === 's' ? 1 : 1), floorY = horizon + 0.5 * focal / ty - lift * focal / ty, top = floorY - sh_;
    const x0 = Math.floor(scrX - sw_ / 2), x1 = Math.floor(scrX + sw_ / 2), l = clamp(.25 + .75 / (1 + ty * .2), 0, 1), isSm = s.k === 's';
    for (let x = Math.max(0, x0); x < Math.min(BW, x1); x++) {
      if (ty >= zbuf[x]) continue; const u = ((x - x0) / Math.max(1, x1 - x0) * sprite.w) | 0;
      for (let y = Math.max(0, Math.floor(top)); y < Math.min(BH, Math.floor(floorY)); y++) {
        const v = ((y - top) / Math.max(1, floorY - top) * sprite.h) | 0, c = sprite.d[v * sprite.w + u], a = (c >>> 24); if (a < 20) continue;
        const o = y * BW + x; let col = isSm ? c : shade(c, s.k === 't' || s.k === 'x' || (s.k === 'e' && s.e.fire > 0) ? 1 : l);
        if (a < 250 || fl < 1) { const aa = (a / 255) * fl, d0 = buf32[o]; const rr = ((d0 & 255) * (1 - aa) + (col & 255) * aa) | 0, gg = (((d0 >> 8) & 255) * (1 - aa) + ((col >> 8) & 255) * aa) | 0, bb = (((d0 >> 16) & 255) * (1 - aa) + ((col >> 16) & 255) * aa) | 0; col = 0xff000000 | (bb << 16) | (gg << 8) | rr; }
        buf32[o] = col;
      }
    }
  }
  // impacts
  for (const im of G.impacts) {
    const dx = im.x - cx0, dy = im.y - cy0, tx = inv * (dirY * dx - dirX * dy), ty = inv * (-plY * dx + plX * dy); if (ty < .2) continue;
    const scrX = (BW / 2) * (1 + tx / ty) | 0, r = Math.max(1, (focal / ty) * .14 * (im.life / im.total + .4)) | 0, yy = (horizon + (im.kind === 'hit' ? -.1 : 0) * focal / ty) | 0, col = im.kind === 'hit' ? 0xff3a3aff : 0xff9adcff;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) { const X = scrX + x, Y = yy + y; if (X >= 0 && X < BW && Y >= 0 && Y < BH && ty < zbuf[X] + .1) buf32[Y * BW + X] = col; }
  }
  bctx.putImageData(imgData, 0, 0);
  vctx.imageSmoothingEnabled = true; vctx.drawImage(bufCanvas, 0, 0, VW, VH);
  drawOverlay(me);
}

function render() { if (!G.me) return; if (use3D) { try { R3.render(G.me, camView, VW, VH); } catch (e) { console.error('3D renderer failed, using the classic renderer', e); use3D = false; r3c.style.display = 'none'; useGL = glInit(); resize(); return; } vctx.clearRect(0, 0, VW, VH); drawOverlay(G.me); return; } if (useGL) renderGL(); else renderCPU(); }
function drawOverlay(me) {
  const c = vctx, w = VW, h = VH, sc = h / 360;
  // damage vignette + flash/blast
  if (G.hurt > 0) { const gr = c.createRadialGradient(w / 2, h / 2, h * .25, w / 2, h / 2, h * .85); gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, 'rgba(255,0,0,' + (G.hurt * 2.2).toFixed(2) + ')'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }
  if (me.hp / me.maxhp < .3 && !me.dead) { c.fillStyle = 'rgba(160,0,0,' + (.12 + .06 * Math.sin(G.timer * 6)).toFixed(2) + ')'; c.fillRect(0, 0, w, h); }
  if (G.blast > 0) { c.fillStyle = 'rgba(255,255,255,' + clamp(G.blast * 1.4, 0, .9).toFixed(2) + ')'; c.fillRect(0, 0, w, h); }
  // threat arcs
  for (const t of G.threats) { const rel = angN(t.a - me.a), px_ = w / 2 + Math.sin(rel) * h * .42, py_ = h / 2 - Math.cos(rel) * h * .42; c.save(); c.translate(px_, py_); c.rotate(rel); c.fillStyle = t.hit ? 'rgba(255,60,60,' + (t.life * 1.8).toFixed(2) + ')' : 'rgba(255,200,60,' + (t.life * 1.4).toFixed(2) + ')'; c.beginPath(); c.moveTo(0, -18 * sc); c.lineTo(-9 * sc, 8 * sc); c.lineTo(9 * sc, 8 * sc); c.fill(); c.restore(); }
  // weapon
  if (!me.dead && !use3D) drawWeapon(c, w, h, me);
  // hit marker
  const xh = $('xh'); xh.classList.toggle('hit', G.hitmark > 0 || G.killmark > 0); xh.style.opacity = me.aim > .6 ? '.35' : '1';
  if (me.reload > 0) { const pct = 1 - me.reload / me.reloadTotal; c.fillStyle = '#0008'; c.fillRect(w / 2 - 60 * sc, h * .66, 120 * sc, 8 * sc); c.fillStyle = '#cdbd82'; c.fillRect(w / 2 - 60 * sc, h * .66, 120 * sc * pct, 8 * sc); }
}
const GUNCOL = ['#2c3033', '#272b2d', '#2f3430', '#202325', '#2d322d', '#4b4533'];
function drawWeapon(c, w, h, me) {
  const wp = WEAPONS[me.gun], sc = h / 360, bobX = Math.sin(me.stride * .5) * me.moving * 8 * sc * (1 - me.aim), bobY = Math.abs(Math.sin(me.stride * .5)) * me.moving * 8 * sc * (1 - me.aim);
  const kick = me.recoil * 26 * sc, rl = me.reload > 0 ? Math.sin((1 - me.reload / me.reloadTotal) * Math.PI) * 80 * sc : 0;
  const cx = w * (.66 - .16 * me.aim) + bobX, by = h + 14 * sc - bobY + kick + rl - me.aim * 12 * sc;
  const L = (150 + wp.len * 150) * sc, tw = (me.gun === 3 ? 46 : me.gun === 0 ? 36 : 31) * sc, col = GUNCOL[me.gun];
  const metal = (x0, x1, a, b) => { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, a); g.addColorStop(.35, b); g.addColorStop(.62, a); g.addColorStop(1, '#0b0c0c'); return g; };
  c.save(); c.translate(cx, by); c.lineJoin = 'round';
  // camo sleeves up to the hands
  const sleeve = (x0, x1, y1) => { c.save(); c.beginPath(); c.moveTo(x0 - tw * .9, 40 * sc); c.lineTo(x0 + tw * .9, 40 * sc); c.lineTo(x1 + tw * .55, y1); c.lineTo(x1 - tw * .55, y1); c.closePath(); c.fillStyle = '#4a5434'; c.fill(); c.clip();
    const r = mulberry(5 + (x0 | 0)); for (let i = 0; i < 16; i++) { c.fillStyle = ['#2e3820', '#6b5f3e', '#232a18', '#5d6a3d'][i & 3]; c.beginPath(); c.ellipse(x0 + (r() - .5) * tw * 3, y1 + r() * (40 * sc - y1), 7 * sc + r() * 14 * sc, 4 * sc + r() * 9 * sc, r() * 3, 0, 7); c.fill(); }
    const g = c.createLinearGradient(x0 - tw, 0, x0 + tw, 0); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)'); c.fillStyle = g; c.fillRect(x0 - tw * 2, y1, tw * 4, 60 * sc); c.restore(); };
  sleeve(-tw * 1.7, -tw * .9, -L * .42); sleeve(tw * 2.1, tw * .8, -L * .1);
  // receiver body: perspective taper, specular edge, shadow edge
  c.fillStyle = metal(-tw, tw, '#16191b', col); c.beginPath(); c.moveTo(-tw * .85, -L * .1); c.lineTo(-tw * .3, -L); c.lineTo(tw * .3, -L); c.lineTo(tw * .85, -L * .1); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.26)'; c.lineWidth = 1.4 * sc; c.beginPath(); c.moveTo(-tw * .3, -L); c.lineTo(-tw * .85, -L * .1); c.stroke();
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.moveTo(tw * .3, -L); c.lineTo(tw * .85, -L * .1); c.lineTo(tw * .6, -L * .1); c.lineTo(tw * .22, -L); c.fill();
  // top rail (picatinny teeth) and ejection port
  c.fillStyle = '#0d0f10'; c.fillRect(-tw * .16, -L * .98, tw * .32, L * .86); c.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 16; i++) c.fillRect(-tw * (.16 - i * .002), -L * (.14 + i * .052), tw * .32, 1.2 * sc);
  c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(tw * .32, -L * .46, tw * .3, L * .12); c.fillStyle = '#7a7058'; c.fillRect(tw * .34, -L * .46, tw * .08, 2 * sc);
  for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(-tw * (.5 - i * .02), -L * (.52 + i * .075), 3 * sc, 6 * sc, 0, 0, 7); c.fill(); }
  // gas block / front sight, barrel, flash hider, suppressor
  c.fillStyle = metal(-tw * .2, tw * .2, '#070809', '#3a4046'); c.fillRect(-tw * .13, -L - 22 * sc, tw * .26, 24 * sc);
  c.fillStyle = '#101214'; c.fillRect(-tw * .2, -L - 30 * sc, tw * .4, 10 * sc); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(-tw * .2, -L - 30 * sc, tw * .08, 10 * sc);
  if (me.att[1] === 2) { c.fillStyle = metal(-tw * .28, tw * .28, '#08090a', '#2a3036'); c.fillRect(-tw * .24, -L - 78 * sc, tw * .48, 54 * sc); c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(-tw * .24, -L - 78 * sc, tw * .08, 54 * sc); }
  c.fillStyle = '#cfd2c8'; c.fillRect(-1.5 * sc, -L - 38 * sc, 3 * sc, 9 * sc);
  // optic
  if (me.att[0] > 0) { const oy = -L * .72, ow = (me.att[0] > 1 ? 24 : 17) * sc; c.fillStyle = '#0c0e0f'; c.fillRect(-ow, oy, ow * 2, 26 * sc); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-ow, oy, ow * .4, 26 * sc);
    c.strokeStyle = '#17191b'; c.lineWidth = 5 * sc; c.beginPath(); c.arc(0, oy - 2 * sc, ow * .9, 0, 7); c.stroke(); const lg = c.createRadialGradient(-ow * .3, oy - ow * .4, 0, 0, oy - 2 * sc, ow * .85); lg.addColorStop(0, 'rgba(160,200,220,.55)'); lg.addColorStop(1, 'rgba(10,20,28,.78)'); c.fillStyle = lg; c.beginPath(); c.arc(0, oy - 2 * sc, ow * .85, 0, 7); c.fill();
    c.fillStyle = me.att[0] > 1 ? '#66e0ff' : '#ff3a2a'; c.beginPath(); c.arc(0, oy - 2 * sc, 2 * sc, 0, 7); c.fill(); }
  // gloved hands: forward grip + trigger hand
  const glove = (x, y, rx, ry, rot) => { c.save(); c.translate(x, y); c.rotate(rot); const g = c.createLinearGradient(-rx, -ry, rx, ry); g.addColorStop(0, '#4a4a40'); g.addColorStop(1, '#16160f'); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.2 * sc; c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.45)'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(-rx * .9, i * ry * .36); c.lineTo(rx * .2, i * ry * .36); c.stroke(); } c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(-rx * .3, -ry * .45, rx * .45, ry * .2, 0, 0, 7); c.fill(); c.restore(); };
  glove(-tw * .88, -L * .4, tw * .62, tw * .42, -.35); glove(tw * .72, -L * .08, tw * .7, tw * .46, .5);
  // muzzle flash with core, glow and sparks
  if (G.flash > 0) { const k = G.flash / .075, fy = -L - 34 * sc, gr = c.createRadialGradient(0, fy, 0, 0, fy, 120 * sc); gr.addColorStop(0, 'rgba(255,255,240,' + (.98 * k).toFixed(2) + ')'); gr.addColorStop(.2, 'rgba(255,214,110,' + (.85 * k).toFixed(2) + ')'); gr.addColorStop(.55, 'rgba(255,120,20,' + (.3 * k).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,80,0,0)'); c.fillStyle = gr; c.fillRect(-130 * sc, fy - 130 * sc, 260 * sc, 260 * sc);
    c.fillStyle = 'rgba(255,245,200,' + (.9 * k).toFixed(2) + ')'; for (let a = 0; a < 6; a++) { c.save(); c.translate(0, fy); c.rotate(a * 1.047 + G.timer * 9); c.beginPath(); c.moveTo(-3 * sc, 0); c.lineTo(0, -(46 + (a % 2) * 26) * sc); c.lineTo(3 * sc, 0); c.fill(); c.restore(); } }
  c.restore();
}
function drawMini() {
  const c = $('mini').getContext('2d'), n = 17, cs = 96 / n, me = G.me; if (!me) return; c.clearRect(0, 0, 96, 96);
  for (let y = 1; y <= n; y++) for (let x = 1; x <= n; x++) { const t = G.grid[y][x]; if (t) { c.fillStyle = t === 2 ? '#ffd60a' : t === 3 ? '#8a6a3c' : '#2c3a44'; c.fillRect((x - 1) * cs, (y - 1) * cs, cs + .5, cs + .5); } }
  const dot = (x, y, col, r) => { c.fillStyle = col; c.beginPath(); c.arc(x * cs, y * cs, r, 0, 7); c.fill(); };
  if (!G.objective) dot(G.target.x, G.target.y, '#38d6ff', 3.2); else dot(G.exit.x, G.exit.y, '#cdbd82', 3.2);
  for (const e of G.enemies) if (e.alive && dist(e.x, e.y, me.x, me.y) < 9 && (G.mode === 'guest' || los(me.x, me.y, e.x, e.y))) dot(e.x, e.y, '#ff4a4a', 2.2);
  for (const p of G.players) if (p !== me) dot(p.x, p.y, CREW[p.crew].c, 2.6);
  c.save(); c.translate(me.x * cs, me.y * cs); c.rotate(me.a); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(5, 0); c.lineTo(-3, -3); c.lineTo(-3, 3); c.fill(); c.restore();
}
let hudT = 0;
function updateHud(dt) {
  const me = G.me; if (!me) return; hudT -= dt; drawMini(); if (hudT > 0) return; hudT = .1;
  $('hpB').style.width = clamp(me.hp / me.maxhp * 100, 0, 100) + '%'; $('hpB').style.background = me.hp / me.maxhp < .36 ? '#ff4a4a' : '';
  $('hpT').textContent = CREW[me.crew].name + '  ' + Math.max(0, Math.ceil(me.hp)) + '/' + me.maxhp + '  ' + GEAR[me.armor].name.toUpperCase();
  $('ammo').textContent = me.reload > 0 ? '--' : me.ammo; $('res').textContent = '/' + me.reserve; $('wName').textContent = WEAPONS[me.gun].name.toUpperCase();
  $('gear').innerHTML = 'MEDKIT ' + me.kit + ' &nbsp; ' + THROW[me.thr].name.split(' ')[0].toUpperCase() + ' ' + me.throwCount + ' &nbsp; BREACH ' + me.breach;
  const alive = G.enemies.filter((e) => e.alive).length;
  $('obj').textContent = G.objective ? 'GET TO EXTRACTION (green marker)' : 'REACH THE BLUE TERMINAL AND PRESS USE';
  $('obj').textContent += '   |   HOSTILES ' + alive;
  $('down').style.display = me.dead ? 'flex' : 'none';
  if (G.players.length > 1) $('team').innerHTML = G.players.map((p) => '<div style="color:' + CREW[p.crew].c + '">' + p.name + ' ' + (p.dead ? 'DOWN' : Math.ceil(p.hp / p.maxhp * 100) + '%') + '</div>').join(''); else $('team').innerHTML = '';
}

/* ============================== STATES / MENUS ============================== */
function setState(s) {
  G.state = s; for (const el of document.querySelectorAll('.screen')) el.classList.remove('on');
  const map = { splash: 'sSplash', menu: 'sMenu', select: 'sSelect', load: 'sLoad', brief: 'sBrief', pause: 'sPause', result: 'sResult', ctl: 'sCtl', cred: 'sCred', online: 'sOnline', lobby: 'sLobby' };
  if (map[s]) $(map[s]).classList.add('on');
  const playing = s === 'play' || s === 'pause'; $('hud').classList.toggle('on', playing); $('touch').classList.toggle('on', s === 'play');
  $('backLink').style.display = s === 'play' || s === 'pause' ? 'none' : 'block';
  if (s === 'pause') $('sPause').classList.add('on');
}
function toMenu() { leaveMPQuiet(); G.mode = 'menu'; refreshMenu(); setState('menu'); document.exitPointerLock && document.exitPointerLock(); }
function refreshMenu() { $('menuSub').textContent = 'RANK ' + rankOf() + '  •  ' + prof.xp + ' XP  •  OPERATOR ' + CREW[prof.crew].name; $('mCont').textContent = prof.cleared >= MISSIONS.length ? 'REPLAY FINAL MISSION' : 'CONTINUE CAMPAIGN'; }
function badge(i, size) { const c = CREW[i]; return '<span style="display:inline-flex;align-items:center;justify-content:center;width:' + size + 'px;height:' + size + 'px;border-radius:50%;border:3px solid ' + c.c + ';background:#0c1820;color:' + c.c + ';font:700 ' + Math.round(size * .42) + 'px Anton,sans-serif;letter-spacing:.05em;vertical-align:middle">' + c.name[0] + '</span>'; }
function crewRow(el, sel, onPick) {
  el.innerHTML = ''; CREW.forEach((c, i) => { const d = document.createElement('div'); d.innerHTML = badge(i, 56); d.title = c.name; d.style.opacity = onPick && i !== sel ? .45 : 1; if (onPick) { d.style.cursor = 'pointer'; d.onclick = () => onPick(i); } el.appendChild(d); });
}
let briefM = 0, briefTrain = false;
function brief(i, train) { briefM = i; briefTrain = !!train; const m = MISSIONS[i]; $('brT').textContent = 'OPERATION ' + (i + 1) + ': ' + m.name.toUpperCase(); $('brP').textContent = m.place; $('brB').textContent = m.brief; $('brO').textContent = 'OBJECTIVE: reach the terminal, secure the archive, then fight to the extraction point. ' + m.n + ' hostiles on site; a response team is called once the alarm trips.'; $('brM').textContent = train ? 'Training: replay any mission, progress is not saved as campaign clears.' : ''; setState('brief'); }
function buildSelect(train) {
  const el = $('selList'); el.innerHTML = ''; $('selSub').textContent = train ? 'Training / replay: every mission is open' : 'Campaign: clear a mission to unlock the next';
  MISSIONS.forEach((m, i) => { const open = train || i < prof.unlocked, d = document.createElement('div'); d.className = 'mis' + (open ? '' : ' locked'); d.innerHTML = '<b>' + (i + 1) + '</b><div>' + m.name + '<small>' + (open ? m.place : 'LOCKED') + '</small></div>' + (i < prof.cleared ? '<span style="margin-left:auto;color:#5ce8b8">CLEARED</span>' : ''); if (open) d.onclick = () => brief(i, train); el.appendChild(d); });
  setState('select');
}
function buildLoadout() {
  const el = $('ldList'); el.innerHTML = ''; const rk = rankOf(); $('ldSub').textContent = 'RANK ' + rk + '  •  ' + prof.xp + ' XP  •  unlock more gear by ranking up (100 XP per rank)';
  crewRow($('ldCrew'), prof.crew, (i) => { prof.crew = i; buildLoadout(); });
  const b = prof.b[prof.gun];
  const rows = [
    ['OPERATOR', () => CREW[prof.crew].name, (d) => { prof.crew = (prof.crew + d + CREW.length) % CREW.length; }],
    ['WEAPON', () => WEAPONS[prof.gun].name + ' (LV' + WEAPONS[prof.gun].rank + ')', (d) => cyc(WEAPONS, 'gun', d)],
    ['ARMOR', () => GEAR[prof.armor].name + ' (LV' + GEAR[prof.armor].rank + ')', (d) => cyc(GEAR, 'armor', d)],
    ['SIGHT', () => ATT[0][b[0]].name, (d) => cycA(0, d)], ['MUZZLE', () => ATT[1][b[1]].name, (d) => cycA(1, d)], ['MAGAZINE', () => ATT[2][b[2]].name, (d) => cycA(2, d)],
    ['THROWABLE', () => THROW[prof.thr].name + ' (LV' + THROW[prof.thr].rank + ')', (d) => cyc(THROW, 'thr', d)]];
  function cyc(list, key, d) { const j = (prof[key] + d + list.length) % list.length; if (list[j].rank > rankOf()) return lockMsg(list[j]); prof[key] = j; }
  function cycA(s, d) { const j = (b[s] + d + ATT[s].length) % ATT[s].length; if (ATT[s][j].rank > rankOf()) return lockMsg(ATT[s][j]); b[s] = j; }
  function lockMsg(it) { $('ldInfo').innerHTML = '<p style="color:#ffd60a">' + it.name + ' unlocks at rank ' + it.rank + '</p>'; throw 'locked'; }
  rows.forEach(([lab, val, ch]) => { const d = document.createElement('div'); d.className = 'ld'; d.innerHTML = '<span>' + lab + '</span><button>‹</button><b>' + val() + '</b><button>›</button>'; const bt = d.querySelectorAll('button'); [-1, 1].forEach((dir, i) => { bt[i].onclick = () => { try { ch(dir); buildLoadout(); } catch (e) { if (e !== 'locked') throw e; } }; }); el.appendChild(d); });
  const w = WEAPONS[prof.gun]; $('ldInfo').innerHTML = '<div class="stats"><div>Damage<b>' + w.damage + '</b></div><div>Magazine<b>' + w.mag + '</b></div><div>Fire rate<b>' + (1 / w.rate).toFixed(1) + '/s</b></div><div>Reserve<b>' + w.reserve + '</b></div><div>Armor HP<b>' + GEAR[prof.armor].hp + '</b></div><div>Speed<b>' + GEAR[prof.armor].speed + '</b></div></div>';
  setState('load');
}
function playerDef() { return { pid: MP.pid, name: (prof.name || CREW[prof.crew].name), crew: prof.crew, gun: prof.gun, armor: prof.armor, att: prof.b[prof.gun].slice(), thr: prof.thr }; }

/* ============================== MISSION START ============================== */
function begin(missionIdx, defs, meIdx) {
  G.mission = missionIdx; makeLevel(missionIdx); resetRun();
  G.players = defs.map((d, i) => newPlayer(d, i)); G.me = G.players[meIdx];
  G.enemies.forEach((e) => { e.lw = 0; });
  notify('Recover the archive. Reach the blue terminal.'); $('hpAv').innerHTML = badge(G.me.crew, 42);
  setState('play'); audioInit(); if (AC && AC.state === 'suspended') AC.resume();
}
function startSolo(i, train) { G.mode = 'solo'; G.trainMode = !!train; begin(i, [playerDef()], 0); }

/* ============================== NETWORK (co-op) ============================== */
const MP = { on: false, host: false, code: '', pid: Math.random().toString(36).slice(2, 10), net: null, roster: [], heard: {}, mission: 0, joined: false, lastSnap: 0, sendT: 0, snapT: 0, helloT: 0, lobbyT: 0 };
const NET_EVENTS = ['hello', 'lobby', 'bye', 'start', 'in', 'snap', 'end', 'full'];
const MP_LOCAL = new URLSearchParams(location.search).get('mp') === 'local';
G.out = []; G.seq = 0;
function loadSB() { return new Promise((res, rej) => { if (window.supabase && window.supabase.createClient) return res(); const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'; s.onload = () => res(); s.onerror = () => rej(new Error('lib')); document.head.appendChild(s); }); }
async function mpConnect(code) {
  const topic = 'shadow-room-' + code, H = {};
  if (MP_LOCAL || !navigator.onLine) { const bc = new BroadcastChannel(topic); bc.onmessage = (m) => { const f = H[m.data.ev]; if (f) f(m.data.p); }; return { send: (ev, p) => bc.postMessage({ ev, p }), on: (ev, f) => (H[ev] = f), close: () => bc.close() }; }
  await loadSB();
  const sb = window.supabase.createClient(SB.url, SB.key, { realtime: { params: { eventsPerSecond: 30 } } });
  const ch = sb.channel(topic, { config: { broadcast: { self: false, ack: false } } });
  for (const ev of NET_EVENTS) ch.on('broadcast', { event: ev }, (m) => { const f = H[ev]; if (f) f(m.payload); });
  await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('timeout')), 12000); ch.subscribe((st) => { if (st === 'SUBSCRIBED') { clearTimeout(to); res(); } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') { clearTimeout(to); rej(new Error(st)); } }); });
  return { send: (ev, p) => ch.send({ type: 'broadcast', event: ev, payload: p }), on: (ev, f) => (H[ev] = f), close: () => { try { sb.removeChannel(ch); } catch (e) {} } };
}
const netSend = (ev, p) => { if (MP.net) try { MP.net.send(ev, p); } catch (e) {} };
const cleanName = (n) => String(n || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 14).toUpperCase();
function mpWire() {
  const n = MP.net;
  if (MP.host) {
    n.on('hello', (p) => {
      if (!p || !p.pid) return; MP.heard[p.pid] = Date.now(); const ex = MP.roster.find((r) => r.pid === p.pid);
      if (ex) { Object.assign(ex, sanitize(p)); return; }
      if (MP.roster.length >= 4 || G.state === 'play') { netSend('full', { pid: p.pid }); return; }
      MP.roster.push(sanitize(p)); pushLobby(); renderLobby();
    });
    n.on('bye', (p) => { if (!p) return; MP.roster = MP.roster.filter((r) => r.pid !== p.pid || r.host); const i = G.players.findIndex((x) => x.pid === p.pid); if (i >= 0 && G.mode === 'host') { notify(G.players[i].name + ' left'); G.players.splice(i, 1); } pushLobby(); renderLobby(); });
    n.on('in', (p) => { if (!p || !p.pid) return; MP.heard[p.pid] = Date.now(); onGuestInput(p); });
  } else {
    n.on('lobby', (p) => { if (!p) return; if (p.closed) { leaveMP(); toMenu(); $('oMsg').textContent = 'The host closed the squad.'; return; } MP.heard.host = Date.now(); MP.roster = p.roster || []; MP.mission = p.mission | 0; if (!MP.roster.some((r) => r.pid === MP.pid)) { if (MP.joined) { leaveMP(); toMenu(); } return; } MP.joined = true; if (G.state === 'online') setState('lobby'); if (G.state === 'lobby' || G.state === 'online') renderLobby(); });
    n.on('full', (p) => { if (p && p.pid === MP.pid) { $('oMsg').textContent = 'That squad is full or already deployed.'; leaveMP(); } });
    n.on('start', (p) => { if (!p) return; MP.heard.host = Date.now(); if (G.state === 'play') return; guestStart(p); });
    n.on('snap', (p) => { MP.heard.host = Date.now(); onSnap(p); });
    n.on('end', (p) => { if (G.state === 'play' || G.state === 'pause') { G.over = true; showResult(!!p.win, p.kills | 0); } });
  }
}
function sanitize(p) { return { pid: String(p.pid), name: cleanName(p.name) || 'OPERATOR', crew: clamp(p.crew | 0, 0, 4), gun: clamp(p.gun | 0, 0, 5), armor: clamp(p.armor | 0, 0, 2), att: [clamp((p.att || [])[0] | 0, 0, 3), clamp((p.att || [])[1] | 0, 0, 2), clamp((p.att || [])[2] | 0, 0, 2)], thr: clamp(p.thr | 0, 0, 2), host: false }; }
function pushLobby() { if (MP.host) netSend('lobby', { roster: MP.roster, mission: MP.mission, playing: G.state === 'play' }); }
const makeCode = () => { let s = ''; for (let i = 0; i < 4; i++) s += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(rnd() * 24)]; return s; };
async function mpHost() {
  const name = cleanName($('oName').value) || CREW[prof.crew].name; prof.name = name; saveProf(); $('oMsg').textContent = 'Opening a squad room...';
  const code = makeCode(); try { MP.net = await mpConnect(code); } catch (e) { $('oMsg').textContent = "Couldn't connect. Check your connection."; return; }
  Object.assign(MP, { on: true, host: true, code, joined: true, mission: Math.min(prof.unlocked - 1, 0) === 0 ? 0 : 0, heard: {} });
  const me = playerDef(); me.name = name; me.host = true; MP.roster = [me]; mpWire(); MP.lobbyT = 0; setState('lobby'); renderLobby(); pushLobby();
}
async function mpJoin() {
  const name = cleanName($('oName').value) || CREW[prof.crew].name, code = ($('oCode').value || '').toUpperCase().replace(/[^A-Z]/g, ''); if (code.length !== 4) { $('oMsg').textContent = 'Room codes are 4 letters.'; return; }
  prof.name = name; saveProf(); $('oMsg').textContent = 'Joining ' + code + '...';
  try { MP.net = await mpConnect(code); } catch (e) { $('oMsg').textContent = "Couldn't connect. Check your connection."; return; }
  Object.assign(MP, { on: true, host: false, code, joined: false, roster: [], heard: { host: Date.now() } }); mpWire(); sendHello(); MP.helloT = 0; const t0 = Date.now();
  const w = setInterval(() => { if (!MP.on || MP.code !== code) return clearInterval(w); if (MP.joined) return clearInterval(w); if (Date.now() - t0 > 8000) { clearInterval(w); $('oMsg').textContent = 'No squad found with that code.'; leaveMP(); } }, 500);
}
function sendHello() { const d = playerDef(); d.name = cleanName($('oName').value) || prof.name || d.name; netSend('hello', d); }
function renderLobby() {
  $('lCode').textContent = MP.code; $('lShare').textContent = 'Share this code. Friends: zevsocialconnect.com/games → Shadow Protocol → Online co-op';
  $('lRoster').innerHTML = MP.roster.map((r) => '<div class="pl"><span><span style="margin-right:8px">' + badge(r.crew, 26) + '</span>' + r.name + (r.pid === MP.pid ? ' (you)' : '') + '</span><em>' + WEAPONS[r.gun].name + (r.host ? ' • HOST' : '') + '</em></div>').join('');
  $('lMis').innerHTML = '<b style="color:var(--mint)">OPERATION ' + (MP.mission + 1) + ': ' + MISSIONS[MP.mission].name.toUpperCase() + '</b><br><small style="color:var(--muted)">' + MISSIONS[MP.mission].place + '</small>';
  $('lHostBtns').style.display = MP.host ? 'flex' : 'none'; $('lStart').style.display = MP.host ? '' : 'none'; $('lMsg').textContent = MP.host ? (MP.roster.length < 2 ? 'You can start solo, or wait for friends.' : '') : 'Waiting for the host to start...';
}
function hostStart() {
  if (!MP.host) return; const defs = MP.roster.map((r) => ({ pid: r.pid, name: r.name, crew: r.crew, gun: r.gun, armor: r.armor, att: r.att, thr: r.thr }));
  G.mode = 'host'; G.trainMode = true; MP.heard = {}; for (const r of MP.roster) MP.heard[r.pid] = Date.now();
  netSend('start', { mission: MP.mission, defs }); begin(MP.mission, defs, defs.findIndex((d) => d.pid === MP.pid)); MP.snapT = 0;
}
function guestStart(p) { const defs = p.defs || []; const mi = defs.findIndex((d) => d.pid === MP.pid); if (mi < 0) return; G.mode = 'guest'; G.trainMode = true; MP.lastSnap = Date.now(); G.out = []; G.seq = 0; G.mission = p.mission | 0; begin(p.mission | 0, defs.map(sanitizeDef), mi); G.guestEn = []; }
const sanitizeDef = (d) => Object.assign(sanitize(d), { name: cleanName(d.name) || 'OPERATOR' });
function backToLobby() { if (G.mode === 'host') { setState('lobby'); renderLobby(); pushLobby(); } else if (G.mode === 'guest') { setState('lobby'); renderLobby(); } }
function leaveMPQuiet() { if (MP.net) { try { if (MP.host) netSend('lobby', { closed: true }); else netSend('bye', { pid: MP.pid }); } catch (e) {} setTimeout(((n) => () => n.close())(MP.net), 200); } MP.net = null; MP.on = false; MP.host = false; MP.roster = []; MP.joined = false; }
function leaveMP() { leaveMPQuiet(); }

/* host: apply a guest's packet */
function onGuestInput(p) {
  if (G.mode !== 'host' || G.state === 'lobby') return; const pl = G.players.find((x) => x.pid === p.pid); if (!pl) return;
  if (!pl.dead) { const dx = (p.x || pl.x) - pl.x, dy = (p.y || pl.y) - pl.y; pl.moving = Math.min(1, Math.hypot(dx, dy) / .2); pl.tx = p.x; pl.ty = p.y; if (dist(pl.tx, pl.ty, pl.x, pl.y) > 3) { pl.x = pl.tx; pl.y = pl.ty; } else if (free(p.x, p.y)) { pl.x = p.x; pl.y = p.y; } pl.a = p.a || pl.a; }
  for (const ev of p.ev || []) { if (ev.s <= pl.lastSeq) continue; pl.lastSeq = ev.s; pl.ack = ev.s; if (pl.dead) continue;
    if (ev.t === 'f') { pl.shotT = G.timer; G.stats.fired += 0; const ox = pl.x, oy = pl.y, oa = pl.a; pl.x = ev.x; pl.y = ev.y; if (!free(pl.x, pl.y)) { pl.x = ox; pl.y = oy; } hostShoot(pl, ev.a); pl.x = ox; pl.y = oy; pl.a = oa; sound(['shot2', 'shot2', 'shot', 'shotB', 'shot3', 'shot'][pl.gun], .8, pl.x, pl.y); }
    else { pl.a = ev.a !== undefined ? ev.a : pl.a; if (ev.t === 'u') doUse(pl); else if (ev.t === 'b') doBreach(pl); else if (ev.t === 'h') doHeal(pl); else if (ev.t === 'g') throwFrom(pl); } }
}
function sendSnapshot() {
  const ps = G.players.map((p) => [p.pid, r2(p.x), r2(p.y), r2(p.a), Math.ceil(p.hp), p.dead ? 1 : 0, p.kit, p.breach, p.throwCount, p.ack]);
  const en = G.enemies.map((e) => [r2(e.x), r2(e.y), Math.ceil(e.hp), e.alive ? 1 : 0, e.alert > 0 ? 1 : 0, e.fire > 0 ? 1 : 0, r2(e.walk), e.stun > 0 ? 1 : 0]);
  const cl = G.clouds.map((c) => [r2(c.x), r2(c.y), r2(c.life)]);
  netSend('snap', { t: r2(G.timer), ps, en, cl, op: G.opened, ob: G.objective ? 1 : 0, k: G.kills, ev: G.evlog.filter((e) => e.id > 0) });
}
/* guest: apply host snapshot */
function onSnap(s) {
  if (G.mode !== 'guest' || !G.me) return; G.timer = s.t; G.objective = !!s.ob; G.kills = s.k | 0;
  for (const [cx, cy] of s.op || []) if (G.grid[cy] && G.grid[cy][cx] !== 0) { G.grid[cy][cx] = 0; G.gridVer++; }
  for (const r of s.ps || []) { const pl = G.players.find((x) => x.pid === r[0]); if (!pl) continue;
    if (pl === G.me) { if (r[4] < pl.hp) { G.hurt = .23; G.shake = Math.min(1, G.shake + .4); sfx('impact', .4); } pl.hp = r[4]; pl.dead = !!r[5]; pl.kit = r[6]; pl.breach = r[7]; pl.throwCount = r[8]; G.out = G.out.filter((o) => o.s > r[9]); }
    else { pl.tx = r[1]; pl.ty = r[2]; pl.ta = r[3]; pl.hp = r[4]; pl.dead = !!r[5]; } }
  const ge = G.enemies; while (ge.length < (s.en || []).length) ge.push({ x: 0, y: 0, tx: 0, ty: 0, hp: 1, alive: true, alert: 0, fire: 0, walk: 0, stun: 0, init: true });
  (s.en || []).forEach((r, i) => { const e = ge[i]; if (e.init) { e.x = r[0]; e.y = r[1]; e.init = false; } e.tx = r[0]; e.ty = r[1]; e.hp = r[2]; e.alive = !!r[3]; e.alert = r[4] ? 1 : 0; e.fire = r[5] ? .1 : 0; e.walk = r[6]; e.stun = r[7] ? 1 : 0; });
  G.clouds = (s.cl || []).map((c) => ({ x: c[0], y: c[1], life: c[2] }));
  for (const ev of s.ev || []) { if (ev.id <= G.seenEv) continue; G.seenEv = ev.id; guestEvent(ev); }
}
function guestEvent(ev) {
  const me = G.me;
  if (ev.k === 'msg') { if (!ev.to || ev.to === me.pid) notify(ev.s); }
  else if (ev.k === 'imp') impact(ev.x, ev.y, ev.kind);
  else if (ev.k === 'hm') { if (ev.pid === me.pid) { G.hitmark = .13; sfx(ev.kill ? 'confirm' : 'hit', .6); if (ev.kill) G.killmark = .28; } }
  else if (ev.k === 'thr') { if (ev.pid === me.pid) { if (G.threats.length >= 8) G.threats.shift(); G.threats.push({ a: Math.atan2(ev.ay - me.y, ev.ax - me.x), life: .48, hit: ev.hit }); } }
  else if (ev.k === 'snd') { sfx(ev.n, ev.v * (ev.g ? 1 : clamp(1 - dist(me.x, me.y, ev.x, ev.y) / 12, 0, 1))); }
  else if (ev.k === 'boom') { if (ev.pid === me.pid) { G.blast = ev.f ? Math.max(0, .75 - ev.d * .1) : .24; G.shake = .55; } }
  else if (ev.k === 'thr2') G.projectiles.push({ x: ev.sx, y: ev.sy, sx: ev.sx, sy: ev.sy, tx: ev.tx, ty: ev.ty, life: .68, total: .68, kind: ev.kind, z: .5 });
}
function guestSmooth(dt) {
  const k = Math.min(1, dt * 12); for (const e of G.enemies) { if (e.tx === undefined) continue; if (dist(e.x, e.y, e.tx, e.ty) > 3) { e.x = e.tx; e.y = e.ty; } else { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; } }
  for (const p of G.players) if (p !== G.me && p.tx !== undefined) { p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.a += angN(p.ta - p.a) * k; }
}
function netTick(dt) {
  if (G.mode === 'host') { MP.snapT -= dt; if (MP.snapT <= 0) { MP.snapT = .1; sendSnapshot(); }
    const now = Date.now(); for (const p of G.players.slice()) if (p !== G.me && now - (MP.heard[p.pid] || now) > 12000) { notify(p.name + ' disconnected'); G.players.splice(G.players.indexOf(p), 1); } }
  else if (G.mode === 'guest') { MP.sendT -= dt; if (MP.sendT <= 0) { MP.sendT = .066; const m = G.me; netSend('in', { pid: MP.pid, x: r2(m.x), y: r2(m.y), a: r2(m.a), ev: G.out.slice(-24) }); }
    if (Date.now() - (MP.heard.host || Date.now()) > 9000) { leaveMP(); G.over = true; toMenu(); $('oMsg').textContent = 'Lost the host.'; setState('menu'); } }
}

/* ============================== LOOP ============================== */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (G.state === 'play' || G.state === 'pause') {
    const frozen = G.state === 'pause' && G.mode === 'solo';
    if (!frozen && !G.over) {
      updatePlayer(dt); timers(dt);
      if (G.mode === 'guest') { updateThrowables(dt); guestSmooth(dt); netTick(dt); for (const e of G.enemies) e.moving = e.alive && e.tx !== undefined && dist(e.x, e.y, e.tx, e.ty) > .03; }
      else { hostTick(dt); if (G.mode === 'host') netTick(dt); if (G.me.hp <= 0 && G.mode === 'solo' && !G.over) finish(false); }
      if (G.mode !== 'guest') for (const p of G.players) if (p !== G.me) { p.cooldown = Math.max(0, (p.cooldown || 0) - dt); }
    }
    render(); updateHud(dt); adapt(dt);
  } else if (G.state === 'splash' || G.state === 'menu') { vctx.fillStyle = '#090d12'; vctx.fillRect(0, 0, VW, VH); }
  if (G.mode === 'host' && G.state === 'lobby') { MP.lobbyT -= dt; if (MP.lobbyT <= 0) { MP.lobbyT = 1; const now2 = Date.now(); MP.roster = MP.roster.filter((r) => r.host || now2 - (MP.heard[r.pid] || now2) < 12000); pushLobby(); renderLobby(); } }
  if (MP.on && !MP.host && MP.joined) { MP.helloT -= dt; if (MP.helloT <= 0 && G.state !== 'play') { MP.helloT = 2; sendHello(); } }
  if (MP.on && MP.host && G.state === 'lobby') { /* host keeps its own roster entry fresh */ const h = MP.roster.find((r) => r.host); if (h) Object.assign(h, playerDef(), { name: h.name, host: true }); }
}
let emaDt = .016, adaptT = 0;
function adapt(dt) { if (!useGL && !use3D) return; emaDt += (dt - emaDt) * .05; adaptT += dt; if (adaptT < 2.5) return; adaptT = 0;
  if (emaDt > .034 && resScale > .55) { resScale = Math.max(.55, resScale - .15); resize(); } else if (emaDt < .0185 && resScale < 1) { resScale = Math.min(1, resScale + .1); resize(); } }
// host lobby loop must also run while in lobby (G.mode is 'menu' there): drive it separately
setInterval(() => { if (MP.on && MP.host && G.state === 'lobby') { const now2 = Date.now(); MP.roster = MP.roster.filter((r) => r.host || now2 - (MP.heard[r.pid] || now2) < 12000); pushLobby(); renderLobby(); } }, 1000);
setInterval(() => { if (MP.on && !MP.host && MP.joined && G.state !== 'play') { sendHello(); if (Date.now() - (MP.heard.host || Date.now()) > 9000) { leaveMP(); toMenu(); $('oMsg').textContent = 'Lost the host.'; } } }, 2000);

/* ============================== INPUT ============================== */
const GAMEKEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyZ']);
addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (G.state === 'play') {
    if (GAMEKEYS.has(e.code)) { keys.add(e.code); e.preventDefault(); }
    if (e.repeat) return;
    if (e.code === 'KeyE') localEvent('u'); else if (e.code === 'KeyR') localEvent('r'); else if (e.code === 'KeyG') localEvent('g'); else if (e.code === 'KeyQ') localEvent('b'); else if (e.code === 'KeyH') localEvent('h');
    else if (e.code === 'KeyV' || e.code === 'KeyC') toggleView();
    else if (e.code === 'Escape' || e.code === 'KeyP') pause(true);
  } else if (G.state === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) pause(false);
  else if (G.state === 'splash' && (e.code === 'Enter' || e.code === 'Space')) { audioInit(); toMenu(); }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); mouseDown = false; mouseAim = false; });
view.addEventListener('mousedown', (e) => { if (G.state !== 'play') return; audioInit(); if (!document.pointerLockElement && !('ontouchstart' in window)) view.requestPointerLock && view.requestPointerLock(); if (e.button === 0) mouseDown = true; else if (e.button === 2) mouseAim = true; e.preventDefault(); });
addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; else if (e.button === 2) mouseAim = false; });
view.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('mousemove', (e) => { if (G.state === 'play' && document.pointerLockElement === view) lookX += e.movementX * .0026; });
document.addEventListener('pointerlockchange', () => { lockedPtr = document.pointerLockElement === view; if (!lockedPtr && G.state === 'play' && !G.over && !touchMode) pause(true); });
function pause(on) { if (on && G.state === 'play') { setState('pause'); $('hud').classList.add('on'); $('pauseSub').textContent = MISSIONS[G.mission].name + (G.mode !== 'solo' ? '  •  squad match keeps running' : ''); $('pRestart').style.display = G.mode === 'solo' ? '' : 'none'; document.exitPointerLock && document.exitPointerLock(); keys.clear(); mouseDown = false; } else if (!on && G.state === 'pause') { setState('play'); } }
let touchMode = false;
function enableTouch() { if (touchMode) return; touchMode = true; document.body.classList.add('touch'); }
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) enableTouch();
// touch controls
(function () {
  // phone sticks: MOVE (left), LOOK (bottom right), FIRE (right above LOOK).
  // Touch near a stick's home to grab it there; touch anywhere else on that side and the stick appears under your thumb.
  const zl = $('zl'), zr = $('zr'), R = 50, FR = 40;
  const home = (k) => { const W = innerWidth, H = innerHeight;
    if (H > W) return k === 'mv' ? { x: 78, y: H - 104 } : k === 'lk' ? { x: W - 78, y: H - 104 } : { x: W - 78, y: H - 216 };   // portrait
    return k === 'mv' ? { x: 124, y: H - 150 } : k === 'lk' ? { x: W - 100, y: H - 118 } : { x: W - 100, y: H - 118 - 124 }; };
  const el = { mv: $('mvS'), lk: $('lkS'), fr: $('frS') }, S = {};
  const place = () => { for (const k in el) { const s0 = S[k], h = s0 || home(k); el[k].style.left = h.x + 'px'; el[k].style.top = h.y + 'px'; el[k].classList.toggle('on', !!s0); if (!s0) el[k].firstElementChild.style.transform = 'translate(-50%,-50%)'; } };
  place(); addEventListener('resize', place);
  const read = (k, t) => { const s0 = S[k], r = k === 'fr' ? FR : R, dx = t.clientX - s0.x, dy = t.clientY - s0.y, d = Math.hypot(dx, dy), raw = Math.min(1, d / r), m = raw < .12 ? 0 : (raw - .12) / .88, a = Math.atan2(dy, dx);
    const kx = Math.cos(a) * Math.min(d, r), ky = Math.sin(a) * Math.min(d, r); el[k].firstElementChild.style.transform = 'translate(calc(-50% + ' + kx + 'px),calc(-50% + ' + ky + 'px))';
    return { x: Math.cos(a) * m, y: Math.sin(a) * m, m, d }; };
  const curve = (v) => Math.sign(v) * Math.pow(Math.abs(v), 1.35);
  const apply = (k, v) => {
    if (k === 'mv') { touch.mx = v.x; touch.my = -v.y; touch.sprint = v.m > .93 && v.d > R + 14; }
    else if (k === 'lk') touch.lookRate = curve(v.x);
    else touch.fireRate = curve(v.x);
  };
  const start = (k, t) => { const h = home(k), near = Math.hypot(t.clientX - h.x, t.clientY - h.y) < (k === 'fr' ? FR + 30 : 95); S[k] = { id: t.identifier, x: near || k === 'fr' ? h.x : t.clientX, y: near || k === 'fr' ? h.y : t.clientY }; if (k === 'fr') touch.fire = true; apply(k, read(k, t)); place(); };
  const end = (k) => { delete S[k]; if (k === 'mv') { touch.mx = touch.my = 0; touch.sprint = false; } else if (k === 'lk') touch.lookRate = 0; else { touch.fireRate = 0; touch.fire = false; } place(); };
  const onFire = (t) => { const f = home('fr'), l = home('lk'), df = Math.hypot(t.clientX - f.x, t.clientY - f.y); return df < FR + 30 && df < Math.hypot(t.clientX - l.x, t.clientY - l.y); };
  zl.addEventListener('touchstart', (e) => { e.preventDefault(); audioInit(); for (const t of e.changedTouches) if (!S.mv) start('mv', t); }, { passive: false });
  zr.addEventListener('touchstart', (e) => { e.preventDefault(); audioInit(); for (const t of e.changedTouches) { if (!S.fr && onFire(t)) start('fr', t); else if (!S.lk) start('lk', t); } }, { passive: false });
  const mv = (e) => { e.preventDefault(); for (const t of e.changedTouches) for (const k in S) if (S[k].id === t.identifier) apply(k, read(k, t)); };
  const up = (e) => { for (const t of e.changedTouches) for (const k in S) if (S[k] && S[k].id === t.identifier) end(k); };
  for (const z of [zl, zr]) { z.addEventListener('touchmove', mv, { passive: false }); z.addEventListener('touchend', up); z.addEventListener('touchcancel', up); }
  window.__sp = { touch, home, S, get me() { return G.me; }, get enemies() { return G.enemies; }, assistTarget };
  const hold = (id, k) => { const el = $(id); el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); touch[k] = true; }, { passive: false }); const off = (e) => { e.preventDefault(); touch[k] = false; }; el.addEventListener('touchend', off); el.addEventListener('touchcancel', off); };
  hold('tFire', 'fire'); hold('tAim', 'aim');
  const tap = (id, f) => $(id).addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); f(); }, { passive: false });
  tap('tRel', () => localEvent('r')); tap('tUse', () => localEvent('u')); tap('tThr', () => localEvent('g')); tap('tBrc', () => localEvent('b')); tap('tMed', () => localEvent('h')); tap('tPause', () => pause(true)); tap('tView', () => toggleView());
})();
// buttons
$('bStart').onclick = () => { audioInit(); toMenu(); };
$('mCont').onclick = () => brief(Math.min(prof.unlocked - 1, MISSIONS.length - 1));
$('mSel').onclick = () => buildSelect(false); $('mTrain').onclick = () => buildSelect(true); $('mLoad').onclick = () => buildLoadout(); $('mCtl').onclick = () => { $('sensR').value = prof.sens; $('sensV').textContent = prof.sens.toFixed(2) + 'x'; setState('ctl'); };
$('sensR').oninput = () => { prof.sens = parseFloat($('sensR').value); $('sensV').textContent = prof.sens.toFixed(2) + 'x'; saveProf(); }; $('mCred').onclick = () => setState('cred');
$('mOnline').onclick = () => { $('oName').value = prof.name || ''; $('oMsg').textContent = ''; setState('online'); };
$('ldDone').onclick = () => { saveProf(); toMenu(); };
$('brGo').onclick = () => { audioInit(); startSolo(briefM, briefTrain); };
$('pResume').onclick = () => pause(false); $('pView').onclick = () => setView(camView === 1 ? 3 : 1); $('pView').textContent = 'CAMERA: ' + (camView === 1 ? 'FIRST PERSON' : 'THIRD PERSON'); $('pRestart').onclick = () => startSolo(G.mission, G.trainMode); $('pQuit').onclick = () => { if (G.mode !== 'solo') leaveMP(); toMenu(); };
for (const b of document.querySelectorAll('[data-back]')) b.onclick = () => { if (b.dataset.back === 'sMenu') { saveProf(); refreshMenu(); setState('menu'); } };
$('oHost').onclick = () => { audioInit(); mpHost(); }; $('oJoin').onclick = () => { audioInit(); mpJoin(); };
$('lStart').onclick = () => { audioInit(); hostStart(); };
$('lPrev').onclick = () => { if (MP.host) { MP.mission = (MP.mission + MISSIONS.length - 1) % MISSIONS.length; renderLobby(); pushLobby(); } };
$('lNext').onclick = () => { if (MP.host) { MP.mission = (MP.mission + 1) % MISSIONS.length; renderLobby(); pushLobby(); } };
$('lLeave').onclick = () => { leaveMP(); toMenu(); };
addEventListener('beforeunload', () => { if (MP.on) { if (MP.host) netSend('lobby', { closed: true }); else netSend('bye', { pid: MP.pid }); } });
addEventListener('resize', resize);

/* ============================== BOOT ============================== */
loadProf(); resize();
loadImgs().then(async () => { buildStaticTex(); buildWallTex(mapStyle);
  try { if (!/[?&]classic=1/.test(location.search)) { const mod = await import('./r3d.js?v=1'); R3 = mod.create({ canvas: r3c, G, WEAPONS, CREW, TEX, ray, tile, style: () => mapStyle }); use3D = true; } } catch (e) { console.warn('3D renderer unavailable, using the classic renderer', e); R3 = null; use3D = false; }
  if (!use3D) useGL = glInit(); resize(); refreshMenu(); const rq = new URLSearchParams(location.search).get('room'); if (rq) { $('oCode').value = rq.toUpperCase().slice(0, 4); } requestAnimationFrame(frame);
  window.__SP = { setView, toggleView, G, MP, startSolo, prof, begin, render, hostTick, doUse, fireLocal, localEvent, hostShoot, updatePlayer, onSnap, sendSnapshot, onGuestInput, newPlayer, isGL: () => useGL, keys, touch, humanoid, soldier, free, doBreach, openCell, timers, GEAR }; });
})();
