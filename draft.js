// ===== Teamwahl ohne Kapitäne =====
// Alle spielen das Minispiel. Die Besten (Standard: Top 7) gründen je ein Team und wählen nacheinander
// eine Person dazu. Wer danach noch ohne Team ist, wird zufällig zu Zweierteams gepaart.
// Rollen aus früheren Versionen ("captain"/"player") spielen keine Rolle mehr, nur "admin" wird ausgelassen.
import { doc, collection, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { biathlonRank } from "./biathlon.js?v=20261018e";

export const DEFAULT_FOUNDERS = 7;
// Teamfarben (Reihenfolge = Reihenfolge der Teams)
export const TEAM_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#facc15', '#9333ea', '#06b6d4', '#ec4899',
  '#f97316', '#84cc16', '#78350f', '#1e293b', '#14b8a6', '#f472b6', '#a3e635'];
export const teamColor = i => TEAM_COLORS[((i % TEAM_COLORS.length) + TEAM_COLORS.length) % TEAM_COLORS.length];

export const isPerson = p => p && p.role !== 'admin';

// ----- Ranking -----
export function playedGame(game, p) {
  return game === 'biathlon' ? !!p.biathlon?.played : !!p.minigamePlayed;
}
// kleiner = besser
function rankKey(game, p) {
  if (game === 'biathlon') return [biathlonRank(p.biathlon), 0];
  return p.minigamePlayed ? [-(p.minigameScore ?? 0), p.minigameAt ?? 9e15] : [Infinity, 0];
}
export function compareRank(game) {
  return (a, b) => {
    const ka = rankKey(game, a), kb = rankKey(game, b);
    return (ka[0] - kb[0]) || (ka[1] - kb[1]) || String(a.name).localeCompare(String(b.name), 'de');
  };
}
export function ranked(game, people) {
  return people.filter(p => playedGame(game, p)).sort(compareRank(game));
}
// Wie viele dürfen wählen? Höchstens die Hälfte aller Personen (sonst bleibt niemand zum Wählen übrig)
export function founderCount(state, people, game) {
  const want = Number(state.founders) || DEFAULT_FOUNDERS;
  return Math.max(0, Math.min(want, Math.floor(people.length / 2), ranked(game, people).length));
}

// ----- Teamwahl starten (admin.html) -----
// Löscht alte Teams, legt für jeden Gründer ein Team an und setzt die Wahlreihenfolge.
export async function startDraft(db, people, state) {
  const game = state.activeGame || 'snake';
  const F = founderCount(state, people, game);
  if (F < 1) throw new Error('Noch hat niemand das Minispiel gespielt.');
  const founders = ranked(game, people).slice(0, F);
  const batch = writeBatch(db);
  (await getDocs(collection(db, 'teams'))).forEach(d => batch.delete(d.ref));
  for (const p of people) if (p.teamId || p.pickedAt) batch.update(doc(db, 'participants', p.token), { teamId: null, pickedAt: null });
  const now = Date.now();
  const pickOrder = founders.map((f, i) => {
    const id = 'team_' + Math.random().toString(36).slice(2, 10);
    batch.set(doc(db, 'teams', id), { name: 'Team ' + f.name, captainToken: f.token, order: i });
    batch.update(doc(db, 'participants', f.token), { teamId: id, pickedAt: now + i });
    return id;
  });
  batch.set(doc(db, 'state', 'current'), { ...state, phase: 'draft', pickOrder, turnIndex: 0, activeGame: game });
  await batch.commit();
  return pickOrder;
}

// ----- Rest zufällig paaren -----
// Rein rechnerisch (auch für die Demo): liefert neue Teams und Zuordnungen.
// Ungerade Anzahl: die letzte Person kommt zufällig in eines der neuen Zweierteams (dann ein Dreierteam).
export function planPairs(remaining, teamCount, rand = Math.random) {
  const list = remaining.slice();
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  const newTeams = [];
  while (list.length >= 2) {
    const a = list.shift(), b = list.shift();
    newTeams.push({ order: teamCount + newTeams.length, members: [a, b] });
  }
  let extra = null;
  if (list.length === 1) {
    extra = list[0];
    if (newTeams.length) newTeams[Math.floor(rand() * newTeams.length)].members.push(extra), extra = null;
  }
  for (const t of newTeams) t.name = t.members.map(m => m.name).join(' & ');
  return { newTeams, extra };   // extra: einzelne Person ohne neues Team (kommt in ein bestehendes)
}

// Schreibt die Paare nach Firebase und setzt die Phase auf "done".
// Gründer, die (z. B. bei vorzeitigem Beenden) noch niemanden gewählt haben, bekommen zuerst einen zufälligen Partner.
export async function finishPairs(db, people, teams, state) {
  let remaining = people.filter(p => !p.teamId);
  const fills = [];
  for (const t of Object.values(teams)) {
    if (!remaining.length) break;
    if (people.filter(p => p.teamId === t.id).length === 1) {
      const k = Math.floor(Math.random() * remaining.length);
      fills.push({ token: remaining[k].token, teamId: t.id });
      remaining = remaining.filter((_, i) => i !== k);
    }
  }
  const { newTeams, extra } = planPairs(remaining, Object.keys(teams).length);
  const batch = writeBatch(db);
  const now = Date.now();
  newTeams.forEach((t, k) => {
    const id = 'team_' + Math.random().toString(36).slice(2, 10);
    batch.set(doc(db, 'teams', id), { name: t.name, captainToken: null, order: t.order, random: true });
    t.members.forEach((m, i) => batch.update(doc(db, 'participants', m.token), { teamId: id, pickedAt: now + k * 10 + i }));
  });
  if (extra) {
    const ids = Object.keys(teams);
    if (ids.length) batch.update(doc(db, 'participants', extra.token), { teamId: ids[Math.floor(Math.random() * ids.length)], pickedAt: now + 9999 });
  }
  fills.forEach((f, i) => batch.update(doc(db, 'participants', f.token), { teamId: f.teamId, pickedAt: now - 1000 + i }));
  batch.update(doc(db, 'state', 'current'), { phase: 'done' });
  await batch.commit();
}
