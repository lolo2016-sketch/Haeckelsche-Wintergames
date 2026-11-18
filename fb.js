// Firestore-Weiche: normal echte Datenbank (Firebase). Im Probelauf (probelauf.html) stattdessen eine
// Test-Datenbank nur in diesem Browser (localStorage) – die echten Daten werden dabei nie verändert.
const SIM = (() => { try { return localStorage.getItem('hg-probelauf') === '1'; } catch (e) { return false; } })();
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const A = SIM ? await import('./sim-firestore.js?v=20261118c') : await import(FB + 'firebase-app.js');
const F = SIM ? A : await import(FB + 'firebase-firestore.js');
export const PROBELAUF = SIM;
export const { initializeApp } = A;
export const { getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection, onSnapshot,
  query, orderBy, limit, writeBatch, arrayUnion, increment } = F;
if (SIM && !/probelauf\.html$/.test(location.pathname)) {
  const add = () => {
    if (document.getElementById('probelaufBanner')) return;
    const b = document.createElement('a'); b.id = 'probelaufBanner'; b.href = 'probelauf.html'; b.target = '_top';
    b.textContent = '🧪 PROBELAUF – Testdaten';
    b.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:99999;background:#dc2626;color:#fff;font:600 12px system-ui,sans-serif;padding:3px 10px;border-radius:999px;text-decoration:none;opacity:.9;pointer-events:auto';
    document.body.appendChild(b);
  };
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
}
