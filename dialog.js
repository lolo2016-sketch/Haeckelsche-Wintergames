// ===== Dialoge im Stil von Rollenspielen (Baldur's Gate) =====
// Links die Gastgeber (zwei Einzelbilder ODER ein gemeinsames Bild), rechts das Agentenbild der Person.
// Unten läuft der Text; antippen = weiter. Bei Antworten der Person wählt man 1., 2., …
// Texte, Bilder und Zeitpunkt jeder Szene stellt man in admin.html ein (gespeichert in Firebase: state/dialoge).
// Die Werte hier unten sind nur die Startwerte, solange im Admin noch nichts gespeichert ist.

// Szenen in ihrer Reihenfolge
export const SZENEN = [
  { id: 'intro', titel: '1 · Intro (nach dem Video, vor dem Einlauf)' },
  { id: 'snake', titel: '2 · Vor Snake (Spiel erklären)' },
  { id: 'wahl', titel: '3 · Nach Snake, vor dem Wählen' },
  { id: 'biathlon', titel: '4 · Vor Biathlon (Regeln, Termin)' },
  { id: 'teams', titel: '5 · Teams fürs Finale' },
  { id: 'finale', titel: '6 · Finale eröffnet' },
  { id: 'ende', titel: '7 · Abschluss / Ehrung' }
];
// Wann eine Szene kommt (jede Szene läuft pro Person genau einmal)
export const WANN = [
  ['einlauf', 'Beim ersten Öffnen, vor dem Einlauf'],
  ['snake', 'Phase 1: Snake'],
  ['guess', 'Phase 2: Raten / Wählen'],
  ['pairs', 'Phase 3: Auflösung (Paare stehen fest)'],
  ['biathlon', 'Phase 4: Biathlon'],
  ['done', 'Phase 5: Biathlon beendet'],
  ['final', 'Phase 6: Finale freigegeben'],
  ['finaleGeschafft', 'Nachdem das eigene Team das Finale geschafft hat'],
  ['aus', '– aus (wird nicht gezeigt)']
];
// Platzhalter, die im Text ersetzt werden
export const PLATZHALTER = {
  name: 'Name der Person', snakeBonus: 'Snake-Bonus je Platz', guessBonus: 'Sekunden fürs richtige Raten',
  biathlonVersuche: 'Zahl der echten Biathlon-Versuche', partner: 'Teampartner (nach der Auflösung)',
  finaleTeam: 'Finale-Team (A–D)', mitspieler: 'die anderen im Finale-Team', kapitaen: 'Kapitän des Finale-Teams',
  finaleZeit: 'Wertung des eigenen Teams im Finale'
};

export const STANDARD = {
  namen: { a: 'Orga 1', b: 'Orga 2' },
  hintergrund: 'dialog/hintergrund.jpg',
  szenen: {
    intro: { bilder: 'eins', bildBeide: 'dialog/beide1.png', bildA: 'dialog/beide1_links.png', bildB: 'dialog/beide1_rechts.png', wann: 'einlauf', zeilen: [
      { s: 'a', t: 'Willkommen, {name}. Schön, dass du es zu den Haeckelschen Wintergames geschafft hast.' },
      { s: 'b', t: 'Wir haben dich nicht ohne Grund eingeladen. Irgendwo hier wartet der Pokal 2026.' },
      { s: 'ich', wahl: ['Worum geht es?', 'Ich bin bereit.'] },
      { s: 'a', t: 'Mehrere Runden, ein Ziel: Wer am Ende das Finale am schnellsten löst, holt sich den Pokal.' },
      { s: 'b', t: 'Geh rein und such dir deinen Platz auf der Bank. Wir melden uns, sobald es losgeht.' }
    ] },
    snake: { bilder: 'eins', bildBeide: 'dialog/beide2.png', bildA: 'dialog/beide2_links.png', bildB: 'dialog/beide2_rechts.png', wann: 'snake', zeilen: [
      { s: 'a', t: 'Runde 1: Winter-Snake! Du findest das Spiel unten im Tab 🎮 Minispiel.' },
      { s: 'b', t: 'Du bist der Kopf der Schlange – mit Weihnachtsmütze. Sammle so viele Gesichter wie möglich. Jedes Gesicht ist ein Punkt und hängt sich hinten an.' },
      { s: 'a', t: 'Steuern kannst du mit den Pfeilen unten oder durch Wischen auf dem Spielfeld.' },
      { s: 'b', t: 'Nicht gegen den Rand, dich selbst oder die Eisblöcke fahren! Mit jedem Gesicht wird es schneller, und alle 3 Gesichter kommt ein neuer Eisblock dazu.' },
      { s: 'a', t: 'Du hast den ganzen Tag Zeit und so viele Versuche, wie du willst. Nur dein bester zählt.' },
      { s: 'b', t: 'Die Besten bekommen Vorsprung fürs Finale: {snakeBonus}.' },
      { s: 'b', t: 'Kleine Kontrollfrage: Was zählt am Ende?' },
      { s: 'ich', wahl: ['Mein erster Versuch', 'Mein bester Versuch', 'Alle Versuche zusammen'], richtig: 1 },
      { s: 'a', t: 'Genau: nur dein bester! Im Spiel gibt es jederzeit „Tutorial ansehen“. Viel Glück!' }
    ] },
    wahl: { bilder: 'eins', bildBeide: 'dialog/beide3.png', bildA: 'dialog/beide3_links.png', bildB: 'dialog/beide3_rechts.png', wann: 'guess', zeilen: [
      { s: 'a', t: 'Snake ist vorbei – danke fürs Mitspielen! Die Besten haben sich ihren Vorsprung gesichert.' },
      { s: 'b', t: 'Jetzt wird gewählt, {name}. Jede Person hat eine geheime Flagge – genau eine andere hat dieselbe wie du.' },
      { s: 'a', t: 'Tippe in der Halle die Person an, die deiner Meinung nach deine Flagge hat. Bis zur Auflösung kannst du umentscheiden.' },
      { s: 'b', t: 'Richtig geraten bringt {guessBonus} Sekunden Vorsprung fürs Finale.' },
      { s: 'ich', wahl: ['Ich verrate nichts. 🤫', 'Welche Flagge habe ich nochmal?'] },
      { s: 'a', t: 'Tippe rechts auf den Flaggen-Knopf 🏳️: Dort siehst du deine Flagge. Du kannst dich auch 5 Minuten lang für alle enttarnen – oder einmal heimlich eine andere Person ausspionieren.' }
    ] },
    biathlon: { bilder: 'eins', bildBeide: 'dialog/beide4.png', bildA: 'dialog/beide4_links.png', bildB: 'dialog/beide4_rechts.png', wann: 'pairs', zeilen: [
      { s: 'a', t: 'Die Auflösung ist da! Dein Teampartner ist {partner}.' },
      { s: 'b', t: 'Zusammen tretet ihr im Biathlon-Sprint an. Los geht es am [TAG] um [UHRZEIT].' },
      { s: 'a', t: 'Mit ◀ ▶ fährst du, mit ▲ springst du, mit ▼ legst du dich hin. Auf Schnee gleitest du weiter, Gegenrichtung bremst.' },
      { s: 'b', t: 'Berührst du ein Hindernis, stürzt du und brauchst 2 Sekunden zum Aufstehen. Im echten Lauf warten Hindernisse, die du selbst herausfinden musst.' },
      { s: 'a', t: 'Trainieren kannst du so oft du willst. Danach hast du {biathlonVersuche} echte Versuche – deine beste Zeit und die von {partner} werden addiert.' },
      { s: 'ich', wahl: ['Wir holen uns das!', 'Wo war nochmal die Bremse?'] }
    ] },
    teams: { bilder: 'eins', bildBeide: 'dialog/beide1.png', bildA: 'dialog/beide1_links.png', bildB: 'dialog/beide1_rechts.png', wann: 'done', zeilen: [
      { s: 'b', t: 'Der Biathlon ist vorbei – Respekt, {name}!' },
      { s: 'a', t: 'Fürs Finale werdet ihr neu eingeteilt. Du bist in Team {finaleTeam} mit {mitspieler}.' },
      { s: 'b', t: 'Euer Kapitän ist {kapitaen}. Nur er oder sie öffnet die Türen und wählt im ersten Raum die Waffe.' },
      { s: 'ich', wahl: ['Starkes Team!', 'Wann geht es los?'] },
      { s: 'a', t: 'Verabredet euch – sobald das Finale eröffnet ist, könnt ihr loslegen, wann ihr wollt.' }
    ] },
    finale: { bilder: 'eins', bildBeide: 'dialog/beide2.png', bildA: 'dialog/beide2_links.png', bildB: 'dialog/beide2_rechts.png', wann: 'final', zeilen: [
      { s: 'b', t: 'Das Finale ist eröffnet!' },
      { s: 'a', t: 'Drei Räume warten auf euch: Napoleons Lager, die Rätselkammer und der Schneeballwurf. Euer Vorsprung läuft zuerst ab.' },
      { s: 'b', t: 'Die Tür ist unten im riesigen Eis-Pokal. Sobald {kapitaen} sie öffnet, läuft eure Uhr.' },
      { s: 'ich', wahl: ['Wir sind bereit.', 'Was, wenn wir die falsche Waffe nehmen?'] },
      { s: 'a', t: 'Jede falsche Waffe kostet 2 Strafsekunden. Viel Glück, Agent {name}.' }
    ] },
    ende: { bilder: 'eins', bildBeide: 'dialog/beide3.png', bildA: 'dialog/beide3_links.png', bildB: 'dialog/beide3_rechts.png', wann: 'finaleGeschafft', zeilen: [
      { s: 'a', t: 'Ihr habt es geschafft, {name}! Team {finaleTeam} hat das Finale gelöst.' },
      { s: 'b', t: 'Eure Wertung: {finaleZeit}. Was für eine Leistung!' },
      { s: 'ich', wahl: ['Wer hat gewonnen?', 'Danke für den Tag!'] },
      { s: 'a', t: 'Die Siegerehrung machen wir gemeinsam – bis gleich!' }
    ] }
  }
};
// Standardwerte für die Bilder einer Szene
const BILD_STANDARD = { bilder: 'zwei', bildA: 'dialog/sprecher1.png', bildB: 'dialog/sprecher2.png', bildBeide: 'dialog/beide.png', hintergrund: '' };
const ERSATZ = { a: 'faces/face1.png', b: 'faces/face2.png', hintergrund: 'agents/welt/eispokal_vorne.png' };

// Gespeicherte Einstellungen (Firebase) über die Startwerte legen
export function mergeConfig(remote) {
  const r = remote || {};
  const out = { namen: { ...STANDARD.namen, ...(r.namen || {}) }, hintergrund: r.hintergrund ?? STANDARD.hintergrund, szenen: {} };
  for (const { id } of SZENEN) {
    const std = STANDARD.szenen[id], rem = r.szenen?.[id] || {};
    out.szenen[id] = { ...BILD_STANDARD, ...std, ...rem, zeilen: (rem.zeilen ?? std.zeilen).map(z => ({ ...z, ...(z.wahl ? { wahl: [...z.wahl] } : {}) })) };
  }
  return out;
}

const CSS = `
.dlg{position:fixed;inset:0;z-index:9000;overflow:hidden;background:#0b1a2e;color:#f3ead7;font-family:Georgia,'Times New Roman',serif;
  user-select:none;-webkit-user-select:none;touch-action:manipulation;opacity:0;transition:opacity .45s}
.dlg.on{opacity:1}
.dlg-bg{position:absolute;inset:0;background-size:cover;background-position:center}
.dlg-bg-sturm{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(18px) brightness(.75) saturate(1.2);transform:scale(1.08)}
.dlg-bg-mitte{position:absolute;top:0;left:50%;height:100%;transform:translateX(-50%);max-width:none;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)}
.dlg-bg.ersatz{background:radial-gradient(ellipse at 50% 30%,#1d3b66 0%,#0b1a2e 60%,#060d18 100%)}
.dlg-pokal{position:absolute;left:50%;bottom:16%;height:78%;transform:translateX(-50%);opacity:.9;filter:drop-shadow(0 0 40px rgba(110,190,255,.55))}
.dlg-schnee{position:absolute;left:0;right:0;bottom:0;height:24%;background:linear-gradient(#dbe8f6,#f6fbff);border-radius:50% 50% 0 0/22% 22% 0 0;opacity:.95}
.dlg-flocken{position:absolute;inset:0;pointer-events:none}
.dlg-vign{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 45%,rgba(0,0,0,.55) 100%)}
.dlg-p{position:absolute;bottom:0;max-height:74%;object-fit:contain;object-position:bottom;transition:filter .35s,transform .35s;transform-origin:bottom center;filter:brightness(.5) saturate(.75)}
.dlg-p.aktiv{filter:none;transform:scale(1.04)}
.dlg-duo{position:absolute;left:-1%;bottom:0;height:70%;max-width:62%;display:flex;align-items:flex-end;pointer-events:none}
.dlg-duo .dlg-p{position:relative;left:auto;bottom:auto;height:100%;width:auto;max-height:none;max-width:none;min-width:0;flex:0 1 auto}
.dlg-duo .dlg-p.b{margin-left:-4%}
.dlg-p.beide{left:-2%;width:54%;max-height:80%}
.dlg-p.ich{right:-1%;width:36%}
.dlg-box{position:absolute;left:0;right:0;bottom:0;padding:26px 6% calc(22px + env(safe-area-inset-bottom));
  background:linear-gradient(rgba(5,8,14,0),rgba(5,8,14,.86) 30%,rgba(5,8,14,.96));min-height:28%}
.dlg-zeile{font-size:clamp(17px,2.4vw,24px);line-height:1.45;text-shadow:0 2px 4px #000;max-width:900px;margin:0 auto}
.dlg-name{color:#e9c46a;margin-right:.35em}
.dlg-wahl{max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:6px}
.dlg-wahl button{all:unset;cursor:pointer;font-size:clamp(17px,2.4vw,24px);color:#f3ead7;text-shadow:0 2px 4px #000;padding:4px 0}
.dlg-wahl button:hover,.dlg-wahl button:first-child{color:#e9c46a}
.dlg-weiter{position:absolute;right:6%;bottom:calc(10px + env(safe-area-inset-bottom));font-size:13px;color:#cbb88e;opacity:.8;animation:dlgb 1.2s infinite}
@keyframes dlgb{50%{opacity:.25}}
.dlg-plus{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font:bold clamp(40px,9vw,80px) Georgia,serif;color:#fde68a;
  text-shadow:0 0 24px rgba(253,230,138,.9),0 4px 8px #000;animation:dlgp 1.1s ease-out forwards;pointer-events:none;z-index:3}
.dlg-plus.falsch{color:#fca5a5;text-shadow:0 0 18px rgba(239,68,68,.7),0 4px 8px #000}
@keyframes dlgp{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}25%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}100%{opacity:0;transform:translate(-50%,-90%) scale(1)}}
.dlg-skip{position:absolute;top:calc(12px + env(safe-area-inset-top));right:12px;z-index:2;background:rgba(0,0,0,.45);color:#f3ead7;border:1px solid rgba(233,196,106,.5);
  border-radius:999px;padding:7px 14px;font:14px system-ui,sans-serif;cursor:pointer}
@media (max-aspect-ratio: 4/5){
  /* Hochformat (Handy): Figuren stehen über der Textbox */
  .dlg-p{max-height:52%;bottom:24%}
  .dlg-duo{height:48%;bottom:24%;max-width:74%;left:-3%}
  .dlg-p.ich{width:48%;right:-4%}
  .dlg-p.beide{width:70%;left:-6%;max-height:56%}
  .dlg-pokal{height:58%;bottom:28%}
  .dlg-schnee{height:34%}
  .dlg-box{min-height:26%;background:linear-gradient(rgba(5,8,14,0),rgba(5,8,14,.9) 18%,rgba(5,8,14,.97))}
}`;

function injectCss() {
  if (document.getElementById('dlg-css')) return;
  const st = document.createElement('style'); st.id = 'dlg-css'; st.textContent = CSS; document.head.appendChild(st);
}
// Bild laden; fehlt es, Ersatz nehmen (oder onFail aufrufen)
function img(cls, src, fallback, onFail) {
  const el = document.createElement('img'); el.className = 'dlg-p ' + cls; el.alt = '';
  el.onerror = () => {
    if (fallback && el.src.indexOf(fallback) < 0) el.src = fallback;
    else { el.style.display = 'none'; onFail?.(); }
  };
  el.src = src || fallback || ''; return el;
}
export const fillText = (t, vars) => String(t ?? '').replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Spielt eine Szene ab. Ergebnis: Promise, das erfüllt wird, wenn die Szene zu Ende ist (oder übersprungen wurde).
// onAnswer(zeile, gewählt, richtig): wird bei jeder Antwort aufgerufen; wertung = true zeigt „+1 s“ bei richtigen Antworten
export function playDialog(id, { cfg = mergeConfig(null), name = '', agentUrl = 'agents/agent1.png', vars = {}, onAnswer = null, wertung = false } = {}) {
  const sz = cfg.szenen[id];
  const lines = (sz?.zeilen || []).map((z, idx) => ({ ...z, idx }))
    .filter(z => (z.s === 'ich' ? z.wahl?.some(w => w.trim()) : String(z.t ?? '').trim()));
  if (!lines.length) return Promise.resolve();
  injectCss();
  const V = { name, ...vars };
  const N = { a: cfg.namen.a, b: cfg.namen.b, beide: `${cfg.namen.a} & ${cfg.namen.b}`, ich: name };
  const ov = document.createElement('div'); ov.className = 'dlg';
  const bg = document.createElement('div'); bg.className = 'dlg-bg'; ov.appendChild(bg);
  // Hintergrund: eigenes Bild der Szene oder das allgemeine, sonst Nachthimmel + Eis-Pokal + Schnee
  const bgUrl = sz.hintergrund || cfg.hintergrund;
  const probe = new Image();
  // Bild mittig (Pokal zwischen den Sprechenden), daneben dasselbe Bild verschwommen als Eissturm
  probe.onload = () => {
    const blur = document.createElement('div'); blur.className = 'dlg-bg-sturm'; blur.style.backgroundImage = `url("${bgUrl}")`;
    const mid = document.createElement('img'); mid.className = 'dlg-bg-mitte'; mid.src = bgUrl; mid.alt = '';
    bg.append(blur, mid);
  };
  probe.onerror = () => {
    bg.classList.add('ersatz');
    const p = document.createElement('img'); p.className = 'dlg-pokal'; p.src = ERSATZ.hintergrund; p.alt = '';
    const s = document.createElement('div'); s.className = 'dlg-schnee';
    bg.append(s, p);
  };
  if (bgUrl) probe.src = bgUrl; else probe.onerror();
  const cv = document.createElement('canvas'); cv.className = 'dlg-flocken'; ov.appendChild(cv);
  const vign = document.createElement('div'); vign.className = 'dlg-vign'; ov.appendChild(vign);
  // Gastgeber: zwei Einzelbilder oder ein gemeinsames Bild (fehlt es, doch die zwei Einzelbilder)
  const P = { ich: img('ich', agentUrl, 'agents/agent1.png') };
  // zwei Einzelbilder nebeneinander in gleicher Höhe (gleicher Maßstab), das zweite leicht überlappend
  const zwei = () => {
    P.a = img('a', sz.bildA, ERSATZ.a); P.b = img('b', sz.bildB, ERSATZ.b);
    const duo = document.createElement('div'); duo.className = 'dlg-duo'; duo.append(P.a, P.b);
    ov.insertBefore(duo, P.ich);
  };
  ov.appendChild(P.ich);
  if (sz.bilder === 'eins') {
    P.beide = img('beide', sz.bildBeide, null, () => { P.beide.remove(); delete P.beide; zwei(); speaker(cur); });
    ov.insertBefore(P.beide, P.ich);
  } else zwei();
  const box = document.createElement('div'); box.className = 'dlg-box'; ov.appendChild(box);
  const weiter = document.createElement('div'); weiter.className = 'dlg-weiter'; weiter.textContent = 'Tippen = weiter ▸'; ov.appendChild(weiter);
  const skip = document.createElement('button'); skip.className = 'dlg-skip'; skip.textContent = 'Überspringen ⏭'; ov.appendChild(skip);
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('on'));

  // Wer spricht, ist hell; beim gemeinsamen Bild ist es hell, solange einer von euch spricht
  let cur = null;
  function speaker(s) {
    cur = s;
    for (const k of Object.keys(P)) {
      const on = k === s || (k === 'beide' && s !== 'ich') || (s === 'beide' && (k === 'a' || k === 'b'));
      P[k].classList.toggle('aktiv', on);
    }
  }

  // fallender Schnee
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
    function next() {
      i++;
      if (i >= lines.length) return finish();
      const L = lines[i];
      if (L.s === 'ich') {
        speaker('ich'); weiter.style.display = 'none';
        // Antworten (leere weglassen, Nummer der richtigen bleibt die aus dem Admin)
        const opts = L.wahl.map((w, k) => ({ w, k })).filter(o => o.w.trim());
        const hasRight = Number.isInteger(L.richtig) && L.richtig >= 0;
        box.innerHTML = `<div class="dlg-wahl">${opts.map((o, n) => `<button data-k="${o.k}">${n + 1}. ${esc(fillText(o.w, V))}</button>`).join('')}</div>`;
        box.querySelectorAll('button').forEach(b => b.onclick = e => {
          e.stopPropagation();
          if (box.dataset.busy) return; box.dataset.busy = '1';
          const k = Number(b.dataset.k), right = hasRight && k === L.richtig;
          onAnswer?.(L.idx, k, right, hasRight);
          if (wertung && hasRight) {
            const f = document.createElement('div'); f.className = 'dlg-plus' + (right ? '' : ' falsch');
            f.textContent = right ? '+1 s ✨' : '✗'; ov.appendChild(f);
            b.style.color = right ? '#86efac' : '#fca5a5';
            setTimeout(() => { f.remove(); delete box.dataset.busy; next(); }, 1100);
          } else { delete box.dataset.busy; next(); }
        });
        return;
      }
      speaker(L.s); weiter.style.display = '';
      const full = fillText(L.t, V);
      box.innerHTML = `<div class="dlg-zeile"><span class="dlg-name">${esc(N[L.s] ?? '')}:</span><span class="dlg-text"></span></div>`;
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
