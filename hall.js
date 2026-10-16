// ===== Turnhalle: Bank mit Spielern, Kapitäne davor, Einlauf-Animation, Wahl per Antippen =====
// Positionen werden aus den Daten berechnet. Ändert sich etwas (z. B. ein Spieler wird gewählt),
// laufen die betroffenen Figuren automatisch an ihren neuen Platz.

export const BACKGROUND_URL = 'img/halle.png'; // optionales Hintergrundbild (z. B. von Gemini)
export const TEAM_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#0891b2', '#ea580c', '#db2777'];
const BENCH_COLOR = '#94a3b8';

const CSS = `
.hall{position:relative;width:100%;overflow:hidden;border-radius:14px;background:#d9a35f;
  user-select:none;-webkit-user-select:none;box-shadow:0 2px 10px rgba(0,0,0,.15)}
.hall.has-bg{background-size:cover;background-position:center}
.hall-wall{position:absolute;left:0;right:0;top:0;
  background:linear-gradient(#e2e8f0,#cbd5e1);border-bottom:4px solid #94a3b8}
.hall-bars{position:absolute;top:18%;bottom:12%;
  background:repeating-linear-gradient(90deg,#a16207 0 4px,transparent 4px 14px),
             repeating-linear-gradient(0deg,#a16207 0 3px,transparent 3px 16px);opacity:.55}
.hall-door{position:absolute;bottom:0;background:#475569;border-radius:4px 4px 0 0}
.hall-floor{position:absolute;left:0;right:0;bottom:0;
  background:repeating-linear-gradient(90deg,#dca866 0 22px,#d39b58 22px 44px)}
.hall-line{position:absolute;left:4%;right:4%;height:3px;background:rgba(255,255,255,.85)}
.hall-circle{position:absolute;border:3px solid rgba(220,38,38,.75);border-radius:50%}
.hall.has-bg .hall-wall,.hall.has-bg .hall-floor,.hall.has-bg .hall-line,.hall.has-bg .hall-circle{display:none}
.hall-bench{position:absolute;border-radius:3px;background:linear-gradient(#b7793c,#8a5526);
  box-shadow:0 3px 0 #5b3716}
.hall-bench::before,.hall-bench::after{content:"";position:absolute;top:100%;width:5%;height:120%;background:#5b3716}
.hall-bench::before{left:6%}.hall-bench::after{right:6%}

.hf{position:absolute;transform:translate(-50%,-100%);transition-property:left,top;transition-timing-function:linear}
.hf-in{position:absolute;inset:0}
.hf.walking .hf-in{animation:hf-bob .28s ease-in-out infinite alternate}
@keyframes hf-bob{from{transform:translateY(0) rotate(-2deg)}to{transform:translateY(-6%) rotate(2deg)}}
.hf-head{position:absolute;left:50%;top:0;height:50%;transform:translateX(-50%);z-index:2;
  filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
.hf-ini{aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:#fde68a;color:#78350f;font-weight:800;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
.hf-body{position:absolute;left:20%;right:20%;top:44%;height:38%;border-radius:42% 42% 14% 14%;z-index:1}
.hf-legs{position:absolute;left:31%;right:31%;top:80%;bottom:0;
  background:linear-gradient(90deg,#1f2937 0 42%,transparent 42% 58%,#1f2937 58%)}
.hf.seated .hf-legs{display:none}
.hf.seated .hf-body{height:42%}
.hf-c{position:absolute;right:-10%;top:30%;width:42%;aspect-ratio:1;border-radius:50%;background:#facc15;
  color:#422006;font-weight:900;display:flex;align-items:center;justify-content:center;
  font-family:-apple-system,Segoe UI,Roboto,sans-serif;border:1.5px solid #422006}
.hf-name{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:2px;max-width:150%;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font-weight:700;
  font-family:-apple-system,Segoe UI,Roboto,sans-serif;text-shadow:0 1px 2px #000,0 0 3px #000;pointer-events:none}
.hf.me .hf-name{color:#fde047}
.hf.pickable{cursor:pointer}
.hf.pickable .hf-in{animation:hf-pulse 1.1s ease-in-out infinite}
@keyframes hf-pulse{0%,100%{filter:drop-shadow(0 0 0 #fde047)}50%{filter:drop-shadow(0 0 6px #fde047) drop-shadow(0 0 2px #fde047)}}
.hf-ring{position:absolute;left:50%;bottom:-6%;width:130%;aspect-ratio:3/1;transform:translate(-50%,40%);
  border-radius:50%;background:radial-gradient(rgba(253,224,71,.9),rgba(253,224,71,0) 70%);display:none}
.hf.turn .hf-ring{display:block;animation:hf-ringp 1s ease-in-out infinite alternate}
@keyframes hf-ringp{from{opacity:.5}to{opacity:1}}
.hf-arrow{position:absolute;left:50%;bottom:104%;width:0;height:0;transform:translateX(-50%);display:none;
  border-left:9px solid transparent;border-right:9px solid transparent;border-top:13px solid #facc15;
  filter:drop-shadow(0 1px 1px rgba(0,0,0,.5));animation:hf-arr .6s ease-in-out infinite alternate}
.hf.turn .hf-arrow{display:block}
@keyframes hf-arr{from{transform:translate(-50%,0)}to{transform:translate(-50%,-25%)}}
`;

function injectCss() {
  if (document.getElementById('hall-css')) return;
  const s = document.createElement('style');
  s.id = 'hall-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = name => String(name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'de');

// ---------- Layout ----------
// data: { players, captains, columns: [{teamId, captainToken, color}], turnTeamId }
function computeLayout(W, data) {
  const players = data.players.slice().sort(byName);
  const cols = data.columns;
  const C = Math.max(1, cols.length);
  const perRow = 8;
  const R = Math.max(1, Math.ceil(players.length / perRow));
  const slotW = W / perRow;
  const rowH = W * 0.21;
  const wallH = W * 0.2;
  const benchTop = wallH + W * 0.03;

  const pos = {};
  // feste Sitzplätze auf der Bank (alphabetisch, Lücken bleiben nach dem Wählen frei)
  const seat = {};
  players.forEach((p, i) => {
    const r = Math.floor(i / perRow), k = i % perRow;
    const inRow = Math.min(perRow, players.length - r * perRow);
    const x = W / 2 + (k - (inRow - 1) / 2) * slotW;
    const y = benchTop + (r + 1) * rowH;
    seat[p.token] = { x, y, r };
  });
  const benchEnd = benchTop + R * rowH;

  // Teams: kleine Figuren hinter (über) ihrem Kapitän
  const colW = W / C;
  const teamCols = colW > 120 ? 3 : 2;
  const maxTeam = Math.max(1, Math.ceil(players.length / C) + 1);
  const teamRows = Math.ceil(maxTeam / teamCols);
  const fhTeam = Math.min(W * 0.13, (colW / teamCols) * 1.7);
  const teamRowH = fhTeam * 0.72;
  const teamTop = benchEnd + W * 0.1;
  const teamZoneH = teamRows * teamRowH;

  const fhCap = Math.min(W * 0.27, colW * 1.75);
  const capY = teamTop + teamZoneH + fhCap * 0.95;
  const H = capY + W * 0.08;

  const colIndex = {};
  cols.forEach((c, j) => { colIndex[c.teamId] = j; });
  const colX = j => colW * (j + 0.5);

  // Teammitglieder
  const members = {};
  players.forEach(p => { if (p.teamId != null && p.teamId in colIndex) (members[p.teamId] ??= []).push(p); });
  for (const [teamId, list] of Object.entries(members)) {
    const j = colIndex[teamId];
    list.forEach((p, k) => {
      const q = Math.floor(k / teamCols), c = k % teamCols;
      pos[p.token] = {
        x: colX(j) + (c - (teamCols - 1) / 2) * (colW / teamCols),
        y: teamTop + (q + 1) * teamRowH,
        h: fhTeam, seated: false, color: cols[j].color
      };
    });
  }
  // Bank
  players.forEach(p => {
    if (pos[p.token]) return;
    const s = seat[p.token];
    pos[p.token] = { x: s.x, y: s.y + W * 0.005, h: rowH * 0.74, seated: true, color: BENCH_COLOR };
  });
  // Kapitäne
  cols.forEach((c, j) => {
    if (!c.captainToken) return;
    pos[c.captainToken] = { x: colX(j), y: capY, h: fhCap, seated: false, color: c.color, captain: true };
  });

  const benches = [];
  for (let r = 0; r < R; r++) {
    const inRow = Math.min(perRow, players.length - r * perRow) || 1;
    const w = inRow * slotW + slotW * 0.4;
    benches.push({ x: W / 2 - w / 2, y: benchTop + (r + 1) * rowH - rowH * 0.16, w, h: rowH * 0.11 });
  }

  return { W, H, wallH, pos, benches, teamTop, capY, fhCap };
}

// ---------- Figur ----------
function makeFigure(person, { captain, me }) {
  const el = document.createElement('div');
  el.className = 'hf' + (me ? ' me' : '');
  el.dataset.token = person.token;
  const head = person.photoUrl
    ? `<img class="hf-head" alt="" src="${esc(person.photoUrl)}">`
    : `<div class="hf-head hf-ini">${esc(initials(person.name))}</div>`;
  el.innerHTML = `<div class="hf-ring"></div><div class="hf-in">
      <div class="hf-legs"></div><div class="hf-body">${captain ? '<div class="hf-c">C</div>' : ''}</div>${head}
    </div><div class="hf-arrow"></div><div class="hf-name">${esc(person.name)}</div>`;
  const img = el.querySelector('img.hf-head');
  if (img) img.onerror = () => {
    const d = document.createElement('div');
    d.className = 'hf-head hf-ini'; d.textContent = initials(person.name);
    img.replaceWith(d); sizeInitials(el);
  };
  return el;
}
function sizeInitials(el) {
  const ini = el.querySelector('.hf-ini');
  if (ini) ini.style.fontSize = (parseFloat(el.style.height) * 0.2) + 'px';
}

// ---------- Halle ----------
export function createHall(container, { meToken, onPlayerTap } = {}) {
  injectCss();
  const stage = document.createElement('div');
  stage.className = 'hall';
  container.innerHTML = '';
  container.appendChild(stage);

  // Hintergrundbild verwenden, falls vorhanden
  const bg = new Image();
  bg.onload = () => { stage.classList.add('has-bg'); stage.style.backgroundImage = `url("${BACKGROUND_URL}")`; };
  bg.src = BACKGROUND_URL;

  const figs = {};        // token -> Element
  let data = null, L = null, pickable = false;

  function drawScenery() {
    stage.querySelectorAll('.hall-wall,.hall-floor,.hall-line,.hall-circle,.hall-bench').forEach(e => e.remove());
    const { W, H, wallH } = L;
    stage.style.height = H + 'px';
    const wall = document.createElement('div');
    wall.className = 'hall-wall'; wall.style.height = wallH + 'px';
    wall.innerHTML = `<div class="hall-bars" style="left:4%;width:28%"></div><div class="hall-bars" style="right:4%;width:28%"></div>
      <div class="hall-door" style="left:-1%;width:9%;height:62%"></div>`;
    const floor = document.createElement('div');
    floor.className = 'hall-floor'; floor.style.top = wallH + 'px';
    const line = document.createElement('div');
    line.className = 'hall-line'; line.style.top = (L.teamTop - W * 0.05) + 'px';
    stage.append(wall, floor, line);
    L.benches.forEach(b => {
      const e = document.createElement('div');
      e.className = 'hall-bench';
      Object.assign(e.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px', zIndex: Math.round(b.y + b.h + 1) });
      stage.appendChild(e);
    });
  }

  function place(el, p, { instant = false, speed = 1 } = {}) {
    const fw = p.h * 0.62;
    el.style.width = fw + 'px';
    el.style.height = p.h + 'px';
    el.querySelector('.hf-body').style.background = p.color;
    el.querySelector('.hf-name').style.fontSize = Math.max(9, Math.min(13, p.h * 0.17)) + 'px';
    const c = el.querySelector('.hf-c'); if (c) c.style.fontSize = p.h * 0.1 + 'px';
    sizeInitials(el);
    const oldX = parseFloat(el.style.left), oldY = parseFloat(el.style.top);
    const moving = !instant && !Number.isNaN(oldX) && (Math.abs(oldX - p.x) > 1 || Math.abs(oldY - p.y) > 1);
    el.style.zIndex = Math.round(p.y);
    if (!moving) {
      el.style.transitionDuration = '0s';
      el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
      el.classList.toggle('seated', !!p.seated);
      return Promise.resolve();
    }
    const dist = Math.hypot(p.x - oldX, p.y - oldY);
    const dur = Math.max(0.5, dist / (L.W * 0.55) / speed);
    el.classList.remove('seated');
    el.classList.add('walking');
    el.style.transitionDuration = dur + 's';
    // z-Ebene während des Laufens: vorne bleiben, damit niemand "hinter" der Bank verschwindet
    el.style.zIndex = Math.round(Math.max(p.y, oldY)) + 2;
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    return new Promise(res => setTimeout(() => {
      el.classList.remove('walking');
      el.classList.toggle('seated', !!p.seated);
      el.style.zIndex = Math.round(p.y);
      res();
    }, dur * 1000 + 30));
  }

  function applyState() {
    for (const [token, el] of Object.entries(figs)) {
      el.classList.toggle('pickable', pickable && !!data.players.find(p => p.token === token && !p.teamId));
    }
    const turnCap = data.columns.find(c => c.teamId === data.turnTeamId)?.captainToken;
    for (const c of data.captains) figs[c.token]?.classList.toggle('turn', c.token === turnCap);
  }

  function ensureFigures() {
    const people = [...data.players.map(p => ({ p, captain: false })), ...data.captains.map(p => ({ p, captain: true }))];
    const keep = new Set(people.map(x => x.p.token));
    for (const t of Object.keys(figs)) if (!keep.has(t)) { figs[t].remove(); delete figs[t]; }
    for (const { p, captain } of people) {
      if (figs[p.token]) continue;
      const el = makeFigure(p, { captain, me: p.token === meToken });
      el.addEventListener('click', () => {
        if (el.classList.contains('pickable') && onPlayerTap) onPlayerTap(data.players.find(x => x.token === p.token));
      });
      figs[p.token] = el;
      stage.appendChild(el);
    }
  }

  // Daten setzen. Bewegte Figuren laufen zu ihrem neuen Platz.
  function update(newData, { pickable: pk = false } = {}) {
    data = newData; pickable = pk;
    const W = stage.clientWidth || container.clientWidth || 360;
    const first = !L;
    L = computeLayout(W, data);
    drawScenery();
    ensureFigures();
    const moves = [];
    for (const [token, el] of Object.entries(figs)) {
      const p = L.pos[token];
      if (p) moves.push(place(el, p, { instant: first }));
    }
    applyState();
    return Promise.all(moves);
  }

  // Einlauf: Spieler kommen durch die Tür links und setzen sich, danach kommen die Kapitäne von vorne
  async function playIntro() {
    if (!L) return;
    const { W, H, wallH } = L;
    Object.values(figs).forEach(el => el.classList.remove('turn', 'pickable'));
    const players = data.players.slice().sort(byName);
    const benchFirst = players.filter(p => !p.teamId);
    const others = players.filter(p => p.teamId);
    // Startpositionen setzen (ohne Animation)
    for (const p of players) {
      const el = figs[p.token];
      el.style.transitionDuration = '0s';
      el.classList.remove('seated');
      el.style.left = (-W * 0.08) + 'px';
      el.style.top = (wallH + W * 0.02) + 'px';
      el.style.opacity = '0';
    }
    for (const c of data.captains) {
      const el = figs[c.token];
      el.style.transitionDuration = '0s';
      el.style.left = L.pos[c.token].x + 'px';
      el.style.top = (H + L.fhCap * 1.1) + 'px';
    }
    stage.offsetHeight; // Layout erzwingen, damit die Startpositionen gelten

    const order = [...benchFirst, ...others];
    const step = Math.min(0.22, 2.4 / Math.max(1, order.length));
    const walks = order.map((p, i) => new Promise(res => setTimeout(() => {
      const el = figs[p.token];
      el.style.opacity = '1';
      place(el, L.pos[p.token], { speed: 1.3 }).then(res);
    }, i * step * 1000)));
    await new Promise(r => setTimeout(r, Math.min(1200, order.length * step * 1000)));
    const capWalks = data.captains.map((c, i) => new Promise(res => setTimeout(() => {
      place(figs[c.token], L.pos[c.token], { speed: 0.9 }).then(res);
    }, 600 + i * 180)));
    await Promise.all([...walks, ...capWalks]);
    applyState();
  }

  // Einzelnen Spieler sofort (lokal) zu einem Team laufen lassen, bevor die Daten neu geladen sind
  function movePlayerToTeam(token, teamId) {
    const nd = { ...data, players: data.players.map(p => p.token === token ? { ...p, teamId } : p) };
    return update(nd, { pickable: false });
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (data) { L = null; update(data, { pickable }); } }, 200);
  });

  return { update, playIntro, movePlayerToTeam };
}
