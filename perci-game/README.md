# Perci Shorti vs BROKE-pilot: Dream Laser Tag

A 5v5 browser game for the Perci Shorti section of zevsocialconnect.com.
Pick Perci, Miracle, ChatGPT, Jessica or Mixi, team up with the other four (AI teammates),
and tag out BROKE-pilot's 5 bots in a 2-minute match. Works on phones (two thumb sticks) and desktop
(WASD + mouse). No build step and no frameworks: just upload the folder.

## What's in it (current version)
- **2.5D look:** tilted camera, full-body characters in their show outfits (faces from the show art),
  hovering BROKE-pilot robots, hay bales and crates with real height. A box fades if it hides you.
- **New map every match:** six styles (Corn Maze, Building 8 Halls, Might Be Castle Lot, The Barn,
  Dream Grid, School Gym), random size (about 2200-2800 x 1300-1660) and layout, mirrored so both sides
  are fair, checked so every spawn and area can be reached.
- **Bots that fight back:** they lead their shots, sidestep lasers, flank, and focus weak targets.
  Your AI teammates have the same smarts; Easy / Normal / Hard only changes BROKE-pilot's side.
- **Power-ups + item slots (from handheld V10):** run over a power-up to store it in one of 4 item slots
  (A+ shield, rapid fire, speed, power recharge), then tap the slot (phones) or press 1-4 (keyboard) to use it.
  Full slots leave power-ups on the floor. Online matches still use power-ups instantly. +10 points each.
- **Cover (V10):** the left/right COVER buttons (Q / E on keyboard) dash you behind the nearest box on that side.
- **Aim assist (V10):** Off / Light / Strong in SETTINGS (Strong by default on phones, Light on desktop);
  green brackets show the bot it's helping you hit. Phone auto-fire is off by default (toggle in SETTINGS).
- **Look (V10):** tactical arena: concrete floor with lane paint and safety stripes, steel barricades,
  cargo crates and tall dividers.
- **Story Mode (18+):** 6 chapters that follow Episodes 1-6 ("WTF", "LOG OUT", "WAKE UP", "5150", "PICK UP",
  "DEEPER"). Each has an animated opening/closing scene (dialogue with character faces, title cards, skippable), its own
  goal (tag N bots / survive / out-tag / boss: BROKE-PILOT PRIME), 3 stars, and unlocks the next chapter.
  Each chapter is played in its episode's location, hand-built and mirrored so both sides are fair:
  1 Building 8, 14th floor (shag carpet, plaid couch, CRT, 1987 kitchens) · 2 Building 8 stairwell & lobby (lights out,
  EXIT signs, mailboxes) · 3 Might Be Castle lot (the castle, drive-thru, parked cars) · 4 Apt 5150 party (dance floor,
  DJ booth, pool table, red cups) · 5 Highway 30 at night (corn rows, the family car with hazards on) · 6 the barn in
  Iowa (stalls, hay, tractor, the 5-helmet dream rig).
  Slash-wipe transitions between screens. An 18+ check runs the first time. Adult humor and cursing; weed content
  (Dream Kush item, smoke scenes) stays with Perci/ChatGPT and only appears in chapters/scenes without the kids
  (Miracle, Jessica, Mixi). Progress is saved on the device (localStorage `ps_story_v1`). Story scores don't go to
  the leaderboard.
- **Online play:** PLAY ONLINE, create a room, share the 4-letter code. Co-op vs bots or team vs team,
  up to 10 players, bots fill empty spots. Uses Supabase Realtime (same project as the leaderboard).
  The host's device runs the match, so the host should keep the screen on.
- **Phones first:** twin sticks, item slots above the left thumb, COVER buttons by the POWER button, safe-area aware layout.

## 0. Launch lock (private until Episode 6)
The public sees a "Coming soon" countdown until **Thu Dec 31, 2026, 6:00 PM CT**. The game then unlocks by itself.
- Your private link: `zevsocialconnect.com/perci-game/?preview=YOUR-KEY` (the key is in `index.html`, the `PREVIEW_KEY` line).
  Open it once on each of your devices and that device stays unlocked.
- To change the date, edit `LAUNCH_AT` in `index.html`. To open it to everyone now, set `LAUNCH_AT` to `''`.
- Don't share the preview link, and hold off on adding the PLAY button to your pages until launch day.
- This lock is a curtain, not a vault: someone who digs through the page code could get around it. For a fully private test, don't upload until launch.

## 1. Put it on the site
1. Upload this whole folder to your site as `perci-game/` (so the game lives at `zevsocialconnect.com/perci-game/`).
   Keep `index.html`, `game.js`, `arenas.js` and the `assets/` folder together.
   (`arenas.js` is made by `tools/gen_arenas.py`; edit that script, not the .js, then run it again. It also writes the handheld's `src/arenas.lua`, so both games stay the same.)
2. Add a button to `perci.html` (and the Perci Shorti section on the home page):

   ```html
   <a href="perci-game/" class="btn">PLAY PERCI SHORTI LASER TAG</a>
   ```

   Or embed it right on the page:

   ```html
   <iframe src="perci-game/" style="width:100%;height:80vh;border:0;border-radius:16px" allow="fullscreen"></iframe>
   ```
3. The title screen's "Watch the show" link points to `../perci.html`. Change it in `index.html` if your page is named differently.

## 2. Turn on the PUBLIC leaderboard (about 10 minutes, free)
Until this is done, scores save on each player's own device only, and the game says the public board is coming.

1. Make a free account at https://supabase.com and create a new project.
2. Open **SQL Editor > New query**, paste everything from `leaderboard-setup.sql`, and click **Run**.
3. Open **Project Settings > API**. Copy the **Project URL** and the **anon public** key.
4. In `index.html`, find the `LEADERBOARD` line near the bottom and paste them in:

   ```js
   const LEADERBOARD = { url: 'https://YOURPROJECT.supabase.co', anonKey: 'eyJ...', table: 'perci_scores' };
   ```
5. Re-upload `index.html`. Done: the ALL-TIME and TODAY tabs now show everyone's scores.

The anon key is meant to be public. The table rules only allow reading scores and adding new ones,
and the database rejects impossible values (scores over 15,000, bad names, unknown characters).
To remove a troll entry, delete the row in Supabase's Table Editor.

## 3. Ideas to grow it
- Pin a "post your laser tag score" comment under each episode and feature the weekly #1 in a Short.
- Run a weekly challenge: top score on HARD by Sunday gets drawn into an episode as a cameo.
- Put the PLAY button in the end screen of every episode upload and in your link-in-bio.

## Status
- Supabase project is connected (`LEADERBOARD` line in `index.html`). Run `leaderboard-setup.sql` once in the
  Supabase SQL Editor if the public board shows no scores.
- If online rooms say "Couldn't open a room", check Supabase > Project Settings > Realtime and make sure
  public (non-private) channels are allowed.

## Files
- `index.html`: screens, styles, launch lock and the leaderboard config line
- `game.js`: the game, in sections: settings and characters, map generator, A* navigation, combat,
  AI, player controls, 2.5D renderer, HUD, leaderboard, online multiplayer, launch lock
- `assets/`: character art from the show (made by ZEV DOD)
- `leaderboard-setup.sql`: one-time database setup for the public board
