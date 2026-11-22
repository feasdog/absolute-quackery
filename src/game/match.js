// The fight simulation. No graphics in here: this file only tracks
// positions, health, timers and rules, one "frame" (1/60 s) at a time.
// Keeping it separate means we can test it without a browser, and port
// it to another engine later.

import { pickCaption } from './captions.js';

export const FPS = 60;
export const ROUND_SECONDS = 99;
export const WALL_X = 8.2;          // where the boards are
const GRAVITY = 0.017;
const BODY_GAP = 0.9;               // fighters can't overlap closer than this
const DOUBLE_TAP_WINDOW = 12;       // frames between taps to count as a dash
const COMBO_SCALING = 0.1;          // each extra combo hit does 10% less
const SLIDE_BONUS = 1.25;           // attacks thrown mid-slide hit 25% harder
const ICE_FRICTION_SLIDE = 0.965;   // keep most speed per frame while sliding
const ICE_FRICTION_STOP = 0.82;
const ICE_FRICTION_STUN = 0.9;      // getting hit slides you back, but not forever
const INTRO_FRAMES = 100;
const KO_FRAMES = 150;
const ROUNDS_TO_WIN = 2;
const CHAIN_ORDER = ['jab', 'stick', 'check', 'shot'];

export const emptyInput = () => ({
  left: false, right: false, up: false, down: false,
  a: false, b: false, c: false, d: false,
});

function createFighter(def, side) {
  return {
    def,
    side,
    x: side === 0 ? -2.5 : 2.5,
    y: 0, vx: 0, vy: 0,
    facing: side === 0 ? 1 : -1,
    hp: def.hp,
    meter: 0,
    state: 'idle',          // idle | walk | dash | jump | attack | hitstun | blockstun | ko
    stateFrame: 0,
    stun: 0,
    move: null,             // current attack, if any
    moveHit: false,
    moveSlideBonus: false,
    blocking: false,
    sliding: false,
    wallBounceArmed: false,
    combo: 0,               // hits landed in the current combo (as attacker)
    lastTap: { dir: 0, frame: -99 },
    prev: emptyInput(),
    buffer: new Set(),
    roundsWon: 0,
    flash: 0,               // frames to show a hit flash (for rendering)
  };
}

export function createMatch(defA, defB) {
  const m = {
    fighters: [createFighter(defA, 0), createFighter(defB, 1)],
    projectiles: [],
    frame: 0,
    round: 1,
    phase: 'intro',         // intro | fight | ko | over
    phaseFrame: 0,
    timer: ROUND_SECONDS * FPS,
    hitstop: 0,             // freeze frames on big hits, for impact
    shake: 0,
    firstHitDone: false,
    winner: null,           // index of match winner
    roundWinner: null,
    events: [],             // things that happened this frame (for HUD and sound)
  };
  m.events.push({ type: 'caption', text: 'ROUND 1', sub: pickCaption('roundStart') });
  return m;
}

function resetRound(m) {
  m.fighters.forEach((f, i) => {
    const fresh = createFighter(f.def, i);
    fresh.roundsWon = f.roundsWon;
    fresh.meter = f.meter;     // meter carries between rounds
    m.fighters[i] = fresh;
  });
  m.projectiles = [];
  m.timer = ROUND_SECONDS * FPS;
  m.phase = 'intro';
  m.phaseFrame = 0;
  m.firstHitDone = false;
  m.roundWinner = null;
  m.events.push({ type: 'caption', text: `ROUND ${m.round}`, sub: pickCaption('roundStart') });
}

const grounded = (f) => f.y <= 0 && f.vy <= 0;
const canAct = (f) => f.state === 'idle' || f.state === 'walk' || f.state === 'dash';

// A button counts as "pressed" on the frame it goes down. Presses made
// during hit-stop are buffered so combos don't drop inputs.
function pressed(f, input, key) {
  return (input[key] && !f.prev[key]) || f.buffer.has(key);
}

function startMove(f, key) {
  f.move = f.def.moves[key];
  f.moveKey = key;
  f.state = 'attack';
  f.stateFrame = 0;
  f.moveHit = false;
  // Attacks thrown while sliding across the ice keep momentum and hit harder.
  f.moveSlideBonus = f.sliding && Math.abs(f.vx) > 0.08;
  if (!f.moveSlideBonus && grounded(f)) f.vx *= 0.3;
}

function handleInput(m, f, input) {
  // Turn left/right into forward/back, relative to who you're facing.
  const fwd = f.facing === 1 ? input.right : input.left;
  const back = f.facing === 1 ? input.left : input.right;
  f.blocking = back && grounded(f) && (canAct(f) || f.state === 'blockstun');

  // Chain cancels: after a hit, you can cancel into a stronger move.
  if (f.state === 'attack' && f.moveHit) {
    const at = CHAIN_ORDER.indexOf(f.moveKey);
    for (const key of CHAIN_ORDER.slice(at + 1)) {
      if (pressed(f, input, f.def.moves[key].button)) {
        startMove(f, key);
        return;
      }
    }
  }

  if (!canAct(f)) return;

  // Attack buttons
  for (const key of CHAIN_ORDER) {
    if (pressed(f, input, f.def.moves[key].button)) {
      startMove(f, key);
      return;
    }
  }

  if (!grounded(f)) return;

  // Jump
  if (pressed(f, input, 'up')) {
    f.vy = f.def.jumpPower;
    f.state = 'jump';
    f.stateFrame = 0;
    if (fwd) f.vx = f.def.walkSpeed * 1.4 * f.facing;
    else if (back) f.vx = -f.def.walkSpeed * 1.4 * f.facing;
    return;
  }

  // Dash: double-tap forward or back
  const tapDir = pressed(f, input, 'right') ? 1 : pressed(f, input, 'left') ? -1 : 0;
  if (tapDir !== 0) {
    if (f.lastTap.dir === tapDir && m.frame - f.lastTap.frame <= DOUBLE_TAP_WINDOW) {
      const isForward = tapDir === f.facing;
      f.vx = tapDir * f.def.dashSpeed * (isForward ? 1 : 0.75);
      f.state = 'dash';
      f.stateFrame = 0;
      f.sliding = true;
      f.lastTap = { dir: 0, frame: -99 };
      m.events.push({ type: 'dash', side: f.side });
      return;
    }
    f.lastTap = { dir: tapDir, frame: m.frame };
  }

  if (f.state === 'dash' && f.stateFrame < 14) return;

  // Walking: on ice you ease into speed rather than snapping to it.
  const dir = input.right ? 1 : input.left ? -1 : 0;
  if (dir !== 0) {
    const speed = f.def.walkSpeed * (dir === f.facing ? 1 : 0.8);
    f.vx += (dir * speed - f.vx) * 0.25;
    f.state = 'walk';
    f.sliding = false;
  } else {
    f.state = 'idle';
  }
}

function updateFacing(m) {
  const [a, b] = m.fighters;
  for (const [f, o] of [[a, b], [b, a]]) {
    if (canAct(f) && grounded(f)) f.facing = o.x >= f.x ? 1 : -1;
  }
}

function physics(m) {
  for (const f of m.fighters) {
    f.stateFrame++;
    if (f.flash > 0) f.flash--;

    // Gravity and landing
    if (f.y > 0 || f.vy > 0) {
      f.vy -= GRAVITY;
      f.y += f.vy;
      if (f.y <= 0) {
        f.y = 0;
        f.vy = 0;
        if (f.state === 'jump') f.state = 'idle';
        if (f.state === 'attack') { f.state = 'idle'; f.move = null; }
      }
    }

    // Ice friction: sliding keeps most of your speed, stopping takes a moment.
    if (grounded(f)) {
      const walking = f.state === 'walk';
      if (!walking) {
        const stunned = f.state === 'hitstun' || f.state === 'blockstun';
        const keep = stunned ? ICE_FRICTION_STUN : f.sliding ? ICE_FRICTION_SLIDE : ICE_FRICTION_STOP;
        f.vx *= keep;
        if (Math.abs(f.vx) < 0.01) { f.vx = 0; f.sliding = false; }
      }
    }

    f.x += f.vx;

    // The boards
    if (Math.abs(f.x) > WALL_X) {
      const dir = Math.sign(f.x);
      f.x = dir * WALL_X;
      if (f.wallBounceArmed && f.state === 'hitstun') {
        boardSlam(m, f);
      } else {
        f.vx = 0;
      }
    }
  }

  // Keep fighters from overlapping (only when both are at similar height)
  const [a, b] = m.fighters;
  const dx = b.x - a.x;
  if (Math.abs(dx) < BODY_GAP && Math.abs(a.y - b.y) < 1.2) {
    const push = (BODY_GAP - Math.abs(dx)) / 2;
    const s = dx >= 0 ? 1 : -1;
    a.x -= push * s;
    b.x += push * s;
    a.x = Math.max(-WALL_X, Math.min(WALL_X, a.x));
    b.x = Math.max(-WALL_X, Math.min(WALL_X, b.x));
  }
}

function boardSlam(m, f) {
  f.wallBounceArmed = false;
  f.vx = -Math.sign(f.x) * 0.16;
  f.stun += 14;
  applyDamage(m, f, 40);
  m.hitstop = 8;
  m.shake = 14;
  m.events.push({ type: 'boards', side: f.side, x: f.x });
  m.events.push({ type: 'caption', text: pickCaption('boards') });
}

function applyDamage(m, f, amount) {
  f.hp = Math.max(0, f.hp - Math.round(amount));
}

function resolveHit(m, attacker, defender, move, fromProjectile = false) {
  const facingAttacker = Math.sign(attacker.x - defender.x) || -defender.facing;
  const isBlocking = defender.blocking && defender.facing === facingAttacker;

  if (isBlocking) {
    defender.state = 'blockstun';
    defender.stun = move.blockstun;
    defender.vx = -facingAttacker * move.push * 0.6;
    defender.sliding = true;
    attacker.meter = Math.min(100, attacker.meter + 2);
    m.hitstop = 3;
    m.events.push({ type: 'block', side: defender.side });
    return;
  }

  const comboing = defender.state === 'hitstun';
  attacker.combo = comboing ? attacker.combo + 1 : 1;
  const scaling = Math.max(0.5, 1 - COMBO_SCALING * (attacker.combo - 1));
  const bonus = !fromProjectile && attacker.moveSlideBonus ? SLIDE_BONUS : 1;
  const damage = move.damage * scaling * bonus;

  applyDamage(m, defender, damage);
  defender.state = 'hitstun';
  defender.stun = move.hitstun;
  defender.move = null;
  defender.vx = -facingAttacker * move.push;
  defender.sliding = true;
  defender.wallBounceArmed = !!move.wallBounce;
  defender.flash = 6;
  if (defender.y > 0) defender.vy = Math.max(defender.vy, 0.1);   // juggle a little

  attacker.meter = Math.min(100, attacker.meter + damage * 0.06);
  defender.meter = Math.min(100, defender.meter + damage * 0.04);

  const heavy = move.damage >= 100;
  m.hitstop = heavy ? 9 : 5;
  m.shake = heavy ? 10 : 4;
  m.events.push({ type: 'hit', side: defender.side, damage: Math.round(damage), heavy, combo: attacker.combo, slide: bonus > 1 });

  if (!m.firstHitDone) {
    m.firstHitDone = true;
    m.events.push({ type: 'caption', text: pickCaption('firstHit') });
  } else if (attacker.combo === 3) {
    m.events.push({ type: 'caption', text: pickCaption('combo3') });
  } else if (attacker.combo === 5) {
    m.events.push({ type: 'caption', text: pickCaption('combo5') });
  } else if (attacker.combo === 7) {
    m.events.push({ type: 'caption', text: pickCaption('combo7') });
  }
}

function updateAttacks(m) {
  const [a, b] = m.fighters;
  for (const [f, o] of [[a, b], [b, a]]) {
    if (f.state !== 'attack' || !f.move) continue;
    const mv = f.move;
    const t = f.stateFrame;

    // Lunge forward on checks
    if (mv.lunge && t < mv.startup + mv.active) f.vx = f.facing * mv.lunge;

    if (mv.projectile && t === mv.startup) {
      const mine = m.projectiles.filter((p) => p.owner === f.side);
      if (mine.length === 0) {
        m.projectiles.push({ owner: f.side, x: f.x + f.facing * 0.8, y: f.y + 0.3, vx: f.facing * 0.26, life: 80, move: mv });
        m.events.push({ type: 'shot', side: f.side });
      }
    }

    const active = t >= mv.startup && t < mv.startup + mv.active;
    if (active && !mv.projectile && !f.moveHit) {
      const reach = (o.x - f.x) * f.facing;      // distance in front of the attacker
      const sizeBonus = (o.def.scale - 1) * 0.5;  // bigger ducks are easier to hit
      if (reach > -0.2 && reach <= mv.range + 0.5 + sizeBonus && Math.abs(o.y - f.y) < 1.6 && o.state !== 'ko') {
        f.moveHit = true;
        resolveHit(m, f, o, mv);
      }
    }

    if (t >= mv.startup + mv.active + mv.recovery) {
      f.state = 'idle';
      f.move = null;
      f.moveKey = null;
    }
  }
}

function updateStun(m) {
  for (const f of m.fighters) {
    if (f.state === 'hitstun' || f.state === 'blockstun') {
      f.stun--;
      if (f.stun <= 0) {
        f.state = 'idle';
        f.wallBounceArmed = false;
        const other = m.fighters[1 - f.side];
        other.combo = 0;
      }
    }
  }
}

function updateProjectiles(m) {
  for (const p of m.projectiles) {
    p.x += p.vx;
    p.life--;
    const target = m.fighters[1 - p.owner];
    if (Math.abs(target.x - p.x) < 0.55 && Math.abs(target.y + 0.3 - p.y) < 1.2 && target.state !== 'ko') {
      resolveHit(m, m.fighters[p.owner], target, p.move, true);
      p.life = 0;
    }
    if (Math.abs(p.x) > WALL_X + 0.5) p.life = 0;
  }
  m.projectiles = m.projectiles.filter((p) => p.life > 0);
}

function checkRoundEnd(m) {
  const [a, b] = m.fighters;
  const timeUp = m.timer <= 0;
  if (a.hp > 0 && b.hp > 0 && !timeUp) return;

  let winner;
  if (a.hp <= 0 && b.hp <= 0) winner = null;
  else if (a.hp <= 0) winner = 1;
  else if (b.hp <= 0) winner = 0;
  else {
    const pa = a.hp / a.def.hp, pb = b.hp / b.def.hp;
    winner = pa === pb ? null : pa > pb ? 0 : 1;
  }

  m.phase = 'ko';
  m.phaseFrame = 0;
  m.roundWinner = winner;
  m.hitstop = 20;
  m.shake = 16;
  for (const f of m.fighters) if (f.hp <= 0) { f.state = 'ko'; f.vx = -f.facing * 0.15; f.vy = 0.15; }

  if (winner === null) {
    a.roundsWon++; b.roundsWon++;
    m.events.push({ type: 'caption', text: timeUp ? 'TIME' : 'DOUBLE KO', sub: 'DRAW' });
  } else {
    const w = m.fighters[winner];
    w.roundsWon++;
    let sub = '';
    if (w.hp === w.def.hp) sub = pickCaption('perfect');
    else if (w.hp / w.def.hp < 0.1) sub = pickCaption('clutch');
    if (timeUp) m.events.push({ type: 'caption', text: pickCaption('timeUp'), sub: `${w.def.name} WINS` });
    else m.events.push({ type: 'caption', text: pickCaption('ko'), sub });
  }
  m.events.push({ type: 'ko', winner });
}

// Advance the match by one frame. `inputs` is [player1Input, player2Input].
export function step(m, inputs) {
  m.events = [];
  m.frame++;

  if (m.shake > 0) m.shake--;

  // Hit-stop: freeze everything for a few frames on impact.
  if (m.hitstop > 0) {
    m.hitstop--;
    m.fighters.forEach((f, i) => {
      const input = inputs[i] || emptyInput();
      for (const key of Object.keys(input)) if (input[key] && !f.prev[key]) f.buffer.add(key);
      f.prev = { ...input };
    });
    return m;
  }

  if (m.phase === 'intro') {
    m.phaseFrame++;
    if (m.phaseFrame >= INTRO_FRAMES) { m.phase = 'fight'; m.events.push({ type: 'caption', text: 'FIGHT!' }); }
    physics(m);
    return m;
  }

  if (m.phase === 'ko') {
    m.phaseFrame++;
    physics(m);
    if (m.phaseFrame >= KO_FRAMES) {
      const champ = m.fighters.findIndex((f) => f.roundsWon >= ROUNDS_TO_WIN);
      const bothDone = m.fighters.every((f) => f.roundsWon >= ROUNDS_TO_WIN);
      if (champ !== -1 && !bothDone) {
        m.phase = 'over';
        m.winner = champ;
        m.events.push({ type: 'caption', text: `${m.fighters[champ].def.name}`, sub: 'WINS THE MATCH' });
      } else {
        if (bothDone) m.fighters.forEach((f) => { f.roundsWon = ROUNDS_TO_WIN - 1; });
        m.round++;
        resetRound(m);
      }
    }
    return m;
  }

  if (m.phase === 'over') {
    physics(m);
    return m;
  }

  // phase === 'fight'
  m.timer--;
  updateFacing(m);
  m.fighters.forEach((f, i) => handleInput(m, f, inputs[i] || emptyInput()));
  updateAttacks(m);
  physics(m);
  updateProjectiles(m);
  updateStun(m);
  m.fighters.forEach((f, i) => { f.prev = { ...(inputs[i] || emptyInput()) }; f.buffer.clear(); });
  checkRoundEnd(m);
  return m;
}
