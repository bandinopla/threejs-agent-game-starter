# Three.js Agent Game Starter

Three.js Agent Game Starter is an agent-ready boilerplate for building a third-person action mini/casual game with Three.js. It includes the playable example game [**Gnome vs Noisy Apes**](https://gnome-vs-noisy-apes.web.app/), where you control a gnome with the keyboard and mouse, explore a 3D level, and shoot enemy monkeys that navigate with asynchronous A* pathfinding.

Example of what type of game this produces: [Game sample trailer](https://www.youtube.com/watch?v=0N05WOhNanA)

The repository is meant to be changed. Its player, enemies, level, camera, physics, UI, effects, audio, and asset pipelines are organized as reusable systems so a developer can replace the shipped game while retaining the underlying structure.

## Built for agent-assisted development

This project is designed to be used with a coding agent that understands repository instructions, such as Codex. The agent should begin with [`AGENTS.md`](AGENTS.md), which explains the architecture, project conventions, verification requirements, and which focused document to read for a given task.

The repository provides three reusable agent skills:

- [`$dry-run`](skills/dry-run/SKILL.md): inspect the real repository and produce a read-only implementation plan.
- [`$add-character`](skills/add-character/SKILL.md): scaffold and integrate a player, companion, NPC, or enemy using the correct entity family and spawn strategy.
- [`$optimize-asset`](skills/optimize-asset/SKILL.md): process a user-exported GLB into the packed runtime asset and register new assets with the game loader.

A typical agent workflow is:

1. Ask the agent to read and follow `AGENTS.md`.
2. Describe the gameplay or content change you want in plain language.
3. Let the agent follow the routed documents under [`docs/`](docs/) rather than guessing system contracts.
4. Invoke a skill explicitly when you want its focused workflow, for example:

   ```text
   Use $dry-run to show me how you would add a follower enemy.
   Use $add-character to add a non-shootable companion.
   Use $optimize-asset to process 3d/wizard.glb.
   ```

5. Review the agent's verification report. Gameplay and visual changes should be exercised in a browser, not considered complete from compilation alone.

The docs cover the contracts that are easy to break in a 3D game: Blender names and custom properties, entity state lifecycles, physics setup, asynchronous path requests, runtime update cleanup, asset ownership, and mobile controls.

## What is included

- Three.js/WebGPU rendering with a WebGL2 fallback.
- Rapier 3D physics, player character controller, sensors, colliders, and ragdolls.
- Keyboard/mouse and mobile touch controls.
- Finite-state-machine-driven player and enemy behavior.
- Pre-recorded navigation graph with queued asynchronous A* pathfinding.
- Animated cameras, intro flow, menus, localization, and 3D UI.
- Particle and post-processing effects including dust, smoke, blood, and fairy dust.
- Positional audio and a generated sound atlas.
- Blender source files and an optimization pipeline using texture atlases, KTX2, and Draco.
- Development entry points for jumping directly to menus, intros, or gameplay.

The main assembly module is [`src/gnome-vs-monkeys.ts`](src/gnome-vs-monkeys.ts). It loads assets, initializes the systems, connects them through the typed global event dispatcher, and returns the per-frame game loop.

## Controls

| Input | Action |
| --- | --- |
| `W`, `A`, `S`, `D` | Move |
| Mouse movement | Rotate the camera/aim while pointer lock is active |
| Left mouse button | Shoot or activate the current UI selection |
| Right mouse button | Use/interact |
| `Space` | Jump |
| Left `Shift` | Run |

Touch devices receive on-screen movement and camera controls.

## Getting started

Requirements:

- Node.js and pnpm.
- Git LFS, because GLBs, Blender files, source textures, and MP3 files are LFS-managed.

Clone with LFS assets and install dependencies:

```bash
git lfs install
git clone <repository-url>
cd threejs-agent-game-starter
pnpm install
pnpm run dev
```

Open the local URL printed by Vite. Click the game to enable pointer lock for mouse controls.

Useful commands:

| Command | Purpose |
| --- | --- |
| `pnpm run dev` | Start the Vite development server. |
| `pnpm run build` | Create the production build under `dist/`. |
| `pnpm run build2` | Run TypeScript checking and the production build. |
| `pnpm run sounds` | Rebuild the runtime sound atlas from `audio/`. |
| `pnpm run character:new -- ...` | Run the character scaffolder used by `$add-character`. |
| `node optimize.js <name>` | Convert `3d/<name>.glb` into `public/<name>.packed.glb`. |

Firebase Hosting configuration is included as an optional example. Copy `.firebaserc.example` to `.firebaserc`, insert your own Firebase project ID, and use the deploy scripts only if you choose Firebase as your host.

## Project structure

```text
src/
  gnome-vs-monkeys.ts   game assembly and runtime initialization
  entity/               player, enemies, weapons, and entity bases
  level/                level parsing, instancing, doors, lights, and elevators
  physics/              Rapier integration and character/ragdoll bodies
  ai/                   path graph and A* navigation
  camera/               camera controller and camera states
  input/                keyboard and mobile controls
  ui/                   menus, cursor, HUD, and text
  fx/                   particles and visual effects
  sounds/               runtime sound helpers and generated atlas descriptor
3d/                     authoritative Blender files, textures, and raw GLB exports
audio/                  source MP3 clips
public/                 packed runtime GLBs, sound atlas, and static files
docs/                   focused architecture and authoring guides
skills/                 reusable agent workflows
```

Start with [`docs/main.md`](docs/main.md) for the runtime overview. `AGENTS.md` routes more specific tasks to the appropriate guide.

## 3D asset workflow

The editable `.blend` files and source images live in `3d/`. After changing a Blender asset, export a binary GLB to the same directory and run:

```bash
node optimize.js <name>
```

For example, `node optimize.js level` reads `3d/level.glb` and writes `public/level.packed.glb`. This step is mandatory: runtime code loads the `.packed.glb` files from `public/`, never the raw exports.

The optimizer builds authored texture atlases, converts textures to KTX2, resamples animations, and applies Draco mesh compression. It requires the Khronos `ktx` command-line executable on `PATH`. See [`docs/glb-optimization.md`](docs/glb-optimization.md) for the complete workflow.

## Audio workflow

Source clips live in `audio/`. When clips are added, removed, or renamed, run:

```bash
pnpm run sounds
```

This regenerates `public/sound-atlas.ogg` and `src/sounds/atlas.ts`. Do not edit those generated files manually, and restart the development server after rebuilding the atlas.

## Customizing the game

Good starting requests for an agent include:

- Replace the player while retaining input, camera, physics, and reset behavior.
- Add a companion or NPC that navigates the existing path graph.
- Create a new shootable enemy with authored hitboxes and a ragdoll.
- Change the level and record a new navigation graph.
- Add a door, sensor, elevator, light, effect marker, or spawn point in Blender.
- Add a UI screen while preserving desktop and mobile input.
- Replace the game-specific art and behavior while keeping the engine-like systems.

For a safe preview before making changes, ask the agent to use `$dry-run`.
