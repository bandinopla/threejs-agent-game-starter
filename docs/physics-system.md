# Physics System

The game utilizes a physics engine (Rapier) to handle collisions, gravity, and rigid body dynamics. The `physics` package bridges Three.js visuals with Rapier's physical simulation.

## Core Classes

* **`PhysicsScene.ts`**: The main manager for the physics world. It initializes the Rapier simulation, steps the physics world forward every frame, and handles the synchronization between the physical RigidBodies and their corresponding visual Three.js `Object3D`s.

## Physical Bodies

* **`body/PlayerCapsule.ts`**: A specialized physics controller for characters. Instead of a standard rigid body that tumbles, characters use a standing capsule. This class handles logic for moving the capsule around the world, climbing steps, and sliding against walls without falling over.
* **`body/Ragdoll.ts`**: Handles the physical calculation for dead characters. It takes an animated skeletal mesh and turns its individual bones into physical bodies connected by joints, allowing them to flop to the ground naturally upon death.

## Configuration and Helpers

* **`CollisionGroupsHelper.ts`**: Works in tandem with level configurations to set up what objects collide with what. For instance, bullets shouldn't collide with the player that fired them, and enemies shouldn't walk through each other.
* **`layers.ts` / `types.ts`**: Stores constants and TypeScript interfaces defining the various physics materials and groups in the game.
