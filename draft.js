// ===== Ablauf der Wintergames =====
// Runde 1: Alle spielen Snake (beliebig viele Versuche, der beste zählt). Danach rät jede Person, wer dieselbe
//          (geheime) Nationalflagge hat. Auflösung: Personen mit gleicher Flagge bilden ein Team.
// Runde 2: Biathlon, jede Person hat ein paar echte Versuche; die Bestzeiten im Team werden addiert.
// Bonussekunden fürs Finale: richtig geraten (pro Person) + Snake-Platz 1–3.
// Rollen aus früheren Versionen ("captain"/"player") spielen keine Rolle, nur "admin" wird ausgelassen.
import { doc, collection, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { biathlonRank } from "./biathlon.js?v=20261023a";

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
export const WORD3 = 'VEREIST';
// Dosen von links nach rechts: Buchstabe oder '' (leere Dose = nur Schnee); Buchstaben gemischt
export const CANS = ['E', '', 'S', 'R', '', 'T', 'V', '', 'I', 'E'];

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
export const weaponName = id => WEAPONS.find(w => w.id === id)?.name ?? id;
