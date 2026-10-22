// ===== Dialoge im Stil von Rollenspielen (Baldur's Gate) =====
// Links stehen die beiden Gastgeber, rechts das Agentenbild der Person, die gerade spielt.
// Unten läuft der Text; antippen = weiter. Bei Zeilen von "ich" kann man eine Antwort wählen (1., 2., …).
//
// ---------- HIER ANPASSEN ----------
// Bilder: einfach Dateien mit diesen Namen in den Ordner dialog/ legen. Fehlt eine Datei, wird der Ersatz genommen.
export const SPRECHER = {
  a: { name: 'Orga 1', bild: 'dialog/sprecher1.png', ersatz: 'faces/face1.png' },
  b: { name: 'Orga 2', bild: 'dialog/sprecher2.png', ersatz: 'faces/face2.png' }
};
export const HINTERGRUND = 'dialog/hintergrund.jpg';      // fehlt sie: Schneelandschaft mit dem Eis-Pokal
const HINTERGRUND_ERSATZ = 'agents/welt/eispokal_vorne.png';

// Platzhalter im Text: {name} = Vorname der Person, {snakeBonus}, {guessBonus}, {biathlonVersuche}
// Zeile: { s: 'a' | 'b', t: 'Text' }  ·  Antwort der Person: { s: 'ich', wahl: ['Antwort 1', 'Antwort 2'] }
// Jede Sequenz läuft für jede Person genau einmal (beim ersten Mal in der jeweiligen Phase).
export const DIALOGE = {
  // nach dem ersten Video, bevor man in die Halle einläuft
  intro: [
    { s: 'a', t: 'Willkommen, {name}. Schön, dass du es zu den Haeckelschen Wintergames geschafft hast.' },
    { s: 'b', t: 'Wir haben dich nicht ohne Grund eingeladen. Irgendwo hier wartet der Pokal 2026.' },
    { s: 'ich', wahl: ['Worum geht es?', 'Ich bin bereit.'] },
    { s: 'a', t: 'Mehrere Runden, ein Ziel: Wer am Ende das Finale am schnellsten löst, holt sich den Pokal.' },
    { s: 'b', t: 'Geh rein und such dir deinen Platz auf der Bank. Wir melden uns, sobald es losgeht.' }
  ],
  // vor dem ersten Spiel (Winter-Snake)
  snake: [
    { s: 'a', t: 'Runde 1: Winter-Snake. Im Tab 🎮 Minispiel steuerst du die Schlange durch den Schnee.' },
    { s: 'b', t: 'Sammle so viele Weihnachtsmänner wie möglich – aber pass auf die Hindernisse und deinen eigenen Schwanz auf.' },
    { s: 'a', t: 'Du hast den ganzen Tag Zeit und so viele Versuche, wie du willst. Nur dein bester zählt.' },
    { s: 'b', t: 'Die Besten bekommen Bonussekunden fürs Finale: {snakeBonus}.' },
    { s: 'ich', wahl: ['Los geht’s!', 'Wie war das mit dem Schwanz?'] }
  ],
  // vor dem Wählen (Flagge raten)
  guess: [
    { s: 'b', t: 'Jetzt wird es geheimnisvoll, {name}. Jede Person hat eine geheime Flagge – genau eine andere hat dieselbe wie du.' },
    { s: 'a', t: 'Tippe in der Halle die Person an, von der du glaubst, dass sie deine Flagge hat. Bis zur Auflösung kannst du umentscheiden.' },
    { s: 'b', t: 'Richtig geraten bringt {guessBonus} Sekunden Vorsprung fürs Finale.' },
    { s: 'ich', wahl: ['Ich verrate nichts. 🤫', 'Welche Flagge habe ich nochmal?'] },
    { s: 'a', t: 'Oben bei „🤫 Meine Flagge zeigen“ siehst du sie kurz. Aber lass dir nicht über die Schulter schauen!' }
  ],
  // nach dem Wählen (Auflösung, Teams stehen fest)
  pairs: [
    { s: 'a', t: 'Die Auflösung ist da! Die Teams stehen fest.' },
    { s: 'b', t: 'Oben siehst du, mit wem du im Team bist und ob dein Tipp richtig war.' },
    { s: 'ich', wahl: ['Ich wusste es!', 'Das hätte ich nie gedacht.'] },
    { s: 'a', t: 'Lernt euch kennen – gleich müsst ihr zusammen laufen.' }
  ],
  // vor dem zweiten Spiel (Biathlon)
  biathlon: [
    { s: 'b', t: 'Runde 2: Biathlon! Im Tab 🎮 Minispiel läufst du und schießt auf die Scheiben.' },
    { s: 'a', t: 'Du hast {biathlonVersuche} echte Versuche. Deine beste Zeit und die deines Teampartners werden addiert.' },
    { s: 'b', t: 'Fehlschüsse kosten Zeit – lieber einmal mehr ruhig zielen.' },
    { s: 'ich', wahl: ['Ich treffe alles.', 'Wo war nochmal der Abzug?'] }
  ],
  // nach dem zweiten Spiel
  done: [
    { s: 'a', t: 'Der Biathlon ist vorbei. Respekt, {name}!' },
    { s: 'b', t: 'Alle Vorsprünge stehen fest und werden euch im Finale gutgeschrieben.' },
    { s: 'a', t: 'Ruht euch kurz aus. Das Finale kommt bald.' }
  ],
  // vor dem Finale
  final: [
    { s: 'b', t: 'Jetzt wird es ernst: das Finale.' },
    { s: 'a', t: 'In vier Teams spielt ihr drei Räume: Napoleons Lager, die Rätselkammer und die Schneeballschlacht.' },
    { s: 'b', t: 'Euer Kapitän öffnet die Tür unten im Eis-Pokal – die gibt es nur im Agentenmodus 🕶️. Ab dann läuft eure Uhr.' },
    { s: 'ich', wahl: ['Wir sind bereit.', 'Wer ist unser Kapitän?'] },
    { s: 'a', t: 'Das steht oben im Banner. Viel Glück, Agent {name}.' }
  ]
};
// ---------- ENDE ANPASSEN ----------

// Welche Sequenz gehört zu welcher Phase (intro läuft beim ersten Einlauf)
export const PHASE_DIALOG = { snake: 'snake', guess: 'guess', pairs: 'pairs', biathlon: 'biathlon', done: 'done', final: 'final' };
export const DIALOG_ORDER = ['intro', 'snake', 'guess', 'pairs', 'biathlon', 'done', 'final'];

const CSS = `
.dlg{position:fixed;inset:0;z-index:9000;overflow:hidden;background:#0b1a2e;color:#f3ead7;font-family:Georgia,'Times New Roman',serif;
  user-select:none;-webkit-user-select:none;touch-action:manipulation;opacity:0;transition:opacity .45s}
.dlg.on{opacity:1}
.dlg-bg{position:absolute;inset:0;background-size:cover;background-position:center}
.dlg-bg.ersatz{background:radial-gradient(ellipse at 50% 30%,#1d3b66 0%,#0b1a2e 60%,#060d18 100%)}
.dlg-pokal{position:absolute;left:50%;bottom:16%;height:78%;transform:translateX(-50%);opacity:.9;filter:drop-shadow(0 0 40px rgba(110,190,255,.55))}
.dlg-schnee{position:absolute;left:0;right:0;bottom:0;height:24%;background:linear-gradient(#dbe8f6,#f6fbff);border-radius:50% 50% 0 0/22% 22% 0 0;opacity:.95}
.dlg-flocken{position:absolute;inset:0;pointer-events:none}
.dlg-vign{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 45%,rgba(0,0,0,.55) 100%)}
.dlg-p{position:absolute;bottom:0;max-height:74%;transition:filter .35s,transform .35s;transform-origin:bottom center;filter:brightness(.5) saturate(.75)}
.dlg-p.aktiv{filter:none;transform:scale(1.04)}
.dlg-p.a{left:-2%;width:31%;object-fit:contain;object-position:bottom}
.dlg-p.b{left:20%;width:31%;object-fit:contain;object-position:bottom}
.dlg-p.ich{right:-1%;width:36%;object-fit:contain;object-position:bottom}
.dlg-box{position:absolute;left:0;right:0;bottom:0;padding:26px 6% calc(22px + env(safe-area-inset-bottom));
  background:linear-gradient(rgba(5,8,14,0),rgba(5,8,14,.86) 30%,rgba(5,8,14,.96));min-height:28%}
.dlg-zeile{font-size:clamp(17px,2.4vw,24px);line-height:1.45;text-shadow:0 2px 4px #000;max-width:900px;margin:0 auto}
.dlg-name{color:#e9c46a;margin-right:.35em}
.dlg-wahl{max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:6px}
.dlg-wahl button{all:unset;cursor:pointer;font-size:clamp(17px,2.4vw,24px);color:#f3ead7;text-shadow:0 2px 4px #000;padding:4px 0}
.dlg-wahl button:hover,.dlg-wahl button:first-child{color:#e9c46a}
.dlg-weiter{position:absolute;right:6%;bottom:calc(10px + env(safe-area-inset-bottom));font-size:13px;color:#cbb88e;opacity:.8;animation:dlgb 1.2s infinite}
@keyframes dlgb{50%{opacity:.25}}
.dlg-skip{position:absolute;top:calc(12px + env(safe-area-inset-top));right:12px;z-index:2;background:rgba(0,0,0,.45);color:#f3ead7;border:1px solid rgba(233,196,106,.5);
  border-radius:999px;padding:7px 14px;font:14px system-ui,sans-serif;cursor:pointer}
@media (max-aspect-ratio: 4/5){
  /* Hochformat (Handy): Figuren stehen über der Textbox */
  .dlg-p{max-height:52%;bottom:24%}
  .dlg-p.a{width:42%;left:-6%}.dlg-p.b{width:42%;left:20%}.dlg-p.ich{width:48%;right:-4%}
  .dlg-pokal{height:58%;bottom:28%}
  .dlg-schnee{height:34%}
  .dlg-box{min-height:26%;background:linear-gradient(rgba(5,8,14,0),rgba(5,8,14,.9) 18%,rgba(5,8,14,.97))}
}`;

function injectCss() {
  if (document.getElementById('dlg-css')) return;
  const st = document.createElement('style'); st.id = 'dlg-css'; st.textContent = CSS; document.head.appendChild(st);
}
// Bild laden; fehlt es, Ersatz nehmen
function img(cls, src, fallback) {
  const el = document.createElement('img'); el.className = 'dlg-p ' + cls; el.alt = '';
  el.onerror = () => { if (fallback && el.src.indexOf(fallback) < 0) el.src = fallback; else el.style.display = 'none'; };
  el.src = src; return el;
}
const fill = (t, vars) => String(t).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Spielt eine Sequenz ab. Ergebnis: Promise, das erfüllt wird, wenn die Sequenz zu Ende ist (oder übersprungen wurde).
export function playDialog(id, { name = '', agentUrl = 'agents/agent1.png', vars = {} } = {}) {
  const lines = DIALOGE[id];
  if (!lines?.length) return Promise.resolve();
  injectCss();
  const V = { name, ...vars };
  const ov = document.createElement('div'); ov.className = 'dlg';
  const bg = document.createElement('div'); bg.className = 'dlg-bg'; ov.appendChild(bg);
  // Hintergrund: eigenes Bild, sonst Nachthimmel + Eis-Pokal + Schnee
  const probe = new Image();
  probe.onload = () => { bg.style.backgroundImage = `url("${HINTERGRUND}")`; };
  probe.onerror = () => {
    bg.classList.add('ersatz');
    const p = document.createElement('img'); p.className = 'dlg-pokal'; p.src = HINTERGRUND_ERSATZ; p.alt = '';
    const s = document.createElement('div'); s.className = 'dlg-schnee';
    bg.append(s, p);
  };
  probe.src = HINTERGRUND;
  // fallender Schnee
  const cv = document.createElement('canvas'); cv.className = 'dlg-flocken'; ov.appendChild(cv);
  const vign = document.createElement('div'); vign.className = 'dlg-vign'; ov.appendChild(vign);
  const P = { a: img('a', SPRECHER.a.bild, SPRECHER.a.ersatz), b: img('b', SPRECHER.b.bild, SPRECHER.b.ersatz), ich: img('ich', agentUrl, 'agents/agent1.png') };
  ov.append(P.b, P.a, P.ich);
  const box = document.createElement('div'); box.className = 'dlg-box'; ov.appendChild(box);
  const weiter = document.createElement('div'); weiter.className = 'dlg-weiter'; weiter.textContent = 'Tippen = weiter ▸'; ov.appendChild(weiter);
  const skip = document.createElement('button'); skip.className = 'dlg-skip'; skip.textContent = 'Überspringen ⏭'; ov.appendChild(skip);
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('on'));

  // Schneeflocken
  const ctx = cv.getContext('2d'); let raf = 0;
  const flakes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 2, v: 0.02 + Math.random() * 0.05, w: Math.random() * 6 }));
  const snow = t => {
    const w = cv.width = ov.clientWidth, h = cv.height = ov.clientHeight;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const f of flakes) {
      f.y += f.v / 60; if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
      ctx.beginPath(); ctx.arc((f.x + Math.sin(t / 1500 + f.w) * 0.01) * w, f.y * h, f.r, 0, 7); ctx.fill();
    }
    raf = requestAnimationFrame(snow);
  };
  raf = requestAnimationFrame(snow);

  return new Promise(resolve => {
    let i = -1, typing = null, done = false;
    const finish = () => {
      if (done) return; done = true;
      clearInterval(typing); cancelAnimationFrame(raf);
      ov.classList.remove('on'); setTimeout(() => ov.remove(), 450); resolve();
    };
    const speaker = s => { for (const k of ['a', 'b', 'ich']) P[k].classList.toggle('aktiv', k === s); };
    function next() {
      i++;
      if (i >= lines.length) return finish();
      const L = lines[i];
      if (L.s === 'ich' && L.wahl?.length) {
        speaker('ich'); weiter.style.display = 'none';
        box.innerHTML = `<div class="dlg-wahl">${L.wahl.map((w, k) => `<button data-k="${k}">${k + 1}. ${esc(fill(w, V))}</button>`).join('')}</div>`;
        box.querySelectorAll('button').forEach(b => b.onclick = e => { e.stopPropagation(); next(); });
        return;
      }
      const who = L.s === 'ich' ? { name } : SPRECHER[L.s] || { name: '' };
      speaker(L.s); weiter.style.display = '';
      const full = fill(L.t, V);
      box.innerHTML = `<div class="dlg-zeile"><span class="dlg-name">${esc(who.name)}:</span><span class="dlg-text"></span></div>`;
      const tx = box.querySelector('.dlg-text');
      let n = 0;
      clearInterval(typing);
      typing = setInterval(() => { n += 2; tx.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); typing = null; } }, 30);
      tx.dataset.full = full;
    }
    ov.addEventListener('click', e => {
      if (e.target === skip) return finish();
      if (box.querySelector('.dlg-wahl')) return;               // Antwort wählen statt weitertippen
      const tx = box.querySelector('.dlg-text');
      if (typing && tx) { clearInterval(typing); typing = null; tx.textContent = tx.dataset.full; return; }   // erst Text fertig zeigen
      next();
    });
    window.addEventListener('keydown', function onKey(e) {
      if (done) return window.removeEventListener('keydown', onKey);
      if (e.key === 'Escape') return finish();
      const w = box.querySelectorAll('.dlg-wahl button');
      if (w.length) { const k = Number(e.key) - 1; if (w[k]) w[k].click(); else if (e.key === 'Enter') w[0].click(); return; }
      if (e.key === 'Enter' || e.key === ' ') ov.click();
    });
    next();
  });
}
