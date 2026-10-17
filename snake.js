// ===== Snake – Spiellogik (deterministisch, damit Runden exakt als Replay abspielbar sind) =====
export const GRID = 20;
export const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
const VEC = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Zufallsgenerator mit Startwert: gleicher Seed + gleiche Eingaben = exakt gleiches Spiel
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGame(seed, { practice = false } = {}) {
  const g = {
    rand: mulberry32(seed),
    snake: [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }],
    dir: DIR.RIGHT,
    food: null,
    face: 0,
    eaten: [],        // gefressene Gesichter in Reihenfolge – hängen hinten an der Schlange
    obstacles: [],
    score: 0,
    tick: 0,
    alive: true,
    practice
  };
  placeFood(g);
  return g;
}

function isBlocked(g, x, y) {
  return g.snake.some(s => s.x === x && s.y === y)
    || g.obstacles.some(o => o.x === x && o.y === y)
    || (g.food && g.food.x === x && g.food.y === y);
}

function dist(a, x, y) { return Math.abs(a.x - x) + Math.abs(a.y - y); }

function randomFreeCell(g, minDistFromHead) {
  const head = g.snake[0];
  for (let i = 0; i < 500; i++) {
    const x = Math.floor(g.rand() * GRID);
    const y = Math.floor(g.rand() * GRID);
    if (isBlocked(g, x, y)) continue;
    if (dist(head, x, y) < minDistFromHead) continue;
    return { x, y };
  }
  return null;
}

function placeFood(g) {
  g.food = null;
  g.food = randomFreeCell(g, 2);
  g.face = Math.floor(g.rand() * 2); // welches Gesicht auf dem Apfel ist
}

// Kleines Mauerstück (1–3 Felder), nie direkt vor dem Kopf
function addObstacle(g) {
  const start = randomFreeCell(g, 5);
  if (!start) return;
  const horizontal = g.rand() < 0.5;
  const len = 1 + Math.floor(g.rand() * 3);
  const head = g.snake[0];
  for (let i = 0; i < len; i++) {
    const x = start.x + (horizontal ? i : 0);
    const y = start.y + (horizontal ? 0 : i);
    if (x >= GRID || y >= GRID || isBlocked(g, x, y) || dist(head, x, y) < 4) break;
    g.obstacles.push({ x, y });
  }
}

// Ein Spielschritt. newDir = neue Richtung oder null
export function step(g, newDir) {
  if (!g.alive) return;
  if (newDir != null && newDir !== (g.dir + 2) % 4) g.dir = newDir;
  const [dx, dy] = VEC[g.dir];
  const head = g.snake[0];
  const nx = head.x + dx, ny = head.y + dy;
  g.tick++;

  if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) { g.alive = false; return; }
  const eating = g.food && g.food.x === nx && g.food.y === ny;
  const body = eating ? g.snake : g.snake.slice(0, -1);
  if (body.some(s => s.x === nx && s.y === ny) || g.obstacles.some(o => o.x === nx && o.y === ny)) {
    g.alive = false; return;
  }

  g.snake.unshift({ x: nx, y: ny });
  if (eating) {
    g.score++;
    g.eaten.push(g.face);
    if (!g.practice && g.score % 3 === 0) addObstacle(g); // alle 3 Äpfel ein neues Hindernis
    placeFood(g);
  } else {
    g.snake.pop();
  }
}

// Millisekunden pro Schritt – wird mit jedem Apfel schneller
export function speedFor(g) {
  if (g.practice) return 170;
  return Math.max(70, 170 - g.score * 5);
}

// ===== Darstellung (winterlich) =====
export function loadFaces(urls) {
  return urls.map(url => {
    const f = { img: new Image(), ok: false };
    f.img.onload = () => { f.ok = true; };
    f.img.src = url;
    return f;
  });
}
// Kopf der Schlange: Foto des Kapitäns (freigestellt)
export function loadHead(url) {
  const f = { img: new Image(), ok: false };
  if (url) { f.img.onload = () => { f.ok = true; }; f.img.src = url; }
  return f;
}

// Schneeflocken (nur Optik, beeinflusst das Spiel nicht)
const FLAKES = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, v: 0.03 + Math.random() * 0.05, w: Math.random() * 6 }));

function drawImageFit(ctx, img, cx, cy, h) {
  const w = h * img.width / img.height;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  return w;
}

// Weihnachtsmütze über einem Kopf mit Mittelpunkt (cx, top) und Breite w
function santaHat(ctx, cx, top, w, lean) {
  const h = w * 0.85;
  ctx.save();
  ctx.translate(cx, top);
  ctx.rotate(lean);
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(-w * 0.46, 0);
  ctx.quadraticCurveTo(-w * 0.1, -h * 0.9, w * 0.42, -h * 0.82);   // Zipfel nach hinten
  ctx.quadraticCurveTo(w * 0.2, -h * 0.45, w * 0.46, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.beginPath(); ctx.moveTo(w * 0.1, -h * 0.2); ctx.quadraticCurveTo(w * 0.25, -h * 0.5, w * 0.42, -h * 0.82); ctx.quadraticCurveTo(w * 0.22, -h * 0.4, w * 0.46, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';                                            // Fellrand
  ctx.beginPath(); ctx.roundRect(-w * 0.55, -h * 0.12, w * 1.1, h * 0.24, h * 0.12); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.44, -h * 0.84, w * 0.13, 0, Math.PI * 2); ctx.fill();   // Bommel
  ctx.restore();
}

export function drawGame(ctx, g, size, faces, head, timeS = 0) {
  const c = size / GRID;

  // Schneefeld
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    ctx.fillStyle = (x + y) % 2 ? '#d9e8f7' : '#cddff2';
    ctx.fillRect(x * c, y * c, c, c);
  }
  // kleine Tannen in den Ecken als Deko (blockieren nichts)
  ctx.globalAlpha = 0.18;
  for (const [tx, ty] of [[0.6, 0.6], [19.4, 0.6], [0.6, 19.4], [19.4, 19.4]]) {
    ctx.fillStyle = '#166534';
    ctx.beginPath(); ctx.moveTo(tx * c, ty * c - c * 0.7); ctx.lineTo(tx * c + c * 0.5, ty * c + c * 0.5); ctx.lineTo(tx * c - c * 0.5, ty * c + c * 0.5); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Hindernisse: Eisblöcke
  for (const o of g.obstacles) {
    const x = o.x * c, y = o.y * c;
    ctx.fillStyle = '#7dd3fc'; ctx.fillRect(x + 1, y + 1, c - 2, c - 2);
    ctx.fillStyle = '#bae6fd'; ctx.fillRect(x + 1, y + 1, c - 2, c * 0.35);
    ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1.5, y + 1.5, c - 3, c - 3);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(x + c * 0.18, y + c * 0.18, c * 0.18, c * 0.5);
  }

  // Futter: Gesicht mit goldenem Schein (Fallback: rote Christbaumkugel)
  if (g.food) {
    const ax = (g.food.x + 0.5) * c, ay = (g.food.y + 0.5) * c;
    const face = faces && faces[g.face % faces.length];
    const pulse = 1 + Math.sin(timeS * 5) * 0.06;
    const glow = ctx.createRadialGradient(ax, ay, 0, ax, ay, c * 1.4);
    glow.addColorStop(0, 'rgba(250,204,21,.6)'); glow.addColorStop(1, 'rgba(250,204,21,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ax, ay, c * 1.4, 0, Math.PI * 2); ctx.fill();
    if (face && face.ok) {
      const h = c * 2.0 * pulse, w = h * face.img.width / face.img.height;
      const dx = Math.min(Math.max(ax - w / 2, 0), size - w), dy = Math.min(Math.max(ay - h / 2, 0), size - h);
      ctx.drawImage(face.img, dx, dy, w, h);
    } else {
      const r = c * 0.62 * pulse;
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(ax, ay + c * 0.08, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(ax - r * 0.35, ay - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#facc15'; ctx.fillRect(ax - c * 0.14, ay - r - c * 0.05, c * 0.28, c * 0.18);
    }
  }

  // Körper: rot-weiß geringelter Schal durch alle Glieder
  const pts = g.snake.map(s => [(s.x + 0.5) * c, (s.y + 0.5) * c]);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = pts.length - 1; i > 0; i--) {
    ctx.strokeStyle = i % 2 ? '#dc2626' : '#ffffff';
    ctx.lineWidth = c * 0.78;
    ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i - 1][0], pts[i - 1][1]); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(15,23,42,.18)'; ctx.lineWidth = 1;

  // Gefressene Gesichter hängen hinten an (ältestes ganz am Schwanz)
  const n = g.snake.length;
  for (let k = 0; k < g.eaten.length && k < n - 1; k++) {
    const seg = g.snake[n - 1 - k];
    if (n - 1 - k < 2) break;                       // die zwei Glieder hinter dem Kopf bleiben Schal
    const f = faces && faces[g.eaten[k] % faces.length];
    const sx = (seg.x + 0.5) * c, sy = (seg.y + 0.5) * c;
    if (f && f.ok) drawImageFit(ctx, f.img, sx, sy, c * 1.35);
    else { ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(sx, sy, c * 0.42, 0, Math.PI * 2); ctx.fill(); }
  }

  // Kopf: Foto des Kapitäns mit Weihnachtsmütze
  const hd = g.snake[0];
  const hx = (hd.x + 0.5) * c, hy = (hd.y + 0.5) * c;
  const [vx] = VEC[g.dir];
  const H = c * 1.9;
  ctx.save();
  ctx.translate(hx, hy);
  if (vx < 0) ctx.scale(-1, 1);                      // nach links schauen: spiegeln statt auf den Kopf stellen
  let hw;
  if (head && head.ok) {
    hw = drawImageFit(ctx, head.img, 0, 0, H);
  } else {
    hw = H * 0.78;
    ctx.fillStyle = '#f0c4a0'; ctx.beginPath(); ctx.arc(0, 0, hw / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.beginPath(); ctx.arc(hw * 0.14, -hw * 0.06, hw * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hw * 0.34, -hw * 0.06, hw * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hw * 0.22, hw * 0.08, hw * 0.16, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  santaHat(ctx, 0, -H * 0.36, Math.min(hw, H * 0.85) * 0.95, -0.12);
  ctx.restore();

  // Schneefall
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  for (const f of FLAKES) {
    const y = ((f.y + timeS * f.v) % 1) * size, x = (f.x * size + Math.sin(timeS + f.w) * 6 + size) % size;
    ctx.beginPath(); ctx.arc(x, y, f.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(148,163,184,.35)';
}
