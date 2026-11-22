# Absolute Quackery

A 2.5D fighting game about hockey-playing ducks. This is the **greybox prototype**: one rink and two fighters (Freight Mallard vs Razor Merganser), built from placeholder shapes so we can find out whether the fighting feels good before making real art.

## Play it

You need [Node.js](https://nodejs.org) (version 18 or newer) installed once.

```bash
npm install      # download the libraries the game uses (one time)
npm run dev      # start a local server, then open the link it prints
```

Or build one self-contained file you can double-click or share:

```bash
npm run build    # creates dist/index.html
```

## Controls

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move / jump | A D / W | ← → / ↑ |
| Block | Hold away from your opponent | same |
| Dash (ice slide) | Double-tap a direction | same |
| Jab · Stick · Check · Shot | F G H J | U I O P (or numpad 1–4) |

Gamepads work too. **Combos:** after a hit lands, chain into a stronger button (Jab → Stick → Check → Shot). Attacks thrown mid-slide hit 25% harder. Check someone into the boards for a board slam.

## What's in the prototype

- Best of three rounds, 99-second timer, health bars that show the damage chunk
- Ice momentum: you ease into speed, dashes slide, getting hit pushes you back across the ice
- Four attack buttons with real frame data (wind-up, active and recovery frames)
- Blocking, chain combos with damage scaling, puck projectiles, board slams
- Enforcer Meter (fills as you fight; spending it comes with specials in the next step)
- Hit-stop, screen shake and sparks on impact
- Hype captions (`src/game/captions.js`) like FIRST FEATHER, TAPE TO TAPE and WELCOME TO THE GLASS
- A simple CPU opponent so you can test alone

## How the code is organized

| File | What it does |
| --- | --- |
| `src/game/match.js` | The fight rules, one frame at a time. No graphics, so it's testable and portable. |
| `src/game/characters.js` | Each duck's stats and move data. Tweak numbers here to rebalance. |
| `src/game/captions.js` | Hype caption copy. Edit freely. |
| `src/render.js` | Draws the rink and ducks with Three.js (cel-shaded placeholder shapes). |
| `src/hud.js`, `src/style.css` | Health bars, timer, combo counter, captions. |
| `src/input.js`, `src/ai.js` | Keyboard and gamepad controls, and the CPU opponent. |
| `test/match.test.js` | Automated checks for the rules. Run with `npm test`. |

The design doc and approved concept art live outside the repo (see `CLAUDE.md`).
