# Finite State Machine (FSM)

The logic and behavior of almost all characters in the game (both the player and enemies) are controlled by a Finite State Machine. This module ensures that an entity is only doing one thing at a time (e.g., you cannot be in the "Idle" state and the "Jump" state simultaneously).

## Core Classes

* **`StateMachine.ts`**: The brain of the FSM. It holds a collection of possible states and a reference to the current active state. It switches states through `enterState(...)` and routes `update(delta)` calls to the active state.
* **`IState.ts`**: The interface that all individual states must implement. It defines core lifecycle methods:
  * `enter()`: Called when the machine transitions into this state. Use this to start animations or initialize variables.
  * `update(delta)`: Called every frame. This is where the core logic of the state runs (e.g., moving towards the player).
  * `exit()`: Called when the machine transitions out of this state. Use this to clean up or reset variables.

## How it relates to Entities

Each `Entity` (like the `Gnome` or `Monkey`) instantiates its own `StateMachine`. They register all their possible behaviors (e.g., `IdleState`, `ChaseState`, `ShootState`) into it. During the game's main render loop, the entity calls `stateMachine.update(delta)`, which in turn executes the logic for whatever state that entity is currently in. The states themselves hold the logic to transition to other states based on conditions (e.g., "if health is 0, switch to DieState").

Create new state instances for every entity. `StateMachine` injects the shared context and `enterState` function into a state the first time it is entered, so sharing a state object between characters would also share the first character's context.
