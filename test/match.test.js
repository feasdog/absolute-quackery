// Run with: npm test
// These tests play the fight without graphics to check the rules work.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, step, emptyInput, FPS, ROUND_SECONDS } from '../src/game/match.js';
import { CHARACTERS } from '../src/game/characters.js';

const idle = () => [emptyInput(), emptyInput()];
const newFight = () => {
  const m = createMatch(CHARACTERS.freight, CHARACTERS.razor);
  while (m.phase !== 'fight') step(m, idle());
  return m;
};
const press = (m, side, key, frames = 1) => {
  for (let i = 0; i < frames; i++) {
    const inputs = idle();
    inputs[side][key] = true;
    step(m, inputs);
  }
};
const wait = (m, frames) => { for (let i = 0; i < frames; i++) step(m, idle()); };
const placeClose = (m) => { m.fighters[0].x = -0.6; m.fighters[1].x = 0.6; };

test('match starts with an intro, then the fight', () => {
  const m = createMatch(CHARACTERS.freight, CHARACTERS.razor);
  assert.equal(m.phase, 'intro');
  wait(m, 120);
  assert.equal(m.phase, 'fight');
});

test('a jab in range does damage', () => {
  const m = newFight();
  placeClose(m);
  press(m, 0, 'a');
  wait(m, 20);
  assert.ok(m.fighters[1].hp < CHARACTERS.razor.hp, 'Razor should have taken damage');
});

test('holding back blocks the hit', () => {
  const m = newFight();
  placeClose(m);
  for (let i = 0; i < 25; i++) {
    const inputs = idle();
    if (i === 0) inputs[0].a = true;
    inputs[1].right = true; // Razor faces left, so right = back
    step(m, inputs);
  }
  assert.equal(m.fighters[1].hp, CHARACTERS.razor.hp, 'blocked hit should do no damage');
});

test('chaining jab into stick builds a combo', () => {
  const m = newFight();
  placeClose(m);
  let maxCombo = 0;
  for (let i = 0; i < 40; i++) {
    const inputs = idle();
    if (i === 0) inputs[0].a = true;
    if (i === 10) inputs[0].b = true;
    step(m, inputs);
    maxCombo = Math.max(maxCombo, m.fighters[0].combo);
  }
  assert.ok(maxCombo >= 2, `expected a 2-hit combo, got ${maxCombo}`);
});

test('check into the boards causes a board slam', () => {
  const m = newFight();
  m.fighters[0].x = 6.6; m.fighters[1].x = 7.6;
  m.fighters[0].facing = 1;
  let slammed = false;
  press(m, 0, 'c');
  for (let i = 0; i < 80; i++) {
    step(m, idle());
    if (m.events.some((e) => e.type === 'boards')) slammed = true;
  }
  assert.ok(slammed, 'expected a board slam event');
});

test('puck shot travels and hits from range', () => {
  const m = newFight();
  m.fighters[0].x = -4; m.fighters[1].x = 2;
  press(m, 0, 'd');
  wait(m, 60);
  assert.ok(m.fighters[1].hp < CHARACTERS.razor.hp);
});

test('KO ends the round and best of three ends the match', () => {
  const m = newFight();
  m.fighters[1].hp = 1;
  placeClose(m);
  press(m, 0, 'a');
  wait(m, 30);
  assert.equal(m.phase, 'ko');
  assert.equal(m.fighters[0].roundsWon, 1);
  wait(m, 400);
  assert.equal(m.round, 2);
  while (m.phase !== 'fight') step(m, idle());
  m.fighters[1].hp = 1;
  placeClose(m);
  press(m, 0, 'a');
  wait(m, 400);
  assert.equal(m.phase, 'over');
  assert.equal(m.winner, 0);
});

test('time up gives the round to whoever has more health', () => {
  const m = newFight();
  m.fighters[0].hp -= 100;
  wait(m, ROUND_SECONDS * FPS + 5);
  assert.equal(m.roundWinner, 1);
});

test('double-tap forward dashes and slides on the ice', () => {
  const m = newFight();
  const startX = m.fighters[0].x;
  press(m, 0, 'right'); wait(m, 3); press(m, 0, 'right');
  wait(m, 30);
  assert.ok(m.fighters[0].x - startX > 1.5, 'dash should slide well over a unit');
});
