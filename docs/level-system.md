# Level System

The `level` sub-system is responsible for taking a 3D model designed in Blender (or another 3D software) and turning it into a fully interactive and physics-enabled game environment.

For the complete Blender naming, hierarchy, prefab, custom-property, collider, and spawn contract, read [Blender level authoring](blender-authoring.md).

## Core Classes

* **`Level.ts`**: The heart of the level system. It parses a loaded 3D scene (often from a `.glb` file) and categorizes its parts. It separates visual meshes, physics colliders, lights, and spawn points. It makes heavy use of **InstancedMesh** for performance, allowing hundreds of identical objects (like chairs or pillars) to be rendered in a single draw call.
* **`Layers.ts`**: Defines the physics collision layers and raycast mask layers. This ensures that bullets hit walls but might pass through non-solid decorative objects.

## Interactivity and Logic

* **`IInteractable.ts`**: An interface for objects in the level that the player can interact with (e.g., switches, doors).
* **`Door.ts`**: A specific interactive object implementation. It handles the logic for opening, closing, and avoiding auto-close while a body is inside its sensor. The current navigation graph is static; doors do not add or remove path edges.
* **`ElevatorHandler.ts`**: Handles complex moving platforms or level transitions.

## Scene Handlers

* **`AdminOfficeScene.ts` / `mainMenuScene.ts`**: These classes act as directors for specific parts of the game or cutscenes. They handle the creation of specific UI elements, camera movements, and choreographing actors before the main gameplay loop takes over.

## Utility Managers

* **`LightManager.ts`**: Owns the single shadow-casting spotlight that normally follows the gameplay camera. Cutscenes call `borrow(anchor, intensity)` and invoke the returned release callback when done; releasing restores the light's original parent, target, transform, and intensity.
* **`LightsManager.ts`**: Scans the level for placeholder light objects and assigns a limited pool of dynamic lights to nearby sources.
* **`InstancesSyncer.ts`**: A helper that ensures that when a dynamic object (like an instanced door that moves) updates its transform matrix, the visual InstancedMesh reflects that movement accurately.
