# The camera system
The camera system works by being managed by the "src/camera/CameraBrain.ts" class. Which has a state machine inside that controls how the camera will move. Several states update the camera position in diferent ways, and they are activated vía events from the game.

It also defined an AnimationMixer with the camera as target used for when the animation of the camera needs to be controlled by an animation clip.

# The sates
- CameraClipAnimState this state will let an animation clip drive the camera's position. The camera animations are created in the level.blend file and they are obtaining by scanning all the animation clips that start with "camera-XXX" prefix, and looking for the camera objects named "XXX" and obtaining the clips to be applied to the main camera. A small pre-processing is done to these clips to update the track names to point at the main camera's properties ( removing the original camera name from them ) 
- FollowOrbitCameraState: this state makes the camera follow the virtual camera from the orbit camera in a lerp way over time. This states recieved the reference to the orbit camera in the contructior and the CameraBrain pass this in it's setup. 
- FollowOtherState: this states makes the camera hard follow another object with no lerping. This is used during the initial admin office intro cutscene setting the follow target to the admin scene's camera.

# Events
The camera brain listen to the following events:
- "startIntro": will trigger the intro animation playing the "camera-intro" clip using the mixer.
- "startGame" : will trigger the ingame state which is the FollowOrbitCameraState to follow the players' camera.
- "reset": event will remove all states and control of the camera.
- "playerKilled": ia a CameraClipAnimState that will play the "camera-kill" clip using the mixer, when the clip ends, an event "playerKilledCameraAnimEnded" will be dispatched to let other systems of the game know that the animation has ended.