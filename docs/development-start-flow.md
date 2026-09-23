# Development start flow

The game has a small development switch in `src/gnome-vs-monkeys.ts` that controls where the application enters the cinematic/menu/game sequence. Use it when repeatedly testing gameplay so that the opening cutscene does not have to run on every reload.

## Normal event sequence

After language selection and the disclaimer, the application dispatches `startIntroWhenReady`. Its listener adds the game root to the scene, moves the camera out of view, compiles the scene, reports that loading is ready, and then dispatches one of four flow events.

The shipped flow is:

```text
startPreIntro
  -> administration-office cutscene
  -> introDone
  -> main menu
  -> user presses Start
  -> startIntro
  -> short in-level camera/player intro
  -> startGame
  -> normal gameplay
```

`AdminOfficeScene` dispatches `introDone` after its cutscene finishes or is skipped. `MainMenuScene` listens for `introDone`, displays the menu, and dispatches `startIntro` after the Start button is pressed. `CameraIntroState` dispatches `startGame` when the short in-level camera animation finishes.

## Selecting a development entry point

Find the `startIntroWhenReady` listener in `src/gnome-vs-monkeys.ts`. Inside its `renderer.compile(...).then(...)` callback is this event object:

```ts
$events.dispatchEvent({
    type:"startPreIntro"
    //type:"startIntro"
    //type:"startGame"
    //type:"introDone"
});
```

Leave exactly one `type` line uncommented.

| Active event | Result | Useful when |
| --- | --- | --- |
| `startPreIntro` | Runs the administration-office cutscene, opens the main menu, runs the short in-level intro after Start, then begins gameplay. | Verifying the complete release flow. This is the normal/release setting. |
| `introDone` | Skips the administration-office cutscene and opens the main menu immediately. Pressing Start still runs the short in-level intro before gameplay. | Developing the menu or testing the normal Start-button transition without replaying the opening cutscene. |
| `startIntro` | Skips the administration-office cutscene and main menu, then runs the short in-level intro. That intro dispatches `startGame` when it finishes. | Developing the in-level introduction, player entrance, or intro camera animation. |
| `startGame` | Skips both intros and the main menu and enables gameplay immediately. | Iterating directly on combat, AI, physics, the level, or other in-game systems. |

For the common case “show the main menu, but skip the long opening cutscene,” enable `introDone`. For the fastest route straight into controllable gameplay, enable `startGame`.

## Why the events are not interchangeable

These events are fan-out signals used by several systems:

- `startPreIntro` makes the camera follow the administration-office camera and starts that scene's animation, audio, lighting, and skip UI.
- `introDone` makes `MainMenuScene` visible and gives its window control of the cursor.
- `startIntro` starts the gnome's intro state, the camera's `camera-intro` animation, the monkey manager, and game tracking.
- `startGame` enables the gnome's physics and locomotion state, switches the camera to its in-game follow state, starts the monkey manager, and initializes other gameplay listeners such as the revolver.

Dispatch the event that represents the state needed by the feature under test. Do not call `startGame` merely to test menu behavior, because it deliberately bypasses the menu and intro setup.

## Before handing off or releasing

Restore `type:"startPreIntro"` as the only active line, then exercise this sequence at least once:

1. The administration-office cutscene plays or can be skipped.
2. The main menu appears.
3. Pressing Start fades out the menu and begins the short in-level intro.
4. The intro completes and the player becomes controllable.

When an agent changes startup, menu, intro, camera, or early gameplay behavior, it should consult this document and report which entry point it tested.
