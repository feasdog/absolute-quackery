// Drawing the fight with Three.js. Greybox stage: placeholder shapes in
// each duck's colors, with a cel-shaded look (flat toon shading + outlines)
// so we can judge the style early. Real duck models replace these later.
import * as THREE from 'three';
import { WALL_X } from './game/match.js';

const OUTLINE = 0x0a0a12;

function toonGradient() {
  // 3-step light ramp = the "cel" in cel-shading
  const data = new Uint8Array([70, 150, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
const GRADIENT = toonGradient();

const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: GRADIENT, ...extra });

// "Inverted hull" outline: a slightly bigger black copy, drawn inside-out.
function withOutline(mesh, thickness = 0.05) {
  const outline = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: OUTLINE, side: THREE.BackSide }));
  outline.scale.setScalar(1 + thickness / Math.max(0.2, mesh.geometry.boundingSphere?.radius || 0.5));
  mesh.add(outline);
  return mesh;
}

function part(geometry, material) {
  geometry.computeBoundingSphere();
  return withOutline(new THREE.Mesh(geometry, material));
}

function buildDuck(def) {
  const { primary, secondary, accent } = def.colors;
  const root = new THREE.Group();
  const body = new THREE.Group();     // leans and squashes with actions
  root.add(body);

  // Torso (jersey) with big shoulder pads
  const torso = part(new THREE.CapsuleGeometry(0.42, 0.55, 6, 16), toon(primary));
  torso.position.y = 1.05;
  body.add(torso);
  const pads = part(new THREE.BoxGeometry(1.15, 0.28, 0.75), toon(secondary));
  pads.position.y = 1.5;
  body.add(pads);

  // Legs (pants) and skates
  for (const z of [-0.18, 0.18]) {
    const leg = part(new THREE.CapsuleGeometry(0.15, 0.35, 4, 8), toon(secondary));
    leg.position.set(0, 0.42, z);
    body.add(leg);
    const skate = part(new THREE.BoxGeometry(0.42, 0.12, 0.14), toon(0xdddddd));
    skate.position.set(0.05, 0.08, z);
    body.add(skate);
  }

  // Head (species color), helmet, beak and angry brow
  const head = new THREE.Group();
  head.position.y = 1.95;
  body.add(head);
  head.add(part(new THREE.SphereGeometry(0.3, 16, 12), toon(accent)));
  const helmet = part(new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(secondary));
  helmet.position.y = 0.04;
  head.add(helmet);
  const beakLength = def.id === 'razor' ? 0.5 : 0.36;
  const beak = part(new THREE.ConeGeometry(0.11, beakLength, 8), toon(def.id === 'razor' ? 0xb33a1a : 0xe0a020));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.3 + beakLength / 2, -0.06, 0);
  head.add(beak);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.5), new THREE.MeshBasicMaterial({ color: OUTLINE }));
  brow.position.set(0.22, 0.1, 0);
  brow.rotation.z = -0.35;
  head.add(brow);
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.42), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  eyes.position.set(0.27, 0.03, 0);
  head.add(eyes);

  if (def.id === 'razor') {
    // Punk crest
    for (let i = 0; i < 4; i++) {
      const spike = part(new THREE.ConeGeometry(0.06, 0.35, 5), toon(primary));
      spike.position.set(-0.05 - i * 0.1, 0.3, 0);
      spike.rotation.z = 0.7 + i * 0.15;
      head.add(spike);
    }
  }

  // Arm + stick on a pivot at the shoulder, so attacks can swing it
  const arm = new THREE.Group();
  arm.position.set(0.1, 1.45, 0.42);
  body.add(arm);
  const sleeve = part(new THREE.CapsuleGeometry(0.12, 0.4, 4, 8), toon(primary));
  sleeve.position.set(0.18, -0.25, 0);
  sleeve.rotation.z = 0.6;
  arm.add(sleeve);
  const stick = new THREE.Group();
  stick.position.set(0.38, -0.45, 0);
  arm.add(stick);
  const shaft = part(new THREE.BoxGeometry(0.07, 1.4, 0.07), toon(0x8a5a2b));
  shaft.position.y = -0.55;
  stick.add(shaft);
  const blade = part(new THREE.BoxGeometry(0.38, 0.1, 0.06), toon(0x222222));
  blade.position.set(0.15, -1.22, 0);
  stick.add(blade);
  stick.rotation.z = 0.5;

  root.scale.setScalar(def.scale);
  root.userData = { body, head, arm, stick, torso };

  // Collect materials so we can flash the duck white on hits
  const mats = [];
  root.traverse((o) => { if (o.material && o.material.isMeshToonMaterial) mats.push(o.material); });
  root.userData.materials = mats;
  return root;
}

function buildRink(scene) {
  // Ice
  const ice = new THREE.Mesh(new THREE.PlaneGeometry(40, 26), toon(0xdfeeff));
  ice.rotation.x = -Math.PI / 2;
  ice.position.z = 8;
  scene.add(ice);
  // Rink lines (red center, blue lines)
  const line = (x, color, w = 0.18) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 20), new THREE.MeshBasicMaterial({ color }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, 6.8); scene.add(m);
  };
  line(0, 0xd01a2a, 0.25); line(-4, 0x1a4ad0); line(4, 0x1a4ad0);
  // Cracked-ice decals (simple dark slivers)
  for (let i = 0; i < 14; i++) {
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.5 + Math.random()), new THREE.MeshBasicMaterial({ color: 0x9fb8d8 }));
    crack.rotation.x = -Math.PI / 2; crack.rotation.z = Math.random() * Math.PI;
    crack.position.set((Math.random() - 0.5) * 16, 0.012, (Math.random() - 0.5) * 3);
    scene.add(crack);
  }
  // Boards at each end, with a yellow kick plate and glass above
  for (const s of [-1, 1]) {
    const x = s * (WALL_X + 0.75);
    const board = part(new THREE.BoxGeometry(0.3, 1.2, 8), toon(0xf4f4f4));
    board.position.set(x, 0.6, 0);
    scene.add(board);
    const kick = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 8), new THREE.MeshBasicMaterial({ color: 0xf2c81a }));
    kick.position.set(x, 0.11, 0);
    scene.add(kick);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 8), new THREE.MeshBasicMaterial({ color: 0x99ccff, transparent: true, opacity: 0.18 }));
    glass.position.set(x, 2.4, 0);
    scene.add(glass);
  }
  // Back boards along the far side
  const back = part(new THREE.BoxGeometry(2 * WALL_X + 1.8, 1.2, 0.3), toon(0xf4f4f4));
  back.position.set(0, 0.6, -3.2);
  scene.add(back);
  const ad = new THREE.Mesh(new THREE.BoxGeometry(2 * WALL_X + 1.8, 0.5, 0.32), new THREE.MeshBasicMaterial({ color: 0x1b1030 }));
  ad.position.set(0, 0.75, -3.2);
  scene.add(ad);

  // Neon strips and dark crowd haze behind
  const neon = (y, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(30, 0.08, 0.08), new THREE.MeshBasicMaterial({ color }));
    m.position.set(0, y, -6); scene.add(m);
  };
  neon(4.2, 0xff2bd6); neon(4.6, 0x22e4ff); neon(7.5, 0xff2bd6);
  for (let i = 0; i < 160; i++) {
    const fan = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), new THREE.MeshBasicMaterial({ color: [0x241a3a, 0x2c2048, 0x1a1430][i % 3] }));
    fan.position.set((Math.random() - 0.5) * 30, 2 + Math.random() * 2.2, -7 - Math.random() * 3);
    scene.add(fan);
  }
}

export function createRenderer(canvas, match) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0818);
  scene.fog = new THREE.Fog(0x0c0818, 14, 30);

  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x302040, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 8, 6);
  scene.add(key);
  const rimPink = new THREE.DirectionalLight(0xff3bd8, 1.2);
  rimPink.position.set(-6, 3, -5);
  scene.add(rimPink);
  const rimBlue = new THREE.DirectionalLight(0x22e4ff, 1.0);
  rimBlue.position.set(6, 3, -5);
  scene.add(rimBlue);

  buildRink(scene);

  let ducks = [];
  const setFighters = (m) => {
    ducks.forEach((d) => scene.remove(d));
    ducks = m.fighters.map((f) => { const d = buildDuck(f.def); scene.add(d); return d; });
  };
  setFighters(match);

  const puckMeshes = [];
  const puckGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 14);
  const puckMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const puckGlow = new THREE.MeshBasicMaterial({ color: 0x22e4ff, transparent: true, opacity: 0.5 });

  // Sparks on hits
  const sparks = [];
  const sparkGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
  const spawnSparks = (x, y, color, count) => {
    for (let i = 0; i < count; i++) {
      const s = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color }));
      s.position.set(x, y, 0.4);
      s.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.25, Math.random() * 0.22, (Math.random() - 0.5) * 0.1);
      s.userData.life = 18 + Math.random() * 12;
      scene.add(s);
      sparks.push(s);
    }
  };

  const camPos = new THREE.Vector3(0, 2.6, 13);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function poseDuck(duck, f, t) {
    const { body, arm, stick, head } = duck.userData;
    duck.position.set(f.x, f.y, 0);
    duck.rotation.y = f.facing === 1 ? 0 : Math.PI;
    body.rotation.set(0, 0, 0);
    body.position.set(0, 0, 0);
    arm.rotation.set(0, 0, 0);
    stick.rotation.set(0, 0, 0.5);
    head.rotation.set(0, 0, 0);
    let squash = 1;

    switch (f.state) {
      case 'idle':
        body.position.y = Math.sin(t * 0.08 + f.side) * 0.03;
        body.rotation.z = -0.08;
        break;
      case 'walk':
        body.rotation.z = -0.15;
        body.position.y = Math.abs(Math.sin(t * 0.25)) * 0.05;
        break;
      case 'dash':
        body.rotation.z = -0.4;
        break;
      case 'jump':
        squash = 1.05;
        arm.rotation.z = 0.6;
        break;
      case 'attack': {
        const mv = f.move;
        if (!mv) break;
        const total = mv.startup + mv.active + mv.recovery;
        const p = f.stateFrame / total;
        const windup = Math.min(1, f.stateFrame / mv.startup);
        const inActive = f.stateFrame >= mv.startup && f.stateFrame < mv.startup + mv.active;
        if (f.moveKey === 'jab') {
          arm.rotation.z = inActive ? -1.4 : -1.4 * (1 - p) * windup;
          body.rotation.z = -0.25;
        } else if (f.moveKey === 'stick') {
          stick.rotation.z = inActive ? 1.9 : 0.5 + windup * 1.4 * (inActive ? 1 : 0.4);
          arm.rotation.z = inActive ? -0.9 : 0.6 * windup;
        } else if (f.moveKey === 'check') {
          body.rotation.z = inActive ? -0.7 : 0.25 * windup;
          body.position.x = inActive ? 0.25 : -0.1 * windup;
          squash = inActive ? 1.08 : 1;
        } else if (f.moveKey === 'shot') {
          stick.rotation.z = f.stateFrame < mv.startup ? -0.8 * windup : 1.6;
          arm.rotation.z = f.stateFrame < mv.startup ? 1.0 * windup : -0.6;
        }
        break;
      }
      case 'blockstun':
      case 'idle-block':
        break;
      case 'hitstun':
        body.rotation.z = 0.45;
        head.rotation.z = 0.4;
        break;
      case 'ko':
        body.rotation.z = Math.min(1.5, 0.3 + f.stateFrame * 0.04);
        break;
    }
    if (f.blocking || f.state === 'blockstun') {
      body.rotation.z = 0.2;
      stick.rotation.z = 1.4;
      arm.rotation.z = 0.9;
    }
    body.scale.set(1 / squash, squash, 1);

    const flash = f.flash > 0 ? 1 : 0;
    for (const mat of duck.userData.materials) mat.emissive.setScalar(flash * 0.8);
  }

  function render(m, events) {
    resize();
    const t = m.frame;
    m.fighters.forEach((f, i) => poseDuck(ducks[i], f, t));

    // Pucks
    while (puckMeshes.length < m.projectiles.length) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(puckGeo, puckMat));
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), puckGlow);
      g.add(glow);
      scene.add(g);
      puckMeshes.push(g);
    }
    puckMeshes.forEach((g, i) => {
      const p = m.projectiles[i];
      g.visible = !!p;
      if (p) { g.position.set(p.x, p.y + 0.5, 0.3); g.rotation.x = Math.PI / 2; g.rotation.y += 0.4; }
    });

    for (const e of events) {
      if (e.type === 'hit') {
        const f = m.fighters[e.side];
        spawnSparks(f.x, f.y + 1.4 * f.def.scale, e.heavy ? 0xffd23a : 0xffffff, e.heavy ? 26 : 12);
      } else if (e.type === 'block') {
        const f = m.fighters[e.side];
        spawnSparks(f.x + f.facing * 0.5, f.y + 1.3, 0x22e4ff, 8);
      } else if (e.type === 'boards') {
        spawnSparks(e.x, 1.2, 0xffffff, 40);
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.position.add(s.userData.v);
      s.userData.v.y -= 0.012;
      if (--s.userData.life <= 0) { scene.remove(s); s.material.dispose(); sparks.splice(i, 1); }
    }

    // Camera: follow the midpoint, pull back when fighters are far apart
    const [a, b] = m.fighters;
    const mid = (a.x + b.x) / 2;
    const spread = Math.abs(a.x - b.x);
    const target = new THREE.Vector3(Math.max(-3.5, Math.min(3.5, mid)), 2.6, 11.5 + spread * 0.45);
    camPos.lerp(target, 0.08);
    camera.position.copy(camPos);
    if (m.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * m.shake * 0.02;
      camera.position.y += (Math.random() - 0.5) * m.shake * 0.02;
    }
    camera.lookAt(camPos.x, 1.4, 0);
    renderer.render(scene, camera);
  }

  return { render, setFighters, camera, scene };
}
