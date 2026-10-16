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

// ===== Darstellung =====
export function loadFaces(urls) {
  return urls.map(url => {
    const f = { img: new Image(), ok: false };
    f.img.onload = () => { f.ok = true; };
    f.img.src = url;
    return f;
  });
}

export function drawGame(ctx, g, size, faces) {
  const c = size / GRID;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#1a3d24' : '#163520';
      ctx.fillRect(x * c, y * c, c, c);
    }
  }

  // Hindernisse
  for (const o of g.obstacles) {
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(o.x * c, o.y * c, c, c);
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(o.x * c + c * 0.2, o.y * c + c * 0.2, c * 0.6, c * 0.6);
  }

  // Schlange
  g.snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#4ade80' : (i % 2 ? '#22c55e' : '#16a34a');
    ctx.fillRect(s.x * c + 1, s.y * c + 1, c - 2, c - 2);
  });
  // Augen
  const h = g.snake[0];
  const [dx, dy] = VEC[g.dir];
  ctx.fillStyle = '#052e16';
  const cx = h.x * c + c / 2, cy = h.y * c + c / 2;
  const px = -dy * c * 0.2, py = dx * c * 0.2;
  const fx = dx * c * 0.15, fy = dy * c * 0.15;
  ctx.beginPath(); ctx.arc(cx + px + fx, cy + py + fy, c * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx - px + fx, cy - py + fy, c * 0.09, 0, Math.PI * 2); ctx.fill();

  // Futter: Gesicht anstelle des Apfels (Fallback: roter Apfel, solange kein Foto geladen ist)
  if (g.food) {
    const ax = (g.food.x + 0.5) * c, ay = (g.food.y + 0.5) * c, r = c * 0.72;
    const face = faces && faces[g.face % faces.length];
    if (face && face.ok) {
      const im = face.img;
      const h = c * 2.2, w = h * im.width / im.height; // gut 2 Felder hoch, Seitenverhältnis bleibt
      // heller Schein dahinter, damit das Gesicht auf dem dunklen Feld auffällt
      const glow = ctx.createRadialGradient(ax, ay, 0, ax, ay, h * 0.6);
      glow.addColorStop(0, 'rgba(253,224,71,0.55)');
      glow.addColorStop(1, 'rgba(253,224,71,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(ax, ay, h * 0.6, 0, Math.PI * 2); ctx.fill();
      // am Rand nicht abschneiden: Bild ins Spielfeld schieben
      const dx = Math.min(Math.max(ax - w / 2, 0), size - w);
      const dy = Math.min(Math.max(ay - h / 2, 0), size - h);
      ctx.drawImage(im, dx, dy, w, h);
      return;
    }
    ctx.fillStyle = '#dc2626';
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.fill();
    {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(ax - r * 0.3, ay - r * 0.3, r * 0.25, 0, Math.PI * 2); ctx.fill();
    }
    // Blatt
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.ellipse(ax + r * 0.3, ay - r * 0.95, r * 0.3, r * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();
  }
}
