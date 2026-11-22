// Fighter definitions. All numbers are in "frames" (1/60th of a second)
// or "units" (roughly 1 unit = 1 meter on the rink).
//
// Each attack has:
//   startup  - frames before it can hit (wind-up)
//   active   - frames where it can hit
//   recovery - frames after, where you're vulnerable
//   damage, range (how far in front it reaches), hitstun / blockstun
//   (how long the opponent is frozen after getting hit / blocking)
//   push     - how hard it shoves the opponent back

const baseMoves = {
  jab:   { button: 'a', name: 'Jab',   startup: 4,  active: 3, recovery: 8,  damage: 40,  range: 1.1, hitstun: 15, blockstun: 9,  push: 0.10 },
  stick: { button: 'b', name: 'Stick', startup: 7,  active: 4, recovery: 14, damage: 70,  range: 1.9, hitstun: 18, blockstun: 11, push: 0.14 },
  check: { button: 'c', name: 'Check', startup: 12, active: 5, recovery: 20, damage: 110, range: 1.3, hitstun: 28, blockstun: 14, push: 0.38, lunge: 0.12, wallBounce: true },
  shot:  { button: 'd', name: 'Shot',  startup: 11, active: 1, recovery: 18, damage: 60,  range: 0,   hitstun: 18, blockstun: 10, push: 0.12, projectile: true },
};

const withChanges = (changes) => {
  const moves = {};
  for (const key of Object.keys(baseMoves)) {
    moves[key] = { ...baseMoves[key], ...(changes[key] || {}) };
  }
  return moves;
};

export const CHARACTERS = {
  freight: {
    id: 'freight',
    name: 'FREIGHT MALLARD',
    team: 'Steeltown Smelters',
    number: 44,
    // 3-color palette from the approved concept proof
    colors: { primary: 0xe8641c, secondary: 0x1a1a1a, accent: 0x1f7a4a },
    scale: 1.22,        // bigger body
    hp: 1100,
    walkSpeed: 0.055,
    dashSpeed: 0.24,
    jumpPower: 0.26,
    moves: withChanges({
      check: { damage: 130, push: 0.45 },   // his check is the scariest in the game
      jab: { startup: 5 },                  // but his jab is slower
    }),
  },
  razor: {
    id: 'razor',
    name: 'RAZOR MERGANSER',
    team: 'Kagami Blades',
    number: 7,
    colors: { primary: 0xc8102e, secondary: 0x111111, accent: 0xf2f2f2 },
    scale: 0.95,
    hp: 900,
    walkSpeed: 0.09,
    dashSpeed: 0.34,
    jumpPower: 0.3,
    moves: withChanges({
      jab: { startup: 3, damage: 35 },     // fastest jab in the game
      stick: { recovery: 11 },
      check: { damage: 95 },
    }),
  },
};
