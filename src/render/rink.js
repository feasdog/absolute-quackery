// The Rust Belt Rink, home of the Steeltown Smelters: painted ice with
// real reflections, boards with sponsor ads, glass, a neon-lit arena and a
// crowd that reacts to big hits.
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { WALL_X } from '../game/match.js';
import { mesh, toon, paintedToon, glow, rng } from './materials.js';

const ICE_X = WALL_X + 0.9;       // half-width of the ice
const ICE_BACK = -3.3;            // back boards
const ICE_FRONT = 9;              // toward the camera
const ICE_DEPTH = ICE_FRONT - ICE_BACK;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function iceTexture() {
  const W = 2048, H = Math.round(2048 * ICE_DEPTH / (ICE_X * 2));
  const [c, g] = canvas(W, H);
  const r = rng(42);
  const px = (x) => (x + ICE_X) / (ICE_X * 2) * W;
  const pz = (z) => (z - ICE_BACK) / ICE_DEPTH * H;
  const unit = W / (ICE_X * 2);

  g.fillStyle = '#dbe6f3';
  g.fillRect(0, 0, W, H);
  // Cloudy ice
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '170,195,225' : '255,255,255'},${0.05 + r() * 0.08})`;
    g.beginPath();
    g.ellipse(r() * W, r() * H, 20 + r() * 120, 8 + r() * 40, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  // Rink markings
  g.fillStyle = '#c8142a';
  g.fillRect(px(0) - unit * 0.15, 0, unit * 0.3, H);
  g.fillStyle = '#1846c8';
  for (const x of [-4.2, 4.2]) g.fillRect(px(x) - unit * 0.15, 0, unit * 0.3, H);
  g.lineWidth = unit * 0.08;
  g.strokeStyle = '#1846c8';
  g.beginPath(); g.arc(px(0), pz(0.4), unit * 1.8, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#c8142a';
  for (const x of [-6.6, 6.6]) {
    g.beginPath(); g.arc(px(x), pz(0.4), unit * 1.4, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#c8142a';
    g.beginPath(); g.arc(px(x), pz(0.4), unit * 0.14, 0, Math.PI * 2); g.fill();
  }
  // Center-ice logo: an original crest for the arena
  g.save();
  g.translate(px(0), pz(0.4));
  g.fillStyle = 'rgba(20,16,40,0.85)';
  g.beginPath(); g.arc(0, 0, unit * 1.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e8641c';
  g.font = `900 ${unit * 0.55}px Anton, Impact, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('IRON', 0, -unit * 0.28);
  g.fillStyle = '#f2f2f2';
  g.fillText('POND', 0, unit * 0.32);
  g.restore();
  // Skate scratches and cracks
  for (let i = 0; i < 900; i++) {
    const x = r() * W, y = r() * H, len = 20 + r() * 160, a = (r() - 0.5) * 0.6;
    g.strokeStyle = `rgba(${r() > 0.3 ? '255,255,255' : '120,150,190'},${0.15 + r() * 0.35})`;
    g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + len / 2, y + (r() - 0.5) * 30, x + len * Math.cos(a), y + len * Math.sin(a));
    g.stroke();
  }
  for (let i = 0; i < 18; i++) {
    let x = r() * W, y = r() * H;
    g.strokeStyle = 'rgba(90,120,170,0.45)';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 80; y += (r() - 0.5) * 50; g.lineTo(x, y); }
    g.stroke();
  }
  return tex(c);
}

// Original, cheeky sponsors for the board ads
const ADS = [
  { text: "QUACK & SONS", sub: 'SKATE SHARPENING', bg: '#16161a', fg: '#e8641c' },
  { text: 'BREADCRUMB', sub: 'BAKERY · EST. 1972', bg: '#f2c81a', fg: '#16161a' },
  { text: 'WADDLE TOOLS', sub: 'BUILT FOR THE PLANT', bg: '#1846c8', fg: '#ffffff' },
  { text: 'MOLT CREEK', sub: 'ENERGY DRINK', bg: '#c8142a', fg: '#ffffff' },
  { text: 'STEELTOWN', sub: 'SMELTERS HOCKEY', bg: '#e8641c', fg: '#16161a' },
  { text: 'PUDDLE PLUMBING', sub: 'WE FIX LEAKS', bg: '#0f7a5a', fg: '#ffffff' },
];

function adTexture(count, seed) {
  const W = 512 * count, H = 128;
  const [c, g] = canvas(W, H);
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const ad = ADS[Math.floor(r() * ADS.length)];
    g.fillStyle = ad.bg;
    g.fillRect(i * 512 + 4, 0, 504, H);
    g.fillStyle = ad.fg;
    g.textAlign = 'center';
    g.font = '900 58px Anton, Impact, sans-serif';
    g.fillText(ad.text, i * 512 + 256, 70);
    g.font = '700 22px Inter, Arial, sans-serif';
    g.fillText(ad.sub, i * 512 + 256, 104);
  }
  return tex(c);
}

function fanTexture() {
  // A cheering duck-fan silhouette; tinted per fan
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(64, 112, 44, 34, 0, Math.PI, 0); g.fill();           // shoulders
  g.beginPath(); g.arc(64, 54, 26, 0, Math.PI * 2); g.fill();                     // head
  g.beginPath(); g.ellipse(96, 60, 20, 8, 0.1, 0, Math.PI * 2); g.fill();         // bill
  g.lineWidth = 14; g.lineCap = 'round'; g.strokeStyle = '#ffffff';
  g.beginPath(); g.moveTo(28, 98); g.lineTo(14, 40); g.stroke();                  // raised wing
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.arc(64, 54, 26, Math.PI * 0.1, Math.PI * 0.9); g.fill();
  const t = tex(c);
  return t;
}

function neonSignTexture(text, color) {
  const [c, g] = canvas(1024, 192);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 120px Anton, Impact, sans-serif';
  g.shadowColor = color; g.shadowBlur = 30;
  g.strokeStyle = color; g.lineWidth = 10;
  g.strokeText(text, 512, 100);
  g.shadowBlur = 0;
  g.fillStyle = '#ffffff';
  g.fillText(text, 512, 100);
  return tex(c);
}

export function buildRink(scene, renderer) {
  const group = new THREE.Group();
  scene.add(group);

  // Mirror under the ice gives real reflections; the ice sits on top,
  // slightly see-through.
  const mirror = new Reflector(new THREE.PlaneGeometry(ICE_X * 2, ICE_DEPTH), {
    textureWidth: 1024, textureHeight: 512, color: 0x6a788c,
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(0, -0.01, (ICE_BACK + ICE_FRONT) / 2);
  group.add(mirror);

  const ice = new THREE.Mesh(
    new THREE.PlaneGeometry(ICE_X * 2, ICE_DEPTH),
    new THREE.MeshPhongMaterial({ map: iceTexture(), shininess: 90, specular: 0x4a5a72, transparent: true, opacity: 0.9 }),
  );
  ice.rotation.x = -Math.PI / 2;
  ice.position.set(0, 0, (ICE_BACK + ICE_FRONT) / 2);
  ice.receiveShadow = true;
  group.add(ice);

  // Ice outside the rink (under the camera) so the frame never shows a gap
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ color: 0x0e0a1c }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, -0.03, 6);
  group.add(apron);

  const boardMat = paintedToon(0xf2f2f2, { seed: 31, grain: 0.08 });
  const kickMat = toon(0xf2c81a);
  const capMat = toon(0x2a2438);
  const glassMat = new THREE.MeshPhongMaterial({ color: 0xa8d8ff, transparent: true, opacity: 0.12, shininess: 160, specular: 0xffffff, side: THREE.DoubleSide, depthWrite: false });
  const postMat = toon(0x1d1a28);

  const boardRun = (length, along, at, rotY, seed) => {
    const run = new THREE.Group();
    run.position.copy(at);
    run.rotation.y = rotY;
    const board = mesh(new RoundedBoxGeometry(length, 1.1, 0.24, 3, 0.06), boardMat, { outline: 0.02 });
    board.position.y = 0.55;
    board.receiveShadow = true;
    run.add(board);
    const kick = new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, 0.26), kickMat);
    kick.position.y = 0.1;
    run.add(kick);
    const ads = new THREE.Mesh(new THREE.PlaneGeometry(length - 0.2, 0.46), new THREE.MeshBasicMaterial({ map: adTexture(Math.max(1, Math.round(length / 3)), seed) }));
    ads.position.set(0, 0.6, 0.125);
    run.add(ads);
    const cap = mesh(new RoundedBoxGeometry(length, 0.08, 0.34, 2, 0.03), capMat, { outline: 0 });
    cap.position.y = 1.12;
    run.add(cap);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(length, 2.6), glassMat);
    glass.position.y = 2.45;
    run.add(glass);
    for (let x = -length / 2; x <= length / 2 + 0.01; x += 2.4) {
      const post = mesh(new THREE.BoxGeometry(0.06, 2.6, 0.08), postMat, { outline: 0 });
      post.position.set(x, 2.45, 0);
      run.add(post);
    }
    group.add(run);
    return run;
  };
  boardRun(ICE_X * 2 + 0.3, 'x', new THREE.Vector3(0, 0, ICE_BACK), 0, 3);
  boardRun(ICE_FRONT - ICE_BACK - 3.5, 'z', new THREE.Vector3(-ICE_X - 0.05, 0, (ICE_BACK + ICE_FRONT - 3.5) / 2), Math.PI / 2, 5);
  boardRun(ICE_FRONT - ICE_BACK - 3.5, 'z', new THREE.Vector3(ICE_X + 0.05, 0, (ICE_BACK + ICE_FRONT - 3.5) / 2), -Math.PI / 2, 9);

  // Stands: dark tiers climbing away behind the glass
  const tierMat = toon(0x1a1428);
  for (let i = 0; i < 7; i++) {
    const tier = new THREE.Mesh(new THREE.BoxGeometry(40, 0.6, 1.1), tierMat);
    tier.position.set(0, 0.9 + i * 0.75, ICE_BACK - 1.2 - i * 1.05);
    group.add(tier);
  }

  // Crowd: one instanced mesh, each fan tinted in team colors
  const fanCount = 420;
  const fans = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshBasicMaterial({ map: fanTexture(), transparent: true, alphaTest: 0.4 }),
    fanCount,
  );
  const fanData = [];
  const palette = [0xe8641c, 0x7a2a0c, 0x2a1d40, 0xc8102e, 0x3a3550, 0xf2c81a, 0x1f5a3a, 0x44405a];
  const r = rng(99);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < fanCount; i++) {
    const tier = i % 7;
    const x = -19 + r() * 38;
    const y = 1.55 + tier * 0.75;
    const z = ICE_BACK - 1.0 - tier * 1.05 + r() * 0.2;
    const scale = 0.85 + r() * 0.3;
    const flip = r() > 0.5 ? 1 : -1;
    fanData.push({ x, y, z, scale, flip, phase: r() * 10 });
    m4.makeScale(scale * flip, scale, 1).setPosition(x, y, z);
    fans.setMatrixAt(i, m4);
    const shade = 0.35 + r() * 0.25 - tier * 0.025;
    fans.setColorAt(i, new THREE.Color(palette[Math.floor(r() * palette.length)]).multiplyScalar(shade));
  }
  group.add(fans);

  // Neon: arena sign, light strips and a jumbotron
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), new THREE.MeshBasicMaterial({ map: neonSignTexture('THE IRON POND', '#ff2bd6'), transparent: true, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
  sign.position.set(0, 5.4, ICE_BACK - 8.5);
  group.add(sign);
  for (const [y, z, color] of [[5.6, ICE_BACK - 7.6, 0x22e4ff], [6.0, ICE_BACK - 7.8, 0xff2bd6], [9.4, ICE_BACK - 9, 0x22e4ff]]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(46, 0.07, 0.07), glow(color, 2.4));
    strip.position.set(0, y, z);
    group.add(strip);
  }
  const railGlow = new THREE.Mesh(new THREE.BoxGeometry(ICE_X * 2 + 0.3, 0.04, 0.04), glow(0x22e4ff, 2));
  railGlow.position.set(0, 1.17, ICE_BACK + 0.17);
  group.add(railGlow);

  // Light beams from the rafters (soft additive cones)
  const beams = [];
  for (const [x, color] of [[-6, 0xff2bd6], [-1.5, 0x22e4ff], [3, 0xff2bd6], [7.5, 0x22e4ff]]) {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 13, 24, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.018, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    beam.position.set(x, 6.5, ICE_BACK - 2.5);
    beam.rotation.z = x * 0.03;
    group.add(beam);
    beams.push(beam);
  }

  let hype = 0;
  function cheer(amount) { hype = Math.min(1, hype + amount); }

  function update(frame) {
    hype *= 0.985;
    for (let i = 0; i < fanCount; i++) {
      const d = fanData[i];
      const bob = Math.abs(Math.sin(frame * (0.05 + hype * 0.2) + d.phase)) * (0.04 + hype * 0.3);
      m4.makeScale(d.scale * d.flip, d.scale, 1).setPosition(d.x, d.y + bob, d.z);
      fans.setMatrixAt(i, m4);
    }
    fans.instanceMatrix.needsUpdate = true;
    beams.forEach((b, i) => { b.rotation.z = Math.sin(frame * 0.006 + i * 1.7) * 0.18; });
  }

  return { update, cheer };
}
