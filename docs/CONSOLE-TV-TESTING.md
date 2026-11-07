# Console and TV experiment

Working branch: `codex/console-tv-controller-testing`. Browser/PC single-player build; no PS5 package or Sony platform integration is involved. Local multiplayer is a later milestone.

## Setup

1. Start the project with `npm run dev` (or use the running local server).
2. Connect a DualSense to the computer over USB or pair it through the operating system's Bluetooth settings.
3. Open the game and press a controller button. The browser must expose its `standard` Gamepad API mapping. Release all buttons and centre the sticks once to arm input.
4. Click **TV mode** for the larger layout and full-screen entry. **F** or the settings **Enter full screen** button toggles full screen. If a controller-driven click lacks browser user activation, the TV layout remains enabled; use a physical click or F to enter full screen.

## Controls

| Input | Action |
| --- | --- |
| Left stick | Analogue camera-relative movement; menu navigation past threshold |
| Right stick | Orbit follow camera horizontally and vertically |
| Cross / standard bottom face button | Jump in play; select in menus |
| Circle / standard right face button | Back; resume a paused game; leave death replay |
| Options / standard Start button | Pause or resume |
| R3 | Re-centre follow camera |
| D-pad | Move menu focus; left/right scrub a focused replay slider |

Sticks use radial dead zones. Jump, pause, select and back fire on button edges, not every held frame. Menu navigation repeats after a delay. One controller owns the session; others are ignored until disconnect. A disconnect pauses the run and clears movement. Reconnecting or resuming requires neutral sticks and released buttons before actions resume. Hidden pages ignore controller actions. Keyboard and touch controls remain available; movement follows the current camera heading.

## TV and guardian

TV mode remembers the layout preference but does not enter full screen automatically on reload. It expands gameplay to the screen, enlarges menus/HUD at desktop TV widths, and adds strong focus outlines. Leaving full screen pauses an active run. TV rendering caps the canvas at approximately 2560×1440 pixels to limit 4K rendering cost; CSS menus stay at screen resolution. The orbiting camera stays outside the floor but inside a widened stadium.

The original purple hooded menu artwork is restored. There is no Idia head in the arena. The game remains playable with sound off and the existing reduced-motion preference.

## Verification

Automated tests cover standard mapping, radial drift filtering, analogue strength, button edges, menu repeat, neutral rearming, controller ownership/disconnect, unsupported/blocked APIs, camera-relative movement, camera pitch bounds/recentring, TV preference restoration and full-screen failure fallback. The existing gameplay suite also runs.

Browser checks cover TV toggle, full-screen entry, readable gameplay, arena framing, settings instructions and existing keyboard controls. Physical DualSense USB/Bluetooth, gamepad menu navigation on real hardware, long-session TV performance and viewing-distance readability require user hardware testing. Advanced DualSense haptics/adaptive triggers are not implemented.

For the later multiplayer milestone, add independent players/inputs and a shared-camera policy, then redesign fairness to consider every player before adding competitive rules.

References: [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API), [MDN Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API).
