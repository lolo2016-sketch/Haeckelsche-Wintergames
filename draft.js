// ===== Ablauf der Wintergames =====
// Runde 1: Alle spielen Snake (beliebig viele Versuche, der beste zählt). Danach rät jede Person, wer dieselbe
//          (geheime) Nationalflagge hat. Auflösung: Personen mit gleicher Flagge bilden ein Team.
// Runde 2: Biathlon, jede Person hat ein paar echte Versuche; die Bestzeiten im Team werden addiert.
// Bonussekunden fürs Finale: richtig geraten (pro Person) + Snake-Platz 1–3.
// Rollen aus früheren Versionen ("captain"/"player") spielen keine Rolle, nur "admin" wird ausgelassen.
import { doc, collection, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { biathlonRank } from "./biathlon.js?v=20261108a";

// Phasen in Reihenfolge
export const PHASES = ['setup', 'snake', 'guess', 'pairs', 'biathlon', 'done', 'final', 'ende'];
export const PHASE_NAMES = {
  setup: 'Vorbereitung', snake: 'Runde 1: Snake', guess: 'Auswertung Snake + Wählen', pairs: 'Zweierteams stehen',
  biathlon: 'Runde 2: Biathlon', done: 'Runde 3: Teams fürs Finale wählen', final: 'Finale freigegeben', ende: 'Siegerehrung'
};

// ----- Zeitplan: Phasen wechseln automatisch zur eingestellten Zeit (state.auto + state.schedule) -----
// Die Paare (pairs) entstehen zusammen mit dem Start des Biathlons.
export const SCHEDULE = [
  ['snake', 'Snake startet (Event 1)'],
  ['guess', 'Snake endet · Auswertung + Wählen'],
  ['biathlon', 'Paare stehen fest · Biathlon startet'],
  ['done', 'Biathlon endet · Teams fürs Finale wählen'],
  ['final', 'Finale startet'],
  ['ende', 'Siegerehrung']
];
export function effectivePhase(state, now = Date.now()) {
  if (!state?.auto) return state?.phase || 'setup';
  let ph = 'setup';
  for (const [k] of SCHEDULE) { const t = Number(state.schedule?.[k]); if (t && t <= now) ph = k; }
  return ph;
}
// nächster Termin laut Zeitplan (für das Schild unter dem Schriftzug)
export function nextEvent(state, now = Date.now()) {
  if (!state?.auto) return null;
  const n = SCHEDULE.map(([k, label]) => ({ key: k, label, at: Number(state.schedule?.[k]) })).filter(e => e.at > now).sort((a, b) => a.at - b.at)[0];
  return n || null;
}
export const fmtWhen = ms => new Date(ms).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '') + ' Uhr';
export const phaseIndex = ph => Math.max(0, PHASES.indexOf(ph === 'minigame' ? 'snake' : ph === 'draft' ? 'guess' : ph));

// Standardwerte (in admin.html änderbar)
export const DEFAULTS = { guessBonus: 4, snakeBonus: [6, 4, 2], biathlonAttempts: 5 };
export const settings = state => ({
  guessBonus: Number(state.guessBonus ?? DEFAULTS.guessBonus),
  snakeBonus: Array.isArray(state.snakeBonus) ? state.snakeBonus.map(Number) : DEFAULTS.snakeBonus,
  biathlonAttempts: Number(state.biathlonAttempts ?? DEFAULTS.biathlonAttempts)
});

// Nationalflaggen
export const COUNTRIES = [
  ['de', 'Deutschland', '🇩🇪'], ['at', 'Österreich', '🇦🇹'], ['ch', 'Schweiz', '🇨🇭'], ['it', 'Italien', '🇮🇹'],
  ['fr', 'Frankreich', '🇫🇷'], ['es', 'Spanien', '🇪🇸'], ['pt', 'Portugal', '🇵🇹'], ['nl', 'Niederlande', '🇳🇱'],
  ['be', 'Belgien', '🇧🇪'], ['gb', 'Großbritannien', '🇬🇧'], ['ie', 'Irland', '🇮🇪'], ['se', 'Schweden', '🇸🇪'],
  ['no', 'Norwegen', '🇳🇴'], ['fi', 'Finnland', '🇫🇮'], ['dk', 'Dänemark', '🇩🇰'], ['is', 'Island', '🇮🇸'],
  ['pl', 'Polen', '🇵🇱'], ['cz', 'Tschechien', '🇨🇿'], ['hu', 'Ungarn', '🇭🇺'], ['gr', 'Griechenland', '🇬🇷'],
  ['hr', 'Kroatien', '🇭🇷'], ['tr', 'Türkei', '🇹🇷'], ['ua', 'Ukraine', '🇺🇦'], ['us', 'USA', '🇺🇸'],
  ['ca', 'Kanada', '🇨🇦'], ['mx', 'Mexiko', '🇲🇽'], ['br', 'Brasilien', '🇧🇷'], ['ar', 'Argentinien', '🇦🇷'],
  ['jm', 'Jamaika', '🇯🇲'], ['jp', 'Japan', '🇯🇵'], ['cn', 'China', '🇨🇳'], ['kr', 'Südkorea', '🇰🇷'],
  ['in', 'Indien', '🇮🇳'], ['th', 'Thailand', '🇹🇭'], ['au', 'Australien', '🇦🇺'], ['nz', 'Neuseeland', '🇳🇿'],
  ['za', 'Südafrika', '🇿🇦'], ['eg', 'Ägypten', '🇪🇬'], ['ke', 'Kenia', '🇰🇪'], ['ma', 'Marokko', '🇲🇦']
];
export const country = code => {
  const c = COUNTRIES.find(x => x[0] === code);
  return c ? { code, name: c[1], emoji: c[2] } : null;
};

// Teamfarben (Reihenfolge = Reihenfolge der Teams)
export const TEAM_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#facc15', '#9333ea', '#06b6d4', '#ec4899',
  '#f97316', '#84cc16', '#78350f', '#1e293b', '#14b8a6', '#f472b6', '#a3e635'];
export const teamColor = i => TEAM_COLORS[((i % TEAM_COLORS.length) + TEAM_COLORS.length) % TEAM_COLORS.length];

export const isPerson = p => p && p.role !== 'admin';

// ----- Snake: beste Leistung pro Person -----
export const playedSnake = p => !!p.minigamePlayed;
export function compareSnake(a, b) {
  return ((b.minigameScore ?? -1) - (a.minigameScore ?? -1)) || ((a.minigameAt ?? 9e15) - (b.minigameAt ?? 9e15))
    || String(a.name).localeCompare(String(b.name), 'de');
}
export const snakeRanking = people => people.filter(playedSnake).sort(compareSnake);

// ----- Biathlon: Bestzeit pro Person, Summe pro Team -----
export const playedBiathlon = p => !!p.biathlon?.played;
export const compareBiathlon = (a, b) => biathlonRank(a.biathlon) - biathlonRank(b.biathlon) || String(a.name).localeCompare(String(b.name), 'de');
// Team-Zeit: Summe der Bestzeiten; nur vollständig, wenn alle Mitglieder im Ziel waren
export function teamBiathlon(team, people) {
  const mem = people.filter(p => p.teamId === team.id);
  const done = mem.filter(p => p.biathlon?.played && p.biathlon.finished);
  return { members: mem, complete: mem.length > 0 && done.length === mem.length, timeMs: done.reduce((s, p) => s + p.biathlon.timeMs, 0), done: done.length };
}

// ----- Bonussekunden fürs Finale -----
// richtig geraten: nur sichtbar/gültig nach der Auflösung (revealed = true)
export function guessedRight(p, people) {
  if (!p.guess || !p.flag) return false;
  return people.find(x => x.token === p.guess)?.flag === p.flag;
}
export function bonusOf(p, people, state, revealed) {
  const st = settings(state);
  const rank = snakeRanking(people).findIndex(x => x.token === p.token);
  const snake = rank >= 0 && rank < st.snakeBonus.length && phaseIndex(state.phase) >= phaseIndex('guess') ? st.snakeBonus[rank] : 0;
  const guess = revealed && guessedRight(p, people) ? st.guessBonus : 0;
  const dialog = (p.dialogPoints || []).length;          // +1 s je richtiger Antwort in den Dialogen
  return { snake, guess, dialog, total: snake + guess + dialog };
}
export function teamBonus(team, people, state, revealed) {
  return people.filter(p => p.teamId === team.id).reduce((s, p) => {
    const b = bonusOf(p, people, state, revealed);
    return { snake: s.snake + b.snake, guess: s.guess + b.guess, dialog: s.dialog + b.dialog, total: s.total + b.total };
  }, { snake: 0, guess: 0, dialog: 0, total: 0 });
}

// ----- Auflösung: gleiche Flagge = ein Team -----
// Rein rechnerisch (auch für die Demo): Gruppen nach Flagge, Reihenfolge nach Ländername
export function planTeams(people) {
  const groups = {};
  for (const p of people) groups[p.flag || '?'] ??= [], groups[p.flag || '?'].push(p);
  return Object.entries(groups)
    .sort(([a], [b]) => (country(a)?.name ?? 'zzz').localeCompare(country(b)?.name ?? 'zzz', 'de'))
    .map(([flag, members], order) => {
      const c = country(flag);
      return { flag, order, name: c ? `${c.emoji} ${c.name}` : '❓ Ohne Flagge', members };
    });
}
// feste Team-IDs je Flagge: mehrfaches Ausführen (z. B. automatisch von mehreren Handys) ergibt dasselbe Ergebnis
export async function revealTeams(db, people, state, { keepPhase = false } = {}) {
  const batch = writeBatch(db);
  const plan = planTeams(people).map(t => ({ ...t, id: 'team_' + (t.flag || 'ohne') }));
  const ids = new Set(plan.map(t => t.id));
  (await getDocs(collection(db, 'teams'))).forEach(d => { if (!ids.has(d.id)) batch.delete(d.ref); });
  plan.forEach(t => {
    batch.set(doc(db, 'teams', t.id), { name: t.name, flag: t.flag, captainToken: null, order: t.order });
    t.members.forEach((m, i) => batch.update(doc(db, 'participants', m.token), { teamId: t.id, pickedAt: 1000 + t.order * 10 + i }));
  });
  if (!keepPhase) batch.set(doc(db, 'state', 'current'), { ...state, phase: 'pairs' });
  await batch.commit();
}

// ----- Runde 3: Teams fürs Finale wählen -----
// Die Paare nach Biathlon-Zeit (Summe, kleiner = besser). Die besten 4 Paare sind die Teams A–D.
// Die Paare bleiben immer zusammen: Reihum (A zuerst, dann B, C, D, dann wieder A …) holt sich jedes Team
// ein ganzes weiteres Paar, bis alle verteilt sind (bei 8 Paaren: jedes Team genau eins).
// Wählen darf aus jedem Paar nur, wer im Biathlon schneller war.
const bestTime = p => (p.biathlon?.played && p.biathlon.finished ? p.biathlon.timeMs : Infinity);
export function pairRanking(teams, people) {
  return teams.map(t => ({ team: t, ...teamBiathlon(t, people) }))
    .filter(r => r.members.length)
    .sort((a, b) => (b.complete - a.complete) || (a.complete ? a.timeMs - b.timeMs : (b.done - a.done) || (a.timeMs - b.timeMs)) || (a.team.order ?? 0) - (b.team.order ?? 0));
}
export function draftState(teams, people) {
  const ranking = pairRanking(teams, people);
  const seeds = ranking.slice(0, FINAL_TEAMS.length).map((r, i) => ({ letter: FINAL_TEAMS[i], team: r.team, timeMs: r.timeMs, complete: r.complete }));
  const seedOf = new Map(); seeds.forEach(sd => people.filter(p => p.teamId === sd.team.id).forEach(p => seedOf.set(p.token, sd.letter)));
  const letterOf = p => p.finalTeam || seedOf.get(p.token) || null;
  const membersOfPair = id => people.filter(p => p.teamId === id);
  // weitere Paare: frei, solange noch niemand daraus einem Finale-Team zugeordnet ist
  const units = ranking.slice(seeds.length).map(r => ({ team: r.team, members: membersOfPair(r.team.id) }));
  const freeUnits = units.filter(u => u.members.every(p => !letterOf(p)));
  const picks = Object.fromEntries(seeds.map(sd => [sd.letter, units.filter(u => u.members.some(p => p.finalTeam === sd.letter)).length]));
  const members = Object.fromEntries(seeds.map(sd => [sd.letter, people.filter(p => letterOf(p) === sd.letter)]));
  // Personen ohne Paar (z. B. ohne Flagge) zählen als eigene Einheit
  const loners = people.filter(p => !p.teamId && !letterOf(p)).map(p => ({ team: { id: 'solo_' + p.token, name: p.name }, members: [p] }));
  const free = [...freeUnits, ...loners];
  const minPicks = Math.min(...seeds.map(sd => picks[sd.letter]));
  const turnSeed = free.length ? seeds.find(sd => picks[sd.letter] === minPicks) : null;
  const pickerOf = sd => people.filter(p => p.teamId === sd.team.id).sort((a, b) => bestTime(a) - bestTime(b) || String(a.name).localeCompare(String(b.name), 'de'))[0] ?? null;
  return {
    seeds, letterOf, members, freeUnits: free, free: free.flatMap(u => u.members), complete: !free.length && seeds.length > 0,
    unitOf: p => free.find(u => u.members.some(m => m.token === p.token)) ?? null,
    turn: turnSeed?.letter ?? null, picker: turnSeed ? pickerOf(turnSeed) : null,
    pickerOf: letter => { const sd = seeds.find(x => x.letter === letter); return sd ? pickerOf(sd) : null; }
  };
}

// ----- Finale -----
// Viererteams fürs Finale (A–D) und ihr Kapitän werden in admin.html festgelegt (participants.finalTeam / finalCaptain).
// Spielstand pro Team in der Sammlung "finals" (Dokument = Teambuchstabe): startedAt, penalty (s), wrong [Waffen], solved1At.
export const FINAL_TEAMS = ['A', 'B', 'C', 'D'];
export const PENALTY_S = 2;   // Strafsekunden pro falscher Waffe
export const finalMembers = (letter, people) => people.filter(p => p.finalTeam === letter);
// Kapitän: vom Admin festgelegt, sonst gewählt – wer zuerst 2 Stimmen hat (bei Teams mit weniger als 2 Leuten reicht 1)
export function finalCaptain(letter, people) {
  const mem = finalMembers(letter, people);
  const fixed = mem.find(p => p.finalCaptain); if (fixed) return fixed;
  const need = Math.min(2, mem.length), count = {};
  for (const v of mem.filter(p => p.captainVote && mem.some(m => m.token === p.captainVote)).sort((a, b) => (a.captainVoteAt || 0) - (b.captainVoteAt || 0))) {
    count[v.captainVote] = (count[v.captainVote] || 0) + 1;
    if (count[v.captainVote] >= need) return mem.find(m => m.token === v.captainVote) ?? null;
  }
  return null;
}
// Vorsprung fürs Finale: Summe der Boni aller Mitglieder (Raten + Snake)
export function finalBonus(letter, people, state) {
  return finalMembers(letter, people).reduce((s, p) => s + bonusOf(p, people, state, true).total, 0);
}
// Ablauf im Finale: Raum 1 (Lager) → Tür → Raum 2 (Rätselkammer, HORCRUX) → Tür → Raum 3 (Schneeballwurf, VEREIST).
// Zwischen gelöstem Raum und dem Öffnen der nächsten Tür steht die Uhr.
export function finalStage(fin) {
  if (!fin?.startedAt) return 0;
  if (!fin.solved1At) return 1;
  if (!fin.start2At) return 1.5;          // Raum 1 gelöst, Tür zu Raum 2 noch zu
  if (!fin.solved2At) return 2;
  if (!fin.start3At) return 2.5;
  if (!fin.solved3At) return 3;
  return 4;                               // alles geschafft
}
// gespielte Zeit (ohne Pausen zwischen den Räumen)
export function finalPlayedMs(fin, now = Date.now()) {
  if (!fin?.startedAt) return 0;
  const seg = (a, b) => a ? Math.max(0, (b ?? now) - a) : 0;
  return seg(fin.startedAt, fin.solved1At) + seg(fin.start2At, fin.solved2At) + seg(fin.start3At, fin.solved3At);
}
// gewertete Zeit in ms: gespielte Zeit − Vorsprung + Strafsekunden (vor Ablauf des Vorsprungs negativ)
export function finalScoreMs(fin, bonusS, now = Date.now()) {
  if (!fin?.startedAt) return null;
  return finalPlayedMs(fin, now) - bonusS * 1000 + (fin.penalty || 0) * 1000;
}

// ----- Raum 2: Rätselkammer -----
export const WORD2 = 'HORCRUX';
export const WORD2_TRIES = 5;
// Jedes gelöste Rätsel deckt einen Buchstaben auf (das R gleich an beiden Stellen). Reihenfolge und Fragen hier änderbar.
export const RIDDLES = [
  { q: 'Ich habe Städte, aber keine Häuser. Wälder, aber keine Bäume. Wasser, aber keine Fische. Was bin ich?', a: ['karte', 'landkarte', 'weltkarte', 'stadtplan', 'atlas'], letter: 'U' },
  { q: 'Je mehr man davon wegnimmt, desto größer wird es. Was ist das?', a: ['loch', 'ein loch', 'grube', 'graben'], letter: 'X' },
  { q: 'Es läuft und läuft, hat aber keine Beine. Es hat ein Bett, schläft aber nie. Was ist es?', a: ['fluss', 'bach', 'strom', 'ein fluss'], letter: 'H' },
  { q: 'Ich habe vier Beine, kann aber nicht gehen. Ich habe einen Rücken, aber keinen Bauch. Was bin ich?', a: ['stuhl', 'sessel', 'ein stuhl', 'hocker', 'bank'], letter: 'R' },
  { q: 'Es gehört dir, aber andere benutzen es viel öfter als du selbst. Was ist es?', a: ['name', 'dein name', 'mein name', 'vorname', 'nachname'], letter: 'C' },
  { q: 'Wer es macht, der braucht es nicht. Wer es kauft, der will es nicht. Wer es braucht, der weiß es nicht. Was ist es?', a: ['sarg', 'ein sarg', 'grab', 'urne'], letter: 'O' }
];
export const normAnswer = s => String(s ?? '').trim().toLowerCase().replace(/ß/g, 'ss').replace(/[^a-zäöü ]/g, '').replace(/\s+/g, ' ');
export const riddleRight = (i, answer) => {
  const n = normAnswer(answer).replace(/^(der|die|das|ein|eine|einen) /, '');
  return RIDDLES[i].a.map(x => normAnswer(x).replace(/^(der|die|das|ein|eine|einen) /, '')).includes(n);
};
// angezeigtes Wort: aufgedeckte Buchstaben, sonst "_"
// Buchstaben-Kärtchen der gelösten Rätsel (gemischt, nicht nach Position im Wort); kommt ein Buchstabe
// mehrfach im Wort vor (R in HORCRUX), gibt das Rätsel entsprechend viele Kärtchen
export const word2Tiles = solvedIdx => RIDDLES.flatMap((r, i) => (solvedIdx || []).includes(i)
  ? Array(WORD2.split('').filter(c => c === r.letter).length).fill(r.letter) : []);
export const word2Shown = solvedIdx => WORD2.split('').map(ch => RIDDLES.some((r, i) => r.letter === ch && (solvedIdx || []).includes(i)) ? ch : '_');

// ----- Raum 3: Schneeball auf Dosen -----
export const WORD3 = 'DER WINTER NAHT';
export const WORD3_LETTERS = WORD3.replace(/ /g, '');   // ohne Leerzeichen (so wird es aus den Dosen gelegt)
// Dosen von links nach rechts: Buchstabe oder '' (leere Dose = nur Schnee); Buchstaben gemischt
export const CANS = ['N', '', 'T', 'E', 'A', 'R', 'D', '', 'W', 'H', 'I', '', 'N', 'R', 'E', 'T'];   // gemischt: Buchstaben von DER WINTER NAHT + 3 leere Dosen

export const fmtClock = ms => {
  const neg = ms < 0, a = Math.abs(ms);
  return `${neg ? '−' : ''}${Math.floor(a / 60000)}:${String(Math.floor((a % 60000) / 1000)).padStart(2, '0')}`;
};

// Waffen im Waffenschrank (Rätsel 1); die richtige wird in admin.html gewählt
export const WEAPONS = [
  ['muskete', 'Muskete'], ['duellpistole', 'Duellpistole'], ['saebel', 'Säbel'], ['karabiner', 'Karabiner'], ['degen', 'Degen'], ['pistole', 'Steinschlosspistole'],
  ['jagdgewehr', 'Jagdgewehr'], ['bajonett', 'Bajonett'], ['revolver', 'Revolver'], ['kanonenkugel', 'Kanonenkugel'], ['schrotflinte', 'Schrotflinte'], ['lanze', 'Lanze'],
  ['pistole9', 'Pistole (9 mm)'], ['axt', 'Axt'], ['scharfschuetzen', 'Scharfschützengewehr'], ['dolch', 'Dolch'], ['blunderbuss', 'Donnerbüchse'], ['armbrust', 'Armbrust'],
  ['derringer', 'Taschenpistole'], ['bogen', 'Pfeil und Bogen'], ['sturmgewehr', 'Sturmgewehr'], ['hellebarde', 'Hellebarde'], ['granate', 'Handgranate'], ['schlaeger', 'Baseballschläger']
].map(([id, name]) => ({ id, name }));
// Namen/Bilder der Waffen kann man im Admin ändern (state.waffen = { id: { name, bild } }); die Fächer (ids) bleiben gleich
export const weaponList = state => WEAPONS.map(w => ({ ...w, name: state?.waffen?.[w.id]?.name || w.name, bild: state?.waffen?.[w.id]?.bild || '' }));
export const weaponName = (id, state) => weaponList(state).find(w => w.id === id)?.name ?? id;
