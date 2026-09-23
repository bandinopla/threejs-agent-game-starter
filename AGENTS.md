# Agent guide

Follow the user's instructions to modify this game. Use this file for repository-wide context and consult the feature documents linked below when a task touches those systems. Do not read every document before every change; load only the documents relevant to the current task.

## Project overview

Three.js Agent Game Starter is a browser-game boilerplate built with TypeScript, Three.js, Rapier 3D physics, and Vite. It includes Gnome vs Noisy Apes as a playable example that users can customize or replace while reusing its existing game systems.

The game is assembled in `src/gnome-vs-monkeys.ts`. Its exported function implements the `AppBuilder` type, loads assets in parallel, initializes systems such as text and input, and returns the function that runs on every frame. Scenes and systems communicate through `$events`, a Three.js `EventDispatcher`. The event contracts are defined in `src/events/events.ts`.

For a detailed startup and runtime overview, read [`docs/main.md`](docs/main.md).

## Where to look

- `src/main.ts`: application entry point; creates the base Three.js scene, camera, and renderer, initializes the game, and runs the returned frame loop.
- `src/gnome-vs-monkeys.ts`: loads the game assets, initializes the game systems, and returns the game loop.
- `src/entity/`: player, enemy, weapon, and other entity code. Entities use finite state machines to control behavior.
- `src/level/`: level parsing, environment behavior, instancing, doors, elevators, and lighting.
- `src/physics/`: Rapier world setup, collision helpers, character bodies, and ragdolls.
- `src/camera/`: camera controller and camera states.
- `src/ai/`: path graph construction and AI navigation.
- `src/input/`: keyboard and mobile controls.
- `src/ui/`: menus, HUD, text, and other interface elements.
- `src/fx/`: particle and visual-effect managers.
- `src/sounds/`: generated sound atlas descriptor and audio helpers.
- `src/statemachine/`: shared finite-state-machine primitives.
- `audio/`: source sound clips used to generate `public/sound-atlas.ogg` and `src/sounds/atlas.ts`.
- `public/`: optimized `.glb` files, packed audio, textures, and other assets loaded by the shipped game.
- `3d/`: source Blender files and exported assets used by the asset pipeline.

## Feature documentation

Use these documents as routed context. If code behavior conflicts with a document, verify the behavior in code and update the stale document as part of the change.

- Startup, initialization, event flow, language, and rendering pipeline: [`docs/main.md`](docs/main.md)
- Development entry points for skipping cutscenes, opening the menu directly, or jumping into gameplay: [`docs/development-start-flow.md`](docs/development-start-flow.md)
- Global game-loop registration, cleanup handles, temporary updates, timeouts, progress callbacks, and tweens: [`docs/update-system.md`](docs/update-system.md)
- Asset layout and runtime asset inventory: [`docs/assets.md`](docs/assets.md)
- Required Blender GLB export-to-runtime optimization workflow and how to explain it to users: [`docs/glb-optimization.md`](docs/glb-optimization.md)
- Blender level authoring, prefab naming, custom properties, colliders, spawns, and runtime wiring: [`docs/blender-authoring.md`](docs/blender-authoring.md)
- Texture-atlas authoring and UV helpers: [`docs/texture-atlas.md`](docs/texture-atlas.md)
- Level parsing, instancing, interactables, and lighting: [`docs/level-system.md`](docs/level-system.md)
- Rapier world, collision groups, player capsule, or ragdolls: [`docs/physics-system.md`](docs/physics-system.md)
- Entities, the gnome, monkeys, weapons, and entity managers: [`docs/entities.md`](docs/entities.md)
- Adding rigged, playable, follower, shootable, or ragdoll characters: [`docs/character-authoring.md`](docs/character-authoring.md)
- State lifecycle or entity behavior states: [`docs/finite state machine.md`](docs/finite%20state%20machine.md)
- Camera behavior, camera clips, or camera events: [`docs/camera-system.md`](docs/camera-system.md)
- AI navigation and asynchronous A* path requests: [`docs/path-finding.md`](docs/path-finding.md)
- Recording and validating a new navigation graph after changing or replacing a level: [`docs/path-graph-authoring.md`](docs/path-graph-authoring.md)
- UI scenes, buttons, cursor, keyboard, or mobile controls: [`docs/ui-and-input.md`](docs/ui-and-input.md)
- Text rendering or font-atlas generation: [`docs/text-system.md`](docs/text-system.md)
- Scene-level effect managers, activation events, level-authored effect markers, pooling, and audio architecture: [`docs/effects-and-audio.md`](docs/effects-and-audio.md)
- Focused effect details: [`docs/blood-spill.md`](docs/blood-spill.md), [`docs/fairy-dust.md`](docs/fairy-dust.md), and [`docs/smoke.md`](docs/smoke.md)

## Working on the game

- Install dependencies with `pnpm install`.
- Start the development server with `pnpm run dev`.
- Create a production build with `pnpm run build`. The deployable game is emitted to `dist/` for the user to upload to their chosen hosting platform.
- Run the TypeScript check plus production build with `pnpm run build2`.
- Run `pnpm run sounds` before building when files in `audio/` were added, removed, or renamed. Restart the development server afterward so the new atlas takes effect.
- After exporting any runtime GLB to `3d/<name>.glb`, run `node optimize.js <name>` before testing or handing off. The game loads `public/<name>.packed.glb`, never the raw export. See [`docs/glb-optimization.md`](docs/glb-optimization.md).
- Do not deploy unless the user explicitly asks. The included deployment scripts target Firebase Hosting.

## Project conventions

- Follow the existing TypeScript and Three.js patterns in the nearest related module.
- Keep gameplay behavior, rendering, physics, input, and UI responsibilities in their existing areas unless a change intentionally revises the architecture.
- Treat large binary assets as source-controlled artifacts; do not regenerate, recompress, or replace them unless the task requires it.
- Do not edit `public/sound-atlas.ogg` or `src/sounds/atlas.ts` by hand. They are generated by `pnpm run sounds` from the source clips in `audio/`.
- Level physics are derived from custom user data on objects authored in the level's 3D source. Collider definitions should be created in the 3D authoring tool rather than hard-coded without a specific reason.
- `src/level/Level.ts` receives a group of level objects, discovers unique geometry and collider definitions, and builds memory-efficient cloned or instanced structures.
- `src/level/LightManager.ts` reuses a spotlight at different locations to reduce rendering cost.
- Preserve both desktop and mobile behavior when changing controls or UI.
- Register CPU-driven per-frame work through the global `updatables` registry. Store and invoke its removal callback for anything that does not live for the entire application; see [`docs/update-system.md`](docs/update-system.md).

## Verification

For code changes, run the narrowest relevant checks and run `pnpm run build2` before handoff when the environment permits it. For visual or gameplay changes, exercise the affected flow in a browser and report what was checked.

For a small visual test harness, `src/main.ts` stores the frame callback in the `app` variable. Temporarily replace the normal game setup with an `AppBuilder` test app, then restore the normal entry point before handing off. Do not commit a test harness in place of the game startup unless the user requests it.

## Optional agent skills

Repository-specific skills live under `skills/<skill-name>/SKILL.md`. Skills are for focused, repeatable workflows with their own instructions or helper resources, such as importing an optimized 3D asset, adding a new enemy type, or authoring a level. General architecture and rules that apply to most changes belong in this file or in the feature documents above.

- When the user asks for a "dry run," a read-only implementation plan, a simulated change, or a preview of what an agent would do, use [`skills/dry-run/SKILL.md`](skills/dry-run/SKILL.md). Inspect the repository but do not change its state.
- When the user asks to add or replace a player, companion, NPC, or enemy, use [`skills/add-character/SKILL.md`](skills/add-character/SKILL.md). Resolve its intake gate before selecting and running the bundled character templates.
- When the user asks to optimize, pack, compress, process, or import an exported GLB, use [`skills/optimize-asset/SKILL.md`](skills/optimize-asset/SKILL.md). It requires the user-exported `3d/<name>.glb`, runs the mandatory optimizer, and registers previously unknown packed assets in the app loader.
