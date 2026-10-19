// ===== Finale, Rätsel 1: Napoleons Feldlager =====
// Eigene 3D-Szene (wird erst beim Betreten des Finales geladen). Bewegung wie bei Street View:
// Pfeile am Boden antippen = einen Schritt gehen, wischen = umschauen. Von der Mitte gehen 5 Wege ab, je 4 Schritte.
// Am Ende eines Weges: die Figur "Hilf unserem Papa" und links daneben der Waffenschrank.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
import { WEAPONS } from './draft.js?v=20261019b';

const STEP = 4.5;            // Abstand der Wegpunkte (m)
const STEPS = 4;             // Schritte pro Weg
const PATHS = 5;
const PUZZLE_PATH = 2;       // auf diesem Weg steht am Ende die Figur mit dem Waffenschrank
const EYE = 1.65;
const MODEL_URL = 'riddle/papa.glb';   // eigene 3D-Figur (optional), sonst Platzhalter

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function textSprite(text, { size = 64, color = '#fff', bg = 'rgba(20,12,4,.78)', w = 1024, h = 160, scale = 3 } = {}) {
  const tex = canvasTex(w, h, (g) => {
    g.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
    const tw = Math.min(w - 20, g.measureText(text).width + 60);
    g.fillStyle = bg; g.beginPath(); g.roundRect((w - tw) / 2, 10, tw, h - 20, 24); g.fill();
    g.strokeStyle = 'rgba(212,175,55,.9)'; g.lineWidth = 4; g.stroke();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2, w - 60);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  sp.scale.set(scale, scale * h / w, 1);
  return sp;
}

// ---------- Wegpunkte ----------
const pathAngle = k => k / PATHS * Math.PI * 2;             // Weg 0 zeigt nach +z (Startblick)
const dirOf = k => new THREE.Vector3(Math.sin(pathAngle(k)), 0, Math.cos(pathAngle(k)));
const nodePos = (k, s) => dirOf(k).multiplyScalar(s * STEP);
const nodeId = (k, s) => s === 0 ? 'c' : `${k}:${s}`;
// Rätselweg: Figur geradeaus am Ende, Waffenschrank links davon; "cab" = Standpunkt direkt vor dem Schrank
const PD = dirOf(PUZZLE_PATH), PSIDE = new THREE.Vector3(PD.z, 0, -PD.x);    // PSIDE = links in Blickrichtung
const END_ID = `${PUZZLE_PATH}:${STEPS}`;
const END = nodePos(PUZZLE_PATH, STEPS);
const FIG_POS = END.clone().add(PD.clone().multiplyScalar(6));
const CAB_POS = END.clone().add(PD.clone().multiplyScalar(5.6)).add(PSIDE.clone().multiplyScalar(2.6));
const CAB_VIEW = CAB_POS.clone().add(END.clone().sub(CAB_POS).normalize().multiplyScalar(2.7));
function neighbors(id) {
  if (id === 'c') return Array.from({ length: PATHS }, (_, k) => ({ id: nodeId(k, 1), k, s: 1 }));
  if (id === 'cab') return [{ id: END_ID }];
  const [k, s] = id.split(':').map(Number);
  const res = [{ id: nodeId(k, s - 1), k, s: s - 1 }];
  if (s < STEPS) res.push({ id: nodeId(k, s + 1), k, s: s + 1 });
  if (id === END_ID) res.push({ id: 'cab' });
  return res;
}
const posOf = id => id === 'c' ? new THREE.Vector3() : id === 'cab' ? CAB_VIEW.clone() : nodePos(...id.split(':').map(Number));

// ---------- Bausteine ----------
const M = {
  canvas: lam(0xf1ead8), canvasDark: lam(0xd8ccb0), pole: lam(0x6b4423), wood: lam(0x8b5a2b), woodDark: lam(0x5a3a1c),
  steel: lam(0xb8c2cc), iron: lam(0x2b2b2b), black: lam(0x111111), skin: lam(0xf0c4a0), blue: lam(0x1e3a8a),
  white: lam(0xf5f5f0), red: lam(0xb91c1c), gold: lam(0xd4af37), green: lam(0x3f5f2a), hay: lam(0xd8b25a), dirt: lam(0x7a5c3a)
};
const stripeTex = canvasTex(64, 64, (g, w, h) => {
  g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1e3a8a'; g.fillRect(0, 0, w, 6); g.fillStyle = '#b91c1c'; g.fillRect(0, h - 6, w, 6);
});

// Satteldach-Zelt (Mannschaft)
function tent(colorMat = M.canvas) {
  const g = new THREE.Group();
  const shape = new THREE.Shape(); shape.moveTo(-1.3, 0); shape.lineTo(0, 1.9); shape.lineTo(1.3, 0); shape.lineTo(-1.3, 0);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: false }), colorMat);
  body.position.z = -1.3; g.add(body);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), M.black); door.position.set(0, 0.6, 1.31); g.add(door);
  for (const z of [-1.4, 1.4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 5), M.pole); p.position.set(0, 1.05, z); g.add(p); }
  return g;
}
// Rundzelt (Offiziere) mit gestreiftem Rand
function bellTent() {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.3, 14, 1, true), new THREE.MeshLambertMaterial({ map: stripeTex, side: THREE.DoubleSide }));
  wall.position.y = 0.65; g.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.8, 14), M.canvas); roof.position.y = 2.2; g.add(roof);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 5), M.pole); pole.position.y = 3.4; g.add(pole);
  const pen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshLambertMaterial({ color: 0xb91c1c, side: THREE.DoubleSide })); pen.position.set(0.25, 3.65, 0); g.add(pen);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), M.black); door.position.set(0, 0.6, 1.81); g.add(door);
  return g;
}
function barrel() { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.85, 10), M.wood); b.position.y = 0.42; return b; }
function crate() { const c = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), M.woodDark); c.position.y = 0.3; return c; }
function cannon() {
  const g = new THREE.Group();
  const barrelM = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 2.0, 10), M.iron); barrelM.rotation.x = Math.PI / 2 - 0.15; barrelM.position.set(0, 0.75, 0.2); g.add(barrelM);
  for (const x of [-0.45, 0.45]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 6, 14), M.woodDark); w.rotation.y = Math.PI / 2; w.position.set(x, 0.45, 0); g.add(w); }
  const trail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 1.6), M.wood); trail.position.set(0, 0.3, -0.7); trail.rotation.x = 0.2; g.add(trail);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), M.iron); b.position.set(0.9 + (i % 2) * 0.22, 0.11 + (i > 1 ? 0.18 : 0), -0.4 + (i % 2) * 0.1); g.add(b); }
  return g;
}
function musketStack() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.6, 5), M.woodDark);
    m.position.set(Math.cos(a) * 0.25, 0.75, Math.sin(a) * 0.25); m.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); g.add(m);
  }
  return g;
}
function campfire(updaters) {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) { const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16), lam(0x6b7280)); const a = i / 8 * Math.PI * 2; st.position.set(Math.cos(a) * 0.6, 0.08, Math.sin(a) * 0.6); g.add(st); }
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), M.woodDark); l.rotation.z = Math.PI / 2; l.rotation.y = i; l.position.y = 0.1; g.add(l); }
  const flames = [0xff7a1a, 0xffb020, 0xff4010].map((c, i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.28 - i * 0.06, 0.8 - i * 0.15, 7), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 }));
    f.position.y = 0.45; g.add(f); return f;
  });
  const light = new THREE.PointLight(0xff9a40, 2.2, 16, 1.6); light.position.y = 1.0; g.add(light);
  updaters.push((dt, t) => {
    flames.forEach((f, i) => { f.scale.set(1 + Math.sin(t * 9 + i) * 0.12, 1 + Math.sin(t * 13 + i * 2) * 0.2, 1 + Math.cos(t * 8 + i) * 0.12); f.rotation.y = t * (1 + i); });
    light.intensity = 2 + Math.sin(t * 17) * 0.25 + Math.sin(t * 7.3) * 0.2;
  });
  return g;
}
function flagpole(updaters, h = 6) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, h, 6), M.pole); pole.position.y = h / 2; g.add(pole);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.gold); ball.position.y = h + 0.08; g.add(ball);
  const tex = canvasTex(96, 64, (c, w, hh) => { ['#1e3a8a', '#f8fafc', '#dc2626'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * w / 3, 0, w / 3, hh); }); });
  const geo = new THREE.PlaneGeometry(1.8, 1.2, 12, 1);
  const flag = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  flag.position.set(0.92, h - 0.65, 0); g.add(flag);
  const base = geo.attributes.position.array.slice();
  updaters.push((dt, t) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) { const x = base[i] + 0.9; a[i + 2] = Math.sin(x * 3 - t * 4) * 0.12 * x; }
    geo.attributes.position.needsUpdate = true;
  });
  return g;
}
// Soldat mit Zweispitz, leicht animiert (atmen, umschauen, ab und zu den Arm heben)
function soldier(updaters, R, opts = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const coat = opts.coat ?? M.blue;
  for (const x of [-0.11, 0.11]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.82, 0.16), M.white); leg.position.set(x, 0.41, 0); body.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.4, 0.22), M.black); boot.position.set(x, 0.2, 0.02); body.add(boot);
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.28), coat); torso.position.y = 1.12; body.add(torso);
  const tails = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.06), coat); tails.position.set(0, 0.72, -0.13); body.add(tails);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.02), M.white); vest.position.set(0, 1.12, 0.145); body.add(vest);
  for (const s of [-1, 1]) { const belt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.02), M.white); belt.position.set(0, 1.12, 0.15); belt.rotation.z = s * 0.6; body.add(belt); }
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.3), M.red); collar.position.y = 1.45; body.add(collar);
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.3, 1.38, 0); body.add(sh);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.6, 0.14), coat); arm.position.y = -0.3; sh.add(arm);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.15), M.red); cuff.position.y = -0.56; sh.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), M.skin); hand.position.y = -0.64; sh.add(hand);
    arms.push(sh);
  }
  const head = new THREE.Group(); head.position.y = 1.65; body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), M.skin));
  const eyeM = M.black;
  for (const x of [-0.05, 0.05]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), eyeM); e.position.set(x, 0.02, 0.14); head.add(e); }
  const mous = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), lam(0x3b2414)); mous.position.set(0, -0.05, 0.145); head.add(mous);
  // Zweispitz (Bicorne)
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 16, 1, false, 0, Math.PI), M.black);
  hat.rotation.set(Math.PI / 2, opts.sideways ? 0 : Math.PI / 2, 0); hat.scale.set(1, 1, 1.2);
  hat.position.y = 0.16; head.add(hat);
  const cock = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), new THREE.MeshBasicMaterial({ map: canvasTex(32, 32, (c) => { [['#1e3a8a', 16], ['#fff', 11], ['#dc2626', 6]].forEach(([col, r]) => { c.fillStyle = col; c.beginPath(); c.arc(16, 16, r, 0, 7); c.fill(); }); }) }));
  cock.position.set(0.12, 0.22, 0.04); head.add(cock);
  if (opts.musket) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.5, 5), M.woodDark); m.position.set(0, -0.3, 0.1); arms[1].add(m);
  }
  const ph = R() * 10, sp = 0.6 + R() * 0.6;
  updaters.push((dt, t) => {
    body.position.y = Math.sin(t * 1.6 + ph) * 0.012;
    head.rotation.y = Math.sin(t * 0.4 * sp + ph) * 0.6;
    arms[0].rotation.x = Math.max(0, Math.sin(t * 0.5 * sp + ph * 2)) ** 8 * -1.6;    // gelegentlich winken / zeigen
    arms[1].rotation.x = Math.sin(t * 1.2 + ph) * 0.05;
  });
  return g;
}

// ---------- Waffen (aus einfachen Formen) ----------
function weaponMesh(id) {
  const g = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat.clone()); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (r1, r2, h, s = 8) => new THREE.CylinderGeometry(r1, r2, h, s);
  switch (id) {
    case 'muskete': add(cyl(0.018, 0.022, 1.0), M.steel, 0, 0.25); add(box(0.07, 0.55, 0.05), M.wood, 0, -0.45, 0, 0, 0, 0.12); break;
    case 'bajonett': add(new THREE.ConeGeometry(0.03, 0.7, 3), M.steel, 0, 0.15); add(cyl(0.035, 0.035, 0.12), M.iron, 0, -0.27); break;
    case 'saebel': add(new THREE.TorusGeometry(0.9, 0.018, 4, 20, 0.9), M.steel, -0.8, -0.35, 0, 0, 0, 0.0); add(box(0.2, 0.03, 0.04), M.gold, 0.04, -0.33); add(box(0.05, 0.2, 0.05), M.woodDark, 0.04, -0.46); break;
    case 'degen': add(cyl(0.006, 0.014, 1.0, 4), M.steel, 0, 0.18); add(new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.gold, 0, -0.33, 0, Math.PI); add(cyl(0.025, 0.025, 0.2), M.black, 0, -0.45); break;
    case 'pistole': add(cyl(0.025, 0.03, 0.45), M.steel, 0, 0.08, 0, 0, 0, Math.PI / 2); add(box(0.08, 0.28, 0.06), M.wood, -0.2, -0.08, 0, 0, 0, 0.5); add(box(0.04, 0.06, 0.03), M.iron, -0.08, 0.13); break;
    case 'kanonenkugel': add(new THREE.SphereGeometry(0.17, 14, 10), M.iron, 0, 0); add(cyl(0.14, 0.17, 0.08), M.woodDark, 0, -0.2); break;
    case 'lanze': add(cyl(0.02, 0.025, 1.1), M.wood, 0, -0.05); add(new THREE.ConeGeometry(0.045, 0.2, 6), M.steel, 0, 0.6); add(new THREE.PlaneGeometry(0.18, 0.1), new THREE.MeshLambertMaterial({ color: 0xdc2626, side: THREE.DoubleSide }), 0.09, 0.42); break;
    case 'axt': add(cyl(0.025, 0.03, 0.8), M.wood, 0, -0.1); add(box(0.25, 0.18, 0.03), M.steel, 0.1, 0.25); break;
    case 'dolch': add(new THREE.ConeGeometry(0.035, 0.32, 4), M.steel, 0, 0.1); add(box(0.14, 0.025, 0.03), M.gold, 0, -0.07); add(cyl(0.02, 0.02, 0.12), M.woodDark, 0, -0.14); break;
    case 'armbrust': add(box(0.06, 0.6, 0.05), M.wood, 0, -0.1); add(new THREE.TorusGeometry(0.28, 0.018, 4, 16, Math.PI * 0.75), M.woodDark, 0, 0.0, 0, 0, 0, Math.PI * 0.125); add(box(0.5, 0.005, 0.005), M.white, 0, 0.1); break;
    case 'bogen': add(new THREE.TorusGeometry(0.5, 0.018, 4, 18, Math.PI * 0.8), M.woodDark, -0.25, 0, 0, 0, 0, -Math.PI * 0.4); add(cyl(0.003, 0.003, 0.95, 3), M.white, -0.06, 0); add(cyl(0.008, 0.008, 0.8, 4), M.wood, 0.05, 0, 0); break;
    case 'hellebarde': add(cyl(0.02, 0.025, 1.15), M.wood, 0, -0.05); add(box(0.2, 0.2, 0.02), M.steel, 0.1, 0.38); add(new THREE.ConeGeometry(0.03, 0.2, 4), M.steel, 0, 0.6); break;
    case 'revolver': add(cyl(0.02, 0.02, 0.3), M.iron, 0.05, 0.08, 0, 0, 0, Math.PI / 2); add(cyl(0.05, 0.05, 0.08, 8), M.iron, -0.08, 0.06, 0, Math.PI / 2); add(box(0.07, 0.2, 0.05), M.woodDark, -0.15, -0.07, 0, 0, 0, 0.35); break;
    case 'sturmgewehr': add(box(0.08, 0.5, 0.06), M.black, 0, 0.05); add(cyl(0.015, 0.015, 0.35), M.iron, 0, 0.45); add(box(0.06, 0.18, 0.05), M.black, 0.06, -0.05, 0, 0, 0, 0.3); add(box(0.07, 0.25, 0.05), M.black, -0.02, -0.33, 0, 0, 0, -0.15); break;
    case 'granate': add(new THREE.SphereGeometry(0.11, 10, 8), M.green, 0, 0).scale.set(1, 1.3, 1); add(cyl(0.03, 0.03, 0.06), M.iron, 0, 0.16); add(box(0.02, 0.15, 0.02), M.iron, 0.05, 0.08, 0, 0, 0, -0.3); break;
    case 'schlaeger': add(cyl(0.05, 0.018, 0.95, 10), lam(0xc8935a), 0, 0.02); break;
  }
  return g;
}

// ---------- Szene ----------
export function createCamp(container, { onWeapon, onLeave } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 400);
  const updaters = [];
  const R = rng(1805);   // Austerlitz

  // Himmel in der Abenddämmerung, Licht
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 20, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, map: canvasTex(8, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1b2a4a'); gr.addColorStop(0.55, '#7a5a7a'); gr.addColorStop(0.8, '#e08a4a'); gr.addColorStop(1, '#f2c27a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }) }));
  scene.add(sky);
  scene.background = new THREE.Color(0xd9a06a);
  scene.fog = new THREE.Fog(0xb88a6a, 25, 70);
  scene.add(new THREE.HemisphereLight(0xffe2c0, 0x4a3a2a, 1.3));
  const sun = new THREE.DirectionalLight(0xffc890, 1.3); sun.position.set(-30, 20, 10); scene.add(sun);

  // Boden: Wiese mit Erdwegen
  const ground = new THREE.Mesh(new THREE.CircleGeometry(120, 32), new THREE.MeshLambertMaterial({ map: (() => {
    const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5f6b34'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${60 + Math.random() * 60},${70 + Math.random() * 50},${30 + Math.random() * 20},.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 30); return t; })() }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(4.2, 24), M.dirt); plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.01; scene.add(plaza);
  for (let k = 0; k < PATHS; k++) {
    const len = STEP * STEPS + 3;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, len), M.dirt);
    p.rotation.x = -Math.PI / 2; p.rotation.z = -pathAngle(k) + Math.PI;
    const c = dirOf(k).multiplyScalar(len / 2); p.position.set(c.x, 0.012, c.z); scene.add(p);
  }

  // Mitte: Lagerfeuer und Fahnenmast
  scene.add(campfire(updaters));
  const fp = flagpole(updaters, 7); fp.position.set(2.6, 0, -2.2); scene.add(fp);

  // Entlang der Wege: Zelte, Soldaten, Kram (die Wege selbst bleiben frei)
  const place = (obj, pos, faceTo) => { obj.position.copy(pos); if (faceTo) obj.rotation.y = Math.atan2(faceTo.x - pos.x, faceTo.z - pos.z); scene.add(obj); return obj; };
  for (let k = 0; k < PATHS; k++) {
    const d = dirOf(k), side = new THREE.Vector3(d.z, 0, -d.x);
    for (let s = 1; s <= STEPS; s++) {
      const base = nodePos(k, s);
      for (const sgn of [-1, 1]) {
        if (k === PUZZLE_PATH && s === STEPS) continue;     // Platz für Figur und Waffenschrank
        const openPlaza = s === 1;                           // um das Lagerfeuer herum bleibt es offen (nur Kleinkram)
        const off = side.clone().multiplyScalar(sgn * (3.6 + R() * 0.8)).add(d.clone().multiplyScalar((R() - 0.5) * 1.5));
        const pos = base.clone().add(off);
        const facePos = base.clone();
        const r = R();
        if (!openPlaza) place(r < 0.25 ? bellTent() : tent(r < 0.6 ? M.canvas : M.canvasDark), pos, facePos);
        // Kleinkram und Leute zwischen Zelt und Weg
        const near = base.clone().add(side.clone().multiplyScalar(sgn * 1.9)).add(d.clone().multiplyScalar((R() - 0.5) * 2));
        const q = R();
        if (q < 0.3) place(soldier(updaters, R, { musket: R() < 0.5 }), near, base.clone().add(d.clone().multiplyScalar(-2)));
        else if (q < 0.45) place(barrel(), near);
        else if (q < 0.6) place(crate(), near);
        else if (q < 0.72) place(musketStack(), near);
        else if (q < 0.8) { const c = cannon(); place(c, near.clone().add(side.clone().multiplyScalar(sgn * 0.6)), near.clone().add(side.clone().multiplyScalar(sgn * 5))); }
      }
    }
    // am Wegende ein Abschluss (außer beim Rätselweg): Zelt quer
    if (k !== PUZZLE_PATH) place(bellTent(), nodePos(k, STEPS).add(d.clone().multiplyScalar(4.2)), nodePos(k, STEPS));
  }
  // ein paar Soldaten am Feuer
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; place(soldier(updaters, R, { musket: i === 1 }), new THREE.Vector3(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6), new THREE.Vector3()); }
  // Wald und Hügel ringsum
  const treeGeo = new THREE.ConeGeometry(1.4, 4.5, 7), trunkGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 5);
  const trees = new THREE.InstancedMesh(treeGeo, lam(0x2f4a2a), 90), trunks = new THREE.InstancedMesh(trunkGeo, M.woodDark, 90);
  const mm = new THREE.Matrix4();
  for (let i = 0; i < 90; i++) {
    const a = R() * Math.PI * 2, r = 30 + R() * 25, sc = 0.8 + R() * 0.8;
    mm.makeScale(sc, sc, sc).setPosition(Math.cos(a) * r, 2.25 * sc + 1.1 * sc, Math.sin(a) * r); trees.setMatrixAt(i, mm);
    mm.makeScale(sc, sc, sc).setPosition(Math.cos(a) * r, 0.6 * sc, Math.sin(a) * r); trunks.setMatrixAt(i, mm);
  }
  scene.add(trees, trunks);

  // ----- Rätselweg: Figur "Hilf unserem Papa" und Waffenschrank links daneben -----
  const endPos = END, figPos = FIG_POS;
  const figure = new THREE.Group(); place(figure, figPos, endPos);
  // Platzhalter, bis riddle/papa.glb hochgeladen ist
  const placeholder = soldier(updaters, R, { coat: lam(0x3b3b6b) }); placeholder.scale.setScalar(1.12); figure.add(placeholder);
  const sign = textSprite('Hilf unserem Papa', { size: 70, scale: 3.4 }); sign.position.set(0, 2.75, 0); figure.add(sign);
  updaters.push((dt, t) => { sign.position.y = 2.75 + Math.sin(t * 1.5) * 0.05; });
  import('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
    new GLTFLoader().load(MODEL_URL, gltf => {
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
      const sc = 1.85 / (size.y || 1); m.scale.setScalar(sc);
      const b2 = new THREE.Box3().setFromObject(m); m.position.y -= b2.min.y;
      m.position.x -= (b2.min.x + b2.max.x) / 2; m.position.z -= (b2.min.z + b2.max.z) / 2;
      figure.remove(placeholder); figure.add(m);
      if (gltf.animations?.length) {   // eigene Animation der Figur abspielen, falls vorhanden
        const mixer = new THREE.AnimationMixer(m); mixer.clipAction(gltf.animations[0]).play();
        updaters.push(dt => mixer.update(dt));
      }
    }, undefined, () => {});           // keine Datei: Platzhalter bleibt
  }).catch(() => {});

  // Waffenschrank
  const cab = new THREE.Group();
  const CW = 2.1, CH = 2.6, COLS = 4, ROWS = 4;
  const back = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, 0.12), lam(0x3a2414)); back.position.set(0, CH / 2 + 0.3, -0.2); cab.add(back);
  const frameM = lam(0x6b4423);
  for (const x of [-CW / 2, CW / 2]) { const sd = new THREE.Mesh(new THREE.BoxGeometry(0.12, CH + 0.1, 0.5), frameM); sd.position.set(x, CH / 2 + 0.3, 0); cab.add(sd); }
  for (const y of [0.3, 0.3 + CH / 2, 0.3 + CH]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.12, 0.08, 0.5), frameM); sh.position.set(0, y, 0); cab.add(sh); }
  const crown = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.3, 0.25, 0.6), frameM); crown.position.y = CH + 0.45; cab.add(crown);
  const cabSign = textSprite('Waffenkammer', { size: 60, scale: 1.8 }); cabSign.position.y = CH + 0.95; cab.add(cabSign);
  const weapons = {};
  const slotW = CW / COLS, slotH = CH / ROWS;
  WEAPONS.forEach((w, i) => {
    const col = i % COLS, row = Math.floor(i / COLS);
    const slot = new THREE.Group();
    slot.position.set(-CW / 2 + slotW * (col + 0.5), 0.3 + CH - slotH * (row + 0.5) + 0.06, 0);
    const mesh = weaponMesh(w.id);
    // auf Fachgröße bringen
    const bb = new THREE.Box3().setFromObject(mesh), sz = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
    const sc = Math.min((slotW * 0.82) / (sz.x || 1), (slotH * 0.7) / (sz.y || 1));
    mesh.scale.setScalar(sc); mesh.position.set(-ctr.x * sc, -ctr.y * sc + 0.05, 0);
    slot.add(mesh);
    // unsichtbare Trefferfläche zum Antippen
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(slotW * 0.95, slotH * 0.95), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.z = 0.1; hit.userData.weapon = w.id; slot.add(hit);
    const label = textSprite(w.name, { size: 58, scale: 0.5, w: 640, h: 120 }); label.position.set(0, -slotH / 2 + 0.08, 0.15); slot.add(label);
    cab.add(slot);
    const mats = []; mesh.traverse(o => { if (o.material) mats.push(o.material); });
    weapons[w.id] = { slot, mesh, hit, mats, wrong: false, phase: i * 0.7 };
  });
  place(cab, CAB_POS.clone(), CAB_VIEW.clone());
  updaters.push((dt, t) => {
    const near = cur === 'cab';
    for (const w of Object.values(weapons)) {
      const glow = w.wrong ? 0 : near ? 0.1 + Math.sin(t * 3 + w.phase) * 0.08 : 0.03;
      for (const m of w.mats) { m.emissive?.setRGB(glow, glow * 0.75, glow * 0.2); }
    }
  });

  // ----- Wegpfeile (wie Street View) -----
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.55); arrowShape.lineTo(0.45, 0); arrowShape.lineTo(0.22, 0); arrowShape.lineTo(0.22, -0.4);
  arrowShape.lineTo(-0.22, -0.4); arrowShape.lineTo(-0.22, 0); arrowShape.lineTo(-0.45, 0); arrowShape.lineTo(0, 0.55);
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, depthTest: false, side: THREE.DoubleSide });
  const arrows = new THREE.Group(); arrows.renderOrder = 20; scene.add(arrows);
  let cur = 'c', moving = null;
  function buildArrows() {
    arrows.clear();
    const here = posOf(cur);
    for (const n of neighbors(cur)) {
      const dir = posOf(n.id).sub(here).normalize();
      const a = new THREE.Group();
      a.rotation.y = Math.atan2(dir.x, dir.z);                  // lokale +z-Achse zeigt in Laufrichtung
      const m = new THREE.Mesh(arrowGeo, arrowMat); m.rotation.x = Math.PI / 2; m.renderOrder = 20; a.add(m);
      const p = here.clone().add(dir.clone().multiplyScalar(2.6)); a.position.set(p.x, 0.06, p.z);
      a.userData.target = n.id; m.userData.target = n.id;
      arrows.add(a);
    }
  }
  buildArrows();

  // ----- Kamera und Steuerung -----
  let yaw = 0, pitch = -0.17;        // Startblick nach +z (Weg 0), leicht nach unten, damit man die Pfeile sieht
  const camPos = new THREE.Vector3(0, EYE, 0);
  function goTo(id) {
    if (moving) return;
    const from = posOf(cur), to = posOf(id);
    const dir = to.clone().sub(from); const travelYaw = Math.atan2(dir.x, dir.z);
    moving = { from, to, t: 0, yaw0: yaw, yaw1: yaw + Math.atan2(Math.sin(travelYaw - yaw), Math.cos(travelYaw - yaw)), id };
    arrows.visible = false;
  }
  function arrive(id) {
    cur = id; moving = null; buildArrows(); arrows.visible = true;
    // am Wegende: Blick auf Figur und Schrank; vor dem Schrank: Blick in den Schrank
    const lookAtP = id === END_ID ? FIG_POS.clone().add(PSIDE.clone().multiplyScalar(1.5)) : id === 'cab' ? CAB_POS.clone() : null;
    if (lookAtP) {
      const tgt = lookAtP.sub(posOf(id)); const want = Math.atan2(tgt.x, tgt.z);
      moving = { look: true, t: 0, yaw0: yaw, yaw1: yaw + Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw)), pitch1: id === 'cab' ? 0.02 : -0.1, pitch0: pitch };
    }
  }

  const el = renderer.domElement;
  let drag = null;
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, yaw, pitch, moved: 0 }; });
  el.addEventListener('pointermove', e => {
    if (!drag) return;
    const w = el.clientWidth || 1, dx = (e.clientX - drag.x) / w, dy = (e.clientY - drag.y) / w;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    yaw = drag.yaw + dx * 3.2; pitch = Math.max(-0.6, Math.min(0.45, drag.pitch + dy * 1.8));
  });
  el.addEventListener('pointerup', e => { if (drag && drag.moved < 8) tap(e); drag = null; });
  el.addEventListener('pointercancel', () => { drag = null; });
  window.addEventListener('keydown', onKey);
  function onKey(e) {   // am PC: Pfeiltasten zum Umschauen, Enter = geradeaus gehen
    if (e.key === 'ArrowLeft') yaw += 0.15; else if (e.key === 'ArrowRight') yaw -= 0.15;
    else if (e.key === 'ArrowUp' || e.key === 'Enter') {
      const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      let best = null, bd = 0.5;
      for (const n of neighbors(cur)) { const d = posOf(n.id).sub(posOf(cur)).normalize().dot(fwd); if (d > bd) { bd = d; best = n.id; } }
      if (best) goTo(best);
    }
  }
  const ray = new THREE.Raycaster();
  function tap(e) {
    if (moving) return;
    const r = el.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const ah = ray.intersectObjects(arrows.children, true)[0];
    if (ah) return goTo(ah.object.userData.target);
    const hits = ray.intersectObjects(Object.values(weapons).map(w => w.hit), false);
    if (hits[0]) {
      if (cur === 'cab') return onWeapon?.(hits[0].object.userData.weapon);
      if (cur === END_ID) return goTo('cab');          // Schrank von weitem angetippt: hingehen
    }
    // Boden angetippt: in die Richtung gehen, falls dort ein Weg ist
    const gp = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (gp) {
      const dir = gp.sub(posOf(cur)).setY(0).normalize();
      let best = null, bd = 0.85;
      for (const n of neighbors(cur)) { const d = posOf(n.id).sub(posOf(cur)).normalize().dot(dir); if (d > bd) { bd = d; best = n.id; } }
      if (best) goTo(best);
    }
  }

  function resize() {
    const w = container.clientWidth || 360, h = container.clientHeight || 640;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 74 : 62; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  const clock = new THREE.Clock();
  let raf = 0, time = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta()); time += dt;
    if (moving) {
      moving.t += dt / (moving.look ? 0.7 : 0.95);
      const k = Math.min(1, moving.t), e = k * k * (3 - 2 * k);
      yaw = moving.yaw0 + (moving.yaw1 - moving.yaw0) * Math.min(1, e * 1.6);
      if (moving.pitch1 != null) pitch = moving.pitch0 + (moving.pitch1 - moving.pitch0) * e;
      if (!moving.look) {
        camPos.lerpVectors(moving.from, moving.to, e); camPos.y = EYE + Math.abs(Math.sin(e * Math.PI * 3)) * 0.04;
        if (k >= 1) arrive(moving.id);
      } else if (k >= 1) moving = null;
    }
    // Pfeile leicht pulsieren
    arrowMat.opacity = 0.72 + Math.sin(time * 4) * 0.16;
    updaters.forEach(u => u(dt, time));
    camera.position.copy(camPos);
    camera.lookAt(camPos.x + Math.sin(yaw) * Math.cos(pitch), camPos.y + Math.sin(pitch), camPos.z + Math.cos(yaw) * Math.cos(pitch));
    renderer.render(scene, camera);
  }
  loop();

  return {
    // falsch gewählte Waffen dunkel und durchgestrichen
    markWrong(ids) {
      for (const id of ids || []) {
        const w = weapons[id]; if (!w || w.wrong) continue;
        w.wrong = true;
        for (const m of w.mats) m.color?.multiplyScalar(0.35);
        const x = textSprite('✗', { size: 110, color: '#ef4444', bg: 'rgba(0,0,0,0)', w: 160, h: 160, scale: 0.45 }); x.position.z = 0.2; w.slot.add(x);
      }
    },
    markSolved(id) {
      const w = weapons[id]; if (!w) return;
      const star = textSprite('✓', { size: 110, color: '#22c55e', bg: 'rgba(0,0,0,0)', w: 160, h: 160, scale: 0.5 }); star.position.z = 0.2; w.slot.add(star);
    },
    atCabinet: () => cur === 'cab',
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', onKey);
      renderer.dispose(); el.remove();
    }
  };
}
