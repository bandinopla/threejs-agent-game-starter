# Entities and AI

The `entity` package handles the logic for the different characters and interactive actors in the game. All characters are built on top of a common base class.

For the complete workflow for adding rigged, playable, follower, shootable, or ragdoll characters, read [Character authoring](character-authoring.md).

## Core Classes

* **`Entity.ts`**: The smallest character base. It adds a local event dispatcher, reset event, rotation helper, and transform snapshot support to Three.js `Object3D`.
* **`RiggedEntity.ts`**: Provides clean reusable bases for animated rigged entities and animated shootable entities. Concrete characters still own their contexts, states, movement, physics, and lifecycle.
* **`ShootableEntity.ts`**: Extends `Entity` with player-shot hitboxes, physical wrapper activation, ragdoll synchronization, and physics snapshots. It does not provide a health system; subclasses decide when a hit becomes fatal or activates physics.

## Gnome (The Player)

The `gnome` folder contains the logic for the main character.
* **`Gnome.ts`**: The main player class. It initializes the player's model, physics capsule, and weapons. It delegates its behavior to various states (Idle, Jump, Shoot, etc.) depending on user input and game context.
* **`GnomeContext.ts`**: A shared context object that the Gnome's states use to access the Gnome's properties, weapons, and input without tight coupling.
* **Weapons (`Shotgun.ts`, `ShotgunBlast.ts`)**: Classes that handle the player's shooting mechanics, calculating raycasts for hit detection, and triggering visual effects like muzzle flashes and bullet impacts.

## Monkeys (The Enemies)

The `monkey` folder handles enemy behavior and spawning.
* **`MonkeysManager.ts`**: Responsible for creating, recycling, and tracking all monkeys in the level. It listens to level events to spawn monkeys at specific points.
* **`Monkey.ts`**: The enemy class. Like the Gnome, it is driven by a FSM. It has different states for chasing the player, attacking, and dying. 
* **`MonkeyContext.ts`**: The state context for monkeys, allowing their FSM states to access pathfinding, target objects, and animations.
* **Weapons (`Revolver.ts`, `MobilePhone.ts`)**: Specific items or weapons carried by different types of monkeys.

## Skeletons

* **`Skeleton.ts`**: A simpler entity class, primarily used as an environmental hazard or a simpler enemy type, also extending the base entity principles.
