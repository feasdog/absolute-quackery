// Keyboard and gamepad controls.
import { emptyInput } from './game/match.js';

export const KEYMAPS = [
  // Player 1: WASD to move, F G H J to attack
  { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], a: ['KeyF'], b: ['KeyG'], c: ['KeyH'], d: ['KeyJ'] },
  // Player 2: arrow keys to move, numpad 1 2 3 4 (or U I O P) to attack
  { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    a: ['Numpad1', 'KeyU'], b: ['Numpad2', 'KeyI'], c: ['Numpad3', 'KeyO'], d: ['Numpad4', 'KeyP'] },
];

const held = new Set();

export function installKeyboard(target = window) {
  target.addEventListener('keydown', (e) => {
    held.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  target.addEventListener('keyup', (e) => held.delete(e.code));
  target.addEventListener('blur', () => held.clear());
}

export const isHeld = (code) => held.has(code);

// Standard gamepad layout: face buttons 0-3, d-pad 12-15, left stick axes 0/1.
function readGamepad(index) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads && pads[index];
  if (!pad) return null;
  const btn = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  return {
    left: btn(14) || ax < -0.5, right: btn(15) || ax > 0.5,
    up: btn(12) || ay < -0.6, down: btn(13) || ay > 0.6,
    a: btn(2), b: btn(3), c: btn(0), d: btn(1),
  };
}

export function readInput(player) {
  const map = KEYMAPS[player];
  const input = emptyInput();
  for (const key of Object.keys(map)) input[key] = map[key].some((code) => held.has(code));
  const pad = readGamepad(player);
  if (pad) for (const key of Object.keys(input)) input[key] = input[key] || pad[key];
  return input;
}
