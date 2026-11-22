// Impact effects: glowing sparks, ice spray, shockwave rings and puck trails.
import * as THREE from 'three';

export function createEffects(scene) {
  const particles = [];
  const rings = [];
  const box = new THREE.BoxGeometry(1, 1, 1);
  const ringGeo = new THREE.RingGeometry(0.85, 1, 40);

  const additive = (color, strength = 2) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    m.toneMapped = false;
    return m;
  };

  function spawn({ x, y, z = 0.4, color, count, speed = 0.22, size = 0.07, gravity = 0.012, life = 24, stretch = 3, glowStrength = 2, spreadY = 1, dir = 0 }) {
    for (let i = 0; i < count; i++) {
      const mat = additive(color, glowStrength);
      const p = new THREE.Mesh(box, mat);
      const a = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * speed * (0.4 + Math.random()), Math.abs(Math.sin(a)) * speed * spreadY * (0.5 + Math.random()), (Math.random() - 0.5) * speed * 0.6);
      if (dir) v.x = Math.abs(v.x) * dir;
      p.position.set(x, y, z);
      p.userData = { v, life: life * (0.6 + Math.random() * 0.6), max: life, gravity, size, stretch };
      scene.add(p);
      particles.push(p);
    }
  }

  function ring(x, y, color, maxScale = 2.2) {
    const m = new THREE.Mesh(ringGeo, additive(color, 0.8));
    m.position.set(x, y, 0.6);
    m.userData = { life: 16, max: 16, maxScale };
    scene.add(m);
    rings.push(m);
  }

  return {
    hit(x, y, heavy, dir) {
      spawn({ x, y, color: heavy ? 0xffc43a : 0xffffff, count: heavy ? 34 : 16, speed: heavy ? 0.3 : 0.2, glowStrength: 1.4 });
      if (heavy) ring(x, y, 0xffc43a, 1.6);
      spawn({ x, y: 0.1, color: 0xe8f4ff, count: heavy ? 14 : 5, speed: 0.12, size: 0.05, glowStrength: 0.6, gravity: 0.008, dir, spreadY: 0.8 });
    },
    block(x, y) {
      spawn({ x, y, color: 0x22e4ff, count: 14, speed: 0.18, glowStrength: 1.4 });
      ring(x, y, 0x22e4ff, 1.0);
    },
    boards(x) {
      spawn({ x, y: 1.4, color: 0xffffff, count: 40, speed: 0.32, glowStrength: 1.3 });
      spawn({ x, y: 1.4, color: 0x9fd8ff, count: 30, speed: 0.25, size: 0.1, glowStrength: 1.5, life: 40 });
      ring(x, 1.4, 0xffffff, 2.2);
    },
    // Snow spray off the skates when dashing or stopping hard
    spray(x, dir) {
      spawn({ x, y: 0.05, color: 0xf0f8ff, count: 8, speed: 0.13, size: 0.05, glowStrength: 0.6, gravity: 0.01, life: 22, dir: -dir, spreadY: 0.7 });
    },
    trail(x, y) {
      spawn({ x, y, z: 0.3, color: 0x22e4ff, count: 1, speed: 0.01, size: 0.09, glowStrength: 2.5, gravity: 0, life: 14, stretch: 1 });
    },
    ko(x, y) {
      spawn({ x, y, color: 0xff2bd6, count: 50, speed: 0.36, glowStrength: 1.6, life: 40 });
      ring(x, y, 0xff2bd6, 3);
    },
    update() {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const d = p.userData;
        p.position.add(d.v);
        d.v.y -= d.gravity;
        if (p.position.y < 0.02) { p.position.y = 0.02; d.v.y *= -0.3; d.v.x *= 0.7; }
        const t = d.life / d.max;
        const s = d.size * Math.max(0.2, t);
        const sp = d.v.length();
        p.scale.set(s + sp * d.stretch * 0.25, s, s);
        p.rotation.z = Math.atan2(d.v.y, d.v.x);
        p.material.opacity = Math.min(1, t * 1.5);
        if (--d.life <= 0) { scene.remove(p); p.material.dispose(); particles.splice(i, 1); }
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        const d = r.userData;
        const t = 1 - d.life / d.max;
        r.scale.setScalar(0.3 + t * d.maxScale);
        r.material.opacity = 1 - t;
        if (--d.life <= 0) { scene.remove(r); r.material.dispose(); rings.splice(i, 1); }
      }
    },
  };
}
