// Test-Datenbank für den Probelauf: gleiche Funktionen wie Firestore, gespeichert in localStorage (nur dieser Browser, alle Tabs).
const KEY = 'hg-probelauf-db';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
const save = db => { localStorage.setItem(KEY, JSON.stringify(db)); notify(); };
const listeners = new Set();
function notify() { for (const l of [...listeners]) try { l(); } catch (e) { console.error(e); } }
addEventListener('storage', e => { if (e.key === KEY) notify(); });
export const initializeApp = () => ({});
export const getFirestore = () => ({});
export const collection = (db, name) => ({ kind: 'col', col: name });
export function doc(a, col, id) { if (a && a.kind === 'col') return { kind: 'doc', col: a.col, id: col }; return { kind: 'doc', col, id }; }
export const orderBy = (f, dir = 'asc') => ({ t: 'order', f, dir });
export const limit = n => ({ t: 'limit', n });
export const query = (c, ...m) => ({ ...c, mods: m });
const SENT = '__fs';
export const arrayUnion = (...v) => ({ [SENT]: 'union', v });
export const increment = n => ({ [SENT]: 'inc', n });
const clone = o => JSON.parse(JSON.stringify(o ?? null));
function applyUpd(old, upd) {
  const out = { ...(old || {}) };
  for (const [k, v] of Object.entries(upd)) {
    const path = k.split('.'); let o = out;
    for (const p of path.slice(0, -1)) { o[p] = { ...(o[p] || {}) }; o = o[p]; }
    const last = path[path.length - 1];
    if (v && v[SENT] === 'union') o[last] = [...new Set([...(o[last] || []), ...v.v])];
    else if (v && v[SENT] === 'inc') o[last] = (o[last] || 0) + v.n;
    else if (v === undefined) {} else o[last] = clone(v);
  }
  return out;
}
const snapDoc = (col, id, data) => ({ id, exists: () => data != null, data: () => clone(data), ref: { kind: 'doc', col, id } });
export async function getDoc(r) { const db = load(); return snapDoc(r.col, r.id, db[r.col]?.[r.id]); }
function rows(q) {
  const db = load(); let list = Object.entries(db[q.col] || {}).map(([id, d]) => snapDoc(q.col, id, d));
  for (const m of q.mods || []) {
    if (m.t === 'order') list.sort((a, b) => ((a.data()[m.f] > b.data()[m.f]) - (a.data()[m.f] < b.data()[m.f])) * (m.dir === 'desc' ? -1 : 1));
    if (m.t === 'limit') list = list.slice(0, m.n);
  }
  return list;
}
export async function getDocs(q) { const docs = rows(q); return { docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f) }; }
export async function setDoc(r, data, opt) { const db = load(); db[r.col] ??= {}; db[r.col][r.id] = opt?.merge ? applyUpd(db[r.col][r.id], data) : applyUpd({}, data); save(db); }
export async function updateDoc(r, data) { const db = load(); if (!db[r.col]?.[r.id]) throw new Error('No document to update: ' + r.col + '/' + r.id); db[r.col][r.id] = applyUpd(db[r.col][r.id], data); save(db); }
export async function deleteDoc(r) { const db = load(); if (db[r.col]) delete db[r.col][r.id]; save(db); }
let n = 0;
export async function addDoc(c, data) { const id = 'a' + Date.now().toString(36) + (n++); await setDoc({ col: c.col, id }, data); return { id }; }
export function writeBatch() {
  const ops = [];
  return { set: (r, d, o) => ops.push(() => setDoc(r, d, o)), update: (r, d) => ops.push(() => updateDoc(r, d)), delete: r => ops.push(() => deleteDoc(r)),
    commit: async () => { for (const op of ops) await op(); } };
}
export function onSnapshot(r, cb) {
  if (r.kind === 'doc') {
    let last;
    const f = () => { const d = load()[r.col]?.[r.id]; const s = JSON.stringify(d ?? null); if (s === last) return; last = s; cb(snapDoc(r.col, r.id, d)); };
    listeners.add(f); setTimeout(f, 0); return () => listeners.delete(f);
  }
  let prev = {};
  const f = () => {
    const docs = rows(r), cur = {}; docs.forEach(d => { cur[d.id] = JSON.stringify(d.data()); });
    const ch = [];
    for (const d of docs) if (!(d.id in prev)) ch.push({ type: 'added', doc: d }); else if (prev[d.id] !== cur[d.id]) ch.push({ type: 'modified', doc: d });
    for (const id of Object.keys(prev)) if (!(id in cur)) ch.push({ type: 'removed', doc: snapDoc(r.col, id, null) });
    const first = !f.ran; f.ran = true;
    if (!ch.length && !first) return;
    prev = cur; cb({ docs, size: docs.length, docChanges: () => ch, forEach: g => docs.forEach(g) });
  };
  listeners.add(f); setTimeout(f, 0); return () => listeners.delete(f);
}
