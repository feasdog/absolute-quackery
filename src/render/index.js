// Puts the scene together: lights, camera, ducks, rink, effects, and the
// post-processing (bloom makes neon, visors and sparks glow).
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildDuck, poseDuck } from './duck.js';
import { buildRink } from './rink.js';
import { createEffects } from './effects.js';
import { mesh, toon, glow } from './materials.js';

export function createRenderer(canvas, match) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0716);
  scene.fog = new THREE.Fog(0x120a24, 16, 34);

  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 120);

  // Lighting: cool fill, a hard key light that casts shadows, and pink and
  // cyan rim lights from behind so the silhouettes pop off the dark arena.
  scene.add(new THREE.HemisphereLight(0xc8dcff, 0x2a1a40, 1.15));
  const key = new THREE.DirectionalLight(0xfff4e8, 2.1);
  key.position.set(4, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -11, right: 11, top: 8, bottom: -6, near: 1, far: 40 });
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const rimPink = new THREE.DirectionalLight(0xff3bd8, 1.6);
  rimPink.position.set(-8, 4, -6);
  scene.add(rimPink);
  const rimCyan = new THREE.DirectionalLight(0x22e4ff, 1.4);
  rimCyan.position.set(8, 4, -6);
  scene.add(rimCyan);

  const rink = buildRink(scene, renderer);
  const fx = createEffects(scene);

  let ducks = [];
  const setFighters = (m) => {
    ducks.forEach((d) => scene.remove(d));
    ducks = m.fighters.map((f) => { const d = buildDuck(f.def); scene.add(d); return d; });
  };
  setFighters(match);

  // Pucks: black disc with a glowing cyan edge
  const puckPool = [];
  const makePuck = () => {
    const g = new THREE.Group();
    const disc = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.09, 20), toon(0x111111), { outline: 0.015 });
    g.add(disc);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 6, 24), glow(0x22e4ff, 3));
    edge.rotation.x = Math.PI / 2;
    g.add(edge);
    scene.add(g);
    return g;
  };

  // Post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.75, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const camPos = new THREE.Vector3(0, 2.2, 11);
  let punch = 0;
  let lastFrame = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const pr = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function render(m, events) {
    resize();
    const frame = m.frame;
    const simFrames = Math.max(1, Math.min(4, frame - lastFrame));
    lastFrame = frame;

    m.fighters.forEach((f, i) => {
      poseDuck(ducks[i], f, frame, simFrames);
      if (f.state === 'dash' && frame % 3 === 0) fx.spray(f.x, Math.sign(f.vx) || f.facing);
    });

    while (puckPool.length < m.projectiles.length) puckPool.push(makePuck());
    puckPool.forEach((g, i) => {
      const p = m.projectiles[i];
      g.visible = !!p;
      if (p) {
        g.position.set(p.x, p.y + 0.45, 0.3);
        g.rotation.z = Math.PI / 2;
        g.rotation.x += 0.5;
        fx.trail(p.x - Math.sign(p.vx) * 0.2, p.y + 0.45);
      }
    });

    for (const e of events) {
      const f = m.fighters[e.side];
      if (e.type === 'hit') {
        fx.hit(f.x, f.y + 1.5 * f.def.scale, e.heavy, -f.facing);
        rink.cheer(e.heavy ? 0.5 : 0.15);
        if (e.heavy) punch = 1;
      } else if (e.type === 'block') {
        fx.block(f.x + f.facing * 0.55, f.y + 1.4);
      } else if (e.type === 'boards') {
        fx.boards(e.x);
        rink.cheer(0.8);
        punch = 1.2;
      } else if (e.type === 'ko') {
        const loser = m.fighters.find((x) => x.hp <= 0) || m.fighters[0];
        fx.ko(loser.x, 1.5);
        rink.cheer(1);
        punch = 1.5;
      } else if (e.type === 'dash') {
        fx.spray(f.x, f.facing);
      }
    }
    fx.update();
    rink.update(frame);

    // Camera follows the action and pulls back when the fighters split up.
    // Big hits "punch" it in for a moment.
    const [a, b] = m.fighters;
    const mid = (a.x + b.x) / 2;
    const spread = Math.abs(a.x - b.x);
    punch *= 0.9;
    const target = new THREE.Vector3(Math.max(-4, Math.min(4, mid)), 2.2, 8.4 + spread * 0.55 - punch * 1.0);
    camPos.lerp(target, 0.08);
    camera.position.copy(camPos);
    if (m.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * m.shake * 0.025;
      camera.position.y += (Math.random() - 0.5) * m.shake * 0.025;
    }
    camera.lookAt(camPos.x, 1.35, 0);
    composer.render();
  }

  return { render, setFighters, camera, scene };
}
