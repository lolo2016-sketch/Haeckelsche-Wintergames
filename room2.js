// ===== Finale, Raum 2: Die Rätselkammer =====
// Achteckiger Steinraum im Kerzenlicht. An den Wänden hängen 6 Rätseltafeln; jede gelöste Tafel zeigt ihren Buchstaben.
// Wischen = umschauen, Tafel antippen = Rätsel öffnen. Ist das Wort gelöst, leuchtet die Tür zu Raum 3.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

function stoneTex(base = [92, 86, 78]) {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 32; x < w + 64; x += 64) {
      const v = -12 + Math.random() * 24;
      g.fillStyle = `rgb(${base.map(c => c + v)})`; g.fillRect(x - 64 + 2, y + 2, 60, 28);
    }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// Tafel-Textur: offen ("Rätsel 3") oder gelöst (großer goldener Buchstabe)
function plaqueTex(i, letter) {
  return canvasTex(256, 320, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f3e3b8'); gr.addColorStop(1, '#d9c08a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7a5a2a'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (letter) {
      g.fillStyle = '#b8860b'; g.font = 'bold 200px Georgia, serif'; g.fillText(letter, w / 2, h / 2 + 10);
      g.strokeStyle = '#5a3d0a'; g.lineWidth = 3; g.strokeText(letter, w / 2, h / 2 + 10);
    } else {
      g.fillStyle = '#5a3d0a'; g.font = 'bold 44px Georgia, serif'; g.fillText('Rätsel', w / 2, h / 2 - 40);
      g.font = 'bold 110px Georgia, serif'; g.fillText(String(i + 1), w / 2, h / 2 + 50);
    }
  });
}

export function createRiddleRoom(container, { onPlaque, onDoor } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0806);
  scene.fog = new THREE.Fog(0x0b0806, 8, 18);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 100);
  scene.add(new THREE.HemisphereLight(0xffd9a0, 0x1a1008, 0.55));

  const SIDES = 8, R = 5, WALL_H = 4.2;
  const wallTex = stoneTex(); wallTex.repeat.set(2, 1.6);
  const floorTex = stoneTex([60, 56, 52]); floorTex.repeat.set(4, 4);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 0.5, SIDES), lam(0xffffff, { map: floorTex }));
  floor.rotation.x = -Math.PI / 2; floor.rotation.z = Math.PI / SIDES; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.ConeGeometry(R + 0.6, 2.2, SIDES, 1, true), lam(0x2a2018, { side: THREE.DoubleSide }));
  ceil.position.y = WALL_H + 1.1; ceil.rotation.y = Math.PI / SIDES; scene.add(ceil);
  // Wände: Seite k zeigt in Richtung Winkel k·45°
  const side = 2 * R * Math.tan(Math.PI / SIDES);
  const wallMat = lam(0xffffff, { map: wallTex });
  const angleOf = k => k / SIDES * Math.PI * 2;
  const wallPos = (k, inset = 0) => new THREE.Vector3(Math.sin(angleOf(k)) * (R - inset), 0, Math.cos(angleOf(k)) * (R - inset));
  for (let k = 0; k < SIDES; k++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(side + 0.02, WALL_H), wallMat);
    const p = wallPos(k); w.position.set(p.x, WALL_H / 2, p.z); w.lookAt(0, WALL_H / 2, 0); scene.add(w);
  }
  // Seiten: 0 = Eingang (hinter dem Start), 4 = Tür zu Raum 3 (gegenüber), die übrigen 6 tragen die Tafeln
  const PLAQUE_SIDES = [1, 2, 3, 5, 6, 7];
  const plaques = PLAQUE_SIDES.map((k, i) => {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.55, 0.08), lam(0x4a2f1b)); g.add(frame);
    const mat = new THREE.MeshBasicMaterial({ map: plaqueTex(i, null) });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.32), mat); face.position.z = 0.05; g.add(face);
    const p = wallPos(k, 0.06); g.position.set(p.x, 1.75, p.z); g.lookAt(0, 1.75, 0);
    g.traverse(o => { o.userData.plaque = i; });
    scene.add(g);
    // Kerze unter jeder Tafel
    const candle = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), lam(0xf5ecd7)); stick.position.y = 0.11; candle.add(stick);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 6), new THREE.MeshBasicMaterial({ color: 0xffb347 })); flame.position.y = 0.27; candle.add(flame);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.22), lam(0x4a2f1b)); candle.add(shelf);
    const cp = wallPos(k, 0.18); candle.position.set(cp.x, 0.8, cp.z); scene.add(candle);
    return { group: g, mat, flame, solved: false };
  });
  // warmes Licht
  const lights = [0, 2.1, 4.2].map(a => { const l = new THREE.PointLight(0xffa64a, 1.6, 9, 1.5); l.position.set(Math.sin(a) * 2.5, 2.6, Math.cos(a) * 2.5); scene.add(l); return l; });
  // Mitte: Steinpodest mit aufgeschlagenem Buch
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.95, 8), lam(0x6b645c)); ped.position.set(0, 0.475, 1.4); scene.add(ped);
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.42), lam(0xefe2c0)); book.position.set(0, 0.98, 1.4); book.rotation.x = -0.3; scene.add(book);

  // Tür zu Raum 3 (Seite 4), erst nach Lösung des Wortes aktiv
  const door = new THREE.Group();
  const leafMat = lam(0x5a3a1c, { emissive: 0x000000 });
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 0.1), leafMat); leaf.position.y = 1.25; door.add(leaf);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 6, 16, Math.PI), lam(0x3a2a1a)); arch.position.y = 2.5; door.add(arch);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 3.2), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, depthWrite: false }));
  glow.position.set(0, 1.5, -0.08); door.add(glow);
  const dp = wallPos(4, 0.08); door.position.set(dp.x, 0, dp.z); door.lookAt(0, 0, 0);
  door.traverse(o => { o.userData.door = true; }); scene.add(door);
  let doorOn = false;

  // Kamera in der Mitte, Blick zur Tafel 1 … Startblick auf Seite 2 (rechts vorne)
  let yaw = angleOf(4), pitch = 0.0;
  const el = renderer.domElement; let drag = null;
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, yaw, pitch, moved: 0 }; });
  el.addEventListener('pointermove', e => {
    if (!drag) return;
    const w = el.clientWidth || 1, dx = (e.clientX - drag.x) / w, dy = (e.clientY - drag.y) / w;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    yaw = drag.yaw + dx * 3.2; pitch = Math.max(-0.5, Math.min(0.5, drag.pitch + dy * 1.6));
  });
  el.addEventListener('pointerup', e => { if (drag && drag.moved < 8) tap(e); drag = null; });
  const onKey = e => { if (e.key === 'ArrowLeft') yaw += 0.2; if (e.key === 'ArrowRight') yaw -= 0.2; };
  window.addEventListener('keydown', onKey);
  const ray = new THREE.Raycaster();
  function tap(e) {
    const r = el.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects([...plaques.map(p => p.group), door], true)[0];
    if (!hit) return;
    if (hit.object.userData.door) return onDoor?.();
    if (hit.object.userData.plaque != null) onPlaque?.(hit.object.userData.plaque);
  }

  function resize() {
    const w = container.clientWidth || 360, h = container.clientHeight || 640;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 76 : 62; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  const clock = new THREE.Clock(); let raf = 0, t = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta()); t += dt;
    lights.forEach((l, i) => { l.intensity = 1.5 + Math.sin(t * 9 + i * 2) * 0.12 + Math.sin(t * 5.3 + i) * 0.1; });
    plaques.forEach((p, i) => { p.flame.scale.y = 1 + Math.sin(t * 12 + i) * 0.2; });
    glow.material.opacity = doorOn ? 0.35 + Math.sin(t * 3) * 0.2 : 0;
    leafMat.emissive.setRGB(doorOn ? 0.1 : 0, doorOn ? 0.15 : 0, doorOn ? 0.22 + Math.sin(t * 3) * 0.08 : 0);
    camera.position.set(0, 1.6, 0);
    camera.lookAt(Math.sin(yaw) * Math.cos(pitch), 1.6 + Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    renderer.render(scene, camera);
  }
  // Startblick: auf Tafel 1 (Seite 1)
  yaw = angleOf(2);
  loop();

  return {
    // gelöste Rätsel: Liste von Indizes; letters[i] = Buchstabe
    setSolved(idx, letters) {
      plaques.forEach((p, i) => {
        const s = idx.includes(i);
        if (s === p.solved) return;
        p.solved = s; p.mat.map.dispose(); p.mat.map = plaqueTex(i, s ? letters[i] : null); p.mat.needsUpdate = true;
      });
    },
    setDoor(on) { doorOn = !!on; },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', onKey); renderer.dispose(); el.remove(); }
  };
}
