// Shared look for the "arcade brutal" style:
//  - toon (cel) shading with a few hard light steps
//  - thick ink outlines around every part
//  - "hand-painted" canvas textures with brush noise instead of flat color
import * as THREE from 'three';

export const INK = new THREE.Color(0x0b0a12);

// 4-step light ramp = the "cel" in cel-shading
function makeGradient() {
  const data = new Uint8Array([55, 120, 190, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
export const GRADIENT = makeGradient();

export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: GRADIENT, ...opts });
}

// Outline: draw the back faces of each part, pushed out along their
// normals and filled with ink. Cheap, and it reads like a comic panel.
const outlineMaterials = new Map();
export function outlineMaterial(thickness = 0.025) {
  if (!outlineMaterials.has(thickness)) {
    outlineMaterials.set(thickness, new THREE.ShaderMaterial({
      uniforms: { thickness: { value: thickness }, color: { value: INK } },
      vertexShader: /* glsl */`
        uniform float thickness;
        void main() {
          vec3 p = position + normalize(normal) * thickness;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 color;
        void main() { gl_FragColor = vec4(color, 1.0); }`,
      side: THREE.BackSide,
    }));
  }
  return outlineMaterials.get(thickness);
}

export function mesh(geometry, material, { outline = 0.025, shadow = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = shadow;
  if (outline) {
    const o = new THREE.Mesh(geometry, outlineMaterial(outline));
    o.userData.isOutline = true;
    m.add(o);
  }
  return m;
}

// Seeded random so textures look the same every time the game loads.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const hex = (c) => `#${new THREE.Color(c).getHexString()}`;

// A fabric/feather texture with brush strokes, optional horizontal stripes
// (v = 0 is the bottom), and a soft top-lit gradient.
export function paintedTexture(base, { stripes = [], strokes = 260, seed = 7, size = 256, grain = 0.14 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = hex(base);
  g.fillRect(0, 0, size, size);
  for (const s of stripes) {
    g.fillStyle = hex(s.color);
    g.fillRect(0, size * (1 - s.to), size, size * (s.to - s.from));
  }
  const r = rng(seed);
  for (let i = 0; i < strokes; i++) {
    const light = r() > 0.5;
    g.fillStyle = light ? `rgba(255,255,255,${grain * r()})` : `rgba(0,0,0,${grain * r()})`;
    g.beginPath();
    g.ellipse(r() * size, r() * size, 4 + r() * 18, 1 + r() * 3, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  const grad = g.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(255,255,255,0.10)');
  grad.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function paintedToon(base, opts) {
  return toon(0xffffff, { map: paintedTexture(base, opts) });
}

// Jersey number decal: big block numerals with an ink outline.
export function numberTexture(number, fill, stroke) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.font = '900 190px Anton, Impact, "Arial Black", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 22;
  g.strokeStyle = hex(stroke);
  g.strokeText(String(number), 128, 136);
  g.fillStyle = hex(fill);
  g.fillText(String(number), 128, 136);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Glowing material for neon, visors and powered-up eyes (bloom picks it up).
export function glow(color, intensity = 2.2) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) });
  m.toneMapped = false;
  return m;
}
