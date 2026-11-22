// The on-screen overlay: health, meter, timer, round pips, combo counter
// and the hype captions. Plain HTML on top of the 3D canvas.
import { FPS } from './game/match.js';

export function createHud(root) {
  root.innerHTML = `
    <div class="bars">
      <div class="side p1">
        <div class="name"></div>
        <div class="health"><div class="lag"></div><div class="fill"></div></div>
        <div class="row"><div class="pips"></div><div class="meter"><div class="fill"></div></div></div>
      </div>
      <div class="timer">99</div>
      <div class="side p2">
        <div class="name"></div>
        <div class="health"><div class="lag"></div><div class="fill"></div></div>
        <div class="row"><div class="pips"></div><div class="meter"><div class="fill"></div></div></div>
      </div>
    </div>
    <div class="combo p1"></div>
    <div class="combo p2"></div>
    <div class="caption"><div class="main"></div><div class="sub"></div></div>
  `;
  const sides = ['.p1', '.p2'].map((sel) => ({
    name: root.querySelector(`.side${sel} .name`),
    fill: root.querySelector(`.side${sel} .health .fill`),
    lag: root.querySelector(`.side${sel} .health .lag`),
    meter: root.querySelector(`.side${sel} .meter .fill`),
    pips: root.querySelector(`.side${sel} .pips`),
    combo: root.querySelector(`.combo${sel}`),
    lagValue: 1,
  }));
  const timer = root.querySelector('.timer');
  const caption = root.querySelector('.caption');
  const capMain = caption.querySelector('.main');
  const capSub = caption.querySelector('.sub');
  let captionTimeout = null;
  const comboTimeouts = [null, null];

  function showCaption(text, sub = '') {
    capMain.textContent = text;
    capSub.textContent = sub;
    caption.classList.remove('show');
    void caption.offsetWidth;    // restart the CSS animation
    caption.classList.add('show');
    clearTimeout(captionTimeout);
    captionTimeout = setTimeout(() => caption.classList.remove('show'), 1600);
  }

  function update(m, events) {
    m.fighters.forEach((f, i) => {
      const s = sides[i];
      s.name.textContent = `${f.def.name}  #${f.def.number}`;
      const pct = f.hp / f.def.hp;
      s.fill.style.width = `${pct * 100}%`;
      // The red "lag" bar drains slowly so you can see the damage chunk
      if (s.lagValue > pct) s.lagValue = Math.max(pct, s.lagValue - 0.006);
      else s.lagValue = pct;
      s.lag.style.width = `${s.lagValue * 100}%`;
      s.meter.style.width = `${f.meter}%`;
      s.meter.classList.toggle('full', f.meter >= 100);
      s.pips.innerHTML = [0, 1].map((n) => `<span class="${n < f.roundsWon ? 'won' : ''}"></span>`).join('');
    });
    timer.textContent = Math.max(0, Math.ceil(m.timer / FPS));

    for (const e of events) {
      if (e.type === 'caption') showCaption(e.text, e.sub);
      if (e.type === 'hit' && e.combo >= 2) {
        const attacker = 1 - e.side;
        const el = sides[attacker].combo;
        el.innerHTML = `<b>${e.combo}</b> HITS${e.slide ? '<i>SLIDE BONUS</i>' : ''}`;
        el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
        clearTimeout(comboTimeouts[attacker]);
        comboTimeouts[attacker] = setTimeout(() => el.classList.remove('show'), 1200);
      }
    }
  }

  return { update, showCaption };
}
