/* SHADOW PROTOCOL - true 3D renderer (three.js). Copyright (c) 2026 Zev DOD. All rights reserved.
   Draws the same mission grid, enemies, squad mates and effects as the game logic, with real lighting,
   shadows, 3D soldier models, a first-person weapon and a third-person over-the-shoulder camera. */
import * as T from './vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const H = 1.2;              // wall height in tiles
const BODY = .85 / 1.8;     // soldier model is built in metres, scaled so he stands .85 tiles tall
const EYE = .72;

export function create(opt) {
  const { canvas, G, WEAPONS, CREW, TEX, ray, tile } = opt;
  const mobile = matchMedia('(pointer:coarse)').matches;
  const renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 required');
  renderer.autoClear = false;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const angN = (a) => (((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  let seed = 7; const rr = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177 | 0; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };

  /* ---------- scenes, camera, post ---------- */
  const scene = new T.Scene(); scene.background = new T.Color(0x030405);
  scene.fog = new T.FogExp2(0x07090b, .05);
  const cam = new T.PerspectiveCamera(72, 1, .03, 60);
  const vscene = new T.Scene(), vcam = new T.PerspectiveCamera(52, 1, .01, 6);
  let rt = null, W = 2, Hh = 2;
  const halfOK = !!renderer.extensions.has('EXT_color_buffer_float') || !!renderer.extensions.has('EXT_color_buffer_half_float');
  function mkRT(w, h) { if (rt) rt.dispose(); rt = new T.WebGLRenderTarget(w, h, { type: halfOK ? T.HalfFloatType : T.UnsignedByteType, samples: mobile ? 2 : 4, depthBuffer: true }); }
  const post = new T.ShaderMaterial({
    uniforms: { t: { value: null }, res: { value: new T.Vector2(2, 2) }, time: { value: 0 }, hurt: { value: 0 }, blast: { value: 0 }, flash: { value: 0 }, exposure: { value: 1.0 }, low: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `precision highp float; uniform sampler2D t; uniform vec2 res; uniform float time, hurt, blast, flash, exposure, low; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); }
      float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 px = 1.0 / res; vec3 c = texture2D(t, vUv).rgb;
        // glow: wide soft taps of the over-bright parts (muzzle flashes, lamps, screens)
        vec3 g = vec3(0.0); float tw = 0.0;
        for (int i = 0; i < 12; i++){ float a = float(i) * 2.39996; float r = (0.6 + float(i)) * 2.4; vec3 s = texture2D(t, vUv + vec2(cos(a), sin(a)) * r * px).rgb; float w = 1.0 - float(i) / 13.0; g += max(s - 0.9, 0.0) * w; tw += w; }
        c += g / tw * 1.35;
        // slight chromatic fringe toward the corners
        vec2 d = (vUv - .5); float ca = dot(d, d) * 2.2; c.r = mix(c.r, texture2D(t, vUv + d * ca * px * 6.0).r, .6); c.b = mix(c.b, texture2D(t, vUv - d * ca * px * 6.0).b, .6);
        c *= exposure; c = aces(c);
        float l = dot(c, vec3(.299,.587,.114)); c = mix(vec3(l), c, .78); c = (c - .5) * 1.06 + .5; c *= vec3(1.04, 1.0, .93);
        c = pow(max(c, 0.), vec3(1.0 / 2.2));
        float v = dot(d, d); c *= 1.0 - v * 1.15;
        c += (h21(gl_FragCoord.xy + fract(time) * 71.0) - .5) * .045;
        c = mix(c, vec3(.75, .02, .02), hurt * clamp(0.35 + v * 2.0, 0., 1.));
        c = mix(c, vec3(1.0), clamp(blast, 0., 1.));
        c += vec3(1.0, .6, .25) * flash * .035;
        c = mix(c, vec3(l) * vec3(.9, .35, .3), low * .25);
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false, toneMapped: false });
  const postScene = new T.Scene(), postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), post));

  /* ---------- texture helpers ---------- */
  const cvs = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; };
  const mkTex = (c, rx, ry, srgb = true) => { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.anisotropy = maxAniso; if (srgb) t.colorSpace = T.SRGBColorSpace; return t; };
  const glowTex = (() => { const c = cvs(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
  const smokeTex = (() => { const c = cvs(128, 128, (g) => { for (let i = 0; i < 26; i++) { const x = 64 + (rr() - .5) * 60, y = 64 + (rr() - .5) * 60, r = 18 + rr() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(210,210,205,.16)'); gr.addColorStop(1, 'rgba(210,210,205,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } }); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
  const flareTex = (() => { const c = cvs(128, 128, (g) => { g.translate(64, 64); const r = g.createRadialGradient(0, 0, 0, 0, 0, 60); r.addColorStop(0, 'rgba(255,250,220,1)'); r.addColorStop(.3, 'rgba(255,190,90,.8)'); r.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = r; g.fillRect(-64, -64, 128, 128);
    g.fillStyle = 'rgba(255,225,150,.95)'; for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3 + (i % 2) * .15); g.beginPath(); g.moveTo(0, -3); g.lineTo(60 - (i % 2) * 14, 0); g.lineTo(0, 3); g.fill(); } }); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
  const holeTex = (() => { const c = cvs(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 30); r.addColorStop(0, 'rgba(8,8,8,.95)'); r.addColorStop(.28, 'rgba(10,10,10,.85)'); r.addColorStop(.5, 'rgba(25,25,22,.35)'); r.addColorStop(1, 'rgba(25,25,22,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(15,15,14,.5)'; g.lineWidth = 1; for (let i = 0; i < 7; i++) { const a = rr() * 6.28, l = 10 + rr() * 18; g.beginPath(); g.moveTo(32 + Math.cos(a) * 6, 32 + Math.sin(a) * 6); g.lineTo(32 + Math.cos(a) * l, 32 + Math.sin(a) * l); g.stroke(); } }); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
  const camoTex = (base, cols, seedN) => { seed = seedN; return cvs(128, 128, (g) => { g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    for (const col of cols) { g.fillStyle = col; for (let i = 0; i < 16; i++) { const x = rr() * 128, y = rr() * 128, rx = 8 + rr() * 20, ry = 5 + rr() * 12, a = rr() * 3; for (const ox of [-128, 0, 128]) for (const oy of [-128, 0, 128]) { g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, a, 0, 7); g.fill(); } } }
    const d = g.getImageData(0, 0, 128, 128); for (let i = 0; i < d.data.length; i += 4) { const n = (rr() - .5) * 26; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } g.putImageData(d, 0, 0); }); };

  { // small studio-style environment so metals and wet floors have something to reflect
    const es = new T.Scene(), eg = new T.SphereGeometry(10, 24, 12), col = new Float32Array(eg.attributes.position.count * 3), pos = eg.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 10, c = new T.Color().setRGB(.10 + .16 * Math.max(0, y) + .05, .11 + .17 * Math.max(0, y) + .05, .13 + .2 * Math.max(0, y) + .05); col.set([c.r, c.g, c.b], i * 3); }
    eg.setAttribute('color', new T.BufferAttribute(col, 3)); es.add(new T.Mesh(eg, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
    for (const [x, z] of [[-4, -3], [4, -3], [0, 4], [-4, 4], [4, 4]]) { const p = new T.Mesh(new T.PlaneGeometry(3, 1.4), new T.MeshBasicMaterial({ color: new T.Color(3.2, 3, 2.6), side: T.DoubleSide })); p.position.set(x, 8, z); p.rotation.x = Math.PI / 2; es.add(p); }
    const pm = new T.PMREMGenerator(renderer); const env = pm.fromScene(es, .03).texture; scene.environment = env; vscene.environment = env; scene.environmentIntensity = .45; vscene.environmentIntensity = 1.0; pm.dispose();
  }
  /* ---------- world: walls, floor, ceiling, lamps, conduits ---------- */
  const world = new T.Group(); scene.add(world);
  const hemi = new T.HemisphereLight(0x6a7890, 0x241d14, 1.5); scene.add(hemi);
  const lampPool = []; for (let i = 0; i < (mobile ? 3 : 5); i++) { const l = new T.PointLight(0xffe2b0, 0, 10, 1.6); scene.add(l); lampPool.push(l); }
  const muzzleLight = new T.PointLight(0xffa850, 0, 6, 1.6); scene.add(muzzleLight);
  const torch = new T.SpotLight(0xfff0d8, 13, 18, .52, .55, 1.15); torch.castShadow = true; torch.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024); torch.shadow.bias = -.0006; torch.shadow.normalBias = .02; torch.shadow.camera.near = .08; torch.shadow.camera.far = 16;
  scene.add(torch); scene.add(torch.target);
  let lamps = [], built = '', worldMeshes = [];
  const matCache = {};
  function wallMat(name, canvas, rough, metal) {
    const t = mkTex(canvas, 1, 1), b = mkTex(canvas, 1, 1, false);
    const m = new T.MeshStandardMaterial({ map: t, bumpMap: b, bumpScale: name === 'crate' ? 2.2 : 1.6, roughness: rough, metalness: metal, color: 0xffffff });
    return m;
  }
  function clearWorld() { for (const m of worldMeshes) { world.remove(m); m.geometry && m.geometry.dispose(); } worldMeshes = []; for (const k in matCache) { const m = matCache[k]; m.map && m.map.dispose(); m.bumpMap && m.bumpMap.dispose(); m.dispose(); delete matCache[k]; } }
  function buildWorld() {
    clearWorld(); const style = opt.style();
    const steel = style === 'steel', brick = style === 'brick';
    matCache.wall = wallMat('wall', TEX.wall.c, brick ? .92 : .82, steel ? .45 : .06);
    matCache.vent = wallMat('vent', TEX.vent.c, .6, .5); matCache.sign = wallMat('sign', TEX.sign.c, .7, .15);
    matCache.door = wallMat('door', TEX.door.c, .5, .55); matCache.crate = wallMat('crate', TEX.crate.c, .9, 0);
    const buckets = { wall: [], vent: [], sign: [], door: [], crate: [] };
    const g = G.grid, N = 17, pipes = [];
    const open = (x, y) => x >= 0 && y >= 0 && x < N && y < N && g[y] && g[y][x] === 0;
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      const t = g[gy][gx]; if (!t) continue;
      let k = t === 2 ? 'door' : t === 3 ? 'crate' : 'wall';
      if (t === 1) { const h = ((gx - 1) * 7 + (gy - 1) * 13 + G.mission) % 7; if (h === 0) k = 'vent'; else if (h === 3) k = 'sign'; }
      const x0 = gx - 1, z0 = gy - 1, B = buckets[k];
      const face = (nx, nz) => { // quad on the side facing (nx,nz)
        let p;
        if (nx === 1) p = [[x0 + 1, 0, z0 + 1], [x0 + 1, 0, z0], [x0 + 1, H, z0], [x0 + 1, H, z0 + 1]];
        else if (nx === -1) p = [[x0, 0, z0], [x0, 0, z0 + 1], [x0, H, z0 + 1], [x0, H, z0]];
        else if (nz === 1) p = [[x0, 0, z0 + 1], [x0 + 1, 0, z0 + 1], [x0 + 1, H, z0 + 1], [x0, H, z0 + 1]];
        else p = [[x0 + 1, 0, z0], [x0, 0, z0], [x0, H, z0], [x0 + 1, H, z0]];
        B.push({ p, n: [nx, 0, nz] });
        if (k === 'wall' && hash(gx * 3 + nx, gy * 5 + nz) < .34) pipes.push({ x: (p[0][0] + p[1][0]) / 2 + nx * .03, z: (p[0][2] + p[1][2]) / 2 + nz * .03, nx, nz, y: H - .1 - (hash(gx, gy) < .5 ? 0 : .11) });
      };
      if (open(gx + 1, gy)) face(1, 0); if (open(gx - 1, gy)) face(-1, 0); if (open(gx, gy + 1)) face(0, 1); if (open(gx, gy - 1)) face(0, -1);
    }
    for (const k in buckets) {
      const L = buckets[k]; if (!L.length) continue;
      const pos = new Float32Array(L.length * 12), nor = new Float32Array(L.length * 12), uv = new Float32Array(L.length * 8), idx = [];
      L.forEach((q, i) => { for (let v = 0; v < 4; v++) { pos.set(q.p[v], i * 12 + v * 3); nor.set(q.n, i * 12 + v * 3); } uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8); idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); });
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(idx);
      const m = new T.Mesh(geo, matCache[k]); m.castShadow = true; m.receiveShadow = true; world.add(m); worldMeshes.push(m);
    }
    // floor + ceiling
    const fl = mkTex(TEX.floor.c, 17, 17), flb = mkTex(TEX.floor.c, 17, 17, false), ce = mkTex(TEX.ceil.c, 17, 17), ceb = mkTex(TEX.ceil.c, 17, 17, false);
    matCache.floor = new T.MeshStandardMaterial({ map: fl, bumpMap: flb, bumpScale: 1.4, roughness: .5, metalness: .22 });
    matCache.ceil = new T.MeshStandardMaterial({ map: ce, bumpMap: ceb, bumpScale: 1, roughness: .9, metalness: .05, color: 0xaaaaaa });
    const fm = new T.Mesh(new T.PlaneGeometry(17, 17), matCache.floor); fm.rotation.x = -Math.PI / 2; fm.position.set(7.5, 0, 7.5); fm.receiveShadow = true; world.add(fm); worldMeshes.push(fm);
    const cm = new T.Mesh(new T.PlaneGeometry(17, 17), matCache.ceil); cm.rotation.x = Math.PI / 2; cm.position.set(7.5, H, 7.5); cm.receiveShadow = true; world.add(cm); worldMeshes.push(cm);
    // ceiling lamps
    lamps = [];
    const lg = new T.BoxGeometry(.55, .035, .2), lm = new T.MeshBasicMaterial({ color: 0xffe9bd }), lmOff = new T.MeshStandardMaterial({ color: 0x1c1d1e, roughness: .6 });
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (g[y][x] === 0 && x % 3 === 1 && y % 3 === 2) {
      const dead = hash(x, y + G.mission * 3) < .22, mesh = new T.Mesh(lg, dead ? lmOff : lm); mesh.position.set(x - .5, H - .02, y - .5); mesh.rotation.y = hash(x, y) < .5 ? 0 : Math.PI / 2; world.add(mesh); worldMeshes.push(mesh);
      if (!dead) lamps.push({ x: x - .5, z: y - .5, ph: hash(y, x) * 6.28, flick: hash(x * 2, y) < .25 });
    }
    // conduits along the tops of some walls
    if (pipes.length) {
      const pg = new T.CylinderGeometry(.018, .018, 1, 8), pm = new T.MeshStandardMaterial({ color: 0x4a4d4a, roughness: .45, metalness: .75 });
      const im = new T.InstancedMesh(pg, pm, pipes.length), mtx = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3();
      pipes.forEach((pp, i) => { const along = pp.nx !== 0 ? new T.Vector3(0, 0, 1) : new T.Vector3(1, 0, 0); q.setFromUnitVectors(new T.Vector3(0, 1, 0), along); s.set(1, 1, 1); p.set(pp.x, pp.y, pp.z); mtx.compose(p, q, s); im.setMatrixAt(i, mtx); });
      im.castShadow = true; world.add(im); worldMeshes.push(im);
    }
    built = G.gridVer + '|' + style + '|' + G.mission;
  }

  /* ---------- soldiers ---------- */
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const mats = {};
  function soldierMats(kind, crewCol) {
    const key = kind + (kind === 'ally' ? crewCol : ''); if (mats[key]) return mats[key];
    const M = (o) => new T.MeshStandardMaterial(Object.assign({ roughness: .8, metalness: .05 }, o));
    let m;
    if (kind === 'enemy') {
      const f = mkTex(camoTex('#26292a', ['#1d2021', '#303436'], 11), 1, 1);
      m = { cloth: M({ map: f }), vest: M({ color: 0x15181a, roughness: .7 }), helm: M({ color: 0x101213, roughness: .5, metalness: .2 }), skin: M({ color: 0x14171a, roughness: .9 }), boot: M({ color: 0x0c0d0e, roughness: .6 }), glove: M({ color: 0x0e0f10 }), pouch: M({ color: 0x1b1f20 }), visor: new T.MeshBasicMaterial({ color: 0xff2a1c }), band: M({ color: 0x8a1a14 }) };
    } else {
      const f = mkTex(camoTex('#5d5f48', ['#43452f', '#7d7b58', '#303424'], 23), 1, 1);
      m = { cloth: M({ map: f }), vest: M({ color: 0x5e5b42, roughness: .8 }), helm: M({ map: mkTex(camoTex('#4f5636', ['#363d24', '#6f6e44'], 31), 1, 1), roughness: .6, metalness: .1 }), skin: M({ color: 0xb98a68, roughness: .8 }), boot: M({ color: 0x302a20, roughness: .7 }), glove: M({ color: 0x1b1b17 }), pouch: M({ color: 0x575035 }), visor: M({ color: 0x1a2630, roughness: .15, metalness: .6 }), band: M({ color: new T.Color(crewCol || '#cdbd82') }) };
    }
    return (mats[key] = m);
  }
  const unitCyl = new T.CylinderGeometry(1, 1, 1, 10), unitSph = new T.SphereGeometry(1, 14, 10), unitBox = new T.BoxGeometry(1, 1, 1);
  const UP = V(0, 1, 0);
  function limb(parent, mat, r0, r1) { const m = new T.Mesh(unitCyl, mat); m.userData.r = [r0, r1]; m.castShadow = true; parent.add(m); return m; }
  function placeLimb(m, a, b) { const d = b.clone().sub(a), len = d.length(); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(UP, d.normalize()); const [r0, r1] = m.userData.r; m.scale.set((r0 + r1) / 2, len, (r0 + r1) / 2); }
  function ball(parent, mat, r) { const m = new T.Mesh(unitSph, mat); m.scale.setScalar(r); m.castShadow = true; parent.add(m); return m; }
  const rbCache = {};
  const rbGeo = (w, h, d, r) => { const k = [w, h, d, r].map((v) => v.toFixed(3)).join(','); return rbCache[k] || (rbCache[k] = new RoundedBoxGeometry(w, h, d, 2, r)); };
  function box(parent, mat, w, h, d, x, y, z, r) { const m = new T.Mesh(rbGeo(w, h, d, r === undefined ? Math.min(w, h, d) * .32 : r), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  function boxOld(parent, mat, w, h, d, x, y, z) { const m = new T.Mesh(unitBox, mat); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }

  /* weapon models, built in metres, +Z = muzzle, origin = rear of receiver at grip height */
  const gunMats = {};
  const gm = (k, c, r, m) => gunMats[k] || (gunMats[k] = new T.MeshStandardMaterial({ color: c, roughness: r, metalness: m }));
  function gunModel(idx, att) {
    const g = new T.Group(), steel = gm('steel', 0x6a6b69, .38, .8), poly = gm('poly', 0x3b3b39, .6, .15), tan = gm('tan', 0x8a7a50, .6, .1), dark = gm('dark', 0x181a1c, .45, .5);
    const add = (mat, w, h, d, x, y, z) => box(g, mat, w, h, d, x, y, z);
    const cyl = (mat, r, len, x, y, z) => { const m = new T.Mesh(unitCyl, mat); m.rotation.x = Math.PI / 2; m.scale.set(r, len, r); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    let muzzle = .5, fore = .3;
    if (idx === 0) { // Viper 9 pistol
      add(steel, .032, .045, .2, 0, .02, .1); add(poly, .03, .09, .045, 0, -.045, .03).rotation.x = -.2; add(dark, .026, .01, .05, 0, .046, .17); muzzle = .2; fore = .12;
    } else if (idx === 1) { // Spectre SMG
      add(poly, .045, .075, .3, 0, 0, .15); add(steel, .03, .05, .22, 0, .012, .38); cyl(dark, .012, .12, 0, .012, .56); add(poly, .03, .17, .05, 0, -.11, .12).rotation.x = .08; add(poly, .035, .085, .045, 0, -.07, -.01).rotation.x = -.25; add(poly, .03, .04, .16, 0, -.01, -.14); muzzle = .62; fore = .38;
    } else if (idx === 2) { // Falcon AR
      add(poly, .05, .085, .34, 0, 0, .17); add(poly, .045, .06, .3, 0, .005, .5); cyl(steel, .011, .3, 0, .012, .8); add(poly, .04, .2, .05, 0, -.13, .21).rotation.x = .16; add(poly, .038, .09, .045, 0, -.07, .02).rotation.x = -.28; add(poly, .045, .09, .22, 0, -.01, -.16); add(dark, .03, .03, .1, 0, .06, .12); muzzle = .95; fore = .5;
    } else if (idx === 3) { // Bulwark heavy shotgun
      add(steel, .055, .075, .3, 0, 0, .15); cyl(steel, .02, .55, 0, .008, .55); cyl(steel, .017, .5, 0, -.032, .52); add(tan, .06, .055, .22, 0, -.025, .52); add(poly, .05, .1, .24, 0, -.015, -.14); add(poly, .04, .085, .04, 0, -.065, .02).rotation.x = -.25; muzzle = .98; fore = .5;
    } else if (idx === 4) { // Phantom DMR
      add(poly, .05, .09, .36, 0, 0, .18); add(poly, .045, .06, .4, 0, .005, .6); cyl(steel, .012, .45, 0, .012, 1.0); add(poly, .04, .17, .05, 0, -.12, .22).rotation.x = .1; add(poly, .038, .09, .045, 0, -.07, .02).rotation.x = -.28; add(poly, .05, .11, .26, 0, -.005, -.18); const sc = cyl(dark, .022, .26, 0, .085, .24); void sc; add(dark, .042, .042, .035, 0, .085, .12); muzzle = 1.2; fore = .6;
    } else { // APEX Elite carbine (tan accents)
      add(tan, .05, .085, .32, 0, 0, .16); add(poly, .045, .06, .26, 0, .005, .45); cyl(steel, .011, .26, 0, .012, .72); add(poly, .04, .19, .05, 0, -.125, .2).rotation.x = .14; add(poly, .038, .09, .045, 0, -.07, .02).rotation.x = -.28; add(tan, .045, .09, .2, 0, -.01, -.15); add(dark, .035, .035, .05, 0, .065, .22); muzzle = .85; fore = .45;
    }
    // optics + muzzle devices from the loadout
    const ot = att ? att[0] : 0; if (ot > 0 && idx !== 0) { const holo = ot === 2; if (ot === 3) { cyl(dark, .02, .22, 0, .09, .22); } else { add(dark, .04, .045, .07, 0, .075, .2); const gl = add(new T.MeshBasicMaterial({ color: holo ? 0x40ff80 : 0xff3030 }), .01, .01, .004, 0, .085, .165); void gl; } }
    if (att && att[1] === 2 && idx !== 0) cyl(dark, .02, .2, 0, .012, muzzle + .08), muzzle += .16;
    const mz = new T.Object3D(); mz.position.set(0, .012, muzzle); g.add(mz); g.userData = { muzzle: mz, grip: V(0, -.07, .0), fore: V(0, -.03, fore), len: muzzle };
    return g;
  }

  const flashMat = new T.SpriteMaterial({ map: flareTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, color: 0xffffff, fog: false });
  const shadowBlob = (() => { const c = cvs(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }); const t = new T.CanvasTexture(c); return new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); })();

  function makeSoldier(kind, crewCol) {
    const m = soldierMats(kind, crewCol), root = new T.Group(), body = new T.Group(); body.scale.setScalar(BODY); root.add(body);
    const S = { kind, root, body, m, ph: 0, spd: 0, yaw: 0, lastX: null, lastY: null, fall: 0, wasAlive: true, gunKey: '', ready: .5, kick: 0, flashT: 0 };
    S.pelvis = box(body, m.cloth, .34, .2, .22, 0, .95, 0);
    S.torso = new T.Group(); body.add(S.torso);
    S.chest = box(S.torso, m.cloth, .36, .5, .22, 0, .27, 0);
    S.vest = box(S.torso, m.vest, .41, .38, .27, 0, .3, 0.005);
    box(S.torso, m.pouch, .1, .1, .06, -.11, .17, .15); box(S.torso, m.pouch, .1, .1, .06, 0, .17, .15); box(S.torso, m.pouch, .1, .1, .06, .11, .17, .15);
    box(S.torso, m.vest, .44, .07, .28, 0, .09, 0);
    S.band = box(S.torso, m.band, .06, .07, .29, -.2, .42, 0);
    box(S.torso, m.vest, .3, .3, .045, 0, .3, -.15); if (kind === 'ally') { box(S.torso, m.pouch, .32, .36, .13, 0, .27, -.2); box(S.torso, m.cloth, .08, .22, .08, -.1, .08, -.2); box(S.torso, m.cloth, .08, .22, .08, .1, .08, -.2); } else { box(S.torso, m.pouch, .1, .2, .06, .1, .3, -.18); box(S.torso, m.pouch, .02, .26, .02, .13, .46, -.18); }
    S.neck = new T.Mesh(unitCyl, m.skin); S.neck.scale.set(.05, .1, .05); S.neck.position.set(0, .56, 0); S.torso.add(S.neck);
    S.head = new T.Group(); S.head.position.set(0, .66, 0); S.torso.add(S.head);
    const hd = ball(S.head, m.skin, .1); hd.scale.set(.095, .115, .105); hd.position.y = .03;
    const helm = new T.Mesh(new T.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * .68), m.helm); helm.scale.set(.142, .128, .158); helm.position.set(0, .05, -.014); helm.castShadow = true; S.head.add(helm);
    box(S.head, m.helm, .26, .018, .07, 0, .07, .125);
    S.visor = box(S.head, m.visor, .17, .05, .03, 0, .045, .105); if (kind === 'enemy') S.visor.scale.set(.9, .45, .7);
    box(S.head, m.helm, .02, .05, .05, .13, .0, -.03);
    S.limbs = { thR: limb(body, m.cloth, .085, .07), shR: limb(body, m.cloth, .065, .05), thL: limb(body, m.cloth, .085, .07), shL: limb(body, m.cloth, .065, .05),
      uaR: limb(body, m.cloth, .058, .05), faR: limb(body, m.cloth, .05, .042), uaL: limb(body, m.cloth, .058, .05), faL: limb(body, m.cloth, .05, .042) };
    S.joints = [ball(body, m.cloth, .075), ball(body, m.cloth, .075), ball(body, m.cloth, .058), ball(body, m.cloth, .058)];
    S.boots = [box(body, m.boot, .11, .09, .27, 0, 0, 0), box(body, m.boot, .11, .09, .27, 0, 0, 0)];
    S.hands = [ball(body, m.glove, .05), ball(body, m.glove, .05)];
    S.shoulders = [ball(body, m.cloth, .075), ball(body, m.cloth, .075)];
    S.blob = new T.Mesh(new T.PlaneGeometry(1, 1), shadowBlob); S.blob.rotation.x = -Math.PI / 2; S.blob.position.y = .005; S.blob.scale.setScalar(.5); root.add(S.blob);
    S.flare = new T.Sprite(flashMat.clone()); S.flare.scale.set(.5, .5, .5); S.flare.visible = false; scene.add(S.flare);
    return S;
  }
  function setGun(S, idx, att) {
    const key = idx + ':' + (att ? att.join('') : ''); if (S.gunKey === key) return; S.gunKey = key;
    if (S.gun) S.body.remove(S.gun); S.gun = gunModel(idx, att); S.gun.traverse((o) => { if (o.isMesh) { o.castShadow = true; } }); S.body.add(S.gun);
  }
  const tmpM = new T.Matrix4(), tmpQ = new T.Quaternion(), tmpE = new T.Euler();
  function ik(sh, tg, l1, l2, hint) { // two-bone IK, returns elbow/knee joint
    const d = tg.clone().sub(sh); let L = d.length(); const maxL = (l1 + l2) * .999; if (L > maxL) { d.setLength(maxL); L = maxL; tg = sh.clone().add(d); }
    const dn = d.clone().normalize(), a = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const side = hint.clone().sub(dn.clone().multiplyScalar(hint.dot(dn))); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
    return { j: sh.clone().addScaledVector(dn, a).addScaledVector(side, h), end: tg };
  }
  // pose / animate one soldier. st = {x,y,yaw,alive,moving amount,aim,fire,recoil,reload,lowReady}
  function poseSoldier(S, st, dt) {
    const root = S.root, body = S.body, L = S.limbs;
    root.position.set(st.x, 0, st.y); root.rotation.y = Math.PI / 2 - st.yaw;
    // dying / lying
    if (!st.alive) S.fall = Math.min(1, S.fall + dt * 2.8); else S.fall = Math.max(0, S.fall - dt * 3);
    const f = S.fall, ease = f * f * (3 - 2 * f);
    body.rotation.x = -ease * Math.PI / 2 * .98; body.position.set(0, ease * .055 / BODY * BODY, -ease * .1);
    S.blob.visible = true; S.blob.scale.setScalar(lerp(.5, .85, ease));
    // gait
    S.ph += st.dist * 5.2; const amp = clamp(st.spd / 1.4, 0, 1) * (1 - ease), sw = Math.sin(S.ph), sw2 = Math.sin(S.ph + Math.PI), lift = (v) => Math.max(0, Math.cos(v));
    const bob = Math.abs(Math.sin(S.ph)) * .035 * amp; const crouch = st.crouch || 0;
    const hipY = .92 - bob - crouch * .08;
    const hipR = V(-.1, hipY, 0), hipL = V(.1, hipY, 0);   // right hand side of the soldier is -X when facing +Z
    S.pelvis.position.set(0, hipY + .03, 0);
    const stride = .3 * amp, fr = V(-.1, lift(S.ph) * .13 * amp, sw * stride), fl = V(.1, lift(S.ph + Math.PI) * .13 * amp, sw2 * stride);
    fr.y += .045; fl.y += .045;
    const kr = ik(hipR, fr.clone().setY(fr.y + .02), .43, .43, V(0, 0, 1)), kl = ik(hipL, fl.clone().setY(fl.y + .02), .43, .43, V(0, 0, 1));
    placeLimb(L.thR, hipR, kr.j); placeLimb(L.shR, kr.j, kr.end); placeLimb(L.thL, hipL, kl.j); placeLimb(L.shL, kl.j, kl.end);
    S.joints[0].position.copy(kr.j); S.joints[1].position.copy(kl.j);
    S.boots[0].position.set(-.1, fr.y + .02, fr.z + .05); S.boots[1].position.set(.1, fl.y + .02, fl.z + .05);
    S.boots[0].rotation.x = -lift(S.ph) * .25 * amp; S.boots[1].rotation.x = -lift(S.ph + Math.PI) * .25 * amp;
    // torso: leans into the weapon, twists with recoil
    const ready = S.ready = lerp(S.ready, st.ready, clamp(dt * 8, 0, 1)), kick = S.kick = lerp(S.kick, st.recoil, clamp(dt * 20, 0, 1));
    S.torso.position.set(0, hipY + .08, 0); S.torso.rotation.set(.05 * amp - kick * .05 + crouch * .25, (1 - ready) * -.1, 0);
    S.head.rotation.set(ease * .5 + (1 - ready) * .0, (1 - ready) * .12, 0);
    S.torso.updateMatrix(); const tm = S.torso.matrix;
    // gun pose in torso space (low ready -> shouldered)
    const gp = V(lerp(-.05, -.09, ready), lerp(.26, .44, ready), lerp(.2, .17, ready) - kick * .06), gr = lerp(.9, -.02, ready) + kick * .05;
    S.gun.position.copy(gp).applyMatrix4(tm); tmpE.set(gr, 0, 0); tmpQ.setFromEuler(tmpE); S.gun.quaternion.setFromRotationMatrix(tmpM.extractRotation(tm)).multiply(tmpQ);
    S.gun.updateMatrix();
    const handR = S.gun.userData.grip.clone().applyMatrix4(S.gun.matrix), handL = S.gun.userData.fore.clone().applyMatrix4(S.gun.matrix);
    const shR = V(-.22, .5, 0).applyMatrix4(tm), shL = V(.22, .5, 0).applyMatrix4(tm);
    if (!st.alive) { handR.copy(V(-.3, .1, .15 + ease * .1)); handL.copy(V(.3, .1, .1)); S.gun.position.set(-.4, .08, .2 + ease * .1); S.gun.rotation.set(-Math.PI / 2, 0, .4); S.gun.updateMatrix(); }
    const er = ik(shR, handR, .27, .27, V(-1, -.4, -.2)), el = ik(shL, handL, .27, .27, V(1, -.5, -.2));
    placeLimb(L.uaR, shR, er.j); placeLimb(L.faR, er.j, er.end); placeLimb(L.uaL, shL, el.j); placeLimb(L.faL, el.j, el.end);
    S.joints[2].position.copy(er.j); S.joints[3].position.copy(el.j); S.hands[0].position.copy(er.end); S.hands[1].position.copy(el.end);
    S.shoulders[0].position.copy(shR); S.shoulders[1].position.copy(shL);
    // muzzle flash
    S.flashT = Math.max(0, S.flashT - dt);
    if (S.flashT > 0 && st.alive) { const p = new T.Vector3(); S.gun.userData.muzzle.getWorldPosition(p); S.flare.position.copy(p); S.flare.material.rotation = rr() * 6; const s = .14 + rr() * .08; S.flare.scale.set(s, s, s); S.flare.visible = true; S.muzzleWorld = p; } else S.flare.visible = false;
  }

  /* ---------- entities cache ---------- */
  const soldiers = new Map(); let frameId = 0;
  function getSoldier(ent, kind, crewCol) { let S = soldiers.get(ent); if (!S) { S = makeSoldier(kind, crewCol); S.fresh = true; scene.add(S.root); soldiers.set(ent, S); } S.used = frameId; return S; }

  /* ---------- props: terminal, exit, grenades, smoke ---------- */
  const term = new T.Group(), exitG = new T.Group(); scene.add(term); scene.add(exitG);
  const scrCanvas = cvs(128, 96, () => {}), scrTex = new T.CanvasTexture(scrCanvas); scrTex.colorSpace = T.SRGBColorSpace;
  const termLight = new T.PointLight(0x40e0ff, 0, 5, 1.6); term.add(termLight); termLight.position.set(0, .8, 0);
  { const dm = new T.MeshStandardMaterial({ color: 0x2a2e30, roughness: .45, metalness: .7 }), sm = new T.MeshBasicMaterial({ map: scrTex }), glow = new T.MeshBasicMaterial({ color: 0x35e6ff });
    box(term, dm, .46, .36, .46, 0, .18, 0); box(term, dm, .12, .34, .12, 0, .53, 0);                    // plinth + stalk
    const head = new T.Group(); head.position.y = .72; term.add(head); box(head, dm, .56, .4, .08, 0, 0, 0);
    for (const sd of [1, -1]) { const sc = new T.Mesh(new T.PlaneGeometry(.5, .34), sm); sc.position.z = .047 * sd; if (sd < 0) sc.rotation.y = Math.PI; head.add(sc); }
    box(term, glow, .5, .02, .5, 0, .37, 0, .006);
    const beam = new T.Mesh(new T.CylinderGeometry(.2, .2, H, 14, 1, true), new T.MeshBasicMaterial({ color: 0x35e6ff, transparent: true, opacity: .1, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); beam.position.y = H / 2; term.add(beam); }
  const exitMat = new T.MeshBasicMaterial({ color: 0x40ff90 }), beamMat = new T.MeshBasicMaterial({ color: 0x40ff90, transparent: true, opacity: .16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
  box(exitG, exitMat, .07, H * .85, .07, -.38, H * .425, 0); box(exitG, exitMat, .07, H * .85, .07, .38, H * .425, 0); box(exitG, exitMat, .83, .07, .07, 0, H * .85, 0);
  { const beam = new T.Mesh(new T.CylinderGeometry(.34, .34, H, 16, 1, true), beamMat); beam.position.y = H / 2; exitG.add(beam); const l = new T.PointLight(0x40ff90, 2.2, 6, 1.4); l.position.set(0, .6, 0); exitG.add(l); }
  const nadeGeo = new T.CylinderGeometry(.035, .035, .1, 10), nadeMats = [null, new T.MeshStandardMaterial({ color: 0x4d5636, roughness: .6, metalness: .3 }), new T.MeshStandardMaterial({ color: 0xcfd2cf, roughness: .4, metalness: .4 }), new T.MeshStandardMaterial({ color: 0x80878a, roughness: .5, metalness: .3 })];
  const nades = new Map(), smokes = new Map();
  function orientToWall(grp, x, y) { // face the longest open direction (toward where the squad approaches from)
    const tx = G.exit ? G.exit.x - x : 0, ty = G.exit ? G.exit.y - y : 0; let best = 0, bd = -9; for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const r = ray(x, y, a, 8).d; const sc = r < .8 ? -5 : Math.cos(a) * tx + Math.sin(a) * ty; if (sc > bd) { bd = sc; best = a; } }
    grp.rotation.y = Math.PI / 2 - best;
  }
  let termKey = '', exitKey = '';

  /* ---------- particles (spark sprites), tracers, decals ---------- */
  const parts = [], partPool = []; const sparkMat = new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, color: 0xffc070, fog: false });
  const dustMat = new T.SpriteMaterial({ map: smokeTex, depthWrite: false, transparent: true, color: 0x9a9588 }), bloodMat = new T.SpriteMaterial({ map: smokeTex, depthWrite: false, transparent: true, color: 0x6a0c0c });
  const fireMat = new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, color: 0xff7a1c, fog: false });
  function spawn(mat, x, y, z, vx, vy, vz, life, size, grow, grav, op) {
    let s = partPool.pop(); if (!s) { s = new T.Sprite(mat.clone()); scene.add(s); } s.material = s.material; s.material.map = mat.map; s.material.color.copy(mat.color); s.material.blending = mat.blending; s.material.depthWrite = false; s.material.needsUpdate = true;
    s.visible = true; s.position.set(x, y, z); s.userData = { vx, vy, vz, life, total: life, size, grow, grav, op: op === undefined ? 1 : op }; s.scale.set(size, size, size); s.material.opacity = s.userData.op; parts.push(s);
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const s = parts[i], u = s.userData; u.life -= dt; if (u.life <= 0) { s.visible = false; parts.splice(i, 1); partPool.push(s); continue; }
      u.vy -= u.grav * dt; s.position.x += u.vx * dt; s.position.y = Math.max(.01, s.position.y + u.vy * dt); s.position.z += u.vz * dt; const k = u.life / u.total, sz = u.size + u.grow * (1 - k); s.scale.set(sz, sz, sz); s.material.opacity = u.op * k; }
  }
  const tracers = []; const trMat = new T.MeshBasicMaterial({ color: 0xffc77a, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false, fog: false }), trGeo = new T.CylinderGeometry(.0035, .0035, 1, 5);
  function tracer(from, to) { const m = new T.Mesh(trGeo, trMat); m.frustumCulled = false; const d = to.clone().sub(from), len = d.length(); if (len < .3) return; scene.add(m); tracers.push({ m, from, dir: d.clone().normalize(), len, t: 0, speed: 95 }); }
  function updateTracers(dt) { for (let i = tracers.length - 1; i >= 0; i--) { const tr = tracers[i]; tr.t += dt * tr.speed; const a = Math.max(0, tr.t - 1.1), b = Math.min(tr.len, tr.t); if (a >= tr.len) { scene.remove(tr.m); tracers.splice(i, 1); continue; } const L = Math.max(.05, b - a), mid = tr.from.clone().addScaledVector(tr.dir, a + L / 2); tr.m.position.copy(mid); tr.m.quaternion.setFromUnitVectors(UP, tr.dir); tr.m.scale.set(1, L, 1); } }
  const decals = [], decalGeo = new T.PlaneGeometry(.13, .13), decalMat = new T.MeshBasicMaterial({ map: holeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  function addDecal(x, y, z) {
    const fx = x - Math.floor(x), fy = y - Math.floor(y); const dxm = Math.min(fx, 1 - fx), dym = Math.min(fy, 1 - fy); const m = new T.Mesh(decalGeo, decalMat);
    if (dxm < dym) { m.position.set(Math.round(x), z, y); m.rotation.y = fx < .5 ? Math.PI / 2 : -Math.PI / 2; m.position.x += fx < .5 ? .004 : -.004; } else { m.position.set(x, z, Math.round(y)); m.rotation.y = fy < .5 ? 0 : Math.PI; m.position.z += fy < .5 ? .004 : -.004; }
    m.rotation.z = rr() * 6; scene.add(m); decals.push(m); if (decals.length > 70) { const o = decals.shift(); scene.remove(o); }
  }
  const seenImp = new WeakSet(), seenNade = new Set();
  function syncImpacts() {
    for (const im of G.impacts) { if (seenImp.has(im)) continue; seenImp.add(im); const z = .22 + rr() * .4;
      if (im.kind === 'hit') { for (let i = 0; i < 6; i++) spawn(bloodMat, im.x, z + rr() * .1, im.y, (rr() - .5) * .8, rr() * .5, (rr() - .5) * .8, .5 + rr() * .3, .09, .18, 1.5, .7); for (let i = 0; i < 4; i++) spawn(sparkMat, im.x, z, im.y, (rr() - .5) * 1.4, rr() * 1.2, (rr() - .5) * 1.4, .25, .035, 0, 4, .8); }
      else { addDecal(im.x, im.y, z); for (let i = 0; i < 9; i++) spawn(sparkMat, im.x, z, im.y, (rr() - .5) * 2.2, rr() * 1.6, (rr() - .5) * 2.2, .22 + rr() * .2, .03, 0, 7, 1); for (let i = 0; i < 3; i++) spawn(dustMat, im.x, z, im.y, (rr() - .5) * .3, .1 + rr() * .2, (rr() - .5) * .3, .7, .08, .25, -.1, .55); }
    }
  }

  /* ---------- viewmodel (first person) ---------- */
  const vm = { gun: null, key: '', sleeve: [limb(vscene, gm('sleeve', 0x4a5434, .85, 0), .042, .036), limb(vscene, gm('sleeve', 0x4a5434, .85, 0), .042, .036), limb(vscene, gm('sleeve', 0x4a5434, .85, 0), .04, .034), limb(vscene, gm('sleeve', 0x4a5434, .85, 0), .04, .034)], hands: [ball(vscene, gm('glove', 0x1c1c18, .8, 0), .032), ball(vscene, gm('glove', 0x1c1c18, .8, 0), .034)], flare: new T.Sprite(flashMat.clone()), t: 0 };
  vscene.add(vm.flare); vm.flare.visible = false;
  const vHemi = new T.HemisphereLight(0x8d97a8, 0x2a241b, 1.1), vSun = new T.DirectionalLight(0xfff0d8, 1.6), vMuz = new T.PointLight(0xffa850, 0, 3, 1.4); vSun.position.set(.4, 1, .6); vscene.add(vHemi, vSun, vMuz);
  vm.sleeve.forEach((s) => s.castShadow = false);
  function setVM(me) {
    const key = me.gun + ':' + me.att.join(''); if (vm.key === key) return; vm.key = key; if (vm.gun) vscene.remove(vm.gun); vm.gun = gunModel(me.gun, me.att); vm.gun.traverse((o) => { if (o.isMesh) o.castShadow = false; }); vscene.add(vm.gun);
  }

  /* ---------- per-frame ---------- */
  let last = performance.now(), tAcc = 0, camPos = V(0, EYE, 0), tpDist = 1.8, shakeV = V(0, 0, 0);
  const eyeV = V(0, 0, 0), dirV = V(1, 0, 0);
  function drawScreen(t) { const g = scrCanvas.getContext('2d'); g.fillStyle = '#04141a'; g.fillRect(0, 0, 128, 96); g.fillStyle = '#35e6ff'; g.font = 'bold 10px monospace'; g.fillText('SP-NODE // ARCHIVE', 6, 14); g.fillStyle = '#1b8fa3'; for (let i = 0; i < 7; i++) g.fillRect(6, 24 + i * 9, 30 + ((i * 37 + (t * 40 | 0)) % 80), 3); g.fillStyle = 'rgba(53,230,255,.35)'; g.fillRect(0, (t * 50) % 96, 128, 3); scrTex.needsUpdate = true; }

  function nearest(list, x, y) { let b = null, bd = 1e9; for (const p of list) { if (p.dead || p.alive === false) continue; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; b = p; } } return b; }

  function render(me, view, VWpx, VHpx) {
    const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now; tAcc += dt; frameId++;
    if (VWpx !== W || VHpx !== Hh) { W = VWpx; Hh = VHpx; renderer.setPixelRatio(1); renderer.setSize(W, Hh, false); mkRT(W, Hh); post.uniforms.res.value.set(W, Hh); cam.aspect = vcam.aspect = W / Hh; cam.updateProjectionMatrix(); vcam.updateProjectionMatrix(); }
    const key = G.gridVer + '|' + opt.style() + '|' + G.mission; if (key !== built) buildWorld();
    const fp = view === 1 && !me.dead, aim = me.aim || 0;
    // ---- camera
    const ca = Math.cos(me.a), sa = Math.sin(me.a); dirV.set(ca, 0, sa);
    const rightV = V(-sa, 0, ca); // +90deg in map space: screen-right
    const bobY = fp ? Math.sin(me.stride) * me.moving * .012 * (1 - aim * .7) : 0, bobX = fp ? Math.cos(me.stride * .5) * me.moving * .008 * (1 - aim * .7) : 0;
    const sk = G.shake * .02; shakeV.set((Math.random() - .5) * sk, (Math.random() - .5) * sk, (Math.random() - .5) * sk);
    const deadT = me.dead ? Math.min(1, (me._dt = (me._dt || 0) + dt) / .8) : (me._dt = 0);
    if (fp) {
      eyeV.set(me.x, EYE + bobY - (me.crouch || 0) * .1, me.y); camPos.copy(eyeV).addScaledVector(rightV, bobX).add(shakeV);
      cam.position.copy(camPos); cam.lookAt(camPos.x + ca * 5, camPos.y - .004, camPos.z + sa * 5);
      cam.fov = lerp(76 + (me.sprint || 0) * 6, 52, aim); tpDist = 0;
    } else {
      const eh = EYE + .12 - deadT * .3; eyeV.set(me.x, eh, me.y);
      const back = lerp(1.7, .95, aim) + (me.sprint || 0) * .25, side = lerp(.42, .3, aim), up = lerp(.26, .14, aim) + deadT * .55;
      const wantD = back; const rd = ray(me.x, me.y, me.a + Math.PI, wantD + .2).d; const d = Math.max(.15, Math.min(wantD, rd - .22));
      tpDist = lerp(tpDist, d, clamp(dt * 12, 0, 1)); if (tpDist > d) tpDist = d;
      const sideAmt = Math.min(side, (ray(me.x, me.y, me.a + Math.PI / 2, side + .2).d - .2));
      camPos.copy(eyeV).addScaledVector(dirV, -tpDist).addScaledVector(rightV, Math.max(0, sideAmt) * (tpDist / Math.max(.2, back))).add(V(0, up, 0)).add(shakeV);
      cam.position.copy(camPos); cam.lookAt(me.x + ca * 6 + 0, eh - .04, me.y + sa * 6);
      cam.fov = lerp(66 + (me.sprint || 0) * 6, 48, aim);
    }
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    // ---- lights
    torch.position.copy(eyeV).add(V(0, .04, 0)).addScaledVector(dirV, .12); torch.target.position.set(me.x + ca * 6, EYE - .06, me.y + sa * 6); torch.intensity = me.dead ? 0 : 13;
    let ni = 0; const ls = lamps.map((l) => ({ l, d: (l.x - eyeV.x) ** 2 + (l.z - eyeV.z) ** 2 })).sort((a, b) => a.d - b.d);
    for (let i = 0; i < lampPool.length; i++) { const e = ls[i], p = lampPool[i]; if (!e) { p.intensity = 0; continue; } const l = e.l, fl = l.flick ? (Math.sin(tAcc * 19 + l.ph) > .55 || Math.sin(tAcc * 7.3 + l.ph * 2) > .9 ? .25 : 1) : 1; p.position.set(l.x, H - .12, l.z); p.intensity = 7 * fl * (e.d < 40 ? 1 : 0); ni++; }
    void ni;
    muzzleLight.intensity = G.flash > 0 ? 7 * clamp(G.flash / .075, 0, 1) : 0; muzzleLight.position.set(me.x + ca * .3, EYE, me.y + sa * .3);
    // ---- soldiers
    const eyeFlashDir = new T.Vector3();
    const stateOf = (S, ent, kind, st) => {
      const dx = ent.x - (S.lastX === null ? ent.x : S.lastX), dy = ent.y - (S.lastY === null ? ent.y : S.lastY), dd = Math.hypot(dx, dy); S.lastX = ent.x; S.lastY = ent.y;
      S.spd = lerp(S.spd, dt > 0 ? dd / dt : 0, clamp(dt * 10, 0, 1)); st.dist = dd; st.spd = S.spd; if (dd > .002 && !st.fixedYaw) S.moveYaw = Math.atan2(dy, dx);
      return st;
    };
    for (const e of G.enemies) {
      const S = getSoldier(e, 'enemy'); if (S.fresh) { S.fresh = false; if (!e.alive) S.fall = 1; S.lastFire = 0; S.lastHp = e.hp; }
      setGun(S, 2, null);
      const tgt = nearest(G.players, e.x, e.y); let aimYaw = S.yaw;
      if (e.alive && tgt && (e.alert > 0 || e.fire > 0)) aimYaw = Math.atan2(tgt.y - e.y, tgt.x - e.x); else if (S.moveYaw !== undefined && S.spd > .15) aimYaw = S.moveYaw;
      S.yaw = S.yaw + angN(aimYaw - S.yaw) * clamp(dt * (e.alert > 0 ? 12 : 6), 0, 1);
      if (e.fire > (S.lastFire || 0) + .02 && e.alive) { S.flashT = .06; const p0 = new T.Vector3(e.x + Math.cos(S.yaw) * .45, .5, e.y + Math.sin(S.yaw) * .45); S.kickT = 1;
        if (tgt) { const sp = (Math.random() - .5) * .25; const a = Math.atan2(tgt.y - e.y, tgt.x - e.x) + sp, dd = Math.hypot(tgt.x - e.x, tgt.y - e.y) + 1.5; tracer(p0, new T.Vector3(e.x + Math.cos(a) * Math.min(dd, 14), .48 + (Math.random() - .5) * .12, e.y + Math.sin(a) * Math.min(dd, 14))); } }
      S.lastFire = e.fire; S.kickT = Math.max(0, (S.kickT || 0) - dt * 8);
      const ready = e.alive ? (e.alert > 0 && e.stun <= 0 ? 1 : .25) : 0;
      const st = stateOf(S, e, 'enemy', { x: e.x, y: e.y, yaw: S.yaw, alive: e.alive, ready, recoil: S.kickT, crouch: e.alert > 0 && !(e.moving) ? .35 : 0 });
      poseSoldier(S, st, dt);
      const dd = Math.hypot(e.x - eyeV.x, e.y - eyeV.z); S.root.visible = dd < 17; S.body.traverse((o) => { if (o.isMesh) o.castShadow = dd < 9; });
      if (S.flashT > 0 && S.muzzleWorld) { /* flare lighting handled by sprite */ }
    }
    for (const p of G.players) {
      if (p === me && fp) continue;
      const S = getSoldier(p, 'ally', (CREW[p.crew || 0] || CREW[0]).c); if (S.fresh) { S.fresh = false; S.yaw = p.a; S.lastShot = p.shotT || -9; }
      setGun(S, p.gun, p.att);
      S.yaw = S.yaw + angN(p.a - S.yaw) * clamp(dt * 14, 0, 1); const st0 = { x: p.x, y: p.y, yaw: S.yaw, alive: !p.dead, fixedYaw: true };
      let recoil = 0, ready = p === me ? clamp(.45 + aim * .55 + (G.flash > 0 ? 1 : 0), 0, 1) : .85;
      if (p === me) { recoil = me.recoil || 0; if (S.lastAmmo !== undefined && me.ammo < S.lastAmmo && G.flash > 0) { S.flashT = .06; spawnShot(S, me, me.a); } S.lastAmmo = me.ammo; st0.crouch = 0; if (me.sprint > .4) ready = Math.min(ready, .1); }
      else { if ((p.shotT || -9) !== S.lastShot) { S.lastShot = p.shotT; S.flashT = .06; S.kickT = 1; spawnShot(S, p, p.a); } S.kickT = Math.max(0, (S.kickT || 0) - dt * 8); recoil = S.kickT; }
      st0.ready = ready; st0.recoil = recoil;
      poseSoldier(S, stateOf(S, p, 'ally', st0), dt);
      if (p === me) { S.root.visible = tpDist > .55 || me.dead; S.flare.visible = S.flare.visible && S.root.visible; }
    }
    for (const [k, S] of soldiers) if (S.used !== frameId) { scene.remove(S.root); scene.remove(S.flare); soldiers.delete(k); }
    // ---- objective props
    const showT = !G.objective; term.visible = showT; exitG.visible = !showT;
    if (showT && G.target) { const k = G.target.x + ',' + G.target.y; term.position.set(G.target.x, 0, G.target.y); if (termKey !== k) { termKey = k; orientToWall(term, G.target.x, G.target.y); } drawScreen(tAcc); termLight.intensity = 3 + Math.sin(tAcc * 3) * .6; }
    if (!showT && G.exit) { const k = G.exit.x + ',' + G.exit.y; exitG.position.set(G.exit.x, 0, G.exit.y); if (exitKey !== k) { exitKey = k; orientToWall(exitG, G.exit.x, G.exit.y); } beamMat.opacity = .12 + Math.sin(tAcc * 3) * .04; }
    // grenades
    const liveN = new Set(); for (const v of G.projectiles) { liveN.add(v); let m = nades.get(v); if (!m) { m = new T.Mesh(nadeGeo, nadeMats[v.kind] || nadeMats[1]); m.castShadow = true; scene.add(m); nades.set(v, m); } m.position.set(v.x, v.z, v.y); m.rotation.x += dt * 9; m.rotation.z += dt * 5; }
    for (const [v, m] of nades) if (!liveN.has(v)) { scene.remove(m); nades.delete(v); boom(v); }
    // smoke clouds
    const liveS = new Set(); for (const c of G.clouds) { liveS.add(c); let grp = smokes.get(c); if (!grp) { grp = new T.Group(); for (let i = 0; i < 9; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, color: 0xb8bab5, transparent: true, depthWrite: false, opacity: 0 })); sp.userData = { ox: (rr() - .5) * 1.5, oz: (rr() - .5) * 1.5, oy: .1 + rr() * .7, s: 1.1 + rr() * .9, ph: rr() * 6 }; grp.add(sp); } scene.add(grp); smokes.set(c, grp); }
      const k = clamp(c.life / 1.5, 0, 1) * clamp((6 - c.life) / .8 + .2, 0, 1); grp.children.forEach((sp) => { const u = sp.userData; sp.position.set(c.x + u.ox + Math.sin(tAcc * .3 + u.ph) * .12, u.oy + (6 - c.life) * .02, c.y + u.oz); sp.scale.setScalar(u.s * (1 + (6 - c.life) * .06)); sp.material.opacity = .62 * k; sp.material.rotation = tAcc * .05 + u.ph; }); }
    for (const [c, grp] of smokes) if (!liveS.has(c)) { scene.remove(grp); smokes.delete(c); }
    syncImpacts(); updateParts(dt); updateTracers(dt);
    // ---- draw world
    renderer.setRenderTarget(rt); renderer.setClearColor(0x030405, 1); renderer.clear(true, true, true);
    renderer.render(scene, cam);
    // ---- viewmodel
    if (fp) {
      setVM(me); const g = vm.gun; vm.t += dt; const mv = me.moving || 0, bob = (1 - aim * .85), sp = me.sprint || 0;
      const rl = me.reload > 0 ? Math.sin((1 - me.reload / me.reloadTotal) * Math.PI) : 0, rec = me.recoil || 0;
      const bx = Math.cos(me.stride * .5) * mv * .006 * bob, by = Math.abs(Math.sin(me.stride * .5)) * mv * .008 * bob;
      const sway = (me._swayA === undefined ? 0 : angN(me.a - me._swayA)); me._swayA = me.a; me._sw = lerp(me._sw || 0, clamp(sway * -.9, -.07, .07), clamp(dt * 10, 0, 1));
      const rest = V(.15, -.095, -.46 + rec * .05), ads = V(0, -.083 - (me.att && me.att[0] === 3 ? .008 : 0), -.42 + rec * .03);
      g.position.set(lerp(rest.x, ads.x, aim) + bx + me._sw * .5 + sp * -.05, lerp(rest.y, ads.y, aim) - by - rl * .1 - sp * .035, lerp(rest.z, ads.z, aim) + rl * .03);
      g.scale.setScalar(.8); g.rotation.order = 'YXZ'; g.rotation.set(rec * -.09 + rl * -.5 - sp * .25 + me._sw * .2, Math.PI + me._sw - sp * .5 - (1 - aim) * .03, rl * .3 + sp * .15); g.updateMatrix();
      const gripW = g.userData.grip.clone().applyMatrix4(g.matrix), foreW = g.userData.fore.clone().applyMatrix4(g.matrix);
      const shR = V(.34, -.55, .15), shL = V(-.36, -.52, .05);
      const eR = ik(shR, gripW, .33, .33, V(.5, -1, .3)), eL = ik(shL, foreW, .33, .33, V(-.6, -1, .3));
      placeLimb(vm.sleeve[0], shR, eR.j); placeLimb(vm.sleeve[1], eR.j, eR.end); placeLimb(vm.sleeve[2], shL, eL.j); placeLimb(vm.sleeve[3], eL.j, eL.end);
      vm.hands[0].position.copy(eR.end); vm.hands[1].position.copy(eL.end);
      vm.gun.visible = vm.sleeve.every((s) => (s.visible = true)); vm.hands.forEach((h) => h.visible = true);
      const muz = new T.Vector3(); g.userData.muzzle.getWorldPosition(muz);
      if (G.flash > 0) { vm.flare.visible = true; vm.flare.position.copy(muz); vm.flare.material.rotation = rr() * 6; const s = .09 + rr() * .05; vm.flare.scale.set(s, s, s); vMuz.position.copy(muz); vMuz.intensity = 2.4; } else { vm.flare.visible = false; vMuz.intensity = 0; }
      vcam.fov = lerp(62, 52, aim); vcam.updateProjectionMatrix();
      renderer.clearDepth(); renderer.render(vscene, vcam);
      // world-space muzzle tracer for the local player (aim along crosshair)
    }
    // ---- post
    renderer.setRenderTarget(null); post.uniforms.t.value = rt.texture; post.uniforms.time.value = tAcc % 100;
    post.uniforms.hurt.value = 0; post.uniforms.blast.value = 0; post.uniforms.flash.value = clamp(G.flash / .075, 0, 1);
    post.uniforms.low.value = 0;
    renderer.render(postScene, postCam);
  }
  function spawnShot(S, pl, ang) { // tracer + local flash for players (me or squad mates); starts at the muzzle
    let p0; if (S.muzzleWorld && S.flashT > 0) p0 = S.muzzleWorld.clone(); else p0 = new T.Vector3(pl.x + Math.cos(ang) * .45, .5, pl.y + Math.sin(ang) * .45);
    const d = Math.min(ray(pl.x, pl.y, ang, 16).d, 16); const a = ang + (Math.random() - .5) * .02;
    tracer(p0, new T.Vector3(pl.x + Math.cos(a) * d, .5 + (Math.random() - .5) * .04, pl.y + Math.sin(a) * d));
  }
  function boom(v) { // grenade finished: visual burst matching the game's kind
    if (v.kind === 3) return;
    const x = v.tx, y = v.ty; const flash = v.kind === 2;
    for (let i = 0; i < (flash ? 6 : 16); i++) spawn(fireMat, x, .25 + rr() * .3, y, (rr() - .5) * 2.4, rr() * 2, (rr() - .5) * 2.4, .45 + rr() * .3, flash ? .5 : .28, flash ? 1.8 : 1.1, 1, 1);
    if (!flash) for (let i = 0; i < 10; i++) spawn(dustMat, x, .2 + rr() * .3, y, (rr() - .5) * 1.4, .3 + rr() * .8, (rr() - .5) * 1.4, 1.4 + rr(), .4, .9, -.1, .8);
    muzzleLight.position.set(x, .5, y); muzzleLight.intensity = 14; setTimeout(() => { muzzleLight.intensity = 0; }, 90);
  }
  function setSize(w, h) { W = 0; Hh = 0; }
  return { render, setSize, renderer, dispose() { renderer.dispose(); } };
}
