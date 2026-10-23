// ===== Snake – Bildschirm, Steuerung, Tutorial, Aufnahme & Wiedergabe =====
import { createGame, step, speedFor, drawGame, loadFaces, loadHead, DIR } from './snake.js?v=20261023a';

// Fotos der Veranstalter (in den Ordner "faces" im Repo hochladen)
export const FACE_URLS = ['faces/face1.png', 'faces/face2.png'];

const CSS = `
.sg-overlay *{box-sizing:border-box}
.sg-overlay{position:fixed;inset:0;background:linear-gradient(#0c1b33,#16325c);z-index:1000;display:flex;flex-direction:column;
  align-items:center;color:#f0f9ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  touch-action:none;user-select:none;-webkit-user-select:none}
.sg-top{width:100%;max-width:520px;display:flex;justify-content:space-between;align-items:center;padding:10px 14px;font-weight:600}
.sg-top .sg-mode{font-size:.85rem;opacity:.75;font-weight:500}
.sg-canvas-wrap{position:relative}
.sg-canvas-wrap canvas{display:block;border-radius:10px;box-shadow:0 0 0 3px #fff,0 0 0 6px #dc2626,0 8px 30px rgba(0,0,0,.4)}
.sg-msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;background:rgba(12,27,51,.84);border-radius:10px;padding:18px;gap:10px}
.sg-msg h2{margin:0;font-size:1.4rem}
.sg-msg p{margin:0;line-height:1.45;font-size:.95rem;max-width:320px}
.sg-msg .sg-big{font-size:4rem;font-weight:800}
.sg-btn{font-size:1rem;padding:11px 18px;border-radius:10px;border:none;background:#dc2626;color:#fff;cursor:pointer;font-weight:600}
.sg-btn.sec{background:#334155}
.sg-pad{flex:1;width:100%;max-width:420px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);
  gap:8px;padding:12px 24px 22px;min-height:190px;max-height:34vh}
.sg-pad button{border:none;border-radius:14px;background:rgba(255,255,255,.12);color:#e0f2fe;font-size:1.8rem;
  touch-action:none;cursor:pointer}
.sg-pad button:active,.sg-pad button.on{background:#e0f2fe;color:#0c1b33}
.sg-pad .up{grid-column:2;grid-row:1}.sg-pad .left{grid-column:1;grid-row:2}
.sg-pad .right{grid-column:3;grid-row:2}.sg-pad .down{grid-column:2;grid-row:3}
.sg-close{position:absolute;top:8px;right:10px;background:none;border:none;color:#f0f9ff;font-size:1.6rem;cursor:pointer}
`;

function injectCss() {
  if (document.getElementById('sg-css')) return;
  const s = document.createElement('style');
  s.id = 'sg-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

function canvasSize() {
  const w = Math.min(window.innerWidth - 24, 500);
  const h = window.innerHeight * 0.56;
  return Math.floor(Math.min(w, h) / 20) * 20;
}

function setupCanvas(canvas) {
  const size = canvasSize();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, size };
}

const TUTORIAL = [
  { title: 'Winter-Snake', text: 'Du bist der Kopf der Schlange – mit Weihnachtsmütze! Sammle so viele Gesichter wie möglich. Jedes Gesicht = 1 Punkt und hängt sich hinten an deine Schlange.' },
  { title: 'Steuerung', text: 'Unten sind die Pfeiltasten: hoch, links, rechts, runter. Du kannst auch auf dem Spielfeld wischen.' },
  { title: 'Vorsicht!', text: 'Nicht gegen den Rand, dich selbst oder Eisblöcke fahren. Im echten Spiel wird es mit jedem Gesicht schneller, und alle 3 Gesichter taucht ein neuer Eisblock auf.' },
  { title: 'Übungsrunde', text: 'Jetzt kannst du in Ruhe üben – das zählt noch nicht. Wenn du bereit bist, startest du einen echten Versuch. Dein bester echter Versuch zählt.' }
];

// ---------- Spielen (Kapitän) ----------
// onFinish({score, replay}) wird nach jedem echten Versuch aufgerufen.
// attempts: Anzahl echter Versuche (Infinity = beliebig oft), best: bisher bester Score,
// skipTutorial: wer schon gespielt hat, landet direkt im Menü (Tutorial dort weiter abrufbar).
export function playSnake({ onFinish, onClose, testMode = false, photoUrl = null, attempts = 1, best = null, skipTutorial = false }) {
  injectCss();
  const faces = loadFaces(FACE_URLS);
  const head = loadHead(photoUrl);

  const ov = document.createElement('div');
  ov.className = 'sg-overlay';
  ov.innerHTML = `
    <div class="sg-top"><span class="sg-mode">Tutorial</span><span>🎅 <span class="sg-score">0</span></span></div>
    <div class="sg-canvas-wrap"><canvas></canvas><div class="sg-msg"></div></div>
    <div class="sg-pad">
      <button class="up" data-d="0">▲</button><button class="left" data-d="3">◀</button>
      <button class="right" data-d="1">▶</button><button class="down" data-d="2">▼</button>
    </div>`;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';

  const canvas = ov.querySelector('canvas');
  const msg = ov.querySelector('.sg-msg');
  const scoreEl = ov.querySelector('.sg-score');
  const modeEl = ov.querySelector('.sg-mode');
  let { ctx, size } = setupCanvas(canvas);

  let game = null, timer = null, queue = [], recording = null, official = false;
  let left = attempts, bestScore = best;
  const leftTxt = () => left === Infinity ? 'beliebig viele echte Versuche, der beste zählt' : `noch <strong>${left}</strong> echte${left === 1 ? 'r' : ''} Versuch${left === 1 ? '' : 'e'}`;

  // ---- Eingabe ----
  function input(d) {
    if (!game || !game.alive) return;
    const last = queue.length ? queue[queue.length - 1] : game.dir;
    if (d === last || d === (last + 2) % 4) return;
    if (queue.length < 3) queue.push(d);
  }
  ov.querySelectorAll('.sg-pad button').forEach(b => {
    const d = Number(b.dataset.d);
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('on'); input(d); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => b.classList.remove('on')));
  });
  const keyMap = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3 };
  function onKey(e) { if (e.key in keyMap) { e.preventDefault(); input(keyMap[e.key]); } }
  window.addEventListener('keydown', onKey);
  let sx = 0, sy = 0;
  canvas.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  canvas.addEventListener('pointerup', e => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIR.RIGHT : DIR.LEFT) : (dy > 0 ? DIR.DOWN : DIR.UP));
  });

  // Bild läuft durchgehend (Schneefall, pulsierendes Gesicht); die Spiellogik tickt separat
  let raf = 0;
  const t0 = performance.now();
  function frame() { raf = requestAnimationFrame(frame); if (game) drawGame(ctx, game, size, faces, head, (performance.now() - t0) / 1000); }
  raf = requestAnimationFrame(frame);
  function render() { scoreEl.textContent = game.score; }

  function loop() {
    const d = queue.length ? queue.shift() : null;
    if (official && d != null) recording.inputs.push(game.tick, d);
    step(game, d);
    render();
    if (!game.alive) { clearTimeout(timer); timer = null; return gameOver(); }
    timer = setTimeout(loop, speedFor(game));
  }

  function showMsg(html) { msg.innerHTML = html; msg.style.display = 'flex'; }
  function hideMsg() { msg.style.display = 'none'; }

  function countdown(then) {
    let n = 3;
    const tickDown = () => {
      if (n === 0) { hideMsg(); return then(); }
      showMsg(`<div class="sg-big">${n}</div>`); n--; setTimeout(tickDown, 750);
    };
    tickDown();
  }

  // ---- Tutorial ----
  let page = 0;
  function showTutorial() {
    modeEl.textContent = 'Tutorial';
    game = createGame(1, { practice: true }); render();
    const p = TUTORIAL[page];
    showMsg(`<h2>${p.title}</h2><p>${p.text}</p>
      <div style="display:flex;gap:8px">
        ${page > 0 ? '<button class="sg-btn sec" data-a="back">Zurück</button>' : ''}
        <button class="sg-btn" data-a="next">${page < TUTORIAL.length - 1 ? 'Weiter' : 'Verstanden!'}</button>
      </div>`);
    msg.querySelector('[data-a=next]').onclick = () => {
      if (page < TUTORIAL.length - 1) { page++; showTutorial(); } else menu();
    };
    const back = msg.querySelector('[data-a=back]');
    if (back) back.onclick = () => { page--; showTutorial(); };
  }

  function startPractice() {
    official = false; modeEl.textContent = 'Übungsrunde (zählt nicht)';
    game = createGame(Math.floor(Math.random() * 1e9), { practice: true });
    queue = []; render();
    countdown(() => { timer = setTimeout(loop, speedFor(game)); });
  }

  function startOfficial() {
    if (left <= 0) return menu();
    left--;
    official = true; modeEl.textContent = 'ECHTER VERSUCH';
    const seed = Math.floor(Math.random() * 1e9);
    game = createGame(seed);
    recording = { seed, inputs: [] };
    queue = []; render();
    countdown(() => { timer = setTimeout(loop, speedFor(game)); });
  }

  // Menü zwischen den Runden: echter Versuch, Tutorial, fertig (keine Übungsrunden mehr – man hat einen ganzen Tag Zeit)
  function menu(head = '') {
    modeEl.textContent = 'Winter-Snake';
    const canPlay = left > 0;
    showMsg(`${head || '<h2>Winter-Snake 🎅</h2>'}
      ${bestScore != null ? `<p>Dein bester Versuch: <strong>${bestScore} 🎅</strong></p>` : ''}
      <p>${canPlay ? `Du hast ${leftTxt()}.` : 'Du hast keine echten Versuche mehr.'}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
        ${canPlay ? '<button class="sg-btn" data-a="go">▶ Direkt spielen</button>' : ''}
        <button class="sg-btn sec" data-a="tut">📖 Tutorial ansehen</button>
        <button class="sg-btn sec" data-a="close">Fertig</button>
      </div>`);
    msg.querySelector('[data-a=go]')?.addEventListener('click', () => {
      showMsg(`<h2>Bereit?</h2><p>Dieser Versuch zählt und wird aufgezeichnet. Die besten Versuche kann man sich im Leaderboard ansehen.</p>
        <div style="display:flex;gap:8px"><button class="sg-btn sec" data-a="no">Zurück</button>
        <button class="sg-btn" data-a="yes">Los!</button></div>`);
      msg.querySelector('[data-a=no]').onclick = () => menu();
      msg.querySelector('[data-a=yes]').onclick = startOfficial;
    });
    msg.querySelector('[data-a=tut]').onclick = () => { page = 0; showTutorial(); };
    msg.querySelector('[data-a=close]').onclick = close;
  }

  function gameOver() {
    if (!official) return menu(`<h2>Übung vorbei</h2><p>Du hattest ${game.score} 🎅 (zählt nicht).</p>`);
    recording.ticks = game.tick;
    const score = game.score;
    official = false;
    showMsg(`<h2>Game Over</h2><div class="sg-big">${score} 🎅</div><p>Wird gespeichert…</p>`);
    Promise.resolve(onFinish({ score, replay: recording })).then(() => {
      const record = bestScore == null || score > bestScore;
      if (record) bestScore = score;
      menu(`<h2>${testMode ? 'Test: ' : ''}${score} 🎅</h2><p>${testMode ? 'Testmodus: nichts wurde gespeichert.' : record ? '🎉 Neue Bestleistung, ist jetzt im Leaderboard!' : 'Gespeichert. Deine Bestleistung bleibt im Leaderboard.'}</p>`);
    }).catch(err => {
      showMsg(`<h2>Fehler beim Speichern</h2><p>${err.message}</p><p>Bitte Seite NICHT schließen und dem Organisator Bescheid geben. Score: ${score}</p>`);
    });
  }

  function close() {
    clearTimeout(timer); cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    ov.remove();
    onClose && onClose();
  }

  if (skipTutorial) menu(); else showTutorial();
}

// ---------- Wiedergabe (Leaderboard) ----------
export function playReplay({ name, score, replay, photoUrl = null }) {
  injectCss();
  const faces = loadFaces(FACE_URLS);
  const head = loadHead(photoUrl);
  const ov = document.createElement('div');
  ov.className = 'sg-overlay';
  ov.style.justifyContent = 'center';
  ov.innerHTML = `
    <button class="sg-close">✕</button>
    <div class="sg-top"><span>${name.replace(/</g, '&lt;')}</span><span>🎅 <span class="sg-score">0</span> / ${score}</span></div>
    <div class="sg-canvas-wrap"><canvas></canvas><div class="sg-msg" style="display:none"></div></div>
    <div style="display:flex;gap:8px;padding:16px">
      <button class="sg-btn sec" data-a="speed">Tempo: 1×</button>
      <button class="sg-btn" data-a="restart">↺ Von vorn</button>
    </div>`;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';

  const canvas = ov.querySelector('canvas');
  const msg = ov.querySelector('.sg-msg');
  const scoreEl = ov.querySelector('.sg-score');
  const { ctx, size } = setupCanvas(canvas);
  let timer = null, speed = 1, game, idx;
  let raf = 0; const t0 = performance.now();
  function frame() { raf = requestAnimationFrame(frame); if (game) drawGame(ctx, game, size, faces, head, (performance.now() - t0) / 1000); }
  raf = requestAnimationFrame(frame);

  function start() {
    clearTimeout(timer);
    msg.style.display = 'none';
    game = createGame(replay.seed); idx = 0;
    scoreEl.textContent = 0;
    timer = setTimeout(loop, 600);
  }
  function loop() {
    let d = null;
    if (idx < replay.inputs.length && replay.inputs[idx] === game.tick) { d = replay.inputs[idx + 1]; idx += 2; }
    step(game, d);
    scoreEl.textContent = game.score;
    if (!game.alive) {
      msg.innerHTML = `<h2>Game Over</h2><div class="sg-big">${game.score} 🎅</div>`;
      msg.style.display = 'flex';
      return;
    }
    timer = setTimeout(loop, speedFor(game) / speed);
  }

  ov.querySelector('[data-a=restart]').onclick = start;
  ov.querySelector('[data-a=speed]').onclick = e => {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    e.target.textContent = `Tempo: ${speed}×`;
  };
  ov.querySelector('.sg-close').onclick = () => {
    clearTimeout(timer); cancelAnimationFrame(raf); document.body.style.overflow = ''; ov.remove();
  };
  start();
}
