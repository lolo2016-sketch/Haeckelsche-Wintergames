// ===== Ablauf der Wintergames =====
// Runde 1: Alle spielen Snake (beliebig viele Versuche, der beste zählt). Danach rät jede Person, wer dieselbe
//          (geheime) Nationalflagge hat. Auflösung: Personen mit gleicher Flagge bilden ein Team.
// Runde 2: Biathlon, jede Person hat ein paar echte Versuche; die Bestzeiten im Team werden addiert.
// Bonussekunden fürs Finale: richtig geraten (pro Person) + Snake-Platz 1–3.
// Rollen aus früheren Versionen ("captain"/"player") spielen keine Rolle, nur "admin" wird ausgelassen.
import { doc, collection, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { biathlonRank } from "./biathlon.js?v=20261019b";

// Phasen in Reihenfolge
export const PHASES = ['setup', 'snake', 'guess', 'pairs', 'biathlon', 'done', 'final'];
export const PHASE_NAMES = {
  setup: 'Vorbereitung', snake: 'Runde 1: Snake', guess: 'Runde 1: Raten', pairs: 'Zweierteams stehen',
  biathlon: 'Runde 2: Biathlon', done: 'Biathlon beendet', final: 'Finale freigegeben'
};
export const phaseIndex = ph => Math.max(0, PHASES.indexOf(ph === 'minigame' ? 'snake' : ph === 'draft' ? 'guess' : ph));

// Standardwerte (in admin.html änderbar)
export const DEFAULTS = { guessBonus: 4, snakeBonus: [6, 4, 2], biathlonAttempts: 3 };
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
  return { snake, guess, total: snake + guess };
}
export function teamBonus(team, people, state, revealed) {
  return people.filter(p => p.teamId === team.id).reduce((s, p) => {
    const b = bonusOf(p, people, state, revealed);
    return { snake: s.snake + b.snake, guess: s.guess + b.guess, total: s.total + b.total };
  }, { snake: 0, guess: 0, total: 0 });
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
export async function revealTeams(db, people, state) {
  const batch = writeBatch(db);
  (await getDocs(collection(db, 'teams'))).forEach(d => batch.delete(d.ref));
  const now = Date.now();
  planTeams(people).forEach(t => {
    const id = 'team_' + Math.random().toString(36).slice(2, 10);
    batch.set(doc(db, 'teams', id), { name: t.name, flag: t.flag, captainToken: null, order: t.order });
    t.members.forEach((m, i) => batch.update(doc(db, 'participants', m.token), { teamId: id, pickedAt: now + i }));
  });
  batch.set(doc(db, 'state', 'current'), { ...state, phase: 'pairs' });
  await batch.commit();
}

// ----- Finale -----
// Viererteams fürs Finale (A–D) und ihr Kapitän werden in admin.html festgelegt (participants.finalTeam / finalCaptain).
// Spielstand pro Team in der Sammlung "finals" (Dokument = Teambuchstabe): startedAt, penalty (s), wrong [Waffen], solved1At.
export const FINAL_TEAMS = ['A', 'B', 'C', 'D'];
export const PENALTY_S = 2;   // Strafsekunden pro falscher Waffe
export const finalMembers = (letter, people) => people.filter(p => p.finalTeam === letter);
export const finalCaptain = (letter, people) => people.find(p => p.finalTeam === letter && p.finalCaptain) ?? null;
// Vorsprung fürs Finale: Summe der Boni aller Mitglieder (Raten + Snake)
export function finalBonus(letter, people, state) {
  return finalMembers(letter, people).reduce((s, p) => s + bonusOf(p, people, state, true).total, 0);
}
// gewertete Zeit in ms: verstrichene Zeit − Vorsprung + Strafsekunden (vor Ablauf des Vorsprungs negativ)
export function finalScoreMs(fin, bonusS, now = Date.now()) {
  if (!fin?.startedAt) return null;
  const end = fin.solved1At ?? now;
  return (end - fin.startedAt) - bonusS * 1000 + (fin.penalty || 0) * 1000;
}
export const fmtClock = ms => {
  const neg = ms < 0, a = Math.abs(ms);
  return `${neg ? '−' : ''}${Math.floor(a / 60000)}:${String(Math.floor((a % 60000) / 1000)).padStart(2, '0')}`;
};

// Waffen im Waffenschrank (Rätsel 1); die richtige wird in admin.html gewählt
export const WEAPONS = [
  ['muskete', 'Muskete'], ['bajonett', 'Bajonett'], ['saebel', 'Säbel'], ['degen', 'Degen'],
  ['pistole', 'Steinschlosspistole'], ['kanonenkugel', 'Kanonenkugel'], ['lanze', 'Lanze'], ['axt', 'Axt'],
  ['dolch', 'Dolch'], ['armbrust', 'Armbrust'], ['bogen', 'Pfeil und Bogen'], ['hellebarde', 'Hellebarde'],
  ['revolver', 'Revolver'], ['sturmgewehr', 'Sturmgewehr'], ['granate', 'Handgranate'], ['schlaeger', 'Baseballschläger']
].map(([id, name]) => ({ id, name }));
export const weaponName = id => WEAPONS.find(w => w.id === id)?.name ?? id;
