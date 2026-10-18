// ===== Biathlon-Sprint: Bildschirm, Tutorial, "Ready Player One", Steuerung, Wiedergabe =====
import {
  createLevel, createSim, step, replayRunner, draw, loadAssets, elapsedMs, target, scaleFor,
  DT, TICKS_PER_SEC, IN_LEFT, IN_RIGHT, IN_JUMP, IN_DOWN, TYPES
} from './biathlon-core.js?v=20261018b';

const CSS = `
.bg-ov{position:fixed;inset:0;background:#0b1220;z-index:1000;display:flex;flex-direction:column;align-items:center;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#f8fafc;touch-action:none;user-select:none;-webkit-user-select:none}
.bg-ov *{box-sizing:border-box}
.bg-top{width:100%;max-width:900px;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;font-weight:600;font-size:.9rem}
.bg-top .m{opacity:.75;font-weight:500}
.bg-wrap{position:relative;width:100%;max-width:900px}
.bg-wrap canvas{display:block;width:100%}
.bg-msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  background:rgba(8,15,30,.82);padding:18px;gap:10px}
.bg-msg h2{margin:0;font-size:1.35rem}
.bg-msg p{margin:0;line-height:1.45;font-size:.95rem;max-width:360px}
.bg-msg ul{margin:0;padding-left:18px;text-align:left;max-width:360px;font-size:.92rem;line-height:1.5}
.bg-btn{font-size:1rem;padding:11px 18px;border-radius:10px;border:none;background:#2563eb;color:#fff;cursor:pointer;font-weight:600}
.bg-btn.sec{background:#374151}
.bg-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.bg-rpo{font-family:"Courier New",ui-monospace,monospace;font-weight:900;letter-spacing:.08em;text-transform:uppercase;
  color:#fde047;text-shadow:0 0 8px #f59e0b,0 0 22px #ef4444,0 0 40px #7c3aed}
.bg-rpo.small{font-size:1.4rem}.bg-rpo.big{font-size:3.4rem}
.bg-pad{flex:1;width:100%;max-width:900px;display:flex;justify-content:space-between;align-items:stretch;gap:12px;
  padding:12px 16px calc(16px + env(safe-area-inset-bottom));min-height:150px;max-height:30vh}
.bg-pad .lr{display:flex;gap:10px;flex:1.3}
.bg-pad .ud{display:flex;flex-direction:column;gap:10px;flex:1}
.bg-pad button{border:none;border-radius:16px;background:#1e293b;color:#cbd5e1;font-size:2rem;touch-action:none;cursor:pointer;flex:1}
.bg-pad button.on{background:#38bdf8;color:#0b1220}
.bg-pad button.off{opacity:.3}
.bg-pad .jump{background:#7c2d12;color:#fed7aa}
.bg-pad .jump.on{background:#f97316;color:#1c0a00}
.bg-pad .duck{background:#1e3a8a;color:#bfdbfe}
.bg-pad .duck.on{background:#60a5fa;color:#0b1220}
.bg-close{position:absolute;top:6px;right:10px;background:none;border:none;color:#fff;font-size:1.6rem;cursor:pointer;z-index:2}
`;
function injectCss() {
  if (document.getElementById('bg-css')) return;
  const s = document.createElement('style'); s.id = 'bg-css'; s.textContent = CSS; document.head.appendChild(s);
}
const fmtTime = ms => { const t = ms / 1000; return `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`; };
export const formatBiathlon = r => !r?.played ? '–' : r.finished
  ? `${fmtTime(r.timeMs)}${r.route === 'rueck' ? ' ↩' : ''}` : `nicht im Ziel (${r.score}/${r.target})`;
// Sortierwert fürs Leaderboard: kleiner ist besser (im Ziel nach Zeit, sonst nach geschafften Hindernissen)
export const biathlonRank = r => !r?.played ? Infinity : r.finished ? r.timeMs : 1e9 - (r.score || 0);

function setupCanvas(canvas, wrap) {
  const W = Math.min(window.innerWidth, 900);
  const H = Math.max(220, Math.min(window.innerHeight - 260, W * 0.95, 520));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, W, H };
}

const TUTORIAL_PAGES = [
  { t: 'Biathlon-Sprint ⛷️', h: `<p><b>◀ ▶</b> fahren, <b>▲</b> springen, <b>▼</b> hinlegen – du rutschst dabei weiter und kannst gleichzeitig fahren.</p><p>Auf Schnee gleitest du weiter, wenn du loslässt. Gegenrichtung = bremsen.</p>` },
  { t: 'Hindernisse', h: `<p>Berührst du ein Hindernis, <b>stürzt</b> du und brauchst <b>2 Sekunden</b> zum Aufstehen.</p><p>Im Training gibt es Schneehaufen und Hürden. Im echten Lauf warten noch andere Hindernisse, die du selbst herausfinden musst.</p>` },
  { t: 'Wertung', h: `<p>Überwinde alle Hindernisse bis ins Ziel. <b>Gewertet wird deine Zeit</b> – je schneller, desto weiter oben im Leaderboard und desto früher darfst du wählen.</p>` },
  { t: 'Training', h: `<p>Übe so oft du willst, danach startest du deinen <b>einen echten Versuch</b>.</p>` }
];

// ---------- Spielen ----------
export function playBiathlon({ onFinish, onClose, testMode = false, photoUrl = null } = {}) {
  injectCss();
  const assets = loadAssets(photoUrl);
  const ov = document.createElement('div');
  ov.className = 'bg-ov';
  ov.innerHTML = `<div class="bg-top"><span>⛷️ Biathlon-Sprint</span><span class="m"></span></div>
    <div class="bg-wrap"><canvas></canvas><div class="bg-msg"></div></div>
    <div class="bg-pad"><div class="lr"><button data-k="1">◀</button><button data-k="2">▶</button></div>
      <div class="ud"><button class="jump" data-k="4">▲</button><button class="duck" data-k="8">▼</button></div></div>`;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
  const canvas = ov.querySelector('canvas'), msg = ov.querySelector('.bg-msg'), modeEl = ov.querySelector('.bg-top .m');
  let { g, W, H } = setupCanvas(canvas);
  const onResize = () => { ({ g, W, H } = setupCanvas(canvas)); };
  window.addEventListener('resize', onResize);

  // ----- Eingabe: jede Taste ein eigener Finger, mehrere gleichzeitig möglich -----
  let mask = 0;
  const held = new Map();
  ov.querySelectorAll('.bg-pad button').forEach(b => {
    const k = Number(b.dataset.k);
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); held.set(e.pointerId, k); mask |= k; b.classList.add('on'); });
    const up = e => { held.delete(e.pointerId); mask &= ~k; for (const v of held.values()) mask |= v; b.classList.remove('on'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  });
  const keyMap = { ArrowLeft: IN_LEFT, a: IN_LEFT, ArrowRight: IN_RIGHT, d: IN_RIGHT, ArrowUp: IN_JUMP, w: IN_JUMP, ' ': IN_JUMP, ArrowDown: IN_DOWN, s: IN_DOWN };
  const kd = e => { if (e.key in keyMap) { e.preventDefault(); mask |= keyMap[e.key]; } };
  const ku = e => { if (e.key in keyMap) { e.preventDefault(); mask &= ~keyMap[e.key]; } };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

  // ----- Spielschleife mit festem Zeitschritt -----
  let sim = null, level = null, running = false, recording = null, official = false;
  let cam = 0, camOff = 0, acc = 0, lastT = 0, raf = 0, clockS = 0;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (t - (lastT || t)) / 1000); lastT = t; clockS += dt;
    if (sim && running) {
      acc += dt;
      while (acc >= DT && !sim.finished) {
        if (official && mask !== recording.last) { recording.inputs.push(sim.tick, mask); recording.last = mask; }
        step(sim, mask); acc -= DT;
      }
      if (sim.finished) { running = false; finish(); }
    }
    if (sim) {
      const viewW = W / scaleFor(W, H);
      camOff += ((sim.facing > 0 ? 0.3 : -0.3) * viewW - camOff) * Math.min(1, dt * 3);
      cam += (sim.x + camOff - cam) * Math.min(1, dt * 8);
      draw(g, sim, W, H, cam, assets, clockS);
    }
  }
  raf = requestAnimationFrame(frame);

  const show = html => { msg.innerHTML = html; msg.style.display = 'flex'; };
  const hide = () => { msg.style.display = 'none'; };
  function newRun(kind) {
    level = createLevel(kind); sim = createSim(level);
    const viewW = W / scaleFor(W, H); camOff = 0.3 * viewW; cam = sim.x + camOff;
  }

  // ----- Tutorial -----
  let page = 0;
  function tutorial() {
    modeEl.textContent = 'Tutorial';
    if (!sim) newRun('tutorial');
    const p = TUTORIAL_PAGES[page];
    show(`<h2>${p.t}</h2>${p.h}<div class="bg-row">
      ${page ? '<button class="bg-btn sec" data-a="back">Zurück</button>' : ''}
      <button class="bg-btn" data-a="next">${page < TUTORIAL_PAGES.length - 1 ? 'Weiter' : 'Training starten'}</button></div>`);
    msg.querySelector('[data-a=next]').onclick = () => { if (page < TUTORIAL_PAGES.length - 1) { page++; tutorial(); } else practice(); };
    const b = msg.querySelector('[data-a=back]'); if (b) b.onclick = () => { page--; tutorial(); };
  }
  function practice() {
    official = false; modeEl.textContent = 'Training (zählt nicht)';
    newRun('tutorial'); mask = 0;
    let n = 3;
    const tick = () => { if (!n) { hide(); running = true; acc = 0; return; } show(`<div class="bg-rpo big">${n}</div>`); n--; setTimeout(tick, 600); };
    tick();
  }

  // ----- Echter Versuch: "Ready Player One" -----
  function readyPlayerOne() {
    official = true; modeEl.textContent = 'ECHTER VERSUCH';
    newRun('main'); mask = 0;
    recording = { level: 'main', inputs: [], last: -1 };
    // "Ready Player:" bleibt die ganze Zeit oben stehen, darunter wechseln One (4 s), Two, Three
    const rp = n => `<div class="bg-rpo small" style="font-size:2rem">Ready Player:</div><div class="bg-rpo big">${n}</div>`;
    const seq = [[rp('One'), 4000], [rp('Two'), 900], [rp('Three'), 0]];
    let i = 0;
    const next = () => {
      const [html, ms] = seq[i++];
      show(html);
      if (ms) setTimeout(next, ms);
      else { running = true; acc = 0; setTimeout(hide, 650); }   // auf "Three" geht's los
    };
    next();
  }

  function finish() {
    const s = sim;
    if (!official) {
      show(`<h2>${s.dnf ? 'Zeit abgelaufen' : 'Training geschafft! 🎉'}</h2>
        <p>Zeit: <b>${fmtTime(elapsedMs(s))}</b> · Stürze: ${s.falls}</p>
        <p>Dein echter Versuch zählt für die Wahlreihenfolge – du hast nur <b>einen</b>.</p>
        <div class="bg-row"><button class="bg-btn sec" data-a="again">Nochmal üben</button>
        <button class="bg-btn" data-a="go">Echten Versuch starten</button></div>`);
      msg.querySelector('[data-a=again]').onclick = practice;
      msg.querySelector('[data-a=go]').onclick = () => {
        show(`<h2>Bereit?</h2><p>Nur dieser eine Versuch zählt. Er wird aufgezeichnet und alle können ihn im Leaderboard ansehen.</p>
          <div class="bg-row"><button class="bg-btn sec" data-a="no">Doch noch üben</button><button class="bg-btn" data-a="yes">Los!</button></div>`);
        msg.querySelector('[data-a=no]').onclick = practice;
        msg.querySelector('[data-a=yes]').onclick = readyPlayerOne;
      };
      return;
    }
    const result = {
      played: true, finished: !s.dnf, timeMs: elapsedMs(s), score: s.score, target: target(s),
      route: s.route < 0 ? 'rueck' : 'vor', falls: s.falls, penaltyMs: s.penaltyMs,
      replay: { level: 'main', inputs: recording.inputs, ticks: s.tick }
    };
    const summary = `<div class="bg-rpo big" style="font-size:2.6rem">${s.dnf ? 'Zeit um' : fmtTime(result.timeMs)}</div>
      <p>${s.score}/${result.target} Hindernisse · Stürze: ${s.falls}${s.penaltyMs ? ` · Strafe +${s.penaltyMs / 1000} s` : ''}${result.route === 'rueck' ? '<br>↩️ Geheime Rückwärtsstrecke gefunden!' : ''}</p>`;
    show(`<h2>${s.dnf ? 'Nicht im Ziel' : 'Im Ziel! 🏁'}</h2>${summary}<p>Wird gespeichert …</p>`);
    Promise.resolve(onFinish?.(result)).then(() => {
      show(`<h2>${testMode ? 'Test beendet' : 'Gespeichert!'}</h2>${summary}
        <p>${testMode ? 'Testmodus: nichts wurde gespeichert.' : 'Dein Lauf ist jetzt im Leaderboard.'}</p>
        <button class="bg-btn" data-a="close">Fertig</button>`);
      msg.querySelector('[data-a=close]').onclick = close;
    }).catch(err => show(`<h2>Fehler beim Speichern</h2><p>${err.message}</p><p>Bitte Seite NICHT schließen und dem Organisator Bescheid geben. Zeit: ${fmtTime(result.timeMs)}</p>`));
  }

  function close() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    window.removeEventListener('resize', onResize);
    document.body.style.overflow = '';
    ov.remove(); onClose?.();
  }

  newRun('tutorial');
  tutorial();
}

// ---------- Wiedergabe fürs Leaderboard ----------
export function playBiathlonReplay({ name, result, photoUrl = null }) {
  injectCss();
  const assets = loadAssets(photoUrl);
  const ov = document.createElement('div');
  ov.className = 'bg-ov'; ov.style.justifyContent = 'center';
  ov.innerHTML = `<button class="bg-close">✕</button>
    <div class="bg-top"><span>⛷️ ${String(name).replace(/</g, '&lt;')}</span><span class="m">${formatBiathlon(result)}</span></div>
    <div class="bg-wrap"><canvas></canvas><div class="bg-msg" style="display:none"></div></div>
    <div class="bg-row" style="padding:14px"><button class="bg-btn sec" data-a="speed">Tempo: 1×</button><button class="bg-btn" data-a="restart">↺ Von vorn</button></div>`;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
  const canvas = ov.querySelector('canvas'), msg = ov.querySelector('.bg-msg');
  let { g, W, H } = setupCanvas(canvas);
  let runner, cam = 0, camOff = 0, acc = 0, lastT = 0, raf = 0, speed = 1, clockS = 0, done = false;
  function start() {
    runner = replayRunner(createLevel(result.replay.level || 'main'), result.replay.inputs);
    const viewW = W / scaleFor(W, H); camOff = 0.3 * viewW; cam = camOff; acc = 0; done = false;
    msg.style.display = 'none';
  }
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (t - (lastT || t)) / 1000); lastT = t; clockS += dt;
    const s = runner.s;
    if (!done) {
      acc += dt * speed;
      while (acc >= DT && !s.finished && s.tick < result.replay.ticks) { runner.step(); acc -= DT; }
      if (s.finished || s.tick >= result.replay.ticks) {
        done = true;
        msg.innerHTML = `<h2>${s.dnf ? 'Nicht im Ziel' : 'Im Ziel! 🏁'}</h2><div class="bg-rpo big" style="font-size:2.4rem">${formatBiathlon(result)}</div>`;
        msg.style.display = 'flex';
      }
    }
    const viewW = W / scaleFor(W, H);
    camOff += ((s.facing > 0 ? 0.3 : -0.3) * viewW - camOff) * Math.min(1, dt * 3 * speed);
    cam += (s.x + camOff - cam) * Math.min(1, dt * 8 * speed);
    draw(g, s, W, H, cam, assets, clockS);
  }
  ov.querySelector('[data-a=restart]').onclick = start;
  ov.querySelector('[data-a=speed]').onclick = e => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; e.target.textContent = `Tempo: ${speed}×`; };
  ov.querySelector('.bg-close').onclick = () => { cancelAnimationFrame(raf); document.body.style.overflow = ''; ov.remove(); };
  start();
  raf = requestAnimationFrame(frame);
}
