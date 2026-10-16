// ===== Snake – Bildschirm, Steuerung, Tutorial, Aufnahme & Wiedergabe =====
import { createGame, step, speedFor, drawGame, loadFaces, DIR } from './snake.js';

// Fotos der Veranstalter (in den Ordner "faces" im Repo hochladen)
export const FACE_URLS = ['faces/face1.png', 'faces/face2.png'];

const CSS = `
.sg-overlay *{box-sizing:border-box}
.sg-overlay{position:fixed;inset:0;background:#0b1410;z-index:1000;display:flex;flex-direction:column;
  align-items:center;color:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  touch-action:none;user-select:none;-webkit-user-select:none}
.sg-top{width:100%;max-width:520px;display:flex;justify-content:space-between;align-items:center;padding:10px 14px;font-weight:600}
.sg-top .sg-mode{font-size:.85rem;opacity:.75;font-weight:500}
.sg-canvas-wrap{position:relative}
.sg-canvas-wrap canvas{display:block;border-radius:8px;box-shadow:0 0 0 2px #14532d}
.sg-msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;background:rgba(5,20,10,.82);border-radius:8px;padding:18px;gap:10px}
.sg-msg h2{margin:0;font-size:1.4rem}
.sg-msg p{margin:0;line-height:1.45;font-size:.95rem;max-width:320px}
.sg-msg .sg-big{font-size:4rem;font-weight:800}
.sg-btn{font-size:1rem;padding:11px 18px;border-radius:10px;border:none;background:#16a34a;color:#fff;cursor:pointer;font-weight:600}
.sg-btn.sec{background:#374151}
.sg-pad{flex:1;width:100%;max-width:420px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);
  gap:8px;padding:12px 24px 22px;min-height:190px;max-height:34vh}
.sg-pad button{border:none;border-radius:14px;background:#1f3d2b;color:#bbf7d0;font-size:1.8rem;
  touch-action:none;cursor:pointer}
.sg-pad button:active,.sg-pad button.on{background:#22c55e;color:#052e16}
.sg-pad .up{grid-column:2;grid-row:1}.sg-pad .left{grid-column:1;grid-row:2}
.sg-pad .right{grid-column:3;grid-row:2}.sg-pad .down{grid-column:2;grid-row:3}
.sg-close{position:absolute;top:8px;right:10px;background:none;border:none;color:#f0fdf4;font-size:1.6rem;cursor:pointer}
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
  { title: 'Snake 🐍', text: 'Steuere die Schlange und friss so viele Äpfel wie möglich. Jeder Apfel = 1 Punkt.' },
  { title: 'Steuerung', text: 'Unten sind die Pfeiltasten: hoch, links, rechts, runter. Du kannst auch auf dem Spielfeld wischen.' },
  { title: 'Vorsicht!', text: 'Nicht gegen den Rand, dich selbst oder graue Mauern fahren. Im echten Spiel wird es mit jedem Apfel schneller, und alle 3 Äpfel taucht eine neue Mauer auf.' },
  { title: 'Übungsrunde', text: 'Jetzt kannst du in Ruhe üben – das zählt noch nicht. Wenn du bereit bist, startest du deinen einen echten Versuch.' }
];

// ---------- Spielen (Kapitän) ----------
// onFinish({score, replay}) wird nach dem echten Versuch aufgerufen
export function playSnake({ onFinish, onClose, testMode = false }) {
  injectCss();
  const faces = loadFaces(FACE_URLS);

  const ov = document.createElement('div');
  ov.className = 'sg-overlay';
  ov.innerHTML = `
    <div class="sg-top"><span class="sg-mode">Tutorial</span><span>🍎 <span class="sg-score">0</span></span></div>
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

  function render() { drawGame(ctx, game, size, faces); scoreEl.textContent = game.score; }

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
        <button class="sg-btn" data-a="next">${page < TUTORIAL.length - 1 ? 'Weiter' : 'Üben!'}</button>
      </div>`);
    msg.querySelector('[data-a=next]').onclick = () => {
      if (page < TUTORIAL.length - 1) { page++; showTutorial(); } else startPractice();
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
    official = true; modeEl.textContent = 'ECHTER VERSUCH';
    const seed = Math.floor(Math.random() * 1e9);
    game = createGame(seed);
    recording = { seed, inputs: [] };
    queue = []; render();
    countdown(() => { timer = setTimeout(loop, speedFor(game)); });
  }

  function gameOver() {
    if (!official) {
      showMsg(`<h2>Übung vorbei</h2><p>Du hattest ${game.score} 🍎.</p>
        <p>Dein echter Versuch zählt für die Wahlreihenfolge – du hast nur <strong>einen</strong>.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
          <button class="sg-btn sec" data-a="again">Nochmal üben</button>
          <button class="sg-btn" data-a="go">Echten Versuch starten</button>
        </div>`);
      msg.querySelector('[data-a=again]').onclick = startPractice;
      msg.querySelector('[data-a=go]').onclick = () => {
        showMsg(`<h2>Bereit?</h2><p>Es gibt nur diesen einen Versuch. Er wird aufgezeichnet und alle können ihn sich im Leaderboard ansehen.</p>
          <div style="display:flex;gap:8px"><button class="sg-btn sec" data-a="no">Doch noch üben</button>
          <button class="sg-btn" data-a="yes">Los!</button></div>`);
        msg.querySelector('[data-a=no]').onclick = startPractice;
        msg.querySelector('[data-a=yes]').onclick = startOfficial;
      };
      return;
    }
    recording.ticks = game.tick;
    const score = game.score;
    showMsg(`<h2>Game Over</h2><div class="sg-big">${score} 🍎</div><p>Wird gespeichert…</p>`);
    Promise.resolve(onFinish({ score, replay: recording })).then(() => {
      showMsg(testMode
        ? `<h2>Test beendet</h2><div class="sg-big">${score} 🍎</div>
           <p>Testmodus: nichts wurde gespeichert.</p><button class="sg-btn" data-a="close">Fertig</button>`
        : `<h2>Gespeichert!</h2><div class="sg-big">${score} 🍎</div>
           <p>Dein Versuch ist jetzt im Leaderboard.</p><button class="sg-btn" data-a="close">Fertig</button>`);
      msg.querySelector('[data-a=close]').onclick = close;
    }).catch(err => {
      showMsg(`<h2>Fehler beim Speichern</h2><p>${err.message}</p><p>Bitte Seite NICHT schließen und dem Organisator Bescheid geben. Score: ${score}</p>`);
    });
  }

  function close() {
    clearTimeout(timer);
    window.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    ov.remove();
    onClose && onClose();
  }

  showTutorial();
}

// ---------- Wiedergabe (Leaderboard) ----------
export function playReplay({ name, score, replay }) {
  injectCss();
  const faces = loadFaces(FACE_URLS);
  const ov = document.createElement('div');
  ov.className = 'sg-overlay';
  ov.style.justifyContent = 'center';
  ov.innerHTML = `
    <button class="sg-close">✕</button>
    <div class="sg-top"><span>${name.replace(/</g, '&lt;')}</span><span>🍎 <span class="sg-score">0</span> / ${score}</span></div>
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

  function start() {
    clearTimeout(timer);
    msg.style.display = 'none';
    game = createGame(replay.seed); idx = 0;
    drawGame(ctx, game, size, faces); scoreEl.textContent = 0;
    timer = setTimeout(loop, 600);
  }
  function loop() {
    let d = null;
    if (idx < replay.inputs.length && replay.inputs[idx] === game.tick) { d = replay.inputs[idx + 1]; idx += 2; }
    step(game, d);
    drawGame(ctx, game, size, faces); scoreEl.textContent = game.score;
    if (!game.alive) {
      msg.innerHTML = `<h2>Game Over</h2><div class="sg-big">${game.score} 🍎</div>`;
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
    clearTimeout(timer); document.body.style.overflow = ''; ov.remove();
  };
  start();
}
