// ===== Finale, Raum 3: Schneeballwurf auf Dosen =====
// Weite Winterlandschaft, das Team steht nebeneinander. Vorne auf einem Brett stehen Dosen.
// Antippen = Schneeball dorthin werfen. Getroffene Dose fällt, darüber erscheint ihr Buchstabe (oder ❄ bei leeren Dosen).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function letterSprite(ch) {
  const tex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,240,180,.95)'); gr.addColorStop(0.6, 'rgba(255,200,80,.5)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = ch === '❄' ? '#60a5fa' : '#7c2d12'; g.font = `bold ${ch === '❄' ? 120 : 150}px Georgia, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, w / 2, h / 2 + 8);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(1.5, 1.5, 1); return s;
}

// einfache Teamfigur mit Fotogesicht
function mate(photoUrl, coat) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.85, 0.22), lam(0x1f2937)); legs.position.y = 0.43; body.add(legs);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.4, 4, 10), lam(coat)); torso.position.y = 1.15; torso.scale.z = 0.65; body.add(torso);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 6, 12), lam(0xdc2626)); scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.5; body.add(scarf);
  const head = new THREE.Group(); head.position.y = 1.72; body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), lam(0xf0c4a0)));
  const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.185, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), lam(0x2563eb)); beanie.position.y = 0.03; head.add(beanie);
  if (photoUrl) new THREE.TextureLoader().load(photoUrl, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    const h = 0.5, w = h * t.image.width / t.image.height;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.08 }));
    f.position.set(0, 0.03, 0.2); head.add(f);
  });
  const arm = new THREE.Group(); arm.position.set(0.28, 1.42, 0); body.add(arm);
  const am = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), lam(coat)); am.position.y = -0.25; arm.add(am);
  const arm2 = new THREE.Group(); arm2.position.set(-0.28, 1.42, 0); body.add(arm2);
  const am2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), lam(coat)); am2.position.y = -0.25; arm2.add(am2);
  return { g, body, arm, arm2 };
}

export function createSnowRange(container, { cans = [], hits = [], mates = [], onHit, canThrow, onThrow } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 500);
  const R = rng(2026);

  // Himmel, Licht, Schnee
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 20, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, map: canvasTex(8, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3b6fb6'); gr.addColorStop(0.6, '#a8c8ee'); gr.addColorStop(1, '#f1f6fc');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }) })));
  scene.background = new THREE.Color(0xeef4fb); scene.fog = new THREE.Fog(0xe9f0f8, 60, 220);
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0xffffff, 1.4));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.5); sun.position.set(20, 30, 10); scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(250, 40), lam(0xf8fbff)); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // Berge und Tannen in der Weite
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 11 - 0.5) * Math.PI * 1.6, r = 140 + R() * 50, h = 30 + R() * 40;
    const m = new THREE.Mesh(new THREE.ConeGeometry(30 + R() * 25, h, 7), lam(0x8ea3bd)); m.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); scene.add(m);
    const c = new THREE.Mesh(new THREE.ConeGeometry((30 + R() * 25) * 0.4, h * 0.4, 7), lam(0xf8fbff)); c.position.set(m.position.x, h * 0.8, m.position.z); scene.add(c);
  }
  const tg = new THREE.ConeGeometry(1.2, 4, 7), tm = lam(0x1f5135), sm = lam(0xf8fbff);
  for (let i = 0; i < 60; i++) {
    const x = (R() - 0.5) * 120, z = -20 - R() * 60; if (Math.abs(x) < 9 && z > -30) continue;
    const t = new THREE.Mesh(tg, tm); const s = 0.7 + R() * 0.9; t.scale.setScalar(s); t.position.set(x, 2 * s, z); scene.add(t);
    const cap = new THREE.Mesh(tg, sm); cap.scale.setScalar(s * 0.55); cap.position.set(x, 3.1 * s, z); scene.add(cap);
  }
  // Schneemann am Rand
  [[0.6, 0.6], [0.45, 1.45], [0.3, 2.1]].forEach(([r, y]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), sm); b.position.set(-4.5, y, -7); scene.add(b); });

  // Brett mit Dosen: 24 m entfernt (dreimal so weit wie früher); Dosen dafür etwas größer, damit man sie am Handy noch trifft
  const CAM_Z = 3.4, DIST = 24, CAN_Z = CAM_Z - DIST, SP = 0.8;
  const plank = new THREE.Mesh(new THREE.BoxGeometry(cans.length * SP + 0.8, 0.12, 0.8), lam(0x8b5a2b)); plank.position.set(0, 1.0, CAN_Z); scene.add(plank);
  for (const x of [-(cans.length * SP) / 2, 0, (cans.length * SP) / 2]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.94, 0.7), lam(0x6b4423)); c.position.set(x, 0.47, CAN_Z); scene.add(c); }
  const canCols = [0xdc2626, 0x2563eb, 0x16a34a, 0xf59e0b, 0x9ca3af];
  const CAN_R = 0.24, CAN_HH = 0.28;
  const canGeo = new THREE.CylinderGeometry(CAN_R, CAN_R, CAN_HH * 2, 16);
  const CAN_Y = 1.06 + CAN_HH;
  const canObjs = cans.map((ch, i) => {
    const mesh = new THREE.Mesh(canGeo, [lam(canCols[i % canCols.length]), lam(0xd1d5db), lam(0xd1d5db)]);
    const x = (i - (cans.length - 1) / 2) * SP;
    mesh.position.set(x, CAN_Y, CAN_Z); scene.add(mesh);
    return { mesh, x, ch, down: false, vel: null, spin: 0, sprite: null };
  });
  function knock(i, fromHere, impact) {
    const c = canObjs[i]; if (!c || c.down) return;
    c.down = true;
    c.vel = fromHere ? new THREE.Vector3((impact?.x ?? 0) * 0.5 + (Math.random() - 0.5), 2.2, -2.5) : new THREE.Vector3((Math.random() - 0.5), 1.8, -2);
    c.spin = (Math.random() - 0.5) * 12;
    c.sprite = letterSprite(c.ch || '❄'); c.sprite.position.set(c.x, CAN_Y + 0.1, CAN_Z + 0.3); c.sprite.userData.rise = 0; scene.add(c.sprite);
    cheer = Math.max(cheer, 2.2);
  }
  let cheer = 0;
  hits.forEach(i => knock(i, false)); cheer = 0;

  // Mitspieler links und rechts (man sieht sie von hinten); sie werfen, wenn sie dran sind
  const mateObjs = mates.slice(0, 3).map((m, i) => {
    const o = mate(m.photoUrl, [0x0f766e, 0x7c3aed, 0xb45309][i]);
    const [x, z] = [[-2.0, -5.6], [2.0, -5.6], [-2.6, -8.6]][i];   // seitlich neben der Wurfbahn, verdecken die Dosen nicht
    o.g.position.set(x, 0, z); o.g.rotation.y = Math.PI + (x > 0 ? -0.1 : 0.1);
    scene.add(o.g); return { ...o, token: m.token, t: 0 };
  });
  // die beiden Organisatoren (face1/face2) stehen links und rechts an der Bahn und feuern an
  const fans = [[-4.9, 1], [4.9, 2]].map(([x, k]) => {
    const o = mate(`faces/face${k}.png`, k === 1 ? 0x111827 : 0x7f1d1d);
    o.g.scale.setScalar(1.3); o.g.position.set(x, 0, CAN_Z + 5); o.g.rotation.y = x < 0 ? 0.45 : -0.45;   // schauen zum Werfer
    scene.add(o.g); return { ...o, ph: k * 1.7 };
  });
  let lastThrowSeen = 0;

  // Schneebälle
  const balls = [];
  const BALL_R = 0.11;
  const ballGeo = new THREE.SphereGeometry(BALL_R, 10, 8), ballMat = lam(0xffffff);
  const G = 9.8;
  function throwAt(target, origin) {
    const T = 0.6 + origin.distanceTo(target) * 0.02;
    const wob = new THREE.Vector3((Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.12, 0);
    const tgt = target.clone().add(wob);
    const v = tgt.clone().sub(origin).divideScalar(T); v.y += 0.5 * G * T;   // ballistische Flugbahn
    const m = new THREE.Mesh(ballGeo, ballMat); m.position.copy(origin); scene.add(m);
    balls.push({ m, v, own: true, life: 3 });
  }
  const splats = [];
  function splat(p) {
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), ballMat); s.position.copy(p); scene.add(s);
      splats.push({ m: s, v: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2), life: 0.6 });
    }
  }

  // Zielen und Werfen
  const el = renderer.domElement;
  let yaw = 0, pitch = -0.06, drag = null;
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, yaw, pitch, moved: 0 }; });
  el.addEventListener('pointermove', e => {
    if (!drag) return;
    const w = el.clientWidth || 1, dx = (e.clientX - drag.x) / w, dy = (e.clientY - drag.y) / w;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    yaw = Math.max(-1.2, Math.min(1.2, drag.yaw + dx * 2.4)); pitch = Math.max(-0.4, Math.min(0.4, drag.pitch + dy * 1.4));
  });
  el.addEventListener('pointerup', e => { if (drag && drag.moved < 10) tap(e); drag = null; });
  const ray = new THREE.Raycaster();
  let cooldown = 0;
  function tap(e) {
    if (cooldown > 0) return;
    if (canThrow && !canThrow()) return;          // nicht dran: index.html zeigt, wer wirft
    const r = el.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    // Zielpunkt: Schnittpunkt mit der Ebene der Dosen (oder in die Ferne)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -CAN_Z);
    let tgt = ray.ray.intersectPlane(plane, new THREE.Vector3());
    if (!tgt || tgt.z > -1) tgt = ray.ray.at(DIST + 6, new THREE.Vector3());
    const origin = camera.position.clone().add(new THREE.Vector3(0.25, -0.2, -0.3));
    throwAt(tgt, origin);
    onThrow?.();
    cooldown = 1.2;
  }

  function resize() {
    const w = container.clientWidth || 360, h = container.clientHeight || 640;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 60 : 46; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  const clock = new THREE.Clock(); let raf = 0, time = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta()); time += dt; cooldown -= dt;
    // Bälle fliegen
    for (let k = balls.length - 1; k >= 0; k--) {
      const b = balls[k]; b.life -= dt;
      const prev = b.m.position.clone();
      b.v.y -= G * dt; b.m.position.addScaledVector(b.v, dt);
      const p = b.m.position;
      let done = p.y < 0.05 || b.life <= 0;
      // schnelle Bälle: prüfen, ob die Flugbahn in diesem Bild die Dosenreihe gekreuzt hat
      if (!done && prev.z > CAN_Z && p.z <= CAN_Z) {
        const q = prev.clone().lerp(p, (prev.z - CAN_Z) / (prev.z - p.z));
        for (let i = 0; i < canObjs.length; i++) {
          const c = canObjs[i]; if (c.down) continue;
          if (Math.abs(q.x - c.x) < CAN_R + BALL_R && Math.abs(q.y - CAN_Y) < CAN_HH + BALL_R) {
            knock(i, true, q.clone().sub(new THREE.Vector3(c.x, CAN_Y, CAN_Z))); if (b.own) onHit?.(i); done = true; break;
          }
        }
        if (!done && q.y < 1.1 && q.y > 0.9 && Math.abs(q.x) < (cans.length * SP) / 2 + 0.4) done = true;   // Brett getroffen
        if (done) p.copy(q);
      }
      if (done) { splat(p); scene.remove(b.m); balls.splice(k, 1); }
    }
    for (let k = splats.length - 1; k >= 0; k--) {
      const s = splats[k]; s.life -= dt; s.v.y -= G * dt; s.m.position.addScaledVector(s.v, dt);
      if (s.life <= 0) { scene.remove(s.m); splats.splice(k, 1); }
    }
    // umfallende Dosen und aufsteigende Buchstaben
    for (const c of canObjs) {
      if (c.down && c.vel) {
        c.vel.y -= G * dt; c.mesh.position.addScaledVector(c.vel, dt); c.mesh.rotation.z += c.spin * dt; c.mesh.rotation.x += c.spin * 0.5 * dt;
        if (c.mesh.position.y < 0.12) { c.mesh.position.y = 0.12; c.vel = null; c.mesh.rotation.set(Math.PI / 2, 0, R() * 3); }
      }
      if (c.sprite) {
        c.sprite.userData.rise = Math.min(1, c.sprite.userData.rise + dt * 1.2);
        c.sprite.position.y = CAN_Y + 0.3 + c.sprite.userData.rise * 0.9 + Math.sin(time * 2 + c.x) * 0.06;
      }
    }
    // Mitspieler: Wurfbewegung, wenn sie gerade geworfen haben
    for (const m of mateObjs) {
      if (m.t > 0) { m.t -= dt; m.arm.rotation.x = -Math.sin((0.6 - m.t) / 0.6 * Math.PI) * 2.4; } else m.arm.rotation.x = 0;
      m.body.position.y = Math.sin(time * 1.5 + m.g.position.x) * 0.01;
    }
    // Fans hüpfen und winken, nach einem Treffer noch wilder
    cheer = Math.max(0, cheer - dt);
    for (const f of fans) {
      const k = 1 + Math.min(1, cheer) * 1.2, w = time * (5 + k * 2) + f.ph;
      f.body.position.y = Math.abs(Math.sin(w * 0.5)) * 0.12 * k;
      f.arm.rotation.z = 2.5 + Math.sin(w) * 0.35 * k; f.arm2.rotation.z = -2.5 - Math.sin(w + 1.3) * 0.35 * k;
    }
    camera.position.set(0, 1.7, CAM_Z);
    camera.lookAt(Math.sin(yaw) * Math.cos(pitch) * DIST, 1.7 + Math.sin(pitch) * DIST - 1.3, CAM_Z - Math.cos(yaw) * Math.cos(pitch) * DIST);
    renderer.render(scene, camera);
  }
  loop();

  return {
    // Treffer anderer Mitspieler (aus Firebase) nachziehen
    setHits(list) { (list || []).forEach(i => knock(i, false)); },
    // ein anderer aus dem Team hat geworfen: seine Figur macht die Wurfbewegung
    setThrower(tok, at) {
      if (!at || at <= lastThrowSeen) return; const first = !lastThrowSeen; lastThrowSeen = at;
      if (first && Date.now() - at > 3000) return;
      const m = mateObjs.find(o => o.token === tok); if (m) m.t = 0.6;
    },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); el.remove(); }
  };
}
