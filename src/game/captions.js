// Hype captions: the cheeky pop-up text on big moments.
// Copy lives here so it's easy to punch up without touching game logic.
// Rules: ALL CAPS, 1-4 words, hockey slang first, max one duck pun.

export const CAPTIONS = {
  roundStart:  ['DROP THE PUCK'],
  firstHit:    ['FIRST FEATHER'],
  combo3:      ['TAPE TO TAPE', 'NICE DANGLE'],
  combo5:      ['FILTHY', 'SNIPE CITY', 'TOP CHEDDAR'],
  combo7:      ['ABSOLUTE QUACKERY', 'CALL THE CROSSING GUARD'],
  boards:      ['WELCOME TO THE GLASS', 'BOARDED'],
  ko:          ['LIGHTS OUT', 'GOODNIGHT, DUCKY'],
  perfect:     ['SHUTOUT'],
  clutch:      ['BY A FEATHER', 'OVERTIME HERO'],
  timeUp:      ['BUZZER BEATER'],
};

// Rotate through each list so repeats feel fresh.
const counters = {};
export function pickCaption(kind) {
  const list = CAPTIONS[kind];
  if (!list) return '';
  const i = counters[kind] || 0;
  counters[kind] = i + 1;
  return list[i % list.length];
}
