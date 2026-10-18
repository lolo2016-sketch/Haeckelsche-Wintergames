// ===== Winterlandschaft rund um den Hallenboden =====
// Schnee, verschneite Tannen, Berge, Schneefall, Skisprungschanze mit Springer,
// Biathlon-Loipe mit Langläufern und Schießstand, Eingangstor und Schneemann.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

const lam = color => new THREE.MeshLambertMaterial({ color });
const SNOW = 0xf8fbff;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Kleiner Zufallsgenerator, damit die Landschaft auf allen Handys gleich aussieht
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Biathlon-Loipe: Ellipse um die Plattform
const TRACK_A = 19, TRACK_B = 15, TRACK_CX = -1.6, TRACK_CZ = -1.5;
const trackPoint = (t, off = 0) => new THREE.Vector3(
  TRACK_CX + (TRACK_A + off) * Math.cos(t), 0.02, TRACK_CZ + (TRACK_B + off) * Math.sin(t));

// Skisprungschanze (Seitenprofil: z nach vorne, y nach oben), steht vorne hinter den Kapitänen
const JUMP_X = -1.6;
const PROFILE = [ // [z, y]
  [24, 0], [32, 0.4], [44, 3.2], [56, 7.5], [60, 9.2], [62, 10.2], [63.5, 10.6],
  [64.5, 10.8], [80, 21], [92, 29], [95, 29], [97, 0]
];
const LIP = { z: 64.5, y: 10.8 };
const TOP = { z: 92, y: 29 };
function surfaceY(z) {
  // Aufsprunghang + Auslauf (vordere Hälfte des Profils)
  for (let i = 0; i < 7; i++) {
    const [z0, y0] = PROFILE[i], [z1, y1] = PROFILE[i + 1];
    if (z >= z0 && z <= z1) return y0 + (y1 - y0) * (z - z0) / (z1 - z0);
  }
  return 0;
}

function makeSkier(color) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const suit = lam(color);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 4, 8), suit);
  torso.position.y = 1.1; body.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), lam(0xf0c4a0));
  head.position.y = 1.62; body.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), lam(0x111827));
  helmet.position.y = 1.64; body.add(helmet);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.75, 0.22), lam(0x1f2937));
  legs.position.y = 0.45; body.add(legs);
  const skiMat = lam(0xdc2626);
  const skis = [];
  for (const s of [-1, 1]) {
    const ski = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 2.0), skiMat);
    ski.position.set(s * 0.12, 0.03, 0.2); g.add(ski); skis.push(ski);
  }
  return { g, body, skis };
}

export function buildWinterWorld(scene, floorTex) {
  const R = rng(20262026);
  const updaters = [];

  // ----- Himmel, Nebel, Licht -----
  const skyTex = canvasTex(8, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5b8fd6'); gr.addColorStop(0.55, '#a9c9ef'); gr.addColorStop(1, '#eef4fb');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const redSkyTex = canvasTex(8, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1a0204'); gr.addColorStop(0.5, '#6b0f12'); gr.addColorStop(0.85, '#c0262d'); gr.addColorStop(1, '#ff5a3c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
  scene.add(sky);
  scene.background = new THREE.Color(0xeef4fb);
  scene.fog = new THREE.Fog(0xe6eef8, 70, 260);
  const hemi = new THREE.HemisphereLight(0xdbeafe, 0xffffff, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff7ed, 1.6);
  sun.position.set(-30, 50, 25); scene.add(sun);

  // ----- Schnee und Hallenboden als Plattform -----
  const snow = new THREE.Mesh(new THREE.CircleGeometry(300, 48), lam(SNOW));
  snow.rotation.x = -Math.PI / 2; scene.add(snow);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), new THREE.MeshLambertMaterial({ map: floorTex }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.03; scene.add(floor);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(24.3, 0.14, 18.3), lam(0x7c4a21));
  edge.position.y = -0.065; scene.add(edge);
  // Schneewehen am Plattformrand
  const driftMat = lam(SNOW);
  for (let i = 0; i < 26; i++) {
    const a = R() * Math.PI * 2;
    const x = Math.cos(a) * 13.3, z = Math.sin(a) * 10.2;
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.6 + R() * 0.7, 10, 6), driftMat);
    d.scale.y = 0.35; d.position.set(Math.max(-12.9, Math.min(12.9, x)) * 1.04, 0, Math.max(-9.6, Math.min(9.6, z)) * 1.05);
    if (Math.abs(d.position.z) < 2.4 && d.position.x > 10) continue; // Eingang frei lassen
    scene.add(d);
  }

  // ----- Biathlon-Loipe -----
  const N = 160, W = 2.4;
  const pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N * Math.PI * 2;
    const a = trackPoint(t, -W / 2), b = trackPoint(t, W / 2);
    pos.push(a.x, 0.02, a.z, b.x, 0.02, b.z);
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  trackGeo.setIndex(idx); trackGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(trackGeo, new THREE.MeshLambertMaterial({ color: 0xdbe7f5, side: THREE.DoubleSide })));
  // zwei Spurrillen
  for (const off of [-0.35, 0.35]) {
    const pts = [];
    for (let i = 0; i <= N; i++) { const p = trackPoint(i / N * Math.PI * 2, off); p.y = 0.04; pts.push(p); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x94a3b8 })));
  }
  // Fähnchen an der Loipe
  for (let i = 0; i < 16; i++) {
    const p = trackPoint(i / 16 * Math.PI * 2, W / 2 + 0.6);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), lam(0x334155));
    pole.position.set(p.x, 0.7, p.z); scene.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshLambertMaterial({ color: i % 2 ? 0xdc2626 : 0x2563eb, side: THREE.DoubleSide }));
    flag.position.set(p.x + 0.25, 1.25, p.z); scene.add(flag);
    updaters.push((dt, time) => { flag.rotation.y = Math.sin(time * 3 + i) * 0.35; });
  }

  // Langläufer mit Gewehr auf dem Rücken
  const skiers = [0xdc2626, 0x2563eb, 0x16a34a].map((c, i) => {
    const s = makeSkier(c);
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.08), lam(0x3f2a14));
    rifle.position.set(0.12, 1.15, -0.24); rifle.rotation.z = 0.5; s.body.add(rifle);
    const poles = [];
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 5), lam(0x111827));
      p.position.set(side * 0.35, 0.75, 0); s.body.add(p); poles.push(p);
    }
    scene.add(s.g);
    return { ...s, poles, t: i * 2.1, speed: 0.11 + i * 0.015 };
  });
  updaters.push((dt, time) => {
    for (const s of skiers) {
      s.t = (s.t + dt * s.speed) % (Math.PI * 2);
      const p = trackPoint(s.t, 0);
      const ahead = trackPoint(s.t + 0.01, 0);
      s.g.position.set(p.x, 0.02, p.z);
      s.g.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
      const k = Math.sin(time * 5 + s.speed * 40);
      s.body.rotation.x = 0.25 + Math.abs(k) * 0.1;
      s.skis[0].position.z = 0.2 + k * 0.35; s.skis[1].position.z = 0.2 - k * 0.35;
      s.poles[0].rotation.x = -0.4 + k * 0.5; s.poles[1].rotation.x = -0.4 - k * 0.5;
    }
  });

  // Schießstand hinter der Bank (die Kapitäne sehen ihn)
  const range = new THREE.Group();
  range.position.set(TRACK_CX - 3, 0, TRACK_CZ - TRACK_B - 4.8);
  const board = new THREE.Mesh(new THREE.BoxGeometry(7, 1.6, 0.3), lam(0xf1f5f9));
  board.position.y = 1.3; range.add(board);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.2, 1.2), lam(0x7c4a21));
  roof.position.set(0, 2.25, 0.3); range.add(roof);
  for (const x of [-3.5, 3.5]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.3, 0.2), lam(0x7c4a21));
    post.position.set(x, 1.15, 0.3); range.add(post);
  }
  const black = new THREE.MeshBasicMaterial({ color: 0x111827 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const targets = [];
  for (let i = 0; i < 5; i++) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), black);
    disc.position.set(-2.6 + i * 1.3, 1.3, 0.16); range.add(disc); targets.push(disc);
  }
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.6), new THREE.MeshBasicMaterial({ map: canvasTex(512, 72, (g, w, h) => {
    g.fillStyle = '#1d4ed8'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
    g.font = 'bold 44px -apple-system,Segoe UI,Roboto,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('BIATHLON', w / 2, h / 2 + 2);
  }) }));
  banner.position.set(0, 2.75, 0.3); range.add(banner);
  scene.add(range);
  let shot = 0, shotTimer = 0;
  updaters.push((dt) => {
    shotTimer += dt;
    if (shotTimer > 1.1) {
      shotTimer = 0;
      if (shot < 5) { if (R() < 0.8) targets[shot].material = white; shot++; }
      else { shot = 0; targets.forEach(t => { t.material = black; }); shotTimer = -1.5; }
    }
  });

  // ----- Skisprungschanze -----
  const shape = new THREE.Shape();
  shape.moveTo(PROFILE[0][0], PROFILE[0][1]);
  for (const [z, y] of PROFILE.slice(1)) shape.lineTo(z, y);
  shape.lineTo(PROFILE[0][0], 0);
  const hillGeo = new THREE.ExtrudeGeometry(shape, { depth: 14, bevelEnabled: false });
  const hill = new THREE.Mesh(hillGeo, lam(SNOW));
  hill.rotation.y = -Math.PI / 2;
  hill.position.set(JUMP_X + 7, 0, 0);
  scene.add(hill);
  // Anlaufspur (Holzbahn) auf dem Schanzentisch
  const inrunLen = Math.hypot(TOP.z - LIP.z, TOP.y - LIP.y);
  const inrun = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, inrunLen), lam(0x8b5e34));
  inrun.position.set(JUMP_X, (TOP.y + LIP.y) / 2 + 0.16, (TOP.z + LIP.z) / 2);
  inrun.rotation.x = Math.atan2(TOP.y - LIP.y, TOP.z - LIP.z);
  scene.add(inrun);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, inrunLen), lam(0xdc2626));
    rail.position.copy(inrun.position); rail.position.x += s * 1.15; rail.position.y += 0.2;
    rail.rotation.x = inrun.rotation.x; scene.add(rail);
  }
  // Turm mit Startkabine
  const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 4), lam(0x64748b));
  tower.position.set(JUMP_X, TOP.y + 3, TOP.z + 2); scene.add(tower);
  const cabinRoof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 2, 4), lam(0xdc2626));
  cabinRoof.rotation.y = Math.PI / 4; cabinRoof.position.set(JUMP_X, TOP.y + 7, TOP.z + 2); scene.add(cabinRoof);
  // Flutlichtmasten
  for (const [x, z] of [[JUMP_X - 10, 50], [JUMP_X + 10, 50], [JUMP_X - 10, 78], [JUMP_X + 10, 78]]) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 22, 6), lam(0x94a3b8));
    mast.position.set(x, 11, z); scene.add(mast);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.5), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
    lamp.position.set(x, 22, z); scene.add(lamp);
  }
  // Zuschauer-Banner am Auslauf
  const jumpBanner = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 120, (g, w, h) => {
    g.fillStyle = '#dc2626'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
    g.font = 'bold 70px -apple-system,Segoe UI,Roboto,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('SKISPRUNG · WINTERGAMES', w / 2, h / 2 + 3);
  }), side: THREE.DoubleSide }));
  jumpBanner.position.set(JUMP_X, 0.8, 23.5); scene.add(jumpBanner);

  // Springer: Anlauf, Flug, Landung, Auslauf, Pause
  const jumper = makeSkier(0xfacc15);
  jumper.g.scale.setScalar(1.4);
  scene.add(jumper.g);
  let jt = 0;
  const T_IN = 3.2, T_FLY = 2.4, T_OUT = 2.0, T_WAIT = 2.5;
  updaters.push((dt) => {
    jt = (jt + dt) % (T_IN + T_FLY + T_OUT + T_WAIT);
    const g = jumper.g;
    g.visible = jt < T_IN + T_FLY + T_OUT;
    let z, y, pitch = 0, spread = 0;
    if (jt < T_IN) {                                   // Anlauf, wird schneller
      const k = (jt / T_IN) ** 2;
      z = TOP.z + (LIP.z - TOP.z) * k; y = TOP.y + (LIP.y - TOP.y) * k + 0.35;
      pitch = -Math.atan2(TOP.y - LIP.y, TOP.z - LIP.z);
    } else if (jt < T_IN + T_FLY) {                    // Flug mit V-Stil
      const k = (jt - T_IN) / T_FLY;
      z = LIP.z + (34 - LIP.z) * k;
      y = LIP.y + 0.35 + (surfaceY(34) + 0.05 - LIP.y - 0.35) * k + Math.sin(Math.PI * k) * 3.2;
      pitch = 0.6; spread = 0.35;
    } else {                                           // Auslauf, bremst ab
      const k = (jt - T_IN - T_FLY) / T_OUT;
      const e = 1 - (1 - k) ** 2;
      z = 34 + (25.5 - 34) * e; y = surfaceY(z) + 0.05;
    }
    g.position.set(JUMP_X, y, z);
    g.rotation.set(pitch, Math.PI, 0);
    jumper.body.rotation.x = jt < T_IN ? 0.9 : jt < T_IN + T_FLY ? 0.9 : 0.2;
    jumper.skis[0].rotation.y = spread; jumper.skis[1].rotation.y = -spread;
  });

  // ----- Verschneite Tannen (Instanzen, damit es auf dem Handy flüssig bleibt) -----
  const trees = [];
  let tries = 0;
  while (trees.length < 120 && tries++ < 3000) {
    const a = R() * Math.PI * 2, r = 25 + R() ** 0.7 * 70;
    const x = TRACK_CX + Math.cos(a) * r * 1.15, z = TRACK_CZ + Math.sin(a) * r;
    if (Math.abs(x - JUMP_X) < 13 && z > 15 && z < 105) continue;          // Schanze frei
    if (z < -18 && z > -30 && Math.abs(x - TRACK_CX + 3) < 7) continue;    // Schießstand frei
    if (x > 12 && Math.abs(z) < 5 && x < 30) continue;               // Weg zum Eingang frei
    trees.push({ x, z, s: 0.8 + R() * 0.9, rot: R() * Math.PI });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.32, 1.4, 6);
  const coneGeo = new THREE.ConeGeometry(1, 1, 8);
  const trunks = new THREE.InstancedMesh(trunkGeo, lam(0x5b3a1e), trees.length);
  const greens = new THREE.InstancedMesh(coneGeo, lam(0x1f5135), trees.length * 3);
  const snows = new THREE.InstancedMesh(coneGeo, lam(SNOW), trees.length * 3);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  trees.forEach((t, i) => {
    m.compose(v.set(t.x, 0.7 * t.s, t.z), q.identity(), sc.set(t.s, t.s, t.s)); trunks.setMatrixAt(i, m);
    for (let k = 0; k < 3; k++) {
      const w = (2.3 - k * 0.6) * t.s, h = (2.4 - k * 0.3) * t.s, y = (1.4 + k * 1.35) * t.s + h / 2;
      q.setFromAxisAngle(v.set(0, 1, 0), t.rot + k);
      m.compose(v.set(t.x, y, t.z), q, sc.set(w, h, w)); greens.setMatrixAt(i * 3 + k, m);
      m.compose(v.set(t.x, y + h * 0.18, t.z), q, sc.set(w * 0.78, h * 0.66, w * 0.78)); snows.setMatrixAt(i * 3 + k, m);
    }
  });
  scene.add(trunks, greens, snows);

  // ----- Berge am Horizont -----
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2 + R() * 0.3;
    const r = 175 + R() * 40, h = 45 + R() * 45, w = 50 + R() * 40;
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(w, h, 7), lam(0x8ea3bd));
    mtn.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); scene.add(mtn);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.42, h * 0.42, 7), lam(SNOW));
    cap.position.set(mtn.position.x, h - 1 - h * 0.21 + 0.3, mtn.position.z); scene.add(cap);
  }

  // ----- Eingangstor mit Banner, auf Höhe der Plattformmitte (gegenüber der Öffnung der runden Bank) -----
  const gateMat = lam(0x7c4a21);
  for (const dz of [-1.7, 1.7]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 0.35), gateMat);
    post.position.set(13.4, 1.8, dz); scene.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), lam(SNOW));
    cap.scale.y = 0.5; cap.position.set(13.4, 3.62, dz); scene.add(cap);
  }
  const gateTex = canvasTex(1024, 230, (g, w, h) => {
    g.fillStyle = '#1e3a8a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#bfdbfe'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 74px -apple-system,Segoe UI,Roboto,sans-serif'; g.fillText('❄ HAECKELSCHE ❄', w / 2, 82);
    g.font = 'bold 66px -apple-system,Segoe UI,Roboto,sans-serif'; g.fillText('WINTERGAMES', w / 2, 160);
  });
  // Vorder- und Rückseite einzeln, damit der Schriftzug von außen und aus der Runde heraus lesbar ist
  for (const back of [false, true]) {
    const gb = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.9), new THREE.MeshBasicMaterial({ map: gateTex }));
    gb.position.set(13.4 + (back ? -0.01 : 0.01), 3.15, 0); gb.rotation.y = back ? -Math.PI / 2 : Math.PI / 2; scene.add(gb);
  }

  // ----- Schneemann -----
  const sm = new THREE.Group();
  [[0.75, 0.6], [0.55, 1.6], [0.38, 2.35]].forEach(([r, y]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), lam(SNOW)); b.position.y = y; sm.add(b);
  });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 8), lam(0xf97316));
  nose.rotation.x = Math.PI / 2; nose.position.set(0, 2.35, 0.48); sm.add(nose);
  for (const x of [-0.13, 0.13]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), lam(0x111827)); e.position.set(x, 2.48, 0.34); sm.add(e); }
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.45, 12), lam(0x111827)); hat.position.y = 2.88; sm.add(hat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 14), lam(0x111827)); brim.position.y = 2.67; sm.add(brim);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.08, 6, 16), lam(0xdc2626)); scarf.rotation.x = Math.PI / 2; scarf.position.y = 2.05; sm.add(scarf);
  sm.position.set(-14.5, 0, 7.5); sm.rotation.y = 0.7; scene.add(sm);
  updaters.push((dt, time) => { sm.rotation.z = Math.sin(time * 1.3) * 0.03; });

  // ----- Schneefall -----
  const FLAKES = 1400;
  const fp = new Float32Array(FLAKES * 3), fs = new Float32Array(FLAKES);
  for (let i = 0; i < FLAKES; i++) {
    fp[i * 3] = -45 + R() * 90; fp[i * 3 + 1] = R() * 28; fp[i * 3 + 2] = -45 + R() * 90; fs[i] = 0.6 + R() * 0.8;
  }
  const flakeGeo = new THREE.BufferGeometry();
  flakeGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  const flakeTex = canvasTex(32, 32, (g) => {
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  });
  const flakes = new THREE.Points(flakeGeo, new THREE.PointsMaterial({ size: 0.16, map: flakeTex, transparent: true, depthWrite: false }));
  scene.add(flakes);
  updaters.push((dt, time) => {
    for (let i = 0; i < FLAKES; i++) {
      fp[i * 3 + 1] -= dt * fs[i];
      fp[i * 3] += Math.sin(time * 0.7 + i) * dt * 0.3;
      if (fp[i * 3 + 1] < 0) fp[i * 3 + 1] = 28;
    }
    flakeGeo.attributes.position.needsUpdate = true;
  });

  // ----- Agentenwelt: leuchtender Schriftzug über dem Tor, schwebender Besen (links) und Schädel-Pokal (rechts) -----
  // Wird erst beim ersten Einschalten des Agentenmodus gebaut und geladen (spart Ladezeit für alle anderen).
  // Besen und Schädel: je 4 Ansichten (vorne/rechts/links/hinten); je nach Blickwinkel wird zwischen ihnen
  // überblendet, dadurch wirken sie dreidimensional, kosten aber kaum Leistung.
  let agentWorld = null;
  function buildAgentWorld() {
    const g = new THREE.Group();
    const loader = new THREE.TextureLoader();
    const load = url => { const t = loader.load(url); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const glowTex = c => canvasTex(128, 128, (x) => {
      const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    });
    const glowSprite = c => new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c), blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false, fog: false }));

    // Schriftzug: mehrere Schichten hintereinander ergeben die Tiefe (vorne hell, dahinter dunkel-glühend)
    const logoTex = load('agents/welt/logo.png');
    const LW = 9, LH = LW * 853 / 1024;
    const logo = new THREE.Group();
    logo.position.set(17, 4 + LH / 2, 0); logo.rotation.y = -Math.PI / 2;   // schaut zur Mitte der runden Bank
    const LAYERS = 9;
    for (let i = LAYERS - 1; i >= 0; i--) {
      const k = i / (LAYERS - 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), new THREE.MeshBasicMaterial({
        map: logoTex, transparent: true, alphaTest: 0.3, fog: false, side: THREE.DoubleSide,
        color: i === 0 ? 0xffffff : new THREE.Color(0.75 - k * 0.45, 0.22 - k * 0.15, 0.04)
      }));
      m.position.z = -i * 0.05; logo.add(m);
    }
    const logoGlow = glowSprite('rgba(255,120,30,0.9)'); logoGlow.scale.set(LW * 1.5, LH * 1.4, 1); logoGlow.position.z = -0.6; logo.add(logoGlow);
    g.add(logo);

    // Schwebende Objekte mit 4 Ansichten
    const VIEWS = ['vorne', 'links', 'hinten', 'rechts'];   // gegen den Uhrzeigersinn um das Objekt herum
    function floater(name, pos, glowColor, emberColor) {
      const texs = VIEWS.map(v => load(`agents/welt/${name}_${v}.png`));
      const H = 9, W = H * 378 / 465;
      const grp = new THREE.Group(); grp.position.copy(pos);
      const mk = () => new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: texs[0], transparent: true, depthWrite: false, fog: false }));
      const a = mk(), b = mk(); b.renderOrder = 1;
      const glow = glowSprite(glowColor); glow.scale.set(W * 1.6, H * 1.2, 1); glow.position.z = -0.3;
      const face = new THREE.Group(); face.add(glow, a, b); grp.add(face);
      // aufsteigende Funken
      const N = 40, ep = new Float32Array(N * 3), ev = [];
      for (let i = 0; i < N; i++) { ep[i * 3] = (R() - 0.5) * W; ep[i * 3 + 1] = (R() - 0.5) * H; ep[i * 3 + 2] = (R() - 0.5) * 2; ev.push(0.6 + R() * 1.2); }
      const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
      const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: emberColor, size: 0.18, map: flakeTex, transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      grp.add(embers);
      g.add(grp);
      const frontYaw = Math.atan2(-pos.x, -pos.z);          // Vorderseite zeigt zur Mitte
      const baseY = pos.y, phase = R() * 6;
      return (dt, time, cam) => {
        grp.position.y = baseY + Math.sin(time * 0.8 + phase) * 0.35;
        const camYaw = Math.atan2(cam.position.x - grp.position.x, cam.position.z - grp.position.z);
        face.rotation.y = camYaw;
        // Blickwinkel relativ zur Vorderseite -> passende Ansicht, weich überblendet
        let rel = Math.atan2(Math.sin(camYaw - frontYaw), Math.cos(camYaw - frontYaw));
        const u = ((rel / (Math.PI / 2)) % 4 + 4) % 4, i0 = Math.floor(u) % 4, i1 = (i0 + 1) % 4, f = u - Math.floor(u);
        const w = Math.min(1, Math.max(0, (f - 0.35) / 0.3)), ws = w * w * (3 - 2 * w);
        a.material.map = texs[i0]; b.material.map = texs[i1];
        a.material.opacity = 1 - ws; b.material.opacity = ws;
        // Flackern
        glow.material.opacity = 0.55 + Math.sin(time * 7 + phase) * 0.1 + Math.sin(time * 13.3) * 0.06;
        for (let i = 0; i < N; i++) {
          ep[i * 3 + 1] += dt * ev[i];
          if (ep[i * 3 + 1] > H / 2) { ep[i * 3 + 1] = -H / 2; ep[i * 3] = (R() - 0.5) * W * 0.8; }
        }
        eg.attributes.position.needsUpdate = true;
        embers.rotation.y = camYaw;
      };
    }
    // links und rechts (von der Mitte aus Richtung Tor gesehen), hinten bleibt frei
    const floaters = [
      floater('besen', new THREE.Vector3(5, 6.2, -15), 'rgba(255,90,20,0.85)', 0xffa040),
      floater('schaedel', new THREE.Vector3(5, 6.2, 15), 'rgba(90,255,60,0.7)', 0x9dff5a)
    ];
    scene.add(g);
    return { group: g, update: (dt, time, cam) => {
      logoGlow.material.opacity = 0.5 + Math.sin(time * 2.2) * 0.12;
      logo.position.y = 4 + LH / 2 + Math.sin(time * 0.6) * 0.15;
      floaters.forEach(f => f(dt, time, cam));
    } };
  }

  // Stimmung: normal (Wintertag) oder Agentenmodus (roter, düsterer Himmel, alles in rotes Licht getaucht)
  function setMood(agent) {
    if (agent && !agentWorld) agentWorld = buildAgentWorld();
    if (agentWorld) agentWorld.group.visible = agent;
    sky.material.map = agent ? redSkyTex : skyTex; sky.material.needsUpdate = true;
    scene.background.setHex(agent ? 0x3a0608 : 0xeef4fb);
    scene.fog.color.setHex(agent ? 0x4a0a0c : 0xe6eef8);
    scene.fog.near = agent ? 30 : 70; scene.fog.far = agent ? 170 : 260;
    hemi.color.setHex(agent ? 0xff5f5f : 0xdbeafe); hemi.groundColor.setHex(agent ? 0x3b0606 : 0xffffff);
    hemi.intensity = agent ? 1.05 : 1.5;
    sun.color.setHex(agent ? 0xff2a1a : 0xfff7ed); sun.intensity = agent ? 1.5 : 1.6;
  }

  return {
    update: (dt, time, cam) => {
      updaters.forEach(u => u(dt, time));
      if (agentWorld?.group.visible && cam) agentWorld.update(dt, time, cam);
    },
    setMood
  };
}
