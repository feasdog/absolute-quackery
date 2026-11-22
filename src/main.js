// Entry point: menu, game loop, and wiring everything together.
import './style.css';
import { createMatch, step, FPS } from './game/match.js';
import { CHARACTERS } from './game/characters.js';
import { installKeyboard, readInput } from './input.js';
import { createCpu, cpuInput } from './ai.js';
import { createRenderer } from './render/index.js';
import { createHud } from './hud.js';

const canvas = document.getElementById('game');
const hud = createHud(document.getElementById('hud'));
const menu = document.getElementById('menu');
const pause = document.getElementById('over');

installKeyboard();

let match = createMatch(CHARACTERS.freight, CHARACTERS.razor);
const view = createRenderer(canvas, match);
let mode = 'menu';         // menu | cpu | versus
let cpu = createCpu();
let overShown = false;

function start(newMode) {
  mode = newMode;
  match = createMatch(CHARACTERS.freight, CHARACTERS.razor);
  view.setFighters(match);
  cpu = createCpu();
  overShown = false;
  menu.classList.add('hidden');
  pause.classList.add('hidden');
  hud.update(match, match.events);
}

window.addEventListener('keydown', (e) => {
  if (mode === 'menu') {
    if (e.code === 'Digit1' || e.code === 'Numpad1' || e.code === 'Enter') start('cpu');
    if (e.code === 'Digit2') start('versus');
    return;
  }
  if (e.code === 'Escape') { mode = 'menu'; menu.classList.remove('hidden'); pause.classList.add('hidden'); }
  if (e.code === 'Enter' && match.phase === 'over') start(mode);
});

// Buttons on the menu, for mouse or touch
menu.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => start(btn.dataset.mode)));

// Fixed-step loop: the fight always advances at exactly 60 frames per
// second, no matter how fast the screen refreshes. Fighting games need this
// so timing is identical on every computer.
const STEP_MS = 1000 / FPS;
let last = performance.now();
let acc = 0;

function frame(now) {
  acc += Math.min(250, now - last);
  last = now;
  const events = [];
  while (acc >= STEP_MS) {
    acc -= STEP_MS;
    if (mode === 'menu') { match.frame++; continue; }
    const p1 = readInput(0);
    const p2 = mode === 'cpu' ? cpuInput(cpu, match, 1) : readInput(1);
    step(match, [p1, p2]);
    events.push(...match.events);
  }
  if (mode !== 'menu') hud.update(match, events);
  view.render(match, events);
  if (match.phase === 'over' && !overShown) {
    overShown = true;
    setTimeout(() => pause.classList.remove('hidden'), 1500);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handy for testing in the browser console
window.__game = { get match() { return match; }, start, view };
