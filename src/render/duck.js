// Builds and animates the duck fighters from code, following the approved
// concept proofs. Each duck is a small "rig": a tree of joints (hips,
// torso, arms, legs, head) that we rotate every frame to pose it.
//
// Conventions: the duck faces +x. A positive rotation around z swings a
// hanging arm or leg forward, and tips the torso backward.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mesh, toon, paintedToon, numberTexture, glow } from './materials.js';

const MODEL_SCALE = 0.88;
const THIGH = 0.45;
const SHIN = 0.5;
const HIP_HEIGHT = THIGH + SHIN;

// Per-duck look, matched to the concept proofs
const LOOKS = {
  freight: {
    jersey: 0xe8641c, trim: 0x16161a, pants: 0x16161a, head: 0x1f6b45, headTop: 0x2a8a58,
    bill: 0xe7a62a, helmet: 0x141418, sock: 0xe8641c, glove: 0x16161a, numberFill: 0xffffff, numberStroke: 0x16161a,
    girth: 1.0, padSize: 1.1, billShape: [1.55, 0.42, 0.85], helmetStyle: 'cage', collar: 0xf2f2f2,
    eyeGlow: 0xffa21a, tapedBill: true, scar: true,
  },
  razor: {
    jersey: 0xc8102e, trim: 0x111114, pants: 0x111114, head: 0x18181c, headTop: 0x2a2a30,
    bill: 0xc2401c, helmet: 0x111114, sock: 0x111114, glove: 0x111114, numberFill: 0xffffff, numberStroke: 0x111114,
    girth: 0.84, padSize: 0.85, billShape: [2.2, 0.3, 0.6], helmetStyle: 'visor', crest: 0xd0122f,
    eyeGlow: 0xff2244, scar: true,
  },
};

function rbox(w, h, d, r = 0.05) {
  return new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
}

function joint(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function buildLeg(parent, z, look) {
  const hip = joint(parent, 0, 0, z);
  // Hockey breezers (padded shorts)
  const thigh = mesh(new THREE.CapsuleGeometry(0.21 * look.girth, 0.22, 6, 14), paintedToon(look.pants, { seed: 3 }));
  thigh.position.y = -0.2;
  hip.add(thigh);
  const knee = joint(hip, 0, -THIGH, 0);
  // Socks with a stripe
  const shin = mesh(new THREE.CapsuleGeometry(0.13, 0.22, 4, 12), paintedToon(look.sock, { seed: 4, stripes: [{ from: 0.45, to: 0.6, color: look.trim === look.sock ? 0xf2f2f2 : look.trim }] }));
  shin.position.y = -0.2;
  knee.add(shin);
  // Skate boot, laces and chrome blade
  const boot = mesh(rbox(0.4, 0.2, 0.22, 0.07), toon(0x1a1a1f));
  boot.position.set(0.05, -SHIN + 0.13, 0);
  knee.add(boot);
  const toe = mesh(rbox(0.16, 0.12, 0.2, 0.05), toon(0xdedede));
  toe.position.set(0.2, -SHIN + 0.09, 0);
  knee.add(toe);
  const blade = new THREE.Mesh(rbox(0.5, 0.045, 0.03, 0.015), new THREE.MeshPhongMaterial({ color: 0xc9d3e0, shininess: 120, specular: 0xffffff }));
  blade.position.set(0.06, -SHIN + 0.0, 0);
  blade.castShadow = true;
  knee.add(blade);
  return { hip, knee };
}

function buildArm(parent, z, look) {
  const shoulder = joint(parent, 0.02, 0.8, z);
  const upper = mesh(new THREE.CapsuleGeometry(0.135 * look.girth, 0.26, 4, 12), paintedToon(look.jersey, { seed: 5, stripes: [{ from: 0.25, to: 0.4, color: look.trim }] }));
  upper.position.y = -0.2;
  shoulder.add(upper);
  const elbow = joint(shoulder, 0, -0.42, 0);
  const fore = mesh(new THREE.CapsuleGeometry(0.12 * look.girth, 0.2, 4, 12), paintedToon(look.jersey, { seed: 6 }));
  fore.position.y = -0.17;
  elbow.add(fore);
  const hand = joint(elbow, 0, -0.42, 0);
  const cuff = mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.12, 14), toon(look.jersey));
  cuff.position.y = 0.1;
  hand.add(cuff);
  const glove = mesh(rbox(0.3, 0.26, 0.26, 0.09), paintedToon(look.glove, { seed: 8 }));
  hand.add(glove);
  return { shoulder, elbow, hand };
}

function buildStick(hand) {
  const pivot = joint(hand, 0, 0, 0.04);
  const shaft = mesh(rbox(0.065, 1.55, 0.065, 0.025), paintedToon(0x9a6a3a, { seed: 11, strokes: 120 }), { outline: 0.018 });
  shaft.position.y = -0.62;
  pivot.add(shaft);
  // Grip tape at the top, blade tape at the bottom
  const grip = mesh(rbox(0.075, 0.22, 0.075, 0.03), toon(0x111111), { outline: 0 });
  grip.position.y = 0.06;
  pivot.add(grip);
  const blade = mesh(rbox(0.46, 0.13, 0.05, 0.04), toon(0x161616), { outline: 0.018 });
  blade.position.set(0.18, -1.38, 0);
  pivot.add(blade);
  const tape = mesh(rbox(0.3, 0.11, 0.055, 0.03), toon(0xf2f2f2), { outline: 0 });
  tape.position.set(0.2, -1.38, 0);
  pivot.add(tape);
  return pivot;
}

function buildHead(parent, def, look) {
  const neck = joint(parent, 0.08, 1.1, 0);
  const neckMesh = mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.25, 14), paintedToon(look.head, { seed: 12 }));
  neckMesh.position.y = 0.06;
  neck.add(neckMesh);
  if (look.collar) {
    // Mallards have a white neck ring; Freight keeps his.
    const collar = mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 20), toon(look.collar), { outline: 0.012 });
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.02;
    neck.add(collar);
  }
  const head = joint(neck, 0.02, 0.42, 0);
  const skull = mesh(new THREE.SphereGeometry(0.34, 24, 18), paintedToon(look.head, { seed: 13, stripes: [{ from: 0.6, to: 1, color: look.headTop }] }));
  skull.scale.set(1.08, 0.98, 0.9);
  head.add(skull);

  // Bill: upper and lower halves so it can open on a yell
  const [bl, bh, bw] = look.billShape;
  const upperBill = mesh(new THREE.SphereGeometry(0.2, 18, 12), paintedToon(look.bill, { seed: 14, strokes: 140 }));
  upperBill.scale.set(bl, bh, bw);
  upperBill.position.set(0.36 + bl * 0.06, -0.06, 0);
  head.add(upperBill);
  const jaw = joint(head, 0.28, -0.1, 0);
  const lowerBill = mesh(new THREE.SphereGeometry(0.18, 16, 10), toon(new THREE.Color(look.bill).multiplyScalar(0.75)));
  lowerBill.scale.set(bl * 0.9, bh * 0.7, bw * 0.85);
  lowerBill.position.set(0.12 + bl * 0.06, -0.04, 0);
  jaw.add(lowerBill);
  if (look.tapedBill) {
    const tape = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 12, 1, true), toon(0xf4f4f4), { outline: 0.01 });
    tape.scale.set(1, 1, 2.2);
    tape.rotation.z = Math.PI / 2;
    tape.position.set(0.52, -0.05, 0);
    head.add(tape);
  }

  // Eyes, pupils and angry brows on both sides (we see one side at a time)
  const eyeMats = [];
  for (const s of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), toon(0xf6f3e8));
    white.scale.set(1, 0.62, 0.45);
    white.position.set(0.22, -0.01, s * 0.28);
    head.add(white);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0b0a12, toneMapped: false });
    eyeMats.push(pupilMat);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), pupilMat);
    pupil.scale.set(1, 1, 0.6);
    pupil.position.set(0.26, -0.015, s * 0.305);
    head.add(pupil);
    const brow = mesh(rbox(0.26, 0.07, 0.07, 0.025), toon(0x0b0a12), { outline: 0 });
    brow.position.set(0.22, 0.07, s * 0.29);
    brow.rotation.z = -0.42;            // slants down toward the bill = angry
    head.add(brow);
    if (look.scar && s === 1) {
      const scar = new THREE.Mesh(rbox(0.03, 0.22, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0xd98080 }));
      scar.position.set(0.17, 0.0, s * 0.31);
      scar.rotation.z = 0.5;
      head.add(scar);
    }
  }

  // Helmet
  const helmet = mesh(new THREE.SphereGeometry(0.37, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), paintedToon(look.helmet, { seed: 15, grain: 0.22 }));
  helmet.scale.set(1.08, 1, 0.96);
  helmet.position.y = 0.1;
  head.add(helmet);
  const rim = mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 28), toon(look.trim === look.helmet ? 0x2a2a30 : look.trim), { outline: 0.01 });
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.08, 0.96, 1);
  rim.position.y = 0.19;
  rim.scale.multiplyScalar(0.93);
  head.add(rim);

  if (look.helmetStyle === 'cage') {
    const metal = toon(0x80848c);
    for (const y of [-0.12, -0.02, 0.08]) {
      const bar = mesh(new THREE.TorusGeometry(0.42, 0.016, 6, 24, Math.PI * 0.8), metal, { outline: 0.008 });
      bar.rotation.x = Math.PI / 2;
      bar.rotation.z = -Math.PI * 0.4;
      bar.position.set(0.02, y, 0);
      head.add(bar);
    }
    const vbar = mesh(new THREE.TorusGeometry(0.4, 0.018, 6, 20, Math.PI * 0.55), metal, { outline: 0.008 });
    vbar.rotation.z = -Math.PI * 0.3;
    vbar.position.set(0.02, 0.0, 0);
    head.add(vbar);
  } else {
    // Razor: dark visor with a glowing red edge
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.39, 0.16, 24, 1, true, Math.PI * 0.2, Math.PI * 0.6),
      new THREE.MeshPhongMaterial({ color: 0x220810, shininess: 140, specular: 0xff8090, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    visor.position.y = 0.06;
    head.add(visor);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(0.392, 0.01, 6, 24, Math.PI * 0.6), glow(0xff2244, 2.5));
    edge.rotation.x = Math.PI / 2;
    edge.rotation.z = Math.PI * 0.2 - Math.PI / 2 + Math.PI * 0.5;
    edge.position.y = -0.02;
    head.add(edge);
  }

  if (look.crest) {
    // Merganser punk crest sweeping back out of the helmet
    const crestMat = paintedToon(look.crest, { seed: 16 });
    for (let i = 0; i < 6; i++) {
      const spike = mesh(new THREE.ConeGeometry(0.07 - i * 0.004, 0.5 - i * 0.03, 6), crestMat, { outline: 0.012 });
      spike.position.set(-0.18 - i * 0.07, 0.2 - i * 0.03, (i % 2 ? 1 : -1) * 0.06);
      spike.rotation.z = 1.25 + i * 0.07;
      head.add(spike);
    }
  }

  return { neck, head, jaw, eyeMats };
}

export function buildDuck(def) {
  const look = LOOKS[def.id];
  const root = new THREE.Group();
  const scaleGroup = joint(root, 0, 0, 0);
  scaleGroup.scale.setScalar(def.scale * MODEL_SCALE);
  const hips = joint(scaleGroup, 0, HIP_HEIGHT, 0);

  const legs = [buildLeg(hips, 0.2, look), buildLeg(hips, -0.2, look)];

  // Torso: a barrel-chested jersey made by spinning a profile ("lathe")
  const torso = joint(hips, 0, 0, 0);
  const profile = [
    [0.0, -0.02], [0.32, 0.0], [0.42, 0.12], [0.5, 0.38], [0.54, 0.62], [0.52, 0.8], [0.42, 0.95], [0.22, 1.04], [0.0, 1.06],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const jerseyMat = paintedToon(look.jersey, { seed: 21, stripes: [{ from: 0.08, to: 0.16, color: look.trim }, { from: 0.18, to: 0.21, color: 0xf2f2f2 }] });
  const chest = mesh(new THREE.LatheGeometry(profile, 28), jerseyMat, { outline: 0.03 });
  chest.scale.set(1 * look.girth, 1, 0.82 * look.girth);
  torso.add(chest);

  // Jersey numbers on both sides
  const numMat = new THREE.MeshBasicMaterial({ map: numberTexture(def.number, look.numberFill, look.numberStroke), transparent: true, alphaTest: 0.2, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const s of [-1, 1]) {
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), numMat);
    num.position.set(-0.02, 0.5, s * 0.455 * look.girth);
    if (s === -1) num.rotation.y = Math.PI;
    torso.add(num);
  }

  // Oversized armored shoulder pads with rivets
  const padMat = paintedToon(look.trim, { seed: 22, grain: 0.25 });
  const rivetMat = new THREE.MeshPhongMaterial({ color: 0xc0c4cc, shininess: 90 });
  for (const s of [-1, 1]) {
    const pad = mesh(new THREE.SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), padMat, { outline: 0.03 });
    pad.scale.set(1.15 * look.padSize, 0.85 * look.padSize, 1.0 * look.padSize);
    pad.position.set(0.02, 0.86, s * 0.34 * look.girth);
    pad.rotation.x = s * 0.35;
    torso.add(pad);
    for (let i = 0; i < 3; i++) {
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), rivetMat);
      const a = -0.6 + i * 0.6;
      rivet.position.set(0.02 + Math.sin(a) * 0.3 * look.padSize, 0.86 + 0.1 * look.padSize, s * (0.34 * look.girth + 0.2 * look.padSize));
      torso.add(rivet);
    }
  }
  // Chest plate peeking out the collar
  const yoke = mesh(rbox(0.7 * look.girth, 0.18, 0.62 * look.girth, 0.08), padMat, { outline: 0.02 });
  yoke.position.set(0.04, 0.92, 0);
  torso.add(yoke);

  // Tail feathers sticking out the back of the pants
  for (let i = 0; i < 3; i++) {
    const f = mesh(new THREE.ConeGeometry(0.06, 0.3, 5), toon(look.head), { outline: 0.012 });
    f.position.set(-0.4, 0.05 + i * 0.05, (i - 1) * 0.08);
    f.rotation.z = 2.1 + i * 0.1;
    hips.add(f);
  }

  const arms = [buildArm(torso, 0.5 * look.girth, look), buildArm(torso, -0.5 * look.girth, look)];
  const stick = buildStick(arms[0].hand);
  const head = buildHead(torso, def, look);

  const materials = [];
  root.traverse((o) => { if (o.material && o.material.isMeshToonMaterial) materials.push(o.material); });

  root.userData = {
    def, look, hips, torso, legs, arms, stick, ...head, materials,
    pose: restPose(), stride: 0, lean: 0, koFall: 0,
  };
  return root;
}

// ---------- Animation ----------

function restPose() {
  return {
    torso: -0.12, head: 0.08, jaw: 0,
    nearSh: 0.55, nearEl: 0.7, farSh: 0.95, farEl: 0.45, stick: 0.95,
    thighs: [0.45, 0.45], knees: [-0.85, -0.85], hipDrop: 0, bodyX: 0,
  };
}

function targetPose(f, frame, ud) {
  const p = restPose();
  const speed = Math.abs(f.vx);
  const skating = f.state === 'walk' || f.state === 'dash' || (f.sliding && speed > 0.04);

  // Skating stride: legs push out alternately, faster when moving faster
  if (skating && f.y === 0) {
    ud.stride += 0.12 + speed * 1.6;
    const s = Math.sin(ud.stride);
    p.thighs = [0.45 + s * 0.5, 0.45 - s * 0.5];
    p.knees = [-0.85 - Math.max(0, -s) * 0.6, -0.85 - Math.max(0, s) * 0.6];
    p.torso = f.state === 'dash' ? -0.5 : -0.3;
    p.farSh = 0.6 + s * 0.5;
  } else if (f.state === 'idle' || f.state === 'blockstun') {
    const breathe = Math.sin(frame * 0.07 + f.side * 2);
    p.torso += breathe * 0.03;
    p.head -= breathe * 0.02;
  }

  if (f.y > 0 && f.state !== 'ko') {
    p.thighs = [1.25, 1.0];
    p.knees = [-1.7, -1.4];
    p.torso = -0.15;
    p.farSh = -0.4; p.farEl = 0.8;
  }

  if (f.state === 'attack' && f.move) {
    const mv = f.move;
    const t = f.stateFrame;
    const winding = t < mv.startup;
    const active = !winding && t < mv.startup + mv.active;
    switch (f.moveKey) {
      case 'jab':
        if (winding) { p.farSh = 0.2; p.farEl = 1.8; p.torso = -0.05; }
        else if (active) { p.farSh = 1.6; p.farEl = 0.05; p.torso = -0.38; p.bodyX = 0.12; }
        else { p.farSh = 1.2; p.farEl = 0.6; p.torso = -0.25; }
        p.jaw = active ? 0.25 : 0;
        break;
      case 'stick':
        if (winding) { p.nearSh = -0.5; p.nearEl = 0.6; p.stick = -0.9; p.torso = 0.05; }
        else if (active) { p.nearSh = 1.35; p.nearEl = 0.15; p.stick = 1.62; p.torso = -0.35; p.bodyX = 0.1; }
        else { p.nearSh = 1.0; p.nearEl = 0.35; p.stick = 1.4; p.torso = -0.25; }
        break;
      case 'check':
        if (winding) { p.torso = 0.2; p.hipDrop = 0.08; p.nearSh = 0.1; p.nearEl = 1.6; p.farSh = 0.1; p.farEl = 1.6; p.stick = 0.4; }
        else if (active) { p.torso = -0.75; p.bodyX = 0.3; p.hipDrop = 0.12; p.nearSh = 0.5; p.nearEl = 1.7; p.farSh = 0.4; p.farEl = 1.8; p.stick = 0.6; p.jaw = 0.35; p.thighs = [0.9, 0.1]; p.knees = [-1.1, -0.4]; }
        else { p.torso = -0.45; p.bodyX = 0.15; p.nearSh = 0.4; p.nearEl = 1.4; p.stick = 0.7; }
        break;
      case 'shot':
        if (winding) { const w = t / mv.startup; p.nearSh = -1.9 * w; p.nearEl = 0.4; p.stick = -2.5 * w + 0.9 * (1 - w); p.farSh = -0.8 * w; p.torso = 0.1; }
        else { p.nearSh = 1.05; p.nearEl = 0.3; p.stick = 1.95; p.farSh = 1.2; p.farEl = 0.3; p.torso = -0.4; p.bodyX = 0.1; p.jaw = 0.3; }
        break;
    }
  }

  if (f.blocking || f.state === 'blockstun') {
    p.torso = 0.12; p.nearSh = 1.15; p.nearEl = 1.3; p.farSh = 1.25; p.farEl = 1.2; p.stick = Math.PI * 0.92; p.head = 0.2;
    p.hipDrop = 0.05;
  }

  if (f.state === 'hitstun') {
    const jolt = Math.max(0, 1 - f.stun / 30);
    p.torso = 0.5 - jolt * 0.2; p.head = 0.45; p.jaw = 0.4;
    p.nearSh = -0.6; p.nearEl = 0.9; p.farSh = -0.9; p.farEl = 0.6; p.stick = -0.2;
    p.thighs = [0.7, 0.2]; p.knees = [-1.0, -0.5];
  }

  if (f.state === 'ko') {
    p.torso = 1.2; p.head = 0.6; p.jaw = 0.5;
    p.nearSh = -1.8; p.farSh = -2.2; p.nearEl = 0.2; p.farEl = 0.4; p.stick = -1.5;
    p.thighs = [1.3, 1.0]; p.knees = [-0.3, -0.6];
  }

  return p;
}

const lerp = (a, b, k) => a + (b - a) * k;

export function poseDuck(duck, f, frame, dt = 1) {
  const ud = duck.userData;
  const target = targetPose(f, frame, ud);
  const snappy = f.state === 'attack' || f.state === 'hitstun';
  const k = 1 - Math.pow(1 - (snappy ? 0.55 : 0.22), dt);
  const p = ud.pose;
  for (const key of Object.keys(target)) {
    if (Array.isArray(target[key])) p[key] = p[key].map((v, i) => lerp(v, target[key][i], k));
    else p[key] = lerp(p[key], target[key], k);
  }

  // Legs, then lift or drop the hips so the lower skate stays on the ice
  const footY = [0, 1].map((i) => {
    ud.legs[i].hip.rotation.z = p.thighs[i];
    ud.legs[i].knee.rotation.z = p.knees[i];
    return THIGH * Math.cos(p.thighs[i]) + SHIN * Math.cos(p.thighs[i] + p.knees[i]);
  });
  const reach = Math.max(footY[0], footY[1]);
  ud.hips.position.y = reach - p.hipDrop;
  ud.hips.position.x = p.bodyX;

  ud.torso.rotation.z = p.torso;
  ud.neck.rotation.z = p.head * 0.5 - p.torso * 0.4;
  ud.head.rotation.z = p.head * 0.5;
  ud.jaw.rotation.z = -p.jaw;
  const [near, far] = ud.arms;
  near.shoulder.rotation.z = p.nearSh;
  near.elbow.rotation.z = p.nearEl;
  far.shoulder.rotation.z = p.farSh;
  far.elbow.rotation.z = p.farEl;
  // Stick angle is given in world terms; undo the arm chain to get it there
  ud.stick.rotation.z = p.stick - (p.torso + p.nearSh + p.nearEl);

  // Position, facing and the KO fall
  duck.position.set(f.x, f.y, 0);
  duck.rotation.y = f.facing === 1 ? 0 : Math.PI;
  ud.koFall = lerp(ud.koFall, f.state === 'ko' ? 1 : 0, 0.08);
  duck.rotation.z = (f.facing === 1 ? 1 : -1) * ud.koFall * 1.25;
  duck.position.y += ud.koFall * 0.15;

  // Hit flash, and eyes that glow when the Enforcer Meter is full
  const flash = f.flash > 0 ? 0.4 : 0;
  for (const m of ud.materials) m.emissive.setScalar(flash);
  const powered = f.meter >= 100;
  for (const em of ud.eyeMats) em.color.set(powered ? new THREE.Color(ud.look.eyeGlow).multiplyScalar(3) : 0x0b0a12);
}
