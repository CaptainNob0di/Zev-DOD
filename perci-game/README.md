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
- **Weed + munchies items (Perci only):** when you play Perci, Dream Kush and Munchies Burger power-ups also show up in Quick Match and Online (MATURE CONTENT ON): smoke cloud, PUFF PUFF stamp, lingering haze, slow-mo on the other team. Other fighters never see them. Power-ups spawn every ~3 seconds now.
- **Aim assist (V10):** Off / Light / Strong in SETTINGS (Strong by default on phones, Light on desktop);
  green brackets show the bot it's helping you hit. Phone auto-fire is off by default (toggle in SETTINGS).
- **Look (V10):** tactical arena: concrete floor with lane paint and safety stripes, steel barricades,
  cargo crates and tall dividers.
- **Story Mode (mature content):** 6 chapters that follow Episodes 1-6 ("WTF", "LOG OUT", "WAKE UP", "5150", "PICK UP",
  "DEEPER"). Each has an animated opening/closing scene (dialogue with character faces, title cards, skippable), its own
  goal (tag N bots / survive / out-tag / boss: BROKE-PILOT PRIME), 3 stars, and unlocks the next chapter.
  Each chapter is played where its episode actually happens (checked against the episode scripts):
  1 Building 8, 14th floor, Chicago 1987 (shag carpet, plaid couch, CRT) · 2 Building 8 stairwell & lobby, 1987 (lights out,
  EXIT signs, mailboxes) · 3 Perci's house in Nebraska (bedroom with the 7:00 alarm, THE couch, empty fridge, ZEV DOD
  laptop; bots come in from the backyard cornfield) · 4 Miracle's house in Lincoln after BROKE-pilot takes over (TV
  grading everything, locked fridge, rogue vacuums, Monroe Realty office; bots pour out of the garage) · 5 Building 8 in
  Lincoln at pickup (Perci's car at the curb, the lobby, the stairwell) · 6 the barn in Iowa (stalls, hay, tractor,
  the 5-helmet dream rig). The scenes before and after each chapter use the episodes' own lines.
  **Mature content:** a notice lists what's in it (strong language, crude humor, cartoon marijuana use, cartoon laser
  action, no blood) the first time you open Story Mode, and the title screen shows the same line. MATURE CONTENT ON/OFF
  is in SETTINGS (and on that notice); OFF takes out the Dream Kush item and the smoke scenes and cleans up the language.
  There is no age gate. Weed content (Dream Kush item, smoke scenes) stays with Perci/ChatGPT and only appears in
  chapters/scenes without the kids (Miracle, Jessica, Mixi). Progress is saved on the device (localStorage `ps_story_v1`).
  Story scores don't go to the leaderboard.
- **Center line (all modes):** a laser line splits every map down the middle. Each team stays on its own half; lasers
  cross it. Bots hold their side instead of chasing over, power-ups alternate halves, and Story items spawn on Perci's
  side. Every map (random or story) is checked so each half is one connected area with all 5 of its spawns.
- **Push the line:** every tag moves the center line about a body-length into the other team's half (the bar at the
  bottom of the screen shows it). Push it all the way to their side and you win on the spot. Story chapters count it too:
  get your line pushed all the way back and the chapter is lost.
- **Dream / real flip:** every 45 seconds, after any 3-tag streak, or when someone grabs a spinning top, the arena flips
  between the dream and the real world. Real world: no powers or power-ups, everyone slower (Perci on crutches even
  slower), lasers bounce off walls once, washed-out look, texts from ChatGPT/Bae/Mixi. Story chapters 3-5 start awake.
- **Arena events (one per map):** Lights Out (Building 8, both eras), Twister (Perci's house, Corn Maze), Rogue Vacuums
  (Miracle's house, School Gym), Signal Strikes (Building 8 Lincoln, Might Be Castle Lot, Dream Grid), Dream Rig Pulse
  (the barn). Events can tag people but never give a team a point.
- **BROKE-pilot report card:** live grade on the HUD, A+ / A++ stamps on tags, F when you get tagged, and a report card
  (Tagging, Aim, Staying Alive, Line Control, Hustle) at the end of every match and chapter. SAVE REPORT CARD makes a
  1080x1350 image and opens the phone's share sheet (or downloads it on a computer).
- **View:** SETTINGS > VIEW (NORMAL / WIDE / WIDEST). WIDE is the default and shows about 25% more of the arena.
- **Night Trial (story mode 2):** one night in Lincoln, 7 PM to 7 AM, 15 chapters (awake + three dream layers). Somnus Civic runs a
  city-wide sleep experiment. A Doubt meter makes the HUD lie, a Might Be Castle receipt ("*maybe" = awake) tells the truth,
  a random event deck (lights out, siren sweep, crew raid, deja vu, static storm) keeps you moving, waking up triggers a 10-second
  Kick, and the Landlord boss shows up at 3:33 AM. Two choices change later chapters; there are 4 endings (one secret). It is the
  same game as the handheld edition. Pick NIGHT TRIAL on the title screen, or switch with the tabs on the story screen. Code is the
  `NIGHT` section at the end of `game.js`; the original Episodes 1-6 story is still there as the other tab.
- **Easier to track the fight:** the camera leans toward the enemy side, the nearest enemy and where you're shooting (CAMERA in the pause menu switches it to CENTERED ON ME). A gold chevron floats over your head, a red `!` marker shows over any enemy that has lined up on you, and the nearest off-screen enemy has a big red arrow with its distance.
- **Pause menu:** P / Esc / the II button (and switching tabs) opens a real menu: Resume, Sound, Aim Assist, Auto-Fire (phones) and Quit Match (tap twice). Solo play only; online matches keep the double-tap quit.
- **First / third person:** the 1ST / 3RD button (top right), the V key, the pause menu or Settings switch the view. 3RD is the arena from above. 1ST is a real first-person view through your character's eyes: walls, characters, items and lasers are projected in 3D, the crosshair turns red over an enemy, red markers sit over enemies, arrows at the screen edges point to enemies outside your view, and a red wedge shows which side you were hit from. Controls in 1ST: left stick / WASD moves where you face; right stick left-right (or mouse, or Q / E) turns and fires; auto-fire shoots when an enemy is in front of you. The choice is saved on the device (`ps_pov`).
- **Coin Catch:** a 45-second mini game (title screen) that earns ZEV Coins: catch coins and burgers, dodge alarm clocks. Max 40 per
  run, 150 per day. Same as the handheld edition.
- **Weapons:** pick one before a match (also online): Own Blaster, Buzz SMG (LV 3), Scatter Gun (LV 6), Bounce
  Launcher (LV 10), Beam Rifle (LV 15), and Perci's Gold Blaster (store only). The level that counts is your highest
  fighter's level.
- **Levels:** every match and chapter gives the fighter you played XP (double with a Double XP boost). Each level adds
  +0.5% speed (up to 15%) and 1% faster powers (up to 25%), and every 10 levels adds a shield point. Max level 30.
- **ZEV Coins:** earned every match and chapter (more on harder difficulty and for stars), and also sold in packs.
- **Store:** opens **Jan 7, 2027, 6 PM CT** (a week after release; the preview link opens it early). Gold Blaster,
  Armor Plating (+1 shield, 2 per fighter), Power Core, Overclock Shoes, Spawn Shield+, Double XP and Level Skip.
  Upgrades work in every mode, online team-vs-team too. The checkout window offers **ZEV Coins** or **card / Apple Pay /
  Google Pay / Cash App / PayPal** (Stripe). Money payments stay off until `window.ZEV_PAY` in index.html is filled in:
  see `payments/PAYMENTS_SETUP.md`. Server code is in `payments/` (SQL plus two Supabase Edge Functions).
  Progress is saved on the device (`ps_prog_v1`); once payments are on, coins and owned items also live in Supabase.
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
   Keep `index.html`, `game.js`, `arenas.js` and the `assets/` folder together (`payments/` is server code and the setup guide; the game doesn't load it).
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
