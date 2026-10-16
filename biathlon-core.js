// ===== Biathlon-Sprint: Spiellogik (deterministisch) und Zeichnen =====
// Feste Zeitschritte (60 pro Sekunde) und eine feste Strecke: Gleiche Eingaben ergeben exakt
// denselben Lauf. Darum lassen sich Versuche als Wiedergabe abspielen.
//
// Die Strecke geht vom Start (x = 0) in beide Richtungen:
//   nach rechts: 25 Hindernisse bis zum Ziel
//   nach links:  die geheime Rückwärtsstrecke ("Ready Player One"), nur 12 Hindernisse
// Welche Strecke zählt, entscheidet das erste überwundene Hindernis.

export const DT = 1 / 60;
export const TICKS_PER_SEC = 60;
export const IN_LEFT = 1, IN_RIGHT = 2, IN_JUMP = 4;
export const PW = 0.6, PH = 1.6;            // Spielerbreite/-höhe (Meter)
export const TIME_LIMIT_S = 180;           // danach gilt der Lauf als nicht beendet

const ACC = 15, AIR_ACC = 8, BRAKE = 32, FRICTION = 2.6, VMAX = 9.5;
const JUMP_V = 11.2, GRAVITY = 30;
const FALL_TICKS = 2 * TICKS_PER_SEC;      // 2 Sekunden am Boden nach einem Sturz
const RANGE_HOLD_TICKS = 60;               // 1 Sekunde stillstehen am Schießstand
const RANGE_PENALTY_MS = 5000;             // Strafrunde

// Hindernistypen: Breite in Metern, Name, Hinweis
export const TYPES = {
  mound:  { w: 1.4, name: 'Schneehaufen', tip: 'Drüberspringen' },
  hurdle: { w: 0.35, name: 'Hürde', tip: 'Drüberspringen' },
  stairs: { w: 5.5, name: 'Eisblock-Treppe', tip: 'Stufe für Stufe hochspringen' },
  gap:    { w: 2.6, name: 'Gletscherspalte', tip: 'Mit Anlauf drüberspringen' },
  ball:   { w: 0.9, name: 'Schneeball', tip: 'Rollt auf dich zu – rechtzeitig springen' },
  branch: { w: 1.6, name: 'Tiefes Banner', tip: 'NICHT springen, einfach drunter durch' },
  range:  { w: 3.2, name: 'Schießstand', tip: '1 Sekunde anhalten, sonst Strafrunde +5 s' }
};

// Eigene Bilder für Hindernisse: Datei in den Ordner "biathlon/" laden, dann ersetzt sie den Platzhalter.
export const OBSTACLE_IMAGES = {
  mound: 'biathlon/schneehaufen.png', hurdle: 'biathlon/huerde.png', stairs: 'biathlon/treppe.png',
  gap: 'biathlon/spalte.png', ball: 'biathlon/schneeball.png', branch: 'biathlon/banner.png', range: 'biathlon/schiessstand.png'
};

const FORWARD = ['mound', 'hurdle', 'mound', 'stairs', 'hurdle', 'gap', 'mound', 'branch', 'hurdle', 'ball',
  'range', 'stairs', 'gap', 'hurdle', 'branch', 'ball', 'mound', 'gap', 'stairs', 'range',
  'hurdle', 'branch', 'ball', 'gap', 'hurdle'];
const BACKWARD = ['gap', 'ball', 'branch', 'stairs', 'hurdle', 'range', 'gap', 'branch', 'ball', 'stairs', 'gap', 'hurdle'];
const TUTORIAL = ['mound', 'hurdle', 'mound', 'mound', 'hurdle', 'hurdle'];

function lay(seq, dir, firstAt) {
  const out = [];
  let d = firstAt;                        // Abstand vom Start
  seq.forEach((type, i) => {
    const w = TYPES[type].w;
    const x0 = dir > 0 ? d : -d - w, x1 = x0 + w;
    out.push({ id: (dir > 0 ? 'f' : 'b') + i, type, dir, x0, x1 });
    const extra = type === 'gap' || type === 'range' || type === 'stairs' ? 3 : 0;
    d += w + 9 + extra + (i % 3) * 1.5;   // etwas unregelmäßig, damit es nicht monoton wird
  });
  return { obstacles: out, finish: dir * (d + 2) };
}

export function createLevel(kind) {
  if (kind === 'tutorial') {
    const f = lay(TUTORIAL, 1, 9);
    return { kind, obstacles: f.obstacles, finishF: f.finish, finishB: null, targetF: TUTORIAL.length, targetB: null,
      minX: -3.5, maxX: f.finish + 6, leftLocked: true };
  }
  const f = lay(FORWARD, 1, 10), b = lay(BACKWARD, -1, 10);
  return { kind, obstacles: [...f.obstacles, ...b.obstacles], finishF: f.finish, finishB: b.finish,
    targetF: FORWARD.length, targetB: BACKWARD.length, minX: b.finish - 6, maxX: f.finish + 6, leftLocked: false };
}

// Treppe: 5 Eisblöcke (hoch und wieder runter), auf denen man stehen kann
function stairBlocks(o) {
  const hs = [0.8, 1.6, 2.4, 1.6, 0.8], bw = TYPES.stairs.w / hs.length;
  return hs.map((h, i) => ({ x0: o.x0 + i * bw, x1: o.x0 + (i + 1) * bw, top: h }));
}

export function createSim(level) {
  const obstacles = level.obstacles.map(o => ({
    ...o, passed: false,
    blocks: o.type === 'stairs' ? stairBlocks(o) : null,
    bx: (o.x0 + o.x1) / 2, home: (o.x0 + o.x1) / 2, rolling: false, gone: false, spin: 0,   // Schneeball
    hold: 0, shot: false, penalized: false                                                   // Schießstand
  }));
  return {
    level, obstacles, tick: 0, x: 0, y: 0, vx: 0, vy: 0, grounded: true, facing: 1,
    coyote: 0, jumpBuf: 0, prevJump: false, fallen: 0, falls: 0, stride: 0,
    route: 0, score: 0, penaltyMs: 0, finished: false, finishTick: 0, dnf: false,
    msgs: []
  };
}

export const target = s => s.route < 0 ? s.level.targetB : s.level.targetF;
export const elapsedMs = s => Math.round((s.finished ? s.finishTick : s.tick) * DT * 1000) + s.penaltyMs;

function say(s, text, secs = 1.6) { s.msgs.push({ text, until: s.tick + secs * TICKS_PER_SEC }); }

function overlaps(ax0, ax1, ay0, ay1, bx0, bx1, by0, by1) { return ax0 < bx1 && ax1 > bx0 && ay0 < by1 && ay1 > by0; }

function fall(s, o) {
  s.fallen = FALL_TICKS; s.falls++;
  s.vx = 0; s.vy = 0; s.y = 0; s.grounded = true;
  const fromLeft = o.type === 'ball' ? s.x < o.bx : s.x < (o.x0 + o.x1) / 2;
  if (o.type === 'ball') s.x = fromLeft ? o.bx - 0.45 - PW / 2 - 0.25 : o.bx + 0.45 + PW / 2 + 0.25;
  else s.x = fromLeft ? o.x0 - PW / 2 - 0.3 : o.x1 + PW / 2 + 0.3;
  say(s, o.type === 'gap' ? '🕳️ In die Spalte gefallen!' : '💥 Gestürzt!');
}

function groundTop(s, x, prevY) {
  // Boden (0), außer über einer Spalte; dazu Eisblöcke, auf denen man landen kann
  let top = 0;
  for (const o of s.obstacles) {
    if (o.type === 'gap' && x - PW * 0.15 > o.x0 && x + PW * 0.15 < o.x1) top = -Infinity;
  }
  for (const o of s.obstacles) {
    if (!o.blocks) continue;
    for (const b of o.blocks) {
      if (x + PW / 2 - 0.06 > b.x0 && x - PW / 2 + 0.06 < b.x1 && prevY >= b.top - 0.02) top = Math.max(top, b.top);
    }
  }
  return top;
}

// Ein Zeitschritt. mask = gedrückte Tasten (IN_LEFT | IN_RIGHT | IN_JUMP)
export function step(s, mask) {
  if (s.finished) return;
  s.tick++;
  const L = s.level;
  let left = !!(mask & IN_LEFT), right = !!(mask & IN_RIGHT);
  const jump = !!(mask & IN_JUMP);
  const jumpPressed = jump && !s.prevJump;
  s.prevJump = jump;
  if (L.leftLocked) left = false;
  s.msgs = s.msgs.filter(m => m.until > s.tick);

  // Schneebälle rollen los, sobald man in die Nähe kommt (immer dem Spieler entgegen)
  for (const o of s.obstacles) {
    if (o.type !== 'ball' || o.gone) continue;
    if (!o.rolling && Math.abs(s.x - o.home) < 14) o.rolling = true;
    if (o.rolling) {
      o.bx += -o.dir * 3.0 * DT; o.spin += 3.0 * DT / 0.45;
      if (Math.abs(o.bx - o.home) > 16) o.gone = true;
    }
  }

  if (s.fallen > 0) {
    s.fallen--;
    if (s.fallen === 0) say(s, 'Weiter geht\'s!', 0.8);
  } else {
    // ----- waagerecht: beschleunigen, bremsen, gleiten -----
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir !== 0) {
      s.facing = dir;
      if (s.vx !== 0 && Math.sign(s.vx) !== dir && s.grounded) s.vx += dir * BRAKE * DT;
      else s.vx += dir * (s.grounded ? ACC : AIR_ACC) * DT;
    } else if (s.grounded) {
      const f = Math.min(Math.abs(s.vx), FRICTION * DT);
      s.vx -= Math.sign(s.vx) * f;
    }
    s.vx = Math.max(-VMAX, Math.min(VMAX, s.vx));

    // ----- Sprung (mit kurzer Vorab-Eingabe und "Coyote-Zeit") -----
    if (jumpPressed) s.jumpBuf = 6;
    if (s.jumpBuf > 0) {
      s.jumpBuf--;
      if (s.grounded || s.coyote > 0) { s.vy = JUMP_V; s.grounded = false; s.coyote = 0; s.jumpBuf = 0; }
    }
  }

  // ----- Bewegung x mit festen Eisblöcken und Streckenrand -----
  let nx = s.x + s.vx * DT;
  for (const o of s.obstacles) {
    if (!o.blocks) continue;
    for (const b of o.blocks) {
      if (s.y < b.top - 0.03 && s.y + PH > 0) {
        if (s.x + PW / 2 <= b.x0 + 0.001 && nx + PW / 2 > b.x0) { nx = b.x0 - PW / 2; s.vx = 0; }
        if (s.x - PW / 2 >= b.x1 - 0.001 && nx - PW / 2 < b.x1) { nx = b.x1 + PW / 2; s.vx = 0; }
      }
    }
  }
  if (nx < L.minX) { nx = L.minX; s.vx = 0; }
  if (nx > L.maxX) { nx = L.maxX; s.vx = 0; }
  s.x = nx;
  s.stride += Math.abs(s.vx) * DT;

  // ----- Bewegung y -----
  const prevY = s.y;
  s.vy -= GRAVITY * DT;
  let ny = s.y + s.vy * DT;
  const top = groundTop(s, s.x, prevY);
  if (ny <= top) { ny = top; s.vy = 0; if (!s.grounded) s.grounded = true; s.coyote = 6; }
  else { if (s.grounded) s.coyote = 6; s.grounded = false; if (s.coyote > 0) s.coyote--; }
  s.y = ny;

  // ----- Gefahren -----
  if (s.fallen === 0) {
    const px0 = s.x - PW / 2 + 0.08, px1 = s.x + PW / 2 - 0.08, py0 = s.y, py1 = s.y + PH;
    for (const o of s.obstacles) {
      let hit = false;
      if (o.type === 'mound') hit = overlaps(px0, px1, py0, py1, o.x0 + 0.2, o.x1 - 0.2, 0, 0.55);
      else if (o.type === 'hurdle') hit = overlaps(px0, px1, py0, py1, o.x0, o.x1, 0, 1.05);
      else if (o.type === 'branch') hit = overlaps(px0, px1, py0, py1, o.x0, o.x1, 1.75, 2.4);
      else if (o.type === 'ball' && !o.gone) hit = overlaps(px0, px1, py0, py1, o.bx - 0.36, o.bx + 0.36, 0, 0.78);
      else if (o.type === 'gap') hit = s.y < -0.9 && s.x > o.x0 - 1 && s.x < o.x1 + 1;
      if (hit) { fall(s, o); break; }
    }
  }

  // ----- Schießstand: stillstehen = Treffer -----
  for (const o of s.obstacles) {
    if (o.type !== 'range' || o.shot) continue;
    const inside = s.x > o.x0 && s.x < o.x1;
    if (inside && s.grounded && Math.abs(s.vx) < 0.8 && s.fallen === 0) {
      o.hold++;
      if (o.hold >= RANGE_HOLD_TICKS) { o.shot = true; say(s, '🎯 5 von 5 Treffern!'); }
    } else if (!inside) o.hold = 0;
  }

  // ----- überwundene Hindernisse zählen -----
  if (s.fallen === 0) {
    for (const o of s.obstacles) {
      if (o.passed || (s.route && s.route !== o.dir)) continue;
      const ref = o.type === 'ball' ? (o.dir > 0 ? o.bx + 0.45 : o.bx - 0.45) : (o.dir > 0 ? o.x1 : o.x0);
      const past = o.dir > 0 ? s.x - PW / 2 > ref : s.x + PW / 2 < ref;
      if (!past) continue;
      o.passed = true;
      if (!s.route) {
        s.route = o.dir;
        if (o.dir < 0) say(s, '↩️ Geheime Rückwärtsstrecke! Nur ' + L.targetB + ' Hindernisse', 2.6);
      }
      s.score++;
      if (o.type === 'range' && !o.shot && !o.penalized) {
        o.penalized = true; s.penaltyMs += RANGE_PENALTY_MS; say(s, '⏱️ Nicht angehalten: Strafrunde +5 s', 2.2);
      }
      if (s.score >= target(s)) { s.finished = true; s.finishTick = s.tick; say(s, '🏁 Ziel!', 3); }
    }
  }

  if (!s.finished && s.tick >= TIME_LIMIT_S * TICKS_PER_SEC) { s.finished = true; s.dnf = true; s.finishTick = s.tick; }
}

// Wiedergabe: inputs = [tick, mask, tick, mask, ...] (Maske gilt ab diesem Tick)
export function replayRunner(level, inputs) {
  const s = createSim(level);
  let i = 0, mask = 0;
  return {
    s,
    step() {
      while (i < inputs.length && inputs[i] <= s.tick) { mask = inputs[i + 1]; i += 2; }
      step(s, mask);
    }
  };
}

// ======================= Zeichnen =======================
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(7);
const MOUNTAINS = Array.from({ length: 40 }, (_, i) => ({ x: i * 30 - 600, h: 6 + R() * 7, w: 20 + R() * 16 }));
const TREES = Array.from({ length: 120 }, (_, i) => ({ x: i * 7.3 - 440 + R() * 4, h: 2.2 + R() * 1.6 }));

export function loadAssets(photoUrl) {
  const img = {};
  for (const [k, url] of Object.entries(OBSTACLE_IMAGES)) {
    const im = new Image(); im.onload = () => { img[k] = im; }; im.src = url;
  }
  let face = null;
  if (photoUrl) { const im = new Image(); im.onload = () => { face = im; }; im.src = photoUrl; }
  return { img, get face() { return face; } };
}

function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// Maßstab: mindestens ~14 m Strecke sichtbar (auf schmalen Handys wird herausgezoomt)
export const scaleFor = (W, H) => Math.min(H / 8.5, W / 14);

export function draw(g, s, W, H, cam, assets, timeS) {
  const sc = scaleFor(W, H), gy = H * 0.8;
  const X = wx => (wx - cam) * sc + W / 2, Y = wy => gy - wy * sc;

  // Himmel
  const sky = g.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, '#6aa6e8'); sky.addColorStop(1, '#dcecfb');
  g.fillStyle = sky; g.fillRect(0, 0, W, gy + 2);
  g.fillStyle = 'rgba(255,250,220,.9)'; g.beginPath(); g.arc(W * 0.82, H * 0.12, sc * 0.6, 0, 7); g.fill();

  // Berge (langsam) und Bäume (mittel) für Tiefe
  for (const m of MOUNTAINS) {
    const x = (m.x - cam * 0.15) * sc * 0.5 + W / 2;
    if (x < -m.w * sc || x > W + m.w * sc) continue;
    g.fillStyle = '#9fb3cc';
    g.beginPath(); g.moveTo(x - m.w * sc * 0.5, gy); g.lineTo(x, gy - m.h * sc * 0.5); g.lineTo(x + m.w * sc * 0.5, gy); g.fill();
    g.fillStyle = '#f8fbff';
    g.beginPath(); g.moveTo(x - m.w * sc * 0.14, gy - m.h * sc * 0.36); g.lineTo(x, gy - m.h * sc * 0.5); g.lineTo(x + m.w * sc * 0.14, gy - m.h * sc * 0.36); g.fill();
  }
  for (const t of TREES) {
    const x = (t.x - cam * 0.5) * sc * 0.7 + W / 2;
    if (x < -40 || x > W + 40) continue;
    const h = t.h * sc * 0.7, b = gy - sc * 0.05;
    g.fillStyle = '#2f5d46';
    for (let k = 0; k < 3; k++) {
      g.beginPath(); g.moveTo(x - h * (0.32 - k * 0.07), b - h * k * 0.28); g.lineTo(x, b - h * (0.45 + k * 0.28)); g.lineTo(x + h * (0.32 - k * 0.07), b - h * k * 0.28); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.moveTo(x - h * 0.08, b - h * 0.9); g.lineTo(x, b - h * 1.01); g.lineTo(x + h * 0.08, b - h * 0.9); g.fill();
  }

  // Schneeboden mit Loipe, Spalten ausgeschnitten
  g.fillStyle = '#f7fbff'; g.fillRect(0, gy, W, H - gy);
  g.strokeStyle = '#c7d7ea'; g.lineWidth = 2;
  for (const dy of [0.15, 0.32]) { g.beginPath(); g.moveTo(0, gy + dy * sc); g.lineTo(W, gy + dy * sc); g.stroke(); }
  g.fillStyle = '#e1ecf8'; g.fillRect(0, gy + sc * 0.6, W, H);

  // Start, Ziel, Schilder
  const flagLine = (wx, label, color) => {
    const x = X(wx); if (x < -80 || x > W + 80) return;
    g.fillStyle = '#334155'; g.fillRect(x - 3, Y(3.4), 6, 3.4 * sc); g.fillRect(x - 3 - 2.6 * sc, Y(3.4), 6, 3.4 * sc);
    g.fillStyle = color; rrect(g, x - 2.6 * sc, Y(3.4), 2.6 * sc, 0.75 * sc, 4); g.fill();
    g.fillStyle = '#fff'; g.font = `bold ${sc * 0.42}px -apple-system,Segoe UI,Roboto,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, x - 1.3 * sc, Y(3.03));
    for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#111' : '#fff'; g.fillRect(x - 2.6 * sc + k * (2.6 * sc / 8), Y(0.02), 2.6 * sc / 8 + 1, 4); }
  };
  flagLine(1.3, 'START', '#16a34a');
  flagLine(s.level.finishF, 'ZIEL', '#dc2626');
  if (s.level.finishB != null) flagLine(s.level.finishB + 2.6, 'ZIEL', '#7c3aed');
  if (s.level.leftLocked) {   // Tutorial: Zaun links
    const x = X(s.level.minX - 0.4);
    g.fillStyle = '#92400e'; for (let k = 0; k < 4; k++) g.fillRect(x - 6 - k * 14, Y(1.2), 6, 1.2 * sc);
    g.fillRect(x - 50, Y(1.0), 56, 5); g.fillRect(x - 50, Y(0.5), 56, 5);
  } else {
    const x = X(-2.2);
    if (x > -60 && x < W + 60) {   // geheimnisvolles Schild Richtung Rückwärtsstrecke
      g.fillStyle = '#7c3aed'; rrect(g, x - sc * 0.9, Y(2.2), sc * 1.8, sc * 0.6, 4); g.fill();
      g.fillRect(x - 2, Y(1.6), 4, 1.6 * sc);
      g.fillStyle = '#fff'; g.font = `bold ${sc * 0.36}px -apple-system,Segoe UI,Roboto,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('← ???', x, Y(1.9));
    }
  }

  // Hindernisse
  for (const o of s.obstacles) drawObstacle(g, o, X, Y, sc, assets, timeS, W);

  // Spieler
  drawSkier(g, s, X(s.x), Y(s.y), sc, assets, timeS);

  // Anzeige oben
  const t = elapsedMs(s) / 1000;
  const fmt = `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  g.textBaseline = 'top';
  g.fillStyle = 'rgba(15,23,42,.72)'; rrect(g, 10, 10, 112, 34, 10); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 20px -apple-system,Segoe UI,Roboto,sans-serif'; g.textAlign = 'left';
  g.fillText('⏱ ' + fmt, 20, 17);
  const tgt = target(s);
  const label = `${s.score} / ${tgt}${s.route < 0 ? ' ↩' : ''}`;
  g.font = 'bold 20px -apple-system,Segoe UI,Roboto,sans-serif';
  const lw = g.measureText(label).width + 44;
  g.fillStyle = s.route < 0 ? 'rgba(124,58,237,.85)' : 'rgba(15,23,42,.72)'; rrect(g, W - lw - 10, 10, lw, 34, 10); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText('🚩 ' + label, W - 20, 17);
  if (s.penaltyMs) {
    g.fillStyle = '#dc2626'; g.font = 'bold 15px -apple-system,Segoe UI,Roboto,sans-serif'; g.textAlign = 'left';
    g.fillText(`+${s.penaltyMs / 1000} s Strafe`, 14, 50);
  }
  // Meldungen
  if (s.msgs.length) {
    const m = s.msgs[s.msgs.length - 1];
    g.font = 'bold 19px -apple-system,Segoe UI,Roboto,sans-serif';
    const w = Math.min(W - 20, g.measureText(m.text).width + 30);
    g.fillStyle = 'rgba(255,255,255,.94)'; rrect(g, (W - w) / 2, H * 0.17, w, 36, 18); g.fill();
    g.fillStyle = '#0f172a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(m.text, W / 2, H * 0.17 + 18, W - 30);
  }
}

function drawObstacle(g, o, X, Y, sc, assets, timeS, W) {
  const x0 = X(o.x0), x1 = X(o.x1);
  if (x1 < -120 || x0 > W + 120) return;
  const img = assets?.img?.[o.type];
  const imgBox = (wx0, wx1, top, bottom = 0) => { g.drawImage(img, X(wx0), Y(top), (wx1 - wx0) * sc, (top - bottom) * sc); };
  const done = o.passed;

  if (o.type === 'gap') {
    // Spalte: Loch im Schnee mit Eiskanten
    const gr = g.createLinearGradient(0, Y(0), 0, Y(-3));
    gr.addColorStop(0, '#60a5fa'); gr.addColorStop(1, '#0c1e3a');
    g.fillStyle = gr; g.fillRect(x0, Y(0.01), x1 - x0, 3 * sc);
    g.fillStyle = '#bfdbfe';
    for (let k = 0; k < 5; k++) { const yy = Y(-0.2 - k * 0.4); g.fillRect(x0, yy, 4, 3); g.fillRect(x1 - 4, yy + 6, 4, 3); }
    if (img) imgBox(o.x0, o.x1, 0.6, -0.4);
    return;
  }
  if (o.type === 'stairs') {
    for (const b of o.blocks) {
      if (img) { imgBox(b.x0, b.x1, b.top); continue; }
      g.fillStyle = '#bae6fd'; g.fillRect(X(b.x0), Y(b.top), (b.x1 - b.x0) * sc, b.top * sc);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.strokeRect(X(b.x0) + 1, Y(b.top) + 1, (b.x1 - b.x0) * sc - 2, b.top * sc - 2);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(X(b.x0) + 4, Y(b.top) + 4, (b.x1 - b.x0) * sc * 0.3, 4);
    }
    return;
  }
  if (img && o.type !== 'ball' && o.type !== 'range') {
    const tops = { mound: 0.7, hurdle: 1.15, branch: 2.5 }, bottoms = { branch: 1.7 };
    imgBox(o.x0, o.x1, tops[o.type], bottoms[o.type] ?? 0);
    return;
  }
  if (o.type === 'mound') {
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse((x0 + x1) / 2, Y(0), (x1 - x0) / 2, 0.62 * sc, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#dbe7f4'; g.beginPath(); g.ellipse((x0 + x1) / 2 + 0.15 * sc, Y(0), (x1 - x0) / 2.6, 0.4 * sc, 0, Math.PI, 0); g.fill();
    g.strokeStyle = '#cbd5e1'; g.lineWidth = 1.5; g.beginPath(); g.ellipse((x0 + x1) / 2, Y(0), (x1 - x0) / 2, 0.62 * sc, 0, Math.PI, 0); g.stroke();
  } else if (o.type === 'hurdle') {
    const h = 1.1 * sc, w = x1 - x0;
    for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#fff' : '#dc2626'; g.fillRect(x0, Y(1.1) + k * h / 6, w, h / 6 + 1); }
    g.strokeStyle = '#7f1d1d'; g.lineWidth = 1.5; g.strokeRect(x0, Y(1.1), w, h);
  } else if (o.type === 'branch') {
    // Banner zwischen zwei Stangen, hängt auf Kopfhöhe beim Springen
    g.fillStyle = '#475569'; g.fillRect(x0 - 3, Y(2.9), 5, 2.9 * sc); g.fillRect(x1 - 2, Y(2.9), 5, 2.9 * sc);
    g.fillStyle = '#f59e0b'; rrect(g, x0, Y(2.45), x1 - x0, 0.68 * sc, 4); g.fill();
    g.fillStyle = '#422006'; g.font = `bold ${sc * 0.26}px -apple-system,Segoe UI,Roboto,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('NICHT', (x0 + x1) / 2, Y(2.25)); g.fillText('SPRINGEN', (x0 + x1) / 2, Y(1.98));
  } else if (o.type === 'ball' && !o.gone) {
    const bx = X(o.bx), by = Y(0.45), r = 0.45 * sc;
    if (img) g.drawImage(img, bx - r, by - r, r * 2, r * 2);
    else {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill();
      g.strokeStyle = '#94a3b8'; g.lineWidth = 2; g.beginPath(); g.arc(bx, by, r, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(bx + Math.cos(o.spin) * r * 0.7, by + Math.sin(o.spin) * r * 0.7);
      g.lineTo(bx - Math.cos(o.spin) * r * 0.7, by - Math.sin(o.spin) * r * 0.7); g.stroke();
    }
    if (o.rolling) { g.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 1; k < 4; k++) g.fillRect(bx + o.dir * (r + k * 8), by + r - 4 - k, 4, 3); }
  } else if (o.type === 'range') {
    // Matte am Boden, Scheiben im Hintergrund
    g.fillStyle = o.shot ? '#16a34a' : '#22c55e'; g.fillRect(x0, Y(0.08), x1 - x0, 0.12 * sc);
    const bw = 2.8 * sc, bxc = (x0 + x1) / 2, by = Y(3.3);
    if (img) g.drawImage(img, bxc - bw / 2, by, bw, 1.2 * sc);
    else {
      g.fillStyle = '#e2e8f0'; rrect(g, bxc - bw / 2, by, bw, 0.9 * sc, 6); g.fill();
      g.fillStyle = '#1d4ed8'; rrect(g, bxc - bw / 2, by - 0.42 * sc, bw, 0.38 * sc, 4); g.fill();
      g.fillStyle = '#fff'; g.font = `bold ${sc * 0.26}px -apple-system,Segoe UI,Roboto,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('SCHIESSSTAND · ANHALTEN', bxc, by - 0.23 * sc);
      const hits = o.shot ? 5 : Math.floor(o.hold / RANGE_HOLD_TICKS * 5);
      for (let k = 0; k < 5; k++) {
        g.fillStyle = k < hits ? '#fff' : '#111827';
        g.beginPath(); g.arc(bxc - bw / 2 + bw * (k + 0.5) / 5, by + 0.45 * sc, 0.18 * sc, 0, 7); g.fill();
        g.strokeStyle = '#111827'; g.lineWidth = 1.5; g.stroke();
      }
    }
    g.fillStyle = '#475569'; g.fillRect(bxc - 3, by + 0.9 * sc, 6, Y(0) - by - 0.9 * sc);
  }
  if (done && o.type !== 'gap') {
    g.fillStyle = '#16a34a'; g.font = `bold ${sc * 0.3}px -apple-system,Segoe UI,Roboto,sans-serif`; g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText('✓', o.type === 'ball' ? X(o.bx) : (x0 + x1) / 2, Y(o.type === 'branch' ? 3.0 : o.type === 'hurdle' ? 1.2 : 0.8) - 2);
  }
}

function drawSkier(g, s, px, py, sc, assets, timeS) {
  g.save();
  g.translate(px, py);
  g.scale(s.facing, 1);
  const u = sc;
  if (s.fallen > 0) {
    // liegt im Schnee (am Ende der 2 Sekunden steht er wieder auf)
    const k = Math.min(1, (FALL_TICKS - s.fallen) / 8, s.fallen / 15);
    g.rotate(-1.45 * k);
  }
  // Ski
  g.strokeStyle = '#dc2626'; g.lineWidth = Math.max(3, u * 0.07); g.lineCap = 'round';
  const air = !s.grounded;
  const ph = s.stride * 2.2;
  const kick = s.grounded && Math.abs(s.vx) > 0.4 ? Math.sin(ph) : 0;
  g.beginPath(); g.moveTo(-0.75 * u + kick * 0.25 * u, 0); g.lineTo(0.85 * u + kick * 0.25 * u, -0.02 * u); g.stroke();
  g.beginPath(); g.moveTo(-0.75 * u - kick * 0.25 * u, -0.05 * u); g.lineTo(0.85 * u - kick * 0.25 * u, -0.07 * u); g.stroke();
  // Beine
  g.strokeStyle = '#1f2937'; g.lineWidth = u * 0.16;
  const hipY = -0.85 * u;
  g.beginPath(); g.moveTo(0, hipY); g.lineTo(kick * 0.25 * u + (air ? 0.15 * u : 0), -0.05 * u); g.stroke();
  g.beginPath(); g.moveTo(0, hipY); g.lineTo(-kick * 0.25 * u - (air ? 0.15 * u : 0), -0.08 * u); g.stroke();
  // Körper (leicht nach vorn gebeugt)
  g.save(); g.translate(0, hipY); g.rotate(0.28 + (air ? 0.15 : 0));
  g.fillStyle = '#facc15'; rrect(g, -0.2 * u, -0.62 * u, 0.4 * u, 0.66 * u, 0.15 * u); g.fill();
  g.fillStyle = '#fff'; rrect(g, -0.15 * u, -0.48 * u, 0.3 * u, 0.26 * u, 3); g.fill();
  g.fillStyle = '#111827'; g.font = `bold ${u * 0.17}px -apple-system,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.scale(s.facing, 1); g.fillText('7', 0, -0.35 * u); g.restore();
  // Gewehr auf dem Rücken
  g.strokeStyle = '#3f2a14'; g.lineWidth = u * 0.06; g.beginPath(); g.moveTo(-0.22 * u, -0.05 * u); g.lineTo(-0.05 * u, -0.75 * u); g.stroke();
  // Arme mit Stöcken
  const arm = s.grounded ? Math.sin(ph) * 0.6 : -0.8;
  g.strokeStyle = '#facc15'; g.lineWidth = u * 0.1;
  g.beginPath(); g.moveTo(0.05 * u, -0.55 * u); g.lineTo(0.05 * u + Math.sin(0.6 + arm) * 0.4 * u, -0.55 * u + Math.cos(0.6 + arm) * 0.4 * u); g.stroke();
  g.strokeStyle = '#334155'; g.lineWidth = u * 0.035;
  g.beginPath(); g.moveTo(0.05 * u + Math.sin(0.6 + arm) * 0.4 * u, -0.55 * u + Math.cos(0.6 + arm) * 0.4 * u);
  g.lineTo(0.05 * u + Math.sin(0.6 + arm) * 0.4 * u - 0.15 * u, 0.6 * u); g.stroke();
  // Kopf: Foto oder Helm mit Gesicht
  const hx = 0.03 * u, hy = -0.82 * u, hr = 0.24 * u;
  const face = assets?.face;
  if (face) {
    g.save(); g.scale(s.facing, 1);
    const h = hr * 2.6, w = h * face.width / face.height;
    g.drawImage(face, hx * s.facing - w / 2, hy - h * 0.55, w, h);
    g.restore();
  } else {
    g.fillStyle = '#f0c4a0'; g.beginPath(); g.arc(hx, hy, hr, 0, 7); g.fill();
    g.fillStyle = '#1d4ed8'; g.beginPath(); g.arc(hx, hy - 0.04 * u, hr * 1.04, Math.PI, 0); g.fill();
    g.fillStyle = '#111827'; g.beginPath(); g.arc(hx + 0.1 * u, hy + 0.02 * u, 0.03 * u, 0, 7); g.fill();
    g.fillStyle = '#0f172a'; rrect(g, hx - 0.02 * u, hy - 0.06 * u, 0.26 * u, 0.07 * u, 3); g.fill();  // Brille
  }
  g.restore();
  g.restore();
  if (s.fallen > 0) {   // Sterne
    for (let k = 0; k < 3; k++) {
      const a = timeS * 4 + k * 2.1;
      g.fillStyle = '#facc15'; g.font = `${u * 0.32}px sans-serif`; g.textAlign = 'center';
      g.fillText('★', px + Math.cos(a) * 0.5 * u, py - 0.55 * u + Math.sin(a) * 0.18 * u);
    }
  }
}
