# Don't Trust the Floor — Memory Mode

A 7×7 Three.js survival arena that learns your routes. Survive each 25-second run, then try again against its saved memory.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the URL Vite prints. Move with WASD or the arrow keys, jump with Space, and pause with Escape. Touch devices have a joystick and jump button.

```sh
npm test
npm run build
npm run preview
```

Orange tiles warn for 1.25 seconds, collapse for 3 seconds, then recover. Each hazard plan preserves access to a connected safe area of at least five tiles. The player can still fall by walking off the arena or ignoring warnings.

Movement dwell time and transitions influence hazard selection. Completed attempts update a bounded, decaying route history in browser localStorage. The sidebar shows the learned heatmap. Reset learned routes clears saved attempts and best time. When storage is unavailable, the game retains memory for the current session. Switching away pauses play.

The game runs entirely in the browser; no account, backend, API keys, or external AI service is required. Google Fonts is optional; system fonts are used when offline.

## Visual world — The Drift

The arena uses an isometric camera, thick platform columns, textured cyan tops, and luminous cyan seams. An original armored humanoid runner has articulated arms and legs, a lit visor, a ground marker, and a landing ripple. Warning tiles crack, warm from amber to orange, shake, then tumble into the void before recovering. Keyboard and joystick directions rotate into the camera view. Motion effects respect the browser’s reduced-motion preference.

After a run, the footprint map marks visited tiles, hazard targets, and the tile where the player fell. The explanation uses hazard weights captured when each trap was selected, distinguishing saved-route influence, current-run influence, exploratory traps, and edge falls. “See route on the arena” reconstructs the floor and highlights the footprint directly on the grid. These are route observations, not claims that a prediction caused every loss.

Verification: production build and 40 automated tests pass, including tile lifecycle, player physics, saved memory, hazard selection, and result explanations. Narrow browser layout, jump, collapse, result map, and arena reveal have been checked in the local browser. Physical phone testing remains outstanding.

## Milestone 3 — Game experience

- A three-second ready countdown runs before the survival timer. Escape pauses either the countdown or active play.
- Earn 10 points per second survived, plus 100 points for a full 25-second clear (350 maximum). Best score and best survival time are stored separately; older saves retain their routes and receive a survival-only score.
- Each run progresses through Observe (0–8 seconds), Predict (8–17), and Pressure (17–25). The hazard interval tightens from 1.1 to 0.8 to 0.58 seconds. Every tile still gives the full 1.25-second warning, and the escape validator remains active. Failed attempts do not accelerate the next run's schedule; learned routes provide the adaptation across attempts.
- Synthesized sound cues cover ready, start, jump, landing, warnings, collapse, phase changes, final seconds, falling, and clearing. The Sound button at the bottom of the arena mutes immediately and saves the preference. Audio starts only after interaction and active cues stop on pause.
- Post-game results include the score, footprint, trap explanation, and replay action. Animations and reduced-motion support remain available.

Validation now includes 30 passing automated tests covering these rules, score migration, audio lifecycle, memory, fairness, physics, and post-game insight. Browser checks cover countdown pause/resume, scoring after a fall, mute persistence, restart, and console errors. Physical phone testing and longer playtesting remain part of Milestones 4–5.

## Quality and deployment

Run `npm run check` before deploying. It runs the test suite, TypeScript checks, and the production build. `vercel.json` selects Vite, `npm ci`, and the `dist` output directory. Use `npm run dev:network` for same-Wi-Fi phone testing, or the hosted deployment after signing in to Vercel.

See [Milestone 4 QA](docs/MILESTONE-4-QA.md) for verification evidence, performance changes, deployment details, and the physical-phone checklist. This is a source-snapshot deployment; Git push automation has not been enabled.

## Isometric visual update

The latest local version is inspired by the supplied diagonal stone-platform references. It uses original procedural geometry, including the armored runner, with no third-party model downloads. Orthographic framing is tested at desktop, portrait phone, and landscape proportions. Run `npm run check` for 40 tests and the production build. The existing hosted seven-day test link still points to the earlier deployed visual version.

## Neon game screens and route playback

The local interface now follows the supplied neon UI concept: Home, a visual three-step tutorial, gameplay HUD, Settings, a result screen, and route analysis. Opening a menu during play pauses the live run; Play on Home resumes it. Finished attempts start a new run with saved arena memory.

The Watch → Learn → Predict → Hunt mood labels follow elapsed time within the existing hazard schedule. They describe the run presentation, not an external AI model or a measured prediction-confidence score. Result copy still distinguishes edge falls, exploratory traps, and actual route-weighted hazards.

Route analysis has a heatmap, play/pause, a moving route marker, and a scrubber. It replays timestamped grounded samples from the completed run, not airborne motion. This last-run recording is session-only; the aggregate route memory and scores remain persistent. Sound can be toggled from gameplay or Settings; reduced motion follows the device preference.

The current local camera faces the board straight on from a raised position. Rows run across the screen rather than diagonally; keyboard and joystick movement align with the screen.

The latest camera restores perspective with a slight side angle, keeping a mostly front-facing board while making the nearer blocks larger and exposing platform side faces. Screen-relative movement follows that angle.

## Third-person orbital arena

The latest local version defaults to a close, fixed-heading third-person follow camera. It tracks the character across the floor without bobbing with jumps or following a fall into the void. The View button switches between Follow and the full-arena Overview; reduced-motion mode removes camera easing. The player starts facing into the arena. An original orbital stadium surrounds the playable grid with towers, illuminated tracks, an outer walkway, and hazard markings. These background structures do not add collisions or change the Learning Arena.

Validation: 43 automated tests include perspective framing, follow-camera visibility on desktop and portrait layouts, tracking bounds, and overview restoration. Physical phone testing remains outstanding.

### Two-stage survival prototype

The current local build uses a 10×10 arena and one continuous 70-second run:

- Playground: 30 seconds, gentle route weighting and a hazard every 1.15 seconds.
- Trickster: 40 seconds, stronger route weighting and a hazard every 0.7 seconds.

After Playground, the floor restores and changes colour. The runner returns to the centre for a safe three-second countdown; the survival clock and hazards stop during this transition. Live route history stays intact, and this reposition is excluded from learned transitions and replay lines. Every targeted tile still warns for 1.25 seconds, and connected escape checks remain active. The run earns 10 points per survival second and a 100-point bonus for clearing both stages (800 maximum).

Both stages share the same grid deliberately. Moving hazards, portals, additional stages and semantic pattern recognition across different arena shapes are future work. Old 7×7 browser memories migrate proportionally to the 10×10 board. The hosted build has not been updated.

### Six-stage run (current)

All six stages are now connected on the 10×10 arena. Playground (30s) → Trickster (40s) → Chaos Factory (35s) → Meltdown (35s) → Mind Games (35s) → Final Showdown (40s). Total active survival time is 215 seconds, plus safe countdowns. A complete clear scores 2,250 points.

Chaos Factory introduces an orange beam moving across the floor: jump above it to avoid a collision. It has a two-second activation grace period. Meltdown permanently removes two outer tile rings at 10 and 23 stage seconds, each with a three-second warning; the central 6×6 area remains. Mind Games adds warning stripes alternating between rows and columns, with 1.8 seconds to react. All floor warnings are real. Final Showdown combines the beam, shrinking rings, stripes and learned targeting.

Stage colours and instructions change at each safe transition. Restart restores the entire arena and resets stage mechanics, while keeping saved movement memory. A beam collision and a shrinking-floor fall receive specific explanations. Automated checks cover stage boundaries, scoring, beam/jump collision, shrinking rings, stripe waves and reset behaviour. Full-run difficulty and physical-phone playtesting remain outstanding; the hosted deployment is unchanged.

### Learning, fairness and mastery update (current)

- Learning now includes edge time, centre time/returns, and clockwise/anticlockwise circulation. These aggregate habits influence unvisited destinations as well as exact tiles, persist between full runs, and appear as measured observations in results and occasional arena taunts. Percentages describe recorded grounded samples, not airborne time.
- Trap planning includes a conservative 4.32-second walking escape search at the runner's movement speed. It forecasts existing tile warnings, proposed collapses, beam motion and scheduled ring removals. Stripes use this check too; a ring removal is deferred when no timed escape is found. This improves combined-hazard planning but does not replace full-run playtesting or guarantee safety after every player decision.
- Jumping accepts input for 120ms after leaving a ledge and buffers a jump for 140ms before landing. Stage clears trigger a character celebration; each stage has a different pitched arrival cue.
- **Watch last moments** on a loss replays up to five seconds of bounded world snapshots at 65% speed: actual player position (including jumps/falls), tile warnings/collapse states and beam motion. A gold ring marks the fatal floor tile. Returning from replay does not save another attempt. The existing heatmap replay remains available separately.
- **Stage practice** on Home lists stages unlocked by clearing their predecessors in a full run. Playground is available immediately. Practice stops after the selected stage, retries that stage, and does not modify saved scores, routes, attempts or unlocks. Home Play starts a full run after a result, or resumes an active paused session.
- **Settings & suits** offers Orbital White plus four earned suit colours: Pathfinder Mint (clear Playground), Patternbreaker Gold (escape three learned traps), Personal Best Rose (beat an existing score), and Champion Violet (clear the full run). A learned-trap escape requires a learned hazard on the occupied tile followed by a grounded escape to another tile after collapse. Progress and equipped suit persist independently of route memory. Suits have identical abilities; practice earns no rewards.

Automated checks include habit recognition/persistence, timed combined hazards, jump grace/buffering, practice result isolation, progression/reward persistence, stage transitions and bounded death recordings. Physical-phone acceptance and full-run difficulty balancing are still pending. The hosted deployment has not been updated.

### Console / TV testing branch

The `codex/console-tv-controller-testing` experiment adds standard-mapped DualSense input, analogue left-stick movement, right-stick orbit, controller menus, disconnect pause, a remembered TV layout and full-screen controls. The arena has wider scenery for camera orbit. The Idia head experiment has been removed and the original hooded menu artwork restored. Keyboard and touch remain available. See [console testing notes](docs/CONSOLE-TV-TESTING.md) for controls, setup and hardware acceptance checks. Local multiplayer is intentionally deferred. This experiment has not been deployed.

### Family hot-seat and arena heartbeat

Home → **Family hot-seat** starts a session for two to four named players. Each person gets the existing six-stage survival run, then the result screen shows their best/total points and asks the next person to press **Ready**. No turn advances automatically. The same browser arena memory is saved after every completed turn and influences the next player; the roster and family score table are session-only (the optional ghost challenge can save a creator name with a successful route). Starting a new family challenge resets the table, not learned routes. Practice and solo play remain separate choices.

The synthesized **Arena heartbeat** builds from a quiet double pulse into faster beats and sparse musical accents as nearby warnings, gaps and sweepers become more threatening. A grounded escape from a trap aimed at the occupied tile stops the current music and gives it 1.15 seconds of silence. Sound stays stopped during menus, pauses, countdown transitions, results and death replays. The Settings heartbeat switch is independent of the main Sound switch, which still mutes everything. Both preferences persist; no music plays until audio is unlocked by interaction. Physical-speaker listening and long family-session balancing remain manual checks.

### Race Your Memory

Home → **Race your memory** starts an optional six-stage challenge. A translucent purple runner and route trace replay a recorded successful stage, including jump height and direction. It has no collision and never changes your inputs. Upcoming grounded positions on its route become visibly marked trap candidates; the existing warning time and connected/timed escape checks apply before any ghost trap is placed.

Only a completed stage from a full run creates or replaces a recording. If a same-stage recording exists it is used; otherwise the immediately preceding successful stage is used and labelled by stage and player. This lets Stage 2 replay a route you just cleared in Stage 1. A new browser with no successful stage displays a recording explanation rather than an invented ghost. A ghost runs once for its original duration; it is not silently stretched or looped. Practice cannot save ghosts. Regular full runs can build the successful-route library without enabling ghost traps.

Family hot-seat has a **Race Your Memory** checkbox: the next person can inherit successful ghosts labelled with the previous player's name. Up to six validated stage recordings are saved in this browser, with at most 450 pose samples each. Reset learned routes also clears these recordings. The results/map mark route deviations with ↗ and report the percentage of comparable grounded samples spent on a different tile; this is a route comparison, not a claim that every deviation escaped a trap. Controls, visible floor collision and warning timing remain trustworthy.

Verification covers complete-recording validation, persistence/corruption, source selection, interpolation/end time, grounded target forecasts, stage transitions, practice isolation, route comparison and fairness rejection. Full-run difficulty and physical-phone/controller acceptance remain outstanding. No deployment has been made.
