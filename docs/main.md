# Game Develoment Guide

The game's entry point is main.ts located in src/ and it contains the main render loop. The actual game module is initialized there by calling GnomeVsMonkeysApp(renderer, scene, camera). This function returns a promise that resolves to an AppBuilder function. The AppBuilder function is called in the render loop and it is responsible for updating the game state and rendering the game. 

The main.ts adds a spinner to show some progress indicator to the user, then when the game is ready it is removed.

## The game module
The game module is called GnomeVsMonkeysApp defined in gnome-vs-monkeys.ts located in src/. It is responsible for initializing the game and returning the game loop function. It uses DRACOLoader and KTX2Loader to load the game assets. The assets are loaded in parallel using Promise.all. The game is light, everything is 4.4Mb including sounds. 

After everything is loaded a few things are initialized:

- TextMesh.initialize() is called to initialize the text mesh system. It uses a font atlas loaded from the assets. 
- 2 Joystick(createGameButtons()), one control for the ui system and another for the game. THis is done this way to be able to disable controls when ui is active vs when game is active.
- the UIScene: this is the ui handler. It takes it's assets from the ui.packed.glb and manages the cursor, buttons, windows.
- the LangSelectionScreen: is a handler object that lives inside of the ui scene, it charge of displaying the country flags to pic a language. This is what will define the language to be used by the entire app. It is the first thing that the user will see after the spinner is removed. 

Once the user selects a language, the ui scene is instructed to initialize itself and the actual game GnomeVsMonkeysGame is called. It is a function that will return the render loop to be used.

## The game init
When GnomeVsMonkeysGame is called, the managers for the mechanics of the game are initialized:

- The camera is configured and an AudioListener is attatched to it. Which is expoorted from src/sounds/envAudio.ts as $audioListener. 
- Listeners to all the events of the game are registered to the event bus. 
- Basic scene setup, tone mapping, fog, etc. 
- A special manager is created MobileUIFixer that works with the ui.packed.glb to fix the UI on mobile devices.  It basically runs an AnimationMixer to animate the UI elements to their correct positions.
- The level object is created and this will internally build itself using a system of prefabs stored in level.packed.glb
- The physics scene is initialized using Rapier but using PhysicsScene as manager.
- The main menu scene is started using MainMenuScene as manager. This is an actual Scene that will be rendered on top of the game scene. It feeds from ui.packed.glb
- The fairy dust manager is started "FairyDustManager" and added to the game scene.
- The smoke manager is started "Smoke" and added to the game scene.
- The Dust manager is started ( the dust is the particles seen when the player runs, on his feet )
- The blood splash manager is started "BloodSplash" and added to the game scene.
- The player orbital camera rig manager is started: this controls a virtual camera that rotates around the player.
- The main camera's brain manager is started. THis controls the actual camera, and it holds the logic to act in diferent ways to follow a target or an animation, etc.
- The admin office scene is started ( the cutscene showing the administration's scene )
- The AI's path manager is started using a pre-recorded path I walked myself, and it will use an A* aloroth to create nodes and edges to allow the AI to navigate the level.
- The gnome object is created
- The post processing fx pipeline is created
- When the level calls a hook "onLevelIntantianted" a callback will traverse the scene and start the monkeys spawn manager, define the players start spawn point, and configure and add the SpotLight to the camera.

After all that, the sequence of actions the game will execute first is:

- Show the disclaimer screen by creating a DisclaimerScreen object and adding it to the ui scene. 
- wait a few seconds then...
- emit the event: startIntroWhenReady which will instruct the game to pre-compile the scene and...
- start the intro cutscene ( the rat's admin scene )
- after the intro cutscene is done, it will emit an event "introDone" after removing and disposing itself.
- the main menu manager will listen to this event and become visible.

During development, the event selected inside the `startIntroWhenReady` listener can be changed to enter at the administration-office cutscene, the main menu, the short in-level intro, or gameplay. Only one of the four event lines should be enabled at a time. See [Development start flow](development-start-flow.md) for the event sequence, the purpose of each branch, and the release setting.

## The language system
The game offers a dictionary object for spanish, english, chinese, japanese and portuguese. They are basically a dictionary with comon key:string pairs. The dictionary is in src/i18n/dictionary.ts. And it is accessed via $lang function that takes in a dictionary key and returns the corresponding string. The language is defined by a function provided by that same module called setLang that takes the id of the language to use. The keys are exported as LangKey type: "en" | "es" | "zh" | "jp" | "pt"

## The event system [[events]]
The game uses a global event system to communicate between different managers. The event system is implemented in src/events/events.ts and it is a simple event bus that allows you to emit and listen to events. 

There are 2 types of event dispatch:

- Normal events: these are events that are dispatched and the listeners are called immediately.
- Streamed events: listeners that are connected in a linked list, and the event travels from the tip to the tail of the chain. If a listener returns false, the event will stop propagation.

To access the event system one uses the $events object which is an instance of EventDispatcher. Or the $streamEventListeners object which is an instance of StreamedEventListener. The $streamEventListeners object is the one that is used for streamed events. Both imported from src/events/events.ts

The game communicates using these events to coordinate the actions of the different managers. Events are used for every inter-object communication. 
Some objects, like the gnome and the monkey emit their own events too.

## The entities
Both player, NPC and enemies extend the Entity class. This class is a wrapper around a Object3D and it is used to manage the state of the entity.
Their internal logic is controlled by a [[finite state machine]] that used an instance of StateMachine from src/statemachine/StateMachine.ts to activate and deactivate states.

## Post Processing
The current pipeline consists on a layered system where the ui scene is rendered on top of the game scene pass. And on tope of those 2, the main menu scene is added as another pass with higher priority. And one last node wraps all that, called the "Telon" pass, which is a mix node that is used to fade from black to whatever it has below it, used for scene transitions ( fading to black, switching, then fading to normal ). The post processing setup is defined in gnome-vs-monkeys.ts at the bottom. And the render loop uses this RenderPipeline to render the scene in the game loop..

# Overview
Basically the assets are loaded in parallel, then a language picking screen is shown to set the language of the dictionary used for the texts in the game. Once that is set, the game's intro cutscene is started and on finish, the main menu is shown. From there the player can start the game.


# Architecture & Modules Index

To understand the core pillars of the game without diving too deep into technical implementation, please refer to the following guides:

- **[Entities and AI](entities.md)**: Describes the Gnome (Player), Monkeys (Enemies), and general structure of actors.
- **[Finite State Machine](finite%20state%20machine.md)**: Describes how the logic of entities is structured using states.
- **[Level System](level-system.md)**: How levels are constructed using instancing, and interactive objects like Doors.
- **[Physics System](physics-system.md)**: How the physics engine handles rigidbodies, character capsules, and ragdolls.
- **[UI and Input System](ui-and-input.md)**: How the 3D menus, fonts, joysticks, and buttons are hooked up.
- **[Effects and Audio](effects-and-audio.md)**: Visual particle managers (blood, smoke, dust) and optimal sound configuration.

### Existing Deep Dives:
- **[Camera System](camera-system.md)**: Inner workings of the Camera Brain and its states.
- **[Texture Atlas](texture-atlas.md)**: Texture packing strategy.
- **[Path Finding](path-finding.md)**: How A* navigation mesh helps enemies.
- **[Text System](text-system.md)**: How SDF text is mapped.
