# Shadow Protocol

Tactical shooter at zevsocialconnect.com/games/shadow-protocol/. Code: `game.js` (game, input, online co-op),
`r3d.js` (three.js renderer), `index.html` (HUD, menus, touch layout).

## Phone controls (build 10)
Same scheme as Perci Shorti:
- **MOVE** (left, cyan): grab it at its spot or anywhere on the left side. Push all the way out to sprint.
- **LOOK** (bottom right, yellow): a joystick, not a swipe. Push sideways to turn; the further you push, the
  faster you turn. Turning slows down when your crosshair is on an enemy so you can stop on them.
- **FIRE** (right above LOOK, red): hold to shoot. Drag it sideways to turn while you shoot. While you hold
  it, the crosshair eases onto a visible enemy right next to it (within ~9 degrees, 16 m).
- AIM (aim down sights), RELOAD, USE, THROW, BREACH and MED sit in a column to the left of the sticks.
  VIEW (top) switches first / third person.

## Shipping an update
Phones keep an old saved copy of the page. `index.html` checks `version.json` (never cached) on every open and
reloads once if a newer build is out. When you ship, bump `BUILD` in the `<head>` script, `build` in
`version.json`, and the `?v=` on `game.js` (all the same value).
