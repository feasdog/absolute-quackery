// A simple CPU opponent so you can test the fight alone.
// It walks in, pokes, blocks some attacks and throws the odd puck.
import { emptyInput } from './game/match.js';

export function createCpu() {
  return { cooldown: 30, holdBlock: 0 };
}

export function cpuInput(cpu, match, side) {
  const input = emptyInput();
  const me = match.fighters[side];
  const them = match.fighters[1 - side];
  if (match.phase !== 'fight') return input;

  const dist = Math.abs(them.x - me.x);
  const toward = them.x > me.x ? 'right' : 'left';
  const away = toward === 'right' ? 'left' : 'right';

  // React to attacks by blocking (not every time, so it's beatable)
  if (them.state === 'attack' && dist < 3 && cpu.holdBlock === 0 && Math.random() < 0.06) cpu.holdBlock = 20;
  if (cpu.holdBlock > 0) {
    cpu.holdBlock--;
    input[away] = true;
    return input;
  }

  if (cpu.cooldown > 0) cpu.cooldown -= 1;

  if (me.state === 'attack' && me.moveHit && Math.random() < 0.5) {
    // Follow up a hit with the next move in the chain
    input[{ jab: 'b', stick: 'c', check: 'd' }[me.moveKey] || 'a'] = true;
    return input;
  }

  if (cpu.cooldown <= 0) {
    const r = Math.random();
    if (dist < 1.6) { input[r < 0.5 ? 'a' : r < 0.8 ? 'c' : 'b'] = true; cpu.cooldown = 22 + Math.random() * 30; }
    else if (dist < 2.4) { input[r < 0.7 ? 'b' : 'a'] = true; cpu.cooldown = 25 + Math.random() * 30; }
    else if (dist > 4.5 && r < 0.3) { input.d = true; cpu.cooldown = 50 + Math.random() * 40; }
    else if (r < 0.04) { input.up = true; input[toward] = true; cpu.cooldown = 40; }
    else if (dist > 2) input[toward] = true;
    return input;
  }

  if (dist > 2.2) input[toward] = true;
  else if (dist < 1.0 && Math.random() < 0.3) input[away] = true;
  return input;
}
