// ===== 3D-Winterplattform (Three.js) =====
// Alle sitzen auf einer runden Bank in der Mitte der Plattform. Die Bank ist zum Eingangstor hin offen.
// Die erste Person setzt sich mittig gegenüber der Öffnung, danach abwechselnd eine links, eine rechts daneben.
// Wer ins selbe Team kommt, bekommt dieselbe Farbe und setzt sich neben die anderen Teammitglieder.
// Die eigene Figur läuft in der Third-Person-Ansicht ein, danach sieht man die Runde aus ihren Augen.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
import { buildWinterWorld } from './winter.js?v=20261019';

const BENCH_SHIRT = 0xe2e8f0;
const HAIR = 0x4a2f1b;
const SKIN = 0xf0c4a0;

const CENTER = new THREE.Vector3(0, 0, 0);          // Mitte der Plattform und der runden Bank
const DOOR = new THREE.Vector3(18.5, 0, 0);         // vor dem Eingangstor (Tor auf Höhe der Mitte)
const SEAT_SP = 0.8;                                // Abstand der Sitzplätze (m)
const GAP = 2.4;                                    // Breite der Öffnung zum Tor hin (m)
const SEAT_H = 0.45;                                // Sitzhöhe
let BENCH_SEATS = 20;
const WALK_SPEED = 3.0;
const DEFAULT_AGENT = 'agents/agent1.png';     // Agentenbild, wenn bei der Person keins eingetragen ist

// Ring mit ungerader Platzzahl: Platz j = 0 … ns-1 entlang des Bogens, Mitte (j = K) gegenüber dem Tor
function makeRing(n) {
  const K = Math.max(3, Math.ceil((n - 1) / 2)), ns = 2 * K + 1;
  const R = Math.max(3.2, (ns * SEAT_SP + GAP) / (2 * Math.PI));
  return { K, ns, R, dA: SEAT_SP / R };
}
// Reihenfolge: 0 = mittig, dann links, rechts, links, rechts … (aus Sicht der Einlaufenden)
const kOf = i => i === 0 ? 0 : (i % 2 ? (i + 1) / 2 : -i / 2);
function slotPos(ring, j) {
  const a = Math.PI - (j - ring.K) * ring.dA, c = Math.cos(a), s = Math.sin(a);
  return {
    j, a, x: CENTER.x + ring.R * c, z: CENTER.z + ring.R * s,
    fx: CENTER.x + (ring.R - 0.7) * c, fz: CENTER.z + (ring.R - 0.7) * s,
    yaw: Math.atan2(-c, -s)                           // Blick zur Mitte
  };
}

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

// Sprechblase: weißer Kasten mit Spitze nach unten, Text umgebrochen (max. 4 Zeilen)
function bubbleTexture(text) {
  const W = 512, PAD = 26, LH = 52;
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = '600 44px -apple-system, Segoe UI, Roboto, sans-serif';
  const words = String(text).split(/\s+/), lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (meas.measureText(t).width > W - 2 * PAD && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  if (lines.length > 4) { lines.length = 4; lines[3] = lines[3].replace(/.{0,2}$/, '') + '…'; }
  const textW = Math.min(W - 2 * PAD, Math.max(...lines.map(l => meas.measureText(l).width)));
  const bw = textW + 2 * PAD, bh = lines.length * LH + 2 * PAD - 10, H = bh + 28;
  const tex = canvasTex(W, H, (g) => {
    const x = (W - bw) / 2;
    g.fillStyle = 'rgba(0,0,0,.18)';
    g.beginPath(); g.roundRect(x + 3, 5, bw, bh, 26); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.roundRect(x, 2, bw, bh, 26); g.fill();
    g.beginPath(); g.moveTo(W / 2 - 16, bh); g.lineTo(W / 2, bh + 24); g.lineTo(W / 2 + 16, bh); g.closePath(); g.fill();
    g.fillStyle = '#0f172a'; g.font = meas.font; g.textAlign = 'center'; g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, W / 2, 2 + PAD - 4 + i * LH));
  });
  return { tex, aspect: H / W };
}

function haloTexture() {
  return canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 10, 64, 64, 62);
    gr.addColorStop(0, 'rgba(253,224,71,.95)'); gr.addColorStop(1, 'rgba(253,224,71,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}

// Runde Bank aus einzelnen, leicht gebogen angeordneten Brettern, offen zum Tor hin
function buildRing(scene, ring) {
  const group = new THREE.Group();
  const plank = new THREE.MeshLambertMaterial({ color: 0xc08446 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
  const segW = 2 * (ring.R + 0.17) * Math.tan(ring.dA / 2) + 0.02;
  for (let j = 0; j < ring.ns; j++) {
    const s = slotPos(ring, j);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(segW, 0.06, 0.38), plank);
    seat.position.set(s.x, SEAT_H, s.z); seat.rotation.y = s.yaw; group.add(seat);
    if (j % 2 === 0 || j === ring.ns - 1) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, SEAT_H, 0.3), dark);
      leg.position.set(s.x, SEAT_H / 2 - 0.02, s.z); leg.rotation.y = s.yaw; group.add(leg);
    }
  }
  // Pfosten an beiden Enden der Öffnung
  for (const j of [0, ring.ns - 1]) {
    const s = slotPos(ring, j + (j ? 0.62 : -0.62));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 8), dark);
    post.position.set(s.x, 0.55, s.z); group.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshLambertMaterial({ color: 0xf8fbff }));
    cap.position.set(s.x, 1.12, s.z); group.add(cap);
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

function makeCharacter(p) {
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
  let band = null;
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(side * 0.27, 1.44, 0); body.add(sh);
    const am = new THREE.Mesh(geo.arm, shirt); am.position.y = -0.24; sh.add(am);
    const hand = new THREE.Mesh(geo.hand, mat.skin); hand.position.y = -0.5; sh.add(hand);
    if (side === -1) { band = new THREE.Mesh(geo.band, mat.band); band.position.y = -0.12; band.visible = false; sh.add(band); }
    arms.push({ sh, side });
  }
  const neck = new THREE.Mesh(geo.neck, mat.skin); neck.position.y = 1.56; body.add(neck);
  const head = new THREE.Group(); head.position.y = 1.74; body.add(head);
  head.add(new THREE.Mesh(geo.head, mat.skin));
  const hairS = new THREE.Mesh(geo.hairShort, mat.hair); hairS.position.y = 0.02; hairS.rotation.x = -0.35; head.add(hairS);
  if (p.hair === 'lang') { const hl = new THREE.Mesh(geo.hairLong, mat.hair); hl.position.set(0, -0.17, -0.12); head.add(hl); }

  // Gesicht: Foto (freigestellt) oder gezeichnetes Gesicht
  const faceG = new THREE.Group(); head.add(faceG);   // wird im Agentenmodus ausgeblendet
  const disc = new THREE.Mesh(geo.faceDisc, new THREE.MeshBasicMaterial({ map: faceTexture(p.name) }));
  disc.position.z = 0.172; faceG.add(disc);
  if (p.photoUrl) {
    texLoader.load(p.photoUrl, t => {
      t.colorSpace = THREE.SRGBColorSpace;
      const h = 0.52, w = h * t.image.width / t.image.height;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.08 }));
      face.position.set(0, 0.04, 0.2);
      faceG.add(face);
      disc.visible = false; hairS.visible = true;
    });
  }

  // Name über dem Kopf
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(p.name, false), depthWrite: false }));
  label.scale.set(1.15, 0.25, 1); label.position.y = 2.18; label.renderOrder = 10; root.add(label);

  // Markierung "wählbar" (Leuchten hinter dem Kopf) und "am Zug" (Pfeil)
  HALO_TEX ??= haloTexture();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: HALO_TEX, depthWrite: false, transparent: true }));
  halo.scale.set(0.95, 0.95, 1); halo.position.y = 1.74; halo.visible = false; body.add(halo);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 12), mat.band);
  arrow.rotation.x = Math.PI; arrow.position.y = 2.6; arrow.visible = false; root.add(arrow);

  const blob = new THREE.Mesh(geo.blob, mat.blob); blob.rotation.x = -Math.PI / 2; root.add(blob);

  // Sprechblase (wird über setBubble gefüllt)
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false, transparent: true }));
  bubble.center.set(0.5, 0); bubble.position.y = 2.36; bubble.visible = false; bubble.renderOrder = 11; root.add(bubble);

  return {
    token: p.token, founder: false, name: p.name, band, faceG, agentUrl: null, agentMesh: null, root, body, shirt, legs, arms, head, label, halo, arrow, blob, bubble, bubbleText: null,
    sit: 0, walkPhase: 0, walkAmt: 0, yaw: 0, actions: [], cur: null, data: p
  };
}

// Agentenmodus: Bild (Kopf + Oberkörper) liegt vor der Figur, das eigene Gesicht wird ausgeblendet.
// Nur von vorne sichtbar; von hinten sieht man weiter die normale Figur.
const AGENT_H = 0.95, AGENT_TOP = 2.0;
function setAgent(ch, url) {
  url = url || null;
  if (ch.agentUrl === url) return;
  ch.agentUrl = url;
  if (ch.agentMesh) { ch.body.remove(ch.agentMesh); ch.agentMesh.geometry.dispose(); ch.agentMesh = null; }
  ch.faceG.visible = !url;
  if (!url) return;
  texLoader.load(url, t => {
    if (ch.agentUrl !== url) return;          // inzwischen wieder ausgeschaltet
    t.colorSpace = THREE.SRGBColorSpace;
    const w = AGENT_H * t.image.width / t.image.height;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, AGENT_H),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.1 }));
    m.position.set(0, AGENT_TOP - AGENT_H / 2, 0.26);
    ch.body.add(m); ch.agentMesh = m;
  }, undefined, () => { ch.faceG.visible = true; });   // Bild fehlt: normales Gesicht zeigen
}

// Teamgründer: goldenes Namensschild mit Stern und Armbinde
function setFounder(ch, founder, name) {
  if (ch.founder === founder && ch.name === name) return;
  ch.founder = founder; ch.name = name;
  ch.label.material.map?.dispose();
  ch.label.material.map = labelTexture((founder ? '★ ' : '') + name, founder);
  ch.label.material.needsUpdate = true;
  if (ch.band) ch.band.visible = founder;
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
  let benches = null, ring = null;

  const chars = {};          // token -> Figur
  let data = null;
  let mode = 'orbit';        // 'orbit' (Rundumblick) | 'follow' (Einlauf) | 'toEyes' | 'first' (Ich-Sicht)
  let look = { yaw: 0, pitch: -0.08 };
  let lookBase = 0;
  let transition = null;
  let pickableSet = new Set();
  let turnToken = null;

  // ----- Sitzplätze -----
  // 1. Grundplatz nach Ankunft (mittig, dann links/rechts im Wechsel)
  // 2. Teams der Reihe nach: Mitglieder rücken neben den Gründer (tauschen mit dem Sitznachbarn)
  // Alle Handys rechnen das gleich, weil es nur von Ankunftszeit, Teams und Wahlzeitpunkt abhängt.
  const byArrival = (a, b) => (a.arrivedAt ?? 0) - (b.arrivedAt ?? 0) || String(a.token).localeCompare(String(b.token));
  function targets() {
    const people = data.people.slice().sort(byArrival);
    const need = Math.max(people.length, BENCH_SEATS);
    const r = makeRing(need);
    const ringChanged = !ring || ring.ns !== r.ns;
    if (ringChanged) ring = r;
    const ns = ring.ns;
    const slotOf = {}, occ = new Array(ns).fill(null);
    people.forEach((p, i) => { const j = kOf(i) + ring.K; slotOf[p.token] = j; occ[j] = p.token; });

    const teams = (data.teams || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const members = {};
    for (const p of people) if (p.teamId) (members[p.teamId] ??= []).push(p);
    const locked = new Set();
    const move = (tok, j) => {
      const other = occ[j], from = slotOf[tok];
      occ[j] = tok; slotOf[tok] = j; occ[from] = other; if (other) slotOf[other] = from;
    };
    for (const t of teams) {
      const list = (members[t.id] || []).sort((a, b) => (a.pickedAt ?? 0) - (b.pickedAt ?? 0) || String(a.token).localeCompare(String(b.token)));
      if (!list.length) continue;
      const anchor = list.find(m => m.token === t.captainToken) ?? list[0];
      let lo = slotOf[anchor.token], hi = lo;
      locked.add(anchor.token);
      for (const m of list) {
        if (m === anchor) continue;
        const cur = slotOf[m.token];
        let j = (cur === hi + 1 || cur === lo - 1) ? cur : null;
        if (j == null) {
          for (let d = 1; d < ns && j == null; d++) {
            for (const c of [hi + d, lo - d]) if (c >= 0 && c < ns && !locked.has(occ[c])) { j = c; break; }
          }
        }
        if (j == null) continue;
        if (j !== cur) move(m.token, j);
        locked.add(m.token);
        lo = Math.min(lo, j); hi = Math.max(hi, j);
      }
    }

    const colorOf = {};
    for (const t of teams) colorOf[t.id] = t.color;
    const res = {};
    for (const p of people) {
      const sp = slotPos(ring, slotOf[p.token]);
      res[p.token] = {
        kind: 'seat', slot: sp.j, yaw: sp.yaw,
        pos: new THREE.Vector3(sp.x, SEAT_H + 0.05 - 0.86, sp.z),
        front: new THREE.Vector3(sp.fx, 0, sp.fz),
        color: p.teamId && colorOf[p.teamId] != null ? colorOf[p.teamId] : BENCH_SHIRT
      };
    }
    return { res, ringChanged };
  }

  // Weg von der Tür (oder vom aktuellen Platz) zum Ziel
  function routeTo(ch, t, fromDoor) {
    ch.actions = []; ch.cur = null;
    if (fromDoor) {
      // durchs Tor, durch die Öffnung der Bank in den Kreis
      ch.root.position.copy(DOOR); ch.sit = 0; ch.yaw = -Math.PI / 2;
      ch.actions.push({ type: 'walk', to: new THREE.Vector3(ring.R + 1.6, 0, CENTER.z) });
      ch.actions.push({ type: 'walk', to: new THREE.Vector3(ring.R - 1.2, 0, CENTER.z) });
    } else if (ch.sit > 0.5 || ch.root.position.y < -0.01) {
      // aufstehen: nach vorne von der Bank (zur Mitte hin)
      const f = ch.prevFront;
      ch.actions.push({ type: 'stand', at: f ? f.clone() : new THREE.Vector3(ch.root.position.x, 0, ch.root.position.z) });
    }
    ch.prevFront = t.front;
    ch.actions.push({ type: 'walk', to: t.front });
    ch.actions.push({ type: 'turn', to: t.yaw });
    ch.actions.push({ type: 'sit', at: t.pos });
  }

  function placeDirect(ch, t) {
    ch.actions = []; ch.cur = null;
    ch.root.position.copy(t.pos);
    ch.yaw = t.yaw;
    ch.sit = 1;
    ch.prevFront = t.front;
    applyPose(ch);
  }

  // ----- Daten übernehmen -----
  // data: { people, teams: [{id, captainToken, order, color}], turnToken, pickable, benchSeats }
  let first = true;
  function update(newData) {
    data = newData;
    BENCH_SEATS = Math.max(7, Math.min(40, Number(data.benchSeats) || 20));
    const { res, ringChanged } = targets();
    if (ringChanged) {
      if (benches) scene.remove(benches);
      benches = buildRing(scene, ring);
    }
    const founders = new Set((data.teams || []).map(t => t.captainToken).filter(Boolean));
    const tokens = new Set(Object.keys(res));
    for (const t of Object.keys(chars)) if (!tokens.has(t)) { scene.remove(chars[t].root); delete chars[t]; }
    for (const p of data.people) {
      const t = res[p.token];
      if (!t) continue;
      let ch = chars[p.token];
      if (!ch) {
        ch = chars[p.token] = makeCharacter(p);
        ch.target = t;
        scene.add(ch.root);
        if (first || p.token === meToken) placeDirect(ch, t);
        else routeTo(ch, t, true);                // Neuankömmling läuft durch das Tor herein
      } else if (ch.target.pos.distanceTo(t.pos) > 0.05) {
        routeTo(ch, t, false);               // z. B. ins Team gewählt: rückt neben den Gründer
      }
      ch.target = t;
      ch.shirt.color.setHex(t.color);
      setFounder(ch, founders.has(p.token), p.name);
      setAgent(ch, p.agent ? (p.agentUrl || DEFAULT_AGENT) : null);
    }
    // leuchtende Figuren: entweder ausdrücklich angegeben (z. B. der eigene Tipp beim Raten) oder alle Freien beim Wählen
    pickableSet = new Set(data.pickTokens ?? (data.pickable ? data.people.filter(p => !p.teamId && p.token !== meToken).map(p => p.token) : []));
    turnToken = data.turnToken ?? null;
    if (first) {
      first = false;
      if (chars[meToken]) setView('first'); else setView('orbit');
    }
  }

  // ----- Kamera -----
  const me = () => chars[meToken];
  function eyeOf(ch) {
    if (!ch) return null;
    const p = ch.root.position;
    if (ch.target?.kind === 'seat') {
      const y = ch.target.yaw;
      return new THREE.Vector3(p.x - Math.sin(y) * 0.3, p.y + 0.86 + 1.08, p.z - Math.cos(y) * 0.3);
    }
    return new THREE.Vector3(p.x, 1.68, p.z + Math.cos(ch.yaw) * 0.08);
  }
  // Rundumblick: Kamera kreist um die Spielfeldmitte, Start hinter der eigenen Figur
  const orbit = { yaw: 0, dist: 12, height: 6 };
  let blending = false;
  function setView(v) {
    if (v === 'first' && !me()) v = 'orbit';
    if (v === 'overview') v = 'orbit';
    mode = v;
    look = { yaw: 0, pitch: -0.1 };
    lookBase = me()?.target?.yaw ?? 0;
    blending = true;
    if (v === 'orbit') {
      const m = me();
      if (m) {
        const d = m.root.position.clone().sub(CENTER); d.y = 0;
        orbit.yaw = Math.atan2(d.x, d.z) || 0;
        orbit.dist = Math.max(8, d.length() + 4.5); orbit.height = 4.5;
      } else { orbit.yaw = 0; orbit.dist = 12.5; orbit.height = 6.5; }
    }
    if (me()) me().root.visible = true;   // wird in der Ich-Sicht ausgeblendet, sobald die Kamera im Kopf ist
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
      if (k >= 1) { const done = transition.done; transition = null; setView('first'); blending = false; done(); }
    } else if (mode === 'first') {
      const eye = eyeOf(me());
      const lt = eye.clone().add(dirFrom(lookBase + look.yaw, look.pitch));
      if (blending) {
        // weich aus dem Rundumblick zurück in den Kopf fahren
        camera.position.lerp(eye, Math.min(1, dt * 5));
        camLookTarget.lerp(lt, Math.min(1, dt * 5));
        if (camera.position.distanceTo(eye) < 0.03) blending = false;
      } else { camera.position.copy(eye); camLookTarget.copy(lt); }
      if (me()) me().root.visible = camera.position.distanceTo(eye) > 0.6;
      camera.lookAt(camLookTarget);
    } else {
      // Rundumblick um das ganze Spielfeld
      const want = new THREE.Vector3(CENTER.x + Math.sin(orbit.yaw) * orbit.dist, orbit.height, CENTER.z + Math.cos(orbit.yaw) * orbit.dist);
      const lt = new THREE.Vector3(CENTER.x, 0.9, CENTER.z);
      const k = Math.min(1, dt * (blending ? 4 : 12));
      camera.position.lerp(want, k);
      camLookTarget.lerp(lt, k);
      if (camera.position.distanceTo(want) < 0.05) blending = false;
      camera.lookAt(camLookTarget);
    }
  }

  // ----- Umschauen per Wischen, Antippen von Figuren -----
  const el = renderer.domElement;
  let drag = null;
  const pointers = new Map();
  let pinch = null;
  el.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    el.setPointerCapture(e.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: orbit.dist };
      drag = null; return;
    }
    drag = { sx: e.clientX, sy: e.clientY, yaw: look.yaw, pitch: look.pitch, oyaw: orbit.yaw, oh: orbit.height, moved: 0 };
  });
  el.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2 && mode === 'orbit') {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      orbit.dist = Math.max(4, Math.min(28, pinch.dist * pinch.d / d));
      return;
    }
    if (!drag) return;
    const w = el.clientWidth || 1;
    const dx = (e.clientX - drag.sx) / w, dy = (e.clientY - drag.sy) / w;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
    if (mode === 'first') {
      look.yaw = Math.max(-1.3, Math.min(1.3, drag.yaw + dx * 2.6));
      look.pitch = Math.max(-0.6, Math.min(0.35, drag.pitch + dy * 1.6));
    } else if (mode === 'orbit') {
      orbit.yaw = drag.oyaw - dx * 4.5;                                   // einmal ganz herum
      orbit.height = Math.max(1.4, Math.min(16, drag.oh + dy * 12));
    }
  });
  const endPointer = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (e.type === 'pointerup' && drag && drag.moved < 8) tapAt(e);
    if (!pointers.size) drag = null;
  };
  el.addEventListener('pointerup', endPointer);
  el.addEventListener('pointercancel', endPointer);
  el.addEventListener('wheel', e => {
    if (mode !== 'orbit') return;
    e.preventDefault();
    orbit.dist = Math.max(4, Math.min(28, orbit.dist * (1 + e.deltaY * 0.001)));
  }, { passive: false });

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
      const pk = pickableSet.has(ch.token) && !ch.cur;
      ch.halo.visible = pk;
      if (pk) { const s = 0.85 + Math.sin(time * 5) * 0.15; ch.halo.scale.set(s, s, 1); }
      const camDist = camera.position.distanceTo(ch.label.getWorldPosition(_v));
      ch.label.visible = camDist > 2.6;
      ch.bubble.visible = !!ch.bubbleText && camDist > 1.4;
      // Nachbarn in der Nähe schauen zu einem herüber
      let headYaw = 0;
      if (mode === 'first' && ch.token !== meToken && !ch.cur) {
        const hp = ch.head.getWorldPosition(_v);
        const dx = camera.position.x - hp.x, dz = camera.position.z - hp.z;
        if (dx * dx + dz * dz < 9) headYaw = Math.max(-1.3, Math.min(1.3, angDiff(ch.yaw, Math.atan2(dx, dz))));
      }
      ch.head.rotation.y += (headYaw - ch.head.rotation.y) * Math.min(1, dt * 4);
      ch.arrow.visible = ch.token === turnToken;
      if (ch.arrow.visible) { ch.arrow.position.y = 2.6 + Math.sin(time * 4) * 0.08; ch.arrow.rotation.y += dt * 2; }
    }
    world.update(dt, time, camera);
    updateCamera(dt);
    renderer.render(scene, camera);
  }
  loop();

  function dispose() {
    cancelAnimationFrame(raf); ro.disconnect();
    renderer.dispose(); el.remove();
  }

  // Sprechblase über einer Person setzen (null = ausblenden)
  function setBubble(token, text) {
    const ch = chars[token];
    if (!ch || ch.bubbleText === (text || null)) return;
    ch.bubbleText = text || null;
    if (ch.bubble.material.map) ch.bubble.material.map.dispose();
    if (!text) { ch.bubble.material.map = null; return; }
    const { tex, aspect } = bubbleTexture(text);
    ch.bubble.material.map = tex; ch.bubble.material.needsUpdate = true;
    ch.bubble.scale.set(2.6, 2.6 * aspect, 1);
  }

  // Agentenmodus für die eigene Sicht: Himmel und Licht werden rot und düster
  let agentMood = false;
  function setAgentMode(on) {
    if (agentMood === !!on) return;
    agentMood = !!on; world.setMood(agentMood);
  }

  return { update, playEntrance, setView, getView: () => mode, setBubble, setAgentMode, dispose };
}
