# Absolute Quackery: notes for Claude

Original 2.5D fighting game: 3D hockey-playing ducks on a 2D side-view plane. 10 ducks, cinematic story mode, cheeky arcade tone.

## Working with Rob
- Rob is a content designer and UX writer who is learning to code. Explain dev terms plainly.
- **Visual proofs first:** show concept art of any character or weapon and get Rob's approval before modeling or building it.
- Ask before deploying anything, or before spending paid credits (for example, Figma AI image generation).
- Caption and UI copy matters to Rob. Keep it punchy and follow the voice rules below.

## Originality
- Inspired by underdog hockey movies and arcade sports and fighting games, but every name, team, logo, jersey, character, move and UI is original. No studio, film or pro league branding.

## Art direction ("arcade brutal", approved)
- Chunky, exaggerated 3D ducks with cel-shaded outlines and hand-painted textures. No realistic feathers.
- Oversized armored pads, scuffed helmets, tape and scars. Eyes glow during specials.
- A strict 3-color palette per duck. Arenas have neon lights, cracked ice, crowd haze and sparks on hits.
- Approved concept proofs (v1, locked): Freight Mallard, Razor Merganser, spare stick, puck bucket. They're in Rob's Figma file "Hockey Duck Fighter: Concept Proofs".

## Hype caption voice
- All caps, 1 to 4 words. Hockey slang first, then at most one duck pun.
- Trash talk is aimed at the ducks, never at the player. The copy lives in `src/game/captions.js`.

## Code
- `src/game/` holds the pure fight simulation at a fixed 60 frames per second, with no rendering, so it can be tested and ported. Keep game rules there.
- Run `npm test` after changing rules. `npm run build` makes a single-file `dist/index.html`.
- Engine: the greybox uses Three.js in the browser. Godot 4 was the long-term pick in the design doc, and that's still an open decision.
