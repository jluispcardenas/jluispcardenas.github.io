// Zombi Rescate — juego 3D en tercera persona para niños.
// Renderizado con Three.js sobre WebGL2 (aceleración por GPU).
import * as THREE from './vendor/three.module.min.js';

/* =====================================================================
   MAPA DE LA MANSIÓN (cada celda = 4 metros)
   #  pared        .  madera       ,  biblioteca   :  invernadero
   ;  gran salón   =  pasillo      ~  cocina       +  jardín interior
   P  jugador      Z  zombi        K  llave        C  galleta (vida)
   A  burbujas     E  puerta de salida
   ===================================================================== */
const MAP = [
  '###########################',
  '#.......#,,,,,,,,,,#::::::#',
  '#.......#,,,,,,Z,,,#::K:::#',
  '#..P....=,,,,,,,,,,=::::::#',
  '#.......#,,,,,,,,,,#:::Z::#',
  '#...C...#,,,K,,,,,,#::::::#',
  '####=####,,,,,,,,,,####=###',
  '   #=#  #,,,Z,,,A,,#  #=#  ',
  '   #=#  #####=######  #=#  ',
  '####=########=#########=###',
  '#;;;;;;;;;;;;;;;;;;;;;;;;;#',
  '#;;Z;;;;;;;;A;;;;;;;;Z;;;;#',
  '#;;;;;;;;;;;;;;;;;;;;;;;;;#',
  '#####=##############=######',
  '#~~~~~~~~~~~~#++++++++++++#',
  '#~~Z~~~~C~~~~#++++++Z+++++#',
  '#~~~~~~~~~~~~=++++++++++++#',
  '#~~~~A~~~~K~~#+++++++++E++#',
  '#~~~~~~~~~~~~#++Z+++++++++#',
  '###########################',
];
const S = 4;            // tamaño de celda
const WALL_H = 4;       // altura de paredes
const ROWS = MAP.length, COLS = MAP[0].length;
const FLOOR_COL = { '.': 0xb88152, ',': 0x7865ad, ':': 0x55a395, ';': 0xb07448, '=': 0xc23b5a, '~': 0xeee3cb, '+': 0x74b06a };
const WALL_COL  = { '.': 0x8a5aa0, ',': 0x5e4c94, ':': 0x3f7f76, ';': 0x96603e, '=': 0x74498c, '~': 0xe0906c, '+': 0x4f8a50 };
const ROOM_NAME = { '.': 'Dormitorio', ',': 'Biblioteca', ':': 'Invernadero', ';': 'Gran salón', '=': 'Pasillo', '~': 'Cocina', '+': 'Jardín' };

const PLAYER_MAX_HP = 4;
const AMMO_MAX = 60;
const KEYS_NEEDED = 3;

/* ---------- utilidades ---------- */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const isFloorChar = (ch) => ch !== undefined && ch !== '#' && ch !== ' ';
const cellChar = (r, c) => (r < 0 || r >= ROWS || c < 0 || c >= COLS) ? ' ' : MAP[r][c];
const solidCell = (r, c) => !isFloorChar(cellChar(r, c));
const solidAt = (x, z) => solidCell(Math.floor(z / S), Math.floor(x / S));
const cellCenter = (r, c) => new THREE.Vector3(c * S + S / 2, 0, r * S + S / 2);

function baseFloor(r, c) {
  const ch = cellChar(r, c);
  if (FLOOR_COL[ch] !== undefined) return ch;
  const counts = {};
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const n = cellChar(r + dr, c + dc);
    if (FLOOR_COL[n] !== undefined) counts[n] = (counts[n] || 0) + 1;
  }
  let best = '.', bc = 0;
  for (const k in counts) if (counts[k] > bc) { best = k; bc = counts[k]; }
  return best;
}

function collide(p, rad) {
  for (let pass = 0; pass < 2; pass++) {
    const c0 = Math.floor((p.x - rad) / S), c1 = Math.floor((p.x + rad) / S);
    const r0 = Math.floor((p.z - rad) / S), r1 = Math.floor((p.z + rad) / S);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (!solidCell(r, c)) continue;
      const cx = clamp(p.x, c * S, c * S + S), cz = clamp(p.z, r * S, r * S + S);
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < rad * rad && d2 > 1e-9) {
        const d = Math.sqrt(d2);
        p.x += dx / d * (rad - d); p.z += dz / d * (rad - d);
      }
    }
  }
}

function lineOfSight(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
  const steps = Math.ceil(len / 0.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (solidAt(a.x + dx * t, a.z + dz * t)) return false;
  }
  return true;
}

/* =====================================================================
   SONIDO (sintetizado con Web Audio, sin archivos)
   ===================================================================== */
const Sound = {
  ctx: null, master: null, music: null, muted: localStorage.getItem('zr-muted') === '1', step: 0, timer: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0.35;
    this.music.connect(this.master);
  },
  setMuted(m) {
    this.muted = m; localStorage.setItem('zr-muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.7;
  },
  tone(freq, dur, { type = 'sine', vol = 0.2, slide = 0, delay = 0, out = null } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.12, freq = 2500) {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
  },
  shoot() { this.tone(480, 0.14, { vol: 0.16, slide: 900 }); this.noise(0.05, 0.05, 4000); },
  pop() { this.tone(1100, 0.07, { vol: 0.1, slide: 600 }); this.noise(0.05, 0.1, 3000); },
  hit() { this.tone(330, 0.12, { type: 'triangle', vol: 0.18, slide: 200 }); this.pop(); },
  cure() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.16, delay: i * 0.07 })); },
  hurt() { this.tone(220, 0.3, { type: 'square', vol: 0.09, slide: -130 }); this.noise(0.15, 0.1, 500); },
  key() { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.3, { vol: 0.18, delay: i * 0.09 })); },
  pickup() { this.tone(660, 0.12, { vol: 0.16, slide: 400 }); this.tone(990, 0.15, { vol: 0.12, delay: 0.08 }); },
  empty() { this.tone(160, 0.06, { type: 'square', vol: 0.06 }); },
  open() { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.15, delay: i * 0.12 })); },
  win() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, { type: 'triangle', vol: 0.18, delay: i * 0.14 })); },
  lose() { [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.16, delay: i * 0.2 })); },
  // Musiquita de "misterio divertido"
  startMusic() {
    if (!this.ctx || this.timer) return;
    const mel = [69, 0, 72, 0, 76, 74, 72, 0, 69, 0, 67, 69, 71, 0, 64, 0, 69, 0, 72, 0, 76, 77, 76, 74, 72, 0, 71, 0, 69, 0, 0, 0];
    const bass = [45, 45, 52, 52, 41, 41, 40, 40];
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    this.timer = setInterval(() => {
      const s = this.step++ % mel.length;
      if (mel[s]) this.tone(mtof(mel[s]), 0.22, { type: 'triangle', vol: 0.07, out: this.music });
      if (s % 4 === 0) this.tone(mtof(bass[(s / 4) % bass.length]), 0.5, { type: 'sine', vol: 0.12, out: this.music });
    }, 190);
  },
  stopMusic() { clearInterval(this.timer); this.timer = null; },
};

/* =====================================================================
   RENDERER / ESCENA (WebGL2 con preferencia de GPU dedicada)
   ===================================================================== */
const canvas = $('game');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' });
} catch (e) {
  $('startScreen').hidden = true; $('errorScreen').hidden = false;
  throw e;
}
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.75 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
{
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
  const short = gpu.replace(/ANGLE \(|\)|Direct3D.*|OpenGL.*|vs_.*|, /g, ' ').replace(/\s+/g, ' ').trim().replace(/\(.*$/, '').trim().slice(0, 40);
  $('gpuInfo').textContent = `Acelerado por GPU · ${renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL'}${short ? ' · ' + short : ''}`;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1d1733);
scene.fog = new THREE.Fog(0x241b40, 20, 52);
const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 140);

scene.add(new THREE.HemisphereLight(0xfff2e0, 0x4a3a78, 2.2));
const sun = new THREE.DirectionalLight(0xffe8c8, 1.4);
sun.position.set(14, 30, 8);
scene.add(sun);
const playerLight = new THREE.PointLight(0xffd9a0, 10, 16, 1.2);
scene.add(playerLight);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 1 ? 80 : 68;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- materiales y texturas ---------- */
const gradTex = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter;
gradTex.needsUpdate = true;
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradTex, ...extra });

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const radial = (stops) => canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const glowTex = radial([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
const shadowTex = radial([[0, 'rgba(0,0,0,.55)'], [0.6, 'rgba(0,0,0,.3)'], [1, 'rgba(0,0,0,0)']]);

const paintingTex = [
  canvasTex(128, 96, (g) => { g.fillStyle = '#5fb8ff'; g.fillRect(0, 0, 128, 96); g.fillStyle = '#7fd36a'; g.fillRect(0, 64, 128, 32); g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(40, 38, 16, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(88, 30, 10, 0, 7); g.arc(100, 30, 12, 0, 7); g.arc(112, 32, 9, 0, 7); g.fill(); }),
  canvasTex(128, 96, (g) => { g.fillStyle = '#2b2458'; g.fillRect(0, 0, 128, 96); g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(90, 30, 18, 0, 7); g.fill(); g.fillStyle = '#2b2458'; g.beginPath(); g.arc(98, 24, 16, 0, 7); g.fill(); g.fillStyle = '#ffe14d'; for (let i = 0; i < 9; i++) { g.fillRect((i * 37) % 120 + 4, (i * 23) % 60 + 6, 3, 3); } g.fillStyle = '#5b3a8a'; g.fillRect(0, 70, 128, 26); }),
  canvasTex(128, 96, (g) => { g.fillStyle = '#ffd6e8'; g.fillRect(0, 0, 128, 96); g.fillStyle = '#9be07a'; g.beginPath(); g.arc(64, 48, 26, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(54, 44, 8, 0, 7); g.arc(76, 44, 7, 0, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(55, 45, 3.5, 0, 7); g.arc(75, 45, 3, 0, 7); g.fill(); g.strokeStyle = '#2d5a22'; g.lineWidth = 3; g.beginPath(); g.arc(64, 54, 10, 0.2, Math.PI - 0.2); g.stroke(); }),
  canvasTex(128, 96, (g) => { g.fillStyle = '#ffeec2'; g.fillRect(0, 0, 128, 96); ['#ff5d5d', '#ffb14d', '#ffe14d', '#6bff8a', '#5dc8ff', '#b98bff'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 7; g.beginPath(); g.arc(64, 96, 70 - i * 8, Math.PI, 0); g.stroke(); }); }),
];

const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xa6f2ff, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1, emissive: 0x2a6f9a, emissiveIntensity: 0.6, depthWrite: false });
const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

function blobShadow(size) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 1;
  return m;
}
function glowSprite(color, scale) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(scale); return s;
}
function part(geo, mat, x, y, z, sx, sy, sz, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  parent.add(m); return m;
}

/* =====================================================================
   CONSTRUCCIÓN DE LA MANSIÓN (geometría instanciada en GPU)
   ===================================================================== */
const minimapStatic = document.createElement('canvas');
function buildMansion() {
  const rng = mulberry32(7);
  const floors = [], walls = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (isFloorChar(MAP[r][c])) floors.push([r, c]);
    else {
      let near = false;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) if (isFloorChar(cellChar(r + dr, c + dc))) near = true;
      if (near) walls.push([r, c]);
    }
  }
  // Suelo
  const fGeo = new THREE.PlaneGeometry(S, S); fGeo.rotateX(-Math.PI / 2);
  const floorMesh = new THREE.InstancedMesh(fGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), floors.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  floors.forEach(([r, c], i) => {
    m4.makeTranslation(c * S + S / 2, 0, r * S + S / 2);
    floorMesh.setMatrixAt(i, m4);
    const ch = baseFloor(r, c);
    col.setHex(FLOOR_COL[ch]).multiplyScalar((r + c) % 2 ? 1 : 0.88);
    floorMesh.setColorAt(i, col);
  });
  scene.add(floorMesh);

  // Alfombras doradas en los pasillos
  const trimMat = new THREE.MeshLambertMaterial({ color: 0xffcc66 });
  floors.forEach(([r, c]) => {
    if (MAP[r][c] !== '=') return;
    const vertical = isFloorChar(cellChar(r - 1, c)) || isFloorChar(cellChar(r + 1, c));
    for (const s of [-1, 1]) {
      const t = new THREE.Mesh(boxGeo, trimMat);
      t.scale.set(vertical ? 0.12 : S, 0.02, vertical ? S : 0.12);
      t.position.set(c * S + S / 2 + (vertical ? s * 1.3 : 0), 0.01, r * S + S / 2 + (vertical ? 0 : s * 1.3));
      scene.add(t);
    }
  });

  // Paredes + zócalo
  const wGeo = new THREE.BoxGeometry(S, WALL_H, S); wGeo.translate(0, WALL_H / 2, 0);
  const wallMesh = new THREE.InstancedMesh(wGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), walls.length);
  const bGeo = new THREE.BoxGeometry(S + 0.12, 0.45, S + 0.12); bGeo.translate(0, 0.225, 0);
  const baseMesh = new THREE.InstancedMesh(bGeo, new THREE.MeshLambertMaterial({ color: 0x4a2c1c }), walls.length);
  const tGeo = new THREE.BoxGeometry(S + 0.12, 0.25, S + 0.12); tGeo.translate(0, WALL_H - 0.6, 0);
  const topMesh = new THREE.InstancedMesh(tGeo, new THREE.MeshLambertMaterial({ color: 0xf2d38a }), walls.length);
  walls.forEach(([r, c], i) => {
    m4.makeTranslation(c * S + S / 2, 0, r * S + S / 2);
    wallMesh.setMatrixAt(i, m4); baseMesh.setMatrixAt(i, m4); topMesh.setMatrixAt(i, m4);
    let ch = '.';
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const n = cellChar(r + dr, c + dc); if (isFloorChar(n)) { ch = baseFloor(r + dr, c + dc); break; }
    }
    wallMesh.setColorAt(i, col.setHex(WALL_COL[ch]));
  });
  scene.add(wallMesh, baseMesh, topMesh);

  // Techo
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(COLS * S, ROWS * S), new THREE.MeshLambertMaterial({ color: 0x4a3a7a, emissive: 0x1a1230 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(COLS * S / 2, WALL_H, ROWS * S / 2);
  scene.add(ceil);

  // Cuadros y lámparas de pared
  const frameMat = new THREE.MeshLambertMaterial({ color: 0xffc94d });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe58a });
  const paintMats = paintingTex.map((t) => new THREE.MeshBasicMaterial({ map: t }));
  walls.forEach(([r, c]) => {
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!isFloorChar(cellChar(r + dr, c + dc))) continue;
      if (MAP[r + dr][c + dc] === '=') continue;
      const roll = rng();
      const g = new THREE.Group();
      g.position.set(c * S + S / 2 + dc * (S / 2 + 0.06), 0, r * S + S / 2 + dr * (S / 2 + 0.06));
      g.rotation.y = Math.atan2(dc, dr);
      if (roll < 0.16) {
        part(boxGeo, frameMat, 0, 2.3, 0, 2.0, 1.6, 0.1, g);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.3), paintMats[Math.floor(rng() * paintMats.length)]);
        p.position.set(0, 2.3, 0.06); g.add(p);
        scene.add(g);
      } else if (roll < 0.27) {
        part(boxGeo, frameMat, 0, 2.6, 0.08, 0.25, 0.4, 0.2, g);
        part(sphereGeo, lampMat, 0, 2.95, 0.18, 0.16, 0.2, 0.16, g);
        const s = glowSprite(0xffd27a, 2.6); s.position.set(0, 2.95, 0.4); g.add(s);
        scene.add(g);
      }
    }
  });

  // Minimapa estático
  const px = 6;
  minimapStatic.width = COLS * px; minimapStatic.height = ROWS * px;
  const g = minimapStatic.getContext('2d');
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!isFloorChar(MAP[r][c])) continue;
    g.fillStyle = MAP[r][c] === '=' ? '#9a6fb8' : '#6c5aa8';
    g.fillRect(c * px, r * px, px, px);
  }
}

/* =====================================================================
   PERSONAJES (modelos caricatura hechos con primitivas)
   ===================================================================== */
const capsule = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
const limbGeo = capsule(0.11, 0.5);
const legGeo = capsule(0.13, 0.5);

function makeLimb(mat, geo, x, y, z, len, parent) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, z);
  const m = new THREE.Mesh(geo, mat); m.position.y = -len / 2; pivot.add(m);
  parent.add(pivot); return pivot;
}

function makePlayer() {
  const g = new THREE.Group();
  const skin = toon(0xffb58a), shirt = toon(0xff8c2e), pants = toon(0x2f5fa8), cap = toon(0xe63946), hair = toon(0x6b3f22), pack = toon(0x3fbf6a), shoe = toon(0x3a2a1a);
  const body = new THREE.Group(); g.add(body);
  const legL = makeLimb(pants, legGeo, -0.17, 0.82, 0, 0.7, body);
  const legR = makeLimb(pants, legGeo, 0.17, 0.82, 0, 0.7, body);
  part(boxGeo, shoe, 0, -0.78, -0.06, 0.24, 0.14, 0.36, legL);
  part(boxGeo, shoe, 0, -0.78, -0.06, 0.24, 0.14, 0.36, legR);
  const torso = part(new THREE.CapsuleGeometry(0.34, 0.42, 4, 12), shirt, 0, 1.2, 0, 1, 1, 0.78, body);
  part(boxGeo, pack, 0, 1.22, 0.3, 0.5, 0.58, 0.26, body);
  part(boxGeo, toon(0x2c9450), 0, 1.36, 0.44, 0.4, 0.2, 0.04, body);
  const head = new THREE.Group(); head.position.y = 1.78; body.add(head);
  part(sphereGeo, skin, 0, 0, 0, 0.31, 0.31, 0.31, head);
  part(sphereGeo, hair, 0, 0.02, 0.05, 0.32, 0.3, 0.31, head);
  part(new THREE.SphereGeometry(0.33, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), cap, 0, 0.06, 0, 1, 1, 1, head);
  part(boxGeo, toon(0xc22f3b), 0, 0.07, -0.33, 0.4, 0.05, 0.28, head);
  part(sphereGeo, toon(0x222222), -0.11, 0, -0.28, 0.04, 0.05, 0.03, head);
  part(sphereGeo, toon(0x222222), 0.11, 0, -0.28, 0.04, 0.05, 0.03, head);
  const armL = makeLimb(skin, limbGeo, -0.42, 1.48, 0, 0.6, body);
  const armR = makeLimb(skin, limbGeo, 0.42, 1.48, 0, 0.6, body);
  armR.rotation.x = Math.PI / 2.1; armL.rotation.x = Math.PI / 2.3; armL.rotation.z = -0.35;
  // Lanzaburbujas
  const gun = new THREE.Group(); gun.position.set(0.3, 1.42, -0.62); body.add(gun);
  part(boxGeo, toon(0x7a5cff), 0, 0, 0, 0.2, 0.22, 0.62, gun);
  part(new THREE.CylinderGeometry(0.09, 0.12, 0.2, 12).rotateX(Math.PI / 2), toon(0xffcc33), 0, 0, -0.38, 1, 1, 1, gun);
  part(boxGeo, toon(0x5a3fd6), 0, -0.17, 0.1, 0.12, 0.2, 0.14, gun);
  part(sphereGeo, bubbleMat, 0, 0.2, 0.08, 0.14, 0.14, 0.14, gun);
  const tip = new THREE.Object3D(); tip.position.set(0, 0, -0.55); gun.add(tip);
  g.add(blobShadow(1.3));
  return { group: g, body, legL, legR, armL, armR, gun, tip, torso, head };
}

const ZOMBIE_SHIRTS = [0xe8743b, 0xd65db1, 0x4aa3df, 0xe0b53c, 0x8a6bd1];
const CURED_SKIN = [0xffc9a0, 0xe8a87c, 0xc68642, 0x8d5524, 0xffdbb4];
const CURED_SHIRT = [0xff5d8f, 0x5dc8ff, 0xffe14d, 0x6bff8a, 0xffa94d, 0xb98bff];
const CURED_HAIR = [0x3a2414, 0x6b3f22, 0xe8c15a, 0x1c1c1c, 0xb5562c];

function makeZombie() {
  const g = new THREE.Group();
  const mats = {
    skin: toon(0x9be07a), shirt: toon(pick(ZOMBIE_SHIRTS)), pants: toon(0x4b3a7a), hair: toon(0x6b4ca8),
    shoe: toon(0x3a2a1a), mouth: toon(0x2d5a22), white: toon(0xffffff), black: toon(0x222222), cheek: toon(0xff9aa8, { transparent: true, opacity: 0.7 }),
  };
  const body = new THREE.Group(); g.add(body);
  const legL = makeLimb(mats.pants, legGeo, -0.18, 0.82, 0, 0.7, body);
  const legR = makeLimb(mats.pants, legGeo, 0.18, 0.82, 0, 0.7, body);
  part(boxGeo, mats.shoe, 0, -0.78, -0.06, 0.25, 0.14, 0.36, legL);
  part(boxGeo, mats.shoe, 0, -0.78, -0.06, 0.25, 0.14, 0.36, legR);
  part(new THREE.CapsuleGeometry(0.38, 0.42, 4, 12), mats.shirt, 0, 1.2, 0, 1, 1, 0.8, body);
  const head = new THREE.Group(); head.position.y = 1.86; body.add(head);
  part(sphereGeo, mats.skin, 0, 0, 0, 0.4, 0.38, 0.38, head);
  part(new THREE.SphereGeometry(0.41, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), mats.hair, 0, 0.04, 0.02, 1, 1, 1, head);
  const eyeL = part(sphereGeo, mats.white, -0.14, 0.06, -0.3, 0.13, 0.14, 0.08, head);
  const eyeR = part(sphereGeo, mats.white, 0.15, 0.08, -0.3, 0.11, 0.12, 0.08, head);
  part(sphereGeo, mats.black, -0.13, 0.05, -0.37, 0.055, 0.06, 0.03, head);
  part(sphereGeo, mats.black, 0.14, 0.07, -0.37, 0.045, 0.05, 0.03, head);
  const mouth = part(boxGeo, mats.mouth, 0, -0.16, -0.34, 0.2, 0.04, 0.04, head);
  const tooth = part(boxGeo, mats.white, 0.03, -0.12, -0.35, 0.06, 0.06, 0.03, head);
  const bandage = part(boxGeo, toon(0xf6f0d8), 0.25, -0.02, -0.27, 0.16, 0.06, 0.04, head);
  bandage.rotation.z = -0.4;
  part(sphereGeo, mats.cheek, -0.25, -0.08, -0.27, 0.06, 0.04, 0.02, head);
  const armL = makeLimb(mats.skin, limbGeo, -0.48, 1.5, 0, 0.6, body);
  const armR = makeLimb(mats.skin, limbGeo, 0.48, 1.5, 0, 0.6, body);
  armL.rotation.x = armR.rotation.x = Math.PI / 2;
  const shadow = blobShadow(1.4); g.add(shadow);
  const stuck = new THREE.Group(); g.add(stuck);
  return { group: g, body, head, legL, legR, armL, armR, mats, mouth, tooth, bandage, eyeL, eyeR, stuck, shadow };
}

/* ---------- objetos ---------- */
function makeKey() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 0.7, roughness: 0.25, emissive: 0x6a4a00, emissiveIntensity: 0.8 });
  part(new THREE.TorusGeometry(0.22, 0.07, 10, 20), gold, 0, 0.3, 0, 1, 1, 1, g);
  part(boxGeo, gold, 0, -0.12, 0, 0.09, 0.6, 0.09, g);
  part(boxGeo, gold, 0.1, -0.3, 0, 0.16, 0.08, 0.08, g);
  part(boxGeo, gold, 0.08, -0.16, 0, 0.12, 0.08, 0.08, g);
  const s = glowSprite(0xffd34d, 2.4); g.add(s);
  return g;
}
function makeCookie() {
  const g = new THREE.Group();
  part(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 20).rotateX(Math.PI / 2), toon(0xd99a5a), 0, 0, 0, 1, 1, 1, g);
  const chip = toon(0x4a2a14);
  [[-0.12, 0.1], [0.12, 0.05], [0, -0.13], [0.14, -0.14], [-0.14, -0.06]].forEach(([x, y]) => part(sphereGeo, chip, x, y, -0.06, 0.05, 0.05, 0.03, g));
  const heart = new THREE.Group(); g.add(heart);
  const s = glowSprite(0xff7aa2, 1.8); g.add(s);
  return g;
}
function makeAmmo() {
  const g = new THREE.Group();
  part(new THREE.CylinderGeometry(0.2, 0.24, 0.55, 14), toon(0x3fb6ff), 0, -0.1, 0, 1, 1, 1, g);
  part(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 10), toon(0xff5d8f), 0, 0.25, 0, 1, 1, 1, g);
  part(sphereGeo, bubbleMat, 0.25, 0.35, 0, 0.18, 0.18, 0.18, g);
  part(sphereGeo, bubbleMat, -0.18, 0.5, 0.05, 0.12, 0.12, 0.12, g);
  const s = glowSprite(0x7fd8ff, 1.8); g.add(s);
  return g;
}
function makeExitDoor() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 0.6, roughness: 0.3, emissive: 0x4a3000 });
  part(boxGeo, gold, -0.95, 1.45, 0, 0.22, 2.9, 0.3, g);
  part(boxGeo, gold, 0.95, 1.45, 0, 0.22, 2.9, 0.3, g);
  part(boxGeo, gold, 0, 2.95, 0, 2.12, 0.24, 0.3, g);
  const portalMat = new THREE.MeshBasicMaterial({ color: 0x3a2a6a, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
  const portal = part(new THREE.PlaneGeometry(1.7, 2.8), portalMat, 0, 1.42, 0, 1, 1, 1, g);
  const hinge = new THREE.Group(); hinge.position.set(-0.84, 0, 0); g.add(hinge);
  const doorMat = toon(0x8a4f2a);
  part(boxGeo, doorMat, 0.84, 1.42, 0, 1.68, 2.8, 0.12, hinge);
  part(sphereGeo, gold, 1.45, 1.4, -0.1, 0.07, 0.07, 0.07, hinge);
  part(sphereGeo, gold, 1.45, 1.4, 0.1, 0.07, 0.07, 0.07, hinge);
  const lock = part(boxGeo, toon(0x666688), 0.84, 1.6, -0.1, 0.3, 0.35, 0.08, hinge);
  const glow = glowSprite(0x7dff6b, 5); glow.position.y = 1.5; glow.visible = false; g.add(glow);
  // tres huecos para llaves sobre la puerta
  const slots = [];
  for (let i = 0; i < KEYS_NEEDED; i++) {
    const m = part(sphereGeo, new THREE.MeshBasicMaterial({ color: 0x444455 }), -0.5 + i * 0.5, 3.35, 0, 0.16, 0.16, 0.16, g);
    slots.push(m);
  }
  return { group: g, hinge, portalMat, glow, slots, lock };
}

/* =====================================================================
   PARTÍCULAS (confeti y burbujas reventadas)
   ===================================================================== */
const confettiMats = [0xff5d8f, 0xffe14d, 0x6bff8a, 0x5dc8ff, 0xb98bff, 0xffa94d, 0xffffff].map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
const confettiGeo = new THREE.PlaneGeometry(0.14, 0.09);
const particles = [];
for (let i = 0; i < 220; i++) {
  const m = new THREE.Mesh(confettiGeo, confettiMats[i % confettiMats.length]);
  m.visible = false; scene.add(m);
  particles.push({ mesh: m, v: new THREE.Vector3(), life: 0, max: 1, spin: 0, g: 9, kind: 'c' });
}
const bubbleParticles = [];
for (let i = 0; i < 60; i++) {
  const m = new THREE.Mesh(sphereGeo, bubbleMat); m.visible = false; scene.add(m);
  bubbleParticles.push({ mesh: m, v: new THREE.Vector3(), life: 0, max: 1, spin: 0, g: -1, kind: 'b' });
}
let pIdx = 0, bIdx = 0;
function spawnConfetti(pos, n, power = 5) {
  for (let i = 0; i < n; i++) {
    const p = particles[pIdx++ % particles.length];
    p.mesh.visible = true; p.mesh.position.copy(pos);
    p.v.set(rand(-1, 1) * power * 0.6, rand(0.4, 1.2) * power, rand(-1, 1) * power * 0.6);
    p.life = p.max = rand(0.9, 1.6); p.spin = rand(-12, 12);
    p.mesh.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
  }
}
function spawnBubbles(pos, n, size = 0.12) {
  for (let i = 0; i < n; i++) {
    const p = bubbleParticles[bIdx++ % bubbleParticles.length];
    p.mesh.visible = true; p.mesh.position.copy(pos);
    p.mesh.scale.setScalar(size * rand(0.6, 1.4));
    p.v.set(rand(-2, 2), rand(0.5, 3), rand(-2, 2));
    p.life = p.max = rand(0.4, 0.9);
  }
}
function updateParticles(dt) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.mesh.visible = false; continue; }
    p.v.y -= p.g * dt; p.v.multiplyScalar(1 - 1.5 * dt);
    p.mesh.position.addScaledVector(p.v, dt);
    if (p.mesh.position.y < 0.05) { p.mesh.position.y = 0.05; p.v.set(0, 0, 0); }
    p.mesh.rotation.x += p.spin * dt; p.mesh.rotation.y += p.spin * 0.7 * dt;
  }
  for (const p of bubbleParticles) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.mesh.visible = false; continue; }
    p.mesh.position.addScaledVector(p.v, dt);
    p.mesh.scale.multiplyScalar(1 + dt * 1.5);
  }
}

/* =====================================================================
   ESTADO DEL JUEGO
   ===================================================================== */
buildMansion();

const player = makePlayer();
scene.add(player.group);

const state = {
  mode: 'start', level: 1, hp: PLAYER_MAX_HP, ammo: 30, score: 0, keys: 0, cured: 0, totalZombies: 0,
  yaw: Math.PI, pitch: -0.08, pos: new THREE.Vector3(), knock: new THREE.Vector3(), invuln: 0, fireCd: 0,
  walkT: 0, moving: 0, shake: 0, recoil: 0, lockedMsgCd: 0, exitOpen: false, levelStartScore: 0, time: 0,
};
let zombies = [], pickups = [], bubbles = [], exitDoor = null;
const dynamicRoot = new THREE.Group(); scene.add(dynamicRoot);

function findCells(ch) {
  const out = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (MAP[r][c] === ch) out.push([r, c]);
  return out;
}

function spawnZombie(pos) {
  const z = makeZombie();
  z.group.position.copy(pos);
  z.group.rotation.y = rand(0, Math.PI * 2);
  dynamicRoot.add(z.group);
  Object.assign(z, {
    pos: z.group.position, hp: 2 + state.level, maxHp: 2 + state.level, state: 'wander', wanderT: 0, dir: new THREE.Vector3(),
    speed: 1.35 + state.level * 0.18 + rand(-0.15, 0.15), t: rand(0, 10), stun: 0, wobble: 0, cureT: 0, lastSeen: null,
  });
  zombies.push(z);
}

function resetLevel() {
  dynamicRoot.clear();
  zombies = []; pickups = []; bubbles = [];
  const [pr, pc] = findCells('P')[0];
  state.pos.copy(cellCenter(pr, pc));
  state.yaw = Math.PI; state.pitch = -0.08;
  state.hp = PLAYER_MAX_HP; state.keys = 0; state.cured = 0; state.exitOpen = false;
  state.ammo = Math.max(state.ammo, 30); state.invuln = 0; state.knock.set(0, 0, 0);
  state.levelStartScore = state.score; state.time = 0;

  findCells('Z').forEach(([r, c]) => spawnZombie(cellCenter(r, c)));
  // zombis extra en niveles altos
  const free = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if ('.,:;~+'.includes(MAP[r][c]) && cellCenter(r, c).distanceTo(state.pos) > 16) free.push([r, c]);
  }
  for (let i = 0; i < (state.level - 1) * 2 && free.length; i++) {
    const [r, c] = free.splice(Math.floor(Math.random() * free.length), 1)[0];
    spawnZombie(cellCenter(r, c).add(new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1))));
  }
  state.totalZombies = zombies.length;

  const addPickup = (type, mesh, [r, c]) => {
    const p = cellCenter(r, c); mesh.position.set(p.x, 1.1, p.z);
    dynamicRoot.add(mesh); pickups.push({ type, mesh, pos: p, taken: false, t: rand(0, 6) });
  };
  findCells('K').forEach((rc) => addPickup('key', makeKey(), rc));
  findCells('C').forEach((rc) => addPickup('cookie', makeCookie(), rc));
  findCells('A').forEach((rc) => addPickup('ammo', makeAmmo(), rc));

  exitDoor = makeExitDoor();
  const [er, ec] = findCells('E')[0];
  exitDoor.group.position.copy(cellCenter(er, ec));
  exitDoor.pos = exitDoor.group.position;
  dynamicRoot.add(exitDoor.group);

  updateHUD(true);
}

/* =====================================================================
   HUD
   ===================================================================== */
const heartSVG = (full) => `<svg viewBox="0 0 20 18"><path d="M10 17 L1.6 9.3 A4.8 4.8 0 0 1 10 3.2 A4.8 4.8 0 0 1 18.4 9.3Z" fill="${full ? '#ff4d6d' : 'rgba(0,0,0,.35)'}" stroke="#fff" stroke-width="1.6"/></svg>`;
let lastHUD = {};
function updateHUD(force = false) {
  const h = { hp: state.hp, ammo: state.ammo, score: state.score, keys: state.keys, lvl: state.level, open: state.exitOpen };
  if (!force && JSON.stringify(h) === JSON.stringify(lastHUD)) return;
  if (force || h.hp !== lastHUD.hp) {
    $('hearts').innerHTML = Array.from({ length: PLAYER_MAX_HP }, (_, i) => heartSVG(i < state.hp)).join('');
  }
  $('lvl').textContent = `Nv ${state.level}`;
  $('ammoCount').textContent = state.ammo;
  $('ammoMax').textContent = AMMO_MAX;
  $('ammo').classList.toggle('low', state.ammo <= 5);
  $('score').textContent = `⭐ ${state.score.toLocaleString('es-MX')}`;
  const obj = $('objective');
  if (state.exitOpen) { obj.textContent = '🚪 ¡La puerta mágica está abierta! Ve a la salida'; obj.classList.add('done'); }
  else { obj.textContent = `🔑 Encuentra las llaves doradas (${state.keys}/${KEYS_NEEDED})`; obj.classList.remove('done'); }
  lastHUD = h;
}

let msgTimer = 0;
function showMsg(text, secs = 2) {
  const m = $('msg'); m.textContent = text; m.classList.add('show');
  msgTimer = secs;
}
const tmpV = new THREE.Vector3();
function popupAt(worldPos, text, cls = '') {
  tmpV.copy(worldPos).project(camera);
  if (tmpV.z > 1) return;
  const el = document.createElement('div');
  el.className = 'pop ' + cls; el.textContent = text;
  el.style.left = ((tmpV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
  el.style.top = ((-tmpV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  $('popups').appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

const mm = $('minimap'), mmCtx = mm.getContext('2d');
function drawMinimap() {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const w = mm.clientWidth, h = mm.clientHeight;
  if (mm.width !== Math.round(w * dpr)) { mm.width = Math.round(w * dpr); mm.height = Math.round(h * dpr); }
  const g = mmCtx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, mm.width, mm.height);
  const sc = Math.min((w - 12) / (COLS * S), (h - 12) / (ROWS * S)) * dpr;
  const ox = (mm.width - COLS * S * sc) / 2, oy = (mm.height - ROWS * S * sc) / 2;
  g.globalAlpha = 0.9;
  g.imageSmoothingEnabled = false;
  g.drawImage(minimapStatic, ox, oy, COLS * S * sc, ROWS * S * sc);
  g.globalAlpha = 1;
  const dot = (x, z, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(ox + x * sc, oy + z * sc, r * dpr, 0, 7); g.fill(); };
  for (const p of pickups) if (!p.taken && p.type === 'key') dot(p.pos.x, p.pos.z, 3.2, '#ffd34d');
  if (exitDoor) dot(exitDoor.pos.x, exitDoor.pos.z, 3.5, state.exitOpen ? '#7dff6b' : '#aaaaaa');
  for (const z of zombies) if (z.state !== 'cured' && z.pos.distanceTo(state.pos) < 22) dot(z.pos.x, z.pos.z, 2.6, '#ff6b6b');
  // jugador como flecha
  g.save();
  g.translate(ox + state.pos.x * sc, oy + state.pos.z * sc);
  g.rotate(-state.yaw);
  g.fillStyle = '#3fbf6a'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * dpr;
  g.beginPath(); g.moveTo(0, -6 * dpr); g.lineTo(4.5 * dpr, 5 * dpr); g.lineTo(-4.5 * dpr, 5 * dpr); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

/* =====================================================================
   ENTRADA: teclado, ratón (Pointer Lock) y táctil
   ===================================================================== */
const keys = {};
const input = { f: 0, s: 0, run: false, firing: false };
const touch = { joyId: null, joyX: 0, joyY: 0, lookId: null, lookX: 0, lookY: 0, f: 0, s: 0 };

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'Space' && state.mode === 'playing') { input.firing = true; e.preventDefault(); }
  if ((e.code === 'KeyP') && state.mode === 'playing') pauseGame();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'Space') input.firing = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; input.firing = false; if (state.mode === 'playing') pauseGame(); });

const LOOK_SENS = 0.0024;
document.addEventListener('mousemove', (e) => {
  if (state.mode !== 'playing' || document.pointerLockElement !== canvas) return;
  state.yaw -= e.movementX * LOOK_SENS;
  state.pitch = clamp(state.pitch - e.movementY * LOOK_SENS, -0.5, 0.45);
});
canvas.addEventListener('mousedown', (e) => {
  if (isTouch || state.mode !== 'playing') return;
  if (document.pointerLockElement !== canvas) { canvas.requestPointerLock?.(); return; }
  if (e.button === 0) input.firing = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 0 && !isTouch) input.firing = false; });
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && state.mode === 'playing' && !isTouch) pauseGame();
});

// Táctil
const touchLayer = $('touch'), joyBase = $('joyBase'), joyKnob = $('joyKnob'), fireBtn = $('fireBtn');
touchLayer.addEventListener('pointerdown', (e) => {
  if (e.target === fireBtn || fireBtn.contains(e.target)) return;
  e.preventDefault();
  if (e.clientX < window.innerWidth * 0.45 && touch.joyId === null) {
    touch.joyId = e.pointerId; touch.joyX = e.clientX; touch.joyY = e.clientY;
    joyBase.classList.add('free');
    joyBase.style.left = e.clientX + 'px'; joyBase.style.top = e.clientY + 'px';
  } else if (touch.lookId === null) {
    touch.lookId = e.pointerId; touch.lookX = e.clientX; touch.lookY = e.clientY;
  }
  touchLayer.setPointerCapture?.(e.pointerId);
});
touchLayer.addEventListener('pointermove', (e) => {
  if (e.pointerId === touch.joyId) {
    let dx = e.clientX - touch.joyX, dy = e.clientY - touch.joyY;
    const len = Math.hypot(dx, dy), max = 55;
    if (len > max) { dx *= max / len; dy *= max / len; }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    touch.s = dx / max; touch.f = -dy / max;
  } else if (e.pointerId === touch.lookId) {
    state.yaw -= (e.clientX - touch.lookX) * 0.0065;
    state.pitch = clamp(state.pitch - (e.clientY - touch.lookY) * 0.005, -0.5, 0.45);
    touch.lookX = e.clientX; touch.lookY = e.clientY;
  }
});
const endTouch = (e) => {
  if (e.pointerId === touch.joyId) {
    touch.joyId = null; touch.f = touch.s = 0;
    joyKnob.style.transform = ''; joyBase.classList.remove('free'); joyBase.style.left = ''; joyBase.style.top = '';
  }
  if (e.pointerId === touch.lookId) touch.lookId = null;
};
touchLayer.addEventListener('pointerup', endTouch);
touchLayer.addEventListener('pointercancel', endTouch);
fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); input.firing = true; fireBtn.classList.add('on'); Sound.init(); });
const fireUp = () => { input.firing = false; fireBtn.classList.remove('on'); };
fireBtn.addEventListener('pointerup', fireUp);
fireBtn.addEventListener('pointercancel', fireUp);
fireBtn.addEventListener('pointerleave', fireUp);

function readInput() {
  let f = 0, s = 0;
  if (keys.KeyW || keys.ArrowUp) f += 1;
  if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyD || keys.ArrowRight) s += 1;
  if (keys.KeyA || keys.ArrowLeft) s -= 1;
  f += touch.f; s += touch.s;
  const len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  input.f = f; input.s = s;
  input.run = keys.ShiftLeft || keys.ShiftRight || Math.hypot(touch.f, touch.s) > 0.92;
}

/* =====================================================================
   LÓGICA
   ===================================================================== */
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), flatFwd = new THREE.Vector3();
const camDir = new THREE.Vector3(), aimTarget = new THREE.Vector3(), tipPos = new THREE.Vector3();
let aimZombie = null;

function computeAim() {
  camera.getWorldDirection(camDir);
  const o = camera.position;
  // distancia a pared (marcha sobre la cuadrícula)
  let tWall = 60;
  for (let t = 0.5; t < 60; t += 0.2) {
    const x = o.x + camDir.x * t, y = o.y + camDir.y * t, z = o.z + camDir.z * t;
    if (y < 0 || y > WALL_H || solidAt(x, z)) { tWall = t; break; }
  }
  const minT = o.distanceTo(state.pos) * 0.8;
  let best = tWall, bestZ = null;
  for (const z of zombies) {
    if (z.state === 'cured') continue;
    const c = tmpV.set(z.pos.x, 1.25, z.pos.z).sub(o);
    const tc = c.dot(camDir);
    if (tc < minT || tc > best) continue;
    const d2 = c.lengthSq() - tc * tc;
    const assist = 0.85 + tc * 0.035; // ayuda de puntería para niños
    if (d2 < assist * assist) { best = tc; bestZ = z; }
  }
  aimZombie = bestZ;
  if (bestZ) aimTarget.set(bestZ.pos.x, 1.25, bestZ.pos.z);
  else aimTarget.copy(o).addScaledVector(camDir, best);
  $('crosshair').classList.toggle('on', !!bestZ);
}

function shoot() {
  if (state.ammo <= 0) { Sound.empty(); showMsg('🫧 ¡Sin burbujas! Busca botellas de jabón', 1.6); state.fireCd = 0.35; return; }
  state.ammo--; state.fireCd = 0.2; state.recoil = 1;
  player.tip.getWorldPosition(tipPos);
  const dir = aimTarget.clone().sub(tipPos).normalize();
  const m = new THREE.Group();
  part(sphereGeo, bubbleMat, 0, 0, 0, 0.2, 0.2, 0.2, m);
  part(sphereGeo, highlightMat, -0.07, 0.08, 0.06, 0.045, 0.045, 0.045, m);
  m.position.copy(tipPos);
  dynamicRoot.add(m);
  bubbles.push({ mesh: m, vel: dir.multiplyScalar(24), life: 1.6 });
  Sound.shoot();
  const ch = $('crosshair'); ch.classList.add('kick'); setTimeout(() => ch.classList.remove('kick'), 90);
}

function cureZombie(z) {
  z.state = 'cured'; z.cureT = 0;
  const m = z.mats;
  m.skin.color.setHex(pick(CURED_SKIN));
  m.shirt.color.setHex(pick(CURED_SHIRT));
  m.hair.color.setHex(pick(CURED_HAIR));
  m.pants.color.setHex(0x3b6fd1);
  m.mouth.color.setHex(0xd94a6a);
  z.mouth.scale.set(0.26, 0.08, 0.04);
  z.tooth.visible = false; z.bandage.visible = false;
  z.eyeL.scale.set(0.1, 0.11, 0.07); z.eyeR.scale.set(0.1, 0.11, 0.07);
  z.stuck.clear();
  const c = z.pos.clone().setY(1.6);
  spawnConfetti(c, 40, 6); spawnBubbles(c, 14, 0.15);
  state.cured++; state.score += 10;
  popupAt(c.setY(2.6), '¡Curado! +10', 'gold');
  setTimeout(() => popupAt(z.pos.clone().setY(2.3), pick(['¡Gracias!', '¡Qué alivio!', '¡Soy yo otra vez!', '¡Yupi!']), 'green'), 500);
  Sound.cure();
  if (state.cured === state.totalZombies) showMsg('🌟 ¡Curaste a todos los vecinos!', 2.5);
}

function hurtPlayer(from) {
  if (state.invuln > 0) return;
  state.hp--; state.invuln = 1.6; state.shake = 0.35;
  const away = state.pos.clone().sub(from.pos).setY(0).normalize().multiplyScalar(9);
  state.knock.copy(away);
  from.stun = 1.3;
  Sound.hurt();
  $('damage').classList.add('hit'); setTimeout(() => $('damage').classList.remove('hit'), 120);
  showMsg(state.hp > 0 ? pick(['¡Abrazo pegajoso! 💚', '¡Puaj, baba de zombi!', '¡Cuidado!']) : '', 1.2);
  if (state.hp <= 0) setTimeout(() => endGame(false), 600);
}

function update(dt) {
  state.time += dt;
  readInput();

  // --- jugador ---
  fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  flatFwd.copy(fwd);
  right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  const speed = input.run ? 6.8 : 4.4;
  const move = new THREE.Vector3().addScaledVector(flatFwd, input.f).addScaledVector(right, input.s);
  const amt = move.length();
  state.pos.addScaledVector(move, speed * dt);
  state.pos.addScaledVector(state.knock, dt);
  state.knock.multiplyScalar(Math.max(0, 1 - 7 * dt));
  collide(state.pos, 0.45);
  state.moving = lerp(state.moving, amt, Math.min(1, dt * 10));
  state.walkT += dt * (input.run ? 13 : 9) * (amt > 0.05 ? 1 : 0);

  player.group.position.copy(state.pos);
  player.group.rotation.y = state.yaw;
  const sw = Math.sin(state.walkT) * 0.7 * state.moving;
  player.legL.rotation.x = sw; player.legR.rotation.x = -sw;
  player.body.position.y = Math.abs(Math.cos(state.walkT)) * 0.06 * state.moving;
  state.recoil = Math.max(0, state.recoil - dt * 8);
  player.gun.position.z = -0.62 + state.recoil * 0.12;
  player.armR.rotation.x = Math.PI / 2.1 - state.pitch * 0.6;
  player.gun.rotation.x = state.pitch * 0.6;
  state.invuln = Math.max(0, state.invuln - dt);
  player.group.visible = !state.camClose && (state.invuln <= 0 || Math.floor(state.invuln * 12) % 2 === 0);

  playerLight.position.set(state.pos.x, 3.2, state.pos.z);

  // --- disparo ---
  state.fireCd -= dt;
  if (input.firing && state.fireCd <= 0) shoot();

  // --- burbujas ---
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.life -= dt;
    b.mesh.position.addScaledVector(b.vel, dt);
    b.mesh.rotation.y += dt * 4;
    const p = b.mesh.position;
    let popped = b.life <= 0 || solidAt(p.x, p.z) || p.y < 0.05 || p.y > WALL_H;
    if (!popped) {
      for (const z of zombies) {
        if (z.state === 'cured') continue;
        const dx = p.x - z.pos.x, dz = p.z - z.pos.z;
        if (dx * dx + dz * dz < 0.7 * 0.7 && p.y < 2.4) {
          z.hp--; z.wobble = 0.4; state.score += 1;
          z.pos.addScaledVector(b.vel.clone().setY(0).normalize(), 0.35);
          collide(z.pos, 0.45);
          if (z.state !== 'chase') { z.state = 'chase'; z.lastSeen = state.pos.clone(); }
          // burbuja pegada al zombi
          const s = new THREE.Mesh(sphereGeo, bubbleMat);
          s.scale.setScalar(rand(0.12, 0.22));
          s.position.set(rand(-0.4, 0.4), rand(0.9, 2.1), rand(-0.4, 0.3));
          z.stuck.add(s);
          Sound.hit();
          spawnBubbles(p, 5, 0.08);
          if (z.hp <= 0) cureZombie(z);
          popped = true; break;
        }
      }
    }
    if (popped) {
      if (b.life > 0) { spawnBubbles(p, 4, 0.07); Sound.pop(); }
      dynamicRoot.remove(b.mesh); bubbles.splice(i, 1);
    }
  }

  // --- zombis ---
  for (const z of zombies) {
    z.t += dt;
    if (z.state === 'cured') {
      z.cureT += dt;
      z.body.position.y = Math.abs(Math.sin(z.cureT * 7)) * 0.35 * Math.max(0, 1 - z.cureT / 2.5);
      z.armL.rotation.x = lerp(z.armL.rotation.x, 0, dt * 6);
      z.armR.rotation.x = lerp(z.armR.rotation.x, 0, dt * 6);
      z.armR.rotation.z = lerp(z.armR.rotation.z, 2.6 + Math.sin(z.cureT * 10) * 0.35, dt * 6);
      z.armL.rotation.z = lerp(z.armL.rotation.z, -0.3, dt * 6);
      z.legL.rotation.x = z.legR.rotation.x = 0;
      // mira al jugador y luego se despide desvaneciéndose
      const toP = state.pos.clone().sub(z.pos);
      z.group.rotation.y = lerp(z.group.rotation.y, Math.atan2(-toP.x, -toP.z), dt * 3);
      if (z.cureT > 3.2) {
        const s = Math.max(0, 1 - (z.cureT - 3.2) / 0.5);
        z.group.scale.setScalar(s);
        if (s <= 0 && z.group.parent) { spawnConfetti(z.pos.clone().setY(1), 12, 3); dynamicRoot.remove(z.group); }
      }
      continue;
    }
    z.stun = Math.max(0, z.stun - dt);
    z.wobble = Math.max(0, z.wobble - dt);
    const toPlayer = tmpV.copy(state.pos).sub(z.pos); toPlayer.y = 0;
    const dist = toPlayer.length();
    const sees = dist < 14 && lineOfSight(z.pos, state.pos);
    if (sees) { z.state = 'chase'; z.lastSeen = state.pos.clone(); }
    let target = null;
    if (z.state === 'chase') {
      target = sees ? state.pos : z.lastSeen;
      if (!sees && (!z.lastSeen || z.pos.distanceTo(z.lastSeen) < 0.8)) { z.state = 'wander'; target = null; }
    }
    let moveSpeed = 0;
    if (target) {
      z.dir.copy(target).sub(z.pos).setY(0).normalize();
      moveSpeed = z.speed;
    } else {
      z.wanderT -= dt;
      if (z.wanderT <= 0) {
        z.wanderT = rand(2, 4.5);
        const a = rand(0, Math.PI * 2);
        z.dir.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(Math.random() < 0.3 ? 0 : 1);
      }
      moveSpeed = z.speed * 0.45;
    }
    if (z.stun > 0 || z.wobble > 0) moveSpeed *= 0.15;
    const before = z.pos.clone();
    z.pos.addScaledVector(z.dir, moveSpeed * dt);
    collide(z.pos, 0.45);
    if (!target && z.pos.distanceTo(before) < moveSpeed * dt * 0.3) z.wanderT = 0; // chocó: nueva dirección
    if (z.dir.lengthSq() > 0.01 && moveSpeed > 0.05) {
      const ang = Math.atan2(-z.dir.x, -z.dir.z);
      let d = ang - z.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      z.group.rotation.y += d * Math.min(1, dt * 6);
    }
    // animación: caminar tambaleándose
    const k = moveSpeed > 0.05 ? 1 : 0.2;
    z.legL.rotation.x = Math.sin(z.t * 6) * 0.45 * k;
    z.legR.rotation.x = -Math.sin(z.t * 6) * 0.45 * k;
    z.body.rotation.z = Math.sin(z.t * 3) * 0.08 + (z.wobble > 0 ? Math.sin(z.t * 40) * 0.15 : 0);
    z.armL.rotation.x = Math.PI / 2 + Math.sin(z.t * 4) * 0.15;
    z.armR.rotation.x = Math.PI / 2 + Math.cos(z.t * 4) * 0.15;
    z.head.rotation.z = Math.sin(z.t * 2.3) * 0.15;
    z.stuck.children.forEach((s, i) => { s.position.y += Math.sin(z.t * 3 + i) * 0.002; });
    // tocar al jugador
    if (dist < 1.05 && z.stun <= 0) hurtPlayer(z);
  }
  // separación entre zombis
  for (let i = 0; i < zombies.length; i++) for (let j = i + 1; j < zombies.length; j++) {
    const a = zombies[i], b = zombies[j];
    if (a.state === 'cured' || b.state === 'cured') continue;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.95 && d > 0.001) { const push = (0.95 - d) / 2; a.pos.x -= dx / d * push; a.pos.z -= dz / d * push; b.pos.x += dx / d * push; b.pos.z += dz / d * push; }
  }

  // --- objetos ---
  for (const p of pickups) {
    if (p.taken) continue;
    p.t += dt;
    p.mesh.rotation.y += dt * 2;
    p.mesh.position.y = 1.1 + Math.sin(p.t * 3) * 0.15;
    if (p.pos.distanceTo(state.pos) < 1.3) {
      if (p.type === 'cookie' && state.hp >= PLAYER_MAX_HP) { if (state.lockedMsgCd <= 0) { showMsg('🍪 Ya tienes toda la vida', 1.2); state.lockedMsgCd = 2; } continue; }
      if (p.type === 'ammo' && state.ammo >= AMMO_MAX) continue;
      p.taken = true; dynamicRoot.remove(p.mesh);
      const at = p.pos.clone().setY(1.8);
      if (p.type === 'key') {
        state.keys++; state.score += 50;
        exitDoor.slots[state.keys - 1].material.color.setHex(0xffcc33);
        Sound.key(); spawnConfetti(at, 25, 5);
        popupAt(at, `¡Llave dorada! ${state.keys}/${KEYS_NEEDED}`, 'gold');
        if (state.keys >= KEYS_NEEDED) openExit();
      } else if (p.type === 'cookie') {
        state.hp = Math.min(PLAYER_MAX_HP, state.hp + 2); state.score += 5;
        Sound.pickup(); popupAt(at, '🍪 +2 ❤️', 'green');
      } else {
        state.ammo = Math.min(AMMO_MAX, state.ammo + 25); state.score += 5;
        Sound.pickup(); popupAt(at, '🫧 +25 burbujas', 'green');
      }
    }
  }
  state.lockedMsgCd -= dt;

  // --- puerta de salida ---
  if (exitDoor) {
    const d = exitDoor.pos.distanceTo(state.pos);
    if (state.exitOpen) {
      exitDoor.hinge.rotation.y = lerp(exitDoor.hinge.rotation.y, -1.9, dt * 2.5);
      exitDoor.portalMat.color.setHSL((state.time * 0.15) % 1, 0.8, 0.65);
      exitDoor.glow.material.opacity = 0.7 + Math.sin(state.time * 4) * 0.3;
      if (Math.random() < dt * 8) spawnConfetti(exitDoor.pos.clone().setY(rand(0.5, 2.8)), 1, 1.5);
      if (d < 1.3) endGame(true);
    } else if (d < 2.2 && state.lockedMsgCd <= 0) {
      showMsg(`🔒 Necesitas ${KEYS_NEEDED - state.keys} llave(s) más`, 1.6); state.lockedMsgCd = 2.5;
    }
    if (!state.exitOpen) collideDoor();
  }

  updateParticles(dt);
  updateCamera(dt);
  computeAim();
  updateHUD();
  drawMinimap();
  if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $('msg').classList.remove('show'); }
}

function collideDoor() {
  // la puerta cerrada es sólida (caja delgada)
  const p = state.pos, c = exitDoor.pos;
  const hw = 1.1, hd = 0.2, rad = 0.45;
  const cx = clamp(p.x, c.x - hw, c.x + hw), cz = clamp(p.z, c.z - hd, c.z + hd);
  const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
  if (d2 < rad * rad && d2 > 1e-9) { const d = Math.sqrt(d2); p.x += dx / d * (rad - d); p.z += dz / d * (rad - d); }
}

function openExit() {
  state.exitOpen = true;
  exitDoor.glow.visible = true; exitDoor.lock.visible = false;
  Sound.open();
  showMsg('🚪✨ ¡La puerta mágica se abrió!', 2.6);
}

const camPos = new THREE.Vector3(), pivot = new THREE.Vector3(), head = new THREE.Vector3(), desired = new THREE.Vector3();
let camInit = false;
function updateCamera(dt) {
  const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
  const look = new THREE.Vector3(-Math.sin(state.yaw) * cp, sp, -Math.cos(state.yaw) * cp);
  right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  head.set(state.pos.x, 1.75, state.pos.z);
  pivot.copy(head).addScaledVector(right, 1.0);
  const dist = 4.1;
  desired.copy(pivot).addScaledVector(look, -dist); desired.y += 0.6;
  // colisión de cámara con paredes
  const ray = desired.clone().sub(head);
  const len = ray.length(); ray.normalize();
  let free = len;
  for (let t = 0.1; t <= len; t += 0.08) {
    const x = head.x + ray.x * t, z = head.z + ray.z * t, m = 0.28;
    if (solidAt(x + m, z) || solidAt(x - m, z) || solidAt(x, z + m) || solidAt(x, z - m)) { free = Math.max(0.3, t - 0.12); break; }
  }
  desired.copy(head).addScaledVector(ray, free);
  state.camClose = free < 1.7; // cámara pegada a la pared: ocultamos al héroe para ver
  desired.y = clamp(desired.y, 0.4, WALL_H - 0.3);
  if (!camInit) { camPos.copy(desired); camInit = true; }
  camPos.lerp(desired, free < len ? 1 : Math.min(1, dt * 14));
  camera.position.copy(camPos);
  if (state.shake > 0) {
    state.shake -= dt;
    camera.position.x += rand(-1, 1) * state.shake * 0.4;
    camera.position.y += rand(-1, 1) * state.shake * 0.4;
  }
  camera.lookAt(pivot.x + look.x * 12, pivot.y + look.y * 12, pivot.z + look.z * 12);
}

/* =====================================================================
   FLUJO DE PANTALLAS
   ===================================================================== */
const screens = ['startScreen', 'pauseScreen', 'winScreen', 'loseScreen'];
function showScreen(id) { screens.forEach((s) => { $(s).hidden = s !== id; }); }

function startPlaying() {
  Sound.init(); Sound.startMusic();
  showScreen(null);
  $('hud').hidden = false;
  $('touch').hidden = !isTouch;
  state.mode = 'playing';
  if (!isTouch) canvas.requestPointerLock?.();
  last = performance.now();
}
function pauseGame() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused'; input.firing = false;
  Sound.stopMusic();
  showScreen('pauseScreen');
}
function endGame(won) {
  if (state.mode !== 'playing') return;
  state.mode = won ? 'won' : 'lost';
  input.firing = false;
  Sound.stopMusic();
  if (document.pointerLockElement) document.exitPointerLock();
  if (won) {
    const bonus = state.hp * 20 + state.cured * 5;
    state.score += bonus;
    Sound.win();
    const pct = state.cured / Math.max(1, state.totalZombies);
    const stars = 1 + (pct >= 0.5 ? 1 : 0) + (pct >= 1 || (pct >= 0.75 && state.hp >= 3) ? 1 : 0);
    $('winStars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? '' : 'off'}">⭐</span>`).join('');
    $('winText').innerHTML = `Curaste a <b>${state.cured} de ${state.totalZombies}</b> vecinos.<br>Bonus: +${bonus} · Puntos: <b>${state.score.toLocaleString('es-MX')}</b>`;
    const best = Math.max(+localStorage.getItem('zr-best') || 0, state.score);
    localStorage.setItem('zr-best', best);
    setTimeout(() => showScreen('winScreen'), 700);
  } else {
    Sound.lose();
    $('loseText').innerHTML = `Curaste a ${state.cured} vecinos y llevas ${state.keys} llave(s).<br>¡Un héroe nunca se rinde!`;
    showScreen('loseScreen');
  }
}

$('playBtn').addEventListener('click', () => { resetLevel(); startPlaying(); });
$('resumeBtn').addEventListener('click', startPlaying);
$('restartBtn').addEventListener('click', () => { state.score = state.levelStartScore; resetLevel(); startPlaying(); });
$('nextBtn').addEventListener('click', () => { state.level++; resetLevel(); startPlaying(); });
$('retryBtn').addEventListener('click', () => { state.score = state.levelStartScore; resetLevel(); startPlaying(); });
$('pauseBtn').addEventListener('click', pauseGame);
function toggleMute() {
  Sound.setMuted(!Sound.muted);
  $('muteBtn').textContent = Sound.muted ? '🔇' : '🔊';
}
$('muteBtn').addEventListener('click', toggleMute);
$('muteBtn').textContent = Sound.muted ? '🔇' : '🔊';
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

/* =====================================================================
   BUCLE PRINCIPAL
   ===================================================================== */
let last = performance.now();
let attractT = 0;
resetLevel();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.mode === 'playing') update(dt);
  else {
    // cámara de presentación girando en el menú
    attractT += dt;
    if (state.mode === 'start') {
      state.yaw = Math.PI + Math.sin(attractT * 0.3) * 0.5;
      updateCamera(dt);
    }
    updateParticles(dt);
    for (const p of pickups) if (!p.taken) { p.t += dt; p.mesh.rotation.y += dt * 2; }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Para pruebas automáticas
window.__zr = { state, zombies: () => zombies, pickups: () => pickups };
