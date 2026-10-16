// ===== 3D-Turnhalle (Three.js) =====
// Spieler sitzen in Ankunftsreihenfolge auf der Bank (der Erste ganz links, weit weg von der Tür),
// Kapitäne stehen davor. Wer neu dazukommt, läuft durch die Tür herein.
// Die eigene Figur läuft in der Third-Person-Ansicht ein, danach sieht man die Halle aus ihren Augen
// und kann sich durch Wischen umschauen.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
import { buildWinterWorld } from './winter.js';

export const TEAM_COLORS = [0xe11d48, 0x2563eb, 0x16a34a, 0xf59e0b, 0x9333ea, 0x0891b2, 0xea580c, 0xdb2777];
const BENCH_SHIRT = 0xe2e8f0;
const HAIR = 0x4a2f1b;
const SKIN = 0xf0c4a0;

// Halle (Meter): x von -12 bis 12, z von -9 (hinten, Bänke) bis 9 (vorne, Basketballkorb)
const DOOR = new THREE.Vector3(16.5, 0, -3.2);   // vor dem Eingangstor im Schnee
const PER_ROW = 18;
const SEAT_X0 = -8.6, SEAT_DX = 0.82;
const rowZ = r => -6.3 - r * 0.8;
const rowH = r => 0.45 + r * 0.42;
const FRONT_OF_BENCH_Z = -5.0;
const CAP_Z = -1.9;
const WALK_SPEED = 3.0;

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

// ---------- Texturen ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function floorTexture() {
  return canvasTex(1024, 768, (g, w, h) => {
    // Holzdielen
    for (let y = 0; y < h; y += 8) {
      for (let x = (y / 8 % 2) * 60; x < w + 120; x += 120) {
        const l = 62 + Math.random() * 8;
        g.fillStyle = `hsl(32, 55%, ${l}%)`;
        g.fillRect(x - 120, y, 119, 7);
      }
    }
    g.fillStyle = 'rgba(120,70,30,.25)';
    for (let y = 0; y < h; y += 8) g.fillRect(0, y + 7, w, 1);
    // Spielfeldlinien (24 m x 18 m -> 1024 x 768 px)
    const px = m => m * (w / 24);
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.9)';
    g.strokeRect(px(1.5), px(1.5), w - px(3), h - px(3));
    g.beginPath(); g.moveTo(px(1.5), h / 2); g.lineTo(w - px(1.5), h / 2); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, px(1.8), 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(220,38,38,.85)';
    g.beginPath(); g.arc(w / 2, h - px(1.5), px(5.5), Math.PI, 0); g.stroke();
    g.strokeStyle = 'rgba(37,99,235,.8)';
    g.strokeRect(px(5), px(4), w - px(10), h - px(8));
  });
}

function faceTexture(name) {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#f0c4a0'; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1f2937';
    g.beginPath(); g.arc(44, 56, 7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(84, 56, 7, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#7c2d12'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.arc(64, 74, 20, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(225,29,72,.25)';
    g.beginPath(); g.arc(34, 78, 9, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(94, 78, 9, 0, Math.PI * 2); g.fill();
  });
}

function labelTexture(text, captain) {
  return canvasTex(512, 112, (g, w, h) => {
    g.font = 'bold 56px -apple-system, Segoe UI, Roboto, sans-serif';
    const tw = Math.min(w - 20, g.measureText(text).width + 48);
    const x = (w - tw) / 2;
    g.fillStyle = captain ? 'rgba(250,204,21,.95)' : 'rgba(15,23,42,.72)';
    g.beginPath(); g.roundRect(x, 18, tw, 76, 38); g.fill();
    g.fillStyle = captain ? '#422006' : '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, 58, w - 60);
  });
}

function haloTexture() {
  return canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 10, 64, 64, 62);
    gr.addColorStop(0, 'rgba(253,224,71,.95)'); gr.addColorStop(1, 'rgba(253,224,71,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}

function buildBenches(scene, rows) {
  const group = new THREE.Group();
  const plank = new THREE.MeshLambertMaterial({ color: 0xc08446 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
  const step = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
  const len = PER_ROW * SEAT_DX + 0.6;
  const cx = SEAT_X0 + (PER_ROW - 1) * SEAT_DX / 2;
  for (let r = 0; r < rows; r++) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.34), plank);
    seat.position.set(cx, rowH(r), rowZ(r)); group.add(seat);
    for (let k = 0; k <= 6; k++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.28), dark);
      leg.position.set(cx - len / 2 + 0.2 + k * (len - 0.4) / 6, rowH(r) - 0.24, rowZ(r)); group.add(leg);
    }
    if (r > 0) {
      const h = r * 0.42;
      const st = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.8), step);
      st.position.set(cx, h / 2, rowZ(r) + 0.2); group.add(st);
    }
  }
  scene.add(group);
  return group;
}

// ---------- Figuren ----------
const texLoader = new THREE.TextureLoader();
const geo = {
  thigh: new THREE.CapsuleGeometry(0.075, 0.28, 4, 8),
  shin: new THREE.CapsuleGeometry(0.068, 0.28, 4, 8),
  shoe: new THREE.BoxGeometry(0.13, 0.08, 0.25),
  torso: new THREE.CapsuleGeometry(0.2, 0.32, 4, 12),
  arm: new THREE.CapsuleGeometry(0.058, 0.38, 4, 8),
  hand: new THREE.SphereGeometry(0.06, 8, 6),
  neck: new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8),
  head: new THREE.SphereGeometry(0.17, 16, 12),
  hairShort: new THREE.SphereGeometry(0.182, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
  hairLong: new THREE.BoxGeometry(0.34, 0.46, 0.1),
  faceDisc: new THREE.CircleGeometry(0.165, 24),
  blob: new THREE.CircleGeometry(0.34, 20),
  band: new THREE.CylinderGeometry(0.066, 0.066, 0.08, 10)
};
const mat = {
  skin: new THREE.MeshLambertMaterial({ color: SKIN }),
  pants: new THREE.MeshLambertMaterial({ color: 0x1f2937 }),
  shoe: new THREE.MeshLambertMaterial({ color: 0xf8fafc }),
  hair: new THREE.MeshLambertMaterial({ color: HAIR }),
  band: new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
  blob: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
};
let HALO_TEX = null;

function makeCharacter(p, captain) {
  const root = new THREE.Group();
  root.userData.token = p.token;
  const body = new THREE.Group(); root.add(body);
  const shirt = new THREE.MeshLambertMaterial({ color: BENCH_SHIRT });

  const hips = new THREE.Group(); hips.position.y = 0.86; body.add(hips);
  const legs = [];
  for (const side of [-1, 1]) {
    const thigh = new THREE.Group(); thigh.position.x = side * 0.1; hips.add(thigh);
    const tm = new THREE.Mesh(geo.thigh, mat.pants); tm.position.y = -0.21; thigh.add(tm);
    const knee = new THREE.Group(); knee.position.y = -0.43; thigh.add(knee);
    const sm = new THREE.Mesh(geo.shin, mat.pants); sm.position.y = -0.2; knee.add(sm);
    const shoe = new THREE.Mesh(geo.shoe, mat.shoe); shoe.position.set(0, -0.4, 0.05); knee.add(shoe);
    legs.push({ thigh, knee, side });
  }
  const torso = new THREE.Mesh(geo.torso, shirt);
  torso.scale.z = 0.62; torso.position.y = 1.18; body.add(torso);
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(side * 0.27, 1.44, 0); body.add(sh);
    const am = new THREE.Mesh(geo.arm, shirt); am.position.y = -0.24; sh.add(am);
    const hand = new THREE.Mesh(geo.hand, mat.skin); hand.position.y = -0.5; sh.add(hand);
    if (captain && side === -1) { const b = new THREE.Mesh(geo.band, mat.band); b.position.y = -0.12; sh.add(b); }
    arms.push({ sh, side });
  }
  const neck = new THREE.Mesh(geo.neck, mat.skin); neck.position.y = 1.56; body.add(neck);
  const head = new THREE.Group(); head.position.y = 1.74; body.add(head);
  head.add(new THREE.Mesh(geo.head, mat.skin));
  const hairS = new THREE.Mesh(geo.hairShort, mat.hair); hairS.position.y = 0.02; hairS.rotation.x = -0.35; head.add(hairS);
  if (p.hair === 'lang') { const hl = new THREE.Mesh(geo.hairLong, mat.hair); hl.position.set(0, -0.17, -0.12); head.add(hl); }

  // Gesicht: Foto (freigestellt) oder gezeichnetes Gesicht
  const disc = new THREE.Mesh(geo.faceDisc, new THREE.MeshBasicMaterial({ map: faceTexture(p.name) }));
  disc.position.z = 0.172; head.add(disc);
  if (p.photoUrl) {
    texLoader.load(p.photoUrl, t => {
      t.colorSpace = THREE.SRGBColorSpace;
      const h = 0.52, w = h * t.image.width / t.image.height;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.08 }));
      face.position.set(0, 0.04, 0.2);
      head.add(face);
      disc.visible = false; hairS.visible = true;
    });
  }

  // Name über dem Kopf
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture((captain ? 'C · ' : '') + p.name, captain), depthWrite: false }));
  label.scale.set(1.15, 0.25, 1); label.position.y = 2.18; label.renderOrder = 10; root.add(label);

  // Markierung "wählbar" (Leuchten hinter dem Kopf) und "am Zug" (Pfeil)
  HALO_TEX ??= haloTexture();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: HALO_TEX, depthWrite: false, transparent: true }));
  halo.scale.set(0.95, 0.95, 1); halo.position.y = 1.74; halo.visible = false; body.add(halo);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 12), mat.band);
  arrow.rotation.x = Math.PI; arrow.position.y = 2.6; arrow.visible = false; root.add(arrow);

  const blob = new THREE.Mesh(geo.blob, mat.blob); blob.rotation.x = -Math.PI / 2; root.add(blob);

  return {
    token: p.token, captain, root, body, shirt, legs, arms, head, label, halo, arrow, blob,
    sit: 0, walkPhase: 0, walkAmt: 0, yaw: 0, actions: [], cur: null, data: p
  };
}

function applyPose(ch) {
  const s = ch.sit, a = ch.walkAmt, ph = ch.walkPhase;
  for (const { thigh, knee, side } of ch.legs) {
    const sw = Math.sin(ph) * side;
    thigh.rotation.x = -Math.PI / 2 * s + a * sw * 0.65;
    knee.rotation.x = Math.PI / 2 * s + a * Math.max(0, -sw) * 0.9;
  }
  for (const { sh, side } of ch.arms) sh.rotation.x = -a * Math.sin(ph) * side * 0.6 - 0.35 * s;
  ch.body.position.y = a * Math.abs(Math.sin(ph)) * 0.05;
  ch.root.rotation.y = ch.yaw;
  ch.blob.position.y = -ch.root.position.y + 0.012;
}

const _v = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// Aktionen: walk(Ziel), turn(Winkel), sit(Sitzpunkt), stand
function tick(ch, dt) {
  if (!ch.cur) ch.cur = ch.actions.shift() || null;
  const act = ch.cur;
  let walking = false;
  if (act) {
    if (act.type === 'walk') {
      const p = ch.root.position, d = new THREE.Vector3(act.to.x - p.x, 0, act.to.z - p.z);
      const dist = d.length();
      if (dist < 0.04) { p.x = act.to.x; p.z = act.to.z; ch.cur = null; }
      else {
        const want = Math.atan2(d.x, d.z);
        ch.yaw += angDiff(ch.yaw, want) * Math.min(1, dt * 10);
        const stepLen = Math.min(dist, WALK_SPEED * (act.speed || 1) * dt);
        d.normalize().multiplyScalar(stepLen); p.add(d);
        walking = true;
      }
    } else if (act.type === 'turn') {
      const diff = angDiff(ch.yaw, act.to);
      if (Math.abs(diff) < 0.02) { ch.yaw = act.to; ch.cur = null; }
      else { ch.yaw += Math.sign(diff) * Math.min(Math.abs(diff), dt * 6); walking = true; }
    } else if (act.type === 'sit' || act.type === 'stand') {
      act.t = (act.t || 0) + dt / 0.7;
      const k = Math.min(1, act.t), e = k * k * (3 - 2 * k);
      act.from ??= ch.root.position.clone();
      act.sitFrom ??= ch.sit;
      const target = act.type === 'sit' ? act.at : act.at ?? new THREE.Vector3(act.from.x, 0, act.from.z + 0.5);
      ch.root.position.lerpVectors(act.from, target, e);
      ch.sit = act.sitFrom + ((act.type === 'sit' ? 1 : 0) - act.sitFrom) * e;
      if (k >= 1) ch.cur = null;
    } else if (act.type === 'call') { act.fn(); ch.cur = null; }
  }
  ch.walkAmt += ((walking ? 1 : 0) - ch.walkAmt) * Math.min(1, dt * 8);
  if (walking || ch.walkAmt > 0.01) ch.walkPhase += dt * 11;
  applyPose(ch);
}

// ---------- Szene ----------
export function createHall3D(container, { meToken, onPersonTap } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.innerHTML = '';
  container.style.position = 'relative';
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;border-radius:14px;touch-action:none';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 500);
  const world = buildWinterWorld(scene, floorTexture());
  let benches = null, benchRows = 0;

  const chars = {};          // token -> Figur
  let data = null;
  let mode = 'overview';     // 'overview' | 'follow' | 'toEyes' | 'first'
  let look = { yaw: 0, pitch: -0.08 };
  let lookBase = 0;
  let transition = null;
  let pickableSet = new Set();
  let turnCaptain = null;

  // ----- Positionen -----
  function targets() {
    const res = {};
    const players = data.people.filter(p => p.role === 'player')
      .sort((a, b) => (a.arrivedAt ?? 0) - (b.arrivedAt ?? 0) || String(a.name).localeCompare(String(b.name), 'de'));
    const cols = data.columns;
    const C = Math.max(1, cols.length);
    const benchMid = SEAT_X0 + (PER_ROW - 1) * SEAT_DX / 2;
    const capX = j => benchMid + (j - (C - 1) / 2) * Math.min(1.8, 12 / C);
    const colOf = {};
    cols.forEach((c, j) => { colOf[c.teamId] = j; });
    const teamCount = {};
    players.forEach((p, i) => {
      const r = Math.floor(i / PER_ROW), k = i % PER_ROW;
      const seat = { x: SEAT_X0 + k * SEAT_DX, z: rowZ(r), r };
      if (p.teamId != null && p.teamId in colOf) {
        const j = colOf[p.teamId];
        const n = (teamCount[p.teamId] = (teamCount[p.teamId] ?? -1) + 1);
        const q = Math.floor(n / 3), c = n % 3;
        res[p.token] = { kind: 'team', pos: new THREE.Vector3(capX(j) + (c - 1) * 0.55, 0, CAP_Z + 0.95 + q * 0.7), yaw: Math.PI,
          color: cols[j].color, seat };
      } else {
        res[p.token] = { kind: 'seat', pos: new THREE.Vector3(seat.x, rowH(r) + 0.05 - 0.86, seat.z), yaw: 0,
          front: new THREE.Vector3(seat.x, 0, FRONT_OF_BENCH_Z), color: BENCH_SHIRT, seat };
      }
    });
    cols.forEach((c, j) => {
      res[c.captainToken] = { kind: 'captain', pos: new THREE.Vector3(capX(j), 0, CAP_Z), yaw: Math.PI, color: c.color };
    });
    const rows = Math.max(1, Math.ceil(players.length / PER_ROW));
    return { res, rows };
  }

  // Weg von der Tür (oder vom aktuellen Platz) zum Ziel
  function routeTo(ch, t, fromDoor) {
    ch.actions = []; ch.cur = null;
    if (fromDoor) {
      ch.root.position.copy(DOOR); ch.sit = 0; ch.yaw = -Math.PI / 2;
      ch.actions.push({ type: 'walk', to: new THREE.Vector3(DOOR.x - 1.5, 0, DOOR.z) });
    } else if (ch.sit > 0.5 || ch.root.position.y > 0.01) {
      // aufstehen: nach vorne von der Bank
      const p = ch.root.position;
      ch.actions.push({ type: 'stand', at: new THREE.Vector3(p.x, 0, FRONT_OF_BENCH_Z) });
    }
    if (t.kind === 'seat') {
      ch.actions.push({ type: 'walk', to: t.front });
      ch.actions.push({ type: 'turn', to: 0 });
      ch.actions.push({ type: 'sit', at: t.pos });
    } else {
      ch.actions.push({ type: 'walk', to: new THREE.Vector3(t.pos.x, 0, t.pos.z + (t.kind === 'team' ? 0 : 0)) });
      ch.actions.push({ type: 'turn', to: t.yaw });
    }
  }

  function placeDirect(ch, t) {
    ch.actions = []; ch.cur = null;
    ch.root.position.copy(t.pos);
    ch.yaw = t.yaw;
    ch.sit = t.kind === 'seat' ? 1 : 0;
    applyPose(ch);
  }

  // ----- Daten übernehmen -----
  let first = true;
  function update(newData) {
    data = newData;
    const { res, rows } = targets();
    if (rows !== benchRows) {
      if (benches) scene.remove(benches);
      benches = buildBenches(scene, rows); benchRows = rows;
    }
    const tokens = new Set(Object.keys(res));
    for (const t of Object.keys(chars)) if (!tokens.has(t)) { scene.remove(chars[t].root); delete chars[t]; }
    for (const p of data.people) {
      const t = res[p.token];
      if (!t) continue;
      let ch = chars[p.token];
      if (!ch) {
        ch = chars[p.token] = makeCharacter(p, p.role === 'captain');
        ch.target = t;
        scene.add(ch.root);
        if (first || p.token === meToken) placeDirect(ch, t);
        else routeTo(ch, t, true);                // Neuankömmling läuft durch die Tür herein
      } else if (ch.target.kind !== t.kind || ch.target.pos.distanceTo(t.pos) > 0.05) {
        ch.target = t;
        routeTo(ch, t, false);                    // z. B. gewählt: läuft von der Bank zum Team
      }
      ch.target = t;
      ch.shirt.color.setHex(t.color);
    }
    pickableSet = new Set(data.pickable ? data.people.filter(p => p.role === 'player' && !p.teamId).map(p => p.token) : []);
    turnCaptain = data.columns.find(c => c.teamId === data.turnTeamId)?.captainToken ?? null;
    if (first) {
      first = false;
      if (chars[meToken]) setView('first'); else setView('overview');
    }
  }

  // ----- Kamera -----
  const me = () => chars[meToken];
  function eyeOf(ch) {
    if (!ch) return null;
    const p = ch.root.position;
    if (ch.target?.kind === 'seat') return new THREE.Vector3(p.x, p.y + 0.86 + 1.08, p.z - 0.3);
    return new THREE.Vector3(p.x, 1.68, p.z + Math.cos(ch.yaw) * 0.08);
  }
  function setView(v) {
    if (v === 'first' && !me()) v = 'overview';
    mode = v;
    look = { yaw: 0, pitch: v === 'first' ? -0.1 : -0.42 };
    lookBase = v === 'first' ? (me()?.target?.yaw ?? 0) : Math.PI;
    if (me()) me().root.visible = v !== 'first';
  }
  function dirFrom(yaw, pitch) {
    return new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  }

  // Eigener Einlauf: Third-Person hinter der Figur, danach Wechsel in die Augen
  function playEntrance() {
    const ch = me();
    if (!ch) return Promise.resolve();
    return new Promise(res => {
      ch.root.visible = true;
      routeTo(ch, ch.target, true);
      ch.actions.push({ type: 'call', fn: () => {
        mode = 'toEyes';
        transition = { t: 0, fromPos: camera.position.clone(), fromLook: camLookTarget.clone(), done: res };
      } });
      mode = 'follow';
      camera.position.set(DOOR.x + 2.6, 1.95, DOOR.z);
      camLookTarget.set(DOOR.x - 2, 1.4, DOOR.z);
    });
  }

  const camLookTarget = new THREE.Vector3();
  function updateCamera(dt) {
    if (mode === 'follow') {
      const ch = me(), p = ch.root.position;
      const fwd = new THREE.Vector3(Math.sin(ch.yaw), 0, Math.cos(ch.yaw));
      const want = p.clone().addScaledVector(fwd, -2.5); want.y = p.y + 2.0;
      camera.position.lerp(want, Math.min(1, dt * 4));
      const lt = p.clone().addScaledVector(fwd, 1.6); lt.y = p.y + 1.35;
      camLookTarget.lerp(lt, Math.min(1, dt * 5));
      camera.lookAt(camLookTarget);
    } else if (mode === 'toEyes') {
      const ch = me();
      transition.t += dt / 1.4;
      const k = Math.min(1, transition.t), e = k * k * (3 - 2 * k);
      const eye = eyeOf(ch);
      const lt = eye.clone().add(dirFrom(ch.target.yaw, -0.1));
      camera.position.lerpVectors(transition.fromPos, eye, e);
      camLookTarget.lerpVectors(transition.fromLook, lt, e);
      camera.lookAt(camLookTarget);
      if (k > 0.8) ch.root.visible = false;
      if (k >= 1) { const done = transition.done; transition = null; setView('first'); done(); }
    } else if (mode === 'first') {
      const eye = eyeOf(me());
      camera.position.copy(eye);
      camLookTarget.copy(eye).add(dirFrom(lookBase + look.yaw, look.pitch));
      camera.lookAt(camLookTarget);
    } else {
      // Übersicht: von vorne über die Kapitäne auf die Bank
      const center = new THREE.Vector3(SEAT_X0 + (PER_ROW - 1) * SEAT_DX / 2, 0.7, -4.6);
      const r = 8.2;
      camera.position.set(center.x + Math.sin(look.yaw) * r, 4.4, center.z + Math.cos(look.yaw) * r);
      camLookTarget.copy(center);
      camera.lookAt(center);
    }
  }

  // ----- Umschauen per Wischen, Antippen von Figuren -----
  const el = renderer.domElement;
  let drag = null;
  el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, yaw: look.yaw, pitch: look.pitch }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!drag || (mode !== 'first' && mode !== 'overview')) return;
    const w = el.clientWidth || 1;
    const dx = (e.clientX - drag.sx) / w, dy = (e.clientY - drag.sy) / w;
    const maxYaw = mode === 'first' ? 1.3 : 0.9;
    look.yaw = Math.max(-maxYaw, Math.min(maxYaw, drag.yaw + dx * 2.6));
    if (mode === 'first') look.pitch = Math.max(-0.6, Math.min(0.35, drag.pitch + dy * 1.6));
  });
  el.addEventListener('pointerup', e => {
    const moved = drag && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
    drag = null;
    if (moved != null && moved < 8) tapAt(e);
  });
  el.addEventListener('pointercancel', () => { drag = null; });

  const ray = new THREE.Raycaster();
  function tapAt(e) {
    if (!onPersonTap) return;
    const r = el.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, camera);
    const roots = Object.values(chars).filter(c => c.root.visible).map(c => c.root);
    const hit = ray.intersectObjects(roots, true)[0];
    if (!hit) return;
    let o = hit.object;
    while (o && !o.userData.token) o = o.parent;
    if (o) onPersonTap(o.userData.token);
  }

  // ----- Größe & Schleife -----
  function resize() {
    const w = container.clientWidth || 360, h = container.clientHeight || 480;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 74 : 62;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  const clock = new THREE.Clock();
  let raf = 0, time = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta()); time += dt;
    for (const ch of Object.values(chars)) {
      tick(ch, dt);
      const pk = pickableSet.has(ch.token) && ch.target?.kind === 'seat' && !ch.cur;
      ch.halo.visible = pk;
      if (pk) { const s = 0.85 + Math.sin(time * 5) * 0.15; ch.halo.scale.set(s, s, 1); }
      ch.label.visible = camera.position.distanceTo(ch.label.getWorldPosition(_v)) > 2.6;
      // Nachbarn in der Nähe schauen zu einem herüber
      let headYaw = 0;
      if (mode === 'first' && ch.token !== meToken && !ch.cur) {
        const hp = ch.head.getWorldPosition(_v);
        const dx = camera.position.x - hp.x, dz = camera.position.z - hp.z;
        if (dx * dx + dz * dz < 9) headYaw = Math.max(-1.3, Math.min(1.3, angDiff(ch.yaw, Math.atan2(dx, dz))));
      }
      ch.head.rotation.y += (headYaw - ch.head.rotation.y) * Math.min(1, dt * 4);
      ch.arrow.visible = ch.token === turnCaptain;
      if (ch.arrow.visible) { ch.arrow.position.y = 2.6 + Math.sin(time * 4) * 0.08; ch.arrow.rotation.y += dt * 2; }
    }
    world.update(dt, time);
    updateCamera(dt);
    renderer.render(scene, camera);
  }
  loop();

  function dispose() {
    cancelAnimationFrame(raf); ro.disconnect();
    renderer.dispose(); el.remove();
  }

  return { update, playEntrance, setView, getView: () => mode, dispose };
}
