# UI and Input Systems

These packages are responsible for reading user commands and displaying information back via the interface.

## Input

* **`input/MobileControls.ts` & `input/Joystick.ts`**: Handle touch input for mobile devices, generating virtual thumbsticks to provide movement and aiming vectors.
* **`input/KeyboardJoystickController.ts`**: An adapter that reads WASD or arrow keys and translates those discrete presses into 2D vectors, making keyboard input behave identically to a physical gamepad or mobile joystick.
* **`input/Buttons.ts`**: Manages discrete actions like "Jump" or "Shoot", reading from both physical keyboard presses and virtual on-screen buttons.

## User Interface (UI)

The UI is built using Three.js rather than HTML/CSS, meaning UI elements exist in 3D space, typically rendered by a separate camera over the main game.

* **`ui/uiScene.ts`**: The main director for the UI layer. It holds the orthographic camera and the scene dedicated to UI meshes, rendering them after the game world.
* **`ui/Button.ts` & `ui/Cursor.ts`**: Interactive visual elements. `Button` handles hover states and click events leveraging Raycasting, while `Cursor` handles the visual crosshair.
* **Text Rendering (`ui/text/`)**: Text is rendered using a texture atlas technique (Signed Distance Fields or standard grids). `TextMesh.ts` and `TextAtlas.ts` handle taking standard strings, looking up the character UVs in the font atlas, and generating the necessary geometry efficiently without overhead.
* **Screens (`LangSelectionScreen.ts`, `DisclaimerScreen.ts`, `RetroWindow.ts`)**: Dedicated handlers for specific UI flows. They manage their own animations (fading in/out) and interaction logic before returning control to the main game.
