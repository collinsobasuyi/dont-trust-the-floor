# Milestone 4 — Quality and deployment

Date: 6 November 2026

## Verified

- `npm run check`: 31 automated tests pass and TypeScript + production Vite build succeeds.
- npm install audit after updating Vitest to 5.1.0: zero reported vulnerabilities.
- Production build renders the desktop start screen and a complete attempt reaches the edge-fall result with score, footprint, replay, and saved attempt.
- Earlier narrow browser checks cover countdown pause/resume, jump, collapsing floor, learned-trap explanations, route inspection, restart, score persistence, and mute persistence.
- No browser errors or warnings were captured during those checks. A complete 25-second win has unit coverage for scoring, but has not been confirmed in a manual browser run.
- Fairness regression: disconnected safe pockets cannot be added together to satisfy the five-connected-tile escape requirement.

## Performance changes

- The 49 underside rocks now use one instanced draw instead of 49 separate meshes (48 fewer draw calls for those rocks).
- Touch devices cap rendering pixel ratio at 1.25 and use a 512px shadow map; desktop caps at 1.75 with a 1024px shadow map.
- Paused scenes stop repeating unchanged WebGL renders; resizing marks the frame for redraw.
- Unchanged HUD text does not rewrite DOM nodes each animation frame. The camera reuses its target vector.
- The game code and Three.js are separate cacheable chunks. Current production output: game JavaScript 35.03 kB / 12.58 kB gzip; Three.js 490.78 kB / 123.00 kB gzip; CSS 19.17 kB / 5.17 kB gzip.
- Hashed Vercel `/assets/` responses are configured for immutable caching.
- No measured FPS or physical-phone performance claim is made yet.

## Deployment

- Vercel project: `dont-trust-the-floor`.
- Account: `collins-obasuyis-projects`.
- Deployment: `dpl_KsujD6uXDLqJZHrxJcYGDfZoBYk1`.
- Target reported by Vercel: production.
- URL: https://dont-trust-the-floor-h4hrzigig-collins-obasuyis-projects.vercel.app/
- This deploy uploads an explicit local source snapshot; it is not a Git push and does not set up automatic Git deployments.
- Source snapshot digest: `7942b931d52b6e1b733259264303f8458eee1aeccf0836532ac72f6316540cd9`.
- Deployment is READY. Vercel authentication remains enabled.
- With explicit user approval, a seven-day shareable link was created for this deployment, expiring 13 November 2026. The access URL is delivered in the chat, not stored in this repository.
- Hosted-browser checks pass: start, countdown, movement, pause/resume, edge fall, score, post-game map, replay screen, and saved best/attempt/route after reload.
- No game-origin browser errors were captured. The earlier Vercel login page emitted Google sign-in warnings; those came from the provider login page rather than game code.
- Monitoring: no external analytics, error drain, or backend runtime service is configured for this static browser game.

## Physical phone acceptance — pending

Open the hosted game in Chrome on a Samsung phone, or run `npm run dev:network` and open Vite's Network address on the same Wi-Fi.

1. Complete the countdown; confirm the 25-second timer and score begin afterward.
2. Hold the joystick and tap Jump at the same time; check diagonal movement and release.
3. Rotate between portrait and landscape; ensure the complete arena remains visible and controls remain usable.
4. Check orange warning tiles, gaps, and the character are readable without zooming.
5. Switch away and return; verify play is paused and the joystick is centered on resume.
6. Toggle sound, refresh, and confirm the preference remains. Check warning/jump cues on the phone's actual audio output.
7. Lose, inspect the route reveal, restart, then refresh; confirm scores and arena memory persist.
8. Play at least three attempts, deliberately repeating then changing a route. Record whether the targeting feels recognisable and fair.
9. Check that play remains smooth over five minutes. Record the phone model, browser version, any stutter, overheating, or accidental page scrolling.
10. Survive a full 25-second run; confirm 350 points, the win screen, and replay.

Milestone 4 remains open until physical-phone acceptance is confirmed. Hosted smoke checks are complete. Player retention and fairness feedback from 10–20 testers belong to Milestone 5.
